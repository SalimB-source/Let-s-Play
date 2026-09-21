/**
 * Présence en ligne des comptes connectés.
 * ----------------------------------------
 * Deux signaux complémentaires, le premier étant instantané, le second
 * robuste :
 *
 *   1. **Supabase Realtime Presence** — chaque joueur connecté rejoint le canal
 *      `letsplay-presence` et s'y déclare (clé = son identifiant). L'état du
 *      canal donne à tout moment la liste des joueurs présents ; les entrées et
 *      sorties arrivent en direct. Ne demande aucune table : fonctionne dès
 *      que Realtime est actif sur le projet.
 *   2. **Battement de cœur** — `profiles.last_seen_at` est mis à jour à
 *      intervalle régulier (`friendsApi.touchPresence`). Il sert de repli quand
 *      Realtime est indisponible et permet d'afficher « vu il y a 2 h » pour
 *      les amis hors ligne.
 *
 * Ce module ne rend rien : le contexte des amis l'utilise et croise les deux
 * signaux (`online = présent OU vu il y a moins de 3 minutes`).
 */
import { supabase } from '../lib/supabase';

export const PRESENCE_CHANNEL = 'letsplay-presence';
/** Intervalle du battement de cœur (bien sous PRESENCE_STALE_MS). */
export const HEARTBEAT_MS = 90 * 1000;

/**
 * Rejoint le canal de présence en tant que `user` et signale à `onChange`
 * l'ensemble (Set) des identifiants présents à chaque évolution. Renvoie une
 * fonction qui quitte le canal. Sans Supabase (démo, SSR) : ne fait rien.
 */
export function joinPresence(user, onChange) {
  if (!supabase || !user?.id || typeof window === 'undefined') return () => {};

  let channel;
  try {
    channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: String(user.id), enabled: true } },
    });
  } catch (e) {
    return () => {};
  }

  const publish = () => {
    try {
      const state = channel.presenceState();
      onChange(new Set(Object.keys(state)));
    } catch (e) { /* canal fermé entre-temps */ }
  };

  const meta = user.user_metadata || {};
  const payload = {
    user_id: String(user.id),
    name: meta.gamertag || meta.full_name || meta.fullName || user.email?.split('@')[0] || 'Player',
    online_at: new Date().toISOString(),
  };

  channel
    .on('presence', { event: 'sync' }, publish)
    .on('presence', { event: 'join' }, publish)
    .on('presence', { event: 'leave' }, publish)
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try { await channel.track(payload); } catch (e) { /* le battement de cœur prend le relais */ }
      }
    });

  // Quitter proprement quand l'onglet se ferme : les amis voient le départ
  // tout de suite au lieu d'attendre l'expiration côté serveur.
  const onUnload = () => { try { channel.untrack(); } catch (e) { /* ignore */ } };
  window.addEventListener('pagehide', onUnload);

  return () => {
    window.removeEventListener('pagehide', onUnload);
    try { channel.untrack(); } catch (e) { /* ignore */ }
    try { supabase.removeChannel(channel); } catch (e) { /* ignore */ }
  };
}

/**
 * Lance le battement de cœur : `beat()` tout de suite, puis toutes les
 * HEARTBEAT_MS et à chaque retour sur l'onglet. `beat` renvoie false quand le
 * serveur ne connaît pas `last_seen_at` : on arrête alors d'insister.
 */
export function startHeartbeat(beat) {
  if (typeof window === 'undefined') return () => {};
  let stopped = false;
  let supported = true;

  const tick = async () => {
    if (stopped || !supported) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    try {
      const ok = await beat();
      if (ok === false) supported = false;
    } catch (e) { /* hors ligne : on réessaie au prochain battement */ }
  };

  tick();
  const timer = window.setInterval(tick, HEARTBEAT_MS);
  const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    stopped = true;
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
