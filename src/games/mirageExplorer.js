// Voxel horse + rider model shared by the race (MirageWorld) and the
// rotating skin previews (MirageSkinPreview). Pure three.js, no React.
//
// Palette slots (arrays of 0xRRGGBB):
//   [coat, mane, cloth, trim, head, hat?, markings?]
//   - coat      robe du cheval (corps, encolure, tête, jambes)
//   - mane      crinière, queue, sabots, bottes et rênes
//   - cloth     tunique, cape et tapis de selle
//   - trim      selle, bandeau du chapeau, liseré de la cape
//   - head      tête / foulard du cavalier
//   - hat       chapeau (optionnel : sinon cuir dérivé de la robe, comme avant)
//   - markings  liste en tête + balzanes (optionnel : sinon = robe, invisible)
//
// Shop skins carry their own details: Gyro's green steel balls and goggles,
// or Cloud's chocobo, spiky hair and sword. Their materials stay independent
// from paintModel; the chocobo replaces the base horse mount entirely.
import * as THREE from 'three';
import { CHARACTER_ACCESSORIES, CHARACTER_PALETTES } from './mirageCharacters.js';

export const PALETTE_SLOTS = 7;
const LEATHER = 0x5c3318;
export const STEEL_BALL_GREEN = 0x46e04c;

export function block(geometry, material, parent, position, scale = null) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (scale) mesh.scale.set(...scale);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

/** Expand a 5/6/7-slot palette into the full 7 slots used by the model. */
export function normalizePalette(palette) {
  const source = Array.isArray(palette) && palette.length >= 5 ? palette : CHARACTER_PALETTES[0];
  const [coat, mane, cloth, trim, head] = source;
  const hat = source[5] ?? new THREE.Color(coat).lerp(new THREE.Color(LEATHER), 0.55).getHex();
  const markings = source[6] ?? coat;
  return [coat, mane, cloth, trim, head, hat, markings];
}

/** Shop accessory id for a palette, or null for the free riders. */
export function accessoriesForPalette(palette) {
  if (!Array.isArray(palette) || palette.length < 5) return null;
  const index = CHARACTER_PALETTES.findIndex((entry) => (
    Array.isArray(entry) && entry.length >= 5 && entry.slice(0, 5).every((color, slot) => Number(color) === Number(palette[slot]))
  ));
  return index >= 0 ? (CHARACTER_ACCESSORIES[index] || null) : null;
}

