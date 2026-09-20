import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { ACHIEVEMENTS, achievementLabel } from './catalog';
import { createState, evaluate, mergeStates, normalizeState, reduce, statesMatch, summarize } from './engine';
import { REMOTE_META_KEY, clearStorage, readStorage, writeStorage } from './storage';

/**
 * Contexte des succès.
 * --------------------
 * Il expose tout ce dont une page a besoin :
 *
 *   - `track(type, payload)` — signale une action faite par le joueur
 *     (`article_read`, `video_played`, `comment_posted`, …). L'état est
 *     mis à jour, la progression enregistrée, et les succès nouvellement
 *     obtenus remontent dans `toasts` ;
 *   - `summary` — succès, progression, XP et niveau (déduit du catalogue) ;
 *   - `reset()` — efface la progression locale.
 *
 * Le contexte par défaut est *inerte* (pas de provider = pas d'erreur, les
 * pages se contentent d'un état vide) : c'est ce qui permet de rendre une page
 * seule, en SSR, dans les scripts de vérification.
 */

const EMPTY_SUMMARY = summarize(createState());

const noop = () => {};

const AchievementsContext = createContext({
  ready: false,
  state: createState(),
  summary: EMPTY_SUMMARY,
  toasts: [],
  dismissToast: noop,
  track: noop,
  reset: noop,
  synced: false,
});

export function AchievementProvider({ children }) {
  const { user, isDemo } = useAuth();
  // Un utilisateur de démonstration n'a pas de session Supabase : sa
  // progression reste locale, comme celle d'un visiteur non connecté.
  const accountId = !isDemo && user?.id ? user.id : null;

  const [state, setState] = useState(() => evaluate(normalizeState(readStorage())).state);
  const [toasts, setToasts] = useState([]);
  const [synced, setSynced] = useState(false);

  // L'état courant est aussi gardé dans une ref : `track()` peut enchaîner
  // plusieurs actions dans le même tick (route + langue au premier rendu)
  // sans attendre un nouveau rendu pour repartir de la dernière version.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const syncTimer = useRef(null);
  const lastSynced = useRef(null);

  // Trois notifications au maximum à l'écran : une rafale de succès (premier
  // passage sur une page riche en actions) ne masque jamais tout le site.
  const pushToasts = useCallback((ids) => {
    if (!ids.length) return;
    setToasts((current) => [...current, ...ids].slice(-3));
  }, []);

  // Écriture différée côté compte : une seule requête pour une rafale
  // d'actions (plusieurs succès d'affilée, navigation rapide).
  const scheduleRemoteSync = useCallback((nextState) => {
    if (!accountId || !supabase) return;
    if (lastSynced.current && statesMatch(lastSynced.current, nextState)) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      syncTimer.current = null;
      lastSynced.current = nextState;
      try {
        const { error } = await supabase.auth.updateUser({
          data: { [REMOTE_META_KEY]: { ...nextState, updatedAt: new Date().toISOString() } },
        });
        if (!error) setSynced(true);
      } catch (e) {
        /* hors ligne : la copie locale reste la référence */
      }
    }, 1500);
  }, [accountId]);

  const commit = useCallback((nextState, unlocked = []) => {
    stateRef.current = nextState;
    setState(nextState);
    writeStorage(nextState);
    if (unlocked.length) pushToasts(unlocked);
    scheduleRemoteSync(nextState);
  }, [pushToasts, scheduleRemoteSync]);

  const track = useCallback((type, payload = {}) => {
    if (!type) return;
    const action = { ...payload, type, at: payload.at || new Date().toISOString() };
    const { state: nextState, unlocked } = reduce(stateRef.current, action);
    commit(nextState, unlocked);
  }, [commit]);

  // À la connexion : fusion de la progression locale avec celle du compte.
  useEffect(() => {
    if (!accountId) return;
    const remote = user?.user_metadata?.[REMOTE_META_KEY];
    if (!remote) {
      // Première connexion : on publie la progression de l'appareil.
      scheduleRemoteSync(stateRef.current);
      return;
    }
    const merged = evaluate(mergeStates(stateRef.current, remote));
    if (statesMatch(merged.state, stateRef.current)) {
      lastSynced.current = merged.state; // rien à écrire : le compte est à jour
      return;
    }
    stateRef.current = merged.state;
    setState(merged.state);
    writeStorage(merged.state);
    // Les succès déjà obtenus sur un autre appareil ne sont pas rejoués : ils
    // sont simplement présents. L'union repart vers le compte pour que les
    // deux appareils convergent.
    lastSynced.current = null;
    setSynced(true);
    scheduleRemoteSync(merged.state);
  }, [accountId, user?.id, scheduleRemoteSync]);

  // Changement de compte (déconnexion) : la progression locale reste celle de
  // l'appareil, sans la copie du compte précédent.
  useEffect(() => () => { if (syncTimer.current) clearTimeout(syncTimer.current); }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => {
      const index = current.indexOf(id);
      if (index === -1) return current;
      return [...current.slice(0, index), ...current.slice(index + 1)];
    });
  }, []);

  const reset = useCallback(() => {
    clearStorage();
    const fresh = createState();
    stateRef.current = fresh;
    lastSynced.current = null;
    setSynced(false);
    setState(fresh);
    setToasts([]);
    if (accountId && supabase) {
      try {
        Promise.resolve(supabase.auth.updateUser({ data: { [REMOTE_META_KEY]: fresh } })).catch(() => {});
      } catch (e) {
        /* la copie locale est déjà effacée : le compte suivra à la prochaine action */
      }
    }
  }, [accountId]);

  const summary = useMemo(() => summarize(state), [state]);

  const value = useMemo(() => ({
    ready: true,
    state,
    summary,
    toasts,
    dismissToast,
    track,
    reset,
    synced: Boolean(accountId) && synced,
  }), [state, summary, toasts, dismissToast, track, reset, synced, accountId]);

  return <AchievementsContext.Provider value={value}>{children}</AchievementsContext.Provider>;
}

/** Accès au contexte des succès (inerte hors provider). */
export function useAchievements() {
  return useContext(AchievementsContext);
}

/**
 * Raccourci pour les composants qui signalent une action :
 *   const track = useAchievementAction();
 *   track('comment_posted');
 */
export function useAchievementAction() {
  return useAchievements().track;
}

/** Message prêt à afficher pour un succès nouvellement débloqué. */
export function toastCopy(achievementId, lang = 'en') {
  const achievement = ACHIEVEMENTS.find((entry) => entry.id === achievementId);
  if (!achievement) return null;
  const label = achievementLabel(achievement, lang);
  return { id: achievement.id, icon: achievement.icon, name: label.name, desc: label.desc, xp: achievement.xp };
}
