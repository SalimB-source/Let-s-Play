import * as THREE from 'three';

const mat = (color, roughness = 0.88) =>
  new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });

function box(parent, material, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

/**
 * Majestic Mount Fuji / Mount Yōtei on the distant horizon, framed by the
 * night sky and full moon. Placed at z ≈ -84 so riders gallop straight toward it.
 */
export function makeMountFuji() {
  const group = new THREE.Group();

  const volcanoDark = mat(0x161d30, 0.95);
  const volcanoMid = mat(0x212c44, 0.92);
  const volcanoRidge = mat(0x2b3956, 0.9);
  const snowPure = new THREE.MeshStandardMaterial({
    color: 0xeaf2ff,
    emissive: 0x3b4f78,
    emissiveIntensity: 0.45,
    roughness: 0.65,
    flatShading: true,
  });
  const snowShadow = new THREE.MeshStandardMaterial({
    color: 0xc4d6f2,
    emissive: 0x263554,
    emissiveIntensity: 0.35,
    roughness: 0.72,
    flatShading: true,
  });
  const mistMat = new THREE.MeshBasicMaterial({
    color: 0x5c739e,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const mistBright = new THREE.MeshBasicMaterial({
    color: 0x8aa4d6,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });

  // Broad lower volcanic skirt sweeping across the horizon
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(16, 54, 15, 12), volcanoDark);
  skirt.position.set(0, 6.5, -84);
  skirt.scale.set(1.15, 1, 0.42);
  group.add(skirt);

  // Mid volcano cone with steepening slope
  const midCone = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 24, 14, 12), volcanoMid);
  midCone.position.set(0, 17.5, -84);
  midCone.scale.set(1.08, 1, 0.42);
  group.add(midCone);

  // Sculpted volcanic ribs descending the flanks
  for (const [rx, rz, rotZ, h] of [
    [-11, -78.5, 0.48, 18],
    [-4.5, -77.5, 0.2, 20],
    [4.5, -77.5, -0.2, 20],
    [11, -78.5, -0.48, 18],
  ]) {
    const rib = new THREE.Mesh(new THREE.ConeGeometry(3.2, h, 5), volcanoRidge);
    rib.position.set(rx, h * 0.55, rz);
    rib.rotation.z = rotZ;
    rib.scale.set(1, 1, 0.5);
    group.add(rib);
  }

  // Iconic flat-topped snow cap at the summit
  const snowCap = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 12.8, 9.5, 12), snowPure);
  snowCap.position.set(0, 25.2, -83.8);
  snowCap.scale.set(1.08, 1, 0.44);
  group.add(snowCap);

  // Jagged snow gullies / streaks running down the mountain face toward the player
  const snowStreaks = [
    [-9.2, 17.8, -79.2, 0.42, 2.3, 8.5],
    [-5.0, 18.2, -78.4, 0.22, 2.5, 9.8],
    [-1.4, 18.5, -78.0, 0.06, 2.2, 10.4],
    [2.1, 18.4, -78.0, -0.08, 2.4, 10.2],
    [5.8, 18.0, -78.5, -0.25, 2.3, 9.4],
    [9.4, 17.6, -79.2, -0.44, 2.1, 8.2],
  ];
  snowStreaks.forEach(([x, y, z, rotZ, r, h], idx) => {
    const streak = new THREE.Mesh(
      new THREE.ConeGeometry(r, h, 4),
      idx % 2 === 0 ? snowPure : snowShadow
    );
    streak.position.set(x, y, z);
    streak.rotation.z = rotZ + Math.PI;
    streak.scale.set(0.85, 1, 0.35);
    group.add(streak);
  });

  // Distant foothills flanking Mount Fuji on left and right
  for (const [fx, fw, fh, fz] of [
    [-46, 26, 9.5, -80],
    [-32, 20, 7.2, -76],
    [32, 20, 7.2, -76],
    [46, 26, 9.5, -80],
  ]) {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(fw * 0.5, fh, 6), volcanoDark);
    hill.position.set(fx, fh * 0.45 - 0.5, fz);
    hill.scale.set(1.2, 1, 0.45);
    group.add(hill);
  }

  // Ethereal night mist layers floating across the base of Mount Fuji
  for (const [mx, my, mz, mw, mh, bright] of [
    [0, 3.2, -74, 125, 4.5, false],
    [-18, 6.4, -76, 72, 3.6, true],
    [20, 5.4, -75, 68, 3.4, true],
    [0, 10.5, -77, 54, 2.8, false],
  ]) {
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(mw, mh), bright ? mistBright : mistMat);
    mist.position.set(mx, my, mz);
    group.add(mist);
  }

  return group;
}

/**
 * Low jumpable obstacle (barrier): Samurai bamboo & vermilion lacquer palisade (Tate)
 * with warm glowing paper lanterns (chōchin) at each end.
 */
