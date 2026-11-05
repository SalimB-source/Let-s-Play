import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FIN_OFFRE_LANCEMENT, OFFRE_LANCEMENT, offreLancementActive } from '../src/games/rpgOffreLancement.js';

test('offre de lancement : 10 boosters, prix et fin le 30 décembre inclus à Alger', () => {
  assert.deepEqual(OFFRE_LANCEMENT, { boosters: 10, prix: '5 €', prixInitial: '10 €', fin: '30 décembre 2026' });
  assert.equal(FIN_OFFRE_LANCEMENT, Date.parse('2026-12-31T00:00:00+01:00'));
  assert.equal(offreLancementActive(Date.parse('2026-12-30T23:59:59+01:00')), true);
  assert.equal(offreLancementActive(Date.parse('2026-12-31T00:00:00+01:00')), false);
  assert.equal(offreLancementActive(NaN), false);
});
test('l’offre apparaît dans le Souk et après les sets du diaporama, sans faux achat', () => {
  const lire = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
  const page = lire('../src/games/RpgDuelPage.jsx');
  const souk = lire('../src/games/RpgSouk.jsx');
  const composant = lire('../src/games/RpgOffreLancement.jsx');
  const css = lire('../src/games/rpg-battle.css');
  assert.match(page, /offreActive && <div className=\{`rpg-mode-menu__diapo rpg-mode-menu__diapo--offre/);
  assert.match(page, /offreLancementActive=\{offreActive\}/);
  assert.match(page, /setInterval\(actualiser, 30000\)/);
  assert.match(souk, /offreLancementActive && <RpgOffreLancement/);
  assert.match(composant, /Paiement bientôt disponible/);
  assert.match(composant, /<button[^>]*disabled tabIndex=\{-1\}/);
  assert.match(composant, /length: OFFRE_LANCEMENT.boosters/);
  assert.doesNotMatch(composant, /onClick|onOuvrirCoffret/);
  assert.match(css, /data-offre-visible="true"\] \.rpg-mode-menu__hero-copy \{ opacity: 0/);
});
