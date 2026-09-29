import test from 'node:test';
import assert from 'node:assert/strict';
import { createCourse, jumpHeight, CRYSTALS, LANES, LANE_COUNT, seededRandom } from '../src/games/mirageRules.js';

test('encounters remain varied and traversable over 1000 rows', () => {
  let seed = 42;
  const next = createCourse(() => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32));
  let previous;
  const patterns = new Set();
  for (let i = 0; i < 1000; i++) {
    const row = next();
    assert.notEqual(row.pattern, previous);
    previous = row.pattern;
    patterns.add(row.pattern);
    assert.ok(row.gap >= 18 && row.gap <= 25);
    const cacti = row.items.filter(item => item.kind === 'cactus');
    assert.ok(cacti.length < LANE_COUNT);
    assert.ok(LANES.some((_, lane) => !cacti.some(item => item.lane === lane)));
    for (const item of row.items) {
      assert.ok(item.lane >= 0 && item.lane < LANE_COUNT);
      if (item.kind === 'barrier') {
        assert.equal(item.lanes.length, 2);
        assert.ok(item.lanes.every(l => l >= 0 && l < LANE_COUNT));
        assert.equal(item.lanes[1] - item.lanes[0], 1);
        assert.ok(item.lanes.every(l => !cacti.some(c => c.lane === l)));
      }
      if (item.kind === 'crystal') assert.ok(CRYSTALS[item.tier]);
    }
    if (row.pattern === 'jump') {
      assert.equal(cacti.length, LANE_COUNT - 2);
      assert.ok(row.items.some(item => item.kind === 'crystal' && item.raised && item.tier === 2));
    }
  }
  assert.equal(patterns.size, 5);
});

test('jump requires actual clearance, not simply a pressed button', () => {
  assert.equal(jumpHeight(0), 0);
  assert.equal(jumpHeight(0.82), 0);
  assert.ok(jumpHeight(0.41) > 1.05);
  assert.ok(jumpHeight(0.8) < 1.05);
  assert.ok(jumpHeight(0.03) < 1.05);
  assert.deepEqual(CRYSTALS.map(c => c.value), [100, 150, 250]);
});

test('duel speed is capped, collision can slow down and gems boost', async () => {
  const { DUEL_BASE_SPEED, DUEL_SPEED_BONUS, duelSpeed, ghostDistance, DUEL_DISTANCE, seededRandom } = await import('../src/games/mirageRules.js');
  assert.equal(duelSpeed(DUEL_BASE_SPEED, DUEL_SPEED_BONUS[2]), 19.4);
  assert.equal(duelSpeed(8, -50), 8);
  assert.equal(duelSpeed(25, 8), 26);
  assert.equal(ghostDistance([0, 7, 15, DUEL_DISTANCE], 0.25, 1.3), 3.5);
  assert.ok(ghostDistance([0, 7, 15, DUEL_DISTANCE], 1.2, 1.3) < DUEL_DISTANCE);
  assert.equal(ghostDistance([0, 7, 15, DUEL_DISTANCE], 1.3, 1.3), DUEL_DISTANCE);
  assert.deepEqual(Array.from({length: 5}, seededRandom(12)), Array.from({length: 5}, seededRandom(12)));
});

