/**
 * `npm run check:city-rush-tournament`
 *
 * Joue la Coupe Sunset de bout en bout sur la vraie page, montée dans jsdom
 * avec le moteur 3D remplacé par une doublure (même harnais que
 * `npm run check:city-rush-garage`) : hub des 4 tournois, règles « pures » (ni
 * police ni armes), le même plateau de huit voitures de course (le pilote en
 * dernière rangée), sacre, prime, déblocage de la Coupe d'Europe et
 * sauvegarde.
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
    name: 'vice-city-tournament-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: { ssr: 'scripts/vice-city-tournament-smoke.jsx', outDir: 'node_modules/.cache/vice-city-tournament', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/vice-city-rush' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkViceCityTournament } = await import('../node_modules/.cache/vice-city-tournament/vice-city-tournament-smoke.js');
let code = 0;
try {
  await checkViceCityTournament(assert);
  console.log('check:city-rush-tournament ✓ — la Coupe Sunset se joue de bout en bout : 3 manches sans police ni armes, huit voitures de course sur la grille (le pilote en dernière rangée), sacre à 68 pts, prime +100, Coupe d’Europe débloquée, sauvegarde à jour ; le tout s’ouvre page TOURNOIS — seule page des plateaux — et le « ← » du garage y ramène en abandonnant la coupe.');
} catch (error) {
  console.error(error?.message || error);
  code = 1;
} finally {
  dom.window.close();
}
process.exit(code);
