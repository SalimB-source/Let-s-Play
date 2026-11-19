/** Les portées du champ : une case pour la mêlée, deux pour un tir, mesurées
 * sur la grille partagée (`rpgChamp.js`), avancées comprises. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  casesAPortee, cibleAPortee, colonneDeCase, distanceAuSorcier, distanceDeCases,
  filtrePortee, porteeDe, profondeurDeCase, profondeurMax, sorcierAPortee,
} from '../src/games/rpgPortees.js';

// Deux lignes de cinq cases par camp : front 0-4, fond 5-9.
const front = (colonne) => colonne;
const fond = (colonne) => 5 + colonne;
const melee = (colonne, ligne = 'front') => ({ id: `m${colonne}${ligne}`, emplacement: ligne === 'front' ? front(colonne) : fond(colonne) });
const tireur = (colonne, ligne = 'fond') => ({ id: `t${colonne}${ligne}`, distance: true, emplacement: ligne === 'front' ? front(colonne) : fond(colonne) });
const cibleur = (colonne, ligne = 'fond') => ({ id: `c${colonne}${ligne}`, coupRapide: true, emplacement: ligne === 'front' ? front(colonne) : fond(colonne) });
const duelLignes = { lignes: true };

test('Géométrie : deux lignes de cinq cases, les fronts face à face', () => {
  assert.equal(profondeurDeCase(0), 0);
  assert.equal(profondeurDeCase(4), 0);
  assert.equal(profondeurDeCase(5), 1);
  assert.equal(profondeurDeCase(9), 1);
  for (let colonne = 0; colonne < 5; colonne += 1) {
    assert.equal(colonneDeCase(front(colonne)), colonne);
    assert.equal(colonneDeCase(fond(colonne)), colonne);
  }
  assert.equal(profondeurMax(duelLignes), 1);
  assert.equal(profondeurMax({}), 0);
});

test('Distance : Tchebychev sur la grille — une case d’écart vaut 1, en diagonale aussi', () => {
  assert.equal(distanceDeCases(front(2), front(2)), 1, 'front contre front');
  assert.equal(distanceDeCases(front(2), fond(2)), 2, 'front contre fond');
  assert.equal(distanceDeCases(fond(2), front(2)), 2);
  assert.equal(distanceDeCases(fond(2), fond(2)), 3);
  assert.equal(distanceDeCases(front(2), front(3)), 1, 'la diagonale est une case');
  assert.equal(distanceDeCases(front(0), front(4)), 4, 'quatre colonnes d’écart');
  assert.equal(distanceDeCases(undefined, front(0)), null);
});

test('Portée : une case pour la mêlée, deux pour un tir — Attaque ciblée comprise', () => {
  assert.equal(porteeDe(melee(0)), 1);
  assert.equal(porteeDe(tireur(0)), 2);
  assert.equal(porteeDe(cibleur(0)), 2, 'l’Attaque ciblée est un tir, pas une portée infinie');
  assert.equal(porteeDe({}), 1);
});

test('Mêlée : devant, en diagonale — et plus de « case d’en face » à dégager', () => {
  const attaquant = melee(1, 'front');
  assert.equal(cibleAPortee(attaquant, melee(1, 'front')), true, 'en face');
  assert.equal(cibleAPortee(attaquant, melee(2, 'front')), true, 'la diagonale est à une case');
  assert.equal(cibleAPortee(attaquant, melee(0, 'front')), true);
  assert.equal(cibleAPortee(attaquant, melee(1, 'fond')), false, 'le fond est à deux cases');
  assert.equal(cibleAPortee(attaquant, melee(3, 'front')), false, 'deux colonnes : trop loin');
});

test('Tir : deux cases dans toutes les directions, trois non', () => {
  const attaquant = tireur(1, 'fond');
  assert.equal(cibleAPortee(attaquant, melee(1, 'front')), true, 'front adverse à deux cases');
  assert.equal(cibleAPortee(attaquant, melee(2, 'front')), true, 'deux cases en diagonale');
  assert.equal(cibleAPortee(attaquant, melee(1, 'fond')), false, 'le fond adverse est à trois cases');
  assert.equal(cibleAPortee(attaquant, melee(0, 'front')), true, 'deux colonnes, même rangée');
});

test('Le filtre conserve l’ordre reçu et ne garde que l’atteignable', () => {
  const attaquant = melee(1, 'front');
  const duel = { lignes: true, joueur: { creatures: [attaquant] }, sorcier: { creatures: [] } };
  const proches = [melee(1, 'front'), melee(2, 'front')];
  const loin = melee(4, 'front');
  assert.deepEqual(filtrePortee(duel, attaquant, proches, proches, 'joueur'), proches);
  assert.deepEqual(filtrePortee(duel, attaquant, [loin], [loin], 'joueur'), []);
  // L'ordre des cibles survivantes est celui qu'on a reçu.
  const trois = [loin, proches[1], proches[0]];
  assert.deepEqual(filtrePortee(duel, attaquant, trois, trois, 'joueur').map((e) => e.id),
    [proches[1].id, proches[0].id]);
});

test('Hors des lignes, la portée ne retire rien', () => {
  const attaquant = melee(1, 'front');
  const loin = melee(4, 'front');
  const duel = { joueur: { creatures: [attaquant] }, sorcier: { creatures: [loin] } };
  assert.deepEqual(filtrePortee(duel, attaquant, [loin], [loin], 'joueur'), [loin]);
  assert.deepEqual(filtrePortee({ lignes: true, moba: {}, joueur: { creatures: [attaquant] }, sorcier: { creatures: [loin] } },
    attaquant, [loin], [loin], 'joueur'), [loin]);
});

test('Le sorcier se mesure comme une cible : derrière le fond adverse', () => {
  // Notre front (rangée 2) est à trois cases du sorcier ; notre fond à quatre.
  assert.equal(distanceAuSorcier(duelLignes, 'joueur', melee(0, 'front')), 3);
  assert.equal(distanceAuSorcier(duelLignes, 'joueur', melee(0, 'fond')), 4);
  // Sur le front adverse (rangée 1) : deux cases ; sur le fond adverse : une.
  assert.equal(distanceAuSorcier(duelLignes, 'joueur', melee(0, 'front')), 3);
  assert.equal(distanceAuSorcier(duelLignes, 'joueur', { emplacement: front(0), campPose: 'sorcier' }), 2);
  assert.equal(distanceAuSorcier(duelLignes, 'joueur', { emplacement: fond(0), campPose: 'sorcier' }), 1);
  assert.equal(sorcierAPortee(duelLignes, 'joueur', melee(0, 'front')), false, 'une mêlée au contact ne l’atteint pas');
  assert.equal(sorcierAPortee(duelLignes, 'joueur', { emplacement: front(0), campPose: 'sorcier' }), false,
    'une mêlée sur le front adverse est encore à deux cases');
  assert.equal(sorcierAPortee(duelLignes, 'joueur', { emplacement: fond(0), campPose: 'sorcier' }), true,
    'une mêlée qui a percé les deux lignes le frappe');
  assert.equal(sorcierAPortee(duelLignes, 'joueur', { ...tireur(0, 'front'), campPose: 'sorcier' }), true,
    'un tireur posté au front adverse le frappe à deux cases');
  assert.equal(sorcierAPortee(duelLignes, 'joueur', tireur(0, 'fond')), false,
    'depuis notre fond, il est à quatre cases');
});

test('Les cases à portée sont celles du survol : triées, sans doublon, sans case inconnue', () => {
  const attaquant = melee(2, 'front');
  const duel = { lignes: true, joueur: { creatures: [attaquant] }, sorcier: { creatures: [] } };
  const cibles = [melee(2, 'front'), melee(1, 'front'), melee(0, 'fond'), { id: 'sans-case' }];
  const cases = casesAPortee(duel, attaquant, cibles, 'joueur');
  assert.deepEqual(cases.map((c) => c.index), [1, 2], 'les deux cases adjacentes, triées');
  assert.deepEqual(cases.map((c) => c.colonne), [1, 2]);
  assert.ok(cases.every((c) => c.ligne === 'front'));
});
