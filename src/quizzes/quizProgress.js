/**
 * Progression des niveaux de quizz — un palier par difficulté.
 * -----------------------------------------------------------
 * Chaque quizz se joue en trois niveaux (`easy`, `medium`, `hard`, voir
 * `QUIZ_LEVELS` dans `src/quizzesData.js`) : le niveau Facile est ouvert, le
 * Confirmé se débloque en TERMINANT le Facile, l'Expert en terminant le
 * Confirmé. C'est la seule règle de déverrouillage du site — les quizz
 * eux-mêmes sont tous jouables dès l'arrivée.
 *
 * Ce module ne contient que des fonctions pures, plus la lecture/écriture de
 * la copie locale (`localStorage`) et la copie serveur d'un compte connecté :
 *
 *   - local (`letsplay_quiz_levels_v1`) : la référence hors-ligne, comme le
 *     record de l'appareil (`./quizApi`) ou la progression des succès ;
 *   - serveur (`public.quiz_progress`, une ligne par compte et par niveau
 *     terminé) : la progression suit le compte, et se FUSIONNE avec la copie
 *     locale (union des niveaux terminés) au chargement. Table absente
 *     (schéma SQL pas encore relancé) : on reste sur la copie locale, rien
 *     ne casse.
 *
 * `src/quizzes/useQuizProgress.js` en fait le hook React consommé par le
 * lecteur et la grille des quizz.
 */
import { QUIZ_LEVELS } from '../quizzesData.js';
import { supabase } from '../lib/supabase.js';

/** Clé du stockage local : niveaux terminés, par quizz. */
export const LEVELS_KEY = 'letsplay_quiz_levels_v1';

/** Table Supabase qui porte la progression de niveaux d'un compte. */
export const QUIZ_PROGRESS_TABLE = 'quiz_progress';

/** Niveau précédent à terminer pour ouvrir `level` (`null` pour Facile). */
export function levelRequirement(level) {
  const index = QUIZ_LEVELS.indexOf(level);
  return index > 0 ? QUIZ_LEVELS[index - 1] : null;
}

/** Niveau suivant une fois `level` terminé (`null` pour l'Expert). */
export function nextLevel(level) {
  const index = QUIZ_LEVELS.indexOf(level);
  return index >= 0 && index < QUIZ_LEVELS.length - 1 ? QUIZ_LEVELS[index + 1] : null;
}

/** Niveaux terminés d'un quizz, dans l'ordre de progression. */
export function completedLevels(progress, quizId) {
  const done = (progress && progress[quizId]) || {};
  return QUIZ_LEVELS.filter((level) => Boolean(done[level]));
}

/** Ce niveau précis a-t-il été terminé ? */
export function isLevelCompleted(progress, quizId, level) {
  return Boolean(progress && progress[quizId] && progress[quizId][level]);
}

/**
 * Ce niveau est-il jouable ? Facile toujours ; Confirmé si le Facile est
 * terminé ; Expert si le Confirmé l'est aussi (progression en cascade).
 */
export function isLevelUnlocked(progress, quizId, level) {
  const requirement = levelRequirement(level);
  return requirement === null || isLevelCompleted(progress, quizId, requirement);
}

/** Le niveau à ouvrir quand `level` vient d'être terminé (null si le dernier). */
export function unlockedBy(progress, quizId, level) {
  const following = nextLevel(level);
  return following && isLevelUnlocked(progress, quizId, following) ? following : null;
}

/** Nombre de niveaux terminés sur `total` (badge de la carte des quizz). */
export function levelsDone(progress, quizId) {
  return completedLevels(progress, quizId).length;
}

/* ------------------------------------------------------------ Local ------- */

/** Progression de l'appareil : `{ [slug]: { easy: true, … } }`. */
export function readLocalProgress() {
  try {
    if (typeof window === 'undefined') return {};
    const raw = JSON.parse(window.localStorage.getItem(LEVELS_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch (e) {
    return {};
  }
}

export function saveLocalProgress(progress) {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(LEVELS_KEY, JSON.stringify(progress));
  } catch (e) { /* stockage indisponible : la progression reste en mémoire */ }
  return progress;
}

/**
 * Fusionne deux progressions (union des niveaux terminés) : sert à marier la
 * copie locale et la copie serveur d'un compte connecté, sans jamais
 * « dé-débloquer » un niveau déjà joué.
 */
export function mergeProgress(...sources) {
  const merged = {};
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const [quizId, levels] of Object.entries(source)) {
      if (!levels || typeof levels !== 'object') continue;
      merged[quizId] = { ...(merged[quizId] || {}) };
      for (const level of QUIZ_LEVELS) {
        if (levels[level]) merged[quizId][level] = true;
      }
    }
  }
  return merged;
}

/** Note un niveau terminé dans la copie locale et renvoie la progression. */
export function markLevelCompleted(quizId, level) {
  if (!quizId || !level) return readLocalProgress();
  const progress = readLocalProgress();
  const next = mergeProgress(progress, { [quizId]: { [level]: true } });
  return saveLocalProgress(next);
}

/* ----------------------------------------------------------- Serveur ------ */

/** Vrai quand l'erreur vient de l'absence de la table (schéma pas à jour). */
function isMissingTableError(error) {
  const code = error?.code || '';
  const message = error?.message || '';
  return code === '42P01'
    || code === 'PGRST205'
    || /could not find the table|does not exist/i.test(message);
}

/**
 * Niveaux terminés côté serveur pour un compte : `{ [slug]: { easy: true } }`,
 * ou `null` si Supabase n'est pas configuré, si la table manque ou si le
 * réseau répond mal — l'appelant garde alors la copie locale.
 */
export async function fetchAccountProgress(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from(QUIZ_PROGRESS_TABLE)
      .select('quiz_id, level_id')
      .eq('user_id', userId);
    if (error) return isMissingTableError(error) ? null : null;
    const progress = {};
    for (const row of data || []) {
      if (!QUIZ_LEVELS.includes(row.level_id)) continue;
      progress[row.quiz_id] = { ...(progress[row.quiz_id] || {}), [row.level_id]: true };
    }
    return progress;
  } catch (e) {
    return null;
  }
}

/**
 * Dépose un niveau terminé sur le compte (best effort : la copie locale reste
 * la référence si le serveur refuse ou n'existe pas encore).
 */
export async function pushLevelCompleted(userId, quizId, level) {
  if (!supabase || !userId || !quizId || !level) return false;
  try {
    const { error } = await supabase
      .from(QUIZ_PROGRESS_TABLE)
      .upsert(
        { user_id: userId, quiz_id: quizId, level_id: level },
        { onConflict: 'user_id,quiz_id,level_id', ignoreDuplicates: true },
      );
    return !error;
  } catch (e) {
    return false;
  }
}
