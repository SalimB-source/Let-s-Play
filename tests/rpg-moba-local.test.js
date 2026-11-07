import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgChoisirCouleurMana, rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan, rpgNouveauDuel, rpgPeutAttaquer, rpgPeutBloquerAttaquant, rpgReglerHasard, rpgVainqueur } from '../src/games/rpgDuel.js';
import { magieById } from '../src/games/rpgCards.js';
import { rpgMobaNouveauDuel, rpgMobaCandidatsRecherche, rpgMobaResoudreRecherche, rpgMobaPlacementCoherent, rpgMobaJouerCreature, rpgMobaResoudreArrivee, rpgMobaDeclarerAttaque, rpgMobaLancerAttaque, rpgMobaLancerMagie, rpgMobaMulligan, rpgMobaTerminerTour, rpgMobaPasserFinDeTour, rpgMobaPasserEffetCreature, rpgMobaPasserSort, rpgMobaPeutPayer, rpgMobaDefausser, rpgMobaValiderDeck, rpgMobaCreerPartie, MOBA_CARTES_AUTORISEES, MOBA_DECK_ESSAI, MOBA_DECKS } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirMagieIA } from '../src/games/rpgMobaAI.js';
import { validerDeckManaEssai } from '../src/games/rpgManaEssai.js';
import { mobaInfliger, mobaRetirer, mobaVoie } from '../src/games/rpgMoba.js';

function terminerEtPasser(duel, side) {
  const result = rpgMobaTerminerTour(duel, side);
  return result.reponse ? rpgMobaPasserFinDeTour(duel, result.reponse) : result;
}

function partie() {
  const deck = Array(12).fill('gardienne-des-portes-de-sable');
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
  const result = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 1);
  assert.equal(result.ok, true);
  assert.equal(result.entite.emplacement, 4);
  assert.equal(result.entite.carteId, 'gardienne-des-portes-de-sable');
  assert.equal(duel.joueur.mana.sable, 3);
  assert.equal(duel.joueur.main.length, before - 1);
  assert.equal(mobaVoie(duel.moba, 'right').slots.joueur[1], result.entite.id);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('lane capacity, occupied slots and resources reject summons without state changes', () => {
  const duel = partie();
  duel.joueur.mana.sable = 6;
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).ok, true);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 1).ok, true);
  let before = JSON.stringify(duel);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 2).raison, 'emplacement');
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).raison, 'emplacement');
  assert.equal(JSON.stringify(duel), before);
  duel.joueur.mana.sable = 0;
  before = JSON.stringify(duel);
  const camp = duel.joueur;
  const firstCreature = camp.creatures[0];
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'center', 0).raison, 'mana');
  assert.equal(JSON.stringify(duel), before);
  assert.equal(duel.joueur, camp);
  assert.equal(duel.joueur.creatures[0], firstCreature);
});

test('local turn changes give the second seat control of its own slots', () => {
  const duel = partie();
  duel.joueur.mana.sable = 3;
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'center', 0).ok, true);
  assert.equal(rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'center', 0).raison, 'pas-votre-tour');
  rpgFinDeTour(duel);
  duel.sorcier.mana.sable = 3;
  assert.equal(duel.tour, 'sorcier');
  assert.equal(rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'center', 0).ok, true);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  assert.ok(mobaVoie(duel.moba, 'center').slots.sorcier[0]);
});

test('inactive lanes, finished games and unsupported arrival effects are gated', () => {
  const duel = partie();
  duel.joueur.main.push('le-brulot');
  duel.joueur.mana.sable = 8;
  let before = JSON.stringify(duel);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'le-brulot', 'left', 0).raison, 'effet-non-pris-en-charge');
  assert.equal(JSON.stringify(duel), before);
  mobaInfliger(duel.moba, 'joueur', 'center', 10);
  before = JSON.stringify(duel);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'center', 0).raison, 'voie-inactive');
  assert.equal(JSON.stringify(duel), before);
  mobaInfliger(duel.moba, 'joueur', 'right', 10);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).raison, 'partie-terminee');
});

test('out-of-band battlefield changes fail closed rather than moving cards', () => {
  const duel = partie();
  duel.joueur.mana.sable = 3;
  const { entite } = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0);
  entite.emplacement = 2;
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaPlacementCoherent(duel), false);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).raison, 'etat-incoherent');
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
  assert.ok(duel.combatFeed.some((event) => event.type === 'death' && event.victim.id === blocker.id && event.killers.some((source) => source.id === attacker.id)), 'public combat feed records the real exchange');
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

test('unaudited creatures are rejected before placement and combat fails closed for an out-of-band entity', () => {
  const duel = partie();
  duel.joueur.mana.sable = 3;
  duel.joueur.main.push('le-brulot');
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'le-brulot', 'left', 0).raison, 'effet-non-pris-en-charge');
  assert.equal(JSON.stringify(duel), before);
  const { entite } = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0);
  entite.carteId = 'le-brulot'; // emulate a mutation outside the adapter
  entite.ready = true;
  const corrupted = JSON.stringify(duel);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [entite.id], {}).raison, 'effet-non-pris-en-charge');
  assert.equal(JSON.stringify(duel), corrupted);
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
  duel.joueur.main.push('gardienne-des-portes-de-sable', 'gardienne-des-portes-de-sable', 'gardienne-des-portes-de-sable', 'gardienne-des-portes-de-sable', 'gardienne-des-portes-de-sable');
  const count = duel.joueur.main.length;
  assert.ok(count > 6);
  assert.equal(terminerEtPasser(duel, 'sorcier').raison, 'pas-votre-tour');
  assert.equal(terminerEtPasser(duel, 'joueur').defausse, count - 6);
  assert.equal(duel.tour, 'joueur');
  assert.equal(rpgMobaDefausser(duel, 'sorcier', 0).raison, 'timing');
  assert.equal(rpgMobaDefausser(duel, 'joueur', 999).raison, 'hors-main');
  assert.equal(rpgMobaDefausser(duel, 'joueur').raison, 'hors-main');
  assert.equal(duel.joueur.main.length, count);
  while (duel.defausseEnAttente) assert.equal(rpgMobaDefausser(duel, 'joueur', 0).ok, true);
  assert.equal(duel.joueur.main.length, 6);
  assert.equal(duel.joueur.cimetiere.length, count - 6);
  assert.deepEqual(terminerEtPasser(duel, 'joueur'), { ok: true, tour: 'sorcier' });
  assert.equal(duel.tour, 'sorcier');
  assert.equal(rpgMobaDefausser(duel, 'joueur', 0).raison, 'timing');
});

test('turn and mulligan actions are refused after MOBA victory', () => {
  const duel = partie();
  mobaInfliger(duel.moba, 'joueur', 'left', 10);
  mobaInfliger(duel.moba, 'joueur', 'right', 10);
  const before = JSON.stringify(duel);
  assert.equal(terminerEtPasser(duel, 'joueur').raison, 'partie-terminee');
  assert.equal(rpgMobaDefausser(duel, 'joueur', 0).raison, 'partie-terminee');
  assert.equal(rpgMobaMulligan(duel, 'joueur', []).raison, 'partie-terminee');
  assert.equal(JSON.stringify(duel), before);
});

test('targeted creature spell pays the original cost and affects only its chosen active lane', () => {
  const duel = partieCombat();
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel);
  duel.sorcier.main.push('gardienne-des-portes-de-sable', 'ashigaru-des-braises');
  duel.sorcier.mana.sable = 10;
  duel.sorcier.mana.braise = 10;
  const guard = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'center', 0).entite;
  const other = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
  rpgFinDeTour(duel);
  duel.joueur.main.push('poigne-de-givre', 'poigne-de-givre');
  duel.joueur.mana.neige = 6;
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'poigne-de-givre').raison, 'cible');
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'poigne-de-givre', ally.id).raison, 'cible');
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'poigne-de-givre', 'sorcier').raison, 'cible');
  assert.equal(JSON.stringify(duel), before);
  const totalMana = (camp) => Object.values(camp.mana).reduce((sum, value) => sum + value, 0);
  const manaAvant = totalMana(duel.joueur);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'poigne-de-givre', guard.id).ok, true);
  assert.equal(totalMana(duel.joueur), manaAvant - 2);
  assert.equal(duel.joueur.mana.neige, 5);
  assert.equal(guard.pv, 2);
  assert.ok(guard.gelToursRestants > 0);
  assert.equal(other.pv, 1);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 10);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'poigne-de-givre', other.id).ok, true);
  assert.equal(mobaVoie(duel.moba, 'right').slots.sorcier[0], null);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('empty MOBA decks do not cause fatigue or make legacy wizard HP decide victory', () => {
  const duel = partieCombat();
  duel.joueur.deck = [];
  duel.sorcier.deck = [];
  duel.sorcier.pv = 1;
  duel.sorcier.fatigue = 4;
  const lanesBefore = JSON.stringify(duel.moba.lanes);
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier');
  assert.equal(duel.sorcier.pv, 1);
  assert.equal(duel.sorcier.fatigue, 4);
  assert.equal(JSON.stringify(duel.moba.lanes), lanesBefore);
  duel.sorcier.pv = 0;
  assert.equal(rpgVainqueur(duel), null);
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'joueur');
  assert.equal(duel.joueur.fatigue, 0);
  assert.equal(duel.joueur.pv, 25);
  assert.equal(rpgVainqueur(duel), null);
  mobaInfliger(duel.moba, 'joueur', 'left', 10);
  mobaInfliger(duel.moba, 'joueur', 'right', 10);
  assert.equal(rpgVainqueur(duel), 'joueur');
});

test('ordinary mana-essai fatigue and wizard victory remain unchanged', () => {
  const deck = Array(12).fill('ashigaru-des-braises');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], modeMana: 'essai', pvp: true, rng: () => .5 });
  rpgMulligan(duel, 'joueur', []); rpgMulligan(duel, 'sorcier', []); rpgDemarrerManaEssai(duel);
  duel.sorcier.deck = [];
  rpgFinDeTour(duel);
  assert.equal(duel.sorcier.fatigue, 1);
  assert.equal(duel.sorcier.pv, 24);
  duel.sorcier.pv = 0;
  assert.equal(rpgVainqueur(duel), 'joueur');
});

test('face-targeting spells hit a chosen lane, conquer it and end the game on the second conquest', () => {
  const duel = partieCombat();
  duel.joueur.main.push('eclair-du-marteau', 'eclair-du-marteau', 'poigne-de-givre');
  duel.joueur.mana.neige = 10;
  mobaInfliger(duel.moba, 'joueur', 'left', 8);
  mobaInfliger(duel.moba, 'joueur', 'center', 8);
  let before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'sorcier').raison, 'cible');
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'poigne-de-givre', 'sorcier', 'left').raison, 'cible');
  assert.equal(JSON.stringify(duel), before);
  const first = rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'sorcier', 'left');
  assert.equal(first.ok, true);
  assert.equal(first.damageEvents[0].damage, 2);
  assert.equal(first.damageEvents[0].conquered, true);
  assert.equal(mobaVoie(duel.moba, 'left').active, false);
  assert.equal(duel.sorcier.pv, 25);
  assert.equal(duel.moba.winner, null);
  before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'sorcier', 'left').raison, 'cible');
  assert.equal(JSON.stringify(duel), before);
  const second = rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'sorcier', 'center');
  assert.equal(second.ok, true);
  assert.equal(second.damageEvents[0].winner, 'joueur');
  assert.equal(duel.moba.winner, 'joueur');
  assert.equal(duel.fin.gagnant, 'joueur');
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10);
  assert.equal(duel.sorcier.pv, 25);
  before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'poigne-de-givre', 'sorcier', 'right').raison, 'partie-terminee');
  assert.equal(JSON.stringify(duel), before);
});

test('a healing spell restores creatures globally and one chosen friendly lane, capped at ten', () => {
  const duel = partieCombat();
  duel.joueur.main.push('loup-des-neiges', 'gardien-viking-du-fjord', 'festin-des-vaillants', 'festin-des-vaillants');
  duel.joueur.mana.neige = 15;
  const left = rpgMobaJouerCreature(duel, 'joueur', 'loup-des-neiges', 'left', 0).entite;
  const center = rpgMobaJouerCreature(duel, 'joueur', 'gardien-viking-du-fjord', 'center', 0).entite;
  left.pv -= 1; left.def -= 1;
  center.pv -= 2; center.def -= 2;
  mobaInfliger(duel.moba, 'sorcier', 'left', 1);
  mobaInfliger(duel.moba, 'sorcier', 'center', 4);
  mobaInfliger(duel.moba, 'sorcier', 'right', 10);
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'festin-des-vaillants').raison, 'cible');
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'festin-des-vaillants', null, 'right').raison, 'cible');
  assert.equal(JSON.stringify(duel), before);
  const first = rpgMobaLancerMagie(duel, 'joueur', 'festin-des-vaillants', null, 'center');
  assert.equal(first.ok, true);
  assert.equal(first.healingEvents[0].healing, 2);
  assert.equal(mobaVoie(duel.moba, 'center').hp.joueur, 8);
  assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 9);
  assert.equal(left.pv, left.pvMax);
  assert.equal(center.pv, center.pvMax);
  assert.equal(duel.joueur.pv, 25);
  const second = rpgMobaLancerMagie(duel, 'joueur', 'festin-des-vaillants', null, 'left');
  assert.equal(second.ok, true);
  assert.equal(second.healingEvents[0].healing, 1);
  assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 10);
  assert.equal(mobaVoie(duel.moba, 'right').active, false);
});

function anqaTombee() {
  const duel = partieCombat();
  duel.joueur.main.push('anqa-des-braises', 'grand-hiver', 'tempete-de-foudre-et-de-givre');
  duel.joueur.mana.braise = 20; duel.joueur.mana.neige = 20;
  const anqa = rpgMobaJouerCreature(duel, 'joueur', 'anqa-des-braises', 'center', 0).entite;
  assert.ok(anqa);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver').ok, true);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'tempete-de-foudre-et-de-givre').ok, true);
  assert.equal(duel.joueur.creatures.some((e) => e.id === anqa.id), false);
  assert.equal(mobaVoie(duel.moba, 'center').slots.joueur[0], null);
  assert.equal(duel.joueur.retoursProgrammes.length, 1);
  assert.equal(duel.joueur.retoursProgrammes[0].mobaLane, 'center');
  assert.equal(duel.joueur.retoursProgrammes[0].mobaSourceId, anqa.id);
  return { duel, anqa };
}

test('Anqa waits for a place in her original lane and returns with the original global effect', () => {
  const { duel, anqa } = anqaTombee();
  duel.joueur.main.push('ashigaru-des-braises');
  duel.joueur.mana.braise = 10;
  const obstacle = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'center', 0).entite;
  assert.ok(obstacle);
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  duel.sorcier.main.push('mousse-des-galiotes'); duel.sorcier.mana.sable = 10;
  const adversaire = rpgMobaJouerCreature(duel, 'sorcier', 'mousse-des-galiotes', 'right', 0).entite;
  assert.ok(adversaire);
  for (let i = 0; i < 3; i++) assert.equal(terminerEtPasser(duel, duel.tour).ok, true);
  assert.equal(duel.tour, 'joueur');
  assert.equal(duel.joueur.retoursProgrammes.length, 1);
  assert.equal(duel.joueur.creatures.some((e) => e.carteId === 'anqa-des-braises'), false);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  duel.joueur.main.push('grand-hiver'); duel.joueur.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver').ok, true);
  assert.equal(mobaVoie(duel.moba, 'center').slots.joueur[0], null);
  // Anqa's explicitly global return effect hits the opposing creature in a
  // different lane and the adapter clears its slot during the transition.
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  const revenue = duel.joueur.creatures.find((e) => e.carteId === 'anqa-des-braises');
  assert.ok(revenue);
  assert.notEqual(revenue.id, anqa.id);
  assert.equal(revenue.mobaLane, 'center');
  assert.equal(revenue.emplacement, 2);
  assert.equal(mobaVoie(duel.moba, 'center').slots.joueur[0], revenue.id);
  assert.equal(duel.sorcier.creatures.some((e) => e.id === adversaire.id), false);
  assert.equal(mobaVoie(duel.moba, 'right').slots.sorcier[0], null);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('conquering the original lane removes a scheduled return before any arrival effect', () => {
  const { duel } = anqaTombee();
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  mobaInfliger(duel.moba, 'sorcier', 'center', 7);
  duel.sorcier.main.push('eclair-du-marteau'); duel.sorcier.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', 'sorcier', 'center').ok, true);
  assert.equal(mobaVoie(duel.moba, 'center').active, false);
  assert.equal(duel.joueur.retoursProgrammes.length, 0);
  for (let i = 0; i < 5; i++) assert.equal(terminerEtPasser(duel, duel.tour).ok, true);
  assert.equal(duel.joueur.creatures.some((e) => e.carteId === 'anqa-des-braises'), false);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Tenacité keeps the original MOBA lane and never returns to a conquered lane', () => {
  const duel = partieCombat();
  duel.joueur.mana.braise = 10; duel.joueur.mana.neige = 10;
  duel.joueur.main.push('grand-hiver');
  const entity = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 1).entite;
  // Synthetic Tenacité fixture exercises the shared return mechanism without
  // enabling the still-unsupported arrival abilities of the printed heroes.
  entity.tenaciteDisponible = true;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver').ok, true);
  assert.equal(duel.joueur.retoursProgrammes[0].mobaLane, 'right');
  assert.equal(duel.joueur.retoursProgrammes[0].mobaSourceId, entity.id);
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  const revenue = duel.joueur.creatures.find((e) => e.carteId === 'ashigaru-des-braises');
  assert.ok(revenue);
  assert.equal(revenue.mobaLane, 'right');
  assert.equal(revenue.pv, 1);
  assert.equal(revenue.tenaciteDisponible, false);
  assert.ok(mobaVoie(duel.moba, 'right').slots.joueur.includes(revenue.id));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('defender can respond to a declared attack with an instant and stop combat by killing the attacker', () => {
  const duel = partieCombat();
  const { attacker } = poserCombattants(duel);
  duel.sorcier.main.push('eclair-du-marteau', 'grand-hiver');
  duel.sorcier.mana.neige = 10;
  let before = JSON.stringify(duel);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'sorcier', [attacker.id]).raison, 'pas-votre-tour');
  assert.equal(JSON.stringify(duel), before);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id]).ok, true);
  assert.equal(duel.phase, 'blocage');
  before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'grand-hiver').raison, 'timing');
  assert.equal(JSON.stringify(duel), before);
  const result = rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', attacker.id);
  assert.equal(result.ok, true);
  assert.equal(result.combatTermine, true);
  assert.equal(duel.combatDeclare, null);
  assert.equal(duel.fenetreReponse, false);
  assert.equal(duel.phase, 'principale2');
  assert.equal(duel.attaqueJouee, 'joueur');
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10);
});

test('a frozen declared attacker resolves with the classic combat rule without changing lanes', () => {
  const duel = partieCombat();
  duel.joueur.main.push('jarl-au-marteau-de-guerre'); duel.joueur.mana.neige = 10;
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'center', 0).entite;
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.sorcier.main.push('poigne-de-givre'); duel.sorcier.mana.neige = 10;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id]).ok, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'poigne-de-givre', attacker.id).ok, true);
  assert.ok(attacker.gelToursRestants > 0);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {}, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 10);
  assert.equal(duel.phase, 'principale2');
  assert.equal(duel.combatDeclare, null);
  assert.equal(duel.fenetreReponse, false);
});

test('end-of-turn response belongs to the other seat and uses the engine instant rules', () => {
  const duel = partieCombat();
  duel.sorcier.main.push('eclair-du-marteau', 'grand-hiver');
  duel.sorcier.mana.neige = 5;
  assert.deepEqual(rpgMobaTerminerTour(duel, 'joueur'), { ok: true, reponse: 'sorcier' });
  assert.equal(duel.tour, 'joueur');
  assert.equal(duel.phase, 'fin');
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaPasserFinDeTour(duel, 'joueur').raison, 'pas-votre-tour');
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'grand-hiver').raison, 'timing');
  assert.equal(JSON.stringify(duel), before);
  const spell = rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', 'sorcier', 'right');
  assert.equal(spell.ok, true);
  assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, 7);
  assert.equal(duel.tour, 'joueur');
  assert.deepEqual(rpgMobaPasserFinDeTour(duel, 'sorcier'), { ok: true, tour: 'sorcier' });
  assert.equal(duel.fenetreReponse, false);
  assert.equal(duel.finDeTour, null);
  assert.equal(duel.phase, 'principale');
});

test('all selectable starter decks satisfy the existing mana and copy rules', () => {
  assert.equal(MOBA_DECKS.length, 5);
  for (const deck of MOBA_DECKS) {
    assert.equal(validerDeckManaEssai(deck).ok, true, deck.name);
  }
});

test('an arrival heal applies only to its creature’s lane; a healing spell chooses its own lane', () => {
  const duel = partieCombat();
  duel.joueur.main.push('porteuse-de-cruches', 'eau-de-la-source');
  duel.joueur.mana.eau = 10;
  mobaInfliger(duel.moba, 'sorcier', 'left', 4);
  mobaInfliger(duel.moba, 'sorcier', 'right', 5);
  const result = rpgMobaJouerCreature(duel, 'joueur', 'porteuse-de-cruches', 'left', 0);
  assert.equal(result.ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 9);
  assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, 5);
  assert.equal(duel.joueur.pv, 25);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  const healing = rpgMobaLancerMagie(duel, 'joueur', 'eau-de-la-source', null, 'right');
  assert.equal(healing.ok, true);
  assert.equal(healing.healingEvents[0].healing, 4);
  assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, 9);
  assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 9);
  assert.equal(duel.joueur.pv, 25);
});

test('a returning healing creature routes its arrival to its original lane', () => {
  const duel = partieCombat();
  duel.joueur.mana.eau = 10; duel.joueur.mana.neige = 10;
  duel.joueur.main.push('porteuse-de-cruches', 'grand-hiver');
  const entity = rpgMobaJouerCreature(duel, 'joueur', 'porteuse-de-cruches', 'right', 1).entite;
  entity.tenaciteDisponible = true;
  entity.pv = 1;
  mobaInfliger(duel.moba, 'sorcier', 'right', 5);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver').ok, true);
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, 8);
  assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 10);
  assert.equal(duel.joueur.pv, 25);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('turn transitions reject an inconsistent lane state without mutation', () => {
  const duel = partieCombat();
  duel.joueur.main.push('ashigaru-des-braises');
  const entity = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  entity.mobaLane = 'right';
  let before = JSON.stringify(duel);
  assert.equal(rpgMobaTerminerTour(duel, 'joueur').raison, 'etat-incoherent');
  assert.equal(JSON.stringify(duel), before);
  entity.mobaLane = 'left';
  assert.equal(rpgMobaTerminerTour(duel, 'joueur').ok, true);
  entity.mobaLane = 'right';
  before = JSON.stringify(duel);
  assert.equal(rpgMobaPasserFinDeTour(duel, 'sorcier').raison, 'etat-incoherent');
  assert.equal(JSON.stringify(duel), before);
});

const deckMatchPersonnalise = { ...MOBA_DECKS[0], cardIds: MOBA_DECKS[0].cardIds.map((id) => id === 'viking-des-neiges' ? 'guerrier-au-bouclier-rond' : id) };
const deckMatchBraises = { ...MOBA_DECKS[0], cardIds: MOBA_DECKS[0].cardIds.map((id) => id === 'viking-des-neiges' ? 'djinn-de-la-premiere-etincelle' : id === 'brume-du-fjord' ? 'tempete-de-sable' : id) };
const decksMatch = [...MOBA_DECKS, deckMatchPersonnalise, deckMatchBraises];
for (const [first, second] of [[0, 1], [2, 1], [0, 2], [2, 2], [3, 0], [0, 3], [3, 3], [4, 0], [0, 4], [4, 4], [5, 0], [0, 5], [5, 5], [6, 0], [0, 6], [6, 6]]) test(`a complete match uses real decks ${first + 1} and ${second + 1} without injected cards or mana`, () => {
  const one = decksMatch[first], two = decksMatch[second];
  let seed = 77;
  const rng = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const match = rpgMobaCreerPartie(one, two, { rng });
  assert.equal(match.ok, true);
  const duel = match.duel;
  assert.equal(rpgMobaMulligan(duel, 'joueur', []).ok, true);
  assert.equal(rpgMobaMulligan(duel, 'sorcier', []).ok, true);
  for (let turn = 0; turn < 100 && !duel.moba.winner; turn++) {
    const side = duel.tour, enemy = side === 'joueur' ? 'sorcier' : 'joueur';
    const camp = duel[side];
    if (camp.manaChoixEnAttente) {
      const color = camp.couleurs[turn % camp.couleurs.length];
      assert.equal(rpgChoisirCouleurMana(duel, side, color).ok, true);
    }
    // Use only actual cards in hand and printed costs. Declining to block is a
    // legal hot-seat choice, except where the classic Provocation rule applies.
    for (const cardId of [...camp.main]) {
      if (magieById(cardId)) continue;
      const lane = duel.moba.lanes.filter((item) => item.active && item.slots[side].includes(null))
        .sort((a, b) => a.slots[side].filter(Boolean).length - b.slots[side].filter(Boolean).length)[0];
      if (lane) {
        const played = rpgMobaJouerCreature(duel, side, cardId, lane.id, lane.slots[side].indexOf(null));
        if (played.arriveeEnAttente) {
          const target = cardId === 'maitre-du-marteau' ? (duel[enemy].creatures[0]?.id ?? 'sorcier')
            : cardId === 'lionne-du-midi-ardent' ? duel[enemy].creatures[0].id : played.entite.id;
          const choice = rpgMobaResoudreArrivee(duel, side, target);
          assert.equal(choice.ok, true);
          if (choice.effetEnAttente) assert.equal(rpgMobaPasserEffetCreature(duel, enemy).ok, true);
        }
      }
    }
    const attackers = camp.creatures.filter(rpgPeutAttaquer).map((entity) => entity.id);
    if (attackers.length && rpgMobaDeclarerAttaque(duel, side, attackers).ok) {
      const blocks = {}, used = new Set();
      for (const attacker of camp.creatures.filter((entity) => attackers.includes(entity.id) && entity.provocation)) {
        const defender = duel[enemy].creatures.find((entity) => entity.mobaLane === attacker.mobaLane && !used.has(entity.id)
          && !entity.attaquee && !(entity.gelToursRestants > 0) && !(entity.empecheBlocageToursRestants > 0)
          && rpgPeutBloquerAttaquant(entity, attacker));
        if (defender) { blocks[attacker.id] = [defender.id]; used.add(defender.id); }
      }
      const combat = rpgMobaLancerAttaque(duel, side, attackers, blocks, { declaree: true });
      assert.equal(combat.ok, true, `turn ${turn}: ${combat.raison}`);
    }
    if (duel.moba.winner) break;
    let ending = rpgMobaTerminerTour(duel, side);
    assert.equal(ending.ok, true, `turn ${turn}: ${ending.raison}`);
    while (ending.defausse) {
      assert.equal(rpgMobaDefausser(duel, side, 0).ok, true);
      ending = rpgMobaTerminerTour(duel, side);
      assert.equal(ending.ok, true);
    }
    assert.equal(rpgMobaPasserFinDeTour(duel, enemy).ok, true);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
  assert.ok(duel.moba.winner, 'the match reaches a two-conquest victory');
  assert.equal(rpgVainqueur(duel), duel.moba.winner);
  assert.equal(duel.moba.lanes.filter((lane) => lane.conqueredBy === duel.moba.winner).length, 2);
});

test('Sahir damages an in-lane blocker before normal combat and leaves other lanes alone', () => {
  const duel = partieCombat();
  duel.joueur.main.push('sahir-des-braises');
  const sahir = rpgMobaJouerCreature(duel, 'joueur', 'sahir-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel);
  duel.sorcier.main.push('mousse-des-galiotes', 'ashigaru-des-braises');
  duel.sorcier.mana.sable = 5; duel.sorcier.mana.braise = 5;
  const blocker = rpgMobaJouerCreature(duel, 'sorcier', 'mousse-des-galiotes', 'left', 0).entite;
  const other = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'center', 0).entite;
  rpgFinDeTour(duel);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [sahir.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [sahir.id], { [sahir.id]: [other.id] }, { declaree: true }).raison, 'blocage');
  const result = rpgMobaLancerAttaque(duel, 'joueur', [sahir.id], { [sahir.id]: [blocker.id] }, { declaree: true });
  assert.equal(result.ok, true);
  assert.equal(duel.sorcier.creatures.includes(blocker), false);
  assert.equal(sahir.pv, 3, 'the pre-combat kill prevents the blocker combat damage');
  assert.equal(other.pv, 1);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10, 'the attack remains blocked');
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Sahir also triggers before combat when defending its lane', () => {
  const duel = partieCombat();
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  rpgFinDeTour(duel);
  duel.sorcier.main.push('sahir-des-braises'); duel.sorcier.mana.braise = 10;
  const sahir = rpgMobaJouerCreature(duel, 'sorcier', 'sahir-des-braises', 'right', 0).entite;
  rpgFinDeTour(duel);
  const result = rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], { [attacker.id]: [sahir.id] });
  assert.equal(result.ok, true);
  assert.equal(duel.joueur.creatures.includes(attacker), false);
  assert.equal(sahir.pv, 3);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Ressac returns an attacker to hand during defence and reconciles its lane and declaration', () => {
  const duel = partieCombat();
  duel.joueur.main.push('jarl-au-marteau-de-guerre'); duel.joueur.mana.neige = 10;
  const returning = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const survivor = rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'center', 0).entite;
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.sorcier.main.push('ressac'); duel.sorcier.mana.eau = 10;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [returning.id, survivor.id]).ok, true);
  const invalid = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'ressac', 'sorcier', 'left').raison, 'cible');
  assert.equal(JSON.stringify(duel), invalid);
  const spell = rpgMobaLancerMagie(duel, 'sorcier', 'ressac', returning.id);
  assert.equal(spell.ok, true);
  assert.ok(duel.joueur.main.includes('ashigaru-des-braises'));
  assert.equal(duel.joueur.creatures.includes(returning), false);
  assert.equal(mobaVoie(duel.moba, 'left').slots.joueur[0], null);
  assert.deepEqual(duel.combatDeclare.attaquants, [survivor.id]);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [survivor.id], {}, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10);
  assert.ok(mobaVoie(duel.moba, 'center').hp.sorcier < 10);
});

