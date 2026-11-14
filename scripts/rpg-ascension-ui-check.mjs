import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

// Sonde de test uniquement : le jeu publié n’expose pas son état mutable.
const sonde = {
  name: 'sonde-ascension', enforce: 'pre',
  transform(code, id) {
    if (!id.endsWith('RpgDuelPage.jsx')) return null;
    const ancre = '  const duel = duelRef.current;';
    assert.ok(code.includes(ancre), 'ancre de test du duel');
    return code.replace(ancre, `${ancre}\n  if (typeof window !== 'undefined') { window.__RPG_DUEL__ = duel; window.__RPG_FORCE__ = force; }`);
  },
};
const env = process.env.NODE_ENV;
await build({ logLevel: 'error', plugins: [sonde], build: { ssr: 'scripts/rpg-ascension-smoke.jsx', outDir: 'node_modules/.cache/rpg-ascension', emptyOutDir: true } });
if (env === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = env;
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/sablier-de-bab-el', pretendToBeVisual: true });
globalThis.window = dom.window; globalThis.document = dom.window.document;
dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
dom.window.HTMLMediaElement.prototype.pause = () => {}; dom.window.HTMLMediaElement.prototype.load = () => {};
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
try {
  const { checkAscensionDuel, checkAscensionMoba } = await import('../node_modules/.cache/rpg-ascension/rpg-ascension-smoke.js');
  await checkAscensionDuel(assert, false);
  await checkAscensionDuel(assert, true);
  await checkAscensionMoba(assert);
} finally {
  dom.window.close();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
}
