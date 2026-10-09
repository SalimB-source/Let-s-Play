/**
 * Vérifie l'écran-titre de Vice City Rush dans jsdom : ouverture à l'arrivée,
 * carrousel au clavier, stats, routage des entrées et retour « ↶ MENU ».
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stub = path.join(root, 'scripts', 'vice-city-world-stub.jsx');
const previousEnv = process.env.NODE_ENV;

await build({
  root,
  logLevel: 'error',
  plugins: [{
    name: 'city-rush-menu-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: {
    ssr: 'scripts/vice-city-rush-menu-smoke.jsx',
    outDir: 'node_modules/.cache/city-rush-menu',
    emptyOutDir: true,
  },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/jeu/vice-city-rush',
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkViceCityRushMenu } = await import('../node_modules/.cache/city-rush-menu/vice-city-rush-menu-smoke.js');
let exitCode = 0;
try {
  await checkViceCityRushMenu(assert);
  console.log('check:city-rush-menu ✓ — le carrousel s’ouvre et se pilote au clavier ; HISTOIRE, MISSIONS (avec briefing avant départ), TOURNOIS, COURSE RAPIDE et GARAGE ouvrent chacun leur page, et les onglets changent de page sans rappeler le logo.');
} catch (error) {
  console.error(error?.stack || error?.message || error);
  exitCode = 1;
} finally {
  dom.window.close();
}
process.exit(exitCode);
