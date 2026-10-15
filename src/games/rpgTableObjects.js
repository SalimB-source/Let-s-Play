/**
 * Le Sablier — les objets posés sur la table, en vraie 3D.
 *
 * La lanterne, la gourde, la corde, les galets, le bol de cuivre, l'astrolabe
 * et les roses de verre ne sont plus peints dans le plateau : la peinture « vide » (`plaque`) les a perdus
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
function buildRope(env, { kind = 'corde', base = '#b69258', tube = 0.046, turns = 3, tail = true, inner = 0.18 } = {}) {
  const kit = materials(env);
  const group = new THREE.Group();
  const points = [];
  // Le bout libre, légèrement ondulé, qui vient au pied de la spirale.
  const freeEnd = tail ? [[-1.15, -0.14], [-0.95, -0.25], [-0.75, -0.3], [-0.55, -0.35], [-0.38, -0.32]] : [[-0.72, -0.2], [-0.55, -0.3], [-0.42, -0.3]];
  for (const [x, y] of freeEnd) points.push(new THREE.Vector3(x, y, tube));
  // Puis la spirale, du bord vers le centre : trois tours, pas d'un diamètre de corde.
  const steps = 96;
  const start = Math.atan2(-0.32, -0.38);
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const radius = 0.48 - (0.48 - inner) * t;
    const angle = start - t * turns * Math.PI * 2;
    // La corde chevauche légèrement la boucle précédente : un peu de relief.
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, tube * (1 + 0.45 * t)));
  }
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const geometry = new THREE.TubeGeometry(curve, 520, tube, 10, false);
  const grain = grainTexture({ seed: 4, base, variation: 0.2, size: 64, stripes: 2 });
  grain.repeat.set(Math.round(95 * (0.046 / tube) ** 0.5), 1);
  group.add(mesh(geometry, kit.standard('corde', { map: grain, roughness: 0.9, metalness: 0 }), 'corde'));
  group.userData = { kind, extent: 1 };
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
    new THREE.Vector3(0.05, 0.9, 0.13), new THREE.Vector3(0.24, 0.88, 0.05), new THREE.Vector3(0.4, 0.68, 0.04), new THREE.Vector3(0.46, 0.34, 0.04),
    new THREE.Vector3(0.4, 0.04, 0.04), new THREE.Vector3(0.26, -0.08, 0.04), new THREE.Vector3(0.12, -0.04, 0.04),
  ], false, 'centripetal');
  const strap = new THREE.TubeGeometry(strapCurve, 90, 0.034, 8, false);
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
function buildLantern(env, { kind = 'lanterne', color = '#a68a4c', roughness = 0.38, metalness = 0.88 } = {}) {
  const kit = materials(env);
  const group = new THREE.Group();
  const rest = 0.2; // hauteur de l'axe : le rayon du réservoir
  const brass = kit.metal('laiton', color, roughness, metalness);
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
  group.userData = { kind, extent: 0.9, flame, lamp };
  return group;
}

/**
 * Un tapis tissé : bandes noires, rouges et ivoire, avec des losanges. La
 * texture est dessinée ici, raccordable (le tapis entier n'a qu'un motif répété).
 * `v` suit la longueur du rouleau, `u` en fait le tour.
 */
function kilimTexture() {
  const width = 64, height = 128;
  const data = new Uint8Array(width * height * 4);
  const ivory = [214, 196, 160], red = [150, 52, 36], black = [34, 24, 22], rust = [190, 96, 62];
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const v = y / height, u = x / width;
    let color = ivory;
    const band = v * 8; // huit bandes sur le motif
    const inBand = band - Math.floor(band);
    const index = Math.floor(band);
    if (index % 4 === 0) color = inBand < 0.22 || inBand > 0.78 ? black : red;
    else if (index % 4 === 2) color = inBand < 0.14 || inBand > 0.86 ? red : ivory;
    else {
      // Les losanges : distance de Manhattan au centre de chaque cellule.
      const cell = (u * 4) % 1, around = Math.abs(cell - 0.5) + Math.abs(inBand - 0.5);
      color = around < 0.26 ? rust : around < 0.34 ? black : ivory;
    }
    // Un grain de laine.
    const grain = 0.9 + 0.1 * Math.sin(x * 2.9 + y * 1.7) * Math.sin(y * 3.7);
    const at = (y * width + x) * 4;
    data[at] = color[0] * grain; data[at + 1] = color[1] * grain; data[at + 2] = color[2] * grain; data[at + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, width, height);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Un tapis roulé, couché : un cylindre tissé, et à son extrémité les couches de
 * l'enroulement en anneaux décalés. L'origine est le centre de l'extrémité
 * « fermée » (gauche), le rouleau part vers +Y ; `extent` est sa longueur.
 */
function buildCarpet(env) {
  const kit = materials(env);
  const group = new THREE.Group();
  const radius = 0.175;
  const texture = kilimTexture();
  texture.repeat.set(1, 2);
  const wool = kit.standard('laine', { map: texture, roughness: 0.95, envMapIntensity: 0.1 });
  const roll = mesh(new THREE.CylinderGeometry(radius, radius, 1, 40, 1, true), wool, 'rouleau');
  roll.position.set(0, 0.5, radius);
  group.add(roll);
  // Les deux extrémités : couches de l'enroulement vues de face, de l'extérieur vers le cœur.
  const layers = ['#6f4a34', '#c9b48a', '#8a3a28', '#3a2a24', '#b89a6c', '#5e3426', '#d2c19a'];
  for (const [y, face] of [[0, -1], [1, 1]]) {
    layers.forEach((color, i) => {
      const r = radius * (1 - i * 0.135);
      const disc = mesh(new THREE.CylinderGeometry(r, r, 0.004, 32), kit.standard('couche', { color, roughness: 0.92 }), 'couche');
      disc.position.set(0, y + face * 0.002 * (i + 1), radius);
      group.add(disc);
    });
  }
  group.userData = { kind: 'tapis', extent: 1.0 };
  return group;
}

/**
 * Un compas de poche en laiton, boîtier et couvercle ouverts côte à côte : le
 * boîtier (cadran, aiguille) à l'origine, le couvercle poli vers +Y, l'anneau de
 * suspension du côté opposé. Unité : 1 = le rayon du boîtier × 2.
 */
function buildCompass(env) {
  const kit = materials(env);
  const group = new THREE.Group();
  const brass = kit.metal('laiton', '#9a7d3c', 0.34, 0.92);
  const cup = (radius) => {
    // Une coupe de révolution, ouverte vers le haut : l'axe Y du lathe devient +Z.
    const geometry = lathe([[0.001, 0], [radius, 0], [radius, 0.1], [radius * 0.92, 0.1], [radius * 0.92, 0.04], [0.001, 0.04]], 40);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  };
  const body = mesh(cup(0.5), brass, 'boitier');
  group.add(body);
  const dial = mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.01, 40), kit.standard('cadran', { color: '#b9a266', roughness: 0.5, metalness: 0.5, envMapIntensity: 0.5 }), 'cadran');
  dial.rotation.x = Math.PI / 2; // axe Y -> Z : le disque est à plat
  dial.position.z = 0.05;
  group.add(dial);
  // Les graduations : huit traits fins, comme sur le cadran peint.
  for (let i = 0; i < 8; i += 1) {
    const tick = mesh(new THREE.BoxGeometry(0.014, 0.16, 0.004), kit.standard('trait', { color: '#4a3820', roughness: 0.7 }), 'graduation');
    tick.position.z = 0.058;
    const angle = (i * Math.PI) / 4;
    tick.position.x = Math.sin(angle) * 0.33;
    tick.position.y = Math.cos(angle) * 0.33;
    tick.rotation.z = -angle;
    tick.castShadow = false;
    group.add(tick);
  }
  // L'aiguille : un losange, moitié rouge, moitié acier, pivotant sur une goupille.
  const needle = new THREE.Group();
  const half = (sign, color) => {
    const part = mesh(new THREE.CylinderGeometry(0.001, 0.05, 0.36, 4), kit.metal('aiguille', color, 0.3, 0.7), 'aiguille');
    part.scale.set(1, 1, 0.25);
    part.position.set(0, sign * 0.18, 0.075);
    if (sign < 0) part.rotation.z = Math.PI;
    needle.add(part);
  };
  half(1, '#b13a2c');
  half(-1, '#7e8794');
  needle.rotation.z = -0.62;
  group.add(needle);
  const pin = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), brass, 'goupille');
  pin.rotation.x = Math.PI / 2;
  pin.position.z = 0.085;
  group.add(pin);
  // Le couvercle, ouvert : une coupe plus plate, au fond poli.
  const lid = new THREE.Group();
  lid.position.set(0, 1.02, 0);
  lid.add(mesh(cup(0.47), brass, 'couvercle'));
  const mirror = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.01, 40), kit.metal('poli', '#c2a455', 0.18, 0.95), 'poli');
  mirror.rotation.x = Math.PI / 2;
  mirror.position.z = 0.047;
  lid.add(mirror);
  group.add(lid);
  const hinge = mesh(new THREE.BoxGeometry(0.2, 0.2, 0.09), brass, 'charniere');
  hinge.position.set(0.02, 0.52, 0.045);
  group.add(hinge);
  // L'anneau de suspension, à plat.
  const ring = mesh(new THREE.TorusGeometry(0.13, 0.026, 8, 24), brass, 'anneau');
  ring.position.set(0, -0.66, 0.03);
  group.add(ring);
  const stem = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), brass, 'tige');
  stem.position.set(0, -0.54, 0.04);
  group.add(stem);
  group.userData = { kind: 'compas', extent: 2.32 };
  return group;
}


