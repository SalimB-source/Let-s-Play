import test from 'node:test';
import assert from 'node:assert/strict';
import { drivingSpeedStatus } from '../src/games/drivingSpeedRules.js';
import { DRIVING_EXERCISES, stepExerciseObjective } from '../src/games/drivingExercises.js';
import { createDrivingSession, stepDrivingSession } from '../src/games/drivingSchool.js';
const exercise = DRIVING_EXERCISES[0];
const sample = (time, speed, extra = {}) => ({ ...exercise.spawn, time, speed, damage: 0, ...extra });

test('all courses use the urban 50 limit, with separate non-binding advisory speeds', () => {
  for (const e of DRIVING_EXERCISES) {
    assert.equal(e.limit, 50);
    assert.ok(e.advisorySpeed < e.limit);
    const status = drivingSpeedStatus(e, { ...e.spawn, speed: e.advisorySpeed + 5 });
    assert.equal(status.limit, 50);
    assert.equal(status.aboveAdvice, true);
    assert.equal(status.overspeed, false);
  }
});
test('game penalties start above the requested 3 km/h margin', () => {
  assert.equal(drivingSpeedStatus(exercise, sample(0, 50)).overspeed, false);
  assert.equal(drivingSpeedStatus(exercise, sample(0, 50.1)).overspeed, true);
  let s = stepDrivingSession(createDrivingSession('exam', exercise), sample(0, 0));
  s = stepDrivingSession(s, sample(.1, 53.1));
  assert.equal(s.speedStatus.overspeed, true);
  assert.equal(s.faults.length, 1);
});
test('the warning also works on the first telemetry sample', () => {
  const s = stepDrivingSession(createDrivingSession('lesson', exercise), sample(0, 55));
  assert.equal(s.speedStatus.overspeed, true);
  assert.equal(s.faults.length, 1);
});
test('warning persists until compliant, and scores one fault per continuous episode', () => {
  let s = stepDrivingSession(createDrivingSession('lesson', exercise), sample(0, 55));
  s = stepDrivingSession(s, sample(.1, 60));
  assert.equal(s.speedStatus.overspeed, true);
  assert.equal(s.faults.length, 1);
  s = stepDrivingSession(s, sample(.2, 50));
  assert.equal(s.speedStatus.overspeed, false);
  s = stepDrivingSession(s, sample(.3, 54));
  assert.equal(s.speedStatus.overspeed, true);
  assert.equal(s.faults.length, 2);
});
test('exceeding an advisory speed under the legal limit does not penalize', () => {
  const s = stepDrivingSession(createDrivingSession('lesson', exercise), sample(0, 40));
  assert.equal(s.speedStatus.aboveAdvice, true);
  assert.equal(s.speedStatus.overspeed, false);
  assert.equal(s.score, 100);
});
test('posted bump restriction and its end immediately update the warning', () => {
  const bump = DRIVING_EXERCISES.find((e) => e.id === 'bump');
  const at = (z, speed) => drivingSpeedStatus(bump, { x: -197.65, z, speed });
  assert.equal(at(-26, 35).limit, 50);
  assert.equal(at(-27, 35).limit, 20);
  assert.equal(at(-45, 20).overspeed, false);
  assert.equal(at(-45, 20.1).overspeed, true);
  assert.equal(at(-64, 35).limit, 50);
  assert.equal(at(-64, 35).overspeed, false);
});
test('a green light permits passing without a mandatory stop, red does not', () => {
  const e = DRIVING_EXERCISES.find((item) => item.id === 'signal');
  const s = createDrivingSession('lesson', e), goal = e.stages[0];
  assert.equal(stepExerciseObjective(s, { ...goal, speed: 10, signal: 'red' }, .1).checkpoint, 0);
  assert.equal(stepExerciseObjective(s, { ...goal, speed: 10, signal: 'green' }, .1).checkpoint, 1);
});

test('red display warns only above 53 even inside the signed 20 section', () => {
  const bump = DRIVING_EXERCISES.find((e) => e.id === 'bump');
  for (const speed of [20, 20.1, 30, 50, 53]) {
    assert.equal(drivingSpeedStatus(bump, { x: -197.65, z: -45, speed }).showWarning, false);
  }
  const status = drivingSpeedStatus(bump, { x: -197.65, z: -45, speed: 53.1 });
  assert.equal(status.showWarning, true);
  assert.equal(status.limit, 20);
  assert.equal(status.overspeed, true);
});

test('small excesses are still legally excess but are not penalized within the game margin', () => {
  for (const speed of [50.1, 51, 52, 53]) {
    const s = stepDrivingSession(createDrivingSession('lesson', exercise), sample(0, speed));
    assert.equal(s.speedStatus.limit, 50);
    assert.equal(s.speedStatus.overspeed, true);
    assert.equal(s.speedStatus.penalizedOverspeed, false);
    assert.equal(s.speedStatus.showWarning, false);
    assert.equal(s.faults.length, 0);
  }
});
test('posted 20 section tolerates up to 23 for scoring, not a different sign limit', () => {
  for (const speed of [20, 21, 23, 23.1]) {
    const bump = DRIVING_EXERCISES.find((e) => e.id === 'bump');
    const s = stepDrivingSession(createDrivingSession('lesson', bump), { x: -197.65, z: -45, speed, time: 0, damage: 0 });
    assert.equal(s.roadLimit, 20);
    assert.equal(s.faults.length, speed > 23 ? 1 : 0);
    const crossed = stepExerciseObjective({ ...s, previous: { z: -44, speed } }, { x: -197.65, z: -46, speed }, .1);
    assert.equal(crossed.bumpCrossed, speed <= 23);
  }
});
