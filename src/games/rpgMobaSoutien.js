/** Les soins de créature viennent du journal moteur, pas d'une variation de
 * statistiques : un renfort de PV n'est pas nécessairement un soin. */
export function rpgMobaSoinsCreatures(events, duel) {
  const soins = {};
  for (const event of events ?? []) {
    if (!event.entityId || !['joueur', 'sorcier'].includes(event.cote) || !(event.montant > 0)) continue;
    if (!duel[event.cote]?.creatures.some((entity) => entity.id === event.entityId)) continue;
    soins[event.entityId] = (soins[event.entityId] ?? 0) + event.montant;
  }
  return soins;
}

/** Compare les boucliers uniquement pour les créatures déjà présentes :
 * l'entrée d'une carte avec bouclier imprimé reste une invocation. */
export function rpgMobaBoucliersAjoutes(avant, duel) {
  return (avant?.cartes ?? []).flatMap((carte) => {
    const entity = duel[carte.side]?.creatures.find((item) => item.id === carte.entityId);
    if (!entity) return [];
    const gagne = (!(carte.bouclier > 0) && entity.bouclier > 0)
      || (!carte.bouclierLumiere && entity.bouclierLumiere);
    return gagne ? [entity.id] : [];
  });
}

/** Additionne les seuls PV réellement rendus à chaque jauge de voie. */
export function rpgMobaSoinsVoies(events) {
  const soins = {};
  for (const event of events ?? []) {
    if (!['joueur', 'sorcier'].includes(event.side) || !['left', 'center', 'right'].includes(event.laneId) || !(event.healing > 0)) continue;
    const key = `${event.laneId}:${event.side}`;
    soins[key] = (soins[key] ?? 0) + event.healing;
  }
  return soins;
}
