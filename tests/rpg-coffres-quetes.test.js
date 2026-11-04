import { test } from 'node:test';
import assert from 'node:assert/strict';

import { GAINS } from '../src/games/rpgCredits.js';
import { JOURS_DE_LA_SERIE } from '../src/games/rpgQuetes.js';
import {
  GENRES_COFFRES, coffreDeLaQuete, legendeCoffre, paquetsDuCoffre, vueDesCoffres,
} from '../src/games/rpgCoffresQuetes.js';

/** Un état de quêtes lisible : trois quêtes, une par palier. */
const TROIS = ['creatures-10', 'duels-2', 'duels-3'];
const etat = (suite = {}) => ({
  version: 1, jour: '2026-11-04', quetes: TROIS,
  progres: { 'creatures-10': 0, 'duels-2': 0, 'duels-3': 0 },
  reclamations: [], cachet: false, semaine: false, serie: 1,
  majLe: null, debutLe: '2026-11-04T08:00:00.000Z',
  ...suite,
});

test('les trois quêtes du jour deviennent trois coffres, un par palier', () => {
  const vue = vueDesCoffres(etat());
  assert.equal(vue.slots.length, 4, 'trois coffres de quête + le Coffre du cycle');
  assert.deepEqual(vue.slots.map((c) => c.genre), ['bronze', 'argent', 'or', 'royal']);
  assert.deepEqual(vue.slots.map((c) => c.etat), ['encours', 'encours', 'encours', 'encours']);
  assert.equal(vue.prets, 0);
});

test('un coffre verse exactement ce que sa quête versait — l’économie ne bouge pas', () => {
  const vue = vueDesCoffres(etat());
  assert.equal(vue.slots[0].credits, 60, 'la ménagerie (facile)');
  assert.equal(vue.slots[1].credits, 70, 'deux duels (moyenne)');
  assert.equal(vue.slots[2].credits, 100, 'trois duels (difficile)');
  assert.equal(vue.slots[3].credits, GAINS.cachetDuCycle);
  assert.equal(vue.semaine.credits, GAINS.cachetDeLaSemaine);
});

test('quête finie : le coffre est prêt ; quête réclamée : le coffre est ouvert', () => {
  const pret = vueDesCoffres(etat({ progres: { 'creatures-10': 10, 'duels-2': 0, 'duels-3': 0 } }));
  assert.equal(pret.slots[0].etat, 'pret');
  assert.equal(pret.slots[0].pourcent, 100);
  assert.equal(pret.prets, 1);
  assert.equal(legendeCoffre(pret.slots[0]), 'Ouvrir !');

  const ouvert = vueDesCoffres(etat({ reclamations: ['creatures-10'] }));
  assert.equal(ouvert.slots[0].etat, 'ouvert');
  assert.equal(legendeCoffre(ouvert.slots[0]), 'Ouvert ✓');
});

test('le Coffre du cycle attend les trois quêtes, et lui seul ajoute un paquet', () => {
  const enCours = vueDesCoffres(etat({ reclamations: ['creatures-10'] }));
  assert.equal(enCours.slots[3].etat, 'encours');
  assert.equal(enCours.slots[3].progres, 1);
  assert.equal(enCours.slots[3].objectif, 3);

  const complet = vueDesCoffres(etat({ reclamations: TROIS }));
  assert.equal(complet.slots[3].etat, 'pret');
  assert.equal(complet.slots[3].paquets, 1, 'le Coffre du cycle offre un paquet de cartes');
  assert.equal(complet.prets, 1);

  const pris = vueDesCoffres(etat({ reclamations: TROIS, cachet: true }));
  assert.equal(pris.slots[3].etat, 'ouvert');
  assert.equal(pris.slots[3].pourcent, 100);
});

test('seuls les coffres du cycle et de la semaine donnent des cartes', () => {
  assert.equal(paquetsDuCoffre('bronze'), 0);
  assert.equal(paquetsDuCoffre('argent'), 0);
  assert.equal(paquetsDuCoffre('or'), 0);
  assert.equal(paquetsDuCoffre('royal'), 1);
  assert.equal(paquetsDuCoffre('legende'), 2);
  assert.equal(paquetsDuCoffre('inconnu'), 0);
  assert.equal(GENRES_COFFRES.royal.nom, 'Coffre du cycle');
});

test('le Coffre de la semaine suit la série de sept jours', () => {
  const milieu = vueDesCoffres(etat({ serie: 3 }));
  assert.equal(milieu.semaine.etat, 'encours');
  assert.equal(milieu.semaine.progres, 3);
  assert.equal(milieu.semaine.objectif, JOURS_DE_LA_SERIE);

  const pleine = vueDesCoffres(etat({ serie: JOURS_DE_LA_SERIE }));
  assert.equal(pleine.semaine.etat, 'pret');
  assert.equal(pleine.semaine.paquets, 2, 'la semaine offre deux paquets');

  const prise = vueDesCoffres(etat({ serie: JOURS_DE_LA_SERIE, semaine: true }));
  assert.equal(prise.semaine.etat, 'ouvert');
});

test('un joueur sans quêtes voit encore le Coffre du cycle et celui de la semaine', () => {
  const vide = vueDesCoffres({ quetes: [] });
  assert.equal(vide.slots.length, 1);
  assert.equal(vide.slots[0].cle, 'cycle');
  assert.equal(vide.slots[0].etat, 'encours');
  assert.ok(vide.semaine);
  assert.equal(vueDesCoffres(null).prets, 0, 'un état absent ne casse pas l’écran');
});

test('coffreDeLaQuete retrouve le coffre d’une quête, et rend null pour une inconnue', () => {
  const coffre = coffreDeLaQuete(etat(), 'duels-2');
  assert.equal(coffre.genre, 'argent');
  assert.equal(coffre.queteId, 'duels-2');
  assert.equal(coffreDeLaQuete(etat(), 'quete-inexistante'), null);
});
