import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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
  assert.deepEqual(readFileSync(new URL('../src/games/assets/weapon-break.mp3', import.meta.url)),
    readFileSync(new URL('../public/sword_breaking.mp3', import.meta.url)), 'le son utilisé est celui fourni');
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

test('rupture du bouclier : seule une parade tombée produit le son', async () => {
  const { rpgBouclierVientDeRompre } = await import('../src/games/rpgShieldAudio.js');
  const avant = { bouclier: 1, armeId: null, protection: null, bouclierLumiere: false };
  assert.equal(rpgBouclierVientDeRompre(avant, { bouclier: 0, arme: null }), true);
  assert.equal(rpgBouclierVientDeRompre({ ...avant, bouclier: 2 }, { bouclier: 1, arme: null }), false);
  assert.equal(rpgBouclierVientDeRompre({ ...avant, bouclier: 0, protection: { contre: 'neige' } }, { bouclier: 0, protection: null, arme: null }), true);
  assert.equal(rpgBouclierVientDeRompre({ ...avant, bouclierLumiere: true }, { bouclier: 1, bouclierLumiere: false, arme: null }), true);
  assert.equal(rpgBouclierVientDeRompre({ ...avant, armeId: 'jitte-d-amayas' }, { bouclier: 0, arme: null }), false);
  assert.equal(rpgBouclierVientDeRompre(avant, null), false);
});


test('la rupture déclenche le son même en mouvement réduit, avec les couleurs conservées', () => {
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /if \(rpgBouclierVientDeRompre\(entite, apres\)\) bouclierBrise = true;/);
  assert.match(page, /if \(bouclierBrise\) jouerSfx\(RPG_WEAPON_BREAK_SFX\)/);
  assert.match(page, /couleurs: impact\.couleurs \?\? \[\]/);
});
