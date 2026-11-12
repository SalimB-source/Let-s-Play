import { cardById, cardHasPrintedType } from './rpgCards.js';
import { RPG_MODE_MANA_ESSAI, RPG_MANA_ESSAI_CHAMP_MAX } from './rpgManaEssai.js';

/** Prix d'invocation depuis la main, en plus du mana. Les effets qui créent
 * ou réaniment des créatures ne sont pas des invocations depuis la main. */
export function sacrificesInvocation(carte, duel = null, cote = null, specialeMoba = false) {
  if (duel?.moba && (specialeMoba || (cote && duel.tour !== cote && carte?.id === 'tojiro-le-pourfendeur'
    && duel[duel.tour]?.creatures.some((e) => cardHasPrintedType(e.carteId, 'Djinn'))))) return 0;
  if (!['creature', 'hero'].includes(carte?.kind ?? cardById(carte?.id)?.kind)) return 0;
  const cout = Number(carte.cost) || 0;
  return cout >= 7 ? 2 : cout >= 5 ? 1 : 0;
}
/** Classement des petites créatures selon leur coût imprimé. */
export function petiteCreatureMoba(carte) {
  const kind = carte?.kind ?? cardById(carte?.id)?.kind;
  const cout = Number(carte?.cost);
  return ['creature', 'hero'].includes(kind) && cout >= 1 && cout <= 4;
}
/** Une Embuscade ne dépense pas l'invocation normale, même à son propre tour.
 * L'ancien témoin `embuscadesJouees` est conservé pour les parties sérialisées,
 * mais ne limite plus les invocations spéciales en chaîne. */
function embuscadeMoba(duel, cote, carte, specialeMoba = false) {
  return Boolean(duel?.moba && (specialeMoba || cote !== duel.tour && carte?.reactionTourAdverse));
}
export function limiteInvocationMoba(duel, cote, carte, specialeMoba = false) {
  if (!duel?.moba || !['creature', 'hero'].includes(carte?.kind ?? cardById(carte?.id)?.kind)) return null;
  if (embuscadeMoba(duel, cote, carte, specialeMoba)) return null;
  return duel.moba.creaturesJouees?.[cote] ? 'creature-limite' : null;
}
export function marquerInvocationMoba(duel, cote, carte, specialeMoba = false) {
  if (!duel?.moba || !['creature', 'hero'].includes(carte?.kind ?? cardById(carte?.id)?.kind)) return;
  const quota = embuscadeMoba(duel, cote, carte, specialeMoba) ? 'embuscadesJouees' : 'creaturesJouees';
  (duel.moba[quota] ??= {})[cote] = true;
}
export function victimesInvocation(camp) {
  return (camp?.creatures ?? []).filter(e => cardById(e.carteId)?.kind !== 'site');
}
export function invocationPossible(duel, cote, carte, specialeMoba = false) {
  if (!['creature', 'hero', 'site'].includes(carte?.kind ?? cardById(carte?.id)?.kind)) return true;
  const nombre = sacrificesInvocation(carte, duel, cote, specialeMoba);
  const camp = duel[cote];
  return !limiteInvocationMoba(duel, cote, carte, specialeMoba)
    && victimesInvocation(camp).length >= nombre
    && (duel.modeMana !== RPG_MODE_MANA_ESSAI
      || camp.creatures.length - nombre < RPG_MANA_ESSAI_CHAMP_MAX);
}
