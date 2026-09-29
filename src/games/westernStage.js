import * as THREE from 'three';

const material = color => new THREE.MeshStandardMaterial({ color, roughness: 0.92, flatShading: true });
function box(parent, mat, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function westernObstacle(kind) {
  const group = new THREE.Group();
  const wood = material(0x995b32), dark = material(0x49312a), brass = material(0xe6b85c);
  if (kind === 'barrier') {
    // A low fence across two lanes: identical jump clearance to the desert block.
    for (const x of [-1.75, 0, 1.75]) box(group, dark, x, 0.48, 0, 0.22, 0.96, 0.3);
    for (const y of [0.32, 0.83]) box(group, wood, 0, y, 0, 4.02, 0.23, 0.24);
    for (const x of [-1.65, 1.65]) {
      const cap = box(group, brass, x, 1.02, 0, 0.28, 0.13, 0.32);
      cap.rotation.z = 0.1;
    }
  } else {
    // Tall cargo stack: dodge rather than jump.
    for (const y of [0.42, 1.24]) {
      box(group, wood, 0, y, 0, 0.87, 0.8, 0.8);
      for (const x of [-0.32, 0.32]) box(group, dark, x, y, 0.42, 0.1, 0.8, 0.05);
      for (const dy of [-0.3, 0.3]) box(group, brass, 0, y + dy, 0.43, 0.86, 0.08, 0.05);
      const brace = box(group, dark, 0, y, 0.45, 0.08, 0.9, 0.05);
      brace.rotation.z = -0.75;
    }
  }
  return group;
}

export function westernBuilding(index, side) {
  const group = new THREE.Group();
  const facade = material([0x985942, 0x668480, 0xc29458, 0x88719b][index % 4]);
  const wood = material(0x65442e), trim = material(0xf4d49a), glass = material(0x273f49);
  const h = 3.4 + (index % 3) * 0.7;
  box(group, facade, side * 8.6, h / 2, 0, 4.8, h, 6);
  box(group, wood, side * 5.8, 0.15, 0, 1.4, 0.3, 6.5);
  box(group, wood, side * 5.8, 2.55, 0, 1.8, 0.18, 6.5);
  for (const z of [-2.7, 2.7]) box(group, trim, side * 5.2, 1.35, z, 0.15, 2.7, 0.15);
  box(group, wood, side * 6.14, 0.95, 0, 0.1, 1.9, 1);
  for (const z of [-1.95, 1.95]) {
    box(group, trim, side * 6.12, 1.5, z, 0.12, 1.4, 1.2);
    box(group, glass, side * 6.04, 1.5, z, 0.08, 1.13, 0.95);
    box(group, trim, side * 5.98, 1.5, z, 0.07, 1.13, 0.07);
  }
  box(group, trim, side * 6.1, h, 0, 0.22, 0.3, 6.3);
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#38251e'; ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#dfb878'; ctx.lineWidth = 9; ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = '#ffe1a0'; ctx.font = 'bold 52px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(['SALOON', 'SHERIFF', 'GENERAL STORE', 'HOTEL', 'BANK', 'STABLES'][index % 6], 256, 64, 470);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 1.05), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  sign.position.set(side * 6.02, h - 0.7, 0);
  sign.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
  group.add(sign);
  group.position.z = 6 - index * 11;
  group.userData.speedFactor = 1;
  return group;
}
