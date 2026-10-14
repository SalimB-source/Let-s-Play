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
  console.log('✓ Touch long-press: one second on a card (hand, board, catalogue, deck creator) opens the card preview without playing, adding or removing it, the follow-up click is swallowed — even when a scroll or a pointercancel interrupts the hold after it triggered — a sliding or short press keeps playing, Escape and the backdrop close the preview');
  console.log('✓ Catalogue card sheet: clicking a catalogue card opens it full size — art, name, family, color, cost, effects line by line, stats — leaving filters and grid untouched; the close button, Escape and the backdrop dismiss it, and the long press keeps its own quick preview');
  console.log('✓ Catalogue sheet arrows: left and right step through the filtered grid order, wrapping at both ends, with the counter and each arrow naming its card; keyboard arrows plus Home/End do the same, a horizontal swipe over 48 px turns the card while a vertical or short one leaves the sheet alone, a filtered grid only cycles what it shows, and browsing never plays, filters or closes anything');
} finally { dom.window.close(); }
