/** Résumé factuel de l'état final et des dernières lignes du journal moteur. */
export function rpgBilanDuel(duel, limite = 6) {
  const camp = (etat) => ({
    pv: etat?.pv != null && Number.isFinite(Number(etat.pv)) ? Number(etat.pv) : null,
    creatures: Array.isArray(etat?.creatures) ? etat.creatures.length : 0,
  });
  const nombre = Math.max(0, Math.min(20, Math.floor(Number(limite) || 0)));
  const lignes = Array.isArray(duel?.log) ? duel.log.filter((ligne) => typeof ligne === 'string' && ligne.trim()) : [];
  return { joueur: camp(duel?.joueur), sorcier: camp(duel?.sorcier),
    evenements: nombre ? lignes.slice(-nombre) : [] };
}
