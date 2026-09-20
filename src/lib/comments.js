import { supabase, supabaseHost } from './supabase';

// Data layer for the article comment section.
//
// Real accounts read and write `public.comments` (see supabase/schema.sql):
// the row is inserted with the article route + body only, a database trigger
// stamps the author (gamertag / avatar of the signed-in user) and RLS makes
// sure players only post as themselves and only delete their own comments.
//
// Demo profiles (`isDemo` in AuthContext) have no Supabase session, so their
// comments live in localStorage, per article and per device, clearly flagged
// as demo in the UI. Everyone still sees the real conversation underneath.

export const COMMENT_MAX_LENGTH = 1000;
export const COMMENT_PAGE_SIZE = 100;

const COMMENT_COLUMNS = 'id, article_id, user_id, author_name, author_avatar, body, created_at';
// Extended columns when the migration adding author_level/xp has been applied.
// Selecting them on an older deployment fails with “column does not exist” or
// with PGRST204 “Could not find the ... column ... in the schema cache”,
// so fetchComments falls back to COMMENT_COLUMNS.
const COMMENT_COLUMNS_WITH_LEVEL = 'id, article_id, user_id, author_name, author_avatar, author_level, author_xp, body, created_at';
const DEMO_STORAGE_PREFIX = 'letsplay_demo_comments:';

export const commentsEnabled = Boolean(supabase);

