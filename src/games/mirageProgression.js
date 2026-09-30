// Progression & skins for Mirage Rush: XP per run, level curve and rider
// skins unlocked along the way. Pure logic + localStorage, no React, so
// node --test can exercise it directly.

export const PROGRESSION_KEY = 'letsplay_mirage_progression_v1';
export const MAX_LEVEL = 20;

// colors = [coat, mane, cloth, trim, head, hat, markings], the palette slots
// used by makeExplorer() in mirageExplorer.js. `markings` paints the blaze
// (liste) and socks (balzanes); set it equal to the coat for a plain horse.
// `horse` / `hat` are short labels shown in the « TON CAVALIER » cards.
// First skin is the default rider.
export const SKINS = [
  { id: 'desert', name: 'Alezan du Désert', level: 1, hint: 'La tenue d’origine', horse: 'Alezan', hat: 'Cuir',
    colors: [0xb0642e, 0x3b2216, 0x285e79, 0xffce68, 0xffe3b3, 0x6b3f1f, 0xf3ece0] },
  { id: 'oasis', name: 'Oasis', level: 3, hint: 'Blanc des palmeraies', horse: 'Blanc', hat: 'Blanc',
    colors: [0xeeeae1, 0xb8b0a2, 0x2f7f5a, 0x9ff0c8, 0xdff7ec, 0xfbf8f1, 0xeeeae1] },
  { id: 'crepuscule', name: 'Crépuscule', level: 5, hint: 'Bai & chapeau sable', horse: 'Bai', hat: 'Sable',
    colors: [0x6a3a20, 0x17110f, 0x9c4a7a, 0xffb178, 0x402a4a, 0xe6d3b5, 0xf0e6d6] },
  { id: 'nuit-alger', name: 'Nuit d’Alger', level: 8, hint: 'Gris pommelé & marine', horse: 'Gris', hat: 'Marine',
    colors: [0x8d96a3, 0x1a2233, 0xdde4ef, 0x7fd2e8, 0x20304f, 0x1f2d4d, 0x8d96a3] },
  // Black horse + violet cloth: rival-inspired but distinct from L'Ombre's red saddle in duel.
  { id: 'ombre', name: 'L’Ombre', level: 11, hint: 'Moreau aux balzanes', horse: 'Noir', hat: 'Noir',
    colors: [0x1c1b21, 0xc9d0d6, 0x7c4fb3, 0x63d9d0, 0x2b2436, 0x121016, 0xe8ecef] },
  { id: 'soleil-noir', name: 'Soleil Noir', level: 14, hint: 'Palomino, tenue noire', horse: 'Palomino', hat: 'Noir',
    colors: [0xd6a13f, 0xf6e7c1, 0x1e1920, 0xffd166, 0x3a3040, 0x0e0b10, 0xd6a13f] },
  { id: 'neige', name: 'Étoile des Neiges', level: 17, hint: 'Tout de blanc vêtu', horse: 'Blanc', hat: 'Blanc',
    colors: [0xf5f3ee, 0xd8d2c6, 0x9cc3e0, 0xe8f1f8, 0xf1e6d6, 0xffffff, 0xf5f3ee] },
  { id: 'mustang', name: 'Mustang Sauvage', level: 20, hint: 'Isabelle, bottes noires', horse: 'Isabelle', hat: 'Brun',
    colors: [0xc3a36f, 0x1b1511, 0xa8322d, 0xf0d7a1, 0x5a3a24, 0x4a2c17, 0x1b1511] },
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
  // Ten times slower progression; existing XP and unlocks are preserved.
  return Math.floor(xp / 10);
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