function bambooPalisade() {
  const group = new THREE.Group();
  const bamboo = mat(0x6e8450);
  const bambooDark = mat(0x4c5e36);
  const lacquerRed = mat(0xb82929);
  const cordBlack = mat(0x1b191c);
  const lanternGlow = new THREE.MeshBasicMaterial({ color: 0xffb347 });

  // Horizontal bamboo rails (width ~4.0m, height ~0.95m, matching other stages' barriers)
  box(group, lacquerRed, 0, 0.88, 0, 4.02, 0.11, 0.18);
  box(group, bamboo, 0, 0.56, 0, 3.96, 0.09, 0.14);
  box(group, bambooDark, 0, 0.26, 0, 3.96, 0.09, 0.14);

  // Diagonal & vertical bamboo stakes across the barrier
  for (let i = -5; i <= 5; i++) {
    const x = i * 0.34;
    const stake = box(group, i % 2 === 0 ? bamboo : bambooDark, x, 0.48, 0.04, 0.08, 0.92, 0.08);
    stake.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.12;
    // Black rope knots
    box(group, cordBlack, x, 0.88, 0.05, 0.11, 0.13, 0.2);
  }

  // End posts with glowing chōchin lanterns
  for (const side of [-1, 1]) {
    const px = side * 1.92;
    box(group, lacquerRed, px, 0.52, 0, 0.18, 1.04, 0.18);
    box(group, cordBlack, px, 1.04, 0, 0.24, 0.06, 0.24);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 6), lanternGlow);
    lantern.position.set(px, 0.76, 0.18);
    lantern.scale.y = 1.25;
    group.add(lantern);
  }

  return group;
}

/**
 * Tall single-lane obstacle: Mossy Japanese Stone Lantern (Tōrō) with glowing
 * hearth and sacred crimson Torii pillar — dodge rather than jump.
 */
function stoneLanternObstacle() {
  const group = new THREE.Group();
  const stone = mat(0x6d7380);
  const stoneDark = mat(0x4b505c);
  const moss = mat(0x3b5c42);
  const fireGlow = new THREE.MeshBasicMaterial({ color: 0xffa838 });
  const vermilion = mat(0xc83228);

  // Base pedestal
  box(group, stoneDark, 0, 0.16, 0, 0.86, 0.32, 0.86);
  box(group, moss, 0, 0.34, 0, 0.68, 0.08, 0.68);
  // Central column
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.72, 7), stone);
  pillar.position.y = 0.72;
  group.add(pillar);
  // Mid platform
  box(group, stoneDark, 0, 1.12, 0, 0.66, 0.12, 0.66);
  // Glowing lantern chamber (hibukuro)
  box(group, fireGlow, 0, 1.38, 0, 0.42, 0.4, 0.42);
  for (const [cx, cz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) {
    box(group, stoneDark, cx, 1.38, cz, 0.07, 0.42, 0.07);
  }
  // Pagoda umbrella roof (kasa) + finial (hōju)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.36, 4), stoneDark);
  roof.position.y = 1.76;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);
  box(group, vermilion, 0, 1.6, 0, 0.72, 0.06, 0.72);
  const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), stone);
  finial.position.y = 2.02;
  group.add(finial);

  return group;
}

export function japanObstacle(kind) {
  return kind === 'barrier' ? bambooPalisade() : stoneLanternObstacle();
}

/** Red-crowned Japanese crane (Tsuru) standing in the moonlit pampas grass. */
function makeCrane() {
  const group = new THREE.Group();
  const white = mat(0xf2f6fc);
  const black = mat(0x1c2029);
  const redCrown = mat(0xd93025);
  const beakMat = mat(0xd9b44a);

  // Body
  box(group, white, 0, 0.62, 0, 0.36, 0.34, 0.68);
  box(group, black, 0, 0.58, 0.32, 0.34, 0.24, 0.22);
  // Graceful long neck
  const neck = box(group, white, 0, 1.02, -0.24, 0.12, 0.58, 0.12);
  neck.rotation.x = 0.18;
  box(group, black, 0, 0.96, -0.2, 0.13, 0.28, 0.13);
  // Head & red crown
  box(group, white, 0, 1.32, -0.32, 0.16, 0.14, 0.2);
  box(group, redCrown, 0, 1.4, -0.32, 0.12, 0.05, 0.12);
  box(group, beakMat, 0, 1.3, -0.5, 0.06, 0.05, 0.22);
  // Long slender legs
  box(group, black, -0.09, 0.24, 0, 0.04, 0.48, 0.04);
  box(group, black, 0.09, 0.24, 0, 0.04, 0.48, 0.04);

  group.userData.isAnimal = true;
  group.userData.animalType = 'sheep';
  group.userData.bob = Math.random() * Math.PI * 2;
  return group;
}

