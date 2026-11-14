import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_DECKS_THEMATIQUES } from '../src/games/rpgDecksThematiques.js';
import { RPG_DECKS, RPG_DECKS_ARCHETYPES, rpgValiderDeck, cardById, cardColors, cardCopyLimit } from '../src/games/rpgCards.js';
import { RPG_MANA_ESSAI_DECKS, validerDeckManaEssai } from '../src/games/rpgManaEssai.js';
import { MOBA_DECKS, rpgMobaValiderDeck } from '../src/games/rpgMobaLocal.js';
import { RPG_STORY_DECKS, RPG_STORY_TOURS, deckHistoire } from '../src/games/rpgStoryTours.js';
import { RPG_TUTORIELS, paquetDeLaLecon } from '../src/games/rpgTutorial.js';

const ids = ['sable', 'sources', 'sahir', 'lionne', 'papyrus', 'vikings', 'vampires', 'corsaires', 'ascension-eclipse', 'ascension-verre', 'ascension-dragon', 'ascension-rempart'];
const signature = (cartes) => cartes.join('|');

test('un catalogue commun : douze listes bicolores complètes et jouables dans les trois moteurs', () => {
  assert.deepEqual(RPG_DECKS_THEMATIQUES.map(({ id }) => id), ids);
  assert.equal(MOBA_DECKS, RPG_DECKS_THEMATIQUES);
  const listes = new Set();
  for (const deck of RPG_DECKS_THEMATIQUES) {
    assert.equal(deck.cardIds.length, 30, deck.id);
    assert.equal(deck.elements.length, 2, deck.id);
    assert.deepEqual(rpgMobaValiderDeck(deck), { ok: true }, deck.id);
    assert.deepEqual(validerDeckManaEssai(deck), { ok: true }, deck.id);
    assert.equal(rpgValiderDeck(deck.cardIds).ok, true, deck.id);
    assert.equal(listes.has(signature(deck.cardIds)), false, deck.id);
    listes.add(signature(deck.cardIds));
    const compte = new Map();
    for (const id of deck.cardIds) {
      compte.set(id, (compte.get(id) ?? 0) + 1);
      assert.ok(compte.get(id) <= cardCopyLimit(cardById(id)), id);
      assert.ok(cardColors(cardById(id)).every((couleur) => deck.elements.includes(couleur)), id);
    }
    for (const couleur of deck.elements) assert.ok(deck.cardIds.some((id) => cardColors(cardById(id)).includes(couleur)), couleur);
  }
});

test('les decks préconstruits classiques, essais, campagne et leçons utilisent le catalogue', () => {
  const listes = new Set(RPG_DECKS_THEMATIQUES.map((deck) => signature(deck.cardIds)));
  assert.equal(RPG_DECKS_ARCHETYPES.length, 8);
  assert.equal(RPG_MANA_ESSAI_DECKS.length, 12);
  assert.deepEqual(RPG_DECKS, [], 'les decks maison du joueur ne sont ni migrés ni écrasés');
  for (const deck of [...RPG_DECKS_ARCHETYPES, ...RPG_MANA_ESSAI_DECKS]) {
    assert.ok(listes.has(signature(deck.cardIds)), deck.id);
    assert.deepEqual(cardColors({ colors: deck.elements }), deck.elements, deck.id);
  }
  assert.equal(new Set(RPG_DECKS_ARCHETYPES.map((deck) => signature(deck.cardIds))).size, 8);
  assert.equal(new Set(RPG_MANA_ESSAI_DECKS.map((deck) => signature(deck.cardIds))).size, 12);
  for (const deck of RPG_DECKS_ARCHETYPES) {
    assert.equal(deckHistoire(deck.id), deck.cardIds, `${deck.id} garde la même identité en duel et en campagne`);
  }
  for (const [id, cartes] of Object.entries(RPG_STORY_DECKS)) {
    assert.ok(listes.has(signature(cartes)), `campagne : ${id}`);
    assert.equal(deckHistoire(id), cartes);
  }
  for (const tour of RPG_STORY_TOURS) for (const etage of tour.etages) {
    assert.ok(listes.has(signature(deckHistoire(etage.deck))), `étage : ${etage.id}`);
  }
  for (const lecon of RPG_TUTORIELS) {
    assert.ok(listes.has(signature(paquetDeLaLecon(lecon))), `leçon : ${lecon.id}`);
  }
});
