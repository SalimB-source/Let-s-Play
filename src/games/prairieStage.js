import * as THREE from 'three';

const mat = (color, roughness = 0.9) => new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });

function box(parent, material, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

// ───────────────────────────────────────────────────────────────────
// FARM ANIMALS — low-poly voxel style, baked into static scenery
// ───────────────────────────────────────────────────────────────────

function makeCow() {
  const group = new THREE.Group();
  const white = mat(0xf5f1e8);
  const black = mat(0x2b2b2b);
  const pink = mat(0xe9a0a0);
  const horn = mat(0xe8dcc0);
  const darkHoof = mat(0x3a332e);

  // body
  box(group, white, 0, 0.62, 0, 1.15, 0.72, 1.65);
  // black spots
  box(group, black, 0.18, 0.78, 0.35, 0.42, 0.38, 0.55);
  box(group, black, -0.22, 0.72, -0.45, 0.38, 0.32, 0.45);
  box(group, black, 0.25, 0.65, -0.1, 0.22, 0.22, 0.22);

  // head
  box(group, white, 0, 0.78, -1.05, 0.62, 0.52, 0.62);
  box(group, pink, 0, 0.62, -1.38, 0.38, 0.22, 0.12);
  box(group, black, -0.14, 0.78, -1.32, 0.08, 0.08, 0.02);
  box(group, black, 0.14, 0.78, -1.32, 0.08, 0.08, 0.02);
  // ears
  box(group, white, -0.38, 0.85, -1.0, 0.22, 0.12, 0.08);
  box(group, white, 0.38, 0.85, -1.0, 0.22, 0.12, 0.08);
  box(group, pink, -0.38, 0.85, -1.02, 0.12, 0.06, 0.02);
  box(group, pink, 0.38, 0.85, -1.02, 0.12, 0.06, 0.02);
  // horns
  box(group, horn, -0.22, 1.08, -1.05, 0.08, 0.18, 0.08);
  box(group, horn, 0.22, 1.08, -1.05, 0.08, 0.18, 0.08);

  // legs
  for (const [x, z] of [[-0.38, 0.55], [0.38, 0.55], [-0.38, -0.55], [0.38, -0.55]]) {
    box(group, white, x, 0.28, z, 0.18, 0.56, 0.18);
    box(group, darkHoof, x, 0.06, z, 0.19, 0.12, 0.19);
  }
  // udder
  box(group, pink, 0, 0.22, 0.15, 0.42, 0.18, 0.32);
  // tail
  const tail = box(group, white, 0, 0.62, 0.92, 0.1, 0.45, 0.1);
  tail.rotation.x = 0.25;
  box(group, black, 0, 0.28, 1.02, 0.18, 0.18, 0.18);

  group.userData.isAnimal = true;
  group.userData.animalType = 'cow';
  group.userData.bob = Math.random() * Math.PI * 2;
  group.userData.head = group.children.find(c => c.position.z < -1);
  return group;
}

function makeSheep() {
  const group = new THREE.Group();
  const wool = mat(0xfaf6f0);
  const woolShade = mat(0xe8e0d0);
  const face = mat(0x2e2e2e);
  const legMat = mat(0x3d352f);

  // fluffy body — cluster of boxes
  const bodyOffsets = [
    [0, 0.58, 0, 0.9, 0.6, 0.95],
    [-0.35, 0.55, 0.2, 0.5, 0.5, 0.5],
    [0.35, 0.55, 0.2, 0.5, 0.5, 0.5],
    [-0.3, 0.58, -0.25, 0.45, 0.5, 0.5],
    [0.3, 0.58, -0.25, 0.45, 0.5, 0.5],
    [0, 0.82, 0, 0.7, 0.35, 0.7],
  ];
  bodyOffsets.forEach(([x, y, z, w, h, d], i) => {
    box(group, i % 2 ? woolShade : wool, x, y, z, w, h, d);
  });

  // head black
  box(group, face, 0, 0.62, -0.68, 0.38, 0.38, 0.42);
  box(group, face, -0.22, 0.62, -0.6, 0.12, 0.12, 0.1);
  box(group, face, 0.22, 0.62, -0.6, 0.12, 0.12, 0.1);
  // ears floppy
  box(group, face, -0.28, 0.58, -0.55, 0.18, 0.08, 0.12);
  box(group, face, 0.28, 0.58, -0.55, 0.18, 0.08, 0.12);

  // legs
  for (const [x, z] of [[-0.28, 0.32], [0.28, 0.32], [-0.28, -0.32], [0.28, -0.32]]) {
    box(group, legMat, x, 0.22, z, 0.12, 0.44, 0.12);
  }

  group.userData.isAnimal = true;
  group.userData.animalType = 'sheep';
  group.userData.bob = Math.random() * Math.PI * 2;
  return group;
}

function makeChicken(variant = 0) {
  const group = new THREE.Group();
  const feather = mat(variant === 0 ? 0xf5f1e8 : variant === 1 ? 0xc96a3a : 0x3d2f2a);
  const beakMat = mat(0xf5c542);
  const combMat = mat(0xd93a2b);
  const legMat = mat(0xe8a73a);

  // body
  box(group, feather, 0, 0.32, 0, 0.42, 0.42, 0.55);
  // head
  box(group, feather, 0, 0.58, -0.28, 0.28, 0.28, 0.28);
  box(group, beakMat, 0, 0.52, -0.48, 0.12, 0.08, 0.16);
  // comb
  box(group, combMat, 0, 0.78, -0.28, 0.08, 0.18, 0.18);
  box(group, combMat, 0, 0.75, -0.18, 0.06, 0.12, 0.06);
  // tail
  box(group, feather, 0, 0.42, 0.32, 0.18, 0.22, 0.12);
  // wings
  box(group, feather, -0.24, 0.34, 0, 0.06, 0.18, 0.32);
  box(group, feather, 0.24, 0.34, 0, 0.06, 0.18, 0.32);
  // legs
  box(group, legMat, -0.1, 0.08, 0, 0.05, 0.16, 0.05);
  box(group, legMat, 0.1, 0.08, 0, 0.05, 0.16, 0.05);

  group.userData.isAnimal = true;
  group.userData.animalType = 'chicken';
  group.userData.bob = Math.random() * Math.PI * 2;
  return group;
}

function makePig() {
  const group = new THREE.Group();
  const pink = mat(0xe8a0a0);
  const pinkDark = mat(0xd68a8a);
  const nose = mat(0xc97a7a);
  const hoof = mat(0x4a3a3a);

  box(group, pink, 0, 0.42, 0, 0.95, 0.55, 1.15);
  box(group, pink, 0, 0.52, -0.68, 0.52, 0.42, 0.48);
  box(group, nose, 0, 0.42, -0.95, 0.32, 0.18, 0.08);
  box(group, mat(0x2b2b2b), -0.08, 0.45, -0.98, 0.05, 0.05, 0.02);
  box(group, mat(0x2b2b2b), 0.08, 0.45, -0.98, 0.05, 0.05, 0.02);
  // ears
  box(group, pinkDark, -0.22, 0.78, -0.6, 0.16, 0.16, 0.08);
  box(group, pinkDark, 0.22, 0.78, -0.6, 0.16, 0.16, 0.08);
  // legs
  for (const [x, z] of [[-0.32, 0.38], [0.32, 0.38], [-0.32, -0.38], [0.32, -0.38]]) {
    box(group, pink, x, 0.18, z, 0.16, 0.36, 0.16);
    box(group, hoof, x, 0.04, z, 0.17, 0.08, 0.17);
  }
  // curly tail
  const tail = box(group, pinkDark, 0, 0.52, 0.62, 0.08, 0.08, 0.22);
  tail.rotation.z = Math.PI / 4;

  group.userData.isAnimal = true;
  group.userData.animalType = 'pig';
  group.userData.bob = Math.random() * Math.PI * 2;
  return group;
}

function makeScarecrow() {
  const group = new THREE.Group();
  const wood = mat(0x6b4a32);
  const straw = mat(0xf0cc72);
  const clothBlue = mat(0x4a7ab5);
  const clothBrown = mat(0x8a5a3a);
  const hatMat = mat(0x3a2a1e);

  // post
  box(group, wood, 0, 0.85, 0, 0.08, 1.7, 0.08);
  // arms
  box(group, wood, 0, 1.15, 0, 1.2, 0.08, 0.08);
  // body straw
  box(group, straw, 0, 1.15, 0, 0.42, 0.42, 0.22);
  box(group, clothBlue, 0, 1.15, 0, 0.52, 0.52, 0.28);
  // head burlap
  box(group, straw, 0, 1.62, 0, 0.38, 0.38, 0.38);
  box(group, mat(0x2b2b2b), -0.08, 1.65, 0.2, 0.06, 0.06, 0.02);
  box(group, mat(0x2b2b2b), 0.08, 1.65, 0.2, 0.06, 0.06, 0.02);
  // hat
  box(group, hatMat, 0, 1.92, 0, 0.58, 0.12, 0.58);
  box(group, hatMat, 0, 2.08, 0, 0.38, 0.32, 0.38);

  // arms straw hanging
  box(group, straw, -0.55, 1.08, 0, 0.18, 0.22, 0.12);
  box(group, straw, 0.55, 1.08, 0, 0.18, 0.22, 0.12);

  group.userData.isAnimal = false;
  group.userData.bob = Math.random() * Math.PI * 2;
  return group;
}

// ───────────────────────────────────────────────────────────────────
// CHAMP DE BLÉ DÉTAILLÉ
// ───────────────────────────────────────────────────────────────────

export function prairieField(index, side) {
  const group = new THREE.Group();
  const strawLight = new THREE.MeshStandardMaterial({ color: 0xf0cc72, roughness: 1 });
  const strawMid = new THREE.MeshStandardMaterial({ color: 0xe0b649, roughness: 1 });
  const strawDark = new THREE.MeshStandardMaterial({ color: 0xc99a3a, roughness: 1 });
  const soilMat = new THREE.MeshStandardMaterial({ color: 0xa89a4a, roughness: 1 });
  const soilDark = new THREE.MeshStandardMaterial({ color: 0x8f7f3a, roughness: 1 });
  const soilLight = new THREE.MeshStandardMaterial({ color: 0xb8a95a, roughness: 1 });
  const wood = mat(0x6b4a32);
  const flowerRed = mat(0xd93a2b);
  const flowerBlue = mat(0x4a7de8);
  const flowerYellow = mat(0xf2d94e);
  const flowerWhite = mat(0xfaf6f0);
  const weedGreen = mat(0x6a8a3a);
  const weedDark = mat(0x4a6a2a);

  const dummy = new THREE.Object3D();
  const animals = [];

  // --- Sol de base avec variation ---
  const baseSoil = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.18, 12.5), soilMat);
  baseSoil.position.set(side * 11.8, -0.04, 0);
  group.add(baseSoil);

  const edgeSoil = new THREE.Mesh(new THREE.BoxGeometry(15.7, 0.08, 12.7), soilDark);
  edgeSoil.position.set(side * 11.8, -0.13, 0);
  group.add(edgeSoil);

  // Sillons labourés — 12 lignes pour lire la profondeur du champ
  for (let i = 0; i < 12; i++) {
    const z = -5.5 + i * 1.0;
    const furrow = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.04, 0.08), i % 2 ? soilLight : soilDark);
    furrow.position.set(side * 11.8, 0.02, z);
    furrow.rotation.y = (Math.random() - 0.5) * 0.03;
    group.add(furrow);
    // petit bourrelet de terre
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.02, 0.18), soilLight);
    ridge.position.set(side * 11.8, 0.05, z + 0.12);
    group.add(ridge);
  }

  // --- Blé dense : 380 tiges + 380 épis, avec variation de hauteur et inclinaison ---
  const WHEAT_COUNT = 380;
  const stalksA = new THREE.InstancedMesh(new THREE.BoxGeometry(0.055, 0.85, 0.055), strawMid, Math.floor(WHEAT_COUNT * 0.6));
  const stalksB = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.85, 0.05), strawLight, Math.floor(WHEAT_COUNT * 0.4));
  const earsA = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.14), strawLight, Math.floor(WHEAT_COUNT * 0.6));
  const earsB = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.13), strawDark, Math.floor(WHEAT_COUNT * 0.4));

  let idxA = 0, idxB = 0;
  for (let i = 0; i < WHEAT_COUNT; i++) {
    const col = i % 20;
    const row = Math.floor(i / 20);
    const isA = i % 3 !== 0;
    // position dans le champ, avec jitter naturel
    const jitterX = (Math.sin(i * 12.7 + index * 3.1) * 0.5 + (Math.random() - 0.5) * 0.3);
    const jitterZ = (Math.cos(i * 7.3 + index) * 0.4 + (Math.random() - 0.5) * 0.25);
    const x = side * (6.2 + col * 0.58 + jitterX * 0.3) + (side > 0 ? 2 : -2) + jitterX * 0.15;
    const z = row * 0.62 - 5.8 + jitterZ;
    const height = 0.65 + Math.sin(i * 1.7 + index) * 0.15 + Math.random() * 0.55 + (col < 2 ? 0.25 : 0); // bordure plus haute
    const leanX = (Math.random() - 0.5) * 0.18;
    const leanZ = (Math.random() - 0.5) * 0.18 + side * 0.08; // penche légèrement vers l'extérieur

    dummy.position.set(x, height / 2, z);
    dummy.rotation.set(leanX, 0, leanZ);
    dummy.scale.set(1, height / 0.85, 1);
    dummy.updateMatrix();
    if (isA) {
      stalksA.setMatrixAt(idxA, dummy.matrix);
      dummy.position.y = height + 0.08;
      dummy.scale.set(0.7, 1.9 + Math.random() * 0.6, 0.7);
      dummy.updateMatrix();
      earsA.setMatrixAt(idxA, dummy.matrix);
      idxA++;
    } else {
      stalksB.setMatrixAt(idxB, dummy.matrix);
      dummy.position.y = height + 0.06;
      dummy.scale.set(0.65, 1.7 + Math.random() * 0.5, 0.65);
      dummy.updateMatrix();
      earsB.setMatrixAt(idxB, dummy.matrix);
      idxB++;
    }
  }
  group.add(stalksA, stalksB, earsA, earsB);

  // Bordure haute plus dense côté piste — effet de champ qui déborde
  const BORDER_COUNT = 70;
  const borderStalks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 1.0, 0.06), strawDark, BORDER_COUNT);
  const borderEars = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.16), strawLight, BORDER_COUNT);
  for (let i = 0; i < BORDER_COUNT; i++) {
    const x = side * (5.6 + Math.random() * 0.5);
    const z = -6 + (i / BORDER_COUNT) * 12 + (Math.random() - 0.5) * 0.4;
    const h = 1.1 + Math.random() * 0.6;
    dummy.position.set(x, h / 2, z);
    dummy.rotation.set((Math.random() - 0.5) * 0.25, 0, side * 0.15 + (Math.random() - 0.5) * 0.15);
    dummy.scale.set(1, h, 1);
    dummy.updateMatrix();
    borderStalks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = h + 0.12;
    dummy.scale.set(0.8, 2.2, 0.8);
    dummy.updateMatrix();
    borderEars.setMatrixAt(i, dummy.matrix);
  }
  group.add(borderStalks, borderEars);

  // --- Fleurs sauvages et mauvaises herbes ---
  // Coquelicots rouges, bleuets, marguerites, pissenlits
  const flowerCount = 14 + (index % 5);
  for (let i = 0; i < flowerCount; i++) {
    const fx = side * (7.5 + Math.random() * 6.5);
    const fz = -5 + Math.random() * 10;
    const kind = Math.floor(Math.random() * 5);
    const stemH = 0.25 + Math.random() * 0.35;
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.03, stemH, 0.03), weedGreen);
    stem.position.set(fx, stemH / 2, fz);
    group.add(stem);
    let headMat = flowerRed;
    let headSize = 0.14;
    if (kind === 1) { headMat = flowerBlue; headSize = 0.11; }
    if (kind === 2) { headMat = flowerYellow; headSize = 0.13; }
    if (kind === 3) { headMat = flowerWhite; headSize = 0.12; }
    if (kind === 4) { headMat = flowerYellow; headSize = 0.09; } // petit pissenlit
    const head = new THREE.Mesh(new THREE.SphereGeometry(headSize, 5, 4), headMat);
    head.position.set(fx, stemH + 0.08, fz);
    head.scale.y = 0.7;
    group.add(head);
    if (kind === 3) { // marguerite cœur jaune
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 3), flowerYellow);
      center.position.set(fx, stemH + 0.1, fz + 0.04);
      group.add(center);
    }
  }

  // Touffes d'herbe verte / mauvaises herbes basses
  for (let i = 0; i < 10; i++) {
    const gx = side * (6.5 + Math.random() * 7);
    const gz = -5.5 + Math.random() * 11;
    const tuft = new THREE.Group();
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25 + Math.random() * 0.25, 0.04), b % 2 ? weedDark : weedGreen);
      blade.position.set((Math.random() - 0.5) * 0.15, blade.geometry.parameters.height / 2, (Math.random() - 0.5) * 0.15);
      blade.rotation.z = (Math.random() - 0.5) * 0.4;
      blade.rotation.x = (Math.random() - 0.5) * 0.4;
      tuft.add(blade);
    }
    tuft.position.set(gx, 0, gz);
    group.add(tuft);
  }

  // --- Clôture en bois côté piste (tous les 2 champs) ---
  if (index % 2 === 0) {
    const fenceZStart = -5.5;
    for (let f = 0; f < 6; f++) {
      const fz = fenceZStart + f * 2.0;
      const fx = side * 5.25;
      // poteau
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.12), wood);
      post.position.set(fx, 0.42, fz);
      group.add(post);
      if (f < 5) {
        // lisses horizontales
        const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 2.05), wood);
        rail1.position.set(fx + side * 0.04, 0.62, fz + 1.0);
        group.add(rail1);
        const rail2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 2.05), wood);
        rail2.position.set(fx + side * 0.04, 0.32, fz + 1.0);
        group.add(rail2);
      }
    }
  }

  // --- Animaux de ferme — répartition selon l'index pour varier ---
  const rand = (n) => {
    // pseudo-aléatoire stable par index
    const x = Math.sin(index * 127.1 + n * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  const placeAnimal = (animalGroup, offsetX, offsetZ, scale = 1, rotY = 0) => {
    animalGroup.position.set(side * offsetX, 0, offsetZ);
    animalGroup.scale.setScalar(scale);
    animalGroup.rotation.y = rotY;
    group.add(animalGroup);
    animals.push(animalGroup);
  };

  const pattern = index % 6;
  if (pattern === 0) {
    // 2 vaches qui broutent
    const cow1 = makeCow();
    placeAnimal(cow1, 10.2 + rand(1) * 1.5, -1.5 + rand(2) * 2, 1, rand(3) * 0.6 - 0.3);
    const cow2 = makeCow();
    placeAnimal(cow2, 12.0 + rand(4) * 1.2, 2.0 + rand(5) * 2, 0.92, rand(6) * 0.8 - 0.4);
    // quelques poules autour
    for (let c = 0; c < 2; c++) {
      const chick = makeChicken(c % 3);
      placeAnimal(chick, 9.5 + rand(10 + c) * 2.5, -0.5 + rand(20 + c) * 3, 0.9, rand(30 + c) * Math.PI * 2);
    }
  } else if (pattern === 1) {
    // Troupeau de moutons
    for (let s = 0; s < 4; s++) {
      const sheep = makeSheep();
      placeAnimal(sheep, 9.8 + (s % 2) * 1.6 + rand(s) * 0.6, -3 + s * 1.6 + rand(s + 10) * 0.5, 0.95 + rand(s + 20) * 0.15, rand(s + 30) * 0.5 - 0.25);
    }
    const chicken = makeChicken(0);
    placeAnimal(chicken, 11.5, 0.5, 1, 0.8);
  } else if (pattern === 2) {
    // Basse-cour : poules + coq + cochon
    for (let c = 0; c < 5; c++) {
      const ch = makeChicken(c % 3);
      placeAnimal(ch, 9.0 + (c % 3) * 1.1 + rand(c) * 0.4, -2.5 + Math.floor(c / 3) * 1.4 + rand(c + 5) * 0.4, 0.85 + rand(c + 15) * 0.2, rand(c + 25) * Math.PI * 2);
    }
    const pig = makePig();
    placeAnimal(pig, 12.2 + rand(1) * 0.8, 1.5 + rand(2) * 1, 1, rand(3) * 0.6);
  } else if (pattern === 3) {
    // Mix vache + moutons + cochon
    const cow = makeCow();
    placeAnimal(cow, 10.5 + rand(1) * 1, -2 + rand(2) * 1, 1, -0.2);
    for (let s = 0; s < 2; s++) {
      const sheep = makeSheep();
      placeAnimal(sheep, 12.0 + s * 1.0 + rand(s) * 0.3, 1.2 + rand(s + 10) * 0.8, 0.9, rand(s + 20) * 0.6 - 0.3);
    }
    const pig = makePig();
    placeAnimal(pig, 9.2 + rand(30) * 0.8, 0.2 + rand(31) * 0.8, 0.95, 0.5);
  } else if (pattern === 4) {
    // Vaches + épouvantail
    const cow = makeCow();
    placeAnimal(cow, 11.0, 0, 1, 0.1);
    const cow2 = makeCow();
    placeAnimal(cow2, 13.0 + rand(2) * 0.6, -2.5, 0.88, -0.4);
    const scare = makeScarecrow();
    scare.position.set(side * 9.0, 0, 3.2);
    scare.rotation.y = side * 0.2;
    group.add(scare);
    // poules picorent autour de l'épouvantail
    for (let c = 0; c < 2; c++) {
      const ch = makeChicken(1);
      placeAnimal(ch, 8.5 + rand(c) * 1.5, 2.8 + rand(c + 10) * 1, 0.9, rand(c + 20) * Math.PI * 2);
    }
  } else {
    // 2 cochons + 3 poules
    for (let p = 0; p < 2; p++) {
      const pig = makePig();
      placeAnimal(pig, 10.0 + p * 1.8 + rand(p) * 0.5, -1.0 + rand(p + 10) * 2, 1, rand(p + 20) * 0.5);
    }
    for (let c = 0; c < 3; c++) {
      const ch = makeChicken(c % 3);
      placeAnimal(ch, 12.5 + rand(c + 30) * 1, -2 + c * 1.2, 0.9, rand(c + 40) * Math.PI * 2);
    }
  }

  // Petites bottes de paille décoratives éparses dans le champ
  if (index % 3 === 0) {
    const decoStraw = mat(0xd2ae53);
    const decoRope = mat(0x775c33);
    const smallBale = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.6), decoStraw);
    smallBale.position.set(side * (10 + rand(50) * 2), 0.275, -4 + rand(51) * 2);
    group.add(smallBale);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.62), decoRope);
    band.position.copy(smallBale.position);
    band.position.y += 0.05;
    group.add(band);
  }

  group.position.z = 6 - index * 10;
  group.userData.speedFactor = 1;
  group.userData.animals = animals;
  group.userData.fieldIndex = index;
  group.userData.side = side;

  return group;
}

