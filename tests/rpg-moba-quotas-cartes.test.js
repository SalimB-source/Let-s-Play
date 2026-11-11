import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { rpgMobaChoisirMagieIA } from '../src/games/rpgMobaAI.js';
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
  test(`${side} : quotas sort et arme indépendants, refus sans mutation et réinitialisation`, () => {
    const { d, porteur, autre } = partie(side);
    d[side].main = ['trait-de-braise', 'trait-de-braise', 'javelot-du-beffroi', 'cuirasse-de-sel'];
    const avant = JSON.stringify(d);
    assert.equal(rpgMobaJouerArme(d, side, 'javelot-du-beffroi', 'inexistant').ok, false);
    assert.equal(JSON.stringify(d), avant);
    assert.ok(rpgMobaLancerMagie(d, side, 'trait-de-braise', 'sorcier', 'right').ok);
    assert.equal(rpgMobaPeutPayer(d, side, cardById('trait-de-braise')), false);
    const avantSort = JSON.stringify(d);
    assert.equal(rpgMobaLancerMagie(d, side, 'trait-de-braise', 'sorcier', 'right').raison, 'sort-limite');
    assert.equal(JSON.stringify(d), avantSort);
    assert.ok(rpgMobaJouerArme(d, side, 'javelot-du-beffroi', porteur.id).ok);
    assert.equal(rpgMobaPeutPayer(d, side, cardById('cuirasse-de-sel')), false);
    const avantArme = JSON.stringify(d);
    assert.equal(rpgMobaJouerArme(d, side, 'cuirasse-de-sel', porteur.id).raison, 'arme-limite');
    assert.equal(JSON.stringify(d), avantArme);
    rpgFinDeTour(d);
    assert.equal(d.tour, autre);
    assert.equal(rpgMobaPeutPayer(d, side, cardById('trait-de-braise')), true);
    assert.equal(rpgMobaPeutPayer(d, side, cardById('cuirasse-de-sel')), true);
  });
  test(`${side} : un sort contré et un contresort hors tour consomment chacun leur quota`, () => {
    const { d, autre } = partie(side);
    d[side].main = ['trait-de-braise', 'trait-de-braise'];
    d[autre].main = ['silence-decume', 'silence-decume'];
    assert.ok(rpgMobaLancerMagie(d, side, 'trait-de-braise', 'sorcier', 'right', null, { ouvrirReponse: true }).sortEnAttente);
    assert.ok(rpgMobaLancerMagie(d, autre, 'silence-decume').contre);
    assert.equal(d.moba.sortsJoues[side], true);
    assert.equal(d.moba.sortsJoues[autre], true);
    assert.equal(rpgMobaLancerMagie(d, side, 'trait-de-braise', 'sorcier', 'right').raison, 'sort-limite');
    assert.ok(rpgMobaTerminerTour(d, side).ok);
    const avant = JSON.stringify(d);
    assert.equal(rpgMobaLancerMagie(d, autre, 'silence-decume').raison, 'sort-limite');
    assert.equal(JSON.stringify(d), avant);
    assert.ok(rpgMobaPasserFinDeTour(d, autre).ok);
    assert.equal(d.moba.sortsJoues[side], false);
    assert.equal(d.moba.sortsJoues[autre], false);
  });
  test(`${side} : résolution d'un sort ou d'une arme annoncés sans double quota`, () => {
    const { d, porteur, autre } = partie(side);
    d[side].main = ['trait-de-braise', 'javelot-du-beffroi'];
    assert.ok(rpgMobaLancerMagie(d, side, 'trait-de-braise', 'sorcier', 'right', null, { ouvrirReponse: true }).sortEnAttente);
    assert.ok(rpgMobaPasserSort(d, autre).ok);
    assert.ok(rpgMobaJouerArme(d, side, 'javelot-du-beffroi', porteur.id, { ouvrirReponse: true }).sortEnAttente);
    assert.ok(rpgMobaPasserSort(d, autre).ok);
    assert.equal(porteur.arme?.carteId, 'javelot-du-beffroi');
  });
}

