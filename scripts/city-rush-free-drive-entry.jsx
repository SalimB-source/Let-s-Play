// Entrée de `scripts/city-rush-free-drive-check.mjs` (`npm run check:city-rush-free-drive`).
//
// La conduite libre jouée dans le vrai monde, image par image, avec de vrais
// événements (touches sur `window`, gestes du doigt sur le canvas). Sur chaque
// parcours demandé :
//   · le moteur nu démarre en conduite par voies (les harnais historiques le
//     pilotent ainsi) ; `setDrivingMode` bascule, une valeur inconnue retombe
//     sur la conduite libre, et le HUD publie la conduite ;
//   · touche tenue : aucun saut de voie à la pression, la voiture glisse tant
//     que la touche reste enfoncée, s'arrête net (≤ 0,15 s) à la relâche et
//     reste où elle est, entre deux voies — aucun rappel vers un centre ;
//   · Q / D comme ← / →, et la dernière touche pressée tient le volant ;
//   · bord de la chaussée : la voiture bute sans jamais déborder ;
//   · la voie du pilote suit sa position (hystérésis comprise) et la ligne
//     propre retombe à zéro au franchissement d'une ligne ;
//   · lacet de la caisse et braquage des roues suivent le glissement ;
//   · `action('right')` glisse jusqu'au centre de la voie voisine, sans dépasser ;
//   · au doigt : la voiture suit le glissé (55 % de l'écran = toute la
//     chaussée), finit le geste quand le doigt se lève, ne bouge pas sur une
//     simple touche, et une flèche reprend la main ;
//   · une voiture à hauteur bloque le glissement — jamais de carrosseries
//     imbriquées — et le pilote qui insiste la pousse (un seul choc latéral) ;
//     un rival, lui, se traverse ;
//   · toupie et saut : le volant ne répond plus ;
//   · repasser aux voies recentre la voiture et rend l'écart instantané ;
//   · tremplin : rattrapé au centre ou à cheval, franchement évité à côté —
//     jamais traversé ;
//   · mini-garage et conteneur à bazooka : la voiture passe dedans ou à côté,
//     jamais à travers une paroi, et le garage (la roquette) se prend bien
//     de l'intérieur.
const BASE_SEED = Number(process.env.CITY_RUSH_FREE_DRIVE_SEED || 20261015) >>> 0;
let seed = BASE_SEED;
Math.random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const ctx2d = () => {
  const g = { addColorStop() {} };
  return {
    canvas: { width: 512, height: 512 },
    fillStyle: '', strokeStyle: '', globalAlpha: 1, lineWidth: 1, lineCap: '', lineJoin: '',
    font: '', textAlign: '', textBaseline: '', filter: '', shadowBlur: 0, shadowColor: '',
    globalCompositeOperation: 'source-over',
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, rect() {},
    fill() {}, stroke() {}, fillRect() {}, clearRect() {}, strokeRect() {}, fillText() {}, strokeText() {},
    drawImage() {}, clip() {}, ellipse() {}, quadraticCurveTo() {}, bezierCurveTo() {},
    arcTo() {}, resetTransform() {}, transform() {}, setTransform() {}, putImageData() {},
    setLineDash() {},
    createLinearGradient() { return g; }, createRadialGradient() { return g; },
    createPattern() { return null; },
    measureText() { return { width: 10 }; },
    getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h) * 4) }; },
    roundRect(x, y, w, h) { this.beginPath(); this.rect(x, y, w, h); },
  };
};
const makeCanvas = () => ({
  width: 1, height: 1, style: {},
  getContext: (kind) => (kind === '2d' ? ctx2d() : null),
  addEventListener() {}, removeEventListener() {},
  toDataURL: () => '',
});

