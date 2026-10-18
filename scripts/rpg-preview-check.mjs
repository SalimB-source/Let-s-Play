import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'vite';
import { JSDOM } from 'jsdom';

const battleCss = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
const battlePage = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
assert.match(battleCss, /\.rpg-spell-preview-layer\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*108;[^}]*inset:\s*0;[^}]*isolation:\s*isolate;/s,
  'le voile et la carte du sort partagent un contexte d’empilement isolé, attaché au plateau');
assert.match(battleCss, /\.rpg-preview-backdrop\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*0;[^}]*inset:\s*0;[^}]*background:\s*rgba\(3, 2, 5, \.64\);/s,
  'le voile sombre reste derrière la carte et n’est plus une couche fixe de viewport');
assert.doesNotMatch(battleCss, /\.rpg-preview-backdrop\s*\{[^}]*backdrop-filter\s*:/s,
  'le voile n’utilise pas de filtre de fond qui pourrait être recomposé au-dessus de la carte');
assert.match(battleCss, /\.rpg-spell-preview-layer\s*>\s*\.rpg-hover-card-preview\.is-spell-preview\s*\{[^}]*position:\s*absolute;/s,
  'la carte du sort est positionnée dans la même couche que son voile');
// Régression PR 879 : la couche isolée ne suffisait pas — au doigt,
// `@media (pointer: coarse)` masque tous les aperçus de survol
// (`display: none`), et jsdom ne résout ni les media queries ni la cascade,
// donc les contrôles d’empilement passaient pendant que la carte restait
// invisible sur téléphone (voile sombre seul). L’aperçu d’une magie jouée
// doit explicitement échapper à ce masquage, comme le volet d’appui long.
assert.match(battleCss, /@media \(pointer: coarse\) \{[\s\S]*?\.rpg-spell-preview-layer \.rpg-hover-card-preview \{ display: grid; \}/,
  'au doigt, l’aperçu de la magie jouée échappe au masquage des aperçus de survol et reste visible sur son voile');
assert.match(battlePage, /\{apercuMagie && \(\s*<div className="rpg-spell-preview-layer">\s*<div className="rpg-preview-backdrop rpg-preview-backdrop--magie" aria-hidden="true" \/>\s*<HoverCardPreview\s+carte=\{cardById\(apercuMagie\)\}[\s\S]*?style=\{\{ left: '50%', top: '50%', transform: 'translate\(-50%, -50%\)' \}\}\s+spellPlayed\s*\/>\s*<\/div>\s*\)\}/,
  'l’aperçu de la magie réutilise le composant central, avec le voile comme frère et derrière lui');
assert.match(battleCss, /\.rpg-card-peek\s*\{[^}]*position:\s*fixed;[^}]*isolation:\s*isolate;/s,
  'les fiches de cartes ouvrent aussi leur propre contexte d’empilement');
assert.match(battleCss, /\.rpg-card-peek__backdrop\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*0;/s,
  'le voile de la fiche est une couche de fond explicite');
assert.doesNotMatch(battleCss, /\.rpg-card-peek__backdrop\s*\{[^}]*backdrop-filter\s*:/s,
  'le filtre de fond ne peut pas passer au-dessus de la fiche dans une WebView');
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
