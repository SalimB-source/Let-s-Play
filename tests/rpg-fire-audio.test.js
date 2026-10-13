import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_FIRE_SFX, rpgCombatFireSound, rpgFireSoundFor } from '../src/games/rpgFireAudio.js';

test('the Braise sound applies to fire and hybrid spells and attacks', () => {
  assert.equal(rpgFireSoundFor('trait-de-braise', 'spell'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('vent-rouge', 'spell'), RPG_FIRE_SFX, 'hybrid spells keep the Braise sound');
  assert.equal(rpgFireSoundFor('lame-de-mer', 'spell'), null);
  assert.equal(rpgFireSoundFor('ifrit-des-ergs', 'attack'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('djinn-de-foudre', 'attack'), RPG_FIRE_SFX, 'hybrid creatures count as Braise');
  assert.equal(rpgFireSoundFor('chien-du-guet', 'attack'), null);
});

test('each triggered ability of a Braise creature has the fire effect sound', () => {
  assert.equal(rpgFireSoundFor('ifrit-des-ergs', 'arrival'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('sahir-des-braises', 'arrival'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('sahir-des-braises', 'combat'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('ghul-des-cendres', 'destruction'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('anqa-des-braises', 'destruction'), RPG_FIRE_SFX);
  assert.equal(rpgFireSoundFor('sahir-des-braises', 'destruction'), null);
  assert.equal(rpgFireSoundFor('cavalier-amazigh-du-desert', 'arrival'), null);
  assert.equal(rpgFireSoundFor('unknown-card', 'arrival'), null);
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

  assert.equal(rpgCombatFireSound(duel, ['fire-attacker']), RPG_FIRE_SFX);
  assert.equal(rpgCombatFireSound(duel, ['nonfire-attacker'], {
    'nonfire-attacker': ['fire-blocker'],
  }), RPG_FIRE_SFX, 'Sahir’s triggered combat effect is audible while blocking');
  assert.equal(rpgCombatFireSound(duel, ['nonfire-attacker'], {
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
  assert.equal(rpgCombatFireSound(ordinaryFireBlock, ['nonfire-attacker'], {
    'nonfire-attacker': ['ordinary-fire-blocker'],
  }), null, 'blocking alone is not an offensive fire attack');
});
