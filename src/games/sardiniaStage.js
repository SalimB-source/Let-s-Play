import * as THREE from 'three';

const material = color => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });
function box(parent, mat, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

/** A row of stacked wine barrels: low and jumpable, same clearance as every other stage's barrier. */
function barrelRow() {
  const group = new THREE.Group();
  const oak = material(0x8a5a34);
  const hoop = material(0x2e2620);
  const cork = material(0x6b4226);
  for (const x of [-1.55, 0, 1.55]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.92, 10), oak);
    barrel.position.set(x, 0.46, 0);
    group.add(barrel);
    for (const y of [0.18, 0.46, 0.74]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.465, 0.035, 4, 12), hoop);
      band.rotation.x = Math.PI / 2;
      band.position.set(x, y, 0);
      group.add(band);
    }
    const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8), cork);
    plug.rotation.z = Math.PI / 2;
    plug.position.set(x, 0.46, 0.47);
    group.add(plug);
  }
  // A plank laid across the tops hints at a makeshift dockside barricade.
  box(group, oak, 0, 0.95, 0, 3.7, 0.12, 0.5);
  return group;
}

/** Cypress in a terracotta pot: tall and narrow, dodge rather than jump — the "cactus" slot for this stage. */
function cypressTree() {
  const group = new THREE.Group();
  const terracotta = material(0xb5502e);
  const trunk = material(0x4a3324);
  const foliage = material(0x203d2b);
  const foliageLight = material(0x2c5138);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.24, 0.42, 8), terracotta);
  pot.position.y = 0.21;
  group.add(pot);
  box(group, trunk, 0, 0.58, 0, 0.14, 0.5, 0.14);
  for (let i = 0; i < 5; i++) {
    const radius = 0.34 - i * 0.045;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, 0.5, 7), i % 2 ? foliageLight : foliage);
    cone.position.y = 0.95 + i * 0.34;
    group.add(cone);
  }
  return group;
}

export function sardiniaObstacle(kind) {
  return kind === 'barrier' ? barrelRow() : cypressTree();
}

const SIGN_WORDS = ['TRATTORIA', 'CANTINA', 'PORTO', 'OSTERIA', 'DOGANA', 'VILLA'];
const FACADES = [0xe3b084, 0xe8d8b0, 0xd98e7c, 0xcfc79a];

/** Pastel coastal house: terracotta roof, shuttered windows and a hand-painted sign. */
export function sardiniaVillage(index, side) {
  const group = new THREE.Group();
  const facade = material(FACADES[index % FACADES.length]);
  const roof = material(0xa8492c);
  const shutter = material(0x3e6e7a);
  const stone = material(0xcabf9c);
  const h = 3.1 + (index % 3) * 0.55;
  box(group, facade, side * 8.6, h / 2, 0, 4.8, h, 6);
  box(group, stone, side * 8.6, 0.18, 0, 5, 0.35, 6.2);
  box(group, roof, side * 8.6, h + 0.22, 0, 5.3, 0.44, 6.6);
  box(group, roof, side * 8.6, h + 0.55, 0, 4.5, 0.28, 5.7);
  for (const z of [-1.9, 1.9]) {
    box(group, shutter, side * 6.02, h * 0.62, z, 0.1, 1.15, 0.85);
    box(group, stone, side * 6.1, h * 0.62, z, 0.06, 1.3, 1);
  }
  box(group, shutter, side * 6.05, 0.9, 0, 0.1, 1.55, 1.05);
  // A washing line strung between neighbouring facades — pure Mediterranean village flavour.
  if (index % 2 === 0) {
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 5.4, 4), material(0xe7ddc8));
    line.rotation.z = Math.PI / 2;
    line.position.set(side * 8.6, h + 0.05, 2.6);
    group.add(line);
    const laundryColors = [0xdedfe0, 0xb3554d, 0x4c7a8c, 0xe3c65b];
    for (let i = 0; i < 4; i++) {
      const cloth = box(group, material(laundryColors[i % laundryColors.length]), side * 8.6 - 2 + i * 1.3, h - 0.35, 2.6, 0.5, 0.7, 0.04);
      cloth.rotation.y = 0.08;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#2c231c'; ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#e8c98f'; ctx.lineWidth = 9; ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = '#f3dba0'; ctx.font = 'bold 50px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(SIGN_WORDS[index % SIGN_WORDS.length], 256, 64, 470);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  sign.position.set(side * 6.05, h - 0.7, 0);
  sign.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
  group.add(sign);
  // Move the houses to the roadside and stagger their rows to leave a clear
  // central view of the coastal sunset down the course.
  group.position.x = side * 8.5;
  group.position.z = 6 - index * 11 + (side === 1 ? -4 : 0);
  group.userData.speedFactor = 1;
  return group;
}
