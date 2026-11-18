import test from 'node:test';
import assert from 'node:assert/strict';
import { nombreAjouts, elementPortail, matiereBordure } from '../src/games/rpgOrnements.js';
import { cardById } from '../src/games/rpgCards.js';

test('les ajouts comptent les doublons et les remplacements sans confondre un retrait', () => {
  assert.equal(nombreAjouts(['a', 'a'], ['a', 'a', 'a']), 1);
  assert.equal(nombreAjouts(['a', 'b'], ['a', 'c']), 1);
  assert.equal(nombreAjouts(['a', 'b'], ['b', 'a']), 0);
  assert.equal(nombreAjouts(['a', 'b'], ['a']), 0);
  assert.equal(nombreAjouts([], []), 0);
});

test('portails et matières suivent les cartes et les décors', () => {
  assert.equal(elementPortail(cardById('ashigaru-des-braises')), 'braise');
  assert.equal(elementPortail(cardById('poigne-de-givre')), 'givre');
  assert.equal(elementPortail(null), 'sable');
  assert.equal(matiereBordure('port-des-corsaires'), 'bois');
  assert.equal(matiereBordure('table-des-heures'), 'metal');
  assert.equal(matiereBordure('erg-des-ksour'), 'pierre');
  assert.equal(matiereBordure('inconnu'), 'pierre');
});
