/**
 * Vérifie la conduite libre de Vice City Rush côté interface, dans jsdom :
 * entrée CONDUITE de l'écran-titre, réglages de l'écran de pause, rappels de
 * commandes, préférence gardée sur l'appareil et conduite transmise au moteur
 * 3D (doublure partagée).
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
    name: 'city-rush-driving-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: {
    ssr: 'scripts/vice-city-driving-ui-smoke.jsx',
    outDir: 'node_modules/.cache/city-rush-driving-ui',
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

const { checkViceCityDrivingUi } = await import('../node_modules/.cache/city-rush-driving-ui/vice-city-driving-ui-smoke.js');
let exitCode = 0;
try {
  await checkViceCityDrivingUi(assert);
  console.log('check:city-rush-free-drive (interface) ✓ — la conduite libre est la conduite par défaut, l’entrée CONDUITE des options et l’écran de pause la basculent, les rappels de commandes suivent, la préférence reste sur l’appareil et le monde reçoit la conduite choisie.');
} catch (error) {
  console.error(error?.stack || error?.message || error);
  exitCode = 1;
} finally {
  dom.window.close();
}
process.exit(exitCode);
