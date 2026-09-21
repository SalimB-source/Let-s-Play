import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useMediaQuery from '../lib/useMediaQuery';
import { useAuth } from '../auth/AuthContext';
import { useFriends } from '../friends/FriendsContext';
import { DEMO_REPLY_DELAY_MS, dueDemoIncoming } from './demoThreads';
import { playMessageSound } from './notificationSound';
import {
  DEMO_MESSAGES_SYNC_KEY,
  MESSAGES_TABLE,
  appendMessage,
  applyDemoBlock,
  applyDemoDelete,
  applyDemoIncoming,
  applyDemoRead,
  applyDemoReply,
  applyDemoReport,
  applyDemoSend,
  applyDemoUnblock,
  applyReadReceipt,
  blockPeer,
  conversationKey,
  deleteMessage as deleteMessageApi,
  demoThreads,
  fetchBlockedIds,
  fetchRecentMessages,
  fetchReportedIds,
  fetchThread,
  fetchUnreadSenders,
  isMissingMessagesTable,
  markThreadRead,
  markThreadReadLocal,
  mergeUnread,
  prepareBody,
  readDemoMessages,
  removeMessage,
  removeMessageById,
  reportPeer,
  sendMessage,
  sortThreadsByActivity,
  threadsFromRows,
  unreadFromRows,
  unblockPeer,
  writeDemoMessages,
  normalizeMessage,
} from './messagesApi';

/**
 * Contexte de la messagerie.
 * --------------------------
 * Il expose à toute l'application :
 *
 *   - les discussions (`conversations`, chacune avec son dernier message et
 *     son nombre de **non-lus**), le total `unreadTotal` qui alimente le badge
 *     du lanceur, et les joueurs **bloqués** ;
 *   - les gestes : `openThread`, `openInbox`, `viewThread`, `send`, `markRead`,
 *     `block`, `unblock`, `report` ; `canMessage(id)` pour afficher ou non le
 *     bouton « Message » d'un profil (il faut être amis) ;
 *   - l'état de la messagerie dans la **fenêtre sociale unifiée**
 *     (`src/social/SocialDock.jsx`) : `activePeerId` (la discussion ouverte)
 *     et `dockOpen` ; `openThread` / `openInbox` ouvrent la fenêtre sur
 *     l'onglet « Messages » en passant par le contexte des amis, qui porte
 *     l'onglet actif de la fenêtre.
 *
 * **Sur mobile (≤ 760 px)**, la messagerie est une vraie **page** et non le
 * pop-up : `openThread` / `openInbox` naviguent vers `/messages` (et
 * `/messages/:peerId` pour une discussion, alias `/messagerie`). La fenêtre
 * sociale reste le parcours du bureau, et la page rend le pop-up inutile là-bas.
 * `viewThread(peerId)` suit la discussion affichée par la page (sans ouvrir la
 * fenêtre) : le « ding » d'un message reçu est coupé quand on la regarde.
 *
 * Comptes Supabase : messages dans `public.direct_messages`, arrivée en direct
 * par Realtime (`postgres_changes` sur la clé de conversation ouverte, et sur
 * les messages reçus pour le badge), accusé de lecture à l'ouverture d'une
 * discussion, rechargement toutes les minutes en secours. Personas de
 * démonstration : discussions scriptées en localStorage, réponses des joueurs
 * « en ligne » et messages qui arrivent tout seuls.
 *
 * À chaque message reçu (temps réel, réponse démo ou message scripté) un « ding »
 * discret est joué (`./notificationSound`) — sauf si l'utilisateur regarde
 * déjà la discussion en question.
 *
 * Le contexte par défaut est *inerte* (pas de provider = pas d'erreur, tout est
 * vide et désactivé) : les pages se rendent seules en SSR dans les scripts de
 * vérification, sans monter le provider. Il se place **dans** le provider des
 * amis : la messagerie est réservée aux amis.
 */

const noop = () => {};
const asyncNoop = async () => {};