test('a speed bonus burns for one second and never stacks', async () => {
  const { speedBoostFor, tickSpeedBoost, SPEED_BOOST_NONE, SPEED_BOOST_DURATION, DUEL_SPEED_BONUS, DUEL_BASE_SPEED, duelSpeed } = await import('../src/games/mirageRules.js');
  assert.equal(SPEED_BOOST_DURATION, 1);
  assert.deepEqual(speedBoostFor(2), { bonus: DUEL_SPEED_BONUS[2], left: 1 });
  // inside the window the burst runs at full strength, then it is gone outright (no slow decay)
  let boost = tickSpeedBoost(speedBoostFor(1), 0.4);
  assert.deepEqual(boost, { bonus: DUEL_SPEED_BONUS[1], left: 0.6 });
  assert.equal(duelSpeed(DUEL_BASE_SPEED, boost.bonus), DUEL_BASE_SPEED + DUEL_SPEED_BONUS[1]);
  boost = tickSpeedBoost(boost, 0.6);
  assert.deepEqual(boost, SPEED_BOOST_NONE);
  assert.equal(duelSpeed(DUEL_BASE_SPEED, boost.bonus), DUEL_BASE_SPEED);
  // picking up again mid-burst restarts the window at the new gem's value: nothing is summed or carried over
  const fading = tickSpeedBoost(speedBoostFor(2), 0.75);
  assert.deepEqual(fading, { bonus: DUEL_SPEED_BONUS[2], left: 0.25 });
  assert.deepEqual(speedBoostFor(0), { bonus: DUEL_SPEED_BONUS[0], left: SPEED_BOOST_DURATION });
  assert.ok(speedBoostFor(0).bonus < fading.bonus + DUEL_SPEED_BONUS[0]);
  // even a perfect gold-every-frame run cannot compound past a single burst
  let chained = SPEED_BOOST_NONE;
  let peak = 0;
  for (let i = 0; i < 60; i++) {
    chained = speedBoostFor(2);
    peak = Math.max(peak, duelSpeed(DUEL_BASE_SPEED, chained.bonus));
    chained = tickSpeedBoost(chained, 1 / 60);
  }
  assert.equal(peak, DUEL_BASE_SPEED + DUEL_SPEED_BONUS[2]);
  assert.deepEqual(tickSpeedBoost(SPEED_BOOST_NONE, 0.5), SPEED_BOOST_NONE);
  assert.deepEqual(SPEED_BOOST_NONE, { bonus: 0, left: 0 });
});

test('share link roundtrips and rejects malformed challenge', async () => {
  const { encodeChallenge, decodeChallenge } = await import('../src/games/duelChallenge.js');
  const { DUEL_DISTANCE } = await import('../src/games/mirageRules.js');
  const code = encodeChallenge({ seed: 123, duration: 37.5, trace: [0, 12, 26, DUEL_DISTANCE], name: 'Étoile' });
  assert.deepEqual(decodeChallenge(code), {v: 1, seed: 123, duration: 37.5, trace: [0, 12, 26, DUEL_DISTANCE], name: 'Étoile'});
  assert.equal(decodeChallenge('broken'), null);
  assert.equal(decodeChallenge(encodeChallenge({ seed: 123, duration: 37.5, trace: [0, 100, 8, DUEL_DISTANCE], name: 'X' })), null);
});

test('NPC avoids cacti, jumps barriers and chases valuable gems', async () => {
  const { planNpcLane } = await import('../src/games/mirageRules.js');
  const gate = [{ kind: 'cactus', lane: 0 }, { kind: 'crystal', lane: 1, tier: 0 }, { kind: 'cactus', lane: 2 }];
  assert.equal(planNpcLane(gate, 0).lane, 1);
  const jump = [{ kind: 'barrier', lane: 0, lanes: [0, 1] }, { kind: 'cactus', lane: 2 }, { kind: 'crystal', lane: 0, tier: 2, raised: true }];
  assert.deepEqual([planNpcLane(jump, 2).lane, planNpcLane(jump, 2).jump], [0, true]);
  const trail = [0, 1, 2].map(lane => ({ kind: 'crystal', lane, tier: lane === 2 ? 2 : 0 }));
  assert.equal(planNpcLane(trail, 1).lane, 2);
  trail[2].taken = true;
  assert.equal(planNpcLane(trail, 1).lane, 1);
});

