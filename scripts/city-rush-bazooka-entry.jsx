// Vérification d'intégration réelle du pickup, du bouton d'action monde et du
// projectile du bazooka avec un faux renderer WebGL (aucun GPU requis).
const ctx2d = () => {
  const gradient = { addColorStop() {} };
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
    createLinearGradient() { return gradient; }, createRadialGradient() { return gradient; },
    createPattern() { return null; },
    measureText() { return { width: 10 }; },
    getImageData(x, y, width, height) { return { data: new Uint8ClampedArray(Math.max(1, width * height) * 4) }; },
    roundRect(x, y, width, height) { this.beginPath(); this.rect(x, y, width, height); },
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
  addEventListener(type, callback) { (listeners.window[type] ||= []).push(callback); },
  removeEventListener() {},
  location: { href: 'http://localhost/', origin: 'http://localhost' },
};
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? makeCanvas() : { style: {}, setAttribute() {}, appendChild() {}, remove() {}, addEventListener() {}, removeEventListener() {} }),
  createElementNS: (_namespace, tag) => globalThis.document.createElement(tag),
  addEventListener(type, callback) { (listeners.document[type] ||= []).push(callback); },
  removeEventListener() {},
  body: { appendChild() {}, removeChild() {}, style: {} },
  documentElement: { style: {} },
  hidden: false,
  visibilityState: 'visible',
};
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node-bazooka-smoke', maxTouchPoints: 0 }, configurable: true });
globalThis.self = globalThis;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

let rafQueue = new Map();
let rafId = 1;
let virtualNow = 0;
globalThis.requestAnimationFrame = (callback) => { const id = rafId++; rafQueue.set(id, callback); return id; };
globalThis.cancelAnimationFrame = (id) => { rafQueue.delete(id); };
Object.defineProperty(globalThis, 'performance', { value: { now: () => virtualNow }, configurable: true });

const THREE = await import('three');
const { createCityRushWorld } = await import('../src/games/ViceCityWorld.jsx');
const {
  CITY_RUSH_CARS,
  CITY_RUSH_COURSES,
  cityRushLaneConfig,
  selectCityRushRacers,
} = await import('../src/games/cityRushRules.js');

let seed = Number(process.env.CITY_RUSH_BAZOOKA_SEED || 20261007) >>> 0;
Math.random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

const fail = (message, extra) => {
  throw new Error(`${message}${extra === undefined ? '' : `\n${JSON.stringify(extra, null, 2)}`}`);
};
const FRAME_MS = 1000 / 30;
const stepFrame = () => {
  const queue = [...rafQueue.values()];
  rafQueue.clear();
  virtualNow += FRAME_MS;
  for (const callback of queue) callback(virtualNow);
};
const runFrames = (count, label) => {
  for (let frame = 0; frame < count; frame += 1) {
    try { stepFrame(); } catch (error) {
      console.error(`FRAME ${frame} (${label}) A LEVÉ :`);
      throw error;
    }
  }
};

