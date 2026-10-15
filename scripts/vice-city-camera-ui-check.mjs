/**
 * Vérifie la vue cockpit de Vice City Rush côté interface, dans jsdom : entrée
 * CAMÉRA de l'écran-titre, bouton COCKPIT de la barre, touche C, préférence
 * gardée sur l'appareil et vue transmise au moteur 3D (doublure partagée).
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
    name: 'city-rush-camera-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: {
    ssr: 'scripts/vice-city-camera-ui-smoke.jsx',
    outDir: 'node_modules/.cache/city-rush-camera-ui',
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

const { checkViceCityCameraUi } = await import('../node_modules/.cache/city-rush-camera-ui/vice-city-camera-ui-smoke.js');
let exitCode = 0;
try {
  await checkViceCityCameraUi(assert);
  console.log('check:city-rush-cockpit (interface) ✓ — l’entrée CAMÉRA des options, le bouton COCKPIT de la barre et la touche C basculent la vue, la préférence reste sur l’appareil et le monde reçoit la vue choisie.');
} catch (error) {
  console.error(error?.stack || error?.message || error);
  exitCode = 1;
} finally {
  dom.window.close();
}
process.exit(exitCode);
