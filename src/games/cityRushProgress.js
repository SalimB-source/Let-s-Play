// Progression persistante de Vice City Rush : portefeuille, garage, ordre des
// parcours et campagne Histoire.
// Les courses restent jouables à partir du premier circuit ; une arrivée normale
// débloque le parcours suivant. Seuls les modes rémunérés versent des billets :
// 1er → 50, 2e → 30, 3e (ou épave, classée dernière) → 10.
// Le garage de départ est offert à tous : la citadine `CITY_RUSH_STARTER_CAR_ID`
// plus les trois voitures les moins puissantes du catalogue
// (`cityRushFreeCarIds`). Les cinq autres se paient en billets verts.
//
// La sauvegarde est une donnée pure (aucun accès DOM en dehors des fonctions de
// stockage) : le jeu la lit et l'écrit dans un cache local par appareil/compte,
// et la copie serveur (`public.vice_city_rush_progress`, voir `viceCityApi.js`)
// suit le joueur d'un appareil à l'autre — même principe que Mirage Rush.
import { CITY_RUSH_CARS, CITY_RUSH_COURSES, cityRushFreeCarIds } from './cityRushRules.js';
import { CITY_RUSH_STORY_CHAPTER_COUNT, CITY_RUSH_STORY_VERSION, mapLegacyStoryChapter } from './cityRushStory.js';

export const CITY_RUSH_PROGRESS_KEY = 'letsplay_vice_city_rush_progress_v1';
export const CITY_RUSH_STARTER_CAR_ID = 'city-hatch';

/** Chapitres du mode Histoire (`CITY_RUSH_STORY_CHAPTERS`, prologue compris). */
export const CITY_RUSH_STORY_CHAPTERS = CITY_RUSH_STORY_CHAPTER_COUNT;
/**
 * Anciennes clés locales du mode Histoire (chapitre + fin choisie), avant que
 * la campagne n'entre dans la sauvegarde : reprises une seule fois par
 * `migrateCityRushLegacyStory`, puis supprimées.
 */
export const CITY_RUSH_LEGACY_STORY_KEY = 'letsplay_vice_city_rush_story_v1';
export const CITY_RUSH_LEGACY_STORY_ENDING_KEY = 'letsplay_vice_city_rush_ending_v1';

/** Fiche de paie du podium : la place (1re, 2e, 3e) indexe le gain en billets. */
export const CITY_RUSH_CASH_BY_PLACE = [50, 30, 10];
// La victoire reste la référence historique du gain par course.
export const CITY_RUSH_CASH_PER_RACE = CITY_RUSH_CASH_BY_PLACE[0];

/** Billets versés selon la place d'arrivée : 1er → 50, 2e → 30, 3e et au-delà → 10. */
export function cityRushCashForPlace(place) {
  const rank = Number(place);
  if (!Number.isFinite(rank) || rank < 1) return 0;
  return CITY_RUSH_CASH_BY_PLACE[Math.min(Math.floor(rank), CITY_RUSH_CASH_BY_PLACE.length) - 1];
}

export function cityRushModePaysCash(modeId) {
  const mode = String(modeId || 'circuit').toLowerCase();
  return mode !== 'sprint' && mode !== 'pursuit';
}

/**
 * Récompense robuste d'une fin de course Vice City Rush.
 *
 * Circuit et Histoire paient au podium. Sprint et Poursuite sont des modes défi :
 * ils peuvent valider le parcours, mais ne versent jamais de billets verts.
 */
export function cityRushCashForRaceResult({ rank = null, modeId = 'circuit', sprint = false, destroyed = false, timedOut = false } = {}) {
  if (timedOut) return 0;
  const normalizedMode = sprint ? 'sprint' : modeId;
  if (!cityRushModePaysCash(normalizedMode)) return 0;
  const normalizedRank = rank ?? (destroyed ? CITY_RUSH_CASH_BY_PLACE.length : 1);
  return cityRushCashForPlace(normalizedRank);
}

const validIdSet = (items) => new Set((Array.isArray(items) ? items : []).map((item) => item?.id).filter(Boolean));
const safeMoney = (value) => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;

