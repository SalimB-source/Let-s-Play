/**
 * Copie serveur de la progression de Vice City Rush.
 * ------------------------------------------------
 * Même contrat que `mirageApi.js` : chaque compte connecté possède SA ligne
 * dans `public.vice_city_rush_progress` (voir supabase/schema.sql), dont la
 * colonne `progress` porte la sauvegarde complète du jeu — portefeuille,
 * garage, parcours validés et campagne Histoire. La RLS garantit qu'un joueur
 * ne lit et n'écrit que sa propre ligne ; le cache local (`cityRushProgress.js`)
 * reste la référence hors ligne, et un compte neuf démarre sans progression.
 *
 * Un `progress` nul (compte jamais synchronisé) ou une erreur réseau ne
 * doivent jamais écraser la copie locale : l'appelant décide, avec `error` et
 * la présence d'un instantané, s'il publie sa copie ou garde la sienne.
 */
import { supabase } from '../lib/supabase';

/** Table Supabase qui porte la progression Vice City Rush de chaque compte. */
export const VICE_CITY_PROGRESS_TABLE = 'vice_city_rush_progress';

export const viceCityApiEnabled = () => Boolean(supabase);

/** Instantané du compte : `{ progress, error }` (progress nul s'il n'y en a pas). */
export async function fetchViceCityProgress(userId) {
  if (!supabase || !userId) return { progress: null, error: null };
  const { data, error } = await supabase
    .from(VICE_CITY_PROGRESS_TABLE)
    .select('progress')
    .eq('user_id', userId)
    .maybeSingle();
  return { progress: error ? null : (data?.progress ?? null), error: error || null };
}

/** Publie un instantané de progression dans la ligne privée du joueur. */
export async function saveViceCityProgress(userId, progress) {
  if (!supabase || !userId || !progress || typeof progress !== 'object') return false;
  const { error } = await supabase
    .from(VICE_CITY_PROGRESS_TABLE)
    .upsert({ user_id: userId, progress, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  return !error;
}
