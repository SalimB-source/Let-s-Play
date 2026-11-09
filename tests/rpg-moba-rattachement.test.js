import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan } from '../src/games/rpgDuel.js';
import { mobaInfliger, mobaNouveau, mobaPlacer, mobaRattacherCentre, mobaValiderBlocages, mobaVoie } from '../src/games/rpgMoba.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaLancerAttaque, rpgMobaChoisirVoieCentrale, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';

for (const side of ['joueur', 'sorcier']) for (const flank of ['left', 'right']) {
  test(`centre conquis par ${side} : seul son camp rejoint ${flank}`, () => {
    const state = mobaNouveau();
    assert.equal(mobaPlacer(state, side, 'center', 0, 'ally').ok, true);
    const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
    assert.equal(mobaPlacer(state, enemy, 'center', 0, 'enemy').ok, true);
    assert.equal(mobaPlacer(state, enemy, flank, 0, 'flank-blocker').ok, true);
    const conquest = mobaInfliger(state, side, 'center', 10);
    assert.deepEqual(conquest.removed[side], []);
    assert.deepEqual(conquest.removed[enemy], ['enemy']);
    assert.deepEqual(mobaVoie(state, 'center').slots[side], ['ally']);
    assert.deepEqual(mobaVoie(state, 'center').slots[enemy], [null]);
    assert.equal(mobaValiderBlocages(state, side, ['ally'], {}).ok, false);
    assert.equal(mobaRattacherCentre(state, enemy, flank).ok, false);
    assert.equal(mobaRattacherCentre(state, side, 'center').ok, false);
    assert.equal(mobaRattacherCentre(state, side, flank).ok, true);
    assert.equal(mobaValiderBlocages(state, side, ['ally'], { ally: ['flank-blocker'] }).ok, true);
    assert.equal(mobaValiderBlocages(state, side, ['ally'], { ally: ['enemy'] }).ok, false);
    assert.equal(mobaValiderBlocages(state, side, ['ally'], { ally: ['flank-blocker', 'flank-blocker'] }).ok, false);
    const otherFlank = flank === 'left' ? 'right' : 'left';
    assert.equal(mobaPlacer(state, enemy, otherFlank, 0, 'other-blocker').ok, true);
    assert.equal(mobaValiderBlocages(state, side, ['ally'], { ally: ['other-blocker'] }).ok, false);
    assert.equal(mobaRattacherCentre(state, side, otherFlank).ok, false);
  });
}

function duelPret() {
  const duel = rpgMobaNouveauDuel({ joueurDeck: Array(30).fill('ashigaru-des-braises'), sorcierDeck: Array(30).fill('ashigaru-des-braises'), rng: () => .5 });
  rpgMulligan(duel, 'joueur', []); rpgMulligan(duel, 'sorcier', []); rpgDemarrerManaEssai(duel);
  return duel;
}

test('une créature centrale survivante garde son emplacement mais attaque les PV de la voie choisie', () => {
  const duel = duelPret();
  duel.joueur.mana.braise = 20;
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'center', 0).entite;
  assert.ok(ally);
  // La conquête peut aussi venir d’un sort ou d’une capacité : le choix reste obligatoire.
  assert.equal(mobaInfliger(duel.moba, 'joueur', 'center', 10).conquered, true);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  assert.equal(rpgMobaChoisirVoieCentrale(duel, 'joueur', 'right').ok, true);
  assert.equal(ally.mobaLane, 'right');
  assert.equal(ally.emplacement, 2);
  assert.equal(mobaVoie(duel.moba, 'center').slots.joueur[0], ally.id);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
  ally.ready = true;
  const beforeRight = mobaVoie(duel.moba, 'right').hp.sorcier;
  const result = rpgMobaLancerAttaque(duel, 'joueur', [ally.id]);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.ok(mobaVoie(duel.moba, 'right').hp.sorcier < beforeRight);
  assert.equal(mobaVoie(duel.moba, 'left').hp.sorcier, 20);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('une voie latérale fermée ne peut recevoir les créatures du centre', () => {
  const state = mobaNouveau();
  mobaInfliger(state, 'sorcier', 'left', 20);
  mobaInfliger(state, 'joueur', 'center', 10);
  assert.equal(mobaRattacherCentre(state, 'joueur', 'left').ok, false);
  assert.equal(mobaRattacherCentre(state, 'joueur', 'right').ok, true);
});

test('si la voie rattachée tombe, la créature centrale rattachée quitte également le plateau', () => {
  const state = mobaNouveau();
  mobaPlacer(state, 'joueur', 'center', 0, 'center-ally');
  mobaPlacer(state, 'joueur', 'left', 0, 'left-ally');
  mobaInfliger(state, 'joueur', 'center', 10);
  mobaRattacherCentre(state, 'joueur', 'left');
  const result = mobaInfliger(state, 'sorcier', 'left', 20);
  assert.deepEqual(result.removed.joueur, ['left-ally', 'center-ally']);
  assert.equal(mobaVoie(state, 'center').slots.joueur[0], null);
  assert.equal(state.centerJoined, null);
});

test('le combat conquiert le centre sans exiler la créature attaquante, mais exile l’adversaire', () => {
  const duel = duelPret();
  duel.joueur.mana.braise = 20;
  const ally = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'center', 0).entite;
  rpgFinDeTour(duel);
  duel.sorcier.mana.braise = 20;
  const enemy = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'center', 0).entite;
  rpgFinDeTour(duel);
  ally.ready = true;
  mobaVoie(duel.moba, 'center').hp.sorcier = 1;
  const result = rpgMobaLancerAttaque(duel, 'joueur', [ally.id]);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(duel.moba.centerChoice, 'joueur');
  assert.ok(duel.joueur.creatures.includes(ally));
  assert.equal(duel.sorcier.creatures.includes(enemy), false);
  assert.equal(rpgMobaChoisirVoieCentrale(duel, 'joueur', 'left').ok, true);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('la créature centrale rattachée bloque une attaque latérale adverse', () => {
  const duel = duelPret();
  duel.joueur.mana.braise = 20;
  const blocker = rpgMobaJouerCreature(duel, 'joueur', 'ashigaru-des-braises', 'center', 0).entite;
  rpgFinDeTour(duel);
  duel.sorcier.mana.braise = 20;
  const attacker = rpgMobaJouerCreature(duel, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  mobaInfliger(duel.moba, 'joueur', 'center', 10);
  assert.equal(rpgMobaChoisirVoieCentrale(duel, 'joueur', 'left').ok, true);
  blocker.ready = true;
  attacker.ready = true;
  const result = rpgMobaLancerAttaque(duel, 'sorcier', [attacker.id], { [attacker.id]: [blocker.id] });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(mobaVoie(duel.moba, 'left').hp.joueur, 20);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});
