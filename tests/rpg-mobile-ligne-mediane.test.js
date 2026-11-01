import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/games/rpg-mobile.css', import.meta.url), 'utf8');

test('la rangée du joueur est rapprochée de la ligne médiane sur mobile', () => {
  assert.match(css, /\.rpg-battle--touch \.card-table > \.card-row--equipe\s*\{[^}]*grid-area:\s*allies;[^}]*top:\s*calc\(-1 \* clamp\(6px, var\(--duel-card\) \* \.14, 12px\)\);/s);
  assert.match(css, /\.rpg-battle--touch \.card-table > \.card-row--ennemi\s*\{\s*grid-area:\s*enemy;/);
});
