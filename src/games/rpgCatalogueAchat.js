/** Achat d'une carte manquante directement dans le catalogue, hors étal quotidien. */
import { RPG_DUEL_CARDS, cardById, cardRarityInfo, carteJouableSansTerrain } from './rpgCards.js';
import { ajouterExemplaireAuPortefeuille, depenserCredits, normaliserPortefeuille } from './rpgCredits.js';
import { PRIX_CARTE_DIRECTE } from './rpgSoukDirect.js';

// Le Souk fixe déjà les prix des trois raretés supérieures. La commune, qui
// n'est pas vendue à l'étal, coûte moins cher qu'une inhabituelle.
export const PRIX_CARTE_CATALOGUE = Object.freeze({ commune: 40, ...PRIX_CARTE_DIRECTE });
const IDS_CATALOGUE = new Set(RPG_DUEL_CARDS.map((carte) => carte.id));

/** Prix officiel, uniquement pour une carte collectionnable et jouable. */
export function prixCarteCatalogue(cardId) {
  if (typeof cardId !== 'string' || !IDS_CATALOGUE.has(cardId)) return null;
  const carte = cardById(cardId);
  if (!carteJouableSansTerrain(carte)) return null;
  return PRIX_CARTE_CATALOGUE[cardRarityInfo(carte).key] ?? null;
}

/** Un seul exemplaire d'une carte absente ; un refus ne débite rien. */
export function acheterCarteCatalogue({ portefeuille, cardId, collection = null } = {}) {
  const base = normaliserPortefeuille(portefeuille);
  const prix = prixCarteCatalogue(cardId);
  const refus = (raison) => ({ ok: false, raison, portefeuille: base, prix });
  if (prix === null) return refus('carte-non-vendue');
  // Le portefeuille fait autorité même si une vue de collection est périmée.
  if (base.cartes.includes(cardId) || (collection instanceof Set ? collection.has(cardId) : Array.isArray(collection) && collection.includes(cardId))) {
    return refus('deja-possedee');
  }
  const paiement = depenserCredits(base, prix);
  if (!paiement.ok) return refus(paiement.raison);
  const copie = ajouterExemplaireAuPortefeuille(paiement.portefeuille, cardId, { possedee: false });
  if (!copie.ajoute) return refus('quota-atteint');
  return { ok: true, raison: null, portefeuille: copie.portefeuille, carte: cardById(cardId), prix, exemplaires: 1 };
}
