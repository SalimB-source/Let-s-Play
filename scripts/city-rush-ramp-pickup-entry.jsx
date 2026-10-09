// Vérif d'intégration Vice City Rush : le fusil à pompe bleu se pose sur les
// tremplins et nulle part ailleurs. Le monde 3D est construit pour de vrai (faux
// WebGLRenderer), et le harnais contrôle image par image :
//   · aucun bonus bleu dans les rangées de la route, dans aucun mode ;
//   · en course : des tremplins portent du bleu, le pilote en ramasse, et chaque
//     bleu ramassé disparaît au passage de son tremplin, à sa distance, pour
//     entrer dans l'emplacement du fusil à pompe ;
//   · en Sprint, en course sans armes et en tutoriel : aucun bleu n'apparaît.
//   node scripts/city-rush-ramp-pickup-check.mjs            (vice-city)
//   node scripts/city-rush-ramp-pickup-check.mjs --all      (5 villes)

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

const THREE = await import('three');
const { createCityRushWorld } = await import('../src/games/ViceCityWorld.jsx');
const {
  CITY_RUSH_CITIES, CITY_RUSH_CARS, CITY_RUSH_LAPS, CITY_RUSH_LANE_X,
  CITY_RUSH_POWER_RULES, CITY_RUSH_POWERS, CITY_RUSH_PICKUPS,
  CITY_RUSH_POLICE_COUNT,
  selectCityRushRacers,
} = await import('../src/games/cityRushRules.js');

const BASE_SEED = Number(process.env.CITY_RUSH_WEAPONS_SEED || process.env.CITY_RUSH_BLUE_SHOT_SEED || 20261004) >>> 0;
let seed = BASE_SEED;
Math.random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const fail = (msg, extra) => { console.error('ÉCHEC :', msg, extra ?? ''); process.exit(3); };
const FRAME_MS = 1000 / 30;
const stepFrame = () => {
  const q = [...rafQueue.values()];
  rafQueue.clear();
  virtualNow += FRAME_MS;
  for (const cb of q) cb(virtualNow);
};

const AUDIO_METHODS = [
  'engine', 'gunshot', 'machineGun', 'skid', 'missileLaunch', 'explosion', 'helicopterStart',
  'helicopterStop', 'pickup', 'boost', 'lap', 'finish', 'countdownBeep', 'passby',
  'policeSiren', 'policeSirenOff', 'garageRepair',
];

const { CITY_RUSH_RAMP_COUNT, CITY_RUSH_SCROLL_SCALE, CITY_RUSH_SHOTGUN_AMMO_PER_PICKUP } = await import('../src/games/cityRushRules.js');

// Position de la voiture dans la scène (`PLAYER_Z` dans ViceCityWorld.jsx) : un
// tremplin qui passe sous elle a `(PLAYER_Z - z) / SCALE` mètres d'écart.
const PLAYER_Z = 3.1;
const SHOTGUN = CITY_RUSH_POWERS.SHOTGUN;
const PISTOL = CITY_RUSH_POWERS.PISTOL;
const RACE_LAPS = 3;
const cityArg = process.argv.find((arg) => arg.startsWith('--city='))?.slice(7);
const all = process.argv.includes('--all') || process.env.CITY_RUSH_RAMP_PICKUP_ALL === '1';
const cities = all
  ? CITY_RUSH_CITIES
  : [CITY_RUSH_CITIES.find((city) => city.id === (cityArg || 'vice-city')) || CITY_RUSH_CITIES[0]];

const MODES = [
  // Course normale : le pilote va chercher les bleus sur les tremplins.
  { id: 'course', raceFormat: 'laps', storyRules: null, tutorialMode: false, blueAllowed: true, maxFrames: 30 * 420 },
  // Sprint : solo contre la montre, aucune arme sur la route.
  { id: 'sprint', raceFormat: 'sprint', storyRules: null, tutorialMode: false, blueAllowed: false, maxFrames: 30 * 300 },
  // Course sans armes (tournoi, chapitre sans armes) : pas de bleu.
  { id: 'sans-armes', raceFormat: 'laps', storyRules: { weaponsEnabled: false, policeEnabled: false }, tutorialMode: false, blueAllowed: false, maxFrames: 30 * 420 },
  // Entraînement guidé : aucune leçon ne reçoit de bleu.
  { id: 'tutoriel', raceFormat: 'laps', storyRules: null, tutorialMode: true, blueAllowed: false, maxFrames: 30 * 240 },
];

