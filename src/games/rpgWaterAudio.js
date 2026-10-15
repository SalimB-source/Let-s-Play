/**
 * Routage du bruitage Eau du Sablier.
 * Les cartes hybrides qui contiennent Eau gardent aussi cette identité sonore.
 */
import { cardById, cardColors } from './rpgCards.js';

export const RPG_WATER_SFX = 'water_wave';

function resolveCard(cardOrId) {
  return typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
}

/** Retourne le bruitage Eau associé à un sort, sinon `null`. */
export function rpgWaterSoundFor(cardOrId, action) {
  const card = resolveCard(cardOrId);
  if (!card || card.kind !== 'magie' || !cardColors(card).includes('eau')) return null;
  return action === 'spell' ? RPG_WATER_SFX : null;
}
