import { cardById, cardColors } from './rpgCards.js';
import { carteCorrespondMateriau } from './rpgAscension.js';

/** Fonctions pures communes au moteur, aux disponibilités et aux IA. */
export function planRenfortAscension(camp, effet) {
  if (effet?.type !== 'renfort-ascension') return [];
  const zone = camp?.[effet.zone] ?? [];
  const pris = new Set();
  return (effet.roles ?? []).flatMap((role) => {
    const indices = [...zone.keys()];
    if (effet.zone === 'deck') indices.reverse(); // Le dessus est la fin du tableau.
    const index = indices.find((i) => !pris.has(i) && carteCorrespondMateriau(zone[i], { ...role, sansAscension: true })
      && !cardById(zone[i])?.jeton);
    if (index === undefined) return [];
    pris.add(index);
    return [{ id: zone[index], index }];
  });
}

export function indexReanimation(camp, effet = {}) {
  for (let i = (camp?.cimetiere?.length ?? 0) - 1; i >= 0; i -= 1) {
    const carte = cardById(camp.cimetiere[i]);
    if (carte && ['creature', 'hero'].includes(carte.kind)
      && (!effet.element || cardColors(carte).includes(effet.element))
      && (!Number.isFinite(effet.coutMax) || carte.cost <= effet.coutMax)
      && (!effet.sansAscension || !carte.ascension)) return i;
  }
  return -1;
}

export const renfortDejaJoue = (camp, carteId) => Boolean(camp?.renfortsAscensionJoues?.[carteId]);
export function marquerRenfort(camp, carteId) {
  (camp.renfortsAscensionJoues ??= {})[carteId] = true;
}
