/**
 * La roue de feu d'une créature brûlée par la Braise.
 * node scripts/rpg-roue-feu-check.mjs
 *
 * Une magie, une sorcellerie ou l'effet d'une créature de Braise blesse une
 * créature : autour d'elle s'allume une roue de flammes qui tourne, des
 * langues s'en détachent et des braises montent. Comme le tourbillon d'eau, le
 * calque se pose sur l'emplacement mesuré avant l'action, ne capte rien et ne
 * touche pas la mise en page — mais il joue **avant** la conséquence : une
 * créature qui meurt de ce coup garde sa carte dans le feu, et son adieu de
 * carte détruite n'arrive qu'une fois la roue refermée.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const engine = readFileSync(new URL('../src/games/rpgDuel.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');

// ── 1. Le calque, rendu pour de vrai ───────────────────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-roue-feu-smoke.jsx', outDir: 'node_modules/.cache/rpg-roue-feu', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendreRoue } = await import('../node_modules/.cache/rpg-roue-feu/rpg-roue-feu-smoke.js');
const { window } = new JSDOM(`<!doctype html><html><body>${rendreRoue()}</body></html>`);
const racine = window.document.querySelector('.rpg-roue-feu');
try {
  assert.ok(racine, 'la roue de feu est rendue');
  assert.equal(racine.getAttribute('data-rpg-burn-fx'), 'braise', 'elle se nomme pour les contrôles et la feuille');
  assert.equal(racine.getAttribute('data-rpg-burn-id'), 'entite-brulee', 'elle garde l’identité de la créature brûlée');
  assert.equal(racine.getAttribute('aria-hidden'), 'true', 'elle est décorative : rien à lire, rien à sélectionner');

  const style = racine.getAttribute('style') ?? '';
  assert.match(style, /left:214px/, 'elle se pose exactement sur l’emplacement de la carte');
  assert.match(style, /top:96px/);
  assert.match(style, /width:132px/, 'elle reprend sa largeur');
  assert.match(style, /height:176px/, 'et sa hauteur');
  assert.match(style, /--rpg-fx-rotation:0\.26rad/, 'elle en garde l’inclinaison de combat');

  const carte = racine.querySelector('.rpg-roue-feu__carte');
  assert.ok(carte, 'la carte brûlée reste visible dans le feu');
  assert.match(carte.querySelector('img')?.getAttribute('src') ?? '', /fennec-des-decombres/,
    'c’est bien l’illustration de la créature mordue');
  assert.ok([...carte.classList].some((classe) => classe.startsWith('rpg-card--frame-')),
    'elle garde le cadre de sa couleur, comme sur la table');
  assert.ok(racine.querySelector('.rpg-roue-feu__lueur'), 'une lueur s’allume au sol');
  assert.equal(racine.querySelectorAll('.rpg-roue-feu__cercle').length, 2,
    'deux cercles de flammes tournent, en sens contraires');
  assert.equal(racine.querySelectorAll('.rpg-roue-feu__rayon').length, 0,
    'aucune langue de feu : la roue reste un anneau');
  assert.doesNotMatch(css, /\.rpg-roue-feu__rayon|@keyframes rpg-roue-feu-langue/,
    'la feuille n’en garde ni la règle ni l’image clé');
  const braises = [...racine.querySelectorAll('.rpg-roue-feu__braise')];
  assert.ok(braises.length >= 3, 'quelques braises montent');
  assert.ok(braises.every((braise) => /--dx:-?\d+px/.test(braise.getAttribute('style') ?? '')
    && /--dy:-?\d+px/.test(braise.getAttribute('style') ?? '')
    && /--d:\d+ms/.test(braise.getAttribute('style') ?? '')),
  'chaque braise part dans sa direction, avec son propre retard');
  assert.equal(racine.children.length, 4 + braises.length,
    'le calque ne contient que ses pièces de feu et la carte qu’il consume');
} finally {
  window.close();
}

// Une créature qui survit à la brûlure est toujours sur la table : sa carte
// n'est pas redessinée dans le calque.
const { window: fenetreSurvivante } = new JSDOM(
  `<!doctype html><html><body>${rendreRoue({ avecCarte: false })}</body></html>`,
);
try {
  const survie = fenetreSurvivante.document.querySelector('.rpg-roue-feu');
  assert.equal(survie?.querySelector('.rpg-roue-feu__carte') ?? null, null,
    'une créature qui survit garde sa carte sur la table : le feu ne la double pas');
} finally {
  fenetreSurvivante.close();
}

// ── 2. La feuille : du feu, du mouvement composé ───────────────────────────
assert.match(css, /\.rpg-roue-feu\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*56;[^}]*transform:\s*rotate\(var\(--rpg-fx-rotation, 0rad\)\);[^}]*pointer-events:\s*none;/s,
  'le calque flotte au-dessus de la table, suit l’inclinaison de la carte et ne capte aucun geste');
assert.match(css, /\.rpg-roue-feu\s*\{[^}]*animation:\s*rpg-roue-feu-vie \.9s ease-out both;/s,
  'il vit neuf dixièmes de seconde, puis rend la table');

const cercle = /\.rpg-roue-feu__cercle\s*\{([^}]*)\}/s.exec(css)?.[1] ?? '';
assert.match(cercle, /conic-gradient\(from 0deg/, 'la roue est un dégradé conique');
assert.match(cercle, /mask:\s*radial-gradient/, 'masquée en anneau : une roue, pas un disque');
assert.match(cercle, /rpg-roue-feu-tourne \.9s/, 'elle tourne sur elle-même');
assert.match(cercle, /rpg-roue-feu-ronde \.9s/, 'et s’ouvre en tournant');
assert.match(css, /\.rpg-roue-feu__cercle--interne\s*\{[^}]*rpg-roue-feu-tourne-inverse \.9s/, 
  'le cercle intérieur tourne en sens inverse');
assert.match(css, /@keyframes rpg-roue-feu-tourne\s*\{\s*from \{ rotate: 0deg; \}\s*to \{ rotate: 400deg; \}/,
  'plus d’un tour : la roue tourne vraiment');
assert.match(css, /@keyframes rpg-roue-feu-tourne-inverse\s*\{\s*from \{ rotate: 40deg; \}\s*to \{ rotate: -320deg; \}/);
assert.match(css, /\.rpg-roue-feu__braise\s*\{[^}]*animation:\s*rpg-roue-feu-braise \.9s[^}]*animation-delay:\s*var\(--d, 0ms\);/s,
  'les braises montent avec leur retard');
assert.match(css, /\.rpg-roue-feu__carte\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*animation:\s*rpg-roue-feu-carte \.9s ease-in both;/s,
  'la carte s’embrase et se consume dans la roue');
assert.match(css, /@keyframes rpg-roue-feu-carte\s*\{\s*0% \{ opacity: 1;[^}]*\}\s*38%[\s\S]*?100% \{ opacity: 0;/,
  'elle part nette, flambe, puis s’efface');

// Aucune mise en page : les images clés ne touchent ni top/left, ni taille.
const debutImages = css.indexOf('@keyframes rpg-roue-feu-vie');
const finImages = css.indexOf('Les flèches d');
assert.ok(debutImages > 0 && finImages > debutImages, 'les images clés de la roue forment un bloc');
const imagesCles = css.slice(debutImages, finImages);
assert.doesNotMatch(imagesCles, /(top|left|right|bottom|width|height|margin):/,
  'la roue n’anime aucune propriété de mise en page : ni position, ni taille');
assert.doesNotMatch(imagesCles, /transform:/,
  'et elle reste sur les propriétés composées, jamais `transform`');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.rpg-roue-feu,\s*\.rpg-roue-feu \* \{ animation:\s*none !important; transition:\s*none !important; \}/,
  'en mouvement réduit, la roue reste immobile');

// ── 3. Le moteur : qui a été brûlé, et par quoi ────────────────────────────
assert.match(engine, /export function rpgDerniereBlessure\(duel, entityId\)/, 'le moteur publie la dernière blessure');
assert.match(engine, /elements: normaliserCouleurs\(blessure\.elements\)/, 'la blessure garde la couleur de sa source');
assert.match(engine, /pvApres: entite\.pv,\s*\n\s*bouclierApres: entite\.bouclier \?\? 0,/,
  'elle garde l’état d’après, pour ne pas confondre deux coups');
assert.match(engine, /mortelle: Boolean\(blessure\.mortelle\)/, 'elle dit si la créature a quitté la table sous ce coup');
const corpsBlessure = engine.slice(engine.indexOf('export function rpgBlesserCreature('), engine.indexOf('export function arriveeCiblePortee('));
assert.match(corpsBlessure, /if \(apresEsquive > 0\) \{\s*\n\s*journaliserBlessure\(/, 
  'seule une blessure qui atteint la créature (ou son bouclier) est journalisée');
assert.match(corpsBlessure, /mortelle = !duel\[cote\]\.creatures\.some\(\(candidate\) => candidate\.id === entite\.id\);/,
  'la Tenacité qui sauve laisse la blessure non mortelle');

// ── 4. La table : la roue s’allume et la conséquence attend ────────────────
assert.match(page, /const DUREE_ROUE_FEU = 900;/, 'la roue dure 900 ms');
assert.match(page, /const blessuresNouvelles = rpgBlessuresDepuis\(duel, positionBlessures\);/,
  'la table ne lit que les blessures parues depuis la dernière action animée');
assert.match(page, /journalBlessuresRef\.current = \{ duel, position: rpgNombreBlessures\(duel\) \};/,
  'elle avance la position du journal, action après action');
assert.match(page, /if \(blessure\.elements\.includes\('braise'\)\) braiseParEntite\.set\(blessure\.entityId, blessure\);/,
  'seule la Braise allume la roue');
assert.match(page, /apres\.pv === blessure\.pvApres\s*\n?\s*&& \(apres\.bouclier \?\? 0\) === blessure\.bouclierApres/s,
  'un coup qui n’a pas laissé cet état ne rallume rien');
assert.match(page, /: blessure\.mortelle;/, 'une créature qui a quitté la table sous ce coup compte comme brûlée');
assert.match(page, /avecCarte: !vivants\.has\(entite\.entityId\),/,
  'la carte reste dans le feu quand elle quitte la table');
assert.match(page, /setRouesFeu\(\(current\) => \[\.\.\.nettoyerFantomes\(current\), \.\.\.effetsFeu\]\);/,
  'la roue rejoint la file des effets, en nettoyant les périmés');
assert.match(page, /expireA: Date\.now\(\) \+ DUREE_ROUE_FEU \+ 400,/, 'elle porte sa date de péremption');
assert.match(page, /const retenues = effets\.filter\(\(effet\) => brulees\.has\(effet\.entityId\)\);/, 
  'une carte détruite par la Braise est retenue');
assert.match(page, /programmerNettoyageVisuel\(\(\) => \{\s*\n\s*setCartesEnDestruction\(\(current\) => \[\.\.\.nettoyerFantomes\(current\), \.\.\.retenues\]\);\s*\n\s*\}, DUREE_ROUE_FEU\);/,
  'elle ne reçoit son adieu qu’une fois la roue refermée');
assert.match(page, /if \(!rouesFeu\.length\) return undefined;[\s\S]*?setRouesFeu\(\(current\) => nettoyerFantomes\(current\)\)/,
  'un chien de garde éteint les roues périmées si la minuterie se perd');
assert.match(page, /setRouesFeu\(\[\]\);/, 'quitter le duel éteint les roues en cours');
assert.match(page, /\{rouesFeu\.map\(\(effet\) => \(\s*<RoueDeFeu\s+key=\{effet\.effectId\}/s, 'elles sont rendues sur la table');
assert.match(page, /onTermine=\{\(effectId\) => setRouesFeu\(\(current\) => current\.filter\(\(autre\) => autre\.effectId !== effectId\)\)\}/,
  'chacune s’éteint à sa dernière image');

// ── 5. Les sons : un seul feu par geste, pas de page tournée sur l'attaque ──
assert.match(page, /if \(nom === 'flame_gust'\) \{\s*\n\s*const maintenant = Date\.now\(\);\s*\n\s*if \(maintenant - dernierSonFeuRef\.current < 700\) return;/,
  'un seul bruit de feu par geste : le sort qui tue sa cible ne le joue pas deux fois');
assert.doesNotMatch(page, /jouerSfx\('page_turn'\)/,
  'la fenêtre de blocage ne joue plus le bruit de page tournée quand une créature attaque');
assert.match(page, /phaseDuelActive === 'attaque'[\s\S]{0,80}jouerSfx\('phase'\)/,
  'la déclaration d’attaque garde son repère sonore');

console.log('✓ Braise : la roue de feu s’allume autour de la créature mordue par une magie, une sorcellerie ou l’effet d’une créature de Braise — deux cercles qui tournent en sens contraires, cinq braises et une lueur au sol — posée sur son emplacement et son inclinaison, sans capter de geste, sans toucher la mise en page : la carte brûlée reste dans le feu et son adieu de carte détruite n’arrive qu’une fois la roue refermée (900 ms), silencieuse en mouvement réduit');
