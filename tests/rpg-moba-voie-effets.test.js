import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgMulligan, rpgDemarrerManaEssai, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaLancerMagie, rpgMobaPasserSort, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';

function partie() {
  const deck = Array(12).fill('ashigaru-des-braises');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => 0.5 });
  for (const lane of duel.moba.lanes) if (lane.id !== 'center') lane.hp = { joueur: 10, sorcier: 10 };
  assert.equal(rpgMulligan(duel, 'joueur', []).ok, true);
  assert.equal(rpgMulligan(duel, 'sorcier', []).ok, true);
  assert.equal(rpgDemarrerManaEssai(duel).ok, true);
  duel.joueur.mana.braise = 20;
  duel.joueur.mana.neige = 20;
  duel.joueur.mana.sable = 20;
  return duel;
}

function poser(duel, cote, lane, slot = 0) {
  const result = rpgMobaJouerCreature(duel, cote, 'ashigaru-des-braises', lane, slot);
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.entite;
}

for (const attendre of [false, true]) {
  test(`destruction de zone : seule la voie choisie est touchée (${attendre ? 'réponse' : 'immédiat'})`, () => {
    const duel = partie();
    const left = poser(duel, 'joueur', 'left');
    const right = poser(duel, 'joueur', 'right');
    duel.joueur.main.push('grand-hiver');
    assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver').raison, 'cible');
    const result = rpgMobaLancerMagie(duel, 'joueur', 'grand-hiver', null, 'left', null, { ouvrirReponse: attendre });
    assert.equal(result.ok, true, JSON.stringify(result));
    if (attendre) {
      assert.equal(duel.mobaSortEnAttente.laneId, 'left');
      assert.equal(rpgMobaPasserSort(duel, 'sorcier').ok, true);
    }
    assert.equal(duel.joueur.creatures.some((e) => e.id === left.id), false);
    assert.equal(duel.joueur.creatures.some((e) => e.id === right.id), true);
    assert.equal(rpgMobaPlacementCoherent(duel), true);
  });
}

test('dégâts de zone ne touchent pas les autres voies', () => {
  const duel = partie();
  const left = poser(duel, 'joueur', 'left');
  const right = poser(duel, 'joueur', 'right');
  duel.joueur.main.push('tempete-de-foudre-et-de-givre');
  const result = rpgMobaLancerMagie(duel, 'joueur', 'tempete-de-foudre-et-de-givre', null, 'left');
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(duel.joueur.creatures.some((e) => e.id === left.id), false);
  assert.equal(duel.joueur.creatures.some((e) => e.id === right.id), true);
});

test('les deux cibles d’un sort doivent être dans la même voie', () => {
  const duel = partie();
  const left = poser(duel, 'joueur', 'left');
  const right = poser(duel, 'joueur', 'right');
  rpgFinDeTour(duel);
  duel.sorcier.mana.braise = 20;
  const enemy = poser(duel, 'sorcier', 'left');
  rpgFinDeTour(duel);
  for (const element of ['b raise', 'neige', 'sable']) duel.joueur.mana[element.replace(' ', '')] = 20;
  duel.joueur.main.push('feux-de-kitsune', 'defi-du-jarl');
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'feux-de-kitsune', enemy.id, null, null, { cibleSecondaireId: right.id }).raison, 'cible');
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'defi-du-jarl', enemy.id, null, null, { cibleSecondaireId: right.id }).raison, 'cible');
  const valid = rpgMobaLancerMagie(duel, 'joueur', 'defi-du-jarl', enemy.id, null, null, { cibleSecondaireId: left.id });
  assert.equal(valid.ok, true, JSON.stringify(valid));
});

test('un renfort ne donne son bonus qu’aux créatures de la voie choisie', () => {
  const duel = partie();
  const left = poser(duel, 'joueur', 'left');
  const right = poser(duel, 'joueur', 'right');
  duel.joueur.main.push('mur-de-boucliers');
  const before = [left.atk, right.atk];
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'mur-de-boucliers', null, 'right').ok, true);
  assert.equal(left.atk, before[0]);
  assert.equal(right.atk, before[1] + 2);
});

test('les soins des créatures restent dans la voie soignée', () => {
  const duel = partie();
  const left = poser(duel, 'joueur', 'left');
  const right = poser(duel, 'joueur', 'right');
  left.pv -= 1;
  right.pv -= 1;
  duel.joueur.main.push('festin-des-vaillants');
  assert.equal(rpgMobaLancerMagie(duel, 'joueur', 'festin-des-vaillants', null, 'left').ok, true);
  assert.equal(left.pv, left.pvMax);
  assert.equal(right.pv, right.pvMax - 1);
});

test('un sort à prix PV sépare la voie du paiement de la voie touchée', () => {
  const duel = partie();
  const left = poser(duel, 'joueur', 'left');
  const right = poser(duel, 'joueur', 'right');
  duel.joueur.mana.tenebres = 20;
  duel.joueur.main.push('neige-noire');
  const priceBefore = duel.moba.lanes.find((l) => l.id === 'right').hp.joueur;
  const result = rpgMobaLancerMagie(duel, 'joueur', 'neige-noire', null, 'left', 'right');
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(duel.moba.lanes.find((l) => l.id === 'right').hp.joueur, priceBefore - 3);
  assert.equal(duel.joueur.creatures.some((e) => e.id === right.id), true);
  assert.equal(duel.joueur.creatures.some((e) => e.id === left.id), false);
});

test('la Compagnie d’une créature ne compte que ses alliés de sa voie', () => {
  const duel = partie();
  duel.joueur.main.push('eirik-du-premier-serment', 'viking-des-neiges', 'viking-des-neiges');
  const result = rpgMobaJouerCreature(duel, 'joueur', 'eirik-du-premier-serment', 'left', 0);
  assert.equal(result.ok, true, JSON.stringify(result));
  const source = result.entite;
  const baseAtk = source.atk;
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'viking-des-neiges', 'right', 0).ok, true);
  assert.equal(source.atk, baseAtk);
  assert.equal(rpgMobaJouerCreature(duel, 'joueur', 'viking-des-neiges', 'left', 1).ok, true);
  assert.equal(source.atk, baseAtk + 1);
});
