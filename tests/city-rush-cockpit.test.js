import test from 'node:test';
import assert from 'node:assert/strict';

// Les plaques et le combiné utilisent des CanvasTexture : ce contexte muet
// laisse voitures et habitacle se construire en Node, sans navigateur.
const mute = new Proxy(function mute() {}, {
  get: (_target, key) => (key === Symbol.toPrimitive ? () => 0 : mute),
  apply: () => mute,
  set: () => true,
});
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? { width: 0, height: 0, getContext: () => mute, style: {} } : {}),
};

const THREE = await import('three');
const { CITY_RUSH_CARS, CITY_RUSH_COURSES } = await import('../src/games/cityRushRules.js');
const {
  applyPoliceRacerLivery,
  cityRushCabinMetrics,
  makeRacerCar,
  makeRacerHoodGeometry,
} = await import('../src/games/cityRushRacerModels.js');
const {
  CITY_RUSH_CAMERA_CHASE,
  CITY_RUSH_CAMERA_COCKPIT,
  CITY_RUSH_CAMERA_MODES,
  CITY_RUSH_CAMERA_PREF_KEY,
  CITY_RUSH_COCKPIT_EYE_ABOVE_COWL,
  CITY_RUSH_COCKPIT_EYE_BEHIND_COWL,
  CITY_RUSH_COCKPIT_FOV,
  CITY_RUSH_COCKPIT_PITCH,
  CITY_RUSH_COCKPIT_STEERING_MAX,
  CITY_RUSH_DEFAULT_CAMERA_MODE,
  cityRushCameraModeLabel,
  cityRushCockpitActive,
  cityRushCockpitLayout,
  cityRushCockpitNeedleAngle,
  cityRushCockpitRightHandDrive,
  cityRushCockpitRpm,
  cityRushCockpitSteeringAngle,
  makeCityRushCockpit,
  nextCityRushCameraMode,
  normalizeCityRushCameraMode,
} = await import('../src/games/cityRushCockpit.js');

const ARCHETYPES = [...new Set(CITY_RUSH_CARS.map((car) => car.archetype))];
const degrees = (radians) => (radians * 180) / Math.PI;
// Angle sous l'horizon (négatif = vers le bas) d'un point vu depuis l'œil.
const sightAngle = (eye, y, z) => degrees(Math.atan2(y - eye[1], eye[2] - z));
// Écran 16:9 au champ de la vue cockpit : bord bas de l'image, sous l'horizon.
const SCREEN_BOTTOM = degrees(CITY_RUSH_COCKPIT_PITCH) - CITY_RUSH_COCKPIT_FOV / 2;

test('la poursuite reste la vue par défaut ; toute valeur inconnue y retombe', () => {
  assert.equal(CITY_RUSH_DEFAULT_CAMERA_MODE, CITY_RUSH_CAMERA_CHASE);
  assert.deepEqual([...CITY_RUSH_CAMERA_MODES], ['chase', 'cockpit']);
  assert.equal(CITY_RUSH_CAMERA_PREF_KEY, 'letsplay_vice_city_rush_camera_v1');
  assert.equal(normalizeCityRushCameraMode('cockpit'), CITY_RUSH_CAMERA_COCKPIT);
  for (const value of ['chase', undefined, null, '', 'COCKPIT', 'first-person', 42, {}]) {
    assert.equal(normalizeCityRushCameraMode(value), CITY_RUSH_CAMERA_CHASE, `${String(value)} → poursuite`);
  }
  assert.equal(nextCityRushCameraMode('chase'), 'cockpit');
  assert.equal(nextCityRushCameraMode('cockpit'), 'chase');
  assert.equal(nextCityRushCameraMode('n’importe quoi'), 'cockpit', 'une préférence corrompue bascule depuis la poursuite');
  assert.equal(cityRushCameraModeLabel('cockpit'), 'COCKPIT');
  assert.equal(cityRushCameraModeLabel('chase'), 'POURSUITE');
});

test('la vue embarquée ne vit qu’au volant : compte à rebours et course, jamais sur l’épave', () => {
  assert.equal(cityRushCockpitActive({ mode: 'cockpit', phase: 'countdown' }), true);
  assert.equal(cityRushCockpitActive({ mode: 'cockpit', phase: 'playing' }), true);
  for (const phase of ['intro', 'finished', 'cinematic', 'paused', undefined]) {
    assert.equal(cityRushCockpitActive({ mode: 'cockpit', phase }), false, `pas de cockpit en phase ${phase}`);
  }
  assert.equal(cityRushCockpitActive({ mode: 'cockpit', phase: 'playing', wrecked: true }), false, 'la toupie de l’épave se regarde de l’extérieur');
  assert.equal(cityRushCockpitActive({ mode: 'chase', phase: 'playing' }), false);
  assert.equal(cityRushCockpitActive(), false);
});

