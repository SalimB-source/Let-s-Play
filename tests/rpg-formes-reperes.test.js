import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const lire = f => readFileSync(new URL(`../src/games/${f}`, import.meta.url), 'utf8');
test('couleur simple, hybride et coût sont dessinés dans un losange', () => {
  const page = lire('RpgDuelPage.jsx');
  const badge = page.slice(page.indexOf('function CardElementBadge'), page.indexOf('function CombatActionIcon'));
  assert.equal((badge.match(/<PlaqueForme forme="diamant"/g) ?? []).length, 2);
  assert.doesNotMatch(badge, /forme="hexagone"/);
  const cout = page.slice(page.indexOf('function ManaCost'), page.indexOf('function WizardManaCounters'));
  assert.match(cout, /<PlaqueForme forme="diamant"/);
});
test('les sceaux des deux types de sorts sont découpés en losange', () => {
  const css = lire('rpg-battle.css');
  for (const type of ['rapide', 'sorcellerie']) {
    assert.match(css, new RegExp(`\\.rpg-sort-sceau--${type} \\{[^}]*clip-path: polygon\\(50% 0, 100% 50%, 50% 100%, 0 50%\\)`));
  }
});
