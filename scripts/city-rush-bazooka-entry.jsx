// Vérification d’intégration réelle des deux entrepôts de bazooka (30 % puis
// 65 % de la course, sur toutes les cartes) : ramassage du premier lot avant
// le garage de vie, épuisement, réapprovisionnement au second entrepôt, tir de
// bout en bout sur une poursuite du dernier tour et reset d’inventaire — avec
// un faux renderer WebGL (aucun GPU requis).
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
  cityRushBazookaTrackDistances,
  cityRushDriveSide,
  cityRushLaneConfig,
  cityRushRaceDistance,
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
const warehouses = [];
scene.traverse((object) => {
  if (object.name === 'city-rush-bazooka-warehouse') warehouses.push(object);
});
if (warehouses.length !== 2) fail('les deux entrepôts de bazooka manquent à la scène', { found: warehouses.length });
if (warehouses.some((warehouse) => warehouse.visible)) fail('les entrepôts ne doivent pas apparaître avant le départ');

// Deux entrepôts par course : 30 % puis 65 % du parcours, le premier avant le
// garage de vie de mi-course (50 %), le second après.
const totalDistance = cityRushRaceDistance(3);
const expectedDistances = cityRushBazookaTrackDistances({ laps: 3 });
if (expectedDistances.length !== 2) fail('deux entrepôts sont attendus par course', { expectedDistances });
if (expectedDistances[0] !== totalDistance * 0.3) fail('le premier entrepôt doit être à 30 % de la course', { expectedDistances, totalDistance });
if (expectedDistances[1] !== totalDistance * 0.65) fail('le second entrepôt doit être à 65 % de la course', { expectedDistances, totalDistance });
if (!(expectedDistances[0] < totalDistance * 0.5 && expectedDistances[1] > totalDistance * 0.5)) {
  fail('le premier entrepôt doit précéder le garage de vie (50 %), le second le suivre', { expectedDistances });
}

world.setPhase('playing');
world.start();
runFrames(1, 'démarrage');
const firstGap = hud()?.bazookaNextDistance;
if (!Number.isFinite(firstGap)) fail('la distance du prochain entrepôt n’est pas publiée au HUD', hud());
if (Math.abs(firstGap - expectedDistances[0]) > 2) {
  fail('le HUD annonce le premier entrepôt, à 30 % de la course', { firstGap, expectedDistances });
}
const garageGap = hud()?.miniGarageNextDistance;
if (!Number.isFinite(garageGap) || !(firstGap < garageGap)) {
  fail('le premier entrepôt doit être annoncé avant le garage de vie', { firstGap, garageGap });
}
// Les deux entrepôts sont ancrés à leur repère, dans l’ordre du parcours.
const byDistance = [...warehouses].sort((a, b) => a.userData.trackDistance - b.userData.trackDistance);
const pickupOffset = 6.1 / 0.72; // BAZOOKA_PICKUP_LOCAL_Z / SCALE
byDistance.forEach((warehouse, index) => {
  if (Math.abs(warehouse.userData.trackDistance - (expectedDistances[index] + pickupOffset)) > 0.5) {
    fail('un entrepôt n’est pas ancré à sa part de la course', {
      trackDistance: warehouse.userData.trackDistance,
      expected: expectedDistances[index] + pickupOffset,
      index,
    });
  }
});

let frame = 0;
const maxFrames = 12000;
// Ramasse le prochain entrepôt non pris : la voie extérieure est celle de
// l’entrée. On s’y place largement avant le hangar, et on réessaie si une
// voiture occupe momentanément la voie.
const collectNextWarehouse = (index) => {
  while (!callbacks.finish && frame < maxFrames) {
    const state = hud();
    if ((Number(state?.bazookaPickupsTaken) || 0) === index + 1) return Number(state.distance);
    const gap = Number(state?.bazookaNextDistance);
    const playerLane = Number(state?.playerLane);
    if (Number.isFinite(gap) && gap < 520 && gap > -8 && playerLane !== bazookaLane && frame % 6 === 0) {
      world.action(playerLane < bazookaLane ? 'right' : 'left');
    }
    if (Number.isFinite(gap) && gap < 460 && !byDistance[index].visible) {
      fail('l’entrepôt ne devient pas visible à l’approche', { gap, lap: state?.lap, index });
    }
    if (Number.isFinite(gap) && gap < -18) {
      fail('le pilote a dépassé l’entrepôt sans ramasser le bazooka', {
        gap,
        distance: state?.distance,
        lap: state?.lap,
        playerLane,
        bazookaLane,
        index,
      });
    }
    runFrames(1, `approche de l’entrepôt ${index + 1}`);
    frame += 1;
  }
  return null;
};

