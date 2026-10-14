/**
 * Les rayons du Souk — boosters, viviers et tirages.
 *
 * **Ce qu'un paquet a le droit de contenir** est la seule vraie question de ce
 * module, et la réponse tient en deux phrases :
 *
 * 1. **La tour d'abord.** Une carte n'entre dans un vivier que si sa **tour
 *    d'introduction est entamée** — au moins un étage vaincu dans cette tour.
 *    La Tour des Listes, première de la ville, compte comme entamée dès le
 *    premier jour. Aucun paquet ne vend donc une carte du Fjord avant que le
 *    joueur ait posé le pied quelque part dans le Fjord.
 * 2. **La couleur doit être entrée dans la ville.** Un rayon n'ouvre que si un
 *    étage vaincu a déjà rendu une carte de sa couleur : le Sable ouvre avec
 *    `listes-1`, la Braise avec `listes-2`, l'Eau avec `souk-2`, la Neige avec
 *    `abysses-2`. Le grand étal (rayon « Souk ») ouvre dès la première couleur.
 *
 * Le vivier garde **les communes et inhabituelles de la dotation** en plus des
 * cartes des tours entamées : elles font le remplissage des paquets et paient
 * des crédits en doublon (`rpgCredits.js`). Sans elles, un paquet ne serait
 * fait que de rares, et les taux annoncés ne voudraient plus rien dire.
 *
 * Le tirage lui-même (`tirerCartes`) est **pur** : `rng` injectable, aucun
 * accès au stockage, aucune dépendance à React — `tests/rpg-boosters.test.js`
 * échantillonne dix mille ouvertures semées pour vérifier les taux.
 */

import { RPG_DUEL_CARDS, RPG_ELEMENTS, cardById, cardColors, cardRarityInfo } from './rpgCards.js';
import { COLLECTION_DEPART, RPG_RECOMPENSES_PAR_ETAGE, collectionJoueur, recompenseEtage } from './rpgCollection.js';
import { RPG_STORY_TOURS, etageHistoireParId, tousLesEtages } from './rpgStoryTours.js';
import {
  ajouterCartesAuPortefeuille,
  creditsDeDoublons,
  depenserCredits,
  enregistrerOuverture,
  normaliserPortefeuille,
} from './rpgCredits.js';
import { tirerParmi } from './rpgHasard.js';

/** Les taux, écrits noir sur blanc : le Souk les affiche, les tests les vérifient. */
export const TAUX = Object.freeze({
  /** Un paquet fait cinq cartes, jamais deux fois la même. */
  cartes: 5,
  /** Cartes 1 à 3 : la bande commune/inhabituelle. */
  communes: 0.88,
  /** Carte 5 : la chance de mythique, quand la pitié n'a pas déjà parlé. */
  mythique: 0.2,
  /** Carte 5 du grand étal : elle paie un peu mieux la curiosité. */
  mythiqueSouk: 0.3,
  /** Huit ouvertures sans mythique : la neuvième en contient une. */
  pitie: 8,
  /** Au moins trois cartes neuves par paquet, tant que le rayon en garde trois. */
  nouvellesMin: 3,
});

/** Le coffret : dix paquets d'un même rayon, une mythique assurée. */
export const COFFRET = Object.freeze({ taille: 10, remise: 0.1, mythiqueAssuree: true });

/**
 * Les cinq étagères. `couleur: null` pour le grand étal (mélange des couleurs
 * ouvertes). Les prix sont ceux du dossier : une journée de jeu vaut deux
 * paquets environ, un peu moins sur le grand étal.
 */
export const RAYONS = Object.freeze([
  { id: 'braise', nom: 'Braise', couleur: 'braise', prix: 140, texte: 'La Montagne, ses samouraïs, ses yōkai et ses braises — ce que les tours ont rendu de rouge.' },
  { id: 'sable', nom: 'Sable', couleur: 'sable', prix: 140, texte: 'Le Désert qui monte : ksour, fennecs, tempêtes et les figures qui tiennent les dunes.' },
  { id: 'eau', nom: 'Eau', couleur: 'eau', prix: 160, texte: 'Ce que les citernes gardent du fond : contresorts, marées et bêtes des abysses.' },
  { id: 'neige', nom: 'Neige', couleur: 'neige', prix: 160, texte: 'Le Serment des Neuf Hivers, livré depuis les stèles de glace du fjord.' },
  { id: 'souk', nom: 'Souk', couleur: null, prix: 180, chanceMythique: TAUX.mythiqueSouk, texte: 'Le grand étal : toutes les couleurs déjà entrées dans la ville, et un peu plus de chances sur les mythiques.' },
]);

