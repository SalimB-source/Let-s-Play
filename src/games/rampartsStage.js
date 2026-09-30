import * as THREE from 'three';

/*
 * ZONE 07 · REMPARTS D’OCRE — hommage à de_dust2 (Counter-Strike) pour Mirage Rush.
 *
 * La piste reprend le MID de de_dust2, remonté depuis le spawn T comme sur le
 * radar : le site B défile à GAUCHE, le site A à DROITE. Chaque côté enchaîne
 * ses callouts les plus célèbres sur une boucle de 110 m (10 segments de 11 m,
 * recyclés par MirageWorld comme ceux des autres stages) :
 *
 *   · site A (droite) : les portes bleues de Long, le « Blue » et ses barils,
 *     la voiture et le Pit, la plate-forme du site A (caisses, C4 qui clignote,
 *     panneau « A »), le graffiti de l'oie qui a donné son nom à Goose,
 *     l'escalier de Catwalk / Short et le palmier du spawn CT ;
 *   · site B (gauche) : l'entrée des tunnels sous un graffiti « RUSH B », le
 *     mur troué des tunnels, la plate-forme du site B (big box bâchée, double
 *     stack, C4, panneau « B »), la voiture de B et son grillage, la fenêtre,
 *     les portes B et le closet ;
 *   · entre deux boucles : paraboles murales, lanternes, porte sous auvent et
 *     descente vers les tunnels du bas.
 *
 * Sur la piste, les obstacles du Mid : la « Xbox » (caisse à croisillons en X,
 * coiffée d'une petite caisse bâchée) à contourner, et le muret criblé
 * d'impacts à sauter. Une fois par boucle, on franchit au galop les grandes
 * portes du Mid : leur arche passe au-dessus de la caméra, rien ne masque
 * jamais la piste.
 */

export const RAMPARTS_SEGMENT_LENGTH = 11;
export const RAMPARTS_SEGMENT_COUNT = 10;
/** Segment de la boucle où se dressent les portes du Mid (visibles dès le départ). */
export const RAMPARTS_GATE_INDEX = 5;
/** Comme sur le radar de de_dust2 en remontant le Mid : A à droite, B à gauche. */
export const SITE_A_SIDE = 1;
export const SITE_B_SIDE = -1;

/** Bords de la piste jouable (4 voies, TRACK_WIDTH 8,4). */
const TRACK_EDGE = 4.2;
/** Face intérieure des remparts qui bordent le Mid, de chaque côté. */
const WALL_FACE = 10.4;
const WALL_THICKNESS = 1.2;

/** Arche des portes du Mid : sa clé passe à ~2 m au-dessus de la caméra. */
export const MID_DOORS_ARCH = Object.freeze({ halfWidth: 4.95, spring: 4.3, top: 9.25 });

const PALETTE = Object.freeze({
  wall: 0xd6a369, // pisé ocre des remparts
  wallLight: 0xe8c796, // enduit clair, tours
  wallShade: 0xb98552, // enduit écaillé, à l'ombre
  plinth: 0xa9784a,
  coping: 0xecd3a4, // chaperons et encadrements en pierre claire
  merlon: 0xcf8b50, // petits merlons arrondis, comme sur de_dust2
  ground: 0xd8b582,
  groundDark: 0xc49c68,
  curb: 0xe6d0a2,
  wood: 0xc9ab7b, // caisses en bois pâle
  woodDark: 0x76593b,
  lid: 0x95b8b4, // couvercles bleu-vert des caisses du site A
  tarp: 0xadbb8c, // bâche vert pâle (big box, double stack)
  doorGrey: 0x8f887c, // portes grises du Mid et de B
  doorGreyDark: 0x625c52,
  doorBlue: 0x3f78a8, // portes bleues de Long
  doorBlueDark: 0x2c5a82,
  iron: 0x302d2a,
  container: 0x2f6aa3, // le « Blue »
  containerDark: 0x24527f,
  rust: 0x8b4f2b,
  carRed: 0x9a4a33, // voiture rouillée du site A
  carBlue: 0x7f93a0, // voiture calcinée du site B
  glass: 0x27313a,
  tire: 0x1f1d1c,
  barrelBlue: 0x2c67a3,
  barrelRed: 0xa33f2c,
  palmTrunk: 0x86673f,
  palmLeaf: 0x587f35,
  palmLeafLight: 0x6f9642,
  dark: 0x1c1712, // intérieur des tunnels et des portes
  c4: 0x6b6a45,
  tape: 0x2f2f2c,
  screen: 0x3c6b3a,
  wireRed: 0xc0392b,
  wireBlue: 0x2e6fb5,
});

const material = (color, roughness = 0.92) => new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });

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

/** Petit générateur pseudo-aléatoire déterministe : un segment garde son décor. */
function seeded(seed) {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* Textures peintes (panneaux de site, graffitis, grillage)            */
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

/** Panneau de bombsite façon CS2 : plaque blanche, grande lettre rouge. */
function siteSignTexture(letter) {
  return canvasTexture(`ramparts-site-${letter}`, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#f2ede1';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d8cfbb';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#cf2f27';
    ctx.font = '900 200px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, w / 2, h / 2 + 10);
  });
}

/** Le mème indissociable du site B, bombé en rouge au-dessus des tunnels. */
function rushBTexture() {
  return canvasTexture('ramparts-rush-b', 512, 160, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2 - 24, h / 2);
    ctx.rotate(-0.05);
    ctx.fillStyle = '#c3231c';
    ctx.font = '900 104px Impact, "Arial Black", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RUSH B', 0, 0);
    // Coulures de bombe sous les lettres.
    for (const [x, length] of [[-150, 30], [-72, 44], [8, 24], [96, 38], [150, 28]]) ctx.fillRect(x, 34, 5, length);
    ctx.restore();
    // Flèche peinte qui plonge vers l'entrée des tunnels.
    ctx.fillStyle = '#c3231c';
    ctx.beginPath();
    ctx.moveTo(452, 30);
    ctx.lineTo(482, 30);
    ctx.lineTo(482, 96);
    ctx.lineTo(502, 96);
    ctx.lineTo(467, 146);
    ctx.lineTo(432, 96);
    ctx.lineTo(452, 96);
    ctx.closePath();
    ctx.fill();
  });
}

