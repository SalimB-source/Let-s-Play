/**
 * `npm run check:city-rush-nordschleife-lanes`
 *
 * Le Ring se partage en quatre voies de 2,10 m : la piste doit donc porter son
 * marquage au sol, comme les rues des villes. Ce contrôle dessine la **vraie
 * texture de piste** (`makeRacewayTexture`) dans un canevas qui enregistre
 * chaque trait, puis relit le dessin en mètres :
 *   • une ligne discontinue au milieu de chacune des trois paires de voies
 *     (−2,10 m, 0 et +2,10 m), à la largeur peinte d'une vraie ligne (16 cm) ;
 *   • quatre traits par carreau, alignés bout à bout : le carreau se répétant
 *     en longueur, un motif qui ne retombe pas juste laisserait une couture
 *     visible au raccord ;
 *   • les deux lignes de rive continues, à l'intérieur des 9,20 m de bitume ;
 *   • rien de ce qui est peint ensuite (poussière des bords) ne recouvre une
 *     ligne de voie.
 * Une piste nue — l'état d'avant, « pas de ligne axiale » — échoue : les quatre
 * voies ne se lisent plus à l'écran.
 */
import assert from 'node:assert/strict';
import { seededRandom } from '../src/games/cityRushBuilder.js';
import {
  CITY_RUSH_LANE_PAINT_WIDTH,
  CITY_RUSH_LANE_WIDTH,
  CITY_RUSH_NORDSCHLEIFE_COURSE,
  CITY_RUSH_RACEWAY_ROAD_HALF,
  CITY_RUSH_SCROLL_SCALE,
  cityRushLaneConfig,
  cityRushLaneSeparators,
} from '../src/games/cityRushRules.js';
import { ROAD_TILE_LENGTH } from '../src/games/cityRushStage.js';
import { cityRushTheme } from '../src/games/cityRushThemes.js';