/**
 * Un balayage : un tube dont le rayon varie le long d'une courbe (cornes, manches).
 * `radius(t)` donne le rayon, `color(t)` (facultatif) une couleur par sommet,
 * `from`/`to` bornent la portion balayée (les bagues de métal du cor).
 */
function sweep(curve, radius, { segments = 80, radial = 18, from = 0, to = 1, color = null } = {}) {
  const frames = curve.computeFrenetFrames(segments, false);
  const positions = [], colors = [], uvs = [], indices = [];
  const tint = new THREE.Color();
  for (let i = 0; i <= segments; i += 1) {
    const t = from + (to - from) * (i / segments);
    const point = curve.getPointAt(t);
    const index = Math.min(segments, Math.round(t * segments));
    const r = radius(t);
    for (let j = 0; j < radial; j += 1) {
      const a = (j / radial) * Math.PI * 2;
      const n = frames.normals[index], b = frames.binormals[index];
      positions.push(point.x + (Math.cos(a) * n.x + Math.sin(a) * b.x) * r, point.y + (Math.cos(a) * n.y + Math.sin(a) * b.y) * r, point.z + (Math.cos(a) * n.z + Math.sin(a) * b.z) * r);
      uvs.push((j / radial) * 3, t * 5);
      if (color) { color(t, tint); colors.push(tint.r, tint.g, tint.b); }
    }
  }
  for (let i = 0; i < segments; i += 1) for (let j = 0; j < radial; j += 1) {
    const a = i * radial + j, b = i * radial + ((j + 1) % radial), c = a + radial, d = b + radial;
    indices.push(a, b, c, b, d, c);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  if (color) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Le cor à boire : une corne d'ivoire qui s'assombrit vers la pointe, deux
 * bagues de laiton, le fond de la coupe sombre. La corde du cor : `extent` est
 * la corde (bouche → pointe), la courbure s'écarte du côté +X.
 */
function buildHorn(env) {
  const kit = materials(env);
  const group = new THREE.Group();
  const radius = (t) => 0.02 + 0.125 * (1 - t) ** 1.25;
  const centre = (t) => new THREE.Vector3(0.21 * Math.sin(Math.PI * t) * (0.55 + 0.45 * t), t, radius(t) * 1.08);
  const curve = new THREE.CatmullRomCurve3(Array.from({ length: 41 }, (_, i) => centre(i / 40)));
  const ivory = new THREE.Color('#d2c4a2'), dark = new THREE.Color('#24180f');
  const streaks = grainTexture({ seed: 8, base: '#f1e8d2', variation: 0.3, size: 64 });
  streaks.repeat.set(1.5, 0.22); // des veines qui courent le long de la corne
  const horn = new THREE.MeshStandardMaterial({
    name: 'ivoire', vertexColors: true, map: streaks, roughness: 0.62, metalness: 0, envMap: env, envMapIntensity: 0.3,
  });
  group.add(mesh(sweep(curve, radius, { segments: 90, radial: 22, color: (t, out) => out.copy(ivory).lerp(dark, Math.min(1, Math.max(0, (t - 0.38) / 0.5))) }), horn, 'corne'));
  const brass = kit.metal('laiton', '#8b7133', 0.42, 0.85);
  group.add(mesh(sweep(curve, (t) => radius(t) * 1.07, { segments: 14, radial: 22, from: 0, to: 0.17 }), brass, 'bague-bouche'));
  group.add(mesh(sweep(curve, (t) => radius(t) * 1.07, { segments: 10, radial: 22, from: 0.52, to: 0.62 }), brass, 'bague-milieu'));
  // Le fond de la coupe : un disque sombre, un peu en retrait, tourné vers l'axe de la bouche.
  const tangent = curve.getTangentAt(0.001);
  const bowl = mesh(new THREE.CircleGeometry(radius(0) * 0.98, 24), kit.standard('coupe', { color: '#2a2018', roughness: 0.9, metalness: 0 }), 'coupe');
  bowl.position.copy(curve.getPointAt(0.012));
  bowl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent.clone().multiplyScalar(-1));
  bowl.castShadow = false;
  group.add(bowl);
  group.userData = { kind: 'cor', extent: 1 };
  return group;
}

/**
 * La hache : un manche de bois sombre, une tête de fer à large barbe côté −X.
 * Le manche part de +Y (le talon à l'origine) ; `extent` est la longueur du manche.
 */
function buildAxe(env) {
  const kit = materials(env);
  const group = new THREE.Group();
  const grain = grainTexture({ seed: 21, base: '#6b4527', variation: 0.22, size: 64, stripes: 1 });
  grain.repeat.set(1, 6);
  const wood = kit.standard('bois', { map: grain, roughness: 0.7, metalness: 0 });
  const handleCurve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0.03), new THREE.Vector3(0, 1.02, 0.03));
  group.add(mesh(sweep(handleCurve, (t) => 0.038 + 0.014 * (1 - t) ** 3 - 0.006 * t, { segments: 20, radial: 14 }), wood, 'manche'));
  const iron = kit.metal('fer', '#34363b', 0.55, 0.85);
  const blade = new THREE.Shape();
  // Dos droit contre le manche, pointe haute qui s'avance, tranchant en arc rentrant, talon bas.
  blade.moveTo(0.04, 1.1);
  blade.quadraticCurveTo(-0.12, 1.14, -0.3, 1.12);
  blade.quadraticCurveTo(-0.2, 1.0, -0.22, 0.84);
  blade.quadraticCurveTo(-0.1, 0.84, 0.04, 0.9);
  blade.lineTo(0.04, 1.1);
  const bladeGeometry = new THREE.ExtrudeGeometry(blade, { depth: 0.035, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
  const bladePart = mesh(bladeGeometry, iron, 'fer');
  bladePart.position.z = 0.03;
  group.add(bladePart);
  const eye = mesh(new THREE.BoxGeometry(0.1, 0.22, 0.1), iron, 'oeil');
  eye.position.set(0.0, 0.99, 0.055);
  group.add(eye);
  group.userData = { kind: 'hache', extent: 1 };
  return group;
}

/**
 * Le bâton de runes : une planche de chêne sombre, étroite vers le pied, ornée
 * de deux entrelacs dorés en relief. Le pied est à l'origine, la planche monte vers +Y.
 */
function buildRuneStaff(env) {
  const kit = materials(env);
  const group = new THREE.Group();
  const grain = grainTexture({ seed: 33, base: '#4a3321', variation: 0.25, size: 64, stripes: 1 });
  grain.repeat.set(1, 5);
  const wood = kit.standard('chene', { map: grain, roughness: 0.78, metalness: 0 });
  const outline = new THREE.Shape();
  const half = (y) => 0.012 + 0.118 * Math.min(1, y / 0.22);
  const ys = [0, 0.04, 0.1, 0.22, 0.5, 0.8, 1];
  outline.moveTo(-half(0), 0);
  ys.forEach((y) => outline.lineTo(half(y), y));
  [...ys].reverse().forEach((y) => outline.lineTo(-half(y), y));
  const board = mesh(new THREE.ExtrudeGeometry(outline, { depth: 0.06, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }), wood, 'planche');
  board.position.z = 0.01;
  group.add(board);
  const gold = kit.metal('or-ancien', '#9a7b3e', 0.55, 0.7);
  for (const phase of [0, Math.PI]) {
    const points = Array.from({ length: 60 }, (_, i) => {
      const y = 0.16 + (i / 59) * 0.8;
      return new THREE.Vector3(0.07 * Math.sin(y * 18 + phase) * Math.min(1, y * 3), y, 0.08);
    });
    group.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 120, 0.007, 6, false), gold, 'entrelacs'));
  }
  for (const side of [-1, 1]) {
    const edge = Array.from({ length: 12 }, (_, i) => { const y = 0.12 + i * 0.075; return new THREE.Vector3(side * (half(y) - 0.022), y, 0.08); });
    group.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 24, 0.006, 6, false), gold, 'bordure'));
  }
  group.userData = { kind: 'baton', extent: 1 };
  return group;
}