export function makeExplorer(rival = false, palette = null, accessories = undefined) {
  const player = new THREE.Group();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const mat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true });
  const baseColors = palette || CHARACTER_PALETTES[Number(rival) || 0];
  const full = normalizePalette(baseColors);
  const [coat, mane, cloth, trim, hood, hatMat, marks] = full.map(mat);

  // Keep the original horse in its own group so a shop skin can swap the
  // mount for a chocobo without changing the common rider / race animations.
  const horseMount = new THREE.Group();
  horseMount.name = 'horse-mount';
  player.add(horseMount);
  block(cube, coat, horseMount, [0, 0.95, 0], [0.82, 0.83, 1.65]);
  const neck = block(cube, coat, horseMount, [0, 1.48, -0.64], [0.46, 1.02, 0.52]);
  neck.rotation.x = -0.25;
  block(cube, coat, horseMount, [0, 1.95, -0.92], [0.46, 0.46, 0.82]);
  // Liste (bande claire sur le chanfrein) — même couleur que la robe par défaut.
  block(cube, marks, horseMount, [0, 1.97, -1.336], [0.15, 0.36, 0.02]);
  block(cube, marks, horseMount, [0, 2.1, -1.1], [0.15, 0.02, 0.46]);
  block(cube, mane, horseMount, [0, 1.61, -0.38], [0.18, 0.96, 0.18]);
  for (const x of [-0.17, 0.17]) block(cube, coat, horseMount, [x, 2.26, -0.78], [0.12, 0.32, 0.18]);
  const horseLegs = [];
  for (const z of [-0.56, 0.56]) for (const x of [-0.29, 0.29]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.85, z);
    horseMount.add(leg);
    block(cube, coat, leg, [0, -0.35, 0], [0.2, 0.7, 0.23]);
    // Balzane (chaussette) au-dessus du sabot.
    block(cube, marks, leg, [0, -0.53, 0], [0.215, 0.26, 0.245]);
    block(cube, mane, leg, [0, -0.73, -0.03], [0.23, 0.17, 0.3]);
    horseLegs.push(leg);
  }
  const horseTail = block(cube, mane, horseMount, [0, 0.77, 0.91], [0.23, 0.8, 0.22]);
  horseTail.rotation.x = -0.35;
  block(cube, cloth, horseMount, [0, 1.33, 0.05], [0.96, 0.14, 0.95]);
  block(cube, trim, horseMount, [0, 1.43, 0.15], [0.66, 0.16, 0.6]);

  const rider = new THREE.Group();
  rider.position.y = 1.4;
  player.add(rider);
  const riderBody = new THREE.Group();
  riderBody.position.y = -1.4;
  rider.add(riderBody);
  block(cube, cloth, riderBody, [0, 1.85, 0.05], [0.6, 0.75, 0.43]);
  const cape = block(cube, cloth, riderBody, [0, 1.7, 0.34], [0.72, 0.87, 0.13]);
  block(cube, trim, riderBody, [0, 1.72, 0.42], [0.12, 0.57, 0.03]);
  block(cube, hood, riderBody, [0, 2.38, 0.02], [0.52, 0.46, 0.52]);

  // Cowboy hat (Stetson: wide curled brim + trim hatband + pinched cattleman crown).
  // It's a separate group so Cloud can lose the hat and get his signature spikes.
  const hat = new THREE.Group();
  hat.name = 'cowboy-hat';
  riderBody.add(hat);
  block(cube, hatMat, hat, [0, 2.59, 0.02], [0.98, 0.06, 0.94]);
  block(cube, hatMat, hat, [0, 2.58, 0.02], [0.74, 0.05, 1.08]);
  const leftBrim = block(cube, hatMat, hat, [-0.5, 2.65, 0.02], [0.16, 0.07, 0.86]);
  leftBrim.rotation.z = -0.46;
  const rightBrim = block(cube, hatMat, hat, [0.5, 2.65, 0.02], [0.16, 0.07, 0.86]);
  rightBrim.rotation.z = 0.46;
  block(cube, trim, hat, [0, 2.65, 0.02], [0.6, 0.09, 0.62]);
  block(cube, hatMat, hat, [0, 2.77, 0.02], [0.56, 0.22, 0.58]);
  block(cube, hatMat, hat, [-0.15, 2.91, 0.02], [0.21, 0.11, 0.52]);
  block(cube, hatMat, hat, [0.15, 2.91, 0.02], [0.21, 0.11, 0.52]);

  const arms = [];
  for (const x of [-0.43, 0.43]) {
    block(cube, mane, riderBody, [x, 1.16, 0.05], [0.22, 0.57, 0.32]);
    const arm = block(cube, cloth, riderBody, [x * 0.8, 1.9, -0.25], [0.2, 0.5, 0.22]);
    arm.rotation.x = -0.8;
    arms.push(arm);
    block(cube, mane, riderBody, [x * 0.65, 1.72, -0.64], [0.035, 0.035, 0.7]);
  }
  player.userData.parts = {
    horseMount, horseLegs, horseTail,
    legs: horseLegs, tail: horseTail,
    cape, rider, riderBody, arms, hat,
  };
  player.userData.materials = [coat, mane, cloth, trim, hood, hatMat, marks];
  player.userData.hatMaterial = hatMat;
  player.userData.basePalette = baseColors;
  player.userData.painting = baseColors;
  player.userData.accessoryKind = null;
  player.userData.accessoryGroup = null;
  const kind = accessories !== undefined ? accessories : accessoriesForPalette(baseColors);
  setExplorerAccessories(player, kind);
  return player;
}

/** Recolour an existing model in place (skins switch without rebuilding). */
export function paintModel(model, colors) {
  const materials = model.userData.materials;
  if (!materials || !colors) return;
  normalizePalette(colors).forEach((color, index) => materials[index]?.color.set(color));
  setExplorerAccessories(model, accessoriesForPalette(colors));
}

/**
 * Attach or replace shop accessories / mounts. Cloud's chocobo swaps out the
 * horse and cowboy hat; Gyro keeps the regular horse and adds his own gear.
 */
export function setExplorerAccessories(model, kind) {
  const next = kind || null;
  if ((model.userData.accessoryKind || null) === next) return;
  detachAccessories(model);
  const parts = model.userData.parts || {};
  if (parts.horseMount) parts.horseMount.visible = true;
  if (parts.hat) parts.hat.visible = true;
  if (parts.cape) parts.cape.visible = true;
  if (parts.horseLegs) parts.legs = parts.horseLegs;
  if (parts.horseTail) parts.tail = parts.horseTail;
  parts.wings = [];
  parts.chocobo = null;
  parts.busterSword = null;
  model.userData.accessoryKind = next;
  if (next === 'gyro') attachGyroAccessories(model);
  if (next === 'cloud-chocobo') attachCloudChocobo(model);
}