const AUDIO_METHODS = [
  'engine', 'gunshot', 'machineGun', 'missileLaunch', 'skid', 'explosion', 'helicopterStart',
  'helicopterStop', 'pickup', 'boost', 'lap', 'finish', 'countdownBeep', 'passby',
  'policeSiren', 'policeSirenOff', 'garageRepair',
];
const audioCalls = {};
const audioStub = {};
for (const name of AUDIO_METHODS) audioStub[name] = () => { audioCalls[name] = (audioCalls[name] || 0) + 1; };
const callbacks = { errors: [], huds: [], effects: [], pickups: [], finish: null };
const mount = {
  clientWidth: 1280, clientHeight: 720,
  getBoundingClientRect: () => ({ width: 1280, height: 720, top: 0, left: 0 }),
  appendChild() {}, removeChild() {}, addEventListener() {}, removeEventListener() {},
  ownerDocument: globalThis.document,
  querySelector: () => null,
  classList: { add() {}, remove() {} },
  style: {},
};
const city = CITY_RUSH_COURSES.find((item) => item.id === 'vice-city');
const car = CITY_RUSH_CARS.find((item) => item.id === 'city-hatch') || CITY_RUSH_CARS[0];
const roster = selectCityRushRacers({ cityId: city.id, carId: car.id, runId: 7, playerDriverId: 'camila' });
const bazookaLane = cityRushLaneConfig(city).forwardLanes.at(-1);
const world = createCityRushWorld(
  mount,
  city,
  () => ({
    error: (error) => callbacks.errors.push(error),
    hud: (hud) => callbacks.huds.push(hud),
    finish: (result) => { callbacks.finish = result; },
    effect: (effect) => callbacks.effects.push(effect),
    pickup: (pickup) => callbacks.pickups.push(pickup),
  }),
  car.id,
  { current: audioStub },
  roster,
  3,
  false,
);
const scene = world.scene;
const hud = () => callbacks.huds.at(-1);
const warehouse = [];
scene.traverse((object) => {
  if (object.name === 'city-rush-bazooka-warehouse') warehouse.push(object);
});
if (warehouse.length !== 1) fail('l’entrepôt unique de Vice City manque à la scène', { found: warehouse.length });
if (warehouse[0].visible) fail('l’entrepôt ne doit pas apparaître avant le dernier tour');

world.setPhase('playing');
world.start();
const warehouseDistance = hud()?.bazookaWarehouseGap;
if (!Number.isFinite(warehouseDistance)) fail('la distance de l’entrepôt n’est pas publiée au HUD', hud());

let collectedAt = null;
let playerLane = null;
let frame = 0;
const maxFrames = 9000;
while (!callbacks.finish && frame < maxFrames) {
  const state = hud();
  const gap = Number(state?.bazookaWarehouseGap);
  playerLane = Number(state?.playerLane);
  // La voie extérieure est celle de l’entrée. On s’y place largement avant
  // le hangar, et on réessaie si une voiture occupe momentanément la voie.
  if (!state?.bazookaPickupTaken && Number.isFinite(gap) && gap < 520 && gap > -8
      && playerLane !== bazookaLane && frame % 6 === 0) {
    world.action(playerLane < bazookaLane ? 'right' : 'left');
  }
  if (!state?.bazookaPickupTaken && Number.isFinite(gap) && gap < 460 && !warehouse[0].visible) {
    fail('le hangar ne devient pas visible à l’approche du dernier tour', { gap, lap: state?.lap });
  }
  if (state?.bazookaPickupTaken) {
    collectedAt = state.distance;
    break;
  }
  if (Number.isFinite(gap) && gap < -18) {
    fail('le pilote a dépassé l’entrepôt sans ramasser le bazooka', {
      gap,
      distance: state?.distance,
      lap: state?.lap,
      playerLane,
      bazookaLane,
    });
  }
  runFrames(1, 'approche du hangar');
  frame += 1;
}
if (!collectedAt) fail('le ramassage du bazooka n’a pas eu lieu', { hud: hud(), frame, finish: callbacks.finish });
if (hud()?.bazookaAmmo !== 2) fail('le hangar doit donner exactement deux tirs', hud());
if (!hud()?.bazookaPickupTaken) fail('le pickup doit être marqué consommé après la traversée');
if (warehouse[0].userData.pickup.visible) fail('le marqueur jaune doit disparaître après le ramassage');
if (!callbacks.effects.some((effect) => effect.type === 'bazooka-pickup')) fail('l’événement du pickup bazooka manque');

const playerDistanceAtPickup = world.distance;
const laneAtPickup = Number(hud()?.playerLane);
const forwardPolice = (hud()?.police || [])
  .filter((police) => police.rawDistance > playerDistanceAtPickup + 2
    && police.rawDistance - playerDistanceAtPickup < 120
    && Math.abs(police.lane - laneAtPickup) <= 1)
  .sort((a, b) => a.rawDistance - b.rawDistance)[0];
