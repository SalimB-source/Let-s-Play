import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_MAIN_DEPART, rpgNouveauDuel, rpgMulligan, rpgMulliganSorcier, rpgDemarrerManaEssai } from '../src/games/rpgDuel.js';
import { RPG_MODE_MANA_ESSAI, RPG_MANA_ESSAI_MAIN_DEPART } from '../src/games/rpgManaEssai.js';
import { rpgMobaNouveauDuel } from '../src/games/rpgMobaLocal.js';
import { etatInitial } from '../src/server/sablierArbitre.js';

const deck = Array(30).fill('chien-du-guet');
const hasard = () => .5;

test('cinq cartes piochées pour chaque camp en classique, sans terrains, MOBA et PvP', () => {
  assert.equal(RPG_MAIN_DEPART, 5);
  assert.equal(RPG_MANA_ESSAI_MAIN_DEPART, RPG_MAIN_DEPART);
  const parties = [
    ['classique', rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: hasard })],
    ['sans terrains', rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, modeMana: RPG_MODE_MANA_ESSAI, rng: hasard })],
    ['MOBA', rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: hasard })],
    ['PvP en ligne', etatInitial(deck, deck, 42)],
  ];
  for (const [mode, duel] of parties) {
    for (const camp of ['joueur', 'sorcier']) {
      assert.equal(duel[camp].main.length, 5, `${mode} : ${camp} commence avec cinq cartes`);
      assert.equal(duel[camp].deck.length, 25, `${mode} : cinq cartes quittent son paquet`);
      assert.equal(duel.mainDepart[camp], 5, `${mode} : le mulligan conserve la bonne taille`);
    }
    assert.equal(rpgMulligan(duel, 'joueur', [0, 2], hasard).ok, true, `${mode} : mulligan joueur`);
    assert.equal(rpgMulliganSorcier(duel, hasard).ok, true, `${mode} : mulligan adversaire`);
    assert.equal(duel.joueur.main.length, 5, `${mode} : main conservée après mulligan`);
    if (duel.modeMana === RPG_MODE_MANA_ESSAI) {
      assert.equal(rpgDemarrerManaEssai(duel).ok, true);
      assert.equal(duel.joueur.main.length, 5, `${mode} : pas de sixième carte automatique au premier tour`);
    }
  }
});
