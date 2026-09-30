import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
execFileSync('npx', ['vite', 'build', '--ssr', 'scripts/mirage-flow-smoke.jsx', '--outDir', 'node_modules/.cache/mirage-flow', '--emptyOutDir', '--logLevel', 'error'], { stdio: 'inherit' });
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
// btoa / atob / TextEncoder natifs de Node 22 suffisent (encodage du lien de défi).
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { checkMirageFlow } = await import('../node_modules/.cache/mirage-flow/mirage-flow-smoke.js');
try { await checkMirageFlow(assert); } finally { dom.window.close(); }
console.log('check:mirage-flow ✓ — choix du mode (RUÉE / DUEL / COUPE / EN LIGNE) et du terrain (6 horizons, dont Alger la Blanche) dans l’overlay d’intro ; la COUPE propose la Coupe du Désert (3 courses, barème des points), pas de barre d’onglets, terrain imposé par un défi verrouille les cartes.');
