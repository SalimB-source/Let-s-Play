/**
 * `npm run check:city-rush-lanes`
 *
 * Les flèches peintes au sol disent dans quel sens se prend chaque voie : vers
 * l'avant de la course (le haut du carreau) pour les voies de course, vers le
 * joueur (le bas) pour le contresens. Ce contrôle dessine les **vraies
 * textures** dans un canevas qui enregistre chaque trait, relit la pointe de
 * chaque flèche et vérifie qu'elle pointe du bon côté — en conduite à droite
 * (Vice City, New York) comme en conduite à gauche (Londres, Shuto de Tokyo).
 *
 * Le côté du contresens se déduit du thème (`cityRushThemeDriveSide`) : une
 * texture de rue à Londres et le tablier de la C1 doivent peindre les trois
 * voies de gauche vers l'avant, celles de droite vers le joueur. Avant cette
 * bascule, les deux textures peignaient le contresens à gauche dans tous les
 * pays — Londres et Tokyo annonçaient un sens inverse que le jeu ne connaît
 * plus.
 */
import assert from 'node:assert/strict';
import { seededRandom } from '../src/games/cityRushBuilder.js';
import { CITY_RUSH_LANE_X, CITY_RUSH_ROAD_WIDTH } from '../src/games/cityRushRules.js';
import { cityRushTheme } from '../src/games/cityRushThemes.js';

// ── Canevas enregistreur ────────────────────────────────────────────────────
// Note les rectangles remplis et les polygones fermés (les flèches), dans
// l'ordre de dessin. Aucun pixel n'est calculé : relire les coordonnées suffit
// à savoir de quel côté pointe une flèche et sur quelle voie elle est posée.
const rects = [];
const polygons = [];
let filling = '#000000';
let path = [];
const noop = () => {};
const context = {
  canvas: { width: 0, height: 0 },
  globalAlpha: 1,
  save: noop, restore: noop, translate: noop, rotate: noop, scale: noop,
  beginPath() { path = []; },
  closePath: noop,
  moveTo(x, y) { path.push([x, y]); },
  lineTo(x, y) { path.push([x, y]); },
  quadraticCurveTo(cx, cy, x, y) { path.push([x, y]); },
  bezierCurveTo(c1x, c1y, c2x, c2y, x, y) { path.push([x, y]); },
  arc: noop, ellipse: noop, rect: noop, clip: noop, stroke: noop,
  fill() { if (path.length >= 3) polygons.push({ points: [...path], fill: String(filling) }); },
  fillRect(x, y, width, height) {
    rects.push({ x, y, width, height, fill: String(filling), order: rects.length });
  },
  clearRect: noop, setLineDash: noop, drawImage: noop,
  fillText: noop, strokeText: noop, measureText: () => ({ width: 0 }),
  createLinearGradient: () => ({ addColorStop: noop }),
  createRadialGradient: () => ({ addColorStop: noop }),
  get fillStyle() { return filling; },
  set fillStyle(value) { filling = value; },
};
const canvas = {
  width: 0,
  height: 0,
  style: {},
  getContext: (kind) => (kind === '2d' ? context : null),
};
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? canvas : { style: {}, setAttribute() {}, appendChild() {} }),
  createElementNS: (_ns, tag) => globalThis.document.createElement(tag),
};

const { makeRoadTexture, makeExpresswayDeckTexture } = await import('../src/games/cityRushTextures.js');

