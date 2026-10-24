/**
 * L'étal du Souk : cinq cartes rares ou mythiques vendues à l'unité.
 *
 * Le tirage initial est déterministe (jour + graine du joueur), les offres et
 * le rafraichissement unique sont conservés dans le portefeuille. Toutes les
 * règles sont pures : l'écran ne décide ni d'un prix, ni d'un tirage, ni d'un
 * débit.
 *
 * **Ce que vend l'étal : un exemplaire, jusqu'au quota du deck.** Posséder une
 * carte ouvre son playset à l'atelier (`exemplairesPossedables`), mais le stock
 * acquis, lui, se compte — dans `portefeuille.exemplaires` (`rpgCredits.js`).
 * Une rare achetée une fois est donc vendable une seconde fois ; une mythique,
 * unique dans un deck, ne s'achète qu'avant de la posséder. Au-delà du quota,
 * la carte est « complète » : rien n'est facturé, et l'étal le dit au lieu de
 * laisser le joueur croire qu'il lui manque encore quelque chose.
 */

import {
  RPG_DUEL_CARDS,
  carteJouableSansTerrain,
  cardById,
  cardCopyLimit,
  cardRarityInfo,
} from './rpgCards.js';
import {
  ajouterExemplaireAuPortefeuille,
  depenserCredits,
  normaliserPortefeuille,
} from './rpgCredits.js';
import { lireExemplaire } from './rpgCollection.js';
import { graineNumerique, melanger, rngSeme } from './rpgHasard.js';
import { jourCourant } from './rpgQuetes.js';

