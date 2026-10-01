import { supabase } from '../lib/supabase';
import { avatarFor, displayNameFor } from '../lib/comments';

export const COMMUNITY_STORAGE_KEY = 'letsplay_community_v1';
export const COMMUNITY_GROUP_MAX_NAME = 56;
export const COMMUNITY_GROUP_MAX_DESCRIPTION = 280;
export const COMMUNITY_COMMENT_MAX_LENGTH = 1000;
export const SOULSLIKE_GROUP_ID = 'e4d52bd0-0922-4be4-a880-000000000001';

export const COMMUNITY_CATEGORIES = [
  { id: 'Soulslike', icon: '⚔️' },
  { id: 'RPG', icon: '🧭' },
  { id: 'Coop', icon: '🎮' },
  { id: 'FPS', icon: '🎯' },
  { id: 'Indé', icon: '✨' },
  { id: 'Autre', icon: '💬' },
];

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

export const FEATURED_COMMUNITY_GROUP = {
  id: SOULSLIKE_GROUP_ID,
  name: 'Les joueurs de soulslike',
  description: 'Boss impossibles, builds improbables et lore à décrypter : un espace pour parler des Souls, d\'Elden Ring, de Sekiro et de tous les jeux qui nous font recommencer.',
  category: 'Soulslike',
  tags: ['Elden Ring', 'Dark Souls', 'Sekiro'],
  created_by_name: 'La communauté',
  created_by_avatar: null,
  created_at: minutesAgo(60 * 24 * 3),
  is_featured: true,
};

export const SOULSLIKE_STARTER_COMMENTS = [
  {
    id: 'soulslike-starter-1',
    group_id: SOULSLIKE_GROUP_ID,
    user_id: 'community-player-lamegrise',
    author_name: 'LameGrise',
    author_avatar: null,
    body: 'Je repars sur Elden Ring en build force. Vous conseillez quelle arme pour traverser le début du jeu sans trop souffrir ?',
    created_at: minutesAgo(142),
    is_seed: true,
  },
  {
    id: 'soulslike-starter-2',
    group_id: SOULSLIKE_GROUP_ID,
    user_id: 'community-player-pixelnoir',
    author_name: 'PixelNoir',
    author_avatar: null,
    body: 'La première victoire contre Malenia sans invocation… j\'ai encore les mains qui tremblent. Quel boss vous a demandé le plus de tentatives ?',
    created_at: minutesAgo(74),
    is_seed: true,
  },
  {
    id: 'soulslike-starter-3',
    group_id: SOULSLIKE_GROUP_ID,
    user_id: 'community-player-paradeparfaite',
    author_name: 'ParadeParfaite',
    author_avatar: null,
    body: 'Sekiro reste mon meilleur entraînement à la patience. Genichiro m\'a appris à parer plutôt qu\'à fuir — et vous, quel jeu vous a fait progresser ?',
    created_at: minutesAgo(18),
    is_seed: true,
  },
];

const GROUP_COLUMNS = 'id, name, description, category, tags, created_by, created_by_name, created_by_avatar, created_at';
const COMMENT_COLUMNS = 'id, group_id, user_id, author_name, author_avatar, body, created_at';

function safeLocalStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function emptyState() {
  return { groups: [], comments: {} };
}

export function readLocalCommunityState() {
  const storage = safeLocalStorage();
  if (!storage) return emptyState();
  try {
    const parsed = JSON.parse(storage.getItem(COMMUNITY_STORAGE_KEY) || 'null');
    return {
      groups: Array.isArray(parsed?.groups)
        ? parsed.groups.map(normalizeCommunityGroup).filter(Boolean)
        : [],
      comments: parsed?.comments && typeof parsed.comments === 'object' && !Array.isArray(parsed.comments)
        ? parsed.comments
        : {},
    };
  } catch {
    return emptyState();
  }
}

function writeLocalCommunityState(state) {
  const storage = safeLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('letsplay:community-updated'));
  } catch {
    // Le fil reste affiché dans l'état React si le stockage est plein ou bloqué.
  }
}

export function readLocalCommunityGroups() {
  return readLocalCommunityState().groups;
}

export function readLocalCommunityComments(groupId) {
  const comments = readLocalCommunityState().comments[groupId];
  return Array.isArray(comments)
    ? comments.map(normalizeCommunityComment).filter((comment) => comment && comment.group_id === groupId)
    : [];
}

export function mergeCommunityGroups(...lists) {
  const byId = new Map();
  for (const group of lists.flat()) {
    if (!group?.id || !group?.name) continue;
    const current = byId.get(group.id);
    byId.set(group.id, current ? { ...current, ...group, is_featured: Boolean(current.is_featured || group.is_featured) } : group);
  }
  return [...byId.values()].sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
}

export function mergeCommunityComments(groupId, ...lists) {
  const candidates = groupId === SOULSLIKE_GROUP_ID ? [SOULSLIKE_STARTER_COMMENTS, ...lists] : lists;
  const byId = new Map();
  for (const list of candidates.flat()) {
    if (!list?.id || !list?.body) continue;
    byId.set(list.id, list);
  }
  return [...byId.values()].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
}

