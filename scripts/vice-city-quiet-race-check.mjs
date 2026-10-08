/**
 * `npm run check:city-rush-quiet`
 *
 * Deux promesses d'écran pour Vice City Rush, vérifiées ensemble parce
 * qu'elles font la même chose : laisser la route au pilote.
 *
 *   · LE CHOIX DU MODE SE TOUCHE. Sur téléphone et sur tablette, les trois
 *     vignettes (CIRCUIT, SPRINT, POURSUITE) se rangeaient dans une bande
 *     horizontale à défilement aimanté : le doigt partait en glissement et le
 *     mode restait dur à ouvrir. La feuille de style les empile maintenant en
 *     rangées pleine largeur, sans défilement latéral, en tête de la page
 *     COURSE RAPIDE — visibles sans faire défiler l'écran.
 *
 *   · UNE PAGE NE MONTRE QUE CE QU'ELLE VEND. Le hub a découpé l'ancien écran «
 *     modes » en pages (HISTOIRE, TOURNOIS, COURSE RAPIDE, GARAGE-concession) ;
 *     la page ouverte est écrite dans la classe `is-step-*` de la surimpression,
 *     et c'est elle — plus la présence d'un bloc Histoire — qui décide de la
 *     grille. Le groupe 3 vérifie les deux.
 *
 *   · LA COURSE EST MUETTE. Plus de fenêtre de message, plus de bandeau de
 *     tour, plus de pastille d'état en piste : les faits de course vivent dans
 *     les cartes du HUD et dans la scène. Hors course, les menus répondent
 *     encore (garage, achat, fin de chapitre) — c'est ce que monte le smoke.
 *
 * Le smoke monte la vraie page dans jsdom avec la doublure du moteur 3D
 * (`scripts/vice-city-world-stub.jsx`) ; les règles de style, elles, se lisent
 * dans `src/games/vice-city-rush-hub-skin.css`.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stub = path.join(root, 'scripts', 'vice-city-world-stub.jsx');
const comic = readFileSync(path.join(root, 'src/games/vice-city-rush-hub-skin.css'), 'utf8');
const base = readFileSync(path.join(root, 'src/games/vice-city-rush.css'), 'utf8');
const pageSource = readFileSync(path.join(root, 'src/games/ViceCityRushPage.jsx'), 'utf8');

/** Dernière déclaration d'un sélecteur (la plus spécifique, en fin de feuille). */
function lastRule(css, selector) {
  const rules = [...css.matchAll(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`, 'g'))];
  return rules.at(-1)?.[1] || '';
}
/** Toutes les déclarations d'un sélecteur, media queries comprises. */
function allRules(css, selector) {
  return [...css.matchAll(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`, 'g'))].map((match) => match[1]);
}

// ── 1. Le choix du mode ─────────────────────────────────────────────────────
// Aucun bandeau horizontal, nulle part : ni défilement latéral sur le
// sélecteur de modes, ni défilement aimanté qui vole le clic.
for (const css of [base, comic]) {
  assert.doesNotMatch(css, /scroll-snap-type:\s*x\s+mandatory/, 'plus aucun carrousel aimanté dans les modes');
}
for (const declarations of allRules(comic, '.city-rush-page.city-rush-page .city-rush-mode-picker')) {
  assert.doesNotMatch(declarations, /overflow-x:\s*auto/, 'le sélecteur de modes ne défile plus horizontalement');
}
/** Bloc `@media` entier, accolades comprises, à partir de son en-tête. */
function mediaBlock(css, header) {
  const start = css.indexOf(header);
  assert.notEqual(start, -1, `la section « ${header} » existe`);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  assert.fail(`la section « ${header} » est fermée`);
}

const pickerRules = allRules(comic, '.city-rush-page.city-rush-page .city-rush-mode-picker');
assert.ok(pickerRules.some((declarations) => /grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(declarations)),
  'au doigt, les trois modes s’empilent sur une colonne');
assert.ok(pickerRules.some((declarations) => /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(\d+px,\s*1fr\)\)/.test(declarations)),
  'sur tablette ou téléphone couché, la grille s’élargit : les trois modes restent dans l’écran');

