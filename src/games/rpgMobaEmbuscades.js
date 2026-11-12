import { cardById, cardColors, cardHasPrintedType } from './rpgCards.js';
import { mobaVoieJouable } from './rpgMoba.js';

/** Conditions propres au MOBA : les cartes imprimées et le duel classique
 * restent inchangés. Chaque pose réévalue l'état, sans quota de poses spéciales. */
export const MOBA_EMBUSCADES_CONDITIONS = Object.freeze({
  'faiseur-de-passage': 'Vous contrôlez une créature Sable.',
  'ghul-des-cendres': 'Vous contrôlez un autre Djinn.',
  feriel: 'Vous contrôlez une créature Sable et une créature Braise.',
  'veilleuse-des-citernes': 'Vous contrôlez une créature blessée.',
  'volva-soigneuse': 'Vous contrôlez un Viking blessé.',
  'kenshi-de-la-forge': 'Vous contrôlez un autre Samouraï.',
  'pretre-de-la-bouche': 'Une de vos voies a moins de PV que la voie adverse.',
  'pilote-de-la-carreira': 'Vous n’avez aucun Navire en main.',
  'corbeau-de-givre': 'L’adversaire contrôle une créature de coût 3 ou moins.',
});

export function rpgMobaConditionSpeciale(duel, side, cardId) {
  if (!duel?.moba || !Object.hasOwn(MOBA_EMBUSCADES_CONDITIONS, cardId) || !duel[side]) return false;
  const allies = duel[side].creatures.filter((e) => cardById(e.carteId)?.kind !== 'site');
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  const adversaires = duel[enemy].creatures.filter((e) => cardById(e.carteId)?.kind !== 'site');
  switch (cardId) {
    case 'faiseur-de-passage': return allies.some((e) => cardColors(cardById(e.carteId)).includes('sable'));
    case 'ghul-des-cendres': return allies.some((e) => cardHasPrintedType(e.carteId, 'Djinn'));
    case 'feriel': return allies.some((e) => cardColors(cardById(e.carteId)).includes('sable')
      && allies.some((autre) => autre.id !== e.id && cardColors(cardById(autre.carteId)).includes('braise')));
    case 'veilleuse-des-citernes': return allies.some((e) => e.pv < e.pvMax);
    case 'volva-soigneuse': return allies.some((e) => e.pv < e.pvMax && cardHasPrintedType(e.carteId, 'Viking'));
    case 'kenshi-de-la-forge': return allies.some((e) => cardHasPrintedType(e.carteId, 'Samouraï'));
    case 'pretre-de-la-bouche': return duel.moba.lanes.some((lane) => mobaVoieJouable(duel.moba, side, lane.id)
      && lane.hp[side] < lane.hp[enemy]);
    case 'pilote-de-la-carreira': return !duel[side].main.some((id) => cardHasPrintedType(id, 'Navire'));
    case 'corbeau-de-givre': return adversaires.some((e) => (cardById(e.carteId)?.cost ?? Infinity) <= 3);
    default: return false;
  }
}
