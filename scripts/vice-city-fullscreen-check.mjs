import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stub = path.join(root, 'scripts', 'vice-city-world-stub.jsx');

// jsdom n'a pas de WebGL : on remplace le moteur 3D par une doublure au moment de
// résoudre les imports de « ViceCityWorld » (la page de Vice City Rush).
// `build()` fixe NODE_ENV=production dans ce processus ; React chargerait alors son build de
// production, sans `act` : on remet l'environnement d'avant une fois le bundle construit.
const previousEnv = process.env.NODE_ENV;
await build({
  root,
  logLevel: 'error',
  plugins: [{
    name: 'vice-city-fullscreen-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: { ssr: 'scripts/vice-city-fullscreen-smoke.jsx', outDir: 'node_modules/.cache/vice-city-fullscreen', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/vice-city-rush' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkViceCityFullscreen } = await import('../node_modules/.cache/vice-city-fullscreen/vice-city-fullscreen-smoke.js');
try { await checkViceCityFullscreen(assert); } finally { dom.window.close(); }
console.log('check:vice-city-fullscreen ✓ — plein écran et parcours des vignettes de Vice City Rush : mode → course → garage → lancement direct par la voiture (pilote sélectionnable avant le départ), bannière histoire cliquable ; plein écran conservé pendant les écrans et la course, raccourcis F et Échap, pause à la sortie navigateur ; téléphone et application Android : le tap sur une voiture lance la course et ouvre le plein écran dans le geste.');
// Rien ne garde le processus en vie : on sort explicitement (jsdom peut retenir des timers).
process.exit(0);
