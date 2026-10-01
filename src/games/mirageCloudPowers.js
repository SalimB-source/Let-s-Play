/**
 * Effets spéciaux des deux pouvoirs de Cloud dans Mirage Rush.
 *
 * Module three.js pur (aucune dépendance React / DOM) pour rester testable :
 * MirageWorld se contente d'ajouter le groupe à la scène et d'appeler les
 * fonctions d'animation à chaque frame.
 *
 * - Onde d'épée dorée (jaune) : un croissant de lames lancé sur la cible.
 * - Éclair (rouge) : une nuée d'orage se forme, la foudre tombe sur l'ennemi.
 */
import * as THREE from 'three';

// Onde dorée : vol puis impact.
export const CLOUD_WAVE_FLIGHT_DURATION = 0.38;
export const CLOUD_WAVE_IMPACT_DURATION = 0.24;
// Éclair : formation du nuage, frappe, puis braises qui retombent.
export const CLOUD_BOLT_STORM_DURATION = 0.3;
export const CLOUD_BOLT_STRIKE_DURATION = 0.16;
export const CLOUD_BOLT_FADE_DURATION = 0.72;
/** Hauteur du nuage d'orage : assez haut pour être imposant, assez bas pour rester dans le champ de la caméra de course. */
export const CLOUD_BOLT_HEIGHT = 7.8;
/** Nombre de segments brisés de l'éclair. */
const CLOUD_BOLT_SEGMENTS = 16;
/** `cloudTargetPosition()` vise le torse : on retire cette hauteur pour poser l'éclair au sol. */
const CLOUD_BOLT_GROUND_OFFSET = 1.92;

function makeCloudBladeGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.11, -0.72);
  shape.quadraticCurveTo(0.55, -0.26, 0.55, 0.52);
  shape.quadraticCurveTo(0.36, 0.29, 0.18, 0.1);
  shape.quadraticCurveTo(0.1, -0.26, -0.11, -0.72);
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 18);
}

export function makeCloudSwordWave() {
  const group = new THREE.Group();
  group.name = 'cloud-golden-sword-wave';
  const bladeGeometry = makeCloudBladeGeometry();
  const materials = [];
  const makeMaterial = (color, opacity, tag = 'wave') => {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    });
    material.userData.baseOpacity = opacity;
    material.userData.group = tag;
    materials.push(material);
    return material;
  };
  const slash = (angle, scale, color, opacity, z, tag = 'wave') => {
    const mesh = new THREE.Mesh(bladeGeometry, makeMaterial(color, opacity, tag));
    mesh.rotation.z = angle;
    mesh.scale.setScalar(scale);
    mesh.position.z = z;
    mesh.renderOrder = 24;
    mesh.frustumCulled = false;
    group.add(mesh);
    return mesh;
  };

  // Onde dorée, bien plus large qu'avant : trois croissants empilés, deux
  // échos dans le sillage et un cœur blanc qui porte la frappe.
  slash(0, 1.62, 0xff7a0d, 0.42, -0.16, 'trail');
  slash(0.04, 1.24, 0xffa91f, 0.68, -0.05);
  slash(0, 0.86, 0xfff3a0, 0.98, 0.045);
  slash(-0.06, 0.46, 0xffffff, 0.95, 0.08);
  slash(-0.16, 0.72, 0xffd447, 0.4, -0.3, 'trail');
  slash(0.14, 0.52, 0xffe9a8, 0.34, -0.44, 'trail');
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.04, 6, 28),
    makeMaterial(0xffd447, 0.82),
  );
  halo.renderOrder = 23;
  group.add(halo);
  const haloOuter = new THREE.Mesh(
    new THREE.TorusGeometry(0.86, 0.018, 6, 32),
    makeMaterial(0xffb733, 0.5, 'trail'),
  );
  haloOuter.renderOrder = 22;
  group.add(haloOuter);
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16),
    makeMaterial(0xfff7bd, 1),
  );
  core.renderOrder = 25;
  core.position.z = 0.09;
  group.add(core);
  // Éclats projetés à l'impact : ils jaillissent du point de frappe.
  const shardGeometry = new THREE.OctahedronGeometry(0.13);
  const shardMaterial = makeMaterial(0xffe08a, 0.95, 'shard');
  const shards = [];
  const shardSpecs = [];
  for (let i = 0; i < 10; i += 1) {
    const shard = new THREE.Mesh(shardGeometry, shardMaterial);
    shard.renderOrder = 26;
    shard.frustumCulled = false;
    shard.visible = false;
    group.add(shard);
    shards.push(shard);
    const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.5;
    shardSpecs.push({
      dir: new THREE.Vector3(Math.cos(angle) * (0.9 + Math.random() * 0.8), 0.5 + Math.random() * 0.9, Math.sin(angle) * (0.9 + Math.random() * 0.8)),
      scale: 0.6 + Math.random() * 0.8,
      speed: 2.6 + Math.random() * 2.2,
    });
  }
  group.userData.materials = materials;
  group.userData.kind = 'wave';
  group.userData.halo = halo;
  group.userData.haloOuter = haloOuter;
  group.userData.core = core;
  group.userData.shards = shards;
  group.userData.shardSpecs = shardSpecs;
  return group;
}

