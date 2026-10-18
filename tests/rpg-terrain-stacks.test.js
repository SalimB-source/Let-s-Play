import test from 'node:test';
import assert from 'node:assert/strict';
import { groupTerrainStacks } from '../src/games/rpgTerrainStacks.js';
import { rpgNouveauDuel, rpgEngagerTerrain, rpgJouerCreature, rpgFinDeTour } from '../src/games/rpgDuel.js';

const land = (id, carteId = 'desert', tapped = false) => ({ id, carteId, tapped });

test('one pile per card type, in first-seen order, with total/available/spent counts', () => {
  const lands = [land('a', 'desert', true), land('b', 'mer'), land('c'), land('d', 'petra'), land('e')];
  const before = JSON.stringify(lands);
  const groups = groupTerrainStacks(lands);
  assert.deepEqual(groups.map(g => [g.carteId, g.count, g.available, g.tapped]), [
    ['desert', 3, 2, 1], ['mer', 1, 1, 0], ['petra', 1, 1, 0],
  ]);
  assert.equal(groups[0].terrain, lands[2], 'the next available instance represents the pile');
  assert.equal(JSON.stringify(lands), before, 'grouping does not mutate engine state');
  assert.deepEqual(groupTerrainStacks([]), []);
});

test('repeated manual mana production consumes exactly one instance per action', () => {
  const duel = rpgNouveauDuel();
  duel.joueur.terrains = [land('a'), land('b'), land('c')];
  for (let spent = 0; spent < 3; spent++) {
    const [group] = groupTerrainStacks(duel.joueur.terrains);
    assert.equal(group.available, 3 - spent);
    assert.equal(rpgEngagerTerrain(duel, 'joueur', group.terrain.id).ok, true);
    assert.equal(duel.joueur.mana.sable, spent + 1);
  }
  const [empty] = groupTerrainStacks(duel.joueur.terrains);
  assert.equal(empty.count, 3);
  assert.equal(empty.available, 0);
  assert.equal(empty.tapped, 3);
  assert.equal(empty.terrain.tapped, true);
  assert.equal(rpgEngagerTerrain(duel, 'joueur', empty.terrain.id).ok, false);
});

test('automatic payment, snapshot restore and untapping preserve the grouped totals', () => {
  const duel = rpgNouveauDuel();
  duel.joueur.terrains = [land('a'), land('b'), land('c')];
  duel.joueur.main = ['fennec-des-decombres'];
  const snapshot = JSON.stringify(duel);
  assert.equal(rpgJouerCreature(duel, 'joueur', 'fennec-des-decombres').ok, true);
  assert.deepEqual(groupTerrainStacks(duel.joueur.terrains).map(g => [g.count, g.available, g.tapped]), [[3, 1, 2]]);
  assert.equal(groupTerrainStacks(JSON.parse(snapshot).joueur.terrains)[0].available, 3);
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  assert.equal(groupTerrainStacks(duel.joueur.terrains)[0].available, 3);
});

test('flexible terrains remain individual mana sources even inside one pile', () => {
  const duel = rpgNouveauDuel();
  duel.joueur.terrains = [land('a', 'petra'), land('b', 'petra')];
  let group = groupTerrainStacks(duel.joueur.terrains)[0];
  assert.equal(rpgEngagerTerrain(duel, 'joueur', group.terrain.id, 'braise').ok, true);
  group = groupTerrainStacks(duel.joueur.terrains)[0];
  assert.equal(group.terrain.id, 'b');
  assert.equal(rpgEngagerTerrain(duel, 'joueur', group.terrain.id, 'sable').ok, true);
  assert.deepEqual(duel.joueur.mana, { braise: 1, eau: 0, sable: 1, neige: 0, tenebres: 0 });
});
