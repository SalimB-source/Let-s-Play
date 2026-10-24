import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cardById } from '../src/games/rpgCards.js';

const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');

test('la Valkyrie déclenche le vent froid sans modifier son effet d’arrivée', () => {
  const animation = page.slice(page.indexOf('const declencherGelMasse ='), page.indexOf('const annoncerMagie ='));
  assert.match(animation, /'valkyrie-des-glaces'\]\.includes\(id\)/);
  assert.match(animation, /jouerSfx\('cold_wind'\)/);
  assert.match(page, /effet.carteId === 'valkyrie-des-glaces' \? 'Valkyrie des glaces — vent froid'/);
  assert.deepEqual(cardById('valkyrie-des-glaces').arrivee, { type: 'degats', amount: 1, cible: 'toutes-creatures', gelChance: 0.25 });
});

test('les arrivées des deux camps passent par le filtre du vent froid', () => {
  assert.match(page, /declencherGelMasse\(carte, 'joueur'\)/);
  assert.match(page, /\} else \{\s+declencherGelMasse\(carteReponse, 'sorcier'\)/);
  assert.match(page, /if \(res.ok && carteAnnoncee\?\.kind !== 'magie'\) \{\s+declencherGelMasse\(carteAnnoncee, 'sorcier'\)/);
});