/**
 * Éclair du pouvoir rouge de Cloud : une nuée d'orage se forme au-dessus de la
 * cible, la foudre claque dessus, puis le sol fume sous l'impact. Le groupe est
 * posé aux pieds de la cible (y = 0 au sol) et monte jusqu'à CLOUD_BOLT_HEIGHT.
 */
export function makeCloudLightningBolt() {
  const group = new THREE.Group();
  group.name = 'cloud-lightning-strike';
  const materials = [];
  const makeMaterial = (color, opacity, tag, blending = THREE.AdditiveBlending) => {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
      blending,
      fog: false,
    });
    material.userData.baseOpacity = opacity;
    material.userData.group = tag;
    materials.push(material);
    return material;
  };
  const UP = new THREE.Vector3(0, 1, 0);
  const jitter = (spread) => (Math.random() * 2 - 1) * spread;

  // 1. Nuée d'orage : quatre boules aplaties + un halo qui pulse.
  const cloud = new THREE.Group();
  cloud.position.y = CLOUD_BOLT_HEIGHT;
  group.add(cloud);
  const puffGeometry = new THREE.SphereGeometry(1, 10, 8);
  const puffMaterial = makeMaterial(0x4b3a66, 0.92, 'cloud', THREE.NormalBlending);
  for (const [x, y, z, r] of [[-1.05, 0.1, 0.15, 0.95], [0.1, 0.34, -0.4, 1.3], [1.15, 0.02, 0.3, 0.85], [0.35, -0.18, 0.55, 0.8]]) {
    const puff = new THREE.Mesh(puffGeometry, puffMaterial);
    puff.position.set(x, y, z);
    puff.scale.set(r, r * 0.6, r);
    puff.renderOrder = 20;
    cloud.add(puff);
  }
  const stormGlow = new THREE.Mesh(new THREE.SphereGeometry(1.55, 12, 10), makeMaterial(0xff5f7a, 0.45, 'cloud'));
  stormGlow.scale.set(1.3, 0.62, 1.15);
  stormGlow.renderOrder = 21;
  cloud.add(stormGlow);

  // 2. L'éclair : une ligne brisée entre la nuée et le sol, en triple épaisseur
  // (halo violet, corps rouge, cœur blanc) pour qu'il se voie de loin. Il reste
  // masqué tant que la nuée n'a pas fini de se former.
  const bolt = new THREE.Group();
  bolt.visible = false;
  group.add(bolt);
  const segmentGeometry = new THREE.BoxGeometry(1, 1, 1);
  const outerMaterial = makeMaterial(0x8f3bff, 0.42, 'bolt');
  const bodyMaterial = makeMaterial(0xff4f6d, 0.9, 'bolt');
  const coreMaterial = makeMaterial(0xfff2f6, 1, 'bolt');
  const nodes = [];
  for (let i = 0; i <= CLOUD_BOLT_SEGMENTS; i += 1) {
    const t = i / CLOUD_BOLT_SEGMENTS;
    // L'écart se resserre à l'approche du sol : la foudre tombe sur la cible.
    const spread = 1.15 * (1 - t) ** 0.7 + 0.05;
    nodes.push(new THREE.Vector3(jitter(spread), CLOUD_BOLT_HEIGHT * (1 - t) + 0.2, jitter(spread * 0.7)));
  }
  const addSegment = (from, to, parent, widths) => {
    const dir = to.clone().sub(from);
    const length = dir.length();
    if (length < 0.001) return null;
    const middle = from.clone().lerp(to, 0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
    const group3 = new THREE.Group();
    group3.position.copy(middle);
    group3.quaternion.copy(quat);
    const meshes = [];
    widths.forEach(([material, width], index) => {
      const mesh = new THREE.Mesh(segmentGeometry, material);
      mesh.scale.set(width, length * 1.04, width);
      mesh.renderOrder = 24 - index;
      mesh.frustumCulled = false;
      group3.add(mesh);
      meshes.push(mesh);
    });
    parent.add(group3);
    return group3;
  };
  const segments = [];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const piece = addSegment(nodes[i], nodes[i + 1], bolt, [[outerMaterial, 0.5], [bodyMaterial, 0.21], [coreMaterial, 0.09]]);
    if (piece) segments.push(piece);
  }
  // Fourches : de petites branches qui partent du tronc principal.
  const forks = [];
  for (let f = 0; f < 3; f += 1) {
    const start = nodes[3 + Math.floor(Math.random() * Math.max(1, nodes.length - 7))];
    const dir = new THREE.Vector3(jitter(1.1), -0.75 - Math.random() * 0.6, jitter(1.1)).normalize();
    let cursor = start.clone();
    for (let s = 0; s < 3; s += 1) {
      const length = 0.55 + Math.random() * 0.6;
      const next = cursor.clone().addScaledVector(dir, length);
      if (next.y < 0.25) break;
      const piece = addSegment(cursor, next, bolt, [[bodyMaterial, 0.1], [coreMaterial, 0.04]]);
      if (piece) forks.push(piece);
      cursor = next;
      dir.x += jitter(0.55);
      dir.z += jitter(0.55);
      dir.normalize();
    }
  }

  // 3. Impact au sol : colonne de lumière, double anneau de choc, cœur blanc,
  // cercle brûlé et gerbe d'étincelles.
  const impact = new THREE.Group();
  impact.visible = false;
  group.add(impact);
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.86, 3.1, 14, 1, true),
    makeMaterial(0xff5f7a, 0.5, 'impact'),
  );
  column.position.y = 1.55;
  column.renderOrder = 22;
  impact.add(column);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.085, 8, 30), makeMaterial(0xfff0f4, 0.95, 'impact'));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  ring.renderOrder = 25;
  impact.add(ring);
  const ringWide = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.05, 8, 32), makeMaterial(0xff4f6d, 0.8, 'impact'));
  ringWide.rotation.x = -Math.PI / 2;
  ringWide.position.y = 0.06;
  ringWide.renderOrder = 24;
  impact.add(ringWide);
  const scorch = new THREE.Mesh(new THREE.CircleGeometry(0.8, 22), makeMaterial(0x2a0f1c, 0.7, 'scorch', THREE.NormalBlending));
  scorch.rotation.x = -Math.PI / 2;
  scorch.position.y = 0.035;
  scorch.renderOrder = 21;
  impact.add(scorch);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), makeMaterial(0xffffff, 1, 'impact'));
  core.position.y = 1;
  core.renderOrder = 26;
  impact.add(core);
  const sparkGeometry = new THREE.BoxGeometry(0.09, 0.09, 0.34);
  const sparkMaterial = makeMaterial(0xffd9e2, 1, 'spark');
  const sparks = [];
  const sparkSpecs = [];
  for (let i = 0; i < 14; i += 1) {
    const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.6;
    const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
    spark.renderOrder = 26;
    spark.frustumCulled = false;
    impact.add(spark);
    sparks.push(spark);
    sparkSpecs.push({
      dir: new THREE.Vector3(Math.cos(angle) * (1 + Math.random() * 1.4), 1.1 + Math.random() * 1.5, Math.sin(angle) * (1 + Math.random() * 1.4)),
      speed: 2.2 + Math.random() * 2.6,
      scale: 0.7 + Math.random() * 0.9,
    });
  }

  group.userData.materials = materials;
  group.userData.kind = 'lightning';
  group.userData.cloud = cloud;
  group.userData.stormGlow = stormGlow;
  group.userData.bolt = bolt;
  group.userData.impact = impact;
  group.userData.segments = segments;
  group.userData.forks = forks;
  group.userData.ring = ring;
  group.userData.ringWide = ringWide;
  group.userData.column = column;
  group.userData.core = core;
  group.userData.scorch = scorch;
  group.userData.sparks = sparks;
  group.userData.sparkSpecs = sparkSpecs;
  return group;
}

