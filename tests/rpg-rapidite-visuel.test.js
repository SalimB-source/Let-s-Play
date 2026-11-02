import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Rapidité reste annoncée mais ne dessine plus d’électricité autour des cartes', () => {
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/games/rpg-battle.css', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /ElectriciteRapidite|tirerHasardElectricite|rpg-card__electricite|has-rapidite/);
  assert.doesNotMatch(css, /rpg-card__electricite|rpg-electricite-vacille|\.rpg-card\.has-rapidite/);
  assert.match(page, /entite\.rapidite \? ', rapidité, peut attaquer le tour où elle arrive'/);
  assert.match(page, /function AuraOndes/);
});