test('Ressac returning the sole declared attacker ends combat without damage', () => {
  const duel = partieCombat();
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 1).entite;
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.sorcier.main.push('ressac'); duel.sorcier.mana.eau = 10;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id]).ok, true);
  const result = rpgMobaLancerMagie(duel, 'sorcier', 'ressac', attacker.id);
  assert.equal(result.ok, true);
  assert.equal(result.combatTermine, true);
  assert.equal(duel.combatDeclare, null);
  assert.equal(duel.phase, 'principale2');
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Rempart protects allies across lanes in a combat response and expires at the end of that turn', () => {
  const duel = partieCombat();
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel);
  duel.sorcier.main.push('mousse-des-galiotes', 'ashigaru-des-braises', 'rempart-de-dunes');
  duel.sorcier.mana.sable = 10; duel.sorcier.mana.braise = 10;
  const removed = rpgMobaJouerCreature(duel, 'sorcier', 'mousse-des-galiotes', 'left', 0).entite;
  const survivor = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
  rpgFinDeTour(duel);
  mobaInfliger(duel.moba, 'joueur', 'left', 9);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id]).ok, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'rempart-de-dunes').ok, true);
  assert.equal(removed.pv, 5);
  assert.equal(survivor.pv, 4);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {}, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').active, false);
  assert.equal(duel.sorcier.creatures.includes(removed), false);
  assert.ok(duel.sorcier.bonusTemporaires.every((bonus) => bonus.entiteId !== removed.id));
  assert.equal(survivor.pv, 4);
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.equal(survivor.pv, 1);
  assert.equal(survivor.def, 1);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Parade de verre targets only a friendly creature and blocks the next hostile spell', () => {
  const duel = partieCombat();
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel);
  duel.sorcier.main.push('mousse-des-galiotes', 'parade-du-verre');
  duel.sorcier.mana.sable = 10; duel.sorcier.mana.eau = 10;
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'mousse-des-galiotes', 'right', 0).entite;
  rpgFinDeTour(duel);
  duel.joueur.main.push('poigne-de-givre'); duel.joueur.mana.neige = 10;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id]).ok, true);
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'parade-du-verre', attacker.id).raison, 'cible');
  assert.equal(JSON.stringify(duel), before);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'parade-du-verre', target.id).ok, true);
  assert.equal(target.bouclier, 1);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {}, { declaree: true }).ok, true);
  const result = rpgMobaLancerMagie(duel, 'joueur', 'poigne-de-givre', target.id);
  assert.equal(result.ok, true);
  assert.equal(result.bouclierBloque, true);
  assert.equal(target.bouclier, 0);
  assert.equal(target.pv, 2);
  assert.equal(target.gelToursRestants ?? 0, 0);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('shield-bearing creature chooses an ally on arrival and blocks actions until the choice', () => {
  const duel = partieCombat();
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel);
  duel.sorcier.main.push('mousse-des-galiotes'); duel.sorcier.mana.sable = 10;
  const enemy = rpgMobaJouerCreature(duel, 'sorcier', 'mousse-des-galiotes', 'center', 0).entite;
  rpgFinDeTour(duel);
  duel.joueur.main.push('guerrier-au-bouclier-rond', 'eclair-du-marteau'); duel.joueur.mana.neige = 10;
  const played = rpgMobaJouerCreature(duel, 'joueur', 'guerrier-au-bouclier-rond', 'right', 0);
  assert.equal(played.ok, true);
  assert.equal(played.arriveeEnAttente, true);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaResoudreArrivee(duel, 'sorcier', enemy.id).raison, 'pas-votre-tour');
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', enemy.id).raison, 'cible');
  assert.equal(rpgMobaTerminerTour(duel, 'joueur').raison, 'timing');
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', enemy.id).raison, 'timing');
  assert.equal(JSON.stringify(duel), before);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', ally.id).ok, true);
  assert.equal(ally.bouclier, 1);
  assert.equal(played.entite.bouclier ?? 0, 0);
  assert.equal(duel.arriveeEnAttente, null);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('shield-bearing creature can choose itself when it is the only ally', () => {
  const duel = partieCombat();
  duel.joueur.main.push('guerrier-au-bouclier-rond'); duel.joueur.mana.neige = 10;
  const played = rpgMobaJouerCreature(duel, 'joueur', 'guerrier-au-bouclier-rond', 'center', 0);
  assert.equal(played.arriveeEnAttente, true);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', played.entite.id).ok, true);
  assert.equal(played.entite.bouclier, 1);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('a scheduled return of the warrior keeps its lane and replays its classic shield arrival', () => {
  const duel = partieCombat();
  duel.joueur.main.push('guerrier-au-bouclier-rond', 'grand-hiver'); duel.joueur.mana.neige = 10;
  const warrior = rpgMobaJouerCreature(duel, 'joueur', 'guerrier-au-bouclier-rond', 'right', 0).entite;
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', warrior.id).ok, true);
  warrior.bouclier = 0; warrior.tenaciteDisponible = true; warrior.pv = 1;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver').ok, true);
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  const returned = duel.joueur.creatures.find((e) => e.carteId === 'guerrier-au-bouclier-rond');
  assert.ok(returned);
  assert.equal(returned.mobaLane, 'right');
  assert.equal(returned.bouclier, 1);
  assert.equal(duel.arriveeEnAttente, null);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Lionne resolves an arrival against a creature after an opposing shield response', () => {
  const duel = partieCombat();
  rpgFinDeTour(duel);
  duel.sorcier.main.push('mousse-des-galiotes'); duel.sorcier.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'mousse-des-galiotes', 'center', 0).entite;
  rpgFinDeTour(duel);
  duel.joueur.main.push('lionne-du-midi-ardent'); duel.joueur.mana.braise = 10;
  duel.sorcier.main.push('parade-du-verre'); duel.sorcier.mana.eau = 10;
  const played = rpgMobaJouerCreature(duel, 'joueur', 'lionne-du-midi-ardent', 'right', 0);
  assert.equal(played.ok, true); assert.equal(played.arriveeEnAttente, true);
  const invalid = JSON.stringify(duel);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', played.entite.id).raison, 'cible');
  assert.equal(JSON.stringify(duel), invalid);
  const choice = rpgMobaResoudreArrivee(duel, 'joueur', target.id);
  assert.equal(choice.ok, true); assert.equal(choice.effetEnAttente, true);
  assert.equal(target.pv, 2);
  assert.equal(rpgMobaTerminerTour(duel, 'joueur').raison, 'timing');
  assert.equal(rpgMobaPasserEffetCreature(duel, 'joueur').raison, 'aucun-effet');
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'parade-du-verre', target.id).ok, true);
  assert.equal(target.bouclier, 1);
  assert.equal(rpgMobaPasserEffetCreature(duel, 'sorcier').ok, true);
  assert.equal(target.pv, 2); assert.equal(target.bouclier, 0);
  assert.equal(duel.fenetreReponse, false);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Lionne arrival fizzles when a response conquers the target’s lane', () => {
  const duel = partieCombat();
  rpgFinDeTour(duel);
  duel.sorcier.main.push('mousse-des-galiotes'); duel.sorcier.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'mousse-des-galiotes', 'left', 0).entite;
  rpgFinDeTour(duel);
  mobaInfliger(duel.moba, 'sorcier', 'left', 8);
  duel.joueur.main.push('lionne-du-midi-ardent'); duel.joueur.mana.braise = 10;
  duel.sorcier.main.push('trait-de-braise'); duel.sorcier.mana.braise = 10;
  const played = rpgMobaJouerCreature(duel, 'joueur', 'lionne-du-midi-ardent', 'left', 0);
  assert.equal(played.arriveeEnAttente, true);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', target.id).effetEnAttente, true);
  const spell = rpgMobaLancerMagie(duel, 'sorcier', 'trait-de-braise', 'sorcier', 'left');
  assert.equal(spell.ok, true); assert.equal(mobaVoie(duel.moba, 'left').active, false);
  assert.equal(duel.joueur.creatures.includes(played.entite), false);
  assert.equal(duel.sorcier.creatures.includes(target), false);
  assert.equal(rpgMobaPasserEffetCreature(duel, 'sorcier').dissipe, true);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Lionne may enter an empty board without waiting for a nonexistent target', () => {
  const duel = partieCombat();
  duel.joueur.main.push('lionne-du-midi-ardent'); duel.joueur.mana.braise = 10;
  const result = rpgMobaJouerCreature(duel, 'joueur', 'lionne-du-midi-ardent', 'center', 0);
  assert.equal(result.ok, true);
  assert.ok(!duel.arriveeEnAttente);
  assert.ok(!duel.effetCreatureEnAttente);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Lionne immediately resolves when no instant response is available and clears a defeated target slot', () => {
  const duel = partieCombat();
  rpgFinDeTour(duel);
  duel.sorcier.main = ['mousse-des-galiotes']; duel.sorcier.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'mousse-des-galiotes', 'right', 1).entite;
  rpgFinDeTour(duel);
  duel.joueur.main.push('lionne-du-midi-ardent'); duel.joueur.mana.braise = 10;
  const played = rpgMobaJouerCreature(duel, 'joueur', 'lionne-du-midi-ardent', 'center', 0);
  assert.equal(played.arriveeEnAttente, true);
  const result = rpgMobaResoudreArrivee(duel, 'joueur', target.id);
  assert.equal(result.ok, true); assert.ok(!result.effetEnAttente);
  assert.equal(duel.sorcier.creatures.includes(target), false);
  assert.equal(mobaVoie(duel.moba, 'right').slots.sorcier[1], null);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('the hammer master strikes only its own lane when its arrival targets the opponent', () => {
  const duel = partieCombat();
  duel.joueur.main.push('maitre-du-marteau'); duel.joueur.mana.neige = 10;
  const played = rpgMobaJouerCreature(duel, 'joueur', 'maitre-du-marteau', 'right', 1);
  assert.equal(played.ok, true); assert.equal(played.arriveeEnAttente, true);
  const result = rpgMobaResoudreArrivee(duel, 'joueur', 'sorcier');
  assert.equal(result.ok, true);
  assert.equal(result.damageEvents[0].laneId, 'right');
  assert.equal(result.damageEvents[0].damage, 3);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 7);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 10);
  assert.equal(duel.sorcier.pv, 25);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('the hammer master can win immediately on arrival and its conquered lane is cleaned', () => {
  const duel = partieCombat();
  mobaInfliger(duel.moba, 'joueur', 'left', 10);
  mobaInfliger(duel.moba, 'joueur', 'center', 7);
  duel.joueur.main.push('maitre-du-marteau'); duel.joueur.mana.neige = 10;
  const played = rpgMobaJouerCreature(duel, 'joueur', 'maitre-du-marteau', 'center', 0);
  assert.equal(played.ok, true);
  const result = rpgMobaResoudreArrivee(duel, 'joueur', 'sorcier');
  assert.equal(result.ok, true);
  assert.equal(result.damageEvents[0].winner, 'joueur');
  assert.equal(duel.moba.winner, 'joueur');
  assert.equal(duel.fin.gagnant, 'joueur');
  assert.equal(duel.joueur.creatures.includes(played.entite), false);
  assert.equal(rpgMobaTerminerTour(duel, 'joueur').raison, 'partie-terminee');
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('the hammer master returns with Tenacité and its arrival strikes the original lane', () => {
  const duel = partieCombat();
  duel.joueur.main.push('maitre-du-marteau', 'grand-hiver'); duel.joueur.mana.neige = 10;
  const played = rpgMobaJouerCreature(duel, 'joueur', 'maitre-du-marteau', 'right', 0);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', 'sorcier').ok, true);
  played.entite.pv = 1;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver').ok, true);
  assert.equal(duel.joueur.retoursProgrammes[0].mobaLane, 'right');
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  const returned = duel.joueur.creatures.find((entity) => entity.carteId === 'maitre-du-marteau');
  assert.ok(returned); assert.equal(returned.mobaLane, 'right');
  assert.equal(returned.tenaciteDisponible, false);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 4);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 10);
  assert.equal(duel.sorcier.pv, 25);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('a winning Tenacité arrival stops subsequent returns and end-of-transition effects', () => {
  const duel = partieCombat();
  duel.joueur.main.push('maitre-du-marteau', 'grand-hiver'); duel.joueur.mana.neige = 10;
  const played = rpgMobaJouerCreature(duel, 'joueur', 'maitre-du-marteau', 'center', 0);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', 'sorcier').ok, true);
  played.entite.pv = 1;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver').ok, true);
  mobaInfliger(duel.moba, 'joueur', 'left', 10);
  mobaInfliger(duel.moba, 'joueur', 'center', 4);
  // A second due return demonstrates that the first winning arrival ends the
  // transition, rather than allowing later creatures to appear after victory.
  duel.joueur.cimetiere.push('ashigaru-des-braises');
  duel.joueur.retoursProgrammes.push({ carteId: 'ashigaru-des-braises', toursRestants: 2, mobaLane: 'right', mobaSourceId: 'fixture' });
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  assert.equal(duel.moba.winner, 'joueur');
  assert.equal(duel.joueur.creatures.length, 0);
  assert.equal(mobaVoie(duel.moba, 'center').active, false);
  assert.equal(mobaVoie(duel.moba, 'right').slots.joueur.every((id) => id === null), true);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('the hammer master also allows a creature target and a defender response', () => {
  const duel = partieCombat();
  rpgFinDeTour(duel);
  duel.sorcier.main.push('mousse-des-galiotes'); duel.sorcier.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'mousse-des-galiotes', 'right', 0).entite;
  rpgFinDeTour(duel);
  duel.joueur.main.push('maitre-du-marteau'); duel.joueur.mana.neige = 10;
  duel.sorcier.main.push('parade-du-verre'); duel.sorcier.mana.eau = 10;
  const played = rpgMobaJouerCreature(duel, 'joueur', 'maitre-du-marteau', 'left', 0);
  assert.equal(played.arriveeEnAttente, true);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', target.id).effetEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'parade-du-verre', target.id).ok, true);
  assert.equal(rpgMobaPasserEffetCreature(duel, 'sorcier').ok, true);
  assert.equal(target.pv, 2); assert.equal(target.bouclier, 0);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('the hammer master keeps its printed Furie, Overkill and Envol combat rules in its lane', () => {
  const duel = partieCombat();
  duel.joueur.main.push('maitre-du-marteau'); duel.joueur.mana.neige = 10;
  const master = rpgMobaJouerCreature(duel, 'joueur', 'maitre-du-marteau', 'center', 0).entite;
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', 'sorcier').ok, true);
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  duel.sorcier.main.push('ashigaru-des-braises', 'trait-de-braise'); duel.sorcier.mana.braise = 10;
  const blocker = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'center', 0).entite;
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'trait-de-braise', master.id).ok, true);
  assert.equal(master.pv, 2); assert.equal(master.atk, 8);
  assert.equal(master.overkill, true); assert.equal(master.envol, true);
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [master.id]).ok, true);
  assert.equal(rpgPeutBloquerAttaquant(blocker, master), false);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [master.id], {}, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'center').active, false);
  assert.equal(mobaVoie(duel.moba, 'center').conqueredBy, 'joueur');
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Papyrus pays its printed price from a chosen active lane and draws without changing legacy HP', () => {
  const duel = partieCombat();
  duel.joueur.main.push('papyrus'); duel.joueur.mana.tenebres = 2;
  duel.joueur.pv = 1; // Legacy HP does not gate an independently payable MOBA lane.
  assert.equal(rpgMobaPeutPayer(duel, 'joueur', magieById('papyrus')), true);
  mobaInfliger(duel.moba, 'sorcier', 'left', 8);
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'papyrus', null, 'left').raison, 'prix');
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'papyrus').raison, 'cible');
  assert.equal(JSON.stringify(duel), before);
  const handBefore = duel.joueur.main.length, deckBefore = duel.joueur.deck.length;
  const result = rpgMobaLancerMagie(duel, 'joueur', 'papyrus', null, 'right');
  assert.equal(result.ok, true);
  assert.equal(result.damageEvents[0].damage, 2);
  assert.equal(result.damageEvents[0].targetSide, 'joueur');
  assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, 8);
  assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 2);
  assert.equal(duel.joueur.pv, 1);
  assert.equal(duel.joueur.deck.length, deckBefore - 1);
  assert.equal(duel.joueur.main.length, handBefore);
  assert.equal(duel.joueur.mana.tenebres, 1);
});

test('Papyrus price is not charged on an invalid lane or insufficient mana, including a closed lane', () => {
  const duel = partieCombat();
  duel.joueur.main.push('papyrus'); duel.joueur.mana.tenebres = 0; duel.joueur.mana.braise = 0;
  mobaInfliger(duel.moba, 'sorcier', 'left', 10);
  let before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'papyrus', null, 'left').raison, 'cible');
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'papyrus', null, 'right').raison, 'mana');
  assert.equal(JSON.stringify(duel), before);
  duel.joueur.mana.tenebres = 1; duel.joueur.deck = [];
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'papyrus', null, 'right').ok, true);
  assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, 8);
  assert.equal(duel.joueur.pv, 25);
});

test('Papyrus can be paid from the defender’s own lane during an end-of-turn response', () => {
  const duel = partieCombat();
  duel.sorcier.main.push('papyrus'); duel.sorcier.mana.tenebres = 1;
  assert.equal(rpgMobaTerminerTour(duel, 'joueur').ok, true);
  const result = rpgMobaLancerMagie(duel, 'sorcier', 'papyrus', null, 'center');
  assert.equal(result.ok, true);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 8);
  assert.equal(mobaVoie(duel.moba, 'center').hp.joueur, 10);
  assert.equal(duel.sorcier.pv, 25);
  assert.equal(rpgMobaPasserFinDeTour(duel, 'sorcier').ok, true);
});

test('Papyrus opens an arrival response based on lane HP rather than obsolete wizard HP', () => {
  const duel = partieCombat();
  rpgFinDeTour(duel);
  duel.sorcier.main = ['mousse-des-galiotes']; duel.sorcier.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'mousse-des-galiotes', 'right', 0).entite;
  rpgFinDeTour(duel);
  duel.joueur.main.push('lionne-du-midi-ardent'); duel.joueur.mana.braise = 10;
  duel.sorcier.main.push('papyrus'); duel.sorcier.mana.tenebres = 1; duel.sorcier.pv = 1;
  const played = rpgMobaJouerCreature(duel, 'joueur', 'lionne-du-midi-ardent', 'left', 0);
  assert.equal(played.arriveeEnAttente, true);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', target.id).effetEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'papyrus', null, 'center').ok, true);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 8);
  assert.equal(duel.sorcier.pv, 1);
  assert.equal(rpgMobaPasserEffetCreature(duel, 'sorcier').ok, true);
  assert.equal(duel.sorcier.creatures.includes(target), false);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Papyrus cannot create a response when every friendly lane is at or below its price', () => {
  const duel = partieCombat();
  rpgFinDeTour(duel);
  duel.sorcier.main = ['mousse-des-galiotes']; duel.sorcier.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'mousse-des-galiotes', 'right', 0).entite;
  rpgFinDeTour(duel);
  for (const lane of ['left', 'center', 'right']) mobaInfliger(duel.moba, 'joueur', lane, 8);
  duel.joueur.main.push('lionne-du-midi-ardent'); duel.joueur.mana.braise = 10;
  duel.sorcier.main.push('papyrus'); duel.sorcier.mana.tenebres = 1;
  assert.equal(rpgMobaPeutPayer(duel, 'sorcier', magieById('papyrus')), false);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'lionne-du-midi-ardent', 'left', 0).arriveeEnAttente, true);
  const result = rpgMobaResoudreArrivee(duel, 'joueur', target.id);
  assert.equal(result.ok, true); assert.ok(!result.effetEnAttente);
  assert.equal(duel.sorcier.creatures.includes(target), false);
});

test('Papyrus response during combat preserves the declared attackers and their lanes', () => {
  const duel = partieCombat();
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'center', 0).entite;
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.sorcier.main.push('papyrus'); duel.sorcier.mana.tenebres = 1;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id]).ok, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'papyrus', null, 'right').ok, true);
  assert.deepEqual(duel.combatDeclare.attaquants, [attacker.id]);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 8);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {}, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 9);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('custom deck validation enforces normal deck rules and the MOBA audit gate', () => {
  for (const deck of MOBA_DECKS) assert.deepEqual(rpgMobaValiderDeck(deck), { ok: true });
  const base = MOBA_DECKS[0];
  assert.equal(new Set(MOBA_CARTES_AUTORISEES).size, MOBA_CARTES_AUTORISEES.length);
  const short = { ...base, cardIds: base.cardIds.slice(0, 29) };
  assert.equal(rpgMobaValiderDeck(short).raison, '30 cartes exigées');
  const tooMany = { ...base, cardIds: [...base.cardIds] };
  tooMany.cardIds[tooMany.cardIds.indexOf('viking-des-neiges')] = 'ashigaru-des-braises';
  assert.match(rpgMobaValiderDeck(tooMany).raison, /trop d’exemplaires/);
  const outsideIdentity = { ...base, elements: ['neige', 'braise'] };
  assert.match(rpgMobaValiderDeck(outsideIdentity).raison, /hors identité/);
  const fourColors = { ...base, elements: ['neige', 'braise', 'sable', 'eau'] };
  assert.match(rpgMobaValiderDeck(fourColors).raison, /1 à 3 couleurs/);
  const unsupported = { ...base, cardIds: [...base.cardIds] };
  unsupported.cardIds[unsupported.cardIds.indexOf('viking-des-neiges')] = 'le-brulot';
  assert.match(rpgMobaValiderDeck(unsupported).raison, /carte non adaptée/);
  assert.deepEqual(rpgMobaCreerPartie(base, unsupported), { ok: false, side: 'sorcier', raison: 'carte non adaptée au MOBA : le-brulot' });
});

test('a validated custom deck starts an independent match with its own colours and cards', () => {
  const base = MOBA_DECKS[0];
  const custom = { cardIds: [...base.cardIds], elements: [...base.elements] };
  custom.cardIds[custom.cardIds.indexOf('viking-des-neiges')] = 'guerrier-au-bouclier-rond';
  assert.deepEqual(rpgMobaValiderDeck(custom), { ok: true });
  const result = rpgMobaCreerPartie(custom, MOBA_DECKS[4], { rng: () => 0.5 });
  assert.equal(result.ok, true);
  assert.deepEqual(result.duel.joueur.couleurs, custom.elements);
  assert.deepEqual(result.duel.sorcier.couleurs, MOBA_DECKS[4].elements);
  assert.equal([...result.duel.joueur.main, ...result.duel.joueur.deck].filter((id) => id === 'guerrier-au-bouclier-rond').length, 1);
  custom.cardIds.fill('yamina'); custom.elements.length = 0;
  assert.notEqual(result.duel.joueur.deck[0], 'yamina');
  assert.equal(result.duel.joueur.couleurs.length, 3);
  assert.equal(rpgMobaPlacementCoherent(result.duel), true);
});

for (const id of ['ifrit-des-ergs', 'djinn-des-braises-voilees', 'djinn-du-dernier-brasier', 'djinn-de-la-premiere-etincelle', 'djinn-des-ailes-de-cendre']) {
  test(`${id}: rapid creature attacks in its lane and expires at the end of turn`, () => {
    const duel = partieCombat();
    duel.joueur.main.push(id); duel.joueur.mana.braise = 10;
    const result = rpgMobaJouerCreature(duel, 'joueur', id, 'right', 1);
    assert.equal(result.ok, true);
    const creature = result.entite;
    assert.equal(rpgPeutAttaquer(creature), true, 'printed Rapidité applies immediately');
    assert.equal(creature.detruireFinDuTour, true);
    const attaque = rpgMobaLancerAttaque(duel, 'joueur', [creature.id], {});
    assert.equal(attaque.ok, true);
    assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10 - creature.atk);
    assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10);
    assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
    assert.equal(duel.joueur.creatures.some((entity) => entity.id === creature.id), false);
    assert.equal(mobaVoie(duel.moba, 'right').slots.joueur[1], null);
    assert.ok(duel.joueur.cimetiere.includes(id));
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  });
}

test('the infiltrating djinn ignores same-lane blockers but remains in its assigned lane', () => {
  const duel = partieCombat();
  duel.joueur.main.push('djinn-des-braises-voilees');
  const djinn = rpgMobaJouerCreature(duel, 'joueur', 'djinn-des-braises-voilees', 'center', 0).entite;
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true); duel.sorcier.mana.braise = 10;
  const blocker = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'center', 0).entite;
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  // Fixture restores this printed ephemeral to test the engine's combat rule;
  // normal play attacks immediately, as covered above and in the board test.
  assert.equal(duel.joueur.creatures.includes(djinn), false);
  duel.joueur.main.push('djinn-des-braises-voilees'); duel.joueur.mana.braise = 10;
  const nouveauDjinn = rpgMobaJouerCreature(duel, 'joueur', 'djinn-des-braises-voilees', 'center', 0).entite;
  assert.equal(rpgPeutBloquerAttaquant(blocker, nouveauDjinn), false);
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [nouveauDjinn.id], { [nouveauDjinn.id]: [blocker.id] }).ok, false);
  assert.equal(JSON.stringify(duel), before);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [nouveauDjinn.id], {}).ok, true);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 8);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10);
});

for (const id of ['tempete-de-sable', 'vent-rouge', 'brisure-de-verre']) {
  test(`${id}: hostile area spell affects all enemy lanes, not allies`, () => {
    const duel = partieCombat();
    const ally = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'center', 0).entite;
    rpgFinDeTour(duel); duel.sorcier.mana.braise = 10;
    const enemyLeft = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
    const enemyRight = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
    rpgFinDeTour(duel); duel.joueur.main.push(id);
    for (const color of ['braise', 'sable', 'eau']) duel.joueur.mana[color] = 10;
    const res = rpgMobaLancerMagie(duel, 'joueur', id);
    assert.equal(res.ok, true);
    assert.ok(duel.joueur.creatures.includes(ally));
    assert.ok(!duel.sorcier.creatures.includes(enemyLeft));
    assert.ok(!duel.sorcier.creatures.includes(enemyRight));
    assert.equal(mobaVoie(duel.moba, 'left').slots.sorcier[0], null);
    assert.equal(mobaVoie(duel.moba, 'right').slots.sorcier[0], null);
    assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  });
}

test('Brisure de verre response reconciles the whole declared attack and ends it if all attackers die', () => {
  const duel = partieCombat();
  const a = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const b = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel.sorcier.main.push('brisure-de-verre'); duel.sorcier.mana.eau = 2;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [a.id, b.id]).ok, true);
  const res = rpgMobaLancerMagie(duel, 'sorcier', 'brisure-de-verre');
  assert.equal(res.ok, true); assert.equal(res.combatTermine, true);
  assert.equal(duel.combatDeclare, null);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('global destruction and global return reconcile all lanes without changing lane HP', () => {
  for (const id of ['la-derniere-pesee', 'ressac-de-la-lune-noire']) {
    const duel = partieCombat();
    const ally = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    rpgFinDeTour(duel); duel.sorcier.mana.braise = 10;
    const enemy = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
    rpgFinDeTour(duel); duel.joueur.main.push(id); duel.joueur.mana.tenebres = 10; duel.joueur.mana.eau = 10;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', id).ok, true);
    assert.ok(!duel.joueur.creatures.includes(ally)); assert.ok(!duel.sorcier.creatures.includes(enemy));
    const zone = id === 'la-derniere-pesee' ? 'cimetiere' : 'main';
    assert.ok(duel.joueur[zone].includes('ashigaru-des-braises'));
    assert.ok(duel.sorcier[zone].includes('ashigaru-des-braises'));
    assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 10);
    assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('new draw and milling spells use the real deck and respect no MOBA fatigue', () => {
  const duel = partieCombat();
  duel.joueur.main.push('rapport-du-greffier', 'les-feuillets');
  duel.joueur.mana.sable = 10; duel.joueur.mana.tenebres = 10;
  const own = duel.joueur.deck.length, enemy = duel.sorcier.deck.length;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'rapport-du-greffier').ok, true);
  assert.equal(duel.joueur.deck.length, own - 2);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'les-feuillets').ok, true);
  assert.equal(duel.sorcier.deck.length, enemy - 3);
  duel.joueur.deck.length = 0; duel.joueur.main.push('rapport-du-greffier');
  const life = duel.joueur.pv; const lanes = JSON.stringify(duel.moba.lanes);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'rapport-du-greffier').ok, true);
  assert.equal(duel.joueur.pv, life); assert.equal(JSON.stringify(duel.moba.lanes), lanes);
});

test('Frappe d’iaijutsu hits a selected enemy using printed instant damage', () => {
  const duel = partieCombat(); const { attacker, blocker } = poserCombattants(duel, 'right');
  duel.joueur.main.push('frappe-iaijutsu'); duel.joueur.mana.braise = 10;
  const avant = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'frappe-iaijutsu', attacker.id).raison, 'cible');
  assert.equal(JSON.stringify(duel), avant);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'frappe-iaijutsu', blocker.id).ok, true);
  assert.equal(mobaVoie(duel.moba, 'right').slots.sorcier[0], null);
  assert.ok(duel.joueur.creatures.includes(attacker));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Courant de retour returns a targeted enemy and draws without moving other lanes', () => {
  const duel = partieCombat(); const { attacker, blocker } = poserCombattants(duel, 'right');
  duel.joueur.main.push('courant-de-retour'); duel.joueur.mana.eau = 10;
  const n = duel.joueur.deck.length;
  const result = rpgMobaLancerMagie(duel, 'joueur', 'courant-de-retour', blocker.id);
  assert.equal(result.ok, true); assert.equal(result.renvoiMain, true);
  assert.equal(duel.joueur.deck.length, n - 1);
  assert.ok(duel.sorcier.main.includes('ashigaru-des-braises'));
  assert.equal(mobaVoie(duel.moba, 'right').slots.sorcier[0], null);
  assert.equal(mobaVoie(duel.moba, 'left').slots.joueur[0], attacker.id);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Voile de la lune noire shields an ally and blocks a hostile spell', () => {
  const duel = partieCombat(); const { attacker, blocker } = poserCombattants(duel, 'right');
  duel.joueur.main.push('voile-de-la-lune-noire'); duel.joueur.mana.sable = 5; duel.joueur.mana.tenebres = 5;
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'voile-de-la-lune-noire', blocker.id).raison, 'cible');
  assert.equal(JSON.stringify(duel), before);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'voile-de-la-lune-noire', attacker.id).ok, true);
  assert.equal(attacker.bouclier, 1);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id]).ok, true);
  duel.sorcier.main.push('frappe-iaijutsu'); duel.sorcier.mana.braise = 5;
  const blocked = rpgMobaLancerMagie(duel, 'sorcier', 'frappe-iaijutsu', attacker.id);
  assert.equal(blocked.ok, true); assert.equal(blocked.bouclierBloque, true);
  assert.equal(attacker.pv, 1); assert.equal(attacker.bouclier, 0);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Haut-fond reduces one enemy temporarily and expires without changing lanes', () => {
  const duel = partieCombat();
  rpgFinDeTour(duel); duel.sorcier.main.push('jarl-au-marteau-de-guerre'); duel.sorcier.mana.neige = 10;
  const jarl = rpgMobaJouerCreature(duel, 'sorcier', 'jarl-au-marteau-de-guerre', 'center', 0).entite;
  rpgFinDeTour(duel); duel.joueur.main.push('haut-fond'); duel.joueur.mana.eau = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'haut-fond', jarl.id).ok, true);
  assert.equal(jarl.atk, 4, 'printed Furie activates after the defence loss'); assert.equal(jarl.pv, 3); assert.equal(jarl.pvMax, 3);
  assert.equal(mobaVoie(duel.moba, 'center').slots.sorcier[0], jarl.id);
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.equal(jarl.atk, 3); assert.equal(jarl.pv, 5); assert.equal(jarl.pvMax, 5);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Lame de mer exiles a creature without triggering its scheduled death return', () => {
  const duel = partieCombat();
  rpgFinDeTour(duel); duel.sorcier.main.push('anqa-des-braises'); duel.sorcier.mana.braise = 10;
  const anqa = rpgMobaJouerCreature(duel, 'sorcier', 'anqa-des-braises', 'center', 0).entite;
  // A wounded Anqa is within the printed -3 defence threshold.
  anqa.pv = 2;
  rpgFinDeTour(duel); duel.joueur.main.push('lame-de-mer'); duel.joueur.mana.eau = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'lame-de-mer', anqa.id).ok, true);
  assert.equal(duel.sorcier.creatures.includes(anqa), false);
  assert.equal(mobaVoie(duel.moba, 'center').slots.sorcier[0], null);
  assert.equal(duel.sorcier.cimetiere.includes('anqa-des-braises'), false);
  assert.equal(duel.sorcier.retoursProgrammes.length, 0);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('rapid Overkill crosses only its own lane even when blocked', () => {
  const duel = partieCombat();
  rpgFinDeTour(duel); duel.sorcier.mana.braise = 10;
  const blocker = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel); duel.joueur.main.push('djinn-du-dernier-brasier'); duel.joueur.mana.braise = 10;
  const djinn = rpgMobaJouerCreature(duel, 'joueur', 'djinn-du-dernier-brasier', 'left', 0).entite;
  assert.equal(rpgPeutBloquerAttaquant(blocker, djinn), true);
  const res = rpgMobaLancerAttaque(duel, 'joueur', [djinn.id], { [djinn.id]: [blocker.id] });
  assert.equal(res.ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 7);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 10);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('the global destruction spell preserves Anqa’s lane-linked scheduled return', () => {
  const duel = partieCombat(); duel.joueur.main.push('anqa-des-braises');
  const anqa = rpgMobaJouerCreature(duel, 'joueur', 'anqa-des-braises', 'right', 1).entite;
  duel.joueur.main.push('la-derniere-pesee'); duel.joueur.mana.tenebres = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'la-derniere-pesee').ok, true);
  assert.ok(!duel.joueur.creatures.includes(anqa));
  assert.equal(mobaVoie(duel.moba, 'right').slots.joueur[1], null);
  assert.equal(duel.joueur.retoursProgrammes[0].mobaLane, 'right');
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('new draw arrivals keep printed targeting and do not change lane rules', () => {
  for (const id of ['djinn-de-la-flamme-mourante', 'scalde-des-runes', 'valkyrie-au-corbeau']) {
    const duel = partieCombat();
    duel.joueur.main = [id];
    duel.joueur.deck = ['ashigaru-des-braises', 'viking-des-neiges'];
    duel.joueur.mana.neige = 10; duel.joueur.mana.braise = 10;
    const played = rpgMobaJouerCreature(duel, 'joueur', id, 'left', 1);
    assert.equal(played.ok, true, id);
    assert.equal(duel.joueur.main.length, 1);
    assert.equal(duel.joueur.main[0], 'viking-des-neiges', id);
    assert.equal(mobaVoie(duel.moba, 'left').slots.joueur[1], played.entite.id);
    if (id === 'djinn-de-la-flamme-mourante') {
      assert.equal(rpgPeutAttaquer(played.entite), true);
      assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [played.entite.id], {}).ok, true);
      assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 8);
      assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
      assert.ok(duel.joueur.cimetiere.includes(id));
    }
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
  const duel = partieCombat();
  duel.joueur.mana.neige = 10; duel.joueur.main = ['valkyrie-au-corbeau'];
  duel.joueur.deck = ['ashigaru-des-braises'];
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'valkyrie-au-corbeau', 'center', 0).ok, true);
  assert.deepEqual(duel.joueur.main, [], 'no Viking means no draw, and no fatigue');
  assert.equal(duel.joueur.deck.length, 1);
});

test('Veilleuse chooses a friendly creature, including across lanes, to shield', () => {
  const duel = partieCombat();
  duel.joueur.main.push('veilleuse-des-citernes'); duel.joueur.mana.eau = 10;
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const veilleuse = rpgMobaJouerCreature(duel, 'joueur', 'veilleuse-des-citernes', 'right', 0);
  assert.equal(veilleuse.arriveeEnAttente, true);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', 'sorcier').raison, 'cible');
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', ally.id).ok, true);
  assert.equal(ally.bouclier, 1);
  assert.equal(veilleuse.entite.bouclier ?? 0, 0);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  const seule = partieCombat();
  seule.joueur.main = ['veilleuse-des-citernes']; seule.joueur.mana.eau = 10;
  const poseSeule = rpgMobaJouerCreature(seule, 'joueur', 'veilleuse-des-citernes', 'center', 0);
  assert.equal(poseSeule.arriveeEnAttente, undefined);
  assert.equal(poseSeule.entite.bouclier, 1, 'the classic fallback protects her when no other ally exists');
});

