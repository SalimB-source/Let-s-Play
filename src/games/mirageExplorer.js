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
import * as THREE from 'three';
import { CHARACTER_PALETTES } from './mirageCharacters';

export const PALETTE_SLOTS = 7;
const LEATHER = 0x5c3318;

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

export function makeExplorer(rival = false, palette = null) {
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

  for (const x of [-0.43, 0.43]) {
    block(cube, mane, riderBody, [x, 1.16, 0.05], [0.22, 0.57, 0.32]);
    const arm = block(cube, cloth, riderBody, [x * 0.8, 1.9, -0.25], [0.2, 0.5, 0.22]);
    arm.rotation.x = -0.8;
    block(cube, mane, riderBody, [x * 0.65, 1.72, -0.64], [0.035, 0.035, 0.7]);
  }
  player.userData.parts = { legs, tail, cape, rider };
  player.userData.materials = [coat, mane, cloth, trim, hood, hatMat, marks];
  player.userData.hatMaterial = hatMat;
  player.userData.basePalette = baseColors;
  player.userData.painting = baseColors;
  return player;
}

/** Recolour an existing model in place (skins switch without rebuilding). */
export function paintModel(model, colors) {
  const materials = model.userData.materials;
  if (!materials || !colors) return;
  normalizePalette(colors).forEach((color, index) => materials[index]?.color.set(color));
}

/** Free GPU resources of a model built by makeExplorer. */
export function disposeExplorer(model) {
  const seen = new Set();
  model.traverse((node) => {
    if (!node.isMesh) return;
    if (node.geometry && !seen.has(node.geometry)) { seen.add(node.geometry); node.geometry.dispose(); }
    if (node.material && !seen.has(node.material)) { seen.add(node.material); node.material.dispose(); }
  });
}
