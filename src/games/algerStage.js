import * as THREE from 'three';

const material = color => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });
function box(parent, mat, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

/**
 * Balustrade blanche de la corniche algéroise : trois piédestaux de pierre
 * reliés par deux lisses. Basse et franchissable d'un saut, même garde au
 * sol que la barrière du désert ou les tonneaux de la Costa Omertà.
 */
function whiteBalustrade() {
  const group = new THREE.Group();
  const stone = material(0xeee8da);
  const stoneShade = material(0xd8d0be);
  const iron = material(0x2c2c30);
  for (const x of [-1.62, 0, 1.62]) {
    box(group, stoneShade, x, 0.12, 0, 0.5, 0.24, 0.44);
    box(group, stone, x, 0.52, 0, 0.36, 0.56, 0.32);
    box(group, stoneShade, x, 0.86, 0, 0.48, 0.12, 0.42);
  }
  for (const y of [0.42, 0.78]) box(group, stone, 0, y, 0, 3.78, 0.14, 0.18);
  // Petits anneaux de fer forgé entre les piédestaux, esprit Belle Époque.
  for (const x of [-0.82, 0.82]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 4, 10), iron);
    ring.position.set(x, 0.6, 0);
    group.add(ring);
  }
  return group;
}

/**
 * Fontaine mauresque : bassin octogonal, colonne cannelée, bande de zellige
 * bleu et coupole. Haute : on la contourne, comme les cactus ou les cyprès.
 */
function moresqueFountain() {
  const group = new THREE.Group();
  const white = material(0xf2ede1);
  const shade = material(0xd9d2c0);
  const zellige = material(0x1d6f9c);
  const water = new THREE.MeshBasicMaterial({ color: 0x4fa8c9, transparent: true, opacity: 0.85 });
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.02, 0.42, 8), white);
  basin.position.y = 0.21;
  group.add(basin);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.1, 8), shade);
  lip.position.y = 0.44;
  group.add(lip);
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.04, 8), water);
  pool.position.y = 0.46;
  group.add(pool);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 1.05, 8), white);
  column.position.y = 1.0;
  group.add(column);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.16, 8), zellige);
  band.position.y = 1.12;
  group.add(band);
  const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.22, 0.22, 8), shade);
  capital.position.y = 1.62;
  group.add(capital);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), zellige);
  dome.position.y = 1.72;
  group.add(dome);
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 6), shade);
  finial.position.y = 2.06;
  group.add(finial);
  return group;
}

export function algerObstacle(kind) {
  return kind === 'barrier' ? whiteBalustrade() : moresqueFountain();
}

const SIGN_WORDS = ['CAFÉ ALGER', 'PÂTISSERIE', 'LIBRAIRIE', 'PHARMACIE', 'HÔTEL', 'BOULANGERIE'];
const FACADES = [0xf5f1e8, 0xece5d4, 0xf1ecdf, 0xe6dfcd];

// ── Vie du boulevard : passants et voitures stationnées ────────────────
const SKIN_TONES = [0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0x6b4226];
const CLOTHES = [0x2e4a62, 0x8a2f2f, 0x3a5a40, 0xd8d2c4, 0x4a3b6b, 0xc9a227, 0x37474f, 0xb3541e];
const HAIR_TONES = [0x1c1410, 0x2b1d12, 0x3d2914, 0x141414];
const CAR_COLORS = [0xe8e8e8, 0xcfd4d8, 0x8a2f2f, 0x2e4a62, 0xd9c9a8, 0x37474f, 0x9fb8c8, 0x5c5c60];

/**
 * Passant en voxel, à l'échelle du jeu : quatre poses — debout, marche,
 * gandoura longue, bras levé (salut ou téléphone). Les figures vivent sur
 * le trottoir, de chaque côté du boulevard.
 */
function streetFigure(index, pose) {
  const group = new THREE.Group();
  const skin = material(SKIN_TONES[index % SKIN_TONES.length]);
  const shirt = material(CLOTHES[index % CLOTHES.length]);
  const pants = material(CLOTHES[(index + 4) % CLOTHES.length]);
  const hair = material(HAIR_TONES[index % HAIR_TONES.length]);
  const shoes = material(0x2b2b30);
  // Jambes (légèrement enjambées pour la marche) et chaussures.
  const stride = pose === 1 ? 0.15 : 0;
  for (const s of [-1, 1]) {
    box(group, pants, s * 0.11, 0.44, s * stride, 0.17, 0.86, 0.2);
    box(group, shoes, s * 0.11, 0.07, s * stride + 0.04, 0.19, 0.14, 0.3);
  }
  if (pose === 2) {
    // Gandoura : robe ample qui masque les jambes.
    box(group, shirt, 0, 1.0, 0, 0.46, 1.22, 0.3);
    box(group, shirt, 0, 0.42, 0, 0.38, 0.28, 0.26);
  } else {
    box(group, shirt, 0, 1.16, 0, 0.44, 0.66, 0.28);
    box(group, pants, 0, 0.79, 0, 0.42, 0.2, 0.26);
  }
  // Bras : balancier de marche, ou bras levé vers la tête.
  const raised = pose === 3;
  for (const s of [-1, 1]) {
    const lift = raised && s === 1;
    const swing = pose === 1 ? s * 0.2 : 0;
    box(group, shirt, s * 0.29, lift ? 1.48 : 1.12, lift ? -0.06 : swing, 0.14, lift ? 0.56 : 0.62, 0.16);
    box(group, skin, s * 0.29, lift ? 1.82 : 0.72, lift ? -0.12 : swing, 0.13, 0.18, 0.15);
  }
  // Tête et cheveux.
  box(group, skin, 0, 1.65, 0, 0.27, 0.3, 0.27);
  box(group, hair, 0, 1.78, -0.02, 0.29, 0.12, 0.29);
  return group;
}