test('le volant passe à droite là où l’on roule à gauche et au Japon', () => {
  const rightHand = CITY_RUSH_COURSES.filter((course) => cityRushCockpitRightHandDrive(course)).map((course) => course.id).sort();
  assert.deepEqual(rightHand, ['london', 'tokyo', 'touge']);
  assert.equal(cityRushCockpitRightHandDrive(null), false);
  assert.equal(cityRushCockpitRightHandDrive('london'), false, 'la règle attend une fiche de parcours');
});

test('chaque modèle a son habitacle : pilote à sa place, capot raccordé, volant sous la route', () => {
  assert.equal(ARCHETYPES.length, 12);
  for (const archetype of ARCHETYPES) {
    const cabin = cityRushCabinMetrics(archetype);
    const left = cityRushCockpitLayout(archetype);
    const right = cityRushCockpitLayout(archetype, { rightHandDrive: true });
    const [eyeX, eyeY, eyeZ] = left.eye;
    const label = archetype;

    // Pilote à gauche par défaut, à droite en conduite à gauche ; une cabine
    // est le miroir de l'autre.
    assert.equal(left.side, -1, label);
    assert.equal(right.side, 1, label);
    assert.ok(eyeX < 0 && right.eye[0] > 0, `${label} : le pilote change de côté`);
    assert.ok(Math.abs(eyeX + right.eye[0]) < 1e-9, `${label} : les deux cabines sont symétriques`);
    assert.equal(right.eye[1], eyeY);
    assert.equal(right.eye[2], eyeZ);
    assert.ok(Math.abs(eyeX) >= 0.3 && Math.abs(eyeX) <= 0.37, `${label} : le siège reste dans l'habitacle (${eyeX.toFixed(3)})`);
    assert.ok(left.cabinHalf - Math.abs(eyeX) >= 0.28, `${label} : l'épaule ne touche pas la portière`);
    assert.ok(left.cabinHalf < cabin.halfWidthAt(eyeZ), `${label} : l'habitacle tient dans la caisse`);

    // L'œil est derrière et au-dessus du pied du pare-brise du modèle.
    assert.equal(left.archetype, archetype);
    assert.ok(Math.abs(eyeZ - cabin.cowl.z - CITY_RUSH_COCKPIT_EYE_BEHIND_COWL) < 1e-9, label);
    assert.ok(Math.abs(eyeY - cabin.cowl.y - CITY_RUSH_COCKPIT_EYE_ABOVE_COWL) < 1e-9, label);
    // La planche de bord se pose au pied du pare-brise : le capot réel prend
    // le relais juste devant (coupe de la coque au même endroit).
    assert.equal(left.dash.frontZ, cabin.cowl.z, `${label} : planche au pied du pare-brise`);
    assert.ok(cabin.cowl.y - left.dash.frontY > 0 && cabin.cowl.y - left.dash.frontY <= 0.01, `${label} : planche à fleur du capot`);
    assert.ok(left.hoodCutZ > cabin.cowl.z && left.hoodCutZ - cabin.cowl.z <= 0.03, `${label} : capot coupé au pied du pare-brise`);
    // Le haut du pare-brise et le pavillon restent au-dessus de la tête.
    assert.ok(left.header.y - eyeY >= 0.15, `${label} : de la garde au toit`);
    assert.ok(left.header.z < eyeZ - 0.3, `${label} : le haut du pare-brise est devant le pilote`);

    // Ce que voit le pilote : la route au-dessus de la planche, le volant et
    // le combiné dessous, le moyeu au bas de l'image.
    const cowlLine = sightAngle(left.eye, cabin.cowl.y, cabin.cowl.z);
    const { wheel, cluster } = left;
    assert.equal(wheel.x, eyeX, `${label} : le volant est face au pilote`);
    assert.ok(wheel.z < eyeZ - 0.4 && wheel.y < eyeY - 0.25, `${label} : le volant est devant, à hauteur de poitrine`);
    const rimTop = sightAngle(left.eye, wheel.y + wheel.radius * Math.cos(wheel.tilt), wheel.z - wheel.radius * Math.sin(wheel.tilt));
    assert.ok(rimTop < cowlLine - 1, `${label} : le haut de la jante ne cache pas la route (${rimTop.toFixed(1)}° < ${cowlLine.toFixed(1)}°)`);
    const hub = sightAngle(left.eye, wheel.y, wheel.z);
    assert.ok(hub > SCREEN_BOTTOM - 2, `${label} : le moyeu reste au bas de l'image`);
    const clusterLine = sightAngle(left.eye, cluster.y, cluster.z);
    assert.ok(clusterLine < rimTop && clusterLine > hub, `${label} : le combiné se lit entre la jante et le moyeu`);
    assert.ok(cluster.tilt > 0.3 && cluster.tilt < 0.6, `${label} : le combiné regarde le pilote`);
    // Rétroviseur au centre, sous le haut du pare-brise.
    assert.equal(left.mirror.x, 0);
    assert.ok(left.mirror.y < left.header.y && left.mirror.y > eyeY, label);
  }
  assert.equal(cityRushCockpitLayout('inconnue').archetype, 'ferrari', 'un archétype inconnu retombe sur la berlinetta');
});

