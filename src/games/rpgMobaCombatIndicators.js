import { mobaVoieCombat } from './rpgMoba.js';
import { rpgMobaCiblesAttaque } from './rpgMobaLocal.js';

/**
 * Combat indications are presentation only: they never assign targets or
 * decide the outcome. Each direct attack points to the defender's HP in the
 * attacker's own active lane, not to a shared wizard portrait.
 */
export function rpgMobaCombatIndicators(duel, side, attackerIds, targets = {}, blocks = {}) {
  const attackArrows = {};
  const blockArrows = {};
  const descriptions = [];
  if (!duel?.moba || !['joueur', 'sorcier'].includes(side) || duel.moba.winner || duel.fin?.gagnant || duel.fin?.nul) {
    return { attackArrows, blockArrows, descriptions };
  }
  const defense = side === 'joueur' ? 'sorcier' : 'joueur';
  const laneNames = { left: 'voie gauche', center: 'voie centrale', right: 'voie droite' };
  const defenders = duel[defense]?.creatures ?? [];
  for (const id of attackerIds ?? []) {
    const attacker = duel[side]?.creatures.find((entity) => entity.id === id);
    const origin = duel.moba.lanes.find((item) => item.slots[side].includes(id));
    const lane = duel.moba.lanes.find((item) => item.id === mobaVoieCombat(duel.moba, side, origin?.id) && item.active);
    if (!attacker || !lane) continue;
    const targetId = targets[id];
    const blockerIds = (blocks[id] ?? []).filter((blockerId) => duel.moba.lanes.some((originLane) => originLane.slots[defense].includes(blockerId) && mobaVoieCombat(duel.moba, defense, originLane.id) === lane.id) && defenders.some((entity) => entity.id === blockerId));
    if (!targetId && blockerIds.length) {
      blockArrows[id] = blockerIds;
      for (const blockerId of blockerIds) {
        const blocker = defenders.find((entity) => entity.id === blockerId);
        descriptions.push(`${blocker.name} bloque ${attacker.name}, ${laneNames[lane.id]}`);
      }
      continue;
    }
    if (targetId) {
      const target = defenders.find((entity) => entity.id === targetId && duel.moba.lanes.some((targetLane) => (lane.id === 'center' && origin?.id === 'center' && targetLane.active || mobaVoieCombat(duel.moba, defense, targetLane.id) === lane.id) && targetLane.slots[defense].includes(entity.id)));
      // A lost target never becomes a direct attack.
      if (!target) continue;
      (attackArrows[target.id] ??= []).push(id);
      descriptions.push(`${attacker.name} vise ${target.name}, ${laneNames[lane.id]}`);
      continue;
    }
    // Until an obligatory targeted attack is chosen, it has no destination.
    if (rpgMobaCiblesAttaque(duel, side, id).obligatoires) continue;
    const target = `@moba:${lane.id}:${defense}`;
    (attackArrows[target] ??= []).push(id);
    descriptions.push(`${attacker.name} attaque les PV de ${laneNames[lane.id]} de ${defense === 'joueur' ? 'votre camp' : 'l’IA'}`);
  }
  return { attackArrows, blockArrows, descriptions };
}

/** Optional target resolver for the classic arrow renderer. Entity ids keep
 * the original lookup; only the six public lane-HP markers use this hook. */
export function rpgMobaArrowTarget(table, id) {
  if (!id.startsWith('@moba:')) return null;
  return [...table.querySelectorAll('[data-moba-lane-hp]')].find((element) => element.dataset.mobaLaneHp === id) ?? null;
}
