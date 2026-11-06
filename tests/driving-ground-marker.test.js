import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createDrivingGroundMarker, placeDrivingGroundMarker } from '../src/games/drivingGroundMarker.js';
import { cityRushCullToZone } from '../src/games/cityRushPerformance.js';

test('the live stop target survives zone culling before its first placement', () => {
  const scene = new THREE.Scene();
  const marker = createDrivingGroundMarker(0x47ffb0);
  scene.add(marker);

  // In the game the marker starts at (0, 0, 0), while the first exercise is
  // around (100, -250). It must survive culling until the animation loop moves
  // it to the current objective.
  const cull = cityRushCullToZone(scene, { minX: 89, maxX: 111, minZ: -292, maxZ: -215 });
  assert.equal(marker.userData.dynamic, true);
  assert.equal(marker.parent, scene, 'the live marker must not be detached at the origin');
  placeDrivingGroundMarker(marker, 97.65, -230, 4, () => 0);
  assert.equal(marker.parent, scene, 'the target remains part of the rendered scene');
  assert.equal(marker.position.x, 97.65);
  assert.equal(marker.position.z, -230);
  cull.restore();
  marker.geometry.dispose();
  marker.material.dispose();
});

test('exercise zones are flat ground rings with normal depth occlusion', () => {
  const marker = createDrivingGroundMarker(0x47ffb0);
  assert.equal(marker.geometry.type, 'RingGeometry');
  assert.equal(marker.userData.dynamic, true);
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
