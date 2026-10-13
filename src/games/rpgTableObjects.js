/**
 * Le Sablier — les objets posés sur la table, en vraie 3D.
 *
 * La lanterne, la gourde, la corde, les galets, le bol de cuivre, les amas de
 * cristaux… ne sont plus peints dans le plateau : la peinture « vide » (`plaque`) les a perdus
 * et ce fichier les reconstruit en géométrie, avec leur ombre et leur reflet.
 * Pas de GLB ni de texture distante : tout est procédural, comme les tours du
 * mode Histoire, et se construit sous Node (aucun `document` ici).
 *
 * Repère d'un objet : posé à plat sur la table, `+Z` vers le haut, l'origine
 * au sol ; son grand axe suit `+Y` (la scène le tourne ensuite de `angle`).
 * `extent` est sa longueur naturelle : la scène le met à l'échelle pour que
 * `extent` vaille `size` × la largeur de l'image peinte.
 */
import * as THREE from 'three';
import { seededRandom } from './rpgTableSceneThemes.js';

/** Un grain coloré, raccordable, pour le cuir, la corde, la pierre. */
function grainTexture({ seed, base, variation = 0.18, size = 64, stripes = 0 }) {
  const random = seededRandom(seed);
  const cells = new Float32Array(size * size);
  for (let i = 0; i < cells.length; i += 1) cells[i] = random();
  const at = (x, y) => cells[((y + size) % size) * size + ((x + size) % size)];
  const data = new Uint8Array(size * size * 4);
  const rgb = [parseInt(base.slice(1, 3), 16), parseInt(base.slice(3, 5), 16), parseInt(base.slice(5, 7), 16)];
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    // Lissage 3×3 : un grain doux plutôt qu'un bruit de télévision.
    let sum = 0;
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) sum += at(x + dx, y + dy);
    let tone = 1 + (sum / 9 - 0.5) * 2 * variation;
    // Brins d'une corde : des diagonales raccordables.
    if (stripes) tone *= 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(((x + y) / size) * Math.PI * 2 * stripes));
    const index = (y * size + x) * 4;
    data[index] = Math.min(255, rgb[0] * tone);
    data[index + 1] = Math.min(255, rgb[1] * tone);
    data[index + 2] = Math.min(255, rgb[2] * tone);
    data[index + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

const lathe = (points, segments = 40) => new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments);
const mesh = (geometry, material, name) => {
  const part = new THREE.Mesh(geometry, material);
  part.name = name;
  part.castShadow = true;
  part.receiveShadow = true;
  return part;
};

/** Fabrique de matériaux partagés par un objet ; `env` reflète la pièce (métaux, verre). */
function materials(env) {
  const metal = (name, color, roughness, metalness = 0.9) => new THREE.MeshStandardMaterial({ name, color, roughness, metalness, envMap: env, envMapIntensity: 0.7 });
  return { metal, standard: (name, options) => new THREE.MeshStandardMaterial({ name, envMap: env, envMapIntensity: 0.18, ...options }) };
}

/** Le bol de cuivre : une coque de révolution, rebord roulé, fond plat. */
function buildBowl(env) {
  const kit = materials(env);
  const group = new THREE.Group();
  const profile = [[0.001, 0], [0.22, 0], [0.3, 0.015], [0.4, 0.08], [0.47, 0.17], [0.5, 0.235], [0.488, 0.248], [0.47, 0.235], [0.39, 0.15], [0.3, 0.085], [0.15, 0.056], [0.001, 0.05]];
  const geometry = lathe(profile, 56);
  geometry.rotateX(Math.PI / 2); // l'axe de révolution devient la verticale
  group.add(mesh(geometry, Object.assign(kit.metal('cuivre', '#b9663b', 0.36), { side: THREE.DoubleSide }), 'bol'));
  group.userData = { kind: 'bol', extent: 1 };
  return group;
}