/**
 * Voiture stationnée le long du trottoir, parallèle à la chaussée :
 * caisse basse, habitacle vitré, quatre roues. La variante « taxi »
 * porte la bande jaune et le panneau de toit d'Alger.
 */
function parkedCar(index, variant) {
  const group = new THREE.Group();
  const taxi = variant === 'taxi';
  const body = material(taxi ? 0xf2f2f2 : CAR_COLORS[index % CAR_COLORS.length]);
  const dark = material(0x1e2226);
  const glass = material(0x2e3d46);
  const light = material(0xf4e7c2);
  const rear = material(0xb3402e);
  box(group, body, 0, 0.52, 0, 1.8, 0.5, 4.3);
  box(group, body, 0, 0.84, -1.32, 1.74, 0.16, 1.66);
  box(group, body, 0, 0.84, 1.42, 1.74, 0.16, 1.46);
  box(group, glass, 0, 1.06, 0.12, 1.58, 0.42, 2.0);
  box(group, body, 0, 1.32, 0.12, 1.66, 0.14, 2.1);
  for (const x of [-0.9, 0.9]) for (const z of [-1.34, 1.34]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 10), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.32, z);
    group.add(wheel);
  }
  for (const x of [-0.58, 0.58]) {
    box(group, light, x, 0.62, -2.16, 0.32, 0.16, 0.08);
    box(group, rear, x, 0.62, 2.16, 0.32, 0.16, 0.08);
  }
  if (taxi) {
    const stripe = material(0xf6c34a);
    for (const x of [-0.91, 0.91]) box(group, stripe, x, 0.52, 0, 0.05, 0.18, 3.6);
    box(group, light, 0, 1.5, 0.1, 0.5, 0.18, 0.28);
    box(group, dark, 0, 1.51, 0.1, 0.34, 0.1, 0.1);
  }
  return group;
}

/**
 * Immeuble haussmannien blanc d'Alger la Blanche : façade chaulée, étages
 * à hautes fenêtres, balcons de fer forgé, toiture d'ardoise à mansarde et
 * devanture de commerce peinte. Les deux rangées encadrent le boulevard —
 * avec leur trottoir animé de passants et bordé de voitures stationnées.
 */
