/**
 * Copie serveur de la progression d'un compte.
 * --------------------------------------------
 * Chaque compte connecté possède SA ligne dans `public.player_progress`
 * (voir supabase/schema.sql) : `state` porte l'état complet du moteur
 * (compteurs, ensembles, jours, succès débloqués), `level` et `xp` sont
 * dénormalisés pour l'affichage public (fil de commentaires, profils). RLS :
 * un joueur ne lit et n'écrit que sa propre ligne — la progression d'un
 * compte ne peut donc jamais être alimentée par celle d'un autre, et un
 * compte neuf démarre au niveau 1.
 *
 * Repli : si la table n'existe pas encore (schéma SQL pas relancé sur le
 * projet), on lit et on met à jour l'ancienne copie stockée dans les
 * métadonnées du compte, pour ne rien casser en attendant la migration.
 *
 * Ce module ne touche jamais au stockage local (`storage.js` reste le seul
 * écrivain de l'appareil) et ne contient aucune logique de moteur : il ne
 * fait que transporter l'état.
 */
import { supabase } from '../lib/supabase';
import { levelFromXp, normalizeState, totalXp } from './engine';
import { REMOTE_META_KEY } from './storage';

/** Table Supabase qui porte la progression de chaque compte. */
export const PROGRESS_TABLE = 'player_progress';

/** Vrai quand l'erreur vient de l'absence de la table (schéma pas à jour). */
function isMissingTableError(error) {
  const code = error?.code || '';
  const message = error?.message || '';
  return code === '42P01'
    || code === 'PGRST205'
    || /could not find the table|does not exist/i.test(message);
}

/** Ancienne copie (métadonnées du compte), ou null. */
async function metadataState() {
  try {
    const { data } = await supabase.auth.getUser();
    const raw = data?.user?.user_metadata?.[REMOTE_META_KEY];
    return raw ? normalizeState(raw) : null;
  } catch (e) {
    return null;
  }
}

/**
 * État du compte côté serveur : `{ state, source }`.
 *
 *   - `'table'`       — la ligne `player_progress` du compte (la référence) ;
 *   - `'metadata'`    — l'ancienne copie dans les métadonnées (à migrer) ;
 *   - `'none'`        — serveur joignable, aucune copie : compte neuf ;
 *   - `'unavailable'` — hors ligne ou erreur : le cache local reste la référence.
 */
export async function fetchAccountState(userId) {
  if (!supabase || !userId) return { state: null, source: 'unavailable' };
  try {
    const { data, error } = await supabase
      .from(PROGRESS_TABLE)
      .select('state')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (data?.state) return { state: normalizeState(data.state), source: 'table' };
    // Pas encore de ligne : reprendre l'ancienne copie du compte s'il y en a une.
    const legacy = await metadataState();
    return legacy ? { state: legacy, source: 'metadata' } : { state: null, source: 'none' };
  } catch (error) {
    if (isMissingTableError(error)) {
      const legacy = await metadataState();
      return legacy ? { state: legacy, source: 'metadata' } : { state: null, source: 'none' };
    }
    return { state: null, source: 'unavailable' };
  }
}

/**
 * Écrit la progression du compte : ligne `player_progress` d'abord,
 * métadonnées en repli (ancien déploiement sans la table). Renvoie la copie
 * écrite (`'table'` ou `'metadata'`), ou null en échec — hors ligne, la copie
 * locale reste la référence jusqu'à la prochaine action.
 */
export async function saveAccountState(userId, state) {
  if (!supabase || !userId) return null;
  const payload = normalizeState(state);
  const xp = totalXp(payload);
  const row = {
    user_id: userId,
    state: payload,
    xp,
    level: levelFromXp(xp).level,
    updated_at: new Date().toISOString(),
  };
  let tableMissing = false;
  try {
    const { error } = await supabase
      .from(PROGRESS_TABLE)
      .upsert(row, { onConflict: 'user_id' });
    if (!error) return 'table';
    tableMissing = isMissingTableError(error);
    if (!tableMissing) return null;
  } catch (e) {
    if (!isMissingTableError(e)) return null;
    tableMissing = true;
  }
  if (!tableMissing) return null;
  try {
    const { error } = await supabase.auth.updateUser({ data: { [REMOTE_META_KEY]: payload } });
    return error ? null : 'metadata';
  } catch (e) {
    return null;
  }
}

/**
 * Efface la progression du compte côté serveur (ligne + ancienne copie) —
 * le bouton de réinitialisation du profil pour un compte connecté.
 * En cas d'échec réseau, la prochaine action repartira de l'état local vierge
 * et réécrira la ligne.
 */
export async function clearAccountState(userId) {
  if (!supabase || !userId) return;
  try {
    await supabase.from(PROGRESS_TABLE).delete().eq('user_id', userId);
  } catch (e) {
    /* la prochaine action réécrira la ligne */
  }
  try {
    await supabase.auth.updateUser({ data: { [REMOTE_META_KEY]: null } });
  } catch (e) {
    /* idem */
  }
}