/** Retourne toujours une sauvegarde sûre, ordonnée et compatible avec les données du jeu. */
export function normalizeCityRushProgress(value, { cars = CITY_RUSH_CARS, courses = CITY_RUSH_COURSES } = {}) {
  const carIds = validIdSet(cars);
  const courseIds = validIdSet(courses);
  const rawCars = new Set(Array.isArray(value?.ownedCarIds) ? value.ownedCarIds.filter((id) => carIds.has(id)) : []);
  // Le garage de départ : la citadine offerte, plus les trois voitures les
  // moins puissantes du catalogue (`cityRushFreeCarIds`), que tout le monde
  // possède — une sauvegarde plus ancienne, un instantané serveur ou une ligne
  // accordée par l'administration les retrouvent donc à la lecture, sans
  // migration ni achat.
  for (const freeCarId of cityRushFreeCarIds(cars)) rawCars.add(freeCarId);
  if (carIds.has(CITY_RUSH_STARTER_CAR_ID)) rawCars.add(CITY_RUSH_STARTER_CAR_ID);

  const rawCompleted = new Set(Array.isArray(value?.completedCourseIds) ? value.completedCourseIds.filter((id) => courseIds.has(id)) : []);
  const completedCourseIds = [];
  // La progression est un chemin : une sauvegarde incohérente ne peut pas
  // laisser un circuit ultérieur ouvert en sautant le précédent.
  for (const course of courses) {
    if (!course?.id || !rawCompleted.has(course.id)) break;
    completedCourseIds.push(course.id);
  }

  return {
    cash: safeMoney(value?.cash),
    ownedCarIds: (Array.isArray(cars) ? cars : []).map((car) => car?.id).filter((id) => rawCars.has(id)),
    completedCourseIds,
  };
}

export function isCityRushCarOwned(progress, carId, cars = CITY_RUSH_CARS) {
  const carIds = validIdSet(cars);
  return carIds.has(carId) && normalizeCityRushProgress(progress, { cars }).ownedCarIds.includes(carId);
}

/** Les trois voitures les moins puissantes sont offertes : jamais un achat. */
export function isCityRushCarFree(carId, cars = CITY_RUSH_CARS) {
  return cityRushFreeCarIds(cars).includes(carId);
}

export function isCityRushCourseUnlocked(progress, courseId, courses = CITY_RUSH_COURSES) {
  const index = (Array.isArray(courses) ? courses : []).findIndex((course) => course?.id === courseId);
  if (index < 0) return false;
  if (index === 0) return true;
  const safeProgress = normalizeCityRushProgress(progress, { courses });
  return safeProgress.completedCourseIds.includes(courses[index - 1]?.id);
}

/** Achète une voiture une seule fois ; les achats répétés ne débitent jamais le portefeuille. */
export function purchaseCityRushCar(progress, carId, cars = CITY_RUSH_CARS) {
  const current = normalizeCityRushProgress(progress, { cars });
  const car = (Array.isArray(cars) ? cars : []).find((item) => item?.id === carId);
  if (!car) return { progress: current, purchased: false, reason: 'unknown-car' };
  // Une voiture offerte appartient déjà à tout le monde : son prix catalogue
  // n'est jamais débité, même si un ancien appel force le passage par ici.
  if (isCityRushCarFree(carId, cars)) return { progress: current, purchased: false, reason: 'free-car' };
  if (current.ownedCarIds.includes(carId)) return { progress: current, purchased: false, reason: 'already-owned' };
  const price = safeMoney(car.price);
  if (current.cash < price) return { progress: current, purchased: false, reason: 'insufficient-funds' };
  return {
    progress: normalizeCityRushProgress({
      ...current,
      cash: current.cash - price,
      ownedCarIds: [...current.ownedCarIds, carId],
    }, { cars }),
    purchased: true,
    reason: null,
  };
}

