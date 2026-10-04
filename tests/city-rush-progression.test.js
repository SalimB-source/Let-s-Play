import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CITY_RUSH_CARS,
  CITY_RUSH_COURSES,
} from '../src/games/cityRushRules.js';
import {
  CITY_RUSH_CASH_PER_RACE,
  CITY_RUSH_PROGRESS_KEY,
  CITY_RUSH_STARTER_CAR_ID,
  awardCityRushRace,
  isCityRushCarOwned,
  isCityRushCourseUnlocked,
  normalizeCityRushProgress,
  purchaseCityRushCar,
  readCityRushProgress,
  writeCityRushProgress,
} from '../src/games/cityRushProgress.js';

test('nouvelle carrière : la Mistral est offerte et seul Vice City est ouvert', () => {
  const progress = normalizeCityRushProgress(null);
  assert.equal(progress.cash, 0);
  assert.deepEqual(progress.ownedCarIds, [CITY_RUSH_STARTER_CAR_ID]);
  assert.deepEqual(progress.completedCourseIds, []);
  assert.equal(isCityRushCarOwned(progress, CITY_RUSH_STARTER_CAR_ID), true);
  for (const car of CITY_RUSH_CARS.slice(1)) assert.equal(isCityRushCarOwned(progress, car.id), false);
  assert.equal(isCityRushCourseUnlocked(progress, 'vice-city'), true);
  for (const course of CITY_RUSH_COURSES.slice(1)) assert.equal(isCityRushCourseUnlocked(progress, course.id), false);
});

test('chaque course verse 50 billets, mais seul le parcours terminé ouvre le suivant', () => {
  const firstCourse = CITY_RUSH_COURSES[0];
  const secondCourse = CITY_RUSH_COURSES[1];
  const thirdCourse = CITY_RUSH_COURSES[2];
  const initial = normalizeCityRushProgress(null);

  const wreck = awardCityRushRace(initial, { courseId: firstCourse.id, completed: false });
  assert.equal(wreck.cashAwarded, CITY_RUSH_CASH_PER_RACE);
  assert.equal(wreck.progress.cash, 50);
  assert.deepEqual(wreck.progress.completedCourseIds, []);
  assert.equal(isCityRushCourseUnlocked(wreck.progress, secondCourse.id), false);

  const finish = awardCityRushRace(wreck.progress, { courseId: firstCourse.id, completed: true });
  assert.equal(finish.cashAwarded, 50);
  assert.equal(finish.progress.cash, 100);
  assert.deepEqual(finish.progress.completedCourseIds, [firstCourse.id]);
  assert.equal(isCityRushCourseUnlocked(finish.progress, secondCourse.id), true);
  assert.equal(isCityRushCourseUnlocked(finish.progress, thirdCourse.id), false);

  const skipped = awardCityRushRace(finish.progress, { courseId: thirdCourse.id, completed: true });
  assert.equal(skipped.cashAwarded, 0);
  assert.equal(skipped.reason, 'course-locked');
  assert.equal(skipped.progress.cash, 100);

  const nextFinish = awardCityRushRace(finish.progress, { courseId: secondCourse.id, completed: true });
  assert.deepEqual(nextFinish.progress.completedCourseIds, [firstCourse.id, secondCourse.id]);
  assert.equal(isCityRushCourseUnlocked(nextFinish.progress, thirdCourse.id), true);
});

test('les voitures payantes s’achètent une fois avec le portefeuille gagné', () => {
  const starter = normalizeCityRushProgress(null);
  const firstPayingCar = CITY_RUSH_CARS.find((car) => car.price > 0);
  assert.ok(firstPayingCar);

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
