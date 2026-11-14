import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Ces substitutions ne sont actives que sur ce serveur de démonstration.
// Aucune sonde ni scène préparée n’entre dans le build de production.
const demo = {
  name: 'ascension-demo-locale', enforce: 'pre',
  transform(code, id) {
    if (id.endsWith('RpgDuelPage.jsx')) {
      return code
        .replace("useState(() => (pvp ? 'partie' : 'jouer'))", "useState(() => (globalThis.__ASCENSION_INITIAL_DUEL__ || pvp ? 'partie' : 'jouer'))")
        .replace('  const duelRef = useRef(null);', '  const duelRef = useRef(globalThis.__ASCENSION_INITIAL_DUEL__ ?? null);');
    }
    if (id.endsWith('RpgMobaBoard.jsx')) return code.replace("useState(initialiser === nouveau ? 'choix' : 'mulligan')", "useState(globalThis.__ASCENSION_DECKS_MENU__ ? 'choix' : 'tour')");
    return null;
  },
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const chemin = (req.url ?? '').split('?')[0];
      if (!['/', '/decks'].includes(chemin)) return next();
      const entree = chemin === '/decks' ? 'rpg-ascension-decks.jsx' : 'rpg-ascension-browser.jsx';
      const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Le Sablier — Ascension · Démo locale</title><style>
        *{box-sizing:border-box}html,body,#root{margin:0;min-height:100%;background:#0b0b0b;color:#eee;font-family:system-ui,sans-serif}
        .ascension-demo-tools{position:fixed;z-index:10900;left:50%;top:5px;transform:translateX(-50%);display:flex;gap:8px;align-items:center;padding:5px 10px;border:1px solid #8d744c77;border-radius:5px;background:#15120fed;color:#bda981;font-size:10px;white-space:nowrap}
        .ascension-demo-tools a,.ascension-demo-tools button,.ascension-demo-tools select{font:inherit;color:#dbc28f;border:1px solid #78613d77;border-radius:3px;padding:4px 7px;background:#262016;text-decoration:none;cursor:pointer}
        .ascension-demo-tools select{max-width:155px}.ascension-demo-tools [aria-current]{background:#b28c4e;color:#16120d}
        @media(max-width:600px){.ascension-demo-tools span{display:none}}
        @media(max-height:520px){.ascension-demo-tools{top:3px;font-size:8px;gap:4px;padding:3px 5px}}
      </style></head><body><div id="root"></div><script type="module" src="/scripts/${entree}"></script></body></html>`;
      try { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(await server.transformIndexHtml(req.url, html)); }
      catch (error) { next(error); }
    });
  },
};
export async function creerServeurAscension(port = 4173) {
  const server = await createServer({ base: '/', plugins: [demo], server: { host: '0.0.0.0', port, strictPort: true, allowedHosts: true, hmr: false } });
  await server.listen();
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await creerServeurAscension(Number(process.env.PORT ?? 4173));
  server.printUrls();
}
