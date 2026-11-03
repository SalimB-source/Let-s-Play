import test from 'node:test';
import assert from 'node:assert/strict';
import { diapoSuivante } from '../src/games/rpgDiaporama.js';

test('les flèches bouclent dans les deux sens avec ou sans offre', () => {
  assert.equal(diapoSuivante(0, -1, 4), 3);
  assert.equal(diapoSuivante(3, 1, 4), 0);
  assert.equal(diapoSuivante(0, -1, 3), 2);
  assert.equal(diapoSuivante(2, 1, 3), 0);
  assert.equal(diapoSuivante(3, 1, 3), 1);
  assert.equal(diapoSuivante(0, 1, 0), 0);
});
