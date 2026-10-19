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
const engine = readFileSync(new URL('../src/games/rpgDuel.js', import.meta.url), 'utf8');
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

  const carteEmportee = racine.querySelector('.rpg-tourbillon-eau__carte');
  assert.ok(carteEmportee, 'la carte emportée reste visible dans le tourbillon');
  assert.match(carteEmportee.querySelector('img')?.getAttribute('src') ?? '', /ressac/,
    'c’est bien l’illustration de la créature renvoyée');
  assert.ok([...carteEmportee.classList].some((classe) => classe.startsWith('rpg-card--frame-')),
    'elle garde le cadre de sa couleur, comme sur la table');
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
  assert.equal(racine.children.length, 5 + gouttes.length,
    'le calque ne contient que ses pièces d’eau et la carte qu’il emporte');
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
// Les images clés du tourbillon s'arrêtent au bloc suivant : la roue de feu.
const finImages = css.indexOf('La roue de feu');
assert.ok(debutImages > 0 && finImages > debutImages, 'les images clés du tourbillon forment un bloc');
const imagesCles = css.slice(debutImages, finImages);
assert.doesNotMatch(imagesCles, /(top|left|right|bottom|width|height|margin):/,
  'le tourbillon n’anime aucune propriété de mise en page : ni position, ni taille');
assert.doesNotMatch(imagesCles, /transform:/,
  'et il reste sur les propriétés composées, jamais `transform`');
assert.match(css, /\.rpg-tourbillon-eau__anneau--deux\s*\{[^}]*animation-delay:\s*\.16s;/, 'les deux ondes sont décalées');
assert.match(css, /\.rpg-tourbillon-eau__carte\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*animation:\s*rpg-tourbillon-eau-carte \.95s ease-in both;/s,
  'la carte se soulève et se dissout dans la spirale');
assert.match(css, /@keyframes rpg-tourbillon-eau-carte\s*\{\s*0% \{ opacity: 1;[^}]*\}\s*30%[\s\S]*?100% \{ opacity: 0;/,
  'elle part nette et finit noyée');

// ── 2 bis. L'ordre : l'eau d'abord, la main ensuite ────────────────────────
// La carte renvoyée ne doit pas reparaître dans la main pendant le tourbillon.
assert.match(page, /const cartesEnRenvoi = new Set\(\(tourbillonsEau \?\? \[\]\)\s*\n?\s*\.filter\(\(effet\) => effet\.camp !== 'sorcier'\)\s*\n?\s*\.map\(\(effet\) => effet\.cardId\)\);/s,
  'la table sait quelles cartes l’eau ramène dans VOTRE main');
assert.match(page, /cartesEnRenvoi\.has\(carteId\) \? 'is-en-renvoi' : ''/,
  'leur emplacement de main les masque pendant le tourbillon');
assert.match(css, /\.rpg-hand__card\.is-en-renvoi\s*\{[^}]*opacity:\s*0;[^}]*pointer-events:\s*none;/s,
  'la carte attend, invisible et non cliquable, à sa place dans l’éventail');
assert.match(css, /\.rpg-hand__card\s*\{[^}]*transition:\s*transform \.2s ease, box-shadow \.2s ease, opacity \.26s ease-out;/s,
  'elle reparaît en fondu quand le tourbillon se referme');
assert.match(page, /const duree = 950;/, 'le tourbillon dure 950 ms avant de rendre la carte à la main');
assert.match(page, /camp: entite\.camp \?\? 'joueur',/, 'l’instantané du champ connaît le camp de chaque carte');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.rpg-tourbillon-eau,\s*\.rpg-tourbillon-eau \*(?:,\s*\.[^{]+)? \{ animation:\s*none !important; transition:\s*none !important; \}/,
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

// ── 4. Toutes les voies du renvoi, pas seulement la magie ──────────────────
// Le moteur journalise chaque créature rendue à une main : la table n'a plus à
// dépendre du chemin qui l'a fait — une magie, mais aussi le rebond d'une
// créature (le Sonneur fêlé, le Léviathan), une riposte du sorcier.
assert.match(engine, /export function rpgRenvoisEnMain\(duel\)/, 'le moteur publie le journal des renvois');
assert.match(engine, /renvoisParDuel\.set\(duel, journal\)/, 'le journal vit hors de l’état sérialisé');
const corpsRenvoi = engine.slice(engine.indexOf('function renvoyerEnMain('), engine.indexOf('/**', engine.indexOf('function renvoyerEnMain(')));
assert.match(corpsRenvoi, /journaliserRenvoiEnMain\(duel, cote, presente\);\s*\n\s*duel\.log\.push\(`\$\{presente\.name\} retourne dans la main/,
  'chaque créature rendue en main est journalisée, juste avant son retour');
assert.ok(corpsRenvoi.indexOf('if (presente.jeton)') < corpsRenvoi.indexOf('journaliserRenvoiEnMain('),
  'un jeton qui cesse d’exister n’est pas un renvoi : il garde son adieu de carte détruite');
assert.match(page, /rpgRenvoisEnMain\(duel\)/, 'la table lit le journal du moteur');
assert.match(animer, /const renvoyees = new Set\(\[\s*\n?\s*\.\.\.entitesRenvoyees\.filter\(Boolean\),\s*\n?\s*\.\.\.rpgRenvoisEnMain\(duel\)\.map\(\(evenement\) => evenement\.entityId\),\s*\n?\s*\]\);/s,
  'le renvoi d’un effet de créature lève le même tourbillon que celui d’une magie');
// Les chemins qui connaissent leur cible continuent de la passer : le journal
// ne les remplace pas, il les complète.
const appels = [...page.matchAll(/animerModificationsChamp\([\s\S]{0,240}?\.renvoiEntityId\]\)/g)];
assert.ok(appels.length >= 3, `les renvois en main connus passent leur entité (reçu : ${appels.length})`);

console.log('✓ Renvoi en main : l’eau emporte la carte — nappe au sol, spirale qui s’enroule en montant, deux ondes, cinq gouttes, et la carte elle-même qui se dissout — posée sur son emplacement et son inclinaison, sans capter de geste, sans toucher la mise en page : la créature quitte la table, l’eau joue, et la carte ne reparaît dans la main qu’une fois le tourbillon refermé (950 ms) — pour une magie comme pour le rebond d’une créature — silencieux en mouvement réduit');
