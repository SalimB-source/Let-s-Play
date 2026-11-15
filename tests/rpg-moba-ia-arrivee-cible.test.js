import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgFinDeTour, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaMulligan, rpgMobaJouerCreature, rpgMobaResoudreArrivee, rpgMobaPasserEffetCreature, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirArriveeIA } from '../src/games/rpgMobaAI.js';

function partie(side, { bouclier = false, autreVoie = false, esquive = false, tenacite = false } = {}) {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.equal(rpgMobaMulligan(duel, 'joueur', []).ok, true);
  assert.equal(rpgMobaMulligan(duel, 'sorcier', []).ok, true);
  if (duel.tour !== enemy) rpgFinDeTour(duel);
  duel[enemy].main = ['gardienne-des-portes-de-sable'];
  const gardienne = rpgMobaJouerCreature(duel, enemy, 'gardienne-des-portes-de-sable', 'right', 0).entite;
  assert.ok(gardienne);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  duel[enemy].main = ['ashigaru-des-braises'];
  const ashigaru = rpgMobaJouerCreature(duel, enemy, 'ashigaru-des-braises', autreVoie ? 'center' : 'right', autreVoie ? 0 : 1).entite;
  assert.ok(ashigaru);
  if (bouclier) ashigaru.bouclier = 1;
  if (esquive) { ashigaru.esquive = true; ashigaru.esquiveChance = .15; }
  if (tenacite) ashigaru.tenaciteDisponible = true;
  rpgFinDeTour(duel);
  assert.equal(duel.tour, side);
  duel[side].main = ['tour-de-braise'];
  const tour = rpgMobaJouerCreature(duel, side, 'tour-de-braise', 'right', 0);
  assert.equal(tour.ok, true, JSON.stringify(tour));
  assert.ok(duel.arriveeEnAttente);
  return { duel, enemy, gardienne, ashigaru };
}

for (const side of ['joueur', 'sorcier']) {
  test(`${side} : Tour de braise élimine l'Ashigaru plutôt que blesser la Gardienne`, () => {
    const { duel, enemy, gardienne, ashigaru } = partie(side);
    let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
    const avant = JSON.stringify(duel);
    const cible = rpgMobaChoisirArriveeIA(duel, side);
    assert.equal(cible, ashigaru.id);
    assert.equal(JSON.stringify(duel), avant);
    assert.equal(jets, 0);
    assert.equal(rpgMobaResoudreArrivee(duel, side, cible).ok, true);
    if (duel.effetCreatureEnAttente) assert.equal(rpgMobaPasserEffetCreature(duel, enemy).ok, true);
    assert.equal(duel[enemy].creatures.some((e) => e.id === ashigaru.id), false);
    assert.equal(gardienne.pv, 4);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  });

  for (const [raison, description] of [['bouclier', 'protégé par un bouclier'], ['autreVoie', 'dans une autre voie'], ['esquive', 'capable d’esquiver'], ['tenacite', 'doté de Tenacité']]) {
    test(`${side} : la Tour ne considère pas l'Ashigaru ${description} comme une élimination certaine`, () => {
      const { duel, gardienne, ashigaru } = partie(side, { [raison]: true });
      const avant = JSON.stringify(duel);
      assert.equal(rpgMobaChoisirArriveeIA(duel, side), gardienne.id);
      assert.equal(JSON.stringify(duel), avant);
      assert.ok(duel[side === 'joueur' ? 'sorcier' : 'joueur'].creatures.includes(ashigaru));
    });
  }
}

for (const side of ['joueur', 'sorcier']) {
  test(`${side} : ne privilégie pas une élimination qui détruirait sa Tour en riposte`, () => {
    const { duel, enemy, gardienne, ashigaru } = partie(side);
    // Les statistiques représentent des bonus déjà appliqués sur le plateau.
    gardienne.atk = 7;
    ashigaru.atk = 6;
    ashigaru.contreAttaque = true;
    const essai = JSON.parse(JSON.stringify(duel));
    rpgReglerHasard(essai, () => .5);
    assert.equal(rpgMobaResoudreArrivee(essai, side, ashigaru.id).ok, true);
    if (essai.effetCreatureEnAttente) assert.equal(rpgMobaPasserEffetCreature(essai, enemy).ok, true);
    assert.equal(essai[side].creatures.some((e) => e.carteId === 'tour-de-braise'), false);
    const avant = JSON.stringify(duel);
    assert.equal(rpgMobaChoisirArriveeIA(duel, side), gardienne.id);
    assert.equal(JSON.stringify(duel), avant);
  });
}