/** Galets noirs polis, aplatis, jamais deux identiques. */
const GALETS = [
  [-0.321, 0.407, 0.114], [-0.179, 0.107, 0.2], [0.036, 0.286, 0.143], [0.32, 0.264, 0.157], [0.157, -0.071, 0.171], [-0.486, 0.107, 0.121], [-0.229, -0.521, 0.136],
];
function buildPebbles(env) {
  const kit = materials(env);
  const group = new THREE.Group();
  const random = seededRandom(51);
  const stone = kit.standard('galet', { color: '#35343a', roughness: 0.28, metalness: 0.08, map: grainTexture({ seed: 9, base: '#ffffff', variation: 0.22 }) });
  for (const [x, y, radius] of GALETS) {
    const geometry = new THREE.IcosahedronGeometry(1, 3);
    const positions = geometry.attributes.position;
    const bumps = [random() * 6, random() * 6, random() * 6];
    for (let i = 0; i < positions.count; i += 1) {
      const px = positions.getX(i), py = positions.getY(i), pz = positions.getZ(i);
      // Déformation douce : un galet, pas une boule.
      const wobble = 1 + 0.1 * Math.sin(px * 2.3 + bumps[0]) * Math.cos(py * 2.1 + bumps[1]) + 0.07 * Math.sin(pz * 3 + bumps[2]);
      positions.setXYZ(i, px * wobble, py * wobble, pz * wobble * 0.55);
    }
    geometry.computeVertexNormals();
    const pebble = mesh(geometry, stone, 'galet');
    pebble.scale.setScalar(radius);
    pebble.position.set(x, y, radius * 0.5);
    pebble.rotation.z = random() * Math.PI * 2;
    group.add(pebble);
  }
  group.userData = { kind: 'galets', extent: 1 };
  return group;
}

/** Corde en spirale, torsade visible, queue qui s'échappe vers la gauche. */
function buildRope(env) {
  const kit = materials(env);
  const group = new THREE.Group();
  const tube = 0.046;
  const points = [];
  // Le bout libre, légèrement ondulé, qui vient au pied de la spirale.
  for (const [x, y] of [[-1.15, -0.14], [-0.95, -0.25], [-0.75, -0.3], [-0.55, -0.35], [-0.38, -0.32]]) points.push(new THREE.Vector3(x, y, tube));
  // Puis la spirale, du bord vers le centre : trois tours, pas d'un diamètre de corde.
  const turns = 3, steps = 96;
  const start = Math.atan2(-0.32, -0.38);
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const radius = 0.48 - 0.3 * t;
    const angle = start - t * turns * Math.PI * 2;
    // La corde chevauche légèrement la boucle précédente : un peu de relief.
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, tube * (1 + 0.45 * t)));
  }
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const geometry = new THREE.TubeGeometry(curve, 520, tube, 10, false);
  const grain = grainTexture({ seed: 4, base: '#b69258', variation: 0.2, size: 64, stripes: 2 });
  grain.repeat.set(95, 1);
  group.add(mesh(geometry, kit.standard('corde', { map: grain, roughness: 0.9, metalness: 0 }), 'corde'));
  group.userData = { kind: 'corde', extent: 1 };
  return group;
}

/** La gourde de cuir : corps aplati, goulot, bouchon sombre, sangle posée à côté. */
function buildWaterskin(env) {
  const kit = materials(env);
  const group = new THREE.Group();
  const flat = 0.42;
  const profile = [[0.001, 0], [0.12, 0.01], [0.22, 0.08], [0.3, 0.22], [0.32, 0.38], [0.27, 0.55], [0.17, 0.7], [0.1, 0.8], [0.075, 0.88], [0.07, 0.93]];
  const body = lathe(profile, 48);
  body.scale(1, 1, flat);
  const leather = kit.standard('cuir', { map: grainTexture({ seed: 21, base: '#6a3d20', variation: 0.3, size: 64 }), roughness: 0.62, metalness: 0.02 });
  const skin = mesh(body, leather, 'corps');
  skin.position.z = 0.32 * flat;
  group.add(skin);
  const stopper = mesh(new THREE.CylinderGeometry(0.058, 0.07, 0.1, 20), kit.standard('bouchon', { color: '#22201f', roughness: 0.4, metalness: 0.2 }), 'bouchon');
  stopper.position.set(0, 0.975, 0.32 * flat);
  group.add(stopper);
  const collar = mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 24), kit.metal('collier', '#3a3835', 0.5, 0.6), 'collier');
  collar.position.set(0, 0.925, 0.32 * flat);
  collar.rotation.x = Math.PI / 2;
  group.add(collar);
  // La sangle : de l'anneau du goulot, glissée sur le sable, bouclée en bas.
  const strapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.05, 0.9, 0.13), new THREE.Vector3(0.28, 0.9, 0.05), new THREE.Vector3(0.52, 0.66, 0.04), new THREE.Vector3(0.62, 0.32, 0.04),
    new THREE.Vector3(0.58, 0.02, 0.04), new THREE.Vector3(0.42, -0.14, 0.04), new THREE.Vector3(0.22, -0.1, 0.04),
  ], false, 'centripetal');
  const strap = new THREE.TubeGeometry(strapCurve, 90, 0.04, 8, false);
  strap.scale(1, 1, 0.32); // sangle plate
  const strapMesh = mesh(strap, kit.standard('sangle', { color: '#7a4a28', roughness: 0.75, metalness: 0, map: leather.map }), 'sangle');
  group.add(strapMesh);
  group.userData = { kind: 'gourde', extent: 1.02 };
  return group;
}

