import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_DUEL_CARDS, cardById, cardCopyLimit } from '../src/games/rpgCards.js';
import { tousLesEtages } from '../src/games/rpgStoryTours.js';
import {
  COLLECTION_DEPART,
  RPG_RECOMPENSES_PAR_ETAGE,
  carteDebloqueePar,
  collectionDepuisEtages,
  collectionJoueur,
  exemplairesPossedables,
  fusionnerCollections,
  normaliserCollection,
  possedeCarte,
  recompenseEtage,
  sauverCollectionDistante,
  chargerCollectionDistante,
  RPG_COLLECTION_STORAGE_KEY,
} from '../src/games/rpgCollection.js';

const idsCatalogue = () => RPG_DUEL_CARDS.map((carte) => carte.id).sort();

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

// ── La dotation de départ ────────────────────────────────────────────────────

test('la dotation de départ tient la règle : communes et inhabituelles, jamais de rare', () => {
  assert.equal(COLLECTION_DEPART.length, 33, 'les 29 cartes initiales plus 4 variantes communes de terrain sont possédées d\'entrée');
  for (const id of COLLECTION_DEPART) {
    const carte = cardById(id);
    assert.ok(carte, `${id} existe au catalogue`);
    assert.ok(['commune', 'inhabituelle'].includes(carte.rarity), `${id} est ${carte.rarity}`);
  }
  // Pétra et sa variante rare se débloquent ; les terrains de base et leurs
  // variantes communes appartiennent à tous.
  assert.equal(possedeCarte(COLLECTION_DEPART, 'petra'), false, 'Pétra se débloque');
  assert.equal(possedeCarte(COLLECTION_DEPART, 'petra-des-deux-sources'), false, 'la variante rare de Pétra se débloque aussi');
  for (const terrain of ['desert', 'dunes-du-tenere', 'mer', 'lagune-des-salines',
    'montagne', 'cretes-de-cendre', 'glacier', 'glacier-des-arches']) {
    assert.equal(possedeCarte(COLLECTION_DEPART, terrain), true, `${terrain} appartient à tous`);
  }
});

// ── Les récompenses d'étage ──────────────────────────────────────────────────

test('chaque récompense nomme des cartes réelles, hors dotation, sans doublon', () => {
  const toutes = Object.values(RPG_RECOMPENSES_PAR_ETAGE).flat();
  for (const id of toutes) {
    assert.ok(cardById(id), `${id} existe au catalogue`);
    assert.equal(possedeCarte(COLLECTION_DEPART, id), false, `${id} n'est pas donné d'entrée`);
  }
  assert.equal(new Set(toutes).size, toutes.length, 'aucune carte dans deux étages');
});

test('dotation + récompenses couvrent tout le catalogue : aucune carte inconquisable', () => {
  const couverture = fusionnerCollections(COLLECTION_DEPART, ...Object.values(RPG_RECOMPENSES_PAR_ETAGE));
  assert.deepEqual(couverture.sort(), idsCatalogue());
});

test('les récompenses portent sur des étages connus des Tours de Bab El', () => {
  const connus = new Set(tousLesEtages().map(({ etage }) => etage.id));
  for (const etageId of Object.keys(RPG_RECOMPENSES_PAR_ETAGE)) {
    assert.ok(connus.has(etageId), `${etageId} est un étage de la campagne`);
  }
});

test('chaque étage débloqué nomme son étage et sa tour', () => {
  const deblocage = carteDebloqueePar('kraken');
  assert.equal(deblocage.etageId, 'abysses-1');
  assert.equal(typeof deblocage.etage, 'string');
  assert.equal(deblocage.tour, 'La Tour des Abysses');
  assert.equal(carteDebloqueePar('chien-du-guet'), null, 'une carte de la dotation ne se débloque nulle part');
  assert.equal(carteDebloqueePar('carte-inconnue'), null);
});

// ── Ce que le joueur possède, étage après étage ─────────────────────────────

test('la collection suit les étages déblayés et ne régresse jamais', () => {
  const apresListes5 = collectionJoueur({ etagesVaincus: ['listes-1', 'listes-5'] });
  assert.equal(possedeCarte(apresListes5, 'cavalier-amazigh-du-desert'), true, 'récompense de listes-1');
  assert.equal(possedeCarte(apresListes5, 'tarek'), true, 'récompense de listes-5');
  assert.equal(possedeCarte(apresListes5, 'kraken'), false, 'les Abysses sont encore devant');
  const apresAbysses = collectionJoueur({ etagesVaincus: ['listes-1', 'listes-5', 'abysses-1'] });
  assert.equal(possedeCarte(apresAbysses, 'kraken'), true);
  assert.equal(collectionDepuisEtages([]).length, 0);
  assert.equal(collectionDepuisEtages('pas une liste').length, 0);
});

