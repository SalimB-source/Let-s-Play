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
      assert.ok(row.items.some(item => item.kind === 'crystal' && item.raised && item.tier >= 2));
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
  assert.deepEqual(CRYSTALS.map(c => c.value), [100, 150, 200, 250]);
});

test('duel speed is capped, collision can slow down and gems boost equally', async () => {
  const { DUEL_BASE_SPEED, DUEL_SPEED_BONUS, DIAMOND_SPEED_BONUS, duelSpeed, ghostDistance, DUEL_DISTANCE, seededRandom } = await import('../src/games/mirageRules.js');
  assert.deepEqual(DUEL_SPEED_BONUS, [DIAMOND_SPEED_BONUS, DIAMOND_SPEED_BONUS, DIAMOND_SPEED_BONUS, DIAMOND_SPEED_BONUS]);
  assert.equal(duelSpeed(DUEL_BASE_SPEED, DUEL_SPEED_BONUS[3]), DUEL_BASE_SPEED + DIAMOND_SPEED_BONUS);
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
  const { DUEL_DISTANCE } = await import('../src/games/mirageRules.js');
  assert.equal(DUEL_DISTANCE, 800);
  const run = { seed: 42, duration: 40, trace: [0, 100, DUEL_DISTANCE], name: 'Cowboy', stage: 'western' };
  assert.equal(decodeChallenge(encodeChallenge(run)).stage, 'western');
  assert.equal(decodeChallenge(encodeChallenge({ ...run, stage: undefined })).stage, undefined);
});

test('prairie stage is retained in challenge links', async () => {
  const { encodeChallenge, decodeChallenge } = await import('../src/games/duelChallenge.js');
  const { DUEL_DISTANCE } = await import('../src/games/mirageRules.js');
  const run = { seed: 42, duration: 40, trace: [0, 100, DUEL_DISTANCE], name: 'Cavalier', stage: 'prairie' };
  assert.equal(decodeChallenge(encodeChallenge(run)).stage, 'prairie');
});

test('sardinia (Costa Omertà) and japan (Plaines de Yōtei) stages are retained in challenge links and reject unknown stages', async () => {
  const { encodeChallenge, decodeChallenge } = await import('../src/games/duelChallenge.js');
  const { DUEL_DISTANCE } = await import('../src/games/mirageRules.js');
  const run = { seed: 42, duration: 40, trace: [0, 100, DUEL_DISTANCE], name: 'Padrino', stage: 'sardinia' };
  assert.equal(decodeChallenge(encodeChallenge(run)).stage, 'sardinia');
  assert.equal(decodeChallenge(encodeChallenge({ ...run, stage: 'japan' })).stage, 'japan');
  assert.equal(decodeChallenge(encodeChallenge({ ...run, stage: 'atlantis' })).stage, undefined);
});

