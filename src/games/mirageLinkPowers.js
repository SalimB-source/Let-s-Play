/**
 * Techniques de Link dans Mirage Rush.
 *
 * Module three.js pur (aucune dépendance React / DOM) pour rester testable :
 * MirageWorld ajoute le groupe à la scène et appelle les fonctions d'animation
 * à chaque frame, exactement comme pour les pouvoirs de Cloud.
 *
 * - Bombe (bleu) : sphère noire posée derrière le cavalier, mèche allumée qui
 *   brûle 1,5 s, puis déflagration de zone — tout ennemi à portée (2 cases)
 *   tombe de cheval.
 * - Grappin (jaune) : le crochet part de la main, s'accroche dans le dos de la
 *   cible et la ralentit le temps de la traction.
 * - Triforce (rouge) : le triangle d'or fonce sur l'adversaire juste devant et
 *   le fait tomber.
 */
import * as THREE from 'three';
// Une « case » = l'écart entre deux voies de la piste (voir mirageRules.js).
import { LANE_SPACING } from './mirageRules.js';

/** La mèche brûle pendant 1,5 s avant l'explosion. */
export const LINK_BOMB_FUSE_DURATION = 1.5;
/** Durée de la déflagration : boule de feu, anneau de portée, étincelles. */
export const LINK_BOMB_BLAST_DURATION = 0.62;
/** Portée de l'explosion, en cases (2 cases autour de la bombe). */
export const LINK_BOMB_AOE_TILES = 2;
/** Portée de l'explosion en unités monde : 2 × l'écart entre deux voies. */
export const LINK_BOMB_AOE_RADIUS = LINK_BOMB_AOE_TILES * LANE_SPACING;
/** Vol du crochet, puis traction qui ralentit la cible. */
export const LINK_HOOK_FLIGHT_DURATION = 0.26;
export const LINK_HOOK_TETHER_DURATION = 0.46;
/** Vol de la Triforce, puis éclat sur l'adversaire. */
export const LINK_TRIFORCE_FLIGHT_DURATION = 0.34;
export const LINK_TRIFORCE_IMPACT_DURATION = 0.36;

function makeMaterials(list) {
  const basic = (color, opacity, tag, extra = {}) => {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      toneMapped: false,
      ...extra,
    });
    material.userData.baseOpacity = opacity;
    material.userData.group = tag;
    list.push(material);
    return material;
  };
  const solid = (color, extra = {}) => {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.46,
      metalness: 0.22,
      flatShading: true,
      ...extra,
    });
    material.userData.baseOpacity = 1;
    material.userData.group = 'body';
    list.push(material);
    return material;
  };
  return { basic, solid };
}

/** Applique un coefficient d'opacité à un sous-ensemble de matériaux. */
export function fadeLinkMaterials(materials, tag, value) {
  const factor = Math.max(0, Math.min(1, value));
  for (const material of materials) {
    if (material.userData.group !== tag) continue;
    material.opacity = Math.min(1, (material.userData.baseOpacity ?? 1) * factor);
  }
}

/**
 * La bombe ronde noire à mèche allumée, posée derrière le cavalier.
 * Le groupe porte deux états : le corps (visible) et l'explosion (masquée).
 */
