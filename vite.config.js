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

export default defineConfig({
  plugins: [react()],
  base: process.env.VERCEL ? '/' : '/Let-s-Play/',
  server: {
    allowedHosts: true,
  },
  define: {
    __SUPABASE_URL__: JSON.stringify(supabaseUrl),
    __SUPABASE_ANON_KEY__: JSON.stringify(supabaseAnonKey),
  },
});