/**
 * L'astrolabe : une mère de laiton à limbe gradué, la plaque, l'araignée (le
 * réseau des étoiles), l'alidade. `extent` est le diamètre de la mère ; la bélière
 * (l'anneau d'attache) part vers +Y.
 */
function buildAstrolabe(env) {
  const kit = materials(env);
  const group = new THREE.Group();
  const brass = kit.metal('laiton', '#a8883a', 0.36, 0.92);
  const dark = kit.metal('laiton-sombre', '#7a5f28', 0.5, 0.8);
  const flat = (geometry) => { geometry.rotateX(Math.PI / 2); return geometry; };
  // La mère : une coupe peu profonde, bord épais.
  group.add(mesh(flat(lathe([[0.001, 0], [0.5, 0], [0.5, 0.09], [0.45, 0.09], [0.45, 0.04], [0.001, 0.04]], 56)), brass, 'mere'));
  // Le limbe : soixante graduations posées sur le bord.
  const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.008, 0.035, 0.006), dark, 72);
  ticks.name = 'graduations';
  const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion();
  for (let i = 0; i < 72; i += 1) {
    const angle = (i / 72) * Math.PI * 2;
    turn.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
    matrix.compose(new THREE.Vector3(Math.cos(angle) * 0.475, Math.sin(angle) * 0.475, 0.094), turn.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2)), new THREE.Vector3(1, i % 6 === 0 ? 1.7 : 1, 1));
    ticks.setMatrixAt(i, matrix);
  }
  ticks.castShadow = false;
  group.add(ticks);
  // La plaque, gravée de cercles : tropiques et horizon.
  const plate = mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.012, 56), kit.metal('plaque', '#c0a45a', 0.42, 0.85), 'plaque');
  plate.rotation.x = Math.PI / 2;
  plate.position.z = 0.05;
  group.add(plate);
  for (const [radius, offset] of [[0.36, 0], [0.26, -0.05], [0.16, -0.09]]) {
    const circle = mesh(new THREE.TorusGeometry(radius, 0.004, 5, 56), dark, 'gravure');
    circle.position.set(0, offset, 0.058);
    circle.castShadow = false;
    group.add(circle);
  }
  // L'araignée : un cercle excentré de l'écliptique et des pointes d'étoiles.
  const rete = mesh(new THREE.TorusGeometry(0.31, 0.014, 6, 56), brass, 'araignee');
  rete.position.set(0, 0.04, 0.075);
  group.add(rete);
  for (let i = 0; i < 7; i += 1) {
    const angle = 0.5 + (i / 7) * Math.PI * 2;
    const spike = mesh(new THREE.ConeGeometry(0.022, 0.12, 4), brass, 'etoile');
    spike.position.set(Math.cos(angle) * 0.36, 0.04 + Math.sin(angle) * 0.36, 0.08);
    spike.rotation.z = angle - Math.PI / 2;
    group.add(spike);
  }
  // L'alidade : une règle sur un pivot, avec ses pinnules.
  const rule = mesh(new THREE.BoxGeometry(0.94, 0.05, 0.012), brass, 'alidade');
  rule.position.z = 0.106;
  rule.rotation.z = 0.55;
  group.add(rule);
  for (const sign of [-1, 1]) {
    const sight = mesh(new THREE.BoxGeometry(0.03, 0.05, 0.05), brass, 'pinnule');
    sight.position.set(Math.cos(0.55) * 0.43 * sign, Math.sin(0.55) * 0.43 * sign, 0.12);
    sight.rotation.z = 0.55;
    group.add(sight);
  }
  const pivot = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 20), brass, 'pivot');
  pivot.rotation.x = Math.PI / 2;
  pivot.position.z = 0.115;
  group.add(pivot);
  // La bélière : le trône ajouré et l'anneau.
  const throne = mesh(new THREE.BoxGeometry(0.2, 0.14, 0.05), brass, 'trone');
  throne.position.set(0, 0.55, 0.045);
  group.add(throne);
  const ring = mesh(new THREE.TorusGeometry(0.1, 0.024, 8, 28), brass, 'beliere');
  ring.position.set(0, 0.7, 0.03);
  group.add(ring);
  group.userData = { kind: 'astrolabe', extent: 1 };
  return group;
}

