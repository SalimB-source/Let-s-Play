import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

// Les voitures peignent leurs plaques sur un canvas 2D : on fournit un contexte
// « muet » qui accepte tout (dégradés, texte, tracés) là où un navigateur
// donnerait un vrai contexte. Le modèle, lui, se teste sans navigateur.
const mute = new Proxy(function mute() {}, {
  get: (_target, key) => (key === Symbol.toPrimitive ? () => 0 : mute),
  apply: () => mute,
  set: () => true,
});
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? { width: 0, height: 0, getContext: () => mute, style: {} } : {}),
};

const { animateRacerCar, makeRacerCar, setRacerDriver } = await import('../src/games/cityRushCars.js');
const { CITY_RUSH_CARS, CITY_RUSH_DRIVERS, selectCityRushRacers } = await import('../src/games/cityRushRules.js');

const CAR = CITY_RUSH_CARS[0];
const ROSTER = selectCityRushRacers({ cityId: 'vice-city', carId: CAR.id, runId: 0 });

/** Toutes les couleurs de sommets d'un nœud (linéaires, comme three.js). */
function vertexTints(root) {
  const tints = [];
  root.traverse((object) => {
    if (!object.isMesh) return;
    const color = object.geometry?.attributes?.color;
    if (!color) return;
    for (let index = 0; index < color.count; index += 1) tints.push([color.getX(index), color.getY(index), color.getZ(index)]);
  });
  return tints;
}

function hasTint(tints, hex, tolerance = 0.02) {
  const target = new THREE.Color(hex);
  return tints.some(([r, g, b]) => Math.abs(r - target.r) < tolerance && Math.abs(g - target.g) < tolerance && Math.abs(b - target.b) < tolerance);
}

function headOf(car) {
  const head = car.userData.headPivot;
  assert.ok(head, 'le pilote a une tête animée');
  return head;
}

test('le cabriolet n’a plus de casque : le pilote montre son visage', () => {
  const car = makeRacerCar(CAR, { player: true, number: 1, driver: ROSTER[0] });
  let helmet = 0;
  let masks = 0;
  car.traverse((object) => {
    if (object.name === 'helmet') helmet += 1;
    if (object.name === 'visor') masks += 1;
  });
  assert.equal(helmet, 0, 'aucun lot « helmet » n’est construit');
  assert.equal(masks, 0, 'aucune visière de casque n’est construite');
  // La tête portée par le pilier du pilote est un vrai visage : peau, yeux,
  // sourcils, bouche et nez, tous peints par sommet.
  const head = headOf(car);
  const tints = vertexTints(head);
  assert.ok(tints.length > 400, `le visage est sculpté (${tints.length} sommets peints)`);
  for (const hex of [0xf5f1ea, 0x15111a, 0x6b3038]) {
    assert.ok(hasTint(tints, hex), `le visage porte la teinte 0x${hex.toString(16)}`);
  }
  // Un nez, une bouche et deux oreilles : des blocs de peau hors du crâne.
  const skinTints = tints.filter(([r, g, b]) => hasTint([[r, g, b]], ROSTER[0].avatar.skin, 0.03));
  assert.ok(skinTints.length > 200, 'la peau est la couleur de l’avatar du pilote');
});

test('chaque pilote du catalogue a sa propre tête dans le cockpit', () => {
  const signatures = new Map();
  for (const driver of CITY_RUSH_DRIVERS) {
    const car = makeRacerCar(CAR, { player: false, number: 2, driver });
    assert.equal(car.userData.driverId, driver.id, `${driver.displayName} pilote sa propre voiture`);
    const tints = vertexTints(headOf(car));
    assert.ok(hasTint(tints, driver.avatar.skin), `${driver.displayName} a la peau de son avatar`);
    const signature = `${driver.avatar.hairStyle}/${driver.avatar.accessory}/${tints.map((tint) => tint.map((value) => value.toFixed(3)).join(',')).join('|')}`;
    const twin = signatures.get(signature);
    assert.equal(twin, undefined, `${driver.displayName} ne partage pas sa tête avec ${twin}`);
    signatures.set(signature, driver.displayName);
    assert.equal(signatures.size <= CITY_RUSH_DRIVERS.length, true);
  }
  assert.equal(signatures.size, CITY_RUSH_DRIVERS.length, 'les douze pilotes ont douze têtes distinctes');
});

test('les cheveux suivent l’avatar, plus la couleur unique du héros', () => {
  const chloe = CITY_RUSH_DRIVERS.find((driver) => driver.id === 'chloe');
  const kwame = CITY_RUSH_DRIVERS.find((driver) => driver.id === 'kwame');
  const blonde = vertexTints(headOf(makeRacerCar(CAR, { player: true, number: 1, driver: chloe })));
  const black = vertexTints(headOf(makeRacerCar(CAR, { player: true, number: 1, driver: kwame })));
  assert.ok(hasTint(blonde, chloe.avatar.hair), 'Chloé garde ses cheveux blonds');
  assert.ok(hasTint(black, kwame.avatar.hair), 'Kwame garde ses cheveux noirs');
  // L'ancienne couleur unique du héros (0x17131c) ne peint plus la chevelure :
  // elle ne reste que sur les rares sommets sombres (pupilles, sourcils).
  const oldHero = blonde.filter(([r, g, b]) => hasTint([[r, g, b]], 0x17131c, 0.01)).length;
  assert.ok(oldHero < blonde.length * 0.05, `la chevelure n’est plus noire par défaut (${oldHero}/${blonde.length} sommets)`);
});

