import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// Vérification d'interface du mode Histoire : tours, étages verrouillés,
// lancement d'un étage (sorcier, puissance et profil), navigation et progression.
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-story-smoke.jsx', outDir: 'node_modules/.cache/rpg-story', emptyOutDir: true },
});
// `build()` force NODE_ENV=production dans CE processus : React chargerait sa
// version de production, sans `act`. On restaure la valeur d'origine.
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/jeu/sablier-de-bab-el',
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkRpgStory } = await import('../node_modules/.cache/rpg-story/rpg-story-smoke.js');
try {
  await checkRpgStory(assert);
} finally {
  dom.window.close();
}

const pageSource = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
assert.match(pageSource, /marquerEtageVaincu\(progression, histoireEtageId\)/,
  'la victoire en mode Histoire est enregistrée dans la progression');
assert.match(pageSource, /Étage suivant/, 'la victoire propose l’étage suivant');
assert.match(pageSource, /Recommencer l’étage/, 'la défaite permet de rejouer l’étage');
assert.match(pageSource, /Tour terminée/, 'le sommet annonce la fin de la tour');
// Le portrait d'un étage : celui de l'étage s'il en a un, l'Ifrit générique sinon.
assert.match(pageSource, /cardArt\(etageHistoire \? etageHistoire\.avatar \?\? 'ifrit-al-ahmar' : deckBoxArtUrl\(deckAdverseAffiche\)\)/,
  'la plaque du sorcier suit le portrait de l’étage quand il en porte un');

