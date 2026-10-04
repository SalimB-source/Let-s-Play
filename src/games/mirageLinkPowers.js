/**
 * Techniques de Link dans Mirage Rush.
 *
 * Module three.js pur (aucune dépendance React / DOM) pour rester testable :
 * MirageWorld ajoute le groupe à la scène et appelle les fonctions d'animation
 * à chaque frame, exactement comme pour les pouvoirs de Cloud.
 *
 * - Bombe (bleu) : sphère noire posée derrière le cavalier, mèche allumée qui
 *   brûle 1,5 s, puis déflagration de zone — tout ennemi à portée (2 cases)
 *   tombe de cheval. Un adversaire qui la touche pendant la mèche la fait
 *   sauter sur-le-champ (voir `detonateLinkBomb()`).
 * - Boomerang (jaune) : disque blanc lancé tout droit sur quelques mètres,
 *   puis il revient à la main. Deux lancers par charge. Un adversaire touché
 *   est ralenti.
 * - Triforce (rouge) : l'emblème d'or (trois triangles vers le haut) fonce sur
 *   l'adversaire juste devant et le fait tomber.
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
/**
 * Rayon de contact : un adversaire qui arrive à cette distance du centre de la
 * bombe la touche et la fait détoner avant la fin de la mèche. Une demi-voie :
 * la sphère (0,34 de rayon) et le cavalier se frôlent vraiment.
 */
export const LINK_BOMB_TOUCH_RADIUS = LANE_SPACING / 2;
/** Le boomerang part tout droit, puis revient à la main. */
export const LINK_BOOMERANG_RANGE = 5 * LANE_SPACING;
export const LINK_BOOMERANG_OUT_DURATION = 0.36;
export const LINK_BOOMERANG_RETURN_DURATION = 0.42;
export const LINK_BOOMERANG_HIT_RADIUS = 1.35;
/** Link ralentit un peu plus longtemps que le lasso standard. */
export const LINK_BOOMERANG_SLOW_DURATION = 2.4;
/** Deux lancers par barre jaune pleine. */
export const LINK_BOOMERANG_THROWS = 2;
/** Anciens noms : le grappin a cédé la place au boomerang. */
export const LINK_HOOK_FLIGHT_DURATION = LINK_BOOMERANG_OUT_DURATION;
export const LINK_HOOK_TETHER_DURATION = LINK_BOOMERANG_RETURN_DURATION;
/** Vol de la Triforce, puis éclat sur l'adversaire. */
export const LINK_TRIFORCE_FLIGHT_DURATION = 0.42;
export const LINK_TRIFORCE_IMPACT_DURATION = 0.4;

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
 * Fait détoner la bombe sur-le-champ : un adversaire l'a touchée avant que la
 * mèche n'atteigne la poudre. Sans effet si la bombe a déjà explosé, pour que
 * la fin de mèche et le contact ne comptent qu'une seule déflagration.
 *
 * @param {THREE.Group} visual groupe renvoyé par `makeLinkBomb()`
 * @param {{age:number, phase:string}} projectile état mutable
 * @param {{onExplode?: () => void}} hooks même rappel que la fin de mèche
 * @returns {boolean} true si la déflagration part maintenant
 */
export function detonateLinkBomb(visual, projectile, hooks = {}) {
  if (projectile.phase !== 'fuse') return false;
  const parts = visual.userData;
  projectile.phase = 'blast';
  projectile.age = 0;
  parts.bomb.visible = false;
  parts.ground.visible = false;
  parts.blast.visible = true;
  hooks.onExplode?.();
  return true;
}

/**
 * Un adversaire touche-t-il la bombe ? On compare la distance au sol de chaque
 * cavalier au rayon de contact (`LINK_BOMB_TOUCH_RADIUS`) — mêmes coordonnées
 * que la portée de l'explosion, la hauteur ne compte pas.
 *
 * @param {{x:number, z:number}} origin centre de la bombe
 * @param {Array<{x:number, z:number}>} riders positions au sol des adversaires
 * @returns {boolean} true si l'un d'eux touche la bombe
 */
