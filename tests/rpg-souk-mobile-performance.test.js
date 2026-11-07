import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../src/games/rpg-souk.css', import.meta.url), 'utf8');
const jsx = readFileSync(new URL('../src/games/RpgSouk.jsx', import.meta.url), 'utf8');

test('le Souk tactile évite les animations et reflets permanents coûteux', () => {
  const mobile = css.slice(css.lastIndexOf('/* Sur écran tactile, éviter'));
  assert.match(mobile, /@media\s*\(pointer:\s*coarse\),\s*\(max-width:\s*700px\)/);
  assert.match(mobile, /paquet-scene[\s\S]*?direct-carte\.is-mythique\s*\{\s*animation:\s*none/);
  assert.match(mobile, /paquet-face--avant::before[\s\S]*?paquet::before\s*\{\s*display:\s*none/);
  assert.match(mobile, /paquet-ombre\s*\{\s*filter:\s*none/);
  assert.doesNotMatch(mobile, /ceremonie/);
  assert.match(jsx, /onOuvrir\?\.\(rayon\.id\)/);
  assert.match(jsx, /onOuvrirCoffret\?\.\(etat\.rayon\.id\)/);
  assert.match(jsx, /onPointerDown=\{appuyer\}/);
});
