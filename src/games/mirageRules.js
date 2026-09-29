// Four playable lanes, centred on the road. Keep rendering and game rules in sync.
export const LANES = Object.freeze([-3.15, -1.05, 1.05, 3.15]);
export const LANE_COUNT = LANES.length;
const LANE_INDICES = LANES.map((_, lane) => lane);

// Four diamond tiers:
// Cyan (tier 0): 100 pts
// Rouge (tier 1): 150 pts
// Verte (tier 2): 200 pts (New: more than red, less than gold)
// Or (tier 3): 250 pts (Fewer golden diamonds)
export const CRYSTALS = [
  { name: 'Cyan', color: 0x45e4ff, value: 100 },
  { name: 'Rouge', color: 0xf2352c, value: 150 },
  { name: 'Verte', color: 0x4cd964, value: 200 },
  { name: 'Or', color: 0xffd15c, value: 250 },
];
export const CRYSTAL_COUNT = CRYSTALS.length;

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
      // Adjusted probabilities: Cyan 55%, Red 25%, Green 15%, Gold 5% (reduced gold)
      // Raised gems (on jumps) get higher tiers: Green or Gold
      return {
        kind: 'crystal',
        lane: l,
        raised,
        tier: raised
          ? (roll < 0.7 ? 2 : 3)  // Raised: 70% Green, 30% Gold
          : roll < 0.55 ? 0       // Normal: 55% Cyan
          : roll < 0.8 ? 1        // 25% Red
          : roll < 0.95 ? 2       // 15% Green
          : 3                     // 5% Gold (reduced gold)
      };
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

// ── Gem shatter burst ──────────────────────────────────────────────────
// Every collected diamond explodes into a handful of shards plus a flash ring.
export const GEM_BURST_DURATION = 0.52; // seconds a burst stays on screen
export const GEM_BURST_SHARDS = 10; // shards thrown by one diamond
export const GEM_BURST_GRAVITY = 12; // m/s², pulls the shards back down
export const GEM_BURST_LIFT = 0.55; // m of upward kick, on top of the spread
// Richer diamonds throw their shards further: cyan, red, green, gold.
export const GEM_BURST_SPEED = Object.freeze([3.6, 4.2, 4.7, 5.1]);

const clamp01 = (value) => Math.max(0, Math.min(1, value));

export const gemBurstSpeed = (tier) => GEM_BURST_SPEED[tier] ?? GEM_BURST_SPEED[0];

const GEM_BURST_DOWNWARD = 0.55;

export function gemBurstShards(count = GEM_BURST_SHARDS, random = Math.random) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const twist = random() * Math.PI * 2;
  const shards = [];
  for (let i = 0; i < count; i += 1) {
    const y = 1 - ((i + 0.5) / count) * (1 + GEM_BURST_DOWNWARD);
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = twist + i * golden;
    shards.push({
      dir: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
      speed: 0.72 + random() * 0.55,
      size: 0.62 + random() * 0.62,
      spin: [(random() - 0.5) * 22, (random() - 0.5) * 22, (random() - 0.5) * 22],
    });
  }
  return shards;
}

export function gemShardState(shard, age, tier = 0) {
  const life = clamp01(age / GEM_BURST_DURATION);
  const ease = 1 - (1 - life) ** 2;
  const reach = gemBurstSpeed(tier) * GEM_BURST_DURATION * shard.speed * ease;
  const fall = 0.5 * GEM_BURST_GRAVITY * (life * GEM_BURST_DURATION) ** 2;
  return {
    life,
    done: life >= 1,
    position: [
      shard.dir[0] * reach,
      shard.dir[1] * reach + GEM_BURST_LIFT * ease - fall,
      shard.dir[2] * reach,
    ],
    rotation: [shard.spin[0] * age, shard.spin[1] * age, shard.spin[2] * age],
    scale: shard.size * (1 - life * life * 0.9),
    opacity: 1 - life * life,
  };
}

export function gemFlashState(age, tier = 0) {
  const life = clamp01(age / GEM_BURST_DURATION);
  const ease = 1 - (1 - life) ** 3;
  return {
    life,
    done: life >= 1,
    scale: 0.45 + ease * (1.5 + tier * 0.28),
    opacity: (1 - life) ** 1.6 * 0.85,
  };
}

export const DUEL_DISTANCE = 600;
export const DUEL_SPEED_BONUS = [1.6, 2.8, 3.6, 4.4]; // cyan, rouge, verte, or; m/s
export const DUEL_BASE_SPEED = 15;
export const DUEL_MIN_SPEED = 8;
export const DUEL_MAX_SPEED = 26;

export const SPEED_BOOST_DURATION = 1;
export const SPEED_BOOST_NONE = Object.freeze({ bonus: 0, left: 0 });

// ── Power-ups ──────────────────────────────────────────────────────────
export const POWER_UPS = {
  SHIELD: 'shield',
  LASSO: 'lasso',
  PISTOL: 'pistol',
};

// Power-up charging: diamonds needed to charge each power-up
// Pistol takes more diamonds to charge than lasso and shield
export const POWER_UP_CHARGE_COST = {
  [POWER_UPS.SHIELD]: 3,   // 3 charge points
  [POWER_UPS.LASSO]: 3,    // 3 charge points
  [POWER_UPS.PISTOL]: 5,   // 5 charge points (harder/takes longer to charge)
};

// Charge points gained per diamond tier
export const DIAMOND_CHARGE_VALUE = [1, 1, 2, 3]; // Cyan=1, Red=1, Green=2, Gold=3

// Maximum charges a player can hold per power-up
export const POWER_UP_MAX_CHARGES = 3;

