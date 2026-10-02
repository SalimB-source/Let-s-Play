// Voitures de Vice City Rush : cabriolets de course aux silhouettes
// distinctes, pilotes casqués, roues à rayons, feux, flammes de boost,
// fumée de pneus, et véhicules de trafic (police, ambulance, benne, supercar).
//
// Les pièces fixes de chaque carrosserie sont fusionnées par matériau (un
// seul mesh par matériau) ; seules les pièces animées restent indépendantes
// (roues, volant, tête du pilote, flammes, lueurs). Une voiture de course
// coûte ainsi une trentaine d'appels de rendu au lieu de plus d'une centaine.
import * as THREE from 'three';
import { CITY_RUSH_TRAFFIC_TYPES } from './cityRushRules.js';
import { createBatch } from './cityRushBuilder.js';
import { makeCarPlateTexture, makeRacingNumberTexture, makeTrafficDecalAtlas, makeSmokeTexture } from './cityRushTextures.js';

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

/**
 * Cabriolet de course. `profile` vient de CITY_RUSH_CARS ; `options.player`
 * ajoute les phares volumétriques et une finition plus lumineuse.
 * `options.daylight` (Vice City en plein jour) coupe les faisceaux de phares et
 * descend les halos additifs, invisibles sous le soleil.
 */
