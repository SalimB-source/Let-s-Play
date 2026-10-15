import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_WATER_SFX, rpgWaterSoundFor } from '../src/games/rpgWaterAudio.js';
import { RPG_SFX_NAMES, rpgSfx } from '../src/games/rpgAudio.js';

test('les sorts Eau utilisent le whoosh fourni, les autres éléments non', () => {
  assert.equal(RPG_WATER_SFX, 'water_wave');
  assert.equal(rpgWaterSoundFor('lame-de-mer', 'spell'), RPG_WATER_SFX);
  assert.equal(rpgWaterSoundFor('eau-de-la-source', 'spell'), RPG_WATER_SFX);
  assert.equal(rpgWaterSoundFor('trait-de-braise', 'spell'), null);
  assert.equal(rpgWaterSoundFor('lame-de-mer', 'attack'), null);
});

test('le son Eau est déclaré comme échantillon jouable', () => {
  assert.ok(RPG_SFX_NAMES.includes(RPG_WATER_SFX));
  assert.deepEqual(rpgSfx(RPG_WATER_SFX), [{ kind: 'sample', at: 0, dur: 2.691, g: 1 }]);
});

test('le son de carte contrecarrée est déclaré comme échantillon jouable', () => {
  assert.ok(RPG_SFX_NAMES.includes('card_countered'));
  assert.deepEqual(rpgSfx('card_countered'), [{ kind: 'sample', at: 0, dur: 1.602, g: 1 }]);
});
