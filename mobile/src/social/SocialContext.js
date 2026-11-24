import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { triggerLocalNotification } from '../lib/notifications';
import { lightTap, successHaptic } from '../lib/haptics';
import { readJsonCache, writeJsonCache } from '../lib/storage';

const PRESENCE_STALE_MS = 3 * 60 * 1000;
const MESSAGE_MAX_LENGTH = 1000;
const DEMO_SOCIAL_KEY = 'letsplay_mobile_demo_social_v1';

const DEMO_COMMUNITY = [
  { id: 'demo-amine', name: 'AmineDZ', level: 22, online: true },
  { id: 'demo-tiziri', name: 'Tiziri_GG', level: 18, online: true },
  { id: 'demo-yacine', name: 'YacineSablier', level: 15, online: false },
  { id: 'demo-lyna', name: 'LynaDrift', level: 27, online: true },
  { id: 'demo-karim', name: 'KarimSouls', level: 11, online: false },
];

function createSeedDemoSocial(uid) {
  const now = Date.now();
  return {
    relations: {
      'demo-amine': { rowId: 'r1', kind: 'friend', since: new Date(now - 86400000).toISOString() },
      'demo-tiziri': { rowId: 'r2', kind: 'friend', since: new Date(now - 172800000).toISOString() },
      'demo-lyna': { rowId: 'r3', kind: 'incoming', since: new Date(now - 3600000).toISOString() },
    },
    threads: {
      'demo-amine': {
        peerId: 'demo-amine',
        key: `${uid}_demo-amine`,
        unread: 1,
        lastAt: new Date(now - 300000).toISOString(),
        lastMessage: {
          id: 'm2',
          peerId: 'demo-amine',
          mine: false,
          body: 'Tu as testé le nouveau circuit Nürburgring sur Vice City Rush ? Les virages sont incroyables !',
          createdAt: new Date(now - 300000).toISOString(),
          read: false,
        },
        messages: [
          {
            id: 'm1',
            peerId: 'demo-amine',
            mine: true,
            body: 'Salut Amine ! Partant pour un duel sur Le Sablier ce soir ?',
            createdAt: new Date(now - 900000).toISOString(),
            read: true,
          },
          {
            id: 'm2',
            peerId: 'demo-amine',
            mine: false,
            body: 'Tu as testé le nouveau circuit Nürburgring sur Vice City Rush ? Les virages sont incroyables !',
            createdAt: new Date(now - 300000).toISOString(),
            read: false,
          },
        ],
      },
      'demo-tiziri': {
        peerId: 'demo-tiziri',
        key: `${uid}_demo-tiziri`,
        unread: 0,
        lastAt: new Date(now - 7200000).toISOString(),
        lastMessage: {
          id: 'm3',
          peerId: 'demo-tiziri',
          mine: false,
          body: 'Mon deck Djinns & Lune Noire commence enfin à tourner proprement.',
          createdAt: new Date(now - 7200000).toISOString(),
          read: true,
        },
        messages: [
          {
            id: 'm3',
            peerId: 'demo-tiziri',
            mine: false,
            body: 'Mon deck Djinns & Lune Noire commence enfin à tourner proprement.',
            createdAt: new Date(now - 7200000).toISOString(),
            read: true,
          },
        ],
      },
    },
    blockedIds: [],
    reportedByPeer: {},
  };
}

export function conversationKey(a, b) {
  const one = String(a || '');
  const two = String(b || '');
  if (!one || !two || one === two) return null;
  return one < two ? `${one}_${two}` : `${two}_${one}`;
}

export function prepareMessageBody(text) {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MESSAGE_MAX_LENGTH)
    .replace(/[\ud800-\udbff]$/, '');
}

function normalizeProfileRow(row) {
  if (!row?.id) return null;
  const seenMs = row.last_seen_at ? Date.parse(row.last_seen_at) : 0;
  return {
    id: row.id,
    name: row.username || row.display_name || String(row.id).slice(0, 8),
    avatar: row.avatar_url || null,
    level: Number.isFinite(row.level) ? row.level : 1,
    online: Number.isFinite(seenMs) && Date.now() - seenMs < PRESENCE_STALE_MS,
    lastSeenAt: row.last_seen_at || null,
  };
}