export function makeRacerCar(profile, options = {}) {
  const { player = false, number = 1, daylight = false } = options;
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
    skin: standard(profile.driverColor, { roughness: 0.85 }),
    suit: standard(0x1f2235, { roughness: 0.8 }),
    helmet: paint(trimColor, { roughness: 0.22, emissiveIntensity: 0.08 }),
    visor: standard(0x1a2436, { roughness: 0.12, metalness: 0.5 }),
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
    roundel: new THREE.MeshBasicMaterial({ map: makeRacingNumberTexture(profile, number), transparent: true, depthWrite: false, toneMapped: false }),
  };
  const id = profile.id;
  const isGt = id === 'turbo-gt';
  const isMuscle = id === 'muscle-86';
  const isComet = id === 'night-comet';
  const isRoadster = id === 'vice-roadster';
  const b = createBatch();
  const box = (material, position, size, rotation = null) => b.box(material, position, size, rotation);

  // ── Caisse ───────────────────────────────────────────────────────────
  box(m.black, [0, 0.3, 0], [1.74, 0.14, 3.24]);
  box(m.body, [0, 0.54, 0.05], [1.86, 0.44, 3.14]);
  box(m.body, [0, 0.74, 0.35], [1.8, 0.1, 1.5]); // rebord de l'habitacle
  box(m.carbon, [0, 0.34, 0.1], [1.94, 0.08, 2.3]); // bas de caisse
  for (const side of [-1, 1]) {
    box(m.trim, [side * 0.96, 0.4, 0.1], [0.06, 0.07, 2.1]); // jupe
    box(m.body, [side * 0.945, 0.6, 0.3], [0.05, 0.3, 1.08]); // panneau de porte
    box(m.black, [side * 0.975, 0.6, -0.26], [0.01, 0.3, 0.02]); // ligne de porte
    box(m.chrome, [side * 0.985, 0.66, 0.5], [0.03, 0.04, 0.22]); // poignée
    b.plane(m.roundel, [side * 0.99, 0.6, 0.3], 0.4, 0.4, [0, side * Math.PI / 2, 0]); // numéro de course
    box(m.chrome, [side * 0.96, 0.84, -0.46], [0.16, 0.04, 0.05]); // tige de rétro
    box(m.body, [side * 1.05, 0.9, -0.44], [0.14, 0.12, 0.2]); // rétroviseur
    for (const z of [-1.05, 1.05]) box(m.body, [side * 0.92, 0.72, z], [0.74, 0.12, 0.76], [0, 0, side * 0.08]); // ailes
  }

  // ── Capot / nez ──────────────────────────────────────────────────────
  const hoodLength = isGt ? 1.34 : 1.18;
  box(m.body, [0, 0.79, -0.92 - (isGt ? 0.08 : 0)], [1.74, 0.18, hoodLength], [0.045, 0, 0]);
  box(m.body, [0, 0.64, -1.5], [1.76, 0.3, 0.42], [-0.32, 0, 0]); // pente du nez
  box(m.carbon, [0, 0.42, -1.62], [1.88, 0.18, 0.24]); // bouclier
  box(m.black, [0, 0.31, -1.66], [1.92, 0.05, 0.3]); // lame avant
  box(m.black, [0, 0.56, -1.7], [0.92, 0.14, 0.05]); // calandre
  for (const y of [0.52, 0.58]) box(m.chrome, [0, y, -1.72], [0.9, 0.015, 0.02]);
  b.plane(m.roundel, [0, 0.885, -0.9], 0.56, 0.56, [-Math.PI / 2 + 0.045, 0, 0]);
  if (isRoadster) {
    for (const side of [-1, 1]) box(m.trim, [side * 0.6, 0.86, -1.3], [0.42, 0.06, 0.34]); // phares escamotables
    box(m.chrome, [0, 0.47, -1.74], [1.9, 0.05, 0.02]);
  }
  if (isMuscle) {
    box(m.trim, [0, 0.92, -0.86], [0.72, 0.14, 0.5]); // prise d'air
    box(m.black, [0, 0.95, -1.08], [0.56, 0.08, 0.06]);
    for (const x of [-0.24, 0.24]) {
      box(m.trim, [x, 0.885, -0.92], [0.16, 0.012, 1.14], [0.045, 0, 0]);
      box(m.trim, [x, 0.9, 1.15], [0.16, 0.012, 0.84]);
    }
    box(m.chrome, [0, 0.44, -1.66], [1.92, 0.12, 0.08]);
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

  // Arrière.
  box(m.body, [0, 0.78, 1.12], [1.76, 0.22, 0.96]); // malle
  box(m.body, [0, 0.6, 1.62], [1.84, 0.3, 0.12]);
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
  box(m.glass, [0, 1.06, -0.4], [1.58, 0.44, 0.03], [0.46, 0, 0]); // pare-brise
  for (const side of [-1, 1]) box(m.chrome, [side * 0.78, 1.06, -0.4], [0.04, 0.46, 0.05], [0.46, 0, 0]);
  box(m.chrome, [0, 1.26, -0.31], [1.6, 0.04, 0.05]);
  const hoopWidth = isComet ? 1.6 : 1.0;
  for (const side of [-1, 1]) box(m.chrome, [side * hoopWidth / 2, 1.0, 0.72], [0.07, 0.56, 0.07]); // arceau
  box(m.chrome, [0, 1.28, 0.72], [hoopWidth + 0.07, 0.07, 0.07]);
  for (const x of [-0.43, 0.44]) {
    box(m.seat, [x, 0.8, 0.38], [0.6, 0.16, 0.6]);
    box(m.seat, [x, 1.08, 0.62], [0.58, 0.6, 0.14], [-0.14, 0, 0]);
    box(m.trim, [x, 1.24, 0.6], [0.3, 0.1, 0.16]);
  }
  // Pilote (corps fixe, tête animée).
  const driverX = -0.43;
  const driverZ = 0.32;
  box(m.suit, [driverX, 1.12, driverZ], [0.46, 0.5, 0.34]);
  box(m.trim, [driverX, 1.14, driverZ - 0.17], [0.3, 0.3, 0.02]);
  box(m.suit, [driverX, 1.36, driverZ + 0.02], [0.52, 0.12, 0.3]); // épaules
  for (const side of [-1, 1]) {
    box(m.suit, [driverX + side * 0.25, 1.14, driverZ - 0.2], [0.11, 0.11, 0.42], [-0.5, 0, 0]);
    box(m.skin, [driverX + side * 0.2, 1.06, driverZ - 0.42], [0.1, 0.1, 0.1]);
  }
  box(m.carbon, [driverX, 0.96, -0.5], [0.04, 0.04, 0.26], [0.4, 0, 0]); // colonne de direction

  const merged = b.build('car-body');
  body.add(merged);

  const headPivot = new THREE.Group();
  headPivot.position.set(driverX, 1.44, driverZ);
  body.add(headPivot);
  const head = createBatch();
  head.cylinder(m.skin, [0, 0.06, 0], 0.09, 0.09, 0.08, 8);
  head.sphere(m.helmet, [0, 0.22, 0], 0.2, 14);
  head.box(m.visor, [0, 0.22, -0.13], [0.26, 0.11, 0.12]);
  head.box(m.trim, [0, 0.36, 0.02], [0.08, 0.04, 0.3]);
  headPivot.add(head.build('helmet'));

  const steeringWheel = new THREE.Mesh(STEERING, m.black);
  steeringWheel.position.set(driverX, 1.02, -0.46);
  steeringWheel.rotation.x = -1.15;
  body.add(steeringWheel);
  mesh(steeringWheel, UNIT_BOX, m.carbon, [0, 0, 0], [0.3, 0.05, 0.02]);

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
    body,
    wheels,
    frontWheels,
    steeringWheel,
    headPivot,
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
