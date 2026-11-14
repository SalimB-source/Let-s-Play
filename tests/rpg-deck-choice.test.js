import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_DECKS, RPG_DECKS_ARCHETYPES, RPG_DECKS_PRECONSTRUITS } from '../src/games/rpgCards.js';
import { composerCoffret, coffretEnDeckMaison } from '../src/games/rpgCoffretBienvenue.js';
import { RPG_DECKS_MAISON_STORAGE_KEY } from '../src/games/rpgDeckBuilder.js';
import { portefeuilleVide, rangerCoffretDansPortefeuille, exemplairesDuPortefeuille } from '../src/games/rpgCredits.js';
import { fusionnerCollections } from '../src/games/rpgCollection.js';

import {
  chargerDeckChoisi,
  deckAdverseParDefaut,
  deckAdversePour,
  deckEstSelectionnable,
  deckParDefaut,
  deckSeJoue,
  normaliserDeckChoisi,
  RPG_DECK_STORAGE_KEY,
  sauverDeckChoisi,
} from '../src/games/rpgDeckChoice.js';
import {
  deckColors,
  deckCorrespondCouleur,
  filtrerDecksParCouleur,
  filtresCouleurDecks,
} from '../src/games/rpgDeckFilter.js';

const deckParId = (id) => RPG_DECKS_ARCHETYPES.find((deck) => deck.id === id);
const decksJouables = RPG_DECKS.filter(deckEstSelectionnable);

/** Un coffret ouvert : son deck de la maison, sa collection, son stock de copies. */
function coffretOuvert(couleur = 'sable') {
  const coffret = composerCoffret(couleur);
  const bourse = rangerCoffretDansPortefeuille(portefeuilleVide(), coffret);
  return {
    coffret,
    deck: coffretEnDeckMaison(coffret),
    collection: fusionnerCollections(bourse.portefeuille.cartes),
    comptes: exemplairesDuPortefeuille(bourse.portefeuille),
  };
}

/** Remplace `localStorage` le temps d'un test, puis le rétablit. */
function avecStockage(stockage, test) {
  const precedent = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, ...stockage });
  try {
    return test();
  } finally {
    if (precedent) Object.defineProperty(globalThis, 'localStorage', precedent);
    else delete globalThis.localStorage;
  }
}

function stockageEnMemoire(donnees = new Map()) {
  return {
    donnees,
    stockage: {
      value: {
        getItem: (cle) => donnees.get(cle) ?? null,
        setItem: (cle, valeur) => donnees.set(cle, valeur),
        removeItem: (cle) => donnees.delete(cle),
      },
    },
  };
}

// ── Choix du deck : mémorisation locale ─────────────────────────────────────

test('l’étagère n’a plus de deck de base : le défaut est le deck de la maison du joueur', () => {
  // Depuis les coffrets de bienvenue, le joueur ne reçoit plus de deck
  // préconstruit : l'étagère du catalogue est vide, et ses decks sont les siens.
  assert.deepEqual(RPG_DECKS, [], 'aucun deck de base sur l’étagère');
  assert.equal(RPG_DECKS_ARCHETYPES.length, 8, 'les archétypes restent écrits pour l’IA, les leçons et le PvP');
  assert.equal(RPG_DECKS_PRECONSTRUITS.length, 12, 'les douze boîtiers, dont les quatre moteurs d’Ascension, restent distincts du casier personnel');
  assert.equal(new Set(RPG_DECKS_PRECONSTRUITS.map((deck) => deck.id)).size, 12);
  for (const deck of RPG_DECKS_PRECONSTRUITS) {
    assert.ok(deck.id.startsWith('preconstruit-'));
    assert.equal(deckSeJoue(deck, {}, {}), true, `${deck.name} se joue sans détenir toutes ses cartes`);
  }
  for (const deck of RPG_DECKS_ARCHETYPES) {
    assert.equal(deckEstSelectionnable(deck), true, `${deck.name} reste un paquet valide`);
  }

  // Un deck qui ne tient pas les quotas, ou qui n'est pas un deck, ne se joue pas.
  assert.equal(deckEstSelectionnable(undefined), false);
  assert.equal(deckEstSelectionnable(null), false);
  assert.equal(deckEstSelectionnable({ id: 'sans-cartes' }), false);
  assert.equal(deckEstSelectionnable({ id: 'incomplet', role: 'joueur', cardIds: ['desert', 'desert'] }), false, '30 cartes exigées');
  assert.equal(deckEstSelectionnable({ id: 'quotas', cardIds: Array(30).fill('amani-des-ksour') }), false, '30 cartes, mais 2 exemplaires maximum');

  // Sans aucun deck de la maison — avant le coffret — il n'y a rien à jouer.
  assert.equal(deckParDefaut(), null, 'l’écran de bienvenue est là pour ça');
  // Le deck du coffret, enregistré comme deck de la maison, devient le défaut.
  const { deck, collection, comptes } = coffretOuvert('sable');
  assert.equal(deckEstSelectionnable(deck), true);
  assert.equal(deckSeJoue(deck, collection, comptes), true,
    'le deck du coffret se joue avec sa propre collection et son stock');
  assert.equal(deckParDefaut([deck], collection, comptes).id, deck.id,
    'le premier deck de la maison qui se joue sert de défaut');
});

