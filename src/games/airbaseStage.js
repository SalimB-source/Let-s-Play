import * as THREE from 'three';

/*
 * ZONE 08 · THUNDER AIRBASE — hommage au stage de Guile (Street Fighter II) pour Mirage Rush.
 *
 * La piste est un taxiway qui traverse une base aérienne américaine en pleine journée :
 * le tarmac gris file entre la zone opérations (à GAUCHE) et le public (à DROITE),
 * comme le décor du stage original où le F-16 est garé derrière les combattants,
 * l'immense drapeau américain flotte au vent et les soldats applaudissent le combat.
 *
 *   · opérations (gauche) : hangar vert à porte ouverte, F-16 « Falcon » garé de profil
 *     (réacteur incandescent, cocardes US), tour de contrôle vitrée au radar tournant,
 *     camion-citerne JET FUEL, dôme radar, jeep au gyrophare orange, abri béton ;
 *   · public (droite) : drapeau américain géant qui flotte, deux vagues de gradins où
 *     les soldats applaudissent (uniformes, casquettes, boxeur torse nu, officier,
 *     mécano, spectatrice en rouge), panneau « SONIC BOOM », palmiers, pylône de
 *     projecteurs, camion militaire bâché ;
 *   · sur la piste : barrières de piste rayées rouge/blanc à sauter, fûts de kérosène
 *     surmontés d'une caisse de munitions à contourner ;
 *   · une fois par boucle : le portique « ★ THUNDER AIRBASE ★ » enjambe le taxiway,
 *     bien au-dessus de la caméra, gyrophare orange au sommet.
 *
 * Tout est procédural et pensé pour le bake de MirageWorld : seuls le drapeau, les
 * radars, les gyrophares, la flamme du réacteur et les spectateurs sont animés
 * (marqués userData.bob / userData.glow, donc exclus de la fusion).
 */

export const AIRBASE_SEGMENT_LENGTH = 11;
export const AIRBASE_SEGMENT_COUNT = 10;
/** Segment de la boucle où le portique enjambe la piste (visible dès le départ). */
export const AIRBASE_GATE_INDEX = 5;
/** Comme sur le stage original : les avions à gauche, le public à droite. */
export const OPS_SIDE = -1;
export const STANDS_SIDE = 1;

/** Bords de la piste jouable (4 voies, TRACK_WIDTH 8,4). */
const TRACK_EDGE = 4.2;
/** Le portique passe à ~1 m au-dessus de la caméra (7,3 m) : jamais de collision visuelle. */
export const GATE_BEAM_Y = 9.2;

const PALETTE = Object.freeze({
  tarmac: 0x767c88, // béton du taxiway
  tarmacDark: 0x626774,
  concrete: 0x9aa0ab,
  markingWhite: 0xe8ecf2,
  markingYellow: 0xe8c33a,
  grass: 0x63a34e, // herbe verte du stage original
  grassDark: 0x4e863d,
  hangar: 0x5a6e52, // tôle verte des hangars
  hangarDark: 0x46553f,
  olive: 0x5c6142, // caisses de munitions
  jetGrey: 0x9aa3b0, // fuselage du F-16
  jetDark: 0x6e7684,
  canopy: 0x27435f, // verrière teintée
  steel: 0x8b939e,
  iron: 0x2c2f34,
  glass: 0xbfd9e8,
  towerWhite: 0xe4e7ec,
  towerStripe: 0xc73e2e,
  tent: 0x7a7f66, // bâche du camion
  cone: 0xe2622b, // cônes orange
  barrelYellow: 0xd9a83b,
  barrelRed: 0xa83a2c,
  barrierRed: 0xc73e2e,
  barrierWhite: 0xf2f2f0,
  tire: 0x1f1d1c,
  trunk: 0x7a5c3a,
  palmLeaf: 0x3f8a46,
  dark: 0x14171c, // intérieur des hangars
  skinA: 0x8d5524,
  skinB: 0xe0ac69,
  skinC: 0xf1c27d,
  uniform: 0x5c6142,
  uniformTan: 0xa89468,
  cap: 0x3e4432,
  helmet: 0xd8d8d2,
  navy: 0x2e3d5c, // officier
  mechanic: 0xc75f22, // mécano en combinaison orange
  dressRed: 0xb52a3a, // spectatrice en rouge
  shortsRed: 0xa32b2b, // boxeur
});

const material = (color, roughness = 0.9) => new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });

/** Matériaux créés à la demande (un jeu par segment, fusionnés au bake). */
function palette() {
  const cache = new Map();
  return (name) => {
    if (!cache.has(name)) cache.set(name, material(PALETTE[name]));
    return cache.get(name);
  };
}

function box(parent, mat, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, mat, x, y, z, radiusTop, radiusBottom, height, segments = 10) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

/* ------------------------------------------------------------------ */
/* Textures peintes (drapeau US, cocardes, panneaux de piste)           */
/* ------------------------------------------------------------------ */

const textureCache = new Map();

function canvasTexture(key, width, height, draw) {
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, width, height); // sans canvas 2D : texture vierge plutôt qu'un plantage
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  textureCache.set(key, texture);
  return texture;
}

