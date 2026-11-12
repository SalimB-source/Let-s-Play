/* Mesure la colonne d'effets de la carte MOBA posée. Ne réduire que si au
 * moins quatre pierres sont réellement visibles ET que la dernière sortirait
 * par le bas. L'aperçu et la main ne passent jamais par cette mesure. */
export function tailleBadgesMoba(colonne, carte) {
  const badges = [...colonne.children].filter((badge) => badge.getBoundingClientRect().height > 0);
  if (badges.length <= 3) return null;
  const cadre = carte.getBoundingClientRect();
  const debut = colonne.getBoundingClientRect().top;
  if (!cadre.height || badges.at(-1).getBoundingClientRect().bottom <= cadre.bottom - 2) return null;
  const disponible = Math.max(0, cadre.bottom - debut - 2);
  const tailleActuelle = badges[0].getBoundingClientRect().height;
  // Deux colonnes si une seule forcerait des glyphes illisibles. Les badges
  // restent tous dans la face ; aucun effet n'est caché aux petites largeurs.
  const colonnes = disponible < badges.length * 10 ? 2 : 1;
  const lignes = Math.ceil(badges.length / colonnes);
  return {
    colonnes, lignes,
    taille: Math.max(1, Math.min(tailleActuelle - 1, Math.floor(disponible / lignes),
      Math.floor((cadre.width - 4) / colonnes))),
  };
}
