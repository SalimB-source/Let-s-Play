import { cardById } from './rpgCards.js';
import { RPG_MODE_MANA_ESSAI, RPG_MANA_ESSAI_CHAMP_MAX } from './rpgManaEssai.js';

/** Prix d'invocation depuis la main, en plus du mana. Les effets qui créent
 * ou réaniment des créatures ne sont pas des invocations depuis la main. */
export function sacrificesInvocation(carte, duel = null) {
  if (!['creature', 'hero'].includes(carte?.kind ?? cardById(carte?.id)?.kind)) return 0;
  const cout = Number(carte.cost) || 0;
  return cout >= 7 ? 2 : cout >= 5 ? 1 : 0;
}
export function victimesInvocation(camp) {
  return (camp?.creatures ?? []).filter(e => cardById(e.carteId)?.kind !== 'site');
}
export function invocationPossible(duel, cote, carte) {
  if (!['creature', 'hero', 'site'].includes(carte?.kind ?? cardById(carte?.id)?.kind)) return true;
  const nombre = sacrificesInvocation(carte, duel);
  const camp = duel[cote];
  return !(duel.moba && nombre && duel.moba.sacrificesJoues?.[cote])
    && victimesInvocation(camp).length >= nombre
    && (duel.modeMana !== RPG_MODE_MANA_ESSAI
      || camp.creatures.length - nombre < RPG_MANA_ESSAI_CHAMP_MAX);
}
