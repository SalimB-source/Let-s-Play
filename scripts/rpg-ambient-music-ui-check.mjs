import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// Vérification d'interface de la musique d'ambiance : un faux `AudioContext`
// installé dans la page rendue compte les nœurs planifiés, donc le son réel.
const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-ambient-music-smoke.jsx', outDir: 'node_modules/.cache/rpg-ambient', emptyOutDir: true },
});
// `build()` force NODE_ENV=production dans CE processus : React chargerait sa
// version de production, sans `act`. On restaure la valeur d'origine.
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/jeu/sablier-de-bab-el',
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { checkRpgAmbientMusic } = await import('../node_modules/.cache/rpg-ambient/rpg-ambient-music-smoke.js');
try {
  await checkRpgAmbientMusic(assert);
} finally {
  dom.window.close();
}

console.log('✓ Musique d’ambiance : l’étage lancé fait jouer la boucle de sa tour, le bouton de la barre la coupe et la rend, le menu l’arrête');
