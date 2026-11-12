import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { arriveeACibleLegale, rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaResoudreArrivee, rpgMobaCiblesSite, rpgMobaResoudreSite } from '../src/games/rpgMobaLocal.js';

function partie() {
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(duel, 'joueur', []).ok && rpgMulligan(duel, 'sorcier', []).ok);
  assert.ok(rpgDemarrerManaEssai(duel).ok);
  for (const side of ['joueur', 'sorcier']) Object.assign(duel[side].mana, { sable: 30, braise: 30, eau: 30, neige: 30, tenebres: 30 });
  return duel;
}

for (const side of ['joueur', 'sorcier']) {
  test(`${side} : les soins et boucliers à cible alliée traversent les voies`, () => {
    const d = partie();
    if (side === 'sorcier') rpgFinDeTour(d);
    d[side].main = ['ashigaru-des-braises', 'volva-soigneuse', 'guerrier-au-bouclier-rond'];
    const cible = rpgMobaJouerCreature(d, side, 'ashigaru-des-braises', 'left', 0).entite;
    assert.ok(cible);
    cible.pv = 1; cible.def = 1;
    for (const [id, lane, slot] of [['volva-soigneuse', 'right', 0], ['guerrier-au-bouclier-rond', 'center', 0]]) {
      // Fixture : préparer plusieurs arrivées sans attendre les tours de l'IA.
      d.moba.creaturesJouees[side] = false;
      const pose = rpgMobaJouerCreature(d, side, id, lane, slot);
      assert.equal(pose.arriveeEnAttente, true, JSON.stringify(pose));
      assert.equal(arriveeACibleLegale(d, side, cardById(id), pose.entite.id), true);
      assert.equal(rpgMobaResoudreArrivee(d, side, cible.id).ok, true);
    }
    assert.equal(cible.pv, cible.pvMax);
    assert.equal(cible.bouclier, 1);
    assert.equal(rpgMobaResoudreArrivee(d, side, 'inconnue').ok, false);
  });
}

test('une arrivée hostile ne gagne pas la portée inter-voies des soutiens alliés', () => {
  const d = partie();
  rpgFinDeTour(d);
  d.sorcier.main = ['ashigaru-des-braises'];
  const ennemi = rpgMobaJouerCreature(d, 'sorcier', 'ashigaru-des-braises', 'left', 0).entite;
  assert.ok(ennemi);
  d.moba.creaturesJouees.sorcier = false;
  d.sorcier.main.push('ashigaru-des-braises');
  assert.ok(rpgMobaJouerCreature(d, 'sorcier', 'ashigaru-des-braises', 'right', 0).entite);
  rpgFinDeTour(d);
  d.joueur.main = ['vipere-de-verre'];
  const hostile = rpgMobaJouerCreature(d, 'joueur', 'vipere-de-verre', 'right', 0);
  assert.equal(hostile.arriveeEnAttente, true, JSON.stringify(hostile));
  assert.equal(arriveeACibleLegale(d, 'joueur', cardById('vipere-de-verre'), hostile.entite.id), true);
  assert.equal(rpgMobaResoudreArrivee(d, 'joueur', ennemi.id).raison, 'cible');
});

test('la Source de Bimini propose une créature alliée sur un autre flanc après son décompte', () => {
  const d = partie();
  d.joueur.main = ['ashigaru-des-braises', 'source-de-bimini'];
  const cible = rpgMobaJouerCreature(d, 'joueur', 'ashigaru-des-braises', 'right', 0).entite;
  const source = rpgMobaJouerCreature(d, 'joueur', 'source-de-bimini', 'left', 0).entite;
  assert.ok(cible && source);
  source.heures.restants = 1;
  rpgFinDeTour(d); rpgFinDeTour(d);
  assert.equal(d.siteEnAttente?.entiteId, source.id);
  assert.deepEqual(rpgMobaCiblesSite(d, 'joueur'), [cible.id]);
  assert.equal(rpgMobaResoudreSite(d, 'joueur', cible.id).ok, true);
  assert.equal(cible.bouclier, 1);
});
