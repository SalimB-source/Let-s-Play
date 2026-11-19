import assert from 'node:assert/strict';
import test from 'node:test';
import {
  casesAPortee, cibleAPortee, colonneDeCase, distanceDeCases, filtrePortee,
  porteeDe, profondeurDeCase, profondeurMax,
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

test('Géométrie : front contre front = 1, front contre fond = 2, fond contre fond = 3', () => {
  assert.equal(distanceDeCases(front(2), front(2)), 1);
  assert.equal(distanceDeCases(front(2), fond(2)), 2);
  assert.equal(distanceDeCases(fond(2), front(2)), 2);
  assert.equal(distanceDeCases(fond(2), fond(2)), 3);
  assert.equal(distanceDeCases(front(0), front(4)), 5);
  assert.equal(distanceDeCases(undefined, front(0)), null);
});

test('Portée : mêlée 1, distance 2, Attaque ciblée sans limite', () => {
  assert.equal(porteeDe(melee(0)), 1);
  assert.equal(porteeDe(tireur(0)), 2);
  assert.equal(porteeDe(cibleur(0)), Number.POSITIVE_INFINITY);
  assert.equal(porteeDe({}), 1);
});

test('Mêlée : la case juste en face seulement, sans diagonale si elle est tenue', () => {
  const attaquant = melee(2);
  const face = melee(2, 'front');
  const diagonale = melee(3, 'front');
  const ennemiFront = [face, diagonale];
  assert.ok(cibleAPortee(attaquant, face, ennemiFront), 'la case d’en face est à portée');
  assert.ok(!cibleAPortee(attaquant, diagonale, ennemiFront), 'la diagonale est fermée tant que la case d’en face est tenue');
});

test('Mêlée : la diagonale s’ouvre quand la case d’en face est vide', () => {
  const attaquant = melee(2);
  const diagonaleGauche = melee(1, 'front');
  const diagonaleDroite = melee(3, 'front');
  const ennemis = [diagonaleGauche, diagonaleDroite];
  assert.ok(cibleAPortee(attaquant, diagonaleGauche, ennemis));
  assert.ok(cibleAPortee(attaquant, diagonaleDroite, ennemis));
});

test('Mêlée : jamais dans le dos — le fond adverse reste hors de portée', () => {
  const attaquant = melee(2);
  const fondAdverse = melee(2, 'fond');
  assert.ok(!cibleAPortee(attaquant, fondAdverse, [fondAdverse]), 'aucune mêlée ne touche le fond');
});

test('Distance : deux cases — le tireur du fond atteint le front adverse', () => {
  const attaquant = tireur(2, 'fond');
  const frontAdverse = melee(2, 'front');
  const fondAdverse = melee(2, 'fond');
  assert.ok(cibleAPortee(attaquant, frontAdverse, [frontAdverse]));
  assert.ok(!cibleAPortee(attaquant, fondAdverse, [fondAdverse]), 'le fond adverse est à trois cases');
  // Depuis le front, le fond adverse est à deux cases : à portée du tir — c'est
  // la ligne qui le protège tant que son front tient, pas la distance.
  const tireurFront = tireur(2, 'front');
  assert.ok(cibleAPortee(tireurFront, frontAdverse, [frontAdverse]));
  assert.ok(cibleAPortee(tireurFront, fondAdverse, [fondAdverse]));
});

test('Distance : depuis le fond, le tir ne sort pas de sa colonne', () => {
  const attaquant = tireur(2, 'fond');
  assert.ok(cibleAPortee(attaquant, melee(2, 'front'), []), 'la même colonne, deux cases : à portée');
  assert.ok(!cibleAPortee(attaquant, melee(1, 'front'), []), 'une colonne d’écart fait trois cases');
  assert.ok(!cibleAPortee(attaquant, melee(0, 'front'), []), 'deux colonnes d’écart : hors de portée');
});

test('Attaque ciblée : n’importe où, seule la ligne décide', () => {
  const attaquant = cibleur(0, 'fond');
  for (const cible of [melee(4, 'front'), melee(4, 'fond'), melee(0, 'front')]) {
    assert.ok(cibleAPortee(attaquant, cible, [cible]));
  }
});

test('Hors des lignes, sans case, ou au MOBA : la portée ne retire rien', () => {
  const attaquant = melee(0);
  const cible = melee(4, 'fond');
  assert.deepEqual(filtrePortee({}, attaquant, [cible], [cible]), [cible]);
  assert.deepEqual(filtrePortee({ moba: true, lignes: true }, attaquant, [cible], [cible]), [cible]);
  assert.deepEqual(filtrePortee(duelLignes, { id: 'sans-case' }, [cible], [cible]), [cible]);
});

test('Le filtre de portée conserve l’ordre reçu et ne garde que l’atteignable', () => {
  const attaquant = melee(2);
  const face = melee(2, 'front');
  const diagonale = melee(3, 'front');
  const loin = melee(0, 'front');
  assert.deepEqual(filtrePortee(duelLignes, attaquant, [face, diagonale, loin], [loin, face, diagonale]), [face]);
});

test('Les cases à portée sont celles du survol : triées, sans doublon, sans case inconnue', () => {
  const attaquant = tireur(2, 'fond');
  const ennemis = [melee(2, 'front'), melee(1, 'front'), melee(4, 'front'), melee(2, 'fond'), { id: 'jeton' }];
  assert.deepEqual(casesAPortee(duelLignes, attaquant, ennemis), [front(2)]);
});
