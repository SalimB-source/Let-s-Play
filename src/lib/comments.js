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
// Selecting them on an older deployment fails with "column does not exist",
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
      // column does not exist yet → retry without level
      if (/column.*author_level|column.*author_xp does not exist/i.test(error.message || '')) throw new Error('retry_basic');
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
      if (/column.*author_level|column.*author_xp does not exist/i.test(error.message || '')) throw new Error('retry_basic');
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
