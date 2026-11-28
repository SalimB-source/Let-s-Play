/** Les marques suivent les états du moteur, pas le journal des dégâts : elles
 * disparaissent avec l'affliction et peuvent coexister sur une même carte. */
export function rpgAfflictionsVisuelles(entite) {
  if (!entite) return [];
  return [
    entite.poison?.toursRestants > 0 && 'poison',
    entite.brulure && 'brulure',
    entite.empecheAttaqueToursRestants > 0 && 'entrave-attaque',
    entite.empecheBlocageToursRestants > 0 && 'entrave-blocage',
  ].filter(Boolean);
}
