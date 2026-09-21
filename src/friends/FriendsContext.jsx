import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import {
  DEMO_FRIENDS_SYNC_KEY,
  FRIENDS_TABLE,
  acceptFriendRequest,
  applyDemoAction,
  deleteFriendship,
  demoProfiles,
  demoRelations,
  fetchProfiles,
  fetchRelationships,
  isDuplicateFriendship,
  isMissingFriendsTable,
  isRecentlySeen,
  readDemoFriendState,
  relationsFromRows,
  searchDemoPlayers,
  searchProfiles,
  sendFriendRequest,
  touchPresence,
  writeDemoFriendState,
} from './friendsApi';
import { joinPresence, startHeartbeat } from './presence';
import { demoPresence, findDemoPlayer, isDemoPlayerId } from './demoRoster';

/**
 * Contexte des amis.
 * ------------------
 * Il expose à toute l'application :
 *
 *   - la liste d'amis (`friends`, chacun avec `online`), les demandes reçues
 *     (`incoming`) et envoyées (`outgoing`), déduites des relations du joueur
 *     connecté ;
 *   - les gestes : `sendRequest`, `accept`, `decline`, `cancel`, `unfriend`,
 *     `search` ; `relationWith(id)` pour afficher le bon bouton sur un profil ;
 *   - l'état de la fenêtre d'amis (`dockOpen`, `dockTab`) que le bouton
 *     « Mes amis » du hub et la fenêtre elle-même partagent.
 *
 * Comptes Supabase : relations dans `public.friendships`, présence temps réel
 * + battement de cœur (voir presence.js), rechargement à chaque changement de
 * la table (Realtime) et toutes les minutes en secours. Personas de
 * démonstration : communauté scriptée en localStorage, avec des joueurs qui
 * acceptent d'eux-mêmes les demandes pour donner vie à l'aperçu.
 *
 * Le contexte par défaut est *inerte* (pas de provider = pas d'erreur, tout
 * est vide et désactivé) : les pages se rendent seules en SSR dans les scripts
 * de vérification, sans monter le provider.
 */

const noop = () => {};
const asyncNoop = async () => {};
const EMPTY_SET = new Set();

export const FriendsContext = createContext({
  enabled: false,
  mode: 'none',
  status: 'idle',
  error: null,
  relations: {},
  friends: [],
  incoming: [],
  outgoing: [],
  onlineCount: 0,
  pendingCount: 0,
  relationWith: () => null,
  profileFor: () => null,
  isOnline: () => false,
  canBefriend: () => false,
  sendRequest: asyncNoop,
  accept: asyncNoop,
  decline: asyncNoop,
  cancel: asyncNoop,
  unfriend: asyncNoop,
  search: async () => [],
  refresh: asyncNoop,
  dockOpen: false,
  dockTab: 'friends',
  openDock: noop,
  closeDock: noop,
  toggleDock: noop,
  setDockTab: noop,
});

const DOCK_STORAGE_KEY = 'letsplay_friends_dock_open';
/** Rechargement de secours quand Realtime ne remonte rien. */
const POLL_MS = 60 * 1000;
/** Rafraîchit « vu il y a… » et la présence scriptée des personas. */
const TICK_MS = 30 * 1000;
/** Délai avant qu'un joueur démo « en ligne » accepte une demande. */
const DEMO_AUTO_ACCEPT_MS = 4500;

function readDockOpen() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DOCK_STORAGE_KEY) === '1';
  } catch (e) {
    return false;
  }
}

function persistDockOpen(open) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DOCK_STORAGE_KEY, open ? '1' : '0');
  } catch (e) { /* ignore */ }
}

function sortPlayers(a, b) {
  if (a.online !== b.online) return a.online ? -1 : 1;
  return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
}

