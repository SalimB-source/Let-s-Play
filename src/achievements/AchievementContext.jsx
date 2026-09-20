import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { ACHIEVEMENTS, achievementLabel } from './catalog';
import { createState, evaluate, levelUpBetween, mergeStates, normalizeState, reduce, statesMatch, summarize } from './engine';
import { REMOTE_META_KEY, clearStorage, readStorage, writeStorage } from './storage';

/**
 * Contexte des succès.
 * --------------------
 * Il expose tout ce dont une page a besoin :
 *
 *   - `track(type, payload)` — signale une action faite par le joueur
 *     (`article_read`, `video_played`, `comment_posted`, …). L'état est
 *     mis à jour, la progression enregistrée, et les succès nouvellement
 *     obtenus remontent dans `notifications` — la file que les notifications
 *     de déblocage (`AchievementPopup`) affichent en pile ;
 *   - `summary` — succès, progression, XP et niveau (déduit du catalogue) ;
 *   - `reset()` — efface la progression locale.
 *
 * Le contexte par défaut est *inerte* (pas de provider = pas d'erreur, les
 * pages se contentent d'un état vide) : c'est ce qui permet de rendre une page
 * seule, en SSR, dans les scripts de vérification.
 */

const EMPTY_SUMMARY = summarize(createState());

const noop = () => {};

// Exporté : il permet de monter un composant des succès (les notifications de
// déblocage) avec une file d'attente donnée, dans les scripts de vérification.
export const AchievementsContext = createContext({
  ready: false,
  state: createState(),
  summary: EMPTY_SUMMARY,
  notifications: [],
  dismissNotification: noop,
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
  // File des succès à fêter : `{ id, levelUp }`, le premier de la file est
  // celui que la fenêtre affiche.
  const [notifications, setNotifications] = useState([]);
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

  // Quatre fenêtres au maximum dans la file : une rafale de succès (premier
  // passage sur une page riche en actions) ne se transforme pas en longue
  // séance de clics. Les succès écartés restent obtenus et visibles sur la
  // page /achievements.
  const enqueueNotifications = useCallback((ids, levelUp) => {
    if (!ids.length) return;
    setNotifications((current) => [
      ...current,
      ...ids.map((id) => ({ id, levelUp: levelUp || null })),
    ].slice(-4));
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
    const previous = stateRef.current;
    stateRef.current = nextState;
    setState(nextState);
    writeStorage(nextState);
    // Le passage de niveau est calculé avant/après : la notification peut
    // ainsi annoncer « NIVEAU 4 ATTEINT » avec le succès qui l'a déclenché.
    if (unlocked.length) enqueueNotifications(unlocked, levelUpBetween(previous, nextState));
    scheduleRemoteSync(nextState);
  }, [enqueueNotifications, scheduleRemoteSync]);

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

  // Fermer une notification (clic ou minuteur) retire le succès de la file ;
  // `dismissAll` la vide.
  const dismissNotification = useCallback((id) => {
    setNotifications((current) => {
      const index = current.findIndex((entry) => entry.id === id);
      if (index === -1) return current;
      return [...current.slice(0, index), ...current.slice(index + 1)];
    });
  }, []);

  const dismissAllNotifications = useCallback(() => setNotifications([]), []);

  const reset = useCallback(() => {
    clearStorage();
    const fresh = createState();
    stateRef.current = fresh;
    lastSynced.current = null;
    setSynced(false);
    setState(fresh);
    setNotifications([]);
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
    notifications,
    dismissNotification,
    dismissAllNotifications,
    track,
    reset,
    synced: Boolean(accountId) && synced,
  }), [state, summary, notifications, dismissNotification, dismissAllNotifications, track, reset, synced, accountId]);

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

/** Contenu prêt à afficher pour un succès nouvellement débloqué. */
export function notificationCopy(achievementId, lang = 'en') {
  const achievement = ACHIEVEMENTS.find((entry) => entry.id === achievementId);
  if (!achievement) return null;
  const label = achievementLabel(achievement, lang);
  return {
    id: achievement.id,
    icon: achievement.icon,
    name: label.name,
    desc: label.desc,
    xp: achievement.xp,
    rarity: achievement.rarity,
  };
}
