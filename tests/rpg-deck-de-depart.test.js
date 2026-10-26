/**
 * Le deck de départ — celui qui fait qu'un joueur n'arrive jamais devant une
 * table vide maintenant que l'étagère du catalogue est vide.
 *
 * Ce que ces tests protègent :
 *   1. le deck du coffret est **reposé** quand il manque, à l'identique ;
 *   2. un joueur qui n'a qu'une collection reçoit un deck **composé**, valide ;
 *   3. une collection trop mince ne fabrique pas un deck bancal ;
 *   4. une **pierre tombale** n'est jamais contredite ;
 *   5. le rattrapage est **idempotent** (rien à faire au deuxième démarrage).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { cardById, rpgValiderDeck, RPG_DECKS } from '../src/games/rpgCards.js';
import { composerCoffret, sauverOffreBienvenue } from '../src/games/rpgCoffretBienvenue.js';
import { COLLECTION_DEPART, fusionnerCollections } from '../src/games/rpgCollection.js';
import { exemplairesDuPortefeuille, portefeuilleVide, rangerCoffretDansPortefeuille } from '../src/games/rpgCredits.js';
import {
  couleursDominantes,
  deckDeDepartDepuisCollection,
  garantirDeckDeDepart,
  idDeckDeCoffret,
  RPG_DECK_DEPART_ID,
} from '../src/games/rpgDeckDeDepart.js';
import { deckSeJoue } from '../src/games/rpgDeckChoice.js';

const CASIER_VIDE = { decks: [], supprimes: [] };

/** Un `localStorage` en mémoire, le temps d'un test. */
function avecStockage(test) {
  const donnees = new Map();
  const precedent = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (cle) => donnees.get(cle) ?? null,
      setItem: (cle, valeur) => donnees.set(cle, String(valeur)),
      removeItem: (cle) => donnees.delete(cle),
    },
  });
  try {
    return test(donnees);
  } finally {
    if (precedent) Object.defineProperty(globalThis, 'localStorage', precedent);
    else delete globalThis.localStorage;
  }
}

/** Le coffret est choisi sur cet appareil (l'offre de bienvenue est écrite). */
function choisirCoffret(couleur = 'neige') {
  const coffret = composerCoffret(couleur);
  const autres = ['sable', 'braise', 'eau']
    .filter((autre) => autre !== couleur)
    .slice(0, 2)
    .map((autre) => composerCoffret(autre));
  sauverOffreBienvenue({ coffrets: [coffret, ...autres], choisi: coffret.id });
  return coffret;
}

/** La collection et le stock d'un coffret ouvert, comme le fait l'écran. */
function collectionDuCoffret(coffret) {
  const { portefeuille } = rangerCoffretDansPortefeuille(portefeuilleVide(), coffret);
  return {
    collection: fusionnerCollections(portefeuille.cartes),
    comptes: exemplairesDuPortefeuille(portefeuille),
  };
}

test('le deck du coffret est reposé quand il manque, trente cartes à l’identique', () => {
  avecStockage(() => {
    const coffret = choisirCoffret('neige');
    const { collection, comptes } = collectionDuCoffret(coffret);
    const { casier, cree } = garantirDeckDeDepart({ casier: CASIER_VIDE, collection });

    assert.equal(RPG_DECK_DEPART_ID, 'maison-de-depart');
    assert.equal(idDeckDeCoffret(coffret), 'maison-coffret-neige');
    assert.equal(cree?.id, 'maison-coffret-neige');
    assert.equal(cree?.maison, true);
    assert.deepEqual(cree.cardIds, coffret.cardIds, 'les mêmes cartes, dans le même ordre');
    assert.equal(casier.decks.length, 1, 'le casier reçoit le deck');
    assert.equal(deckSeJoue(cree, collection, comptes), true, 'et il se joue tout de suite');
  });
});

