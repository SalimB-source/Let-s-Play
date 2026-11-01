import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const env = process.env.NODE_ENV;
await build({ logLevel: 'error', build: { ssr: 'scripts/rpg-duel-nav-smoke.jsx', outDir: 'node_modules/.cache/rpg-son-reglages', emptyOutDir: true } });
if (env === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = env;
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/sablier-de-bab-el', pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = (query) => ({ matches: /pointer:\s*coarse/.test(query), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
window.HTMLMediaElement.prototype.play = () => Promise.resolve();
window.HTMLMediaElement.prototype.pause = () => {};
window.HTMLMediaElement.prototype.load = () => {};
try {
  const { checkRpgDuelNav } = await import('../node_modules/.cache/rpg-son-reglages/rpg-duel-nav-smoke.js');
  await checkRpgDuelNav(assert, { sonSeulement: true });
  console.log('Réglages sonores indépendants : vérifiés.');
} finally {
  dom.window.close();
}
