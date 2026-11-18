import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgSegmentCible, rpgTempsForts } from '../src/games/rpgTempsForts.js';

test('seuls les faits résolus alimentent les temps forts, sans confondre prise et destruction', () => {
  const evenements = rpgTempsForts({
    combatFeed: [
      { id: 1, type: 'hit', victim: { name: 'Navire' } },
      { id: 2, type: 'prise', victim: { name: 'Navire' } },
      { id: 3, type: 'death', victim: { name: 'Garde' } },
    ],
    critiques: { a: { token: 2, fois: 4, name: 'Kagutsuchi' } },
    voies: [{ id: 'left', active: false, conqueredBy: 'joueur' }, { id: 'right', active: true }, { id: 'center', active: false, conqueredBy: null }],
  });
  assert.deepEqual(evenements.map((e) => e.texte), ['Garde détruite', 'Kagutsuchi : coup critique ×4', 'Voie gauche conquise par vous']);
  assert.deepEqual(rpgTempsForts(), []);
});

test('les liens rejoignent les bords sans traverser les cartes, et ignorent les rectangles invisibles ou superposés', () => {
  const table = { left: 10, top: 20, width: 500, height: 400 };
  const a = { left: 20, top: 30, width: 40, height: 60 };
  const b = { left: 120, top: 30, width: 40, height: 60 };
  assert.deepEqual(rpgSegmentCible(table, a, b), { x1: 50, y1: 40, x2: 110, y2: 40 });
  assert.equal(rpgSegmentCible(table, a, a), null);
  assert.equal(rpgSegmentCible(table, a, { ...b, width: 0 }), null);
  assert.equal(rpgSegmentCible(table, a, { ...b, left: 30 }), null);
});
