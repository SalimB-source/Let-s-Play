/**
 * La collection du Sablier — les cartes que le joueur possède.
 *
 * L'atelier de deck (deck « maison », `rpgDeckBuilder.js`) ne propose que les
 * cartes possédées. La règle tient en deux sources, toutes deux **croissantes** :
 *
 * 1. **La dotation de départ** — les cartes communes et inhabituelles du
 *    catalogue (terrains compris tant qu'ils sont communs) appartiennent à
 *    tout le monde, pour toujours. Une future carte commune rejoindrait donc
 *    d'elle-même la dotation : c'est la règle qui est codée, pas une liste
 *    figée.
 * 2. **Les récompenses d'étage** — chaque étage déblayé du mode Histoire rend
 *    des cartes confisquées par la Chambre des Heures (rares et
 *    mythiques). La correspondance étage → cartes est du contenu, dans
 *    `RPG_RECOMPENSES_PAR_ETAGE` : vingt étages, quarante-sept cartes à
 *    ravir, parées pour que chaque couleur ouvre à peu près au moment où la
 *    campagne y entre — le mono-Eau au seuil des Abysses, le mono-Neige en
 *    entrant dans le Fjord. Chaque étage ne nomme que des cartes du catalogue :
 *    les trois cartes retirées du jeu (Rafale du minaret, Sentence de la Liste,
 *    Fureur du souk) ne sont plus promises nulle part. La Braise, elle, ne fait
 *    pas un deck à elle seule — sa réserve culmine sous les vingt-quatre
 *    emplacements non-terrain d'un deck de quarante, donc elle se joue par
 *    paires, comme le deck « Sentiers de cendre » du catalogue.
 *
 * Les **decks du catalogue** (les cinq boîtiers de départ) ne consultent jamais
 * la collection : ce sont des decks préconstruits, jouables d'entrée de jeu.
 * Seuls les decks maison y sont tenus.
 *
 * Le compte connecté porte sa collection sur le serveur (`rpgSablierRemote.js`,
 * table `rpg_sablier_progress`) ; les apports du compte — des cartes gagnées sur
 * un autre appareil — sont mis en cache local (`chargerCollectionDistante`) et
 * fusionnés, sans jamais pouvoir retirer quoi que ce soit : une collection ne
 * fait que grossir (`fusionnerCollections`).
 */

import { RPG_DUEL_CARDS, cardById, cardCopyLimit } from './rpgCards.js';
import { chargerProgressionHistoire } from './rpgStory.js';
import { etageHistoireParId } from './rpgStoryTours.js';

/** Cache local des apports du compte (cartes gagnées sur un autre appareil). */
export const RPG_COLLECTION_STORAGE_KEY = 'letsplay_sablier_collection_v1';

/**
 * La dotation de départ : les cartes **communes et inhabituelles** du catalogue
 * appartiennent à tout le monde, pour toujours — terrains compris tant qu'ils
 * sont communs (Pétra et sa variante rare se débloquent dans les Tours).
 * Une future carte commune rejoindrait donc d'elle-même la dotation : c'est la
 * règle qui est codée, pas une liste figée.
 */
export const COLLECTION_DEPART = RPG_DUEL_CARDS
  .filter((carte) => carte.rarity === 'commune' || carte.rarity === 'inhabituelle')
  .map((carte) => carte.id);

/**
 * Les cartes rendues par chaque étage déblayé — du contenu, pas de la logique.
 * Répartition : les tours du bas (Listes, Souk, Sables) rendent le Sable et la
 * Braise avec un premières eaux glissées par les citernes du Souk ; les
 * Abysses rendent leurs bêtes marines et les premières cartes de Neige —
 * l'eau du fond est glacée — ; le Fjord rend les figures du Nord.
 */
