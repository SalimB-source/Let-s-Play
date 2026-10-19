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

  // Les flammes sont dessinées : un calque SVG, un tracé de langue, et trois
  // couches par langue — la braise rouge, la flamme orange, le cœur blanc.
  const flammes = racine.querySelector('.rpg-roue-feu__flammes');
  assert.ok(flammes, 'les flammes forment un calque SVG, pas un dégradé');
  assert.equal(flammes.getAttribute('viewBox'), '0 0 100 100',
    'le calque se mesure sur la face');
  assert.equal(flammes.getAttribute('preserveAspectRatio'), 'none',
    'la face étire le dessin à son ratio');
  const trace = flammes.querySelector('defs path');
  assert.ok(trace, 'un tracé de langue est défini une fois, puis réutilisé');
  assert.match(trace.getAttribute('d') ?? '', /^M0 0C[\d.\-]+/,
    'la langue part de sa base et se dessine en courbes');
  assert.match(trace.getAttribute('d') ?? '', /Z$/,
    'le tracé est fermé : une flamme pleine, pas un trait');
  const couches = [...racine.querySelectorAll('.rpg-roue-feu__flamme')];
  assert.equal(couches.length % 3, 0, 'chaque langue porte ses trois couches');
  assert.ok(couches.length >= 45, 'au moins quinze langues autour de la carte');
  for (const nom of ['externe', 'moyenne', 'coeur']) {
    assert.equal(couches.filter((couche) => couche.classList.contains(`rpg-roue-feu__flamme--${nom}`)).length,
      couches.length / 3, `la couche « ${nom} » est posée sur chaque langue`);
  }
  assert.equal(racine.querySelectorAll('.rpg-roue-feu__cercle').length, 0,
    'plus de cercles en dégradé conique : ce n’étaient pas des flammes');
  assert.equal(racine.querySelectorAll('use').length, couches.length,
    'chaque couche réutilise le même tracé');
  assert.ok(couches.every((couche) => /--d:\d+ms/.test(couche.getAttribute('style') ?? '')
    && /--dur:\d+ms/.test(couche.getAttribute('style') ?? '')),
  'chaque couche a sa cadence et son retard : deux langues ne battent jamais ensemble');
  assert.ok(couches.some((couche) => /--d:(?!0ms)\d+ms/.test(couche.getAttribute('style') ?? '')),
    'les retards sont réels, pas tous à zéro');
  const groupes = [...flammes.querySelectorAll('svg > g, g')].slice(0, 3);
  assert.ok(groupes.length, 'les langues sont placées par un transform de position');
  assert.ok([...flammes.children].some((enfant) => enfant.tagName.toLowerCase() === 'g'
    && /translate\([\d.]+ [\d.]+\) scale\([\d.]+\)/.test(enfant.getAttribute('transform') ?? '')),
  'une langue se pose sur la face et prend sa taille');
  const braises = [...racine.querySelectorAll('.rpg-roue-feu__braise')];
  assert.ok(braises.length >= 3, 'quelques braises montent');
  assert.ok(braises.every((braise) => /--dx:-?\d+px/.test(braise.getAttribute('style') ?? '')
    && /--dy:-?\d+px/.test(braise.getAttribute('style') ?? '')
    && /--d:\d+ms/.test(braise.getAttribute('style') ?? '')),
  'chaque braise part dans sa direction, avec son propre retard');
  assert.equal(racine.children.length, 3 + braises.length,
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

// Les flammes : un calque SVG, trois couches, un battement qui dessine la langue.
const flammesCss = /\.rpg-roue-feu__flammes\s*\{([^}]*)\}/s.exec(css)?.[1] ?? '';
assert.match(flammesCss, /position:\s*absolute;[^}]*overflow:\s*visible;/, 
  'les pointes dépassent du cadre, comme une flamme qui lèche au-delà');
