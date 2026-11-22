import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan } from '../src/games/rpgDuel.js';
import { sacrificesInvocation } from '../src/games/rpgInvocation.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaLancerMagie, rpgMobaPeutEmbuscade, rpgMobaPeutPayer, rpgMobaPasserCreature, rpgMobaTerminerTour, rpgMobaPasserFinDeTour } from '../src/games/rpgMobaLocal.js';

function partie() {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  return d;
}

for (const side of ['joueur', 'sorcier']) {
  test(`${side} : plusieurs invocations normales dans le même tour`, () => {
    const d = partie(); if (d.tour !== side) rpgFinDeTour(d);
    d[side].main = ['ashigaru-des-braises', 'ashigaru-des-braises', 'gardienne-des-portes-de-sable'];
    assert.ok(rpgMobaJouerCreature(d, side, 'ashigaru-des-braises', 'left', 0).entite);
    // Le quota d’invocations normales par tour est retiré : la deuxième et la
    // troisième pose passent dans le même tour, tant qu’il reste des cases.
    assert.equal(rpgMobaPeutPayer(d, side, cardById('ashigaru-des-braises')), true);
    assert.ok(rpgMobaJouerCreature(d, side, 'ashigaru-des-braises', 'right', 0).entite);
    assert.equal(rpgMobaPeutPayer(d, side, cardById('gardienne-des-portes-de-sable')), true);
    assert.ok(rpgMobaJouerCreature(d, side, 'gardienne-des-portes-de-sable', 'center', 0).entite);
    assert.equal(d[side].creatures.length, 3);
    assert.equal(d.moba.creaturesJouees[side], true, 'l’état note la pose normale');
    rpgFinDeTour(d); rpgFinDeTour(d);
    assert.equal(d.moba.creaturesJouees[side], false, 'et se réarme au tour suivant');
  });
  test(`${side} : Tojiro en Embuscade ne sacrifie pas, même si le Djinn disparaît après l’annonce`, () => {
    const d = partie(), ennemi = side === 'joueur' ? 'sorcier' : 'joueur';
    if (d.tour !== ennemi) rpgFinDeTour(d);
    d[ennemi].main = ['djinn-du-dernier-brasier'];
    const djinn = rpgMobaJouerCreature(d, ennemi, 'djinn-du-dernier-brasier', 'left', 0).entite;
    assert.ok(djinn); d[side].main = ['tojiro-le-pourfendeur'];
    assert.ok(rpgMobaTerminerTour(d, ennemi).ok);
    assert.equal(sacrificesInvocation(cardById('tojiro-le-pourfendeur'), d, side), 0);
    assert.ok(rpgMobaPeutEmbuscade(d, side, 'tojiro-le-pourfendeur'));
    assert.ok(rpgMobaJouerCreature(d, side, 'tojiro-le-pourfendeur', 'left', 0, { ouvrirReponse: true, sacrificeIds: [] }).ok);
    assert.equal(d.moba.embuscadesJouees[side], true);
    assert.equal(d.moba.creaturesJouees[side], false);
    djinn.carteId = 'ashigaru-des-braises';
    assert.ok(rpgMobaPasserCreature(d, ennemi).entite);
    assert.ok(rpgMobaPasserFinDeTour(d, side).ok);
    assert.equal(d.moba.embuscadesJouees[side], false);
    assert.equal(sacrificesInvocation(cardById('tojiro-le-pourfendeur'), d, side), 1);
  });
  test(`${side} : une Embuscade contrée n'empêche pas une autre Embuscade`, () => {
    const d = partie(), ennemi = side === 'joueur' ? 'sorcier' : 'joueur';
    if (d.tour !== ennemi) rpgFinDeTour(d);
    d[ennemi].main = ['djinn-du-dernier-brasier', 'ecueil'];
    assert.ok(rpgMobaJouerCreature(d, ennemi, 'djinn-du-dernier-brasier', 'left', 0).ok);
    d[side].main = ['tojiro-le-pourfendeur', 'tojiro-le-pourfendeur'];
    assert.ok(rpgMobaTerminerTour(d, ennemi).ok);
    assert.ok(rpgMobaJouerCreature(d, side, 'tojiro-le-pourfendeur', 'left', 0, { ouvrirReponse: true, sacrificeIds: [] }).ok);
    assert.ok(rpgMobaLancerMagie(d, ennemi, 'ecueil').contre);
    assert.equal(d.moba.embuscadesJouees[side], true);
    assert.equal(rpgMobaPeutEmbuscade(d, side, 'tojiro-le-pourfendeur'), true);
  });
}

test('le centre commence à 15 PV, les voies latérales restent à 20', () => {
  const d = partie();
  assert.deepEqual(d.moba.lanes.map(l => [l.hp.joueur, l.hp.sorcier]), [[20, 20], [15, 15], [20, 20]]);
});

test('l’IA peut annoncer Tojiro sans victime si un Djinn est présent', async () => {
  const { rpgMobaChoisirEmbuscadeIA } = await import('../src/games/rpgMobaAI.js');
  const d = partie();
  d.joueur.main = ['djinn-du-dernier-brasier'];
  assert.ok(rpgMobaJouerCreature(d, 'joueur', 'djinn-du-dernier-brasier', 'left', 0).ok);
  d.sorcier.main = ['tojiro-le-pourfendeur'];
  assert.ok(rpgMobaTerminerTour(d, 'joueur').ok);
  const avant = JSON.stringify(d);
  const choix = rpgMobaChoisirEmbuscadeIA(d, 'sorcier');
  assert.equal(choix?.id, 'tojiro-le-pourfendeur');
  assert.deepEqual(choix.sacrificeIds, []);
  assert.equal(JSON.stringify(d), avant);
  assert.ok(rpgMobaJouerCreature(d, 'sorcier', choix.id, choix.lane, choix.slot, { ouvrirReponse: true, sacrificeIds: choix.sacrificeIds }).ok);
});
