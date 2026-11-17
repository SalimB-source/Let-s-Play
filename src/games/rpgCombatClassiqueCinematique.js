/** Positions figées avant la résolution, dans le repère local de la table.
 * Une carte détruite ou empilée garde ainsi son point d'impact. */
export function positionsCombatClassique(table, cartes) {
  if (!table) return null;
  const rect = table.getBoundingClientRect();
  const width = table.clientWidth || rect.width, height = table.clientHeight || rect.height;
  if (!width || !height || !rect.width || !rect.height) return null;
  const point = (element) => {
    if (!element) return null;
    const r = element.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { x: (r.left + r.width / 2 - rect.left) * width / rect.width,
      y: (r.top + r.height / 2 - rect.top) * height / rect.height };
  };
  const elements = new Map([...table.querySelectorAll('[data-entity-id]')].map((el) => [el.dataset.entityId, el]));
  const faces = [...table.querySelectorAll('.card-row [data-card-id]')];
  const entities = Object.fromEntries(cartes.filter((carte) => !carte.isTerrain).map((carte) => [carte.entityId,
    point(elements.get(carte.entityId) ?? faces.find((el) => el.dataset.cardId === carte.cardId))]));
  const avatars = Object.fromEntries(['joueur', 'sorcier'].map((cote) => [cote,
    point(table.querySelector(`.rpg-wizard-plate--${cote === 'joueur' ? 'joueur' : 'ennemi'} .rpg-wizard-plate__avatar`))]));
  return { width, height, entities, avatars };
}

/** Les chiffres suivent le bilan du moteur, pas l'attaque annoncée : une
 * esquive, une protection ou une attaque annulée ne crée pas de faux dégâts. */
export function cinematiqueCombatClassique(combat, cote, resultat, positions, noms = {}) {
  if (!combat?.cibleIndividuelle || !resultat?.ok || resultat.annule) return null;
  const sourceId = combat.attaquants?.[0];
  const { cibleId, ciblee } = combat.cibleIndividuelle;
  const defenseur = cote === 'joueur' ? 'sorcier' : 'joueur';
  const source = positions?.entities?.[sourceId];
  const destination = cibleId ? positions?.entities?.[cibleId] : positions?.avatars?.[defenseur];
  const critiques = resultat.resume?.critiques ?? [];
  const impacts = (resultat.resume?.blessures ?? []).filter((b) => b.montant > 0).map((b) => ({
    id: b.entiteId, montant: b.montant, point: positions?.entities?.[b.entiteId],
    critique: critiques.some((c) => c.entiteId === b.sourceId),
  }));
  const direct = resultat.resume?.frappeSorcier ?? 0;
  if (direct > 0) impacts.push({ id: `avatar:${defenseur}`, montant: direct,
    point: positions?.avatars?.[defenseur], critique: critiques.some((c) => c.entiteId === sourceId) });
  const annonce = impacts.map(({ id, montant }) => `${noms[id] ?? (id.startsWith('avatar:') ? 'Sorcier' : 'Créature')} : ${montant} dégâts`).join(' ; ');
  const tirCible = Boolean(ciblee && cibleId);
  const choc = !tirCible && cibleId && source && destination && (resultat.resume?.blessures ?? []).some((b) => b.montant > 0)
    ? { x: (source.x + destination.x) / 2, y: (source.y + destination.y) / 2 } : null;
  const rate = tirCible && resultat.resume?.coupsRapides?.some((coup) => coup.attaquantId === sourceId && coup.rate && !coup.annule);
  const dx = source && destination ? (destination.x - source.x) * .8 : 0;
  const dy = source && destination ? (destination.y - source.y) * .8 : 0;
  const projectileRate = rate && source && destination ? { variante: 'ciblee', x: source.x, y: source.y, dx, dy,
    angle: Math.atan2(dy, dx) * 180 / Math.PI } : null;
  return { positions, source, destination, tirCible, impacts, annonce, choc, projectileRate };
}
