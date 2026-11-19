import assert from 'node:assert/strict';
import test from 'node:test';
import { attaqueDirecteSurLesLignes, RPG_LIGNE_FOND, RPG_LIGNE_FRONT } from '../src/games/rpgLignes.js';

const front = (colonne = 0) => ({ id: `front${colonne}`, emplacement: colonne });
const fond = (colonne = 0) => ({ id: `fond${colonne}`, emplacement: 5 + colonne });
const adverse = { id: 'adverse', emplacement: 0 };

// L'attaque directe n'est proposée que quand plus rien n'est atteignable :
// c'est exactement le cas que la règle des lignes doit trancher.
const rienAtteignable = [];

test('Sorcier : un corps sur la ligne de contact peut le frapper', () => {
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, front(0), [adverse], rienAtteignable), true);
});

test('Sorcier : depuis le fond, il faut d’abord percer', () => {
  for (const colonne of [0, 2, 4]) {
    assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, fond(colonne), [adverse], rienAtteignable), false,
      'un tireur du fond ne tue pas le sorcier à distance');
  }
});

test('Sorcier : plus aucune créature adverse — le sorcier est à découvert', () => {
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, fond(0), [], rienAtteignable), true,
    'sans adversaire, la partie ne peut pas se figer');
});

test('Sorcier : hors des lignes et au MOBA, rien ne change', () => {
  assert.equal(attaqueDirecteSurLesLignes({}, fond(0), [adverse], rienAtteignable), true);
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true, moba: true }, fond(0), [adverse], rienAtteignable), true);
});

test('Sorcier : un infiltrateur seul garde sa frappe, mais pas depuis le fond', () => {
  const infiltration = { id: 'ombre', emplacement: 5, infiltration: true };
  const proie = { id: 'proie', emplacement: 0, infiltration: true };
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, infiltration, [proie], rienAtteignable), false,
    'la ligne passe avant le passe-droit');
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, { ...infiltration, emplacement: 3 }, [proie], rienAtteignable), true);
});

test('Sorcier : une créature sans case n’est pas filtrée', () => {
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, { id: 'jeton' }, [adverse], rienAtteignable), true);
});

test('Sorcier : la ligne de contact est le front, pas le fond', () => {
  assert.equal(RPG_LIGNE_FRONT, 'front');
  assert.equal(RPG_LIGNE_FOND, 'fond');
});