export function makeLinkBomb() {
  const group = new THREE.Group();
  group.name = 'link-bomb';
  const materials = [];
  const { basic, solid } = makeMaterials(materials);

  const bomb = new THREE.Group();
  group.add(bomb);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), solid(0x15141c));
  bomb.add(shell);
  // Reflet : la lumière accroche le haut de la sphère, comme une bombe vernie.
  const shine = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 10, 8),
    basic(0xd8e6ff, 0.42, 'body', { blending: THREE.AdditiveBlending }),
  );
  shine.position.set(-0.13, 0.18, -0.21);
  bomb.add(shine);
  // Mèche : un fil sombre au sommet, qui raccourcit à mesure qu'elle brûle.
  const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.05, 0.36, 8), solid(0x4a3a26));
  fuse.position.set(0.06, 0.36, 0);
  fuse.rotation.z = -0.28;
  bomb.add(fuse);
  // L'étincelle vit au bout de la mèche et descend vers la bombe.
  const spark = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 10, 8),
    basic(0xffd06a, 1, 'spark', { blending: THREE.AdditiveBlending }),
  );
  bomb.add(spark);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 10, 8),
    basic(0xff9c2e, 0.5, 'spark', { blending: THREE.AdditiveBlending }),
  );
  bomb.add(halo);
  // Halo au sol : la bombe est bien posée, on la voit de loin.
  const ground = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.44, 24), basic(0x2a1c12, 0.5, 'ground'));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.33;
  group.add(ground);

  // Explosion : révélée à la fin de la mèche.
  const blast = new THREE.Group();
  blast.visible = false;
  group.add(blast);
  const fireball = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 16, 12),
    basic(0xffae3a, 0.95, 'blast', { blending: THREE.AdditiveBlending }),
  );
  blast.add(fireball);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 14, 10),
    basic(0xfff3c4, 1, 'blast', { blending: THREE.AdditiveBlending }),
  );
  blast.add(core);
  // L'anneau matérialise la portée : 2 cases autour de la bombe.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.82, 1, 32),
    basic(0xffd166, 0.85, 'ring', { blending: THREE.AdditiveBlending }),
  );
  ring.rotation.x = -Math.PI / 2;
  blast.add(ring);
  const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), basic(0x3a2b22, 0.55, 'smoke'));
  smoke.position.y = 0.35;
  blast.add(smoke);
  const sparks = [];
  const sparkSpecs = [];
  const sparkGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.32);
  const sparkMaterial = basic(0xffe6a8, 1, 'spark', { blending: THREE.AdditiveBlending });
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
    const mesh = new THREE.Mesh(sparkGeometry, sparkMaterial);
    blast.add(mesh);
    sparks.push(mesh);
    sparkSpecs.push({
      dir: new THREE.Vector3(Math.cos(angle) * (1 + Math.random()), 1.2 + Math.random() * 1.6, Math.sin(angle) * (1 + Math.random())),
      speed: 2.4 + Math.random() * 2.6,
      scale: 0.7 + Math.random() * 0.8,
    });
  }

  group.userData.materials = materials;
  group.userData.kind = 'bomb';
  group.userData.bomb = bomb;
  group.userData.shell = shell;
  group.userData.fuse = fuse;
  group.userData.spark = spark;
  group.userData.halo = halo;
  group.userData.ground = ground;
  group.userData.blast = blast;
  group.userData.fireball = fireball;
  group.userData.core = core;
  group.userData.ring = ring;
  group.userData.smoke = smoke;
  group.userData.sparks = sparks;
  group.userData.sparkSpecs = sparkSpecs;
  return group;
}

/**
 * Avance la bombe d'une frame : la mèche brûle, puis la déflagration éclate.
 *
 * @param {THREE.Group} visual groupe renvoyé par `makeLinkBomb()`
 * @param {{age:number, phase:string}} projectile état mutable
 * @param {number} dt secondes depuis la frame précédente
 * @param {{onExplode?: () => void}} hooks appelé quand la mèche atteint la bombe
 * @returns {boolean} true quand l'effet peut être retiré de la scène
 */
