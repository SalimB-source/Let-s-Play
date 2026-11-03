/** Les Défenseurs attirent les Attaques ciblées, même engagés ou gelés.
 * L'ancienne propriété des Tours reste reconnue dans les parties sauvegardées.
 * On filtre d'abord les cibles autrement légales : un Défenseur impossible à
 * viser ne doit pas rendre les autres cibles impossibles.
 */
export function ciblesDefenseur(cibles = []) {
  const defenseurs = cibles.filter((cible) => cible.defenseur || cible.prioriteAttaqueRapide);
  return defenseurs.length ? defenseurs : cibles;
}