test('sans pilote, la voiture garde la peau de son modèle', () => {
  const solo = makeRacerCar(CAR, { player: false, number: 3 });
  const tints = vertexTints(headOf(solo));
  assert.ok(hasTint(tints, CAR.driverColor), 'repli sur `profile.driverColor`');
  assert.equal(solo.userData.driverId, null);
});

test('la tête et les bras du pilote sont animés (virage, choc, frappe)', () => {
  const car = makeRacerCar(CAR, { player: true, number: 1, driver: ROSTER[0] });
  const arms = car.userData.driverArms;
  assert.equal(arms.length, 2, 'deux bras tiennent le volant');
  assert.ok(arms[0].userData.rest && arms[1].userData.rest, 'chaque bras garde sa pose de repos');
  assert.equal(car.userData.driverColors ? true : false, true, 'la palette du pilote est exposée');
  // Virage : la tête regarde dans la courbe et les épaules suivent le volant.
  animateRacerCar(car, { speed: 20, maxSpeed: 30, steer: 1, dt: 0.5, elapsed: 1 }, 0.5, 1);
  assert.ok(headOf(car).rotation.y > 0.2, 'la tête tourne vers le virage');
  assert.ok(arms[0].rotation.z < arms[0].userData.rest.z && arms[1].rotation.z > arms[1].userData.rest.z,
    'une épaule avance, l’autre recule : les mains restent sur la jante');
  // Choc : le buste encaisse, la tête tremble, les mains se crispent sur la jante.
  const restX = arms[0].userData.rest.x;
  animateRacerCar(car, { speed: 4, maxSpeed: 30, steer: 0, impacting: true, dt: 0.5, elapsed: 2 }, 0.5, 2);
  assert.ok(arms[0].rotation.x > restX, 'les bras encaissent le choc');
  assert.ok(Math.abs(headOf(car).rotation.z) > 0.02, 'la tête est secouée');
  assert.ok(Math.abs(headOf(car).position.y - 1.535) < 0.05, 'la tête reste vissée sur le buste');
});

test('le volant porte un repère de sommet coloré et les gants sont dessus', () => {
  const car = makeRacerCar(CAR, { player: true, number: 1, driver: ROSTER[0] });
  const wheel = car.userData.steeringWheel;
  assert.ok(wheel, 'le volant est animé');
  let marker = 0;
  wheel.traverse((object) => { if (object.isMesh && object.material === car.userData.materials.trim) marker += 1; });
  assert.equal(marker, 1, 'un repère de sommet aux couleurs de la voiture');
  assert.equal(wheel.children.length, 5, 'jante, moyeu, deux branches et le repère');
  assert.ok(wheel.position.z < 0, 'le volant est devant le pilote');
  const head = headOf(car);
  assert.ok(head.position.z > wheel.position.z, 'le pilote regarde vers le volant');
});

test('le joueur peut changer de pilote au garage, le cockpit suit', () => {
  // Le roster nomme l'emplacement (`player`) et le conducteur (`driverId`) :
  // c'est le conducteur qui doit apparaître dans le cockpit.
  const car = makeRacerCar(CAR, { player: true, number: 1, driver: ROSTER[0] });
  assert.equal(car.userData.driverId, ROSTER[0].driverId);
  const before = {
    head: car.userData.headPivot,
    torso: car.userData.driverParts.torso,
    meshes: (() => { let n = 0; car.traverse((object) => { if (object.isMesh) n += 1; }); return n; })(),
  };
  const camila = CITY_RUSH_DRIVERS.find((driver) => driver.id === 'camila');
  assert.equal(setRacerDriver(car, camila), true, 'le cockpit est refait');
  assert.equal(car.userData.driverId, camila.id);
  assert.ok(hasTint(vertexTints(car.userData.headPivot), camila.avatar.hair), 'la nouvelle coiffure arrive');
  assert.equal(before.head.parent, null, 'l’ancienne tête est retirée de la voiture');
  assert.equal(before.torso.parent, null, 'l’ancien buste est retiré de la voiture');
  const after = (() => { let n = 0; car.traverse((object) => { if (object.isMesh) n += 1; }); return n; })();
  assert.equal(after, before.meshes, 'aucun mesh ne s’accumule au changement de pilote');
  assert.equal(setRacerDriver(car, camila), false, 'le même pilote ne rebâtit rien');
  assert.equal(setRacerDriver(car, ROSTER[0]), true);
  assert.equal(car.userData.driverId, ROSTER[0].driverId);
  assert.equal(setRacerDriver(car, ROSTER[0]), false, 'le même emplacement ne rebâtit rien non plus');
  assert.equal(setRacerDriver(null, camila), false, 'un objet inconnu est ignoré');
});

test('toutes les voitures gardent le même budget de rendu', () => {
  const counts = CITY_RUSH_CARS.map((profile, index) => {
    const car = makeRacerCar(profile, { player: index === 0, number: index + 1, driver: ROSTER[Math.min(index, ROSTER.length - 1)] });
    let meshes = 0;
    car.traverse((object) => { if (object.isMesh) meshes += 1; });
    return { id: profile.id, meshes };
  });
  for (const { id, meshes } of counts) {
    assert.ok(meshes <= 36, `${id} reste à ${meshes} meshes`);
  }
});
