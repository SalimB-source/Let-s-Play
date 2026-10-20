/**
 * Routage du bruitage de foudre du Sablier.
 * Une seule carte fait tomber le ciel : l'Éclair du marteau. Son coup de
 * tonnerre lui appartient — un autre sort de Neige (la Poigne de givre, le
 * Verglas) garde le bruit commun des magies, comme une magie Braise qui ne
 * brûle pas garde le sien. La table lit aussi `ECLAIR_DU_MARTEAU_ID` pour
 * reconnaître, dans le journal des blessures, la créature que le marteau
 * vient de toucher et allumer sa foudre.
 */
import { cardById } from './rpgCards.js';

export const RPG_FOUDRE_SFX = 'foudre_marteau';
/** La carte dont le coup fait tomber la foudre sur une créature. */
export const ECLAIR_DU_MARTEAU_ID = 'eclair-du-marteau';

function resolveCard(cardOrId) {
  return typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
}

/** Retourne le coup de tonnerre associé à un sort, sinon `null`. */
export function rpgFoudreSoundFor(cardOrId, action) {
  const card = resolveCard(cardOrId);
  if (!card || card.id !== ECLAIR_DU_MARTEAU_ID) return null;
  return action === 'spell' ? RPG_FOUDRE_SFX : null;
}

/** La blessure vient-elle du marteau ? Le journal nomme la carte du coup. */
export function blessureDuMarteau(blessure) {
  return blessure?.sourceCarteId === ECLAIR_DU_MARTEAU_ID;
}