/**
 * Une rose de verre : quatre coupes de verre teinté, imbriquées et festonnées,
 * un cœur doré, trois feuilles de verre vert. `extent` est le diamètre de la
 * corolle ; les feuilles dépassent un peu.
 */
function buildGlassRose(env, { kind, color, seed }) {
  const group = new THREE.Group();
  const random = seededRandom(seed);
  const around = 44, rings = 8;
  const cup = ({ radius, height, flutes, phase }) => {
    const positions = [], indices = [];
    for (let i = 0; i <= rings; i += 1) {
      const s = i / rings;
      for (let j = 0; j <= around; j += 1) {
        const a = (j / around) * Math.PI * 2;
        const wave = Math.sin(flutes * a + phase);
        const r = radius * s * (1 + 0.1 * wave * s * s);
        positions.push(Math.cos(a) * r, Math.sin(a) * r, height * s ** 1.9 + 0.025 * wave * s ** 3);
      }
    }
    for (let i = 0; i < rings; i += 1) for (let j = 0; j < around; j += 1) {
      const a = i * (around + 1) + j, b = a + 1, c = a + around + 1, d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  };
  const glass = new THREE.MeshPhysicalMaterial({
    name: 'verre-teinte', color, emissive: color, emissiveIntensity: 0.03, transparent: true, opacity: 0.92,
    roughness: 0.14, metalness: 0, envMap: env, envMapIntensity: 0.8, side: THREE.DoubleSide,
  });
  [[0.5, 0.11, 7], [0.4, 0.14, 6], [0.3, 0.16, 5], [0.2, 0.17, 4]].forEach(([radius, height, flutes], index) => {
    const part = mesh(cup({ radius, height, flutes, phase: random() * 6 }), glass, `petales-${index}`);
    part.position.z = 0.012 + index * 0.04;
    part.rotation.z = random() * 6;
    group.add(part);
  });
  const gold = new THREE.MeshStandardMaterial({ name: 'or', color: '#c79a3a', roughness: 0.3, metalness: 0.9, envMap: env, envMapIntensity: 1 });
  const heart = mesh(new THREE.SphereGeometry(0.06, 14, 10), gold, 'coeur');
  heart.position.z = 0.19;
  group.add(heart);
  const leafGlass = new THREE.MeshPhysicalMaterial({
    name: 'feuille', color: '#3a6a2c', transparent: true, opacity: 0.95, roughness: 0.25, metalness: 0,
    envMap: env, envMapIntensity: 0.6, side: THREE.DoubleSide,
  });
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.quadraticCurveTo(0.2, 0.12, 0, 0.42);
  leafShape.quadraticCurveTo(-0.2, 0.12, 0, 0);
  for (let i = 0; i < 3; i += 1) {
    const angle = 0.4 + i * 2.1 + random() * 0.5;
    const leaf = mesh(new THREE.ShapeGeometry(leafShape, 8), leafGlass, 'feuille');
    leaf.position.set(Math.cos(angle) * 0.4, Math.sin(angle) * 0.4, 0.015);
    leaf.rotation.z = angle - Math.PI / 2;
    group.add(leaf);
  }
  group.userData = { kind, extent: 1.1 };
  return group;
}

/**
 * Un sapin vu d'en haut : quatre étages de branches festonnées, du plus large
 * (en bas) à la pointe, vert sombre, la neige posée vers le cœur. `extent` est le
 * diamètre de l'étage du bas.
 */
function buildPine(env) {
  const group = new THREE.Group();
  const random = seededRandom(77);
  const around = 56, rings = 5;
  const green = new THREE.Color('#1f4026'), snow = new THREE.Color('#e9f0f5'), tint = new THREE.Color();
  const tiers = [[0.5, 0.0, 0.2, 11], [0.39, 0.12, 0.34, 9], [0.28, 0.25, 0.46, 8], [0.17, 0.37, 0.58, 6]];
  tiers.forEach(([radius, base, top, lobes], tier) => {
    const positions = [], colors = [], indices = [];
    const phase = random() * 6;
    for (let i = 0; i <= rings; i += 1) {
      const s = 1 - i / rings; // 1 au bord, 0 à l'axe
      for (let j = 0; j <= around; j += 1) {
        const a = (j / around) * Math.PI * 2;
        const spike = Math.abs(Math.cos((lobes * a) / 2 + phase)) ** 0.7;
        const r = radius * s * (0.72 + 0.28 * spike);
        positions.push(Math.cos(a) * r, Math.sin(a) * r, base + (top - base) * (1 - s) ** 0.8);
        // La neige s'accroche vers l'axe, par plaques : le seuil change d'une branche à l'autre.
        const patch = 0.5 + 0.5 * Math.sin(lobes * a + phase * 2) * Math.cos(a * 3 + tier);
        tint.copy(green).lerp(snow, Math.min(1, Math.max(0, (1 - s) * 1.5 - 0.15 + (patch - 0.5) * 0.6)));
        colors.push(tint.r, tint.g, tint.b);
      }
    }
    for (let i = 0; i < rings; i += 1) for (let j = 0; j < around; j += 1) {
      const a = i * (around + 1) + j, b = a + 1, c = a + around + 1, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    group.add(mesh(geometry, new THREE.MeshStandardMaterial({ name: 'branches', vertexColors: true, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, envMap: env, envMapIntensity: 0.12 }), `etage-${tier}`));
  });
  group.userData = { kind: 'sapin', extent: 1 };
  return group;
}

/** Un rocher coiffé de neige : une boule bosselée, aplatie ; le dessus blanchit. */
function buildRock(env) {
  const random = seededRandom(5);
  const geometry = new THREE.IcosahedronGeometry(0.5, 3);
  const position = geometry.attributes.position;
  const bumps = Array.from({ length: 6 }, () => [random() * 6, random() * 6, 0.35 + random() * 0.7, 1 + Math.floor(random() * 3)]);
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const a = Math.atan2(y, x), b = Math.acos(Math.max(-1, Math.min(1, z / 0.5)));
    let bump = 1;
    for (const [pa, pb, amount, k] of bumps) bump += Math.sin(a * k + pa) * Math.sin(b * (k + 1) + pb) * amount * 0.07;
    position.setXYZ(i, x * bump * 1.08, y * bump * 0.95, z * bump * 0.62);
  }
  geometry.computeVertexNormals();
  const colors = [], stone = new THREE.Color('#756a58'), snow = new THREE.Color('#f1f5f8'), tint = new THREE.Color();
  for (let i = 0; i < position.count; i += 1) {
    const up = geometry.attributes.normal.getZ(i) + Math.sin(position.getX(i) * 31) * 0.12 + Math.sin(position.getY(i) * 27) * 0.1;
    tint.copy(stone).lerp(snow, Math.min(1, Math.max(0, (up - 0.72) * 3.2) * 0.85));
    colors.push(tint.r, tint.g, tint.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingBox();
  geometry.translate(0, 0, -geometry.boundingBox.min.z);
  const group = new THREE.Group();
  group.add(mesh(geometry, new THREE.MeshStandardMaterial({ name: 'roche', vertexColors: true, roughness: 0.88, metalness: 0, envMap: env, envMapIntensity: 0.2 }), 'roche'));
  group.userData = { kind: 'rocher', extent: 1.1 };
  return group;
}

/**
 * Un escargot de pierre : coquille en dôme, bandes brunes en spirale (la couleur
 * suit la spirale, pas une texture), corps clair qui sort de l'ouverture.
 * Origine au centre de la coquille ; l'ouverture est vers +Y. Diamètre 1.
 */
function buildSnail(env) {
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(0.5, 40, 22, 0, Math.PI * 2, 0, Math.PI / 2);
  geometry.rotateX(Math.PI / 2); // le dôme monte vers +Z
  geometry.scale(1, 1, 0.92);
  const position = geometry.attributes.position;
  const cream = new THREE.Color('#c9b48b'), brown = new THREE.Color('#2e1a0e'), tint = new THREE.Color();
  const colors = [];
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i), y = position.getY(i);
    const rho = Math.hypot(x, y), theta = Math.atan2(y, x);
    // Une spirale logarithmique : la bande avance d'un tour tous les 0,25 de rayon.
    const band = 0.5 + 0.5 * Math.sin(theta * 1 - rho * 34 + 0.4);
    tint.copy(cream).lerp(brown, Math.pow(band, 1.1) * 0.95);
    colors.push(tint.r, tint.g, tint.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const shell = mesh(geometry, new THREE.MeshStandardMaterial({ name: 'coquille', vertexColors: true, roughness: 0.38, metalness: 0, envMap: env, envMapIntensity: 0.3 }), 'coquille');
  group.add(shell);
  const body = new THREE.SphereGeometry(0.5, 16, 10);
  const foot = mesh(body, new THREE.MeshStandardMaterial({ name: 'corps', color: '#b7a483', roughness: 0.8, metalness: 0 }), 'corps');
  foot.scale.set(0.34, 0.5, 0.2);
  foot.position.set(0, 0.5, 0.1);
  group.add(foot);
  group.userData = { kind: 'escargot', extent: 1 };
  return group;
}

/** Une pièce de bronze verdi : disque, rebord en relief, effigie en creux. Diamètre 1. */
function buildCoin(env) {
  const group = new THREE.Group();
  const bronze = new THREE.MeshStandardMaterial({ name: 'bronze-verdi', color: '#4f6f5b', roughness: 0.42, metalness: 0.75, envMap: env, envMapIntensity: 0.8 });
  const rim = new THREE.MeshStandardMaterial({ name: 'bronze', color: '#8a7a47', roughness: 0.35, metalness: 0.85, envMap: env, envMapIntensity: 0.8 });
  const disc = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 40), bronze, 'disque');
  disc.rotation.x = Math.PI / 2;
  disc.position.z = 0.03;
  group.add(disc);
  const ring = mesh(new THREE.TorusGeometry(0.46, 0.022, 8, 48), rim, 'rebord');
  ring.position.z = 0.06;
  group.add(ring);
  // L'effigie : un buste en bosse, sans prétendre à un visage.
  const bust = mesh(new THREE.SphereGeometry(0.2, 16, 10), rim, 'effigie');
  bust.scale.set(0.8, 1, 0.22);
  bust.position.set(0.02, 0.02, 0.07);
  group.add(bust);
  group.userData = { kind: 'piece', extent: 1 };
  return group;
}

/**
 * Une raie manta, vue du dessus : deux ailes en pointe, un corps lisse, une
 * queue fine. Les ailes sont deux plaques articulées sur l'axe du corps, elles
 * battent lentement (voir `updateTableObject`). Envergure 1 le long de X ;
 * la queue pointe vers +Y, la tête vers −Y.
 */
function buildManta(env) {
  const group = new THREE.Group();
  const navy = new THREE.Color('#10283d'), teal = new THREE.Color('#3f7a93'), tint = new THREE.Color();
  // Un demi-contour (aile droite), de la tête à la queue ; l'aile gauche en est le miroir.
  const half = [[0, -0.16], [0.07, -0.215], [0.105, -0.19], [0.1, -0.15], [0.24, -0.08], [0.5, 0.13], [0.43, 0.115], [0.33, 0.1], [0.2, 0.13], [0.09, 0.2], [0.03, 0.27], [0, 0.27]];
  const wing = (side) => {
    // Le miroir inverse le sens du contour : on le rétablit, sinon la normale pointe vers le bas.
    const outline = half.map(([x, y]) => new THREE.Vector2(x * side, y));
    const shape = new THREE.Shape(side < 0 ? outline.reverse() : outline);
    const geometry = new THREE.ShapeGeometry(shape, 8);
    const position = geometry.attributes.position, colors = [];
    for (let i = 0; i < position.count; i += 1) {
      const reach = Math.min(1, Math.abs(position.getX(i)) / 0.5);
      tint.copy(navy).lerp(teal, Math.pow(reach, 1.6) * 0.4);
      colors.push(tint.r, tint.g, tint.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const part = mesh(geometry, new THREE.MeshStandardMaterial({ name: 'aile', vertexColors: true, roughness: 0.62, metalness: 0, side: THREE.DoubleSide, envMap: env, envMapIntensity: 0.08 }), 'aile');
    const pivot = new THREE.Group(); // l'axe de battement : le corps, +Y
    pivot.add(part);
    return pivot;
  };
  const right = wing(1), left = wing(-1);
  group.add(right, left);
  const back = mesh(new THREE.SphereGeometry(0.5, 20, 12), new THREE.MeshStandardMaterial({ name: 'dos', color: '#16344d', roughness: 0.7, metalness: 0, envMap: env, envMapIntensity: 0.08 }), 'dos');
  back.scale.set(0.12, 0.3, 0.035);
  back.position.set(0, -0.01, 0.0175);
  group.add(back);
  // La queue : un fouet fin, un peu relevé au bout.
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.22, 0.02), new THREE.Vector3(0.01, 0.4, 0.025), new THREE.Vector3(0.03, 0.62, 0.04)]);
  group.add(mesh(new THREE.TubeGeometry(curve, 12, 0.011, 6), new THREE.MeshStandardMaterial({ name: 'queue', color: '#10283d', roughness: 0.55, metalness: 0 }), 'queue'));
  group.userData = { kind: 'manta', extent: 1, wings: [right, left] };
  return group;
}

