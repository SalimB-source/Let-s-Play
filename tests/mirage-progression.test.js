import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOUD_CHOCOBO_ID, CLOUD_CHOCOBO_TEMPORARILY_FREE, GYRO_ZEPPELI_ID, MAX_LEVEL, PROGRESSION_KEY, SHOP_SKINS, SKINS, WIN_COINS,
  applyRun, awardCoins, buySkin, coinsForRun, defaultProgress, equipSkin, isShopSkin,
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
  for (const skin of SKINS.filter((entry) => !isShopSkin(entry))) {
    assert.equal(isSkinUnlocked(skin, pumped.level), pumped.level >= skin.level);
  }

  // A second huge run must not re-announce skins already owned.
  const again = applyRun(pumped.progress, { mode: 'duel', score: 1_000_000, gems: 100, won: true });
  for (const skin of again.unlocked) assert.ok(!unlockedIds.includes(skin.id), `${skin.id} must unlock only once`);
});

test('equipSkin enforces the level gate', () => {
  const locked = SKINS.find((skin) => skin.id === 'mustang');
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

test('a victory awards 10 gold and a rush awards none', () => {
  assert.equal(WIN_COINS, 10);
  assert.equal(coinsForRun({}), 0);
  assert.equal(coinsForRun({ mode: 'rush', score: 99999 }), 0);
  assert.equal(coinsForRun({ mode: 'duel', won: false, rank: 2 }), 0);
  assert.equal(coinsForRun({ mode: 'duel', won: true }), WIN_COINS);
  assert.equal(coinsForRun({ mode: 'online', rank: 1 }), WIN_COINS);
  const win = applyRun(defaultProgress(), { mode: 'duel', score: 1000, gems: 4, won: true });
  assert.equal(win.coinsGained, WIN_COINS);
  assert.equal(win.progress.coins, WIN_COINS);
  const loss = applyRun(win.progress, { mode: 'duel', score: 1000, gems: 4, won: false, rank: 3 });
  assert.equal(loss.coinsGained, 0);
  assert.equal(loss.progress.coins, WIN_COINS);
});

test('awardCoins safely adds an external adjustment without draining the wallet', () => {
  const start = { ...defaultProgress(), coins: 12 };
  const adjustment = awardCoins(start, 30);
  assert.equal(adjustment.coinsGained, 30);
  assert.equal(adjustment.progress.coins, 42, 'the separate amount is added to the existing balance');
  assert.equal(start.coins, 12, 'the original progress is not mutated');
  assert.equal(awardCoins(adjustment.progress, 0).coinsGained, 0);
  assert.equal(awardCoins(adjustment.progress, 0).progress.coins, 42);
  assert.equal(awardCoins(adjustment.progress, -40).coinsGained, 0, 'a negative amount adds nothing');
  assert.equal(awardCoins(adjustment.progress, -40).progress.coins, 42);
  assert.equal(awardCoins(adjustment.progress, 'oops').coinsGained, 0);
  assert.equal(awardCoins(undefined, 50).progress.coins, 50, 'missing progress starts from zero');
});

test('Gyro Zeppeli is a shop skin that costs 200 gold', () => {
  const gyro = SKINS.find((skin) => skin.id === GYRO_ZEPPELI_ID);
  assert.ok(gyro, 'Gyro Zeppeli is listed among the skins');
  assert.equal(gyro.price, 200);
  assert.equal(gyro.colors.length, 7);
  assert.ok(SHOP_SKINS.some((skin) => skin.id === GYRO_ZEPPELI_ID));
  const start = defaultProgress();
  assert.equal(isSkinUnlocked(gyro, 20, start.ownedSkins), false, 'XP does not unlock Gyro');
  assert.equal(equipSkin({ ...start, xp: xpToReachLevel(20) }, gyro.id).skinId, start.skinId);
  const broke = buySkin(start, gyro.id);
  assert.equal(broke.ok, false);
  assert.equal(broke.reason, 'broke');
  assert.equal(broke.progress.coins, 0);
  const rich = buySkin({ ...start, coins: 200 }, gyro.id);
  assert.equal(rich.ok, true);
  assert.equal(rich.progress.coins, 0);
  assert.deepEqual(rich.progress.ownedSkins, [GYRO_ZEPPELI_ID]);
  assert.equal(rich.progress.skinId, GYRO_ZEPPELI_ID);
  const again = buySkin(rich.progress, gyro.id);
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'owned');
  const cheated = sanitizeProgress({ xp: 0, coins: 999, skinId: GYRO_ZEPPELI_ID, ownedSkins: [] });
  assert.equal(cheated.skinId, SKINS[0].id, 'unequipped when the shop skin is not owned');
});

test('Cloud is temporarily unlocked for everyone while the 280 OR shop price stays configured', () => {
  const cloud = SKINS.find((skin) => skin.id === CLOUD_CHOCOBO_ID);
  assert.ok(cloud, 'Cloud and his Chocobo remain in the skin catalog');
  assert.equal(cloud.price, 280, 'the normal price remains available for reactivation');
  assert.equal(CLOUD_CHOCOBO_TEMPORARILY_FREE, true);
  assert.equal(cloud.level, 1);
  assert.equal(cloud.colors.length, 7);
  assert.ok(SHOP_SKINS.some((skin) => skin.id === CLOUD_CHOCOBO_ID));

  const start = defaultProgress();
  assert.equal(isSkinUnlocked(cloud, 1, start.ownedSkins), true, 'a new player can use Cloud without paying');
  assert.equal(equipSkin(start, CLOUD_CHOCOBO_ID).skinId, CLOUD_CHOCOBO_ID);
  assert.equal(sanitizeProgress({ ...start, skinId: CLOUD_CHOCOBO_ID }).skinId, CLOUD_CHOCOBO_ID,
    'a saved Cloud selection stays valid without an owned-skin entry');

  const purchaseAttempt = buySkin({ ...start, coins: 500 }, CLOUD_CHOCOBO_ID);
  assert.equal(purchaseAttempt.ok, false, 'temporary access cannot accidentally charge players');
  assert.equal(purchaseAttempt.reason, 'temporarily-unlocked');
  assert.equal(purchaseAttempt.progress.coins, 500);
  assert.deepEqual(purchaseAttempt.progress.ownedSkins, []);
});
