import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const sonde = {
  name: 'sonde-duel-individuel', enforce: 'pre',
  transform(code, id) {
    if (!id.endsWith('RpgDuelPage.jsx')) return null;
    const ancre = '  const duel = duelRef.current;';
    if (!code.includes(ancre)) throw new Error('Sonde du duel introuvable');
    return code.replace(ancre, `${ancre}\n  if (typeof window !== 'undefined') { window.__RPG_DUEL__ = duel; window.__RPG_FORCE__ = force; }`);
  },
};
const previousEnv = process.env.NODE_ENV;
await build({ logLevel: 'error', plugins: [sonde], build: { ssr: 'scripts/rpg-classique-individuel-smoke.jsx', outDir: 'node_modules/.cache/rpg-classique-individuel', emptyOutDir: true } });
if (previousEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnv;
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/sablier-de-bab-el', pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;
dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
dom.window.HTMLMediaElement.prototype.pause = () => {}; dom.window.HTMLMediaElement.prototype.load = () => {};
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
try {
  const { checkCombatIndividuel } = await import('../node_modules/.cache/rpg-classique-individuel/rpg-classique-individuel-smoke.js');
  await checkCombatIndividuel(assert);
} finally { dom.window.close(); }
console.log('Combat individuel classique : interface vérifiée.');
