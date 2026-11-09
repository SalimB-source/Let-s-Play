/** Durées nominales ; CSS et minuteurs utilisent le même facteur de vitesse. */
export const SACRIFICE_ANIMATION = Object.freeze({
  cercle: 1400,
  dechirement: 820,
  retardDechirement: 400,
  pause: 180,
  secours: 200,
  reduit: 80,
});

/** Retrouve les victimes d'une invocation MOBA dans l'instantané pris avant
 * la résolution : le moteur a déjà retiré leurs cartes de leurs cases. */
export function victimesSacrificeSurVoies(avant, ids = []) {
  const victimes = new Set(ids);
  return (avant?.cartes ?? []).filter((entite) => victimes.has(entite.entityId));
}

/** Un sacrifice déjà joué ne doit devenir ni un renvoi, ni un exil, ni un
 * deuxième fantôme de mort. Les autres sorties de la même action restent. */
export function instantaneSansSacrificesAnimes(avant, ids = []) {
  const exclus = new Set(ids);
  if (!avant || !exclus.size) return avant;
  const resultat = avant.filter(entite => !exclus.has(entite.entityId));
  // Ces métadonnées empêchent de rejouer d’anciens projectiles et gardent
  // les coordonnées des avatars pour les effets réels de la même action.
  for (const cle of ['combatAnimationIds', 'avatarRects']) {
    if (cle in avant) resultat[cle] = avant[cle];
  }
  return resultat;
}
