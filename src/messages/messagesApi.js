/**
 * Couche de données de la messagerie.
 * -----------------------------------
 * Deux mondes, une seule forme de résultat :
 *
 *   - **Comptes Supabase** : la table `public.direct_messages`
 *     (voir supabase/schema.sql, étape 3e) porte une ligne par message, avec
 *     `conversation_key` (`le plus petit uuid _ le plus grand`) qui regroupe
 *     les deux sens d'un échange, et `read_at` à NULL tant que le destinataire
 *     n'a pas ouvert la discussion — c'est ce qui compte les non-lus. Côté
 *     serveur, un trigger impose : expéditeur = joueur connecté, amitié
 *     `accepted` obligatoire, aucun blocage entre les deux joueurs, 20
 *     messages par minute au plus. Les joueurs bloqués vivent dans
 *     `public.message_blocks`, les signalements dans `public.message_reports`.
 *
 *   - **Personas de démonstration** (pas de session) : les discussions vivent
 *     dans localStorage, par persona et par appareil, avec des réponses
 *     scriptées (`demoThreads.js`).
 *
 * Le contexte (`MessagesContext.jsx`) ne connaît que la forme normalisée :
 *   threads : { [peerId]: { peerId, key, messages, lastMessage, lastAt, unread } }
 *   message : { id, peerId, key, mine, body, createdAt, read }
 */
import { supabase } from '../lib/supabase';
import { demoReplyFor, seedDemoThreadState } from './demoThreads';

export const MESSAGES_TABLE = 'direct_messages';
export const BLOCKS_TABLE = 'message_blocks';
export const REPORTS_TABLE = 'message_reports';
const MESSAGE_COLUMNS = 'id, conversation_key, sender_id, recipient_id, body, created_at, read_at';

/** Longueur maximale d'un message (contrainte SQL identique). */
export const MESSAGE_MAX_LENGTH = 1000;
/** Motifs de signalement proposés au joueur. */
export const REPORT_REASONS = ['harassment', 'spam', 'hate', 'inappropriate', 'other'];

// ---------------------------------------------------------------------------
// Erreurs
// ---------------------------------------------------------------------------

/** Vrai quand `public.direct_messages` n'existe pas (schéma SQL pas relancé). */
export function isMissingMessagesTable(error) {
  const code = error?.code || '';
  const message = error?.message || '';
  return code === '42P01'
    || code === 'PGRST205'
    || /relation .*direct_messages.* does not exist|could not find the table .*direct_messages/i.test(message);
}

/** Le trigger a refusé : un des deux joueurs bloque l'autre. */
export function isBlockedError(error) {
  return /direct_message_blocked/i.test(error?.message || '');
}

/** Le trigger a refusé : les deux joueurs ne sont pas amis. */
export function isRequiresFriendshipError(error) {
  return /direct_message_requires_friendship/i.test(error?.message || '');
}

/** Le trigger a refusé : trop de messages envoyés à la suite. */
export function isRateLimitedError(error) {
  return /direct_message_rate_limited/i.test(error?.message || '');
}

/** Le message est vide ou trop long (refusé côté client comme côté serveur). */
export function isInvalidBodyError(error) {
  return /direct_message_(empty|too_long)/i.test(error?.message || '');
}

// ---------------------------------------------------------------------------
// Logique pure
// ---------------------------------------------------------------------------

/**
 * Clé de conversation : les deux identifiants triés, séparés par « _ ».
 * Symétrique (`conversationKey(a, b) === conversationKey(b, a)`) et sans
 * caractère réservé par PostgREST, pour pouvoir filtrer en temps réel.
 */
export function conversationKey(a, b) {
  const one = String(a || '');
  const two = String(b || '');
  if (!one || !two || one === two) return null;
  return one < two ? `${one}_${two}` : `${two}_${one}`;
}

/** Les deux joueurs d'une clé de conversation. */
export function peersFromKey(key) {
  const parts = String(key || '').split('_');
  return parts.length === 2 && parts[0] && parts[1] ? parts : null;
}

/**
 * Nettoie une saisie avant envoi : espaces de bordure, retours Windows,
 * espaces de fin de ligne et plus de deux sauts de ligne consécutifs ; tronqué
 * à MESSAGE_MAX_LENGTH. Renvoie '' si rien ne reste (rien à envoyer).
 */
