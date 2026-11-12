import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RPG_DECKS_ARCHETYPES, RPG_DECK_JOUEUR_BASE, RPG_DECK_SORCIER_BASE,
  RPG_DECK_HYBRIDE_BASE, RPG_DECK_MAREE_BASE, RPG_DECK_NEIGE_BASE,
  cardById, cardColors, carteJouableSansTerrain, rpgValiderDeck,
} from '../src/games/rpgCards.js';
import { RPG_STORY_DECKS } from '../src/games/rpgStoryTours.js';
import { RPG_MODE_MANA_ESSAI, validerDeckManaEssai } from '../src/games/rpgManaEssai.js';
import { rpgNouveauDuel, rpgMulligan, rpgMulliganSorcier, rpgDemarrerManaEssai } from '../src/games/rpgDuel.js';

const seau = (c) => c.kind === 'hero' ? 'creature' : c.kind;

test('les listes historiques de test et les huit préconstruits joués restent complets et sans terrain', () => {
  const archives = [RPG_DECK_JOUEUR_BASE, RPG_DECK_SORCIER_BASE, RPG_DECK_HYBRIDE_BASE, RPG_DECK_MAREE_BASE, RPG_DECK_NEIGE_BASE];
  for (const cartes of [...archives, ...RPG_DECKS_ARCHETYPES.map((deck) => deck.cardIds)]) {
    assert.equal(cartes.length, 30);
    assert.ok(cartes.every((id) => carteJouableSansTerrain(cardById(id))));
  }
});

for (const deck of RPG_DECKS_ARCHETYPES) {
  test(`${deck.name} : courbe bicolore et démarrage sans terrain`, () => {
    const cartes = deck.cardIds.map(cardById);
    assert.equal(deck.elements.length, 2);
    assert.equal(cartes.length, 30);
    assert.ok(cartes.filter((c) => seau(c) === 'creature').length >= 15);
    assert.ok(cartes.some((c) => seau(c) === 'magie'));
    assert.ok(cartes.some((c) => seau(c) === 'arme'));
    assert.ok(cartes.filter((c) => c.cost <= 2).length >= 8, 'au moins huit cartes de début de partie');
    assert.ok(cartes.filter((c) => c.cost <= 3).length >= 15, 'au moins la moitié du deck accessible aux trois premiers manas');
    assert.ok(cartes.filter((c) => c.cost >= 5).length <= 8, 'pas de main encombrée de finisseurs');
    assert.equal(rpgValiderDeck(deck.cardIds).ok, true);
    const elements = [...deck.elements];
    assert.deepEqual(validerDeckManaEssai({ ...deck, elements }), { ok: true });
    const duel = rpgNouveauDuel({ joueurDeck: deck.cardIds, sorcierDeck: RPG_DECK_SORCIER_BASE,
      modeMana: RPG_MODE_MANA_ESSAI, rng: () => 0.5 });
    assert.equal(duel.joueur.main.length, 5);
    assert.equal(duel.joueur.deck.length, 25);
    assert.deepEqual(duel.joueur.terrains, []);
    assert.equal(rpgMulligan(duel, 'joueur', [], () => 0.5).ok, true);
    assert.equal(rpgMulliganSorcier(duel, () => 0.5).ok, true);
    rpgDemarrerManaEssai(duel);
    if (elements.length === 1) assert.equal(duel.joueur.manaMax[elements[0]], 1);
    else assert.equal(duel.joueur.manaChoixEnAttente, true);
  });
}

test('la campagne utilise également trente cartes jouables par paquet', () => {
  for (const [id, cardIds] of Object.entries(RPG_STORY_DECKS)) {
    assert.equal(rpgValiderDeck(cardIds).ok, true, id);
    assert.ok(cardIds.every((c) => carteJouableSansTerrain(cardById(c))), id);
  }
});
