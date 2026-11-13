/** Adapte les pierres à la place réellement disponible dans la face.
 * Les coordonnées sont locales (offsets), donc indépendantes d'une rotation
 * de la carte, d'un zoom ou de son animation. Les tailles normales ne changent
 * pas si elles tiennent déjà et restent proportionnées à la carte. */
export function ajustementIconesCarte({ largeur, hauteur, haut, taille, nombre, espace }) {
  if (!(largeur > 0 && hauteur > 0 && taille > 0 && nombre > 0)) return null;
  const marge = 2;
  const hautMax = Math.max(0, hauteur - marge - nombre);
  const hautAjuste = Math.min(Math.max(0, haut), hautMax);
  const disponible = Math.max(1, hauteur - marge - hautAjuste);
  const espaceAjuste = nombre > 1 ? Math.min(Math.max(0, espace), Math.max(0, (disponible - nombre) / (nombre - 1))) : 0;
  const tailleAjustee = Math.max(0, Math.min(taille, largeur - marge, largeur * .26, (disponible - espaceAjuste * (nombre - 1)) / nombre));
  if (tailleAjustee >= taille && hautAjuste === haut && (nombre <= 1 || espaceAjuste === espace)) return null;
  return { taille: Math.floor(tailleAjustee * 100) / 100, haut: hautAjuste, espace: espaceAjuste };
}
