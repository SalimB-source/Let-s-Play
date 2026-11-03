/** Fin de l'offre au 30 décembre 2026 inclus, heure d'Alger (UTC+1). */
export const FIN_OFFRE_LANCEMENT = Date.parse('2026-12-30T23:00:00Z');
export const OFFRE_LANCEMENT = Object.freeze({ boosters: 10, prix: '5 €', prixInitial: '10 €', fin: '30 décembre 2026' });

/** L'offre cesse à minuit le 31 décembre, même si la page reste ouverte. */
export function offreLancementActive(maintenant = Date.now()) {
  return Number.isFinite(maintenant) && maintenant < FIN_OFFRE_LANCEMENT;
}