/** L'immense drapeau américain du stage original : 13 rayures, canton étoilé. */
function usFlagTexture() {
  return canvasTexture('airbase-flag-us', 512, 320, (ctx, w, h) => {
    for (let i = 0; i < 13; i++) {
      ctx.fillStyle = i % 2 ? '#f2f2f0' : '#b5313a';
      ctx.fillRect(0, (i * h) / 13, w, h / 13 + 1);
    }
    ctx.fillStyle = '#2a3d7d';
    ctx.fillRect(0, 0, w * 0.42, (h / 13) * 7);
    ctx.fillStyle = '#f2f2f0';
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 8; col++) {
        const x = w * 0.03 + col * w * 0.045 + (row % 2) * w * 0.022;
        const y = (h * 0.04) + row * (h * 0.062);
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

/** Cocarde de l'US Air Force : étoile blanche, cercle bleu, barres latérales. */
function roundelTexture() {
  return canvasTexture('airbase-roundel', 256, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f2f2f0';
    ctx.fillRect(6, 38, 62, 52);
    ctx.fillRect(188, 38, 62, 52);
    ctx.fillStyle = '#2a3d7d';
    ctx.fillRect(10, 42, 54, 44);
    ctx.fillRect(192, 42, 54, 44);
    ctx.fillStyle = '#2a3d7d';
    ctx.beginPath();
    ctx.arc(128, 64, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2f2f0';
    ctx.beginPath();
    ctx.arc(128, 64, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a3d7d';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      ctx.lineTo(128 + Math.cos(a) * 30, 64 + Math.sin(a) * 30);
      const b = a + Math.PI / 5;
      ctx.lineTo(128 + Math.cos(b) * 12, 64 + Math.sin(b) * 12);
    }
    ctx.closePath();
    ctx.fill();
  });
}

/** Panneau d'avertissement jaune/noir de la base (« SONIC BOOM », « JET BLAST »…). */
function warningSignTexture(key, lines, accent = '#ffd83d') {
  return canvasTexture(`airbase-sign-${key}`, 512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#15161a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.fillRect(14, 14, w - 28, h - 28);
    ctx.fillStyle = '#15161a';
    for (let i = 0; i < 9; i++) {
      ctx.save();
      ctx.translate(30 + i * 54, h - 34);
      ctx.rotate(-0.5);
      ctx.fillRect(0, 0, 22, 26);
      ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Éclairs de chaque côté du texte, clin d'œil au « Sonic Boom » de Guile.
    ctx.fillStyle = '#b5313a';
    for (const sx of [52, w - 52]) {
      ctx.beginPath();
      ctx.moveTo(sx + 14, 52);
      ctx.lineTo(sx - 12, 128);
      ctx.lineTo(sx + 4, 128);
      ctx.lineTo(sx - 10, 196);
      ctx.lineTo(sx + 16, 118);
      ctx.lineTo(sx + 2, 118);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#15161a';
    const sizes = lines.length > 1 ? [64, 44] : [72];
    lines.forEach((line, i) => {
      ctx.font = `900 ${sizes[i] || 44}px Impact, "Arial Black", Arial, sans-serif`;
      ctx.fillText(line, w / 2, lines.length > 1 ? 92 + i * 62 : h / 2 - 6);
    });
  });
}

/** Banderole du portique : « ★ THUNDER AIRBASE ★ » blanc sur bleu nuit. */
function gateSignTexture() {
  return canvasTexture('airbase-gate', 1024, 128, (ctx, w, h) => {
    ctx.fillStyle = '#1d2c52';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#e8ecf2';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#f2f2f0';
    ctx.font = '900 64px Impact, "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ THUNDER AIRBASE ★', w / 2, h / 2 + 4);
  });
}

/** Numéro de piste « 08 » peint sur le tarmac (la zone 08 !). */
function runwayNumberTexture() {
  return canvasTexture('airbase-runway-08', 256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(232, 236, 242, 0.92)';
    ctx.font = '900 150px Impact, "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('08', w / 2, h / 2 + 8);
  });
}

/**
 * Autocollant plaqué sur une face tournée vers le cavalier (+z) ou à plat au sol.
 * `basic` = panneau imprimé (non éclairé).
 */
function decal(parent, texture, x, y, z, w, h, { basic = false, transparent = false, flat = false } = {}) {
  const Material = basic ? THREE.MeshBasicMaterial : THREE.MeshStandardMaterial;
  const options = { map: texture, side: THREE.DoubleSide, transparent, depthWrite: !transparent };
  if (!basic) options.roughness = 0.9;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new Material(options));
  mesh.position.set(x, y, z);
  if (flat) mesh.rotation.x = -Math.PI / 2;
  parent.add(mesh);
  return mesh;
}

/* ------------------------------------------------------------------ */
/* Gyrophares : tour (rouge), jeep et portique (orange)                  */
/* ------------------------------------------------------------------ */

export const AIRBASE_BEACON_PERIOD = 1.4;

/** Le feu est allumé pendant un bref éclair à chaque cycle. */
export function airbaseBeaconOn(seconds) {
  const phase = ((seconds % AIRBASE_BEACON_PERIOD) + AIRBASE_BEACON_PERIOD) % AIRBASE_BEACON_PERIOD;
  return phase < 0.14;
}

/** Fait clignoter les gyrophares d'un segment ; animations réduites : feu fixe. */
export function updateAirbaseBeacon(beacons, seconds, reduceMotion = false) {
  if (!beacons?.length) return;
  for (const beacon of beacons) {
    const on = reduceMotion || airbaseBeaconOn(seconds + beacon.offset);
    if (beacon.on === on) continue;
    beacon.on = on;
    beacon.lamp.material.color.setHex(on ? beacon.color : beacon.dim);
    if (beacon.halo) beacon.halo.visible = on;
  }
}

function beaconLamp(parent, M, x, y, z, color, dim, beacons, offset) {
  box(parent, M('iron'), x, y - 0.09, z, 0.22, 0.1, 0.22);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.2), new THREE.MeshBasicMaterial({ color: dim }));
  lamp.position.set(x, y + 0.08, z);
  lamp.userData.glow = true; // gardée hors du bake : sa couleur change
  parent.add(lamp);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ color, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.set(x, y + 0.1, z);
  halo.scale.setScalar(0.9);
  halo.visible = false;
  halo.userData.glow = true;
  parent.add(halo);
  beacons.push({ lamp, halo, offset, color, dim, on: null });
}

/* ------------------------------------------------------------------ */
/* Obstacles du taxiway                                                 */
/* ------------------------------------------------------------------ */

/**
 * Barrière de piste rayée rouge/blanc : deux voies de large, moins d'un mètre
 * de haut — on la saute, comme les murets du Mid ou les barrières de bambou.
 */
function runwayBarrier(M) {
  const group = new THREE.Group();
  for (const sx of [-1.7, 1.7]) {
    box(group, M('iron'), sx, 0.3, 0, 0.18, 0.6, 0.5);
    box(group, M('iron'), sx, 0.05, 0, 0.5, 0.1, 0.7);
  }
  // Latte rayée : 8 tronçons alternés cousus sur une âme sombre.
  box(group, M('iron'), 0, 0.62, 0, 4.0, 0.3, 0.1);
  for (let i = 0; i < 8; i++) {
    box(group, M(i % 2 ? 'barrierWhite' : 'barrierRed'), -1.75 + i * 0.5, 0.62, 0.02, 0.5, 0.26, 0.12);
  }
  // Catadioptres orange aux extrémités.
  for (const sx of [-1.95, 1.95]) box(group, M('cone'), sx, 0.62, 0.02, 0.1, 0.26, 0.12);
  return group;
}

