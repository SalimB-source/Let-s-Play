/** Les annonces sont tirées uniquement des événements réellement résolus. */
export function rpgTempsForts({ combatFeed = [], critiques = {}, voies = [] } = {}) {
  const morts = (Array.isArray(combatFeed) ? combatFeed : []).filter((event) => event?.type === 'death' && event.victim?.name)
    .map((event) => ({ id: `mort:${event.id}`, type: 'mort', texte: `${event.victim.name} détruite` }));
  const coups = Object.entries(critiques ?? {}).map(([id, effet]) => ({ id: `critique:${id}:${effet.token}`, type: 'critique', texte: `${effet.position?.name ?? effet.name ?? 'Créature'} : coup critique ×${effet.fois ?? 2}` }));
  const conquetes = (Array.isArray(voies) ? voies : []).filter((voie) => ['joueur', 'sorcier'].includes(voie.conqueredBy) && !voie.active)
    .map((voie) => ({ id: `conquete:${voie.id}:${voie.conqueredBy}`, type: 'conquete', texte: `${{ left: 'Voie gauche', center: 'Voie centrale', right: 'Voie droite' }[voie.id] ?? 'Voie'} conquise par ${voie.conqueredBy === 'joueur' ? 'vous' : 'l’adversaire'}` }));
  return [...morts, ...coups, ...conquetes];
}

/** Segment entre bords de deux rectangles, dans le repère local de la table. */
export function rpgSegmentCible(table, source, cible) {
  if (![table, source, cible].every((r) => r && r.width > 0 && r.height > 0)) return null;
  const a = { x: source.left + source.width / 2, y: source.top + source.height / 2 };
  const b = { x: cible.left + cible.width / 2, y: cible.top + cible.height / 2 };
  const dx = b.x - a.x, dy = b.y - a.y;
  if (Math.hypot(dx, dy) < 1) return null;
  const bord = (r) => 1 / Math.max(Math.abs(dx) / (r.width / 2), Math.abs(dy) / (r.height / 2));
  const debut = bord(source), fin = bord(cible);
  if (debut + fin >= 1) return null;
  return { x1: a.x + dx * debut - table.left, y1: a.y + dy * debut - table.top,
    x2: b.x - dx * fin - table.left, y2: b.y - dy * fin - table.top };
}
