/**
 * Règle du Défenseur : **il se déplace, mais seulement dans les cases de son
 * joueur** — les dix cases de son camp (front et fond, avant, arrière, côtés).
 * Il ne franchit jamais la ligne médiane : c'est là qu'il tient, et il ne va
 * pas ouvrir une trouée chez l'adversaire.
 *
 * La règle vaut pour le Défenseur imprimé comme pour celui qu'une capacité
 * accorde en cours de partie, et des deux côtés de la table.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature } from '../src/games/rpgDuel.js';
import { deplacementsLegaux, rpgPeutBouger, rpgDeplacerCreature } from '../src/games/rpgMouvement.js';
import { rpgIABougerUneCreature } from '../src/games/rpgMouvementIA.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { estDefenseur } from '../src/games/rpgDefenseur.js';

const DEFENSEUR = 'gardien-de-la-porte-ardente';
const MELEE = 'viking-des-neiges';

function table() {
  const d = rpgNouveauDuel({
    joueurDeck: [], sorcierDeck: [], modeMana: RPG_MODE_MANA_ESSAI,
    joueurCouleurs: ['braise'], sorcierCouleurs: ['neige'], rng: () => 0.9, lignes: true,
  });
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  d.pvp = true;
  d.tour = 'joueur';
  const poser = (camp, id) => {
    d[camp].invocationNormaleJouee = false;
    d[camp].main.push(id);
    const avant = d.tour;
    d.tour = camp;
    const resultat = rpgJouerCreature(d, camp, id);
    d.tour = avant;
    assert.ok(resultat.ok, `${id} doit entrer en jeu : ${resultat.raison}`);
    return resultat.entite;
  };
  // Tour suivant simulé : le mal d'invocation est levé, seule la règle
  // Défenseur borne encore le pas.
  const reveiller = (entite) => { entite.malInvocation = false; entite.bouge = false; };
  return { d, poser, reveiller };
}

test('un Défenseur marche dans les cases de son camp', () => {
  const { d, poser, reveiller } = table();
  const defenseur = poser('joueur', DEFENSEUR);
  reveiller(defenseur);
  assert.equal(estDefenseur(defenseur), true);
  assert.equal(rpgPeutBouger(d, 'joueur', defenseur), true, 'il n’est plus cloué sur sa case');
  const cases = deplacementsLegaux(d, 'joueur', defenseur.id);
  assert.ok(cases.length > 0, 'des cases de son camp lui sont proposées');
  assert.ok(cases.every((c) => c.camp === 'joueur'), 'toutes chez son joueur');
  assert.ok(cases.some((c) => c.index < 5), 'il peut monter au front');
});

test('il ne franchit jamais la ligne médiane, même au contact', () => {
  const { d, poser, reveiller } = table();
  const defenseur = poser('joueur', DEFENSEUR);
  reveiller(defenseur);
  // Au front de son camp, la trouée est grande ouverte devant lui : la case du
  // sorcier juste en face est libre.
  defenseur.emplacement = 1;
  defenseur.avancee = true;
  const cases = deplacementsLegaux(d, 'joueur', defenseur.id);
  assert.ok(cases.length > 0, 'il peut encore bouger');
  assert.ok(cases.every((c) => c.camp === 'joueur'), 'aucune case du camp adverse');
  const resultat = rpgDeplacerCreature(d, 'joueur', defenseur.id, { camp: 'sorcier', index: 1 });
  assert.equal(resultat.ok, false);
  assert.equal(resultat.raison, 'case');
  assert.equal(defenseur.campPose, undefined, 'il n’a pas passé la ligne');
  assert.equal(defenseur.emplacement, 1, 'il n’a pas bougé');
});

test('il monte au front de son camp sans quitter son joueur', () => {
  const { d, poser, reveiller } = table();
  const defenseur = poser('joueur', DEFENSEUR);
  reveiller(defenseur);
  const front = deplacementsLegaux(d, 'joueur', defenseur.id).find((c) => c.camp === 'joueur' && c.index < 5);
  assert.ok(front, 'une case de front est disponible');
  const resultat = rpgDeplacerCreature(d, 'joueur', defenseur.id, front);
  assert.ok(resultat.ok, `la montée doit passer : ${resultat.raison}`);
  assert.equal(defenseur.emplacement, front.index);
  assert.equal(defenseur.bouge, true, 'une seule case par tour');
});

test('le Défenseur du sorcier reste chez le sorcier', () => {
  const { d, poser, reveiller } = table();
  const defenseur = poser('sorcier', DEFENSEUR);
  reveiller(defenseur);
  const cases = deplacementsLegaux(d, 'sorcier', defenseur.id);
  assert.ok(cases.length > 0);
  assert.ok(cases.every((c) => c.camp === 'sorcier'), 'jamais une case du joueur');
  for (let pas = rpgIABougerUneCreature(d, 'sorcier'); pas; pas = rpgIABougerUneCreature(d, 'sorcier')) {
    assert.equal(pas.destination.camp, 'sorcier', 'l’IA ne le fait pas traverser');
  }
});

test('un Défenseur accordé en cours de partie suit la même règle', () => {
  const { d, poser, reveiller } = table();
  const simple = poser('joueur', MELEE);
  reveiller(simple);
  simple.emplacement = 1;      // au contact, face à la trouée
  simple.avancee = true;
  assert.ok(deplacementsLegaux(d, 'joueur', simple.id).some((c) => c.camp === 'sorcier'),
    'libre, elle pouvait passer la ligne');
  simple.defenseurAccorde = true;
  assert.equal(estDefenseur(simple), true);
  const cases = deplacementsLegaux(d, 'joueur', simple.id);
  assert.ok(cases.length > 0, 'elle marche encore');
  assert.ok(cases.every((c) => c.camp === 'joueur'), 'mais plus chez l’adversaire');
});

test('le tour de son arrivée, il ne bouge pas du tout', () => {
  const { d, poser } = table();
  const defenseur = poser('joueur', DEFENSEUR);
  assert.equal(defenseur.malInvocation, true);
  assert.equal(rpgPeutBouger(d, 'joueur', defenseur), false);
  assert.deepEqual(deplacementsLegaux(d, 'joueur', defenseur.id), []);
});
