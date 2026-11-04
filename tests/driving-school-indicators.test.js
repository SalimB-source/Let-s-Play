import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { schoolTurnSignal, installSchoolIndicators, updateSchoolIndicators } from '../src/games/drivingSchoolIndicators.js';
import { DRIVING_EXERCISES } from '../src/games/drivingExercises.js';
const get = (id) => DRIVING_EXERCISES.find((e) => e.id === id);

test('right turn indicator anticipates the junction and cancels after the turn', () => {
  const e = get('right-turn');
  assert.equal(schoolTurnSignal(e, e.spawn), null);
  assert.equal(schoolTurnSignal(e, { x: 302.35, z: -70 }), 'right');
  assert.equal(schoolTurnSignal(e, { x: 305, z: -96 }), 'right');
  assert.equal(schoolTurnSignal(e, { x: 318, z: -97.65 }), null);
});
test('straight-on roundabout signals right before exit, never left on entry', () => {
  const e = get('fr-giratory');
  assert.equal(schoolTurnSignal(e, e.spawn), null);
  assert.equal(schoolTurnSignal(e, { x: 218, z: 195 }), null);
  assert.equal(schoolTurnSignal(e, { x: 216, z: 189 }), 'right');
  assert.equal(schoolTurnSignal(e, { x: 202.35, z: 172 }), null);
});
test('obstacle signals left only when safe to depart, right before returning to its lane', () => {
  const e = get('blocked-lane'), state = { triggerTime: 0 };
  assert.equal(schoolTurnSignal(e, { x: -143.5, z: -302.35, time: 1 }, state), null);
  assert.equal(schoolTurnSignal(e, { x: -143.5, z: -302.35, time: 15 }, state), 'left');
  assert.equal(schoolTurnSignal(e, { x: -154, z: -297.65, time: 18 }, state), null);
  assert.equal(schoolTurnSignal(e, { x: -160, z: -297.65, time: 20 }, state), 'right');
  assert.equal(schoolTurnSignal(e, { x: -167, z: -302.35, time: 22 }, state), null);
});
test('straight approaches and pedestrian waiting do not turn an indicator on', () => {
  for (const id of ['control', 'bump', 'signal', 'stop', 'precision', 'fr-right', 'fr-yield', 'fr-stop', 'pedestrian-crossing', 'traffic-yield']) {
    const e = get(id);
    assert.equal(schoolTurnSignal(e, e.spawn), null);
  }
});
test('front, rear and side lamps blink together on one side then cancel', () => {
  const car = new THREE.Group(), body = new THREE.Group(); car.add(body); car.userData.body = body;
  const lamps = installSchoolIndicators(car);
  assert.equal(lamps.lamps.left.length, 3);
  assert.equal(lamps.lamps.right.length, 3);
  assert.equal(installSchoolIndicators(car), lamps);
  assert.equal(updateSchoolIndicators(car, 'right', 1).lit, true);
  assert.equal(lamps.materials.right.emissiveIntensity, 3);
  assert.equal(lamps.materials.left.emissiveIntensity, 0);
  assert.equal(updateSchoolIndicators(car, 'right', 1.4).lit, false);
  assert.equal(updateSchoolIndicators(car, 'right', 1.75).lit, true);
  assert.equal(updateSchoolIndicators(car, null, 2).lit, false);
  assert.equal(lamps.materials.right.emissiveIntensity, 0);
  car.traverse((object) => object.geometry?.dispose());
  Object.values(lamps.materials).forEach((material) => material.dispose());
});