export function normalizeCommunityGroup(row) {
  if (!row?.id || !row?.name) return null;
  return {
    id: row.id,
    name: String(row.name),
    description: String(row.description || ''),
    category: String(row.category || 'Autre'),
    tags: Array.isArray(row.tags) ? row.tags.map(String).slice(0, 4) : [],
    created_by: row.created_by || null,
    created_by_name: row.created_by_name || 'Joueur',
    created_by_avatar: row.created_by_avatar || null,
    created_at: row.created_at || new Date().toISOString(),
    is_featured: row.id === SOULSLIKE_GROUP_ID,
    is_local: String(row.id).startsWith('local-'),
  };
}

export function normalizeCommunityComment(row) {
  if (!row?.id || !row?.group_id || !row?.body) return null;
  return {
    id: row.id,
    group_id: row.group_id,
    user_id: row.user_id || null,
    author_name: row.author_name || 'Joueur',
    author_avatar: row.author_avatar || null,
    body: String(row.body),
    created_at: row.created_at || new Date().toISOString(),
    is_local: String(row.id).startsWith('local-'),
  };
}

export async function fetchCommunityGroups() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('community_groups')
    .select(GROUP_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data || []).map(normalizeCommunityGroup).filter(Boolean);
}

export async function fetchCommunityComments(groupId) {
  if (!supabase || !groupId || String(groupId).startsWith('local-')) return [];
  const { data, error } = await supabase
    .from('community_comments')
    .select(COMMENT_COLUMNS)
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw error;
  return (data || []).map(normalizeCommunityComment).filter(Boolean);
}

export async function createRemoteCommunityGroup({ name, description, category, tags }) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('community_groups')
    .insert({ name, description, category, tags })
    .select(GROUP_COLUMNS)
    .single();
  if (error) throw error;
  const group = normalizeCommunityGroup(data);
  if (!group) throw new Error('Le groupe créé est incomplet.');
  return group;
}

export async function createRemoteCommunityComment(groupId, body) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('community_comments')
    .insert({ group_id: groupId, body })
    .select(COMMENT_COLUMNS)
    .single();
  if (error) throw error;
  const comment = normalizeCommunityComment(data);
  if (!comment) throw new Error('Le commentaire publié est incomplet.');
  return comment;
}

export async function deleteRemoteCommunityGroup(groupId) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.rpc('delete_community_group', { p_group_id: groupId });
  if (error) throw error;
}

export async function moderateRemoteCommunityComment(commentId, groupId) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.rpc('moderate_community_comment', { p_comment_id: commentId, p_group_id: groupId });
  if (error) throw error;
}

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createLocalCommunityGroup({ name, description, category, tags }, user) {
  const state = readLocalCommunityState();
  const group = normalizeCommunityGroup({
    id: `local-${randomId()}`,
    name: String(name).trim(),
    description: String(description).trim(),
    category,
    tags: (tags || []).slice(0, 4),
    created_by: user?.id || 'local-guest',
    created_by_name: user ? displayNameFor(user) : 'Joueur invité',
    created_by_avatar: user ? avatarFor(user) : null,
    created_at: new Date().toISOString(),
  });
  writeLocalCommunityState({ ...state, groups: [group, ...state.groups] });
  return group;
}

export function createLocalCommunityComment(groupId, body, user) {
  const state = readLocalCommunityState();
  const author = user ? displayNameFor(user) : 'Joueur invité';
  const comment = normalizeCommunityComment({
    id: `local-${randomId()}`,
    group_id: groupId,
    user_id: user?.id || 'local-guest',
    author_name: author,
    author_avatar: user ? avatarFor(user) : null,
    body: String(body).trim(),
    created_at: new Date().toISOString(),
  });
  const previous = Array.isArray(state.comments[groupId]) ? state.comments[groupId] : [];
  writeLocalCommunityState({
    ...state,
    comments: { ...state.comments, [groupId]: [...previous, comment] },
  });
  return comment;
}

export function deleteLocalCommunityGroup(groupId) {
  const state = readLocalCommunityState();
  state.groups = state.groups.filter(g => g.id !== groupId);
  delete state.comments[groupId];
  writeLocalCommunityState(state);
}

export function deleteLocalCommunityComment(groupId, commentId) {
  const state = readLocalCommunityState();
  if (!state.comments[groupId]) return;
  state.comments[groupId] = state.comments[groupId].filter(c => c.id !== commentId);
  writeLocalCommunityState(state);
}

export function isGroupCreator(group, userId) {
  return group && group.created_by === userId;
}

export function isMissingCommunityTable(error) {
  const code = error?.code || '';
  const message = error?.message || '';
  return code === '42P01'
    || code === 'PGRST205'
    || /relation .*community_(groups|comments).* does not exist|could not find the table .*community_(groups|comments)/i.test(message);
}

export function isCommunityNetworkError(error) {
  return error?.status === 0
    || /failed to fetch|load failed|networkerror|network request failed|fetch failed/i.test(error?.message || '');
}

export function canFallBackToLocalCommunity(error) {
  return isMissingCommunityTable(error) || isCommunityNetworkError(error);
}

export const communityBackendEnabled = Boolean(supabase);