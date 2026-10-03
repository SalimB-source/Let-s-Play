// Progression & skins for Mirage Rush: XP per run, level curve, rider skins
// unlocked along the way, gold coins on victories and a shop for paid skins.
// Pure logic + localStorage, no React, so node --test can exercise it directly.
import { CHARACTER_PALETTES, CHARACTER_PRICES, CLOUD_CHOCOBO_INDEX, GYRO_ZEPPELI_INDEX } from './mirageCharacters.js';
import { CUPS, isCupUnlocked } from './mirageCup.js';

export const PROGRESSION_KEY = 'letsplay_mirage_progression_v1';
export const MAX_LEVEL = 20;
/** Gold awarded for finishing 1st (duel, cup race or online). */
export const WIN_COINS = 10;
export const GYRO_ZEPPELI_ID = 'gyro-zeppeli';
export const CLOUD_CHOCOBO_ID = 'cloud-chocobo';
/** Temporary all-player access; set false to restore the stored 280 OR shop gate. */
export const CLOUD_CHOCOBO_TEMPORARILY_FREE = true;

/**
 * Ordre canonique des 10 cartes de Mirage Rush.
 * Les 3 premières (`desert`, `western`, `prairie`) sont ouvertes d’office ;
 * il faut finir les 3 premières en arrivant 1ᵉʳ pour débloquer la 4ᵉ, puis
 * finir la 4ᵉ en arrivant 1ᵉʳ pour débloquer la 5ᵉ, et ainsi de suite jusqu’à
 * la 10ᵉ carte (`snakeway`).
 */
export const STAGE_IDS = [
  'desert',
  'western',
  'prairie',
  'sardinia',
  'alger',
  'japan',
  'ramparts',
  'infinity',
  'airbase',
  'snakeway',
];

export const INITIAL_UNLOCKED_STAGES = 3;

const CUP_IDS = CUPS.map((cup) => cup.id);

/**
 * Cartes à remporter en 1ʳᵉ place pour débloquer `stageId` :
 * - `[]` pour les 3 premières cartes (ouvertes dès le départ) ;
 * - toutes les cartes précédentes `[0 .. index - 1]` à partir de la 4ᵉ ;
 * - `undefined` si l’identifiant est inconnu.
 */
export function stageRequirement(stageId) {
  const index = STAGE_IDS.indexOf(stageId);
  if (index < 0) return undefined;
  if (index < INITIAL_UNLOCKED_STAGES) return [];
  return STAGE_IDS.slice(0, index);
}

/**
 * La carte `stageId` est-elle débloquée ?
 * Seules les 3 premières cartes sont accessibles d’office. Pour débloquer la
 * 4ᵉ (`sardinia`), il faut avoir fini chacune des 3 premières en 1ʳᵉ place ;
 * pour la 5ᵉ (`alger`), avoir aussi fini la 4ᵉ en 1ʳᵉ place, et ainsi de suite.
 */
export function isStageUnlocked(stageId, wonStages = []) {
  const index = STAGE_IDS.indexOf(stageId);
  if (index < 0) return false;
  if (index < INITIAL_UNLOCKED_STAGES) return true;
  const won = new Set(Array.isArray(wonStages) ? wonStages : []);
  return STAGE_IDS.slice(0, index).every((id) => won.has(id));
}

/** Liste des identifiants de cartes actuellement débloquées, dans l’ordre. */
export function unlockedStages(wonStages = []) {
  return STAGE_IDS.filter((id) => isStageUnlocked(id, wonStages));
}

/** Un résultat de course correspond-il à une 1ʳᵉ place ? */
export function isFirstPlaceRun(result) {
  if (!result || typeof result !== 'object') return false;
  if (result.won === true) return true;
  if (result.won === false) return false;
  return Number(result.rank) === 1;
}

