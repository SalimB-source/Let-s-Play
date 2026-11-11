/** Retrouve uniquement les sorties effectivement journalisées pendant cette
 * résolution, à leur emplacement physique d'avant mutation. Les exils dus à
 * la fermeture d'une voie ont déjà leur propre animation de conquête. */
export function rpgMobaSorties(avant, renvois, exils, duel) {
  const cartes = new Map((avant?.cartes ?? []).map((carte) => [`${carte.side}:${carte.entityId}`, carte]));
  const evenements = [
    ...(renvois ?? []).slice(avant?.renvois ?? 0).map((event) => ({ ...event, variante: 'eau' })),
    ...(exils ?? []).slice(avant?.exils ?? 0).filter((event) => !event.conqueteMoba).map((event) => ({ ...event, variante: 'exil' })),
  ];
  return evenements.flatMap((event) => {
    const carte = cartes.get(`${event.cote}:${event.entityId}`);
    if (!carte || duel[event.cote]?.creatures.some((entity) => entity.id === event.entityId)) return [];
    return [{ ...carte, variante: event.variante }];
  });
}

/** Une carte tout juste revenue dans sa case remplace visuellement son propre
 * départ : ne pas réannoncer l'exil pendant l'animation de retour. */
export function rpgMobaSortieRemplacee(sortie, retours) {
  return sortie.variante === 'exil' && Object.values(retours ?? {}).some((retour) =>
    retour.side === sortie.side && retour.laneId === sortie.laneId
    && retour.slot === sortie.slot && retour.cardId === sortie.cardId);
}
