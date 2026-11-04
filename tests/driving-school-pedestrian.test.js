import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { schoolPedestrianMotion, animateSchoolPedestrian } from '../src/games/drivingSchoolPedestrian.js';
import { ADDITIONAL_DRIVING_EXERCISES } from '../src/games/additionalDrivingExercises.js';
const actor = ADDITIONAL_DRIVING_EXERCISES.find((e) => e.id === 'pedestrian-crossing').priority.actors[0];

test('pedestrian walks right to left facing the movement, not backwards', () => {
  const motion = schoolPedestrianMotion(actor, 3, 0);
  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), motion.yaw);
  assert.ok(forward.dot(new THREE.Vector3(-1, 0, 0)) > .999);
  assert.ok(motion.x < actor.points[0].x);
  assert.equal(motion.walking, true);
});
test('steps continue until the pavement, not only until the lane is clear', () => {
  const motion = schoolPedestrianMotion(actor, 12.5, 0);
  assert.equal(motion.clear, true);
  assert.equal(motion.walking, true);
  assert.equal(schoolPedestrianMotion(actor, 14, 0).walking, false);
  assert.equal(schoolPedestrianMotion(actor, 3, null).stride, 0);
});
test('leg and arm swing follows distance travelled and returns to rest at the end', () => {
  const person = { group: new THREE.Group(), legs: [new THREE.Group(), new THREE.Group()], arms: [new THREE.Group(), new THREE.Group()] };
  const motion = schoolPedestrianMotion(actor, .2, 0);
  animateSchoolPedestrian(person, motion);
  assert.equal(person.group.rotation.y, motion.yaw);
  assert.equal(person.legs[0].rotation.x, -person.legs[1].rotation.x);
  assert.equal(person.arms[0].rotation.x, -person.legs[0].rotation.x * .65);
  animateSchoolPedestrian(person, schoolPedestrianMotion(actor, 20, 0));
  assert.equal(person.legs[0].rotation.x, 0);
});