function detachAccessories(model) {
  const group = model.userData.accessoryGroup;
  if (!group) {
    model.userData.accessoryKind = null;
    return;
  }
  const loose = group.userData.loose || [];
  for (const mesh of loose) {
    mesh.parent?.remove(mesh);
  }
  group.parent?.remove(group);
  const seen = new Set();
  const drop = (resource) => {
    if (!resource || seen.has(resource)) return;
    seen.add(resource);
    resource.dispose?.();
  };
  for (const mesh of loose) {
    drop(mesh.geometry);
    drop(mesh.material);
    mesh.traverse?.((node) => {
      drop(node.geometry);
      drop(node.material);
    });
  }
  group.traverse((node) => {
    drop(node.geometry);
    if (Array.isArray(node.material)) node.material.forEach(drop);
    else drop(node.material);
  });
  model.userData.accessoryGroup = null;
  model.userData.accessoryKind = null;
}

function attachGyroAccessories(model) {
  const { riderBody, cape } = model.userData.parts || {};
  if (!riderBody) return;
  const group = new THREE.Group();
  group.name = 'gyro-accessories';
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const loose = [];

  // Steel balls — Gyro's signature. Real spheres, oversized, emissive green so
  // they read even on the tiny shop thumbnail and from behind in a race.
  const ballMat = new THREE.MeshStandardMaterial({
    color: STEEL_BALL_GREEN,
    roughness: 0.16,
    metalness: 0.78,
    emissive: 0x0c5a18,
    emissiveIntensity: 0.55,
  });
  const gleamMat = new THREE.MeshBasicMaterial({ color: 0xd6ff9c });
  const sphere = new THREE.SphereGeometry(0.24, 16, 12);
  const gleamGeo = new THREE.SphereGeometry(0.07, 8, 8);
  const ballSpots = [
    [-0.68, 1.72, -0.78],
    [0.72, 1.58, -0.82],
  ];
  for (const pos of ballSpots) {
    const ball = new THREE.Mesh(sphere, ballMat);
    ball.position.set(...pos);
    ball.userData.gyroAccessory = 'steel-ball';
    const gleam = new THREE.Mesh(gleamGeo, gleamMat);
    gleam.position.set(-0.08, 0.11, 0.12);
    ball.add(gleam);
    group.add(ball);
  }

  // Goggles on the fedora (silver rims, grey glass) — another Gyro tell.
  const metal = new THREE.MeshStandardMaterial({ color: 0xc5cdd4, metalness: 0.85, roughness: 0.28, flatShading: true });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x6d7c8c, metalness: 0.4, roughness: 0.22, emissive: 0x1a2430, emissiveIntensity: 0.28, flatShading: true,
  });
  block(cube, metal, group, [0, 2.74, 0.02], [0.64, 0.07, 0.66]);
  for (const x of [-0.17, 0.17]) {
    const rim = block(cube, metal, group, [x, 2.76, -0.30], [0.24, 0.18, 0.12]);
    rim.userData.gyroAccessory = 'goggles';
    const lens = block(cube, glass, group, [x, 2.76, -0.36], [0.18, 0.13, 0.06]);
    lens.userData.gyroAccessory = 'goggles';
  }
  block(cube, metal, group, [0, 2.75, -0.32], [0.1, 0.06, 0.08]);

  // Blonde hair spilling from under the hat, like the reference.
  const hair = new THREE.MeshStandardMaterial({ color: 0xf0d48a, roughness: 0.72, flatShading: true });
  block(cube, hair, group, [-0.34, 2.2, 0.14], [0.2, 0.62, 0.3]);
  block(cube, hair, group, [0.34, 2.2, 0.14], [0.2, 0.62, 0.3]);
  block(cube, hair, group, [0, 2.16, 0.3], [0.5, 0.3, 0.24]);

  riderBody.add(group);

  // Green cape overlay on the existing cape so it flaps with the gallop and
  // reads from the race camera (which sits behind the rider).
  if (cape) {
    const capeMat = new THREE.MeshStandardMaterial({ color: 0x2f9a44, roughness: 0.62, flatShading: true });
    const overlay = new THREE.Mesh(cube, capeMat);
    overlay.scale.set(0.86, 1.05, 0.16);
    overlay.position.set(0, 0, 0.09);
    overlay.userData.gyroAccessory = 'cape';
    cape.add(overlay);
    loose.push(overlay);
  }

  group.userData.loose = loose;
  model.userData.accessoryGroup = group;
  model.userData.accessoryKind = 'gyro';
}

