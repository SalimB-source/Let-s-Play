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
test('le slide présente Salem ouvrant un booster et conduit au Souk sans simuler un achat', () => {
  const lire = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
  const page = lire('../src/games/RpgDuelPage.jsx');
  const souk = lire('../src/games/RpgSouk.jsx');
  const composant = lire('../src/games/RpgOffreLancement.jsx');
  const css = lire('../src/games/rpg-battle.css');
  const affiche = readFileSync(new URL('../public/sablier-promo/offre-lancement-salem.webp', import.meta.url));
  assert.equal(affiche.toString('ascii', 0, 4), 'RIFF');
  assert.equal(affiche.toString('ascii', 8, 12), 'WEBP');
  assert.ok(affiche.byteLength < 500_000, 'image de vitrine légère');
  assert.match(page, /offreActive && <div className=\{`rpg-mode-menu__diapo rpg-mode-menu__diapo--offre/);
  assert.match(page, /offreLancementActive=\{offreActive\}/);
  assert.match(page, /setInterval\(actualiser, 30000\)/);
  assert.match(souk, /offreLancementActive && <RpgOffreLancement/);
  assert.match(composant, /offre-lancement-salem\.webp/);
  assert.match(composant, /Paiement bientôt disponible/);
  assert.match(composant, /Découvrir le Souk/);
  assert.match(composant, /onClick=\{onOuvrirSouk\} tabIndex=\{actif \? 0 : -1\}/);
  assert.match(page, /onOuvrirSouk=\{\(\) => \{ play\('menu'\); onChangeScreen\('souk'\); \}\}/);
  assert.match(page, /aria-hidden=\{diapoAffichee !== RPG_OFFRE_DIAPO\}/);
  assert.doesNotMatch(page, /rpg-mode-menu__diaporama[^\n]*aria-hidden="true"/, 'le CTA actif n’est pas masqué aux lecteurs d’écran');
  assert.match(css, /rpg-mode-menu__diapo--offre\.is-active \{ pointer-events: auto; \}/);
  assert.match(css, /rpg-mode-menu__hero\[data-offre-visible="true"\] \{\s*min-height: 235px/, 'le CTA ne sort pas de la vitrine tactile');
  assert.match(css, /data-offre-visible="true"\] \.rpg-mode-menu__hero-copy \{ opacity: 0/);
  assert.doesNotMatch(composant, /onOuvrirCoffret|disabled tabIndex/);
});
