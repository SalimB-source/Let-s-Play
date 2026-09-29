// Four playable lanes, centred on the road. Keep rendering and game rules in sync.
export const LANES = Object.freeze([-3.15, -1.05, 1.05, 3.15]);
export const LANE_COUNT = LANES.length;
const LANE_INDICES = LANES.map((_, lane) => lane);

export const CRYSTALS = [
  { name: 'Cyan', color: 0x45e4ff, value: 100 },
  { name: 'Rose', color: 0xff65b8, value: 150 },
  { name: 'Or', color: 0xffd15c, value: 250 },
];
export const jumpHeight = (remaining) => remaining > 0 ? Math.sin((0.82 - remaining) / 0.82 * Math.PI) * 1.7 : 0;

// Shuffle a bag of encounters: no adjacent repeats, always a traversable route.
export function createCourse(random = Math.random) {
  let bag = [];
  let previous;
  return () => {
    if (!bag.length) {
      bag = ['slalom', 'gate', 'jump', 'trail', 'fork'];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag[bag.length - 1] === previous) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    const pattern = bag.pop();
    previous = pattern;
    const lane = Math.floor(random() * LANE_COUNT);
    const gem = (l, raised = false) => {
      const roll = random();
      return { kind: 'crystal', lane: l, raised, tier: raised ? 2 : roll < 0.6 ? 0 : roll < 0.9 ? 1 : 2 };
    };
    let items;
    if (pattern === 'jump') {
      const start = Math.floor(random() * (LANE_COUNT - 1));
      items = [
        { kind: 'barrier', lane: start, lanes: [start, start + 1] },
        ...LANE_INDICES.filter(l => l !== start && l !== start + 1).map(l => ({ kind: 'cactus', lane: l })),
        gem(start, true), gem(start + 1, true),
      ];
    } else if (pattern === 'gate') {
      items = LANE_INDICES.map(l => l === lane ? gem(l) : { kind: 'cactus', lane: l });
    } else if (pattern === 'trail') {
      items = LANE_INDICES.map(l => gem(l));
    } else if (pattern === 'fork') {
      const start = Math.floor(random() * (LANE_COUNT - 1));
      items = [
        { kind: 'barrier', lane: start, lanes: [start, start + 1] },
        ...LANE_INDICES.filter(l => l !== start && l !== start + 1).map(l => gem(l)),
        gem(start, true),
      ];
    } else {
      items = LANE_INDICES.map(l => l === lane ? { kind: 'cactus', lane: l } : gem(l));
    }
    return { pattern, items, gap: 18 + random() * 7 };
  };
}

export const DUEL_DISTANCE = 600;
export const DUEL_SPEED_BONUS = [1.6, 2.8, 4.4]; // cyan, rose, or; m/s
export const DUEL_BASE_SPEED = 15;
export const DUEL_MIN_SPEED = 8;
export const DUEL_MAX_SPEED = 26;

/**
 * A speed bonus is a single burst of SPEED_BOOST_DURATION seconds and nothing more:
 * a new crystal replaces the live boost instead of adding to it, so no rider can
 * bank speed and pull a decisive lead. Boost state is { bonus, left } and is never
 * mutated in place — every helper returns a new object.
 */
export const SPEED_BOOST_DURATION = 1;
export const SPEED_BOOST_NONE = Object.freeze({ bonus: 0, left: 0 });

// ── Power-ups ──────────────────────────────────────────────────────────
// Two launch power-ups for Mirage Rush — extensible for future items.
export const POWER_UPS = {
  LASSO: 'lasso',
  SHIELD: 'shield',
};

// ── Which modes carry the "?" items ────────────────────────────────────
// A special item needs a rival to lasso or a hit to absorb, so only the duel
// (PNJ or shared ghost) and the online rooms keep them. The Ruée is a solo
// time attack scored on 3 lives: its track stays clean, crystals and hazards
// only. Adding a mode here is all it takes to give it the "?" items back.
export const POWER_UP_MODES = Object.freeze(['duel', 'online']);

export function powerUpsEnabled(mode) {
  return POWER_UP_MODES.includes(mode);
}

// Special items all wear the same skin: a floating rainbow "?" that only
// reveals lasso or shield once the rider rides through it.
//
// Rarity is tuned by two knobs:
//  - POWER_UP_SPAWN_GAP_MIN/MAX: how far apart the spawn slots are (metres).
//  - POWER_UP_SPAWN_RATE: how often a slot actually holds an item (0 → never,
//    1 → the raw lasso/shield chances below). Both raised/lowered together,
//    they cut the old spawn cadence by roughly two thirds.
export const POWER_UP_SPAWN_GAP_MIN = 45;
export const POWER_UP_SPAWN_GAP_MAX = 75;
export const POWER_UP_SPAWN_RATE = 0.6;

// Lasso appearance chances by race position (1st → 4th)
export const LASSO_CHANCES = [0, 0.3, 0.4, 0.6];
// Shield appearance chance for all positions
export const SHIELD_CHANCE = 0.3;

export const SHIELD_DURATION = 5; // seconds the shield stays active
export const LASSO_SLOW_DURATION = 2.5; // seconds target is slowed
export const LASSO_SLOW_FACTOR = 0.45; // speed multiplier while slowed
export const LASSO_PROJECTILE_DURATION = 0.45; // seconds rope flies

export function getLassoChance(rank) {
  const idx = Math.max(0, Math.min(3, (rank | 0) - 1));
  return LASSO_CHANCES[idx] ?? 0;
}

