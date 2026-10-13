/**
 * Le Sablier — les objets posés sur la table, en vraie 3D.
 *
 * La lanterne, la gourde, la corde, les galets, le bol de cuivre, les amas de
 * cristaux ne sont plus peints dans le plateau : la peinture « vide » (`plaque`) les a perdus
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
 * Un amas de cristaux (améthyste, rubis) : des prismes hexagonaux à pointe
 * facettée, rayonnant depuis un même pied et couchés vers l'extérieur comme dans
 * la peinture. Le pied est à l'origine, le grand axe de l'amas suit +Y ;
 * `extent` est la portée à plat du plus long cristal. Un léger éclat pulse
 * (`updateTableObject`) : ces pierres brillent dans l'obscurité des galeries.
 */
function buildCrystalCluster(env, { kind, color, glow, seed }) {
  const random = seededRandom(seed);
  const group = new THREE.Group();
  const gems = [];
  // Azimut (degrés autour de l'axe de l'amas), portée à plat, rayon, élévation.
  const fan = [
    [-52, 0.58, 0.075, 18], [-31, 0.78, 0.09, 22], [-12, 0.94, 0.105, 27],
    [6, 1, 0.115, 31], [24, 0.84, 0.095, 24], [43, 0.64, 0.08, 20], [60, 0.46, 0.065, 17],
    [-2, 0.62, 0.075, 42],
  ];
  const material = new THREE.MeshPhysicalMaterial({
    name: kind, color, emissive: glow, emissiveIntensity: 0.4, roughness: 0.22, metalness: 0,
    clearcoat: 0.5, clearcoatRoughness: 0.12, envMap: env, envMapIntensity: 0.55, flatShading: true,
  });
  gems.push(material);
  fan.forEach(([azimuth, reach, radius, elevation], index) => {
    const rise = (elevation * Math.PI) / 180;
    const length = reach / Math.cos(rise); // la portée à plat est `reach`
    const body = length * (0.74 + random() * 0.08);
    const fat = radius * 1.3; // des cristaux trapus, comme dans la peinture
    const profile = [[0.001, 0], [fat * 0.82, 0], [fat, length * 0.05], [fat, body], [fat * 0.55, body + (length - body) * 0.45], [0.001, length]];
    const geometry = lathe(profile, 6);
    geometry.rotateY(random() * Math.PI); // les facettes ne sont pas toutes alignées
    const crystal = mesh(geometry, material, 'cristal');
    const pivot = new THREE.Group();
    pivot.rotation.z = (-azimuth * Math.PI) / 180; // 0° = vers +Y ; positif = vers la droite
    crystal.rotation.x = rise; // +Y bascule vers +Z : le cristal se lève
    crystal.position.z = radius * 1.2 + index * 0.0005;
    pivot.add(crystal);
    group.add(pivot);
  });
  group.userData = { kind, extent: 1, gems, glowBase: 0.4 };
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

const BUILDERS = Object.freeze({
  bol: buildBowl,
  galets: buildPebbles,
  corde: buildRope,
  gourde: buildWaterskin,
  lanterne: buildLantern,
  amethyste: (env) => buildCrystalCluster(env, { kind: 'amethyste', color: '#7f3fc4', glow: '#3a1470', seed: 417 }),
  tapis: buildCarpet,
  compas: buildCompass,
  rubis: (env) => buildCrystalCluster(env, { kind: 'rubis', color: '#a6132c', glow: '#5a0612', seed: 913 }),
});

export const RPG_TABLE_OBJECT_KINDS = Object.freeze(Object.keys(BUILDERS));

/** Construit un objet, ou `null` pour un genre inconnu. `env` : carte d'environnement facultative. */
export function createTableObject(kind, env = null) {
  const build = BUILDERS[kind];
  return build ? build(env) : null;
}

/** L'animation d'un objet à l'instant `t` (secondes) : la lanterne vacille, les cristaux scintillent. */
export function updateTableObject(group, t, phase = 0) {
  const { flame, lamp, gems, glowBase } = group.userData;
  // Les cristaux : un éclat lent, déphasé d'un amas à l'autre.
  if (gems) {
    const shimmer = 1 + Math.sin(t * 0.9 + phase) * 0.22 + Math.sin(t * 2.3 + phase * 2) * 0.08;
    for (const material of gems) material.emissiveIntensity = glowBase * shimmer;
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
