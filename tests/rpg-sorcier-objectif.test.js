import assert from 'node:assert/strict';
import test from 'node:test';
import { attaqueDirecteSurLesLignes, RPG_LIGNE_FOND, RPG_LIGNE_FRONT } from '../src/games/rpgLignes.js';

// Notre camp : front 0-4, fond 5-9. Chez l'adversaire, les mêmes dix cases,
// atteintes en avançant (`campPose`). Le sorcier se tient derrière le fond
// adverse : à une case de ce fond, à deux de son front.
const front = (colonne = 0) => ({ id: `front${colonne}`, emplacement: colonne });
const fond = (colonne = 0) => ({ id: `fond${colonne}`, emplacement: 5 + colonne });
const chezLui = (entite) => ({ ...entite, campPose: 'sorcier' });
const adverse = { id: 'adverse', emplacement: 0 };
const tireur = (entite) => ({ ...entite, distance: true });

// L'attaque directe n'est proposée que quand plus rien n'est atteignable :
// c'est exactement le cas que la portée doit trancher.
const rienAtteignable = [];

test('Sorcier : au contact de notre front, une mêlée ne l’atteint pas', () => {
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, front(0), [adverse], rienAtteignable, 'joueur'), false,
    'il est à trois cases');
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true, joueur: { creatures: [] }, sorcier: { creatures: [adverse] } },
    front(0), [adverse], rienAtteignable, 'joueur'), false);
});

test('Sorcier : sur le fond adverse, la mêlée le frappe — une case', () => {
  const perceur = chezLui(fond(3));
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, perceur, [adverse], rienAtteignable, 'joueur'), true,
    'la créature qui a percé les deux lignes porte le coup');
});

test('Sorcier : sur le front adverse, seule une créature à distance l’atteint', () => {
  const melee = chezLui(front(2));
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, melee, [adverse], rienAtteignable, 'joueur'), false,
    'une mêlée est encore à deux cases');
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, tireur(melee), [adverse], rienAtteignable, 'joueur'), true,
    'un tireur posté au front adverse le frappe à deux cases');
});

test('Sorcier : depuis nos lignes, un tireur ne l’atteint pas', () => {
  for (const colonne of [0, 2, 4]) {
    assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, tireur(front(colonne)), [adverse], rienAtteignable, 'joueur'), false,
      'notre front est à trois cases du sorcier');
    assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, tireur(fond(colonne)), [adverse], rienAtteignable, 'joueur'), false,
      'notre fond est à quatre cases');
  }
});

test('Sorcier : l’adversaire suit la même règle, symétriquement', () => {
  const sien = (colonne) => ({ id: `s${colonne}`, emplacement: colonne, campPose: 'joueur' });
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, { id: 'melee', emplacement: 5 + 2, campPose: 'joueur' },
    [{ id: 'nous', emplacement: 0 }], rienAtteignable, 'sorcier'), true, 'sa mêlée sur notre fond nous atteint');
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, sien(2), [{ id: 'nous', emplacement: 0 }],
    rienAtteignable, 'sorcier'), false, 'sur notre front, sa mêlée est à deux cases');
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, { ...sien(2), distance: true },
    [{ id: 'nous', emplacement: 0 }], rienAtteignable, 'sorcier'), true, 'son tireur, lui, nous atteint');
});

test('Sorcier : plus aucune créature adverse ne change pas la portée', () => {
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, front(0), [], rienAtteignable, 'joueur'), false,
    'sans adversaire, il est toujours à trois cases : c’est la loi de la grille');
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, chezLui(fond(0)), [], rienAtteignable, 'joueur'), true);
});

test('Sorcier : hors des lignes et au MOBA, rien ne change', () => {
  assert.equal(attaqueDirecteSurLesLignes({}, fond(0), [adverse], rienAtteignable, 'joueur'), true);
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true, moba: true }, fond(0), [adverse], rienAtteignable, 'joueur'), true);
});

test('Sorcier : une créature sans case n’est pas filtrée', () => {
  assert.equal(attaqueDirecteSurLesLignes({ lignes: true }, { id: 'jeton' }, [adverse], rienAtteignable, 'joueur'), true);
});

test('Sorcier : les deux lignes gardent leurs noms', () => {
  assert.equal(RPG_LIGNE_FRONT, 'front');
  assert.equal(RPG_LIGNE_FOND, 'fond');
});