test('duel links preserve western stage and accept older desert links', async () => {
  const { encodeChallenge, decodeChallenge } = await import('../src/games/duelChallenge.js');
  const run = { seed: 42, duration: 40, trace: [0, 100, 600], name: 'Cowboy', stage: 'western' };
  assert.equal(decodeChallenge(encodeChallenge(run)).stage, 'western');
  assert.equal(decodeChallenge(encodeChallenge({ ...run, stage: undefined })).stage, undefined);
});

test('prairie stage is retained in challenge links', async () => {
  const { encodeChallenge, decodeChallenge } = await import('../src/games/duelChallenge.js');
  const run = { seed: 42, duration: 40, trace: [0, 100, 600], name: 'Cavalier', stage: 'prairie' };
  assert.equal(decodeChallenge(encodeChallenge(run)).stage, 'prairie');
});

test('sardinia (Costa Omertà) stage is retained in challenge links and rejects unknown stages', async () => {
  const { encodeChallenge, decodeChallenge } = await import('../src/games/duelChallenge.js');
  const run = { seed: 42, duration: 40, trace: [0, 100, 600], name: 'Padrino', stage: 'sardinia' };
  assert.equal(decodeChallenge(encodeChallenge(run)).stage, 'sardinia');
  assert.equal(decodeChallenge(encodeChallenge({ ...run, stage: 'atlantis' })).stage, undefined);
});

test('cowboy cry fires only on each fifth consecutive pickup, and resets on a miss or crash', async () => {
  const { advanceCowboyStreak } = await import('../src/games/mirageRules.js');
  let streak = 0;
  const cries = [];
  for (let n = 1; n <= 16; n++) {
    const result = advanceCowboyStreak(streak, true);
    streak = result.streak;
    if (result.cheer) cries.push(n);
  }
  assert.deepEqual(cries, [5, 10, 15]);
  assert.deepEqual(advanceCowboyStreak(4, false), { streak: 0, cheer: false });
  assert.deepEqual(advanceCowboyStreak(4, true, true), { streak: 0, cheer: false });
  assert.deepEqual(advanceCowboyStreak(0, true), { streak: 1, cheer: false });
});

test('rush collisions spend three lives and the third collision ends the run; duel collisions only slow down', async () => {
  const { resolveCollision, SPEED_BOOST_NONE, speedBoostFor } = await import('../src/games/mirageRules.js');
  let lives = 3;
  for (let hit = 1; hit <= 3; hit += 1) {
    const result = resolveCollision({ mode: 'rush', lives, speed: 15, boost: SPEED_BOOST_NONE });
    lives = result.lives;
    assert.equal(result.gameOver, hit === 3);
    assert.equal(result.lives, 3 - hit);
  }
  // a duel crash wipes the burst too, so a rider cannot keep speed through a cactus
  assert.deepEqual(resolveCollision({ mode: 'duel', lives: 3, speed: 19.4, boost: speedBoostFor(2) }), {
    lives: 3, baseSpeed: 10.67, boost: SPEED_BOOST_NONE, gameOver: false,
  });
});

test('hit animation visibility blinks in rush and duel but online local duplicate remains hidden', async () => {
  const { isPlayerVisible } = await import('../src/games/mirageRules.js');
  assert.equal(isPlayerVisible('duel', 1, 0), true);
  assert.equal(isPlayerVisible('duel', 1, 100), false);
  assert.equal(isPlayerVisible('rush', 1, 100), false);
  assert.equal(isPlayerVisible('duel', 0, 100), true);
  assert.equal(isPlayerVisible('online', 0, 0), false);
});

