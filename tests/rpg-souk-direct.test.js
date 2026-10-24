import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRIX_CARTE_DIRECTE,
  SOUK_DIRECT_REGLES,
  acheterCarteDirecte,
  ouvrirEtalDuJour,
  prixCarteDirecte,
  rafraichirEtalDuJour,
  stockDeLaCarte,
  tirageEtal,
  vueCarteDeEtal,
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
  assert.deepEqual(PRIX_CARTE_DIRECTE, { inhabituelle: 80, rare: 150, mythique: 300 });
  assert.equal(SOUK_DIRECT_REGLES.cartesParJour, 5);
  assert.equal(SOUK_DIRECT_REGLES.rafraichissementsParJour, 1);
  assert.equal(prixCarteDirecte('scribe-de-la-liste'), 150);
  assert.equal(prixCarteDirecte('tarek'), 300);
  assert.equal(prixCarteDirecte('chien-du-guet'), null);
  assert.equal(prixCarteDirecte('carte-inconnue'), null);
});

test('l’inhabituelle se vend, la commune non — et la commune gardée au playset', () => {
  // Le palier à 80 ◈ existe parce que le deck compte le stock : une inhabituelle
  // hors dotation achetée une fois doit pouvoir être payée deux fois.
  const inhabituelle = RPG_DUEL_CARDS.find((carte) => cardRarityInfo(carte).key === 'inhabituelle'
    && carte.kind !== 'terrain');
  assert.ok(inhabituelle, 'le catalogue compte des inhabituelles');
  assert.equal(prixCarteDirecte(inhabituelle.id), 80);
  // Une commune ne s’achète pas : son second exemplaire vient du playset, pas d’une caisse.
  const commune = RPG_DUEL_CARDS.find((carte) => cardRarityInfo(carte).key === 'commune' && carte.kind !== 'terrain');
  assert.equal(prixCarteDirecte(commune.id), null);
});