export function updateLinkBombVisual(visual, projectile, dt, hooks = {}) {
  const parts = visual.userData;
  projectile.age += dt;
  if (projectile.phase === 'fuse') {
    const progress = Math.min(1, projectile.age / LINK_BOMB_FUSE_DURATION);
    // Le claquement accélère : plus la mèche raccourcit, plus la bombe palpite.
    const beat = 6 + progress * 30;
    parts.bomb.scale.setScalar(1 + Math.sin(projectile.age * beat) * (0.05 + progress * 0.12));
    parts.bomb.rotation.y += dt * (1.4 + progress * 5);
    // La mèche brûle : l'étincelle descend le long du fil, qui rétrécit.
    parts.spark.position.set(0.06 + progress * 0.02, 0.52 - progress * 0.34, 0);
    const flicker = 0.7 + Math.random() * 0.3;
    parts.spark.scale.setScalar((1 - progress * 0.3) * flicker);
    parts.halo.position.copy(parts.spark.position);
    parts.halo.scale.setScalar((1.1 - progress * 0.35) * flicker);
    parts.fuse.scale.y = Math.max(0.08, 1 - progress * 0.85);
    parts.fuse.position.y = 0.36 - progress * 0.15;
    fadeLinkMaterials(parts.materials, 'spark', flicker);
    if (projectile.age >= LINK_BOMB_FUSE_DURATION) {
      projectile.phase = 'blast';
      projectile.age = 0;
      parts.bomb.visible = false;
      parts.ground.visible = false;
      parts.blast.visible = true;
      hooks.onExplode?.();
    }
    return false;
  }
  const progress = Math.min(1, projectile.age / LINK_BOMB_BLAST_DURATION);
  parts.fireball.scale.setScalar(0.5 + progress * 2.3);
  parts.core.scale.setScalar(Math.max(0.001, 1.5 - progress * 1.7));
  parts.smoke.scale.setScalar(0.7 + progress * 2.1);
  parts.smoke.position.y = 0.35 + progress * 0.9;
  // L'anneau grandit jusqu'à la portée réelle de l'explosion (2 cases).
  parts.ring.scale.setScalar(LINK_BOMB_AOE_RADIUS * (0.25 + progress * 0.8));
  fadeLinkMaterials(parts.materials, 'blast', (1 - progress) ** 1.3);
  fadeLinkMaterials(parts.materials, 'ring', (1 - progress) ** 0.9);
  fadeLinkMaterials(parts.materials, 'smoke', (1 - progress) ** 0.8);
  fadeLinkMaterials(parts.materials, 'spark', (1 - progress) ** 1.1);
  for (let i = 0; i < parts.sparks.length; i += 1) {
    const spark = parts.sparks[i];
    const spec = parts.sparkSpecs[i];
    const t = Math.min(1, progress * 1.25);
    const travel = spec.speed * t;
    spark.position.set(
      spec.dir.x * travel,
      Math.max(0.06, 0.4 + spec.dir.y * travel - 6.5 * t * t),
      spec.dir.z * travel,
    );
    spark.scale.setScalar(Math.max(0.001, spec.scale * (1 - t * 0.7)));
    spark.rotation.set(t * 7 + i, t * 5, t * 4);
  }
  return progress >= 1;
}

/** Crochet et chaîne du grappin : maillons tendus entre la main et la cible. */
export function makeLinkHook() {
  const group = new THREE.Group();
  group.name = 'link-hook';
  const materials = [];
  const { basic, solid } = makeMaterials(materials);

  const claw = new THREE.Group();
  group.add(claw);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), solid(0x8a8f99, { metalness: 0.7 }));
  shaft.rotation.x = Math.PI / 2;
  claw.add(shaft);
  // Crochet : une courbe ouverte, comme un grappin à trois dents.
  const hook = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.045, 8, 18, Math.PI * 1.45),
    solid(0xc3cad6, { metalness: 0.75, roughness: 0.3 }),
  );
  hook.position.z = 0.2;
  hook.rotation.y = Math.PI / 2;
  claw.add(hook);
  for (const side of [-1, 1]) {
    const prong = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), solid(0xdfe6f0, { metalness: 0.8, roughness: 0.26 }));
    prong.position.set(side * 0.13, 0.06, 0.28);
    prong.rotation.set(Math.PI / 2, 0, -side * 0.5);
    claw.add(prong);
  }
  const clawGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8),
    basic(0xffe08a, 0.55, 'glow', { blending: THREE.AdditiveBlending }),
  );
  claw.add(clawGlow);

  const links = [];
  const linkGeometry = new THREE.BoxGeometry(0.09, 0.09, 0.26);
  const linkMaterial = solid(0x9aa3ae, { metalness: 0.72, roughness: 0.36 });
  for (let i = 0; i < 12; i += 1) {
    const link = new THREE.Mesh(linkGeometry, linkMaterial);
    group.add(link);
    links.push(link);
  }

  group.userData.materials = materials;
  group.userData.kind = 'hook';
  group.userData.claw = claw;
  group.userData.clawGlow = clawGlow;
  group.userData.links = links;
  return group;
}

