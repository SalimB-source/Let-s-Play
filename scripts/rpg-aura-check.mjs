/**
 * L'aura jaune des créatures qui impriment une aura.
 * node scripts/rpg-aura-check.mjs
 *
 * Même sonar que la résonance — trois ondes qui dépassent le cadre et
 * s'effacent, un liseré qui reste allumé, une phase par entité — mais teinté
 * d'or pour que la source d'un bonus se lise à sa couleur. Le contrôle tient
 * quatre choses : le calque n'apparaît QUE sur la carte qui imprime l'aura
 * (jamais sur une créature qui en profite), c'est exactement le calque de la
 * résonance avec sa variante jaune, il hérite du même débordement et du même
 * mouvement réduit, et il ne capte aucun geste.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';
import { RPG_DUEL_CARDS } from '../src/games/rpgCards.js';

// ── 0. Le rendu réel : une carte aura, un calque jaune ──────────────────────
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-resonance-smoke.jsx', outDir: 'node_modules/.cache/rpg-aura', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const { rendreCartes } = await import('../node_modules/.cache/rpg-aura/rpg-resonance-smoke.js');
const rendu = rendreCartes();

assert.ok(rendu.aura.carte?.aura, 'le Kenshi de la forge imprime une aura');
assert.equal(rendu.auraNeutre.carte?.aura, undefined, 'le Fennec des décombres n’en imprime pas');

const carteDom = (html) => {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  return { dom, racine: dom.window.document.querySelector('.rpg-card') };
};

{
  const { dom, racine } = carteDom(rendu.aura.html);
  try {
    assert.ok(racine.classList.contains('has-aura'),
      'la carte qui imprime une aura porte la classe de l’aura');
    assert.equal(racine.classList.contains('has-resonance'), false,
      'une aura n’est pas une résonance : la classe bleue reste au bleu');
    const calque = racine.querySelector('.rpg-card__resonance--aura');
    assert.ok(calque, 'le calque de sonar est rendu, dans sa variante jaune');
    assert.equal(calque, racine.querySelector('.rpg-card__resonance'),
      'c’est le même calque que la résonance, pas un second effet');
    assert.equal(calque.getAttribute('aria-hidden'), 'true',
      'le calque est décoratif : l’aura est déjà dans l’icône et dans la description lue');
    assert.equal(calque.querySelectorAll('.rpg-card__resonance-onde').length, 3,
      'trois ondes naissent du cœur de la carte');
    assert.match(calque.getAttribute('style') ?? '', /--rpg-resonance-phase:-?\d+\.\d+s/,
      'la phase de l’aura est posée par carte');
    const img = racine.querySelector('.rpg-card__img');
    assert.equal(img.nextElementSibling, calque, 'le calque se glisse juste après l’illustration');
  } finally {
    dom.window.close();
  }
}

{
  const { dom, racine } = carteDom(rendu.auraNeutre.html);
  try {
    assert.equal(racine.classList.contains('has-aura'), false,
      'une créature qui reçoit l’aura ne porte pas le calque de la source');
    assert.equal(racine.querySelector('.rpg-card__resonance'), null,
      'même avec `entite.aura = 2`, aucune onde n’est rendue');
  } finally {
    dom.window.close();
  }
}

// ── 1. Qui la porte : la carte qui imprime l'aura, et elle seule ────────────
const lire = (nom) => readFileSync(new URL(`../src/games/${nom}`, import.meta.url), 'utf8');
const battleCss = lire('rpg-battle.css');
const duel = lire('RpgDuelPage.jsx');

const auras = RPG_DUEL_CARDS.filter((carte) => carte.aura);
assert.ok(auras.length >= 3, 'plusieurs créatures impriment une aura');
for (const carte of auras) {
  assert.ok(['creature', 'hero'].includes(carte.kind),
    `${carte.id} : seules les créatures invoquées portent une aura`);
}
// Les trois familles d'aura du catalogue : forge, Ksour, héros du sable.
for (const id of ['kenshi-de-la-forge', 'amani-des-ksour', 'tarek']) {
  const carte = RPG_DUEL_CARDS.find((c) => c.id === id);
  assert.ok(carte?.aura, `${id} reste une source d’aura`);
}

assert.match(duel, /\{carte\?\.aura \? <AuraOndes variante="aura" phase=\{phaseAura\(entite\)\} \/> : null\}/,
  'le calque jaune se décide sur l’aura imprimée de la carte');
assert.doesNotMatch(duel, /entite\?\.aura \? <AuraOndes/,
  'une créature qui reçoit l’aura ne projette pas le calque de la source');
assert.match(duel, /carte\?\.aura \? 'has-aura' : '',/,
  'la carte porte la classe de l’aura, sur le même verdict');

// ── 2. Le composant : un seul calque, trois teintes ─────────────────────────
const composant = duel.slice(
  duel.indexOf('/** L\'aura de sonar'),
  duel.indexOf("/* ── Soins : l'éclat d'un gain de vie"),
);
assert.match(composant, /variante = 'resonance'/, 'la variante par défaut reste le bleu de la résonance');
assert.match(composant, /rpg-card__resonance--aura/, 'la variante jaune se pose sur le même calque');
assert.equal((duel.match(/function AuraOndes/g) ?? []).length, 1,
  'un seul composant d’ondes pour les deux teintes — pas deux effets à maintenir');
assert.equal((duel.match(/<AuraOndes/g) ?? []).length, 3,
  'la table monte le calque pour la résonance, l’aura et la malédiction, et pour elles seules');

// ── 3. La feuille : le même débordement, une teinte d'or ────────────────────
const debut = battleCss.indexOf('/* ── Résonance : une aura bleue de sonar');
const fin = battleCss.indexOf('/* ── Infiltration : la carte brumeuse');
assert.ok(debut > 0 && fin > debut, 'le bloc du sonar porte les deux variantes');
const resonanceCss = battleCss.slice(debut, fin);

assert.match(resonanceCss, /\.rpg-card:is\(\.has-resonance, \.has-aura, \.has-malediction\)\s*\{[^}]*overflow:\s*clip;[^}]*overflow-clip-margin:\s*58px;/s,
  'les ondes de l’aura débordent du cadre comme celles de la résonance');

const auraCss = resonanceCss.slice(
  resonanceCss.indexOf('.rpg-card__resonance--aura {'),
  resonanceCss.indexOf('.rpg-card__resonance--malediction {'),
);
assert.ok(auraCss.length > 0, 'la feuille déclare la variante jaune');
assert.match(auraCss, /background:\s*radial-gradient\([^;]*rgba\(255, 226, 120,/s,
  'le halo prend une teinte d’or');
assert.match(auraCss, /box-shadow:\s*inset 0 0 16px rgba\(250, 205, 90,/s,
  'le liseré qui reste allumé passe au jaune');
assert.match(auraCss, /\.rpg-card__resonance--aura \.rpg-card__resonance-onde\s*\{[^}]*border-color:\s*rgba\(250, 205, 90,/s,
  'les ondes de l’aura sont dorées');
assert.match(auraCss, /border-color:\s*rgba\(250, 205, 90, \.92\);/,
  'l’anneau de l’onde est le même or que le halo');
// Le bleu de la résonance reste intact : la variante ne fait que surcharger.
assert.match(resonanceCss, /--rpg-resonance-teinte:\s*96,\s*178,\s*255;/,
  'la résonance garde son bleu de sonar');
assert.doesNotMatch(auraCss, /--rpg-resonance-retard|@keyframes/,
  'la variante jaune ne redéclare ni cadence ni images clés : elle hérite du cycle');
assert.doesNotMatch(auraCss, /animation:/,
  'aucune animation propre : les ondes jaunes battent exactement comme les bleues');

// Le mouvement réduit, déclaré une fois, vaut pour les deux teintes.
assert.match(resonanceCss, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.rpg-card__resonance-onde\s*\{\s*animation:\s*none;/,
  'en mouvement réduit, les ondes jaunes se figent comme les bleues');
assert.equal((battleCss.match(/@keyframes rpg-resonance-onde/g) ?? []).length, 1,
  'une seule cadence pour les deux teintes');

// ── 4. La règle : l'Aura ne renforce que les cases voisines ─────────────────
const moteur = lire('rpgDuel.js');
const fiches = [lire('rpgCards.js'), lire('rpgSoleilRouge.js'), lire('rpgTourOubliee.js')].join('\n');
assert.match(moteur, /function casesRangee\(camp\) \{[\s\S]*?rpgEmplacementsChamp\(camp\)/,
  'la rangée lit les cinq cases fixes du mode sans terrains');
assert.match(moteur, /function voisines\(positions, source, cible\) \{[\s\S]*?Math\.abs\(a - b\) === 1/,
  'deux créatures ne sont voisines qu’à une case d’écart');
assert.match(moteur, /function appliquerAurasBuffAutres\(duel\)/,
  'les auras buff-autres sont calculées ensemble (Kenshi et Bou Jeloud)');
assert.match(moteur, /appliquerAurasBuffAutres\(duel\);/,
  'rafraichirAuras appelle le calcul de voisinage');
assert.match(moteur, /sources\.some\(\(source\) => voisines\(positions, source, entite\)\)/,
  'Tarek ne renforce que ses voisines Sable');
assert.match(moteur, /voisines\(positions, source, entite\) \? 1 : 0/,
  'Amani compte ses sources voisines, une par une');
assert.doesNotMatch(moteur, /function appliquerAuraKenshi\(/,
  'l’ancien calcul de camp entier a disparu');
for (const id of ['tarek', 'amani-des-ksour', 'kenshi-de-la-forge', 'bou-jeloud']) {
  assert.match(fiches, new RegExp(`id: '${id}'[\\s\\S]{0,900}?créatures (?:Sable )?adjacentes`),
    `${id} imprime la règle d’adjacence sur sa fiche`);
}
assert.match(lire('effetIcons.js'), /aura: \(\) => 'Tant qu’elle est en jeu, seules les créatures adjacentes/,
  'la définition du mot-clé dit le voisinage');
assert.match(duel, /aura : vos créatures adjacentes gagnent/,
  'la description lue de la table dit elle aussi le voisinage');

console.log('✓ Aura : les cartes qui impriment une aura portent le sonar de la résonance en jaune — même calque, mêmes ondes, même débordement, même mouvement réduit — et ne renforcent plus que les créatures des cases voisines de leur camp');