export function linkBombTouched(origin, riders) {
  for (const rider of riders || []) {
    if (!rider) continue;
    const dx = rider.x - origin.x;
    const dz = rider.z - origin.z;
    if (Math.hypot(dx, dz) <= LINK_BOMB_TOUCH_RADIUS) return true;
  }
  return false;
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
      detonateLinkBomb(visual, projectile, hooks);
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

/**
 * Boomerang blanc : deux ailes en V, lancées tout droit puis rappelées.
 * Le groupe entier se déplace ; l'aile tourne sur elle-même.
 */
export function makeLinkBoomerang() {
  const group = new THREE.Group();
  group.name = 'link-boomerang';
  const materials = [];
  const { basic, solid } = makeMaterials(materials);

  const body = new THREE.Group();
  group.add(body);

  const ivory = solid(0xf4f7ff, { metalness: 0.55, roughness: 0.22, transparent: true });
  const rim = solid(0xd7deea, { metalness: 0.7, roughness: 0.18, transparent: true });
  const core = solid(0xffffff, { metalness: 0.35, roughness: 0.28, transparent: true });

  const makeWing = (sign) => {
    const wing = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.72, 6, 10), ivory);
    blade.rotation.z = Math.PI / 2;
    blade.position.x = 0.39;
    wing.add(blade);
    const edge = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.64, 4, 8), rim);
    edge.rotation.z = Math.PI / 2;
    edge.position.set(0.42, 0.06, 0);
    wing.add(edge);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), ivory);
    tip.position.x = 0.78;
    wing.add(tip);
    wing.rotation.z = sign * 0.62;
    wing.scale.setScalar(1.08);
    return wing;
  };
  body.add(makeWing(-1), makeWing(1));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 12), core);
  hub.rotation.x = Math.PI / 2;
  body.add(hub);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 12, 10),
    basic(0xe8f2ff, 0.45, 'glow', { blending: THREE.AdditiveBlending }),
  );
  body.add(glow);
  const trail = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 1.45),
    basic(0xf5fbff, 0.35, 'trail', { blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
  );
  trail.rotation.x = Math.PI / 2;
  trail.position.z = 0.45;
  group.add(trail);

  group.userData.materials = materials;
  group.userData.kind = 'boomerang';
  group.userData.body = body;
  group.userData.glow = glow;
  group.userData.trail = trail;
  return group;
}

/** @deprecated le grappin a été remplacé par le boomerang. */
export function makeLinkHook() {
  return makeLinkBoomerang();
}

/**
 * Avance le boomerang : il file tout droit sur `LINK_BOOMERANG_RANGE` mètres,
 * puis revient à la main. Le crochet `onTurn` marque le demi-tour.
 *
 * @param {THREE.Group} visual groupe renvoyé par `makeLinkBoomerang()`
 * @param {{age:number, phase:string, start:THREE.Vector3, apex?:THREE.Vector3, spin?:number, forward?:THREE.Vector3}} projectile
 * @param {number} dt secondes depuis la frame précédente
 * @param {THREE.Vector3} handPoint main du cavalier (pour le retour)
 * @param {{onTurn?: () => void}} hooks
 * @returns {boolean} true quand l'effet peut être retiré de la scène
 */