export const RPG_RECOMPENSES_PAR_ETAGE = {
  // Tour des Listes — Sable et Braise, l'apprentissage. Chaque étage ne rend
  // que des cartes encore au catalogue : Sentence de la Liste, Rafale du
  // minaret et Fureur du souk en sont sorties, donc elles ne sont plus des
  // récompenses (l'étage les avait promises, la Chambre des Heures les a
  // reprises).
  'listes-1': ['cavalier-amazigh-du-desert', 'scribe-de-la-liste'],
  'listes-2': ['braisier-du-souk'],
  'listes-3': ['amani-des-ksour', 'tempete-de-sable'],
  // Pétra et sa peinture alternative se débloquent ensemble à l’étage 4.
  'listes-4': ['petra', 'petra-des-deux-sources'],
  'listes-5': ['sahir-des-braises', 'nuage-de-cendres', 'tarek', 'armure-de-cendres'],
  // Tour du Souk — le feu se complète ; les citernes de la Gardienne rendent
  // les premières cartes d'Eau.
  'souk-1': ['vent-rouge'],
  'souk-2': ['salem', 'vipere-de-verre'],
  'souk-3': ['djinn-du-souk', 'parade-du-verre'],
  'souk-4': ['ifrit-al-ahmar', 'feriel', 'colosse-de-sel'],
  // Tour des Sables — le sommet du Sable/Braise, l'Eau se précise.
  'sables-1': ['ifrit-des-ergs', 'maree-contraire'],
  'sables-2': ['brisure-de-verre', 'courant-de-retour'],
  'sables-3': ['anqa-des-braises', 'tin-hinan', 'yamina'],
  // Tour des Abysses — les bêtes marines ; ce qui remonte du fond est gelé :
  // les premières cartes de Neige précèdent la tour du Fjord.
  'abysses-1': ['kraken', 'sonneur-fele', 'baton-des-citernes'],
  'abysses-2': ['leviathan', 'scalde-des-runes'],
  'abysses-3': ['bakunawa', 'valkyrie-au-corbeau', 'lance-de-givre'],
  'abysses-4': ['jormungandr', 'boualem', 'brume-du-fjord'],
  // Tour du Fjord — le Serment au complet.
  'fjord-1': ['jarl-au-marteau-de-guerre', 'hurlement-du-blizzard', 'berserk-des-trois-hivers'],
  'fjord-2': ['valkyrie-des-glaces', 'geant-des-banquises'],
  'fjord-3': ['drakkar-a-tete-de-dragon', 'pere-des-corbeaux'],
  'fjord-4': ['maitre-du-marteau', 'dame-des-neuf-mondes', 'serpent-du-monde'],
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

/** Les cartes rendues par un étage (identifiants connus), liste vide sinon. */
export function recompenseEtage(etageId) {
  const recompense = RPG_RECOMPENSES_PAR_ETAGE[etageId];
  return Array.isArray(recompense) ? recompense.filter((id) => cardById(id)) : [];
}

/** L'étage qui débloque une carte hors dotation : `{ etageId, etage, tour }`, sinon `null`. */
export function carteDebloqueePar(cardId) {
  for (const [etageId, recompense] of Object.entries(RPG_RECOMPENSES_PAR_ETAGE)) {
    if (!Array.isArray(recompense) || !recompense.includes(cardId)) continue;
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

/** Les cartes rendues par une liste d'étages déblayés. */
export function collectionDepuisEtages(etageIds) {
  const vues = new Set();
  const cartes = [];
  for (const etageId of (Array.isArray(etageIds) ? etageIds : [])) {
    for (const id of recompenseEtage(etageId)) {
      if (vues.has(id)) continue;
      vues.add(id);
      cartes.push(id);
    }
  }
  return cartes;
}

/**
 * La collection du joueur : dotation de départ, plus les récompenses des
 * étages déblayés (progression locale ou liste passée en clair pour les tests),
 * plus les apports du compte (cache local, puis état distant fusionné par
 * l'appelant). Chaque source peut être omise.
 */
export function collectionJoueur({ etagesVaincus = null, progression = null, distante = null } = {}) {
  const etages = Array.isArray(etagesVaincus)
    ? etagesVaincus
    : (progression?.etagesVaincus ?? chargerProgressionHistoire().etagesVaincus);
  return fusionnerCollections(
    COLLECTION_DEPART,
    collectionDepuisEtages(etages),
    distante,
  );
}

/** La carte est-elle possédée ? Une collection absente (ou vide) ne dit rien : seules la dotation et les récompenses parlent. */
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
  try {
    return globalThis.window?.localStorage || globalThis.localStorage || null;
  } catch {
    return null;
  }
}

/** Les apports du compte mis en cache sur cet appareil (liste vide sinon). */
export function chargerCollectionDistante() {
  const stockage = browserStorage();
  if (!stockage) return [];
  try {
    return normaliserCollection(JSON.parse(stockage.getItem(RPG_COLLECTION_STORAGE_KEY) ?? 'null')?.cartes);
  } catch {
    return [];
  }
}

/** Met en cache les apports du compte. Rend `true` si l'écriture a eu lieu. */
export function sauverCollectionDistante(cartes) {
  const stockage = browserStorage();
  if (!stockage) return false;
  try {
    stockage.setItem(RPG_COLLECTION_STORAGE_KEY, JSON.stringify({ cartes: normaliserCollection(cartes) }));
    return true;
  } catch {
    return false;
  }
}
