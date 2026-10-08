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

const { animateRacerCar, applyPoliceRacerLivery, makeRacerCar, makeTrafficVehicle, setRacerDriver } = await import('../src/games/cityRushCars.js');
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
  // Jantes alignées sur les miniatures du garage : cinq branches pour la
// Kronos, jante filaire pour la Bavaria M-CS, jante aérée pour l'Atlas XR.
  const expectedWheels = ['aero-five', 'split-five', 'aero-five', 'split-five', 'classic-five', 'split-five', 'wire', 'turbofan', 'split-five', 'split-five', 'turbofan'];

  CITY_RUSH_CARS.forEach((profile, index) => {
    const car = makeRacerCar(profile, { player: index === 0, number: index + 1, driver: ROSTER[0] });
    const shell = shellOf(car);
    const signature = geometrySignature(shell.geometry);
    assert.equal(signatures.has(signature), false, `${profile.name} ne réutilise pas la silhouette d'une autre voiture`);
    signatures.add(signature);
    assert.ok(shell.geometry.attributes.position.count >= 400, `${profile.name} possède une coque longitudinale lissée et détaillée`);
    const headlights = car.userData.body.getObjectByName(`${profile.id}-modern-led-headlights`);
    const tailbar = car.userData.body.getObjectByName(`${profile.id}-modern-led-tailbar`);
    assert.ok(headlights?.isMesh, `${profile.name} reçoit une signature lumineuse LED moderne`);
    assert.ok(tailbar?.isMesh, `${profile.name} reçoit un bandeau LED arrière`);
    assert.ok(headlights.geometry.attributes.position.count >= 24);
    assert.ok(tailbar.geometry.attributes.position.count >= 24);
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
    car.traverse((object) => {
      if (!object.isMesh) return;
      assert.ok(Array.from(object.geometry.attributes.position.array).every(Number.isFinite), `${profile.name} garde une géométrie finie`);
    });
  });

  assert.equal(signatures.size, CITY_RUSH_CARS.length, 'chaque miniature correspond à une forme 3D différente');
});

test('la première voiture de mission devient un véritable intercepteur reconnaissable', () => {
  const car = makeRacerCar(CITY_RUSH_CARS.find((profile) => profile.id === 'city-hatch'), { player: true });
  assert.equal(applyPoliceRacerLivery(car), car);
  const livery = car.userData.policeLivery;
  assert.equal(livery.name, 'police-interceptor-livery');
  assert.equal(car.userData.materials.body.color.getHex(), 0xf3f2eb, 'la carrosserie passe en blanc police');
  assert.equal(car.userData.materials.trim.color.getHex(), 0x243b5a, 'les détails d’origine sont assortis au bleu marine');
  const labels = [];
  livery.traverse((object) => {
    if (object.isMesh && object.geometry.type === 'PlaneGeometry' && object.material.map) labels.push(object);
  });
  assert.equal(labels.length, 2, 'POLICE est marqué sur les deux portières');
  assert.equal(labels[0].material.map.colorSpace, THREE.SRGBColorSpace, 'le marquage canvas utilise le bon espace couleur');
  const beacon = livery.userData.beacons;
  animateRacerCar(car, { speed: 0 }, 1 / 30, 0.1);
  assert.equal(beacon.red.opacity, 1);
  assert.equal(beacon.blue.opacity, 0.14);
  animateRacerCar(car, { speed: 0 }, 1 / 30, 0.3);
  assert.equal(beacon.red.opacity, 0.14);
  assert.equal(beacon.blue.opacity, 1, 'les gyrophares alternent pendant la course');
  const childCount = livery.children.length;
  applyPoliceRacerLivery(car);
  assert.equal(livery.children.length, childCount, 'appliquer la livrée deux fois ne duplique pas ses pièces');
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

test('le taxi remplace la berline banalisée : voiture civile jaune, sans gyrophare', () => {
  const taxi = makeTrafficVehicle('taxi');
  assert.equal(taxi.userData.trafficType, 'taxi');
  assert.equal(taxi.userData.isTaxi, true);
  assert.equal(taxi.userData.isPolice, false, 'aucune patrouille ne se cache derrière un taxi');
  assert.equal(taxi.userData.isPoliceSUV, false);
  assert.equal(taxi.userData.beacons.length, 0, 'un taxi n’a ni gyrophare ni rampe');
  const colors = [];
  taxi.traverse((object) => { if (object.isMesh && object.material?.color) colors.push(object.material.color.getHex()); });
  assert.ok(colors.includes(0xf7c22c), 'la carrosserie jaune du taxi se lit');
  assert.ok(colors.includes(0x191a20), 'le damier et la lanterne reprennent le noir du taxi');
  assert.ok(taxi.userData.width > 0 && taxi.userData.length > 0, 'le taxi garde une empreinte de berline');
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

test('un choc de SUV fait violemment rebondir et tanguer la caisse', () => {
  const car = makeRacerCar(CITY_RUSH_CARS[0], { player: true, number: 1, driver: ROSTER[0] });
  const ordinaryImpactCar = makeRacerCar(CITY_RUSH_CARS[0], { player: true, number: 1, driver: ROSTER[0] });
  const impactFrame = 1 / 30;
  const impactTime = 0.04;
  animateRacerCar(car, { speed: 0, maxSpeed: 30, violentImpact: 1 }, impactFrame, impactTime);
  animateRacerCar(ordinaryImpactCar, { speed: 0, maxSpeed: 30 }, impactFrame, impactTime);

  assert.ok(Math.abs(car.userData.body.rotation.z) > Math.abs(ordinaryImpactCar.userData.body.rotation.z) + 0.08,
    'le choc renforcé impose un roulis nettement supérieur');
  assert.ok(Math.abs(car.userData.body.rotation.x) > Math.abs(ordinaryImpactCar.userData.body.rotation.x) + 0.03,
    'le choc renforce aussi le tangage');
  assert.ok(car.userData.body.position.y > ordinaryImpactCar.userData.body.position.y + 0.06,
    'la voiture rebondit sous la force du choc');
});

test('chaque modèle reste dans un budget de rendu léger pour les rivales', () => {
  for (const [index, profile] of CITY_RUSH_CARS.entries()) {
    const car = makeRacerCar(profile, { player: index === 0, number: index + 1, driver: ROSTER[index % ROSTER.length] });
    const meshes = countMeshes(car);
    assert.ok(meshes <= 28, `${profile.name} utilise ${meshes} meshes (maximum 28)`);
  }
});