/** Verse la récompense d'une course ; seule une arrivée (pas une épave) ouvre le parcours suivant. */
export function awardCityRushRace(progress, {
  courseId = CITY_RUSH_COURSES[0]?.id,
  completed = true,
  courses = CITY_RUSH_COURSES,
  rank = null,
  reward = null,
  modeId = 'circuit',
  sprint = false,
  destroyed = false,
  timedOut = false,
} = {}) {
  const current = normalizeCityRushProgress(progress, { courses });
  if (!isCityRushCourseUnlocked(current, courseId, courses)) {
    return { progress: current, cashAwarded: 0, courseCompleted: false, reason: 'course-locked' };
  }
  // Sprint et Poursuite ne paient jamais, même si un ancien appel fournit un
  // gain explicite. Pour les modes rémunérés, `reward` reste prioritaire ; à
  // défaut, le podium fixe le versement.
  const paysCash = cityRushModePaysCash(sprint ? 'sprint' : modeId);
  const cashAwarded = paysCash
    ? (reward !== null && reward !== undefined
      ? safeMoney(reward)
      : cityRushCashForRaceResult({ rank, modeId, sprint, destroyed, timedOut }))
    : 0;
  const completedCourseIds = completed && !current.completedCourseIds.includes(courseId)
    ? [...current.completedCourseIds, courseId]
    : current.completedCourseIds;
  return {
    progress: normalizeCityRushProgress({
      ...current,
      cash: current.cash + cashAwarded,
      completedCourseIds,
    }, { courses }),
    cashAwarded,
    courseCompleted: Boolean(completed),
    reason: null,
  };
}

function browserStorage() {
  try { return globalThis.window?.localStorage || globalThis.localStorage || null; } catch { return null; }
}

/**
 * Clé du cache local : celle d'un visiteur pour l'appareil, suffixée par
 * l'identifiant du compte quand un joueur est connecté — la progression d'un
 * compte n'écrase donc jamais celle d'un autre (ni celle de l'appareil).
 */
export function cityRushStorageKey(userId) {
  const id = typeof userId === 'string' ? userId.trim() : '';
  return id ? `${CITY_RUSH_PROGRESS_KEY}:user:${id}` : CITY_RUSH_PROGRESS_KEY;
}

/** Étoiles de campagne : `{ chapitreId: 1..3 }` (seuls les chapitres étoilés sont gardés). */
export function normalizeCityRushStoryStars(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const clean = {};
  for (const [id, stars] of Object.entries(value)) {
    if (typeof id !== 'string' || !id) continue;
    const count = Math.max(0, Math.min(3, Math.floor(Number(stars) || 0)));
    if (count > 0) clean[id] = count;
  }
  return clean;
}

/**
 * Replace un document d’avant la refonte (6 chapitres) sur le nouveau
 * découpage (10 chapitres) : un joueur à jour (version tamponnée) passe
 * sans toucher, une ancienne sauvegarde est remappée au chapitre équivalent.
 */
export function withUpgradedCityRushStory(value) {
  if (!value || typeof value !== 'object' || value.storyVersion === CITY_RUSH_STORY_VERSION) return value;
  return { ...value, storyChapter: mapLegacyStoryChapter(value.storyChapter) };
}

/** Campagne Histoire : chapitre courant (0 = prologue), fin choisie, étoiles. */
export function normalizeCityRushStory(value = null, chapters = CITY_RUSH_STORY_CHAPTERS) {
  const total = Math.max(0, Math.floor(Number(chapters) || 0));
  const rawChapter = Number(value?.storyChapter);
  const storyChapter = Number.isFinite(rawChapter)
    ? Math.max(0, Math.min(total, Math.floor(rawChapter)))
    : 0;
  const rawEnding = typeof value?.storyEnding === 'string' ? value.storyEnding.trim() : '';
  const storyEnding = /^[a-z][a-z0-9-]{0,31}$/.test(rawEnding) ? rawEnding : '';
  return {
    storyChapter,
    storyEnding,
    storyVersion: CITY_RUSH_STORY_VERSION,
    storyStars: normalizeCityRushStoryStars(value?.storyStars),
  };
}

/** Sauvegarde complète : carrière (portefeuille, garage, parcours) + Histoire. */
export function normalizeCityRushSave(value, { cars = CITY_RUSH_CARS, courses = CITY_RUSH_COURSES } = {}) {
  return {
    ...normalizeCityRushProgress(value, { cars, courses }),
    ...normalizeCityRushStory(value),
  };
}