test('compte-tours : ralenti à l’arrêt, six rapports en dents de scie, limiteur sous turbo', () => {
  assert.equal(cityRushCockpitRpm(0, 35), 0.11);
  assert.equal(cityRushCockpitRpm(-5, 35), 0.11);
  assert.equal(cityRushCockpitRpm(Number.NaN, 35), 0.11);
  let previous = cityRushCockpitRpm(1, 35);
  let shifts = 0;
  for (let speed = 1.5; speed < 35; speed += 0.5) {
    const rpm = cityRushCockpitRpm(speed, 35);
    assert.ok(rpm >= 0.36 && rpm <= 0.86, `régime ${rpm} hors plage à ${speed} m/s`);
    if (rpm < previous - 0.2) shifts += 1;
    previous = rpm;
  }
  assert.equal(shifts, 5, 'cinq passages de rapport entre le départ et la pointe');
  assert.ok(cityRushCockpitRpm(35, 35) >= 0.86, 'à la pointe, l’aiguille touche la zone rouge');
  assert.ok(cityRushCockpitRpm(50, 35, true) <= 0.97, 'le turbo ne casse pas le compte-tours');
  assert.ok(cityRushCockpitRpm(20, 35, true) > cityRushCockpitRpm(20, 35, false), 'le turbo fait grimper le régime');
});

test('le volant braque vers la voie visée et contre-braque dans un drift', () => {
  assert.equal(cityRushCockpitSteeringAngle(0, 0), 0);
  assert.ok(cityRushCockpitSteeringAngle(0.34, 0) > 1, 'un écart à droite tourne franchement le volant à droite');
  assert.ok(cityRushCockpitSteeringAngle(-0.34, 0) < -1, 'et à gauche');
  // Drift du tōgé vers la gauche (la caisse pointe à gauche) : contre-braquage à droite.
  assert.ok(cityRushCockpitSteeringAngle(0, 0.3) > 0);
  assert.equal(cityRushCockpitSteeringAngle(5, 5), CITY_RUSH_COCKPIT_STEERING_MAX);
  assert.equal(cityRushCockpitSteeringAngle(-5, -5), -CITY_RUSH_COCKPIT_STEERING_MAX);
  assert.equal(cityRushCockpitSteeringAngle('x', undefined), 0);
});

test('les aiguilles balaient 270°, de bas à gauche à bas à droite', () => {
  assert.ok(Math.abs(cityRushCockpitNeedleAngle(0) - Math.PI * 0.75) < 1e-12);
  assert.ok(Math.abs(cityRushCockpitNeedleAngle(0.5)) < 1e-12, 'mi-course : aiguille à midi');
  assert.ok(Math.abs(cityRushCockpitNeedleAngle(1) + Math.PI * 0.75) < 1e-12);
  assert.equal(cityRushCockpitNeedleAngle(-1), cityRushCockpitNeedleAngle(0));
  assert.equal(cityRushCockpitNeedleAngle(4), cityRushCockpitNeedleAngle(1));
});

