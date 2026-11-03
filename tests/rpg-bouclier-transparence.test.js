import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('les boucliers de couleur gardent le centre transparent et la diagonale', () => {
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  assert.match(page, /fill: `url\(#\$\{idDegrade\}\)`, fillOpacity: \.12/);
  assert.match(page, /stroke: `url\(#\$\{idDegrade\}\)`/);
  assert.match(page, /x1="0%" y1="0%" x2="100%" y2="100%"/);
  assert.match(css, /\.rpg-bouclier-egide--colore \{[^}]*background: transparent/s);
  assert.match(css, /\.rpg-bouclier-egide--colore::before \{[^}]*linear-gradient\(135deg[\s\S]*?mask-image: radial-gradient\(ellipse at center, transparent 48%, #000 100%\)/);
  assert.doesNotMatch(css, /\.rpg-bouclier-egide--colore \.rpg-bouclier__ecu \{ opacity: \.8/);
  assert.match(css, /\.rpg-bouclier-egide \.rpg-bouclier__ecu \{\s*opacity: \.34/);
});