/** Applique un coefficient d'opacité à un sous-ensemble de matériaux. */
export function fadeCloudMaterials(materials, tag, value) {
  const factor = Math.max(0, Math.min(1, value));
  for (const material of materials) {
    if (material.userData.group !== tag) continue;
    material.opacity = Math.min(1, (material.userData.baseOpacity ?? 1) * factor);
  }
}

export function setCloudPowerOpacity(group, opacity) {
  const value = Math.max(0, Math.min(1, opacity));
  group.userData.materials?.forEach((material) => {
    material.opacity = Math.min(1, (material.userData.baseOpacity ?? 1) * value);
  });
}

export function disposeCloudPower(group) {
  const geometries = new Set();
  group.traverse((node) => {
    if (node.geometry && !geometries.has(node.geometry)) {
      geometries.add(node.geometry);
      node.geometry.dispose();
    }
  });
  group.userData.materials?.forEach((material) => material.dispose());
}

/**
 * Avance l'onde dorée d'une frame.
 *
 * @param {THREE.Group} visual groupe renvoyé par `makeCloudSwordWave()`
 * @param {{age:number, phase:string, start:THREE.Vector3}} projectile état mutable
 * @param {number} dt secondes depuis la frame précédente
 * @param {THREE.Vector3} targetPoint position courante de la cible
 * @param {THREE.Camera} camera pour coller l'impact à l'écran
 * @param {{onImpact?: () => void}} hooks appelé au moment de la frappe
 * @returns {boolean} true quand le projectile peut être retiré de la scène
 */
