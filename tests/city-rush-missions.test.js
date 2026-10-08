import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY_RUSH_CARS, CITY_RUSH_COURSES } from '../src/games/cityRushRules.js';
import {
  CITY_RUSH_CASH_PER_RACE,
  CITY_RUSH_STARTER_CAR_ID,
  completeCityRushMissionProgress,
  normalizeCityRushProgress,
  normalizeCityRushSave,
  purchaseCityRushCar,
} from '../src/games/cityRushProgress.js';
import {
  CITY_RUSH_MISSION_COUNT,
  CITY_RUSH_MISSIONS,
  CITY_RUSH_MISSION_IDS,
  cityRushMissionResultText,
  evaluateCityRushMission,
  getCityRushMission,
  getNextCityRushMissionId,
  isCityRushMissionUnlocked,
  normalizeCompletedCityRushMissionIds,
} from '../src/games/cityRushMissions.js';

const cleanFinish = (overrides = {}) => ({
  destroyed: false,
  timedOut: false,
  sabotaged: false,
  laps: 3,
  rank: 2,
  shotsFired: 0,
  vehicleContacts: 0,
  policeDestroyed: 0,
  pickups: 0,
  pistolPickups: 0,
  racers: [],
  ...overrides,
});

test('les missions racontent des objectifs lisibles et utilisent des villes/parcours valides', () => {
  assert.equal(CITY_RUSH_MISSION_COUNT, 5);
  assert.deepEqual(CITY_RUSH_MISSION_IDS, CITY_RUSH_MISSIONS.map((mission) => mission.id));
  for (const mission of CITY_RUSH_MISSIONS) {
    assert.ok(mission.name && mission.briefing && mission.objective, `${mission.id} annonce son briefing et son objectif`);
    assert.ok(mission.checklist.length >= 3, `${mission.id} décompose l’objectif en étapes jouables`);
    assert.equal(mission.laps, 3, `${mission.id} se termine après trois tours`);
    assert.ok(CITY_RUSH_COURSES.some((course) => course.id === mission.cityId), `${mission.id} utilise un parcours connu`);
    assert.ok(mission.rules && typeof mission.rules === 'object', `${mission.id} porte ses règles de course`);
  }
  assert.equal(getCityRushMission('dealer-pursuit')?.rules.policePlayerLook, true);
  assert.equal(getCityRushMission('dealer-pursuit')?.rules.rivalHealth.dealer, 36);
  assert.equal(getCityRushMission('six-police-cars')?.requiredPoliceDestroyed, 6);
  assert.equal(getCityRushMission('clean-laps')?.rules.policeEnabled, false);
});

test('une mission ne se débloque qu’après la précédente et les sauvegardes sautées sont normalisées', () => {
  assert.equal(getNextCityRushMissionId([]), 'dealer-pursuit');
  assert.equal(isCityRushMissionUnlocked('dealer-pursuit', []), true);
  assert.equal(isCityRushMissionUnlocked('clean-laps', []), false);
  assert.equal(isCityRushMissionUnlocked('six-police-cars', ['dealer-pursuit']), false);
  assert.deepEqual(
    normalizeCompletedCityRushMissionIds(['dealer-pursuit', 'six-police-cars', 'pickup-courier']),
    ['dealer-pursuit'],
  );
  assert.deepEqual(normalizeCompletedCityRushMissionIds(['inconnue']), []);
  assert.equal(
    getNextCityRushMissionId(['dealer-pursuit', 'clean-laps', 'six-police-cars']),
    'pickup-courier',
  );
});

