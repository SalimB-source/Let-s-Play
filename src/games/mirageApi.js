import { supabase } from '../lib/supabase';

export const mirageApiEnabled = () => Boolean(supabase);

/**
 * Read the signed-in player's account-backed progression. A null state means
 * this account has not been synced yet; callers can seed it from the user's
 * account-scoped local cache. Older deployments without the table return the
 * Supabase error so the game can continue locally without overwriting it.
 */
export async function fetchMirageProgress(userId) {
  if (!supabase || !userId) return { progress: null, error: null };
  const { data, error } = await supabase
    .from('mirage_rush_progress')
    .select('progress')
    .eq('user_id', userId)
    .maybeSingle();
  return { progress: error ? null : (data?.progress ?? null), error: error || null };
}

/** Persist a progression snapshot in the player's private account row. */
export async function saveMirageProgress(userId, progress) {
  if (!supabase || !userId || !progress || typeof progress !== 'object') return false;
  const { error } = await supabase
    .from('mirage_rush_progress')
    .upsert({ user_id: userId, progress, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  return !error;
}

/** Public top scores. Returns null until the optional SQL migration is applied. */
export async function fetchMirageLeaderboard(limit = 10) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_mirage_rush_leaderboard', { p_limit: limit });
  return error ? null : (Array.isArray(data) ? data : []);
}

/** Store a signed-in player's best verified-range run. */
export async function submitMirageScore({ score, gems, duration }) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('submit_mirage_rush_score', {
    p_score: score,
    p_gems: gems,
    p_duration: duration,
  });
  return error ? null : data;
}