test('cinq cartes distinctes sont proposées, avec les trois raretés et un tirage stable', () => {
  const premier = tirageEtal({ jour: '2026-10-24', graine: GRAINE });
  assert.equal(premier.length, 5);
  assert.equal(new Set(premier).size, 5);
  assert.deepEqual(premier, tirageEtal({ jour: '2026-10-24', graine: GRAINE }), 'recharger ne relance pas le dé');
  assert.notDeepEqual(premier, tirageEtal({ jour: '2026-10-25', graine: GRAINE }), 'le lendemain propose une autre sélection');
  const raretes = new Set(premier.map((id) => cardRarityInfo(cardById(id)).key));
  assert.deepEqual([...raretes].sort(), ['inhabituelle', 'mythique', 'rare']);
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

  // Une carte déjà possédée n'est plus un refus sans nuance : elle reste
  // achetable **tant que le quota du deck n'est pas atteint**. Une mythique,
  // elle, est unique dans un deck — c'est la seule carte qu'un second achat
  // ne peut pas acheter, et la raison le dit au lieu de mentir.
  const possedee = acheterCarteDirecte({
    portefeuille: { ...initial, cartes: [mythique] },
    cardId: mythique,
    collection: [mythique],
    graine: GRAINE,
    horloge: JOUR,
  });
  assert.equal(possedee.ok, false);
  assert.equal(possedee.raison, 'quota-atteint');
  assert.equal(possedee.acquis, 1);
  assert.equal(possedee.limite, 1);
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

/**
 * Le lendemain, sans relancer le dé : la journée change et le garde-fou des
 * achats se vide, mais les cinq offres restent les mêmes. C’est ce qu’on veut
 * mesurer ici — la **seconde copie**, pas le tirage.
 */
const jourSuivant = (portefeuille) => ({
  ...portefeuille,
  etal: { ...portefeuille.etal, jour: '2026-10-25', achetees: [] },
});

test("la seconde copie d'une rare s'achète, la troisième non", () => {
  const initial = ouvrir();
  const rare = parRarete(initial.etal, 'rare');
  assert.ok(rare);

  const premier = acheterCarteDirecte({
    portefeuille: initial, cardId: rare, collection: initial.cartes, graine: GRAINE, horloge: JOUR,
  });
  assert.equal(premier.ok, true);
  assert.equal(premier.exemplaires, 1, 'un achat vend un exemplaire');
  assert.equal(premier.acquis, 1);
  assert.equal(premier.limite, 2, 'une rare a droit à deux exemplaires au deck');
  assert.equal(premier.complet, false);
  assert.deepEqual(premier.portefeuille.exemplaires, {}, 'le premier exemplaire reste la valeur implicite');
  assert.equal(premier.portefeuille.credits, 850);

  const avecSeconde = acheterCarteDirecte({
    portefeuille: jourSuivant(premier.portefeuille),
    cardId: rare,
    collection: premier.portefeuille.cartes,
    graine: GRAINE,
    horloge: LENDEMAIN,
  });
  assert.equal(avecSeconde.ok, true, 'un exemplaire sur deux veut dire qu’il en manque un');
  assert.equal(avecSeconde.prix, 150, 'la seconde copie se paie au même prix');
  assert.equal(avecSeconde.acquis, 2);
  assert.equal(avecSeconde.complet, true);
  assert.deepEqual(avecSeconde.portefeuille.exemplaires, { [rare]: 2 }, 'le stock écrit la seconde copie');
  assert.equal(avecSeconde.portefeuille.credits, 700);
  assert.equal(avecSeconde.portefeuille.cartes.filter((id) => id === rare).length, 1,
    'la possession reste un ensemble : c’est le stock qui compte');

  const enTrop = acheterCarteDirecte({
    portefeuille: jourSuivant(avecSeconde.portefeuille),
    cardId: rare,
    collection: avecSeconde.portefeuille.cartes,
    exemplaires: avecSeconde.portefeuille.exemplaires,
    graine: GRAINE,
    horloge: JOUR,
  });
  assert.equal(enTrop.ok, false);
  assert.equal(enTrop.raison, 'quota-atteint');
  assert.equal(enTrop.portefeuille.credits, 700, 'refus = aucun débit, pas même partiel');
  assert.deepEqual(enTrop.portefeuille.exemplaires, { [rare]: 2 }, 'et le stock ne bouge pas');
});

test('une carte héritée des Tours compte déjà son exemplaire', () => {
  const initial = ouvrir();
  const rare = parRarete(initial.etal, 'rare');
  // Possédée hors du Souk : la collection la connaît, `portefeuille.cartes` non.
  const achat = acheterCarteDirecte({
    portefeuille: initial, cardId: rare, collection: [rare], exemplaires: {}, graine: GRAINE, horloge: JOUR,
  });
  assert.equal(achat.ok, true);
  assert.equal(achat.acquis, 2, 'la copie héritée et celle qui vient d’être payée');
  assert.equal(achat.complet, true, 'et la carte est dès lors au quota');
  assert.deepEqual(achat.portefeuille.exemplaires, { [rare]: 2 });
  assert.equal(achat.portefeuille.cartes.filter((id) => id === rare).length, 1,
    'le portefeuille range la carte, une fois, comme n’importe quel achat');
  assert.equal(achat.portefeuille.credits, 850);
});

test('la vue de l’étal nomme l’exemplaire manquant au lieu d’un « déjà obtenu »', () => {
  const initial = ouvrir();
  const rare = parRarete(initial.etal, 'rare');
  const mythique = parRarete(initial.etal, 'mythique');

  const neuve = vueCarteDeEtal({ id: rare, collection: [], exemplaires: {}, credits: 1000 });
  assert.equal(neuve.etat, 'disponible');
  assert.equal(neuve.manquante, true);
  assert.equal(neuve.acquis, 0);
  assert.equal(neuve.limite, 2);
  assert.equal(neuve.reste, 2);

  const uneCopie = vueCarteDeEtal({ id: rare, collection: [rare], exemplaires: {}, credits: 1000 });
  assert.equal(uneCopie.etat, 'disponible', 'un exemplaire sur deux : la seconde copie est en vente');
  assert.equal(uneCopie.manquante, false);
  assert.equal(uneCopie.possedee, true);
  assert.equal(uneCopie.reste, 1);
  assert.equal(uneCopie.achatPossible, true);

  const complete = vueCarteDeEtal({ id: rare, collection: [rare], exemplaires: { [rare]: 2 }, credits: 1000 });
  assert.equal(complete.etat, 'complet');
  assert.equal(complete.achatPossible, false);
  assert.equal(complete.reste, 0);

  const unique = vueCarteDeEtal({ id: mythique, collection: [mythique], exemplaires: {}, credits: 1000 });
  assert.equal(unique.limite, 1, 'une mythique est unique dans un deck');
  assert.equal(unique.etat, 'complet', 'la posséder la complète : rien de plus à payer');

  const duJour = vueCarteDeEtal({ id: rare, collection: [], exemplaires: {}, credits: 1000, acheteAujourdhui: true });
  assert.equal(duJour.etat, 'achetee', 'le garde-fou du jour passe avant toute autre lecture');

  const sansSolde = vueCarteDeEtal({ id: mythique, collection: [], exemplaires: {}, credits: 299 });
  assert.equal(sansSolde.etat, 'sans-solde');
  assert.equal(sansSolde.manque, 1, 'et l’écran sait dire ce qui manque');

  assert.equal(vueCarteDeEtal({ id: 'carte-inconnue', collection: [], exemplaires: {}, credits: 0 }), null);
  assert.equal(vueCarteDeEtal({ id: 'chien-du-guet', collection: [], exemplaires: {}, credits: 1000 }), null,
    'une carte que l’étal ne vend pas n’a pas de vue : rien à afficher, rien à facturer');
  assert.deepEqual(stockDeLaCarte('carte-inconnue', {}), {
    carte: null, possedee: false, acquis: 0, limite: 0, reste: 0, complet: true,
  }, 'une carte hors catalogue n’est jamais achetable');
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
