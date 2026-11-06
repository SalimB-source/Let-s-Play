import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaPlacementCoherent, rpgMobaJouerCreature, rpgMobaLancerAttaque, rpgMobaLancerMagie, rpgMobaMulligan, rpgMobaTerminerTour, rpgMobaDefausser, MOBA_DECK_ESSAI } from '../src/games/rpgMobaLocal.js';
import { validerDeckManaEssai } from '../src/games/rpgManaEssai.js';
import { mobaInfliger, mobaVoie } from '../src/games/rpgMoba.js';

function partie() {
  const deck = Array(12).fill('chien-du-guet');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => 0.5 });
  assert.equal(rpgMulligan(duel, 'joueur', []).ok, true);
  assert.equal(rpgMulligan(duel, 'sorcier', []).ok, true);
  assert.equal(rpgDemarrerManaEssai(duel).ok, true);
  return duel;
}

test('the real duel engine pays mana and places the creature in the selected lane', () => {
  const duel = partie();
  duel.joueur.mana.sable = 5;
  const before = duel.joueur.main.length;
  const result = rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'right', 1);
  assert.equal(result.ok, true);
  assert.equal(result.entite.emplacement, 4);
  assert.equal(result.entite.carteId, 'chien-du-guet');
  assert.equal(duel.joueur.mana.sable, 3);
  assert.equal(duel.joueur.main.length, before - 1);
  assert.equal(mobaVoie(duel.moba, 'right').slots.joueur[1], result.entite.id);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('lane capacity, occupied slots and resources reject summons without state changes', () => {
  const duel = partie();
  duel.joueur.mana.sable = 6;
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'left', 0).ok, true);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'left', 1).ok, true);
  let before = JSON.stringify(duel);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'left', 2).raison, 'emplacement');
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'left', 0).raison, 'emplacement');
  assert.equal(JSON.stringify(duel), before);
  duel.joueur.mana.sable = 0;
  before = JSON.stringify(duel);
  const camp = duel.joueur;
  const firstCreature = camp.creatures[0];
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'center', 0).raison, 'mana');
  assert.equal(JSON.stringify(duel), before);
  assert.equal(duel.joueur, camp);
  assert.equal(duel.joueur.creatures[0], firstCreature);
});

test('local turn changes give the second seat control of its own slots', () => {
  const duel = partie();
  duel.joueur.mana.sable = 3;
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'center', 0).ok, true);
  assert.equal(rpgMobaJouerCreature(duel, 'sorcier', 'chien-du-guet', 'center', 0).raison, 'pas-votre-tour');
  rpgFinDeTour(duel);
  duel.sorcier.mana.sable = 3;
  assert.equal(duel.tour, 'sorcier');
  assert.equal(rpgMobaJouerCreature(duel, 'sorcier', 'chien-du-guet', 'center', 0).ok, true);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  assert.ok(mobaVoie(duel.moba, 'center').slots.sorcier[0]);
});

test('inactive lanes, finished games and unsupported arrival effects are gated', () => {
  const duel = partie();
  duel.joueur.main.push('yamina');
  duel.joueur.mana.sable = 8;
  let before = JSON.stringify(duel);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'yamina', 'left', 0).raison, 'effet-non-pris-en-charge');
  assert.equal(JSON.stringify(duel), before);
  mobaInfliger(duel.moba, 'joueur', 'center', 10);
  before = JSON.stringify(duel);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'center', 0).raison, 'voie-inactive');
  assert.equal(JSON.stringify(duel), before);
  mobaInfliger(duel.moba, 'joueur', 'right', 10);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'left', 0).raison, 'partie-terminee');
});

test('out-of-band battlefield changes fail closed rather than moving cards', () => {
  const duel = partie();
  duel.joueur.mana.sable = 3;
  const { entite } = rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'left', 0);
  entite.emplacement = 2;
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaPlacementCoherent(duel), false);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'right', 0).raison, 'etat-incoherent');
  assert.equal(JSON.stringify(duel), before);
});