/**
 * Lot de kérosène : deux fûts jaune « JET FUEL » surmontés d'une caisse de
 * munitions olive — haut sur une seule voie, on le contourne.
 */
function fuelDrums(M) {
  const group = new THREE.Group();
  for (const sx of [-0.33, 0.33]) {
    cylinder(group, M('barrelYellow'), sx, 0.45, 0, 0.31, 0.31, 0.9, 12);
    cylinder(group, M('iron'), sx, 0.72, 0, 0.322, 0.322, 0.05, 12);
    cylinder(group, M('iron'), sx, 0.18, 0, 0.322, 0.322, 0.05, 12);
  }
  box(group, M('olive'), 0, 1.28, 0, 1.14, 0.76, 0.92);
  box(group, M('iron'), 0, 1.28, 0.47, 1.0, 0.5, 0.03);
  for (const sx of [-0.45, 0.45]) box(group, M('iron'), sx, 1.28, -0.47, 0.12, 0.5, 0.03);
  return group;
}

export function airbaseObstacle(kind) {
  const M = palette();
  return kind === 'barrier' ? runwayBarrier(M) : fuelDrums(M);
}

/* ------------------------------------------------------------------ */
/* Socle commun d'un segment : tarmac, marquages, cônes, plots bleus    */
/* ------------------------------------------------------------------ */

function segmentGroup(index) {
  const group = new THREE.Group();
  group.position.z = 6 - index * AIRBASE_SEGMENT_LENGTH;
  group.userData.speedFactor = 1;
  return group;
}

/** Petit cône de signalisation orange à bande blanche. */
function trafficCone(parent, M, x, z) {
  const cone = cylinder(parent, M('cone'), x, 0.26, z, 0.05, 0.2, 0.52, 8);
  cone.position.y = 0.26;
  cylinder(parent, M('barrierWhite'), x, 0.3, z, 0.115, 0.15, 0.1, 8);
  box(parent, M('cone'), x, 0.025, z, 0.42, 0.05, 0.42);
}

function sideBase(group, M, side, index) {
  const s = side;
  const L = AIRBASE_SEGMENT_LENGTH + 0.02;
  // Dalle de tarmac (glisse sous le bord des dalles de la piste) et ligne blanche.
  box(group, M(index % 2 ? 'tarmac' : 'tarmacDark'), s * 8.6, -0.12, 0, 9.2, 0.12, L);
  box(group, M('markingWhite'), s * 4.55, -0.045, 0, 0.22, 0.02, L);
  // Plots lumineux bleus de taxiway, le long de la piste.
  const edgeLight = new THREE.MeshBasicMaterial({ color: 0x4fa8ff });
  for (const z of [-3.6, 0, 3.6]) {
    box(group, M('iron'), s * 5.1, 0.06, z, 0.14, 0.12, 0.14);
    box(group, edgeLight, s * 5.1, 0.17, z, 0.12, 0.1, 0.12);
  }
  // Cônes orange : deux par segment, en quinconce.
  trafficCone(group, M, s * 5.6, index % 2 ? -2.2 : 2.2);
  trafficCone(group, M, s * 6.4, index % 2 ? 2.6 : -2.6);
  // Numéro de piste « 08 » peint sur le tarmac, un segment sur trois.
  if (index % 3 === 1) {
    decal(group, runwayNumberTexture(), s * 8.2, -0.045, 0.5, 3.2, 3.2, { basic: true, transparent: true, flat: true });
  }
  // Bande d'herbe au-delà du tarmac, comme autour du stage original.
  box(group, M(index % 2 ? 'grass' : 'grassDark'), s * 16.2, -0.14, 0, 6.0, 0.1, L);
}

/* ------------------------------------------------------------------ */
/* Le F-16 « Falcon » — la star du stage original                       */
/* ------------------------------------------------------------------ */

/**
 * Chasseur F-16 garé de profil, nez vers le cavalier qui arrive : fuselage
 * gris, verrière teintée, ailes en flèche, dérive à cocarde, réacteur dont
 * la tuyère rougeoie et missiles d'exercice sous les ailes. Un mécano et des
 * cônes gardent l'appareil.
 */
