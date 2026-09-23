/**
 * Scores de quizz : classement Supabase + meilleur score local.
 * -------------------------------------------------------------
 * Compte connecté : la tentative part au serveur via la RPC
 * `submit_quiz_attempt` (meilleur score conservé, bornes vérifiées côté
 * serveur — voir `supabase/schema.sql`, section 8) et le classement se lit
 * via `get_quiz_leaderboard`.
 *
 * Visiteur (sans compte, ou Supabase non configuré) : le meilleur score de
 * l'appareil est gardé dans `localStorage` sous une clé propre aux quizz —
 * le module de persistance des succès reste le seul à écrire la sienne.
 */
import { supabase } from '../lib/supabase';

const BEST_KEY = 'letsplay_quiz_best_v1';

/** true si un backend Supabase est configuré (classement partagé possible). */
export function quizApiEnabled() {
  return Boolean(supabase);
}

/** Dépose une tentative (compte connecté). Renvoie le classement ou null. */
export async function submitQuizAttempt({ quizId, score, total, perfect }) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('submit_quiz_attempt', {
    p_quiz_id: quizId,
    p_score: score,
    p_total: total,
    p_perfect: perfect,
  });
  return error ? null : data;
}

/** Classement d'un quizz (top N, profils joints). null sans backend. */
export async function fetchQuizLeaderboard(quizId, limit = 10) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_quiz_leaderboard', {
    p_quiz_id: quizId,
    p_limit: limit,
  });
  return error ? null : data;
}

/** Meilleurs scores de l'appareil : `{ [slug]: { score, total } }`. */
export function readLocalBests() {
  try {
    if (typeof window === 'undefined') return {};
    const raw = JSON.parse(window.localStorage.getItem(BEST_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch (e) {
    return {};
  }
}

/** Retient le meilleur score de l'appareil pour un quizz. */
export function writeLocalBest(quizId, score, total) {
  try {
    if (typeof window === 'undefined') return;
    const bests = readLocalBests();
    const current = bests[quizId];
    if (!current || score > current.score) bests[quizId] = { score, total };
    window.localStorage.setItem(BEST_KEY, JSON.stringify(bests));
  } catch (e) { /* stockage indisponible : le score reste en mémoire de session */ }
}

export function readLocalBest(quizId) {
  return readLocalBests()[quizId] || null;
}
