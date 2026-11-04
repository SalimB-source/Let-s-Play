import test from 'node:test';
import assert from 'node:assert/strict';
import { PARKING_CHOICE_EXERCISE as exercise, fitsAllowedParking, assessParkingChoice, drawNoParkingSign } from '../src/games/parkingChoiceExercise.js';
import { DRIVING_EXERCISES, stepExerciseObjective } from '../src/games/drivingExercises.js';
import { createDrivingSession, stepDrivingSession, drivingSessionPassed } from '../src/games/drivingSchool.js';
import { schoolTurnSignal } from '../src/games/drivingSchoolIndicators.js';
const sample = (time, extra = {}) => ({ ...exercise.spawn, time, speed: 0, damage: 0, ...extra });

test('nineteenth exercise puts the forbidden zone first and the signed bay later on the right', () => {
  assert.equal(DRIVING_EXERCISES.length, 23);
  assert.equal(DRIVING_EXERCISES[18].id, 'parking-choice');
  const zone = exercise.parkingChoice.forbidden, bay = exercise.parkingBay;
  assert.equal(exercise.parkingChoice.sign.extent, zone.depth);
  assert.ok(bay.z - bay.depth / 2 > zone.z + zone.depth / 2);
  assert.ok(bay.x < exercise.spawn.x);
  assert.equal(exercise.stages.at(-1).kind, 'park');
});
test('brief necessary stops are not treated as parking; a deliberate attempt is reported once', () => {
  const zone = exercise.parkingChoice.forbidden;
  let state;
  for (let i = 1; i <= 10; i++) {
    const result = assessParkingChoice(exercise, state, sample(i * .5, { x: zone.x, z: zone.z }), .5);
    state = result.state;
    assert.equal(Boolean(result.fault), i === 6);
  }
  assert.equal(assessParkingChoice(exercise, state, sample(6, { x: zone.x, z: zone.z, speed: 5 }), .5).state.illegalHold, 0);
});
test('waiting in the traffic lane alongside the sign does not falsely count as curb parking', () => {
  let state;
  for (let i = 0; i < 12; i++) {
    const result = assessParkingChoice(exercise, state, sample(i * .5, { z: 244 }), .5);
    assert.equal(result.fault, false); state = result.state;
  }
});
test('a sustained parking attempt in the first zone is an eliminating mistake, not success', () => {
  let s = stepDrivingSession(createDrivingSession('lesson', exercise), sample(0));
  for (let i = 1; i <= 8; i++) s = stepDrivingSession(s, sample(i * .5, { x: -205.1, z: 244 }));
  assert.equal(s.checkpoint, 0);
  assert.equal(s.faults.length, 1);
  assert.equal(s.faults[0].label, 'Stationnement dans la zone interdite');
  assert.equal(s.faults[0].critical, true);
  assert.match(s.faults[0].advice, /deuxième place/);
  assert.equal(drivingSessionPassed({ ...s, status: 'complete' }), false);
});
test('only a fully aligned car inside the second bay can validate parking', () => {
  const bay = exercise.parkingBay;
  assert.equal(fitsAllowedParking(exercise, sample(0, bay)), true);
  for (const extra of [{ x: bay.x + 1.2 }, { z: bay.z + 2 }, { heading: 0 }, { heading: Math.PI / 2 }]) {
    assert.equal(fitsAllowedParking(exercise, sample(0, { ...bay, ...extra })), false);
  }
  assert.equal(fitsAllowedParking(exercise, sample(0, exercise.parkingChoice.forbidden)), false);
});
test('parking requires its own hold, resets on movement, and cannot be validated in the first zone', () => {
  let s = { ...createDrivingSession('lesson', exercise), checkpoint: 1 };
  const bay = exercise.parkingBay;
  s = stepExerciseObjective(s, sample(0, bay), .5);
  assert.equal(s.hold, .5);
  s = stepExerciseObjective(s, sample(.5, { ...bay, speed: 3 }), .5);
  assert.equal(s.hold, 0);
  for (let i = 0; i < 3; i++) s = stepExerciseObjective(s, sample(i + 1, bay), .5);
  assert.equal(s.checkpoint, 1);
  s = stepExerciseObjective(s, sample(4, bay), .5);
  assert.equal(s.checkpoint, 2);
});
test('both modes finish successfully only by passing the sign and parking in the second bay', () => {
  for (const mode of ['lesson', 'exam']) {
    let s = stepDrivingSession(createDrivingSession(mode, exercise), sample(0));
    s = stepDrivingSession(s, sample(.5, { ...exercise.stages[0], speed: 8 }));
    for (let i = 2; i <= 6; i++) s = stepDrivingSession(s, sample(i * .5, exercise.parkingBay));
    assert.equal(s.status, 'complete');
    assert.equal(s.faults.length, 0);
    assert.equal(drivingSessionPassed(s), true);
  }
});
test('right indicator anticipates the southbound parking manoeuvre, then cancels', () => {
  assert.equal(schoolTurnSignal(exercise, exercise.spawn), null);
  assert.equal(schoolTurnSignal(exercise, { x: -202.35, z: 265 }), 'right');
  assert.equal(schoolTurnSignal(exercise, { x: -205.1, z: 274 }), null);
});
test('no-parking sign is blue/red with exactly one diagonal, not the no-stopping cross', () => {
  const calls = [];
  const context = Object.fromEntries(['beginPath', 'arc', 'fill', 'stroke', 'moveTo', 'lineTo'].map((method) => [method, (...args) => calls.push([method, ...args])]));
  drawNoParkingSign(context);
  assert.equal(calls.filter(([method]) => method === 'arc').length, 1);
  assert.equal(calls.filter(([method]) => method === 'lineTo').length, 1);
  assert.equal(context.fillStyle, '#1661b1');
  assert.equal(context.strokeStyle, '#d5242b');
});