/** Le graffiti d'oie qui a donné son nom au coin « Goose » du site A. */
function gooseTexture() {
  return canvasTexture('ramparts-goose', 256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f4efe2';
    ctx.strokeStyle = '#f4efe2';
    // Corps et queue.
    ctx.beginPath();
    ctx.ellipse(116, 168, 72, 40, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(56, 158);
    ctx.lineTo(24, 132);
    ctx.lineTo(60, 184);
    ctx.closePath();
    ctx.fill();
    // Long cou et tête.
    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(162, 150);
    ctx.quadraticCurveTo(194, 112, 176, 70);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(180, 60, 21, 0, Math.PI * 2);
    ctx.fill();
    // Bec et pattes orange.
    ctx.fillStyle = '#ee8a24';
    ctx.beginPath();
    ctx.moveTo(196, 52);
    ctx.lineTo(234, 62);
    ctx.lineTo(196, 72);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ee8a24';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(104, 204);
    ctx.lineTo(98, 240);
    ctx.lineTo(82, 246);
    ctx.moveTo(134, 204);
    ctx.lineTo(140, 240);
    ctx.lineTo(124, 246);
    ctx.stroke();
    // Œil et aile.
    ctx.fillStyle = '#1b1a18';
    ctx.beginPath();
    ctx.arc(184, 55, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b8b09e';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(84, 160);
    ctx.quadraticCurveTo(122, 136, 158, 166);
    ctx.stroke();
  });
}

/** Maille losangée du grillage de B (plaquée avec alphaTest). */
function fenceTexture() {
  const texture = canvasTexture('ramparts-fence', 64, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#9aa0a4';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, h);
    ctx.moveTo(w, 0);
    ctx.lineTo(0, h);
    ctx.stroke();
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 5);
  return texture;
}

/**
 * Panneau ou graffiti plaqué sur une face tournée vers le cavalier (+z).
 * `basic` = panneau imprimé (non éclairé) ; sinon peinture sur le mur.
 */
function decal(parent, texture, x, y, z, w, h, { basic = false, transparent = false } = {}) {
  const Material = basic ? THREE.MeshBasicMaterial : THREE.MeshStandardMaterial;
  const options = { map: texture, side: THREE.DoubleSide, transparent, depthWrite: !transparent };
  if (!basic) options.roughness = 0.95;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new Material(options));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function siteSign(parent, M, letter, x, y, z) {
  box(parent, M('iron'), x, y, z - 0.03, 2.08, 2.08, 0.05);
  const sign = decal(parent, siteSignTexture(letter), x, y, z, 1.96, 1.96, { basic: true });
  sign.userData.siteLetter = letter;
  return sign;
}

/* ------------------------------------------------------------------ */
/* Briques de construction                                             */
/* ------------------------------------------------------------------ */

/** Petit merlon arrondi (dé de pierre coiffé d'un chapeau conique). */
function merlon(parent, M, x, y, z) {
  box(parent, M('merlon'), x, y + 0.2, z, 0.42, 0.4, 0.56);
  cylinder(parent, M('merlon'), x, y + 0.56, z, 0.02, 0.27, 0.32, 6);
}

/**
 * Mur perpendiculaire à la piste, face avant tournée vers le cavalier (+z),
 * entre xMin et xMax (coordonnées monde), éventuellement percé d'une baie
 * (porte, tunnel, trou…) décrite par `opening` : { cx, w, h, arch }.
 * Une baie posée au sol fait partie du contour ; une baie « en l'air »
 * (`y0` > 0) est un vrai trou.
 */
function crossWall(parent, mat, { xMin, xMax, zFront, depth = 1, height, opening = null, merlons = null, M = null }) {
  const shape = new THREE.Shape();
  if (opening && !(opening.y0 > 0)) {
    const { cx, w, h, arch = 0 } = opening;
    shape.moveTo(xMin, 0);
    shape.lineTo(cx - w / 2, 0);
    if (arch > 0) {
      shape.lineTo(cx - w / 2, h - arch);
      shape.absarc(cx, h - arch, arch, Math.PI, 0, true);
    } else {
      shape.lineTo(cx - w / 2, h);
      shape.lineTo(cx + w / 2, h);
    }
    shape.lineTo(cx + w / 2, 0);
    shape.lineTo(xMax, 0);
  } else {
    shape.moveTo(xMin, 0);
    shape.lineTo(xMax, 0);
  }
  shape.lineTo(xMax, height);
  shape.lineTo(xMin, height);
  shape.closePath();
  if (opening?.y0 > 0) {
    const hole = new THREE.Path();
    const points = opening.points;
    hole.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) hole.lineTo(points[i][0], points[i][1]);
    hole.closePath();
    shape.holes.push(hole);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 });
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.z = zFront - depth;
  parent.add(mesh);
  if (M) {
    box(parent, M('coping'), (xMin + xMax) / 2, height + 0.08, zFront - depth / 2, xMax - xMin + 0.12, 0.16, depth + 0.16);
    if (merlons) {
      const count = Math.max(2, Math.round((xMax - xMin) / 1.1));
      for (let k = 0; k < count; k++) {
        const x = xMin + (k + 0.5) * ((xMax - xMin) / count);
        merlon(parent, M, x, height + 0.16, zFront - depth / 2);
      }
    }
  }
  return mesh;
}

/** Vantail de porte à planches et ferrures ; charnière à l'origine, s'étend vers +x. */
function doorLeaf(M, colorKey, darkKey, width, height) {
  const leaf = new THREE.Group();
  box(leaf, M(colorKey), width / 2, height / 2, 0, width, height, 0.12);
  for (const face of [1, -1]) {
    for (let k = 1; k < 5; k++) box(leaf, M(darkKey), (k * width) / 5, height / 2, face * 0.065, 0.035, height - 0.12, 0.02);
    for (const y of [height * 0.2, height * 0.8]) box(leaf, M('iron'), width / 2, y, face * 0.07, width - 0.12, 0.11, 0.025);
  }
  return leaf;
}

/**
 * Caisse façon de_dust2 : bois pâle, cornières sombres ; options : croisillons
 * en X (la « Xbox »), couvercle coloré (caisses du site A) ou bâche (B).
 */
function crate(parent, M, x, y, z, w, h, d, { brace = false, lid = false, tarp = false, rotation = 0 } = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotation;
  parent.add(group);
  box(group, M('wood'), 0, h / 2, 0, w - 0.04, h - 0.02, d - 0.04);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) box(group, M('woodDark'), sx * (w / 2 - 0.05), h / 2, sz * (d / 2 - 0.05), 0.1, h, 0.1);
  }
  for (const yy of [0.05, h - 0.05]) {
    for (const sz of [-1, 1]) box(group, M('woodDark'), 0, yy, sz * (d / 2 - 0.035), w, 0.1, 0.07);
    for (const sx of [-1, 1]) box(group, M('woodDark'), sx * (w / 2 - 0.035), yy, 0, 0.07, 0.1, d);
  }
  if (brace) {
    const front = Math.hypot(w - 0.2, h - 0.2);
    const frontAngle = Math.atan2(h - 0.2, w - 0.2);
    for (const sz of [-1, 1]) {
      for (const sign of [-1, 1]) {
        const strut = box(group, M('woodDark'), 0, h / 2, sz * (d / 2 - 0.01), front, 0.09, 0.05);
        strut.rotation.z = sign * frontAngle;
      }
    }
    const side = Math.hypot(d - 0.2, h - 0.2);
    const sideAngle = Math.atan2(h - 0.2, d - 0.2);
    for (const sx of [-1, 1]) {
      for (const sign of [-1, 1]) {
        const strut = box(group, M('woodDark'), sx * (w / 2 - 0.01), h / 2, 0, 0.05, 0.09, side);
        strut.rotation.x = sign * sideAngle;
      }
    }
  }
  if (lid) box(group, M('lid'), 0, h + 0.05, 0, w + 0.06, 0.1, d + 0.06);
  if (tarp) {
    box(group, M('tarp'), 0, h + 0.04, 0, w + 0.12, 0.08, d + 0.12);
    for (const sz of [-1, 1]) box(group, M('tarp'), 0, h - 0.2, sz * (d / 2 + 0.05), w + 0.1, 0.44, 0.04);
  }
  return group;
}

