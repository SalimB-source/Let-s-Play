import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgMobaProjectiles, rpgMobaSignatures, rpgMobaChocEchange } from '../src/games/rpgMobaCinematiques.js';
const avant = { animationSeq: 10, cartes: [{ entityId: 'a', laneId: 'left', side: 'joueur', slot: 0 }, { entityId: 'b', laneId: 'left', side: 'sorcier', slot: 0 }], positions: { cases: {
  'left:joueur:0': { left: 0, top: 100, width: 20, height: 20 }, 'left:sorcier:0': { left: 0, top: 0, width: 20, height: 20 },
} } };
const duel = { moba: { lanes: [] }, combatAnimations: [
  { id: 10, type: 'projectile-combat', variante: 'feu', source: { entiteId: 'a' }, cible: { entiteId: 'b' } },
  { id: 11, type: 'projectile-combat', variante: 'feu', source: { entiteId: 'a' }, cible: { entiteId: 'b' } },
] };

test('projectiles de capacité et tir manqué : position, absence de doublon et cible détruite', () => {
  const combat = { attaquants: ['a'], cibleIndividuelle: { cibleId: 'b', ciblee: true } };
  const resultat = { ok: true, resume: { coupsRapides: [{ attaquantId: 'a', cibleId: 'b', rate: true }] } };
  const copie = JSON.stringify({ avant, duel, combat, resultat });
  const tirs = rpgMobaProjectiles(avant, duel, combat, resultat);
  assert.deepEqual(tirs.map(t => [t.variante, t.dy]), [['feu', -100], ['ciblee', -80]]);
  assert.equal(JSON.stringify({ avant, duel, combat, resultat }), copie);
  assert.equal(rpgMobaProjectiles(avant, duel, combat, { ...resultat, annule: true }).length, 1);
});

test('les signatures ne rejouent pas les blessures passées ni les dégâts nuls', () => {
  const blessure = (entityId, elements, sourceCarteId, recus = 1) => ({ entityId, elements, sourceCarteId, recus });
  const data = { ...duel, combatAnimations: [...duel.combatAnimations, { id: 12, type: 'tempete-foudre', cibles: ['a'] }] };
  assert.deepEqual(rpgMobaSignatures(avant, data, [blessure('b', ['braise'], 'trait-de-braise'), blessure('b', ['sable'], 'tempete-de-sable'), blessure('b', ['neige'], 'eclair-du-marteau'), blessure('a', ['braise'], 'trait-de-braise', 0)]).map(e => [e.type, e.entityId]), [['feu', 'b'], ['sable', 'b'], ['foudre', 'b'], ['foudre', 'a']]);
  assert.deepEqual(rpgMobaSignatures(avant, duel, []), []);
});

test('le choc ne représente que les échanges effectifs, jamais un blocage inventé', () => {
  const combat = { attaquants: ['a'], cibleIndividuelle: { cibleId: 'b', ciblee: false } };
  const res = { ok: true, resume: { blessures: [{ montant: 2 }] } };
  assert.deepEqual(rpgMobaChocEchange(avant, duel, combat, res), { x: 10, y: 60 });
  assert.equal(rpgMobaChocEchange(avant, duel, { ...combat, cibleIndividuelle: { ...combat.cibleIndividuelle, ciblee: true } }, res), null);
  assert.equal(rpgMobaChocEchange(avant, duel, combat, { ...res, resume: { blessures: [] } }), null);
});