export const PRIX_CARTE_DIRECTE = Object.freeze({ rare: 150, mythique: 300 });
export const SOUK_DIRECT_REGLES = Object.freeze({
  cartesParJour: 5,
  rafraichissementsParJour: 1,
  /** Un seul exemplaire par carte **et par jour** : le garde-fou `achetees` est
   *  ce qui rend le geste idempotent, un double clic ne débite pas deux fois. */
  exemplairesParAchat: 1,
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

/** Une collection (tableau, `Set` ou absence) en ensemble d'identifiants. */
function ensembleDe(collection, secours = null) {
  if (collection instanceof Set) return collection;
  if (Array.isArray(collection)) return new Set(collection);
  return new Set(secours?.cartes ?? []);
}

/**
 * Le **stock** d'une carte au regard de l'étal : `{ possedee, acquis, limite,
 * reste, complet }`. Le quota vient de la rareté (`cardCopyLimit`) et le stock
 * du compteur du portefeuille (`lireExemplaire`) — l'écran n'invente ni l'un ni
 * l'autre. Une carte possédée hors du Souk (héritée des Tours, reçue d'un autre
 * appareil) compte déjà pour un exemplaire : c'est exactement ce qui la rend
 * **complète** si sa rareté n'en admet qu'un.
 */
export function stockDeLaCarte(carteOuId, { collection = null, exemplaires = null } = {}) {
  const carte = typeof carteOuId === 'string' ? cardById(carteOuId) : carteOuId;
  if (!carte) {
    return { carte: null, possedee: false, acquis: 0, limite: 0, reste: 0, complet: true };
  }
  const possedees = ensembleDe(collection);
  const acquis = lireExemplaire(exemplaires, carte.id, possedees.has(carte.id));
  const quota = cardCopyLimit(carte);
  const limite = Number.isFinite(quota) ? quota : Infinity;
  return {
    carte,
    possedee: acquis > 0,
    acquis,
    limite,
    reste: Math.max(0, limite - acquis),
    complet: acquis >= limite,
  };
}

/**
 * Ce que l'étal doit montrer pour une carte : son prix, son stock, et l'état
 * qui en découle. `disponible` veut dire « il vous manque encore une copie » —
 * que ce soit la première ou la seconde ; `complet` veut dire « le quota du deck
 * est atteint, il n'y a plus rien à acheter ici ». Le garde-fou du jour
 * (`achetee`) passe avant tout : c'est ce qui rend un double clic inoffensif.
 */
export function vueCarteDeEtal({
  id,
  collection = null,
  exemplaires = null,
  acheteAujourdhui = false,
  credits = 0,
} = {}) {
  const carte = cardById(id);
  if (!carte) return null;
  const prix = prixCarteDirecte(carte);
  // Une carte que l'étal ne vend pas n'a pas de vue : refuser ici ferme aussi
  // la seule branche où le quota ne serait pas borné (un terrain, `Infinity`).
  if (prix === null) return null;
  const stock = stockDeLaCarte(carte, { collection, exemplaires });
  const solde = Math.max(0, Math.floor(Number(credits) || 0));
  const assez = prix !== null && solde >= prix;
  // Le quota passe avant le garde-fou du jour : « achetée aujourd'hui » promet
  // un retour demain, « complet » dit qu'il n'y a plus rien à acheter du tout.
  // Quand les deux sont vrais, c'est le second qui est vrai.
  const etat = stock.complet ? 'complet'
    : acheteAujourdhui ? 'achetee'
      : !assez ? 'sans-solde'
        : 'disponible';
  return {
    carte,
    rarete: cardRarityInfo(carte),
    prix,
    etat,
    achatPossible: etat === 'disponible',
    manquante: !stock.possedee,
    ...stock,
    manque: assez ? 0 : Math.max(0, (prix ?? 0) - solde),
  };
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
 * Achète **un** exemplaire de la carte proposée, tant que le quota de sa rareté
 * n'est pas atteint. Aucun compteur de booster ni pitié ne bouge : c'est une
 * vente à l'unité, pas une ouverture.
 *
 * Trois gardes, dans cet ordre — le même que la vue de l'écran, pour que les
 * deux disent toujours la même chose : la carte est bien sur l'étal du jour,
 * elle n'y a pas déjà été payée aujourd'hui, et il lui reste une copie à
 * vendre. Vient ensuite la caisse. Un refus rend le portefeuille **d'avant le
 * débit**, jamais un solde entamé.
 */
export function acheterCarteDirecte({
  portefeuille,
  cardId,
  collection = null,
  exemplaires = null,
  graine = null,
  horloge = Date.now(),
} = {}) {
  const base = ouvrirEtalDuJour({ portefeuille, graine, horloge }).portefeuille;
  const carte = cardById(cardId);
  const prix = prixCarteDirecte(carte);
  const comptes = exemplaires ?? base.exemplaires;
  const possedees = ensembleDe(collection, base);
  const stock = carte
    ? stockDeLaCarte(carte, { collection: possedees, exemplaires: comptes })
    : stockDeLaCarte(null, { collection: possedees, exemplaires: comptes });
  const refus = (raison) => ({
    ok: false, raison, portefeuille: base, carte: carte ?? null, prix,
    exemplaires: 0, acquis: stock.acquis, limite: stock.limite,
  });
  if (!carte || prix === null) return refus('carte-non-vendue');
  if (!base.etal.cartes.includes(carte.id)) return refus('hors-etal');
  // Une carte déjà possédée n'est plus une punition : elle est **vendable
  // jusqu'au quota du deck**. Au-delà, rien ne part — et l'étal le dit, avant
  // même de parler du garde-fou du jour, dans le même ordre que la vue.
  if (stock.complet) return refus('quota-atteint');
  if (base.etal.achetees.includes(carte.id)) return refus('deja-achetee');
  const paiement = depenserCredits(base, prix);
  if (!paiement.ok) return refus(paiement.raison);

  // Posséder (l'union sur `cartes`) et compter (le stock) se font d'un seul
  // tenant : un appel concurrent ou rejoué ne peut pas débiter une copie de
  // plus que le quota, et le garde-fou `achetees` ferme la journée.
  const copie = ajouterExemplaireAuPortefeuille(paiement.portefeuille, carte.id, {
    possedee: possedees.has(carte.id),
  });
  if (!copie.ajoute) return refus('quota-atteint');
  const suivant = avecEtal(copie.portefeuille, {
    ...copie.portefeuille.etal,
    achetees: [...copie.portefeuille.etal.achetees, carte.id],
  }, horloge);
  return {
    ok: true,
    raison: null,
    portefeuille: suivant,
    carte,
    prix,
    exemplaires: SOUK_DIRECT_REGLES.exemplairesParAchat,
    acquis: copie.total,
    limite: stock.limite,
    complet: copie.total >= stock.limite,
  };
}