function fighterJet(group, M, people, beacons) {
  const jet = new THREE.Group();
  jet.position.set(-8.6, 0, 0);
  group.add(jet);
  const X = -8.6; // les décals monde restent dans `group`

  // Fuselage le long de la piste, nez (+z) vers le cavalier.
  const body = cylinder(jet, M('jetGrey'), 0, 1.0, -0.8, 0.42, 0.62, 6.4, 10);
  body.rotation.x = Math.PI / 2;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.6, 10), M('jetDark'));
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.0, 3.2);
  jet.add(nose);
  box(jet, M('jetDark'), 0, 0.62, -0.8, 0.7, 0.3, 5.6); // quille ventrale
  // Verrière teintée en goutte d'eau.
  box(jet, M('canopy'), 0, 1.52, 1.1, 0.5, 0.42, 1.5);
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), M('canopy'));
  bubble.position.set(0, 1.6, 0.5);
  bubble.scale.set(0.85, 0.8, 1.2);
  jet.add(bubble);
  // Ailes en flèche + dérive verticale.
  for (const sx of [-1, 1]) {
    const wing = box(jet, M('jetGrey'), sx * 1.75, 0.78, -1.0, 2.6, 0.09, 1.7);
    wing.rotation.y = -sx * 0.42;
    const tip = box(jet, M('jetDark'), sx * 2.85, 0.78, -1.55, 0.5, 0.07, 0.9);
    tip.rotation.y = -sx * 0.42;
    // Missile d'exercice sous chaque aile.
    const missile = cylinder(jet, M('concrete'), sx * 1.5, 0.52, -0.9, 0.07, 0.07, 1.1, 6);
    missile.rotation.x = Math.PI / 2;
    const tipCone = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 6), M('barrierRed'));
    tipCone.rotation.x = Math.PI / 2;
    tipCone.position.set(sx * 1.5, 0.52, -0.24);
    jet.add(tipCone);
  }
  box(jet, M('jetGrey'), 0, 2.0, -3.4, 0.1, 1.7, 1.4);
  box(jet, M('towerStripe'), 0, 2.72, -3.4, 0.12, 0.28, 1.0);
  for (const sx of [-1, 1]) {
    const stab = box(jet, M('jetDark'), sx * 0.85, 0.95, -3.8, 1.5, 0.07, 0.8);
    stab.rotation.y = -sx * 0.3;
  }
  // Tuyère : le réacteur rougeoie, halo incandescent (pulsé par MirageWorld).
  cylinder(jet, M('iron'), 0, 1.0, -4.05, 0.5, 0.58, 0.3, 10).rotation.x = Math.PI / 2;
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.1, 10), flameMat);
  flame.rotation.x = -Math.PI / 2;
  flame.position.set(0, 1.0, -4.7);
  flame.userData.glow = true;
  jet.add(flame);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xff9a4a, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.set(0, 1.0, -4.4);
  halo.scale.setScalar(1.4);
  halo.userData.glow = true;
  jet.add(halo);
  group.userData.jetFlame = flame;
  // Train d'atterrissage sorti.
  for (const [lx, lz] of [[0, 2.2], [-0.55, -1.2], [0.55, -1.2]]) {
    box(jet, M('iron'), lx, 0.3, lz, 0.1, 0.6, 0.1);
    const wheel = cylinder(jet, M('tire'), lx, 0.18, lz, 0.18, 0.18, 0.12, 8);
    wheel.rotation.z = Math.PI / 2;
  }
  // Cocardes US : dérive + flanc tourné vers la piste.
  decal(group, roundelTexture(), X + 0.07, 2.0, -3.4, 1.1, 0.55, { basic: true, transparent: true }).rotation.y = Math.PI / 2;
  decal(group, roundelTexture(), X + 0.55, 1.0, 0.4, 1.3, 0.65, { basic: true, transparent: true }).rotation.y = Math.PI / 2;
  // Le mécano en combinaison orange fait sa ronde autour de l'appareil.
  const crew = airman(M, 'mechanic');
  crew.position.set(-6.3, 0, 2.6);
  crew.rotation.y = -Math.PI / 2 - 0.4;
  crew.userData.bob = 2.2;
  crew.userData.baseRotation = crew.rotation.y;
  crew.userData.baseY = 0;
  group.add(crew);
  people.push(crew);
  trafficCone(group, M, -6.2, -2.4);
  trafficCone(group, M, -11.0, 2.2);
  void beacons;
}

/* ------------------------------------------------------------------ */
/* Bâtiments et véhicules des opérations                                */
/* ------------------------------------------------------------------ */

/** Hangar en tôle verte, porte ouverte sur un intérieur sombre et ses caisses. */
function hangar(group, M) {
  const cx = -9.2;
  for (const sz of [-3.2, 3.2]) box(group, M('hangar'), cx, 2.0, sz, 5.6, 4.0, 0.5);
  box(group, M('hangarDark'), cx - 2.6, 2.0, 0, 0.5, 4.0, 6.9);
  // Voûte approximée par trois pans inclinés + faîtage.
  const left = box(group, M('hangar'), cx - 1.35, 4.5, 0, 3.1, 0.18, 7.0);
  left.rotation.z = 0.5;
  const right = box(group, M('hangar'), cx + 1.35, 4.5, 0, 3.1, 0.18, 7.0);
  right.rotation.z = -0.5;
  box(group, M('hangarDark'), cx, 5.28, 0, 1.0, 0.16, 7.0);
  // Bouche sombre, un vantail ouvert, l'autre fermé.
  box(group, M('dark'), cx + 2.55, 1.9, 0, 0.2, 3.8, 6.2);
  box(group, M('hangarDark'), cx + 2.75, 1.9, -3.35, 0.14, 3.8, 1.6);
  const open = box(group, M('hangar'), cx + 3.6, 1.9, 2.2, 0.14, 3.8, 2.6);
  open.rotation.y = 0.5;
  // Intérieur : caisses, fût et néon (statique, donc fusionné au bake).
  box(group, M('olive'), cx - 0.6, 0.5, -1.6, 1.1, 1.0, 1.1);
  box(group, M('olive'), cx - 0.5, 1.4, -1.55, 0.8, 0.7, 0.8);
  cylinder(group, M('barrelRed'), cx + 0.6, 0.45, 1.8, 0.3, 0.3, 0.9, 10);
  box(group, new THREE.MeshBasicMaterial({ color: 0xd8ecff }), cx, 3.6, 0, 0.18, 0.1, 3.4);
  decal(group, warningSignTexture('hangar', ['HANGAR 2']), cx + 2.85, 4.1, 0, 2.6, 1.3, { basic: true }).rotation.y = Math.PI / 2;
}

/** Tour de contrôle vitrée : radar tournant et gyrophare rouge au sommet. */
function controlTower(group, M, beacons) {
  const cx = -9.0;
  box(group, M('towerWhite'), cx, 2.2, 0, 3.6, 4.4, 3.6);
  box(group, M('towerStripe'), cx, 4.55, 0, 3.7, 0.3, 3.7);
  box(group, M('towerWhite'), cx, 0.9, 2.6, 1.6, 1.8, 1.4); // guérite d'entrée
  box(group, M('dark'), cx, 0.8, 3.32, 1.1, 1.4, 0.06);
  // Cabine vitrée : piliers + vitres sur les quatre faces.
  for (const [px, pz] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9], [0, -1.9], [0, 1.9], [-1.9, 0], [1.9, 0]]) {
    box(group, M('iron'), cx + px, 5.6, pz, 0.16, 1.7, 0.16);
  }
  for (const sz of [-1.92, 1.92]) box(group, M('glass'), cx, 5.6, sz, 3.9, 1.5, 0.06);
  for (const sx of [-1.92, 1.92]) box(group, M('glass'), cx + sx, 5.6, 0, 0.06, 1.5, 3.9);
  box(group, M('towerWhite'), cx, 6.55, 0, 4.4, 0.25, 4.4);
  // Mât + barre de radar tournant (exclue du bake, animée par MirageWorld).
  cylinder(group, M('iron'), cx, 7.2, 0, 0.08, 0.1, 1.3, 6);
  const radar = box(group, M('concrete'), cx, 7.85, 0, 2.3, 0.14, 0.3);
  radar.userData.bob = 7.85;
  group.userData.radar = radar;
  beaconLamp(group, M, cx + 1.9, 6.75, 1.9, 0xff2a1a, 0x3a100c, beacons, 0);
}

