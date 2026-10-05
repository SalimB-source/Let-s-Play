/**
 * `npm run check:city-rush-garage`
 *
 * Vérifie le garage de Vice City Rush pour un joueur qui n'a jamais joué (aucun
 * billet vert) : les trois voitures les moins puissantes du catalogue — MISTRAL
 * 1.4, NOVA 1.8 GT et WOLFSBURG GT-R — sont débloquées pour tout le monde,
 * pastille « DÉPART » / « OFFERTE » à l'appui, et toucher l'une d'elles part en
 * course sans achat. Les cinq autres voitures restent verrouillées avec leur
 * prix.
 *
 * Complément de `npm run check:city-rush` (règles et progression pures :
 * `cityRushFreeCarIds`, `normalizeCityRushProgress`) : ici, c'est la vraie page
 * qui est montée dans jsdom, avec le moteur 3D remplacé par une doublure.
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
    name: 'vice-city-garage-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: { ssr: 'scripts/vice-city-garage-smoke.jsx', outDir: 'node_modules/.cache/vice-city-garage', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/vice-city-rush' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkViceCityGarage } = await import('../node_modules/.cache/vice-city-garage/vice-city-garage-smoke.js');
let code = 0;
try {
  await checkViceCityGarage(assert);
  console.log('check:city-rush-garage ✓ — les trois voitures les moins puissantes (MISTRAL 1.4, NOVA 1.8 GT, WOLFSBURG GT-R) sont offertes à tous : pastille « OFFERTE », aucun prix, départ en course sans billet vert ; les cinq autres restent verrouillées.');
} catch (error) {
  console.error(error?.message || error);
  code = 1;
} finally {
  dom.window.close();
}
process.exit(code);
