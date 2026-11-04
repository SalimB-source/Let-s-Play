import test from 'node:test';
import assert from 'node:assert/strict';
import { createDrivingGroundMarker, placeDrivingGroundMarker } from '../src/games/drivingGroundMarker.js';

test('exercise zones are flat ground rings with normal depth occlusion', () => {
  const marker = createDrivingGroundMarker(0x47ffb0);
  assert.equal(marker.geometry.type, 'RingGeometry');
  assert.equal(marker.material.depthTest, true);
  assert.equal(marker.material.depthWrite, true);
  assert.equal(marker.renderOrder, 0);
  placeDrivingGroundMarker(marker, 100, 200, 4, () => 0);
  const positions = marker.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    assert.ok(Math.abs(positions.getY(i) - .065) < 1e-6);
    assert.ok(Math.hypot(positions.getX(i), positions.getZ(i)) <= 4.000001);
  }
  marker.geometry.dispose(); marker.material.dispose();
});

test('the full zone follows sloping road height and does not accumulate scaling', () => {
  const marker = createDrivingGroundMarker(0x64b7ff);
  const road = (x, z) => x * .1 + z * .05;
  placeDrivingGroundMarker(marker, 10, 20, 2, road);
  placeDrivingGroundMarker(marker, 30, 40, 5, road);
  const positions = marker.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    assert.ok(Math.abs(positions.getY(i) - road(30 + positions.getX(i), 40 + positions.getZ(i)) - .065) < 1e-5);
    assert.ok(Math.hypot(positions.getX(i), positions.getZ(i)) <= 5.000001);
  }
  assert.equal(marker.position.x, 30);
  assert.equal(marker.position.z, 40);
  marker.geometry.dispose(); marker.material.dispose();
});
