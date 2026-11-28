import test from 'node:test';
import assert from 'node:assert/strict';
import { mobaNouveau } from '../src/games/rpgMoba.js';
import { rpgCiblesIndividuellesClassique } from '../src/games/rpgCombatIndividuelClassique.js';
import { rpgMobaCiblesIndividuelles } from '../src/games/rpgMobaAttaqueIndividuelle.js';
import { prioriteDefenseurVisuelle, textePrioriteDefenseur } from '../src/games/rpgPrioriteDefenseurVisuelle.js';

const creature = (id, props = {}) => ({ id, carteId: 'ashigaru-des-braises', ...props });
const partie = (attaquant, adversaires, moba = null) => ({ joueur: { creatures: [attaquant] }, sorcier: { creatures: adversaires }, ...(moba ? { moba } : {}) });

test('Duel et PvP : seuls les Défenseurs atteignables sont marqués, sans toucher aux règles', () => {
  for (const pvp of [false, true]) {
    const a = creature('a', { distance: false }), d = creature('d', { defenseur: true }), d2 = creature('d2', { defenseur: true }), c = creature('c'), vol = creature('vol', { envol: true });
    const duel = { ...partie(a, [d, d2, c, vol]), pvp };
    const avant = JSON.stringify(duel);
    const info = prioriteDefenseurVisuelle(duel, 'joueur', a.id);
    assert.deepEqual([...info.prioritaires], [d.id, d2.id]);
    assert.deepEqual([...info.protegees], [c.id]);
    assert.equal(info.protegees.has(vol.id), false, 'la portée, pas le Défenseur, exclut Envol');
    assert.deepEqual(rpgCiblesIndividuellesClassique(duel, 'joueur', a.id).cibles, [d.id, d2.id]);
    assert.match(textePrioriteDefenseur(info), /choisissez un Défenseur/i);
    assert.equal(JSON.stringify(duel), avant);
    a.infiltration = true;
    assert.equal(prioriteDefenseurVisuelle(duel, 'joueur', a.id), null);
  }
});

test('un Défenseur hors de portée ne provoque pas d’avertissement', () => {
  const a = creature('a', { distance: false }), garde = creature('g', { defenseur: true, envol: true }), cible = creature('c');
  assert.equal(prioriteDefenseurVisuelle(partie(a, [garde, cible]), 'joueur', a.id), null);
});

test('Conquête : une autre voie et la frappe directe restent possibles', () => {
  const m = mobaNouveau(); m.centerJoined = { side: 'joueur', laneId: null };
  const a = creature('a', { mobaLane: 'center', coupRapide: true, envol: true });
  const garde = creature('g', { mobaLane: 'left', defenseur: true });
  const cible = creature('c', { mobaLane: 'right' });
  const d = partie(a, [garde, cible], m);
  const choix = rpgMobaCiblesIndividuelles(d, 'joueur', a.id);
  const info = prioriteDefenseurVisuelle(d, 'joueur', a.id);
  assert.deepEqual([...info.prioritaires], ['g']);
  assert.equal(info.protegees.has('c'), false);
  assert.ok(choix.cibles.includes('c')); assert.equal(choix.directe, true);
  assert.match(textePrioriteDefenseur(info), /autres cibles et attaque directe possibles/);
  cible.defenseur = true;
  const deux = prioriteDefenseurVisuelle(d, 'joueur', a.id);
  assert.deepEqual([...deux.prioritaires].sort(), ['c', 'g']);
  assert.equal(deux.directe, false);
  assert.match(textePrioriteDefenseur(deux), /choisissez un Défenseur/i);
  a.infiltration = true;
  assert.equal(prioriteDefenseurVisuelle(d, 'joueur', a.id), null);
});

test('Défenseur seul avec Infiltration : expliquer que la frappe directe reste possible', () => {
  const a = creature('a', { coupRapide: true }), garde = creature('g', { defenseur: true, infiltration: true });
  const info = prioriteDefenseurVisuelle(partie(a, [garde]), 'joueur', a.id);
  assert.equal(info.directe, true);
  assert.match(textePrioriteDefenseur(info), /directe reste possible/);
});
