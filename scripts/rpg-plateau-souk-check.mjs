/** La place du Souk sur la vraie page du jeu (Conquête, récit, profil et PvP). */
import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const precedent = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-plateau-souk-smoke.jsx', outDir: 'node_modules/.cache/rpg-plateau-souk', emptyOutDir: true },
});
if (precedent === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = precedent;

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/jeu/sablier-de-bab-el', pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// jsdom ne lit pas les sons ; les substituer évite ses avertissements au
// nettoyage des lecteurs, le scénario vérifiant seulement le plateau.
dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
dom.window.HTMLMediaElement.prototype.pause = () => {};
dom.window.HTMLMediaElement.prototype.load = () => {};

try {
  const { checkPlateauSouk } = await import('../node_modules/.cache/rpg-plateau-souk/rpg-plateau-souk-smoke.js');
  await checkPlateauSouk(assert);
  console.log('Place du Souk : quatre étages, récit, choix de profil et duel en ligne vérifiés.');
} finally {
  dom.window.close();
}
process.exit(0);
