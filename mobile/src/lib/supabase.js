import { createClient } from '@supabase/supabase-js';
import { secureAuthStorage } from './storage';

const clean = (val) => (typeof val === 'string' ? val.trim() : '');

export const SITE_URL = (
  clean(process.env.EXPO_PUBLIC_SITE_URL) || 'https://let-s-play-nu.vercel.app'
).replace(/\/+$/, '');

export const supabaseUrl = clean(process.env.EXPO_PUBLIC_SUPABASE_URL);
export const supabaseKey =
  clean(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  clean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

// Clé exacte attendue par @supabase/supabase-js dans le localStorage du site
// web (`sb-<projectRef>-auth-token`), utilisée pour injecter la session active
// dans la WebView des jeux afin d'éviter toute reconnexion.
export function getWebSupabaseStorageKey() {
  try {
    const host = new URL(supabaseUrl).hostname;
    const projectRef = host.split('.')[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        storage: secureAuthStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
