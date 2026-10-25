/**
 * La foudre de l'Éclair du marteau sur une créature touchée.
 * node scripts/rpg-eclair-marteau-check.mjs
 *
 * Quand l'Éclair du marteau ou les 3 dégâts d'arrivée du Maître touchent une
 * créature, le ciel se fend au-dessus d'elle : seul l'éclair tombe — trait
 * principal, décharge, flash, onde,
 * étincelles et fissures — puis des arcs résiduels rampent sur les bords,
 * et la créature encaisse la secousse (`fx-foudre`) au même rythme. Comme
 * la roue de feu, le calque se pose sur l'emplacement mesuré avant l'action,
 * ne capte rien et ne retient pas la
 * mort : la créature tuée reçoit son adieu pendant que la foudre finit de
 * tomber là où elle se tenait. Seules ces deux cartes allument l'effet : le
 * journal des blessures nomme la carte du coup, la couleur Neige ne suffit pas.
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
    'il frappe au point d’impact de la créature');
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

  // Aucun marteau dessiné : seuls les traits de foudre occupent le ciel.
  assert.equal(ciel.querySelector('g'), null,
    'aucun groupe SVG ne porte un marteau');
  for (const selecteur of [
    '.rpg-eclair-marteau__marteau',
    '.rpg-eclair-marteau__tete',
    '.rpg-eclair-marteau__manche',
    '.rpg-eclair-marteau__anneau',
    '.rpg-eclair-marteau__pommeau',
    '.rpg-eclair-marteau__joue',
    '.rpg-eclair-marteau__plaque',
    '.rpg-eclair-marteau__rune',
    '.rpg-eclair-marteau__arc-mini',
  ]) {
    assert.equal(ciel.querySelector(selecteur), null, `${selecteur} a disparu de l’animation`);
  }

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

// ── 2. La feuille : un éclair, un impact, des arcs qui s’éteignent ─────────
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
for (const motif of [
  /\.rpg-eclair-marteau__marteau\b/,
  /\.rpg-eclair-marteau__manche\b/,
  /\.rpg-eclair-marteau__anneau\b/,
  /\.rpg-eclair-marteau__pommeau\b/,
  /\.rpg-eclair-marteau__joue\b/,
  /\.rpg-eclair-marteau__tete\b/,
  /\.rpg-eclair-marteau__plaque\b/,
  /\.rpg-eclair-marteau__rune\b/,
  /\.rpg-eclair-marteau__arc-mini\b/,
  /@keyframes rpg-eclair-marteau-chute\b/,
  /@keyframes rpg-eclair-marteau-rune\b/,
]) {
  assert.doesNotMatch(css, motif, `${motif} ne doit plus animer ni dessiner de marteau`);
}
assert.doesNotMatch(page, /rpg-eclair-marteau__(?:marteau|manche|anneau|pommeau|joue|tete|plaque|rune|arc-mini)\b/,
  'le rendu ne contient plus aucune pièce du marteau');
const frappe = /@keyframes rpg-eclair-marteau-frappe\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
assert.match(frappe, /0%, 24% \{ opacity: 0; \}/,
  'l’éclair attend l’instant synchronisé de l’impact : pas de foudre avant le coup');
assert.match(frappe, /27% \{ opacity: 1; \}/, 'il frappe à l’instant de l’impact');
assert.match(css, /\.rpg-eclair-marteau__etincelle\s*\{[^}]*animation:\s*rpg-eclair-marteau-etincelle \.55s[^}]*animation-delay:\s*var\(--d, 0ms\);/s,
  'les étincelles jaillissent avec leur retard');
const etincelle = /@keyframes rpg-eclair-marteau-etincelle\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
assert.match(etincelle, /\+ 26px\)/, 'elles retombent un peu avant de s’éteindre');

// La secousse de la victime : immobile avant la frappe, l’impact à 28 %,
// puis des sursauts qui s’amortissent.
assert.match(css, /\.rpg-card\.fx-foudre \{ animation: rpg-foudre-secousse \.95s linear both; \}/,
  'la créature touchée a sa propre cinématique, aussi longue que le calque');
const secousse = /@keyframes rpg-foudre-secousse\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
assert.match(secousse, /0%, 27% \{[^}]*filter: none; \}/,
  'la carte ne bouge pas avant que l’éclair ne frappe');
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
assert.match(engine, /rpgBlesserCreature\(duel, campCible, cible\.id, effet\.amount \?\? 0, sourceElement, null, sourceType, sourceCarteId\);/,
  'un effet de dégâts passe sa carte à la blessure qu’il inflige');
assert.match(engine, /appliquer\(duel, cote, effetArriveePourCible\(carte, cibleArrivee\), cibleArrivee,\s*entite\.id, cardColors\(carte\), 'capacite', carte\.id\);/,
  'les 3 dégâts d’arrivée du Maître nomment eux aussi leur carte');

// ── 4. La table : la foudre s’allume sur la créature touchée ───────────────
assert.match(page, /const DUREE_ECLAIR_MARTEAU = 950;/, 'la foudre dure 950 ms');
assert.match(page, /import \{ blessureDuMarteau, MAITRE_DU_MARTEAU_ID, rpgFoudreSoundFor \} from '\.\/rpgFoudreAudio\.js';/,
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

// ── 5. Le son : un même sample pour le sort et l'arrivée ───────────────────
assert.match(foudreAudio, /export const ECLAIR_DU_MARTEAU_ID = 'eclair-du-marteau';/,
  'le sort du marteau est nommé une seule fois');
assert.match(foudreAudio, /export const MAITRE_DU_MARTEAU_ID = 'maitre-du-marteau';/,
  'le Maître partage le même registre de sources');
assert.match(foudreAudio, /const CARTES_FOUDRE_MARTEAU = new Set\(\[ECLAIR_DU_MARTEAU_ID, MAITRE_DU_MARTEAU_ID\]\);/,
  'les deux cartes — et elles seules — sont reconnues pour la foudre visuelle');
assert.match(foudreAudio, /return CARTES_FOUDRE_MARTEAU\.has\(blessure\?\.sourceCarteId\);/,
  'la blessure du marteau se reconnaît à sa carte, pas à sa couleur');
assert.match(foudreAudio, /card\.id === ECLAIR_DU_MARTEAU_ID && action === 'spell'\) return RPG_FOUDRE_MARTEAU_SFX;/,
  'Éclair du marteau déclenche le sample au lancement du sort');
assert.match(foudreAudio, /card\.id === MAITRE_DU_MARTEAU_ID && action === 'arrival'\) return RPG_FOUDRE_MARTEAU_SFX;/,
  'le Maître déclenche le même sample à son arrivée');
assert.match(audio, /export const RPG_FOUDRE_MARTEAU_SFX = 'foudre_marteau';/,
  'le catalogue nomme le bruitage de tonnerre');
assert.match(audio, /thunder-spark-transition-full\.mp3/,
  'le lecteur charge le sample Thunder Spark fourni');
assert.match(audio, /\[RPG_FOUDRE_MARTEAU_SFX\]: \[\{ kind: 'sample', at: 0, dur: 3\.422, g: 1 \}\]/,
  'le tonnerre est un échantillon de 3,422 secondes, pas une synthèse');
assert.match(page, /\?\? rpgFoudreSoundFor\(carte, 'spell'\)\s*\n?\s*\?\? rpgWaterSoundFor\(carte, 'spell'\)/,
  'la page route le sort avant les sons communs');
assert.match(page, /const sonFoudre = rpgFoudreSoundFor\(carte, 'arrival'\)/,
  'la pose locale du Maître joue le son d’arrivée');
assert.match(page, /rpgFoudreSoundFor\(carteAnnoncee, 'arrival'\)/,
  'la résolution d’une annonce adverse du Maître joue le son d’arrivée');
assert.match(page, /rpgFoudreSoundFor\(MAITRE_DU_MARTEAU_ID, 'arrival'\)/,
  'les retours du Maître par Tenacité rejouent le son d’arrivée');
assert.match(page, /rpgFoudreSoundFor\(cardById\(entite\.carteId\), 'arrival'\)/,
  'un instantané PvP joue aussi le son du Maître adverse');
assert.match(page, /if \(nom === 'foudre_marteau'\) \{\s*\n\s*const maintenant = Date\.now\(\);\s*\n\s*if \(maintenant - dernierSonFoudreRef\.current < 700\) return;/,
  'un garde évite de doubler le tonnerre sur un même geste');

console.log('✓ Foudre des marteaux : quand le sort ou les 3 dégâts d’arrivée du Maître touchent une créature, seul l’éclair descend du ciel jusqu’à son point d’impact — flash, onde, dix étincelles, fissures sous la carte — puis cinq arcs résiduels s’éteignent, la victime convulsant au même rythme (impact à 28 %) : 950 ms sur l’emplacement relevé, sans aucun marteau dessiné, sans capter de geste, sans retenir la mort, immobile quand les animations sont réduites, et pour ces deux cartes seules — le journal nomme le coup, la Neige ordinaire ne fait pas tomber le ciel');
