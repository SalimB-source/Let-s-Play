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
// Cloud's chocobo, spiky hair and sword, or Link's Epona, green cap, Master
// Sword and Hylian shield. Their materials stay independent from paintModel;
// the chocobo and Epona replace the base horse mount entirely.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CHARACTER_ACCESSORIES, CHARACTER_PALETTES } from './mirageCharacters.js';

export const PALETTE_SLOTS = 7;
const LEATHER = 0x5c3318;
export const STEEL_BALL_GREEN = 0x46e04c;
// Inclinaison de l'épée broyeuse de Cloud : la lame est portée **à l'envers**,
// pointe vers le bas et dans le dos, comme Cloud la porte dans Final Fantasy.
// Le modèle est construit lame vers le haut, on ajoute donc un demi-tour.
export const BUSTER_SWORD_TILT = 0.34;
export const BUSTER_SWORD_ROTATION_Z = BUSTER_SWORD_TILT - Math.PI;

export function block(geometry, material, parent, position, scale = null) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (scale) mesh.scale.set(...scale);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

// Orientation réservée aux modèles instanciés dans la course. On la place sur
// la racine du cavalier pour qu'aucune pose d'animation ne la remette à zéro.
//
// Le modèle est construit avec la face du cavalier et la tête du cheval vers
// -z : c'est aussi la direction que la piste parcourt sous la caméra (la
// caméra du jeu est à +z=9.4, le joueur va vers -z). Aucun demi-tour n'est
// donc nécessaire : `RACE_EXPLORER_YAW` reste à 0, et l'on a la croupe face
// au joueur, comme dans une vue à la troisième personne. (Un Math.PI
// retournait le cavalier face à la caméra, ce qui faisait « face au
// joueur » au lieu de « face à la route ».)
export const RACE_EXPLORER_YAW = 0;
export function orientExplorerForRace(model) {
  if (!model?.rotation) return model;
  model.rotation.y = RACE_EXPLORER_YAW;
  return model;
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

/**
 * Un ton dérivé d'une couleur de la palette : la même teinte, éclaircie ou
 * assombrie. C'est ce qui donne du relief au voxel (poitrail plus clair,
 * arrière-main plus sombre, chanfrein, sabots) **sans ajouter une seule couleur
 * aux palettes ni aux skins** — `paintModel` les recalcule.
 */
function shadeMaterial(material, factor) {
  return new THREE.MeshStandardMaterial({
    color: material.color.clone().multiplyScalar(factor),
    roughness: material.roughness,
    flatShading: true,
  });
}

/**
 * Fusionne les blocs **fixes** d'un groupe (ses meshes directs, matière par
 * matière) en un seul mesh. Un personnage porte maintenant beaucoup de détail :
 * sans cela, chaque brique serait un appel de dessin, et il y a jusqu'à huit
 * cavaliers à l'écran. Les sous-groupes (tête, jambes, queue, cape, bras,
 * chapeau…) ne sont pas touchés : ce sont eux qui bougent.
 *
 * Même technique que `bakeStaticScenery` (MirageWorld.jsx) pour le décor. La
 * géométrie du cube unité est partagée par tout le modèle et n'est donc jamais
 * libérée ici (voir `disposeExplorer`).
 */
function mergeStaticBlocks(group, keep = null) {
  const buckets = new Map();
  for (const child of [...group.children]) {
    if (!child.isMesh || child.children.length) continue;
    if (keep && keep.has(child)) continue; // animé ailleurs : il garde sa place
    const list = buckets.get(child.material) || [];
    list.push(child);
    buckets.set(child.material, list);
  }
  for (const [material, meshes] of buckets) {
    if (meshes.length < 2) continue;
    const parts = meshes.map((mesh) => {
      mesh.updateMatrix();
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      return geometry.applyMatrix4(mesh.matrix);
    });
    const merged = mergeGeometries(parts, false);
    parts.forEach((part) => part.dispose());
    if (!merged) continue;
    meshes.forEach((mesh) => group.remove(mesh));
    group.add(new THREE.Mesh(merged, material));
  }
}

export function makeExplorer(rival = false, palette = null, accessories = undefined) {
  const player = new THREE.Group();
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const mat = color => new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true });
  const baseColors = palette || CHARACTER_PALETTES[Number(rival) || 0];
  const full = normalizePalette(baseColors);
  const [coat, mane, cloth, trim, hood, hatMat, marks] = full.map(mat);
  // Nuances dérivées de la robe et des crins (voir `shadeMaterial`).
  const coatLight = shadeMaterial(coat, 1.16);
  const coatShade = shadeMaterial(coat, 0.84);
  const maneShade = shadeMaterial(mane, 0.84);
  // Les yeux sont les mêmes sur toutes les robes : un blanc cassé et une pupille
  // presque noire, jamais pris dans la palette (une robe claire donnerait des
  // yeux clairs, et le cheval n'aurait plus de regard).
  const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xfdf6e6, roughness: 0.42, flatShading: true });
  const eyeDark = new THREE.MeshStandardMaterial({ color: 0x1b1417, roughness: 0.35, flatShading: true });
  // Les sabots non plus ne viennent pas de la palette : une robe à crins clairs
  // (L'Ombre, Sauge) donnerait des sabots clairs. C'est la corne, comme sur
  // Épona — un brun presque noir, un peu plus lisse que le poil.
  const hoof = new THREE.MeshStandardMaterial({ color: 0x2e1d16, roughness: 0.42, flatShading: true });

  // Keep the original horse in its own group so a shop skin can swap the
  // mount for a chocobo without changing the common rider / race animations.
  const horseMount = new THREE.Group();
  horseMount.name = 'horse-mount';
  player.add(horseMount);

  // ── Le fût, la selle et le harnachement (fixes, fusionnés à la fin) ──────
  const horseBody = new THREE.Group();
  horseBody.name = 'horse-body';
  horseMount.add(horseBody);
  block(cube, coat, horseBody, [0, 0.95, 0], [0.82, 0.83, 1.65]);
  // Poitrail un ton au-dessus, arrière-main un ton en dessous : deux plans qui
  // donnent du volume sans toucher aux couleurs de la palette.
  block(cube, coatLight, horseBody, [0, 1.06, -0.66], [0.86, 0.62, 0.5]);
  block(cube, coatShade, horseBody, [0, 0.94, 0.62], [0.85, 0.76, 0.46]);
  // Tapis de selle, selle, pommeau : un vrai harnachement western.
  block(cube, cloth, horseBody, [0, 1.33, 0.05], [0.96, 0.14, 0.95]);
  block(cube, trim, horseBody, [0, 1.43, 0.15], [0.66, 0.16, 0.6]);
  block(cube, trim, horseBody, [0, 1.63, -0.24], [0.15, 0.28, 0.15]);
  for (const side of [-1, 1]) {
    // Étrivière et étrier, juste en dehors des bottes du cavalier.
    block(cube, maneShade, horseBody, [side * 0.56, 1.16, 0.12], [0.07, 0.46, 0.1]);
    block(cube, trim, horseBody, [side * 0.56, 0.9, 0.12], [0.17, 0.13, 0.21]);
    // Sacoches de voyage sur la croupe, avec leur rabat.
    block(cube, trim, horseBody, [side * 0.5, 1.12, 0.62], [0.22, 0.44, 0.44]);
    block(cube, maneShade, horseBody, [side * 0.5, 1.36, 0.62], [0.24, 0.09, 0.46]);
  }
  mergeStaticBlocks(horseBody);

  // ── La tête : encolure, chanfrein, naseaux, œil et crinière (elle hoche) ──
  const horseHead = new THREE.Group();
  horseHead.name = 'horse-head';
  horseHead.position.set(0, 1.35, -0.5);
  horseMount.add(horseHead);
  const neck = block(cube, coat, horseHead, [0, 0.13, -0.14], [0.46, 1.02, 0.52]);
  neck.rotation.x = -0.25;
  block(cube, coat, horseHead, [0, 0.6, -0.42], [0.46, 0.46, 0.82]);
  block(cube, coatLight, horseHead, [0, 0.53, -0.94], [0.42, 0.34, 0.24]); // museau
  for (const side of [-1, 1]) {
    // Naseau en relief sur le bout du museau (sinon il est noyé dans le bloc).
    block(cube, eyeDark, horseHead, [side * 0.13, 0.5, -1.075], [0.08, 0.05, 0.03]);
    // L'œil : un blanc, et la pupille au milieu (elle déborde d'un millimètre).
    block(cube, eyeWhite, horseHead, [side * 0.235, 0.64, -0.65], [0.02, 0.19, 0.22]);
    block(cube, eyeDark, horseHead, [side * 0.245, 0.645, -0.65], [0.022, 0.14, 0.14]);
    block(cube, coat, horseHead, [side * 0.17, 0.91, -0.28], [0.13, 0.34, 0.16]); // oreille
  }
  // Liste (bande claire sur le chanfrein) — même couleur que la robe par défaut.
  block(cube, marks, horseHead, [0, 0.62, -0.836], [0.15, 0.36, 0.02]);
  block(cube, marks, horseHead, [0, 0.75, -0.6], [0.15, 0.02, 0.46]);
  // Crinière en trois mèches le long de la crête de l'encolure. Elle déborde
  // un peu de chaque côté du chanfrein : c'est ce qui la fait lire **de profil**
  // (une mèche plus étroite que l'encolure disparaît derrière lui) et de
  // derrière. Elle suit le hochement de tête puisque le groupe hoche.
  block(cube, mane, horseHead, [0, 0.74, 0.1], [0.5, 0.32, 0.42]);
  block(cube, mane, horseHead, [0, 0.27, 0.03], [0.5, 0.36, 0.4]);
  block(cube, mane, horseHead, [0, -0.12, -0.12], [0.52, 0.36, 0.42]);
  mergeStaticBlocks(horseHead);

  // Chaque jambe a deux segments : la cuisse part de la hanche, le genou se plie
  // (voir `leg.userData.knee`) et le sabot se replie au galop — c'est ce qui
  // distingue un galop d'un pendule.
  const horseLegs = [];
  for (const z of [-0.56, 0.56]) for (const x of [-0.29, 0.29]) {
    const leg = new THREE.Group();
    leg.name = 'horse-leg';
    leg.position.set(x, 0.85, z);
    horseMount.add(leg);
    block(cube, coat, leg, [0, -0.18, 0], [0.21, 0.37, 0.25]);
    const knee = new THREE.Group();
    knee.name = 'horse-knee';
    knee.position.set(0, -0.35, 0);
    leg.add(knee);
    leg.userData.knee = knee;
    block(cube, coat, knee, [0, -0.18, 0], [0.19, 0.37, 0.22]);
    // Balzane (chaussette) au-dessus du sabot.
    block(cube, marks, knee, [0, -0.26, 0], [0.205, 0.22, 0.235]);
    block(cube, hoof, knee, [0, -0.38, -0.03], [0.22, 0.17, 0.29]);
    horseLegs.push(leg);
  }

  // Queue en trois mèches : une seule brique ne donnait qu'un bâton.
  const horseTail = new THREE.Group();
  horseTail.name = 'horse-tail';
  horseTail.position.set(0, 1.12, 0.8);
  horseTail.rotation.x = -0.35;
  horseMount.add(horseTail);
  block(cube, mane, horseTail, [0, -0.18, 0.04], [0.24, 0.42, 0.26]);
  block(cube, maneShade, horseTail, [0, -0.52, 0.12], [0.21, 0.36, 0.23]);
  block(cube, maneShade, horseTail, [0, -0.82, 0.18], [0.16, 0.3, 0.19]);
  mergeStaticBlocks(horseTail);

  const rider = new THREE.Group();
  rider.position.y = 1.4;
  player.add(rider);
  const riderBody = new THREE.Group();
  riderBody.position.y = -1.4;
  rider.add(riderBody);
  block(cube, cloth, riderBody, [0, 1.85, 0.05], [0.6, 0.75, 0.43]);
  const cape = block(cube, cloth, riderBody, [0, 1.7, 0.34], [0.72, 0.87, 0.13]);
  cape.name = 'rider-cape';
  block(cube, trim, riderBody, [0, 1.72, 0.42], [0.12, 0.57, 0.03]);
  block(cube, hood, riderBody, [0, 2.38, 0.02], [0.52, 0.46, 0.52]);

  // Le pan de la cape bat la croupe au galop (voir `parts.capeFlap`).
  const capeFlap = new THREE.Group();
  capeFlap.name = 'cape-flap';
  capeFlap.position.set(0, 1.62, 0.6);
  capeFlap.rotation.x = -0.2;
  riderBody.add(capeFlap);
  for (const side of [-1, 1]) {
    block(cube, cloth, capeFlap, [side * 0.16, -0.1, 0], [0.3, 0.42, 0.12]);
    block(cube, trim, capeFlap, [side * 0.16, -0.3, 0], [0.32, 0.05, 0.13]);
  }
  mergeStaticBlocks(capeFlap);

  // Le visage du cow-boy : yeux, bandana remonté sur le nez et son nœud dans la
  // nuque (c'est ce que voit le joueur, la caméra est derrière le cavalier).
  // C'est un groupe à part : Cloud et Link ont leur propre tête (voir
  // `setExplorerAccessories`).
  const face = new THREE.Group();
  face.name = 'rider-face';
  riderBody.add(face);
  for (const side of [-1, 1]) {
    block(cube, eyeWhite, face, [side * 0.115, 2.42, -0.25], [0.14, 0.12, 0.02]);
    block(cube, eyeDark, face, [side * 0.115, 2.42, -0.27], [0.06, 0.08, 0.02]);
  }
  block(cube, trim, face, [0, 2.25, 0.02], [0.56, 0.2, 0.56]);
  block(cube, trim, face, [0, 2.32, 0.32], [0.16, 0.18, 0.14]);
  block(cube, trim, face, [0, 2.14, 0.35], [0.1, 0.26, 0.09]);
  mergeStaticBlocks(face);

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
  // Le cordon de jugulaire : deux fils sous les bords, comme sur un vrai Stetson.
  for (const side of [-1, 1]) block(cube, trim, hat, [side * 0.27, 2.44, -0.16], [0.03, 0.34, 0.03]);
  mergeStaticBlocks(hat);

  // Les bras sont à part : ils tirent sur les rênes au galop (voir MirageWorld).
  const armGroup = new THREE.Group();
  armGroup.name = 'rider-arms';
  riderBody.add(armGroup);
  const arms = [];
  for (const side of [-1, 1]) {
    // Les cuisses descendent en biais depuis la selle, puis les bottes sortent
    // franchement des flancs : la silhouette du cavalier reste lisible en course.
    const thigh = block(cube, cloth, riderBody, [side * 0.43, 1.47, 0.05], [0.28, 0.54, 0.38]);
    thigh.rotation.z = side * 0.52;
    const bootX = side * 0.62;
    block(cube, mane, riderBody, [bootX, 1.1, 0.05], [0.24, 0.55, 0.34]);
    block(cube, cloth, riderBody, [bootX, 1.34, 0.05], [0.3, 0.2, 0.37]);
    block(cube, trim, riderBody, [bootX, 1.02, 0.24], [0.12, 0.07, 0.09]);
    // Les bras restent à la largeur des épaules et tiennent toujours les rênes.
    const armX = side * 0.43;
    const arm = block(cube, cloth, armGroup, [armX * 0.8, 1.9, -0.25], [0.2, 0.5, 0.22]);
    arm.rotation.x = -0.8;
    arms.push(arm);
    block(cube, mane, riderBody, [armX * 0.65, 1.72, -0.64], [0.035, 0.035, 0.7]);
  }
  // `cape` et `hat` restent des nœuds à part : l'un bat au galop, l'autre tombe
  // pour Cloud. (Les groupes `cape-flap`, `rider-face` et `rider-arms` ont leur
  // propre collecte de blocs et ne sont donc pas touchés ici.)
  mergeStaticBlocks(riderBody, new Set([cape]));
  player.userData.parts = {
    horseMount, horseBody, horseHead, horseLegs, horseTail, capeFlap, face, armGroup,
    legs: horseLegs, tail: horseTail,
    cape, rider, riderBody, arms, hat,
  };
  player.userData.materials = [coat, mane, cloth, trim, hood, hatMat, marks];
  // Les nuances dérivées suivent leur couleur source (voir `paintModel`).
  player.userData.derived = [
    { material: coatLight, source: 0, factor: 1.16 },
    { material: coatShade, source: 0, factor: 0.84 },
    { material: maneShade, source: 1, factor: 0.84 },
  ];
  // Le cube unité de tout le modèle : la fusion des blocs le laisse sans
  // propriétaire, c'est donc au modèle de le libérer (voir `disposeExplorer`).
  player.userData.unitCube = cube;
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
  // Les nuances dérivées (poitrail, arrière-main, sabots) se recalculent : une
  // robe claire garde son relief, une robe sombre aussi.
  for (const { material, source, factor } of model.userData.derived || []) {
    material.color.copy(materials[source].color).multiplyScalar(factor);
  }
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
  // Le visage du cow-boy revient ; Cloud et Link le remplacent par le leur.
  if (parts.face) parts.face.visible = true;
  if (parts.horseLegs) parts.legs = parts.horseLegs;
  if (parts.horseTail) parts.tail = parts.horseTail;
  parts.wings = [];
  parts.chocobo = null;
  parts.busterSword = null;
  parts.epona = null;
  parts.masterSword = null;
  parts.hylianShield = null;
  model.userData.accessoryKind = next;
  if (next === 'gyro') attachGyroAccessories(model);
  if (next === 'cloud-chocobo') attachCloudChocobo(model);
  if (next === 'link-epona') attachLinkEpona(model);
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

  // Two springy orange legs with broad, three-toed feet — cuisse et tarse
  // séparés par un jarret, comme un oiseau coureur (voir `userData.knee`).
  const chocoboLegs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.name = side < 0 ? 'chocobo-left-leg' : 'chocobo-right-leg';
    leg.position.set(side * 0.29, 0.74, 0.34);
    group.add(leg);
    block(cube, orange, leg, [0, -0.14, 0], [0.15, 0.28, 0.16]);
    const tarsus = new THREE.Group();
    tarsus.name = 'chocobo-tarsus';
    tarsus.position.set(0, -0.28, 0);
    leg.add(tarsus);
    leg.userData.knee = tarsus;
    block(cube, orange, tarsus, [0, -0.13, 0], [0.14, 0.28, 0.15]);
    block(cube, beak, tarsus, [0, -0.26, -0.1], [0.31, 0.14, 0.38]);
    for (const toe of [-1, 0, 1]) {
      block(cube, beak, tarsus, [toe * 0.105, -0.27, -0.25], [0.095, 0.1, 0.22]);
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
  // Épée à l'envers : la garde remonte dans le dos, la lame redescend derrière
  // l'épaule droite en frôlant la croupe du chocobo (voir le commentaire de
  // BUSTER_SWORD_TILT). La position recule l'ensemble pour dégager la selle.
  sword.position.set(0.45, 2.16, 0.56);
  sword.rotation.z = BUSTER_SWORD_ROTATION_Z;
  sword.userData.baseRotationZ = sword.rotation.z;
  sword.userData.baseRotationX = sword.rotation.x;
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
  if (parts.face) parts.face.visible = false; // Cloud a son propre visage
  parts.legs = chocoboLegs;
  parts.tail = chocoboTail;
  parts.wings = wings;
  parts.chocobo = group;
  model.userData.accessoryGroup = group;
  model.userData.accessoryKind = 'cloud-chocobo';
}

