import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RPG_DECKS, RPG_DECK_JOUEUR_BASE, RPG_DECK_SORCIER_BASE,
  RPG_DECK_HYBRIDE_BASE, RPG_DECK_MAREE_BASE, RPG_DECK_NEIGE_BASE,
  cardById, carteJouableSansTerrain, rpgValiderDeck,
} from '../src/games/rpgCards.js';
import { RPG_RECETTES_DECKS } from '../src/games/rpgDeckRecipes.js';
import { RPG_STORY_DECKS } from '../src/games/rpgStoryTours.js';
import { RPG_MODE_MANA_ESSAI, validerDeckManaEssai } from '../src/games/rpgManaEssai.js';
import { rpgNouveauDuel, rpgMulligan, rpgMulliganSorcier, rpgDemarrerManaEssai } from '../src/games/rpgDuel.js';

const seau = (c) => c.kind === 'hero' ? 'creature' : c.kind;

test('les exports de base sont les vraies listes de trente cartes, sans conversion au lancement', () => {
  const bases = [RPG_DECK_JOUEUR_BASE, RPG_DECK_SORCIER_BASE, RPG_DECK_HYBRIDE_BASE, RPG_DECK_MAREE_BASE, RPG_DECK_NEIGE_BASE];
  for (let i = 0; i < bases.length; i += 1) {
    assert.deepEqual(bases[i], RPG_DECKS[i].cardIds);
    assert.equal(bases[i].length, 30);
    assert.ok(bases[i].every((id) => carteJouableSansTerrain(cardById(id))));
  }
});

for (const deck of RPG_DECKS) {
  test(`${deck.name} : recette reconstruite, courbe jouable et démarrage sans terrain`, () => {
    const recette = RPG_RECETTES_DECKS[deck.id];
    const cartes = deck.cardIds.map(cardById);
    assert.deepEqual(recette.terrains, []);
    for (const [kind, quota] of [['creature', recette.creatures], ['magie', recette.magies], ['arme', recette.armes ?? 0]]) {
      assert.equal(cartes.filter((c) => seau(c) === kind).length, quota, kind);
    }
    assert.ok(cartes.filter((c) => c.cost <= 2).length >= 8, 'au moins huit cartes de début de partie');
    assert.ok(cartes.filter((c) => c.cost <= 3).length >= 15, 'au moins la moitié du deck accessible aux trois premiers manas');
    assert.ok(cartes.filter((c) => c.cost >= 5).length <= 8, 'pas de main encombrée de finisseurs');
    assert.equal(rpgValiderDeck(deck.cardIds).ok, true);
    const elements = recette.identite;
    assert.deepEqual(validerDeckManaEssai({ ...deck, elements }), { ok: true });
    const duel = rpgNouveauDuel({ joueurDeck: deck.cardIds, sorcierDeck: RPG_DECK_SORCIER_BASE,
      modeMana: RPG_MODE_MANA_ESSAI, rng: () => 0.5 });
    assert.equal(duel.joueur.main.length, 3);
    assert.equal(duel.joueur.deck.length, 27);
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
