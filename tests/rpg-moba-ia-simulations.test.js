import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgFinDeTour, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaMulligan, rpgMobaJouerCreature } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirCreatureIA, rpgMobaChoisirMagieIA } from '../src/games/rpgMobaAI.js';

function partie(side) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMobaMulligan(duel, 'joueur', []).ok);
  assert.ok(rpgMobaMulligan(duel, 'sorcier', []).ok);
  if (side === 'sorcier') rpgFinDeTour(duel);
  return duel;
}

for (const side of ['joueur', 'sorcier']) for (const type of ['invocation', 'reanimation']) {
  test(`${side} : la simulation de ${type} ne consomme ni identifiants ni hasard réel`, () => {
    const duel = partie(side);
    duel[side].main = [type === 'invocation' ? 'ashigaru-des-braises' : 'reanimation'];
    if (type === 'reanimation') duel[side].cimetiere = ['jarl-au-marteau-de-guerre'];
    const temoin = partie('joueur');
    temoin.joueur.main = ['ashigaru-des-braises'];
    const premier = rpgMobaJouerCreature(temoin, 'joueur', 'ashigaru-des-braises', 'left', 0);
    assert.ok(premier.ok);
    let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
    const avant = JSON.stringify(duel);
    const choix = type === 'invocation' ? rpgMobaChoisirCreatureIA(duel, side) : rpgMobaChoisirMagieIA(duel, side);
    assert.ok(choix, 'un choix est effectivement simulé');
    assert.equal(JSON.stringify(duel), avant);
    assert.equal(jets, 0);
    rpgFinDeTour(temoin); rpgFinDeTour(temoin);
    temoin.joueur.main = ['ashigaru-des-braises'];
    const suivant = rpgMobaJouerCreature(temoin, 'joueur', 'ashigaru-des-braises', 'left', 1);
    assert.ok(suivant.ok);
    assert.equal(Number(suivant.entite.id.split('-')[1]), Number(premier.entite.id.split('-')[1]) + 1);
  });
}
