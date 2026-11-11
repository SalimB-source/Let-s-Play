import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { rpgMobaImpactIndividuel, rpgMobaPositionsImpact } from '../src/games/rpgMobaImpact.js';

const combat = { cote: 'joueur', attaquants: ['a'], cibleIndividuelle: { cibleId: 'b', voie: 'left' } };
const positions = { width: 500, height: 400, entities: { a: { x: 100, y: 200 }, b: { x: 100, y: 100 } }, lanes: { '@moba:left:sorcier': { x: 100, y: 30 } } };

test('les impacts utilisent les blessures résolues, y compris une riposte et un excès', () => {
  const resultat = { ok: true, resume: { blessures: [{ entiteId: 'b', sourceId: 'a', montant: 3 }, { entiteId: 'a', sourceId: 'b', montant: 2 }], critiques: [{ entiteId: 'a' }] }, damageEvents: [
    { attackerId: 'a', laneId: 'left', targetSide: 'sorcier', damage: 1 },
    { attackerId: 'a', laneId: 'right', targetSide: 'sorcier', damage: 2, tribut: true },
  ] };
  const impact = rpgMobaImpactIndividuel(combat, resultat, positions, { a: 'A', b: 'B' });
  assert.deepEqual(impact.impacts.map(({ id, montant }) => [id, montant]), [['b', 3], ['a', 2], ['@moba:left:sorcier', 1]]);
  assert.equal(impact.impacts[0].critique, true);
  assert.equal(impact.impacts[1].critique, false);
  assert.equal(impact.impacts[2].critique, true);
  assert.match(impact.annonce, /B : 3 dégâts/);
  assert.deepEqual(impact.destination, positions.entities.b);
});

test('une attaque manquée ou protégée ne crée aucun faux dégât ; une annulation ne crée aucun effet', () => {
  const resultat = { ok: true, resume: { coupsRapides: [{ rate: true, degats: 5 }], blessures: [] } };
  assert.deepEqual(rpgMobaImpactIndividuel(combat, resultat, positions).impacts, []);
  assert.equal(rpgMobaImpactIndividuel(combat, { ...resultat, annule: true }, positions), null);
  assert.equal(rpgMobaImpactIndividuel({}, resultat, positions), null);
});

test('une attaque directe vise la jauge de la voie annoncée et affiche les dégâts réellement perdus', () => {
  const directe = { ...combat, cibleIndividuelle: { cibleId: null, voie: 'left' } };
  const impact = rpgMobaImpactIndividuel(directe, { ok: true, damageEvents: [{ attackerId: 'a', laneId: 'left', targetSide: 'sorcier', damage: 2 }] }, positions);
  assert.deepEqual(impact.destination, positions.lanes['@moba:left:sorcier']);
  assert.equal(impact.impacts[0].montant, 2);
  assert.match(impact.annonce, /voie gauche : 2 dégâts/);
});

test('capture les positions dans le repère local même si le plateau est agrandi', () => {
  const dom = new JSDOM('<div id="table"><div data-moba-entity="a"></div><div data-moba-lane-hp="@moba:left:sorcier"></div></div>');
  const table = dom.window.document.querySelector('#table');
  table.getBoundingClientRect = () => ({ left: 100, top: 50, width: 1000, height: 800 });
  Object.defineProperties(table, { clientWidth: { value: 500 }, clientHeight: { value: 400 } });
  table.children[0].getBoundingClientRect = () => ({ left: 200, top: 250, width: 100, height: 100 });
  table.children[1].getBoundingClientRect = () => ({ left: 200, top: 80, width: 100, height: 40 });
  const capture = rpgMobaPositionsImpact(table);
  assert.deepEqual(capture.entities.a, { x: 75, y: 125 });
  assert.deepEqual(capture.lanes['@moba:left:sorcier'], { x: 75, y: 25 });
  dom.window.close();
});
