import test from 'node:test';
import assert from 'node:assert/strict';
import { groupCartesMain, groupEntitesParCarte } from '../src/games/rpgCardStacks.js';

const creature = (id, carteId) => ({ id, carteId, name: carteId, atk: 1, pv: 1 });

test('hand copies pile up in first-seen order and keep their real indices', () => {
  const main = ['desert', 'chien-du-guet', 'desert', 'fennec-des-decombres', 'desert'];
  const before = JSON.stringify(main);
  const piles = groupCartesMain(main);
  assert.deepEqual(piles.map((pile) => [pile.carteId, pile.indices]), [
    ['desert', [0, 2, 4]],
    ['chien-du-guet', [1]],
    ['fennec-des-decombres', [3]],
  ]);
  assert.equal(piles[0].indices[0], 0, 'the representative index is the first copy');
  assert.equal(piles.reduce((total, pile) => total + pile.indices.length, 0), main.length,
    'every copy stays counted once');
  assert.equal(JSON.stringify(main), before, 'grouping does not mutate the hand');
});

test('a hand without duplicates keeps one slot per card', () => {
  const piles = groupCartesMain(['desert', 'chien-du-guet', 'rapport-du-greffier']);
  assert.deepEqual(piles.map((pile) => pile.indices.length), [1, 1, 1]);
  assert.deepEqual(groupCartesMain([]), []);
  assert.deepEqual(groupCartesMain(), []);
});

test('board copies pile up per card, per camp, without mixing sides', () => {
  const joueur = [creature('a', 'chien-du-guet'), creature('b', 'fennec-des-decombres'), creature('c', 'chien-du-guet')];
  const before = JSON.stringify(joueur);
  const piles = groupEntitesParCarte(joueur);
  assert.deepEqual(piles.map((pile) => [pile.carteId, pile.entites.map((entite) => entite.id)]), [
    ['chien-du-guet', ['a', 'c']],
    ['fennec-des-decombres', ['b']],
  ]);
  assert.equal(piles[0].entites[0], joueur[0], 'the head card represents the pile');
  assert.equal(JSON.stringify(joueur), before, 'grouping does not mutate engine state');
  const sorcier = groupEntitesParCarte([creature('x', 'chien-du-guet')]);
  assert.deepEqual(sorcier.map((pile) => pile.entites.map((entite) => entite.id)), [['x']],
    'the same card on the other side stays a separate pile');
  assert.deepEqual(groupEntitesParCarte([]), []);
  assert.deepEqual(groupEntitesParCarte(), []);
});
