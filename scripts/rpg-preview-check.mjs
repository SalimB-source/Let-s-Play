import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const battleCss = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
assert.match(battleCss, /\.rpg-hover-card-preview__sceau,\s*\.rpg-hover-card-preview__sort,\s*\.rpg-mulligan__sceau,\s*\.rpg-mulligan__sort\s*\{[^}]*bottom:\s*var\(--rpg-card-element-marker-top,\s*5%\);[^}]*left:\s*var\(--rpg-card-element-marker-left,\s*6%\);[^}]*width:\s*var\(--rpg-card-marker-size,\s*38px\);/s,
  'dans l’aperçu des cartes et le mulligan, le sceau de Magie Rapide et de Sorcellerie s’aligne sur les mêmes marges et le même diamètre que la couleur de la carte');
assert.match(battleCss, /\.rpg-hover-card-preview__face \.rpg-card__stat--atk,\s*\.rpg-hover-card-preview__face \.rpg-card__pt,\s*\.rpg-mulligan__card \.rpg-card__stat--atk,\s*\.rpg-mulligan__card \.rpg-card__pt\s*\{[^}]*background:\s*rgba\(0,\s*0,\s*0,\s*\.68\);[^}]*font:\s*900 calc\(var\(--rpg-card-marker-size,\s*38px\) \* \.62\)\/1\.15 Georgia, serif;/s,
  'les statistiques ATQ/DÉF des créatures sont agrandies et noires translucides dans l’aperçu des cartes et le mulligan');

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
  console.log('✓ Card sheet: clicking a catalogue card opens it full size — art, name, family, color, cost, effects line by line, stats — leaving filters and grid untouched; locked cards stay gray with a centered lock and their full preview remains clickable; the close button, Escape and the backdrop dismiss it, and the long press keeps its own quick preview');
  console.log('✓ One card, one sheet: the sheet shows the designated card and nothing else — no side arrows, no position counter, no swipe, and the keyboard arrows plus Home/End change nothing; a filtered grid opens the clicked card alone, and browsing never plays, filters or closes anything');
  console.log('✓ Right-click card sheet: right-clicking a card opens its sheet anywhere — catalogue, hand, battlefield, deck list — without playing it (no attack declared, no card played, no mana tapped, no spell confirm); one card, one sheet, so it carries no arrows, no counter and no swipe either; the browser menu stays muted on the bare table and on a card alike, Escape, the backdrop and the close button dismiss it, and the deck creator keeps its own right-click (it removes a copy instead)');
} finally { dom.window.close(); }
