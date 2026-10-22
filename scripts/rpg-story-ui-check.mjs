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
assert.match(pageSource, /enregistrerVictoire\(histoireEtageId, campagne \? contexte\.curseur : null\)/,
  'la victoire et le contexte narratif passent au propriétaire unique de progression');
const storyHook = readFileSync(new URL('../src/games/useRpgStory.js', import.meta.url), 'utf8');
assert.match(storyHook, /marquerEtageVaincu\(etat, etageId\)/,
  'le hook conserve la progression des tours');
assert.match(storyHook, /sauverProgressionHistoire\(apres\)/,
  'victoire et scène en attente sont sauvegardées dans le même état');
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

// ── Le duo dépasse l'écran ──────────────────────────────────────────────────
// Les personnages de scène ne s'arrêtent plus au bord : leur bas descend SOUS
// le bord de l'écran — les jambes sont coupées par le bord, jamais par une
// boîte. Le sprite, plus haut que la fenêtre, garde pourtant sa tête sous le
// cartouche : c'est le débord qui fait la taille, pas la place au-dessus.
const debords = declared(storyCss, '.rpg-narrative__scene', '--rpg-story-debord');
assert.ok(debords.length >= 3,
  `le débord des personnages est déclaré pour l’écran large, le portrait étroit et le paysage mobile (déclaré : ${debords.length})`);