function barrel(parent, M, x, z, colorKey, { y = 0, lying = false, rotation = 0 } = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotation;
  parent.add(group);
  const holder = new THREE.Group();
  if (lying) {
    holder.rotation.x = Math.PI / 2;
    holder.position.y = 0.3;
  }
  group.add(holder);
  const baseY = lying ? 0 : 0.45;
  cylinder(holder, M(colorKey), 0, baseY, 0, 0.3, 0.3, 0.9, 12);
  for (const dy of [-0.3, 0.3]) cylinder(holder, M('iron'), 0, baseY + dy, 0, 0.312, 0.312, 0.05, 12);
  return group;
}

function palm(parent, M, x, z, { height = 5.6, lean = 0.1, twist = 0 } = {}) {
  const segments = 5;
  const step = height / segments;
  let px = x;
  let py = 0;
  for (let s = 0; s < segments; s++) {
    const trunk = cylinder(parent, M('palmTrunk'), px, py + step / 2, z, 0.15 - s * 0.012, 0.2 - s * 0.012, step + 0.04, 6);
    trunk.rotation.z = -lean * Math.sign(x || 1);
    px += Math.sin(lean) * step * Math.sign(x || 1);
    py += Math.cos(lean) * step;
  }
  const fronds = 8;
  for (let f = 0; f < fronds; f++) {
    const angle = twist + (f / fronds) * Math.PI * 2;
    const droop = 0.35 + (f % 3) * 0.12;
    const length = 2.1 + (f % 2) * 0.35;
    const frond = box(parent, M(f % 2 ? 'palmLeaf' : 'palmLeafLight'), 0, 0, 0, length, 0.05, 0.46);
    frond.rotation.set(0, -angle, -droop);
    const reach = (length / 2) * Math.cos(droop);
    frond.position.set(px + Math.cos(angle) * reach, py + 0.12 - (length / 2) * Math.sin(droop), z + Math.sin(angle) * reach);
  }
  cylinder(parent, M('palmTrunk'), px, py + 0.05, z, 0.22, 0.18, 0.3, 6);
}

/** Câble électrique qui pend entre deux points (quatre tronçons). */
function sagWire(parent, M, from, to, sag = 0.5) {
  const points = [];
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    points.push(new THREE.Vector3(
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t - Math.sin(Math.PI * t) * sag,
      from[2] + (to[2] - from[2]) * t,
    ));
  }
  for (let i = 0; i < 4; i++) {
    const a = points[i];
    const b = points[i + 1];
    const length = a.distanceTo(b);
    const wire = cylinder(parent, M('iron'), (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, 0.03, 0.03, length, 4);
    wire.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  }
}

/** Parabole satellite plantée sur un toit (il y en a partout sur de_dust2). */
function dish(parent, M, x, y, z, facing) {
  cylinder(parent, M('iron'), x, y + 0.3, z, 0.03, 0.03, 0.6, 4);
  const plate = cylinder(parent, M('coping'), x, y + 0.72, z, 0.42, 0.34, 0.08, 10);
  plate.rotation.z = facing * 1.1;
}

/** Parabole fixée au rempart, tournée vers la piste et le cavalier. */
function wallDish(parent, M, s, y, z) {
  const face = s * WALL_FACE;
  box(parent, M('iron'), face - s * 0.28, y, z, 0.56, 0.06, 0.06);
  const direction = new THREE.Vector3(-s, 0.25, 0.7).normalize();
  const center = new THREE.Vector3(face - s * 0.62, y + 0.05, z + 0.1);
  const plate = cylinder(parent, M('coping'), center.x, center.y, center.z, 0.5, 0.4, 0.08, 12);
  plate.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  const feed = center.clone().addScaledVector(direction, 0.32);
  const arm = cylinder(parent, M('iron'), feed.x, feed.y, feed.z, 0.02, 0.02, 0.62, 4);
  arm.quaternion.copy(plate.quaternion);
}

/** Lanterne murale sur potence. */
function wallLamp(parent, M, s, y, z) {
  const face = s * WALL_FACE;
  box(parent, M('iron'), face - s * 0.22, y + 0.22, z, 0.44, 0.06, 0.06);
  box(parent, M('iron'), face - s * 0.42, y + 0.12, z, 0.04, 0.2, 0.04);
  box(parent, M('coping'), face - s * 0.42, y - 0.1, z, 0.24, 0.3, 0.24);
  box(parent, M('iron'), face - s * 0.42, y + 0.07, z, 0.3, 0.05, 0.3);
}

/**
 * Tronçons de liaison (avant et après la boucle) : paraboles, lanternes,
 * porte sous auvent côté A, descente vers les tunnels du bas côté B.
 */
function fillerProps(group, M, s, slot) {
  if (s === SITE_A_SIDE) {
    if (slot === 0) {
      wallDish(group, M, s, 3.3, -2.3);
      wallLamp(group, M, s, 3.0, 1.2);
      crate(group, M, 9.35, 0, 2.3, 1.1, 1.0, 1.1, { rotation: -0.12, tarp: true });
      crate(group, M, 9.45, 1.0, 2.25, 0.8, 0.7, 0.8, { rotation: 0.2 });
    } else {
      // Petite porte de bois sous un auvent de toile.
      box(group, M('coping'), WALL_FACE - 0.03, 1.3, -1.2, 0.08, 2.6, 1.6);
      box(group, M('dark'), WALL_FACE - 0.05, 1.2, -1.2, 0.06, 2.4, 1.3);
      for (let k = 0; k < 4; k++) box(group, M('doorGrey'), WALL_FACE - 0.08, 1.2, -1.2 - 0.49 + k * 0.33, 0.04, 2.3, 0.28);
      const awning = box(group, M('tarp'), WALL_FACE - 0.55, 2.95, -1.2, 1.1, 0.06, 2.2);
      awning.rotation.z = s * 0.32;
      box(group, M('woodDark'), WALL_FACE - 1.05, 1.39, -2.25, 0.08, 2.78, 0.08);
      box(group, M('woodDark'), WALL_FACE - 1.05, 1.39, -0.15, 0.08, 2.78, 0.08);
      wallDish(group, M, s, 3.7, 2.8);
      barrel(group, M, 9.7, 3.9, 'barrelRed');
    }
  } else if (slot === 0) {
    wallDish(group, M, s, 3.5, 1.6);
    wallLamp(group, M, s, 3.1, -2.4);
    barrel(group, M, -9.5, 1.2, 'barrelBlue');
    crate(group, M, -9.3, 0, -1.1, 1.0, 0.95, 1.0, { rotation: 0.25, brace: true });
  } else {
    // Descente vers les tunnels du bas : baie basse et sombre, marches qui s'enfoncent.
    box(group, M('coping'), -(WALL_FACE - 0.04), 1.25, 0.6, 0.1, 2.5, 2.3);
    box(group, M('dark'), -(WALL_FACE - 0.07), 1.1, 0.6, 0.06, 2.2, 1.9);
    box(group, M('wallShade'), -(WALL_FACE - 0.1), 2.6, 0.6, 0.2, 0.22, 2.6);
    for (let k = 0; k < 3; k++) box(group, M('wallShade'), -(WALL_FACE - 0.35 - k * 0.3), -0.04 - k * 0.001, 0.6, 0.3, 0.04 + k * 0.01, 1.9 - k * 0.2);
    wallLamp(group, M, s, 3.0, -1.2);
    crate(group, M, -9.4, 0, 3.4, 1.0, 0.95, 1.0, { rotation: -0.2 });
  }
}

