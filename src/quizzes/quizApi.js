/**
 * Scores de quizz : classement Supabase + meilleure partie locale.
 * ---------------------------------------------------------------
 * Le classement se fait sur les POINTS gagnés (barème « fun » du moteur :
 * base + rapidité + combo), pas sur le nombre de bonnes réponses — resté
 * stocké et affiché en secondaire. LES NIVEAUX SONT SÉPARÉS : la clé d'une
 * tentative est `slug:level` (`attemptKey`), donc chaque difficulté a son
 * propre classement et son propre record d'appareil — un sans-faute en Expert
 * ne se compare pas à un Facile. Compte connecté : la tentative part au
 * serveur via la RPC `submit_quiz_attempt` (MEILLEURE PARTIE conservée —
 * celle qui marque le plus de points, bornes vérifiées côté serveur — voir
 * `supabase/schema.sql`, section 8) ; le classement d'un niveau se lit via
 * `get_quiz_leaderboard`, et la position au classement global (somme des
 * points, tous niveaux confondus) via `get_quiz_global_rank`.
 *
 * Visiteur (sans compte, ou Supabase non configuré) : la meilleure partie de
 * l'appareil est gardée dans `localStorage` sous une clé propre aux quizz —
 * le module de persistance des succès reste le seul à écrire la sienne.
 */
import { supabase } from '../lib/supabase';
import { QUIZ_LEVELS } from '../quizzesData';

const BEST_KEY = 'letsplay_quiz_best_v1';

/**
 * Clé de stockage/classement d'un niveau : `slug:level` (`culture-gaming:hard`).
 * Chaque niveau a son propre record d'appareil et sa propre ligne de
 * classement — un sans-faute en Expert ne se compare pas à un Facile.
 * Sans niveau (appel historique), on retombe sur le slug seul.
 */
export function attemptKey(quizId, level = null) {
  return level ? `${quizId}:${level}` : quizId;
}

/** true si un backend Supabase est configuré (classement partagé possible). */
export function quizApiEnabled() {
  return Boolean(supabase);
}

/**
 * Dépose une tentative (compte connecté). Renvoie le classement ou null.
 * Repli : si la RPC refuse `p_points` (déploiement antérieur aux points),
 * on retente la signature historique — une partie jouée ne doit jamais
 * casser pour cause de mise à jour du schéma.
 */
export async function submitQuizAttempt({ quizId, score, total, perfect, points = 0 }) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('submit_quiz_attempt', {
    p_quiz_id: quizId,
    p_score: score,
    p_total: total,
    p_perfect: perfect,
    p_points: points,
  });
  if (!error) return data;
  const legacy = await supabase.rpc('submit_quiz_attempt', {
    p_quiz_id: quizId,
    p_score: score,
    p_total: total,
    p_perfect: perfect,
  });
  return legacy.error ? null : legacy.data;
}

/** Classement d'un quizz (top N par points, profils joints). null sans backend. */
export async function fetchQuizLeaderboard(quizId, limit = 10) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_quiz_leaderboard', {
    p_quiz_id: quizId,
    p_limit: limit,
  });
  return error ? null : data;
}

/**
 * Position d'un joueur au classement global des quizz (somme des points de
 * ses meilleures parties, tous quizz confondus) : `{ rank, points, quizzes,
 * players, mine }`, `rank` null si le joueur n'a aucune partie classée.
 */
export async function fetchGlobalQuizRank(userId = null) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_quiz_global_rank', userId
    ? { p_user_id: userId }
    : {});
  return error ? null : data;
}

/** Meilleures parties de l'appareil : `{ [clé de niveau]: { score, total, points, level } }`. */
export function readLocalBests() {
  try {
    if (typeof window === 'undefined') return {};
    const raw = JSON.parse(window.localStorage.getItem(BEST_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch (e) {
    return {};
  }
}

/**
 * Retient la meilleure partie de l'appareil pour un NIVEAU de quizz : le plus
 * de points, à points égaux le plus de bonnes réponses (même règle que la RPC
 * `submit_quiz_attempt` côté serveur, qui reçoit la clé de niveau).
 */
export function writeLocalBest(quizId, level, score, total, points = 0) {
  try {
    if (typeof window === 'undefined') return;
    const bests = readLocalBests();
    const key = attemptKey(quizId, level);
    const current = bests[key];
    const currentPoints = (current && current.points) || 0;
    const better = !current
      || points > currentPoints
      || (points === currentPoints && score > current.score);
    if (better) bests[key] = { score, total, points, level };
    window.localStorage.setItem(BEST_KEY, JSON.stringify(bests));
  } catch (e) { /* stockage indisponible : le score reste en mémoire de session */ }
}

/** Compare deux meilleures parties (points d'abord, puis bonnes réponses). */
function betterBest(candidate, current) {
  if (!current) return candidate;
  if (!candidate) return current;
  if (candidate.points !== current.points) return candidate.points > current.points ? candidate : current;
  return candidate.score > current.score ? candidate : current;
}

/**
 * Meilleure partie de l'appareil : d'un niveau précis (`level` fourni), ou
 * tous niveaux confondus (aucun niveau — c'est le badge des cartes de la
 * grille, qui nomme le niveau grâce à `level` conservé dans l'entrée).
 * Compatibilité : un record enregistré avant les niveaux (clé = slug seul)
 * vaut pour le niveau Facile.
 */
export function readLocalBest(quizId, level = null) {
  const bests = readLocalBests();
  if (level) {
    return bests[attemptKey(quizId, level)] || (level === 'easy' ? bests[quizId] || null : null);
  }
  return QUIZ_LEVELS
    .map((entry) => bests[attemptKey(quizId, entry)] || (entry === 'easy' ? bests[quizId] || null : null))
    .reduce((best, current) => betterBest(current, best), null);
}

/**
 * Libellé d'une meilleure partie : `8/8 · 1250 PTS` (les points font le
 * classement, les bonnes réponses restent en secondaire). Repli sans points
 * (ancien stockage) : `8/8`.
 */
export function formatBest(best) {
  if (!best) return '';
  const base = `${best.score}/${best.total}`;
  return best.points > 0 ? `${base} · ${best.points} PTS` : base;
}
