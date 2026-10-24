/**
 * L'étal du Souk : cinq cartes rares ou mythiques vendues à l'unité.
 *
 * Le tirage initial est déterministe (jour + graine du joueur), les offres et
 * le rafraichissement unique sont conservés dans le portefeuille. Toutes les
 * règles sont pures : l'écran ne décide ni d'un prix, ni d'un tirage, ni d'un
 * débit. Une carte déjà possédée n'est jamais facturée une seconde fois.
 */

import {
  RPG_DUEL_CARDS,
  carteJouableSansTerrain,
  cardById,
  cardRarityInfo,
} from './rpgCards.js';
import {
  ajouterCartesAuPortefeuille,
  depenserCredits,
  normaliserPortefeuille,
} from './rpgCredits.js';
import { graineNumerique, melanger, rngSeme } from './rpgHasard.js';
import { jourCourant } from './rpgQuetes.js';

export const PRIX_CARTE_DIRECTE = Object.freeze({ rare: 150, mythique: 300 });
export const SOUK_DIRECT_REGLES = Object.freeze({
  cartesParJour: 5,
  rafraichissementsParJour: 1,
  prix: PRIX_CARTE_DIRECTE,
});

const CATALOGUE_DIRECT = Object.freeze(
  RPG_DUEL_CARDS.filter((carte) => carteJouableSansTerrain(carte)
    && Object.hasOwn(PRIX_CARTE_DIRECTE, cardRarityInfo(carte).key)),
);

/** Prix public d'une carte, ou `null` si elle n'appartient pas à cet étal. */
export function prixCarteDirecte(carteOuId) {
  const carte = typeof carteOuId === 'string' ? cardById(carteOuId) : carteOuId;
  if (!carteJouableSansTerrain(carte)) return null;
  return PRIX_CARTE_DIRECTE[cardRarityInfo(carte).key] ?? null;
}

