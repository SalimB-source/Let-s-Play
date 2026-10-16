import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classeVariationStatCreature,
  libelleVariationStatCreature,
} from '../src/games/rpgCreatureStats.js';

test('les statistiques renforcées, affaiblies et neutres ont un état distinct', () => {
  assert.equal(classeVariationStatCreature(5, 3), 'is-buffed');
  assert.equal(classeVariationStatCreature(1, 3), 'is-debuffed');
  assert.equal(classeVariationStatCreature(3, 3), '');
});

test('la comparaison accepte les valeurs sérialisées et ignore les valeurs invalides', () => {
  assert.equal(classeVariationStatCreature('4', '2'), 'is-buffed');
  assert.equal(classeVariationStatCreature(undefined, 2), '');
  assert.equal(classeVariationStatCreature(2, null), '');
  assert.equal(classeVariationStatCreature('inconnue', 2), '');
});

test('le statut chromatique possède aussi un libellé accessible', () => {
  assert.equal(libelleVariationStatCreature('is-buffed'), 'augmentée');
  assert.equal(libelleVariationStatCreature('is-debuffed'), 'diminuée');
  assert.equal(libelleVariationStatCreature(''), '');
});