export function updateCloudWaveVisual(visual, projectile, dt, targetPoint, camera, hooks = {}) {
  projectile.age += dt;
  if (projectile.phase === 'flight') {
    const progress = Math.min(1, projectile.age / CLOUD_WAVE_FLIGHT_DURATION);
    const travel = progress * (2 - progress);
    visual.position.copy(projectile.start).lerp(targetPoint, travel);
    visual.position.y += Math.sin(progress * Math.PI) * 0.35;
    visual.lookAt(targetPoint);
    visual.rotation.z += dt * 6.2;
    // Onde nettement plus large qu'avant : elle balaie la piste.
    visual.scale.setScalar(1.05 + Math.sin(progress * Math.PI) * 0.42);
    setCloudPowerOpacity(visual, 0.6 + Math.sin(progress * Math.PI) * 0.4);
    visual.userData.core.scale.setScalar(1 + Math.sin(progress * Math.PI * 3) * 0.35);
    if (progress >= 1) {
      projectile.phase = 'impact';
      projectile.age = 0;
      hooks.onImpact?.();
    }
    return false;
  }
  const progress = Math.min(1, projectile.age / CLOUD_WAVE_IMPACT_DURATION);
  visual.position.copy(targetPoint);
  visual.position.y += 0.12;
  visual.quaternion.copy(camera.quaternion);
  visual.rotation.z += dt * 4.4;
  // Explosion dorée : l'onde éclate bien au-delà de la silhouette du cavalier.
  visual.scale.setScalar(1.3 + progress * 2.3);
  visual.userData.core.scale.setScalar(Math.max(0.001, 1.4 - progress * 1.8));
  visual.userData.halo.scale.setScalar(1 + progress * 1.9);
  visual.userData.haloOuter.scale.setScalar(1 + progress * 3.1);
  setCloudPowerOpacity(visual, 1 - progress ** 1.4);
  for (let index = 0; index < visual.userData.shards.length; index += 1) {
    const shard = visual.userData.shards[index];
    const spec = visual.userData.shardSpecs[index];
    shard.visible = progress > 0.02;
    const t = Math.min(1, progress * 1.15);
    const travel = spec.speed * t;
    shard.position.set(spec.dir.x * travel, spec.dir.y * travel - 2.4 * t * t, spec.dir.z * travel);
    shard.scale.setScalar(Math.max(0.001, spec.scale * (1 - t * 0.8)));
    shard.rotation.set(t * 6 + index, t * 4.5, t * 3);
  }
  return progress >= 1;
}

/**
 * Avance l'éclair d'une frame : nuée → frappe → braises.
 *
 * @param {THREE.Group} visual groupe renvoyé par `makeCloudLightningBolt()`
 * @param {{age:number, phase:string}} projectile état mutable
 * @param {number} dt secondes depuis la frame précédente
 * @param {THREE.Vector3} targetPoint position courante de la cible (torse)
 * @param {{onStrike?: () => void}} hooks appelé quand la foudre claque
 * @returns {boolean} true quand l'effet peut être retiré de la scène
 */