export function updateLinkBoomerangVisual(visual, projectile, dt, handPoint, hooks = {}) {
  const parts = visual.userData;
  projectile.age += dt;
  const forward = projectile.forward || new THREE.Vector3(0, 0, -1);
  projectile.spin = (projectile.spin || 0) + dt * 22;
  parts.body.rotation.y = projectile.spin;
  parts.glow.scale.setScalar(1 + Math.sin((projectile.age + projectile.spin) * 18) * 0.18);

  if (projectile.phase === 'flight' || projectile.phase === 'out') {
    projectile.phase = 'out';
    const progress = Math.min(1, projectile.age / LINK_BOOMERANG_OUT_DURATION);
    const eased = 1 - (1 - progress) ** 2;
    visual.position.copy(projectile.start).addScaledVector(forward, LINK_BOOMERANG_RANGE * eased);
    visual.position.y += Math.sin(progress * Math.PI) * 0.28;
    visual.rotation.x = Math.sin(progress * Math.PI) * 0.12;
    parts.trail.scale.set(1, 0.4 + progress * 1.4, 1);
    parts.trail.position.z = 0.2 + progress * 0.55;
    fadeLinkMaterials(parts.materials, 'trail', 0.35 + progress * 0.45);
    if (progress >= 1) {
      projectile.phase = 'return';
      projectile.age = 0;
      projectile.apex = visual.position.clone();
      hooks.onTurn?.();
    }
    return false;
  }

  const progress = Math.min(1, projectile.age / LINK_BOOMERANG_RETURN_DURATION);
  const eased = progress ** 1.15;
  const from = projectile.apex || visual.position;
  visual.position.copy(from).lerp(handPoint, eased);
  visual.position.y += Math.sin(progress * Math.PI) * 0.22;
  visual.rotation.x = Math.sin(progress * Math.PI) * -0.16;
  parts.trail.scale.set(1, Math.max(0.2, 1.6 - progress * 1.3), 1);
  fadeLinkMaterials(parts.materials, 'glow', progress > 0.75 ? (1 - progress) / 0.25 : 1);
  fadeLinkMaterials(parts.materials, 'trail', progress > 0.7 ? (1 - progress) / 0.3 : 0.55);
  fadeLinkMaterials(parts.materials, 'body', progress > 0.88 ? (1 - progress) / 0.12 : 1);
  return progress >= 1;
}

/** @deprecated */
export function updateLinkHookVisual(visual, projectile, dt, fromPoint, _targetPoint, hooks = {}) {
  return updateLinkBoomerangVisual(visual, projectile, dt, fromPoint, hooks);
}

function makeEquilateralTriangleShape(size) {
  const height = size * Math.sqrt(3) / 2;
  const shape = new THREE.Shape();
  shape.moveTo(0, height * 2 / 3);
  shape.lineTo(size / 2, -height / 3);
  shape.lineTo(-size / 2, -height / 3);
  shape.closePath();
  return { shape, size, height };
}

function triforceAssetUrl() {
  const base = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
    ? import.meta.env.BASE_URL
    : '/';
  return `${base}icons/mirage-rush/link-triforce.webp`;
}

/** La Triforce : trois triangles d'or vers le haut, plus l'image sacrée. */
export function makeLinkTriforce() {
  const group = new THREE.Group();
  group.name = 'link-triforce';
  const materials = [];
  const { basic, solid } = makeMaterials(materials);

  const emblem = new THREE.Group();
  group.add(emblem);

  const { shape, size, height } = makeEquilateralTriangleShape(0.58);
  const extrude = new THREE.ExtrudeGeometry(shape, {
    depth: 0.07,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.016,
    bevelSegments: 2,
  });
  extrude.translate(0, 0, -0.035);
  const gold = solid(0xffd056, {
    metalness: 0.72,
    roughness: 0.22,
    emissive: 0x6a4708,
    emissiveIntensity: 0.45,
    transparent: true,
  });
  const placements = [
    [0, height / 2, 0],
    [-size / 2, -height / 2, 0],
    [size / 2, -height / 2, 0],
  ];
  const triangles = [];
  for (const [x, y] of placements) {
    const triangle = new THREE.Mesh(extrude, gold);
    triangle.position.set(x, y, 0);
    emblem.add(triangle);
    triangles.push(triangle);
  }

  const aura = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 28),
    basic(0xffe7a0, 0.42, 'glow', { blending: THREE.AdditiveBlending }),
  );
  aura.position.z = -0.08;
  emblem.add(aura);
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.78, 0.98, 32),
    basic(0xfff3c4, 0.85, 'glow', { blending: THREE.AdditiveBlending }),
  );
  halo.position.z = -0.06;
  emblem.add(halo);

  const spriteMat = basic(0xffffff, 0, 'sprite', { blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const sprite = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 1.72), spriteMat);
  sprite.position.z = 0.05;
  emblem.add(sprite);
  if (typeof THREE.TextureLoader === 'function') {
    try {
      const loader = new THREE.TextureLoader();
      loader.load(triforceAssetUrl(), (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        spriteMat.map = texture;
        spriteMat.opacity = 1;
        spriteMat.userData.baseOpacity = 1;
        spriteMat.needsUpdate = true;
      });
    } catch {
      // Les tests Node n'ont pas de chargeur d'image : les triangles 3D suffisent.
    }
  }

  const shards = [];
  const shardSpecs = [];
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const shard = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.28, 4),
      basic(0xfff0a8, 0.95, 'glow', { blending: THREE.AdditiveBlending }),
    );
    shard.visible = false;
    group.add(shard);
    shards.push(shard);
    shardSpecs.push({ angle, speed: 2.4 + Math.random() * 1.8, scale: 0.7 + Math.random() * 0.7 });
  }

  group.userData.materials = materials;
  group.userData.kind = 'triforce';
  group.userData.emblem = emblem;
  group.userData.triangles = triangles;
  group.userData.aura = aura;
  group.userData.halo = halo;
  group.userData.sprite = sprite;
  group.userData.shards = shards;
  group.userData.shardSpecs = shardSpecs;
  group.userData.triangleHome = placements;
  return group;
}

