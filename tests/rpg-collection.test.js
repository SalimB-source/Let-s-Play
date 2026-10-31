import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_DUEL_CARDS, cardById, cardColors, cardCopyLimit } from '../src/games/rpgCards.js';
import { tousLesEtages } from '../src/games/rpgStoryTours.js';
import { prixCarteDirecte } from '../src/games/rpgSoukDirect.js';
import {
  COLLECTION_DEPART,
  RPG_ACQUIS_STORAGE_KEY,
  RPG_COLLECTION_STORAGE_KEY,
  RPG_REVELATIONS_PAR_ETAGE,
  acquisVide,
  carteEnPlayset,
  carteReveleePar,
  plafondVisible,
  cartesReveleesParEtage,
  chargerAcquis,
  chargerCollectionDistante,
  collectionJoueur,
  exemplairesPossedables,
  lireExemplaire,
  nombreExemplaires,
  figerAcquisitions,
  fusionnerAcquisitions,
  fusionnerCollections,
  normaliserAcquis,
  normaliserCollection,
  possedeCarte,
  revelationsDepuisEtages,
  sauverAcquis,
  sauverCollectionDistante,
} from '../src/games/rpgCollection.js';

// La collection couvre tout le catalogue : la Balance des Heures est désormais
// au Souk via la Nécropole, la dotation exclut toujours ses communes.
const idsCatalogue = () => RPG_DUEL_CARDS
  .map((carte) => carte.id)
  .sort();

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
  assert.equal(COLLECTION_DEPART.length, 59, 'la dotation : les Tours de défense communes ou inhabituelles, la Hache de la banquise et Brise-lame, sans les terrains retirés');
  for (const id of COLLECTION_DEPART) {
    const carte = cardById(id);
    assert.ok(carte, `${id} existe au catalogue`);
    assert.ok(['commune', 'inhabituelle'].includes(carte.rarity), `${id} est ${carte.rarity}`);
  }
  for (const tour of ['tour-de-braise', 'tour-des-flots', 'tour-de-sable']) {
    assert.equal(possedeCarte(COLLECTION_DEPART, tour), true, `${tour} est une carte de collection dès le départ`);
  }
  assert.equal(possedeCarte(COLLECTION_DEPART, 'tour-de-neige'), false, 'la Tour de Neige se révèle au Fjord');
});

// ── Les révélations d'étage : la carte de la ville ───────────────────────────

test('chaque révélation nomme des cartes réelles, hors dotation, sans doublon', () => {
  const toutes = Object.values(RPG_REVELATIONS_PAR_ETAGE).flat();
  for (const id of toutes) {
    assert.ok(cardById(id), `${id} existe au catalogue`);
    assert.equal(possedeCarte(COLLECTION_DEPART, id), false, `${id} n'est pas donné d'entrée`);
  }
  assert.equal(new Set(toutes).size, toutes.length, 'aucune carte révélée par deux étages');
});

test('dotation + révélations couvrent tout le catalogue : aucune carte introuvable', () => {
  const couverture = fusionnerCollections(COLLECTION_DEPART, ...Object.values(RPG_REVELATIONS_PAR_ETAGE));
  assert.deepEqual(couverture.sort(), idsCatalogue());
});

test('les révélations portent sur des étages connus des Tours de Bab El', () => {
  const connus = new Set(tousLesEtages().map(({ etage }) => etage.id));
  for (const etageId of Object.keys(RPG_REVELATIONS_PAR_ETAGE)) {
    assert.ok(connus.has(etageId), `${etageId} est un étage de la campagne`);
  }
});

test('l’étage qui révèle une carte nomme son étage et sa tour', () => {
  const revelation = carteReveleePar('kraken');
  assert.equal(revelation.etageId, 'abysses-1');
  assert.equal(typeof revelation.etage, 'string');
  assert.equal(revelation.tour, 'La Tour des Abysses');
  assert.equal(carteReveleePar('chien-du-guet'), null, 'une carte de la dotation n’est révélée nulle part');
  assert.equal(carteReveleePar('carte-inconnue'), null);
  assert.deepEqual(cartesReveleesParEtage('listes-1'), ['cavalier-amazigh-du-desert', 'scribe-de-la-liste']);
  assert.deepEqual(cartesReveleesParEtage('etage-fantome'), []);
});

// ── Les étages ne donnent plus de cartes ─────────────────────────────────────

