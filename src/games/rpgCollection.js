/**
 * La collection du Sablier — les cartes que le joueur possède.
 *
 * Depuis l'ouverture du Souk (`docs/rpg/13-souk-credits-quetes-boosters.md`),
 * la règle a changé de nature : **les étages ne donnent plus de cartes**. Ils
 * les **révèlent**. Un étage déblayé découvre des cartes, qui entrent alors au
 * vivier des boosters (`rpgBoosters.js`) — c'est le Souk qui les vend, contre
 * des crédits gagnés en jouant.
 *
 * La collection tient donc en quatre sources, toutes **croissantes** :
 *
 * 1. **La dotation de départ** — les communes et inhabituelles du catalogue
 *    appartiennent à tout le monde, pour toujours. Une future carte commune
 *    rejoindrait d'elle-même la dotation : c'est la règle qui est codée, pas
 *    une liste figée.
 * 2. **Les acquis figés** (`chargerAcquis`, `figerAcquisitions`) — au premier
 *    lancement de cette version, la collection déjà gagnée sous l'ancienne
 *    règle (les récompenses des étages) est **gelée une fois pour toutes**.
 *    Sans ce gel, retirer la source des récompenses aurait effacé rétroactivement
 *    les cartes des joueurs — et cassé leurs decks maison, dont la jouabilité
 *    dépend de la collection. **Une carte gagnée ne se reprend pas.**
 * 3. **Les cartes du Souk** — rangées dans le portefeuille (`rpgCredits.js`),
 *    le nom de la variable du compte reste `collection` par compatibilité ;
 *    l'écran les lit là où elles vivent.
 * 4. **Les apports du compte** — des cartes gagnées sur un autre appareil,
 *    mises en cache local (`chargerCollectionDistante`) et fusionnées.
 *
 * Les **decks du catalogue** (les sept boîtiers de départ) ne consultent jamais
 * la collection : ce sont des decks préconstruits, jouables d'entrée de jeu.
 * Seuls les decks maison y sont tenus.
 *
 * Le compte connecté porte le tout sur le serveur (`rpgSablierRemote.js`, table
 * `rpg_sablier_progress`) ; aucune collection ne peut jamais maigrir :
 * `fusionnerCollections` et `fusionnerAcquisitions` ne font qu'union.
 */

import { RPG_DUEL_CARDS, cardById, cardCopyLimit } from './rpgCards.js';
import { chargerProgressionHistoire } from './rpgStory.js';
import { ecrireProgression, lireProgression, stockageProgression } from '../lib/progressionScope.js';
import { etageHistoireParId } from './rpgStoryTours.js';

/** Cache local des apports du compte (cartes gagnées sur un autre appareil). */
export const RPG_COLLECTION_STORAGE_KEY = 'letsplay_sablier_collection_v1';

/** Les acquis figés de l'appareil (le gel de migration et les cartes reprises). */
export const RPG_ACQUIS_STORAGE_KEY = 'letsplay_sablier_acquis_v1';

/**
 * La dotation de départ : les cartes **communes et inhabituelles** du catalogue
 * appartiennent à tout le monde, pour toujours — terrains compris tant qu'ils
 * sont communs (Pétra et sa variante rare se débloquent dans les Tours).
 * Une future carte commune rejoindrait donc d'elle-même la dotation : c'est la
 * règle qui est codée, pas une liste figée.
 */
export const COLLECTION_DEPART = RPG_DUEL_CARDS
  .filter((carte) => carte.rarity === 'commune' || carte.rarity === 'inhabituelle')
  // Ténèbres : la dotation ne s'applique qu'aux quatre couleurs historiques.
  // Les communes/inhabituelles Ténèbres (Chacal, Ouvrier, Papyrus…) restent
  // à ouvrir dans les boosters, même si leur rareté est « commune ».
  .filter((carte) => carte.set !== 'balance-des-heures')
  // Les Lettres de Marque suivent la même frontière : leurs communes et
  // inhabituelles (Mousse, Raïs, Brûlot…) restent au Souk, le rayon Sable,
  // jusqu'à l'entrée dédiée de la Régence (doc 17 §15).
  .filter((carte) => carte.set !== 'lettres-de-marque')
  .map((carte) => carte.id);