export function updateCloudLightningVisual(visual, projectile, dt, targetPoint, hooks = {}) {
  const parts = visual.userData;
  // La cible bouge : l'orage la suit jusqu'à la frappe.
  visual.position.set(
    targetPoint.x,
    Math.max(0, targetPoint.y - CLOUD_BOLT_GROUND_OFFSET),
    targetPoint.z,
  );
  projectile.age += dt;

  // 1. L'orage se forme au-dessus de la cible pendant que Cloud lève l'épée.
  if (projectile.phase === 'storm') {
    const progress = Math.min(1, projectile.age / CLOUD_BOLT_STORM_DURATION);
    const swell = progress * progress * (3 - 2 * progress);
    parts.cloud.scale.setScalar(0.34 + swell * 0.86);
    parts.cloud.rotation.y += dt * 3.4;
    fadeCloudMaterials(parts.materials, 'cloud', (0.35 + swell * 0.65) * (0.72 + Math.random() * 0.28));
    fadeCloudMaterials(parts.materials, 'bolt', 0);
    if (progress >= 1) {
      projectile.phase = 'strike';
      projectile.age = 0;
      // La cible tombe quand la foudre claque, pas avant.
      hooks.onStrike?.();
    }
    return false;
  }

  // 2. L'éclair claque du nuage jusqu'au sol.
  if (projectile.phase === 'strike') {
    const progress = Math.min(1, projectile.age / CLOUD_BOLT_STRIKE_DURATION);
    parts.bolt.visible = true;
    parts.impact.visible = true;
    parts.bolt.scale.set(1, Math.min(1, 0.18 + progress * 1.5), 1);
    const flicker = 0.72 + Math.random() * 0.28;
    fadeCloudMaterials(parts.materials, 'bolt', flicker);
    fadeCloudMaterials(parts.materials, 'impact', flicker * (0.45 + progress * 0.55));
    fadeCloudMaterials(parts.materials, 'cloud', 1);
    parts.core.scale.setScalar(1.6 - progress * 0.6);
    if (progress >= 1) {
      projectile.phase = 'fade';
      projectile.age = 0;
    }
    return false;
  }

  // 3. Braises : l'éclair vacille, les anneaux s'étalent, le sol fume.
  const progress = Math.min(1, projectile.age / CLOUD_BOLT_FADE_DURATION);
  const boltLife = progress / 0.42;
  parts.bolt.visible = boltLife < 1;
  if (parts.bolt.visible) {
    parts.bolt.scale.set(1, 1, 1);
    fadeCloudMaterials(parts.materials, 'bolt', (1 - boltLife) * (0.45 + Math.random() * 0.55));
  }
  parts.cloud.scale.setScalar(1.2 + progress * 0.55);
  parts.cloud.rotation.y += dt * 1.3;
  fadeCloudMaterials(parts.materials, 'cloud', 1 - progress);
  fadeCloudMaterials(parts.materials, 'impact', (1 - progress) ** 1.5);
  fadeCloudMaterials(parts.materials, 'scorch', (1 - progress) ** 0.7);
  fadeCloudMaterials(parts.materials, 'spark', (1 - progress) ** 1.1);
  parts.ring.scale.setScalar(0.6 + progress * 3.6);
  parts.ringWide.scale.setScalar(0.6 + progress * 5.2);
  parts.column.scale.set(1 + progress * 0.6, Math.max(0.05, 1 - progress * 0.4), 1 + progress * 0.6);
  parts.core.scale.setScalar(Math.max(0.001, 1.6 - progress * 2.2));
  for (let index = 0; index < parts.sparks.length; index += 1) {
    const spark = parts.sparks[index];
    const spec = parts.sparkSpecs[index];
    const t = Math.min(1, progress * 1.3);
    const travel = spec.speed * t;
    spark.position.set(
      spec.dir.x * travel,
      Math.max(0.06, 0.85 + spec.dir.y * travel - 7.5 * t * t),
      spec.dir.z * travel,
    );
    spark.scale.setScalar(Math.max(0.001, spec.scale * (1 - t * 0.7)));
  }
  return progress >= 1;
}
