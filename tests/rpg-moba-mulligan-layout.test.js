import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/games/rpg-moba.css', import.meta.url), 'utf8');

test('MOBA mulligan alone fits five cards and its action in the viewport', () => {
  const layout = css.slice(css.indexOf('/* MOBA opening hand:'));
  assert.match(layout, /\.moba__mulligan-overlay\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(layout, /\.moba__mulligan-overlay \.moba__mulligan\s*\{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto auto/s);
  assert.match(layout, /\.moba__mulligan-overlay \.moba__mulligan-cards\s*\{[^}]*container-type:\s*size;[^}]*flex-wrap:\s*wrap/s);
  assert.match(layout, /flex:\s*0 0 min\(calc\(\(100% - 32px\) \/ 5\), calc\(80cqh - 8px\), 140px\)/);
  assert.match(layout, /@media \(max-width: 650px\) and \(orientation: portrait\)[\s\S]*flex-basis:\s*min\(calc\(\(100% - 16px\) \/ 3\), calc\(40cqh - 8px\), 140px\)/);
  // The deck-search dialogue still uses the original, scrollable strip.
  assert.match(css, /\.moba__mulligan-cards\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(layout, /\.moba__mulligan-overlay \.moba__mulligan-card\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*5/s);
});

test('small mulligan faces keep cost, colour, and stats inside the frame', () => {
  const layout = css.slice(css.indexOf('/* The shared card face normally'));
  assert.match(layout, /--rpg-plaque-taille:\s*clamp\(9px, 20cqw, 28px\)/);
  assert.match(layout, /\.rpg-mana-cost\.is-plaque\s*\{[^}]*top:\s*3px !important;[^}]*left:\s*3px !important;[^}]*transform:\s*none !important/s);
  assert.match(layout, /> \.rpg-card-element-badge\.is-plaque\s*\{[^}]*left:\s*3px !important;[^}]*transform:\s*none !important/s);
  assert.match(layout, /\.rpg-card__pt\s*\{[^}]*padding:\s*1px/s);
});
