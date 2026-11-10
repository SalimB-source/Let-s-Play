/** History of screens *inside* the Sablier. Never let Android's Back leave
 * the game route or return to a stale screen after reaching the main menu. */
export function avancerEcranJeu(historique, depart, arrivee) {
  if (arrivee === depart) return historique;
  if (arrivee === 'jouer') return [];
  return [...historique, depart].slice(-32);
}

export function reculerEcranJeu(historique, ecran) {
  if (ecran === 'jouer') return { ecran, historique };
  const reste = historique.slice();
  const precedent = reste.pop() ?? 'jouer';
  return { ecran: precedent, historique: precedent === 'jouer' ? [] : reste };
}