export function prepareBody(text) {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MESSAGE_MAX_LENGTH)
    // La troncature peut couper une paire de substituts (émoji) : on retire le
    // demi-caractère restant pour rester encodable en JSON.
    .replace(/[\ud800-\udbff]$/, '');
}

function time(iso) {
  const value = Date.parse(iso || '');
  return Number.isFinite(value) ? value : 0;
}

/**
 * Ligne `direct_messages` → message vu par `uid`.
 * Renvoie null quand la ligne ne concerne pas `uid` (échange entre deux autres
 * joueurs) ou quand elle est incomplète : rien d'étranger n'entre dans l'état.
 */
export function normalizeMessage(row, uid) {
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
    createdAt: row.created_at || null,
    read: Boolean(row.read_at),
  };
}

/** Lignes → discussions, indexées par interlocuteur. */
export function threadsFromRows(rows, uid) {
  const threads = {};
  for (const row of rows || []) {
    const message = normalizeMessage(row, uid);
    if (!message) continue;
    let thread = threads[message.peerId];
    if (!thread) {
      thread = {
        peerId: message.peerId,
        key: message.key,
        messages: [],
        lastMessage: null,
        lastAt: null,
        unread: 0,
      };
      threads[message.peerId] = thread;
    }
    thread.messages.push(message);
    if (!message.mine && !message.read) thread.unread += 1;
    if (!thread.lastAt || time(message.createdAt) >= time(thread.lastAt)) {
      thread.lastAt = message.createdAt;
      thread.lastMessage = message;
    }
  }
  for (const thread of Object.values(threads)) {
    thread.messages.sort((a, b) => time(a.createdAt) - time(b.createdAt) || String(a.id).localeCompare(String(b.id)));
  }
  return threads;
}

/** Lignes de non-lus (`recipient_id = moi`, `read_at is null`) → compte par joueur. */
export function unreadFromRows(rows, uid) {
  const counts = {};
  for (const row of rows || []) {
    const peerId = row?.sender_id;
    if (!peerId || peerId === uid) continue;
    counts[peerId] = (counts[peerId] || 0) + 1;
  }
  return counts;
}

/**
 * Applique les comptes de non-lus du serveur aux discussions. Un joueur avec
 * des non-lus mais aucun message dans la fenêtre chargée obtient une
 * discussion « vide » : le badge reste juste.
 */
export function mergeUnread(threads, counts, uid) {
  const next = { ...threads };
  for (const [peerId, count] of Object.entries(counts || {})) {
    const thread = next[peerId];
    if (thread) next[peerId] = { ...thread, unread: count };
    else next[peerId] = { peerId, key: conversationKey(uid, peerId), messages: [], lastMessage: null, lastAt: null, unread: count };
  }
  return next;
}

/**
 * Discussions triées par activité : les plus récentes d'abord, celles sans
 * message en dernier (triées par pseudo quand `nameOf` est fourni).
 */
export function sortThreadsByActivity(list, nameOf = null) {
  return [...list].sort((a, b) => {
    const left = time(a.lastAt);
    const right = time(b.lastAt);
    if (left !== right) return right - left;
    if (Boolean(left) !== Boolean(right)) return left ? -1 : 1;
    const leftName = nameOf ? String(nameOf(a) || '') : String(a.peerId || '');
    const rightName = nameOf ? String(nameOf(b) || '') : String(b.peerId || '');
    return leftName.localeCompare(rightName, undefined, { sensitivity: 'base' });
  });
}

/** Total des messages non lus. */
export function totalUnread(threads) {
  return Object.values(threads || {}).reduce((sum, thread) => sum + (thread.unread || 0), 0);
}

/** Marque localement une discussion comme lue (accusé optimiste). */
export function markThreadReadLocal(threads, peerId) {
  const thread = threads?.[peerId];
  if (!thread || thread.unread === 0) return threads;
  return {
    ...threads,
    [peerId]: {
      ...thread,
      unread: 0,
      messages: thread.messages.map((message) => (message.mine || message.read ? message : { ...message, read: true })),
    },
  };
}

