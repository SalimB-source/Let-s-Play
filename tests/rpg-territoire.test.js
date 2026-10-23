import { test } from 'node:test';
import assert from 'node:assert/strict';
import { territoireDuDuel } from '../src/games/rpgTerritoire.js';

const duel = (joueur, sorcier) => ({ joueur: { pv: joueur }, sorcier: { pv: sorcier } });

test('territoire : égalité au départ et sans état lisible', () => {
  for (const etat of [null, {}, duel(25, 25), duel(100, 100), duel(NaN, 25), duel(25, Infinity)]) {
    assert.deepEqual(territoireDuDuel(etat), { partJoueur: 50, frontiere: 50, dominant: 'neutre' });
  }
});

test('les dégâts avancent la frontière dans le bon sens, les soins la ramènent', () => {
  assert.deepEqual(territoireDuDuel(duel(25, 15)), { partJoueur: 65, frontiere: 35, dominant: 'joueur' });
  assert.deepEqual(territoireDuDuel(duel(15, 25)), { partJoueur: 35, frontiere: 65, dominant: 'sorcier' });
  const parts = [15, 20, 25, 30].map((pv) => territoireDuDuel(duel(25, pv)).partJoueur);
  assert.deepEqual(parts, [65, 57.5, 50, 42.5]);
});

test('80/20 maximum en cours de partie, même avec une réserve de soins énorme', () => {
  assert.equal(territoireDuDuel(duel(500, 1)).partJoueur, 80);
  assert.equal(territoireDuDuel(duel(1, 500)).partJoueur, 20);
  assert.equal(territoireDuDuel({ joueur: { pv: 40, pvMax: 100 }, sorcier: { pv: 30, pvMax: 30 } }).partJoueur, 65);
});

test('la victoire couvre la table, y compris un abandon sans dégâts ; le nul la partage', () => {
  assert.equal(territoireDuDuel(duel(25, 25), 'joueur').partJoueur, 100);
  assert.equal(territoireDuDuel(duel(25, 25), 'sorcier').partJoueur, 0);
  assert.equal(territoireDuDuel(duel(0, 0), 'egalite').partJoueur, 50);
  assert.equal(territoireDuDuel(duel(12, 25), 'egalite').partJoueur, 50);
});

test('symétrique pour les deux perspectives PvP, monotone et sans mutation', () => {
  for (let j = 0; j <= 60; j++) {
    for (let s = 0; s <= 60; s++) {
      const etat = duel(j, s);
      Object.freeze(etat.joueur);
      Object.freeze(etat.sorcier);
      Object.freeze(etat);
      const part = territoireDuDuel(etat).partJoueur;
      assert.equal(part + territoireDuDuel(duel(s, j)).partJoueur, 100);
      assert.ok(part >= 20 && part <= 80);
      assert.ok(territoireDuDuel(duel(j + 1, s)).partJoueur >= part);
    }
  }
});
