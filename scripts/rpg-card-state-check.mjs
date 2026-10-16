import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const previousEnv = process.env.NODE_ENV;
await build({
  logLevel: 'error',
  build: { ssr: 'scripts/rpg-card-state-smoke.jsx', outDir: 'node_modules/.cache/rpg-card-state', emptyOutDir: true },
});
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const battleCss = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
assert.match(battleCss, /\.rpg-card__stat--atk:not\(\.is-buffed, \.is-debuffed\)[\s\S]*?\.rpg-card__pt:not\(\.is-buffed, \.is-debuffed, \.is-wounded\)\s*\{[^}]*background:\s*rgba\(0, 0, 0, \.68\);/s,
  'une statistique neutre repose sur une plaque noire translucide');
assert.match(battleCss, /\.rpg-card\.rpg-card--img \.rpg-card__foot > \.is-buffed\s*\{[^}]*background:[^}]*#7dd3fc[^}]*filter:\s*none;/s,
  'un buff colore sa statistique en bleu clair, même sur une créature grisée');
assert.match(battleCss, /\.rpg-card\.rpg-card--img \.rpg-card__foot > \.is-debuffed\s*\{[^}]*background:[^}]*#c62f3b[^}]*filter:\s*none;/s,
  'un debuff colore sa statistique en rouge, même sur une créature grisée');

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/jeu/sablier-de-bab-el',
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

try {
  const { checkRpgCardState } = await import('../node_modules/.cache/rpg-card-state/rpg-card-state-smoke.js');
  await checkRpgCardState(assert);
} finally {
  dom.window.close();
}