/* ------------------------------------------------------------------ */
/* C4 : la bombe posée sur chaque site, LED rouge qui clignote          */
/* ------------------------------------------------------------------ */

export const BOMB_BEEP_PERIOD = 1.1;
const BOMB_LED_ON = 0xff2a1a;
const BOMB_LED_OFF = 0x3a100c;

/** LED allumée pendant un bref éclair à chaque « bip » de la bombe. */
export function bombLedOn(seconds) {
  const phase = ((seconds % BOMB_BEEP_PERIOD) + BOMB_BEEP_PERIOD) % BOMB_BEEP_PERIOD;
  return phase < 0.16;
}

/** Fait clignoter les C4 d'un segment ; animations réduites : LED fixe. */
export function updateBombBlink(bombs, seconds, reduceMotion = false) {
  if (!bombs?.length) return;
  for (const bomb of bombs) {
    const on = reduceMotion || bombLedOn(seconds + bomb.offset);
    if (bomb.on === on) continue;
    bomb.on = on;
    bomb.led.material.color.setHex(on ? BOMB_LED_ON : BOMB_LED_OFF);
    bomb.halo.visible = on;
  }
}

function plantedBomb(parent, M, x, y, z, rotation, offset) {
  const bomb = new THREE.Group();
  bomb.position.set(x, y, z);
  bomb.rotation.y = rotation;
  bomb.scale.setScalar(1.7);
  parent.add(bomb);
  for (const dz of [-0.11, 0, 0.11]) {
    const stick = cylinder(bomb, M('c4'), 0, 0.06, dz, 0.055, 0.055, 0.46, 8);
    stick.rotation.z = Math.PI / 2;
  }
  for (const dx of [-0.15, 0.15]) box(bomb, M('tape'), dx, 0.06, 0, 0.05, 0.125, 0.36);
  box(bomb, M('iron'), 0, 0.15, 0.01, 0.24, 0.06, 0.2);
  box(bomb, M('screen'), -0.03, 0.185, 0.03, 0.13, 0.012, 0.08);
  box(bomb, M('wireRed'), 0.1, 0.13, -0.12, 0.02, 0.02, 0.16);
  box(bomb, M('wireBlue'), -0.1, 0.13, -0.12, 0.02, 0.02, 0.16);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: BOMB_LED_OFF }));
  led.position.set(0.08, 0.2, 0.05);
  led.userData.glow = true; // gardée hors du bake : sa couleur change
  bomb.add(led);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xff3a22, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.copy(led.position);
  halo.scale.setScalar(0.32);
  halo.visible = false;
  halo.userData.glow = true;
  bomb.add(halo);
  return { led, halo, offset, on: null };
}

/* ------------------------------------------------------------------ */
/* Obstacles du Mid                                                     */
/* ------------------------------------------------------------------ */

/**
 * La « Xbox » du Mid, célèbre caisse à croisillons en X, coiffée d'une petite
 * caisse bâchée : un obstacle haut sur une seule voie, qu'on contourne.
 */
function xbox(M) {
  const group = new THREE.Group();
  crate(group, M, 0, 0, 0, 1.24, 1.08, 1.16, { brace: true });
  crate(group, M, 0.04, 1.08, -0.04, 0.86, 0.76, 0.84, { tarp: true, rotation: 0.14 });
  return group;
}

/**
 * Muret de pisé du Mid, criblé d'un petit « spray » d'impacts : deux voies de
 * large et moins d'un mètre de haut, donc sautable.
 */
function midWall(M) {
  const group = new THREE.Group();
  box(group, M('wall'), 0, 0.42, 0, 3.9, 0.8, 0.56);
  box(group, M('plinth'), 0, 0.07, 0, 3.96, 0.14, 0.62);
  box(group, M('coping'), 0, 0.88, 0, 4.02, 0.14, 0.7);
  for (const x of [-1.3, 0, 1.3]) box(group, M('wallShade'), x, 0.46, 0.285, 0.04, 0.6, 0.02);
  box(group, M('wallShade'), 0, 0.5, 0.285, 3.8, 0.035, 0.02);
  box(group, M('wallLight'), -0.8, 0.62, 0.29, 0.72, 0.26, 0.02);
  box(group, M('wallLight'), 1.25, 0.3, 0.29, 0.5, 0.2, 0.02);
  // Impacts groupés qui montent puis dérivent, comme le recul d'un AK.
  const spray = [[0.5, 0.24], [0.5, 0.32], [0.52, 0.41], [0.55, 0.5], [0.6, 0.57], [0.68, 0.61], [0.61, 0.66], [0.53, 0.7]];
  for (const [x, y] of spray) box(group, M('dark'), x, y, 0.292, 0.055, 0.055, 0.02);
  for (const [x, z] of [[-1.75, 0.44], [1.55, -0.44], [1.82, 0.42]]) box(group, M('wallShade'), x, 0.08, z, 0.24, 0.16, 0.18);
  return group;
}

export function rampartsObstacle(kind) {
  const M = palette();
  return kind === 'barrier' ? midWall(M) : xbox(M);
}

/* ------------------------------------------------------------------ */
/* Socle commun d'un segment : sol, bordure, rempart crénelé, tours     */
/* ------------------------------------------------------------------ */

function segmentGroup(index) {
  const group = new THREE.Group();
  group.position.z = 6 - index * RAMPARTS_SEGMENT_LENGTH;
  group.userData.speedFactor = 1;
  return group;
}

function sideBase(group, M, side, index, { wallHeight = null, tower = null, palmBehind = false, wire = false } = {}) {
  const s = side;
  const L = RAMPARTS_SEGMENT_LENGTH + 0.02;
  const rnd = seeded(index * 131 + (s > 0 ? 17 : 83));
  const height = wallHeight ?? 5 + ((index * 2 + (s > 0 ? 1 : 0)) % 3) * 0.6;
  // Sol de terre battue (glisse sous le bord des dalles de la piste) et bordure.
  box(group, M('ground'), s * 7.2, -0.12, 0, 6.4, 0.12, L);
  box(group, M('curb'), s * 4.33, 0.03, 0, 0.26, 0.18, L);
  for (let p = 0; p < 4; p++) {
    box(group, M(p % 2 ? 'groundDark' : 'curb'), s * (5.2 + rnd() * 4.4), -0.05, -4.6 + rnd() * 9.2, 0.6 + rnd() * 0.7, 0.02, 0.5 + rnd() * 0.8);
  }
  // Rempart crénelé qui borde le Mid.
  const wallX = s * (WALL_FACE + WALL_THICKNESS / 2);
  box(group, M('wall'), wallX, height / 2, 0, WALL_THICKNESS, height, L);
  box(group, M('plinth'), s * (WALL_FACE - 0.05), 0.32, 0, 0.12, 0.64, L);
  box(group, M('coping'), wallX, height + 0.08, 0, WALL_THICKNESS + 0.2, 0.16, L);
  for (let k = 0; k < 10; k++) merlon(group, M, s * (WALL_FACE + 0.2), height + 0.16, -4.95 + k * 1.1);
  // Enduit écaillé.
  for (let p = 0; p < 3; p++) {
    const w = 0.8 + rnd() * 1.6;
    const h = 0.5 + rnd() * 1.1;
    box(group, M(rnd() > 0.5 ? 'wallLight' : 'wallShade'), s * (WALL_FACE - 0.02), 1 + rnd() * (height - 2.4), -4.3 + rnd() * 8.6, 0.05, h, w);
  }
  if (tower) addTower(group, M, s, tower.z, tower.height, tower);
  if (palmBehind) palm(group, M, s * (WALL_FACE + 2.4), -1.5 + rnd() * 3, { height: height + 1.6, lean: 0.08, twist: rnd() * 3 });
  // Câble électrique agrafé le long du rempart, comme partout sur de_dust2.
  if (wire) sagWire(group, M, [s * (WALL_FACE - 0.25), height - 0.35, 5.45], [s * (WALL_FACE - 0.25), height - 0.35, -5.45], 0.55);
  return height;
}