/** Rang de rareté : sert à n'échanger une carte que contre aussi rare ou plus rare. */
const RANG_RARETE = Object.freeze({ commune: 0, inhabituelle: 1, rare: 2, mythique: 3 });

/** La première tour de la ville : toujours entamée, par construction. */
const PREMIERE_TOUR = RPG_STORY_TOURS[0]?.id ?? null;

/** Les étages de chaque tour, et l'étage d'introduction de chaque carte (calculés une fois). */
const ETAGES_PAR_TOUR = new Map(RPG_STORY_TOURS.map((tour) => [tour.id, tour.etages.map((etage) => etage.id)]));
const TOUR_PAR_ETAGE = new Map(tousLesEtages().map(({ tour, etage }) => [etage.id, tour.id]));
const INTRO_PAR_CARTE = new Map();
for (const { etage } of tousLesEtages()) {
  for (const id of recompenseEtage(etage.id)) {
    if (!INTRO_PAR_CARTE.has(id)) INTRO_PAR_CARTE.set(id, etage.id);
  }
}

/** La dotation de départ : hors de toute tour, donc toujours au vivier. */
const DEBUT = new Set(COLLECTION_DEPART);

const VAINCUS = (progression) => new Set(Array.isArray(progression?.etagesVaincus) ? progression.etagesVaincus : []);

/** Le rayon par son identifiant (`null` si inconnu). */
export function rayonParId(rayonId) {
  return RAYONS.find((rayon) => rayon.id === rayonId) ?? null;
}

/** Le prix d'un coffret de dix paquets : dix fois le rayon, remise déduite. */
export function prixCoffret(rayonId) {
  const rayon = rayonParId(rayonId);
  if (!rayon) return null;
  return Math.round(rayon.prix * COFFRET.taille * (1 - COFFRET.remise));
}

/** Les tours entamées : la première de la ville, plus celles où un étage est vaincu. */
export function toursEntamees(progression) {
  const vaincus = VAINCUS(progression);
  const entamees = new Set(PREMIERE_TOUR ? [PREMIERE_TOUR] : []);
  for (const [tourId, etages] of ETAGES_PAR_TOUR) {
    if (etages.some((etageId) => vaincus.has(etageId))) entamees.add(tourId);
  }
  return entamees;
}

/** La tour qui introduit une carte (`null` : carte de dotation, ou inconnue). */
export function tourIntroduction(cardId) {
  const etageId = INTRO_PAR_CARTE.get(cardId);
  return etageId ? (TOUR_PAR_ETAGE.get(etageId) ?? null) : null;
}

/** La carte entre-t-elle dans un vivier à cette progression ? */
export function carteAuVivier(cardId, progression) {
  const carte = cardById(cardId);
  if (!carte) return false;
  if (DEBUT.has(cardId)) return true;
  const tourId = tourIntroduction(cardId);
  if (!tourId) return true;
  return toursEntamees(progression).has(tourId);
}

/** Les couleurs rendues par les étages vaincus. */
export function couleursRapportees(progression) {
  const vaincus = VAINCUS(progression);
  const couleurs = new Set();
  for (const [etageId, recompense] of Object.entries(RPG_RECOMPENSES_PAR_ETAGE)) {
    if (!vaincus.has(etageId)) continue;
    for (const id of recompense) {
      for (const couleur of cardColors(id)) couleurs.add(couleur);
    }
  }
  return couleurs;
}

/** La tour qui garde encore une couleur jamais rendue (pour le message du Souk). */
export function tourQuiGarde(couleur) {
  for (const { tour, etage } of tousLesEtages()) {
    if (recompenseEtage(etage.id).some((id) => cardColors(id).includes(couleur))) return tour;
  }
  return null;
}

