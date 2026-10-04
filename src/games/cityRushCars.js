// Voitures de Vice City Rush : cabriolets de course aux silhouettes
// distinctes, pilotes **à visage découvert** (plus de casque : la tête est
// celle de l'avatar du pilote, voir « Les pilotes dans le cockpit »), roues à
// rayons, feux, flammes de boost, fumée de pneus, et véhicules de trafic
// (police, ambulance, benne, supercar).
//
// Les pièces fixes de chaque carrosserie sont fusionnées par matériau (un seul
// mesh par matériau) ; le pilote, peint en couleurs par sommet, tient en trois
// meshes (buste, tête, bras) ; seules les pièces animées restent indépendantes
// (roues, volant, tête et bras du pilote, flammes, lueurs). Une voiture de
// course coûte ainsi une trentaine d'appels de rendu au lieu de plus d'une
// centaine.
import * as THREE from 'three';
import { CITY_RUSH_TRAFFIC_TYPES, cityRushDriverColor, cityRushHexColor } from './cityRushRules.js';
import { createBatch } from './cityRushBuilder.js';
import { makeCarPlateTexture, makeTrafficDecalAtlas, makeSmokeTexture } from './cityRushTextures.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, amount) => a + (b - a) * amount;

// Flammes : base sur l'échappement (z = 0), pointe vers l'arrière (+z).
const FLAME_OUTER = new THREE.ConeGeometry(0.16, 0.9, 10);
FLAME_OUTER.rotateX(Math.PI / 2);
FLAME_OUTER.translate(0, 0, 0.45);
const FLAME_INNER = new THREE.ConeGeometry(0.09, 0.62, 8);
FLAME_INNER.rotateX(Math.PI / 2);
FLAME_INNER.translate(0, 0, 0.31);
// Faisceau de phare : pointe sur l'optique (z = 0), base 9 unités devant (-z).
const HEADLIGHT_CONE = new THREE.ConeGeometry(1.7, 9, 12, 1, true);
HEADLIGHT_CONE.rotateX(Math.PI / 2);
HEADLIGHT_CONE.translate(0, 0, -4.5);
const STEERING = new THREE.TorusGeometry(0.17, 0.028, 6, 18);
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);
const UNIT_SPHERE = new THREE.SphereGeometry(1, 14, 10);
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

// Coque continue en sections transversales : capot bas, épaules larges et pavillon
// qui s'affine en fonction du type de voiture. Ce volume lisse remplace la caisse
// en empilement de blocs sans ajouter de texture externe.
function makeCarShell(profile) {
  const archetype = profile.archetype || 'ferrari';
  const roofHeight = archetype === 'volkswagen' ? 1.25
    : archetype === 'bmw' || archetype === 'porsche' ? 1.18
      : archetype === 'lamborghini' || archetype === 'audi' ? 1.14 : 1.2;
  const sections = [
    [-1.66, 0.58, 0.39, 0.57], [-1.48, 0.82, 0.48, 0.72],
    [-1.1, 0.9, 0.52, 0.78], [-0.62, 0.91, 0.54, 0.79],
    [-0.3, 0.88, 0.8, roofHeight], [0.28, 0.84, 0.78, roofHeight],
    [0.68, 0.88, 0.78, 0.89], [1.08, 0.91, 0.76, 0.79],
    [1.48, 0.82, 0.58, 0.82], [1.7, 0.55, 0.48, 0.55],
  ];
  const positions = [];
  const indices = [];
  const sides = 12;
  sections.forEach(([z, width, lower, upper], sectionIndex) => {
    // Le pavillon retombe vers l'avant et l'arrière : silhouettes distinctes
    // berlinette, coupé fastback, compacte et supercar à nez en coin.
    let top = upper;
    if (sectionIndex === 4 || sectionIndex === 5) top = roofHeight;
    if (archetype === 'lamborghini' && sectionIndex < 4) top -= 0.035;
    const cabinFactor = z > -0.4 && z < 0.9 ? (archetype === 'volkswagen' ? 0.76 : 0.62) : 0.96;
    for (let side = 0; side < sides; side += 1) {
      const angle = (side / sides) * Math.PI * 2;
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      const x = sin * width * (cos < -0.45 ? cabinFactor : 1);
      const y = lower + ((cos + 1) / 2) * (top - lower);
      positions.push(x, y, z);
    }
  });
  for (let section = 0; section < sections.length - 1; section += 1) {
    for (let side = 0; side < sides; side += 1) {
      const a = section * sides + side;
      const b = section * sides + (side + 1) % sides;
      const c = (section + 1) * sides + side;
      const d = (section + 1) * sides + (side + 1) % sides;
      // Normale orientée vers l'extérieur (peinture visible côté caméra).
      indices.push(a, c, b, c, d, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

let smokeTexture = null;
let trafficDecals = null;

function standard(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.08, ...extra });
}

function paint(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.34,
    metalness: 0.28,
    clearcoat: 0.75,
    clearcoatRoughness: 0.18,
    emissive: color,
    emissiveIntensity: 0.04,
    ...extra,
  });
}

function mesh(parent, geometry, material, position, scale = [1, 1, 1], rotation = null) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(position[0], position[1], position[2]);
  object.scale.set(scale[0], scale[1], scale[2]);
  if (rotation) object.rotation.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0);
  parent.add(object);
  return object;
}

function rgb(hex, scale = 1) {
  const color = new THREE.Color(hex);
  return [color.r * scale, color.g * scale, color.b * scale];
}

/**
 * Roue en un seul mesh (couleurs par sommet) : pneu, jante, rayons, disque
 * et étrier. `side` oriente la face visible des rayons.
 */
function makeWheel({ radius, width, side, material, accent = 0xffffff, racing = true }) {
  const batch = createBatch();
  const axle = [0, 0, Math.PI / 2];
  batch.cylinder(material, [0, 0, 0], radius, radius, width, racing ? 18 : 12, axle, { tint: [0.06, 0.065, 0.08] });
  const rimRadius = radius * 0.64;
  batch.cylinder(material, [side * width * 0.08, 0, 0], rimRadius, rimRadius, width * 0.9, 12, axle, { tint: [0.74, 0.78, 0.84] });
  const spokeCount = racing ? 5 : 4;
  const faceX = side * width * 0.53;
  for (let index = 0; index < spokeCount; index += 1) {
    const angle = (index / spokeCount) * Math.PI * 2;
    batch.box(material, [faceX, Math.cos(angle) * rimRadius * 0.45, Math.sin(angle) * rimRadius * 0.45], [0.04, rimRadius * 0.9, 0.09], [angle, 0, 0], { tint: [0.9, 0.93, 0.97] });
  }
  batch.sphere(material, [faceX, 0, 0], rimRadius * 0.3, 8, null, { tint: [0.9, 0.93, 0.97] });
  if (racing) {
    batch.cylinder(material, [side * width * 0.1, 0, 0], rimRadius * 0.86, rimRadius * 0.86, width * 0.3, 12, axle, { tint: [0.3, 0.31, 0.35] });
    batch.box(material, [side * width * 0.2, rimRadius * 0.5, 0.05], [width * 0.36, rimRadius * 0.4, rimRadius * 0.5], null, { tint: rgb(accent) });
  }
  const wheelMesh = batch.build('wheel').children[0];
  // Le lot fige les matrices ; la roue, elle, tourne à chaque image.
  wheelMesh.matrixAutoUpdate = true;
  wheelMesh.castShadow = true;
  return wheelMesh;
}

// ─── Pilote du cabriolet : tête nue ─────────────────────────────────────────
// Plus de casque intégral : c'est le visage du pilote qui se voit. Chaque
// pilote reçoit l'identité de son avatar du catalogue (`CITY_RUSH_DRIVERS`) —
// peau, cheveux, coiffure, accessoire (visière, lunettes, béret, casque audio),
// tenue — si bien que le Kenji de la piste est celui de la fiche du pilote, et
// que le joueur retrouve son pilote choisi dans le cockpit.
//
// Tout le pilote est peint en **couleurs par sommet** (comme les roues) : un
// seul mesh par nœud fusionné — buste, tête, chaque bras — au lieu d'un mesh
// par couleur. Le budget de rendu du monde y gagne, et l'on peut se permettre
// un vrai visage : crâne, mâchoire, nez, oreilles, yeux, sourcils, bouche,
// douze coiffures et douze accessoires, sans coûter un appel de rendu de plus
// par détail. Le buste est fusionné avec la caisse ; seules la tête et les deux
// bras restent animés (le pilote regarde dans le virage, ses bras encaissent
// les chocs — voir `animateRacerCar`).
const DRIVER_X = -0.43; // siège gauche : le volant est devant
const DRIVER_Z = 0.32;
const DRIVER_HEAD_Y = 1.535;
const DRIVER_SHOULDER_Y = 1.31;

