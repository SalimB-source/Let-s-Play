// Vérif « choc latéral » : une voiture à côté du pilote, dans la voie qu'il tente
// de rejoindre, lui ferme la voie (`canEnterLane`). Tourner quand même vers elle
// déclenche le choc : la voiture se pousse sur la voie voisine, du côté opposé au
// pilote, avec le petit choc du carambolage. Le pilote et elle perdent un carré :
// un PV pour un rival ou une berline de police, rien pour le trafic ordinaire.
//
// Le monde est le vrai `createCityRushWorld` (faux WebGLRenderer, lanceur :
// `city-rush-side-bump-check.mjs`), les touches passent par de **vrais
// événements clavier** et chaque voiture est posée à la main par `world.harness`.
// Le lanceur ne ferme aucune voie : ce qui est mesuré est le jeu réel.
//
// Comportements vérifiés, sur chaque parcours demandé (`--all` : les huit) :
//   · le trafic ordinaire est poussé sur la voie libre, le pilote perd un carré,
//     le trafic ne perd rien ;
//   · la voiture glisse sur sa nouvelle voie en 0,5 s, et ne revient pas ;
//   · un seul choc tant que les voitures restent côte à côte : le pilote peut
//     avancer d'une voie, mais tourner de nouveau vers la voiture ne refait pas
//     de choc ;
//   · au bord de la chaussée, ou quand la voie d'à côté est occupée, la voiture
//     ne bouge pas, rien n'est perdu, et la voie reste fermée au pilote ;
//   · une voiture à 4 m (au-delà du contact) ferme la voie sans choc ; une voie
//     libre se prend sans rien ;
//   · un rival, une berline de l'escouade et une voiture venant en face sont
//     poussés comme le trafic, et chacun perd son carré ;
//   · une voiture de police de la ronde est poussée, rejoint la poursuite et perd
//     un PV.
const BASE_SEED = Number(process.env.CITY_RUSH_SIDE_BUMP_SEED || 20261009) >>> 0;
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
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  addEventListener(t, f) { (listeners.window[t] ||= []).push(f); },
  removeEventListener() {},
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

let rafQueue = new Map();
let rafId = 1;
let virtualNow = 0;
globalThis.requestAnimationFrame = (cb) => { const id = rafId++; rafQueue.set(id, cb); return id; };
globalThis.cancelAnimationFrame = (id) => { rafQueue.delete(id); };
Object.defineProperty(globalThis, 'performance', { value: { now: () => virtualNow }, configurable: true });


const { createCityRushWorld } = await import('../src/games/ViceCityWorld.jsx');
const {
  CITY_RUSH_COURSES,
  CITY_RUSH_CARS,
  CITY_RUSH_POLICE_HEALTH,
  CITY_RUSH_SIDE_CONTACT_GAP,
  isCityRushPoliceTrafficType,
} = await import('../src/games/cityRushRules.js');

const fail = (msg, extra) => { console.error('ÉCHEC :', msg, extra ?? ''); process.exit(3); };

// Le monde prend un parcours (`CITY_RUSH_COURSES`) : routes à deux sens, conduite
// à gauche, Route 66, campagne mexicaine et le Ring à quatre voies.
const cityArg = process.argv.find((a) => a.startsWith('--city='))?.slice(7);
const all = process.argv.includes('--all') || process.env.CITY_RUSH_SIDE_BUMP_ALL === '1';
const cities = all ? CITY_RUSH_COURSES : [CITY_RUSH_COURSES.find((c) => c.id === (cityArg || 'vice-city')) || CITY_RUSH_COURSES[0]];
const FRAME_MS = 1000 / 60;
const FRAME_S = FRAME_MS / 1000;

// Chaque effet émis par le monde est gardé : le choc se lit dans `side-bump`,
// les dégâts du pilote dans `player-hit`.
let effects = [];
// Dernier état de HUD publié par le monde : le compteur de contacts s'y lit.
let lastHud = null;

const stepFrame = () => {
  const q = [...rafQueue.values()];
  rafQueue.clear();
  virtualNow += FRAME_MS;
  for (const cb of q) cb(virtualNow);
};
const runFrames = (seconds) => {
  const frames = Math.max(1, Math.round(seconds / FRAME_S));
  for (let index = 0; index < frames; index += 1) stepFrame();
};

const fireKey = (type, key, extra = {}) => {
  const handlers = listeners.window[type] || [];
  if (!handlers.length) fail(`aucun écouteur « ${type} » posé par le moteur`);
  const event = { key, repeat: false, preventDefault() {}, stopPropagation() {}, target: null, ...extra };
  for (const handler of handlers) handler(event);
};
// Une pression courte : la touche est relâchée aussitôt, sans répétition.
const tap = (key) => {
  fireKey('keydown', key);
  fireKey('keyup', key);
};
const RIGHT = 'ArrowRight';
const LEFT = 'ArrowLeft';

