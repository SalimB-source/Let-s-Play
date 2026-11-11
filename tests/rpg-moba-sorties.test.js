import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgMobaSorties } from '../src/games/rpgMobaSorties.js';

test('les sorties nouvelles utilisent les cases avant résolution, sans rejouer les anciennes ou les conquêtes', () => {
  const avant = { renvois: 1, exils: 1, cartes: [
    { entityId: 'a', side: 'joueur', laneId: 'left', slot: 0, cardId: 'a' },
    { entityId: 'b', side: 'sorcier', laneId: 'center', slot: 0, cardId: 'b' },
    { entityId: 'c', side: 'sorcier', laneId: 'right', slot: 0, cardId: 'c' },
    { entityId: 'reste', side: 'joueur', laneId: 'right', slot: 1 },
  ] };
  const renvois = [{ entityId: 'ancien', cote: 'joueur' }, { entityId: 'a', cote: 'joueur' }, { entityId: 'reste', cote: 'joueur' }];
  const exils = [{ entityId: 'ancien', cote: 'joueur' }, { entityId: 'b', cote: 'sorcier' }, { entityId: 'c', cote: 'sorcier', conqueteMoba: true }, { entityId: 'hors-plateau', cote: 'joueur' }];
  const duel = { joueur: { creatures: [{ id: 'reste' }] }, sorcier: { creatures: [] } };
  assert.deepEqual(rpgMobaSorties(avant, renvois, exils, duel), [
    { ...avant.cartes[0], variante: 'eau' }, { ...avant.cartes[1], variante: 'exil' },
  ]);
});

test('seul le départ de la même carte dans la même case est remplacé par le retour', async () => {
  const { rpgMobaSortieRemplacee } = await import('../src/games/rpgMobaSorties.js');
  const sortie = { variante: 'exil', cardId: 'a', side: 'joueur', laneId: 'left', slot: 0 };
  const retour = { cardId: 'a', side: 'joueur', laneId: 'left', slot: 0 };
  assert.equal(rpgMobaSortieRemplacee(sortie, { nouvelle: retour }), true);
  assert.equal(rpgMobaSortieRemplacee({ ...sortie, variante: 'eau' }, { nouvelle: retour }), false);
  for (const variation of [{ cardId: 'b' }, { side: 'sorcier' }, { laneId: 'right' }, { slot: 1 }]) {
    assert.equal(rpgMobaSortieRemplacee(sortie, { nouvelle: { ...retour, ...variation } }), false);
  }
  assert.equal(rpgMobaSortieRemplacee(sortie, {}), false);
});