// colors = [coat, mane, cloth, trim, head, hat, markings], the palette slots
// used by makeExplorer() in mirageExplorer.js. `markings` paints the blaze
// (liste) and socks (balzanes); set it equal to the coat for a plain horse.
// `horse` / `hat` are short mount / headwear labels shown in the rider cards.
// First skin is the default rider. Skins with `price` are bought in the shop,
// not unlocked with XP.
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
  // Palette already created in mirageCharacters.js (Gyro Zeppeli).
  { id: GYRO_ZEPPELI_ID, name: 'Gyro Zeppeli', level: 1, price: CHARACTER_PRICES[GYRO_ZEPPELI_INDEX] || 200,
    hint: 'Steel balls vertes & lunettes', horse: 'Palomino', hat: 'Fedora', accessory: 'Steel balls',
    colors: [...CHARACTER_PALETTES[GYRO_ZEPPELI_INDEX]] },
  // Cloud en tenue bleue, monté sur un chocobo d’or, avec sa gigantesque épée.
  { id: CLOUD_CHOCOBO_ID, name: 'Cloud & son Chocobo', level: 1, price: CHARACTER_PRICES[CLOUD_CHOCOBO_INDEX] || 280,
    hint: 'Épée broyeuse & chocobo doré', horse: 'Chocobo', hat: 'Épis blonds', accessory: 'Épée broyeuse',
    mountIcon: '🐤', headLabel: 'Cheveux hérissés', accessoryIcon: '⚔',
    colors: [...CHARACTER_PALETTES[CLOUD_CHOCOBO_INDEX]] },
];

export const SHOP_SKINS = SKINS.filter((skin) => Number(skin.price) > 0);

export function isShopSkin(skin) {
  return Number(skin?.price) > 0;
}

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

/** Gold awarded for a finished run: 10 OR on a victory (1st place). */
export function coinsForRun(result = {}) {
  if (result?.won === true) return WIN_COINS;
  if (result?.mode && result.mode !== 'rush' && Number(result.rank) === 1) return WIN_COINS;
  return 0;
}

/**
 * Credit a separate gold adjustment if a future reward needs one. Returns the
 * updated progress and the gold actually added (0 for a null, negative or
 * unreadable amount, so a bad call can never drain the wallet).
 */
export function awardCoins(progress, amount) {
  const current = sanitizeProgress(progress);
  const coinsGained = Math.max(0, Math.floor(Number(amount) || 0));
  if (coinsGained === 0) return { progress: current, coinsGained: 0 };
  return {
    progress: sanitizeProgress({ ...current, coins: current.coins + coinsGained }),
    coinsGained,
  };
}

/** Level skins use XP; shop skins use ownership unless a temporary unlock is active. */
export function isSkinUnlocked(skin, level, ownedSkins = []) {
  if (skin?.id === CLOUD_CHOCOBO_ID && CLOUD_CHOCOBO_TEMPORARILY_FREE) return true;
  if (isShopSkin(skin)) return Array.isArray(ownedSkins) && ownedSkins.includes(skin.id);
  return Number(level || 1) >= Number(skin?.level || 1);
}

/** Skin equipped by a progress object; always returns a valid SKINS entry. */
export function skinFor(progress) {
  return SKINS.find(skin => skin.id === progress?.skinId) || SKINS[0];
}

export function defaultProgress() {
  return {
    xp: 0,
    runs: 0,
    skinId: SKINS[0].id,
    coins: 0,
    ownedSkins: [],
    wonStages: [],
    completedCups: [],
  };
}

function ownedShopIds(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const valid = new Set(SHOP_SKINS.map((skin) => skin.id));
  return [...new Set(list.filter((id) => typeof id === 'string' && valid.has(id)))];
}

function sanitizeStageIds(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const valid = new Set(list.filter((id) => typeof id === 'string'));
  return STAGE_IDS.filter((id) => valid.has(id));
}

function sanitizeCupIds(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const valid = new Set(list.filter((id) => typeof id === 'string'));
  return CUP_IDS.filter((id) => valid.has(id));
}

/** Clamp stored/loaded data and re-lock skins the XP / shop no longer supports. */
export function sanitizeProgress(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const progress = {
    xp: Math.max(0, Math.floor(Number(source.xp) || 0)),
    runs: Math.max(0, Math.floor(Number(source.runs) || 0)),
    coins: Math.max(0, Math.floor(Number(source.coins) || 0)),
    ownedSkins: ownedShopIds(source.ownedSkins),
    wonStages: sanitizeStageIds(source.wonStages),
    completedCups: sanitizeCupIds(source.completedCups),
    skinId: typeof source.skinId === 'string' ? source.skinId : SKINS[0].id,
  };
  const skin = SKINS.find(entry => entry.id === progress.skinId);
  if (!skin || !isSkinUnlocked(skin, levelForXp(progress.xp), progress.ownedSkins)) progress.skinId = SKINS[0].id;
  return progress;
}