// Comments are keyed by the article route so the same thread shows up on
// Vercel ("/news/physint") and on GitHub Pages ("/Let-s-Play/news/physint",
// where the router already strips the base path).
export function normalizeArticleId(pathname) {
  const path = String(pathname || '/').split(/[?#]/)[0].trim().toLowerCase();
  const trimmed = path.replace(/\/+$/, '');
  return trimmed || '/';
}

function isNetworkFailure(error) {
  const message = error?.message || '';
  return error?.status === 0
    || /failed to fetch|load failed|networkerror|network request failed|fetch failed/i.test(message);
}

// True when `public.comments` does not exist yet, i.e. supabase/schema.sql
// has not been run on the project this build points to.
export function isMissingTableError(error) {
  const message = error?.message || '';
  const code = error?.code || '';
  return code === '42P01'
    || code === 'PGRST205'
    || /relation .*comments.* does not exist|could not find the table .*comments/i.test(message);
}

// True when the API does not know a column the app references: the migration
// adding it has not been applied, or PostgREST's schema cache has not reloaded
// yet. PostgREST answers with PGRST204 — “Could not find the 'author_level'
// column of 'comments' in the schema cache” (the column name comes BEFORE the
// word “column”, unlike the raw Postgres error “column comments.author_level
// does not exist”). `names` narrows the check to those columns when given.
export function isMissingColumnError(error, names = []) {
  const message = error?.message || '';
  const code = error?.code || '';
  const schemaCacheMiss = code === 'PGRST204'
    || /could not find the ['"][a-z0-9_]+['"] column of ['"][a-z0-9_]+['"] in the schema cache/i.test(message);
  const postgresMiss = code === '42703'
    || /column [^\n]* does not exist/i.test(message);
  if (!schemaCacheMiss && !postgresMiss) return false;
  if (!names.length) return true;
  const wanted = new Set(names);
  // PGRST204 quotes the column name (“the 'author_level' column”); the loose
  // word test also covers the Postgres shape (“column comments.author_level
  // does not exist”), where \blevel\b correctly stays inside author_level.
  return [...message.matchAll(/['"]([a-zA-Z0-9_]+)['"]/g)].some((m) => wanted.has(m[1]))
    || new RegExp(`\\b(?:${names.join('|')})\\b`, 'i').test(message);
}

export function describeCommentsError(error, copy, fallback) {
  const message = error?.message || '';
  const code = error?.code || '';
  const details = message ? ` — ${message}` : '';

  if (isNetworkFailure(error)) {
    const target = supabaseHost ? ` (${supabaseHost})` : '';
    return `${copy.errNetwork}${target}${details}`;
  }
  if (isMissingTableError(error)) {
    return `${copy.errUnavailable}${details}`;
  }
  if (isMissingColumnError(error, ['author_level', 'author_xp'])) {
    return `${copy.errMissingColumn}${details}`;
  }
  if (/comment_rate_limited/i.test(message)) {
    return copy.errRateLimited;
  }
  if (
    code === '42501'
    || code === 'PGRST301'
    || error?.status === 401
    || /comment_requires_auth|row-level security|permission denied|jwt/i.test(message)
  ) {
    return copy.errSignedOut;
  }
  if (code === '23514' || /comments_body_check/i.test(message)) {
    return copy.errBody;
  }
  return message || fallback;
}

// ---------------------------------------------------------------------------
// Supabase-backed comments
// ---------------------------------------------------------------------------

export async function fetchComments(articleId) {
  if (!supabase) return [];
  // Prefer the extended column set so author_level/xp is available when the
  // migration has been applied; gracefully fall back for older deployments.
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(COMMENT_COLUMNS_WITH_LEVEL)
      .eq('article_id', articleId)
      .order('created_at', { ascending: false })
      .limit(COMMENT_PAGE_SIZE);
    if (error) {
      // migration not applied yet (or API schema cache stale) → retry without level
      if (isMissingColumnError(error, ['author_level', 'author_xp'])) throw new Error('retry_basic');
      throw error;
    }
    return data || [];
  } catch (e) {
    if (String(e.message) === 'retry_basic') {
      const { data, error } = await supabase
        .from('comments')
        .select(COMMENT_COLUMNS)
        .eq('article_id', articleId)
        .order('created_at', { ascending: false })
        .limit(COMMENT_PAGE_SIZE);
      if (error) throw error;
      return data || [];
    }
    throw e;
  }
}

export async function postComment(articleId, body, opts = {}) {
  if (!supabase) throw new Error('Supabase is not configured');
  const level = opts.level != null ? Number(opts.level) : null;
  const xp = opts.xp != null ? Number(opts.xp) : null;
  const hasLevel = Number.isFinite(level);
  const hasXp = Number.isFinite(xp);
  const levelPayload = {};
  if (hasLevel) levelPayload.author_level = level;
  if (hasXp) levelPayload.author_xp = xp;
  // Try extended insert first so the level is persisted when the migration exists.
  try {
    const payload = { article_id: articleId, body, ...levelPayload };
    const { data, error } = await supabase
      .from('comments')
      .insert(payload)
      .select(COMMENT_COLUMNS_WITH_LEVEL)
      .single();
    if (error) {
      if (isMissingColumnError(error, ['author_level', 'author_xp'])) throw new Error('retry_basic');
      throw error;
    }
    return data;
  } catch (e) {
    if (String(e.message) === 'retry_basic') {
      const { data, error } = await supabase
        .from('comments')
        .insert({ article_id: articleId, body })
        .select(COMMENT_COLUMNS)
        .single();
      if (error) throw error;
      return data;
    }
    throw e;
  }
}

export async function deleteComment(id) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Demo-profile comments (localStorage, per device)
// ---------------------------------------------------------------------------

function demoStorageKey(articleId) {
  return `${DEMO_STORAGE_PREFIX}${articleId}`;
}

export function readDemoComments(articleId) {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(demoStorageKey(articleId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function writeDemoComments(articleId, comments) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(demoStorageKey(articleId), JSON.stringify(comments));
  } catch (e) { /* storage full or disabled — the comment stays in memory */ }
}

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function addDemoComment(articleId, user, body) {
  const meta = user?.user_metadata || {};
  const comment = {
    id: randomId(),
    article_id: articleId,
    user_id: user?.id || 'demo',
    author_name: meta.gamertag || user?.email?.split('@')[0] || 'Player_DZ',
    author_avatar: meta.avatar || null,
    author_level: meta.level ?? 1,
    author_xp: meta.xp ?? 0,
    body,
    created_at: new Date().toISOString(),
    demo: true,
  };
  writeDemoComments(articleId, [comment, ...readDemoComments(articleId)]);
  return comment;
}

export function removeDemoComment(articleId, id) {
  writeDemoComments(articleId, readDemoComments(articleId).filter((comment) => comment.id !== id));
}


// ---------------------------------------------------------------------------
// Sync helpers : keep comments in step with profile edits
// ---------------------------------------------------------------------------

/**
 * Met à jour les commentaires démo de `user` stockés en localStorage.
 * Appelé après une édition du gamertag/avatar/niveau de la persona démo.
 * Parcourt tous les articles ayant des commentaires démo et remplace
 * author_name / avatar / level / xp pour les lignes appartenant à `user.id`.
 */
export function syncDemoCommentsForUser(user) {
  if (!user || typeof window === 'undefined' || !window.localStorage) return;
  const meta = user.user_metadata || {};
  const nextName = meta.gamertag || user.email?.split('@')[0] || 'Player_DZ';
  const nextAvatar = meta.avatar || meta.avatar_url || meta.picture || null;
  const nextLevel = meta.level ?? 1;
  const nextXp = meta.xp ?? 0;
  const uid = user.id;
  if (!uid) return;
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(DEMO_STORAGE_PREFIX)) keys.push(k);
    }
    for (const key of keys) {
      try {
        const raw = window.localStorage.getItem(key);
        const list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list) || list.length === 0) continue;
        let changed = false;
        const nextList = list.map((c) => {
          if (c.user_id !== uid) return c;
          const sameName = c.author_name === nextName;
          const sameAvatar = c.author_avatar === nextAvatar;
          const sameLevel = c.author_level === nextLevel;
          const sameXp = c.author_xp === nextXp;
          if (sameName && sameAvatar && sameLevel && sameXp) return c;
          changed = true;
          return { ...c, author_name: nextName, author_avatar: nextAvatar, author_level: nextLevel, author_xp: nextXp };
        });
        if (changed) window.localStorage.setItem(key, JSON.stringify(nextList));
      } catch {}
    }
    // notify live Comments components (same tab) and other tabs
    try { window.dispatchEvent(new CustomEvent('letsplay:demo-comments-synced', { detail: { userId: uid } })); } catch {}
    try { window.localStorage.setItem('letsplay_demo_comments_sync_tick', String(Date.now())); } catch {}
  } catch {}
}

/**
 * Pousse le nouveau profil vers Supabase :
 *  - met à jour `public.profiles` (username / display_name / avatar_url / level / xp)
 *  - met à jour toutes les lignes `public.comments` du joueur (author_name / avatar / level / xp)
 * Tolère les déploiements n'ayant pas encore la migration author_level.
 */
export async function syncSupabaseProfileAndComments(userId, { name, avatar, level, xp }) {
  if (!supabase || !userId) return;
  const payloadProfile = {};
  if (name) { payloadProfile.username = name; payloadProfile.display_name = name; }
  if (avatar !== undefined) payloadProfile.avatar_url = avatar;
  if (Number.isFinite(level)) payloadProfile.level = level;
  if (Number.isFinite(xp)) payloadProfile.xp = xp;
  if (Object.keys(payloadProfile).length) {
    payloadProfile.updated_at = new Date().toISOString();
    try {
      // try with level/xp, fallback without if columns missing
      let { error } = await supabase.from('profiles').update(payloadProfile).eq('id', userId);
      if (error && isMissingColumnError(error, ['level', 'xp', 'updated_at'])) {
        const fallback = {};
        if (payloadProfile.username) fallback.username = payloadProfile.username;
        if (payloadProfile.display_name) fallback.display_name = payloadProfile.display_name;
        if (payloadProfile.avatar_url !== undefined) fallback.avatar_url = payloadProfile.avatar_url;
        if (Object.keys(fallback).length) {
          fallback.updated_at = new Date().toISOString();
          const r2 = await supabase.from('profiles').update(fallback).eq('id', userId);
          if (r2.error) throw r2.error;
        }
      } else if (error) throw error;
    } catch (e) {
      // non bloquant : le fil pourra quand même afficher le nouveau nom via le JWT
    }
  }
  const payloadComments = {};
  if (name) payloadComments.author_name = name;
  if (avatar !== undefined) payloadComments.author_avatar = avatar;
  if (Number.isFinite(level)) payloadComments.author_level = level;
  if (Number.isFinite(xp)) payloadComments.author_xp = xp;
  if (!Object.keys(payloadComments).length) return;
  try {
    let { error } = await supabase.from('comments').update(payloadComments).eq('user_id', userId);
    if (error && isMissingColumnError(error, ['author_level', 'author_xp'])) {
      const fallback = {};
      if (payloadComments.author_name) fallback.author_name = payloadComments.author_name;
      if (payloadComments.author_avatar !== undefined) fallback.author_avatar = payloadComments.author_avatar;
      if (Object.keys(fallback).length) {
        const r2 = await supabase.from('comments').update(fallback).eq('user_id', userId);
        if (r2.error) throw r2.error;
      }
    } else if (error) throw error;
  } catch (e) {
    // non bloquant : l'affichage live reste correct via le cache profil
  }
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

// Who the signed-in player will appear as — mirrors the navbar and /auth.
export function displayNameFor(user) {
  const meta = user?.user_metadata || {};
  return meta.gamertag || meta.full_name || meta.fullName || meta.name || user?.email?.split('@')[0] || 'Player_DZ';
}

export function avatarFor(user) {
  const meta = user?.user_metadata || {};
  return meta.avatar || meta.avatar_url || meta.picture || null;
}

export function initialFor(name) {
  const trimmed = String(name || '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

// "just now", "5 min ago", "yesterday" for the last week, then a short date.
export function formatCommentDate(iso, lang, now = Date.now()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffSeconds = Math.round((date.getTime() - now) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  try {
    if (absSeconds < 7 * 24 * 3600 && typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
      const rtf = new Intl.RelativeTimeFormat(lang || 'en', { numeric: 'auto' });
      if (absSeconds < 60) return rtf.format(0, 'second');
      if (absSeconds < 3600) return rtf.format(Math.round(diffSeconds / 60), 'minute');
      if (absSeconds < 24 * 3600) return rtf.format(Math.round(diffSeconds / 3600), 'hour');
      return rtf.format(Math.round(diffSeconds / (24 * 3600)), 'day');
    }
    return date.toLocaleDateString(lang || 'en', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return date.toISOString().slice(0, 10);
  }
}
