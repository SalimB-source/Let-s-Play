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
 *   message : { id, peerId, key, mine, kind, body, attachmentPath, attachmentUrl,
 *               attachmentDuration, createdAt, read }
 *
 * Messages vocaux : `kind` vaut `'voice'`, `body` reste vide, et le fichier
 * vit soit dans le bucket privé `voice-messages` (compte Supabase —
 * `attachmentPath` est la clé de l'objet, à faire signer via
 * `getVoiceMessageUrl`), soit en `data:` URL dans localStorage (persona de
 * démonstration — `attachmentUrl` est alors directement lisible).
 *
 * Diagnostic : en cas d'échec d'envoi vocal, `window.__lpVoiceDiag()` sonde
 * chaque étape (upload storage, URL signée, INSERT) sans rien laisser derrière
 * — voir `diagnoseVoicePipeline()` plus bas.
 */
import { supabase, supabaseConfigStatus, supabaseHost } from '../lib/supabase';
import { demoReplyFor, seedDemoThreadState } from './demoThreads';

export const MESSAGES_TABLE = 'direct_messages';
export const BLOCKS_TABLE = 'message_blocks';
export const REPORTS_TABLE = 'message_reports';
export const VOICE_BUCKET = 'voice-messages';
const BASE_MESSAGE_COLUMNS = 'id, conversation_key, sender_id, recipient_id, body, created_at, read_at';
const MESSAGE_COLUMNS = 'id, conversation_key, sender_id, recipient_id, body, kind, attachment_path, attachment_duration, attachment_mime, created_at, read_at';

/** Longueur maximale d'un message (contrainte SQL identique). */
export const MESSAGE_MAX_LENGTH = 1000;
/** Durée maximale d'un message vocal, en secondes (contrainte SQL identique). */
export const VOICE_MAX_SECONDS = 120;
/** Poids maximal d'un enregistrement vocal, en octets (limite du bucket). */
export const VOICE_MAX_BYTES = 5 * 1024 * 1024;
/** Types MIME acceptés par le bucket `voice-messages` (miroir de schema.sql). */
export const VOICE_ALLOWED_MIME = [
  'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/wav', 'audio/x-m4a',
];
/** Motifs de signalement proposés au joueur. */
export const REPORT_REASONS = ['harassment', 'spam', 'hate', 'inappropriate', 'other'];

// ---------------------------------------------------------------------------
// Erreurs
// ---------------------------------------------------------------------------

/**
 * Décrit une erreur Supabase sous une forme plate et lisible.
 *
 * Le client renvoie des objets aux formes variées (`PostgrestError` et
 * `StorageError` sont de simples objets, `AuthError` une classe, et un échec
 * réseau une `Error` ordinaire) ; or ce sont précisément `code`, `status`,
 * `details` et `hint` qui distinguent un refus RLS (403 / `42501`), un bucket
 * absent (404), un type MIME rejeté (400) ou un trigger qui lève (`P0001`).
 * `console.error(objet)` ne les affiche pas de façon fiable une fois le bundle
 * minifié : on les extrait donc explicitement.
 *
 * @param {*} error Erreur (ou objet d'erreur) renvoyée par supabase-js.
 * @param {number} depth Garde-fou contre une chaîne de `cause` cyclique.
 * @returns {{name: string|null, message: string|null, code: string|null,
 *   status: number|string|null, error: string|null, details: string|null,
 *   hint: string|null, cause: object|null}|null}
 */
export function describeSupabaseError(error, depth = 0) {
  if (error === null || error === undefined) return null;
  if (depth > 3) return { message: '[cause chain too deep]' };

  const pick = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return null;
  };

  // `PostgrestError` n'a pas de `status` ; `StorageError` porte `statusCode`,
  // et un `fetch` raté remonte parfois la réponse d'origine.
  const rawStatus = pick(error.status, error.statusCode, error.response?.status, error.__httpStatus);
  const numericStatus = Number(rawStatus);

  const described = {
    name: pick(error.name),
    message: pick(error.message, error.error_description, error.msg),
    code: pick(error.code, error.errorCode, error.name === 'AuthError' ? error.name : null),
    status: rawStatus === null ? null : (Number.isFinite(numericStatus) ? numericStatus : rawStatus),
    error: pick(error.error),
    details: pick(error.details),
    hint: pick(error.hint),
  };

  if (typeof error === 'string') described.message = error;
  if (error instanceof Error && !described.name) described.name = error.name;

  const cause = error.cause && error.cause !== error ? describeSupabaseError(error.cause, depth + 1) : null;
  if (cause) described.cause = cause;
  return described;
}

/** Résumé d'une erreur en une ligne, pour les `notes` du diagnostic. */
function errorSummary(error) {
  const described = describeSupabaseError(error) || {};
  const bits = [described.status && `HTTP ${described.status}`, described.code && `code ${described.code}`, described.message]
    .filter(Boolean);
  return bits.join(' · ') || 'erreur inconnue';
}

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

/** Le trigger a refusé : message vocal sans fichier valide (ou trop long). */
export function isInvalidVoiceError(error) {
  return /direct_message_voice_(requires_attachment|too_long)/i.test(error?.message || '');
}

/** Vrai quand une colonne de messagerie vocale manque (schéma pas migré). */
export function isMissingVoiceColumnError(error) {
  const code = error?.code || '';
  const message = error?.message || '';
  return code === 'PGRST204'
    || code === '42703'
    || /column .* does not exist|could not find the.*column|kind|attachment_path|attachment_duration|attachment_mime/i.test(message) && /direct_messages/i.test(message + (error?.details || ''))
    || (/column|Could not find/i.test(message) && /(kind|attachment_path|attachment_duration|attachment_mime)/i.test(message));
}