/** Ezo red fox (Kitsune) watching the rider from the silver grass. */
function makeKitsune() {
  const group = new THREE.Group();
  const fur = mat(0xd4652f);
  const white = mat(0xf4f2ed);
  const dark = mat(0x231d1b);

  box(group, fur, 0, 0.34, 0, 0.32, 0.28, 0.65);
  box(group, white, 0, 0.24, -0.1, 0.26, 0.14, 0.42);
  box(group, fur, 0, 0.5, -0.36, 0.28, 0.24, 0.28);
  box(group, white, 0, 0.44, -0.54, 0.14, 0.1, 0.14);
  // Pointed ears
  box(group, fur, -0.09, 0.68, -0.34, 0.08, 0.14, 0.06);
  box(group, fur, 0.09, 0.68, -0.34, 0.08, 0.14, 0.06);
  // Fluffy tail with white tip
  const tail = box(group, fur, 0, 0.42, 0.45, 0.2, 0.2, 0.42);
  tail.rotation.x = 0.35;
  box(group, white, 0, 0.5, 0.66, 0.16, 0.16, 0.14);
  for (const [lx, lz] of [[-0.1, -0.22], [0.1, -0.22], [-0.1, 0.22], [0.1, 0.22]]) {
    box(group, dark, lx, 0.12, lz, 0.07, 0.24, 0.07);
  }

  group.userData.isAnimal = true;
  group.userData.animalType = 'pig';
  group.userData.bob = Math.random() * Math.PI * 2;
  return group;
}

/**
 * Roadside segment for the Japanese night plains (Ghost of Yōtei inspiration):
 * swaying silver pampas grass (susuki), vermilion Torii gates, glowing stone
 * lanterns, samurai banners (nobori), weeping sakura/maple trees, and wildlife.
 */
