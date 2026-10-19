import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const battleCss = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const battlePage = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');

// ── La feuille de style : le plateau se floute, la carte consultée non ───────
assert.match(battleCss, /\.rpg-battle\s*\{[^}]*--rpg-plateau-flou:\s*3px;/s,
  'l’intensité du flou du plateau est une variable de la coque du jeu, réglable en un point');
assert.match(battleCss, /\.rpg-plateau-fond\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*-3;[^}]*inset:\s*0;[^}]*background-image:\s*inherit;[^}]*background-size:\s*cover;[^}]*opacity:\s*0;[^}]*pointer-events:\s*none;/s,
  'le calque jumeau reprend la peinture du plateau par héritage, sous les deux moitiés, invisible au repos et sans geste');
assert.match(battleCss, /\.card-table\[data-apercu-carte\]\s+\.rpg-plateau-fond\s*\{\s*opacity:\s*1;\s*\}/,
  'le calque jumeau ne prend la place de la peinture que pendant un aperçu');
assert.doesNotMatch(battleCss, /\.rpg-plateau-fond\s*\{[^}]*backdrop-filter\s*:/s,
  'pas de filtre de fond sur le plateau : une WebView peut recomposer cette couche par-dessus la carte');
assert.match(battleCss, /\.card-table\[data-apercu-carte\] \[data-card-id\]:not\(\[data-apercu-source\]\)/,
  'toutes les cartes du plateau passent au flou, sauf celle que l’on consulte');
assert.match(battleCss, /\.card-table\[data-apercu-carte\][^{]*\{[^}]*filter:\s*blur\(var\(--rpg-plateau-flou,\s*3px\)\);/s,
  'le flou est porté par les éléments du plateau eux-mêmes, à l’intensité de la variable');
assert.match(battleCss, /\.card-table\[data-apercu-carte\][^{]*\.rpg-plateau-moitie[^{]*\{/s,
  'une table découpée en deux moitiés se floute des deux côtés');
assert.match(battleCss, /\.card-table\[data-apercu-carte\][^{]*\.rpg-table-3d[^{]*\{/s,
  'le décor 3D de la table passe au flou avec la peinture');
assert.match(battleCss, /\.card-table\[data-apercu-carte\]\.card-table--plateau-cour-de-l-empereur::before\s*\{[^}]*filter:\s*blur\(var\(--rpg-plateau-flou,\s*3px\)\);/s,
  'la Cour de l’Empereur, qui double sa peinture en ::before, se floute comme les autres plateaux');
// Le voile sombre de la fiche n'est jamais flouté : le flou ne touche que le
// décor qu'il couvre. Une magie jouée n'a plus de voile ni d'aperçu : sa fiche
// compacte se pose au-dessus des piles sans toucher à la netteté de la table.
assert.equal(/rpg-preview-backdrop/.test(battleCss), false,
  'plus aucun voile d’aperçu de sort dans la feuille');

// ── La page : quand l'aperçu est ouvert, la table le dit ─────────────────────
assert.match(battlePage, /const apercuCarte = \(apercuAppui \|\| apercuCatalogue\) \? 'fiche' : null;/,
  'seule la fiche — le seul aperçu à voile sombre — floute le plateau, pas l’aperçu furtif du survol ni la fiche de sort');
assert.match(battlePage, /data-apercu-carte=\{apercuCarte \?\? undefined\}/,
  'la table porte l’aperçu ouvert, pour que la feuille de style sache flouter le plateau');
assert.match(battlePage, /<span className="rpg-plateau-fond" aria-hidden="true" \/>/,
  'le calque jumeau de la peinture est rendu dans la table, muet pour les lecteurs d’écran');
assert.match(battlePage, /carteSourceApercuRef\.current = hote;/,
  'la carte qui ouvre l’aperçu est retenue : c’est elle qui garde le focus');
assert.match(battlePage, /hote\.setAttribute\('data-apercu-source', ''\);\s*\n\s*return \(\) => hote\.removeAttribute\('data-apercu-source'\);/,
  'la marque de focus est posée à l’ouverture et retirée à la fermeture de l’aperçu');

const previousEnv = process.env.NODE_ENV;
await build({ logLevel: 'error', build: { ssr: 'scripts/rpg-plateau-flou-smoke.jsx', outDir: 'node_modules/.cache/rpg-plateau-flou', emptyOutDir: true } });
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/sablier-de-bab-el', pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
try {
  const { checkRpgPlateauFlou } = await import('../node_modules/.cache/rpg-plateau-flou/rpg-plateau-flou-smoke.js');
  await checkRpgPlateauFlou(assert);
  console.log('✓ Plateau flouté derrière une carte : l’appui long et le clic droit marquent la table (`data-apercu-carte`), la carte consultée garde seule le focus (`data-apercu-source`), et tout redevient net à la fermeture — bouton comme Échap');
  console.log('✓ Aperçu furtif du survol : la main peut être balayée sans que le plateau ne clignote, l’aperçu rapide ne floute rien');
  console.log('✓ Peinture du plateau : le calque jumeau ne la remplace que pendant l’aperçu, la table garde son décor le reste du temps');
} finally { dom.window.close(); }
