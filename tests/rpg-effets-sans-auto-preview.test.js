import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const lire = (f) => readFileSync(new URL(`../src/games/${f}`, import.meta.url), 'utf8');

test('les effets ne déclenchent plus d’aperçu automatique, mais les aperçus manuels et projectiles restent', () => {
  const page = lire('RpgDuelPage.jsx');
  assert.doesNotMatch(page, /presentationCarte|presentationsCartes|surface="EFFET ACTIVÉ"|className="rpg-auto-preview"/);
  assert.match(page, /if \(duelCourant\) rpgConsommerPresentations\(duelCourant\)/);
  assert.match(page, /\{apercuSurvol &&/);
  assert.match(page, /projectilesVisibles\.map/);
});

test('les SVG de type et le symbole de couleur sont réduits sans changer les pierres d’effets', () => {
  const css = lire('rpg-battle.css');
  assert.match(css, /\.rpg-battle \.rpg-sort-sceau > \.rpg-sort-sigil \{\s*width: 48%;\s*height: 48%;/);
  assert.match(css, /font-size: calc\(var\(--rpg-plaque-taille, 24px\) \* \.42\);/);
  assert.match(css, /--rpg-plaque-taille: clamp\(24px, 26cqw, 52px\)/);
});