/**
 * La lanterne de laiton, couchée sur le flanc (vue du dessus, une lanterne
 * debout n'est qu'un rond) : réservoir, verre, armature, calotte et anse
 * rabattue à plat, flamme qui éclaire vraiment le sable.
 */
function buildLantern(env) {
  const kit = materials(env);
  const group = new THREE.Group();
  const rest = 0.2; // hauteur de l'axe : le rayon du réservoir
  const brass = kit.metal('laiton', '#a68a4c', 0.38, 0.88);
  const lift = (part) => { part.position.z += rest; return part; };
  // Toutes les révolutions ont l'axe +Y : c'est déjà l'axe long de la lanterne.
  const baseGeometry = lathe([[0.001, 0], [0.19, 0], [0.205, 0.02], [0.185, 0.07], [0.001, 0.07]], 40);
  group.add(lift(mesh(baseGeometry, brass, 'pied')));
  group.add(lift(mesh(lathe([[0.19, 0.07], [0.225, 0.11], [0.225, 0.17], [0.17, 0.215], [0.15, 0.22]], 40), brass, 'reservoir')));
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    name: 'verre', color: '#cfe6e6', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0,
    envMap: env, envMapIntensity: 1.3, side: THREE.DoubleSide, depthWrite: false,
  });
  const glass = lift(mesh(lathe([[0.15, 0.215], [0.185, 0.3], [0.18, 0.42], [0.14, 0.53], [0.12, 0.6]], 40), glassMaterial, 'globe'));
  glass.castShadow = false;
  glass.renderOrder = 4;
  group.add(glass);
  for (let i = 0; i < 4; i += 1) {
    const angle = Math.PI / 4 + (i * Math.PI) / 2;
    const rod = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.4, 6), brass, 'montant');
    rod.position.set(Math.cos(angle) * 0.178, 0.41, rest + Math.sin(angle) * 0.178);
    group.add(rod);
  }
  group.add(lift(mesh(lathe([[0.12, 0.6], [0.16, 0.615], [0.14, 0.66], [0.08, 0.72], [0.06, 0.78], [0.075, 0.8], [0.04, 0.82], [0.001, 0.82]], 40), brass, 'calotte')));
  // L'anse : un arc rabattu à plat, dans le plan de la table.
  const bail = mesh(new THREE.TorusGeometry(0.2, 0.009, 6, 40, Math.PI), brass, 'anse');
  bail.position.set(0, 0.64, rest);
  bail.scale.set(1, 1.1, 1);
  group.add(bail);
  // La flamme : un noyau chaud, additif, et une vraie lumière.
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), new THREE.MeshBasicMaterial({ color: '#ff9f3a', transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
  flame.name = 'flamme';
  flame.scale.set(0.5, 1.05, 0.5);
  flame.position.set(0, 0.3, rest);
  flame.renderOrder = 5;
  group.add(flame);
  const lamp = new THREE.PointLight('#ffb560', 0.9, 2.6, 1.7);
  lamp.name = 'lueur';
  lamp.position.set(0, 0.3, rest + 0.12);
  group.add(lamp);
  group.userData = { kind: 'lanterne', extent: 0.9, flame, lamp };
  return group;
}

/**
 * Un amas de cristaux : des prismes hexagonaux à pointe, en éventail autour de
 * l'axe +Y, couchés presque à plat (vue du dessus, un cristal debout n'est
 * qu'un hexagone). Facettes nettes, vernis, et un cœur qui luit : l'émissif
 * tient lieu de lumière propre, sans lampe de plus. `spec.seed` varie l'amas,
 * `spec.spread` ouvre l'éventail (degrés).
 */
const CRYSTAL_PALETTES = Object.freeze({
  amethystes: { color: '#6f3bc2', emissive: '#44167f', glow: 0.55 },
  rubis: { color: '#a8183a', emissive: '#6a0a1e', glow: 0.5 },
});
function buildCrystals(palette, kind) {
  return (env, spec = {}) => {
    const group = new THREE.Group();
    const random = seededRandom((spec.seed ?? 1) * 7919 + (kind === 'rubis' ? 13 : 5));
    const spread = ((spec.spread ?? 75) * Math.PI) / 180;
    // Trois teintes proches : un amas n'est jamais d'un seul bloc de couleur.
    const tones = [0.82, 1, 1.18].map((factor, index) => {
      const color = new THREE.Color(palette.color).multiplyScalar(factor);
      return new THREE.MeshPhysicalMaterial({
        name: `${kind}-${index}`, color, roughness: 0.2, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.1,
        flatShading: true, emissive: new THREE.Color(palette.emissive), emissiveIntensity: palette.glow,
        envMap: env, envMapIntensity: 0.55,
      });
    });
    const count = 8;
    for (let i = 0; i < count; i += 1) {
      const t = i / (count - 1) - 0.5; // −0,5 … 0,5 : de gauche à droite de l'éventail
      const azimuth = t * spread * 2 + (random() - 0.5) * 0.28;
      // Les cristaux du centre sont les plus longs.
      const length = (1 - 0.55 * Math.abs(t) * 2) * (0.78 + random() * 0.3);
      const radius = 0.075 * Math.pow(length, 0.75) + 0.012;
      const lift = (0.1 + random() * 0.22) * Math.PI; // relevé au-dessus de la table
      const body = length * 0.7, tip = length * 0.3;
      const crystal = new THREE.Group();
      const shaft = mesh(new THREE.CylinderGeometry(radius, radius * 0.92, body, 6), tones[i % 3], 'cristal');
      shaft.position.y = body / 2;
      const point = mesh(new THREE.ConeGeometry(radius, tip, 6), tones[(i + 1) % 3], 'pointe');
      point.position.y = body + tip / 2;
      point.rotation.y = Math.PI / 6;
      crystal.add(shaft, point);
      // Axe du cristal : +Y d'abord, relevé de `lift` vers +Z, puis tourné de `azimuth`.
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -azimuth)
        .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), lift));
      crystal.quaternion.copy(q);
      // Il repose sur la table : son flanc le plus bas touche z = 0.
      crystal.position.set((random() - 0.5) * 0.05, (random() - 0.5) * 0.04, radius * Math.cos(lift) * 0.98);
      group.add(crystal);
    }
    group.userData = { kind, extent: 1 };
    return group;
  };
}