function layoutChain(links, from, to, slack) {
  const count = links.length;
  for (let i = 0; i < count; i += 1) {
    const t = (i + 1) / (count + 1);
    const link = links[i];
    link.position.lerpVectors(from, to, t);
    link.position.y += Math.sin(t * Math.PI) * slack;
    link.lookAt(to);
    link.scale.set(1, 1, Math.max(0.35, from.distanceTo(to) / (count + 1) / 0.26));
  }
}

/**
 * Avance le grappin : le crochet vole vers la cible, s'y accroche, puis la
 * chaîne reste tendue le temps du ralentissement.
 *
 * @param {THREE.Group} visual groupe renvoyé par `makeLinkHook()`
 * @param {{age:number, phase:string, start:THREE.Vector3}} projectile état mutable
 * @param {number} dt secondes depuis la frame précédente
 * @param {THREE.Vector3} fromPoint main du cavalier (suit la course)
 * @param {THREE.Vector3} targetPoint dos de la cible
 * @param {{onAttach?: () => void}} hooks appelé quand le crochet se plante
 * @returns {boolean} true quand l'effet peut être retiré de la scène
 */
export function updateLinkHookVisual(visual, projectile, dt, fromPoint, targetPoint, hooks = {}) {
  const parts = visual.userData;
  projectile.age += dt;
  if (projectile.phase === 'flight') {
    const progress = Math.min(1, projectile.age / LINK_HOOK_FLIGHT_DURATION);
    parts.claw.position.copy(projectile.start).lerp(targetPoint, progress);
    parts.claw.position.y += Math.sin(progress * Math.PI) * 0.26;
    parts.claw.rotation.z += dt * 15;
    parts.clawGlow.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.5);
    layoutChain(parts.links, fromPoint, parts.claw.position, 0.55 * (1 - progress * 0.6));
    if (progress >= 1) {
      projectile.phase = 'tether';
      projectile.age = 0;
      hooks.onAttach?.();
    }
    return false;
  }
  const progress = Math.min(1, projectile.age / LINK_HOOK_TETHER_DURATION);
  // Accroché dans le dos de la cible : le crochet la suit, la chaîne vibre.
  parts.claw.position.copy(targetPoint);
  parts.claw.position.z += 0.32;
  parts.claw.rotation.z += dt * 4;
  parts.clawGlow.scale.setScalar(1 + Math.sin(projectile.age * 22) * 0.22);
  layoutChain(parts.links, fromPoint, parts.claw.position, 0.16 + Math.sin(progress * Math.PI) * 0.1);
  fadeLinkMaterials(parts.materials, 'body', progress > 0.7 ? (1 - progress) / 0.3 : 1);
  fadeLinkMaterials(parts.materials, 'glow', progress > 0.7 ? (1 - progress) / 0.3 : 1);
  return progress >= 1;
}

function makeTriforceGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.46);
  shape.lineTo(0.42, -0.26);
  shape.lineTo(-0.42, -0.26);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

/** La Triforce : trois triangles d'or, cernés et auréolés de lumière. */
export function makeLinkTriforce() {
  const group = new THREE.Group();
  group.name = 'link-triforce';
  const materials = [];
  const { basic } = makeMaterials(materials);

  const geometry = makeTriforceGeometry();
  const gold = basic(0xffd75e, 1, 'triforce');
  const outline = basic(0x6b4a12, 0.9, 'outline');
  const glow = basic(0xfff0a8, 0.55, 'glow', { blending: THREE.AdditiveBlending });
  // Triangle du haut à gauche, du haut à droite, puis celui du bas (inversé).
  const placements = [
    [-0.23, 0.2, 0],
    [0.23, 0.2, 0],
    [0, -0.28, Math.PI],
  ];
  for (const [x, y, rotation] of placements) {
    const backing = new THREE.Mesh(geometry, outline);
    backing.position.set(x, y, -0.03);
    backing.scale.setScalar(1.12);
    backing.rotation.z = rotation;
    group.add(backing);
    const triangle = new THREE.Mesh(geometry, gold);
    triangle.position.set(x, y, 0);
    triangle.rotation.z = rotation;
    group.add(triangle);
  }
  const aura = new THREE.Mesh(new THREE.CircleGeometry(0.86, 28), glow);
  aura.position.z = -0.06;
  group.add(aura);
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.9, 28), basic(0xfff3c4, 0.8, 'glow', { blending: THREE.AdditiveBlending }));
  halo.position.z = -0.05;
  group.add(halo);
  const shards = [];
  const shardSpecs = [];
  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2;
    const shard = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.26), basic(0xfff0a8, 0.9, 'glow', { blending: THREE.AdditiveBlending }));
    group.add(shard);
    shards.push(shard);
    shardSpecs.push({ angle, speed: 2.1 + Math.random() * 1.6, scale: 0.7 + Math.random() * 0.6 });
    shard.visible = false;
  }

  group.userData.materials = materials;
  group.userData.kind = 'triforce';
  group.userData.aura = aura;
  group.userData.halo = halo;
  group.userData.shards = shards;
  group.userData.shardSpecs = shardSpecs;
  return group;
}

