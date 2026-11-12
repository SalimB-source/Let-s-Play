import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGUE_DU_COMPOSEUR, RPG_DECKS_ARCHETYPES, cardColors, rpgValiderDeck } from '../src/games/rpgCards.js';
import { normaliserDeckMaison, rpgValiderDeckMaison, deckMaisonEstSelectionnable } from '../src/games/rpgDeckBuilder.js';
import { genererDeckAssiste } from '../src/games/rpgDeckAuto.js';
import { lireIntention, verifierIntention } from '../src/games/rpgDeckIntention.js';
import { RPG_MANA_ESSAI_DECKS, validerDeckManaEssai, RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { rpgNouveauDuel } from '../src/games/rpgDuel.js';
import { MOBA_DECKS, rpgMobaValiderDeck, rpgMobaCreerPartie } from '../src/games/rpgMobaLocal.js';
import { MOBA_DECKS_TOURS } from '../src/games/rpgMobaDecks.js';
import { RPG_STORY_TOURS, deckHistoire } from '../src/games/rpgStoryTours.js';

const bi = RPG_MANA_ESSAI_DECKS[1];
// La carte bicolore apporte Neige en plus de Braise et Sable.
const tri = [...bi.cardIds.slice(1), 'tempete-de-foudre-et-de-givre'];
const couleurs = (ids) => new Set(ids.flatMap(cardColors));

test('le format compte toutes les couleurs imprimées, y compris sur une carte hybride', () => {
  assert.equal(rpgValiderDeck(RPG_MANA_ESSAI_DECKS[0].cardIds).ok, true);
  assert.equal(rpgValiderDeck(bi.cardIds).ok, true);
  assert.equal(couleurs(tri).size, 3);
  assert.deepEqual(rpgValiderDeck(tri), { ok: false, raison: '1 à 2 couleurs exigées' });
  assert.equal(validerDeckManaEssai({ cardIds: tri, elements: ['sable', 'braise', 'neige'] }).ok, false);
  assert.equal(validerDeckManaEssai({ cardIds: tri, elements: ['sable', 'braise'] }).ok, false);
  assert.equal(validerDeckManaEssai({ ...bi, elements: ['sable', 'sable'] }).ok, false);
  assert.throws(() => rpgNouveauDuel({ joueurDeck: tri, sorcierDeck: bi.cardIds, modeMana: RPG_MODE_MANA_ESSAI }), /1 à 2 couleurs/);
  assert.throws(() => rpgNouveauDuel({ joueurDeck: tri, joueurCouleurs: ['sable', 'braise'], sorcierDeck: bi.cardIds, modeMana: RPG_MODE_MANA_ESSAI }), /hors identité/);
});

test('un ancien deck maison tricolore est conservé, mais ne peut plus être sélectionné', () => {
  const deck = normaliserDeckMaison({ id: 'maison-ancien', nom: 'Ancien', cardIds: tri });
  assert.deepEqual(deck.cardIds, tri);
  assert.equal(deck.elements.length, 3);
  assert.equal(rpgValiderDeckMaison(deck.cardIds).ok, false);
  assert.equal(deckMaisonEstSelectionnable(deck), false);
  const corrige = normaliserDeckMaison({ ...deck, cardIds: bi.cardIds });
  assert.equal(deckMaisonEstSelectionnable(corrige), true);
});

test('les decks proposés et les adversaires de campagne restent jouables', () => {
  for (const deck of RPG_DECKS_ARCHETYPES) assert.equal(rpgValiderDeck(deck.cardIds).ok, true, deck.id);
  for (const deck of RPG_MANA_ESSAI_DECKS) assert.equal(validerDeckManaEssai(deck).ok, true, deck.id);
  for (const tour of RPG_STORY_TOURS) for (const etage of tour.etages) {
    const ids = deckHistoire(etage.deck);
    assert.ok(ids, etage.id);
    assert.equal(rpgValiderDeck(ids).ok, true, etage.id);
    assert.ok(couleurs(ids).size <= 2, etage.id);
  }
  assert.ok(MOBA_DECKS_TOURS.length > 0);
  for (const deck of [...MOBA_DECKS, ...MOBA_DECKS_TOURS]) assert.equal(rpgMobaValiderDeck(deck).ok, true, deck.id);
  for (const deck of MOBA_DECKS) assert.equal(rpgMobaCreerPartie(deck, MOBA_DECKS[0], { rng: () => 0.5 }).ok, true, deck.id);
  const invalide = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds.slice(1), 'tempete-de-foudre-et-de-givre'] };
  assert.equal(rpgMobaValiderDeck(invalide).ok, false);
  assert.equal(rpgMobaCreerPartie(invalide, MOBA_DECKS[0]).ok, false);
  assert.equal(rpgMobaCreerPartie(MOBA_DECKS[0], invalide).ok, false);
  assert.equal(rpgMobaCreerPartie({ ...MOBA_DECKS[0], elements: ['sable', 'neige', 'braise'] }, MOBA_DECKS[0]).ok, false);
});

test('assistant : les demandes à trois couleurs et signatures hors identité sont signalées', () => {
  const lecture = verifierIntention(lireIntention('un deck sable braise neige', CATALOGUE_DU_COMPOSEUR), { catalogue: CATALOGUE_DU_COMPOSEUR });
  assert.deepEqual(lecture.intention.couleurs, []);
  assert.ok(lecture.alertes.some((alerte) => /deux couleurs/.test(alerte.texte)));
  const demande = verifierIntention({ ...lireIntention('un deck sable braise', CATALOGUE_DU_COMPOSEUR), signature: ['tempete-de-foudre-et-de-givre'] }, { catalogue: CATALOGUE_DU_COMPOSEUR });
  assert.ok(demande.alertes.some((alerte) => /écartées/.test(alerte.texte)));
  const resultat = genererDeckAssiste({ couleurs: ['sable', 'braise'], intention: demande.intention, catalogue: CATALOGUE_DU_COMPOSEUR });
  assert.ok(!resultat.cardIds.includes('tempete-de-foudre-et-de-givre'));
  assert.ok(couleurs(resultat.cardIds).size <= 2);
  assert.equal(rpgValiderDeck(resultat.cardIds).ok, true);
});