export const MessagesContext = createContext({
  enabled: false,
  mode: 'none',
  status: 'idle',
  error: null,
  threads: {},
  conversations: [],
  blockedConversations: [],
  unreadTotal: 0,
  unreadFor: () => 0,
  threadFor: () => null,
  canMessage: () => false,
  isBlocked: () => false,
  reportedReason: () => null,
  send: asyncNoop,
  deleteMessage: asyncNoop,
  markRead: asyncNoop,
  block: asyncNoop,
  unblock: asyncNoop,
  report: asyncNoop,
  refresh: asyncNoop,
  dockOpen: false,
  activePeerId: null,
  openThread: noop,
  openInbox: noop,
  viewThread: noop,
  backToInbox: noop,
  closeDock: noop,
});

const DOCK_STORAGE_KEY = 'letsplay_messages_open';
const ACTIVE_STORAGE_KEY = 'letsplay_messages_active';
/** Rechargement de secours quand Realtime ne remonte rien. */
const POLL_MS = 60 * 1000;
/** Vérification des messages scriptés de l'aperçu démo. */
const DEMO_TICK_MS = 5 * 1000;

function readStored(key) {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function readDockOpen() {
  return readStored(DOCK_STORAGE_KEY) === '1';
}

function persistDockOpen(open) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DOCK_STORAGE_KEY, open ? '1' : '0');
  } catch (e) { /* ignore */ }
}

function readActivePeer() {
  return readStored(ACTIVE_STORAGE_KEY) || null;
}

function persistActivePeer(peerId) {
  if (typeof window === 'undefined') return;
  try {
    if (peerId) window.localStorage.setItem(ACTIVE_STORAGE_KEY, peerId);
    else window.localStorage.removeItem(ACTIVE_STORAGE_KEY);
  } catch (e) { /* ignore */ }
}

