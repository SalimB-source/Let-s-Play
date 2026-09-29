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
    const lane = Math.floor(random() * 3);
    const gem = (l, raised = false) => {
      const roll = random();
      return { kind: 'crystal', lane: l, raised, tier: raised ? 2 : roll < 0.6 ? 0 : roll < 0.9 ? 1 : 2 };
    };
    let items;
    if (pattern === 'jump') {
      const start = Math.floor(random() * 2);
      items = [{ kind: 'barrier', lane: start, lanes: [start, start + 1] }, { kind: 'cactus', lane: start === 0 ? 2 : 0 }, gem(start, true), gem(start + 1, true)];
    } else if (pattern === 'gate') {
      items = [0, 1, 2].map(l => l === lane ? gem(l) : { kind: 'cactus', lane: l });
    } else if (pattern === 'trail') {
      items = [0, 1, 2].map(l => gem(l));
    } else if (pattern === 'fork') {
      const start = Math.floor(random() * 2);
      items = [{ kind: 'barrier', lane: start, lanes: [start, start + 1] }, gem(start === 0 ? 2 : 0), gem(start, true)];
    } else {
      items = [0, 1, 2].map(l => l === lane ? { kind: 'cactus', lane: l } : gem(l));
    }
    return { pattern, items, gap: 18 + random() * 7 };
  };
}

export const DUEL_DISTANCE = 600;
export const DUEL_SPEED_BONUS = [1.6, 2.8, 4.4]; // cyan, rose, or; m/s
export const DUEL_BASE_SPEED = 15;
export const DUEL_MIN_SPEED = 8;
export const DUEL_MAX_SPEED = 26;

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
  for (let lane = 0; lane < 3; lane++) {
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
  if (action === 'right') return Math.min(2, lane + 1);
  return lane;
}

export function playerLateralPosition(x, targetX, dt, jumpRemaining) {
  // Freeze even an unfinished lane transition until the horse touches down.
  return jumpRemaining > 0 ? x : x + (targetX - x) * Math.min(1, dt * 12);
}

/** Apply one collision: rush consumes a life; races slow the rider without ending. */
export function resolveCollision({ mode, lives, speed, boost }) {
  if (mode === 'rush') {
    const nextLives = Math.max(0, lives - 1);
    return { lives: nextLives, baseSpeed: speed, boost, gameOver: nextLives === 0 };
  }
  return { lives, baseSpeed: Math.max(8, speed * 0.55), boost: 0, gameOver: false };
}

/** Keep online's locally-rendered duplicate hidden while blinking a hit rider. */
export function isPlayerVisible(mode, invulnerable, time) {
  return mode !== 'online' && (invulnerable <= 0 || Math.floor(time / 90) % 2 === 0);
}
