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

/** Identité du build : un jeton court qui change à chaque déploiement.
 *
 * C'est la seule chose que le jeu compare au lancement pour savoir qu'une
 * version plus récente est en ligne (voir `src/updates/maj-site.js`). Côté
 * Vercel et GitHub Actions, le commit est déjà dans l'environnement ; en local
 * on prend l'horloge, ce qui suffit à distinguer deux builds.
 */
const jetonBuild = pickEnv('VERCEL_GIT_COMMIT_SHA', 'GITHUB_SHA', 'DESKTOP_BUILD_ID');
const buildId = jetonBuild ? jetonBuild.slice(0, 12) : `local-${Date.now()}`;

/** Écrit `version.json` dans la sortie (et le sert en dev/preview).
 *
 * Le fichier est volontairement minuscule et sans cache : un client qui le
 * relit obtient toujours l'identité du déploiement en cours, pas celle du
 * build qu'il a chargé. Sans ce fichier, un onglet resté ouvert — ou une
 * WebView Android — ne saurait jamais qu'une nouvelle version existe.
 */
function sablierVersionJsonPlugin(jeton) {
  const contenu = () => `${JSON.stringify({ buildId: jeton, builtAt: new Date().toISOString() }, null, 2)}\n`;
  const servir = (req, res, next) => {
    const chemin = (req.url || '').split('?')[0];
    if (chemin !== '/version.json' && chemin !== '/Let-s-Play/version.json') {
      next();
      return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.end(contenu());
  };
  return {
    name: 'sablier-version-json',
    configureServer(server) { server.middlewares.use(servir); },
    configurePreviewServer(server) { server.middlewares.use(servir); },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: contenu() });
    },
  };
}

function sablierArbitreVitePlugin() {
  const middleware = async (req, res, next) => {
    const url = (req.url || '').split('?')[0];
    if (url !== '/api/sablier-duel' && url !== '/Let-s-Play/api/sablier-duel') {
      next();
      return;
    }
    if (typeof res.status !== 'function') {
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
    }
    const { default: handler } = await import('./api/sablier-duel.js');
    await handler(req, res);
  };
  return {
    name: 'sablier-arbitre-local',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), sablierArbitreVitePlugin(), sablierVersionJsonPlugin(buildId)],
  base: desktopBuild || process.env.VERCEL ? '/' : '/Let-s-Play/',
  server: {
    allowedHosts: true,
  },
  preview: {
    allowedHosts: true,
  },
  define: {
    __SUPABASE_URL__: JSON.stringify(supabaseUrl),
    __SUPABASE_ANON_KEY__: JSON.stringify(supabaseAnonKey),
    // Comparé à `version.json` au lancement pour proposer la mise à jour.
    __BUILD_ID__: JSON.stringify(buildId),
  },
  ...(desktopBuild
    ? { build: { outDir: 'desktop/dist-web', emptyOutDir: true } }
    : {}),
});
