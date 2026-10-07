/**
 * `npm run check:city-rush-story-cars`
 *
 * Vérifie les voitures du mode Histoire de Vice City Rush : les deux chapitres
 * qui prêtent une voiture — le prologue de 1983 (MISTRAL 1.4) et le Ring
 * (TEMPESTA LP-780 de Mr. Voss) — partent bien avec elle, et **tous les autres
 * chapitres rendent au pilote la voiture qu'il a choisie au garage**, y compris
 * celui qui suit un prêt. Le choix du garage survit aussi à toute la campagne.
 *
 * Complément de `npm run check:city-rush-story` (données pures du scénario :
 * chapitres, objectifs, étoiles, fins) : ici, c'est la vraie page qui est
 * montée dans jsdom, avec le moteur 3D remplacé par une doublure qui garde les
 * props reçues — donc la voiture que le monde construirait.
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
    name: 'vice-city-story-cars-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: { ssr: 'scripts/vice-city-story-cars-smoke.jsx', outDir: 'node_modules/.cache/vice-city-story-cars', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/vice-city-rush' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// jsdom n'implémente pas `scrollIntoView`, appelé par l'écran d'arrivée.
dom.window.Element.prototype.scrollIntoView = function scrollIntoView() {};

const { checkViceCityStoryCars } = await import('../node_modules/.cache/vice-city-story-cars/vice-city-story-cars-smoke.js');
let code = 0;
try {
  await checkViceCityStoryCars(assert);
  console.log('check:city-rush-story-cars ✓ — les dix chapitres partent avec la bonne voiture : MISTRAL 1.4 prêtée au prologue, TEMPESTA LP-780 prêtée sur le Ring, et la voiture choisie au garage partout ailleurs (y compris après un prêt) — un choix qui survit à toute la campagne.');
} catch (error) {
  console.error(error?.message || error);
  code = 1;
} finally {
  dom.window.close();
}
process.exit(code);
