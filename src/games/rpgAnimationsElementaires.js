/** Réunit le journal local et les signaux PvP de la même résolution. Les
 * événements sont bornés à l'instantané précédent : un ancien impact ne se
 * rallume pas au prochain geste, et la copie locale ne joue pas deux fois. */
export function blessuresVisuelles(locales, animations, idsAvant = new Set()) {
  const resultat = [...locales];
  for (const animation of animations ?? []) {
    if (animation.type !== 'blessure-elementaire' || idsAvant.has(animation.id)) continue;
    const { id, type, ...blessure } = animation;
    const dejaPresente = locales.some((locale) => locale.entityId === blessure.entityId
      && locale.cote === blessure.cote && locale.sourceCarteId === blessure.sourceCarteId
      && locale.pvApres === blessure.pvApres && locale.recus === blessure.recus
      && locale.mortelle === blessure.mortelle
      && JSON.stringify(locale.elements) === JSON.stringify(blessure.elements));
    if (!dejaPresente) resultat.push(blessure);
  }
  return resultat;
}