/** Ajoute un message à une discussion (temps réel : reçu ou envoyé ailleurs). */
export function appendMessage(threads, uid, row) {
  const message = normalizeMessage(row, uid);
  if (!message) return threads;
  const next = { ...threads };
  const thread = next[message.peerId] || {
    peerId: message.peerId, key: message.key, messages: [], lastMessage: null, lastAt: null, unread: 0,
  };
  if (thread.messages.some((existing) => existing.id === message.id)) return threads;
  const messages = [...thread.messages, message].sort((a, b) => time(a.createdAt) - time(b.createdAt));
  next[message.peerId] = {
    ...thread,
    messages,
    lastMessage: message,
    lastAt: message.createdAt || thread.lastAt,
    unread: !message.mine && !message.read ? thread.unread + 1 : thread.unread,
  };
  return next;
}

/** Un accusé de lecture arrive : le message passe en « vu ». */
export function applyReadReceipt(threads, row) {
  if (!row?.id) return threads;
  let touched = false;
  const next = {};
  for (const [peerId, thread] of Object.entries(threads || {})) {
    let changed = false;
    const messages = thread.messages.map((message) => {
      if (message.id !== row.id || message.read) return message;
      changed = true;
      return { ...message, read: true };
    });
    if (changed) {
      touched = true;
      next[peerId] = { ...thread, messages, lastMessage: thread.lastMessage?.id === row.id ? { ...thread.lastMessage, read: true } : thread.lastMessage };
    } else {
      next[peerId] = thread;
    }
  }
  return touched ? next : threads;
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

/** Messages récents du joueur (les deux sens), du plus récent au plus ancien. */
export async function fetchRecentMessages(uid, limit = 200) {
  if (!supabase || !uid) return [];
  const { data, error } = await supabase
    .from(MESSAGES_TABLE)
    .select(MESSAGE_COLUMNS)
    .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/** Expéditeurs des messages non lus (un seul aller-retour pour tous les badges). */
export async function fetchUnreadSenders(uid, limit = 500) {
  if (!supabase || !uid) return [];
  const { data, error } = await supabase
    .from(MESSAGES_TABLE)
    .select('id, sender_id')
    .eq('recipient_id', uid)
    .is('read_at', null)
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/** Fil complet d'une discussion (100 derniers messages). */
export async function fetchThread(uid, peerId, limit = 100) {
  if (!supabase || !uid || !peerId) return [];
  const key = conversationKey(uid, peerId);
  if (!key) return [];
  const { data, error } = await supabase
    .from(MESSAGES_TABLE)
    .select(MESSAGE_COLUMNS)
    .eq('conversation_key', key)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).reverse();
}

/** Envoie un message ; renvoie la ligne créée par le serveur. */
export async function sendMessage(uid, peerId, body) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from(MESSAGES_TABLE)
    .insert({ recipient_id: peerId, body: prepareBody(body) })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

/** Accusé de lecture : `read_at` des messages reçus non lus de cet ami. */
export async function markThreadRead(uid, peerId) {
  if (!supabase || !uid || !peerId) return [];
  const { data, error } = await supabase
    .from(MESSAGES_TABLE)
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', uid)
    .eq('sender_id', peerId)
    .is('read_at', null)
    .select('id');
  if (error) throw error;
  return data || [];
}

/** Identifiants des joueurs que le compte connecté bloque. */
export async function fetchBlockedIds(uid) {
  if (!supabase || !uid) return [];
  const { data, error } = await supabase
    .from(BLOCKS_TABLE)
    .select('blocked_id')
    .eq('blocker_id', uid);
  if (error) throw error;
  return (data || []).map((row) => row.blocked_id).filter(Boolean);
}

/** Signalements déjà envoyés par le compte : `{ [peerId]: reason }`. */
export async function fetchReportedIds(uid) {
  if (!supabase || !uid) return {};
  const { data, error } = await supabase
    .from(REPORTS_TABLE)
    .select('reported_id, reason')
    .eq('reporter_id', uid);
  if (error) throw error;
  const map = {};
  for (const row of data || []) {
    if (row?.reported_id) map[row.reported_id] = row.reason || 'other';
  }
  return map;
}

export async function blockPeer(uid, peerId) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.from(BLOCKS_TABLE).insert({ blocked_id: peerId });
  // Déjà bloqué (index unique) : le résultat voulu est atteint.
  if (error && error.code !== '23505') throw error;
}

export async function unblockPeer(uid, peerId) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase
    .from(BLOCKS_TABLE)
    .delete()
    .eq('blocker_id', uid)
    .eq('blocked_id', peerId);
  if (error) throw error;
}

