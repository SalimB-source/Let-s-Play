import { supabase } from '../lib/supabase';

export const mirageApiEnabled = () => Boolean(supabase);

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