const sideBumps = () => effects.filter((event) => event.type === 'side-bump');
const playerHits = () => effects.filter((event) => event.type === 'player-hit');

const makeWorld = (city, raceFormat, laps) => {
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
  return createCityRushWorld(mount, city, () => ({
    error: (message) => fail(`[${city.id}] erreur du moteur`, message),
    hud: (state) => { lastHud = state; },
    finish: () => {},
    effect: (event) => { effects.push(event); },
  }), CITY_RUSH_CARS[0].id, { current: audioStub }, null, laps, false, raceFormat);
};

// Repart d'un monde propre : voiture au départ, course lancée, mesures vidées.
const fresh = (world) => {
  world.reset();
  world.setPhase('playing');
  world.start();
  stepFrame();
  effects = [];
  lastHud = null;
};

// Les autres voitures sont garées loin devant : seules celles du scénario
// peuvent être à côté du pilote.
const parkOthers = (world, keep) => {
  const h = world.harness;
  let offset = 0;
  for (const car of [...h.trafficCars, ...h.oncomingCars, ...h.racers, ...h.patrolCars]) {
    if (keep.has(car.id)) continue;
    offset += 40;
    car.distance = h.distance + 3000 + offset;
    car.impactChanging = false;
    car.impactCooldownLeft = 0;
  }
};

// Pose une voiture sur une voie, à `gap` mètres du pilote (positif : devant).
const place = (h, car, lane, gap) => {
  car.lane = lane;
  car.distance = h.distance + gap;
  car.currentX = h.laneX(lane);
  car.impactChanging = false;
  car.impactCooldownLeft = 0;
  car.impactLeft = 0;
};

const ordinaryTraffic = (list, exclude = []) => list.find((car) => (
  !car.charge && !isCityRushPoliceTrafficType(car.type) && !car.rallied && !car.destroyed
  && !car.turnaroundState && !exclude.includes(car)
));