/** Camion-citerne « JET FUEL » et ses fûts. */
function fuelTruck(group, M) {
  const cx = -8.2;
  box(group, M('towerStripe'), cx, 0.75, 2.9, 1.9, 1.1, 1.7); // cabine
  box(group, M('glass'), cx, 1.05, 3.78, 1.7, 0.6, 0.08);
  box(group, M('iron'), cx, 0.45, 2.9, 1.95, 0.3, 1.75);
  cylinder(group, M('concrete'), cx, 1.05, -0.6, 0.95, 0.95, 4.4, 12).rotation.x = Math.PI / 2;
  box(group, M('towerStripe'), cx, 1.05, -0.6, 2.0, 0.25, 4.0);
  for (const [wx, wz] of [[-0.95, 2.9], [0.95, 2.9], [-0.95, -1.8], [0.95, -1.8], [-0.95, -0.2], [0.95, -0.2]]) {
    const wheel = cylinder(group, M('tire'), cx + wx, 0.32, wz, 0.32, 0.32, 0.22, 10);
    wheel.rotation.z = Math.PI / 2;
  }
  decal(group, warningSignTexture('fuel', ['JET FUEL']), cx + 1.0, 1.05, -0.6, 2.2, 1.1, { basic: true }).rotation.y = Math.PI / 2;
  cylinder(group, M('barrelYellow'), cx + 1.9, 0.45, -3.4, 0.3, 0.3, 0.9, 10);
  cylinder(group, M('barrelYellow'), cx + 1.2, 0.45, -3.9, 0.3, 0.3, 0.9, 10);
}

/** Dôme radar blanc et parabole tournée vers le ciel. */
function radarDome(group, M) {
  const cx = -9.4;
  box(group, M('concrete'), cx, 1.0, 0, 2.6, 2.0, 2.6);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M('towerWhite'));
  dome.position.set(cx, 2.0, 0);
  group.add(dome);
  cylinder(group, M('iron'), cx + 2.6, 1.1, 1.6, 0.12, 0.16, 2.2, 8);
  const dish = cylinder(group, M('concrete'), cx + 2.6, 2.45, 1.6, 0.85, 0.7, 0.14, 12);
  dish.rotation.x = -0.7;
  box(group, M('olive'), cx + 2.2, 0.4, -2.2, 1.0, 0.8, 1.0);
}

/** Jeep militaire au gyrophare orange, deux soldats à bord. */
function jeep(group, M, people, beacons) {
  const jeepGroup = new THREE.Group();
  jeepGroup.position.set(-7.6, 0, 0);
  jeepGroup.rotation.y = 0.12;
  group.add(jeepGroup);
  box(jeepGroup, M('uniform'), 0, 0.62, 0, 1.7, 0.55, 3.4);
  box(jeepGroup, M('dark'), 0, 0.35, 0, 1.5, 0.25, 3.2);
  box(jeepGroup, M('glass'), 0, 1.12, 0.7, 1.5, 0.5, 0.08);
  box(jeepGroup, M('uniform'), 0, 1.42, 0.7, 1.56, 0.08, 0.12);
  for (const [wx, wz] of [[-0.85, 1.1], [0.85, 1.1], [-0.85, -1.1], [0.85, -1.1]]) {
    const wheel = cylinder(jeepGroup, M('tire'), wx, 0.34, wz, 0.34, 0.34, 0.24, 10);
    wheel.rotation.z = Math.PI / 2;
  }
  box(jeepGroup, M('iron'), 0, 0.5, 1.78, 1.6, 0.18, 0.12);
  for (const hx of [-0.55, 0.55]) box(jeepGroup, new THREE.MeshBasicMaterial({ color: 0xf6ecc8 }), hx, 0.72, 1.76, 0.3, 0.16, 0.06);
  // Conducteur + passager : bustes en uniforme, casquettes.
  for (const px of [-0.42, 0.42]) {
    box(jeepGroup, M('uniform'), px, 1.1, -0.15, 0.4, 0.5, 0.3);
    box(jeepGroup, M('skinB'), px, 1.5, -0.15, 0.26, 0.28, 0.26);
    box(jeepGroup, M('cap'), px, 1.68, -0.15, 0.3, 0.1, 0.3);
  }
  beaconLamp(group, M, -7.6, 1.62, 0.7, 0xffa02a, 0x3a240c, beacons, 0.7);
  // Sentinelle à côté de la jeep.
  const guard = airman(M, 'guard');
  guard.position.set(-6.0, 0, -2.6);
  guard.rotation.y = Math.PI / 2;
  guard.userData.bob = 1.1;
  guard.userData.baseRotation = guard.rotation.y;
  guard.userData.baseY = 0;
  group.add(guard);
  people.push(guard);
}

/** Abri en béton, sacs de sable et projecteur mobile. */
function shelter(group, M) {
  const cx = -9.0;
  box(group, M('concrete'), cx, 1.1, 0, 4.4, 2.2, 6.4);
  box(group, M('tarmacDark'), cx, 2.32, 0, 4.7, 0.24, 6.7);
  box(group, M('dark'), cx + 2.25, 0.95, 0, 0.1, 1.7, 2.4);
  for (let i = 0; i < 4; i++) {
    box(group, M('uniformTan'), cx + 2.0, 0.18 + (i % 2) * 0.3, -2.2 + i * 0.75, 0.5, 0.28, 0.7);
    box(group, M('uniformTan'), cx + 2.0, 0.18 + ((i + 1) % 2) * 0.3, 2.4 - i * 0.7, 0.5, 0.28, 0.7);
  }
  box(group, M('iron'), cx + 3.6, 1.0, 2.8, 0.12, 2.0, 0.12);
  box(group, M('iron'), cx + 3.6, 2.05, 2.8, 0.7, 0.5, 0.5);
  box(group, new THREE.MeshBasicMaterial({ color: 0xfff2cc }), cx + 3.28, 2.05, 2.8, 0.06, 0.36, 0.36);
}

/* ------------------------------------------------------------------ */
/* Aviateurs et spectateurs — la foule du stage original                 */
/* ------------------------------------------------------------------ */