export function prairieObstacle(kind) {
  const group = new THREE.Group();
  const straw = new THREE.MeshStandardMaterial({ color: 0xd2ae53, roughness: 1, flatShading: true });
  const strawLight = new THREE.MeshStandardMaterial({ color: 0xe2c06a, roughness: 1, flatShading: true });
  const rope = new THREE.MeshStandardMaterial({ color: 0x775c33, roughness: 1 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 1, flatShading: true });
  const width = kind === 'barrier' ? 4.02 : 0.9;
  const height = kind === 'barrier' ? 0.96 : 1.65;
  const bale = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.9), straw);
  bale.position.y = height / 2;
  group.add(bale);
  // détail paille qui dépasse
  const tuft = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.12, 0.95), strawLight);
  tuft.position.set(0, height + 0.02, 0);
  tuft.rotation.z = (Math.random() - 0.5) * 0.08;
  group.add(tuft);
  for (const x of [-width * 0.32, width * 0.32]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.075, height + 0.015, 0.925), rope);
    band.position.set(x, height / 2, 0);
    group.add(band);
  }
  // si haute pile, ajoute petite planche / paille supplémentaire
  if (kind !== 'barrier') {
    const extra = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.18, 0.85), wood);
    extra.position.set(0, height - 0.15, 0);
    extra.rotation.y = 0.15;
    group.add(extra);
    const topStraw = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), strawLight);
    topStraw.position.set(0, height + 0.12, 0);
    group.add(topStraw);
  }
  return group;
}