/**
 * Avance la Triforce : elle fonce sur l'adversaire, puis éclate sur lui.
 *
 * @param {THREE.Group} visual groupe renvoyé par `makeLinkTriforce()`
 * @param {{age:number, phase:string, start:THREE.Vector3, spin:number}} projectile
 * @param {number} dt secondes depuis la frame précédente
 * @param {THREE.Vector3} targetPoint position courante de la cible
 * @param {THREE.Camera} camera pour que la Triforce reste face à l'écran
 * @param {{onImpact?: () => void}} hooks appelé au moment de la frappe
 * @returns {boolean} true quand l'effet peut être retiré de la scène
 */
export function updateLinkTriforceVisual(visual, projectile, dt, targetPoint, camera, hooks = {}) {
  const parts = visual.userData;
  projectile.age += dt;
  if (projectile.phase === 'flight') {
    const progress = Math.min(1, projectile.age / LINK_TRIFORCE_FLIGHT_DURATION);
    visual.position.copy(projectile.start).lerp(targetPoint, progress);
    visual.position.y += Math.sin(progress * Math.PI) * 0.22;
    projectile.spin = (projectile.spin || 0) + dt * 7.5;
    if (camera) visual.quaternion.copy(camera.quaternion);
    visual.rotateZ(projectile.spin);
    visual.scale.setScalar(0.9 + Math.sin(progress * Math.PI) * 0.45);
    if (progress >= 1) {
      projectile.phase = 'impact';
      projectile.age = 0;
      for (const shard of parts.shards) shard.visible = true;
      hooks.onImpact?.();
    }
    return false;
  }
  const progress = Math.min(1, projectile.age / LINK_TRIFORCE_IMPACT_DURATION);
  visual.position.copy(targetPoint);
  if (camera) visual.quaternion.copy(camera.quaternion);
  visual.rotateZ((projectile.spin || 0) + progress * 3);
  // L'éclat : la Triforce s'ouvre en étoile, l'anneau part en cercles.
  visual.scale.setScalar(1.3 + progress * 1.9);
  parts.aura.scale.setScalar(1 + progress * 2.2);
  parts.halo.scale.setScalar(1 + progress * 3.4);
  fadeLinkMaterials(parts.materials, 'triforce', (1 - progress) ** 1.2);
  fadeLinkMaterials(parts.materials, 'outline', (1 - progress) ** 1.2);
  fadeLinkMaterials(parts.materials, 'glow', (1 - progress) ** 0.8);
  for (let i = 0; i < parts.shards.length; i += 1) {
    const shard = parts.shards[i];
    const spec = parts.shardSpecs[i];
    const t = Math.min(1, progress * 1.2);
    const travel = spec.speed * t;
    shard.position.set(Math.cos(spec.angle) * travel, Math.sin(spec.angle) * travel, 0.05);
    shard.scale.setScalar(Math.max(0.001, spec.scale * (1 - t * 0.75)));
    shard.rotation.z = spec.angle + t * 3;
  }
  return progress >= 1;
}

/** Libère les ressources GPU d'un effet de Link. */
export function disposeLinkPower(group) {
  const geometries = new Set();
  group.traverse((node) => {
    if (node.geometry && !geometries.has(node.geometry)) {
      geometries.add(node.geometry);
      node.geometry.dispose();
    }
  });
  group.userData.materials?.forEach((material) => material.dispose());
}
