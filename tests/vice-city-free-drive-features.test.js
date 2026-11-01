import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  VICE_CITY_CHALLENGES,
  VICE_CITY_POINTS_OF_INTEREST,
  createViceCityChallenge,
  viceCityGpsRoute,
  viceCityStreetName,
  viceCityChallengeProgress,
} from '../src/games/viceCityFreeDriveFeatures.js';
import { viceCityFreeDriveGlassEntryFace } from '../src/games/viceCityFreeDrive.js';

test('le catalogue des missions et activités libres couvre les objectifs demandés', () => {
  const ids = VICE_CITY_CHALLENGES.map(({ id }) => id);
  for (const id of ['delivery', 'checkpoints', 'speed', 'escape', 'time-trial', 'jump', 'slalom', 'drift']) {
    assert.ok(ids.includes(id), `défi manquant : ${id}`);
  }
  assert.ok(VICE_CITY_CHALLENGES.every(({ reward, duration }) => reward > 0 && duration > 0));
  assert.ok(VICE_CITY_POINTS_OF_INTEREST.some(({ kind }) => kind === 'garage'));
});

test('le GPS choisit le pont central pour rejoindre l’autre rive', () => {
  const route = viceCityGpsRoute({ x: -180, z: 200 }, { x: 210, z: -100 });
  assert.deepEqual(route[0], { x: -180, z: 200 });
  assert.ok(route.some(({ x, z }) => x < 0 && z === 0));
  assert.ok(route.some(({ x, z }) => x > 0 && z === 0));
  assert.deepEqual(route.at(-1), { x: 210, z: -100 });
  assert.ok(route.every((point) => Number.isFinite(point.x) && Number.isFinite(point.z)));
});

test('le GPS garde un itinéraire local quand départ et destination sont du même côté', () => {
  assert.deepEqual(viceCityGpsRoute({ x: -160, z: -100 }, { x: -220, z: 150 }), [
    { x: -160, z: -100 }, { x: -220, z: -100 }, { x: -220, z: 150 },
  ]);
  assert.deepEqual(viceCityGpsRoute(null, { x: 0, z: 0 }), []);
});

test('les intersections disposent de noms de rues lisibles', () => {
  assert.equal(viceCityStreetName(-300, -300), 'WASHINGTON AVE');
  assert.equal(viceCityStreetName(300, 300), 'STARFISH ISLAND RD');
  assert.ok(viceCityStreetName(0, 100).length > 0);
});

test('un défi démarré est une copie isolée, temporisée et récompensée', () => {
  const first = createViceCityChallenge('checkpoints', 42);
  const second = createViceCityChallenge('checkpoints', 55);
  assert.equal(first.startedAt, 42);
  assert.equal(first.remaining, first.duration);
  assert.equal(first.status, 'active');
  first.checkpoints[0].x = 999;
  assert.notEqual(second.checkpoints[0].x, 999);
  assert.equal(createViceCityChallenge('unknown'), null);
});


