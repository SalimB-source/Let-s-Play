import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const themeStyles = readFileSync(new URL('../src/theme.css', import.meta.url), 'utf8');
assert.match(styles, /\.brand-logo\{\s*height:50px;width:auto;aspect-ratio:1248\/905;object-fit:contain;\s*flex:none;/, 'logo desktop à taille renforcée, ratio natif et sans flex-shrink');
assert.match(styles, /\.nav\.scrolled \.brand-logo\{height:44px\}/, 'logo encore lisible après défilement');
assert.match(themeStyles, /\.nav \.nav-primary \.nav-submenu a,[\s\S]{0,160}color:var\(--ink\) !important/, 'liens dropdown lisibles sur le panneau clair');
execFileSync('npx', ['vite', 'build', '--ssr', 'scripts/nav-smoke.jsx', '--outDir', 'node_modules/.cache/nav', '--emptyOutDir', '--logLevel', 'error'], { stdio: 'inherit' });
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { checkNav } = await import('../node_modules/.cache/nav/nav-smoke.js');
try {
  await checkNav(assert);
  console.log('OK — logo visible et menu « Actus » conforme.\n');
} finally {
  dom.window.close();
}