for (const [cityIndex, city] of cities.entries()) {
  seed = (BASE_SEED + cityIndex * 104729) >>> 0;
  const check = (condition, message, extra) => {
    if (!condition) fail(`[${city.id}] ${message}`, extra);
  };

  // Sprint : trafic ordinaire seul, pas de rival ni de police — la mesure ne
  // dépend que des voitures posées par le scénario.
  const world = makeWorld(city, 'sprint', 3);
  // Course : rivaux et escouade (inactive au départ) pour les cas de rival et de police.
  const race = makeWorld(city, 'laps', 3);

  const h0 = world.harness;
  const F = [...h0.forwardLanes].sort((x, y) => x - y);
  const O = [...h0.oncomingLanes].sort((x, y) => x - y);
  check(F.length >= 3 && F.every((lane, index) => index === 0 || lane === F[index - 1] + 1),
    'il faut trois voies de course contiguës pour mesurer le choc', F);
  const [a, b, c] = F;
  const results = [];

  // ── 1. Trafic ordinaire poussé, un carré pour le pilote, aucun PV pour le trafic
  {
    fresh(world);
    const H = world.harness;
    const car = ordinaryTraffic(H.trafficCars);
    check(car, 'aucune voiture de trafic ordinaire pour la mesure');
    parkOthers(world, new Set([car.id]));
    H.placeLane(a);
    place(H, car, b, 1.2);
    const before = H.health;
    tap(RIGHT);
    const [bump] = sideBumps();
    check(sideBumps().length === 1 && bump.trafficId === car.id, 'le choc n\'a pas eu lieu, ou sur la mauvaise voiture', effects);
    // Le monde repart à zéro contact (`fresh`) : le choc doit donc afficher exactement 1.
    check(lastHud?.vehicleContacts === 1, `le choc ne compte pas dans les contacts (HUD : ${lastHud?.vehicleContacts})`);
    check(bump.kind === 'traffic' && bump.lane === c && bump.fromLane === b, 'le trafic n\'est pas poussé vers la voie opposée au pilote', bump);
    check(car.lane === c, `le trafic est resté sur sa voie (${car.lane})`);
    check(H.lane === a, `le pilote a changé de voie malgré le choc (${H.lane})`);
    check(H.health === before - 1, `le pilote doit perdre un carré (${before} -> ${H.health})`);
    check(playerHits().some((event) => event.damage === 1 && event.victim === 'traffic'), 'pas de carré annoncé pour le pilote', playerHits());
    check(car.health === null || car.health === undefined, `le trafic ordinaire ne doit pas avoir de PV (${car.health})`);
    results.push('trafic poussé, un carré pour le pilote, aucun PV pour le trafic');

    // ── 2. Glissement : 0,5 s pour rejoindre la voie, sans revenir en arrière
    fresh(world);
    const S = world.harness;
    const slider = ordinaryTraffic(S.trafficCars);
    parkOthers(world, new Set([slider.id]));
    S.placeLane(a);
    place(S, slider, b, 1.2);
    const x0 = S.laneX(b);
    const x1 = S.laneX(c);
    tap(RIGHT);
    // Même cinétique que le rabat du trafic existant : une approche de constante
    // `CITY_RUSH_TRAFFIC_LANE_CHANGE_DURATION` (0,5 s), arrivée complète ensuite.
    runFrames(0.1);
    const mid = slider.currentX;
    check(Math.min(x0, x1) < mid && mid < Math.max(x0, x1), `le trafic ne glisse pas vers la voie d'arrivée (x=${mid.toFixed(2)})`, { x0, x1 });
    runFrames(0.4);
    const covered = (slider.currentX - x0) / (x1 - x0);
    check(covered > 0.5, `le glissement est trop lent : ${(covered * 100).toFixed(0)} % du chemin après 0,5 s`);
    runFrames(1.5);
    check(slider.currentX === x1 && slider.impactChanging === false && slider.lane === c,
      `le glissement n'est pas arrivé à sa voie après 2 s (x=${slider.currentX.toFixed(3)}, attendu ${x1.toFixed(3)})`);
    results.push('glissement vers la voie d\'arrivée (même cinétique que le rabat du trafic)');

    // ── 3. Un seul choc tant que les voitures restent côte à côte
    fresh(world);
    const R = world.harness;
    const once = ordinaryTraffic(R.trafficCars);
    parkOthers(world, new Set([once.id]));
    R.placeLane(a);
    place(R, once, b, 1.2);
    tap(RIGHT);
    check(sideBumps().length === 1, 'premier appui : un choc attendu', effects);
    const healthAfterBump = R.health;
    // Tant que la carrosserie glisse encore dans la voie visée, elle la tient :
    // le pilote ne la prend pas, et ce n'est pas un second choc.
    tap(RIGHT);
    check(R.lane === a && sideBumps().length === 1, 'le pilote a pris une voie encore occupée par la voiture qui se range');
    // La voiture se range : on la garde à la même hauteur image par image (elle
    // reste côte à côte avec le pilote), jusqu'à sa nouvelle voie.
    for (let index = 0; index < 150; index += 1) {
      once.distance = R.distance + 1.2;
      stepFrame();
    }
    check(once.lane === c && once.currentX === R.laneX(c) && once.impactChanging === false,
      `la voiture n'a pas fini de se ranger sur sa voie (x=${once.currentX.toFixed(3)})`);
    check(sideBumps().length === 1, 'un choc pendant que la voiture reste côte à côte', effects);
    tap(RIGHT); // le pilote prend la voie libérée, la voiture est deux voies à droite
    check(R.lane === b, `le pilote n'a pas pris la voie libérée (${R.lane})`);
    tap(RIGHT); // la voiture est toujours à côté : pas de second choc
    check(sideBumps().length === 1, `un second choc sur la même voiture côte à côte (${sideBumps().length})`, sideBumps());
    check(R.health === healthAfterBump, 'le second appui a coûté un carré');
    check(once.lane === c, 'la voiture a bougé pendant le même côte-à-côte');
    results.push('un seul choc par côte-à-côte, même avec la touche tenue');
  }

  // ── 3 bis. Même épisode quand la voiture a encore de la place : un second choc
  // n'a lieu qu'avec un nouveau côte-à-côte. Seuls les parcours à quatre voies
  // dans le même sens (le Ring) laissent une seconde poussée possible.
  if (F.length >= 4) {
    fresh(world);
    const R = world.harness;
    const car = ordinaryTraffic(R.trafficCars);
    parkOthers(world, new Set([car.id]));
    R.placeLane(F[0]);
    place(R, car, F[1], 1.2);
    tap(RIGHT);
    check(sideBumps().length === 1 && car.lane === F[2], 'premier choc attendu sur quatre voies', effects);
    for (let index = 0; index < 150; index += 1) {
      car.distance = R.distance + 1.2;
      stepFrame();
    }
    check(car.lane === F[2] && car.impactChanging === false, 'la voiture ne s\'est pas rangée sur sa voie');
    tap(RIGHT); // le pilote prend la voie libérée
    check(R.lane === F[1], `le pilote n'a pas pris la voie libérée (${R.lane})`);
    tap(RIGHT); // la voiture est encore à côté, avec une voie libre devant elle
    check(sideBumps().length === 1 && car.lane === F[2], `un second choc sur la même voiture côte à côte (${sideBumps().length})`, sideBumps());
    results.push('quatre voies : pas de second choc sur la voiture encore côte à côte');
  }

  // ── 4. Bord de la chaussée : pas de place, pas de choc, rien ne bouge
  {
    fresh(world);
    const H = world.harness;
    const car = ordinaryTraffic(H.trafficCars);
    parkOthers(world, new Set([car.id]));
    H.placeLane(F[F.length - 2]);
    place(H, car, F[F.length - 1], 1.2);
    const before = H.health;
    const lane = H.lane;
    tap(RIGHT);
    check(sideBumps().length === 0, 'un choc au bord de la chaussée', effects);
    check(H.lane === lane && car.lane === F[F.length - 1], 'le pilote ou la voiture ont bougé au bord de la chaussée');
    check(H.health === before, 'le bord de la chaussée a coûté un carré');
    results.push('bord de la chaussée : rien ne bouge');
  }

  // ── 5. Voie d'arrivée occupée derrière la voiture : pas de choc
  {
    fresh(world);
    const H = world.harness;
    const blocker = ordinaryTraffic(H.trafficCars);
    const occupant = ordinaryTraffic(H.trafficCars, [blocker]);
    check(occupant, 'pas de seconde voiture de trafic pour occuper la voie');
    parkOthers(world, new Set([blocker.id, occupant.id]));
    H.placeLane(a);
    place(H, blocker, b, 1.2);
    place(H, occupant, c, 3.2);
    const before = H.health;
    tap(RIGHT);
    check(sideBumps().length === 0, 'un choc alors que la voie d\'arrivée est occupée', effects);
    check(H.lane === a && blocker.lane === b && occupant.lane === c, 'une voiture a bougé sans place libre');
    check(H.health === before, 'la voie occupée a coûté un carré');
    results.push('voie d\'arrivée occupée : pas de choc');
  }

  // ── 6. Refus sans contact (4 m) : la voie reste fermée, pas de choc ; voie libre : rien
  {
    fresh(world);
    const H = world.harness;
    const car = ordinaryTraffic(H.trafficCars);
    parkOthers(world, new Set([car.id]));
    H.placeLane(a);
    place(H, car, b, CITY_RUSH_SIDE_CONTACT_GAP + 0.4);
    const before = H.health;
    tap(RIGHT);
    check(H.lane === a && sideBumps().length === 0 && H.health === before,
      'une voiture à 4 m a déclenché un choc ou laissé passer le pilote', { lane: H.lane, effects });
    // Voie libre : le pilote prend la voie, sans choc.
    place(H, car, b, 20);
    tap(RIGHT);
    check(H.lane === b && sideBumps().length === 0, 'une voie libre n\'a pas été prise sans choc');
    results.push('à 4 m : voie fermée sans choc ; voie libre : rien');
  }

  // ── 7. Rival : même choc, le rival perd un PV et le pilote un carré
  {
    fresh(race);
    const H = race.harness;
    const rival = H.racers.find((racer) => !racer.wrecked && racer.raceActive !== false);
    check(rival, 'aucun rival en course pour la mesure');
    parkOthers(race, new Set([rival.id]));
    H.placeLane(a);
    place(H, rival, b, 1.2);
    const before = H.health;
    const rivalBefore = rival.health;
    tap(RIGHT);
    const [bump] = sideBumps();
    check(sideBumps().length === 1 && bump.kind === 'racer' && bump.trafficId === rival.id, 'le rival n\'a pas été poussé', effects);
    check(rival.lane === c && rival.skidLeft > 0, 'le rival ne s\'est pas rabattu avec son dérapage');
    check(rival.health === rivalBefore - 1, `le rival doit perdre un PV (${rivalBefore} -> ${rival.health})`);
    check(H.health === before - 1, 'le pilote doit perdre un carré face au rival');
    results.push('rival : poussé, un PV pour lui, un carré pour le pilote');
  }

  // ── 8. Berline de l'escouade : poussée, un PV pour elle, un carré pour le pilote
  {
    fresh(race);
    const H = race.harness;
    const squad = H.policeCars[0];
    squad.active = true;
    squad.health = CITY_RUSH_POLICE_HEALTH;
    squad.collisionCooldownLeft = 0;
    squad.stunLeft = 0;
    parkOthers(race, new Set([squad.id]));
    H.placeLane(a);
    place(H, squad, b, 1.2);
    const before = H.health;
    tap(RIGHT);
    const [bump] = sideBumps();
    check(sideBumps().length === 1 && bump.kind === 'police' && bump.trafficId === squad.id, 'la berline de l\'escouade n\'a pas été poussée', effects);
    check(squad.lane === c, 'la berline de l\'escouade n\'a pas quitté sa voie');
    check(squad.health === CITY_RUSH_POLICE_HEALTH - 1, `la berline doit perdre un PV (${squad.health})`);
    check(H.health === before - 1, 'le pilote doit perdre un carré face à la berline');
    results.push('berline de l\'escouade : poussée, un PV pour elle, un carré pour le pilote');
  }

  // ── 9. Police de ronde : poussée, rejoint la poursuite, un PV
  {
    fresh(race);
    const H = race.harness;
    let patrol = H.trafficCars.find((car) => isCityRushPoliceTrafficType(car.type) && !car.rallied);
    if (!patrol) {
      // Pas de ronde dans ce tirage : une voiture ordinaire devient une berline de police.
      patrol = ordinaryTraffic(H.trafficCars);
      check(patrol, 'aucune voiture de trafic pour simuler une ronde');
      patrol.type = 'police';
      patrol.health = CITY_RUSH_POLICE_HEALTH;
    }
    parkOthers(race, new Set([patrol.id]));
    H.placeLane(a);
    place(H, patrol, b, 1.2);
    const ralliedBefore = H.ralliedCars.length;
    const before = H.health;
    tap(RIGHT);
    const [bump] = sideBumps();
    check(sideBumps().length === 1 && bump.kind === 'police-traffic', 'la ronde n\'a pas été poussée', effects);
    check(patrol.rallied === true && H.ralliedCars.length === ralliedBefore + 1, 'la ronde n\'a pas rejoint la poursuite');
    const rallied = H.ralliedCars[H.ralliedCars.length - 1];
    check(rallied.lane === c, 'la berline ralliée n\'est pas sur la voie d\'arrivée');
    check(rallied.health === CITY_RUSH_POLICE_HEALTH - 1, `la ronde doit perdre un PV (${rallied.health})`);
    check(H.wanted > 0, 'la poursuite n\'a pas été déclenchée');
    check(H.health === before - 1, 'le pilote doit perdre un carré face à la ronde');
    results.push('police de ronde : poussée, rejoint la poursuite, un PV');
  }

  // ── 10. Voiture venant en face : poussée vers le contresens extérieur
  // Certains décors n'ont pas de contresens ou pas de trafic venant en face : le
  // cas est alors ignoré, sans échec.
  const oncomingCase = O.length >= 2 && race.harness.oncomingCars.length > 0;
  if (oncomingCase) {
    fresh(race);
    const H = race.harness;
    const edge = O.includes(F[0] - 1) ? F[0] : F[F.length - 1];
    const toward = edge === F[0] ? -1 : 1;
    const target = edge + toward;
    const far = target + toward;
    check(O.includes(target) && O.includes(far), 'le contresens n\'a pas deux voies du côté du pilote', { edge, O });
    const oncoming = H.oncomingCars.find((car) => (
      !car.charge && !car.rallied && !car.destroyed && !car.turnaroundState && !isCityRushPoliceTrafficType(car.type)
    ));
    if (oncoming) {
      parkOthers(race, new Set([oncoming.id]));
      H.placeLane(edge);
      place(H, oncoming, target, 1.2);
      const before = H.health;
      tap(toward < 0 ? LEFT : RIGHT);
      const [bump] = sideBumps();
      check(sideBumps().length === 1 && bump.kind === 'oncoming' && bump.trafficId === oncoming.id, 'la voiture venant en face n\'a pas été poussée', effects);
      check(oncoming.lane === far, `la voiture venant en face n'est pas sur la voie opposée au pilote (${oncoming.lane})`);
      check(oncoming.health === null, 'la voiture venant en face ne doit pas avoir de PV');
      check(H.health === before - 1, 'le pilote doit perdre un carré face à une voiture venant en face');
      results.push('voiture venant en face : poussée, aucun PV pour elle');
    } else {
      results.push('pas de voiture venant en face sur ce parcours : cas ignoré');
    }
  } else {
    results.push('contresens absent ou sans trafic sur ce parcours : cas ignoré');
  }

  console.log(`[${city.id}] OK — ${results.length} comportements vérifiés :`);
  for (const line of results) console.log(`  · ${line}`);
}
console.log('VÉRIF CHOC LATÉRAL OK');
process.exit(0);
