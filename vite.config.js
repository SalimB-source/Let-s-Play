import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pickEnv = (...names) => {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

// The Supabase → Vercel marketplace integration provisions SUPABASE_URL /
// SUPABASE_ANON_KEY (no VITE_ prefix), which Vite never exposes to the
// browser. Mirror those *public* values into the client bundle at build time
// so auth works whether the project uses the integration or manual VITE_
// variables. Only these two public values are embedded — service-role keys
// and other secrets are never referenced here and stay server-side.
const supabaseUrl = pickEnv('VITE_SUPABASE_URL', 'SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = pickEnv(
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
);

// Build « coque PC » (desktop/, voir scripts/desktop-bundle.mjs) : l'app est
// servie par un petit serveur HTTP local à la racine d'un domaine
// (http://127.0.0.1:<port>/), pas depuis un sous-dossier de GitHub Pages.
// `base` doit donc valoir '/' et la sortie part dans desktop/dist-web pour ne
// jamais écraser le dist/ du déploiement web. Lancé par DESKTOP=1.
const desktopBuild = process.env.DESKTOP === '1';

export default defineConfig({
  plugins: [react()],
  base: desktopBuild || process.env.VERCEL ? '/' : '/Let-s-Play/',
  server: {
    allowedHosts: true,
  },
  define: {
    __SUPABASE_URL__: JSON.stringify(supabaseUrl),
    __SUPABASE_ANON_KEY__: JSON.stringify(supabaseAnonKey),
  },
  ...(desktopBuild
    ? { build: { outDir: 'desktop/dist-web', emptyOutDir: true } }
    : {}),
});
