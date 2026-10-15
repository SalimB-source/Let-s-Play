import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_SFX_NAMES, rpgSfx } from '../src/games/rpgAudio.js';

test('le son de renvoi de créature est déclaré comme échantillon jouable', () => {
  assert.ok(RPG_SFX_NAMES.includes('creature_return'));
  assert.deepEqual(rpgSfx('creature_return'), [{ kind: 'sample', at: 0, dur: 1.585, g: 1 }]);
});
