import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaJouerArme, rpgMobaLancerMagie, rpgMobaPasserSort, rpgMobaTerminerTour, rpgMobaPasserFinDeTour, rpgMobaPeutPayer } from '../src/games/rpgMobaLocal.js';

function partie(side) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  if (d.tour !== side) rpgFinDeTour(d);
  d[side].main = ['ashigaru-des-braises'];
  const porteur = rpgMobaJouerCreature(d, side, 'ashigaru-des-braises', 'left', 0).entite;
  assert.ok(porteur);
  return { d, porteur, autre: side === 'joueur' ? 'sorcier' : 'joueur' };
}

for (const side of ['joueur', 'sorcier']) {
  test(`${side} : plusieurs sorts et armes restent jouables au même tour`, () => {
    const { d, porteur } = partie(side);
    d[side].main = ['trait-de-braise', 'trait-de-braise', 'javelot-du-beffroi', 'cuirasse-de-sel'];
    const avant = JSON.stringify(d);
    assert.equal(rpgMobaJouerArme(d, side, 'javelot-du-beffroi', 'inexistant').ok, false);
    assert.equal(JSON.stringify(d), avant);
    assert.ok(rpgMobaLancerMagie(d, side, 'trait-de-braise', 'sorcier', 'right').ok);
    assert.equal(rpgMobaPeutPayer(d, side, cardById('trait-de-braise')), true);
    assert.ok(rpgMobaLancerMagie(d, side, 'trait-de-braise', 'sorcier', 'right').ok);
    assert.ok(rpgMobaJouerArme(d, side, 'javelot-du-beffroi', porteur.id).ok);
    assert.equal(rpgMobaPeutPayer(d, side, cardById('cuirasse-de-sel')), true);
    assert.ok(rpgMobaJouerArme(d, side, 'cuirasse-de-sel', porteur.id).ok);
  });
  test(`${side} : un sort contré n'interdit pas les annonces suivantes`, () => {
    const { d, autre } = partie(side);
    d[side].main = ['trait-de-braise', 'trait-de-braise'];
    d[autre].main = ['silence-decume'];
    assert.ok(rpgMobaLancerMagie(d, side, 'trait-de-braise', 'sorcier', 'right', null, { ouvrirReponse: true }).sortEnAttente);
    assert.ok(rpgMobaLancerMagie(d, autre, 'silence-decume').contre);
    assert.ok(rpgMobaLancerMagie(d, side, 'trait-de-braise', 'sorcier', 'right').ok);
  });
  test(`${side} : une fenêtre de fin de tour accepte plusieurs réponses rapides`, () => {
    const { d, autre } = partie(side);
    d[autre].main = ['trait-de-braise', 'trait-de-braise'];
    assert.ok(rpgMobaTerminerTour(d, side).ok);
    assert.ok(rpgMobaLancerMagie(d, autre, 'trait-de-braise', 'sorcier', 'right').ok);
    assert.ok(rpgMobaLancerMagie(d, autre, 'trait-de-braise', 'sorcier', 'right').ok);
    assert.ok(rpgMobaPasserFinDeTour(d, autre).ok);
  });
  test(`${side} : les fenêtres de réponse aux annonces restent opérationnelles`, () => {
    const { d, porteur, autre } = partie(side);
    d[side].main = ['trait-de-braise', 'javelot-du-beffroi'];
    assert.ok(rpgMobaLancerMagie(d, side, 'trait-de-braise', 'sorcier', 'right', null, { ouvrirReponse: true }).sortEnAttente);
    assert.ok(rpgMobaPasserSort(d, autre).ok);
    assert.ok(rpgMobaJouerArme(d, side, 'javelot-du-beffroi', porteur.id, { ouvrirReponse: true }).sortEnAttente);
    assert.ok(rpgMobaPasserSort(d, autre).ok);
    assert.equal(porteur.arme?.carteId, 'javelot-du-beffroi');
  });
}
