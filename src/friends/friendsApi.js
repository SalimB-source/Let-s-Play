/**
 * Couche de données des amis.
 * ---------------------------
 * Deux mondes, une seule forme de résultat :
 *
 *   - **Comptes Supabase** : la table `public.friendships` (voir
 *     supabase/schema.sql) porte une ligne par relation — `pending` tant que
 *     le destinataire n'a pas répondu, `accepted` ensuite. Refuser, annuler ou
 *     retirer un ami supprime la ligne. RLS : chaque joueur ne voit que les
 *     relations dont il fait partie, n'envoie des demandes qu'en son nom et
 *     ne répond qu'à celles qu'il a reçues. Les pseudos, avatars et niveaux
 *     viennent de `public.profiles` (lecture publique), qui porte aussi
 *     `last_seen_at`, le battement de cœur utilisé pour le statut en ligne
 *     quand la présence temps réel n'est pas disponible.
 *
 *   - **Personas de démonstration** (pas de session) : la relation vit dans
 *     localStorage, par persona et par appareil, au sein de la communauté
 *     scriptée de `demoRoster.js`.
 *
 * Le contexte (`FriendsContext.jsx`) ne connaît que la forme normalisée :
 *   relations : { [otherId]: { rowId, kind: 'friend' | 'incoming' | 'outgoing', since } }
 *   profiles  : { [id]: { id, name, avatar, level, xp, lastSeenAt } }
 */
import { supabase } from '../lib/supabase';
import { DEMO_INITIAL_STATE, demoCommunity, findDemoPlayer } from './demoRoster';

export const FRIENDS_TABLE = 'friendships';
const FRIENDSHIP_COLUMNS = 'id, requester_id, addressee_id, status, created_at, updated_at';
const PROFILE_COLUMNS_FULL = 'id, username, display_name, avatar_url, level, xp, last_seen_at';
const PROFILE_COLUMNS_LEVEL = 'id, username, display_name, avatar_url, level, xp';
const PROFILE_COLUMNS_BASE = 'id, username, display_name, avatar_url';

/** Au-delà de ce délai sans battement de cœur, un joueur est « hors ligne ». */
export const PRESENCE_STALE_MS = 3 * 60 * 1000;

// ---------------------------------------------------------------------------
// Erreurs
// ---------------------------------------------------------------------------

/** Vrai quand `public.friendships` n'existe pas (schéma SQL pas relancé). */
export function isMissingFriendsTable(error) {
  const code = error?.code || '';
  const message = error?.message || '';
  return code === '42P01'
    || code === 'PGRST205'
    || /relation .*friendships.* does not exist|could not find the table .*friendships/i.test(message);
}

/** Vrai quand la relation existe déjà (index unique sur la paire). */
export function isDuplicateFriendship(error) {
  return error?.code === '23505' || /duplicate key|friendships_pair/i.test(error?.message || '');
}

/**
 * Vrai quand l'erreur vient d'une colonne absente (migration pas appliquée) :
 * PostgREST répond « column profiles.last_seen_at does not exist » (42703) en
 * lecture et « Could not find the 'last_seen_at' column … in the schema
 * cache » (PGRST204) en écriture.
 */
