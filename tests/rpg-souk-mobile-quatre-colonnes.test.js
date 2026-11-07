import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../src/games/rpg-souk.css', import.meta.url), 'utf8');
const page = readFileSync(new URL('../src/games/RpgSouk.jsx', import.meta.url), 'utf8');

test('le Souk mobile présente quatre colonnes avec des sachets adaptés et des boutons tactiles', () => {
  const mobile = css.slice(css.lastIndexOf("/* Sur téléphone, toute l'étagère"));
  assert.match(mobile, /max-width:\s*700px/);
  assert.match(mobile, /pointer:\s*coarse/);
  assert.match(mobile, /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(mobile, /container-type:\s*inline-size/);
  assert.match(mobile, /--pw:\s*min\(21cqw,\s*90px\)/);
  assert.match(mobile, /paquet-prix\s*\{[^}]*min-height:\s*44px/s);
  assert.match(mobile, /coffret\s*\{[^}]*min-height:\s*44px/s);
  assert.match(page, /onOuvrir\?\.\(rayon\.id\)/);
  assert.match(page, /onOuvrirCoffret\?\.\(etat\.rayon\.id\)/);
});