test('airborne player cannot change lanes or drift, and can move on landing', async () => {
  const { playerLaneAfterAction, playerLateralPosition } = await import('../src/games/mirageRules.js');
  for (const remaining of [0.82, 0.41, 0.001]) {
    assert.equal(playerLaneAfterAction(1, 'left', remaining), 1);
    assert.equal(playerLaneAfterAction(1, 'right', remaining), 1);
    assert.equal(playerLateralPosition(0.6, 2.1, 0.016, remaining), 0.6);
  }
  assert.equal(playerLaneAfterAction(1, 'left', 0), 0);
  assert.equal(playerLaneAfterAction(1, 'right', 0), 2);
  assert.equal(playerLaneAfterAction(0, 'left', 0), 0);
  assert.equal(playerLaneAfterAction(2, 'right', 0), 3);
  assert.equal(playerLaneAfterAction(3, 'right', 0), 3);
  assert.equal(playerLaneAfterAction(3, 'left', 0), 2);
  assert.equal(playerLaneAfterAction(3, 'left', 0.41), 3);
  assert.equal(playerLaneAfterAction(1, 'jump', 0), 1);
  assert.ok(playerLateralPosition(0.6, 2.1, 0.016, 0) > 0.6);
});

test('special items stay rare: slots are spread out and most of them are empty', async () => {
  const { rollPowerUpType, powerUpOdds, POWER_UP_SPAWN_GAP_MIN, POWER_UP_SPAWN_GAP_MAX, POWER_UP_SPAWN_RATE, POWER_UPS } = await import('../src/games/mirageRules.js');
  // Slots are further apart than the old 28–46 m cadence.
  assert.ok(POWER_UP_SPAWN_GAP_MIN >= 40);
  assert.ok(POWER_UP_SPAWN_GAP_MAX > POWER_UP_SPAWN_GAP_MIN);
  assert.ok(POWER_UP_SPAWN_RATE < 1);
  // A seeded roll: most slots are empty, and a leader never gets a lasso.
  let seed = 7;
  const next = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  let filled = 0;
  const rolls = 4000;
  for (let i = 0; i < rolls; i++) if (rollPowerUpType(4, next)) filled += 1;
  assert.ok(filled / rolls < 0.5);
  for (let i = 0; i < 500; i++) assert.notEqual(rollPowerUpType(1, next), POWER_UPS.LASSO);
  // The HUD odds match what the roll actually produces.
  for (const rank of [1, 2, 3, 4]) {
    const odds = powerUpOdds(rank);
    let lasso = 0;
    let shield = 0;
    for (let i = 0; i < rolls; i++) {
      const type = rollPowerUpType(rank, next);
      if (type === POWER_UPS.LASSO) lasso += 1;
      else if (type === POWER_UPS.SHIELD) shield += 1;
    }
    assert.ok(Math.abs(lasso / rolls - odds.lasso) < 0.03, `lasso ${rank}: ${lasso / rolls} vs ${odds.lasso}`);
    assert.ok(Math.abs(shield / rolls - odds.shield) < 0.03, `shield ${rank}: ${shield / rolls} vs ${odds.shield}`);
  }
});
test('four lanes are centred, evenly spaced, and traversable in both directions', async () => {
  const { playerLaneAfterAction } = await import('../src/games/mirageRules.js');
  assert.equal(LANE_COUNT, 4);
  assert.equal(LANES[0] + LANES[3], 0);
  assert.equal(LANES[1] + LANES[2], 0);
  for (let lane = 1; lane < LANE_COUNT; lane++) {
    assert.ok(Math.abs(LANES[lane] - LANES[lane - 1] - 2.1) < 1e-10);
  }
  let lane = 0;
  for (const expected of [1, 2, 3, 3]) {
    lane = playerLaneAfterAction(lane, 'right', 0);
    assert.equal(lane, expected);
  }
  for (const expected of [2, 1, 0, 0]) {
    lane = playerLaneAfterAction(lane, 'left', 0);
    assert.equal(lane, expected);
  }
});