// Les écouteurs posés sur `window` par le moteur (keydown / keyup / blur) sont
// capturés ici : la vérif y injecte de vrais événements clavier.
const listeners = { window: {}, document: {} };
globalThis.ImageData = class ImageData {
  constructor(data, width, height) {
    if (typeof data === 'number') {
      this.width = data; this.height = width;
      this.data = new Uint8ClampedArray(data * width * 4);
    } else {
      this.data = data; this.width = width; this.height = height;
    }
  }
};
globalThis.window = {
  devicePixelRatio: 1,
  innerWidth: 1280,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  addEventListener(t, f) { (listeners.window[t] ||= []).push(f); },
  removeEventListener(t, f) { listeners.window[t] = (listeners.window[t] || []).filter((item) => item !== f); },
  location: { href: 'http://localhost/', origin: 'http://localhost' },
};
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? makeCanvas() : { style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {}, removeEventListener() {} }),
  createElementNS: (_ns, tag) => globalThis.document.createElement(tag),
  addEventListener(t, f) { (listeners.document[t] ||= []).push(f); },
  removeEventListener() {},
  body: { appendChild() {}, removeChild() {}, style: {} },
  documentElement: { style: {} },
  hidden: false,
  visibilityState: 'visible',
};
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node-smoke', maxTouchPoints: 0 }, configurable: true });
globalThis.self = globalThis;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

const rafQueue = new Map();
let rafId = 1;
let virtualNow = 0;
globalThis.requestAnimationFrame = (cb) => { const id = rafId++; rafQueue.set(id, cb); return id; };
globalThis.cancelAnimationFrame = (id) => { rafQueue.delete(id); };
Object.defineProperty(globalThis, 'performance', { value: { now: () => virtualNow }, configurable: true });

const { createCityRushWorld } = await import('../src/games/ViceCityWorld.jsx');
const {
  CITY_RUSH_COURSES,
  CITY_RUSH_CARS,
  CITY_RUSH_SIDE_CONTACT_GAP,
  cityRushMiniGarageWidth,
  isCityRushPoliceTrafficType,
} = await import('../src/games/cityRushRules.js');
const {
  CITY_RUSH_FREE_LANE_HYSTERESIS,
  CITY_RUSH_FREE_RAMP_CATCH,
  CITY_RUSH_FREE_TOUCH_SPAN,
  cityRushFreeLaneForX,
} = await import('../src/games/cityRushFreeDrive.js');

const fail = (msg, extra) => { console.error('ÉCHEC :', msg, extra ?? ''); process.exit(3); };

const cityArg = process.argv.find((a) => a.startsWith('--city='))?.slice(7);
const all = process.argv.includes('--all');
const DEFAULT_CITIES = ['vice-city', 'london', 'nordschleife', 'touge'];
const cities = cityArg
  ? [CITY_RUSH_COURSES.find((c) => c.id === cityArg) || fail(`parcours inconnu : ${cityArg}`)]
  : all ? CITY_RUSH_COURSES : DEFAULT_CITIES.map((id) => CITY_RUSH_COURSES.find((c) => c.id === id));
const FRAME_MS = 1000 / 60;
const FRAME_S = FRAME_MS / 1000;
const EPS = 1e-6;

let effects = [];
let lastHud = null;

const stepFrame = () => {
  const q = [...rafQueue.values()];
  rafQueue.clear();
  virtualNow += FRAME_MS;
  for (const cb of q) cb(virtualNow);
};
const runFrames = (seconds, onFrame) => {
  const frames = Math.max(1, Math.round(seconds / FRAME_S));
  for (let index = 0; index < frames; index += 1) {
    stepFrame();
    onFrame?.(index);
  }
};
const runUntil = (predicate, maxSeconds, onFrame) => {
  const frames = Math.round(maxSeconds / FRAME_S);
  for (let index = 0; index < frames; index += 1) {
    if (predicate()) return index * FRAME_S;
    stepFrame();
    onFrame?.(index);
  }
  return predicate() ? frames * FRAME_S : null;
};

const fireKey = (type, key) => {
  const handlers = listeners.window[type] || [];
  if (!handlers.length) fail(`aucun écouteur « ${type} » posé par le moteur`);
  const event = { key, repeat: false, preventDefault() {}, stopPropagation() {}, target: null };
  for (const handler of [...handlers]) handler(event);
};
const keyDown = (key) => fireKey('keydown', key);
const keyUp = (key) => fireKey('keyup', key);

