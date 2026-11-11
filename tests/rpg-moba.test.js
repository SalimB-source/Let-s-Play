import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mobaNouveau, mobaVoie, mobaEmplacementsLibres, mobaPlacer,
  mobaRetirer, mobaValiderBlocages, mobaInfliger, mobaSoigner, mobaPayerPrix,
} from '../src/games/rpgMoba.js';

const place = (state, side, lane, slot, id) => assert.equal(mobaPlacer(state, side, lane, slot, id).ok, true);

test('three lanes have six health values and five slots per side', () => {
  const state = mobaNouveau();
  assert.deepEqual(state.lanes.map((l) => l.id), ['left', 'center', 'right']);
  for (const lane of state.lanes) {
    assert.deepEqual(lane.hp, { joueur: lane.id === 'center' ? 15 : 20, sorcier: lane.id === 'center' ? 15 : 20 });
    assert.equal(lane.active, true);
    assert.equal(lane.conqueredBy, null);
  }
  for (const side of ['joueur', 'sorcier']) {
    assert.deepEqual(state.lanes.map((l) => l.slots[side].length), [2, 1, 2]);
  }
  assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
});

test('slots are explicit, unique and permanent for an entity', () => {
  const state = mobaNouveau();
  place(state, 'joueur', 'left', 0, 'a');
  place(state, 'joueur', 'left', 1, 'b');
  assert.deepEqual(mobaEmplacementsLibres(state, 'joueur', 'left'), []);
  assert.equal(mobaPlacer(state, 'joueur', 'left', 2, 'c').ok, false);
  assert.equal(mobaPlacer(state, 'joueur', 'left', 1, 'c').ok, false);
  assert.equal(mobaPlacer(state, 'joueur', 'center', 0, 'a').ok, false);
  assert.equal(mobaRetirer(state, 'joueur', 'a').ok, true);
  assert.equal(mobaPlacer(state, 'joueur', 'center', 0, 'a').raison, 'affectation-permanente');
  assert.equal(mobaPlacer(state, 'sorcier', 'left', 0, 'a').raison, 'affectation-permanente');
  place(state, 'joueur', 'left', 0, 'a');
});

test('blocking isolation rejects cross-lane, duplicate and unknown entities without mutation', () => {
  const state = mobaNouveau();
  place(state, 'joueur', 'center', 0, 'attacker');
  place(state, 'sorcier', 'left', 0, 'wrong');
  place(state, 'sorcier', 'center', 0, 'blocker');
  const before = JSON.stringify(state);
  assert.equal(mobaValiderBlocages(state, 'joueur', ['attacker'], { attacker: ['wrong'] }).ok, false);
  assert.equal(mobaValiderBlocages(state, 'joueur', ['attacker'], { attacker: ['blocker', 'blocker'] }).ok, false);
  assert.equal(mobaValiderBlocages(state, 'joueur', ['missing'], {}).ok, false);
  assert.equal(mobaValiderBlocages(state, 'joueur', ['attacker'], { attacker: ['blocker'] }).ok, true);
  assert.equal(JSON.stringify(state), before);
});

test('resolved damage is clamped and conquest clears both sides exactly once', () => {
  const state = mobaNouveau();
  place(state, 'joueur', 'left', 0, 'a');
  place(state, 'sorcier', 'left', 1, 'b');
  assert.equal(mobaInfliger(state, 'joueur', 'left', 4).damage, 4);
  assert.equal(mobaVoie(state, 'left').hp.sorcier, 16);
  const result = mobaInfliger(state, 'joueur', 'left', 100);
  assert.deepEqual(result.removed, { joueur: ['a'], sorcier: ['b'] });
  assert.equal(result.damage, 16);
  assert.equal(result.conquered, true);
  assert.equal(mobaVoie(state, 'left').hp.sorcier, 0);
  assert.equal(mobaVoie(state, 'left').hp.joueur, 20);
  assert.equal(mobaVoie(state, 'left').active, false);
  assert.equal(mobaVoie(state, 'left').conqueredBy, 'joueur');
  assert.deepEqual(mobaVoie(state, 'left').slots, { joueur: [null, null], sorcier: [null, null] });
  const before = JSON.stringify(state);
  assert.equal(mobaInfliger(state, 'joueur', 'left', 1).ok, false);
  assert.equal(mobaSoigner(state, 'sorcier', 'left', 9).ok, false);
  assert.equal(mobaPlacer(state, 'joueur', 'left', 0, 'a').ok, false);
  assert.equal(mobaValiderBlocages(state, 'joueur', ['a'], {}).ok, false);
  assert.equal(JSON.stringify(state), before);
});

test('two conquests win immediately and freeze lane actions', () => {
  const state = mobaNouveau();
  mobaInfliger(state, 'sorcier', 'right', 20);
  assert.equal(state.winner, null);
  const result = mobaInfliger(state, 'sorcier', 'center', 15);
  assert.equal(result.winner, 'sorcier');
  assert.equal(state.winner, 'sorcier');
  const before = JSON.stringify(state);
  assert.equal(mobaInfliger(state, 'joueur', 'left', 10).ok, false);
  assert.equal(mobaSoigner(state, 'joueur', 'left', 10).ok, false);
  assert.equal(mobaPlacer(state, 'joueur', 'left', 0, 'late').ok, false);
  assert.equal(JSON.stringify(state), before);
});

test('healing caps at the lane maximum, invalid amounts and inactive lanes are rejected', () => {
  const state = mobaNouveau();
  mobaInfliger(state, 'sorcier', 'left', 4);
  assert.equal(mobaSoigner(state, 'joueur', 'left', 99).healing, 4);
  for (const amount of [-1, NaN, Infinity, '4']) {
    assert.equal(mobaInfliger(state, 'sorcier', 'center', amount).ok, false);
    assert.equal(mobaSoigner(state, 'joueur', 'center', amount).ok, false);
  }
  assert.equal(mobaVoie(state, 'left').hp.joueur, 20);
});

test('a caller iterating active lanes can apply a global event without reopening conquered lanes', () => {
  const state = mobaNouveau();
  mobaInfliger(state, 'joueur', 'center', 15);
  for (const lane of state.lanes.filter((item) => item.active)) mobaInfliger(state, 'sorcier', lane.id, 2);
  assert.deepEqual(state.lanes.map((l) => l.hp.joueur), [18, 0, 18]);
  assert.deepEqual(state.lanes.map((l) => l.hp.sorcier), [20, 0, 20]);
});

test('a life cost can only be paid by an active friendly lane above the cost', () => {
  const state = mobaNouveau();
  mobaInfliger(state, 'sorcier', 'left', 18);
  const before = JSON.stringify(state);
  assert.equal(mobaPayerPrix(state, 'joueur', 'left', 2).raison, 'prix');
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(mobaPayerPrix(state, 'joueur', 'center', 2), { ok: true, paid: 2 });
  assert.equal(mobaVoie(state, 'center').hp.joueur, 13);
  assert.equal(mobaVoie(state, 'center').hp.sorcier, 15);
  mobaInfliger(state, 'sorcier', 'right', 20);
  assert.equal(mobaPayerPrix(state, 'joueur', 'right', 2).raison, 'voie-inactive');
});
