// Designs des trophées de Coupe — de la donnée pure (pas de three.js, pas de
// DOM) pour que `node --test` puisse vérifier sa forme. La scène 3D
// (`mirageTrophyScene.js`) n’a plus qu’à transformer chaque boîte en mesh.
//
// Même langage visuel que le reste de Mirage Rush : des voxels. Tailles et
// positions sont en unités du monde ; `center` est le centre de la boîte.

/** Côté d’un voxel du trophée, en unités du monde. */
export const VOXEL = 0.25;

/** Palette commune au modèle 3D et à sa projection SVG, même sans WebGL. */
export const TROPHY_MATERIAL_COLORS = Object.freeze({
  gold: 0xffc93c,
  goldDark: 0xc98a1b,
  goldLight: 0xffe48a,
  gem: 0x45e4ff,
  silver: 0xc8e3ed,
  silverDark: 0x5e829e,
  silverLight: 0xeeffff,
  ocean: 0x189fc9,
  land: 0x85efd0,
  stone: 0x5a3d78,
  stoneLight: 0x7a5a9a,
  stoneDark: 0x3c2752,
  ruby: 0xd9354a,
  rubyDark: 0x8f1d33,
  rubyLight: 0xff7b8c,
});
export const TROPHY_MATERIALS = Object.freeze(Object.keys(TROPHY_MATERIAL_COLORS));

// Dalle carrée centrée sur l’axe : `y` et `height` sont comptés en voxels.
function slab(part, material, y, width, height = 1, depth = width) {
  return {
    part,
    material,
    size: [width * VOXEL, height * VOXEL, depth * VOXEL],
    center: [0, (y + height / 2) * VOXEL, 0],
  };
}

// Boîte quelconque, en voxels : `x`, `y`, `z` désignent son centre.
function cell(part, material, [x, y, z], [width, height, depth]) {
  return {
    part,
    material,
    size: [width * VOXEL, height * VOXEL, depth * VOXEL],
    center: [x * VOXEL, y * VOXEL, z * VOXEL],
  };
}

// Profil de la coupe : largeur (en voxels) de chaque assise, de bas en haut.
// Les quatre premières s’évasent, les six suivantes forment la panse droite.
const BOWL_WIDTHS = Object.freeze([6, 8, 10, 12, 13, 13, 13, 13, 13, 13]);
const BOWL_BASE = 10; // première assise de la coupe, en voxels depuis le pied
export const TROPHY_HEIGHT_VOXELS = BOWL_BASE + BOWL_WIDTHS.length + 1; // + le rebord
export const TROPHY_HEIGHT = TROPHY_HEIGHT_VOXELS * VOXEL;

const GLOBE_RADIUS = 6;
const GLOBE_CENTER_Y = 14.5;
const GLOBE_HEIGHT = (GLOBE_CENTER_Y + 7.5) * VOXEL;

// Blason : largeur (en voxels) de chaque assise de l’écu, de la pointe au sommet.
const SHIELD_WIDTHS = Object.freeze([2, 4, 6, 8, 10, 12, 12, 12, 12, 12, 12, 12]);
const SHIELD_BASE = 7; // première assise de l’écu, en voxels depuis le pied
const LEGENDS_HEIGHT = (SHIELD_BASE + SHIELD_WIDTHS.length) * VOXEL;
const WINDS_HEIGHT = 23 * VOXEL;

/** Un design par identifiant de coupe (`mirageCup.js`). */
export const TROPHY_DESIGNS = Object.freeze({
  desert: Object.freeze({
    id: 'desert',
    name: 'Calice des Dunes',
    description: 'Coupe dorée à deux anses, pied étagé et diamant cyan.',
    height: TROPHY_HEIGHT,
    accent: 0xffd76b,
  }),
  winds: Object.freeze({
    id: 'winds',
    name: 'Rose des Vents',
    description: 'Rose des vents argentée, pointes turquoise et socle marin.',
    height: WINDS_HEIGHT,
    accent: 0x45e4ff,
  }),
  worldtour: Object.freeze({
    id: 'worldtour',
    name: 'Globe des Horizons',
    description: 'Globe turquoise aux continents de jade, méridien doré et socle argenté.',
    height: GLOBE_HEIGHT,
    accent: 0x85efd0,
  }),
  legends: Object.freeze({
    id: 'legends',
    name: 'Blason des Légendes',
    description: 'Écu d’or à double face, écartelé de rubis, frappé d’une étoile.',
    height: LEGENDS_HEIGHT,
    accent: 0xff7b8c,
  }),
});

/** Un appel sans coupe (ou avec un ancien identifiant) garde le calice du Désert. */
export function getTrophyDesign(cupId = 'desert') {
  return Object.hasOwn(TROPHY_DESIGNS, cupId) ? TROPHY_DESIGNS[cupId] : TROPHY_DESIGNS.desert;
}

