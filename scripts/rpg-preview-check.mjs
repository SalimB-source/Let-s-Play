import assert from 'node:assert/strict';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const previousEnv = process.env.NODE_ENV;
await build({ logLevel: 'error', build: { ssr: 'scripts/rpg-preview-smoke.jsx', outDir: 'node_modules/.cache/rpg-preview', emptyOutDir: true } });
if (previousEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previousEnv;
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/jeu/sablier-de-bab-el', pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
try {
  const { checkRpgPreviewActions } = await import('../node_modules/.cache/rpg-preview/rpg-preview-smoke.js');
  await checkRpgPreviewActions(assert);
  console.log('✓ Touch click-to-play: clicking plays cards, spells confirm before launch, mana checks, terrain limit, undo, direct attack selection, cancellation and spent-card guards');
  console.log('✓ Touch long-press: one second on a card (hand, board, catalogue, deck creator) opens the card preview without playing, adding or removing it, the follow-up click is swallowed, a sliding or short press keeps playing, Escape and the backdrop close the preview');
} finally { dom.window.close(); }
