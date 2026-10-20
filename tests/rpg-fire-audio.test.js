import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_FIRE_SFX, rpgCombatSound, rpgFireSoundFor } from '../src/games/rpgFireAudio.js';

test('le feu n’est qu’aux sorts qui blessent : dégâts ou table rase', () => {
  assert.equal(RPG_FIRE_SFX, 'flame_gust');
  assert.equal(rpgFireSoundFor('trait-de-braise', 'spell'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('frappe-iaijutsu', 'spell'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('feux-de-kitsune', 'spell'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('vent-rouge', 'spell'), RPG_FIRE_SFX,
    'le sort hybride qui frappe garde le feu de sa moitié Braise');
  // Une arme-sort, un renfort, une lame d’eau : rien ne blesse, rien ne brûle.
  assert.equal(rpgFireSoundFor('sabre-maudit', 'spell'), null,
    'le Sabre maudit attache une arme : il ne met pas le feu');
  assert.equal(rpgFireSoundFor('serment-de-la-forge', 'spell'), null,
    'un renfort de forge ne blesse rien');
  assert.equal(rpgFireSoundFor('lame-de-mer', 'spell'), null);
  assert.equal(rpgFireSoundFor('unknown-card', 'spell'), null);
  assert.equal(rpgFireSoundFor(null, 'spell'), null);
});

test('les attaques de créatures ne brûlent jamais : toutes partagent la frappe commune', () => {
  assert.equal(rpgFireSoundFor('ifrit-des-ergs', 'attack'), null,
    'même un Ifrit attaque au son `player_attack_hit`');
  assert.equal(rpgFireSoundFor('djinn-de-foudre', 'attack'), null,
    'une créature hybride n’y échappe pas');
  assert.equal(rpgFireSoundFor('samourai-du-torii', 'attack'), null,
    'l’acier synthétisé du Samouraï a été retiré — sa frappe sonne comme les autres');
  assert.equal(rpgFireSoundFor('chien-du-guet', 'attack'), null);
});

test('seules les arrivées qui blessent jouent le souffle', () => {
  // Une arrivée qui frappe : le souffle est à sa place.
  assert.equal(rpgFireSoundFor('ifrit-al-ahmar', 'arrival'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('braisier-du-souk', 'arrival'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('lionne-du-midi-ardent', 'arrival'), RPG_FIRE_SFX);
  // Une arrivée qui ne blesse rien reste sur `card_place` : le Daimyō lève ses
  // Samouraïs, le Sahir pioche, l’Ifrit attend son tour.
  assert.equal(rpgFireSoundFor('daimyo-du-soleil-rouge', 'arrival'), null,
    'le Daimyō crée des jetons : pas de feu à son arrivée');
  assert.equal(rpgFireSoundFor('ifrit-des-ergs', 'arrival'), null);
  assert.equal(rpgFireSoundFor('sahir-des-braises', 'arrival'), null);
  assert.equal(rpgFireSoundFor('cavalier-amazigh-du-desert', 'arrival'), null);
  assert.equal(rpgFireSoundFor('susanoo', 'arrival'), null);
});

test('les capacités de combat qui blessent gardent le souffle, pas le contact seul', () => {
  assert.equal(rpgFireSoundFor('sahir-des-braises', 'combat'), RPG_FIRE_SFX,
    'le Sahir blesse la créature combattue');
  assert.equal(rpgFireSoundFor('ifrit-des-ergs', 'combat'), null,
    'un simple échange de coups n’est pas une blessure d’effet');
});

test('les morts qui blessent partent en feu, celles qui ne blessent pas s’en vont', () => {
  assert.equal(rpgFireSoundFor('ifrit-des-ergs', 'destruction'), RPG_FIRE_SFX,
    'l’Ifrit blesse le sorcier en tombant');
  assert.equal(rpgFireSoundFor('ghul-des-cendres', 'destruction'), RPG_FIRE_SFX,
    'le Ghul blesse une créature en tombant');
  assert.equal(rpgFireSoundFor('anqa-des-braises', 'destruction'), null,
    'l’Anqa revient après quatre tours : sa mort ne blesse personne');
  assert.equal(rpgFireSoundFor('sahir-des-braises', 'destruction'), null);
});

test('au combat, le souffle n’est audible que si une capacité blesse', () => {
  const duel = {
    joueur: {
      creatures: [
        { id: 'attaquant', carteId: 'chien-du-guet' },
        { id: 'sahir', carteId: 'sahir-des-braises' },
      ],
    },
    sorcier: {
      creatures: [
        { id: 'ifrit', carteId: 'ifrit-des-ergs' },
        { id: 'chien', carteId: 'chien-du-guet' },
      ],
    },
  };

  assert.equal(rpgCombatSound(duel, ['ifrit']), null,
    'même un Ifrit attaque au son commun `player_attack_hit`');
  assert.equal(rpgCombatSound(duel, ['sahir']), RPG_FIRE_SFX,
    'la capacité de combat qui blesse garde son souffle à l’attaque');
  assert.equal(rpgCombatSound(duel, ['attaquant'], { attaquant: ['sahir'] }), RPG_FIRE_SFX,
    'pareil quand c’est en bloquant que le Sahir blesse');
  assert.equal(rpgCombatSound(duel, ['attaquant'], { attaquant: ['ifrit'] }), null,
    'un simple blocage d’Ifrit ne blesse pas : la page joue la frappe commune');
  assert.equal(rpgCombatSound(duel, ['attaquant'], { attaquant: ['chien'] }), null);
  assert.equal(rpgCombatSound(duel, []), null);
});