// ── Premier entrepôt : 30 % de la course, avant le garage de vie ────────────
const firstPickupDistance = collectNextWarehouse(0);
if (firstPickupDistance === null) fail('le premier ramassage de bazooka n’a pas eu lieu', { hud: hud(), frame, finish: callbacks.finish });
if (Math.abs(firstPickupDistance - expectedDistances[0]) > 30) {
  fail('le premier entrepôt n’est pas ramassé à 30 % de la course', { firstPickupDistance, expectedDistances });
}
if ((hud()?.lap || 0) < 2) fail('le premier entrepôt doit être atteint avant le dernier tour', hud());
if (hud()?.bazookaAmmo !== 2) fail('le premier entrepôt doit donner exactement deux tirs', hud());
if (hud()?.bazookaPickupsTaken !== 1 || hud()?.bazookaPickupsTotal !== 2) fail('le HUD doit compter un entrepôt ramassé sur deux', hud());
if (hud()?.bazookaPickupTaken) fail('le ramassage ne doit pas être définitif tant que le second entrepôt reste à traverser', hud());
if (byDistance[0].userData.pickup.visible) fail('le marqueur jaune du premier entrepôt doit disparaître après le ramassage');
if (!callbacks.effects.some((effect) => effect.type === 'bazooka-pickup' && effect.warehouse === 1)) {
  fail('l’événement du premier pickup bazooka manque', callbacks.effects.slice(-6));
}

// Le premier lot est vidé avant le second entrepôt : le prochain ramassage
// devra réapprovisionner les deux roquettes.
if (!world.action('bazooka')) fail('le premier tir du premier lot n’a pas été accepté', hud());
if (hud()?.bazookaAmmo !== 1) fail('le premier tir doit consommer exactement une roquette', hud());
if (!world.action('bazooka')) fail('le deuxième tir du premier lot n’a pas été accepté', hud());
if (hud()?.bazookaAmmo !== 0) fail('le deuxième tir doit vider le premier lot', hud());
if (world.action('bazooka')) fail('un troisième tir ne doit pas être possible sans roquette');
if (audioCalls.missileLaunch !== 2) fail('les deux tirs du premier lot doivent jouer leur son de lancement', audioCalls);

// ── Second entrepôt : 65 % de la course, après le garage de vie ───────────
const secondPickupDistance = collectNextWarehouse(1);
if (secondPickupDistance === null) fail('le second ramassage de bazooka n’a pas eu lieu', { hud: hud(), frame, finish: callbacks.finish });
if (Math.abs(secondPickupDistance - expectedDistances[1]) > 30) {
  fail('le second entrepôt n’est pas ramassé à 65 % de la course', { secondPickupDistance, expectedDistances });
}
if ((hud()?.lap || 0) < 3) fail('le second entrepôt doit être atteint au dernier tour', hud());
if (hud()?.bazookaAmmo !== 2) fail('le second entrepôt doit réapprovisionner les deux tirs', hud());
if (hud()?.bazookaPickupsTaken !== 2) fail('le HUD doit compter les deux entrepôts ramassés', hud());
if (!hud()?.bazookaPickupTaken) fail('les deux entrepôts ramassés doivent marquer le bazooka définitivement consommé', hud());
if (byDistance[1].userData.pickup.visible) fail('le marqueur jaune du second entrepôt doit disparaître après le ramassage');
if (callbacks.effects.filter((effect) => effect.type === 'bazooka-pickup').length !== 2) {
  fail('deux événements de pickup bazooka sont attendus', callbacks.effects.filter((effect) => effect.type === 'bazooka-pickup'));
}