function addTower(group, M, s, z, height, { dishOnRoof = false } = {}) {
  const cx = s * (WALL_FACE + 2.3);
  box(group, M('wallLight'), cx, height / 2, z, 3.2, height, 3.2);
  box(group, M('coping'), cx, height + 0.08, z, 3.46, 0.16, 3.46);
  for (const [dx, dz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3], [0, 1.3], [0, -1.3], [-1.3, 0], [1.3, 0]]) {
    merlon(group, M, cx + dx, height + 0.16, z + dz);
  }
  // Petites fenêtres sombres côté cavalier (+z) et côté piste.
  for (const wy of [height - 1.3, height - 2.8]) {
    box(group, M('coping'), cx, wy, z + 1.62, 0.8, 1.0, 0.06);
    box(group, M('dark'), cx, wy, z + 1.66, 0.56, 0.76, 0.04);
    box(group, M('coping'), cx - s * 1.62, wy, z, 0.06, 1.0, 0.8);
    box(group, M('dark'), cx - s * 1.66, wy, z, 0.04, 0.76, 0.56);
  }
  if (dishOnRoof) dish(group, M, cx + s * 0.6, height + 0.16, z - 0.6, -s);
}

/* ------------------------------------------------------------------ */
/* Site A — côté droit                                                  */
/* ------------------------------------------------------------------ */

/** Les portes bleues de Long, un vantail entrouvert, et leurs barils bleus. */
function longDoors(group, M) {
  const zFront = -2;
  const cx = 7.85;
  crossWall(group, M('wall'), { xMin: 5.3, xMax: WALL_FACE, zFront, depth: 1, height: 5, opening: { cx, w: 2.6, h: 3.3 }, merlons: true, M });
  // Encadrement de pierre claire et linteau.
  box(group, M('coping'), cx - 1.42, 1.72, zFront + 0.04, 0.24, 3.44, 0.12);
  box(group, M('coping'), cx + 1.42, 1.72, zFront + 0.04, 0.24, 3.44, 0.12);
  box(group, M('coping'), cx, 3.5, zFront + 0.05, 3.1, 0.34, 0.14);
  box(group, M('dark'), cx, 1.65, zFront - 0.72, 2.6, 3.3, 0.1);
  const closed = doorLeaf(M, 'doorBlue', 'doorBlueDark', 1.28, 3.2);
  closed.position.set(cx - 1.3, 0, zFront - 0.35);
  group.add(closed);
  const open = doorLeaf(M, 'doorBlue', 'doorBlueDark', 1.28, 3.2);
  open.position.set(cx + 1.3, 0, zFront - 0.35);
  open.rotation.y = Math.PI + 1.15; // battant ouvert vers le Mid
  group.add(open);
  barrel(group, M, 5.85, -0.9, 'barrelBlue');
  barrel(group, M, 6.5, -1.25, 'barrelBlue', { rotation: 0.4 });
  crate(group, M, 9.55, 0, 1.1, 1.1, 1.0, 1.1, { rotation: 0.1 });
  // Lanterne murale au-dessus des portes.
  box(group, M('iron'), cx, 4.25, zFront + 0.18, 0.08, 0.08, 0.36);
  box(group, M('coping'), cx, 4.1, zFront + 0.36, 0.24, 0.3, 0.24);
}

/** Le « Blue » : conteneur bleu du coin de Long, caisse de boost et barils. */
function blueCorner(group, M) {
  const blue = new THREE.Group();
  blue.position.set(7.4, 0, -0.4);
  group.add(blue);
  box(blue, M('container'), 0, 0.72, 0, 1.6, 1.3, 2.9);
  box(blue, M('containerDark'), 0, 1.42, 0, 1.72, 0.1, 3.02);
  box(blue, M('containerDark'), 0, 0.1, 0, 1.66, 0.2, 2.96);
  for (let k = 0; k < 6; k++) box(blue, M('containerDark'), -0.82, 0.74, -1.2 + k * 0.48, 0.06, 1.1, 0.1);
  for (const dx of [-0.5, 0, 0.5]) box(blue, M('containerDark'), dx, 0.74, 1.47, 0.1, 1.1, 0.06);
  box(blue, M('rust'), -0.835, 0.3, 0.5, 0.03, 0.34, 0.9);
  box(blue, M('rust'), 0.3, 0.26, 1.505, 0.6, 0.3, 0.03);
  crate(group, M, 7.7, 1.47, -1.15, 0.9, 0.8, 0.9, { rotation: -0.12 });
  barrel(group, M, 9.4, -3.6, 'barrelRed');
  barrel(group, M, 9.75, -2.85, 'barrelBlue', { rotation: 0.6 });
  barrel(group, M, 8.95, -4.35, 'barrelBlue', { lying: true, rotation: 1.2 });
}

/** Voiture rouillée ou calcinée, pneus crevés, pare-brise étoilé. */
function wreckedCar(group, M, x, z, colorKey, rotation, { burnt = false } = {}) {
  const car = new THREE.Group();
  car.position.set(x, 0, z);
  car.rotation.y = rotation;
  car.rotation.z = 0.035;
  group.add(car);
  const body = M(colorKey);
  box(car, body, 0, 0.56, 0, 1.76, 0.52, 4.1);
  box(car, body, 0, 0.88, 1.28, 1.7, 0.14, 1.36);
  box(car, body, 0, 0.88, -1.4, 1.7, 0.14, 1.18);
  box(car, M('glass'), 0, 1.1, -0.08, 1.52, 0.44, 1.9);
  box(car, body, 0, 1.36, -0.1, 1.6, 0.1, 1.72);
  box(car, M('dark'), 0.32, 1.12, 0.87, 0.6, 0.28, 0.03); // pare-brise crevé
  box(car, M('rust'), -0.885, 0.52, 0.6, 0.02, 0.3, 1.1);
  box(car, M('rust'), 0.3, 0.955, 1.3, 0.8, 0.02, 0.6);
  if (burnt) {
    box(car, M('dark'), 0, 1.415, -0.1, 1.2, 0.02, 1.2);
    box(car, M('dark'), 0.885, 0.62, -0.7, 0.02, 0.34, 1.4);
  }
  box(car, M('iron'), 0, 0.36, 2.07, 1.74, 0.16, 0.08);
  box(car, M('iron'), 0, 0.36, -2.07, 1.74, 0.16, 0.08);
  box(car, M('coping'), -0.6, 0.62, 2.06, 0.3, 0.14, 0.04);
  for (const [wx, wz, flat] of [[-0.86, 1.32, false], [0.86, 1.32, true], [-0.86, -1.32, true], [0.86, -1.32, false]]) {
    const wheel = cylinder(car, M('tire'), wx, flat ? 0.22 : 0.3, wz, 0.3, 0.3, 0.22, 10);
    wheel.rotation.z = Math.PI / 2;
    if (flat) wheel.scale.x = 0.72;
  }
}