test('new death effects draw or mill exactly once and keep lanes in sync', () => {
  for (const id of ['scribe-des-feuillets', 'drakkar-a-tete-de-dragon']) {
    const duel = partieCombat();
    duel.joueur.main = [id, 'tempete-de-foudre-et-de-givre'];
    duel.joueur.deck = ['viking-des-neiges'];
    duel.sorcier.deck = ['ashigaru-des-braises'];
    duel.joueur.mana.neige = 15; duel.joueur.mana.tenebres = 15;
    const entity = rpgMobaJouerCreature(duel, 'joueur', id, 'right', 0).entite;
    assert.ok(entity, id);
    if (id === 'drakkar-a-tete-de-dragon') { entity.ready = true; assert.equal(rpgPeutAttaquer(entity), false); entity.pv = 1; }
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'tempete-de-foudre-et-de-givre').ok, true);
    assert.equal(duel.joueur.creatures.includes(entity), false);
    assert.equal(mobaVoie(duel.moba, 'right').slots.joueur[0], null);
    if (id === 'scribe-des-feuillets') {
      assert.equal(duel.sorcier.deck.length, 0);
      assert.deepEqual(duel.sorcier.cimetiere, ['ashigaru-des-braises']);
    } else {
      assert.ok(duel.joueur.main.includes('viking-des-neiges'));
      assert.equal(duel.joueur.deck.length, 0);
    }
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('conquest exiles new death-trigger creatures without firing death effects', () => {
  const duel = partieCombat();
  duel.joueur.main = ['scribe-des-feuillets']; duel.joueur.mana.tenebres = 10;
  const scribe = rpgMobaJouerCreature(duel, 'joueur', 'scribe-des-feuillets', 'center', 0).entite;
  duel.sorcier.deck = ['ashigaru-des-braises'];
  scribe.ready = true;
  mobaInfliger(duel.moba, 'joueur', 'center', 8);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [scribe.id], {}).ok, true);
  assert.equal(mobaVoie(duel.moba, 'center').active, false);
  assert.deepEqual(duel.sorcier.deck, ['ashigaru-des-braises']);
  assert.deepEqual(duel.sorcier.cimetiere, []);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('targeted Ténèbres destruction accepts either camp and enforces printed cost thresholds', () => {
  const duel = partieCombat();
  duel.joueur.mana.neige = 15; duel.joueur.mana.tenebres = 15;
  duel.joueur.main.push('jarl-au-marteau-de-guerre', 'effacement-des-faibles', 'le-jugement-des-colosses');
  const petit = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const grand = rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'right', 0).entite;
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'effacement-des-faibles', grand.id).raison, 'cible');
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'le-jugement-des-colosses', petit.id).raison, 'cible');
  assert.equal(JSON.stringify(duel), before, 'invalid targets spend neither mana nor cards');
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'effacement-des-faibles', petit.id).ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').slots.joueur[0], null);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'le-jugement-des-colosses', grand.id).ok, true);
  assert.equal(mobaVoie(duel.moba, 'right').slots.joueur[0], null);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Neige noire pays the chosen lane, destroys cheap creatures across lanes and freezes survivors', () => {
  const duel = partieCombat();
  duel.joueur.mana.neige = 15; duel.joueur.mana.tenebres = 15;
  duel.joueur.main.push('jarl-au-marteau-de-guerre', 'neige-noire');
  const cheap = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const large = rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'right', 0).entite;
  mobaInfliger(duel.moba, 'sorcier', 'center', 7);
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'neige-noire', null, 'center').raison, 'prix');
  assert.equal(JSON.stringify(duel), before);
  const result = rpgMobaLancerMagie(duel, 'joueur', 'neige-noire', null, 'right');
  assert.equal(result.ok, true);
  assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, 7);
  assert.equal(mobaVoie(duel.moba, 'center').hp.joueur, 3);
  assert.equal(duel.joueur.creatures.includes(cheap), false);
  assert.equal(duel.joueur.creatures.includes(large), true);
  assert.ok(large.gelToursRestants > 0);
  assert.equal(duel.joueur.pv, 25);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Nuage de cendres hits enemies and its next-turn echo keeps lane slots coherent', () => {
  const duel = partieCombat();
  duel.joueur.main.push('nuage-de-cendres'); duel.joueur.mana.braise = 15;
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel);
  duel.sorcier.mana.neige = 15;
  duel.sorcier.main.push('jarl-au-marteau-de-guerre');
  const enemy = rpgMobaJouerCreature(duel, 'sorcier', 'jarl-au-marteau-de-guerre', 'right', 0).entite;
  rpgFinDeTour(duel);
  duel.joueur.mana.braise = 15;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'nuage-de-cendres').ok, true);
  assert.equal(enemy.pv, 3); assert.equal(ally.pv, 1);
  assert.equal(duel.sorcier.degatsEchos.length, 1);
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.equal(enemy.pv, 3, 'echo waits until the caster’s next turn');
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  assert.equal(enemy.pv, 2); assert.equal(duel.sorcier.degatsEchos.length, 0);
  assert.equal(mobaVoie(duel.moba, 'right').slots.sorcier[0], enemy.id);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('allied arrival choices heal or grant infiltration without affecting unrelated lanes', () => {
  const duel = partieCombat();
  duel.joueur.mana.neige = 10; duel.joueur.mana.sable = 10;
  duel.joueur.main.push('volva-soigneuse', 'faiseur-de-passage');
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const volva = rpgMobaJouerCreature(duel, 'joueur', 'volva-soigneuse', 'right', 0);
  assert.equal(volva.arriveeEnAttente, true);
  volva.entite.pv = 1;
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', volva.entite.id).ok, true);
  assert.equal(volva.entite.pv, volva.entite.pvMax);
  const faiseur = rpgMobaJouerCreature(duel, 'joueur', 'faiseur-de-passage', 'center', 0);
  assert.equal(faiseur.arriveeEnAttente, true);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', faiseur.entite.id).raison, 'cible');
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', ally.id).ok, true);
  assert.equal(ally.infiltration, true);
  assert.equal(volva.entite.infiltration, false);
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.equal(ally.infiltration, false);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const id of ['vipere-de-verre', 'sonneur-fele', 'corbeau-de-givre']) test(`${id} arrival permits the opponent a real response`, () => {
  const duel = partieCombat();
  const target = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  duel.joueur.main.push('parade-du-verre'); duel.joueur.mana.eau = 10;
  rpgFinDeTour(duel);
  duel.sorcier.main = [id];
  duel.sorcier.mana.eau = 10; duel.sorcier.mana.neige = 10; duel.sorcier.mana.tenebres = 10;
  const result = rpgMobaJouerCreature(duel, 'sorcier', id, 'right', 0);
  assert.equal(result.arriveeEnAttente, true);
  const choice = rpgMobaResoudreArrivee(duel, 'sorcier', target.id);
  assert.equal(choice.ok, true);
  assert.equal(choice.effetEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'parade-du-verre', target.id).ok, true);
  assert.equal(rpgMobaPasserEffetCreature(duel, 'joueur').ok, true);
  assert.equal(duel.joueur.creatures.includes(target), true, 'shield blocked the arrival effect');
  assert.equal(target.bouclier, 0);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Corbeau only targets creatures of cost three or less, without spending another action on refusal', () => {
  const duel = partieCombat(); duel.joueur.mana.neige = 10;
  duel.joueur.main.push('jarl-au-marteau-de-guerre');
  const target = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const jarl = rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'right', 0).entite;
  rpgFinDeTour(duel); duel.sorcier.main = ['corbeau-de-givre'];
  duel.sorcier.mana.neige = 10; duel.sorcier.mana.tenebres = 10;
  assert.equal(rpgMobaJouerCreature(duel, 'sorcier', 'corbeau-de-givre', 'center', 0).arriveeEnAttente, true);
  assert.equal(rpgMobaResoudreArrivee(duel, 'sorcier', jarl.id).raison, 'cible');
  assert.equal(rpgMobaResoudreArrivee(duel, 'sorcier', target.id).ok, true);
  assert.ok(target.gelToursRestants > 0);
  assert.equal(jarl.gelToursRestants ?? 0, 0);
});

test('global creature arrivals reconcile destroyed or returned entities in all lanes', () => {
  for (const id of ['geant-des-banquises', 'leviathan']) {
    const duel = partieCombat(); duel.joueur.mana.neige = 15; duel.joueur.mana.eau = 15;
    const ally = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    rpgFinDeTour(duel); duel.sorcier.mana.braise = 10;
    const enemy = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
    rpgFinDeTour(duel); duel.joueur.mana.neige = 15; duel.joueur.mana.eau = 15;
    duel.joueur.main.push(id);
    const result = rpgMobaJouerCreature(duel, 'joueur', id, 'center', 0);
    assert.equal(result.ok, true, id);
    assert.equal(mobaVoie(duel.moba, 'center').slots.joueur[0], result.entite.id);
    assert.equal(mobaVoie(duel.moba, 'right').slots.sorcier[0], null);
    assert.equal(duel.sorcier.creatures.includes(enemy), false);
    if (id === 'leviathan') {
      assert.equal(duel.joueur.creatures.includes(ally), false);
      assert.equal(mobaVoie(duel.moba, 'left').slots.joueur[0], null);
      assert.ok(duel.joueur.main.includes(ally.carteId));
      assert.ok(duel.sorcier.main.includes(enemy.carteId));
    } else {
      assert.equal(duel.joueur.creatures.includes(ally), true);
      assert.ok(duel.sorcier.cimetiere.includes(enemy.carteId));
    }
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('targeted attacks must choose a legal creature in the same lane and stop at that creature', () => {
  const duel = partieCombat();
  rpgFinDeTour(duel); duel.sorcier.mana.braise = 10;
  duel.sorcier.main.push('ashigaru-des-braises', 'ashigaru-des-braises');
  const left = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  const right = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
  rpgFinDeTour(duel); duel.joueur.mana.braise = 10;
  duel.joueur.main.push('feriel');
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'feriel', 'left', 0).entite;
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id]).raison, 'cible-obligatoire');
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id], { [attacker.id]: right.id }).raison, 'cible');
  assert.equal(JSON.stringify(duel), before);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id], { [attacker.id]: left.id }).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], { [attacker.id]: [left.id] }, { declaree: true }).raison, 'blocage');
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {}, { declaree: true }).ok, true);
  assert.equal(duel.sorcier.creatures.includes(left), false);
  assert.equal(duel.sorcier.creatures.includes(right), true);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('targeted attack goes to its lane when enemies exist only in other lanes', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 10;
  rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0);
  rpgFinDeTour(duel); duel.joueur.mana.braise = 10; duel.joueur.main.push('feriel');
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'feriel', 'left', 0).entite;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {}, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10 - attacker.atk);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10);
});

test('removing one targeted attacker during a response keeps the remaining declaration valid', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 10;
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel); duel.joueur.mana.braise = 10; duel.joueur.main.push('feriel');
  const rapid = rpgMobaJouerCreature(duel, 'joueur', 'feriel', 'left', 0).entite;
  const normal = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  normal.ready = true;
  duel.sorcier.main.push('trait-de-braise'); duel.sorcier.mana.braise = 10;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [rapid.id, normal.id], { [rapid.id]: target.id }).ok, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'trait-de-braise', rapid.id).ok, true);
  assert.deepEqual(duel.combatDeclare.attaquants, [normal.id]);
  assert.deepEqual(duel.combatDeclare.ciblesAttaque, {});
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [normal.id], {}, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 9);
});

test('only a defender in the same lane attracts targeted attacks', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 10;
  duel.sorcier.main.push('ashigaru-des-braises', 'ashigaru-des-braises');
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  const defender = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 1).entite;
  defender.defenseur = true;
  rpgFinDeTour(duel); duel.joueur.mana.braise = 10; duel.joueur.main.push('feriel');
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'feriel', 'left', 0).entite;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id], { [attacker.id]: target.id }).raison, 'cible');
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id], { [attacker.id]: defender.id }).ok, true);
});

test('a disappeared targeted creature does not redirect its attack to lane HP', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 10;
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel); duel.joueur.mana.braise = 10; duel.joueur.main.push('feriel');
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'feriel', 'left', 0).entite;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id], { [attacker.id]: target.id }).ok, true);
  // Model a target leaving during the response window, including lane cleanup.
  duel.sorcier.creatures = duel.sorcier.creatures.filter((entity) => entity.id !== target.id);
  assert.equal(mobaRetirer(duel.moba, 'sorcier', target.id).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {}, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Rempart grants shields to allies across lanes including itself, but not the enemy', () => {
  const duel = partieCombat(); duel.joueur.mana.sable = 20;
  const a = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const b = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  rpgFinDeTour(duel); duel.sorcier.mana.braise = 10;
  const enemy = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'center', 0).entite;
  rpgFinDeTour(duel); duel.joueur.mana.sable = 20; duel.joueur.main.push('rempart-des-sables-eternels');
  const result = rpgMobaJouerCreature(duel, 'joueur', 'rempart-des-sables-eternels', 'center', 0);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.ok(a.bouclier > 0); assert.ok(b.bouclier > 0); assert.ok(result.entite.bouclier > 0);
  assert.equal(enemy.bouclier, 0); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Tin Hinan grants temporary infiltration to other allies across lanes', () => {
  const duel = partieCombat();
  const a = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const b = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  duel.joueur.mana.sable = 10; duel.joueur.main.push('tin-hinan');
  const result = rpgMobaJouerCreature(duel, 'joueur', 'tin-hinan', 'center', 0);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(a.infiltration, true); assert.equal(b.infiltration, true);
  assert.equal(result.entite.infiltration, false);
  rpgFinDeTour(duel); assert.equal(a.infiltration, false); assert.equal(b.infiltration, false);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Serpent du monde replaces both hands without leaking into lane placement', () => {
  const duel = partieCombat(); duel.joueur.mana.neige = 10;
  duel.joueur.main = ['serpent-du-monde', 'trait-de-braise', 'verglas'];
  duel.sorcier.main = ['ressac', 'poigne-de-givre'];
  duel.joueur.deck = ['ashigaru-des-braises', 'viking-des-neiges', 'loup-des-neiges'];
  duel.sorcier.deck = ['ashigaru-des-braises', 'viking-des-neiges', 'loup-des-neiges'];
  const result = rpgMobaJouerCreature(duel, 'joueur', 'serpent-du-monde', 'right', 1);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(duel.joueur.main.length, 3); assert.equal(duel.sorcier.main.length, 3);
  assert.ok(duel.joueur.cimetiere.includes('verglas')); assert.ok(duel.sorcier.cimetiere.includes('ressac'));
  assert.ok(result.entite.bouclier > 0); assert.equal(result.entite.overkill, true);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Ifrit al-Ahmar resonates with Djinns of both camps across lanes, not itself', () => {
  const duel = partieCombat(); duel.joueur.mana.braise = 20;
  duel.joueur.main.push('djinn-des-braises-voilees', 'ifrit-al-ahmar');
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'djinn-des-braises-voilees', 'left', 0).entite;
  const beforeAlly = ally.atk;
  const result = rpgMobaJouerCreature(duel, 'joueur', 'ifrit-al-ahmar', 'center', 0);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(ally.atk, beforeAlly + 2);
  assert.equal(result.entite.atk, 3);
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  duel.sorcier.mana.braise = 20; duel.sorcier.main.push('djinn-des-braises-voilees');
  const enemyResult = rpgMobaJouerCreature(duel, 'sorcier', 'djinn-des-braises-voilees', 'right', 0);
  assert.equal(enemyResult.ok, true, JSON.stringify(enemyResult));
  assert.equal(enemyResult.entite.atk, beforeAlly + 2);
  assert.equal(result.entite.atk, 3);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Serment de la forge gives same-lane targeted attacks and expires at end of turn', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 10;
  const enemy = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel); duel.joueur.mana.braise = 20;
  const a = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const b = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  a.ready = true; b.ready = true;
  duel.joueur.main.push('serment-de-la-forge');
  const result = rpgMobaLancerMagie(duel, 'joueur', 'serment-de-la-forge');
  assert.equal(result.ok, true, JSON.stringify(result)); assert.equal(a.atk, 3); assert.equal(b.atk, 3);
  assert.equal(a.coupRapide, true); assert.equal(b.coupRapide, true);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [a.id]).raison, 'cible-obligatoire');
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [a.id, b.id], { [a.id]: enemy.id }).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [a.id, b.id], {}, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 7);
  rpgFinDeTour(duel); assert.equal(a.coupRapide, false); assert.equal(b.coupRapide, false);
  assert.equal(a.atk, 1); assert.equal(b.atk, 1);
});

test('Gardien provokes only blockers in its lane and retaliates against targeted attacks', () => {
  const duel = partieCombat(); duel.joueur.mana.braise = 20; duel.joueur.main.push('gardien-de-la-porte-ardente');
  const guard = rpgMobaJouerCreature(duel, 'joueur', 'gardien-de-la-porte-ardente', 'left', 0).entite;
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  duel.sorcier.mana.braise = 20; duel.sorcier.main.push('feriel');
  const attacker = rpgMobaJouerCreature(duel, 'sorcier', 'feriel', 'left', 0).entite;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'sorcier', [attacker.id], { [attacker.id]: guard.id }).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'sorcier', [attacker.id], {}, { declaree: true }).ok, true);
  assert.equal(attacker.pv, 1); assert.equal(guard.pv, 1);
  duel.sorcier.main.push('ashigaru-des-braises');
  const blocker = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 1).entite;
  assert.ok(blocker);
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [guard.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [guard.id], {}, { declaree: true }).raison, 'provocation');
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [guard.id], { [guard.id]: [blocker.id] }, { declaree: true }).ok, true);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('opponent discard gives the human a mandatory private choice without ending the AI turn', () => {
  const duel = partieCombat(); assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  duel.sorcier.mana.tenebres = 10; duel.sorcier.main.push('nom-efface');
  duel.joueur.main = ['trait-de-braise', 'verglas'];
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'nom-efface').ok, true);
  assert.equal(duel.defausseEnAttente.cote, 'joueur');
  assert.equal(rpgMobaTerminerTour(duel, 'sorcier').raison, 'timing');
  assert.equal(rpgMobaDefausser(duel, 'sorcier', 0).raison, 'timing');
  assert.equal(rpgMobaDefausser(duel, 'joueur', 8).raison, 'hors-main');
  assert.equal(rpgMobaDefausser(duel, 'joueur', 1).ok, true);
  assert.deepEqual(duel.joueur.main, ['trait-de-braise']);
  assert.equal(duel.tour, 'sorcier'); assert.equal(duel.defausseEnAttente, null);
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
});

test('Celle qui pèse discards on arrival and Ibis and Routier draw before a chosen discard', () => {
  const duel = partieCombat(); duel.joueur.mana.tenebres = 20; duel.joueur.mana.sable = 20; duel.joueur.mana.eau = 20;
  duel.sorcier.main = ['ashigaru-des-braises', 'verglas'];
  duel.joueur.main.push('celle-qui-pese', 'ibis-des-comptes', 'le-routier');
  const beforeEnemy = duel.sorcier.main.length;
  const celle = rpgMobaJouerCreature(duel, 'joueur', 'celle-qui-pese', 'left', 0);
  assert.equal(celle.ok, true, JSON.stringify(celle)); assert.equal(duel.sorcier.main.length, beforeEnemy - 1);
  const beforeDeck = duel.joueur.deck.length;
  const ibis = rpgMobaJouerCreature(duel, 'joueur', 'ibis-des-comptes', 'center', 0);
  assert.equal(ibis.ok, true, JSON.stringify(ibis)); assert.equal(duel.joueur.deck.length, beforeDeck - 1);
  assert.equal(duel.defausseEnAttente.cote, 'joueur');
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'le-routier').raison, 'timing');
  assert.equal(rpgMobaDefausser(duel, 'joueur', 0).ok, true);
  const deckRoutier = duel.joueur.deck.length;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'le-routier').ok, true);
  assert.equal(duel.joueur.deck.length, deckRoutier - 2);
  assert.equal(duel.defausseEnAttente.cote, 'joueur');
  assert.equal(rpgMobaDefausser(duel, 'joueur', 0).ok, true);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Amayas and Jörmungandr allow the human to choose the card discarded after drawing', () => {
  const duel = partieCombat(); duel.joueur.mana.sable = 20; duel.joueur.mana.eau = 20;
  duel.joueur.main.push('amayas-du-hoggar', 'jormungandr');
  let before = duel.joueur.deck.length;
  const amayas = rpgMobaJouerCreature(duel, 'joueur', 'amayas-du-hoggar', 'left', 0);
  assert.equal(amayas.ok, true, JSON.stringify(amayas));
  assert.equal(duel.joueur.deck.length, before - 1);
  assert.equal(duel.defausseEnAttente.cote, 'joueur');
  assert.equal(rpgMobaDefausser(duel, 'joueur', 0).ok, true);
  before = duel.joueur.deck.length;
  const serpent = rpgMobaJouerCreature(duel, 'joueur', 'jormungandr', 'right', 1);
  assert.equal(serpent.ok, true, JSON.stringify(serpent)); assert.ok(serpent.entite.bouclier > 0);
  assert.equal(duel.joueur.deck.length, before - 3);
  assert.equal(duel.defausseEnAttente.cote, 'joueur');
  assert.equal(rpgMobaDefausser(duel, 'joueur', 0).ok, true);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Yamina heals all allies and only her own lane, and Dame heals her lane before a targeted attack', () => {
  const duel = partieCombat(); duel.joueur.mana.eau = 20; duel.joueur.mana.neige = 20;
  const legacyHp = duel.joueur.pv; duel.joueur.main.push('loup-des-neiges');
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'loup-des-neiges', 'left', 0).entite;
  // A wounded ally can receive Yamina's global creature heal.
  ally.pv = 1;
  assert.equal(mobaInfliger(duel.moba, 'sorcier', 'left', 6).ok, true);
  assert.equal(mobaInfliger(duel.moba, 'sorcier', 'right', 7).ok, true);
  duel.joueur.main.push('yamina', 'dame-des-neuf-mondes');
  const yamina = rpgMobaJouerCreature(duel, 'joueur', 'yamina', 'left', 1);
  assert.equal(yamina.ok, true, JSON.stringify(yamina));
  assert.equal(ally.pv, ally.pvMax); assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 9);
  assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, 3);
  const dame = rpgMobaJouerCreature(duel, 'joueur', 'dame-des-neuf-mondes', 'right', 0);
  assert.equal(dame.ok, true, JSON.stringify(dame));
  assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 9);
  assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, 10);
  assert.equal(dame.entite.coupRapide, true);
  assert.equal(duel.joueur.pv, legacyHp); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('La Dévoreuse only targets enemies; without one it never gets stuck on an allied target', () => {
  const duel = partieCombat(); duel.joueur.mana.tenebres = 15;
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  duel.joueur.main.push('la-devoreuse');
  const result = rpgMobaJouerCreature(duel, 'joueur', 'la-devoreuse', 'right', 0);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.arriveeEnAttente ?? false, false);
  assert.ok(!duel.arriveeEnAttente); assert.ok(duel.joueur.creatures.includes(ally));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const id of ['la-devoreuse', 'valkyrie-des-neuf-nuits', 'pere-des-corbeaux', 'maitre-des-corbeaux']) test(`${id} exile offers an enemy response and reconciles lanes`, () => {
  const duel = partieCombat();
  const target = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  duel.joueur.main.push('parade-du-verre'); duel.joueur.mana.eau = 10;
  rpgFinDeTour(duel); duel.sorcier.main = [id];
  duel.sorcier.mana.neige = 15; duel.sorcier.mana.tenebres = 15;
  const result = rpgMobaJouerCreature(duel, 'sorcier', id, 'right', 0);
  assert.equal(result.ok, true, JSON.stringify(result)); assert.equal(result.arriveeEnAttente, true);
  const choice = rpgMobaResoudreArrivee(duel, 'sorcier', target.id);
  assert.equal(choice.ok, true); assert.equal(choice.effetEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'parade-du-verre', target.id).ok, true);
  assert.equal(rpgMobaPasserEffetCreature(duel, 'joueur').ok, true);
  assert.ok(duel.joueur.creatures.includes(target), 'shield blocks the exile');
  assert.equal(target.bouclier, 0); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('neutral exile enforces cost thresholds, excludes the source and permits other allies', () => {
  for (const id of ['valkyrie-des-neuf-nuits', 'pere-des-corbeaux', 'maitre-des-corbeaux']) {
    const duel = partieCombat(); duel.joueur.mana.neige = 15; duel.joueur.mana.tenebres = 15;
    duel.joueur.main.push('jarl-au-marteau-de-guerre', id);
    const cheap = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
    const expensive = rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'right', 0).entite;
    const result = rpgMobaJouerCreature(duel, 'joueur', id, 'center', 0);
    assert.equal(result.ok, true, JSON.stringify(result)); assert.equal(result.arriveeEnAttente, true);
    assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', result.entite.id).raison, 'cible');
    assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', expensive.id).raison, 'cible');
    assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', cheap.id).ok, true);
    assert.ok(duel.joueur.exil.includes(cheap.carteId));
    assert.equal(mobaVoie(duel.moba, 'left').slots.joueur[0], null);
    assert.ok(duel.joueur.creatures.includes(expensive)); assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Père des corbeaux returns to its original lane, exiling an eligible enemy on return', () => {
  const duel = partieCombat(); duel.joueur.mana.neige = 15;
  duel.joueur.main.push('pere-des-corbeaux', 'grand-hiver');
  const pere = rpgMobaJouerCreature(duel, 'joueur', 'pere-des-corbeaux', 'right', 0);
  assert.equal(pere.ok, true, JSON.stringify(pere)); assert.equal(pere.arriveeEnAttente ?? false, false);
  pere.entite.pv = 1;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver').ok, true);
  assert.equal(duel.joueur.retoursProgrammes[0].mobaLane, 'right');
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  duel.sorcier.mana.braise = 10; duel.sorcier.main.push('ashigaru-des-braises');
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  const returned = duel.joueur.creatures.find((e) => e.carteId === 'pere-des-corbeaux');
  assert.ok(returned); assert.equal(returned.mobaLane, 'right'); assert.equal(returned.tenaciteDisponible, false);
  assert.equal(duel.sorcier.creatures.includes(target), false);
  assert.ok(duel.sorcier.exil.includes(target.carteId));
  assert.equal(mobaVoie(duel.moba, 'left').slots.sorcier[0], null);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Appât requires a marked blocker only when a legal attacker is in its lane', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 10;
  duel.sorcier.main.push('ashigaru-des-braises');
  const left = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  const right = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
  rpgFinDeTour(duel); duel.joueur.mana.braise = 10; duel.joueur.mana.neige = 10;
  duel.joueur.main.push('feriel', 'appat-de-la-meute');
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'feriel', 'center', 0).entite;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'appat-de-la-meute', right.id).ok, true);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {}, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 7);
  assert.equal(right.blocageForce, null); assert.ok(duel.sorcier.creatures.includes(left));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Appât forces a same-lane blocker, but targeted attacks against a creature cannot be blocked', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 10;
  const blocker = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel); duel.joueur.mana.braise = 10; duel.joueur.mana.neige = 10;
  duel.joueur.main.push('ashigaru-des-braises', 'appat-de-la-meute');
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite; attacker.ready = true;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'appat-de-la-meute', blocker.id).ok, true);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {}, { declaree: true }).raison, 'blocage-force');
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], { [attacker.id]: [blocker.id] }, { declaree: true }).ok, true);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  const next = partieCombat(); rpgFinDeTour(next); next.sorcier.mana.braise = 10;
  const target = rpgMobaJouerCreature(next, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(next); next.joueur.mana.braise = 10; next.joueur.mana.neige = 10;
  next.joueur.main.push('feriel', 'appat-de-la-meute');
  const rapid = rpgMobaJouerCreature(next, 'joueur', 'feriel', 'left', 0).entite;
  assert.equal(rpgMobaLancerMagie(next, 'joueur', 'appat-de-la-meute', target.id).ok, true);
  assert.equal(rpgMobaDeclarerAttaque(next, 'joueur', [rapid.id], { [rapid.id]: target.id }).ok, true);
  assert.equal(rpgMobaLancerAttaque(next, 'joueur', [rapid.id], {}, { declaree: true }).ok, true);
});

test('Embuscade marks enemies across lanes but forces only possible same-lane blocks', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.neige = 10; duel.sorcier.main.push('loup-des-neiges', 'jarl-au-marteau-de-guerre');
  const left = rpgMobaJouerCreature(duel, 'sorcier', 'loup-des-neiges', 'left', 0).entite;
  const right = rpgMobaJouerCreature(duel, 'sorcier', 'jarl-au-marteau-de-guerre', 'right', 0).entite;
  rpgFinDeTour(duel); duel.joueur.mana.braise = 10; duel.joueur.mana.neige = 10;
  duel.joueur.main.push('ashigaru-des-braises', 'embuscade');
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite; attacker.ready = true;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'embuscade').ok, true);
  assert.equal(left.atk, 2); assert.equal(left.pv, 1); assert.equal(right.blocageForce.par, 'joueur');
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {}, { declaree: true }).raison, 'blocage-force');
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], { [attacker.id]: [left.id] }, { declaree: true }).ok, true);
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.equal(right.blocageForce, null); assert.equal(right.atk, 3); assert.equal(right.pv, 5);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Embuscade expires without inflating low or wounded creatures clipped at the 1/1 floor', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 10; duel.sorcier.mana.neige = 10;
  duel.sorcier.main.push('ashigaru-des-braises', 'loup-des-neiges');
  const small = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  const wounded = rpgMobaJouerCreature(duel, 'sorcier', 'loup-des-neiges', 'right', 0).entite;
  wounded.pv = 1; wounded.def = 1;
  rpgFinDeTour(duel); duel.joueur.mana.neige = 10; duel.joueur.main.push('embuscade');
  const before = { atk: small.atk, pv: small.pv, max: small.pvMax, woundedPv: wounded.pv, woundedMax: wounded.pvMax };
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'embuscade').ok, true);
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.equal(small.atk, before.atk); assert.equal(small.pv, before.pv); assert.equal(small.pvMax, before.max);
  assert.equal(wounded.pv, before.woundedPv); assert.equal(wounded.pvMax, before.woundedMax);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Appât in a response window persists for its caster’s next attack, not the current enemy attack', () => {
  const duel = partieCombat(); duel.joueur.mana.braise = 10; duel.joueur.mana.neige = 10;
  const futureAttacker = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  duel.joueur.main.push('appat-de-la-meute');
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  duel.sorcier.mana.braise = 10; duel.sorcier.main.push('feriel', 'ashigaru-des-braises');
  const attacker = rpgMobaJouerCreature(duel, 'sorcier', 'feriel', 'right', 0).entite;
  const futureBlocker = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'sorcier', [attacker.id]).ok, true);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'appat-de-la-meute', futureBlocker.id).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'sorcier', [attacker.id], {}, { declaree: true }).ok, true);
  assert.equal(futureBlocker.blocageForce.par, 'joueur');
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [futureAttacker.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [futureAttacker.id], {}, { declaree: true }).raison, 'blocage-force');
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [futureAttacker.id], { [futureAttacker.id]: [futureBlocker.id] }, { declaree: true }).ok, true);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Kraken targets only opposing ships, permits a response, and Drakkar death draws', () => {
  const duel = partieCombat(); duel.joueur.mana.neige = 15;
  duel.joueur.main.push('drakkar-a-tete-de-dragon');
  const ship = rpgMobaJouerCreature(duel, 'joueur', 'drakkar-a-tete-de-dragon', 'left', 0).entite;
  const nonShip = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  duel.joueur.main.push('parade-du-verre'); duel.joueur.mana.eau = 10;
  rpgFinDeTour(duel); duel.sorcier.main = ['kraken']; duel.sorcier.mana.eau = 15;
  const kraken = rpgMobaJouerCreature(duel, 'sorcier', 'kraken', 'center', 0);
  assert.equal(kraken.ok, true, JSON.stringify(kraken)); assert.equal(kraken.arriveeEnAttente, true);
  assert.equal(rpgMobaResoudreArrivee(duel, 'sorcier', nonShip.id).raison, 'cible');
  const deck = duel.joueur.deck.length;
  assert.equal(rpgMobaResoudreArrivee(duel, 'sorcier', ship.id).effetEnAttente, true);
  assert.equal(rpgMobaPasserEffetCreature(duel, 'joueur').ok, true);
  assert.equal(duel.joueur.creatures.includes(ship), false);
  assert.equal(duel.joueur.deck.length, deck - 1);
  assert.equal(mobaVoie(duel.moba, 'left').slots.joueur[0], null);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Kraken enters without waiting when there is no eligible ship', () => {
  const duel = partieCombat(); duel.joueur.mana.eau = 10; duel.joueur.main.push('kraken');
  const result = rpgMobaJouerCreature(duel, 'joueur', 'kraken', 'center', 0);
  assert.equal(result.ok, true, JSON.stringify(result)); assert.ok(!result.arriveeEnAttente);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Butin attackers in different lanes each draw and require one human discard', () => {
  const duel = partieCombat(); duel.joueur.mana.sable = 20; duel.joueur.mana.eau = 20;
  duel.joueur.main.push('fennec-des-decombres', 'le-renegat');
  const fennec = rpgMobaJouerCreature(duel, 'joueur', 'fennec-des-decombres', 'left', 0).entite;
  const renegat = rpgMobaJouerCreature(duel, 'joueur', 'le-renegat', 'right', 0).entite;
  const deckBefore = duel.joueur.deck.length;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [fennec.id, renegat.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [fennec.id, renegat.id], {}, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 7);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 7);
  assert.equal(duel.joueur.deck.length, deckBefore - 2);
  assert.equal(duel.defausseEnAttente?.cote, 'joueur'); assert.equal(duel.defausseEnAttente?.restant, 2);
  assert.equal(rpgMobaTerminerTour(duel, 'joueur').raison, 'timing');
  assert.equal(rpgMobaDefausser(duel, 'joueur', 0).restant, 1);
  assert.equal(rpgMobaDefausser(duel, 'joueur', 0).restant, 0);
  assert.equal(duel.tour, 'joueur'); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('a conquering Butin hit triggers once, but a second exiled attacker does not hit', () => {
  const duel = partieCombat(); duel.joueur.mana.sable = 20;
  duel.joueur.main.push('fennec-des-decombres', 'fennec-des-decombres');
  const first = rpgMobaJouerCreature(duel, 'joueur', 'fennec-des-decombres', 'left', 0).entite;
  const second = rpgMobaJouerCreature(duel, 'joueur', 'fennec-des-decombres', 'left', 1).entite;
  mobaInfliger(duel.moba, 'joueur', 'left', 7);
  const deckBefore = duel.joueur.deck.length;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [first.id, second.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [first.id, second.id], {}, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').conqueredBy, 'joueur');
  assert.equal(duel.joueur.creatures.includes(first), false); assert.equal(duel.joueur.creatures.includes(second), false);
  assert.equal(duel.joueur.deck.length, deckBefore - 1);
  assert.equal(duel.defausseEnAttente?.restant, 1);
  assert.equal(duel.log.filter((line) => line.startsWith('Butin :')).length, 1);
  assert.equal(rpgMobaDefausser(duel, 'joueur', 0).ok, true);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Butin does not trigger on a blocked hit or damage prevented by the Grand Voile', () => {
  for (const fog of [false, true]) {
    const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 10;
    const blocker = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
    rpgFinDeTour(duel); duel.joueur.mana.sable = 10; duel.joueur.mana.neige = 10;
    duel.joueur.main.push('fennec-des-decombres', 'grand-voile-blanc');
    const fennec = rpgMobaJouerCreature(duel, 'joueur', 'fennec-des-decombres', 'left', 0).entite;
    if (fog) assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-voile-blanc').ok, true);
    const deckBefore = duel.joueur.deck.length;
    assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [fennec.id]).ok, true);
    assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [fennec.id], fog ? {} : { [fennec.id]: [blocker.id] }, { declaree: true }).ok, true);
    assert.equal(duel.joueur.deck.length, deckBefore); assert.ok(!duel.defausseEnAttente);
    assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('AI-owned Butin draws and discards automatically without exposing its hand', () => {
  const duel = partieCombat(); assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  duel.sorcier.mana.sable = 10; duel.sorcier.main = ['fennec-des-decombres', 'ashigaru-des-braises'];
  const fennec = rpgMobaJouerCreature(duel, 'sorcier', 'fennec-des-decombres', 'left', 0).entite;
  const deckBefore = duel.sorcier.deck.length, handBefore = duel.sorcier.main.length;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'sorcier', [fennec.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'sorcier', [fennec.id], {}, { declaree: true }).ok, true);
  assert.equal(duel.sorcier.deck.length, deckBefore - 1); assert.equal(duel.sorcier.main.length, handBefore);
  assert.ok(!duel.defausseEnAttente); assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 7);
});