test('a draw-on-arrival creature uses the real effect and stays in its chosen lane', () => {
  const duel = partie();
  duel.joueur.main.push('sahir-des-braises');
  duel.joueur.mana.braise = 10;
  const handBefore = duel.joueur.main.length;
  const deckBefore = duel.joueur.deck.length;
  const result = rpgMobaJouerCreature(duel, 'joueur', 'sahir-des-braises', 'center', 0);
  assert.equal(result.ok, true);
  assert.equal(duel.joueur.deck.length, deckBefore - 1);
  assert.equal(duel.joueur.main.length, handBefore);
  assert.equal(mobaVoie(duel.moba, 'center').slots.joueur[0], result.entite.id);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

function partieCombat() {
  const deck = Array(12).fill('ashigaru-des-braises');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => 0.5 });
  rpgMulligan(duel, 'joueur', []);
  rpgMulligan(duel, 'sorcier', []);
  rpgDemarrerManaEssai(duel);
  duel.joueur.mana.braise = 10;
  return duel;
}

function poserCombattants(duel, adversaireVoie = null) {
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel);
  duel.sorcier.mana.braise = 10;
  const blocker = adversaireVoie && rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', adversaireVoie, 0).entite;
  rpgFinDeTour(duel);
  return { attacker, blocker };
}

test('real engine resolves an unblocked attack against the attacker’s lane using effective attack', () => {
  const duel = partieCombat();
  const { attacker } = poserCombattants(duel);
  attacker.atk = 4; // an existing attack modifier has already been applied
  const result = rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {});
  assert.equal(result.ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 6);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 10);
  assert.equal(duel.sorcier.pv, 25);
  assert.equal(result.damageEvents[0].damage, 4);
  assert.equal(duel.attaqueJouee, 'joueur');
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {}).ok, false);
});

test('real engine resolves a blocked attack, removing dead creatures without lane damage', () => {
  const duel = partieCombat();
  const { attacker, blocker } = poserCombattants(duel, 'left');
  const result = rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], { [attacker.id]: [blocker.id] });
  assert.equal(result.ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10);
  assert.deepEqual(result.damageEvents, []);
  assert.equal(duel.joueur.creatures.length, 0);
  assert.equal(duel.sorcier.creatures.length, 0);
  assert.deepEqual(mobaVoie(duel.moba, 'left').slots, { joueur: [null, null], sorcier: [null, null] });
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('real engine attack rejects an opposing blocker from another lane without mutation', () => {
  const duel = partieCombat();
  const { attacker, blocker } = poserCombattants(duel, 'center');
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], { [attacker.id]: [blocker.id] }).ok, false);
  assert.equal(JSON.stringify(duel), before);
});

test('real engine direct damage conquers, removes both sides, and triggers second-lane victory', () => {
  const duel = partieCombat();
  const { attacker, blocker } = poserCombattants(duel, 'left');
  mobaInfliger(duel.moba, 'joueur', 'center', 10);
  mobaInfliger(duel.moba, 'joueur', 'left', 9);
  const result = rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {});
  assert.equal(result.ok, true);
  assert.equal(result.damageEvents[0].winner, 'joueur');
  assert.equal(duel.moba.winner, 'joueur');
  assert.equal(duel.fin.gagnant, 'joueur');
  assert.equal(mobaVoie(duel.moba, 'left').active, false);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 0);
  assert.equal(duel.joueur.creatures.some((e) => e.id === attacker.id), false);
  assert.equal(duel.sorcier.creatures.some((e) => e.id === blocker.id), false);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).raison, 'partie-terminee');
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {}).raison, 'partie-terminee');
});

test('combat with unaudited abilities remains gated instead of falling back to classic damage', () => {
  const duel = partie();
  duel.joueur.mana.sable = 3;
  const { entite } = rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'left', 0);
  entite.ready = true;
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [entite.id], {}).raison, 'effet-non-pris-en-charge');
  assert.equal(JSON.stringify(duel), before);
});

