import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRoundaboutRoadSurface, ROUNDABOUT_ROAD_OFFSET } from '../src/games/roundaboutRoadSurface.js';

test('roundabout uses street asphalt on a flat surface, not a dark raised cylinder', () => {
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x252a32 });
  const elevation = (x, z) => x * .01 + z * .02;
  const road = createRoundaboutRoadSurface(asphalt, 200, 200, 25, elevation);
  assert.equal(road.geometry.type, 'PlaneGeometry');
  assert.equal(road.material, asphalt);
  assert.equal(road.receiveShadow, true);
  const positions = road.geometry.attributes.position, uv = road.geometry.attributes.uv;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) + road.position.x, z = positions.getZ(i) + road.position.z;
    assert.ok(Math.abs(positions.getY(i) - elevation(x, z) - ROUNDABOUT_ROAD_OFFSET) < 1e-5);
    assert.ok(Math.abs(uv.getX(i) - x / 28) < 1e-5);
    assert.ok(Math.abs(uv.getY(i) - z / 28) < 1e-5);
    assert.ok(road.geometry.attributes.normal.getY(i) > .99);
  }
  road.geometry.dispose(); asphalt.dispose();
});