/**
 * Soldat / spectateur en voxels : `guard` (sentinelle au garde-à-vous),
 * `mechanic` (combinaison orange), `cheer` (soldat qui applaudit, bras levés),
 * `boxer` (boxeur torse nu, gants rouges), `officer` (uniforme bleu, casquette),
 * `guest` (spectatrice en robe rouge).
 */
function airman(M, pose, seed = 0) {
  const group = new THREE.Group();
  const skins = [M('skinA'), M('skinB'), M('skinC')];
  const skin = skins[seed % skins.length];
  const boxer = pose === 'boxer';
  const guest = pose === 'guest';
  const shirt = boxer ? skin : guest ? M('dressRed') : pose === 'mechanic' ? M('mechanic') : pose === 'officer' ? M('navy') : M('uniform');
  const pants = guest ? M('dressRed') : pose === 'mechanic' ? M('mechanic') : pose === 'officer' ? M('navy') : pose === 'cheer' && seed % 2 ? M('uniformTan') : M('uniform');
  // Jambes et chaussures (le boxeur a un short, la spectatrice une robe).
  if (guest) {
    box(group, pants, 0, 0.75, 0, 0.44, 1.0, 0.3);
  } else {
    for (const s of [-1, 1]) {
      const legH = boxer ? 0.62 : 0.86;
      box(group, boxer && s ? pants : pants, s * 0.11, legH / 2 + 0.14, 0, 0.17, legH, 0.2);
      box(group, M('iron'), s * 0.11, 0.07, 0.04, 0.19, 0.14, 0.3);
    }
    if (boxer) box(group, M('shortsRed'), 0, 0.82, 0, 0.42, 0.3, 0.26);
  }
  box(group, shirt, 0, 1.16, 0, 0.44, 0.66, 0.28);
  // Bras : levés pour applaudir (cheer, boxer), sinon le long du corps.
  const raised = pose === 'cheer' || pose === 'boxer';
  for (const s of [-1, 1]) {
    if (raised) {
      box(group, shirt, s * 0.3, 1.52, 0, 0.14, 0.5, 0.16);
      box(group, boxer ? M('shortsRed') : skin, s * 0.3, 1.82, 0, 0.15, 0.16, 0.17);
    } else {
      box(group, shirt, s * 0.29, 1.1, 0, 0.14, 0.6, 0.16);
      box(group, skin, s * 0.29, 0.72, 0, 0.13, 0.18, 0.15);
    }
  }
  box(group, skin, 0, 1.65, 0, 0.27, 0.3, 0.27);
  if (pose === 'officer' || pose === 'guard') {
    box(group, pose === 'officer' ? M('navy') : M('cap'), 0, 1.82, 0, 0.3, 0.1, 0.3);
  } else if (pose === 'cheer' && seed % 3 !== 0) {
    box(group, M('helmet'), 0, 1.8, 0, 0.32, 0.14, 0.32);
  } else if (pose === 'mechanic') {
    box(group, M('cap'), 0, 1.82, 0.02, 0.28, 0.09, 0.28);
  }
  return group;
}

/**
 * Gradins bondés face à la piste : trois rangées de bancs et leurs
 * spectateurs — soldats qui applaudissent, boxeur, officier, mécano et
 * spectatrice en robe rouge, comme la foule du stage de Guile.
 */
function stands(group, M, people, variant) {
  const cx = 8.6;
  box(group, M('iron'), cx, 0.5, 0, 0.3, 1.0, 7.6);
  box(group, M('iron'), cx + 2.4, 1.1, 0, 0.3, 2.2, 7.6);
  for (let r = 0; r < 3; r++) {
    box(group, M('concrete'), cx + r * 1.1, 0.62 + r * 0.62, 0, 1.15, 0.14, 7.4);
    box(group, M('towerStripe'), cx + r * 1.1, 0.32 + r * 0.62, 0, 1.15, 0.5, 7.4);
  }
  const cast = variant === 0
    ? ['cheer', 'cheer', 'boxer', 'cheer', 'officer', 'guest']
    : ['mechanic', 'cheer', 'guest', 'cheer', 'boxer', 'cheer'];
  cast.forEach((pose, i) => {
    const row = Math.min(2, Math.floor(i / 2));
    const person = airman(M, pose, i + variant * 6);
    person.position.set(cx - 0.1 + row * 1.1, 0.69 + row * 0.62, -2.9 + (i % 2) * 2.1 + row * 1.15);
    person.rotation.y = -Math.PI / 2 + (i % 2 ? 0.15 : -0.15);
    person.userData.bob = i * 0.9 + variant * 3.1;
    person.userData.baseRotation = person.rotation.y;
    person.userData.baseY = person.position.y;
    group.add(person);
    people.push(person);
  });
}

/** Palmier des abords de la base, version compacte. */
function palmTree(group, M, x, z, seed) {
  const height = 3.4 + (seed % 3) * 0.5;
  for (let t = 0; t < 4; t++) {
    const trunk = cylinder(group, M('trunk'), x, (t + 0.5) * (height / 4), z, 0.14 - t * 0.015, 0.17 - t * 0.015, height / 4 + 0.05, 6);
    trunk.rotation.z = 0.05 * (seed % 2 ? 1 : -1);
  }
  for (let f = 0; f < 7; f++) {
    const angle = (f / 7) * Math.PI * 2 + seed;
    const frond = box(group, M('palmLeaf'), 0, 0, 0, 1.9, 0.06, 0.4);
    frond.rotation.set(0, -angle, -0.5 - (f % 2) * 0.15);
    frond.position.set(x + Math.cos(angle) * 0.85, height + 0.1 - (f % 2) * 0.2, z + Math.sin(angle) * 0.85);
  }
}

