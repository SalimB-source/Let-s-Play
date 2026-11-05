import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const lire = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('le diaporama et le comptoir présentent le booster Vampires', () => {
  const page = lire('../src/games/RpgDuelPage.jsx');
  const souk = lire('../src/games/RpgSouk.jsx');
  const css = lire('../src/games/rpg-souk.css');
  assert.ok(existsSync(new URL('../public/sablier-promo/booster-vampires.webp', import.meta.url)));
  assert.match(page, /booster-vampires\.webp/);
  assert.match(page, /nombreDiapos = offreActive \? 5 : 4/);
  assert.match(page, /diapoAffichee === 4[^\n]*RpgOffreLancement/);
  assert.match(souk, /rayons\.map\(/);
  assert.match(css, /data-souk-rayons-nombre="2"/);
});