export function readCityRushSave(storage = browserStorage(), key = CITY_RUSH_PROGRESS_KEY) {
  try {
    const raw = storage?.getItem(key);
    return normalizeCityRushSave(withUpgradedCityRushStory(raw ? JSON.parse(raw) : null));
  } catch {
    return normalizeCityRushSave(null);
  }
}

/**
 * Écrit la sauvegarde complète et renvoie la copie sûre (celle à garder en
 * mémoire : un stockage refusé — navigation privée — ne casse pas la partie).
 */
export function writeCityRushSave(save, storage = browserStorage(), key = CITY_RUSH_PROGRESS_KEY) {
  const clean = normalizeCityRushSave(save);
  try {
    if (!storage) return clean;
    storage.setItem(key, JSON.stringify(clean));
  } catch { /* stockage indisponible : la copie en mémoire fait foi */ }
  return clean;
}

/** Reprend une seule fois l'ancienne campagne Histoire (clés séparées). */
export function migrateCityRushLegacyStory(storage = browserStorage(), key = CITY_RUSH_PROGRESS_KEY) {
  const saved = readCityRushSave(storage, key);
  if (saved.storyChapter > 0 || saved.storyEnding) return saved;
  let legacy = null;
  try {
    const rawChapter = storage?.getItem(CITY_RUSH_LEGACY_STORY_KEY);
    if (rawChapter !== null && rawChapter !== undefined) {
      legacy = {
        storyChapter: Number(rawChapter),
        storyEnding: storage.getItem(CITY_RUSH_LEGACY_STORY_ENDING_KEY) || '',
      };
    }
  } catch { legacy = null; }
  if (!legacy) return saved;
  // Les anciennes clés datent des 6 chapitres : même remappage qu’une vieille ligne.
  const next = writeCityRushSave({ ...saved, storyChapter: mapLegacyStoryChapter(legacy.storyChapter), storyEnding: legacy.storyEnding }, storage, key);
  try {
    storage?.removeItem?.(CITY_RUSH_LEGACY_STORY_KEY);
    storage?.removeItem?.(CITY_RUSH_LEGACY_STORY_ENDING_KEY);
  } catch { /* anciennes clés déjà inaccessibles */ }
  return next;
}

/**
 * Cache local du compte connecté.
 *
 * À la première connexion sur l'appareil, la sauvegarde partagée (et l'ancienne
 * campagne Histoire) est reprise une seule fois par le compte, puis retirée —
 * un invité qui se connecte ne perd rien, et les comptes suivants ne partagent
 * jamais la progression du précédent.
 */
export function loadCityRushAccountSave(userId, storage) {
  const store = storage !== undefined ? storage : browserStorage();
  const id = typeof userId === 'string' ? userId.trim() : '';
  if (!store || !id) return migrateCityRushLegacyStory(store);
  const accountKey = cityRushStorageKey(id);
  try {
    if (store.getItem(accountKey) !== null) return migrateCityRushLegacyStory(store, accountKey);
    const shared = migrateCityRushLegacyStory(store);
    if (store.getItem(CITY_RUSH_PROGRESS_KEY) === null) return shared;
    const migrated = writeCityRushSave(shared, store, accountKey);
    store.removeItem?.(CITY_RUSH_PROGRESS_KEY);
    return migrated;
  } catch {
    return readCityRushSave(store, accountKey);
  }
}

/** Vue « carrière » de la sauvegarde : portefeuille, garage et parcours. */
export function readCityRushProgress(storage = browserStorage(), key = CITY_RUSH_PROGRESS_KEY) {
  return normalizeCityRushProgress(readCityRushSave(storage, key));
}

/**
 * Écrit la carrière en conservant la campagne Histoire déjà enregistrée sous
 * la même clé (la sauvegarde complète garde une seule ligne par appareil ou
 * par compte).
 */
export function writeCityRushProgress(progress, storage = browserStorage(), key = CITY_RUSH_PROGRESS_KEY) {
  const store = storage === undefined ? browserStorage() : storage;
  if (!store) return false;
  const saved = readCityRushSave(store, key);
  writeCityRushSave({ ...saved, ...normalizeCityRushProgress(progress) }, store, key);
  return true;
}