/** Détecte une erreur de colonne manquante (pour le fallback texte seul). */
function isColumnMissingError(error) {
  const msg = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const code = String(error?.code || '');
  return code === 'PGRST204' || code === '42703'
    || msg.includes('column') && (msg.includes('kind') || msg.includes('attachment'))
    || msg.includes('could not find') && (msg.includes('kind') || msg.includes('attachment'))
    || details.includes('kind') || details.includes('attachment_path');
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
    kind: row.kind === 'voice' ? 'voice' : 'text',
    body: String(row.body ?? ''),
    attachmentPath: row.attachment_path || null,
    attachmentDuration: Number.isFinite(row.attachment_duration) ? row.attachment_duration : null,
    attachmentMime: row.attachment_mime || null,
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

/**
 * Supprime un message d'une discussion (optimiste, temps réel DELETE ou
 * suppression locale). Met à jour `lastMessage` / `lastAt` et décrémente
 * `unread` si le message supprimé était un non-lu.
 */
export function removeMessage(threads, peerId, messageId) {
  if (!peerId || !messageId) return threads;
  const thread = threads?.[peerId];
  if (!thread) return threads;
  const remaining = thread.messages.filter((message) => message.id !== messageId);
  if (remaining.length === thread.messages.length) return threads;
  const deleted = thread.messages.find((message) => message.id === messageId);
  const lastMessage = remaining.length > 0 ? remaining[remaining.length - 1] : null;
  const unread = deleted && !deleted.mine && !deleted.read ? Math.max(0, thread.unread - 1) : thread.unread;
  // Si le dernier message supprimé était un non-lu, on recalcule au cas où
  // plusieurs messages partagent le même horodatage.
  const finalUnread = deleted && !deleted.mine && !deleted.read
    ? remaining.filter((message) => !message.mine && !message.read).length
    : unread;
  return {
    ...threads,
    [peerId]: {
      ...thread,
      messages: remaining,
      lastMessage,
      lastAt: lastMessage?.createdAt || null,
      unread: finalUnread,
    },
  };
}

/** Supprime un message où qu'il soit (recherche par id). */
export function removeMessageById(threads, messageId) {
  if (!messageId) return threads;
  for (const [peerId, thread] of Object.entries(threads || {})) {
    if (thread.messages.some((message) => message.id === messageId)) {
      return removeMessage(threads, peerId, messageId);
    }
  }
  return threads;
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

/** Messages récents du joueur (les deux sens), du plus récent au plus ancien). */
export async function fetchRecentMessages(uid, limit = 200) {
  if (!supabase || !uid) return [];
  try {
    const { data, error } = await supabase
      .from(MESSAGES_TABLE)
      .select(MESSAGE_COLUMNS)
      .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (e) {
    if (isColumnMissingError(e)) {
      const { data, error } = await supabase
        .from(MESSAGES_TABLE)
        .select(BASE_MESSAGE_COLUMNS)
        .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    }
    throw e;
  }
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
  try {
    const { data, error } = await supabase
      .from(MESSAGES_TABLE)
      .select(MESSAGE_COLUMNS)
      .eq('conversation_key', key)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).reverse();
  } catch (e) {
    if (isColumnMissingError(e)) {
      const { data, error } = await supabase
        .from(MESSAGES_TABLE)
        .select(BASE_MESSAGE_COLUMNS)
        .eq('conversation_key', key)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []).reverse();
    }
    throw e;
  }
}

/** Envoie un message ; renvoie la ligne créée par le serveur. */
export async function sendMessage(uid, peerId, body) {
  if (!supabase) throw new Error('Supabase is not configured');
  try {
    const { data, error } = await supabase
      .from(MESSAGES_TABLE)
      .insert({ recipient_id: peerId, body: prepareBody(body) })
      .select(MESSAGE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    if (isColumnMissingError(e)) {
      const { data, error } = await supabase
        .from(MESSAGES_TABLE)
        .insert({ recipient_id: peerId, body: prepareBody(body) })
        .select(BASE_MESSAGE_COLUMNS)
        .single();
      if (error) throw error;
      return data;
    }
    throw e;
  }
}

/** Extension de fichier à utiliser pour un enregistrement, selon son type MIME. */
export function voiceFileExtension(mime) {
  const value = String(mime || '').toLowerCase();
  if (/mp4|m4a|aac/.test(value)) return 'm4a';
  if (/ogg/.test(value)) return 'ogg';
  if (/wav/.test(value)) return 'wav';
  return 'webm';
}

/**
 * Ramène un type MIME d'enregistrement à une valeur acceptée par le bucket.
 *
 * `MediaRecorder` annonce `audio/webm;codecs=opus` : avec le paramètre
 * `;codecs=`, la comparaison au `allowed_mime_types` du bucket échoue et
 * l'upload est refusé. On garde donc la partie avant le `;`, et on retombe sur
 * `fallback` pour tout ce qui n'est pas un `audio/…` connu.
 */
export function cleanVoiceMime(mime, fallback = 'audio/webm') {
  const value = String(mime || '').split(';')[0].trim().toLowerCase();
  if (!value || !value.startsWith('audio/')) return fallback;
  return VOICE_ALLOWED_MIME.includes(value) ? value : fallback;
}

// ---------------------------------------------------------------------------
// Échecs de la chaîne vocale
// ---------------------------------------------------------------------------

/**
 * Identifiant que l'application utilise pour construire les chemins
 * `{uid}/…`. Renseigné par `MessagesContext` au montage : le diagnostic le
 * compare à `auth.uid()` de la session, car les deux politiques (upload
 * storage et trigger `direct_messages`) exigent `auth.uid()`.
 */
let appVoiceUid = null;

/** Mémorise l'identifiant côté application (voir `appVoiceUid`). */
export function rememberVoiceUid(uid) {
  appVoiceUid = uid ? String(uid) : null;
  return appVoiceUid;
}

/** L'identifiant côté application, tel que mémorisé (peut valoir `null`). */
export function rememberedVoiceUid() {
  return appVoiceUid;
}

/**
 * Journalise un échec de la chaîne vocale et renvoie l'erreur décrite.
 *
 * Volontairement **non** conditionné à `import.meta.env.DEV` : l'échec se
 * reproduit sur le build déployé, où ce drapeau vaut `false`. Sans ce log, la
 * cause réelle (politique RLS, bucket, trigger) disparaît complètement et
 * l'écran n'affiche que « Ce message vocal n'a pas pu être envoyé ».
 *
 * @param {'upload'|'insert'} stage Étape en échec.
 * @param {*} error Erreur remontée par supabase-js.
 * @param {object} context Détails de l'appel (chemin, mime, taille…).
 */
function voiceFailure(stage, error, context = {}) {
  const described = describeSupabaseError(error);
  // eslint-disable-next-line no-console
  console.error(`[voice] ${stage} failed`, { stage, ...context, error: described });
  return described;
}

/**
 * Dépose un enregistrement vocal dans le bucket privé `voice-messages`, sous
 * `{uid}/…` (imposé par la politique de stockage). Renvoie la clé de l'objet,
 * à passer à `sendVoiceMessage`.
 */
export async function uploadVoiceRecording(uid, blob) {
  if (!supabase) throw new Error('Supabase is not configured');
  if (!uid || !blob) throw new Error('direct_message_missing');
  if (blob.size > VOICE_MAX_BYTES) {
    throw Object.assign(new Error('direct_message_voice_too_long'), { code: 'P0001', stage: 'upload' });
  }
  const contentType = cleanVoiceMime(blob.type);
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${voiceFileExtension(contentType)}`;
  try {
    const { error } = await supabase.storage.from(VOICE_BUCKET).upload(path, blob, {
      contentType,
      upsert: false,
    });
    if (error) throw error;
    return path;
  } catch (e) {
    // Bucket manquant, quota, mime refusé ou politique RLS : on signale une
    // erreur vocale explicite (affichée comme errVoiceInvalid) plutôt qu'un
    // générique « Un problème est survenu ». La cause réelle est journalisée
    // et portée par l'erreur (`stage`, `supabase`) pour rester diagnosable.
    const described = voiceFailure('upload', e, {
      bucket: VOICE_BUCKET,
      path,
      pathOwner: String(path).split('/')[0],
      contentType,
      rawType: blob?.type ?? null,
      size: blob?.size ?? null,
      uid: uid ? String(uid) : null,
    });
    throw Object.assign(new Error('direct_message_voice_requires_attachment'), {
      code: 'P0001',
      stage: 'upload',
      cause: e,
      supabase: described,
    });
  }
}

/** Envoie un message vocal (fichier déjà déposé par `uploadVoiceRecording`). */
export async function sendVoiceMessage(uid, peerId, attachmentPath, durationSeconds, mime) {
  if (!supabase) throw new Error('Supabase is not configured');
  const payload = {
    recipient_id: peerId,
    body: '',
    kind: 'voice',
    attachment_path: attachmentPath,
    attachment_duration: Math.min(VOICE_MAX_SECONDS, Math.max(1, Math.round(durationSeconds || 0))),
    attachment_mime: cleanVoiceMime(mime),
  };
  try {
    const { data, error } = await supabase
      .from(MESSAGES_TABLE)
      .insert(payload)
      .select(MESSAGE_COLUMNS)
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    // Le trigger refuse soit un fichier dont le dossier n'est pas
    // `{sender_id}/…`, soit une amitié non `accepted` ; un échec de colonne
    // signale un schéma non migré. Dans tous les cas, la cause réelle est
    // journalisée et l'étape est portée par l'erreur.
    const described = voiceFailure('insert', e, {
      peerId: peerId ? String(peerId) : null,
      attachmentPath: attachmentPath || null,
      pathOwner: String(attachmentPath || '').split('/')[0] || null,
      durationSeconds: payload.attachment_duration,
      mime: mime || null,
      attachmentMime: payload.attachment_mime,
      uid: uid ? String(uid) : null,
    });
    if (isColumnMissingError(e) || isMissingVoiceColumnError(e)) {
      throw Object.assign(new Error('direct_message_voice_requires_attachment'), {
        code: 'P0001', stage: 'insert', cause: e, supabase: described,
      });
    }
    // Les refus du trigger (amitié, blocage, cadence) conservent leur message :
    // l'interface les traduit déjà. On n'ajoute que l'étape et la cause.
    if (e && typeof e === 'object') {
      let enriched = e;
      try { enriched = Object.assign(e, { stage: 'insert', supabase: described }); } catch { /* objet scellé */ }
      throw enriched;
    }
    throw Object.assign(new Error(String(e)), { stage: 'insert', cause: e, supabase: described });
  }
}

/** URL signée temporaire pour lire un message vocal (le bucket est privé). */
export async function getVoiceMessageUrl(attachmentPath, expiresInSeconds = 3600) {
  if (!supabase || !attachmentPath) return null;
  try {
    const { data, error } = await supabase.storage
      .from(VOICE_BUCKET)
      .createSignedUrl(attachmentPath, expiresInSeconds);
    if (error) throw error;
    return data?.signedUrl || null;
  } catch (e) {
    // Bucket manquant ou politique non appliquée : pas de crash, on
    // renvoie null et la bulle affiche voiceUnavailable. L'échec reste
    // journalisé : « audio introuvable » et « envoi refusé » se ressemblent
    // à l'écran mais n'ont pas la même cause.
    voiceFailure('signed-url', e, { bucket: VOICE_BUCKET, attachmentPath });
    const msg = String(e?.message || '').toLowerCase();
    if (msg.includes('bucket') || msg.includes('not found') || msg.includes('does not exist')) return null;
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Diagnostic de la chaîne vocale
// ---------------------------------------------------------------------------

/** Table des amitiés (miroir de `friendsApi.js`, pour rester autonome). */
const FRIENDSHIPS_TABLE = 'friendships';
/** Préfixe des objets déposés par le diagnostic (facile à repérer / purger). */
const DIAG_PATH_PREFIX = '__lp-voice-diag';
/** Uuid nul : sonde de lecture qui ne ramène jamais de ligne. */
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

/** Uuid v4 (le diagnostic a seulement besoin d'un identifiant bien formé). */
function randomUuid() {
  const cryptoRef = typeof globalThis === 'undefined' ? undefined : globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') return cryptoRef.randomUUID();
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  const block = (length) => Array.from({ length }, hex).join('');
  const variant = (Math.floor(Math.random() * 4) + 8).toString(16);
  return `${block(8)}-${block(4)}-4${block(3)}-${variant}${block(3)}-${block(12)}`;
}

/**
 * Interprète un échec d'upload dans `storage.objects`.
 * Les deux politiques en jeu : la présence du bucket, et
 * `(storage.foldername(name))[1] = auth.uid()::text`.
 */
function interpretUploadError(described, pathOwner, sessionUid) {
  const status = described?.status;
  const text = [described?.message, described?.error, described?.details, described?.hint].filter(Boolean).join(' ').toLowerCase();
  if (status === 400 && /(mime|content.?type|unsupported|invalid)/.test(text)) {
    return 'Le bucket a refusé ce type MIME : vérifie `allowed_mime_types` (7 valeurs attendues, sans `;codecs=`).';
  }
  if (status === 404 || /(bucket not found|does not exist|not found)/.test(text)) {
    return `Le bucket « ${VOICE_BUCKET} » est introuvable pour ce projet (mauvais projet Supabase, ou bucket non créé).`;
  }
  if (status === 413 || /(too large|exceed|maximum)/.test(text)) {
    return 'Fichier au-delà de la limite du bucket (5 Mo attendus).';
  }
  if (status === 403 || status === 401 || /(row.level security|row-level security|violates|policy|permission denied|jwt|unauthorized)/.test(text)) {
    return sessionUid && pathOwner && pathOwner !== sessionUid
      ? `Refus RLS : le chemin commence par « ${pathOwner} » alors que la session vaut « ${sessionUid} ». L'uid utilisé par l'application n'est PAS auth.uid().`
      : `Refus RLS (403/401) sur storage.objects : la politique « Players upload their own voice messages » n'est pas satisfaite (bucket_id ou dossier {auth.uid()}), ou le JWT n'est pas celui d'un compte authenticated.`;
  }
  if (/(failed to fetch|networkerror|network|cors|load failed)/.test(text)) {
    return 'Échec réseau/CORS avant même d’atteindre Supabase (bloqueur d’annonces, proxy, ou URL de projet injoignable).';
  }
  return 'Échec d’upload non classé : lis `code`/`status`/`details` ci-dessus.';
}

/**
 * Interprète la sonde d'INSERT.
 *
 * La sonde vise un destinataire **aléatoire** : le trigger `before insert`
 * lève donc avant tout engagement (ni contrainte de clé étrangère, ni
 * politique RLS `with check` ne sont atteintes) et aucune ligne n'est créée.
 * L'ordre des contrôles dans le trigger est décisif : les vérifications
 * vocales (`attachment_path` non vide, `split_part(path,'/',1) = sender_id`,
 * durée 1..120) passent **avant** le contrôle d'amitié. Obtenir
 * `direct_message_requires_friendship` prouve donc que toute la partie vocale
 * est acceptée.
 */
function interpretInsertProbe(described) {
  const message = String(described?.message || '');
  const code = String(described?.code || '');
  const status = described?.status;
  if (/direct_message_requires_friendship/i.test(message)) {
    return { passed: true, meaning: 'Les contrôles vocaux du trigger sont PASSÉS (chemin `{uid}/…` accepté, durée valide, colonnes présentes). Seule l\'amitié manquait — attendu, le destinataire de la sonde est aléatoire.' };
  }
  if (/direct_message_voice_requires_attachment/i.test(message)) {
    return { passed: false, meaning: 'Le trigger a rejeté le fichier : `attachment_path` vide, ou `split_part(attachment_path,\'/\',1) <> sender_id` — l\'uid qui construit le chemin n\'est pas auth.uid().' };
  }
  if (/direct_message_voice_too_long/i.test(message)) {
    return { passed: false, meaning: 'Le trigger a rejeté la durée (`attachment_duration` hors 1..120).' };
  }
  if (/direct_message_invalid_kind/i.test(message)) {
    return { passed: false, meaning: 'Le trigger a rejeté `kind` (attendu \'text\' ou \'voice\') — colonne `kind` présente mais contrainte différente du schéma livré.' };
  }
  if (/direct_message_requires_auth/i.test(message) || code === '42501') {
    return { passed: false, meaning: 'Pas de session : `auth.uid()` est NULL côté serveur. Le token n\'est pas envoyé ou a expiré.' };
  }
  if (/direct_message_to_self/i.test(message)) {
    return { passed: false, meaning: 'La sonde est tombée sur soi-même (cas dégénéré) — relance le diagnostic.' };
  }
  if (code === 'PGRST204' || code === '42703' || /(column|could not find)/i.test(message)) {
    return { passed: false, meaning: 'Une colonne vocale manque (`kind`, `attachment_path`, `attachment_duration`, `attachment_mime`) : le schéma SQL n\'a pas été rejoué sur CE projet.' };
  }
  if (code === '42P01' || code === 'PGRST205' || /relation .* does not exist|could not find the table/i.test(message)) {
    return { passed: false, meaning: 'La table `public.direct_messages` n\'existe pas sur ce projet.' };
  }
  if (status === 403 || /row.level security|row-level security|violates/i.test(message)) {
    return { passed: false, meaning: 'Politique RLS d\'INSERT refusée (`auth.uid() = sender_id and auth.uid() <> recipient_id`).' };
  }
  return { passed: false, meaning: 'Échec d\'INSERT non classé : lis `code`/`status`/`details` ci-dessus.' };
}

/**
 * Sonde la chaîne complète d'un message vocal et renvoie un rapport lisible.
 *
 * Exposée dans la console par `window.__lpVoiceDiag()`. Chaque étape est
 * isolée : un échec n'interrompt pas les suivantes, et le rapport dit quelle
 * étape casse — `storage-upload`, `storage-signed-url` ou l'`INSERT`.
 *
 * Sans argument, le diagnostic ne crée **aucun** message visible : la sonde
 * d'INSERT vise un destinataire aléatoire, que le trigger refuse avant tout
 * engagement, et l'objet déposé dans le bucket est supprimé en fin de course.
 *
 * @param {object} [options]
 * @param {string} [options.uid] Identifiant à tester (défaut : celui mémorisé
 *   par l'application, sinon `auth.uid()` de la session).
 * @param {string} [options.mimeType] Type brut annoncé par `MediaRecorder`
 *   (défaut : `audio/webm;codecs=opus`, le cas réel le plus courant).
 * @param {string} [options.peerId] Identifiant d'un ami `accepted` : ajoute un
 *   INSERT **réel** (puis sa suppression immédiate, ligne et fichier) pour
 *   tester aussi la politique RLS d'insertion et le contrôle d'amitié.
 * @returns {Promise<object>} Rapport `{ startedAt, stages, notes, verdict }`.
 */
export async function diagnoseVoicePipeline(options = {}) {
  const startedAt = new Date().toISOString();
  const stages = {};
  const notes = [];
  const note = (text) => { notes.push(text); };
  const stage = (name, ok, payload = {}) => {
    stages[name] = Object.assign({ ok: Boolean(ok) }, payload);
    return stages[name];
  };
  let diagPath = null;
  let diagRowId = null;
  let liveTestRow = null; // ligne de test encore en place (id), sinon null

  const report = () => {
    const failed = Object.keys(stages).filter((name) => !stages[name].ok);
    const verdict = failed.length === 0
      ? 'Chaîne vocale entièrement verte côté client/serveur : si l\'envoi échoue encore en vrai, compare l\'enregistrement réel (mime, taille, durée) à la sonde, ou relance avec `{ peerId }` pour tester l\'INSERT de bout en bout.'
      : `Étape(s) en échec : ${failed.join(', ')}.`;
    const payload = { startedAt, finishedAt: new Date().toISOString(), stages, notes, verdict };
    // eslint-disable-next-line no-console
    console.log('[voice] diagnostic report', payload);
    if (failed.length > 0) {
      // eslint-disable-next-line no-console
      console.error('[voice] diagnostic — première étape cassée :', failed[0], stages[failed[0]]);
    }
    return payload;
  };

  // --- 1. client Supabase ---------------------------------------------------
  stage('client', Boolean(supabase), {
    configured: Boolean(supabase),
    host: supabaseHost || null,
    hasUrl: supabaseConfigStatus.hasUrl,
    hasKey: supabaseConfigStatus.hasKey,
    bucket: VOICE_BUCKET,
    maxBytes: VOICE_MAX_BYTES,
    allowedMime: VOICE_ALLOWED_MIME,
  });
  if (!supabase) {
    note('client : Supabase non configuré (VITE_SUPABASE_URL / clé absente) — aucune étape suivante ne peut tourner.');
    return report();
  }

  // --- 2. session : l'uid de l'application est-il auth.uid() ? -------------
  let sessionUid = null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    sessionUid = data?.session?.user?.id || null;
    stage('auth', Boolean(sessionUid), {
      sessionUid,
      email: data?.session?.user?.email || null,
      expiresAt: data?.session?.expires_at || null,
      appUid: appVoiceUid,
      requestedUid: options.uid ? String(options.uid) : null,
    });
    if (!sessionUid) note('auth : aucune session — le diagnostic tourne-t-il sur un compte connecté (et pas une persona de démonstration) ?');
  } catch (e) {
    stage('auth', false, { error: describeSupabaseError(e) });
    note(`auth : getSession() a échoué — ${errorSummary(e)}`);
  }

  const uid = String(options.uid || appVoiceUid || sessionUid || '');
  const uidMatchesSession = uid && sessionUid ? uid === sessionUid : null;
  stages.auth = Object.assign(stages.auth || { ok: Boolean(sessionUid) }, { uidUsedForPaths: uid || null, uidMatchesSession });
  if (uidMatchesSession === false) {
    note(`auth : ÉCART D'IDENTIFIANT — l'application construit les chemins avec « ${uid} » alors que la session vaut « ${sessionUid} ». La politique d'upload ET le trigger (split_part(attachment_path, '/', 1) = sender_id) exigent auth.uid() : c'est la cause la plus probable de l'échec.`);
  }
  if (!uid) {
    note('auth : aucun uid à tester — passe `{ uid }` ou connecte un compte.');
    return report();
  }

  // --- 3. enregistrement de test -------------------------------------------
  const rawType = options.mimeType || 'audio/webm;codecs=opus';
  const cleanedMime = cleanVoiceMime(rawType);
  const extension = voiceFileExtension(cleanedMime);
  let blob = null;
  try {
    if (typeof Blob === 'undefined') throw new Error('Blob indisponible dans cet environnement');
    // ~4 Ko d'octets : Supabase vérifie le MIME et la taille, pas le contenu.
    blob = new Blob([new Uint8Array(4096).fill(26)], { type: cleanedMime });
    stage('recording', true, {
      rawType, cleanedMime, extension, size: blob.size,
      mimeWasRewritten: rawType.toLowerCase() !== cleanedMime,
      allowed: VOICE_ALLOWED_MIME.includes(cleanedMime),
    });
    if (!VOICE_ALLOWED_MIME.includes(cleanedMime)) {
      note(`recording : « ${cleanedMime} » n'est pas dans allowed_mime_types — l'upload sera refusé.`);
    }
  } catch (e) {
    stage('recording', false, { rawType, cleanedMime, error: describeSupabaseError(e) });
    note(`recording : blob de test impossible — ${errorSummary(e)}`);
    return report();
  }

  // --- 4. bucket (best-effort, souvent refusé sans service_role) -----------
  try {
    const { data, error } = await supabase.storage.getBucket(VOICE_BUCKET);
    if (error) throw error;
    stage('bucket', true, {
      id: data?.id, public: data?.public, fileSizeLimit: data?.file_size_limit,
      allowedMimeTypes: data?.allowed_mime_types || null,
    });
    if (data && data.public) note('bucket : le bucket est PUBLIC alors que le schéma le veut privé.');
  } catch (e) {
    // Non bloquant : lire un bucket n'est pas accordé au rôle `authenticated`
    // sur tous les projets. On le signale sans conclure.
    stage('bucket', true, { skipped: true, reason: errorSummary(e), error: describeSupabaseError(e) });
    note('bucket : lecture des métadonnées refusée (normal sans clé service_role) — non concluant.');
  }

  // --- 5. storage-upload ----------------------------------------------------
  diagPath = `${uid}/${DIAG_PATH_PREFIX}-${Date.now()}.${extension}`;
  try {
    const { data, error } = await supabase.storage.from(VOICE_BUCKET).upload(diagPath, blob, {
      contentType: cleanedMime,
      upsert: true,
    });
    if (error) throw error;
    stage('storage-upload', true, { path: diagPath, contentType: cleanedMime, size: blob.size, returnedPath: data?.path || null });
  } catch (e) {
    const described = describeSupabaseError(e);
    stage('storage-upload', false, {
      path: diagPath, pathOwner: uid, sessionUid, contentType: cleanedMime, size: blob.size,
      error: described, interpretation: interpretUploadError(described, uid, sessionUid),
    });
    note(`storage-upload : ${errorSummary(e)} → ${stages['storage-upload'].interpretation}`);
    // Sans objet déposé, la suite (URL signée, INSERT) n'a plus de sens : on
    // sonde quand même les colonnes et le trigger, qui ont leurs propres causes.
  }

  // --- 6. storage-signed-url ------------------------------------------------
  if (stages['storage-upload']?.ok) {
    try {
      const { data, error } = await supabase.storage.from(VOICE_BUCKET).createSignedUrl(diagPath, 60);
      if (error) throw error;
      const signedUrl = data?.signedUrl || null;
      let fetchStatus = null;
      if (signedUrl && typeof fetch === 'function') {
        try {
          const response = await fetch(signedUrl);
          fetchStatus = response.status;
          // On ne télécharge pas le corps : le statut suffit.
          if (typeof response.body?.cancel === 'function') await response.body.cancel();
        } catch (fetchError) {
          fetchStatus = `fetch échoué : ${errorSummary(fetchError)}`;
        }
      }
      const readable = Boolean(signedUrl) && fetchStatus === 200;
      stage('storage-signed-url', readable, { signedUrl: signedUrl ? `${signedUrl.slice(0, 72)}…` : null, fetchStatus });
      if (!readable) {
        note(`storage-signed-url : URL signée ${signedUrl ? 'obtenue' : 'refusée'}, relecture ${fetchStatus}. Sans URL lisible, la bulle affiche « message vocal indisponible » (voir la politique « Conversation participants read voice messages »).`);
      }
    } catch (e) {
      stage('storage-signed-url', false, { path: diagPath, error: describeSupabaseError(e) });
      note(`storage-signed-url : ${errorSummary(e)} → l'upload a réussi mais la relecture échoue (politique de lecture ou bucket privé mal câblé).`);
    }
  } else {
    stage('storage-signed-url', false, { skipped: true, reason: 'upload en échec' });
  }

  // --- 7. colonnes de direct_messages (sonde de lecture, zéro ligne) -------
  try {
    const { error } = await supabase.from(MESSAGES_TABLE).select(MESSAGE_COLUMNS).eq('id', NIL_UUID).maybeSingle();
    if (error) throw error;
    stage('columns', true, { probed: MESSAGE_COLUMNS });
  } catch (e) {
    stage('columns', false, { probed: MESSAGE_COLUMNS, error: describeSupabaseError(e) });
    note(`columns : la SELECT des colonnes vocales échoue — ${errorSummary(e)}. Schéma non rejoué sur ce projet ?`);
  }

  // --- 8. amitiés accepted (le trigger l'exige) ----------------------------
  try {
    const { data, error } = await supabase
      .from(FRIENDSHIPS_TABLE)
      .select('requester_id, addressee_id, status')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)
      .limit(5);
    if (error) throw error;
    const peers = (data || []).map((row) => (row.requester_id === uid ? row.addressee_id : row.requester_id));
    stage('friendship', true, { acceptedSample: peers, count: (data || []).length });
    if (peers.length === 0) {
      note('friendship : AUCUNE amitié `accepted` pour cet uid — tout envoi réel sera refusé par le trigger (`direct_message_requires_friendship`), vocal ou non.');
    } else {
      note(`friendship : ami(s) disponible(s) pour un test de bout en bout — relance avec window.__lpVoiceDiag({ peerId: '${peers[0]}' }).`);
    }
  } catch (e) {
    stage('friendship', false, { error: describeSupabaseError(e) });
    note(`friendship : lecture des amitiés impossible — ${errorSummary(e)}`);
  }

  // --- 9. INSERT : sonde non destructive -----------------------------------
  const probeRecipient = randomUuid();
  const probePayload = {
    recipient_id: probeRecipient,
    body: '',
    kind: 'voice',
    attachment_path: diagPath,
    attachment_duration: 3,
    attachment_mime: cleanedMime,
  };
  try {
    const { data, error } = await supabase.from(MESSAGES_TABLE).insert(probePayload).select('id').maybeSingle();
    if (error) throw error;
    // Cas dégénéré : la sonde a été acceptée (destinataire aléatoire ami).
    // On supprime immédiatement la ligne pour ne rien laisser derrière.
    diagRowId = data?.id || null;
    if (diagRowId) {
      try {
        const { error: deleteError } = await supabase.from(MESSAGES_TABLE).delete().eq('id', diagRowId).eq('sender_id', uid);
        if (!deleteError) diagRowId = null;
      } catch { /* best-effort */ }
    }
    liveTestRow = diagRowId;
    stage('insert-probe', true, {
      unexpected: true, rowId: diagRowId, deleted: Boolean(diagRowId),
      meaning: 'La sonde a été ACCEPTÉE alors que le destinataire était aléatoire : le contrôle d\'amitié du trigger ne semble pas appliqué.',
    });
    note('insert-probe : la sonde a été acceptée — le trigger ne vérifie pas l\'amitié comme dans schema.sql (§3e).');
  } catch (e) {
    const described = describeSupabaseError(e);
    const interpretation = interpretInsertProbe(described);
    stage('insert-probe', interpretation.passed, {
      probeRecipient, payload: probePayload, error: described, meaning: interpretation.meaning,
      noRowCreated: true,
    });
    note(`insert-probe : ${errorSummary(e)} → ${interpretation.meaning}`);
  }

  // --- 10. INSERT réel (opt-in) --------------------------------------------
  const peerId = options.peerId ? String(options.peerId) : null;
  if (peerId && stages['storage-upload']?.ok) {
    try {
      const { data, error } = await supabase
        .from(MESSAGES_TABLE)
        .insert(Object.assign({}, probePayload, { recipient_id: peerId }))
        .select(MESSAGE_COLUMNS)
        .single();
      if (error) throw error;
      diagRowId = data?.id || null;
      // Nettoyage immédiat : la ligne d'abord ; le fichier part à l'étape 11 —
      // sauf si la ligne reste en place (on garde alors un état cohérent).
      let deleted = false;
      if (diagRowId) {
        try {
          const { error: deleteError } = await supabase.from(MESSAGES_TABLE).delete().eq('id', diagRowId).eq('sender_id', uid).select('id');
          deleted = !deleteError;
        } catch { deleted = false; }
        if (deleted) diagRowId = null;
      }
      liveTestRow = deleted ? null : diagRowId;
      stage('insert-real', true, { peerId, rowId: diagRowId, deleted });
      note(`insert-real : INSERT réel accepté puis supprimé (${deleted ? 'ligne effacée' : 'ATTENTION : ligne encore présente, id ' + diagRowId}). La chaîne est fonctionnelle de bout en bout.`);
      if (!deleted) note('insert-real : la ligne de test n\'a pas pu être supprimée — supprime-la à la main.');
    } catch (e) {
      const described = describeSupabaseError(e);
      stage('insert-real', false, { peerId, error: described, interpretation: interpretInsertProbe(described).meaning });
      note(`insert-real : ${errorSummary(e)} → ${interpretInsertProbe(described).meaning}`);
    }
  } else if (peerId) {
    stage('insert-real', false, { skipped: true, reason: 'upload en échec — impossible d\'envoyer un vrai message' });
  } else {
    stage('insert-real', true, { skipped: true, reason: 'non demandé (passe { peerId } pour un INSERT réel, supprimé aussitôt)' });
  }

  // --- 11. nettoyage --------------------------------------------------------
  // L'objet de test part systématiquement, sauf s'il reste référencé par une
  // ligne de test qu'on n'a pas pu supprimer (on garde alors un état cohérent
  // : une bulle ne doit pas pointer vers un fichier absent).
  if (diagPath && stages['storage-upload']?.ok && !liveTestRow) {
    try {
      const { error } = await supabase.storage.from(VOICE_BUCKET).remove([diagPath]);
      if (error) throw error;
      stage('cleanup', true, { removed: diagPath });
    } catch (e) {
      stage('cleanup', false, { removed: null, error: describeSupabaseError(e) });
      note(`cleanup : l'objet de test « ${diagPath} » est encore dans le bucket — supprime-le à la main (politique de suppression refusée ?).`);
    }
  } else {
    stage('cleanup', true, {
      removed: null,
      skipped: !(diagPath && stages['storage-upload']?.ok),
      keptForRow: liveTestRow || undefined,
    });
  }

  return report();
}

