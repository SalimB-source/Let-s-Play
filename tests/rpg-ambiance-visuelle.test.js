import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_PLATEAUX } from '../src/games/rpgPlateaux.js';
import { MOBA_PLATEAUX } from '../src/games/rpgMobaPlateaux.js';
import { rpgAmbiancePlateau, rpgElementParticule, rpgVieCritique } from '../src/games/rpgAmbianceVisuelle.js';

test('les plateaux classiques et Conquête ont une ambiance locale déterministe', () => {
  for (const plateau of [...RPG_PLATEAUX, ...MOBA_PLATEAUX]) assert.match(rpgAmbiancePlateau(plateau.id), /^(sable|neige|eau|braise|brume|petales)$/);
  assert.equal(rpgAmbiancePlateau('navire-pirate'), 'eau');
  assert.equal(rpgAmbiancePlateau('erg-du-sahara'), 'sable');
  assert.equal(rpgAmbiancePlateau('lac-gele-viking'), 'neige');
  assert.equal(rpgAmbiancePlateau('table-des-heures'), 'braise');
});

test('alerte à un quart de vie, puis extinction après soin ou défaite', () => {
  for (const [pv, max, critique] of [[25, 25, false], [7, 25, false], [6, 25, true], [5, 20, true], [1, 20, true], [0, 20, false], [-1, 20, false], [1, 0, false], [NaN, 20, false]]) assert.equal(rpgVieCritique(pv, max), critique, `${pv}/${max}`);
});

test('les particules d’une hybride alternent ses éléments, avec repli neutre', () => {
  for (const element of ['braise', 'eau', 'sable', 'neige', 'tenebres']) assert.equal(rpgElementParticule({ element }, 0), element);
  const carte = { colors: ['eau', 'tenebres', 'neige'] };
  assert.deepEqual(Array.from({ length: 6 }, (_, index) => rpgElementParticule(carte, index)), ['eau', 'tenebres', 'neige', 'eau', 'tenebres', 'neige']);
  assert.equal(rpgElementParticule(null, 0), 'sable');
});