function mixHex(from, to, amount) {
  return new THREE.Color(from).lerp(new THREE.Color(to), amount).getHex();
}

// Palette du pilote, convertie en teintes de sommets (linéaires) : la fiche de
// l'avatar est écrite en CSS, le modèle attend des triplets de couleur.
function driverPaintColors(driver, { skinFallback = 0x1e222d, trimColor = 0xffffff } = {}) {
  const avatar = driver?.avatar || null;
  const skin = cityRushDriverColor(driver, skinFallback);
  const hair = cityRushHexColor(avatar?.hair, 0x1b1720);
  const accent = cityRushHexColor(avatar?.accessoryColor || driver?.accent, trimColor);
  const outfit = cityRushHexColor(avatar?.outfit, 0x1f2235);
  return {
    skin: rgb(skin),
    hair: rgb(hair),
    // Combinaison : la tenue du pilote, assagie vers le bleu de course pour
    // rester lisible dans un cabriolet sombre.
    suit: rgb(mixHex(outfit, 0x14182a, 0.56)),
    accent: rgb(accent),
    // Grandes surfaces : le même accent, rentré dans la combinaison, pour ne pas
    // faire une tache fluo sur la poitrine (le liseré garde l'accent vif).
    plate: rgb(mixHex(accent, outfit, 0.42)),
    glove: rgb(0x22263a),
    gear: rgb(0xdfe4ee),
    lens: rgb(0x121a26),
    // Visière d'un seul tenant : verre teinté de la couleur du pilote, comme
    // sur sa fiche, plutôt qu'un rectangle noir anonyme.
    visor: rgb(mixHex(accent, 0x0a1220, 0.5)),
    eyeWhite: rgb(0xf5f1ea),
    eyeDark: rgb(0x15111a),
    mouth: rgb(0x6b3038),
  };
}

// Coiffure : une calotte arrière (qui descend jusqu'à la nuque) et une calotte
// avant (la ligne de cheveux, posée au-dessus des sourcils) forment le crâne
// chevelu ; chaque style ajoute ensuite ses mèches. Aucune ne recouvre le
// visage, qui doit rester lisible depuis la caméra de poursuite.
function addDriverHair(batch, material, colors, style) {
  const hair = { tint: colors.hair };
  const accent = { tint: colors.accent };
  const back = new THREE.SphereGeometry(1, 18, 12, 0, Math.PI, 0, Math.PI * 0.62);
  batch.custom(material, back, [0, 0.012, 0.006], null, [0.157, 0.166, 0.157], hair);
  back.dispose();
  const front = new THREE.SphereGeometry(1, 18, 8, Math.PI, Math.PI, 0, Math.PI * 0.34);
  batch.custom(material, front, [0, 0.012, 0.006], null, [0.157, 0.166, 0.157], hair);
  front.dispose();
  switch (style) {
    case 'spiky': {
      const spikes = [[-0.098, 0.115, -0.02], [-0.048, 0.138, -0.07], [0.03, 0.142, -0.06], [0.098, 0.115, -0.01], [0, 0.15, 0.03], [-0.062, 0.122, 0.09], [0.066, 0.118, 0.09]];
      spikes.forEach(([x, y, z]) => batch.cone(material, [x, y, z], 0.04, 0.095, 5, [z * 2.2, 0, -x * 2.2], hair));
      break;
    }
    case 'curly': {
      for (let index = 0; index < 12; index += 1) {
        const angle = (index / 12) * Math.PI * 2;
        batch.sphere(material, [Math.sin(angle) * 0.125, 0.1 + Math.cos(angle * 3) * 0.022, Math.cos(angle) * 0.11 + 0.03], 0.052, 8, null, hair);
      }
      batch.sphere(material, [0, 0.14, 0.02], 0.072, 10, null, hair);
      break;
    }
    case 'short-fade': {
      for (const side of [-1, 1]) batch.box(material, [side * 0.138, 0.015, 0.02], [0.03, 0.11, 0.17], null, hair);
      batch.box(material, [0, 0.05, -0.126], [0.2, 0.032, 0.055], null, hair); // ligne de cheveux nette
      break;
    }
    case 'wavy-long': {
      batch.box(material, [0, -0.045, 0.1], [0.25, 0.27, 0.1], null, hair);
      batch.box(material, [0, -0.165, 0.11], [0.21, 0.14, 0.08], null, hair); // pointes sur la nuque
      for (const side of [-1, 1]) batch.box(material, [side * 0.126, -0.05, 0.035], [0.06, 0.23, 0.16], null, hair);
      break;
    }
    case 'headband': {
      for (const side of [-1, 1]) batch.box(material, [side * 0.13, 0.02, 0.02], [0.035, 0.08, 0.16], null, hair);
      for (const side of [-1, 1]) batch.box(material, [side * 0.149, 0.048, 0.02], [0.022, 0.06, 0.19], null, accent);
      batch.box(material, [0, 0.052, -0.118], [0.3, 0.052, 0.06], null, accent);
      break;
    }
    case 'bob': {
      batch.box(material, [0, -0.02, 0.1], [0.26, 0.25, 0.1], null, hair);
      for (const side of [-1, 1]) batch.box(material, [side * 0.132, -0.045, 0.015], [0.062, 0.21, 0.21], null, hair);
      batch.box(material, [0, 0.058, -0.12], [0.27, 0.062, 0.06], null, hair); // frange droite
      break;
    }
    case 'locs': {
      const locs = [[-0.128, 0.03], [-0.095, 0.09], [-0.035, 0.12], [0.035, 0.12], [0.095, 0.09], [0.128, 0.03], [0.137, -0.05]];
      locs.forEach(([x, z]) => batch.box(material, [x, -0.1, z], [0.046, 0.3, 0.055], null, hair));
      for (const side of [-1, 1]) batch.box(material, [side * 0.128, -0.238, 0.03], [0.05, 0.026, 0.06], null, accent); // attaches dorées
      break;
    }
    case 'neon-bangs': {
      batch.box(material, [0, 0.062, -0.116], [0.27, 0.078, 0.062], null, hair); // frange
      batch.box(material, [0.078, 0.052, -0.128], [0.055, 0.092, 0.05], null, accent); // mèche fluo
      batch.box(material, [-0.088, 0.058, -0.124], [0.03, 0.082, 0.048], null, accent);
      break;
    }
    case 'swept': {
      // Raie de côté : la mèche du dessus balaie le front et vient mourir sur la
      // tempe, le reste est plaqué en pointe sur la nuque.
      batch.box(material, [-0.015, 0.072, -0.088], [0.23, 0.075, 0.135], [0, 0, -0.2], hair);
      batch.box(material, [0, -0.055, 0.105], [0.2, 0.2, 0.085], null, hair);
      for (const side of [-1, 1]) batch.box(material, [side * 0.128, -0.008, 0.03], [0.045, 0.105, 0.14], null, hair); // pattes
      break;
    }
    case 'braids': {
      for (const side of [-1, 1]) {
        batch.box(material, [side * 0.128, -0.1, 0.035], [0.052, 0.3, 0.072], null, hair);
        batch.box(material, [side * 0.128, -0.248, 0.035], [0.056, 0.03, 0.078], null, accent); // perles
      }
      batch.box(material, [0, 0.05, 0.088], [0.24, 0.21, 0.12], null, hair);
      break;
    }
    case 'cap-back': {
      const dome = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
      batch.custom(material, dome, [0, 0.02, 0.01], null, [0.169, 0.16, 0.169], accent);
      dome.dispose();
      batch.box(material, [0, 0.028, 0.192], [0.2, 0.03, 0.15], null, accent); // visière à l'envers
      batch.box(material, [0, 0.032, -0.118], [0.24, 0.085, 0.07], null, hair); // cheveux front
      break;
    }
    case 'afro-curls': {
      const puffBack = new THREE.SphereGeometry(1, 18, 12, 0, Math.PI, 0, Math.PI * 0.7);
      batch.custom(material, puffBack, [0, 0.028, 0.022], null, [0.186, 0.176, 0.186], hair);
      puffBack.dispose();
      const puffFront = new THREE.SphereGeometry(1, 18, 6, Math.PI, Math.PI, 0, Math.PI * 0.38);
      batch.custom(material, puffFront, [0, 0.028, 0.022], null, [0.186, 0.176, 0.186], hair);
      puffFront.dispose();
      [[-0.125, 0.145, 0.02], [0.125, 0.145, 0.02], [0, 0.175, 0.06], [-0.105, 0.06, 0.12], [0.105, 0.06, 0.12]]
        .forEach(([x, y, z]) => batch.sphere(material, [x, y, z], 0.06, 9, null, hair));
      break;
    }
    default: {
      for (const side of [-1, 1]) batch.box(material, [side * 0.138, 0.015, 0.02], [0.03, 0.11, 0.17], null, hair);
      break;
    }
  }
}

