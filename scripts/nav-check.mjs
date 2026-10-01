import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
execFileSync('npx', ['vite', 'build', '--ssr', 'scripts/nav-smoke.jsx', '--outDir', 'node_modules/.cache/nav', '--emptyOutDir', '--logLevel', 'error'], { stdio: 'inherit' });
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { checkNav } = await import('../node_modules/.cache/nav/nav-smoke.js');
try {
  await checkNav(assert);
  console.log('OK — logo intègre et sous-menu « Jeux » conforme.\n');
} finally {
  dom.window.close();
}
