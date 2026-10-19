/**
 * Le vol des créatures avec Envol.
 * node scripts/rpg-envol-check.mjs
 *
 * Une créature qui possède Envol — imprimé sur sa carte ou donnée par une arme
 * — lévite au-dessus de la table : la carte monte et descend, avance et recule
 * d'un souffle, grossit d'un pour cent au sommet et s'incline d'un demi-degré,
 * tandis qu'un souffle de lumière traverse lentement la face. Le contrôle
 * tient que ce vol reste possible : il n'utilise que des propriétés
 * indépendantes de `transform` (donc l'inclinaison, le survol et les
 * cinématiques de combat survivent), il ne remue pas la rangée, il est
 * désynchronisé par entité, et il se tait en mouvement réduit.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// ── 0. Le rendu réel ────────────────────────────────────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-envol-smoke.jsx', outDir: 'node_modules/.cache/rpg-envol', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendreCartesEnvol } = await import('../node_modules/.cache/rpg-envol/rpg-envol-smoke.js');
const rendu = rendreCartesEnvol();

const carteDom = (html) => {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  return { dom, racine: dom.window.document.querySelector('.rpg-card') };
};

const phases = [];
const durees = [];
for (const [nom, cas] of [['envol', rendu.envol], ['parArme', rendu.parArme]]) {
  const { dom, racine } = carteDom(cas.html);
  try {
    assert.ok(racine.classList.contains('is-envol'), `${nom} : la carte reçoit l’état visuel de l’Envol`);
    const calque = racine.querySelector('.rpg-card__envol');
    assert.ok(calque, `${nom} : le calque du souffle est rendu`);
    assert.equal(calque.getAttribute('aria-hidden'), 'true',
      `${nom} : le souffle est décoratif, rien à lire ni à sélectionner`);
    assert.ok(calque.querySelector('.rpg-card__envol-souffle'),
      `${nom} : le souffle lui-même est dans le calque`);
    const phase = calque.getAttribute('style') ?? '';
    assert.match(phase, /--rpg-envol-phase:-?\d+\.\d+s/, `${nom} : la phase est posée par carte`);
    phases.push(phase);
    // La lévitation, elle, reçoit sa DURÉE sur la carte : deux voisines ne
    // battent jamais à l'unisson, sans décalage de départ (donc sans saut).
    const styleCarte = racine.getAttribute('style') ?? '';
    const duree = Number(/--rpg-envol-duree:(\d+\.\d+)s/.exec(styleCarte)?.[1]);
    assert.ok(duree >= 6.8 && duree <= 7.6,
      `${nom} : la durée de lévitation tient entre 6,8 et 7,6 s (reçu ${duree})`);
    durees.push(duree);
    // Le souffle passe sous les repères : il est monté avant le titre et les
    // statistiques (donc avant les icônes et les valeurs ATQ/DEF).
    const enfants = [...racine.children];
    assert.ok(enfants.indexOf(calque) < enfants.indexOf(racine.querySelector('.rpg-card__title')),
      `${nom} : le souffle se peint sous le titre de la carte`);
    assert.ok(enfants.indexOf(calque) < enfants.indexOf(racine.querySelector('.rpg-card__foot')),
      `${nom} : et sous les statistiques`);
  } finally {
    dom.window.close();
  }
}

const { dom: domNeutre, racine: carteNeutre } = carteDom(rendu.neutre.html);
try {
  assert.equal(carteNeutre.classList.contains('is-envol'), false,
    'une créature sans Envol ne reçoit pas l’état de vol');
  assert.equal(carteNeutre.querySelector('.rpg-card__envol'), null,
    'sans Envol, aucun calque de souffle');
} finally {
  domNeutre.window.close();
}

// Deux voisines ne lévitent pas à l'unisson.
const phaseDe = (html) => /--rpg-envol-phase:(-?\d+\.\d+)s/.exec(html)?.[1];
assert.notEqual(phaseDe(rendu.envol.html), phaseDe(rendu.envolVoisine.html),
  'deux créatures avec Envol ont des phases différentes : elles ne montent jamais ensemble');
assert.equal(phaseDe(rendu.envol.html), phaseDe(rendreCartesEnvol().envol.html),
  'la même entité garde toujours sa phase — pas de tirage au rendu');
const dureeDe = (html) => Number(/--rpg-envol-duree:(\d+\.\d+)s/.exec(html)?.[1]);
assert.notEqual(dureeDe(rendu.envol.html), dureeDe(rendu.envolVoisine.html),
  'et des durées différentes : deux lévitations voisines se décalent d’elles-mêmes');
assert.equal(dureeDe(rendu.envol.html), dureeDe(rendreCartesEnvol().envol.html),
  'la durée est stable pour une même entité');

// ── 1. Le source : une lévitation CSS, pas une animation d'API ─────────────
// C'est la règle qui répare le masquage : une animation Web Animations passe
// devant toutes les animations CSS du même élément. L'arrivée en jeu, le bond
// d'attaque et le choc de blocage animent `translate`/`scale` ; une
// lévitation jouée par l'API les effaçait. Elle est donc en CSS.
const lire = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
const duel = lire('RpgDuelPage.jsx');
const battleCss = lire('rpg-battle.css');

assert.doesNotMatch(duel, /element\.animate\(\s*VOL_ENVOL/,
  'la lévitation n’est plus jouée par Web Animations');
assert.doesNotMatch(duel, /const VOL_ENVOL/,
  'le catalogue d’images du vol a disparu : le mouvement vit dans la feuille');
assert.doesNotMatch(duel, /iterations: Infinity,/,
  'aucune boucle sans fin ne passe plus par l’API');
assert.match(duel, /const dureeVol = \(entite\) => \(6\.8 \+ phaseVol\(entite\) \* 0\.8\)\.toFixed\(2\);/,
  'chaque créature tire sa durée de l’empreinte de son identifiant (6,8 → 7,6 s)');
assert.match(duel, /'--rpg-envol-duree': `\$\{dureeVol\(entite\)\}s`/,
  'la durée part sur la carte en variable CSS');
assert.match(duel, /const phaseVol = \(entite\) => \(empreinteEntite\(entite\) % 1000\) \/ 1000;/,
  'la phase du souffle vient toujours de cette empreinte stable');
assert.match(duel, /entite\.envol \? 'is-envol' : '',/,
  'la carte porte la classe qui lévite');

// ── 2. La feuille : lévitation, et cinématiques qui la remplacent ──────────
const debutCss = battleCss.indexOf('/* ── Envol : la créature lévite au-dessus de la table');
const finCss = battleCss.indexOf("/* Sous la souris, l'illustration des créatures respire");
assert.ok(debutCss > 0, 'la feuille porte un bloc consacré à l’Envol');
assert.ok(finCss > debutCss, 'le bloc de l’Envol précède les états de survol');
const envolCss = battleCss.slice(debutCss, finCss);

assert.match(envolCss, /\.rpg-card\.is-envol\s*\{[^}]*z-index:\s*2;[^}]*translate:\s*0 -6px;[^}]*rotate:\s*-0\.5deg;[^}]*scale:\s*1;[^}]*animation:\s*rpg-envol-levite var\(--rpg-envol-duree, 7\.2s\) ease-in-out infinite;/s,
  'au repos la carte est levée et inclinée, et la lévitation est une animation CSS');
assert.match(envolCss, /\.rpg-card\.is-envol\s*\{[^}]*drop-shadow\(0 17px 11px rgba\(0, 0, 0, \.42\)\)/s,
  'son ombre s’éloigne : la hauteur se lit même immobile');
assert.match(envolCss, /@keyframes rpg-envol-levite\s*\{\s*0%, 100% \{ translate: 0 -6px; rotate: -0\.5deg; scale: 1; \}/,
  'le cycle se referme sur le repos : une reprise après une cinématique ne saute pas');
assert.match(envolCss, /50% \{ translate: 0\.4px -12\.5px; rotate: 0\.55deg; scale: 1\.012; \}/,
  'la carte monte, dérive, grossit d’un pour cent et s’incline au sommet');
const imagesCles = envolCss.slice(envolCss.indexOf('@keyframes rpg-envol-levite'));
assert.doesNotMatch(imagesCles.slice(0, imagesCles.indexOf('}')), /(top|left|width|height|transform|filter):/,
  'la lévitation n’anime que translate, rotate et scale — pas la mise en page ni transform');
assert.equal((battleCss.match(/@keyframes rpg-envol-levite/g) ?? []).length, 1,
  'un seul cycle de lévitation dans la feuille');

// ── 2 bis. L'arrivée, le bond, le blocage, le coup : déclarés APRÈS ─────────
// Une seule propriété `animation` par élément : la règle qui doit jouer est la
// plus spécifique, puis la plus basse dans la feuille. Toutes ces
// cinématiques doivent donc venir après `.rpg-card.is-envol`, avec au moins
// deux classes pour l'emporter.
const positionEnvol = battleCss.indexOf('.rpg-card.is-envol {');
assert.ok(positionEnvol > 0);
const cinematiques = {
  'l’arrivée en jeu': /\.rpg-card\.fx-enter\s*\{\s*animation:\s*rpg-card-arrive/,
  'le bond d’attaque': /\.rpg-card--equipe\.fx-lunge\s*\{\s*animation:\s*card-lunge-team/,
  'le bond adverse': /\.rpg-card--ennemi\.fx-lunge\s*\{\s*animation:\s*card-lunge-foe/,
  'le choc de blocage': /\.rpg-card\.fx-block,\s*\.rpg-card\.fx-unblock\s*\{\s*animation:\s*rpg-block-impact/,
  'le coup encaissé': /\.rpg-card\.fx-hit\s*\{\s*animation:\s*rpg-hit/,
  'la lueur dorée': /\.rpg-card\.fx-glow\s*\{\s*animation:\s*rpg-glow/,
};
for (const [nom, motif] of Object.entries(cinematiques)) {
  const correspondance = motif.exec(battleCss);
  assert.ok(correspondance, `${nom} : la règle existe et remplace l’animation de la carte`);
  assert.ok(correspondance.index > positionEnvol,
    `${nom} : déclarée après la lévitation, elle la remplace le temps de son geste`);
}
assert.match(battleCss, /@keyframes rpg-card-arrive\s*\{\s*0% \{ opacity: 0; translate: 0 24px; scale: \.82;/,
  'l’arrivée monte, grossit et s’éclaire : elle anime bien translate et scale');
assert.match(battleCss, /@keyframes card-lunge-team \{ 40% \{ translate: 0 -52px; \} \}/,
  'le bond d’attaque anime translate');

// ── 2 ter. Rien ne coupe les animations de la carte ────────────────────────
// L'expérimentation « plus aucun cadre » retirait l'anneau ET, avec
// `animation: none !important`, toutes les animations de la carte : arrivée,
// bond, choc et lévitation. Elle ne doit plus toucher à `animation`.
const blocCadres = battleCss.slice(battleCss.indexOf('EXPÉRIMENTATION — PLUS AUCUN CADRE'));
assert.match(blocCadres, /border-width:\s*0 !important;/, 'l’expérimentation « plus aucun cadre » est toujours là');
assert.match(blocCadres, /background-image:\s*none !important;/, 'elle retire bien la peinture de l’anneau');
assert.doesNotMatch(blocCadres.slice(0, blocCadres.indexOf('/* La teinte de matière')),
  /animation:\s*none !important;/,
  'mais elle ne coupe plus les animations des cartes : la lévitation et les cinématiques vivent');
// Le reflet des cadres brillants, déclaré plus bas que les cinématiques, volait
// leur propriété `animation` aux cartes brillantes et mythiques.
assert.doesNotMatch(battleCss, /\.rpg-card\.rpg-card--frame-brillant,/,
  'le reflet du cadre ne prend plus l’animation de la carte du duel');
assert.ok(battleCss.indexOf('.rpg-card.fx-enter {') > battleCss.indexOf('.rpg-card.is-envol {'),
  'les cinématiques restent déclarées après la lévitation');

// Le souffle et le silence en mouvement réduit.
assert.match(envolCss, /\.rpg-card__envol-souffle\s*\{[^}]*animation:\s*rpg-envol-souffle 6\.5s ease-in-out var\(--rpg-envol-phase, 0s\) infinite;/s,
  'le souffle traverse la face sur son propre cycle, décalé par carte');
assert.match(envolCss, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.rpg-card\.is-envol\s*\{\s*animation:\s*none;\s*\}/,
  'en mouvement réduit, la carte reste levée mais immobile');
assert.match(envolCss, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.rpg-card__envol-souffle\s*\{\s*animation:\s*none;\s*display:\s*none;/,
  'et le souffle disparaît');
assert.doesNotMatch(envolCss, /@media[^{]*max-width/,
  'aucune requête de largeur : le vol vaut pour tous les écrans');

// ── 3. Le vol de la carte jouée : de la main jusqu'à sa destination ─────────
const volDebut = battleCss.indexOf("/* Le vol d'une carte jouée, en trois temps.");
const volFin = battleCss.indexOf('/* Sur téléphone, le tremblement de toute la table');
assert.ok(volDebut > 0, 'la feuille décrit le vol de la carte jouée');
assert.ok(volFin > volDebut, 'son bloc précède celui du tremblement de table');
const volCss = battleCss.slice(volDebut, volFin);
assert.match(volCss, /calc\(var\(--rpg-flight-dy\) \* \.46 - 34px\)/,
  'la trajectoire bombe vers le haut : la carte passe au-dessus de la table');
assert.match(volCss, /filter: brightness\(1\.14\) drop-shadow\(0 18px 16px rgba\(0, 0, 0, \.5\)\);/,
  'au sommet du vol, l’ombre s’éloigne : la carte est haute');
assert.match(volCss, /100%\s*\{[^}]*translate3d\(var\(--rpg-flight-dx\), var\(--rpg-flight-dy\), 0\)/s,
  'la pose se cale exactement sur la destination');
assert.match(battleCss, /\.rpg-card-flight\.is-flying\s*\{\s*animation:\s*rpg-card-flight-to-table \.68s/,
  'la durée du vol ne change pas : le moteur libère la carte sur ce métronome');

console.log('✓ Envol : la créature lévite en CSS (translate, rotate, scale — 6,8 à 7,6 s selon l’entité) sans jamais masquer l’arrivée en jeu, le bond d’attaque, le blocage ou le coup : ces cinématiques remplacent l’animation le temps de leur geste et la lévitation reprend sur son repos, sans saut ; le souffle traverse la face, et tout se tait en mouvement réduit ; la carte jouée décolle, bombe et se pose en 0,68 s');
