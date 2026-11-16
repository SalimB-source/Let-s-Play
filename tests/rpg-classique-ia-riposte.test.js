import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgBlesserCreature, rpgFinDeTour, rpgJouerArme, rpgJouerCreature, rpgLancerMagie, rpgNouveauDuel, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { rpgChoisirAttaqueIndividuelleClassiqueIA, rpgDeclarerAttaqueIndividuelleClassique, rpgResoudreAttaqueIndividuelleClassique } from '../src/games/rpgCombatIndividuelClassique.js';

function partie() {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  duel.joueur.main = ['gardien-de-la-porte-ardente'];
  const gardien = rpgJouerCreature(duel, 'joueur', 'gardien-de-la-porte-ardente').entite;
  assert.ok(gardien);
  rpgFinDeTour(duel);
  duel.sorcier.main = ['tislit-des-aures'];
  const tislit = rpgJouerCreature(duel, 'sorcier', 'tislit-des-aures').entite;
  assert.ok(tislit);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  return { duel, gardien, tislit };
}

test('classique : la riposte du Gardien intervient sans le bonus de Provocation supprimé', () => {
  const { duel, gardien, tislit } = partie();
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const avant = JSON.stringify(duel);
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), { attaquantId: tislit.id, cibleId: gardien.id });
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', tislit.id, gardien.id).ok);
  assert.equal(gardien.pv, 4);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(!duel.sorcier.creatures.includes(tislit));
  assert.equal(gardien.pv, 3);
  rpgFinDeTour(duel);
  assert.equal(gardien.pv, 3);
});

for (const jet of [.5, .01]) test(`classique : tenter l'échange demandé contre le Gardien blessé (jet ${jet})`, () => {
  const { duel, gardien, tislit } = partie();
  assert.ok(rpgBlesserCreature(duel, 'joueur', gardien.id, 3).ok);
  duel.sorcier.main = ['lance-de-givre'];
  assert.ok(rpgJouerArme(duel, 'sorcier', 'lance-de-givre', tislit.id).ok);
  assert.deepEqual([tislit.atk, tislit.pv, gardien.pv], [2, 1, 1]);
  rpgReglerHasard(duel, () => jet);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: tislit.id, cibleId: gardien.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(!duel.sorcier.creatures.includes(tislit));
  assert.equal(duel.joueur.creatures.includes(gardien), jet === .01);
});

test('classique : un bouclier permet à Tislit de survivre à la riposte', () => {
  const { duel, gardien, tislit } = partie();
  duel.sorcier.main = ['voile-de-la-lune-noire'];
  assert.ok(rpgLancerMagie(duel, 'sorcier', 'voile-de-la-lune-noire', tislit.id).ok);
  assert.equal(tislit.bouclier, 1);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: tislit.id, cibleId: gardien.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.ok(duel.sorcier.creatures.includes(tislit));
  assert.equal(tislit.bouclier, 0);
});

test('classique : Tislit renforcée tente aussi l’échange sans équipement', () => {
  const { duel, gardien, tislit } = partie();
  assert.ok(rpgBlesserCreature(duel, 'joueur', gardien.id, 3).ok);
  // Un bonus d'attaque sans arme ; l'algorithme doit vérifier la riposte.
  tislit.atk = 2;
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: tislit.id, cibleId: gardien.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel.joueur.creatures.includes(gardien), false);
  assert.equal(duel.sorcier.creatures.includes(tislit), false);
});

test('classique : une attaque imposée reste déclarable contre le Gardien', () => {
  const { duel, gardien, tislit } = partie();
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel, 'sorcier', tislit.id),
    { attaquantId: tislit.id, cibleId: gardien.id });
});

function partieContreAttaque() {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  duel.joueur.main = ['pourfendeur-des-djinns'];
  const defenseur = rpgJouerCreature(duel, 'joueur', 'pourfendeur-des-djinns').entite;
  assert.ok(defenseur);
  rpgFinDeTour(duel);
  duel.sorcier.main = ['tislit-des-aures'];
  const tislit = rpgJouerCreature(duel, 'sorcier', 'tislit-des-aures').entite;
  assert.ok(tislit);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  return { duel, defenseur, tislit };
}