// Lunettes et visières du catalogue : chaque accessoire devient une monture
// reconnaissable (bouclier d'un seul tenant, deux verres rectangulaires,
// ronds, pointe de chat, cerclage doré) ou un couvre-chef (béret, casque
// audio), coloré comme sur la fiche du pilote.
const DRIVER_GLASS_SHAPES = {
  'cyber-visor': 'shield', 'sport-visor': 'shield', 'mirror-shades': 'shield', 'gold-shield': 'shield',
  'aviator-gold': 'gold', 'octagon-gold': 'round', 'glacier-glass': 'round',
  'retro-amber': 'rect', 'palm-shades': 'rect', 'cat-eye': 'cateye',
};

function addDriverAccessory(batch, material, colors, accessory) {
  const lens = { tint: colors.lens };
  const accent = { tint: colors.accent };
  const gear = { tint: colors.gear };
  const hair = { tint: colors.hair };
  const shape = DRIVER_GLASS_SHAPES[accessory] || 'rect';
  const temple = (side) => batch.box(material, [side * 0.146, 0.022, -0.015], [0.02, 0.022, 0.2], null, gear);
  if (accessory === 'french-beret') {
    // Un vrai béret : une galette fine, posée de travers sur le côté droit, d'où
    // la chevelure dépasse largement — sinon la tête disparaît dessous.
    const cap = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    batch.custom(material, cap, [0.052, 0.088, 0.012], [0, 0, -0.46], [0.158, 0.062, 0.158], accent);
    cap.dispose();
    batch.box(material, [0.098, 0.075, 0.012], [0.07, 0.03, 0.12], [0, 0, -0.46], accent); // bord retroussé
    batch.sphere(material, [0.108, 0.108, 0.012], 0.016, 6, null, accent); // fougère
    batch.box(material, [-0.06, 0.045, -0.02], [0.09, 0.09, 0.17], null, hair); // cheveux qui dépassent
    return;
  }
  if (accessory === 'neon-headset') {
    batch.box(material, [0, 0.152, 0.016], [0.24, 0.024, 0.055], null, gear); // arceau sur la couronne
    batch.box(material, [0, 0.164, 0.016], [0.1, 0.012, 0.036], null, accent); // bandeau lumineux
    for (const side of [-1, 1]) {
      batch.cylinder(material, [side * 0.148, 0.006, 0.012], 0.045, 0.045, 0.026, 10, [0, 0, Math.PI / 2], gear);
      batch.cylinder(material, [side * 0.162, 0.006, 0.012], 0.022, 0.022, 0.012, 8, [0, 0, Math.PI / 2], accent);
    }
    batch.box(material, [0.13, -0.06, -0.09], [0.02, 0.02, 0.17], [0.35, 0, 0], gear); // perche du micro
    batch.sphere(material, [0.115, -0.098, -0.16], 0.02, 7, null, accent);
    return;
  }
  if (shape === 'shield') {
    batch.box(material, [0, 0.016, -0.128], [0.256, 0.056, 0.062], null, { tint: colors.visor });
    batch.box(material, [0, -0.016, -0.132], [0.25, 0.012, 0.048], null, accent); // liseré bas
    for (const side of [-1, 1]) temple(side);
    return;
  }
  if (shape === 'gold') {
    for (const side of [-1, 1]) {
      batch.box(material, [side * 0.057, 0.008, -0.126], [0.1, 0.07, 0.03], null, accent); // monture dorée
      batch.box(material, [side * 0.057, 0.004, -0.134], [0.082, 0.054, 0.036], null, lens);
      temple(side);
    }
    batch.box(material, [0, 0.026, -0.126], [0.04, 0.016, 0.025], null, accent); // pont
    return;
  }
  if (shape === 'round') {
    for (const side of [-1, 1]) {
      batch.cylinder(material, [side * 0.058, 0.012, -0.122], 0.05, 0.05, 0.022, 12, [Math.PI / 2, 0, 0], accent);
      batch.cylinder(material, [side * 0.058, 0.012, -0.136], 0.041, 0.041, 0.02, 12, [Math.PI / 2, 0, 0], lens);
      temple(side);
    }
    batch.box(material, [0, 0.03, -0.124], [0.03, 0.014, 0.022], null, accent);
    return;
  }
  if (shape === 'cateye') {
    for (const side of [-1, 1]) {
      batch.box(material, [side * 0.062, 0.014, -0.132], [0.095, 0.05, 0.036], [0, 0, side * 0.24], lens);
      batch.box(material, [side * 0.062, 0.038, -0.126], [0.098, 0.012, 0.03], [0, 0, side * 0.24], accent);
      temple(side);
    }
    batch.box(material, [0, 0.022, -0.126], [0.035, 0.012, 0.022], null, accent);
    return;
  }
  for (const side of [-1, 1]) {
    batch.box(material, [side * 0.057, 0.012, -0.134], [0.086, 0.05, 0.036], null, lens);
    batch.box(material, [side * 0.057, 0.038, -0.128], [0.09, 0.014, 0.03], null, accent); // monture haute
    temple(side);
  }
  batch.box(material, [0, 0.026, -0.126], [0.036, 0.014, 0.022], null, accent);
}

/**
 * Pilote assis dans son baquet, tête nue : buste de course, tête animée
 * (visage, coiffure, accessoire de l'avatar) et deux bras tendus vers le
 * volant. `driver` est une fiche `CITY_RUSH_DRIVERS` ou une entrée du roster
 * du monde (elle porte alors `driverId` et `avatar`) ; sans lui, le pilote
 * garde la peau du modèle de voiture. `paint` permet de réutiliser le matériau
 * peint par sommet d'un pilote précédent (voir `setRacerDriver`).
 */