export function FriendsProvider({ children }) {
  const { user, isDemo } = useAuth();
  const uid = user?.id ? String(user.id) : null;
  const mode = !uid ? 'none' : isDemo ? 'demo' : supabase ? 'supabase' : 'none';

  const [relations, setRelations] = useState({});
  const [profiles, setProfiles] = useState({});
  const [presentIds, setPresentIds] = useState(EMPTY_SET);
  // 'idle' | 'loading' | 'ready' | 'error' | 'unavailable' (table absente)
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [dockOpen, setDockOpenState] = useState(readDockOpen);
  const [dockTab, setDockTab] = useState('friends');

  // Dernier utilisateur connu (battement de cœur, présence) sans relancer les
  // effets à chaque édition de profil.
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const demoStateRef = useRef(null);
  const demoTimers = useRef(new Map());
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  /* --------------------------- chargement (Supabase) --------------------------- */

  const load = useCallback(async () => {
    if (mode !== 'supabase' || !uid) return;
    try {
      const rows = await fetchRelationships(uid);
      if (!mountedRef.current) return;
      const next = relationsFromRows(rows, uid);
      let fetched = {};
      try {
        fetched = await fetchProfiles(Object.keys(next));
      } catch (e) { /* les profils sont facultatifs : l'identifiant s'affiche */ }
      if (!mountedRef.current) return;
      setRelations(next);
      setProfiles((prev) => ({ ...prev, ...fetched }));
      setStatus('ready');
      setError(null);
    } catch (e) {
      if (!mountedRef.current) return;
      if (isMissingFriendsTable(e)) {
        setStatus('unavailable');
        setError(null);
      } else {
        setError(e);
        setStatus((current) => (current === 'ready' ? current : 'error'));
      }
    }
  }, [mode, uid]);

  /* --------------------------- chargement (démo) ------------------------------ */

  const commitDemo = useCallback((nextState) => {
    demoStateRef.current = nextState;
    setRelations(demoRelations(nextState, uid));
    if (userRef.current) writeDemoFriendState(userRef.current, nextState);
  }, [uid]);

  const loadDemo = useCallback(() => {
    if (mode !== 'demo' || !userRef.current) return;
    const state = readDemoFriendState(userRef.current);
    demoStateRef.current = state;
    setRelations(demoRelations(state, uid));
    setProfiles(demoProfiles());
    setStatus('ready');
    setError(null);
  }, [mode, uid]);

  /* ------------------------------ cycle de vie -------------------------------- */

  // Changement de compte (connexion, déconnexion, autre persona) : on repart
  // de zéro pour ne jamais montrer les amis du joueur précédent.
  useEffect(() => {
    setRelations({});
    setProfiles({});
    setPresentIds(EMPTY_SET);
    setError(null);
    demoStateRef.current = null;
    for (const timer of demoTimers.current.values()) clearTimeout(timer);
    demoTimers.current.clear();

    if (mode === 'supabase') {
      setStatus('loading');
      load();
    } else if (mode === 'demo') {
      loadDemo();
    } else {
      setStatus('idle');
    }
  }, [mode, uid, load, loadDemo]);

  // Comptes Supabase : présence temps réel, battement de cœur, écoute de la
  // table des relations, rechargement de secours et au retour sur l'onglet.
  useEffect(() => {
    if (mode !== 'supabase' || !uid || !supabase) return undefined;

    const leavePresence = joinPresence(userRef.current, (ids) => {
      if (mountedRef.current) setPresentIds(ids);
    });
    const stopHeartbeat = startHeartbeat(() => touchPresence(userRef.current));

    let reloadTimer = null;
    const scheduleReload = () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      reloadTimer = setTimeout(() => { reloadTimer = null; load(); }, 400);
    };

    let channel = null;
    try {
      channel = supabase
        .channel(`friendships:${uid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: FRIENDS_TABLE, filter: `addressee_id=eq.${uid}` }, scheduleReload)
        .on('postgres_changes', { event: '*', schema: 'public', table: FRIENDS_TABLE, filter: `requester_id=eq.${uid}` }, scheduleReload)
        .subscribe();
    } catch (e) {
      channel = null;
    }

    const poll = setInterval(load, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      leavePresence();
      stopHeartbeat();
      if (channel) {
        try { supabase.removeChannel(channel); } catch (e) { /* ignore */ }
      }
    };
  }, [mode, uid, load]);

  // Personas : l'état suit les autres onglets du même appareil.
  useEffect(() => {
    if (mode !== 'demo' || typeof window === 'undefined') return undefined;
    const onStorage = (event) => {
      if (event.key === DEMO_FRIENDS_SYNC_KEY) loadDemo();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [mode, loadDemo]);

  // Horloge : « vu il y a… », présence scriptée des personas, battement de
  // cœur périmé.
  useEffect(() => {
    if (mode === 'none' || typeof window === 'undefined') return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, [mode]);

  /* -------------------------------- lectures ---------------------------------- */

  const profileFor = useCallback((id) => {
    if (!id) return null;
    const base = profiles[id] || null;
    if (mode === 'demo') {
      const player = findDemoPlayer(id);
      if (!player) return base;
      const presence = demoPresence(player, now);
      return { ...(base || { id, name: player.gamertag, avatar: player.avatar, level: player.level, xp: player.xp }), lastSeenAt: presence.lastSeenAt };
    }
    return base || { id, name: String(id).slice(0, 8), avatar: null, level: 1, xp: null, lastSeenAt: null };
  }, [profiles, mode, now]);

  const isOnline = useCallback((id) => {
    if (!id) return false;
    if (id === uid) return true;
    if (mode === 'demo') return demoPresence(findDemoPlayer(id), now).online;
    if (presentIds.has(id)) return true;
    return isRecentlySeen(profiles[id]?.lastSeenAt, now);
  }, [uid, mode, now, presentIds, profiles]);

  const relationWith = useCallback((id) => (id ? relations[id] || null : null), [relations]);

  const canBefriend = useCallback((id) => {
    if (!id || id === uid || mode === 'none') return false;
    if (mode === 'demo') return Boolean(findDemoPlayer(id));
    return !isDemoPlayerId(id);
  }, [uid, mode]);

  const { friends, incoming, outgoing } = useMemo(() => {
    const lists = { friends: [], incoming: [], outgoing: [] };
    for (const [id, relation] of Object.entries(relations)) {
      const entry = { ...profileFor(id), id, online: isOnline(id), since: relation.since, rowId: relation.rowId };
      if (relation.kind === 'friend') lists.friends.push(entry);
      else if (relation.kind === 'incoming') lists.incoming.push(entry);
      else if (relation.kind === 'outgoing') lists.outgoing.push(entry);
    }
    lists.friends.sort(sortPlayers);
    lists.incoming.sort(sortPlayers);
    lists.outgoing.sort(sortPlayers);
    return lists;
  }, [relations, profileFor, isOnline]);

  const onlineCount = useMemo(() => friends.filter((friend) => friend.online).length, [friends]);

  /* --------------------------------- gestes ----------------------------------- */

  const rememberProfiles = useCallback((list) => {
    if (!list?.length) return;
    setProfiles((prev) => {
      const next = { ...prev };
      for (const profile of list) if (profile?.id) next[profile.id] = { ...prev[profile.id], ...profile };
      return next;
    });
  }, []);

  const mutateDemo = useCallback((action, otherId) => {
    const current = demoStateRef.current || readDemoFriendState(userRef.current);
    const next = applyDemoAction(current, action, otherId);
    if (next !== current) commitDemo(next);
    return next;
  }, [commitDemo]);

  // Un joueur scripté « en ligne » accepte la demande peu après : l'aperçu de
  // démonstration montre ainsi le passage demande → ami.
  const scheduleDemoAutoAccept = useCallback((otherId) => {
    const player = findDemoPlayer(otherId);
    if (!player || !demoPresence(player, Date.now()).online) return;
    if (demoTimers.current.has(otherId)) clearTimeout(demoTimers.current.get(otherId));
    demoTimers.current.set(otherId, setTimeout(() => {
      demoTimers.current.delete(otherId);
      if (mountedRef.current) mutateDemo('auto-accept', otherId);
    }, DEMO_AUTO_ACCEPT_MS));
  }, [mutateDemo]);

  const accept = useCallback(async (otherId) => {
    const relation = relations[otherId];
    if (!relation || relation.kind !== 'incoming') return;
    if (mode === 'demo') { mutateDemo('accept', otherId); return; }
    if (!relation.rowId) return;
    const previous = relations;
    setRelations((prev) => ({ ...prev, [otherId]: { ...relation, kind: 'friend', since: new Date().toISOString() } }));
    try {
      await acceptFriendRequest(relation.rowId);
    } catch (e) {
      if (mountedRef.current) setRelations(previous);
      throw e;
    }
  }, [relations, mode, mutateDemo]);

  const sendRequest = useCallback(async (otherId) => {
    if (!canBefriend(otherId)) return;
    const existing = relations[otherId];
    if (existing?.kind === 'incoming') { await accept(otherId); return; }
    if (existing) return;
    if (mode === 'demo') {
      mutateDemo('send', otherId);
      scheduleDemoAutoAccept(otherId);
      return;
    }
    setRelations((prev) => ({ ...prev, [otherId]: { rowId: null, kind: 'outgoing', since: new Date().toISOString() } }));
    try {
      const row = await sendFriendRequest(uid, otherId);
      if (!mountedRef.current) return;
      if (!row) {
        // Demande croisée acceptée côté serveur : la liste fait foi.
        await load();
        return;
      }
      setRelations((prev) => ({ ...prev, [otherId]: { rowId: row.id, kind: 'outgoing', since: row.created_at } }));
      try {
        rememberProfiles(Object.values(await fetchProfiles([otherId])));
      } catch (e) { /* facultatif */ }
    } catch (e) {
      if (!mountedRef.current) return;
      if (isDuplicateFriendship(e)) { await load(); return; }
      setRelations((prev) => {
        const next = { ...prev };
        delete next[otherId];
        return next;
      });
      throw e;
    }
  }, [canBefriend, relations, accept, mode, mutateDemo, scheduleDemoAutoAccept, uid, rememberProfiles, load]);

  // Refuser une demande reçue, annuler la sienne, retirer un ami : la
  // relation disparaît dans les trois cas.
  const removeRelation = useCallback(async (otherId, demoAction) => {
    const relation = relations[otherId];
    if (!relation) return;
    if (mode === 'demo') {
      if (demoTimers.current.has(otherId)) {
        clearTimeout(demoTimers.current.get(otherId));
        demoTimers.current.delete(otherId);
      }
      mutateDemo(demoAction, otherId);
      return;
    }
    if (!relation.rowId) return;
    const previous = relations;
    setRelations((prev) => {
      const next = { ...prev };
      delete next[otherId];
      return next;
    });
    try {
      await deleteFriendship(relation.rowId);
    } catch (e) {
      if (mountedRef.current) setRelations(previous);
      throw e;
    }
  }, [relations, mode, mutateDemo]);

  const decline = useCallback((otherId) => removeRelation(otherId, 'decline'), [removeRelation]);
  const cancel = useCallback((otherId) => removeRelation(otherId, 'cancel'), [removeRelation]);
  const unfriend = useCallback((otherId) => removeRelation(otherId, 'unfriend'), [removeRelation]);

  const search = useCallback(async (query) => {
    if (mode === 'demo') return searchDemoPlayers(query, uid);
    if (mode !== 'supabase') return [];
    const results = await searchProfiles(query, uid);
    rememberProfiles(results);
    return results;
  }, [mode, uid, rememberProfiles]);

  const refresh = useCallback(async () => {
    if (mode === 'demo') loadDemo();
    else await load();
  }, [mode, loadDemo, load]);

  /* ------------------------------ fenêtre d'amis ------------------------------ */

  const setDockOpen = useCallback((open) => {
    setDockOpenState(open);
    persistDockOpen(open);
  }, []);
  const openDock = useCallback((tab) => {
    if (tab) setDockTab(tab);
    setDockOpen(true);
  }, [setDockOpen]);
  const closeDock = useCallback(() => setDockOpen(false), [setDockOpen]);
  const toggleDock = useCallback(() => setDockOpenState((open) => {
    persistDockOpen(!open);
    return !open;
  }), []);

  const value = useMemo(() => ({
    enabled: mode !== 'none',
    mode,
    status,
    error,
    relations,
    friends,
    incoming,
    outgoing,
    onlineCount,
    pendingCount: incoming.length,
    relationWith,
    profileFor,
    isOnline,
    canBefriend,
    sendRequest,
    accept,
    decline,
    cancel,
    unfriend,
    search,
    refresh,
    dockOpen,
    dockTab,
    openDock,
    closeDock,
    toggleDock,
    setDockTab,
  }), [
    mode, status, error, relations, friends, incoming, outgoing, onlineCount,
    relationWith, profileFor, isOnline, canBefriend,
    sendRequest, accept, decline, cancel, unfriend, search, refresh,
    dockOpen, dockTab, openDock, closeDock, toggleDock,
  ]);

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

export function useFriends() {
  return useContext(FriendsContext);
}