test('gagner un étage ne donne plus aucune carte : le Souk les vend', () => {
  const apres = collectionJoueur({ acquis: acquisVide() });
  assert.deepEqual(apres, [...COLLECTION_DEPART], 'la collection d’un joueur neuf est exactement la dotation');
  for (const id of Object.values(RPG_REVELATIONS_PAR_ETAGE).flat()) {
    assert.equal(possedeCarte(apres, id), false, `${id} s’achète au Souk, il ne se gagne plus`);
  }
});

test('la collection grandit par les acquis, le Souk et le compte — jamais par les étages', () => {
  const gel = { ...acquisVide(), gel: true, cartes: ['kraken'] };
  const avecAcquis = collectionJoueur({ acquis: gel });
  assert.equal(possedeCarte(avecAcquis, 'kraken'), true);

  const avecSouk = collectionJoueur({ acquis: acquisVide(), souk: ['tarek'] });
  assert.equal(possedeCarte(avecSouk, 'tarek'), true, 'une carte achetée au Souk est possédée');

  const avecCompte = collectionJoueur({ acquis: acquisVide(), distante: ['yamina'] });
  assert.equal(possedeCarte(avecCompte, 'yamina'), true, 'une carte venue d’un autre appareil aussi');

  const tout = collectionJoueur({ acquis: gel, distante: ['yamina'], souk: ['tarek'] });
  assert.equal(tout.length, COLLECTION_DEPART.length + 3, 'les quatre sources s’unissent');
  assert.ok(possedeCarte(tout, 'yamina') && possedeCarte(tout, 'tarek') && possedeCarte(tout, 'kraken'));
});

test('exemplairesPossedables ouvre une carte du Souk comme une autre', () => {
  const collection = collectionJoueur({ acquis: acquisVide(), souk: ['kraken', 'tarek'] });
  assert.equal(exemplairesPossedables(collection, 'kraken'), 1, 'la mythique achetée est mobilisable');
  assert.equal(exemplairesPossedables(collection, 'tarek'), 1);
  assert.equal(exemplairesPossedables(collection, 'petra'), 0, 'et les autres restent verrouillées');
});

// ── Le gel des acquis : la migration ─────────────────────────────────────────

test('le gel reprend une fois les cartes déjà gagnées sous l’ancienne règle', () => {
  const gel = figerAcquisitions({ progression: { etagesVaincus: ['listes-1', 'listes-2'] } });
  assert.equal(gel.gel, true);
  assert.deepEqual(gel.cartes, ['cavalier-amazigh-du-desert', 'scribe-de-la-liste', 'braisier-du-souk']);
  assert.deepEqual(figerAcquisitions({ progression: { etagesVaincus: [] } }).cartes, [], 'un joueur neuf ne gèle rien');

  // Une fois gelé, plus rien ne s’ajoute : les victoires suivantes n’apportent
  // plus de cartes, elles révèlent.
  const encore = figerAcquisitions({
    acquis: gel,
    progression: { etagesVaincus: ['listes-1', 'listes-2', 'listes-3', 'listes-4', 'listes-5'] },
  });
  assert.deepEqual(encore, gel, 'le gel est définitif');
  assert.equal(possedeCarte(collectionJoueur({ acquis: encore }), 'tarek'), false, 'Tarek attend le Souk');
});

test('les acquis se normalisent et fusionnent : le gel gagne, les cartes s’unissent', () => {
  assert.deepEqual(normaliserAcquis(null), acquisVide());
  assert.deepEqual(normaliserAcquis({ gel: 'oui', cartes: ['kraken', 'kraken', 'inconnue'] }).cartes, ['kraken']);
  const fusion = fusionnerAcquisitions({ gel: true, cartes: ['kraken'] }, { gel: false, cartes: ['tarek'] });
  assert.equal(fusion.gel, true, 'un appareil qui n’a pas migré ne défait pas le gel d’un autre');
  assert.deepEqual(fusion.cartes, ['kraken', 'tarek']);
  assert.equal(fusionnerAcquisitions(null, null).gel, false);
});

test('les acquis se sauvegardent et se relisent sur l’appareil', () => {
  const cache = stockageEnMemoire();
  avecStockage({ value: cache.stockage.value }, () => {
    assert.deepEqual(chargerAcquis(), acquisVide());
    assert.equal(sauverAcquis({ gel: true, cartes: ['kraken'] }), true);
    assert.deepEqual(chargerAcquis().cartes, ['kraken']);
    assert.equal(chargerAcquis().gel, true);
    cache.donnees.set(RPG_ACQUIS_STORAGE_KEY, '{ cassé');
    assert.deepEqual(chargerAcquis(), acquisVide(), 'un stockage corrompu rend un acquis vide');
  });
});