test('alger (Alger la Blanche) stage is retained in challenge links and online rooms', async () => {
  const { encodeChallenge, decodeChallenge } = await import('../src/games/duelChallenge.js');
  const run = { seed: 42, duration: 40, trace: [0, 100, 800], name: 'Casbah', stage: 'alger' };
  assert.equal(decodeChallenge(encodeChallenge(run)).stage, 'alger');
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

test('special items charge costs and definition are properly configured', async () => {
  const { POWER_UP_CHARGE_COST, POWER_UPS, POWER_UP_MAX_CHARGES, DIAMOND_CHARGE_VALUE, DIAMOND_POWER_CHARGE, POWER_BOOST_DURATION, POWER_BOOST_BONUS } = await import('../src/games/mirageRules.js');
  assert.equal(POWER_UP_CHARGE_COST[POWER_UPS.SHIELD], 10);
  assert.equal(POWER_UP_CHARGE_COST[POWER_UPS.LASSO], 10);
  assert.equal(POWER_UP_CHARGE_COST[POWER_UPS.PISTOL], 12, 'Pistol takes more diamonds to charge than shield, lasso, and boost');
  assert.equal(POWER_UP_CHARGE_COST[POWER_UPS.BOOST], 10);
  assert.equal(POWER_BOOST_DURATION, 3);
  assert.ok(POWER_BOOST_BONUS > 0);
  assert.equal(POWER_UP_MAX_CHARGES, 3);
  assert.deepEqual(DIAMOND_CHARGE_VALUE, [2, 2, 2, 2]);
  // Blue (0) -> Shield only; Red (1) -> Pistol only; Green (2) -> Boost only; Yellow/Gold (3) -> Lasso only
  assert.deepEqual(DIAMOND_POWER_CHARGE[0], { shield: 2, lasso: 0, pistol: 0, boost: 0 });
  assert.deepEqual(DIAMOND_POWER_CHARGE[1], { shield: 0, lasso: 0, pistol: 2, boost: 0 });
  assert.deepEqual(DIAMOND_POWER_CHARGE[2], { shield: 0, lasso: 0, pistol: 0, boost: 2 });
  assert.deepEqual(DIAMOND_POWER_CHARGE[3], { shield: 0, lasso: 2, pistol: 0, boost: 0 });
  
  const { rollPowerUpForMode } = await import('../src/games/mirageRules.js');
  let seed = 3;
  const next = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  // Items are charged by diamonds, never found on the road
  for (const mode of ['rush', 'duel', 'online']) {
    for (const rank of [1, 2, 3, 4]) {
      for (let i = 0; i < 50; i++) assert.equal(rollPowerUpForMode(mode, rank, next), null);
    }
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

test('power-ups are enabled in duel and online modes only (removed from rush mode) and not on the road', async () => {
  const { powerUpsEnabled, rollPowerUpForMode } = await import('../src/games/mirageRules.js');
  assert.equal(powerUpsEnabled('rush'), false);
  assert.equal(powerUpsEnabled('duel'), true);
  assert.equal(powerUpsEnabled('online'), true);
  
  // Power ups are not found on the road in any mode
  let seed = 3;
  const next = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (const mode of ['rush', 'duel', 'online']) {
    for (const rank of [1, 2, 3, 4]) {
      for (let i = 0; i < 50; i++) assert.equal(rollPowerUpForMode(mode, rank, next), null);
    }
  }
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

test('diamonds give speed boost without traps, green diamond gives 200 points', async () => {
  const rules = await import('../src/games/mirageRules.js');
  const { CRYSTALS, crystalPickupEffect, DUEL_SPEED_BONUS } = rules;

  // Green diamond is between Red and Gold
  const green = CRYSTALS[2];
  assert.equal(green.name, 'Verte');
  assert.equal(green.value, 200);

  const red = CRYSTALS[1];
  assert.equal(red.name, 'Rouge');
  assert.equal(red.value, 150);

  const gold = CRYSTALS[3];
  assert.equal(gold.name, 'Or');
  assert.equal(gold.value, 250);

  assert.ok(green.value > red.value && green.value < gold.value, 'Green is worth more than red and less than gold');

  for (let tier = 0; tier < CRYSTALS.length; tier += 1) {
    const effect = crystalPickupEffect(tier);
    assert.equal(effect.trap, false, 'traps are removed');
    assert.equal(effect.boost.bonus, DUEL_SPEED_BONUS[tier]);
    assert.equal(effect.slowDuration, 0);
  }
});

test('pistol odds follow the race position, the shot rider stays down for 2 seconds before remounting, and taken diamonds reappear after 0.5s', async () => {
  const { powerUpOdds, stunPose, nearestRider, PISTOL_STUN_DURATION, GEM_RESPAWN_DELAY, markGemTaken, isGemHidden } = await import('../src/games/mirageRules.js');
  assert.deepEqual([1, 2, 3, 4].map(rank => powerUpOdds(rank).pistol), [0, 0.05, 0.15, 0.3]);
  assert.equal(PISTOL_STUN_DURATION, 2);
  assert.deepEqual(stunPose(0), { x: 0, y: 0, roll: 0, pitch: 0 });
  assert.ok(stunPose(1.2).y < -0.9); // on the sand
  assert.ok(stunPose(0.6).y < -0.9); // still on the sand before remounting
  assert.ok(Math.abs(stunPose(0.001).y) < 0.05); // back in the saddle
  assert.equal(nearestRider(100, [{ id: 'a', distance: 130 }, { id: 'b', distance: 92 }]).id, 'b');
  assert.equal(nearestRider(100, []), null);

  // Taken diamonds disappear for 0.5s and then reappear
  assert.equal(GEM_RESPAWN_DELAY, 0.5);
  const cooldowns = new Map();
  markGemTaken(cooldowns, '4:2', 10.0);
  assert.equal(isGemHidden(cooldowns, '4:2', 10.0), true);
  assert.equal(isGemHidden(cooldowns, '4:2', 10.49), true);
  assert.equal(isGemHidden(cooldowns, '4:2', 10.5), false);
  assert.equal(cooldowns.has('4:2'), false);
});

test('each diamond color charges its dedicated power-up (blue=shield, yellow=lasso, red=pistol, green=boost) and using one does not discharge the others', async () => {
  const {
    POWER_UPS,
    POWER_UP_CHARGE_COST,
    createPowerUpState,
    chargePowerUps,
    consumePowerUp,
    powerUpHudState,
  } = await import('../src/games/mirageRules.js');

  assert.equal(POWER_UP_CHARGE_COST[POWER_UPS.SHIELD], 10);
  assert.equal(POWER_UP_CHARGE_COST[POWER_UPS.LASSO], 10);
  assert.equal(POWER_UP_CHARGE_COST[POWER_UPS.PISTOL], 12);
  assert.equal(POWER_UP_CHARGE_COST[POWER_UPS.BOOST], 10);

  let state = createPowerUpState();

  // 1. Blue diamond (tier 0) charges ONLY Shield (+2)
  state = chargePowerUps(state, 0).state;
  assert.equal(powerUpHudState(state).shieldChargePoints, 2);
  assert.equal(powerUpHudState(state).lassoChargePoints, 0);
  assert.equal(powerUpHudState(state).pistolChargePoints, 0);
  assert.equal(powerUpHudState(state).boostChargePoints, 0);

  // 2. Yellow/Gold diamond (tier 3) charges ONLY Lasso (+2)
  state = chargePowerUps(state, 3).state;
  assert.equal(powerUpHudState(state).shieldChargePoints, 2);
  assert.equal(powerUpHudState(state).lassoChargePoints, 2);
  assert.equal(powerUpHudState(state).pistolChargePoints, 0);
  assert.equal(powerUpHudState(state).boostChargePoints, 0);

  // 3. Red diamond (tier 1) charges ONLY Pistol (+2)
  state = chargePowerUps(state, 1).state;
  assert.equal(powerUpHudState(state).shieldChargePoints, 2);
  assert.equal(powerUpHudState(state).lassoChargePoints, 2);
  assert.equal(powerUpHudState(state).pistolChargePoints, 2);
  assert.equal(powerUpHudState(state).boostChargePoints, 0);

  // 4. Green diamond (tier 2) charges ONLY Boost (+2), and NO LONGER charges the other powers
  state = chargePowerUps(state, 2).state;
  assert.equal(powerUpHudState(state).shieldChargePoints, 2);
  assert.equal(powerUpHudState(state).lassoChargePoints, 2);
  assert.equal(powerUpHudState(state).pistolChargePoints, 2);
  assert.equal(powerUpHudState(state).boostChargePoints, 2);

  // Collect 4 more Green diamonds (+8 -> 10): Boost becomes ready! Shield, Lasso and Pistol stay at 2
  state = chargePowerUps(state, 2).state;
  state = chargePowerUps(state, 2).state;
  state = chargePowerUps(state, 2).state;
  const boostReadyStep = chargePowerUps(state, 2);
  state = boostReadyStep.state;
  assert.deepEqual(boostReadyStep.charged, [POWER_UPS.BOOST]);
  const hudBoostReady = powerUpHudState(state);
  assert.equal(hudBoostReady.boostCharges, 1);
  assert.equal(hudBoostReady.boostProgress, 1);
  assert.equal(hudBoostReady.shieldCharges, 0);
  assert.equal(hudBoostReady.shieldChargePoints, 2);
  assert.equal(hudBoostReady.lassoCharges, 0);
  assert.equal(hudBoostReady.lassoChargePoints, 2);
  assert.equal(hudBoostReady.pistolCharges, 0);
  assert.equal(hudBoostReady.pistolChargePoints, 2);
  assert.equal(hudBoostReady.anyPowerReady, true);

  // Using Boost resets ONLY Boost back to 0 and preserves Shield, Lasso and Pistol at 2
  const usedBoost = consumePowerUp(state, POWER_UPS.BOOST);
  assert.equal(usedBoost.used, true);
  assert.equal(usedBoost.state.boostCharges, 0);
  assert.equal(usedBoost.state.boostChargePoints, 0);
  assert.equal(usedBoost.state.shieldChargePoints, 2);
  assert.equal(usedBoost.state.lassoChargePoints, 2);
  assert.equal(usedBoost.state.pistolChargePoints, 2);
});

test('duel mode has 3 AI rivals that spread across lanes and use their powers when charged', async () => {
  const {
    DUEL_RIVALS,
    DUEL_RIVAL_COUNT,
    POWER_UPS,
    planNpcLane,
    createPowerUpState,
    chargePowerUps,
    chooseNpcPowerAction,
    consumePowerUp,
  } = await import('../src/games/mirageRules.js');
  assert.equal(DUEL_RIVAL_COUNT, 3);
  assert.equal(DUEL_RIVALS.length, 3);
  assert.deepEqual(DUEL_RIVALS.map((r) => r.startLane), [0, 2, 3]);
  assert.deepEqual(DUEL_RIVALS.map((r) => r.paletteIndex), [1, 2, 3]);

  // When lane 2 is already occupied by another rival, an NPC on lane 2 prefers an adjacent free lane if safe
  const planWithCrowding = planNpcLane([], 2, [2]);
  assert.notEqual(planWithCrowding.lane, 2);

  // Charge an NPC's Lasso with 5 yellow diamonds (tier 3)
  let npcPower = createPowerUpState();
  for (let i = 0; i < 5; i += 1) npcPower = chargePowerUps(npcPower, 3).state;
  assert.equal(npcPower.lassoCharges, 1);

  const npc = { dist: 120, stunTimer: 0, powerCooldown: 0, shieldActive: false, powerState: npcPower };
  const decision = chooseNpcPowerAction(npc, [
    { kind: 'player', id: 'player', dist: 135 },
    { kind: 'rival', id: 'sauge', dist: 110 },
  ]);
  assert.equal(decision.type, POWER_UPS.LASSO);
  assert.equal(decision.target.id, 'player');

  // After the NPC uses its Lasso, only Lasso resets to 0
  const afterUse = consumePowerUp(npc.powerState, decision.type);
  assert.equal(afterUse.used, true);
  assert.deepEqual(afterUse.state, createPowerUpState());

  // Charge an NPC's Boost with 5 green diamonds (tier 2)
  let npcBoostPower = createPowerUpState();
  for (let i = 0; i < 5; i += 1) npcBoostPower = chargePowerUps(npcBoostPower, 2).state;
  assert.equal(npcBoostPower.boostCharges, 1);
  const boostDecision = chooseNpcPowerAction(
    { dist: 120, stunTimer: 0, powerCooldown: 0, shieldActive: false, powerBoostTimer: 0, powerState: npcBoostPower },
    [{ kind: 'player', id: 'player', dist: 110 }]
  );
  assert.equal(boostDecision.type, POWER_UPS.BOOST);

  // Lasso and Pistol cannot be used backwards (when all candidates are behind)
  let npcLassoAndPistol = createPowerUpState();
  for (let i = 0; i < 5; i += 1) npcLassoAndPistol = chargePowerUps(npcLassoAndPistol, 3).state; // Lasso
  for (let i = 0; i < 6; i += 1) npcLassoAndPistol = chargePowerUps(npcLassoAndPistol, 1).state; // Pistol
  assert.equal(npcLassoAndPistol.lassoCharges, 1);
  assert.equal(npcLassoAndPistol.pistolCharges, 1);
  const behindDecision = chooseNpcPowerAction(
    { dist: 150, stunTimer: 0, powerCooldown: 0, shieldActive: false, powerBoostTimer: 0, powerState: npcLassoAndPistol },
    [
      { kind: 'player', id: 'player', dist: 140 },
      { kind: 'rival', id: 'sauge', dist: 120 },
    ]
  );
  assert.equal(behindDecision, null);
});

test('power-up shortcuts assign E to Boost (Turbo) and R to Pistol (Tir)', async () => {
  const { POWER_UPS, POWER_UP_DEFS } = await import('../src/games/mirageRules.js');
  assert.equal(POWER_UP_DEFS[POWER_UPS.SHIELD].keyHintPC, 'Q / A');
  assert.equal(POWER_UP_DEFS[POWER_UPS.LASSO].keyHintPC, 'W / Z');
  assert.equal(POWER_UP_DEFS[POWER_UPS.BOOST].keyHintPC, 'E');
  assert.equal(POWER_UP_DEFS[POWER_UPS.PISTOL].keyHintPC, 'R');
});

test('all four special items (shield, lasso, boost, pistol) have dedicated vector power icons and metadata', async () => {
  const { POWER_UPS } = await import('../src/games/mirageRules.js');
  const { MIRAGE_POWER_ICONS, miragePowerIcon } = await import('../src/games/miragePowerIcons.js');

  for (const type of [POWER_UPS.SHIELD, POWER_UPS.LASSO, POWER_UPS.BOOST, POWER_UPS.PISTOL]) {
    const icon = miragePowerIcon(type);
    assert.ok(MIRAGE_POWER_ICONS[type], `icon registered for ${type}`);
    assert.equal(icon.id, type);
    assert.ok(icon.src.endsWith(`/icons/mirage-rush/${type}.svg`), `expected ${type}.svg asset, got ${icon.src}`);
    assert.ok(icon.alt && icon.alt.length > 10, `accessible alt description for ${type}`);
    assert.ok(icon.label && icon.accent && icon.gemColor, `label, accent, and gemColor defined for ${type}`);
  }
});

test('prairieSunsetState transitions progressively from golden hour to starry night and sinks the sun below the horizon', async () => {
  const { prairieSunsetState } = await import('../src/games/mirageRules.js');
  const start = prairieSunsetState(0);
  const mid = prairieSunsetState(0.5);
  const end = prairieSunsetState(1);

  assert.ok(start.sunElevation > 0, 'sun starts above the horizon');
  assert.equal(start.sunVisible, true);
  assert.equal(start.starAlpha, 0);

  assert.ok(mid.sunElevation < start.sunElevation, 'sun sinks progressively');
  assert.ok(end.sunElevation < -8, 'sun disappears completely below the horizon at the end');
  assert.equal(end.sunVisible, false);
  assert.equal(end.starAlpha, 1);

  // Sky and lighting darken as night falls
  assert.ok(end.skyTop[0] < start.skyTop[0] && end.skyTop[1] < start.skyTop[1]);
  assert.ok(end.sunIntensity < start.sunIntensity);
  assert.ok(end.hemiIntensity < start.hemiIntensity);
});



