import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgChoisirCouleurMana, rpgConditionEmbuscadeRemplie, rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan, rpgNouveauDuel, rpgPeutRepondre, rpgJouerCreature, rpgJouerArme, rpgLancerAttaque, rpgPeutAttaquer, rpgPeutBloquerAttaquant, rpgReglerHasard, rpgVainqueur } from '../src/games/rpgDuel.js';
import { cardById, magieById, RPG_MAGIE_CARDS } from '../src/games/rpgCards.js';
import { rpgMobaNouveauDuel, rpgMobaChoisirVoieCentrale, rpgMobaCiblesDestruction, rpgMobaCiblesPrise, rpgMobaResoudreDestruction, rpgMobaCiblesSite, rpgMobaResoudreSite, rpgMobaCandidatsRecherche, rpgMobaResoudreRecherche, rpgMobaPlacementCoherent, rpgMobaJouerCreature, rpgMobaJouerArme, rpgMobaResoudreArrivee, rpgMobaDeclarerAttaque, rpgMobaCiblesAttaque, rpgMobaLancerAttaque, rpgMobaLancerMagie, rpgMobaMulligan, rpgMobaTerminerTour, rpgMobaPasserFinDeTour, rpgMobaPasserEffetCreature, rpgMobaPasserSort, rpgMobaPasserCreature, rpgMobaPeutPayer, rpgMobaDefausser, rpgMobaValiderDeck, rpgMobaCreerPartie, MOBA_CARTES_AUTORISEES, MOBA_DECK_ESSAI, MOBA_DECKS } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirMagieIA } from '../src/games/rpgMobaAI.js';
import { CARTES_COMBAT_AUDITEES } from '../src/games/rpgMobaAudit.js';
import { validerDeckManaEssai } from '../src/games/rpgManaEssai.js';
import { mobaInfliger, mobaRetirer, mobaVoie } from '../src/games/rpgMoba.js';

function terminerEtPasser(duel, side) {
  const result = rpgMobaTerminerTour(duel, side);
  return result.reponse ? rpgMobaPasserFinDeTour(duel, result.reponse) : result;
}

function partie() {
  const deck = Array(12).fill('gardienne-des-portes-de-sable');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => 0.5 });
  // Les scénarios historiques commencent avec les voies latérales déjà blessées.
  for (const lane of duel.moba.lanes) if (lane.id !== 'center') lane.hp = { joueur: 10, sorcier: 10 };
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
  duel.joueur.main.push('boualem');
  duel.joueur.mana.sable = 8;
  let before = JSON.stringify(duel);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'boualem', 'left', 0).raison, 'effet-non-pris-en-charge');
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
  // Scénarios historiques : les voies latérales sont déjà à mi-vie.
  for (const lane of duel.moba.lanes) if (lane.id !== 'center') lane.hp = { joueur: 10, sorcier: 10 };
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
  assert.equal(rpgMobaChoisirVoieCentrale(duel, 'joueur', 'right').ok, true);
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
  duel.joueur.main.push('boualem');
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'boualem', 'left', 0).raison, 'effet-non-pris-en-charge');
  assert.equal(JSON.stringify(duel), before);
  const { entite } = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0);
  entite.carteId = 'boualem'; // emulate a mutation outside the adapter
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
  assert.equal(validerDeckManaEssai({ cardIds: MOBA_DECK_ESSAI, elements: ['sable', 'neige'] }).ok, true);
});

test('a real zone spell affects only the chosen active lane and reconciles deaths', () => {
  const duel = partieCombat();
  const left = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'left', 0).entite;
  const right = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  duel.joueur.main.push('grand-hiver');
  duel.joueur.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver').raison, 'cible');
  const result = rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver', null, 'left');
  assert.equal(result.ok, true);
  assert.equal(duel.joueur.creatures.some((e) => e.id === left.id), false);
  assert.equal(duel.joueur.creatures.some((e) => e.id === right.id), true);
  assert.equal(mobaVoie(duel.moba, 'left').slots.joueur[0], null);
  assert.equal(mobaVoie(duel.moba, 'right').slots.joueur[0], right.id);
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
  for (let turn = 0; turn < 8 && !duel.moba.winner; turn += 1) {
    rpgFinDeTour(duel); rpgFinDeTour(duel);
    const result = rpgMobaLancerAttaque(duel, 'joueur', [left, center].filter((entity) => duel.joueur.creatures.includes(entity)).map((entity) => entity.id), {});
    assert.equal(result.ok, true, JSON.stringify(result));
    if (duel.moba.centerChoice) assert.equal(rpgMobaChoisirVoieCentrale(duel, 'joueur', 'left').ok, true);
  }
  assert.equal(duel.moba.winner, 'joueur');
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 0);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 0);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 20);
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

test('a healing spell restores creatures globally and one chosen friendly lane with its lane cap', () => {
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
  assert.equal(second.healingEvents[0].healing, 2);
  assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 11);
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
  assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, 11);
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
  const unsupported = { ...base, elements: ['neige', 'braise', 'eau'], cardIds: base.cardIds.map((id) => id === 'mousse-des-galiotes' ? 'viking-des-neiges' : id === 'gardienne-des-portes-de-sable' ? 'ronin-du-soleil-rouge' : id) };
  unsupported.cardIds[unsupported.cardIds.indexOf('viking-des-neiges')] = 'boualem';
  assert.match(rpgMobaValiderDeck(unsupported).raison, /carte non adaptée/);
  assert.deepEqual(rpgMobaCreerPartie(base, unsupported), { ok: false, side: 'sorcier', raison: 'carte non adaptée au MOBA : boualem' });
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
  assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, 11);
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
  const attacker = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'center', 0).entite; attacker.ready = true;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'appat-de-la-meute', right.id).ok, true);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {}, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 9);
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
    assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, Math.min(20, 8 + tribute), id);
    assert.ok(result.damageEvents.some((event) => event.tribut && event.damage === tribute), id);
    assert.ok(result.healingEvents.some((event) => event.healing === tribute), id);
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
  assert.equal(immediate.healingEvents[0].healing, 2); assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 11);
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

for (const spell of ['mur-de-boucliers', 'serment-de-la-forge', 'rempart-de-dunes', 'offrande-de-lin']) for (const caster of ['joueur', 'sorcier']) {
  test(`${spell}: ${caster} announces allied creatures and resolves the buff on those still present`, () => {
    const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
    duel.joueur.mana.sable = 20;
    const p1 = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    const p2 = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    rpgFinDeTour(duel); duel.sorcier.mana.sable = 20;
    const s1 = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    const s2 = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    if (caster === 'joueur') rpgFinDeTour(duel);
    const [first, second, enemy] = caster === 'joueur' ? [p1, p2, s1] : [s1, s2, p1];
    duel[caster].main = [spell]; for (const color of ['sable','neige','braise','tenebres']) duel[caster].mana[color] = 20;
    duel[defender].main = ['ressac']; duel[defender].mana.eau = 10;
    const manaBefore = Object.values(duel[caster].mana).reduce((a, b) => a + b, 0);
    const before = [second.atk, second.pv, second.pvMax];
    const result = rpgMobaLancerMagie(duel, caster, spell, null, spell === 'offrande-de-lin' ? 'center' : null, null, { ouvrirReponse: true });
    assert.equal(result.sortEnAttente, true);
    assert.deepEqual(duel.mobaSortEnAttente, { cote: caster, carteId: spell, cibleId: null, cibleNom: 'Créatures', cibleCote: caster });
    assert.equal(Object.values(duel[caster].mana).reduce((a, b) => a + b, 0), manaBefore - magieById(spell).cost);
    assert.deepEqual([second.atk, second.pv, second.pvMax], before);
    assert.equal(mobaVoie(duel.moba, 'center').hp[caster], spell === 'offrande-de-lin' ? 9 : 10);
    assert.equal(result.damageEvents.length, spell === 'offrande-de-lin' ? 1 : 0);
    const paid = JSON.stringify(duel[caster].mana);
    assert.equal(rpgMobaLancerMagie(duel, defender, 'ressac', first.id, null, null, { ouvrirReponse: true }).renvoiMain, true);
    assert.equal(duel.mobaSortEnAttente.carteId, spell);
    assert.equal(rpgMobaPasserSort(duel, defender).ok, true);
    assert.equal(second.atk, before[0] + ({ 'mur-de-boucliers': 2, 'serment-de-la-forge': 2, 'rempart-de-dunes': 0, 'offrande-de-lin': 1 })[spell]);
    assert.equal(second.pv, before[1] + ({ 'mur-de-boucliers': 0, 'serment-de-la-forge': 1, 'rempart-de-dunes': 3, 'offrande-de-lin': 0 })[spell]);
    assert.equal(Boolean(second.overkill), spell === 'mur-de-boucliers');
    assert.equal(Boolean(second.coupRapide), spell === 'serment-de-la-forge');
    assert.equal(second.tribut || 0, spell === 'offrande-de-lin' ? 1 : 0);
    assert.equal(first.atk, 1); assert.equal(enemy.atk, 1); assert.equal(enemy.pv, 4);
    assert.equal(JSON.stringify(duel[caster].mana), paid); assert.equal(duel[caster].cimetiere.filter(id => id === spell).length, 1);
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(rpgMobaPlacementCoherent(duel), true);
    assert.equal(terminerEtPasser(duel, caster).ok, true);
    assert.deepEqual([second.atk, second.pv, second.pvMax], before); assert.equal(second.tribut || 0, 0);
    assert.equal(Boolean(second.overkill), false); assert.equal(Boolean(second.coupRapide), false);
  });
}

test('Offrande pays its lane at announcement and still buffs surviving lanes if that lane is conquered', () => {
  for (const caster of ['joueur', 'sorcier']) {
    const duel = partie(); if (caster === 'sorcier') rpgFinDeTour(duel);
    const defender = caster === 'joueur' ? 'sorcier' : 'joueur';
    duel[caster].main = ['gardienne-des-portes-de-sable']; duel[caster].mana.sable = 10;
    const ally = rpgMobaJouerCreature(duel, caster, 'gardienne-des-portes-de-sable', 'right', 0).entite;
    mobaInfliger(duel.moba, defender, 'left', 7);
    duel[caster].main = ['offrande-de-lin']; duel[caster].mana.tenebres = 10;
    duel[defender].main = ['eclair-du-marteau']; duel[defender].mana.neige = 10;
    const result = rpgMobaLancerMagie(duel, caster, 'offrande-de-lin', null, 'left', null, { ouvrirReponse: true });
    assert.equal(result.sortEnAttente, true); assert.equal(mobaVoie(duel.moba, 'left').hp[caster], 2);
    assert.equal(result.damageEvents[0].prix, true); assert.equal(result.damageEvents[0].damage, 1);
    assert.equal(rpgMobaLancerMagie(duel, defender, 'eclair-du-marteau', 'sorcier', 'left').ok, true);
    assert.equal(mobaVoie(duel.moba, 'left').active, false);
    assert.equal(rpgMobaPasserSort(duel, defender).ok, true);
    assert.equal(ally.atk, 2); assert.equal(ally.tribut, 1); assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Serment reads Daimyō at resolution after the defender removes its anchor', () => {
  for (const removeAnchor of [false, true]) {
    const duel = partie(); duel.joueur.main = ['gardienne-des-portes-de-sable']; duel.joueur.mana.sable = 10;
    const ally = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    duel.joueur.main = ['daimyo-du-soleil-rouge']; duel.joueur.mana.braise = 20;
    const anchor = rpgMobaJouerCreature(duel, 'joueur', 'daimyo-du-soleil-rouge', 'right', 0).entite;
    duel.joueur.main = ['serment-de-la-forge']; duel.sorcier.main = ['ressac']; duel.sorcier.mana.eau = 10;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'serment-de-la-forge', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    if (removeAnchor) assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'ressac', anchor.id).renvoiMain, true);
    assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
    assert.equal(ally.atk, removeAnchor ? 3 : 4); assert.equal(ally.coupRapide, true);
  }
});

test('Rempart played as a response resolves immediately and does not nest another window', () => {
  const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  rpgFinDeTour(duel); duel.joueur.main = ['tempete-de-sable']; duel.joueur.mana.sable = 10;
  duel.sorcier.main = ['rempart-de-dunes']; duel.sorcier.mana.sable = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'tempete-de-sable', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  const response = rpgMobaLancerMagie(duel, 'sorcier', 'rempart-de-dunes', null, null, null, { ouvrirReponse: true });
  assert.equal(response.ok, true); assert.equal(response.sortEnAttente, undefined); assert.equal(target.pv, 7);
  assert.equal(duel.mobaSortEnAttente.carteId, 'tempete-de-sable'); assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.equal(target.pv, 4); assert.ok(duel.sorcier.creatures.includes(target));
});

test('AI can use Rempart against an announced lethal wave without consuming live RNG', () => {
  const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite; target.pv = 2;
  rpgFinDeTour(duel); duel.joueur.main = ['tempete-de-sable']; duel.joueur.mana.sable = 10;
  duel.sorcier.main = ['rempart-de-dunes']; duel.sorcier.mana.sable = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'tempete-de-sable', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  let calls = 0; rpgReglerHasard(duel, () => { calls++; return .5; });
  const before = JSON.stringify(duel), move = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
  assert.equal(move?.id, 'rempart-de-dunes'); assert.equal(JSON.stringify(duel), before); assert.equal(calls, 0);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', move.id, move.cible).ok, true);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.ok(duel.sorcier.creatures.includes(target)); assert.equal(target.pv, 2);
});

for (const caster of ['joueur', 'sorcier']) test(`Embuscade: ${caster} announces a hostile group debuff, with per-creature response shields`, () => {
  const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
  duel.joueur.mana.neige = 20; duel.joueur.mana.sable = 10; duel.joueur.main = ['jarl-au-marteau-de-guerre', 'gardienne-des-portes-de-sable'];
  const p1 = rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'left', 0).entite;
  const p2 = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite;
  rpgFinDeTour(duel); duel.sorcier.mana.neige = 20; duel.sorcier.mana.sable = 10; duel.sorcier.main = ['jarl-au-marteau-de-guerre', 'gardienne-des-portes-de-sable'];
  const s1 = rpgMobaJouerCreature(duel, 'sorcier', 'jarl-au-marteau-de-guerre', 'left', 0).entite;
  const s2 = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
  if (caster === 'joueur') rpgFinDeTour(duel);
  const [shielded, exposed, ally] = caster === 'joueur' ? [s1, s2, p1] : [p1, p2, s1];
  const before = [shielded.atk, shielded.pv, exposed.atk, exposed.pv, ally.atk, ally.pv];
  duel[caster].main = ['embuscade']; duel[caster].mana.neige = 10;
  duel[defender].main = ['parade-du-verre']; duel[defender].mana.eau = 10;
  const announcement = rpgMobaLancerMagie(duel, caster, 'embuscade', null, null, null, { ouvrirReponse: true });
  assert.equal(announcement.sortEnAttente, true);
  assert.deepEqual(duel.mobaSortEnAttente, { cote: caster, carteId: 'embuscade', cibleId: null, cibleNom: 'Créatures', cibleCote: defender });
  assert.deepEqual([shielded.atk, shielded.pv, exposed.atk, exposed.pv, ally.atk, ally.pv], before);
  assert.equal(rpgMobaLancerMagie(duel, defender, 'parade-du-verre', shielded.id).ok, true);
  assert.equal(rpgMobaPasserSort(duel, defender).ok, true);
  assert.deepEqual([shielded.atk, shielded.pv], before.slice(0,2)); assert.equal(shielded.bouclier, 0); assert.ok(!shielded.blocageForce);
  assert.equal(exposed.atk, Math.max(1, before[2] - 2)); assert.equal(exposed.pv, Math.max(1, before[3] - 2));
  assert.equal(exposed.blocageForce.par, caster); assert.deepEqual([ally.atk, ally.pv], before.slice(4));
  assert.equal(terminerEtPasser(duel, caster).ok, true);
  assert.equal(exposed.atk, before[2]); assert.equal(exposed.pv, before[3]); assert.equal(exposed.blocageForce, null);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('new reinforcement and Embuscade response windows are opt-in and reject illegal targets without spending', () => {
  for (const spell of ['mur-de-boucliers', 'serment-de-la-forge', 'rempart-de-dunes', 'offrande-de-lin', 'embuscade']) {
    const duel = partie(); duel.joueur.mana.sable = 10;
    const ally = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    duel.joueur.main = [spell]; for (const color of ['sable','neige','braise','tenebres']) duel.joueur.mana[color] = 20;
    const state = JSON.stringify(duel);
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, ally.id, spell === 'offrande-de-lin' ? 'center' : null, null, { ouvrirReponse: true }).raison, 'cible');
    assert.equal(JSON.stringify(duel), state);
    const result = rpgMobaLancerMagie(duel, 'joueur', spell, null, spell === 'offrande-de-lin' ? 'center' : null);
    assert.equal(result.ok, true); assert.equal(result.sortEnAttente, undefined); assert.equal(duel.mobaSortEnAttente, undefined);
  }
});

test('winning responses cancel a pending reinforcement or Embuscade without refunding the card and HP price', () => {
  for (const spell of ['mur-de-boucliers', 'serment-de-la-forge', 'rempart-de-dunes', 'offrande-de-lin', 'embuscade']) {
    const duel = partie(); duel.joueur.mana.sable = 10;
    const ally = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    mobaInfliger(duel.moba, 'sorcier', 'right', 10); mobaInfliger(duel.moba, 'sorcier', 'center', 8);
    duel.joueur.main = [spell]; for (const color of ['sable','neige','braise','tenebres']) duel.joueur.mana[color] = 20;
    duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, spell === 'offrande-de-lin' ? 'left' : null, null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', 'sorcier', 'center').ok, true);
    assert.equal(duel.moba.winner, 'sorcier'); assert.equal(duel.mobaSortEnAttente, null); assert.equal(ally.atk, 1); assert.equal(ally.pv, 4);
    assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, spell === 'offrande-de-lin' ? 9 : 10);
    assert.equal(duel.joueur.cimetiere.filter((id) => id === spell).length, 1);
  }
});

test('AI protects a valuable creature from Embuscade using an isolated response probe', () => {
  const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.neige = 10;
  duel.sorcier.main = ['jarl-au-marteau-de-guerre'];
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'jarl-au-marteau-de-guerre', 'left', 0).entite;
  rpgFinDeTour(duel); duel.joueur.main = ['embuscade']; duel.joueur.mana.neige = 10;
  duel.sorcier.main = ['parade-du-verre']; duel.sorcier.mana.eau = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'embuscade', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  let calls = 0; rpgReglerHasard(duel, () => { calls++; return .5; });
  const before = JSON.stringify(duel), move = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
  assert.equal(move?.id, 'parade-du-verre'); assert.equal(move.cible, target.id); assert.equal(JSON.stringify(duel), before); assert.equal(calls, 0);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', move.id, move.cible).ok, true);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.equal(target.atk, 3); assert.equal(target.pv, 5); assert.ok(!target.blocageForce); assert.equal(target.bouclier, 0);
});

test('Offrande accepts a separate price-lane argument when announced, without repaying it', () => {
  const duel = partie(); duel.joueur.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  duel.joueur.main = ['offrande-de-lin']; duel.joueur.mana.tenebres = 10;
  const result = rpgMobaLancerMagie(duel, 'joueur', 'offrande-de-lin', null, null, 'right', { ouvrirReponse: true });
  assert.equal(result.sortEnAttente, true); assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, 9);
  assert.equal(target.atk, 1); assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.equal(target.atk, 2); assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, 9);
});

for (const caster of ['joueur', 'sorcier']) test(`Nom effacé: ${caster} announces the opponent's hand and resolves after a draw response`, () => {
  const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
  if (caster === 'sorcier') rpgFinDeTour(duel);
  duel[caster].main = ['nom-efface']; duel[caster].mana.tenebres = 10;
  duel[defender].main = ['papyrus', 'verglas']; duel[defender].mana.tenebres = 10;
  duel[defender].deck = ['trait-de-braise'];
  const beforeMana = Object.values(duel[caster].mana).reduce((a,b) => a+b,0);
  const result = rpgMobaLancerMagie(duel, caster, 'nom-efface', null, null, null, { ouvrirReponse: true });
  assert.equal(result.sortEnAttente, true);
  assert.deepEqual(duel.mobaSortEnAttente, { cote: caster, carteId: 'nom-efface', cibleId: null, cibleNom: 'Main', cibleCote: defender });
  assert.match(duel.log.at(-1), /la main/); assert.doesNotMatch(duel.log.at(-1), /Papyrus|Verglas|Trait/);
  assert.equal(Object.values(duel[caster].mana).reduce((a,b) => a+b,0), beforeMana - 2);
  assert.deepEqual(duel[defender].main, ['papyrus', 'verglas']);
  const response = rpgMobaLancerMagie(duel, defender, 'papyrus', null, 'left', null, { ouvrirReponse: true });
  assert.equal(response.ok, true); assert.equal(response.sortEnAttente, undefined);
  assert.deepEqual(duel[defender].main, ['verglas', 'trait-de-braise']);
  assert.equal(rpgMobaPasserSort(duel, defender).ok, true);
  if (defender === 'joueur') {
    assert.equal(duel.defausseEnAttente?.cote, defender);
    assert.equal(rpgMobaDefausser(duel, defender, 1).ok, true);
  }
  assert.equal(duel[defender].main.length, 1); assert.equal(duel[defender].cimetiere.length, 2);
  assert.equal(duel[caster].cimetiere.filter(id => id === 'nom-efface').length, 1);
  assert.equal(duel.mobaSortEnAttente, null); assert.equal(duel.tour, caster); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Nom effacé sees an empty hand after an instant response and does not require a discard', () => {
  const duel = partie(); duel.joueur.main = ['nom-efface']; duel.joueur.mana.tenebres = 10;
  duel.sorcier.main = ['papyrus']; duel.sorcier.deck = []; duel.sorcier.mana.tenebres = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'nom-efface', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'papyrus', null, 'left').ok, true);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.deepEqual(duel.sorcier.main, []); assert.ok(!duel.defausseEnAttente);
});

for (const caster of ['joueur', 'sorcier']) test(`Le Routier: ${caster} announces the deck, then draws and discards only on resolution`, () => {
  const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
  if (caster === 'sorcier') rpgFinDeTour(duel);
  duel[caster].main = ['le-routier', 'verglas']; duel[caster].deck = ['trait-de-braise', 'ressac']; duel[caster].mana.eau = 10;
  const result = rpgMobaLancerMagie(duel, caster, 'le-routier', null, null, null, { ouvrirReponse: true });
  assert.equal(result.sortEnAttente, true);
  assert.deepEqual(duel.mobaSortEnAttente, { cote: caster, carteId: 'le-routier', cibleId: null, cibleNom: 'Pioche', cibleCote: caster });
  assert.deepEqual(duel[caster].main, ['verglas']); assert.deepEqual(duel[caster].deck, ['trait-de-braise', 'ressac']);
  assert.equal(rpgMobaPasserSort(duel, defender).ok, true);
  assert.equal(duel[caster].deck.length, 0);
  if (caster === 'joueur') {
    assert.equal(duel.defausseEnAttente?.cote, caster); assert.equal(duel[caster].main.length, 3);
    assert.equal(rpgMobaDefausser(duel, caster, 0).ok, true);
  }
  assert.equal(duel[caster].main.length, 2); assert.equal(duel[caster].cimetiere.filter(id => id === 'le-routier').length, 1);
  assert.equal(duel.mobaSortEnAttente, null); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const caster of ['joueur', 'sorcier']) test(`Neige noire: ${caster} pays before the symmetric wave and an opposing shield blocks destruction and freeze`, () => {
  const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
  duel.joueur.mana.sable = 10; duel.joueur.mana.neige = 10; duel.joueur.main.push('jarl-au-marteau-de-guerre');
  const pCheap = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  const pLarge = rpgMobaJouerCreature(duel, 'joueur', 'jarl-au-marteau-de-guerre', 'right', 0).entite;
  rpgFinDeTour(duel); duel.sorcier.mana.sable = 10; duel.sorcier.mana.neige = 10; duel.sorcier.main.push('jarl-au-marteau-de-guerre');
  const sCheap = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  const sLarge = rpgMobaJouerCreature(duel, 'sorcier', 'jarl-au-marteau-de-guerre', 'right', 0).entite;
  if (caster === 'joueur') rpgFinDeTour(duel);
  const shielded = defender === 'joueur' ? pCheap : sCheap;
  const ally = caster === 'joueur' ? pCheap : sCheap;
  const enemyLarge = defender === 'joueur' ? pLarge : sLarge;
  duel[caster].main = ['neige-noire']; duel[caster].mana.neige = 20; duel[caster].mana.tenebres = 20;
  duel[defender].main = ['parade-du-verre']; duel[defender].mana.eau = 10;
  const result = rpgMobaLancerMagie(duel, caster, 'neige-noire', null, 'center', null, { ouvrirReponse: true });
  assert.equal(result.sortEnAttente, true); assert.equal(mobaVoie(duel.moba, 'center').hp[caster], 7);
  assert.deepEqual(duel.mobaSortEnAttente, { cote: caster, carteId: 'neige-noire', cibleId: null, cibleNom: 'Créatures', cibleCote: 'tous' });
  assert.ok(duel[caster].creatures.includes(ally)); assert.ok(!enemyLarge.gelToursRestants);
  assert.equal(rpgMobaLancerMagie(duel, defender, 'parade-du-verre', shielded.id).ok, true);
  assert.equal(rpgMobaPasserSort(duel, defender).ok, true);
  assert.ok(!duel[caster].creatures.includes(ally)); assert.ok(duel[defender].creatures.includes(shielded));
  assert.equal(shielded.bouclier, 0); assert.ok(!shielded.gelToursRestants); assert.ok(enemyLarge.gelToursRestants > 0);
  assert.equal(mobaVoie(duel.moba, 'center').hp[caster], 7); assert.equal(duel[caster].cimetiere.filter(id => id === 'neige-noire').length, 1);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('a winning response cancels Nom effacé, Le Routier and Neige noire without refunding their costs', () => {
  for (const spell of ['nom-efface','le-routier','neige-noire']) {
    const duel = partie(); duel.joueur.mana.sable = 10;
    const ally = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    mobaInfliger(duel.moba, 'sorcier', 'right', 10); mobaInfliger(duel.moba, 'sorcier', 'center', 8);
    duel.joueur.main = [spell]; duel.joueur.mana.eau = 20; duel.joueur.mana.neige = 20; duel.joueur.mana.tenebres = 20;
    duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
    const deck = duel.joueur.deck.length;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, spell === 'neige-noire' ? 'left' : null, null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', 'sorcier', 'center').ok, true);
    assert.equal(duel.moba.winner, 'sorcier'); assert.equal(duel.mobaSortEnAttente, null); assert.equal(ally.pv, 4);
    assert.equal(duel.joueur.deck.length, deck); assert.equal(duel.joueur.cimetiere.filter(id => id === spell).length, 1);
    assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, spell === 'neige-noire' ? 7 : 10);
  }
});

test('new hand, deck and priced-wave windows remain opt-in, reject invalid targets and spend nothing on invalid prices', () => {
  for (const spell of ['nom-efface','le-routier','neige-noire']) {
    const duel = partie(); duel.joueur.main = [spell]; duel.joueur.mana.eau = 20; duel.joueur.mana.neige = 20; duel.joueur.mana.tenebres = 20;
    duel.sorcier.main = ['verglas']; const before = JSON.stringify(duel);
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, 'not-a-creature', spell === 'neige-noire' ? 'left' : null, null, { ouvrirReponse: true }).raison, 'cible');
    assert.equal(JSON.stringify(duel), before);
    if (spell === 'neige-noire') {
      mobaInfliger(duel.moba, 'sorcier', 'left', 7);
      const low = JSON.stringify(duel);
      assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, 'left', null, { ouvrirReponse: true }).raison, 'prix');
      assert.equal(JSON.stringify(duel), low);
    }
    const result = rpgMobaLancerMagie(duel, 'joueur', spell, null, spell === 'neige-noire' ? 'right' : null);
    assert.equal(result.ok, true); assert.equal(result.sortEnAttente, undefined); assert.equal(duel.mobaSortEnAttente, undefined);
  }
});

test('Neige noire still resolves after its price lane is conquered in response', () => {
  const duel = partie(); duel.joueur.mana.sable = 10;
  const removedByConquest = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  const remaining = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite;
  mobaInfliger(duel.moba, 'sorcier', 'left', 5);
  duel.joueur.main = ['neige-noire']; duel.joueur.mana.neige = 10; duel.joueur.mana.tenebres = 10;
  duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'neige-noire', null, 'left', null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 2);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', 'sorcier', 'left').ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').conqueredBy, 'sorcier'); assert.ok(!duel.joueur.creatures.includes(removedByConquest));
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.ok(!duel.joueur.creatures.includes(remaining)); assert.equal(duel.moba.winner, null);
  assert.equal(duel.joueur.cimetiere.filter(id => id === 'neige-noire').length, 1); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('AI shields a vulnerable creature from announced Neige noire without mutating live state or RNG', () => {
  const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
  const target = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  rpgFinDeTour(duel); duel.joueur.main = ['neige-noire']; duel.joueur.mana.neige = 10; duel.joueur.mana.tenebres = 10;
  duel.sorcier.main = ['parade-du-verre']; duel.sorcier.mana.eau = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'neige-noire', null, 'right', null, { ouvrirReponse: true }).sortEnAttente, true);
  let calls = 0; rpgReglerHasard(duel, () => { calls++; return .5; });
  const before = JSON.stringify(duel), move = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
  assert.equal(move?.id, 'parade-du-verre'); assert.equal(move.cible, target.id); assert.equal(JSON.stringify(duel), before); assert.equal(calls, 0);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', move.id, move.cible).ok, true); assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.ok(duel.sorcier.creatures.includes(target)); assert.equal(target.bouclier, 0); assert.ok(!target.gelToursRestants);
});

test('AI finds a winning instant before Nom effacé or Le Routier resolves without mutating the live game', () => {
  for (const spell of ['nom-efface', 'le-routier']) {
    const duel = partie(); duel.joueur.main = [spell]; duel.joueur.mana.tenebres = 10; duel.joueur.mana.eau = 10;
    duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
    mobaInfliger(duel.moba, 'sorcier', 'right', 10); mobaInfliger(duel.moba, 'sorcier', 'center', 8);
    const deck = duel.joueur.deck.length;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    let calls = 0; rpgReglerHasard(duel, () => { calls++; return .5; });
    const before = JSON.stringify(duel), move = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
    assert.equal(move?.id, 'eclair-du-marteau'); assert.equal(move.cible, 'sorcier'); assert.equal(move.lane, 'center');
    assert.equal(JSON.stringify(duel), before); assert.equal(calls, 0);
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', move.id, move.cible, move.lane).ok, true);
    assert.equal(duel.moba.winner, 'sorcier'); assert.equal(duel.mobaSortEnAttente, null); assert.equal(duel.joueur.deck.length, deck);
  }
});

for (const caster of ['joueur', 'sorcier']) test(`Papyrus: ${caster} pays at announcement and draws after a response`, () => {
  const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
  if (caster === 'sorcier') rpgFinDeTour(duel);
  duel[caster].main = ['papyrus']; duel[caster].deck = ['verglas']; duel[caster].mana.tenebres = 10;
  duel[defender].main = ['papyrus']; duel[defender].deck = ['trait-de-braise']; duel[defender].mana.tenebres = 10;
  const result = rpgMobaLancerMagie(duel, caster, 'papyrus', null, 'left', null, { ouvrirReponse: true });
  assert.equal(result.sortEnAttente, true); assert.equal(result.damageEvents[0].damage, 2);
  assert.equal(mobaVoie(duel.moba, 'left').hp[caster], 8); assert.deepEqual(duel[caster].main, []);
  assert.deepEqual(duel.mobaSortEnAttente, { cote: caster, carteId: 'papyrus', cibleId: null, cibleNom: 'Pioche', cibleCote: caster });
  assert.equal(duel[caster].deck.length, 1); assert.match(duel.log.at(-1), /la pioche/); assert.doesNotMatch(duel.log.at(-1), /Verglas/);
  const reaction = rpgMobaLancerMagie(duel, defender, 'papyrus', null, 'right', null, { ouvrirReponse: true });
  assert.equal(reaction.ok, true); assert.equal(reaction.sortEnAttente, undefined);
  assert.deepEqual(duel[defender].main, ['trait-de-braise']); assert.equal(mobaVoie(duel.moba, 'right').hp[defender], 8);
  assert.equal(rpgMobaPasserSort(duel, defender).ok, true); assert.deepEqual(duel[caster].main, ['verglas']);
  assert.equal(mobaVoie(duel.moba, 'left').hp[caster], 8); assert.equal(duel[caster].cimetiere.filter(id => id === 'papyrus').length, 1);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Papyrus resolves even if its price lane is conquered, and accepts a separate price-lane argument', () => {
  const duel = partie(); duel.joueur.main = ['papyrus']; duel.joueur.deck = ['verglas']; duel.joueur.mana.tenebres = 10;
  mobaInfliger(duel.moba, 'sorcier', 'left', 6); duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'papyrus', null, null, 'left', { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 2);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', 'sorcier', 'left').ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').conqueredBy, 'sorcier'); assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.deepEqual(duel.joueur.main, ['verglas']); assert.equal(duel.joueur.cimetiere.filter(id => id === 'papyrus').length, 1);
});

for (const caster of ['joueur', 'sorcier']) test(`Grand Voile blanc: ${caster} announces combat, then fog prevents attacks until end of turn`, () => {
  const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
  if (caster === 'sorcier') rpgFinDeTour(duel);
  duel[caster].main = ['jarl-au-marteau-de-guerre']; duel[caster].mana.neige = 20;
  const attacker = rpgMobaJouerCreature(duel, caster, 'jarl-au-marteau-de-guerre', 'left', 0).entite;
  attacker.ready = true; duel[caster].main = ['grand-voile-blanc']; duel[defender].main = ['eclair-du-marteau']; duel[defender].mana.neige = 10;
  const result = rpgMobaLancerMagie(duel, caster, 'grand-voile-blanc', null, null, null, { ouvrirReponse: true });
  assert.equal(result.sortEnAttente, true);
  assert.deepEqual(duel.mobaSortEnAttente, { cote: caster, carteId: 'grand-voile-blanc', cibleId: null, cibleNom: 'Combat', cibleCote: 'tous' });
  assert.match(duel.log.at(-1), /le combat des deux camps/); assert.ok(!duel.brouillardCombat); assert.equal(attacker.pv, 5);
  const reaction = rpgMobaLancerMagie(duel, defender, 'eclair-du-marteau', attacker.id, null, null, { ouvrirReponse: true });
  assert.equal(reaction.ok, true); assert.equal(reaction.sortEnAttente, undefined); assert.equal(attacker.pv, 2);
  assert.equal(rpgMobaPasserSort(duel, defender).ok, true); assert.equal(duel.brouillardCombat, true);
  assert.equal(rpgMobaDeclarerAttaque(duel, caster, [attacker.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, caster, [attacker.id], {}, { declaree: true }).ok, true);
  assert.equal(mobaVoie(duel.moba, 'left').hp[defender], 10);
  assert.equal(terminerEtPasser(duel, caster).ok, true); assert.equal(duel.brouillardCombat, false);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Papyrus and Grand Voile remain immediate without opt-in and reject invalid targets without spending', () => {
  for (const spell of ['papyrus','grand-voile-blanc']) {
    const duel = partie(); duel.joueur.main = [spell]; duel.joueur.mana.tenebres = 10; duel.joueur.mana.neige = 10;
    const before = JSON.stringify(duel);
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, 'unknown', spell === 'papyrus' ? 'left' : null, null, { ouvrirReponse: true }).raison, 'cible');
    assert.equal(JSON.stringify(duel), before);
    const result = rpgMobaLancerMagie(duel, 'joueur', spell, null, spell === 'papyrus' ? 'left' : null);
    assert.equal(result.ok, true); assert.equal(result.sortEnAttente, undefined); assert.equal(duel.mobaSortEnAttente, undefined);
    if (spell === 'papyrus') assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 8);
    else assert.equal(duel.brouillardCombat, true);
  }
});

test('winning instant responses stop Papyrus and Grand Voile without refunds', () => {
  for (const spell of ['papyrus', 'grand-voile-blanc']) {
    const duel = partie(); mobaInfliger(duel.moba, 'sorcier', 'right', 10); mobaInfliger(duel.moba, 'sorcier', 'center', 8);
    duel.joueur.main = [spell]; duel.joueur.mana.tenebres = 10; duel.joueur.mana.neige = 10;
    duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
    const deck = duel.joueur.deck.length;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, spell === 'papyrus' ? 'left' : null, null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'eclair-du-marteau', 'sorcier', 'center').ok, true);
    assert.equal(duel.moba.winner, 'sorcier'); assert.equal(duel.mobaSortEnAttente, null); assert.equal(duel.joueur.deck.length, deck);
    assert.ok(!duel.brouillardCombat); assert.equal(duel.joueur.cimetiere.filter(id => id === spell).length, 1);
    assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, spell === 'papyrus' ? 8 : 10);
  }
});

test('AI finds a winning response to Papyrus and Grand Voile without touching live RNG', () => {
  for (const spell of ['papyrus', 'grand-voile-blanc']) {
    const duel = partie(); mobaInfliger(duel.moba, 'sorcier', 'right', 10); mobaInfliger(duel.moba, 'sorcier', 'center', 8);
    duel.joueur.main = [spell]; duel.joueur.mana.tenebres = 10; duel.joueur.mana.neige = 10;
    duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 10;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', spell, null, spell === 'papyrus' ? 'left' : null, null, { ouvrirReponse: true }).sortEnAttente, true);
    let calls = 0; rpgReglerHasard(duel, () => { calls++; return .5; });
    const before = JSON.stringify(duel), move = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
    assert.equal(move?.id, 'eclair-du-marteau'); assert.equal(move.cible, 'sorcier'); assert.equal(move.lane, 'center');
    assert.equal(JSON.stringify(duel), before); assert.equal(calls, 0);
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', move.id, move.cible, move.lane).ok, true);
    assert.equal(duel.moba.winner, 'sorcier'); assert.equal(duel.mobaSortEnAttente, null);
  }
});

test('an announced Papyrus with no cards in the deck still pays its cost without fatigue or redraw', () => {
  const duel = partie(); duel.joueur.main = ['papyrus']; duel.joueur.deck = []; duel.joueur.mana.tenebres = 10;
  const wizardHp = duel.joueur.pv;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'papyrus', null, 'right', null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.deepEqual(duel.joueur.main, []); assert.equal(duel.joueur.pv, wizardHp); assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, 8);
});

test('Grand Voile played as a response applies immediately without opening another window', () => {
  const duel = partie(); duel.joueur.main = ['nom-efface']; duel.joueur.mana.tenebres = 10;
  duel.sorcier.main = ['grand-voile-blanc', 'verglas']; duel.sorcier.mana.neige = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'nom-efface', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  const result = rpgMobaLancerMagie(duel, 'sorcier', 'grand-voile-blanc', null, null, null, { ouvrirReponse: true });
  assert.equal(result.ok, true); assert.equal(result.sortEnAttente, undefined); assert.equal(duel.brouillardCombat, true);
  assert.equal(duel.mobaSortEnAttente?.carteId, 'nom-efface'); assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.deepEqual(duel.sorcier.main, []); assert.equal(terminerEtPasser(duel, 'joueur').ok, true); assert.equal(duel.brouillardCombat, false);
});

for (const counter of ['silence-decume', 'maree-contraire']) for (const caster of ['joueur', 'sorcier']) {
  test(`${counter}: ${caster} counters an already paid spell without consuming another copy or repaying`, () => {
    const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
    if (caster === 'sorcier') rpgFinDeTour(duel);
    duel[caster].main = ['papyrus','papyrus']; duel[caster].deck = ['verglas']; duel[caster].mana.tenebres = 1;
    duel[defender].main = [counter]; duel[defender].mana.eau = 10; duel[defender].deck = ['trait-de-braise'];
    const result = rpgMobaLancerMagie(duel, caster, 'papyrus', null, 'left', null, { ouvrirReponse: true });
    assert.equal(result.sortEnAttente, true); assert.equal(duel[caster].mana.tenebres, 0); assert.equal(mobaVoie(duel.moba, 'left').hp[caster], 8);
    const counterCost = magieById(counter).cost, beforeMana = Object.values(duel[defender].mana).reduce((a,b) => a+b,0);
    const response = rpgMobaLancerMagie(duel, defender, counter, null, null, null, { ouvrirReponse: true });
    assert.equal(response.ok, true, JSON.stringify(response)); assert.equal(response.contre, true); assert.equal(response.carteContree, 'papyrus');
    assert.equal(Object.values(duel[defender].mana).reduce((a,b) => a+b,0), beforeMana - counterCost); assert.equal(duel[caster].mana.tenebres, 0);
    assert.equal(mobaVoie(duel.moba, 'left').hp[caster], 8); assert.deepEqual(duel[caster].main, ['papyrus']);
    assert.deepEqual(duel[caster].deck, ['verglas']); assert.equal(duel[caster].cimetiere.filter(id => id === 'papyrus').length, 1);
    assert.equal(duel[defender].cimetiere.filter(id => id === counter).length, 1);
    assert.equal(duel[defender].main.length, counter === 'maree-contraire' ? 1 : 0);
    assert.equal(duel.mobaSortEnAttente, null); assert.equal(duel.fenetreReponse, false);
    assert.equal(rpgMobaPasserSort(duel, defender).raison, 'aucun-sort'); assert.equal(rpgMobaPlacementCoherent(duel), true);
  });
}

test('MOBA counters are rejected without an opposing spell or with invalid arguments without spending', () => {
  for (const counter of ['silence-decume', 'maree-contraire']) {
    const duel = partie(); duel.joueur.main = [counter]; duel.joueur.mana.eau = 10;
    const before = JSON.stringify(duel);
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', counter).raison, 'timing'); assert.equal(JSON.stringify(duel), before);
    duel.joueur.main = ['grand-hiver']; duel.joueur.mana.neige = 10; duel.sorcier.main = [counter]; duel.sorcier.mana.eau = 10;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    const pending = JSON.stringify(duel);
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', counter, 'sorcier').raison, 'timing');
    assert.equal(JSON.stringify(duel), pending);
    duel.sorcier.mana.eau = 0; const unpaid = JSON.stringify(duel);
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', counter).raison, 'mana'); assert.equal(JSON.stringify(duel), unpaid);
  }
});

test('Déflection uses Jörmungandr Link at response time and respects empty decks', () => {
  for (const linked of [false, true]) {
    const duel = partie(); rpgFinDeTour(duel); duel.sorcier.main = ['jormungandr']; duel.sorcier.mana.eau = 20;
    if (linked) assert.equal(rpgMobaJouerCreature(duel, 'sorcier', 'jormungandr', 'right', 0).ok, true);
    rpgFinDeTour(duel); duel.joueur.main = ['grand-hiver']; duel.joueur.mana.neige = 10;
    duel.sorcier.main = ['maree-contraire']; duel.sorcier.deck = ['verglas','trait-de-braise']; duel.sorcier.mana.eau = 10;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'maree-contraire').contre, true);
    assert.equal(duel.sorcier.main.length, linked ? 2 : 1); assert.equal(duel.sorcier.deck.length, linked ? 0 : 1);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
  const duel = partie(); duel.joueur.main = ['grand-hiver']; duel.joueur.mana.neige = 10;
  duel.sorcier.main = ['maree-contraire']; duel.sorcier.deck = []; duel.sorcier.mana.eau = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver', null, null, null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'maree-contraire').contre, true);
  assert.deepEqual(duel.sorcier.main, []); assert.equal(duel.sorcier.pv, 25);
});

test('AI counters a lethal pending spell on a copy without mutating live state or consuming RNG', () => {
  const duel = partie(); mobaInfliger(duel.moba, 'joueur', 'left', 10); mobaInfliger(duel.moba, 'joueur', 'center', 8);
  duel.joueur.main = ['eclair-du-marteau']; duel.joueur.mana.neige = 10;
  duel.sorcier.main = ['silence-decume']; duel.sorcier.mana.eau = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'sorcier', 'center', null, { ouvrirReponse: true }).sortEnAttente, true);
  let calls = 0; rpgReglerHasard(duel, () => { calls++; return .5; });
  const before = JSON.stringify(duel), move = rpgMobaChoisirMagieIA(duel, 'sorcier', true);
  assert.equal(move?.id, 'silence-decume'); assert.equal(JSON.stringify(duel), before); assert.equal(calls, 0);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', move.id).contre, true);
  assert.equal(duel.moba.winner, null); assert.equal(mobaVoie(duel.moba, 'center').hp.sorcier, 2);
});

test('all audited counters are available to custom decks', () => {
  for (const id of ['silence-decume', 'maree-contraire', 'ecueil', 'contresort-des-abimes']) {
    assert.ok(MOBA_CARTES_AUTORISEES.includes(id));
    const deck = { ...MOBA_DECKS[1], cardIds: [...MOBA_DECKS[1].cardIds] };
    deck.cardIds[deck.cardIds.indexOf('ressac')] = id;
    assert.equal(rpgMobaValiderDeck(deck).ok, true);
  }
});

test('spell-only counters cannot respond to combat or end of turn', () => {
  for (const counter of ['silence-decume', 'maree-contraire']) {
    const duel = partie(); duel.joueur.mana.sable = 10;
    const attacker = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    attacker.ready = true; duel.sorcier.main = [counter]; duel.sorcier.mana.eau = 10;
    assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [attacker.id]).ok, true);
    const duringCombat = JSON.stringify(duel);
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', counter).raison, 'timing'); assert.equal(JSON.stringify(duel), duringCombat);
    assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [attacker.id], {}, { declaree: true }).ok, true);
    assert.equal(rpgMobaTerminerTour(duel, 'joueur').ok, true);
    const duringEnd = JSON.stringify(duel);
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', counter).raison, 'timing'); assert.equal(JSON.stringify(duel), duringEnd);
    assert.equal(rpgMobaPasserFinDeTour(duel, 'sorcier').ok, true);
  }
});

function feuxFixture() {
  const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 20;
  const a = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  const b = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
  rpgFinDeTour(duel); duel.joueur.main = ['feux-de-kitsune']; duel.joueur.mana.braise = 20;
  a.pv = a.pvMax = b.pv = b.pvMax = 10;
  return { duel, a, b };
}

test('Feux de kitsune reserve les deux cibles, puis applique quatre ou deux dégâts par cible', () => {
  for (const split of [false, true]) {
    const {duel, a, b} = feuxFixture();
    const result = rpgMobaLancerMagie(duel, 'joueur', 'feux-de-kitsune', a.id, null, null, { ouvrirReponse: true, cibleSecondaireId: split ? b.id : null });
    assert.equal(result.sortEnAttente, true, JSON.stringify(result));
    assert.equal(duel.mobaSortEnAttente.cibleSecondaireId ?? null, split ? b.id : null);
    assert.equal(a.pv, 10); assert.equal(b.pv, 10);
    assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
    assert.equal(a.pv, split ? 8 : 6); assert.equal(b.pv, split ? 8 : 10);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Feux de kitsune : cibles illégales refusées sans coût et sort dissipé si une cible disparaît', () => {
  const {duel, a, b} = feuxFixture();
  const before = JSON.stringify(duel);
  for (const id of [a.id, 'inconnu']) assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'feux-de-kitsune', a.id, null, null, {cibleSecondaireId:id}).raison, 'cible');
  assert.equal(JSON.stringify(duel), before);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'feux-de-kitsune', a.id, null, null, { ouvrirReponse: true, cibleSecondaireId:b.id }).sortEnAttente, true);
  // Model a battlefield departure before the pending spell resolves.
  assert.equal(mobaRetirer(duel.moba, 'sorcier', b.id).ok, true);
  duel.sorcier.creatures = duel.sorcier.creatures.filter(entity => entity.id !== b.id);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').dissipe, true);
  assert.equal(a.pv, 10); assert.equal(duel.mobaSortEnAttente, null);
  assert.equal(duel.joueur.cimetiere.filter(id => id === 'feux-de-kitsune').length, 1);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Feux de kitsune : chaque bouclier intercepte uniquement son propre impact partagé', () => {
  for (const first of [true, false]) {
    const {duel, a, b} = feuxFixture();
    (first ? a : b).bouclier = 1;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'feux-de-kitsune', a.id, null, null, { ouvrirReponse: true, cibleSecondaireId:b.id }).sortEnAttente, true);
    assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
    assert.equal(a.pv, first ? 10 : 8); assert.equal(b.pv, first ? 8 : 10);
    assert.equal((first ? a : b).bouclier, 0);
  }
});

test('Feux de kitsune : Lien Oni lu à la résolution pour les deux modes', () => {
  for (const split of [false, true]) {
    const {duel, a, b} = feuxFixture();
    duel.joueur.main.push('gardienne-des-portes-de-sable'); duel.joueur.mana.sable = 10;
    const ancre = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'center', 0).entite;
    // Oni n'est pas encore dans le pool MOBA ; injecter l'ancre pour tester le contrat futur du Lien.
    const annonce = rpgMobaLancerMagie(duel, 'joueur', 'feux-de-kitsune', a.id, null, null, { ouvrirReponse:true, cibleSecondaireId: split ? b.id : null });
    assert.equal(annonce.sortEnAttente, true, JSON.stringify(annonce));
    ancre.carteId = 'oni-de-la-fournaise';
    assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
    assert.equal(a.pv, split ? 7 : 5); assert.equal(b.pv, split ? 7 : 10);
  }
});

test('Feux de kitsune : réponse bouclier sur la première cible et contresort', () => {
  for (const counter of [false, true]) {
    const {duel, a, b} = feuxFixture();
    duel.sorcier.main = [counter ? 'silence-decume' : 'parade-du-verre']; duel.sorcier.mana.eau = 20; duel.sorcier.mana.sable = 20;
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'feux-de-kitsune', a.id, null, null, { ouvrirReponse:true, cibleSecondaireId:b.id }).sortEnAttente, true);
    const response = rpgMobaLancerMagie(duel, 'sorcier', duel.sorcier.main[0], counter ? null : a.id);
    assert.equal(response.ok, true, JSON.stringify(response));
    if (!counter) assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
    assert.equal(a.pv, 10); assert.equal(b.pv, counter ? 10 : 8); assert.equal(duel.mobaSortEnAttente, null);
  }
});

test('IA Feux de kitsune simule les paires sans muter la partie', () => {
  const {duel, a, b} = feuxFixture(); a.pv = b.pv = 2;
  let appels = 0; rpgReglerHasard(duel, () => { appels++; return .5; });
  const avant = JSON.stringify(duel); const coup = rpgMobaChoisirMagieIA(duel, 'joueur');
  assert.equal(coup?.id, 'feux-de-kitsune'); assert.deepEqual(new Set([coup.cible, coup.cibleSecondaire]), new Set([a.id, b.id]));
  assert.equal(JSON.stringify(duel), avant); assert.equal(appels, 0);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', coup.id, coup.cible, null, null, {cibleSecondaireId:coup.cibleSecondaire}).ok, true);
  assert.equal(duel.sorcier.creatures.length, 0); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Feux de kitsune : bouclier coloré indépendant et annonce du sorcier', () => {
  for (const first of [true, false]) {
    const duel = partie(); duel.joueur.mana.sable = 20;
    const a = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    const b = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite;
    a.pv = a.pvMax = b.pv = b.pvMax = 10;
    (first ? a : b).protection = { contre: ['braise'] };
    rpgFinDeTour(duel); duel.sorcier.main = ['feux-de-kitsune']; duel.sorcier.mana.braise = 20;
    const annonce = rpgMobaLancerMagie(duel, 'sorcier', 'feux-de-kitsune', a.id, null, null, {ouvrirReponse:true, cibleSecondaireId:b.id});
    assert.equal(annonce.sortEnAttente, true, JSON.stringify(annonce));
    assert.equal(rpgMobaPasserSort(duel, 'joueur').ok, true);
    assert.equal(a.pv, first ? 10 : 8); assert.equal(b.pv, first ? 8 : 10);
    assert.equal((first ? a : b).protection, null); assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

function defiFixture(caster = 'joueur') {
  const duel = partie(), enemy = caster === 'joueur' ? 'sorcier' : 'joueur';
  duel.joueur.mana.sable = 20;
  const joueur = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  rpgFinDeTour(duel); duel.sorcier.mana.sable = 20;
  const sorcier = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite;
  if (caster === 'joueur') rpgFinDeTour(duel);
  const ally = caster === 'joueur' ? joueur : sorcier, target = caster === 'joueur' ? sorcier : joueur;
  ally.atk = 3; ally.pv = ally.pvMax = 8; target.atk = 2; target.pv = target.pvMax = 8;
  duel[caster].main = ['defi-du-jarl']; duel[caster].mana.neige = 20;
  return {duel, caster, enemy, ally, target};
}

test('Défi du Jarl : deux camps, annonce payée et combat simultané même entre voies', () => {
  for (const caster of ['joueur', 'sorcier']) {
    const {duel, enemy, ally, target} = defiFixture(caster);
    const before = JSON.stringify(duel);
    for (const [a,b] of [[target.id,null],[ally.id,target.id],[target.id,target.id],['absent',ally.id]]) {
      assert.equal(rpgMobaLancerMagie(duel, caster, 'defi-du-jarl', a, null, null, {cibleSecondaireId:b}).raison, 'cible');
      assert.equal(JSON.stringify(duel), before);
    }
    const manaAvant = Object.values(duel[caster].mana).reduce((a,b) => a+b, 0);
    const annonce = rpgMobaLancerMagie(duel, caster, 'defi-du-jarl', target.id, null, null, {ouvrirReponse:true, cibleSecondaireId:ally.id});
    assert.equal(annonce.sortEnAttente, true, JSON.stringify(annonce));
    assert.equal(Object.values(duel[caster].mana).reduce((a,b) => a+b, 0), manaAvant - 3); assert.deepEqual(duel[caster].main, []);
    assert.match(duel.mobaSortEnAttente.cibleNom, /gauche.*droite|droite.*gauche/i);
    assert.equal(ally.pv, 8); assert.equal(target.pv, 8);
    assert.equal(rpgMobaPasserSort(duel, enemy).ok, true);
    assert.equal(ally.pv, 6); assert.equal(target.pv, 5); assert.equal(Object.values(duel[caster].mana).reduce((a,b) => a+b, 0), manaAvant - 3);
    assert.equal(duel[caster].cimetiere.filter(id=>id === 'defi-du-jarl').length, 1);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Défi du Jarl : le champion renvoyé en réponse dissipe le sort déjà payé', () => {
  const {duel, caster, enemy, ally, target} = defiFixture();
  duel[enemy].main = ['ressac']; duel[enemy].mana.eau = 10;
  const manaAvant = Object.values(duel[caster].mana).reduce((a,b) => a+b, 0);
  assert.equal(rpgMobaLancerMagie(duel, caster, 'defi-du-jarl', target.id, null, null, {ouvrirReponse:true, cibleSecondaireId:ally.id}).sortEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, enemy, 'ressac', ally.id).ok, true);
  assert.equal(rpgMobaPasserSort(duel, enemy).dissipe, true); assert.equal(target.pv, 8);
  assert.equal(Object.values(duel[caster].mana).reduce((a,b) => a+b, 0), manaAvant - 3); assert.equal(duel[caster].cimetiere.filter(id=>id === 'defi-du-jarl').length, 1);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Défi du Jarl : contresort et bouclier de la cible adverse arrêtent le duel', () => {
  for (const counter of [false, true]) {
    const {duel, caster, enemy, ally, target} = defiFixture();
    duel[enemy].main = [counter ? 'silence-decume' : 'parade-du-verre']; duel[enemy].mana.eau = 10; duel[enemy].mana.sable = 10;
    assert.equal(rpgMobaLancerMagie(duel, caster, 'defi-du-jarl', target.id, null, null, {ouvrirReponse:true, cibleSecondaireId:ally.id}).sortEnAttente, true);
    const response = rpgMobaLancerMagie(duel, enemy, duel[enemy].main[0], counter ? null : target.id);
    assert.equal(response.ok, true, JSON.stringify(response));
    if (!counter) assert.equal(rpgMobaPasserSort(duel, enemy).bouclierBloque, true);
    assert.equal(ally.pv, 8); assert.equal(target.pv, 8); assert.equal(duel.mobaSortEnAttente, null);
  }
});

test('Défi du Jarl : morts simultanées libèrent les voies et carte classique reste immédiate sans opt-in', () => {
  const {duel, caster, ally, target} = defiFixture();
  ally.pv = 2; target.pv = 3;
  assert.equal(rpgMobaLancerMagie(duel, caster, 'defi-du-jarl', target.id, null, null, {cibleSecondaireId:ally.id}).ok, true);
  assert.equal(duel.joueur.creatures.length, 0); assert.equal(duel.sorcier.creatures.length, 0);
  assert.ok(!duel.mobaSortEnAttente); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('IA Défi du Jarl évalue les deux camps sur une copie sans toucher au hasard', () => {
  const {duel, caster, ally, target} = defiFixture(); ally.atk = 5; target.pv = 3; target.atk = 1;
  let rng = 0; rpgReglerHasard(duel, () => {rng++; return .5;});
  const avant = JSON.stringify(duel), coup = rpgMobaChoisirMagieIA(duel, caster);
  assert.equal(coup?.id, 'defi-du-jarl'); assert.equal(coup.cible, target.id); assert.equal(coup.cibleSecondaire, ally.id);
  assert.equal(JSON.stringify(duel), avant); assert.equal(rng, 0);
  assert.equal(rpgMobaLancerMagie(duel, caster, coup.id, coup.cible, null, null, {cibleSecondaireId:coup.cibleSecondaire}).ok, true);
  assert.equal(duel.sorcier.creatures.length, 0); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Défi du Jarl : protections sur chacun des combattants et revalidation à la résolution', () => {
  for (const which of ['ally', 'target']) {
    const {duel, caster, enemy, ally, target} = defiFixture();
    const creature = which === 'ally' ? ally : target;
    creature.protectionSorts = true;
    const avant = JSON.stringify(duel);
    assert.equal(rpgMobaLancerMagie(duel, caster, 'defi-du-jarl', target.id, null, null, {ouvrirReponse:true, cibleSecondaireId:ally.id}).raison, 'protection');
    assert.equal(JSON.stringify(duel), avant);
    creature.protectionSorts = false;
    assert.equal(rpgMobaLancerMagie(duel, caster, 'defi-du-jarl', target.id, null, null, {ouvrirReponse:true, cibleSecondaireId:ally.id}).sortEnAttente, true);
    creature.protectionSorts = true;
    assert.equal(rpgMobaPasserSort(duel, enemy).dissipe, true);
    assert.equal(ally.pv, 8); assert.equal(target.pv, 8); assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Défi du Jarl : le bouclier du champion allié reste actif, les dégâts ne sont pas une attaque', () => {
  const {duel, caster, ally, target} = defiFixture();
  ally.bouclier = 1; duel.brouillardCombat = true;
  assert.equal(rpgMobaLancerMagie(duel, caster, 'defi-du-jarl', target.id, null, null, {cibleSecondaireId:ally.id}).ok, true);
  assert.equal(ally.bouclier, 1); assert.equal(ally.pv, 6); assert.equal(target.pv, 5);
});

function reanimationFixture(caster = 'joueur') {
  const duel = partie(); if (caster === 'sorcier') rpgFinDeTour(duel);
  duel[caster].main = ['reanimation']; duel[caster].mana.sable = 20;
  duel[caster].cimetiere = ['loup-des-neiges', 'gardienne-des-portes-de-sable', 'papyrus'];
  return duel;
}

test('Réanimation : dernière créature éligible, emplacement choisi et annonce payée des deux camps', () => {
  for (const caster of ['joueur', 'sorcier']) for (const [lane, slot] of [['left',1], ['center',0], ['right',1]]) {
    const duel = reanimationFixture(caster), enemy = caster === 'joueur' ? 'sorcier' : 'joueur';
    const before = Object.values(duel[caster].mana).reduce((a,b) => a+b,0);
    const annonce = rpgMobaLancerMagie(duel, caster, 'reanimation', null, lane, null, {ouvrirReponse:true, emplacementReanimation:slot});
    assert.equal(annonce.sortEnAttente, true, JSON.stringify(annonce));
    assert.equal(duel[caster].creatures.length, 0); assert.equal(duel[caster].cimetiere.length, 3);
    assert.equal(duel.mobaSortEnAttente.reanimationMoba.slot, slot); assert.equal(duel.mobaSortEnAttente.reanimationMoba.laneId, lane);
    const paid = Object.values(duel[caster].mana).reduce((a,b) => a+b,0); assert.equal(paid, before - 5);
    assert.equal(rpgMobaPasserSort(duel, enemy).ok, true);
    const creature = duel[caster].creatures[0]; assert.equal(creature.carteId, 'gardienne-des-portes-de-sable');
    assert.equal(creature.mobaLane, lane); assert.equal(mobaVoie(duel.moba, lane).slots[caster][slot], creature.id);
    assert.deepEqual(duel[caster].cimetiere, ['loup-des-neiges', 'papyrus', 'reanimation']);
    assert.equal(Object.values(duel[caster].mana).reduce((a,b) => a+b,0), paid); assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Réanimation : arrivée de la Porteuse soigne la voie choisie et conserve le cimetière classique', () => {
  const duel = reanimationFixture(); duel.joueur.cimetiere = ['porteuse-de-cruches'];
  mobaInfliger(duel.moba, 'sorcier', 'right', 4);
  const result = rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, 'right', null, {emplacementReanimation:1});
  assert.equal(result.ok, true, JSON.stringify(result)); assert.equal(mobaVoie(duel.moba, 'right').hp.joueur, 9);
  assert.equal(duel.joueur.creatures[0].carteId, 'porteuse-de-cruches'); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Réanimation : refus sans créature, case libre ou carte auditée, sans aucun paiement', () => {
  const duel = reanimationFixture();
  for (const [grave, lane, slot] of [[[], 'left',0], [['boualem'], 'left',0], [['gardienne-des-portes-de-sable'], 'center',1], [['gardienne-des-portes-de-sable'], 'unknown',0]]) {
    duel.joueur.cimetiere = grave; const avant = JSON.stringify(duel);
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, lane, null, {emplacementReanimation:slot}).raison, 'cible');
    assert.equal(JSON.stringify(duel), avant);
  }
});

test('Réanimation : chaque créature du pool revient sans désynchroniser le plateau et son arrivée', () => {
  const ids = MOBA_CARTES_AUTORISEES.filter(id => ['creature', 'hero'].includes(cardById(id)?.kind));
  for (const id of ids) {
    const duel = reanimationFixture();
    duel.joueur.mana.sable = 20; duel.joueur.main.push('gardienne-des-portes-de-sable');
    assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).ok, true);
    rpgFinDeTour(duel); duel.sorcier.mana.sable = 20;
    assert.equal(rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).ok, true);
    rpgFinDeTour(duel); duel.joueur.cimetiere = [id]; duel.joueur.main = ['reanimation']; duel.joueur.mana.sable = 20;
    const result = rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, 'right', null, {emplacementReanimation:1});
    assert.equal(result.ok, true, `${id}: ${JSON.stringify(result)}`);
    assert.equal(rpgMobaPlacementCoherent(duel), true, `${id}: placement incohérent`);
  }
});

test('Réanimation : le cimetière est relu après la réponse, pas figé à l’annonce', () => {
  const duel = reanimationFixture(); duel.joueur.mana.neige = 10; duel.joueur.main.push('viking-des-neiges');
  const victime = rpgMobaJouerCreature(duel, 'joueur', 'viking-des-neiges', 'left', 0).entite;
  victime.pv = 2; duel.sorcier.main = ['trait-de-braise']; duel.sorcier.mana.braise = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, 'right', null, {ouvrirReponse:true, emplacementReanimation:1}).sortEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'trait-de-braise', victime.id).ok, true);
  assert.equal(duel.joueur.cimetiere.at(-1), 'viking-des-neiges');
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.equal(duel.joueur.creatures[0].carteId, 'viking-des-neiges'); assert.equal(duel.joueur.creatures[0].mobaLane, 'right');
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Réanimation : voie conquise pendant la réponse ou contresort annule la carte sans remboursement', () => {
  for (const counter of [true, false]) {
    const duel = reanimationFixture(); duel.sorcier.mana.eau = 10; duel.sorcier.mana.neige = 10;
    if (!counter) mobaInfliger(duel.moba, 'sorcier', 'right', 7);
    duel.sorcier.main = [counter ? 'silence-decume' : 'eclair-du-marteau'];
    const mana = Object.values(duel.joueur.mana).reduce((a,b) => a+b,0);
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, 'right', null, {ouvrirReponse:true, emplacementReanimation:1}).sortEnAttente, true);
    assert.equal(rpgMobaLancerMagie(duel, 'sorcier', duel.sorcier.main[0], counter ? null : 'sorcier', counter ? null : 'right').ok, true);
    if (!counter) assert.equal(rpgMobaPasserSort(duel, 'sorcier').dissipe, true);
    assert.equal(duel.joueur.creatures.length, 0); assert.ok(duel.joueur.cimetiere.includes('gardienne-des-portes-de-sable'));
    assert.equal(duel.joueur.cimetiere.filter(id=>id === 'reanimation').length, 1);
    assert.equal(Object.values(duel.joueur.mana).reduce((a,b) => a+b,0), mana - 5);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Réanimation : cibles automatiques d’arrivée respectent le camp et la clause autre', () => {
  for (const id of ['la-devoreuse', 'faiseur-de-passage', 'veilleuse-des-citernes']) {
    const duel = reanimationFixture(); duel.joueur.cimetiere = [id];
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, 'right', null, {emplacementReanimation:0}).ok, true);
    const entite = duel.joueur.creatures[0]; assert.equal(entite.carteId, id);
    if (id === 'faiseur-de-passage') assert.ok(!entite.infiltrationTour);
    if (id === 'veilleuse-des-citernes') assert.equal(entite.bouclier, 1);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
  const duel = reanimationFixture(); duel.joueur.mana.sable = 10; duel.joueur.main.push('gardienne-des-portes-de-sable');
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  duel.joueur.cimetiere = ['la-devoreuse'];
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, 'right', null, {emplacementReanimation:0}).ok, true);
  assert.ok(duel.joueur.creatures.includes(ally)); assert.equal(duel.joueur.creatures.length, 2);
});

test('IA Réanimation cherche une case légale sans mutation ni consommation du hasard', () => {
  const duel = reanimationFixture(); let rng = 0; rpgReglerHasard(duel, () => {rng++; return .5;});
  const avant = JSON.stringify(duel), coup = rpgMobaChoisirMagieIA(duel, 'joueur');
  assert.equal(coup?.id, 'reanimation'); assert.ok(['left','center','right'].includes(coup.lane)); assert.equal(typeof coup.emplacementReanimation, 'number');
  assert.equal(JSON.stringify(duel), avant); assert.equal(rng, 0);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', coup.id, null, coup.lane, null, {emplacementReanimation:coup.emplacementReanimation}).ok, true);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Réanimation : arrivée, voix et effets de vie utilisent la voie de retour', async () => {
  const { rpgConsommerArriveesCreature } = await import('../src/games/rpgDuel.js');
  for (const id of ['porteuse-de-cruches', 'maitre-du-marteau', 'braisier-du-souk', 'pretre-de-la-bouche']) {
    const duel = reanimationFixture(); duel.joueur.cimetiere = [id];
    mobaInfliger(duel.moba, 'sorcier', 'right', 4); mobaInfliger(duel.moba, 'joueur', 'right', 4);
    rpgConsommerArriveesCreature(duel);
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, 'right', null, {ouvrirReponse:true, emplacementReanimation:1}).sortEnAttente, true);
    const result = rpgMobaPasserSort(duel, 'sorcier'); assert.equal(result.ok, true, `${id}: ${JSON.stringify(result)}`);
    assert.ok(rpgConsommerArriveesCreature(duel).some(event => event.carteId === id && event.origine === 'reanimation'), id);
    if (id === 'porteuse-de-cruches') assert.equal(result.healingEvents[0]?.laneId, 'right');
    if (id === 'maitre-du-marteau' || id === 'braisier-du-souk') assert.equal(result.damageEvents[0]?.laneId, 'right');
    if (id === 'pretre-de-la-bouche') { assert.equal(result.damageEvents[0]?.laneId, 'right'); assert.equal(result.healingEvents[0]?.laneId, 'right'); }
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Réanimation : arrivée de Tiziri ouvre la recherche privée et suspend les autres actions', () => {
  const duel = reanimationFixture(); duel.joueur.cimetiere = ['tiziri-du-djurdjura']; duel.joueur.deck = ['trait-de-braise', 'verglas'];
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, 'center', null, {ouvrirReponse:true, emplacementReanimation:0}).sortEnAttente, true);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
  assert.equal(duel.mobaSortEnAttente, null); assert.equal(duel.mobaRechercheEnAttente?.cote, 'joueur');
  assert.equal(rpgMobaTerminerTour(duel, 'joueur').raison, 'timing');
  assert.equal(rpgMobaResoudreRecherche(duel, 'joueur', 'verglas').ok, true); assert.ok(duel.joueur.main.includes('verglas'));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Réanimation : les jetons de réponse occupent la case annoncée, le sort se dissipe', () => {
  const duel = reanimationFixture(); duel.joueur.main.push('orochi'); duel.joueur.mana.braise = 20;
  const orochi = rpgMobaJouerCreature(duel, 'joueur', 'orochi', 'right', 0).entite; orochi.pv = 1;
  duel.sorcier.main = ['trait-de-braise']; duel.sorcier.mana.braise = 10;
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, 'right', null, {ouvrirReponse:true, emplacementReanimation:1}).sortEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'trait-de-braise', orochi.id).ok, true);
  assert.ok(mobaVoie(duel.moba, 'right').slots.joueur[1]);
  assert.equal(rpgMobaPasserSort(duel, 'sorcier').dissipe, true);
  assert.equal(duel.joueur.creatures.filter(entite => entite.carteId === 'petit-orochi').length, 2);
  assert.ok(duel.joueur.cimetiere.includes('orochi')); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Réanimation : une arrivée gagnante conquiert la voie sans laisser de carte en attente', () => {
  const duel = reanimationFixture(); duel.joueur.cimetiere = ['maitre-du-marteau'];
  mobaInfliger(duel.moba, 'joueur', 'left', 10); mobaInfliger(duel.moba, 'joueur', 'right', 7);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, 'right', null, {ouvrirReponse:true, emplacementReanimation:0}).sortEnAttente, true);
  const result = rpgMobaPasserSort(duel, 'sorcier');
  assert.equal(result.ok, true, JSON.stringify(result)); assert.equal(duel.moba.winner, 'joueur');
  assert.equal(duel.mobaSortEnAttente, null); assert.equal(duel.joueur.cimetiere.filter(id=>id==='reanimation').length, 1);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const caster of ['joueur', 'sorcier']) for (const counter of ['ecueil', 'contresort-des-abimes']) {
  test(`${counter} contre une créature déjà payée de ${caster} sans consommer sa copie en main`, () => {
    const duel = partie(), defender = caster === 'joueur' ? 'sorcier' : 'joueur';
    if (caster === 'sorcier') rpgFinDeTour(duel);
    duel[caster].main = ['gardienne-des-portes-de-sable', 'gardienne-des-portes-de-sable']; duel[caster].mana.sable = 20;
    duel[defender].main = [counter]; duel[defender].mana.eau = 20;
    const mana = Object.values(duel[caster].mana).reduce((a,b) => a+b,0);
    const annonce = rpgMobaJouerCreature(duel, caster, 'gardienne-des-portes-de-sable', 'right', 1, {ouvrirReponse:true});
    assert.equal(annonce.creatureEnAttente, true, JSON.stringify(annonce));
    assert.equal(duel[caster].creatures.length, 0); assert.equal(mobaVoie(duel.moba, 'right').slots[caster][1], null);
    assert.equal(Object.values(duel[caster].mana).reduce((a,b)=>a+b,0), mana - 2);
    const result = rpgMobaLancerMagie(duel, defender, counter);
    assert.equal(result.contre, true, JSON.stringify(result)); assert.equal(duel.mobaCreatureEnAttente, null); assert.equal(duel.fenetreReponse, false);
    assert.deepEqual(duel[caster].main, ['gardienne-des-portes-de-sable']);
    assert.equal(duel[caster].cimetiere.filter(id=>id==='gardienne-des-portes-de-sable').length, 1);
    assert.equal(duel[defender].cimetiere.filter(id=>id===counter).length, 1);
    assert.equal(Object.values(duel[caster].mana).reduce((a,b)=>a+b,0), mana - 2);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  });
}

test('Annonce de créature : passer résout la pose et son arrivée sans repayer', () => {
  const duel = partie(); duel.joueur.main = ['gardienne-des-portes-de-sable']; duel.joueur.mana.sable = 10;
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 1, {ouvrirReponse:true}).creatureEnAttente, true);
  const mana = JSON.stringify(duel.joueur.mana);
  const result = rpgMobaPasserCreature(duel, 'sorcier'); assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.entite.mobaLane, 'right'); assert.equal(mobaVoie(duel.moba,'right').slots.joueur[1], result.entite.id);
  assert.equal(JSON.stringify(duel.joueur.mana), mana); assert.equal(duel.mobaCreatureEnAttente, null); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Écueil refuse un sort et les contresorts de magie refusent une créature', () => {
  const duel = partie(); duel.joueur.main = ['grand-hiver']; duel.joueur.mana.neige = 10; duel.sorcier.main = ['ecueil', 'contresort-des-abimes']; duel.sorcier.mana.eau = 20;
  assert.equal(rpgMobaLancerMagie(duel,'joueur','grand-hiver',null,null,null,{ouvrirReponse:true}).sortEnAttente,true);
  const before = JSON.stringify(duel); assert.equal(rpgMobaLancerMagie(duel,'sorcier','ecueil').raison,'timing'); assert.equal(JSON.stringify(duel),before);
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','contresort-des-abimes').contre,true);
  duel.joueur.main = ['gardienne-des-portes-de-sable']; duel.joueur.mana.sable = 10;
  duel.sorcier.main = ['silence-decume','maree-contraire']; duel.sorcier.mana.eau = 20;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const pending = JSON.stringify(duel);
  for(const id of duel.sorcier.main) { assert.equal(rpgMobaLancerMagie(duel,'sorcier',id).raison,'timing'); assert.equal(JSON.stringify(duel),pending); }
  assert.equal(rpgMobaPasserCreature(duel,'sorcier').ok,true);
});

test('Annonce de créature : arrivée ciblée puis réponse à son effet sont deux étapes successives', () => {
  const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 10;
  const victime = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0).entite; rpgFinDeTour(duel);
  duel.joueur.main = ['maitre-du-marteau']; duel.joueur.mana.neige = 20;
  duel.sorcier.main = ['parade-du-verre']; duel.sorcier.mana.eau = 10;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','maitre-du-marteau','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const result = rpgMobaPasserCreature(duel,'sorcier');
  assert.equal(result.ok,true,JSON.stringify(result)); assert.ok(duel.arriveeEnAttente); assert.equal(duel.mobaCreatureEnAttente,null); assert.equal(duel.fenetreReponse,false);
  const cible = rpgMobaResoudreArrivee(duel,'joueur',victime.id);
  assert.equal(cible.ok,true,JSON.stringify(cible)); assert.ok(duel.effetCreatureEnAttente); assert.equal(duel.mobaCreatureEnAttente,null);
  assert.equal(rpgMobaPasserEffetCreature(duel,'sorcier').ok,true);
  assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Annonce de créature : occupation ou conquête pendant la réponse dissipe sans remboursement', () => {
  for (const occupe of [true,false]) {
    const duel = partie(); duel.joueur.main = ['orochi']; duel.joueur.mana.braise = 30;
    const orochi = rpgMobaJouerCreature(duel,'joueur','orochi','right',0).entite; orochi.pv = 1;
    duel.joueur.main = ['gardienne-des-portes-de-sable']; duel.joueur.mana.sable = 10;
    duel.sorcier.main = [occupe ? 'trait-de-braise' : 'eclair-du-marteau']; duel.sorcier.mana.braise = 20; duel.sorcier.mana.neige = 20;
    if (!occupe) mobaInfliger(duel.moba,'sorcier','right',7);
    assert.equal(rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',1,{ouvrirReponse:true}).creatureEnAttente,true);
    const mana = JSON.stringify(duel.joueur.mana);
    assert.equal(rpgMobaLancerMagie(duel,'sorcier',duel.sorcier.main[0],occupe ? orochi.id : 'sorcier',occupe ? null : 'right').ok,true);
    assert.equal(rpgMobaPasserCreature(duel,'sorcier').dissipe,true);
    assert.equal(duel.joueur.cimetiere.filter(id=>id==='gardienne-des-portes-de-sable').length,1); assert.equal(JSON.stringify(duel.joueur.mana),mana);
    assert.equal(duel.mobaCreatureEnAttente,null); assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Annonce de créature : une réponse gagnante libère la réservation', () => {
  const duel = partie(); duel.joueur.main = ['gardienne-des-portes-de-sable']; duel.joueur.mana.sable = 10;
  duel.sorcier.main = ['eclair-du-marteau']; duel.sorcier.mana.neige = 20;
  mobaInfliger(duel.moba,'sorcier','left',10); mobaInfliger(duel.moba,'sorcier','right',7);
  assert.equal(rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','center',0,{ouvrirReponse:true}).creatureEnAttente,true);
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','eclair-du-marteau','sorcier','right').ok,true);
  assert.equal(duel.moba.winner,'sorcier'); assert.equal(duel.mobaCreatureEnAttente,null); assert.equal(duel.fenetreReponse,false);
  assert.equal(duel.joueur.cimetiere.filter(id=>id==='gardienne-des-portes-de-sable').length,1);
});

test('IA évalue les contres de créature sans mutation ni hasard et peut passer sans double contre', () => {
  for (const counter of ['ecueil','contresort-des-abimes']) {
    const duel = partie(); duel.joueur.main = ['gardienne-des-portes-de-sable']; duel.joueur.mana.sable = 10;
    duel.sorcier.main = [counter]; duel.sorcier.mana.eau = 20;
    assert.equal(rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','center',0,{ouvrirReponse:true}).creatureEnAttente,true);
    let calls=0; rpgReglerHasard(duel,()=>{calls++;return .5;});
    const before=JSON.stringify(duel), move=rpgMobaChoisirMagieIA(duel,'sorcier',true);
    assert.equal(move?.id,counter); assert.equal(JSON.stringify(duel),before); assert.equal(calls,0);
    // Choosing to pass must not invoke the classic AI's separate counter path.
    const result=rpgMobaPasserCreature(duel,'sorcier'); assert.equal(result.ok,true,JSON.stringify(result));
    assert.ok(result.entite); assert.equal(duel.sorcier.main[0],counter); assert.equal(duel.mobaCreatureEnAttente,null);
  }
});

test('Toutes les créatures auditées gardent un placement cohérent après annonce et passage', () => {
  const ids = MOBA_CARTES_AUTORISEES.filter(id => ['creature', 'hero'].includes(cardById(id)?.kind));
  let annonces = 0;
  for (const id of ids) {
    const duel = partie(); rpgFinDeTour(duel); duel.sorcier.mana.sable = 20;
    assert.equal(rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).ok,true);
    rpgFinDeTour(duel); duel.joueur.main = [id];
    for (const color of ['sable','braise','neige','eau','tenebres']) duel.joueur.mana[color] = 30;
    rpgReglerHasard(duel,()=>.5);
    const direct = JSON.parse(JSON.stringify(duel)); rpgReglerHasard(direct,()=>.5);
    const imme = rpgMobaJouerCreature(direct,'joueur',id,'left',0);
    const annonce = rpgMobaJouerCreature(duel,'joueur',id,'left',0,{ouvrirReponse:true});
    assert.equal(annonce.ok,imme.ok,`${id} annonce: ${JSON.stringify(annonce)} vs ${JSON.stringify(imme)}`);
    if (!annonce.ok) continue;
    annonces++; assert.equal(annonce.creatureEnAttente,true,id);
    const result = rpgMobaPasserCreature(duel,'sorcier');
    assert.equal(result.ok,true,`${id}: ${JSON.stringify(result)}`); assert.ok(!result.dissipe,id);
    assert.equal(result.entite?.carteId,imme.entite?.carteId,id);
    // Printed boarding is deliberately chosen after the announcement in the UI,
    // whereas the direct call selects a prize immediately.
    if (Number.isFinite(duel.arriveeEnAttente?.abordage) && imme.entite?.enCale) {
      assert.equal(rpgMobaResoudreArrivee(duel,'joueur',imme.entite.enCale.entite.id).ok,true,id);
    }
    assert.equal(Boolean(duel.arriveeEnAttente),Boolean(direct.arriveeEnAttente),id);
    assert.equal(rpgMobaPlacementCoherent(duel),true,id); assert.equal(duel.mobaCreatureEnAttente,null,id);
  }
  assert.ok(annonces > 70);
});

test('Une magie rapide répond à une créature sans ouvrir de fenêtre imbriquée', () => {
  const duel=partie(); duel.joueur.main=['gardienne-des-portes-de-sable']; duel.joueur.mana.sable=10;
  duel.sorcier.main=['trait-de-braise']; duel.sorcier.mana.braise=10;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const result=rpgMobaLancerMagie(duel,'sorcier','trait-de-braise','sorcier','center',null,{ouvrirReponse:true});
  assert.equal(result.ok,true,JSON.stringify(result)); assert.equal(result.sortEnAttente,undefined);
  assert.equal(duel.mobaSortEnAttente,undefined); assert.equal(duel.mobaCreatureEnAttente?.carteId,'gardienne-des-portes-de-sable');
  assert.equal(rpgMobaPasserCreature(duel,'sorcier').ok,true); assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Annonce de créature : le soin de voie et la pioche se produisent seulement au passage', () => {
  const duel=partie(); duel.joueur.main=['porteuse-de-cruches']; duel.joueur.mana.eau=20;
  mobaInfliger(duel.moba,'sorcier','right',4);
  const hp=mobaVoie(duel.moba,'right').hp.joueur;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','porteuse-de-cruches','right',0,{ouvrirReponse:true}).creatureEnAttente,true);
  assert.equal(mobaVoie(duel.moba,'right').hp.joueur,hp);
  const result=rpgMobaPasserCreature(duel,'sorcier');
  assert.equal(result.healingEvents[0]?.laneId,'right'); assert.equal(result.healingEvents[0]?.healing,3);
  duel.joueur.main=['sahir-des-braises']; duel.joueur.mana.braise=20;
  const deck=duel.joueur.deck.length;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','sahir-des-braises','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  assert.equal(duel.joueur.deck.length,deck);
  assert.equal(rpgMobaPasserCreature(duel,'sorcier').ok,true); assert.equal(duel.joueur.deck.length,deck-1);
});

for (const caster of ['joueur', 'sorcier']) test(`Sabre maudit : annonce, armure et Vol de vie sur la voie de ${caster}`, () => {
  const duel = partie(); const defense = caster === 'joueur' ? 'sorcier' : 'joueur';
  if (caster === 'sorcier') rpgFinDeTour(duel);
  duel[caster].main = ['gardienne-des-portes-de-sable']; duel[caster].mana.sable = 20;
  const bearer = rpgMobaJouerCreature(duel,caster,'gardienne-des-portes-de-sable','right',0).entite;
  duel[caster].main = ['sabre-maudit']; duel[caster].mana.braise = 20; duel[defense].main = [];
  const before = [bearer.atk,bearer.pv,bearer.pvMax];
  assert.equal(rpgMobaLancerMagie(duel,caster,'sabre-maudit',bearer.id,null,null,{ouvrirReponse:true}).sortEnAttente,true);
  assert.deepEqual([bearer.atk,bearer.pv,bearer.pvMax],before);
  const paid = JSON.stringify(duel[caster].mana);
  const res = rpgMobaPasserSort(duel,defense); assert.equal(res.ok,true,JSON.stringify(res));
  assert.deepEqual([bearer.atk,bearer.pv,bearer.pvMax],[before[0]+2,before[1]+1,before[2]+1]);
  assert.equal(bearer.volDeVie,true); assert.equal(bearer.coupCritique.chance,0.15); assert.deepEqual(bearer.armes,['sabre-maudit']);
  assert.equal(JSON.stringify(duel[caster].mana),paid);
  bearer.ready = true; bearer.attaquee = false; rpgReglerHasard(duel,()=>.5);
  mobaInfliger(duel.moba,defense,'right',5); const legacy = duel[caster].pv;
  const combat = rpgMobaLancerAttaque(duel,caster,[bearer.id],{}); assert.equal(combat.ok,true,JSON.stringify(combat));
  assert.equal(combat.damageEvents[0].damage,bearer.atk); assert.equal(mobaVoie(duel.moba,'right').hp[caster],5+Math.ceil(bearer.atk/2));
  assert.equal(combat.healingEvents[0]?.laneId,'right'); assert.equal(combat.healingEvents[0]?.volDeVie,true); assert.equal(duel[caster].pv,legacy);
  assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Brise-lame détruit le sabre adverse et pioche après réponse, le Lien Orochi est lu à résolution', () => {
  const duel=partie(); rpgFinDeTour(duel); duel.sorcier.main=['gardienne-des-portes-de-sable']; duel.sorcier.mana.sable=20;
  const bearer=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;
  duel.sorcier.main=['sabre-maudit']; duel.sorcier.mana.braise=20; assert.equal(rpgMobaLancerMagie(duel,'sorcier','sabre-maudit',bearer.id).ok,true);
  rpgFinDeTour(duel); duel.joueur.main=['orochi']; duel.joueur.mana.braise=30;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','orochi','center',0).ok,true);
  duel.joueur.main=['brise-lame']; duel.joueur.deck=['verglas','trait-de-braise','grand-hiver'];
  assert.equal(rpgMobaLancerMagie(duel,'joueur','brise-lame',bearer.id,null,null,{ouvrirReponse:true}).sortEnAttente,true);
  assert.equal(bearer.volDeVie,true); assert.equal(duel.joueur.deck.length,3);
  const result=rpgMobaPasserSort(duel,'sorcier'); assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(bearer.volDeVie,false); assert.deepEqual(bearer.armes,[]); assert.ok(duel.sorcier.cimetiere.includes('sabre-maudit'));
  assert.equal(duel.joueur.deck.length,1); assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Mémoire récupère le Sabre du cimetière, réserve ses cibles et se dissipe si elles disparaissent', () => {
  for (const lost of [false,true]) {
    const duel=partie(); duel.joueur.main=['gardienne-des-portes-de-sable']; duel.joueur.mana.sable=20;
    const bearer=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
    duel.joueur.main=['memoire-de-l-armurerie']; duel.joueur.cimetiere=['sabre-maudit']; duel.joueur.mana.sable=20;
    const result=rpgMobaLancerMagie(duel,'joueur','memoire-de-l-armurerie',bearer.id,null,null,{ouvrirReponse:true});
    assert.equal(result.sortEnAttente,true,JSON.stringify(result)); assert.equal(duel.mobaSortEnAttente.cibleSecondaireId,'sabre-maudit');
    assert.match(duel.mobaSortEnAttente.cibleNom,/Sabre maudit/); assert.ok(!bearer.volDeVie);
    if(lost) duel.joueur.cimetiere=[];
    const pass=rpgMobaPasserSort(duel,'sorcier'); assert.equal(pass.ok,true,JSON.stringify(pass)); assert.equal(Boolean(pass.dissipe),lost);
    assert.equal(Boolean(bearer.volDeVie),!lost); assert.equal(duel.joueur.cimetiere.filter(id=>id==='memoire-de-l-armurerie').length,1);
    assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Sabre : bloqueur et attaquant soignent uniquement leurs voies lors des blessures simultanées', () => {
  const duel=partie(); duel.joueur.main=['gardienne-des-portes-de-sable']; duel.joueur.mana.sable=20;
  const attacker=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
  duel.joueur.main=['sabre-maudit']; duel.joueur.mana.braise=20; assert.equal(rpgMobaLancerMagie(duel,'joueur','sabre-maudit',attacker.id).ok,true);
  rpgFinDeTour(duel); duel.sorcier.main=['gardienne-des-portes-de-sable']; duel.sorcier.mana.sable=20;
  const blocker=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;
  duel.sorcier.main=['sabre-maudit']; duel.sorcier.mana.braise=20; assert.equal(rpgMobaLancerMagie(duel,'sorcier','sabre-maudit',blocker.id).ok,true);
  rpgFinDeTour(duel); rpgReglerHasard(duel,()=>.9);
  attacker.atk=blocker.atk=8;
  mobaInfliger(duel.moba,'sorcier','left',5); mobaInfliger(duel.moba,'joueur','left',5);
  const legacy=[duel.joueur.pv,duel.sorcier.pv], attack=attacker.atk, defense=blocker.atk;
  const result=rpgMobaLancerAttaque(duel,'joueur',[attacker.id],{[attacker.id]:[blocker.id]}); assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(mobaVoie(duel.moba,'left').hp.joueur,Math.min(10,5+Math.ceil(attack/2)));
  assert.equal(mobaVoie(duel.moba,'left').hp.sorcier,Math.min(10,5+Math.ceil(defense/2)));
  assert.deepEqual([duel.joueur.pv,duel.sorcier.pv],legacy); assert.equal(result.healingEvents.length,2);
  assert.ok(duel.joueur.cimetiere.includes('sabre-maudit')); assert.ok(duel.sorcier.cimetiere.includes('sabre-maudit'));
  assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Sabre : un coup critique soigne sa voie, pas les PV classiques', () => {
  const duel=partie(); duel.joueur.main=['gardienne-des-portes-de-sable']; duel.joueur.mana.sable=20;
  const attacker=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
  duel.joueur.main=['sabre-maudit']; duel.joueur.mana.braise=20; assert.equal(rpgMobaLancerMagie(duel,'joueur','sabre-maudit',attacker.id).ok,true);
  rpgFinDeTour(duel); rpgFinDeTour(duel); mobaInfliger(duel.moba,'sorcier','left',5);
  rpgReglerHasard(duel,()=>0); const result=rpgMobaLancerAttaque(duel,'joueur',[attacker.id],{});
  assert.equal(result.ok,true,JSON.stringify(result)); assert.equal(result.damageEvents[0].damage,attacker.atk*2);
  assert.equal(mobaVoie(duel.moba,'left').hp.joueur,Math.min(10,5+attacker.atk)); assert.equal(duel.joueur.pv,25);
  assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Sabre quitte la table à la mort, au renvoi et à la conquête, sans sortir la créature deux fois', () => {
  for (const sortie of ['mort','renvoi','conquete']) {
    const duel=partie(); duel.joueur.main=['gardienne-des-portes-de-sable']; duel.joueur.mana.sable=20;
    const bearer=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
    duel.joueur.main=['sabre-maudit']; duel.joueur.mana.braise=20; assert.equal(rpgMobaLancerMagie(duel,'joueur','sabre-maudit',bearer.id).ok,true);
    duel.sorcier.mana.braise=20; duel.sorcier.mana.eau=20; duel.sorcier.main=[sortie==='renvoi'?'ressac':'trait-de-braise'];
    if(sortie==='mort') bearer.pv=1;
    if(sortie==='conquete') mobaInfliger(duel.moba,'sorcier','left',7);
    assert.equal(rpgMobaTerminerTour(duel,'joueur').reponse,'sorcier');
    assert.equal(rpgMobaLancerMagie(duel,'sorcier',duel.sorcier.main[0],sortie==='conquete'?'sorcier':bearer.id,sortie==='conquete'?'left':null).ok,true);
    assert.equal(duel.joueur.cimetiere.filter(id=>id==='sabre-maudit').length,1,sortie);
    assert.equal(duel.joueur.creatures.length,0,sortie); assert.equal(rpgMobaPlacementCoherent(duel),true);
    assert.equal(duel.joueur.main.includes('gardienne-des-portes-de-sable'),sortie==='renvoi');
  }
});

test('Sabre : le Défi et la conquête utilisent la voie de la source, sans soin sur une voie fermée', () => {
  const duel=partie(); duel.joueur.main=['gardienne-des-portes-de-sable']; duel.joueur.mana.sable=20;
  const ally=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
  duel.joueur.main=['sabre-maudit']; duel.joueur.mana.braise=20; assert.equal(rpgMobaLancerMagie(duel,'joueur','sabre-maudit',ally.id).ok,true);
  rpgFinDeTour(duel); duel.sorcier.main=['gardienne-des-portes-de-sable']; duel.sorcier.mana.sable=20;
  const enemy=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite; rpgFinDeTour(duel);
  mobaInfliger(duel.moba,'sorcier','left',6); const legacy=duel.joueur.pv;
  duel.joueur.main=['defi-du-jarl']; duel.joueur.mana.neige=20;
  const fight=rpgMobaLancerMagie(duel,'joueur','defi-du-jarl',enemy.id,null,null,{cibleSecondaireId:ally.id});
  assert.equal(fight.ok,true,JSON.stringify(fight)); assert.equal(fight.healingEvents[0]?.laneId,'left');
  assert.equal(mobaVoie(duel.moba,'left').hp.joueur,4+Math.ceil(ally.atk/2)); assert.equal(duel.joueur.pv,legacy);
  mobaInfliger(duel.moba,'joueur','left',9); ally.ready=true; ally.attaquee=false; rpgReglerHasard(duel,()=>.5);
  const result=rpgMobaLancerAttaque(duel,'joueur',[ally.id],{}); assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(mobaVoie(duel.moba,'left').active,false); assert.equal(result.healingEvents.length,0); assert.equal(duel.joueur.pv,legacy);
  assert.ok(duel.joueur.cimetiere.includes('sabre-maudit')); assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Brise-lame : parade et perte de cible avant résolution conservent les règles de paiement', () => {
  for (const shield of [true,false]) {
    const duel=partie(); rpgFinDeTour(duel); duel.sorcier.main=['gardienne-des-portes-de-sable']; duel.sorcier.mana.sable=20;
    const bearer=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;
    duel.sorcier.main=['sabre-maudit']; duel.sorcier.mana.braise=20; assert.equal(rpgMobaLancerMagie(duel,'sorcier','sabre-maudit',bearer.id).ok,true);
    rpgFinDeTour(duel); duel.joueur.main=['brise-lame']; duel.joueur.mana.braise=20; duel.joueur.deck=['verglas'];
    duel.sorcier.main=[shield?'parade-du-verre':'trait-de-braise']; duel.sorcier.mana.eau=20; duel.sorcier.mana.braise=20;
    if(!shield) mobaInfliger(duel.moba,'sorcier','left',7);
    assert.equal(rpgMobaLancerMagie(duel,'joueur','brise-lame',bearer.id,null,null,{ouvrirReponse:true}).sortEnAttente,true);
    const paid=JSON.stringify(duel.joueur.mana);
    assert.equal(rpgMobaLancerMagie(duel,'sorcier',duel.sorcier.main[0],shield?bearer.id:'sorcier',shield?null:'left').ok,true);
    const result=rpgMobaPasserSort(duel,'sorcier'); assert.equal(result.ok,true,JSON.stringify(result));
    if(shield) { assert.equal(result.bouclierBloque,true); assert.ok(bearer.armes.includes('sabre-maudit')); }
    else assert.equal(result.dissipe,true);
    assert.equal(JSON.stringify(duel.joueur.mana),paid); assert.equal(duel.joueur.deck.length,1); assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('IA évalue Sabre, Mémoire et Brise-lame sur copies sans consommer le hasard', () => {
  for (const id of ['sabre-maudit','memoire-de-l-armurerie','brise-lame']) {
    const duel=partie(); duel.joueur.main=['gardienne-des-portes-de-sable']; duel.joueur.mana.sable=20;
    const ally=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
    rpgFinDeTour(duel); duel.sorcier.main=['gardienne-des-portes-de-sable']; duel.sorcier.mana.sable=20;
    const enemy=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;
    if(id==='brise-lame') {duel.sorcier.main=['sabre-maudit']; duel.sorcier.mana.braise=20; assert.equal(rpgMobaLancerMagie(duel,'sorcier','sabre-maudit',enemy.id).ok,true);}
    rpgFinDeTour(duel); duel.joueur.main=[id]; duel.joueur.mana.sable=20; duel.joueur.mana.braise=20;
    if(id==='memoire-de-l-armurerie') duel.joueur.cimetiere=['sabre-maudit'];
    let calls=0; rpgReglerHasard(duel,()=>{calls++;return .5;}); const before=JSON.stringify(duel);
    const move=rpgMobaChoisirMagieIA(duel,'joueur'); assert.equal(move?.id,id,`${id}: ${JSON.stringify(move)}`);
    assert.equal(move.cible,id==='brise-lame'?enemy.id:ally.id); assert.equal(JSON.stringify(duel),before); assert.equal(calls,0);
    assert.equal(rpgMobaLancerMagie(duel,'joueur',id,move.cible).ok,true);
  }
});

test('Équipement : contre sans double paiement ni consommation d’un deuxième exemplaire', () => {
  for (const caster of ['joueur','sorcier']) {
    const duel=partie(); const defender=caster==='joueur'?'sorcier':'joueur'; if(caster==='sorcier')rpgFinDeTour(duel);
    duel[caster].main=['gardienne-des-portes-de-sable'];duel[caster].mana.sable=20;
    const bearer=rpgMobaJouerCreature(duel,caster,'gardienne-des-portes-de-sable','center',0).entite;
    duel[caster].main=['sabre-maudit','sabre-maudit'];duel[caster].mana.braise=20;
    duel[defender].main=['silence-decume'];duel[defender].mana.eau=20;
    assert.equal(rpgMobaLancerMagie(duel,caster,'sabre-maudit',bearer.id,null,null,{ouvrirReponse:true}).sortEnAttente,true);
    const mana=JSON.stringify(duel[caster].mana);
    assert.equal(rpgMobaLancerMagie(duel,defender,'silence-decume').contre,true);
    assert.equal(JSON.stringify(duel[caster].mana),mana); assert.equal(duel[caster].main.filter(id=>id==='sabre-maudit').length,1);
    assert.equal(duel[caster].cimetiere.filter(id=>id==='sabre-maudit').length,1);assert.equal(bearer.volDeVie,false);
    assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Brise-lame enlève toutes les copies attachées comme en duel classique', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=20;
  const bearer=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;
  duel.sorcier.main=['sabre-maudit','sabre-maudit'];duel.sorcier.mana.braise=20;
  for(let n=0;n<2;n++) assert.equal(rpgMobaLancerMagie(duel,'sorcier','sabre-maudit',bearer.id).ok,true);
  assert.equal(bearer.armes.length,2);rpgFinDeTour(duel);duel.joueur.main=['brise-lame'];duel.joueur.mana.braise=20;
  assert.equal(rpgMobaLancerMagie(duel,'joueur','brise-lame',bearer.id).ok,true);
  assert.equal(bearer.armes.length,0);assert.equal(bearer.volDeVie,false);assert.equal(duel.sorcier.cimetiere.filter(id=>id==='sabre-maudit').length,2);
  assert.equal(rpgMobaPlacementCoherent(duel),true);
});

function fixturePrise({ victimLane='right', victimSlot=1, captorLane='left', captorSlot=0 } = {}) {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=20;
  const victime=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable',victimLane,victimSlot).entite;
  rpgFinDeTour(duel);duel.joueur.prochaineArriveeAbordage=true;duel.joueur.main=['gardien-de-la-porte-ardente'];duel.joueur.mana.braise=20;
  const annonce=rpgMobaJouerCreature(duel,'joueur','gardien-de-la-porte-ardente',captorLane,captorSlot,{ouvrirReponse:true});
  assert.equal(annonce.creatureEnAttente,true,JSON.stringify(annonce));const arrivee=rpgMobaPasserCreature(duel,'sorcier');
  assert.equal(arrivee.arriveeEnAttente,true,JSON.stringify(arrivee));return {duel,victime,capteur:arrivee.entite};
}

test('Abordage MOBA : libère la case, puis rend la présence dans sa voie à la mort du capteur', () => {
  const {duel,victime,capteur}=fixturePrise();
  assert.equal(rpgMobaResoudreArrivee(duel,'joueur',victime.id).ok,true);assert.equal(capteur.enCale.entite.id,victime.id);
  assert.equal(mobaVoie(duel.moba,'right').slots.sorcier[1],null);assert.equal(rpgMobaPlacementCoherent(duel),true);
  capteur.pv=capteur.def=1;duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=20;duel.tour='sorcier';
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',capteur.id).ok,true);
  assert.equal(mobaVoie(duel.moba,'right').slots.sorcier[1],victime.id);assert.equal(victime.ready,false);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Abordage MOBA : le porteur perd son Sabre, même après libération', () => {
  const {duel,victime,capteur}=fixturePrise();
  // Attach before capture through the engine, then restore the pending turn.
  duel.arriveeEnAttente=null;duel.tour='sorcier';duel.sorcier.main=['sabre-maudit'];duel.sorcier.mana.braise=20;
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','sabre-maudit',victime.id).ok,true);
  duel.tour='joueur';duel.arriveeEnAttente={cote:'joueur',entiteId:capteur.id,carteId:capteur.carteId,abordage:2};
  assert.equal(rpgMobaResoudreArrivee(duel,'joueur',victime.id).ok,true);assert.equal(victime.atk,1);assert.equal(victime.pvMax,4);assert.equal(victime.volDeVie,false);assert.deepEqual(victime.armes,[]);
  assert.equal(duel.sorcier.cimetiere.filter(id=>id==='sabre-maudit').length,1);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Abordage MOBA : retour dans une autre case de la même voie, ou en main si elle est pleine', () => {
  for(const full of [false,true]) {
    const {duel,victime,capteur}=fixturePrise();assert.equal(rpgMobaResoudreArrivee(duel,'joueur',victime.id).ok,true);
    duel.tour='sorcier';duel.sorcier.main=['gardienne-des-portes-de-sable','gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=20;
    assert.equal(rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',1).ok,true);
    if(full)assert.equal(rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).ok,true);
    capteur.pv=capteur.def=1;duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=20;
    assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',capteur.id).ok,true);
    assert.equal(duel.sorcier.creatures.some(e=>e.id===victime.id),!full);assert.equal(duel.sorcier.main.includes(victime.carteId),full);
    if(!full)assert.equal(mobaVoie(duel.moba,'right').slots.sorcier[0],victime.id);
    assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Abordage MOBA : renvoi et conquête du capteur ouvrent la cale en main', () => {
  for(const sortie of ['renvoi','conquete']) {
    const {duel,victime,capteur}=fixturePrise();assert.equal(rpgMobaResoudreArrivee(duel,'joueur',victime.id).ok,true);
    duel.sorcier.main=[sortie==='renvoi'?'ressac':'trait-de-braise'];duel.sorcier.mana.eau=20;duel.sorcier.mana.braise=20;
    if(sortie==='conquete')mobaInfliger(duel.moba,'sorcier','left',7);
    assert.equal(rpgMobaTerminerTour(duel,'joueur').reponse,'sorcier');
    assert.equal(rpgMobaLancerMagie(duel,'sorcier',duel.sorcier.main[0],sortie==='renvoi'?capteur.id:'sorcier',sortie==='conquete'?'left':null).ok,true);
    assert.ok(duel.sorcier.main.includes(victime.carteId));assert.ok(!duel.sorcier.creatures.some(e=>e.id===victime.id));assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Abordage MOBA : une voie d’origine conquise interdit le retour en jeu', () => {
  const {duel,victime,capteur}=fixturePrise();assert.equal(rpgMobaResoudreArrivee(duel,'joueur',victime.id).ok,true);
  duel.joueur.main=['trait-de-braise'];duel.joueur.mana.braise=20;mobaInfliger(duel.moba,'joueur','right',7);
  assert.equal(rpgMobaLancerMagie(duel,'joueur','trait-de-braise','sorcier','right').ok,true);
  capteur.pv=capteur.def=1;duel.tour='sorcier';duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=20;
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',capteur.id).ok,true);
  assert.ok(duel.sorcier.main.includes(victime.carteId));assert.equal(mobaVoie(duel.moba,'right').active,false);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Abordage MOBA : une seconde capture ouvre d’abord la cale du capturé', () => {
  const {duel,victime,capteur}=fixturePrise();assert.equal(rpgMobaResoudreArrivee(duel,'joueur',victime.id).ok,true);
  duel.tour='sorcier';duel.sorcier.prochaineArriveeAbordage=true;duel.sorcier.main=['jarl-au-marteau-de-guerre'];duel.sorcier.mana.neige=20;
  assert.equal(rpgMobaJouerCreature(duel,'sorcier','jarl-au-marteau-de-guerre','center',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const arrivee=rpgMobaPasserCreature(duel,'joueur');assert.equal(arrivee.arriveeEnAttente,true);
  assert.equal(rpgMobaResoudreArrivee(duel,'sorcier',capteur.id).ok,true);assert.ok(duel.sorcier.main.includes(victime.carteId));
  assert.equal(arrivee.entite.enCale.entite.id,capteur.id);assert.equal(capteur.enCale,null);assert.equal(rpgMobaPlacementCoherent(duel),true);
  arrivee.entite.pv=arrivee.entite.def=1;duel.tour='joueur';duel.joueur.main=['trait-de-braise'];duel.joueur.mana.braise=20;
  assert.equal(rpgMobaLancerMagie(duel,'joueur','trait-de-braise',arrivee.entite.id).ok,true);
  assert.ok(duel.joueur.creatures.some(e=>e.id===capteur.id));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for (const side of ['joueur','sorcier']) test(`Lettre de marque MOBA : annonce, pioche et prochaine prise pour ${side}`, () => {
  const duel=partie(), autre=side==='joueur'?'sorcier':'joueur';if(autre==='sorcier')rpgFinDeTour(duel);
  duel[autre].main=['gardienne-des-portes-de-sable'];duel[autre].mana.sable=20;
  const victime=rpgMobaJouerCreature(duel,autre,'gardienne-des-portes-de-sable','right',0).entite;rpgFinDeTour(duel);
  duel[side].main=['lettre-de-marque'];duel[side].deck=['gardien-de-la-porte-ardente'];duel[side].mana.sable=20;duel[side].mana.eau=20;duel[side].mana.braise=20;
  const annonce=rpgMobaLancerMagie(duel,side,'lettre-de-marque',null,null,null,{ouvrirReponse:true});assert.equal(annonce.sortEnAttente,true,JSON.stringify(annonce));
  assert.equal(Boolean(duel[side].prochaineArriveeAbordage),false);assert.equal(duel[side].deck.length,1);
  assert.equal(rpgMobaPasserSort(duel,autre).ok,true);assert.equal(duel[side].prochaineArriveeAbordage,true);assert.equal(duel[side].deck.length,0);
  assert.equal(rpgMobaJouerCreature(duel,side,'gardien-de-la-porte-ardente','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const arrivee=rpgMobaPasserCreature(duel,autre);assert.equal(arrivee.arriveeEnAttente,true,JSON.stringify(arrivee));assert.equal(duel[side].prochaineArriveeAbordage,false);
  assert.equal(rpgMobaResoudreArrivee(duel,side,victime.id).ok,true);assert.equal(arrivee.entite.enCale.entite.id,victime.id);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Lettre MOBA : contre, expiration et appel direct sans fenêtre', () => {
  const duel=partie();duel.joueur.main=['lettre-de-marque','lettre-de-marque'];duel.joueur.mana.sable=20;duel.joueur.mana.eau=20;
  duel.sorcier.main=['silence-decume'];duel.sorcier.mana.eau=20;const deck=duel.joueur.deck.length;
  assert.equal(rpgMobaLancerMagie(duel,'joueur','lettre-de-marque',null,null,null,{ouvrirReponse:true}).sortEnAttente,true);
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','silence-decume').contre,true);assert.equal(Boolean(duel.joueur.prochaineArriveeAbordage),false);assert.equal(duel.joueur.deck.length,deck);
  assert.equal(duel.joueur.main.filter(id=>id==='lettre-de-marque').length,1);
  assert.equal(rpgMobaLancerMagie(duel,'joueur','lettre-de-marque').ok,true);assert.equal(duel.joueur.prochaineArriveeAbordage,true);
  rpgFinDeTour(duel);assert.equal(duel.joueur.prochaineArriveeAbordage,false);
});

test('Abordage MOBA : la prise précède l’arrivée ciblée et une cible disparue ne bloque pas le tour', () => {
  for(const reste of [false,true]) {
    const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable','gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=20;
    const victim=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;
    const autre=reste?rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite:null;
    rpgFinDeTour(duel);duel.joueur.prochaineArriveeAbordage=true;duel.joueur.main=['sonneur-fele'];duel.joueur.mana.eau=20;
    assert.equal(rpgMobaJouerCreature(duel,'joueur','sonneur-fele','center',0,{ouvrirReponse:true}).creatureEnAttente,true);
    const arrivee=rpgMobaPasserCreature(duel,'sorcier');assert.equal(arrivee.arriveeEnAttente,true);
    const result=rpgMobaResoudreArrivee(duel,'joueur',victim.id);assert.equal(result.ok,true,JSON.stringify(result));
    assert.equal(Boolean(duel.arriveeEnAttente),reste);assert.equal(Boolean(result.arriveeEnAttente),reste);
    if(reste)assert.equal(rpgMobaResoudreArrivee(duel,'joueur',autre.id).ok,true);
    assert.equal(duel.arriveeEnAttente,null);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Abordage MOBA : un jeton capturé cesse d’exister si le capteur est renvoyé', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['tarek'];duel.sorcier.mana.sable=20;
  assert.equal(rpgMobaJouerCreature(duel,'sorcier','tarek','right',0).ok,true);
  const token=duel.sorcier.creatures.find(e=>e.jeton&&e.mobaLane==='right');assert.ok(token);
  rpgFinDeTour(duel);duel.joueur.prochaineArriveeAbordage=true;duel.joueur.main=['gardien-de-la-porte-ardente'];duel.joueur.mana.braise=20;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','gardien-de-la-porte-ardente','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const captor=rpgMobaPasserCreature(duel,'sorcier').entite;assert.equal(rpgMobaResoudreArrivee(duel,'joueur',token.id).ok,true);
  duel.sorcier.main=['ressac'];duel.sorcier.mana.eau=20;assert.equal(rpgMobaTerminerTour(duel,'joueur').reponse,'sorcier');
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','ressac',captor.id).ok,true);assert.ok(!duel.sorcier.main.includes(token.carteId));assert.ok(!duel.sorcier.creatures.some(e=>e.id===token.id));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for(const caster of ['joueur','sorcier']) test(`Grand Débarquement MOBA : seules les cales occupées de ${caster} sont renforcées`, () => {
  const duel=partie(),adv=caster==='joueur'?'sorcier':'joueur';if(adv==='sorcier')rpgFinDeTour(duel);
  duel[adv].main=['gardienne-des-portes-de-sable'];duel[adv].mana.sable=20;
  const victim=rpgMobaJouerCreature(duel,adv,'gardienne-des-portes-de-sable','right',0).entite;rpgFinDeTour(duel);
  duel[caster].prochaineArriveeAbordage=true;duel[caster].main=['gardien-de-la-porte-ardente','gardienne-des-portes-de-sable'];duel[caster].mana.braise=20;duel[caster].mana.sable=20;duel[caster].mana.eau=20;
  assert.equal(rpgMobaJouerCreature(duel,caster,'gardien-de-la-porte-ardente','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const captain=rpgMobaPasserCreature(duel,adv).entite;assert.equal(rpgMobaResoudreArrivee(duel,caster,victim.id).ok,true);
  const other=rpgMobaJouerCreature(duel,caster,'gardienne-des-portes-de-sable','center',0).entite;
  const captainBefore=[captain.atk,captain.pvMax,captain.pv],otherBefore=[other.atk,other.pvMax,other.pv];
  duel[caster].main=['le-grand-debarquement'];
  assert.equal(rpgMobaLancerMagie(duel,caster,'le-grand-debarquement',null,null,null,{ouvrirReponse:true}).sortEnAttente,true);
  assert.deepEqual([captain.atk,captain.pvMax,captain.pv],captainBefore);
  assert.equal(rpgMobaPasserSort(duel,adv).ok,true);
  assert.deepEqual([captain.atk,captain.pvMax,captain.pv],captainBefore.map((x)=>x+2));assert.equal(captain.overkillTemporaire>0,true);
  assert.deepEqual([other.atk,other.pvMax,other.pv],otherBefore);
  rpgFinDeTour(duel);assert.deepEqual([captain.atk,captain.pvMax,captain.pv],captainBefore);assert.equal(captain.overkillTemporaire,0);
  assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Grand Débarquement MOBA : le renvoi en réponse vide la cale avant le renfort', () => {
  const {duel,victime,capteur}=fixturePrise();assert.equal(rpgMobaResoudreArrivee(duel,'joueur',victime.id).ok,true);
  duel.joueur.main=['le-grand-debarquement'];duel.joueur.mana.eau=20;duel.joueur.mana.sable=20;
  duel.sorcier.main=['ressac'];duel.sorcier.mana.eau=20;
  assert.equal(rpgMobaLancerMagie(duel,'joueur','le-grand-debarquement',null,null,null,{ouvrirReponse:true}).sortEnAttente,true);
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','ressac',capteur.id).ok,true);assert.ok(duel.sorcier.main.includes(victime.carteId));
  assert.equal(rpgMobaPasserSort(duel,'sorcier').ok,true);assert.equal(duel.joueur.creatures.length,0);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('IA évalue Lettre et Débarquement sans modifier la partie ni consommer le hasard', () => {
  const {duel,victime,capteur}=fixturePrise();assert.equal(rpgMobaResoudreArrivee(duel,'joueur',victime.id).ok,true);
  capteur.ready=true;duel.joueur.main=['le-grand-debarquement'];duel.joueur.mana.sable=20;duel.joueur.mana.eau=20;
  let calls=0;rpgReglerHasard(duel,()=>{calls++;return .5;});let before=JSON.stringify(duel);
  assert.equal(rpgMobaChoisirMagieIA(duel,'joueur')?.id,'le-grand-debarquement');assert.equal(JSON.stringify(duel),before);assert.equal(calls,0);
  const match=partie();rpgFinDeTour(match);match.sorcier.main=['gardienne-des-portes-de-sable'];match.sorcier.mana.sable=20;
  rpgMobaJouerCreature(match,'sorcier','gardienne-des-portes-de-sable','right',0);rpgFinDeTour(match);
  match.joueur.main=['lettre-de-marque','gardien-de-la-porte-ardente'];match.joueur.mana.sable=20;match.joueur.mana.eau=20;match.joueur.mana.braise=20;
  calls=0;rpgReglerHasard(match,()=>{calls++;return .5;});before=JSON.stringify(match);
  const choix=rpgMobaChoisirMagieIA(match,'joueur');assert.equal(choix?.id,'lettre-de-marque');assert.ok(choix.score>=35);assert.equal(JSON.stringify(match),before);assert.equal(calls,0);
});

test('Abordage MOBA : les renforts et interdits temporaires expirent en cale', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=20;
  const victim=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;
  duel.sorcier.main=['mur-de-boucliers'];duel.sorcier.mana.neige=20;assert.equal(rpgMobaLancerMagie(duel,'sorcier','mur-de-boucliers').ok,true);
  victim.gelToursRestants=1;victim.infiltration=true;victim.infiltrationTour=true;
  rpgFinDeTour(duel); // own-turn buff and freeze expire here; add a fresh buff in the capturing turn
  duel.joueur.main=['haut-fond'];duel.joueur.mana.eau=20;assert.equal(rpgMobaLancerMagie(duel,'joueur','haut-fond',victim.id).ok,true);
  const temporary=victim.atk;assert.ok(temporary<1);
  duel.joueur.prochaineArriveeAbordage=true;duel.joueur.main=['gardien-de-la-porte-ardente'];duel.joueur.mana.braise=20;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','gardien-de-la-porte-ardente','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const capteur=rpgMobaPasserCreature(duel,'sorcier').entite;assert.equal(rpgMobaResoudreArrivee(duel,'joueur',victim.id).ok,true);
  assert.equal(victim.atk,temporary);rpgFinDeTour(duel);assert.equal(victim.atk,1);
  capteur.pv=capteur.def=1;duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=20;
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',capteur.id).ok,true);assert.equal(victim.atk,1);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Abordage MOBA : héros, ténacité et seuil filtrent la prise sans mutation', async () => {
  const {rpgMobaCiblesPrise}=await import('../src/games/rpgMobaLocal.js');
  const {duel,victime,capteur}=fixturePrise();const before=JSON.stringify(duel);
  assert.deepEqual(rpgMobaCiblesPrise(duel,'joueur'),[victime.id]);assert.equal(rpgMobaResoudreArrivee(duel,'joueur',capteur.id).raison,'cible');assert.equal(JSON.stringify(duel),before);
  victime.tenaciteDisponible=true;assert.deepEqual(rpgMobaCiblesPrise(duel,'joueur'),[]);assert.equal(rpgMobaResoudreArrivee(duel,'joueur',victime.id).raison,'cible');
  victime.tenaciteDisponible=false;victime.carteId='tarek';assert.deepEqual(rpgMobaCiblesPrise(duel,'joueur'),[]);
  victime.carteId='gardienne-des-portes-de-sable';duel.arriveeEnAttente.abordage=1;assert.deepEqual(rpgMobaCiblesPrise(duel,'joueur'),[]);
});

test('Lettre MOBA directe : capture automatique sans fenêtre optionnelle', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=20;
  const victim=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['lettre-de-marque','gardien-de-la-porte-ardente'];duel.joueur.mana.sable=20;duel.joueur.mana.eau=20;duel.joueur.mana.braise=20;
  assert.equal(rpgMobaLancerMagie(duel,'joueur','lettre-de-marque').ok,true);
  const result=rpgMobaJouerCreature(duel,'joueur','gardien-de-la-porte-ardente','left',0);assert.equal(result.ok,true);
  assert.equal(result.entite.enCale.entite.id,victim.id);assert.equal(duel.arriveeEnAttente,null);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Abordage MOBA : l’aura d’une prise disparaît avant la seconde cible d’arrivée', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.mana.braise=20;duel.sorcier.mana.sable=20;
  duel.sorcier.main=['kenshi-de-la-forge','gardienne-des-portes-de-sable'];
  const aura=rpgMobaJouerCreature(duel,'sorcier','kenshi-de-la-forge','left',0).entite;
  const other=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',1).entite;assert.equal(other.atk,2);
  rpgFinDeTour(duel);duel.joueur.prochaineArriveeAbordage=true;duel.joueur.main=['maitre-du-marteau'];duel.joueur.mana.neige=20;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','maitre-du-marteau','right',0,{ouvrirReponse:true}).creatureEnAttente,true);
  assert.equal(rpgMobaPasserCreature(duel,'sorcier').arriveeEnAttente,true);
  assert.equal(rpgMobaResoudreArrivee(duel,'joueur',aura.id).ok,true);assert.equal(other.atk,1);assert.ok(duel.arriveeEnAttente);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Abordage MOBA : gel et infiltration expirent pendant la détention', () => {
  const {duel,victime}=fixturePrise();victime.gelToursRestants=1;victime.infiltrationTour=true;victime.infiltration=true;
  assert.equal(rpgMobaResoudreArrivee(duel,'joueur',victime.id).ok,true);
  rpgFinDeTour(duel);assert.equal(victime.infiltrationTour,false);assert.equal(victime.infiltration,false);assert.equal(victime.gelToursRestants,1);
  rpgFinDeTour(duel);assert.equal(victime.gelToursRestants,0);
});

test('Abordage MOBA : victoire pendant la réponse libère la cale sans relancer le sort', () => {
  const {duel,victime,capteur}=fixturePrise();assert.equal(rpgMobaResoudreArrivee(duel,'joueur',victime.id).ok,true);
  // The defender already controls the central lane and can conquer the
  // captor's lane as a response to the paid reinforcement.
  mobaInfliger(duel.moba,'sorcier','center',10);mobaInfliger(duel.moba,'sorcier','left',7);
  duel.joueur.main=['le-grand-debarquement'];duel.joueur.mana.sable=20;duel.joueur.mana.eau=20;
  duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=20;
  assert.equal(rpgMobaLancerMagie(duel,'joueur','le-grand-debarquement',null,null,null,{ouvrirReponse:true}).sortEnAttente,true);
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise','sorcier','left').ok,true);
  assert.equal(duel.moba.winner,'sorcier');assert.equal(duel.mobaSortEnAttente,null);assert.ok(duel.sorcier.main.includes(victime.carteId));
  assert.equal(duel.joueur.cimetiere.filter(id=>id==='le-grand-debarquement').length,1);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Abordage MOBA : le jeton peut revenir dans sa voie à la mort du capteur', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['tarek'];duel.sorcier.mana.sable=20;
  assert.equal(rpgMobaJouerCreature(duel,'sorcier','tarek','right',0).ok,true);const token=duel.sorcier.creatures.find(e=>e.jeton&&e.mobaLane==='right');
  rpgFinDeTour(duel);duel.joueur.prochaineArriveeAbordage=true;duel.joueur.main=['gardien-de-la-porte-ardente'];duel.joueur.mana.braise=20;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','gardien-de-la-porte-ardente','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const captor=rpgMobaPasserCreature(duel,'sorcier').entite;assert.equal(rpgMobaResoudreArrivee(duel,'joueur',token.id).ok,true);
  captor.pv=captor.def=1;duel.tour='sorcier';duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=20;
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',captor.id).ok,true);assert.ok(duel.sorcier.creatures.some(e=>e.id===token.id));
  assert.equal(mobaVoie(duel.moba,'right').slots.sorcier[1],token.id);assert.ok(!duel.sorcier.main.includes(token.carteId));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Abordage MOBA : aucune prise légale ne masque une arrivée ciblée valide', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['jarl-au-marteau-de-guerre'];duel.sorcier.mana.neige=20;
  const enemy=rpgMobaJouerCreature(duel,'sorcier','jarl-au-marteau-de-guerre','right',0).entite;rpgFinDeTour(duel);
  duel.joueur.prochaineArriveeAbordage=true;duel.joueur.main=['sonneur-fele'];duel.joueur.mana.eau=20;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','sonneur-fele','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const result=rpgMobaPasserCreature(duel,'sorcier');assert.equal(result.arriveeEnAttente,true);assert.equal(duel.arriveeEnAttente.abordage,undefined);
  assert.equal(rpgMobaResoudreArrivee(duel,'joueur',enemy.id).ok,true);assert.ok(duel.sorcier.main.includes(enemy.carteId));assert.equal(rpgMobaPlacementCoherent(duel),true);
});


test('Toutes les magies du catalogue de duel sont couvertes par le vivier MOBA audité', () => {
  assert.deepEqual(RPG_MAGIE_CARDS.filter((carte) => !MOBA_CARTES_AUTORISEES.includes(carte.id)).map((carte) => carte.id), []);
});

test('Grand Débarquement MOBA : le capteur renforcé combat et son Overkill frappe sa voie', () => {
  const {duel,victime,capteur}=fixturePrise();assert.equal(rpgMobaResoudreArrivee(duel,'joueur',victime.id).ok,true);
  duel.tour='sorcier';duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=20;
  const bloqueur=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;bloqueur.pv=bloqueur.def=1;
  duel.tour='joueur';capteur.ready=true;duel.joueur.main=['le-grand-debarquement'];duel.joueur.mana.sable=20;duel.joueur.mana.eau=20;
  assert.equal(rpgMobaLancerMagie(duel,'joueur','le-grand-debarquement').ok,true);
  const result=rpgMobaLancerAttaque(duel,'joueur',[capteur.id],{[capteur.id]:[bloqueur.id]});assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(mobaVoie(duel.moba,'left').hp.sorcier,10-(capteur.atk-1));assert.equal(capteur.enCale.entite.id,victime.id);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for (const [id,seuil] of [['rais-de-la-galiote',1],['cotre-de-course',2],['galion-de-la-flotte',4],['la-vengeance-de-la-reine-anne',3]]) {
  for(const side of ['joueur','sorcier']) test(`Abordage imprimé MOBA : ${id} choisit sa prise pour ${side}`, async () => {
    const {rpgMobaCiblesPrise}=await import('../src/games/rpgMobaLocal.js');const duel=partie();const adversaire=side==='joueur'?'sorcier':'joueur';
    if(adversaire==='sorcier')rpgFinDeTour(duel);duel[adversaire].main=['mousse-des-galiotes','jarl-au-marteau-de-guerre'];duel[adversaire].mana.sable=20;duel[adversaire].mana.neige=20;
    const proie=rpgMobaJouerCreature(duel,adversaire,'mousse-des-galiotes','right',0).entite;
    const tropChere=rpgMobaJouerCreature(duel,adversaire,'jarl-au-marteau-de-guerre','center',0).entite;rpgFinDeTour(duel);
    duel[side].main=[id];duel[side].mana.sable=20;duel[side].mana.eau=20;
    assert.equal(rpgMobaJouerCreature(duel,side,id,'left',0,{ouvrirReponse:true}).creatureEnAttente,true);
    const result=rpgMobaPasserCreature(duel,adversaire);assert.equal(result.arriveeEnAttente,true,JSON.stringify(result));assert.equal(duel.arriveeEnAttente.abordage,seuil);
    assert.deepEqual(rpgMobaCiblesPrise(duel,side),[proie.id]);const before=JSON.stringify(duel);
    assert.equal(rpgMobaResoudreArrivee(duel,side,tropChere.id).raison,'cible');assert.equal(JSON.stringify(duel),before);
    assert.equal(rpgMobaResoudreArrivee(duel,side,proie.id).ok,true);assert.equal(result.entite.enCale.entite.id,proie.id);
    if(id==='cotre-de-course') assert.equal(result.entite.ready,true);
    if(id==='la-vengeance-de-la-reine-anne'){assert.equal(result.entite.atk,4);assert.equal(result.entite.butin,true);}
    assert.equal(rpgMobaPlacementCoherent(duel),true);
  });
}

test('Négociants MOBA : chaque camp pioche une fois par prise, sans fatigue', () => {
  const duel=partie();duel.joueur.main=['negociant-des-ranscons'];duel.joueur.mana.sable=20;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','negociant-des-ranscons','center',0).ok,true);
  rpgFinDeTour(duel);duel.sorcier.main=['negociant-des-ranscons','mousse-des-galiotes'];duel.sorcier.mana.sable=20;
  assert.equal(rpgMobaJouerCreature(duel,'sorcier','negociant-des-ranscons','center',0).ok,true);
  const proie=rpgMobaJouerCreature(duel,'sorcier','mousse-des-galiotes','right',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['rais-de-la-galiote'];duel.joueur.mana.sable=20;duel.joueur.mana.eau=20;duel.joueur.deck=['verglas'];duel.sorcier.deck=['verglas'];
  assert.equal(rpgMobaJouerCreature(duel,'joueur','rais-de-la-galiote','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  assert.equal(rpgMobaPasserCreature(duel,'sorcier').arriveeEnAttente,true);
  assert.equal(rpgMobaResoudreArrivee(duel,'joueur',proie.id).ok,true);assert.deepEqual(duel.joueur.deck,[]);assert.deepEqual(duel.sorcier.deck,[]);
  assert.ok(duel.joueur.main.includes('verglas'));assert.ok(duel.sorcier.main.includes('verglas'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Galion MOBA : Cargaison pioche à la capture et à la mort en combat', () => {
  for(const mode of ['prise','combat']) {
    const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['galion-de-la-flotte'];duel.sorcier.mana.sable=20;duel.sorcier.mana.eau=20;
    const galion=rpgMobaJouerCreature(duel,'sorcier','galion-de-la-flotte','left',0).entite;rpgFinDeTour(duel);duel.sorcier.deck=['verglas'];
    if(mode==='prise') {
      duel.joueur.main=['lettre-de-marque','jarl-au-marteau-de-guerre'];duel.joueur.mana.sable=20;duel.joueur.mana.eau=20;duel.joueur.mana.neige=20;
      // Cost 5 boarding needs full threshold for a cost-5 Galion.
      duel.joueur.prochaineArriveeAbordage=true;duel.joueur.prochaineArriveeAbordageSeuilPlein=true;
      assert.equal(rpgMobaJouerCreature(duel,'joueur','jarl-au-marteau-de-guerre','right',0,{ouvrirReponse:true}).creatureEnAttente,true);
      assert.equal(rpgMobaPasserCreature(duel,'sorcier').arriveeEnAttente,true);assert.equal(rpgMobaResoudreArrivee(duel,'joueur',galion.id).ok,true);
    } else {
      duel.joueur.main=['jarl-au-marteau-de-guerre'];duel.joueur.mana.neige=20;
      const attacker=rpgMobaJouerCreature(duel,'joueur','jarl-au-marteau-de-guerre','left',0).entite;attacker.ready=true;galion.pv=galion.def=1;
      assert.equal(rpgMobaLancerAttaque(duel,'joueur',[attacker.id],{[attacker.id]:[galion.id]}).ok,true);
    }
    assert.deepEqual(duel.sorcier.deck,[],mode);assert.ok(duel.sorcier.main.includes('verglas'),mode);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Chasseur MOBA : Traque et Prime sur navire, pas sur une créature ordinaire', () => {
  for (const id of ['galion-de-la-flotte','gardienne-des-portes-de-sable']) {
    const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=[id];duel.sorcier.mana.sable=20;duel.sorcier.mana.eau=20;
    const cible=rpgMobaJouerCreature(duel,'sorcier',id,'left',0).entite;rpgFinDeTour(duel);
    duel.joueur.main=['le-chasseur-d-ocracoke'];duel.joueur.mana.sable=20;duel.joueur.mana.eau=20;
    const chasseur=rpgMobaJouerCreature(duel,'joueur','le-chasseur-d-ocracoke','left',0).entite;duel.joueur.deck=['verglas'];
    const result=rpgMobaLancerAttaque(duel,'joueur',[chasseur.id],{}, {ciblesAttaque:{[chasseur.id]:cible.id}});
    assert.equal(result.ok,true,JSON.stringify(result));
    assert.equal(duel.sorcier.creatures.includes(cible),id!=='galion-de-la-flotte');
    assert.equal(duel.joueur.main.includes('verglas'),id==='galion-de-la-flotte');
    assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Lien du Chasseur : Lettre MOBA prend une créature au coût plein', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['jarl-au-marteau-de-guerre'];duel.sorcier.mana.neige=20;
  const proie=rpgMobaJouerCreature(duel,'sorcier','jarl-au-marteau-de-guerre','right',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['le-chasseur-d-ocracoke','lettre-de-marque','jarl-au-marteau-de-guerre'];duel.joueur.mana.sable=20;duel.joueur.mana.eau=20;duel.joueur.mana.neige=20;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','le-chasseur-d-ocracoke','center',0).ok,true);
  assert.equal(rpgMobaLancerMagie(duel,'joueur','lettre-de-marque',null,null,null,{ouvrirReponse:true}).sortEnAttente,true);
  assert.equal(rpgMobaPasserSort(duel,'sorcier').ok,true);assert.equal(duel.joueur.prochaineArriveeAbordageSeuilPlein,true);
  assert.equal(rpgMobaJouerCreature(duel,'joueur','jarl-au-marteau-de-guerre','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const capteur=rpgMobaPasserCreature(duel,'sorcier').entite;assert.equal(duel.arriveeEnAttente.abordage,5);
  assert.equal(rpgMobaResoudreArrivee(duel,'joueur',proie.id).ok,true);assert.equal(capteur.enCale.entite.id,proie.id);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('MOBA : jeton tué en combat simultané ne rejoint pas le cimetière', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['tarek'];duel.sorcier.mana.sable=20;
  assert.equal(rpgMobaJouerCreature(duel,'sorcier','tarek','left',0).ok,true);const token=duel.sorcier.creatures.find(e=>e.jeton);assert.ok(token);
  rpgFinDeTour(duel);duel.joueur.main=['jarl-au-marteau-de-guerre'];duel.joueur.mana.neige=20;
  const attaquant=rpgMobaJouerCreature(duel,'joueur','jarl-au-marteau-de-guerre','left',0).entite;attaquant.ready=true;
  assert.equal(rpgMobaLancerAttaque(duel,'joueur',[attaquant.id],{[attaquant.id]:[token.id]}).ok,true);
  assert.ok(!duel.sorcier.creatures.includes(token));assert.ok(!duel.sorcier.cimetiere.includes(token.carteId));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Vengeance MOBA : Butin de cale comble se déclenche même si le coup conquiert la voie', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['mousse-des-galiotes'];duel.sorcier.mana.sable=20;
  const victime=rpgMobaJouerCreature(duel,'sorcier','mousse-des-galiotes','right',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['la-vengeance-de-la-reine-anne'];duel.joueur.mana.sable=20;duel.joueur.mana.eau=20;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','la-vengeance-de-la-reine-anne','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const navire=rpgMobaPasserCreature(duel,'sorcier').entite;assert.equal(rpgMobaResoudreArrivee(duel,'joueur',victime.id).ok,true);
  navire.ready=true;duel.joueur.deck=['verglas'];mobaInfliger(duel.moba,'joueur','left',7);
  const result=rpgMobaLancerAttaque(duel,'joueur',[navire.id]);assert.equal(result.ok,true,JSON.stringify(result));
  assert.ok(duel.joueur.main.includes('verglas'));assert.ok(duel.joueur.defausseEnAttente||duel.defausseEnAttente);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Abordage imprimé : seuil propre prioritaire sur la Lettre, appel direct et retour de prise', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable','jarl-au-marteau-de-guerre'];duel.sorcier.mana.sable=20;duel.sorcier.mana.neige=20;
  const prise=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;
  const tropChere=rpgMobaJouerCreature(duel,'sorcier','jarl-au-marteau-de-guerre','center',0).entite;rpgFinDeTour(duel);
  duel.joueur.prochaineArriveeAbordage=true;duel.joueur.prochaineArriveeAbordageSeuilPlein=true;duel.joueur.main=['cotre-de-course'];duel.joueur.mana.sable=20;duel.joueur.mana.eau=20;
  const capteur=rpgMobaJouerCreature(duel,'joueur','cotre-de-course','left',0).entite;
  assert.ok(!duel.arriveeEnAttente);assert.equal(capteur.enCale.entite.id,prise.id);assert.ok(duel.sorcier.creatures.includes(tropChere));
  duel.sorcier.main=['eclair-du-marteau'];duel.sorcier.mana.neige=20;capteur.pv=1;
  assert.equal(rpgMobaTerminerTour(duel,'joueur').reponse,'sorcier');assert.equal(rpgMobaLancerMagie(duel,'sorcier','eclair-du-marteau',capteur.id).ok,true);
  assert.ok(duel.sorcier.creatures.includes(prise));assert.equal(prise.mobaLane,'right');assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('IA MOBA : la Traque est prise en compte dans le choix de cible du Chasseur', async () => {
  const {rpgMobaChoisirCiblesAttaqueIA}=await import('../src/games/rpgMobaAI.js');
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['galion-de-la-flotte','jarl-au-marteau-de-guerre'];duel.sorcier.mana.sable=20;duel.sorcier.mana.eau=20;duel.sorcier.mana.neige=20;
  const galion=rpgMobaJouerCreature(duel,'sorcier','galion-de-la-flotte','left',0).entite;
  const jarl=rpgMobaJouerCreature(duel,'sorcier','jarl-au-marteau-de-guerre','left',1).entite;rpgFinDeTour(duel);
  duel.joueur.main=['le-chasseur-d-ocracoke'];duel.joueur.mana.sable=20;duel.joueur.mana.eau=20;
  const chasseur=rpgMobaJouerCreature(duel,'joueur','le-chasseur-d-ocracoke','left',0).entite;
  const before=JSON.stringify(duel);assert.equal(rpgMobaChoisirCiblesAttaqueIA(duel,'joueur',[chasseur.id])[chasseur.id],galion.id);assert.equal(JSON.stringify(duel),before);
  assert.ok(duel.sorcier.creatures.includes(jarl));
});

test('Chasseur MOBA : Prime reconnaît une cale occupée avant sa libération', () => {
  const duel=partie();duel.joueur.main=['mousse-des-galiotes'];duel.joueur.mana.sable=20;
  const proie=rpgMobaJouerCreature(duel,'joueur','mousse-des-galiotes','right',0).entite;rpgFinDeTour(duel);
  duel.sorcier.prochaineArriveeAbordage=true;duel.sorcier.main=['gardien-de-la-porte-ardente'];duel.sorcier.mana.braise=20;
  const capteur=rpgMobaJouerCreature(duel,'sorcier','gardien-de-la-porte-ardente','left',0).entite;assert.equal(capteur.enCale.entite.id,proie.id);
  rpgFinDeTour(duel);duel.joueur.main=['le-chasseur-d-ocracoke'];duel.joueur.mana.sable=20;duel.joueur.mana.eau=20;
  const chasseur=rpgMobaJouerCreature(duel,'joueur','le-chasseur-d-ocracoke','left',0).entite;duel.joueur.deck=['verglas'];
  assert.equal(rpgMobaLancerAttaque(duel,'joueur',[chasseur.id],{}, {ciblesAttaque:{[chasseur.id]:capteur.id}}).ok,true);
  assert.ok(duel.joueur.creatures.includes(proie));assert.ok(!duel.sorcier.creatures.includes(capteur));assert.ok(duel.joueur.main.includes('verglas'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for (const side of ['joueur','sorcier']) test(`Cavalier des dunes MOBA : Heures et renfort permanent pour ${side}`, () => {
  const duel=partie();if(side==='sorcier')rpgFinDeTour(duel);
  duel[side].main=['le-cavalier-des-dunes-gelees','gardienne-des-portes-de-sable'];duel[side].mana.sable=30;duel[side].mana.neige=30;
  const ally=rpgMobaJouerCreature(duel,side,'gardienne-des-portes-de-sable','right',0).entite;
  const rider=rpgMobaJouerCreature(duel,side,'le-cavalier-des-dunes-gelees','left',0).entite;assert.equal(rider.heures.restants,2);
  const stats=[rider.atk,rider.pvMax,ally.atk,ally.pvMax];rpgFinDeTour(duel);rpgFinDeTour(duel);
  assert.equal(rider.heures.restants,1);assert.deepEqual([rider.atk,rider.pvMax,ally.atk,ally.pvMax],stats);
  rpgFinDeTour(duel);rpgFinDeTour(duel);assert.equal(rider.heures,null);
  assert.deepEqual([rider.atk,rider.pvMax,ally.atk,ally.pvMax],stats.map(n=>n+1));
  rpgFinDeTour(duel);rpgFinDeTour(duel);assert.deepEqual([rider.atk,rider.pvMax,ally.atk,ally.pvMax],stats.map(n=>n+1));
  assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for (const side of ['joueur','sorcier']) test(`Cavalier du ressac gelé MOBA : gel adverse protégé et expiration pour ${side}`, () => {
  const duel=partie(),adv=side==='joueur'?'sorcier':'joueur';if(adv==='sorcier')rpgFinDeTour(duel);
  duel[adv].main=['gardienne-des-portes-de-sable','gardienne-des-portes-de-sable'];duel[adv].mana.sable=30;
  const victim=rpgMobaJouerCreature(duel,adv,'gardienne-des-portes-de-sable','right',0).entite;
  const shielded=rpgMobaJouerCreature(duel,adv,'gardienne-des-portes-de-sable','center',0).entite;shielded.bouclier=1;rpgFinDeTour(duel);
  duel[side].main=['le-cavalier-du-ressac-gele'];duel[side].mana.neige=30;duel[side].mana.eau=30;
  const rider=rpgMobaJouerCreature(duel,side,'le-cavalier-du-ressac-gele','left',0).entite;
  assert.ok(victim.gelToursRestants>0);assert.ok(!(shielded.gelToursRestants>0));assert.equal(shielded.bouclier,0);assert.ok(!(rider.gelToursRestants>0));
  victim.ready=true;assert.equal(rpgPeutAttaquer(victim),false);rpgFinDeTour(duel);rpgFinDeTour(duel);
  assert.equal(rpgPeutAttaquer(victim),true);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for (const side of ['joueur','sorcier']) test(`Cavalier du cimetière MOBA : Tribut, mort et retour dans sa voie pour ${side}`, () => {
  const duel=partie();if(side==='sorcier')rpgFinDeTour(duel);const enemy=side==='joueur'?'sorcier':'joueur';
  duel[side].main=['le-cavalier-du-cimetiere'];duel[side].mana.sable=30;duel[side].mana.tenebres=30;
  const rider=rpgMobaJouerCreature(duel,side,'le-cavalier-du-cimetiere','right',0).entite;rider.ready=true;
  mobaInfliger(duel.moba,enemy,'right',4);const hit=rpgMobaLancerAttaque(duel,side,[rider.id]);assert.equal(hit.ok,true);assert.equal(mobaVoie(duel.moba,'right').hp[enemy],4);assert.equal(mobaVoie(duel.moba,'right').hp[side],8);
  rider.pv=1;duel[side].main=['grand-hiver'];duel[side].mana.neige=30;assert.equal(rpgMobaLancerMagie(duel,side,'grand-hiver').ok,true);
  assert.equal(duel[side].retoursProgrammes[0].mobaLane,'right');
  for(let i=0;i<2;i++){rpgFinDeTour(duel);assert.ok(!duel[side].creatures.some(e=>e.carteId===rider.carteId));}
  rpgFinDeTour(duel);const returned=duel[side].creatures.find(e=>e.carteId===rider.carteId);
  assert.ok(returned);assert.equal(returned.mobaLane,'right');assert.equal(returned.tribut,2);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for (const side of ['joueur','sorcier']) test(`Cavalier du bûcher MOBA : mort en combat embrase les ennemis de ${side}`, () => {
  const duel=partie(),adv=side==='joueur'?'sorcier':'joueur';if(adv==='sorcier')rpgFinDeTour(duel);
  duel[adv].main=['jarl-au-marteau-de-guerre','gardienne-des-portes-de-sable'];duel[adv].mana.neige=30;duel[adv].mana.sable=30;
  const blocker=rpgMobaJouerCreature(duel,adv,'jarl-au-marteau-de-guerre','left',0).entite;
  const distant=rpgMobaJouerCreature(duel,adv,'gardienne-des-portes-de-sable','right',0).entite;rpgFinDeTour(duel);
  duel[side].main=['le-cavalier-du-bucher','gardienne-des-portes-de-sable'];duel[side].mana.braise=30;duel[side].mana.tenebres=30;duel[side].mana.sable=30;
  const rider=rpgMobaJouerCreature(duel,side,'le-cavalier-du-bucher','left',0).entite;const ally=rpgMobaJouerCreature(duel,side,'gardienne-des-portes-de-sable','center',0).entite;
  const result=rpgMobaLancerAttaque(duel,side,[rider.id],{[rider.id]:[blocker.id]});assert.equal(result.ok,true,JSON.stringify(result));
  assert.ok(!duel[side].creatures.includes(rider));assert.equal(distant.pv,2);assert.equal(ally.pv,4);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for (const side of ['joueur','sorcier']) test(`Cavalier sans nom MOBA : cible bornée et pioche pour ${side}`, () => {
  const duel=partie(),adv=side==='joueur'?'sorcier':'joueur';if(adv==='sorcier')rpgFinDeTour(duel);
  duel[adv].main=['gardienne-des-portes-de-sable','jarl-au-marteau-de-guerre'];duel[adv].mana.sable=30;duel[adv].mana.neige=30;
  const target=rpgMobaJouerCreature(duel,adv,'gardienne-des-portes-de-sable','right',0).entite;
  const cher=rpgMobaJouerCreature(duel,adv,'jarl-au-marteau-de-guerre','center',0).entite;rpgFinDeTour(duel);
  duel[side].main=['le-cavalier-sans-nom'];duel[side].mana.eau=30;duel[side].mana.tenebres=30;duel[side].deck=['verglas'];
  assert.equal(rpgMobaJouerCreature(duel,side,'le-cavalier-sans-nom','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  assert.equal(rpgMobaPasserCreature(duel,adv).arriveeEnAttente,true);const before=JSON.stringify(duel);
  assert.equal(rpgMobaResoudreArrivee(duel,side,cher.id).raison,'cible');assert.equal(JSON.stringify(duel),before);
  assert.equal(rpgMobaResoudreArrivee(duel,side,target.id).ok,true);assert.ok(duel[adv].main.includes(target.carteId));
  assert.ok(duel[side].main.includes('verglas'));assert.ok(duel[adv].creatures.includes(cher));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Cavalier sans nom MOBA : la pioche reste due sans cible, même après une prise', () => {
  for(const mode of ['aucune','prise']) {
    const duel=partie();let victim;
    if(mode==='prise') {rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;victim=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;rpgFinDeTour(duel);duel.joueur.prochaineArriveeAbordage=true;}
    duel.joueur.main=['le-cavalier-sans-nom'];duel.joueur.mana.eau=30;duel.joueur.mana.tenebres=30;duel.joueur.deck=['verglas'];
    assert.equal(rpgMobaJouerCreature(duel,'joueur','le-cavalier-sans-nom','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
    const result=rpgMobaPasserCreature(duel,'sorcier');assert.equal(result.ok,true,JSON.stringify(result));
    if(victim){assert.equal(result.arriveeEnAttente,true);assert.equal(rpgMobaResoudreArrivee(duel,'joueur',victim.id).ok,true);assert.equal(result.entite.enCale.entite.id,victim.id);}
    assert.ok(!duel.arriveeEnAttente);assert.deepEqual(duel.joueur.main,['verglas']);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Cavalier du cimetière : le retour attend dans sa voie pleine et ne suit pas une voie conquise', () => {
  for (const mode of ['pleine','conquise']) {
    const duel=partie();duel.joueur.main=['le-cavalier-du-cimetiere'];duel.joueur.mana.sable=30;duel.joueur.mana.tenebres=30;
    const rider=rpgMobaJouerCreature(duel,'joueur','le-cavalier-du-cimetiere','right',0).entite;rider.pv=1;
    duel.joueur.main=['grand-hiver'];duel.joueur.mana.neige=30;assert.equal(rpgMobaLancerMagie(duel,'joueur','grand-hiver').ok,true);
    if(mode==='pleine') {duel.joueur.main=['gardienne-des-portes-de-sable','gardienne-des-portes-de-sable'];assert.ok(rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).ok);assert.ok(rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',1).ok);}
    else { mobaInfliger(duel.moba,'sorcier','right',10); }
    for(let i=0;i<3;i++)rpgFinDeTour(duel);
    assert.ok(!duel.joueur.creatures.some(e=>e.carteId===rider.carteId));
    if(mode==='pleine')assert.equal(duel.joueur.retoursProgrammes[0].toursRestants,1);else assert.deepEqual(duel.joueur.retoursProgrammes,[]);
    assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Réanimation MOBA des cavaliers rejoue les arrivées et les Heures', () => {
  for(const id of ['le-cavalier-des-dunes-gelees','le-cavalier-du-ressac-gele','le-cavalier-sans-nom']) {
    const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable','jarl-au-marteau-de-guerre'];duel.sorcier.mana.sable=30;duel.sorcier.mana.neige=30;
    const legal=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;const cher=rpgMobaJouerCreature(duel,'sorcier','jarl-au-marteau-de-guerre','center',0).entite;rpgFinDeTour(duel);
    duel.joueur.cimetiere=[id];duel.joueur.main=['reanimation'];duel.joueur.mana.sable=30;duel.joueur.deck=['verglas'];
    const result=rpgMobaLancerMagie(duel,'joueur','reanimation',null,'left',null,{emplacementReanimation:0});assert.equal(result.ok,true,JSON.stringify(result));
    const rider=duel.joueur.creatures.find(e=>e.carteId===id);assert.ok(rider);assert.equal(rider.mobaLane,'left');
    if(id==='le-cavalier-des-dunes-gelees')assert.equal(rider.heures.restants,2);
    if(id==='le-cavalier-du-ressac-gele'){assert.ok(legal.gelToursRestants>0);assert.ok(cher.gelToursRestants>0);}
    if(id==='le-cavalier-sans-nom'){assert.ok(!duel.sorcier.creatures.includes(legal));assert.ok(duel.sorcier.creatures.includes(cher));assert.ok(duel.joueur.main.includes('verglas'));}
    assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('IA MOBA : le Cavalier sans nom choisit une cible légale sans toucher à la partie', async () => {
  const {rpgMobaChoisirArriveeIA}=await import('../src/games/rpgMobaAI.js');const duel=partie();
  duel.joueur.main=['jarl-au-marteau-de-guerre','gardienne-des-portes-de-sable'];duel.joueur.mana.sable=30;duel.joueur.mana.neige=30;
  const cher=rpgMobaJouerCreature(duel,'joueur','jarl-au-marteau-de-guerre','left',0).entite;
  const cible=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;rpgFinDeTour(duel);
  duel.sorcier.main=['le-cavalier-sans-nom'];duel.sorcier.mana.eau=30;duel.sorcier.mana.tenebres=30;
  assert.equal(rpgMobaJouerCreature(duel,'sorcier','le-cavalier-sans-nom','center',0,{ouvrirReponse:true}).creatureEnAttente,true);
  assert.equal(rpgMobaPasserCreature(duel,'joueur').arriveeEnAttente,true);
  let rng=0;rpgReglerHasard(duel,()=>{rng++;return .5;});const before=JSON.stringify(duel);
  assert.equal(rpgMobaChoisirArriveeIA(duel,'sorcier'),cible.id);assert.equal(JSON.stringify(duel),before);assert.equal(rng,0);
  assert.equal(rpgMobaResoudreArrivee(duel,'sorcier',cible.id).ok,true);assert.ok(duel.joueur.creatures.includes(cher));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Cavalier du bûcher : bouclier et parade colorée face à sa capacité', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable','gardienne-des-portes-de-sable','gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;
  const shield=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;shield.bouclier=1;
  const normal=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','center',0).entite;
  const protectedCreature=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['le-cavalier-du-bucher'];duel.joueur.mana.braise=30;duel.joueur.mana.tenebres=30;
  const rider=rpgMobaJouerCreature(duel,'joueur','le-cavalier-du-bucher','left',0).entite;rider.pv=1;
  duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=30;assert.equal(rpgMobaTerminerTour(duel,'joueur').reponse,'sorcier');protectedCreature.protection={contre:['braise']};
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',rider.id).ok,true);
  assert.equal(shield.pv,4);assert.equal(shield.bouclier,0);assert.equal(normal.pv,2);assert.equal(protectedCreature.pv,2);assert.deepEqual(protectedCreature.protection,{contre:['braise']});
  assert.ok(!duel.joueur.creatures.includes(rider));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Cavalier sans nom : la prise coûteuse précède la pioche sans cible de rebond', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['jarl-au-marteau-de-guerre'];duel.sorcier.mana.neige=30;
  const prise=rpgMobaJouerCreature(duel,'sorcier','jarl-au-marteau-de-guerre','right',0).entite;rpgFinDeTour(duel);
  duel.joueur.prochaineArriveeAbordage=true;duel.joueur.main=['le-cavalier-sans-nom'];duel.joueur.deck=['verglas'];duel.joueur.mana.eau=30;duel.joueur.mana.tenebres=30;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','le-cavalier-sans-nom','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  assert.equal(rpgMobaPasserCreature(duel,'sorcier').arriveeEnAttente,true);assert.deepEqual(duel.joueur.deck,['verglas']);
  assert.equal(rpgMobaResoudreArrivee(duel,'joueur',prise.id).ok,true);assert.deepEqual(duel.joueur.deck,[]);assert.deepEqual(duel.joueur.main,['verglas']);
  assert.equal(duel.arriveeEnAttente,null);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

function oniFixture(side='joueur', count=3) {
  const duel=partie(),enemy=side==='joueur'?'sorcier':'joueur';if(enemy==='sorcier')rpgFinDeTour(duel);
  duel[enemy].main=Array(count).fill('gardienne-des-portes-de-sable');duel[enemy].mana.sable=30;
  const places=[['left',0],['center',0],['right',0]];
  const targets=Array.from({length:count},(_,i)=>rpgMobaJouerCreature(duel,enemy,'gardienne-des-portes-de-sable',...places[i]).entite);
  rpgFinDeTour(duel);duel[side].main=['oni-de-la-fournaise'];duel[side].mana.braise=30;
  return {duel,side,enemy,targets};
}
for (const side of ['joueur','sorcier']) test(`Oni MOBA : deux cibles choisies, réservation réversible pour ${side}`, () => {
  const {duel,enemy,targets:[a,b,c]}=oniFixture(side);const initial=[a.pv,b.pv,c.pv];
  assert.equal(rpgMobaJouerCreature(duel,side,'oni-de-la-fournaise','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  assert.equal(rpgMobaPasserCreature(duel,enemy).arriveeEnAttente,true);
  const before=JSON.stringify(duel);assert.equal(rpgMobaResoudreArrivee(duel,side,'inconnu').raison,'cible');assert.equal(JSON.stringify(duel),before);
  assert.equal(rpgMobaResoudreArrivee(duel,side,a.id).arriveeEnAttente,true);assert.equal(duel.arriveeEnAttente.cibleOni,a.id);
  assert.deepEqual([a.pv,b.pv,c.pv],initial);assert.equal(rpgMobaTerminerTour(duel,side).raison,'timing');
  assert.equal(rpgMobaResoudreArrivee(duel,side,a.id).arriveeEnAttente,true);assert.equal(duel.arriveeEnAttente.cibleOni,undefined);
  assert.equal(rpgMobaResoudreArrivee(duel,side,b.id).arriveeEnAttente,true);assert.equal(rpgMobaResoudreArrivee(duel,side,c.id).ok,true);
  assert.equal(a.pv,4);assert.equal(b.pv,1);assert.equal(c.pv,1);assert.equal(duel.arriveeEnAttente,null);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for (const index of [0,1]) test(`Oni MOBA : parade individuelle sur cible ${index+1}`, () => {
  const {duel,side,enemy,targets:[a,b]}=oniFixture('joueur',2);[a,b][index].bouclier=1;
  assert.equal(rpgMobaJouerCreature(duel,side,'oni-de-la-fournaise','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  assert.equal(rpgMobaPasserCreature(duel,enemy).arriveeEnAttente,true);assert.equal(rpgMobaResoudreArrivee(duel,side,a.id).ok,true);
  assert.equal(rpgMobaResoudreArrivee(duel,side,b.id).ok,true);assert.equal(a.pv,index===0?4:1);assert.equal(b.pv,index===1?4:1);
  assert.equal([a,b][index].bouclier,0);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Oni MOBA : une cible unique ou aucune cible, sans attente bloquante', () => {
  for(const n of [0,1]) {
    const {duel,side,enemy,targets}=oniFixture('joueur',n);assert.equal(rpgMobaJouerCreature(duel,side,'oni-de-la-fournaise','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
    const result=rpgMobaPasserCreature(duel,enemy);assert.equal(Boolean(result.arriveeEnAttente),n===1);
    if(n) {assert.equal(rpgMobaResoudreArrivee(duel,side,targets[0].id).ok,true);assert.equal(targets[0].pv,1);}
    assert.equal(duel.arriveeEnAttente,null);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Oni et Lettre MOBA : la prise précède les deux choix des cibles restantes', () => {
  const {duel,side,enemy,targets:[prise,a,b]}=oniFixture('joueur');duel.joueur.prochaineArriveeAbordage=true;
  assert.equal(rpgMobaJouerCreature(duel,side,'oni-de-la-fournaise','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const oni=rpgMobaPasserCreature(duel,enemy).entite;assert.ok(Number.isFinite(duel.arriveeEnAttente.abordage));
  assert.equal(rpgMobaResoudreArrivee(duel,side,prise.id).ok,true);assert.equal(oni.enCale.entite.id,prise.id);assert.equal(prise.pv,4);
  assert.equal(rpgMobaResoudreArrivee(duel,side,a.id).arriveeEnAttente,true);assert.equal(rpgMobaResoudreArrivee(duel,side,b.id).ok,true);
  assert.equal(a.pv,1);assert.equal(b.pv,1);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Oni MOBA : Lien Feux de kitsune avec une véritable ancre', () => {
  const {duel,side,enemy,targets:[a,b]}=oniFixture('joueur',2);a.pv=a.pvMax=10;b.pv=b.pvMax=10;
  assert.equal(rpgMobaJouerCreature(duel,side,'oni-de-la-fournaise','center',0,{ouvrirReponse:true}).creatureEnAttente,true);
  assert.equal(rpgMobaPasserCreature(duel,enemy).arriveeEnAttente,true);assert.equal(rpgMobaResoudreArrivee(duel,side,a.id).arriveeEnAttente,true);
  assert.equal(rpgMobaResoudreArrivee(duel,side,b.id).ok,true);duel.joueur.main=['feux-de-kitsune'];duel.joueur.mana.braise=30;
  assert.equal(rpgMobaLancerMagie(duel,side,'feux-de-kitsune',a.id,null,null,{ouvrirReponse:true,cibleSecondaireId:b.id}).sortEnAttente,true);
  assert.equal(rpgMobaPasserSort(duel,enemy).ok,true);assert.equal(a.pv,4);assert.equal(b.pv,4);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Réanimation MOBA : Oni choisit automatiquement deux cibles légales', () => {
  const {duel,side,targets:[a,b,c]}=oniFixture('joueur',3);a.pv=a.pvMax=10;b.pv=b.pvMax=10;c.pv=c.pvMax=10;a.bouclier=1;
  duel.joueur.cimetiere=['oni-de-la-fournaise'];duel.joueur.main=['reanimation'];duel.joueur.mana.sable=30;
  assert.equal(rpgMobaLancerMagie(duel,side,'reanimation',null,'right',null,{emplacementReanimation:0}).ok,true);
  assert.equal(a.pv,10);assert.equal(a.bouclier,0);assert.equal(b.pv,7);assert.equal(c.pv,10);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('IA MOBA : Oni choisit deux cibles distinctes sans mutation pendant les sondages', async () => {
  const {rpgMobaChoisirArriveeIA}=await import('../src/games/rpgMobaAI.js');const {duel,side,enemy,targets}=oniFixture('sorcier');
  targets[0].pv=1;targets[1].pv=2;targets[2].pv=4;targets[2].bouclier=1;
  assert.equal(rpgMobaJouerCreature(duel,side,'oni-de-la-fournaise','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  assert.equal(rpgMobaPasserCreature(duel,enemy).arriveeEnAttente,true);
  let appels=0;rpgReglerHasard(duel,()=>{appels++;return .5;});const before=JSON.stringify(duel);
  const premier=rpgMobaChoisirArriveeIA(duel,side);assert.ok([targets[0].id,targets[1].id].includes(premier));assert.equal(JSON.stringify(duel),before);assert.equal(appels,0);
  assert.equal(rpgMobaResoudreArrivee(duel,side,premier).arriveeEnAttente,true);
  const apres=JSON.stringify(duel),second=rpgMobaChoisirArriveeIA(duel,side);assert.deepEqual(new Set([premier,second]),new Set([targets[0].id,targets[1].id]));assert.equal(JSON.stringify(duel),apres);assert.equal(appels,0);
  assert.equal(rpgMobaResoudreArrivee(duel,side,second).ok,true);assert.ok(!duel.joueur.creatures.includes(targets[0]));assert.ok(!duel.joueur.creatures.includes(targets[1]));assert.equal(targets[2].pv,4);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Oni : le Lien disparaît si sa source est renvoyée avant la résolution des Feux', () => {
  const {duel,side,enemy,targets:[a,b]}=oniFixture('joueur',2);a.pv=a.pvMax=b.pv=b.pvMax=10;
  assert.equal(rpgMobaJouerCreature(duel,side,'oni-de-la-fournaise','center',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const oni=rpgMobaPasserCreature(duel,enemy).entite;assert.equal(rpgMobaResoudreArrivee(duel,side,a.id).arriveeEnAttente,true);assert.equal(rpgMobaResoudreArrivee(duel,side,b.id).ok,true);
  duel.joueur.main=['feux-de-kitsune'];duel.joueur.mana.braise=30;duel.sorcier.main=['ressac'];duel.sorcier.mana.eau=30;
  assert.equal(rpgMobaLancerMagie(duel,side,'feux-de-kitsune',a.id,null,null,{ouvrirReponse:true,cibleSecondaireId:b.id}).sortEnAttente,true);
  assert.equal(rpgMobaLancerMagie(duel,enemy,'ressac',oni.id).ok,true);assert.equal(rpgMobaPasserSort(duel,enemy).ok,true);
  assert.equal(a.pv,5);assert.equal(b.pv,5);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Oni : si la seconde cible contre-attaque, elle riposte même si la première est protégée', () => {
  const {duel,side,enemy,targets:[a,b]}=oniFixture('joueur',2);a.bouclier=1;b.contreAttaque=true;b.atk=2;
  assert.equal(rpgMobaJouerCreature(duel,side,'oni-de-la-fournaise','center',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const oni=rpgMobaPasserCreature(duel,enemy).entite;assert.equal(rpgMobaResoudreArrivee(duel,side,a.id).arriveeEnAttente,true);
  assert.equal(rpgMobaResoudreArrivee(duel,side,b.id).ok,true);assert.equal(a.pv,4);assert.equal(b.pv,1);assert.equal(oni.pv,3);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for (const side of ['joueur','sorcier']) test(`Cavalier de vapeur MOBA : dégâts ciblés à l'arrivée de ${side}`, () => {
  const duel=partie(),enemy=side==='joueur'?'sorcier':'joueur';if(enemy==='sorcier')rpgFinDeTour(duel);
  duel[enemy].main=['gardienne-des-portes-de-sable','gardienne-des-portes-de-sable'];duel[enemy].mana.sable=30;
  const a=rpgMobaJouerCreature(duel,enemy,'gardienne-des-portes-de-sable','right',0).entite;
  const b=rpgMobaJouerCreature(duel,enemy,'gardienne-des-portes-de-sable','center',0).entite;rpgFinDeTour(duel);
  duel[side].main=['le-cavalier-de-vapeur'];duel[side].mana.braise=30;duel[side].mana.eau=30;
  assert.equal(rpgMobaJouerCreature(duel,side,'le-cavalier-de-vapeur','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  assert.equal(rpgMobaPasserCreature(duel,enemy).arriveeEnAttente,true);assert.equal(rpgMobaResoudreArrivee(duel,side,b.id).ok,true);
  assert.equal(a.pv,4);assert.equal(b.pv,2);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for (const side of ['joueur','sorcier']) for (const shield of [false,true]) test(`Cavalier de vapeur MOBA : blocage de ${side}, bouclier ${shield}`, () => {
  const duel=partie(),attacker=side==='joueur'?'sorcier':'joueur';if(side==='sorcier')rpgFinDeTour(duel);
  duel[side].main=['le-cavalier-de-vapeur'];duel[side].mana.braise=30;duel[side].mana.eau=30;
  const rider=rpgMobaJouerCreature(duel,side,'le-cavalier-de-vapeur','left',0).entite;rpgFinDeTour(duel);
  duel[attacker].main=['jarl-au-marteau-de-guerre'];duel[attacker].mana.neige=30;
  const jarl=rpgMobaJouerCreature(duel,attacker,'jarl-au-marteau-de-guerre','left',0).entite;jarl.ready=true;jarl.bouclier=shield?1:0;
  assert.equal(rpgMobaDeclarerAttaque(duel,attacker,[jarl.id]).ok,true);
  const result=rpgMobaLancerAttaque(duel,attacker,[jarl.id],{[jarl.id]:[rider.id]},{declaree:true});assert.equal(result.ok,true,JSON.stringify(result));
  assert.ok(!duel[side].creatures.includes(rider),'le bloqueur mort déclenche quand même le renvoi');
  assert.equal(duel[attacker].creatures.includes(jarl),shield);assert.equal(duel[attacker].main.includes(jarl.carteId),!shield);
  assert.equal(jarl.bouclier,0);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Cavalier de vapeur : renvoi en défense libère la prise en cale sans tuer le capteur', () => {
  const duel=partie();duel.joueur.main=['le-cavalier-de-vapeur'];duel.joueur.mana.braise=30;duel.joueur.mana.eau=30;
  const rider=rpgMobaJouerCreature(duel,'joueur','le-cavalier-de-vapeur','left',0).entite;
  duel.joueur.main=['mousse-des-galiotes'];duel.joueur.mana.sable=30;const victim=rpgMobaJouerCreature(duel,'joueur','mousse-des-galiotes','right',0).entite;
  rpgFinDeTour(duel);duel.sorcier.main=['jarl-au-marteau-de-guerre'];duel.sorcier.mana.neige=30;duel.sorcier.prochaineArriveeAbordage=true;
  assert.equal(rpgMobaJouerCreature(duel,'sorcier','jarl-au-marteau-de-guerre','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const captor=rpgMobaPasserCreature(duel,'joueur').entite;assert.equal(rpgMobaResoudreArrivee(duel,'sorcier',victim.id).ok,true);assert.equal(captor.enCale.entite.id,victim.id);captor.ready=true;
  assert.equal(rpgMobaLancerAttaque(duel,'sorcier',[captor.id],{[captor.id]:[rider.id]}).ok,true);
  assert.ok(duel.sorcier.main.includes(captor.carteId));assert.ok(duel.joueur.main.includes(victim.carteId));assert.ok(!duel.joueur.creatures.includes(victim));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Cavalier de vapeur : le jeton bloqué cesse d’exister au lieu de rejoindre la main', () => {
  const duel=partie();duel.joueur.main=['le-cavalier-de-vapeur'];duel.joueur.mana.braise=30;duel.joueur.mana.eau=30;
  const rider=rpgMobaJouerCreature(duel,'joueur','le-cavalier-de-vapeur','left',0).entite;rpgFinDeTour(duel);
  duel.sorcier.main=['tarek'];duel.sorcier.mana.sable=30;assert.equal(rpgMobaJouerCreature(duel,'sorcier','tarek','left',0).ok,true);
  const token=duel.sorcier.creatures.find(e=>e.jeton&&e.mobaLane==='left');assert.ok(token);token.ready=true;token.pv=token.pvMax=10;
  const result=rpgMobaLancerAttaque(duel,'sorcier',[token.id],{[token.id]:[rider.id]});assert.equal(result.ok,true,JSON.stringify(result));
  assert.ok(!duel.sorcier.creatures.includes(token));assert.ok(!duel.sorcier.main.includes(token.carteId));assert.ok(!duel.sorcier.cimetiere.includes(token.carteId));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Oni : Écueil contre l’annonce avant la pose et aucun choix ne reste ouvert', () => {
  const {duel,side,enemy,targets}=oniFixture('joueur',2);duel.sorcier.main=['ecueil'];duel.sorcier.mana.eau=30;
  assert.equal(rpgMobaJouerCreature(duel,side,'oni-de-la-fournaise','center',0,{ouvrirReponse:true}).creatureEnAttente,true);
  assert.equal(rpgMobaLancerMagie(duel,enemy,'ecueil').contre,true);assert.equal(duel.mobaCreatureEnAttente,null);assert.equal(duel.arriveeEnAttente,null);
  assert.deepEqual(targets.map(e=>e.pv),[4,4]);assert.ok(duel.joueur.cimetiere.includes('oni-de-la-fournaise'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

function fixtureDuelArrivee(side='joueur', targetId='jarl-au-marteau-de-guerre') {
  const duel=partie(),enemy=side==='joueur'?'sorcier':'joueur';if(enemy==='sorcier')rpgFinDeTour(duel);
  duel[enemy].main=[targetId];duel[enemy].mana.neige=30;duel[enemy].mana.sable=30;duel[enemy].mana.eau=30;duel[enemy].mana.braise=30;
  const adversaire=rpgMobaJouerCreature(duel,enemy,targetId,'right',0).entite;rpgFinDeTour(duel);
  for(const color of ['sable','eau','neige','braise','tenebres'])duel[side].mana[color]=30;
  return {duel,side,enemy,adversaire};
}
for (const card of ['bakunawa','cavalier-amazigh-du-desert']) for(const side of ['joueur','sorcier']) test(`${card} : duel d’arrivée MOBA, pour ${side}`, () => {
  const {duel,enemy,adversaire}=fixtureDuelArrivee(side);duel[side].main=[card];
  assert.equal(rpgMobaJouerCreature(duel,side,card,'left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const passage=rpgMobaPasserCreature(duel,enemy),source=passage.entite;assert.equal(passage.arriveeEnAttente,true);
  const before=JSON.stringify(duel);assert.equal(rpgMobaResoudreArrivee(duel,side,source.id).raison,'cible');assert.equal(JSON.stringify(duel),before);
  assert.equal(rpgMobaResoudreArrivee(duel,side,adversaire.id).ok,true);
  assert.equal(source.pv,card==='bakunawa'?3:1);assert.equal(adversaire.pv,card==='bakunawa'?2:1);
  assert.equal(duel.arriveeEnAttente,null);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for(const card of ['bakunawa','cavalier-amazigh-du-desert']) test(`${card} : bouclier ennemi arrête le duel, pas le bouclier allié`, () => {
  for(const shieldSide of ['source','target']) {
    const {duel,side,enemy,adversaire}=fixtureDuelArrivee();duel[side].main=[card];
    assert.equal(rpgMobaJouerCreature(duel,side,card,'left',0,{ouvrirReponse:true}).creatureEnAttente,true);
    const source=rpgMobaPasserCreature(duel,enemy).entite;
    (shieldSide==='source'?source:adversaire).bouclier=1;
    assert.equal(rpgMobaResoudreArrivee(duel,side,adversaire.id).ok,true);
    assert.equal(adversaire.pv,shieldSide==='target'?5:card==='bakunawa'?2:1);
    assert.equal(source.pv,shieldSide==='target'?(card==='bakunawa'?6:4):card==='bakunawa'?3:1);
    assert.equal((shieldSide==='source'?source:adversaire).bouclier,shieldSide==='source'?1:0);
    assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

for(const card of ['bakunawa','cavalier-amazigh-du-desert']) test(`${card} : mort simultanée de deux combattants, deux voies libérées`, () => {
  const {duel,side,enemy,adversaire}=fixtureDuelArrivee();duel[side].main=[card];
  assert.equal(rpgMobaJouerCreature(duel,side,card,'left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const source=rpgMobaPasserCreature(duel,enemy).entite;source.pv=3;adversaire.pv=3;
  assert.equal(rpgMobaResoudreArrivee(duel,side,adversaire.id).ok,true);
  assert.ok(!duel[side].creatures.includes(source));assert.ok(!duel[enemy].creatures.includes(adversaire));
  assert.ok(duel[side].cimetiere.includes(card));assert.ok(duel[enemy].cimetiere.includes(adversaire.carteId));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for(const card of ['bakunawa','cavalier-amazigh-du-desert']) test(`${card} : absence de cible et réanimation MOBA`, () => {
  const duel=partie();duel.joueur.main=[card];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;
  assert.equal(rpgMobaJouerCreature(duel,'joueur',card,'left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const source=rpgMobaPasserCreature(duel,'sorcier').entite;assert.equal(duel.arriveeEnAttente ?? null,null);
  source.pv=1;duel.joueur.main=['grand-hiver'];duel.joueur.mana.neige=30;assert.equal(rpgMobaLancerMagie(duel,'joueur','grand-hiver').ok,true);
  rpgFinDeTour(duel);duel.sorcier.main=['jarl-au-marteau-de-guerre'];duel.sorcier.mana.neige=30;
  const target=rpgMobaJouerCreature(duel,'sorcier','jarl-au-marteau-de-guerre','right',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['reanimation'];duel.joueur.mana.sable=30;const result=rpgMobaLancerMagie(duel,'joueur','reanimation',null,'center',null,{emplacementReanimation:0});
  assert.equal(result.ok,true,JSON.stringify(result));const revenu=duel.joueur.creatures.find(e=>e.carteId===card);
  assert.ok(revenu);assert.equal(revenu.mobaLane,'center');assert.equal(target.pv,card==='bakunawa'?2:1);assert.equal(revenu.pv,card==='bakunawa'?3:1);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Lien Bakunawa MOBA : Le Routier pioche trois cartes puis défausse une', () => {
  const duel=partie();duel.joueur.main=['bakunawa'];duel.joueur.mana.eau=30;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','bakunawa','center',0).ok,true);
  duel.joueur.main=['le-routier'];duel.joueur.deck=['verglas','papyrus','ressac'];duel.joueur.mana.sable=30;
  assert.equal(rpgMobaLancerMagie(duel,'joueur','le-routier',null,null,null,{ouvrirReponse:true}).sortEnAttente,true);
  assert.equal(rpgMobaPasserSort(duel,'sorcier').ok,true);assert.equal(duel.joueur.deck.length,0);assert.equal(duel.joueur.main.length,3);assert.equal(duel.defausseEnAttente?.restant,1);
  assert.equal(rpgMobaDefausser(duel,'joueur',0).ok,true);assert.equal(duel.joueur.main.length,2);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for(const card of ['bakunawa','cavalier-amazigh-du-desert']) test(`IA ${card} : préfère un duel favorable et ne modifie ni état ni hasard`, async () => {
  const {rpgMobaChoisirArriveeIA}=await import('../src/games/rpgMobaAI.js');const {duel,side,enemy,adversaire}=fixtureDuelArrivee('joueur');
  adversaire.atk=12;adversaire.pv=adversaire.pvMax=12;
  duel.sorcier.main.push('gardienne-des-portes-de-sable');duel.sorcier.mana.sable=30;
  // Le camp adverse ne peut poser qu'à son tour : préparons ce second ennemi avant l'annonce.
  rpgFinDeTour(duel);const weak=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','center',0).entite;weak.pv=2;rpgFinDeTour(duel);
  duel[side].main=[card];duel[side].mana.eau=30;duel[side].mana.sable=30;assert.equal(rpgMobaJouerCreature(duel,side,card,'left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  assert.equal(rpgMobaPasserCreature(duel,enemy).arriveeEnAttente,true);duel[enemy].main=['parade-du-verre'];duel[enemy].mana.eau=30;let rng=0;rpgReglerHasard(duel,()=>{rng++;return .5;});
  const before=JSON.stringify(duel),choice=rpgMobaChoisirArriveeIA(duel,side);assert.equal(choice,weak.id);assert.equal(JSON.stringify(duel),before);assert.equal(rng,0);
  assert.equal(rpgMobaResoudreArrivee(duel,side,choice).ok,true);assert.ok(duel.effetCreatureEnAttente);assert.equal(rpgMobaPasserEffetCreature(duel,enemy).ok,true);assert.ok(!duel.sorcier.creatures.includes(weak));assert.ok(duel.sorcier.creatures.includes(adversaire));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('IA Bakunawa évite une arrivée suicidaire à faible impact', async () => {
  const {rpgMobaChoisirCreatureIA}=await import('../src/games/rpgMobaAI.js');const {duel,side,adversaire}=fixtureDuelArrivee('joueur');
  adversaire.atk=12;adversaire.pv=adversaire.pvMax=12;duel[side].main=['bakunawa','gardienne-des-portes-de-sable'];duel[side].mana.sable=30;
  let rng=0;rpgReglerHasard(duel,()=>{rng++;return .5;});const avant=JSON.stringify(duel);
  const choice=rpgMobaChoisirCreatureIA(duel,side);assert.equal(choice?.id,'gardienne-des-portes-de-sable');assert.equal(JSON.stringify(duel),avant);assert.equal(rng,0);
});

for(const card of ['bakunawa','cavalier-amazigh-du-desert']) test(`${card} : parade colorée, réponse à l'effet, Écueil et prise préalable`, () => {
  {
    const {duel,side,enemy,adversaire}=fixtureDuelArrivee();duel[side].main=[card];duel[enemy].main=['parade-du-verre'];duel[enemy].mana.eau=30;
    assert.equal(rpgMobaJouerCreature(duel,side,card,'left',0,{ouvrirReponse:true}).creatureEnAttente,true);const source=rpgMobaPasserCreature(duel,enemy).entite;
    adversaire.protection={contre:[card==='bakunawa'?'eau':'sable']};assert.equal(rpgMobaResoudreArrivee(duel,side,adversaire.id).ok,true);assert.ok(duel.effetCreatureEnAttente);assert.equal(adversaire.pv,5);assert.equal(rpgMobaPasserEffetCreature(duel,enemy).ok,true);assert.equal(adversaire.pv,card==='bakunawa'?2:1);assert.equal(source.pv,card==='bakunawa'?3:1);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
  {
    const {duel,side,enemy,adversaire}=fixtureDuelArrivee();duel[side].main=[card];duel[enemy].main=['ecueil'];duel[enemy].mana.eau=30;
    assert.equal(rpgMobaJouerCreature(duel,side,card,'left',0,{ouvrirReponse:true}).creatureEnAttente,true);assert.equal(rpgMobaLancerMagie(duel,enemy,'ecueil').contre,true);
    assert.ok(duel[side].cimetiere.includes(card));assert.equal(adversaire.pv,5);assert.equal(duel.mobaCreatureEnAttente,null);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
  {
    const {duel,side,enemy,targets:[prise,target]}=oniFixture('joueur',2);duel[side].main=[card];duel[side].mana.eau=30;duel[side].mana.sable=30;duel[side].prochaineArriveeAbordage=true;
    assert.equal(rpgMobaJouerCreature(duel,side,card,'left',0,{ouvrirReponse:true}).creatureEnAttente,true);const source=rpgMobaPasserCreature(duel,enemy).entite;
    assert.equal(rpgMobaResoudreArrivee(duel,side,prise.id).ok,true);assert.equal(source.enCale.entite.id,prise.id);assert.equal(rpgMobaResoudreArrivee(duel,side,target.id).ok,true);
    assert.equal(target.pv,card==='bakunawa'?1:0);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

for(const card of ['bakunawa','cavalier-amazigh-du-desert']) test(`${card} : réponse renvoyant la source ou protégeant la cible avant le duel`, () => {
  for(const which of ['source','target']) {
    const {duel,side,enemy,adversaire}=fixtureDuelArrivee();duel[side].main=[card];duel[enemy].main=[which==='source'?'ressac':'parade-du-verre'];duel[enemy].mana.eau=30;
    assert.equal(rpgMobaJouerCreature(duel,side,card,'left',0,{ouvrirReponse:true}).creatureEnAttente,true);const source=rpgMobaPasserCreature(duel,enemy).entite;
    assert.equal(rpgMobaResoudreArrivee(duel,side,adversaire.id).ok,true);assert.ok(duel.effetCreatureEnAttente);
    assert.equal(rpgMobaLancerMagie(duel,enemy,which==='source'?'ressac':'parade-du-verre',which==='source'?source.id:adversaire.id).ok,true);
    assert.equal(rpgMobaPasserEffetCreature(duel,enemy).ok,true);assert.equal(source.pv,card==='bakunawa'?6:4);assert.equal(adversaire.pv,5);
    assert.equal(duel.effetCreatureEnAttente,null);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

for (const side of ['joueur','sorcier']) test(`Barbe Noire MOBA : capture, malédiction globale, bouclier et départ pour ${side}`, () => {
  const {duel,enemy,targets:[a,b,c]}=oniFixture(side);const card='la-barbe-noire';duel[side].main=[card];duel[side].mana.tenebres=30;b.bouclier=1;
  a.atk=4;b.atk=4;c.atk=1;assert.equal(rpgMobaJouerCreature(duel,side,card,'right',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const noire=rpgMobaPasserCreature(duel,enemy).entite;assert.deepEqual([a.atk,b.atk,c.atk],[2,4,0]);assert.equal(b.bouclier,0);
  assert.equal(rpgMobaResoudreArrivee(duel,side,a.id).ok,true);assert.equal(noire.enCale.entite.id,a.id);assert.deepEqual([b.atk,c.atk],[4,0]);
  duel[enemy].main=['ressac'];duel[enemy].mana.eau=30;assert.equal(rpgMobaTerminerTour(duel,side).reponse,enemy);
  assert.equal(rpgMobaLancerMagie(duel,enemy,'ressac',noire.id).ok,true);assert.deepEqual([b.atk,c.atk],[4,1]);assert.ok(duel[enemy].main.includes(a.carteId));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe Noire : insaisissable et priorité à Abordage imprimé plutôt qu’à Lettre', () => {
  const {duel,side,enemy,adversaire}=fixtureDuelArrivee();duel[side].main=['la-barbe-noire'];duel[side].mana.tenebres=30;duel[side].prochaineArriveeAbordage=true;
  assert.equal(rpgMobaJouerCreature(duel,side,'la-barbe-noire','left',0,{ouvrirReponse:true}).creatureEnAttente,true);const noire=rpgMobaPasserCreature(duel,enemy).entite;
  assert.equal(noire.enCale,null);assert.equal(duel.arriveeEnAttente,null);assert.ok(duel[enemy].creatures.includes(adversaire));
  rpgFinDeTour(duel);duel[enemy].main=['galion-de-la-flotte'];duel[enemy].mana.sable=30;duel[enemy].mana.eau=30;
  assert.equal(rpgMobaJouerCreature(duel,enemy,'galion-de-la-flotte','right',1,{ouvrirReponse:true}).creatureEnAttente,true);const galion=rpgMobaPasserCreature(duel,side).entite;
  assert.equal(galion.enCale,null);assert.equal(duel.arriveeEnAttente,null);assert.ok(duel[side].creatures.includes(noire));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe Noire : provocation n’impose des bloqueurs que dans sa voie', () => {
  const {duel,side,enemy,targets:[a,b]}=oniFixture('joueur',2);duel[side].main=['la-barbe-noire'];duel[side].mana.tenebres=30;
  assert.equal(rpgMobaJouerCreature(duel,side,'la-barbe-noire','left',0,{ouvrirReponse:true}).creatureEnAttente,true);const noire=rpgMobaPasserCreature(duel,enemy).entite;
  assert.equal(rpgMobaResoudreArrivee(duel,side,b.id).ok,true);noire.ready=true;
  assert.equal(rpgMobaLancerAttaque(duel,side,[noire.id],{}).raison,'provocation');assert.equal(rpgMobaLancerAttaque(duel,side,[noire.id],{[noire.id]:[a.id]}).ok,true);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for (const side of ['joueur','sorcier']) test(`Lien du Poids MOBA : cible et voie choisies, paiement et résolution pour ${side}`, () => {
  const {duel,enemy,targets:[prise,target,other]}=oniFixture(side);duel[side].main=['la-barbe-noire'];duel[side].mana.tenebres=30;
  assert.equal(rpgMobaJouerCreature(duel,side,'la-barbe-noire','left',0,{ouvrirReponse:true}).creatureEnAttente,true);rpgMobaPasserCreature(duel,enemy);assert.equal(rpgMobaResoudreArrivee(duel,side,prise.id).ok,true);
  duel[side].main=['le-poids'];const before=JSON.stringify(duel);assert.equal(rpgMobaLancerMagie(duel,side,'le-poids',null,'right',null,{ouvrirReponse:true}).raison,'cible');assert.equal(JSON.stringify(duel),before);
  assert.equal(rpgMobaLancerMagie(duel,side,'le-poids',target.id,'right',null,{ouvrirReponse:true}).sortEnAttente,true);assert.equal(duel.mobaSortEnAttente.cibleId,target.id);assert.equal(target.pv,4);
  const result=rpgMobaPasserSort(duel,enemy);assert.equal(result.ok,true,JSON.stringify(result));assert.equal(mobaVoie(duel.moba,'right').hp[enemy],8);assert.equal(target.pv,2);assert.equal(other.pv,4);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Lien du Poids MOBA : contre, bouclier et perte de la cible ou de l’ancre', () => {
  for(const mode of ['contre','bouclier','cible','ancre']) {
    const {duel,side,enemy,targets:[prise,target]}=oniFixture('joueur',2);duel[side].main=['la-barbe-noire'];duel[side].mana.tenebres=30;
    rpgMobaJouerCreature(duel,side,'la-barbe-noire','left',0,{ouvrirReponse:true});const noire=rpgMobaPasserCreature(duel,enemy).entite;rpgMobaResoudreArrivee(duel,side,prise.id);
    duel[side].main=['le-poids'];duel[enemy].main=[mode==='contre'?'silence-decume':mode==='bouclier'?'parade-du-verre':'ressac'];duel[enemy].mana.eau=30;
    assert.equal(rpgMobaLancerMagie(duel,side,'le-poids',target.id,'right',null,{ouvrirReponse:true}).sortEnAttente,true);
    if(mode==='contre')assert.equal(rpgMobaLancerMagie(duel,enemy,'silence-decume').contre,true);
    if(mode==='bouclier')assert.equal(rpgMobaLancerMagie(duel,enemy,'parade-du-verre',target.id).ok,true);
    if(mode==='ancre')assert.equal(rpgMobaLancerMagie(duel,enemy,'ressac',noire.id).ok,true);
    // Simulate target departure by a legal response from its controller: the
    // selected creature leaves the table before the paid effect resolves.
    if(mode==='cible'){duel[enemy].creatures=duel[enemy].creatures.filter(e=>e.id!==target.id);mobaRetirer(duel.moba,enemy,target.id);}
    if(mode!=='contre')assert.equal(rpgMobaPasserSort(duel,enemy).ok,true);
    assert.equal(mobaVoie(duel.moba,'right').hp[enemy],mode==='ancre'?8:10);assert.equal(target.pv,4);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Le Poids lié : appel direct reste automatique, IA vise sans mutation ni hasard', async () => {
  const {duel,side,enemy,targets:[prise,weak,strong]}=oniFixture('joueur');duel[side].main=['la-barbe-noire'];duel[side].mana.tenebres=30;
  rpgMobaJouerCreature(duel,side,'la-barbe-noire','left',0,{ouvrirReponse:true});rpgMobaPasserCreature(duel,enemy);rpgMobaResoudreArrivee(duel,side,prise.id);weak.pv=2;strong.bouclier=1;
  duel[side].main=['le-poids'];let rng=0;rpgReglerHasard(duel,()=>{rng++;return .5;});const before=JSON.stringify(duel),choice=rpgMobaChoisirMagieIA(duel,side);
  assert.equal(choice?.id,'le-poids');assert.equal(choice.cible,weak.id);assert.equal(JSON.stringify(duel),before);assert.equal(rng,0);
  assert.equal(rpgMobaLancerMagie(duel,side,'le-poids',null,'right').ok,true);assert.equal(mobaVoie(duel.moba,'right').hp[enemy],8);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Le Poids lié ne redirige pas le malus quand son transfert conquiert la voie de sa cible', () => {
  const {duel,side,enemy,targets:[prise,target,other]}=oniFixture('joueur');duel[side].main=['la-barbe-noire'];duel[side].mana.tenebres=30;
  rpgMobaJouerCreature(duel,side,'la-barbe-noire','left',0,{ouvrirReponse:true});rpgMobaPasserCreature(duel,enemy);rpgMobaResoudreArrivee(duel,side,prise.id);
  mobaInfliger(duel.moba,side,'center',8);duel[side].main=['le-poids'];assert.equal(rpgMobaLancerMagie(duel,side,'le-poids',target.id,'center',null,{ouvrirReponse:true}).sortEnAttente,true);
  assert.equal(rpgMobaPasserSort(duel,enemy).ok,true);assert.equal(mobaVoie(duel.moba,'center').conqueredBy,side);assert.ok(!duel[enemy].creatures.includes(target));assert.equal(other.pv,4);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Le Poids lié en réponse : cible et transfert sans fenêtre imbriquée', () => {
  const {duel,side,enemy,targets:[prise,cible]}=oniFixture('joueur',2);duel[side].main=['la-barbe-noire'];duel[side].mana.tenebres=30;
  rpgMobaJouerCreature(duel,side,'la-barbe-noire','left',0,{ouvrirReponse:true});rpgMobaPasserCreature(duel,enemy);rpgMobaResoudreArrivee(duel,side,prise.id);
  rpgFinDeTour(duel);duel[enemy].main=['grand-hiver'];duel[enemy].mana.neige=30;duel[side].main=['le-poids'];duel[side].mana.tenebres=30;
  assert.equal(rpgMobaLancerMagie(duel,enemy,'grand-hiver',null,null,null,{ouvrirReponse:true}).sortEnAttente,true);const pending=duel.mobaSortEnAttente;
  assert.equal(rpgMobaLancerMagie(duel,side,'le-poids',cible.id,'right',null,{ouvrirReponse:true}).ok,true);assert.equal(duel.mobaSortEnAttente,pending);assert.equal(cible.pv,2);assert.equal(mobaVoie(duel.moba,'right').hp[enemy],8);
  assert.equal(rpgMobaPasserSort(duel,side).ok,true);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe Noire : Écueil empêche malédiction et capture ; réanimation la rétablit sans prise', () => {
  const {duel,side,enemy,targets:[target]}=oniFixture('joueur',1);target.atk=4;duel[side].main=['la-barbe-noire'];duel[side].mana.tenebres=30;duel[enemy].main=['ecueil'];duel[enemy].mana.eau=30;
  assert.equal(rpgMobaJouerCreature(duel,side,'la-barbe-noire','left',0,{ouvrirReponse:true}).creatureEnAttente,true);assert.equal(rpgMobaLancerMagie(duel,enemy,'ecueil').contre,true);assert.equal(target.atk,4);
  duel[side].main=['reanimation'];duel[side].mana.sable=30;assert.equal(rpgMobaLancerMagie(duel,side,'reanimation',null,'right',null,{emplacementReanimation:0}).ok,true);
  const noire=duel[side].creatures.find(e=>e.carteId==='la-barbe-noire');assert.ok(noire);assert.equal(noire.enCale,null);assert.equal(target.atk,2);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe Noire : deux sources cumulent sans dérive et les boucliers restent attachés à chaque source', () => {
  const {duel,side,enemy,targets:[a,b,c]}=oniFixture('joueur',3);a.atk=5;b.atk=5;b.bouclier=1;duel[side].main=['la-barbe-noire','la-barbe-noire'];duel[side].mana.tenebres=30;
  assert.equal(rpgMobaJouerCreature(duel,side,'la-barbe-noire','left',0,{ouvrirReponse:true}).creatureEnAttente,true);const first=rpgMobaPasserCreature(duel,enemy).entite;
  rpgMobaResoudreArrivee(duel,side,a.id);assert.equal(b.atk,5);assert.equal(b.bouclier,0);
  assert.equal(rpgMobaJouerCreature(duel,side,'la-barbe-noire','right',0,{ouvrirReponse:true}).creatureEnAttente,true);const second=rpgMobaPasserCreature(duel,enemy).entite;assert.equal(b.atk,3);rpgMobaResoudreArrivee(duel,side,c.id);
  duel[enemy].main=['ressac','ressac'];duel[enemy].mana.eau=30;assert.equal(rpgMobaTerminerTour(duel,side).reponse,enemy);assert.equal(rpgMobaLancerMagie(duel,enemy,'ressac',first.id).ok,true);
  assert.equal(b.atk,3);assert.equal(rpgMobaLancerMagie(duel,enemy,'ressac',second.id).ok,true);assert.equal(b.atk,5);assert.equal(duel[enemy].main.filter(id=>id===a.carteId).length,2);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

function fixtureBrulot(side='joueur') {
  const duel=partie(),enemy=side==='joueur'?'sorcier':'joueur';if(side==='sorcier')rpgFinDeTour(duel);
  duel[side].main=['le-brulot'];duel[side].mana.braise=30;
  const brulot=rpgMobaJouerCreature(duel,side,'le-brulot','right',0).entite;rpgFinDeTour(duel);
  duel[enemy].main=['jarl-au-marteau-de-guerre'];duel[enemy].mana.neige=30;
  const jarl=rpgMobaJouerCreature(duel,enemy,'jarl-au-marteau-de-guerre','right',0).entite;jarl.ready=true;jarl.overkill=false;
  return {duel,side,enemy,brulot,jarl};
}
for(const side of ['joueur','sorcier']) for(const shield of [false,true]) test(`Brûlot MOBA : combat ${side}, parade du tueur ${shield}`, () => {
  const {duel,enemy,brulot,jarl}=fixtureBrulot(side);jarl.bouclier=shield?1:0;const legacy=duel[enemy].pv;
  const result=rpgMobaLancerAttaque(duel,enemy,[jarl.id],{[jarl.id]:[brulot.id]});assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(jarl.pv,shield?4:2);assert.equal(jarl.bouclier,0);assert.equal(mobaVoie(duel.moba,'right').hp[enemy],8);assert.equal(duel[enemy].pv,legacy);
  assert.deepEqual(result.damageEvents.map(e=>[e.cardId,e.laneId,e.targetSide,e.damage]),[['le-brulot','right',enemy,2]]);
  assert.ok(duel[side].cimetiere.includes('le-brulot'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for(const side of ['joueur','sorcier']) test(`Brûlot MOBA : magie annoncée tue ${side}, dégâts de voie et aucun faux tueur`, () => {
  const {duel,enemy,brulot,jarl}=fixtureBrulot(side);duel[enemy].main=['trait-de-braise'];duel[enemy].mana.braise=30;
  assert.equal(rpgMobaLancerMagie(duel,enemy,'trait-de-braise',brulot.id,null,null,{ouvrirReponse:true}).sortEnAttente,true);
  const result=rpgMobaPasserSort(duel,side);assert.equal(result.ok,true);assert.equal(jarl.pv,5);assert.equal(mobaVoie(duel.moba,'right').hp[enemy],8);
  assert.deepEqual(result.damageEvents.map(e=>[e.cardId,e.laneId,e.targetSide,e.damage]),[['le-brulot','right',enemy,2]]);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Brûlot MOBA : attaque, créatures simultanément mortes et absence de riposte au cadavre', () => {
  const {duel,side,enemy,brulot,jarl}=fixtureBrulot();jarl.pv=1;
  const result=rpgMobaLancerAttaque(duel,enemy,[jarl.id],{[jarl.id]:[brulot.id]});assert.equal(result.ok,true);assert.ok(!duel[enemy].creatures.includes(jarl));
  assert.ok(!duel[side].creatures.includes(brulot));assert.equal(mobaVoie(duel.moba,'right').hp[enemy],8);assert.ok(!duel.log.some(x=>x.includes('embrase Jarl')));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Brûlot MOBA : une arrivée hostile déclenche le souffle et embrase sa source', () => {
  const duel=partie();duel.joueur.main=['le-brulot'];duel.joueur.mana.braise=30;const brulot=rpgMobaJouerCreature(duel,'joueur','le-brulot','right',0).entite;
  rpgFinDeTour(duel);duel.sorcier.main=['maitre-du-marteau'];duel.sorcier.mana.neige=30;const maitre=rpgMobaJouerCreature(duel,'sorcier','maitre-du-marteau','left',0).entite;
  const result=rpgMobaResoudreArrivee(duel,'sorcier',brulot.id);assert.equal(result.ok,true);assert.equal(maitre.pv,3);assert.equal(mobaVoie(duel.moba,'right').hp.sorcier,8);assert.equal(result.damageEvents[0].cardId,'le-brulot');assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Brûlot MOBA : la prise et la conquête ne sont pas des morts', () => {
  const duel=partie();duel.joueur.main=['le-brulot'];duel.joueur.mana.braise=30;const brulot=rpgMobaJouerCreature(duel,'joueur','le-brulot','right',0).entite;rpgFinDeTour(duel);
  duel.sorcier.main=['galion-de-la-flotte'];duel.sorcier.mana.sable=30;duel.sorcier.mana.eau=30;
  assert.equal(rpgMobaJouerCreature(duel,'sorcier','galion-de-la-flotte','left',0,{ouvrirReponse:true}).creatureEnAttente,true);const galion=rpgMobaPasserCreature(duel,'joueur').entite;
  assert.equal(rpgMobaResoudreArrivee(duel,'sorcier',brulot.id).ok,true);assert.equal(galion.enCale.entite.id,brulot.id);assert.equal(mobaVoie(duel.moba,'right').hp.sorcier,10);
  galion.ready=true;mobaInfliger(duel.moba,'sorcier','left',8);const result=rpgMobaLancerAttaque(duel,'sorcier',[galion.id],{});assert.equal(result.ok,true);assert.equal(mobaVoie(duel.moba,'left').conqueredBy,'sorcier');
  assert.equal(mobaVoie(duel.moba,'right').hp.sorcier,10);assert.ok(duel.joueur.main.includes('le-brulot'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Brûlot MOBA : seconde conquête à la mort arrête les autres blessures et effets', () => {
  const {duel,side,enemy,brulot,jarl}=fixtureBrulot();mobaInfliger(duel.moba,side,'left',10);mobaInfliger(duel.moba,side,'right',8);
  const result=rpgMobaLancerAttaque(duel,enemy,[jarl.id],{[jarl.id]:[brulot.id]});assert.equal(result.ok,true,JSON.stringify(result));assert.equal(duel.moba.winner,side);assert.equal(duel.fin.gagnant,side);
  assert.equal(result.damageEvents[0].winner,side);assert.equal(jarl.pv,4);assert.ok(!duel.log.some(x=>x.includes('embrase Jarl')));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Brûlot MOBA : vague de destruction, deux morts sur des voies différentes et journal unique', () => {
  const duel=partie();duel.joueur.main=['le-brulot','le-brulot'];duel.joueur.mana.braise=30;
  rpgMobaJouerCreature(duel,'joueur','le-brulot','left',0);rpgMobaJouerCreature(duel,'joueur','le-brulot','right',0);rpgFinDeTour(duel);
  duel.sorcier.main=['neige-noire'];duel.sorcier.mana.neige=30;duel.sorcier.mana.tenebres=30;
  const result=rpgMobaLancerMagie(duel,'sorcier','neige-noire',null,'center');assert.equal(result.ok,true,JSON.stringify(result));
  assert.deepEqual(result.damageEvents.filter(e=>e.cardId==='le-brulot').map(e=>e.laneId).sort(),['left','right']);
  assert.equal(mobaVoie(duel.moba,'left').hp.sorcier,8);assert.equal(mobaVoie(duel.moba,'right').hp.sorcier,8);assert.equal(duel.joueur.cimetiere.filter(id=>id==='le-brulot').length,2);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Brûlot MOBA : réanimation crée une nouvelle mort sans réutiliser le journal précédent', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['le-brulot'];duel.sorcier.mana.braise=30;const brulot=rpgMobaJouerCreature(duel,'sorcier','le-brulot','right',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['trait-de-braise','reanimation','trait-de-braise'];duel.joueur.mana.braise=30;duel.joueur.mana.tenebres=30;
  const first=rpgMobaLancerMagie(duel,'joueur','trait-de-braise',brulot.id);assert.equal(first.damageEvents.filter(e=>e.cardId==='le-brulot').length,1);
  rpgFinDeTour(duel);duel.sorcier.main=['reanimation'];duel.sorcier.mana.sable=30;
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','reanimation',null,'left',null,{emplacementReanimation:0}).ok,true);const returned=duel.sorcier.creatures.find(e=>e.carteId==='le-brulot');assert.ok(returned);assert.notEqual(returned.id,brulot.id);
  rpgFinDeTour(duel);duel.joueur.mana.braise=30;const second=rpgMobaLancerMagie(duel,'joueur','trait-de-braise',returned.id);assert.equal(second.ok,true);assert.equal(second.damageEvents.filter(e=>e.cardId==='le-brulot').length,1);
  assert.equal(mobaVoie(duel.moba,'right').hp.joueur,8);assert.equal(mobaVoie(duel.moba,'left').hp.joueur,8);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Brûlot MOBA : victoire à la fin du tour arrête les éphémères suivants et annonce les dégâts', () => {
  const duel=partie();duel.joueur.main=['le-brulot','gardienne-des-portes-de-sable'];duel.joueur.mana.braise=30;duel.joueur.mana.sable=30;
  const b=rpgMobaJouerCreature(duel,'joueur','le-brulot','right',0).entite;const other=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','center',0).entite;b.detruireFinDuTour=true;other.detruireFinDuTour=true;
  mobaInfliger(duel.moba,'joueur','left',10);mobaInfliger(duel.moba,'joueur','right',8);
  assert.equal(rpgMobaTerminerTour(duel,'joueur').reponse,'sorcier');const result=rpgMobaPasserFinDeTour(duel,'sorcier');assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(duel.moba.winner,'joueur');assert.equal(duel.tour,'joueur');assert.ok(duel.joueur.creatures.includes(other));assert.equal(result.damageEvents.length,1);assert.equal(result.damageEvents[0].winner,'joueur');assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Brûlot MOBA : l’IA ne lance pas un sort qui offre la victoire à l’adversaire', () => {
  const duel=partie();duel.joueur.main=['le-brulot'];duel.joueur.mana.braise=30;rpgMobaJouerCreature(duel,'joueur','le-brulot','right',0);
  mobaInfliger(duel.moba,'joueur','left',10);mobaInfliger(duel.moba,'joueur','right',8);rpgFinDeTour(duel);
  duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=30;const avant=JSON.stringify(duel);const choix=rpgMobaChoisirMagieIA(duel,'sorcier');
  assert.ok(!choix || choix.target!==duel.joueur.creatures[0].id,JSON.stringify(choix));assert.equal(JSON.stringify(duel),avant);
});

test('Brûlot MOBA : exilé lors de la conquête, sans déclenchement de mort', () => {
  const {duel,side,enemy,brulot}=fixtureBrulot();mobaInfliger(duel.moba,enemy,'right',8);duel[enemy].main=['trait-de-braise'];duel[enemy].mana.braise=30;
  const result=rpgMobaLancerMagie(duel,enemy,'trait-de-braise','sorcier','right');assert.equal(result.ok,true);assert.ok(!duel[side].creatures.includes(brulot));assert.ok(duel[side].exil.includes('le-brulot'));
  assert.ok(!duel[side].cimetiere.includes('le-brulot'));assert.equal(mobaVoie(duel.moba,'right').hp[enemy],10);assert.ok(!result.damageEvents.some(e=>e.cardId==='le-brulot'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Brûlot MOBA : réponse létale ferme le sort annoncé sans autre résolution', () => {
  const duel=partie();duel.joueur.main=['le-brulot','grand-hiver'];duel.joueur.mana.braise=30;duel.joueur.mana.neige=30;
  const brulot=rpgMobaJouerCreature(duel,'joueur','le-brulot','right',0).entite;duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=30;
  mobaInfliger(duel.moba,'joueur','left',10);mobaInfliger(duel.moba,'joueur','right',8);
  assert.equal(rpgMobaLancerMagie(duel,'joueur','grand-hiver',null,null,null,{ouvrirReponse:true}).sortEnAttente,true);
  const result=rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',brulot.id);assert.equal(result.ok,true);assert.equal(duel.moba.winner,'joueur');assert.equal(duel.mobaSortEnAttente,null);
  assert.equal(result.damageEvents[0].cardId,'le-brulot');assert.equal(duel.joueur.cimetiere.filter(x=>x==='grand-hiver').length,1);assert.equal(rpgMobaPasserSort(duel,'sorcier').raison,'partie-terminee');assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Brûlot MOBA : explosion en chaîne peut détruire la créature qui a causé sa mort', () => {
  const duel=partie();duel.joueur.main=['le-brulot'];duel.joueur.mana.braise=30;const brulot=rpgMobaJouerCreature(duel,'joueur','le-brulot','right',0).entite;rpgFinDeTour(duel);
  duel.sorcier.main=['maitre-du-marteau'];duel.sorcier.mana.neige=30;const maitre=rpgMobaJouerCreature(duel,'sorcier','maitre-du-marteau','left',0).entite;maitre.pv=2;
  const result=rpgMobaResoudreArrivee(duel,'sorcier',brulot.id);assert.equal(result.ok,true);assert.ok(!duel.sorcier.creatures.includes(maitre));assert.ok(duel.sorcier.cimetiere.includes('maitre-du-marteau'));assert.equal(result.damageEvents.length,1);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

function fixtureRousse(side='joueur') {
  const duel=partie(),enemy=side==='joueur'?'sorcier':'joueur';if(side==='sorcier')rpgFinDeTour(duel);
  duel[side].main=['la-barbe-rousse'];duel[side].mana.sable=30;duel[side].mana.eau=30;
  const play=rpgMobaJouerCreature(duel,side,'la-barbe-rousse','right',0,{ouvrirReponse:true});assert.equal(play.creatureEnAttente,true,JSON.stringify(play));
  const passed=rpgMobaPasserCreature(duel,enemy);assert.equal(passed.ok,true,JSON.stringify(passed));const rousse=passed.entite;
  rpgFinDeTour(duel);return {duel,side,enemy,rousse};
}
for (const side of ['joueur','sorcier']) test(`Barbe-Rousse MOBA : jeton, sort ciblé et riposte de voie (${side})`, () => {
  const {duel,enemy,rousse}=fixtureRousse(side);const corsaire=duel[side].creatures.find(e=>e.carteId==='corsaire');assert.ok(corsaire?.jeton);assert.equal(corsaire.mobaLane,'right');
  duel[enemy].main=['trait-de-braise'];duel[enemy].mana.braise=30;const pv=duel[enemy].pv;
  assert.equal(rpgMobaLancerMagie(duel,enemy,'trait-de-braise',rousse.id,null,null,{ouvrirReponse:true}).sortEnAttente,true);
  const result=rpgMobaPasserSort(duel,side);assert.equal(result.ok,true);assert.equal(rousse.pv,2);assert.equal(duel[enemy].pv,pv);assert.equal(mobaVoie(duel.moba,'right').hp[enemy],6);
  assert.deepEqual(result.damageEvents.map(e=>[e.cardId,e.laneId,e.targetSide,e.damage,e.contreAttaque]),[['la-barbe-rousse','right',enemy,4,true]]);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe-Rousse MOBA : un sort fatal reçoit une riposte du dernier état', () => {
  const {duel,side,enemy,rousse}=fixtureRousse();rousse.pv=1;duel[enemy].main=['trait-de-braise'];duel[enemy].mana.braise=30;
  const result=rpgMobaLancerMagie(duel,enemy,'trait-de-braise',rousse.id);assert.equal(result.ok,true);assert.ok(!duel[side].creatures.includes(rousse));assert.ok(duel[side].cimetiere.includes('la-barbe-rousse'));
  assert.equal(mobaVoie(duel.moba,'right').hp[enemy],6);assert.equal(result.damageEvents[0].cardId,'la-barbe-rousse');assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe-Rousse MOBA : parade absorbe un sort et empêche sa Contre-attaque', () => {
  const {duel,side,enemy,rousse}=fixtureRousse();rousse.bouclier=1;duel[enemy].main=['trait-de-braise'];duel[enemy].mana.braise=30;
  const result=rpgMobaLancerMagie(duel,enemy,'trait-de-braise',rousse.id);assert.equal(result.ok,true);assert.equal(rousse.pv,5);assert.equal(rousse.bouclier,0);assert.equal(mobaVoie(duel.moba,'right').hp[enemy],10);assert.ok(!result.damageEvents?.length);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe-Rousse MOBA : une vague fait riposter chacune dans sa voie sans toucher les alliées', () => {
  const {duel,side,enemy,rousse}=fixtureRousse();duel[side].main=['la-barbe-rousse'];duel[side].mana.sable=30;duel[side].mana.eau=30;
  // second presence is placed on its own turn; no hostile prize is available
  rpgFinDeTour(duel);duel[side].mana.sable=30;duel[side].mana.eau=30;const otherResult=rpgMobaJouerCreature(duel,side,'la-barbe-rousse','left',0);assert.equal(otherResult.ok,true,JSON.stringify(otherResult));const other=otherResult.entite;assert.ok(other);rpgFinDeTour(duel);
  duel[enemy].main=['tempete-de-sable'];duel[enemy].mana.sable=30;const result=rpgMobaLancerMagie(duel,enemy,'tempete-de-sable');assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(mobaVoie(duel.moba,'right').hp[enemy],6);assert.equal(mobaVoie(duel.moba,'left').hp[enemy],6);assert.deepEqual(result.damageEvents.filter(e=>e.contreAttaque).map(e=>e.laneId).sort(),['left','right']);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe-Rousse MOBA : une riposte gagnante stoppe les autres ripostes', () => {
  const {duel,side,enemy,rousse}=fixtureRousse();mobaInfliger(duel.moba,side,'left',10);mobaInfliger(duel.moba,side,'right',6);
  duel[enemy].main=['trait-de-braise'];duel[enemy].mana.braise=30;const result=rpgMobaLancerMagie(duel,enemy,'trait-de-braise',rousse.id);
  assert.equal(result.ok,true);assert.equal(duel.moba.winner,side);assert.equal(duel.fin.gagnant,side);assert.equal(result.damageEvents[0].winner,side);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe-Rousse MOBA : prise imprimée, jeton puis Lien du Grand Débarquement', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['jarl-au-marteau-de-guerre'];duel.sorcier.mana.neige=30;const prise=rpgMobaJouerCreature(duel,'sorcier','jarl-au-marteau-de-guerre','right',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['la-barbe-rousse','le-grand-debarquement'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','la-barbe-rousse','left',0,{ouvrirReponse:true}).creatureEnAttente,true);assert.equal(duel.joueur.creatures.length,0);
  const pass=rpgMobaPasserCreature(duel,'sorcier');assert.equal(pass.arriveeEnAttente,true);const rousse=pass.entite;const corsaire=duel.joueur.creatures.find(e=>e.carteId==='corsaire');assert.ok(corsaire);assert.equal(corsaire.mobaLane,'left');
  assert.equal(duel.arriveeEnAttente.abordage,5);assert.equal(rpgMobaResoudreArrivee(duel,'joueur',prise.id).ok,true);assert.equal(rousse.enCale.entite.id,prise.id);
  assert.equal(rpgMobaLancerMagie(duel,'joueur','le-grand-debarquement',null,null,null,{ouvrirReponse:true}).sortEnAttente,true);
  assert.equal(rpgMobaPasserSort(duel,'sorcier').ok,true);assert.equal(rousse.atk,7);assert.equal(rousse.pv,7);assert.equal(rousse.overkill,true);assert.equal(corsaire.atk,2);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe-Rousse MOBA : le Lien disparaît si l’ancre est renvoyée avant Débarquement', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable','jarl-au-marteau-de-guerre'];duel.sorcier.mana.sable=30;duel.sorcier.mana.neige=30;
  const a=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;const b=rpgMobaJouerCreature(duel,'sorcier','jarl-au-marteau-de-guerre','right',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['galion-de-la-flotte','la-barbe-rousse','le-grand-debarquement'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','galion-de-la-flotte','center',0,{ouvrirReponse:true}).creatureEnAttente,true);const galion=rpgMobaPasserCreature(duel,'sorcier').entite;assert.equal(rpgMobaResoudreArrivee(duel,'joueur',a.id).ok,true);
  assert.equal(rpgMobaJouerCreature(duel,'joueur','la-barbe-rousse','left',0,{ouvrirReponse:true}).creatureEnAttente,true);const rousse=rpgMobaPasserCreature(duel,'sorcier').entite;assert.equal(rpgMobaResoudreArrivee(duel,'joueur',b.id).ok,true);
  duel.sorcier.main=['ressac'];duel.sorcier.mana.eau=30;assert.equal(rpgMobaLancerMagie(duel,'joueur','le-grand-debarquement',null,null,null,{ouvrirReponse:true}).sortEnAttente,true);
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','ressac',rousse.id).ok,true);assert.ok(duel.sorcier.main.includes('jarl-au-marteau-de-guerre'));assert.equal(rpgMobaPasserSort(duel,'sorcier').ok,true);
  assert.equal(galion.atk,4);assert.equal(galion.pv,7);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe-Rousse MOBA : capacité ciblée riposte sur sa source et non sur la voie', () => {
  const {duel,side,enemy,rousse}=fixtureRousse();duel[enemy].main=['maitre-du-marteau'];duel[enemy].mana.neige=30;
  const maitre=rpgMobaJouerCreature(duel,enemy,'maitre-du-marteau','left',0).entite;const result=rpgMobaResoudreArrivee(duel,enemy,rousse.id);assert.equal(result.ok,true,JSON.stringify(result));
  if(duel.effetCreatureEnAttente) assert.equal(rpgMobaPasserEffetCreature(duel,side).ok,true);
  assert.equal(rousse.pv,2);assert.equal(maitre.pv,1);assert.equal(mobaVoie(duel.moba,'right').hp[enemy],10);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe-Rousse MOBA : Attaque ciblée fatale riposte encore contre l’attaquant', () => {
  const {duel,side,enemy,rousse}=fixtureRousse();duel[enemy].main=['le-chasseur-d-ocracoke'];duel[enemy].mana.sable=30;duel[enemy].mana.eau=30;
  const chasseur=rpgMobaJouerCreature(duel,enemy,'le-chasseur-d-ocracoke','right',0).entite;chasseur.ready=true;const before=chasseur.pv;
  const result=rpgMobaLancerAttaque(duel,enemy,[chasseur.id],{}, {ciblesAttaque:{[chasseur.id]:rousse.id}});assert.equal(result.ok,true,JSON.stringify(result));
  assert.ok(!duel[side].creatures.includes(rousse));assert.equal(chasseur.pv,before-4);assert.equal(mobaVoie(duel.moba,'right').hp[enemy],10);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe-Rousse MOBA : Réanimation crée son jeton mais ne prend pas de proie', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;const cible=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;rpgFinDeTour(duel);
  duel.joueur.cimetiere=['la-barbe-rousse'];duel.joueur.main=['reanimation'];duel.joueur.mana.sable=30;
  const result=rpgMobaLancerMagie(duel,'joueur','reanimation',null,'left',null,{emplacementReanimation:0});assert.equal(result.ok,true,JSON.stringify(result));const rousse=duel.joueur.creatures.find(e=>e.carteId==='la-barbe-rousse');
  assert.ok(rousse);assert.ok(duel.joueur.creatures.some(e=>e.carteId==='corsaire'));assert.ok(duel.sorcier.creatures.includes(cible));assert.ok(!rousse.enCale);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe-Rousse MOBA : conquête par la première riposte évite une riposte d’une carte exilée', () => {
  const {duel,side,enemy}=fixtureRousse();const token=duel[side].creatures.find(e=>e.carteId==='corsaire');duel[enemy].main=['trait-de-braise'];duel[enemy].mana.braise=30;assert.equal(rpgMobaLancerMagie(duel,enemy,'trait-de-braise',token.id).ok,true);
  rpgFinDeTour(duel);duel[side].main=['la-barbe-rousse'];duel[side].mana.sable=30;duel[side].mana.eau=30;
  const second=rpgMobaJouerCreature(duel,side,'la-barbe-rousse','right',1).entite;assert.ok(second);rpgFinDeTour(duel);mobaInfliger(duel.moba,side,'right',6);
  duel[enemy].main=['tempete-de-sable'];duel[enemy].mana.sable=30;const result=rpgMobaLancerMagie(duel,enemy,'tempete-de-sable');assert.equal(result.ok,true);
  assert.equal(mobaVoie(duel.moba,'right').conqueredBy,side);assert.equal(result.damageEvents.filter(e=>e.contreAttaque).length,1);assert.equal(duel.log.filter(x=>x.includes('Contre-attaque : La Barbe-Rousse')).length,1);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe-Rousse MOBA : IA évite un sort qui lui ferait perdre la seconde voie', () => {
  const {duel,side,enemy,rousse}=fixtureRousse();mobaInfliger(duel.moba,side,'left',10);mobaInfliger(duel.moba,side,'right',6);duel[enemy].main=['trait-de-braise'];duel[enemy].mana.braise=30;
  let appels=0;rpgReglerHasard(duel,()=>{appels++;return .5;});const before=JSON.stringify(duel);const choix=rpgMobaChoisirMagieIA(duel,enemy);
  assert.ok(!choix || choix.cible!==rousse.id,JSON.stringify(choix));assert.equal(JSON.stringify(duel),before);assert.equal(appels,0);
});

test('IA MOBA : un blocage du Brûlot peut gagner la seconde voie sans toucher au duel ni au hasard', async () => {
  const {rpgMobaChoisirBlocagesIA}=await import('../src/games/rpgMobaAI.js');const {choisirBloqueursIA}=await import('../src/games/rpgAI.js');
  const duel=partie(),side='sorcier',enemy='joueur';rpgFinDeTour(duel);duel.sorcier.main=['le-brulot','gardienne-des-portes-de-sable'];duel.sorcier.mana.braise=30;duel.sorcier.mana.sable=30;
  const brulot=rpgMobaJouerCreature(duel,side,'le-brulot','right',0).entite;const gardienne=rpgMobaJouerCreature(duel,side,'gardienne-des-portes-de-sable','right',1).entite;rpgFinDeTour(duel);
  duel.joueur.main=['jarl-au-marteau-de-guerre'];duel.joueur.mana.neige=30;const jarl=rpgMobaJouerCreature(duel,enemy,'jarl-au-marteau-de-guerre','right',0).entite;jarl.ready=true;jarl.overkill=false;
  mobaInfliger(duel.moba,side,'left',10);mobaInfliger(duel.moba,side,'right',8);jarl.provocation=false;
  assert.equal(rpgMobaDeclarerAttaque(duel,enemy,[jarl.id]).ok,true);let appels=0;rpgReglerHasard(duel,()=>{appels++;return .5;});const before=JSON.stringify(duel);
  const classic=choisirBloqueursIA({...duel,[side]:{...duel[side],pv:10}},enemy,[jarl.id]);assert.ok(!classic[jarl.id]?.includes(brulot.id),JSON.stringify(classic));assert.ok(gardienne);
  const blocks=rpgMobaChoisirBlocagesIA(duel,enemy,[jarl.id]);assert.ok(blocks[jarl.id]?.includes(brulot.id));assert.equal(JSON.stringify(duel),before);assert.equal(appels,0);
  assert.equal(rpgMobaLancerAttaque(duel,enemy,[jarl.id],blocks,{declaree:true}).ok,true);assert.equal(duel.moba.winner,side);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe-Rousse MOBA : la riposte à un écho peut gagner au début du tour adverse', () => {
  const {duel,side,enemy,rousse}=fixtureRousse();duel[enemy].main=['nuage-de-cendres'];duel[enemy].mana.braise=30;
  const first=rpgMobaLancerMagie(duel,enemy,'nuage-de-cendres');assert.equal(first.ok,true);assert.equal(first.damageEvents[0].damage,4);assert.equal(rousse.pv,3);
  assert.equal(terminerEtPasser(duel,enemy).ok,true);mobaInfliger(duel.moba,side,'left',10);mobaInfliger(duel.moba,side,'right',2);
  assert.equal(rpgMobaTerminerTour(duel,side).reponse,enemy);const second=rpgMobaPasserFinDeTour(duel,enemy);assert.equal(second.ok,true);assert.equal(duel.moba.winner,side);assert.equal(second.damageEvents.length,1);assert.equal(second.damageEvents[0].contreAttaque,true);assert.equal(rousse.pv,2);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe-Rousse MOBA : une riposte gagnante au premier Nuage ne programme aucun écho', () => {
  const {duel,side,enemy}=fixtureRousse();mobaInfliger(duel.moba,side,'left',10);mobaInfliger(duel.moba,side,'right',6);duel[enemy].main=['nuage-de-cendres'];duel[enemy].mana.braise=30;
  const result=rpgMobaLancerMagie(duel,enemy,'nuage-de-cendres');assert.equal(result.ok,true);assert.equal(duel.moba.winner,side);assert.equal(duel[side].degatsEchos.length,0);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe-Rousse MOBA : Sabre soigne la voie source après une Contre-attaque de sort', () => {
  const duel=partie();duel.joueur.main=['la-barbe-rousse','sabre-maudit'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;duel.joueur.mana.braise=30;
  const rousse=rpgMobaJouerCreature(duel,'joueur','la-barbe-rousse','right',0).entite;const equip=rpgMobaLancerMagie(duel,'joueur','sabre-maudit',rousse.id);assert.equal(equip.ok,true,JSON.stringify(equip));
  mobaInfliger(duel.moba,'sorcier','right',3);rpgFinDeTour(duel);duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=30;
  const result=rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',rousse.id);assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.damageEvents[0].damage,6);assert.equal(mobaVoie(duel.moba,'right').hp.sorcier,4);assert.equal(mobaVoie(duel.moba,'right').hp.joueur,10);assert.equal(result.healingEvents[0].healing,3);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe-Rousse MOBA : Écueil contre l’annonce sans jeton ni prise', () => {
  const duel=partie();duel.joueur.main=['la-barbe-rousse'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;duel.sorcier.main=['ecueil'];duel.sorcier.mana.eau=30;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','la-barbe-rousse','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const result=rpgMobaLancerMagie(duel,'sorcier','ecueil');assert.equal(result.ok,true,JSON.stringify(result));assert.ok(!duel.joueur.creatures.length);assert.ok(duel.joueur.cimetiere.includes('la-barbe-rousse'));assert.equal(duel.mobaCreatureEnAttente,null);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe-Rousse MOBA : un combat ordinaire n’ajoute pas de Contre-attaque', () => {
  const {duel,enemy,rousse}=fixtureRousse();duel[enemy].main=['jarl-au-marteau-de-guerre'];duel[enemy].mana.neige=30;const jarl=rpgMobaJouerCreature(duel,enemy,'jarl-au-marteau-de-guerre','right',0).entite;jarl.ready=true;jarl.overkill=false;
  const result=rpgMobaLancerAttaque(duel,enemy,[jarl.id],{[jarl.id]:[rousse.id]});assert.equal(result.ok,true,JSON.stringify(result));assert.equal(jarl.pv,1);assert.equal(rousse.pv,2);
  assert.ok(!duel.log.some(x=>x.startsWith('Contre-attaque : La Barbe-Rousse')));assert.ok(!result.damageEvents?.length);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Barbe-Rousse MOBA : un Corsaire surnuméraire ne prend aucune case et ne bloque pas la pose', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','gardienne-des-portes-de-sable','gardienne-des-portes-de-sable','gardienne-des-portes-de-sable','la-barbe-rousse'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;
  for(const [lane,slot] of [['left',0],['left',1],['center',0],['right',0]])assert.equal(rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable',lane,slot).ok,true);
  const result=rpgMobaJouerCreature(duel,'joueur','la-barbe-rousse','right',1);assert.equal(result.ok,true,JSON.stringify(result));assert.equal(duel.joueur.creatures.length,5);assert.ok(!duel.joueur.creatures.some(e=>e.carteId==='corsaire'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for(const id of ['eirik-du-premier-serment','pourfendeur-des-djinns','veilleur-du-dernier-crepuscule'])for(const side of ['joueur','sorcier'])test(`Contre-attaque MOBA : ${id}, sort fatal et voie de ${side}`, () => {
  const duel=partie(),enemy=side==='joueur'?'sorcier':'joueur';if(side==='sorcier')rpgFinDeTour(duel);
  duel[side].main=[id];duel[side].mana.neige=30;duel[side].mana.sable=30;duel[side].mana.tenebres=30;const creature=rpgMobaJouerCreature(duel,side,id,'center',0).entite;assert.ok(creature);
  rpgFinDeTour(duel);duel[enemy].main=['trait-de-braise'];duel[enemy].mana.braise=30;creature.pv=1;
  const result=rpgMobaLancerMagie(duel,enemy,'trait-de-braise',creature.id);assert.equal(result.ok,true,JSON.stringify(result));const force=id==='eirik-du-premier-serment'?1:3;
  assert.equal(mobaVoie(duel.moba,'center').hp[enemy],10-force);assert.equal(result.damageEvents[0].cardId,id);assert.ok(duel[side].cimetiere.includes(id));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Eirik MOBA : Compagnie suit les Vikings sur toutes les voies et le départ d’une prise', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['cotre-de-course'];duel.sorcier.mana.sable=30;duel.sorcier.mana.eau=30;const pirate=rpgMobaJouerCreature(duel,'sorcier','cotre-de-course','left',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['eirik-du-premier-serment','viking-des-neiges'];duel.joueur.mana.neige=30;const eirik=rpgMobaJouerCreature(duel,'joueur','eirik-du-premier-serment','center',0).entite;
  const viking=rpgMobaJouerCreature(duel,'joueur','viking-des-neiges','right',0).entite;assert.deepEqual([eirik.atk,eirik.pvMax,eirik.pv],[2,2,2]);rpgFinDeTour(duel);
  duel.sorcier.prochaineArriveeAbordage=true;duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;
  assert.equal(rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','center',0,{ouvrirReponse:true}).creatureEnAttente,true);const capteur=rpgMobaPasserCreature(duel,'joueur').entite;
  assert.equal(rpgMobaResoudreArrivee(duel,'sorcier',viking.id).ok,true);assert.equal(capteur.enCale.entite.id,viking.id);assert.deepEqual([eirik.atk,eirik.pvMax,eirik.pv],[1,1,1]);assert.ok(pirate);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Pourfendeur MOBA : priorité Défenseur limitée à la voie de l’Attaque ciblée', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['pourfendeur-des-djinns','mousse-des-galiotes','gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;
  const defenseur=rpgMobaJouerCreature(duel,'sorcier','pourfendeur-des-djinns','left',0).entite;const autreCible=rpgMobaJouerCreature(duel,'sorcier','mousse-des-galiotes','left',1).entite;
  const cibleDroite=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;rpgFinDeTour(duel);duel.joueur.main=['le-chasseur-d-ocracoke','galion-de-la-flotte'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;
  const chasseur=rpgMobaJouerCreature(duel,'joueur','le-chasseur-d-ocracoke','left',0).entite;chasseur.ready=true;
  assert.ok(duel.sorcier.creatures.includes(defenseur));assert.equal(defenseur.defenseur,true);assert.equal(defenseur.mobaLane,'left');assert.equal(chasseur.mobaLane,'left');assert.deepEqual(rpgMobaCiblesAttaque(duel,'joueur',chasseur.id).cibles,[defenseur.id]);
  const result=rpgMobaLancerAttaque(duel,'joueur',[chasseur.id],{}, {ciblesAttaque:{[chasseur.id]:autreCible.id}});assert.equal(result.ok,false,JSON.stringify(result));assert.equal(result.raison,'cible');
  assert.equal(rpgMobaLancerAttaque(duel,'joueur',[chasseur.id],{}, {ciblesAttaque:{[chasseur.id]:defenseur.id}}).ok,true);assert.ok(cibleDroite);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Eirik MOBA : Compagnie est lue à la frappe fatale, y compris depuis une autre voie', () => {
  const duel=partie();duel.joueur.main=['eirik-du-premier-serment','viking-des-neiges'];duel.joueur.mana.neige=30;
  const eirik=rpgMobaJouerCreature(duel,'joueur','eirik-du-premier-serment','center',0).entite;rpgMobaJouerCreature(duel,'joueur','viking-des-neiges','right',0);assert.equal(eirik.atk,2);
  rpgFinDeTour(duel);duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=30;const result=rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',eirik.id);
  assert.equal(result.ok,true);assert.equal(result.damageEvents[0].damage,2);assert.equal(mobaVoie(duel.moba,'center').hp.sorcier,8);assert.equal(mobaVoie(duel.moba,'right').hp.sorcier,10);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Pourfendeur MOBA : un Défenseur dans une autre voie n’attire pas une Attaque ciblée', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['pourfendeur-des-djinns','mousse-des-galiotes'];duel.sorcier.mana.sable=30;
  const garde=rpgMobaJouerCreature(duel,'sorcier','pourfendeur-des-djinns','left',0).entite;const cible=rpgMobaJouerCreature(duel,'sorcier','mousse-des-galiotes','right',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['le-chasseur-d-ocracoke'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;const chasseur=rpgMobaJouerCreature(duel,'joueur','le-chasseur-d-ocracoke','right',0).entite;chasseur.ready=true;
  assert.deepEqual(rpgMobaCiblesAttaque(duel,'joueur',chasseur.id).cibles,[cible.id]);const result=rpgMobaLancerAttaque(duel,'joueur',[chasseur.id],{}, {ciblesAttaque:{[chasseur.id]:cible.id}});assert.equal(result.ok,true,JSON.stringify(result));assert.ok(duel.sorcier.creatures.includes(garde));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('IA MOBA : Pourfendeur est prioritaire pour une Attaque ciblée dans sa voie', async () => {
  const {rpgMobaChoisirCiblesAttaqueIA}=await import('../src/games/rpgMobaAI.js');const duel=partie();duel.joueur.main=['pourfendeur-des-djinns','mousse-des-galiotes'];duel.joueur.mana.sable=30;
  const garde=rpgMobaJouerCreature(duel,'joueur','pourfendeur-des-djinns','left',0).entite;rpgMobaJouerCreature(duel,'joueur','mousse-des-galiotes','left',1);rpgFinDeTour(duel);
  duel.sorcier.main=['le-chasseur-d-ocracoke'];duel.sorcier.mana.sable=30;duel.sorcier.mana.eau=30;const chasseur=rpgMobaJouerCreature(duel,'sorcier','le-chasseur-d-ocracoke','left',0).entite;chasseur.ready=true;
  const before=JSON.stringify(duel);assert.equal(rpgMobaChoisirCiblesAttaqueIA(duel,'sorcier',[chasseur.id])[chasseur.id],garde.id);assert.equal(JSON.stringify(duel),before);
});

test('MOBA : une Contre-attaque qui tue un Brûlot identifie sa source pour la chaîne de mort', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['pourfendeur-des-djinns'];duel.sorcier.mana.sable=30;const defenseur=rpgMobaJouerCreature(duel,'sorcier','pourfendeur-des-djinns','right',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['le-brulot'];duel.joueur.mana.braise=30;const brulot=rpgMobaJouerCreature(duel,'joueur','le-brulot','right',0).entite;brulot.ready=true;
  // Emulate a future effect granting Attaque ciblée; the normal card has none.
  brulot.coupRapide=true;const result=rpgMobaLancerAttaque(duel,'joueur',[brulot.id],{}, {ciblesAttaque:{[brulot.id]:defenseur.id}});
  assert.equal(result.ok,true,JSON.stringify(result));assert.ok(!duel.joueur.creatures.includes(brulot));assert.equal(defenseur.pv,1);assert.equal(mobaVoie(duel.moba,'right').hp.sorcier,8);assert.equal(result.damageEvents[0].cardId,'le-brulot');assert.equal(rpgMobaPlacementCoherent(duel),true);
});

function fixtureSalem(side='joueur') {
  const duel=partie(),enemy=side==='joueur'?'sorcier':'joueur';if(side==='sorcier')rpgFinDeTour(duel);
  duel[side].main=['salem'];duel[side].mana.sable=30;
  assert.equal(rpgMobaJouerCreature(duel,side,'salem','right',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const result=rpgMobaPasserCreature(duel,enemy);assert.equal(result.ok,true,JSON.stringify(result));return {duel,side,enemy,salem:result.entite};
}
for(const side of ['joueur','sorcier'])test(`Salem MOBA : arrivée annoncée, parade puis Contre-attaque depuis ${side}`, () => {
  const {duel,enemy,salem}=fixtureSalem(side);assert.equal(salem.bouclier,1);assert.equal(salem.bouclierLumiere,false);assert.equal(salem.ready,true);assert.equal(salem.coupRapide,true);
  rpgFinDeTour(duel);duel[enemy].main=['trait-de-braise','trait-de-braise'];duel[enemy].mana.braise=30;
  const premier=rpgMobaLancerMagie(duel,enemy,'trait-de-braise',salem.id);assert.equal(premier.ok,true);assert.equal(premier.bouclierBloque,true);assert.equal(salem.pv,4);assert.equal(salem.bouclier,0);assert.equal(mobaVoie(duel.moba,'right').hp[enemy],10);
  const second=rpgMobaLancerMagie(duel,enemy,'trait-de-braise',salem.id);assert.equal(second.ok,true);assert.equal(salem.pv,1);assert.equal(second.damageEvents[0].damage,3);assert.equal(second.damageEvents[0].laneId,'right');assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Salem MOBA : Rapidité et Attaque ciblée restent confinées à sa voie', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['mousse-des-galiotes','gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;
  const cible=rpgMobaJouerCreature(duel,'sorcier','mousse-des-galiotes','right',0).entite;const autre=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['salem'];duel.joueur.mana.sable=30;const salem=rpgMobaJouerCreature(duel,'joueur','salem','right',0).entite;assert.equal(salem.ready,true);
  assert.deepEqual(rpgMobaCiblesAttaque(duel,'joueur',salem.id).cibles,[cible.id]);assert.equal(rpgMobaLancerAttaque(duel,'joueur',[salem.id],{}, {ciblesAttaque:{[salem.id]:autre.id}}).raison,'cible');
  assert.equal(rpgMobaLancerAttaque(duel,'joueur',[salem.id],{}, {ciblesAttaque:{[salem.id]:cible.id}}).ok,true);assert.ok(!duel.sorcier.creatures.includes(cible));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for(const side of ['joueur','sorcier'])for(const evade of [false,true])test(`Kusayla MOBA : esquive ${evade}, riposte et Guépard (${side})`, () => {
  const duel=partie(),enemy=side==='joueur'?'sorcier':'joueur';if(side==='sorcier')rpgFinDeTour(duel);
  duel[side].main=['kusayla-roi-des-imazighen'];duel[side].mana.sable=30;duel[side].mana.tenebres=30;
  assert.equal(rpgMobaJouerCreature(duel,side,'kusayla-roi-des-imazighen','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const result=rpgMobaPasserCreature(duel,enemy);assert.equal(result.ok,true,JSON.stringify(result));const roi=result.entite;const guepard=duel[side].creatures.find(e=>e.carteId==='guepard');assert.ok(guepard?.jeton);assert.equal(guepard.mobaLane,'left');assert.equal(guepard.ready,true);
  rpgFinDeTour(duel);duel[enemy].main=['trait-de-braise'];duel[enemy].mana.braise=30;rpgReglerHasard(duel,()=>evade?0:.9);
  const hit=rpgMobaLancerMagie(duel,enemy,'trait-de-braise',roi.id);assert.equal(hit.ok,true);assert.equal(duel[side].creatures.includes(roi),evade);assert.equal(mobaVoie(duel.moba,'left').hp[enemy],5);assert.equal(hit.damageEvents[0].damage,5);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for(const side of ['joueur','sorcier'])for(const perdre of [false,true])test(`Festin MOBA : Lien Eirik ${side}, ancre retirée en réponse ${perdre}`, () => {
  const duel=partie(),enemy=side==='joueur'?'sorcier':'joueur';if(side==='sorcier')rpgFinDeTour(duel);
  duel[side].main=['eirik-du-premier-serment','gardienne-des-portes-de-sable','festin-des-vaillants'];duel[side].mana.neige=30;duel[side].mana.sable=30;
  const eirik=rpgMobaJouerCreature(duel,side,'eirik-du-premier-serment','left',0).entite;const allie=rpgMobaJouerCreature(duel,side,'gardienne-des-portes-de-sable','center',0).entite;allie.pv=1;allie.def=1;mobaInfliger(duel.moba,enemy,'right',5);
  duel[enemy].main=perdre?['trait-de-braise']:[];duel[enemy].mana.braise=30;
  const annonce=rpgMobaLancerMagie(duel,side,'festin-des-vaillants',null,'right',null,{ouvrirReponse:true});assert.equal(annonce.sortEnAttente,true,JSON.stringify(annonce));
  if(perdre){const reponse=rpgMobaLancerMagie(duel,enemy,'trait-de-braise',eirik.id);assert.equal(reponse.ok,true);assert.ok(!duel[side].creatures.includes(eirik));assert.equal(reponse.damageEvents[0].cardId,'eirik-du-premier-serment');}
  const result=rpgMobaPasserSort(duel,enemy);assert.equal(result.ok,true,JSON.stringify(result));assert.equal(allie.pv,perdre?3:4);assert.equal(mobaVoie(duel.moba,'right').hp[side],perdre?7:8);
  assert.equal(result.healingEvents[0].healing,perdre?2:3);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Festin MOBA : Lien Eirik soigne les créatures même si la voie choisie a été conquise en réponse', () => {
  const duel=partie();duel.joueur.main=['eirik-du-premier-serment','gardienne-des-portes-de-sable','festin-des-vaillants'];duel.joueur.mana.neige=30;duel.joueur.mana.sable=30;
  const eirik=rpgMobaJouerCreature(duel,'joueur','eirik-du-premier-serment','left',0).entite;const allie=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','center',0).entite;allie.pv=1;allie.def=1;mobaInfliger(duel.moba,'sorcier','right',8);
  duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=30;assert.equal(rpgMobaLancerMagie(duel,'joueur','festin-des-vaillants',null,'right',null,{ouvrirReponse:true}).sortEnAttente,true);
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise','sorcier','right').ok,true);const result=rpgMobaPasserSort(duel,'sorcier');assert.equal(result.ok,true);assert.equal(allie.pv,4);assert.equal(eirik.pv,1);assert.equal(mobaVoie(duel.moba,'right').conqueredBy,'sorcier');assert.ok(!result.healingEvents.length);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for(const card of ['salem','kusayla-roi-des-imazighen'])test(`${card} MOBA : Écueil empêche l’arrivée et Réanimation la rejoue`, () => {
  const duel=partie();duel.joueur.main=[card];duel.joueur.mana.sable=30;duel.joueur.mana.tenebres=30;duel.sorcier.main=['ecueil'];duel.sorcier.mana.eau=30;
  assert.equal(rpgMobaJouerCreature(duel,'joueur',card,'right',0,{ouvrirReponse:true}).creatureEnAttente,true);assert.equal(rpgMobaLancerMagie(duel,'sorcier','ecueil').ok,true);
  assert.equal(duel.joueur.creatures.length,0);assert.ok(duel.joueur.cimetiere.includes(card));duel.joueur.main=['reanimation'];duel.joueur.mana.sable=30;
  const result=rpgMobaLancerMagie(duel,'joueur','reanimation',null,'right',null,{emplacementReanimation:0});assert.equal(result.ok,true,JSON.stringify(result));
  const entite=duel.joueur.creatures.find(e=>e.carteId===card);assert.ok(entite);assert.equal(entite.mobaLane,'right');
  if(card==='salem') assert.equal(entite.bouclier,1);
  else {const guepard=duel.joueur.creatures.find(e=>e.carteId==='guepard');assert.ok(guepard);assert.equal(guepard.mobaLane,'right');assert.equal(guepard.ready,true);}
  assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Salem MOBA : parade absorbe une capacité hostile puis Contre-attaque la source de la suivante', () => {
  const {duel,side,enemy,salem}=fixtureSalem();rpgFinDeTour(duel);duel[enemy].main=['maitre-du-marteau','le-cavalier-de-vapeur'];duel[enemy].mana.neige=30;duel[enemy].mana.braise=30;duel[enemy].mana.eau=30;
  const maitre=rpgMobaJouerCreature(duel,enemy,'maitre-du-marteau','left',0).entite;let result=rpgMobaResoudreArrivee(duel,enemy,salem.id);assert.equal(result.ok,true);if(duel.effetCreatureEnAttente)rpgMobaPasserEffetCreature(duel,side);
  assert.equal(salem.pv,4);assert.equal(salem.bouclier,0);assert.equal(maitre.pv,5);
  const vapeur=rpgMobaJouerCreature(duel,enemy,'le-cavalier-de-vapeur','center',0).entite;result=rpgMobaResoudreArrivee(duel,enemy,salem.id);assert.equal(result.ok,true);if(duel.effetCreatureEnAttente)rpgMobaPasserEffetCreature(duel,side);
  assert.equal(salem.pv,2);assert.ok(!duel[enemy].creatures.includes(vapeur));assert.equal(mobaVoie(duel.moba,'right').hp[enemy],10);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for(const evade of [true,false])test(`Kusayla MOBA : Attaque ciblée ${evade?'esquivée':'fatale'} riposte sur l’attaquant`, () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['kusayla-roi-des-imazighen'];duel.sorcier.mana.sable=30;duel.sorcier.mana.tenebres=30;const roi=rpgMobaJouerCreature(duel,'sorcier','kusayla-roi-des-imazighen','left',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['feriel'];duel.joueur.mana.braise=30;const feriel=rpgMobaJouerCreature(duel,'joueur','feriel','left',0).entite;let count=0;rpgReglerHasard(duel,()=>++count===1?.5:(evade?0:.9));
  const result=rpgMobaLancerAttaque(duel,'joueur',[feriel.id],{}, {ciblesAttaque:{[feriel.id]:roi.id}});assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(duel.sorcier.creatures.includes(roi),evade);assert.ok(!duel.joueur.creatures.includes(feriel));assert.ok(duel.joueur.cimetiere.includes('feriel'));assert.equal(mobaVoie(duel.moba,'left').hp.joueur,10);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Kusayla MOBA : le roi légendaire ne peut être pris, le Guépard peut l’être', () => {
  const duel=partie();duel.joueur.main=['kusayla-roi-des-imazighen'];duel.joueur.mana.sable=30;duel.joueur.mana.tenebres=30;
  const roi=rpgMobaJouerCreature(duel,'joueur','kusayla-roi-des-imazighen','right',0).entite;const guepard=duel.joueur.creatures.find(e=>e.carteId==='guepard');rpgFinDeTour(duel);
  duel.sorcier.main=['la-barbe-rousse'];duel.sorcier.mana.sable=30;duel.sorcier.mana.eau=30;assert.equal(rpgMobaJouerCreature(duel,'sorcier','la-barbe-rousse','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const rousse=rpgMobaPasserCreature(duel,'joueur').entite;assert.equal(rpgMobaResoudreArrivee(duel,'sorcier',roi.id).raison,'cible');assert.equal(rpgMobaResoudreArrivee(duel,'sorcier',guepard.id).ok,true);assert.equal(rousse.enCale.entite.id,guepard.id);assert.ok(!duel.joueur.creatures.includes(guepard));
  assert.ok(duel.joueur.creatures.includes(roi));assert.ok(!duel.joueur.cimetiere.includes(roi.carteId));assert.equal(mobaVoie(duel.moba,'right').hp.sorcier,10);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Kusayla MOBA : Guépard attaque immédiatement et cesse d’exister au cimetière', () => {
  const duel=partie();duel.joueur.main=['kusayla-roi-des-imazighen'];duel.joueur.mana.sable=30;duel.joueur.mana.tenebres=30;
  rpgMobaJouerCreature(duel,'joueur','kusayla-roi-des-imazighen','left',0);const guepard=duel.joueur.creatures.find(e=>e.carteId==='guepard');
  assert.equal(rpgMobaLancerAttaque(duel,'joueur',[guepard.id],{}).ok,true);assert.equal(mobaVoie(duel.moba,'left').hp.sorcier,8);rpgFinDeTour(duel);
  duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=30;assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',guepard.id).ok,true);
  assert.ok(!duel.joueur.creatures.includes(guepard));assert.ok(!duel.joueur.cimetiere.includes('guepard'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('IA MOBA : évalue la Contre-attaque de Kusayla sans muter la partie ou son hasard', () => {
  const duel=partie();duel.joueur.main=['kusayla-roi-des-imazighen'];duel.joueur.mana.sable=30;duel.joueur.mana.tenebres=30;
  const roi=rpgMobaJouerCreature(duel,'joueur','kusayla-roi-des-imazighen','right',0).entite;mobaInfliger(duel.moba,'joueur','left',10);mobaInfliger(duel.moba,'joueur','right',5);rpgFinDeTour(duel);
  duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=30;let calls=0;rpgReglerHasard(duel,()=>{calls++;return 0;});const avant=JSON.stringify(duel);const choix=rpgMobaChoisirMagieIA(duel,'sorcier');
  assert.ok(!choix || choix.cible!==roi.id);assert.equal(JSON.stringify(duel),avant);assert.equal(calls,0);
});

for(const evade of [true,false])test(`Kusayla MOBA : blocage ordinaire, esquive ${evade}`, () => {
  const duel=partie();duel.joueur.main=['kusayla-roi-des-imazighen'];duel.joueur.mana.sable=30;duel.joueur.mana.tenebres=30;
  const roi=rpgMobaJouerCreature(duel,'joueur','kusayla-roi-des-imazighen','left',0).entite;rpgFinDeTour(duel);duel.sorcier.main=['jarl-au-marteau-de-guerre'];duel.sorcier.mana.neige=30;
  const jarl=rpgMobaJouerCreature(duel,'sorcier','jarl-au-marteau-de-guerre','left',0).entite;jarl.ready=true;jarl.overkill=false;jarl.pv=jarl.pvMax=jarl.def=10;
  rpgReglerHasard(duel,()=>evade?0:.9);const result=rpgMobaLancerAttaque(duel,'sorcier',[jarl.id],{[jarl.id]:[roi.id]});assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(duel.joueur.creatures.includes(roi),evade);assert.equal(duel.sorcier.creatures.includes(jarl),!evade);if(!evade)assert.equal(jarl.pv,5);
  assert.equal(mobaVoie(duel.moba,'left').hp.sorcier,10);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for(const card of ['salem','kusayla-roi-des-imazighen'])test(`${card} MOBA : voie conquise en réponse, aucune arrivée ni jeton`, () => {
  const duel=partie();duel.joueur.main=[card];duel.joueur.mana.sable=30;duel.joueur.mana.tenebres=30;duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=30;mobaInfliger(duel.moba,'sorcier','right',7);
  assert.equal(rpgMobaJouerCreature(duel,'joueur',card,'right',0,{ouvrirReponse:true}).creatureEnAttente,true);assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise','sorcier','right').ok,true);
  const result=rpgMobaPasserCreature(duel,'sorcier');assert.equal(result.dissipe,true);assert.ok(!duel.joueur.creatures.some(e=>e.carteId===card||e.carteId==='guepard'));assert.ok(duel.joueur.cimetiere.includes(card));
  assert.equal(mobaVoie(duel.moba,'right').conqueredBy,'sorcier');assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for(const scenario of ['voie-source-pleine','voie-inactive','plateau-plein'])test(`Kusayla MOBA : placement du Guépard, ${scenario}`, () => {
  const duel=partie();duel.joueur.mana.sable=30;duel.joueur.mana.tenebres=30;
  if(scenario==='voie-inactive')mobaInfliger(duel.moba,'sorcier','left',10);
  duel.joueur.main=['gardienne-des-portes-de-sable','gardienne-des-portes-de-sable','mousse-des-galiotes','mousse-des-galiotes','kusayla-roi-des-imazighen'];
  if(scenario==='plateau-plein')for(const [card,lane,slot] of [['gardienne-des-portes-de-sable','left',0],['gardienne-des-portes-de-sable','left',1],['mousse-des-galiotes','right',0],['mousse-des-galiotes','right',1]])assert.equal(rpgMobaJouerCreature(duel,'joueur',card,lane,slot).ok,true);
  const roi=rpgMobaJouerCreature(duel,'joueur','kusayla-roi-des-imazighen','center',0);assert.equal(roi.ok,true,JSON.stringify(roi));const guepard=duel.joueur.creatures.find(e=>e.carteId==='guepard');
  if(scenario==='plateau-plein')assert.equal(guepard,undefined);else {assert.ok(guepard);assert.equal(guepard.mobaLane,scenario==='voie-inactive'?'right':'left');assert.equal(guepard.ready,true);}
  assert.equal(rpgMobaPlacementCoherent(duel),true);
});

function fixtureDame(side='joueur', lane='right') {
  const duel=partie(), enemy=side==='joueur'?'sorcier':'joueur';if(side==='sorcier')rpgFinDeTour(duel);
  duel[side].main=['dame-aux-ailes-d-or'];duel[side].mana.sable=30;
  assert.equal(rpgMobaJouerCreature(duel,side,'dame-aux-ailes-d-or',lane,0,{ouvrirReponse:true}).creatureEnAttente,true);
  const result=rpgMobaPasserCreature(duel,enemy);assert.equal(result.ok,true,JSON.stringify(result));return {duel,side,enemy,dame:result.entite};
}

for(const side of ['joueur','sorcier'])test(`Dame MOBA : lumière absorbe la magie puis la mort soigne sa voie (${side})`, () => {
  const {duel,enemy,dame}=fixtureDame(side);mobaInfliger(duel.moba,enemy,'right',7);const classic=duel[side].pv;rpgFinDeTour(duel);duel[enemy].mana.braise=30;duel[enemy].main=['trait-de-braise','trait-de-braise','trait-de-braise'];
  const premier=rpgMobaLancerMagie(duel,enemy,'trait-de-braise',dame.id);assert.equal(premier.ok,true);assert.equal(dame.pv,5);assert.equal(dame.bouclierLumiere,false);assert.ok(!premier.healingEvents?.length);
  assert.equal(rpgMobaLancerMagie(duel,enemy,'trait-de-braise',dame.id).ok,true);assert.equal(dame.pv,2);
  const fatal=rpgMobaLancerMagie(duel,enemy,'trait-de-braise',dame.id);assert.equal(fatal.ok,true);assert.ok(!duel[side].creatures.includes(dame));assert.equal(mobaVoie(duel.moba,'right').hp[side],8);assert.equal(mobaVoie(duel.moba,'left').hp[side],10);assert.equal(duel[side].pv,classic);
  assert.deepEqual(fatal.healingEvents.map(({side,laneId,healing,cardId})=>({side,laneId,healing,cardId})),[{side,laneId:'right',healing:5,cardId:'dame-aux-ailes-d-or'}]);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Dame MOBA : dégâts de capacités ennemies et alliées prévenus sans briser la lumière', () => {
  const {duel,side,enemy,dame}=fixtureDame();duel.joueur.main=['valkyrie-des-glaces'];duel.joueur.mana.neige=30;
  const ally=rpgMobaJouerCreature(duel,side,'valkyrie-des-glaces','left',0);assert.equal(ally.ok,true);assert.equal(dame.pv,5);assert.equal(dame.bouclierLumiere,true);
  rpgFinDeTour(duel);duel[enemy].main=['maitre-du-marteau'];duel[enemy].mana.neige=30;assert.equal(rpgMobaJouerCreature(duel,enemy,'maitre-du-marteau','center',0).ok,true);
  assert.equal(rpgMobaResoudreArrivee(duel,enemy,dame.id).ok,true);if(duel.effetCreatureEnAttente)assert.equal(rpgMobaPasserEffetCreature(duel,side).ok,true);
  assert.equal(dame.pv,5);assert.equal(dame.bouclierLumiere,true);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Dame MOBA : une vague alliée ne brise pas la lumière, une vague ennemie la brise', () => {
  const {duel,side,enemy,dame}=fixtureDame();duel[side].main=['tempete-de-foudre-et-de-givre'];duel[side].mana.neige=30;duel[side].mana.braise=30;
  assert.equal(rpgMobaLancerMagie(duel,side,'tempete-de-foudre-et-de-givre').ok,true);assert.equal(dame.pv,5);assert.equal(dame.bouclierLumiere,true);
  rpgFinDeTour(duel);duel[enemy].main=['tempete-de-foudre-et-de-givre'];duel[enemy].mana.neige=30;duel[enemy].mana.braise=30;
  assert.equal(rpgMobaLancerMagie(duel,enemy,'tempete-de-foudre-et-de-givre').ok,true);assert.equal(dame.pv,5);assert.equal(dame.bouclierLumiere,false);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Dame MOBA : la lumière ne prévient pas une destruction, le soin est plafonné', () => {
  const {duel,side,enemy,dame}=fixtureDame();mobaInfliger(duel.moba,enemy,'right',2);rpgFinDeTour(duel);duel[enemy].main=['le-jugement-des-colosses'];duel[enemy].mana.tenebres=30;
  const result=rpgMobaLancerMagie(duel,enemy,'le-jugement-des-colosses',dame.id);assert.equal(result.ok,true,JSON.stringify(result));assert.ok(!duel[side].creatures.includes(dame));assert.equal(mobaVoie(duel.moba,'right').hp[side],13);assert.equal(result.healingEvents[0].healing,5);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for(const side of ['joueur','sorcier'])for(const perdu of [false,true])test(`Rempart MOBA : Lien de la Dame ${side}, ancre renvoyée ${perdu}`, () => {
  const {duel,enemy,dame}=fixtureDame(side,'left');duel[side].main=['gardienne-des-portes-de-sable','rempart-de-dunes'];duel[side].mana.sable=30;
  const allie=rpgMobaJouerCreature(duel,side,'gardienne-des-portes-de-sable','right',0).entite;duel[enemy].main=perdu?['ressac']:[];duel[enemy].mana.eau=30;
  const annonce=rpgMobaLancerMagie(duel,side,'rempart-de-dunes',null,null,null,{ouvrirReponse:true});assert.equal(annonce.sortEnAttente,true,JSON.stringify(annonce));
  if(perdu) {assert.equal(rpgMobaLancerMagie(duel,enemy,'ressac',dame.id).ok,true);assert.ok(!duel[side].creatures.includes(dame));}
  const result=rpgMobaPasserSort(duel,enemy);assert.equal(result.ok,true,JSON.stringify(result));assert.equal(allie.pv,7);assert.equal(allie.bouclier,perdu?0:1);
  if(!perdu){assert.equal(dame.bouclier,1);assert.equal(dame.bouclierLumiere,true);assert.equal(dame.pv,8);}
  assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Dame MOBA : Écueil contre son arrivée et Réanimation rend la lumière', () => {
  const duel=partie();duel.joueur.main=['dame-aux-ailes-d-or'];duel.joueur.mana.sable=30;duel.sorcier.main=['ecueil'];duel.sorcier.mana.eau=30;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','dame-aux-ailes-d-or','right',0,{ouvrirReponse:true}).creatureEnAttente,true);assert.equal(rpgMobaLancerMagie(duel,'sorcier','ecueil').ok,true);assert.equal(duel.joueur.creatures.length,0);
  duel.joueur.main=['reanimation'];const result=rpgMobaLancerMagie(duel,'joueur','reanimation',null,'right',null,{emplacementReanimation:0});assert.equal(result.ok,true,JSON.stringify(result));const dame=duel.joueur.creatures.find(e=>e.carteId==='dame-aux-ailes-d-or');assert.equal(dame.bouclierLumiere,true);assert.equal(dame.mobaLane,'right');assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Dame MOBA : attaque ciblée retire la lumière, combat volant ultérieur soigne à la mort', () => {
  const {duel,side,enemy,dame}=fixtureDame();mobaInfliger(duel.moba,enemy,'right',6);rpgFinDeTour(duel);duel[enemy].main=['feriel','valkyrie-des-glaces'];duel[enemy].mana.braise=30;duel[enemy].mana.neige=30;
  const feriel=rpgMobaJouerCreature(duel,enemy,'feriel','right',0).entite;rpgReglerHasard(duel,()=>.5);
  const ciblee=rpgMobaLancerAttaque(duel,enemy,[feriel.id],{}, {ciblesAttaque:{[feriel.id]:dame.id}});assert.equal(ciblee.ok,true);assert.equal(dame.bouclierLumiere,false);assert.equal(dame.pv,5);
  terminerEtPasser(duel,enemy);terminerEtPasser(duel,side);duel[enemy].mana.neige=30;duel[enemy].main=['valkyrie-des-glaces'];const valk=rpgMobaJouerCreature(duel,enemy,'valkyrie-des-glaces','right',1).entite;
  assert.equal(dame.pv,4,duel.log.slice(-12).join('\n'));valk.ready=true;valk.atk=5;const combat=rpgMobaLancerAttaque(duel,enemy,[valk.id],{[valk.id]:[dame.id]});assert.equal(combat.ok,true,JSON.stringify(combat));assert.ok(!duel[side].creatures.includes(dame));assert.equal(mobaVoie(duel.moba,'right').hp[side],9);assert.equal(combat.healingEvents[0].healing,5);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Dame MOBA : prise en cale et conquête ne déclenchent pas son soin de mort', () => {
  const {duel,side,enemy,dame}=fixtureDame();mobaInfliger(duel.moba,enemy,'right',6);rpgFinDeTour(duel);duel[enemy].main=['la-barbe-rousse'];duel[enemy].mana.sable=30;duel[enemy].mana.eau=30;
  assert.equal(rpgMobaJouerCreature(duel,enemy,'la-barbe-rousse','left',0,{ouvrirReponse:true}).creatureEnAttente,true);const rousse=rpgMobaPasserCreature(duel,side).entite;const prise=rpgMobaResoudreArrivee(duel,enemy,dame.id);assert.equal(prise.ok,true,JSON.stringify(prise));assert.equal(rousse.enCale.entite.id,dame.id);assert.equal(dame.bouclierLumiere,true);assert.equal(mobaVoie(duel.moba,'right').hp[side],4);assert.ok(!prise.healingEvents?.length);assert.equal(rpgMobaPlacementCoherent(duel),true);
  const autre=fixtureDame();mobaInfliger(autre.duel.moba,autre.enemy,'right',7);rpgFinDeTour(autre.duel);autre.duel[autre.enemy].main=['trait-de-braise'];autre.duel[autre.enemy].mana.braise=30;
  const conquete=rpgMobaLancerMagie(autre.duel,autre.enemy,'trait-de-braise','sorcier','right');assert.equal(conquete.ok,true);assert.equal(mobaVoie(autre.duel.moba,'right').conqueredBy,autre.enemy);assert.ok(!conquete.healingEvents?.length);assert.ok(!autre.duel[autre.side].cimetiere.includes('dame-aux-ailes-d-or'));assert.equal(rpgMobaPlacementCoherent(autre.duel),true);
});

test('Dame MOBA : l’écho de Nuage déclenche le soin à la bonne fin de tour', () => {
  const {duel,side,enemy,dame}=fixtureDame();mobaInfliger(duel.moba,enemy,'right',7);rpgFinDeTour(duel);duel[enemy].main=['nuage-de-cendres'];duel[enemy].mana.braise=30;
  assert.equal(rpgMobaLancerMagie(duel,enemy,'nuage-de-cendres').ok,true);assert.equal(dame.bouclierLumiere,false);dame.pv=dame.def=1;
  assert.equal(terminerEtPasser(duel,enemy).ok,true);const result=terminerEtPasser(duel,side);assert.equal(result.ok,true);assert.ok(!duel[side].creatures.includes(dame));assert.equal(mobaVoie(duel.moba,'right').hp[side],8);assert.equal(result.healingEvents[0].healing,5);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Dame MOBA : parade et lumière restent distinctes face aux magies adverses', () => {
  const {duel,side,enemy,dame}=fixtureDame();rpgFinDeTour(duel);duel[side].main=['rempart-de-dunes'];duel[side].mana.sable=30;
  duel[enemy].main=['poigne-de-givre','poigne-de-givre','poigne-de-givre'];duel[enemy].mana.neige=30;
  assert.equal(rpgMobaLancerMagie(duel,enemy,'poigne-de-givre',dame.id,null,null,{ouvrirReponse:true}).sortEnAttente,true);
  assert.equal(rpgMobaLancerMagie(duel,side,'rempart-de-dunes').ok,true);assert.equal(dame.bouclier,1);assert.equal(dame.bouclierLumiere,true);
  assert.equal(rpgMobaPasserSort(duel,side).bouclierBloque,true);assert.equal(dame.bouclier,0);assert.equal(dame.bouclierLumiere,true);assert.equal(dame.pv,8);assert.ok(!(dame.gelToursRestants>0));
  assert.equal(rpgMobaLancerMagie(duel,enemy,'poigne-de-givre',dame.id).ok,true);assert.equal(dame.bouclierLumiere,false);assert.equal(dame.pv,8);assert.ok(!(dame.gelToursRestants>0));
  assert.equal(rpgMobaLancerMagie(duel,enemy,'poigne-de-givre',dame.id).ok,true);assert.equal(dame.pv,6);assert.ok(dame.gelToursRestants>0);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Dame MOBA : IA simule la protection et le soin de mort sans muter le duel ni le hasard', () => {
  const {duel,side,enemy,dame}=fixtureDame();mobaInfliger(duel.moba,enemy,'right',5);rpgFinDeTour(duel);duel[enemy].main=['trait-de-braise'];duel[enemy].mana.braise=30;
  let appels=0;rpgReglerHasard(duel,()=>{appels++;return .5;});const before=JSON.stringify(duel);const choix=rpgMobaChoisirMagieIA(duel,enemy);
  assert.equal(JSON.stringify(duel),before);assert.equal(appels,0);if(choix?.cible===dame.id){const result=rpgMobaLancerMagie(duel,enemy,choix.id,choix.cible,choix.lane,choix.prixLane);assert.equal(result.ok,true);assert.equal(dame.pv,5);assert.equal(mobaVoie(duel.moba,'right').hp[side],5);}
});

test('Dame MOBA : mort simultanée après un Brûlot gagnant ne soigne pas après victoire', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['le-brulot'];duel.sorcier.mana.braise=30;const brulot=rpgMobaJouerCreature(duel,'sorcier','le-brulot','right',0).entite;brulot.envol=true;brulot.atk=5;rpgFinDeTour(duel);
  duel.joueur.main=['dame-aux-ailes-d-or'];duel.joueur.mana.sable=30;const dame=rpgMobaJouerCreature(duel,'joueur','dame-aux-ailes-d-or','right',0).entite;dame.ready=true;dame.bouclierLumiere=false;
  mobaInfliger(duel.moba,'sorcier','left',10);mobaInfliger(duel.moba,'sorcier','right',8);
  const result=rpgMobaLancerAttaque(duel,'joueur',[dame.id],{[dame.id]:[brulot.id]});assert.equal(result.ok,true,JSON.stringify(result));assert.equal(duel.moba.winner,'sorcier');assert.ok(!result.healingEvents.length);assert.equal(mobaVoie(duel.moba,'right').hp.joueur,0);
});

test('Ghul MOBA : mort déclenche un choix obligatoire dans toutes les voies actives', () => {
  const duel=partie();duel.joueur.main=['ghul-des-cendres'];duel.joueur.mana.braise=30;const ghul=rpgMobaJouerCreature(duel,'joueur','ghul-des-cendres','right',0).entite;
  rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable','mousse-des-galiotes','trait-de-braise'];duel.sorcier.mana.sable=30;duel.sorcier.mana.braise=30;
  const a=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;const b=rpgMobaJouerCreature(duel,'sorcier','mousse-des-galiotes','center',0).entite;b.pv=1;b.def=1;
  const mort=rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',ghul.id);assert.equal(mort.ok,true);assert.ok(!duel.joueur.creatures.includes(ghul));assert.deepEqual(new Set(rpgMobaCiblesDestruction(duel,'joueur')),new Set([a.id,b.id]));
  assert.equal(rpgMobaTerminerTour(duel,'sorcier').raison,'timing');const before=JSON.stringify(duel);assert.equal(rpgMobaResoudreDestruction(duel,'sorcier',a.id).raison,'aucune-attente');assert.equal(rpgMobaResoudreDestruction(duel,'joueur',ghul.id).raison,'cible');assert.equal(JSON.stringify(duel),before);
  const result=rpgMobaResoudreDestruction(duel,'joueur',b.id);assert.equal(result.ok,true,JSON.stringify(result));assert.ok(!duel.sorcier.creatures.includes(b));assert.equal(a.pv,4);assert.equal(duel.destructionsEnAttente.length,0);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Ghul MOBA : parade et protection limitent correctement la cible et son impact', () => {
  const duel=partie();duel.joueur.main=['ghul-des-cendres'];duel.joueur.mana.braise=30;const ghul=rpgMobaJouerCreature(duel,'joueur','ghul-des-cendres','left',0).entite;
  rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable','trait-de-braise'];duel.sorcier.mana.sable=30;duel.sorcier.mana.braise=30;
  const cible=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;cible.bouclier=1;
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',ghul.id).ok,true);const result=rpgMobaResoudreDestruction(duel,'joueur',cible.id);assert.equal(result.ok,true);assert.equal(cible.pv,4);assert.equal(cible.bouclier,0);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Ghul MOBA : le Ghul IA choisit automatiquement et n’ouvre pas d’attente humaine', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable'];duel.joueur.mana.sable=30;const cible=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;rpgFinDeTour(duel);
  duel.sorcier.main=['ghul-des-cendres'];duel.sorcier.mana.braise=30;const ghul=rpgMobaJouerCreature(duel,'sorcier','ghul-des-cendres','left',0).entite;rpgFinDeTour(duel);duel.joueur.main=['trait-de-braise'];duel.joueur.mana.braise=30;
  const mort=rpgMobaLancerMagie(duel,'joueur','trait-de-braise',ghul.id);assert.equal(mort.ok,true);assert.equal(cible.pv,3);assert.ok(!duel.destructionsEnAttente?.length);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Ghul MOBA : une vague simultanée sans survivants dissipe l’attente', () => {
  const duel=partie();duel.joueur.main=['ghul-des-cendres'];duel.joueur.mana.braise=30;rpgMobaJouerCreature(duel,'joueur','ghul-des-cendres','left',0);rpgFinDeTour(duel);
  duel.sorcier.main=['mousse-des-galiotes'];duel.sorcier.mana.sable=30;rpgMobaJouerCreature(duel,'sorcier','mousse-des-galiotes','right',0);rpgFinDeTour(duel);
  duel.joueur.main=['tempete-de-foudre-et-de-givre'];duel.joueur.mana.neige=30;duel.joueur.mana.braise=30;const result=rpgMobaLancerMagie(duel,'joueur','tempete-de-foudre-et-de-givre');assert.equal(result.ok,true);assert.ok(!duel.destructionsEnAttente?.length);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Ghul MOBA : sa cible peut annuler l’attaque déclarée avant la reprise du combat', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['le-brulot'];duel.sorcier.mana.braise=30;const brulot=rpgMobaJouerCreature(duel,'sorcier','le-brulot','left',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['ghul-des-cendres','gardienne-des-portes-de-sable'];duel.joueur.mana.braise=30;duel.joueur.mana.sable=30;
  const ghul=rpgMobaJouerCreature(duel,'joueur','ghul-des-cendres','right',0).entite;const attaquant=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;attaquant.ready=true;mobaInfliger(duel.moba,'sorcier','left',8);
  assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[attaquant.id]).ok,true);duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=30;
  const mort=rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',ghul.id);assert.equal(mort.ok,true);assert.ok(duel.combatDeclare);assert.deepEqual(rpgMobaCiblesDestruction(duel,'joueur'),[brulot.id]);
  const result=rpgMobaResoudreDestruction(duel,'joueur',brulot.id);assert.equal(result.ok,true);assert.equal(result.combatTermine,true);assert.equal(duel.combatDeclare,null);assert.equal(mobaVoie(duel.moba,'left').conqueredBy,'sorcier');assert.ok(!duel.joueur.creatures.includes(attaquant));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Ghul MOBA : les morts simultanées sont résolues dans l’ordre, sans cible périmée', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;const cible=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['ghul-des-cendres','ghul-des-cendres','grand-hiver'];duel.joueur.mana.neige=30;duel.joueur.mana.braise=30;
  rpgMobaJouerCreature(duel,'joueur','ghul-des-cendres','left',0);rpgMobaJouerCreature(duel,'joueur','ghul-des-cendres','left',1);assert.equal(rpgMobaLancerMagie(duel,'joueur','grand-hiver').ok,true);
  assert.equal(duel.destructionsEnAttente.length,2);assert.equal(cible.pv,3);assert.equal(rpgMobaResoudreDestruction(duel,'joueur',cible.id).ok,true);assert.equal(cible.pv,2);assert.equal(duel.destructionsEnAttente.length,1);
  assert.equal(rpgMobaResoudreDestruction(duel,'joueur',cible.id).ok,true);assert.equal(cible.pv,1);assert.equal(duel.destructionsEnAttente.length,0);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Ghul MOBA : la résistance aux sorts de braise ne bloque pas sa capacité', () => {
  const duel=partie();duel.joueur.main=['ghul-des-cendres'];duel.joueur.mana.braise=30;const ghul=rpgMobaJouerCreature(duel,'joueur','ghul-des-cendres','left',0).entite;rpgFinDeTour(duel);
  duel.sorcier.main=['gardienne-des-portes-de-sable','trait-de-braise'];duel.sorcier.mana.sable=30;duel.sorcier.mana.braise=30;const cible=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;cible.protection={contre:['braise']};
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',ghul.id).ok,true);assert.deepEqual(rpgMobaCiblesDestruction(duel,'joueur'),[cible.id]);assert.equal(rpgMobaResoudreDestruction(duel,'joueur',cible.id).ok,true);assert.equal(cible.pv,3);assert.deepEqual(cible.protection,{contre:['braise']});
});

test('Ghul MOBA : sa prise en cale ne déclenche pas sa mort', () => {
  const duel=partie();duel.joueur.main=['ghul-des-cendres'];duel.joueur.mana.braise=30;const ghul=rpgMobaJouerCreature(duel,'joueur','ghul-des-cendres','left',0).entite;rpgFinDeTour(duel);
  duel.sorcier.main=['la-barbe-rousse'];duel.sorcier.mana.sable=30;duel.sorcier.mana.eau=30;assert.equal(rpgMobaJouerCreature(duel,'sorcier','la-barbe-rousse','right',0,{ouvrirReponse:true}).creatureEnAttente,true);
  const rousse=rpgMobaPasserCreature(duel,'joueur').entite;assert.equal(rpgMobaResoudreArrivee(duel,'sorcier',ghul.id).ok,true);assert.equal(rousse.enCale.entite.id,ghul.id);assert.ok(!duel.destructionsEnAttente?.length);assert.ok(!duel.joueur.cimetiere.includes('ghul-des-cendres'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Chercheuse MOBA : recherche classique sans arme imprimée, même en présence du Sabre maudit', () => {
  assert.ok(MOBA_CARTES_AUTORISEES.includes('chercheuse-des-armes-ensevelies'));
  assert.deepEqual(MOBA_CARTES_AUTORISEES.filter((id) => cardById(id)?.kind === 'arme'), ['javelot-du-beffroi', 'cuirasse-de-sel', 'braise-et-sable', 'takouba-des-pistes', 'armure-de-cendres', 'sabre-du-croissant-noir', 'hache-de-la-banquise', 'lance-de-givre', 'khopesh-d-or', 'licou-du-chien-de-sable', 'harnais-du-mehari', 'masque-du-guetteur', 'jitte-d-amayas', 'lance-de-la-lune-givree', 'sandales-de-tislit', 'grappin-d-abordage', 'baton-des-citernes', 'lame-des-ergs', 'takouba-de-tin-hinan', 'sphere-de-rotation'], 'réauditer la recherche quand une autre arme imprimée est autorisée');
  assert.equal(cardById('sabre-maudit').kind, 'magie');
  for (const side of ['joueur','sorcier']) {
    const duel=partie();if(side==='sorcier')rpgFinDeTour(duel);
    duel[side].main=['chercheuse-des-armes-ensevelies'];duel[side].deck=['sabre-maudit','trait-de-braise','gardienne-des-portes-de-sable'];duel[side].mana.sable=20;duel[side].mana.braise=20;
    let appels=0;rpgReglerHasard(duel,()=>{appels++;return .5;});const deck=[...duel[side].deck];const result=rpgMobaJouerCreature(duel,side,'chercheuse-des-armes-ensevelies','right',1);
    assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.entite.mobaLane,'right');assert.deepEqual(duel[side].deck,deck);assert.deepEqual(duel[side].main,[]);assert.equal(appels,0);assert.ok(!duel.mobaRechercheEnAttente);assert.match(duel.log.at(-1),/ne trouve aucune carte de type Arme/);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Chercheuse MOBA : l’annonce contrecarrée ne cherche pas, Réanimation rejoue la recherche', () => {
  const duel=partie();duel.joueur.main=['chercheuse-des-armes-ensevelies'];duel.joueur.mana.sable=30;duel.joueur.mana.braise=30;duel.joueur.deck=['sabre-maudit'];duel.sorcier.main=['ecueil'];duel.sorcier.mana.eau=30;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','chercheuse-des-armes-ensevelies','right',0,{ouvrirReponse:true}).creatureEnAttente,true);
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','ecueil').contre,true);assert.deepEqual(duel.joueur.deck,['sabre-maudit']);assert.ok(duel.joueur.cimetiere.includes('chercheuse-des-armes-ensevelies'));assert.ok(!duel.joueur.creatures.length);
  duel.joueur.main=['reanimation'];const avant=duel.log.length;const retour=rpgMobaLancerMagie(duel,'joueur','reanimation',null,'left',null,{emplacementReanimation:0});assert.equal(retour.ok,true,JSON.stringify(retour));
  assert.equal(duel.joueur.creatures[0].carteId,'chercheuse-des-armes-ensevelies');assert.equal(duel.joueur.creatures[0].mobaLane,'left');assert.deepEqual(duel.joueur.deck,['sabre-maudit']);assert.ok(duel.log.slice(avant).some(line=>line.includes('ne trouve aucune carte de type Arme')));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Chercheuse MOBA : Lettre de marque choisit une prise sans remplacer la recherche', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['mousse-des-galiotes'];duel.sorcier.mana.sable=30;const proie=rpgMobaJouerCreature(duel,'sorcier','mousse-des-galiotes','left',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['lettre-de-marque','chercheuse-des-armes-ensevelies'];duel.joueur.deck=['sabre-maudit','gardienne-des-portes-de-sable'];duel.joueur.mana.eau=30;duel.joueur.mana.sable=30;duel.joueur.mana.braise=30;
  assert.equal(rpgMobaLancerMagie(duel,'joueur','lettre-de-marque').ok,true);const deck=[...duel.joueur.deck];const pose=rpgMobaJouerCreature(duel,'joueur','chercheuse-des-armes-ensevelies','right',0,{ouvrirReponse:true});assert.equal(pose.creatureEnAttente,true);
  const result=rpgMobaPasserCreature(duel,'sorcier');assert.equal(result.ok,true,JSON.stringify(result));assert.deepEqual(duel.joueur.deck,deck);assert.equal(rpgMobaResoudreArrivee(duel,'joueur',proie.id).ok,true);assert.equal(result.entite.enCale.entite.id,proie.id);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Chercheuse MOBA : coût bicolore et conquête en réponse respectent la réservation', () => {
  const duel=partie();duel.joueur.main=['chercheuse-des-armes-ensevelies'];duel.joueur.mana.sable=30;duel.joueur.mana.braise=0;const avant=JSON.stringify(duel);
  assert.equal(rpgMobaJouerCreature(duel,'joueur','chercheuse-des-armes-ensevelies','right',0,{ouvrirReponse:true}).raison,'mana');assert.equal(JSON.stringify(duel),avant);
  duel.joueur.mana.braise=30;mobaInfliger(duel.moba,'sorcier','right',8);duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=30;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','chercheuse-des-armes-ensevelies','right',0,{ouvrirReponse:true}).creatureEnAttente,true);
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise','sorcier','right').ok,true);assert.equal(mobaVoie(duel.moba,'right').conqueredBy,'sorcier');
  const result=rpgMobaPasserCreature(duel,'sorcier');assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.dissipe,true);assert.ok(duel.joueur.cimetiere.includes('chercheuse-des-armes-ensevelies'));assert.ok(!duel.joueur.creatures.some(e=>e.carteId==='chercheuse-des-armes-ensevelies'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Javelot MOBA : la Chercheuse trouve une arme imprimée au hasard, jamais le Sabre', () => {
  for (const side of ['joueur','sorcier']) {
    const duel=partie();if(side==='sorcier')rpgFinDeTour(duel);duel[side].main=['chercheuse-des-armes-ensevelies'];duel[side].deck=['sabre-maudit','javelot-du-beffroi','trait-de-braise','javelot-du-beffroi'];duel[side].mana.sable=20;duel[side].mana.braise=20;
    let appels=0;rpgReglerHasard(duel,()=>{appels++;return .99;});const result=rpgMobaJouerCreature(duel,side,'chercheuse-des-armes-ensevelies','right',0);
    assert.equal(result.ok,true,JSON.stringify(result));assert.deepEqual(duel[side].main,['javelot-du-beffroi']);assert.deepEqual(duel[side].deck,['sabre-maudit','javelot-du-beffroi','trait-de-braise']);assert.equal(appels,1);assert.ok(!duel.mobaRechercheEnAttente);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Javelot MOBA : attachement allié, ciblage de voie et durabilité de combat', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable'];duel.joueur.mana.sable=30;const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;rpgFinDeTour(duel);
  duel.sorcier.main=['gardienne-des-portes-de-sable','gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;const cible=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;const ailleurs=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['javelot-du-beffroi'];duel.joueur.mana.sable=30;const attach=rpgMobaJouerArme(duel,'joueur','javelot-du-beffroi',porteur.id);assert.equal(attach.ok,true,JSON.stringify(attach));assert.equal(porteur.atk,3);assert.equal(porteur.coupRapide,true);assert.equal(porteur.arme.carteId,'javelot-du-beffroi');assert.equal(porteur.arme.durabilite,1);
  const choix=rpgMobaCiblesAttaque(duel,'joueur',porteur.id);assert.deepEqual(choix.cibles,[cible.id]);assert.equal(choix.obligatoires,true);assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[porteur.id],{[porteur.id]:ailleurs.id}).ok,false);
  assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[porteur.id],{[porteur.id]:cible.id}).ok,true);const combat=rpgMobaLancerAttaque(duel,'joueur',[porteur.id],{}, {declaree:true});assert.equal(combat.ok,true,JSON.stringify(combat));
  assert.equal(porteur.arme,null);assert.equal(porteur.atk,1);assert.equal(porteur.coupRapide,false);assert.ok(duel.joueur.cimetiere.includes('javelot-du-beffroi'));assert.equal(ailleurs.pv,4);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Javelot MOBA : seul le contre de carte peut intercepter une annonce payée', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable'];duel.joueur.mana.sable=30;const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
  duel.joueur.main=['javelot-du-beffroi','javelot-du-beffroi'];duel.sorcier.main=['ecueil','silence-decume','contresort-des-abimes'];duel.sorcier.mana.eau=30;
  const pose=rpgMobaJouerArme(duel,'joueur','javelot-du-beffroi',porteur.id,{ouvrirReponse:true});assert.equal(pose.sortEnAttente,true);assert.equal(duel.joueur.main.filter(id=>id==='javelot-du-beffroi').length,1);const mana=duel.joueur.mana.sable;
  for (const id of ['ecueil','silence-decume']) {const snapshot=JSON.stringify(duel);assert.equal(rpgMobaLancerMagie(duel,'sorcier',id).ok,false);assert.equal(JSON.stringify(duel),snapshot);}
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','contresort-des-abimes').contre,true);assert.equal(duel.joueur.mana.sable,mana);assert.equal(duel.joueur.main.filter(id=>id==='javelot-du-beffroi').length,1);assert.equal(duel.joueur.cimetiere.filter(id=>id==='javelot-du-beffroi').length,1);assert.equal(porteur.arme,null);assert.equal(duel.mobaSortEnAttente,null);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Javelot MOBA : porteur perdu pendant la réponse dissipe l’arme réservée', () => {
  const duel=partie();duel.joueur.main=['mousse-des-galiotes','javelot-du-beffroi'];duel.joueur.mana.sable=30;const porteur=rpgMobaJouerCreature(duel,'joueur','mousse-des-galiotes','right',0).entite;duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=30;
  assert.equal(rpgMobaJouerArme(duel,'joueur','javelot-du-beffroi',porteur.id,{ouvrirReponse:true}).sortEnAttente,true);assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',porteur.id).ok,true);
  const result=rpgMobaPasserSort(duel,'sorcier');assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.dissipe,true);assert.match(duel.log.at(-1),/Javelot du beffroi.*arme ne peut pas être attachée/);assert.equal(duel.joueur.cimetiere.filter(id=>id==='javelot-du-beffroi').length,1);assert.ok(!duel.joueur.creatures.length);assert.equal(duel.mobaSortEnAttente,null);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Javelot MOBA : la réanimation ignore l’arme au sommet du cimetière', () => {
  const duel=partie();duel.joueur.cimetiere=['mousse-des-galiotes','javelot-du-beffroi'];duel.joueur.main=['reanimation'];duel.joueur.mana.sable=30;
  const result=rpgMobaLancerMagie(duel,'joueur','reanimation',null,'left',null,{emplacementReanimation:0});assert.equal(result.ok,true,JSON.stringify(result));assert.equal(duel.joueur.creatures[0].carteId,'mousse-des-galiotes');assert.deepEqual(duel.joueur.cimetiere,['javelot-du-beffroi','reanimation']);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Javelot MOBA : le bouclier anti-sort ne bloque pas l’arme alliée, les autres armes restent interdites', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable'];duel.joueur.mana.sable=30;const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','center',0).entite;
  porteur.bouclier=1;porteur.protection={contre:['sable']};duel.joueur.main=['javelot-du-beffroi','pilon-du-fossoyeur'];const before=JSON.stringify(duel);
  assert.equal(rpgMobaJouerArme(duel,'joueur','pilon-du-fossoyeur',porteur.id).raison,'effet-non-pris-en-charge');assert.equal(rpgMobaJouerArme(duel,'joueur','javelot-du-beffroi','intrus').raison,'cible');assert.equal(JSON.stringify(duel),before);
  const result=rpgMobaJouerArme(duel,'joueur','javelot-du-beffroi',porteur.id,{ouvrirReponse:true});assert.equal(result.ok,true,JSON.stringify(result));assert.equal(rpgMobaPasserSort(duel,'sorcier').ok,true);assert.equal(porteur.arme.carteId,'javelot-du-beffroi');assert.equal(porteur.bouclier,1);assert.deepEqual(porteur.protection,{contre:['sable']});assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Javelot MOBA : Brise-lame détruit le Javelot et le Sabre cumulés', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','sabre-maudit','javelot-du-beffroi'];duel.joueur.mana.sable=30;duel.joueur.mana.braise=30;const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
  assert.equal(rpgMobaLancerMagie(duel,'joueur','sabre-maudit',porteur.id).ok,true);assert.equal(rpgMobaJouerArme(duel,'joueur','javelot-du-beffroi',porteur.id).ok,true);assert.deepEqual(porteur.armes,['sabre-maudit']);assert.equal(porteur.arme.carteId,'javelot-du-beffroi');rpgFinDeTour(duel);
  duel.sorcier.main=['brise-lame'];duel.sorcier.mana.braise=30;const result=rpgMobaLancerMagie(duel,'sorcier','brise-lame',porteur.id);assert.equal(result.ok,true,JSON.stringify(result));assert.equal(porteur.arme,null);assert.deepEqual(porteur.armes,[]);assert.equal(porteur.atk,1);assert.equal(porteur.coupRapide,false);assert.equal(porteur.volDeVie,false);assert.ok(duel.joueur.cimetiere.includes('sabre-maudit'));assert.ok(duel.joueur.cimetiere.includes('javelot-du-beffroi'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Javelot MOBA : le défenseur perd sa durabilité après un blocage', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','javelot-du-beffroi'];duel.joueur.mana.sable=30;const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;assert.equal(rpgMobaJouerArme(duel,'joueur','javelot-du-beffroi',porteur.id).ok,true);
  rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;const attaquant=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;attaquant.ready=true;
  assert.equal(rpgMobaDeclarerAttaque(duel,'sorcier',[attaquant.id]).ok,true);const result=rpgMobaLancerAttaque(duel,'sorcier',[attaquant.id],{[attaquant.id]:[porteur.id]},{declaree:true});assert.equal(result.ok,true,JSON.stringify(result));assert.equal(porteur.arme,null);assert.equal(porteur.atk,1);assert.ok(duel.joueur.cimetiere.includes('javelot-du-beffroi'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Javelot MOBA : une capture détache l’arme et la garde au cimetière du propriétaire', () => {
  const duel=partie();duel.joueur.main=['mousse-des-galiotes','javelot-du-beffroi'];duel.joueur.mana.sable=30;const porteur=rpgMobaJouerCreature(duel,'joueur','mousse-des-galiotes','left',0).entite;assert.equal(rpgMobaJouerArme(duel,'joueur','javelot-du-beffroi',porteur.id).ok,true);
  rpgFinDeTour(duel);duel.sorcier.main=['la-barbe-rousse'];duel.sorcier.mana.sable=30;duel.sorcier.mana.eau=30;assert.equal(rpgMobaJouerCreature(duel,'sorcier','la-barbe-rousse','right',0,{ouvrirReponse:true}).creatureEnAttente,true);const rousse=rpgMobaPasserCreature(duel,'joueur').entite;
  assert.equal(rpgMobaResoudreArrivee(duel,'sorcier',porteur.id).ok,true);assert.equal(rousse.enCale.entite.arme,null);assert.ok(duel.joueur.cimetiere.includes('javelot-du-beffroi'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Javelot MOBA : sa rupture conserve Attaque ciblée imprimée ou accordée pour le tour', () => {
  for (const id of ['gardienne-des-portes-de-sable','tislit-des-aures']) {
    const duel=partie();duel.joueur.main=[id,'javelot-du-beffroi','serment-de-la-forge'];duel.joueur.mana.sable=30;duel.joueur.mana.braise=30;const porteur=rpgMobaJouerCreature(duel,'joueur',id,'left',0).entite;
    assert.equal(rpgMobaJouerArme(duel,'joueur','javelot-du-beffroi',porteur.id).ok,true);
    if(id==='gardienne-des-portes-de-sable')assert.equal(rpgMobaLancerMagie(duel,'joueur','serment-de-la-forge').ok,true);
    porteur.ready=true;assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[porteur.id]).ok,true);assert.equal(rpgMobaLancerAttaque(duel,'joueur',[porteur.id],{},{declaree:true}).ok,true);
    assert.equal(porteur.arme,null);assert.equal(porteur.coupRapide,true,`l’autre source demeure : ${id}`);rpgFinDeTour(duel);assert.equal(porteur.coupRapide,id==='tislit-des-aures');assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Javelot MOBA : une victoire pendant le choix de Ghul défausse l’arme annoncée', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['le-brulot'];duel.sorcier.mana.braise=30;const brulot=rpgMobaJouerCreature(duel,'sorcier','le-brulot','right',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['ghul-des-cendres','gardienne-des-portes-de-sable','javelot-du-beffroi'];duel.joueur.mana.sable=30;duel.joueur.mana.braise=30;const ghul=rpgMobaJouerCreature(duel,'joueur','ghul-des-cendres','center',0).entite;const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;
  mobaInfliger(duel.moba,'sorcier','left',10);mobaInfliger(duel.moba,'sorcier','right',8);duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=30;
  assert.equal(rpgMobaJouerArme(duel,'joueur','javelot-du-beffroi',porteur.id,{ouvrirReponse:true}).sortEnAttente,true);assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',ghul.id).ok,true);assert.equal(rpgMobaPasserSort(duel,'sorcier').ok,false);
  const result=rpgMobaResoudreDestruction(duel,'joueur',brulot.id);assert.equal(result.ok,true,JSON.stringify(result));assert.equal(duel.moba.winner,'sorcier');assert.equal(duel.mobaSortEnAttente,null);assert.equal(duel.joueur.cimetiere.filter(id=>id==='javelot-du-beffroi').length,1);assert.equal(porteur.arme,null);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Javelot MOBA : renvoi et conquête détachent l’arme sans la renvoyer en main', () => {
  for (const mode of ['renvoi','conquete']) {
    const duel=partie();duel.joueur.main=['mousse-des-galiotes','javelot-du-beffroi'];duel.joueur.mana.sable=30;const porteur=rpgMobaJouerCreature(duel,'joueur','mousse-des-galiotes','right',0).entite;assert.equal(rpgMobaJouerArme(duel,'joueur','javelot-du-beffroi',porteur.id).ok,true);
    if(mode==='conquete')mobaInfliger(duel.moba,'sorcier','right',8);rpgFinDeTour(duel);duel.sorcier.main=[mode==='renvoi'?'ressac':'trait-de-braise'];duel.sorcier.mana.eau=30;duel.sorcier.mana.braise=30;
    const result=mode==='renvoi'?rpgMobaLancerMagie(duel,'sorcier','ressac',porteur.id):rpgMobaLancerMagie(duel,'sorcier','trait-de-braise','sorcier','right');assert.equal(result.ok,true,JSON.stringify(result));
    assert.ok(!duel.joueur.creatures.includes(porteur));assert.ok(duel.joueur.cimetiere.includes('javelot-du-beffroi'));assert.ok(!duel.joueur.main.includes('javelot-du-beffroi'));assert.equal(duel.joueur.main.includes('mousse-des-galiotes'),mode==='renvoi');assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Cuirasse MOBA : Esquive, armure blessée et soins conservent les règles classiques', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','cuirasse-de-sel'];duel.joueur.mana.sable=30;const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
  const equip=rpgMobaJouerArme(duel,'joueur','cuirasse-de-sel',porteur.id,{ouvrirReponse:true});assert.equal(equip.sortEnAttente,true);assert.equal(rpgMobaPasserSort(duel,'sorcier').ok,true);assert.deepEqual([porteur.pv,porteur.pvMax,porteur.esquiveChance,porteur.arme.durabilite],[7,7,.15,2]);assert.deepEqual(porteur.arme.armure,{max:3,restant:3});rpgFinDeTour(duel);
  duel.sorcier.main=['trait-de-braise','trait-de-braise'];duel.sorcier.mana.braise=30;rpgReglerHasard(duel,()=>.1);assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',porteur.id).ok,true);assert.equal(porteur.pv,7);assert.equal(porteur.arme.armure.restant,3);
  rpgReglerHasard(duel,()=>.99);assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',porteur.id).ok,true);assert.equal(porteur.pv,4);assert.equal(porteur.arme.armure.restant,0);rpgFinDeTour(duel);
  duel.joueur.main=['festin-des-vaillants'];duel.joueur.mana.sable=30;duel.joueur.mana.neige=30;assert.equal(rpgMobaLancerMagie(duel,'joueur','festin-des-vaillants',null,'left').ok,true);assert.equal(porteur.pv,4,'les soins ne restaurent pas l’armure épuisée');assert.equal(porteur.arme.armure.restant,0);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Cuirasse MOBA : Lien Bouchra intervoies et retrait de l’ancre sans dérive', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','cuirasse-de-sel','bouchra-guerriere-des-cretes'];duel.joueur.mana.sable=30;const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
  assert.equal(rpgMobaJouerArme(duel,'joueur','cuirasse-de-sel',porteur.id).ok,true);assert.deepEqual([porteur.pv,porteur.pvMax,porteur.arme.armure.max],[7,7,3]);const bouchra=rpgMobaJouerCreature(duel,'joueur','bouchra-guerriere-des-cretes','right',0).entite;assert.ok(bouchra);
  assert.deepEqual([porteur.pv,porteur.pvMax,porteur.arme.armure.max,porteur.arme.armure.restant],[8,8,4,4]);rpgFinDeTour(duel);duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=30;rpgReglerHasard(duel,()=>.99);assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',bouchra.id).ok,true);
  assert.ok(!duel.joueur.creatures.includes(bouchra));assert.deepEqual([porteur.pv,porteur.pvMax,porteur.arme.armure.max,porteur.arme.armure.restant],[7,7,3,3]);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Cuirasse MOBA : esquive imprimée et arme se cumulent, puis Brise-lame ne retire que l’arme', () => {
  const duel=partie();duel.joueur.main=['bouchra-guerriere-des-cretes','cuirasse-de-sel'];duel.joueur.mana.sable=30;const bouchra=rpgMobaJouerCreature(duel,'joueur','bouchra-guerriere-des-cretes','right',0).entite;assert.equal(rpgMobaJouerArme(duel,'joueur','cuirasse-de-sel',bouchra.id).ok,true);
  assert.equal(bouchra.esquiveChance,.3);assert.equal(bouchra.arme.armure.max,4);rpgFinDeTour(duel);duel.sorcier.main=['brise-lame'];duel.sorcier.mana.braise=30;rpgReglerHasard(duel,()=>.99);
  const result=rpgMobaLancerMagie(duel,'sorcier','brise-lame',bouchra.id);assert.equal(result.ok,true,JSON.stringify(result));assert.equal(bouchra.arme,null);assert.equal(bouchra.esquiveChance,.15);assert.equal(bouchra.pv,1);assert.ok(duel.joueur.cimetiere.includes('cuirasse-de-sel'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Braise et sable MOBA : coût bicolore, Lien intervoies, critique et endurance', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','braise-et-sable','cavalier-des-deux-sabres'];duel.joueur.mana.sable=30;duel.joueur.mana.braise=0;const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
  const before=JSON.stringify(duel);assert.equal(rpgMobaJouerArme(duel,'joueur','braise-et-sable',porteur.id,{ouvrirReponse:true}).raison,'mana');assert.equal(JSON.stringify(duel),before);duel.joueur.mana.braise=30;
  assert.equal(rpgMobaJouerArme(duel,'joueur','braise-et-sable',porteur.id,{ouvrirReponse:true}).sortEnAttente,true);assert.equal(rpgMobaPasserSort(duel,'sorcier').ok,true);assert.deepEqual([porteur.atk,porteur.arme.durabilite,porteur.coupRapide,porteur.coupCritique.chance],[2,1,true,.15]);
  const cavalier=rpgMobaJouerCreature(duel,'joueur','cavalier-des-deux-sabres','right',0).entite;assert.ok(cavalier);assert.equal(porteur.atk,3);rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;const cible=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;rpgFinDeTour(duel);
  let n=0;rpgReglerHasard(duel,()=>[.5,.1][Math.min(n++,1)]);assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[porteur.id],{[porteur.id]:cible.id}).ok,true);const result=rpgMobaLancerAttaque(duel,'joueur',[porteur.id],{},{declaree:true});assert.equal(result.ok,true,JSON.stringify(result));assert.ok(!duel.sorcier.creatures.includes(cible));assert.equal(porteur.arme,null);assert.equal(porteur.atk,1);assert.equal(porteur.coupRapide,false);assert.equal(porteur.coupCritique,null);assert.ok(duel.joueur.cimetiere.includes('braise-et-sable'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Chercheuse MOBA : le tirage choisit parmi les trois armes auditées sans inclure le Sabre', () => {
  for (const [jet,attendu] of [[0,'javelot-du-beffroi'],[.5,'cuirasse-de-sel'],[.99,'braise-et-sable']]) {
    const duel=partie();duel.joueur.main=['chercheuse-des-armes-ensevelies'];duel.joueur.mana.sable=30;duel.joueur.mana.braise=30;duel.joueur.deck=['sabre-maudit','javelot-du-beffroi','cuirasse-de-sel','braise-et-sable'];let appels=0;rpgReglerHasard(duel,()=>{appels++;return jet;});
    const result=rpgMobaJouerCreature(duel,'joueur','chercheuse-des-armes-ensevelies','center',0);assert.equal(result.ok,true,JSON.stringify(result));assert.deepEqual(duel.joueur.main,[attendu]);assert.equal(appels,1);assert.ok(duel.joueur.deck.includes('sabre-maudit'));assert.ok(!duel.mobaRechercheEnAttente);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Cuirasse MOBA : deux blocages épuisent la durabilité et retirent seulement l’armure restante', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','cuirasse-de-sel'];duel.joueur.mana.sable=30;const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;assert.equal(rpgMobaJouerArme(duel,'joueur','cuirasse-de-sel',porteur.id).ok,true);
  rpgFinDeTour(duel);duel.sorcier.main=['mousse-des-galiotes','mousse-des-galiotes'];duel.sorcier.mana.sable=30;const a=rpgMobaJouerCreature(duel,'sorcier','mousse-des-galiotes','left',0).entite;const b=rpgMobaJouerCreature(duel,'sorcier','mousse-des-galiotes','left',1).entite;a.ready=true;b.ready=true;rpgReglerHasard(duel,()=>.99);
  assert.equal(rpgMobaDeclarerAttaque(duel,'sorcier',[a.id]).ok,true);assert.equal(rpgMobaLancerAttaque(duel,'sorcier',[a.id],{[a.id]:[porteur.id]},{declaree:true}).ok,true);assert.equal(porteur.arme.durabilite,1);assert.deepEqual(porteur.arme.armure,{max:3,restant:2});
  rpgFinDeTour(duel);rpgFinDeTour(duel);assert.equal(rpgMobaDeclarerAttaque(duel,'sorcier',[b.id]).ok,true);assert.equal(rpgMobaLancerAttaque(duel,'sorcier',[b.id],{[b.id]:[porteur.id]},{declaree:true}).ok,true);
  assert.equal(porteur.arme,null);assert.equal(porteur.pv,4);assert.equal(porteur.pvMax,4);assert.equal(porteur.esquive,false);assert.ok(duel.joueur.cimetiere.includes('cuirasse-de-sel'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Braise et sable MOBA : le Lien est relu après la réponse et Écueil ne contre pas une arme', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','cavalier-des-deux-sabres','braise-et-sable'];duel.joueur.mana.sable=30;duel.joueur.mana.braise=30;const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;const cavalier=rpgMobaJouerCreature(duel,'joueur','cavalier-des-deux-sabres','right',0).entite;cavalier.pv=1;
  duel.sorcier.main=['ecueil','trait-de-braise'];duel.sorcier.mana.eau=30;duel.sorcier.mana.braise=30;assert.equal(rpgMobaJouerArme(duel,'joueur','braise-et-sable',porteur.id,{ouvrirReponse:true}).sortEnAttente,true);const snapshot=JSON.stringify(duel);assert.equal(rpgMobaLancerMagie(duel,'sorcier','ecueil').ok,false);assert.equal(JSON.stringify(duel),snapshot);
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',cavalier.id).ok,true);assert.ok(!duel.joueur.creatures.includes(cavalier));assert.equal(rpgMobaPasserSort(duel,'sorcier').ok,true);assert.equal(porteur.atk,2);assert.equal(porteur.arme.carteId,'braise-et-sable');assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for (const id of ['cuirasse-de-sel','braise-et-sable']) test(`${id} MOBA : une arme réservée résiste aux mauvais contres, puis tombe avec son porteur`, () => {
  const duel=partie();duel.joueur.main=['mousse-des-galiotes',id];duel.joueur.mana.sable=30;duel.joueur.mana.braise=30;const porteur=rpgMobaJouerCreature(duel,'joueur','mousse-des-galiotes','right',0).entite;
  duel.sorcier.main=['ecueil','silence-decume','trait-de-braise'];duel.sorcier.mana.eau=30;duel.sorcier.mana.braise=30;assert.equal(rpgMobaJouerArme(duel,'joueur',id,porteur.id,{ouvrirReponse:true}).sortEnAttente,true);
  for(const contre of ['ecueil','silence-decume']){const before=JSON.stringify(duel);assert.equal(rpgMobaLancerMagie(duel,'sorcier',contre).ok,false);assert.equal(JSON.stringify(duel),before);}assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',porteur.id).ok,true);
  const pass=rpgMobaPasserSort(duel,'sorcier');assert.equal(pass.ok,true,JSON.stringify(pass));assert.equal(pass.dissipe,true);assert.ok(duel.joueur.cimetiere.includes(id));assert.equal(duel.mobaSortEnAttente,null);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Braise et sable MOBA : cumul critique et Vol de vie du Sabre survivent à sa rupture', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','sabre-maudit','braise-et-sable'];duel.joueur.mana.sable=30;duel.joueur.mana.braise=30;const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
  assert.equal(rpgMobaLancerMagie(duel,'joueur','sabre-maudit',porteur.id).ok,true);assert.equal(rpgMobaJouerArme(duel,'joueur','braise-et-sable',porteur.id).ok,true);assert.equal(porteur.coupCritique.chance,.3);assert.equal(porteur.volDeVie,true);
  mobaInfliger(duel.moba,'sorcier','left',4);porteur.ready=true;rpgReglerHasard(duel,()=>.99);assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[porteur.id]).ok,true);const result=rpgMobaLancerAttaque(duel,'joueur',[porteur.id],{},{declaree:true});assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(mobaVoie(duel.moba,'left').hp.joueur,8);assert.equal(porteur.arme,null);assert.deepEqual(porteur.armes,['sabre-maudit']);assert.equal(porteur.coupCritique.chance,.15);assert.equal(porteur.volDeVie,true);assert.equal(porteur.coupRapide,false);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Takouba MOBA : Lien à travers les voies et Infiltration disparaissent avec l’arme', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','takouba-des-pistes','tin-hinan','cuirasse-de-sel'];duel.joueur.mana.sable=40;
  const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
  assert.equal(rpgMobaJouerArme(duel,'joueur','takouba-des-pistes',porteur.id,{ouvrirReponse:true}).sortEnAttente,true);assert.equal(rpgMobaPasserSort(duel,'sorcier').ok,true);
  assert.deepEqual([porteur.atk,porteur.infiltration,porteur.arme.durabilite],[3,true,2]);
  const tin=rpgMobaJouerCreature(duel,'joueur','tin-hinan','right',0).entite;assert.ok(tin);assert.deepEqual([porteur.atk,porteur.arme.armure.max],[4,1]);
  assert.equal(rpgMobaJouerArme(duel,'joueur','cuirasse-de-sel',porteur.id).ok,true);assert.equal(porteur.infiltration,true,'l’Infiltration temporaire de Tin Hinan demeure');assert.equal(porteur.atk,1);assert.ok(duel.joueur.cimetiere.includes('takouba-des-pistes'));rpgFinDeTour(duel);assert.equal(porteur.infiltration,false);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Armure de cendres MOBA : Contre-attaque touche la voie du porteur et cesse au remplacement', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','armure-de-cendres','cuirasse-de-sel'];duel.joueur.mana.sable=30;duel.joueur.mana.braise=30;
  const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;assert.equal(rpgMobaJouerArme(duel,'joueur','armure-de-cendres',porteur.id).ok,true);assert.deepEqual([porteur.arme.armure.restant,porteur.contreAttaque],[4,true]);
  rpgFinDeTour(duel);duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=30;const result=rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',porteur.id);assert.equal(result.ok,true,JSON.stringify(result));assert.equal(mobaVoie(duel.moba,'right').hp.sorcier,9);assert.equal(mobaVoie(duel.moba,'left').hp.sorcier,10);assert.equal(porteur.arme.armure.restant,1);
  rpgFinDeTour(duel);assert.equal(rpgMobaJouerArme(duel,'joueur','cuirasse-de-sel',porteur.id).ok,true);assert.equal(porteur.contreAttaque,false);assert.equal(porteur.pv,7);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Sabre du croissant noir MOBA : défense sans rupture, attaque infiltrée et soins sur la voie', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','sabre-du-croissant-noir'];duel.joueur.mana.sable=30;duel.joueur.mana.tenebres=0;
  const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;const before=JSON.stringify(duel);assert.equal(rpgMobaJouerArme(duel,'joueur','sabre-du-croissant-noir',porteur.id).raison,'mana');assert.equal(JSON.stringify(duel),before);
  duel.joueur.mana.tenebres=30;assert.equal(rpgMobaJouerArme(duel,'joueur','sabre-du-croissant-noir',porteur.id).ok,true);assert.deepEqual([porteur.atk,porteur.infiltration,porteur.volDeVie,porteur.arme.durabilite],[3,true,true,1]);
  mobaInfliger(duel.moba,'sorcier','left',4);rpgFinDeTour(duel);duel.sorcier.main=['mousse-des-galiotes'];duel.sorcier.mana.sable=30;const ennemi=rpgMobaJouerCreature(duel,'sorcier','mousse-des-galiotes','left',0).entite;ennemi.ready=true;
  assert.equal(rpgMobaDeclarerAttaque(duel,'sorcier',[ennemi.id]).ok,true);assert.equal(rpgMobaLancerAttaque(duel,'sorcier',[ennemi.id],{[ennemi.id]:[porteur.id]},{declaree:true}).ok,true);assert.equal(porteur.arme.carteId,'sabre-du-croissant-noir');assert.equal(mobaVoie(duel.moba,'left').hp.joueur,8);
  rpgFinDeTour(duel);assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[porteur.id]).ok,true);assert.equal(rpgMobaLancerAttaque(duel,'joueur',[porteur.id],{},{declaree:true}).ok,true);assert.equal(mobaVoie(duel.moba,'left').hp.joueur,10);assert.equal(porteur.arme,null);assert.equal(porteur.volDeVie,false);assert.equal(porteur.infiltration,false);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Hache MOBA : morsure avant équipement, mort et réservation après réponse', () => {
  for (const mort of [false,true]) {
    const duel=partie();duel.joueur.main=['mousse-des-galiotes','hache-de-la-banquise'];duel.joueur.mana.sable=30;duel.joueur.mana.neige=30;
    const porteur=rpgMobaJouerCreature(duel,'joueur','mousse-des-galiotes','left',0).entite;if(mort)porteur.pv=1;
    assert.equal(rpgMobaJouerArme(duel,'joueur','hache-de-la-banquise',porteur.id,{ouvrirReponse:true}).sortEnAttente,true);const result=rpgMobaPasserSort(duel,'sorcier');assert.equal(result.ok,true,JSON.stringify(result));
    if(mort){assert.ok(!duel.joueur.creatures.includes(porteur));assert.ok(duel.joueur.cimetiere.includes('hache-de-la-banquise'));assert.ok(duel.joueur.cimetiere.includes('mousse-des-galiotes'));}else{assert.equal(porteur.pv,1);assert.equal(porteur.atk,4);assert.equal(porteur.arme.durabilite,2);}
    assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Lance de givre MOBA : gel avant blessure ciblée et rupture, sans gel hors voie', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','lance-de-givre'];duel.joueur.mana.sable=30;duel.joueur.mana.neige=30;const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;assert.equal(rpgMobaJouerArme(duel,'joueur','lance-de-givre',porteur.id).ok,true);
  rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable','gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;const cible=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;const autre=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;rpgFinDeTour(duel);
  let jets=0;rpgReglerHasard(duel,()=>jets++ === 0 ? .9 : .1);assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[porteur.id],{[porteur.id]:cible.id}).ok,true);const result=rpgMobaLancerAttaque(duel,'joueur',[porteur.id],{},{declaree:true});assert.equal(result.ok,true,JSON.stringify(result));assert.ok(cible.gelToursRestants>0);assert.equal(autre.gelToursRestants,0);assert.equal(cible.pv,2);assert.equal(porteur.arme,null);assert.equal(porteur.coupRapide,false);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Chercheuse MOBA : chacune des armes auditées est recherchée sans inclure le Sabre maudit', () => {
  const armes=['javelot-du-beffroi','cuirasse-de-sel','braise-et-sable','takouba-des-pistes','armure-de-cendres','sabre-du-croissant-noir','hache-de-la-banquise','lance-de-givre','khopesh-d-or','licou-du-chien-de-sable','harnais-du-mehari','masque-du-guetteur','jitte-d-amayas','lance-de-la-lune-givree','sandales-de-tislit','grappin-d-abordage','baton-des-citernes','lame-des-ergs','takouba-de-tin-hinan','sphere-de-rotation'];
  for(let i=0;i<armes.length;i++){
    const duel=partie();duel.joueur.main=['chercheuse-des-armes-ensevelies'];duel.joueur.mana.sable=30;duel.joueur.mana.braise=30;duel.joueur.deck=['sabre-maudit',...armes];let appels=0;rpgReglerHasard(duel,()=>{appels++;return (i+.5)/armes.length;});
    assert.equal(rpgMobaJouerCreature(duel,'joueur','chercheuse-des-armes-ensevelies','center',0).ok,true);assert.deepEqual(duel.joueur.main,[armes[i]]);assert.equal(appels,1);assert.ok(duel.joueur.deck.includes('sabre-maudit'));assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Hache MOBA : mort du Ghul déclenche son choix avant de reprendre la partie', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;const cible=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['ghul-des-cendres','hache-de-la-banquise'];duel.joueur.mana.braise=30;duel.joueur.mana.neige=30;const ghul=rpgMobaJouerCreature(duel,'joueur','ghul-des-cendres','left',0).entite;ghul.pv=1;
  assert.equal(rpgMobaJouerArme(duel,'joueur','hache-de-la-banquise',ghul.id,{ouvrirReponse:true}).sortEnAttente,true);assert.equal(rpgMobaPasserSort(duel,'sorcier').ok,true);assert.ok(duel.destructionsEnAttente?.length);assert.ok(duel.joueur.cimetiere.includes('hache-de-la-banquise'));assert.equal(rpgMobaResoudreDestruction(duel,'joueur',cible.id).ok,true);assert.equal(cible.pv,3);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Khopesh MOBA : Tribut temporaire et imprimé subsistent après remplacement', () => {
  const duel=partie();duel.joueur.main=['chacal-du-seuil','offrande-de-lin','khopesh-d-or','cuirasse-de-sel'];duel.joueur.mana.tenebres=30;duel.joueur.mana.sable=30;
  const porteur=rpgMobaJouerCreature(duel,'joueur','chacal-du-seuil','left',0).entite;assert.equal(porteur.tribut,1);
  assert.equal(rpgMobaLancerMagie(duel,'joueur','offrande-de-lin',null,'right').ok,true);assert.equal(porteur.tribut,2);
  assert.equal(rpgMobaJouerArme(duel,'joueur','khopesh-d-or',porteur.id).ok,true);assert.equal(porteur.tribut,3);
  assert.equal(rpgMobaJouerArme(duel,'joueur','cuirasse-de-sel',porteur.id).ok,true);assert.equal(porteur.tribut,2);rpgFinDeTour(duel);assert.equal(porteur.tribut,1);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Khopesh MOBA : transfert de Tribut sur la voie après un vrai coup', () => {
  for(const side of ['joueur','sorcier']) {
    const duel=partie();if(side==='sorcier')rpgFinDeTour(duel);const enemy=side==='joueur'?'sorcier':'joueur';duel[side].main=['gardienne-des-portes-de-sable','khopesh-d-or'];duel[side].mana.tenebres=30;duel[side].mana.sable=30;
    const p=rpgMobaJouerCreature(duel,side,'gardienne-des-portes-de-sable','right',0).entite;assert.equal(rpgMobaJouerArme(duel,side,'khopesh-d-or',p.id).ok,true);mobaInfliger(duel.moba,enemy,'right',3);p.ready=true;
    assert.equal(rpgMobaDeclarerAttaque(duel,side,[p.id]).ok,true);const r=rpgMobaLancerAttaque(duel,side,[p.id],{},{declaree:true});assert.equal(r.ok,true,JSON.stringify(r));assert.equal(mobaVoie(duel.moba,'right').hp[side],8);assert.equal(mobaVoie(duel.moba,'right').hp[enemy],6);assert.equal(r.damageEvents.filter(e=>e.tribut).length,1);assert.equal(p.arme.durabilite,1);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Licou MOBA : mort à l’attachement pioche une seule carte, renvoi non', () => {
  for(const action of ['mort','renvoi']) {
    const duel=partie();duel.joueur.main=[action==='mort'?'fennec-des-decombres':'chien-du-guet','licou-du-chien-de-sable'];duel.joueur.mana.sable=30;duel.joueur.deck=['gardienne-des-portes-de-sable'];
    const id=duel.joueur.main[0];const p=rpgMobaJouerCreature(duel,'joueur',id,'left',0).entite;assert.equal(rpgMobaJouerArme(duel,'joueur','licou-du-chien-de-sable',p.id,{ouvrirReponse:true}).sortEnAttente,true);assert.equal(rpgMobaPasserSort(duel,'sorcier').ok,true);
    if(action==='renvoi'){rpgFinDeTour(duel);duel.sorcier.main=['ressac'];duel.sorcier.mana.eau=30;assert.equal(rpgMobaLancerMagie(duel,'sorcier','ressac',p.id).ok,true);assert.equal(duel.joueur.deck.length,1);assert.deepEqual(duel.joueur.main,[id]);}else{assert.equal(duel.joueur.deck.length,0);assert.deepEqual(duel.joueur.main,['gardienne-des-portes-de-sable']);}
    assert.ok(duel.joueur.cimetiere.includes('licou-du-chien-de-sable'));assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Harnais MOBA : rend du mana de sable après une attaque bloquée, sans nouvelle source permanente', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;const blocker=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['gardienne-des-portes-de-sable','harnais-du-mehari'];duel.joueur.mana.sable=30;const p=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;assert.equal(rpgMobaJouerArme(duel,'joueur','harnais-du-mehari',p.id).ok,true);p.ready=true;duel.joueur.mana.sable=0;const maximum=duel.joueur.manaMax.sable;
  assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[p.id]).ok,true);const r=rpgMobaLancerAttaque(duel,'joueur',[p.id],{[p.id]:[blocker.id]},{declaree:true});assert.equal(r.ok,true,JSON.stringify(r));assert.equal(duel.joueur.mana.sable,1);assert.equal(duel.joueur.manaMax.sable,maximum);assert.equal(p.arme.durabilite,1);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Harnais MOBA : l’attaque qui conquiert une voie produit le mana avant une éventuelle autre action', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','harnais-du-mehari'];duel.joueur.mana.sable=30;const p=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;assert.equal(rpgMobaJouerArme(duel,'joueur','harnais-du-mehari',p.id).ok,true);mobaInfliger(duel.moba,'joueur','left',8);p.ready=true;duel.joueur.mana.sable=0;
  assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[p.id]).ok,true);const result=rpgMobaLancerAttaque(duel,'joueur',[p.id],{},{declaree:true});assert.equal(result.ok,true,JSON.stringify(result));assert.equal(mobaVoie(duel.moba,'left').conqueredBy,'joueur');assert.equal(duel.joueur.mana.sable,1);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Licou MOBA : pioche et choix de mort du Ghul coexistent sans perdre la carte réservée', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;const cible=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['ghul-des-cendres','licou-du-chien-de-sable'];duel.joueur.deck=['mousse-des-galiotes'];duel.joueur.mana.braise=30;duel.joueur.mana.sable=30;const p=rpgMobaJouerCreature(duel,'joueur','ghul-des-cendres','left',0).entite;p.pv=1;
  assert.equal(rpgMobaJouerArme(duel,'joueur','licou-du-chien-de-sable',p.id,{ouvrirReponse:true}).sortEnAttente,true);assert.equal(rpgMobaPasserSort(duel,'sorcier').ok,true);assert.deepEqual(duel.joueur.main,['mousse-des-galiotes']);assert.equal(duel.joueur.cimetiere.filter(id=>id==='licou-du-chien-de-sable').length,1);assert.ok(duel.destructionsEnAttente?.length);assert.equal(rpgMobaResoudreDestruction(duel,'joueur',cible.id).ok,true);assert.equal(cible.pv,3);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Masque MOBA : Butin et équipement cumulent les pioches et les choix de défausse', () => {
  const duel=partie();duel.joueur.main=['chien-du-guet','masque-du-guetteur','verglas'];duel.joueur.deck=['mousse-des-galiotes','gardienne-des-portes-de-sable'];duel.joueur.mana.sable=30;
  const p=rpgMobaJouerCreature(duel,'joueur','chien-du-guet','left',0).entite;assert.equal(rpgMobaJouerArme(duel,'joueur','masque-du-guetteur',p.id).ok,true);assert.deepEqual([p.atk,p.arme.durabilite],[3,2]);p.ready=true;
  assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[p.id]).ok,true);const result=rpgMobaLancerAttaque(duel,'joueur',[p.id],{},{declaree:true});assert.equal(result.ok,true,JSON.stringify(result));assert.equal(mobaVoie(duel.moba,'left').hp.sorcier,7);assert.equal(duel.joueur.deck.length,0);assert.equal(duel.joueur.main.length,3);assert.equal(duel.defausseEnAttente?.restant,2);assert.equal(p.arme.durabilite,1);
  assert.equal(rpgMobaTerminerTour(duel,'joueur').ok,false);assert.equal(rpgMobaDefausser(duel,'joueur',0).restant,1);assert.equal(rpgMobaDefausser(duel,'joueur',0).restant,0);assert.equal(duel.joueur.main.length,1);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Masque MOBA : bloqué ou touchant une créature ne pioche pas', () => {
  for(const mode of ['blocage','ciblee']) {
    const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;const cible=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;rpgFinDeTour(duel);
    duel.joueur.main=['gardienne-des-portes-de-sable','masque-du-guetteur',...(mode==='ciblee'?['serment-de-la-forge']:[])];duel.joueur.deck=['mousse-des-galiotes'];duel.joueur.mana.sable=30;duel.joueur.mana.braise=30;const p=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;assert.equal(rpgMobaJouerArme(duel,'joueur','masque-du-guetteur',p.id).ok,true);
    if(mode==='ciblee')assert.equal(rpgMobaLancerMagie(duel,'joueur','serment-de-la-forge').ok,true);p.ready=true;const targets=mode==='ciblee'?{[p.id]:cible.id}:{};
    assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[p.id],targets).ok,true);const result=rpgMobaLancerAttaque(duel,'joueur',[p.id],mode==='blocage'?{[p.id]:[cible.id]}:{},{declaree:true});assert.equal(result.ok,true,JSON.stringify(result));assert.equal(duel.joueur.deck.length,1);assert.equal(duel.defausseEnAttente,null);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Masque MOBA : conquête non décisive déclenche les deux effets de contact', () => {
  const duel=partie();duel.joueur.main=['chien-du-guet','masque-du-guetteur'];duel.joueur.mana.sable=30;duel.joueur.deck=['mousse-des-galiotes','gardienne-des-portes-de-sable'];const p=rpgMobaJouerCreature(duel,'joueur','chien-du-guet','left',0).entite;assert.equal(rpgMobaJouerArme(duel,'joueur','masque-du-guetteur',p.id).ok,true);mobaInfliger(duel.moba,'joueur','left',7);p.ready=true;
  assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[p.id]).ok,true);assert.equal(rpgMobaLancerAttaque(duel,'joueur',[p.id],{},{declaree:true}).ok,true);assert.equal(mobaVoie(duel.moba,'left').conqueredBy,'joueur');assert.equal(duel.joueur.deck.length,0);assert.equal(duel.defausseEnAttente.restant,2);assert.ok(duel.joueur.cimetiere.includes('masque-du-guetteur'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Jitte MOBA : un sort de Ténèbres hostile est paré une fois, pas les autres couleurs', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','jitte-d-amayas'];duel.joueur.mana.sable=30;const p=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;
  assert.equal(rpgMobaJouerArme(duel,'joueur','jitte-d-amayas',p.id,{ouvrirReponse:true}).sortEnAttente,true);assert.equal(rpgMobaPasserSort(duel,'sorcier').ok,true);assert.deepEqual([p.atk,p.pv,p.arme.durabilite,p.protection.contre],[3,6,2,'tenebres']);
  rpgFinDeTour(duel);duel.sorcier.main=['trait-de-braise','effacement-des-faibles','effacement-des-faibles'];duel.sorcier.mana.braise=30;duel.sorcier.mana.tenebres=30;
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',p.id).ok,true);assert.equal(p.pv,3);assert.equal(p.protection.contre,'tenebres');const first=rpgMobaLancerMagie(duel,'sorcier','effacement-des-faibles',p.id);assert.equal(first.ok,true,JSON.stringify(first));assert.equal(first.bouclierBloque,true);assert.equal(p.protection,null);assert.ok(duel.joueur.creatures.includes(p));
  const second=rpgMobaLancerMagie(duel,'sorcier','effacement-des-faibles',p.id);assert.equal(second.ok,true,JSON.stringify(second));assert.ok(!duel.joueur.creatures.includes(p));assert.ok(duel.joueur.cimetiere.includes('jitte-d-amayas'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Jitte MOBA : la parade imprimée réapparaît au remplacement sans réarmer la Jitte', () => {
  const duel=partie();duel.joueur.main=['ifrit-al-ahmar','jitte-d-amayas','cuirasse-de-sel'];duel.joueur.mana.sable=30;duel.joueur.mana.braise=30;const p=rpgMobaJouerCreature(duel,'joueur','ifrit-al-ahmar','right',0).entite;assert.equal(p.protection.contre,'eau');assert.equal(rpgMobaJouerArme(duel,'joueur','jitte-d-amayas',p.id).ok,true);assert.equal(p.protection.contre,'tenebres');
  rpgFinDeTour(duel);duel.sorcier.main=['le-jugement-des-colosses'];duel.sorcier.mana.tenebres=30;assert.equal(rpgMobaLancerMagie(duel,'sorcier','le-jugement-des-colosses',p.id).bouclierBloque,true);assert.equal(p.protection,null);rpgFinDeTour(duel);
  assert.equal(rpgMobaJouerArme(duel,'joueur','cuirasse-de-sel',p.id).ok,true);assert.equal(p.protection.contre,'eau');assert.ok(duel.joueur.cimetiere.includes('jitte-d-amayas'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Masque MOBA : le sorcier résout automatiquement les deux défausses', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['chien-du-guet','masque-du-guetteur','verglas'];duel.sorcier.deck=['mousse-des-galiotes','gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;
  const p=rpgMobaJouerCreature(duel,'sorcier','chien-du-guet','right',0).entite;assert.equal(rpgMobaJouerArme(duel,'sorcier','masque-du-guetteur',p.id).ok,true);p.ready=true;assert.equal(rpgMobaDeclarerAttaque(duel,'sorcier',[p.id]).ok,true);assert.equal(rpgMobaLancerAttaque(duel,'sorcier',[p.id],{},{declaree:true}).ok,true);
  assert.equal(mobaVoie(duel.moba,'right').hp.joueur,7);assert.equal(duel.sorcier.deck.length,0);assert.equal(duel.sorcier.main.length,1);assert.equal(duel.defausseEnAttente,null);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Masque MOBA : une victoire immédiate termine le combat avant les déclencheurs', () => {
  const duel=partie();duel.joueur.main=['chien-du-guet','masque-du-guetteur'];duel.joueur.mana.sable=30;duel.joueur.deck=['mousse-des-galiotes','gardienne-des-portes-de-sable'];const p=rpgMobaJouerCreature(duel,'joueur','chien-du-guet','left',0).entite;assert.equal(rpgMobaJouerArme(duel,'joueur','masque-du-guetteur',p.id).ok,true);mobaInfliger(duel.moba,'joueur','right',10);mobaInfliger(duel.moba,'joueur','left',7);p.ready=true;
  assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[p.id]).ok,true);assert.equal(rpgMobaLancerAttaque(duel,'joueur',[p.id],{},{declaree:true}).ok,true);assert.equal(duel.moba.winner,'joueur');assert.equal(duel.joueur.deck.length,2);assert.ok(!duel.defausseEnAttente);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Lance de la lune MOBA : ciblage dans la voie, immanquable et critique à 15 %, puis rupture', () => {
  for (const jet of [0.01, 0.8]) {
    const duel=partie(); duel.joueur.main=['gardienne-des-portes-de-sable','lance-de-la-lune-givree']; duel.joueur.mana.sable=30; duel.joueur.mana.neige=30; duel.joueur.mana.tenebres=30;
    const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
    assert.equal(rpgMobaJouerArme(duel,'joueur','lance-de-la-lune-givree',porteur.id,{ouvrirReponse:true}).sortEnAttente,true);
    assert.equal(rpgMobaPasserSort(duel,'sorcier').ok,true);
    assert.deepEqual([porteur.atk,porteur.pv,porteur.coupRapide,porteur.arme.durabilite],[2,5,true,1]);
    assert.deepEqual(porteur.coupCritique,{chance:.15,fois:2});
    rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable','gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;
    const cible=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;
    const loin=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite; rpgFinDeTour(duel);
    rpgReglerHasard(duel,()=>jet);
    assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[porteur.id],{[porteur.id]:loin.id}).raison,'cible');
    assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[porteur.id],{[porteur.id]:cible.id}).ok,true);
    const combat=rpgMobaLancerAttaque(duel,'joueur',[porteur.id],{},{declaree:true});assert.equal(combat.ok,true,JSON.stringify(combat));
    assert.equal(combat.resume.coupsRapides[0].rate,undefined);
    assert.equal(combat.resume.coupsRapides[0].critique,jet<.15);
    assert.equal(combat.resume.coupsRapides[0].degats,jet<.15?4:2);
    assert.equal(loin.pv,4); assert.equal(porteur.arme,null); assert.equal(porteur.coupRapide,false);assert.equal(porteur.coupCritique,null);
    assert.ok(duel.joueur.cimetiere.includes('lance-de-la-lune-givree')); assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Lance de la lune MOBA : pas de critique propre contre une voie vide, les autres sources subsistent', () => {
  for (const sabre of [false,true]) {
    const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','lance-de-la-lune-givree',...(sabre?['sabre-maudit']:[])];duel.joueur.mana.sable=30;duel.joueur.mana.neige=30;duel.joueur.mana.tenebres=30;duel.joueur.mana.braise=30;
    const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
    if(sabre)assert.equal(rpgMobaLancerMagie(duel,'joueur','sabre-maudit',porteur.id).ok,true);
    assert.equal(rpgMobaJouerArme(duel,'joueur','lance-de-la-lune-givree',porteur.id).ok,true);
    rpgFinDeTour(duel);rpgFinDeTour(duel);rpgReglerHasard(duel,()=>0);
    assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[porteur.id]).ok,true);
    const result=rpgMobaLancerAttaque(duel,'joueur',[porteur.id],{},{declaree:true});assert.equal(result.ok,true,JSON.stringify(result));
    assert.equal(mobaVoie(duel.moba,'left').hp.sorcier,sabre?2:8);
    assert.equal(porteur.arme,null);assert.deepEqual(porteur.coupCritique,sabre?{chance:.15,fois:2}:null);
    assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Lance de la lune MOBA : contre, remplacement et cumul critique de Kagutsuchi', () => {
  const duel=partie();duel.joueur.main=['kagutsuchi-flamme-originelle','lance-de-la-lune-givree','cuirasse-de-sel'];duel.joueur.mana.braise=30;duel.joueur.mana.neige=30;duel.joueur.mana.tenebres=30;duel.joueur.mana.sable=30;
  const porteur=rpgMobaJouerCreature(duel,'joueur','kagutsuchi-flamme-originelle','left',0).entite;
  duel.sorcier.main=['contresort-des-abimes'];duel.sorcier.mana.eau=30;
  assert.equal(rpgMobaJouerArme(duel,'joueur','lance-de-la-lune-givree',porteur.id,{ouvrirReponse:true}).sortEnAttente,true);
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','contresort-des-abimes').contre,true);assert.equal(porteur.arme,null);assert.deepEqual(porteur.coupCritique,{chance:.15,fois:4});
  duel.joueur.main.push('lance-de-la-lune-givree');assert.equal(rpgMobaJouerArme(duel,'joueur','lance-de-la-lune-givree',porteur.id).ok,true);
  assert.deepEqual(porteur.coupCritique,{chance:.3,fois:4});assert.equal(rpgMobaJouerArme(duel,'joueur','cuirasse-de-sel',porteur.id).ok,true);
  assert.deepEqual(porteur.coupCritique,{chance:.15,fois:4});assert.equal(porteur.coupRapide,true);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Sandales MOBA : Rapidité sur une créature fraîche, retirée si elles sont remplacées avant attaque', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','sandales-de-tislit','cuirasse-de-sel'];duel.joueur.mana.sable=30;
  const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','center',0).entite;
  assert.equal(rpgPeutAttaquer(porteur),false);assert.equal(rpgMobaJouerArme(duel,'joueur','sandales-de-tislit',porteur.id).ok,true);
  assert.equal(rpgPeutAttaquer(porteur),true);assert.equal(porteur.arme.durabilite,2);
  assert.equal(rpgMobaJouerArme(duel,'joueur','cuirasse-de-sel',porteur.id).ok,true);
  assert.equal(porteur.rapidite,false);assert.equal(rpgPeutAttaquer(porteur),false);assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[porteur.id]).raison,'pas-pret');
  assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Sandales MOBA : enlever les sandales ne retire ni la Rapidité imprimée ni la maturité acquise', () => {
  for(const rapide of [false,true]){
    const duel=partie();const creature=rapide?'fennec-des-decombres':'gardienne-des-portes-de-sable';
    duel.joueur.main=[creature,'sandales-de-tislit','cuirasse-de-sel'];duel.joueur.mana.sable=30;duel.joueur.mana.tenebres=30;
    const porteur=rpgMobaJouerCreature(duel,'joueur',creature,'center',0).entite;assert.ok(porteur);
    if(!rapide){rpgFinDeTour(duel);rpgFinDeTour(duel);assert.equal(porteur.malInvocation,false);duel.joueur.mana.sable=30;}
    assert.equal(rpgMobaJouerArme(duel,'joueur','sandales-de-tislit',porteur.id).ok,true);
    assert.equal(rpgMobaJouerArme(duel,'joueur','cuirasse-de-sel',porteur.id).ok,true);
    assert.equal(rpgPeutAttaquer(porteur),true);assert.equal(porteur.rapidite,rapide);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Sandales MOBA : l’attaque déclarée reste légale si Brise-lame retire la Rapidité en réponse', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','sandales-de-tislit'];duel.joueur.mana.sable=30;
  const porteur=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
  assert.equal(rpgMobaJouerArme(duel,'joueur','sandales-de-tislit',porteur.id).ok,true);
  assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[porteur.id]).ok,true);
  duel.sorcier.main=['brise-lame'];duel.sorcier.mana.braise=30;
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','brise-lame',porteur.id).ok,true);assert.equal(porteur.arme,null);
  const combat=rpgMobaLancerAttaque(duel,'joueur',[porteur.id],{},{declaree:true});assert.equal(combat.ok,true,JSON.stringify(combat));
  assert.equal(mobaVoie(duel.moba,'left').hp.sorcier,9);assert.equal(porteur.attaquee,true);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Lance de la lune MOBA : une Attaque ciblée annoncée se résout après Brise-lame', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','lance-de-la-lune-givree'];duel.joueur.mana.sable=30;duel.joueur.mana.neige=30;duel.joueur.mana.tenebres=30;
  const p=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;assert.equal(rpgMobaJouerArme(duel,'joueur','lance-de-la-lune-givree',p.id).ok,true);
  rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;const cible=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;rpgFinDeTour(duel);
  rpgReglerHasard(duel,()=>.9);assert.equal(rpgMobaDeclarerAttaque(duel,'joueur',[p.id],{[p.id]:cible.id}).ok,true);
  duel.sorcier.main=['brise-lame'];duel.sorcier.mana.braise=30;assert.equal(rpgMobaLancerMagie(duel,'sorcier','brise-lame',p.id).ok,true);assert.equal(p.coupRapide,false);
  const combat=rpgMobaLancerAttaque(duel,'joueur',[p.id],{},{declaree:true});assert.equal(combat.ok,true,JSON.stringify(combat));assert.equal(cible.pv,3);assert.equal(mobaVoie(duel.moba,'left').hp.sorcier,10);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

for (const arme of ['sandales-de-tislit','lance-de-la-lune-givree','javelot-du-beffroi']) test(`${arme} MOBA : prise en cale retire ses bonus et la libération ne les rend pas`, () => {
  const duel=partie();duel.joueur.main=['mousse-des-galiotes',arme];duel.joueur.mana.sable=30;duel.joueur.mana.neige=30;duel.joueur.mana.tenebres=30;
  const victime=rpgMobaJouerCreature(duel,'joueur','mousse-des-galiotes','left',0).entite;assert.equal(rpgMobaJouerArme(duel,'joueur',arme,victime.id).ok,true);
  rpgFinDeTour(duel);duel.sorcier.main=['la-barbe-rousse'];duel.sorcier.mana.sable=30;duel.sorcier.mana.eau=30;
  assert.equal(rpgMobaJouerCreature(duel,'sorcier','la-barbe-rousse','right',0,{ouvrirReponse:true}).creatureEnAttente,true);const rousse=rpgMobaPasserCreature(duel,'joueur').entite;
  assert.equal(rpgMobaResoudreArrivee(duel,'sorcier',victime.id).ok,true);assert.equal(rousse.enCale.entite,victime);
  assert.deepEqual([victime.atk,victime.pv,victime.pvMax,victime.rapidite,victime.coupRapide,victime.coupCritique,victime.arme],[1,2,2,false,false,null,null]);
  assert.ok(duel.joueur.cimetiere.includes(arme));
  duel.sorcier.main=[];duel.joueur.main=['effacement-des-faibles'];duel.joueur.mana.tenebres=30;
  // Barbe-Rousse coûte trop pour Effacement : une magie ciblée destructrice est jouée au tour du joueur.
  rpgFinDeTour(duel);duel.joueur.main=['le-jugement-des-colosses'];duel.joueur.mana.tenebres=30;
  const result=rpgMobaLancerMagie(duel,'joueur','le-jugement-des-colosses',rousse.id);assert.equal(result.ok,true,JSON.stringify(result));
  assert.ok(duel.joueur.creatures.includes(victime));assert.equal(victime.ready,false);assert.equal(victime.malInvocation,true);assert.equal(victime.atk,1);assert.equal(victime.pv,2);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

function fixtureGrappin({ reponse = true } = {}) {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['viking-des-neiges','gardienne-des-portes-de-sable'];duel.sorcier.mana.neige=30;duel.sorcier.mana.sable=30;
  const cible=rpgMobaJouerCreature(duel,'sorcier','viking-des-neiges','right',0).entite;
  const tropCher=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','center',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['mousse-des-galiotes','grappin-d-abordage'];duel.joueur.mana.sable=30;
  const porteur=rpgMobaJouerCreature(duel,'joueur','mousse-des-galiotes','left',0).entite;
  const pose=rpgMobaJouerArme(duel,'joueur','grappin-d-abordage',porteur.id,{ouvrirReponse:reponse});
  return { duel, cible, tropCher, porteur, pose };
}

test('Grappin MOBA : annonce payée, choix d’une prise légale intervoies puis libération', () => {
  for(const reponse of [false,true]){
    const {duel,cible,tropCher,porteur,pose}=fixtureGrappin({reponse});
    assert.equal(pose.ok,true,JSON.stringify(pose));if(reponse){assert.equal(pose.sortEnAttente,true);assert.equal(rpgMobaPasserSort(duel,'sorcier').arriveeEnAttente,true);}else assert.equal(pose.arriveeEnAttente,true);
    assert.equal(duel.arriveeEnAttente.abordage,1);assert.deepEqual(rpgMobaCiblesPrise(duel,'joueur'),[cible.id]);
    assert.equal(rpgMobaResoudreArrivee(duel,'joueur',tropCher.id).raison,'cible');assert.equal(rpgMobaResoudreArrivee(duel,'joueur',cible.id).ok,true);
    assert.equal(duel.arriveeEnAttente,null);assert.equal(porteur.enCale.entite,cible);assert.equal(porteur.arme.durabilite,2);assert.equal(porteur.coutBonusArme,1);
    assert.equal(mobaVoie(duel.moba,'right').slots.sorcier[0],null);assert.equal(rpgMobaPlacementCoherent(duel),true);
    rpgFinDeTour(duel);duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=30;
    assert.equal(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',porteur.id).ok,true);
    assert.ok(duel.sorcier.creatures.includes(cible));assert.equal(mobaVoie(duel.moba,'right').slots.sorcier[0],cible.id);
    assert.ok(duel.joueur.cimetiere.includes('grappin-d-abordage'));assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Grappin MOBA : aucun choix si la prise est illégale, une cale pleine n’est pas remplacée', () => {
  const {duel,cible,tropCher,porteur,pose}=fixtureGrappin();assert.equal(pose.sortEnAttente,true);
  cible.tenaciteDisponible=true;
  const result=rpgMobaPasserSort(duel,'sorcier');assert.equal(result.ok,true);assert.equal(duel.arriveeEnAttente,null);assert.equal(result.arriveeEnAttente,undefined);assert.ok(duel.sorcier.creatures.includes(cible));
  duel.joueur.main.push('grappin-d-abordage');cible.tenaciteDisponible=false;assert.equal(rpgMobaJouerArme(duel,'joueur','grappin-d-abordage',porteur.id).arriveeEnAttente,true);assert.equal(rpgMobaResoudreArrivee(duel,'joueur',cible.id).ok,true);
  duel.joueur.main.push('grappin-d-abordage');assert.equal(rpgMobaJouerArme(duel,'joueur','grappin-d-abordage',porteur.id).ok,true);assert.equal(duel.arriveeEnAttente,null);assert.equal(porteur.enCale.entite,cible);assert.ok(duel.sorcier.creatures.includes(tropCher));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Grappin MOBA : contresort empêche l’attachement et la prise', () => {
  const {duel,cible,porteur,pose}=fixtureGrappin();assert.equal(pose.sortEnAttente,true);duel.sorcier.main=['contresort-des-abimes'];duel.sorcier.mana.eau=30;
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','contresort-des-abimes').contre,true);assert.equal(porteur.arme,null);assert.equal(porteur.enCale,null);assert.equal(duel.arriveeEnAttente,null);assert.ok(duel.sorcier.creatures.includes(cible));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Grappin MOBA : un porteur à effet d’arrivée ne redemande pas son ancien choix', () => {
  const duel=partie();rpgFinDeTour(duel);duel.sorcier.main=['viking-des-neiges'];duel.sorcier.mana.neige=30;const victime=rpgMobaJouerCreature(duel,'sorcier','viking-des-neiges','left',0).entite;rpgFinDeTour(duel);
  duel.joueur.main=['guerrier-au-bouclier-rond','grappin-d-abordage'];duel.joueur.mana.neige=30;duel.joueur.mana.sable=30;
  const p=rpgMobaJouerCreature(duel,'joueur','guerrier-au-bouclier-rond','center',0).entite;
  if(duel.arriveeEnAttente)assert.equal(rpgMobaResoudreArrivee(duel,'joueur',p.id).ok,true);
  assert.equal(rpgMobaJouerArme(duel,'joueur','grappin-d-abordage',p.id).arriveeEnAttente,true);assert.equal(rpgMobaResoudreArrivee(duel,'joueur',victime.id).ok,true);
  assert.equal(duel.arriveeEnAttente,null);assert.equal(p.enCale.entite,victime);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Grappin MOBA : attachement et prise automatique de l’IA', () => {
  const duel=partie();duel.joueur.main=['viking-des-neiges'];duel.joueur.mana.neige=30;const victime=rpgMobaJouerCreature(duel,'joueur','viking-des-neiges','right',0).entite;
  rpgFinDeTour(duel);duel.sorcier.main=['mousse-des-galiotes','grappin-d-abordage'];duel.sorcier.mana.sable=30;
  const porteur=rpgMobaJouerCreature(duel,'sorcier','mousse-des-galiotes','left',0).entite;const result=rpgMobaJouerArme(duel,'sorcier','grappin-d-abordage',porteur.id,{ouvrirReponse:true});assert.equal(result.sortEnAttente,true);
  const passage=rpgMobaPasserSort(duel,'joueur');assert.equal(passage.ok,true,JSON.stringify(passage));assert.equal(duel.arriveeEnAttente,null);assert.equal(porteur.enCale.entite,victime);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Tours MOBA : arrivées ciblées intervoies et soin de la voie seulement', () => {
  for (const card of ['tour-de-braise', 'tour-de-neige', 'tour-de-sable', 'tour-des-flots']) {
    const duel=partie(); duel.joueur.main=['gardienne-des-portes-de-sable']; duel.joueur.mana.sable=20;
    const alliée=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;
    rpgFinDeTour(duel); duel.sorcier.main=['gardienne-des-portes-de-sable']; duel.sorcier.mana.sable=20;
    const adverse=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','center',0).entite;
    rpgFinDeTour(duel); duel.joueur.main=[card]; for(const c of Object.keys(duel.joueur.mana))duel.joueur.mana[c]=20;
    mobaVoie(duel.moba,'left').hp.joueur=5;
    const pose=rpgMobaJouerCreature(duel,'joueur',card,'left',0);assert.equal(pose.ok,true,JSON.stringify(pose));
    if(card==='tour-des-flots'){assert.equal(mobaVoie(duel.moba,'left').hp.joueur,7);assert.equal(mobaVoie(duel.moba,'right').hp.joueur,10);}
    else {assert.ok(duel.arriveeEnAttente);const cible=card==='tour-de-sable'?alliée:adverse;const pv=cible.pv;
      assert.equal(rpgMobaResoudreArrivee(duel,'joueur',cible.id).ok,true);
      if(card==='tour-de-braise')assert.equal(cible.pv,pv-1);
      if(card==='tour-de-neige')assert.ok(cible.gelToursRestants,JSON.stringify(cible));
      if(card==='tour-de-sable')assert.ok(cible.bouclier);
    }
    assert.equal(rpgPeutAttaquer(pose.entite),false);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Tours MOBA : blocage obligatoire dans la voie, dégâts avant combat et renvoi après blessures', () => {
  for(const card of ['tour-de-braise','tour-des-flots','tour-de-sable','tour-de-neige']){
    const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','gardienne-des-portes-de-sable'];duel.joueur.mana.sable=20;
    const a=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
    const b=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;
    rpgFinDeTour(duel);duel.sorcier.main=[card];for(const c of Object.keys(duel.sorcier.mana))duel.sorcier.mana[c]=20;
    const tour=rpgMobaJouerCreature(duel,'sorcier',card,'left',0).entite;assert.ok(tour,card);
    if(duel.arriveeEnAttente)assert.equal(rpgMobaResoudreArrivee(duel,'sorcier',card==='tour-de-sable'?tour.id:b.id).ok,true);
    rpgFinDeTour(duel); a.ready=true;b.ready=true;b.gelee=false;
    const hp=mobaVoie(duel.moba,'left').hp.sorcier;const pv=a.pv;
    const result=rpgMobaLancerAttaque(duel,'joueur',[a.id],{});assert.equal(result.ok,true,JSON.stringify(result));
    assert.equal(mobaVoie(duel.moba,'left').hp.sorcier,hp,card);
    if(card==='tour-de-braise')assert.equal(a.pv,pv-1);
    if(card==='tour-des-flots'){assert.ok(!duel.joueur.creatures.some(e=>e.id===a.id));assert.ok(duel.joueur.main.includes(a.carteId));}
    assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Tours MOBA : Défenseur attire les attaques ciblées dans sa voie, pas les autres voies', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable'];duel.joueur.mana.sable=30;
  const a=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
  rpgFinDeTour(duel);duel.sorcier.main=['tour-de-sable','ashigaru-des-braises','ashigaru-des-braises'];duel.sorcier.mana.sable=30;duel.sorcier.mana.braise=30;
  const tour=rpgMobaJouerCreature(duel,'sorcier','tour-de-sable','left',0).entite;
  assert.equal(rpgMobaResoudreArrivee(duel,'sorcier',tour.id).ok,true);
  const autre=rpgMobaJouerCreature(duel,'sorcier','ashigaru-des-braises','left',1).entite;
  const ailleurs=rpgMobaJouerCreature(duel,'sorcier','ashigaru-des-braises','right',0).entite;
  rpgFinDeTour(duel);a.ready=true;a.coupRapide=true;
  assert.deepEqual(rpgMobaCiblesAttaque(duel,'joueur',a.id).cibles,[tour.id]);
  assert.equal(rpgMobaLancerAttaque(duel,'joueur',[a.id],{},{ciblesAttaque:{[a.id]:autre.id}}).ok,false);
  assert.equal(rpgMobaLancerAttaque(duel,'joueur',[a.id],{},{ciblesAttaque:{[a.id]:ailleurs.id}}).ok,false);
  assert.equal(rpgMobaLancerAttaque(duel,'joueur',[a.id],{},{ciblesAttaque:{[a.id]:tour.id}}).ok,true);
  assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Tour des Flots MOBA : le bouclier adverse bloque son renvoi et est consommé', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable'];duel.joueur.mana.sable=20;
  const a=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
  rpgFinDeTour(duel);duel.sorcier.main=['tour-des-flots'];duel.sorcier.mana.eau=20;
  assert.ok(rpgMobaJouerCreature(duel,'sorcier','tour-des-flots','left',0).ok);
  rpgFinDeTour(duel);a.ready=true;a.bouclier=1;
  assert.ok(rpgMobaLancerAttaque(duel,'joueur',[a.id],{}).ok);
  assert.ok(duel.joueur.creatures.some(e=>e.id===a.id));assert.equal(a.bouclier,0);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Bâton MOBA : remplit les emplacements actifs depuis la voie du porteur et les Serpents combattent', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','baton-des-citernes'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;
  const p=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;
  const result=rpgMobaJouerArme(duel,'joueur','baton-des-citernes',p.id,{ouvrirReponse:true});assert.equal(result.sortEnAttente,true);assert.equal(duel.joueur.creatures.length,1);
  assert.equal(rpgMobaPasserSort(duel,'sorcier').ok,true);assert.equal(p.arme.carteId,'baton-des-citernes');assert.equal(p.arme.durabilite,2);
  const serpents=duel.joueur.creatures.filter(e=>e.carteId==='serpent-des-citernes');assert.equal(serpents.length,4);assert.equal(mobaVoie(duel.moba,'right').slots.joueur[1],serpents[0].id);assert.equal(rpgMobaPlacementCoherent(duel),true);
  rpgFinDeTour(duel);rpgFinDeTour(duel);const serpent=serpents.find(e=>e.mobaLane==='left');assert.equal(rpgPeutAttaquer(serpent),true);
  const combat=rpgMobaLancerAttaque(duel,'joueur',[serpent.id],{});assert.equal(combat.ok,true,JSON.stringify(combat));assert.equal(mobaVoie(duel.moba,'left').hp.sorcier,9);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Bâton MOBA : voie conquise exclue et contresort empêche tous les jetons', () => {
  for(const contre of [false,true]){
    const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','baton-des-citernes'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;
    const p=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;mobaInfliger(duel.moba,'joueur','left',10);
    assert.equal(rpgMobaJouerArme(duel,'joueur','baton-des-citernes',p.id,{ouvrirReponse:true}).ok,true);
    if(contre){duel.sorcier.main=['contresort-des-abimes'];duel.sorcier.mana.eau=30;assert.equal(rpgMobaLancerMagie(duel,'sorcier','contresort-des-abimes').contre,true);assert.equal(duel.joueur.creatures.length,1);assert.equal(p.arme,null);}
    else {assert.equal(rpgMobaPasserSort(duel,'sorcier').ok,true);assert.equal(duel.joueur.creatures.length,3);assert.ok(duel.joueur.creatures.every(e=>e.mobaLane!=='left'));}
    assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Tour des Ténèbres MOBA : destruction simultanée adverse sur toutes les voies, coûts et boucliers respectés', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable'];duel.joueur.mana.sable=30;
  const amie=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
  rpgFinDeTour(duel);duel.sorcier.main=['mousse-des-galiotes','gardienne-des-portes-de-sable','gardienne-des-portes-de-sable','gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;
  const detruite=rpgMobaJouerCreature(duel,'sorcier','mousse-des-galiotes','left',0).entite;
  const couteuse=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','center',0).entite;couteuse.coutBonusArme=1;
  const bouclier=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',0).entite;bouclier.bouclier=1;
  const detruite2=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','right',1).entite;
  rpgFinDeTour(duel);duel.joueur.main=['tour-des-tenebres'];duel.joueur.mana.tenebres=30;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','tour-des-tenebres','left',1,{ouvrirReponse:true}).creatureEnAttente,true);
  assert.ok(duel.sorcier.creatures.includes(detruite));const result=rpgMobaPasserCreature(duel,'sorcier');assert.equal(result.ok,true,JSON.stringify(result));
  assert.ok(!duel.sorcier.creatures.includes(detruite));assert.ok(!duel.sorcier.creatures.includes(detruite2));assert.ok(duel.sorcier.creatures.includes(couteuse));assert.ok(duel.sorcier.creatures.includes(bouclier));assert.equal(bouclier.bouclier,0);assert.ok(duel.joueur.creatures.includes(amie));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Tour des Ténèbres MOBA : Écueil contre la créature avant sa vague', () => {
  const duel=partie();duel.joueur.main=['tour-des-tenebres'];duel.joueur.mana.tenebres=30;duel.sorcier.main=['ecueil'];duel.sorcier.mana.eau=30;
  assert.equal(rpgMobaJouerCreature(duel,'joueur','tour-des-tenebres','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
  assert.equal(rpgMobaLancerMagie(duel,'sorcier','ecueil').contre,true);assert.ok(!duel.joueur.creatures.some(e=>e.carteId==='tour-des-tenebres'));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Réanimation MOBA : Tour des Flots soigne sa voie et Tour des Ténèbres rejoue sa vague', () => {
  const soin=reanimationFixture();soin.joueur.cimetiere=['tour-des-flots'];mobaInfliger(soin.moba,'sorcier','right',4);
  const r=rpgMobaLancerMagie(soin,'joueur','reanimation',null,'right',null,{emplacementReanimation:1});assert.equal(r.ok,true,JSON.stringify(r));assert.equal(mobaVoie(soin.moba,'right').hp.joueur,8);assert.equal(mobaVoie(soin.moba,'left').hp.joueur,10);assert.equal(rpgMobaPlacementCoherent(soin),true);
  const vague=partie();rpgFinDeTour(vague);vague.sorcier.main=['mousse-des-galiotes'];vague.sorcier.mana.sable=30;const victime=rpgMobaJouerCreature(vague,'sorcier','mousse-des-galiotes','center',0).entite;rpgFinDeTour(vague);
  vague.joueur.cimetiere=['tour-des-tenebres'];vague.joueur.main=['reanimation'];for(const c of Object.keys(vague.joueur.mana))vague.joueur.mana[c]=30;
  const retour=rpgMobaLancerMagie(vague,'joueur','reanimation',null,'right',null,{emplacementReanimation:0});assert.equal(retour.ok,true,JSON.stringify(retour));assert.ok(!vague.sorcier.creatures.includes(victime));assert.equal(rpgMobaPlacementCoherent(vague),true);
});

test('Lame des ergs MOBA : annonce et création du Chien dans la case choisie', () => {
  const duel=partie();duel.joueur.main=['lame-des-ergs'];duel.joueur.mana.sable=30;
  const before=JSON.stringify(duel);assert.equal(rpgMobaJouerArme(duel,'joueur','lame-des-ergs',null,{laneId:'center',slot:1}).raison,'cible');assert.equal(JSON.stringify(duel),before);
  const result=rpgMobaJouerArme(duel,'joueur','lame-des-ergs',null,{ouvrirReponse:true,laneId:'right',slot:1});assert.equal(result.sortEnAttente,true,JSON.stringify(result));assert.equal(duel.joueur.creatures.length,0);
  assert.deepEqual(duel.mobaSortEnAttente.placementArmeVivante,{laneId:'right',slot:1});assert.equal(rpgMobaPasserSort(duel,'sorcier').ok,true);
  const chien=duel.joueur.creatures[0];assert.equal(chien.carteId,'chien-de-sable');assert.equal(chien.arme.carteId,'lame-des-ergs');assert.equal(chien.atk,4);assert.equal(chien.pv,2);assert.equal(chien.mobaLane,'right');assert.equal(mobaVoie(duel.moba,'right').slots.joueur[1],chien.id);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Lame des ergs MOBA : porteur existant, Lien Tarek et interdiction des Murs', () => {
  const duel=partie();duel.joueur.main=['tarek','gardienne-des-portes-de-sable','tour-de-sable','lame-des-ergs'];duel.joueur.mana.sable=30;
  const tarek=rpgMobaJouerCreature(duel,'joueur','tarek','left',0).entite;assert.ok(tarek);
  const gardienne=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;assert.ok(gardienne);
  const tour=rpgMobaJouerCreature(duel,'joueur','tour-de-sable','right',1).entite;assert.ok(tour);assert.ok(rpgMobaResoudreArrivee(duel,'joueur',tour.id).ok);
  assert.equal(rpgMobaJouerArme(duel,'joueur','lame-des-ergs',tour.id).raison,'cible');assert.equal(rpgMobaJouerArme(duel,'joueur','lame-des-ergs',gardienne.id).ok,true);
  assert.equal(gardienne.arme.carteId,'lame-des-ergs');assert.equal(gardienne.atk,4);assert.ok(gardienne.bouclier);assert.equal(duel.joueur.creatures.filter(e=>e.carteId==='chien-de-sable').length,2,'seuls les deux jetons de Tarek existent');assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Lame des ergs MOBA : contre ou fermeture de la voie réservée empêche la naissance sans nouveau paiement', () => {
  for (const contre of [true,false]) {
    const duel=partie();duel.joueur.main=['lame-des-ergs'];duel.joueur.mana.sable=30;
    assert.ok(rpgMobaJouerArme(duel,'joueur','lame-des-ergs',null,{ouvrirReponse:true,laneId:'right',slot:1}).ok);const paye=duel.joueur.mana.sable;
    if(contre){duel.sorcier.main=['contresort-des-abimes'];duel.sorcier.mana.eau=30;assert.equal(rpgMobaLancerMagie(duel,'sorcier','contresort-des-abimes').contre,true);}
    else {mobaInfliger(duel.moba,'sorcier','right',10);const r=rpgMobaPasserSort(duel,'sorcier');assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.dissipe,true);}
    assert.equal(duel.joueur.mana.sable,paye);assert.equal(duel.joueur.creatures.length,0);assert.equal(duel.joueur.cimetiere.filter(c=>c==='lame-des-ergs').length,1);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Lame des ergs MOBA : création directe, refus sans emplacement libre et aucune cible imaginaire', () => {
  const duel=partie();duel.joueur.main=['lame-des-ergs'];duel.joueur.mana.sable=30;
  assert.equal(rpgMobaJouerArme(duel,'joueur','lame-des-ergs','inconnu',{laneId:'left',slot:0}).raison,'cible');
  const result=rpgMobaJouerArme(duel,'joueur','lame-des-ergs',null,{laneId:'center',slot:0});assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.entite.arme.carteId,'lame-des-ergs');assert.equal(mobaVoie(duel.moba,'center').slots.joueur[0],result.entite.id);
  duel.joueur.main.push('lame-des-ergs');const avant=JSON.stringify(duel);assert.equal(rpgMobaJouerArme(duel,'joueur','lame-des-ergs',null,{laneId:'center',slot:0}).raison,'cible');assert.equal(JSON.stringify(duel),avant);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Trésor de Lima MOBA : installation annoncée, deux Heures, pioche et case libérée', () => {
  const duel=partie();duel.joueur.main=['le-tresor-de-lima'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;duel.joueur.deck=Array(8).fill('gardienne-des-portes-de-sable');
  const a=rpgMobaJouerCreature(duel,'joueur','le-tresor-de-lima','right',1,{ouvrirReponse:true});assert.equal(a.creatureEnAttente,true);assert.equal(duel.joueur.creatures.length,0);
  const r=rpgMobaPasserCreature(duel,'sorcier');assert.equal(r.ok,true,JSON.stringify(r));const site=r.entite;assert.equal(site.heures.restants,2);assert.equal(mobaVoie(duel.moba,'right').slots.joueur[1],site.id);assert.equal(rpgPeutAttaquer(site),false);
  assert.equal(terminerEtPasser(duel,'joueur').ok,true);assert.equal(terminerEtPasser(duel,'sorcier').ok,true);assert.equal(site.heures.restants,1);assert.equal(rpgMobaPlacementCoherent(duel),true);
  assert.equal(terminerEtPasser(duel,'joueur').ok,true);const before=duel.joueur.deck.length;assert.equal(terminerEtPasser(duel,'sorcier').ok,true);
  assert.equal(duel.joueur.deck.length,before-3,'deux cartes en plus de la pioche du tour');assert.ok(duel.joueur.cimetiere.includes('le-tresor-de-lima'));assert.equal(mobaVoie(duel.moba,'right').slots.joueur[1],null);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Trésor de Lima MOBA : ne se combat ni ne se cible, une Attaque ciblée peut frapper la voie', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable'];duel.joueur.mana.sable=30;const a=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','left',0).entite;
  rpgFinDeTour(duel);duel.sorcier.main=['le-tresor-de-lima'];duel.sorcier.mana.sable=30;duel.sorcier.mana.eau=30;const site=rpgMobaJouerCreature(duel,'sorcier','le-tresor-de-lima','left',0).entite;assert.ok(site);
  rpgFinDeTour(duel);a.ready=true;a.coupRapide=true;assert.deepEqual(rpgMobaCiblesAttaque(duel,'joueur',a.id),{obligatoires:false,cibles:[]});
  duel.joueur.main=['trait-de-braise'];duel.joueur.mana.braise=30;assert.equal(rpgMobaLancerMagie(duel,'joueur','trait-de-braise',site.id).ok,false);
  const combat=rpgMobaLancerAttaque(duel,'joueur',[a.id],{});assert.equal(combat.ok,true,JSON.stringify(combat));assert.equal(mobaVoie(duel.moba,'left').hp.sorcier,9);assert.ok(duel.sorcier.creatures.includes(site));assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Trésor de Lima MOBA : seule une carte-contresort peut contrer son annonce', () => {
  for(const carte of ['ecueil','contresort-des-abimes']) {
    const duel=partie();duel.joueur.main=['le-tresor-de-lima'];duel.joueur.mana.eau=30;duel.joueur.mana.sable=30;duel.sorcier.main=[carte];duel.sorcier.mana.eau=30;
    assert.ok(rpgMobaJouerCreature(duel,'joueur','le-tresor-de-lima','center',0,{ouvrirReponse:true}).ok);
    const result=rpgMobaLancerMagie(duel,'sorcier',carte);assert.equal(Boolean(result.contre),carte==='contresort-des-abimes');
    if(carte==='ecueil'){assert.equal(result.ok,false);assert.ok(rpgMobaPasserCreature(duel,'sorcier').ok);assert.equal(duel.joueur.creatures[0].carteId,'le-tresor-de-lima');}
    else {assert.equal(duel.joueur.creatures.length,0);assert.ok(duel.joueur.cimetiere.includes('le-tresor-de-lima'));}
    assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Trésor de Lima MOBA : Lettre préservée, non réanimable et exilé par conquête sans récompense', () => {
  const duel=partie();duel.joueur.main=['le-tresor-de-lima','reanimation'];duel.joueur.mana.eau=30;duel.joueur.mana.sable=30;duel.joueur.mana.tenebres=30;
  duel.joueur.prochaineArriveeAbordage=true;const site=rpgMobaJouerCreature(duel,'joueur','le-tresor-de-lima','left',0).entite;assert.ok(site);assert.equal(duel.joueur.prochaineArriveeAbordage,true);assert.ok(!duel.arriveeEnAttente);
  // Conquest uses the adapter's authoritative combat cleanup.
  rpgFinDeTour(duel);duel.sorcier.main=['gardienne-des-portes-de-sable'];duel.sorcier.mana.sable=30;const a=rpgMobaJouerCreature(duel,'sorcier','gardienne-des-portes-de-sable','left',0).entite;a.ready=true;a.malInvocation=false;mobaVoie(duel.moba,'left').hp.joueur=1;
  assert.ok(rpgMobaLancerAttaque(duel,'sorcier',[a.id],{}).ok);assert.ok(!duel.joueur.creatures.includes(site));assert.ok(!duel.joueur.cimetiere.includes('le-tresor-de-lima'));assert.equal(rpgMobaPlacementCoherent(duel),true);
  // A finished Site in a cemetery is not an eligible creature for Réanimation.
  const other=reanimationFixture();other.joueur.cimetiere=['le-tresor-de-lima'];const before=JSON.stringify(other);assert.equal(rpgMobaLancerMagie(other,'joueur','reanimation',null,'center',null,{emplacementReanimation:0}).raison,'cible');assert.equal(JSON.stringify(other),before);
});

test('Trésor de Lima MOBA : les effets de zone ne blessent, ne gèlent ni ne renvoient les Sites', () => {
  for (const carte of ['grand-hiver','tempete-de-sable','ressac-de-la-lune-noire','la-derniere-pesee']) {
    const duel=partie();duel.joueur.main=['le-tresor-de-lima'];for(const k of Object.keys(duel.joueur.mana))duel.joueur.mana[k]=30;
    const site=rpgMobaJouerCreature(duel,'joueur','le-tresor-de-lima','left',0).entite;assert.ok(site);rpgFinDeTour(duel);
    duel.sorcier.main=[carte];for(const k of Object.keys(duel.sorcier.mana))duel.sorcier.mana[k]=30;
    const r=rpgMobaLancerMagie(duel,'sorcier',carte);assert.equal(r.ok,true,`${carte}: ${JSON.stringify(r)}`);assert.ok(duel.joueur.creatures.includes(site),carte);assert.equal(site.pv,1,carte);assert.ok(!site.gelee,carte);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Lame des ergs MOBA : le Chien créé profite du Lien Tarek et de son aura locale', () => {
  const duel=partie();duel.joueur.main=['tarek','lame-des-ergs'];duel.joueur.mana.sable=30;
  const tarek=rpgMobaJouerCreature(duel,'joueur','tarek','left',0).entite;assert.ok(tarek);
  const chienInitial=duel.joueur.creatures.find(e=>e.carteId==='chien-de-sable'&&e.mobaLane==='left');assert.ok(chienInitial);duel.joueur.creatures=duel.joueur.creatures.filter(e=>e.id!==chienInitial.id);assert.equal(mobaRetirer(duel.moba,'joueur',chienInitial.id).ok,true);
  const r=rpgMobaJouerArme(duel,'joueur','lame-des-ergs',null,{laneId:'left',slot:1});assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.entite.carteId,'chien-de-sable');assert.ok(r.entite.bouclier);assert.equal(r.entite.atk,5);assert.equal(r.entite.pv,3);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Source de Bimini MOBA : choix obligatoire après trois Heures et récompense dans une autre voie', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','source-de-bimini'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;
  const cible=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;const site=rpgMobaJouerCreature(duel,'joueur','source-de-bimini','left',0).entite;assert.ok(cible&&site);cible.pv=1;cible.def=1;
  for(let n=2;n>=0;n--){assert.equal(terminerEtPasser(duel,'joueur').ok,true);assert.equal(terminerEtPasser(duel,'sorcier').ok,true);if(n)assert.equal(site.heures.restants,n);}
  assert.equal(duel.phase,'debut');assert.equal(duel.siteEnAttente.entiteId,site.id);assert.deepEqual(rpgMobaCiblesSite(duel,'joueur'),[cible.id]);assert.equal(rpgMobaResoudreSite(duel,'joueur',site.id).ok,false);assert.equal(rpgMobaTerminerTour(duel,'joueur').ok,false);
  const result=rpgMobaResoudreSite(duel,'joueur',cible.id);assert.equal(result.ok,true,JSON.stringify(result));assert.equal(cible.atk,4);assert.equal(cible.pv,7);assert.equal(cible.pvMax,7);assert.equal(cible.bouclier,1);assert.equal(cible.tenaciteDisponible,true);assert.equal(duel.phase,'principale');assert.equal(duel.siteEnAttente,null);assert.ok(duel.joueur.cimetiere.includes('source-de-bimini'));assert.equal(mobaVoie(duel.moba,'left').slots.joueur[0],null);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Source de Bimini MOBA : choix successifs de deux Sites avant le reste du début de tour', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','source-de-bimini','source-de-bimini','le-tresor-de-lima'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;
  const cible=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;const a=rpgMobaJouerCreature(duel,'joueur','source-de-bimini','left',0).entite;const b=rpgMobaJouerCreature(duel,'joueur','source-de-bimini','left',1).entite;const lima=rpgMobaJouerCreature(duel,'joueur','le-tresor-de-lima','center',0).entite;assert.ok(cible&&a&&b&&lima);a.heures.restants=1;b.heures.restants=1;lima.heures.restants=1;
  terminerEtPasser(duel,'joueur');terminerEtPasser(duel,'sorcier');assert.equal(duel.siteEnAttente.entiteId,a.id);assert.equal(b.heures.restants,1);assert.equal(lima.heures.restants,1);assert.equal(duel.phase,'debut');
  assert.ok(rpgMobaResoudreSite(duel,'joueur',cible.id).ok);assert.equal(duel.siteEnAttente.entiteId,b.id);assert.equal(lima.heures.restants,1);assert.equal(duel.phase,'debut');
  assert.ok(rpgMobaResoudreSite(duel,'joueur',cible.id).ok);assert.equal(duel.siteEnAttente,null);assert.equal(duel.phase,'principale');assert.equal(cible.atk,7);assert.equal(cible.pvMax,10);assert.ok(!duel.joueur.creatures.includes(lima));assert.equal(duel.joueur.cimetiere.filter(id=>id==='source-de-bimini').length,2);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Source de Bimini MOBA : pas de créature éligible ou choix automatique du sorcier', () => {
  const seul=partie();seul.joueur.main=['source-de-bimini'];seul.joueur.mana.sable=30;seul.joueur.mana.eau=30;const site=rpgMobaJouerCreature(seul,'joueur','source-de-bimini','left',0).entite;site.heures.restants=1;terminerEtPasser(seul,'joueur');terminerEtPasser(seul,'sorcier');assert.equal(seul.siteEnAttente,null);assert.ok(seul.joueur.cimetiere.includes('source-de-bimini'));assert.equal(rpgMobaPlacementCoherent(seul),true);
  const ia=partie();terminerEtPasser(ia,'joueur');ia.sorcier.main=['gardienne-des-portes-de-sable','source-de-bimini'];ia.sorcier.mana.sable=30;ia.sorcier.mana.eau=30;const cible=rpgMobaJouerCreature(ia,'sorcier','gardienne-des-portes-de-sable','right',0).entite;const source=rpgMobaJouerCreature(ia,'sorcier','source-de-bimini','center',0).entite;source.heures.restants=1;terminerEtPasser(ia,'sorcier');terminerEtPasser(ia,'joueur');assert.equal(ia.siteEnAttente,null);assert.equal(cible.atk,4);assert.ok(ia.sorcier.cimetiere.includes('source-de-bimini'));assert.equal(rpgMobaPlacementCoherent(ia),true);
});

test('Source de Bimini MOBA : la consécration précède les échos du début de tour', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','source-de-bimini'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;const cible=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;const site=rpgMobaJouerCreature(duel,'joueur','source-de-bimini','left',0).entite;site.heures.restants=1;cible.pv=1;cible.def=1;
  duel.joueur.degatsEchos=[{coteSource:'joueur',toursRestants:1,amount:2,carteId:'nuage-de-cendres',sourceType:'sort',sourceElement:'braise'}];terminerEtPasser(duel,'joueur');terminerEtPasser(duel,'sorcier');assert.equal(cible.pv,1);assert.equal(duel.joueur.degatsEchos.length,1);assert.equal(duel.phase,'debut');
  assert.ok(rpgMobaResoudreSite(duel,'joueur',cible.id).ok);assert.equal(cible.pv,5);assert.equal(cible.bouclier,1);assert.equal(duel.joueur.degatsEchos.length,0);assert.equal(duel.phase,'principale');assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Source de Bimini MOBA : contresort de carte, mais pas Écueil', () => {
  for(const carte of ['ecueil','contresort-des-abimes']) {
    const duel=partie();duel.joueur.main=['source-de-bimini'];duel.joueur.mana.eau=30;duel.joueur.mana.sable=30;duel.sorcier.main=[carte];duel.sorcier.mana.eau=30;
    assert.equal(rpgMobaJouerCreature(duel,'joueur','source-de-bimini','center',0,{ouvrirReponse:true}).creatureEnAttente,true);const result=rpgMobaLancerMagie(duel,'sorcier',carte);assert.equal(Boolean(result.contre),carte==='contresort-des-abimes');
    if(carte==='ecueil'){assert.equal(result.ok,false);assert.equal(rpgMobaPasserCreature(duel,'sorcier').entite.carteId,'source-de-bimini');}else{assert.equal(duel.joueur.creatures.length,0);assert.ok(duel.joueur.cimetiere.includes('source-de-bimini'));}assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Source de Bimini MOBA : le bouclier et la Tenacité conférés servent réellement', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','source-de-bimini'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;const cible=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;const site=rpgMobaJouerCreature(duel,'joueur','source-de-bimini','left',0).entite;site.heures.restants=1;terminerEtPasser(duel,'joueur');terminerEtPasser(duel,'sorcier');assert.ok(rpgMobaResoudreSite(duel,'joueur',cible.id).ok);cible.pv=1;cible.def=1;terminerEtPasser(duel,'joueur');
  duel.sorcier.main=['trait-de-braise','trait-de-braise'];duel.sorcier.mana.braise=30;assert.ok(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',cible.id).ok);assert.equal(cible.bouclier,0);assert.equal(cible.pv,1);assert.ok(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise',cible.id).ok);assert.ok(!duel.joueur.creatures.includes(cible));assert.equal(duel.joueur.retoursProgrammes.length,1);assert.equal(duel.joueur.retoursProgrammes[0].mobaLane,'right');
  terminerEtPasser(duel,'sorcier');const retour=duel.joueur.creatures.find(e=>e.carteId==='gardienne-des-portes-de-sable');assert.ok(retour);assert.equal(retour.mobaLane,'right');assert.equal(retour.pv,1);assert.equal(retour.tenaciteDisponible,false);assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Source de Bimini MOBA : Lien Eau de la source recalculé après une réponse qui conquiert sa voie', () => {
  for(const conquete of [false,true]) {
    const duel=partie();duel.joueur.main=['source-de-bimini','eau-de-la-source'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;const source=rpgMobaJouerCreature(duel,'joueur','source-de-bimini','left',0).entite;assert.ok(source);mobaInfliger(duel.moba,'sorcier','right',8);
    if(conquete)mobaInfliger(duel.moba,'sorcier','left',9);
    assert.equal(rpgMobaLancerMagie(duel,'joueur','eau-de-la-source',null,'right',null,{ouvrirReponse:true}).sortEnAttente,true);
    if(conquete){duel.sorcier.main=['trait-de-braise'];duel.sorcier.mana.braise=30;assert.ok(rpgMobaLancerMagie(duel,'sorcier','trait-de-braise','sorcier','left').ok);assert.ok(!duel.joueur.creatures.includes(source));}
    const r=rpgMobaPasserSort(duel,'sorcier');assert.equal(r.ok,true,JSON.stringify(r));assert.equal(mobaVoie(duel.moba,'right').hp.joueur,conquete?6:8);assert.equal(r.healingEvents[0].healing,conquete?4:6);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

test('Source de Bimini MOBA : une destruction prioritaire conquiert sa voie et dissipe son choix', () => {
  const duel=partie();duel.joueur.main=['gardienne-des-portes-de-sable','source-de-bimini'];duel.joueur.mana.sable=30;duel.joueur.mana.eau=30;const cible=rpgMobaJouerCreature(duel,'joueur','gardienne-des-portes-de-sable','right',0).entite;const source=rpgMobaJouerCreature(duel,'joueur','source-de-bimini','left',0).entite;source.heures.restants=1;rpgFinDeTour(duel);duel.sorcier.main=['le-brulot'];duel.sorcier.mana.braise=30;const brulot=rpgMobaJouerCreature(duel,'sorcier','le-brulot','left',0).entite;brulot.pv=1;brulot.def=1;rpgFinDeTour(duel);assert.equal(duel.siteEnAttente.entiteId,source.id);
  // La mort d'un Ghul peut déjà attendre sa désignation à ce stade.
  duel.destructionsEnAttente=[{cote:'joueur',carteId:'ghul-des-cendres'}];mobaInfliger(duel.moba,'sorcier','left',8);assert.equal(rpgMobaResoudreSite(duel,'joueur',cible.id).raison,'timing');
  const r=rpgMobaResoudreDestruction(duel,'joueur',brulot.id);assert.equal(r.ok,true,JSON.stringify(r));assert.ok(!duel.joueur.creatures.includes(source));assert.equal(duel.siteEnAttente,null);assert.equal(duel.mobaDebutTourEnAttente,null);assert.equal(duel.phase,'principale');assert.equal(cible.atk,1);assert.equal(mobaVoie(duel.moba,'left').conqueredBy,'sorcier');assert.equal(rpgMobaPlacementCoherent(duel),true);
});

test('Sphère injectée : le renvoi pendant un duel d’arrivée libère la voie MOBA', () => {
  assert.equal(MOBA_CARTES_AUTORISEES.includes('sphere-de-rotation'),true);
  for(const side of ['joueur','sorcier']) {
    const {duel,enemy,adversaire}=fixtureDuelArrivee(side);duel[side].main=['bakunawa'];
    assert.equal(rpgMobaJouerCreature(duel,side,'bakunawa','left',0,{ouvrirReponse:true}).creatureEnAttente,true);
    const source=rpgMobaPasserCreature(duel,enemy).entite;
    // Injection par le moteur commun pour tester un duel d'arrivée directement.
    duel[enemy].main.push('sphere-de-rotation');duel[enemy].mana.sable=30;
    assert.equal(rpgJouerArme(duel,enemy,'sphere-de-rotation',adversaire.id).ok,true);
    adversaire.bouclier=0;rpgReglerHasard(duel,()=>.14);const pv=adversaire.pv;
    assert.equal(rpgMobaResoudreArrivee(duel,side,adversaire.id).ok,true);
    assert.equal(adversaire.pv,pv);assert.ok(duel[side].main.includes('bakunawa'));assert.ok(!duel[side].creatures.includes(source));assert.equal(mobaVoie(duel.moba,'left').slots[side][0],null);assert.equal(rpgMobaPlacementCoherent(duel),true);
  }
});

// Additional catalogue creatures reuse audited mechanics, exercised through the
// actual lane adapter rather than by inserting entities into the battlefield.
for (const side of ['joueur', 'sorcier']) {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  function nouvellePartie() {
    const duel = partieCombat();
    duel.tour = side;
    Object.assign(duel[side].mana, { braise: 30, sable: 30, tenebres: 30 });
    Object.assign(duel[enemy].mana, { braise: 30, sable: 30, tenebres: 30 });
    return duel;
  }
  function pose(duel, camp, id, lane, slot = 0) {
    duel.tour = camp; duel[camp].main.push(id);
    const r = rpgMobaJouerCreature(duel, camp, id, lane, slot);
    assert.equal(r.ok, true, `${id}: ${JSON.stringify(r)}`);
    return r.entite;
  }
  function combat(duel, attaquant, blocks = {}) {
    duel.tour = side; attaquant.ready = true;
    assert.equal(rpgMobaDeclarerAttaque(duel, side, [attaquant.id]).ok, true);
    const r = rpgMobaLancerAttaque(duel, side, [attaquant.id], blocks, { declaree: true });
    assert.equal(r.ok, true, JSON.stringify(r)); return r;
  }
  test(`Nouveau catalogue MOBA : Rapidité, Infiltration et Défenseur (${side})`, () => {
    for (const id of ['messagere-des-cendres', 'gerboise-des-ruines', 'danseuse-des-ombres-de-dune']) {
      const duel = nouvellePartie(), a = pose(duel, side, id, 'left');
      assert.equal(rpgPeutAttaquer(a), true, id);
    }
    for (const id of ['rodeuse-des-tombes', 'danseuse-des-ombres-de-dune']) {
      const duel = nouvellePartie(), a = pose(duel, side, id, 'left'), b = pose(duel, enemy, 'chien-du-guet', 'left');
      assert.equal(rpgPeutBloquerAttaquant(b, a), false, id);
      combat(duel, a); assert.equal(mobaVoie(duel.moba, 'left').hp[enemy], 10 - a.atk);
    }
    for (const id of ['garde-du-voile', 'gardien-des-sept-sceaux', 'sentinelle-du-brasier']) {
      const duel = nouvellePartie(); const d = pose(duel, enemy, id, 'left');
      const autre = pose(duel, enemy, 'chien-du-guet', 'left', 1);
      const a = pose(duel, side, 'gardienne-des-portes-de-sable', 'left'); a.coupRapide = true; a.ready = true;
      assert.ok(rpgMobaCiblesAttaque(duel, side, a.id).cibles.includes(d.id), id);
      assert.ok(!rpgMobaCiblesAttaque(duel, side, a.id).cibles.includes(autre.id), id);
    }
  });
  test(`Nouveau catalogue MOBA : Vol de vie imprimé et équipement (${side})`, () => {
    for (const id of ['novice-des-cendres', 'chasseuse-de-braise', 'sentinelle-du-brasier', 'danseuse-des-ombres-de-dune']) {
      const duel = nouvellePartie(); const a = pose(duel, side, id, 'left');
      mobaInfliger(duel.moba, enemy, 'left', 4);
      const r = combat(duel, a);
      assert.equal(mobaVoie(duel.moba, 'left').hp[side], 6 + Math.ceil(a.atk / 2), id);
      assert.ok(r.healingEvents.some(e => e.volDeVie && e.laneId === 'left'), id);
      assert.equal(mobaVoie(duel.moba, 'right').hp[side], 10);
      assert.equal(rpgMobaPlacementCoherent(duel), true);
    }
    const duel = nouvellePartie(), a = pose(duel, side, 'chasseuse-de-braise', 'left');
    duel[side].main.push('sabre-du-croissant-noir');
    assert.equal(rpgMobaJouerArme(duel, side, 'sabre-du-croissant-noir', a.id).ok, true);
    combat(duel, a); assert.equal(a.arme, null); assert.equal(a.volDeVie, true);
    // An arbitrary flag on a card without printed lifesteal remains rejected.
    const d = nouvellePartie(), fake = pose(d, side, 'chien-du-guet', 'left'); fake.volDeVie = true;
    assert.equal(rpgMobaDeclarerAttaque(d, side, [fake.id]).raison, 'effet-non-pris-en-charge');
  });
  test(`Nouveau catalogue MOBA : mort, pioche et Tribut (${side})`, () => {
    const duel = nouvellePartie();
    const p = pose(duel, side, 'porteur-de-la-plume', 'right');
    const s = pose(duel, side, 'scarabee-des-sceaux', 'left');
    mobaInfliger(duel.moba, enemy, 'right', 4); duel[side].deck = ['chien-du-guet'];
    duel[side].main.push('effacement-des-faibles');
    const r = rpgMobaLancerMagie(duel, side, 'effacement-des-faibles', p.id);
    assert.equal(r.ok, true); assert.equal(mobaVoie(duel.moba, 'right').hp[side], 7);
    assert.ok(r.healingEvents.some(e => e.laneId === 'right' && e.healing === 1));
    duel[side].main.push('effacement-des-faibles');
    assert.equal(rpgMobaLancerMagie(duel, side, 'effacement-des-faibles', s.id).ok, true);
    assert.deepEqual(duel[side].deck, []); assert.ok(duel[side].main.includes('chien-du-guet'));
    const d = nouvellePartie(), v = pose(d, side, 'veuve-des-urnes', 'right');
    mobaInfliger(d.moba, enemy, 'right', 2); const hit = combat(d, v);
    assert.equal(mobaVoie(d.moba, 'right').hp[enemy], 7); assert.equal(mobaVoie(d.moba, 'right').hp[side], 9);
    assert.ok(hit.damageEvents.some(e => e.tribut)); assert.equal(rpgMobaPlacementCoherent(d), true);
  });
  test(`Nouveau catalogue MOBA : Poison en combat puis aux tours de la victime (${side})`, () => {
    for (const id of ['scorpion-du-seuil', 'manticore-des-dunes']) {
      const duel = nouvellePartie(), a = pose(duel, side, id, 'left');
      const b = pose(duel, enemy, 'dune-marchante', 'left'); b.pv = b.def = 10; b.pvMax = 10;
      combat(duel, a, { [a.id]: [b.id] });
      assert.equal(b.poison?.toursRestants, 2, id);
      const pv = b.pv; rpgFinDeTour(duel); assert.equal(b.pv, pv - 1); assert.equal(b.poison.toursRestants, 1);
      rpgFinDeTour(duel); rpgFinDeTour(duel); assert.equal(b.pv, pv - 2); assert.equal(b.poison, null);
      assert.equal(rpgMobaPlacementCoherent(duel), true);
    }
  });
  test(`Nouveau catalogue MOBA : Vampire des braises et Archonte (${side})`, () => {
    const duel = nouvellePartie(), v = pose(duel, side, 'vampire-des-braises', 'left');
    const b = pose(duel, enemy, 'ashigaru-des-braises', 'left'); combat(duel, v, { [v.id]: [b.id] });
    assert.ok(!duel[enemy].creatures.includes(b)); assert.equal(v.pv, 2); assert.equal(rpgMobaPlacementCoherent(duel), true);
    const d = nouvellePartie(), danseuse = pose(d, side, 'danseuse-des-ombres-de-dune', 'left');
    const chien = pose(d, side, 'chien-du-guet', 'right'); const foe = pose(d, enemy, 'novice-des-cendres', 'center');
    const archonte = pose(d, side, 'archonte-du-sablier-noir', 'center');
    assert.deepEqual([danseuse.atk, chien.atk, foe.atk, archonte.atk], [4, 2, 1, 6]);
    rpgFinDeTour(d); assert.deepEqual([danseuse.atk, archonte.atk], [2, 4]); assert.equal(rpgMobaPlacementCoherent(d), true);
  });
}

for (const side of ['joueur', 'sorcier']) test(`Poison MOBA : mort au début du tour, pioche et libération de voie (${side})`, () => {
  const duel = partieCombat(), enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  duel.tour = side; Object.assign(duel[side].mana, { sable: 30 });
  duel[side].main = ['scorpion-du-seuil'];
  const scorpion = rpgMobaJouerCreature(duel, side, 'scorpion-du-seuil', 'left', 0).entite;
  duel.tour = enemy; duel[enemy].mana.sable = 30; duel[enemy].main = ['scarabee-des-sceaux'];
  const scarabee = rpgMobaJouerCreature(duel, enemy, 'scarabee-des-sceaux', 'left', 0).entite;
  duel.tour = side; scorpion.ready = true;
  assert.equal(rpgMobaDeclarerAttaque(duel, side, [scorpion.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, side, [scorpion.id], { [scorpion.id]: [scarabee.id] }, { declaree: true }).ok, true);
  assert.equal(scarabee.pv, 1); assert.equal(scarabee.poison.toursRestants, 2);
  duel[enemy].deck = ['chien-du-guet', 'gardienne-des-portes-de-sable'];
  assert.equal(rpgMobaTerminerTour(duel, side).ok, true);
  const result = rpgMobaPasserFinDeTour(duel, enemy);
  assert.equal(result.ok, true); assert.ok(!duel[enemy].creatures.includes(scarabee));
  assert.deepEqual(duel[enemy].deck, []); assert.ok(duel[enemy].cimetiere.includes('scarabee-des-sceaux'));
  assert.equal(mobaVoie(duel.moba, 'left').slots[enemy][0], null); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const side of ['joueur', 'sorcier']) test(`Nouveaux Vampires MOBA : blocage, soin de combat et immunité au Ressac (${side})`, () => {
  const duel = partieCombat(), enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  for (const camp of [side, enemy]) Object.assign(duel[camp].mana, { braise: 30, sable: 30, eau: 30, tenebres: 30 });
  duel.tour = side; duel[side].main = ['vampire-des-braises', 'chasseuse-de-braise'];
  const vampire = rpgMobaJouerCreature(duel, side, 'vampire-des-braises', 'left', 0).entite;
  const chasseuse = rpgMobaJouerCreature(duel, side, 'chasseuse-de-braise', 'right', 0).entite;
  mobaInfliger(duel.moba, enemy, 'right', 3);
  duel.tour = enemy; duel[enemy].main = ['ashigaru-des-braises', 'dune-marchante'];
  const faible = rpgMobaJouerCreature(duel, enemy, 'ashigaru-des-braises', 'left', 0).entite;
  const dune = rpgMobaJouerCreature(duel, enemy, 'dune-marchante', 'right', 0).entite;
  faible.ready = dune.ready = true;
  assert.equal(rpgMobaDeclarerAttaque(duel, enemy, [faible.id, dune.id]).ok, true);
  const res = rpgMobaLancerAttaque(duel, enemy, [faible.id, dune.id], { [faible.id]: [vampire.id], [dune.id]: [chasseuse.id] }, { declaree: true });
  assert.equal(res.ok, true, JSON.stringify(res)); assert.equal(vampire.pv, 2);
  assert.ok(!duel[enemy].creatures.includes(faible)); assert.equal(mobaVoie(duel.moba, 'right').hp[side], 8);
  assert.ok(res.healingEvents.some(e => e.volDeVie && e.laneId === 'right'));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  // A fresh vampire survives the global return, unlike a non-Vampire.
  const d = partieCombat(); d.tour = side; Object.assign(d[side].mana, { braise: 30, sable: 30, eau: 30, tenebres: 30 });
  d[side].main = ['novice-des-cendres', 'chien-du-guet', 'ressac-de-la-lune-noire'];
  const novice = rpgMobaJouerCreature(d, side, 'novice-des-cendres', 'left', 0).entite;
  const chien = rpgMobaJouerCreature(d, side, 'chien-du-guet', 'right', 0).entite;
  assert.equal(rpgMobaLancerMagie(d, side, 'ressac-de-la-lune-noire').ok, true);
  assert.ok(d[side].creatures.includes(novice)); assert.ok(!d[side].creatures.includes(chien));
  assert.equal(rpgMobaPlacementCoherent(d), true);
});

test('Poison MOBA : une victoire à la mort arrête les doses suivantes du début de tour', () => {
  const duel = partieCombat();
  mobaInfliger(duel.moba, 'joueur', 'left', 10);
  mobaInfliger(duel.moba, 'joueur', 'right', 8);
  duel.joueur.main = ['le-brulot', 'chien-du-guet']; duel.joueur.mana.braise = 30; duel.joueur.mana.sable = 30;
  const brulot = rpgMobaJouerCreature(duel, 'joueur', 'le-brulot', 'right', 0).entite;
  const chien = rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'center', 0).entite;
  brulot.pv = 1; brulot.poison = { degats: 1, toursRestants: 2, sourceCarteId: 'scorpion-du-seuil' };
  chien.poison = { degats: 1, toursRestants: 2, sourceCarteId: 'scorpion-du-seuil' };
  rpgFinDeTour(duel); duel.sorcier.main = [];
  const pv = chien.pv;
  assert.equal(rpgMobaTerminerTour(duel, 'sorcier').ok, true);
  assert.equal(rpgMobaPasserFinDeTour(duel, 'joueur').ok, true);
  assert.equal(duel.moba.winner, 'joueur');
  assert.equal(chien.pv, pv); assert.equal(chien.poison.toursRestants, 2);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const side of ['joueur', 'sorcier']) {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  const prep = () => {
    const d = partieCombat(); d.tour = side;
    for (const camp of [side, enemy]) Object.assign(d[camp].mana, { sable: 30, tenebres: 30, braise: 30, neige: 30, eau: 30 });
    return d;
  };
  const pose = (d, camp, id, lane, slot = 0) => {
    d.tour = camp; d[camp].main.push(id);
    const r = rpgMobaJouerCreature(d, camp, id, lane, slot);
    assert.equal(r.ok, true, `${id}: ${JSON.stringify(r)}`); return r.entite;
  };
  test(`Nécropole MOBA : le Scarabée du natron crée un Shabti à sa mort, pas à son renvoi (${side})`, () => {
    for (const mode of ['mort', 'renvoi']) {
      const d = prep(), scarabee = pose(d, side, 'scarabee-du-natron', 'right');
      d.tour = enemy; d[enemy].main = [mode === 'mort' ? 'trait-de-braise' : 'ressac'];
      const r = rpgMobaLancerMagie(d, enemy, d[enemy].main[0], scarabee.id);
      assert.equal(r.ok, true, JSON.stringify(r));
      const shabti = d[side].creatures.find(e => e.carteId === 'shabti');
      if (mode === 'mort') { assert.ok(shabti?.jeton); assert.equal(shabti.mobaLane, 'right'); assert.equal(mobaVoie(d.moba, 'right').slots[side][0], shabti.id); }
      else { assert.equal(shabti, undefined); assert.ok(d[side].main.includes('scarabee-du-natron')); }
      assert.equal(rpgMobaPlacementCoherent(d), true);
    }
  });
  test(`Nécropole MOBA : Lecteur pioche deux cartes puis défausse (${side})`, () => {
    const d = prep(); d[side].main = ['lecteur-du-dernier-nom']; d[side].deck = ['chien-du-guet', 'porteur-de-la-plume'];
    const annonce = rpgMobaJouerCreature(d, side, 'lecteur-du-dernier-nom', 'center', 0, { ouvrirReponse: true });
    assert.equal(annonce.creatureEnAttente, true); assert.equal(d[side].deck.length, 2);
    const entree = rpgMobaPasserCreature(d, enemy); assert.equal(entree.ok, true); assert.equal(d[side].deck.length, 0);
    if (side === 'joueur') {
      assert.equal(d.defausseEnAttente?.restant, 1); assert.equal(rpgMobaTerminerTour(d, side).raison, 'timing');
      assert.equal(rpgMobaDefausser(d, side, 0).ok, true); assert.equal(d.defausseEnAttente, null);
    } else assert.equal(d.defausseEnAttente, null);
    assert.equal(d[side].main.length, 1); assert.equal(d[side].cimetiere.length, 1);
    assert.equal(rpgMobaPlacementCoherent(d), true);
  });
  test(`Lune MOBA : Résonance vampire partagée entre voies et camps, cumul puis départ (${side})`, () => {
    const d = prep(), a = pose(d, side, 'novice-des-cendres', 'left');
    const b = pose(d, enemy, 'danseuse-des-ombres-de-dune', 'right');
    const chien = pose(d, enemy, 'chien-du-guet', 'left');
    const general = pose(d, side, 'general-du-croissant-noir', 'center');
    assert.deepEqual([a.atk, a.pv, b.atk, b.pv, chien.atk, general.atk], [2, 2, 3, 3, 2, 4]);
    const fleau = pose(d, side, 'fleau-de-la-lune-noire', 'right');
    assert.deepEqual([a.atk, b.atk, general.atk, fleau.atk, fleau.pv], [3, 4, 5, 9, 9]);
    d.tour = enemy; d[enemy].main = ['effacement-des-faibles'];
    // Effacement ne peut pas cibler le Général coût 4 ; la foudre suffit après blessure.
    general.pv = 1; d[enemy].main = ['trait-de-braise'];
    assert.equal(rpgMobaLancerMagie(d, enemy, 'trait-de-braise', general.id).ok, true);
    assert.deepEqual([a.atk, b.atk, fleau.atk], [2, 3, 8]);
    assert.equal(rpgMobaPlacementCoherent(d), true);
  });
  test(`Lune MOBA : Overkill et Vol de vie du Fléau en combat (${side})`, () => {
    const d = prep(), fleau = pose(d, side, 'fleau-de-la-lune-noire', 'left');
    const chien = pose(d, enemy, 'chien-du-guet', 'left');
    mobaInfliger(d.moba, enemy, 'left', 6); d.tour = side; fleau.ready = true;
    assert.equal(rpgMobaDeclarerAttaque(d, side, [fleau.id]).ok, true);
    const r = rpgMobaLancerAttaque(d, side, [fleau.id], { [fleau.id]: [chien.id] }, { declaree: true });
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(mobaVoie(d.moba, 'left').hp[enemy], 4); // 8 force - 2 PV du bloqueur
    assert.equal(mobaVoie(d.moba, 'left').hp[side], 8); // 6/2 + 2/2
    assert.ok(!d[enemy].creatures.includes(chien)); assert.equal(rpgMobaPlacementCoherent(d), true);
  });
  test(`Lune MOBA : duel d'arrivée du Souverain soigne sa voie même s'il meurt (${side})`, () => {
    const d = prep(), cible = pose(d, enemy, 'dune-marchante', 'right'); cible.atk = 7;
    mobaInfliger(d.moba, enemy, 'left', 5); d.tour = side; d[side].main = ['souverain-de-la-lune-noire'];
    assert.equal(rpgMobaJouerCreature(d, side, 'souverain-de-la-lune-noire', 'left', 0, { ouvrirReponse: true }).creatureEnAttente, true);
    const entree = rpgMobaPasserCreature(d, enemy); assert.equal(entree.arriveeEnAttente, true); const heros = entree.entite;
    const r = rpgMobaResoudreArrivee(d, side, cible.id); assert.equal(r.ok, true, JSON.stringify(r));
    assert.ok(!d[enemy].creatures.includes(cible)); assert.ok(!d[side].creatures.includes(heros));
    assert.equal(mobaVoie(d.moba, 'left').hp[side], 8); assert.ok(r.healingEvents.some(e => e.volDeVie && e.laneId === 'left' && e.healing === 3));
    assert.equal(mobaVoie(d.moba, 'right').hp[side], 10); assert.equal(rpgMobaPlacementCoherent(d), true);
  });
}

for (const side of ['joueur', 'sorcier']) test(`Souverain MOBA : deux Vols de vie simultanés et bouclier adverse (${side})`, () => {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  for (const shield of [false, true]) {
    const { duel, adversaire } = fixtureDuelArrivee(side, 'chasseuse-de-braise');
    mobaInfliger(duel.moba, enemy, 'left', 4); mobaInfliger(duel.moba, side, 'right', 4);
    adversaire.bouclier = shield ? 1 : 0; duel[side].main = ['souverain-de-la-lune-noire'];
    assert.equal(rpgMobaJouerCreature(duel, side, 'souverain-de-la-lune-noire', 'left', 0, { ouvrirReponse: true }).creatureEnAttente, true);
    const hero = rpgMobaPasserCreature(duel, enemy).entite;
    const r = rpgMobaResoudreArrivee(duel, side, adversaire.id); assert.equal(r.ok, true, JSON.stringify(r));
    if (shield) {
      assert.equal(hero.pv, 5); assert.equal(adversaire.pv, 2); assert.equal(adversaire.bouclier, 0);
      assert.equal(mobaVoie(duel.moba, 'left').hp[side], 6); assert.equal(mobaVoie(duel.moba, 'right').hp[enemy], 6);
      assert.equal(r.healingEvents.length, 0);
    } else {
      assert.equal(hero.pv, 3); assert.ok(!duel[enemy].creatures.includes(adversaire));
      assert.equal(mobaVoie(duel.moba, 'left').hp[side], 9); assert.equal(mobaVoie(duel.moba, 'right').hp[enemy], 7);
      assert.deepEqual(new Set(r.healingEvents.map(e => e.laneId)), new Set(['left', 'right']));
    }
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Souverain MOBA : réanimation choisit un duel et transmet le soin de la voie de retour', () => {
  const duel = partieCombat(); duel.joueur.cimetiere = ['souverain-de-la-lune-noire'];
  rpgFinDeTour(duel); duel.sorcier.main = ['dune-marchante']; duel.sorcier.mana.sable = 30;
  const cible = rpgMobaJouerCreature(duel, 'sorcier', 'dune-marchante', 'right', 0).entite;
  rpgFinDeTour(duel); duel.joueur.main = ['reanimation']; duel.joueur.mana.sable = 30;
  mobaInfliger(duel.moba, 'sorcier', 'center', 4);
  const result = rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, 'center', null, { emplacementReanimation: 0 });
  assert.equal(result.ok, true, JSON.stringify(result));
  const heros = duel.joueur.creatures.find(e => e.carteId === 'souverain-de-la-lune-noire');
  assert.ok(heros); assert.equal(heros.mobaLane, 'center'); assert.ok(!duel.sorcier.creatures.includes(cible));
  assert.equal(mobaVoie(duel.moba, 'center').hp.joueur, 9);
  assert.ok(result.healingEvents.some(e => e.volDeVie && e.laneId === 'center'));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Résonance vampire MOBA disparaît après conquête, sans déclencher une mort', () => {
  const duel = partieCombat(); Object.assign(duel.joueur.mana, { sable: 30, tenebres: 30, neige: 30 });
  duel.joueur.main = ['general-du-croissant-noir', 'danseuse-des-ombres-de-dune', 'eclair-du-marteau'];
  const general = rpgMobaJouerCreature(duel, 'joueur', 'general-du-croissant-noir', 'right', 0).entite;
  const danseuse = rpgMobaJouerCreature(duel, 'joueur', 'danseuse-des-ombres-de-dune', 'left', 0).entite;
  assert.equal(danseuse.atk, 3); mobaInfliger(duel.moba, 'joueur', 'right', 9);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'sorcier', 'right').ok, true);
  assert.ok(!duel.joueur.creatures.includes(general)); assert.ok(duel.joueur.exil.includes(general.carteId));
  assert.equal(danseuse.atk, 2); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const side of ['joueur', 'sorcier']) test(`Djinn des cendres vengeresses MOBA : mort alliée frappe la voie de chaque source (${side})`, () => {
  const duel = partieCombat(), enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  duel.tour = side; Object.assign(duel[side].mana, { braise: 30, sable: 30 });
  duel[side].main = ['djinn-des-cendres-vengeresses', 'djinn-des-cendres-vengeresses', 'chien-du-guet'];
  const first = rpgMobaJouerCreature(duel, side, 'djinn-des-cendres-vengeresses', 'left', 0).entite;
  const second = rpgMobaJouerCreature(duel, side, 'djinn-des-cendres-vengeresses', 'right', 0).entite;
  const ally = rpgMobaJouerCreature(duel, side, 'chien-du-guet', 'center', 0).entite;
  duel.tour = enemy; duel[enemy].main = ['trait-de-braise']; duel[enemy].mana.braise = 30;
  const wizard = duel[enemy].pv, result = rpgMobaLancerMagie(duel, enemy, 'trait-de-braise', ally.id);
  assert.equal(result.ok, true); assert.equal(duel[enemy].pv, wizard);
  assert.equal(mobaVoie(duel.moba, 'left').hp[enemy], 9); assert.equal(mobaVoie(duel.moba, 'right').hp[enemy], 9);
  assert.deepEqual(new Set(result.damageEvents.filter(e => e.mortAlliee).map(e => e.entityId)), new Set([first.id, second.id]));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Djinn vengeur MOBA : victoire interrompt les autres sources et le déclenchement de la victime', () => {
  const duel = partieCombat(); Object.assign(duel.joueur.mana, { braise: 30, tenebres: 30 });
  mobaInfliger(duel.moba, 'joueur', 'left', 10); mobaInfliger(duel.moba, 'joueur', 'right', 9);
  mobaInfliger(duel.moba, 'sorcier', 'center', 3);
  duel.joueur.main = ['djinn-des-cendres-vengeresses', 'djinn-des-cendres-vengeresses', 'porteur-de-la-plume', 'effacement-des-faibles'];
  const first = rpgMobaJouerCreature(duel, 'joueur', 'djinn-des-cendres-vengeresses', 'right', 0).entite;
  const second = rpgMobaJouerCreature(duel, 'joueur', 'djinn-des-cendres-vengeresses', 'right', 1).entite;
  const victime = rpgMobaJouerCreature(duel, 'joueur', 'porteur-de-la-plume', 'center', 0).entite;
  const result = rpgMobaLancerMagie(duel, 'joueur', 'effacement-des-faibles', victime.id);
  assert.equal(result.ok, true); assert.equal(duel.moba.winner, 'joueur');
  assert.deepEqual(result.damageEvents.filter(e => e.mortAlliee).map(e => e.entityId), [first.id]);
  assert.ok(!duel.joueur.creatures.includes(second)); assert.equal(mobaVoie(duel.moba, 'center').hp.joueur, 7);
  assert.equal(result.healingEvents.length, 0); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Djinn vengeur MOBA : vague simultanée, il ne venge que les alliés s’il survit', () => {
  for (const survit of [false, true]) {
    const duel = partieCombat(); Object.assign(duel.joueur.mana, { braise: 30, sable: 30, neige: 30 });
    duel.joueur.main = ['djinn-des-cendres-vengeresses', 'chien-du-guet', 'fennec-des-decombres', 'grand-hiver'];
    const djinn = rpgMobaJouerCreature(duel, 'joueur', 'djinn-des-cendres-vengeresses', 'right', 0).entite;
    const chien = rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'left', 0).entite; chien.pv = 1;
    rpgMobaJouerCreature(duel, 'joueur', 'fennec-des-decombres', 'center', 0);
    if (survit) djinn.pv = djinn.pvMax = 10; else djinn.pv = 1;
    const result = rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver');
    assert.equal(result.ok, true); assert.equal(result.damageEvents.filter(e => e.mortAlliee).length, survit ? 2 : 0);
    assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, survit ? 8 : 10);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Djinn vengeur MOBA : renvoi ou conquête ne sont pas des morts', () => {
  for (const mode of ['renvoi', 'conquete']) {
    const duel = partieCombat(); duel.joueur.mana.braise = 30; duel.joueur.mana.sable = 30;
    duel.joueur.main = ['djinn-des-cendres-vengeresses', 'chien-du-guet'];
    rpgMobaJouerCreature(duel, 'joueur', 'djinn-des-cendres-vengeresses', 'right', 0);
    const allie = rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'left', 0).entite;
    if (mode === 'renvoi') {
      rpgFinDeTour(duel); duel.sorcier.main = ['ressac']; duel.sorcier.mana.eau = 30;
      assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'ressac', allie.id).ok, true);
    } else {
      duel.joueur.main = ['eclair-du-marteau']; duel.joueur.mana.neige = 30; mobaInfliger(duel.moba, 'joueur', 'left', 9);
      assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'sorcier', 'left').ok, true);
    }
    assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10); assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

for (const side of ['joueur', 'sorcier']) test(`Souverain MOBA : réponse au duel avant le soin et disparition de cible (${side})`, () => {
  for (const renvoi of [false, true]) {
    const { duel, enemy, adversaire } = fixtureDuelArrivee(side, 'dune-marchante');
    duel[side].main = ['souverain-de-la-lune-noire']; duel[enemy].main = ['ressac']; duel[enemy].mana.eau = 30;
    mobaInfliger(duel.moba, enemy, 'left', 4);
    assert.equal(rpgMobaJouerCreature(duel, side, 'souverain-de-la-lune-noire', 'left', 0, { ouvrirReponse: true }).creatureEnAttente, true);
    const hero = rpgMobaPasserCreature(duel, enemy).entite;
    assert.equal(rpgMobaResoudreArrivee(duel, side, adversaire.id).effetEnAttente, true);
    assert.equal(adversaire.pv, 4); assert.equal(mobaVoie(duel.moba, 'left').hp[side], 6);
    if (renvoi) assert.equal(rpgMobaLancerMagie(duel, enemy, 'ressac', hero.id).ok, true);
    const passage = rpgMobaPasserEffetCreature(duel, enemy); assert.equal(passage.ok, true, JSON.stringify(passage));
    if (renvoi) { assert.equal(adversaire.pv, 4); assert.equal(mobaVoie(duel.moba, 'left').hp[side], 6); }
    else { assert.ok(!duel[enemy].creatures.includes(adversaire)); assert.equal(mobaVoie(duel.moba, 'left').hp[side], 9); assert.ok(passage.healingEvents.some(e => e.volDeVie)); }
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Djinn vengeur MOBA : une victoire pendant une vague empêche les jetons des morts suivants', () => {
  const duel = partieCombat(); Object.assign(duel.joueur.mana, { braise: 30, tenebres: 30, neige: 30, sable: 30 });
  mobaInfliger(duel.moba, 'joueur', 'left', 10); mobaInfliger(duel.moba, 'joueur', 'right', 9);
  duel.joueur.main = ['djinn-des-cendres-vengeresses', 'fennec-des-decombres', 'scarabee-du-natron', 'grand-hiver'];
  const djinn = rpgMobaJouerCreature(duel, 'joueur', 'djinn-des-cendres-vengeresses', 'right', 0).entite;
  rpgMobaJouerCreature(duel, 'joueur', 'fennec-des-decombres', 'center', 0);
  const scarabee = rpgMobaJouerCreature(duel, 'joueur', 'scarabee-du-natron', 'right', 1).entite; scarabee.pv = 1;
  const result = rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver');
  assert.equal(result.ok, true); assert.equal(duel.moba.winner, 'joueur');
  assert.equal(result.damageEvents.filter(e => e.mortAlliee).length, 1); assert.equal(result.damageEvents[0].entityId, djinn.id);
  assert.ok(!duel.joueur.creatures.some(e => e.carteId === 'shabti')); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Fléau MOBA : Overkill répartit les blessures nécessaires avant de dépasser deux bloqueurs', () => {
  const duel = partieCombat(); Object.assign(duel.joueur.mana, { braise: 30, tenebres: 30 });
  duel.joueur.main = ['fleau-de-la-lune-noire']; const fleau = rpgMobaJouerCreature(duel, 'joueur', 'fleau-de-la-lune-noire', 'left', 0).entite;
  rpgFinDeTour(duel); duel.sorcier.main = ['fennec-des-decombres', 'gardienne-des-portes-de-sable']; duel.sorcier.mana.sable = 30;
  const faible = rpgMobaJouerCreature(duel, 'sorcier', 'fennec-des-decombres', 'left', 0).entite;
  const solide = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 1).entite; solide.pv = solide.pvMax = solide.def = 5;
  rpgFinDeTour(duel); mobaInfliger(duel.moba, 'sorcier', 'left', 8);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [fleau.id]).ok, true);
  const result = rpgMobaLancerAttaque(duel, 'joueur', [fleau.id], { [fleau.id]: [faible.id, solide.id] }, { declaree: true });
  assert.equal(result.ok, true, JSON.stringify(result)); assert.ok(!duel.sorcier.creatures.includes(faible));
  assert.ok(!duel.sorcier.creatures.includes(solide)); assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 8);
  assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 7); // ceil(1/2) + ceil(5/2) + ceil(2/2)
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Fléau MOBA : aucun Overkill quand les PV des bloqueurs dépassent sa force', () => {
  const duel = partieCombat(); Object.assign(duel.joueur.mana, { braise: 30, tenebres: 30 });
  duel.joueur.main = ['fleau-de-la-lune-noire']; const fleau = rpgMobaJouerCreature(duel, 'joueur', 'fleau-de-la-lune-noire', 'right', 0).entite;
  rpgFinDeTour(duel); duel.sorcier.main = ['chien-du-guet', 'gardienne-des-portes-de-sable']; duel.sorcier.mana.sable = 30;
  const faible = rpgMobaJouerCreature(duel, 'sorcier', 'chien-du-guet', 'right', 0).entite;
  const solide = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 1).entite; solide.pv = solide.pvMax = solide.def = 8;
  rpgFinDeTour(duel); assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [fleau.id]).ok, true);
  const result = rpgMobaLancerAttaque(duel, 'joueur', [fleau.id], { [fleau.id]: [faible.id, solide.id] }, { declaree: true });
  assert.equal(result.ok, true); assert.ok(!duel.sorcier.creatures.includes(faible)); assert.equal(solide.pv, 2);
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, 10); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const side of ['joueur', 'sorcier']) {
  test(`Takouba de Tin Hinan MOBA : contact avec voie, espace et conquête (${side})`, () => {
    for (const situation of ['libre', 'pleine', 'conquete', 'victoire']) {
      const duel = partieCombat(); if (side === 'sorcier') rpgFinDeTour(duel);
      const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
      duel[side].main = ['gardienne-des-portes-de-sable', 'takouba-de-tin-hinan', 'chien-du-guet']; duel[side].mana.sable = 30;
      const porteur = rpgMobaJouerCreature(duel, side, 'gardienne-des-portes-de-sable', 'right', 0).entite;
      if (situation === 'pleine') assert.equal(rpgMobaJouerCreature(duel, side, 'chien-du-guet', 'right', 1).ok, true);
      assert.equal(rpgMobaJouerArme(duel, side, 'takouba-de-tin-hinan', porteur.id, { ouvrirReponse: true }).sortEnAttente, true);
      assert.equal(rpgMobaPasserSort(duel, enemy).ok, true);
      if (situation === 'conquete' || situation === 'victoire') mobaInfliger(duel.moba, side, 'right', 9);
      if (situation === 'victoire') mobaInfliger(duel.moba, side, 'left', 10);
      porteur.ready = true;
      assert.equal(rpgMobaDeclarerAttaque(duel, side, [porteur.id]).ok, true);
      const result = rpgMobaLancerAttaque(duel, side, [porteur.id], {}, { declaree: true });
      assert.equal(result.ok, true, JSON.stringify(result));
      const chiens = duel[side].creatures.filter(e => e.carteId === 'chien-de-sable');
      assert.equal(chiens.length, situation === 'victoire' ? 0 : 1, situation);
      if (chiens.length) assert.equal(chiens[0].mobaLane, situation === 'libre' ? 'right' : 'left');
      if (situation === 'victoire') assert.equal(duel.moba.winner, side);
      assert.equal(rpgMobaPlacementCoherent(duel), true);
    }
  });

  test(`Takouba de Tin Hinan MOBA : pioche seulement sur une blessure effective (${side})`, () => {
    for (const mode of ['normal', 'esquive', 'lumiere', 'brouillard', 'ciblee']) {
      const duel = partieCombat();
      // Create the defender on its own turn, then hand initiative to the attacker.
      const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
      if (enemy === 'sorcier') rpgFinDeTour(duel);
      duel[enemy].main = ['gardienne-des-portes-de-sable']; duel[enemy].mana.sable = 30;
      const cible = rpgMobaJouerCreature(duel, enemy, 'gardienne-des-portes-de-sable', 'left', 0).entite;
      rpgFinDeTour(duel);
      duel[side].main = ['gardienne-des-portes-de-sable', 'takouba-de-tin-hinan']; duel[side].mana.sable = 30;
      duel[side].deck = ['mousse-des-galiotes'];
      const porteur = rpgMobaJouerCreature(duel, side, 'gardienne-des-portes-de-sable', 'left', 0).entite;
      assert.equal(rpgMobaJouerArme(duel, side, 'takouba-de-tin-hinan', porteur.id).ok, true);
      if (mode === 'esquive') { cible.esquive = true; cible.esquiveChance = 1; }
      if (mode === 'lumiere' || mode === 'ciblee') cible.bouclierLumiere = true;
      if (mode === 'brouillard') duel.brouillardCombat = true;
      porteur.ready = true;
      if (mode === 'ciblee') porteur.coupRapide = true;
      const choix = mode === 'ciblee' ? { [porteur.id]: cible.id } : {};
      assert.equal(rpgMobaDeclarerAttaque(duel, side, [porteur.id], choix).ok, true);
      const result = rpgMobaLancerAttaque(duel, side, [porteur.id], mode === 'ciblee' ? {} : { [porteur.id]: [cible.id] }, { declaree: true });
      assert.equal(result.ok, true, JSON.stringify(result));
      assert.equal(duel[side].deck.length, mode === 'normal' ? 0 : 1, mode);
      assert.equal(rpgMobaPlacementCoherent(duel), true);
    }
  });
}

test('Takouba MOBA : pioche malgré la mort simultanée du porteur et frappe ciblée effective', () => {
  for (const rapide of [false, true]) {
    const duel = partieCombat(); rpgFinDeTour(duel);
    duel.sorcier.main = ['gardienne-des-portes-de-sable']; duel.sorcier.mana.sable = 30;
    const cible = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    cible.atk = 20; cible.pv = cible.def = cible.pvMax = 20;
    rpgFinDeTour(duel); duel.joueur.main = ['gardienne-des-portes-de-sable', 'takouba-de-tin-hinan']; duel.joueur.mana.sable = 30; duel.joueur.deck = ['verglas'];
    const p = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
    assert.equal(rpgMobaJouerArme(duel, 'joueur', 'takouba-de-tin-hinan', p.id).ok, true);
    p.ready = true; if (rapide) p.coupRapide = true;
    assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [p.id], rapide ? { [p.id]: cible.id } : {}).ok, true);
    assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [p.id], rapide ? {} : { [p.id]: [cible.id] }, { declaree: true }).ok, true);
    if (!rapide) assert.ok(!duel.joueur.creatures.includes(p));
    assert.equal(duel.joueur.deck.length, 0); assert.ok(duel.joueur.main.includes('verglas'));
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Takouba MOBA : aucun jeton quand tous les emplacements actifs sont occupés', () => {
  const duel = partieCombat(); duel.joueur.mana.sable = 30;
  duel.joueur.main = Array(5).fill('gardienne-des-portes-de-sable').concat('takouba-de-tin-hinan');
  let p;
  for (const [lane, slot] of [['left',0],['left',1],['center',0],['right',0],['right',1]]) {
    const entite = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', lane, slot).entite;
    if (lane === 'center') p = entite;
  }
  assert.equal(rpgMobaJouerArme(duel, 'joueur', 'takouba-de-tin-hinan', p.id).ok, true); p.ready = true;
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [p.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [p.id], {}, { declaree: true }).ok, true);
  assert.equal(duel.joueur.creatures.length, 5); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Takouba de Tin Hinan MOBA : un contresort de carte empêche l’attachement payé', () => {
  const duel = partieCombat(); duel.joueur.main = ['gardienne-des-portes-de-sable', 'takouba-de-tin-hinan']; duel.joueur.mana.sable = 30;
  const p = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  assert.equal(rpgMobaJouerArme(duel, 'joueur', 'takouba-de-tin-hinan', p.id, { ouvrirReponse: true }).sortEnAttente, true);
  duel.sorcier.main = ['contresort-des-abimes']; duel.sorcier.mana.eau = 30;
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'contresort-des-abimes').contre, true);
  assert.equal(p.arme, null); assert.ok(duel.joueur.cimetiere.includes('takouba-de-tin-hinan'));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const side of ['joueur', 'sorcier']) test(`Guetteuse MOBA : exil allié et retour neuf dans la voie d’origine (${side})`, () => {
  const duel = partieCombat(); if (side === 'sorcier') rpgFinDeTour(duel);
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  duel[side].mana.sable = 30; duel[side].mana.eau = 30;
  duel[side].main = ['chien-du-guet', 'jitte-d-amayas', 'guetteuse-des-marees'];
  const allie = rpgMobaJouerCreature(duel, side, 'chien-du-guet', 'right', 1).entite;
  assert.equal(rpgMobaJouerArme(duel, side, 'jitte-d-amayas', allie.id).ok, true);
  allie.pv = 1; allie.poison = { degats: 1, toursRestants: 2 };
  const g = rpgMobaJouerCreature(duel, side, 'guetteuse-des-marees', 'right', 0, { ouvrirReponse: true });
  assert.equal(g.creatureEnAttente, true); const entree = rpgMobaPasserCreature(duel, enemy); assert.equal(entree.arriveeEnAttente, true);
  assert.equal(rpgMobaResoudreArrivee(duel, side, entree.entite.id).ok, false);
  assert.equal(rpgMobaResoudreArrivee(duel, side, allie.id).ok, true);
  assert.ok(!duel[side].creatures.includes(allie)); assert.ok(duel[side].exil.includes('chien-du-guet'));
  assert.ok(duel[side].cimetiere.includes('jitte-d-amayas')); assert.equal(rpgMobaPlacementCoherent(duel), true);
  const resultat = terminerEtPasser(duel, side); assert.equal(resultat.ok, true, JSON.stringify(resultat));
  const retour = duel[side].creatures.find(e => e.carteId === 'chien-du-guet');
  assert.ok(retour && retour.id !== allie.id); assert.equal(retour.mobaLane, 'right');
  assert.equal(mobaVoie(duel.moba, 'right').slots[side][1], retour.id);
  assert.equal(retour.pv, retour.pvMax); assert.ok(!retour.poison); assert.equal(retour.arme, null);
  assert.ok(!duel[side].exil.includes('chien-du-guet')); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Guetteuse MOBA : voie pleine attend et retour occupe une autre case de sa voie', () => {
  const duel = partieCombat(); Object.assign(duel.joueur.mana, { sable: 30, eau: 30 });
  duel.joueur.main = ['chien-du-guet', 'guetteuse-des-marees', 'gardienne-des-portes-de-sable', 'gardienne-des-portes-de-sable'];
  const allie = rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'right', 0).entite;
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'guetteuse-des-marees', 'left', 0).arriveeEnAttente, true);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', allie.id).ok, true);
  const premier = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 0).entite;
  const second = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 1).entite;
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.equal(duel.retoursExilFinTour.length, 1); assert.ok(duel.joueur.exil.includes('chien-du-guet'));
  duel.sorcier.main = ['ressac']; duel.sorcier.mana.eau = 30;
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'ressac', second.id).ok, true);
  assert.equal(terminerEtPasser(duel, 'sorcier').ok, true);
  const retour = duel.joueur.creatures.find(e => e.carteId === 'chien-du-guet');
  assert.equal(mobaVoie(duel.moba, 'right').slots.joueur[0], premier.id);
  assert.equal(mobaVoie(duel.moba, 'right').slots.joueur[1], retour.id); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Guetteuse MOBA : conquête de la voie annule le retour sans déclencher de mort', () => {
  const duel = partieCombat(); Object.assign(duel.joueur.mana, { sable: 30, eau: 30, neige: 30 });
  duel.joueur.main = ['chien-du-guet', 'guetteuse-des-marees', 'eclair-du-marteau'];
  const allie = rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'right', 0).entite;
  rpgMobaJouerCreature(duel, 'joueur', 'guetteuse-des-marees', 'left', 0);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', allie.id).ok, true);
  mobaInfliger(duel.moba, 'joueur', 'right', 9);
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'sorcier', 'right').ok, true);
  assert.deepEqual(duel.retoursExilFinTour, []); assert.ok(duel.joueur.exil.includes('chien-du-guet'));
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.ok(!duel.joueur.creatures.some(e => e.carteId === 'chien-du-guet')); assert.ok(!duel.joueur.cimetiere.includes('chien-du-guet'));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Guetteuse MOBA : pas de cible seule ou avec un Site, protection alliée ignorée', () => {
  for (const cible of ['aucune', 'site', 'protegee']) {
    const duel = partieCombat(); Object.assign(duel.joueur.mana, { sable: 30, eau: 30 });
    duel.joueur.main = ['le-tresor-de-lima', 'chien-du-guet', 'guetteuse-des-marees'];
    let allie;
    if (cible !== 'aucune') allie = rpgMobaJouerCreature(duel, 'joueur', cible === 'site' ? 'le-tresor-de-lima' : 'chien-du-guet', 'right', 0).entite;
    if (cible === 'protegee') { allie.protection = { contre: ['eau'] }; allie.bouclierLumiere = true; }
    const g = rpgMobaJouerCreature(duel, 'joueur', 'guetteuse-des-marees', 'left', 0);
    assert.equal(Boolean(g.arriveeEnAttente), cible === 'protegee');
    if (cible === 'protegee') { assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', allie.id).ok, true); assert.ok(duel.joueur.exil.includes(allie.carteId)); }
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Guetteuse MOBA : jeton exilé cesse d’exister', () => {
  const duel = partieCombat(); Object.assign(duel.joueur.mana, { sable: 30, eau: 30 });
  duel.joueur.main = ['tarek', 'guetteuse-des-marees'];
  rpgMobaJouerCreature(duel, 'joueur', 'tarek', 'right', 0);
  const token = duel.joueur.creatures.find(e => e.carteId === 'chien-de-sable');
  assert.ok(token);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'guetteuse-des-marees', 'left', 1).arriveeEnAttente, true);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', token.id).ok, true);
  assert.ok(!duel.joueur.creatures.includes(token)); assert.ok(!(duel.joueur.exil ?? []).includes(token.carteId));
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.equal(duel.joueur.creatures.filter(e => e.carteId === 'chien-de-sable').length, 1); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const id of ['porteuse-de-cruches', 'pretre-de-la-bouche', 'braisier-du-souk', 'maitre-des-hieroglyphes']) test(`Guetteuse MOBA : arrivée rejouée et événements au retour de ${id}`, () => {
  const duel = partieCombat(); Object.assign(duel.joueur.mana, { sable: 30, eau: 30, braise: 30, tenebres: 30 });
  duel.joueur.main = [id, 'guetteuse-des-marees'];
  const allie = rpgMobaJouerCreature(duel, 'joueur', id, 'right', 0).entite;
  const guetteuse = rpgMobaJouerCreature(duel, 'joueur', 'guetteuse-des-marees', 'left', 0);
  assert.equal(guetteuse.arriveeEnAttente, true); assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', allie.id).ok, true);
  mobaInfliger(duel.moba, 'sorcier', 'right', 3);
  const hpA = mobaVoie(duel.moba, 'right').hp.joueur, hpB = mobaVoie(duel.moba, 'right').hp.sorcier;
  duel.joueur.deck = ['verglas', 'verglas', 'verglas'];
  const result = terminerEtPasser(duel, 'joueur'); assert.equal(result.ok, true, JSON.stringify(result));
  if (id === 'porteuse-de-cruches' || id === 'pretre-de-la-bouche') {
    assert.ok(mobaVoie(duel.moba, 'right').hp.joueur > hpA);
    assert.ok(result.healingEvents?.some(e => e.cardId === id && e.laneId === 'right' && e.healing > 0));
  }
  if (id === 'pretre-de-la-bouche' || id === 'braisier-du-souk') {
    assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, hpB - 1);
    assert.ok(result.damageEvents?.some(e => e.cardId === id && e.laneId === 'right' && e.damage === 1));
  }
  if (id === 'maitre-des-hieroglyphes') assert.equal(result.drawEvents?.find(e => e.cardId === id)?.count, 2);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Guetteuse MOBA : réanimation rejoue automatiquement l’exil dans la voie de l’alliée', () => {
  const duel = partieCombat(); Object.assign(duel.joueur.mana, { sable: 30, eau: 30 });
  duel.joueur.main = ['chien-du-guet', 'reanimation']; duel.joueur.cimetiere = ['guetteuse-des-marees'];
  const allie = rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'right', 0).entite;
  const result = rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, 'center', null, { emplacementReanimation: 0 });
  assert.equal(result.ok, true, JSON.stringify(result)); assert.ok(!duel.joueur.creatures.includes(allie));
  assert.equal(duel.retoursExilFinTour[0].mobaLane, 'right'); assert.equal(rpgMobaPlacementCoherent(duel), true);
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.equal(duel.joueur.creatures.find(e => e.carteId === 'chien-du-guet').mobaLane, 'right');
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Guetteuse MOBA : une arrivée gagnante annule les retours suivants', () => {
  const duel = partieCombat(); Object.assign(duel.joueur.mana, { sable: 30, eau: 30, braise: 30, neige: 30 });
  duel.joueur.main = ['braisier-du-souk', 'chien-du-guet', 'guetteuse-des-marees', 'guetteuse-des-marees', 'eclair-du-marteau'];
  const braisier = rpgMobaJouerCreature(duel, 'joueur', 'braisier-du-souk', 'right', 0).entite;
  const chien = rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'center', 0).entite;
  rpgMobaJouerCreature(duel, 'joueur', 'guetteuse-des-marees', 'left', 0); rpgMobaResoudreArrivee(duel, 'joueur', braisier.id);
  rpgMobaJouerCreature(duel, 'joueur', 'guetteuse-des-marees', 'left', 1); rpgMobaResoudreArrivee(duel, 'joueur', chien.id);
  mobaInfliger(duel.moba, 'joueur', 'left', 9); assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'eclair-du-marteau', 'sorcier', 'left').ok, true); mobaInfliger(duel.moba, 'joueur', 'right', 8);
  const result = terminerEtPasser(duel, 'joueur'); assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(duel.moba.winner, 'joueur'); assert.ok(duel.joueur.exil.includes('chien-du-guet'));
  assert.ok(!duel.joueur.creatures.some(e => e.carteId === 'chien-du-guet'));
  assert.ok(result.damageEvents?.some(e => e.cardId === 'braisier-du-souk')); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Guetteuse MOBA : le Lecteur revenu déclenche une défausse humaine après le changement de tour', () => {
  const duel = partieCombat(); Object.assign(duel.joueur.mana, { eau: 30, tenebres: 30 });
  duel.joueur.main = ['lecteur-du-dernier-nom', 'guetteuse-des-marees']; duel.joueur.deck = [];
  const lecteur = rpgMobaJouerCreature(duel, 'joueur', 'lecteur-du-dernier-nom', 'right', 0).entite;
  if (duel.defausseEnAttente) assert.equal(rpgMobaDefausser(duel, 'joueur', 0).ok, true);
  duel.joueur.main = ['guetteuse-des-marees'];
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'guetteuse-des-marees', 'left', 0).arriveeEnAttente, true);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', lecteur.id).ok, true);
  duel.joueur.deck = ['verglas', 'verglas'];
  const result = terminerEtPasser(duel, 'joueur'); assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.drawEvents[0].count, 2); assert.equal(duel.tour, 'sorcier');
  assert.equal(duel.defausseEnAttente?.cote, 'joueur');
  assert.equal(rpgMobaDefausser(duel, 'joueur', 0).ok, true); assert.equal(duel.defausseEnAttente, null);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Guetteuse MOBA : son retour rejoue l’arrivée et programme le nouvel exil pour une fin de tour ultérieure', () => {
  const duel = partieCombat(); Object.assign(duel.joueur.mana, { eau: 30, sable: 30 });
  duel.joueur.main = ['chien-du-guet', 'guetteuse-des-marees', 'guetteuse-des-marees'];
  const chien = rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'right', 0).entite;
  const premiere = rpgMobaJouerCreature(duel, 'joueur', 'guetteuse-des-marees', 'left', 0).entite;
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', chien.id).ok, true);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'guetteuse-des-marees', 'center', 0).arriveeEnAttente, true);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', premiere.id).ok, true);
  assert.equal(terminerEtPasser(duel, 'joueur').ok, true);
  assert.ok(duel.joueur.creatures.some(e => e.carteId === 'guetteuse-des-marees' && e.mobaLane === 'left'));
  assert.equal(duel.retoursExilFinTour.length, 1); assert.equal(duel.retoursExilFinTour[0].mobaLane, 'center');
  assert.equal(duel.retoursExilFinTour[0].carteId, 'guetteuse-des-marees');
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Guetteuse MOBA : une réponse contre la créature empêche son arrivée et son exil', () => {
  const duel = partieCombat(); Object.assign(duel.joueur.mana, { eau: 30, sable: 30 });
  duel.joueur.main = ['chien-du-guet', 'guetteuse-des-marees'];
  const allie = rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'right', 0).entite;
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'guetteuse-des-marees', 'left', 0, { ouvrirReponse: true }).creatureEnAttente, true);
  duel.sorcier.main = ['contresort-des-abimes']; duel.sorcier.mana.eau = 30;
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'contresort-des-abimes').contre, true);
  assert.ok(duel.joueur.creatures.includes(allie)); assert.ok(!duel.arriveeEnAttente); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const side of ['joueur', 'sorcier']) test(`Passeur MOBA : réanimation, priorité à sa voie et effets d’arrivée (${side})`, () => {
  for (const voiePleine of [false, true]) {
    const duel = partieCombat(); if (side === 'sorcier') rpgFinDeTour(duel);
    const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
    Object.assign(duel[side].mana, { sable: 30, tenebres: 30 });
    duel[side].main = ['passeur-au-masque-de-chacal', 'gardienne-des-portes-de-sable'];
    if (voiePleine) rpgMobaJouerCreature(duel, side, 'gardienne-des-portes-de-sable', 'right', 1);
    duel[side].cimetiere = ['porteuse-de-cruches', 'javelot-du-beffroi'];
    mobaInfliger(duel.moba, enemy, voiePleine ? 'left' : 'right', 4);
    const result = rpgMobaJouerCreature(duel, side, 'passeur-au-masque-de-chacal', 'right', 0, { ouvrirReponse: true });
    assert.equal(result.creatureEnAttente, true); assert.deepEqual(duel[side].cimetiere, ['porteuse-de-cruches', 'javelot-du-beffroi']);
    const entree = rpgMobaPasserCreature(duel, enemy); assert.equal(entree.ok, true, JSON.stringify(entree));
    const retour = duel[side].creatures.find(e => e.carteId === 'porteuse-de-cruches');
    assert.ok(retour); assert.equal(retour.mobaLane, voiePleine ? 'left' : 'right');
    assert.ok(entree.healingEvents.some(e => e.cardId === 'porteuse-de-cruches' && e.laneId === retour.mobaLane && e.healing > 0));
    assert.deepEqual(duel[side].cimetiere, ['javelot-du-beffroi']); assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Passeur MOBA : champ plein ou dernière créature non auditée restent au cimetière', () => {
  for (const mode of ['plein', 'non-auditee']) {
    const duel = partieCombat(); Object.assign(duel.joueur.mana, { sable: 30, tenebres: 30 });
    duel.joueur.main = Array(4).fill('gardienne-des-portes-de-sable').concat('passeur-au-masque-de-chacal');
    if (mode === 'plein') for (const [lane, slot] of [['left',0], ['left',1], ['right',0], ['right',1]]) assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', lane, slot).ok, true);
    duel.joueur.cimetiere = mode === 'plein' ? ['chien-du-guet'] : ['chien-du-guet', 'boualem'];
    const avant = [...duel.joueur.cimetiere];
    assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'passeur-au-masque-de-chacal', 'center', 0).ok, true);
    assert.deepEqual(duel.joueur.cimetiere, avant); assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Passeur MOBA : une Réanimation qui le ramène enchaîne sans réutiliser sa case', () => {
  const duel = partieCombat(); Object.assign(duel.joueur.mana, { sable: 30, tenebres: 30 });
  duel.joueur.main = ['reanimation']; duel.joueur.cimetiere = ['chien-du-guet', 'passeur-au-masque-de-chacal'];
  const result = rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, 'right', null, { emplacementReanimation: 0 });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(duel.joueur.creatures.find(e => e.carteId === 'passeur-au-masque-de-chacal').mobaLane, 'right');
  assert.equal(mobaVoie(duel.moba, 'right').slots.joueur[1], duel.joueur.creatures.find(e => e.carteId === 'chien-du-guet').id);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const side of ['joueur', 'sorcier']) test(`Passeur et Masque MOBA : Lien entre voies, pioche sans défausse et disparition (${side})`, () => {
  const duel = partieCombat(); if (side === 'sorcier') rpgFinDeTour(duel);
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  Object.assign(duel[side].mana, { sable: 30, tenebres: 30 });
  duel[side].main = ['gardienne-des-portes-de-sable', 'masque-du-guetteur', 'passeur-au-masque-de-chacal'];
  const p = rpgMobaJouerCreature(duel, side, 'gardienne-des-portes-de-sable', 'left', 0).entite;
  assert.equal(rpgMobaJouerArme(duel, side, 'masque-du-guetteur', p.id).ok, true); assert.equal(p.atk, 2);
  const passeur = rpgMobaJouerCreature(duel, side, 'passeur-au-masque-de-chacal', 'right', 0).entite;
  assert.deepEqual([p.atk, p.pvMax], [3, 6]); duel[side].deck = ['verglas']; p.ready = true;
  assert.equal(rpgMobaDeclarerAttaque(duel, side, [p.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, side, [p.id], {}, { declaree: true }).ok, true);
  assert.ok(duel[side].main.includes('verglas')); assert.ok(!duel.defausseEnAttente);
  rpgFinDeTour(duel); duel[enemy].main = ['ressac']; duel[enemy].mana.eau = 30;
  assert.equal(rpgMobaLancerMagie(duel, enemy, 'ressac', passeur.id).ok, true);
  assert.deepEqual([p.atk, p.pvMax], [2, 5]); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Passeur MOBA : chaînes de Passeur puis arrivée avec soin, une seule notification', () => {
  const duel = partieCombat(); duel.joueur.mana.sable = 30;
  duel.joueur.main = ['reanimation']; duel.joueur.cimetiere = ['porteuse-de-cruches', 'passeur-au-masque-de-chacal', 'passeur-au-masque-de-chacal'];
  mobaInfliger(duel.moba, 'sorcier', 'left', 4);
  const result = rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, 'right', null, { emplacementReanimation: 0 });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(duel.joueur.creatures.filter(e => e.carteId === 'passeur-au-masque-de-chacal').length, 2);
  const retour = duel.joueur.creatures.find(e => e.carteId === 'porteuse-de-cruches'); assert.equal(retour.mobaLane, 'left');
  assert.equal(result.healingEvents.filter(e => e.cardId === 'porteuse-de-cruches').length, 1);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Passeur MOBA : retour depuis exil relance la réanimation et transmet les dégâts', () => {
  const duel = partieCombat(); Object.assign(duel.joueur.mana, { eau: 30, tenebres: 30 });
  duel.joueur.main = ['passeur-au-masque-de-chacal', 'guetteuse-des-marees'];
  const passeur = rpgMobaJouerCreature(duel, 'joueur', 'passeur-au-masque-de-chacal', 'right', 0).entite;
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'guetteuse-des-marees', 'left', 0).arriveeEnAttente, true);
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', passeur.id).ok, true);
  duel.joueur.cimetiere = ['braisier-du-souk'];
  const hp = mobaVoie(duel.moba, 'right').hp.sorcier;
  const result = terminerEtPasser(duel, 'joueur'); assert.equal(result.ok, true, JSON.stringify(result));
  assert.ok(duel.joueur.creatures.some(e => e.carteId === 'braisier-du-souk' && e.mobaLane === 'right'));
  assert.equal(mobaVoie(duel.moba, 'right').hp.sorcier, hp - 1);
  assert.equal(result.damageEvents.filter(e => e.cardId === 'braisier-du-souk').length, 1);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const side of ['joueur', 'sorcier']) test(`Passeur MOBA : le cimetière est relu après la réponse à la pose (${side})`, () => {
  const duel = partieCombat(); if (side === 'sorcier') rpgFinDeTour(duel);
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  Object.assign(duel[side].mana, { sable: 30, tenebres: 30 });
  duel[side].main = ['chien-du-guet', 'passeur-au-masque-de-chacal'];
  const chien = rpgMobaJouerCreature(duel, side, 'chien-du-guet', 'left', 0).entite; chien.pv = 1;
  duel[side].cimetiere = ['gardienne-des-portes-de-sable'];
  assert.equal(rpgMobaJouerCreature(duel, side, 'passeur-au-masque-de-chacal', 'right', 0, { ouvrirReponse: true }).creatureEnAttente, true);
  duel[enemy].main = ['trait-de-braise']; duel[enemy].mana.braise = 30;
  assert.equal(rpgMobaLancerMagie(duel, enemy, 'trait-de-braise', chien.id).ok, true);
  assert.equal(rpgMobaPasserCreature(duel, enemy).ok, true);
  assert.ok(duel[side].creatures.some(e => e.id !== chien.id && e.carteId === 'chien-du-guet' && e.mobaLane === 'right'));
  assert.deepEqual(duel[side].cimetiere, ['gardienne-des-portes-de-sable']); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Passeur MOBA : contresort empêche la pose et la résurrection', () => {
  const duel = partieCombat(); duel.joueur.mana.tenebres = 30; duel.joueur.main = ['passeur-au-masque-de-chacal']; duel.joueur.cimetiere = ['chien-du-guet'];
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'passeur-au-masque-de-chacal', 'right', 0, { ouvrirReponse: true }).creatureEnAttente, true);
  duel.sorcier.main = ['contresort-des-abimes']; duel.sorcier.mana.eau = 30;
  assert.equal(rpgMobaLancerMagie(duel, 'sorcier', 'contresort-des-abimes').contre, true);
  assert.ok(!duel.joueur.creatures.length); assert.ok(duel.joueur.cimetiere.includes('chien-du-guet'));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Passeur MOBA : victoire sur l’arrivée réanimée stoppe la partie immédiatement', () => {
  const duel = partieCombat(); duel.joueur.mana.tenebres = 30; duel.joueur.main = ['passeur-au-masque-de-chacal']; duel.joueur.cimetiere = ['braisier-du-souk'];
  mobaInfliger(duel.moba, 'joueur', 'left', 10); mobaInfliger(duel.moba, 'joueur', 'right', 9);
  const result = rpgMobaJouerCreature(duel, 'joueur', 'passeur-au-masque-de-chacal', 'right', 0);
  assert.equal(result.ok, true, JSON.stringify(result)); assert.equal(duel.moba.winner, 'joueur');
  assert.ok(result.damageEvents.some(e => e.cardId === 'braisier-du-souk' && e.damage === 1));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Passeur MOBA : une Lettre de marque permet encore sa prise après la réanimation', () => {
  const duel = partieCombat(); rpgFinDeTour(duel); duel.sorcier.main = ['chien-du-guet']; duel.sorcier.mana.sable = 30;
  const prise = rpgMobaJouerCreature(duel, 'sorcier', 'chien-du-guet', 'left', 0).entite;
  rpgFinDeTour(duel); Object.assign(duel.joueur.mana, { sable: 30, tenebres: 30, eau: 30 });
  duel.joueur.main = ['lettre-de-marque', 'passeur-au-masque-de-chacal']; duel.joueur.cimetiere = ['gardienne-des-portes-de-sable'];
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'lettre-de-marque').ok, true);
  const result = rpgMobaJouerCreature(duel, 'joueur', 'passeur-au-masque-de-chacal', 'right', 0, { ouvrirReponse: true });
  assert.equal(result.creatureEnAttente, true);
  const entree = rpgMobaPasserCreature(duel, 'sorcier'); assert.equal(entree.arriveeEnAttente, true);
  assert.ok(duel.joueur.creatures.some(e => e.carteId === 'gardienne-des-portes-de-sable'));
  assert.equal(rpgMobaResoudreArrivee(duel, 'joueur', prise.id).ok, true);
  assert.equal(entree.entite.enCale.entite.id, prise.id); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Passeur MOBA : ne réanime jamais dans une voie conquise et déclenche la pioche', () => {
  const duel = partieCombat(); Object.assign(duel.joueur.mana, { sable: 30, tenebres: 30 });
  duel.joueur.main = ['gardienne-des-portes-de-sable', 'passeur-au-masque-de-chacal'];
  mobaInfliger(duel.moba, 'sorcier', 'left', 20);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'right', 1).ok, true);
  duel.joueur.cimetiere = ['lecteur-du-dernier-nom']; duel.joueur.deck = ['verglas', 'chien-du-guet'];
  const result = rpgMobaJouerCreature(duel, 'joueur', 'passeur-au-masque-de-chacal', 'right', 0);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(duel.joueur.creatures.find(e => e.carteId === 'lecteur-du-dernier-nom').mobaLane, 'center');
  assert.ok(duel.joueur.main.includes('verglas')); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

// Ces tests injectent l'arme directement pour isoler le moteur du combat.
function fixtureSphereBloquee(side, attaquantId = 'gardienne-des-portes-de-sable', deuxBloqueurs = false, voieAttaquant = 'left') {
  const duel = partieCombat(), enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  if (enemy === 'sorcier') rpgFinDeTour(duel);
  duel[enemy].main = ['gardienne-des-portes-de-sable', 'gardienne-des-portes-de-sable']; duel[enemy].mana.sable = 30;
  const bloqueurs = [rpgMobaJouerCreature(duel, enemy, 'gardienne-des-portes-de-sable', 'left', 0).entite];
  if (deuxBloqueurs) bloqueurs.push(rpgMobaJouerCreature(duel, enemy, 'gardienne-des-portes-de-sable', 'left', 1).entite);
  rpgFinDeTour(duel); Object.assign(duel[side].mana, { sable: 30, eau: 30, braise: 30, tenebres: 30 });
  duel[side].main = [attaquantId];
  const attaquant = rpgMobaJouerCreature(duel, side, attaquantId, voieAttaquant, 0).entite;
  attaquant.ready = true;
  return { duel, side, enemy, attaquant, bloqueurs };
}
function injecterSphere(duel, side, entite) {
  duel[side].main.push('sphere-de-rotation'); Object.assign(duel[side].mana, { sable: 30, eau: 30 });
  assert.equal(rpgJouerArme(duel, side, 'sphere-de-rotation', entite.id).ok, true);
}
function resoudreSphereBloquee({ duel, side, attaquant, bloqueurs }) {
  const result = rpgLancerAttaque(duel, side, [attaquant.id], { [attaquant.id]: bloqueurs.map(e => e.id) }, null, null, {}, {
    resoudreDegatsDirects: ({ amount }) => ({ recus: mobaInfliger(duel.moba, side, attaquant.mobaLane, amount).damage }),
  });
  // Comme l'adaptateur, retirer des voies les combattants morts après résolution.
  for (const cote of ['joueur', 'sorcier']) for (const voie of duel.moba.lanes) {
    for (const id of [...voie.slots[cote]]) if (id && !duel[cote].creatures.some(e => e.id === id)) mobaRetirer(duel.moba, cote, id);
  }
  return result;
}
for (const side of ['joueur', 'sorcier']) for (const porteur of ['attaquant', 'bloqueur']) {
  test(`Sphère injectée : renvoi avant blessures d'un combat bloqué (${side}, ${porteur})`, () => {
    for (const jet of [.14, .15]) {
      const f = fixtureSphereBloquee(side); const { duel, enemy, attaquant, bloqueurs } = f; const bloqueur = bloqueurs[0];
      const arme = porteur === 'attaquant' ? attaquant : bloqueur, cible = porteur === 'attaquant' ? bloqueur : attaquant;
      injecterSphere(duel, porteur === 'attaquant' ? side : enemy, arme); rpgReglerHasard(duel, () => jet);
      const pv = arme.pv, hp = mobaVoie(duel.moba, 'left').hp[enemy];
      const result = resoudreSphereBloquee(f); assert.equal(result.ok, true, JSON.stringify(result));
      if (jet < .15) {
        assert.ok(!duel[porteur === 'attaquant' ? enemy : side].creatures.includes(cible));
        assert.equal(arme.pv, pv); assert.equal(mobaVoie(duel.moba, 'left').hp[enemy], hp);
      } else assert.ok(arme.pv < pv);
      assert.equal(rpgMobaPlacementCoherent(duel), true);
    }
  });
}

for (const side of ['joueur', 'sorcier']) {
  test(`Sphère injectée : le bouclier intercepte le renvoi sans annuler l'échange (${side})`, () => {
    for (const porteur of ['attaquant', 'bloqueur']) {
      const f = fixtureSphereBloquee(side); const { duel, enemy, attaquant, bloqueurs } = f; const bloqueur = bloqueurs[0];
      const arme = porteur === 'attaquant' ? attaquant : bloqueur, cible = porteur === 'attaquant' ? bloqueur : attaquant;
      injecterSphere(duel, porteur === 'attaquant' ? side : enemy, arme); cible.bouclier = 1;
      rpgReglerHasard(duel, () => .14); const pv = arme.pv;
      assert.equal(resoudreSphereBloquee(f).ok, true); assert.equal(cible.bouclier, 0); assert.ok(arme.pv < pv);
      assert.ok(duel[porteur === 'attaquant' ? enemy : side].creatures.includes(cible));
      assert.equal(rpgMobaPlacementCoherent(duel), true);
    }
  });
  test(`Sphère injectée : partage et Overkill relus après le renvoi d'un bloqueur (${side})`, () => {
    for (const deux of [false, true]) {
      const f = fixtureSphereBloquee(side, 'fleau-de-la-lune-noire', deux); const { duel, enemy, attaquant, bloqueurs } = f;
      injecterSphere(duel, side, attaquant); const force = attaquant.atk;
      if (deux) bloqueurs[1].pv = bloqueurs[1].pvMax = bloqueurs[1].def = 5;
      let jets = 0; rpgReglerHasard(duel, () => jets++ === 0 ? .14 : .15);
      const result = resoudreSphereBloquee(f); assert.equal(result.ok, true, JSON.stringify(result));
      assert.ok(duel[enemy].main.includes('gardienne-des-portes-de-sable'));
      assert.equal(mobaVoie(duel.moba, 'left').hp[enemy], 10 - force + (deux ? 5 : 0));
      if (deux) assert.ok(!duel[enemy].creatures.includes(bloqueurs[1]));
      assert.equal(rpgMobaPlacementCoherent(duel), true);
    }
  });
  test(`Sphère injectée : un bloqueur renvoie l'Overkill avant tout dégât de voie (${side})`, () => {
    const f = fixtureSphereBloquee(side, 'fleau-de-la-lune-noire', true); const { duel, enemy, attaquant, bloqueurs } = f;
    injecterSphere(duel, enemy, bloqueurs[0]); rpgReglerHasard(duel, () => .14);
    const result = resoudreSphereBloquee(f); assert.equal(result.ok, true, JSON.stringify(result));
    assert.ok(duel[side].main.includes('fleau-de-la-lune-noire')); assert.ok(!duel[side].creatures.includes(attaquant));
    assert.equal(mobaVoie(duel.moba, 'left').hp[enemy], 10);
    assert.equal(bloqueurs[0].pv, bloqueurs[0].pvMax); assert.equal(bloqueurs[1].pv, bloqueurs[1].pvMax);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  });
}

test('Sphère injectée : partage ordinaire recalculé et un jet par bloqueur', () => {
  const f = fixtureSphereBloquee('joueur', 'gardienne-des-portes-de-sable', true); const { duel, enemy, attaquant, bloqueurs } = f;
  injecterSphere(duel, 'joueur', attaquant); bloqueurs[1].pv = bloqueurs[1].pvMax = bloqueurs[1].def = 10;
  let jets = 0; rpgReglerHasard(duel, () => jets++ === 0 ? .14 : .15);
  const result = resoudreSphereBloquee(f); assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(jets, 2); assert.ok(duel[enemy].main.includes('gardienne-des-portes-de-sable'));
  assert.equal(bloqueurs[1].pv, 10 - attaquant.atk); assert.equal(mobaVoie(duel.moba, 'left').hp[enemy], 10);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Sphère injectée : renvoi du bloqueur enlève son équipement et efface un jeton', () => {
  for (const jeton of [false, true]) {
    const f = fixtureSphereBloquee('joueur'); const { duel, enemy, attaquant, bloqueurs } = f;
    injecterSphere(duel, 'joueur', attaquant); const cible = bloqueurs[0]; cible.jeton = jeton;
    duel[enemy].main = ['jitte-d-amayas']; duel[enemy].mana.tenebres = 30;
    assert.equal(rpgJouerArme(duel, enemy, 'jitte-d-amayas', cible.id).ok, true);
    rpgReglerHasard(duel, () => .14);
    assert.equal(resoudreSphereBloquee(f).ok, true);
    assert.equal(duel[enemy].main.includes(cible.carteId), !jeton);
    assert.ok(duel[enemy].cimetiere.includes('jitte-d-amayas')); assert.equal(mobaVoie(duel.moba, 'left').slots[enemy][0], null);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

for (const side of ['joueur', 'sorcier']) test(`Sphère injectée : les forces et répartitions relisent la Résonance disparue (${side})`, () => {
  const duel = partieCombat(), enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  if (enemy === 'sorcier') rpgFinDeTour(duel);
  duel[enemy].main = ['general-du-croissant-noir']; Object.assign(duel[enemy].mana, { sable: 30, tenebres: 30 });
  const general = rpgMobaJouerCreature(duel, enemy, 'general-du-croissant-noir', 'left', 0).entite;
  rpgFinDeTour(duel); duel[side].main = ['fleau-de-la-lune-noire', 'novice-des-cendres'];
  Object.assign(duel[side].mana, { braise: 30, tenebres: 30, sable: 30, eau: 30 });
  const fleau = rpgMobaJouerCreature(duel, side, 'fleau-de-la-lune-noire', 'left', 0).entite;
  const novice = rpgMobaJouerCreature(duel, side, 'novice-des-cendres', 'left', 1).entite;
  injecterSphere(duel, side, fleau); fleau.ready = novice.ready = true;
  const forceAvant = [fleau.atk, novice.atk];
  const lane = mobaVoie(duel.moba, 'left'); lane.hp[enemy] = 20; rpgReglerHasard(duel, () => .14);
  const result = rpgLancerAttaque(duel, side, [fleau.id, novice.id], { [fleau.id]: [general.id], [novice.id]: [] }, null, null, {}, {
    resoudreDegatsDirects: ({ amount }) => ({ recus: mobaInfliger(duel.moba, side, 'left', amount).damage }),
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.ok(duel[enemy].main.includes('general-du-croissant-noir'));
  assert.deepEqual([fleau.atk, novice.atk], forceAvant.map(atk => atk - 1));
  assert.equal(lane.hp[enemy], 20 - fleau.atk - novice.atk);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

function resoudreSphereCiblee({ duel, side, attaquant, cible }, autres = [], blocks = {}) {
  const result = rpgLancerAttaque(duel, side, [attaquant.id, ...autres.map(e => e.id)], blocks, null, null, { [attaquant.id]: cible.id }, {
    resoudreDegatsDirects: ({ amount, attaquantId }) => ({ recus: mobaInfliger(duel.moba, side, duel[side].creatures.find(e => e.id === attaquantId).mobaLane, amount).damage }),
  });
  for (const cote of ['joueur', 'sorcier']) for (const voie of duel.moba.lanes) {
    for (const id of [...voie.slots[cote]]) if (id && !duel[cote].creatures.some(e => e.id === id)) mobaRetirer(duel.moba, cote, id);
  }
  return result;
}
for (const side of ['joueur', 'sorcier']) for (const porteur of ['attaquant', 'cible']) {
  test(`Sphère injectée : attaque ciblée, renvoi avant frappe ou jet manqué (${side}, ${porteur})`, () => {
    for (const reussite of [true, false]) {
      const f = fixtureSphereBloquee(side), { duel, enemy, attaquant, bloqueurs } = f, cible = bloqueurs[0];
      attaquant.coupRapide = true; injecterSphere(duel, porteur === 'attaquant' ? side : enemy, porteur === 'attaquant' ? attaquant : cible);
      const pvCible = cible.pv, hp = mobaVoie(duel.moba, 'left').hp[enemy]; let jets = 0;
      rpgReglerHasard(duel, () => jets++ === 0 ? .5 : (reussite ? .14 : .15));
      const result = resoudreSphereCiblee({ duel, side, attaquant, cible }); assert.equal(result.ok, true, JSON.stringify(result));
      if (reussite) {
        assert.equal(result.resume.coupsRapides[0].annule, true);
        assert.ok(!duel[porteur === 'attaquant' ? enemy : side].creatures.includes(porteur === 'attaquant' ? cible : attaquant));
        assert.equal(cible.pv, pvCible);
      } else { assert.equal(result.resume.coupsRapides[0].annule, undefined); assert.ok(cible.pv < pvCible); }
      assert.equal(mobaVoie(duel.moba, 'left').hp[enemy], hp); assert.equal(rpgMobaPlacementCoherent(duel), true);
    }
  });
}

test('Sphère injectée : attaque ciblée ratée combat tout de même, un bouclier intercepte la Sphère', () => {
  for (const bouclier of [false, true]) {
    const f = fixtureSphereBloquee('joueur'), { duel, attaquant, bloqueurs } = f, cible = bloqueurs[0];
    attaquant.coupRapide = true; injecterSphere(duel, 'joueur', attaquant); cible.bouclier = bouclier ? 1 : 0;
    let jets = 0; rpgReglerHasard(duel, () => jets++ === 0 ? .1 : .14);
    const result = resoudreSphereCiblee({ duel, side: 'joueur', attaquant, cible }); assert.equal(result.ok, true);
    assert.equal(cible.bouclier, 0); assert.equal(duel.sorcier.creatures.includes(cible), bouclier);
    assert.equal(Boolean(result.resume.coupsRapides[0].annule), !bouclier);
    if (bouclier) assert.equal(result.resume.coupsRapides[0].rate, true);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

for (const side of ['joueur', 'sorcier']) test(`Sphère injectée : ciblage d'un bloqueur retiré avant le partage (${side})`, () => {
  const f = fixtureSphereBloquee(side); const { duel, enemy, attaquant, bloqueurs } = f, cible = bloqueurs[0];
  duel[side].main = ['chien-du-guet']; duel[side].mana.sable = 30;
  const autre = rpgMobaJouerCreature(duel, side, 'chien-du-guet', 'left', 1).entite; autre.ready = true;
  attaquant.coupRapide = true; injecterSphere(duel, side, attaquant);
  const hp = mobaVoie(duel.moba, 'left').hp[enemy], pv = autre.pv; let jets = 0;
  rpgReglerHasard(duel, () => jets++ === 0 ? .5 : .14);
  const result = resoudreSphereCiblee({ duel, side, attaquant, cible }, [autre], { [autre.id]: [cible.id] });
  assert.equal(result.ok, true, JSON.stringify(result)); assert.ok(duel[enemy].main.includes(cible.carteId));
  assert.equal(autre.pv, pv); assert.equal(mobaVoie(duel.moba, 'left').hp[enemy], hp);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('Sphère injectée : une répartition illégale ne renvoie aucune créature', () => {
  const f = fixtureSphereBloquee('joueur', 'gardienne-des-portes-de-sable', true, 'center');
  const { duel, attaquant, bloqueurs } = f;
  duel.joueur.main = ['chien-du-guet']; duel.joueur.mana.sable = 30;
  const autre = rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'left', 1).entite;
  rpgFinDeTour(duel); duel.sorcier.main = ['chien-du-guet']; duel.sorcier.mana.sable = 30;
  const cible = rpgMobaJouerCreature(duel, 'sorcier', 'chien-du-guet', 'center', 0).entite;
  bloqueurs.forEach((bloqueur) => { bloqueur.defenseur = false; });
  rpgFinDeTour(duel); attaquant.ready = autre.ready = true;
  attaquant.coupRapide = true; injecterSphere(duel, 'joueur', attaquant);
  let jets = 0; rpgReglerHasard(duel, () => jets++ === 0 ? .5 : .14);
  const avant = JSON.stringify(duel);
  const result = rpgLancerAttaque(duel, 'joueur', [attaquant.id, autre.id], { [autre.id]: bloqueurs.map(e => e.id) }, { [autre.id]: { [bloqueurs[0].id]: 999 } }, null, { [attaquant.id]: cible.id });
  assert.equal(result.raison, 'repartition'); assert.equal(JSON.stringify(duel), avant); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const side of ['joueur', 'sorcier']) test(`Sphère injectée : l'Overkill traverse un bloqueur renvoyé par une attaque ciblée (${side})`, () => {
  const f = fixtureSphereBloquee(side); const { duel, enemy, attaquant, bloqueurs } = f, cible = bloqueurs[0];
  duel[side].main = ['fleau-de-la-lune-noire']; Object.assign(duel[side].mana, { braise: 30, tenebres: 30 });
  const fleau = rpgMobaJouerCreature(duel, side, 'fleau-de-la-lune-noire', 'left', 1).entite; fleau.ready = true;
  attaquant.coupRapide = true; injecterSphere(duel, side, attaquant);
  let jets = 0; rpgReglerHasard(duel, () => jets++ === 0 ? .5 : .14);
  const result = resoudreSphereCiblee({ duel, side, attaquant, cible }, [fleau], { [fleau.id]: [cible.id] });
  assert.equal(result.ok, true, JSON.stringify(result)); assert.ok(duel[enemy].main.includes(cible.carteId));
  assert.equal(mobaVoie(duel.moba, 'left').hp[enemy], 10 - fleau.atk); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const side of ['joueur', 'sorcier']) test(`Sphère injectée : deux Sphères en combat ciblé respectent les boucliers et l'ordre (${side})`, () => {
  for (const boucliers of [false, true]) {
    const f = fixtureSphereBloquee(side), { duel, enemy, attaquant, bloqueurs } = f, cible = bloqueurs[0];
    attaquant.coupRapide = true; injecterSphere(duel, side, attaquant); injecterSphere(duel, enemy, cible);
    attaquant.bouclier = cible.bouclier = boucliers ? 1 : 0;
    let jets = 0; rpgReglerHasard(duel, () => jets++ === 0 ? .5 : .14);
    const result = resoudreSphereCiblee({ duel, side, attaquant, cible }); assert.equal(result.ok, true);
    if (boucliers) {
      assert.equal(attaquant.bouclier, 0); assert.equal(cible.bouclier, 0); assert.ok(cible.pv < cible.pvMax);
      assert.equal(duel[enemy].creatures.includes(cible), true);
    } else {
      assert.equal(result.resume.coupsRapides[0].annule, true); assert.ok(duel[enemy].main.includes(cible.carteId));
      assert.ok(duel[side].creatures.includes(attaquant));
    }
    assert.equal(jets, boucliers ? 3 : 2, 'la copie de validation ne consomme pas de jets supplémentaires');
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});

test('Sphère injectée : une cible renvoyée annule les autres attaques ciblées sans les rediriger', () => {
  const f = fixtureSphereBloquee('joueur'); const { duel, attaquant, bloqueurs } = f, cible = bloqueurs[0];
  duel.joueur.main = ['chien-du-guet']; duel.joueur.mana.sable = 30;
  const autre = rpgMobaJouerCreature(duel, 'joueur', 'chien-du-guet', 'left', 1).entite; autre.ready = true;
  attaquant.coupRapide = autre.coupRapide = true; injecterSphere(duel, 'joueur', attaquant);
  let jets = 0; rpgReglerHasard(duel, () => [0.5, 0.5, 0.14][jets++] ?? .5);
  const result = rpgLancerAttaque(duel, 'joueur', [attaquant.id, autre.id], {}, null, null, { [attaquant.id]: cible.id, [autre.id]: cible.id });
  assert.equal(result.ok, true, JSON.stringify(result)); assert.equal(result.resume.coupsRapides.filter(coup => coup.annule).length, 2);
  assert.equal(result.resume.frappeSorcier, 0); assert.ok(duel.sorcier.main.includes(cible.carteId));
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const side of ['joueur', 'sorcier']) test(`Sphère injectée : le critique garde son jet quand le renvoi retire une Résonance (${side})`, () => {
  const duel = partieCombat(), enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  if (enemy === 'sorcier') rpgFinDeTour(duel);
  duel[enemy].main = ['general-du-croissant-noir']; Object.assign(duel[enemy].mana, { sable: 30, tenebres: 30 });
  const cible = rpgMobaJouerCreature(duel, enemy, 'general-du-croissant-noir', 'left', 0).entite;
  rpgFinDeTour(duel); duel[side].main = ['fleau-de-la-lune-noire']; Object.assign(duel[side].mana, { braise: 30, tenebres: 30 });
  const attaquant = rpgMobaJouerCreature(duel, side, 'fleau-de-la-lune-noire', 'left', 0).entite;
  injecterSphere(duel, side, attaquant); attaquant.ready = true; attaquant.coupCritique = { chance: 1, fois: 2 };
  const lane = mobaVoie(duel.moba, 'left'); lane.hp[enemy] = 20;
  let jets = 0; rpgReglerHasard(duel, () => { jets++; return .1; });
  const result = resoudreSphereBloquee({ duel, side, attaquant, bloqueurs: [cible] });
  assert.equal(result.ok, true, JSON.stringify(result)); assert.equal(lane.hp[enemy], 20 - 2 * attaquant.atk);
  assert.equal(result.resume.critiques[0].fois, 2); assert.equal(jets, 2); assert.equal(rpgMobaPlacementCoherent(duel), true);
});

function fixtureSphereAdaptee(side, porteur = 'attaquant') {
  const duel = partieCombat(), enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  if (enemy === 'sorcier') rpgFinDeTour(duel);
  Object.assign(duel[enemy].mana, { sable: 30, eau: 30 }); duel[enemy].main = ['gardienne-des-portes-de-sable', 'sphere-de-rotation'];
  const cible = rpgMobaJouerCreature(duel, enemy, 'gardienne-des-portes-de-sable', 'left', 0).entite;
  if (porteur === 'bloqueur') assert.equal(rpgMobaJouerArme(duel, enemy, 'sphere-de-rotation', cible.id).ok, true);
  rpgFinDeTour(duel); Object.assign(duel[side].mana, { sable: 30, eau: 30 }); duel[side].main = ['chien-du-guet', 'sphere-de-rotation'];
  const attaquant = rpgMobaJouerCreature(duel, side, 'chien-du-guet', 'left', 0).entite;
  if (porteur === 'attaquant') assert.equal(rpgMobaJouerArme(duel, side, 'sphere-de-rotation', attaquant.id).ok, true);
  attaquant.ready = true;
  return { duel, side, enemy, attaquant, cible };
}
for (const side of ['joueur', 'sorcier']) for (const porteur of ['attaquant', 'bloqueur']) {
  test(`Sphère adaptateur MOBA : combat bloqué et retrait synchronisé (${side}, ${porteur})`, () => {
    const { duel, enemy, attaquant, cible } = fixtureSphereAdaptee(side, porteur);
    rpgReglerHasard(duel, () => .14); const hp = mobaVoie(duel.moba, 'left').hp[enemy];
    assert.equal(rpgMobaDeclarerAttaque(duel, side, [attaquant.id]).ok, true);
    const result = rpgMobaLancerAttaque(duel, side, [attaquant.id], { [attaquant.id]: [cible.id] }, { declaree: true });
    assert.equal(result.ok, true, JSON.stringify(result));
    const renvoye = porteur === 'attaquant' ? cible : attaquant, cote = porteur === 'attaquant' ? enemy : side;
    assert.ok(duel[cote].main.includes(renvoye.carteId)); assert.equal(mobaVoie(duel.moba, 'left').slots[cote][0], null);
    assert.equal(mobaVoie(duel.moba, 'left').hp[enemy], hp); assert.equal(rpgMobaPlacementCoherent(duel), true);
    const arme = porteur === 'attaquant' ? attaquant : cible; assert.equal(arme.arme.durabilite, 1);
  });
  test(`Sphère adaptateur MOBA : attaque ciblée et rapport d'annulation (${side}, ${porteur})`, () => {
    const { duel, enemy, attaquant, cible } = fixtureSphereAdaptee(side, porteur); attaquant.coupRapide = true;
    let jets = 0; rpgReglerHasard(duel, () => jets++ === 0 ? .5 : .14);
    assert.equal(rpgMobaDeclarerAttaque(duel, side, [attaquant.id], { [attaquant.id]: cible.id }).ok, true);
    const result = rpgMobaLancerAttaque(duel, side, [attaquant.id], {}, { declaree: true });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.resume.coupsRapides[0].annulationSphere, porteur === 'attaquant' ? 'cible' : 'attaquant');
    assert.equal(rpgMobaPlacementCoherent(duel), true); assert.equal(result.resume.frappeSorcier, 0);
    assert.equal(duel[porteur === 'attaquant' ? enemy : side].main.includes(porteur === 'attaquant' ? cible.carteId : attaquant.carteId), true);
  });
}
for (const side of ['joueur', 'sorcier']) test(`Sphère adaptateur MOBA : contresort ou disparition du porteur en réponse (${side})`, () => {
  for (const mode of ['contre', 'renvoi']) {
    const duel = partieCombat(); if (side === 'sorcier') rpgFinDeTour(duel);
    const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
    Object.assign(duel[side].mana, { sable: 30, eau: 30 }); duel[side].main = ['chien-du-guet', 'sphere-de-rotation'];
    const porteur = rpgMobaJouerCreature(duel, side, 'chien-du-guet', 'right', 0).entite;
    assert.equal(rpgMobaJouerArme(duel, side, 'sphere-de-rotation', porteur.id, { ouvrirReponse: true }).sortEnAttente, true);
    duel[enemy].main = [mode === 'contre' ? 'contresort-des-abimes' : 'ressac']; duel[enemy].mana.eau = 30;
    if (mode === 'contre') assert.equal(rpgMobaLancerMagie(duel, enemy, 'contresort-des-abimes').contre, true);
    else {
      assert.equal(rpgMobaLancerMagie(duel, enemy, 'ressac', porteur.id).ok, true);
      assert.equal(rpgMobaPasserSort(duel, enemy).dissipe, true);
    }
    assert.equal(porteur.arme, null); assert.ok(duel[side].cimetiere.includes('sphere-de-rotation'));
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  }
});


for (const caster of ['joueur', 'sorcier']) test(`Embuscade groundwork: announced spells detect each targeted ally for ${caster}'s opponent`, () => {
  const defender = caster === 'joueur' ? 'sorcier' : 'joueur';
  const duel = partie();
  const guardians = {};
  for (const side of ['joueur', 'sorcier']) {
    if (duel.tour !== side) rpgFinDeTour(duel);
    duel[side].mana.sable = 20;
    duel[side].main = Array(3).fill('gardienne-des-portes-de-sable');
    guardians[side] = [['left', 0], ['left', 1], ['right', 0]].map(([lane, slot]) =>
      rpgMobaJouerCreature(duel, side, 'gardienne-des-portes-de-sable', lane, slot).entite);
    assert.ok(guardians[side].every(Boolean));
  }
  if (duel.tour !== caster) rpgFinDeTour(duel);
  const [a, b, unrelated] = guardians[defender];
  const gardien = cardById('gardienne-du-croissant');
  duel[caster].mana.braise = 20;
  duel[caster].main = ['feux-de-kitsune'];
  assert.equal(rpgConditionEmbuscadeRemplie(duel, defender, gardien), false);
  assert.equal(rpgMobaLancerMagie(duel, caster, 'feux-de-kitsune', a.id, null, null,
    { ouvrirReponse: true, cibleSecondaireId: b.id }).sortEnAttente, true);
  assert.equal(rpgConditionEmbuscadeRemplie(duel, defender, gardien), true);
  // Either individual target is sufficient, but an unrelated ally is not.
  const original = duel[defender].creatures;
  for (const [creatures, expected] of [[[a], true], [[b], true], [[unrelated], false]]) {
    duel[defender].creatures = creatures;
    assert.equal(rpgConditionEmbuscadeRemplie(duel, defender, gardien), expected);
  }
  duel[defender].creatures = original;
  duel.fenetreReponse = false;
  assert.equal(rpgConditionEmbuscadeRemplie(duel, defender, gardien), false);
  duel.fenetreReponse = true;
  assert.equal(rpgMobaPasserSort(duel, defender).ok, true);
  assert.equal(rpgConditionEmbuscadeRemplie(duel, defender, gardien), false);
  assert.equal(MOBA_CARTES_AUTORISEES.includes(gardien.id), true);
});

for (const caster of ['joueur', 'sorcier']) test(`Embuscade groundwork: ${caster}'s untargeted wave is not a targeted spell`, () => {
  const defender = caster === 'joueur' ? 'sorcier' : 'joueur';
  const duel = partie();
  if (duel.tour !== defender) rpgFinDeTour(duel);
  duel[defender].main = ['gardienne-des-portes-de-sable']; duel[defender].mana.sable = 20;
  assert.equal(rpgMobaJouerCreature(duel, defender, 'gardienne-des-portes-de-sable', 'left', 0).ok, true);
  if (duel.tour !== caster) rpgFinDeTour(duel);
  duel[caster].main = ['tempete-de-sable']; duel[caster].mana.sable = 20;
  assert.equal(rpgMobaLancerMagie(duel, caster, 'tempete-de-sable', null, 'left', null, { ouvrirReponse: true }).sortEnAttente, true);
  assert.equal(rpgConditionEmbuscadeRemplie(duel, defender, cardById('gardienne-du-croissant')), false);
  assert.equal(rpgMobaPasserSort(duel, defender).ok, true);
});

test('the unaudited creatures remain gated and cannot be summoned during their own turn', () => {
  const ids = ['boualem'];
  for (const side of ['joueur', 'sorcier']) {
    const duel = partie();
    if (side === 'sorcier') rpgFinDeTour(duel);
    for (const id of ids) {
      assert.ok(cardById(id), id);
      assert.equal(MOBA_CARTES_AUTORISEES.includes(id), false, id);
      duel[side].main = [id];
      const before = JSON.stringify(duel);
      assert.equal(rpgMobaJouerCreature(duel, side, id, 'left', 0).raison, 'effet-non-pris-en-charge', id);
      assert.equal(JSON.stringify(duel), before, id);
    }
  }
});

for (const caster of ['joueur', 'sorcier']) test(`Embuscade groundwork: ${caster}'s announced creature effect targets an ally`, () => {
  const defender = caster === 'joueur' ? 'sorcier' : 'joueur';
  const duel = partie();
  if (duel.tour !== defender) rpgFinDeTour(duel);
  duel[defender].main = ['gardienne-des-portes-de-sable']; duel[defender].mana.sable = 20;
  const target = rpgMobaJouerCreature(duel, defender, 'gardienne-des-portes-de-sable', 'right', 0).entite;
  if (duel.tour !== caster) rpgFinDeTour(duel);
  duel[caster].main = ['gardienne-des-portes-de-sable', 'maitre-du-marteau'];
  duel[caster].mana.sable = 20; duel[caster].mana.neige = 20;
  const sacrifice = rpgMobaJouerCreature(duel, caster, 'gardienne-des-portes-de-sable', 'left', 0).entite;
  assert.ok(sacrifice);
  duel[defender].main = ['parade-du-verre']; duel[defender].mana.eau = 20;
  const gardien = cardById('gardienne-du-croissant');
  assert.equal(rpgMobaJouerCreature(duel, caster, 'maitre-du-marteau', 'right', 0, { ouvrirReponse: true, sacrificeIds: [sacrifice.id] }).creatureEnAttente, true);
  assert.equal(rpgConditionEmbuscadeRemplie(duel, defender, gardien), false);
  assert.equal(rpgMobaPasserCreature(duel, defender).ok, true);
  assert.equal(rpgMobaResoudreArrivee(duel, caster, target.id).ok, true);
  assert.ok(duel.effetCreatureEnAttente);
  assert.equal(rpgConditionEmbuscadeRemplie(duel, defender, gardien), true);
  assert.equal(rpgMobaPasserEffetCreature(duel, defender).ok, true);
  assert.equal(rpgConditionEmbuscadeRemplie(duel, defender, gardien), false);
});

for (const attackerSide of ['joueur', 'sorcier']) test(`Embuscade groundwork: ${attackerSide}'s targeted attack is distinct from a lane attack`, () => {
  for (const targeted of [false, true]) {
    const defender = attackerSide === 'joueur' ? 'sorcier' : 'joueur';
    const duel = partie();
    if (duel.tour !== defender) rpgFinDeTour(duel);
    duel[defender].main = ['gardienne-des-portes-de-sable']; duel[defender].mana.sable = 20;
    const target = rpgMobaJouerCreature(duel, defender, 'gardienne-des-portes-de-sable', 'left', 0).entite;
    if (duel.tour !== attackerSide) rpgFinDeTour(duel);
    duel[attackerSide].main = [targeted ? 'feriel' : 'gardienne-des-portes-de-sable'];
    duel[attackerSide].mana.braise = 20; duel[attackerSide].mana.sable = 20;
    const attacker = rpgMobaJouerCreature(duel, attackerSide, duel[attackerSide].main[0], 'left', 0).entite;
    assert.ok(attacker); attacker.ready = true;
    const gardien = cardById('gardienne-du-croissant');
    assert.equal(rpgConditionEmbuscadeRemplie(duel, defender, gardien), false);
    assert.equal(rpgMobaDeclarerAttaque(duel, attackerSide, [attacker.id], targeted ? { [attacker.id]: target.id } : {}).ok, true);
    assert.equal(rpgConditionEmbuscadeRemplie(duel, defender, gardien), targeted);
    assert.equal(rpgMobaLancerAttaque(duel, attackerSide, [attacker.id], {}, { declaree: true }).ok, true);
    assert.equal(rpgConditionEmbuscadeRemplie(duel, defender, gardien), false);
  }
});

for (const caster of ['joueur', 'sorcier']) for (const instant of [false, true]) test(`Embuscade gate: ${caster}'s targeted arrival ${instant ? 'opens for an audited instant' : 'opens for the Gardienne alone'}`, () => {
  const defender = caster === 'joueur' ? 'sorcier' : 'joueur';
  const duel = partie();
  if (duel.tour !== defender) rpgFinDeTour(duel);
  duel[defender].main = ['gardienne-des-portes-de-sable']; duel[defender].mana.sable = 20;
  const target = rpgMobaJouerCreature(duel, defender, 'gardienne-des-portes-de-sable', 'right', 0).entite;
  if (duel.tour !== caster) rpgFinDeTour(duel);
  duel[caster].main = ['gardienne-des-portes-de-sable', 'maitre-du-marteau'];
  duel[caster].mana.sable = 20; duel[caster].mana.neige = 20;
  const sacrifice = rpgMobaJouerCreature(duel, caster, 'gardienne-des-portes-de-sable', 'left', 0).entite;
  assert.ok(sacrifice);
  duel[defender].main = ['gardienne-du-croissant', ...(instant ? ['parade-du-verre'] : [])];
  duel[defender].mana.sable = 20; duel[defender].mana.tenebres = 20; duel[defender].mana.eau = 20;
  assert.equal(rpgMobaJouerCreature(duel, caster, 'maitre-du-marteau', 'right', 0, { ouvrirReponse: true, sacrificeIds: [sacrifice.id] }).creatureEnAttente, true);
  assert.equal(rpgMobaPasserCreature(duel, defender).ok, true);
  const life = target.pv;
  const result = rpgMobaResoudreArrivee(duel, caster, target.id);
  assert.equal(result.ok, true);
  if (instant) {
    assert.ok(duel.effetCreatureEnAttente);
    assert.equal(target.pv, life);
    assert.equal(rpgMobaLancerMagie(duel, defender, 'parade-du-verre', target.id).ok, true);
    assert.equal(rpgMobaPasserEffetCreature(duel, defender).ok, true);
    assert.equal(target.pv, life);
  } else {
    assert.ok(duel.effetCreatureEnAttente);
    assert.equal(target.pv, life);
    assert.equal(rpgMobaPasserEffetCreature(duel, defender).ok, true);
    assert.ok(!duel[defender].creatures.includes(target) || target.pv < life);
  }
  assert.deepEqual(duel[defender].main, ['gardienne-du-croissant']);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});


test('an Embuscade removed from the combat audit fails closed', () => {
  const id = 'tojiro-le-pourfendeur';
  assert.equal(CARTES_COMBAT_AUDITEES.has(id), true);
  CARTES_COMBAT_AUDITEES.delete(id);
  try {
    for (const side of ['joueur', 'sorcier']) {
      const duel = partie();
      if (side === 'sorcier') rpgFinDeTour(duel);
      duel[side].main = [id]; duel[side].mana.braise = 20;
      const before = JSON.stringify(duel);
      assert.equal(rpgMobaJouerCreature(duel, side, id, 'left', 0).raison, 'effet-non-pris-en-charge');
      assert.equal(JSON.stringify(duel), before);
    }
  } finally {
    CARTES_COMBAT_AUDITEES.add(id);
  }
});

test('classic Embuscade response eligibility is unchanged', () => {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5, pvp: true });
  duel.sorcier.main = ['chien-du-guet']; duel.sorcier.mana.sable = 20;
  const attacker = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  assert.ok(attacker);
  duel.tour = 'sorcier'; duel.phase = 'blocage'; duel.fenetreReponse = true;
  duel.combatDeclare = { cote: 'sorcier', attaquants: [attacker.id], ciblesAttaque: {} };
  duel.joueur.main = ['garde-du-trone-givre']; duel.joueur.mana.neige = 20; duel.joueur.mana.tenebres = 20;
  assert.equal(rpgPeutRepondre(duel, 'joueur'), true);
  duel.combatDeclare.attaquants = [];
  assert.equal(rpgPeutRepondre(duel, 'joueur'), false);
});
