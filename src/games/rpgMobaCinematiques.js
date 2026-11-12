/** Présentation issue des événements résolus, sans lire ni modifier les règles.
 * Toutes les cases sont mesurées avant l'action : même une carte détruite
 * pendant celle-ci conserve son point d'impact. */
function caseEntite(id, avant, duel) {
  const carte = avant.cartes.find((item) => item.entityId === id);
  if (carte) return avant.positions?.cases[`${carte.laneId}:${carte.side}:${carte.slot}`];
  for (const voie of duel.moba.lanes) for (const cote of ['joueur', 'sorcier']) {
    const slot = voie.slots[cote].indexOf(id);
    if (slot >= 0) return avant.positions?.cases[`${voie.id}:${cote}:${slot}`];
  }
  return null;
}
const centre = (rect) => rect && ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

/** Les tirs de capacité du moteur et les tirs ciblés (y compris manqués).
 * Une Sphère ou une cible devenue illégale annule le tir, sans projectile. */
export function rpgMobaProjectiles(avant, duel, combat = null, resultat = null) {
  const animations = (duel.combatAnimations ?? []).filter((e) => e.id > avant.animationSeq && e.type === 'projectile-combat' && e.variante !== 'ciblee');
  const tirs = animations.map((e) => ({ id: `animation-${e.id}`, variante: e.variante,
    source: e.source?.entiteId, cible: e.cible?.entiteId }));
  if (combat?.cibleIndividuelle?.ciblee && resultat?.ok && !resultat.annule) {
    const shot = resultat.resume?.coupsRapides?.find((e) => !e.annule);
    if (shot && (shot.rate || shot.degats > 0)) tirs.push({ id: 'attaque-ciblee', variante: 'ciblee', source: shot.attaquantId, cible: shot.cibleId, rate: Boolean(shot.rate) });
  }
  return tirs.flatMap((tir) => {
    const source = centre(caseEntite(tir.source, avant, duel));
    const cible = centre(caseEntite(tir.cible, avant, duel));
    if (!source || !cible) return [];
    const facteur = tir.rate ? .8 : 1;
    const dx = (cible.x - source.x) * facteur, dy = (cible.y - source.y) * facteur;
    return [{ ...tir, x: source.x, y: source.y, dx, dy, angle: Math.atan2(dy, dx) * 180 / Math.PI }];
  });
}

/** Signatures du duel : feu et sable sur blessures réelles, foudre du
 * marteau sur blessure et tempête sur les cibles du signal explicite. */
export function rpgMobaSignatures(avant, duel, blessures) {
  const effets = new Map();
  const ajouter = (type, id, extras = {}) => {
    const rect = caseEntite(id, avant, duel);
    if (rect) effets.set(`${type}:${id}`, { type, entityId: id, ...rect, ...extras });
  };
  for (const blessure of blessures) {
    if (!(blessure.recus > 0)) continue;
    if (blessure.elements.includes('braise')) ajouter('feu', blessure.entityId);
    if (blessure.elements.includes('sable')) ajouter('sable', blessure.entityId);
    if (['eclair-du-marteau', 'maitre-du-marteau'].includes(blessure.sourceCarteId)) ajouter('foudre', blessure.entityId);
  }
  for (const animation of duel.combatAnimations ?? []) {
    if (animation.id <= avant.animationSeq || animation.type !== 'tempete-foudre') continue;
    for (const id of animation.cibles ?? []) ajouter('foudre', id);
  }
  return [...effets.values()];
}

/** Choc d'un échange au corps à corps, et non un blocage inexistant en MOBA. */
export function rpgMobaChocEchange(avant, duel, combat, resultat) {
  if (!combat?.cibleIndividuelle?.cibleId || combat.cibleIndividuelle.ciblee || !resultat?.ok || resultat.annule || !resultat.resume?.blessures?.some((b) => b.montant > 0)) return null;
  const a = centre(caseEntite(combat.attaquants[0], avant, duel));
  const b = centre(caseEntite(combat.cibleIndividuelle.cibleId, avant, duel));
  return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null;
}