/** Le vivier d'un rayon : sa couleur (ou toutes les couleurs ouvertes), tours entamées seulement. */
export function vivierRayon(rayonId, progression) {
  const rayon = rayonParId(rayonId);
  if (!rayon) return [];
  const couleurs = rayon.couleur ? [rayon.couleur] : [...couleursRapportees(progression)];
  if (!couleurs.length) return [];
  const autorisees = new Set(couleurs);
  return RPG_DUEL_CARDS
    .filter((carte) => cardColors(carte).some((couleur) => autorisees.has(couleur)))
    .filter((carte) => carteAuVivier(carte.id, progression))
    .map((carte) => carte.id);
}

/** Le rayon est-il ouvert ? Sa couleur doit être entrée dans la ville par un étage vaincu. */
export function rayonOuvert(rayonId, progression) {
  const rayon = rayonParId(rayonId);
  if (!rayon) return false;
  if (rayon.couleur) return couleursRapportees(progression).has(rayon.couleur);
  return couleursRapportees(progression).size > 0;
}

/** Répartition par rareté d'une liste d'identifiants. */
function parRarete(cardIds) {
  const bandes = { commune: [], inhabituelle: [], rare: [], mythique: [] };
  for (const id of cardIds) {
    const carte = cardById(id);
    if (!carte) continue;
    (bandes[cardRarityInfo(carte).key] ?? bandes.commune).push(id);
  }
  return bandes;
}

/**
 * L'état d'un rayon, prêt pour l'écran : vivier, cartes qui manquent, mythiques
 * disponibles, prix, prix du coffret, et la raison d'une fermeture.
 *
 *   - `'ferme'`  — la couleur n'est pas encore entrée dans la ville ;
 *   - `'ouvert'` — il reste au moins une carte à rapporter ;
 *   - `'complet'` — le vivier est entièrement possédé (chaque carte paiera).
 */
export function etatRayon(rayonId, progression, collection = null) {
  const rayon = rayonParId(rayonId);
  if (!rayon) return null;
  const vivier = vivierRayon(rayonId, progression);
  const possedees = new Set(collection ?? collectionJoueur({ progression }));
  const ouvert = rayonOuvert(rayonId, progression);
  const manquantes = vivier.filter((id) => !possedees.has(id));
  const mythiques = vivier.filter((id) => cardById(id)?.rarity === 'mythique');
  const garde = rayon.couleur ? tourQuiGarde(rayon.couleur) : null;
  return {
    rayon,
    vivier,
    taille: vivier.length,
    nouvelles: manquantes.length,
    mythiques: mythiques.length,
    prix: rayon.prix,
    prixCoffret: prixCoffret(rayonId),
    ouvert,
    complet: ouvert && manquantes.length === 0,
    raison: ouvert ? null : (garde ? `La ${garde.nom} la garde encore.` : 'Aucune couleur n’est encore entrée dans la ville.'),
  };
}

/** Tous les rayons, dans l'ordre de l'étagère. */
export function etatRayons(progression, collection = null) {
  return RAYONS.map((rayon) => etatRayon(rayon.id, progression, collection));
}

/** Les rayons réellement achetables : ouverts (même complets, les doublons paient). */
export function rayonsOuverts(progression, collection = null) {
  return etatRayons(progression, collection).filter((etat) => etat.ouvert);
}

/**
 * Tire les cinq cartes d'un paquet. Rend
 * `{ ok, raison, cartes, mythique, nouvelles, garantie }`.
 *
 * Trois temps : les bandes annoncées, la rare garantie, la carte 5 (mythique si
 * la pitié a parlé ou si le sort le veut). Puis la **garantie des nouvelles** :
 * tant que le joueur peut recevoir trois cartes neuves, un doublon des trois
 * premières places est échangé contre une carte neuve **au moins aussi rare**
 * (jamais l'inverse : un échange ne fait jamais perdre une mythique).
 */
