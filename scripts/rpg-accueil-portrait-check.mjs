import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * L'accueil « Jouer » en portrait — la vitrine avant les quêtes.
 * ---------------------------------------------------------------
 * Contrat léger, sans navigateur : la feuille dédiée est bien chargée après
 * les styles du hub, ne touche qu'au portrait étroit, et redonne de la place
 * aux trois cartes de mode pendant que les quêtes deviennent une rangée
 * horizontale. Lancer `npm run check:rpg-accueil-portrait`.
 */
const lire = (chemin) => readFileSync(new URL(chemin, import.meta.url), 'utf8');
const page = lire('../src/games/RpgDuelPage.jsx');
const css = lire('../src/games/rpg-accueil-portrait.css');

// Ordre des feuilles : les règles de l'accueil doivent gagner sur le hub.
const indexBattle = page.indexOf("import './rpg-battle.css';");
const indexPortrait = page.indexOf("import './rpg-portrait.css';");
const indexAccueil = page.indexOf("import './rpg-accueil-portrait.css';");
assert.ok(indexBattle >= 0 && indexPortrait > indexBattle && indexAccueil > indexPortrait,
  "rpg-accueil-portrait.css se charge après rpg-battle.css et rpg-portrait.css");

// Une seule porte d'entrée : le portrait étroit. Le paysage et le PC gardent
// leurs grilles d'origine.
assert.match(css, /@media \(orientation: portrait\) and \(max-width: 700px\) \{/,
  'la refonte est limitée au portrait étroit');
assert.doesNotMatch(css, /orientation: landscape/, 'aucune règle ne vise le paysage');

const bloc = css.slice(css.indexOf('@media (orientation: portrait) and (max-width: 700px)'),
  css.indexOf('/* Très petit téléphone debout'));
const regle = (selecteur, propriete, valeur) => {
  const motif = new RegExp(`${selecteur}\\s*\\{[^}]*${propriete}:\\s*${valeur}`, 's');
  return motif.test(bloc);
};

assert.ok(regle('\\.rpg-mode-menu--jouer \\.rpg-mode-menu__play:not\\(\\.rpg-mode-menu__play--full\\)',
  'grid-template-rows', 'minmax\\(0, 1\\.15fr\\) minmax\\(0, \\.85fr\\) auto'),
  'modes et vitrine reprennent la hauteur, les quêtes ne prennent que la leur');
assert.ok(regle('\\.rpg-mode-menu--jouer \\.rpg-quests-jour__liste', 'grid-auto-flow', 'column'),
  'les trois quêtes restent sur une rangée');
assert.ok(regle('\\.rpg-mode-menu--jouer \\.rpg-quests-jour__liste', 'overflow-x', 'auto'),
  'la rangée se fait glisser au doigt');
assert.match(bloc, /scroll-snap-type:\s*x mandatory/, 'le défilement s’aligne sur une quête');
assert.ok(regle('\\.rpg-mode-menu--jouer \\.rpg-mode-menu__hero-actions > \\.rpg-mode-carte',
  'min-height', '64px'), 'les cartes de mode restent lisibles et touchables');
assert.ok(regle('\\.rpg-mode-menu--jouer \\.rpg-mode-menu__hero-copy', 'padding', '8px 38px 12px'),
  'le titre laisse les flèches du diaporama à découvert');

console.log('✓ Accueil Jouer debout : vitrine prioritaire, quêtes en rangée, paysage intact');
