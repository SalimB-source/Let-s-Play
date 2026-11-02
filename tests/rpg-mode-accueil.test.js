import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgIndicationsModes } from '../src/games/rpgModeAccueil.js';
import { recitHistoireVide } from '../src/games/rpgStoryFlow.js';
import { RPG_STORY_TOURS } from '../src/games/rpgStoryTours.js';

test('les modes reflètent la progression réelle et la reprise de campagne', () => {
  const vide = { recit: null, etagesVaincus: [] };
  assert.equal(rpgIndicationsModes(vide).histoire, 'Une aventure à découvrir');
  assert.equal(rpgIndicationsModes(vide).conquete, `0 / ${RPG_STORY_TOURS.length} tours conquises`);
  const entamee = { recit: recitHistoireVide(), etagesVaincus: RPG_STORY_TOURS[0].etages.map((e) => e.id) };
  const affichage = rpgIndicationsModes(entamee);
  assert.match(affichage.histoire, /^Acte I · /);
  assert.equal(affichage.conquete, `1 / ${RPG_STORY_TOURS.length} tours conquises`);
  assert.equal(rpgIndicationsModes(entamee, { hasGame: true, campagneEnCours: true }).reprendreHistoire, true);
  assert.equal(rpgIndicationsModes(entamee, { hasGame: true, campagneEnCours: false }).reprendreHistoire, false);
  assert.equal(rpgIndicationsModes(entamee, { hasGame: false, campagneEnCours: true }).reprendreHistoire, false);
});
