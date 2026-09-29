// Progression & skins for Mirage Rush: XP per run, level curve and rider
// skins unlocked along the way. Pure logic + localStorage, no React, so
// node --test can exercise it directly.

export const PROGRESSION_KEY = 'letsplay_mirage_progression_v1';
export const MAX_LEVEL = 20;

// colors = [coat, mane, cloth, trim, hood], the palette slots used by
// makeExplorer() in MirageWorld. First skin is the default rider.
export const SKINS = [
  { id: 'desert', name: 'Alezan du Désert', level: 1, hint: 'La tenue d’origine', colors: [0xb87948, 0x352638, 0x285e79, 0xffce68, 0xffe3b3] },
  { id: 'oasis', name: 'Oasis', level: 3, hint: 'Vert des palmeraies', colors: [0x3f7d68, 0x183a30, 0x2f7f7a, 0x9ff0c8, 0xdff7ec] },
  { id: 'crepuscule', name: 'Crépuscule', level: 5, hint: 'Roses de fin de journée', colors: [0x8a5a72, 0x2c2138, 0x9c4a7a, 0xffb178, 0x402a4a] },
  { id: 'nuit-alger', name: 'Nuit d’Alger', level: 8, hint: 'Bleu profond & argent', colors: [0x35507a, 0x141d33, 0xdde4ef, 0x7fd2e8, 0x20304f] },
  // Indigo/violet: rival-inspired but distinguishable from L'Ombre's red saddle in duel.
  { id: 'ombre', name: 'L’Ombre', level: 11, hint: 'Le double du rival', colors: [0x3a3350, 0xb9c2c9, 0x7c4fb3, 0x63d9d0, 0x2b2436] },
  { id: 'soleil-noir', name: 'Soleil Noir', level: 14, hint: 'Or sur noir royal', colors: [0x241f26, 0x0e0b10, 0x6b4a1f, 0xffd166, 0x3a3040] },
];

/** XP needed to climb from `level` - 1 to `level`. Level 1 is free. */
export function levelCost(level) {
  if (level <= 1) return 0;
  return 150 + 100 * (level - 2);
}

/** Cumulative XP required to reach `level` (level 1 => 0). */
export function xpToReachLevel(level) {
  let total = 0;
  for (let current = 2; current <= Math.min(level, MAX_LEVEL); current += 1) total += levelCost(current);
  return total;
}

export function levelForXp(xp) {
  const safe = Math.max(0, Number(xp) || 0);
  let level = 1;
  while (level < MAX_LEVEL && safe >= xpToReachLevel(level + 1)) level += 1;
  return level;
}

/** Progress inside the current level: { level, into, need, percent, next }. */
export function levelProgress(xp) {
  const safe = Math.max(0, Number(xp) || 0);
  const level = levelForXp(safe);
  if (level >= MAX_LEVEL) return { level, into: 0, need: 0, percent: 100, next: null };
  const need = levelCost(level + 1);
  const into = safe - xpToReachLevel(level);
  return { level, into, need, percent: Math.min(100, Math.round((into / need) * 100)), next: level + 1 };
}

/** XP awarded for one finished run (rush, duel or online). */
export function xpForRun(result = {}) {
  const score = Math.max(0, Number(result.score) || 0);
  const gems = Math.max(0, Number(result.gems) || 0);
  let xp = Math.round(score / 25) + gems * 3;
  if (result.mode === 'duel') xp += result.won ? 150 : 60;
  return xp;
}

export function isSkinUnlocked(skin, level) {
  return Number(level || 1) >= Number(skin?.level || 1);
}

/** Skin equipped by a progress object; always returns a valid SKINS entry. */
export function skinFor(progress) {
  return SKINS.find(skin => skin.id === progress?.skinId) || SKINS[0];
}

export function defaultProgress() {
  return { xp: 0, runs: 0, skinId: SKINS[0].id };
}

/** Clamp stored/loaded data and re-lock skins the XP no longer supports. */
export function sanitizeProgress(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const progress = {
    xp: Math.max(0, Math.floor(Number(source.xp) || 0)),
    runs: Math.max(0, Math.floor(Number(source.runs) || 0)),
    skinId: typeof source.skinId === 'string' ? source.skinId : SKINS[0].id,
  };
  const skin = SKINS.find(entry => entry.id === progress.skinId);
  if (!skin || !isSkinUnlocked(skin, levelForXp(progress.xp))) progress.skinId = SKINS[0].id;
  return progress;
}

/** Record a finished run; returns the new progress plus what changed. */
export function applyRun(progress, result) {
  const current = sanitizeProgress(progress);
  const previousLevel = levelForXp(current.xp);
  const xpGained = xpForRun(result);
  const next = sanitizeProgress({ ...current, xp: current.xp + xpGained, runs: current.runs + 1 });
  const level = levelForXp(next.xp);
  const unlocked = SKINS.filter(skin => isSkinUnlocked(skin, level) && !isSkinUnlocked(skin, previousLevel));
  return { progress: next, xpGained, level, leveledUp: level > previousLevel, unlocked };
}

/** Equip a skin only when its level requirement is met. */
export function equipSkin(progress, skinId) {
  const current = sanitizeProgress(progress);
  const skin = SKINS.find(entry => entry.id === skinId);
  if (!skin || !isSkinUnlocked(skin, levelForXp(current.xp))) return current;
  return { ...current, skinId: skin.id };
}

function defaultStorage() {
  try { return typeof window !== 'undefined' ? window.localStorage : null; }
  catch { return null; }
}

export function loadProgress(storage) {
  const store = storage !== undefined ? storage : defaultStorage();
  if (!store) return defaultProgress();
  try { return sanitizeProgress(JSON.parse(store.getItem(PROGRESSION_KEY))); }
  catch { return defaultProgress(); }
}

export function saveProgress(progress, storage) {
  const store = storage !== undefined ? storage : defaultStorage();
  const clean = sanitizeProgress(progress);
  if (store) {
    try { store.setItem(PROGRESSION_KEY, JSON.stringify(clean)); } catch { /* private mode */ }
  }
  return clean;
}