test('Tiziri searches eligible spells by human choice and prevents unrelated actions', () => {
  const duel = partieCombat(); duel.joueur.mana.sable = 20;
  duel.joueur.main = ['tiziri-du-djurdjura', 'gardienne-des-portes-de-sable'];
  duel.joueur.deck = ['gardienne-des-portes-de-sable', 'ressac', 'verglas', 'ressac'];
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'tiziri-du-djurdjura', 'left', 0).ok, true);
  assert.deepEqual(rpgMobaCandidatsRecherche(duel, 'joueur'), ['ressac', 'verglas']);
  assert.deepEqual(rpgMobaCandidatsRecherche(duel, 'sorcier'), []);
  assert.equal(rpgMobaTerminerTour(duel, 'joueur').raison, 'timing');
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 1).raison, 'timing');
  assert.equal(rpgMobaResoudreRecherche(duel, 'sorcier', 'ressac').raison, 'timing');
  assert.equal(rpgMobaResoudreRecherche(duel, 'joueur', 'gardienne-des-portes-de-sable').raison, 'cible');
  assert.equal(rpgMobaResoudreRecherche(duel, 'joueur', 'verglas').ok, true);
  assert.deepEqual(duel.joueur.deck, ['gardienne-des-portes-de-sable', 'ressac', 'ressac']);
  assert.ok(duel.joueur.main.includes('verglas')); assert.equal(duel.mobaRechercheEnAttente, null);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Pilote searches a ship, or completes automatically with no eligible card', () => {
  for (const candidates of [true, false]) {
    const duel = partieCombat(); duel.joueur.mana.eau = 20;
    duel.joueur.main = ['pilote-de-la-carreira'];
    duel.joueur.deck = candidates ? ['ressac', 'drakkar-a-tete-de-dragon'] : ['ressac'];
    assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'pilote-de-la-carreira', 'center', 0).ok, true);
    if (candidates) {
      assert.deepEqual(rpgMobaCandidatsRecherche(duel, 'joueur'), ['drakkar-a-tete-de-dragon']);
      assert.equal(rpgMobaResoudreRecherche(duel, 'joueur', 'drakkar-a-tete-de-dragon').ok, true);
      assert.ok(duel.joueur.main.includes('drakkar-a-tete-de-dragon'));
    } else assert.ok(!duel.mobaRechercheEnAttente);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('victory by a second lane conquest ends combat without pending Butin choices', () => {
  const duel = partieCombat(); duel.joueur.mana.sable = 10;
  mobaInfliger(duel.moba, 'joueur', 'right', 10); mobaInfliger(duel.moba, 'joueur', 'left', 7);
  duel.joueur.main.push('fennec-des-decombres');
  const source = rpgMobaJouerCreature(duel, 'joueur', 'fennec-des-decombres', 'left', 0).entite;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [source.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [source.id], {}, { declaree: true }).ok, true);
  assert.equal(duel.moba.winner, 'joueur'); assert.ok(!duel.defausseEnAttente);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Chien du guet triggers Butin on a later turn even when its deck is empty', () => {
  const duel = partieCombat(); duel.joueur.mana.sable = 10;
  duel.joueur.main = ['chien-du-guet', 'gardienne-des-portes-de-sable']; duel.joueur.deck = [];
  const chien = rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'center', 0).entite;
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [chien.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [chien.id], {}, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 8);
  assert.equal(duel.defausseEnAttente?.restant, 1); assert.equal(duel.joueur.deck.length, 0);
  assert.equal(rpgMobaDefausser(duel, 'joueur', 0).ok, true); assert.ok(!duel.moba.winner);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Tiziri does not stall when no eligible spell remains in the deck', () => {
  const duel = partieCombat(); duel.joueur.mana.sable = 10;
  duel.joueur.main = ['tiziri-du-djurdjura']; duel.joueur.deck = ['gardienne-des-portes-de-sable'];
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'tiziri-du-djurdjura', 'left', 0).ok, true);
  assert.ok(!duel.mobaRechercheEnAttente); assert.equal(rpgMobaTerminerTour(duel, 'joueur').ok, true);
});

test('a Butin attacker killed in normal combat does not loot on its overkill hit', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 10;
  const blocker = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel); duel.joueur.mana.sable = 10; duel.joueur.main.push('fennec-des-decombres');
  const fennec = rpgMobaJouerCreature(duel, 'joueur', 'fennec-des-decombres', 'left', 0).entite;
  fennec.overkill = true;
  const before = duel.joueur.deck.length;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [fennec.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [fennec.id], { [fennec.id]: [blocker.id] }, { declaree: true }).ok, true);
  assert.ok(!duel.joueur.creatures.includes(fennec));
  assert.ok(mobaVoie(duel.moba, 'left').hp.sorcier < 10);
  assert.equal(duel.joueur.deck.length, before); assert.ok(!duel.defausseEnAttente);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Amani adjacency stays within a MOBA lane and expires when she leaves', () => {
  const duel = partieCombat(); duel.joueur.mana.sable = 20; duel.joueur.mana.tenebres = 20;
  duel.joueur.main = ['amani-des-ksour', 'gardienne-des-portes-de-sable', 'gardienne-des-portes-de-sable', 'le-jugement-des-colosses'];
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  const distant = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'center', 0).entite;
  const before = [ally.pvMax, distant.pvMax];
  const amani = rpgMobaJouerCreature(duel, 'joueur', 'amani-des-ksour', 'left', 1).entite;
  assert.equal(ally.pvMax, before[0] + 1); assert.equal(distant.pvMax, before[1]);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'le-jugement-des-colosses', amani.id).ok, true);
  assert.equal(ally.pvMax, before[0]); assert.equal(distant.pvMax, before[1]);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Kenshi empowers only its same-lane neighbor and conquest exile does not trigger Harakiri', () => {
  const duel = partieCombat(); duel.joueur.mana.braise = 20;
  duel.joueur.main = ['ashigaru-des-braises', 'ashigaru-des-braises', 'kenshi-de-la-forge'];
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const distant = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'center', 0).entite;
  const before = [ally.atk, distant.atk];
  rpgMobaJouerCreature(duel, 'joueur', 'kenshi-de-la-forge', 'left', 1);
  assert.equal(ally.atk, before[0] + 1); assert.equal(distant.atk, before[1]);
  ally.ready = true; mobaInfliger(duel.moba, 'joueur', 'left', 9);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [ally.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [ally.id], {}, { declaree: true }).ok, true);
  assert.equal(duel.log.some((line) => line.startsWith('Harakiri')), false);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 10);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Harakiri damages its own opposing lane when no enemy creature exists', () => {
  for (const id of ['ronin-du-soleil-rouge', 'hatamoto-des-cendres', 'cavalier-des-deux-sabres', 'samourai-du-torii', 'onna-musha-des-cendres', 'tengu-du-mont-ardent', 'kenshi-de-la-forge']) {
    const duel = partieCombat(); duel.joueur.mana.braise = 20; duel.joueur.mana.tenebres = 20;
    const cost = ['cavalier-des-deux-sabres', 'samourai-du-torii', 'onna-musha-des-cendres', 'tengu-du-mont-ardent'].includes(id) ? 'le-jugement-des-colosses' : 'effacement-des-faibles';
    duel.joueur.main = [id, cost];
    const source = rpgMobaJouerCreature(duel, 'joueur', id, 'right', 0).entite;
    assert.ok(source, id);
    const legacyHp = duel.sorcier.pv;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', cost, source.id).ok, true, id);
    assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 9, id);
    assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10, id);
    assert.equal(duel.sorcier.pv, legacyHp, id);
    assert.equal(rpgMobaPlacementCoherent(duel), true, id);
  }
});

test('Harakiri chooses an enemy creature across lanes and respects its shield', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 20;
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
  target.bouclier = 1; const hp = target.pv;
  rpgFinDeTour(duel); duel.joueur.mana.braise = 20; duel.joueur.mana.tenebres = 20;
  duel.joueur.main = ['hatamoto-des-cendres', 'effacement-des-faibles'];
  const source = rpgMobaJouerCreature(duel, 'joueur', 'hatamoto-des-cendres', 'left', 0).entite;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'effacement-des-faibles', source.id).ok, true);
  assert.equal(target.pv, hp); assert.equal(target.bouclier, 0);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Harakiri conquest clears its lane and a second conquest ends the match coherently', () => {
  const duel = partieCombat(); duel.joueur.mana.braise = 20; duel.joueur.mana.tenebres = 20;
  duel.joueur.main = ['hatamoto-des-cendres', 'hatamoto-des-cendres', 'effacement-des-faibles', 'effacement-des-faibles'];
  const left = rpgMobaJouerCreature(duel, 'joueur', 'hatamoto-des-cendres', 'left', 0).entite;
  const right = rpgMobaJouerCreature(duel, 'joueur', 'hatamoto-des-cendres', 'right', 0).entite;
  mobaInfliger(duel.moba, 'joueur', 'left', 9); mobaInfliger(duel.moba, 'joueur', 'right', 9);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'effacement-des-faibles', left.id).ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').conqueredBy, 'joueur');
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'effacement-des-faibles', right.id).ok, true);
  assert.equal(duel.moba.winner, 'joueur'); assert.equal(rpgVainqueur(duel), 'joueur');
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('arrival can die to chained Harakiri without rolling back the summon', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 50;
  duel.sorcier.main = Array(5).fill('hatamoto-des-cendres');
  for (const [lane, slot] of [['left', 0], ['left', 1], ['center', 0], ['right', 0], ['right', 1]]) {
    const hatamoto = rpgMobaJouerCreature(duel, 'sorcier', 'hatamoto-des-cendres', lane, slot).entite;
    assert.ok(hatamoto); hatamoto.pv = 1; hatamoto.def = 1;
  }
  rpgFinDeTour(duel); duel.joueur.mana.neige = 20; duel.joueur.main = ['geant-des-banquises'];
  const result = rpgMobaJouerCreature(duel, 'joueur', 'geant-des-banquises', 'left', 0);
  assert.equal(result.ok, true); assert.ok(!duel.joueur.creatures.includes(result.entite));
  assert.ok(duel.joueur.cimetiere.includes('geant-des-banquises'));
  assert.equal(duel.sorcier.creatures.length, 0);
  assert.equal(duel.log.filter((line) => line.startsWith('Harakiri')).length, 5);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('normal combat Harakiri can win and stops later combat triggers', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 10; duel.sorcier.main.push('hatamoto-des-cendres');
  const enemy = rpgMobaJouerCreature(duel, 'sorcier', 'hatamoto-des-cendres', 'left', 0).entite;
  rpgFinDeTour(duel); duel.joueur.mana.braise = 10; duel.joueur.main = ['ashigaru-des-braises'];
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  attacker.ready = true; attacker.atk = 2;
  // Only the defending side needs one more lane; both combatants die together.
  mobaInfliger(duel.moba, 'sorcier', 'right', 10); mobaInfliger(duel.moba, 'sorcier', 'left', 9);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], { [attacker.id]: [enemy.id] }, { declaree: true }).ok, true);
  assert.equal(duel.moba.winner, 'sorcier'); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('simultaneous destruction stops remaining death triggers after a Harakiri win', () => {
  const duel = partieCombat(); duel.joueur.mana.braise = 20; duel.joueur.mana.tenebres = 20;
  duel.joueur.main = ['hatamoto-des-cendres', 'hatamoto-des-cendres', 'la-derniere-pesee'];
  rpgMobaJouerCreature(duel, 'joueur', 'hatamoto-des-cendres', 'left', 0);
  rpgMobaJouerCreature(duel, 'joueur', 'hatamoto-des-cendres', 'right', 0);
  mobaInfliger(duel.moba, 'joueur', 'center', 10); mobaInfliger(duel.moba, 'joueur', 'left', 9);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'la-derniere-pesee').ok, true);
  assert.equal(duel.moba.winner, 'joueur');
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10);
  assert.equal(duel.log.filter((line) => line.startsWith('Harakiri')).length, 1);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('samurai resonance remains global while an Onna can dodge a hostile spell', () => {
  const duel = partieCombat(); duel.joueur.mana.braise = 20;
  duel.joueur.main = ['samourai-du-torii', 'hatamoto-des-cendres'];
  const shogun = rpgMobaJouerCreature(duel, 'joueur', 'samourai-du-torii', 'left', 0).entite;
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'hatamoto-des-cendres', 'right', 0).entite;
  assert.equal(ally.atk, 3); assert.equal(shogun.atk, 3);
  rpgFinDeTour(duel); duel.sorcier.mana.braise = 20; duel.sorcier.main = ['onna-musha-des-cendres'];
  const onna = rpgMobaJouerCreature(duel, 'sorcier', 'onna-musha-des-cendres', 'center', 0).entite;
  assert.equal(onna.atk, 4); // opposing Samurai also receives global resonance
  rpgFinDeTour(duel); duel.joueur.mana.braise = 20; duel.joueur.main = ['frappe-iaijutsu'];
  rpgReglerHasard(duel, () => 0); const hp = onna.pv;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'frappe-iaijutsu', onna.id).ok, true);
  assert.equal(onna.pv, hp); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Cavalier retains Rapidité and lane-local Overkill', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 10;
  const blocker = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel); duel.joueur.mana.braise = 20; duel.joueur.main = ['cavalier-des-deux-sabres'];
  const cavalier = rpgMobaJouerCreature(duel, 'joueur', 'cavalier-des-deux-sabres', 'left', 0).entite;
  assert.equal(rpgPeutAttaquer(cavalier), true);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [cavalier.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [cavalier.id], { [cavalier.id]: [blocker.id] }, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10 - (cavalier.atk - 1));
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Tengu Envol prevents ground blockers even within the same lane', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 10;
  const blocker = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'center', 0).entite;
  rpgFinDeTour(duel); duel.joueur.mana.braise = 10; duel.joueur.main = ['tengu-du-mont-ardent'];
  const tengu = rpgMobaJouerCreature(duel, 'joueur', 'tengu-du-mont-ardent', 'center', 0).entite;
  tengu.ready = true;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [tengu.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [tengu.id], { [tengu.id]: [blocker.id] }, { declaree: true }).ok, false);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [tengu.id], {}, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 8);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Susanoo exiles a creature costing at least five from either camp', () => {
  for (const friendly of [false, true]) {
    const duel = partieCombat();
    if (!friendly) rpgFinDeTour(duel);
    const owner = friendly ? 'joueur' : 'sorcier'; duel[owner].mana.neige = 20; duel[owner].mana.braise = 20;
    duel[owner].main = ['drakkar-a-tete-de-dragon', 'ashigaru-des-braises'];
    const ship = rpgMobaJouerCreature(duel, owner, 'drakkar-a-tete-de-dragon', 'right', 0).entite;
    const small = rpgMobaJouerCreature(duel, owner, 'ashigaru-des-braises', 'left', 0).entite;
    if (!friendly) rpgFinDeTour(duel);
    duel.joueur.mana.braise = 20; duel.joueur.main.push('susanoo');
    const susanoo = rpgMobaJouerCreature(duel, 'joueur', 'susanoo', 'center', 0);
    assert.equal(susanoo.ok, true); assert.equal(susanoo.arriveeEnAttente, true);
    assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', small.id).raison, 'cible');
    assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', susanoo.entite.id).raison, 'cible');
    const before = duel[owner].deck.length;
    assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', ship.id).ok, true);
    assert.ok(!duel[owner].creatures.includes(ship)); assert.ok(duel[owner].exil.includes('drakkar-a-tete-de-dragon'));
    assert.equal(duel[owner].deck.length, before, 'exile does not trigger ship death draw');
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Susanoo supports a defender response and its own Harakiri', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.neige = 20; duel.sorcier.mana.eau = 20;
  duel.sorcier.main = ['drakkar-a-tete-de-dragon', 'parade-du-verre'];
  const ship = rpgMobaJouerCreature(duel, 'sorcier', 'drakkar-a-tete-de-dragon', 'right', 0).entite;
  rpgFinDeTour(duel); duel.joueur.mana.braise = 20; duel.joueur.mana.tenebres = 20;
  duel.joueur.main = ['susanoo', 'le-jugement-des-colosses'];
  const susanoo = rpgMobaJouerCreature(duel, 'joueur', 'susanoo', 'left', 0).entite;
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', ship.id).effetEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'parade-du-verre', ship.id).ok, true);
  assert.equal(rpgMobaPasserEffetCreature(duel, 'sorcier').ok, true);
  assert.ok(duel.sorcier.creatures.includes(ship)); assert.equal(ship.bouclier, 0);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'le-jugement-des-colosses', susanoo.id).ok, true);
  assert.equal(ship.pv, ship.pvMax - 1);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Susanoo enters without a target when no eligible creature exists', () => {
  const duel = partieCombat(); duel.joueur.mana.braise = 20; duel.joueur.main = ['susanoo'];
  const result = rpgMobaJouerCreature(duel, 'joueur', 'susanoo', 'center', 0);
  assert.equal(result.ok, true); assert.ok(!result.arriveeEnAttente);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Nuage de cendres keeps its Susanoo bonus across lanes', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.neige = 20;
  duel.sorcier.main = ['loup-des-neiges', 'loup-des-neiges'];
  const left = rpgMobaJouerCreature(duel, 'sorcier', 'loup-des-neiges', 'left', 0).entite;
  const right = rpgMobaJouerCreature(duel, 'sorcier', 'loup-des-neiges', 'right', 0).entite;
  rpgFinDeTour(duel); duel.joueur.mana.braise = 20; duel.joueur.main = ['susanoo', 'nuage-de-cendres'];
  const susanoo = rpgMobaJouerCreature(duel, 'joueur', 'susanoo', 'center', 0);
  assert.ok(!susanoo.arriveeEnAttente);
  const old = [left.pv, right.pv];
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'nuage-de-cendres').ok, true);
  assert.equal(left.pv, old[0] - 3); assert.equal(right.pv, old[1] - 3);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Prêtre de la bouche transfers life in its own lane on arrival', () => {
  for (const side of ['joueur', 'sorcier']) {
    const duel = partieCombat();
    if (side === 'sorcier') rpgFinDeTour(duel);
    const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
    mobaInfliger(duel.moba, enemy, 'left', 4);
    duel[side].mana.tenebres = 10; duel[side].main.push('pretre-de-la-bouche');
    const legacy = [duel.joueur.pv, duel.sorcier.pv];
    const result = rpgMobaJouerCreature(duel, side, 'pretre-de-la-bouche', 'left', 0);
    assert.equal(result.ok, true); assert.equal(mobaVoie(duel.moba, 'left').hp[side], 7);
    assert.equal(mobaVoie(duel.moba, 'left').hp[enemy], 9);
    assert.equal(mobaVoie(duel.moba, 'center').hp[enemy], 10);
    assert.deepEqual([duel.joueur.pv, duel.sorcier.pv], legacy);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('death transfer and healing use the dying creature lane, not wizard HP', () => {
  for (const [id, expectedHeal, expectedDamage] of [['ouvrier-du-natron', 1, 1], ['gardienne-de-la-balance', 3, 0]]) {
    const duel = partieCombat(); duel.joueur.mana.tenebres = 20;
    mobaInfliger(duel.moba, 'sorcier', 'right', 5);
    duel.joueur.main = [id, 'effacement-des-faibles'];
    const source = rpgMobaJouerCreature(duel, 'joueur', id, 'right', 0).entite;
    const legacy = [duel.joueur.pv, duel.sorcier.pv];
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'effacement-des-faibles', source.id).ok, true);
    assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, 5 + expectedHeal, id);
    assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10 - expectedDamage, id);
    assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 10);
    assert.deepEqual([duel.joueur.pv, duel.sorcier.pv], legacy);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('all enabled Tribut creatures transfer after a real hit, including the healing cap', () => {
  for (const [id, tribute] of [['chacal-du-seuil', 1], ['veilleuse-au-corbeau-noir', 1], ['berserk-du-crepuscule', 2], ['seigneur-des-machoires', 2], ['faucon-du-zenith', 3]]) {
    const duel = partieCombat(); Object.assign(duel.joueur.mana, { eau: 20, neige: 20, tenebres: 20, sable: 20 });
    duel.joueur.main = [id]; mobaInfliger(duel.moba, 'sorcier', 'right', 2);
    const entity = rpgMobaJouerCreature(duel, 'joueur', id, 'right', 0).entite;
    assert.ok(entity, id); entity.ready = true;
    const oldAtk = entity.atk, legacy = [duel.joueur.pv, duel.sorcier.pv];
    assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [entity.id]).ok, true, id);
    const result = rpgMobaLancerAttaque(duel, 'joueur', [entity.id], {}, { declaree: true });
    assert.equal(result.ok, true, id);
    assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10 - oldAtk - tribute, id);
    assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, Math.min(10, 8 + tribute), id);
    assert.ok(result.damageEvents.some((event) => event.tribut && event.damage === tribute), id);
    assert.ok(result.healingEvents.some((event) => event.healing === Math.min(2, tribute)), id);
    assert.deepEqual([duel.joueur.pv, duel.sorcier.pv], legacy);
    assert.equal(rpgMobaPlacementCoherent(duel), true, id);
  }
});

test('Tribut does not trigger on blocked, prevented or creature-targeted strikes', () => {
  for (const mode of ['blocked', 'fog', 'targeted']) {
    const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 20;
    const blocker = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
    rpgFinDeTour(duel); duel.joueur.mana.tenebres = 20; duel.joueur.mana.neige = 20; duel.joueur.mana.sable = 20;
    const id = mode === 'targeted' ? 'faucon-du-zenith' : 'chacal-du-seuil';
    duel.joueur.main = [id, 'grand-voile-blanc'];
    const source = rpgMobaJouerCreature(duel, 'joueur', id, 'left', 0).entite; source.ready = true;
    if (mode === 'fog') assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-voile-blanc').ok, true);
    const cibles = mode === 'targeted' ? { [source.id]: blocker.id } : {};
    assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [source.id], cibles).ok, true);
    const result = rpgMobaLancerAttaque(duel, 'joueur', [source.id], mode === 'blocked' ? { [source.id]: [blocker.id] } : {}, { declaree: true });
    assert.equal(result.ok, true); assert.ok(!result.damageEvents.some((event) => event.tribut), mode);
    assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10, mode);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Tribut can conquer after a surviving hit; a hit that already conquered cannot heal a closed lane', () => {
  for (const directConquest of [false, true]) {
    const duel = partieCombat(); duel.joueur.mana.tenebres = 20; duel.joueur.main = ['chacal-du-seuil'];
    mobaInfliger(duel.moba, 'sorcier', 'left', 4);
    mobaInfliger(duel.moba, 'joueur', 'left', directConquest ? 8 : 7);
    const source = rpgMobaJouerCreature(duel, 'joueur', 'chacal-du-seuil', 'left', 0).entite;
    assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [source.id]).ok, true);
    const result = rpgMobaLancerAttaque(duel, 'joueur', [source.id], {}, { declaree: true });
    assert.equal(result.ok, true); assert.equal(mobaVoie(duel.moba, 'left').conqueredBy, 'joueur');
    assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, directConquest ? 6 : 7);
    assert.equal(result.damageEvents.filter((event) => event.tribut).length, directConquest ? 0 : 1);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Le Poids transfers in a selected active lane and ignores wizard shields', () => {
  const duel = partieCombat(); duel.joueur.mana.tenebres = 10; duel.joueur.main = ['le-poids'];
  mobaInfliger(duel.moba, 'sorcier', 'center', 5); duel.sorcier.bouclier = 10;
  const before = JSON.stringify(duel), wizard = [duel.joueur.pv, duel.sorcier.pv];
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'le-poids').raison, 'cible');
  assert.equal(JSON.stringify(duel), before);
  const result = rpgMobaLancerMagie(duel, 'joueur', 'le-poids', null, 'center');
  assert.equal(result.ok, true); assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 8);
  assert.equal(mobaVoie(duel.moba, 'center').hp.joueur, 7); assert.equal(duel.sorcier.bouclier, 10);
  assert.deepEqual([duel.joueur.pv, duel.sorcier.pv], wizard);
  assert.equal(result.damageEvents[0].damage, 2); assert.equal(result.healingEvents[0].healing, 2);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Le Poids can be played as a response, and transfer can win immediately', () => {
  const duel = partieCombat(); duel.joueur.mana.tenebres = 10;
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  duel.sorcier.mana.tenebres = 10; duel.sorcier.main = ['le-poids'];
  mobaInfliger(duel.moba, 'sorcier', 'right', 10);
  mobaInfliger(duel.moba, 'sorcier', 'left', 8);
  assert.equal(rpgMobaTerminerTour(duel, 'sorcier').ok, true);
  // Response belongs to the opponent. Give the player an equivalent instant
  // in a separate nonlethal window before checking lethal transfer below.
  duel.joueur.main.push('le-poids'); duel.joueur.mana.tenebres = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'le-poids', null, 'center').ok, true);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 8);
  assert.equal(rpgMobaPasserFinDeTour(duel, 'joueur').ok, true);
  // Start another opponent turn without touching the terminal lane.
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  duel.sorcier.mana.tenebres = 10;
  const result = rpgMobaLancerMagie(duel, 'sorcier', 'le-poids', null, 'left');
  assert.equal(result.ok, true); assert.equal(duel.moba.winner, 'sorcier');
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Offrande pays its chosen lane, grants temporary Tribut across lanes and expires', () => {
  const duel = partieCombat(); duel.joueur.mana.tenebres = 20;
  duel.joueur.main = ['ashigaru-des-braises', 'offrande-de-lin'];
  const source = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite; source.ready = true;
  const atk = source.atk;
  const result = rpgMobaLancerMagie(duel, 'joueur', 'offrande-de-lin', null, 'left');
  assert.equal(result.ok, true); assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 9);
  assert.equal(source.atk, atk + 1); assert.equal(source.tribut, 1);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [source.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [source.id], {}, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10 - (atk + 1) - 1);
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.equal(source.atk, atk); assert.equal(source.tribut, 0);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Celui qui juge destroys cheap creatures across lanes but not itself or expensive creatures', () => {
  const duel = partieCombat(); duel.joueur.mana.tenebres = 20; duel.joueur.mana.braise = 20;
  duel.joueur.main = ['ashigaru-des-braises', 'celui-qui-juge'];
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel); duel.sorcier.mana.braise = 20; duel.sorcier.mana.neige = 20;
  duel.sorcier.main = ['ashigaru-des-braises', 'jarl-au-marteau-de-guerre'];
  const enemy = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
  const expensive = rpgMobaJouerCreature(duel, 'sorcier', 'jarl-au-marteau-de-guerre', 'center', 0).entite;
  rpgFinDeTour(duel); duel.joueur.mana.tenebres = 20;
  const judge = rpgMobaJouerCreature(duel, 'joueur', 'celui-qui-juge', 'center', 0);
  assert.equal(judge.ok, true); assert.ok(!duel.joueur.creatures.includes(ally));
  assert.ok(!duel.sorcier.creatures.includes(enemy)); assert.ok(duel.sorcier.creatures.includes(expensive));
  assert.ok(duel.joueur.creatures.includes(judge.entite)); assert.equal(judge.entite.tribut, 2);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('a death transfer can win during an opposing arrival while placement stays coherent', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.tenebres = 20;
  duel.sorcier.main = ['ouvrier-du-natron', 'gardienne-de-la-balance'];
  rpgMobaJouerCreature(duel, 'sorcier', 'ouvrier-du-natron', 'left', 0);
  const other = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-de-la-balance', 'center', 0).entite;
  rpgFinDeTour(duel); duel.joueur.mana.tenebres = 20; duel.joueur.main = ['celui-qui-juge'];
  mobaInfliger(duel.moba, 'sorcier', 'right', 10); mobaInfliger(duel.moba, 'sorcier', 'left', 9);
  const res = rpgMobaJouerCreature(duel, 'joueur', 'celui-qui-juge', 'right', 0);
  assert.equal(res.ok, false, 'cannot summon into a closed lane');
  const played = rpgMobaJouerCreature(duel, 'joueur', 'celui-qui-juge', 'center', 0);
  assert.equal(played.ok, true); assert.equal(duel.moba.winner, 'sorcier');
  assert.ok(duel.sorcier.cimetiere.includes(other.carteId));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Seigneur des mâchoires returns in its own lane with Tenacité and keeps Tribut', () => {
  const duel = partieCombat(); duel.joueur.mana.eau = 20; duel.joueur.mana.tenebres = 20;
  duel.joueur.main = ['seigneur-des-machoires', 'le-jugement-des-colosses'];
  const entity = rpgMobaJouerCreature(duel, 'joueur', 'seigneur-des-machoires', 'right', 0).entite;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'le-jugement-des-colosses', entity.id).ok, true);
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  const retour = duel.joueur.creatures.find((e) => e.carteId === 'seigneur-des-machoires');
  assert.ok(retour); assert.equal(retour.mobaLane, 'right'); assert.equal(retour.pv, 1); assert.equal(retour.tribut, 2);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Berserk du crépuscule gains Furie when surviving combat before its lane Tribut', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 20;
  const blocker = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  rpgFinDeTour(duel); duel.joueur.mana.neige = 20; duel.joueur.mana.tenebres = 20;
  duel.joueur.main = ['berserk-du-crepuscule'];
  const berserk = rpgMobaJouerCreature(duel, 'joueur', 'berserk-du-crepuscule', 'left', 0).entite; berserk.ready = true;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [berserk.id]).ok, true);
  const result = rpgMobaLancerAttaque(duel, 'joueur', [berserk.id], { [berserk.id]: [blocker.id] }, { declaree: true });
  assert.equal(result.ok, true); assert.equal(berserk.atk, 5); assert.equal(berserk.furieDeclenchee, true);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 6);
  assert.equal(result.damageEvents.filter((e) => e.tribut).length, 1);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('La Grande Pesée chooses independent payment and transfer lanes, including its Lien', () => {
  const duel = partieCombat(); duel.joueur.mana.tenebres = 20;
  duel.joueur.main = ['la-devoreuse', 'la-grande-pesee'];
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'la-devoreuse', 'center', 0).ok, true);
  mobaInfliger(duel.moba, 'sorcier', 'right', 5);
  const before = JSON.stringify(duel), deck = duel.joueur.deck.length;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'la-grande-pesee', null, 'right').raison, 'cible');
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'la-grande-pesee', null, 'missing', 'left').raison, 'cible');
  assert.equal(JSON.stringify(duel), before);
  const result = rpgMobaLancerMagie(duel, 'joueur', 'la-grande-pesee', null, 'right', 'left');
  assert.equal(result.ok, true); assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 9);
  assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, 9); assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 6);
  assert.equal(duel.joueur.deck.length, deck - 2); assert.equal(result.damageEvents[0].laneId, 'left');
  assert.equal(result.damageEvents[1].laneId, 'right'); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('La Grande Pesée ends immediately on second conquest without an extra draw', () => {
  const duel = partieCombat(); duel.joueur.mana.tenebres = 20; duel.joueur.main = ['la-grande-pesee'];
  mobaInfliger(duel.moba, 'joueur', 'right', 10); mobaInfliger(duel.moba, 'joueur', 'left', 7);
  const deck = duel.joueur.deck.length;
  const res = rpgMobaLancerMagie(duel, 'joueur', 'la-grande-pesee', null, 'left', 'center');
  assert.equal(res.ok, true); assert.equal(duel.moba.winner, 'joueur'); assert.equal(duel.joueur.deck.length, deck);
  assert.equal(mobaVoie(duel.moba, 'center').hp.joueur, 9); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Tarek creates rapid dogs in the source lane first, with lane-scoped aura', () => {
  const duel = partieCombat();
  duel.joueur.main = ['tarek']; duel.joueur.mana.sable = 10;
  const result = rpgMobaJouerCreature(duel, 'joueur', 'tarek', 'right', 0);
  assert.equal(result.ok, true);
  const dogs = duel.joueur.creatures.filter((e) => e.carteId === 'chien-de-sable');
  assert.equal(dogs.length, 2);
  assert.deepEqual(dogs.map((e) => [e.mobaLane, e.emplacement]), [['right', 4], ['left', 0]]);
  assert.deepEqual(dogs.map((e) => [e.atk, e.pv]), [[2, 2], [1, 1]]);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', dogs.map((d) => d.id)).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', dogs.map((d) => d.id), {}, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 8);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 9);
});

