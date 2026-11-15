import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgFinDeTour, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaMulligan, rpgMobaJouerCreature, rpgMobaResoudreArrivee, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirArriveeIA } from '../src/games/rpgMobaAI.js';

function partie(side) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.equal(rpgMobaMulligan(duel, 'joueur', []).ok, true);
  assert.equal(rpgMobaMulligan(duel, 'sorcier', []).ok, true);
  if (side === 'sorcier') rpgFinDeTour(duel);
  return duel;
}
function prochainTour(duel) { rpgFinDeTour(duel); rpgFinDeTour(duel); }

for (const side of ['joueur', 'sorcier']) {
  test(`${side} : la Völva soigne un allié blessé plutôt qu'un allié intact plus puissant`, () => {
    const duel = partie(side);
    duel[side].main = ['gardienne-des-portes-de-sable'];
    const blessee = rpgMobaJouerCreature(duel, side, 'gardienne-des-portes-de-sable', 'left', 0).entite;
    assert.ok(blessee); blessee.pv = blessee.def = 1;
    prochainTour(duel);
    duel[side].main = ['ashigaru-des-braises'];
    const intacte = rpgMobaJouerCreature(duel, side, 'ashigaru-des-braises', 'left', 1).entite;
    assert.ok(intacte); Object.assign(intacte, { atk: 10, def: 10, pv: 10, pvMax: 10 });
    prochainTour(duel);
    duel[side].main = ['volva-soigneuse'];
    assert.equal(rpgMobaJouerCreature(duel, side, 'volva-soigneuse', 'right', 0).arriveeEnAttente, true);
    let jets = 0;
    rpgReglerHasard(duel, () => { jets++; return .5; });
    const avant = JSON.stringify(duel);
    const choix = rpgMobaChoisirArriveeIA(duel, side);
    assert.equal(choix, blessee.id);
    assert.equal(JSON.stringify(duel), avant);
    assert.equal(jets, 0);
    assert.equal(rpgMobaResoudreArrivee(duel, side, choix).ok, true);
    assert.equal(blessee.pv, 4);
    assert.equal(intacte.pv, 10);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  });
}

for (const side of ['joueur', 'sorcier']) for (const menace of [false, true]) {
  test(`${side} : soin contextuel ${menace ? 'sauve la cible menacée' : 'tient compte de la puissance offensive'}`, () => {
    const duel = partie(side), enemy = side === 'joueur' ? 'sorcier' : 'joueur';
    duel[side].main = ['gardienne-des-portes-de-sable'];
    const faible = rpgMobaJouerCreature(duel, side, 'gardienne-des-portes-de-sable', 'left', 0).entite;
    assert.ok(faible); Object.assign(faible, { atk: 1, pv: 1, def: 1, pvMax: 4 });
    rpgFinDeTour(duel);
    if (menace) {
      duel[enemy].main = ['ashigaru-des-braises'];
      const adversaire = rpgMobaJouerCreature(duel, enemy, 'ashigaru-des-braises', 'left', 0).entite;
      assert.ok(adversaire); adversaire.atk = 3;
    }
    rpgFinDeTour(duel);
    duel[side].main = ['ashigaru-des-braises'];
    const forte = rpgMobaJouerCreature(duel, side, 'ashigaru-des-braises', 'right', 0).entite;
    assert.ok(forte); Object.assign(forte, { atk: 6, pv: 4, def: 4, pvMax: 6 });
    prochainTour(duel);
    duel[side].main = ['volva-soigneuse'];
    assert.equal(rpgMobaJouerCreature(duel, side, 'volva-soigneuse', 'center', 0).arriveeEnAttente, true);
    let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
    const avant = JSON.stringify(duel);
    const choix = rpgMobaChoisirArriveeIA(duel, side);
    assert.equal(choix, menace ? faible.id : forte.id);
    assert.equal(JSON.stringify(duel), avant);
    assert.equal(jets, 0);
    assert.equal(rpgMobaResoudreArrivee(duel, side, choix).ok, true);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  });
}
