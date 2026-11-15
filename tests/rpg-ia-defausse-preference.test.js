import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgNouveauDuel } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel } from '../src/games/rpgMobaLocal.js';
import { choisirDefausseIA } from '../src/games/rpgAI.js';

for (const [mode, nouveau] of [['classique', rpgNouveauDuel], ['conquête', rpgMobaNouveauDuel]]) {
  for (const side of ['joueur', 'sorcier']) for (const main of [
    ['ashigaru-des-braises', 'jarl-au-marteau-de-guerre'],
    ['jarl-au-marteau-de-guerre', 'ashigaru-des-braises'],
  ]) {
    test(`${mode}, ${side} : conserve le Jarl face à l'Ashigaru lors d'une défausse forcée`, () => {
      const deck = Array(30).fill('ashigaru-des-braises');
      const duel = nouveau({ joueurDeck: deck, sorcierDeck: deck, joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 });
      duel[side].main = [...main];
      assert.equal(duel[side].creatures.length, 0);
      const avant = JSON.stringify(duel);
      assert.equal(duel[side].main[choisirDefausseIA(duel, side)], 'ashigaru-des-braises');
      assert.equal(JSON.stringify(duel), avant);
    });
  }
}