/**
 * L'anneau de coquillages du centre : cinquante-huit coquilles posées en cercle
 * (porcelaines mouchetées, cônes, galets tachetés), chacune tournée au hasard le
 * long du cercle. Rayon 0,5 : le diamètre de l'anneau est 1.
 */
function buildShellRing(env) {
  const random = seededRandom(2027);
  const group = new THREE.Group();
  const lowPoly = (rx, ry, rz) => {
    const geometry = new THREE.SphereGeometry(1, 12, 8);
    geometry.scale(rx, ry, rz);
    return geometry;
  };
  const paint = (geometry, light, dark, slit) => {
    const position = geometry.attributes.position, colors = [], tint = new THREE.Color();
    let top = 0;
    for (let i = 0; i < position.count; i += 1) top = Math.max(top, position.getZ(i));
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
      const spots = 0.5 + 0.5 * Math.sin(x * 140 + y * 90) * Math.sin(y * 170 - x * 60);
      const dorsal = Math.max(0, z / top);
      tint.copy(light).lerp(dark, Math.min(1, spots * 0.7 * (0.4 + dorsal)));
      if (slit) tint.lerp(new THREE.Color('#efe3cc'), Math.max(0, 1 - Math.abs(x) / 0.0035) * dorsal * 0.9);
      colors.push(tint.r, tint.g, tint.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  };
  const kinds = [
    // [géométrie, matériau] : une porcelaine, un cône allongé, un coquillage rond tacheté.
    [paint(lowPoly(0.0125, 0.0215, 0.0125), new THREE.Color('#d8b48a'), new THREE.Color('#6a3f24'), true), 0.5],
    [paint(lowPoly(0.01, 0.0235, 0.0105), new THREE.Color('#bf9367'), new THREE.Color('#4d2c18'), false), 0.2],
    [paint(lowPoly(0.0165, 0.0165, 0.012), new THREE.Color('#a77e5b'), new THREE.Color('#3c2514'), false), 0.3],
  ];
  const materials = kinds.map(() => new THREE.MeshStandardMaterial({ name: 'coquille', vertexColors: true, roughness: 0.34, metalness: 0, envMap: env, envMapIntensity: 0.4 }));
  const count = 58;
  for (let i = 0; i < count; i += 1) {
    const roll = random();
    const index = roll < kinds[0][1] ? 0 : roll < kinds[0][1] + kinds[1][1] ? 1 : 2;
    const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * 0.03;
    const radius = 0.5 + (random() - 0.5) * 0.012;
    const shell = mesh(kinds[index][0], materials[index], 'coquille');
    const scale = 1.25 + random() * 0.45;
    shell.scale.setScalar(scale);
    shell.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.0125 * scale * 0.9);
    // Le grand axe suit la tangente, avec du jeu.
    shell.rotation.z = angle + (random() - 0.5) * 1.1;
    group.add(shell);
  }
  group.userData = { kind: 'anneau-coquillages', extent: 1 };
  return group;
}

