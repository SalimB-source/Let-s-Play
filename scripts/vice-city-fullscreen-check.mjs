import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stub = path.join(root, 'scripts', 'vice-city-world-stub.jsx');

// jsdom n'a pas de WebGL : on remplace le moteur 3D par une doublure au moment de
// résoudre les imports de « ViceCityWorld » (la page de Vice City Rush).
// `build()` fixe NODE_ENV=production dans ce processus ; React chargerait alors son build de
// production, sans `act` : on remet l'environnement d'avant une fois le bundle construit.
const previousEnv = process.env.NODE_ENV;
await build({
  root,
  logLevel: 'error',
  plugins: [{
    name: 'vice-city-fullscreen-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)ViceCityWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: { ssr: 'scripts/vice-city-fullscreen-smoke.jsx', outDir: 'node_modules/.cache/vice-city-fullscreen', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/vice-city-rush' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkViceCityFullscreen } = await import('../node_modules/.cache/vice-city-fullscreen/vice-city-fullscreen-smoke.js');
try { await checkViceCityFullscreen(assert); } finally { dom.window.close(); }
console.log('check:vice-city-fullscreen ✓ — plein écran de Vice City Rush : l’interface se lance en plein écran de base (couche fixe au montage, plein écran natif au premier geste, gardé jusqu’à sortie explicite) ; le plein écran demandé reste à travers l’intro, le compte à rebours, la course et l’arrivée ; bouton de la barre et touche F (Ctrl/Cmd/Alt + F, touche maintenue et saisie de texte ignorés) ; sortie du navigateur = course en pause, « REPRENDRE » rend l’écran quitté (course ou décompte) ; repli sans Fullscreen API (couche fixe seule), double bascule avant la réponse du navigateur, mise en page gardée jusqu’à la fin d’une sortie (et repli de sécurité) ; téléphone et application Android : lancer une course rouvre le plein écran dans le geste, et cette ouverture automatique se referme à l’arrivée.');
// Rien ne garde le processus en vie : on sort explicitement (jsdom peut retenir des timers).
process.exit(0);