/** La voiture au bout de Long et le Pit, creux cerné d'un muret. */
function carAndPit(group, M) {
  wreckedCar(group, M, 6.85, -1.4, 'carRed', -0.28);
  box(group, M('groundDark'), 9.5, -0.035, 2.6, 1.8, 0.02, 3.6);
  box(group, M('wall'), 8.52, 0.45, 2.6, 0.26, 0.9, 3.6);
  box(group, M('wall'), 9.46, 0.45, 4.5, 2.14, 0.9, 0.26);
  box(group, M('coping'), 8.52, 0.94, 2.6, 0.34, 0.08, 3.64);
  box(group, M('coping'), 9.46, 0.94, 4.5, 2.2, 0.08, 0.34);
  for (const [x, z] of [[5.6, 1.4], [5.9, 2.1], [6.2, 1.2]]) box(group, M('wallShade'), x, 0.08, z, 0.3, 0.16, 0.24);
}

/** Plate-forme du site A : rampe, caisses à couvercle bleu-vert, C4, panneau « A ». */
function siteAPlatform(group, M, bombs) {
  box(group, M('wallLight'), 8.1, 0.5, -0.3, 4.6, 1, 7.4);
  box(group, M('coping'), 8.1, 1.03, -0.3, 4.72, 0.08, 7.52);
  const ramp = box(group, M('wallLight'), 7.1, 0.5, 4.3, 2.4, 0.2, 2.36);
  ramp.rotation.x = 0.44;
  crossWall(group, M('wall'), { xMin: 5.8, xMax: WALL_FACE, zFront: -4, depth: 1, height: 4.8, merlons: true, M });
  siteSign(group, M, 'A', 8.1, 3.05, -3.95);
  crate(group, M, 9.3, 1, -2.4, 1.2, 1.0, 1.2, { lid: true });
  crate(group, M, 9.35, 2.1, -2.45, 0.95, 0.85, 0.95, { lid: true, rotation: 0.12 });
  crate(group, M, 6.75, 1, 1.9, 1.1, 0.95, 1.1, { lid: true, rotation: -0.08 });
  barrel(group, M, 10.0, 2.7, 'barrelBlue', { y: 1 });
  barrel(group, M, 9.95, 1.95, 'barrelRed', { y: 1 });
  bombs.push(plantedBomb(group, M, 7.7, 1.03, -0.5, 0.35, 0));
}

/** Le coin « Goose » : l'oie peinte sur le muret, et les caisses de Ninja. */
function gooseCorner(group, M) {
  crossWall(group, M('wallLight'), { xMin: 6, xMax: WALL_FACE, zFront: -1, depth: 0.8, height: 3.3, merlons: true, M });
  decal(group, gooseTexture(), 8.2, 1.75, -0.97, 2.5, 2.5, { transparent: true });
  crate(group, M, 9.6, 0, 2.4, 1.1, 1.0, 1.1, { lid: true });
  crate(group, M, 9.6, 1.0, 2.35, 0.9, 0.8, 0.9, { lid: true, rotation: 0.2 });
  barrel(group, M, 6.4, 1.2, 'barrelRed');
}

/** L'escalier de pierre de Catwalk / Short et sa caisse de boost. */
function catwalk(group, M) {
  const steps = 8;
  for (let k = 0; k < steps; k++) {
    const h = (k + 1) * 0.3;
    box(group, M('wallLight'), 9.3, h / 2, 4.25 - k * 0.5, 2.2, h, 0.5);
  }
  box(group, M('wallLight'), 9.3, 1.2, -2.5, 2.2, 2.4, 6);
  box(group, M('coping'), 9.3, 2.44, -2.5, 2.3, 0.08, 6.1);
  box(group, M('wall'), 8.3, 2.84, -2.5, 0.24, 0.8, 6);
  box(group, M('coping'), 8.3, 3.28, -2.5, 0.32, 0.08, 6.04);
  crate(group, M, 7.3, 0, -3.1, 1.0, 0.9, 1.0, { rotation: 0.18 });
}

/** Le palmier du spawn CT dans sa jardinière, caisses et porte fermée. */
function ctCorner(group, M) {
  box(group, M('coping'), 8.8, 0.3, 0.4, 2, 0.6, 2);
  palm(group, M, 8.8, 0.4, { height: 6.4, lean: 0.12, twist: 0.7 });
  crate(group, M, 6.4, 0, -3.2, 1.1, 1.0, 1.1, { rotation: -0.15 });
  crate(group, M, 7.5, 0, -3.5, 0.9, 0.8, 0.9, { rotation: 0.3 });
  box(group, M('coping'), WALL_FACE - 0.04, 1.75, 3.6, 0.1, 3.5, 2.4);
  box(group, M('doorGrey'), WALL_FACE - 0.08, 1.6, 3.6, 0.08, 3.1, 1.9);
}

/**
 * Segment du site A (droite de la piste, x > 0). Dix segments forment une
 * boucle de 110 m qui suit Long jusqu'au site, puis Goose, Short et le CT.
 */
export function rampartsSiteA(index) {
  const s = SITE_A_SIDE;
  const group = segmentGroup(index);
  const M = palette();
  const bombs = [];
  const slot = index % RAMPARTS_SEGMENT_COUNT;
  const callouts = {
    1: 'long-doors', 2: 'blue', 3: 'car-pit', 4: 'a-site', 6: 'goose', 7: 'catwalk', 8: 'ct-spawn',
  };
  sideBase(group, M, s, index, {
    wallHeight: slot === RAMPARTS_GATE_INDEX ? 6.6 : null,
    tower: slot === 0 || slot === 3 || slot === 9 ? { z: slot === 3 ? -3 : 0.5, height: 8.6 + (slot % 2) * 0.8, dishOnRoof: slot !== 3 } : null,
    palmBehind: slot === 2 || slot === 6,
    wire: slot === 1 || slot === 8,
  });
  if (slot === 1) longDoors(group, M);
  else if (slot === 2) blueCorner(group, M);
  else if (slot === 3) carAndPit(group, M);
  else if (slot === 4) siteAPlatform(group, M, bombs);
  else if (slot === 6) gooseCorner(group, M);
  else if (slot === 7) catwalk(group, M);
  else if (slot === 8) ctCorner(group, M);
  else if (slot !== RAMPARTS_GATE_INDEX) fillerProps(group, M, s, slot);
  group.userData.site = 'A';
  group.userData.callout = callouts[slot] ?? (slot === RAMPARTS_GATE_INDEX ? 'mid-doors' : 'long');
  if (bombs.length) group.userData.bombs = bombs;
  return group;
}