test('le sorcier joue la Cour des Djinns, sauf contre elle : jamais le même deck que le joueur', () => {
  assert.equal(deckAdverseParDefaut().id, 'cour-des-djinns');
  assert.equal(deckAdversePour(deckParId('veilleurs-du-desert')).id, 'cour-des-djinns');
  assert.equal(deckAdversePour(deckParId('sentiers-de-cendre')).id, 'cour-des-djinns');
  // Un deck de la maison ne change rien : le sorcier reste sur son archétype.
  assert.equal(deckAdversePour({ id: 'maison-coffret-neige', maison: true }).id, 'cour-des-djinns');
  assert.equal(deckAdversePour('sentiers-de-cendre').id, 'cour-des-djinns', 'accepte aussi un identifiant');
  assert.equal(deckAdversePour(deckParId('cour-des-djinns')).id, 'veilleurs-du-desert',
    'face à la Cour des Djinns, le sorcier prend le deck de départ du joueur');
  assert.equal(deckAdversePour('cour-des-djinns').id, 'veilleurs-du-desert');
  assert.notEqual(deckAdversePour('preconstruit-sahir').cardIds, RPG_DECKS_PRECONSTRUITS.find((deck) => deck.id === 'preconstruit-sahir').cardIds,
    'le sorcier ne prend pas les mêmes cartes que le préconstruit Sahir');
  assert.equal(deckAdversePour(undefined).id, 'cour-des-djinns', 'sans deck de joueur, le sorcier garde son deck par défaut');
  assert.equal(deckAdversePour('deck-inconnu').id, 'cour-des-djinns');
  for (const deck of RPG_DECKS_ARCHETYPES) {
    const adverse = deckAdversePour(deck);
    assert.notEqual(adverse.id, deck.id, `${deck.name} n’affronte jamais son propre paquet`);
    assert.ok(deckEstSelectionnable(adverse), `${adverse.name} est un paquet jouable`);
  }
  assert.ok(deckAdversePour(deckParId('veilleurs-du-desert')).affrontement, 'la carte « ADVERSAIRE » a sa phrase pour le deck par défaut du sorcier');
  assert.ok(deckAdversePour(deckParId('cour-des-djinns')).affrontement, 'et pour le deck qu’il prend face à la Cour');
});

