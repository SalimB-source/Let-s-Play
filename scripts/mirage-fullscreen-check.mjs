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
    name: 'mirage-fullscreen-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)MirageWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: { ssr: 'scripts/mirage-fullscreen-smoke.jsx', outDir: 'node_modules/.cache/mirage-fullscreen', emptyOutDir: true },
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

const { checkMirageFullscreen } = await import('../node_modules/.cache/mirage-fullscreen/mirage-fullscreen-smoke.js');
try { await checkMirageFullscreen(assert); } finally { console.error = consoleError; dom.window.close(); }
console.log('check:mirage-fullscreen ✓ — plein écran de Mirage Rush : ordinateur (le clic sur une carte de map ne touche pas à l’écran — plus de bouton « LANCER » ; « LANCER EN PLEIN ÉCRAN », bouton de la barre et touche F ouvrent et ferment, Ctrl/Cmd/Alt + F, touche maintenue et saisie de texte ignorés ; sortie du navigateur = course en pause ; plein écran demandé gardé en revenant à l’intro ; toucher une map En ligne referme le plein écran pour ouvrir le lobby), repli sans Fullscreen API (couche fixe seule), double bascule avant la réponse du navigateur, mise en page gardée jusqu’à la fin d’une sortie (et repli de sécurité) ; téléphone et application Android : le clic sur une carte ouvre le plein écran tout seul, le retour à l’intro le referme, pas de second bouton ; fenêtre de course en ligne : bouton et touche F, plein écran refermé à l’arrivée.');
// Les salons locaux ouvrent un BroadcastChannel (comme le ferait un second onglet) qui garderait le processus en vie.
process.exit(0);
