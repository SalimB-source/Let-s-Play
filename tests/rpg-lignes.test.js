import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  RPG_LIGNE_FRONT, RPG_LIGNE_FOND, RPG_LIGNES_CASES, RPG_LIGNES_CHAMP_MAX,
  caseAutorisee, caseParDefaut, casesDeLigne, casesLibresPour, filtreLigne, frontTient,
  ligneDe, ligneDeCase, ligneObligee, ligneProtege, lignesActives,
} from '../src/games/rpgLignes.js';

const creature = (id, emplacement, extra = {}) => ({ id, name: id, emplacement, ...extra });

test('le champ tient deux lignes de cinq cases, et rien de plus', () => {
  assert.equal(RPG_LIGNES_CASES, 5);
  assert.equal(RPG_LIGNES_CHAMP_MAX, 10);
  assert.deepEqual(casesDeLigne(RPG_LIGNE_FRONT), [0, 1, 2, 3, 4]);
  assert.deepEqual(casesDeLigne(RPG_LIGNE_FOND), [5, 6, 7, 8, 9]);
});

test('la ligne d’une case : front 0-4, fond 5-9, et le front pour tout le reste', () => {
  for (const index of [0, 1, 4]) assert.equal(ligneDeCase(index), RPG_LIGNE_FRONT);
  for (const index of [5, 6, 9]) assert.equal(ligneDeCase(index), RPG_LIGNE_FOND);
  // Une case inconnue ne cache jamais une créature derrière une protection.
  for (const index of [undefined, null, -1, 10, 99, 1.5, '3']) {
    assert.equal(ligneDeCase(index), RPG_LIGNE_FRONT, `case ${index}`);
  }
});

test('une créature sans case est devant — les modes historiques ne bougent pas', () => {
  assert.equal(ligneDe({ id: 'a' }), RPG_LIGNE_FRONT);
  assert.equal(ligneDe(null), RPG_LIGNE_FRONT);
  assert.equal(ligneDe(creature('a', 7)), RPG_LIGNE_FOND);
});

test('les lignes sont une variante de partie, éteinte par défaut', () => {
  assert.equal(lignesActives({}), false);
  assert.equal(lignesActives(null), false);
  assert.equal(lignesActives({ lignes: true }), true);
});

test('la ligne vient de la carte : Défenseur et mêlée devant, À distance derrière', () => {
  const defenseur = { id: 'gardienne', name: 'Gardienne', defenseur: true };
  const melee = { id: 'viking', name: 'Viking' };
  const archer = { id: 'archere', name: 'Archère', distance: true };
  // Un Défenseur reste devant, même si un effet lui prêtait « À distance ».
  const gardeArcher = { id: 'garde', defenseur: true, distance: true };
  assert.equal(ligneObligee(defenseur), RPG_LIGNE_FRONT);
  assert.equal(ligneObligee(melee), RPG_LIGNE_FRONT);
  assert.equal(ligneObligee(archer), RPG_LIGNE_FOND);
  assert.equal(ligneObligee(gardeArcher), RPG_LIGNE_FRONT);
  assert.equal(caseAutorisee(defenseur, 2), true);
  assert.equal(caseAutorisee(defenseur, 7), false);
  // La mêlée ne recule pas : la case du fond lui est refusée.
  assert.equal(caseAutorisee(melee, 7), false);
  assert.equal(caseAutorisee(archer, 7), true);
  assert.equal(caseAutorisee(archer, 2), false);
});

test('la case par défaut : la première libre de la ligne de la carte', () => {
  const libres = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  assert.equal(caseParDefaut({ id: 'archere', distance: true }, libres), 5);
  assert.equal(caseParDefaut({ id: 'viking' }, libres), 0);
  // Attaque ciblée ne change rien à la ligne : c'est `distance` qui la donne.
  assert.equal(caseParDefaut({ id: 'garde', coupRapide: true, defenseur: true }, libres), 0);
});

