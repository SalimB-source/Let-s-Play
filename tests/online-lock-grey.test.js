import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
test('les modes en ligne sont grisés uniquement lorsqu’ils sont verrouillés', async () => {
  const [rpg, rpgCss, mirage, mirageCss] = await Promise.all([
    read('../src/games/RpgDuelPage.jsx'), read('../src/games/rpg-battle.css'),
    read('../src/games/MirageRushPage.jsx'), read('../src/games/mirage-rush.css'),
  ]);
  assert.match(rpg, /!isOnlineModeEnabled\(\) \? ' is-locked'/);
  assert.match(mirage, /const locked = isOnline && !onlineEnabled/);
  assert.match(mirage, /disabled=\{locked\}/);
  assert.match(rpgCss, /\.rpg-mode-carte\.is-locked:is\(:hover, :focus-visible\) \.rpg-mode-carte__art\s*\{\s*filter:\s*grayscale\(1\)/);
  assert.match(mirageCss, /\.mirage-mode-action\.is-locked\s*\{[^}]*background:\s*linear-gradient\(125deg, #393939, #242424\)/);
  assert.match(mirageCss, /\.mirage-mode-action\.is-locked:hover \.mirage-mode-cta/);
});
