/**
 * Scores de quizz : classement Supabase + meilleure partie locale.
 * ---------------------------------------------------------------
 * Le classement se fait sur les POINTS gagnés (barème « fun » du moteur :
 * base + rapidité + combo), pas sur le nombre de bonnes réponses — resté
 * stocké et affiché en secondaire. Compte connecté : la tentative part au
 * serveur via la RPC `submit_quiz_attempt` (MEILLEURE PARTIE conservée —
 * celle qui marque le plus de points, bornes vérifiées côté serveur — voir
 * `supabase/schema.sql`, section 8) ; le classement d'un quizz se lit via
 * `get_quiz_leaderboard`, et la position au classement global (somme des
 * points, tous quizz confondus) via `get_quiz_global_rank`.
 *
 * Visiteur (sans compte, ou Supabase non configuré) : la meilleure partie de
 * l'appareil est gardée dans `localStorage` sous une clé propre aux quizz —
 * le module de persistance des succès reste le seul à écrire la sienne.
 */
import { supabase } from '../lib/supabase';

const BEST_KEY = 'letsplay_quiz_best_v2';
const LEGACY_BEST_KEYS = ['letsplay_quiz_best_v1'];

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

/** Meilleures parties de l'appareil : `{ [slug]: { score, total, points } }`. */
export function readLocalBests() {
  try {
    if (typeof window === 'undefined') return {};
    // Nettoyage des anciennes clés pour forcer la remise à zéro demandée.
    for (const legacy of LEGACY_BEST_KEYS) {
      try { window.localStorage.removeItem(legacy); } catch (e) {}
    }
    const raw = JSON.parse(window.localStorage.getItem(BEST_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch (e) {
    return {};
  }
}

/**
 * Retient la meilleure partie de l'appareil pour un quizz : le plus de
 * points, à points égaux le plus de bonnes réponses (même règle que la RPC
 * `submit_quiz_attempt` côté serveur).
 */
export function writeLocalBest(quizId, score, total, points = 0) {
  try {
    if (typeof window === 'undefined') return;
    const bests = readLocalBests();
    const current = bests[quizId];
    const currentPoints = (current && current.points) || 0;
    const better = !current
      || points > currentPoints
      || (points === currentPoints && score > current.score);
    if (better) bests[quizId] = { score, total, points };
    window.localStorage.setItem(BEST_KEY, JSON.stringify(bests));
  } catch (e) { /* stockage indisponible : le score reste en mémoire de session */ }
}

export function readLocalBest(quizId) {
  return readLocalBests()[quizId] || null;
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
