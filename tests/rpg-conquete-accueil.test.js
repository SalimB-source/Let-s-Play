import test from 'node:test';
import assert from 'node:assert/strict';
import { resumeConquete, tourCorrespondFiltre, enregistrerDerniereTour, lireDerniereTour } from '../src/games/rpgConqueteAccueil.js';
import { RPG_STORY_TOURS } from '../src/games/rpgStoryTours.js';
import { gainsDeTour } from '../src/games/rpgCredits.js';

test('bilan et filtres suivent la progression sans compter les récompenses de rejeu', () => {
  const [premiere, seconde] = RPG_STORY_TOURS;
  const progression = { etagesVaincus: [...premiere.etages.map((e) => e.id), seconde.etages[0].id] };
  const portefeuille = { toursPayees: [premiere.id] };
  const bilan = resumeConquete(progression, portefeuille);
  const finie = bilan.tours.find((t) => t.tour.id === premiere.id);
  const commencee = bilan.tours.find((t) => t.tour.id === seconde.id);
  assert.equal(bilan.etages, premiere.etages.length + 1);
  assert.equal(bilan.terminees, 1);
  assert.equal(bilan.gains, gainsDeTour(premiere.id, { ...progression, toursPayees: portefeuille.toursPayees }).dejaGagne
    + gainsDeTour(seconde.id, { ...progression, toursPayees: portefeuille.toursPayees }).dejaGagne);
  assert.equal(tourCorrespondFiltre(finie, 'terminees'), true);
  assert.equal(tourCorrespondFiltre(finie, 'disponibles'), false);
  assert.equal(tourCorrespondFiltre(commencee, 'en-cours'), true);
  assert.equal(tourCorrespondFiltre(commencee, 'disponibles'), true);
  const verrouillee = bilan.tours.find((t) => !t.ouverte);
  if (verrouillee) assert.equal(tourCorrespondFiltre(verrouillee, 'disponibles'), false);
});

test('la dernière tour inconnue ou le stockage indisponible ne bloque pas le menu', () => {
  assert.equal(enregistrerDerniereTour('tour-inconnue'), false);
  assert.equal(lireDerniereTour(), null);
});
