/**
 * Copie serveur des decks maison et de la collection du Sablier.
 * --------------------------------------------------------------
 * Chaque compte connecté possède SA ligne dans `public.rpg_sablier_progress`
 * (voir supabase/schema.sql) : `state` porte le casier complet — decks maison,
 * pierres tombales de suppression, collection — tel que le calcule
 * `fusionnerEtatsSablier` (`rpgDeckBuilder.js`). RLS stricte : un joueur ne
 * lit et n'écrit que sa propre ligne.
 *
 * Contrat identique à `achievements/remote.js` : le stockage local reste la
 * copie de travail (le jeu marche hors ligne), cette table suit le joueur
 * d'un appareil à l'autre. Si la table n'existe pas encore (schéma pas relancé
 * sur le projet), tout se passe comme s'il n'y avait rien à synchroniser —
 * sans erreur visible.
 *
 * Ce module ne touche jamais au stockage local et ne contient aucune règle de
 * fusion : il ne fait que transporter l'état.
 */

import { supabase } from '../lib/supabase';

/** Table Supabase qui porte les decks maison et la collection de chaque compte. */
export const RPG_SABLIER_TABLE = 'rpg_sablier_progress';

/** Vrai quand l'erreur vient de l'absence de la table (schéma pas à jour). */
function erreurTableAbsente(error) {
  const code = error?.code || '';
  const message = error?.message || '';
  return code === '42P01'
    || code === 'PGRST205'
    || /could not find the table|does not exist/i.test(message);
}

/**
 * État du compte côté serveur : `{ state, source }`.
 *
 *   - `'table'`       — la ligne `rpg_sablier_progress` du compte (la référence) ;
 *   - `'none'`        — serveur joignable, aucune copie : compte neuf ;
 *   - `'unavailable'` — hors ligne, table absente ou erreur : le local reste la référence.
 */
export async function chargerEtatSablier(userId) {
  if (!supabase || !userId) return { state: null, source: 'unavailable' };
  try {
    const { data, error } = await supabase
      .from(RPG_SABLIER_TABLE)
      .select('state')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data?.state ? { state: data.state, source: 'table' } : { state: null, source: 'none' };
  } catch (error) {
    return { state: null, source: erreurTableAbsente(error) ? 'none' : 'unavailable' };
  }
}

/**
 * Écrit l'état du compte (casier + collection fusionnés par l'appelant).
 * Rend `'table'` si l'écriture a eu lieu, `null` sinon — hors ligne, la copie
 * locale reste la référence jusqu'à la prochaine action.
 */
export async function sauverEtatSablier(userId, state) {
  if (!supabase || !userId || !state || typeof state !== 'object') return null;
  try {
    const { error } = await supabase
      .from(RPG_SABLIER_TABLE)
      .upsert({
        user_id: userId,
        state,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    return error ? null : 'table';
  } catch {
    return null;
  }
}