test('Daimyo samurai fill open active slots, gain banner and can fight', () => {
  const duel = partieCombat();
  duel.joueur.main = ['daimyo-du-soleil-rouge'];
  const result = rpgMobaJouerCreature(duel, 'joueur', 'daimyo-du-soleil-rouge', 'left', 0);
  assert.equal(result.ok, true);
  const samurai = duel.joueur.creatures.filter((e) => e.carteId === 'samourai-du-daimyo');
  assert.deepEqual(samurai.map((e) => [e.mobaLane, e.emplacement]), [['left', 1], ['center', 2]]);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', samurai.map((s) => s.id)).ok, true);
  assert.deepEqual(samurai.map((e) => [e.atk, e.pv]), [[2, 2], [2, 2]]);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', samurai.map((s) => s.id), {}, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 8);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 8);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('death tokens reuse source slots, do not enter the graveyard, and cannot be played from hand', () => {
  const duel = partieCombat();
  duel.joueur.mana.tenebres = 10; duel.joueur.main = ['momie-de-lin'];
  const momie = rpgMobaJouerCreature(duel, 'joueur', 'momie-de-lin', 'center', 0).entite;
  assert.ok(momie); momie.pv = 1;
  duel.joueur.main = ['la-derniere-pesee']; duel.joueur.mana.tenebres = 20;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'la-derniere-pesee').ok, true);
  const token = duel.joueur.creatures.find((e) => e.carteId === 'shabti');
  assert.ok(token); assert.equal(token.mobaLane, 'center'); assert.equal(token.emplacement, 2);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  duel.joueur.main = ['la-derniere-pesee'];
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'la-derniere-pesee').ok, true);
  assert.ok(!duel.joueur.creatures.includes(token));
  assert.ok(!duel.joueur.cimetiere.includes('shabti'));
  duel.joueur.main.push('shabti');
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'shabti', 'left', 0).raison, 'effet-non-pris-en-charge');
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Orochi death produces two survivors after a simultaneous board wipe', () => {
  const duel = partieCombat();
  duel.joueur.main = ['orochi']; duel.joueur.mana.braise = 20;
  const orochi = rpgMobaJouerCreature(duel, 'joueur', 'orochi', 'right', 1).entite;
  assert.ok(orochi);
  duel.joueur.main = ['la-derniere-pesee']; duel.joueur.mana.tenebres = 20;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'la-derniere-pesee').ok, true);
  const petits = duel.joueur.creatures.filter((e) => e.carteId === 'petit-orochi');
  assert.deepEqual(petits.map((e) => [e.mobaLane, e.emplacement, e.pv]), [['right', 3, 4], ['right', 4, 4]]);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('tokens never enter closed lanes and only available slots are filled', () => {
  const duel = partieCombat();
  mobaInfliger(duel.moba, 'joueur', 'left', 10);
  mobaInfliger(duel.moba, 'sorcier', 'center', 10);
  duel.joueur.main = ['tarek']; duel.joueur.mana.sable = 10;
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'tarek', 'right', 0).ok, true);
  const dogs = duel.joueur.creatures.filter((e) => e.carteId === 'chien-de-sable');
  assert.equal(dogs.length, 1); assert.equal(dogs[0].mobaLane, 'right');
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('simultaneous opposing death triggers keep each token in its owner source lane', () => {
  const duel = partieCombat();
  duel.joueur.main = ['momie-de-lin', 'la-derniere-pesee']; duel.joueur.mana.tenebres = 20;
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'momie-de-lin', 'left', 1).ok, true);
  rpgFinDeTour(duel); duel.sorcier.mana.tenebres = 10; duel.sorcier.main = ['momie-de-lin'];
  assert.equal(rpgMobaJouerCreature(duel, 'sorcier', 'momie-de-lin', 'right', 0).ok, true);
  rpgFinDeTour(duel); duel.joueur.mana.tenebres = 20;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'la-derniere-pesee').ok, true);
  for (const [side, lane] of [['joueur', 'left'], ['sorcier', 'right']]) {
    const token = duel[side].creatures.find((e) => e.carteId === 'shabti');
    assert.ok(token); assert.equal(token.mobaLane, lane);
  }
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('conquest exiles Tarek and his dog without spawning anything or moving surviving dogs', () => {
  const duel = partieCombat();
  duel.joueur.main = ['tarek']; duel.joueur.mana.sable = 10;
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'tarek', 'right', 0).ok, true);
  const dog = duel.joueur.creatures.find((e) => e.carteId === 'chien-de-sable' && e.mobaLane === 'left');
  assert.equal(dog.atk, 1);
  duel.joueur.main = ['eclair-du-marteau']; duel.joueur.mana.neige = 20;
  mobaInfliger(duel.moba, 'joueur', 'right', 9);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'sorcier', 'right').ok, true);
  assert.equal(duel.joueur.creatures.length, 1);
  assert.equal(duel.joueur.creatures[0].id, dog.id);
  assert.equal(dog.mobaLane, 'left'); assert.equal(dog.atk, 1);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('a blocked Momie creates an unengaged Shabti in its lane during combat', () => {
  const duel = partieCombat(); duel.joueur.main = ['momie-de-lin']; duel.joueur.mana.tenebres = 10;
  const momie = rpgMobaJouerCreature(duel, 'joueur', 'momie-de-lin', 'left', 0).entite;
  rpgFinDeTour(duel); duel.sorcier.main = ['jarl-au-marteau-de-guerre']; duel.sorcier.mana.neige = 10;
  const blocker = rpgMobaJouerCreature(duel, 'sorcier', 'jarl-au-marteau-de-guerre', 'left', 0).entite;
  rpgFinDeTour(duel); momie.pv = 1;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [momie.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [momie.id], { [momie.id]: [blocker.id] }, { declaree: true }).ok, true);
  const token = duel.joueur.creatures.find((e) => e.carteId === 'shabti');
  assert.ok(token); assert.equal(token.mobaLane, 'left'); assert.equal(token.emplacement, 0);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Maître des corbeaux uses Tribut in its lane and Tenacité repeats exile there', () => {
  const duel = partieCombat(); duel.joueur.mana.neige = 20; duel.joueur.mana.tenebres = 20;
  duel.joueur.main = ['maitre-des-corbeaux', 'grand-hiver'];
  const master = rpgMobaJouerCreature(duel, 'joueur', 'maitre-des-corbeaux', 'right', 0);
  assert.equal(master.ok, true, JSON.stringify(master)); assert.ok(!master.arriveeEnAttente);
  mobaInfliger(duel.moba, 'sorcier', 'right', 4);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [master.entite.id], {}).ok, true);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 4);
  assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, 7);
  master.entite.pv = 1; duel.joueur.mana.neige = 20;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver').ok, true);
  assert.equal(duel.joueur.retoursProgrammes[0].mobaLane, 'right');
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  duel.sorcier.mana.braise = 10; duel.sorcier.main = ['ashigaru-des-braises'];
  const enemy = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  assert.ok(enemy);
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  const retour = duel.joueur.creatures.find((e) => e.carteId === 'maitre-des-corbeaux');
  assert.ok(retour); assert.equal(retour.mobaLane, 'right'); assert.equal(retour.tenaciteDisponible, false);
  assert.ok(duel.sorcier.exil.includes(enemy.carteId));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Guetteur counts its controller turns, strikes its lane then draws', () => {
  const duel = partieCombat(); duel.joueur.mana.sable = 20; duel.joueur.main = ['guetteur-du-beffroi'];
  const watch = rpgMobaJouerCreature(duel, 'joueur', 'guetteur-du-beffroi', 'right', 1).entite;
  assert.ok(watch); assert.equal(watch.heures.restants, 2);
  rpgFinDeTour(duel); assert.equal(watch.heures.restants, 2);
  rpgFinDeTour(duel); assert.equal(watch.heures.restants, 1);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10);
  rpgFinDeTour(duel);
  const deck = duel.joueur.deck.length; const wizard = duel.sorcier.pv;
  rpgFinDeTour(duel);
  assert.equal(watch.heures, null); assert.equal(duel.joueur.deck.length, deck - 2);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 8);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10); assert.equal(duel.sorcier.pv, wizard);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Guetteur conquest prevents other exiled Guetteurs from ringing, but its draw resolves', () => {
  const duel = partieCombat(); duel.joueur.mana.sable = 20;
  duel.joueur.main = ['guetteur-du-beffroi', 'guetteur-du-beffroi'];
  const first = rpgMobaJouerCreature(duel, 'joueur', 'guetteur-du-beffroi', 'left', 0).entite;
  const second = rpgMobaJouerCreature(duel, 'joueur', 'guetteur-du-beffroi', 'left', 1).entite;
  first.heures.restants = second.heures.restants = 1;
  mobaInfliger(duel.moba, 'joueur', 'left', 8);
  rpgFinDeTour(duel); const deck = duel.joueur.deck.length; rpgFinDeTour(duel);
  assert.equal(mobaVoie(duel.moba, 'left').conqueredBy, 'joueur');
  assert.equal(duel.joueur.creatures.length, 0); assert.equal(duel.joueur.deck.length, deck - 2);
  assert.equal(second.heures.restants, 1); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('winning Guetteur stops its bonus draw, later counters and turn-start echoes', () => {
  const duel = partieCombat(); duel.joueur.mana.sable = 20;
  duel.joueur.main = ['guetteur-du-beffroi', 'guetteur-du-beffroi'];
  const first = rpgMobaJouerCreature(duel, 'joueur', 'guetteur-du-beffroi', 'right', 0).entite;
  const second = rpgMobaJouerCreature(duel, 'joueur', 'guetteur-du-beffroi', 'left', 0).entite;
  first.heures.restants = second.heures.restants = 1;
  mobaInfliger(duel.moba, 'joueur', 'center', 10); mobaInfliger(duel.moba, 'joueur', 'right', 8);
  rpgFinDeTour(duel); const deck = duel.joueur.deck.length; rpgFinDeTour(duel);
  assert.equal(duel.moba.winner, 'joueur'); assert.equal(duel.fin.gagnant, 'joueur');
  assert.equal(duel.joueur.deck.length, deck - 1, 'only the normal turn draw occurs before victory');
  assert.equal(second.heures.restants, 1); assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Faussoyeur recovers the latest creature and keeps its lane-aware Butin', () => {
  const duel = partieCombat(); duel.joueur.mana.sable = 20;
  duel.joueur.cimetiere = ['viking-des-neiges', 'verglas', 'ashigaru-des-braises'];
  duel.joueur.main = ['faussoyeur-des-dunes'];
  const f = rpgMobaJouerCreature(duel, 'joueur', 'faussoyeur-des-dunes', 'right', 0);
  assert.equal(f.ok, true); assert.ok(duel.joueur.main.includes('ashigaru-des-braises'));
  assert.deepEqual(duel.joueur.cimetiere, ['viking-des-neiges', 'verglas']);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  const deck = duel.joueur.deck.length;
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [f.entite.id], {}).ok, true);
  assert.equal(duel.joueur.deck.length, deck - 1); assert.ok(duel.defausseEnAttente);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 8);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const [id, expected] of [['dune-marchante', 'verglas'], ['scribe-de-la-liste', 'ashigaru-des-braises']]) {
  test(`${id} recycles eligible graveyard cards on death, not on conquest`, () => {
    for (const mode of ['death', 'conquest']) {
      const duel = partieCombat(); duel.joueur.mana.sable = 20;
      duel.joueur.cimetiere = ['verglas', 'ashigaru-des-braises']; duel.joueur.main = [id];
      const creature = rpgMobaJouerCreature(duel, 'joueur', id, 'right', 0).entite;
      assert.ok(creature);
      rpgFinDeTour(duel); duel.sorcier.mana.neige = 20; duel.sorcier.main = ['eclair-du-marteau'];
      if (mode === 'death') {
        creature.pv = 1;
        assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', creature.id).ok, true);
        assert.ok(duel.joueur.main.includes(expected));
        assert.ok(duel.joueur.cimetiere.includes(id));
      } else {
        mobaInfliger(duel.moba, 'sorcier', 'right', 9);
        assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', 'sorcier', 'right').ok, true);
        assert.ok(!duel.joueur.main.includes(expected)); assert.ok(!duel.joueur.cimetiere.includes(id));
      }
      assert.equal(rpgMobaPlacementCoherent(duel), true);
    }
  });
}

test('opposing Guetteur wins during an authoritative turn transition without hitting wizard HP', () => {
  const duel = partieCombat();
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  duel.sorcier.mana.sable = 20; duel.sorcier.main = ['guetteur-du-beffroi'];
  const watch = rpgMobaJouerCreature(duel, 'sorcier', 'guetteur-du-beffroi', 'left', 0).entite;
  assert.ok(watch); watch.heures.restants = 1;
  mobaInfliger(duel.moba, 'sorcier', 'right', 10); mobaInfliger(duel.moba, 'sorcier', 'left', 8);
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  const deck = duel.sorcier.deck.length; const wizard = duel.joueur.pv;
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.equal(duel.moba.winner, 'sorcier'); assert.equal(duel.fin.gagnant, 'sorcier');
  assert.equal(duel.joueur.pv, wizard); assert.equal(duel.sorcier.deck.length, deck - 1);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Braisier damages enemy creatures across lanes, but only its own opposing lane', () => {
  const duel = partieCombat();
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'center', 0).entite;
  rpgFinDeTour(duel); duel.sorcier.mana.braise = 20;
  const victim = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  const protectedOne = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'center', 0).entite;
  protectedOne.bouclier = 1;
  rpgFinDeTour(duel); duel.joueur.main = ['braisier-du-souk']; duel.joueur.mana.braise = 20;
  const wizard = duel.sorcier.pv;
  const result = rpgMobaJouerCreature(duel, 'joueur', 'braisier-du-souk', 'right', 0);
  assert.equal(result.ok, true); assert.equal(ally.pv, 1);
  assert.equal(duel.sorcier.creatures.includes(victim), false);
  assert.equal(mobaVoie(duel.moba, 'left').slots.sorcier[0], null);
  assert.equal(duel.sorcier.creatures.includes(protectedOne), true); assert.equal(protectedOne.bouclier, 0);
  assert.deepEqual(duel.moba.lanes.map((lane) => lane.hp.sorcier), [10, 10, 9]);
  assert.equal(duel.sorcier.pv, wizard);
  assert.deepEqual(result.damageEvents.map((event) => [event.laneId, event.targetSide, event.damage]), [['right', 'sorcier', 1]]);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Braisier can conquer a second lane on arrival and clean up without damaging legacy wizard HP', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 20;
  const survivor = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite;
  survivor.pv = survivor.pvMax = 4;
  rpgFinDeTour(duel); duel.joueur.main = ['braisier-du-souk']; duel.joueur.mana.braise = 20;
  mobaInfliger(duel.moba, 'joueur', 'left', 10); mobaInfliger(duel.moba, 'joueur', 'right', 9);
  const wizard = duel.sorcier.pv;
  const result = rpgMobaJouerCreature(duel, 'joueur', 'braisier-du-souk', 'right', 1);
  assert.equal(result.ok, true); assert.equal(duel.moba.winner, 'joueur'); assert.equal(duel.fin.gagnant, 'joueur');
  assert.equal(duel.sorcier.pv, wizard); assert.equal(mobaVoie(duel.moba, 'right').active, false);
  assert.ok(duel.sorcier.exil.includes(survivor.carteId)); assert.ok(duel.joueur.exil.includes('braisier-du-souk'));
  assert.equal(result.damageEvents[0].conquered, true);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'braisier-du-souk', 'center', 0).raison, 'partie-terminee');
});

test('Braisier returning with Tenacité repeats its arrival in its original lane', () => {
  const duel = partieCombat(); duel.joueur.main = ['braisier-du-souk', 'grand-hiver'];
  duel.joueur.mana.braise = 20; duel.joueur.mana.neige = 20;
  const braisier = rpgMobaJouerCreature(duel, 'joueur', 'braisier-du-souk', 'right', 0).entite;
  assert.ok(braisier); braisier.tenaciteDisponible = true;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver').ok, true);
  assert.equal(duel.joueur.retoursProgrammes[0].mobaLane, 'right');
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  duel.sorcier.mana.braise = 20; duel.sorcier.main = ['ashigaru-des-braises'];
  const enemy = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  const wizard = duel.sorcier.pv;
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  const returned = duel.joueur.creatures.find((e) => e.carteId === 'braisier-du-souk');
  assert.ok(returned); assert.equal(returned.mobaLane, 'right');
  assert.equal(duel.sorcier.creatures.includes(enemy), false);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 8);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10);
  assert.equal(duel.sorcier.pv, wizard); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Braisier is available in a validated custom deck and works for the AI side', () => {
  const custom = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  custom.cardIds[custom.cardIds.indexOf('viking-des-neiges')] = 'braisier-du-souk';
  assert.equal(rpgMobaValiderDeck(custom).ok, true);
  const duel = partieCombat(); assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  duel.sorcier.main = ['braisier-du-souk']; duel.sorcier.mana.braise = 10;
  const wizard = duel.joueur.pv;
  const result = rpgMobaJouerCreature(duel, 'sorcier', 'braisier-du-souk', 'center', 0);
  assert.equal(result.ok, true); assert.equal(mobaVoie(duel.moba, 'center').hp.joueur, 9);
  assert.equal(duel.joueur.pv, wizard); assert.equal(result.damageEvents[0].targetSide, 'joueur');
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Braisier remembers its lane when a Harakiri death effect removes it during the wave', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 20;
  duel.sorcier.main = ['ronin-du-soleil-rouge'];
  const ronin = rpgMobaJouerCreature(duel, 'sorcier', 'ronin-du-soleil-rouge', 'left', 0).entite;
  assert.ok(ronin); ronin.pv = 1;
  rpgFinDeTour(duel); duel.joueur.main = ['braisier-du-souk']; duel.joueur.mana.braise = 20;
  const result = rpgMobaJouerCreature(duel, 'joueur', 'braisier-du-souk', 'right', 0);
  assert.equal(result.ok, true);
  assert.equal(duel.joueur.creatures.includes(result.entite), false);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 9);
  assert.equal(duel.sorcier.pv, 25); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Valkyrie des glaces damages and freezes both camps across lanes, respecting hostile shields', () => {
  const duel = partieCombat(); duel.joueur.mana.sable = 20;
  duel.joueur.main = ['gardienne-des-portes-de-sable', 'ashigaru-des-braises'];
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  const fragileAlly = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 1).entite;
  ally.bouclier = 1;
  rpgFinDeTour(duel); duel.sorcier.mana.sable = 20;
  duel.sorcier.main = ['gardienne-des-portes-de-sable', 'gardienne-des-portes-de-sable'];
  const guarded = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'center', 0).entite;
  const enemy = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
  guarded.bouclier = 1;
  rpgFinDeTour(duel); duel.joueur.mana.neige = 20; duel.joueur.main = ['valkyrie-des-glaces'];
  rpgReglerHasard(duel, () => 0);
  const result = rpgMobaJouerCreature(duel, 'joueur', 'valkyrie-des-glaces', 'center', 0);
  assert.equal(result.ok, true); const valkyrie = result.entite;
  assert.equal(valkyrie.pv, 5); assert.equal(valkyrie.bouclier, 1); assert.equal(valkyrie.gelToursRestants, 0);
  assert.equal(ally.pv, 3); assert.equal(ally.bouclier, 1, 'friendly effects bypass but do not consume shields');
  assert.ok(ally.gelToursRestants > 0); assert.equal(duel.joueur.creatures.includes(fragileAlly), false);
  assert.equal(guarded.pv, 4); assert.equal(guarded.bouclier, 0); assert.equal(guarded.gelToursRestants, 0);
  assert.equal(enemy.pv, 3); assert.ok(enemy.gelToursRestants > 0);
  assert.deepEqual(duel.moba.lanes.map((lane) => [lane.hp.joueur, lane.hp.sorcier]), [[10,10],[10,10],[10,10]]);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Valkyrie: a failed freeze roll preserves both camps’ ability to act', () => {
  const duel = partieCombat(); duel.joueur.mana.sable = 20; duel.joueur.main = ['gardienne-des-portes-de-sable'];
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  rpgFinDeTour(duel); duel.sorcier.mana.sable = 20; duel.sorcier.main = ['gardienne-des-portes-de-sable'];
  const enemy = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
  rpgFinDeTour(duel); duel.joueur.mana.neige = 20; duel.joueur.main = ['valkyrie-des-glaces'];
  rpgReglerHasard(duel, () => 0.99);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'valkyrie-des-glaces', 'center', 0).ok, true);
  assert.deepEqual([ally.pv, enemy.pv], [3, 3]);
  assert.deepEqual([ally.gelToursRestants, enemy.gelToursRestants], [0, 0]);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Valkyrie des glaces returns to the same lane with Tenacité and repeats the global wave', () => {
  const duel = partieCombat(); duel.joueur.mana.neige = 20;
  duel.joueur.main = ['valkyrie-des-glaces', 'grand-hiver'];
  const valkyrie = rpgMobaJouerCreature(duel, 'joueur', 'valkyrie-des-glaces', 'right', 0).entite;
  assert.ok(valkyrie); valkyrie.tenaciteDisponible = true; valkyrie.pv = 1;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver').ok, true);
  assert.equal(duel.joueur.retoursProgrammes[0].mobaLane, 'right');
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  duel.sorcier.mana.braise = 20; duel.sorcier.main = ['ashigaru-des-braises'];
  const enemy = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  const returned = duel.joueur.creatures.find((e) => e.carteId === 'valkyrie-des-glaces');
  assert.ok(returned); assert.equal(returned.mobaLane, 'right'); assert.equal(returned.pv, 1);
  assert.equal(returned.tenaciteDisponible, false); assert.equal(duel.sorcier.creatures.includes(enemy), false);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Valkyrie’s wave stops on a winning Harakiri before striking later creatures', () => {
  const duel = partieCombat(); duel.joueur.mana.braise = 20;
  duel.joueur.main = ['ronin-du-soleil-rouge', 'ashigaru-des-braises'];
  const ronin = rpgMobaJouerCreature(duel, 'joueur', 'ronin-du-soleil-rouge', 'right', 0).entite;
  const later = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  ronin.pv = 1;
  mobaInfliger(duel.moba, 'joueur', 'center', 10); mobaInfliger(duel.moba, 'joueur', 'right', 9);
  duel.joueur.mana.neige = 20; duel.joueur.main = ['valkyrie-des-glaces'];
  const result = rpgMobaJouerCreature(duel, 'joueur', 'valkyrie-des-glaces', 'left', 1);
  assert.equal(result.ok, true); assert.equal(duel.moba.winner, 'joueur');
  assert.equal(later.pv, 1); assert.equal(duel.joueur.creatures.includes(later), true);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Valkyrie des glaces keeps Envol and her shield during lane combat', () => {
  const duel = partieCombat(); duel.joueur.main = ['valkyrie-des-glaces']; duel.joueur.mana.neige = 20;
  const valkyrie = rpgMobaJouerCreature(duel, 'joueur', 'valkyrie-des-glaces', 'left', 0).entite;
  assert.ok(valkyrie);
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  duel.sorcier.main = ['ashigaru-des-braises', 'trait-de-braise']; duel.sorcier.mana.braise = 20;
  const blocker = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'trait-de-braise', valkyrie.id).ok, true);
  assert.equal(valkyrie.pv, 5); assert.equal(valkyrie.bouclier, 0);
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  assert.equal(rpgPeutBloquerAttaquant(blocker, valkyrie), false);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [valkyrie.id], { [valkyrie.id]: [blocker.id] }).ok, false);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [valkyrie.id], {}).ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 5);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Valkyrie des glaces is available in a validated custom deck and works for the opponent', () => {
  const custom = { ...MOBA_DECKS[0], cardIds: [...MOBA_DECKS[0].cardIds] };
  custom.cardIds[custom.cardIds.indexOf('viking-des-neiges')] = 'valkyrie-des-glaces';
  assert.equal(rpgMobaValiderDeck(custom).ok, true);
  const duel = partieCombat();
  const enemy = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  duel.sorcier.main = ['valkyrie-des-glaces']; duel.sorcier.mana.neige = 20;
  const result = rpgMobaJouerCreature(duel, 'sorcier', 'valkyrie-des-glaces', 'center', 0);
  assert.equal(result.ok, true); assert.equal(duel.joueur.creatures.includes(enemy), false);
  assert.equal(result.entite.pv, 5); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('MOBA keeps the classic permanent mana choice, refill and ten-source cap on every turn', () => {
  const duel = rpgMobaNouveauDuel({ joueurDeck: MOBA_DECK_ESSAI, sorcierDeck: MOBA_DECK_ESSAI, rng: () => .5 });
  assert.equal(rpgMobaMulligan(duel, 'joueur', []).ok, true);
  assert.equal(rpgMobaMulligan(duel, 'sorcier', []).ok, true);
  duel.joueur.deck = []; duel.sorcier.deck = [];
  for (let round = 0; round < 11; round++) {
    for (const side of ['joueur', 'sorcier']) {
      const camp = duel[side];
      assert.equal(duel.tour, side);
      const total = Object.values(camp.manaMax).reduce((a, b) => a + b, 0);
      assert.equal(total, Math.min(round, 10));
      assert.equal(camp.manaChoixEnAttente, round < 10);
      if (round < 10) {
        assert.equal(rpgMobaTerminerTour(duel, side).ok, false, 'must choose before ending the turn');
        const color = camp.couleurs[round % camp.couleurs.length];
        assert.equal(rpgChoisirCouleurMana(duel, side, color).ok, true);
        assert.equal(rpgChoisirCouleurMana(duel, side, color).ok, false, 'only one source per turn');
      }
      assert.equal(camp.manaSources.length, Math.min(round + 1, 10));
      assert.equal(Object.values(camp.mana).reduce((a, b) => a + b, 0), Math.min(round + 1, 10), 'previous sources refill before the new source');
      // Simulate spending to verify the next turn refills all the same colours.
      for (const color of camp.couleurs) camp.mana[color] = 0;
      assert.equal(terminerEtPasser(duel, side).ok, true);
    }
  }
});

test('a one-colour MOBA deck receives its mana automatically as in the classic duel', () => {
  const duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), joueurCouleurs: ['braise'], sorcierCouleurs: ['braise'], rng: () => .5 });
  assert.equal(rpgMobaMulligan(duel, 'joueur', []).ok, true);
  assert.equal(rpgMobaMulligan(duel, 'sorcier', []).ok, true);
  assert.deepEqual(duel.joueur.manaSources, ['braise']);
  assert.equal(duel.joueur.manaChoixEnAttente, false);
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.deepEqual(duel.sorcier.manaSources, ['braise']);
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  assert.deepEqual(duel.joueur.manaSources, ['braise', 'braise']);
  assert.equal(duel.joueur.manaChoixEnAttente, false);
});


test('announced targeted spells are paid once and the defender passes to resolve', () => {
  for (const spell of ['poigne-de-givre', 'ressac', 'eclair-du-marteau', 'trait-de-braise']) {
    const duel = partie();
    duel.joueur.mana.sable = 10;
    const target = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'center', 0).entite;
    rpgFinDeTour(duel);
    duel.sorcier.main.push(spell); duel.sorcier.mana.neige = 10; duel.sorcier.mana.eau = 10; duel.sorcier.mana.braise = 10;
    const beforePv = target.pv;
    const result = rpgMobaLancerMagie(duel, 'sorcier', spell, target.id, null, null, { ouvrirReponse: true });
    assert.equal(result.sortEnAttente, true, spell);
    assert.equal(target.pv, beforePv);
    assert.ok(!duel.sorcier.main.includes(spell));
    assert.ok(!duel.sorcier.cimetiere.includes(spell));
    const mana = JSON.stringify(duel.sorcier.mana);
    const before = JSON.stringify(duel);
    assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, false);
    assert.equal(rpgMobaTerminerTour(duel, 'sorcier').ok, false);
    assert.equal(JSON.stringify(duel), before);
    assert.equal(rpgMobaPasserSort(duel, 'joueur').ok, true);
    assert.equal(JSON.stringify(duel.sorcier.mana), mana);
    assert.equal(duel.sorcier.cimetiere.filter((id) => id === spell).length, 1);
    assert.equal(duel.mobaSortEnAttente, null);
    assert.equal(duel.fenetreReponse, false);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
    if (spell === 'ressac') assert.ok(duel.joueur.main.includes(target.carteId));
    else assert.ok(target.pv < beforePv || !duel.joueur.creatures.includes(target));
  }
});

test('a fast shield answers a paid spell; a response is never recursively announced', () => {
  const duel = partie();
  duel.joueur.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  rpgFinDeTour(duel);
  duel.sorcier.main.push('eclair-du-marteau'); duel.sorcier.mana.neige = 10;
  duel.joueur.main.push('parade-du-verre'); duel.joueur.mana.eau = 10;
  const pv = target.pv;
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', target.id, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  const response = rpgMobaLancerMagie(duel, 'joueur', 'parade-du-verre', target.id, null, null, { ouvrirReponse: true });
  assert.equal(response.ok, true);
  assert.equal(response.sortEnAttente, undefined);
  assert.equal(rpgMobaPasserSort(duel, 'joueur').bouclierBloque, true);
  assert.equal(target.pv, pv);
  assert.equal(duel.sorcier.cimetiere.filter((id) => id === 'eclair-du-marteau').length, 1);
});

test('a response can conquer the target lane, dissipating the announced spell without refund', () => {
  const duel = partie();
  duel.joueur.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  mobaInfliger(duel.moba, 'joueur', 'left', 7);
  rpgFinDeTour(duel);
  duel.joueur.main.push('eclair-du-marteau'); duel.joueur.mana.neige = 10;
  duel.sorcier.main.push('eclair-du-marteau'); duel.sorcier.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', target.id, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  const response = rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'sorcier', 'left', null, { ouvrirReponse: true });
  assert.equal(response.ok, true);
  assert.equal(response.sortEnAttente, undefined);
  assert.ok(!duel.joueur.creatures.includes(target));
  const mana = JSON.stringify(duel.sorcier.mana);
  assert.equal(rpgMobaPasserSort(duel, 'joueur').dissipe, true);
  assert.equal(JSON.stringify(duel.sorcier.mana), mana);
  assert.equal(duel.sorcier.cimetiere.filter((id) => id === 'eclair-du-marteau').length, 1);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});


