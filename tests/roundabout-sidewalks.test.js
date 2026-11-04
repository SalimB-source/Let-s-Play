import test from 'node:test';
import assert from 'node:assert/strict';
import { rectangleTouchesRoundabout, sidewalkRangesOutsideRoundabout } from '../src/games/roundaboutSidewalks.js';
const ring = { x: 200, z: 200, radius: 25.25 };
test('sidewalk strips and kerbs are cut before the ring on all four approaches', () => {
  for (const axis of ['x', 'z']) for (const side of [-1, 1]) {
    const cross = 200 + side * 8.6;
    const ranges = sidewalkRangesOutsideRoundabout(axis, cross, 1.6, 150, 250, ring);
    assert.equal(ranges.length, 2);
    for (const [start, end] of ranges) {
      const x = axis === 'x' ? (start + end) / 2 : cross;
      const z = axis === 'z' ? (start + end) / 2 : cross;
      const distance = Math.hypot(Math.max(0, Math.abs(x - 200) - (axis === 'x' ? (end - start) / 2 : 1.6)), Math.max(0, Math.abs(z - 200) - (axis === 'z' ? (end - start) / 2 : 1.6)));
      assert.ok(distance >= ring.radius - 1e-9);
    }
  }
});
test('unrelated streets remain unchanged and fully covered sections disappear', () => {
  assert.deepEqual(sidewalkRangesOutsideRoundabout('x', 100, 1.6, 150, 250, ring), [[150, 250]]);
  assert.deepEqual(sidewalkRangesOutsideRoundabout('x', 208.6, 1.6, 190, 210, ring), []);
});
test('corner pavements and overlapping tiles are excluded, distant tiles retained', () => {
  for (const dx of [-8.6, 8.6]) for (const dz of [-8.6, 8.6]) {
    assert.equal(rectangleTouchesRoundabout(200 + dx, 200 + dz, 1.6, 1.6, ring), true);
  }
  assert.equal(rectangleTouchesRoundabout(208.6, 224.5, .74, .7, ring), true);
  assert.equal(rectangleTouchesRoundabout(208.6, 235, .74, .7, ring), false);
});
