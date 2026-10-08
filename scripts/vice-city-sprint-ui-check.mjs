/**
 * `npm run check:city-rush-sprint-ui`
 *
 * Vérifie l'interface de Vice City Rush en mode SPRINT : la page ne doit rien
 * afficher qui évoque une poursuite ou une course à plusieurs (classement de
 * rivaux, carte « escouade de police », guide des armes, raccourci
 * mitrailleuse, « 1 TOURS »), tout en gardant ces éléments dans les modes
 * CIRCUIT et POURSUITE.
 *
 * Complément de `npm run check:city-rush-sprint`, qui joue une vraie course
 * sprint dans le moteur 3D et y refuse police, rivaux et armes tout en vérifiant
 * les portes 3D et le cercle turbo vert posé au sol.
 */
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
    name: 'vice-city-sprint-ui-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: { ssr: 'scripts/vice-city-sprint-ui-smoke.jsx', outDir: 'node_modules/.cache/vice-city-sprint-ui', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/vice-city-rush' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkViceCitySprintUi } = await import('../node_modules/.cache/vice-city-sprint-ui/vice-city-sprint-ui-smoke.js');
let code = 0;
try {
  await checkViceCitySprintUi(assert);
  console.log('check:city-rush-sprint-ui ✓ — le mode SPRINT affiche les checkpoints et le cercle turbo au sol, sans rival au classement, carte police, guide des armes, raccourci mitrailleuse ni « 1 TOURS ».');
} catch (error) {
  console.error(error?.message || error);
  code = 1;
} finally {
  dom.window.close();
}
process.exit(code);
