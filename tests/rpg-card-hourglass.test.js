import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const lire = (f) => readFileSync(new URL(`../src/games/${f}`, import.meta.url), 'utf8');

test('Sable affiche un sablier vectoriel contrasté sur les pastilles simples et hybrides', () => {
  const dessin = lire('CardHourglass.jsx');
  assert.match(dessin, /viewBox="0 0 24 24"/);
  assert.match(dessin, /aria-hidden="true" focusable="false"/);
  assert.match(dessin, /strokeWidth="2.3"/);
  assert.match(dessin, /fill="currentColor"/);
  const page = lire('RpgDuelPage.jsx');
  assert.match(page, /couleur === 'sable' \? <CardHourglass \/>/);
  assert.match(page, /teinte === 'sable' \? <CardHourglass \/>/);
  const css = lire('rpg-battle.css');
  assert.match(css, /\.rpg-card-hourglass \{[^}]*width: 76%;[^}]*height: 76%;/);
  assert.match(css, /color: #fff9df;/);
});