test('seeded courses agree and populate the fourth lane in every pattern', () => {
  const next = createCourse(seededRandom(42));
  const other = createCourse(seededRandom(42));
  const fourthLanePatterns = new Set();
  const barrierStarts = new Set();
  let fourthLaneGate = false;
  for (let i = 0; i < 1000; i++) {
    const row = next();
    assert.deepEqual(row, other());
    for (const item of row.items) {
      if ((item.lanes || [item.lane]).includes(3)) fourthLanePatterns.add(row.pattern);
      if (item.kind === 'barrier') barrierStarts.add(item.lane);
    }
    if (row.pattern === 'trail') assert.deepEqual(row.items.map(item => item.lane), [0, 1, 2, 3]);
    if (row.pattern === 'gate' && row.items.some(item => item.kind === 'crystal' && item.lane === 3)) fourthLaneGate = true;
  }
  assert.equal(fourthLanePatterns.size, 5);
  assert.deepEqual([...barrierStarts].sort(), [0, 1, 2]);
  assert.ok(fourthLaneGate);
});

test('NPC can use the fourth lane, collect its gems and jump its barriers', async () => {
  const { planNpcLane } = await import('../src/games/mirageRules.js');
  const gate = [0, 1, 2].map(lane => ({ kind: 'cactus', lane }));
  gate.push({ kind: 'crystal', lane: 3, tier: 2 });
  const plan = planNpcLane(gate, 1);
  assert.equal(plan.lane, 3);
  assert.equal(plan.jump, false);
  const jump = [
    { kind: 'cactus', lane: 0 }, { kind: 'cactus', lane: 1 },
    { kind: 'barrier', lane: 2, lanes: [2, 3] },
    { kind: 'crystal', lane: 3, tier: 2, raised: true },
  ];
  assert.equal(planNpcLane(jump, 1).lane, 3);
  assert.equal(planNpcLane(jump, 1).jump, true);
});

test('special items stay out of the Ruée: only duel and online carry them', async () => {
  const { powerUpsEnabled, rollPowerUpForMode, POWER_UP_MODES } = await import('../src/games/mirageRules.js');
  assert.deepEqual([...POWER_UP_MODES], ['duel', 'online']);
  assert.equal(powerUpsEnabled('rush'), false);
  assert.equal(powerUpsEnabled('duel'), true);
  assert.equal(powerUpsEnabled('online'), true);
  // A mode the game does not know never grows items either.
  assert.equal(powerUpsEnabled(undefined), false);
  assert.equal(powerUpsEnabled('Rush'), false);
  // Even with a generous roll, the Ruée track yields nothing at any rank.
  let seed = 3;
  const next = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (const rank of [1, 2, 3, 4]) {
    for (let i = 0; i < 2000; i++) assert.equal(rollPowerUpForMode('rush', rank, next), null);
  }
  // The duel (and online) still spawns them, so the gate is not a global off switch.
  let found = 0;
  for (let i = 0; i < 2000; i++) if (rollPowerUpForMode('duel', 4, next)) found += 1;
  assert.ok(found > 0);
});