/**
 * Le trophée lui-même, posé sur y = 0 et centré sur l’axe vertical : pied,
 * tige, collerette, coupe évasée et rebord, deux anses en « C » et un diamant
 * en relief sur la face avant ET la face arrière (il tourne, donc on le voit
 * passer). Les diamants sont l’emblème de Mirage Rush.
 */
function desertTrophyBoxes() {
  const boxes = [
    slab('foot', 'goldDark', 0, 12, 2),
    slab('foot-step', 'gold', 2, 9),
    slab('stem-base', 'gold', 3, 4, 2),
    slab('knob', 'goldLight', 5, 6),
    slab('stem', 'gold', 6, 3, 3),
    slab('collar', 'goldLight', 9, 5),
  ];
  BOWL_WIDTHS.forEach((width, index) => boxes.push(slab(`bowl-${index}`, 'gold', BOWL_BASE + index, width)));
  const rimY = BOWL_BASE + BOWL_WIDTHS.length;
  boxes.push(slab('rim', 'goldLight', rimY, 14));

  // Anses : deux taquets horizontaux reliés par une barre verticale, épaisseur 2.
  const firstWide = BOWL_WIDTHS.findIndex((width) => width === 13);
  const handleBottom = BOWL_BASE + firstWide; // première assise pleine largeur
  const handleTop = rimY - 2;
  for (const side of [-1, 1]) {
    boxes.push(cell(`handle-top-${side}`, 'goldDark', [side * 7.5, handleTop + 0.5, 0], [2, 1, 2]));
    boxes.push(cell(`handle-bottom-${side}`, 'goldDark', [side * 7.5, handleBottom + 0.5, 0], [2, 1, 2]));
    const barHeight = handleTop - handleBottom + 1;
    boxes.push(cell(`handle-bar-${side}`, 'goldDark', [side * 9, handleBottom + barHeight / 2, 0], [1, barHeight, 2]));
  }

  // Diamant en relief : 1, 3, 5, 3, 1 voxels de large, collé sur la panse droite.
  const emblemRows = [1, 3, 5, 3, 1];
  const emblemBase = rimY - emblemRows.length; // juste sous le rebord
  const faceZ = 6.5 + 0.25; // face de la panse (13 voxels de large) + demi-épaisseur du relief
  for (const side of [-1, 1]) {
    emblemRows.forEach((width, row) => {
      boxes.push(cell(`emblem-${side}-${row}`, 'gem', [0, emblemBase + row + 0.5, side * faceZ], [width, 1, 0.5]));
    });
  }
  return boxes;
}

// Cartes en pixels sur les deux faces du globe : elles épousent sa surface,
// plutôt que de flotter sur un plan devant la sphère. La rotation révèle les deux.
const CONTINENTS = Object.freeze([
  Object.freeze([
    '............',
    '...##.......',
    '..####..#...',
    '.#####.####.',
    '..###.#####.',
    '...#..#####.',
    '......###...',
    '..##..##....',
    '..###..#....',
    '...##.......',
    '............',
    '............',
  ]),
  Object.freeze([
    '............',
    '.......##...',
    '......####..',
    '..##..#####.',
    '.####..###..',
    '..###...#...',
    '...##.......',
    '...#...##...',
    '......####..',
    '.......##...',
    '............',
    '............',
  ]),
]);

// Anneau voxel : un méridien vertical doré et un équateur horizontal argenté.
// Fusionner les pixels contigus d'une ligne évite de créer un mesh par pixel.
function globeRingBoxes(part, material, horizontal = false) {
  const boxes = [];
  for (let row = -7; row <= 7; row++) {
    let start = null;
    for (let column = -7; column <= 8; column++) {
      const radiusSquared = column ** 2 + row ** 2;
      const inRing = column <= 7 && radiusSquared >= 6.35 ** 2 && radiusSquared <= 7.65 ** 2;
      if (inRing && start === null) start = column;
      if (!inRing && start !== null) {
        const width = column - start;
        const x = start + (width - 1) / 2;
        boxes.push(cell(`${part}-${row}-${start}`, material,
          horizontal ? [x, GLOBE_CENTER_Y, row] : [x, GLOBE_CENTER_Y + row, 0],
          horizontal ? [width, 0.5, 1] : [width, 1, 1]));
        start = null;
      }
    }
  }
  return boxes;
}