export function japanPlains(index, side) {
  const group = new THREE.Group();

  const groundDark = mat(0x162129, 0.96);
  const groundRidge = mat(0x1e2c36, 0.95);
  const stalkMat = mat(0x495b63, 0.9);
  const plumeSilver = new THREE.MeshStandardMaterial({
    color: 0xdce6f7,
    emissive: 0x2a3a57,
    emissiveIntensity: 0.32,
    roughness: 0.75,
    flatShading: true,
  });
  const plumeMoon = new THREE.MeshStandardMaterial({
    color: 0xf0ebd8,
    emissive: 0x3b3828,
    emissiveIntensity: 0.28,
    roughness: 0.75,
    flatShading: true,
  });
  const vermilion = mat(0xc42b23, 0.82);
  const woodDark = mat(0x231e24, 0.9);
  const stoneMat = mat(0x5b6370, 0.9);
  const lanternGlow = new THREE.MeshBasicMaterial({ color: 0xffad42 });
  const sakuraPink = new THREE.MeshStandardMaterial({
    color: 0xe89ab5,
    emissive: 0x3d1c2b,
    emissiveIntensity: 0.3,
    roughness: 0.85,
    flatShading: true,
  });
  const momijiRed = new THREE.MeshStandardMaterial({
    color: 0xc9382c,
    emissive: 0x3a110e,
    emissiveIntensity: 0.3,
    roughness: 0.85,
    flatShading: true,
  });

  // Base dark volcanic plains soil
  box(group, groundDark, side * 12.2, -0.08, 0, 16.2, 0.2, 11.4);
  for (let r = 0; r < 5; r++) {
    const z = -4.4 + r * 2.2;
    box(group, groundRidge, side * 11.8, 0.04, z, 15.2, 0.08, 0.7);
  }

  // Dense clusters of silver pampas grass (susuki) swaying toward the night wind
  const rand = (n) => {
    const x = Math.sin(index * 131.7 + side * 53.3 + n * 293.1) * 43758.5453;
    return x - Math.floor(x);
  };

  for (let i = 0; i < 85; i++) {
    const col = i % 17;
    const row = Math.floor(i / 17);
    const gx = side * (5.7 + col * 0.78 + (rand(i) - 0.5) * 0.45);
    const gz = -4.8 + row * 2.35 + (rand(i + 100) - 0.5) * 0.9;
    const h = 0.75 + rand(i + 200) * 0.65 + (col < 3 ? 0.2 : 0);
    const lean = side * (0.14 + rand(i + 300) * 0.16);

    const stalk = box(group, stalkMat, gx, h * 0.45, gz, 0.055, h, 0.055);
    stalk.rotation.z = -lean;

    const plume = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.52, 5),
      i % 3 === 0 ? plumeMoon : plumeSilver
    );
    plume.position.set(gx + side * 0.09, h + 0.12, gz);
    plume.rotation.z = -lean * 1.35;
    group.add(plume);
  }

  // Every 3rd segment: Roadside Vermilion Torii Shrine Gate or Samurai Banner (Nobori)
  if (index % 3 === 0) {
    const tx = side * 7.4;
    // Two tall vermilion pillars
    box(group, vermilion, tx - 1.1, 1.95, 0, 0.26, 3.9, 0.26);
    box(group, vermilion, tx + 1.1, 1.95, 0, 0.26, 3.9, 0.26);
    box(group, woodDark, tx - 1.1, 0.22, 0, 0.36, 0.44, 0.36);
    box(group, woodDark, tx + 1.1, 0.22, 0, 0.36, 0.44, 0.36);
    // Lower tie beam (nuki) & top lintel (kasagi)
    box(group, vermilion, tx, 3.1, 0, 2.95, 0.22, 0.24);
    box(group, vermilion, tx, 3.78, 0, 3.45, 0.24, 0.34);
    box(group, woodDark, tx, 3.95, 0, 3.65, 0.14, 0.4);
    box(group, vermilion, tx, 3.44, 0, 0.22, 0.5, 0.2);
  } else if (index % 3 === 1) {
    // Samurai clan banner (Nobori) fluttering on bamboo pole + roadside stone lantern
    const bx = side * 6.0;
    box(group, woodDark, bx, 1.75, -1.8, 0.09, 3.5, 0.09);
    box(group, woodDark, bx + side * 0.42, 3.42, -1.8, 0.85, 0.07, 0.07);
    const banner = box(
      group,
      index % 2 === 0 ? vermilion : woodDark,
      bx + side * 0.42,
      2.35,
      -1.8,
      0.78,
      2.05,
      0.04
    );
    banner.rotation.y = side * 0.15;
    // Kamon crest stripe on banner
    box(group, plumeMoon, bx + side * 0.42, 2.55, -1.76, 0.42, 0.42, 0.05);
  }

  // Roadside Stone Lantern (Tōrō) with warm glowing flame every other segment
  if (index % 2 === 0) {
    const lx = side * 5.45;
    const lz = 2.4;
    box(group, stoneMat, lx, 0.15, lz, 0.62, 0.3, 0.62);
    box(group, stoneMat, lx, 0.65, lz, 0.26, 0.72, 0.26);
    box(group, stoneMat, lx, 1.08, lz, 0.56, 0.1, 0.56);
    const flame = box(group, lanternGlow, lx, 1.3, lz, 0.34, 0.34, 0.34);
    flame.userData.glow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.3, 4), stoneMat);
    roof.position.set(lx, 1.62, lz);
    roof.rotation.y = Math.PI / 4;
    group.add(roof);
  }

  // Sakura / Momiji tree on outer plains
  if (index % 2 === 1) {
    const treeX = side * (10.6 + rand(15) * 2.4);
    const treeZ = -1.2 + rand(16) * 2.5;
    const trunk = box(group, woodDark, treeX, 1.35, treeZ, 0.42, 2.7, 0.42);
    trunk.rotation.z = -side * 0.08;
    const foliageMat = (index + (side > 0 ? 1 : 0)) % 2 === 0 ? sakuraPink : momijiRed;
    for (const [ox, oy, oz, r] of [
      [0, 2.85, 0, 1.35],
      [-0.85, 2.45, 0.4, 1.05],
      [0.85, 2.55, -0.35, 1.1],
      [0, 3.35, -0.2, 1.0],
    ]) {
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), foliageMat);
      crown.position.set(treeX + ox, oy, treeZ + oz);
      crown.scale.y = 0.68;
      group.add(crown);
    }
  }

  // Floating fireflies / spirit embers (hotaru) above the silver grass
  for (let f = 0; f < 2; f++) {
    const firefly = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), lanternGlow);
    firefly.position.set(
      side * (6.2 + rand(70 + f) * 5.5),
      0.9 + rand(80 + f) * 1.4,
      -3.5 + f * 5.2
    );
    firefly.userData.glow = true;
    group.add(firefly);
  }

  // Wildlife (Cranes & Kitsune foxes) in the plains
  const animals = [];
  if (index % 3 === 0) {
    const crane = makeCrane();
    crane.position.set(side * (9.4 + rand(40) * 2.0), 0, 1.5);
    crane.rotation.y = rand(41) * Math.PI;
    group.add(crane);
    animals.push(crane);
  } else if (index % 3 === 2) {
    const fox = makeKitsune();
    fox.position.set(side * (8.8 + rand(42) * 2.2), 0, -2.0);
    fox.rotation.y = -side * 0.8;
    group.add(fox);
    animals.push(fox);
  }

  group.position.z = 6 - index * 10;
  group.userData.speedFactor = 1;
  group.userData.animals = animals;
  return group;
}
