import * as THREE from 'three';

// A road marking, not an overlay: vehicles must occlude it naturally.
export function createDrivingGroundMarker(color) {
  const geometry = new THREE.RingGeometry(.94, 1, 64);
  geometry.rotateX(-Math.PI / 2);
  const marker = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    color, depthTest: true, depthWrite: true, side: THREE.DoubleSide,
  }));
  marker.name = 'driving-exercise-ground-zone';
  // The active stop target is repositioned on the first animation frame, after
  // the school scene has already been culled to its exercise bounds. Without
  // this flag, the zone culler sees this mesh at its default origin and
  // detaches it permanently before it can be placed on the road.
  marker.userData.dynamic = true;
  return marker;
}

export function placeDrivingGroundMarker(marker, x, z, radius, surfaceHeight) {
  const previous = marker.userData.groundPlacement;
  if (previous?.x === x && previous.z === z && previous.radius === radius && previous.surfaceHeight === surfaceHeight) return;
  // Conform the entire ring to the road, including sloped sections and bumps.
  const positions = marker.geometry.attributes.position;
  const base = new THREE.RingGeometry(.94, 1, 64);
  base.rotateX(-Math.PI / 2);
  const source = base.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const localX = source.getX(i) * radius, localZ = source.getZ(i) * radius;
    positions.setXYZ(i, localX, surfaceHeight(x + localX, z + localZ) + .065, localZ);
  }
  base.dispose();
  positions.needsUpdate = true;
  marker.geometry.computeBoundingSphere();
  marker.position.set(x, 0, z);
  marker.userData.groundPlacement = { x, z, radius, surfaceHeight };
}
