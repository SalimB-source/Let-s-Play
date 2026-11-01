import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  RPG_SFX_NAMES,
  RPG_WEAPON_BREAK_SFX,
  rpgSfx,
} from '../src/games/rpgAudio.js';
import { sonSortAuLancement } from '../src/games/rpgSortAudio.js';
import { rpgDerniersCompteursArmeDepuisJournal } from '../src/games/rpgWeaponAudio.js';

test('Brise-lame joue le son fourni au lancement du sort', () => {
  assert.equal(sonSortAuLancement({ id: 'brise-lame' }), RPG_WEAPON_BREAK_SFX);
  assert.equal(sonSortAuLancement({ id: 'brise-lame' }, { sonForce: 'creature_return' }), 'creature_return');
});

test('le son de lame brisée est enregistré, mesuré et livré avec le jeu', () => {
  assert.ok(RPG_SFX_NAMES.includes(RPG_WEAPON_BREAK_SFX));
  assert.deepEqual(rpgSfx(RPG_WEAPON_BREAK_SFX), [{ kind: 'sample', at: 0, dur: 3.024, g: 1 }]);
  assert.ok(existsSync(new URL('../src/games/assets/weapon-break.mp3', import.meta.url)));
});

test('seule la perte du dernier compteur d’une arme déclenche la détection', () => {
  assert.deepEqual(rpgDerniersCompteursArmeDepuisJournal([
    'Takouba perd un compteur de durabilité après une attaque de Salem (1 restant).',
    'Cuirasse de sel perd un compteur de durabilité après une défense de Tarek (0 restants).',
    'Cuirasse de sel n’a plus de compteur : elle est détruite.',
  ]), [
    'Cuirasse de sel perd un compteur de durabilité après une défense de Tarek (0 restants).',
  ]);
  assert.deepEqual(rpgDerniersCompteursArmeDepuisJournal(null), []);
});