function worldTourTrophyBoxes() {
  const boxes = [
    slab('foot', 'silverDark', 0, 10, 2),
    slab('foot-step', 'silver', 2, 8),
    slab('stem-base', 'silverLight', 3, 4),
    slab('stem', 'silver', 4, 2, 3),
    slab('cradle', 'silverLight', 7, 3, 2),
    ...globeRingBoxes('meridian', 'gold'),
    ...globeRingBoxes('equator', 'silverLight', true),
    cell('axis-north', 'goldLight', [0, GLOBE_CENTER_Y + 6.25, 0], [1, 1.5, 1]),
    cell('axis-south', 'goldLight', [0, GLOBE_CENTER_Y - 6.25, 0], [1, 1.5, 1]),
  ];

  // Sphère en voxels, en bandes selon la profondeur : le globe reste rond
  // pendant toute sa rotation, et pas seulement de face comme une icône.
  for (let row = 0; row < 12; row++) {
    const y = row - 5.5;
    for (let column = 0; column < 12; column++) {
      const z = column - 5.5;
      const square = GLOBE_RADIUS ** 2 - y ** 2 - z ** 2;
      if (square <= 0) continue;
      const width = 2 * Math.floor(Math.sqrt(square) + 0.5);
      if (width > 0) boxes.push(cell(`globe-${row}-${column}`, 'ocean', [0, GLOBE_CENTER_Y + y, z], [width, 1, 1]));
    }
  }

  CONTINENTS.forEach((map, face) => {
    const side = face === 0 ? 1 : -1;
    map.forEach((line, row) => {
      [...line].forEach((mark, column) => {
        if (mark !== '#') return;
        const x = column - 5.5;
        const y = 5.5 - row;
        const depth = Math.floor(Math.sqrt(GLOBE_RADIUS ** 2 - x ** 2 - y ** 2) + 0.5);
        boxes.push(cell(`continent-${side}-${row}-${column}`, 'land', [x, GLOBE_CENTER_Y + y, side * (depth + 0.25)], [1, 1, 0.5]));
      });
    });
  });
  return boxes;
}

// Étoile du blason : 8 × 7 voxels, posée sur les assises 4 à 10 de l’écu.
// Chaque rangée mord sur l’écusson rubis (largeur − 2) de l’assise qu’elle couvre.
const SHIELD_STAR = Object.freeze([
  '...##...',
  '...##...',
  '########',
  '.######.',
  '..####..',
  '.##..##.',
  '.#....#.',
]);

// L’écu est une plaque de deux voxels d’épaisseur : cadre d’or, pointe en bas.
// Sur chaque face, un écusson écartelé (rubis à gauche, rubis sombre à droite)
// et une étoile dorée en relief. La plaque tourne : les deux faces se voient.
function legendsTrophyBoxes() {
  const boxes = [
    slab('foot', 'goldDark', 0, 10, 2),
    slab('foot-step', 'gold', 2, 8),
    slab('stem', 'gold', 3, 2, 3),
    slab('cradle', 'goldLight', 6, 4),
  ];
  const lastRow = SHIELD_WIDTHS.length - 1;
  SHIELD_WIDTHS.forEach((width, row) => {
    const material = row === lastRow ? 'goldLight' : row === 0 ? 'goldDark' : 'gold';
    boxes.push(cell(`shield-${row}`, material, [0, SHIELD_BASE + row + 0.5, 0], [width, 1, 2]));
    // Les assises du haut et de la pointe restent de l’or nu : c’est le cadre.
    if (row === 0 || row === lastRow) return;
    const half = (width - 2) / 2;
    for (const side of [-1, 1]) {
      boxes.push(cell(`field-${side}-${row}`, side < 0 ? 'ruby' : 'rubyDark', [side * half / 2, SHIELD_BASE + row + 0.5, 0], [half, 1, 2.5]));
    }
  });

  // Étoile en relief sur la face avant ET la face arrière.
  const starTop = lastRow - 1; // assise la plus haute encore ornée de rubis
  SHIELD_STAR.forEach((line, index) => {
    const row = starTop - index;
    [...line].forEach((mark, column) => {
      if (mark !== '#') return;
      for (const side of [-1, 1]) {
        boxes.push(cell(`star-${side}-${index}-${column}`, 'goldLight', [column - 3.5, SHIELD_BASE + row + 0.5, side * 1.5], [1, 1, 0.5]));
      }
    });
  });
  return boxes;
}