/** L'immense drapeau américain sur son mât, face à la piste. */
function giantFlag(group, M) {
  const mx = 9.4;
  cylinder(group, M('concrete'), mx, 0.25, 0.6, 0.3, 0.36, 0.5, 8);
  cylinder(group, M('iron'), mx, 4.6, 0.6, 0.07, 0.1, 9.2, 8);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), M('barrierRed'));
  ball.position.set(mx, 9.3, 0.6);
  group.add(ball);
  // La bannière flotte le long de la piste (exclue du bake, animée par MirageWorld).
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.25), new THREE.MeshBasicMaterial({ map: usFlagTexture(), side: THREE.DoubleSide }));
  flag.position.set(mx, 7.7, -1.35);
  flag.rotation.y = Math.PI / 2;
  flag.userData.bob = 0.6;
  flag.userData.baseRotation = flag.rotation.y;
  group.add(flag);
  group.userData.flag = flag;
  // Projecteurs au sol qui éclairent l'étendard.
  for (const sz of [-2.6, 0.4]) {
    box(group, M('iron'), mx - 1.6, 0.2, sz, 0.4, 0.4, 0.4);
    box(group, new THREE.MeshBasicMaterial({ color: 0xfff2cc }), mx - 1.6, 0.42, sz, 0.3, 0.1, 0.3);
  }
}

/** Panneau « SONIC BOOM » jaune/noir, clin d'œil à l'attaque de Guile. */
function sonicSign(group, M) {
  for (const sz of [-1.8, 1.8]) box(group, M('iron'), 9.0, 1.1, sz, 0.18, 2.2, 0.18);
  box(group, M('iron'), 9.0, 2.2, 0, 0.12, 0.12, 3.9);
  decal(group, warningSignTexture('sonic', ['SONIC BOOM']), 8.9, 1.35, 0, 3.4, 1.7, { basic: true }).rotation.y = -Math.PI / 2;
  cylinder(group, M('barrelRed'), 6.6, 0.45, -2.6, 0.3, 0.3, 0.9, 10);
  cylinder(group, M('barrelYellow'), 7.3, 0.45, -2.2, 0.3, 0.3, 0.9, 10);
  box(group, M('olive'), 9.6, 0.4, 2.8, 1.0, 0.8, 1.0);
}

/** Pylône de projecteurs et groupe électrogène. */
function floodlight(group, M) {
  const px = 9.2;
  cylinder(group, M('iron'), px, 3.0, 0, 0.12, 0.18, 6.0, 8);
  box(group, M('iron'), px, 6.05, 0, 0.16, 0.16, 2.6);
  for (const sz of [-0.95, -0.32, 0.32, 0.95]) {
    box(group, M('iron'), px - 0.2, 5.8, sz, 0.4, 0.5, 0.5);
    box(group, new THREE.MeshBasicMaterial({ color: 0xfff6da }), px - 0.42, 5.8, sz, 0.06, 0.36, 0.36);
  }
  box(group, M('olive'), px - 0.4, 0.55, 3.0, 1.6, 1.1, 1.1);
  box(group, M('dark'), px - 0.4, 0.6, 2.42, 1.2, 0.5, 0.06);
}

/** Camion militaire bâché et son chargement de caisses. */
function armyTruck(group, M) {
  const cx = 8.4;
  box(group, M('uniform'), cx, 0.85, 2.9, 1.9, 1.3, 1.7);
  box(group, M('glass'), cx, 1.2, 3.78, 1.7, 0.6, 0.08);
  box(group, M('tent'), cx, 1.15, -0.6, 2.0, 1.7, 4.6);
  box(group, M('uniform'), cx, 0.4, -0.6, 1.9, 0.35, 4.7);
  for (const [wx, wz] of [[-0.95, 2.9], [0.95, 2.9], [-0.95, -1.6], [0.95, -1.6], [-0.95, 0.0], [0.95, 0.0]]) {
    const wheel = cylinder(group, M('tire'), cx + wx, 0.34, wz, 0.34, 0.34, 0.24, 10);
    wheel.rotation.z = Math.PI / 2;
  }
  box(group, M('olive'), cx - 2.1, 0.45, -3.2, 0.9, 0.9, 0.9);
  box(group, M('olive'), cx - 2.0, 1.25, -3.15, 0.7, 0.6, 0.7);
}

/** Décor de liaison : caisses, fûts, cônes et palmier selon le côté. */
function fillerProps(group, M, s, slot) {
  if (s === STANDS_SIDE) {
    box(group, M('olive'), 8.8, 0.45, -2.4, 0.9, 0.9, 0.9);
    cylinder(group, M('barrelRed'), 9.5, 0.45, 1.8, 0.3, 0.3, 0.9, 10);
    palmTree(group, M, 11.5, 3.4, slot);
  } else {
    box(group, M('olive'), -8.8, 0.45, 2.2, 0.9, 0.9, 0.9);
    box(group, M('olive'), -8.7, 1.25, 2.25, 0.7, 0.6, 0.7);
    cylinder(group, M('barrelYellow'), -9.5, 0.45, -1.8, 0.3, 0.3, 0.9, 10);
  }
  trafficCone(group, M, s * 6.8, slot === 0 ? 0.4 : -0.6);
}

/* ------------------------------------------------------------------ */
/* Segments des deux côtés                                              */
/* ------------------------------------------------------------------ */

/**
 * Zone opérations (gauche de la piste, x < 0) : hangar, F-16, tour de
 * contrôle, citerne, dôme radar, jeep et abri — dix segments de 11 m.
 */
export function airbaseOps(index) {
  const group = segmentGroup(index);
  const M = palette();
  const people = [];
  const beacons = [];
  const slot = index % AIRBASE_SEGMENT_COUNT;
  const callouts = { 1: 'hangar', 2: 'falcon', 3: 'tower', 4: 'fuel', 6: 'radar', 7: 'jeep', 8: 'shelter' };
  sideBase(group, M, OPS_SIDE, index);
  if (slot === 1) hangar(group, M);
  else if (slot === 2) fighterJet(group, M, people, beacons);
  else if (slot === 3) controlTower(group, M, beacons);
  else if (slot === 4) fuelTruck(group, M);
  else if (slot === 6) radarDome(group, M);
  else if (slot === 7) jeep(group, M, people, beacons);
  else if (slot === 8) shelter(group, M);
  else if (slot !== AIRBASE_GATE_INDEX) fillerProps(group, M, OPS_SIDE, slot);
  group.userData.side = 'ops';
  group.userData.callout = callouts[slot] ?? (slot === AIRBASE_GATE_INDEX ? 'gate' : 'apron');
  if (people.length) group.userData.people = people;
  if (beacons.length) group.userData.airbaseBeacons = beacons;
  return group;
}

/**
 * Zone public (droite de la piste, x > 0) : drapeau géant, deux vagues de
 * gradins, panneau SONIC BOOM, palmiers, projecteurs et camion bâché.
 */
