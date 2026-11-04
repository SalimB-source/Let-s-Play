import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { DRIVING_EXERCISES } from '../src/games/drivingExercises.js';
import { isExerciseSign, isExerciseSignal, addTeachingBarGlow } from '../src/games/drivingTeachingGlow.js';
test('only signs in the exercise area are highlighted, never the whole city', () => {
  const exercise = DRIVING_EXERCISES.find(e => e.id === 'bump');
  assert.equal(isExerciseSign(exercise, -192.1, -25), true);
  assert.equal(isExerciseSign(exercise, 200, 200), false);
  assert.equal(isExerciseSign(null, 0, 0), false);
});
test('signal glow selects the relevant intersection, axis and approaching side', () => {
  for (const exercise of DRIVING_EXERCISES) for (const stage of exercise.stages) {
    const signal = stage.signal; if (!signal) continue;
    const center = (signal.axis === 'x' ? signal.ix : signal.iz) * 100;
    const spec = { ...signal, [signal.axis]: center + Math.sign(stage[signal.axis] - center) * 18 };
    assert.equal(isExerciseSignal(exercise, spec), true, exercise.id);
    assert.equal(isExerciseSignal(exercise, { ...spec, [signal.axis]: center - Math.sign(stage[signal.axis] - center) * 18 }), false);
    assert.equal(isExerciseSignal(exercise, { ...spec, ix: 99 }), false);
  }
  assert.equal(isExerciseSignal(null, {}), false);
});
test('signal support glow uses lightweight transparent shells and does not alter lamps', () => {
  const scene = new THREE.Scene();
  const glow = addTeachingBarGlow(scene, new THREE.Vector3(0, 6, 0), new THREE.Vector3(5, 6, 0));
  assert.equal(glow.children.length, 3); assert.equal(glow.position.x, 2.5);
  for (const mesh of glow.children) {
    assert.equal(mesh.material.depthWrite, false); assert.equal(mesh.material.depthTest, true);
    assert.equal(mesh.material.transparent, true); assert.equal(mesh.material.color.getHex(), 0xffd226);
    mesh.geometry.dispose(); mesh.material.dispose();
  }
});
