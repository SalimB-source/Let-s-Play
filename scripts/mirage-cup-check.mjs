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
console.log('check:mirage-cup ✓ — Coupe du Désert jouée de bout en bout (3 courses, 4 cavaliers, barème 10/7/4/2, égalités départagées), classement et trophée du vainqueur enregistrés, écran du trophée avec repli sans WebGL ; Coupe Grand Tour jouée sur ses 4 cartes avec globe distinct dans le sélecteur, le HUD et le podium ; Coupe des Vents jouée sur 3 cartes distinctes, trois victoires à 10 OR chacune (30 OR au total), Rose des Vents distincte dans le sélecteur, le HUD, la collection et le podium ; Steel Ball Run jouée sur les dix cartes du jeu, dix victoires de course (100 OR) plus la prime de champion de 90 OR versée une seule fois avec le titre, boule d’acier distincte dans le sélecteur, le HUD, la collection et le podium — 190 OR maximum, affichés comme tels ; abandon, replay et piste à trois voies vérifiés.');