assert.match(flammesCss, /drop-shadow\(0 0 9px rgba\(255, 118, 26/, 
  'un seul halo porte la lueur des dix-huit langues, pas dix-huit halos cumulés');
const flammeCss = /\.rpg-roue-feu__flamme\s*\{([^}]*)\}/s.exec(css)?.[1] ?? '';
assert.match(flammeCss, /transform-box:\s*fill-box;/, 
  'chaque tracé bat dans sa propre boîte');
assert.match(flammeCss, /transform-origin:\s*50% 100%;/, 
  'la flamme jaillit de sa base, jamais de son centre');
assert.match(flammeCss, /rpg-roue-feu-lingue var\(--dur, 480ms\) linear infinite/, 
  'le battement est continu, à la cadence de la couche');
assert.match(flammeCss, /animation-delay:\s*var\(--d, 0ms\);/, 
  'chaque langue a son retard');
assert.match(css, /\.rpg-roue-feu__flamme--externe\s*\{[^}]*--s0:\s*1\.12;[^}]*fill:\s*rgba\(226, 58, 10,[^}]*filter:\s*blur\(3\.6px\)/s,
  'la braise extérieure est rouge et floue : c’est elle qui éclaire');
assert.match(css, /\.rpg-roue-feu__flamme--moyenne\s*\{[^}]*--s0:\s*\.66;[^}]*fill:\s*rgba\(255, 154, 24,/s,
  'la flamme orange est nette : c’est elle qu’on voit dessinée');
assert.match(css, /\.rpg-roue-feu__flamme--coeur\s*\{[^}]*--s0:\s*\.26;[^}]*fill:\s*rgba\(255, 244, 205,/s,
  'le cœur blanc brûle au centre');
const blocRoue = css.slice(css.indexOf('.rpg-roue-feu {'), css.indexOf('Les flèches d'));
assert.doesNotMatch(blocRoue, /rpg-roue-feu__cercle|conic-gradient\(from 0deg/,
  'plus aucun anneau en dégradé conique : la roue est faite de langues');
const lingue = /@keyframes rpg-roue-feu-lingue\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
assert.match(lingue, /18% \{[\s\S]*?scale\(calc\(var\(--s0\) \* 1\.02\)/, 
  'la langue jaillit à 18 % du battement');
assert.match(lingue, /38% \{[\s\S]*?skewX\(7deg\)/, 
  'elle se couche d’un côté : c’est ce qui fait une flamme, pas un triangle');
assert.match(lingue, /62% \{[\s\S]*?skewX\(-3deg\)/, 'puis de l’autre');
assert.match(lingue, /100% \{[\s\S]*?scale\(calc\(var\(--s0\) \* \.5\), calc\(var\(--s0\) \* \.12\)\);[\s\S]*?opacity: 0;/,
  'elle meurt en pointe, jamais en bloc');
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
assert.match(imagesCles, /transform: translateY\(/,
  'chaque langue bat sur `transform`, dans sa propre boîte — le calque, lui, garde son inclinaison');
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
assert.match(page, /const nouvellesDestructions = cartesEnDestruction\s*\n?\s*\.slice\(prevDestructionCountRef\.current\)\s*\n?\s*\.filter\(\(effet\) => !effet\.flammeJouee\);/s,
  'une carte consumée par la roue garde son adieu mais ne rejoue pas le bruit du feu');
assert.match(page, /flammeJouee: feuVientDeSonner && entitesBrulees\.has\(entite\.entityId\),/,
  'le drapeau n’est posé que sur les cartes que la Braise a brûlées');
assert.doesNotMatch(page, /jouerSfx\('page_turn'\)/,
  'la fenêtre de blocage ne joue plus le bruit de page tournée quand une créature attaque');
assert.match(page, /phaseDuelActive === 'attaque'[\s\S]{0,80}jouerSfx\('phase'\)/,
  'la déclaration d’attaque garde son repère sonore');

console.log('✓ Braise : la roue de feu s’allume autour de la créature mordue — des langues de feu dessinées, en trois couches, qui battent chacune à sa cadence, une lueur au sol et neuf braises — posée sur son emplacement et son inclinaison, sans capter de geste, sans toucher la mise en page : la carte brûlée reste dans le feu et son adieu de carte détruite n’arrive qu’une fois la roue refermée (900 ms), silencieuse en mouvement réduit');
