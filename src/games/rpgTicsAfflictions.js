/** Les identifiants sont copiés : le duel local est souvent muté en place,
 * tandis que la vue PvP arrive sous forme de nouveaux objets. */
export function instantaneTicsAfflictions(duel) {
  const presents = new Set();
  for (const cote of ['joueur', 'sorcier']) {
    for (const entite of duel?.[cote]?.creatures ?? []) presents.add(`${cote}:${entite.id}`);
  }
  return { ids: new Set((duel?.combatAnimations ?? []).map((event) => event.id)), presents };
}

/** Uniquement les vrais dégâts différés du moteur, sur les porteurs toujours
 * visibles. Une fin de poison ou une simple variation de PV ne suffit pas. */
export function nouveauxTicsAfflictions(duel, avant, apres = instantaneTicsAfflictions(duel)) {
  return (duel?.combatAnimations ?? []).filter((event) => event.type === 'affliction-tic'
    && ['poison', 'brulure'].includes(event.affliction) && event.montant > 0
    && !avant.ids.has(event.id) && apres.presents.has(`${event.cote}:${event.entiteId}`));
}

/** La tête d'une pile repliée montre aussi les tics des autres exemplaires. */
export function ticsPourPile(effets, cles) {
  const resultat = {};
  for (const cle of cles) for (const type of ['poison', 'brulure']) {
    const token = effets[cle]?.[type];
    if (token && (!resultat[type] || token > resultat[type])) resultat[type] = token;
  }
  return resultat;
}