function makeCockpitDriver({ driver, profile, trimColor, paint: reusePaint = null }) {
  const id = profile.id;
  const avatar = driver?.avatar || null;
  const skinFallback = profile.driverColor ?? 0x1e222d;
  const colors = driverPaintColors(driver, { skinFallback, trimColor });
  // Un seul matériau, peint par sommet : les dix couleurs du pilote tiennent
  // dans les trois meshes du modèle (buste, tête, chaque bras).
  const paint = reusePaint || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.66, metalness: 0.06 });

  // Buste : combinaison, harnais aux couleurs du pilote, ceinture. Il vit dans
  // la carrosserie (il suit donc roulis et tangage) et reste un mesh à part,
  // rebâti avec le reste du pilote quand le joueur en change au garage. Les
  // épaules restent sous le menton pour que la tête ne paraisse pas posée sur
  // une planche.
  const suit = { tint: colors.suit };
  const accent = { tint: colors.accent };
  const plating = { tint: colors.plate };
  const glove = { tint: colors.glove };
  const gear = { tint: colors.gear };
  const t = createBatch();
  t.box(paint, [DRIVER_X, 1.14, DRIVER_Z - 0.02], [0.46, 0.38, 0.36], null, suit); // torse
  t.box(paint, [DRIVER_X, 1.16, DRIVER_Z - 0.19], [0.26, 0.2, 0.035], null, plating); // plastron
  for (const sign of [-1, 1]) {
    t.box(paint, [DRIVER_X + sign * 0.155, 1.16, DRIVER_Z - 0.19], [0.042, 0.3, 0.032], null, accent); // bretelles
    t.box(paint, [DRIVER_X + sign * 0.155, 1.025, DRIVER_Z - 0.19], [0.06, 0.06, 0.04], null, glove); // attaches
  }
  t.box(paint, [DRIVER_X, 1.29, DRIVER_Z - 0.02], [0.58, 0.11, 0.32], null, suit); // épaules
  t.box(paint, [DRIVER_X, 1.345, DRIVER_Z - 0.02], [0.5, 0.022, 0.3], null, accent);
  t.box(paint, [DRIVER_X, 0.98, DRIVER_Z - 0.02], [0.5, 0.13, 0.39], null, glove); // ceinture
  t.box(paint, [DRIVER_X, 0.98, DRIVER_Z - 0.2], [0.1, 0.08, 0.04], null, gear); // boucle
  t.cylinder(paint, [DRIVER_X, 1.4, DRIVER_Z + 0.015], 0.075, 0.088, 0.13, 10, null, { tint: colors.skin }); // cou
  t.box(paint, [DRIVER_X, 1.325, DRIVER_Z - 0.01], [0.245, 0.09, 0.245], null, suit); // col de la combinaison
  const torso = t.build(`${id}-driver-torso`);

  // ── Tête animée ──────────────────────────────────────────────────────────
  const headPivot = new THREE.Group();
  headPivot.name = `${id}-driver-head`;
  headPivot.position.set(DRIVER_X, DRIVER_HEAD_Y, DRIVER_Z + 0.01);
  const h = createBatch();
  const skin = { tint: colors.skin };
  const skull = new THREE.SphereGeometry(1, 22, 16);
  h.custom(paint, skull, [0, 0.004, 0.004], null, [0.147, 0.159, 0.147], skin);
  skull.dispose();
  h.box(paint, [0, -0.082, -0.03], [0.168, 0.09, 0.15], null, skin); // mâchoire
  h.box(paint, [0, -0.012, -0.146], [0.04, 0.058, 0.042], null, skin); // nez
  for (const sign of [-1, 1]) {
    h.box(paint, [sign * 0.142, -0.008, 0.012], [0.028, 0.064, 0.046], null, skin); // oreille
    h.box(paint, [sign * 0.055, 0.012, -0.118], [0.076, 0.044, 0.036], null, { tint: colors.eyeWhite });
    h.box(paint, [sign * 0.05, 0.01, -0.132], [0.036, 0.032, 0.032], null, { tint: colors.eyeDark }); // pupille
    h.box(paint, [sign * 0.056, 0.052, -0.122], [0.08, 0.018, 0.032], [0, 0, sign * 0.12], { tint: colors.hair }); // sourcil
  }
  h.box(paint, [0, -0.074, -0.125], [0.06, 0.016, 0.032], null, { tint: colors.mouth }); // bouche
  addDriverHair(h, paint, colors, avatar?.hairStyle);
  addDriverAccessory(h, paint, colors, avatar?.accessory);
  const head = h.build(`${id}-driver-face`);
  // La taille d'arcade : la tête est légèrement plus grande que nature, sinon
  // le visage disparaît à la distance de la caméra de poursuite (c'était le
  // rôle du casque, très gros, avant). Le buste, lui, garde ses proportions.
  head.scale.setScalar(1.12);
  head.traverse((object) => { if (object.isMesh) object.castShadow = false; });
  headPivot.add(head);

  // ── Bras : épaule → volant ───────────────────────────────────────────────
  // Le pivot d'épaule porte tout le bras, tendu vers l'avant ; ses rotations
  // sont animées (coup de volant, chocs) et `userData.rest` garde la pose.
  const arms = [];
  for (const sign of [-1, 1]) {
    const arm = new THREE.Group();
    arm.name = `${id}-driver-arm-${sign < 0 ? 'left' : 'right'}`;
    arm.position.set(DRIVER_X + sign * 0.255, DRIVER_SHOULDER_Y, DRIVER_Z - 0.1);
    arm.rotation.x = 1.1;
    arm.rotation.z = -sign * 0.13;
    arm.userData.rest = { x: 1.1, z: -sign * 0.13 };
    const a = createBatch();
    a.sphere(paint, [0, 0.015, 0], 0.088, 10, null, suit); // épaule
    a.box(paint, [0, -0.2, 0], [0.125, 0.38, 0.135], null, suit); // manche
    a.box(paint, [0, -0.38, 0], [0.13, 0.04, 0.14], null, accent); // poignet
    a.box(paint, [0, -0.55, -0.012], [0.108, 0.2, 0.115], null, glove); // gant
    a.box(paint, [0, -0.62, -0.02], [0.09, 0.05, 0.12], null, { tint: colors.gear }); // phalanges
    arm.add(a.build(`${id}-driver-forearm`));
    arms.push(arm);
  }

  // L'identité du pilote : les entrées du roster nomment l'emplacement
  // (`player`, `nova`, `juno`) et le conducteur (`driverId`) ; une fiche
  // `CITY_RUSH_DRIVERS` passée directement porte son `id`. On veut le pilote,
  // pas l'emplacement : c'est lui qui décide si le cockpit doit être refait.
  const driverId = driver?.driverId ?? driver?.id ?? null;
  return { torso, headPivot, arms, paint, colors, driverId, skinFallback, trimColor };
}

/**
 * Change le pilote installé dans un cabriolet (le joueur peut changer de pilote
 * au garage sans que la course soit rebâtie) : la tête, les bras et le buste
 * sont refaits aux couleurs du nouvel avatar, les anciens libérés. Le matériau
 * peint par sommet, lui, est réutilisé — c'est le même pour toutes les têtes.
 * Renvoie `true` si le cockpit a changé.
 */
export function setRacerDriver(car, driver) {
  const data = car?.userData;
  const parts = data?.driverParts;
  if (!data || data.kind !== 'racer' || !parts) return false;
  if ((driver?.driverId ?? driver?.id ?? null) === data.driverId) return false;
  const next = makeCockpitDriver({
    driver,
    profile: { id: data.profileId, driverColor: parts.skinFallback },
    trimColor: parts.trimColor,
    paint: parts.paint,
  });
  for (const old of [parts.torso, parts.headPivot, ...parts.arms]) {
    old.removeFromParent();
    old.traverse((object) => { if (object.isMesh) object.geometry.dispose(); });
  }
  data.body.add(next.torso);
  data.body.add(next.headPivot);
  next.arms.forEach((arm) => data.body.add(arm));
  next.torso.traverse((object) => { if (object.isMesh) object.castShadow = true; });
  data.driverParts = next;
  data.headPivot = next.headPivot;
  data.driverArms = next.arms;
  data.driverColors = next.colors;
  data.driverId = next.driverId;
  return true;
}

/**
 * Volant : jante, moyeu, trois branches et repère de sommet coloré — le repère
 * rend le coup de volant lisible, comme sur une vraie monoplace.
 */
function makeSteeringWheel(materials, markerMaterial) {
  const wheel = new THREE.Group();
  wheel.name = 'steering-wheel';
  wheel.position.set(DRIVER_X, 1.02, -0.46);
  wheel.rotation.x = -1.15;
  wheel.add(new THREE.Mesh(STEERING, materials.black));
  mesh(wheel, UNIT_BOX, materials.carbon, [0, 0, 0], [0.3, 0.05, 0.02]);
  mesh(wheel, UNIT_BOX, materials.carbon, [0.1, 0, 0], [0.16, 0.035, 0.02], [0, 0, Math.PI / 2]);
  mesh(wheel, UNIT_BOX, materials.carbon, [-0.1, 0, 0], [0.16, 0.035, 0.02], [0, 0, Math.PI / 2]);
  mesh(wheel, UNIT_BOX, markerMaterial, [0, 0.17, 0.006], [0.1, 0.022, 0.028]);
  return wheel;
}

/**
 * Cabriolet de course. `profile` vient de CITY_RUSH_CARS ; `options.player`
 * ajoute les phares volumétriques et une finition plus lumineuse.
 * `options.daylight` (Vice City en plein jour) coupe les faisceaux de phares et
 * descend les halos additifs, invisibles sous le soleil. `options.driver` (une
 * entrée du catalogue des pilotes) habille le pilote assis dans le baquet :
 * peau, cheveux, accessoire et combinaison de son avatar.
 */
