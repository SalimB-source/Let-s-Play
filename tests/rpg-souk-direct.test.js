import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRIX_CARTE_DIRECTE,
  SOUK_DIRECT_REGLES,
  acheterCarteDirecte,
  ouvrirEtalDuJour,
  prixCarteDirecte,
  rafraichirEtalDuJour,
  tirageEtal,
} from '../src/games/rpgSoukDirect.js';
import {
  fusionnerPortefeuilles,
  normaliserEtal,
  portefeuilleVide,
} from '../src/games/rpgCredits.js';
import { RPG_DUEL_CARDS, cardById, cardRarityInfo } from '../src/games/rpgCards.js';

const JOUR = '2026-10-24T10:00:00.000Z';
const LENDEMAIN = '2026-10-25T10:00:00.000Z';
const GRAINE = 'compte-joueur-de-test';
const bourse = (credits = 1000) => ({ ...portefeuilleVide(), credits });
const ouvrir = (credits = 1000, horloge = JOUR) => ouvrirEtalDuJour({
  portefeuille: bourse(credits), graine: GRAINE, horloge,
}).portefeuille;
const parRarete = (etal, rarete) => etal.cartes.find((id) => cardRarityInfo(cardById(id)).key === rarete);

test('les prix et le format de l’étal sont publics', () => {
  assert.deepEqual(PRIX_CARTE_DIRECTE, { rare: 150, mythique: 300 });
  assert.equal(SOUK_DIRECT_REGLES.cartesParJour, 5);
  assert.equal(SOUK_DIRECT_REGLES.rafraichissementsParJour, 1);
  assert.equal(prixCarteDirecte('scribe-de-la-liste'), 150);
  assert.equal(prixCarteDirecte('tarek'), 300);
  assert.equal(prixCarteDirecte('chien-du-guet'), null);
  assert.equal(prixCarteDirecte('carte-inconnue'), null);
});

test('cinq cartes distinctes sont proposées, avec les deux raretés et un tirage stable', () => {
  const premier = tirageEtal({ jour: '2026-10-24', graine: GRAINE });
  assert.equal(premier.length, 5);
  assert.equal(new Set(premier).size, 5);
  assert.deepEqual(premier, tirageEtal({ jour: '2026-10-24', graine: GRAINE }), 'recharger ne relance pas le dé');
  assert.notDeepEqual(premier, tirageEtal({ jour: '2026-10-25', graine: GRAINE }), 'le lendemain propose une autre sélection');
  const raretes = new Set(premier.map((id) => cardRarityInfo(cardById(id)).key));
  assert.deepEqual([...raretes].sort(), ['mythique', 'rare']);
  assert.ok(premier.every((id) => prixCarteDirecte(id) !== null));
});

test('l’ouverture persiste le tirage et le nouveau jour réinitialise ses limites', () => {
  const initial = ouvrir();
  const relu = ouvrirEtalDuJour({ portefeuille: initial, graine: GRAINE, horloge: JOUR });
  assert.equal(relu.modifie, false);
  assert.deepEqual(relu.portefeuille.etal.cartes, initial.etal.cartes);

  const rafraichi = rafraichirEtalDuJour({ portefeuille: initial, graine: GRAINE, horloge: JOUR });
  assert.equal(rafraichi.ok, true);
  const lendemain = ouvrirEtalDuJour({
    portefeuille: rafraichi.portefeuille, graine: GRAINE, horloge: LENDEMAIN,
  }).portefeuille;
  assert.equal(lendemain.etal.jour, '2026-10-25');
  assert.equal(lendemain.etal.rafraichissements, 0);
  assert.deepEqual(lendemain.etal.achetees, []);
  assert.equal(lendemain.etal.cartes.length, 5);
});

test('le rafraîchissement propose cinq autres cartes et ne fonctionne qu’une fois', () => {
  const initial = ouvrir();
  const resultat = rafraichirEtalDuJour({ portefeuille: initial, graine: GRAINE, horloge: JOUR });
  assert.equal(resultat.ok, true);
  assert.equal(resultat.portefeuille.etal.rafraichissements, 1);
  assert.equal(resultat.cartes.length, 5);
  assert.equal(new Set(resultat.cartes).size, 5);
  assert.ok(resultat.cartes.every((id) => !initial.etal.cartes.includes(id)), 'le second étal ne répète pas le premier');
  assert.equal(resultat.portefeuille.credits, 1000, 'rafraîchir est gratuit');

  const second = rafraichirEtalDuJour({ portefeuille: resultat.portefeuille, graine: GRAINE, horloge: JOUR });
  assert.equal(second.ok, false);
  assert.equal(second.raison, 'rafraichissement-utilise');
  assert.deepEqual(second.portefeuille.etal.cartes, resultat.portefeuille.etal.cartes);
  assert.equal(second.portefeuille.etal.rafraichissements, 1);
});