export function algerBuilding(index, side) {
  const group = new THREE.Group();
  const facade = material(FACADES[index % FACADES.length]);
  const trim = material(0xfaf6ec);
  const stone = material(0xcfc6b0);
  const glass = material(0x2e3d46);
  const iron = material(0x2c2c30);
  const slate = material(0x5a6570);
  const h = 4.2 + (index % 3) * 0.8;
  // Trottoir continu le long de la rangée, sous les pieds des passants.
  box(group, stone, side * 4.3, -0.12, 0, 4.1, 0.22, 11);
  box(group, facade, side * 8.6, h / 2, 0, 4.8, h, 6);
  // Soubassement et bandeaux d'étages.
  box(group, stone, side * 8.6, 0.18, 0, 5, 0.36, 6.2);
  for (const y of [1.75, 2.95, 4.15]) {
    if (y < h - 0.2) box(group, trim, side * 8.6, y, 0, 4.94, 0.12, 6.12);
  }
  // Hautes fenêtres à la française, balcons de fer forgé aux 2e et 4e étages.
  for (const z of [-2.05, 0, 2.05]) {
    for (const y of [2.35, 3.55, 4.75]) {
      if (y > h - 0.55) continue;
      box(group, trim, side * 6.12, y, z, 0.12, 1.15, 0.95);
      box(group, glass, side * 6.02, y, z, 0.08, 0.98, 0.72);
      box(group, trim, side * 5.97, y, z, 0.07, 0.98, 0.06);
      if (y === 2.35 || y === 4.75) {
        box(group, iron, side * 5.86, y - 0.32, z, 0.06, 0.06, 1.05);
        for (const dz of [-0.45, -0.15, 0.15, 0.45]) box(group, iron, side * 5.86, y - 0.16, z + dz, 0.05, 0.34, 0.05);
        box(group, iron, side * 5.86, y + 0.02, z, 0.06, 0.05, 1.05);
      }
    }
  }
  // Rez-de-chaussée : portes sombres et devanture de commerce.
  for (const z of [-1.7, 1.7]) box(group, glass, side * 6.05, 0.95, z, 0.1, 1.55, 1.05);
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1d3a2f'; ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#e8c98f'; ctx.lineWidth = 9; ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = '#f3dba0'; ctx.font = 'bold 50px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(SIGN_WORDS[index % SIGN_WORDS.length], 256, 64, 470);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  sign.position.set(side * 6.0, 1.62, 0);
  sign.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
  group.add(sign);
  // Corniche et toiture en mansarde avec lucarnes.
  box(group, trim, side * 8.6, h + 0.14, 0, 5.2, 0.26, 6.3);
  box(group, slate, side * 8.6, h + 0.62, 0, 4.6, 0.72, 5.7);
  box(group, slate, side * 8.6, h + 1.06, 0, 3.6, 0.24, 4.8);
  for (const z of [-1.6, 1.6]) box(group, trim, side * 8.05, h + 0.66, z, 0.34, 0.5, 0.5);
  box(group, stone, side * 9.3, h + 1.35, -1.8, 0.5, 0.8, 0.5);
  box(group, stone, side * 9.3, h + 1.35, 1.8, 0.5, 0.8, 0.5);
  // Drapeau algérien sur une façade sur deux.
  if (index % 2 === 1) {
    const flagCanvas = document.createElement('canvas');
    flagCanvas.width = 128; flagCanvas.height = 96;
    const f = flagCanvas.getContext('2d');
    f.fillStyle = '#006233'; f.fillRect(0, 0, 64, 96);
    f.fillStyle = '#ffffff'; f.fillRect(64, 0, 64, 96);
    f.fillStyle = '#d21034';
    f.beginPath(); f.arc(64, 48, 20, 0, Math.PI * 2); f.fill();
    f.fillStyle = '#ffffff';
    f.beginPath(); f.arc(71, 48, 15, 0, Math.PI * 2); f.fill();
    f.fillStyle = '#d21034';
    f.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
      const r = 7.5;
      f.lineTo(64 + Math.cos(a) * r, 42 + Math.sin(a) * r);
      const b = a + Math.PI / 5;
      f.lineTo(64 + Math.cos(b) * r * 0.45, 42 + Math.sin(b) * r * 0.45);
    }
    f.closePath(); f.fill();
    const flagTexture = new THREE.CanvasTexture(flagCanvas);
    flagTexture.colorSpace = THREE.SRGBColorSpace;
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.85), new THREE.MeshBasicMaterial({ map: flagTexture, side: THREE.DoubleSide }));
    flag.position.set(side * 5.95, h - 0.75, 0);
    flag.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    group.add(flag);
    const pole = box(group, iron, side * 5.88, h - 0.75, 0, 0.05, 1.7, 0.05);
    pole.position.y = h - 0.95;
  }
  // Voitures stationnées le long du trottoir : une ou deux par segment,
  // dont un taxi blanc à bande jaune de temps en temps.
  const carCount = index % 3 === 1 ? 1 : 2;
  for (let c = 0; c < carCount; c += 1) {
    const car = parkedCar(index * 2 + c, (index + c) % 4 === 0 ? 'taxi' : 'berline');
    car.position.set(side * 2.85, 0, -2.9 + c * 5.6 + (index % 2 ? 1.1 : -0.7));
    car.rotation.y = (index + c) % 2 ? Math.PI + 0.05 : -0.05;
    group.add(car);
  }
  // Passants sur le trottoir : deux ou trois par segment, poses variées.
  const crowd = [];
  const walkers = index % 2 === 0 ? 3 : 2;
  for (let p = 0; p < walkers; p += 1) {
    const person = streetFigure(index * 3 + p, (index + p) % 4);
    const walking = (index + p) % 4 === 1;
    person.position.set(side * (4.35 + p * 0.55), 0, -3.6 + p * 3.5 + (index % 2 ? 1.1 : -0.5));
    person.rotation.y = walking ? (p % 2 ? 0 : Math.PI) : (side === 1 ? -Math.PI / 2 : Math.PI / 2);
    person.userData.bob = (index * 3 + p) * 0.9;
    person.userData.baseRotation = person.rotation.y;
    person.userData.baseY = 0;
    group.add(person);
    crowd.push(person);
  }
  if (crowd.length) group.userData.people = crowd;
  // Les deux rangées encadrent le boulevard au plus près, comme les façades
  // d'Alger-Centre : la baie bleue reste visible au bout de la perspective.
  group.position.x = side * 2.5;
  group.position.z = 6 - index * 11 + (side === 1 ? -4 : 0);
  group.userData.speedFactor = 1;
  return group;
}
