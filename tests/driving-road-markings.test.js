import test from 'node:test';
import assert from 'node:assert/strict';
import { keepOrdinaryRoadMarking, trimParkingSeparator } from '../src/games/drivingRoadMarkings.js';
const ring = { x: 200, z: 200, radius: 25.5 };
const bounds = { minX: 155, maxX: 245, minZ: 155, maxZ: 255 };
test('normal centre lines and parking bars do not cross the ring', () => {
  for (const [x, z] of [[200, 200], [200, 220], [220, 200], [196.4, 180]]) {
    assert.equal(keepOrdinaryRoadMarking(x, z, 2, .2, ring), false);
  }
  assert.equal(keepOrdinaryRoadMarking(200, 240, 2, .2, ring), true);
});
test('parking bars disappear throughout the closed exercise section, including approaches', () => {
  assert.equal(keepOrdinaryRoadMarking(205.3, 250, 1.65, .06, ring, bounds), false);
  assert.equal(keepOrdinaryRoadMarking(205.3, 280, 1.65, .06, ring, bounds), true);
});
test('long parking separators are trimmed instead of continuing across the exercise', () => {
  assert.deepEqual(trimParkingSeparator('z', 203.6, .14, [[100, 300]], ring, bounds), [[100, 155], [255, 300]]);
  assert.deepEqual(trimParkingSeparator('x', 100, .14, [[100, 300]], ring, bounds), [[100, 300]]);
});