// ── Lisibilité : tout le texte du mode Histoire doit rester lisible, en thème clair
// comme en thème sombre. Ces garde-fous lisent les sources CSS (le rendu réel a été
// mesuré au navigateur) pour qu'une régression ne repasse pas inaperçue :
//  · descriptions d'étage coupées par une ellipse (on n'en voyait que le quart) ;
//  · étages verrouillés estompés par `opacity` (≈ 2,7:1) ;
//  · jetons du site (`--ink`, `--muted`…) qui passent à l'encre sombre en thème clair
//    alors que l'écran de jeu reste sombre (bleu nuit sur noir, ≈ 1,1:1) ;
//  · boutons de fin d'étage recouverts par les éléments de la table (overlay sans z-index) ;
//  · libellé « MODE HISTOIRE » replié sur 4 lignes et rogné sur téléphone.
const readSource = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const cssRules = (path) => [...stripComments(readSource(path)).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(([, selector, body]) => ({ selectors: selector.split(',').map((item) => item.trim().replace(/\s+/g, ' ')), body }));
const rulesFor = (rules, selector) => rules.filter((rule) => rule.selectors.includes(selector));
const declared = (rules, selector, prop) => rulesFor(rules, selector)
  .flatMap((rule) => [...rule.body.matchAll(new RegExp(`(?:^|[;\\s])${prop}\\s*:\\s*([^;]+)`, 'g'))].map((match) => match[1].trim()));
const customProps = (rules, selector) => rulesFor(rules, selector)
  .flatMap((rule) => [...rule.body.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
const customValues = (rules, selector) => Object.fromEntries(rulesFor(rules, selector)
  .flatMap((rule) => [...rule.body.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)].map((match) => [match[1], match[2].toLowerCase().replace(/\s+/g, '')])));

const storyCss = cssRules('../src/games/rpg-story.css');
const battleCss = cssRules('../src/games/rpg-battle.css');
const LIGHT_SCENE = ":root[data-theme='light'] .rpg-battle";

// Toute règle qui vise la description d'un étage — y compris ses variantes (étage verrouillé…).
const floorNoteRules = storyCss.filter((rule) => rule.selectors.some((selector) => /\.rpg-story-floor__copy small$/.test(selector)));
assert.ok(floorNoteRules.length > 0, 'la description d’un étage est stylée');
for (const rule of floorNoteRules) {
  assert.doesNotMatch(rule.body, /text-overflow|white-space\s*:\s*nowrap/,
    'la description d’un étage passe à la ligne au lieu d’être coupée par une ellipse');
}
for (const rule of storyCss.filter((item) => item.selectors.some((selector) => /\.rpg-story-floor:disabled(?: .*)?$/.test(selector)))) {
  assert.doesNotMatch(rule.body, /(?:^|[;\s])opacity\s*:/,
    'un étage verrouillé s’estompe par la couleur, pas par `opacity` (texte sous 4,5:1)');
}

const overlayLayers = declared(battleCss, '.rpg-overlay', 'z-index').map(Number);
assert.ok(overlayLayers.length > 0 && overlayLayers.every((layer) => layer > 40),
  'l’overlay de fin d’étage a un z-index au-dessus de la main (40) : sinon la table recouvre ses boutons');
// Boutons de fin d'étage : la rangée `.rpg-overlay__actions` (flex) étire les boutons à la hauteur du plus
// grand, et `.rpg-btn` est une COLONNE flex. Sans `justify-content: center`, le texte restait collé en haut
// (« Rejouer l'étage » 9 px au-dessus du centre) ; la flèche de « Étage suivant : … → » passait sous le nom,
// ce qui doublait la hauteur du bouton principal et décalait les deux autres.
assert.ok(declared(battleCss, '.rpg-btn', 'justify-content').includes('center'),
  'un bouton `.rpg-btn` (colonne flex) centre son texte verticalement dès qu’il est plus haut que son contenu');
for (const [prop, valeur] of [['flex-direction', 'row'], ['align-items', 'center'], ['justify-content', 'center']]) {
  assert.ok(declared(storyCss, '.rpg-overlay__actions .rpg-btn', prop).includes(valeur),
    `les boutons de fin d’étage déclarent ${prop}: ${valeur} (libellé et flèche sur une ligne, texte centré dans le bouton)`);
}
assert.ok(declared(storyCss, '.rpg-overlay__actions .rpg-btn', 'min-height').length > 0,
  'les boutons de fin d’étage ont une hauteur minimale commune (cible tactile confortable)');
assert.ok(declared(battleCss, '.rpg-mode-menu__content', 'grid-template-columns').some((value) => /minmax\(\s*0\s*,\s*1fr\s*\)/.test(value)),
  'la colonne du menu est bornée (minmax(0, 1fr)) : les onglets ne l’élargissent plus au-delà de l’écran du téléphone');

assert.match(pageSource, /rpg-duel-nav__story-mode/, 'le libellé du duel isole « MODE » pour le réduire sur téléphone');
assert.match(pageSource, /rpg-duel-nav__story-floor/, 'le libellé du duel isole le nom de l’étage pour le réduire sur téléphone');
assert.ok(declared(storyCss, '.rpg-duel-nav__story', 'white-space').includes('nowrap'),
  'le libellé du duel reste sur une ligne');
assert.deepEqual(declared(storyCss, '.rpg-battle--touch .rpg-duel-nav__story-floor', 'display'), ['none'],
  'sur téléphone, seul « HISTOIRE » reste dans la barre du duel');

// L'écran de jeu reste sombre dans les deux thèmes : chaque jeton du site que le CSS du
// jeu lit, et dont le thème clair change la valeur (styles.css → theme.css), doit être
// réancré sur `.rpg-battle`.
const darkValues = customValues(cssRules('../src/styles.css'), ':root');
const lightValues = customValues(cssRules('../src/theme.css'), ":root[data-theme='light']");
const lightTokens = Object.keys(lightValues).filter((token) => lightValues[token] !== darkValues[token]);
const rpgSheets = ['rpg-battle.css', 'rpg-mobile.css', 'rpg-story.css', 'rpg-deckbox.css'].map((file) => stripComments(readSource(`../src/games/${file}`)));
const usedTokens = [...new Set(rpgSheets.flatMap((css) => [...css.matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1])))]
  .filter((token) => lightTokens.includes(token));
const pinnedTokens = customProps(battleCss, LIGHT_SCENE);
assert.ok(usedTokens.length > 0, 'le CSS du jeu lit des jetons du site (sinon ce garde-fou ne vérifie plus rien)');
assert.deepEqual(usedTokens.filter((token) => !pinnedTokens.includes(token)), [],
  `chaque jeton du site lu par le jeu est réancré sur « ${LIGHT_SCENE} » (thème clair : encre sombre sur écran sombre)`);
assert.ok(declared(battleCss, LIGHT_SCENE, 'color-scheme').includes('dark'),
  'les contrôles natifs (listes déroulantes du catalogue) restent sombres sur l’écran de jeu');

// Le balayage d'encre (scripts/theme-ink-sweep.mjs) génère des règles « thème clair → encre
// sombre » : il ne doit jamais viser l'écran de jeu, dont les encres claires sont voulues.
assert.doesNotMatch(readSource('../src/theme.css'), /\[data-theme='light'\][^{,]*rpg-/,
  'theme.css ne bascule aucun élément du jeu RPG en encre sombre');
assert.match(readSource('./theme-ink-sweep.mjs'), /'\\\\\.rpg-'/,
  'le balayage d’encre exclut le jeu RPG (motif `.rpg-`)');

console.log('✓ Mode Histoire : tours, verrous, lancement, identité du sorcier, retour menu et progression');
console.log('✓ Mode Histoire : textes lisibles en thème clair et sombre (descriptions entières, étages verrouillés, fin d’étage, libellé du duel, jetons du thème)');