test('le garage libre utilise une voiture temporaire sans toucher à la sauvegarde du garage principal', () => {
  const source = readFileSync(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  const garageStart = source.indexOf('garageActionRef.current =');
  const garageEnd = source.indexOf('challengeActionRef.current =', garageStart);
  assert.ok(garageStart >= 0 && garageEnd > garageStart);
  const garageAction = source.slice(garageStart, garageEnd);
  assert.match(garageAction, /makeRacerCar\(profile/);
  assert.match(garageAction, /setSelectedFreeRoamCar\(profile\)/);
  assert.doesNotMatch(garageAction, /localStorage|writeFreeRoam|carId\s*=/);
  assert.match(source, /garage principal ne sera jamais remplacée/);
});

test('la conduite libre branche GPS, météo, dégâts et les traces de dérapage aux boucles du monde', () => {
  const source = readFileSync(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  assert.match(source, /viceCityGpsRoute\(/);
  assert.match(source, /weatherMode === 'rain'/);
  assert.match(source, /worldClock = \(worldClock \+/);
  assert.match(source, /state\.damage = clamp\(state\.damage/);
  assert.match(source, /audioRef\.current\?\.skid/);
  assert.match(source, /wearMarks\.push\(mark\)/);
});


test('les impacts de balle visent la vitre du côté d’entrée et orientent la marque vers l’extérieur', () => {
  assert.deepEqual(viceCityFreeDriveGlassEntryFace(1, 0), { axis: 'side', side: -1, rotation: -Math.PI / 2 });
  assert.deepEqual(viceCityFreeDriveGlassEntryFace(-1, 0), { axis: 'side', side: 1, rotation: Math.PI / 2 });
  assert.deepEqual(viceCityFreeDriveGlassEntryFace(0, 1), { axis: 'end', end: -1, rotation: Math.PI });
  assert.deepEqual(viceCityFreeDriveGlassEntryFace(0, -1), { axis: 'end', end: 1, rotation: 0 });
});

test('les impacts visuels utilisent la surface réelle du vitrage avant le placement de secours', () => {
  const source = readFileSync(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  assert.match(source, /glassImpactRaycaster\.intersectObjects\(glassMeshes, false\)/);
  assert.match(source, /crack\.position\.copy\(car\.worldToLocal\(glassHit\.point\.clone\(\)\)\)/);
  assert.match(source, /entryFace\.side \* width \* 0\.435/);
});


test('les instructions de mission et la progression expliquent une action concrète', () => {
  for (const challenge of VICE_CITY_CHALLENGES) {
    assert.ok(challenge.detail.length > 35, `${challenge.id}: instruction trop courte`);
    const running = createViceCityChallenge(challenge.id);
    const progress = viceCityChallengeProgress(running);
    assert.ok(progress.label.length > 0, `${challenge.id}: progression absente`);
    assert.ok(progress.ratio >= 0 && progress.ratio <= 1);
  }
  const speed = createViceCityChallenge('speed');
  speed.progress = 2.5;
  assert.match(viceCityChallengeProgress(speed).label, /75 KM\/H.*2\.5 \/ 5 S/);
  const delivery = createViceCityChallenge('delivery');
  assert.equal(viceCityChallengeProgress(delivery).label, 'LIVRAISON · REPÈRE ROSE');
});


test('la fuite déclenche deux vraies patrouilles poursuivantes et une sirène de proximité', () => {
  const source = readFileSync(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  assert.match(source, /const activatePolicePursuit = \(\) =>/);
  assert.match(source, /\.slice\(0, 2\)/);
  assert.match(source, /const updatePursuitTraffic = \(traffic, dt\) =>/);
  assert.match(source, /viceCityGpsRoute\(\{ x: car\.position\.x, z: car\.position\.z \}/);
  assert.match(source, /if \(traffic\.pursuitActive\) \{ updatePursuitTraffic\(traffic, dt\); continue; \}/);
  assert.match(source, /policeSiren\?\.\(/);
});

test('les missions routées affichent un repère 3D animé à la prochaine cible', () => {
  const source = readFileSync(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  assert.match(source, /vice-city-active-mission-marker/);
  assert.match(source, /new THREE\.TorusGeometry\(4\.4, 0\.2/);
  assert.match(source, /missionMarker\.position\.set\(target\.x/);
  assert.match(source, /updateMissionMarker\(\)/);
  assert.match(source, /REPÈRE ROSE EN VILLE/);
});


test('les gains, records et défis de rue sont persistés dans une clé libre distincte', () => {
  const source = readFileSync(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  assert.match(source, /FREE_ROAM_PROGRESS_KEY = 'letsplay_vice_city_free_roam_progress_v1'/);
  assert.match(source, /completedChallengeIds/);
  assert.match(source, /bestTimes/);
  assert.match(source, /writeFreeRoamProgress\(updated\)/);
  assert.match(source, /ambientEvent = \{ nextAt: 48/);
  assert.match(source, /ÉVÉNEMENT DE RUE/);
  const garageStart = source.indexOf('garageActionRef.current =');
  const garageEnd = source.indexOf('challengeActionRef.current =', garageStart);
  assert.doesNotMatch(source.slice(garageStart, garageEnd), /FREE_ROAM_PROGRESS_KEY|writeFreeRoamProgress/);
});

test('la nuit et la pluie activent phares réels, enseignes lumineuses et reflets de flaques', () => {
  const source = readFileSync(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  assert.ok(source.includes('new THREE.SpotLight(0xffedc5'));
  assert.ok(source.includes('headlightRig.lights.forEach'));
  assert.ok(source.includes('city.neonPointLights.forEach'));
  assert.ok(source.includes('city.neonSignMaterials.forEach'));
  assert.ok(source.includes('new THREE.MeshPhysicalMaterial({'));
  assert.ok(source.includes("puddles.visible = weatherMode === 'rain'"));
  assert.ok(source.includes("city.roadMat.roughness = weatherMode === 'rain' ? 0.24"));
});

test('la chaussée reçoit un grain d’asphalte, des marquages irréguliers et des grilles de drainage', () => {
  const source = readFileSync(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  assert.ok(source.includes('makeRoadSurfaceTexture(6143, 220, 24)'));
  assert.ok(source.includes('roughnessMap: asphaltRoughness'));
  assert.ok(source.includes('bumpMap: asphaltBump'));
  assert.ok(source.includes('map: surfaceTextures.map'));
  assert.ok(source.includes('city.highwayRoadMat.roughness = weatherMode === \'rain\' ? 0.24'));
  assert.ok(source.includes('uv.setXY(index, x / 28, z / 28)'));
  assert.ok(source.includes('verticalDashes.setColorAt(index'));
  assert.ok(source.includes('horizontalCrosswalk.setColorAt(index'));
  assert.ok(source.includes('const addDrainGrates = (positions, horizontal) =>'));
  assert.ok(source.includes('addDrainGrates(verticalDrainPositions, false)'));
});

test('la pluie modifie l’accélération, le freinage et la dérive latérale', () => {
  const source = readFileSync(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  assert.match(source, /acceleration: acceleration \* \(isWetRoad \? 0\.88 : 1\)/);
  assert.match(source, /dryBrakingDelta \* 0\.82/);
  assert.match(source, /state\.lateralSpeed \+= state\.speed \* state\.steer \* \(isWetRoad \? 0\.16 : 0\.045\)/);
});

test('un premier contact avec une patrouille routière déclenche un klaxon avec délai anti-spam', () => {
  const source = readFileSync(new URL('../src/games/ViceCityFreeRoam.jsx', import.meta.url), 'utf8');
  assert.match(source, /traffic\.lastHornAt \?\? -10/);
  assert.match(source, /audioRef\.current\?\.trafficHorn/);
});
