import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { sacrificesInvocation } from '../src/games/rpgInvocation.js';
import { cardById } from '../src/games/rpgCards.js';
import { mobaEmplacementsLibres, mobaInfliger, mobaPlacer, mobaVoie, mobaVoieJouable } from '../src/games/rpgMoba.js';
import { rpgMobaNouveauDuel, rpgMobaChoisirVoieCentrale, rpgMobaPlacementCoherent, rpgMobaJouerCreature, rpgMobaPasserCreature, rpgMobaLancerMagie } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirCreatureIA } from '../src/games/rpgMobaAI.js';

function partie() {
  const deck = Array(20).fill('ashigaru-des-braises');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(duel, 'joueur', []).ok);
  assert.ok(rpgMulligan(duel, 'sorcier', []).ok);
  assert.ok(rpgDemarrerManaEssai(duel).ok);
  duel.joueur.mana.braise = 30;
  duel.sorcier.mana.braise = 30;
  return duel;
}

function donner(duel, side, id) { duel[side].main.push(id); }

test('le centre conquis reste physiquement disponible pour le vainqueur après rattachement seulement', () => {
  const duel = partie();
  mobaInfliger(duel.moba, 'joueur', 'center', 10);
  assert.equal(mobaVoieJouable(duel.moba, 'joueur', 'center'), false);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'center', 0).raison, 'voie-inactive');
  assert.equal(rpgMobaChoisirVoieCentrale(duel, 'joueur', 'right').ok, true);
  assert.deepEqual(mobaEmplacementsLibres(duel.moba, 'joueur', 'center'), [0]);
  assert.deepEqual(mobaEmplacementsLibres(duel.moba, 'sorcier', 'center'), []);
  assert.equal(mobaPlacer(duel.moba, 'sorcier', 'center', 0, 'intrus').raison, 'voie-inactive');
  const result = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'center', 0);
  assert.equal(result.ok, true);
  assert.equal(result.entite.mobaLane, 'right');
  assert.equal(result.entite.emplacement, 2);
  assert.equal(mobaVoie(duel.moba, 'center').slots.joueur[0], result.entite.id);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  rpgFinDeTour(duel);
  assert.equal(rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'center', 0).raison, 'voie-inactive');
});

test('le sacrifice MOBA exige des victimes distinctes, retire les cases et conserve les réponses à une annonce', () => {
  assert.equal(sacrificesInvocation(cardById('anqa-des-braises'), { moba: {} }), 1);
  assert.equal(sacrificesInvocation(cardById('jormungandr'), { moba: {} }), 2);
  const duel = partie();
  const first = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const second = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  donner(duel, 'joueur', 'anqa-des-braises');
  let before = JSON.stringify(duel);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'anqa-des-braises', 'left', 1).raison, 'sacrifice-requis');
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'anqa-des-braises', 'left', 1, { sacrificeIds: [first.id, first.id] }).raison, 'sacrifice');
  assert.equal(JSON.stringify(duel), before);
  const announce = rpgMobaJouerCreature(duel, 'joueur', 'anqa-des-braises', 'left', 0, { ouvrirReponse: true, sacrificeIds: [first.id] });
  assert.equal(announce.creatureEnAttente, true);
  assert.equal(mobaVoie(duel.moba, 'left').slots.joueur[0], first.id, 'no sacrifice before the response');
  assert.deepEqual(duel.mobaCreatureEnAttente.sacrificeIds, [first.id]);
  const resolved = rpgMobaPasserCreature(duel, 'sorcier');
  assert.equal(resolved.ok, true);
  assert.deepEqual(resolved.sacrificeIds, [first.id]);
  assert.equal(mobaVoie(duel.moba, 'left').slots.joueur[0], resolved.entite.id);
  assert.ok(duel.joueur.cimetiere.includes('ashigaru-des-braises'));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  // La limite est remise à zéro au changement de tour.
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  // A seven-plus-cost card requires two different creatures, not a free summon.
  donner(duel, 'joueur', 'jormungandr');
  before = JSON.stringify(duel);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'jormungandr', 'right', 0, { sacrificeIds: [second.id] }).raison, 'sacrifice');
  assert.equal(JSON.stringify(duel), before);
  donner(duel, 'joueur', 'orochi');
  const two = rpgMobaJouerCreature(duel, 'joueur', 'orochi', 'right', 0, { sacrificeIds: [second.id, resolved.entite.id] });
  assert.equal(two.ok, true);
  assert.deepEqual(two.sacrificeIds, [second.id, resolved.entite.id]);
  assert.equal(mobaVoie(duel.moba, 'right').slots.joueur[0], two.entite.id);
  assert.equal(mobaVoie(duel.moba, 'left').slots.joueur[0], null);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('un contresort interrompt l’invocation avant de sacrifier la victime', () => {
  const duel = partie();
  const victim = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  donner(duel, 'joueur', 'anqa-des-braises');
  donner(duel, 'sorcier', 'ecueil'); duel.sorcier.mana.eau = 30;
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'anqa-des-braises', 'left', 0, { ouvrirReponse: true, sacrificeIds: [victim.id] }).creatureEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'ecueil').contre, true);
  assert.equal(duel.mobaCreatureEnAttente, null);
  assert.equal(mobaVoie(duel.moba, 'left').slots.joueur[0], victim.id);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('l’IA sait payer le sacrifice et rejouer dans la case libérée', () => {
  const duel = partie();
  rpgFinDeTour(duel);
  duel.sorcier.mana.braise = 30;
  const victim = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  donner(duel, 'sorcier', 'anqa-des-braises');
  const choice = rpgMobaChoisirCreatureIA(duel, 'sorcier');
  assert.equal(choice.id, 'anqa-des-braises');
  assert.deepEqual(choice.sacrificeIds, [victim.id]);
  const played = rpgMobaJouerCreature(duel, 'sorcier', choice.id, choice.lane, choice.slot, { sacrificeIds: choice.sacrificeIds });
  assert.equal(played.ok, true);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('une Réanimation peut viser la case centrale du vainqueur et rejoindre son flanc', () => {
  const duel = partie();
  const victim = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  donner(duel, 'joueur', 'anqa-des-braises');
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'anqa-des-braises', 'left', 0, { sacrificeIds: [victim.id] }).ok, true);
  mobaInfliger(duel.moba, 'joueur', 'center', 10);
  assert.equal(rpgMobaChoisirVoieCentrale(duel, 'joueur', 'right').ok, true);
  donner(duel, 'joueur', 'reanimation');
  duel.joueur.mana.sable = 30;
  const result = rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, 'center', null, { emplacementReanimation: 0 });
  assert.equal(result.ok, true, JSON.stringify(result));
  const id = mobaVoie(duel.moba, 'center').slots.joueur[0];
  assert.equal(duel.joueur.creatures.find((e) => e.id === id).mobaLane, 'right');
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});
