import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_LEVEL, PROGRESSION_KEY, SKINS, applyRun, defaultProgress, equipSkin,
  isSkinUnlocked, levelCost, levelForXp, levelProgress, loadProgress,
  sanitizeProgress, saveProgress, skinFor, xpForRun, xpToReachLevel,
} from '../src/games/mirageProgression.js';

test('level curve is strictly increasing and levelForXp flips exactly on thresholds', () => {
  assert.equal(xpToReachLevel(1), 0);
  let previous = 0;
  for (let level = 2; level <= MAX_LEVEL; level += 1) {
    assert.ok(levelCost(level) > 0);
    const cumulative = xpToReachLevel(level);
    assert.ok(cumulative > previous, `cumulative XP must grow at level ${level}`);
    assert.equal(levelForXp(cumulative), level);
    assert.equal(levelForXp(cumulative - 1), level - 1);
    previous = cumulative;
  }
  assert.equal(levelForXp(-50), 1);
  assert.equal(levelForXp(Number.MAX_SAFE_INTEGER), MAX_LEVEL);
});

test('levelProgress reports in-level XP with a capped percentage', () => {
  const first = levelProgress(0);
  assert.equal(first.level, 1);
  assert.equal(first.into, 0);
  assert.equal(first.need, levelCost(2));
  assert.equal(first.percent, 0);
  const halfway = levelProgress(Math.floor(levelCost(2) / 2));
  assert.equal(halfway.level, 1);
  assert.equal(halfway.percent, 50);
  const maxed = levelProgress(xpToReachLevel(MAX_LEVEL) + 10_000);
  assert.equal(maxed.level, MAX_LEVEL);
  assert.equal(maxed.next, null);
  assert.equal(maxed.percent, 100);
});

test('xpForRun rewards score, gems and duel wins, and never goes negative', () => {
  assert.equal(xpForRun({}), 0);
  assert.equal(xpForRun({ score: -1000, gems: -5 }), 0);
  const rush = xpForRun({ mode: 'rush', score: 5000, gems: 20 });
  assert.equal(rush, 26);
  assert.equal(xpForRun({ mode: 'online', score: 5000, gems: 20 }), 26);
  assert.equal(levelForXp(rush), 1);
  const duelLoss = xpForRun({ mode: 'duel', score: 5000, gems: 20 });
  const duelWin = xpForRun({ mode: 'duel', score: 5000, gems: 20, won: true });
  assert.ok(duelWin > duelLoss);
  assert.equal(duelWin - duelLoss, 9);
  assert.ok(xpForRun({ mode: 'rush', score: 6000, gems: 20 }) > rush);
});

test('applyRun accumulates XP and runs, and unlocks skins exactly at their level', () => {
  let progress = defaultProgress();
  const first = applyRun(progress, { mode: 'rush', score: 2500, gems: 10 });
  assert.equal(first.progress.runs, 1);
  assert.equal(first.progress.xp, first.xpGained);
  assert.equal(first.level, levelForXp(first.progress.xp));
  progress = first.progress;

  // Pump enough XP to cross several unlock thresholds.
  const pumped = applyRun(progress, { mode: 'duel', score: 1_000_000, gems: 100, won: true });
  assert.ok(pumped.xpGained > 0);
  assert.equal(pumped.progress.runs, 2);
  assert.ok(pumped.level >= 5);
  const unlockedIds = pumped.unlocked.map(skin => skin.id);
  assert.ok(unlockedIds.includes('oasis'));
  assert.ok(unlockedIds.includes('crepuscule'));
  for (const skin of SKINS) assert.equal(isSkinUnlocked(skin, pumped.level), pumped.level >= skin.level);

  // A second huge run must not re-announce skins already owned.
  const again = applyRun(pumped.progress, { mode: 'duel', score: 1_000_000, gems: 100, won: true });
  for (const skin of again.unlocked) assert.ok(!unlockedIds.includes(skin.id), `${skin.id} must unlock only once`);
});

test('equipSkin enforces the level gate', () => {
  const locked = SKINS[SKINS.length - 1];
  const start = defaultProgress();
  assert.equal(equipSkin(start, locked.id).skinId, start.skinId, 'locked skin must be refused');
  const rich = { ...start, xp: xpToReachLevel(locked.level) };
  assert.equal(equipSkin(rich, locked.id).skinId, locked.id);
  assert.equal(equipSkin(rich, 'does-not-exist').skinId, start.skinId, 'unknown ids fall back');
});

test('sanitizeProgress clamps bad data and re-locks skins the XP cannot afford', () => {
  assert.deepEqual(sanitizeProgress(null), defaultProgress());
  assert.deepEqual(sanitizeProgress('garbage'), defaultProgress());
  const negative = sanitizeProgress({ xp: -900, runs: -3, skinId: 42 });
  assert.deepEqual(negative, defaultProgress());
  const cheated = sanitizeProgress({ xp: 0, runs: 5, skinId: 'soleil-noir' });
  assert.equal(cheated.skinId, SKINS[0].id, 'stored skin re-locked when XP is too low');
  assert.equal(cheated.runs, 5);
  const legit = sanitizeProgress({ xp: xpToReachLevel(14), runs: 12, skinId: 'soleil-noir' });
  assert.equal(legit.skinId, 'soleil-noir');
  assert.equal(levelForXp(legit.xp), 14);
});

test('skinFor always resolves to a real skin', () => {
  assert.equal(skinFor({ skinId: 'oasis' }).id, 'oasis');
  assert.equal(skinFor({ skinId: 'unknown' }).id, SKINS[0].id);
  assert.equal(skinFor(null).id, SKINS[0].id);
});

test('progression round-trips through storage and survives corrupted JSON', () => {
  const store = new Map();
  const fake = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  const saved = saveProgress({ xp: 750, runs: 4, skinId: 'oasis' }, fake);
  assert.equal(saved.skinId, 'oasis');
  assert.equal(store.has(PROGRESSION_KEY), true);
  assert.deepEqual(loadProgress(fake), saved);
  assert.deepEqual(loadProgress({ getItem: () => '{oops' }), defaultProgress());
  assert.deepEqual(loadProgress(null), defaultProgress());
});