// ── Canevas enregistreur ────────────────────────────────────────────────────
// Un canvas 2D qui note chaque rectangle rempli, dans l'ordre de dessin. Aucun
// pixel n'est calculé : relire des rectangles suffit à vérifier où tombe la
// peinture, comment elle se répète et ce qui la recouvre.
const rects = [];
let filling = '#000000';
const context = {
  canvas: { width: 0, height: 0 },
  globalAlpha: 1,
  save() {}, restore() {}, beginPath() {}, closePath() {}, fill() {}, stroke() {},
  clearRect() {},
  fillRect(x, y, width, height) {
    rects.push({ x, y, width, height, fill: String(filling), order: rects.length });
  },
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

const { makeRacewayTexture } = await import('../src/games/nordschleifeStage.js');

const theme = cityRushTheme('nordschleife');
const texture = makeRacewayTexture(theme, seededRandom(7));
const tile = texture.image;
assert.ok(tile && tile.width > 0 && tile.height > 0, 'le carreau de piste est dessiné');
assert.ok(rects.length > 100, `le bitume est dessiné (${rects.length} rectangles)`);

// Le carreau couvre exactement la largeur de la piste : une abscisse de la
// simulation s'y lit en mètres sans autre conversion.
const metresPerPixel = (CITY_RUSH_RACEWAY_ROAD_HALF * 2) / tile.width;
const toMetres = (pixels) => pixels * metresPerPixel - CITY_RUSH_RACEWAY_ROAD_HALF;
const spanMetres = (pixels) => pixels * metresPerPixel;
// Longueur de piste couverte par un carreau : le ruban défile de ROAD_TILE_LENGTH
// unités monde par carreau, à l'échelle du jeu. Le carreau n'a pas le même
// nombre de pixels au mètre dans les deux sens (9,20 m sur 256 px en largeur,
// 37,2 m sur 512 px en longueur) : les longueurs se relisent avec leur échelle.
const tileMetres = ROAD_TILE_LENGTH / CITY_RUSH_SCROLL_SCALE;
const metresPerPixelY = tileMetres / tile.height;
const spanMetresY = (pixels) => pixels * metresPerPixelY;

// ── Les quatre voies et leurs séparateurs ───────────────────────────────────
const lanes = cityRushLaneConfig(CITY_RUSH_NORDSCHLEIFE_COURSE);
assert.equal(lanes.raceway, true, 'le Ring reste une piste resserrée');
assert.equal(lanes.laneCount, 4, 'la piste se partage en quatre voies');
assert.equal(lanes.oncomingLanes.length, 0, 'aucune voie de contresens sur un circuit');

const separators = cityRushLaneSeparators(CITY_RUSH_NORDSCHLEIFE_COURSE);
assert.deepEqual(separators.map((x) => Number(x.toFixed(6))), [-2.1, 0, 2.1],
  'les trois lignes tombent au milieu des paires de voies (−2,10 m, 0, +2,10 m)');
for (let lane = 0; lane < lanes.laneCount - 1; lane += 1) {
  const bridge = separators[lane];
  assert.ok(Math.abs((lanes.laneX(lane) + lanes.laneX(lane + 1)) / 2 - bridge) < 1e-9,
    `la ligne ${lane + 1} sépare exactement les voies ${lane} et ${lane + 1}`);
  assert.ok(Math.abs((lanes.laneX(lane + 1) - lanes.laneX(lane)) - CITY_RUSH_LANE_WIDTH) < 1e-9,
    'deux voies voisines gardent 2,10 m d’écart');
}

// ── Les traits de voie effectivement peints ─────────────────────────────────
// Un trait de voie : la largeur peinte d'une ligne (16 cm), moins d'un quart du
// carreau de haut. Le grain d'asphalte (1 à 4 px de haut), les traces de gomme
// (26 px de large) et les taches des bords ne tombent pas dans ce filtre.
const paintWidthPx = CITY_RUSH_LANE_PAINT_WIDTH / metresPerPixel;
const dashes = rects.filter((rect) => Math.abs(rect.width - paintWidthPx) < 0.05
  && rect.height > tile.height / 20 && rect.height < tile.height / 4);
assert.equal(dashes.length, separators.length * 4,
  'chaque ligne de voie porte quatre traits par carreau (un carreau ≈ 37 m de piste)');
// La peinture passe après les traces de gomme : elle se pose sur un bitume
// déjà usé, et rien d'opaque ne la recouvre.
const rubber = rects.filter((rect) => rect.width > 25 && rect.width < 27);
assert.ok(rubber.length > 0, 'les traces de gomme sont bien dessinées, elles aussi');
assert.ok(Math.min(...dashes.map((rect) => rect.order)) > Math.max(...rubber.map((rect) => rect.order)),
  'les lignes de voie sont peintes par-dessus les traces de gomme');

for (const separator of separators) {
  const line = dashes
    .filter((rect) => Math.abs(toMetres(rect.x + rect.width / 2) - separator) < 0.02)
    .sort((a, b) => a.y - b.y);
  assert.equal(line.length, 4, `la ligne de ${separator.toFixed(2)} m est discontinue sur tout le carreau`);
  assert.ok(Math.abs(line[0].y) < 0.01, `la ligne de ${separator.toFixed(2)} m commence au bord du carreau`);
  const period = line[1].y - line[0].y;
  assert.ok(Math.abs(period * 4 - tile.height) < 0.01,
    'le motif retombe juste au raccord : le carreau suivant reprend le trait suivant');
  const paintMetres = spanMetresY(line[0].height);
  const periodMetres = spanMetresY(period);
  assert.ok(Math.abs(paintMetres - periodMetres * 0.4) < 0.05,
    `un trait de ${paintMetres.toFixed(2)} m pour ${periodMetres.toFixed(2)} m de motif`);
  assert.ok(Math.abs(periodMetres - tileMetres / 4) < 0.05,
    `le motif fait ${periodMetres.toFixed(2)} m, soit le quart du carreau`);
  assert.ok(paintMetres > 2 && paintMetres < 6,
    `le trait fait ${paintMetres.toFixed(2)} m : lisible à 170 km/h`);
  // Le carreau se raccorde au suivant : après le quatrième trait, il reste
  // exactement l'interstice d'un trait, que le carreau suivant vient peindre.
  assert.ok(Math.abs((tile.height - line[3].y - line[3].height) - (period - line[0].height)) < 0.01,
    'l’interstice de fin de carreau fait la longueur d’un interstice, sans couture');
  for (const dash of line) {
    assert.ok(Math.abs(spanMetres(dash.width) - CITY_RUSH_LANE_PAINT_WIDTH) < 0.005,
      `chaque trait fait ${CITY_RUSH_LANE_PAINT_WIDTH} m de large`);
  }
  // Peinture claire et opaque : c'est un marquage, pas une tache d'huile.
  const paint = line[0].fill.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)[,\s/]+([\d.]+)?\s*\)/);
  assert.ok(paint, `la ligne est peinte d’une couleur pleine (${line[0].fill})`);
  const [r, g, b] = paint.slice(1, 4).map(Number);
  const alpha = paint[4] === undefined ? 1 : Number(paint[4]);
  assert.ok(r > 200 && g > 200 && b > 200, 'la peinture de voie est blanche');
  assert.ok(alpha >= 0.8, `la peinture est opaque (alpha ${alpha})`);
  // La ligne tient dans le bitume, sans mordre la rive ni l'herbe.
  assert.ok(Math.abs(separator) + CITY_RUSH_LANE_PAINT_WIDTH / 2 < CITY_RUSH_RACEWAY_ROAD_HALF,
    `la ligne de ${separator.toFixed(2)} m reste sur la piste`);
}