test('revelationsDepuisEtages liste ce qu’une progression a révélé, sans doublon', () => {
  assert.deepEqual(revelationsDepuisEtages(['listes-1']), ['cavalier-amazigh-du-desert', 'scribe-de-la-liste']);
  assert.deepEqual(revelationsDepuisEtages([]), []);
  assert.deepEqual(revelationsDepuisEtages('pas une liste'), []);
  const trois = revelationsDepuisEtages(['listes-1', 'listes-1', 'listes-2']);
  assert.equal(new Set(trois).size, trois.length);
});

// ── Le pacing du contenu : les couleurs entrent dans l'ordre ──────────────────

test('les révélations amènent les couleurs quand la campagne y entre', () => {
  const couleursDesRevelations = (tours) => {
    const vues = new Set();
    for (const [etageId, cartes] of Object.entries(RPG_REVELATIONS_PAR_ETAGE)) {
      const tour = tousLesEtages().find(({ etage }) => etage.id === etageId)?.tour.id;
      if (!tours.includes(tour)) continue;
      for (const id of cartes) for (const couleur of cardColors(cardById(id))) vues.add(couleur);
    }
    return vues;
  };
  assert.deepEqual([...couleursDesRevelations(['tour-des-listes'])].sort(), ['braise', 'sable'],
    'les Listes révèlent le Sable et la Braise');
  assert.deepEqual([...couleursDesRevelations(['tour-des-listes', 'tour-du-souk'])].sort(), ['braise', 'eau', 'sable'],
    'le Souk révèle l’Eau de ses citernes');
  // Exception assumée : le sommet des Sables révèle **Le roi Kusayla**, carte
  // hybride Sable + Ténèbres — le roi de la nuit tombante. Les Ténèbres ne
  // s'installent pas pour autant avant la Nécropole : c'est la seule carte
  // teintée de Ténèbres de la tour, et elle garde ses deux pips.
  assert.deepEqual([...couleursDesRevelations(['tour-des-listes', 'tour-du-souk', 'tour-des-sables'])].sort(),
    ['braise', 'eau', 'sable', 'tenebres'],
    'les Sables ajoutent leur hybride Sable + Ténèbres, Kusayla');
  assert.deepEqual(
    RPG_REVELATIONS_PAR_ETAGE['sables-3'].filter((id) => cardColors(cardById(id)).includes('tenebres')),
    ['kusayla-roi-des-imazighen'],
    'le seul Ténèbres des Sables est le roi Kusayla',
  );
  assert.deepEqual([...couleursDesRevelations(['tour-des-abysses'])].sort(), ['eau', 'neige'],
    'les Abysses révèlent la Neige du fond');
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
  assert.equal(exemplairesPossedables(COLLECTION_DEPART, 'chien-du-guet'), 2, 'commune : deux exemplaires');
  assert.equal(exemplairesPossedables(COLLECTION_DEPART, 'kraken'), 0, 'verrouillée : rien');
  const avecKraken = fusionnerCollections(COLLECTION_DEPART, ['kraken']);
  assert.equal(exemplairesPossedables(avecKraken, 'kraken'), 1, 'mythique : un exemplaire');
  assert.equal(exemplairesPossedables(COLLECTION_DEPART, 'petra'), 0, 'Pétra verrouillée au départ');
});

test('nombreExemplaires compte le stock acquis pour les pastilles', () => {
  assert.equal(nombreExemplaires(COLLECTION_DEPART, 'chien-du-guet'), 2, 'la dotation contient son playset');
  assert.equal(nombreExemplaires(COLLECTION_DEPART, 'kraken'), 0, 'une carte absente reste à zéro');
  const avecAcquisitions = fusionnerCollections(COLLECTION_DEPART, ['kraken', 'scribe-de-la-liste']);
  assert.equal(nombreExemplaires(avecAcquisitions, 'kraken'), 1, 'une mythique acquise compte pour une');
  assert.equal(nombreExemplaires(avecAcquisitions, 'scribe-de-la-liste'), 1, 'une rare acquise compte pour une aussi');
  assert.equal(nombreExemplaires(avecAcquisitions, 'chien-du-guet'), 2, 'la dotation ne perd pas ses exemplaires');
});

