/** Navigation circulaire : l'offre peut disparaître pendant une session. */
export function diapoSuivante(index, direction, nombre) {
  if (nombre <= 0) return 0;
  return ((index % nombre + direction) % nombre + nombre) % nombre;
}
