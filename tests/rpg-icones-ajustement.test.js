import test from 'node:test';
import assert from 'node:assert/strict';
import { ajustementIconesCarte } from '../src/games/rpgEffectBadgeFit.js';

test('les icônes qui tiennent gardent leur taille', () => {
  assert.equal(ajustementIconesCarte({ largeur: 100, hauteur: 125, haut: 6, taille: 24, nombre: 3, espace: 3 }), null);
});

test('une colonne trop longue rétrécit sans perdre son espacement', () => {
  const r = ajustementIconesCarte({ largeur: 48, hauteur: 60, haut: 4, taille: 24, nombre: 4, espace: 2 });
  assert.ok(r.taille < 24);
  assert.ok(r.haut + r.taille * 4 + r.espace * 3 <= 58);
});

test('une icône trop grande reste proportionnée à la face', () => {
  const r = ajustementIconesCarte({ largeur: 14, hauteur: 60, haut: 3, taille: 24, nombre: 1, espace: 2 });
  assert.equal(r.taille, 3.64);
});

test('un grand repère et beaucoup d’effets restent dans le cadre', () => {
  const r = ajustementIconesCarte({ largeur: 40, hauteur: 50, haut: 70, taille: 24, nombre: 8, espace: 3 });
  assert.ok(r.haut >= 0 && r.haut + r.taille * 8 + r.espace * 7 <= 48);
  assert.ok(r.taille > 0);
});

test('une face invisible attend une mesure valable', () => {
  assert.equal(ajustementIconesCarte({ largeur: 0, hauteur: 0, haut: 0, taille: 24, nombre: 4, espace: 2 }), null);
});
