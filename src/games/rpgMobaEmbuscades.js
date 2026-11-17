import { cardById, cardHasPrintedType } from './rpgCards.js';

/** Conditions communes des Embuscades : réévaluées à chaque annonce.
 *
 * Réduites volontairement à quatre cartes : les autres créatures qui
 * portaient une Invocation spéciale se jouent maintenant comme n'importe
 * quelle créature (coût, sacrifices, quota). Une entrée retirée d'ici rend la
 * carte normale — le texte imprimé suit, il est calculé depuis ces tables. */
export const MOBA_EMBUSCADES_CONDITIONS = Object.freeze({
  'pilote-de-la-carreira': 'Vous n’avez aucun Navire en main.',
  'kenshi-de-la-forge': 'Vous contrôlez deux autres Samouraïs.',
  'pretre-de-la-bouche': 'Vous avez au moins deux cartes de créature dans votre cimetière.',
  'veilleuse-des-citernes': 'Vous contrôlez une créature blessée.',
  'volva-soigneuse': 'Vous contrôlez un Viking blessé.',
});

export function rpgMobaConditionSpeciale(duel, side, cardId) {
  if (!duel || !Object.hasOwn(MOBA_EMBUSCADES_CONDITIONS, cardId) || !duel[side]) return false;
  const allies = duel[side].creatures.filter((e) => cardById(e.carteId)?.kind !== 'site');
  const cimetiere = duel[side].cimetiere ?? [];
  switch (cardId) {
    case 'pilote-de-la-carreira': return !duel[side].main.some((id) => cardHasPrintedType(id, 'Navire'));
    case 'kenshi-de-la-forge': return allies.filter((e) => cardHasPrintedType(e.carteId, 'Samouraï')).length >= 2;
    case 'pretre-de-la-bouche': return cimetiere
      .filter((id) => ['creature', 'hero'].includes(cardById(id)?.kind)).length >= 2;
    case 'veilleuse-des-citernes': return allies.some((e) => e.pv < e.pvMax);
    case 'volva-soigneuse': return allies.some((e) => e.pv < e.pvMax && cardHasPrintedType(e.carteId, 'Viking'));
    default: return false;
  }
}