// Console de l'application connectée : `await window.__lpVoiceDiag()`.
// Enregistré dès le chargement du module pour rester disponible même quand la
// messagerie n'est pas ouverte, et sans effet de bord (aucun envoi).
if (typeof window !== 'undefined' && typeof window.__lpVoiceDiag !== 'function') {
  window.__lpVoiceDiag = (options) => diagnoseVoicePipeline(options || {});
}

/** Supprime un message envoyé par le joueur connecté (et son fichier, s'il y en a un). */
export async function deleteMessage(uid, messageId, attachmentPath = null) {
  if (!supabase) throw new Error('Supabase is not configured');
  if (!uid || !messageId) throw new Error('direct_message_missing');
  const { data, error } = await supabase
    .from(MESSAGES_TABLE)
    .delete()
    .eq('id', messageId)
    .eq('sender_id', uid)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw Object.assign(new Error('direct_message_not_found'), { code: 'P0001' });
  }
  if (attachmentPath) {
    // Best-effort : le message est déjà supprimé, un fichier orphelin ne
    // bloque jamais la suppression (la politique de lecture le referme de
    // toute façon aux deux joueurs dès que la ligne disparaît).
    try { await supabase.storage.from(VOICE_BUCKET).remove([attachmentPath]); } catch (e) { /* ignore */ }
  }
  return data[0];
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
      .filter((message) => message && (typeof message.body === 'string'
        || (message.kind === 'voice' && typeof message.dataUrl === 'string')))
      .map((message, index) => ({
        id: message.id || `demo-${peerId}-${index + 1}`,
        from: message.from === 'me' ? 'me' : 'them',
        kind: message.kind === 'voice' ? 'voice' : 'text',
        body: typeof message.body === 'string' ? message.body.slice(0, MESSAGE_MAX_LENGTH) : '',
        dataUrl: message.kind === 'voice' && typeof message.dataUrl === 'string' ? message.dataUrl : null,
        duration: Number.isFinite(message.duration) ? message.duration : null,
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
    kind: message.kind === 'voice' ? 'voice' : 'text',
    body: message.body || '',
    attachmentUrl: message.kind === 'voice' ? (message.dataUrl || null) : null,
    attachmentDuration: message.kind === 'voice' ? (message.duration ?? null) : null,
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
function appendDemoMessage(state, peerId, from, body, at, read, extra = null) {
  const messages = [...(state.threads[peerId] || [])];
  messages.push({
    id: `demo-${peerId}-${messages.length + 1}-${at.slice(11, 19).replace(/:/g, '')}`,
    from,
    body,
    at,
    read,
    ...(extra || {}),
  });
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

/**
 * La persona envoie un message vocal : `dataUrl` est l'enregistrement encodé
 * (voir `blobToDataUrl` côté contexte — localStorage ne sait pas garder un
 * `Blob`), `duration` sa durée en secondes.
 */
export function applyDemoSendVoice(state, peerId, dataUrl, duration, now = Date.now()) {
  if (!peerId || typeof dataUrl !== 'string' || !dataUrl) return state;
  const withRead = {
    ...state,
    threads: {
      ...state.threads,
      [peerId]: (state.threads[peerId] || []).map((message) => (message.from === 'them' ? { ...message, read: true } : message)),
    },
  };
  const safeDuration = Math.min(VOICE_MAX_SECONDS, Math.max(1, Math.round(duration || 0)));
  return appendDemoMessage(withRead, peerId, 'me', '', new Date(now).toISOString(), true, {
    kind: 'voice',
    dataUrl,
    duration: safeDuration,
  });
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

/** Supprime un message envoyé par la persona (seuls ses propres messages). */
export function applyDemoDelete(state, peerId, messageId) {
  if (!peerId || !messageId) return state;
  const list = state.threads[peerId];
  if (!Array.isArray(list) || list.length === 0) return state;
  const remaining = list.filter((message) => !(message.id === messageId && message.from === 'me'));
  if (remaining.length === list.length) return state;
  return { ...state, threads: { ...state.threads, [peerId]: remaining } };
}
