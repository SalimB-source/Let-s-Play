/**
 * Routage du bruitage et reconnaissance visuelle de la foudre du Sablier.
 *
 * Le Thunder Spark Transition accompagne le sort Éclair du marteau et
 * l'effet d'arrivée du Maître du marteau. Le journal des blessures nomme
 * toujours la carte source pour que la table fasse tomber le même éclair sur
 * la créature touchée — jamais pour la Neige ordinaire.
 */
import { cardById } from './rpgCards.js';
import { RPG_FOUDRE_MARTEAU_SFX } from './rpgAudio.js';

/** Le sort dont le coup fait tomber la foudre sur une créature. */
export const ECLAIR_DU_MARTEAU_ID = 'eclair-du-marteau';

/** La créature dont les 3 dégâts d'arrivée partagent cette cinématique. */
export const MAITRE_DU_MARTEAU_ID = 'maitre-du-marteau';

const CARTES_FOUDRE_MARTEAU = new Set([ECLAIR_DU_MARTEAU_ID, MAITRE_DU_MARTEAU_ID]);

function resolveCard(cardOrId) {
  return typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
}

/** Route le même échantillon vers le sort et l'effet d'arrivée du Maître. */
export function rpgFoudreSoundFor(cardOrId, action) {
  const card = resolveCard(cardOrId);
  if (!card || !action) return null;
  if (card.id === ECLAIR_DU_MARTEAU_ID && action === 'spell') return RPG_FOUDRE_MARTEAU_SFX;
  if (card.id === MAITRE_DU_MARTEAU_ID && action === 'arrival') return RPG_FOUDRE_MARTEAU_SFX;
  return null;
}

/**
 * La blessure vient-elle d'un des deux marteaux ? Le journal nomme la carte :
 * l'Éclair (sort) et le Maître (3 dégâts d'arrivée) allument la même foudre.
 */
export function blessureDuMarteau(blessure) {
  return CARTES_FOUDRE_MARTEAU.has(blessure?.sourceCarteId);
}
