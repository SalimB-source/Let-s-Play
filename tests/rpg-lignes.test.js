import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  RPG_LIGNE_FRONT, RPG_LIGNE_FOND, RPG_LIGNES_CASES, RPG_LIGNES_CHAMP_MAX,
  caseAutorisee, caseChoisissable, caseParDefaut, casesDeLigne, casesLibresPour, filtreLigne, frontTient,
  ligneDe, ligneDeCase, ligneDePose, ligneObligee, ligneProtege, lignesActives,
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

test('chaque carte entre par sa ligne : mêlée devant, tir derrière', () => {
  const defenseur = { id: 'gardienne', name: 'Gardienne', defenseur: true };
  const melee = { id: 'viking', name: 'Viking' };
  const archer = { id: 'archere', name: 'Archère', distance: true };
  // La fiche dit la ligne, et la pose la suit : Défenseur et mêlée devant,
  // « À distance » et Attaque ciblée derrière.
  assert.equal(ligneObligee(defenseur), RPG_LIGNE_FRONT);
  assert.equal(ligneObligee(melee), RPG_LIGNE_FRONT);
  assert.equal(ligneObligee(archer), RPG_LIGNE_FOND);
  assert.equal(ligneObligee({ id: 'garde', defenseur: true, distance: true }), RPG_LIGNE_FRONT);
  assert.equal(ligneDePose(defenseur), RPG_LIGNE_FRONT);
  assert.equal(ligneDePose(melee), RPG_LIGNE_FRONT);
  assert.equal(ligneDePose(archer), RPG_LIGNE_FOND);
  assert.equal(ligneDePose({ id: 'garde', coupRapide: true }), RPG_LIGNE_FOND,
    'un tireur se range derrière, même sans le mot « À distance »');
  // Sans carte connue (vue d'une entité sans case), le front est le repère.
  assert.equal(ligneDePose(), RPG_LIGNE_FRONT);
  for (const carte of [defenseur, melee]) {
    assert.equal(caseAutorisee(carte, 2), true, `${carte.id} entre par le front`);
    assert.equal(caseAutorisee(carte, 7), false, `${carte.id} ne se pose pas au fond`);
    assert.equal(caseChoisissable(carte, 2), true);
    assert.equal(caseChoisissable(carte, 7), false);
  }
  assert.equal(caseAutorisee(archer, 7), true, 'l’archère entre par l’arrière');
  assert.equal(caseAutorisee(archer, 2), false, 'l’archère ne se pose pas au front');
});

test('la case par défaut : la première libre de la ligne de la carte', () => {
  const libres = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  assert.equal(caseParDefaut({ id: 'viking' }, libres), 0, 'la mêlée entre devant');
  assert.equal(caseParDefaut({ id: 'garde', defenseur: true }, libres), 0, 'le Défenseur aussi');
  assert.equal(caseParDefaut({ id: 'archere', distance: true }, libres), 5, 'le tir entre derrière');
  assert.equal(caseParDefaut({ id: 'garde', coupRapide: true, defenseur: true }, libres), 0,
    'un Défenseur reste devant, même avec l’Attaque ciblée');
  assert.equal(caseParDefaut({ id: 'viking' }, [2, 3, 6, 7]), 2);
  assert.equal(caseParDefaut({ id: 'archere', distance: true }, [2, 3, 6, 7]), 6);
  assert.equal(caseParDefaut({ id: 'viking' }, [6, 7, 8, 9]), null,
    'le fond ne sert pas de repli à une mêlée');
  assert.equal(caseParDefaut({ id: 'archere', distance: true }, [0, 1, 2, 3, 4]), null,
    'le front ne sert pas de repli à un tireur');
});

test('une ligne pleine n’a pas de repli sur l’autre', () => {
  const frontLibre = [0, 1, 2, 3, 4];
  const fondLibre = [5, 6, 7, 8, 9];
  assert.equal(caseParDefaut({ id: 'archere', distance: true }, frontLibre), null,
    'le fond plein ne pousse pas un tireur au front');
  assert.equal(caseParDefaut({ id: 'viking' }, fondLibre), null,
    'le front plein ne pousse pas une mêlée au fond');
  assert.equal(caseParDefaut({ id: 'garde', defenseur: true }, fondLibre), null);
  assert.equal(caseParDefaut({ id: 'viking' }, []), null);
});

test('les cases libres sont celles de la ligne de la carte, moins les occupants', () => {
  const camp = { creatures: [
    creature('a', 0), creature('b', 2), creature('c', 5), creature('d', 9),
  ] };
  // Le front pour la mêlée et le Défenseur, le fond pour les tireurs.
  for (const carte of [{ id: 'viking' }, { id: 'garde', defenseur: true }]) {
    assert.deepEqual(casesLibresPour(camp, carte), [1, 3, 4], `${carte.id} : le front libre`);
  }
  for (const carte of [{ id: 'archere', distance: true }, { id: 'tengu', distance: true, envol: true }]) {
    assert.deepEqual(casesLibresPour(camp, carte), [6, 7, 8], `${carte.id} : le fond libre`);
  }
  // Les victimes d'un sacrifice libèrent leur case avant l'arrivée.
  assert.deepEqual(casesLibresPour(camp, { id: 'archere', distance: true }, 10, ['c']), [5, 6, 7, 8]);
  // Le mode à cinq cases n'a pas de fond : plus aucune place pour un tireur.
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

test('Seule Attaque ciblée passe la ligne (pas Infiltration)', () => {
  const archer = creature('archere', 6);
  const ligne = [creature('garde', 0), archer];
  assert.equal(ligneProtege({ id: 'tislit', coupRapide: true }, archer, ligne), false);
  assert.equal(ligneProtege({ id: 'takouba', infiltration: true }, archer, ligne), true);
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