export function MessagesProvider({ children }) {
  const { user, isDemo } = useAuth();
  const friends = useFriends();
  const navigate = useNavigate();
  // Sur mobile, la messagerie s'ouvre sur la page dédiée (/messages) plutôt
  // que dans le pop-up de la fenêtre sociale.
  const isMobile = useMediaQuery('(max-width: 760px)');
  const uid = user?.id ? String(user.id) : null;
  const mode = !uid ? 'none' : isDemo ? 'demo' : supabase ? 'supabase' : 'none';

  // Personas : l'état scripté est lu dès le premier rendu (le lanceur affiche
  // donc ses non-lus sans attendre le montage, et le rendu SSR des scripts de
  // vérification montre de vraies discussions).
  const [threads, setThreads] = useState(() => (
    mode === 'demo' && user ? demoThreads(readDemoMessages(user), uid) : {}
  ));
  const [blockedIds, setBlockedIds] = useState(() => (
    mode === 'demo' && user ? [...(readDemoMessages(user).blocked || [])] : []
  ));
  const [reported, setReported] = useState(() => (
    mode === 'demo' && user ? { ...(readDemoMessages(user).reported || {}) } : {}
  ));
  // 'idle' | 'loading' | 'ready' | 'error' | 'unavailable' (table absente).
  // Personas : les discussions scriptées sont lues au premier rendu, donc
  // l'état est « ready » dès le départ (comme le contexte des amis) — le
  // rendu SSR des scripts de vérification montre de vraies discussions.
  const [status, setStatus] = useState(() => (isDemo && user ? 'ready' : 'idle'));
  const [error, setError] = useState(null);
  const [dockOpen, setDockOpenState] = useState(readDockOpen);
  const [activePeerId, setActivePeerId] = useState(readActivePeer);

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const demoStateRef = useRef(null);
  const demoTimers = useRef(new Map());
  const activeRef = useRef(activePeerId);
  useEffect(() => { activeRef.current = activePeerId; }, [activePeerId]);
  const dockOpenRef = useRef(dockOpen);
  useEffect(() => { dockOpenRef.current = dockOpen; }, [dockOpen]);
  // La page /messages affiche un fil via l'URL : on retient lequel pour ne
  // pas jouer le « ding » des messages qui y arrivent sous les yeux du joueur.
  const viewedRef = useRef(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  /**
   * « Ding » d'un message reçu. Pas de son si l'utilisateur regarde déjà la
   * discussion en question (fenêtre ouverte sur ce fil, ou fil affiché par la
   * page /messages) : il voit la bulle apparaître à l'écran, le son lui serait
   * inutile.
   */
  const chimeForIncoming = useCallback((peerId) => {
    if (viewedRef.current === peerId) return;
    if (dockOpenRef.current && activeRef.current === peerId) return;
    playMessageSound();
  }, []);

  /* --------------------------- chargement (Supabase) --------------------------- */

  const load = useCallback(async () => {
    if (mode !== 'supabase' || !uid) return;
    try {
      const rows = await fetchRecentMessages(uid);
      const unreadRows = await fetchUnreadSenders(uid);
      let blocked = [];
      let reports = {};
      try {
        blocked = await fetchBlockedIds(uid);
      } catch (e) { /* les blocages sont facultatifs : la discussion reste ouverte */ }
      try {
        reports = await fetchReportedIds(uid);
      } catch (e) { /* idem pour les signalements */ }
      if (!mountedRef.current) return;
      setThreads(mergeUnread(threadsFromRows(rows, uid), unreadFromRows(unreadRows, uid), uid));
      setBlockedIds(blocked);
      setReported(reports);
      setStatus('ready');
      setError(null);
    } catch (e) {
      if (!mountedRef.current) return;
      if (isMissingMessagesTable(e)) {
        setStatus('unavailable');
        setError(null);
      } else {
        setError(e);
        setStatus((current) => (current === 'ready' ? current : 'error'));
      }
    }
  }, [mode, uid]);

  /* ------------------------------ chargement (démo) ---------------------------- */

  const commitDemo = useCallback((nextState) => {
    demoStateRef.current = nextState;
    setThreads(demoThreads(nextState, uid));
    setBlockedIds([...(nextState.blocked || [])]);
    setReported({ ...(nextState.reported || {}) });
    if (userRef.current) writeDemoMessages(userRef.current, nextState);
  }, [uid]);

  const loadDemo = useCallback(() => {
    if (mode !== 'demo' || !userRef.current) return;
    const state = readDemoMessages(userRef.current);
    demoStateRef.current = state;
    setThreads(demoThreads(state, uid));
    setBlockedIds([...(state.blocked || [])]);
    setReported({ ...(state.reported || {}) });
    setStatus('ready');
    setError(null);
  }, [mode, uid]);

  const mutateDemo = useCallback((mutator) => {
    const current = demoStateRef.current || readDemoMessages(userRef.current);
    const next = mutator(current);
    if (next !== current) commitDemo(next);
    return next;
  }, [commitDemo]);

  /* -------------------------------- cycle de vie ------------------------------- */

  // Changement de compte (connexion, déconnexion, autre persona) : on repart de
  // zéro pour ne jamais montrer les messages du joueur précédent.
  useEffect(() => {
    setThreads({});
    setBlockedIds([]);
    setReported({});
    setError(null);
    setActivePeerId(null);
    viewedRef.current = null;
    persistActivePeer(null);
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

  // Comptes Supabase : messages reçus en direct, discussion ouverte en direct,
  // rechargement de secours et au retour sur l'onglet.
  useEffect(() => {
    if (mode !== 'supabase' || !uid || !supabase) return undefined;

    const channels = [];
    const subscribe = (name, setup) => {
      try {
        channels.push(setup(supabase.channel(name)));
      } catch (e) { /* Realtime indisponible : le rechargement prend le relais */ }
    };

    // Nouveau message reçu, quelle que soit la discussion : le badge des
    // non-lus bouge tout de suite. On écoute aussi les suppressions (effacer
    // ses propres messages) pour que les deux joueurs voient la bulle
    // disparaître en temps réel.
    subscribe(`messages:inbox:${uid}`, (channel) => channel
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: MESSAGES_TABLE, filter: `recipient_id=eq.${uid}`,
      }, (payload) => {
        if (!mountedRef.current) return;
        const row = payload?.new;
        if (!row?.id) return;
        setThreads((prev) => appendMessage(prev, uid, row));
        chimeForIncoming(row.sender_id);
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: MESSAGES_TABLE, filter: `recipient_id=eq.${uid}`,
      }, (payload) => {
        if (!mountedRef.current) return;
        const oldRow = payload?.old;
        if (!oldRow?.id) return;
        setThreads((prev) => removeMessageById(prev, oldRow.id));
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: MESSAGES_TABLE, filter: `sender_id=eq.${uid}`,
      }, (payload) => {
        if (!mountedRef.current) return;
        const oldRow = payload?.old;
        if (!oldRow?.id) return;
        setThreads((prev) => removeMessageById(prev, oldRow.id));
      })
      .subscribe());

    const poll = setInterval(load, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
      for (const channel of channels) {
        try { supabase.removeChannel(channel); } catch (e) { /* ignore */ }
      }
    };
  }, [mode, uid, load]);

  // Discussion ouverte : les messages de cet ami et ses accusés de lecture
  // arrivent en direct (le canal suit la discussion ouverte).
  useEffect(() => {
    if (mode !== 'supabase' || !uid || !activePeerId || !supabase) return undefined;
    const key = conversationKey(uid, activePeerId);
    if (!key) return undefined;

    let channel = null;
    try {
      channel = supabase
        .channel(`messages:thread:${uid}:${key}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: MESSAGES_TABLE, filter: `sender_id=eq.${activePeerId}`,
        }, (payload) => {
          if (!mountedRef.current) return;
          const row = payload?.new;
          if (!row?.id) return;
          setThreads((prev) => appendMessage(prev, uid, row));
        })
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: MESSAGES_TABLE, filter: `conversation_key=eq.${key}`,
        }, (payload) => {
          if (!mountedRef.current) return;
          const row = payload?.new;
          if (!row?.read_at) return;
          setThreads((prev) => applyReadReceipt(prev, row));
        })
        .on('postgres_changes', {
          event: 'DELETE', schema: 'public', table: MESSAGES_TABLE, filter: `conversation_key=eq.${key}`,
        }, (payload) => {
          if (!mountedRef.current) return;
          const oldRow = payload?.old;
          if (!oldRow?.id) return;
          setThreads((prev) => removeMessageById(prev, oldRow.id));
        })
        .subscribe();
    } catch (e) {
      channel = null;
    }

    // L'historique complet de la discussion (au-delà des 200 derniers messages
    // chargés pour la liste) est relu à l'ouverture.
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchThread(uid, activePeerId);
        if (cancelled || !mountedRef.current) return;
        setThreads((prev) => {
          const loaded = threadsFromRows(rows, uid)[activePeerId];
          if (!loaded) return prev;
          const current = prev[activePeerId];
          if (!current || loaded.messages.length > current.messages.length) {
            return { ...prev, [activePeerId]: { ...loaded, unread: current?.unread ?? loaded.unread } };
          }
          return prev;
        });
      } catch (e) { /* la liste chargée suffit */ }
    })();

    return () => {
      cancelled = true;
      if (channel) {
        try { supabase.removeChannel(channel); } catch (e) { /* ignore */ }
      }
    };
  }, [mode, uid, activePeerId]);

  // Personas : les messages scriptés arrivent à échéance, et l'état suit les
  // autres onglets du même appareil.
  useEffect(() => {
    if (mode !== 'demo' || typeof window === 'undefined') return undefined;
    const personaKey = userRef.current?.profileKey;
    const tick = () => {
      const state = demoStateRef.current;
      if (!state) return;
      let next = state;
      for (const event of dueDemoIncoming(state, personaKey, Date.now())) {
        next = applyDemoIncoming(next, event, Date.now());
        // Discussion ouverte : le message est lu dès son arrivée.
        if (activeRef.current === event.from) next = applyDemoRead(next, event.from);
        chimeForIncoming(event.from);
      }
      if (next !== state) commitDemo(next);
    };
    const timer = window.setInterval(tick, DEMO_TICK_MS);
    const onStorage = (event) => { if (event.key === DEMO_MESSAGES_SYNC_KEY) loadDemo(); };
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', onStorage);
    };
  }, [mode, commitDemo, loadDemo]);

  /* --------------------------------- lectures ---------------------------------- */

  const threadFor = useCallback((peerId) => (peerId ? threads[peerId] || null : null), [threads]);
  const unreadFor = useCallback((peerId) => threads[peerId]?.unread || 0, [threads]);
  const isBlocked = useCallback((peerId) => blockedIds.includes(peerId), [blockedIds]);
  const reportedReason = useCallback((peerId) => reported[peerId] || null, [reported]);

  const canMessage = useCallback((peerId) => {
    if (!peerId || peerId === uid || mode === 'none') return false;
    // Il faut être amis (et viser un joueur du même monde : communauté de
    // démonstration pour une persona, compte Supabase sinon).
    return friends.relationWith(peerId)?.kind === 'friend' && friends.canBefriend(peerId);
  }, [uid, mode, friends]);

  const blockedSet = useMemo(() => new Set(blockedIds), [blockedIds]);

  const friendsReady = friends.status === 'ready' || friends.status === 'unavailable';

  const { conversationList, blockedList } = useMemo(() => {
    const list = [];
    const blocked = [];
    // Les amis d'abord ; tant que la liste d'amis n'est pas chargée (premier
    // rendu, SSR), les discussions connues sont montrées telles quelles — la
    // messagerie est de toute façon réservée aux amis côté serveur.
    const peerIds = new Set(friends.friends.map((friend) => friend.id));
    if (!friendsReady) for (const peerId of Object.keys(threads)) peerIds.add(peerId);
    for (const peerId of peerIds) {
      const profile = friends.profileFor(peerId) || { id: peerId, name: String(peerId).slice(0, 8), avatar: null };
      const thread = threads[peerId] || null;
      const entry = {
        peerId,
        profile,
        thread,
        lastMessage: thread?.lastMessage || null,
        lastAt: thread?.lastAt || null,
        unread: thread?.unread || 0,
      };
      if (blockedSet.has(peerId)) blocked.push(entry);
      else list.push(entry);
    }
    return { conversationList: list, blockedList: blocked };
  }, [friends.friends, friends.profileFor, friendsReady, threads, blockedSet]);

  const orderEntries = (entries) => sortThreadsByActivity(entries, (entry) => entry.profile?.name);

  const sortedConversations = useMemo(() => orderEntries(conversationList), [conversationList]);
  const blockedConversations = useMemo(() => orderEntries(blockedList), [blockedList]);

  const unreadTotalValue = useMemo(
    () => sortedConversations.reduce((sum, conversation) => sum + conversation.unread, 0),
    [sortedConversations],
  );

  /* ---------------------------------- gestes ---------------------------------- */

  const markRead = useCallback(async (peerId) => {
    if (!peerId || !threads[peerId]?.unread) return;
    setThreads((prev) => markThreadReadLocal(prev, peerId));
    if (mode === 'demo') {
      mutateDemo((state) => applyDemoRead(state, peerId));
      return;
    }
    if (mode !== 'supabase') return;
    try {
      await markThreadRead(uid, peerId);
    } catch (e) { /* l'accusé sera renvoyé à la prochaine ouverture */ }
  }, [threads, mode, mutateDemo, uid]);

  const setDockOpen = useCallback((open) => {
    setDockOpenState(open);
    persistDockOpen(open);
  }, []);

  // La messagerie vit dans la fenêtre sociale unifiée sur bureau, et sur la
  // **page dédiée** (/messages) sur mobile : `openThread` choisit le bon
  // parcours. La fenêtre passe par le contexte des amis, qui porte l'onglet
  // actif ; on garde aussi l'ancien drapeau local (`letsplay_messages_open`)
  // pour que l'état ouvert survive à la migration.
  const openThread = useCallback((peerId) => {
    if (!peerId) return;
    if (isMobile) {
      // Mobile : navigation vers la page de messagerie (discussion en paramètre).
      setActivePeerId(peerId);
      viewedRef.current = peerId;
      navigate(`/messages/${encodeURIComponent(peerId)}`);
      if (threads[peerId]?.unread) markRead(peerId);
      return;
    }
    setActivePeerId(peerId);
    persistActivePeer(peerId);
    setDockOpen(true);
    friends.openDock('messages');
    if (threads[peerId]?.unread) markRead(peerId);
  }, [isMobile, navigate, setDockOpen, threads, markRead, friends]);

  const backToInbox = useCallback(() => {
    setActivePeerId(null);
    persistActivePeer(null);
    viewedRef.current = null;
  }, []);

  /**
   * La page /messages affiche la discussion courante via l'URL : elle signale
   * ici le fil vu (sans ouvrir la fenêtre ni naviguer), pour couper le son des
   * messages qui y arrivent. `null` quand on quitte le fil.
   */
  const viewThread = useCallback((peerId) => {
    viewedRef.current = peerId || null;
    setActivePeerId(peerId || null);
  }, []);

  /** Ouvre la fenêtre sur la liste des discussions (raccourci du hub joueur). */
  const openInbox = useCallback(() => {
    if (isMobile) {
      viewedRef.current = null;
      navigate('/messages');
      return;
    }
    setActivePeerId(null);
    persistActivePeer(null);
    setDockOpen(true);
    friends.openDock('messages');
  }, [isMobile, navigate, setDockOpen, friends]);

  /** Ferme la fenêtre sociale (les deux contextes partagent la même fenêtre). */
  const closeDock = useCallback(() => {
    setDockOpen(false);
    friends.closeDock();
  }, [setDockOpen, friends]);

  // Un joueur scripté « en ligne » répond peu après : l'aperçu montre le temps
  // réel (message reçu + badge des non-lus) sans aucun backend.
  const scheduleDemoReply = useCallback((peerId) => {
    if (mode !== 'demo') return;
    if (demoTimers.current.has(peerId)) clearTimeout(demoTimers.current.get(peerId));
    demoTimers.current.set(peerId, setTimeout(() => {
      demoTimers.current.delete(peerId);
      if (!mountedRef.current) return;
      const state = demoStateRef.current;
      if (!state || state.blocked?.includes(peerId)) return;
      if (friends.relationWith(peerId)?.kind !== 'friend') return;
      if (!friends.isOnline(peerId)) return;
      mutateDemo((current) => {
        let next = applyDemoReply(current, peerId);
        if (activeRef.current === peerId) next = applyDemoRead(next, peerId);
        return next;
      });
      chimeForIncoming(peerId);
    }, DEMO_REPLY_DELAY_MS));
  }, [mode, mutateDemo, friends]);

  const send = useCallback(async (peerId, body) => {
    const clean = prepareBody(body);
    if (!clean) return null;
    if (!canMessage(peerId)) {
      throw Object.assign(new Error('direct_message_requires_friendship'), { code: 'P0001' });
    }
    if (isBlocked(peerId)) {
      throw Object.assign(new Error('direct_message_blocked'), { code: 'P0001' });
    }

    if (mode === 'demo') {
      mutateDemo((state) => applyDemoSend(state, peerId, clean));
      scheduleDemoReply(peerId);
      return { id: `demo-local-${Date.now()}`, body: clean };
    }

    // Optimiste : la bulle apparaît tout de suite, remplacée par la ligne du
    // serveur dès la réponse (le canal temps réel n'écoute que les messages
    // reçus, donc pas de doublon).
    const pendingId = `pending-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const key = conversationKey(uid, peerId);
    setThreads((prev) => appendMessage(prev, uid, {
      id: pendingId,
      conversation_key: key,
      sender_id: uid,
      recipient_id: peerId,
      body: clean,
      created_at: nowIso,
      read_at: null,
    }));
    try {
      const row = await sendMessage(uid, peerId, clean);
      if (!mountedRef.current) return row;
      const saved = normalizeMessage(row, uid);
      if (saved) {
        setThreads((prev) => {
          const thread = prev[peerId];
          if (!thread) return appendMessage(prev, uid, row);
          const messages = thread.messages.map((message) => (message.id === pendingId ? saved : message));
          return { ...prev, [peerId]: { ...thread, messages, lastMessage: saved, lastAt: saved.createdAt } };
        });
      }
      return row;
    } catch (e) {
      if (mountedRef.current) {
        setThreads((prev) => {
          const thread = prev[peerId];
          if (!thread) return prev;
          const messages = thread.messages.filter((message) => message.id !== pendingId);
          const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
          return { ...prev, [peerId]: { ...thread, messages, lastMessage, lastAt: lastMessage?.createdAt || null } };
        });
      }
      throw e;
    }
  }, [canMessage, isBlocked, mode, mutateDemo, scheduleDemoReply, uid]);

  const deleteMessage = useCallback(async (peerId, messageId) => {
    if (!peerId || !messageId) return;
    if (String(messageId).startsWith('pending-')) return;
    const thread = threads[peerId];
    const message = thread?.messages.find((item) => item.id === messageId);
    if (!message) return;
    if (!message.mine) {
      throw Object.assign(new Error('direct_message_not_mine'), { code: 'P0001' });
    }

    if (mode === 'demo') {
      mutateDemo((state) => applyDemoDelete(state, peerId, messageId));
      return;
    }
    if (mode !== 'supabase') return;

    const previous = threads;
    setThreads((prev) => removeMessage(prev, peerId, messageId));
    try {
      await deleteMessageApi(uid, messageId);
    } catch (e) {
      if (mountedRef.current) setThreads(previous);
      throw e;
    }
  }, [threads, mode, mutateDemo, uid]);

  const block = useCallback(async (peerId) => {
    if (!peerId) return;
    if (mode === 'demo') {
      if (demoTimers.current.has(peerId)) {
        clearTimeout(demoTimers.current.get(peerId));
        demoTimers.current.delete(peerId);
      }
      mutateDemo((state) => applyDemoBlock(state, peerId));
      return;
    }
    if (mode !== 'supabase') return;
    setBlockedIds((prev) => (prev.includes(peerId) ? prev : [...prev, peerId]));
    try {
      await blockPeer(uid, peerId);
    } catch (e) {
      if (mountedRef.current) setBlockedIds((prev) => prev.filter((id) => id !== peerId));
      throw e;
    }
  }, [mode, mutateDemo, uid]);

  const unblock = useCallback(async (peerId) => {
    if (!peerId) return;
    if (mode === 'demo') {
      mutateDemo((state) => applyDemoUnblock(state, peerId));
      return;
    }
    if (mode !== 'supabase') return;
    setBlockedIds((prev) => prev.filter((id) => id !== peerId));
    try {
      await unblockPeer(uid, peerId);
    } catch (e) {
      if (mountedRef.current) setBlockedIds((prev) => (prev.includes(peerId) ? prev : [...prev, peerId]));
      throw e;
    }
  }, [mode, mutateDemo, uid]);

  const report = useCallback(async (peerId, reason = 'other', note = null) => {
    if (!peerId) return;
    if (mode === 'demo') {
      mutateDemo((state) => applyDemoReport(state, peerId, reason));
      return;
    }
    if (mode !== 'supabase') return;
    setReported((prev) => ({ ...prev, [peerId]: reason }));
    try {
      const lastFromPeer = [...(threads[peerId]?.messages || [])].reverse().find((message) => !message.mine);
      await reportPeer(uid, peerId, reason, lastFromPeer?.id || null, note);
    } catch (e) {
      if (mountedRef.current) {
        setReported((prev) => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      }
      throw e;
    }
  }, [mode, mutateDemo, uid, threads]);

  const refresh = useCallback(async () => {
    if (mode === 'demo') loadDemo();
    else await load();
  }, [mode, loadDemo, load]);

  const value = useMemo(() => ({
    enabled: mode !== 'none',
    mode,
    status,
    error,
    threads,
    conversations: sortedConversations,
    blockedConversations,
    unreadTotal: unreadTotalValue,
    unreadFor,
    threadFor,
    canMessage,
    isBlocked,
    reportedReason,
    send,
    deleteMessage,
    markRead,
    block,
    unblock,
    report,
    refresh,
    dockOpen,
    activePeerId,
    openThread,
    openInbox,
    viewThread,
    backToInbox,
    closeDock,
  }), [
    mode, status, error, threads, sortedConversations, blockedConversations, unreadTotalValue,
    unreadFor, threadFor, canMessage, isBlocked, reportedReason,
    send, deleteMessage, markRead, block, unblock, report, refresh,
    dockOpen, activePeerId, openThread, openInbox, viewThread, backToInbox, closeDock,
  ]);

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages() {
  return useContext(MessagesContext);
}