test('AI compares a response with the resolved threat without mutating the live duel or RNG', () => {
  const duel = partie();
  rpgFinDeTour(duel);
  duel.sorcier.main.push('gardienne-des-portes-de-sable'); duel.sorcier.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  duel.sorcier.main = ['parade-du-verre']; duel.sorcier.mana.eau = 10;
  rpgFinDeTour(duel);
  duel.joueur.main.push('eclair-du-marteau'); duel.joueur.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', target.id, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  let draws = 0; rpgReglerHasard(duel, () => { draws++; return .5; });
  const before = JSON.stringify(duel);
  const choice = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
  assert.equal(choice?.id, 'parade-du-verre');
  assert.equal(choice.cible, target.id);
  assert.equal(JSON.stringify(duel), before);
  assert.equal(draws, 0);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', choice.id, choice.cible).ok, true);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').bouclierBloque, true);
  assert.ok(duel.sorcier.creatures.includes(target));
});

test('illegal announcements do not pay or open a response; a response does not open another window', () => {
  const duel = partie();
  rpgFinDeTour(duel);
  duel.sorcier.main.push('gardienne-des-portes-de-sable'); duel.sorcier.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  rpgFinDeTour(duel);
  duel.joueur.main.push('eclair-du-marteau'); duel.joueur.mana.neige = 0;
  let before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', target.id, null, null, { ouvrirReponse: true }).raison, 'mana');
  assert.equal(JSON.stringify(duel), before);
  duel.joueur.mana.neige = 10;
  before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'unknown', null, null, { ouvrirReponse: true }).raison, 'cible');
  assert.equal(JSON.stringify(duel), before);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', target.id, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  duel.sorcier.main.push('ressac'); duel.sorcier.mana.eau = 10;
  // The opponent's targeted spell executes now rather than opening a nested response.
  duel.joueur.main.push('gardienne-des-portes-de-sable');
  // There are no opposing creatures to target; a failed response also leaves the pending spell intact.
  before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'ressac', 'unknown', null, null, { ouvrirReponse: true }).raison, 'cible');
  assert.equal(JSON.stringify(duel), before);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
});

test('a winning instant response consumes the announced spell and ends the match immediately', () => {
  const duel = partie();
  duel.joueur.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  mobaInfliger(duel.moba, 'joueur', 'center', 10);
  mobaInfliger(duel.moba, 'joueur', 'left', 7);
  rpgFinDeTour(duel);
  duel.joueur.main.push('eclair-du-marteau'); duel.joueur.mana.neige = 10;
  duel.sorcier.main.push('poigne-de-givre'); duel.sorcier.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'poigne-de-givre', target.id, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'sorcier', 'left').ok, true);
  assert.equal(duel.moba.winner, 'joueur');
  assert.equal(duel.mobaSortEnAttente, null);
  assert.equal(duel.sorcier.cimetiere.filter((id) => id === 'poigne-de-givre').length, 1);
  assert.equal(rpgMobaPasserSort(duel, 'joueur').raison, 'partie-terminee');
});

for (const spell of ['appat-de-la-meute', 'frappe-iaijutsu', 'courant-de-retour', 'haut-fond', 'lame-de-mer', 'effacement-des-faibles', 'le-jugement-des-colosses']) {
  for (const caster of ['joueur', 'sorcier']) {
    test(`${spell}: ${caster} announces an enemy target and resolves exactly like an immediate cast`, () => {
      const duel = partie();
      const defender = caster === 'joueur' ? 'sorcier' : 'joueur';
      if (defender === 'sorcier') rpgFinDeTour(duel);
      const creature = spell === 'le-jugement-des-colosses' ? 'jarl-au-marteau-de-guerre' : 'gardienne-des-portes-de-sable';
      duel[defender].main.push(creature);
      duel[defender].mana.sable = 10; duel[defender].mana.neige = 10;
      const target = rpgMobaJouerCreature(duel, defender, creature, 'center', 0).entite;
      assert.ok(target);
      rpgFinDeTour(duel);
      duel[caster].main.push(spell);
      for (const color of ['sable', 'neige', 'braise', 'eau', 'tenebres']) duel[caster].mana[color] = 10;
      const immediate = JSON.parse(JSON.stringify(duel));
      rpgReglerHasard(duel, () => .5); rpgReglerHasard(immediate, () => .5);
      const originalTarget = JSON.stringify(target);
      const previousDeck = duel[caster].deck.length;
      const expected = rpgMobaLancerMagie(immediate, caster, spell, target.id);
      assert.equal(expected.ok, true, JSON.stringify(expected));
      const actual = rpgMobaLancerMagie(duel, caster, spell, target.id, null, null, { ouvrirReponse: true });
      assert.equal(actual.sortEnAttente, true);
      assert.equal(JSON.stringify(target), originalTarget, 'no effect before priority passes');
      assert.equal(duel[caster].deck.length, previousDeck, 'no draw before resolution');
      const result = rpgMobaPasserSort(duel, defender);
      assert.equal(result.ok, true, JSON.stringify(result));
      assert.equal(Boolean(result.renvoiMain), Boolean(expected.renvoiMain));
      assert.deepEqual(duel.joueur, immediate.joueur);
      assert.deepEqual(duel.sorcier, immediate.sorcier);
      assert.deepEqual(duel.moba, immediate.moba);
      assert.equal(rpgMobaPlacementCoherent(duel), true);
    });
  }
}

test('direct adapter casts without the response opt-in still resolve friendly destruction immediately', () => {
  for (const spell of ['effacement-des-faibles', 'le-jugement-des-colosses']) {
    const duel = partie();
    const creature = spell === 'effacement-des-faibles' ? 'gardienne-des-portes-de-sable' : 'jarl-au-marteau-de-guerre';
    duel.joueur.main.push(creature, spell); duel.joueur.mana.sable = 10; duel.joueur.mana.neige = 10; duel.joueur.mana.tenebres = 10;
    const target = rpgMobaJouerCreature(duel, 'joueur', creature, 'left', 0).entite;
    const result = rpgMobaLancerMagie(duel, 'joueur', spell, target.id, null, null);
    assert.equal(result.ok, true);
    assert.equal(result.sortEnAttente, undefined);
    assert.ok(!duel.mobaSortEnAttente);
    assert.equal(duel.fenetreReponse, false);
    assert.equal(duel.joueur.creatures.some((entity) => entity.id === target.id), false);
  }
});

for (const spell of ['appat-de-la-meute', 'frappe-iaijutsu', 'courant-de-retour', 'haut-fond', 'lame-de-mer', 'effacement-des-faibles', 'le-jugement-des-colosses']) {
  test(`${spell}: an instant shield blocks the whole announced hostile spell`, () => {
    const duel = partie();
    const creature = spell === 'le-jugement-des-colosses' ? 'jarl-au-marteau-de-guerre' : 'gardienne-des-portes-de-sable';
    duel.joueur.main.push(creature, 'parade-du-verre'); duel.joueur.mana.sable = 10; duel.joueur.mana.neige = 10; duel.joueur.mana.eau = 10;
    const target = rpgMobaJouerCreature(duel, 'joueur', creature, 'center', 0).entite;
    const targetBefore = { pv: target.pv, atk: target.atk };
    rpgFinDeTour(duel);
    duel.sorcier.main.push(spell); for (const color of ['sable', 'neige', 'braise', 'eau', 'tenebres']) duel.sorcier.mana[color] = 10;
    const deck = duel.sorcier.deck.length;
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', spell, target.id, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'parade-du-verre', target.id).ok, true);
    assert.equal(rpgMobaPasserSort(duel, 'joueur').bouclierBloque, true);
    assert.ok(duel.joueur.creatures.includes(target));
    assert.deepEqual({ pv: target.pv, atk: target.atk }, targetBefore);
    assert.equal(target.bouclier, 0);
    assert.equal(target.blocageForce, null);
    assert.equal(duel.sorcier.deck.length, deck, 'even a linked draw must not happen through a shield');
    assert.equal(duel.sorcier.cimetiere.filter((id) => id === spell).length, 1);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  });
}

test('Courant de retour fizzles without drawing when its target lane is conquered in response', () => {
  const duel = partie();
  duel.joueur.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  mobaInfliger(duel.moba, 'joueur', 'left', 7);
  rpgFinDeTour(duel);
  duel.sorcier.main.push('courant-de-retour'); duel.sorcier.mana.eau = 10;
  duel.joueur.main.push('eclair-du-marteau'); duel.joueur.mana.neige = 10;
  const deck = duel.sorcier.deck.length;
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'courant-de-retour', target.id, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  const manaAfterPayment = JSON.stringify(duel.sorcier.mana);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'sorcier', 'left').ok, true);
  assert.equal(rpgMobaPasserSort(duel, 'joueur').dissipe, true);
  assert.equal(duel.sorcier.deck.length, deck);
  assert.equal(JSON.stringify(duel.sorcier.mana), manaAfterPayment);
  assert.equal(duel.sorcier.cimetiere.filter((id) => id === 'courant-de-retour').length, 1);
});

test('Courant de retour reads its Leviathan link at resolution after the defender responds', () => {
  for (const removeAnchor of [false, true]) {
    const duel = partie();
    duel.joueur.main.push('leviathan'); duel.joueur.mana.eau = 20;
    const leviathan = rpgMobaJouerCreature(duel, 'joueur', 'leviathan', 'center', 0).entite;
    assert.ok(leviathan);
    rpgFinDeTour(duel);
    duel.sorcier.main.push('gardienne-des-portes-de-sable', 'ressac'); duel.sorcier.mana.sable = 10; duel.sorcier.mana.eau = 10;
    const target = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    rpgFinDeTour(duel);
    duel.joueur.main.push('courant-de-retour'); duel.joueur.mana.eau = 10;
    const deck = duel.joueur.deck.length;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'courant-de-retour', target.id, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    if (removeAnchor) {
      const response = rpgMobaLancerMagie(duel, 'sorcier', 'ressac', leviathan.id, null, null, { ouvrirReponse: true });
      assert.equal(response.ok, true); assert.equal(response.sortEnAttente, undefined);
    }
    assert.equal(rpgMobaPasserSort(duel, 'sorcier').renvoiMain, true);
    assert.equal(deck - duel.joueur.deck.length, removeAnchor ? 1 : 2);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('AI shields its creature against an announced neutral destruction spell', () => {
  const duel = partie();
  rpgFinDeTour(duel);
  duel.sorcier.main.push('gardienne-des-portes-de-sable'); duel.sorcier.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  duel.sorcier.main = ['parade-du-verre']; duel.sorcier.mana.eau = 10;
  rpgFinDeTour(duel);
  duel.joueur.main.push('effacement-des-faibles'); duel.joueur.mana.tenebres = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'effacement-des-faibles', target.id, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  const snapshot = JSON.stringify(duel);
  const response = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
  assert.equal(response?.id, 'parade-du-verre'); assert.equal(response.cible, target.id);
  assert.equal(JSON.stringify(duel), snapshot);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', response.id, response.cible).ok, true);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').bouclierBloque, true);
  assert.ok(duel.sorcier.creatures.includes(target));
});

test('announced Lame de mer exiles a wounded Anqa without scheduling its death return', () => {
  const duel = partie();
  duel.joueur.main.push('anqa-des-braises'); duel.joueur.mana.braise = 10;
  const anqa = rpgMobaJouerCreature(duel, 'joueur', 'anqa-des-braises', 'center', 0).entite;
  anqa.pv = 2;
  rpgFinDeTour(duel);
  duel.sorcier.main.push('lame-de-mer'); duel.sorcier.mana.eau = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'lame-de-mer', anqa.id, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(rpgMobaPasserSort(duel, 'joueur').ok, true);
  assert.ok(!duel.joueur.creatures.includes(anqa));
  assert.ok(!duel.joueur.cimetiere.includes('anqa-des-braises'));
  assert.equal(duel.joueur.retoursProgrammes.length, 0);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('announced destruction still resolves an enemy Harakiri in its own lane', () => {
  const duel = partie();
  duel.joueur.main.push('hatamoto-des-cendres'); duel.joueur.mana.braise = 10;
  const target = rpgMobaJouerCreature(duel, 'joueur', 'hatamoto-des-cendres', 'right', 0).entite;
  rpgFinDeTour(duel);
  duel.sorcier.main.push('effacement-des-faibles'); duel.sorcier.mana.tenebres = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'effacement-des-faibles', target.id, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10);
  assert.equal(rpgMobaPasserSort(duel, 'joueur').ok, true);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 9);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 10);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('seeded MOBA mulligans are reproducible and keep invalid choices mutation-free', () => {
  const deck = [...MOBA_DECK_ESSAI];
  const make = () => {
    let seed = 123;
    const rng = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    return { duel: rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng }), rng };
  };
  const a = make(), b = make();
  for (const side of ['joueur', 'sorcier']) {
    const snapshot = JSON.stringify(a.duel);
    assert.equal(rpgMobaMulligan(a.duel, side, [-1], a.rng).ok, false);
    assert.equal(JSON.stringify(a.duel), snapshot);
    assert.equal(rpgMobaMulligan(a.duel, side, [0, 2], a.rng).ok, true);
    assert.equal(rpgMobaMulligan(b.duel, side, [0, 2], b.rng).ok, true);
  }
  assert.deepEqual(a.duel.joueur.main, b.duel.joueur.main);
  assert.deepEqual(a.duel.sorcier.main, b.duel.sorcier.main);
  assert.deepEqual(a.duel.joueur.deck, b.duel.joueur.deck);
  assert.deepEqual(a.duel.sorcier.deck, b.duel.sorcier.deck);
});

test('neutral hostile destruction with an ineligible mana cost cannot be announced or paid', () => {
  const duel = partie();
  duel.joueur.main.push('jarl-au-marteau-de-guerre'); duel.joueur.mana.neige = 10;
  const target = rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'center', 0).entite;
  rpgFinDeTour(duel);
  duel.sorcier.main.push('effacement-des-faibles'); duel.sorcier.mana.tenebres = 10;
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'effacement-des-faibles', target.id, null, null, { ouvrirReponse: true }).raison, 'cible');
  assert.equal(JSON.stringify(duel), before);
});

for (const spell of ['eclair-du-marteau', 'trait-de-braise']) {
  for (const caster of ['joueur', 'sorcier']) {
    for (const laneId of ['left', 'center', 'right']) {
      test(`${spell}: ${caster} announces ${laneId}, pays once and hits that lane only after pass`, () => {
        const duel = partie();
        if (caster === 'sorcier') rpgFinDeTour(duel);
        const defender = caster === 'joueur' ? 'sorcier' : 'joueur';
        duel[caster].main.push(spell); duel[caster].mana.neige = 10; duel[caster].mana.braise = 10;
        const before = JSON.stringify(duel.moba);
        const announcement = rpgMobaLancerMagie(duel, caster, spell, 'sorcier', laneId, null, { ouvrirReponse: true });
        assert.equal(announcement.sortEnAttente, true);
        assert.deepEqual(announcement.damageEvents, []);
        assert.equal(JSON.stringify(duel.moba), before);
        assert.equal(duel.mobaSortEnAttente.laneId, laneId);
        assert.ok(!duel[caster].main.includes(spell)); assert.ok(!duel[caster].cimetiere.includes(spell));
        const mana = JSON.stringify(duel[caster].mana);
        const pending = JSON.stringify(duel);
        assert.equal(rpgMobaPasserSort(duel, caster).ok, false);
        assert.equal(rpgMobaTerminerTour(duel, caster).ok, false);
        assert.equal(JSON.stringify(duel), pending);
        const result = rpgMobaPasserSort(duel, defender);
        assert.equal(result.ok, true);
        assert.equal(result.damageEvents.length, 1);
        assert.equal(result.damageEvents[0].damage, 3);
        assert.equal(result.damageEvents[0].targetSide, defender);
        assert.equal(result.damageEvents[0].laneId, laneId);
        assert.equal(mobaVoie(duel.moba, laneId).hp[defender], 7);
        assert.ok(duel.moba.lanes.filter((lane) => lane.id !== laneId).every((lane) => lane.hp[defender] === 10));
        assert.equal(JSON.stringify(duel[caster].mana), mana);
        assert.equal(duel[caster].cimetiere.filter((id) => id === spell).length, 1);
        assert.equal(duel.mobaSortEnAttente, null);
        assert.equal(duel.fenetreReponse, false);
      });
    }
  }
}

test('Le Poids can heal the threatened lane before its announced spell resolves', () => {
  const duel = partie();
  mobaInfliger(duel.moba, 'sorcier', 'center', 5);
  duel.joueur.main.push('le-poids'); duel.joueur.mana.tenebres = 10;
  rpgFinDeTour(duel);
  duel.sorcier.main.push('eclair-du-marteau'); duel.sorcier.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', 'sorcier', 'center', null, { ouvrirReponse: true }).sortEnAttente, true);
  const response = rpgMobaLancerMagie(duel, 'joueur', 'le-poids', null, 'center', null, { ouvrirReponse: true });
  assert.equal(response.ok, true); assert.equal(response.sortEnAttente, undefined);
  assert.equal(mobaVoie(duel.moba, 'center').hp.joueur, 7);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 8);
  const result = rpgMobaPasserSort(duel, 'joueur');
  assert.equal(result.damageEvents[0].damage, 3);
  assert.equal(mobaVoie(duel.moba, 'center').hp.joueur, 4);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 8);
});

test('conquering the targeted lane in response makes the paid lane spell fizzle without redirection', () => {
  for (const caster of ['joueur', 'sorcier']) {
    const duel = partie();
    const defender = caster === 'joueur' ? 'sorcier' : 'joueur';
    mobaInfliger(duel.moba, defender, 'left', 8);
    if (caster === 'sorcier') rpgFinDeTour(duel);
    duel[caster].main.push('trait-de-braise'); duel[caster].mana.braise = 10;
    duel[defender].main.push('le-poids'); duel[defender].mana.tenebres = 10;
    assert.equal(rpgMobaLancerMagie(duel, caster, 'trait-de-braise', 'sorcier', 'left', null, { ouvrirReponse: true }).sortEnAttente, true);
    const mana = JSON.stringify(duel[caster].mana);
    assert.equal(rpgMobaLancerMagie(duel, defender, 'le-poids', null, 'left').ok, true);
    assert.equal(mobaVoie(duel.moba, 'left').conqueredBy, defender);
    const before = JSON.stringify(duel.moba);
    const result = rpgMobaPasserSort(duel, defender);
    assert.equal(result.ok, true); assert.equal(result.dissipe, true);
    assert.equal(JSON.stringify(duel.moba), before);
    assert.equal(JSON.stringify(duel[caster].mana), mana);
    assert.equal(duel[caster].cimetiere.filter((id) => id === 'trait-de-braise').length, 1);
    assert.equal(duel.fenetreReponse, false);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('a paid lane spell can only win when it actually resolves', () => {
  const duel = partie();
  mobaInfliger(duel.moba, 'joueur', 'left', 10);
  mobaInfliger(duel.moba, 'joueur', 'right', 8);
  duel.joueur.main.push('eclair-du-marteau'); duel.joueur.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'sorcier', 'right', null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(duel.moba.winner, null);
  const result = rpgMobaPasserSort(duel, 'sorcier');
  assert.equal(result.damageEvents[0].conquered, true);
  assert.equal(result.damageEvents[0].damage, 2);
  assert.equal(duel.moba.winner, 'joueur');
  assert.equal(duel.fin.gagnant, 'joueur');
  assert.equal(duel.joueur.cimetiere.filter((id) => id === 'eclair-du-marteau').length, 1);
});

test('AI can heal a threatened lane with Le Poids to avert a pending lethal spell', () => {
  const duel = partie();
  mobaInfliger(duel.moba, 'joueur', 'left', 10);
  mobaInfliger(duel.moba, 'joueur', 'center', 7);
  duel.joueur.main.push('eclair-du-marteau'); duel.joueur.mana.neige = 10;
  duel.sorcier.main = ['le-poids']; duel.sorcier.mana.tenebres = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'sorcier', 'center', null, { ouvrirReponse: true }).sortEnAttente, true);
  let calls = 0; rpgReglerHasard(duel, () => { calls++; return .5; });
  const before = JSON.stringify(duel);
  const move = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
  assert.equal(move?.id, 'le-poids'); assert.equal(move.lane, 'center');
  assert.equal(JSON.stringify(duel), before); assert.equal(calls, 0);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', move.id, move.cible, move.lane, move.prixLane).ok, true);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.equal(duel.moba.winner, null);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 2);
});

test('the defender can win with a fast response before an announced lane spell resolves', () => {
  for (const caster of ['joueur', 'sorcier']) {
    const duel = partie();
    const defender = caster === 'joueur' ? 'sorcier' : 'joueur';
    mobaInfliger(duel.moba, defender, 'right', 10);
    mobaInfliger(duel.moba, defender, 'left', 8);
    if (caster === 'sorcier') rpgFinDeTour(duel);
    duel[caster].main.push('eclair-du-marteau'); duel[caster].mana.neige = 10;
    duel[defender].main.push('le-poids'); duel[defender].mana.tenebres = 10;
    assert.equal(rpgMobaLancerMagie(duel, caster, 'eclair-du-marteau', 'sorcier', 'left', null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.equal(rpgMobaLancerMagie(duel, defender, 'le-poids', null, 'left').ok, true);
    assert.equal(duel.moba.winner, defender);
    assert.equal(duel.mobaSortEnAttente, null);
    assert.equal(duel[caster].cimetiere.filter((id) => id === 'eclair-du-marteau').length, 1);
    assert.equal(rpgMobaPasserSort(duel, defender).raison, 'partie-terminee');
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Trait de braise reads the Lionne link at resolution even against a lane', () => {
  for (const removeAnchor of [false, true]) {
    const duel = partie();
    duel.joueur.main.push('lionne-du-midi-ardent'); duel.joueur.mana.braise = 20;
    const lionne = rpgMobaJouerCreature(duel, 'joueur', 'lionne-du-midi-ardent', 'center', 0).entite;
    assert.ok(lionne);
    duel.joueur.main.push('trait-de-braise');
    duel.sorcier.main.push('ressac', 'ressac'); duel.sorcier.mana.eau = 10;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'trait-de-braise', 'sorcier', 'right', null, { ouvrirReponse: true }).sortEnAttente, true);
    if (removeAnchor) {
      assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'ressac', lionne.id).bouclierBloque, true);
      assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'ressac', lionne.id).renvoiMain, true);
    }
    const result = rpgMobaPasserSort(duel, 'sorcier');
    assert.equal(result.damageEvents[0].damage, removeAnchor ? 3 : 4);
    assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, removeAnchor ? 7 : 6);
  }
});

test('invalid or inactive lane targets do not spend mana or open priority', () => {
  const duel = partie();
  duel.joueur.main.push('eclair-du-marteau'); duel.joueur.mana.neige = 10;
  mobaInfliger(duel.moba, 'joueur', 'left', 10);
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'sorcier', 'left', null, { ouvrirReponse: true }).raison, 'cible');
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'sorcier', 'nowhere', null, { ouvrirReponse: true }).raison, 'cible');
  assert.equal(JSON.stringify(duel), before);
});

for (const spell of ['parade-du-verre', 'voile-de-la-lune-noire', 'effacement-des-faibles', 'le-jugement-des-colosses']) {
  for (const caster of ['joueur', 'sorcier']) {
    test(`${spell}: ${caster} announces a friendly target and resolves only after the opponent passes`, () => {
      const duel = partie();
      if (caster === 'sorcier') rpgFinDeTour(duel);
      const defender = caster === 'joueur' ? 'sorcier' : 'joueur';
      const creature = spell === 'le-jugement-des-colosses' ? 'jarl-au-marteau-de-guerre' : 'gardienne-des-portes-de-sable';
      duel[caster].main.push(creature, spell);
      for (const color of ['sable', 'neige', 'eau', 'tenebres']) duel[caster].mana[color] = 10;
      const target = rpgMobaJouerCreature(duel, caster, creature, 'center', 0).entite;
      assert.ok(target);
      const immediate = JSON.parse(JSON.stringify(duel));
      rpgReglerHasard(duel, () => .5); rpgReglerHasard(immediate, () => .5);
      assert.equal(rpgMobaLancerMagie(immediate, caster, spell, target.id).ok, true);
      const targetBefore = JSON.stringify(target);
      const result = rpgMobaLancerMagie(duel, caster, spell, target.id, null, null, { ouvrirReponse: true });
      assert.equal(result.sortEnAttente, true);
      assert.equal(duel.mobaSortEnAttente.cibleNom, target.name);
      assert.equal(duel.mobaSortEnAttente.cibleCote, caster);
      assert.equal(JSON.stringify(target), targetBefore);
      assert.ok(!duel[caster].main.includes(spell));
      assert.ok(!duel[caster].cimetiere.includes(spell));
      const mana = JSON.stringify(duel[caster].mana), before = JSON.stringify(duel);
      assert.equal(rpgMobaPasserSort(duel, caster).ok, false);
      assert.equal(rpgMobaTerminerTour(duel, caster).ok, false);
      assert.equal(JSON.stringify(duel), before);
      assert.equal(rpgMobaPasserSort(duel, defender).ok, true);
      assert.equal(JSON.stringify(duel[caster].mana), mana);
      assert.deepEqual(duel.joueur, immediate.joueur);
      assert.deepEqual(duel.sorcier, immediate.sorcier);
      assert.deepEqual(duel.moba, immediate.moba);
      assert.equal(duel[caster].cimetiere.filter((id) => id === spell).length, 1);
      assert.equal(rpgMobaPlacementCoherent(duel), true);
    });

    test(`${spell}: ${caster}'s friendly target can be bounced in response without refund`, () => {
      const duel = partie();
      if (caster === 'sorcier') rpgFinDeTour(duel);
      const defender = caster === 'joueur' ? 'sorcier' : 'joueur';
      const creature = spell === 'le-jugement-des-colosses' ? 'jarl-au-marteau-de-guerre' : 'gardienne-des-portes-de-sable';
      duel[caster].main.push(creature, spell);
      for (const color of ['sable', 'neige', 'eau', 'tenebres']) duel[caster].mana[color] = 10;
      const target = rpgMobaJouerCreature(duel, caster, creature, 'center', 0).entite;
      duel[defender].main.push('ressac'); duel[defender].mana.eau = 10;
      assert.equal(rpgMobaLancerMagie(duel, caster, spell, target.id, null, null, { ouvrirReponse: true }).sortEnAttente, true);
      const mana = JSON.stringify(duel[caster].mana);
      const response = rpgMobaLancerMagie(duel, defender, 'ressac', target.id, null, null, { ouvrirReponse: true });
      assert.equal(response.renvoiMain, true);
      assert.equal(response.sortEnAttente, undefined, 'responses do not open nested windows');
      assert.ok(duel[caster].main.includes(creature));
      assert.equal(rpgMobaPasserSort(duel, defender).dissipe, true);
      assert.equal(JSON.stringify(duel[caster].mana), mana);
      assert.equal(duel[caster].cimetiere.filter((id) => id === spell).length, 1);
      assert.equal(duel.fenetreReponse, false);
      assert.equal(rpgMobaPlacementCoherent(duel), true);
    });
  }
}

test('a shield consumed in response can be restored by the already announced friendly Parade', () => {
  const duel = partie();
  duel.joueur.main.push('parade-du-verre'); duel.joueur.mana.eau = 10; duel.joueur.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  target.bouclier = 1; const pv = target.pv;
  duel.sorcier.main.push('eclair-du-marteau'); duel.sorcier.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'parade-du-verre', target.id, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', target.id).bouclierBloque, true);
  assert.equal(target.bouclier, 0);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.equal(target.bouclier, 1);
  assert.equal(target.pv, pv);
});

test('bouncing the intended Harakiri sacrifice prevents its death trigger and the pending victory', () => {
  const duel = partie();
  duel.joueur.main.push('hatamoto-des-cendres', 'effacement-des-faibles');
  duel.joueur.mana.braise = 10; duel.joueur.mana.tenebres = 10;
  const target = rpgMobaJouerCreature(duel, 'joueur', 'hatamoto-des-cendres', 'left', 0).entite;
  mobaInfliger(duel.moba, 'joueur', 'right', 10); mobaInfliger(duel.moba, 'joueur', 'left', 9);
  duel.sorcier.main = ['ressac']; duel.sorcier.mana.eau = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'effacement-des-faibles', target.id, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'ressac', target.id).renvoiMain, true);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').dissipe, true);
  assert.equal(duel.moba.winner, null);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 1);
  assert.ok(!duel.log.some((line) => line.startsWith('Harakiri')));
});

test('AI can remove a creature before an enemy Parade gives it a shield', () => {
  const duel = partie();
  duel.joueur.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  target.pv = 2;
  duel.joueur.main.push('parade-du-verre'); duel.joueur.mana.eau = 10;
  duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'parade-du-verre', target.id, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  let calls = 0; rpgReglerHasard(duel, () => { calls++; return .5; });
  const before = JSON.stringify(duel);
  const move = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
  assert.equal(move?.id, 'eclair-du-marteau'); assert.equal(move.cible, target.id);
  assert.equal(JSON.stringify(duel), before); assert.equal(calls, 0);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', move.id, move.cible).ok, true);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').dissipe, true);
  assert.ok(!duel.joueur.creatures.includes(target));
});

for (const caster of ['joueur', 'sorcier']) {
  for (const laneId of ['left', 'center', 'right']) {
    test(`Eau de la source: ${caster} announces healing ${laneId} and resolves only after pass`, () => {
      const duel = partie();
      const defender = caster === 'joueur' ? 'sorcier' : 'joueur';
      mobaInfliger(duel.moba, defender, laneId, 6);
      if (caster === 'sorcier') rpgFinDeTour(duel);
      duel[caster].main = ['eau-de-la-source']; duel[caster].mana.eau = 10;
      const result = rpgMobaLancerMagie(duel, caster, 'eau-de-la-source', null, laneId, null, { ouvrirReponse: true });
      assert.equal(result.sortEnAttente, true); assert.deepEqual(result.healingEvents, []);
      assert.equal(mobaVoie(duel.moba, laneId).hp[caster], 4);
      assert.deepEqual(duel.mobaSortEnAttente, { cote: caster, carteId: 'eau-de-la-source', cibleId: null, laneId, cibleCote: caster });
      assert.equal(duel[caster].mana.eau, 9); assert.equal(duel[caster].main.length, 0);
      assert.equal(duel[caster].cimetiere.includes('eau-de-la-source'), false);
      const pending = JSON.stringify(duel);
      assert.equal(rpgMobaPasserSort(duel, caster).ok, false);
      assert.equal(rpgMobaTerminerTour(duel, caster).ok, false);
      assert.equal(JSON.stringify(duel), pending);
      const resolution = rpgMobaPasserSort(duel, defender);
      assert.equal(resolution.ok, true); assert.deepEqual(resolution.damageEvents, []);
      assert.equal(resolution.healingEvents.length, 1);
      assert.equal(resolution.healingEvents[0].healing, 4);
      assert.equal(resolution.healingEvents[0].side, caster); assert.equal(resolution.healingEvents[0].laneId, laneId);
      assert.equal(mobaVoie(duel.moba, laneId).hp[caster], 8);
      assert.equal(duel[caster].mana.eau, 9);
      assert.equal(duel[caster].cimetiere.filter((id) => id === 'eau-de-la-source').length, 1);
      assert.equal(duel.mobaSortEnAttente, null); assert.equal(duel.fenetreReponse, false);
      assert.equal(rpgMobaPlacementCoherent(duel), true);
    });
  }
}

test('Eau de la source remains immediate without opt-in, validates its lane, and caps healing', () => {
  const duel = partie(); duel.joueur.main = ['eau-de-la-source']; duel.joueur.mana.eau = 10;
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eau-de-la-source', null, 'invalid', null, { ouvrirReponse: true }).raison, 'cible');
  assert.equal(JSON.stringify(duel), before);
  mobaInfliger(duel.moba, 'sorcier', 'center', 2);
  const result = rpgMobaLancerMagie(duel, 'joueur', 'eau-de-la-source', null, 'center');
  assert.equal(result.ok, true); assert.equal(result.sortEnAttente, undefined);
  assert.equal(result.healingEvents[0].healing, 2);
  assert.equal(mobaVoie(duel.moba, 'center').hp.joueur, 10);
  assert.equal(duel.mobaSortEnAttente, undefined);
});

