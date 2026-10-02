import * as THREE from 'three';
import { westernNightLightIntensity } from './mirageRules';

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
  const wood = material(0x65442e), trim = material(0xf4d49a);
  const awningMaterials = [material(0xb94d38), material(0xe5c188)];
  const porchMaterials = [material(0x704a32), material(0x815638)];
  const nightLights = [];
  const h = 3.4 + (index % 3) * 0.7;
  box(group, facade, side * 8.6, h / 2, 0, 4.8, h, 6);
  box(group, wood, side * 5.8, 0.15, 0, 1.4, 0.3, 6.5);
  box(group, wood, side * 5.8, 2.55, 0, 1.8, 0.18, 6.5);
  for (const z of [-2.7, 2.7]) box(group, trim, side * 5.2, 1.35, z, 0.15, 2.7, 0.15);
  box(group, wood, side * 6.14, 0.95, 0, 0.1, 1.9, 1);
  for (const z of [-1.95, 1.95]) {
    box(group, trim, side * 6.12, 1.5, z, 0.12, 1.4, 1.2);
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x273f49, emissive: 0xffa443, emissiveIntensity: 0.02,
      roughness: 0.42, metalness: 0.08,
    });
    const pane = box(group, windowMaterial, side * 6.04, 1.5, z, 0.08, 1.13, 0.95);
    pane.userData.glow = true;
    nightLights.push({ material: windowMaterial, kind: 'window' });
    box(group, trim, side * 5.98, 1.5, z, 0.07, 1.13, 0.07);
    box(group, trim, side * 6.0, 1.5, z, 0.08, 0.07, 0.98);
    box(group, wood, side * 5.97, 1.5, z, 0.09, 0.055, 0.88);
  }
  // Storefronts now read as lived-in western architecture, not plain cubes:
  // timber porch, striped canvas awning, swinging doors and a proper roofline.
  const roof = box(group, wood, side * 8.6, h + 0.23, 0, 5.35, 0.42, 6.45);
  roof.rotation.z = side * -0.035;
  box(group, trim, side * 5.92, 2.67, 0, 0.96, 0.17, 6.0);
  for (let stripe = 0; stripe < 10; stripe += 1) {
    box(group, awningMaterials[stripe % 2], side * 5.82, 2.52, -2.7 + stripe * 0.6, 0.85, 0.12, 0.58);
  }
  // A framed double door and porch boards face the track.
  box(group, wood, side * 6.02, 1.12, 0, 0.12, 2.24, 1.32);
  box(group, material(0x3e2922), side * 5.94, 1.07, -0.32, 0.07, 1.9, 0.58);
  box(group, material(0x503326), side * 5.94, 1.07, 0.32, 0.07, 1.9, 0.58);
  box(group, trim, side * 5.88, 1.03, 0, 0.08, 0.13, 1.2);
  for (let plank = 0; plank < 7; plank += 1) {
    box(group, porchMaterials[plank % 2], side * 5.47, 0.18, -2.7 + plank * 0.9, 1.35, 0.12, 0.84);
  }
  for (const z of [-2.72, 2.72]) {
    box(group, wood, side * 5.5, 1.24, z, 0.18, 2.48, 0.18);
    box(group, trim, side * 5.5, 2.48, z, 0.24, 0.13, 0.24);
    box(group, wood, side * 5.48, 0.62, z, 0.12, 0.1, 0.12);
  }
  box(group, trim, side * 6.1, h, 0, 0.22, 0.3, 6.3);
  // Warm wall lamps are dark at noon, then come alive as the sun drops.
  const lanternMaterial = new THREE.MeshStandardMaterial({
    color: 0xffc66e, emissive: 0xff8d28, emissiveIntensity: 0.015,
    roughness: 0.32, metalness: 0.08,
  });
  const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), lanternMaterial);
  lantern.position.set(side * 5.86, 2.98, 0.88);
  lantern.userData.glow = true;
  group.add(lantern);
  nightLights.push({ material: lanternMaterial, kind: 'lantern' });
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
  // A few unmistakable town silhouettes break up the roofline in the distance.
  if (index % 5 === 0 && side === -1) {
    const towerWood = material(0x4d3528);
    const tank = material(0x79513a);
    for (const x of [-0.42, 0.42]) {
      box(group, towerWood, -11.1 + x, 3.15, 0.35, 0.12, 5.8, 0.12);
      box(group, towerWood, -11.1 + x, 4.5, 0.35, 0.1, 3.1, 0.1);
    }
    const reservoir = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.72, 1.35, 9), tank);
    reservoir.position.set(-11.1, 5.25, 0.35);
    group.add(reservoir);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.87, 0.62, 9), wood);
    cap.position.set(-11.1, 6.23, 0.35);
    group.add(cap);
    box(group, trim, -11.1, 4.66, 0.35, 1.68, 0.12, 0.1);
  }
  if (index % 5 === 2 && side === 1) {
    const pole = material(0x69472f);
    const bladeMat = material(0xc9b38d);
    box(group, pole, 4.8, 3.15, -0.3, 0.18, 6.3, 0.18);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.23, 8, 6), trim);
    hub.position.set(4.8, 6.2, -0.3);
    group.add(hub);
    for (let blade = 0; blade < 4; blade += 1) {
      const vane = box(group, bladeMat, 4.8, 6.2, -0.3, 0.14, 1.65, 0.1);
      vane.rotation.z = blade * Math.PI / 2;
    }
  }
  group.userData.westernLights = nightLights;
  // Keep the saloon facades well outside the track's forward sightline so they
  // frame Dust Creek at the edges instead of blocking the sunset ahead.
  group.position.x = side * 8.5;
  group.position.z = 6 - index * 11 + (side === 1 ? -4 : 0);
  group.userData.speedFactor = 1;
  return group;
}

/** Turns the town's windows and porch lamps on gradually as dusk reaches Dust Creek. */
export function updateWesternLights(lights = [], progress = 0, time = 0, reducedMotion = false) {
  for (const light of lights) {
    light.material.emissiveIntensity = westernNightLightIntensity(light.kind, progress, time, reducedMotion);
  }
}