function isMissingColumn(error, column) {
  const message = error?.message || '';
  const code = error?.code || '';
  return message.includes(column)
    && (code === '42703' || code === 'PGRST204' || /does not exist|schema cache/i.test(message));
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

export function normalizeProfile(row) {
  if (!row?.id) return null;
  return {
    id: row.id,
    name: row.username || row.display_name || String(row.id).slice(0, 8),
    avatar: row.avatar_url || null,
    level: Number.isFinite(row.level) ? row.level : 1,
    xp: Number.isFinite(row.xp) ? row.xp : null,
    lastSeenAt: row.last_seen_at || null,
  };
}

/** Lignes `friendships` → relations vues par `uid`. */
export function relationsFromRows(rows, uid) {
  const relations = {};
  for (const row of rows || []) {
    const isRequester = row.requester_id === uid;
    const isAddressee = row.addressee_id === uid;
    if (!isRequester && !isAddressee) continue;
    const otherId = isRequester ? row.addressee_id : row.requester_id;
    if (!otherId || otherId === uid) continue;
    let kind;
    if (row.status === 'accepted') kind = 'friend';
    else if (row.status === 'pending') kind = isRequester ? 'outgoing' : 'incoming';
    else continue;
    relations[otherId] = { rowId: row.id, kind, since: row.updated_at || row.created_at || null };
  }
  return relations;
}

/** Un joueur est en ligne s'il est présent en temps réel ou vu très récemment. */
export function isRecentlySeen(lastSeenAt, now = Date.now()) {
  if (!lastSeenAt) return false;
  const seen = new Date(lastSeenAt).getTime();
  return Number.isFinite(seen) && now - seen < PRESENCE_STALE_MS;
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

export async function fetchRelationships(uid) {
  if (!supabase || !uid) return [];
  const { data, error } = await supabase
    .from(FRIENDS_TABLE)
    .select(FRIENDSHIP_COLUMNS)
    .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Profils publics des joueurs `ids`. Les colonnes `level` / `xp` /
 * `last_seen_at` n'existent que si les migrations ont été appliquées : on
 * retombe sur un jeu de colonnes plus court plutôt que d'échouer.
 */
export async function fetchProfiles(ids) {
  const wanted = [...new Set((ids || []).filter(Boolean))];
  if (!supabase || wanted.length === 0) return {};
  const attempts = [PROFILE_COLUMNS_FULL, PROFILE_COLUMNS_LEVEL, PROFILE_COLUMNS_BASE];
  let lastError = null;
  for (const columns of attempts) {
    const { data, error } = await supabase.from('profiles').select(columns).in('id', wanted);
    if (!error) {
      const map = {};
      for (const row of data || []) {
        const profile = normalizeProfile(row);
        if (profile) map[profile.id] = profile;
      }
      return map;
    }
    lastError = error;
    if (!(isMissingColumn(error, 'last_seen_at') || isMissingColumn(error, 'level') || isMissingColumn(error, 'xp'))) break;
  }
  throw lastError;
}

/** Nettoie une saisie pour un filtre PostgREST `or(... ilike ...)`. */
export function sanitizeSearch(query) {
  return String(query || '')
    .replace(/[,()"'\\%*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

/** Joueurs dont le pseudo ou le nom contient `query` (hors soi-même). */
export async function searchProfiles(query, uid, limit = 8) {
  const term = sanitizeSearch(query);
  if (!supabase || term.length < 2) return [];
  const pattern = `%${term}%`;
  const attempts = [PROFILE_COLUMNS_FULL, PROFILE_COLUMNS_LEVEL, PROFILE_COLUMNS_BASE];
  let lastError = null;
  for (const columns of attempts) {
    let request = supabase
      .from('profiles')
      .select(columns)
      .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
      .limit(limit);
    if (uid) request = request.neq('id', uid);
    const { data, error } = await request;
    if (!error) return (data || []).map(normalizeProfile).filter(Boolean);
    lastError = error;
    if (!(isMissingColumn(error, 'last_seen_at') || isMissingColumn(error, 'level') || isMissingColumn(error, 'xp'))) break;
  }
  throw lastError;
}

/**
 * Envoie une demande. Renvoie la ligne créée, ou null quand le serveur a
 * transformé la demande en acceptation (l'autre joueur nous avait déjà
 * écrit : le trigger accepte sa demande au lieu d'en insérer une seconde).
 */
export async function sendFriendRequest(uid, targetId) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from(FRIENDS_TABLE)
    .insert({ requester_id: uid, addressee_id: targetId, status: 'pending' })
    .select(FRIENDSHIP_COLUMNS);
  if (error) throw error;
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

export async function acceptFriendRequest(rowId) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from(FRIENDS_TABLE)
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', rowId)
    .select(FRIENDSHIP_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

/** Refuser une demande, annuler la sienne ou retirer un ami : même geste. */
export async function deleteFriendship(rowId) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.from(FRIENDS_TABLE).delete().eq('id', rowId);
  if (error) throw error;
}

/**
 * Battement de cœur : `profiles.last_seen_at = now()` pour le compte connecté.
 * Crée le profil s'il manque (trigger d'inscription refusé sur le projet) en
 * reprenant pseudo et avatar du compte — le joueur devient ainsi trouvable
 * dans l'onglet « Ajouter ». Renvoie false si la colonne n'existe pas encore
 * (l'appelant arrête alors d'insister).
 */
export async function touchPresence(user) {
  if (!supabase || !user?.id) return false;
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('profiles')
    .update({ last_seen_at: now })
    .eq('id', user.id)
    .select('id');
  if (error) {
    if (isMissingColumn(error, 'last_seen_at')) return false;
    throw error;
  }
  if (Array.isArray(data) && data.length > 0) return true;

  // Pas de ligne de profil : on la crée (le pseudo peut être déjà pris).
  const meta = user.user_metadata || {};
  const name = meta.gamertag || meta.full_name || meta.fullName || meta.name || user.email?.split('@')[0] || null;
  const avatar = meta.avatar || meta.avatar_url || meta.picture || null;
  const base = { id: user.id, display_name: name, avatar_url: avatar, last_seen_at: now };
  let result = await supabase.from('profiles').insert({ ...base, username: name });
  if (result.error && result.error.code === '23505') {
    result = await supabase.from('profiles').insert(base);
  }
  if (result.error && isMissingColumn(result.error, 'last_seen_at')) return false;
  // Une course avec le trigger d'inscription (23505 sur la clé primaire) ou
  // un refus RLS ne doivent pas casser la fenêtre d'amis : la prochaine
  // pulsation retentera la mise à jour.
  return !result.error;
}

// ---------------------------------------------------------------------------
// Personas de démonstration (localStorage, par persona et par appareil)
// ---------------------------------------------------------------------------

const DEMO_STORAGE_PREFIX = 'letsplay_demo_friends:';
export const DEMO_FRIENDS_SYNC_KEY = 'letsplay_demo_friends_sync_tick';

function demoStorageKey(personaId) {
  return `${DEMO_STORAGE_PREFIX}${personaId}`;
}

function personaKeyFor(user) {
  return user?.profileKey || (user?.id === 'demo-user-8842' ? 'pixel' : 'vortex');
}

function emptyDemoState() {
  return { friends: [], incoming: [], outgoing: [] };
}

function cleanDemoState(raw) {
  const state = emptyDemoState();
  if (!raw || typeof raw !== 'object') return state;
  for (const key of ['friends', 'incoming', 'outgoing']) {
    const list = Array.isArray(raw[key]) ? raw[key] : [];
    state[key] = [...new Set(list.filter((id) => typeof id === 'string' && findDemoPlayer(id)))];
  }
  return state;
}

/** État des relations de la persona, semé au premier accès. */
export function readDemoFriendState(user) {
  const personaKey = personaKeyFor(user);
  const seed = DEMO_INITIAL_STATE[personaKey] || emptyDemoState();
  if (typeof window === 'undefined' || !window.localStorage) return cleanDemoState(seed);
  try {
    const raw = window.localStorage.getItem(demoStorageKey(user.id));
    if (raw) return cleanDemoState(JSON.parse(raw));
  } catch (e) { /* stockage illisible : on repart de la graine */ }
  const state = cleanDemoState(seed);
  writeDemoFriendState(user, state);
  return state;
}

export function writeDemoFriendState(user, state) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(demoStorageKey(user.id), JSON.stringify(cleanDemoState(state)));
    window.localStorage.setItem(DEMO_FRIENDS_SYNC_KEY, String(Date.now()));
  } catch (e) { /* stockage plein ou désactivé : l'état reste en mémoire */ }
}

/** Remet la persona à son état de départ (aperçu démo « comme neuf »). */
export function resetDemoFriendState(user) {
  const personaKey = personaKeyFor(user);
  const state = cleanDemoState(DEMO_INITIAL_STATE[personaKey] || emptyDemoState());
  writeDemoFriendState(user, state);
  return state;
}

/** État démo → relations normalisées (même forme que les comptes réels). */
export function demoRelations(state, uid) {
  const relations = {};
  const add = (ids, kind) => {
    for (const id of ids || []) {
      if (id && id !== uid) relations[id] = { rowId: `demo:${kind}:${id}`, kind, since: null };
    }
  };
  add(state.friends, 'friend');
  add(state.incoming, 'incoming');
  add(state.outgoing, 'outgoing');
  return relations;
}

/** Profils de toute la communauté de démonstration, forme normalisée. */
export function demoProfiles() {
  const map = {};
  for (const player of demoCommunity()) {
    map[player.id] = {
      id: player.id,
      name: player.gamertag,
      fullName: player.fullName,
      avatar: player.avatar,
      level: player.level,
      xp: player.xp,
      lastSeenAt: null,
      platforms: player.platforms,
    };
  }
  return map;
}

/** Recherche dans la communauté de démonstration (pseudo ou nom). */
export function searchDemoPlayers(query, uid, limit = 8) {
  const term = sanitizeSearch(query).toLowerCase();
  if (term.length < 2) return [];
  return demoCommunity()
    .filter((player) => player.id !== uid)
    .filter((player) => `${player.gamertag} ${player.fullName}`.toLowerCase().includes(term))
    .slice(0, limit)
    .map((player) => demoProfiles()[player.id]);
}

/**
 * Applique une action à l'état démo et renvoie le nouvel état.
 *   'send'    → la demande part (les joueurs 'online' scriptés acceptent
 *               d'eux-mêmes après un court délai, géré par le contexte) ;
 *   'accept'  → demande reçue → ami ; 'decline' / 'cancel' / 'unfriend'
 *               retirent la relation.
 */
export function applyDemoAction(state, action, otherId) {
  const next = {
    friends: state.friends.filter((id) => id !== otherId),
    incoming: state.incoming.filter((id) => id !== otherId),
    outgoing: state.outgoing.filter((id) => id !== otherId),
  };
  if (action === 'send') {
    // Si l'autre joueur nous avait déjà écrit, c'est une acceptation.
    if (state.incoming.includes(otherId)) next.friends.push(otherId);
    else next.outgoing.push(otherId);
  } else if (action === 'accept') {
    next.friends.push(otherId);
  } else if (action === 'auto-accept') {
    if (state.outgoing.includes(otherId)) next.friends.push(otherId);
    else return state;
  } else if (action === 'receive') {
    if (!state.friends.includes(otherId) && !state.outgoing.includes(otherId)) next.incoming.push(otherId);
    else return state;
  }
  return next;
}
