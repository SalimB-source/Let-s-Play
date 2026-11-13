import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { mobaInfliger, mobaVoie } from '../src/games/rpgMoba.js';
import {
  rpgMobaNouveauDuel, rpgMobaJouerCreature,
  rpgMobaDeclarerAttaqueIndividuelle, rpgMobaResoudreAttaqueIndividuelle,
} from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirAttaqueIndividuelleIA } from '../src/games/rpgMobaAI.js';

function partie(side) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(duel, 'joueur', []).ok);
  assert.ok(rpgMulligan(duel, 'sorcier', []).ok);
  assert.ok(rpgDemarrerManaEssai(duel).ok);
  if (duel.tour !== side) rpgFinDeTour(duel);
  return duel;
}

for (const side of ['joueur', 'sorcier']) {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  test(`${side} : conquiert même si la fermeture de la voie exile sa créature puissante`, () => {
    const duel = partie(side);
    duel[side].main = ['ashigaru-des-braises'];
    const attacker = rpgMobaJouerCreature(duel, side, 'ashigaru-des-braises', 'left', 0).entite;
    assert.ok(attacker);
    Object.assign(attacker, { ready: true, malInvocation: false, atk: 5, pv: 20, pvMax: 20 });
    assert.equal(mobaInfliger(duel.moba, side, 'left', 19).conquered, false);
    assert.equal(mobaVoie(duel.moba, 'left').hp[enemy], 1);
    let jets = 0;
    rpgReglerHasard(duel, () => { jets++; return .5; });
    const avant = JSON.stringify(duel);
    const choix = rpgMobaChoisirAttaqueIndividuelleIA(duel, side);
    assert.equal(choix?.attaquantId, attacker.id);
    assert.equal(choix.cibleId, null);
    assert.equal(choix.voie, 'left');
    assert.equal(JSON.stringify(duel), avant, 'la simulation ne modifie pas la partie');
    assert.equal(jets, 0, 'elle ne consomme pas le hasard réel');
    assert.ok(rpgMobaDeclarerAttaqueIndividuelle(duel, side, choix.attaquantId, choix.cibleId, choix.voie).ok);
    assert.ok(rpgMobaResoudreAttaqueIndividuelle(duel, side).ok);
    assert.equal(mobaVoie(duel.moba, 'left').conqueredBy, side);
    assert.equal(duel[side].creatures.some((entity) => entity.id === attacker.id), false,
      'la règle d’exil après conquête reste inchangée');
  });

  test(`${side} : une perte sèche sans conquête ne justifie toujours pas une attaque`, () => {
    const duel = partie(side);
    duel[side].main = ['ashigaru-des-braises'];
    const attacker = rpgMobaJouerCreature(duel, side, 'ashigaru-des-braises', 'left', 0).entite;
    rpgFinDeTour(duel);
    duel[enemy].main = ['ashigaru-des-braises'];
    const defender = rpgMobaJouerCreature(duel, enemy, 'ashigaru-des-braises', 'left', 0).entite;
    rpgFinDeTour(duel);
    attacker.ready = true;
    attacker.atk = 1;
    defender.atk = 10;
    defender.pv = defender.pvMax = defender.def = 10;
    assert.equal(rpgMobaChoisirAttaqueIndividuelleIA(duel, side), null);
  });
}
