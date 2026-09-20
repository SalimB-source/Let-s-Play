import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { ACHIEVEMENTS, achievementIconUrl, achievementLabel } from './catalog';
import { createState, evaluate, levelUpBetween, mergeStates, normalizeState, reduce, statesMatch, summarize } from './engine';
import { GUEST_SCOPE, clearStorage, readStorage, scopeForUser, writeStorage } from './storage';
import { clearAccountState, fetchAccountState, saveAccountState } from './remote';

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
 *   - `reset()` — efface la progression (locale + copie du compte).
 *
 * Chaque joueur possède sa progression :
 *
 *   - **Visiteur** (sans compte) : progression de l'appareil, clé locale
 *     « invité » — le site statique fonctionne sans backend ;
 *   - **Compte connecté** : la copie serveur (`player_progress`, une ligne
 *     par compte) est LA référence. Elle est chargée à la connexion et
 *     fusionnée seulement avec le cache local *du même compte* — jamais avec
 *     la progression de l'appareil ni d'un autre compte. Un compte neuf
 *     démarre donc au niveau 1, même sur un appareil qui a déjà joué, et la
 *     progression suit le joueur d'un appareil à l'autre.
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
  const accountId = !isDemo && user?.id ? String(user.id) : null;
  const scope = accountId ? scopeForUser(accountId) : GUEST_SCOPE;

  const [state, setState] = useState(() => evaluate(normalizeState(readStorage(scope))).state);
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
      const written = await saveAccountState(accountId, nextState);
      if (written) setSynced(true);
      // Échec (hors ligne) : la copie locale reste la référence, la prochaine
      // action relancera l'écriture.
    }, 1500);
  }, [accountId]);

  const commit = useCallback((nextState, unlocked = []) => {
    const previous = stateRef.current;
    stateRef.current = nextState;
    setState(nextState);
    writeStorage(nextState, scope);
    // Le passage de niveau est calculé avant/après : la notification peut
    // ainsi annoncer « NIVEAU 4 ATTEINT » avec le succès qui l'a déclenché.
    if (unlocked.length) enqueueNotifications(unlocked, levelUpBetween(previous, nextState));
    scheduleRemoteSync(nextState);
  }, [enqueueNotifications, scheduleRemoteSync, scope]);

  const track = useCallback((type, payload = {}) => {
    if (!type) return;
    const action = { ...payload, type, at: payload.at || new Date().toISOString() };
    const { state: nextState, unlocked } = reduce(stateRef.current, action);
    commit(nextState, unlocked);
  }, [commit]);

  // Chargement du compte (et bascule invité ↔ compte, connexion/déconnexion).
  // On repart du cache local DU SCOPE courant : celui du compte connecté, ou
  // celui de l'appareil pour un visiteur — jamais celui d'un autre compte.
  useEffect(() => {
    // Une écriture en attente pour le scope précédent ne doit pas partir
    // après la bascule : elle serait écrite sur le mauvais compte.
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = null;
    const cached = evaluate(normalizeState(readStorage(scope))).state;
    stateRef.current = cached;
    setState(cached);
    setSynced(false);
    setNotifications([]);
    lastSynced.current = null;

    if (!accountId || !supabase) return undefined;
    let cancelled = false;
    (async () => {
      const remote = await fetchAccountState(accountId);
      if (cancelled) return;
      // La copie serveur du compte est la référence : on l'unit seulement au
      // cache du même compte (actions faites pendant le chargement, session
      // déjà ouverte sur cet appareil). La progression d'un visiteur ou d'un
      // autre compte n'entre jamais ici.
      const merged = remote.state
        ? evaluate(mergeStates(cached, remote.state)).state
        : cached;
      stateRef.current = merged;
      setState(merged);
      writeStorage(merged, scope);

      if (remote.source === 'unavailable') return; // hors ligne : le cache local fait foi
      if (remote.source === 'table' && statesMatch(merged, remote.state)) {
        lastSynced.current = merged; // déjà à jour : rien à écrire
        setSynced(true);
        return;
      }
      // 'none' (compte neuf : publier son état, vide ou presque) —
      // 'metadata' (migrer l'ancienne copie du compte vers la table) —
      // ou 'table' enrichi par des actions locales en attente.
      scheduleRemoteSync(merged);
    })();
    return () => { cancelled = true; };
  }, [accountId, scope, scheduleRemoteSync]);

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
    // Pas d'écriture en attente : l'état d'avant la réinitialisation ne doit
    // pas repartir vers le serveur après coup.
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = null;
    clearStorage(scope);
    const fresh = createState();
    stateRef.current = fresh;
    lastSynced.current = null;
    setSynced(false);
    setState(fresh);
    setNotifications([]);
    // Compte connecté : la copie serveur est effacée aussi, sinon la
    // progression reviendrait au prochain chargement ou sur un autre appareil.
    if (accountId && supabase) {
      Promise.resolve(clearAccountState(accountId)).catch(() => {});
    }
  }, [accountId, scope]);

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
    icon: achievementIconUrl(achievement.icon),
    name: label.name,
    desc: label.desc,
    xp: achievement.xp,
    rarity: achievement.rarity,
  };
}