/**
 * Avance la Triforce : les trois triangles se rassemblent, l'emblème fonce
 * sur l'adversaire (toujours face caméra), puis éclate.
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
  if (camera) visual.quaternion.copy(camera.quaternion);

  if (projectile.phase === 'flight') {
    const progress = Math.min(1, projectile.age / LINK_TRIFORCE_FLIGHT_DURATION);
    const assemble = Math.min(1, progress / 0.28);
    visual.position.copy(projectile.start).lerp(targetPoint, progress ** 0.85);
    visual.position.y += Math.sin(progress * Math.PI) * 0.28;
    projectile.spin = (projectile.spin || 0) + dt * 2.4;
    parts.emblem.rotation.z = Math.sin(projectile.spin) * 0.12;
    const pulse = 0.82 + assemble * 0.28 + Math.sin(progress * Math.PI) * 0.22;
    visual.scale.setScalar(pulse);
    parts.aura.scale.setScalar(0.7 + assemble * 0.5 + Math.sin(progress * 10) * 0.08);
    parts.halo.scale.setScalar(0.75 + assemble * 0.4);
    fadeLinkMaterials(parts.materials, 'sprite', 0.35 + assemble * 0.65);
    fadeLinkMaterials(parts.materials, 'glow', 0.45 + assemble * 0.55);
    const homes = parts.triangleHome || [];
    for (let i = 0; i < (parts.triangles || []).length; i += 1) {
      const triangle = parts.triangles[i];
      const [hx, hy] = homes[i] || [0, 0];
      const spread = 1 - assemble;
      triangle.position.set(hx * (1 + spread * 1.6), hy * (1 + spread * 1.6), 0);
      triangle.rotation.z = (1 - assemble) * (i === 0 ? 0 : i === 1 ? -0.5 : 0.5);
    }
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
  parts.emblem.rotation.z = (projectile.spin || 0) + progress * 1.4;
  visual.scale.setScalar(1.15 + progress * 1.7);
  parts.aura.scale.setScalar(1 + progress * 2.6);
  parts.halo.scale.setScalar(1 + progress * 3.8);
  fadeLinkMaterials(parts.materials, 'triforce', (1 - progress) ** 1.15);
  fadeLinkMaterials(parts.materials, 'outline', (1 - progress) ** 1.15);
  fadeLinkMaterials(parts.materials, 'body', (1 - progress) ** 1.15);
  fadeLinkMaterials(parts.materials, 'sprite', (1 - progress) ** 0.9);
  fadeLinkMaterials(parts.materials, 'glow', (1 - progress) ** 0.75);
  for (let i = 0; i < parts.shards.length; i += 1) {
    const shard = parts.shards[i];
    const spec = parts.shardSpecs[i];
    const t = Math.min(1, progress * 1.2);
    const travel = spec.speed * t;
    shard.position.set(Math.cos(spec.angle) * travel, Math.sin(spec.angle) * travel, 0.05);
    shard.scale.setScalar(Math.max(0.001, spec.scale * (1 - t * 0.75)));
    shard.rotation.z = spec.angle + t * 4;
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
