import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stub = path.join(root, 'scripts', 'mirage-world-stub.jsx');

// jsdom n'a pas de WebGL : on remplace le moteur 3D par une doublure au moment de
// résoudre les imports de « MirageWorld » (page, lobby en ligne).
// `build()` fixe NODE_ENV=production dans ce processus ; React chargerait alors son build de
// production, sans `act` : on remet l'environnement d'avant une fois le bundle construit.
const previousEnv = process.env.NODE_ENV;
await build({
  root,
  logLevel: 'error',
  plugins: [{
    name: 'mirage-cup-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)MirageWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: { ssr: 'scripts/mirage-cup-smoke.jsx', outDir: 'node_modules/.cache/mirage-cup', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// La scène 3D du trophée échoue sans WebGL (c'est voulu : l'écran se replie sur sa version CSS).
const consoleError = console.error;
console.error = (...args) => {
  if (/WebGLRenderer|Not implemented: HTMLCanvasElement/.test(String(args[0]))) return;
  consoleError(...args);
};

const { checkMirageCup } = await import('../node_modules/.cache/mirage-cup/mirage-cup-smoke.js');
try { await checkMirageCup(assert); } finally { console.error = consoleError; dom.window.close(); }
console.log('check:mirage-cup ✓ — Coupe du Désert jouée de bout en bout (3 courses Dunes de l’Écho → Dust Creek → Plaines d’Or, 4 cavaliers, barème 10/7/4/2, égalités départagées, Entrée pour enchaîner sans que « R » saute le classement), écran du trophée (vainqueur, félicitations, moteur 3D démonté, repli sans WebGL), « Rejouer » repart de zéro, abandon par le bouton ou Échap ; piste à trois voies de l’app : trois cavaliers, barème 10/7/4, pas de cavalier fantôme.');