// Chaque monde a son canvas (le dernier construit écrase `__freeDriveCanvas`) :
// il est relevé à la construction.
const canvasOf = new Map();
let pointerWorld = null;
const pointer = (type, clientX, pointerId = 7) => {
  const canvas = canvasOf.get(pointerWorld);
  const handlers = canvas?.listeners?.[type] || [];
  if (!handlers.length) fail(`aucun écouteur « ${type} » posé sur le canvas`);
  const event = { pointerId, isPrimary: true, clientX, clientY: 420, preventDefault() {}, stopPropagation() {} };
  for (const handler of [...handlers]) handler(event);
};

const effectsOf = (type) => effects.filter((event) => event.type === type);

const makeWorld = (city, raceFormat) => {
  const mount = {
    clientWidth: 1280, clientHeight: 720,
    getBoundingClientRect: () => ({ width: 1280, height: 720, top: 0, left: 0 }),
    appendChild() {}, removeChild() {},
    addEventListener() {}, removeEventListener() {},
    ownerDocument: globalThis.document,
    querySelector: () => null,
    classList: { add() {}, remove() {} },
    style: {},
  };
  const audioStub = new Proxy({}, { get: () => () => {} });
  const built = createCityRushWorld(mount, city, () => ({
    error: (message) => fail(`[${city.id}] erreur du moteur`, message),
    hud: (state) => { lastHud = state; },
    finish: () => {},
    effect: (event) => { effects.push(event); },
  }), CITY_RUSH_CARS[0].id, { current: audioStub }, null, 3, false, raceFormat);
  canvasOf.set(built, globalThis.__freeDriveCanvas);
  return built;
};

// Les voitures, tremplins et structures sont rangés loin devant : seuls ceux du
// scénario peuvent croiser le pilote.
const parkAll = (world, keep = new Set()) => {
  const h = world.harness;
  let offset = 0;
  for (const car of [...h.trafficCars, ...h.oncomingCars, ...h.racers, ...h.patrolCars]) {
    if (keep.has(car)) continue;
    offset += 40;
    car.distance = h.distance + 4000 + offset;
    car.impactChanging = false;
    car.impactCooldownLeft = 0;
  }
  for (const ramp of h.ramps) {
    if (keep.has(ramp)) continue;
    offset += 40;
    ramp.trackDistance = h.distance + 5000 + offset;
  }
  for (const garage of h.miniGarages) {
    if (!keep.has(garage)) garage.trackDistance = h.distance + 6000;
  }
  for (const warehouse of h.bazookaWarehouses) {
    if (!keep.has(warehouse)) warehouse.trackDistance = h.distance + 7000;
  }
};

// Repart d'un monde propre au volant libre, lancé à vitesse de croisière.
const fresh = (world, label) => {
  world.reset();
  world.setDrivingMode('free');
  world.setPhase('playing');
  world.start();
  stepFrame();
  parkAll(world);
  const cruise = Math.min(18, world.topSpeed * 0.7);
  if (runUntil(() => world.harness.speed > cruise, 10, () => parkAll(world)) === null) {
    fail(`${label} la voiture n'atteint pas sa vitesse de croisière`, { vitesse: world.harness.speed, visée: cruise });
  }
  parkAll(world);
  effects = [];
};

const nearestLaneCenter = (h, x) => {
  let best = Infinity;
  for (let lane = 0; lane < h.laneCount; lane += 1) best = Math.min(best, Math.abs(h.laneX(lane) - x));
  return best;
};
const laneXs = (h) => Array.from({ length: h.laneCount }, (_, lane) => h.laneX(lane));

const summaries = [];