// Rose des vents en quatre pointes cardinales, montée sur un pied argenté.
// Le relief central est doublé : la boussole reste lisible pendant sa rotation.
function windsTrophyBoxes() {
  const boxes = [
    slab('foot', 'silverDark', 0, 12, 2),
    slab('foot-step', 'silver', 2, 9),
    slab('stem-base', 'silverLight', 3, 5, 2),
    slab('stem', 'silver', 5, 3, 4),
    cell('cradle', 'goldLight', [0, 10.5, 0], [8, 3, 6]),
    cell('rose-hub', 'gold', [0, 14.5, 0], [5, 5, 3]),
    cell('north-ray', 'land', [0, 18.5, 0], [3, 3, 2]),
    cell('north-point', 'silverLight', [0, 21.5, 0], [5, 3, 2]),
    cell('south-ray', 'ocean', [0, 10.5, 0], [3, 3, 2]),
    cell('south-point', 'silverLight', [0, 7.5, 0], [5, 3, 2]),
  ];

  for (const side of [-1, 1]) {
    boxes.push(cell(`east-west-ray-${side}`, side > 0 ? 'gem' : 'ocean', [side * 5, 14.5, 0], [5, 3, 2]));
    boxes.push(cell(`east-west-point-${side}`, 'silverLight', [side * 9, 14.5, 0], [3, 5, 2]));
    boxes.push(cell(`rose-center-${side}`, 'gem', [0, 14.5, side * 2], [3, 3, 1]));
  }
  return boxes;
}

/** La forme (pas seulement la couleur) dépend de la coupe choisie. */
export function trophyBoxes(cupId = 'desert') {
  const id = getTrophyDesign(cupId).id;
  if (id === 'worldtour') return worldTourTrophyBoxes();
  if (id === 'legends') return legendsTrophyBoxes();
  if (id === 'winds') return windsTrophyBoxes();
  return desertTrophyBoxes();
}

/**
 * Projection de face dans un carré de 24 × 24 pixels : sélecteur, HUD et
 * repli sans WebGL utilisent exactement la même géométrie que le podium 3D.
 * Les boîtes du fond sont peintes avant celles du premier plan.
 */
export function trophyIconRects(cupId = 'desert') {
  return trophyBoxes(cupId)
    .sort((a, b) => (a.center[2] + a.size[2] / 2) - (b.center[2] + b.size[2] / 2))
    .map((box) => ({
      part: box.part,
      material: box.material,
      x: 12 + (box.center[0] - box.size[0] / 2) / VOXEL,
      y: 23 - (box.center[1] + box.size[1] / 2) / VOXEL,
      width: box.size[0] / VOXEL,
      height: box.size[1] / VOXEL,
    }));
}

/** Hauteur du piédestal sur lequel le trophée est posé. */
export const PODIUM_HEIGHT = 1.7;

// Le « 1 » du podium, dessiné sur une grille de 3 × 5 voxels.
const ONE_GLYPH = Object.freeze([
  '.#.',
  '##.',
  '.#.',
  '.#.',
  '###',
]);
const ONE_PIXEL = 0.14;

// Plateau puis « 1 » : le métal du trophée posé dessus.
const PODIUM_METALS = Object.freeze({
  desert: Object.freeze(['goldDark', 'goldLight']),
  worldtour: Object.freeze(['silverDark', 'silverLight']),
  legends: Object.freeze(['rubyDark', 'goldLight']),
  winds: Object.freeze(['silverDark', 'gem']),
});

/**
 * Le piédestal : deux marches de pierre, un plateau et un « 1 » en relief
 * assortis au métal de la coupe, sur la face avant (+z) de la marche du milieu.
 */
export function podiumBoxes(cupId = 'desert') {
  const [capMaterial, glyphMaterial] = PODIUM_METALS[getTrophyDesign(cupId).id] || PODIUM_METALS.desert;
  const boxes = [
    { part: 'podium-base', material: 'stoneDark', size: [4.2, 0.6, 4.2], center: [0, 0.3, 0] },
    { part: 'podium-middle', material: 'stone', size: [3.4, 0.9, 3.4], center: [0, 1.05, 0] },
    { part: 'podium-cap', material: capMaterial, size: [3.0, 0.2, 3.0], center: [0, 1.6, 0] },
  ];
  const front = 3.4 / 2 + 0.03;
  const left = -(ONE_GLYPH[0].length * ONE_PIXEL) / 2 + ONE_PIXEL / 2;
  const top = 1.05 + (ONE_GLYPH.length * ONE_PIXEL) / 2 - ONE_PIXEL / 2;
  ONE_GLYPH.forEach((line, row) => {
    [...line].forEach((mark, column) => {
      if (mark !== '#') return;
      boxes.push({
        part: `one-${row}-${column}`,
        material: glyphMaterial,
        size: [ONE_PIXEL, ONE_PIXEL, 0.06],
        center: [left + column * ONE_PIXEL, top - row * ONE_PIXEL, front],
      });
    });
  });
  return boxes;
}

/** Confettis : or, cyan, rouge, vert — les couleurs des diamants — plus rose et blanc. */
export const CONFETTI_COLORS = Object.freeze([0xffd15c, 0x45e4ff, 0xf2352c, 0x4cd964, 0xff7ac8, 0xfff4d6]);
