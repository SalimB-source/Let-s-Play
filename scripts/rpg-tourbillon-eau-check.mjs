/**
 * Le tourbillon d'eau d'un renvoi en main.
 * node scripts/rpg-tourbillon-eau-check.mjs
 *
 * Une magie ou un effet renvoie une créature dans la main de son propriétaire :
 * sa carte quitte la table, mais son emplacement se referme sur une spirale
 * d'eau — nappe au sol, anneau qui tourne en montant, deux ondes, quelques
 * gouttes. Le calque reprend la place et l'inclinaison de la carte disparue,
 * ne capte aucun geste, et s'efface en une seconde. Il ne joue ni pour une
 * destruction (l'adieu de la carte détruite garde son rôle), ni pour un
 * terrain, ni sous mouvement réduit.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');

// ── 1. Le calque, rendu pour de vrai ───────────────────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-tourbillon-eau-smoke.jsx', outDir: 'node_modules/.cache/rpg-tourbillon', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendreTourbillon } = await import('../node_modules/.cache/rpg-tourbillon/rpg-tourbillon-eau-smoke.js');
const { window } = new JSDOM(`<!doctype html><html><body>${rendreTourbillon()}</body></html>`);
const racine = window.document.querySelector('.rpg-tourbillon-eau');
try {
  assert.ok(racine, 'le calque du tourbillon est rendu');
  assert.equal(racine.getAttribute('data-rpg-bounce-fx'), 'eau', 'il se nomme pour les contrôles et la feuille');
  assert.equal(racine.getAttribute('data-rpg-bounce-id'), 'entite-renvoyee',
    'il garde l’identité de la créature renvoyée');
  assert.equal(racine.getAttribute('aria-hidden'), 'true', 'il est décoratif : rien à lire, rien à sélectionner');

  const style = racine.getAttribute('style') ?? '';
  assert.match(style, /left:214px/, 'il se pose exactement sur l’emplacement de la carte');
  assert.match(style, /top:96px/);
  assert.match(style, /width:132px/, 'il reprend sa largeur');
  assert.match(style, /height:176px/, 'et sa hauteur');
  assert.match(style, /--rpg-fx-rotation:0\.26rad/, 'il en garde l’inclinaison de combat');

  assert.ok(racine.querySelector('.rpg-tourbillon-eau__nappe'), 'une nappe d’eau se referme au sol');
  assert.ok(racine.querySelector('.rpg-tourbillon-eau__spirale'), 'une spirale tourne autour de la place');
  assert.equal(racine.querySelectorAll('.rpg-tourbillon-eau__anneau').length, 2,
    'deux ondes s’élargissent');
  const gouttes = [...racine.querySelectorAll('.rpg-tourbillon-eau__goutte')];
  assert.ok(gouttes.length >= 3, 'quelques gouttes s’arrachent au courant');
  assert.ok(gouttes.every((goutte) => /--dx:-?\d+px/.test(goutte.getAttribute('style') ?? '')
    && /--dy:-?\d+px/.test(goutte.getAttribute('style') ?? '')
    && /--d:\d+ms/.test(goutte.getAttribute('style') ?? '')),
  'chaque goutte part dans sa direction, avec son propre retard');
  assert.equal(racine.children.length, 4 + gouttes.length,
    'le calque ne contient que ses pièces d’eau');
} finally {
  window.close();
}

// ── 2. La feuille : de l'eau, du mouvement composé ─────────────────────────
assert.match(css, /\.rpg-tourbillon-eau\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*56;[^}]*transform:\s*rotate\(var\(--rpg-fx-rotation, 0rad\)\);[^}]*pointer-events:\s*none;/s,
  'le calque flotte au-dessus de la table, suit l’inclinaison de la carte et ne capte aucun geste');
assert.match(css, /\.rpg-tourbillon-eau\s*\{[^}]*animation:\s*rpg-tourbillon-eau-vie \.95s ease-out both;/s,
  'il vit une seconde, puis rend la table');

const spirale = /\.rpg-tourbillon-eau__spirale\s*\{([^}]*)\}/s.exec(css)?.[1] ?? '';
assert.match(spirale, /conic-gradient\(from 0deg/, 'la spirale est un dégradé conique');
assert.match(spirale, /mask:\s*radial-gradient/, 'masqué en anneau : un courant, pas un disque');
assert.match(spirale, /rpg-tourbillon-eau-tourne \.95s linear both/, 'elle tourne sur elle-même');
assert.match(spirale, /rpg-tourbillon-eau-monte \.95s ease-out both/, 'et s’élève en se dissolvant');

assert.match(css, /@keyframes rpg-tourbillon-eau-tourne\s*\{\s*from \{ rotate: 0deg; \}\s*to \{ rotate: 540deg; \}/,
  'un tour et demi : le tourbillon s’enroule vraiment');
for (const nom of ['nappe', 'monte', 'onde', 'goutte']) {
  assert.match(css, new RegExp(`@keyframes rpg-tourbillon-eau-${nom} `), `l’animation « ${nom} » existe`);
}
// Aucune mise en page : les images clés ne touchent ni top/left, ni taille.
const debutImages = css.indexOf('@keyframes rpg-tourbillon-eau-vie');
const finImages = css.indexOf('Les flèches d');
assert.ok(debutImages > 0 && finImages > debutImages, 'les images clés du tourbillon forment un bloc');
const imagesCles = css.slice(debutImages, finImages);
assert.doesNotMatch(imagesCles, /(top|left|right|bottom|width|height|transform|filter|margin):/,
  'le tourbillon n’anime que translate, rotate, scale et opacity');
assert.match(css, /\.rpg-tourbillon-eau__anneau--deux\s*\{[^}]*animation-delay:\s*\.16s;/, 'les deux ondes sont décalées');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.rpg-tourbillon-eau,\s*\.rpg-tourbillon-eau \* \{ animation:\s*none !important; transition:\s*none !important; \}/,
  'en mouvement réduit, le tourbillon reste immobile');

// ── 3. La page : quand le tourbillon se lève ───────────────────────────────
const animer = page.slice(page.indexOf('const animerModificationsChamp = ('), page.indexOf('const conserverAnnulation ='));
assert.match(animer, /const renvoyeesSurTable = mouvementReduit\s*\n?\s*\? \[\]\s*\n?\s*: avant\.filter\(\(entite\) => renvoyees\.has\(entite\.entityId\) && !entite\.isTerrain\);/s,
  'seules les créatures renvoyées — pas les terrains — lèvent un tourbillon, et jamais en mouvement réduit');
assert.match(animer, /setTourbillonsEau\(\(current\) => \[\.\.\.nettoyerFantomes\(current\), \.\.\.effets\]\);/,
  'le calque rejoint la file des effets, en nettoyant les périmés');
assert.match(animer, /expireA: Date\.now\(\) \+ duree \+ 400,/, 'il porte sa date de péremption');
assert.match(animer, /const duree = 950;/, 'il dure 950 ms');
assert.match(animer, /const cartesDisparues = avant\.filter\(\(entite\) => !vivants\.has\(entite\.entityId\)\s*\n?\s*&& !renvoyees\.has\(entite\.entityId\)\);/s,
  'une créature renvoyée n’est pas un fantôme de destruction : elle a son propre adieu');

assert.match(page, /const \[tourbillonsEau, setTourbillonsEau\] = useState\(\[\]\);/,
  'la table garde la liste des tourbillons en cours');
assert.match(page, /\{tourbillonsEau\.map\(\(effet\) => \(\s*<TourbillonEau\s+key=\{effet\.effectId\}/s,
  'ils sont rendus sur la table');
assert.match(page, /onTermine=\{\(effectId\) => setTourbillonsEau\(\(current\) => current\.filter\(\(autre\) => autre\.effectId !== effectId\)\)\}/,
  'chacun se retire à sa dernière image');
assert.match(page, /if \(!tourbillonsEau\.length\) return undefined;[\s\S]*?setTourbillonsEau\(\(current\) => nettoyerFantomes\(current\)\)/,
  'un chien de garde retire les tourbillons périmés si la minuterie se perd');
assert.match(page, /setTourbillonsEau\(\[\]\);/, 'quitter le duel efface les tourbillons en cours');

// Le renvoi en main arrive par les effets du jeu, pas par une détection : les
// chemins qui le connaissent — magie du joueur, riposte du sorcier, résolution
// d'annonce — passent l'entité à `animerModificationsChamp`.
const appels = [...page.matchAll(/animerModificationsChamp\([\s\S]{0,240}?\.renvoiEntityId\]\)/g)];
assert.ok(appels.length >= 3, `les renvois en main connus passent leur entité (reçu : ${appels.length})`);

console.log('✓ Renvoi en main : la créature quitte la table dans un tourbillon d’eau — nappe au sol, spirale qui s’enroule en montant, deux ondes et cinq gouttes — posé sur son emplacement et son inclinaison, sans capter de geste, sans toucher la mise en page, silencieux en mouvement réduit et effacé en une seconde');
