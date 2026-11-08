/** Géométrie figée avant résolution : les cibles mortes restent joignables. */
export function projectilesCombat(animations, instantane, positionsSources = []) {
  return animations.filter((a) => a.type === 'projectile-combat').flatMap((a) => {
    const source = instantane.find((e) => e.entityId === a.source?.entiteId)
      ?? positionsSources.find((e) => e.entityId === a.source?.entiteId);
    const cible = a.cible?.type === 'sorcier'
      ? instantane.avatarRects?.[a.cible.cote]
      : instantane.find((e) => e.entityId === a.cible?.entiteId);
    if (!source || !cible) return [];
    const x = source.left + source.width / 2;
    const y = source.top + source.height / 2;
    const dx = cible.left + cible.width / 2 - x;
    const dy = cible.top + cible.height / 2 - y;
    return [{ id: a.id, variante: a.variante, x, y, dx, dy,
      angle: Math.atan2(dy, dx) * 180 / Math.PI }];
  });
}
