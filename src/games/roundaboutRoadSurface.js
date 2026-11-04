import * as THREE from 'three';

export const ROUNDABOUT_ROAD_OFFSET = .012;

// One flat junction surface, sharing the streets' asphalt and world-space UVs.
// No raised cylinder, dark sidewall or separate circular outline.
export function createRoundaboutRoadSurface(material, centerX, centerZ, halfExtent, elevation) {
  const geometry = new THREE.PlaneGeometry(halfExtent * 2, halfExtent * 2, 16, 16);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position, uv = geometry.attributes.uv;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) + centerX, z = positions.getZ(i) + centerZ;
    positions.setY(i, elevation(x, z) + ROUNDABOUT_ROAD_OFFSET);
    uv.setXY(i, x / 28, z / 28);
  }
  positions.needsUpdate = true; uv.needsUpdate = true;
  geometry.computeVertexNormals();
  const road = new THREE.Mesh(geometry, material);
  road.name = 'roundabout-continuous-asphalt';
  road.position.set(centerX, 0, centerZ); road.receiveShadow = true;
  return road;
}
