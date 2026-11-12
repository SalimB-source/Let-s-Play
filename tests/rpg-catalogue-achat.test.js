import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_DUEL_CARDS, cardRarityInfo } from '../src/games/rpgCards.js';
import { RPG_TOUR_OUBLIEE_CARTES } from '../src/games/rpgTourOubliee.js';
import { collectionJoueur, lireExemplaire } from '../src/games/rpgCollection.js';
import { portefeuilleVide } from '../src/games/rpgCredits.js';
import { PRIX_CARTE_CATALOGUE, acheterCarteCatalogue, prixCarteCatalogue } from '../src/games/rpgCatalogueAchat.js';
import { acheterCarteDirecte } from '../src/games/rpgSoukDirect.js';

const bourse = (credits = 500) => ({ ...portefeuilleVide(), credits });
const parRarete = (rarete) => RPG_DUEL_CARDS.find((carte) => carte.kind !== 'terrain' && cardRarityInfo(carte).key === rarete);

test('prix par rareté, pour les seules cartes du catalogue collectionnables', () => {
  assert.deepEqual(PRIX_CARTE_CATALOGUE, { commune: 40, inhabituelle: 80, rare: 150, mythique: 300 });
  for (const [rarete, prix] of Object.entries(PRIX_CARTE_CATALOGUE)) {
    assert.equal(prixCarteCatalogue(parRarete(rarete).id), prix);
  }
  assert.equal(prixCarteCatalogue('inconnue'), null);
  assert.equal(prixCarteCatalogue(RPG_TOUR_OUBLIEE_CARTES[0].id), null);
  for (const terrain of RPG_DUEL_CARDS.filter((carte) => carte.kind === 'terrain')) assert.equal(prixCarteCatalogue(terrain.id), null);
});

test('achat immédiat : débit et première copie sans modifier l’étal', () => {
  for (const [rarete, prix] of Object.entries(PRIX_CARTE_CATALOGUE)) {
    const carte = parRarete(rarete);
    const avant = bourse();
    const achat = acheterCarteCatalogue({ portefeuille: avant, cardId: carte.id, collection: [] });
    assert.equal(achat.ok, true);
    assert.equal(achat.portefeuille.credits, 500 - prix);
    assert.equal(lireExemplaire(achat.portefeuille.exemplaires, carte.id, true), 1);
    assert.ok(collectionJoueur({ acquis: { cartes: [] }, distante: [], souk: achat.portefeuille.cartes, coffret: { cardIds: [] } }).includes(carte.id));
    assert.deepEqual(achat.portefeuille.etal, avant.etal);
    assert.equal(avant.credits, 500);
    const second = acheterCarteCatalogue({ portefeuille: achat.portefeuille, cardId: carte.id, collection: [] });
    assert.equal(second.raison, 'deja-possedee');
    assert.equal(second.portefeuille.credits, 500 - prix);
  }
});

test('refus sans débit : solde, possession ailleurs, id invalide ; règles de l’étal inchangées', () => {
  const id = parRarete('rare').id;
  const avant = bourse(20);
  assert.equal(acheterCarteCatalogue({ portefeuille: avant, cardId: id }).raison, 'solde-insuffisant');
  assert.deepEqual(acheterCarteCatalogue({ portefeuille: avant, cardId: id }).portefeuille, avant);
  assert.equal(acheterCarteCatalogue({ portefeuille: bourse(), cardId: id, collection: [id] }).raison, 'deja-possedee');
  assert.equal(acheterCarteCatalogue({ portefeuille: bourse(), cardId: 'absente' }).raison, 'carte-non-vendue');
  assert.equal(acheterCarteDirecte({ portefeuille: bourse(), cardId: id }).ok, false);
});