test('classique : Tislit ne se sacrifie pas pour blesser un Pourfendeur intact', () => {
  const { duel, defenseur, tislit } = partieContreAttaque();
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
  const avant = JSON.stringify(duel);
  assert.equal(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), null);
  assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', tislit.id, defenseur.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(defenseur.pv, 3);
  assert.ok(!duel.sorcier.creatures.includes(tislit));
});

test('classique : une attaque ratée ne déclenche pas la Contre-attaque du Pourfendeur', () => {
  const { duel, defenseur, tislit } = partieContreAttaque();
  rpgReglerHasard(duel, () => .01);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', tislit.id, defenseur.id).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(defenseur.pv, 4);
  assert.ok(duel.sorcier.creatures.includes(tislit));
});

test('classique : Tislit tente de détruire un Pourfendeur blessé malgré sa Contre-attaque', () => {
  const { duel, defenseur, tislit } = partieContreAttaque();
  assert.ok(rpgBlesserCreature(duel, 'joueur', defenseur.id, 3).ok);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: tislit.id, cibleId: defenseur.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(duel.joueur.creatures.includes(defenseur), false);
  assert.equal(duel.sorcier.creatures.includes(tislit), false);
});

test('classique : le bouclier protège Tislit de la Contre-attaque du Pourfendeur', () => {
  const { duel, defenseur, tislit } = partieContreAttaque();
  duel.sorcier.main = ['voile-de-la-lune-noire'];
  assert.ok(rpgLancerMagie(duel, 'sorcier', 'voile-de-la-lune-noire', tislit.id).ok);
  const choix = rpgChoisirAttaqueIndividuelleClassiqueIA(duel);
  assert.deepEqual(choix, { attaquantId: tislit.id, cibleId: defenseur.id });
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', choix.attaquantId, choix.cibleId).ok);
  assert.ok(rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier').ok);
  assert.equal(defenseur.pv, 3);
  assert.ok(duel.sorcier.creatures.includes(tislit)); assert.equal(tislit.bouclier, 0);
});

test('classique : une attaque imposée reste déclarable contre un Pourfendeur intact', () => {
  const { duel, defenseur, tislit } = partieContreAttaque();
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel, 'sorcier', tislit.id),
    { attaquantId: tislit.id, cibleId: defenseur.id });
});

test('classique : une seconde alliée préserve le choix tactique existant', () => {
  const { duel, defenseur, tislit } = partieContreAttaque();
  duel.sorcier.main = ['ashigaru-des-braises'];
  const autre = rpgJouerCreature(duel, 'sorcier', 'ashigaru-des-braises').entite;
  assert.ok(autre && autre.malInvocation);
  // Le cas validé ne tranche pas le choix avec une autre créature en jeu.
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel),
    { attaquantId: tislit.id, cibleId: defenseur.id });
});

test('classique : Tislit peut tenter de terminer un Pourfendeur à 2 PV grâce à son critique', () => {
  const { duel, defenseur, tislit } = partieContreAttaque();
  assert.ok(rpgBlesserCreature(duel, 'joueur', defenseur.id, 2).ok);
  assert.deepEqual(tislit.coupCritique, { chance: .15, fois: 2 });
  assert.deepEqual(rpgChoisirAttaqueIndividuelleClassiqueIA(duel), { attaquantId: tislit.id, cibleId: defenseur.id });
  const tirages = [.5, .01]; rpgReglerHasard(duel, () => tirages.shift() ?? .5);
  assert.ok(rpgDeclarerAttaqueIndividuelleClassique(duel, 'sorcier', tislit.id, defenseur.id).ok);
  const result = rpgResoudreAttaqueIndividuelleClassique(duel, 'sorcier');
  assert.ok(result.ok); assert.equal(result.resume.critiques[0].fois, 2);
  assert.equal(duel.joueur.creatures.includes(defenseur), false);
});
