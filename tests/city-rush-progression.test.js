import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CITY_RUSH_CARS,
  CITY_RUSH_CARS_BY_POWER,
  CITY_RUSH_COURSES,
  CITY_RUSH_FREE_CAR_COUNT,
  CITY_RUSH_FREE_CAR_IDS,
  cityRushFreeCarIds,
} from '../src/games/cityRushRules.js';
import {
  CITY_RUSH_CASH_BY_PLACE,
  CITY_RUSH_CASH_PER_RACE,
  CITY_RUSH_PROGRESS_KEY,
  CITY_RUSH_STARTER_CAR_ID,
  awardCityRushRace,
  cityRushCashForPlace,
  cityRushCashForRaceResult,
  isCityRushCarFree,
  isCityRushCarOwned,
  isCityRushCourseUnlocked,
  normalizeCityRushProgress,
  purchaseCityRushCar,
  readCityRushProgress,
  writeCityRushProgress,
} from '../src/games/cityRushProgress.js';

test('nouvelle carrière : les trois voitures les moins puissantes sont offertes et seul Vice City est ouvert', () => {
  const progress = normalizeCityRushProgress(null);
  assert.equal(progress.cash, 0);
  // Ordre du catalogue : la Mistral (départ), la Nova et la Wolfsburg.
  assert.deepEqual(progress.ownedCarIds, CITY_RUSH_FREE_CAR_IDS);
  assert.deepEqual(progress.completedCourseIds, []);
  assert.equal(isCityRushCarOwned(progress, CITY_RUSH_STARTER_CAR_ID), true);
  for (const car of CITY_RUSH_CARS) {
    assert.equal(isCityRushCarOwned(progress, car.id), CITY_RUSH_FREE_CAR_IDS.includes(car.id),
      `${car.name} : offerte si elle fait partie des trois moins puissantes`);
  }
  assert.equal(isCityRushCourseUnlocked(progress, 'vice-city'), true);
  for (const course of CITY_RUSH_COURSES.slice(1)) assert.equal(isCityRushCourseUnlocked(progress, course.id), false);
});

test('le trio offert suit la puissance réelle (vitesse de pointe) du catalogue', () => {
  assert.equal(CITY_RUSH_FREE_CAR_COUNT, 3);
  assert.deepEqual(CITY_RUSH_CARS_BY_POWER.slice(0, CITY_RUSH_FREE_CAR_COUNT).map((car) => car.id), CITY_RUSH_FREE_CAR_IDS);
  assert.deepEqual([...CITY_RUSH_FREE_CAR_IDS], ['city-hatch', 'nova-18-gt', 'night-comet']);
  // Les voitures payantes restent toutes plus rapides que le trio offert.
  const slowestPaid = CITY_RUSH_CARS_BY_POWER.find((car) => !CITY_RUSH_FREE_CAR_IDS.includes(car.id));
  for (const freeId of CITY_RUSH_FREE_CAR_IDS) {
    const free = CITY_RUSH_CARS.find((car) => car.id === freeId);
    assert.ok(free.powerMultiplier < slowestPaid.powerMultiplier,
      `${free.name} (${free.powerMultiplier}) est moins puissante que ${slowestPaid.name} (${slowestPaid.powerMultiplier})`);
  }
  // Un catalogue réduit n'offre jamais plus de voitures qu'il n'en contient.
  assert.deepEqual(cityRushFreeCarIds(CITY_RUSH_CARS.slice(0, 2)), ['city-hatch', 'nova-18-gt']);
});

test('les voitures offertes rejoignent toute sauvegarde, y compris les anciennes et les instantanés serveur', () => {
  // Sauvegarde d'avant l'offre : aucune des trois n'y figure.
  const legacy = normalizeCityRushProgress({ cash: 300, ownedCarIds: ['toro-v12'], completedCourseIds: ['vice-city'] });
  for (const freeId of CITY_RUSH_FREE_CAR_IDS) assert.equal(isCityRushCarOwned(legacy, freeId), true);
  assert.ok(legacy.ownedCarIds.includes('toro-v12'));
  assert.equal(legacy.cash, 300, 'aucune offre ne touche au portefeuille');

  // Instantané serveur minimal (ligne jamais synchronisée avant l'offre).
  const remote = normalizeCityRushProgress({ ownedCarIds: [] });
  assert.deepEqual(remote.ownedCarIds, CITY_RUSH_FREE_CAR_IDS);

  // L'achat d'une voiture offerte ne débite jamais, même forcé.
  const attempt = purchaseCityRushCar(normalizeCityRushProgress({ cash: 900 }), 'night-comet');
  assert.equal(attempt.purchased, false);
  assert.equal(attempt.reason, 'free-car');
  assert.equal(attempt.progress.cash, 900);
  assert.equal(isCityRushCarFree('night-comet'), true);
  assert.equal(isCityRushCarFree('toro-v12'), false);
});

