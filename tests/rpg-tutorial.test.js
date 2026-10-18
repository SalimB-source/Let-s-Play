import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RPG_PV_SORCIER_BASE,
  rpgDemarrerManaEssai,
  rpgFinDeTour,
  rpgJouerCreature,
  rpgLancerAttaque,
  rpgNouveauDuel,
  rpgPeutMulligan,
  rpgPoserTerrain,
} from '../src/games/rpgDuel.js';
import { RPG_DECK_JOUEUR_BASE, cardById } from '../src/games/rpgCards.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { RPG_CARD_LESSONS } from '../src/games/rpgCardLessons.js';
import {
  preparerDuelTutoriel,
  RPG_TUTORIAL_OPPONENT_HAND,
  RPG_TUTORIAL_OPENING_HAND,
  RPG_TUTORIAL_OPPONENT_DECK,
  RPG_TUTORIAL_STEPS,
} from '../src/games/rpgTutorial.js';

function nouveauDuelTutoriel() {
  const duel = rpgNouveauDuel({
    joueurDeck: RPG_DECK_JOUEUR_BASE,
    sorcierDeck: RPG_TUTORIAL_OPPONENT_DECK,
    sorcierPuissance: 0,
    modeMana: RPG_MODE_MANA_ESSAI,
    rng: () => 0.37,
  });
  preparerDuelTutoriel(duel);
  assert.equal(rpgDemarrerManaEssai(duel).ok, true);
  return duel;
}

test('le tutoriel prépare une main stable sans réduire les decks ni ouvrir le mulligan', () => {
  const duel = nouveauDuelTutoriel();

  assert.deepEqual(duel.joueur.main, RPG_TUTORIAL_OPENING_HAND);
  assert.equal(duel.joueur.deck.length, 27);
  assert.equal(duel.sorcier.main.length, 3);
  assert.deepEqual(duel.sorcier.main, RPG_TUTORIAL_OPPONENT_HAND);
  assert.equal(duel.sorcier.deck.length, 27);
  assert.equal(duel.sorcier.pv, RPG_PV_SORCIER_BASE);
  assert.equal(rpgPeutMulligan(duel, 'joueur'), false);
  assert.equal(rpgPeutMulligan(duel, 'sorcier'), false);
});

test('la partie guidée joue un tour complet : mana automatique, créature puis attaque', () => {
  const duel = nouveauDuelTutoriel();

  assert.deepEqual(duel.joueur.terrains, []);
  assert.equal(rpgPoserTerrain(duel, 'joueur', 'desert').ok, false);
  assert.equal(duel.joueur.mana.sable, 1);

  const pose = rpgJouerCreature(duel, 'joueur', 'tislit-des-aures');
  assert.equal(pose.ok, true);
  assert.equal(pose.entite.ready, false, 'Tislit ne peut pas attaquer le tour où elle arrive');
  assert.equal(duel.joueur.mana.sable, 0, 'le mana produit paie son coût');

  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier');
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'joueur');
  assert.equal(pose.entite.ready, true, 'la créature devient prête au début du tour suivant');
  assert.equal(duel.joueur.mana.sable, 2, 'le mana se recharge et augmente au tour suivant');

  const pvAvant = duel.sorcier.pv;
  const attaque = rpgLancerAttaque(duel, 'joueur', [pose.entite.id]);
  assert.equal(attaque.ok, true);
  assert.equal(attaque.resume.frappeSorcier, pose.entite.atk);
  assert.equal(duel.sorcier.pv, pvAvant - pose.entite.atk);
});

test('le parcours explique les règles et pointe vers les zones réellement jouées', () => {
  const ids = RPG_TUTORIAL_STEPS.map((step) => step.id);
  assert.deepEqual(ids, [
    'bienvenue', 'main', 'mana', 'creature', 'invocation', 'fin-tour',
    'tour-adverse', 'attaque', 'confirmer-attaque', 'combat', 'magies', 'termine',
  ]);
  assert.ok(RPG_TUTORIAL_STEPS.every((step) => step.target?.startsWith('[data-tutorial-target=')));
  assert.ok(RPG_TUTORIAL_STEPS.some((step) => /mal d’invocation/u.test(`${step.title} ${step.text}`)));
  assert.ok(RPG_TUTORIAL_STEPS.some((step) => /bloqueur/u.test(step.text)));
  assert.ok(RPG_TUTORIAL_STEPS.some((step) => /rituel/u.test(step.text) && /éphémère/u.test(step.text)));
});

test('le guide avancé couvre les familles de cartes et référence des exemples du catalogue', () => {
  assert.ok(RPG_CARD_LESSONS.length >= 18, 'le guide couvre un éventail de notions au-delà du tour débutant');
  assert.deepEqual([...new Set(RPG_CARD_LESSONS.map((lesson) => lesson.section))], [
    'Types de cartes', 'Magies', 'Capacités des créatures',
  ]);
  assert.ok(RPG_CARD_LESSONS.every((lesson) => lesson.cardIds.length > 0
    && lesson.cardIds.every((cardId) => cardById(cardId))), 'chaque fiche s’appuie sur une carte existante');
  for (const id of [
    'familles-de-cartes', 'terrain-hybride', 'rituel-ephemere', 'cible-ou-zone',
    'contresorts', 'arrivee-en-jeu', 'creatures-jetons', 'capacite-de-destruction', 'rapidite-et-esquive',
    'envol', 'protection', 'capacite-de-boualem', 'furie', 'auras-et-resonance',
    'coup-rapide', 'capacite-de-combat',
  ]) {
    assert.ok(RPG_CARD_LESSONS.some((lesson) => lesson.id === id), `la fiche « ${id} » est présente`);
  }
});
