import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const previousEnv = process.env.NODE_ENV;
await build({ logLevel: 'error', build: { ssr: 'scripts/rpg-conquete-music-smoke.jsx', outDir: 'node_modules/.cache/rpg-conquete-music', emptyOutDir: true } });
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/sablier-de-bab-el', pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
try {
  const { checkConqueteMusic } = await import('../node_modules/.cache/rpg-conquete-music/rpg-conquete-music-smoke.js');
  await checkConqueteMusic(assert);
} finally {
  dom.window.close();
}
console.log('Musique de conquête : seuils, hystérésis, fondu, reprise, onglet masqué, mute et nouveau duel vérifiés sur la vraie page.');
process.exit(0);
