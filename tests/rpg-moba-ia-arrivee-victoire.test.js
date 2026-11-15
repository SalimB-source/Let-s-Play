import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgFinDeTour, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { mobaInfliger, mobaVoie } from '../src/games/rpgMoba.js';
import { rpgMobaNouveauDuel, rpgMobaMulligan, rpgMobaJouerCreature, rpgMobaResoudreArrivee, rpgMobaPasserEffetCreature, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
import { rpgMobaChoisirArriveeIA } from '../src/games/rpgMobaAI.js';

function position(side, victoire, premiereVoie = false, autreAllie = false) {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.equal(rpgMobaMulligan(duel, 'joueur', []).ok, true);
  assert.equal(rpgMobaMulligan(duel, 'sorcier', []).ok, true);
  if (duel.tour !== enemy) rpgFinDeTour(duel);
  duel[enemy].main = ['gardienne-des-portes-de-sable'];
  const cible = rpgMobaJouerCreature(duel, enemy, 'gardienne-des-portes-de-sable', 'right', 0).entite;
  assert.ok(cible);
  rpgFinDeTour(duel);
  duel[side].main = ['ashigaru-des-braises'];
  const sacrifice = rpgMobaJouerCreature(duel, side, 'ashigaru-des-braises', 'right', 0).entite;
  assert.ok(sacrifice);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  assert.equal(duel.tour, side);
  if (victoire) assert.equal(mobaInfliger(duel.moba, side, 'left', 20).conquered, true);
  if (victoire || premiereVoie) assert.equal(mobaInfliger(duel.moba, side, 'right', 17).conquered, false);
  if (autreAllie) {
    const carte = typeof autreAllie === 'string' ? autreAllie : 'gardienne-des-portes-de-sable';
    duel[side].main = [carte];
    assert.ok(rpgMobaJouerCreature(duel, side, carte, 'right', 1).entite);
    rpgFinDeTour(duel); rpgFinDeTour(duel);
  }
  duel[side].main = ['maitre-du-marteau'];
  const played = rpgMobaJouerCreature(duel, side, 'maitre-du-marteau', 'right', 0, { sacrificeIds: [sacrifice.id] });
  assert.equal(played.ok, true, JSON.stringify(played));
  assert.ok(duel.arriveeEnAttente);
  return { duel, enemy, cible };
}

for (const side of ['joueur', 'sorcier']) {
  test(`${side} : le Maître frappe la voie pour gagner immédiatement malgré une créature adverse`, () => {
    const { duel, enemy, cible } = position(side, true);
    assert.equal(mobaVoie(duel.moba, 'right').hp[enemy], 3);
    let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
    const avant = JSON.stringify(duel);
    assert.equal(rpgMobaChoisirArriveeIA(duel, side), 'sorcier');
    assert.equal(JSON.stringify(duel), avant);
    assert.equal(jets, 0);
    assert.equal(rpgMobaResoudreArrivee(duel, side, 'sorcier').ok, true);
    if (duel.effetCreatureEnAttente) assert.equal(rpgMobaPasserEffetCreature(duel, enemy).ok, true);
    assert.equal(duel.moba.winner, side);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
    assert.ok(cible.id);
  });

  test(`${side} : conquiert une première voie en échange du Maître seul`, () => {
    const { duel, enemy, cible } = position(side, false, true);
    const avant = JSON.stringify(duel);
    let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
    assert.equal(rpgMobaChoisirArriveeIA(duel, side), 'sorcier');
    assert.equal(JSON.stringify(duel), avant);
    assert.equal(jets, 0);
    assert.equal(rpgMobaResoudreArrivee(duel, side, 'sorcier').ok, true);
    if (duel.effetCreatureEnAttente) assert.equal(rpgMobaPasserEffetCreature(duel, enemy).ok, true);
    assert.equal(mobaVoie(duel.moba, 'right').conqueredBy, side);
    assert.equal(duel.moba.winner, null);
    assert.equal(duel[side].creatures.length, 0);
    assert.equal(duel[enemy].creatures.some((e) => e.id === cible.id), false);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  });

  test(`${side} : conquiert une première voie même avec un Ashigaru allié 1/1`, () => {
    const { duel, enemy, cible } = position(side, false, true, 'ashigaru-des-braises');
    const ashigaru = duel[side].creatures.find((e) => e.carteId === 'ashigaru-des-braises');
    assert.ok(ashigaru); assert.equal(ashigaru.atk, 1); assert.equal(ashigaru.pv, 1);
    const avant = JSON.stringify(duel);
    let jets = 0; rpgReglerHasard(duel, () => { jets++; return .5; });
    assert.equal(rpgMobaChoisirArriveeIA(duel, side), 'sorcier');
    assert.equal(JSON.stringify(duel), avant); assert.equal(jets, 0);
    assert.ok(rpgMobaResoudreArrivee(duel, side, 'sorcier').ok);
    if (duel.effetCreatureEnAttente) assert.ok(rpgMobaPasserEffetCreature(duel, enemy).ok);
    assert.equal(mobaVoie(duel.moba, 'right').conqueredBy, side);
    assert.equal(duel.moba.winner, null);
    assert.equal(duel[side].creatures.length, 0);
    assert.equal(duel[enemy].creatures.some((e) => e.id === cible.id), false);
    assert.ok(rpgMobaPlacementCoherent(duel));
  });

  test(`${side} : conserve un Ashigaru renforcé plutôt que généraliser la préférence`, () => {
    const { duel, cible } = position(side, false, true, 'ashigaru-des-braises');
    const allie = duel[side].creatures.find((e) => e.carteId === 'ashigaru-des-braises');
    allie.atk = 5; allie.pv = allie.pvMax = allie.def = 5;
    assert.equal(rpgMobaChoisirArriveeIA(duel, side), cible.id);
  });

  test(`${side} : ne généralise pas la préférence à un Ashigaru équipé`, () => {
    const { duel, cible } = position(side, false, true, 'ashigaru-des-braises');
    const allie = duel[side].creatures.find((e) => e.carteId === 'ashigaru-des-braises');
    allie.arme = { carteId: 'grappin-d-abordage' };
    const avant = JSON.stringify(duel);
    assert.equal(rpgMobaChoisirArriveeIA(duel, side), cible.id);
    assert.equal(JSON.stringify(duel), avant);
  });

  test(`${side} : ne sacrifie pas automatiquement un allié supplémentaire pour une première voie`, () => {
    const { duel, cible } = position(side, false, true, true);
    const avant = JSON.stringify(duel);
    assert.equal(rpgMobaChoisirArriveeIA(duel, side), cible.id);
    assert.equal(JSON.stringify(duel), avant);
  });

  test(`${side} : sans conquête, les autres choix restent légaux`, () => {
    const { duel, cible } = position(side, false);
    const avant = JSON.stringify(duel);
    assert.equal(rpgMobaChoisirArriveeIA(duel, side), cible.id);
    assert.equal(JSON.stringify(duel), avant);
  });
}
