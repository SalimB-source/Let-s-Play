import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgPiocher, rpgConsommerPresentations } from '../src/games/rpgDuel.js';

test('chaque pioche conserve sa carte exacte, même après défausse, et son propriétaire', () => {
  const duel = { joueur: { deck: ['chien-du-guet'], main: [] }, sorcier: { deck: ['chien-du-guet'], main: [] } };
  rpgPiocher(duel, 'joueur');
  duel.joueur.main.pop();
  rpgPiocher(duel, 'sorcier');
  const events = rpgConsommerPresentations(duel);
  assert.deepEqual(events, [
    { type: 'pioche', cote: 'joueur', carteId: 'chien-du-guet' },
    { type: 'pioche', cote: 'sorcier', carteId: 'chien-du-guet' },
  ]);
  assert.equal(events.filter((e) => e.type === 'effet' || e.cote === 'joueur').length, 1);
  assert.deepEqual(rpgConsommerPresentations(duel), []);
  assert.equal('presentations' in duel, false);
});

test('deck vide : aucune animation ; les événements restent propres à chaque duel', () => {
  const duel = { joueur: { deck: [], main: [] } };
  assert.equal(rpgPiocher(duel, 'joueur'), null);
  assert.deepEqual(rpgConsommerPresentations(duel), []);
  assert.deepEqual(rpgConsommerPresentations({}), []);
});