test('la sauvegarde persiste les missions sans toucher à la carrière, au garage ou aux tournois', () => {
  const start = normalizeCityRushProgress(null);
  const first = completeCityRushMissionProgress(start, 'dealer-pursuit');
  assert.equal(first.completed, true);
  assert.equal(first.newlyCompleted, true);
  assert.deepEqual(first.progress.completedMissionIds, ['dealer-pursuit']);
  assert.deepEqual(first.progress.completedCourseIds, []);
  assert.equal(first.progress.cash, 0);
  assert.deepEqual(first.progress.ownedCarIds, start.ownedCarIds);

  const blocked = completeCityRushMissionProgress(first.progress, 'six-police-cars');
  assert.equal(blocked.completed, false);
  assert.equal(blocked.reason, 'mission-locked');
  assert.deepEqual(blocked.progress.completedMissionIds, ['dealer-pursuit']);

  const replay = completeCityRushMissionProgress(first.progress, 'dealer-pursuit');
  assert.equal(replay.newlyCompleted, false, 'rejouer une mission ne crédite rien deux fois');
  assert.deepEqual(replay.progress.completedMissionIds, ['dealer-pursuit']);

  const next = completeCityRushMissionProgress(first.progress, 'clean-laps');
  const save = normalizeCityRushSave({ ...next.progress, cash: 45, tournamentTitles: { sunset: 1 } });
  assert.deepEqual(save.completedMissionIds, ['dealer-pursuit', 'clean-laps']);
  assert.equal(save.cash, 45);
  assert.deepEqual(save.completedCourseIds, []);
  assert.deepEqual(save.tournamentTitles, { sunset: 1 });
  assert.equal(CITY_RUSH_CASH_PER_RACE, 50, 'la règle des billets du mode libre ne change pas');

  const purchase = purchaseCityRushCar(save, CITY_RUSH_STARTER_CAR_ID);
  assert.equal(purchase.progress.completedMissionIds.length, 2, 'un passage au garage conserve la progression Mission');
  assert.ok(CITY_RUSH_CARS.some((car) => car.id === CITY_RUSH_STARTER_CAR_ID));
});

test('la Mission 1 exige le dealer neutralisé et une vraie arrivée', () => {
  const mission = getCityRushMission('dealer-pursuit');
  assert.equal(evaluateCityRushMission(mission, cleanFinish({ racers: [{ id: 'dealer', health: 1 }], pistolPickups: 1 })), false);
  assert.equal(evaluateCityRushMission(mission, cleanFinish({ racers: [{ id: 'dealer', health: 0 }] })), false, 'la collision seule ne remplace pas le chargeur ramassé');
  assert.equal(evaluateCityRushMission(mission, cleanFinish({ racers: [{ id: 'dealer', health: 0 }], pistolPickups: 1 })), true);
  assert.equal(evaluateCityRushMission(mission, cleanFinish({ destroyed: true, racers: [{ id: 'dealer', health: 0 }], pistolPickups: 1 })), false);
  assert.equal(evaluateCityRushMission(mission, cleanFinish({ timedOut: true, racers: [{ id: 'dealer', health: 0 }], pistolPickups: 1 })), false);
  assert.match(cityRushMissionResultText(mission, cleanFinish({ racers: [{ id: 'dealer', health: 1 }] }), false), /dealer doit être neutralisé/);
});

test('la Mission 2 compte les contacts, la Mission 3 les voitures de police détruites', () => {
  const clean = getCityRushMission('clean-laps');
  assert.equal(evaluateCityRushMission(clean, cleanFinish({ vehicleContacts: 0 })), true);
  assert.equal(evaluateCityRushMission(clean, cleanFinish({ vehicleContacts: 1 })), false);
  assert.equal(evaluateCityRushMission(clean, cleanFinish({ vehicleContacts: 0, destroyed: true })), false);

  const sixPolice = getCityRushMission('six-police-cars');
  assert.equal(evaluateCityRushMission(sixPolice, cleanFinish({ policeDestroyed: 5 })), false);
  assert.equal(evaluateCityRushMission(sixPolice, cleanFinish({ policeDestroyed: 6 })), true);
});

test('les missions bonus ont aussi des conditions vérifiables et un débrief exact', () => {
  const courier = getCityRushMission('pickup-courier');
  assert.equal(evaluateCityRushMission(courier, cleanFinish({ pickups: 11 })), false);
  assert.equal(evaluateCityRushMission(courier, cleanFinish({ pickups: 12 })), true);
  assert.match(cityRushMissionResultText(courier, cleanFinish({ pickups: 12 }), true), /Douze bonus/);

  const coldTrigger = getCityRushMission('cold-trigger');
  assert.equal(evaluateCityRushMission(coldTrigger, cleanFinish({ rank: 1, shotsFired: 0, vehicleContacts: 1 })), true);
  assert.equal(evaluateCityRushMission(coldTrigger, cleanFinish({ rank: 1, shotsFired: 1, vehicleContacts: 0 })), false);
  assert.equal(evaluateCityRushMission(coldTrigger, cleanFinish({ rank: 2, shotsFired: 0, vehicleContacts: 0 })), false);
  assert.equal(evaluateCityRushMission(coldTrigger, cleanFinish({ rank: 1, shotsFired: 0, vehicleContacts: 2 })), false);
});