// Fenêtre basse : la préparation se resserre pour que le choix du mode tienne.
const shortWindow = mediaBlock(comic, '@media (hover: none) and (pointer: coarse) and (max-height: 780px)');
const lyingWindow = mediaBlock(comic, '@media (hover: none) and (pointer: coarse) and (max-height: 620px) and (min-width: 560px)');
assert.match(lyingWindow, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/, 'téléphone couché : les trois modes tiennent côte à côte');
assert.match(lyingWindow, /\.city-rush-mode-description[\s\S]*?-webkit-line-clamp:\s*2/, 'téléphone couché : la description se limite à deux lignes');
assert.match(lyingWindow, /\.city-rush-intro-copy,[\s\S]*?\{ display: none; \}/, 'téléphone couché : le chapeau laisse toute la hauteur aux modes');
const tabletOrder = mediaBlock(comic, '@media (hover: none) and (pointer: coarse) and (min-width: 761px) and (max-width: 1100px)');
assert.match(tabletOrder, /grid-template-areas:\s*\n?\s*'bar'\s*\n?\s*'stepper'\s*\n?\s*'copy'\s*\n?\s*'tutorial'\s*\n?\s*'free'\s*\n?\s*'modes'/,
  'sur tablette aussi, la barre des pages commande, et les modes viennent avant les actions');
const tinyWindow = mediaBlock(comic, '@media (hover: none) and (pointer: coarse) and (max-height: 620px) and (max-width: 559px), (hover:none) and (pointer:coarse) and (max-device-width:600px)');
assert.match(tinyWindow, /city-rush-overlay-kicker,[\s\S]*?\.cr-story-free-mode-heading\s*\{ display: none; \}/,
  'petit écran : le chapeau d’étape s’efface lui aussi');
