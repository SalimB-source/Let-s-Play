// Progression persistante de Vice City Rush : portefeuille, garage et ordre des parcours.
// Les courses restent jouables à partir du premier circuit ; une arrivée normale
// débloque le parcours suivant. Seuls les modes rémunérés versent des billets :
// 1er → 50, 2e → 30, 3e (ou épave, classée dernière) → 10.
import { CITY_RUSH_CARS, CITY_RUSH_COURSES } from './cityRushRules.js';

export const CITY_RUSH_PROGRESS_KEY = 'letsplay_vice_city_rush_progress_v1';
export const CITY_RUSH_STARTER_CAR_ID = 'city-hatch';

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

export function readCityRushProgress(storage = browserStorage()) {
  try {
    const raw = storage?.getItem(CITY_RUSH_PROGRESS_KEY);
    return normalizeCityRushProgress(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeCityRushProgress(null);
  }
}

export function writeCityRushProgress(progress, storage = browserStorage()) {
  try {
    if (!storage) return false;
    storage.setItem(CITY_RUSH_PROGRESS_KEY, JSON.stringify(normalizeCityRushProgress(progress)));
    return true;
  } catch {
    return false;
  }
}
