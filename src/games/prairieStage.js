import * as THREE from 'three';

/** Dense wheat strips use instancing to keep the open landscape inexpensive. */
export function prairieField(index, side) {
  const group = new THREE.Group();
  const straw = new THREE.MeshStandardMaterial({ color: index % 2 ? 0xe0b649 : 0xf0cc72, roughness: 1 });
  const stalks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.055, 0.85, 0.055), straw, 180);
  const ears = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.15), straw, 180);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 180; i++) {
    const x = side * (6 + (i % 18) * 0.65);
    const z = Math.floor(i / 18) * 0.85 - 4;
    const height = 0.8 + Math.sin(i * 7.13 + index) * 0.13;
    dummy.position.set(x, height / 2, z);
    dummy.scale.set(1, height / 0.85, 1);
    dummy.updateMatrix(); stalks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = height;
    dummy.scale.set(0.7, 2, 0.7);
    dummy.updateMatrix(); ears.setMatrixAt(i, dummy.matrix);
  }
  group.add(stalks, ears);
  const soil = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.09, 9.6), new THREE.MeshStandardMaterial({ color: 0xa59b48, roughness: 1 }));
  soil.position.set(side * 11.5, -0.02, 0);
  group.add(soil);
  group.position.z = 6 - index * 10;
  group.userData.speedFactor = 1;
  return group;
}

export function prairieObstacle(kind) {
  const group = new THREE.Group();
  const straw = new THREE.MeshStandardMaterial({ color: 0xd2ae53, roughness: 1, flatShading: true });
  const rope = new THREE.MeshStandardMaterial({ color: 0x775c33, roughness: 1 });
  const width = kind === 'barrier' ? 4.02 : 0.9;
  const height = kind === 'barrier' ? 0.96 : 1.65;
  const bale = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.9), straw);
  bale.position.y = height / 2;
  group.add(bale);
  for (const x of [-width * 0.32, width * 0.32]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.075, height + 0.015, 0.925), rope);
    band.position.set(x, height / 2, 0);
    group.add(band);
  }
  return group;
}
