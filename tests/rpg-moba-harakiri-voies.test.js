import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan, rpgReglerHasard } from '../src/games/rpgDuel.js';
import { mobaInfliger, mobaVoie } from '../src/games/rpgMoba.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaLancerMagie, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';
import { cardById } from '../src/games/rpgCards.js';
import { rpgMobaNotesCarte } from '../src/games/rpgMobaPresentation.js';

function partie() {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => 0.5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  return d;
}
function tour(d, side) { if (d.tour !== side) rpgFinDeTour(d); assert.equal(d.tour, side); }
function poser(d, side, id, lane, slot = 0) {
  tour(d, side);
  Object.assign(d[side].mana, { sable: 30, braise: 30, tenebres: 30 });
  d[side].main = [id];
  const r = rpgMobaJouerCreature(d, side, id, lane, slot);
  assert.ok(r.ok, JSON.stringify(r));
  return r.entite;
}
function tuer(d, side, source) {
  tour(d, side); d[side].mana.tenebres = 30; d[side].main = ['effacement-des-faibles'];
  const r = rpgMobaLancerMagie(d, side, 'effacement-des-faibles', source.id);
  assert.ok(r.ok, JSON.stringify(r));
  assert.ok(rpgMobaPlacementCoherent(d));
  return r;
}

for (const side of ['joueur', 'sorcier']) {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  for (const lane of ['left', 'center', 'right']) {
    const autre = lane === 'right' ? 'left' : 'right';
    test(`${side}, ${lane} : une créature sur une autre voie ne détourne pas Harakiri`, () => {
      const d = partie();
      const ailleurs = poser(d, enemy, 'gardienne-des-portes-de-sable', autre);
      const source = poser(d, side, 'hatamoto-des-cendres', lane);
      const hp = mobaVoie(d.moba, lane).hp[enemy], pv = ailleurs.pv;
      tuer(d, side, source);
      assert.equal(ailleurs.pv, pv);
      assert.equal(mobaVoie(d.moba, lane).hp[enemy], hp - 1);
    });
    test(`${side}, ${lane} : Harakiri choisit uniquement une cible dans sa voie`, () => {
      const d = partie();
      const ailleurs = poser(d, enemy, 'gardienne-des-portes-de-sable', autre);
      const source = poser(d, side, 'hatamoto-des-cendres', lane);
      const cible = poser(d, enemy, 'gardienne-des-portes-de-sable', lane);
      const pv = cible.pv, pvAutre = ailleurs.pv, hp = mobaVoie(d.moba, lane).hp[enemy];
      rpgReglerHasard(d, () => 0);
      tuer(d, side, source);
      assert.equal(cible.pv, pv - 1); assert.equal(ailleurs.pv, pvAutre);
      assert.equal(mobaVoie(d.moba, lane).hp[enemy], hp);
    });
  }
  test(`${side} : le site dans la voie n'est pas une cible`, () => {
    const d = partie();
    const site = poser(d, enemy, 'gardienne-des-portes-de-sable', 'left');
    site.carteId = 'source-de-bimini';
    const source = poser(d, side, 'hatamoto-des-cendres', 'left');
    const hp = mobaVoie(d.moba, 'left').hp[enemy], pv = site.pv;
    tuer(d, side, source);
    assert.equal(site.pv, pv); assert.equal(mobaVoie(d.moba, 'left').hp[enemy], hp - 1);
  });
  test(`${side} : la créature centrale conquise partage les deux voies actives`, () => {
    const d = partie();
    const gauche = poser(d, enemy, 'gardienne-des-portes-de-sable', 'left');
    tour(d, side); tour(d, enemy);
    const droite = poser(d, enemy, 'gardienne-des-portes-de-sable', 'right');
    tour(d, side); assert.ok(mobaInfliger(d.moba, side, 'center', 15).conquered);
    const source = poser(d, side, 'hatamoto-des-cendres', 'center');
    const avant = [gauche.pv, droite.pv];
    rpgReglerHasard(d, () => 0.999);
    tuer(d, side, source);
    assert.deepEqual([gauche.pv, droite.pv], [avant[0], avant[1] - 1]);
  });
  test(`${side} : sans cible le centre conquis frappe les deux voies actives`, () => {
    const d = partie(); tour(d, side); assert.ok(mobaInfliger(d.moba, side, 'center', 15).conquered);
    const source = poser(d, side, 'hatamoto-des-cendres', 'center');
    const avant = ['left', 'right'].map((lane) => mobaVoie(d.moba, lane).hp[enemy]);
    tuer(d, side, source);
    assert.deepEqual(['left', 'right'].map((lane) => mobaVoie(d.moba, lane).hp[enemy]), avant.map((hp) => hp - 1));
  });
  test(`${side} : une chaîne de Harakiri reste dans la voie de chaque source`, () => {
    const d = partie();
    const cible = poser(d, enemy, 'hatamoto-des-cendres', 'left');
    cible.pv = 1; cible.def = 1;
    const source = poser(d, side, 'hatamoto-des-cendres', 'left');
    const ailleurs = poser(d, enemy, 'gardienne-des-portes-de-sable', 'right');
    const pv = ailleurs.pv, hp = mobaVoie(d.moba, 'left').hp[side];
    tuer(d, side, source);
    assert.equal(ailleurs.pv, pv);
    assert.equal(mobaVoie(d.moba, 'left').hp[side], hp - 1);
    assert.equal(d.log.filter((ligne) => ligne.startsWith('Harakiri')).length, 2);
  });
  for (const flank of ['left', 'right']) test(`${side} : une cible au centre conquis partage le flanc ${flank}`, () => {
    const d = partie(); tour(d, enemy); assert.ok(mobaInfliger(d.moba, enemy, 'center', 15).conquered);
    const cible = poser(d, enemy, 'gardienne-des-portes-de-sable', 'center');
    const source = poser(d, side, 'hatamoto-des-cendres', flank);
    const pv = cible.pv, hp = mobaVoie(d.moba, flank).hp[enemy];
    tuer(d, side, source);
    assert.equal(cible.pv, pv - 1); assert.equal(mobaVoie(d.moba, flank).hp[enemy], hp);
  });
}

test('la fiche MOBA explique la règle sans changer la carte classique', () => {
  const carte = cardById('hatamoto-des-cendres');
  assert.match(rpgMobaNotesCarte(carte).join(' '), /créature adverse au hasard dans sa voie/);
  assert.doesNotMatch(carte.text, /dans sa voie/);
});
