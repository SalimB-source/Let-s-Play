/**
 * Compare une statistique courante à la valeur imprimée sur la carte.
 *
 * Les bonus de terrain, d'aura, d'arme ou de sort sont déjà fondus dans
 * l'entité du duel. La carte reste donc la référence stable qui permet de
 * distinguer un renforcement d'un affaiblissement, même après plusieurs
 * effets cumulés.
 */
export function classeVariationStatCreature(valeurCourante, valeurImprimee) {
  if (valeurCourante == null || valeurImprimee == null) return '';
  const courante = Number(valeurCourante);
  const imprimee = Number(valeurImprimee);
  if (!Number.isFinite(courante) || !Number.isFinite(imprimee)) return '';
  if (courante > imprimee) return 'is-buffed';
  if (courante < imprimee) return 'is-debuffed';
  return '';
}

/** Libellé lu par les aides techniques en complément de la couleur. */
export function libelleVariationStatCreature(classeVariation) {
  if (classeVariation === 'is-buffed') return 'augmentée';
  if (classeVariation === 'is-debuffed') return 'diminuée';
  return '';
}