for (const [cityIndex, city] of cities.entries()) {
  seed = (BASE_SEED + cityIndex * 104729) >>> 0;
  const label = `[${city.id}]`;
  const check = (condition, message, extra) => {
    if (!condition) fail(`${label} ${message}`, extra);
  };
  const results = [];

  // Sprint : trafic seul, sans rival ni police ni structure — la mesure ne
  // dépend que de ce que le scénario pose. Course : rivaux, garage, conteneurs.
  const world = makeWorld(city, 'sprint');
  const race = makeWorld(city, 'laps');
  const H = world.harness;
  const mid = Math.floor((H.laneCount - 1) / 2);
  const bounds = H.bounds();
  const halfWidth = H.halfWidth();
  const laneW = Math.abs(H.laneX(1) - H.laneX(0));

  // ── 1. Conduite du moteur nu, bascule, HUD ────────────────────────────
  {
    check(world.drivingMode === 'lanes', 'le moteur nu doit démarrer en conduite par voies', world.drivingMode);
    world.setDrivingMode('free');
    check(world.drivingMode === 'free', 'setDrivingMode("free") sans effet');
    world.setDrivingMode('nimporte');
    check(world.drivingMode === 'free', 'une valeur inconnue doit retomber sur la conduite libre');
    world.setDrivingMode('lanes');
    check(world.drivingMode === 'lanes', 'setDrivingMode("lanes") sans effet');
    fresh(world, label);
    check(lastHud?.drivingMode === 'free', 'le HUD doit publier la conduite', lastHud?.drivingMode);
    check(Math.abs(lastHud.playerX - H.x) < 0.5 && lastHud.playerLane === H.lane, 'le HUD doit publier la position du pilote');
    check(bounds.max > H.laneX(H.laneCount - 1) - EPS && bounds.min < H.laneX(0) + EPS, 'le débattement doit couvrir toutes les voies', bounds);
    results.push(`débattement ${bounds.min.toFixed(2)} … ${bounds.max.toFixed(2)} m`);
  }

  // ── 2. Touche tenue, relâche nette, aucune aimantation ────────────────
  {
    fresh(world, label);
    const x0 = H.laneX(mid);
    H.place(x0);
    keyDown('ArrowRight');
    check(H.x === x0, 'la pression ne doit pas sauter de voie');
    stepFrame();
    check(H.x > x0 && H.x < x0 + 0.1, 'la voiture doit commencer à glisser dès la première image', H.x - x0);
    let previous = H.x;
    runFrames(0.12, () => {
      check(H.x >= previous - EPS, 'touche → tenue : la voiture ne doit jamais reculer');
      previous = H.x;
    });
    check(H.lateral > 0, 'la touche tenue doit donner un glissement', H.lateral);
    keyUp('ArrowRight');
    const stopped = runUntil(() => H.lateral === 0, 0.5);
    check(stopped !== null && stopped <= 0.15 + EPS, 'la voiture doit s’arrêter net à la relâche', stopped);
    const rest = H.x;
    runFrames(0.6);
    check(H.x === rest, 'aucun rappel vers le centre d’une voie après la relâche', { avant: rest, après: H.x });
    check(nearestLaneCenter(H, rest) > 0.1, 'un appui court doit laisser la voiture entre deux voies', rest);
    check(H.lane === cityRushFreeLaneForX(rest, H.lane, laneXs(H)), 'la voie publiée doit suivre la position', { x: rest, voie: H.lane });
    results.push(`appui 0,13 s : ${(rest - x0).toFixed(2)} m, arrêt en ${(stopped ?? 0).toFixed(2)} s`);
  }

  // ── 3. Bords de la chaussée, Q / D, dernière touche pressée ───────────
  {
    fresh(world, label);
    H.place(H.laneX(mid));
    keyDown('d');
    const reached = runUntil(() => H.x >= bounds.max - EPS, 5, () => {
      check(H.x <= bounds.max + EPS, 'la voiture ne doit jamais déborder à droite', H.x);
    });
    check(reached !== null, 'D tenue doit mener au bord droit de la chaussée', H.x);
    runFrames(0.3);
    check(H.x === bounds.max && H.lateral === 0, 'au bord, la voiture bute et le glissement tombe', { x: H.x, glissement: H.lateral });
    // ← pressée pendant que D reste enfoncée : la dernière touche gagne.
    keyDown('ArrowLeft');
    runFrames(0.25);
    check(H.lateral < 0 && H.x < bounds.max, 'la dernière touche pressée doit tenir le volant', { x: H.x, glissement: H.lateral });
    keyUp('ArrowLeft');
    runFrames(0.25);
    check(H.lateral > 0, 'à la relâche de ←, D (toujours enfoncée) reprend la main', H.lateral);
    keyUp('d');
    keyDown('q');
    const left = runUntil(() => H.x <= bounds.min + EPS, 6, () => {
      check(H.x >= bounds.min - EPS, 'la voiture ne doit jamais déborder à gauche', H.x);
    });
    check(left !== null, 'Q tenue doit mener au bord gauche de la chaussée', H.x);
    keyUp('q');
    runFrames(0.2);
    check(H.lateral === 0, 'Q relâchée : plus de glissement');
  }

  // ── 4. Voie déduite, ligne propre, lecture visuelle ───────────────────
  {
    fresh(world, label);
    H.place(H.laneX(mid));
    runFrames(1.2);
    check(H.cleanLine > 1, 'la ligne propre doit monter quand la voiture tient sa voie', H.cleanLine);
    const lineX = (H.laneX(mid) + H.laneX(mid + 1)) / 2;
    const hyst = Math.min(CITY_RUSH_FREE_LANE_HYSTERESIS, laneW * 0.2);
    keyDown('ArrowRight');
    stepFrame();
    stepFrame();
    check(H.yaw < 0 && H.steerVisual > 0.05, 'vers la droite : nez tourné à droite, roues braquées', { lacet: H.yaw, braquage: H.steerVisual });
    const crossed = runUntil(() => H.lane === mid + 1, 1.5);
    check(crossed !== null, 'la voie doit changer quand la voiture franchit la ligne', H.x);
    check(H.x >= lineX + hyst - 0.3, 'la voie ne change qu’après l’hystérésis', { x: H.x, ligne: lineX });
    check(H.cleanLine < 0.05, 'la ligne propre doit retomber au franchissement', H.cleanLine);
    keyUp('ArrowRight');
    runFrames(0.35);
    check(H.yaw === 0 && H.steerVisual === 0, 'à l’arrêt du glissement, caisse et roues reviennent droites', { lacet: H.yaw, braquage: H.steerVisual });
  }

  // ── 5. Écart demandé par `action` ─────────────────────────────────────
  {
    fresh(world, label);
    H.place(H.laneX(mid));
    world.action('right');
    stepFrame();
    world.action('right'); // répété pendant le glissement : même cible
    stepFrame();
    world.action('right');
    let overshoot = 0;
    const settled = runUntil(() => H.steerTarget === null && H.lateral === 0, 1.5, () => {
      overshoot = Math.max(overshoot, H.x - H.laneX(mid + 1));
    });
    check(settled !== null, 'l’écart demandé doit aboutir', { x: H.x, cible: H.steerTarget });
    check(Math.abs(H.x - H.laneX(mid + 1)) < EPS && H.lane === mid + 1, 'action("right") : centre de la voie voisine', { x: H.x, voie: H.lane });
    check(overshoot <= EPS, 'l’écart demandé ne doit pas dépasser sa voie', overshoot);
    world.action('left');
    runUntil(() => H.steerTarget === null && H.lateral === 0, 1.5);
    check(Math.abs(H.x - H.laneX(mid)) < EPS && H.lane === mid, 'action("left") : retour au centre de la voie', H.x);
  }

  // ── 6. Au doigt : suivre le glissé, finir le geste, ignorer une touche ─
  {
    pointerWorld = world;
    fresh(world, label);
    const x0 = H.laneX(mid);
    H.place(x0);
    const metersPerPixel = (bounds.max - bounds.min) / (1280 * CITY_RUSH_FREE_TOUCH_SPAN);
    pointer('pointerdown', 640);
    pointer('pointermove', 640 + 128);
    const target = Math.min(bounds.max, x0 + 128 * metersPerPixel);
    runFrames(0.8);
    check(Math.abs(H.x - target) < EPS && H.lateral === 0, 'la voiture doit suivre le doigt', { x: H.x, visée: target });
    pointer('pointermove', 640 - 64);
    const back = Math.max(bounds.min, x0 - 64 * metersPerPixel);
    runFrames(0.8);
    check(Math.abs(H.x - back) < EPS, 'le doigt qui revient ramène la voiture', { x: H.x, visée: back });
    pointer('pointerup', 640 - 64);
    runFrames(0.4);
    check(Math.abs(H.x - back) < EPS, 'doigt levé à destination : la voiture reste en place', H.x);
    // Geste vif : le doigt se lève avant que la voiture n'arrive.
    const from = H.x;
    pointer('pointerdown', 300);
    pointer('pointermove', 300 + 200);
    pointer('pointerup', 300 + 200);
    const flickTarget = Math.min(bounds.max, from + 200 * metersPerPixel);
    runFrames(1.0);
    check(Math.abs(H.x - flickTarget) < EPS, 'doigt levé en route : la voiture finit le geste', { x: H.x, visée: flickTarget });
    // Simple touche : rien ne bouge.
    const tapX = H.x;
    pointer('pointerdown', 900);
    pointer('pointermove', 902);
    pointer('pointerup', 902);
    runFrames(0.5);
    check(H.x === tapX, 'une simple touche ne doit pas braquer', { avant: tapX, après: H.x });
    // Une flèche reprend la main sur un geste en cours.
    pointer('pointerdown', 640);
    pointer('pointermove', 640 + 220);
    pointer('pointerup', 640 + 220);
    stepFrame();
    keyDown('ArrowLeft');
    runFrames(0.2);
    check(H.steerTarget === null && H.lateral < 0, 'la flèche doit reprendre la main sur le geste', { cible: H.steerTarget, glissement: H.lateral });
    keyUp('ArrowLeft');
    results.push(`doigt : ${(128 * metersPerPixel).toFixed(2)} m pour 128 px`);
  }

  // ── 7. Voiture à hauteur : blocage, choc latéral unique ───────────────
  const F = [...H.forwardLanes].sort((a, b) => a - b);
  const contiguous = F.length >= 3 && F.every((lane, index) => index === 0 || lane === F[index - 1] + 1);
  if (contiguous) {
    fresh(world, label);
    const [a, b, c] = F;
    const car = H.trafficCars.find((item) => (
      !item.charge && !isCityRushPoliceTrafficType(item.type) && !item.rallied && !item.destroyed && !item.turnaroundState
    ));
    check(car, 'aucune voiture de trafic ordinaire pour la mesure');
    parkAll(world, new Set([car]));
    H.place(H.laneX(a));
    // La voiture roule à la hauteur du pilote, dans la voie voisine.
    car.lane = b;
    car.currentX = H.laneX(b);
    car.distance = H.distance + 0.8;
    car.baseSpeed = H.speed;
    car.currentSpeed = H.speed;
    car.impactChanging = false;
    car.impactCooldownLeft = 0;
    car.impactLeft = 0;
    const separation = halfWidth + car.width / 2;
    let closest = Infinity;
    keyDown('ArrowRight');
    runFrames(1.6, () => {
      if (Math.abs(car.distance - H.distance) < CITY_RUSH_SIDE_CONTACT_GAP) {
        closest = Math.min(closest, Math.abs(H.x - car.currentX));
        check(Math.abs(H.x - car.currentX) >= separation - 1e-4, 'carrosseries imbriquées pendant le côte-à-côte', {
          pilote: H.x, voiture: car.currentX, écart: Math.abs(H.x - car.currentX), séparation: separation,
        });
      }
    });
    keyUp('ArrowRight');
    const bumps = effectsOf('side-bump');
    check(bumps.length === 1, 'tourner vers la voiture à hauteur doit la pousser une fois', bumps.length);
    check(car.lane === c, 'la voiture poussée doit rejoindre la voie suivante', { voie: car.lane, attendue: c });
    results.push(`à hauteur : contact à ${closest.toFixed(2)} m (séparation ${separation.toFixed(2)}), 1 choc latéral`);
  } else {
    results.push('à hauteur : ignoré (moins de trois voies de course contiguës)');
  }

  // ── 8. Toupie : le volant ne répond plus ──────────────────────────────
  {
    fresh(world, label);
    H.place(H.laneX(mid));
    H.stunFor(0.8);
    const x0 = H.x;
    keyDown('ArrowRight');
    runFrames(0.5);
    check(H.x === x0, 'en toupie, la voiture ne glisse pas', { avant: x0, après: H.x });
    keyUp('ArrowRight');
    runFrames(0.6);
  }

  // ── 9. Retour aux voies : recentrage, écart instantané ────────────────
  {
    fresh(world, label);
    H.place(H.laneX(mid) + 0.7);
    world.setDrivingMode('lanes');
    check(H.lane === mid, 'la voie la plus proche est reprise', H.lane);
    runFrames(0.7);
    check(Math.abs(H.x - H.laneX(mid)) < 0.01, 'en conduite par voies, la voiture se recentre', H.x);
    keyDown('ArrowRight');
    check(H.lane === mid + 1, 'en conduite par voies, la pression change de voie aussitôt', H.lane);
    keyUp('ArrowRight');
    runFrames(0.7);
    world.setDrivingMode('free');
    const settled = H.x;
    runFrames(0.4);
    check(H.x === settled, 'repasser au volant libre laisse la voiture en place', H.x);
  }

  // ── 10. Tremplins : rattrapé, ou évité franchement ────────────────────
  {
    const rampCase = (offset) => {
      fresh(world, label);
      const ramp = H.ramps[0];
      ramp.lane = F[Math.min(1, F.length - 1)];
      ramp.trackDistance = H.distance + 45;
      ramp.crossedRacers.clear();
      parkAll(world, new Set([ramp]));
      const rampX = H.laneX(ramp.lane);
      // Décalage vers l'intérieur de la chaussée quand le bord est trop près.
      const side = rampX + offset <= bounds.max && rampX + offset >= bounds.min ? 1 : -1;
      H.place(rampX + side * offset);
      const outer = 1.2 + halfWidth;
      let worst = Infinity;
      let airborneDrift = 0;
      let airborneX = null;
      runUntil(() => H.distance > ramp.trackDistance + 12, 5, () => {
        const span = H.structures().find((item) => Math.abs((item.start + item.end) / 2 - ramp.trackDistance) < 0.01);
        const overlapping = span && H.distance + H.halfLength >= span.start && H.distance - H.halfLength <= span.end;
        if (overlapping && !H.jumping) {
          const dx = Math.abs(H.x - rampX);
          check(dx <= CITY_RUSH_FREE_RAMP_CATCH + EPS || dx >= outer - 1e-4, 'voiture à cheval sur la joue d’un tremplin', { dx });
          worst = Math.min(worst, dx >= outer - 1e-4 ? dx - outer : CITY_RUSH_FREE_RAMP_CATCH - dx);
        }
        if (H.jumping) {
          if (airborneX === null) {
            airborneX = H.x;
            keyDown('ArrowRight');
          }
          airborneDrift = Math.max(airborneDrift, Math.abs(H.x - airborneX));
        }
      });
      keyUp('ArrowRight');
      return { jumps: effectsOf('ramp-jump').length, airborneDrift, worst };
    };
    const caught = rampCase(1.3);
    check(caught.jumps === 1, 'à 1,30 m de l’axe, le tremplin doit rattraper la voiture', caught);
    check(caught.airborneDrift === 0, 'en l’air, la voiture ne glisse pas', caught);
    const besideOffset = (CITY_RUSH_FREE_RAMP_CATCH + 1.2 + halfWidth) / 2 + 0.12;
    const beside = rampCase(besideOffset);
    check(beside.jumps === 0, `à ${besideOffset.toFixed(2)} m de l’axe, la voiture doit passer à côté`, beside);
    results.push('tremplin : rattrapé à 1,30 m, évité à côté');
  }

  // ── 11. Mini-garage et conteneur : dedans ou à côté, jamais à travers ──
  {
    const R = race.harness;
    const structureCase = (pick, startX, holdKey = null) => {
      fresh(race, label);
      const structure = pick();
      parkAll(race, new Set([structure]));
      R.place(startX);
      if (holdKey) keyDown(holdKey);
      let overlapFrames = 0;
      runUntil(() => R.distance > structure.trackDistance + 25, 6, () => {
        for (const span of R.structures()) {
          if (R.distance + R.halfLength < span.start || R.distance - R.halfLength > span.end) continue;
          overlapFrames += 1;
          for (const [from, to] of span.zones) {
            check(!(R.x > from + 1e-4 && R.x < to - 1e-4), 'carrosserie à travers une paroi', { x: R.x, zone: [from, to] });
          }
        }
      });
      if (holdKey) keyUp(holdKey);
      return overlapFrames;
    };
    if (R.miniGarages.length) {
      const garageHalf = cityRushMiniGarageWidth(city) / 2;
      const placeGarage = () => {
        const garage = R.miniGarages[0];
        garage.used = false;
        garage.trackDistance = R.distance + 45;
        return garage;
      };
      // Du côté extérieur de la paroi : la sortie la plus proche est à côté du garage.
      const besideFrames = structureCase(placeGarage, garageHalf + 0.2);
      check(besideFrames > 0, 'le garage doit avoir été longé');
      check(effectsOf('mini-garage-used').length === 0, 'longer le garage ne doit pas le prendre');
      // Du côté intérieur de la paroi : la voiture est canalisée dedans, et l'atelier la répare.
      structureCase(placeGarage, garageHalf - 0.8);
      check(effectsOf('mini-garage-used').length === 1, 'canalisée dedans, la voiture doit traverser l’atelier', effectsOf('mini-garage-used').length);
      results.push('garage : longé à côté, traversé dedans');
    } else {
      results.push('garage : aucun sur ce parcours');
    }
    if (R.bazookaWarehouses.length) {
      const pickupX = R.laneX(R.bazookaPickupLane);
      const side = pickupX > 0 ? 1 : -1;
      const innerWall = pickupX - side * (laneW * 1.5 - 0.05);
      const placeWarehouse = () => {
        const warehouse = R.bazookaWarehouses[0];
        warehouse.taken = false;
        warehouse.trackDistance = R.distance + 45;
        return warehouse;
      };
      // Devant la paroi intérieure, côté route : la voiture longe le conteneur.
      const besideFrames = structureCase(placeWarehouse, innerWall - side * 0.3);
      check(besideFrames > 0, 'le conteneur doit avoir été longé');
      check(effectsOf('bazooka-pickup').length === 0, 'longer le conteneur ne prend pas la roquette');
      // Juste derrière la paroi : canalisée dedans ; vers la voie de ramassage,
      // la roquette se prend.
      structureCase(placeWarehouse, innerWall + side * 0.4, side > 0 ? 'ArrowRight' : 'ArrowLeft');
      check(effectsOf('bazooka-pickup').length === 1, 'dans le conteneur, la voie de ramassage doit donner la roquette', effectsOf('bazooka-pickup').length);
      results.push('conteneur : longé à côté, roquette prise dedans');
    } else {
      results.push('conteneur : aucun sur ce parcours');
    }
  }

  // ── 12. Un rival se traverse, comme avant ─────────────────────────────
  {
    const R = race.harness;
    fresh(race, label);
    const rival = R.racers[0];
    check(rival, 'aucun rival dans la course');
    const lane = F[Math.min(1, F.length - 1)];
    const towardRight = lane > 0;
    const startLane = towardRight ? lane - 1 : lane + 1;
    parkAll(race, new Set([rival]));
    R.place(R.laneX(startLane));
    rival.lane = lane;
    rival.distance = R.distance + 0.5;
    rival.currentX = R.laneX(lane);
    const key = towardRight ? 'ArrowRight' : 'ArrowLeft';
    keyDown(key);
    runFrames(0.5);
    keyUp(key);
    const crossed = towardRight ? R.x >= R.laneX(lane) - EPS : R.x <= R.laneX(lane) + EPS;
    check(crossed, 'un rival à hauteur se traverse', { x: R.x, rival: R.laneX(lane) });
    check(effectsOf('side-bump').length === 0, 'traverser un rival ne fait aucun choc');
  }

  world.destroy?.();
  race.destroy?.();
  summaries.push(`${label} OK\n  · ${results.join('\n  · ')}`);
}

console.log(summaries.join('\n'));
