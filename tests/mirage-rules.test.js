import test from 'node:test';
import assert from 'node:assert/strict';
import { createCourse, jumpHeight, CRYSTALS } from '../src/games/mirageRules.js';

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
    assert.ok(cacti.length <= 2);
    for (const item of row.items) {
      assert.ok(item.lane >= 0 && item.lane < 3);
      if (item.kind === 'barrier') {
        assert.equal(item.lanes.length, 2);
        assert.equal(item.lanes[1] - item.lanes[0], 1);
        assert.ok(item.lanes.every(l => !cacti.some(c => c.lane === l)));
      }
      if (item.kind === 'crystal') assert.ok(CRYSTALS[item.tier]);
    }
    if (row.pattern === 'jump') {
      assert.equal(cacti.length, 1);
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
  assert.equal(playerLaneAfterAction(2, 'right', 0), 2);
  assert.equal(playerLaneAfterAction(1, 'jump', 0), 1);
  assert.ok(playerLateralPosition(0.6, 2.1, 0.016, 0) > 0.6);
});
