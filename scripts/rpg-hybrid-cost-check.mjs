import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const previousEnv = process.env.NODE_ENV;
await build({ logLevel: 'error', build: {
  ssr: 'scripts/rpg-hybrid-cost-smoke.jsx', outDir: 'node_modules/.cache/rpg-hybrid-cost', emptyOutDir: true,
} });
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/jeu/sablier-de-bab-el', pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
try {
  const { checkRpgHybridCostAtelier } = await import('../node_modules/.cache/rpg-hybrid-cost/rpg-hybrid-cost-smoke.js');
  await checkRpgHybridCostAtelier(assert);
  console.log('✓ Coûts hybrides : les médaillons de la bibliothèque et du deck en atelier partagent deux couleurs, sans changer les chiffres, les pips ni les cartes mono/terrain');
} finally {
  dom.window.close();
}
