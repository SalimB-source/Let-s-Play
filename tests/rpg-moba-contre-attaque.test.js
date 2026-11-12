import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgMobaCiblesContreAttaque } from '../src/games/rpgMobaContreAttaque.js';

const rect = { left: 10, top: 20, width: 40, height: 50 };
const avant = { animationSeq: 2, cartes: [{ entityId: 'a', side: 'joueur', laneId: 'left', slot: 1 }],
  positions: { cases: { 'left:joueur:1': rect, 'right:sorcier:0': rect },
    voies: { '@moba:left:joueur': rect, '@moba:right:joueur': rect } } };

test('uniquement les nouvelles ripostes sur les cases et voies enregistrées', () => {
  const duel = { combatAnimations: [
    { id: 2, type: 'contre-attaque', cible: { type: 'creature', cote: 'joueur', entiteId: 'a' } },
    { id: 3, type: 'autre', cible: { type: 'creature', cote: 'joueur', entiteId: 'a' } },
    { id: 4, type: 'contre-attaque', cible: { type: 'creature', cote: 'joueur', entiteId: 'a' } },
    { id: 5, type: 'contre-attaque', cible: { type: 'creature', cote: 'sorcier', entiteId: 'nouvelle', mobaLane: 'right', mobaSlot: 0 } },
    { id: 6, type: 'contre-attaque', cible: { type: 'sorcier', cote: 'joueur', mobaVoies: ['left', 'right'] } },
    { id: 7, type: 'contre-attaque', cible: { type: 'sorcier', cote: 'joueur', mobaVoies: [] } },
  ] };
  const copie = JSON.stringify({ avant, duel });
  assert.deepEqual(rpgMobaCiblesContreAttaque(avant, duel).map((e) => e.cible), [
    'creature:a', 'creature:nouvelle', '@moba:left:joueur', '@moba:right:joueur',
  ]);
  assert.equal(JSON.stringify({ avant, duel }), copie);
});