test('a collected diamond shatters into spread-out shards that settle back to nothing', async () => {
  const { gemBurstShards, gemShardState, gemFlashState, GEM_BURST_DURATION, GEM_BURST_SHARDS } =
    await import('../src/games/mirageRules.js');
  let state = 7;
  const random = () => ((state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const shards = gemBurstShards(GEM_BURST_SHARDS, random);
  assert.equal(shards.length, GEM_BURST_SHARDS);
  for (const shard of shards) {
    const length = Math.hypot(...shard.dir);
    assert.ok(Math.abs(length - 1) < 1e-9, 'shard directions are unit vectors');
    assert.ok(shard.size > 0 && shard.speed > 0);
  }
  // Shards must not all fly the same way: the spread covers both sides and heights.
  assert.ok(shards.some(s => s.dir[0] > 0.3) && shards.some(s => s.dir[0] < -0.3));
  assert.ok(shards.some(s => s.dir[1] > 0.3) && shards.some(s => s.dir[1] < -0.3));

  const [shard] = shards;
  const start = gemShardState(shard, 0, 2);
  assert.deepEqual(start.position.map(v => Math.round(v * 1e6) / 1e6), [0, 0, 0]);
  assert.equal(start.opacity, 1);
  assert.equal(start.done, false);
  const mid = gemShardState(shard, GEM_BURST_DURATION / 2, 2);
  assert.ok(Math.hypot(...mid.position) > 0.3, 'shards travel away from the gem');
  assert.ok(mid.opacity < start.opacity && mid.opacity > 0);
  const end = gemShardState(shard, GEM_BURST_DURATION, 2);
  assert.equal(end.done, true);
  assert.equal(end.opacity, 0);
  // Ages past the burst clamp instead of sending debris to infinity.
  assert.deepEqual(gemShardState(shard, 99, 2).position, end.position);
  // Gold diamonds throw their shards further than cyan ones.
  assert.ok(Math.hypot(...gemShardState(shard, 0.2, 2).position) > Math.hypot(...gemShardState(shard, 0.2, 0).position));

  const flashStart = gemFlashState(0, 0);
  const flashMid = gemFlashState(GEM_BURST_DURATION / 2, 0);
  const flashEnd = gemFlashState(GEM_BURST_DURATION, 0);
  assert.ok(flashMid.scale > flashStart.scale && flashEnd.scale > flashMid.scale);
  assert.ok(flashMid.opacity < flashStart.opacity);
  assert.equal(flashEnd.opacity, 0);
  assert.equal(flashEnd.done, true);
});

test('the red diamond is a gamble: some are cursed and brake the rider instead of boosting it', async () => {
  const rules = await import('../src/games/mirageRules.js');
  const { CRYSTALS, crystalPickupEffect, rollRedTrap, RED_TRAP_TIER, RED_TRAP_CHANCE,
    RED_TRAP_SLOW_DURATION, RED_TRAP_SLOW_FACTOR, DUEL_SPEED_BONUS, SPEED_BOOST_NONE, seededRandom } = rules;

  // Tier 1 is the red diamond now: red channel dominates, points are untouched.
  const red = CRYSTALS[RED_TRAP_TIER];
  assert.equal(red.name, 'Rouge');
  assert.equal(red.value, 150);
  assert.ok((red.color >> 16 & 255) > 200);
  assert.ok((red.color >> 16 & 255) > (red.color >> 8 & 255) * 2);
  assert.ok((red.color >> 16 & 255) > (red.color & 255) * 2);

  const safe = crystalPickupEffect(RED_TRAP_TIER, false);
  assert.equal(safe.trap, false);
  assert.equal(safe.boost.bonus, DUEL_SPEED_BONUS[RED_TRAP_TIER]);
  assert.equal(safe.slowDuration, 0);

  const cursed = crystalPickupEffect(RED_TRAP_TIER, true);
  assert.equal(cursed.trap, true);
  assert.equal(cursed.boost, SPEED_BOOST_NONE);
  assert.equal(cursed.boost.bonus, 0);
  assert.equal(cursed.slowDuration, RED_TRAP_SLOW_DURATION);
  assert.equal(cursed.slowFactor, RED_TRAP_SLOW_FACTOR);
  assert.ok(cursed.slowFactor > 0 && cursed.slowFactor < 1, 'a trap slows the rider, it never stops it');

  // Only the red tier can be cursed: cyan and real gold always pay their boost.
  for (const tier of [0, 2]) {
    const effect = crystalPickupEffect(tier, true);
    assert.equal(effect.trap, false);
    assert.equal(effect.boost.bonus, DUEL_SPEED_BONUS[tier]);
  }

  const random = seededRandom(2024);
  let traps = 0;
  for (let i = 0; i < 4000; i += 1) if (rollRedTrap(random)) traps += 1;
  assert.ok(Math.abs(traps / 4000 - RED_TRAP_CHANCE) < 0.03, `traps ${traps / 4000} close to ${RED_TRAP_CHANCE}`);
});
