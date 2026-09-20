import { createClient } from '@supabase/supabase-js';

const firstNonEmpty = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

// Build-time mirror (see vite.config.js) of the values provisioned by the
// Supabase → Vercel integration (SUPABASE_URL / SUPABASE_ANON_KEY), which
// carry no VITE_ prefix and are otherwise invisible to client code.
// Guarded with typeof so this module also loads in plain Node (smoke tests).
// eslint-disable-next-line no-undef
const injectedUrl = typeof __SUPABASE_URL__ === 'string' ? __SUPABASE_URL__ : '';
// eslint-disable-next-line no-undef
const injectedKey = typeof __SUPABASE_ANON_KEY__ === 'string' ? __SUPABASE_ANON_KEY__ : '';

const supabaseUrl = firstNonEmpty(import.meta.env?.VITE_SUPABASE_URL, injectedUrl);
// Supabase renamed the "anon key" to "publishable key" — accept both names.
const supabaseKey = firstNonEmpty(
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY,
  import.meta.env?.VITE_SUPABASE_ANON_KEY,
  injectedKey,
);

export const supabaseConfigStatus = {
  configured: Boolean(supabaseUrl && supabaseKey),
  hasUrl: Boolean(supabaseUrl),
  hasKey: Boolean(supabaseKey),
};

export const supabase = supabaseConfigStatus.configured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

if (!supabaseConfigStatus.configured && import.meta.env?.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    '[auth] Supabase is not configured. Set VITE_SUPABASE_URL and '
    + 'VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example), or connect the '
    + 'Supabase integration on Vercel and redeploy.',
  );
}

// Absolute URL of the /auth page under the deployed base path, used as the
// redirect target for email confirmation, OAuth and password recovery.
// Add `https://<your-domain>/**` to Supabase → Authentication → Redirect URLs.
export function authRedirectUrl() {
  const base = (import.meta.env?.BASE_URL || '/').replace(/\/+$/, '');
  return `${window.location.origin}${base}/auth`;
}