export function makeRacerCar(profile, options = {}) {
  const { player = false, number = 1, daylight = false, driver = null } = options;
  const group = new THREE.Group();
  group.name = `racer-${profile.id}`;
  const body = new THREE.Group();
  body.name = 'body';
  group.add(body);

  const bodyColor = profile.bodyColor;
  const trimColor = profile.trimColor;
  const m = {
    body: paint(bodyColor, { emissiveIntensity: player ? 0.07 : 0.035 }),
    trim: standard(trimColor, { roughness: 0.4, metalness: 0.2, emissive: trimColor, emissiveIntensity: 0.12 }),
    black: standard(0x111520, { roughness: 0.9 }),
    carbon: standard(0x1d2230, { roughness: 0.55, metalness: 0.25 }),
    chrome: standard(0xd9e2ea, { roughness: 0.22, metalness: 0.7 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9fe8f0, transparent: true, opacity: 0.4, roughness: 0.08, metalness: 0.15, side: THREE.DoubleSide, depthWrite: false }),
    seat: standard(player ? 0x3a2340 : 0x2a2436, { roughness: 0.82 }),
    lightWhite: new THREE.MeshBasicMaterial({ color: 0xfff6dc, toneMapped: false }),
    lightAmber: new THREE.MeshBasicMaterial({ color: 0xffb347, toneMapped: false }),
    tailLight: new THREE.MeshBasicMaterial({ color: 0xff3450, toneMapped: false }),
    tailGlow: new THREE.MeshBasicMaterial({ color: 0xff2a44, transparent: true, opacity: daylight ? 0.16 : 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    headGlow: new THREE.MeshBasicMaterial({ color: 0xfff1cc, transparent: true, opacity: daylight ? 0.2 : 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    headCone: new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: daylight ? 0 : player ? 0.07 : 0.035, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }),
    underglow: new THREE.MeshBasicMaterial({ color: profile.accent, transparent: true, opacity: daylight ? (player ? 0.12 : 0.06) : player ? 0.32 : 0.14, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    flameOuter: new THREE.MeshBasicMaterial({ color: profile.accent, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    flameInner: new THREE.MeshBasicMaterial({ color: 0xfff2ad, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    wheel: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.45 }),
    plate: new THREE.MeshBasicMaterial({ map: makeCarPlateTexture(profile, number), toneMapped: false }),
  };
  const id = profile.id;
  const archetype = profile.archetype || 'ferrari';
  const isGt = archetype === 'porsche';
  const isMuscle = archetype === 'bmw';
  const isComet = archetype === 'volkswagen';
  const isRoadster = archetype === 'ferrari';
  const isWedge = archetype === 'lamborghini' || archetype === 'audi';
  const b = createBatch();
  const box = (material, position, size, rotation = null) => b.box(material, position, size, rotation);

  // ── Caisse ───────────────────────────────────────────────────────────
  box(m.black, [0, 0.3, 0], [1.74, 0.14, 3.24]);
  const shell = new THREE.Mesh(makeCarShell(profile), m.body);
  shell.name = `${id}-sculpted-body`;
  shell.castShadow = true;
  body.add(shell);
  box(m.carbon, [0, 0.34, 0.1], [1.94, 0.08, 2.3]); // bas de caisse
  for (const side of [-1, 1]) {
    box(m.trim, [side * 0.96, 0.4, 0.1], [0.06, 0.07, 2.1]); // jupe
    // Jonction de porte et poignées, posées comme de vrais éléments de carrosserie.
    box(m.black, [side * 0.89, 0.6, -0.26], [0.018, 0.22, 0.02]);
    box(m.chrome, [side * 0.985, 0.66, 0.5], [0.03, 0.04, 0.22]); // poignée
    box(m.chrome, [side * 0.96, 0.84, -0.46], [0.16, 0.04, 0.05]); // tige de rétro
    box(m.body, [side * 1.05, 0.9, -0.44], [0.14, 0.12, 0.2]); // rétroviseur
    // Lèvre d'aile discrète au-dessus des pneus, sans élargir artificiellement la coque.
  }

  // ── Capot / nez ──────────────────────────────────────────────────────
  const hoodLength = isGt ? 1.34 : 1.18;
  // Nervures de capot fines : la pente du nez est déjà sculptée dans la coque.
  for (const side of [-1, 1]) box(m.trim, [side * 0.42, 0.805, -0.94], [0.025, 0.012, hoodLength * 0.72], [0.045, 0, 0]);
  box(m.carbon, [0, 0.42, -1.62], [1.88, 0.18, 0.24]); // bouclier
  box(m.black, [0, 0.31, -1.66], [1.92, 0.05, 0.3]); // lame avant
  box(m.black, [0, 0.56, -1.7], [0.92, 0.14, 0.05]); // calandre
  for (const y of [0.52, 0.58]) box(m.chrome, [0, y, -1.72], [0.9, 0.015, 0.02]);
  if (isRoadster) {
    for (const side of [-1, 1]) box(m.trim, [side * 0.6, 0.86, -1.3], [0.42, 0.06, 0.34]); // phares escamotables
    box(m.chrome, [0, 0.47, -1.74], [1.9, 0.05, 0.02]);
  }
  if (isMuscle) {
    // ADN coupé allemand : doubles nervures discrètes et grille sombre verticale.
    for (const x of [-0.16, 0.16]) box(m.black, [x, 0.56, -1.725], [0.09, 0.12, 0.025]);
    for (const x of [-0.3, 0.3]) box(m.trim, [x, 0.885, -0.92], [0.025, 0.01, 1.0], [0.045, 0, 0]);
  }
  if (isWedge) {
    // Supercar à nez bas : splitters latéraux et prises d'air anguleuses.
    for (const side of [-1, 1]) {
      box(m.black, [side * 0.7, 0.48, -1.46], [0.3, 0.09, 0.08], [0, 0, side * 0.16]);
      box(m.carbon, [side * 0.91, 0.55, 0.5], [0.035, 0.22, 0.42], [0.18, 0, 0]);
    }
  }
  if (isGt) {
    for (const side of [-1, 1]) {
      box(m.black, [side * 0.82, 0.78, -0.4], [0.22, 0.04, 0.4]); // ouïes
      box(m.black, [side * 0.96, 0.52, 0.95], [0.06, 0.12, 0.34]);
    }
  }
  if (isComet) {
    for (const side of [-1, 1]) box(m.lightAmber, [side * 0.42, 0.44, -1.66], [0.12, 0.08, 0.04]); // antibrouillards
    box(m.chrome, [0.78, 1.0, 0.95], [0.02, 0.5, 0.02]); // antenne
  }

  // ── Phares et feux ───────────────────────────────────────────────────
  for (const side of [-1, 1]) {
    const x = side * 0.62;
    if (isComet) {
      b.cylinder(m.chrome, [x, 0.66, -1.63], 0.15, 0.15, 0.06, 10, [Math.PI / 2, 0, 0]);
      b.cylinder(m.lightWhite, [x, 0.66, -1.66], 0.12, 0.12, 0.04, 10, [Math.PI / 2, 0, 0]);
    } else {
      box(m.black, [x, 0.66, -1.62], [0.46, 0.2, 0.08]);
      box(m.lightWhite, [x, 0.66, -1.66], [0.38, 0.13, 0.04]);
    }
    b.plane(m.headGlow, [x, 0.66, -1.7], 0.62, 0.34, [0, Math.PI, 0]);
    box(m.lightAmber, [side * 0.9, 0.56, -1.62], [0.1, 0.06, 0.04]); // clignotants
  }
  const headlightCones = [];
  for (const side of [-1, 1]) {
    const cone = new THREE.Mesh(HEADLIGHT_CONE, m.headCone);
    cone.position.set(side * 0.62, 0.62, -1.7);
    cone.rotation.x = -0.05;
    cone.visible = player && !daylight;
    body.add(cone);
    headlightCones.push(cone);
  }

  // Arrière : diffuseur, feux et sorties d'échappement intégrés à la coque.
  box(m.carbon, [0, 0.42, 1.66], [1.88, 0.14, 0.2]);
  for (const x of [-0.5, -0.2, 0.2, 0.5]) box(m.black, [x, 0.34, 1.7], [0.04, 0.12, 0.2]); // diffuseur
  if (isMuscle) {
    box(m.tailLight, [0, 0.66, 1.69], [1.5, 0.12, 0.04]);
    b.plane(m.tailGlow, [0, 0.66, 1.72], 1.7, 0.3);
  } else if (isGt) {
    for (const x of [-0.7, -0.42, 0.42, 0.7]) {
      b.cylinder(m.chrome, [x, 0.66, 1.68], 0.065, 0.065, 0.05, 10, [Math.PI / 2, 0, 0]);
      b.cylinder(m.tailLight, [x, 0.66, 1.705], 0.05, 0.05, 0.03, 10, [Math.PI / 2, 0, 0]);
    }
    b.plane(m.tailGlow, [0, 0.66, 1.73], 1.8, 0.3);
  } else {
    for (const side of [-1, 1]) {
      box(m.tailLight, [side * 0.56, 0.66, 1.69], [0.5, 0.12, 0.04]);
      b.plane(m.tailGlow, [side * 0.56, 0.66, 1.72], 0.72, 0.3);
    }
    box(m.trim, [0, 0.66, 1.69], [0.5, 0.05, 0.03]);
  }
  if (isRoadster) for (const side of [-1, 1]) box(m.trim, [side * 0.84, 0.86, 1.4], [0.06, 0.16, 0.5]); // ailerons
  if (isGt) {
    box(m.carbon, [0, 1.14, 1.5], [1.9, 0.05, 0.36], [-0.12, 0, 0]);
    for (const side of [-1, 1]) {
      box(m.carbon, [side * 0.93, 1.1, 1.5], [0.04, 0.22, 0.42]);
      box(m.chrome, [side * 0.55, 0.98, 1.46], [0.06, 0.3, 0.08]);
    }
  }
  if (isComet) box(m.body, [0, 0.92, 1.56], [1.6, 0.05, 0.3], [-0.25, 0, 0]); // bec de canard
  b.plane(m.plate, [0, 0.48, 1.77], 0.56, 0.245);
  for (const side of [-1, 1]) {
    b.cylinder(m.chrome, [side * 0.5, 0.36, 1.74], 0.06, 0.06, 0.16, 10, [Math.PI / 2, 0, 0]);
    b.cylinder(m.black, [side * 0.5, 0.36, 1.82], 0.04, 0.04, 0.02, 10, [Math.PI / 2, 0, 0]);
  }

  // ── Habitacle ────────────────────────────────────────────────────────
  box(m.carbon, [0, 0.9, -0.3], [1.62, 0.2, 0.36]); // planche de bord
  box(m.trim, [0, 0.98, -0.3], [1.2, 0.03, 0.18]);
  const windshieldGeometry = new THREE.BufferGeometry();
  windshieldGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -0.71, 0.86, -0.82, 0.71, 0.86, -0.82, -0.57, 1.17, -0.34,
    0.71, 0.86, -0.82, 0.57, 1.17, -0.34, -0.57, 1.17, -0.34,
  ], 3));
  windshieldGeometry.computeVertexNormals();
  const windshield = new THREE.Mesh(windshieldGeometry, m.glass);
  windshield.name = `${id}-windscreen`;
  body.add(windshield);
  const sideWindowGeometry = new THREE.BufferGeometry();
  const sideWindowVertices = [];
  for (const side of [-1, 1]) {
    sideWindowVertices.push(
      side * 0.84, 0.83, -0.25, side * 0.82, 0.84, 0.38, side * 0.57, 1.16, -0.24,
      side * 0.82, 0.84, 0.38, side * 0.56, 1.16, 0.28, side * 0.57, 1.16, -0.24,
    );
  }
  sideWindowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sideWindowVertices, 3));
  sideWindowGeometry.computeVertexNormals();
  const sideWindow = new THREE.Mesh(sideWindowGeometry, m.glass);
  sideWindow.name = `${id}-side-glass`;
  body.add(sideWindow);
  box(m.chrome, [0, 1.26, -0.31], [1.6, 0.04, 0.05]);
  const hoopWidth = isComet ? 1.6 : 1.0;
  for (const side of [-1, 1]) box(m.chrome, [side * hoopWidth / 2, 1.0, 0.72], [0.07, 0.56, 0.07]); // arceau
  box(m.chrome, [0, 1.28, 0.72], [hoopWidth + 0.07, 0.07, 0.07]);
  for (const x of [-0.43, 0.44]) {
    box(m.seat, [x, 0.8, 0.38], [0.6, 0.16, 0.6]);
    box(m.seat, [x, 1.08, 0.62], [0.58, 0.6, 0.14], [-0.14, 0, 0]);
    box(m.trim, [x, 1.24, 0.6], [0.3, 0.1, 0.16]);
  }
  // Pilote : le visage du pilote choisi, tête nue, à la place du casque intégral
  // d'avant. Son buste est un mesh à part (comme la tête et les bras) pour
  // qu'un changement de pilote au garage puisse le repeindre — voir
  // `setRacerDriver`.
  const cockpitDriver = makeCockpitDriver({ driver, profile, trimColor });
  box(m.carbon, [DRIVER_X, 0.96, -0.5], [0.04, 0.04, 0.26], [0.4, 0, 0]); // colonne de direction
  // Sac de bord posé sur le baquet du passager : l'habitacle n'est pas vide.
  box(m.seat, [0.44, 0.95, 0.3], [0.42, 0.14, 0.38]);
  box(m.trim, [0.44, 1.03, 0.3], [0.34, 0.06, 0.3]);
  box(m.carbon, [0.44, 1.02, 0.12], [0.1, 0.06, 0.05]); // sangle

  const merged = b.build('car-body');
  body.add(merged);

  body.add(cockpitDriver.torso);
  const headPivot = cockpitDriver.headPivot;
  body.add(headPivot);
  const driverArms = cockpitDriver.arms;
  driverArms.forEach((arm) => body.add(arm));

  const steeringWheel = makeSteeringWheel(m, m.trim);
  body.add(steeringWheel);

  // ── Roues ────────────────────────────────────────────────────────────
  const wheels = [];
  const frontWheels = [];
  for (const side of [-1, 1]) {
    for (const z of [-1.05, 1.05]) {
      const rear = z > 0;
      const wheel = makeWheel({ radius: 0.34, width: rear && isMuscle ? 0.32 : 0.25, side, material: m.wheel, accent: trimColor });
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.95, 0.34, z);
      pivot.add(wheel);
      group.add(pivot);
      wheels.push(wheel);
      if (!rear) frontWheels.push(pivot);
    }
  }

  // ── Sous-éclairage et flammes ────────────────────────────────────────
  const underglow = mesh(group, UNIT_PLANE, m.underglow, [0, 0.1, 0.05], [2.1, 3.2, 1], [-Math.PI / 2, 0, 0]);
  const boostFlames = [];
  for (const side of [-1, 1]) {
    const flame = new THREE.Group();
    flame.position.set(side * 0.5, 0.36, 1.84);
    const outer = new THREE.Mesh(FLAME_OUTER, m.flameOuter);
    const inner = new THREE.Mesh(FLAME_INNER, m.flameInner);
    flame.add(outer, inner);
    flame.visible = false;
    body.add(flame);
    boostFlames.push({ group: flame, outer, inner });
  }

  // Ombres : la carrosserie projette, verre et lueurs non.
  body.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = !(object.material.transparent);
  });

  const viewScale = player ? 1 : 0.92;
  group.scale.set(viewScale * (profile.widthScale || 1), viewScale * (profile.heightScale || 1), viewScale * (profile.lengthScale || 1));
  group.userData = {
    kind: 'racer',
    profileId: profile.id,
    player,
    driverId: cockpitDriver.driverId,
    body,
    wheels,
    frontWheels,
    steeringWheel,
    headPivot,
    driverArms,
    driverColors: cockpitDriver.colors,
    driverParts: cockpitDriver,
    underglow,
    headlightCones,
    boostFlames,
    exhaustOffsets: [[-0.5, 0.36, 1.84], [0.5, 0.36, 1.84]],
    rearWheelOffsets: [[-0.95, 0.08, 1.2], [0.95, 0.08, 1.2]],
    materials: m,
    anim: { roll: 0, pitch: 0, lastSpeed: 0 },
  };
  return group;
}