const BUILDERS = Object.freeze({
  bol: buildBowl,
  galets: buildPebbles,
  corde: buildRope,
  gourde: buildWaterskin,
  lanterne: buildLantern,
  amethystes: buildCrystals(CRYSTAL_PALETTES.amethystes, 'amethystes'),
  rubis: buildCrystals(CRYSTAL_PALETTES.rubis, 'rubis'),
});

export const RPG_TABLE_OBJECT_KINDS = Object.freeze(Object.keys(BUILDERS));

/** Construit un objet, ou `null` pour un genre inconnu. `env` : carte d'environnement facultative. */
export function createTableObject(kind, env = null, spec = {}) {
  const build = BUILDERS[kind];
  return build ? build(env, spec) : null;
}

/** L'animation d'un objet à l'instant `t` (secondes) : seule la lanterne vit. */
export function updateTableObject(group, t, phase = 0) {
  const { flame, lamp } = group.userData;
  if (!flame || !lamp) return;
  const flicker = Math.sin(t * 8.3 + phase) * 0.5 + Math.sin(t * 13.9 + phase * 2) * 0.3 + Math.sin(t * 3.1 + phase * 3) * 0.2;
  lamp.intensity = 0.9 * (1 + flicker * 0.18);
  flame.scale.set(0.5 + flicker * 0.03, 1.05 + flicker * 0.1, 0.5 + flicker * 0.03);
}

/** Libère géométries, matériaux et textures d'un objet (la lumière n'a rien à libérer). */
export function disposeTableObject(group) {
  const textures = new Set();
  group.traverse((part) => {
    part.geometry?.dispose();
    for (const material of [].concat(part.material ?? [])) {
      for (const value of Object.values(material)) if (value?.isTexture && value !== material.envMap) textures.add(value);
      material.dispose();
    }
  });
  textures.forEach((texture) => texture.dispose());
}
