import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

await build({ logLevel: 'error', build: { ssr: 'scripts/rpg-embuscade-smoke.jsx', outDir: 'node_modules/.cache/rpg-embuscade', emptyOutDir: true } });
const { rendu } = await import('../node_modules/.cache/rpg-embuscade/rpg-embuscade-smoke.js');
const { apercu, table } = rendu();
const fiche = new JSDOM(apercu).window.document;
const pastille = fiche.querySelector('[data-pastille="reactionTourAdverse"]');
assert.ok(pastille, 'la fiche présente la pastille Invocation spéciale');
assert.match(pastille.textContent, /Invocation spéciale/);
assert.match(pastille.getAttribute('aria-label'), /jouer .* pendant votre phase principale/i);
assert.equal(pastille.querySelector('use').getAttribute('href'), '#i-invocation-speciale');
assert.ok(pastille.classList.contains('rpg-pastille--explicable'), 'la pastille possède une bulle d’aide');
const terrain = new JSDOM(table).window.document;
assert.ok(terrain.querySelector('[data-effet="reactionTourAdverse"] use[href="#i-invocation-speciale"]'), 'la carte posée porte son icône');
console.log('Invocation spéciale : pastille explicative et icône sur la table OK');