/**
 * Le torii du sanctuaire : le portique vermillon, monté à plat dans le plan de
 * la table (comme le cor du fjord : la caméra regarde la table de dessus, un
 * objet couché s'y lit de face). Largeur 1 d'un montant à l'autre ; hauteur
 * 0,42 — la proportion de la porte telle qu'elle est peinte, vue de haut.
 */
function buildTorii(env) {
  const kit = materials(env);
  const group = new THREE.Group();
  const vermillon = kit.standard('vermillon', { color: '#c1522e', roughness: 0.55, metalness: 0.05 });
  const encre = kit.standard('bois-encre', { color: '#3a2a24', roughness: 0.78, metalness: 0.04 });
  const socle = kit.standard('socle', { color: '#352f27', roughness: 0.82, metalness: 0.06 });
  const pilier = 0.028;                       // rayon des deux montants
  // Les montants : deux colonnes, du socle noir à la traverse.
  for (const cote of [-1, 1]) {
    const pied = mesh(new THREE.CylinderGeometry(pilier * 1.18, pilier * 1.3, 0.086, 14), socle, 'socle');
    pied.position.set(cote * 0.36, 0.043, pilier * 1.3);
    group.add(pied);
    const fût = mesh(new THREE.CylinderGeometry(pilier, pilier * 1.12, 0.55, 14), vermillon, 'pilier');
    fût.position.set(cote * 0.36, 0.086 + 0.275, pilier * 1.12);
    group.add(fût);
  }
  // La nuki : la traverse basse, qui déborde des montants.
  const nuki = mesh(new THREE.BoxGeometry(0.86, 0.05, 0.05), vermillon, 'nuki');
  nuki.position.set(0, 0.54, 0.025);
  group.add(nuki);
  // Le gakuzuka : le petit montant central entre la nuki et les poutres hautes.
  const gaku = mesh(new THREE.BoxGeometry(0.05, 0.09, 0.05), vermillon, 'gakuzuka');
  gaku.position.set(0, 0.645, 0.025);
  group.add(gaku);
  // Les deux poutres du faîte : le shimaki sous le kasagi, tous deux légèrement
  // retroussés aux extrémités — un arc, pas une barre.
  const poutre = (demi, epaisseur, retrousse) => {
    const forme = new THREE.Shape();
    const bord = (x, cote) => 0.72 + cote * (retrousse * 0.5 * x * x + epaisseur / 2);
    forme.moveTo(-demi, bord(-demi, -1));
    for (let i = 1; i <= 12; i += 1) forme.lineTo(-demi + (2 * demi * i) / 12, bord(-demi + (2 * demi * i) / 12, 1));
    for (let i = 12; i >= 0; i -= 1) forme.lineTo(-demi + (2 * demi * i) / 12, bord(-demi + (2 * demi * i) / 12, -1));
    const geometry = new THREE.ExtrudeGeometry(forme, { depth: 0.06, bevelEnabled: false });
    geometry.translate(0, 0, 0.03);   // la poutre ne descend pas sous la table
    return geometry;
  };
  group.add(mesh(poutre(0.5, 0.05, 0.22), encre, 'kasagi'));
  const shimaki = mesh(poutre(0.46, 0.035, 0.22), vermillon, 'shimaki');
  shimaki.position.set(0, -0.095, 0.005);
  group.add(shimaki);
  group.userData = { kind: 'torii', extent: 1 };
  return group;
}

/**
 * La lanterne de pierre du sanctuaire (tōrō) : socle, fût galbé, chambre
 * ajourée où brûle une flamme, toit à six pans retroussés, boule au faîte.
 * Montée le long de +Y, donc couchée dans le plan de la table : la caméra la
 * voit de face. `extent` est sa hauteur, 2,8 fois sa largeur — la proportion de
 * la lanterne peinte.
 */
function buildStoneLantern(env) {
  const kit = materials(env);
  const group = new THREE.Group();
  const pierre = kit.standard('pierre-moussue', { color: '#918c6c', roughness: 0.92, metalness: 0.03 });
  const pierreClaire = kit.standard('pierre-claire', { color: '#aaa78e', roughness: 0.9, metalness: 0.03 });
  // Tout est monté le long de +Y, du socle (y = 0) au faîte (y = 2,8) : la
  // lanterne est couchée dans le plan de la table et la caméra la voit de face.
  // Les six pans sont tournés d'un sixième de tour : une face regarde la caméra.
  const tranche = (rayonHaut, rayonBas, hauteur, y, nom, matiere = pierre, cotes = 6) => {
    const part = mesh(new THREE.CylinderGeometry(rayonHaut, rayonBas, hauteur, cotes), matiere, nom);
    part.position.set(0, y + hauteur / 2, Math.max(rayonHaut, rayonBas));
    group.add(part);
    return part;
  };
  tranche(0.3, 0.34, 0.16, 0, 'socle-bas');
  tranche(0.24, 0.29, 0.14, 0.16, 'socle-haut', pierreClaire);
  tranche(0.15, 0.21, 1.24, 0.3, 'fut');
  tranche(0.34, 0.3, 0.1, 1.54, 'dalle', pierreClaire);
  tranche(0.26, 0.28, 0.52, 1.64, 'chambre');
  // Le toit : un cône à six pans, le plus large de la lanterne (1 de diamètre).
  const toit = mesh(new THREE.ConeGeometry(0.5, 0.42, 6, 1, true), pierre, 'toit');
  toit.position.set(0, 2.37, 0.5);
  group.add(toit);
  const boule = mesh(new THREE.SphereGeometry(0.11, 12, 9), pierreClaire, 'boule');
  boule.position.set(0, 2.69, 0.42);
  group.add(boule);
  // L'ouverture : une fenêtre sombre et sa flamme, du côté de la caméra.
  const ouverture = kit.standard('ouverture', { color: '#2b261f', roughness: 0.95, metalness: 0, emissive: '#ff9d3c', emissiveIntensity: 0.5 });
  const fenetre = mesh(new THREE.PlaneGeometry(0.28, 0.3), ouverture, 'fenetre');
  fenetre.position.set(0, 1.9, 0.58);
  group.add(fenetre);
  const flamme = mesh(new THREE.SphereGeometry(0.06, 12, 10), new THREE.MeshBasicMaterial({ name: 'flamme', color: '#ffc46a', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }), 'flamme');
  flamme.position.set(0, 1.86, 0.56);
  flamme.renderOrder = 5;
  group.add(flamme);
  const lueur = new THREE.PointLight('#ffb45e', 0.8, 2.2, 1.8);
  lueur.name = 'lueur';
  lueur.position.set(0, 1.9, 0.72);
  group.add(lueur);
  group.userData = { kind: 'lanterne-pierre', extent: 2.8, flame: flamme, lamp: lueur };
  return group;
}