/** Signale un joueur (motif + message en cause facultatif). */
export async function reportPeer(uid, peerId, reason = 'other', messageId = null, note = null) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.from(REPORTS_TABLE).insert({
    reported_id: peerId,
    reason: REPORT_REASONS.includes(reason) ? reason : 'other',
    message_id: messageId || null,
    note: note ? String(note).slice(0, 500) : null,
  });
  if (error && error.code !== '23505') throw error;
}

// ---------------------------------------------------------------------------
// Personas de démonstration (localStorage, par persona et par appareil)
// ---------------------------------------------------------------------------

const DEMO_STORAGE_PREFIX = 'letsplay_demo_messages:';
export const DEMO_MESSAGES_SYNC_KEY = 'letsplay_messages_sync_tick';

function demoStorageKey(personaId) {
  return `${DEMO_STORAGE_PREFIX}${personaId}`;
}

function personaKeyFor(user) {
  return user?.profileKey || (user?.id === 'demo-user-8842' ? 'pixel' : 'vortex');
}

function cleanDemoState(raw, personaKey, now) {
  const state = seedDemoThreadState(personaKey, now);
  if (!raw || typeof raw !== 'object') return state;
  if (typeof raw.seededAt === 'string' && Number.isFinite(Date.parse(raw.seededAt))) state.seededAt = raw.seededAt;
  state.threads = {};
  for (const [peerId, messages] of Object.entries(raw.threads || {})) {
    if (!Array.isArray(messages) || messages.length === 0) continue;
    state.threads[peerId] = messages
      .filter((message) => message && typeof message.body === 'string')
      .map((message, index) => ({
        id: message.id || `demo-${peerId}-${index + 1}`,
        from: message.from === 'me' ? 'me' : 'them',
        body: String(message.body).slice(0, MESSAGE_MAX_LENGTH),
        at: typeof message.at === 'string' ? message.at : state.seededAt,
        read: message.from === 'me' ? true : message.read !== false,
      }));
  }
  state.blocked = Array.isArray(raw.blocked) ? [...new Set(raw.blocked.filter((id) => typeof id === 'string'))] : [];
  state.reported = raw.reported && typeof raw.reported === 'object' ? raw.reported : {};
  state.deliveredIncoming = Number.isFinite(raw.deliveredIncoming) ? raw.deliveredIncoming : 0;
  state.replyCounters = raw.replyCounters && typeof raw.replyCounters === 'object' ? raw.replyCounters : {};
  return state;
}

/** Discussions de la persona, semées au premier accès. */
export function readDemoMessages(user) {
  const personaKey = personaKeyFor(user);
  const seed = seedDemoThreadState(personaKey);
  if (typeof window === 'undefined' || !window.localStorage) return seed;
  try {
    const raw = window.localStorage.getItem(demoStorageKey(user.id));
    if (raw) return cleanDemoState(JSON.parse(raw), personaKey, Date.now());
  } catch (e) { /* stockage illisible : on repart de la graine */ }
  writeDemoMessages(user, seed);
  return seed;
}

export function writeDemoMessages(user, state) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(demoStorageKey(user.id), JSON.stringify(state));
    window.localStorage.setItem(DEMO_MESSAGES_SYNC_KEY, String(Date.now()));
  } catch (e) { /* stockage plein ou désactivé : l'état reste en mémoire */ }
}

/** Remet la messagerie de la persona à son état de départ. */
export function resetDemoMessages(user) {
  const state = seedDemoThreadState(personaKeyFor(user));
  writeDemoMessages(user, state);
  return state;
}

