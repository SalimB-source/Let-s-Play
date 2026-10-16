import test from 'node:test';
import assert from 'node:assert/strict';
import { armesPortees, groupCartesMain, groupEntitesParCarte } from '../src/games/rpgCardStacks.js';

const creature = (id, carteId) => ({ id, carteId, name: carteId, atk: 1, pv: 1 });

test('hand copies pile up in first-seen order and keep their real indices', () => {
  const main = ['desert', 'chien-du-guet', 'desert', 'fennec-des-decombres', 'desert'];
  const before = JSON.stringify(main);
  const piles = groupCartesMain(main);
  assert.deepEqual(piles.map((pile) => [pile.carteId, pile.indices]), [
    ['desert', [0, 2, 4]],
    ['chien-du-guet', [1]],
    ['fennec-des-decombres', [3]],
  ]);
  assert.equal(piles[0].indices[0], 0, 'the representative index is the first copy');
  assert.equal(piles.reduce((total, pile) => total + pile.indices.length, 0), main.length,
    'every copy stays counted once');
  assert.equal(JSON.stringify(main), before, 'grouping does not mutate the hand');
});

test('a hand without duplicates keeps one slot per card', () => {
  const piles = groupCartesMain(['desert', 'chien-du-guet', 'rapport-du-greffier']);
  assert.deepEqual(piles.map((pile) => pile.indices.length), [1, 1, 1]);
  assert.deepEqual(groupCartesMain([]), []);
  assert.deepEqual(groupCartesMain(), []);
});

test('board copies pile up per card, per camp, without mixing sides', () => {
  const joueur = [creature('a', 'chien-du-guet'), creature('b', 'fennec-des-decombres'), creature('c', 'chien-du-guet')];
  const before = JSON.stringify(joueur);
  const piles = groupEntitesParCarte(joueur);
  assert.deepEqual(piles.map((pile) => [pile.carteId, pile.entites.map((entite) => entite.id)]), [
    ['chien-du-guet', ['a', 'c']],
    ['fennec-des-decombres', ['b']],
  ]);
  assert.equal(piles[0].entites[0], joueur[0], 'the head card represents the pile');
  assert.equal(JSON.stringify(joueur), before, 'grouping does not mutate engine state');
  const sorcier = groupEntitesParCarte([creature('x', 'chien-du-guet')]);
  assert.deepEqual(sorcier.map((pile) => pile.entites.map((entite) => entite.id)), [['x']],
    'the same card on the other side stays a separate pile');
  assert.deepEqual(groupEntitesParCarte([]), []);
  assert.deepEqual(groupEntitesParCarte(), []);
});

test('an equipped creature is a pile of its own, never merged with identical bodies', () => {
  const armee = { ...creature('armee', 'chien-du-guet'), arme: { carteId: 'takouba-des-pistes' } };
  const nue = creature('nue', 'chien-du-guet');
  const autreArmee = { ...creature('autre', 'chien-du-guet'), arme: { carteId: 'lance-de-givre' } };
  const piles = groupEntitesParCarte([nue, armee, creature('nue-2', 'chien-du-guet'), autreArmee]);
  assert.deepEqual(piles.map((pile) => pile.entites.map((entite) => entite.id)), [
    ['nue', 'nue-2'],
    ['armee'],
    ['autre'],
  ], 'the bare copies pile up together, each armed copy stands alone');
  assert.equal(piles[1].carteId, 'chien-du-guet', 'the solo pile still names its card');
});

test('two identical armed creatures keep two separate piles', () => {
  const avec = (id) => ({ ...creature(id, 'fennec-des-decombres'), arme: { carteId: 'baton-des-citernes' } });
  const piles = groupEntitesParCarte([avec('a'), avec('b')]);
  assert.deepEqual(piles.map((pile) => pile.entites.map((entite) => entite.id)), [['a'], ['b']]);
});

test('armesPortees lists the weapon of the prototype, then the magic weapons', () => {
  assert.deepEqual(armesPortees(creature('nue', 'chien-du-guet')), []);
  assert.deepEqual(armesPortees(undefined), []);
  assert.deepEqual(armesPortees({ ...creature('a', 'chien-du-guet'), arme: { carteId: 'lance-de-givre' } }), ['lance-de-givre']);
  assert.deepEqual(armesPortees({ ...creature('b', 'chien-du-guet'), armes: ['sabre-maudit'] }), ['sabre-maudit']);
  assert.deepEqual(armesPortees({ ...creature('c', 'chien-du-guet'), arme: { carteId: 'takouba-des-pistes' }, armes: ['sabre-maudit'] }),
    ['takouba-des-pistes', 'sabre-maudit']);
});


test('engaged and available copies split, then regroup when untapped', () => {
  const a = creature('a', 'chien-du-guet');
  const b = { ...creature('b', 'chien-du-guet'), attaquee: true };
  const c = { ...creature('c', 'chien-du-guet'), attaquee: false };
  const d = { ...creature('d', 'chien-du-guet'), attaquee: true };
  const entities = [a, b, c, d];
  const before = JSON.stringify(entities);
  assert.deepEqual(groupEntitesParCarte(entities).map(p => p.entites.map(e => e.id)),
    [['a', 'c'], ['b', 'd']]);
  assert.equal(JSON.stringify(entities), before);
  assert.deepEqual(groupEntitesParCarte([b, a]).map(p => p.entites.map(e => e.id)), [['b'], ['a']]);
  assert.equal(groupEntitesParCarte(entities.map(e => ({ ...e, attaquee: false }))).length, 1);
});