test('le choix du deck survit à un aller-retour de sauvegarde', () => {
  const { donnees, stockage } = stockageEnMemoire();
  const { deck, collection, comptes } = coffretOuvert('braise');
  const second = { ...deck, id: 'maison-deuxieme', nom: 'Deuxième deck' };
  const decks = [deck, second];
  avecStockage(stockage, () => {
    assert.equal(chargerDeckChoisi(decks, collection, comptes), null, 'rien n’est choisi au premier lancement');
    for (const candidat of decks) {
      assert.equal(sauverDeckChoisi(candidat.id, decks, collection, comptes), true, `${candidat.nom} est enregistré`);
      assert.equal(chargerDeckChoisi(decks, collection, comptes), candidat.id, `${candidat.nom} est relu au lancement suivant`);
    }
    assert.equal(donnees.get(RPG_DECK_STORAGE_KEY), JSON.stringify({ deckId: decks.at(-1).id }),
      'la sauvegarde ne retient que l’identifiant du dernier deck choisi');
  });
  assert.equal(RPG_DECK_STORAGE_KEY, 'letsplay_sablier_deck_v1', 'la clé suit la convention letsplay_sablier_*_v1');
});

test('les douze préconstruits et les decks personnels sont mémorisables sans toucher au casier', () => {
  const { donnees, stockage } = stockageEnMemoire();
  const { deck, collection, comptes } = coffretOuvert('neige');
  const casierEnregistre = JSON.stringify({ decks: [deck], supprimes: [] });
  donnees.set(RPG_DECKS_MAISON_STORAGE_KEY, casierEnregistre);
  avecStockage(stockage, () => {
    assert.equal(sauverDeckChoisi('cour-des-djinns'), false, 'les identifiants historiques restent réservés à l’IA');
    assert.equal(donnees.has(RPG_DECK_STORAGE_KEY), false, 'rien n’est écrit');
    for (const theme of RPG_DECKS_PRECONSTRUITS) {
      assert.equal(sauverDeckChoisi(theme.id, [deck], collection, comptes), true);
      assert.equal(chargerDeckChoisi([deck], collection, comptes), theme.id);
    }
    assert.equal(sauverDeckChoisi(deck.id, [deck], collection, comptes), true);
    assert.equal(donnees.get(RPG_DECK_STORAGE_KEY), JSON.stringify({ deckId: deck.id }));
    assert.equal(chargerDeckChoisi([deck], collection, comptes), deck.id, 'le deck personnel est toujours relu au lancement suivant');
    assert.equal(donnees.get(RPG_DECKS_MAISON_STORAGE_KEY), casierEnregistre,
      'choisir un thème ne modifie ni ne supprime le casier personnel');
  });
});

test('un deck inconnu ou une sauvegarde illisible n’est ni enregistré ni relu', () => {
  const { donnees, stockage } = stockageEnMemoire();
  avecStockage(stockage, () => {
    assert.equal(sauverDeckChoisi('deck-inconnu'), false);
    assert.equal(sauverDeckChoisi(undefined), false);
    assert.equal(sauverDeckChoisi({ deckId: 'veilleurs-du-desert' }), false, 'seul un identifiant est accepté');
    assert.equal(donnees.has(RPG_DECK_STORAGE_KEY), false, 'aucune de ces tentatives n’écrit quoi que ce soit');

    // Une sauvegarde venue d'un autre catalogue ou éditée à la main est ignorée.
    for (const valeur of [
      JSON.stringify({ deckId: 'deck-supprime' }),
      JSON.stringify({ deckId: 42 }),
      JSON.stringify({ deckId: null }),
      JSON.stringify({}),
      JSON.stringify(['sentiers-de-cendre']),
      JSON.stringify('sentiers-de-cendre'),
      'null',
      '{corrompu',
      '',
    ]) {
      donnees.set(RPG_DECK_STORAGE_KEY, valeur);
      assert.equal(chargerDeckChoisi(), null, `sauvegarde ignorée : ${valeur || '(vide)'}`);
    }
    assert.equal(normaliserDeckChoisi({ deckId: 'sentiers-de-cendre' }), null,
      'un ancien identifiant de catalogue n’existe plus sur l’étagère');
    assert.equal(normaliserDeckChoisi(null), null);
    assert.equal(normaliserDeckChoisi(undefined), null);
  });
});

