// Entrée de `scripts/city-rush-free-drive-check.mjs` (`npm run check:city-rush-free-drive`).
//
// La conduite libre jouée dans le vrai monde, image par image, avec de vrais
// événements (touches sur `window`, gestes du doigt sur le canvas). Sur chaque
// parcours demandé :
//   · le moteur nu démarre en conduite par voies (les harnais historiques le
//     pilotent ainsi) ; `setDrivingMode` bascule, une valeur inconnue retombe
//     sur la conduite libre, et le HUD publie la conduite ;
//   · la voiture tourne comme une vraie voiture : la touche tenue braque les
//     roues et tourne le nez ; relâchée, le volant se rend mais le cap tient —
//     la voiture continue tout droit, et il faut contre-braquer pour
//     s'arrêter net (le dernier cran de volant est pardonné sur route droite) ;
//   · Q / D comme ← / →, et la dernière touche pressée tient le volant ;
//   · bord de la chaussée : la voiture bute sans jamais déborder, et le bord
//     lui remet le nez dans l'axe le temps du frottement ;
//   · la voie du pilote suit sa position (hystérésis comprise) et la ligne
//     propre retombe à zéro au franchissement d'une ligne ;
//   · lacet de la caisse et braquage des roues suivent le cap et le volant ;
//   · dans les virages (Ring, Vice City, tōgé) : sans volant, la voiture file
//     vers l'extérieur ; le pilote qui braque tient sa ligne, et le placement
//     assisté contre-braque tout seul ;
//   · `action('right')` rejoint le centre de la voie voisine, sans dépasser ;
//   · au doigt : la voiture suit le glissé (55 % de l'écran = toute la
//     chaussée), finit le geste quand le doigt se lève, ne bouge pas sur une
//     simple touche, et une flèche reprend la main ;
//   · une voiture à hauteur bloque le geste — jamais de carrosseries
//     imbriquées — et le pilote qui insiste la pousse (un seul choc latéral) ;
//     un rival, lui, se traverse ;
//   · toupie et saut : le volant ne répond plus, la voiture gèle ;
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
  CITY_RUSH_LANE_WIDTH,
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_SIDE_CONTACT_GAP,
  cityRushTrackProfile,
  isCityRushPoliceTrafficType,
} = await import('../src/games/cityRushRules.js');
const {
  CITY_RUSH_FREE_LANE_HYSTERESIS,
  CITY_RUSH_FREE_RAMP_CATCH,
  CITY_RUSH_FREE_TOUCH_SPAN,
  cityRushFreeLaneForX,
  cityRushFreeRoadCurvature,
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
  for (const car of [...h.trafficCars, ...h.oncomingCars, ...h.patrolCars]) {
    if (keep.has(car)) continue;
    offset += 40;
    car.distance = h.distance + 4000 + offset;
    car.impactChanging = false;
    car.impactCooldownLeft = 0;
  }
  // Les rivaux se garent DERRIÈRE le pilote : garés loin devant, un warp en
  // fin de premier tour les faisait franchir l'arrivée et la course se
  // clôturait sous le scénario (tour d'honneur, plus de volant).
  let behind = 0;
  for (const car of h.racers) {
    if (keep.has(car)) continue;
    behind += 40;
    car.distance = Math.max(0, h.distance - 600 - behind);
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

const laneXs = (h) => Array.from({ length: h.laneCount }, (_, lane) => h.laneX(lane));

// La fenêtre de 120 m la plus droite du tour : les scénarios qui veulent une
// route franchement droite (relâche, contre-braquage, raccrochage du cap) y
// sont téléportés — sur le tōgé ou le Ring, le hasard du départ pouvait tomber
// en pleine épingle.
const straightSpot = (city) => {
  const profile = cityRushTrackProfile(city.id);
  const lap = CITY_RUSH_LAP_LENGTH;
  const span = 120;
  let best = null;
  for (let start = 100; start < lap - span; start += 10) {
    let worst = 0;
    for (let s = start; s < start + span; s += 10) {
      worst = Math.max(worst, Math.abs(cityRushFreeRoadCurvature(profile.yaw, s, { lap })));
    }
    if (!best || worst < best.worst) best = { start, worst };
  }
  return best;
};

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

  // ── 2. Volant réel : tenue, cap qui tient, contre-braquage ────────────
  {
    fresh(world, label);
    const straight = straightSpot(city);
    H.warp(straight.start);
    runFrames(0.3, () => parkAll(world));
    const x0 = H.laneX(0);
    H.place(x0);
    keyDown('ArrowRight');
    check(H.x === x0, 'la pression ne doit pas sauter de voie');
    stepFrame();
    check(H.x > x0 && H.x < x0 + 0.1, 'la voiture doit commencer à glisser dès la première image', H.x - x0);
    let previous = H.x;
    runFrames(0.22, () => {
      check(H.x >= previous - EPS, 'touche → tenue : la voiture ne doit jamais reculer');
      previous = H.x;
    });
    check(H.lateral > 0 && H.heading > 0, 'la touche tenue doit tourner le nez et déporter la voiture', {
      cap: H.heading, glissement: H.lateral,
    });
    keyUp('ArrowRight');
    // Relâche : le volant se rend, le cap tient — la voiture continue tout
    // droit, de biais, sans aucun rappel vers un centre de voie.
    runFrames(0.2);
    const drift = H.x;
    check(H.steerVisual === 0, 'relâché, le volant revient au centre', H.steerVisual);
    check(H.heading > 0 && H.lateral > 0, 'relâché, le cap tient : la voiture continue tout droit, de biais', {
      cap: H.heading, glissement: H.lateral,
    });
    runFrames(0.2);
    check(H.x > drift, 'sans volant ni contre-braquage, la voiture file de côté', { avant: drift, après: H.x });
    // Contre-braquage : le pilote redresse, la voiture s'arrête net.
    keyDown('ArrowLeft');
    const straightened = runUntil(() => H.lateral <= 0, 1.2);
    check(straightened !== null, 'le contre-braquage doit redresser la voiture', { cap: H.heading, glissement: H.lateral });
    keyUp('ArrowLeft');
    // Sur une route droite, le dernier cran de volant est pardonné : la
    // voiture s'arrête net. Sur un circuit qui ne se redresse jamais (le
    // Ring), le cap revient près de la ligne et la route reprend ses droits.
    if (straight.worst <= 0.002) {
      // Arrêt net = cap droit ET volant rendu : le cap peut franchir zéro un
      // instant avant que le volant ait fini de se rendre.
      const stopped = runUntil(() => H.lateral === 0 && H.steerVisual === 0, 0.5);
      check(stopped !== null && stopped <= 0.25 + EPS, 'redressée, la voiture doit s’arrêter net (dernier cran pardonné)', stopped);
    } else {
      runFrames(0.15);
      check(Math.abs(H.heading) <= 0.16, 'redressée sur une route qui tourne, le cap revient près de la ligne', H.heading);
    }
    const rest = H.x;
    runFrames(0.5);
    if (straight.worst <= 0.002) {
      check(H.x === rest, 'aucun rappel vers le centre d’une voie une fois redressée', { avant: rest, après: H.x });
    }
    check(H.lane === cityRushFreeLaneForX(rest, H.lane, laneXs(H)), 'la voie publiée doit suivre la position', { x: rest, voie: H.lane });
    results.push(`appui 0,25 s : ${(rest - x0).toFixed(2)} m, cap tenu à la relâche, redressé en ${(straightened ?? 0).toFixed(2)} s`);
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
    runFrames(0.45);
    check(H.lateral > 0, 'à la relâche de ←, D (toujours enfoncée) reprend la main', H.lateral);
    keyUp('d');
    keyDown('q');
    const left = runUntil(() => H.x <= bounds.min + EPS, 6, () => {
      check(H.x >= bounds.min - EPS, 'la voiture ne doit jamais déborder à gauche', H.x);
    });
    check(left !== null, 'Q tenue doit mener au bord gauche de la chaussée', H.x);
    keyUp('q');
    runFrames(0.2);
    check(H.steerVisual === 0, 'Q relâchée : le volant revient au centre', H.steerVisual);
    // Route droite : le bord tient la voiture et plus rien ne la fait glisser.
    // Route qui tourne (le Ring) : la route reprend ses droits et peut la
    // décoller du bord — on ne juge que le volant rendu.
    if (Math.abs(H.curvature()) <= 0.002) {
      check(H.lateral === 0, 'Q relâchée : plus de glissement', H.lateral);
    }
  }

  // ── 4. Voie déduite, ligne propre, lecture visuelle ───────────────────
  {
    fresh(world, label);
    const straight = straightSpot(city);
    H.warp(straight.start);
    runFrames(0.3, () => parkAll(world));
    H.place(H.laneX(mid));
    runFrames(1.2);
    check(H.cleanLine > 1, 'la ligne propre doit monter quand la voiture tient sa voie', H.cleanLine);
    const lineX = (H.laneX(mid) + H.laneX(mid + 1)) / 2;
    keyDown('ArrowRight');
    stepFrame();
    stepFrame();
    check(H.yaw < 0 && H.steerVisual > 0.1, 'vers la droite : nez tourné à droite, roues braquées', { lacet: H.yaw, braquage: H.steerVisual });
    const crossed = runUntil(() => H.lane === mid + 1, 1.5);
    check(crossed !== null, 'la voie doit changer quand la voiture franchit la ligne', H.x);
    check(H.x >= lineX + CITY_RUSH_FREE_LANE_HYSTERESIS - 0.25, 'la voie ne change qu’après l’hystérésis', { x: H.x, ligne: lineX });
    check(H.cleanLine < 0.05, 'la ligne propre doit retomber au franchissement', H.cleanLine);
    keyUp('ArrowRight');
    runFrames(0.35);
    // Le volant se rend, mais la caisse garde son cap : le nez reste tourné,
    // la voiture file de biais — la lecture visuelle est le cap réel.
    check(H.steerVisual === 0, 'relâché, les roues reviennent droites', H.steerVisual);
    check(H.yaw < 0 && H.lateral > 0, 'relâché, la caisse garde son cap, le nez reste tourné', { lacet: H.yaw, glissement: H.lateral });
    keyDown('ArrowLeft');
    runUntil(() => H.lateral <= 0, 1.2);
    keyUp('ArrowLeft');
    if (straight.worst <= 0.002) {
      const settled = runUntil(() => H.lateral === 0 && H.yaw === 0, 0.5);
      check(settled !== null, 'contre-braquée puis raccrochée, la voiture reprend la ligne droite', { lacet: H.yaw, glissement: H.lateral });
    } else {
      runFrames(0.2);
      check(Math.abs(H.yaw) <= 0.16, 'contre-braquée sur une route qui tourne, la voiture revient près de la ligne', { lacet: H.yaw });
    }
  }

  // ── 5. Écart demandé par `action` ─────────────────────────────────────
  {
    fresh(world, label);
    H.warp(straightSpot(city).start);
    runFrames(0.3, () => parkAll(world));
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
    const straight = straightSpot(city);
    H.warp(straight.start);
    runFrames(0.3, () => parkAll(world));
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
    runFrames(1.2);
    check(Math.abs(H.x - back) < EPS, 'le doigt qui revient ramène la voiture', { x: H.x, visée: back });
    pointer('pointerup', 640 - 64);
    runFrames(0.4);
    // Route droite : la voiture reste exactement en place. Sur un circuit qui
    // tourne encore, seule la route peut la déporter — du souffle de sa
    // courbure, rien de plus (un cap né au point de lever, laissé à la route).
    if (straight.worst <= 0.002) {
      check(Math.abs(H.x - back) < EPS, 'doigt levé à destination : la voiture reste en place', { x: H.x, visée: back });
    } else {
      const k = H.curvature();
      const carry = Math.abs(k) < 1e-6 ? 0 : Math.abs((1 - Math.cos(k * H.speed * 0.4)) / k);
      check(Math.abs(H.x - back) < carry + 0.06, 'doigt levé à destination : seule la route peut déporter la voiture', { x: H.x, visée: back, déportRoute: carry.toFixed(3) });
    }
    // Geste vif : le doigt se lève avant que la voiture n'arrive.
    const from = H.x;
    pointer('pointerdown', 300);
    pointer('pointermove', 300 + 200);
    pointer('pointerup', 300 + 200);
    const flickTarget = Math.min(bounds.max, from + 200 * metersPerPixel);
    let flickReached = false;
    runFrames(1.4, () => {
      flickReached = flickReached || Math.abs(H.x - flickTarget) < 0.06;
    });
    check(flickReached, 'doigt levé en route : la voiture finit le geste', { x: H.x, visée: flickTarget });
    if (straight.worst <= 0.002) {
      check(Math.abs(H.x - flickTarget) < EPS, 'la voiture se gare sur la cible du geste', { x: H.x, visée: flickTarget });
    }
    // Simple touche : rien ne bouge.
    // Simple touche : le volant ne bouge pas. (Sur un circuit qui tourne, la
    // voiture peut être portée par la route — c'est le volant qu'on juge.)
    const tapX = H.x;
    let tapSteered = false;
    pointer('pointerdown', 900);
    pointer('pointermove', 902);
    pointer('pointerup', 902);
    runFrames(0.5, () => {
      tapSteered = tapSteered || H.steerVisual !== 0;
    });
    check(!tapSteered, 'une simple touche ne doit pas braquer', { avant: tapX, après: H.x });
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
      // Sur une route droite : l'approche ne doit dériver que du scénario.
      H.warp(straightSpot(city).start);
      runFrames(0.3, () => parkAll(world));
      const ramp = H.ramps[0];
      ramp.lane = F[Math.min(1, F.length - 1)];
      ramp.trackDistance = H.distance + 45;
      ramp.crossedRacers.clear();
      parkAll(world, new Set([ramp]));
      const rampX = H.laneX(ramp.lane);
      // Décalage vers l'intérieur de la chaussée quand le bord est trop près.
      const side = rampX + offset <= bounds.max && rampX + offset >= bounds.min ? 1 : -1;
      H.place(rampX + side * offset);
      // La ligne d'approche est tenue par le placement assisté : sur un
      // circuit qui ne se redresse jamais (le Ring), une voiture sans volant
      // dérive de plusieurs mètres avant le tremplin.
      H.aim(rampX + side * offset);
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
      // Sur une route droite : l'approche ne doit dériver que du scénario.
      R.warp(straightSpot(city).start);
      runFrames(0.3, () => parkAll(race));
      const structure = pick();
      parkAll(race, new Set([structure]));
      R.place(startX);
      if (holdKey) keyDown(holdKey);
      else R.aim(startX);
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
      const placeGarage = () => {
        const garage = R.miniGarages[0];
        garage.used = false;
        garage.trackDistance = R.distance + 45;
        return garage;
      };
      // À 2,90 m de l'axe : la sortie la plus proche est à côté du garage.
      const besideFrames = structureCase(placeGarage, 2.9);
      check(besideFrames > 0, 'le garage doit avoir été longé');
      check(effectsOf('mini-garage-used').length === 0, 'longer le garage ne doit pas le prendre');
      // À 1,90 m : la voiture est canalisée dedans, et l'atelier la répare.
      structureCase(placeGarage, 1.9);
      check(effectsOf('mini-garage-used').length === 1, 'canalisée dedans, la voiture doit traverser l’atelier', effectsOf('mini-garage-used').length);
      results.push('garage : longé à côté, traversé dedans');
    } else {
      results.push('garage : aucun sur ce parcours');
    }
    if (R.bazookaWarehouses.length) {
      const pickupX = R.laneX(R.bazookaPickupLane);
      const side = pickupX > 0 ? 1 : -1;
      const innerWall = pickupX - side * (CITY_RUSH_LANE_WIDTH * 1.5 - 0.05);
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
    runFrames(0.75);
    keyUp(key);
    const crossed = towardRight ? R.x >= R.laneX(lane) - EPS : R.x <= R.laneX(lane) + EPS;
    check(crossed, 'un rival à hauteur se traverse', { x: R.x, rival: R.laneX(lane) });
    check(effectsOf('side-bump').length === 0, 'traverser un rival ne fait aucun choc');
  }

  // ── 13. Virages : sans volant, la voiture sort ; au volant, elle tient ──
  {
    const profile = cityRushTrackProfile(city.id);
    const lap = CITY_RUSH_LAP_LENGTH;
    let pin = null;
    for (let s = 150; s < lap - 250; s += 5) {
      const k = cityRushFreeRoadCurvature(profile.yaw, s, { lap });
      if (!pin || Math.abs(k) > Math.abs(pin.k)) pin = { s, k };
    }
    if (!pin || Math.abs(pin.k) < 0.006) {
      results.push('virage : ignoré (parcours droit)');
    } else {
      const outside = Math.sign(pin.k); // κ > 0 : le virage est à gauche, la sortie à droite
      // a) Mains libres : la route tourne, pas la voiture — elle continue
      //    tout droit et file vers l'extérieur, le bord la retient.
      fresh(world, label);
      H.warp(pin.s - 70);
      runFrames(0.3, () => parkAll(world));
      const laneMid = H.laneX(mid);
      H.place(laneMid);
      const from = H.x;
      let outsidePeak = 0;
      let nosePeak = 0;
      let touchedEdge = false;
      let sawPin = false;
      runUntil(() => H.distance > pin.s + 55, 14, () => {
        parkAll(world);
        check(H.x >= bounds.min - EPS && H.x <= bounds.max + EPS, 'sans volant, la voiture reste sur la chaussée (le bord la retient)', H.x);
        if (Math.abs(H.x - (outside > 0 ? bounds.max : bounds.min)) < 0.06) touchedEdge = true;
        if (Math.abs(H.curvature()) > 0.004) {
          sawPin = true;
          outsidePeak = Math.max(outsidePeak, (H.x - from) * outside);
          nosePeak = Math.max(nosePeak, H.heading * outside);
        }
      });
      check(sawPin, 'le scénario doit traverser le virage', { distance: H.distance, virage: pin.s });
      check(outsidePeak >= 1.2 || touchedEdge, 'sans volant, la voiture doit sortir vers l’extérieur du virage', { excursion: outsidePeak, auBord: touchedEdge });
      check(nosePeak > 0.1, 'sans volant, le nez doit pointer vers l’extérieur', nosePeak);
      // b) Au volant, comme un joueur aux flèches : braquer tient la ligne.
      fresh(world, label);
      H.warp(pin.s - 70);
      runFrames(0.3, () => parkAll(world));
      const target = H.laneX(mid);
      H.place(target);
      // Comme un joueur aux flèches : braquer vers la cible dès que la
      // voiture s'en écarte, rendre le volant quand elle y revient.
      let heldKey = null;
      const steerTo = (key) => {
        if (heldKey === key) return;
        if (heldKey) keyUp(heldKey);
        heldKey = key;
        if (key) keyDown(key);
      };
      let worstOffset = 0;
      let steerInto = 0;
      sawPin = false;
      runUntil(() => H.distance > pin.s + 55, 14, () => {
        parkAll(world);
        const offset = H.x - target;
        if (heldKey && Math.abs(offset) < 0.1) steerTo(null);
        else if (!heldKey && Math.abs(offset) > 0.3) steerTo(offset > 0 ? 'ArrowLeft' : 'ArrowRight');
        worstOffset = Math.max(worstOffset, Math.abs(offset));
        if (Math.abs(H.curvature()) > 0.004) {
          sawPin = true;
          steerInto = Math.max(steerInto, -outside * H.steerAngle);
        }
        check(H.x >= bounds.min - EPS && H.x <= bounds.max + EPS, 'au volant, la voiture reste sur la chaussée', H.x);
      });
      steerTo(null);
      check(sawPin, 'le scénario doit traverser le virage (au volant)', { distance: H.distance, virage: pin.s });
      check(worstOffset < 2.8, 'au volant, le joueur tient sa ligne dans le virage', worstOffset);
      check(steerInto > 0.02, 'tenir le virage demande de braquer vers l’intérieur', steerInto);
      // c) Placement assisté (glissé au doigt tenu, démonstration du
      //    tutoriel) : le pilote assisté contre-braque tout seul.
      fresh(world, label);
      H.warp(pin.s - 70);
      runFrames(0.3, () => parkAll(world));
      H.place(H.laneX(mid));
      let worstAim = 0;
      let assistSteer = 0;
      sawPin = false;
      runUntil(() => H.distance > pin.s + 55, 14, () => {
        parkAll(world);
        if (H.steerTarget === null) H.aim(H.laneX(mid));
        worstAim = Math.max(worstAim, Math.abs(H.x - H.laneX(mid)));
        if (Math.abs(H.curvature()) > 0.004) {
          sawPin = true;
          assistSteer = Math.max(assistSteer, -outside * H.steerAngle);
        }
      });
      check(sawPin, 'le scénario doit traverser le virage (assisté)', { distance: H.distance, virage: pin.s });
      check(worstAim < 0.9, 'le placement assisté tient la ligne dans le virage', worstAim);
      check(assistSteer > 0.02, 'le placement assisté contre-braque dans le virage', assistSteer);
      results.push(`virage (κ=${pin.k.toFixed(3)} rad/m) : sortie ${touchedEdge ? 'jusqu’au bord' : `${outsidePeak.toFixed(1)} m`} sans volant, tenu à ${worstOffset.toFixed(2)} m au volant, ${worstAim.toFixed(2)} m en assisté`);
    }
  }

  world.destroy?.();
  race.destroy?.();
  summaries.push(`${label} OK\n  · ${results.join('\n  · ')}`);
}

console.log(summaries.join('\n'));
console.log('VÉRIF CONDUITE LIBRE OK');