test('une rare coûte 150 et une mythique 300, chacune ajoutée en un seul exemplaire', () => {
  const initial = ouvrir();
  const rare = parRarete(initial.etal, 'rare');
  const mythique = parRarete(initial.etal, 'mythique');
  assert.ok(rare && mythique, 'les deux familles sont au rendez-vous');

  const achatRare = acheterCarteDirecte({
    portefeuille: initial, cardId: rare, collection: initial.cartes, graine: GRAINE, horloge: JOUR,
  });
  assert.equal(achatRare.ok, true);
  assert.equal(achatRare.prix, 150);
  assert.equal(achatRare.exemplaires, 1);
  assert.equal(achatRare.portefeuille.credits, 850);
  assert.equal(achatRare.portefeuille.cartes.filter((id) => id === rare).length, 1);
  assert.deepEqual(achatRare.portefeuille.etal.achetees, [rare]);
  assert.equal(achatRare.portefeuille.ouvertures, 0, 'ce n’est pas un booster');
  assert.equal(achatRare.portefeuille.pitie, 0, 'et la pitié ne bouge pas');

  const achatMythique = acheterCarteDirecte({
    portefeuille: achatRare.portefeuille,
    cardId: mythique,
    collection: achatRare.portefeuille.cartes,
    graine: GRAINE,
    horloge: JOUR,
  });
  assert.equal(achatMythique.ok, true);
  assert.equal(achatMythique.prix, 300);
  assert.equal(achatMythique.portefeuille.credits, 550);
  assert.equal(achatMythique.portefeuille.cartes.filter((id) => id === mythique).length, 1);
  assert.equal(achatMythique.portefeuille.cartes.length, 2, 'deux achats donnent deux cartes, jamais un playset');
});

test('un second achat, une carte possédée ou un solde insuffisant ne débite rien', () => {
  const initial = ouvrir();
  const rare = parRarete(initial.etal, 'rare');
  const mythique = parRarete(initial.etal, 'mythique');
  const premier = acheterCarteDirecte({
    portefeuille: initial, cardId: rare, collection: initial.cartes, graine: GRAINE, horloge: JOUR,
  });
  const second = acheterCarteDirecte({
    portefeuille: premier.portefeuille,
    cardId: rare,
    collection: premier.portefeuille.cartes,
    graine: GRAINE,
    horloge: JOUR,
  });
  assert.equal(second.ok, false);
  assert.equal(second.raison, 'deja-achetee');
  assert.equal(second.portefeuille.credits, 850);
  assert.equal(second.portefeuille.cartes.filter((id) => id === rare).length, 1);

  const possedee = acheterCarteDirecte({
    portefeuille: { ...initial, cartes: [mythique] },
    cardId: mythique,
    collection: [mythique],
    graine: GRAINE,
    horloge: JOUR,
  });
  assert.equal(possedee.ok, false);
  assert.equal(possedee.raison, 'deja-possedee');
  assert.equal(possedee.portefeuille.credits, 1000);

  const pauvre = ouvrir(299);
  const refus = acheterCarteDirecte({
    portefeuille: pauvre, cardId: parRarete(pauvre.etal, 'mythique'), collection: [], graine: GRAINE, horloge: JOUR,
  });
  assert.equal(refus.ok, false);
  assert.equal(refus.raison, 'solde-insuffisant');
  assert.equal(refus.portefeuille.credits, 299);
  assert.deepEqual(refus.portefeuille.cartes, []);

  const horsEtalId = RPG_DUEL_CARDS.find((carte) => prixCarteDirecte(carte) !== null
    && !initial.etal.cartes.includes(carte.id))?.id;
  assert.ok(horsEtalId, 'le catalogue garde des cartes directes hors de cette sélection');
  const horsEtal = acheterCarteDirecte({
    portefeuille: initial, cardId: horsEtalId,
    collection: [], graine: GRAINE, horloge: JOUR,
  });
  assert.equal(horsEtal.raison, 'hors-etal');
  assert.equal(horsEtal.portefeuille.credits, 1000);
});

test('la normalisation et la fusion conservent le rafraîchissement et les achats du jour', () => {
  const propre = normaliserEtal({
    jour: '2026-10-24',
    cartes: ['scribe-de-la-liste', 'chien-du-guet', 'tarek', 'scribe-de-la-liste'],
    achetees: ['tarek', 'inconnue'],
    rafraichissements: 9,
  });
  assert.deepEqual(propre.cartes, ['scribe-de-la-liste', 'tarek']);
  assert.deepEqual(propre.achetees, ['tarek']);
  assert.equal(propre.rafraichissements, 1);

  const initial = ouvrir();
  const rare = parRarete(initial.etal, 'rare');
  const achete = acheterCarteDirecte({
    portefeuille: initial, cardId: rare, collection: [], graine: GRAINE, horloge: JOUR,
  }).portefeuille;
  const rafraichi = rafraichirEtalDuJour({ portefeuille: achete, graine: GRAINE, horloge: JOUR }).portefeuille;
  const fusion = fusionnerPortefeuilles(initial, rafraichi).portefeuille;
  assert.equal(fusion.etal.rafraichissements, 1, 'un autre appareil ne rend pas le rafraîchissement');
  assert.deepEqual(fusion.etal.cartes, rafraichi.etal.cartes);
  assert.ok(fusion.etal.achetees.includes(rare), 'l’achat de l’initial reste mémorisé après le second tirage');
  assert.equal(fusion.cartes.filter((id) => id === rare).length, 1);
});