test('une ligne pleine n’a pas de repli sur l’autre', () => {
  const frontPlein = [5, 6, 7];
  const fondPlein = [0, 1, 2];
  assert.equal(caseParDefaut({ id: 'viking' }, frontPlein), null);
  assert.equal(caseParDefaut({ id: 'archere', distance: true }, fondPlein), null);
  assert.equal(caseParDefaut({ id: 'garde', defenseur: true }, frontPlein), null);
  assert.equal(caseParDefaut({ id: 'viking' }, []), null);
});

test('les cases libres pour une carte sont celles de sa ligne, moins les occupants', () => {
  const camp = { creatures: [
    creature('a', 0), creature('b', 2), creature('c', 5), creature('d', 9),
  ] };
  // Devant : cases 1, 3 et 4 ; le fond n'intéresse pas une mêlée.
  assert.deepEqual(casesLibresPour(camp, { id: 'viking' }), [1, 3, 4]);
  // Derrière : cases 6, 7 et 8.
  assert.deepEqual(casesLibresPour(camp, { id: 'archere', distance: true }), [6, 7, 8]);
  // Les victimes d'un sacrifice libèrent leur case avant l'arrivée.
  assert.deepEqual(casesLibresPour(camp, { id: 'viking' }, 10, ['a']), [0, 1, 3, 4]);
  // Un Défenseur suit la même règle de ligne que les autres mêlées.
  assert.deepEqual(casesLibresPour(camp, { id: 'garde', defenseur: true }), [1, 3, 4]);
  // Le mode à cinq cases ne connaît que le front.
  assert.deepEqual(casesLibresPour(camp, { id: 'viking' }, 5), [1, 3, 4]);
  assert.deepEqual(casesLibresPour(camp, { id: 'archere', distance: true }, 5), []);
});

test('le front tient tant qu’une créature vivante le garde', () => {
  assert.equal(frontTient([]), false);
  assert.equal(frontTient([creature('a', 7), creature('b', 8)]), false);
  assert.equal(frontTient([creature('a', 7), creature('b', 2)]), true);
});

test('le fond est hors de portée d’une attaque de mêlée', () => {
  const melee = { id: 'berserk' };
  const archer = creature('archere', 6);
  const ligne = [creature('garde', 0), archer];
  assert.equal(ligneProtege(melee, archer, ligne), true);
});

test('Attaque ciblée et Infiltration passent la ligne', () => {
  const archer = creature('archere', 6);
  const ligne = [creature('garde', 0), archer];
  assert.equal(ligneProtege({ id: 'tislit', coupRapide: true }, archer, ligne), false);
  assert.equal(ligneProtege({ id: 'takouba', infiltration: true }, archer, ligne), false);
});

test('front tombé, le fond redevient une cible ordinaire', () => {
  const melee = { id: 'berserk' };
  const archer = creature('archere', 6);
  const ligne = [archer, creature('autre', 8)];
  assert.equal(ligneProtege(melee, archer, ligne), false);
  assert.deepEqual(filtreLigne(melee, ligne, [archer]), [archer]);
});

test('le filtre de ligne conserve l’ordre et les autres filtres', () => {
  const melee = { id: 'berserk' };
  const devant = creature('devant', 1);
  const fondA = creature('fondA', 5);
  const fondB = creature('fondB', 9);
  const ligne = [devant, fondA, fondB];
  // Les cibles arrivent déjà filtrées par l'appelant (protection d'élément,
  // voie du MOBA…) : le filtre de ligne n'en retire que le fond.
  assert.deepEqual(filtreLigne(melee, ligne, [devant, fondA, fondB]), [devant]);
  assert.deepEqual(filtreLigne(melee, ligne, [devant]), [devant]);
  // Un attaquant qui voit le fond garde toute la liste.
  assert.deepEqual(
    filtreLigne({ id: 'tislit', coupRapide: true }, ligne, [devant, fondA, fondB]),
    [devant, fondA, fondB],
  );
});
