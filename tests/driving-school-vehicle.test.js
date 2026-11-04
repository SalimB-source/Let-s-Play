import test from 'node:test';
import assert from 'node:assert/strict';
import { drivingSchoolVehicleTuning, drivingSchoolYawRate } from '../src/games/drivingSchoolVehicle.js';
const tuning = { maxSpeed: 35, acceleration: 6, reverseMaxSpeed: 7, brake: true, dt: .1 };
test('all school sessions use a slower vehicle with gentle acceleration and reverse', () => {
  const result = drivingSchoolVehicleTuning(tuning, true);
  assert.equal(result.maxSpeed * 3.6, 50);
  assert.equal(result.acceleration, 2);
  assert.equal(result.reverseMaxSpeed, 2);
  assert.equal(result.brake, true);
  assert.equal(result.dt, .1);
  assert.equal(tuning.maxSpeed, 35);
});
test('free driving keeps its original tuning', () => {
  assert.equal(drivingSchoolVehicleTuning(tuning, false), tuning);
});
test('school tuning never makes an already slower car faster', () => {
  const slow = { maxSpeed: 4, acceleration: 1, reverseMaxSpeed: 1 };
  assert.deepEqual(drivingSchoolVehicleTuning(slow, true), slow);
});

test('school steering is fifteen percent easier in either direction and in reverse', () => {
  for (const rate of [-1, -.3, 0, .3, 1]) {
    assert.equal(drivingSchoolYawRate(rate, true), rate * 1.15);
    assert.equal(drivingSchoolYawRate(rate, false), rate);
  }
});