function normalizeMessageRow(row, uid) {
  if (!row?.id || !uid) return null;
  if (row.sender_id !== uid && row.recipient_id !== uid) return null;
  const mine = row.sender_id === uid;
  const peerId = mine ? row.recipient_id : row.sender_id;
  if (!peerId || peerId === uid) return null;
  return {
    id: row.id,
    peerId,
    key: row.conversation_key || conversationKey(uid, peerId),
    mine,
    body: String(row.body ?? ''),
    kind: typeof row.kind === 'string' ? row.kind : 'texte',
    createdAt: row.created_at || new Date().toISOString(),
    read: Boolean(row.read_at),
  };
}

function buildThreadsFromRows(rows, uid) {
  const threads = {};
  for (const row of rows || []) {
    const msg = normalizeMessageRow(row, uid);
    if (!msg) continue;
    let thread = threads[msg.peerId];
    if (!thread) {
      thread = {
        peerId: msg.peerId,
        key: msg.key,
        messages: [],
        lastMessage: null,
        lastAt: null,
        unread: 0,
      };
      threads[msg.peerId] = thread;
    }
    thread.messages.push(msg);
    if (!msg.mine && !msg.read) thread.unread += 1;
  }
  for (const thread of Object.values(threads)) {
    thread.messages.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    const last = thread.messages[thread.messages.length - 1] || null;
    thread.lastMessage = last;
    thread.lastAt = last?.createdAt || null;
  }
  return threads;
}

const SocialContext = createContext(null);

