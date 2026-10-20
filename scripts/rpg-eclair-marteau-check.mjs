/**
 * La foudre de l'Éclair du marteau sur une créature touchée.
 * node scripts/rpg-eclair-marteau-check.mjs
 *
 * Quand l'Éclair du marteau touche une créature, le ciel se fend au-dessus
 * d'elle : un marteau de guerre sombre s'abat en diagonale, l'éclair
 * principal le relie au ciel et frappe au même instant (flash, onde,
 * étincelles, fissures), le marteau rebondit et se dissout, des arcs
 * résiduels rampent sur les bords — et la créature encaisse la secousse
 * (`fx-foudre`) au même rythme. Comme la roue de feu, le calque se pose sur
 * l'emplacement mesuré avant l'action, ne capte rien et ne retient pas la
 * mort : la créature tuée reçoit son adieu pendant que la foudre finit de
 * tomber là où elle se tenait. Seule cette carte allume l'effet : le journal
 * des blessures nomme la carte du coup, la couleur Neige ne suffit pas.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const engine = readFileSync(new URL('../src/games/rpgDuel.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const foudreAudio = readFileSync(new URL('../src/games/rpgFoudreAudio.js', import.meta.url), 'utf8');
const audio = readFileSync(new URL('../src/games/rpgAudio.js', import.meta.url), 'utf8');

// ── 1. Le calque, rendu pour de vrai ───────────────────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-eclair-marteau-smoke.jsx', outDir: 'node_modules/.cache/rpg-eclair-marteau', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendreEclair } = await import('../node_modules/.cache/rpg-eclair-marteau/rpg-eclair-marteau-smoke.js');
const { window } = new JSDOM(`<!doctype html><html><body>${rendreEclair()}</body></html>`);
const racine = window.document.querySelector('.rpg-eclair-marteau');
try {
  assert.ok(racine, 'la foudre du marteau est rendue');
  assert.equal(racine.getAttribute('data-rpg-foudre-fx'), 'eclair-du-marteau',
    'elle se nomme pour les contrôles et la feuille');
  assert.equal(racine.getAttribute('data-rpg-foudre-id'), 'entite-foudroyee',
    'elle garde l’identité de la créature touchée');
  assert.equal(racine.getAttribute('aria-hidden'), 'true',
    'elle est décorative : rien à lire, rien à sélectionner');

  const style = racine.getAttribute('style') ?? '';
  assert.match(style, /left:214px/, 'elle se pose exactement sur l’emplacement de la carte');
  assert.match(style, /top:96px/);
  assert.match(style, /width:132px/, 'elle reprend sa largeur');
  assert.match(style, /height:176px/, 'et sa hauteur');
  assert.match(style, /--rpg-fx-rotation:0\.26rad/, 'elle en garde l’inclinaison de combat');

  assert.ok(racine.querySelector('.rpg-eclair-marteau__flash'), 'le flash éclate au point d’impact');
  assert.ok(racine.querySelector('.rpg-eclair-marteau__onde'), 'l’onde du choc court au sol');
  assert.equal(racine.querySelector('img'), null,
    'la foudre ne redessine pas la carte : une morte a déjà commencé son adieu');

  // Le ciel fendu : un calque SVG qui déborde de la face.
  const ciel = racine.querySelector('.rpg-eclair-marteau__ciel');
  assert.ok(ciel, 'la foudre est dessinée dans un calque SVG');
  assert.equal(ciel.getAttribute('viewBox'), '0 0 100 100', 'le calque se mesure sur la face');
  assert.equal(ciel.getAttribute('preserveAspectRatio'), 'none',
    'la face étire le dessin à son ratio, comme la roue de feu');

  // L’éclair, en deux couches : le halo bleu qui éclaire, le cœur blanc qui
  // se voit — pour le trait principal ET pour la décharge qui gagne le sol.
  assert.equal(ciel.querySelectorAll('.rpg-eclair-marteau__eclair--halo').length, 2,
    'le halo porte l’éclair principal et la décharge');
  assert.equal(ciel.querySelectorAll('.rpg-eclair-marteau__eclair--coeur').length, 2,
    'le cœur blanc dessine les deux traits');
  const principal = ciel.querySelector('.rpg-eclair-marteau__eclair--coeur');
  assert.match(principal.getAttribute('d') ?? '', /^-?M64-72/,
    'l’éclair vient de plus haut que la carte : le ciel est hors de la face');
  assert.match(principal.getAttribute('d') ?? '', /50 30$/,
    'il frappe au point d’impact, là où la tête du marteau s’abat');
  assert.equal(ciel.querySelectorAll('.rpg-eclair-marteau__fourche').length, 3,
    'trois fourches se détachent de l’éclair principal');
  assert.equal(ciel.querySelectorAll('.rpg-eclair-marteau__fissure').length, 3,
    'le sol se fissure sous la carte, comme sur l’illustration');
  const arcs = [...ciel.querySelectorAll('.rpg-eclair-marteau__arc')];
  assert.equal(arcs.length, 5, 'cinq arcs résiduels rampent sur les bords de la face');
  assert.ok(arcs.every((arc) => /--d:\d+ms/.test(arc.getAttribute('style') ?? '')),
    'chaque arc clignote à son propre retard');
  assert.ok(arcs.some((arc) => /--d:(?!330ms)\d+ms/.test(arc.getAttribute('style') ?? '')),
    'les retards des arcs ne sont pas tous les mêmes');

  // Le marteau : posé sur le point d’impact, manche en diagonale, et un
  // groupe intérieur qui porte la chute.
  const pose = [...ciel.querySelectorAll('g')]
    .find((groupe) => /translate\(50 30\) rotate\(36\)/.test(groupe.getAttribute('transform') ?? ''));
  assert.ok(pose, 'le marteau est posé sur le point d’impact, manche levé en diagonale');
  const marteau = ciel.querySelector('.rpg-eclair-marteau__marteau');
  assert.ok(marteau, 'un groupe intérieur porte la chute, le rebond et la dissolution');
  assert.ok(marteau.querySelector('.rpg-eclair-marteau__tete'), 'la tête du marteau est dessinée');
  assert.ok(marteau.querySelector('.rpg-eclair-marteau__manche'), 'le manche est dessiné');
  assert.ok(marteau.querySelector('.rpg-eclair-marteau__pommeau'), 'le pommeau couronne le manche');
  assert.equal(marteau.querySelectorAll('.rpg-eclair-marteau__joue').length, 2,
    'les deux joues de la tête encadrent la frappe');
  assert.ok(marteau.querySelector('.rpg-eclair-marteau__rune'),
    'une rune gravée s’allume sur la tête');
  assert.equal(marteau.querySelectorAll('.rpg-eclair-marteau__arc-mini').length, 2,
    'deux mini-arcs crépitent au bas de la tête à l’impact');

  const etincelles = [...racine.querySelectorAll('.rpg-eclair-marteau__etincelle')];
  assert.equal(etincelles.length, 10, 'dix étincelles jaillissent de l’impact');
  assert.ok(etincelles.every((etincelle) => /--dx:-?\d+px/.test(etincelle.getAttribute('style') ?? '')
    && /--dy:-?\d+px/.test(etincelle.getAttribute('style') ?? '')
    && /--d:\d+ms/.test(etincelle.getAttribute('style') ?? '')
    && /--r:-?\d+deg/.test(etincelle.getAttribute('style') ?? '')),
    'chaque étincelle part dans sa direction, inclinée dans son vol, avec son retard');
  assert.ok(etincelles.every((etincelle) => Number(/--d:(\d+)ms/.exec(etincelle.getAttribute('style') ?? '')?.[1]) >= 260),
    'aucune étincelle avant l’impact : elles naissent du coup, pas de la chute');
  assert.equal(racine.children.length, 3 + etincelles.length,
    'le calque ne contient que ses pièces de foudre : le flash, l’onde, le ciel, les étincelles');
} finally {
  window.close();
}

// ── 2. La feuille : une chute, un impact, des arcs qui s’éteignent ─────────
assert.match(css, /\.rpg-eclair-marteau\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*57;[^}]*transform:\s*rotate\(var\(--rpg-fx-rotation, 0rad\)\);[^}]*pointer-events:\s*none;/s,
  'le calque flotte au-dessus des cartes, suit l’inclinaison de la carte et ne capte aucun geste');
assert.match(css, /\.rpg-eclair-marteau\s*\{[^}]*animation:\s*rpg-eclair-marteau-vie \.95s ease-out both;/s,
  'il vit 950 ms, puis rend la table');
const cielCss = /\.rpg-eclair-marteau__ciel\s*\{([^}]*)\}/s.exec(css)?.[1] ?? '';
assert.match(cielCss, /overflow:\s*visible;/,
  'l’éclair vient de plus haut que la face et les fissures courent en dessous');
assert.match(cielCss, /drop-shadow\(0 0 7px rgba\(110, 200, 255/,
  'un seul halo porte la lueur de tous les traits');
assert.match(css, /\.rpg-eclair-marteau__eclair--halo\s*\{[^}]*stroke:\s*rgba\(96, 180, 255,[^}]*filter:\s*blur\(2\.2px\)/s,
  'le halo bleu est épais et flou : c’est lui qui éclaire');
assert.match(css, /\.rpg-eclair-marteau__eclair--coeur\s*\{[^}]*stroke:\s*#fff;[^}]*stroke-width:\s*1\.7;/s,
  'le cœur blanc est fin et net : c’est lui qu’on voit dessiné');
const marteauCss = /\.rpg-eclair-marteau__marteau\s*\{([^}]*)\}/s.exec(css)?.[1] ?? '';
assert.match(marteauCss, /transform-box:\s*fill-box;/, 'le marteau bat dans sa propre boîte');
assert.match(marteauCss, /transform-origin:\s*50% 84%;/, 'il pivote autour de sa tête : c’est elle qui frappe');
assert.match(marteauCss, /rpg-eclair-marteau-chute \.95s linear both/,
  'la chute dure autant que le calque');
const chute = /@keyframes rpg-eclair-marteau-chute\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
assert.match(chute, /0% \{[^}]*translate\(30px, -86px\) rotate\(-26deg\); opacity: 0;/,
  'le marteau part du ciel, en diagonale, invisible');
assert.match(chute, /28% \{[^}]*translate\(0, 1px\) rotate\(0deg\) scale\(1\.05, \.92\);/,
  'l’impact à 28 % écrase la tête sur la carte');
assert.match(chute, /52% \{[^}]*rotate\(16deg\); opacity: 1;/,
  'le marteau rebondit en tournoyant');
assert.match(chute, /72%, 100% \{[^}]*opacity: 0;/,
  'puis se dissout avant la fin du calque : les arcs finissent seuls');
const frappe = /@keyframes rpg-eclair-marteau-frappe\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
assert.match(frappe, /0%, 24% \{ opacity: 0; \}/,
  'l’éclair attend la fin de la chute : pas de foudre avant le coup');
assert.match(frappe, /27% \{ opacity: 1; \}/, 'il frappe avec le marteau');
assert.match(css, /\.rpg-eclair-marteau__etincelle\s*\{[^}]*animation:\s*rpg-eclair-marteau-etincelle \.55s[^}]*animation-delay:\s*var\(--d, 0ms\);/s,
  'les étincelles jaillissent avec leur retard');
const etincelle = /@keyframes rpg-eclair-marteau-etincelle\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
assert.match(etincelle, /\+ 26px\)/, 'elles retombent un peu avant de s’éteindre');

// La secousse de la victime : immobile pendant la chute, l’impact à 28 %,
// puis des sursauts qui s’amortissent.
assert.match(css, /\.rpg-card\.fx-foudre \{ animation: rpg-foudre-secousse \.95s linear both; \}/,
  'la créature touchée a sa propre cinématique, aussi longue que le calque');
const secousse = /@keyframes rpg-foudre-secousse\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
assert.match(secousse, /0%, 27% \{[^}]*filter: none; \}/,
  'la carte ne bouge pas pendant que le marteau tombe');
assert.match(secousse, /28% \{[^}]*brightness\(3\)[^}]*drop-shadow\(0 0 14px rgba\(140, 220, 255/,
  'à l’impact elle blanchit, cerclée de bleu électrique');
assert.match(secousse, /38% \{[^}]*rotate: 1\.4deg;/, 'elle convulse d’un côté');
assert.match(secousse, /43% \{[^}]*rotate: -1deg;/, 'puis de l’autre, plus faiblement');
assert.match(secousse, /74%, 100% \{[^}]*filter: none; \}/, 'et retombe au repos');

// Aucune mise en page : les images clés du calque ne touchent ni position,
// ni taille — comme la roue de feu.
const debutImages = css.indexOf('@keyframes rpg-eclair-marteau-vie');
const finImages = css.indexOf('Les flèches d');
assert.ok(debutImages > 0 && finImages > debutImages, 'les images clés de la foudre forment un bloc');
const imagesCles = css.slice(debutImages, finImages);
assert.doesNotMatch(imagesCles, /(top|left|right|bottom|width|height|margin):/,
  'la foudre n’anime aucune propriété de mise en page : ni position, ni taille');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.rpg-eclair-marteau,\s*\n?\s*\.rpg-eclair-marteau \* \{ animation:\s*none !important; transition:\s*none !important; \}/,
  'en mouvement réduit, la foudre reste immobile');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.rpg-card\.fx-foudre,/,
  'et la secousse de la victime aussi');
assert.match(css, /\.rpg-card\.is-spell-target:not\([^)]*\.fx-foudre[^)]*\)/,
  'le halo de cible rend l’animation à la carte pendant la secousse, comme pour fx-hit');

// ── 3. Le moteur : le journal nomme la carte du coup ───────────────────────
assert.match(engine, /sourceCarteId: blessure\.sourceCarteId \?\? null,/,
  'la blessure garde la carte qui l’a infligée');
assert.match(engine, /export function rpgBlesserCreature\(duel, cote, entiteId, amount, sourceElement = null, sourceElements = null, sourceType = null, sourceCarteId = null\)/,
  'blesser une créature peut nommer sa carte');
assert.match(engine, /journaliserBlessure\(duel, cote, entite, \{ elements, sourceCarteId, recus, absorbes, mortelle \}\);/,
  'le nom passe au journal');
assert.match(engine, /rpgBlesserCreature\(duel, adv, cible\.id, effet\.amount \?\? 0, sourceElement, null, sourceType, sourceCarteId\);/,
  'un sort de dégâts passe sa carte à la blessure qu’il inflige');

// ── 4. La table : la foudre s’allume sur la créature touchée ───────────────
assert.match(page, /const DUREE_ECLAIR_MARTEAU = 950;/, 'la foudre dure 950 ms');
assert.match(page, /import \{ blessureDuMarteau, rpgFoudreSoundFor \} from '\.\/rpgFoudreAudio\.js';/,
  'la table reconnaît le marteau par son module, pas par un nom en dur');
assert.match(page, /const idsFoudroyees = new Set\(blessuresNouvelles\s*\n?\s*\.filter\(\(blessure\) => blessureDuMarteau\(blessure\)\)/s,
  'seules les blessures toutes neuves du marteau comptent');
assert.match(page, /if \(blessureDuMarteau\(blessure\)\) marteauParEntite\.set\(blessure\.entityId, blessure\);/,
  'la couleur Neige ne suffit pas : c’est la carte qui allume la foudre');
assert.match(page, /setEclairsMarteau\(\(current\) => \[\.\.\.nettoyerFantomes\(current\), \.\.\.effetsFoudre\]\);/,
  'la foudre rejoint la file des effets, en nettoyant les périmés');
assert.match(page, /expireA: Date\.now\(\) \+ DUREE_ECLAIR_MARTEAU \+ 400,/,
  'elle porte sa date de péremption');
assert.match(page, /disparues\.some\(\(entite\) => foudroyees\.has\(entite\.entityId\)\) \? DUREE_ECLAIR_MARTEAU/,
  'la créature tuée par le marteau reste visible le temps de la foudre');
assert.match(page, /if \(idsFoudroyees\.has\(entite\.entityId\)\) secoueesParFoudre\.push\(entite\.entityId\);/,
  'la survivante ne prend pas le clignotement générique des coups');
assert.match(page, /animerEntites\(secoueesParFoudre, 'foudre', DUREE_ECLAIR_MARTEAU\);/,
  'elle encaisse la secousse, aussi longtemps que le calque');
assert.match(page, /actionFx\?\.type === 'foudre' \? 'fx-foudre' : '',/,
  'la carte porte la classe de la secousse');
assert.match(page, /if \(!eclairsMarteau\.length\) return undefined;[\s\S]*?setEclairsMarteau\(\(current\) => nettoyerFantomes\(current\)\)/,
  'un chien de garde éteint les foudres périmées si la minuterie se perd');
assert.match(page, /setEclairsMarteau\(\[\]\);/, 'quitter le duel éteint les foudres en cours');
assert.match(page, /\{eclairsMarteau\.map\(\(effet\) => \(\s*<EclairDuMarteau\s+key=\{effet\.effectId\}/s,
  'elles sont rendues sur la table');
assert.match(page, /onTermine=\{\(effectId\) => setEclairsMarteau\(\(current\) => current\.filter\(\(autre\) => autre\.effectId !== effectId\)\)\}/,
  'chacune s’éteint à sa dernière image');

// ── 5. Le son : un seul coup de tonnerre, à l’impact ───────────────────────
assert.match(foudreAudio, /export const ECLAIR_DU_MARTEAU_ID = 'eclair-du-marteau';/,
  'la carte du marteau est nommée une seule fois');
assert.match(foudreAudio, /return blessure\?\.sourceCarteId === ECLAIR_DU_MARTEAU_ID;/,
  'la blessure du marteau se reconnaît à ce nom');
assert.match(audio, /'foudre_marteau',/, 'le bruitage est au catalogue');
assert.match(audio, /case 'foudre_marteau':[\s\S]*?noise\(0\.26, 0\.09, 0\.5, \{ filterType: 'highpass'/,
  'le ciel craque à 0,26 s, là où la cinématique frappe');
assert.match(page, /\?\? rpgFoudreSoundFor\(carte, 'spell'\)\s*\n?\s*\?\? rpgWaterSoundFor\(carte, 'spell'\)/,
  'le sort du marteau sonne le tonnerre avant tout bruit d’élément');
assert.match(page, /if \(nom === 'foudre_marteau'\) \{\s*\n\s*const maintenant = Date\.now\(\);\s*\n\s*if \(maintenant - dernierSonFoudreRef\.current < 700\) return;/,
  'un seul coup de tonnerre par geste : l’annonce résolue ne le rejoue pas');

console.log('✓ Éclair du marteau : quand le sort touche une créature, un marteau de guerre sombre s’abat en diagonale sur sa carte pendant que l’éclair descend du ciel jusqu’à lui — flash, onde, dix étincelles, fissures sous la carte — puis rebondit et se dissout sous cinq arcs résiduels, la victime convulsant au même rythme (impact à 28 %) et le tonnerre craquant au même instant : 950 ms sur l’emplacement relevé, sans capter de geste, sans retenir la mort, silencieuse en mouvement réduit, et pour cette carte seule — le journal nomme le coup, la Neige ordinaire ne fait pas tomber le ciel');
