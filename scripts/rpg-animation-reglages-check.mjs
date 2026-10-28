/**
 * Réglages d'animation de la table (item 10 de la vertical slice) :
 *   - rpg-anim-vitesse : ×0,5 / ×1 / ×2, porté par la variable --rpg-anim-scale
 *     sur les durées ET les délais, et par dureeAnimation() sur les minuteurs JS ;
 *   - rpg-anim-reduite : une case qui force le mode réduit sans dépendre de
 *     prefers-reduced-motion, via la classe .is-reduced (fondu de 120 ms, état
 *     final immédiat). Les sons restent joués : le CSS ne touche pas l'audio.
 *
 * node scripts/rpg-animation-reglages-check.mjs
 *
 * Le module src/games/rpgAnimations.js est pur : on l'importe et on le teste
 * avec un `window` factice (localStorage mémoire + matchMedia contrôlable). Le
 * reste est vérifié par lecture statique de la page, de la feuille et du moteur,
 * qui ne doit contenir aucun déclencheur visuel.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  RPG_VITESSES_ANIMATION,
  readRpgReducedPref,
  writeRpgReducedPref,
  readRpgVitessePref,
  writeRpgVitessePref,
  systemeMotionReduite,
  rpgAnimationsReduites,
  dureeAnimation,
} from '../src/games/rpgAnimations.js';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const cssMana = readFileSync(new URL('../src/games/rpg-mana-essai.css', import.meta.url), 'utf8');
const engine = readFileSync(new URL('../src/games/rpgDuel.js', import.meta.url), 'utf8');
const moduleSource = readFileSync(new URL('../src/games/rpgAnimations.js', import.meta.url), 'utf8');

// ── 1. Le module pur : les trois vitesses et les clés persistées ───────────
assert.deepEqual(
  RPG_VITESSES_ANIMATION.map((v) => [v.id, v.facteur]),
  [['lente', 0.5], ['normale', 1], ['rapide', 2]],
  'les trois vitesses sont ×0,5, ×1 et ×2, dans cet ordre',
);
assert.ok(Object.isFrozen(RPG_VITESSES_ANIMATION) && RPG_VITESSES_ANIMATION.every((v) => Object.isFrozen(v)),
  'le catalogue de vitesses est immuable');
assert.match(moduleSource, /letsplay_sablier_anim_reduite_v1/, 'clé localStorage du mode réduit forcé');
assert.match(moduleSource, /letsplay_sablier_anim_vitesse_v1/, 'clé localStorage de la vitesse');
assert.match(moduleSource, /function stockage\(\)[\s\S]*?catch\s*\{[\s\S]*?return null;/,
  'l’accès au stockage est tolérant (navigation privée, iframe restrictive)');

// Un `window` factice, le temps des tests du module.
function stockageMemoire() {
  const map = new Map();
  return {
    getItem: (cle) => (map.has(cle) ? map.get(cle) : null),
    setItem: (cle, valeur) => { map.set(cle, String(valeur)); },
    _map: map,
  };
}
function installerWindow({ stock, reduitSysteme = false }) {
  globalThis.window = {
    localStorage: stock,
    matchMedia: () => ({ matches: reduitSysteme }),
  };
}
const CLE_VITESSE = 'letsplay_sablier_anim_vitesse_v1';
const CLE_REDUITE = 'letsplay_sablier_anim_reduite_v1';

try {
  // ── 2. Vitesse : lecture, écriture, valeur illisible ramenée à ×1 ─────────
  let stock = stockageMemoire();
  installerWindow({ stock });
  assert.equal(readRpgVitessePref(), 1, 'pas de préférence stockée : vitesse normale ×1');
  writeRpgVitessePref(0.5);
  assert.equal(stock._map.get(CLE_VITESSE), '0.5', 'la préférence lente est persistée en chaîne');
  assert.equal(readRpgVitessePref(), 0.5, 'elle est relue telle quelle');
  writeRpgVitessePref(2);
  assert.equal(readRpgVitessePref(), 2, 'la vitesse rapide ×2 est relue');
  writeRpgVitessePref(3);
  assert.equal(readRpgVitessePref(), 1, 'une écriture hors catalogue est normalisée à ×1');
  stock._map.set(CLE_VITESSE, 'abc');
  assert.equal(readRpgVitessePref(), 1, 'une valeur illisible retombe sur ×1, sans planter');
  stock._map.set(CLE_VITESSE, '');
  assert.equal(readRpgVitessePref(), 1, 'une valeur vide retombe sur ×1');

  // dureeAnimation suit le facteur et ne descend jamais sous 16 ms.
  stock._map.set(CLE_VITESSE, '1');
  assert.equal(dureeAnimation(900), 900, 'à ×1, la durée nominale est inchangée');
  stock._map.set(CLE_VITESSE, '0.5');
  assert.equal(dureeAnimation(900), 450, 'à ×0,5, le geste dure deux fois moins longtemps');
  assert.equal(dureeAnimation(10), 16, 'le plancher de 16 ms empêche un minuteur nul');
  stock._map.set(CLE_VITESSE, '2');
  assert.equal(dureeAnimation(900), 1800, 'à ×2, le geste dure deux fois plus longtemps');

  // ── 3. Mode réduit forcé : préférence joueur OU préférence système ────────
  stock = stockageMemoire();
  installerWindow({ stock, reduitSysteme: false });
  assert.equal(readRpgReducedPref(), false, 'par défaut, le mode réduit forcé est éteint');
  writeRpgReducedPref(true);
  assert.equal(stock._map.get(CLE_REDUITE), 'on', 'le mode réduit forcé est persisté');
  assert.equal(readRpgReducedPref(), true, 'et relu comme actif');
  writeRpgReducedPref(false);
  assert.equal(stock._map.get(CLE_REDUITE), 'off', 'on le désactive explicitement');
  assert.equal(rpgAnimationsReduites(), false, 'ni forcé ni système : animations complètes');
  assert.equal(rpgAnimationsReduites(true), true, 'le réglage joueur force le mode réduit');
  installerWindow({ stock, reduitSysteme: true });
  assert.equal(systemeMotionReduite(), true, 'la préférence système reduce est détectée');
  assert.equal(rpgAnimationsReduites(false), true, 'le système suffit, même sans forçage joueur');

  // ── 4. Stockage indisponible : aucun crash, valeurs de repli ──────────────
  globalThis.window = {
    get localStorage() { throw new Error('localStorage interdit'); },
    matchMedia: () => ({ matches: false }),
  };
  assert.doesNotThrow(() => readRpgVitessePref(), 'la lecture de vitesse ne plante pas');
  assert.equal(readRpgVitessePref(), 1, 'repli ×1 sans stockage');
  assert.equal(readRpgReducedPref(), false, 'repli « non forcé » sans stockage');
  assert.equal(rpgAnimationsReduites(), false, 'pas de réduction par défaut sans stockage');
  assert.doesNotThrow(() => { writeRpgVitessePref(2); writeRpgReducedPref(true); },
    'les écritures en échec sont avalées, le réglage vit la session');
} finally {
  delete globalThis.window;
}

// ── 5. La page branche le module : état, réglages, coquille et table ───────
assert.match(page, /from '\.\/rpgAnimations\.js';/, 'la page importe le module de réglages');
for (const nom of ['RPG_VITESSES_ANIMATION', 'rpgAnimationsReduites', 'dureeAnimation',
  'readRpgReducedPref', 'readRpgVitessePref', 'writeRpgReducedPref', 'writeRpgVitessePref']) {
  assert.match(page, new RegExp(`\\b${nom}\\b`), `la page utilise ${nom}`);
}
assert.match(page, /function animationsReduites\(\) \{\s*return rpgAnimationsReduites\(\);\s*\}/,
  'la fonction historique animationsReduites() délègue au module');
assert.match(page, /useState\(readRpgReducedPref\)/, 'l’état du mode réduit s’initialise depuis la préférence');
assert.match(page, /useState\(readRpgVitessePref\)/, 'l’état de vitesse s’initialise depuis la préférence');
assert.match(page, /writeRpgReducedPref\(suivant\)/, 'basculer le mode réduit persiste le choix');
assert.match(page, /writeRpgVitessePref\(facteur\)/, 'choisir une vitesse persiste le choix');

// La carte de réglages : une case aria-pressed et une commande segmentée.
assert.match(page, /rpg-settings__toggle rpg-settings__reduced\$\{animReduite \? ' is-on' : ''\}[\s\S]*?aria-pressed=\{Boolean\(animReduite\)\}/,
  'le mode réduit est une case à bascule accessible');
assert.match(page, /<div className="rpg-settings__speed" role="group"[\s\S]*?vitessesAnimation\.map\(\(vitesse\) => \([\s\S]*?rpg-settings__segment-btn\$\{vitesse\.facteur === vitesseAnimation \? ' is-active' : ''\}[\s\S]*?onChoisirVitesseAnimation\?\.\(vitesse\.facteur\)/,
  'la vitesse se choisit par boutons segmentés ×0,5 / ×1 / ×2, sans libellés codés en dur');

// La coquille .rpg-battle porte la classe et la variable ; la table, les attributs.
assert.match(page, /rpg-battle\$\{[\s\S]*?\}\$\{rpgAnimationsReduites\(animReduite\) \? ' is-reduced' : ''\}['`]/,
  'la coquille reçoit is-reduced dès que le mode réduit est effectif');
assert.match(page, /style=\{\{ \.\.\.DOS_DE_CARTE_STYLE, '--rpg-anim-scale': String\(vitesseAnim\) \}\}/,
  'la variable --rpg-anim-scale est posée sur la coquille, donc héritée par toute la table');
assert.match(page, /data-anim-vitesse=\{String\(vitesseAnim\)\}/, 'la vitesse est aussi exposée en attribut');
assert.match(page, /data-anim-reduite=\{rpgAnimationsReduites\(animReduite\) \? 'true' : undefined\}/,
  'la table expose l’état effectif du mode réduit, indépendant du réglage système');

// Les six minuteurs de la slice passent par dureeAnimation, pour que le
// nettoyage reste calé sur la durée réellement affichée.
for (const constante of ['DUREE_MAREE_MANA', 'DUREE_BALANCE_TENEBRES', 'DUREE_TRIBUT_FIL',
  'DUREE_LIGNE_CHARGE', 'DUREE_FLIP_TOUR', 'DUREE_TEMPETE_SABLE']) {
  assert.match(page, new RegExp(`dureeAnimation\\(${constante}\\)`),
    `le minuteur ${constante} respecte le réglage de vitesse`);
}

// ── 6. La feuille : la variable agit sur les durées ET sur les délais ──────
const debutZoneFx = css.indexOf('LA VICTOIRE SUR LA TABLE');
// Le bandeau du décor 3D existe aussi plus haut dans la feuille : on vise celui
// qui suit immédiatement la zone FX, pas la première occurrence du libellé.
const finZoneFx = css.indexOf('Le décor 3D de la table', debutZoneFx);
// La surcharge is-reduced termine la zone : ses propres règles (fondu de 120 ms,
// délai ramené à zéro) ne doivent pas être confondues avec les gestes à scaler.
// Le bloc commence par son keyframe de fondu, juste avant le premier sélecteur.
const debutReduit = css.indexOf('@keyframes rpg-fondu-reduit');
assert.ok(debutZoneFx > 0 && debutZoneFx < debutReduit && debutReduit < finZoneFx,
  'la zone FX des gestes puis la surcharge is-reduced sont correctement ordonnées');
const zoneGestes = css.slice(debutZoneFx, debutReduit);
const lignesAnimation = zoneGestes.split('\n')
  .map((ligne) => ligne.trim())
  .filter((ligne) => /^animation(-delay)?:/.test(ligne) && !ligne.includes('none'));
assert.ok(lignesAnimation.length >= 12, 'la slice compte bien une quinzaine de règles animées');
for (const ligne of lignesAnimation) {
  assert.ok(ligne.includes('var(--rpg-anim-scale, 1)'),
    `chaque durée et chaque délai de la slice consomme la variable : ${ligne}`);
}
assert.match(css, /animation-delay: calc\(var\(--d, 0ms\) \* var\(--rpg-anim-scale, 1\)\);/,
  'les délais en cascade des grains suivent la vitesse, pas seulement les durées');
assert.match(css, /rpg-victoire-panneau-win calc\(\.48s \* var\(--rpg-anim-scale, 1\)\)[\s\S]*?calc\(\.12s \* var\(--rpg-anim-scale, 1\)\) both;/,
  'le délai de mise en scène du panneau de victoire est mis à l’échelle lui aussi');
assert.match(cssMana, /animation: rpg-mana-maree calc\(\.4s \* var\(--rpg-anim-scale, 1\)\)[\s\S]*?animation-delay: calc\(calc\(var\(--mana-slot, 0\) \* 40ms\) \* var\(--rpg-anim-scale, 1\)\);/,
  'la marée de mana met à l’échelle sa vague et son décalage en cascade');

// ── 7. Le mode réduit forcé : fondu de 120 ms, état final, sans toucher au son
const blocReduit = css.slice(debutReduit, finZoneFx);
assert.match(blocReduit, /@keyframes rpg-fondu-reduit\s*\{\s*from \{ opacity: 0; \}\s*to \{ opacity: 1; \}\s*\}/,
  'un fondu opacité seul est défini pour le mode réduit');
assert.match(blocReduit, /\.rpg-battle\.is-reduced \.rpg-overlay--win,[\s\S]*?animation-duration: 120ms;[\s\S]*?animation-delay: 0ms;/,
  'les panneaux de fin s’ouvrent sur un fondu de 120 ms sans délai');
for (const selecteur of [
  '.rpg-battle.is-reduced .rpg-spell-played--contre',
  '.rpg-battle.is-reduced .rpg-btn--endturn.is-tour-neuf .rpg-btn--endturn__label',
  '.rpg-battle.is-reduced .rpg-flux-track.is-maree .rpg-flux-track__slot.is-lit',
  '.rpg-battle.is-reduced .rpg-tempete-sable,',
  '.rpg-battle.is-reduced .rpg-balance-tenebres,',
]) {
  assert.ok(blocReduit.includes(selecteur), `la surcharge couvre le geste ${selecteur}`);
}
assert.match(blocReduit, /\.rpg-battle\.is-reduced[^{]*data-vainqueur="joueur"[\s\S]*?opacity: \.35;/,
  'le camp vaincu reste désigné par une atténuation statique');
assert.doesNotMatch(blocReduit, /display:\s*none/,
  'le mode réduit ne retire aucun élément : l’information reste visible, seul le geste est coupé');
// Le CSS ne peut pas faire taire l’audio (géré en JS) : la prévention ici, c’est
// que les deux commandes de réglage continuent d’émettre leur SFX de menu.
assert.match(page, /rpg-settings__reduced[\s\S]*?onClick=\{\(\) => \{ play\('menu'\); onToggleAnimReduite\?\.\(\); \}\}/,
  'basculer le mode réduit joue toujours le son de menu, le réglage ne rend pas muet');
assert.match(css, /\.rpg-settings__segment\s*\{/, 'la commande segmentée de vitesse est stylée');
assert.match(css, /\.rpg-settings__segment-btn\.is-active\s*\{/, 'le choix de vitesse actif est visible');

// ── 8. Le moteur reste la source de vérité, sans mise en scène ni réglage ──
for (const interdit of ['rpgAnimations', 'is-reduced', '--rpg-anim-scale', 'dureeAnimation',
  'data-anim', 'RPG_VITESSES', 'rpg-fondu-reduit']) {
  assert.equal(engine.includes(interdit), false,
    `le moteur ne contient aucun déclencheur visuel (présence de « ${interdit} »)`);
}

console.log('✓ Réglages d’animation de la table : vitesse ×0,5/×1/×2 via --rpg-anim-scale sur toutes les durées et tous les délais (CSS) et dureeAnimation() sur les six minuteurs JS ; mode réduit forcé .is-reduced indépendant du système (fondu 120 ms, état final immédiat, sons conservés), préférences persistées en localStorage tolérant, moteur intact');