test('la place fixe le gain : 50 billets au 1er, 30 au 2e, 10 au 3e', () => {
  assert.deepEqual(CITY_RUSH_CASH_BY_PLACE, [50, 30, 10]);
  assert.equal(CITY_RUSH_CASH_PER_RACE, 50);
  assert.equal(cityRushCashForPlace(1), 50);
  assert.equal(cityRushCashForPlace(2), 30);
  assert.equal(cityRushCashForPlace(3), 10);
  // Classé dernier ou au-delà du podium : le plancher reste à 10 billets.
  assert.equal(cityRushCashForPlace(4), 10);
  assert.equal(cityRushCashForPlace(0), 0);
  assert.equal(cityRushCashForPlace(null), 0);
});

test('Sprint et Poursuite sont des modes défi sans billets verts', () => {
  // Sprint : pas de podium affiché et aucun billet, même si les 10 checkpoints sont franchis.
  assert.equal(cityRushCashForRaceResult({ sprint: true, rank: null }), 0);
  assert.equal(cityRushCashForRaceResult({ modeId: 'sprint', rank: 1 }), 0);
  assert.equal(cityRushCashForRaceResult({ sprint: true, timedOut: true, rank: null }), 0);
  assert.equal(cityRushCashForRaceResult({ sprint: true, destroyed: true, rank: 1 }), 0);

  // Poursuite : le classement existe, mais il sert au résultat, pas au portefeuille.
  assert.equal(cityRushCashForRaceResult({ modeId: 'pursuit', rank: 1 }), 0);
  assert.equal(cityRushCashForRaceResult({ modeId: 'pursuit', rank: 2 }), 0);
  assert.equal(cityRushCashForRaceResult({ modeId: 'pursuit', rank: 3 }), 0);

  // Circuit et Histoire restent rémunérés au podium.
  assert.equal(cityRushCashForRaceResult({ modeId: 'circuit', rank: 1 }), 50);
  assert.equal(cityRushCashForRaceResult({ modeId: 'circuit', rank: 2 }), 30);
  assert.equal(cityRushCashForRaceResult({ modeId: 'story', rank: 3 }), 10);
  assert.equal(cityRushCashForRaceResult({ destroyed: true, rank: null }), 10);
});

test('le versement dépend de la place, mais seul le parcours terminé ouvre le suivant', () => {
  const firstCourse = CITY_RUSH_COURSES[0];
  const secondCourse = CITY_RUSH_COURSES[1];
  const thirdCourse = CITY_RUSH_COURSES[2];
  const initial = normalizeCityRushProgress(null);

  // Une épave est classée dernière (3e) et empoche quand même 10 billets.
  const wreck = awardCityRushRace(initial, { courseId: firstCourse.id, completed: false, rank: 3 });
  assert.equal(wreck.cashAwarded, 10);
  assert.equal(wreck.progress.cash, 10);
  assert.deepEqual(wreck.progress.completedCourseIds, []);
  assert.equal(isCityRushCourseUnlocked(wreck.progress, secondCourse.id), false);

  // Sans place précisée, la course paie comme une victoire (rétro-compatibilité).
  const anonymous = awardCityRushRace(wreck.progress, { courseId: firstCourse.id, completed: false });
  assert.equal(anonymous.cashAwarded, CITY_RUSH_CASH_PER_RACE);
  assert.equal(anonymous.progress.cash, 60);

  const finish = awardCityRushRace(anonymous.progress, { courseId: firstCourse.id, completed: true, rank: 1 });
  assert.equal(finish.cashAwarded, 50);
  assert.equal(finish.progress.cash, 110);
  assert.deepEqual(finish.progress.completedCourseIds, [firstCourse.id]);
  assert.equal(isCityRushCourseUnlocked(finish.progress, secondCourse.id), true);
  assert.equal(isCityRushCourseUnlocked(finish.progress, thirdCourse.id), false);

  const sprintFinish = awardCityRushRace(finish.progress, { courseId: firstCourse.id, completed: true, modeId: 'sprint', sprint: true, rank: null });
  assert.equal(sprintFinish.cashAwarded, 0);
  assert.equal(sprintFinish.progress.cash, 110);

  const pursuitWin = awardCityRushRace(sprintFinish.progress, { courseId: firstCourse.id, completed: true, modeId: 'pursuit', rank: 1 });
  assert.equal(pursuitWin.cashAwarded, 0);
  assert.equal(pursuitWin.progress.cash, 110);

  const forcedPursuitReward = awardCityRushRace(pursuitWin.progress, { courseId: firstCourse.id, completed: true, modeId: 'pursuit', rank: 1, reward: 999 });
  assert.equal(forcedPursuitReward.cashAwarded, 0);
  assert.equal(forcedPursuitReward.progress.cash, 110);

  const sprintTimeout = awardCityRushRace(forcedPursuitReward.progress, { courseId: firstCourse.id, completed: false, modeId: 'sprint', sprint: true, timedOut: true, rank: null });
  assert.equal(sprintTimeout.cashAwarded, 0);
  assert.equal(sprintTimeout.progress.cash, 110);

  const skipped = awardCityRushRace(finish.progress, { courseId: thirdCourse.id, completed: true, rank: 1 });
  assert.equal(skipped.cashAwarded, 0);
  assert.equal(skipped.reason, 'course-locked');
  assert.equal(skipped.progress.cash, 110);

  const secondPlace = awardCityRushRace(finish.progress, { courseId: secondCourse.id, completed: true, rank: 2 });
  assert.equal(secondPlace.cashAwarded, 30);
  assert.equal(secondPlace.progress.cash, 140);
  assert.deepEqual(secondPlace.progress.completedCourseIds, [firstCourse.id, secondCourse.id]);
  assert.equal(isCityRushCourseUnlocked(secondPlace.progress, thirdCourse.id), true);
});

