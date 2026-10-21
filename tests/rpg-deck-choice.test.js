import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_DECKS } from '../src/games/rpgCards.js';
import {
  chargerDeckChoisi,
  deckAdverseParDefaut,
  deckAdversePour,
  deckEstSelectionnable,
  deckParDefaut,
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

const deckParId = (id) => RPG_DECKS.find((deck) => deck.id === id);
const decksJouables = RPG_DECKS.filter(deckEstSelectionnable);

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

test('tout deck complet est sélectionnable, la Cour des Djinns comprise ; le premier deck de joueur sert de défaut', () => {
  for (const deck of RPG_DECKS) assert.equal(deckEstSelectionnable(deck), true, `${deck.name} se joue`);
  assert.equal(deckEstSelectionnable(deckParId('cour-des-djinns')), true, 'la Cour des Djinns n’est pas réservée au sorcier');
  assert.equal(deckParId('cour-des-djinns').role, 'adversaire', 'elle reste le deck que le sorcier joue par défaut');

  // Un deck qui ne tient pas les quotas, ou qui n'est pas un deck, ne se joue pas.
  assert.equal(deckEstSelectionnable(undefined), false);
  assert.equal(deckEstSelectionnable(null), false);
  assert.equal(deckEstSelectionnable({ id: 'sans-cartes' }), false);
  assert.equal(deckEstSelectionnable({ id: 'incomplet', role: 'joueur', cardIds: ['desert', 'desert'] }), false, '40 cartes exigées');
  assert.equal(deckEstSelectionnable({ id: 'quotas', cardIds: Array(40).fill('amani-des-ksour') }), false, '40 cartes, mais 2 exemplaires maximum et 40 % de terrains minimum');

  assert.equal(deckParDefaut().id, 'veilleurs-du-desert', 'le défaut est le premier deck de départ du joueur, pas le premier du catalogue');
  assert.ok(deckEstSelectionnable(deckParDefaut()));
});

test('le sorcier joue la Cour des Djinns, sauf contre elle : jamais le même deck que le joueur', () => {
  assert.equal(deckAdverseParDefaut().id, 'cour-des-djinns');
  assert.equal(deckAdversePour(deckParId('veilleurs-du-desert')).id, 'cour-des-djinns');
  assert.equal(deckAdversePour(deckParId('sentiers-de-cendre')).id, 'cour-des-djinns');
  assert.equal(deckAdversePour('sentiers-de-cendre').id, 'cour-des-djinns', 'accepte aussi un identifiant');
  assert.equal(deckAdversePour(deckParId('cour-des-djinns')).id, 'veilleurs-du-desert',
    'face à la Cour des Djinns, le sorcier prend le deck de départ du joueur');
  assert.equal(deckAdversePour('cour-des-djinns').id, 'veilleurs-du-desert');
  assert.equal(deckAdversePour(undefined).id, 'cour-des-djinns', 'sans deck de joueur, le sorcier garde son deck par défaut');
  assert.equal(deckAdversePour('deck-inconnu').id, 'cour-des-djinns');
  for (const deck of RPG_DECKS) {
    const adverse = deckAdversePour(deck);
    assert.notEqual(adverse.id, deck.id, `${deck.name} n’affronte jamais son propre deck`);
    assert.ok(deckEstSelectionnable(adverse), `${adverse.name} est un deck jouable`);
  }
  assert.ok(deckAdversePour(deckParId('veilleurs-du-desert')).affrontement, 'la carte « ADVERSAIRE » a sa phrase pour le deck par défaut du sorcier');
  assert.ok(deckAdversePour(deckParId('cour-des-djinns')).affrontement, 'et pour le deck qu’il prend face à la Cour');
});

test('le choix du deck survit à un aller-retour de sauvegarde, pour chaque deck jouable', () => {
  const { donnees, stockage } = stockageEnMemoire();
  avecStockage(stockage, () => {
    assert.equal(chargerDeckChoisi(), null, 'rien n’est choisi au premier lancement');
    for (const deck of decksJouables) {
      assert.equal(sauverDeckChoisi(deck.id), true, `${deck.name} est enregistré`);
      assert.equal(chargerDeckChoisi(), deck.id, `${deck.name} est relu au lancement suivant`);
    }
    assert.equal(donnees.get(RPG_DECK_STORAGE_KEY), JSON.stringify({ deckId: decksJouables.at(-1).id }),
      'la sauvegarde ne retient que l’identifiant du dernier deck choisi');
  });
  assert.equal(RPG_DECK_STORAGE_KEY, 'letsplay_sablier_deck_v1', 'la clé suit la convention letsplay_sablier_*_v1');
});

test('la Cour des Djinns se mémorise comme n’importe quel deck', () => {
  const { donnees, stockage } = stockageEnMemoire();
  avecStockage(stockage, () => {
    assert.equal(sauverDeckChoisi('cour-des-djinns'), true);
    assert.equal(donnees.get(RPG_DECK_STORAGE_KEY), JSON.stringify({ deckId: 'cour-des-djinns' }));
    assert.equal(chargerDeckChoisi(), 'cour-des-djinns', 'elle est relue au lancement suivant');
    assert.equal(normaliserDeckChoisi({ deckId: 'cour-des-djinns' }), 'cour-des-djinns');
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
    assert.equal(normaliserDeckChoisi({ deckId: 'sentiers-de-cendre' }), 'sentiers-de-cendre');
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

test('chaque deck connaît ses couleurs ; les hybrides en ont deux, sauf la flamme du Brûlot', () => {
  assert.deepEqual(deckColors(deckParId('veilleurs-du-desert')), ['sable']);
  assert.deepEqual(deckColors(deckParId('cour-des-djinns')), ['braise']);
  assert.deepEqual(deckColors(deckParId('sentiers-de-cendre')), ['sable', 'braise']);
  assert.deepEqual(deckColors(deckParId('maree-des-abysses')), ['eau'],
    'la Marée des abysses est mono-Eau');
  assert.deepEqual(deckColors(deckParId('serment-des-neuf-hivers')), ['neige'],
    'le deck nordique est mono-Neige');
  assert.deepEqual(deckColors(deckParId('balance-des-heures')), ['tenebres'],
    'la Balance des Heures est mono-Ténèbres');
  assert.deepEqual(deckColors(deckParId('lettres-de-marque')), ['sable', 'eau', 'braise'],
    'les Lettres de Marque sont Sable + Eau, avec la flamme du Brûlot en Braise');
  assert.deepEqual(deckColors(undefined), []);
});

test('le filtre retient les decks qui emploient la couleur, hybrides compris', () => {
  const noms = (couleur) => filtrerDecksParCouleur(RPG_DECKS, couleur).map((deck) => deck.id);
  assert.deepEqual(noms('toutes'),
    ['veilleurs-du-desert', 'cour-des-djinns', 'sentiers-de-cendre', 'maree-des-abysses', 'serment-des-neuf-hivers', 'serment-du-soleil-rouge', 'balance-des-heures', 'lettres-de-marque'],
    '« toutes » garde l’étagère complète, dans son ordre');
  assert.deepEqual(noms(undefined), noms('toutes'), 'sans choix, rien n’est filtré');
  assert.deepEqual(noms('sable'), ['veilleurs-du-desert', 'sentiers-de-cendre', 'lettres-de-marque'], 'les decks hybrides comptent pour le Sable');
  assert.deepEqual(noms('braise'), ['cour-des-djinns', 'sentiers-de-cendre', 'serment-du-soleil-rouge', 'lettres-de-marque'],
    'et aussi pour la Braise — le Brûlot est la flamme des Lettres de Marque');
  assert.deepEqual(noms('eau'), ['maree-des-abysses', 'lettres-de-marque'], 'la Marée des abysses et les Lettres de Marque couvrent l’Eau');
  assert.deepEqual(noms('neige'), ['serment-des-neuf-hivers'], 'la Neige a son deck, et lui seul');
  assert.deepEqual(noms('tenebres'), ['balance-des-heures'], 'les Ténèbres ont leur deck, et lui seul');
  assert.deepEqual(noms('hybride'), ['sentiers-de-cendre', 'lettres-de-marque'], '« hybride » garde les decks de plusieurs couleurs');
  assert.deepEqual(noms('violet'), [], 'une couleur inconnue ne retient rien');
  assert.equal(deckCorrespondCouleur(deckParId('cour-des-djinns'), 'sable'), false);
  assert.equal(deckCorrespondCouleur(deckParId('cour-des-djinns')), true);
});

test('les puces ne proposent que des couleurs qui retiennent au moins un deck', () => {
  const puces = filtresCouleurDecks(RPG_DECKS);
  assert.deepEqual(puces.map((puce) => puce.id), ['toutes', 'sable', 'braise', 'eau', 'neige', 'tenebres', 'hybride'],
    'la puce Eau apparaît avec la Marée des abysses, la Neige avec le Serment, les Ténèbres avec la Balance des Heures');
  assert.deepEqual(puces.map((puce) => puce.nombre), [8, 3, 4, 2, 1, 1, 2]);
  assert.deepEqual(puces.map((puce) => puce.couleurs), [[], ['sable'], ['braise'], ['eau'], ['neige'], ['tenebres'], ['sable', 'braise', 'eau']],
    'la puce hybride dessine les couleurs de ses decks');
  for (const puce of puces) {
    assert.equal(filtrerDecksParCouleur(RPG_DECKS, puce.id).length, puce.nombre, `la puce ${puce.id} annonce le bon nombre`);
    assert.ok(puce.nombre > 0, `la puce ${puce.id} ne mène jamais à une étagère vide`);
  }

  // Un second deck Eau ne crée pas de puce en double : il s’ajoute au compteur.
  const deckEau = { id: 'maree-haute', name: 'Marée haute', role: 'joueur', element: 'eau', cardIds: [] };
  const avecEau = filtresCouleurDecks([...RPG_DECKS, deckEau]);
  assert.deepEqual(avecEau.map((puce) => puce.id), ['toutes', 'sable', 'braise', 'eau', 'neige', 'tenebres', 'hybride']);
  assert.equal(avecEau.find((puce) => puce.id === 'eau').nombre, 3);
  assert.equal(avecEau.find((puce) => puce.id === 'toutes').nombre, 9);
  assert.deepEqual(filtresCouleurDecks([]).map((puce) => puce.id), ['toutes'], 'sans deck, seule « toutes » reste');
});
