import { supabase } from './supabase';

// Identifiant canonique d'un article : "/news/<slug>"
export function normalizeArticleId(route) {
  if (!route) return '';
  let s = String(route).trim();
  // "/news/physint" -> "/news/physint"
  // "physint" -> "/news/physint"
  if (!s.startsWith('/')) s = `/news/${s}`;
  s = s.replace(/\/+$/, '').toLowerCase();
  if (s === '/news') return s;
  if (!s.startsWith('/news/')) {
    // dossier fallback : on garde tel quel
    s = `/news/${s.replace(/^\/news\//, '')}`;
  }
  return s;
}

export function formatViews(n) {
  const count = Number(n) || 0;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1).replace('.', ',')} M`;
  if (count >= 1000) {
    // 1 240 -> "1,2 k" ; 12 340 -> "12,3 k"
    const k = count / 1000;
    const fixed = k >= 100 ? k.toFixed(0) : k >= 10 ? k.toFixed(1) : k.toFixed(1);
    return `${fixed.replace('.', ',')} k`;
  }
  return String(count);
}

// Base « hors-ligne » : déterministe à partir du slug pour que l'affichage
// ne soit jamais vide même sans Supabase ou avant le premier fetch.
function fallbackBaseViews(articleId) {
  const slug = normalizeArticleId(articleId).replace('/news/', '') || 'home';
  let hash = 2166136261;
  for (let i = 0; i < slug.length; i += 1) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash >>>= 0;
  // 420 … 4 800 de base, plus un bonus si le slug évoque un carton
  const base = 420 + (hash % 3400);
  const bonus = /zelda|wolverine|gta|persona|monster|diablo|fire-emblem/i.test(slug) ? 900 + (hash % 800) : 0;
  const malus = /annulation|licenciement|report|retard/i.test(slug) ? -180 : 0;
  return Math.max(120, base + bonus + malus);
}

const LS_KEY = 'article_views_fallback_v1';
const LS_SESSION_PREFIX = 'article_viewed:';

function readFallbackMap() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeFallbackMap(map) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch { /* quota */ }
}

function getFallbackViews(ids) {
  const stored = readFallbackMap();
  const map = {};
  for (const id of ids) {
    const nid = normalizeArticleId(id);
    if (!nid) continue;
    const base = fallbackBaseViews(nid);
    const extra = Number(stored[nid] || 0);
    map[nid] = base + extra;
  }
  return map;
}

function incFallback(articleId) {
  const nid = normalizeArticleId(articleId);
  if (!nid) return null;
  const now = Date.now();
  const sessionKey = LS_SESSION_PREFIX + nid;
  try {
    const last = Number(localStorage.getItem(sessionKey) || 0);
    // Anti-spam local : un même article ne s'incrémente qu'une fois par 30 min
    // pour le même navigateur, sinon les refreshs gonfleraient le compteur.
    if (last && now - last < 30 * 60 * 1000) return null;
    localStorage.setItem(sessionKey, String(now));
  } catch { /* ignore */ }
  const map = readFallbackMap();
  map[nid] = (Number(map[nid] || 0) + 1);
  writeFallbackMap(map);
  return fallbackBaseViews(nid) + map[nid];
}

// ---------------------------------------------------------------------------
// Supabase (global)
// ---------------------------------------------------------------------------
async function fetchSupabaseViews(ids) {
  if (!supabase) return null;
  const normalized = ids.map(normalizeArticleId).filter(Boolean);
  if (!normalized.length) return {};
  try {
    const { data, error } = await supabase
      .from('article_views')
      .select('article_id, views')
      .in('article_id', normalized);
    if (error) throw error;
    const byId = Object.fromEntries((data || []).map((row) => [normalizeArticleId(row.article_id), Number(row.views) || 0]));
    // Les ids absents en base valent leur base fallback (jamais 0 en UI)
    const full = {};
    for (const nid of normalized) {
      full[nid] = byId[nid] != null ? byId[nid] : fallbackBaseViews(nid);
    }
    // On ajoute le bonus local (vues hors-ligne non encore remontées) au-dessus du global
    // uniquement si Supabase est configuré : évite un double comptage visible.
    const fallbackExtra = readFallbackMap();
    for (const nid of normalized) {
      const extra = Number(fallbackExtra[nid] || 0);
      // On n'ajoute l'extra que si l'on n'a pas de dépendance stricte au serveur ;
      // sinon on laisse le serveur comme référence et on ignore l'extra pour l'affichage.
      // Le incrément ci-dessous poussera vers le serveur.
      void extra;
    }
    return full;
  } catch {
    return null;
  }
}

async function incrementSupabaseView(articleId) {
  if (!supabase) return null;
  const nid = normalizeArticleId(articleId);
  if (!nid) return null;
  // Anti-spam par onglet (30 min) avant d'appeler le serveur
  try {
    const sessionKey = LS_SESSION_PREFIX + nid;
    const last = Number(localStorage.getItem(sessionKey) || 0);
    if (last && Date.now() - last < 30 * 60 * 1000) return null;
    // On marque déjà pour éviter le double-clic
    localStorage.setItem(sessionKey, String(Date.now()));
  } catch { /* ignore */ }

  // Chemin 1 : RPC atomique (recommandé, si la migration a été appliquée)
  try {
    const { data, error } = await supabase.rpc('increment_article_view', { p_article_id: nid });
    if (!error && data != null) return Number(data);
    if (error && !/function.*does not exist|not found/i.test(error.message)) throw error;
  } catch {
    // fallback direct upsert (si les droits le permettent)
  }

  // Chemin 2 : lecture + upsert manuel (nécessite RLS insert/update true)
  try {
    const { data: existing } = await supabase.from('article_views').select('views').eq('article_id', nid).maybeSingle();
    const next = (existing?.views ?? fallbackBaseViews(nid)) + 1;
    const { data, error } = await supabase
      .from('article_views')
      .upsert({ article_id: nid, views: next, updated_at: new Date().toISOString() }, { onConflict: 'article_id' })
      .select('views')
      .single();
    if (error) throw error;
    return Number(data?.views ?? next);
  } catch {
    // Dernier recours : fallback local uniquement
    return incFallback(nid);
  }
}

export async function getArticleViews(ids) {
  const supa = await fetchSupabaseViews(ids);
  if (supa) return supa;
  return getFallbackViews(ids);
}

export async function incrementArticleView(articleId) {
  const server = await incrementSupabaseView(articleId);
  if (server != null) return server;
  return incFallback(articleId);
}

// Hook-like helper for components that just want the map.
export async function fetchViewsForArticles(articlesOrIds) {
  const ids = Array.isArray(articlesOrIds)
    ? articlesOrIds.map((item) => (typeof item === 'string' ? item : item.to || item.articleId || item.slug || '')).filter(Boolean)
    : [];
  if (!ids.length) return {};
  return getArticleViews(ids);
}