/**
 * Le passage du torii : neuf pierres plates posées en file, de la porte au bas
 * de la cour — les mêmes places que dans la peinture (repères relevés sur
 * l'estampe, ramenés dans une boîte de 1 × 1,165). `extent` est la longueur de
 * la file.
 */
const PIERRES_DU_PASSAGE = [
  [0.19, 1.143, 0.176], [-0.17, 1.037, 0.271], [0.16, 0.927, 0.247],
  [-0.15, 0.816, 0.235], [0.36, 0.749, 0.329], [0.02, 0.594, 0.429],
  [0.29, 0.433, 0.224], [-0.22, 0.327, 0.647], [0.36, 0.078, 0.288],
];
function buildSteppingStones(env) {
  const kit = materials(env);
  const group = new THREE.Group();
  const random = seededRandom(613);
  const basalte = kit.standard('basalte', { color: '#6b645b', roughness: 0.88, metalness: 0.04, map: grainTexture({ seed: 14, base: '#ffffff', variation: 0.16 }) });
  PIERRES_DU_PASSAGE.forEach(([x, y, taille], index) => {
    const geometry = new THREE.IcosahedronGeometry(0.5, 2);
    const positions = geometry.attributes.position;
    const bosses = [random() * 6, random() * 6, random() * 6];
    for (let i = 0; i < positions.count; i += 1) {
      const px = positions.getX(i), py = positions.getY(i), pz = positions.getZ(i);
      const onde = 1 + 0.12 * Math.sin(px * 3.1 + bosses[0]) * Math.cos(py * 2.7 + bosses[1]) + 0.08 * Math.sin(pz * 2.3 + bosses[2]);
      positions.setXYZ(i, px * onde, py * onde, pz * 0.42 * onde);
    }
    geometry.computeVertexNormals();
    const pierre = mesh(geometry, basalte, 'pierre');
    // Aplatie et posée à plat : une dalle, pas un galet.
    pierre.scale.set(taille * 0.86, taille * 0.6, taille * 0.4);
    pierre.position.set(x, y, taille * 0.12);
    pierre.rotation.z = (random() - 0.5) * 0.5;
    group.add(pierre);
  });
  group.userData = { kind: 'pierres-passage', extent: 1.165 };
  return group;
}

/** Le bol à thé laqué : une coupe profonde, rouge laqué, l'intérieur plus sombre. */
function buildLacquerBowl(env) {
  const kit = materials(env);
  const group = new THREE.Group();
  const laque = new THREE.MeshStandardMaterial({ name: 'laque', color: '#8c3b28', roughness: 0.34, metalness: 0.06, envMap: env, envMapIntensity: 0.5, side: THREE.DoubleSide });
  const profil = [[0.001, 0], [0.3, 0], [0.4, 0.02], [0.47, 0.09], [0.5, 0.2], [0.492, 0.24], [0.47, 0.235], [0.42, 0.16], [0.34, 0.09], [0.22, 0.055], [0.001, 0.045]];
  const geometry = lathe(profil, 44);
  geometry.rotateX(Math.PI / 2);                // l'axe de révolution devient la verticale
  group.add(mesh(geometry, laque, 'coupe'));
  // Le thé : un disque sombre au fond, un peu en retrait du bord.
  const the = mesh(new THREE.CircleGeometry(0.4, 32), kit.standard('the', { color: '#5a3a1e', roughness: 0.35, metalness: 0 }), 'the');
  the.position.z = 0.11;
  the.castShadow = false;
  group.add(the);
  group.userData = { kind: 'bol-laque', extent: 1 };
  return group;
}

/**
 * L'éventail déplié : un demi-disque plissé, papier crème teinté de rose vers
 * le bord, deux montants de bois sombre et le clou du pivot. Couché dans le
 * plan de la table, il se lit comme dans la peinture.
 */
function buildFoldedFan(env) {
  const group = new THREE.Group();
  const plis = 20, pas = Math.PI / plis;
  const positions = [], colors = [], indices = [];
  const creme = new THREE.Color('#e8d7c4'), rose = new THREE.Color('#c98d84'), teinte = new THREE.Color();
  // Le pivot est à l'origine ; la feuille s'ouvre sur 180°, largeur 1, hauteur 0,48.
  // i va du bord gauche au bord droit ; l'arc passe par le haut.
  const point = (i, rayon, z) => {
    const angle = Math.PI - i * pas;
    return [Math.cos(angle) * rayon, Math.sin(angle) * 0.31 * (rayon / 0.5), z];
  };
  for (let i = 0; i <= plis; i += 1) {
    const z = (i % 2) * 0.018;
    positions.push(...point(i, 0.09, z), ...point(i, 0.5, z));
    teinte.copy(creme).lerp(rose, 0.15);
    colors.push(teinte.r, teinte.g, teinte.b);
    teinte.copy(creme).lerp(rose, 0.85);
    colors.push(teinte.r, teinte.g, teinte.b);
  }
  for (let i = 0; i < plis; i += 1) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  group.add(mesh(geometry, new THREE.MeshStandardMaterial({ name: 'papier', vertexColors: true, roughness: 0.82, metalness: 0, side: THREE.DoubleSide, envMap: env, envMapIntensity: 0.2 }), 'feuille'));
  // Les deux montants, le long des bords, et le clou du pivot.
  const bois = new THREE.MeshStandardMaterial({ name: 'bois-laqué', color: '#3b2b22', roughness: 0.5, metalness: 0.08, envMap: env, envMapIntensity: 0.35 });
  // Les deux montants courent du pivot aux deux pointes, le long des bords.
  for (const cote of [-1, 1]) {
    const montant = mesh(new THREE.BoxGeometry(0.5, 0.026, 0.018), bois, 'montant');
    montant.position.set(cote * 0.25, 0.012, 0.02);
    group.add(montant);
  }
  const clou = mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 16), bois, 'clou');
  clou.rotation.x = Math.PI / 2;
  clou.position.set(0, 0, 0.015);
  group.add(clou);
  group.userData = { kind: 'eventail', extent: 1 };
  return group;
}

