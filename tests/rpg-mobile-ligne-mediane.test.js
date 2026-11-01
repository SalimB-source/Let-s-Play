import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/games/rpg-mobile.css', import.meta.url), 'utf8');

test('les rangées se rapprochent symétriquement de la ligne médiane sur mobile', () => {
  assert.match(css, /--rpg-field-center-offset:\s*clamp\(6px, var\(--duel-card\) \* \.14, 12px\);/);
  assert.match(css, /\.rpg-battle--touch \.card-table > \.card-row--equipe\s*\{[^}]*grid-area:\s*allies;[^}]*top:\s*calc\(-1 \* var\(--rpg-field-center-offset\)\);/s);
  assert.match(css, /\.rpg-battle--touch \.card-table > \.card-row--ennemi\s*\{[^}]*grid-area:\s*enemy;[^}]*top:\s*var\(--rpg-field-center-offset\);/s);
  assert.match(css, /\.card-row--ennemi::after\s*\{[^}]*bottom:\s*var\(--rpg-field-center-offset\);[^}]*border-bottom:[^}]*pointer-events:\s*none;/s);
});
