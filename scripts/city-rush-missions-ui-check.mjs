import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stub = path.join(root, 'scripts', 'vice-city-world-stub.jsx');

// jsdom n'a pas de WebGL : le moteur 3D est remplacé par une doublure qui
// garde les props de la page. La page, elle, est la vraie.
const previousEnv = process.env.NODE_ENV;
await build({
  root,
  logLevel: 'error',
  plugins: [{
    name: 'city-rush-missions-ui-stub-world',
    enforce: 'pre',
    resolveId(source) {
      if (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source)) return stub;
      if (/(^|\/)ViceCityGarageStage(\.jsx)?$/.test(source)) return '\0mission-garage-stub';
      return null;
    },
    load: id => id === '\0mission-garage-stub' ? 'export const CAMERA_SHIFT_MODE = true; export default function GarageStub() { return null; }' : null,
  }],
  build: { ssr: 'scripts/city-rush-missions-ui-smoke.jsx', outDir: 'node_modules/.cache/city-rush-missions-ui', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/vice-city-rush' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// jsdom n'implémente pas `scrollIntoView`, appelé par l'écran d'arrivée.
dom.window.Element.prototype.scrollIntoView = function scrollIntoView() {};

const { checkCityRushMissionsUi } = await import('../node_modules/.cache/city-rush-missions-ui/city-rush-missions-ui-smoke.js');
let code = 0;
try {
  await checkCityRushMissionsUi(assert);
  console.log('check:city-rush-missions-ui ✓ — menu, briefing, intercepteur, règles, tir tactile et replay');
} catch (error) {
  console.error(error?.message || error);
  code = 1;
} finally {
  dom.window.close();
}
process.exit(code);
