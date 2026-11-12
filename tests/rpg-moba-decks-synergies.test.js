import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById, cardColors, cardCopyLimit } from '../src/games/rpgCards.js';
import { MOBA_DECKS, MOBA_CARTES_AUTORISEES, rpgMobaCreerPartie, rpgMobaValiderDeck } from '../src/games/rpgMobaLocal.js';
import { MOBA_DECKS_TOURS, rpgMobaDeckLibreAleatoire, rpgMobaDeckTourAleatoire } from '../src/games/rpgMobaDecks.js';

const signatures = {
  sable: ['tislit-des-aures', 'javelot-du-beffroi', 'salem', 'poigne-de-givre'],
  sources: ['guerrier-au-bouclier-rond', 'volva-soigneuse', 'porteuse-de-cruches', 'festin-des-vaillants'],
  sahir: ['djinn-de-foudre', 'ghul-des-cendres', 'sahir-des-braises', 'tarek', 'lame-des-ergs'],
  lionne: ['samourai-du-torii', 'kenshi-de-la-forge', 'serment-de-la-forge', 'cavalier-des-deux-sabres', 'hache-de-la-banquise'],
  papyrus: ['scarabee-du-natron', 'momie-de-lin', 'offrande-de-lin', 'khopesh-d-or', 'papyrus'],
};

test('cinq decks MOBA distincts, légaux, audités et réellement jouables', () => {
  assert.deepEqual(MOBA_DECKS.map((deck) => deck.id), Object.keys(signatures));
  const auditees = new Set(MOBA_CARTES_AUTORISEES);
  for (const deck of MOBA_DECKS) {
    assert.equal(deck.cardIds.length, 30, deck.id);
    assert.deepEqual(rpgMobaValiderDeck(deck), { ok: true }, deck.id);
    assert.ok(deck.name && deck.description && deck.elements.length === 2);
    assert.ok(Object.isFrozen(deck) && Object.isFrozen(deck.cardIds) && Object.isFrozen(deck.elements));
    const compte = new Map();
    for (const id of deck.cardIds) {
      assert.ok(auditees.has(id), `${deck.id} : ${id} doit être adapté au MOBA`);
      assert.ok(cardColors(cardById(id)).every((couleur) => deck.elements.includes(couleur)), `${deck.id} : ${id} hors identité`);
      compte.set(id, (compte.get(id) ?? 0) + 1);
      assert.ok(compte.get(id) <= cardCopyLimit(cardById(id)), `${deck.id} : ${id} dépasse son quota`);
    }
    for (const id of signatures[deck.id]) assert.ok(compte.has(id), `${deck.id} manque son moteur : ${id}`);
    const creatures = deck.cardIds.map(cardById).filter((card) => ['creature', 'hero'].includes(card.kind));
    // Le MOBA n'a pas de coût de mana, mais les poses à 5+ demandent un sacrifice.
    assert.ok(creatures.filter((card) => card.cost <= 3).length >= 12, `${deck.id} manque de premières poses`);
    assert.ok(creatures.filter((card) => card.cost >= 5).length <= 4, `${deck.id} dépend trop des sacrifices`);
    assert.ok(deck.cardIds.some((id) => cardById(id).kind === 'magie'));
    assert.ok(deck.cardIds.some((id) => cardById(id).kind === 'arme'));
    assert.ok(rpgMobaCreerPartie(deck, deck, { rng: () => .5 }).ok, `${deck.id} ne démarre pas`);
  }
  for (let i = 0; i < MOBA_DECKS.length; i++) for (let j = i + 1; j < MOBA_DECKS.length; j++) {
    const communs = new Set(MOBA_DECKS[i].cardIds.filter((id) => MOBA_DECKS[j].cardIds.includes(id)));
    assert.ok(communs.size <= 5, `${MOBA_DECKS[i].id} et ${MOBA_DECKS[j].id} sont trop semblables`);
  }
});

test('duel libre : cinq adversaires thématiques ; campagne et decks personnels inchangés', () => {
  for (let i = 0; i < MOBA_DECKS.length; i++) {
    assert.equal(rpgMobaDeckLibreAleatoire(() => i / MOBA_DECKS.length), MOBA_DECKS[i]);
  }
  assert.equal(rpgMobaDeckLibreAleatoire(() => .999999), MOBA_DECKS.at(-1));
  assert.equal(rpgMobaDeckTourAleatoire(() => 0), MOBA_DECKS_TOURS[0]);
});