test('le capot vu du cockpit est la vraie coque, coupée au pied du pare-brise', () => {
  for (const profile of CITY_RUSH_CARS) {
    const car = makeRacerCar(profile, { player: true });
    const cabin = cityRushCabinMetrics(profile.archetype);
    const cutZ = cabin.cowl.z + 0.02;
    const hood = makeRacerHoodGeometry(car, cutZ);
    const position = hood.attributes.position;
    const index = hood.index.array;
    assert.ok(index.length >= 300, `${profile.name} : le capot garde ses facettes (${index.length / 3})`);
    let maxZ = -Infinity;
    let minZ = Infinity;
    let topNearCowl = -Infinity;
    for (const vertex of index) {
      const z = position.getZ(vertex);
      maxZ = Math.max(maxZ, z);
      minZ = Math.min(minZ, z);
      if (z > cabin.cowl.z - 0.25) topNearCowl = Math.max(topNearCowl, position.getY(vertex));
    }
    assert.ok(maxZ <= cutZ + 1e-6, `${profile.name} : rien derrière le pied du pare-brise`);
    assert.ok(minZ <= cabin.noseZ + 0.05, `${profile.name} : le capot va jusqu'au nez`);
    assert.ok(Math.abs(topNearCowl - cabin.cowl.y) < 0.1, `${profile.name} : le capot arrive à hauteur de la planche (${topNearCowl.toFixed(3)} / ${cabin.cowl.y})`);
    assert.ok(hood.attributes.normal, `${profile.name} : normales lissées de la coque conservées`);
  }
  assert.equal(makeRacerHoodGeometry(null, 0).index, null, 'sans coque, géométrie vide');
});

test('l’habitacle remplace la coque en vue cockpit, et la rend à la poursuite', () => {
  const profile = CITY_RUSH_CARS.find((car) => car.id === 'vice-roadster');
  // Joueur de nuit : les cônes de phares sont allumés en poursuite.
  const car = makeRacerCar(profile, { player: true, daylight: false });
  const { body, shell, details, headlightCones } = car.userData;
  assert.ok(shell?.isMesh && details?.isGroup, 'la voiture expose coque et détails à la vue cockpit');
  const childrenBefore = body.children.length;
  assert.equal(makeCityRushCockpit(null), null);
  assert.equal(makeCityRushCockpit({ userData: { kind: 'traffic' } }), null);

  const cockpit = makeCityRushCockpit(car, { accent: profile.accent, label: profile.name, weather: 'rain' });
  assert.ok(cockpit, 'habitacle construit');
  assert.equal(cockpit.group.parent, body, 'l’habitacle vit dans la caisse (roulis, tangage, rebonds)');
  assert.equal(cockpit.eye.parent, cockpit.group);
  assert.deepEqual(cockpit.eye.position.toArray(), cockpit.layout.eye);
  assert.equal(body.children.length, childrenBefore + 3, 'habitacle, capot et doublure d’ombre');
  assert.equal(cockpit.group.visible, false, 'construit éteint : la poursuite ne voit rien');
  assert.equal(cockpit.hood.visible, false);
  assert.equal(shell.visible, true);
  assert.ok(headlightCones.every((cone) => cone.visible), 'phares allumés en poursuite de nuit');

  let castsShadow = false;
  cockpit.group.traverse((object) => { if (object.isMesh && object.castShadow) castsShadow = true; });
  assert.equal(castsShadow, false, 'l’habitacle ne projette aucune ombre');
  assert.equal(cockpit.shadowProxy.castShadow, true, 'la doublure porte l’ombre de la voiture entière');
  assert.equal(cockpit.shadowProxy.geometry, shell.geometry);
  assert.equal(cockpit.shadowProxy.material.colorWrite, false, 'la doublure ne dessine rien');
  assert.equal(cockpit.shadowProxy.material.depthWrite, false);

  applyPoliceRacerLivery(car);
  cockpit.setActive(true);
  assert.equal(cockpit.active, true);
  assert.equal(cockpit.group.visible, true);
  assert.equal(cockpit.hood.visible, true);
  assert.equal(cockpit.shadowProxy.visible, true);
  assert.equal(shell.visible, false, 'la coque fermée s’efface');
  assert.equal(details.visible, false, 'vitrage opaque, feux et détails extérieurs s’effacent');
  assert.equal(car.userData.policeLivery.visible, false, 'la rampe de police ne traverse pas le pavillon');
  assert.ok(headlightCones.every((cone) => !cone.visible), 'pas de prisme de phares devant le pare-brise');

  cockpit.setActive(false);
  assert.equal(cockpit.group.visible, false);
  assert.equal(cockpit.hood.visible, false);
  assert.equal(cockpit.shadowProxy.visible, false);
  assert.equal(shell.visible, true);
  assert.equal(details.visible, true);
  assert.equal(car.userData.policeLivery.visible, true);
  assert.ok(headlightCones.every((cone) => cone.visible), 'les phares reviennent comme avant');
  assert.equal(body.children.length, childrenBefore + 4, 'les bascules n’ajoutent rien (la livrée mise à part)');
});