// ── Tir de bout en bout sur une poursuite du dernier tour ─────────────────
// Le bazooka verrouille une patrouille sur la voie du joueur : on cherche
// d’abord une cible alignée, sinon on se rabat sur la voie d’une patrouille
// adjacente (le monde peut refuser le écart si la voie est encombrée).
let forwardPolice = null;
let playerLane = Number(hud()?.playerLane);
let aimFrame = 0;
while (!forwardPolice && !callbacks.finish && aimFrame < 1200) {
  const state = hud();
  playerLane = Number(state?.playerLane);
  forwardPolice = (state?.police || [])
    .filter((police) => police.rawDistance > world.distance + 2
      && police.rawDistance - world.distance < 120
      && police.lane === playerLane)
    .sort((a, b) => a.rawDistance - b.rawDistance)[0] || null;
  if (forwardPolice) break;
  const adjacent = (state?.police || [])
    .filter((police) => police.rawDistance > world.distance + 2
      && police.rawDistance - world.distance < 120
      && Math.abs(police.lane - playerLane) === 1)
    .sort((a, b) => a.rawDistance - b.rawDistance)[0] || null;
  if (adjacent) {
    world.action(adjacent.lane > playerLane ? 'right' : 'left');
    runFrames(1, 'rabattement sur la voie de la patrouille');
  } else {
    runFrames(1, 'recherche d’une patrouille à portée');
  }
  aimFrame += 1;
  frame += 1;
}
if (!forwardPolice) fail('aucune voiture de police à portée pour valider le tir de bout en bout', hud()?.police);
playerLane = Number(hud()?.playerLane);
if (forwardPolice.lane !== playerLane) {
  fail('la cible de police n’est pas sur la voie du joueur au moment du tir', { forwardPolice, playerLane });
}
const countProjectiles = () => {
  let count = 0;
  scene.traverse((object) => { if (object.name === 'city-rush-bazooka-projectile') count += 1; });
  return count;
};
const impactsBefore = callbacks.effects.filter((effect) => effect.type === 'bazooka-impact').length;
const projectilesBefore = countProjectiles();
const firstShot = world.action('bazooka');
if (!firstShot) fail('le tir du dernier tour n’a pas été accepté', hud());
if (hud()?.bazookaAmmo !== 1) fail('le premier tir doit consommer exactement une roquette', hud());
if (!callbacks.effects.some((effect) => effect.type === 'bazooka-fired' && effect.ammo === 1)) {
  fail('l’action monde n’a pas signalé le tir et le stock restant', callbacks.effects.slice(-6));
}
if (countProjectiles() !== projectilesBefore + 1) {
  fail('la roquette n’a pas été créée comme projectile droit', { found: countProjectiles(), projectilesBefore });
}
const firstFire = callbacks.effects.filter((effect) => effect.type === 'bazooka-fired').at(-1);
if (firstFire?.targetId !== forwardPolice.id) {
  fail('le bazooka n’a pas verrouillé la première patrouille visible de sa voie', { firstFire, expected: forwardPolice, playerLane });
}
// La voiture de police était devant le joueur : le projectile doit la croiser
// puis la détruire en un seul impact.
for (let step = 0; step < 90 && callbacks.effects.filter((effect) => effect.type === 'bazooka-impact').length === impactsBefore; step += 1) {
  runFrames(1, 'vol de la roquette');
}
const impact = callbacks.effects.filter((effect) => effect.type === 'bazooka-impact').at(-1);
if (!impact || callbacks.effects.filter((effect) => effect.type === 'bazooka-impact').length === impactsBefore) {
  fail('la roquette verrouillée n’a jamais déclenché son explosion', { firstFire, hud: hud() });
}
// Le balayage du projectile s’arrête sur le premier véhicule de la voie : en
// pleine poursuite, une patrouille peut se rabattre devant la cible verrouillée
// pendant le vol. L’impact doit quoi qu’il en soit détruire au moins une
// patrouille, et chaque destruction du souffle est créditée au bazooka.
if (!Array.isArray(impact.destroyed) || impact.destroyed.length < 2) {
  fail('le souffle de la roquette doit aussi détruire les voitures de police situées à côté', { firstFire, impact });
}
const bazookaKills = callbacks.effects.filter((effect) => effect.type === 'police-destroyed' && effect.source === 'bazooka');
if (!impact.destroyed.some((id) => bazookaKills.some((kill) => kill.id === id))) {
  fail('la destruction de police n’est pas créditée au tir bazooka', { firstFire, impact, bazookaKills });
}

if (hud()?.bazookaAmmo !== 1) fail('le stock doit rester à un tir après la première roquette', hud());
if (!world.action('bazooka')) fail('le deuxième tir n’a pas été accepté', hud());
if (hud()?.bazookaAmmo !== 0) fail('le deuxième tir doit vider le stock', hud());
if (world.action('bazooka')) fail('un troisième tir ne doit pas être possible');

