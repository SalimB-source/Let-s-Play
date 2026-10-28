/**
 * La tempête de sable, signature de l'élément Sable.
 * node scripts/rpg-tempete-sable-check.mjs
 *
 * Un sort ou une capacité de Sable blesse une créature : le journal des
 * blessures porte `elements: ['sable']`, et la table allume une lame de
 * poussière qui balaie la carte, avec voile, érosion des bords et grains qui
 * retombent au sol. Comme la roue de feu, le calque se pose sur l'emplacement
 * mesuré avant l'action, ne capte aucun geste et n'anime aucune propriété de
 * mise en page. Il ne se lève jamais en mouvement réduit.
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
  build: { ssr: 'scripts/rpg-tempete-sable-smoke.jsx', outDir: 'node_modules/.cache/rpg-tempete-sable', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendreTempete } = await import('../node_modules/.cache/rpg-tempete-sable/rpg-tempete-sable-smoke.js');
const { window } = new JSDOM(`<!doctype html><html><body>${rendreTempete()}</body></html>`);
const racine = window.document.querySelector('.rpg-tempete-sable');
try {
  assert.ok(racine, 'le calque de la tempête est rendu');
  assert.equal(racine.getAttribute('data-rpg-sable-fx'), 'sable', 'il se nomme pour les contrôles et la feuille');
  assert.equal(racine.getAttribute('data-rpg-sable-id'), 'entite-ensablee',
    'il garde l’identité de la créature frappée');
  assert.equal(racine.getAttribute('aria-hidden'), 'true', 'il est décoratif : rien à lire, rien à sélectionner');

  const style = racine.getAttribute('style') ?? '';
  assert.match(style, /left:214px/, 'il se pose exactement sur l’emplacement de la carte');
  assert.match(style, /top:96px/);
  assert.match(style, /width:132px/, 'il reprend sa largeur');
  assert.match(style, /height:176px/, 'et sa hauteur');
  assert.match(style, /--rpg-fx-rotation:0\.26rad/, 'il en garde l’inclinaison de combat');

  assert.ok(racine.querySelector('.rpg-tempete-sable__voile'), 'un voile de poussière enveloppe la carte');
  assert.ok(racine.querySelector('.rpg-tempete-sable__lame'), 'une lame de sable traverse la carte');
  assert.ok(racine.querySelector('.rpg-tempete-sable__erosion'), 'les bords s’érodent');
  const grains = [...racine.querySelectorAll('.rpg-tempete-sable__grain')];
  assert.equal(grains.length, 6, 'six grains s’arrachent à la lame');
  assert.ok(grains.every((grain) => /--dx:-?\d+px/.test(grain.getAttribute('style') ?? '')
    && /--dy:-?\d+px/.test(grain.getAttribute('style') ?? '')
    && /--d:\d+ms/.test(grain.getAttribute('style') ?? '')),
  'chaque grain part dans sa direction, avec son propre retard');
  assert.equal(racine.children.length, 3 + grains.length,
    'le calque ne contient que voile, lame, érosion et ses grains');
} finally {
  window.close();
}

// ── 2. La feuille : du sable, du mouvement composé ─────────────────────────
assert.match(css, /\.rpg-tempete-sable\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*57;[^}]*pointer-events:\s*none;/s,
  'le calque flotte au-dessus de la table et ne capte aucun geste');
assert.match(css, /\.rpg-tempete-sable\s*\{[^}]*animation:\s*rpg-tempete-sable-vie calc\(\.9s \* var\(--rpg-anim-scale, 1\)\) ease-out both;/s,
  'il vit neuf dixièmes de seconde, puis rend la table');
assert.match(css, /\.rpg-tempete-sable__lame\s*\{[^}]*animation:\s*rpg-tempete-sable-lame calc\(\.9s \* var\(--rpg-anim-scale, 1\)\) cubic-bezier\(\.3, \.65, \.35, 1\) both;/s,
  'la lame porte sa traversée horizontale');
for (const nom of ['vie', 'voile', 'lame', 'erosion', 'grain']) {
  assert.match(css, new RegExp(`@keyframes rpg-tempete-sable-${nom} `), `l’animation « ${nom} » existe`);
}
// Aucune mise en page animée dans tout le bloc de la tempête.
const debutImages = css.indexOf('@keyframes rpg-tempete-sable-vie');
const finImages = css.indexOf('LA BALANCE DES HEURES');
assert.ok(debutImages > 0 && finImages > debutImages, 'les images clés de la tempête forment un bloc');
const imagesCles = css.slice(debutImages, finImages);
assert.doesNotMatch(imagesCles, /(^|[^-])(top|left|right|bottom|width|height|margin):/s,
  'la tempête n’anime aucune propriété de mise en page : ni position, ni taille');

// ── 3. Le mouvement réduit : la tempête reste immobile ─────────────────────
assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.rpg-tempete-sable,\s*\.rpg-tempete-sable \*,[\s\S]*?animation:\s*none !important;/,
  'en mouvement réduit, la tempête et ses pièces se figent');

// ── 4. La page : quand le sable frappe ─────────────────────────────────────
assert.match(page, /const \[tempetesSable, setTempetesSable\] = useState\(\[\]\);/,
  'la table garde la liste des tempêtes en cours');
assert.match(page, /if \(blessure\.elements\.includes\('sable'\)\) sableParEntite\.set\(blessure\.entityId, blessure\);/,
  'le sable se lit dans les éléments de la blessure, comme la Braise');
const animer = page.slice(page.indexOf('const animerModificationsChamp = ('), page.indexOf('const conserverAnnulation ='));
assert.match(animer, /const sableuses = new Map\(\);/, 'la relève des créatures ensablées existe');
assert.match(animer, /if \(!mouvementReduit\) \{[\s\S]*?sableuses\.set\(entite\.entityId, entite\);[\s\S]*?\}/,
  'aucune tempête ne se lève en mouvement réduit');
assert.match(animer, /if \(sableuses\.size\) \{[\s\S]*?effectId: `sable-\$\{token\}-\$\{entite\.entityId\}`,[\s\S]*?setTempetesSable\(\(current\) => \[\.\.\.nettoyerFantomes\(current\), \.\.\.effetsSable\]\);/,
  'chaque créature frappée rejoint la file des tempêtes, avec un identifiant unique');
assert.match(animer, /expireA: Date\.now\(\) \+ dureeAnimation\(DUREE_TEMPETE_SABLE\) \+ 400,/, 'chaque tempête porte sa date de péremption');
assert.match(page, /\{tempetesSable\.map\(\(effet\) => \(\s*<TempeteSable\s+key=\{effet\.effectId\}/s,
  'elles sont rendues sur la table');
assert.match(page, /onTermine=\{\(effectId\) => setTempetesSable\(\(current\) => current\.filter\(\(autre\) => autre\.effectId !== effectId\)\)\}/,
  'chacune se retire à sa dernière image');
assert.match(page, /if \(!tempetesSable\.length\) return undefined;[\s\S]*?setTempetesSable\(\(current\) => nettoyerFantomes\(current\)\)/,
  'un chien de garde retire les tempêtes périmées si la minuterie se perd');
assert.match(page, /setTempetesSable\(\[\]\);/, 'quitter le duel efface les tempêtes en cours');

console.log('✓ Tempête de sable : la lame balaie la créature frappée par un sort Sable — voile ocre, traversée horizontale, érosion des bords et six grains qui retombent au sol — posée sur son emplacement et son inclinaison, sans capter de geste, sans toucher la mise en page, silencieuse en mouvement réduit');
