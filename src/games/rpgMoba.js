/**
 * MOBA lane bookkeeping. This module is deliberately independent of the duel
 * engine: it does not pay for cards, resolve combat or interpret card text.
 * Callers must validate those rules in the engine before applying lane events.
 * See docs/sablier-moba.md for the integration work still required.
 */
export const MOBA_LANE_HP = 10;
export const MOBA_SIDE_LANE_HP = 20;
export const mobaVieMax = (laneId) => laneId === 'center' ? MOBA_LANE_HP : MOBA_SIDE_LANE_HP;
export const MOBA_LANES = Object.freeze(['left', 'center', 'right']);
export const MOBA_SIDES = Object.freeze(['joueur', 'sorcier']);
const CAPACITY = Object.freeze({ left: 2, center: 1, right: 2 });
const other = (side) => side === 'joueur' ? 'sorcier' : 'joueur';
const validSide = (side) => MOBA_SIDES.includes(side);
const validId = (id) => typeof id === 'string' && id.length > 0;
const validAmount = (amount) => typeof amount === 'number' && Number.isFinite(amount) && amount >= 0;
const fail = (raison) => ({ ok: false, raison });

/** JSON-serializable lane state; entity IDs refer to the existing duel entities. */
export function mobaNouveau() {
  return {
    lanes: MOBA_LANES.map((id) => ({
      id,
      hp: { joueur: mobaVieMax(id), sorcier: mobaVieMax(id) },
      slots: {
        joueur: Array(CAPACITY[id]).fill(null),
        sorcier: Array(CAPACITY[id]).fill(null),
      },
      active: true,
      conqueredBy: null,
    })),
    // A creature's identity remains bound to its first lane, even off-board.
    assignments: [],
    winner: null,
  };
}

export function mobaVoie(state, laneId) {
  return state?.lanes?.find((lane) => lane.id === laneId) ?? null;
}

export function mobaEmplacementsLibres(state, side, laneId) {
  const lane = mobaVoie(state, laneId);
  if (!validSide(side) || !lane?.active || state.winner) return [];
  return lane.slots[side].flatMap((id, index) => id === null ? [index] : []);
}

/** Place an engine entity in an explicit empty slot; never silently relocate it. */
export function mobaPlacer(state, side, laneId, slot, entityId) {
  if (!state || state.winner) return fail('partie-terminee');
  if (!validSide(side) || !validId(entityId)) return fail('entite');
  const lane = mobaVoie(state, laneId);
  if (!lane?.active) return fail('voie-inactive');
  if (!Number.isInteger(slot) || slot < 0 || slot >= lane.slots[side].length || lane.slots[side][slot] !== null) return fail('emplacement');
  const prior = state.assignments.find((entry) => entry.entityId === entityId);
  if (prior && (prior.side !== side || prior.laneId !== laneId)) return fail('affectation-permanente');
  if (state.lanes.some((l) => MOBA_SIDES.some((s) => l.slots[s].includes(entityId)))) return fail('entite-deja-placee');
  lane.slots[side][slot] = entityId;
  if (!prior) state.assignments.push({ entityId, side, laneId });
  return { ok: true };
}

/** A normal leave-play event does not erase the entity's lane assignment. */
export function mobaRetirer(state, side, entityId) {
  if (!state || state.winner) return fail('partie-terminee');
  if (!validSide(side) || !validId(entityId)) return fail('entite');
  for (const lane of state.lanes) {
    const index = lane.slots[side].indexOf(entityId);
    if (index !== -1) {
      lane.slots[side][index] = null;
      return { ok: true, laneId: lane.id, slot: index };
    }
  }
  return fail('entite-absente');
}

/** Validate lane isolation only. The duel engine must also validate readiness,
 * flying, forced blocks, protection, turn timing and every other combat rule. */
export function mobaValiderBlocages(state, attackingSide, attackerIds, blocks = {}) {
  if (!state || state.winner) return fail('partie-terminee');
  if (!validSide(attackingSide) || !Array.isArray(attackerIds) || !attackerIds.length
    || attackerIds.some((id) => !validId(id)) || new Set(attackerIds).size !== attackerIds.length
    || !blocks || typeof blocks !== 'object' || Array.isArray(blocks)) return fail('combat');
  const defender = other(attackingSide);
  const locations = new Map();
  for (const lane of state.lanes) {
    for (const id of lane.slots[attackingSide]) if (id !== null) locations.set(id, lane);
  }
  for (const id of attackerIds) {
    if (!locations.get(id)?.active) return fail('attaquant');
  }
  const used = new Set();
  for (const [attackerId, blockers] of Object.entries(blocks)) {
    if (!locations.has(attackerId) || !attackerIds.includes(attackerId) || !Array.isArray(blockers)) return fail('blocage');
    const lane = locations.get(attackerId);
    for (const blocker of blockers) {
      if (!validId(blocker) || used.has(blocker) || !lane.slots[defender].includes(blocker)) return fail('blocage');
      used.add(blocker);
    }
  }
  return { ok: true };
}

/** Apply an already-resolved effect to one lane. On conquest return both
 * sides' removed IDs so the engine can remove them and their effects as part
 * of the same authoritative transaction. No engine side effects happen here. */
export function mobaInfliger(state, attackingSide, laneId, amount) {
  if (!state || state.winner) return fail('partie-terminee');
  if (!validSide(attackingSide) || !validAmount(amount)) return fail('degats');
  const lane = mobaVoie(state, laneId);
  if (!lane?.active) return fail('voie-inactive');
  const defendingSide = other(attackingSide);
  const before = lane.hp[defendingSide];
  lane.hp[defendingSide] = Math.max(0, before - amount);
  const result = { ok: true, damage: before - lane.hp[defendingSide], conquered: false, removed: null, winner: null };
  if (lane.hp[defendingSide] === 0) {
    result.conquered = true;
    result.removed = Object.fromEntries(MOBA_SIDES.map((side) => [side, lane.slots[side].filter((id) => id !== null)]));
    for (const side of MOBA_SIDES) lane.slots[side].fill(null);
    lane.active = false;
    lane.conqueredBy = attackingSide;
    if (state.lanes.filter((l) => l.conqueredBy === attackingSide).length >= 2) {
      state.winner = attackingSide;
      result.winner = attackingSide;
    }
  }
  return result;
}

/** The classic Prix cannot reduce its payer below 1 HP. In MOBA it is
 * explicitly paid by the chosen friendly active lane, not wizard HP. */
export function mobaPayerPrix(state, side, laneId, amount) {
  if (!state || state.winner) return fail('partie-terminee');
  if (!validSide(side) || !validAmount(amount)) return fail('prix');
  const lane = mobaVoie(state, laneId);
  if (!lane?.active) return fail('voie-inactive');
  if (lane.hp[side] <= amount) return fail('prix');
  lane.hp[side] -= amount;
  return { ok: true, paid: amount };
}

export function mobaSoigner(state, side, laneId, amount) {
  if (!state || state.winner) return fail('partie-terminee');
  if (!validSide(side) || !validAmount(amount)) return fail('soin');
  const lane = mobaVoie(state, laneId);
  if (!lane?.active) return fail('voie-inactive');
  const before = lane.hp[side];
  lane.hp[side] = Math.min(mobaVieMax(laneId), before + amount);
  return { ok: true, healing: lane.hp[side] - before };
}