/** Odds, 0→1, that one spawn slot holds each item once the rarity knob is applied. */
export function powerUpOdds(rank) {
  const lasso = getLassoChance(rank);
  return {
    lasso: lasso * POWER_UP_SPAWN_RATE,
    shield: (1 - lasso) * SHIELD_CHANCE * POWER_UP_SPAWN_RATE,
  };
}

// Roll a single power-up type for a player at `rank` (1 = leader).
// Returns 'lasso' | 'shield' | null.
// Priority: lasso first, then shield. This matches the spec:
// - POWER_UP_SPAWN_RATE gates every slot, so most of them stay empty
// - lasso has position-dependent chance
// - shield has flat 30% chance
export function rollPowerUpType(rank, random = Math.random) {
  if (random() >= POWER_UP_SPAWN_RATE) return null;
  const lassoChance = getLassoChance(rank);
  if (random() < lassoChance) return POWER_UPS.LASSO;
  if (random() < SHIELD_CHANCE) return POWER_UPS.SHIELD;
  return null;
}

/**
 * Roll one spawn slot for a given mode. The Ruée never yields anything: the
 * mode gate sits here so the world can ask for a type without knowing the rules.
 */
export function rollPowerUpForMode(mode, rank, random = Math.random) {
  return powerUpsEnabled(mode) ? rollPowerUpType(rank, random) : null;
}

// For future extensibility: describe all power-ups in one place
export const POWER_UP_DEFS = {
  [POWER_UPS.LASSO]: {
    id: POWER_UPS.LASSO,
    label: 'Lasso',
    description: 'Lancé automatiquement sur l’adversaire le plus proche devant vous',
    color: 0xd9913b,
    emissive: 0x8a4a12,
  },
  [POWER_UPS.SHIELD]: {
    id: POWER_UPS.SHIELD,
    label: 'Bouclier',
    description: 'Protège une fois d’une collision ou d’un lasso (5s)',
    color: 0x4ce9df,
    emissive: 0x1a7a74,
  },
};

/** Grant the tier's burst and restart the 1-second window (previous boost is dropped). */
export function speedBoostFor(tier) {
  const bonus = DUEL_SPEED_BONUS[tier] ?? 0;
  return bonus > 0 ? { bonus, left: SPEED_BOOST_DURATION } : SPEED_BOOST_NONE;
}

/** Run the clock down; once the window closes the bonus is gone outright. */
export function tickSpeedBoost(boost, dt) {
  const left = Math.max(0, (boost?.left ?? 0) - dt);
  return left > 0 && boost?.bonus > 0 ? { bonus: boost.bonus, left } : SPEED_BOOST_NONE;
}

export function duelSpeed(base, bonus) {
  return Math.min(DUEL_MAX_SPEED, Math.max(DUEL_MIN_SPEED, base + bonus));
}

export function ghostDistance(trace, seconds, duration) {
  if (!trace?.length || seconds <= 0) return 0;
  if (seconds >= duration) return DUEL_DISTANCE;
  const index = Math.floor(seconds * 2); // samples every half-second
  const lastSample = (trace.length - 2) * 0.5;
  if (seconds >= lastSample) {
    const start = trace[trace.length - 2];
    return start + (DUEL_DISTANCE - start) * Math.min(1, (seconds - lastSample) / Math.max(0.01, duration - lastSample));
  }
  return trace[index] + (trace[index + 1] - trace[index]) * (seconds * 2 - index);
}

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

/** Pick the NPC's lane for an encounter: never a cactus, jump barriers, prefer valuable gems close by. */
export function planNpcLane(items, currentLane) {
  let best = { lane: currentLane, jump: false, value: -Infinity };
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    if (items.some(item => item.kind === 'cactus' && item.lane === lane)) continue;
    const barrier = items.some(item => item.kind === 'barrier' && item.lanes.includes(lane));
    const gem = items.find(item => item.kind === 'crystal' && item.lane === lane && !item.taken);
    const jump = barrier || Boolean(gem?.raised);
    const value = (gem ? CRYSTALS[gem.tier].value : 0) - Math.abs(lane - currentLane) * 45 - (barrier ? 10 : 0);
    if (value > best.value) best = { lane, jump, value };
  }
  return best;
}

// Vocal streak is separate from the existing scoring combo.
export function advanceCowboyStreak(current, collected, crashed = false) {
  const streak = collected && !crashed ? current + 1 : 0;
  return { streak, cheer: streak > 0 && streak % 5 === 0 };
}

export function playerLaneAfterAction(lane, action, jumpRemaining) {
  if (jumpRemaining > 0) return lane;
  if (action === 'left') return Math.max(0, lane - 1);
  if (action === 'right') return Math.min(LANE_COUNT - 1, lane + 1);
  return lane;
}

export function playerLateralPosition(x, targetX, dt, jumpRemaining) {
  // Freeze even an unfinished lane transition until the horse touches down.
  return jumpRemaining > 0 ? x : x + (targetX - x) * Math.min(1, dt * 12);
}

/** Apply one collision: rush consumes a life; races slow the rider and drop its burst. */
export function resolveCollision({ mode, lives, speed, boost }) {
  if (mode === 'rush') {
    const nextLives = Math.max(0, lives - 1);
    return { lives: nextLives, baseSpeed: speed, boost, gameOver: nextLives === 0 };
  }
  return { lives, baseSpeed: Math.max(8, speed * 0.55), boost: SPEED_BOOST_NONE, gameOver: false };
}

/** Keep online's locally-rendered duplicate hidden while blinking a hit rider. */
export function isPlayerVisible(mode, invulnerable, time) {
  return mode !== 'online' && (invulnerable <= 0 || Math.floor(time / 90) % 2 === 0);
}