test('une couleur ouvre à peu près quand la campagne y entre (pacing des récompenses)', () => {
  // Une couleur est jouable en mono quand ses références possédées, multipliées
  // par leur quota, couvrent les 24 cartes non-terrain d'un deck de 40.
  const slots = (collection, element) => collection
    .map((id) => cardById(id))
    .filter((carte) => carte && carte.kind !== 'terrain' && carte.element === element)
    .reduce((total, carte) => total + cardCopyLimit(carte), 0);

  const depart = collectionJoueur({ etagesVaincus: [] });
  assert.ok(slots(depart, 'sable') >= 24, 'le mono-Sable se compose dès le départ');
  assert.ok(slots(depart, 'braise') < 24, 'le mono-Braise se gagne');
  assert.ok(slots(depart, 'eau') < 24, 'le mono-Eau se gagne');
  assert.ok(slots(depart, 'neige') < 24, 'le mono-Neige se gagne');

  const apresListes = collectionJoueur({ etagesVaincus: ['listes-1', 'listes-2', 'listes-3', 'listes-4', 'listes-5'] });
  assert.ok(slots(apresListes, 'braise') < 24, 'la Braise n\'est pas complète au bout de la première tour');

  // Le Souk épaissit la Braise (13 → 19 exemplaires entre la première tour et
  // son sommet) mais ne l'ouvre pas en mono : la réserve de Braise du catalogue
  // entier — références multipliées par leurs quotas — culmine sous les 24
  // emplacements non-terrain d'un deck de 40, donc la Braise ne peut pas se
  // jouer seule, quoi que le joueur gagne. C'est une couleur de paire : le
  // catalogue lui-même la marie au Sable dans « Sentiers de cendre ».
  const apresSouk4 = collectionJoueur({ etagesVaincus: ['listes-1', 'listes-2', 'listes-3', 'listes-4', 'listes-5', 'souk-1', 'souk-2', 'souk-3', 'souk-4'] });
  assert.ok(slots(apresSouk4, 'braise') > slots(apresListes, 'braise'), 'le Souk étoffe la Braise');
  assert.ok(slots(RPG_DUEL_CARDS.map((carte) => carte.id), 'braise') < 24,
    'la Braise ne remplit jamais un deck à elle seule : sa réserve totale reste sous les 24 emplacements non-terrain');

  const apresSouk2 = collectionJoueur({ etagesVaincus: ['listes-1', 'listes-2', 'listes-3', 'listes-4', 'listes-5', 'souk-1', 'souk-2'] });
  assert.ok(slots(apresSouk2, 'eau') >= 24, 'le mono-Eau s\'ouvre par les citernes de la Gardienne');

  const apresAbysses4 = collectionJoueur({
    etagesVaincus: ['listes-1', 'listes-2', 'listes-3', 'listes-4', 'listes-5', 'souk-1', 'souk-2', 'souk-3', 'souk-4', 'sables-1', 'sables-2', 'sables-3', 'abysses-1', 'abysses-2', 'abysses-3', 'abysses-4'],
  });
  assert.ok(slots(apresAbysses4, 'neige') >= 24, 'le mono-Neige est prêt en entrant dans le Fjord');
});

// ── Normalisation, fusion, quotas ────────────────────────────────────────────

test('normaliserCollection écarte l\'inconnu et les doublons, sans réordonner', () => {
  assert.deepEqual(normaliserCollection(['chien-du-guet', 'chien-du-guet', 'inconnue', 'ressac']), ['chien-du-guet', 'ressac']);
  assert.deepEqual(normaliserCollection(null), []);
  assert.deepEqual(normaliserCollection('chien-du-guet'), []);
});

test('fusionnerCollections est une union monotone et sans doublon', () => {
  const fusion = fusionnerCollections(['chien-du-guet', 'ressac'], ['ressac', 'kraken'], null, ['inconnue']);
  assert.deepEqual(fusion, ['chien-du-guet', 'ressac', 'kraken']);
});

test('exemplairesPossedables suit les quotas de rareté et la possession', () => {
  assert.equal(exemplairesPossedables(COLLECTION_DEPART, 'chien-du-guet'), 3, 'commune : trois exemplaires');
  assert.equal(exemplairesPossedables(COLLECTION_DEPART, 'kraken'), 0, 'verrouillée : rien');
  const avecKraken = fusionnerCollections(COLLECTION_DEPART, ['kraken']);
  assert.equal(exemplairesPossedables(avecKraken, 'kraken'), 1, 'mythique : un exemplaire');
  assert.equal(exemplairesPossedables(COLLECTION_DEPART, 'petra'), 0, 'Pétra verrouillée au départ');
});

test('recompenseEtage rend les cartes d\'un étage, rien pour un étage inconnu', () => {
  assert.deepEqual(recompenseEtage('listes-1'), ['cavalier-amazigh-du-desert', 'scribe-de-la-liste']);
  assert.deepEqual(recompenseEtage('listes-4'), ['petra', 'petra-des-deux-sources']);
  assert.deepEqual(recompenseEtage('etage-fantome'), []);
});

// ── Cache des apports du compte ──────────────────────────────────────────────

test('les apports du compte se mettent en cache et relisent toléramment', () => {
  const cache = stockageEnMemoire();
  avecStockage({ value: cache.stockage.value }, () => {
    assert.deepEqual(chargerCollectionDistante(), [], 'rien en cache au départ');
    assert.equal(sauverCollectionDistante(['kraken', 'kraken', 'inconnue']), true);
    assert.deepEqual(chargerCollectionDistante(), ['kraken']);
    cache.donnees.set(RPG_COLLECTION_STORAGE_KEY, '{ cassé');
    assert.deepEqual(chargerCollectionDistante(), [], 'un cache corrompu rend une liste vide');
  });
});
