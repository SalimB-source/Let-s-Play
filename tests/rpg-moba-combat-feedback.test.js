import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgMobaCombatFeedback } from '../src/games/rpgMobaCombatFeedback.js';

test('combat feedback reads resolved outcomes, not declarations', () => {
  const entities = [{ id: 'archer', name: 'Archère' }, { id: 'k', name: 'Kagutsuchi' }, { id: 'g', name: 'Guerrier' }];
  const summary = { coupsRapides: [
    { attaquantId: 'archer', attaquant: 'Archère', rate: true },
    { attaquantId: 'a', attaquant: 'Aigle', annule: true },
    { attaquantId: 'b', attaquant: 'B', degats: 2 },
  ], critiques: [
    { entiteId: 'k', carteId: 'kagutsuchi-flamme-originelle', fois: 4 },
    { entiteId: 'g', carteId: 'guerrier', fois: 2 },
  ] };
  const result = rpgMobaCombatFeedback(summary, entities, 17);
  assert.deepEqual(result.miss, { archer: { token: 17 } });
  assert.deepEqual(result.critiques, { k: { token: 17, fois: 4 } });
  assert.match(result.annonce, /Archère : attaque ciblée manquée/);
  assert.match(result.annonce, /Aigle : attaque ciblée annulée, cible absente/);
  assert.match(result.annonce, /Kagutsuchi : coup critique ×4/);
  assert.match(result.annonce, /Guerrier : coup critique ×2/);
  assert.deepEqual(rpgMobaCombatFeedback({}, [], 18), { miss: {}, critiques: {}, annonce: '' });
});

test('a Sphere return identifies which combatant left without showing a miss', () => {
  const summary = { coupsRapides: [
    { attaquantId: 'a', attaquant: 'A', annule: true, rate: true, annulationSphere: 'attaquant' },
    { attaquantId: 'b', attaquant: 'B', annule: true, annulationSphere: 'cible' },
  ] };
  const result = rpgMobaCombatFeedback(summary, [], 1);
  assert.deepEqual(result.miss, {});
  assert.match(result.annonce, /A : attaque ciblée annulée, attaquant renvoyé par la Sphère/);
  assert.match(result.annonce, /B : attaque ciblée annulée, cible renvoyée par la Sphère/);
});
