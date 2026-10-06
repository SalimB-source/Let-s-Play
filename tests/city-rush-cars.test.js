import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

// Les plaques utilisent CanvasTexture ; ce contexte muet laisse les modèles 3D
// se construire en Node sans navigateur ni WebGL.
const mute = new Proxy(function mute() {}, {
  get: (_target, key) => (key === Symbol.toPrimitive ? () => 0 : mute),
  apply: () => mute,
  set: () => true,
});
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? { width: 0, height: 0, getContext: () => mute, style: {} } : {}),
};

const { animateRacerCar, makeRacerCar, makeTrafficVehicle, setRacerDriver } = await import('../src/games/cityRushCars.js');
const { CITY_RUSH_CARS, CITY_RUSH_DRIVERS, selectCityRushRacers } = await import('../src/games/cityRushRules.js');
const ROSTER = selectCityRushRacers({ cityId: 'vice-city', carId: CITY_RUSH_CARS[0].id, runId: 0 });

function countMeshes(root) {
  let count = 0;
  root.traverse((object) => { if (object.isMesh) count += 1; });
  return count;
}

function shellOf(car) {
  const shell = car.userData.body.getObjectByName(`${car.userData.profileId}-coachwork-shell`);
  assert.ok(shell?.isMesh, `${car.userData.profileId} possède une coque 3D sculptée`);
  return shell;
}

function geometrySignature(geometry) {
  return Array.from(geometry.attributes.position.array, (value) => Math.round(value * 1000)).join(',');
}

test('les voitures ont des coques fermées distinctes et des vitrages opaques', () => {
  const signatures = new Set();
  const expectedWheels = ['eight-hole', 'classic-five', 'eight-hole', 'split-five', 'classic-five', 'split-five', 'wire', 'turbofan', 'split-five', 'eight-hole', 'turbofan'];

  CITY_RUSH_CARS.forEach((profile, index) => {
    const car = makeRacerCar(profile, { player: index === 0, number: index + 1, driver: ROSTER[0] });
    const shell = shellOf(car);
    const signature = geometrySignature(shell.geometry);
    assert.equal(signatures.has(signature), false, `${profile.name} ne réutilise pas la silhouette d'une autre voiture`);
    signatures.add(signature);
    assert.ok(shell.geometry.attributes.position.count >= 150, `${profile.name} possède une coque longitudinale détaillée`);
    assert.equal(car.userData.archetype, profile.archetype);
    assert.equal(car.userData.wheelStyle, expectedWheels[index]);
    assert.equal(car.userData.wheels.length, 4);
    assert.equal(car.userData.frontWheels.length, 2);

    const glass = car.userData.body.getObjectByName(`${profile.id}-dark-glazing`);
    assert.ok(glass?.isMesh, `${profile.name} a son pare-brise et ses vitres latérales`);
    assert.equal(glass.material.transparent, false, 'le vitrage fumé masque complètement l’habitacle');
    assert.equal(glass.material.side, THREE.DoubleSide, 'les vitres se lisent depuis les deux côtés');
    assert.ok(glass.geometry.attributes.position.count >= 24, `${profile.name} a un ensemble de vitres segmenté`);
    assert.equal(car.userData.driverId, ROSTER[0].driverId, 'le pilote reste disponible pour le classement');
  });

  assert.equal(signatures.size, CITY_RUSH_CARS.length, 'chaque miniature correspond à une forme 3D différente');
});

test('la flotte de police comprend une berline et un SUV haut perché', () => {
  const sedan = makeTrafficVehicle('police');
  const suv = makeTrafficVehicle('police-suv');
  const sedanBounds = new THREE.Box3().setFromObject(sedan);
  const suvBounds = new THREE.Box3().setFromObject(suv);

  assert.equal(sedan.userData.trafficType, 'police');
  assert.equal(sedan.userData.isPoliceSUV, false);
  assert.equal(suv.userData.trafficType, 'police-suv');
  assert.equal(suv.userData.isPoliceSUV, true);
  assert.ok(suv.userData.width > sedan.userData.width, 'le SUV a une carrosserie plus large');
  assert.ok(suv.userData.length > sedan.userData.length, 'le SUV a un empattement plus long');
  assert.ok(suvBounds.max.y > sedanBounds.max.y + 0.2, 'le toit du SUV est visiblement plus haut que celui de la berline');
  assert.equal(suv.userData.wheels.length, 4);
  assert.equal(suv.userData.beacons.length, 6, 'rampe LED, calandre et lunette arrière');
  assert.equal(sedan.userData.beacons.length, 2, 'les gyrophares des berlines sont inchangés');
  assert.ok(countMeshes(suv) <= 22, 'les détails restent fusionnés pour limiter les appels de rendu');
  suv.traverse((object) => {
    if (!object.isMesh) return;
    assert.ok(Array.from(object.geometry.attributes.position.array).every(Number.isFinite), 'géométrie finie');
  });
});