if (!forwardPolice) fail('aucune voiture de police à portée pour valider le tir de bout en bout', hud()?.police);
if (forwardPolice.lane !== laneAtPickup) {
  if (Math.abs(forwardPolice.lane - laneAtPickup) !== 1) {
    fail('la cible de police n’est pas adjacente à la voie du pickup', { forwardPolice, laneAtPickup });
  }
  world.action(forwardPolice.lane > laneAtPickup ? 'right' : 'left');
}
const firstShot = world.action('bazooka');
if (!firstShot) fail('le premier tir disponible n’a pas été accepté', hud());
if (hud()?.bazookaAmmo !== 1) fail('le premier tir doit consommer exactement une roquette', hud());
if (!callbacks.effects.some((effect) => effect.type === 'bazooka-fired' && effect.ammo === 1)) {
  fail('l’action monde n’a pas signalé le tir et le stock restant', callbacks.effects.slice(-6));
}
const launchedShots = [];
scene.traverse((object) => {
  if (object.name === 'city-rush-bazooka-projectile') launchedShots.push(object);
});
if (launchedShots.length !== 1) fail('la roquette n’a pas été créée comme projectile droit', { found: launchedShots.length });

const firstFire = callbacks.effects.filter((effect) => effect.type === 'bazooka-fired').at(-1);
if (firstFire?.targetId !== forwardPolice.id) {
  fail('le bazooka n’a pas verrouillé la première patrouille visible de sa voie', { firstFire, expected: forwardPolice, laneAtPickup });
}
// La voiture de police était devant le joueur : le projectile doit la croiser
// puis la détruire en un seul impact.
for (let step = 0; step < 90 && !callbacks.effects.some((effect) => effect.type === 'bazooka-impact'); step += 1) {
  runFrames(1, 'vol de la roquette');
}
const impact = callbacks.effects.findLast((effect) => effect.type === 'bazooka-impact');
if (!impact) fail('la roquette verrouillée n’a jamais déclenché son explosion', { firstFire, hud: hud() });
if (!impact.destroyed?.includes(firstFire.targetId)) {
  fail('le premier véhicule de police touché n’a pas été détruit par le souffle', { firstFire, impact });
}
if (!callbacks.effects.some((effect) => effect.type === 'police-destroyed' && effect.id === firstFire.targetId && effect.source === 'bazooka')) {
  fail('la destruction de police n’est pas créditée au tir bazooka', { firstFire, impact });
}

if (hud()?.bazookaAmmo !== 1) fail('le stock doit rester à un tir après la première roquette', hud());
if (!world.action('bazooka')) fail('le deuxième tir n’a pas été accepté', hud());
if (hud()?.bazookaAmmo !== 0) fail('le deuxième tir doit vider le stock', hud());
if (world.action('bazooka')) fail('un troisième tir ne doit pas être possible');

const resetTaken = callbacks.effects.filter((effect) => effect.type === 'bazooka-pickup').length;
world.reset();
if (hud()?.bazookaAmmo !== 0 || hud()?.bazookaPickupTaken) fail('reset() doit réinitialiser les deux tirs et le ramassage', hud());
if (!warehouse[0].userData.pickup.visible) fail('reset() doit restaurer le marqueur unique de l’entrepôt');
if (callbacks.effects.filter((effect) => effect.type === 'bazooka-pickup').length !== resetTaken) {
  fail('reset() ne doit pas ramasser automatiquement le bazooka');
}
if (audioCalls.missileLaunch !== 2) fail('les deux tirs doivent jouer leur son de lancement', audioCalls);
if (callbacks.errors.length) fail('le monde a remonté une erreur', callbacks.errors);
world.destroy();
console.log(`check:city-rush-bazooka ✓ — entrepôt du dernier tour traversé voie ${bazookaLane}, 2 tirs, projectile droit, impact police intégré, reset par course (${frame} images).`);
