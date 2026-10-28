/**
 * La tempête de sable, signature de l'élément Sable.
 * node scripts/rpg-tempete-sable-check.mjs
 *
 * Un sort ou une capacité de Sable blesse une créature : le journal des
 * blessures porte `elements: ['sable']`, et la table allume une lame de
 * poussière qui **descend** sur la carte, avec voile, érosion des bords et
 * grains qui retombent au sol. Un sort **de zone** ne s'arrête pas aux cartes :
 * un second calque couvre toute une moitié de table — du bord du plateau à la
 * frontière du territoire — et le mur de poussière y descend verticalement,
 * semé de grains sur toute la largeur. Comme la roue de feu, ces calques se
 * posent sur la table, ne captent aucun geste et n'animent aucune propriété de
 * mise en page. Ils ne se lèvent jamais en mouvement réduit.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const engine = readFileSync(new URL('../src/games/rpgDuel.js', import.meta.url), 'utf8');

// ── 1. Les calques, rendus pour de vrai ────────────────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-tempete-sable-smoke.jsx', outDir: 'node_modules/.cache/rpg-tempete-sable', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendreTempete, rendreTempeteZone } = await import('../node_modules/.cache/rpg-tempete-sable/rpg-tempete-sable-smoke.js');

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
  assert.ok(racine.querySelector('.rpg-tempete-sable__lame'), 'une lame de sable descend sur la carte');
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

// ── 2. La vague de zone : tout un côté du plateau ──────────────────────────
const { window: fenetreZone } = new JSDOM(`<!doctype html><html><body>${rendreTempeteZone()}</body></html>`);
const zone = fenetreZone.document.querySelector('.rpg-tempete-sable-zone');
try {
  assert.ok(zone, 'la vague de zone est rendue');
  assert.ok(zone.classList.contains('rpg-tempete-sable-zone--sorcier'),
    'elle nomme le côté de table qu’elle balaie');
  assert.equal(zone.getAttribute('data-rpg-sable-zone'), 'sorcier', 'elle se nomme pour les contrôles');
  assert.equal(zone.getAttribute('data-rpg-sable-zone-fx'), 'sable');
  assert.equal(zone.getAttribute('aria-hidden'), 'true', 'elle est décorative, comme la lame d’une carte');
  assert.equal(zone.hasAttribute('style'), false,
    'elle ne dépend d’aucune carte : la feuille la cale sur la frontière du territoire');

  assert.ok(zone.querySelector('.rpg-tempete-sable-zone__voile'), 'la poussière couvre tout le côté');
  const lame = zone.querySelector('.rpg-tempete-sable-zone__lame');
  assert.ok(lame, 'un mur de sable traverse la moitié de table');
  assert.ok(lame.querySelector('.rpg-tempete-sable-zone__front'),
    'son front clair marque le bas de la vague');
  const grainsZone = [...zone.querySelectorAll('.rpg-tempete-sable-zone__grain')];
  assert.ok(grainsZone.length >= 12, 'les grains sont semés sur toute la largeur du côté, pas seulement sur les cartes');
  const positions = grainsZone.map((grain) => Number.parseFloat((/--x:([\d.]+)%/.exec(grain.getAttribute('style') ?? '') ?? [])[1]));
  assert.ok(positions.every((x) => Number.isFinite(x)), 'chaque grain tient sa place en pourcentage de la table');
  assert.ok(Math.min(...positions) < 10 && Math.max(...positions) > 90,
    'le semis va d’un bord à l’autre du plateau');
  assert.ok(grainsZone.every((grain) => /--dx:-?\d+px/.test(grain.getAttribute('style') ?? '')
    && /--dy:-?\d+px/.test(grain.getAttribute('style') ?? '')
    && /--d:\d+ms/.test(grain.getAttribute('style') ?? '')
    && /--taille:\d+px/.test(grain.getAttribute('style') ?? '')),
  'chaque grain garde sa dérive, sa taille et son retard');
  assert.equal(zone.children.length, 2 + grainsZone.length,
    'le calque ne contient que le voile, le mur et ses grains');
} finally {
  fenetreZone.close();
}

// ── 3. La feuille : du sable, du mouvement vertical et composé ─────────────
assert.match(css, /\.rpg-tempete-sable\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*57;[^}]*pointer-events:\s*none;/s,
  'le calque flotte au-dessus de la table et ne capte aucun geste');
assert.match(css, /\.rpg-tempete-sable\s*\{[^}]*animation:\s*rpg-tempete-sable-vie calc\(\.9s \* var\(--rpg-anim-scale, 1\)\) ease-out both;/s,
  'il vit neuf dixièmes de seconde, puis rend la table');
assert.match(css, /\.rpg-tempete-sable__lame\s*\{[^}]*animation:\s*rpg-tempete-sable-lame calc\(\.9s \* var\(--rpg-anim-scale, 1\)\) cubic-bezier\(\.3, \.65, \.35, 1\) both;/s,
  'la lame porte sa traversée');
for (const nom of ['vie', 'voile', 'lame', 'erosion', 'grain']) {
  assert.match(css, new RegExp(`@keyframes rpg-tempete-sable-${nom} `), `l’animation « ${nom} » existe`);
}
// La lame descend : plus aucune traversée horizontale dans tout le bloc.
const debutImages = css.indexOf('@keyframes rpg-tempete-sable-vie');
const finImages = css.indexOf('LA TEMPÊTE DE SABLE DE ZONE');
assert.ok(debutImages > 0 && finImages > debutImages, 'les images clés de la tempête forment un bloc');
const imagesCles = css.slice(debutImages, finImages);
assert.doesNotMatch(imagesCles, /translateX/,
  'la lame de la carte ne balaie plus de gauche à droite');
assert.match(imagesCles, /@keyframes rpg-tempete-sable-lame \{[^}]*translateY\(-130%\)/s,
  'elle entre par le haut de la carte');
assert.match(imagesCles, /@keyframes rpg-tempete-sable-lame \{[\s\S]*?translateY\(240%\)/,
  'et sort par le bas : un balayage vertical');
assert.doesNotMatch(imagesCles, /(^|[^-])(top|left|right|bottom|width|height|margin):/s,
  'la tempête n’anime aucune propriété de mise en page : ni position, ni taille');

// La vague de zone : un calque qui couvre la moitié de table, du bord à la
// frontière du territoire, et un mur animé de haut en bas.
assert.match(css, /\.rpg-tempete-sable-zone\s*\{[^}]*position:\s*absolute;[^}]*left:\s*0;[^}]*right:\s*0;[^}]*z-index:\s*57;[^}]*pointer-events:\s*none;/s,
  'la vague couvre toute la largeur de la table sans capter de geste');
assert.match(css, /\.rpg-tempete-sable-zone--sorcier\s*\{\s*top:\s*0;\s*height:\s*var\(--rpg-frontiere, 50%\);/s,
  'la moitié du sorcier va du haut du plateau à la frontière');
assert.match(css, /\.rpg-tempete-sable-zone--joueur\s*\{\s*top:\s*var\(--rpg-frontiere, 50%\);\s*bottom:\s*0;/s,
  'la moitié du joueur descend de la frontière au bas du plateau');
assert.match(css, /\.rpg-tempete-sable-zone__lame\s*\{[^}]*animation:\s*rpg-tempete-sable-zone-lame calc\(1\.1s \* var\(--rpg-anim-scale, 1\)\) cubic-bezier\(\.32, \.6, \.34, 1\) both;/s,
  'le mur de zone porte sa propre traversée');
for (const nom of ['vie', 'voile', 'lame', 'grain']) {
  assert.match(css, new RegExp(`@keyframes rpg-tempete-sable-zone-${nom} `), `l’animation « ${nom} » de la zone existe`);
}
const debutZone = css.indexOf('@keyframes rpg-tempete-sable-zone-vie');
const finZone = css.indexOf('LA BALANCE DES HEURES');
assert.ok(debutZone > 0 && finZone > debutZone, 'les images clés de la vague de zone forment un bloc');
const imagesZone = css.slice(debutZone, finZone);
assert.doesNotMatch(imagesZone, /translateX/,
  'le mur de zone ne balaie jamais horizontalement');
assert.match(imagesZone, /@keyframes rpg-tempete-sable-zone-lame \{[\s\S]*?translateY\(-118%\)[\s\S]*?translateY\(142%\)/,
  'il descend du haut vers le bas de la moitié de table');
assert.doesNotMatch(imagesZone, /(^|[^-])(top|left|right|bottom|width|height|margin):/s,
  'la vague n’anime aucune propriété de mise en page');

// ── 4. Le mouvement réduit : la tempête reste immobile ─────────────────────
assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.rpg-tempete-sable,\s*\.rpg-tempete-sable \*,[\s\S]*?\.rpg-tempete-sable-zone,\s*\.rpg-tempete-sable-zone \*,[\s\S]*?animation:\s*none !important;/,
  'en mouvement réduit, les deux tempêtes et leurs pièces se figent');
assert.match(css, /\.rpg-battle\.is-reduced \.rpg-tempete-sable-zone__lame,/,
  'le mode réduit forcé coupe aussi le mur de zone');

// ── 5. Le moteur : une seule table de cibles pour l’animation et le jeu ────
assert.match(engine, /export const rpgSortViseUneZone = \(carte\) => CIBLES_SORT_ZONE\.has\(carte\?\.effet\?\.cible\);/,
  'la portée de zone est exportée pour que la table lise la même règle que le moteur');
assert.match(page, /^\s*rpgSortViseUneZone,\n/m, 'la page importe cette portée');

// ── 6. La page : quand le sable frappe ─────────────────────────────────────
assert.match(page, /const \[tempetesSable, setTempetesSable\] = useState\(\[\]\);/,
  'la table garde la liste des tempêtes en cours');
assert.match(page, /const \[tempetesSableZone, setTempetesSableZone\] = useState\(\[\]\);/,
  'et celle des vagues de zone');
assert.match(page, /if \(blessure\.elements\.includes\('sable'\)\) sableParEntite\.set\(blessure\.entityId, blessure\);/,
  'le sable se lit dans les éléments de la blessure, comme la Braise');
const animer = page.slice(page.indexOf('const animerModificationsChamp = ('), page.indexOf('const conserverAnnulation ='));
assert.match(animer, /const sableuses = new Map\(\);/, 'la relève des créatures ensablées existe');
assert.match(animer, /if \(!mouvementReduit\) \{[\s\S]*?sableuses\.set\(entite\.entityId, entite\);[\s\S]*?\}/,
  'aucune tempête ne se lève en mouvement réduit');
assert.match(animer, /const zonesSable = new Map\(\);/,
  'la relève des côtés de plateau balayés existe');
assert.match(animer, /if \(carteSource && rpgSortViseUneZone\(carteSource\)\) \{[\s\S]*?zonesSable\.set\(camp, \{ camp, carteId: blessure\.sourceCarteId \}\);/,
  'un sort de zone désigne tout un camp, pas une carte');
assert.match(animer, /if \(zonesSable\.size\) \{[\s\S]*?effectId: `sable-zone-\$\{token\}-\$\{zone\.camp\}`,[\s\S]*?setTempetesSableZone\(\(current\) => \[\.\.\.nettoyerFantomes\(current\), \.\.\.effetsZone\]\);/,
  'une vague par camp balayé rejoint la file, avec un identifiant unique');
assert.match(animer, /expireA: Date\.now\(\) \+ dureeAnimation\(DUREE_TEMPETE_SABLE_ZONE\) \+ 400,/, 'chaque vague porte sa date de péremption');
assert.match(animer, /\.filter\(\(entite\) => !zonesSable\.has\(entite\.camp\)\)/,
  'une carte prise dans la vague n’ajoute pas une seconde lame');
assert.match(animer, /if \(sableuses\.size\) \{[\s\S]*?effectId: `sable-\$\{token\}-\$\{entite\.entityId\}`,[\s\S]*?setTempetesSable\(\(current\) => \[\.\.\.nettoyerFantomes\(current\), \.\.\.effetsSable\]\);/,
  'chaque créature frappée hors zone rejoint la file des lames, avec un identifiant unique');
assert.match(animer, /expireA: Date\.now\(\) \+ dureeAnimation\(DUREE_TEMPETE_SABLE\) \+ 400,/, 'chaque lame porte sa date de péremption');
assert.match(page, /\{tempetesSableZone\.map\(\(effet\) => \(\s*<TempeteSableZone\s+key=\{effet\.effectId\}/s,
  'les vagues sont rendues sur la table');
assert.match(page, /\{tempetesSable\.map\(\(effet\) => \(\s*<TempeteSable\s+key=\{effet\.effectId\}/s,
  'les lames de carte aussi');
assert.match(page, /onTermine=\{\(effectId\) => setTempetesSableZone\(\(current\) => current\.filter\(\(autre\) => autre\.effectId !== effectId\)\)\}/,
  'chaque vague se retire à sa dernière image');
assert.match(page, /onTermine=\{\(effectId\) => setTempetesSable\(\(current\) => current\.filter\(\(autre\) => autre\.effectId !== effectId\)\)\}/,
  'chaque lame aussi');
assert.match(page, /if \(!tempetesSableZone\.length\) return undefined;[\s\S]*?setTempetesSableZone\(\(current\) => nettoyerFantomes\(current\)\)/,
  'un chien de garde retire les vagues périmées si la minuterie se perd');
assert.match(page, /if \(!tempetesSable\.length\) return undefined;[\s\S]*?setTempetesSable\(\(current\) => nettoyerFantomes\(current\)\)/,
  'un autre veille sur les lames de carte');
assert.match(page, /setTempetesSableZone\(\[\]\);/, 'quitter le duel efface les vagues en cours');
assert.match(page, /setTempetesSable\(\[\]\);/, 'et les lames en cours');

console.log('✓ Tempête de sable : un balayage VERTICAL, du haut vers le bas — la lame descend sur la créature frappée (voile ocre, érosion des bords, six grains au sol), et un sort de zone couvre tout le côté du plateau qu’il traverse, du bord à la frontière du territoire, semé de grains sur toute la largeur ; calques décoratifs, sans propriété de mise en page animée, figés en mouvement réduit');
