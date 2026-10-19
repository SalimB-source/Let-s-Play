import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RPG_FIRE_SFX,
  RPG_SWORD_SFX,
  carteFrappeALaLame,
  rpgCombatSound,
  rpgFireSoundFor,
} from '../src/games/rpgFireAudio.js';

test('the Braise sound applies to fire and hybrid spells and attacks', () => {
  assert.equal(rpgFireSoundFor('trait-de-braise', 'spell'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('vent-rouge', 'spell'), RPG_FIRE_SFX, 'hybrid spells keep the Braise sound');
  assert.equal(rpgFireSoundFor('lame-de-mer', 'spell'), null);
  assert.equal(rpgFireSoundFor('ifrit-des-ergs', 'attack'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('djinn-de-foudre', 'attack'), RPG_FIRE_SFX, 'hybrid creatures count as Braise');
  assert.equal(rpgFireSoundFor('chien-du-guet', 'attack'), null);
});

test('une magie Braise ne sonne le feu que si elle brûle vraiment', () => {
  // Les sorts de dégâts gardent le souffle.
  assert.equal(rpgFireSoundFor('trait-de-braise', 'spell'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('frappe-iaijutsu', 'spell'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('feux-de-kitsune', 'spell'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('vent-rouge', 'spell'), RPG_FIRE_SFX,
    'le sort hybride qui frappe garde le feu de sa moitié Braise');
  // Une arme-sort, un renfort, une protection : le bruit commun des magies.
  assert.equal(rpgFireSoundFor('sabre-maudit', 'spell'), null,
    'le Sabre maudit attache une arme : il ne met pas le feu');
  assert.equal(rpgFireSoundFor('serment-de-la-forge', 'spell'), null,
    'un renfort de forge ne brûle rien');
});

test('each triggered ability of a Braise creature has the fire effect sound', () => {
  assert.equal(rpgFireSoundFor('ifrit-des-ergs', 'arrival'), null, 'l’Ifrit n’a plus d’effet d’arrivée');
  assert.equal(rpgFireSoundFor('ifrit-des-ergs', 'destruction'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('sahir-des-braises', 'combat'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('ghul-des-cendres', 'destruction'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('anqa-des-braises', 'destruction'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('sahir-des-braises', 'destruction'), null);
  assert.equal(rpgFireSoundFor('cavalier-amazigh-du-desert', 'arrival'), null);
  assert.equal(rpgFireSoundFor('unknown-card', 'arrival'), null);
});

test('only an arrival that burns plays the fire sound', () => {
  // Une arrivée qui frappe : le souffle est à sa place.
  assert.equal(rpgFireSoundFor('ifrit-al-ahmar', 'arrival'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('braisier-du-souk', 'arrival'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('lionne-du-midi-ardent', 'arrival'), RPG_FIRE_SFX);
  // Une arrivée qui n’allume rien reste sur `card_place` : le Daimyō lève ses
  // Samouraïs, le Djinn casse un terrain, le Sahir pioche, Susanoo exile.
  assert.equal(rpgFireSoundFor('daimyo-du-soleil-rouge', 'arrival'), null,
    'le Daimyō crée des jetons : pas de feu à son arrivée');
  assert.equal(rpgFireSoundFor('djinn-du-souk', 'arrival'), null);
  assert.equal(rpgFireSoundFor('sahir-des-braises', 'arrival'), null);
  assert.equal(rpgFireSoundFor('susanoo', 'arrival'), null);
});

test('combat sound detects fire attackers and fire creature combat abilities on either side', () => {
  const duel = {
    joueur: {
      creatures: [
        { id: 'nonfire-attacker', carteId: 'chien-du-guet' },
        { id: 'fire-blocker', carteId: 'sahir-des-braises' },
      ],
    },
    sorcier: {
      creatures: [
        { id: 'fire-attacker', carteId: 'ifrit-des-ergs' },
        { id: 'nonfire-blocker', carteId: 'chien-du-guet' },
      ],
    },
  };

  assert.equal(rpgCombatSound(duel, ['fire-attacker']), RPG_FIRE_SFX);
  assert.equal(rpgCombatSound(duel, ['nonfire-attacker'], {
    'nonfire-attacker': ['fire-blocker'],
  }), RPG_FIRE_SFX, 'Sahir’s triggered combat effect is audible while blocking');
  assert.equal(rpgCombatSound(duel, ['nonfire-attacker'], {
    'nonfire-attacker': ['nonfire-blocker'],
  }), null);

  const ordinaryFireBlock = {
    ...duel,
    joueur: {
      creatures: [
        ...duel.joueur.creatures.filter((creature) => creature.id !== 'fire-blocker'),
        { id: 'ordinary-fire-blocker', carteId: 'ifrit-des-ergs' },
      ],
    },
  };
  assert.equal(rpgCombatSound(ordinaryFireBlock, ['nonfire-attacker'], {
    'nonfire-attacker': ['ordinary-fire-blocker'],
  }), null, 'blocking alone is not an offensive fire attack');
});

test('un Samouraï qui frappe sonne l’acier, pas le feu', () => {
  assert.equal(RPG_SWORD_SFX, 'sword');
  assert.equal(carteFrappeALaLame('samourai-du-torii'), true);
  assert.equal(carteFrappeALaLame('ashigaru-des-braises'), true);
  assert.equal(carteFrappeALaLame('ronin-du-soleil-rouge'), true);
  assert.equal(carteFrappeALaLame('kenshi-de-la-forge'), true);
  assert.equal(carteFrappeALaLame('daimyo-du-soleil-rouge'), true);
  // Le type imprimé compte seul : un yōkai qui porte la Résonance samouraï
  // n'est pas un Samouraï et garde le souffle de sa couleur.
  assert.equal(carteFrappeALaLame('tengu-du-mont-ardent'), false);
  assert.equal(carteFrappeALaLame('kagutsuchi-flamme-originelle'), false);
  assert.equal(carteFrappeALaLame('ifrit-des-ergs'), false);
  assert.equal(carteFrappeALaLame('unknown-card'), false);

  const duel = {
    joueur: { creatures: [{ id: 'sabre', carteId: 'samourai-du-torii' }] },
    sorcier: { creatures: [{ id: 'yokai', carteId: 'tengu-du-mont-ardent' }] },
  };
  assert.equal(rpgCombatSound(duel, ['sabre']), RPG_SWORD_SFX,
    'l’attaque d’un Samouraï joue la lame');
  assert.equal(rpgCombatSound(duel, ['sabre'], { sabre: [] }), RPG_SWORD_SFX,
    'même quand la frappe est portée sur une créature');
  assert.equal(rpgCombatSound(duel, ['yokai']), RPG_FIRE_SFX,
    'le Tengu n’est pas un Samouraï : sa frappe garde le souffle du feu');
  assert.equal(rpgFireSoundFor('samourai-du-torii', 'attack'), RPG_FIRE_SFX,
    'hors combat, l’identité Braise de la carte ne change pas');
  // Un seul Samouraï dans un attaque groupée suffit à sortir l’acier.
  const mixte = {
    joueur: {
      creatures: [
        { id: 'sabre', carteId: 'samourai-du-torii' },
        { id: 'feu', carteId: 'ifrit-des-ergs' },
      ],
    },
    sorcier: { creatures: [] },
  };
  assert.equal(rpgCombatSound(mixte, ['feu', 'sabre']), RPG_SWORD_SFX);
});
