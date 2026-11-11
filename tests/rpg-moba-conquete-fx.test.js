import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgMobaNouvellesConquetes } from '../src/games/rpgMobaConqueteFx.js';

test('seules les voies réellement conquises depuis l’instantané créent un effet', () => {
  const avant = { voies: [{ id: 'left', active: true }, { id: 'center', active: true }, { id: 'right', active: false }] };
  const moba = { lanes: [
    { id: 'left', active: false, conqueredBy: 'joueur' },
    { id: 'center', active: false, conqueredBy: 'sorcier' },
    { id: 'right', active: false, conqueredBy: 'joueur' },
  ] };
  assert.deepEqual(rpgMobaNouvellesConquetes(avant, moba), [
    { laneId: 'left', side: 'joueur' }, { laneId: 'center', side: 'sorcier' },
  ]);
  assert.deepEqual(rpgMobaNouvellesConquetes(null, moba), []);
  assert.deepEqual(rpgMobaNouvellesConquetes(avant, { lanes: [{ id: 'left', active: false, conqueredBy: null }] }), []);
  assert.deepEqual(rpgMobaNouvellesConquetes(avant, { lanes: [{ id: 'left', active: true, conqueredBy: null }] }), []);
});