assert.match(shortWindow, /\.city-rush-intro-copy > p\s*\{\s*display:\s*none/, 'écran bas : le chapeau libère la hauteur du mode');
assert.match(shortWindow, /\.city-rush-mode-description[\s\S]*?-webkit-line-clamp:\s*1/, 'écran bas : la description tient sur une ligne');
assert.match(shortWindow, /\.city-rush-mode-card > small\s*\{\s*display:\s*none/, 'écran bas : le détail du mode s’efface');

// La rangée tactile : icône à gauche, texte à droite, une seule rangée à taper.
const touchCard = comic.match(/@media \(max-width: 760px\), \(hover: none\) and \(pointer: coarse\), \(hover: ?none\) and \(pointer: ?coarse\) and \(max-device-width: ?600px\) \{\s*\n\s*\.city-rush-page\.city-rush-page \.city-rush-mode-picker[\s\S]*?\n\}/)?.[0] || '';
assert.ok(touchCard, 'la section « choix du mode au doigt » existe');
assert.match(touchCard, /touch-action:\s*manipulation/, 'le doigt garde le clic (pas de double tape ni de délai)');
assert.match(touchCard, /grid-template-columns:\s*50px minmax\(0,\s*1fr\)/, 'l’icône du mode tient la colonne de gauche');
assert.match(touchCard, /\.city-rush-mode-card \.city-rush-mode-icon\s*\{[^}]*grid-row:\s*1 \/ span 3/, 'l’icône couvre la hauteur du titre');
assert.match(touchCard, /\.city-rush-mode-card \.city-rush-mode-card-footer\s*\{[^}]*grid-column:\s*1 \/ -1/, 'les pastilles de bas de carte prennent toute la largeur');

// Sur téléphone, la barre des pages ouvre l'écran et les modes suivent, avant
// les actions — la campagne n'a plus rien à attendre ici, elle a sa page.
assert.match(comic, /grid-template-areas:\s*'bar' 'stepper' 'copy' 'tutorial' 'free' 'modes' 'actions' 'foot'/,
  'les modes se touchent juste après le chapeau, et la barre des pages commande');

// ── 3. Une page par famille, et une grille par page ────────────────────────
// Le découpage en pages ne tient que si la feuille de style le connaît : la
// surimpression porte la classe de la page ouverte, chaque page a sa grille, et
// une page ne se reconnaît plus au hasard d'un bloc posé à côté d'elle.
assert.match(pageSource, /city-rush-overlay city-rush-intro is-step-\$\{introStep\}/,
  'la surimpression de préparation porte la classe de la page ouverte');

// La peau ne raisonne plus en `:has(.cr-story-hub)` : cette condition aurait
// collé la grille de la course rapide à la page HISTOIRE, qui contient le même
// bloc sans être la même page.
assert.doesNotMatch(comic, /:has\(\.cr-story-hub\)/,
  'la peau du hub lit la page dans sa classe, pas dans son contenu');

/** Toutes les déclarations d'un sélecteur, media queries comprises — métacaractères échappés. */
function ruleText(css, selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // La règle de la page elle-même, et toutes celles de ses enfants : tout ce
  // dont le sélecteur contient cette page, jusqu'à son accolade fermante.
  const re = new RegExp(`[^{}]*${esc}[^{}]*\\{([^}]*)\\}`, 'g');
  return [...css.matchAll(re)].map((match) => match[1]).join('\n');
}
/** Les trois contextes où la peau pose une grille, et la zone de tête attendue. */
const contexts = [
  ['écran large', '@media (min-width: 1101px) and (hover:hover), (min-width: 1101px) and (min-device-width:601px)', /'bar bar'/],
  ['téléphone', '@media (max-width: 760px), (hover:none) and (pointer:coarse) and (max-device-width:600px)', /'bar'/],
  ['tablette', '@media (hover: none) and (pointer: coarse) and (min-width: 761px) and (max-width: 1100px)', /'bar'/],
];
for (const [nom, entete, zones] of contexts) {
  const bloc = mediaBlock(comic, entete);
  // Chaque page écrit sa grille dans son contexte : une grille qui ne tiendrait
  // que dans un seul des trois laisserait un écran sans mise en page.
  const course = ruleText(bloc, '.city-rush-page.city-rush-page .city-rush-intro.is-step-mode');
  assert.ok(course, `la page COURSE RAPIDE a sa grille (${nom})`);
  assert.match(course, zones, `la barre des pages commande le haut de l’écran (${nom})`);
  const parPage = course.split('\n').join(' ');
  for (const zone of ['bar', 'stepper', 'copy', 'tutorial', 'free', 'modes', 'actions', 'foot']) {
    assert.match(parPage, new RegExp(`grid-area:\\s*${zone};`), `la zone « ${zone} » est branchée sur la page course rapide (${nom})`);
  }
  assert.doesNotMatch(parPage, /grid-area:\s*story/, `la course rapide n’a plus de zone pour la campagne (${nom})`);

  const liste = ruleText(bloc, '.city-rush-page.city-rush-page .city-rush-intro:is(.is-step-story, .is-step-tournament)');
  assert.ok(liste, `les pages HISTOIRE et TOURNOIS ont leur grille (${nom})`);
  const enListe = liste.split('\n').join(' ');
  assert.match(enListe, zones, `la barre des pages commande aussi les pages de liste (${nom})`);
  for (const zone of ['bar', 'copy', 'list', 'actions', 'foot']) {
    assert.match(enListe, new RegExp(`grid-area:\\s*${zone};`), `la zone « ${zone} » est branchée sur les pages de liste (${nom})`);
  }
  assert.doesNotMatch(enListe, /grid-area:\s*modes/, `les pages de liste ne réservent rien pour les modes (${nom})`);
}

// Le contenu, maintenant : ce que chaque page dessine — pas seulement comment.
const pageBlock = (step) => {
  const start = pageSource.indexOf(`{introStep === '${step}' && (`);
  assert.notEqual(start, -1, `la page « ${step} » est dessinée par la page de jeu`);
  const rest = pageSource.slice(start + 1);
  const next = rest.search(/\n {16}\{introStep === |\n {16}\{\/\* /);
  return next === -1 ? rest.slice(0, 16000) : rest.slice(0, next);
};
const racePage = pageBlock('mode');
const storyPage = pageBlock('story');
const tournamentPage = pageBlock('tournament');
assert.match(racePage, /city-rush-mode-picker/, 'la page COURSE RAPIDE tient les modes libres');
assert.match(racePage, /city-rush-tutorial-launch/, 'et le tour guidé');
for (const [nom, bloc] of [['COURSE RAPIDE', racePage], ['TOURNOIS', tournamentPage]]) {
  assert.doesNotMatch(bloc, /cr-story-hub/, `la page ${nom} ne ressert pas le mode histoire`);
}
for (const [nom, bloc] of [['COURSE RAPIDE', racePage], ['HISTOIRE', storyPage]]) {
  assert.doesNotMatch(bloc, /cr-tournament-hub/, `la page ${nom} ne ressert pas les tournois`);
}
assert.match(storyPage, /cr-story-hub/, 'la page HISTOIRE tient la campagne');
assert.match(tournamentPage, /cr-tournament-hub/, 'la page TOURNOIS tient les plateaux');

// Le garage-concession : acheter n'est pas démarrer.
assert.match(pageSource, /const garageIsShop = introStep === 'garage' && garageVisit === 'shop';/,
  'le garage sait dans quelle vie il est');
assert.match(pageSource, /onClick=\{\(\) => \(garageIsShop \? buyOrTakeCar\(car\.id\) : chooseCarAndStart\(car\.id\)\)\}/,
  'une carte du garage achète ou choisit en concession, et lance en fin de parcours');
const shopFn = pageSource.slice(pageSource.indexOf('const buyOrTakeCar'), pageSource.indexOf('const goBack'));
assert.ok(shopFn.length > 80, 'le geste du concessionnaire est écrit');
assert.doesNotMatch(shopFn, /startRace\(/, 'et ne lance aucune course');
assert.match(shopFn, /purchaseCityRushCar\(/, 'il passe bien par l’achat crédité en billets verts');
assert.match(pageSource, /\{!garageIsShop && \(/,
  'le choix du pilote n’est dessiné que quand le garage ferme un parcours');

// ── 2. La course muette ─────────────────────────────────────────────────────
// Les trois surfaces de message ont quitté la course : le bandeau de tour et la
// pastille d'état ne sont plus dessinés du tout, et l'unique fenêtre restante
// est celle des menus — montée seulement hors course.
for (const surface of ['city-rush-lap-banner', 'city-rush-status-pill']) {
  assert.doesNotMatch(pageSource, new RegExp(surface), `la page ne dessine plus « ${surface} »`);
}
const toastLines = pageSource.split('\n').filter((line) => line.includes('city-rush-toast'));
assert.equal(toastLines.length, 1, 'une seule fenêtre de message dans toute la page : celle des menus');
assert.match(pageSource, /phase !== 'playing' && toast &&/, 'la fenêtre des menus reste, hors course');
assert.match(pageSource, /function showToast\(message, tone = 'neutral'\) \{\s*\n\s*if \(phaseRef\.current === 'playing'\) return;/,
  'aucun message ne s’ouvre pendant que la voiture roule');
assert.doesNotMatch(pageSource, /onPickup=\{|onLap=\{|fireStoryRadio/, 'plus de commentaire de course branché sur le moteur');

// La fenêtre des menus vit dans la fenêtre de jeu (jamais dans le HUD) et passe
// au-dessus de la surimpression de préparation (`.city-rush-overlay`, z-index 6).
const menuToast = lastRule(comic, '.city-rush-page.city-rush-page .city-rush-viewport > .city-rush-toast');
assert.match(menuToast, /z-index:\s*7/, 'la fenêtre des menus passe au-dessus des écrans de préparation');
// jsdom n'a pas de WebGL : le moteur 3D est remplacé par une doublure qui garde
// les props de la page. La page, elle, est la vraie.
const previousEnv = process.env.NODE_ENV;
await build({
  root,
  logLevel: 'error',
  plugins: [{
    name: 'vice-city-quiet-race-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: { ssr: 'scripts/vice-city-quiet-race-smoke.jsx', outDir: 'node_modules/.cache/vice-city-quiet-race', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/vice-city-rush' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkViceCityQuietRace } = await import(
  path.join(root, 'node_modules/.cache/vice-city-quiet-race/vice-city-quiet-race-smoke.js')
);
let code = 0;
try {
  await checkViceCityQuietRace(assert);
  console.log('check:city-rush-quiet ✓ — les trois modes s’empilent en rangées pleine largeur, sans défilement' + '\n' +
'latéral, en tête de la page COURSE RAPIDE ; chaque page a sa grille — la surimpression lit' + '\n' +
'« is-step-* », jamais le contenu — et le garage-concession vend sans jamais lancer la course ;' + '\n' +
'en course, plus aucune fenêtre de message, plus de bandeau de tour ni de pastille d’état — les' + '\n' +
'menus, eux, répondent toujours.');
} catch (error) {
  console.error(error?.message || error);
  code = 1;
} finally {
  dom.window.close();
}
process.exit(code);