/**
 * Les cartes que chaque étage **révèle** — du contenu, pas de la logique.
 *
 * Elles ne sont plus offertes : l'étage les découvre, le Souk les vend. La
 * correspondance dit donc *où* une carte entre dans la ville, pas ce qu'un
 * joueur reçoit. Répartition : les tours du bas (Listes, Souk, Sables)
 * découvrent le Sable et la Braise, avec les premières eaux glissées par les
 * citernes du Souk ; les Abysses découvrent leurs bêtes marines et les
 * premières cartes de Neige ; le Fjord découvre les figures du Nord ; la
 * Nécropole révèle les Ténèbres — la Balance des Heures.
 */
export const RPG_REVELATIONS_PAR_ETAGE = {
  // Tour des Listes — Sable et Braise, l'apprentissage. Chaque étage ne
  // révèle que des cartes encore au catalogue : Sentence de la Liste, Rafale
  // du minaret et Fureur du souk en sont sorties, donc plus aucun étage ne les
  // découvre non plus — elles ne sont plus vendues nulle part.
  'listes-1': ['cavalier-amazigh-du-desert', 'scribe-de-la-liste'],
  'listes-2': ['braisier-du-souk'],
  'listes-3': ['amani-des-ksour', 'tempete-de-sable', 'masque-du-guetteur'],
  // Pétra et sa peinture alternative se débloquent ensemble à l’étage 4.
  // Pétra était un terrain : retirée avec les terrains.
  'listes-4': [],
  'listes-5': ['sahir-des-braises', 'nuage-de-cendres', 'tarek', 'armure-de-cendres'],
  // Tour du Souk — le feu se complète ; les citernes de la Gardienne rendent
  // les premières cartes d'Eau.
  'souk-1': ['vent-rouge', 'samourai-du-torii'],
  'souk-2': ['salem', 'vipere-de-verre', 'kenshi-de-la-forge'],
  'souk-3': ['parade-du-verre', 'frappe-iaijutsu',
    'mousse-des-galiotes', 'rais-de-la-galiote', 'le-brulot', 'haut-fond'],
  'souk-4': ['ifrit-al-ahmar', 'feriel', 'daimyo-du-soleil-rouge',
    'pilote-de-la-carreira', 'tercio-de-cuivre', 'cotre-de-course', 'le-renegat',
    'lettre-de-marque', 'le-routier'],
  // Tour des Sables — le sommet du Sable/Braise, l'Eau se précise.
  'sables-1': ['ifrit-des-ergs', 'maree-contraire', 'onna-musha-des-cendres', 'feux-de-kitsune', 'jitte-d-amayas', 'reanimation'],
  'sables-2': ['brisure-de-verre', 'courant-de-retour', 'tengu-du-mont-ardent', 'sabre-maudit',
    'negociant-des-ranscons', 'galion-de-la-flotte', 'le-grand-debarquement', 'grappin-d-abordage',
    'la-vengeance-de-la-reine-anne', 'le-tresor-de-lima'],
  'sables-3': ['anqa-des-braises', 'tin-hinan', 'yamina', 'oni-de-la-fournaise', 'kagutsuchi-flamme-originelle', 'serment-de-la-forge', 'cavalier-des-deux-sabres', 'orochi', 'susanoo', 'tojiro-le-pourfendeur', 'lame-des-ergs', 'takouba-de-tin-hinan', 'la-barbe-rousse', 'le-chasseur-d-ocracoke', 'source-de-bimini'],
  // Tour des Abysses — les bêtes marines ; ce qui remonte du fond est gelé :
  // les premières cartes de Neige précèdent la tour du Fjord.
  'abysses-1': ['kraken', 'baton-des-citernes'],
  'abysses-2': ['leviathan', 'scalde-des-runes'],
  'abysses-3': ['bakunawa', 'valkyrie-au-corbeau', 'lance-de-givre'],
  'abysses-4': ['jormungandr', 'boualem', 'brume-du-fjord', 'grand-voile-blanc'],
  // Tour du Fjord — le Serment au complet.
  'fjord-1': ['eirik-du-premier-serment', 'jarl-au-marteau-de-guerre', 'hurlement-du-blizzard', 'berserk-des-trois-hivers', 'defi-du-jarl'],
  'fjord-2': ['valkyrie-des-glaces', 'geant-des-banquises', 'verglas', 'embuscade', 'tour-de-neige'],
  // Le Grand Hiver tombe avec les derniers hivers du Serment ; la Hache de la
  // banquise, commune, rejoint d'elle-même la dotation de départ.
  'fjord-3': ['drakkar-a-tete-de-dragon', 'pere-des-corbeaux', 'grand-hiver'],
  'fjord-4': ['maitre-du-marteau', 'dame-des-neuf-mondes', 'serpent-du-monde'],
  // Tour de la Nécropole — la Balance des Heures (Ténèbres).
  // Les communes ouvrent en bas, les rares au milieu, les mythiques au sommet.
  // Les quatre figures cross-éléments (Faucon, Lionne, Dame, Seigneur) montent
  // avec leurs mythiques tenebres — elles sont du même set.
  'necropole-1': ['chacal-du-seuil', 'ouvrier-du-natron', 'papyrus', 'gardienne-de-la-balance', 'scribe-des-feuillets'],
  'necropole-2': ['pretre-de-la-bouche', 'ureus-du-seuil', 'momie-de-lin', 'ibis-des-comptes', 'nom-efface', 'offrande-de-lin'],
  'necropole-3': ['khopesh-d-or', 'le-poids', 'celle-qui-pese', 'les-feuillets'],
  // La Barbe Noire, devenue carte 100 % Ténèbres, se révèle au sommet de la
  // Nécropole avec les mythiques des Ténèbres — plus aux Sables.
  'necropole-4': ['la-devoreuse', 'celui-qui-juge', 'passeur-au-masque-de-chacal', 'maitre-des-hieroglyphes', 'la-derniere-pesee', 'la-grande-pesee', 'faucon-du-zenith', 'lionne-du-midi-ardent', 'dame-aux-ailes-d-or', 'seigneur-des-machoires', 'tour-des-tenebres', 'la-barbe-noire'],
};

