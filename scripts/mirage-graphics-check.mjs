import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stub = path.join(root, 'scripts', 'mirage-world-stub.jsx');

// jsdom n'a pas de WebGL : on remplace le moteur 3D par une doublure au moment de
// résoudre les imports de « MirageWorld » (page, fenêtre de course en ligne).
// `build()` fixe NODE_ENV=production dans ce processus ; React chargerait alors son build de
// production, sans `act` : on remet l'environnement d'avant une fois le bundle construit.
const previousEnv = process.env.NODE_ENV;
await build({
  root,
  logLevel: 'error',
  plugins: [{
    name: 'mirage-graphics-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)MirageWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: { ssr: 'scripts/mirage-graphics-smoke.jsx', outDir: 'node_modules/.cache/mirage-graphics', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// La scène 3D du trophée de la Coupe échoue sans WebGL (c'est voulu : l'écran se replie sur sa version CSS).
const consoleError = console.error;
console.error = (...args) => {
  if (/WebGLRenderer|Not implemented: HTMLCanvasElement/.test(String(args[0]))) return;
  consoleError(...args);
};

const { checkMirageGraphics } = await import('../node_modules/.cache/mirage-graphics/mirage-graphics-smoke.js');
try { await checkMirageGraphics(assert); } finally { console.error = consoleError; dom.window.close(); }
console.log('check:mirage-graphics ✓ — « Graphismes baissés » de Mirage Rush : bouton dans la barre du jeu (interrupteur, entre SON et PLEIN ÉCRAN) et réglage en toutes lettres sur l’écran du choix du mode et sur la pause, tous liés au même choix ; classe is-low-graphics sur la coque, choix mémorisé et rejoué à l’ouverture, valeur illisible = normal, autre onglet suivi (évènement storage, clé vidée), stockage refusé sans erreur ; bascule en pleine course et en pause sans reconstruire le monde 3D ni interrompre la course ; le bouton rend le focus après un clic ; fenêtre de course en ligne : bouton en tête de la barre, coque et arrière-plan basculés sans couper la course.');
// Les salons locaux ouvrent un BroadcastChannel (comme le ferait un second onglet) qui garderait le processus en vie.
process.exit(0);
