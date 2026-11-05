import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const lire = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('le diaporama et le comptoir présentent le booster Vampires', () => {
  const page = lire('../src/games/RpgDuelPage.jsx');
  const souk = lire('../src/games/RpgSouk.jsx');
  const css = lire('../src/games/rpg-souk.css');
  assert.ok(existsSync(new URL('../public/sablier-promo/booster-vampires.webp', import.meta.url)));
  assert.match(page, /booster-vampires-banniere\.webp/);
  assert.match(page, /nombreDiapos = offreActive \? 5 : 4/);
  assert.match(page, /diapoAffichee === 4[^\n]*RpgOffreLancement/);
  assert.match(souk, /rayons\.map\(/);
  assert.match(css, /data-souk-rayons-nombre="2"/);
});

test('le nouveau visuel Vampires contient la composition et le texte, et remplit le slide', () => {
  const page = lire('../src/games/RpgDuelPage.jsx');
  const css = lire('../src/games/rpg-battle.css');
  const affiche = readFileSync(new URL('../public/sablier-promo/booster-vampires-banniere.webp', import.meta.url));
  assert.equal(affiche.toString('ascii', 0, 4), 'RIFF');
  assert.equal(affiche.toString('ascii', 8, 12), 'WEBP');
  assert.match(page, /className="rpg-mode-menu__vampires-affiche"[^\n]*booster-vampires-banniere\.webp/);
  assert.match(css, /\.rpg-mode-menu__vampires-affiche \{[^}]*width: 100%;[^}]*height: 100%;[^}]*object-fit: cover;/s);
  assert.match(css, /\.rpg-mode-menu__hero\[data-vampires-visible="true"\] \{ min-height: 270px/);
  assert.doesNotMatch(page, /rpg-mode-menu__vampires-texte|rpg-mode-menu__vampires-booster/);
  assert.match(page, /diapoAffichee === 3 && <p className="sr-only">Booster Vampires[^\n]*Embuscade : jouez une créature pendant le tour adverse si sa condition est remplie/);
});
