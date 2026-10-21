/**
 * L'aura de sonar des créatures à résonance.
 * node scripts/rpg-resonance-check.mjs
 *
 * Une carte qui porte la résonance projette une aura bleue : trois ondes
 * concentriques qui partent du cœur de la face, dépassent le cadre et
 * s'effacent, sur un liseré bleu qui reste allumé. Le contrôle tient quatre
 * choses : le calque n'apparaît QUE sur la source de la résonance (la carte
 * imprimée, jamais la créature qui reçoit le bonus), il est décoratif et ne
 * capte aucun geste, il déborde réellement du cadre — sans rendre la carte
 * transparente —, et il respecte le mouvement réduit.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';
import { RPG_DUEL_CARDS, cardById } from '../src/games/rpgCards.js';

// ── 0. Le rendu réel : une carte, un calque ─────────────────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-resonance-smoke.jsx', outDir: 'node_modules/.cache/rpg-resonance', emptyOutDir: true },
});
// `build()` force NODE_ENV=production dans CE processus : React chargerait sa
// version de production. On restaure la valeur d'origine.
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendreCartes } = await import('../node_modules/.cache/rpg-resonance/rpg-resonance-smoke.js');
const rendu = rendreCartes();
assert.ok(rendu.source.carte?.resonance, 'le Samouraï du torii imprime la résonance');
assert.equal(rendu.neutre.carte?.resonance, undefined, 'le Fennec des décombres ne l’imprime pas');

const carteDom = (html) => {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  return { dom, racine: dom.window.document.querySelector('.rpg-card') };
};

const { dom: domSource, racine: carteSource } = carteDom(rendu.source.html);
try {
  assert.ok(carteSource.classList.contains('has-resonance'),
    'la source de la résonance porte la classe de l’aura');
  const aura = carteSource.querySelector('.rpg-card__resonance');
  assert.ok(aura, 'l’aura est rendue sur la carte');
  assert.equal(aura.getAttribute('aria-hidden'), 'true',
    'le calque est décoratif : l’effet est déjà dans l’icône et dans la description lue');
  assert.equal(aura.querySelectorAll('.rpg-card__resonance-onde').length, 3,
    'trois ondes naissent du cœur de la carte');
  assert.match(aura.getAttribute('style') ?? '', /--rpg-resonance-phase:-?\d+\.\d+s/,
    'la phase de l’aura est posée par carte');
  // Les ondes vivent dans la carte, avant les repères de jeu : elles ne
  // recouvrent ni la pastille de couleur, ni les icônes, ni ATQ/DEF.
  const img = carteSource.querySelector('.rpg-card__img');
  assert.equal(img.nextElementSibling, aura, 'l’aura se glisse juste après l’illustration');
} finally {
  domSource.window.close();
}

const { dom: domNeutre, racine: carteNeutre } = carteDom(rendu.neutre.html);
try {
  assert.equal(carteNeutre.classList.contains('has-resonance'), false,
    'une créature qui reçoit le bonus ne porte pas l’aura de la source');
  assert.equal(carteNeutre.querySelector('.rpg-card__resonance'), null,
    'même avec `entite.resonance = 1`, aucune onde n’est rendue');
} finally {
  domNeutre.window.close();
}

for (const [cle, nom] of [['corbeau', 'la Valkyrie au corbeau'], ['glaces', 'la Valkyrie des glaces']]) {
  const { dom, racine } = carteDom(rendu[cle].html);
  try {
    assert.equal(rendu[cle].carte?.resonance, undefined, `${nom} n’imprime plus de résonance`);
    assert.equal(racine.classList.contains('has-resonance'), false,
      `${nom} ne porte pas la classe de l’aura`);
    assert.equal(racine.querySelector('.rpg-card__resonance'), null,
      `${nom} ne projette aucune onde de sonar`);
  } finally {
    dom.window.close();
  }
}

// ── 1. Qui la porte : la carte imprimée, et elle seule ──────────────────────
const lire = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
const battleCss = lire('rpg-battle.css');
const duel = lire('RpgDuelPage.jsx');

const sources = RPG_DUEL_CARDS.filter((carte) => carte.resonance);
assert.ok(sources.length >= 2, 'plusieurs créatures impriment la résonance');
for (const carte of sources) {
  assert.ok(['creature', 'hero'].includes(carte.kind),
    `${carte.id} : seules les créatures invoquées portent la résonance`);
  assert.ok(carte.resonance > 0, `${carte.id} : la résonance donne au moins +1`);
}
assert.deepEqual(sources.map((carte) => carte.id), [
  'samourai-du-torii',
  'tengu-du-mont-ardent',
  'kagutsuchi-flamme-originelle',
], 'le catalogue ne garde que les trois sources de Résonance samouraï');
assert.equal(cardById('samourai-du-torii').resonance, 1,
  'le Samouraï du torii est une source de résonance');
assert.equal(cardById('valkyrie-au-corbeau').resonance, undefined,
  'la Valkyrie au corbeau n’imprime plus la résonance viking');
assert.equal(cardById('valkyrie-des-glaces').resonance, undefined,
  'la Valkyrie des glaces n’imprime aucune résonance');

// Le rendu lit la carte, jamais `entite.resonance` (le bonus reçu, recalculé
// par le moteur sur chaque créature de la famille).
assert.match(duel, /\{carte\?\.resonance \? <AuraOndes phase=\{phaseAura\(entite\)\} \/> : null\}/,
  'l’aura se décide sur la résonance imprimée de la carte');
assert.doesNotMatch(duel, /entite\?\.resonance \? <AuraOndes/,
  'une créature qui reçoit le bonus ne projette pas l’aura de la source');
assert.match(duel, /carte\?\.resonance \? 'has-resonance' : '',/,
  'la carte porte la classe de l’aura, sur le même verdict');

// ── 2. Le calque : décoratif, trois ondes, une phase par carte ──────────────
const composant = duel.slice(
  duel.indexOf('function AuraOndes'),
  duel.indexOf("/* ── Soins : l'éclat d'un gain de vie"),
);
assert.match(composant, /\{\[1, 2, 3\]\.map\(/, 'trois ondes naissent du cœur de la carte');
assert.match(composant, /rpg-card__resonance-onde--\$\{onde\}/,
  'chaque onde porte sa propre classe de retard');
assert.match(composant, /--rpg-resonance-phase/, 'la phase de l’aura est posée par carte');
assert.doesNotMatch(composant, /<span className="rpg-card__resonance"[\s\S]*?>\s*[A-Za-zÀ-ÿ]/,
  'le calque n’écrit aucun texte : rien à lire, rien à sélectionner');
assert.match(duel, /function empreinteEntite\(entite\)[\s\S]*?empreinte \* 31[\s\S]*?% 9973;/,
  'la phase vient d’une empreinte stable de l’identifiant — pas d’un tirage au rendu');
assert.match(duel, /function phaseAura\(entite\)\s*\{\s*return \(empreinteEntite\(entite\) % 360\) \/ 100;/,
  'l’aura de sonar lit cette empreinte commune, la même que le vol');

// ── 3. La feuille : un débordement assumé, un bleu de sonar ─────────────────
// Le bloc de la résonance, isolé du reste de la feuille (jusqu'à l'infiltration).
const debut = battleCss.indexOf('/* ── Résonance : une aura bleue de sonar');
const fin = battleCss.indexOf('/* ── Infiltration : la carte brumeuse');
assert.ok(debut > 0, 'la feuille porte un bloc consacré à la résonance');
assert.ok(fin > debut, 'le bloc de la résonance précède celui de l’infiltration, sans le recouvrir');
const resonanceCss = battleCss.slice(debut, fin);

assert.match(resonanceCss, /\.rpg-card:is\(\.has-resonance, \.has-aura\)\s*\{[^}]*overflow:\s*clip;[^}]*overflow-clip-margin:\s*58px;/s,
  'les ondes sortent du cadre, sans rendre la carte transparente (résonance comme aura)');
assert.match(resonanceCss, /\.rpg-card:is\(\.has-resonance, \.has-aura\) > :is\(\.rpg-card__img, \.rpg-card__blood, \.rpg-card__frost\)\s*\{[^}]*border-radius:\s*inherit;/s,
  'une fois le débordement ouvert, les calques pleine face gardent l’arrondi');
assert.match(resonanceCss, /\.rpg-card:is\(\.has-resonance, \.has-aura\) \.rpg-card__img\s*\{[^}]*animation:\s*none !important;/s,
  'le survol ne fait plus déborder l’illustration agrandie');
assert.match(resonanceCss, /\.rpg-card__resonance\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0;[^}]*z-index:\s*1;[^}]*pointer-events:\s*none;/s,
  'le calque couvre la face, passe sous les repères de jeu et ne capte aucun geste');
assert.match(resonanceCss, /--rpg-resonance-teinte:\s*96,\s*178,\s*255;/,
  'la teinte est le bleu du sonar, déclarée une fois');
assert.match(resonanceCss, /\.rpg-card__resonance-onde\s*\{[^}]*border-radius:\s*50%;[^}]*animation:\s*rpg-resonance-onde 3\.6s/s,
  'les ondes sont des anneaux qui pulsent sur un cycle de 3,6 s');
assert.match(resonanceCss, /animation-delay:\s*calc\(var\(--rpg-resonance-phase, 0s\) \+ var\(--rpg-resonance-retard, 0s\)\);/,
  'le retard propre à chaque carte s’ajoute au décalage de l’onde');
assert.match(resonanceCss, /--rpg-resonance-retard:\s*-1\.2s;[^}]*\}\s*\.rpg-card__resonance-onde--3\s*\{\s*--rpg-resonance-retard:\s*-2\.4s;/s,
  'les trois ondes se relaient à un tiers de cycle');
assert.match(resonanceCss, /@keyframes rpg-resonance-onde\s*\{[\s\S]*?transform:\s*scale\(\.6\);[\s\S]*?transform:\s*scale\(1\.42\);[\s\S]*?\}/,
  'les ondes grandissent du cœur jusqu’au-delà du cadre');
assert.equal((battleCss.match(/@keyframes rpg-resonance-onde/g) ?? []).length, 1,
  'la table ne déclare qu’un seul cycle d’ondes');
// Le mouvement ne passe que par `transform` et `opacity` : rien qui repeigne.
const imagesCles = resonanceCss.slice(resonanceCss.indexOf('@keyframes rpg-resonance-onde'));
assert.doesNotMatch(imagesCles.slice(0, imagesCles.indexOf('}')), /(top|left|width|height|filter|box-shadow):/,
  'les ondes n’animent que `transform` et `opacity` (pas de repeint de la table)');
assert.match(resonanceCss, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.rpg-card__resonance-onde\s*\{\s*animation:\s*none;/,
  'en mouvement réduit, les ondes se figent');
assert.match(resonanceCss, /\.rpg-card__resonance-onde--1\s*\{\s*opacity:\s*\.42;\s*transform:\s*scale\(\.78\);/,
  'le mouvement réduit garde trois couronnes immobiles, lisibles');
assert.doesNotMatch(resonanceCss, /@media[^{]*max-width/,
  'aucune requête de largeur : l’aura vaut pour tous les écrans');

console.log('✓ Résonance : une aura bleue de sonar — trois ondes qui dépassent le cadre et s’effacent, un liseré bleu qui reste — émane de la carte qui imprime la résonance, jamais de celle qui reçoit le bonus ; elle ne capte aucun geste, ne fait pas déborder l’illustration au survol et se fige en trois couronnes en mouvement réduit');