function isoDe(horloge) {
  const date = new Date(horloge);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function avecEtal(portefeuille, etal, horloge) {
  const le = isoDe(horloge);
  return normaliserPortefeuille({
    ...portefeuille,
    etal: { ...etal, majLe: le },
    majLe: le,
  });
}

/**
 * Cinq identifiants distincts pour un couple jour/graine. Les deux raretés
 * sont représentées dès que le catalogue le permet. `exclure` sert au second
 * tirage : rafraîchir propose réellement cinq autres cartes.
 */
export function tirageEtal({ jour, graine = null, generation = 0, exclure = [] } = {}) {
  if (typeof jour !== 'string' || !jour) return [];
  const exclusions = new Set(Array.isArray(exclure) ? exclure : []);
  const rng = rngSeme(graineNumerique(
    `sablier-souk-direct:${jour}:${graine ?? 'sans-compte'}:${Math.max(0, Math.floor(Number(generation) || 0))}`,
  ));
  const restant = melanger(CATALOGUE_DIRECT.filter((carte) => !exclusions.has(carte.id)), rng);
  const selection = [];
  // Une rare et une mythique au minimum : les deux prix sont ainsi visibles
  // chaque jour, pas seulement lorsque le hasard y pense.
  for (const rarete of ['rare', 'mythique']) {
    const index = restant.findIndex((carte) => cardRarityInfo(carte).key === rarete);
    if (index >= 0) selection.push(...restant.splice(index, 1));
  }
  while (selection.length < SOUK_DIRECT_REGLES.cartesParJour && restant.length) {
    selection.push(restant.shift());
  }
  return melanger(selection, rng).slice(0, SOUK_DIRECT_REGLES.cartesParJour).map((carte) => carte.id);
}

/**
 * Ouvre ou relit l'étal du jour. Le jour ne recule pas, comme pour les quêtes.
 * Aucun nouveau tirage n'est fait à chaque rendu : seules une nouvelle journée
 * ou une sauvegarde incomplète en provoquent un.
 */
export function ouvrirEtalDuJour({ portefeuille, graine = null, horloge = Date.now() } = {}) {
  const base = normaliserPortefeuille(portefeuille);
  const jour = jourCourant(horloge, base.etal.jour);
  const nouveauJour = Boolean(jour && jour !== base.etal.jour);
  const incomplet = Boolean(jour && base.etal.cartes.length !== SOUK_DIRECT_REGLES.cartesParJour);
  if (!nouveauJour && !incomplet) return { portefeuille: base, etal: base.etal, modifie: false };
  if (!jour) return { portefeuille: base, etal: base.etal, modifie: false };
  const etal = nouveauJour
    ? {
      jour,
      cartes: tirageEtal({ jour, graine }),
      achetees: [],
      rafraichissements: 0,
    }
    : {
      ...base.etal,
      cartes: tirageEtal({
        jour,
        graine,
        generation: base.etal.rafraichissements,
      }),
    };
  const suivant = avecEtal(base, etal, horloge);
  return { portefeuille: suivant, etal: suivant.etal, modifie: true };
}

/** Le second et dernier tirage du jour. Un refus ne modifie ni offres ni solde. */
export function rafraichirEtalDuJour({ portefeuille, graine = null, horloge = Date.now() } = {}) {
  const ouverture = ouvrirEtalDuJour({ portefeuille, graine, horloge });
  const base = ouverture.portefeuille;
  if (base.etal.rafraichissements >= SOUK_DIRECT_REGLES.rafraichissementsParJour) {
    return { ok: false, raison: 'rafraichissement-utilise', portefeuille: base, cartes: base.etal.cartes };
  }
  if (base.etal.cartes.length !== SOUK_DIRECT_REGLES.cartesParJour) {
    return { ok: false, raison: 'etal-indisponible', portefeuille: base, cartes: base.etal.cartes };
  }
  const cartes = tirageEtal({
    jour: base.etal.jour,
    graine,
    generation: base.etal.rafraichissements + 1,
    exclure: base.etal.cartes,
  });
  if (cartes.length !== SOUK_DIRECT_REGLES.cartesParJour) {
    return { ok: false, raison: 'etal-indisponible', portefeuille: base, cartes: base.etal.cartes };
  }
  const suivant = avecEtal(base, {
    ...base.etal,
    cartes,
    rafraichissements: base.etal.rafraichissements + 1,
  }, horloge);
  return { ok: true, raison: null, portefeuille: suivant, cartes: suivant.etal.cartes };
}

/**
 * Achète exactement un exemplaire de la carte proposée. Aucun compteur de
 * booster ni pitié ne bouge : c'est une vente à l'unité, pas une ouverture.
 */
export function acheterCarteDirecte({
  portefeuille,
  cardId,
  collection = null,
  graine = null,
  horloge = Date.now(),
} = {}) {
  const base = ouvrirEtalDuJour({ portefeuille, graine, horloge }).portefeuille;
  const carte = cardById(cardId);
  const prix = prixCarteDirecte(carte);
  const refus = (raison) => ({ ok: false, raison, portefeuille: base, carte, prix, exemplaires: 0 });
  if (!carte || prix === null) return refus('carte-non-vendue');
  if (!base.etal.cartes.includes(carte.id)) return refus('hors-etal');
  if (base.etal.achetees.includes(carte.id)) return refus('deja-achetee');
  const possedees = collection instanceof Set
    ? collection
    : new Set(Array.isArray(collection) ? collection : base.cartes);
  if (possedees.has(carte.id)) return refus('deja-possedee');
  const paiement = depenserCredits(base, prix);
  if (!paiement.ok) return refus(paiement.raison);

  // `ajouterCartesAuPortefeuille` est une union : même un appel concurrent ou
  // rejoué ne peut pas créer deux entrées. Le garde-fou `achetees` bloque le
  // second débit et la collection reçoit exactement ce seul identifiant.
  const avecCarte = ajouterCartesAuPortefeuille(paiement.portefeuille, [carte.id]);
  const suivant = avecEtal(avecCarte, {
    ...avecCarte.etal,
    achetees: [...avecCarte.etal.achetees, carte.id],
  }, horloge);
  return { ok: true, raison: null, portefeuille: suivant, carte, prix, exemplaires: 1 };
}