test('sans coffret, un joueur qui n’a que sa collection reçoit un premier deck composé', () => {
  avecStockage(() => {
    const collection = fusionnerCollections(COLLECTION_DEPART);
    const { casier, cree } = garantirDeckDeDepart({ casier: CASIER_VIDE, collection });

    assert.equal(cree?.id, RPG_DECK_DEPART_ID);
    assert.equal(cree?.maison, true, 'un deck de la maison : il vit dans le casier, pas sur l’étagère');
    assert.equal(cree?.cardIds.length, 30);
    assert.equal(rpgValiderDeck(cree.cardIds).ok, true, 'valide, pas « presque »');
    assert.ok((cree.elements ?? []).length <= 2, 'deux couleurs au plus');
    for (const id of cree.cardIds) assert.ok(collection.includes(id), `${id} est bien possédé`);
    assert.equal(casier.decks.length, 1);
    assert.deepEqual(RPG_DECKS, [], 'aucun deck de base n’est venu s’ajouter');
  });
});

test('les couleurs dominantes d’une collection : les deux plus fournies, dans l’ordre du jeu', () => {
  const collection = fusionnerCollections(COLLECTION_DEPART);
  const couleurs = couleursDominantes(collection);
  assert.ok(couleurs.length >= 1 && couleurs.length <= 2);
  // Deux couleurs au plus, et jamais une couleur absente de la collection.
  for (const couleur of couleurs) {
    assert.ok(collection.some((id) => cardById(id) && (cardById(id).elements ?? [cardById(id).element]).includes(couleur)));
  }
  assert.deepEqual(couleursDominantes([]), [], 'collection vide : aucune couleur');
});

test('une collection trop mince ne fabrique pas un deck bancal', () => {
  const rares = ['sonneur-fele', 'tour-de-sable'];
  assert.equal(deckDeDepartDepuisCollection(rares), null, 'deux cartes ne font pas un deck');
  assert.equal(garantirDeckDeDepart({ casier: CASIER_VIDE, collection: [] }).cree, null);
  assert.equal(garantirDeckDeDepart({ casier: CASIER_VIDE, collection: rares }).cree, null);
});

test('une pierre tombale n’est jamais contredite', () => {
  avecStockage(() => {
    const coffret = choisirCoffret('eau');
    const { collection } = collectionDuCoffret(coffret);
    const { cree } = garantirDeckDeDepart({ casier: CASIER_VIDE, collection });
    // Un deck supprimé quitte le casier et laisse sa pierre tombale.
    const casier = { decks: [], supprimes: [cree.id] };
    const apres = garantirDeckDeDepart({ casier, collection });
    assert.equal(apres.cree, null, 'le deck supprimé ne revient pas — et rien ne le remplace');
    assert.deepEqual(apres.casier.decks, [], 'supprimer un deck ne doit pas en créer un autre');
  });
});

test('le rattrapage est idempotent : au deuxième démarrage, il n’y a plus rien à faire', () => {
  avecStockage(() => {
    const coffret = choisirCoffret('braise');
    const { collection } = collectionDuCoffret(coffret);
    const premier = garantirDeckDeDepart({ casier: CASIER_VIDE, collection });
    const second = garantirDeckDeDepart({ casier: premier.casier, collection });
    assert.equal(second.cree, null);
    assert.equal(second.casier, premier.casier, 'le casier est rendu tel quel, sans réécriture');
    assert.equal(second.casier.decks.length, 1);
  });
});

test('si la collection du coffret n’est pas encore descendue, le deck composé prend le relais', () => {
  avecStockage(() => {
    const coffret = choisirCoffret('sable');
    // L'appareil connaît le coffret, mais la collection locale ne contient que
    // la dotation d'avant : les trente cartes du coffret n'y sont pas.
    const collection = fusionnerCollections(COLLECTION_DEPART).filter((id) => !coffret.cardIds.includes(id));
    const { cree } = garantirDeckDeDepart({ casier: CASIER_VIDE, collection });
    assert.equal(cree?.id, RPG_DECK_DEPART_ID, 'un deck jouable maintenant vaut mieux qu’un deck en attente');
    assert.equal(rpgValiderDeck(cree.cardIds).ok, true);
  });
});

test('sans le moindre coffret connu, le dernier recours reste vide — l’atelier fera le reste', () => {
  avecStockage(() => {
    const { cree } = garantirDeckDeDepart({ casier: CASIER_VIDE, collection: [] });
    assert.equal(cree, null);
  });
});