test('several attackers resolve per lane and second conquest stops later hits immediately', () => {
  const duel = partieCombat();
  const left = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const center = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'center', 0).entite;
  const right = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  mobaInfliger(duel.moba, 'joueur', 'left', 9);
  mobaInfliger(duel.moba, 'joueur', 'center', 9);
  const res = rpgMobaLancerAttaque(duel, 'joueur', [left.id, center.id, right.id], {});
  assert.equal(res.ok, true);
  assert.deepEqual(res.damageEvents.map((event) => event.laneId), ['left', 'center']);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10);
  assert.equal(duel.moba.winner, 'joueur');
  assert.ok(duel.joueur.creatures.some((entity) => entity.id === right.id));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('non-winning conquest removes both sides and leaves other lanes playable', () => {
  const duel = partieCombat();
  const { attacker, blocker } = poserCombattants(duel, 'left');
  attacker.atk = 10;
  const result = rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {});
  assert.equal(result.ok, true);
  assert.equal(result.damageEvents[0].conquered, true);
  assert.equal(duel.moba.winner, null);
  assert.equal(duel.joueur.creatures.length, 0);
  assert.equal(duel.sorcier.creatures.some((entity) => entity.id === blocker.id), false);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  duel.joueur.mana.braise = 10;
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).raison, 'voie-inactive');
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).ok, true);
});

test('provocation cannot force a blocker from a different lane', () => {
  const duel = partieCombat();
  duel.joueur.main.push('berserk-des-trois-hivers');
  duel.joueur.mana.neige = 10;
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'berserk-des-trois-hivers', 'left', 0).entite;
  rpgFinDeTour(duel);
  duel.sorcier.mana.braise = 10;
  const otherLane = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'center', 0).entite;
  rpgFinDeTour(duel);
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], { [attacker.id]: [otherLane.id] }).ok, false);
  assert.equal(JSON.stringify(duel), before);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {}).ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 8);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 10);
});

test('provocation and overkill use original combat rules within the lane', () => {
  const duel = partieCombat();
  duel.joueur.main.push('jarl-au-marteau-de-guerre');
  duel.joueur.mana.neige = 10;
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'left', 0).entite;
  rpgFinDeTour(duel);
  duel.sorcier.main.push('mousse-des-galiotes');
  duel.sorcier.mana.sable = 10;
  const blocker = rpgMobaJouerCreature(duel, 'sorcier', 'mousse-des-galiotes', 'left', 0).entite;
  rpgFinDeTour(duel);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {}).raison, 'provocation');
  const result = rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], { [attacker.id]: [blocker.id] });
  assert.equal(result.ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 9);
  assert.equal(duel.sorcier.pv, 25);
  assert.equal(duel.sorcier.creatures.length, 0);
  assert.equal(attacker.pv, 4);
  assert.equal(attacker.atk, 5, 'Furie applies the original +2 attack after the injury');
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {}).ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 4, 'the next direct hit uses Furie-modified attack');
});

test('the experimental fixed deck respects the existing 30-card and copy rules', () => {
  assert.equal(MOBA_DECK_ESSAI.length, 30);
  assert.equal(validerDeckManaEssai({ cardIds: MOBA_DECK_ESSAI, elements: ['braise', 'sable', 'neige'] }).ok, true);
});

test('a real global spell affects creatures in multiple active lanes and reconciles deaths', () => {
  const duel = partieCombat();
  const left = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const right = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  duel.joueur.main.push('grand-hiver');
  duel.joueur.mana.neige = 10;
  const result = rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver');
  assert.equal(result.ok, true);
  assert.equal(duel.joueur.creatures.some((e) => e.id === left.id || e.id === right.id), false);
  assert.equal(mobaVoie(duel.moba, 'left').slots.joueur[0], null);
  assert.equal(mobaVoie(duel.moba, 'right').slots.joueur[0], null);
  assert.equal(mobaVoie(duel.moba, 'center').hp.joueur, 10);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('local engine can play through turns to conquer two lanes with printed stats', () => {
  const deck = Array(30).fill('jarl-au-marteau-de-guerre');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, joueurCouleurs: ['neige'], sorcierCouleurs: ['neige'], rng: () => 0.5 });
  rpgMulligan(duel, 'joueur', []); rpgMulligan(duel, 'sorcier', []); rpgDemarrerManaEssai(duel);
  duel.joueur.mana.neige = 10;
  const left = rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'left', 0).entite;
  const center = rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'center', 0).entite;
  assert.equal(left.atk, 3);
  for (let turn = 0; turn < 4; turn += 1) {
    rpgFinDeTour(duel); rpgFinDeTour(duel);
    const result = rpgMobaLancerAttaque(duel, 'joueur', [left.id, center.id], {});
    assert.equal(result.ok, true);
    if (turn < 3) assert.equal(duel.moba.winner, null);
  }
  assert.equal(duel.moba.winner, 'joueur');
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 0);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 0);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10);
});