test('volant, aiguilles, témoins et essuie-glaces suivent la course', () => {
  const profile = CITY_RUSH_CARS.find((car) => car.id === 'city-hatch');
  const car = makeRacerCar(profile, { player: true });
  const cockpit = makeCityRushCockpit(car, { weather: 'rain' });
  const dt = 1 / 30;
  const run = (state, frames = 30, start = 0) => {
    for (let frame = 0; frame < frames; frame += 1) cockpit.update(state, dt, start + frame * dt);
  };

  run({ speed: 0, topSpeed: 30 });
  assert.ok(Math.abs(cockpit.steering.rotation.z) < 1e-6, 'volant droit à l’arrêt');
  const idleNeedle = cockpit.speedNeedle.rotation.z;
  assert.ok(Math.abs(idleNeedle - cityRushCockpitNeedleAngle(0)) < 1e-6, 'compteur à zéro');

  run({ speed: 30, topSpeed: 30, steer: 0.34 });
  assert.ok(cockpit.steering.rotation.z < -1, 'écart à droite : le volant tourne dans le sens horaire (vu du pilote)');
  assert.ok(cockpit.speedNeedle.rotation.z < idleNeedle - 1, 'l’aiguille du compteur monte avec la vitesse');
  run({ speed: 30, topSpeed: 30, steer: -0.34 });
  assert.ok(cockpit.steering.rotation.z > 1, 'écart à gauche : sens antihoraire');
  run({ speed: 30, topSpeed: 30, steer: 0, driftYaw: 0.3 });
  assert.ok(cockpit.steering.rotation.z < -0.5, 'drift à gauche : contre-braquage à droite');

  run({ speed: 30, topSpeed: 30, boosting: true }, 3);
  assert.equal(cockpit.boostLight.visible, true, 'témoin de turbo allumé');
  run({ speed: 30, topSpeed: 30, boosting: false }, 3);
  assert.equal(cockpit.boostLight.visible, false);
  const blinks = new Set();
  for (let frame = 0; frame < 30; frame += 1) {
    cockpit.update({ speed: 20, topSpeed: 30, critical: true }, dt, frame * dt);
    blinks.add(cockpit.engineLight.visible);
  }
  assert.deepEqual([...blinks].sort(), [false, true], 'le témoin moteur clignote quand la coque est critique');

  const sweeps = [];
  for (let frame = 0; frame < 60; frame += 1) {
    cockpit.update({ speed: 20, topSpeed: 30 }, dt, frame * dt);
    sweeps.push(cockpit.wipers[0].rotation.z);
  }
  assert.ok(Math.max(...sweeps) > 1, 'sous la pluie, les essuie-glaces balaient le pare-brise');
  assert.ok(Math.min(...sweeps) === 0, 'puis se reposent au pied du pare-brise');
  cockpit.update({ speed: 20, topSpeed: 30, reduceMotion: true }, dt, 0.4);
  assert.equal(cockpit.wipers[0].rotation.z, 0, 'mouvement réduit : essuie-glaces au repos');

  const dry = makeCityRushCockpit(makeRacerCar(profile, { player: true }), { weather: null });
  dry.update({ speed: 20, topSpeed: 30 }, dt, 0.4);
  assert.ok(dry.wipers.every((arm) => arm.rotation.z === 0), 'temps sec : essuie-glaces au repos');
});

test('le rétroviseur et la caméra partent de cotes cohérentes', () => {
  const car = makeRacerCar(CITY_RUSH_CARS[0], { player: true });
  const cockpit = makeCityRushCockpit(car, { rightHandDrive: true });
  assert.equal(cockpit.layout.rightHandDrive, true);
  assert.ok(cockpit.eye.position.x > 0, 'conduite à droite : l’œil passe à droite');
  assert.equal(cockpit.mirror.mesh.parent, cockpit.mirror.housing);
  // Le miroir regarde le pilote : sa normale pointe vers l'œil.
  cockpit.group.updateMatrixWorld(true);
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(cockpit.mirror.housing.quaternion);
  const toEye = new THREE.Vector3(...cockpit.layout.eye).sub(cockpit.mirror.housing.position).normalize();
  assert.ok(normal.dot(toEye) > 0.99, 'le rétroviseur intérieur est tourné vers le pilote');
  assert.equal(cockpit.mirror.material, cockpit.materials.mirrorGlass);
});