for (const side of ['joueur', 'sorcier']) {
  test(`${side} : le Sabre maudit utilise le quota d’arme et non de sort`, () => {
    const { d, porteur } = partie(side);
    d[side].main = ['sabre-maudit', 'javelot-du-beffroi', 'trait-de-braise'];
    assert.ok(rpgMobaLancerMagie(d, side, 'sabre-maudit', porteur.id).ok);
    assert.equal(d.moba.armesJouees[side], true);
    assert.equal(d.moba.sortsJoues[side], false);
    assert.equal(rpgMobaPeutPayer(d, side, cardById('javelot-du-beffroi')), false);
    assert.equal(rpgMobaJouerArme(d, side, 'javelot-du-beffroi', porteur.id).raison, 'arme-limite');
    assert.ok(rpgMobaLancerMagie(d, side, 'trait-de-braise', 'sorcier', 'right').ok);
  });
  test(`${side} : une arme ordinaire bloque aussi le Sabre maudit`, () => {
    const { d, porteur } = partie(side);
    d[side].main = ['sabre-maudit', 'javelot-du-beffroi'];
    assert.ok(rpgMobaJouerArme(d, side, 'javelot-du-beffroi', porteur.id).ok);
    assert.equal(rpgMobaPeutPayer(d, side, cardById('sabre-maudit')), false);
    const avant = JSON.stringify(d);
    assert.equal(rpgMobaLancerMagie(d, side, 'sabre-maudit', porteur.id).raison, 'arme-limite');
    assert.equal(JSON.stringify(d), avant);
  });
  test(`${side} : une arme contrée consomme son quota`, () => {
    const { d, porteur, autre } = partie(side);
    d[side].main = ['javelot-du-beffroi', 'cuirasse-de-sel'];
    d[autre].main = ['contresort-des-abimes'];
    assert.ok(rpgMobaJouerArme(d, side, 'javelot-du-beffroi', porteur.id, { ouvrirReponse: true }).sortEnAttente);
    assert.ok(rpgMobaLancerMagie(d, autre, 'contresort-des-abimes').contre);
    assert.equal(rpgMobaJouerArme(d, side, 'cuirasse-de-sel', porteur.id).raison, 'arme-limite');
    assert.equal(d.moba.sortsJoues[autre], true);
  });
}

for (const side of ['joueur', 'sorcier']) {
  test(`${side} : une première magie rapide hors tour empêche une seconde réponse légale`, () => {
    const { d, autre } = partie(side);
    d[side].main = ['trait-de-braise', 'trait-de-braise'];
    d[autre].main = ['ashigaru-des-braises'];
    assert.ok(rpgMobaTerminerTour(d, side).ok);
    assert.ok(rpgMobaLancerMagie(d, autre, 'trait-de-braise', 'sorcier', 'right').ok === false, 'la carte est dans la main du camp actif');
    d[autre].main.push('trait-de-braise', 'trait-de-braise');
    assert.ok(rpgMobaLancerMagie(d, autre, 'trait-de-braise', 'sorcier', 'right').ok);
    assert.equal(d.moba.sortsJoues[autre], true);
    const avant = JSON.stringify(d);
    assert.equal(rpgMobaLancerMagie(d, autre, 'trait-de-braise', 'sorcier', 'right').raison, 'sort-limite');
    assert.equal(JSON.stringify(d), avant);
    assert.ok(rpgMobaPasserFinDeTour(d, autre).ok);
    assert.equal(d.moba.sortsJoues[autre], false);
  });
}

test('l’IA respecte les deux quotas sans modifier le duel pendant ses simulations', () => {
  const { d, porteur } = partie('sorcier');
  d.sorcier.main = ['trait-de-braise', 'trait-de-braise', 'javelot-du-beffroi', 'cuirasse-de-sel'];
  assert.ok(rpgMobaLancerMagie(d, 'sorcier', 'trait-de-braise', 'sorcier', 'right').ok);
  assert.ok(rpgMobaJouerArme(d, 'sorcier', 'javelot-du-beffroi', porteur.id).ok);
  const avant = JSON.stringify(d);
  assert.equal(rpgMobaChoisirMagieIA(d, 'sorcier'), null);
  assert.equal(JSON.stringify(d), avant);
});