/**
 * Le service de saké : le plateau laqué noir cerclé de rouge, deux godets de
 * porcelaine et le flacon (tokkuri) couché dans le plan de la table, donc lu de
 * face. Toute la pièce tient dans une boîte de 1 × 1.
 */
function buildSakeService(env) {
  const kit = materials(env);
  const group = new THREE.Group();
  const laque = new THREE.MeshStandardMaterial({ name: 'laque-noire', color: '#2b2724', roughness: 0.4, metalness: 0.08, envMap: env, envMapIntensity: 0.5, side: THREE.DoubleSide });
  const porcelaine = new THREE.MeshStandardMaterial({ name: 'porcelaine', color: '#e2d6c0', roughness: 0.22, metalness: 0.02, envMap: env, envMapIntensity: 0.6 });
  const cerclage = kit.metal('cerclage', '#8c3b28', 0.42, 0.55);
  // Le plateau : une assiette creuse, posée à gauche du service.
  const plateau = mesh(lathe([[0.001, 0], [0.3, 0.005], [0.34, 0.02], [0.35, 0.05], [0.33, 0.055], [0.3, 0.03], [0.001, 0.028]], 40), laque, 'plateau');
  plateau.rotation.x = Math.PI / 2;
  plateau.scale.set(1, 0.79, 1);                // vu de haut, le plat s'aplatit
  plateau.position.set(-0.15, 0.26, 0);
  group.add(plateau);
  const liseré = mesh(new THREE.TorusGeometry(0.345, 0.008, 6, 44), cerclage, 'liseré');
  liseré.rotation.x = Math.PI / 2;
  liseré.scale.set(1, 0.79, 1);
  // L'anneau est posé DEVANT la table (z ≥ 0) : son demi-diamètre vaut 0,28 en z.
  liseré.position.set(-0.15, 0.26, 0.29);
  group.add(liseré);
  // Les deux godets.
  const godet = (x, y) => {
    const cup = mesh(lathe([[0.001, 0], [0.05, 0], [0.062, 0.01], [0.058, 0.055], [0.05, 0.05], [0.045, 0.02], [0.001, 0.016]], 24), porcelaine, 'godet');
    cup.rotation.x = Math.PI / 2;
    cup.position.set(x, y, 0.03);
    group.add(cup);
  };
  godet(-0.3, 0.4);
  godet(0, 0.26);
  // Le flacon : un tokkuri au col étranglé, couché vers le haut de la table.
  const flacon = mesh(lathe([[0.001, 0], [0.075, 0], [0.09, 0.03], [0.088, 0.14], [0.068, 0.2], [0.03, 0.24], [0.026, 0.27], [0.033, 0.29], [0.03, 0.3], [0.001, 0.3]], 30), porcelaine, 'flacon');
  // L'axe du flacon suit +Y : couchée dans le plan, elle se lit debout.
  flacon.position.set(0.3, 0.5, 0.09);
  group.add(flacon);
  // Un peu d'encre au col, comme les trois traits de la peinture.
  const trait = mesh(new THREE.TorusGeometry(0.031, 0.005, 5, 20), kit.standard('encre', { color: '#4a4038', roughness: 0.6, metalness: 0 }), 'trait');
  trait.rotation.y = Math.PI / 2;
  trait.position.set(0.3, 0.5 + 0.16, 0.09);
  group.add(trait);
  group.scale.set(1, 0.8, 0.8);              // vu de haut, le service s'aplatit
  group.userData = { kind: 'service-sake', extent: 1 };
  return group;
}

/**
 * Ramène le contenu d'un groupe au centre de son emprise (x, y) : l'ancre `u`,
 * `v` du thème désigne alors le centre de l'objet, comme dans la peinture. La
 * hauteur (z) ne bouge pas : l'objet reste posé devant la table.
 */
function centrerSurLEmprise(group) {
  const boite = new THREE.Box3().setFromObject(group);
  const centre = boite.getCenter(new THREE.Vector3());
  // Le groupe peut porter une échelle (le service de saké s'aplatit) : le
  // décalage se mesure dans son repère local.
  const echelleX = group.scale.x || 1, echelleY = group.scale.y || 1;
  group.children.forEach((part) => {
    part.position.x -= centre.x / echelleX;
    part.position.y -= centre.y / echelleY;
  });
  return group;
}

const BUILDERS = Object.freeze({
  torii: (env) => centrerSurLEmprise(buildTorii(env)),
  'lanterne-pierre': (env) => centrerSurLEmprise(buildStoneLantern(env)),
  'pierres-passage': (env) => centrerSurLEmprise(buildSteppingStones(env)),
  'bol-laque': (env) => centrerSurLEmprise(buildLacquerBowl(env)),
  eventail: (env) => centrerSurLEmprise(buildFoldedFan(env)),
  'service-sake': (env) => centrerSurLEmprise(buildSakeService(env)),
  bol: buildBowl,
  galets: buildPebbles,
  corde: buildRope,
  gourde: buildWaterskin,
  lanterne: buildLantern,
  tapis: buildCarpet,
  compas: buildCompass,
  'lanterne-fer': (env) => buildLantern(env, { kind: 'lanterne-fer', color: '#34363b', roughness: 0.55, metalness: 0.8 }),
  'corde-brune': (env) => buildRope(env, { kind: 'corde-brune', base: '#8a6a3e', tube: 0.07, turns: 3.4, tail: false, inner: 0.07 }),
  cor: buildHorn,
  hache: buildAxe,
  baton: buildRuneStaff,
  astrolabe: buildAstrolabe,
  'corde-chanvre': (env) => buildRope(env, { kind: 'corde-chanvre', base: '#a8946a', tube: 0.06, turns: 2.6, tail: false, inner: 0.2 }),
  'rose-rouge': (env) => buildGlassRose(env, { kind: 'rose-rouge', color: '#6e0f2a', seed: 11 }),
  'rose-verte': (env) => buildGlassRose(env, { kind: 'rose-verte', color: '#0f5a34', seed: 23 }),
  'rose-rose': (env) => buildGlassRose(env, { kind: 'rose-rose', color: '#b4607c', seed: 37 }),
  'rose-mauve': (env) => buildGlassRose(env, { kind: 'rose-mauve', color: '#6a3060', seed: 41 }),
  sapin: buildPine,
  rocher: buildRock,
  escargot: buildSnail,
  manta: buildManta,
  'anneau-coquillages': buildShellRing,
  piece: buildCoin,
});

export const RPG_TABLE_OBJECT_KINDS = Object.freeze(Object.keys(BUILDERS));

/** Construit un objet, ou `null` pour un genre inconnu. `env` : carte d'environnement facultative. */
export function createTableObject(kind, env = null) {
  const build = BUILDERS[kind];
  return build ? build(env) : null;
}

/** L'animation d'un objet à l'instant `t` (secondes) : la lanterne vacille, la manta bat des ailes. */
export function updateTableObject(group, t, phase = 0) {
  const { flame, lamp, wings } = group.userData;
  // La manta : un battement lent des ailes, relevées au repos.
  if (wings) {
    const flap = 0.1 + Math.sin(t * 1.15 + phase) * 0.13;
    wings[0].rotation.y = -flap;
    wings[1].rotation.y = flap;
    return;
  }
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