const resetTaken = callbacks.effects.filter((effect) => effect.type === 'bazooka-pickup').length;
world.reset();
if (hud()?.bazookaAmmo !== 0 || hud()?.bazookaPickupTaken) fail('reset() doit réinitialiser les tirs et le ramassage', hud());
if ((Number(hud()?.bazookaPickupsTaken) || 0) !== 0) fail('reset() doit rendre les deux entrepôts à nouveau traversables', hud());
if (byDistance.some((warehouse) => !warehouse.userData.pickup.visible)) fail('reset() doit restaurer les marqueurs jaunes des deux entrepôts');
if (callbacks.effects.filter((effect) => effect.type === 'bazooka-pickup').length !== resetTaken) {
  fail('reset() ne doit pas ramasser automatiquement le bazooka');
}
if (audioCalls.missileLaunch !== 4) fail('les quatre tirs doivent jouer leur son de lancement', audioCalls);
if (callbacks.errors.length) fail('le monde a remonté une erreur', callbacks.errors);
world.destroy();

// ── Les huit cartes : deux hangars chacun, hors de la chaussée ───────────────
// Chaque parcours du jeu est construit une fois. Le hangar s'ouvre toujours sur
// l'**extérieur** du sens de course : à droite en conduite à droite, à gauche à
// Londres et sur la Shutō C1, où tout le bâtiment est reflété — sinon il
// s'étalerait sur les voies du contresens.
for (const course of CITY_RUSH_COURSES) {
  const laneConfig = cityRushLaneConfig(course);
  const leftHand = cityRushDriveSide(course) === 'left';
  const outward = leftHand ? -1 : 1;
  const pickupLane = leftHand ? laneConfig.forwardLanes[0] : laneConfig.forwardLanes.at(-1);
  const pickupLaneX = laneConfig.laneX(pickupLane);
  const courseWorld = createCityRushWorld(
    mount,
    course,
    () => ({ error: (error) => callbacks.errors.push(error) }),
    car.id,
    { current: audioStub },
    null,
    3,
    false,
  );
  const groups = [];
  courseWorld.scene.traverse((object) => {
    if (object.name === 'city-rush-bazooka-warehouse') groups.push(object);
  });
  if (groups.length !== 2) fail(`la carte ${course.name} doit poser deux entrepôts de bazooka`, { found: groups.length });
  for (const group of groups) {
    if (group.userData.side !== outward) {
      fail(`le hangar de ${course.name} doit se refléter selon le côté de conduite`, { side: group.userData.side, outward });
    }
    const marker = group.children.find((child) => child.name === 'city-rush-bazooka-pickup');
    if (!marker || marker.position.x !== pickupLaneX) {
      fail(`le marqueur de ${course.name} doit se tenir sur la voie extérieure`, { marker: marker?.position?.x, pickupLaneX });
    }
    const sign = group.children.find((child) => child.name === 'bazooka-warehouse-sign');
    const roof = group.children.find((child) => child.name === 'bazooka-warehouse-roof');
    if (!sign || sign.userData?.label !== 'BAZOOKA HERE' || !roof || !(sign.position.y > roof.position.y)) {
      fail(`la pancarte BAZOOKA HERE de ${course.name} doit surplomber le toit du garage`, {
        label: sign?.userData?.label,
        signY: sign?.position?.y,
        roofY: roof?.position?.y,
      });
    }
    const sideWall = group.children.find((child) => child.name === 'bazooka-warehouse-side-wall');
    if (!sideWall || Math.sign(sideWall.position.x) !== outward) {
      fail(`le hangar de ${course.name} doit s’étendre hors de la chaussée`, { wall: sideWall?.position?.x, outward });
    }
    // Le mur du fond ne mord pas sur la chaussée : la travée ouverte couvre la
    // voie de ramassage, jamais les voies du contresens.
    const wall = group.children.find((child) => child.name === 'bazooka-warehouse-front-right-wall');
    const wallInnerEdge = wall.position.x - outward * (wall.geometry.parameters.width / 2);
    if (outward * wallInnerEdge < outward * pickupLaneX) {
      fail(`la façade de ${course.name} doit rester de son côté de la chaussée`, { wallInnerEdge, pickupLaneX, outward });
    }
  }
  courseWorld.destroy();
}
if (callbacks.errors.length) fail('le monde a remonté une erreur', callbacks.errors);
console.log(`check:city-rush-bazooka ✓ — deux entrepôts (30 % / 65 % de la course) ramassés voie ${bazookaLane}, réapprovisionnement au second, 4 tirs, projectile droit, impact police intégré, reset par course (${frame} images, ${CITY_RUSH_COURSES.length} cartes vérifiées).`);
