import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
execFileSync('npx', ['vite', 'build', '--ssr', 'scripts/top-games-smoke.jsx', '--outDir', 'node_modules/.cache/top-games', '--emptyOutDir', '--logLevel', 'error'], { stdio: 'inherit' });
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { checkTopGames } = await import('../node_modules/.cache/top-games/top-games-smoke.js');
try { await checkTopGames(assert); } finally { dom.window.close(); }
