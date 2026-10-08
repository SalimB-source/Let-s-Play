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
  const comicCss = fs.readFileSync(path.join(root, 'src', 'games', 'vice-city-rush-hub-skin.css'), 'utf8');
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
  // Depuis la répartition en pages, chaque page a sa grille et c'est la classe
  // de la page ouverte (`is-step-*`) qui la choisit : la barre des pages mène la
  // pile, et la campagne n'y occupe plus une ligne — elle a son écran à elle.
  assert.match(comicCss, /grid-template-areas:\s*'bar' 'stepper' 'copy' 'tutorial' 'free' 'modes' 'actions' 'foot'/,
    'les zones nommées des menus (téléphone) sont intactes');
  const tabletGrid = comicCss.slice(comicCss.indexOf('@media (hover: none) and (pointer: coarse) and (min-width: 761px) and (max-width: 1100px)'));
  assert.match(tabletGrid, /'bar'\s*\n\s*'stepper'\s*\n\s*'copy'\s*\n\s*'tutorial'\s*\n\s*'free'\s*\n\s*'modes'/,
    'les zones nommées des menus (tablette) sont intactes');
  // Le hub de préparation reste dans le flux hors plein écran : rien de ce qui
  // a été corrigé pour les vignettes de mode n'a été défait.
  const introStage = declarationsOf(cinematicCss, '.city-rush-page .city-rush-viewport.is-intro');
  assert.match(introStage, /(^|;)\s*height:\s*auto/, 'la fenêtre de jeu prend encore la hauteur du hub');
  const hub = declarationsOf(cinematicCss, '.city-rush-page .city-rush-viewport.is-intro > .city-rush-intro:not(.city-rush-story-cinematic)');
  assert.match(hub, /(^|;)\s*position:\s*relative/, 'le hub de préparation revient encore dans le flux');

  // ── L'écran-titre, lui aussi, a son plateau ──────────────────────────────
  // La même scène, un autre cadrage : posée derrière le menu principal, dézoomée
  // et sourde aux gestes (le hub est une couche de dialogue, pas une vitrine
  // qu'on manipule). Et la page rend la sienne pendant que le hub est ouvert.
  const menuCss = fs.readFileSync(path.join(root, 'src', 'games', 'vice-city-rush-menu.css'), 'utf8');
  const menuSource = fs.readFileSync(path.join(root, 'src', 'games', 'ViceCityRushMainMenu.jsx'), 'utf8');
  const pageSource = fs.readFileSync(path.join(root, 'src', 'games', 'ViceCityRushPage.jsx'), 'utf8');
  const stageSource = fs.readFileSync(path.join(root, 'src', 'games', 'ViceCityGarageStage.jsx'), 'utf8');

  const layer = declarationsOf(menuCss, '.vcr-menu-stage');
  assert.match(layer, /(^|;)\s*position:\s*absolute/, 'le plateau de l’écran-titre est une couche de fond');
  assert.match(layer, /(^|;)\s*inset:\s*0/, 'il couvre tout l’écran-titre');
  assert.match(layer, /(^|;)\s*overflow:\s*hidden/, 'rien ne déborde du cadre du hub');
  const deaf = declarationsOf(menuCss, '.vcr-menu .city-rush-hub-stage-canvas.city-rush-hub-stage-canvas');
  assert.match(deaf, /(^|;)\s*pointer-events:\s*none/, 'à l’écran-titre, le décor 3D ne capte aucun geste');
  assert.match(deaf, /(^|;)\s*touch-action:\s*none/, 'au doigt non plus : la page défile, la caméra ne tourne pas');

  const framings = stageSource.match(/GARAGE_FRAMINGS\s*=\s*Object\.freeze\(\{([\s\S]*?)\n\}\);/)?.[1] || '';
  assert.ok(framings, 'la scène connaît deux cadrages (`GARAGE_FRAMINGS`)');
  const frameBlock = (nom) => framings.match(new RegExp(nom + ':\\s*Object\\.freeze\\(\\{([\\s\\S]*?)\\}\\)'))?.[1] || '';
  const garageFrame = frameBlock('garage');
  const vitrineFrame = frameBlock('vitrine');
  assert.ok(garageFrame && vitrineFrame, '« garage » et « vitrine » sont réglés tous les deux');
  // La table écrit soit en dur, soit en jetons de la feuille (`fill:
  // FRAME_PLATFORM_FILL`) : les deux se lisent, le jeton se résout dans le
  // fichier même.
  const number = (source, nom) => {
    const raw = source.match(new RegExp(nom + ':\\s*([\\w.]+)'))?.[1];
    if (!raw) return 0;
    if (/^[\d.]+$/.test(raw)) return Number(raw);
    return Number(stageSource.match(new RegExp('const ' + raw + '\\s*=\\s*([\\d.]+)'))?.[1]) || 0;
  };
  assert.ok(
    number(vitrineFrame, 'fill') > 0 && number(vitrineFrame, 'fill') < number(garageFrame, 'fill') - 0.3,
    `l’écran-titre dézoome : plateau à ${(number(vitrineFrame, 'fill') * 100).toFixed(0)} % du cadre contre ${(number(garageFrame, 'fill') * 100).toFixed(0)} % au garage`,
  );
  assert.ok(number(vitrineFrame, 'fov') > number(garageFrame, 'fov'), 'et ouvre l’objectif');
  assert.ok(number(vitrineFrame, 'spin') >= number(garageFrame, 'spin'), 'le plateau tourne au moins aussi vite : au large, le mouvement se lit moins');
  assert.ok(number(vitrineFrame, 'max') < 13.2, 'le recul de la vitrine reste borné : la caméra ne sort pas de la salle');
  assert.ok(number(vitrineFrame, 'pixelRatio') <= number(garageFrame, 'pixelRatio'), 'le décor du titre se rend à une résolution au plus égale de celle de l’écran qu’on choisit');

  // Le lot du showroom est construit par le constructeur de la course : ses
  // géométries sont des constantes partagées avec le plateau (`UNIT_BOX`,
  // `HEADLIGHT_CONE`…). Les rendre au démontage viderait le GPU de la course.
  assert.match(stageSource, /ownModelMaterials\(parked\)/, 'le lot ne rend que ses matériaux');
  assert.doesNotMatch(stageSource, /own\(parked\)/, 'et jamais ses géométries : elles ne sont pas à lui');
  assert.match(stageSource, /if \(!lite\) \{[\s\S]{0,400}vice-city-garage-lot/, 'sur un appareil tactile, le lot reste au garage');
  assert.match(menuSource, /framing="vitrine"/, 'l’écran-titre demande le cadrage vitrine');
  assert.match(menuSource, /fallbackLabel=""/, 'et sans légende de repli : la photo EST le décor du hub');
  assert.match(menuSource, /className="vcr-menu-bg"[^>]*src=\{carThumb\}/, 'la photo du modèle reste posée sous la scène');
  assert.match(pageSource, /car=\{CITY_RUSH_SHOWCASE_CAR\}/, 'la vitrine roule la pièce du catalogue, pas la voiture du garage');
  assert.match(pageSource, /\{!titleMenuOpen && \(\s*<ViceCityGarageStage/, 'la page rend son propre contexte WebGL tant que le hub tient l’écran');

  console.log('check:city-rush-garage-3d ✓ — le hub de préparation est une concession : la voiture modélisée tourne sur son plateau derrière les menus, la plaque annonce le modèle monté, le focus clavier le fait tourner au modèle visé sans lancer la course, et sans WebGL la photo du modèle prend le relais ; l’écran-titre reprend la même scène, dézoomée et sourde aux gestes.');
} catch (error) {
  console.error(error?.message || error);
  code = 1;
} finally {
  dom.window.close();
}
process.exit(code);