function attachCloudChocobo(model) {
  const parts = model.userData.parts || {};
  const { riderBody } = parts;
  if (!riderBody || !parts.horseMount) return;

  const group = new THREE.Group();
  group.name = 'cloud-chocobo-mount';
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.78, flatShading: true, ...extra });
  const yellow = mat(0xffd23e);
  const golden = mat(0xf8bb2e);
  const featherLight = mat(0xffea72);
  const orange = mat(0xef8728);
  const beak = mat(0xf49a32);
  const eyeWhite = mat(0xfff5dc);
  const eyeDark = mat(0x21182a, { roughness: 0.42 });
  const saddleLeather = mat(0x70452b);
  const saddleBlue = mat(0x244f9b);
  const saddleTrim = mat(0x80b7eb);
  const hair = mat(0xffdf63);
  const hairLight = mat(0xffed91);
  const face = mat(0x2785e8, { emissive: 0x09254c, emissiveIntensity: 0.2 });
  const armor = mat(0xb9c7d6, { metalness: 0.62, roughness: 0.34 });
  const blade = mat(0xaebdce, { metalness: 0.78, roughness: 0.26 });
  const bladeEdge = mat(0xe1eaf2, { metalness: 0.7, roughness: 0.22 });
  const swordGrip = mat(0x6a3b27);

  // Voxel chocobo: round golden body, long neck, orange beak and a three-feather crest.
  const body = block(cube, yellow, group, [0, 1.02, 0.02], [1.08, 0.86, 1.48]);
  body.userData.cloudAccessory = 'chocobo-body';
  block(cube, golden, group, [0, 1.61, -0.68], [0.62, 1.02, 0.58]);
  block(cube, yellow, group, [0, 2.16, -1.04], [0.77, 0.64, 0.68]);
  // Two layered parts give the beak a clear, bird-like profile from either side.
  block(cube, beak, group, [0, 1.99, -1.47], [0.5, 0.22, 0.42]);
  block(cube, orange, group, [0, 1.87, -1.43], [0.39, 0.1, 0.34]);
  for (const side of [-1, 1]) {
    block(cube, eyeWhite, group, [side * 0.398, 2.19, -1.11], [0.075, 0.19, 0.19]);
    block(cube, eyeDark, group, [side * 0.443, 2.19, -1.15], [0.035, 0.115, 0.09]);
    block(cube, orange, group, [side * 0.39, 2.34, -1.1], [0.09, 0.06, 0.18]);
  }
  for (const [x, y, z, lean] of [
    [-0.2, 2.58, -1.0, -0.32],
    [0, 2.68, -0.94, 0.02],
    [0.2, 2.58, -1.0, 0.32],
  ]) {
    const plume = block(cube, featherLight, group, [x, y, z], [0.16, 0.52, 0.2]);
    plume.rotation.z = lean;
  }

  const wings = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.Group();
    wing.name = side < 0 ? 'chocobo-left-wing' : 'chocobo-right-wing';
    wing.position.set(side * 0.46, 1.24, 0.04);
    group.add(wing);
    const panel = block(cube, golden, wing, [side * 0.09, 0, 0], [0.3, 0.57, 0.82]);
    panel.rotation.z = -side * 0.12;
    for (const featherIndex of [-1, 0, 1]) {
      const feather = block(cube, featherLight, wing, [side * 0.13, -0.06, featherIndex * 0.2], [0.19, 0.24, 0.16]);
      feather.rotation.z = -side * 0.12;
    }
    wings.push(wing);
  }

  // Two springy orange legs with broad, three-toed feet.
  const chocoboLegs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.name = side < 0 ? 'chocobo-left-leg' : 'chocobo-right-leg';
    leg.position.set(side * 0.29, 0.74, 0.34);
    group.add(leg);
    block(cube, orange, leg, [0, -0.27, 0], [0.15, 0.56, 0.16]);
    block(cube, beak, leg, [0, -0.54, -0.1], [0.31, 0.14, 0.38]);
    for (const toe of [-1, 0, 1]) {
      block(cube, beak, leg, [toe * 0.105, -0.55, -0.25], [0.095, 0.1, 0.22]);
    }
    chocoboLegs.push(leg);
  }

  // Tail feathers angle up behind the saddle and wag with the existing gallop animation.
  const chocoboTail = new THREE.Group();
  chocoboTail.name = 'chocobo-tail';
  chocoboTail.position.set(0, 1.23, 0.69);
  group.add(chocoboTail);
  for (const [x, y, color] of [[-0.16, 0, golden], [0, 0.08, featherLight], [0.16, 0, yellow]]) {
    const feather = block(cube, color, chocoboTail, [x, y, 0.31], [0.17, 0.2, 0.66]);
    feather.rotation.x = -0.42;
  }

  // Saddle and harness. The blue seat ties the mount to Cloud's outfit.
  block(cube, saddleLeather, group, [0, 1.45, 0.1], [0.88, 0.16, 0.77]);
  block(cube, saddleBlue, group, [0, 1.55, 0.08], [0.94, 0.13, 0.72]);
  block(cube, saddleTrim, group, [0, 1.62, 0.08], [0.62, 0.035, 0.55]);

  // Cloud: blue SOLDIER outfit, bright eyes and unmistakable spiky blond hair.
  const loose = [];
  const hairGroup = new THREE.Group();
  hairGroup.name = 'cloud-spiky-hair';
  riderBody.add(hairGroup);
  loose.push(hairGroup);
  const hairCap = block(cube, hair, hairGroup, [0, 2.59, 0.015], [0.64, 0.2, 0.62]);
  hairCap.userData.cloudAccessory = 'cloud-hair';
  for (const [x, y, z, lean, scale] of [
    [-0.23, 2.75, -0.04, -0.34, [0.2, 0.42, 0.25]],
    [-0.08, 2.84, -0.06, -0.12, [0.21, 0.55, 0.24]],
    [0.1, 2.86, -0.06, 0.16, [0.2, 0.55, 0.24]],
    [0.24, 2.72, 0.02, 0.38, [0.2, 0.42, 0.25]],
    [0.02, 2.72, 0.22, 0.04, [0.2, 0.4, 0.22]],
  ]) {
    const spike = block(cube, hair, hairGroup, [x, y, z], scale);
    spike.rotation.z = lean;
  }
  block(cube, hairLight, hairGroup, [0, 2.49, -0.24], [0.55, 0.16, 0.13]);
  for (const side of [-1, 1]) {
    block(cube, face, hairGroup, [side * 0.115, 2.38, -0.247], [0.075, 0.055, 0.035]);
  }

  // One metal pauldron and the giant Buster Sword, strapped across Cloud's back.
  const pauldron = block(cube, armor, riderBody, [0.39, 2.04, 0.04], [0.35, 0.29, 0.48]);
  pauldron.rotation.z = -0.16;
  loose.push(pauldron);
  const sword = new THREE.Group();
  sword.name = 'buster-sword';
  sword.position.set(0.43, 2.03, 0.49);
  sword.rotation.z = 0.34;
  sword.userData.baseRotationZ = sword.rotation.z;
  riderBody.add(sword);
  parts.busterSword = sword;
  loose.push(sword);
  const bladeMesh = block(cube, blade, sword, [0, 0.5, 0], [0.34, 1.3, 0.105]);
  bladeMesh.userData.cloudAccessory = 'buster-sword';
  block(cube, bladeEdge, sword, [0.13, 0.5, 0.057], [0.035, 1.15, 0.018]);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.36, 4), blade);
  tip.position.set(0, 1.3, 0);
  tip.rotation.z = Math.PI;
  sword.add(tip);
  block(cube, armor, sword, [0, -0.18, 0], [0.62, 0.12, 0.18]);
  block(cube, swordGrip, sword, [0, -0.48, 0], [0.14, 0.48, 0.15]);
  block(cube, armor, sword, [0, -0.72, 0], [0.23, 0.12, 0.2]);

  group.userData.loose = loose;
  model.add(group);
  parts.horseMount.visible = false;
  parts.hat.visible = false;
  if (parts.cape) parts.cape.visible = false;
  parts.legs = chocoboLegs;
  parts.tail = chocoboTail;
  parts.wings = wings;
  parts.chocobo = group;
  model.userData.accessoryGroup = group;
  model.userData.accessoryKind = 'cloud-chocobo';
}

/** Free GPU resources of a model built by makeExplorer. */
export function disposeExplorer(model) {
  detachAccessories(model);
  const seen = new Set();
  model.traverse((node) => {
    if (!node.isMesh) return;
    if (node.geometry && !seen.has(node.geometry)) { seen.add(node.geometry); node.geometry.dispose(); }
    if (node.material && !seen.has(node.material)) { seen.add(node.material); node.material.dispose(); }
  });
}
