import { rpgCarteEmbuscade } from './rpgEmbuscade.js';
import { cardById } from './rpgCards.js';
import { RPG_MODE_MANA_ESSAI, RPG_MANA_ESSAI_CHAMP_MAX } from './rpgManaEssai.js';

/** Les invocations depuis la main utilisent le coût imprimé pour les sacrifices.
 * Une Embuscade en réponse est spéciale, sans sacrifice ni quota. */
export function sacrificesInvocation(carte, duel = null, cote = null, specialeMoba = false) {
  if (embuscade(duel, cote, carte, specialeMoba)) return 0;
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
/** Les cartes jouées pendant leur propre tour sont des invocations normales.
 * Les marqueurs MOBA historiques sont conservés pour les parties sérialisées. */
function embuscade(duel, cote, carte, specialeMoba = false) {
  return Boolean(duel && cote && (specialeMoba || (cote !== duel.tour && (rpgCarteEmbuscade(carte) || carte?.reactionTourAdverse))));
}
export function limiteInvocationMoba(duel, cote, carte, specialeMoba = false) {
  if (!duel || !['creature', 'hero'].includes(carte?.kind ?? cardById(carte?.id)?.kind)) return null;
  if (embuscade(duel, cote, carte, specialeMoba)) return null;
  return (duel.moba ? duel.moba.creaturesJouees?.[cote] : duel[cote]?.invocationNormaleJouee) ? 'creature-limite' : null;
}
export function marquerInvocationMoba(duel, cote, carte, specialeMoba = false) {
  if (!duel || !['creature', 'hero'].includes(carte?.kind ?? cardById(carte?.id)?.kind)) return;
  if (duel.moba) {
    const quota = embuscade(duel, cote, carte, specialeMoba) ? 'embuscadesJouees' : 'creaturesJouees';
    (duel.moba[quota] ??= {})[cote] = true;
  } else if (!embuscade(duel, cote, carte, specialeMoba)) duel[cote].invocationNormaleJouee = true;
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