for (const debord of debords) {
  assert.match(debord, /^clamp\(\s*\d+px\s*,/, `le débord est borné en pixels : ${debord}`);
}
assert.ok(declared(storyCss, '.rpg-narrative__scene', '--rpg-story-tete').length > 0,
  'l’air gardé au-dessus des têtes est déclaré avec le débord (le sprite grandit, la tête ne monte pas)');
const basDesStands = declared(storyCss, '.rpg-narrative__stand', 'bottom');
assert.ok(basDesStands.filter((val) => val.includes('calc(-1 * var(--rpg-story-debord))')).length >= 2
  && basDesStands.includes('auto'),
  'les personnages sont descendus du débord sous le bord de l’écran, sauf en portrait étroit où ils restent dans la fenêtre');
const hauteursSprite = declared(storyCss, '.rpg-narrative__stand-img', 'max-height');
assert.ok(hauteursSprite.filter((val) => val.includes('var(--rpg-story-debord)')).length >= 4,
  'le sprite grandit du débord sur les trois mises en scène (écran large, paysage mobile, portrait étroit)');
assert.ok(hauteursSprite.some((val) => val.includes('100vh + var(--rpg-story-debord) - var(--rpg-story-tete)')),
  'sur écran large, la figure visible reste `100vh - tete` : le sprite est plus grand, la tête ne monte pas');
assert.ok(hauteursSprite.every((val) => !/^78vh$/.test(val.trim())),
  'plus aucun écran ne borne le sprite à 78vh (l’ancien plafond, sous le bord)');
assert.ok(declared(storyCss, '.rpg-narrative__stand-img', 'object-position').includes('bottom'),
  'le débord sort par le bas du sprite (les jambes), jamais par la tête');
assert.ok(declared(storyCss, '.rpg-narrative__stand-cadre', 'margin-bottom')
  .filter((val) => val.includes('var(--rpg-story-debord)')).length >= 2,
  'le portrait encadré (repli sans sprite) remonte du débord : c’est le personnage qui dépasse, pas le cadre');
assert.ok(declared(storyCss, '.rpg-narrative__fenetre', 'margin')
  .some((val) => val.includes('calc(-1 * var(--rpg-story-debord))')),
  'en portrait étroit, la bulle recouvre le bas des personnages du même débord (ils passent derrière son bord)');

// Sur mobile / écran étroit en portrait, les personnages de scène se posent dans
// `.rpg-narrative__fenetre` / `.rpg-narrative__plateau` juste au-dessus de `.rpg-narrative__boite`
// (au lieu de rester fixés en bas de l'écran cachés derrière le texte).
assert.ok(declared(storyCss, '.rpg-narrative__plateau', 'display').includes('flex')
  && declared(storyCss, '.rpg-narrative__plateau', 'align-items').includes('flex-end'),
  'sur écran étroit, le plateau aligne les personnages côte à côte au-dessus de la boîte de dialogue');
assert.ok(declared(storyCss, '.rpg-narrative__stand', 'position').includes('relative')
  && declared(storyCss, '.rpg-narrative__stand', 'bottom').includes('auto'),
  'sur mobile en portrait, les personnages ne restent pas fixés en bas de l’écran derrière le texte');
assert.ok(declared(storyCss, '.rpg-narrative__boite', 'margin').includes('0 auto'),
  'sur mobile en portrait, la boîte de dialogue se colle sous la fenêtre des personnages');
assert.ok(hauteursSprite.some((val) => val.includes('100vh + var(--rpg-story-debord) - 54px')),
  'en paysage mobile, les personnages remontent jusqu’en haut de la scène avec leur débord sous le bord');
// Les sprites larges (bâton diagonal, bras ouverts, hallebarde) ne doivent jamais
// être poussés hors de l'écran par un `left`/`right` négatif ni dépasser sans
// borne avec `max-width: none` : leur marge automatique les centre quand ils sont
// étroits et les cale à ras du bord extérieur quand ils sont larges.
for (const selecteur of ['.rpg-narrative__stand', '.rpg-narrative__stand:first-child', '.rpg-narrative__stand:last-child']) {
  for (const prop of ['left', 'right']) {
    for (const val of declared(storyCss, selecteur, prop)) {
      assert.doesNotMatch(val, /^-\d|^-\.\d/,
        `${selecteur} { ${prop}: ${val} } pousserait un personnage hors de l’écran`);
    }
  }
}
const largeursMaxSprite = declared(storyCss, '.rpg-narrative__stand-img', 'max-width');
assert.ok(largeursMaxSprite.length >= 4 && !largeursMaxSprite.includes('none'),
  'les sprites déclarent toujours une largeur maximale bornée à la scène ou à l’écran');
assert.ok(declared(storyCss, '.rpg-narrative__stand-img', 'margin-inline').includes('auto'),
  'margin-inline: auto centre les silhouettes étroites sans couper les poses larges');

// ── Le décor reste visible ──────────────────────────────────────────────────
// Le lecteur a longtemps posé une nappe sombre sur toute la peinture
// (`linear-gradient(90deg, rgba(9,16,24,.7), …, #0c141c)`), si bien qu'on ne
// voyait plus le décor. Interdit : les deux couches qui portent la peinture ne
// déclarent que l'image. Le seul assombrissement toléré est la bande de sol du
// bas de l'écran, posée par `.rpg-narrative__decor::after`, qui ne commence
// pas avant la moitié basse et n'est jamais opaque.
for (const couche of ['.rpg-narrative', '.rpg-narrative__decor']) {
  for (const image of declared(storyCss, couche, 'background-image')) {
    assert.doesNotMatch(image, /gradient\(/,
      `${couche} ne pose aucun voile dégradé sur le décor (la peinture est livrée nue)`);
  }
  assert.ok(declared(storyCss, couche, 'background-image').some((image) => image.includes('var(--rpg-story-decor')),
    `${couche} affiche bien la peinture du décor`);
}
const bandeDeSol = declared(storyCss, '.rpg-narrative__decor::after', 'background').join(' ').replace(/\s+/g, ' ');
const debutBande = bandeDeSol.match(/linear-gradient\(\s*180deg\s*,\s*transparent\s+(\d+)%/);
assert.ok(debutBande, 'la bande de sol est un dégradé vertical qui part du transparent');
assert.ok(Number(debutBande[1]) >= 55,
  `la bande de sol ne commence pas avant 55 % de la hauteur (déclaré : ${debutBande[1]} %)`);
const alphaBande = [...bandeDeSol.matchAll(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(\.\d+|\d)\s*\)/g)]
  .map((match) => Number(match[1]));
assert.ok(alphaBande.length > 0 && alphaBande.every((alpha) => alpha <= 0.6),
  'la bande de sol reste un fondu léger (jamais un bandeau noir)');
// La lisibilité ne vient donc plus du voile mais des panneaux qui portent du
// texte : sans fond propre, un libellé clair passerait sur une peinture claire.
assert.ok(declared(storyCss, '.rpg-narrative__cartouche::before', 'background').some((value) => /radial-gradient/.test(value)),
  'le cartouche de scène garde un halo sombre local derrière son texte');
assert.ok(declared(storyCss, '.rpg-narrative__page::before', 'background').some((value) => /radial-gradient/.test(value)),
  'la page du briefing et de l’épilogue garde son propre fond derrière le texte');
for (const choix of declared(storyCss, '.rpg-narrative__choices button', 'background')) {
  const alpha = Number(choix.match(/rgba\([^)]*,\s*(\.\d+|\d)\s*\)/)?.[1] ?? 0);
  assert.ok(alpha >= 0.6, `les décisions portent un fond assez dense pour rester lisibles sur le décor (déclaré : ${choix})`);
}

// ── Les poses alternatives ──────────────────────────────────────────────────
// La posture change avec la situation : le lecteur doit exposer la situation
// choisie, et la transition doit rester une courte recomposition (neutralisée
// pour qui refuse le mouvement).
const sceneSource = readSource('../src/games/RpgStoryScene.jsx');
assert.match(sceneSource, /situationPose/, 'le lecteur calcule la situation de la pose (duel, choix, après-duel)');
assert.match(sceneSource, /data-pose=/, 'la pose portée par un sprite est exposée dans le DOM (contrôlable au navigateur)');
assert.ok(declared(storyCss, '.rpg-narrative__stand-img[data-pose]', 'animation').some((value) => /rpg-story-repose/.test(value)),
  'un changement de pose rejoue une courte transition au lieu de sauter');
assert.ok(declared(storyCss, '.rpg-narrative__stand-img[data-pose]', 'animation').length > 1,
  'la transition de pose est aussi neutralisée dans le bloc prefers-reduced-motion');

console.log('✓ Mode Histoire : tours, verrous, lancement, identité du sorcier, retour menu et progression');
console.log('✓ Mode Histoire : le décor des tours reste visible, le texte garde ses propres fonds');
console.log('✓ Mode Histoire : les poses alternatives suivent la situation et se recomposent sans heurt');
console.log('✓ Mode Histoire : textes lisibles en thème clair et sombre (descriptions entières, étages verrouillés, fin d’étage, libellé du duel, jetons du thème)');
