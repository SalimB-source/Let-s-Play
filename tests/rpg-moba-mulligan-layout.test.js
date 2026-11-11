import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/games/rpg-moba.css', import.meta.url), 'utf8');
const cardCss = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');

test('MOBA mulligan alone fits five cards and its action in the viewport', () => {
  const layout = css.slice(css.indexOf('/* MOBA opening hand:'));
  assert.match(layout, /\.moba__mulligan-overlay\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(layout, /--moba-mulligan-gap:\s*clamp\(12px, 1\.2vw, 16px\)/);
  assert.match(layout, /\.moba__mulligan-overlay \.moba__mulligan\s*\{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto auto/s);
  assert.match(layout, /\.moba__mulligan-overlay \.moba__mulligan-cards\s*\{[^}]*container-type:\s*size;[^}]*flex-wrap:\s*wrap/s);
  assert.match(layout, /flex:\s*0 0 min\(calc\(\(100% - 4 \* var\(--moba-mulligan-gap\)\) \/ 5\), calc\(80cqh - 22px\), 112px\)/);
  assert.match(layout, /@media \(max-width: 650px\) and \(orientation: portrait\)[\s\S]*flex-basis:\s*min\(calc\(\(100% - 2 \* var\(--moba-mulligan-gap\)\) \/ 3\), calc\(40cqh - 16px\), 112px\)/);
  // The deck-search dialogue still uses the original, scrollable strip.
  assert.match(css, /\.moba__mulligan-cards\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(layout, /\.moba__mulligan-overlay \.moba__mulligan-card\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*5/s);
});

test('small mulligan faces retain the shared corner markers without cropping them', () => {
  const layout = css.slice(css.indexOf('/* Keep the same cost-at-the-corner'));
  assert.match(css, /\.moba__mulligan-overlay \.moba__mulligan-cards\s*\{[^}]*padding:\s*0 10px/s);
  assert.match(layout, /--rpg-plaque-taille:\s*clamp\(9px, 20cqw, 28px\)/);
  assert.doesNotMatch(layout, /\.rpg-mana-cost\.is-plaque\s*\{[^}]*transform:\s*none/s);
  assert.doesNotMatch(layout, /\.rpg-card-element-badge\.is-plaque\s*\{[^}]*left:\s*3px/s);
  assert.match(cardCss, /\.rpg-mulligan__card[\s\S]*?\.rpg-mana-cost\.is-plaque\s*\{[^}]*transform:\s*translateX\(-36%\) !important/s);
  assert.match(cardCss, /overflow-clip-margin:\s*22px/);
  assert.match(layout, /\.rpg-card__pt\s*\{[^}]*padding:\s*1px/s);
});