/* ------------------------------------------------------------------ */
/* Site B — côté gauche                                                 */
/* ------------------------------------------------------------------ */

/** Entrée des tunnels du haut, sous le graffiti « RUSH B ». */
function upperTunnels(group, M) {
  const zFront = -1;
  const cx = -7.9;
  crossWall(group, M('wall'), { xMin: -WALL_FACE, xMax: -5.4, zFront, depth: 1, height: 5.6, opening: { cx, w: 2.8, h: 3.6, arch: 1.4 }, merlons: true, M });
  box(group, M('wall'), -7.9, 2.8, -3.6, 5, 5.6, 3.2); // masse de la voûte, derrière la baie
  box(group, M('dark'), cx, 1.8, zFront - 0.95, 2.8, 3.6, 0.06);
  box(group, M('coping'), cx - 1.52, 1.1, zFront + 0.04, 0.24, 2.2, 0.1);
  box(group, M('coping'), cx + 1.52, 1.1, zFront + 0.04, 0.24, 2.2, 0.1);
  decal(group, rushBTexture(), cx + 0.1, 4.6, zFront + 0.03, 4.5, 1.4, { transparent: true });
  crate(group, M, -5.95, 0, 0.9, 0.95, 0.85, 0.95, { rotation: 0.2 });
  box(group, M('iron'), cx - 1.9, 3.2, zFront + 0.2, 0.08, 0.08, 0.4);
  box(group, M('coping'), cx - 1.9, 3.05, zFront + 0.4, 0.24, 0.3, 0.24);
}

/** Le mur troué des tunnels, gravats au pied. */
function tunnelHoles(group, M) {
  const hole = [[-9.2, 0.7], [-8.6, 0.5], [-7.7, 0.8], [-7.3, 1.6], [-7.6, 2.5], [-8.3, 2.8], [-9.0, 2.4], [-9.4, 1.5]];
  crossWall(group, M('wallLight'), { xMin: -WALL_FACE, xMax: -6.2, zFront: 0, depth: 0.7, height: 3.8, opening: { y0: 0.5, points: hole }, merlons: true, M });
  for (const [x, z, w] of [[-8.4, 0.5, 0.4], [-7.8, 0.9, 0.3], [-8.9, 1.1, 0.34], [-8.2, 1.4, 0.26], [-7.4, 0.4, 0.22]]) {
    box(group, M('wallShade'), x, w / 2 - 0.02, z, w, w, w * 0.8);
  }
  crate(group, M, -9.6, 0, -2.8, 1.0, 0.9, 1.0, { tarp: true, rotation: 0.1 });
  barrel(group, M, -6.6, -3.4, 'barrelBlue');
}

/** Plate-forme du site B : big box bâchée, double stack, C4 et panneau « B ». */
function siteBPlatform(group, M, bombs) {
  box(group, M('wallLight'), -8.1, 0.4, -0.75, 4.6, 0.8, 6.5);
  box(group, M('coping'), -8.1, 0.83, -0.75, 4.72, 0.08, 6.62);
  box(group, M('wallLight'), -7.4, 0.2, 2.9, 2.6, 0.4, 0.8);
  crossWall(group, M('wall'), { xMin: -WALL_FACE, xMax: -5.8, zFront: -4, depth: 1, height: 4.8, merlons: true, M });
  siteSign(group, M, 'B', -8.1, 3.05, -3.95);
  crate(group, M, -8.9, 0.8, -2.2, 1.5, 1.3, 1.5, { tarp: true });
  crate(group, M, -6.3, 0, 4.0, 1.1, 1.0, 1.1, {});
  crate(group, M, -6.32, 1.0, 3.96, 0.95, 0.85, 0.95, { tarp: true, rotation: -0.16 });
  bombs.push(plantedBomb(group, M, -7.3, 0.83, -0.2, -0.4, 0.55));
}

/** La voiture calcinée de B et le grillage du côté T. */
function bCarAndFence(group, M) {
  wreckedCar(group, M, -7.1, 2.3, 'carBlue', 0.22, { burnt: true });
  const fence = new THREE.MeshStandardMaterial({ map: fenceTexture(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 });
  const along = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.4), fence);
  along.position.set(-9.7, 1.3, -2.9);
  along.rotation.y = Math.PI / 2;
  group.add(along);
  const across = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4), fence);
  across.position.set(-8.1, 1.3, -0.6);
  group.add(across);
  for (const [x, z] of [[-9.7, -5.2], [-9.7, -2.9], [-9.7, -0.6], [-6.5, -0.6], [-8.1, -0.6]]) {
    cylinder(group, M('iron'), x, 1.3, z, 0.05, 0.05, 2.6, 6);
  }
}

/** La tour de la fenêtre de B, volets arrachés. */
function bWindow(group, M) {
  box(group, M('wallLight'), -8.5, 3.6, -2.75, 3.8, 7.2, 3.5);
  box(group, M('coping'), -8.5, 7.28, -2.75, 4, 0.16, 3.7);
  for (const [dx, dz] of [[-1.6, 0], [1.6, 0], [0, 1.5], [0, -1.5], [-1.6, 1.5], [1.6, 1.5], [-1.6, -1.5], [1.6, -1.5]]) {
    merlon(group, M, -8.5 + dx, 7.36, -2.75 + dz);
  }
  const zFace = -1 + 0.01;
  box(group, M('coping'), -8.3, 3.4, zFace, 1.7, 1.4, 0.06);
  box(group, M('dark'), -8.3, 3.4, zFace + 0.02, 1.36, 1.08, 0.04);
  const shutter = box(group, M('doorGrey'), -9.25, 3.25, zFace + 0.3, 0.64, 1.1, 0.06);
  shutter.rotation.y = -0.9;
  const hanging = box(group, M('doorGreyDark'), -7.55, 3.1, zFace + 0.12, 0.6, 1.05, 0.06);
  hanging.rotation.z = 0.35;
  box(group, M('woodDark'), -8.3, 3.45, zFace + 0.06, 1.6, 0.12, 0.05).rotation.z = -0.25;
  box(group, M('coping'), -8.5, 5.9, zFace, 0.7, 0.9, 0.06);
  box(group, M('dark'), -8.5, 5.9, zFace + 0.02, 0.46, 0.66, 0.04);
  sagWire(group, M, [-6.6, 6.6, -2.6], [-WALL_FACE - 0.3, 5.9, 4.5], 0.6);
}

/** Les portes de B : cadre de pierre, un vantail ouvert, l'autre troué. */
function bDoors(group, M) {
  const zFront = -2;
  const cx = -7.85;
  crossWall(group, M('wall'), { xMin: -WALL_FACE, xMax: -5.3, zFront, depth: 1, height: 5, opening: { cx, w: 2.8, h: 3.3 }, merlons: true, M });
  box(group, M('coping'), cx - 1.52, 1.75, zFront + 0.05, 0.28, 3.5, 0.14);
  box(group, M('coping'), cx + 1.52, 1.75, zFront + 0.05, 0.28, 3.5, 0.14);
  box(group, M('coping'), cx, 3.62, zFront + 0.06, 3.4, 0.4, 0.16);
  box(group, M('dark'), cx, 1.65, zFront - 0.72, 2.8, 3.3, 0.1);
  const closed = doorLeaf(M, 'doorGrey', 'doorGreyDark', 1.38, 3.2);
  closed.position.set(cx, 0, zFront - 0.35);
  group.add(closed);
  box(group, M('dark'), cx + 0.72, 1.2, zFront - 0.27, 0.42, 0.5, 0.02); // le fameux trou
  const open = doorLeaf(M, 'doorGrey', 'doorGreyDark', 1.38, 3.2);
  open.position.set(cx - 1.4, 0, zFront - 0.35);
  open.rotation.y = -1.1; // battant ouvert vers le Mid
  group.add(open);
  crate(group, M, -9.6, 0, 0.8, 1.0, 0.9, 1.0, { tarp: true, rotation: -0.1 });
}

