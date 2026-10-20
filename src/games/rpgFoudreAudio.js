/**
 * Routage du bruitage de foudre du Sablier — désormais muet.
 *
 * L'Éclair du marteau gardait le seul coup de tonnerre du jeu, synthétisé en
 * WebAudio ; ce son a été retiré avec tout le catalogue synthétique, et le
 * sort se joue à présent sans bruitage propre. Reste la lecture visuelle :
 * la table lit `ECLAIR_DU_MARTEAU_ID` pour reconnaître, dans le journal des
 * blessures, la créature que le marteau vient de toucher et allumer sa
 * foudre à l'écran.
 */
import { cardById } from './rpgCards.js';

/** La carte dont le coup fait tomber la foudre sur une créature. */
export const ECLAIR_DU_MARTEAU_ID = 'eclair-du-marteau';

function resolveCard(cardOrId) {
  return typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
}

/**
 * Le tonnerre synthétisé a quitté le jeu : plus aucune carte n'a de bruitage
 * de foudre, et `null` est retourné partout. La chaîne de la page retombe
 * alors sur le son commun des magies — silencieux lui aussi tant qu'aucun
 * échantillon ne lui est fourni.
 */
export function rpgFoudreSoundFor(cardOrId, action) {
  const card = resolveCard(cardOrId);
  if (!card || !action) return null;
  return null;
}

/** La blessure vient-elle du marteau ? Le journal nomme la carte du coup. */
export function blessureDuMarteau(blessure) {
  return blessure?.sourceCarteId === ECLAIR_DU_MARTEAU_ID;
}