test('le choix se lit et s’écrit sans planter quand le stockage est indisponible', () => {
  avecStockage({ get() { throw new Error('mode privé'); } }, () => {
    assert.equal(chargerDeckChoisi(), null);
    assert.equal(sauverDeckChoisi('sentiers-de-cendre'), false);
  });
  avecStockage({
    value: {
      getItem: () => { throw new Error('lecture refusée'); },
      setItem: () => { throw new Error('quota dépassé'); },
    },
  }, () => {
    assert.equal(chargerDeckChoisi(), null, 'une lecture qui échoue retombe sur le deck par défaut');
    assert.equal(sauverDeckChoisi('sentiers-de-cendre'), false, 'une écriture refusée est signalée, sans exception');
  });
  avecStockage({ value: null }, () => {
    assert.equal(chargerDeckChoisi(), null);
    assert.equal(sauverDeckChoisi('sentiers-de-cendre'), false);
  });
});

// ── Filtre par couleur ──────────────────────────────────────────────────────

test('les huit archétypes préconstruits sont bicolores et leur identité correspond aux cartes', () => {
  const attendues = {
    'veilleurs-du-desert': ['sable', 'neige'], 'cour-des-djinns': ['sable', 'braise'],
    'sentiers-de-cendre': ['sable', 'tenebres'], 'maree-des-abysses': ['neige', 'eau'],
    'serment-des-neuf-hivers': ['neige', 'eau'], 'serment-du-soleil-rouge': ['neige', 'braise'],
    'balance-des-heures': ['neige', 'tenebres'], 'lettres-de-marque': ['sable', 'eau'],
  };
  for (const [id, couleurs] of Object.entries(attendues)) assert.deepEqual(deckColors(deckParId(id)), couleurs, id);
  assert.deepEqual(deckColors(undefined), []);
});

test('les filtres trouvent chaque couleur des decks et aucun deck hors de la couleur', () => {
  const tous = RPG_DECKS_ARCHETYPES.map((deck) => deck.id);
  assert.deepEqual(filtrerDecksParCouleur(RPG_DECKS_ARCHETYPES).map((deck) => deck.id), tous);
  for (const couleur of ['sable', 'braise', 'eau', 'neige', 'tenebres']) {
    const retenus = filtrerDecksParCouleur(RPG_DECKS_ARCHETYPES, couleur);
    assert.ok(retenus.length > 0, couleur);
    assert.ok(retenus.every((deck) => deckColors(deck).includes(couleur)), couleur);
    for (const deck of RPG_DECKS_ARCHETYPES) {
      assert.equal(deckCorrespondCouleur(deck, couleur), deckColors(deck).includes(couleur), deck.id);
    }
  }
  assert.deepEqual(filtrerDecksParCouleur(RPG_DECKS_ARCHETYPES, 'hybride').map((deck) => deck.id), tous);
  assert.deepEqual(filtrerDecksParCouleur(RPG_DECKS_ARCHETYPES, 'violet'), []);
});

test('les puces comptent correctement toutes les couleurs des douze préconstruits', () => {
  const puces = filtresCouleurDecks(RPG_DECKS_ARCHETYPES);
  assert.deepEqual(puces.map((puce) => puce.id), ['toutes', 'sable', 'braise', 'eau', 'neige', 'tenebres', 'hybride']);
  assert.deepEqual(puces.map((puce) => puce.nombre), [8, 4, 2, 3, 5, 2, 8]);
  assert.deepEqual(puces.at(-1).couleurs, ['sable', 'braise', 'eau', 'neige', 'tenebres']);
  for (const puce of puces) {
    assert.equal(filtrerDecksParCouleur(RPG_DECKS_ARCHETYPES, puce.id).length, puce.nombre);
  }
  const deckEau = { id: 'maree-haute', name: 'Marée haute', element: 'eau', cardIds: [] };
  const avecEau = filtresCouleurDecks([...RPG_DECKS_ARCHETYPES, deckEau]);
  assert.equal(avecEau.find((puce) => puce.id === 'eau').nombre, 4);
  assert.equal(avecEau.find((puce) => puce.id === 'toutes').nombre, 9);
  assert.deepEqual(filtresCouleurDecks([]).map((puce) => puce.id), ['toutes']);
});