export function tirerCartes({ rayonId, progression = null, collection = null, rng = Math.random, pitie = 0 } = {}) {
  const rayon = rayonParId(rayonId);
  if (!rayon) return { ok: false, raison: 'rayon-inconnu', cartes: [], mythique: false, nouvelles: 0, garantie: 0 };
  if (!rayonOuvert(rayonId, progression)) {
    return { ok: false, raison: 'rayon-ferme', cartes: [], mythique: false, nouvelles: 0, garantie: 0 };
  }
  const vivier = vivierRayon(rayonId, progression);
  if (!vivier.length) return { ok: false, raison: 'rayon-vide', cartes: [], mythique: false, nouvelles: 0, garantie: 0 };

  const bandes = parRarete(vivier);
  const possedees = new Set(collection ?? collectionJoueur({ progression }));
  const tirees = [];

  // Chaque place prend la première bande qui a encore une carte libre : un
  // vivier sans commune ne bloque jamais un paquet, il le rend plus généreux.
  const placer = (ordre) => {
    for (const bande of ordre) {
      const candidats = (bandes[bande] ?? []).filter((id) => !tirees.includes(id));
      const id = tirerParmi(candidats, rng);
      if (id) {
        tirees.push(id);
        return id;
      }
    }
    return null;
  };

  const bandeCommune = rng() < TAUX.communes ? ['commune', 'inhabituelle'] : ['inhabituelle', 'commune'];
  for (let place = 0; place < 3; place += 1) placer([...bandeCommune, 'rare', 'mythique']);
  placer(['rare', 'mythique', 'inhabituelle', 'commune']);

  const seuilPitie = Math.max(1, Math.floor(TAUX.pitie));
  const chanceMythique = rayon.chanceMythique ?? TAUX.mythique;
  const mythiqueAssuree = (Number(pitie) || 0) + 1 >= seuilPitie;
  const viseMythique = bandes.mythique.length > 0 && (mythiqueAssuree || rng() < chanceMythique);
  placer(viseMythique ? ['mythique', 'rare', 'inhabituelle', 'commune'] : ['rare', 'mythique', 'inhabituelle', 'commune']);

  const compteNouvelles = () => tirees.filter((id) => !possedees.has(id)).length;
  const disponiblesNeuves = vivier.filter((id) => !possedees.has(id)).length;
  const garantie = Math.min(TAUX.nouvellesMin, disponiblesNeuves);
  for (let place = 0; place < 3 && compteNouvelles() < garantie; place += 1) {
    const actuelle = tirees[place];
    if (!actuelle || !possedees.has(actuelle)) continue;
    const rang = RANG_RARETE[cardRarityInfo(cardById(actuelle)).key] ?? 0;
    const remplacant = ['rare', 'inhabituelle', 'commune']
      .flatMap((bande) => (RANG_RARETE[bande] >= rang ? (bandes[bande] ?? []) : []))
      .find((id) => !tirees.includes(id) && !possedees.has(id));
    if (remplacant) tirees[place] = remplacant;
  }

  return {
    ok: true,
    raison: null,
    cartes: tirees,
    mythique: tirees.some((id) => cardById(id)?.rarity === 'mythique'),
    nouvelles: compteNouvelles(),
    garantie,
  };
}

/** Le détail d'une carte tirée, prêt pour la cérémonie d'ouverture. */
function detaillerTirage(cartes, collection) {
  const possedees = new Set(collection ?? []);
  const details = cartes.map((id) => {
    const carte = cardById(id);
    const doublon = possedees.has(id);
    return {
      id,
      carte,
      rarete: cardRarityInfo(carte).key,
      doublon,
      remboursement: doublon ? creditsDeDoublons([id]) : 0,
    };
  });
  return { details, remboursement: details.reduce((somme, carte) => somme + carte.remboursement, 0) };
}

/**
 * Achète et ouvre un paquet : le solde est débité, les cinq cartes rejoignent le
 * portefeuille, les doublons sont remboursés, la pitié est mise à jour. Rend
 * `{ ok, raison, portefeuille, prix, tirage }` — un refus ne touche à rien.
 */