test('le compteur d’exemplaires de l’étal remonte dans la pastille', () => {
  const avecAcquisitions = fusionnerCollections(COLLECTION_DEPART, ['kraken', 'scribe-de-la-liste']);
  const comptes = { 'scribe-de-la-liste': 2, kraken: 2 };
  assert.equal(nombreExemplaires(avecAcquisitions, 'scribe-de-la-liste', comptes), 2,
    'rachetée à l’étal : la rare compte deux copies');
  assert.equal(nombreExemplaires(avecAcquisitions, 'kraken', comptes), 1,
    'la mythique reste bornée à son quota, compteur mentant ou non');
  assert.equal(nombreExemplaires(avecAcquisitions, 'tarek', { tarek: 2 }), 0,
    'un compteur ne rend pas possédée une carte absente de la collection');
  assert.equal(nombreExemplaires(avecAcquisitions, 'chien-du-guet', { 'chien-du-guet': 9 }), 2,
    'la dotation garde son playset, sans se laisser décréter un stock');
  assert.equal(lireExemplaire(null, 'kraken', true), 1, 'sans compteur, la lecture reste celle d’avant l’étal');
  assert.equal(lireExemplareSafe(), 0, 'une carte inconnue du catalogue n’a pas de stock');
});

/** `lireExemplaire` sur un identifiant hors catalogue : la tolérance, pas une exception. */
function lireExemplareSafe() {
  try {
    return lireExemplaire({ 'carte-inconnue': 3 }, 'carte-inconnue', true);
  } catch {
    return 'une exception';
  }
}

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

// ── Le playset, le stock, et ce que la pastille a le droit de promettre ──────

test('la pastille du catalogue dit exactement ce que le deck laisse aligner', () => {
  // Un chiffre, deux écrans : le Souk vend une copie parce que le deck la
  // jouera. Si les deux lectures divergeaient, la pastille promettrait un
  // exemplaire que l'atelier refuserait — le bug qui a ouvert ce dossier.
  const cartes = RPG_DUEL_CARDS.filter((carte) => carte.kind !== 'terrain');
  const collection = collectionJoueur({ acquis: { gel: true, cartes: cartes.map((carte) => carte.id) } });
  for (const [id, nombre] of [[cartes[0].id, 1], [cartes[1].id, 2], [cartes[2].id, 0], [cartes[3].id, 7]]) {
    const comptes = { [id]: nombre };
    assert.equal(nombreExemplaires(collection, id, comptes), exemplairesPossedables(collection, id, comptes),
      `${id} : la pastille et le deck ne connaissent qu'une règle`);
  }
  assert.equal(plafondVisible(collection, cartes[0].id, { [cartes[0].id]: 1 }),
    nombreExemplaires(collection, cartes[0].id, { [cartes[0].id]: 1 }),
    'et l’atelier affiche ce même chiffre');
});

test('toute copie que le deck réclame en plus s’achète quelque part', () => {
  // L'invariant qui ferme la porte au piège : une carte bornée par son stock —
  // et non par le quota du format — DOIT se vendre à l'étal. Une commune y a
  // droit au playset précisément parce qu'elle n'y est pas vendue.
  const collection = collectionJoueur({
    acquis: { gel: true, cartes: RPG_DUEL_CARDS.filter((c) => c.kind !== 'terrain').map((c) => c.id) },
  });
  const orphelines = [];
  for (const carte of RPG_DUEL_CARDS) {
    if (carte.kind === 'terrain') continue;
    const plafond = exemplairesPossedables(collection, carte.id, null);
    const quota = cardCopyLimit(carte);
    if (plafond >= quota) continue;
    if (prixCarteDirecte(carte.id) === null) orphelines.push(carte.id);
  }
  assert.deepEqual(orphelines, [], 'aucune carte n’est plafonnée sous son quota sans voie d’achat');
  // Inverse : ce que l'étal vend ne peut pas déjà être couvert par le playset.
  const vendables = RPG_DUEL_CARDS.filter((carte) => carte.kind !== 'terrain' && prixCarteDirecte(carte.id) !== null);
  assert.ok(vendables.length > 0, "l'étal a un catalogue");
  for (const carte of vendables) {
    assert.equal(carteEnPlayset(carte) && carte.rarity === 'commune', false,
      `${carte.id} : une commune ne se vend pas, son playset vient de la possession`);
  }
});

test('le plafonnement du stock ne mange jamais le playset de la dotation', () => {
  // Un compteur vide, chez un joueur de la dotation, ne doit rien retirer : la
  // réparation des decks hérités s'appuie là-dessus pour rester un rangement silencieux.
  for (const id of COLLECTION_DEPART) {
    const carte = cardById(id);
    if (!carte || carte.kind === 'terrain') continue;
    assert.equal(exemplairesPossedables(COLLECTION_DEPART, id, {}), cardCopyLimit(carte),
      `${id} : la dotation garde ses deux copies, compteur ou pas`);
    assert.equal(nombreExemplaires(COLLECTION_DEPART, id, {}), cardCopyLimit(carte));
  }
});
