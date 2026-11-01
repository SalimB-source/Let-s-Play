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
