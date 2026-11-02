import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { rpgSortBloqueParBouclier } from '../src/games/rpgCombatIndications.js';

test('l’indication distingue les boucliers généraux et les couleurs du sort', () => {
  const eau = cardById('ressac');
  const braise = cardById('trait-de-braise');
  assert.equal(rpgSortBloqueParBouclier({ bouclier: 1 }, eau), true);
  assert.equal(rpgSortBloqueParBouclier({ protection: { contre: ['eau', 'neige'] } }, eau), true);
  assert.equal(rpgSortBloqueParBouclier({ protection: { contre: ['eau', 'neige'] } }, braise), false);
  assert.equal(rpgSortBloqueParBouclier({ protection: { contre: 'eau' } }, cardById('neige-noire')), false);
  assert.equal(rpgSortBloqueParBouclier({ protection: { contre: 'neige' } }, cardById('neige-noire')), true);
  assert.equal(rpgSortBloqueParBouclier({ bouclier: 1 }, cardById('chien-du-guet')), false);
  assert.equal(rpgSortBloqueParBouclier({}, eau), false);
});

test('aperçu des blocages : répartition, alertes et frappe ciblée exclue', async () => {
  const { rpgApercuBlocages } = await import('../src/games/rpgCombatIndications.js');
  const duel = { joueur: { creatures: [{ id: 'a', name: 'A', atk: 5, pv: 3, overkill: true }] },
    sorcier: { creatures: [{ id: 'b', name: 'B', atk: 2, pv: 2, esquive: 1 }, { id: 'c', name: 'C', atk: 1, pv: 3, contreAttaque: true }] } };
  const combat = { coteAttaquant: 'joueur', attaquants: ['a'], blocages: { a: ['b', 'c'] }, repartitions: { a: { b: 3, c: 2 } } };
  const [apercu] = rpgApercuBlocages(duel, combat);
  assert.deepEqual(apercu.bloqueurs.map((b) => b.repartition), [3, 2]);
  assert.deepEqual(apercu.alertes, ['Esquive possible', 'Contre-attaque possible', 'Overkill possible']);
  assert.deepEqual(apercu.risques, ['A', 'B']);
  const priorite = rpgApercuBlocages(duel, { ...combat, prioritesRepartition: { a: 'c' } })[0];
  assert.deepEqual(priorite.bloqueurs.map((b) => b.repartition), [0, 5]);
  assert.deepEqual(priorite.risques, ['A', 'C']);
  assert.deepEqual(rpgApercuBlocages(duel, { ...combat, ciblesAttaque: { a: 'b' } }), []);
  assert.deepEqual(rpgApercuBlocages(duel, null), []);
});

test('la page limite le choix de répartition à l’attaquant solo et garde le PvP automatique', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../src/games/RpgDuelPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /!modePvp && combatEntrant\?\.coteAttaquant === 'joueur' && apercuBlocages\.some/);
  assert.match(page, /<details className="rpg-repartition-menu">/);
  assert.doesNotMatch(page, /rpg-combat-apercu|rpg-ordre-combat|apercusCibles/);
  assert.match(page, /prioritesRepartition: combat\.prioritesRepartition \?\? null/);
  assert.match(page, /type: 'bloquer', blocages, repartitions: null/);
});
