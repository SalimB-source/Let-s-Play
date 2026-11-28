/** Relevé indépendant des objets du moteur, souvent mutés sur place. */
export function releverEnvol(duel) {
  const vue = new Map();
  for (const cote of ['joueur', 'sorcier']) {
    for (const entite of duel?.[cote]?.creatures ?? []) {
      vue.set(`${cote}:${entite.id}`, Boolean(entite.envol));
    }
  }
  return vue;
}

/** Ni une arrivée volante, ni la sortie du porteur ne sont un changement
 * d'Envol : les deux relevés doivent contenir le même exemplaire. */
export function transitionsEnvol(avant, apres) {
  const transitions = [];
  for (const [cle, envol] of apres) {
    if (avant.has(cle) && avant.get(cle) !== envol) {
      transitions.push({ cle, type: envol ? 'envol' : 'atterrissage' });
    }
  }
  return transitions;
}
