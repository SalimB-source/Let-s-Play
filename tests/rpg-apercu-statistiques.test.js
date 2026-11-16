import test from 'node:test';
import assert from 'node:assert/strict';
import { actualiserStatsApercu } from '../src/games/rpgApercuStatistiques.js';

test('un aperçu ouvert suit les statistiques de son propre exemplaire', () => {
  const visuel = { id: 'a', carteId: 'chien-du-guet', atk: 2, pv: 2, blessee: false, art: 'illustration' };
  const duel = { joueur: { creatures: [{ id: 'b', carteId: 'chien-du-guet', atk: 99, pv: 99, pvMax: 2 }] },
    sorcier: { creatures: [{ id: 'a', carteId: 'chien-du-guet', atk: 7, pv: 0, pvMax: 2 }] } };
  const actualise = actualiserStatsApercu(visuel, duel);
  assert.deepEqual([actualise.atk, actualise.pv, actualise.blessee, actualise.art], [7, 0, true, 'illustration']);
  assert.deepEqual([visuel.atk, visuel.pv, visuel.blessee], [2, 2, false], 'instantané non muté');
  duel.sorcier.creatures[0].pv = 2;
  assert.equal(actualiserStatsApercu(visuel, duel).blessee, false, 'le soin est aussi reflété');
  assert.equal(actualiserStatsApercu(null, duel), null, 'une carte en main garde ses valeurs imprimées');
  assert.equal(actualiserStatsApercu(visuel, null), visuel);
  duel.sorcier.creatures[0].carteId = 'fennec-des-decombres';
  assert.equal(actualiserStatsApercu(visuel, duel), visuel, 'pas de confusion après remplacement');
});