export function airbaseStands(index) {
  const group = segmentGroup(index);
  const M = palette();
  const people = [];
  const slot = index % AIRBASE_SEGMENT_COUNT;
  const callouts = { 1: 'flag', 2: 'stands', 3: 'sonic', 4: 'palms', 6: 'stands', 7: 'floodlight', 8: 'truck' };
  sideBase(group, M, STANDS_SIDE, index);
  if (slot === 1) giantFlag(group, M);
  else if (slot === 2) stands(group, M, people, 0);
  else if (slot === 3) sonicSign(group, M);
  else if (slot === 4) {
    palmTree(group, M, 10.8, -2.6, 3);
    palmTree(group, M, 12.0, 1.8, 7);
    box(group, M('olive'), 8.6, 0.45, 0.2, 0.9, 0.9, 0.9);
  } else if (slot === 6) stands(group, M, people, 1);
  else if (slot === 7) floodlight(group, M);
  else if (slot === 8) armyTruck(group, M);
  else if (slot !== AIRBASE_GATE_INDEX) fillerProps(group, M, STANDS_SIDE, slot);
  group.userData.side = 'stands';
  group.userData.callout = callouts[slot] ?? (slot === AIRBASE_GATE_INDEX ? 'gate' : 'apron');
  if (people.length) group.userData.people = people;
  return group;
}

/* ------------------------------------------------------------------ */
/* Le portique et l'horizon                                             */
/* ------------------------------------------------------------------ */

/**
 * Portique « ★ THUNDER AIRBASE ★ » enjambant le taxiway une fois par boucle :
 * pylônes treillis hors de la piste, poutre et banderole à plus d'1 m
 * au-dessus de la caméra, gyrophare orange au sommet — on passe dessous
 * au galop sans que rien ne masque jamais la piste.
 */
export function airbaseGate(index = AIRBASE_GATE_INDEX) {
  const group = segmentGroup(index);
  const M = palette();
  const beacons = [];
  for (const sx of [-1, 1]) {
    const px = sx * 5.4;
    box(group, M('iron'), px, 4.5, 0, 0.5, 9.0, 0.5);
    for (let k = 0; k < 6; k++) {
      const cross = box(group, M('iron'), px, 1.0 + k * 1.4, 0, 0.56, 0.12, 0.12);
      cross.rotation.z = (k % 2 ? -1 : 1) * 0.6;
    }
    box(group, M('concrete'), px, 0.2, 0, 1.0, 0.4, 1.0);
    box(group, M('barrierWhite'), px, 3.0, 0.28, 0.54, 1.2, 0.04);
    box(group, M('barrierRed'), px, 1.6, 0.28, 0.54, 1.2, 0.04);
  }
  box(group, M('iron'), 0, GATE_BEAM_Y, 0, 11.6, 0.5, 0.5);
  for (let k = 0; k < 8; k++) {
    const cross = box(group, M('iron'), -4.8 + k * 1.37, GATE_BEAM_Y, 0, 0.12, 0.12, 0.56);
    cross.rotation.x = (k % 2 ? -1 : 1) * 0.6;
  }
  decal(group, gateSignTexture(), 0, GATE_BEAM_Y - 0.85, 0, 8.6, 1.05, { basic: true });
  beaconLamp(group, M, 0, GATE_BEAM_Y + 0.35, 0, 0xffa02a, 0x3a240c, beacons, 0.35);
  group.userData.callout = 'gate';
  group.userData.airbaseBeacons = beacons;
  return group;
}

/**
 * L'horizon de la base (statique, noyé dans la brume) : hangars lointains,
 * tour lointaine, F-16 en vol avec sa traînée blanche et nuages d'été.
 */
export function makeAirbaseSkyline() {
  const group = new THREE.Group();
  const M = palette();
  const cloud = new THREE.MeshBasicMaterial({ color: 0xf4f8ff });
  for (const [cx, w, h] of [[-24, 9, 5], [22, 11, 6]]) {
    box(group, M('hangar'), cx, h / 2 - 0.5, -62, w, h, 6);
    box(group, M('hangarDark'), cx, h - 0.4, -62, w + 0.6, 0.5, 6.4);
  }
  box(group, M('towerWhite'), -14, 4.5, -70, 3, 10, 3);
  box(group, M('glass'), -14, 9.2, -70, 3.6, 1.6, 3.6);
  box(group, M('towerWhite'), -14, 10.2, -70, 4, 0.3, 4);
  // F-16 en vol, traînée blanche derrière lui.
  const flyer = new THREE.Group();
  flyer.position.set(12, 17, -64);
  flyer.rotation.y = -0.5;
  group.add(flyer);
  const flyBody = cylinder(flyer, M('jetGrey'), 0, 0, 0, 0.35, 0.5, 5.2, 8);
  flyBody.rotation.x = Math.PI / 2;
  box(flyer, M('canopy'), 0, 0.45, 1.2, 0.4, 0.35, 1.1);
  for (const sx of [-1, 1]) {
    const wing = box(flyer, M('jetGrey'), sx * 1.5, 0, -0.4, 2.4, 0.08, 1.2);
    wing.rotation.y = -sx * 0.42;
  }
  box(flyer, M('jetGrey'), 0, 0.8, -2.2, 0.08, 1.1, 0.9);
  box(group, M('markingWhite'), 6.2, 16.4, -61.5, 0.18, 0.18, 9);
  // Nuages d'été.
  for (const [nx, ny, nz, s] of [[-30, 24, -58, 1.4], [-8, 28, -70, 1.8], [16, 25, -60, 1.2], [34, 29, -72, 1.6], [0, 22, -52, 1.0]]) {
    box(group, cloud, nx, ny, nz, 7 * s, 1.6 * s, 2.5);
    box(group, cloud, nx + 2.4 * s, ny + 1.1 * s, nz, 3.6 * s, 1.3 * s, 2.0);
    box(group, cloud, nx - 2.6 * s, ny + 0.7 * s, nz, 3.0 * s, 1.1 * s, 1.8);
  }
  return group;
}

/** Utilitaire des tests : aucun décor ne déborde sur les voies (|x| < 4,2) sous la caméra. */
export const AIRBASE_TRACK_EDGE = TRACK_EDGE;