test('les voitures payantes s’achètent une fois avec le portefeuille gagné', () => {
  const starter = normalizeCityRushProgress(null);
  // Le trio le moins puissant est offert : la première voiture à payer est la
  // quatrième du catalogue (CAVALLO F8 GTB).
  const firstPayingCar = CITY_RUSH_CARS.find((car) => car.price > 0 && !CITY_RUSH_FREE_CAR_IDS.includes(car.id));
  assert.ok(firstPayingCar);
  assert.equal(isCityRushCarOwned(starter, firstPayingCar.id), false);

  const poorPurchase = purchaseCityRushCar(starter, firstPayingCar.id);
  assert.equal(poorPurchase.purchased, false);
  assert.equal(poorPurchase.reason, 'insufficient-funds');
  assert.deepEqual(poorPurchase.progress, starter);

  const funded = normalizeCityRushProgress({ ...starter, cash: firstPayingCar.price });
  const purchase = purchaseCityRushCar(funded, firstPayingCar.id);
  assert.equal(purchase.purchased, true);
  assert.equal(purchase.progress.cash, 0);
  assert.equal(isCityRushCarOwned(purchase.progress, firstPayingCar.id), true);

  const repeat = purchaseCityRushCar(purchase.progress, firstPayingCar.id);
  assert.equal(repeat.reason, 'already-owned');
  assert.equal(repeat.progress.cash, 0);
});

test('les sauvegardes ignorent les identifiants inconnus et ne sautent pas un parcours', () => {
  const progress = normalizeCityRushProgress({
    cash: 42.9,
    ownedCarIds: ['ghost-car', 'turbo-gt'],
    completedCourseIds: ['vice-city', 'paris'],
  });
  assert.equal(progress.cash, 42);
  assert.ok(progress.ownedCarIds.includes(CITY_RUSH_STARTER_CAR_ID));
  assert.ok(progress.ownedCarIds.includes('turbo-gt'));
  assert.deepEqual(progress.ownedCarIds, [...CITY_RUSH_FREE_CAR_IDS, 'turbo-gt']);
  assert.deepEqual(progress.completedCourseIds, ['vice-city']);
  assert.equal(isCityRushCourseUnlocked(progress, 'new-york'), true);
  assert.equal(isCityRushCourseUnlocked(progress, 'tokyo'), false);
});

test('lecture et écriture du portefeuille tolèrent les stockages indisponibles', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const progress = normalizeCityRushProgress({ cash: 150, ownedCarIds: ['city-hatch', 'night-comet'] });
  assert.equal(writeCityRushProgress(progress, storage), true);
  assert.equal(values.has(CITY_RUSH_PROGRESS_KEY), true);
  assert.deepEqual(readCityRushProgress(storage), progress);
  assert.deepEqual(readCityRushProgress({ getItem: () => '{invalid' }), normalizeCityRushProgress(null));
  assert.equal(writeCityRushProgress(progress, null), false);
});