/**
 * Link & Épona : la jument baie remplace le cheval de base (robe alezane,
 * crins blonds, liste et balzanes crème) et gagne un harnachement complet
 * (frontale, muserole, poitrail à anneau doré, sangle, étriers, sacoches).
 * Le cavalier troque le Stetson pour la casquette verte et reçoit ses
 * marques de héros : oreilles pointues d’Hyléen, sourcils et yeux bleus,
 * col de chemise, baudrier en diagonale, pan de tunique sur la selle,
 * l’épée de légende à la main droite (garde ailée violette, gorge de lame
 * et Triforce gravée) et le bouclier hylien sanglé dans le dos.
 */
function attachLinkEpona(model) {
  const parts = model.userData.parts || {};
  const { riderBody } = parts;
  if (!riderBody || !parts.horseMount) return;

  const group = new THREE.Group();
  group.name = 'epona-mount';
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.78, flatShading: true, ...extra });

  // Épona : robe baie brûlée, crins blonds, chanfrein plus sombre.
  const coat = mat(0x8a4a23);
  const coatDark = mat(0x6d3719);
  const maneBlond = mat(0xf0d9a0);
  const maneLight = mat(0xfbe9c4);
  const sock = mat(0xfaf3e4);
  const hoof = mat(0x2e1d16);
  const eyeDark = mat(0x241a14, { roughness: 0.4 });
  const bridle = mat(0x4a2b17);
  const saddleCloth = mat(0x2f7a33);
  const saddleLeather = mat(0x6b4324);
  const saddleTrim = mat(0xd9a84e);
  const gold = mat(0xe8c65f, { metalness: 0.62, roughness: 0.3 });

  block(cube, coat, group, [0, 0.95, 0], [0.82, 0.83, 1.65]);
  const neck = block(cube, coat, group, [0, 1.48, -0.64], [0.46, 1.02, 0.52]);
  neck.rotation.x = -0.25;
  block(cube, coat, group, [0, 1.95, -0.92], [0.46, 0.46, 0.82]);
  block(cube, coatDark, group, [0, 1.86, -1.29], [0.4, 0.3, 0.18]);
  // Liste blanche sur le chanfrein + large bande entre les deux yeux.
  block(cube, sock, group, [0, 1.97, -1.336], [0.16, 0.34, 0.02]);
  block(cube, sock, group, [0, 2.12, -1.13], [0.13, 0.03, 0.42]);
  for (const side of [-1, 1]) {
    block(cube, eyeDark, group, [side * 0.236, 2.04, -1.02], [0.03, 0.09, 0.12]);
    block(cube, bridle, group, [side * 0.236, 1.95, -0.88], [0.05, 0.05, 0.48]);
  }
  block(cube, bridle, group, [0, 1.79, -1.16], [0.42, 0.08, 0.16]);
  // Bride complète : frontale au-dessus des yeux et muserole sur le nez.
  block(cube, bridle, group, [0, 2.12, -1.3], [0.46, 0.05, 0.06]);
  block(cube, bridle, group, [0, 1.78, -1.36], [0.4, 0.07, 0.06]);
  // Toupet blond qui retombe entre les deux oreilles.
  block(cube, maneLight, group, [0, 2.22, -1.12], [0.16, 0.2, 0.24]);
  // Naseaux sombres sur le bout du nez.
  for (const side of [-1, 1]) block(cube, eyeDark, group, [side * 0.1, 1.83, -1.39], [0.05, 0.06, 0.02]);
  // Crinière blonde, plus fournie que celle du cheval de base.
  block(cube, maneBlond, group, [0, 1.63, -0.36], [0.2, 0.94, 0.2]);
  block(cube, maneLight, group, [0, 2.0, -0.63], [0.22, 0.36, 0.22]);
  for (const x of [-0.17, 0.17]) block(cube, coat, group, [x, 2.26, -0.78], [0.12, 0.32, 0.18]);

  const eponaLegs = [];
  for (const z of [-0.56, 0.56]) for (const x of [-0.29, 0.29]) {
    const leg = new THREE.Group();
    leg.name = `${x < 0 ? 'epona-left' : 'epona-right'}-${z < 0 ? 'front' : 'back'}-leg`;
    leg.position.set(x, 0.85, z);
    group.add(leg);
    block(cube, coat, leg, [0, -0.17, 0], [0.21, 0.35, 0.25]);
    const knee = new THREE.Group();
    knee.name = 'epona-knee';
    knee.position.set(0, -0.34, 0);
    leg.add(knee);
    leg.userData.knee = knee;
    block(cube, coat, knee, [0, -0.18, 0], [0.19, 0.36, 0.22]);
    block(cube, sock, knee, [0, -0.25, 0], [0.205, 0.22, 0.235]);
    block(cube, hoof, knee, [0, -0.37, -0.03], [0.22, 0.17, 0.29]);
    eponaLegs.push(leg);
  }

  // Queue blonde — même groupe animé que la queue du cheval de base.
  const eponaTail = new THREE.Group();
  eponaTail.name = 'epona-tail';
  eponaTail.position.set(0, 0.82, 0.86);
  eponaTail.rotation.x = -0.32;
  group.add(eponaTail);
  const tailTop = block(cube, maneBlond, eponaTail, [0, -0.06, 0.26], [0.19, 0.6, 0.3]);
  tailTop.rotation.x = -0.12;
  const tailTip = block(cube, maneLight, eponaTail, [0, -0.34, 0.42], [0.15, 0.34, 0.24]);
  tailTip.rotation.x = -0.22;

  // Tapis de selle vert (aux couleurs de la tunique) et cuir sanglé.
  block(cube, saddleCloth, group, [0, 1.34, 0.05], [0.9, 0.1, 0.92]);
  block(cube, saddleLeather, group, [0, 1.44, 0.12], [0.66, 0.16, 0.62]);
  block(cube, saddleTrim, group, [0, 1.53, 0.12], [0.5, 0.035, 0.48]);
  // Poitrail sanglé autour de l'encolure, avec son anneau doré.
  block(cube, bridle, group, [0, 1.3, -0.79], [0.88, 0.09, 0.05]);
  block(cube, gold, group, [0, 1.3, -0.83], [0.1, 0.1, 0.04]);
  // Sangle sous le ventre pour tenir la selle en place pendant le galop.
  block(cube, bridle, group, [0, 0.56, 0.12], [0.88, 0.08, 0.12]);
  for (const side of [-1, 1]) {
    // Étrivière et étrier doré, juste devant la botte de Link.
    block(cube, saddleLeather, group, [side * 0.47, 1.18, -0.18], [0.05, 0.4, 0.08]);
    const stirrup = block(cube, gold, group, [side * 0.48, 0.95, -0.18], [0.08, 0.12, 0.16]);
    stirrup.userData.linkAccessory = 'stirrup';
    // Sacoches de voyage posées sur la croupe, derrière la selle.
    const bag = block(cube, saddleLeather, group, [side * 0.46, 1.14, 0.46], [0.12, 0.3, 0.3]);
    bag.userData.linkAccessory = 'saddlebag';
    block(cube, saddleTrim, group, [side * 0.525, 1.2, 0.46], [0.02, 0.08, 0.1]);
  }

  // ---- Link -------------------------------------------------------------
  const loose = [];
  const eyeBlue = mat(0x2b4bb0, { roughness: 0.4 });
  const hair = mat(0xf2d477);
  const hairLight = mat(0xffe9a6);
  const beltLeather = mat(0x5a3418);
  // Peau et tunique suivent la palette du skin (slots tête et tissu) sans
  // réutiliser ses matériaux : le détachement ne doit pas les dissiper.
  const skin = mat(model.userData.materials?.[4]?.color.getHex() ?? 0xf6d2a8);
  const tunic = mat(model.userData.materials?.[2]?.color.getHex() ?? 0x3d8f3f);
  const capGreen = mat(0x2f8f3a);
  const capDark = mat(0x22722b);
  const capTrim = mat(0xd9c07a);
  const bladeMat = mat(0xdfe9f5, { metalness: 0.72, roughness: 0.2 });
  const bladeEdge = mat(0xf7fbff, { metalness: 0.6, roughness: 0.15 });
  const fuller = mat(0xa9bdd4, { metalness: 0.66, roughness: 0.26 });
  const guardMat = mat(0x6f5bd6, { metalness: 0.5, roughness: 0.34 });
  const gripMat = mat(0x35508c);
  const shieldBlue = mat(0x2b56b8);
  const shieldRim = mat(0xc9d4e2, { metalness: 0.6, roughness: 0.3 });
  const shieldRed = mat(0xd23b3b);
  const shieldDark = mat(0x18356e);

  // Ceinture et boucle dorée : la tunique verte vient de la palette du skin.
  const belt = block(cube, beltLeather, riderBody, [0, 1.66, 0.05], [0.63, 0.11, 0.46]);
  const buckle = block(cube, gold, riderBody, [0, 1.66, -0.176], [0.14, 0.1, 0.035]);
  loose.push(belt, buckle);
  // Baudrier de cuir en diagonale sur la tunique, anneau doré à la hanche.
  const strap = block(cube, beltLeather, riderBody, [0.02, 1.9, -0.19], [0.14, 0.9, 0.04]);
  strap.rotation.z = 0.55;
  strap.userData.linkAccessory = 'chest-strap';
  const strapRing = block(cube, gold, riderBody, [0.2, 1.66, -0.195], [0.1, 0.1, 0.045]);
  loose.push(strap, strapRing);
  // Col de la chemise brune qui dépasse au niveau du cou.
  const collar = block(cube, beltLeather, riderBody, [0, 2.2, -0.02], [0.42, 0.1, 0.4]);
  loose.push(collar);
  // Le pan évasé de la tunique retombe sur la selle, comme celle du héros.
  const skirt = block(cube, tunic, riderBody, [0, 1.42, 0.05], [0.74, 0.16, 0.6]);
  skirt.userData.linkAccessory = 'tunic-skirt';
  loose.push(skirt);

  // Cheveux blonds : frange, pattes et nuque, sous la casquette.
  const hairGroup = new THREE.Group();
  hairGroup.name = 'link-hair';
  riderBody.add(hairGroup);
  loose.push(hairGroup);
  block(cube, hair, hairGroup, [0, 2.37, -0.16], [0.5, 0.22, 0.2]);
  block(cube, hairLight, hairGroup, [0, 2.44, -0.21], [0.44, 0.09, 0.12]);
  for (const side of [-1, 1]) block(cube, hair, hairGroup, [side * 0.27, 2.2, 0.02], [0.13, 0.5, 0.4]);
  block(cube, hair, hairGroup, [0, 2.18, 0.27], [0.48, 0.42, 0.2]);
  // Yeux bleus sur le visage (la tête vient du modèle de base, tons chair).
  for (const side of [-1, 1]) block(cube, eyeBlue, hairGroup, [side * 0.115, 2.4, -0.25], [0.07, 0.05, 0.03]);
  // Sourcils blonds au-dessus des yeux.
  for (const side of [-1, 1]) block(cube, hair, hairGroup, [side * 0.115, 2.465, -0.252], [0.09, 0.035, 0.02]);
  // Oreilles pointues d'Hyléen, la signature de Link : elles percent les
  // pattes de cheveux, dressées vers l'extérieur et légèrement vers l'arrière.
  const earGeometry = new THREE.ConeGeometry(0.075, 0.26, 4);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(earGeometry, skin);
    ear.position.set(side * 0.33, 2.34, 0.05);
    ear.rotation.z = -side * 1.15;
    ear.rotation.x = 0.18;
    ear.userData.linkAccessory = 'hylian-ear';
    hairGroup.add(ear);
  }

  // Casquette verte pointue, visière à l’avant et bout qui retombe.
  const cap = new THREE.Group();
  cap.name = 'link-cap';
  riderBody.add(cap);
  loose.push(cap);
  block(cube, capGreen, cap, [0, 2.63, 0.02], [0.6, 0.16, 0.6]);
  block(cube, capTrim, cap, [0, 2.63, 0.02], [0.63, 0.06, 0.63]);
  block(cube, capGreen, cap, [0, 2.75, 0.01], [0.52, 0.16, 0.54]);
  block(cube, capGreen, cap, [0, 2.86, 0], [0.38, 0.14, 0.4]);
  block(cube, capGreen, cap, [0, 2.96, -0.02], [0.22, 0.12, 0.26]);
  const capTip = block(cube, capDark, cap, [0, 3.05, -0.07], [0.13, 0.13, 0.16]);
  capTip.rotation.x = -0.55;
  const visor = block(cube, capGreen, cap, [0, 2.61, -0.35], [0.5, 0.06, 0.32]);
  visor.rotation.x = 0.2;

  // Bouclier hylien dans le dos : plaque bleue, bordure argentée, croix et
  // triangles. Posé à l’arrière du torse (le cavalier regarde vers -z).
  const shield = new THREE.Group();
  shield.name = 'hylian-shield';
  shield.position.set(0, 1.86, 0.34);
  shield.rotation.set(0.1, 0, 0.05);
  riderBody.add(shield);
  parts.hylianShield = shield;
  loose.push(shield);
  block(cube, shieldBlue, shield, [0, 0, 0], [0.52, 0.64, 0.1]);
  block(cube, shieldDark, shield, [0, -0.02, -0.055], [0.44, 0.5, 0.02]);
  block(cube, shieldRim, shield, [0, 0.3, 0.005], [0.56, 0.06, 0.11]);
  block(cube, shieldRim, shield, [0, -0.3, 0.005], [0.56, 0.06, 0.11]);
  for (const x of [-0.24, 0.24]) block(cube, shieldRim, shield, [x, 0, 0.005], [0.06, 0.52, 0.11]);
  block(cube, shieldRim, shield, [0, 0.06, 0.055], [0.09, 0.36, 0.02]);
  block(cube, shieldRim, shield, [0, -0.04, 0.055], [0.3, 0.09, 0.02]);
  // Petit blason de la Triforce : trois pointes dorées rendent le bouclier
  // immédiatement lisible, même dans la vignette de sélection.
  const crestGeometry = new THREE.ConeGeometry(0.085, 0.035, 3);
  for (const [x, y] of [[0, 0.18], [-0.085, 0.04], [0.085, 0.04]]) {
    const crest = new THREE.Mesh(crestGeometry, gold);
    crest.position.set(x, y, 0.082);
    crest.rotation.x = Math.PI / 2;
    shield.add(crest);
  }
  for (const x of [-0.15, 0.15]) block(cube, shieldRed, shield, [x, -0.2, 0.055], [0.1, 0.1, 0.02]);
  block(cube, shieldRim, shield, [0, 0, 0.062], [0.09, 0.09, 0.02]);

  // Épée de légende tenue dans la main droite : lame vers le ciel, garde
  // violette ailée et pommeau doré, juste à côté des rênes.
  const sword = new THREE.Group();
  sword.name = 'master-sword';
  sword.position.set(0.36, 2.06, -0.42);
  sword.rotation.set(-0.2, 0, 0.16);
  sword.userData.baseRotationX = sword.rotation.x;
  sword.userData.baseRotationZ = sword.rotation.z;
  riderBody.add(sword);
  parts.masterSword = sword;
  loose.push(sword);
  const blade = block(cube, bladeMat, sword, [0, 0.5, 0], [0.12, 0.96, 0.07]);
  blade.userData.linkAccessory = 'master-sword';
  block(cube, bladeEdge, sword, [0.045, 0.5, 0.038], [0.035, 0.84, 0.012]);
  // Gorge centrale sombre sur les deux faces de la lame.
  block(cube, fuller, sword, [0, 0.55, -0.038], [0.03, 0.7, 0.008]);
  block(cube, fuller, sword, [0, 0.55, 0.038], [0.03, 0.7, 0.008]);
  const swordTip = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.2, 4), bladeMat);
  swordTip.position.set(0, 1.07, 0);
  sword.add(swordTip);
  block(cube, guardMat, sword, [0, 0.05, 0], [0.42, 0.07, 0.13]);
  block(cube, guardMat, sword, [0, -0.01, 0], [0.2, 0.06, 0.11]);
  // Les ailes recourbées de la garde violette, signature de l'épée de légende.
  for (const side of [-1, 1]) {
    const wing = block(cube, guardMat, sword, [side * 0.24, 0.13, 0], [0.1, 0.3, 0.11]);
    wing.rotation.z = -side * 0.5;
    wing.userData.linkAccessory = 'master-sword-wing';
    const wingTip = block(cube, guardMat, sword, [side * 0.31, 0.31, 0], [0.08, 0.16, 0.09]);
    wingTip.rotation.z = -side * 0.9;
    wingTip.userData.linkAccessory = 'master-sword-wing';
  }
  // Emblème de la Triforce gravé à la base de la lame, visible des deux côtés.
  const swordCrestGeometry = new THREE.ConeGeometry(0.055, 0.03, 3);
  for (const face of [-1, 1]) {
    const crest = new THREE.Mesh(swordCrestGeometry, gold);
    crest.position.set(0, 0.27, face * 0.04);
    crest.rotation.x = face * Math.PI / 2;
    crest.userData.linkAccessory = 'triforce-crest';
    sword.add(crest);
  }
  block(cube, gripMat, sword, [0, -0.14, 0], [0.09, 0.24, 0.09]);
  block(cube, gold, sword, [0, -0.28, 0], [0.13, 0.06, 0.13]);

  group.userData.loose = loose;
  model.add(group);
  parts.horseMount.visible = false;
  parts.hat.visible = false;
  if (parts.cape) parts.cape.visible = false;
  if (parts.face) parts.face.visible = false; // le visage de Link est dans ses cheveux
  parts.legs = eponaLegs;
  parts.tail = eponaTail;
  parts.epona = group;
  model.userData.accessoryGroup = group;
  model.userData.accessoryKind = 'link-epona';
}

/**
 * Free GPU resources of a model built by makeExplorer. Le cube unité est partagé
 * par tous les blocs : la fusion (`mergeStaticBlocks`) a recopié son contenu dans
 * les géométries fusionnées, il n'est donc plus porté par aucun mesh — c'est ici
 * qu'on le libère, et une seule fois.
 */
export function disposeExplorer(model) {
  detachAccessories(model);
  const seen = new Set();
  model.traverse((node) => {
    if (!node.isMesh) return;
    if (node.geometry && !seen.has(node.geometry)) { seen.add(node.geometry); node.geometry.dispose(); }
    if (node.material && !seen.has(node.material)) { seen.add(node.material); node.material.dispose(); }
  });
  const cube = model.userData.unitCube;
  if (cube && !seen.has(cube)) { seen.add(cube); cube.dispose(); }
}