export function SocialProvider({ children }) {
  const { user, isDemo, notifPrefs } = useAuth();
  const { lang } = useLanguage();
  const uid = user?.id || null;

  const [relations, setRelations] = useState({});
  const [profiles, setProfiles] = useState({});
  const [threads, setThreads] = useState({});
  const [blockedIds, setBlockedIds] = useState([]);
  const [reportedByPeer, setReportedByPeer] = useState({});
  const [activePeerId, setActivePeerId] = useState(null);
  const [loadingSocial, setLoadingSocial] = useState(false);

  const activePeerRef = useRef(null);
  activePeerRef.current = activePeerId;
  const profilesRef = useRef({});
  profilesRef.current = profiles;

  const ensureProfilesLoaded = useCallback(async (ids) => {
    const missing = [...new Set((ids || []).filter((id) => id && !profilesRef.current[id]))];
    if (!supabase || missing.length === 0) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, level, last_seen_at')
      .in('id', missing);
    if (!error && data) {
      setProfiles((prev) => {
        const next = { ...prev };
        for (const row of data) {
          const p = normalizeProfileRow(row);
          if (p) next[p.id] = p;
        }
        return next;
      });
    }
  }, []);

  const refreshSupabaseSocial = useCallback(async () => {
    if (!supabase || !uid || isDemo) return;
    setLoadingSocial(true);
    try {
      const [friendsRes, msgsRes, blocksRes, reportsRes] = await Promise.all([
        supabase
          .from('friendships')
          .select('id, requester_id, addressee_id, status, created_at, updated_at')
          .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`),
        supabase
          .from('direct_messages')
          .select('id, conversation_key, sender_id, recipient_id, body, created_at, read_at, kind')
          .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('message_blocks').select('blocked_id').eq('blocker_id', uid),
        supabase.from('message_reports').select('reported_id, reason').eq('reporter_id', uid),
      ]);

      const nextRelations = {};
      const peerSet = new Set();

      for (const row of friendsRes.data || []) {
        const isReq = row.requester_id === uid;
        const otherId = isReq ? row.addressee_id : row.requester_id;
        if (!otherId || otherId === uid) continue;
        peerSet.add(otherId);
        if (row.status === 'accepted') {
          nextRelations[otherId] = { rowId: row.id, kind: 'friend', since: row.updated_at };
        } else if (row.status === 'pending') {
          nextRelations[otherId] = {
            rowId: row.id,
            kind: isReq ? 'outgoing' : 'incoming',
            since: row.created_at,
          };
        }
      }

      const nextThreads = buildThreadsFromRows(msgsRes.data || [], uid);
      Object.keys(nextThreads).forEach((pId) => peerSet.add(pId));

      setRelations(nextRelations);
      setThreads(nextThreads);
      setBlockedIds((blocksRes.data || []).map((r) => r.blocked_id).filter(Boolean));

      const repMap = {};
      for (const r of reportsRes.data || []) {
        if (r?.reported_id) repMap[r.reported_id] = r.reason || 'other';
      }
      setReportedByPeer(repMap);

      await ensureProfilesLoaded([...peerSet]);
    } finally {
      setLoadingSocial(false);
    }
  }, [uid, isDemo, ensureProfilesLoaded]);

  // Initialisation Démo ou Supabase + abonnements Realtime
  useEffect(() => {
    if (!uid) {
      setRelations({});
      setProfiles({});
      setThreads({});
      setBlockedIds([]);
      setReportedByPeer({});
      setActivePeerId(null);
      return undefined;
    }

    if (isDemo) {
      const pMap = {};
      for (const p of DEMO_COMMUNITY) pMap[p.id] = p;
      setProfiles(pMap);
      readJsonCache(`${DEMO_SOCIAL_KEY}:${uid}`, null).then((saved) => {
        const state = saved || createSeedDemoSocial(uid);
        setRelations(state.relations || {});
        setThreads(state.threads || {});
        setBlockedIds(state.blockedIds || []);
        setReportedByPeer(state.reportedByPeer || {});
      });
      return undefined;
    }

    refreshSupabaseSocial();

    // Pulsation de présence `last_seen_at`
    const pulse = () => {
      supabase
        ?.from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', uid)
        .then(() => {})
        .catch(() => {});
    };
    pulse();
    const pulseTimer = setInterval(pulse, 90000);

    // Canal Supabase Realtime : messages entrants + demandes d'amis en direct
    const channel = supabase
      .channel(`mobile-social:${uid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${uid}`,
        },
        async (payload) => {
          const row = payload.new;
          const msg = normalizeMessageRow(row, uid);
          if (!msg) return;
          await ensureProfilesLoaded([msg.peerId]);
          const isChatOpen = activePeerRef.current === msg.peerId;
          setThreads((prev) => {
            const existing = prev[msg.peerId] || {
              peerId: msg.peerId,
              key: msg.key,
              messages: [],
              lastMessage: null,
              lastAt: null,
              unread: 0,
            };
            if (existing.messages.some((m) => m.id === msg.id)) return prev;
            const updatedMsg = isChatOpen ? { ...msg, read: true } : msg;
            const messages = [...existing.messages, updatedMsg];
            return {
              ...prev,
              [msg.peerId]: {
                ...existing,
                messages,
                lastMessage: updatedMsg,
                lastAt: updatedMsg.createdAt,
                unread: isChatOpen ? 0 : existing.unread + 1,
              },
            };
          });

          if (isChatOpen) {
            supabase
              .from('direct_messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', msg.id)
              .then(() => {});
          } else if (notifPrefs.enabled && notifPrefs.notifyMessages) {
            const senderName = profilesRef.current[msg.peerId]?.name || 'Let’s Talk';
            triggerLocalNotification({
              title:
                lang === 'en'
                  ? `Message from ${senderName}`
                  : lang === 'ar'
                    ? `رسالة من ${senderName}`
                    : `Message de ${senderName}`,
              body: msg.body,
              data: { tab: 'messages', peerId: msg.peerId },
              channelId: 'messages',
            });
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${uid}`,
        },
        (payload) => {
          const row = payload.new;
          if (!row?.read_at) return;
          setThreads((prev) => {
            const peerId = row.recipient_id;
            const t = prev[peerId];
            if (!t) return prev;
            return {
              ...prev,
              [peerId]: {
                ...t,
                messages: t.messages.map((m) => (m.id === row.id ? { ...m, read: true } : m)),
              },
            };
          });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships' },
        () => {
          refreshSupabaseSocial();
        },
      )
      .subscribe();

    return () => {
      clearInterval(pulseTimer);
      supabase.removeChannel(channel);
    };
  }, [uid, isDemo, refreshSupabaseSocial, ensureProfilesLoaded, notifPrefs, lang]);

  const persistDemoState = useCallback(
    (nextPartial) => {
      if (!isDemo || !uid) return;
      writeJsonCache(`${DEMO_SOCIAL_KEY}:${uid}`, {
        relations,
        threads,
        blockedIds,
        reportedByPeer,
        ...nextPartial,
      });
    },
    [isDemo, uid, relations, threads, blockedIds, reportedByPeer],
  );

  const openChatWithPeer = useCallback(
    async (peerId) => {
      setActivePeerId(peerId);
      if (!peerId || !uid) return;
      setThreads((prev) => {
        const thread = prev[peerId];
        if (!thread || thread.unread === 0) return prev;
        const updated = {
          ...prev,
          [peerId]: {
            ...thread,
            unread: 0,
            messages: thread.messages.map((m) => (m.mine ? m : { ...m, read: true })),
          },
        };
        if (isDemo) persistDemoState({ threads: updated });
        return updated;
      });

      if (!isDemo && supabase) {
        await supabase
          .from('direct_messages')
          .update({ read_at: new Date().toISOString() })
          .eq('recipient_id', uid)
          .eq('sender_id', peerId)
          .is('read_at', null);
      }
    },
    [uid, isDemo, persistDemoState],
  );

  const closeChat = useCallback(() => setActivePeerId(null), []);

  const sendDirectMessage = useCallback(
    async (peerId, rawText) => {
      const body = prepareMessageBody(rawText);
      if (!body || !uid || !peerId) return null;
      lightTap();

      if (isDemo) {
        const nowIso = new Date().toISOString();
        const myMsg = {
          id: `dm-${Date.now()}`,
          peerId,
          key: conversationKey(uid, peerId),
          mine: true,
          body,
          createdAt: nowIso,
          read: true,
        };
        setThreads((prev) => {
          const existing = prev[peerId] || {
            peerId,
            key: myMsg.key,
            messages: [],
            unread: 0,
          };
          const nextThreads = {
            ...prev,
            [peerId]: {
              ...existing,
              messages: [...existing.messages, myMsg],
              lastMessage: myMsg,
              lastAt: nowIso,
            },
          };
          persistDemoState({ threads: nextThreads });
          return nextThreads;
        });

        // Réponse automatique sympathique en mode Démo après 1.1s
        setTimeout(() => {
          const replyIso = new Date().toISOString();
          const peerName = profilesRef.current[peerId]?.name || 'Ami';
          const replyMsg = {
            id: `dm-reply-${Date.now()}`,
            peerId,
            key: conversationKey(uid, peerId),
            mine: false,
            body: `Bien reçu ! (${peerName} — aperçu mobile Let’s Talk)`,
            createdAt: replyIso,
            read: activePeerRef.current === peerId,
          };
          setThreads((prev) => {
            const existing = prev[peerId] || { peerId, messages: [], unread: 0 };
            const nextThreads = {
              ...prev,
              [peerId]: {
                ...existing,
                messages: [...existing.messages, replyMsg],
                lastMessage: replyMsg,
                lastAt: replyIso,
                unread: activePeerRef.current === peerId ? 0 : (existing.unread || 0) + 1,
              },
            };
            persistDemoState({ threads: nextThreads });
            return nextThreads;
          });
        }, 1100);

        return myMsg;
      }

      const { data, error } = await supabase
        .from('direct_messages')
        .insert({ recipient_id: peerId, body })
        .select('id, conversation_key, sender_id, recipient_id, body, created_at, read_at, kind')
        .single();
      if (error) throw error;

      const msg = normalizeMessageRow(data, uid);
      setThreads((prev) => {
        const existing = prev[peerId] || {
          peerId,
          key: msg.key,
          messages: [],
          unread: 0,
        };
        return {
          ...prev,
          [peerId]: {
            ...existing,
            messages: [...existing.messages, msg],
            lastMessage: msg,
            lastAt: msg.createdAt,
          },
        };
      });
      return msg;
    },
    [uid, isDemo, persistDemoState],
  );

  const clearPeerConversation = useCallback(
    async (peerId) => {
      if (!uid || !peerId) return;
      if (!isDemo && supabase) {
        await supabase.rpc('clear_direct_conversation', { target_id: peerId });
      }
      setThreads((prev) => {
        const next = { ...prev };
        delete next[peerId];
        if (isDemo) persistDemoState({ threads: next });
        return next;
      });
    },
    [uid, isDemo, persistDemoState],
  );

  const toggleBlockPeer = useCallback(
    async (peerId) => {
      if (!uid || !peerId) return;
      const isBlocked = blockedIds.includes(peerId);
      if (!isDemo && supabase) {
        if (isBlocked) {
          await supabase
            .from('message_blocks')
            .delete()
            .eq('blocker_id', uid)
            .eq('blocked_id', peerId);
        } else {
          await supabase.from('message_blocks').insert({ blocked_id: peerId });
        }
      }
      const next = isBlocked
        ? blockedIds.filter((id) => id !== peerId)
        : [...blockedIds, peerId];
      setBlockedIds(next);
      if (isDemo) persistDemoState({ blockedIds: next });
    },
    [uid, isDemo, blockedIds, persistDemoState],
  );

  const reportPeer = useCallback(
    async (peerId, reason = 'inappropriate') => {
      if (!uid || !peerId) return;
      if (!isDemo && supabase) {
        await supabase
          .from('message_reports')
          .insert({ reported_id: peerId, reason });
      }
      const next = { ...reportedByPeer, [peerId]: reason };
      setReportedByPeer(next);
      if (isDemo) persistDemoState({ reportedByPeer: next });
      successHaptic();
    },
    [uid, isDemo, reportedByPeer, persistDemoState],
  );

  const searchPlayers = useCallback(
    async (query) => {
      const clean = String(query || '')
        .replace(/[,()"'\\%*]/g, ' ')
        .trim()
        .slice(0, 40);
      if (clean.length < 2) return [];
      if (isDemo) {
        const lower = clean.toLowerCase();
        return DEMO_COMMUNITY.filter((p) => p.name.toLowerCase().includes(lower));
      }
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, level, last_seen_at')
        .or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`)
        .neq('id', uid)
        .limit(10);
      if (error || !data) return [];
      const list = data.map(normalizeProfileRow).filter(Boolean);
      setProfiles((prev) => {
        const next = { ...prev };
        for (const p of list) next[p.id] = p;
        return next;
      });
      return list;
    },
    [uid, isDemo],
  );

  const sendFriendRequest = useCallback(
    async (targetId) => {
      if (!uid || !targetId) return;
      if (isDemo) {
        const next = {
          ...relations,
          [targetId]: { rowId: `demo-${Date.now()}`, kind: 'friend', since: new Date().toISOString() },
        };
        setRelations(next);
        persistDemoState({ relations: next });
        successHaptic();
        return;
      }
      const { error } = await supabase
        .from('friendships')
        .insert({ requester_id: uid, addressee_id: targetId, status: 'pending' });
      if (error && error.code !== '23505') throw error;
      successHaptic();
      await refreshSupabaseSocial();
    },
    [uid, isDemo, relations, persistDemoState, refreshSupabaseSocial],
  );

  const acceptFriend = useCallback(
    async (otherId) => {
      const rel = relations[otherId];
      if (!rel) return;
      if (isDemo) {
        const next = {
          ...relations,
          [otherId]: { ...rel, kind: 'friend', since: new Date().toISOString() },
        };
        setRelations(next);
        persistDemoState({ relations: next });
        successHaptic();
        return;
      }
      await supabase
        .from('friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', rel.rowId);
      successHaptic();
      await refreshSupabaseSocial();
    },
    [isDemo, relations, persistDemoState, refreshSupabaseSocial],
  );

  const removeFriendship = useCallback(
    async (otherId) => {
      const rel = relations[otherId];
      if (!rel) return;
      if (isDemo) {
        const next = { ...relations };
        delete next[otherId];
        setRelations(next);
        persistDemoState({ relations: next });
        return;
      }
      await supabase.from('friendships').delete().eq('id', rel.rowId);
      await refreshSupabaseSocial();
    },
    [isDemo, relations, persistDemoState, refreshSupabaseSocial],
  );

  const totalUnread = useMemo(
    () => Object.values(threads).reduce((sum, t) => sum + (t.unread || 0), 0),
    [threads],
  );

  const incomingCount = useMemo(
    () => Object.values(relations).filter((r) => r.kind === 'incoming').length,
    [relations],
  );

  const value = useMemo(
    () => ({
      relations,
      profiles,
      threads,
      blockedIds,
      reportedByPeer,
      activePeerId,
      loadingSocial,
      totalUnread,
      incomingCount,
      refreshSocial: refreshSupabaseSocial,
      openChatWithPeer,
      closeChat,
      sendDirectMessage,
      clearPeerConversation,
      toggleBlockPeer,
      reportPeer,
      searchPlayers,
      sendFriendRequest,
      acceptFriend,
      removeFriendship,
    }),
    [
      relations,
      profiles,
      threads,
      blockedIds,
      reportedByPeer,
      activePeerId,
      loadingSocial,
      totalUnread,
      incomingCount,
      refreshSupabaseSocial,
      openChatWithPeer,
      closeChat,
      sendDirectMessage,
      clearPeerConversation,
      toggleBlockPeer,
      reportPeer,
      searchPlayers,
      sendFriendRequest,
      acceptFriend,
      removeFriendship,
    ],
  );

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used inside SocialProvider');
  return ctx;
}
