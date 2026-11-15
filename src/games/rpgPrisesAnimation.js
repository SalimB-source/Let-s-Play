/** Relevé avant une action : les journaux locaux appartiennent à l'objet duel,
 * tandis que le flux de combat survit à la sérialisation des parties PvP. */
export function instantanePrisesAnimation(duel, historique = []) {
  return {
    duel,
    nombrePrises: historique.length,
    idsFeed: new Set((duel?.combatFeed ?? []).map((evenement) => evenement.id).filter(Boolean)),
  };
}

/** Seules les prises survenues depuis ce relevé animent une chaîne. Une même
 * présence peut être libérée puis mourir ou être reprise : son identifiant ne
 * suffit donc pas à identifier une prise actuelle. */
export function prisesPourAnimation(duel, avant, historique = []) {
  const prises = new Map();
  if (!avant) return prises;
  if (avant.duel === duel) {
    for (const evenement of historique.slice(avant.nombrePrises)) {
      if (evenement.entityId && evenement.capteurId) prises.set(evenement.entityId, evenement.capteurId);
    }
  }
  // En PvP l'état est un nouvel objet et le journal local n'est pas sérialisé.
  // Le flux est borné, d'où la comparaison par identifiant plutôt que par index.
  for (const evenement of duel?.combatFeed ?? []) {
    if (!evenement.id || avant.idsFeed.has(evenement.id)) continue;
    const victime = evenement.victim?.id;
    if (evenement.type === 'prise' && victime && evenement.killers?.[0]?.id) {
      prises.set(victime, evenement.killers[0].id);
    } else if (evenement.type === 'death' && victime) {
      // Si la même présence a été prise puis tuée pendant une seule action,
      // le dernier événement décrit sa sortie réelle.
      prises.delete(victime);
    }
  }
  return prises;
}