/** Ne garde que des identifiants de cartes connus, sans doublon, ordre préservé. */
export function normaliserCollection(value) {
  const vues = new Set();
  const cartes = [];
  for (const id of (Array.isArray(value) ? value : [])) {
    if (typeof id !== 'string' || vues.has(id) || !cardById(id)) continue;
    vues.add(id);
    cartes.push(id);
  }
  return cartes;
}

/** Les cartes qu'un étage révèle (identifiants connus), liste vide sinon. */
export function cartesReveleesParEtage(etageId) {
  const revelation = RPG_REVELATIONS_PAR_ETAGE[etageId];
  return Array.isArray(revelation) ? revelation.filter((id) => cardById(id)) : [];
}

/** L'étage qui révèle une carte hors dotation : `{ etageId, etage, tour }`, sinon `null`. */
export function carteReveleePar(cardId) {
  for (const [etageId, revelation] of Object.entries(RPG_REVELATIONS_PAR_ETAGE)) {
    if (!Array.isArray(revelation) || !revelation.includes(cardId)) continue;
    const histoire = etageHistoireParId(etageId);
    if (!histoire) return { etageId, etage: etageId, tour: null };
    return { etageId, etage: histoire.etage?.nom ?? etageId, tour: histoire.tour?.nom ?? null };
  }
  return null;
}

/** Union de plusieurs collections : n'ajoute jamais, ne retire jamais. */
export function fusionnerCollections(...collections) {
  const vues = new Set();
  const cartes = [];
  for (const collection of collections) {
    for (const id of normaliserCollection(collection)) {
      if (vues.has(id)) continue;
      vues.add(id);
      cartes.push(id);
    }
  }
  return cartes;
}

/** Les cartes révélées par une liste d'étages déblayés. */
export function revelationsDepuisEtages(etageIds) {
  const vues = new Set();
  const cartes = [];
  for (const etageId of (Array.isArray(etageIds) ? etageIds : [])) {
    for (const id of cartesReveleesParEtage(etageId)) {
      if (vues.has(id)) continue;
      vues.add(id);
      cartes.push(id);
    }
  }
  return cartes;
}

/**
 * La collection du joueur : dotation de départ, **acquis figés** (le gel de
 * migration, voir `figerAcquisitions`), apports du compte, et les cartes du
 * Souk quand l'appelant les connaît (`souk`). Chaque source peut être omise.
 *
 * Les étages n'y entrent plus : ils révèlent des cartes, ils ne les donnent
 * pas. Le troisième paramètre du compte garde le nom `collection` — c'est un
 * nom sur le fil, pas une règle.
 */
export function collectionJoueur({ acquis = null, distante = null, souk = null } = {}) {
  const acquisNormalise = normaliserAcquis(acquis ?? chargerAcquis());
  return fusionnerCollections(
    COLLECTION_DEPART,
    acquisNormalise.cartes,
    distante,
    souk,
  );
}

/** Les acquis d'un joueur neuf : rien de gelé, rien de gagné. */
export function acquisVide() {
  return { version: 1, gel: false, cartes: [] };
}