test('la berline de police banalisée ne montre ni gyrophare ni marquage', () => {
  const unmarked = makeTrafficVehicle('undercover-police');
  assert.equal(unmarked.userData.trafficType, 'undercover-police');
  assert.equal(unmarked.userData.isPolice, true, 'la simulation la reconnaît comme police');
  assert.equal(unmarked.userData.isUndercoverPolice, true);
  assert.equal(unmarked.userData.beacons.length, 0, 'aucun gyrophare n’est visible');
  const visibleNames = [];
  unmarked.traverse((object) => { if (object.isMesh) visibleNames.push(object.name); });
  assert.ok(!visibleNames.some((name) => /decal|beacon|lightbar|police-mark/i.test(name)),
    'aucun élément de marquage policier n’est dans le modèle');
});

test('les coupés ne contiennent aucun personnage, même quand un pilote est assigné', () => {
  for (const profile of CITY_RUSH_CARS) {
    const driver = CITY_RUSH_DRIVERS[0];
    const car = makeRacerCar(profile, { player: true, number: 1, driver });
    const characterMeshes = [];
    car.traverse((object) => {
      if (object.isMesh && /driver|face|helmet|torso|forearm|avatar/i.test(object.name)) characterMeshes.push(object.name);
    });
    assert.deepEqual(characterMeshes, [], `${profile.name} ne montre pas le personnage`);
    assert.equal(car.userData.driverId, driver.id, 'l’identité reste associée à la voiture pour le HUD');
    assert.equal(car.userData.headPivot, undefined);
    assert.equal(car.userData.driverArms, undefined);
    assert.equal(car.userData.driverParts, undefined);
  }
});

test('un changement de pilote actualise le HUD sans rebâtir ni peupler la voiture', () => {
  const car = makeRacerCar(CITY_RUSH_CARS[0], { player: true, number: 1, driver: ROSTER[0] });
  const beforeMeshes = countMeshes(car);
  const beforeShell = shellOf(car);
  const camila = CITY_RUSH_DRIVERS.find((driver) => driver.id === 'camila');

  assert.equal(setRacerDriver(car, camila), true);
  assert.equal(car.userData.driverId, camila.id);
  assert.equal(countMeshes(car), beforeMeshes);
  assert.equal(shellOf(car), beforeShell, 'la carrosserie ne change pas lors du changement de pilote');
  assert.equal(setRacerDriver(car, camila), false, 'le même pilote ne déclenche pas de mise à jour inutile');
  assert.equal(setRacerDriver(car, ROSTER[0]), true, 'un slot du roster est reconnu par son driverId');
  assert.equal(car.userData.driverId, ROSTER[0].driverId);
  assert.equal(setRacerDriver(null, camila), false, 'un objet inconnu est ignoré');
});

test('roues, caisse, feux et turbo restent animés sans animation de personnage', () => {
  const car = makeRacerCar(CITY_RUSH_CARS[0], { player: true, number: 1, driver: ROSTER[0] });
  const initialWheelRotation = car.userData.wheels[0].rotation.x;
  animateRacerCar(car, {
    speed: 20, maxSpeed: 30, steer: 0.55, lateral: 0.6, boosting: true, braking: true,
  }, 0.2, 1.5);

  assert.ok(car.userData.wheels[0].rotation.x > initialWheelRotation, 'les roues tournent');
  assert.ok(Math.abs(car.userData.frontWheels[0].rotation.y) > 0.1, 'les roues avant braquent');
  assert.ok(Math.abs(car.userData.body.rotation.z) > 0.005, 'la coque prend du roulis');
  assert.ok(car.userData.boostFlames.every((flame) => flame.group.visible), 'les flammes restent liées au turbo');
  assert.equal(car.userData.materials.tailLight.color.getHex(), 0xff5a6a, 'les feux stop restent animés');
  assert.equal(car.userData.headPivot, undefined, 'aucune animation de tête n’existe');
});

test('chaque modèle reste dans un budget de rendu léger pour les rivales', () => {
  for (const [index, profile] of CITY_RUSH_CARS.entries()) {
    const car = makeRacerCar(profile, { player: index === 0, number: index + 1, driver: ROSTER[index % ROSTER.length] });
    const meshes = countMeshes(car);
    assert.ok(meshes <= 28, `${profile.name} utilise ${meshes} meshes (maximum 28)`);
  }
});