export function ouvrirBooster({ portefeuille, rayonId, progression = null, collection = null, rng = Math.random } = {}) {
  const base = normaliserPortefeuille(portefeuille);
  const rayon = rayonParId(rayonId);
  if (!rayon) return { ok: false, raison: 'rayon-inconnu', portefeuille: base, prix: 0, tirage: null };
  const achat = depenserCredits(base, rayon.prix);
  if (!achat.ok) return { ok: false, raison: achat.raison, portefeuille: base, prix: rayon.prix, tirage: null };

  const tirage = tirerCartes({ rayonId, progression, collection, rng, pitie: base.pitie });
  if (!tirage.ok) return { ok: false, raison: tirage.raison, portefeuille: base, prix: rayon.prix, tirage: null };

  const possedees = new Set(collection ?? collectionJoueur({ progression }));
  const { details, remboursement } = detaillerTirage(tirage.cartes, possedees);
  let apres = achat.portefeuille;
  apres = ajouterCartesAuPortefeuille(apres, tirage.cartes);
  apres = enregistrerOuverture(apres, { mythique: tirage.mythique });
  if (remboursement) {
    apres = { ...apres, credits: apres.credits + remboursement, majLe: new Date().toISOString() };
  }
  return {
    ok: true,
    raison: null,
    portefeuille: apres,
    prix: rayon.prix,
    tirage: { ...tirage, details, remboursement },
  };
}

/**
 * Le coffret : dix paquets d'un même rayon pour le prix de neuf. Une mythique
 * est assurée sur l'ensemble (elle ne peut pas se cacher dans dix paquets quand
 * le vivier en garde une) — le paquet qui la porte est tiré avec la pitié
 * forcée, puis les suivants suivent la règle normale.
 */
export function ouvrirCoffret({ portefeuille, rayonId, progression = null, collection = null, rng = Math.random } = {}) {
  const base = normaliserPortefeuille(portefeuille);
  const rayon = rayonParId(rayonId);
  const prix = prixCoffret(rayonId);
  if (!rayon || prix === null) return { ok: false, raison: 'rayon-inconnu', portefeuille: base, prix: 0, paquets: [] };
  if (!rayonOuvert(rayonId, progression)) return { ok: false, raison: 'rayon-ferme', portefeuille: base, prix, paquets: [] };
  const achat = depenserCredits(base, prix);
  if (!achat.ok) return { ok: false, raison: achat.raison, portefeuille: base, prix, paquets: [] };

  const vivier = vivierRayon(rayonId, progression);
  const possedees = new Set(collection ?? collectionJoueur({ progression }));
  const aDesMythiques = vivier.some((id) => cardById(id)?.rarity === 'mythique');
  let apres = achat.portefeuille;
  const paquets = [];
  let mythique = false;
  for (let index = 0; index < COFFRET.taille; index += 1) {
    const forcer = COFFRET.mythiqueAssuree && aDesMythiques && !mythique && index === COFFRET.taille - 1;
    const tirage = tirerCartes({
      rayonId,
      progression,
      collection: [...possedees],
      rng,
      pitie: forcer ? TAUX.pitie : apres.pitie,
    });
    if (!tirage.ok) break;
    const { details, remboursement } = detaillerTirage(tirage.cartes, possedees);
    for (const carte of details) possedees.add(carte.id);
    apres = ajouterCartesAuPortefeuille(apres, tirage.cartes);
    apres = enregistrerOuverture(apres, { mythique: tirage.mythique });
    if (remboursement) apres = { ...apres, credits: apres.credits + remboursement, majLe: new Date().toISOString() };
    mythique = mythique || tirage.mythique;
    paquets.push({ ...tirage, details, remboursement });
  }
  return { ok: true, raison: null, portefeuille: apres, prix, paquets, mythique };
}

/** Les quatre couleurs du duel, exportées pour l'écran du Souk. */
export const COULEURS_SOUK = Object.freeze([...RPG_ELEMENTS]);

/** L'étage qui a introduit une carte — l'écran s'en sert pour dire « venu de tel palier ». */
export function etageIntroduction(cardId) {
  const etageId = INTRO_PAR_CARTE.get(cardId);
  return etageId ? (etageHistoireParId(etageId)?.etage ?? null) : null;
}