/**
 * Marque la coupe `cupId` comme terminée si elle était déjà débloquée, ce qui
 * débloque séquentiellement la coupe suivante.
 */
export function completeCup(progress, cupId) {
  const current = sanitizeProgress(progress);
  if (typeof cupId !== 'string' || !isCupUnlocked(cupId, current.completedCups)) {
    return { progress: current, ok: false, reason: 'locked', newlyUnlockedCups: [] };
  }
  if (current.completedCups.includes(cupId)) {
    return { progress: current, ok: true, alreadyCompleted: true, newlyUnlockedCups: [] };
  }
  const nextCompletedCups = sanitizeCupIds([...current.completedCups, cupId]);
  const newlyUnlockedCups = CUP_IDS.filter(
    (id) => !isCupUnlocked(id, current.completedCups) && isCupUnlocked(id, nextCompletedCups),
  );
  const next = sanitizeProgress({
    ...current,
    completedCups: nextCompletedCups,
  });
  return { progress: next, ok: true, newlyUnlockedCups };
}

/** Record a finished run; returns the new progress plus what changed. */
export function applyRun(progress, result) {
  const current = sanitizeProgress(progress);
  const previousLevel = levelForXp(current.xp);
  const xpGained = xpForRun(result);
  const coinsGained = coinsForRun(result);

  let nextWonStages = current.wonStages;
  if (
    isFirstPlaceRun(result)
    && typeof result?.stage === 'string'
    && STAGE_IDS.includes(result.stage)
    && isStageUnlocked(result.stage, current.wonStages)
  ) {
    nextWonStages = sanitizeStageIds([...current.wonStages, result.stage]);
  }
  const newlyUnlockedStages = STAGE_IDS.filter(
    (id) => !isStageUnlocked(id, current.wonStages) && isStageUnlocked(id, nextWonStages),
  );

  let nextCompletedCups = current.completedCups;
  if (
    typeof result?.completedCupId === 'string'
    && isCupUnlocked(result.completedCupId, current.completedCups)
  ) {
    nextCompletedCups = sanitizeCupIds([...current.completedCups, result.completedCupId]);
  }
  const newlyUnlockedCups = CUP_IDS.filter(
    (id) => !isCupUnlocked(id, current.completedCups) && isCupUnlocked(id, nextCompletedCups),
  );

  const next = sanitizeProgress({
    ...current,
    xp: current.xp + xpGained,
    runs: current.runs + 1,
    coins: current.coins + coinsGained,
    wonStages: nextWonStages,
    completedCups: nextCompletedCups,
  });
  const level = levelForXp(next.xp);
  const unlocked = SKINS.filter((skin) => (
    !isShopSkin(skin)
    && isSkinUnlocked(skin, level, next.ownedSkins)
    && !isSkinUnlocked(skin, previousLevel, current.ownedSkins)
  ));
  return {
    progress: next,
    xpGained,
    coinsGained,
    level,
    leveledUp: level > previousLevel,
    unlocked,
    newlyUnlockedStages,
    newlyUnlockedCups,
  };
}

/** Equip a skin only when its level / shop requirement is met. */
export function equipSkin(progress, skinId) {
  const current = sanitizeProgress(progress);
  const skin = SKINS.find(entry => entry.id === skinId);
  if (!skin || !isSkinUnlocked(skin, levelForXp(current.xp), current.ownedSkins)) return current;
  return { ...current, skinId: skin.id };
}

/** Buy a shop skin with gold. Auto-equips on success. */
export function buySkin(progress, skinId) {
  const current = sanitizeProgress(progress);
  const skin = SKINS.find((entry) => entry.id === skinId);
  if (!isShopSkin(skin)) return { progress: current, ok: false, reason: 'not-for-sale' };
  if (skin.id === CLOUD_CHOCOBO_ID && CLOUD_CHOCOBO_TEMPORARILY_FREE) {
    return { progress: current, ok: false, reason: 'temporarily-unlocked', skin };
  }
  if (current.ownedSkins.includes(skin.id)) {
    return { progress: current, ok: false, reason: 'owned', skin };
  }
  if (current.coins < skin.price) return { progress: current, ok: false, reason: 'broke', skin };
  const next = sanitizeProgress({
    ...current,
    coins: current.coins - skin.price,
    ownedSkins: [...current.ownedSkins, skin.id],
    skinId: skin.id,
  });
  return { progress: next, ok: true, reason: 'bought', skin };
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