const laneOfX = (x) => {
  let lane = 0;
  let closest = Infinity;
  CITY_RUSH_LANE_X.forEach((laneX, index) => {
    const delta = Math.abs(laneX - x);
    if (delta < closest) { closest = delta; lane = index; }
  });
  return lane;
};

function runRace(city, car, mode, runIndex, cityIndex, modeIndex) {
  seed = (BASE_SEED + runIndex * 7919 + cityIndex * 104729 + modeIndex * 15485863) >>> 0;
  const callbacks = { errors: [], huds: [], pickups: [], finish: null };
  const audioCalls = {};
  const audioStub = {};
  for (const name of AUDIO_METHODS) audioStub[name] = () => { audioCalls[name] = (audioCalls[name] || 0) + 1; };
  const mount = {
    clientWidth: 1280, clientHeight: 720,
    getBoundingClientRect: () => ({ width: 1280, height: 720, top: 0, left: 0 }),
    appendChild() {}, removeChild() {}, addEventListener() {}, removeEventListener() {},
    ownerDocument: globalThis.document,
    querySelector: () => null,
    classList: { add() {}, remove() {} },
    style: {},
  };
  const roster = selectCityRushRacers({ cityId: city.id, carId: car.id, runId: runIndex, playerDriverId: 'camila' });
  const world = createCityRushWorld(mount, city, () => ({
    error: (error) => { callbacks.errors.push(error); console.error('CALLBACK ERROR:', error); },
    hud: (hud) => { callbacks.huds.push(hud); },
    finish: (result) => { callbacks.finish = result; },
    pickup: (pickup) => { callbacks.pickups.push(pickup); },
  }), car.id, { current: audioStub }, roster, RACE_LAPS, false, mode.raceFormat, mode.storyRules, mode.tutorialMode);

  const tag = `[${city.id}] ${mode.id}`;
  // Les emplacements sont des objets persistants : on les repère une fois. Ceux
  // des rangées n'ont pas de tremplin pour parent ; ceux des tremplins, si.
  const rampSlots = [];
  const rowSlots = [];
  world.scene.traverse((object) => {
    if (object.userData?.kind !== 'city-rush-pickup') return;
    (object.parent?.name === 'city-rush-ramp' ? rampSlots : rowSlots).push(object);
  });
  if (rampSlots.length !== CITY_RUSH_RAMP_COUNT) {
    fail(`${tag} : ${rampSlots.length} emplacements de bonus sur les tremplins, ${CITY_RUSH_RAMP_COUNT} attendus`);
  }
  const pickupSlots = [...rowSlots, ...rampSlots];
  const gapOf = (slot) => (PLAYER_Z - slot.parent.position.z) / CITY_RUSH_SCROLL_SCALE;

  const runFrames = (count, label) => {
    for (let frame = 0; frame < count; frame += 1) {
      try { stepFrame(); } catch (error) {
        console.error(`${tag} : image (${label}) en erreur :`);
        console.error(error);
        process.exit(1);
      }
    }
  };
  const startRace = () => {
    world.reset();
    world.setPhase('countdown');
    for (const count of [3, 2, 1]) { world.setCountdown(count); runFrames(8, `compte ${count}`); }
    world.setCountdown(0);
    runFrames(8, 'départ');
    world.setPhase('playing');
    world.start();
  };

  world.setPhase('intro');
  runFrames(12, 'intro');
  startRace();
  // Le départ reste sans bleu : les tremplins posés devant la grille n'en portent pas.
  const startCarriers = rampSlots.filter((slot) => slot.visible);
  if (startCarriers.length) fail(`${tag} : un tremplin du départ porte un bleu`, { ecarts: startCarriers.map(gapOf) });

  const wasVisible = new Map();
  let blueCarriers = 0;
  let blueCollected = 0;
  let pickupsSeen = 0;
  const checkFrame = () => {
    // Jamais de bleu sur la route, visible ou non.
    for (const slot of rowSlots) {
      if (slot.userData.type === SHOTGUN) fail(`${tag} : un bonus bleu est posé sur la route`, { ecart: gapOf(slot) });
    }
    const vanished = [];
    for (const slot of rampSlots) {
      const now = slot.visible;
      if (now && slot.userData.type !== SHOTGUN) fail(`${tag} : un bonus visible sur un tremplin n'est pas bleu`, { type: slot.userData.type });
      if (now && wasVisible.get(slot) !== true) blueCarriers += 1;
      if (!now && wasVisible.get(slot) === true) vanished.push(slot);
      wasVisible.set(slot, now);
    }
    const fresh = callbacks.pickups.slice(pickupsSeen);
    pickupsSeen = callbacks.pickups.length;
    for (const pickup of fresh) {
      if (pickup.type !== SHOTGUN) continue;
      // Le bleu part avec le tremplin qu'on vient de franchir, à sa distance.
      const taken = vanished.find((slot) => Math.abs(gapOf(slot)) <= 2.6);
      if (!taken) fail(`${tag} : un bleu ramassé sans être passé sur son tremplin`, { ecarts: vanished.map(gapOf) });
      if (pickup.progress !== CITY_RUSH_SHOTGUN_AMMO_PER_PICKUP || pickup.ready !== true) {
        fail(`${tag} : le fusil à pompe ne charge pas ${CITY_RUSH_SHOTGUN_AMMO_PER_PICKUP} cartouches`, pickup);
      }
      blueCollected += 1;
    }
  };

  let frames = 0;
  let steeringCooldown = 0;
  const slotWorld = new THREE.Vector3();
  // Le pilote d'essai vise le bleu d'abord (course seulement), puis le rouge,
  // puis le turbo ; il ne tire que lorsqu'il tient un pistolet.
  const rank = (type) => (type === SHOTGUN ? 0 : type === PISTOL ? 1 : 2);
  const wanted = mode.blueAllowed ? [CITY_RUSH_PICKUPS.BOOST, PISTOL, SHOTGUN] : [CITY_RUSH_PICKUPS.BOOST, PISTOL];
  while (!callbacks.finish && frames < mode.maxFrames) {
    const hud = callbacks.huds.at(-1);
    if (hud && (hud.inventory?.[PISTOL] || 0) > 0) {
      world.action(PISTOL);
    } else if (hud && steeringCooldown <= 0) {
      let best = null;
      for (const slot of pickupSlots) {
        if (!slot.visible || !wanted.includes(slot.userData.type)) continue;
        slot.getWorldPosition(slotWorld);
        const ahead = (PLAYER_Z - slotWorld.z) / CITY_RUSH_SCROLL_SCALE;
        if (ahead < 2 || ahead > 90) continue;
        const candidate = { ahead, lane: laneOfX(slotWorld.x), type: slot.userData.type };
        if (!best || rank(candidate.type) < rank(best.type)
          || (rank(candidate.type) === rank(best.type) && candidate.ahead < best.ahead)) best = candidate;
      }
      if (best && best.lane !== hud.playerLane) {
        world.action(best.lane < hud.playerLane ? 'left' : 'right');
        steeringCooldown = 10;
      }
    }
    steeringCooldown = Math.max(0, steeringCooldown - 1);
    runFrames(1, `course, image ${frames}`);
    frames += 1;
    checkFrame();
  }

  if (callbacks.errors.length) fail(`${tag} : erreurs remontées`, callbacks.errors);
  if (mode.id === 'course' && !callbacks.finish) fail(`${tag} : arrivée jamais atteinte après ${frames} images`);
  if (!mode.blueAllowed && (blueCarriers > 0 || blueCollected > 0)) {
    fail(`${tag} : du bleu est apparu sur un tremplin alors que ce mode n'a pas d'armes`, { blueCarriers, blueCollected });
  }
  // Par course, seuls les invariants exacts ; la part des bleus posés et ramassés
  // se somme sur toutes les courses (le pilote d'essai ne vise pas toujours juste).
  totals.carriers += blueCarriers;
  totals.collected += blueCollected;

  console.log(`${tag} OK · ${frames} images · ${blueCarriers} tremplin(s) bleu(s) posé(s) · ${blueCollected} bleu(s) ramassé(s) au passage · aucun bleu sur la route`);
  world.destroy();
  return { blueCarriers, blueCollected };
}

const totals = { carriers: 0, collected: 0 };
for (const [cityIndex, city] of cities.entries()) {
  for (const [modeIndex, mode] of MODES.entries()) {
    const car = CITY_RUSH_CARS[(cityIndex + modeIndex) % CITY_RUSH_CARS.length];
    runRace(city, car, mode, 0, cityIndex, modeIndex);
  }
}
if (totals.carriers === 0) fail('aucun tremplin ne porte de bleu dans les courses');
if (totals.collected === 0) fail("le pilote n'a ramassé aucun bleu sur ses tremplins");
console.log(`VÉRIF BLEU SUR TREMPLINS OK — ${cities.length} ville(s) × ${MODES.length} mode(s) · ${totals.carriers} bleu(s) posé(s), ${totals.collected} ramassé(s) au passage`);
