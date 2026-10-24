/**
 * Routage du bruitage et reconnaissance visuelle de la foudre du Sablier.
 *
 * Le catalogue synthétique a été retiré : ni l'Éclair du marteau ni l'arrivée
 * du Maître n'ont de bruitage propre. La lecture visuelle, elle, est partagée
 * par les deux cartes. Le journal des blessures nomme leur source pour que la
 * table fasse tomber le même éclair sur la créature touchée — le sort comme
 * les 3 dégâts que le Maître inflige en arrivant, jamais la Neige ordinaire.
 */
import { cardById } from './rpgCards.js';

/** Le sort dont le coup fait tomber la foudre sur une créature. */
export const ECLAIR_DU_MARTEAU_ID = 'eclair-du-marteau';

/** La créature dont les 3 dégâts d'arrivée partagent cette cinématique. */
export const MAITRE_DU_MARTEAU_ID = 'maitre-du-marteau';

const CARTES_FOUDRE_MARTEAU = new Set([ECLAIR_DU_MARTEAU_ID, MAITRE_DU_MARTEAU_ID]);

function resolveCard(cardOrId) {
  return typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
}

/**
 * Le tonnerre synthétisé a quitté le jeu : aucune carte n'a de bruitage de
 * foudre, et `null` est retourné partout. La chaîne de la page retombe alors
 * sur les sons communs, silencieux eux aussi tant qu'aucun échantillon n'est
 * fourni. Cette coupure audio ne retire évidemment rien à l'animation.
 */
export function rpgFoudreSoundFor(cardOrId, action) {
  const card = resolveCard(cardOrId);
  if (!card || !action) return null;
  return null;
}

/**
 * La blessure vient-elle d'un des deux marteaux ? Le journal nomme la carte :
 * l'Éclair (sort) et le Maître (3 dégâts d'arrivée) allument la même foudre.
 */
export function blessureDuMarteau(blessure) {
  return CARTES_FOUDRE_MARTEAU.has(blessure?.sourceCarteId);
}