// ── Les lignes de rive, et ce qui pourrait recouvrir les voies ──────────────
const edgeLines = rects.filter((rect) => Math.abs(rect.height - tile.height) < 0.01 && rect.width < tile.width / 4);
assert.equal(edgeLines.length, 2, 'deux lignes de rive continues bordent la piste');
const edges = edgeLines.map((rect) => toMetres(rect.x + rect.width / 2)).sort((a, b) => a - b);
assert.ok(edges[0] < -3.9 && edges[1] > 3.9,
  `les rives peignent les 8,40 m utiles (${edges.map((x) => x.toFixed(2)).join(' m et ')} m)`);
for (const rect of edgeLines) {
  assert.ok(Math.abs(toMetres(rect.x + rect.width / 2)) + spanMetres(rect.width) / 2 < CITY_RUSH_RACEWAY_ROAD_HALF,
    'la ligne de rive reste sur le bitume');
}

// Rien de ce qui est peint après les lignes ne doit les recouvrir : la
// poussière des bords est le seul habillage qui passe au-dessus, et elle reste
// dans les 16 % extérieurs du carreau — jamais sur une voie.
const lastLanePaint = Math.max(...dashes.map((rect) => rect.order));
for (const rect of rects.filter((item) => item.order > lastLanePaint)) {
  for (const separator of separators) {
    const left = toMetres(rect.x);
    const right = toMetres(rect.x + rect.width);
    assert.ok(right < separator - CITY_RUSH_LANE_PAINT_WIDTH || left > separator + CITY_RUSH_LANE_PAINT_WIDTH,
      `le rectangle peint après les lignes (${left.toFixed(2)} m → ${right.toFixed(2)} m) recouvre la ligne de ${separator.toFixed(2)} m`);
  }
}

const decimal = (value) => value.toFixed(2).replace('.', ',').replace('-', '−');
const separatorList = separators.map((x) => `${decimal(x)} m`).join(', ');
const dashMetres = spanMetresY(tile.height / 4 * 0.4);
console.log(`check:city-rush-nordschleife-lanes ✓ — la piste du Ring porte ses quatre voies de 2,10 m : une ligne blanche discontinue à ${separatorList} (trait de ${decimal(dashMetres)} m), deux rives continues sur les 8,40 m utiles, et rien qui recouvre le marquage.`);
