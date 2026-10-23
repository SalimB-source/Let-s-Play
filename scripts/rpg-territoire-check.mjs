import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
assert.match(css, /@property --rpg-frontiere\s*\{[^}]*syntax: '<percentage>';[^}]*inherits: true;/s);
assert.match(css, /transition: --rpg-frontiere 900ms/);
assert.match(css, /mask-image: linear-gradient\(to bottom,[^}]*var\(--rpg-frontiere, 50%\)/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.card-table--decoupee,[^}]*transition: none;/s);
assert.match(css, /\.card-table\[data-territoire-termine\] \.rpg-plateau-lisere \{ opacity: 0; \}/);
assert.match(css, /\.card-table--decoupee\[data-territoire-termine\] \{ --rpg-fondu: 0%; \}/);
assert.match(css, /data-plateau-joueur="cour-de-l-empereur"[^}]*--rpg-conquete-rgb: 245, 91, 53;/s);
const previousEnv = process.env.NODE_ENV;
await build({ logLevel: 'error', build: { ssr: 'scripts/rpg-territoire-smoke.jsx', outDir: 'node_modules/.cache/rpg-territoire', emptyOutDir: true } });
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/sablier-de-bab-el', pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
dom.window.HTMLMediaElement.prototype.play = () => Promise.resolve();
dom.window.HTMLMediaElement.prototype.pause = () => {};
dom.window.HTMLMediaElement.prototype.load = () => {};
try {
  const { checkTerritoire } = await import('../node_modules/.cache/rpg-territoire/rpg-territoire-smoke.js');
  await checkTerritoire(assert);
} finally {
  dom.window.close();
}
console.log('Territoires : dégâts, soins, victoire/défaite PvP, nul et nouvelle partie vérifiés.');
process.exit(0);
