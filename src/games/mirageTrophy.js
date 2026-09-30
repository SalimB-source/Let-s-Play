// Géométrie du trophée de la Coupe — de la donnée pure (pas de three.js, pas de
// DOM) pour que `node --test` puisse vérifier sa forme. La scène 3D
// (`mirageTrophyScene.js`) n’a plus qu’à transformer chaque boîte en mesh.
//
// Même langage visuel que le reste de Mirage Rush : des voxels. Tailles et
// positions sont en unités du monde ; `center` est le centre de la boîte.

/** Côté d’un voxel du trophée, en unités du monde. */
export const VOXEL = 0.25;

/** Matériaux référencés par les boîtes ; la scène décide de leur rendu. */
export const TROPHY_MATERIALS = Object.freeze(['gold', 'goldDark', 'goldLight', 'gem', 'stone', 'stoneLight', 'stoneDark']);

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

/**
 * Le trophée lui-même, posé sur y = 0 et centré sur l’axe vertical : pied,
 * tige, collerette, coupe évasée et rebord, deux anses en « C » et un diamant
 * en relief sur la face avant ET la face arrière (il tourne, donc on le voit
 * passer). Les diamants sont l’emblème de Mirage Rush.
 */
export function trophyBoxes() {
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

/**
 * Le piédestal : deux marches de pierre, un plateau doré et un « 1 » doré en
 * relief sur la face avant (+z) de la marche du milieu.
 */
export function podiumBoxes() {
  const boxes = [
    { part: 'podium-base', material: 'stoneDark', size: [4.2, 0.6, 4.2], center: [0, 0.3, 0] },
    { part: 'podium-middle', material: 'stone', size: [3.4, 0.9, 3.4], center: [0, 1.05, 0] },
    { part: 'podium-cap', material: 'goldDark', size: [3.0, 0.2, 3.0], center: [0, 1.6, 0] },
  ];
  const front = 3.4 / 2 + 0.03;
  const left = -(ONE_GLYPH[0].length * ONE_PIXEL) / 2 + ONE_PIXEL / 2;
  const top = 1.05 + (ONE_GLYPH.length * ONE_PIXEL) / 2 - ONE_PIXEL / 2;
  ONE_GLYPH.forEach((line, row) => {
    [...line].forEach((mark, column) => {
      if (mark !== '#') return;
      boxes.push({
        part: `one-${row}-${column}`,
        material: 'goldLight',
        size: [ONE_PIXEL, ONE_PIXEL, 0.06],
        center: [left + column * ONE_PIXEL, top - row * ONE_PIXEL, front],
      });
    });
  });
  return boxes;
}

/** Confettis : or, cyan, rouge, vert — les couleurs des diamants — plus rose et blanc. */
export const CONFETTI_COLORS = Object.freeze([0xffd15c, 0x45e4ff, 0xf2352c, 0x4cd964, 0xff7ac8, 0xfff4d6]);
