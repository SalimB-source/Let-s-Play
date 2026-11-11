/** Repère les conquêtes réalisées par une résolution, sans déduire une
 * victoire de l'annonce d'une attaque ou d'une baisse de PV. Les voies déjà
 * conquises ne rejouent pas l'effet lors des actions suivantes. */
export function rpgMobaNouvellesConquetes(avant, moba) {
  if (!avant?.voies || !Array.isArray(moba?.lanes)) return [];
  const precedentes = new Map(avant.voies.map((voie) => [voie.id, voie]));
  return moba.lanes.flatMap((voie) => {
    const precedente = precedentes.get(voie.id);
    if (!precedente?.active || voie.active || !['joueur', 'sorcier'].includes(voie.conqueredBy)) return [];
    return [{ laneId: voie.id, side: voie.conqueredBy }];
  });
}