/**
 * Normalise un état d'acquis. `gel: true` est **définitif** : une fois le gel
 * posé, plus aucune victoire n'y ajoute quoi que ce soit. C'est ce qui rend la
 * bascule sûre — le passage aux révélations ne peut pas se rejouer deux fois et
 * reprendre des cartes à quelqu'un.
 */
export function normaliserAcquis(value) {
  const brut = value && typeof value === 'object' ? value : {};
  return {
    version: 1,
    gel: Boolean(brut.gel),
    cartes: normaliserCollection(brut.cartes),
  };
}

/** Union d'acquis : le gel gagne, les cartes s'unissent — jamais l'inverse. */
export function fusionnerAcquisitions(...acquisitions) {
  const vues = new Set();
  const cartes = [];
  let gel = false;
  for (const acquis of acquisitions) {
    const normalise = normaliserAcquis(acquis);
    gel = gel || normalise.gel;
    for (const id of normalise.cartes) {
      if (vues.has(id)) continue;
      vues.add(id);
      cartes.push(id);
    }
  }
  return { version: 1, gel, cartes };
}

/**
 * Le **gel des acquis** — la seule opération de ce module qui écrit quelque
 * chose de neuf sans qu'on le lui demande, et la raison d'être de tout ce
 * paragraphe :
 *
 * Avant le Souk, gagner un étage **rendait** des cartes (`recompenseEtage`), et
 * la collection était *dérivée* de la progression : rien n'était stocké.
 * Retirer cette source aurait donc effacé, au premier lancement de cette
 * version, tout ce que les joueurs avaient déjà gagné — et leurs decks maison
 * avec (l'atelier ne propose que les cartes possédées).
 *
 * `figerAcquisitions` rattrape donc une fois, et une seule : au premier appel,
 * il reprend les cartes que l'ancienne règle aurait données pour les étages
 * déjà vaincus, les range dans les **acquis**, et pose `gel: true`. Les appels
 * suivants ne font plus rien : les victoires postérieures ne donnent plus de
 * cartes, elles révèlent.
 */
export function figerAcquisitions({ acquis = null, progression = null } = {}) {
  const base = normaliserAcquis(acquis ?? chargerAcquis());
  if (base.gel) return base;
  const etages = progression?.etagesVaincus ?? chargerProgressionHistoire().etagesVaincus;
  return {
    version: 1,
    gel: true,
    cartes: fusionnerCollections(base.cartes, revelationsDepuisEtages(etages)),
  };
}

/** La carte est-elle possédée ? Une collection absente (ou vide) ne dit rien : seule la liste qu'on lui passe parle. */
export function possedeCarte(collection, cardId) {
  return normaliserCollection(collection).includes(cardId);
}

/**
 * Nombre d'exemplaires mobilisables d'une carte dans une collection :
 * la limite de rareté (`cardCopyLimit`) borne ce que la possession permet.
 */
export function exemplairesPossedables(collection, cardId) {
  if (!possedeCarte(collection, cardId)) return 0;
  const carte = cardById(cardId);
  return cardCopyLimit(carte);
}

function browserStorage() {
  return stockageProgression();
}

/** Les acquis de l'appareil (vides si le stockage manque ou ment). */
export function chargerAcquis() {
  const stockage = browserStorage();
  if (!stockage) return acquisVide();
  try {
    return normaliserAcquis(JSON.parse(lireProgression(RPG_ACQUIS_STORAGE_KEY, stockage) ?? 'null'));
  } catch {
    return acquisVide();
  }
}

/** Écrit les acquis de l'appareil. Rend `true` si l'écriture a eu lieu. */
export function sauverAcquis(acquis) {
  const stockage = browserStorage();
  if (!stockage) return false;
  return ecrireProgression(RPG_ACQUIS_STORAGE_KEY, JSON.stringify(normaliserAcquis(acquis)), stockage);
}

/** Les apports du compte mis en cache sur cet appareil (liste vide sinon). */
export function chargerCollectionDistante() {
  const stockage = browserStorage();
  if (!stockage) return [];
  try {
    return normaliserCollection(JSON.parse(lireProgression(RPG_COLLECTION_STORAGE_KEY, stockage) ?? 'null')?.cartes);
  } catch {
    return [];
  }
}

/** Met en cache les apports du compte. Rend `true` si l'écriture a eu lieu. */
export function sauverCollectionDistante(cartes) {
  const stockage = browserStorage();
  if (!stockage) return false;
  return ecrireProgression(
    RPG_COLLECTION_STORAGE_KEY,
    JSON.stringify({ cartes: normaliserCollection(cartes) }),
    stockage,
  );
}
