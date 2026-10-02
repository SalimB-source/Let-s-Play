import * as THREE from 'three';
import { westernNightLightIntensity } from './mirageRules';

// ───────────────────────────────────────────────────────────────────
// FAR WEST / DUST CREEK STAGE
// ───────────────────────────────────────────────────────────────────

const matCache = new Map();
function material(color, roughness = 0.88) {
  const key = `${color}_${roughness}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
    matCache.set(key, m);
  }
  return m;
}

function box(parent, mat, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

// Far West Palettes
const WOOD_DARK = material(0x382216);
const WOOD_RUSTIC = material(0x65432b);
const WOOD_CEDAR = material(0x824e31);
const WOOD_LIGHT = material(0xa8855e);
const WOOD_BARN_RED = material(0x843224);
const WOOD_BARN_TRIM = material(0xf2e0c2);
const WOOD_SALOON_GOLD = material(0xb5843a);
const WOOD_SAGE = material(0x567364);
const WOOD_PLUM = material(0x73536b);
const STONE_FOUNDATION = material(0x87735f, 0.95);
const STONE_BRICK = material(0x945d47, 0.95);
const IRON_BLACK = material(0x27272b, 0.65);
const BRASS_GOLD = material(0xdfa538, 0.45);
const GLASS_WINDOW = material(0x253b47, 0.3);
const WATER_BLUE = material(0x387a94, 0.35);
const HAY_GOLD = material(0xdfb445, 1.0);
const HAY_ROPE = material(0x8f6a27, 1.0);
const TIN_ROOF = material(0x7b858d, 0.6);
const CACTUS_GREEN = material(0x42683a, 0.92);

// Canvas sign generator (safe for Node / test environments)
function makeSignTexture(text, bgColor = '#362218', textColor = '#fbe3a1', borderColor = '#dfb878', subText = '') {
  if (typeof document === 'undefined' || !document.createElement) return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext?.('2d');
    if (!ctx || !ctx.fillRect) return null;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 500, 116);
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, 484, 100);
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (subText) {
      ctx.font = 'bold 42px Georgia, serif';
      ctx.fillText(text, 256, 48, 470);
      ctx.font = 'bold 22px Georgia, serif';
      ctx.fillStyle = borderColor;
      ctx.fillText(subText, 256, 92, 450);
    } else {
      ctx.font = 'bold 50px Georgia, serif';
      ctx.fillText(text, 256, 64, 470);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  } catch {
    return null;
  }
}

function makeSignBoard(text, subText = '', width = 4.2, height = 1.0) {
  const group = new THREE.Group();
  box(group, WOOD_DARK, 0, 0, 0, width + 0.16, height + 0.14, 0.14);
  const tex = makeSignTexture(text, '#362218', '#fbe3a1', '#dfb878', subText);
  if (tex) {
    const signMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide });
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), signMat);
    signMesh.position.set(0, 0, 0.08);
    group.add(signMesh);
  } else {
    // Fallback in headless / canvas-less test environments
    box(group, WOOD_SALOON_GOLD, 0, 0, 0.08, width, height, 0.04);
  }
  return group;
}

// ───────────────────────────────────────────────────────────────────
// COWBOYS (sur les côtés)
// ───────────────────────────────────────────────────────────────────

const SKIN_TONES = [0xecbc98, 0xd89c74, 0xbb7e54, 0xf2c4a2];
const SHIRT_COLORS = [0x9e342a, 0x2d4868, 0xd2be98, 0x486442, 0x824424, 0x36363c];
const VEST_COLORS = [0x442b1d, 0x6e492c, 0x222226, 0x854820];
const BANDANA_COLORS = [0xc42e2e, 0xdfa428, 0x2e4ec4, 0xe8e6df];
const HAT_COLORS = [0xded5c3, 0x2b2522, 0x7a4d2e, 0xa8865e, 0x563824];
const PANTS_COLORS = [0x2f425a, 0x563923, 0x242426, 0x3b4d63];

export function makeCowboy({ variant = 0, pose = 'standing', side = 1 } = {}) {
  const group = new THREE.Group();
  const skin = material(SKIN_TONES[variant % SKIN_TONES.length]);
  const shirt = material(SHIRT_COLORS[variant % SHIRT_COLORS.length]);
  const vest = material(VEST_COLORS[variant % VEST_COLORS.length]);
  const bandana = material(BANDANA_COLORS[variant % BANDANA_COLORS.length]);
  const hatMat = material(HAT_COLORS[variant % HAT_COLORS.length]);
  const pants = material(PANTS_COLORS[variant % PANTS_COLORS.length]);
  const boots = material(0x281a12);
  const leatherBelt = material(0x3d2415);

  const sitting = pose === 'sitting';
  const leaning = pose === 'leaning';
  const waving = pose === 'waving';
  const sheriff = pose === 'sheriff';
  const tipping = pose === 'tipping_hat';
  const balcony = pose === 'balcony';

  // 1. Legs and Boots
  if (sitting) {
    // Thighs extending forward
    box(group, pants, -0.11, 0.46, 0.16, 0.16, 0.16, 0.42);
    box(group, pants, 0.11, 0.46, 0.16, 0.16, 0.16, 0.42);
    // Lower legs vertical
    box(group, pants, -0.11, 0.22, 0.35, 0.15, 0.38, 0.15);
    box(group, pants, 0.11, 0.22, 0.35, 0.15, 0.38, 0.15);
    // Boots
    box(group, boots, -0.11, 0.06, 0.40, 0.17, 0.12, 0.22);
    box(group, boots, 0.11, 0.06, 0.40, 0.17, 0.12, 0.22);
  } else {
    // Standing legs
    for (const sx of [-0.11, 0.11]) {
      box(group, pants, sx, 0.42, 0, 0.16, 0.82, 0.18);
      // Chaps fringe on outer side
      box(group, vest, sx + Math.sign(sx) * 0.09, 0.44, 0, 0.04, 0.70, 0.14);
      // Boots with heel
      box(group, boots, sx, 0.07, 0.02, 0.18, 0.14, 0.26);
      box(group, BRASS_GOLD, sx, 0.07, -0.11, 0.08, 0.04, 0.05); // spur
    }
  }

  // 2. Belt & Holster
  const hipY = sitting ? 0.54 : 0.86;
  box(group, leatherBelt, 0, hipY, sitting ? -0.04 : 0, 0.44, 0.09, 0.28);
  box(group, BRASS_GOLD, 0, hipY, (sitting ? -0.04 : 0) + 0.145, 0.12, 0.08, 0.03); // belt buckle
  // Right hip holster + pistol grip
  box(group, leatherBelt, 0.24, hipY - 0.14, sitting ? -0.04 : 0, 0.11, 0.28, 0.13);
  box(group, IRON_BLACK, 0.24, hipY - 0.02, (sitting ? -0.04 : 0) + 0.02, 0.06, 0.09, 0.12); // gun handle

  // 3. Torso / Shirt & Vest
  const torsoY = sitting ? 0.86 : 1.18;
  box(group, shirt, 0, torsoY, sitting ? -0.05 : 0, 0.46, 0.56, 0.26);
  // Vest panels
  box(group, vest, -0.15, torsoY, (sitting ? -0.05 : 0) + 0.02, 0.19, 0.56, 0.25);
  box(group, vest, 0.15, torsoY, (sitting ? -0.05 : 0) + 0.02, 0.19, 0.56, 0.25);
  box(group, vest, 0, torsoY, (sitting ? -0.05 : 0) - 0.08, 0.46, 0.56, 0.12);

  // Sheriff star badge
  if (sheriff) {
    box(group, BRASS_GOLD, -0.13, torsoY + 0.12, (sitting ? -0.05 : 0) + 0.15, 0.09, 0.09, 0.02);
  }

  // 4. Bandana
  const neckY = sitting ? 1.16 : 1.48;
  box(group, bandana, 0, neckY, sitting ? -0.05 : 0.02, 0.32, 0.12, 0.28);
  box(group, bandana, 0, neckY - 0.08, (sitting ? -0.05 : 0) + 0.15, 0.14, 0.18, 0.03); // hanging point

  // 5. Head & Face
  const headY = sitting ? 1.36 : 1.68;
  box(group, skin, 0, headY, sitting ? -0.05 : 0, 0.28, 0.28, 0.26);
  if (variant % 2 === 0) {
    // Moustache
    box(group, material(0x2d1e15), 0, headY - 0.06, (sitting ? -0.05 : 0) + 0.135, 0.16, 0.05, 0.03);
  }

  // 6. Stetson Cowboy Hat
  const hatY = headY + 0.16;
  const hatGroup = new THREE.Group();
  hatGroup.position.set(0, hatY, sitting ? -0.05 : 0);
  // Wide brim
  box(hatGroup, hatMat, 0, 0, 0, 0.82, 0.04, 0.92);
  // Curled sides of brim
  const leftCurl = box(hatGroup, hatMat, -0.40, 0.06, 0, 0.14, 0.05, 0.84);
  leftCurl.rotation.z = -0.40;
  const rightCurl = box(hatGroup, hatMat, 0.40, 0.06, 0, 0.14, 0.05, 0.84);
  rightCurl.rotation.z = 0.40;
  // Hatband
  box(hatGroup, WOOD_DARK, 0, 0.05, 0, 0.50, 0.07, 0.52);
  // Pinched cattleman crown
  box(hatGroup, hatMat, 0, 0.16, 0, 0.46, 0.19, 0.48);
  box(hatGroup, hatMat, -0.12, 0.26, 0, 0.16, 0.08, 0.42);
  box(hatGroup, hatMat, 0.12, 0.26, 0, 0.16, 0.08, 0.42);
  group.add(hatGroup);

  // 7. Arms and Poses
  const armY = sitting ? 0.90 : 1.22;
  if (waving) {
    // Left arm relaxed
    box(group, shirt, -0.29, armY - 0.12, 0, 0.13, 0.48, 0.14);
    box(group, skin, -0.29, armY - 0.38, 0, 0.11, 0.14, 0.12);
    // Right arm waving high
    const wavingArm = new THREE.Group();
    wavingArm.position.set(0.29, armY + 0.15, 0);
    box(wavingArm, shirt, 0.12, 0.22, 0, 0.13, 0.48, 0.14);
    box(wavingArm, skin, 0.22, 0.48, 0, 0.12, 0.16, 0.12);
    group.add(wavingArm);
    group.userData.wavingArm = wavingArm;
    group.userData.baseArmRot = 0;
  } else if (tipping) {
    // Left arm relaxed
    box(group, shirt, -0.29, armY - 0.12, 0, 0.13, 0.48, 0.14);
    box(group, skin, -0.29, armY - 0.38, 0, 0.11, 0.14, 0.12);
    // Right arm bent up to hat
    box(group, shirt, 0.28, armY + 0.08, 0.08, 0.13, 0.34, 0.14);
    box(group, skin, 0.26, armY + 0.34, 0.12, 0.11, 0.18, 0.11);
  } else if (leaning || balcony) {
    // Both arms resting forward on railing
    box(group, shirt, -0.26, armY, 0.16, 0.13, 0.14, 0.36);
    box(group, skin, -0.26, armY - 0.02, 0.35, 0.11, 0.11, 0.14);
    box(group, shirt, 0.26, armY, 0.16, 0.13, 0.14, 0.36);
    box(group, skin, 0.26, armY - 0.02, 0.35, 0.11, 0.11, 0.14);
  } else if (sitting) {
    // Hands resting on knees
    box(group, shirt, -0.26, armY - 0.06, 0.18, 0.13, 0.32, 0.14);
    box(group, skin, -0.26, armY - 0.22, 0.26, 0.11, 0.11, 0.14);
    box(group, shirt, 0.26, armY - 0.06, 0.18, 0.13, 0.32, 0.14);
    box(group, skin, 0.26, armY - 0.22, 0.26, 0.11, 0.11, 0.14);
  } else {
    // Standard relaxed standing
    for (const sx of [-0.29, 0.29]) {
      box(group, shirt, sx, armY - 0.10, 0.02, 0.13, 0.48, 0.14);
      box(group, skin, sx, armY - 0.36, 0.02, 0.11, 0.14, 0.12);
    }
  }

  group.userData.bob = Math.random() * Math.PI * 2;
  group.userData.baseRotation = group.rotation.y;
  group.userData.baseY = group.position.y;
  return group;
}

// ───────────────────────────────────────────────────────────────────
// HORSES (chevaux Far West variés)
// ───────────────────────────────────────────────────────────────────

const HORSE_COATS = [
  { coat: 0xa1532c, mane: 0x4f2611, muzzle: 0xba6a40 }, // 0: Chestnut (Alezan)
  { coat: 0x663c22, mane: 0x1c1715, muzzle: 0x7a4a2b }, // 1: Bay (Bai avec crins noirs)
  { coat: 0x242426, mane: 0x151517, muzzle: 0x333336 }, // 2: Black (Noir)
  { coat: 0xd9ab56, mane: 0xf5ecd0, muzzle: 0xe5bf74 }, // 3: Palomino (doré crins blonds)
  { coat: 0xdcd8d0, mane: 0xbfbbb2, muzzle: 0xe5e1d9 }, // 4: Grey/White (Gris pommelé)
  { coat: 0x784124, mane: 0x221a16, muzzle: 0x8a4f2f, pinto: true }, // 5: Pinto (Pie brun et blanc)
];

export function makeWesternHorse({ variant = 0, pose = 'hitched', side = 1 } = {}) {
  const group = new THREE.Group();
  const spec = HORSE_COATS[variant % HORSE_COATS.length];
  const coatMat = material(spec.coat);
  const maneMat = material(spec.mane);
  const muzzleMat = material(spec.muzzle);
  const whiteMat = material(0xf4f0e6);
  const hoofMat = material(0x282320);
  const leatherMat = material(0x402516);
  const blanketMat = material(variant % 2 === 0 ? 0xb53526 : 0x285973);

  // 1. Torso
  box(group, coatMat, 0, 0.94, 0, 0.80, 0.80, 1.62);
  if (spec.pinto) {
    // Pinto white patches
    box(group, whiteMat, 0.41, 0.96, 0.18, 0.02, 0.42, 0.52);
    box(group, whiteMat, -0.41, 0.92, -0.22, 0.02, 0.38, 0.48);
    box(group, whiteMat, 0, 1.28, 0.12, 0.42, 0.14, 0.44);
  }

  // 2. Legs with hooves & socks
  const legPositions = [
    [-0.27, -0.52], [0.27, -0.52], // front
    [-0.27, 0.52], [0.27, 0.52],   // hind
  ];
  for (let idx = 0; idx < legPositions.length; idx++) {
    const [lx, lz] = legPositions[idx];
    box(group, coatMat, lx, 0.52, lz, 0.19, 0.64, 0.21);
    const hasSock = (variant + idx) % 2 === 0;
    box(group, hasSock ? whiteMat : coatMat, lx, 0.16, lz, 0.20, 0.22, 0.22);
    box(group, hoofMat, lx, 0.06, lz - 0.02, 0.22, 0.12, 0.25);
  }

  // 3. Tail (swishing)
  const tail = box(group, maneMat, 0, 0.78, 0.88, 0.20, 0.82, 0.20);
  tail.rotation.x = -0.32;
  group.userData.tail = tail;

  // 4. Neck and Head Group
  const neckGroup = new THREE.Group();
  neckGroup.position.set(0, 1.20, -0.62);
  const drinking = pose === 'drinking';
  neckGroup.rotation.x = drinking ? -0.72 : -0.28;

  // Neck
  box(neckGroup, coatMat, 0, 0.38, -0.08, 0.44, 0.88, 0.50);
  // Mane
  box(neckGroup, maneMat, 0, 0.46, 0.16, 0.16, 0.86, 0.16);
  // Head
  box(neckGroup, coatMat, 0, 0.80, -0.32, 0.44, 0.44, 0.76);
  // Muzzle & Nostrils
  box(neckGroup, muzzleMat, 0, 0.70, -0.72, 0.36, 0.34, 0.34);
  box(neckGroup, hoofMat, -0.09, 0.68, -0.88, 0.06, 0.06, 0.03);
  box(neckGroup, hoofMat, 0.09, 0.68, -0.88, 0.06, 0.06, 0.03);
  // White star / blaze on brow
  if (variant % 2 === 1) {
    box(neckGroup, whiteMat, 0, 0.84, -0.56, 0.12, 0.26, 0.03);
  }
  // Ears
  box(neckGroup, coatMat, -0.16, 1.06, -0.18, 0.11, 0.24, 0.14);
  box(neckGroup, coatMat, 0.16, 1.06, -0.18, 0.11, 0.24, 0.14);
  group.add(neckGroup);
  group.userData.head = neckGroup;
  group.userData.baseHeadRot = neckGroup.rotation.x;

  // 5. Saddle / Gear (for hitched horses)
  if (pose === 'hitched') {
    // Navajo saddle blanket
    box(group, blanketMat, 0, 1.32, 0.04, 0.92, 0.10, 0.90);
    // Western leather saddle
    box(group, leatherMat, 0, 1.41, 0.06, 0.70, 0.14, 0.66);
    // Saddle horn (pommeau)
    box(group, BRASS_GOLD, 0, 1.54, -0.20, 0.09, 0.16, 0.09);
    // Cantle (troussequin)
    box(group, leatherMat, 0, 1.52, 0.34, 0.50, 0.14, 0.10);
    // Stirrups hanging down
    for (const sx of [-0.43, 0.43]) {
      box(group, leatherMat, sx, 0.95, 0.04, 0.05, 0.68, 0.08);
      box(group, BRASS_GOLD, sx, 0.58, 0.04, 0.09, 0.08, 0.12);
    }
    // Halter & reins
    box(neckGroup, leatherMat, 0, 0.74, -0.50, 0.46, 0.06, 0.46);
    box(neckGroup, leatherMat, 0, 0.84, -0.28, 0.46, 0.05, 0.08);
  }

  group.userData.isAnimal = true;
  group.userData.animalType = 'horse';
  group.userData.bob = Math.random() * Math.PI * 2;
  group.userData.baseY = group.position.y;
  return group;
}

// ───────────────────────────────────────────────────────────────────
// TOWN PROPS & DETAILS (saloon, écurie, etc.)
// ───────────────────────────────────────────────────────────────────

function makeBoardwalk(side = 1, length = 11.2) {
  const group = new THREE.Group();
  // Width 2.3m, centered at side * 6.35 (spans from |x| = 5.2 to 7.5)
  const bx = side * 6.35;
  // Main deck
  box(group, WOOD_LIGHT, bx, 0.14, 0, 2.3, 0.14, length);
  // Edge curb along street
  box(group, WOOD_DARK, side * 5.15, 0.16, 0, 0.16, 0.20, length);
  // Planking planks relief
  for (let z = -5.0; z <= 5.0; z += 1.0) {
    box(group, WOOD_RUSTIC, bx, 0.215, z, 2.26, 0.02, 0.06);
  }
  // Foundation blocks underneath
  for (const z of [-4.5, 0, 4.5]) {
    box(group, STONE_FOUNDATION, bx, -0.10, z, 2.1, 0.34, 0.4);
  }
  return group;
}

function makeHitchingRail(side = 1, z = 0, length = 3.4) {
  const group = new THREE.Group();
  const rx = side * 5.12;
  // Two vertical timber posts
  box(group, WOOD_DARK, rx, 0.48, z - length / 2, 0.14, 0.96, 0.14);
  box(group, WOOD_DARK, rx, 0.48, z + length / 2, 0.14, 0.96, 0.14);
  // Horizontal rail
  box(group, WOOD_RUSTIC, rx, 0.82, z, 0.10, 0.12, length + 0.2);
  return group;
}

function makeWaterTrough(side = 1, z = 0) {
  const group = new THREE.Group();
  const tx = side * 5.35;
  // Trough body
  box(group, WOOD_DARK, tx, 0.30, z, 0.65, 0.48, 1.8);
  // Water surface
  box(group, WATER_BLUE, tx, 0.44, z, 0.52, 0.04, 1.62);
  // Iron corner brackets
  for (const dz of [-0.85, 0.85]) {
    box(group, IRON_BLACK, tx, 0.30, z + dz, 0.68, 0.49, 0.06);
  }
  return group;
}

function makeWhiskeyBarrels(side = 1, x = 6.7, z = 0) {
  const group = new THREE.Group();
  const bx = side * x;
  // Barrel 1
  box(group, WOOD_CEDAR, bx, 0.42, z, 0.70, 0.84, 0.70);
  box(group, IRON_BLACK, bx, 0.62, z, 0.73, 0.06, 0.73);
  box(group, IRON_BLACK, bx, 0.22, z, 0.73, 0.06, 0.73);
  // Barrel 2
  box(group, WOOD_CEDAR, bx, 0.42, z + 0.85, 0.70, 0.84, 0.70);
  box(group, IRON_BLACK, bx, 0.62, z + 0.85, 0.73, 0.06, 0.73);
  box(group, IRON_BLACK, bx, 0.22, z + 0.85, 0.73, 0.06, 0.73);
  // Barrel 3 stacked on top
  box(group, WOOD_RUSTIC, bx, 1.15, z + 0.42, 0.68, 0.76, 0.68);
  box(group, IRON_BLACK, bx, 1.30, z + 0.42, 0.71, 0.05, 0.71);
  box(group, IRON_BLACK, bx, 1.00, z + 0.42, 0.71, 0.05, 0.71);
  return group;
}

function makeHayBales(side = 1, x = 6.6, z = 0, count = 3) {
  const group = new THREE.Group();
  const bx = side * x;
  const offsets = [
    [0, 0.26, 0],
    [0, 0.26, 1.0],
    [0, 0.74, 0.45],
  ];
  for (let i = 0; i < Math.min(count, offsets.length); i++) {
    const [dx, dy, dz] = offsets[i];
    box(group, HAY_GOLD, bx + side * dx, dy, z + dz, 0.68, 0.48, 0.92);
    // Two binding ropes
    box(group, HAY_ROPE, bx + side * dx, dy, z + dz - 0.24, 0.71, 0.50, 0.05);
    box(group, HAY_ROPE, bx + side * dx, dy, z + dz + 0.24, 0.71, 0.50, 0.05);
  }
  return group;
}

function makeWagonWheel(side = 1, x = 7.35, y = 0.6, z = 0) {
  const group = new THREE.Group();
  const wx = side * x;
  // Rim
  box(group, WOOD_DARK, wx, y, z, 0.08, 1.10, 1.10);
  box(group, IRON_BLACK, wx - side * 0.02, y, z, 0.04, 1.14, 1.14);
  // Hub
  box(group, IRON_BLACK, wx, y, z, 0.16, 0.24, 0.24);
  // Spokes (cross)
  box(group, WOOD_LIGHT, wx, y, z, 0.06, 0.98, 0.08);
  box(group, WOOD_LIGHT, wx, y, z, 0.06, 0.08, 0.98);
  const diag1 = box(group, WOOD_LIGHT, wx, y, z, 0.06, 0.98, 0.08);
  diag1.rotation.x = Math.PI / 4;
  group.rotation.z = side * 0.18; // leaning against wall
  return group;
}

function makeBatwingDoors(side = 1, x = 7.38, y = 1.1, z = 0) {
  const group = new THREE.Group();
  const dx = side * x;
  // Left swinging shutter (angled slightly outward)
  const leftDoor = box(group, WOOD_SALOON_GOLD, dx, y, z - 0.45, 0.05, 0.88, 0.42);
  leftDoor.rotation.y = side * 0.35;
  box(group, BRASS_GOLD, dx, y + 0.32, z - 0.64, 0.07, 0.08, 0.04);
  box(group, BRASS_GOLD, dx, y - 0.32, z - 0.64, 0.07, 0.08, 0.04);

  // Right swinging shutter (angled slightly inward)
  const rightDoor = box(group, WOOD_SALOON_GOLD, dx, y, z + 0.45, 0.05, 0.88, 0.42);
  rightDoor.rotation.y = -side * 0.25;
  box(group, BRASS_GOLD, dx, y + 0.32, z + 0.64, 0.07, 0.08, 0.04);
  box(group, BRASS_GOLD, dx, y - 0.32, z + 0.64, 0.07, 0.08, 0.04);
  return group;
}

function makeWindmill(side = 1, x = 10.2, z = 0) {
  const group = new THREE.Group();
  const wx = side * x;
  // 4 wooden trellis tower legs tapering up
  box(group, WOOD_DARK, wx - 0.8, 4.0, z - 0.8, 0.18, 8.0, 0.18);
  box(group, WOOD_DARK, wx + 0.8, 4.0, z - 0.8, 0.18, 8.0, 0.18);
  box(group, WOOD_DARK, wx - 0.8, 4.0, z + 0.8, 0.18, 8.0, 0.18);
  box(group, WOOD_DARK, wx + 0.8, 4.0, z + 0.8, 0.18, 8.0, 0.18);
  // Cross bracing
  for (const y of [2.0, 4.2, 6.4, 7.8]) {
    box(group, WOOD_RUSTIC, wx, y, z - 0.8, 1.7, 0.12, 0.12);
    box(group, WOOD_RUSTIC, wx, y, z + 0.8, 1.7, 0.12, 0.12);
  }
  // Nacelle / gearbox at top
  box(group, IRON_BLACK, wx, 8.2, z, 0.6, 0.5, 0.9);
  // Tail rudder vane
  box(group, TIN_ROOF, wx, 8.35, z + 1.2, 0.06, 0.75, 1.4);

  // Rotating blades wheel
  const bladesGroup = new THREE.Group();
  bladesGroup.position.set(wx, 8.2, z - 0.55);
  box(bladesGroup, IRON_BLACK, 0, 0, 0, 0.28, 0.28, 0.22); // center hub
  const BLADE_COUNT = 10;
  for (let b = 0; b < BLADE_COUNT; b++) {
    const angle = (b / BLADE_COUNT) * Math.PI * 2;
    const blade = box(bladesGroup, TIN_ROOF, Math.cos(angle) * 1.1, Math.sin(angle) * 1.1, 0, 0.26, 0.92, 0.04);
    blade.rotation.z = angle + 0.2;
  }
  group.add(bladesGroup);
  group.userData.windmills = [bladesGroup];
  return group;
}

function makeWaterTower(side = 1, x = 10.5, z = 0) {
  const group = new THREE.Group();
  const tx = side * x;
  // 4 heavy timber legs
  box(group, WOOD_DARK, tx - 1.2, 2.7, z - 1.2, 0.26, 5.4, 0.26);
  box(group, WOOD_DARK, tx + 1.2, 2.7, z - 1.2, 0.26, 5.4, 0.26);
  box(group, WOOD_DARK, tx - 1.2, 2.7, z + 1.2, 0.26, 5.4, 0.26);
  box(group, WOOD_DARK, tx + 1.2, 2.7, z + 1.2, 0.26, 5.4, 0.26);
  // Cross braces
  for (const y of [1.6, 3.4, 5.0]) {
    box(group, WOOD_RUSTIC, tx, y, z - 1.2, 2.5, 0.14, 0.14);
    box(group, WOOD_RUSTIC, tx, y, z + 1.2, 2.5, 0.14, 0.14);
  }
  // Wooden stave round tank (approximated with octagonal box stack)
  box(group, WOOD_CEDAR, tx, 6.7, z, 3.2, 2.8, 3.2);
  // Metal bands around tank
  for (const dy of [-0.9, 0, 0.9]) {
    box(group, IRON_BLACK, tx, 6.7 + dy, z, 3.32, 0.08, 3.32);
  }
  // Conical tin roof
  box(group, TIN_ROOF, tx, 8.4, z, 3.4, 0.6, 3.4);
  box(group, TIN_ROOF, tx, 8.8, z, 2.2, 0.4, 2.2);
  // Wooden ladder
  box(group, WOOD_LIGHT, tx - 1.4, 4.0, z + 0.2, 0.12, 7.8, 0.35);
  // Discharge pipe
  box(group, IRON_BLACK, tx - 1.2, 4.5, z, 0.18, 3.2, 0.18);
  return group;
}

function makeCactus(side = 1, x = 13.5, z = 0) {
  const group = new THREE.Group();
  const cx = side * x;
  // Main trunk
  box(group, CACTUS_GREEN, cx, 1.4, z, 0.36, 2.8, 0.36);
  // Left arm
  box(group, CACTUS_GREEN, cx - side * 0.35, 1.3, z, 0.42, 0.28, 0.28);
  box(group, CACTUS_GREEN, cx - side * 0.50, 1.9, z, 0.28, 1.10, 0.28);
  // Right arm
  box(group, CACTUS_GREEN, cx + side * 0.35, 1.6, z, 0.42, 0.28, 0.28);
  box(group, CACTUS_GREEN, cx + side * 0.50, 2.3, z, 0.28, 1.20, 0.28);
  return group;
}

// ───────────────────────────────────────────────────────────────────
// BUILDINGS (SALOONS, STABLES, SHERIFF, GENERAL STORE, ETC.)
// ───────────────────────────────────────────────────────────────────

export function westernBuilding(index, side) {
  const group = new THREE.Group();
  const people = [];
  const animals = [];
  const windmills = [];
  const nightLights = [];

  // Continuous boardwalk along the entire block
  const boardwalk = makeBoardwalk(side, 11.2);
  group.add(boardwalk);

  // Background cactus in desert beyond buildings
  const cactus = makeCactus(side, 13.5, (index % 3 - 1) * 3.5);
  group.add(cactus);

  // Helper for night lights: window & lantern
  const makeWindowMat = () => {
    const m = new THREE.MeshStandardMaterial({
      color: 0x273f49, emissive: 0xffa443, emissiveIntensity: 0.02,
      roughness: 0.42, metalness: 0.08,
    });
    nightLights.push({ material: m, kind: 'window' });
    return m;
  };
  const makeLantern = (lx, ly, lz) => {
    const lm = new THREE.MeshStandardMaterial({
      color: 0xffc66e, emissive: 0xff8d28, emissiveIntensity: 0.015,
      roughness: 0.32, metalness: 0.08,
    });
    const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), lm);
    lantern.position.set(lx, ly, lz);
    lantern.userData.glow = true;
    group.add(lantern);
    nightLights.push({ material: lm, kind: 'lantern' });
  };

  // 10 Distinct Segment Designs:
  const slot = index % 10;

  if (slot === 0 && side === -1) {
    // ═════════════════════════════════════════════════════════════════
    // SEGMENT 0 (LEFT): GRAND "GOLDEN NUGGET SALOON"
    // ═════════════════════════════════════════════════════════════════
    const h = 5.6;
    box(group, WOOD_CEDAR, side * 9.8, h / 2, 0, 4.8, h, 9.8);
    // Western false-front stepped pediment
    box(group, WOOD_SALOON_GOLD, side * 7.42, h + 0.5, 0, 0.16, 1.0, 6.2);
    box(group, WOOD_SALOON_GOLD, side * 7.42, h + 1.1, 0, 0.16, 0.5, 3.8);

    // Porch posts & Overhang
    for (const z of [-4.2, -1.4, 1.4, 4.2]) {
      box(group, WOOD_DARK, side * 5.3, 1.6, z, 0.18, 3.2, 0.18);
    }
    box(group, WOOD_RUSTIC, side * 6.35, 3.25, 0, 2.2, 0.20, 9.8); // 1st floor roof / balcony floor

    // 2nd Floor Balcony with railings
    for (const z of [-4.2, 4.2]) {
      box(group, WOOD_LIGHT, side * 6.35, 3.8, z, 2.1, 0.85, 0.08);
    }
    box(group, WOOD_LIGHT, side * 5.3, 3.8, 0, 0.08, 0.85, 8.6); // outer railing

    // Windows with glowing glass & trim
    for (const z of [-2.6, 2.6]) {
      box(group, WOOD_BARN_TRIM, side * 7.41, 1.8, z, 0.08, 1.6, 1.4);
      box(group, makeWindowMat(), side * 7.39, 1.8, z, 0.06, 1.4, 1.2);
      box(group, WOOD_BARN_TRIM, side * 7.41, 4.4, z, 0.08, 1.6, 1.4);
      box(group, makeWindowMat(), side * 7.39, 4.4, z, 0.06, 1.4, 1.2);
    }

    // Swinging Batwing Doors
    const doors = makeBatwingDoors(side, 7.38, 1.1, 0);
    group.add(doors);

    // Hanging lanterns
    makeLantern(side * 5.3, 2.9, -1.4);
    makeLantern(side * 5.3, 2.9, 1.4);

    // Large Saloon Sign
    const sign = makeSignBoard('GOLDEN NUGGET', '★ SALOON ★', 4.6, 1.1);
    sign.position.set(side * 7.36, 3.65, 0);
    sign.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(sign);

    // Whiskey barrels on porch
    const barrels = makeWhiskeyBarrels(side, 6.7, -3.2);
    group.add(barrels);

    // Hitching rail & Hitched Horse
    const hitch = makeHitchingRail(side, 2.2, 3.2);
    group.add(hitch);
    const horse = makeWesternHorse({ variant: 1, pose: 'hitched', side }); // Bay horse
    horse.position.set(side * 6.0, 0.14, 2.2);
    horse.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(horse);
    animals.push(horse);

    // Cowboys: 1 leaning on ground porch, 1 leaning on 2nd floor balcony!
    const cowboy1 = makeCowboy({ variant: 0, pose: 'leaning', side });
    cowboy1.position.set(side * 5.8, 0.14, -1.8);
    cowboy1.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(cowboy1);
    people.push(cowboy1);

    const cowboy2 = makeCowboy({ variant: 2, pose: 'balcony', side });
    cowboy2.position.set(side * 5.8, 3.35, 0.8);
    cowboy2.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(cowboy2);
    people.push(cowboy2);

  } else if (slot === 0 && side === 1) {
    // ═════════════════════════════════════════════════════════════════
    // SEGMENT 0 (RIGHT): "DUST CREEK LIVERY & STABLES" (Grand Barn)
    // ═════════════════════════════════════════════════════════════════
    const h = 5.2;
    box(group, WOOD_BARN_RED, side * 9.8, h / 2, 0, 4.8, h, 9.8);
    // Barn white trim lines (X braces)
    box(group, WOOD_BARN_TRIM, side * 7.42, 1.5, -2.4, 0.08, 2.6, 2.4);
    box(group, WOOD_BARN_RED, side * 7.43, 1.5, -2.4, 0.08, 2.3, 2.1);
    // Hayloft upper door with hay spilling out!
    box(group, WOOD_DARK, side * 7.42, 4.0, 0, 0.08, 1.8, 1.8);
    box(group, HAY_GOLD, side * 7.35, 3.4, 0, 0.35, 0.5, 1.4);
    // Hay hoist beam above hayloft
    box(group, WOOD_DARK, side * 7.0, 5.2, 0, 1.2, 0.18, 0.18);

    // Open Horse Stall on ground floor
    box(group, WOOD_DARK, side * 7.41, 1.0, 2.5, 0.08, 1.9, 3.2);
    box(group, WOOD_RUSTIC, side * 7.36, 0.55, 2.5, 0.12, 1.0, 3.1); // half stall door
    box(group, HAY_GOLD, side * 7.6, 0.22, 2.5, 1.2, 0.3, 2.8);

    // Lantern by the stable door
    makeLantern(side * 7.35, 2.6, -1.0);

    // Stable Sign
    const sign = makeSignBoard('DUST CREEK', '★ LIVERY & STABLES ★', 4.4, 1.0);
    sign.position.set(side * 7.38, 4.8, 0);
    sign.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(sign);

    // Stacked hay bales outside
    const bales = makeHayBales(side, 6.6, -3.2, 3);
    group.add(bales);

    // Water trough
    const trough = makeWaterTrough(side, 0.8);
    group.add(trough);

    // Horse 1: inside stall looking out!
    const horse1 = makeWesternHorse({ variant: 0, pose: 'stall', side }); // Chestnut
    horse1.position.set(side * 7.5, 0.14, 2.5);
    horse1.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(horse1);
    animals.push(horse1);

    // Horse 2: standing near trough
    const horse2 = makeWesternHorse({ variant: 3, pose: 'hitched', side }); // Palomino
    horse2.position.set(side * 5.8, 0.14, -0.6);
    horse2.rotation.y = 0;
    group.add(horse2);
    animals.push(horse2);

    // Cowboy: Stablehand leaning on hay bales
    const cowboy = makeCowboy({ variant: 1, pose: 'leaning', side });
    cowboy.position.set(side * 6.2, 0.14, -2.4);
    cowboy.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(cowboy);
    people.push(cowboy);

  } else if (slot === 1) {
    // ═════════════════════════════════════════════════════════════════
    // SEGMENT 1: "SHERIFF OFFICE & TOWN JAIL"
    // ═════════════════════════════════════════════════════════════════
    const h = 4.2;
    box(group, WOOD_RUSTIC, side * 9.8, h / 2, 0, 4.8, h, 9.8);
    // Overhanging porch roof
    for (const z of [-4.2, 0, 4.2]) {
      box(group, WOOD_DARK, side * 5.3, 1.5, z, 0.18, 3.0, 0.18);
    }
    box(group, WOOD_CEDAR, side * 6.35, 3.0, 0, 2.2, 0.18, 9.8);

    // Brick chimney on side
    box(group, STONE_BRICK, side * 9.8, h / 2 + 0.8, -4.5, 0.9, h + 1.6, 0.9);

    // Barred Jail Cell Window
    box(group, WOOD_DARK, side * 7.41, 1.7, 2.6, 0.08, 1.4, 1.5);
    box(group, makeWindowMat(), side * 7.39, 1.7, 2.6, 0.05, 1.2, 1.3);
    for (const dz of [-0.4, 0, 0.4]) {
      box(group, IRON_BLACK, side * 7.37, 1.7, 2.6 + dz, 0.04, 1.25, 0.04); // iron bars
    }

    // Heavy office door
    box(group, WOOD_DARK, side * 7.41, 1.1, -1.2, 0.08, 2.1, 1.1);
    box(group, BRASS_GOLD, side * 7.36, 1.1, -0.8, 0.05, 0.08, 0.08); // brass knob
    makeLantern(side * 7.35, 2.4, -0.4);

    // Sheriff Sign
    const sign = makeSignBoard('SHERIFF & JAIL', '★ DUST CREEK ★', 4.4, 1.0);
    sign.position.set(side * 7.36, 3.4, 0);
    sign.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(sign);

    // Wooden bench outside
    box(group, WOOD_LIGHT, side * 6.6, 0.45, -3.2, 0.55, 0.12, 1.6);
    box(group, WOOD_DARK, side * 6.6, 0.22, -3.8, 0.55, 0.40, 0.12);
    box(group, WOOD_DARK, side * 6.6, 0.22, -2.6, 0.55, 0.40, 0.12);

    // Hitching post with Sheriff's Black Horse
    const hitch = makeHitchingRail(side, 1.2, 2.8);
    group.add(hitch);
    const horse = makeWesternHorse({ variant: 2, pose: 'hitched', side }); // Black horse
    horse.position.set(side * 6.0, 0.14, 1.2);
    horse.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(horse);
    animals.push(horse);

    // The Sheriff himself standing proud on the boardwalk!
    const sheriffFigure = makeCowboy({ variant: 3, pose: 'sheriff', side });
    sheriffFigure.position.set(side * 5.8, 0.14, -1.2);
    sheriffFigure.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(sheriffFigure);
    people.push(sheriffFigure);

  } else if (slot === 2) {
    // ═════════════════════════════════════════════════════════════════
    // SEGMENT 2: "GENERAL STORE & TRADING POST"
    // ═════════════════════════════════════════════════════════════════
    const h = 4.4;
    box(group, WOOD_SAGE, side * 9.8, h / 2, 0, 4.8, h, 9.8);
    // Veranda with timber posts
    for (const z of [-4.2, -1.4, 1.4, 4.2]) {
      box(group, WOOD_DARK, side * 5.3, 1.5, z, 0.18, 3.0, 0.18);
    }
    box(group, WOOD_RUSTIC, side * 6.35, 3.0, 0, 2.2, 0.18, 9.8);

    // Two display windows
    for (const z of [-2.4, 2.4]) {
      box(group, WOOD_LIGHT, side * 7.41, 1.7, z, 0.08, 1.5, 1.8);
      box(group, makeWindowMat(), side * 7.39, 1.7, z, 0.05, 1.3, 1.6);
    }
    // Entrance door & lantern
    box(group, WOOD_DARK, side * 7.41, 1.1, 0, 0.08, 2.2, 1.2);
    makeLantern(side * 7.35, 2.5, 0.8);

    // General Store Sign
    const sign = makeSignBoard('GENERAL STORE', 'PROVISIONS & TOOLS', 4.5, 1.0);
    sign.position.set(side * 7.36, 3.5, 0);
    sign.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(sign);

    // Props: stacked crates, flour sacks, wagon wheel
    box(group, WOOD_RUSTIC, side * 6.7, 0.40, -3.2, 0.70, 0.70, 0.70);
    box(group, WOOD_LIGHT, side * 6.7, 0.35, -2.3, 0.60, 0.60, 0.60);
    const wheel = makeWagonWheel(side, 7.35, 0.6, 3.8);
    group.add(wheel);

    // Hitching post with horse
    const hitch = makeHitchingRail(side, 1.6, 2.6);
    group.add(hitch);
    const horse = makeWesternHorse({ variant: 5, pose: 'hitched', side }); // Pinto paint horse
    horse.position.set(side * 6.0, 0.14, 1.6);
    horse.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(horse);
    animals.push(horse);

    // Cowboy customer sitting relaxed on a crate!
    const cowboy = makeCowboy({ variant: 0, pose: 'sitting', side });
    cowboy.position.set(side * 6.5, 0.14, -1.4);
    cowboy.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(cowboy);
    people.push(cowboy);

  } else if (slot === 3) {
    // ═════════════════════════════════════════════════════════════════
    // SEGMENT 3: RUSTIC "LAST CHANCE SALOON"
    // ═════════════════════════════════════════════════════════════════
    const h = 4.8;
    box(group, WOOD_CEDAR, side * 9.8, h / 2, 0, 4.8, h, 9.8);
    // False front gable
    box(group, WOOD_SALOON_GOLD, side * 7.42, h + 0.4, 0, 0.16, 0.8, 5.4);

    // Porch posts & overhanging roof
    for (const z of [-4.2, 0, 4.2]) {
      box(group, WOOD_DARK, side * 5.3, 1.5, z, 0.18, 3.0, 0.18);
    }
    box(group, TIN_ROOF, side * 6.35, 3.1, 0, 2.2, 0.14, 9.8);

    // Batwing doors
    const doors = makeBatwingDoors(side, 7.38, 1.1, 0);
    group.add(doors);
    makeLantern(side * 5.3, 2.7, 0);

    // Saloon Sign
    const sign = makeSignBoard('LAST CHANCE', '★ SALOON ★', 4.4, 1.0);
    sign.position.set(side * 7.36, 3.5, 0);
    sign.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(sign);

    // Barrels & Kegs
    const barrels = makeWhiskeyBarrels(side, 6.7, -3.0);
    group.add(barrels);

    // Hitching rail & 2 Tied Horses!
    const hitch = makeHitchingRail(side, 1.8, 3.6);
    group.add(hitch);
    const horse1 = makeWesternHorse({ variant: 0, pose: 'hitched', side }); // Chestnut
    horse1.position.set(side * 6.0, 0.14, 0.8);
    horse1.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(horse1);
    animals.push(horse1);

    const horse2 = makeWesternHorse({ variant: 4, pose: 'hitched', side }); // Dappled Grey
    horse2.position.set(side * 6.0, 0.14, 2.8);
    horse2.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(horse2);
    animals.push(horse2);

    // Cowboys: 1 tipping hat in greeting, 1 leaning on post!
    const cowboy1 = makeCowboy({ variant: 2, pose: 'tipping_hat', side });
    cowboy1.position.set(side * 5.8, 0.14, -1.2);
    cowboy1.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(cowboy1);
    people.push(cowboy1);

    const cowboy2 = makeCowboy({ variant: 4, pose: 'leaning', side });
    cowboy2.position.set(side * 5.8, 0.14, 4.0);
    cowboy2.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(cowboy2);
    people.push(cowboy2);

  } else if (slot === 4) {
    // ═════════════════════════════════════════════════════════════════
    // SEGMENT 4: "WESTERN WINDMILL & WATER STATION" (avec abreuvoir)
    // ═════════════════════════════════════════════════════════════════
    // Wooden open corral fence alongside boardwalk
    for (const z of [-4.5, -1.5, 1.5, 4.5]) {
      box(group, WOOD_DARK, side * 7.4, 0.7, z, 0.16, 1.4, 0.16);
    }
    for (const y of [0.4, 0.8, 1.2]) {
      box(group, WOOD_RUSTIC, side * 7.4, y, 0, 0.08, 0.12, 9.2);
    }

    // Tall Windmill with rotating blades
    const windmill = makeWindmill(side, 10.2, -1.8);
    group.add(windmill);
    if (windmill.userData.windmills) {
      windmills.push(...windmill.userData.windmills);
    }

    // Wooden Water Tower
    const waterTower = makeWaterTower(side, 10.5, 2.6);
    group.add(waterTower);

    // Large water trough on the boardwalk edge
    const trough = makeWaterTrough(side, 0);
    group.add(trough);

    // Horse drinking from trough!
    const horse = makeWesternHorse({ variant: 3, pose: 'drinking', side }); // Palomino
    horse.position.set(side * 5.8, 0.14, 0);
    horse.rotation.y = side === 1 ? Math.PI : 0;
    group.add(horse);
    animals.push(horse);

    // Cowboy leaning on the fence watching his horse
    const cowboy = makeCowboy({ variant: 1, pose: 'leaning', side });
    cowboy.position.set(side * 6.6, 0.14, 2.0);
    cowboy.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(cowboy);
    people.push(cowboy);

  } else if (slot === 5) {
    // ═════════════════════════════════════════════════════════════════
    // SEGMENT 5: "THE SILVER SPUR SALOON" (Grand Saloon droit)
    // ═════════════════════════════════════════════════════════════════
    const h = 5.2;
    box(group, WOOD_CEDAR, side * 9.8, h / 2, 0, 4.8, h, 9.8);
    // False front
    box(group, WOOD_SALOON_GOLD, side * 7.42, h + 0.5, 0, 0.16, 1.0, 5.8);

    // Veranda & Balcony
    for (const z of [-4.2, 0, 4.2]) {
      box(group, WOOD_DARK, side * 5.3, 1.5, z, 0.18, 3.0, 0.18);
    }
    box(group, WOOD_CEDAR, side * 6.35, 3.1, 0, 2.2, 0.20, 9.8);
    box(group, WOOD_LIGHT, side * 5.3, 3.6, 0, 0.08, 0.80, 8.6); // railing

    // Swinging doors & lanterns
    const doors = makeBatwingDoors(side, 7.38, 1.1, 0);
    group.add(doors);
    makeLantern(side * 5.3, 2.8, -1.2);
    makeLantern(side * 5.3, 2.8, 1.2);

    // Saloon Sign
    const sign = makeSignBoard('THE SILVER SPUR', 'FINE ALES & LIQUOR', 4.5, 1.0);
    sign.position.set(side * 7.36, 3.6, 0);
    sign.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(sign);

    // Hitched Horse
    const hitch = makeHitchingRail(side, 2.4, 2.8);
    group.add(hitch);
    const horse = makeWesternHorse({ variant: 1, pose: 'hitched', side }); // Bay
    horse.position.set(side * 6.0, 0.14, 2.4);
    horse.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(horse);
    animals.push(horse);

    // 2 Cowboys: 1 waving at the racers, 1 sitting on a chair
    const cowboy1 = makeCowboy({ variant: 5, pose: 'waving', side });
    cowboy1.position.set(side * 5.8, 0.14, -1.8);
    cowboy1.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(cowboy1);
    people.push(cowboy1);

    const cowboy2 = makeCowboy({ variant: 0, pose: 'sitting', side });
    cowboy2.position.set(side * 6.5, 0.14, 0.9);
    cowboy2.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(cowboy2);
    people.push(cowboy2);

  } else if (slot === 6) {
    // ═════════════════════════════════════════════════════════════════
    // SEGMENT 6: "DUST CREEK BANK & ASSAY OFFICE"
    // ═════════════════════════════════════════════════════════════════
    const h = 4.6;
    box(group, STONE_FOUNDATION, side * 9.8, h / 2, 0, 4.8, h, 9.8);
    // Classical bank pediment
    box(group, WOOD_BARN_TRIM, side * 7.42, h + 0.4, 0, 0.18, 0.8, 6.0);
    // Stone pilasters
    for (const z of [-3.8, -1.6, 1.6, 3.8]) {
      box(group, STONE_BRICK, side * 7.39, h / 2, z, 0.14, h, 0.42);
    }

    // Heavy iron-barred windows
    for (const z of [-2.7, 2.7]) {
      box(group, IRON_BLACK, side * 7.39, 1.8, z, 0.08, 1.4, 1.2);
      box(group, makeWindowMat(), side * 7.37, 1.8, z, 0.05, 1.2, 1.0);
      for (const dz of [-0.3, 0, 0.3]) {
        box(group, IRON_BLACK, side * 7.35, 1.8, z + dz, 0.04, 1.25, 0.04);
      }
    }

    // Heavy reinforced bank door
    box(group, WOOD_DARK, side * 7.40, 1.2, 0, 0.08, 2.4, 1.4);
    box(group, BRASS_GOLD, side * 7.35, 1.2, -0.4, 0.05, 0.10, 0.06);

    // Bank Sign
    const sign = makeSignBoard('DUST CREEK BANK', 'EST. 1872 · GOLD & SILVER', 4.5, 1.0);
    sign.position.set(side * 7.36, 3.8, 0);
    sign.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(sign);

    // Armed Guard / Deputy Cowboy standing watch
    const guard = makeCowboy({ variant: 2, pose: 'sheriff', side });
    guard.position.set(side * 5.8, 0.14, -0.8);
    guard.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(guard);
    people.push(guard);

  } else if (slot === 7) {
    // ═════════════════════════════════════════════════════════════════
    // SEGMENT 7: "BLACKSMITH & FORGE" (avec cheval en attente)
    // ═════════════════════════════════════════════════════════════════
    const h = 4.0;
    // Semi-open timber workshop
    box(group, WOOD_RUSTIC, side * 9.8, h / 2, 0, 4.8, h, 9.8);
    // Brick forge chimney
    box(group, STONE_BRICK, side * 8.0, h / 2 + 0.6, -3.2, 1.6, h + 1.2, 1.6);
    // Anvil on tree stump
    box(group, WOOD_DARK, side * 6.5, 0.28, -1.0, 0.45, 0.56, 0.45); // stump
    box(group, IRON_BLACK, side * 6.5, 0.66, -1.0, 0.32, 0.22, 0.65); // anvil body
    box(group, IRON_BLACK, side * 6.5, 0.66, -0.6, 0.16, 0.16, 0.24); // horn

    // Blacksmith Sign
    const sign = makeSignBoard('BLACKSMITH', 'HORSESHOEING & WAGONS', 4.4, 1.0);
    sign.position.set(side * 7.36, 3.2, 0);
    sign.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(sign);

    // 2 Wagon wheels leaning on wall
    const wheel1 = makeWagonWheel(side, 7.35, 0.6, 1.6);
    const wheel2 = makeWagonWheel(side, 7.35, 0.6, 2.6);
    group.add(wheel1, wheel2);

    // Hitched Horse waiting to be shoed!
    const hitch = makeHitchingRail(side, 2.2, 2.8);
    group.add(hitch);
    const horse = makeWesternHorse({ variant: 0, pose: 'hitched', side }); // Chestnut
    horse.position.set(side * 6.0, 0.14, 2.2);
    horse.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(horse);
    animals.push(horse);

    // Blacksmith Cowboy with leather apron
    const blacksmith = makeCowboy({ variant: 1, pose: 'standing', side });
    blacksmith.position.set(side * 5.8, 0.14, -1.0);
    blacksmith.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(blacksmith);
    people.push(blacksmith);

  } else if (slot === 8) {
    // ═════════════════════════════════════════════════════════════════
    // SEGMENT 8: "DUST CREEK GRAND HOTEL"
    // ═════════════════════════════════════════════════════════════════
    const h = 5.4;
    box(group, WOOD_PLUM, side * 9.8, h / 2, 0, 4.8, h, 9.8);
    // Veranda & Balcony
    for (const z of [-4.2, -1.4, 1.4, 4.2]) {
      box(group, WOOD_BARN_TRIM, side * 5.3, 1.6, z, 0.18, 3.2, 0.18);
    }
    box(group, WOOD_LIGHT, side * 6.35, 3.2, 0, 2.2, 0.20, 9.8);
    box(group, WOOD_BARN_TRIM, side * 5.3, 3.7, 0, 0.08, 0.85, 8.6); // balcony rail

    // Hotel Sign
    const sign = makeSignBoard('DUST CREEK HOTEL', 'ROOMS & BOARD · DINING', 4.6, 1.1);
    sign.position.set(side * 7.36, 3.8, 0);
    sign.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(sign);

    // Hitched Horse
    const hitch = makeHitchingRail(side, -2.2, 2.6);
    group.add(hitch);
    const horse = makeWesternHorse({ variant: 4, pose: 'hitched', side }); // Grey/White
    horse.position.set(side * 6.0, 0.14, -2.2);
    horse.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(horse);
    animals.push(horse);

    // Cowboy guest waving from veranda
    const cowboy = makeCowboy({ variant: 0, pose: 'waving', side });
    cowboy.position.set(side * 5.8, 0.14, 1.4);
    cowboy.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(cowboy);
    people.push(cowboy);

  } else {
    // ═════════════════════════════════════════════════════════════════
    // SEGMENT 9: "HORSE PADDOCK & CORRAL" (Écurie / Paddock ouvert)
    // ═════════════════════════════════════════════════════════════════
    // 3-Rail wooden corral fence enclosing paddock
    for (const z of [-4.5, -1.5, 1.5, 4.5]) {
      box(group, WOOD_DARK, side * 7.4, 0.7, z, 0.16, 1.4, 0.16);
      box(group, WOOD_DARK, side * 11.2, 0.7, z, 0.16, 1.4, 0.16);
    }
    for (const y of [0.4, 0.8, 1.2]) {
      box(group, WOOD_RUSTIC, side * 7.4, y, 0, 0.08, 0.12, 9.2);
      box(group, WOOD_RUSTIC, side * 11.2, y, 0, 0.08, 0.12, 9.2);
    }

    // Small open wooden horse shelter in the background
    box(group, WOOD_CEDAR, side * 10.4, 1.8, 0, 2.2, 2.4, 4.2);
    box(group, TIN_ROOF, side * 10.4, 3.1, 0, 2.6, 0.16, 4.6);
    box(group, HAY_GOLD, side * 9.8, 0.22, 0, 1.2, 0.3, 3.6);

    // Stacks of hay bales
    const bales = makeHayBales(side, 6.6, 3.0, 3);
    group.add(bales);

    // Water trough
    const trough = makeWaterTrough(side, -2.4);
    group.add(trough);

    // 2 Horses in the corral!
    const horse1 = makeWesternHorse({ variant: 5, pose: 'corral', side }); // Pinto paint
    horse1.position.set(side * 8.8, 0.14, -1.2);
    horse1.rotation.y = side * 0.4;
    group.add(horse1);
    animals.push(horse1);

    const horse2 = makeWesternHorse({ variant: 1, pose: 'drinking', side }); // Bay drinking
    horse2.position.set(side * 5.8, 0.14, -2.4);
    horse2.rotation.y = side === 1 ? Math.PI : 0;
    group.add(horse2);
    animals.push(horse2);

    // Cowboy sitting on the corral top rail watching the riders!
    const cowboy = makeCowboy({ variant: 3, pose: 'sitting', side });
    cowboy.position.set(side * 6.6, 0.85, 1.2);
    cowboy.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(cowboy);
    people.push(cowboy);
  }

  // Position in the 110m loop
  group.position.x = 0;
  group.position.z = 6 - index * 11 + (side === 1 ? -4 : 0);
  group.userData.speedFactor = 1;

  if (people.length) group.userData.people = people;
  if (animals.length) group.userData.animals = animals;
  if (windmills.length) group.userData.windmills = windmills;
  if (nightLights.length) group.userData.westernLights = nightLights;

  return group;
}

/** Turns the town's windows and porch lamps on gradually as dusk reaches Dust Creek. */
export function updateWesternLights(lights = [], progress = 0, time = 0, reducedMotion = false) {
  if (!lights) return;
  for (const light of lights) {
    if (light?.material) {
      light.material.emissiveIntensity = westernNightLightIntensity(light.kind, progress, time, reducedMotion);
    }
  }
}

// ───────────────────────────────────────────────────────────────────
// OBSTACLES (clôture basse sautante & caisses hautes)
// ───────────────────────────────────────────────────────────────────

export function westernObstacle(kind) {
  const group = new THREE.Group();
  const wood = material(0x995b32), dark = material(0x49312a), brass = material(0xe6b85c);
  if (kind === 'barrier') {
    // Low fence across two lanes: identical jump clearance
    for (const x of [-1.75, 0, 1.75]) box(group, dark, x, 0.48, 0, 0.22, 0.96, 0.3);
    for (const y of [0.32, 0.83]) box(group, wood, 0, y, 0, 4.02, 0.23, 0.24);
    for (const x of [-1.65, 1.65]) {
      const cap = box(group, brass, x, 1.02, 0, 0.28, 0.13, 0.32);
      cap.rotation.z = 0.1;
    }
  } else {
    // Tall cargo stack: dodge rather than jump
    for (const y of [0.42, 1.24]) {
      box(group, wood, 0, y, 0, 0.87, 0.8, 0.8);
      for (const x of [-0.32, 0.32]) box(group, dark, x, y, 0.42, 0.1, 0.8, 0.05);
      for (const dy of [-0.3, 0.3]) box(group, brass, 0, y + dy, 0.43, 0.86, 0.08, 0.05);
      const brace = box(group, dark, 0, y, 0.45, 0.08, 0.9, 0.05);
      brace.rotation.z = -0.75;
    }
  }
  return group;
}