/**
 * Animation par image d'un cabriolet : roues, direction, roulis/tangage de
 * la caisse, pilote, feux stop, flammes et sous-éclairage.
 */
export function animateRacerCar(car, state, dt, elapsed) {
  const data = car.userData;
  if (!data || data.kind !== 'racer') return;
  const {
    speed = 0,
    maxSpeed = 1,
    steer = 0,
    lateral = 0,
    boosting = false,
    slowed = false,
    impacting = false,
    stunned = false,
    skidding = false,
    idle = false,
    braking = false,
  } = state;
  const anim = data.anim;
  const acceleration = dt > 0 ? (speed - anim.lastSpeed) / dt : 0;
  anim.lastSpeed = speed;

  // Roues et direction.
  const spin = speed * dt * 0.95;
  data.wheels.forEach((wheel) => { wheel.rotation.x += spin; });
  data.frontWheels.forEach((pivot) => { pivot.rotation.y = steer; });
  data.steeringWheel.rotation.z = steer * 1.6;

  // Caisse : roulis dans les changements de voie, tangage à l'accélération.
  const targetRoll = clamp(-lateral * 0.075 + (skidding ? Math.sin(elapsed * 21) * 0.05 : 0), -0.11, 0.11);
  const targetPitch = clamp(-acceleration * 0.0045 + (boosting ? -0.025 : 0) + (braking ? 0.02 : 0), -0.06, 0.06);
  anim.roll = lerp(anim.roll, targetRoll, Math.min(1, dt * 9));
  anim.pitch = lerp(anim.pitch, targetPitch, Math.min(1, dt * 7));
  const vibration = idle ? Math.sin(elapsed * 38) * 0.003 : Math.sin(elapsed * 46) * 0.0022 * Math.min(1, speed / 8);
  const impactRoll = impacting ? Math.sin(elapsed * 31) * 0.075 : 0;
  const impactPitch = impacting ? Math.sin(elapsed * 24) * 0.035 : 0;
  data.body.rotation.z = anim.roll + impactRoll + (stunned ? Math.sin(elapsed * 19) * 0.03 : 0);
  data.body.rotation.x = anim.pitch + impactPitch;
  data.body.position.y = vibration + (slowed ? Math.sin(elapsed * 27) * 0.02 : 0) + (impacting ? Math.abs(Math.sin(elapsed * 22)) * 0.035 : 0) + (idle ? Math.sin(elapsed * 2.2) * 0.006 : 0);

  // Pilote : regarde dans la direction du virage, tremble si sonné.
  data.headPivot.rotation.y = lerp(data.headPivot.rotation.y, steer * 1.3, Math.min(1, dt * 6));
  data.headPivot.rotation.z = impacting
    ? Math.sin(elapsed * 29) * 0.22
    : stunned ? Math.sin(elapsed * 17) * 0.35 : lerp(data.headPivot.rotation.z, lateral * 0.05, Math.min(1, dt * 6));
  data.headPivot.position.y = DRIVER_HEAD_Y + (idle ? Math.sin(elapsed * 2.2) * 0.008 : 0);

  // Bras : les mains restent sur la jante. Le coup de volant fait avancer une
  // épaule et reculer l'autre, un choc (ou une frappe) fait encaisser les deux.
  const armAbsorb = impacting ? 0.16 + Math.sin(elapsed * 22) * 0.07
    : stunned ? 0.24 + Math.sin(elapsed * 17) * 0.09
      : braking ? 0.09
        : lerp(0, 0.02, Math.min(1, speed / 12));
  data.driverArms.forEach((arm, index) => {
    const rest = arm.userData.rest;
    const sign = index === 0 ? -1 : 1;
    arm.rotation.x = rest.x + armAbsorb;
    arm.rotation.z = rest.z + steer * 0.1 * sign;
  });

  // Feux stop et lueurs.
  const brake = braking || slowed || stunned;
  data.materials.tailLight.color.setHex(stunned ? 0xfff0b0 : brake ? 0xff5a6a : 0xff3450);
  data.materials.tailGlow.opacity = brake ? 0.7 : 0.3;

  // Sous-éclairage.
  const glowBase = data.player ? 0.32 : 0.14;
  data.materials.underglow.opacity = boosting ? 0.75 : slowed ? glowBase * 0.4 : glowBase + Math.sin(elapsed * 6) * 0.03;

  // Flammes de boost.
  data.boostFlames.forEach((flame, index) => {
    flame.group.visible = boosting;
    if (!boosting) return;
    const pulse = 0.8 + Math.sin(elapsed * 36 + index * Math.PI) * 0.2;
    const thrust = clamp((speed / Math.max(1, maxSpeed)) * pulse, 0.6, 1.5);
    flame.group.scale.set(0.9 + pulse * 0.2, 0.9 + pulse * 0.2, thrust);
    flame.outer.material.opacity = 0.6 + pulse * 0.3;
    flame.inner.material.opacity = 0.7 + pulse * 0.3;
  });
}