/** Le closet et le fond du site, sous un palmier. */
function closet(group, M) {
  box(group, M('wall'), -8.2, 1.6, -1.2, 0.3, 3.2, 3.2);
  box(group, M('wall'), -9.3, 3.05, 0.3, 2.2, 0.3, 0.3);
  box(group, M('coping'), -8.2, 3.24, -1.2, 0.38, 0.08, 3.28);
  crate(group, M, -9.4, 0, -1.3, 1.1, 1.0, 1.1, {});
  barrel(group, M, -6.2, -3.5, 'barrelRed');
  barrel(group, M, -6.8, -4.1, 'barrelBlue', { rotation: 0.5 });
  palm(group, M, -6.9, 2.6, { height: 5.2, lean: 0.14, twist: 1.9 });
}

/**
 * Segment du site B (gauche de la piste, x < 0) : des tunnels jusqu'au site,
 * puis la voiture, la fenêtre, les portes et le closet.
 */
export function rampartsSiteB(index) {
  const s = SITE_B_SIDE;
  const group = segmentGroup(index);
  const M = palette();
  const bombs = [];
  const slot = index % RAMPARTS_SEGMENT_COUNT;
  const callouts = {
    1: 'upper-tunnels', 2: 'tunnel-holes', 3: 'b-site', 4: 'b-car', 6: 'b-window', 7: 'b-doors', 8: 'closet',
  };
  sideBase(group, M, s, index, {
    wallHeight: slot === RAMPARTS_GATE_INDEX ? 6.6 : null,
    tower: slot === 0 || slot === 4 || slot === 9 ? { z: slot === 4 ? -3.2 : -0.5, height: 8.8 + (slot % 2) * 0.6, dishOnRoof: slot !== 9 } : null,
    palmBehind: slot === 3 || slot === 7,
    wire: slot === 2 || slot === 9,
  });
  if (slot === 1) upperTunnels(group, M);
  else if (slot === 2) tunnelHoles(group, M);
  else if (slot === 3) siteBPlatform(group, M, bombs);
  else if (slot === 4) bCarAndFence(group, M);
  else if (slot === 6) bWindow(group, M);
  else if (slot === 7) bDoors(group, M);
  else if (slot === 8) closet(group, M);
  else if (slot !== RAMPARTS_GATE_INDEX) fillerProps(group, M, s, slot);
  group.userData.site = 'B';
  group.userData.callout = callouts[slot] ?? (slot === RAMPARTS_GATE_INDEX ? 'mid-doors' : 'tunnels');
  if (bombs.length) group.userData.bombs = bombs;
  return group;
}

/* ------------------------------------------------------------------ */
/* Les portes du Mid et l'horizon                                       */
/* ------------------------------------------------------------------ */

/**
 * Les grandes portes du Mid, en travers de la piste une fois par boucle :
 * rempart percé d'une arche dont la clé passe au-dessus de la caméra, deux
 * vantaux gris grands ouverts le long du couloir, hors de la piste.
 */
export function rampartsMidDoors(index = RAMPARTS_GATE_INDEX) {
  const group = segmentGroup(index);
  const M = palette();
  const { halfWidth, spring, top } = MID_DOORS_ARCH;
  const outer = WALL_FACE + WALL_THICKNESS;
  const height = 11;
  const zFront = 2.9;
  const depth = 1.8;
  const shape = new THREE.Shape();
  shape.moveTo(-outer, 0);
  shape.lineTo(-halfWidth, 0);
  shape.lineTo(-halfWidth, spring);
  shape.absarc(0, spring, top - spring, Math.PI, 0, true);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(outer, 0);
  shape.lineTo(outer, height);
  shape.lineTo(-outer, height);
  shape.closePath();
  const wall = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 18 }), M('wall'));
  wall.position.z = zFront - depth;
  group.add(wall);
  box(group, M('coping'), 0, height + 0.08, zFront - depth / 2, outer * 2 + 0.2, 0.16, depth + 0.2);
  for (let k = 0; k < 18; k++) merlon(group, M, -outer + 0.65 + k * ((outer * 2 - 1.3) / 17), height + 0.16, zFront - depth / 2);
  // Pieds-droits en pierre claire et bandeau à la naissance de l'arche.
  for (const sx of [-1, 1]) {
    box(group, M('coping'), sx * (halfWidth + 0.3), spring / 2, zFront + 0.05, 0.6, spring, 0.14);
    box(group, M('coping'), sx * (halfWidth + 0.45), spring + 0.12, zFront + 0.06, 0.9, 0.24, 0.16);
    box(group, M('plinth'), sx * (outer + halfWidth) / 2, 0.35, zFront + 0.04, outer - halfWidth - 0.6, 0.7, 0.1);
  }
  // Les deux vantaux, rabattus contre le couloir (au-delà du bord de piste).
  const leafWidth = 4.7;
  const leafHeight = 6.2;
  for (const sx of [-1, 1]) {
    const leaf = doorLeaf(M, 'doorGrey', 'doorGreyDark', leafWidth, leafHeight);
    leaf.position.set(sx * (halfWidth + 0.05), 0, zFront - depth);
    leaf.rotation.y = Math.PI / 2 + sx * -0.08;
    group.add(leaf);
  }
  group.userData.callout = 'mid-doors';
  return group;
}

/**
 * Silhouettes de la ville au loin (statiques, noyées dans la brume de chaleur),
 * de part et d'autre du Mid : tours crénelées, toits et quelques palmiers.
 */
export function makeRampartsSkyline() {
  const group = new THREE.Group();
  const M = palette();
  const rnd = seeded(2002);
  for (const side of [-1, 1]) {
    for (let k = 0; k < 7; k++) {
      const x = side * (17 + k * 4.4 + rnd() * 2);
      const z = -56 - rnd() * 22;
      const w = 3 + rnd() * 4;
      const h = 6 + rnd() * 8;
      const d = 3 + rnd() * 3;
      box(group, M(k % 2 ? 'wallLight' : 'wall'), x, h / 2 - 0.5, z, w, h, d);
      for (let m = 0; m < 3; m++) merlon(group, M, x - w / 2 + 0.5 + m * ((w - 1) / 2), h - 0.5, z + d / 2 - 0.3);
      if (rnd() > 0.55) palm(group, M, x + side * (w / 2 + 1.2), z + 1.5, { height: 6 + rnd() * 2, lean: 0.1, twist: rnd() * 3 });
    }
  }
  return group;
}

/** Utilitaire des tests : aucun décor ne déborde sur les voies (|x| < 4,2) sous la caméra. */
export const RAMPARTS_TRACK_EDGE = TRACK_EDGE;
