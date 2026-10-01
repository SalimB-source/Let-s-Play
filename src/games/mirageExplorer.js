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
// Shop skins carry extra accessories (Gyro : steel balls vertes, lunettes,
// cape verte) that stay on their own materials so paintModel never recolours
// them. They are attached / detached when the palette matches a shop character.
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

  block(cube, coat, player, [0, 0.95, 0], [0.82, 0.83, 1.65]);
  const neck = block(cube, coat, player, [0, 1.48, -0.64], [0.46, 1.02, 0.52]);
  neck.rotation.x = -0.25;
  block(cube, coat, player, [0, 1.95, -0.92], [0.46, 0.46, 0.82]);
  // Liste (bande claire sur le chanfrein) — même couleur que la robe par défaut.
  block(cube, marks, player, [0, 1.97, -1.336], [0.15, 0.36, 0.02]);
  block(cube, marks, player, [0, 2.1, -1.1], [0.15, 0.02, 0.46]);
  block(cube, mane, player, [0, 1.61, -0.38], [0.18, 0.96, 0.18]);
  for (const x of [-0.17, 0.17]) block(cube, coat, player, [x, 2.26, -0.78], [0.12, 0.32, 0.18]);
  const legs = [];
  for (const z of [-0.56, 0.56]) for (const x of [-0.29, 0.29]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.85, z);
    player.add(leg);
    block(cube, coat, leg, [0, -0.35, 0], [0.2, 0.7, 0.23]);
    // Balzane (chaussette) au-dessus du sabot.
    block(cube, marks, leg, [0, -0.53, 0], [0.215, 0.26, 0.245]);
    block(cube, mane, leg, [0, -0.73, -0.03], [0.23, 0.17, 0.3]);
    legs.push(leg);
  }
  const tail = block(cube, mane, player, [0, 0.77, 0.91], [0.23, 0.8, 0.22]);
  tail.rotation.x = -0.35;
  block(cube, cloth, player, [0, 1.33, 0.05], [0.96, 0.14, 0.95]);
  block(cube, trim, player, [0, 1.43, 0.15], [0.66, 0.16, 0.6]);

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

  // Cowboy hat (Stetson: wide curled brim + trim hatband + pinched cattleman crown)
  block(cube, hatMat, riderBody, [0, 2.59, 0.02], [0.98, 0.06, 0.94]);
  block(cube, hatMat, riderBody, [0, 2.58, 0.02], [0.74, 0.05, 1.08]);
  const leftBrim = block(cube, hatMat, riderBody, [-0.5, 2.65, 0.02], [0.16, 0.07, 0.86]);
  leftBrim.rotation.z = -0.46;
  const rightBrim = block(cube, hatMat, riderBody, [0.5, 2.65, 0.02], [0.16, 0.07, 0.86]);
  rightBrim.rotation.z = 0.46;
  block(cube, trim, riderBody, [0, 2.65, 0.02], [0.6, 0.09, 0.62]);
  block(cube, hatMat, riderBody, [0, 2.77, 0.02], [0.56, 0.22, 0.58]);
  block(cube, hatMat, riderBody, [-0.15, 2.91, 0.02], [0.21, 0.11, 0.52]);
  block(cube, hatMat, riderBody, [0.15, 2.91, 0.02], [0.21, 0.11, 0.52]);

  const arms = [];
  for (const x of [-0.43, 0.43]) {
    block(cube, mane, riderBody, [x, 1.16, 0.05], [0.22, 0.57, 0.32]);
    const arm = block(cube, cloth, riderBody, [x * 0.8, 1.9, -0.25], [0.2, 0.5, 0.22]);
    arm.rotation.x = -0.8;
    arms.push(arm);
    block(cube, mane, riderBody, [x * 0.65, 1.72, -0.64], [0.035, 0.035, 0.7]);
  }
  player.userData.parts = { legs, tail, cape, rider, riderBody, arms };
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
 * Attach or replace shop accessories. `kind` is currently `'gyro'` or null.
 * Accessories use their own materials so they stay (steel balls stay green).
 */
export function setExplorerAccessories(model, kind) {
  const next = kind || null;
  if ((model.userData.accessoryKind || null) === next) return;
  detachAccessories(model);
  model.userData.accessoryKind = next;
  if (next === 'gyro') attachGyroAccessories(model);
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
