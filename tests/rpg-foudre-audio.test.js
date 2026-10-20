import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ECLAIR_DU_MARTEAU_ID,
  RPG_FOUDRE_SFX,
  blessureDuMarteau,
  rpgFoudreSoundFor,
} from '../src/games/rpgFoudreAudio.js';
import { RPG_SFX_NAMES, rpgSfx } from '../src/games/rpgAudio.js';

test('le coup de tonnerre n’appartient qu’à l’Éclair du marteau', () => {
  assert.equal(ECLAIR_DU_MARTEAU_ID, 'eclair-du-marteau');
  assert.equal(RPG_FOUDRE_SFX, 'foudre_marteau');
  assert.equal(rpgFoudreSoundFor('eclair-du-marteau', 'spell'), RPG_FOUDRE_SFX);
  // Les autres sorts de Neige blessent sans faire tomber le ciel.
  assert.equal(rpgFoudreSoundFor('poigne-de-givre', 'spell'), null,
    'la Poigne de givre garde le bruit commun des magies');
  assert.equal(rpgFoudreSoundFor('verglas', 'spell'), null);
  assert.equal(rpgFoudreSoundFor('hurlement-du-blizzard', 'spell'), null);
  // Une créature de foudre n’est pas le marteau.
  assert.equal(rpgFoudreSoundFor('djinn-de-foudre', 'spell'), null);
  assert.equal(rpgFoudreSoundFor('djinn-de-foudre', 'attack'), null);
  // Hors lancement de sort, rien ne tonne.
  assert.equal(rpgFoudreSoundFor('eclair-du-marteau', 'attack'), null);
  assert.equal(rpgFoudreSoundFor('eclair-du-marteau', 'arrival'), null);
  assert.equal(rpgFoudreSoundFor('unknown-card', 'spell'), null);
  assert.equal(rpgFoudreSoundFor(null, 'spell'), null);
});

test('la blessure du marteau se reconnaît dans le journal à sa carte', () => {
  assert.equal(blessureDuMarteau({ sourceCarteId: 'eclair-du-marteau' }), true);
  assert.equal(blessureDuMarteau({ sourceCarteId: 'poigne-de-givre' }), false,
    'un autre sort de Neige n’allume pas la foudre du marteau');
  assert.equal(blessureDuMarteau({ sourceCarteId: null }), false,
    'un coup sans carte connue — une capacité — ne fait pas tomber le marteau');
  assert.equal(blessureDuMarteau({ elements: ['neige'] }), false,
    'la couleur seule ne suffit pas');
  assert.equal(blessureDuMarteau(null), false);
  assert.equal(blessureDuMarteau(undefined), false);
});

test('le tonnerre se charge pendant la chute et craque à l’impact', () => {
  assert.ok(RPG_SFX_NAMES.includes('foudre_marteau'),
    'le coup de foudre est déclaré parmi les bruitages du duel');
  const foudre = rpgSfx('foudre_marteau');
  // La charge : avant l’impact, un grésillement qui s’aiguise.
  assert.ok(foudre.some((event) => event.at === 0 && event.kind === 'noise' && event.filterTo > event.filter),
    'la charge monte pendant que le marteau tombe');
  // Le craquement à 0,26 s : là où la cinématique frappe (28 % de 950 ms).
  assert.ok(foudre.some((event) => event.at === 0.26 && event.kind === 'noise' && event.filterType === 'highpass'),
    'le ciel craque à l’instant de l’impact');
  assert.ok(foudre.some((event) => event.at === 0.26 && event.kind === 'thud'),
    'le choc du marteau ancre le craquement');
  // Le roulement : après le coup, le grave redescend longuement.
  assert.ok(foudre.some((event) => event.at > 0.26 && event.kind === 'noise' && event.filterType === 'lowpass' && event.dur >= 0.5),
    'le tonnerre roule après le coup');
  assert.notDeepEqual(foudre, rpgSfx('magie'),
    'le marteau ne sonne pas comme une magie ordinaire');
});
