import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ECLAIR_DU_MARTEAU_ID,
  MAITRE_DU_MARTEAU_ID,
  blessureDuMarteau,
  rpgFoudreSoundFor,
} from '../src/games/rpgFoudreAudio.js';
import { RPG_SFX_NAMES, rpgSfx } from '../src/games/rpgAudio.js';

test('le tonnerre synthétisé a quitté le jeu : plus de bruitage de foudre', () => {
  assert.equal(ECLAIR_DU_MARTEAU_ID, 'eclair-du-marteau');
  assert.equal(MAITRE_DU_MARTEAU_ID, 'maitre-du-marteau');
  assert.ok(!RPG_SFX_NAMES.includes('foudre_marteau'),
    'le coup de foudre n’est plus déclaré parmi les bruitages du duel');
  assert.equal(rpgSfx('foudre_marteau'), null, 'la synthèse du tonnerre est retirée');
  // L'Éclair du marteau se joue désormais en silence, comme tout un chacun.
  assert.equal(rpgFoudreSoundFor('eclair-du-marteau', 'spell'), null);
  assert.equal(rpgFoudreSoundFor('eclair-du-marteau', 'attack'), null);
  assert.equal(rpgFoudreSoundFor('eclair-du-marteau', 'arrival'), null);
  assert.equal(rpgFoudreSoundFor('maitre-du-marteau', 'arrival'), null,
    'la nouvelle animation du Maître ne fait pas revenir le son synthétisé');
  assert.equal(rpgFoudreSoundFor('poigne-de-givre', 'spell'), null);
  assert.equal(rpgFoudreSoundFor('djinn-de-foudre', 'spell'), null);
  assert.equal(rpgFoudreSoundFor('unknown-card', 'spell'), null);
  assert.equal(rpgFoudreSoundFor(null, 'spell'), null);
});

test('les blessures des deux marteaux se reconnaissent dans le journal à leur carte', () => {
  assert.equal(blessureDuMarteau({ sourceCarteId: 'eclair-du-marteau' }), true,
    'la foudre du sort continue de s’allumer à l’écran');
  assert.equal(blessureDuMarteau({ sourceCarteId: 'maitre-du-marteau', recus: 3 }), true,
    'les 3 dégâts d’arrivée du Maître allument la même animation sur leur cible');
  assert.equal(blessureDuMarteau({ sourceCarteId: 'maitre-du-marteau', recus: 3, mortelle: true }), true,
    'la foudre accompagne aussi une cible détruite sur son ancien emplacement');
  assert.equal(blessureDuMarteau({ sourceCarteId: 'poigne-de-givre' }), false,
    'un autre sort de Neige n’allume pas la foudre du marteau');
  assert.equal(blessureDuMarteau({ sourceCarteId: null }), false,
    'un coup sans carte connue — une capacité — ne fait pas tomber le marteau');
  assert.equal(blessureDuMarteau({ elements: ['neige'] }), false,
    'la couleur seule ne suffit pas');
  assert.equal(blessureDuMarteau(null), false);
  assert.equal(blessureDuMarteau(undefined), false);
});