// ─── Fumée de pneus / échappement ────────────────────────────────────────────
export function createSmokePool(count = 48) {
  if (!smokeTexture) smokeTexture = makeSmokeTexture();
  const group = new THREE.Group();
  group.name = 'smoke';
  const puffs = Array.from({ length: count }, () => {
    const material = new THREE.SpriteMaterial({ map: smokeTexture, color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    group.add(sprite);
    return { sprite, material, life: 0, maxLife: 1, baseOpacity: 0.5, velocity: new THREE.Vector3(), startScale: 0.3, endScale: 1.2 };
  });
  let cursor = 0;
  return {
    group,
    emit(position, { color = 0xd8d8e0, opacity = 0.5, scale = 0.35, grow = 1.3, life = 0.7, velocity = [0, 0.6, 1.4] } = {}) {
      const puff = puffs[cursor];
      cursor = (cursor + 1) % puffs.length;
      puff.life = life;
      puff.maxLife = life;
      puff.startScale = scale;
      puff.endScale = scale * grow;
      puff.baseOpacity = opacity;
      puff.sprite.visible = true;
      puff.sprite.position.copy(position);
      puff.material.color.setHex(color);
      puff.material.opacity = opacity;
      puff.material.rotation = Math.random() * Math.PI * 2;
      puff.velocity.set(velocity[0] + (Math.random() - 0.5) * 0.6, velocity[1] + Math.random() * 0.4, velocity[2] + (Math.random() - 0.5) * 0.6);
    },
    update(dt, worldTravel = 0) {
      for (const puff of puffs) {
        if (!puff.sprite.visible) continue;
        puff.life -= dt;
        if (puff.life <= 0) { puff.sprite.visible = false; continue; }
        const progress = 1 - puff.life / puff.maxLife;
        puff.sprite.position.addScaledVector(puff.velocity, dt);
        puff.sprite.position.z += worldTravel;
        const size = lerp(puff.startScale, puff.endScale, progress);
        puff.sprite.scale.set(size, size, 1);
        puff.material.opacity = puff.baseOpacity * (1 - progress) * (1 - progress);
        puff.material.rotation += dt * 0.8;
      }
    },
    clear() {
      puffs.forEach((puff) => { puff.sprite.visible = false; puff.life = 0; });
    },
    dispose() {
      puffs.forEach((puff) => puff.material.dispose());
    },
  };
}

// ─── Trafic ──────────────────────────────────────────────────────────────────
export function makeTrafficVehicle(type) {
  const spec = CITY_RUSH_TRAFFIC_TYPES.find((vehicle) => vehicle.id === type) || CITY_RUSH_TRAFFIC_TYPES[0];
  if (!trafficDecals) trafficDecals = makeTrafficDecalAtlas();
  const isTruck = type === 'garbage-truck';
  const isSports = type === 'white-lambo';
  const police = type === 'police';
  const ambulance = type === 'ambulance';
  const bodyColor = police ? 0xf2f3f0 : ambulance ? 0xf8f7f0 : isTruck ? 0x4d8f55 : 0xf7f7f4;
  const accentColor = police ? 0x142947 : ambulance ? 0xe64a50 : isTruck ? 0xe0b847 : 0x1a1f2b;
  const m = {
    body: isSports ? paint(bodyColor, { clearcoat: 0.9, roughness: 0.22, emissiveIntensity: 0.02 }) : standard(bodyColor, { roughness: 0.55, metalness: 0.15 }),
    accent: standard(accentColor, { roughness: 0.6 }),
    glass: standard(isSports ? 0x101c2a : 0x1c3346, { metalness: 0.2, roughness: 0.18 }),
    dark: standard(0x12161f, { roughness: 0.88 }),
    chrome: standard(0xc9d3d8, { metalness: 0.6, roughness: 0.3 }),
    wheel: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3 }),
    warm: new THREE.MeshBasicMaterial({ color: 0xffefb4, toneMapped: false }),
    tail: new THREE.MeshBasicMaterial({ color: 0xff3450, toneMapped: false }),
    decal: new THREE.MeshBasicMaterial({ map: trafficDecals.texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
  };
  const beaconColors = { red: 0xff293f, blue: 0x28baff, amber: 0xffb13b };
  const group = new THREE.Group();
  group.name = `traffic-${type}`;
  const width = spec.width;
  const length = spec.length;
  const beacons = [];
  const b = createBatch();
  const box = (material, position, size, rotation = null) => b.box(material, position, size, rotation);
  const decal = (index, position, size, rotation) => b.plane(m.decal, position, size[0], size[1], rotation, { uv: trafficDecals.uv(index) });
  const beacon = (color, position, size) => {
    const material = new THREE.MeshBasicMaterial({ color: beaconColors[color], toneMapped: false, transparent: true, opacity: 1 });
    beacons.push(mesh(group, UNIT_BOX, material, position, size));
  };

  if (isTruck) {
    // Benne à ordures : cabine avancée, caisson, bras hydrauliques, gyrophares ambre.
    box(m.dark, [0, 0.42, 0], [width * 0.9, 0.3, length * 0.92]);
    box(m.body, [0, 1.0, -1.42], [width * 0.92, 1.1, 1.3]); // cabine
    box(m.glass, [0, 1.18, -2.08], [width * 0.74, 0.5, 0.05]);
    for (const side of [-1, 1]) {
      box(m.glass, [side * width * 0.46, 1.18, -1.42], [0.04, 0.42, 0.7]);
      box(m.chrome, [side * width * 0.52, 1.3, -1.7], [0.08, 0.2, 0.14]); // rétros
      box(m.warm, [side * width * 0.36, 0.72, -2.1], [0.26, 0.14, 0.05]);
      box(m.tail, [side * width * 0.4, 0.74, length * 0.46 + 0.02], [0.2, 0.22, 0.05]);
    }
    box(m.chrome, [0, 0.5, -2.12], [width * 0.96, 0.16, 0.1]); // pare-chocs
    box(m.body, [0, 1.22, 0.62], [width * 0.96, 1.3, 2.5]); // caisson
    box(m.accent, [0, 1.9, 0.62], [width * 0.98, 0.1, 2.56]);
    box(m.dark, [0, 1.1, 1.9], [width * 0.92, 1.05, 0.2]); // trappe arrière
    for (const x of [-0.6, -0.3, 0, 0.3, 0.6]) box(m.dark, [x * width * 0.7, 1.22, 0.62], [0.06, 1.2, 2.5]); // nervures
    for (const side of [-1, 1]) {
      box(m.accent, [side * (width * 0.5 + 0.06), 1.3, -0.3], [0.1, 0.1, 1.5]); // bras hydrauliques
      box(m.accent, [side * (width * 0.5 + 0.06), 1.0, -1.0], [0.1, 0.7, 0.1]);
      decal(3, [side * (width * 0.5 + 0.02), 1.25, 0.9], [1.3, 0.45], [0, side * Math.PI / 2, 0]);
    }
    for (const x of [-0.5, 0.5]) beacon('amber', [x, 1.66, -1.42], [0.2, 0.16, 0.2]);
  } else if (isSports) {
    // Supercar blanche : coin plat, phares fins, aileron.
    box(m.dark, [0, 0.3, 0], [width * 0.9, 0.12, length * 0.9]);
    box(m.body, [0, 0.5, 0.1], [width, 0.3, length * 0.9]);
    box(m.body, [0, 0.62, -1.1], [width * 0.94, 0.14, 1.4], [0.12, 0, 0]); // capot plongeant
    box(m.glass, [0, 0.86, -0.2], [width * 0.8, 0.3, 1.1], [0.25, 0, 0]); // bulle
    box(m.body, [0, 0.78, 0.9], [width * 0.96, 0.26, 1.3]); // capot moteur
    box(m.dark, [0, 0.92, 0.9], [width * 0.7, 0.03, 1.0]); // grille moteur
    box(m.dark, [0, 1.0, 1.55], [width * 0.98, 0.05, 0.32], [-0.1, 0, 0]); // aileron
    for (const side of [-1, 1]) {
      box(m.dark, [side * width * 0.42, 0.86, 1.52], [0.05, 0.2, 0.36]);
      box(m.warm, [side * width * 0.36, 0.58, -1.86], [0.4, 0.06, 0.05]);
      box(m.tail, [side * width * 0.34, 0.68, 1.86], [0.42, 0.1, 0.04]);
      box(m.dark, [side * width * 0.47, 0.44, -0.2], [0.08, 0.16, 0.9]); // prise d'air latérale
      box(m.chrome, [side * width * 0.5, 0.78, -0.5], [0.1, 0.06, 0.16]);
    }
    box(m.dark, [0, 0.36, -1.9], [width * 0.98, 0.1, 0.1]);
    for (const x of [-0.4, -0.15, 0.15, 0.4]) b.cylinder(m.chrome, [x, 0.4, 1.9], 0.04, 0.04, 0.1, 8, [Math.PI / 2, 0, 0]);
  } else {
    // Berlines d'intervention : police et ambulance.
    box(m.dark, [0, 0.32, 0], [width * 0.9, 0.14, length * 0.9]);
    box(m.body, [0, 0.56, 0], [width, 0.4, length * 0.92]);
    box(m.body, [0, 0.74, -length * 0.3], [width * 0.96, 0.1, 1.0]); // capot
    if (ambulance) {
      box(m.body, [0, 1.14, 0.45], [width * 0.98, 0.9, 2.3]); // cellule
      box(m.accent, [0, 1.6, 0.45], [width * 1.0, 0.1, 2.34]);
      box(m.glass, [0, 1.08, -0.72], [width * 0.84, 0.46, 0.06]);
      for (const side of [-1, 1]) {
        box(m.accent, [side * (width * 0.5 + 0.01), 0.6, 0.3], [0.03, 0.12, 2.6]);
        decal(2, [side * (width * 0.5 + 0.03), 1.15, 0.45], [0.7, 0.7], [0, side * Math.PI / 2, 0]);
        decal(1, [side * (width * 0.5 + 0.03), 0.84, 0.45], [1.6, 0.36], [0, side * Math.PI / 2, 0]);
      }
      box(m.glass, [0, 1.3, 1.62], [width * 0.6, 0.4, 0.04]);
      for (const x of [-0.5, 0.5]) for (const z of [-0.6, 1.4]) beacon('red', [x, 1.68, z], [0.18, 0.12, 0.18]);
    } else {
      box(m.body, [0, 0.98, 0.1], [width * 0.86, 0.5, 1.8]); // pavillon
      box(m.glass, [0, 1.0, -0.82], [width * 0.8, 0.42, 0.05], [0.3, 0, 0]);
      box(m.glass, [0, 1.0, 1.02], [width * 0.8, 0.4, 0.05], [-0.3, 0, 0]);
      for (const side of [-1, 1]) {
        box(m.glass, [side * width * 0.43, 1.02, 0.1], [0.04, 0.34, 1.5]);
        box(m.accent, [side * (width * 0.5 + 0.01), 0.52, 0.1], [0.03, 0.26, 2.4]);
        decal(0, [side * (width * 0.5 + 0.03), 0.62, 0.1], [1.4, 0.3], [0, side * Math.PI / 2, 0]);
        box(m.chrome, [side * (width * 0.5 + 0.08), 0.9, -0.5], [0.12, 0.08, 0.16]);
      }
      box(m.accent, [0, 1.0, 0.1], [width * 0.86, 0.5, 0.5]); // montant central
      box(m.dark, [0, 1.26, 0.1], [1.3, 0.08, 0.34]); // rampe
      beacon('red', [-0.42, 1.34, 0.1], [0.4, 0.14, 0.3]);
      beacon('blue', [0.42, 1.34, 0.1], [0.4, 0.14, 0.3]);
      box(m.warm, [0, 1.3, 0.1], [0.3, 0.1, 0.28]);
    }
    for (const side of [-1, 1]) {
      box(m.warm, [side * width * 0.36, 0.62, -length * 0.46 - 0.02], [0.3, 0.12, 0.05]);
      box(m.tail, [side * width * 0.36, 0.64, length * 0.46 + 0.02], [0.34, 0.12, 0.05]);
    }
    box(m.chrome, [0, 0.42, -length * 0.47], [width * 0.98, 0.12, 0.12]);
    box(m.chrome, [0, 0.42, length * 0.47], [width * 0.98, 0.12, 0.12]);
  }
  group.add(b.build('traffic-body'));

  const wheels = [];
  const wheelAxles = isTruck ? [-1.48, 0.92, 1.48] : [-length * 0.29, length * 0.29];
  const radius = isTruck ? 0.36 : 0.3;
  for (const side of [-1, 1]) {
    for (const z of wheelAxles) {
      const wheel = makeWheel({ radius, width: isTruck ? 0.26 : 0.22, side, material: m.wheel, racing: false });
      wheel.position.set(side * width * 0.49, radius, z);
      group.add(wheel);
      wheels.push(wheel);
    }
  }
  group.traverse((object) => { if (object.isMesh) object.castShadow = !object.material.transparent; });
  group.userData = { kind: 'traffic', trafficType: type, wheels, beacons, width, length };
  return group;
}
