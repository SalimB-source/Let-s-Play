/**
 * Scores de quizz : classement Supabase + meilleure partie locale.
 * ---------------------------------------------------------------
 * Le classement se fait sur les POINTS gagnés (barème « fun » du moteur :
 * base + rapidité + combo, MULTIPLIÉ par le niveau joué), pas sur le nombre
 * de bonnes réponses — resté stocké et affiché en secondaire.
 *
 * Règle « un quizz rapporte une fois par niveau » : une partie est identifiée
 * par `slug:niveau` (`quizAttemptId`) — c'est la clé des records de l'appareil
 * ET de la colonne `quiz_attempts.quiz_id`. Compte connecté : la tentative
 * part au serveur via la RPC `submit_quiz_attempt`, qui ne conserve que la
 * PREMIÈRE complétion de chaque quizz à chaque niveau (les bornes de points,
 * recalées sur le multiplicateur, sont revérifiées côté serveur — voir
 * `supabase/schema.sql`, section 8) ; le classement d'un couple quizz+niveau se
 * lit via `get_quiz_leaderboard`, et la position au classement global (somme
 * des points, tous niveaux confondus) via `get_quiz_global_rank`.
 *
 * Visiteur (sans compte, ou Supabase non configuré) : les parties de
 * l'appareil sont gardées dans `localStorage` sous une clé propre aux quizz
 * — le module de persistance des succès reste le seul à écrire la sienne.
 */
import { supabase } from '../lib/supabase';

const BEST_KEY = 'letsplay_quiz_best_v2';
const LEGACY_BEST_KEYS = ['letsplay_quiz_best_v1'];

/**
 * Identifiant d'un run noté : `slug:niveau` (ex. `culture-gaming:hard`).
 * Sert de clé aux records de l'appareil et à la colonne `quiz_attempts`.
 * Sans niveau (anciens enregistrements, avant les paliers), l'identifiant
 * reste le slug nu — la lecture (`readLocalBest`) accepte les deux formes.
 */
export function quizAttemptId(quizId, level) {
  return quizId && level ? `${quizId}:${level}` : quizId;
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
 * Retient la meilleure partie de l'appareil pour un quizz ET un niveau
 * (clé `slug:niveau`) : le plus de points, à points égaux le plus de bonnes
 * réponses. En pratique un seul write par clé — le lecteur n'appelle cette
 * fonction qu'à la PREMIÈRE complétion d'un niveau —, mais la règle de
 * remplacement reste le garde-fou des anciens enregistrements.
 */
export function writeLocalBest(quizId, score, total, points = 0, level = null) {
  try {
    if (typeof window === 'undefined') return;
    const bests = readLocalBests();
    const key = quizAttemptId(quizId, level);
    const current = bests[key];
    const currentPoints = (current && current.points) || 0;
    const better = !current
      || points > currentPoints
      || (points === currentPoints && score > current.score);
    if (better) bests[key] = { score, total, points, level: level || null };
    window.localStorage.setItem(BEST_KEY, JSON.stringify(bests));
  } catch (e) { /* stockage indisponible : le score reste en mémoire de session */ }
}

/**
 * Meilleure partie de l'appareil pour un quizz, SUR TOUS SES NIVEAUX (et sur
 * les anciens enregistrements sans niveau, clés au slug nu) : le plus de
 * points, à points égaux le plus de bonnes réponses. C'est le badge affiché
 * sur les cartes de la grille — l'entrée garde son `level`, donc l'infobulle
 * peut nommer le palier du record.
 */
export function readLocalBest(quizId) {
  const bests = readLocalBests();
  let best = null;
  for (const [key, entry] of Object.entries(bests)) {
    if (!entry) continue;
    if (key !== quizId && !key.startsWith(`${quizId}:`)) continue;
    const points = entry.points || 0;
    if (!best
      || points > (best.points || 0)
      || (points === (best.points || 0) && entry.score > (best.score || 0))) {
      best = entry;
    }
  }
  return best;
}

/** Partie de l'appareil pour un quizz ET un niveau (null si jamais joué). */
export function readLocalBestRun(quizId, level) {
  return readLocalBests()[quizAttemptId(quizId, level)] || null;
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
