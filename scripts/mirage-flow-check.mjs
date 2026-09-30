import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

let thumbnailBytes = 0;
for (const id of ['desert', 'western', 'prairie', 'sardinia', 'alger', 'japan', 'ramparts', 'airbase']) {
  const image = readFileSync(new URL(`../src/games/assets/maps/${id}.webp`, import.meta.url));
  assert.equal(image.toString('ascii', 0, 4), 'RIFF', `${id} est un fichier WebP`);
  assert.equal(image.toString('ascii', 8, 12), 'WEBP', `${id} est un fichier WebP`);
  assert.ok(image.length < 50 * 1024, `${id} reste sous 50 Kio`);
  thumbnailBytes += image.length;
}
assert.ok(thumbnailBytes < 310 * 1024, 'les huit miniatures restent sous 310 Kio au total');

execFileSync('npx', ['vite', 'build', '--ssr', 'scripts/mirage-flow-smoke.jsx', '--outDir', 'node_modules/.cache/mirage-flow', '--emptyOutDir', '--logLevel', 'error'], { stdio: 'inherit' });
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
// btoa / atob / TextEncoder natifs de Node 22 suffisent (encodage du lien de défi).
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { checkMirageFlow } = await import('../node_modules/.cache/mirage-flow/mirage-flow-smoke.js');
try { await checkMirageFlow(assert); } finally { dom.window.close(); }
console.log('check:mirage-flow ✓ — choix du mode (RUÉE / DUEL / EN LIGNE) et du terrain (8 horizons et leurs miniatures WebP, jusqu’à Thunder Airbase) dans l’overlay d’intro ; pas de barre d’onglets, terrain imposé par un défi verrouille les cartes.');