test('each seat can choose a mulligan before the first turn, in order', () => {
  const duel = rpgMobaNouveauDuel({ joueurDeck: MOBA_DECK_ESSAI, sorcierDeck: MOBA_DECK_ESSAI, rng: () => 0.5 });
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaMulligan(duel, 'sorcier', []).raison, 'pas-votre-tour');
  assert.equal(rpgMobaMulligan(duel, 'joueur', [999]).raison, 'choix');
  assert.equal(rpgMobaMulligan(duel, 'joueur', [0, 0]).raison, 'choix');
  assert.equal(JSON.stringify(duel), before);
  const length = duel.joueur.main.length;
  assert.deepEqual(rpgMobaMulligan(duel, 'joueur', [0, 1]), { ok: true, demarre: false });
  assert.equal(duel.joueur.main.length, length);
  assert.equal(rpgMobaMulligan(duel, 'joueur', []).raison, 'pas-votre-tour');
  assert.deepEqual(rpgMobaMulligan(duel, 'sorcier', []), { ok: true, demarre: true });
  assert.equal(duel.tour, 'joueur');
  assert.equal(duel.joueur.manaChoixEnAttente, true);
});

test('end-of-turn discard belongs to the active player and uses their choices', () => {
  const duel = partie();
  duel.joueur.manaChoixEnAttente = false;
  duel.joueur.main.push('chien-du-guet', 'chien-du-guet', 'chien-du-guet', 'chien-du-guet', 'chien-du-guet');
  const count = duel.joueur.main.length;
  assert.ok(count > 6);
  assert.equal(rpgMobaTerminerTour(duel, 'sorcier').raison, 'pas-votre-tour');
  assert.equal(rpgMobaTerminerTour(duel, 'joueur').defausse, count - 6);
  assert.equal(duel.tour, 'joueur');
  assert.equal(rpgMobaDefausser(duel, 'sorcier', 0).raison, 'timing');
  assert.equal(rpgMobaDefausser(duel, 'joueur', 999).raison, 'hors-main');
  assert.equal(rpgMobaDefausser(duel, 'joueur').raison, 'hors-main');
  assert.equal(duel.joueur.main.length, count);
  while (duel.defausseEnAttente) assert.equal(rpgMobaDefausser(duel, 'joueur', 0).ok, true);
  assert.equal(duel.joueur.main.length, 6);
  assert.equal(duel.joueur.cimetiere.length, count - 6);
  assert.deepEqual(rpgMobaTerminerTour(duel, 'joueur'), { ok: true, tour: 'sorcier' });
  assert.equal(duel.tour, 'sorcier');
  assert.equal(rpgMobaDefausser(duel, 'joueur', 0).raison, 'timing');
});

test('turn and mulligan actions are refused after MOBA victory', () => {
  const duel = partie();
  mobaInfliger(duel.moba, 'joueur', 'left', 10);
  mobaInfliger(duel.moba, 'joueur', 'right', 10);
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaTerminerTour(duel, 'joueur').raison, 'partie-terminee');
  assert.equal(rpgMobaDefausser(duel, 'joueur', 0).raison, 'partie-terminee');
  assert.equal(rpgMobaMulligan(duel, 'joueur', []).raison, 'partie-terminee');
  assert.equal(JSON.stringify(duel), before);
});
