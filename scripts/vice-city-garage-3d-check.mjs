/**
 * `npm run check:city-rush-garage-3d`
 *
 * Vérifie le nouveau hub de Vice City Rush, type Need for Speed : une voiture
 * modélisée en 3D posée dans un garage, et les menus au-dessus, sur la même
 * page.
 *
 * Deux moitiés, comme les autres vérifications de la page :
 *   · **la page réelle**, montée dans jsdom avec le moteur de course remplacé
 *     par une doublure (`scripts/vice-city-garage-3d-smoke.jsx`) — jsdom n'a pas
 *     de WebGL, ce qui permet au passage de prouver que l'écran retombe sur la
 *     photo du modèle au lieu de casser ;
 *   · **les invariants de feuille de style**, lus dans les fichiers sources : la
 *     scène reste une couche de fond (donc les grilles à zones nommées des menus
 *     sont intactes) et le contenu passe devant elle.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stub = path.join(root, 'scripts', 'vice-city-world-stub.jsx');

// jsdom n'a pas de WebGL : le moteur 3D de course est remplacé par une doublure
// au moment de résoudre les imports de « ViceCityWorld ». La page, elle, est la
// vraie — et la scène de garage, aussi : c'est justement son repli que l'on
// veut voir à l'œuvre ici.
const previousEnv = process.env.NODE_ENV;
await build({
  root,
  logLevel: 'error',
  plugins: [{
    name: 'vice-city-garage-3d-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: { ssr: 'scripts/vice-city-garage-3d-smoke.jsx', outDir: 'node_modules/.cache/vice-city-garage-3d', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/vice-city-rush' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkViceCityGarage3d } = await import('../node_modules/.cache/vice-city-garage-3d/vice-city-garage-3d-smoke.js');
let code = 0;
try {
  await checkViceCityGarage3d(assert);

  // ── La scène reste un décor : les menus gardent leur mise en page ─────────
  // jsdom ne calcule pas la mise en page : les invariants sont lus dans les
  // feuilles de style, comme le fait `check:vice-city-fullscreen`.
  const garageCss = fs.readFileSync(path.join(root, 'src', 'games', 'vice-city-rush-garage.css'), 'utf8');
  const comicCss = fs.readFileSync(path.join(root, 'src', 'games', 'vice-city-rush-comic.css'), 'utf8');
  const cinematicCss = fs.readFileSync(path.join(root, 'src', 'games', 'vice-city-rush-cinematic.css'), 'utf8');

  /** Déclarations de la première règle dont la liste de sélecteurs contient `selector`. */
  function declarationsOf(source, selector) {
    const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const match of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selectors = match[1].split(',').map((item) => item.replace(/\s+/g, ' ').trim());
      if (selectors.includes(selector)) return match[2].replace(/\s+/g, ' ').trim();
    }
    return '';
  }

  const stage = declarationsOf(garageCss, '.city-rush-page .city-rush-hub-stage');
  assert.match(stage, /(^|;)\s*position:\s*absolute/, 'la scène est posée en couche de fond du hub');
  assert.match(stage, /(^|;)\s*inset:\s*0/, 'elle couvre tout le hub de préparation');
  assert.match(stage, /(^|;)\s*z-index:\s*0/, 'elle passe derrière les menus');
  assert.match(stage, /(^|;)\s*pointer-events:\s*none/, 'le décor ne vole aucun clic aux menus');

  const lift = declarationsOf(garageCss, '.city-rush-page .city-rush-intro:not(.city-rush-story-cinematic) > *:not(.city-rush-hub-stage):not(.city-rush-hub-stage-scrim):not(.city-rush-hub-stage-frame)');
  assert.match(lift, /(^|;)\s*position:\s*relative/, 'les menus repassent dans le flux, au-dessus du décor');
  assert.match(lift, /(^|;)\s*z-index:\s*1/, 'les menus passent devant la scène');

  const canvas = declarationsOf(garageCss, '.city-rush-hub-stage-canvas');
  assert.match(canvas, /(^|;)\s*pointer-events:\s*auto/, 'le canvas, lui, répond au regard glissé sur la baie');
  assert.match(canvas, /(^|;)\s*touch-action:\s*pan-y/, 'au doigt, seul le geste horizontal regarde la voiture');

  // Les grilles à zones nommées des menus n'ont pas bougé : la scène est hors
  // flux, donc elles gouvernent toujours l'ordre des étapes.
  assert.match(comicCss, /grid-template-areas:\s*'stepper' 'copy' 'free' 'modes' 'story' 'actions' 'foot'/,
    'les zones nommées des menus (téléphone) sont intactes');
  assert.match(comicCss, /grid-template-areas:\s*\n?\s*'stepper'\s*\n?\s*'copy'\s*\n?\s*'free'\s*\n?\s*'modes'\s*\n?\s*'story'/,
    'les zones nommées des menus (tablette) sont intactes');
  // Le hub de préparation reste dans le flux hors plein écran : rien de ce qui
  // a été corrigé pour les vignettes de mode n'a été défait.
  const introStage = declarationsOf(cinematicCss, '.city-rush-page .city-rush-viewport.is-intro');
  assert.match(introStage, /(^|;)\s*height:\s*auto/, 'la fenêtre de jeu prend encore la hauteur du hub');
  const hub = declarationsOf(cinematicCss, '.city-rush-page .city-rush-viewport.is-intro > .city-rush-intro:not(.city-rush-story-cinematic)');
  assert.match(hub, /(^|;)\s*position:\s*relative/, 'le hub de préparation revient encore dans le flux');

  console.log('check:city-rush-garage-3d ✓ — le hub de préparation est un garage : la voiture modélisée tourne sur son plateau derrière les menus, la plaque annonce le modèle monté, le focus clavier le fait tourner au modèle visé sans lancer la course, et sans WebGL la photo du modèle prend le relais.');
} catch (error) {
  console.error(error?.message || error);
  code = 1;
} finally {
  dom.window.close();
}
process.exit(code);
