import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stub = path.join(root, 'scripts', 'souls-world-stub.jsx');

// jsdom n'a pas de WebGL : on remplace le moteur 3D par une doublure au moment de
// résoudre les imports de « SoulsWorld » (le morceau qui ouvre la scène). Le reste de la page —
// paysage, plein écran, manette tactile — est le vrai code.
// `build()` fixe NODE_ENV=production dans ce processus ; React chargerait alors son build de
// production, sans `act` : on remet l'environnement d'avant une fois le bundle construit.
const previousEnv = process.env.NODE_ENV;
await build({
  root,
  logLevel: 'error',
  plugins: [{
    name: 'souls-mobile-stub-world',
    enforce: 'pre',
    resolveId: (source) => (/(^|\/)SoulsWorld(\.jsx)?$/.test(source) ? stub : null),
  }],
  build: { ssr: 'scripts/souls-mobile-smoke.jsx', outDir: 'node_modules/.cache/souls-mobile', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/la-cendre' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkSoulsMobile } = await import('../node_modules/.cache/souls-mobile/souls-mobile-smoke.js');
try {
  await checkSoulsMobile(assert);
} finally {
  dom.window.close();
}
console.log('check:souls-mobile ✓ — paysage et manette de La Cendre : sur téléphone et dans l’application, la page se couche (pont Android « landscape » au montage, verrou navigateur demandé puis rejoué à l’entrée en plein écran), l’écran « TOURNEZ VOTRE APPAREIL » s’affiche debout et se tait sur « JOUER QUAND MÊME » ; le lancement ouvre le plein écran natif, la manette apparaît (stick à gauche, six boutons à droite dont le gros bouton de roulade), les boutons et le stick envoient leurs actions au moteur (touchAction / touchMove, course à fond, arrêt au relâchement), la pause propose les montées de niveau au doigt, et quitter la page rend son orientation au téléphone ; sur ordinateur, pas de manette ni de rotation, et le plein écran reste au bouton de la barre.');
// Rien ne garde le processus en vie : on sort explicitement (jsdom peut retenir des timers).
process.exit(0);
