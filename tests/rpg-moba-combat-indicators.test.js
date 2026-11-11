import test from 'node:test';
import assert from 'node:assert/strict';
import { mobaNouveau, mobaPlacer } from '../src/games/rpgMoba.js';
import { rpgMobaArrowTarget, rpgMobaCombatIndicators } from '../src/games/rpgMobaCombatIndicators.js';
import { JSDOM } from 'jsdom';

function fixture() {
  const duel = { moba: mobaNouveau(), joueur: { creatures: [] }, sorcier: { creatures: [] } };
  const put = (side, lane, slot, id, extra = {}) => {
    const entity = { id, name: id, mobaLane: lane, ...extra };
    assert.equal(mobaPlacer(duel.moba, side, lane, slot, id).ok, true);
    duel[side].creatures.push(entity);
    return entity;
  };
  return { duel, put };
}

test('direct attack arrows go to the defending HP of each individual lane, in both directions', () => {
  const { duel, put } = fixture();
  put('joueur', 'left', 0, 'gauche'); put('joueur', 'center', 0, 'centre'); put('joueur', 'right', 0, 'droite');
  put('sorcier', 'right', 0, 'ia');
  const before = JSON.stringify(duel);
  const human = rpgMobaCombatIndicators(duel, 'joueur', ['gauche', 'centre', 'droite'], {}, {}, { individuel: true });
  assert.deepEqual(human.attackArrows, { '@moba:left:sorcier': ['gauche'], '@moba:center:sorcier': ['centre'], '@moba:right:sorcier': ['droite'] });
  assert.match(human.descriptions[0], /gauche attaque les PV de voie gauche de l’IA/);
  assert.deepEqual(rpgMobaCombatIndicators(duel, 'sorcier', ['ia'], {}, {}, { individuel: true }).attackArrows, { '@moba:right:joueur': ['ia'] });
  assert.equal(JSON.stringify(duel), before, 'presentation never mutates the duel');
});

test('les flèches individuelles montrent la cible choisie sans rediriger une cible perdue', () => {
  const { duel, put } = fixture();
  put('joueur', 'left', 0, 'rapide', { coupRapide: true });
  put('sorcier', 'left', 0, 'cible'); put('sorcier', 'right', 0, 'ailleurs');
  assert.deepEqual(rpgMobaCombatIndicators(duel, 'joueur', ['rapide'], {}, {}, { individuel: true }).attackArrows, { '@moba:left:sorcier': ['rapide'] });
  assert.deepEqual(rpgMobaCombatIndicators(duel, 'joueur', ['rapide'], { rapide: 'ailleurs' }, {}, { individuel: true }).attackArrows, { ailleurs: ['rapide'] });
  const selected = rpgMobaCombatIndicators(duel, 'joueur', ['rapide'], { rapide: 'cible' }, {}, { individuel: true });
  assert.deepEqual(selected.attackArrows, { cible: ['rapide'] });
  assert.match(selected.descriptions[0], /rapide vise cible/);
  duel.moba.lanes[0].slots.sorcier[0] = null;
  duel.sorcier.creatures = duel.sorcier.creatures.filter((e) => e.id !== 'cible');
  assert.deepEqual(rpgMobaCombatIndicators(duel, 'joueur', ['rapide'], { rapide: 'cible' }, {}, { individuel: true }).attackArrows, {});
  assert.deepEqual(rpgMobaCombatIndicators(duel, 'joueur', ['rapide'], {}, {}, { individuel: true }).attackArrows, { '@moba:left:sorcier': ['rapide'] }, 'enemy in another lane does not prevent a direct attack');
});

test('block arrows replace direct arrows, include several blockers and ignore stale or wrong-lane entities', () => {
  const { duel, put } = fixture();
  put('sorcier', 'left', 0, 'attaquant'); put('joueur', 'left', 0, 'un'); put('joueur', 'left', 1, 'deux'); put('joueur', 'right', 0, 'autre');
  const result = rpgMobaCombatIndicators(duel, 'sorcier', ['attaquant'], {}, { attaquant: ['un', 'deux', 'autre', 'absent'] });
  assert.deepEqual(result.attackArrows, {});
  assert.deepEqual(result.blockArrows, { attaquant: ['un', 'deux'] });
  assert.deepEqual(result.descriptions, ['un bloque attaquant, voie gauche', 'deux bloque attaquant, voie gauche']);
  duel.moba.lanes[0].active = false;
  assert.deepEqual(rpgMobaCombatIndicators(duel, 'sorcier', ['attaquant'], {}, { attaquant: ['un'] }).blockArrows, {});
  duel.moba.lanes[0].active = true; duel.moba.winner = 'joueur';
  assert.deepEqual(rpgMobaCombatIndicators(duel, 'sorcier', ['attaquant']).attackArrows, {});
});

test('lane resolver finds the correct HP element without interpreting IDs as CSS selectors', () => {
  const dom = new JSDOM('<div id="table"><div data-moba-lane-hp="@moba:left:sorcier"></div><div data-moba-lane-hp="@moba:right:joueur"></div></div>');
  const table = dom.window.document.querySelector('#table');
  assert.equal(rpgMobaArrowTarget(table, '@moba:right:joueur'), table.lastElementChild);
  assert.equal(rpgMobaArrowTarget(table, '@moba:center:joueur'), null);
  assert.equal(rpgMobaArrowTarget(table, 'ordinary-creature'), null);
  dom.window.close();
});

test('les flèches de la créature centrale utilisent la voie annoncée', async () => {
  const { mobaInfliger } = await import('../src/games/rpgMoba.js');
  const { duel, put } = fixture();
  put('joueur', 'center', 0, 'allie');
  put('sorcier', 'right', 0, 'ennemi');
  mobaInfliger(duel.moba, 'joueur', 'center', 15);
  for (const voie of ['left', 'right']) {
    duel.combatDeclare = { cote: 'joueur', attaquants: ['allie'], cibleIndividuelle: { cibleId: null, voie } };
    const result = rpgMobaCombatIndicators(duel, 'joueur', ['allie'], {}, {}, { individuel: true });
    assert.deepEqual(result.attackArrows, { [`@moba:${voie}:sorcier`]: ['allie'] });
  }
  duel.combatDeclare.cibleIndividuelle.cibleId = 'ennemi';
  assert.deepEqual(rpgMobaCombatIndicators(duel, 'joueur', ['allie'], { allie: 'ennemi' }, {}, { individuel: true }).attackArrows, { ennemi: ['allie'] });
});
