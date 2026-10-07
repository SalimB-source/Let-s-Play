/**
 * Vérifie le vrai composant Vice City Rush dans jsdom : le guide démarre une
 * course solo, reste dans le HUD sans capturer les commandes, puis ne crédite
 * ni portefeuille ni progression. Le moteur 3D est remplacé par le stub partagé.
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
    name: 'city-rush-tutorial-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: {
    ssr: 'scripts/city-rush-tutorial-ui-smoke.jsx',
    outDir: 'node_modules/.cache/city-rush-tutorial-ui',
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

const { checkCityRushTutorialUi } = await import('../node_modules/.cache/city-rush-tutorial-ui/city-rush-tutorial-ui-smoke.js');
let exitCode = 0;
try {
  await checkCityRushTutorialUi(assert);
  console.log('check:city-rush-tutorial-ui ✓ — le tutoriel lance une course solo, guide sans bloquer les commandes et n’accorde aucune récompense.');
} catch (error) {
  console.error(error?.stack || error?.message || error);
  exitCode = 1;
} finally {
  dom.window.close();
}
process.exit(exitCode);
