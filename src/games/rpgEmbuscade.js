import { MOBA_EMBUSCADES_CONDITIONS, rpgMobaConditionSpeciale } from './rpgMobaEmbuscades.js';
import { MOBA_RAPIDITE_EMBUSCADES, rpgMobaConditionRapidite } from './rpgMobaRapidite.js';
import { MOBA_EMBUSCADES_IMPRIMEES, rpgMobaConditionImprimee } from './rpgMobaEmbuscadesImprimees.js';

/** Les mêmes cartes et conditions d'Embuscade s'appliquent dans tous les modes. */
export function rpgCarteEmbuscade(carteOuId) {
  const id = typeof carteOuId === 'string' ? carteOuId : carteOuId?.id;
  return Boolean(id && (Object.hasOwn(MOBA_EMBUSCADES_CONDITIONS, id)
    || Object.hasOwn(MOBA_RAPIDITE_EMBUSCADES, id)
    || Object.hasOwn(MOBA_EMBUSCADES_IMPRIMEES, id)));
}
export function rpgConditionEmbuscadeCommune(duel, cote, carteOuId) {
  const id = typeof carteOuId === 'string' ? carteOuId : carteOuId?.id;
  return Boolean(duel?.[cote] && rpgCarteEmbuscade(id) && (
    rpgMobaConditionSpeciale(duel, cote, id) || rpgMobaConditionRapidite(duel, cote, id)
    || rpgMobaConditionImprimee(duel, cote, id)));
}
export function rpgTexteConditionEmbuscade(carteOuId) {
  const id = typeof carteOuId === 'string' ? carteOuId : carteOuId?.id;
  return MOBA_RAPIDITE_EMBUSCADES[id]?.texte ?? MOBA_EMBUSCADES_IMPRIMEES[id]?.texte
    ?? MOBA_EMBUSCADES_CONDITIONS[id] ?? null;
}