/** Une discussion enregistrée → forme normalisée. */
function demoThread(peerId, uid, messages) {
  const list = (messages || []).map((message, index) => ({
    id: message.id || `demo-${peerId}-${index + 1}`,
    peerId,
    key: conversationKey(uid, peerId),
    mine: message.from === 'me',
    body: message.body,
    createdAt: message.at,
    read: message.from === 'me' ? true : message.read !== false,
  }));
  const last = list.length > 0 ? list[list.length - 1] : null;
  return {
    peerId,
    key: conversationKey(uid, peerId),
    messages: list,
    lastMessage: last,
    lastAt: last?.createdAt || null,
    unread: list.filter((message) => !message.mine && !message.read).length,
  };
}

/** État démo → discussions normalisées (même forme que les comptes réels). */
export function demoThreads(state, uid) {
  const threads = {};
  for (const [peerId, messages] of Object.entries(state?.threads || {})) {
    if (!peerId || peerId === uid) continue;
    threads[peerId] = demoThread(peerId, uid, messages);
  }
  return threads;
}

/** Ajoute un message à l'état démo (immuable) et renvoie le nouvel état. */
function appendDemoMessage(state, peerId, from, body, at, read) {
  const messages = [...(state.threads[peerId] || [])];
  messages.push({ id: `demo-${peerId}-${messages.length + 1}-${at.slice(11, 19).replace(/:/g, '')}`, from, body, at, read });
  return { ...state, threads: { ...state.threads, [peerId]: messages } };
}

/** La persona écrit : le message part et ses non-lus deviennent lus. */
export function applyDemoSend(state, peerId, body, now = Date.now()) {
  const clean = prepareBody(body);
  if (!clean) return state;
  const withRead = {
    ...state,
    threads: {
      ...state.threads,
      [peerId]: (state.threads[peerId] || []).map((message) => (message.from === 'them' ? { ...message, read: true } : message)),
    },
  };
  return appendDemoMessage(withRead, peerId, 'me', clean, new Date(now).toISOString(), true);
}

/** Un joueur scripté répond. */
export function applyDemoReply(state, peerId, now = Date.now()) {
  const index = Number.isFinite(state.replyCounters?.[peerId]) ? state.replyCounters[peerId] : 0;
  const next = appendDemoMessage(state, peerId, 'them', demoReplyFor(peerId, index), new Date(now).toISOString(), false);
  return { ...next, replyCounters: { ...next.replyCounters, [peerId]: index + 1 } };
}

/** Un message scripté arrive (`dueDemoIncoming` décide du moment). */
export function applyDemoIncoming(state, event, now = Date.now()) {
  if (!event?.from || !event?.body) return state;
  const next = appendDemoMessage(state, event.from, 'them', event.body, new Date(now).toISOString(), false);
  return { ...next, deliveredIncoming: (Number.isFinite(state.deliveredIncoming) ? state.deliveredIncoming : 0) + 1 };
}

/** Accusé de lecture : tous les messages reçus de cet ami passent en lus. */
export function applyDemoRead(state, peerId) {
  const messages = state.threads[peerId];
  if (!messages || !messages.some((message) => message.from === 'them' && !message.read)) return state;
  return {
    ...state,
    threads: {
      ...state.threads,
      [peerId]: messages.map((message) => (message.from === 'them' ? { ...message, read: true } : message)),
    },
  };
}

/** Bloquer un joueur : ses réponses scriptées s'arrêtent aussi. */
export function applyDemoBlock(state, peerId) {
  if (!peerId || state.blocked.includes(peerId)) return state;
  return { ...state, blocked: [...state.blocked, peerId] };
}

export function applyDemoUnblock(state, peerId) {
  if (!peerId || !state.blocked.includes(peerId)) return state;
  return { ...state, blocked: state.blocked.filter((id) => id !== peerId) };
}

/** Signaler un joueur (un seul signalement par joueur, le motif est écrasé). */
export function applyDemoReport(state, peerId, reason = 'other', now = Date.now()) {
  if (!peerId) return state;
  const safeReason = REPORT_REASONS.includes(reason) ? reason : 'other';
  const previous = state.reported[peerId];
  if (previous?.reason === safeReason) return state;
  return {
    ...state,
    reported: { ...state.reported, [peerId]: { reason: safeReason, at: new Date(now).toISOString() } },
  };
}