test('conquering the lane being healed dissipates Eau de la source with no refund or redirection', () => {
  for (const caster of ['joueur', 'sorcier']) {
    const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
    mobaInfliger(duel.moba, defender, 'left', 8);
    if (caster === 'sorcier') rpgFinDeTour(duel);
    duel[caster].main = ['eau-de-la-source']; duel[caster].mana.eau = 10;
    duel[defender].main = ['eclair-du-marteau']; duel[defender].mana.neige = 10;
    assert.equal(rpgMobaLancerMagie(duel, caster, 'eau-de-la-source', null, 'left', null, { ouvrirReponse: true }).sortEnAttente, true);
    const response = rpgMobaLancerMagie(duel, defender, 'eclair-du-marteau', 'sorcier', 'left', null, { ouvrirReponse: true });
    assert.equal(response.ok, true); assert.equal(response.sortEnAttente, undefined);
    assert.equal(mobaVoie(duel.moba, 'left').conqueredBy, defender);
    const board = JSON.stringify(duel.moba);
    const pass = rpgMobaPasserSort(duel, defender);
    assert.equal(pass.ok, true); assert.equal(pass.dissipe, true);
    assert.equal(JSON.stringify(duel.moba), board); assert.equal(duel[caster].mana.eau, 9);
    assert.equal(duel[caster].cimetiere.filter((id) => id === 'eau-de-la-source').length, 1);
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('AI exploits an announced heal to conquer the targeted lane without mutating the live match', () => {
  const duel = partie(); mobaInfliger(duel.moba, 'sorcier', 'center', 8);
  duel.joueur.main = ['eau-de-la-source']; duel.joueur.mana.eau = 10;
  duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eau-de-la-source', null, 'center', null, { ouvrirReponse: true }).sortEnAttente, true);
  let calls = 0; rpgReglerHasard(duel, () => { calls++; return .5; });
  const before = JSON.stringify(duel);
  const move = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
  assert.equal(move?.id, 'eclair-du-marteau'); assert.equal(move.cible, 'sorcier'); assert.equal(move.lane, 'center');
  assert.equal(JSON.stringify(duel), before); assert.equal(calls, 0);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', move.id, move.cible, move.lane, move.prixLane).ok, true);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').dissipe, true);
  assert.equal(mobaVoie(duel.moba, 'center').conqueredBy, 'sorcier');
});

test('a winning response consumes an announced Eau de la source without resolving healing', () => {
  const duel = partie();
  mobaInfliger(duel.moba, 'sorcier', 'right', 10); mobaInfliger(duel.moba, 'sorcier', 'center', 8);
  duel.joueur.main = ['eau-de-la-source']; duel.joueur.mana.eau = 10;
  duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eau-de-la-source', null, 'center', null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', 'sorcier', 'center').ok, true);
  assert.equal(duel.moba.winner, 'sorcier'); assert.equal(duel.mobaSortEnAttente, null);
  assert.equal(duel.joueur.cimetiere.filter((id) => id === 'eau-de-la-source').length, 1);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').raison, 'partie-terminee');
});

for (const spell of ['le-poids', 'la-grande-pesee']) {
  for (const caster of ['joueur', 'sorcier']) {
    for (const laneId of ['left', 'center', 'right']) {
      test(`${spell}: ${caster} announces a ${laneId} transfer, pays costs once and resolves on pass`, () => {
        const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
        mobaInfliger(duel.moba, defender, laneId, 5);
        if (caster === 'sorcier') rpgFinDeTour(duel);
        duel[caster].main = [spell]; duel[caster].mana.tenebres = 10;
        const priceLane = spell === 'la-grande-pesee' ? 'right' : null;
        const deck = duel[caster].deck.length;
        const manaTotal = Object.values(duel[caster].mana).reduce((sum, amount) => sum + amount, 0);
        const result = rpgMobaLancerMagie(duel, caster, spell, null, laneId, priceLane, { ouvrirReponse: true });
        assert.equal(result.sortEnAttente, true);
        assert.deepEqual(result.healingEvents, []);
        assert.equal(result.damageEvents.length, priceLane ? 1 : 0);
        if (priceLane) { assert.equal(result.damageEvents[0].prix, true); assert.equal(result.damageEvents[0].laneId, priceLane); }
        assert.equal(duel.mobaSortEnAttente.cibleCote, defender);
        assert.equal(duel.mobaSortEnAttente.laneId, laneId);
        assert.equal(Object.values(duel[caster].mana).reduce((sum, amount) => sum + amount, 0), manaTotal - (spell === 'le-poids' ? 3 : 5));
        assert.equal(duel[caster].deck.length, deck);
        assert.equal(mobaVoie(duel.moba, laneId).hp[caster], 5 - (priceLane === laneId ? 1 : 0));
        assert.equal(mobaVoie(duel.moba, laneId).hp[defender], 10);
        const mana = JSON.stringify(duel[caster].mana);
        const state = JSON.stringify(duel);
        assert.equal(rpgMobaPasserSort(duel, caster).ok, false);
        assert.equal(rpgMobaTerminerTour(duel, caster).ok, false);
        assert.equal(JSON.stringify(duel), state);
        const resolved = rpgMobaPasserSort(duel, defender);
        assert.equal(resolved.ok, true, JSON.stringify(resolved));
        const amount = spell === 'le-poids' ? 2 : 3;
        assert.equal(resolved.damageEvents.length, 1); assert.equal(resolved.damageEvents[0].damage, amount);
        assert.equal(resolved.damageEvents[0].targetSide, defender); assert.equal(resolved.damageEvents[0].transfert, true);
        assert.equal(resolved.healingEvents[0].healing, amount);
        assert.equal(resolved.healingEvents[0].side, caster); assert.equal(resolved.healingEvents[0].laneId, laneId);
        assert.equal(mobaVoie(duel.moba, laneId).hp[defender], 10 - amount);
        assert.equal(mobaVoie(duel.moba, laneId).hp[caster], 5 - (priceLane === laneId ? 1 : 0) + amount);
        assert.equal(duel[caster].deck.length, deck - (priceLane ? 2 : 0));
        assert.equal(JSON.stringify(duel[caster].mana), mana);
        assert.equal(duel[caster].cimetiere.filter((id) => id === spell).length, 1);
        assert.equal(duel.mobaSortEnAttente, null); assert.equal(duel.fenetreReponse, false);
        assert.equal(rpgMobaPlacementCoherent(duel), true);
      });
    }
  }
}

test('transfer announcements validate target and price before spending and remain immediate without opt-in', () => {
  for (const spell of ['le-poids', 'la-grande-pesee']) {
    const duel = partie(); duel.joueur.main = [spell]; duel.joueur.mana.tenebres = 10;
    const before = JSON.stringify(duel);
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, 'invalid', 'left', { ouvrirReponse: true }).raison, 'cible');
    if (spell === 'la-grande-pesee') assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, 'left', null, { ouvrirReponse: true }).raison, 'cible');
    assert.equal(JSON.stringify(duel), before);
    const result = rpgMobaLancerMagie(duel, 'joueur', spell, null, 'left', spell === 'la-grande-pesee' ? 'center' : null);
    assert.equal(result.ok, true); assert.equal(result.sortEnAttente, undefined);
    assert.equal(result.damageEvents.at(-1).laneId, 'left');
    assert.equal(duel.mobaSortEnAttente, undefined);
  }
});

test('conquering an announced transfer lane dissipates it, even after the price was paid', () => {
  for (const spell of ['le-poids', 'la-grande-pesee']) for (const caster of ['joueur', 'sorcier']) {
    const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
    mobaInfliger(duel.moba, defender, 'left', 8);
    if (caster === 'sorcier') rpgFinDeTour(duel);
    duel[caster].main = [spell]; duel[caster].mana.tenebres = 10;
    duel[defender].main = ['eclair-du-marteau']; duel[defender].mana.neige = 10;
    const deck = duel[caster].deck.length;
    assert.equal(rpgMobaLancerMagie(duel, caster, spell, null, 'left', spell === 'la-grande-pesee' ? 'right' : null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.equal(mobaVoie(duel.moba, 'right').hp[caster], spell === 'la-grande-pesee' ? 9 : 10);
    const reaction = rpgMobaLancerMagie(duel, defender, 'eclair-du-marteau', 'sorcier', 'left', null, { ouvrirReponse: true });
    assert.equal(reaction.ok, true); assert.equal(reaction.sortEnAttente, undefined);
    const state = JSON.stringify(duel.moba), mana = duel[caster].mana.tenebres;
    assert.equal(rpgMobaPasserSort(duel, defender).dissipe, true);
    assert.equal(JSON.stringify(duel.moba), state); assert.equal(duel[caster].mana.tenebres, mana);
    assert.equal(duel[caster].deck.length, deck); assert.equal(duel[caster].cimetiere.filter((id) => id === spell).length, 1);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('La Grande Pesée resolves even if its already-paid price lane is conquered in response', () => {
  const duel = partie(); mobaInfliger(duel.moba, 'sorcier', 'right', 8);
  mobaInfliger(duel.moba, 'sorcier', 'center', 5);
  duel.joueur.main = ['la-grande-pesee']; duel.joueur.mana.tenebres = 10;
  duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'la-grande-pesee', null, 'center', 'right', { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, 1);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', 'sorcier', 'right').ok, true);
  assert.equal(mobaVoie(duel.moba, 'right').conqueredBy, 'sorcier');
  const deck = duel.joueur.deck.length;
  const result = rpgMobaPasserSort(duel, 'sorcier');
  assert.equal(result.ok, true); assert.equal(result.damageEvents[0].damage, 3);
  assert.equal(result.healingEvents[0].healing, 3); assert.equal(duel.joueur.deck.length, deck - 2);
  assert.equal(mobaVoie(duel.moba, 'center').hp.joueur, 8);
  assert.equal(duel.joueur.cimetiere.filter((id) => id === 'la-grande-pesee').length, 1);
});

test('La Grande Pesée reads the Dévoreuse link at resolution, not announcement', () => {
  for (const removeAnchor of [false, true]) {
    const duel = partie(); duel.joueur.mana.tenebres = 20; duel.joueur.main = ['la-devoreuse'];
    const anchor = rpgMobaJouerCreature(duel, 'joueur', 'la-devoreuse', 'left', 0).entite;
    assert.ok(anchor); duel.joueur.main = ['la-grande-pesee'];
    duel.sorcier.main = ['ressac']; duel.sorcier.mana.eau = 10;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'la-grande-pesee', null, 'center', 'right', { ouvrirReponse: true }).sortEnAttente, true);
    if (removeAnchor) assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'ressac', anchor.id).renvoiMain, true);
    const result = rpgMobaPasserSort(duel, 'sorcier');
    assert.equal(result.damageEvents[0].damage, removeAnchor ? 3 : 4);
    assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, removeAnchor ? 7 : 6);
  }
});

test('announced lethal transfer heals then wins on pass, and La Grande Pesée does not draw after victory', () => {
  for (const spell of ['le-poids', 'la-grande-pesee']) {
    const duel = partie(); mobaInfliger(duel.moba, 'joueur', 'right', 10);
    mobaInfliger(duel.moba, 'joueur', 'center', 8); mobaInfliger(duel.moba, 'sorcier', 'center', 4);
    duel.joueur.main = [spell]; duel.joueur.mana.tenebres = 10;
    const deck = duel.joueur.deck.length;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, 'center', spell === 'la-grande-pesee' ? 'left' : null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.equal(duel.moba.winner, null); assert.equal(duel.joueur.deck.length, deck);
    const result = rpgMobaPasserSort(duel, 'sorcier');
    assert.equal(result.ok, true); assert.equal(result.damageEvents[0].conquered, true);
    assert.equal(result.healingEvents[0].healing, spell === 'le-poids' ? 2 : 3);
    assert.equal(duel.moba.winner, 'joueur'); assert.equal(duel.joueur.deck.length, deck);
    assert.equal(duel.joueur.cimetiere.filter((id) => id === spell).length, 1);
  }
});

test('AI responds to an announced lethal transfer on a copy and can prevent defeat', () => {
  const duel = partie(); mobaInfliger(duel.moba, 'joueur', 'right', 10); mobaInfliger(duel.moba, 'joueur', 'center', 8);
  duel.joueur.main = ['la-grande-pesee']; duel.joueur.mana.tenebres = 10;
  duel.sorcier.main = ['le-poids']; duel.sorcier.mana.tenebres = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'la-grande-pesee', null, 'center', 'left', { ouvrirReponse: true }).sortEnAttente, true);
  let calls = 0; rpgReglerHasard(duel, () => { calls++; return .5; });
  const before = JSON.stringify(duel), move = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
  assert.equal(move?.id, 'le-poids'); assert.equal(move.lane, 'center');
  assert.equal(JSON.stringify(duel), before); assert.equal(calls, 0);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', move.id, move.cible, move.lane, move.prixLane, { ouvrirReponse: true }).sortEnAttente, undefined);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.equal(duel.moba.winner, null); assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 1);
});

test('a winning response cancels an announced transfer after its payment', () => {
  for (const spell of ['le-poids', 'la-grande-pesee']) {
    const duel = partie(); mobaInfliger(duel.moba, 'sorcier', 'right', 10);
    mobaInfliger(duel.moba, 'sorcier', 'left', 8);
    duel.joueur.main = [spell]; duel.joueur.mana.tenebres = 10;
    duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
    const deck = duel.joueur.deck.length;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, 'left', spell === 'la-grande-pesee' ? 'center' : null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', 'sorcier', 'left').ok, true);
    assert.equal(duel.moba.winner, 'sorcier'); assert.equal(duel.mobaSortEnAttente, null);
    assert.equal(duel.joueur.deck.length, deck);
    assert.equal(mobaVoie(duel.moba, 'center').hp.joueur, spell === 'la-grande-pesee' ? 9 : 10);
    assert.equal(duel.joueur.cimetiere.filter((id) => id === spell).length, 1);
    assert.equal(rpgMobaPasserSort(duel, 'sorcier').raison, 'partie-terminee');
  }
});

for (const caster of ['joueur', 'sorcier']) for (const laneId of ['left', 'center', 'right']) {
  test(`Festin: ${caster} announces global healing and ${laneId}, then heals only on pass`, () => {
    const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
    if (caster === 'sorcier') rpgFinDeTour(duel);
    duel[caster].mana.sable = 20;
    const left = rpgMobaJouerCreature(duel, caster, 'gardienne-des-portes-de-sable', 'left', 0).entite;
    const right = rpgMobaJouerCreature(duel, caster, 'gardienne-des-portes-de-sable', 'right', 0).entite;
    assert.ok(left && right);
    left.pv -= 1; left.def -= 1; right.pv -= 2; right.def -= 2;
    const leftBefore = left.pv, rightBefore = right.pv;
    mobaInfliger(duel.moba, defender, laneId, 3);
    duel[caster].main = ['festin-des-vaillants']; duel[caster].mana.neige = 10;
    const manaBefore = Object.values(duel[caster].mana).reduce((sum, amount) => sum + amount, 0);
    const before = JSON.stringify(duel.moba);
    const announcement = rpgMobaLancerMagie(duel, caster, 'festin-des-vaillants', null, laneId, null, { ouvrirReponse: true });
    assert.equal(announcement.sortEnAttente, true); assert.deepEqual(announcement.healingEvents, []);
    assert.equal(JSON.stringify(duel.moba), before); assert.equal(left.pv, leftBefore); assert.equal(right.pv, rightBefore);
    assert.equal(duel.mobaSortEnAttente.cibleCote, caster); assert.equal(duel.mobaSortEnAttente.laneId, laneId);
    assert.equal(Object.values(duel[caster].mana).reduce((sum, amount) => sum + amount, 0), manaBefore - 3);
    assert.ok(!duel[caster].main.includes('festin-des-vaillants')); assert.ok(!duel[caster].cimetiere.includes('festin-des-vaillants'));
    const mana = JSON.stringify(duel[caster].mana), pending = JSON.stringify(duel);
    assert.equal(rpgMobaPasserSort(duel, caster).ok, false); assert.equal(rpgMobaTerminerTour(duel, caster).ok, false);
    assert.equal(JSON.stringify(duel), pending);
    const result = rpgMobaPasserSort(duel, defender);
    assert.equal(result.ok, true); assert.equal(result.healingEvents[0].healing, 2);
    assert.equal(result.healingEvents[0].side, caster); assert.equal(result.healingEvents[0].laneId, laneId);
    assert.equal(left.pv, left.pvMax); assert.equal(right.pv, right.pvMax);
    assert.equal(mobaVoie(duel.moba, laneId).hp[caster], 9);
    assert.equal(JSON.stringify(duel[caster].mana), mana);
    assert.equal(duel[caster].cimetiere.filter((id) => id === 'festin-des-vaillants').length, 1);
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(rpgMobaPlacementCoherent(duel), true);
  });
}

test('Festin with an invalid or inactive lane spends nothing; without opt-in it stays immediate', () => {
  const duel = partie(); duel.joueur.main = ['festin-des-vaillants']; duel.joueur.mana.neige = 10;
  mobaInfliger(duel.moba, 'sorcier', 'right', 10);
  const before = JSON.stringify(duel);
  for (const lane of ['missing', 'right', null]) assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'festin-des-vaillants', null, lane, null, { ouvrirReponse: true }).raison, 'cible');
  assert.equal(JSON.stringify(duel), before);
  mobaInfliger(duel.moba, 'sorcier', 'left', 1);
  const immediate = rpgMobaLancerMagie(duel, 'joueur', 'festin-des-vaillants', null, 'left');
  assert.equal(immediate.ok, true); assert.equal(immediate.sortEnAttente, undefined);
  assert.equal(immediate.healingEvents[0].healing, 1); assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 10);
});

test('Festin heals surviving allies even if the selected lane is conquered, without redirecting its lane heal', () => {
  for (const caster of ['joueur', 'sorcier']) {
    const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
    if (caster === 'sorcier') rpgFinDeTour(duel);
    duel[caster].mana.sable = 10;
    const lost = rpgMobaJouerCreature(duel, caster, 'gardienne-des-portes-de-sable', 'left', 0).entite;
    const survivor = rpgMobaJouerCreature(duel, caster, 'gardienne-des-portes-de-sable', 'right', 0).entite;
    lost.pv -= 2; lost.def -= 2; survivor.pv -= 2; survivor.def -= 2;
    mobaInfliger(duel.moba, defender, 'left', 8); mobaInfliger(duel.moba, defender, 'right', 4);
    duel[caster].main = ['festin-des-vaillants']; duel[caster].mana.neige = 10;
    duel[defender].main = ['eclair-du-marteau']; duel[defender].mana.neige = 10;
    assert.equal(rpgMobaLancerMagie(duel, caster, 'festin-des-vaillants', null, 'left', null, { ouvrirReponse: true }).sortEnAttente, true);
    const reaction = rpgMobaLancerMagie(duel, defender, 'eclair-du-marteau', 'sorcier', 'left', null, { ouvrirReponse: true });
    assert.equal(reaction.sortEnAttente, undefined); assert.equal(mobaVoie(duel.moba, 'left').conqueredBy, defender);
    assert.ok(!duel[caster].creatures.includes(lost));
    const result = rpgMobaPasserSort(duel, defender);
    assert.equal(result.ok, true); assert.equal(result.dissipe, undefined);
    assert.deepEqual(result.healingEvents, []); assert.equal(mobaVoie(duel.moba, 'right').hp[caster], 6);
    assert.match(duel.log.at(-1), /voie.*conquise.*créatures alliées/);
    assert.equal(survivor.pv, survivor.pvMax);
    assert.equal(duel[caster].cimetiere.filter((id) => id === 'festin-des-vaillants').length, 1);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Festin does not heal an ally returned to hand during the response', () => {
  const duel = partie(); duel.joueur.mana.sable = 10;
  const removed = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  const stays = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite;
  removed.pv -= 2; removed.def -= 2; stays.pv -= 2; stays.def -= 2;
  duel.joueur.main = ['festin-des-vaillants']; duel.joueur.mana.neige = 10;
  duel.sorcier.main = ['ressac']; duel.sorcier.mana.eau = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'festin-des-vaillants', null, 'center', null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'ressac', removed.id).renvoiMain, true);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.ok(!duel.joueur.creatures.includes(removed)); assert.ok(duel.joueur.main.includes('gardienne-des-portes-de-sable'));
  assert.equal(stays.pv, stays.pvMax);
});

test('AI can remove a wounded ally before Festin resolves without mutating live state while planning', () => {
  const duel = partie(); duel.joueur.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'center', 0).entite;
  target.pv = 2; target.def = 2;
  duel.joueur.main = ['festin-des-vaillants']; duel.joueur.mana.neige = 10;
  duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'festin-des-vaillants', null, 'left', null, { ouvrirReponse: true }).sortEnAttente, true);
  let calls = 0; rpgReglerHasard(duel, () => { calls++; return .5; });
  const before = JSON.stringify(duel), move = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
  assert.equal(move?.id, 'eclair-du-marteau'); assert.equal(move.cible, target.id);
  assert.equal(JSON.stringify(duel), before); assert.equal(calls, 0);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', move.id, move.cible, move.lane).ok, true);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.ok(!duel.joueur.creatures.includes(target));
});

test('a winning response ends the match before Festin can heal any creature', () => {
  const duel = partie(); duel.joueur.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite;
  target.pv -= 2; target.def -= 2;
  mobaInfliger(duel.moba, 'sorcier', 'left', 10); mobaInfliger(duel.moba, 'sorcier', 'center', 8);
  duel.joueur.main = ['festin-des-vaillants']; duel.joueur.mana.neige = 10;
  duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'festin-des-vaillants', null, 'center', null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', 'sorcier', 'center').ok, true);
  assert.equal(duel.moba.winner, 'sorcier'); assert.equal(duel.mobaSortEnAttente, null);
  assert.equal(target.pv, target.pvMax - 2); assert.equal(duel.joueur.cimetiere.filter((id) => id === 'festin-des-vaillants').length, 1);
});

for (const spell of ['rapport-du-greffier', 'les-feuillets']) for (const caster of ['joueur', 'sorcier']) {
  test(`${spell}: ${caster} announces the correct deck, pays once and resolves after pass`, () => {
    const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
    if (caster === 'sorcier') rpgFinDeTour(duel);
    duel[caster].main = [spell]; duel[caster].mana.sable = 10; duel[caster].mana.tenebres = 10;
    duel[caster].deck = ['ashigaru-des-braises', 'viking-des-neiges', 'loup-des-neiges'];
    duel[defender].deck = ['ashigaru-des-braises', 'viking-des-neiges', 'loup-des-neiges', 'gardienne-des-portes-de-sable'];
    const own = [...duel[caster].deck], enemy = [...duel[defender].deck], grave = [...duel[defender].cimetiere];
    const beforeMana = Object.values(duel[caster].mana).reduce((a, b) => a + b, 0);
    const result = rpgMobaLancerMagie(duel, caster, spell, null, null, null, { ouvrirReponse: true });
    assert.equal(result.ok, true); assert.equal(result.sortEnAttente, true);
    assert.equal(Object.values(duel[caster].mana).reduce((a, b) => a + b, 0), beforeMana - 4);
    assert.deepEqual(duel[caster].deck, own); assert.deepEqual(duel[defender].deck, enemy);
    assert.deepEqual(duel[defender].cimetiere, grave);
    assert.deepEqual(duel.mobaSortEnAttente, { cote: caster, carteId: spell, cibleId: null, cibleNom: 'Pioche', cibleCote: spell === 'rapport-du-greffier' ? caster : defender });
    const mana = JSON.stringify(duel[caster].mana), pending = JSON.stringify(duel);
    assert.equal(rpgMobaPasserSort(duel, caster).ok, false); assert.equal(rpgMobaTerminerTour(duel, caster).ok, false);
    assert.equal(JSON.stringify(duel), pending);
    assert.equal(rpgMobaPasserSort(duel, defender).ok, true);
    if (spell === 'rapport-du-greffier') {
      assert.deepEqual(duel[caster].deck, own.slice(0, -2));
      assert.deepEqual(duel[caster].main, [own.at(-1), own.at(-2)]);
      assert.deepEqual(duel[defender].deck, enemy);
    } else {
      assert.deepEqual(duel[defender].deck, enemy.slice(0, -3));
      assert.deepEqual(duel[defender].cimetiere, [...grave, ...enemy.slice(-3)]);
      assert.deepEqual(duel[caster].deck, own);
    }
    assert.equal(JSON.stringify(duel[caster].mana), mana);
    assert.equal(duel[caster].cimetiere.filter((id) => id === spell).length, 1);
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(duel.fenetreReponse, false);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  });
}

test('Papyrus can draw the top card before Les feuillets mills the remaining deck, without a nested window', () => {
  for (const caster of ['joueur', 'sorcier']) {
    const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
    if (caster === 'sorcier') rpgFinDeTour(duel);
    duel[caster].main = ['les-feuillets']; duel[caster].mana.tenebres = 10;
    duel[defender].main = ['papyrus']; duel[defender].mana.tenebres = 10;
    duel[defender].deck = ['ashigaru-des-braises', 'viking-des-neiges', 'loup-des-neiges', 'gardienne-des-portes-de-sable'];
    assert.equal(rpgMobaLancerMagie(duel, caster, 'les-feuillets', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    const response = rpgMobaLancerMagie(duel, defender, 'papyrus', null, 'center', null, { ouvrirReponse: true });
    assert.equal(response.ok, true); assert.equal(response.sortEnAttente, undefined);
    assert.equal(duel.mobaSortEnAttente.carteId, 'les-feuillets');
    assert.ok(duel[defender].main.includes('gardienne-des-portes-de-sable'));
    assert.equal(mobaVoie(duel.moba, 'center').hp[defender], 8);
    assert.equal(rpgMobaPasserSort(duel, defender).ok, true);
    assert.deepEqual(duel[defender].deck, []);
    assert.deepEqual(duel[defender].cimetiere.slice(-3), ['ashigaru-des-braises', 'viking-des-neiges', 'loup-des-neiges']);
    assert.ok(!duel[defender].cimetiere.includes('gardienne-des-portes-de-sable'));
  }
});

test('announced draw and milling handle depleted decks without MOBA fatigue and remain immediate without opt-in', () => {
  for (const spell of ['rapport-du-greffier', 'les-feuillets']) for (const optIn of [false, true]) {
    const duel = partie(); duel.joueur.main = [spell]; duel.joueur.mana.sable = 10; duel.joueur.mana.tenebres = 10;
    duel.joueur.deck = []; duel.sorcier.deck = ['loup-des-neiges'];
    const lanes = JSON.stringify(duel.moba), wizard = [duel.joueur.pv, duel.sorcier.pv];
    const result = rpgMobaLancerMagie(duel, 'joueur', spell, null, null, null, { ouvrirReponse: optIn });
    assert.equal(result.ok, true);
    if (optIn) { assert.equal(result.sortEnAttente, true); assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true); }
    else assert.equal(result.sortEnAttente, undefined);
    assert.equal(JSON.stringify(duel.moba), lanes); assert.deepEqual([duel.joueur.pv, duel.sorcier.pv], wizard);
    assert.equal(duel.sorcier.deck.length, spell === 'les-feuillets' ? 0 : 1);
    assert.equal(duel.joueur.cimetiere.filter((id) => id === spell).length, 1);
  }
});

test('deck spell invalid targets do not pay, and an opponent win prevents the draw or mill', () => {
  for (const spell of ['rapport-du-greffier', 'les-feuillets']) {
    const duel = partie();
    duel.joueur.main = [spell]; duel.joueur.mana.sable = 10; duel.joueur.mana.tenebres = 10;
    const before = JSON.stringify(duel);
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, 'center', null, { ouvrirReponse: true }).raison, 'cible');
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, 'sorcier', null, null, { ouvrirReponse: true }).raison, 'cible');
    assert.equal(JSON.stringify(duel), before);
    mobaInfliger(duel.moba, 'sorcier', 'right', 10); mobaInfliger(duel.moba, 'sorcier', 'center', 8);
    duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
    const decks = [duel.joueur.deck.length, duel.sorcier.deck.length];
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', 'sorcier', 'center').ok, true);
    assert.equal(duel.moba.winner, 'sorcier'); assert.equal(duel.mobaSortEnAttente, null);
    assert.deepEqual([duel.joueur.deck.length, duel.sorcier.deck.length], decks);
    assert.equal(duel.joueur.cimetiere.filter((id) => id === spell).length, 1);
  }
});

test('AI finds a winning response before Les feuillets resolves without consuming live RNG while planning', () => {
  const duel = partie(); mobaInfliger(duel.moba, 'sorcier', 'right', 10); mobaInfliger(duel.moba, 'sorcier', 'center', 8);
  duel.joueur.main = ['les-feuillets']; duel.joueur.mana.tenebres = 10;
  duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
  duel.sorcier.deck = ['ashigaru-des-braises', 'viking-des-neiges', 'loup-des-neiges', 'gardienne-des-portes-de-sable'];
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'les-feuillets', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  let calls = 0; rpgReglerHasard(duel, () => { calls++; return .5; });
  const before = JSON.stringify(duel), move = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
  assert.equal(move?.id, 'eclair-du-marteau'); assert.equal(move.lane, 'center');
  assert.equal(JSON.stringify(duel), before); assert.equal(calls, 0);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', move.id, move.cible, move.lane).ok, true);
  assert.equal(duel.moba.winner, 'sorcier'); assert.equal(duel.mobaSortEnAttente, null);
  assert.equal(duel.sorcier.deck.length, 4);
});

for (const spell of ['tempete-de-sable', 'vent-rouge', 'brisure-de-verre']) for (const caster of ['joueur', 'sorcier']) {
  test(`${spell}: ${caster} announces a hostile wave, and a response protects one lane creature`, () => {
    const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
    duel.joueur.mana.sable = 20;
    const playerAlly = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'center', 0).entite;
    rpgFinDeTour(duel); duel.sorcier.mana.sable = 20;
    const aiLeft = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    const aiRight = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    let left, right, casterAlly;
    if (caster === 'joueur') { rpgFinDeTour(duel); left = aiLeft; right = aiRight; casterAlly = playerAlly; }
    else {
      rpgFinDeTour(duel); duel.joueur.mana.sable = 20;
      left = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
      right = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite;
      rpgFinDeTour(duel); casterAlly = aiLeft;
    }
    assert.ok(left && right && casterAlly);
    duel[caster].main = [spell]; duel[caster].mana.sable = 20; duel[caster].mana.braise = 20; duel[caster].mana.eau = 20;
    duel[defender].main = ['parade-du-verre']; duel[defender].mana.eau = 10;
    const beforeHp = [left.pv, right.pv, casterAlly.pv], board = JSON.stringify(duel.moba);
    const manaBefore = Object.values(duel[caster].mana).reduce((sum, amount) => sum + amount, 0);
    const result = rpgMobaLancerMagie(duel, caster, spell, null, null, null, { ouvrirReponse: true });
    assert.equal(result.sortEnAttente, true);
    assert.deepEqual(duel.mobaSortEnAttente, { cote: caster, carteId: spell, cibleId: null, cibleNom: 'Créatures', cibleCote: defender });
    assert.deepEqual([left.pv, right.pv, casterAlly.pv], beforeHp); assert.equal(JSON.stringify(duel.moba), board);
    assert.equal(Object.values(duel[caster].mana).reduce((sum, amount) => sum + amount, 0), manaBefore - magieById(spell).cost);
    assert.ok(!duel[caster].main.includes(spell)); assert.ok(!duel[caster].cimetiere.includes(spell));
    const mana = JSON.stringify(duel[caster].mana), pending = JSON.stringify(duel);
    assert.equal(rpgMobaPasserSort(duel, caster).ok, false); assert.equal(rpgMobaTerminerTour(duel, caster).ok, false);
    assert.equal(JSON.stringify(duel), pending);
    const response = rpgMobaLancerMagie(duel, defender, 'parade-du-verre', left.id, null, null, { ouvrirReponse: true });
    assert.equal(response.ok, true); assert.equal(response.sortEnAttente, undefined);
    assert.ok(left.bouclier > 0); assert.equal(duel.mobaSortEnAttente.carteId, spell);
    assert.equal(rpgMobaPasserSort(duel, defender).ok, true);
    assert.equal(left.pv, beforeHp[0]); assert.equal(left.bouclier, 0);
    assert.equal(right.pv, beforeHp[1] - ({ 'tempete-de-sable': 3, 'vent-rouge': 2, 'brisure-de-verre': 1 })[spell]);
    assert.equal(casterAlly.pv, beforeHp[2]);
    assert.equal(JSON.stringify(duel[caster].mana), mana);
    assert.equal(duel[caster].cimetiere.filter((id) => id === spell).length, 1);
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(rpgMobaPlacementCoherent(duel), true);
  });
}

test('area spells keep immediate behavior without opt-in and invalid announcements never spend', () => {
  for (const spell of ['tempete-de-sable', 'vent-rouge', 'brisure-de-verre']) {
    const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const target = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    rpgFinDeTour(duel); duel.joueur.main = [spell]; duel.joueur.mana.sable = 10; duel.joueur.mana.eau = 10; duel.joueur.mana.braise = 10;
    const before = JSON.stringify(duel);
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, target.id, null, null, { ouvrirReponse: true }).raison, 'cible');
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, 'left', null, { ouvrirReponse: true }).raison, 'cible');
    assert.equal(JSON.stringify(duel), before);
    const res = rpgMobaLancerMagie(duel, 'joueur', spell);
    assert.equal(res.ok, true); assert.equal(res.sortEnAttente, undefined); assert.ok(target.pv < 4);
  }
});