// ── Relecture d'une flèche ──────────────────────────────────────────────────
// Une flèche est un polygone étroit et allongé, une par voie. Sa pointe est le
// sommet le plus éloigné du centre du polygone ; l'axe de la flèche donne sa
// voie. Le haut du carreau est le sens de la course : une pointe au-dessus du
// centre pointe donc vers l'avant.
function readArrows(polygons, toLaneX) {
  const arrows = [];
  for (const polygon of polygons) {
    const xs = polygon.points.map(([x]) => x);
    const ys = polygon.points.map(([, y]) => y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    if (polygon.points.length < 5 || spanY < 60 || spanX > 90) continue;
    const centreX = xs.reduce((sum, x) => sum + x, 0) / xs.length;
    const centreY = ys.reduce((sum, y) => sum + y, 0) / ys.length;
    // La pointe est le sommet **seul** à son extrémité : la queue de la flèche
    // en compte deux (ou plus), la pointe toujours un. Chercher simplement le
    // sommet le plus éloigné du centre tomberait sur la queue, plus longue.
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const atTop = polygon.points.filter(([, y]) => Math.abs(y - minY) < 0.5).length;
    const atBottom = polygon.points.filter(([, y]) => Math.abs(y - maxY) < 0.5).length;
    assert.ok(
      (atTop === 1) !== (atBottom === 1),
      'une flèche a une pointe seule et une queue plus large',
    );
    const tipY = atTop === 1 ? minY : maxY;
    arrows.push({
      laneX: toLaneX(centreX),
      forward: tipY < centreY,
      points: polygon.points.length,
    });
  }
  return arrows;
}

function laneOf(laneX) {
  let best = null;
  for (const centre of CITY_RUSH_LANE_X) {
    if (best === null || Math.abs(centre - laneX) < Math.abs(best - laneX)) best = centre;
  }
  assert.ok(Math.abs(best - laneX) < 0.35, `la flèche tombe sur une voie (${laneX.toFixed(2)} m)`);
  return best;
}

/** Dessine une texture et relit ses flèches. */
function arrowsOf(draw, toLaneX) {
  polygons.length = 0;
  rects.length = 0;
  const texture = draw();
  assert.ok(texture?.image, 'la texture est dessinée dans le canevas enregistreur');
  return readArrows(polygons, toLaneX);
}

/** Vérifie qu'une texture peint une flèche par voie, du bon côté. */
function checkTexture({ label, arrows, leftHand }) {
  assert.equal(arrows.length, 6, `${label} : une flèche par voie (${arrows.length})`);
  const byLane = new Map(arrows.map((arrow) => [laneOf(arrow.laneX), arrow]));
  assert.equal(byLane.size, 6, `${label} : les six voies ont chacune leur flèche`);
  for (const laneCenter of CITY_RUSH_LANE_X) {
    const arrow = byLane.get(laneCenter);
    const oncoming = leftHand ? laneCenter > 0 : laneCenter < 0;
    assert.equal(
      arrow.forward, !oncoming,
      `${label} : la voie à ${laneCenter} m pointe ${oncoming ? 'vers le joueur (contresens)' : 'vers l’avant'}`
      + ` — ${leftHand ? 'conduite à gauche' : 'conduite à droite'}`,
    );
  }
  return arrows;
}

// ── Rue urbaine : Vice City (à droite) et Londres (à gauche) ────────────────
const roadWidth = 512;
const toRoadLane = (px) => ((px - roadWidth / 2) / roadWidth) * CITY_RUSH_ROAD_WIDTH;

checkTexture({
  label: 'rue de Vice City',
  arrows: arrowsOf(() => makeRoadTexture(cityRushTheme('vice-city'), seededRandom(11)), toRoadLane),
  leftHand: false,
});

checkTexture({
  label: 'rue de Londres',
  arrows: arrowsOf(() => makeRoadTexture(cityRushTheme('london'), seededRandom(11)), toRoadLane),
  leftHand: true,
});

// ── Tablier de la Shuto (à gauche) et référence à droite ────────────────────
// Le tablier est dessiné par `makeExpresswayDeckTexture` : `halfWidth` couvre
// la moitié de la largeur du carreau. Une ville qui roule à droite appelée avec
// la même texture doit garder la peinture historique (contresens à gauche) —
// c'est le thème qui décide, pas la ville de Tokyo.
const deckHalfWidth = 10.6;
const deckWidth = 1024;
const toDeckLane = (px) => ((px - deckWidth / 2) / (deckWidth / 2)) * deckHalfWidth;

checkTexture({
  label: 'tablier de la Shuto',
  arrows: arrowsOf(() => makeExpresswayDeckTexture(cityRushTheme('tokyo'), seededRandom(3)), toDeckLane),
  leftHand: true,
});

checkTexture({
  label: 'tablier de référence (à droite)',
  arrows: arrowsOf(() => makeExpresswayDeckTexture(cityRushTheme('new-york'), seededRandom(3)), toDeckLane),
  leftHand: false,
});

console.log('check:city-rush-lanes ✓ — les flèches au sol suivent le pays : Vice City tourne à droite (contresens à gauche),'
  + ' Londres et la Shuto à gauche (contresens à droite), et le tablier garde sa peinture historique pour une ville qui roule à droite.');
