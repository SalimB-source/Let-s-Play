import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rpgBilanDuel } from '../src/games/rpgBilanDuel.js';

test('le bilan montre l’état final et les derniers événements dans leur ordre réel', () => {
  const duel = { joueur: { pv: 7, creatures: [{}, {}] }, sorcier: { pv: -2, creatures: [{}] }, log: ['début', 'bouclier brisé', 'coup final'] };
  assert.deepEqual(rpgBilanDuel(duel, 2), { joueur: { pv: 7, creatures: 2 }, sorcier: { pv: -2, creatures: 1 }, evenements: ['bouclier brisé', 'coup final'] });
  assert.deepEqual(rpgBilanDuel(duel, 0).evenements, []);
  assert.deepEqual(rpgBilanDuel({}).evenements, []);
  assert.equal(rpgBilanDuel({}).joueur.pv, null);
});

test('le bilan de fin est facultatif et conserve les récompenses existantes', () => {
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /<details className="rpg-bilan-fin" data-bilan-fin>/);
  assert.match(page, /data-victoire-gain=\{annonceGain.gain\}/);
  assert.match(page, /<BarreXpFinDeDuel/);
});