export const POWER_UP_MODES = Object.freeze(['duel', 'online', 'rush']);

export function powerUpsEnabled(mode) {
  return true;
}

export const SHIELD_DURATION = 5; // seconds the shield stays active
export const LASSO_SLOW_DURATION = 2.5; // seconds target is slowed
export const LASSO_SLOW_FACTOR = 0.45; // speed multiplier while slowed
export const LASSO_PROJECTILE_DURATION = 0.45; // seconds rope flies
export const PISTOL_STUN_DURATION = 1; // seconds the shot rider is on the ground, fully stopped

const rankIndex = (rank) => Math.max(0, Math.min(3, (rank | 0) - 1));

export const PISTOL_CHANCES = [0, 0.05, 0.15, 0.3];
export const LASSO_CHANCES = [0, 0.3, 0.4, 0.6];

export function getLassoChance(rank) {
  return LASSO_CHANCES[rankIndex(rank)] ?? 0;
}

export function getPistolChance(rank) {
  return PISTOL_CHANCES[rankIndex(rank)] ?? 0;
}

export function powerUpOdds(rank) {
  const pistol = getPistolChance(rank);
  const lasso = (1 - pistol) * getLassoChance(rank);
  return { pistol, lasso, shield: 1 - pistol - lasso };
}

export function rollPowerUpSlot() {
  return false; // No longer spawning power-up "?" items on the road!
}

export function rollPowerUpContent(rank, random = Math.random) {
  if (random() < getPistolChance(rank)) return POWER_UPS.PISTOL;
  if (random() < getLassoChance(rank)) return POWER_UPS.LASSO;
  return POWER_UPS.SHIELD;
}

export function rollPowerUpType(rank, random = Math.random) {
  return null; // No road items
}

export function rollPowerUpForMode(mode, rank, random = Math.random) {
  return null; // No road items
}

export function nearestRider(myDistance, riders) {
  let best = null;
  for (const rider of riders || []) {
    const gap = Math.abs((Number(rider.distance) || 0) - myDistance);
    if (!best || gap < best.gap) best = { ...rider, gap };
  }
  return best;
}

export function stunPose(left, duration = PISTOL_STUN_DURATION, side = 1) {
  if (!(left > 0)) return { x: 0, y: 0, roll: 0, pitch: 0 };
  const p = clamp01(1 - left / duration);
  const ease = (t) => t * t * (3 - 2 * t);
  let off;
  let hop = 0;
  if (p < 0.28) { off = ease(p / 0.28); hop = Math.sin((p / 0.28) * Math.PI) * 0.45; }
  else if (p < 0.5) off = 1;
  else { const t = (p - 0.5) / 0.5; off = 1 - ease(t); hop = Math.sin(t * Math.PI) * 0.55; }
  return {
    x: side * off * 1.05,
    y: -off * 1.1 + hop,
    roll: side * off * 1.35,
    pitch: p >= 0.5 ? -Math.sin(((p - 0.5) / 0.5) * Math.PI) * 0.5 : 0,
  };
}

export const POWER_UP_DEFS = {
  [POWER_UPS.SHIELD]: {
    id: POWER_UPS.SHIELD,
    label: 'Bouclier',
    keyHintPC: 'Q / A',
    icon: '🛡️',
    description: 'Protège d’un choc, lasso ou tir (5s)',
    color: 0x4ce9df,
    emissive: 0x1a7a74,
    cost: POWER_UP_CHARGE_COST[POWER_UPS.SHIELD],
  },
  [POWER_UPS.LASSO]: {
    id: POWER_UPS.LASSO,
    label: 'Lasso',
    keyHintPC: 'W / Z',
    icon: '🪢',
    description: 'Attrape et ralentit l’adversaire devant toi',
    color: 0xd9913b,
    emissive: 0x8a4a12,
    cost: POWER_UP_CHARGE_COST[POWER_UPS.LASSO],
  },
  [POWER_UPS.PISTOL]: {
    id: POWER_UPS.PISTOL,
    label: 'Pistolet',
    keyHintPC: 'E',
    icon: '🔫',
    description: 'Fait tomber le cavalier en tête de cheval (se charge en 5 diamants)',
    color: 0xe05656,
    emissive: 0x801e1e,
    cost: POWER_UP_CHARGE_COST[POWER_UPS.PISTOL],
  },
};

// ── Diamond pickup effect (no traps) ────────────────────────────────────
/**
 * What a crystal does to the rider: its speed burst.
 * No trap probability: all diamonds give speed boost.
 */
export function crystalPickupEffect(tier, trapped = false) {
  return { trap: false, boost: speedBoostFor(tier), slowDuration: 0, slowFactor: 1 };
}

export function speedBoostFor(tier) {
  const bonus = DUEL_SPEED_BONUS[tier] ?? 0;
  return bonus > 0 ? { bonus, left: SPEED_BOOST_DURATION } : SPEED_BOOST_NONE;
}

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
  const index = Math.floor(seconds * 2);
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
  return jumpRemaining > 0 ? x : x + (targetX - x) * Math.min(1, dt * 12);
}

export function resolveCollision({ mode, lives, speed, boost }) {
  if (mode === 'rush') {
    const nextLives = Math.max(0, lives - 1);
    return { lives: nextLives, baseSpeed: speed, boost, gameOver: nextLives === 0 };
  }
  return { lives, baseSpeed: Math.max(8, speed * 0.55), boost: SPEED_BOOST_NONE, gameOver: false };
}

export function isPlayerVisible(mode, invulnerable, time) {
  return mode !== 'online' && (invulnerable <= 0 || Math.floor(time / 90) % 2 === 0);
}
