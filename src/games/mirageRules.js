// Four playable lanes, centred on the road. Keep rendering and game rules in sync.
export const LANES = Object.freeze([-3.15, -1.05, 1.05, 3.15]);
export const LANE_COUNT = LANES.length;
const LANE_INDICES = LANES.map((_, lane) => lane);

export const CRYSTALS = [
  { name: 'Cyan', color: 0x45e4ff, value: 100 },
  // The red diamond is the gamble of the run: same points as ever, but some
  // of them are cursed (see RED_TRAP_CHANCE) and brake the rider instead of
  // launching it. Nothing on the mesh gives it away before the pickup.
  { name: 'Rouge', color: 0xf2352c, value: 150 },
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

// ── Gem shatter burst ──────────────────────────────────────────────────
// Every collected diamond explodes into a handful of shards plus a flash ring.
// The maths lives here (pure, testable); MirageWorld only moves the meshes.
export const GEM_BURST_DURATION = 0.52; // seconds a burst stays on screen
export const GEM_BURST_SHARDS = 10; // shards thrown by one diamond
export const GEM_BURST_GRAVITY = 12; // m/s², pulls the shards back down
export const GEM_BURST_LIFT = 0.55; // m of upward kick, on top of the spread
// Richer diamonds throw their shards further: cyan, red, gold.
export const GEM_BURST_SPEED = Object.freeze([3.6, 4.2, 5.1]);

const clamp01 = (value) => Math.max(0, Math.min(1, value));

export const gemBurstSpeed = (tier) => GEM_BURST_SPEED[tier] ?? GEM_BURST_SPEED[0];

// The spread leans upwards (1 up, GEM_BURST_DOWNWARD down) so gravity has
// something to work with and few shards get driven straight into the sand.
const GEM_BURST_DOWNWARD = 0.55;

/**
 * Shard blueprints for one burst: directions spread over a dome (Fibonacci
 * lattice, so no two shards overlap) with a random twist, speed and spin.
 */
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

/** Where one shard sits, how big and how opaque it is, `age` seconds into the burst. */
export function gemShardState(shard, age, tier = 0) {
  const life = clamp01(age / GEM_BURST_DURATION);
  const ease = 1 - (1 - life) ** 2; // quick punch outwards, then it coasts
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

/** The shockwave ring: snaps open on pickup, then fades out. */
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
export const DUEL_SPEED_BONUS = [1.6, 2.8, 4.4]; // cyan, rouge, or; m/s
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
  PISTOL: 'pistol',
};

// ── Which modes carry the "?" items ────────────────────────────────────
// A special item needs a rival to lasso, shoot or a hit to absorb, so only the
// duel (PNJ or shared ghost) and the online rooms keep them. The Ruée is a solo
// time attack scored on 3 lives: its track stays clean, crystals and hazards
// only. Adding a mode here is all it takes to give it the "?" items back.
export const POWER_UP_MODES = Object.freeze(['duel', 'online']);

export function powerUpsEnabled(mode) {
  return POWER_UP_MODES.includes(mode);
}

// Special items all wear the same skin: a floating rainbow "?" that only
// reveals its effect once a rider rides through it.
//
// A "?" is shared by the whole field: its place on the track is drawn from the
// race seed (so every online client sees it at the same spot) and it never
// vanishes when someone grabs it — every rider can take it in turn. What is
// inside is only rolled at pickup, from the picker's own race position.
//
//  - POWER_UP_SPAWN_GAP_MIN/MAX: how far apart the spawn slots are (metres).
//  - POWER_UP_SPAWN_RATE: how often a slot actually holds a "?".
export const POWER_UP_SPAWN_GAP_MIN = 45;
export const POWER_UP_SPAWN_GAP_MAX = 75;
export const POWER_UP_SPAWN_RATE = 0.32;

// Pistol chances by race position (1st → 4th): rolled first.
export const PISTOL_CHANCES = [0, 0.05, 0.15, 0.3];
// Lasso chances by race position (1st → 4th), on what the pistol left.
export const LASSO_CHANCES = [0, 0.3, 0.4, 0.6];
// Whatever is neither pistol nor lasso is a shield.

export const SHIELD_DURATION = 5; // seconds the shield stays active
export const LASSO_SLOW_DURATION = 2.5; // seconds target is slowed
export const LASSO_SLOW_FACTOR = 0.45; // speed multiplier while slowed
export const LASSO_PROJECTILE_DURATION = 0.45; // seconds rope flies
export const PISTOL_STUN_DURATION = 1; // seconds the shot rider is on the ground, fully stopped

const rankIndex = (rank) => Math.max(0, Math.min(3, (rank | 0) - 1));

export function getLassoChance(rank) {
  return LASSO_CHANCES[rankIndex(rank)] ?? 0;
}

export function getPistolChance(rank) {
  return PISTOL_CHANCES[rankIndex(rank)] ?? 0;
}

/** What a picked-up "?" turns into, 0→1 per item, for a rider at `rank`. Sums to 1. */
export function powerUpOdds(rank) {
  const pistol = getPistolChance(rank);
  const lasso = (1 - pistol) * getLassoChance(rank);
  return { pistol, lasso, shield: 1 - pistol - lasso };
}

/** Does this spawn slot hold a "?" at all? Rank-free, so it can come from the shared seed. */
export function rollPowerUpSlot(random = Math.random) {
  return random() < POWER_UP_SPAWN_RATE;
}

/** Reveal a picked-up "?": pistol first, then lasso, otherwise shield. */
export function rollPowerUpContent(rank, random = Math.random) {
  if (random() < getPistolChance(rank)) return POWER_UPS.PISTOL;
  if (random() < getLassoChance(rank)) return POWER_UPS.LASSO;
  return POWER_UPS.SHIELD;
}

/** Full roll of one slot: empty (null) or the item a rider at `rank` would get. */
export function rollPowerUpType(rank, random = Math.random) {
  if (!rollPowerUpSlot(random)) return null;
  return rollPowerUpContent(rank, random);
}

/** Roll one spawn slot for a given mode. The Ruée never yields anything. */
export function rollPowerUpForMode(mode, rank, random = Math.random) {
  return powerUpsEnabled(mode) ? rollPowerUpType(rank, random) : null;
}

/** Nearest other rider by track distance; `riders` = [{ id, distance }]. */
export function nearestRider(myDistance, riders) {
  let best = null;
  for (const rider of riders || []) {
    const gap = Math.abs((Number(rider.distance) || 0) - myDistance);
    if (!best || gap < best.gap) best = { ...rider, gap };
  }
  return best;
}

/**
 * Remount animation for a rider knocked off by the pistol, `left` seconds of
 * stun remaining. Returns the rider's offset from the saddle: thrown off to
 * the side, a beat on the sand, then climbing back up.
 */
export function stunPose(left, duration = PISTOL_STUN_DURATION, side = 1) {
  if (!(left > 0)) return { x: 0, y: 0, roll: 0, pitch: 0 };
  const p = clamp01(1 - left / duration);
  const ease = (t) => t * t * (3 - 2 * t);
  let off; // 0 = in the saddle, 1 = lying on the ground
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
  [POWER_UPS.PISTOL]: {
    id: POWER_UPS.PISTOL,
    label: 'Pistolet',
    description: 'Tire sur le cavalier en tête, même loin : il tombe de cheval 1 s',
    color: 0x444444,
    emissive: 0x111111,
  },
};

// ── Red diamond trap ───────────────────────────────────────────────────
// Every red diamond is a small gamble: 15 % of them are cursed and slam the
// brakes on instead of granting the usual speed burst. The points are paid
// either way — the gamble is on speed, never on score. A fake gold diamond
// pays like a red one, so it rolls for the curse too.
export const RED_TRAP_TIER = 1;
export const RED_TRAP_CHANCE = 0.15;
export const RED_TRAP_SLOW_DURATION = 1.6; // seconds the rider is braked
export const RED_TRAP_SLOW_FACTOR = 0.55; // speed multiplier while braked

/** Roll once, on pickup-time tier, whether this red diamond is cursed. */
export const rollRedTrap = (random = Math.random) => random() < RED_TRAP_CHANCE;

/**
 * What a crystal does to the rider: a speed burst, or the red diamond's brake.
 * Returns a plain description so world code stays free of the rules.
 */
export function crystalPickupEffect(tier, trapped = false) {
  if (tier === RED_TRAP_TIER && trapped) {
    return { trap: true, boost: SPEED_BOOST_NONE, slowDuration: RED_TRAP_SLOW_DURATION, slowFactor: RED_TRAP_SLOW_FACTOR };
  }
  return { trap: false, boost: speedBoostFor(tier), slowDuration: 0, slowFactor: 1 };
}

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