test('a Brisure response resolves immediately, never nesting a second wave window', () => {
  const duel = partie(); duel.joueur.mana.braise = 10; duel.joueur.main = ['ashigaru-des-braises'];
  const target = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  duel.joueur.main = ['tempete-de-sable']; duel.joueur.mana.sable = 10;
  duel.sorcier.main = ['brisure-de-verre']; duel.sorcier.mana.eau = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'tempete-de-sable', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  const response = rpgMobaLancerMagie(duel, 'sorcier', 'brisure-de-verre', null, null, null, { ouvrirReponse: true });
  assert.equal(response.ok, true); assert.equal(response.sortEnAttente, undefined);
  assert.ok(!duel.joueur.creatures.includes(target)); assert.equal(duel.mobaSortEnAttente.carteId, 'tempete-de-sable');
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.equal(duel.mobaSortEnAttente, null); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('a winning response prevents a pending hostile wave and consumes its reserved spell', () => {
  for (const spell of ['tempete-de-sable', 'vent-rouge', 'brisure-de-verre']) {
    const duel = partie(); mobaInfliger(duel.moba, 'sorcier', 'right', 10); mobaInfliger(duel.moba, 'sorcier', 'center', 8);
    duel.joueur.main = [spell]; duel.joueur.mana.sable = 10; duel.joueur.mana.eau = 10; duel.joueur.mana.braise = 10;
    duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', 'sorcier', 'center').ok, true);
    assert.equal(duel.moba.winner, 'sorcier'); assert.equal(duel.mobaSortEnAttente, null);
    assert.equal(duel.joueur.cimetiere.filter((id) => id === spell).length, 1);
  }
});

test('Tempête reads the Faucon link at resolution after a response removes its anchor', () => {
  for (const removeAnchor of [false, true]) {
    const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const victim = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    rpgFinDeTour(duel); duel.joueur.main = ['faucon-du-zenith']; duel.joueur.mana.sable = 20; duel.joueur.mana.tenebres = 20;
    const anchor = rpgMobaJouerCreature(duel, 'joueur', 'faucon-du-zenith', 'center', 0).entite; assert.ok(anchor);
    duel.joueur.main = ['tempete-de-sable']; duel.sorcier.main = ['ressac', 'ressac']; duel.sorcier.mana.eau = 10;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'tempete-de-sable', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    if (removeAnchor) {
      assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'ressac', anchor.id).bouclierBloque, true);
      assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'ressac', anchor.id).renvoiMain, true);
    }
    assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
    assert.equal(duel.sorcier.creatures.includes(victim), removeAnchor);
    if (removeAnchor) assert.equal(victim.pv, 1);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('AI anticipates a hostile wave and shields a threatened ally on an isolated probe', () => {
  const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite; target.pv = 3; target.def = 3;
  rpgFinDeTour(duel); duel.joueur.main = ['tempete-de-sable']; duel.joueur.mana.sable = 10;
  duel.sorcier.main = ['parade-du-verre']; duel.sorcier.mana.eau = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'tempete-de-sable', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  let calls = 0; rpgReglerHasard(duel, () => { calls++; return .5; });
  const before = JSON.stringify(duel), move = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
  assert.equal(move?.id, 'parade-du-verre'); assert.equal(move.cible, target.id);
  assert.equal(JSON.stringify(duel), before); assert.equal(calls, 0);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', move.id, move.cible).ok, true);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.ok(duel.sorcier.creatures.includes(target)); assert.equal(target.pv, 3); assert.equal(target.bouclier, 0);
});

test('Vent rouge reads Daimyō’s link when the announced wave resolves', () => {
  for (const removeAnchor of [false, true]) {
    const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const target = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'center', 0).entite;
    rpgFinDeTour(duel); duel.joueur.main = ['daimyo-du-soleil-rouge']; duel.joueur.mana.braise = 20; duel.joueur.mana.sable = 20;
    const anchor = rpgMobaJouerCreature(duel, 'joueur', 'daimyo-du-soleil-rouge', 'right', 0).entite; assert.ok(anchor);
    duel.joueur.main = ['vent-rouge']; duel.sorcier.main = ['ressac']; duel.sorcier.mana.eau = 10;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'vent-rouge', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    if (removeAnchor) assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'ressac', anchor.id).renvoiMain, true);
    assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
    assert.equal(target.pv, removeAnchor ? 2 : 1); assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('announced hostile wave resolves death triggers and lane victory only on passing', () => {
  const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.braise = 10; duel.sorcier.main = ['ronin-du-soleil-rouge'];
  const ronin = rpgMobaJouerCreature(duel, 'sorcier', 'ronin-du-soleil-rouge', 'left', 0).entite; assert.ok(ronin);
  ronin.pv = 1;
  rpgFinDeTour(duel); mobaInfliger(duel.moba, 'sorcier', 'right', 10); mobaInfliger(duel.moba, 'sorcier', 'left', 9);
  duel.joueur.main = ['brisure-de-verre']; duel.joueur.mana.eau = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'brisure-de-verre', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(duel.moba.winner, null); assert.ok(duel.sorcier.creatures.includes(ronin));
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.equal(duel.moba.winner, 'sorcier'); assert.equal(duel.fin.gagnant, 'sorcier');
  assert.equal(duel.mobaSortEnAttente, null); assert.equal(duel.joueur.cimetiere.filter((id) => id === 'brisure-de-verre').length, 1);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Brisure consumes only the matching colored shield on the wave and hurts the unprotected ally', () => {
  const duel = partie(); rpgFinDeTour(duel);
  duel.sorcier.mana.sable = 10; duel.sorcier.mana.braise = 20;
  const guardian = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
  duel.sorcier.main = ['lionne-du-midi-ardent'];
  const lionne = rpgMobaJouerCreature(duel, 'sorcier', 'lionne-du-midi-ardent', 'left', 0).entite;
  assert.ok(lionne.protection); rpgFinDeTour(duel);
  duel.joueur.main = ['brisure-de-verre']; duel.joueur.mana.eau = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'brisure-de-verre', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.ok(lionne.protection); assert.equal(guardian.pv, 4);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.equal(lionne.protection, null); assert.equal(lionne.pv, 4); assert.equal(guardian.pv, 3);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('a hostile wave still resolves and is spent against an empty battlefield', () => {
  const duel = partie();
  duel.joueur.main = ['tempete-de-sable']; duel.joueur.mana.sable = 10;
  assert.equal(duel.sorcier.creatures.length, 0);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'tempete-de-sable', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  const pass = rpgMobaPasserSort(duel, 'sorcier');
  assert.equal(pass.ok, true); assert.equal(pass.dissipe, undefined);
  assert.equal(duel.joueur.cimetiere.filter((id) => id === 'tempete-de-sable').length, 1);
});

for (const spell of ['brume-du-fjord', 'hurlement-du-blizzard', 'verglas', 'nuage-de-cendres']) for (const caster of ['joueur', 'sorcier']) {
  test(`${spell}: ${caster} announces the wave; shield, damage and freeze occur only after pass`, () => {
    const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
    duel.joueur.mana.sable = 20;
    const own = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'center', 0).entite;
    rpgFinDeTour(duel); duel.sorcier.mana.sable = 20;
    const aiLeft = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    const aiRight = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    let left, right, ally;
    if (caster === 'joueur') { rpgFinDeTour(duel); left = aiLeft; right = aiRight; ally = own; }
    else {
      rpgFinDeTour(duel); duel.joueur.mana.sable = 20;
      left = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
      right = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite;
      rpgFinDeTour(duel); ally = aiLeft;
    }
    duel[caster].main = [spell]; duel[caster].mana.neige = 20; duel[caster].mana.braise = 20;
    duel[defender].main = ['parade-du-verre']; duel[defender].mana.eau = 10;
    let rolls = 0; rpgReglerHasard(duel, () => { rolls++; return .05; });
    const initialMana = Object.values(duel[caster].mana).reduce((a, b) => a + b, 0);
    assert.equal(rpgMobaLancerMagie(duel, caster, spell, null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.deepEqual(duel.mobaSortEnAttente, { cote: caster, carteId: spell, cibleId: null, cibleNom: 'Créatures', cibleCote: defender });
    assert.equal(Object.values(duel[caster].mana).reduce((a, b) => a + b, 0), initialMana - magieById(spell).cost);
    assert.equal(left.pv, 4); assert.equal(right.pv, 4); assert.ok(!right.gelToursRestants);
    assert.equal(duel[defender].degatsEchos.length, 0); assert.equal(rolls, 0);
    const paid = JSON.stringify(duel[caster].mana);
    assert.equal(rpgMobaLancerMagie(duel, defender, 'parade-du-verre', left.id, null, null, { ouvrirReponse: true }).ok, true);
    assert.equal(duel.mobaSortEnAttente.carteId, spell); assert.equal(rolls, 0);
    assert.equal(rpgMobaPasserSort(duel, defender).ok, true);
    assert.equal(left.pv, 4); assert.equal(left.bouclier, 0); assert.ok(!left.gelToursRestants);
    assert.equal(right.pv, 4 - (spell === 'brume-du-fjord' ? 1 : 2));
    assert.equal(Boolean(right.gelToursRestants), spell !== 'nuage-de-cendres');
    assert.equal(rolls, ['brume-du-fjord', 'hurlement-du-blizzard'].includes(spell) ? (caster === 'sorcier' ? 2 : 1) : 0);
    assert.equal(duel[defender].degatsEchos.length, spell === 'nuage-de-cendres' ? 1 : 0);
    assert.equal(ally.pv, 4); assert.equal(JSON.stringify(duel[caster].mana), paid);
    assert.equal(duel[caster].cimetiere.filter((id) => id === spell).length, 1);
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(rpgMobaPlacementCoherent(duel), true);
  });
}

test('frost wave rolls separately for surviving unshielded creatures at resolution', () => {
  for (const spell of ['brume-du-fjord', 'hurlement-du-blizzard']) {
    const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 20;
    const first = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    const second = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    rpgFinDeTour(duel); duel.joueur.main = [spell]; duel.joueur.mana.neige = 20;
    let rolls = 0; rpgReglerHasard(duel, () => [0.05, 0.9][rolls++]);
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.equal(rolls, 0); assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
    assert.equal(rolls, 2); assert.ok(first.gelToursRestants > 0); assert.ok(!second.gelToursRestants);
  }
});

test('Hurlement reads Géant link at resolution after Ressac removes the anchor', () => {
  for (const removeAnchor of [false, true]) {
    const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const target = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    rpgFinDeTour(duel); duel.joueur.main = ['geant-des-banquises']; duel.joueur.mana.neige = 20;
    const anchor = rpgMobaJouerCreature(duel, 'joueur', 'geant-des-banquises', 'center', 0).entite; assert.ok(anchor);
    const before = target.pv;
    duel.joueur.main = ['hurlement-du-blizzard']; duel.sorcier.main = ['ressac']; duel.sorcier.mana.eau = 10;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'hurlement-du-blizzard', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    if (removeAnchor) assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'ressac', anchor.id).renvoiMain, true);
    assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
    assert.equal(target.pv, before - (removeAnchor ? 2 : 3));
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Nuage reads Susanoo at resolution and only schedules its next-turn echo on pass', () => {
  for (const removeAnchor of [false, true]) {
    const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 20;
    const target = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    rpgFinDeTour(duel); duel.joueur.main = ['susanoo']; duel.joueur.mana.braise = 20;
    const anchor = rpgMobaJouerCreature(duel, 'joueur', 'susanoo', 'center', 0).entite; assert.ok(anchor);
    duel.joueur.main = ['nuage-de-cendres']; duel.sorcier.main = ['ressac']; duel.sorcier.mana.eau = 10;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'nuage-de-cendres', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.equal(duel.sorcier.degatsEchos.length, 0);
    if (removeAnchor) assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'ressac', anchor.id).renvoiMain, true);
    const hp = target.pv;
    assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
    assert.equal(target.pv, hp - (removeAnchor ? 2 : 3));
    assert.equal(duel.sorcier.degatsEchos.length, 1);
    assert.equal(terminerEtPasser(duel, 'joueur').ok, true); assert.equal(target.pv, hp - (removeAnchor ? 2 : 3));
    assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
    assert.equal(target.pv, hp - (removeAnchor ? 3 : 4)); assert.equal(duel.sorcier.degatsEchos.length, 0);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('winning response cancels a Nuage before either wave is scheduled', () => {
  const duel = partie(); mobaInfliger(duel.moba, 'sorcier', 'right', 10); mobaInfliger(duel.moba, 'sorcier', 'center', 8);
  duel.joueur.main = ['nuage-de-cendres']; duel.joueur.mana.braise = 10;
  duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'nuage-de-cendres', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', 'sorcier', 'center').ok, true);
  assert.equal(duel.moba.winner, 'sorcier'); assert.equal(duel.mobaSortEnAttente, null);
  assert.equal(duel.sorcier.degatsEchos.length, 0); assert.equal(duel.joueur.cimetiere.filter((id) => id === 'nuage-de-cendres').length, 1);
});

test('frost and ash waves remain immediate for direct adapter callers', () => {
  for (const spell of ['brume-du-fjord', 'hurlement-du-blizzard', 'verglas', 'nuage-de-cendres']) {
    const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const target = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    rpgFinDeTour(duel); duel.joueur.main = [spell]; duel.joueur.mana.neige = 10; duel.joueur.mana.braise = 10;
    const before = JSON.stringify(duel);
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, target.id, null, null, { ouvrirReponse: true }).raison, 'cible');
    assert.equal(JSON.stringify(duel), before);
    const result = rpgMobaLancerMagie(duel, 'joueur', spell);
    assert.equal(result.ok, true); assert.equal(result.sortEnAttente, undefined); assert.ok(target.pv < 4);
  }
});

test('AI probes pending frost waves without mutating the duel or consuming live RNG', () => {
  for (const spell of ['verglas', 'brume-du-fjord']) {
    const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const target = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite; target.pv = spell === 'verglas' ? 2 : 1;
    rpgFinDeTour(duel); duel.joueur.main = [spell]; duel.joueur.mana.neige = 10;
    duel.sorcier.main = ['parade-du-verre']; duel.sorcier.mana.eau = 10;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    let calls = 0; rpgReglerHasard(duel, () => { calls++; return .05; });
    const before = JSON.stringify(duel), move = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
    assert.equal(move?.id, 'parade-du-verre'); assert.equal(move.cible, target.id);
    assert.equal(JSON.stringify(duel), before); assert.equal(calls, 0);
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', move.id, move.cible).ok, true);
    assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
    assert.equal(target.pv, spell === 'verglas' ? 2 : 1); assert.ok(!target.gelToursRestants); assert.equal(target.bouclier, 0);
    assert.equal(calls, 0);
  }
});

test('Nuage echo hits the current enemy battlefield on the caster’s next turn', () => {
  const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
  const protectedTarget = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  rpgFinDeTour(duel); duel.joueur.main = ['nuage-de-cendres']; duel.joueur.mana.braise = 10;
  duel.sorcier.main = ['parade-du-verre']; duel.sorcier.mana.eau = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'nuage-de-cendres', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'parade-du-verre', protectedTarget.id).ok, true);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.equal(protectedTarget.pv, 4); assert.equal(protectedTarget.bouclier, 0);
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  duel.sorcier.main = ['gardienne-des-portes-de-sable']; duel.sorcier.mana.sable = 10;
  const newcomer = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
  assert.equal(protectedTarget.pv, 4); assert.equal(newcomer.pv, 4);
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  assert.equal(protectedTarget.pv, 3); assert.equal(newcomer.pv, 3); assert.equal(duel.sorcier.degatsEchos.length, 0);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const spell of ['grand-hiver', 'tempete-de-foudre-et-de-givre']) for (const caster of ['joueur', 'sorcier']) {
  test(`${spell}: ${caster} announces both camps; only opposing shields stop their own wave component`, () => {
    const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
    duel.joueur.mana.sable = 20;
    const playerCenter = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'center', 0).entite;
    rpgFinDeTour(duel); duel.sorcier.mana.sable = 20;
    const aiLeft = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    const aiRight = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    let left, right, ally;
    if (caster === 'joueur') { rpgFinDeTour(duel); left = aiLeft; right = aiRight; ally = playerCenter; }
    else {
      rpgFinDeTour(duel); duel.joueur.mana.sable = 20;
      left = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
      right = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite;
      rpgFinDeTour(duel); ally = aiLeft;
    }
    ally.bouclier = 1;
    duel[caster].main = [spell]; duel[caster].mana.neige = 20; duel[caster].mana.braise = 20;
    duel[defender].main = ['parade-du-verre']; duel[defender].mana.eau = 10;
    const before = Object.values(duel[caster].mana).reduce((a, b) => a + b, 0);
    assert.equal(rpgMobaLancerMagie(duel, caster, spell, null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.deepEqual(duel.mobaSortEnAttente, { cote: caster, carteId: spell, cibleId: null, cibleNom: 'Créatures', cibleCote: 'tous' });
    assert.match(duel.log.at(-1), /créatures des deux camps/);
    assert.equal(Object.values(duel[caster].mana).reduce((a, b) => a + b, 0), before - magieById(spell).cost);
    assert.deepEqual([left.pv, right.pv, ally.pv, ally.bouclier], [4, 4, 4, 1]);
    const paid = JSON.stringify(duel[caster].mana), pending = JSON.stringify(duel);
    assert.equal(rpgMobaPasserSort(duel, caster).ok, false); assert.equal(JSON.stringify(duel), pending);
    const response = rpgMobaLancerMagie(duel, defender, 'parade-du-verre', left.id, null, null, { ouvrirReponse: true });
    assert.equal(response.ok, true); assert.equal(response.sortEnAttente, undefined);
    assert.equal(rpgMobaPasserSort(duel, defender).ok, true);
    const amount = spell === 'grand-hiver' ? 1 : 3;
    assert.equal(left.pv, 4); assert.equal(left.bouclier, 0); assert.equal(right.pv, 4 - amount);
    assert.equal(ally.pv, 4 - amount); assert.equal(ally.bouclier, 1, 'own shield does not intercept allied magic');
    assert.equal(JSON.stringify(duel[caster].mana), paid); assert.equal(duel[caster].cimetiere.filter((id) => id === spell).length, 1);
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(rpgMobaPlacementCoherent(duel), true);
  });
}

test('a response can remove a creature before a symmetric wave resolves on the current battlefield', () => {
  for (const spell of ['grand-hiver', 'tempete-de-foudre-et-de-givre']) {
    const duel = partie(); duel.joueur.mana.sable = 20;
    const removed = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    const present = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const defender = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'center', 0).entite;
    rpgFinDeTour(duel); duel.joueur.main = [spell]; duel.joueur.mana.neige = 10; duel.joueur.mana.braise = 10;
    duel.sorcier.main = ['ressac']; duel.sorcier.mana.eau = 10;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'ressac', removed.id).renvoiMain, true);
    assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
    assert.ok(duel.joueur.main.includes('gardienne-des-portes-de-sable')); assert.equal(removed.pv, 4);
    assert.equal(present.pv, spell === 'grand-hiver' ? 3 : 1);
    assert.equal(defender.pv, spell === 'grand-hiver' ? 3 : 1);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('symmetric waves remove simultaneous victims before Harakiri determines the winner', () => {
  for (const spell of ['grand-hiver', 'tempete-de-foudre-et-de-givre']) {
    const duel = partie(); duel.joueur.main = ['ashigaru-des-braises']; duel.joueur.mana.braise = 10;
    const ally = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'center', 0).entite;
    rpgFinDeTour(duel); duel.sorcier.mana.braise = 10; duel.sorcier.main = ['ronin-du-soleil-rouge'];
    const ronin = rpgMobaJouerCreature(duel, 'sorcier', 'ronin-du-soleil-rouge', 'left', 0).entite; ronin.pv = 1;
    rpgFinDeTour(duel); mobaInfliger(duel.moba, 'sorcier', 'right', 10); mobaInfliger(duel.moba, 'sorcier', 'left', 9);
    duel.joueur.main = [spell]; duel.joueur.mana.neige = 10; duel.joueur.mana.braise = 10;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.equal(duel.moba.winner, null); assert.ok(duel.joueur.creatures.includes(ally)); assert.ok(duel.sorcier.creatures.includes(ronin));
    assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
    assert.equal(duel.moba.winner, 'sorcier'); assert.equal(duel.fin.gagnant, 'sorcier');
    assert.ok(!duel.joueur.creatures.includes(ally)); assert.ok(!duel.sorcier.creatures.includes(ronin));
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('symmetric waves keep immediate adapter behavior and reject illegal targets without spending', () => {
  for (const spell of ['grand-hiver', 'tempete-de-foudre-et-de-givre']) {
    const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const target = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    rpgFinDeTour(duel); duel.joueur.main = [spell]; duel.joueur.mana.neige = 10; duel.joueur.mana.braise = 10;
    const before = JSON.stringify(duel);
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, target.id, null, null, { ouvrirReponse: true }).raison, 'cible');
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, 'left', null, { ouvrirReponse: true }).raison, 'cible');
    assert.equal(JSON.stringify(duel), before);
    const result = rpgMobaLancerMagie(duel, 'joueur', spell);
    assert.equal(result.ok, true); assert.equal(result.sortEnAttente, undefined); assert.equal(target.pv, spell === 'grand-hiver' ? 3 : 1);
  }
});

test('a winning response prevents a symmetric wave and consumes its reserved card', () => {
  for (const spell of ['grand-hiver', 'tempete-de-foudre-et-de-givre']) {
    const duel = partie(); duel.joueur.mana.sable = 10;
    const ally = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    mobaInfliger(duel.moba, 'sorcier', 'right', 10); mobaInfliger(duel.moba, 'sorcier', 'center', 8);
    duel.joueur.main = [spell]; duel.joueur.mana.neige = 10; duel.joueur.mana.braise = 10;
    duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', 'sorcier', 'center').ok, true);
    assert.equal(duel.moba.winner, 'sorcier'); assert.equal(duel.mobaSortEnAttente, null); assert.equal(ally.pv, 4);
    assert.equal(duel.joueur.cimetiere.filter((id) => id === spell).length, 1);
  }
});

test('AI probes a symmetric wave and shields a threatened ally without mutating live state or RNG', () => {
  const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite; target.pv = 1;
  rpgFinDeTour(duel); duel.joueur.main = ['grand-hiver']; duel.joueur.mana.neige = 10;
  duel.sorcier.main = ['parade-du-verre']; duel.sorcier.mana.eau = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  let calls = 0; rpgReglerHasard(duel, () => { calls++; return .5; });
  const before = JSON.stringify(duel), move = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
  assert.equal(move?.id, 'parade-du-verre'); assert.equal(move.cible, target.id); assert.equal(JSON.stringify(duel), before); assert.equal(calls, 0);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', move.id, move.cible).ok, true);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.equal(target.pv, 1); assert.equal(target.bouclier, 0);
});

test('simultaneous global damage schedules Anqa returns only after resolution', () => {
  const duel = partie(); duel.joueur.main = ['anqa-des-braises']; duel.joueur.mana.braise = 10;
  const anqa = rpgMobaJouerCreature(duel, 'joueur', 'anqa-des-braises', 'center', 0).entite; anqa.pv = 1;
  rpgFinDeTour(duel); duel.sorcier.mana.braise = 10; duel.sorcier.main = ['anqa-des-braises'];
  const enemy = rpgMobaJouerCreature(duel, 'sorcier', 'anqa-des-braises', 'right', 0).entite; enemy.pv = 1;
  rpgFinDeTour(duel); duel.joueur.main = ['grand-hiver']; duel.joueur.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(duel.joueur.retoursProgrammes.length, 0); assert.equal(duel.sorcier.retoursProgrammes.length, 0);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.equal(duel.joueur.retoursProgrammes.length, 1); assert.equal(duel.joueur.retoursProgrammes[0].mobaLane, 'center');
  assert.equal(duel.sorcier.retoursProgrammes.length, 1); assert.equal(duel.sorcier.retoursProgrammes[0].mobaLane, 'right');
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('symmetric wave dodge RNG is deferred and a successful dodge affects only its carrier', () => {
  const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
  const first = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  const second = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
  first.esquive = true; first.esquiveChance = .5;
  rpgFinDeTour(duel); duel.joueur.main = ['grand-hiver']; duel.joueur.mana.neige = 10;
  let calls = 0; rpgReglerHasard(duel, () => { calls++; return .1; });
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(calls, 0); assert.equal(first.pv, 4); assert.equal(second.pv, 4);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.equal(calls, 1); assert.equal(first.pv, 4); assert.equal(second.pv, 3);
});

for (const spell of ['la-derniere-pesee', 'ressac-de-la-lune-noire']) for (const caster of ['joueur', 'sorcier']) {
  test(`${spell}: ${caster} announces both camps and resolves each opposing shield individually`, () => {
    const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
    duel.joueur.mana.sable = 20;
    const playerCenter = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'center', 0).entite;
    rpgFinDeTour(duel); duel.sorcier.mana.sable = 20;
    const aiLeft = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    const aiRight = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    let left, right, ally;
    if (caster === 'joueur') { rpgFinDeTour(duel); left = aiLeft; right = aiRight; ally = playerCenter; }
    else {
      rpgFinDeTour(duel); duel.joueur.mana.sable = 20;
      left = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
      right = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite;
      rpgFinDeTour(duel); ally = aiLeft;
    }
    ally.bouclier = 1;
    duel[caster].main = [spell]; duel[caster].mana.tenebres = 20; duel[caster].mana.eau = 20;
    duel[defender].main = ['parade-du-verre']; duel[defender].mana.eau = 10;
    const initialMana = Object.values(duel[caster].mana).reduce((a, b) => a + b, 0);
    assert.equal(rpgMobaLancerMagie(duel, caster, spell, null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.deepEqual(duel.mobaSortEnAttente, { cote: caster, carteId: spell, cibleId: null, cibleNom: 'Créatures', cibleCote: 'tous' });
    assert.match(duel.log.at(-1), /créatures des deux camps/);
    assert.equal(Object.values(duel[caster].mana).reduce((a, b) => a + b, 0), initialMana - magieById(spell).cost);
    assert.ok(duel[caster].creatures.includes(ally)); assert.ok(duel[defender].creatures.includes(left)); assert.ok(duel[defender].creatures.includes(right));
    const paid = JSON.stringify(duel[caster].mana), before = JSON.stringify(duel);
    assert.equal(rpgMobaPasserSort(duel, caster).ok, false); assert.equal(JSON.stringify(duel), before);
    const response = rpgMobaLancerMagie(duel, defender, 'parade-du-verre', left.id, null, null, { ouvrirReponse: true });
    assert.equal(response.ok, true); assert.equal(response.sortEnAttente, undefined);
    assert.equal(rpgMobaPasserSort(duel, defender).ok, true);
    assert.ok(duel[defender].creatures.includes(left)); assert.equal(left.bouclier, 0);
    assert.ok(!duel[defender].creatures.includes(right)); assert.ok(!duel[caster].creatures.includes(ally));
    assert.equal(ally.bouclier, 1, 'own shield does not intercept allied magic');
    const zone = spell === 'la-derniere-pesee' ? 'cimetiere' : 'main';
    assert.ok(duel[caster][zone].includes(ally.carteId)); assert.ok(duel[defender][zone].includes(right.carteId));
    assert.equal(JSON.stringify(duel[caster].mana), paid); assert.equal(duel[caster].cimetiere.filter((id) => id === spell).length, 1);
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(rpgMobaPlacementCoherent(duel), true);
  });
}

test('symmetric destruction and return retain immediate behavior without opt-in and reject invented targets', () => {
  for (const spell of ['la-derniere-pesee', 'ressac-de-la-lune-noire']) {
    const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const target = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    rpgFinDeTour(duel); duel.joueur.main = [spell]; duel.joueur.mana.tenebres = 10; duel.joueur.mana.eau = 10;
    const before = JSON.stringify(duel);
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, target.id, null, null, { ouvrirReponse: true }).raison, 'cible');
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, 'left', null, { ouvrirReponse: true }).raison, 'cible');
    assert.equal(JSON.stringify(duel), before);
    const result = rpgMobaLancerMagie(duel, 'joueur', spell);
    assert.equal(result.ok, true); assert.equal(result.sortEnAttente, undefined); assert.ok(!duel.sorcier.creatures.includes(target));
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('winning responses cancel global destruction and return before touching the board', () => {
  for (const spell of ['la-derniere-pesee', 'ressac-de-la-lune-noire']) {
    const duel = partie(); duel.joueur.mana.sable = 10;
    const ally = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    mobaInfliger(duel.moba, 'sorcier', 'right', 10); mobaInfliger(duel.moba, 'sorcier', 'center', 8);
    duel.joueur.main = [spell]; duel.joueur.mana.tenebres = 10; duel.joueur.mana.eau = 10;
    duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', 'sorcier', 'center').ok, true);
    assert.equal(duel.moba.winner, 'sorcier'); assert.equal(duel.mobaSortEnAttente, null); assert.ok(duel.joueur.creatures.includes(ally));
    assert.equal(duel.joueur.cimetiere.filter((id) => id === spell).length, 1);
  }
});

test('La Dernière Pesée produces death tokens only after simultaneous removals, in their original lanes', () => {
  const duel = partieCombat(); duel.joueur.mana.tenebres = 20; duel.joueur.main = ['momie-de-lin'];
  const first = rpgMobaJouerCreature(duel, 'joueur', 'momie-de-lin', 'left', 1).entite;
  rpgFinDeTour(duel); duel.sorcier.mana.tenebres = 10; duel.sorcier.main = ['momie-de-lin'];
  const second = rpgMobaJouerCreature(duel, 'sorcier', 'momie-de-lin', 'right', 0).entite;
  rpgFinDeTour(duel); duel.joueur.main = ['la-derniere-pesee']; duel.joueur.mana.tenebres = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'la-derniere-pesee', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.ok(duel.joueur.creatures.includes(first)); assert.ok(duel.sorcier.creatures.includes(second));
  assert.ok(!duel.joueur.creatures.some((e) => e.jeton)); assert.ok(!duel.sorcier.creatures.some((e) => e.jeton));
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  for (const [side, lane, emplacement] of [['joueur', 'left', 0], ['sorcier', 'right', 3]]) {
    const token = duel[side].creatures.find((e) => e.carteId === 'shabti');
    assert.ok(token); assert.equal(token.mobaLane, lane); assert.equal(token.emplacement, emplacement);
  }
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('a removed caster creature does not die when La Dernière Pesée later resolves', () => {
  const duel = partieCombat(); duel.joueur.mana.braise = 20; duel.joueur.main = ['anqa-des-braises'];
  const anqa = rpgMobaJouerCreature(duel, 'joueur', 'anqa-des-braises', 'center', 0).entite;
  duel.joueur.main = ['la-derniere-pesee']; duel.joueur.mana.tenebres = 10;
  duel.sorcier.main = ['ressac']; duel.sorcier.mana.eau = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'la-derniere-pesee', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'ressac', anqa.id).renvoiMain, true);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.ok(duel.joueur.main.includes('anqa-des-braises')); assert.equal(duel.joueur.retoursProgrammes.length, 0);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('global return makes tokens cease to exist without death triggers or entering hands', () => {
  const duel = partieCombat(); duel.joueur.main = ['momie-de-lin']; duel.joueur.mana.tenebres = 20; duel.joueur.mana.neige = 10;
  const momie = rpgMobaJouerCreature(duel, 'joueur', 'momie-de-lin', 'center', 0).entite; momie.pv = 1;
  duel.joueur.main = ['grand-hiver']; assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver').ok, true);
  const token = duel.joueur.creatures.find((e) => e.carteId === 'shabti'); assert.ok(token?.jeton);
  duel.joueur.main = ['ressac-de-la-lune-noire']; duel.joueur.mana.eau = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'ressac-de-la-lune-noire', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.ok(duel.joueur.creatures.includes(token)); assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.ok(!duel.joueur.creatures.includes(token)); assert.ok(!duel.joueur.main.includes('shabti')); assert.ok(!duel.joueur.cimetiere.includes('shabti'));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('AI probes a pending symmetric wipe without mutating state or live RNG', () => {
  for (const spell of ['la-derniere-pesee', 'ressac-de-la-lune-noire']) {
    const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
    const target = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    rpgFinDeTour(duel); duel.joueur.main = [spell]; duel.joueur.mana.tenebres = 10; duel.joueur.mana.eau = 10;
    duel.sorcier.main = ['parade-du-verre']; duel.sorcier.mana.eau = 10;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    let calls = 0; rpgReglerHasard(duel, () => { calls++; return .5; });
    const before = JSON.stringify(duel), move = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
    assert.equal(move?.id, 'parade-du-verre'); assert.equal(move.cible, target.id); assert.equal(JSON.stringify(duel), before); assert.equal(calls, 0);
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', move.id, move.cible).ok, true);
    assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
    assert.ok(duel.sorcier.creatures.includes(target)); assert.equal(target.bouclier, 0);
  }
});

test('La Dernière Pesée stops later death triggers after a Harakiri victory', () => {
  const duel = partieCombat(); duel.joueur.mana.braise = 20;
  duel.joueur.main = ['hatamoto-des-cendres', 'hatamoto-des-cendres'];
  const first = rpgMobaJouerCreature(duel, 'joueur', 'hatamoto-des-cendres', 'left', 0).entite;
  const second = rpgMobaJouerCreature(duel, 'joueur', 'hatamoto-des-cendres', 'right', 0).entite;
  mobaInfliger(duel.moba, 'joueur', 'center', 10); mobaInfliger(duel.moba, 'joueur', 'left', 9);
  duel.joueur.main = ['la-derniere-pesee']; duel.joueur.mana.tenebres = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'la-derniere-pesee', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.ok(duel.joueur.creatures.includes(first)); assert.ok(duel.joueur.creatures.includes(second)); assert.equal(duel.moba.winner, null);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.equal(duel.moba.winner, 'joueur'); assert.equal(duel.fin.gagnant, 'joueur');
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10); assert.equal(duel.log.filter((line) => line.startsWith('Harakiri')).length, 1);
  assert.equal(duel.mobaSortEnAttente, null); assert.equal(rpgMobaPlacementCoherent(duel), true);
});
