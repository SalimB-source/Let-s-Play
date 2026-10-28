/**
 * Le souffle d'une arrivée part avec son effet, pas avec la carte.
 *
 * La plainte d'origine : la **Tour de Braise** jouait sa flamme au moment où
 * on la posait, alors que ses 1 dégât n'existent pas encore — le joueur doit
 * désigner la créature qui les prend, et peut encore renoncer. Le feu
 * promettait donc une blessure sans victime.
 *
 * `rpgArriveeAudio.js` sépare les deux temps : `sonArriveeAuPose` se tait
 * quand une cible reste à désigner, `sonArriveeALaDesignation` joue le souffle
 * au clic qui referme l'attente. Ces tests figent la règle carte par carte.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { arriveeCiblePortee } from '../src/games/rpgDuel.js';
import {
  sonArriveeALaDesignation,
  sonArriveeAuPose,
  sonArriveeElement,
} from '../src/games/rpgArriveeAudio.js';

test('la Tour de Braise ne brûle pas à la pose', () => {
  const tour = cardById('tour-de-braise');
  assert.equal(arriveeCiblePortee(tour), 'ennemi', 'ses 1 dégât désignent une créature');
  // Le geste qui pose la carte : la cible reste à choisir, donc silence.
  assert.equal(sonArriveeAuPose(tour, { arriveeEnAttente: true }), null,
    'aucune flamme avant que la victime soit désignée');
  // Le clic qui désigne la créature : c'est là que le feu prend.
  assert.equal(sonArriveeALaDesignation(tour), 'flame_gust',
    'le souffle part avec le dégât, sur la cible choisie');
});

test('le Maître du marteau garde son tonnerre pour la cible désignée', () => {
  const maitre = cardById('maitre-du-marteau');
  assert.equal(arriveeCiblePortee(maitre), 'ennemi');
  assert.equal(sonArriveeAuPose(maitre, { arriveeEnAttente: true }), null);
  assert.equal(sonArriveeALaDesignation(maitre), 'foudre_marteau');
  // Le visage adverse comme une créature : même souffle, même moment.
  assert.equal(sonArriveeALaDesignation(maitre), sonArriveeElement(maitre));
});

test('les autres arrivées qui blessent suivent la même règle', () => {
  for (const id of ['oni-de-la-fournaise', 'lionne-du-midi-ardent']) {
    const carte = cardById(id);
    assert.equal(arriveeCiblePortee(carte), 'ennemi', `${id} désigne sa cible`);
    assert.equal(sonArriveeAuPose(carte, { arriveeEnAttente: true }), null, `${id} : silence à la pose`);
    assert.equal(sonArriveeALaDesignation(carte), 'flame_gust', `${id} : la flamme au clic`);
  }
});

test('une arrivée qui se résout seule garde son son à la pose', () => {
  // Sans attente, le souffle est bien celui de la pose : la règle ne mute pas
  // les arrivées qui n'ont personne à désigner.
  const tour = cardById('tour-de-braise');
  assert.equal(sonArriveeAuPose(tour), 'flame_gust');
  assert.equal(sonArriveeAuPose(tour, { arriveeEnAttente: false }), 'flame_gust');
  // Les cartes sans souffle restent muettes, avant comme après.
  for (const id of ['kraken', 'susanoo', 'vipere-de-verre']) {
    assert.equal(sonArriveeElement(cardById(id)), null, `${id} n'a pas de souffle`);
    assert.equal(sonArriveeAuPose(cardById(id)), null);
  }
});

test('la désignation garde ses sons propres : renvoi en main, ou simple clic', () => {
  // Un renvoi en main d'arrivée garde son froissement de carte.
  const sonneur = cardById('sonneur-fele');
  assert.equal(sonneur?.arrivee?.type, 'retour-main');
  assert.equal(sonArriveeALaDesignation(sonneur), 'creature_return');
  // Une arrivée sans souffle ni renvoi (le gel de la Tour de neige) reste un
  // clic de sélection : la table confirme le choix, rien ne brûle.
  assert.equal(sonArriveeALaDesignation(cardById('tour-de-neige')), 'select');
});
