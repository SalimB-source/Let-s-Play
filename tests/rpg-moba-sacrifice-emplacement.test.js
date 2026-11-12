import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaPasserCreature, rpgMobaPlacementCoherent, rpgMobaLancerMagie } from '../src/games/rpgMobaLocal.js';
import { mobaVoie } from '../src/games/rpgMoba.js';
import { rpgMobaChoisirCreatureIA } from '../src/games/rpgMobaAI.js';

function partie(side) {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(duel, 'joueur', []).ok && rpgMulligan(duel, 'sorcier', []).ok && rpgDemarrerManaEssai(duel).ok);
  if (side === 'sorcier') rpgFinDeTour(duel);
  duel.joueur.main = []; duel.sorcier.main = [];
  return duel;
}
function poser(d, side, id, lane, slot) {
  d[side].main.push(id);
  const result = rpgMobaJouerCreature(d, side, id, lane, slot);
  assert.ok(result.entite, JSON.stringify(result));
  return result.entite;
}
function prochainTour(d) { rpgFinDeTour(d); rpgFinDeTour(d); }

for (const side of ['joueur', 'sorcier']) {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  test(`${side} : une invocation payante refuse une case libre et occupe la place de sa victime`, () => {
    const d = partie(side), victime = poser(d, side, 'ashigaru-des-braises', 'left', 0);
    prochainTour(d); d[side].main = ['anqa-des-braises'];
    const avant = JSON.stringify(d);
    for (const [lane, slot] of [['left', 1], ['right', 0]]) {
      assert.equal(rpgMobaJouerCreature(d, side, 'anqa-des-braises', lane, slot, { sacrificeIds: [victime.id] }).raison, 'emplacement-sacrifice');
      assert.equal(rpgMobaJouerCreature(d, side, 'anqa-des-braises', lane, slot, { sacrificeIds: [victime.id], ouvrirReponse: true }).raison, 'emplacement-sacrifice');
      assert.equal(JSON.stringify(d), avant, 'refus sans paiement ni mutation');
    }
    assert.ok(rpgMobaJouerCreature(d, side, 'anqa-des-braises', 'left', 0, { sacrificeIds: [victime.id], ouvrirReponse: true }).creatureEnAttente);
    assert.equal(mobaVoie(d.moba, 'left').slots[side][0], victime.id, 'victime conservée pendant la réponse');
    const result = rpgMobaPasserCreature(d, enemy);
    assert.ok(result.entite, JSON.stringify(result));
    assert.equal(mobaVoie(d.moba, 'left').slots[side][0], result.entite.id);
    assert.ok(!d[side].creatures.some(e => e.id === victime.id));
    assert.ok(rpgMobaPlacementCoherent(d));
  });
  for (const lane of ['left', 'right']) test(`${side} : deux sacrifices permettent de choisir la case ${lane}`, () => {
    const d = partie(side), a = poser(d, side, 'ashigaru-des-braises', 'left', 0);
    prochainTour(d); const b = poser(d, side, 'ashigaru-des-braises', 'right', 0);
    prochainTour(d); d[side].main = ['orochi'];
    const ids = [a.id, b.id], avant = JSON.stringify(d);
    assert.equal(rpgMobaJouerCreature(d, side, 'orochi', 'center', 0, { sacrificeIds: ids }).raison, 'emplacement-sacrifice');
    assert.equal(JSON.stringify(d), avant);
    assert.ok(rpgMobaJouerCreature(d, side, 'orochi', lane, 0, { sacrificeIds: ids, ouvrirReponse: true }).creatureEnAttente);
    const result = rpgMobaPasserCreature(d, enemy); assert.ok(result.entite, JSON.stringify(result));
    assert.equal(mobaVoie(d.moba, lane).slots[side][0], result.entite.id);
    assert.equal(mobaVoie(d.moba, lane === 'left' ? 'right' : 'left').slots[side][0], null);
    assert.ok(rpgMobaPlacementCoherent(d));
  });
  test(`${side} : l'IA remplace sa victime à sa position physique`, () => {
    const d = partie(side), victime = poser(d, side, 'ashigaru-des-braises', 'right', 1);
    victime.atk = 0; victime.nePeutPasAttaquer = true; prochainTour(d); d[side].main = ['anqa-des-braises'];
    const avant = JSON.stringify(d); const choix = rpgMobaChoisirCreatureIA(d, side);
    assert.equal(choix?.id, 'anqa-des-braises'); assert.deepEqual(choix.sacrificeIds, [victime.id]);
    assert.equal(choix.lane, 'right'); assert.equal(choix.slot, 1); assert.equal(JSON.stringify(d), avant);
    const result = rpgMobaJouerCreature(d, side, choix.id, choix.lane, choix.slot, { sacrificeIds: choix.sacrificeIds });
    assert.ok(result.entite, JSON.stringify(result)); assert.equal(mobaVoie(d.moba, 'right').slots[side][1], result.entite.id);
  });
}

for (const side of ['joueur', 'sorcier']) {
  const enemy = side === 'joueur' ? 'sorcier' : 'joueur';
  test(`${side} : la disparition de la victime en réponse dissipe l'invocation`, () => {
    const d = partie(side), victime = poser(d, side, 'ashigaru-des-braises', 'left', 0);
    prochainTour(d); d[side].main = ['anqa-des-braises']; d[enemy].main = ['frappe-iaijutsu'];
    assert.ok(rpgMobaJouerCreature(d, side, 'anqa-des-braises', 'left', 0, { sacrificeIds: [victime.id], ouvrirReponse: true }).creatureEnAttente);
    const riposte = rpgMobaLancerMagie(d, enemy, 'frappe-iaijutsu', victime.id);
    assert.ok(riposte.ok, JSON.stringify(riposte)); assert.ok(!d[side].creatures.some(e => e.id === victime.id));
    const result = rpgMobaPasserCreature(d, enemy);
    assert.ok(result.ok && result.dissipe, JSON.stringify(result));
    assert.equal(mobaVoie(d.moba, 'left').slots[side][0], null);
    assert.ok(d[side].cimetiere.includes('anqa-des-braises')); assert.ok(rpgMobaPlacementCoherent(d));
  });
}
