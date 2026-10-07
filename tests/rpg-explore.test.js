/**
 * Règles d'exploration d'un palier — heures, lieux, choix, effets,
 * et versement dans le combat suivant.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rpgCreateExplore,
  rpgExploreAct,
  rpgApplyExplore,
  RPG_EXPLORE_HOURS,
} from '../src/games/rpgExplore.js';
import { rpgCreateBattle } from '../src/games/rpgCombat.js';
import { RPG_DEMO_PARTY, RPG_DEMO_RESERVE, RPG_DEMO_WAVES, RPG_EXPLORE_PALIERS } from '../src/games/rpgContent.js';

const clone = (value) => structuredClone(value);

function makeParty() {
  return clone(RPG_DEMO_PARTY).map((a) => ({ ...a, hp: a.maxHp, side: 'equipe', alive: true }));
}

function makeExplore() {
  return rpgCreateExplore({ places: clone(RPG_EXPLORE_PALIERS[1]).places });
}

test('création : trois heures, lieux clonés, poches vides', () => {
  const explore = makeExplore();
  assert.equal(explore.hours, RPG_EXPLORE_HOURS);
  assert.equal(explore.pocket, 0);
  assert.equal(explore.places.length, 4);
  assert.ok(explore.places.every((p) => Object.keys(p.done).length === 0));
});

test('une action coûte une heure et se marque faite', () => {
  const explore = makeExplore();
  const party = makeParty();
  const result = rpgExploreAct(explore, party, 'souk', 'ferraille');
  assert.equal(result.ok, true);
  assert.equal(explore.hours, 2);
  assert.equal(explore.places.find((p) => p.id === 'souk').done.ferraille, true);
  assert.equal(explore.pocket, 30);
});

test('refaire une action : refus deja-fait, rien ne bouge', () => {
  const explore = makeExplore();
  const party = makeParty();
  rpgExploreAct(explore, party, 'souk', 'ferraille');
  const result = rpgExploreAct(explore, party, 'souk', 'ferraille');
  assert.deepEqual(result, { ok: false, reason: 'deja-fait' });
  assert.equal(explore.hours, 2);
  assert.equal(explore.pocket, 30);
});

test('lieu ou action inconnue : refus introuvable', () => {
  const explore = makeExplore();
  assert.equal(rpgExploreAct(explore, makeParty(), 'nul', 'ferraille').ok, false);
  assert.equal(rpgExploreAct(explore, makeParty(), 'souk', 'nul').ok, false);
});

test('soin d’équipe : les vivants remontent, plafonnés au max', () => {
  const explore = makeExplore();
  const party = makeParty();
  party[0].hp = 10;
  party[1].hp = party[1].maxHp;
  rpgExploreAct(explore, party, 'puis', 'eau');
  assert.equal(party[0].hp, 10 + Math.round(party[0].maxHp * 0.25));
  assert.equal(party[1].hp, party[1].maxHp);
});

test('dépenser sans sable : refus, heure et action intactes', () => {
  const explore = makeExplore();
  const result = rpgExploreAct(explore, makeParty(), 'souk', 'onguent');
  assert.deepEqual(result, { ok: false, reason: 'sable-insuffisant' });
  assert.equal(explore.hours, RPG_EXPLORE_HOURS);
  assert.equal(explore.places.find((p) => p.id === 'souk').done.onguent, undefined);
});

test('dépenser avec sable : l’onguent remet d’aplomb le plus abîmé', () => {
  const explore = makeExplore();
  const party = makeParty();
  rpgExploreAct(explore, party, 'souk', 'ferraille'); // +30
  party[2].hp = 5;
  const result = rpgExploreAct(explore, party, 'souk', 'onguent');
  assert.equal(result.ok, true);
  assert.equal(explore.pocket, 10);
  assert.equal(party[2].hp, party[2].maxHp);
});

test('choix : chaque option applique ses effets et son texte', () => {
  const explore = makeExplore();
  const party = makeParty();
  const segmentsAvant = party[0].nameSegments;
  const result = rpgExploreAct(explore, party, 'antichambre', 'liste', 1);
  assert.equal(result.ok, true);
  assert.equal(party[0].nameSegments, Math.min(3, segmentsAvant + 1));
  assert.ok(explore.flags.includes('page-arrachee'));
  assert.equal(explore.hours, 2);
});

test('heures épuisées : refus heures', () => {
  const explore = makeExplore();
  const party = makeParty();
  rpgExploreAct(explore, party, 'puis', 'eau');
  rpgExploreAct(explore, party, 'souk', 'ferraille');
  rpgExploreAct(explore, party, 'tram', 'reparer');
  assert.equal(explore.hours, 0);
  const result = rpgExploreAct(explore, party, 'antichambre', 'liste', 0);
  assert.deepEqual(result, { ok: false, reason: 'heures' });
});

test('action gratuite (0 heure) : jouable même sans heures', () => {
  const explore = rpgCreateExplore({ places: clone(RPG_EXPLORE_PALIERS[2]).places, hours: 0 });
  const party = makeParty();
  party[0].hp = 100;
  const result = rpgExploreAct(explore, party, 'terrasse', 'souffler');
  assert.equal(result.ok, true);
  assert.equal(explore.hours, 0);
  assert.ok(party[0].hp > 100);
});

test('versement au combat : sable au sol, buffs appliqués', () => {
  const explore = makeExplore();
  const party = makeParty();
  rpgExploreAct(explore, party, 'souk', 'ferraille'); // +30 sable
  rpgExploreAct(explore, party, 'tram', 'reparer'); // buff atk
  rpgExploreAct(explore, party, 'antichambre', 'liste', 0); // buff verre

  const battle = rpgCreateBattle({
    party: clone(RPG_DEMO_PARTY),
    reserve: clone(RPG_DEMO_RESERVE),
    foes: clone(RPG_DEMO_WAVES[1].foes),
    seed: 7,
  });
  const atkAvant = battle.actors.find((a) => a.id === 'salem').atk;
  rpgApplyExplore(explore, battle);
  assert.equal(battle.ground.equipe, 30);
  assert.equal(battle.verre, 1);
  assert.equal(battle.actors.find((a) => a.id === 'salem').atk, Math.round(atkAvant * 1.1));
});

test('sourdine : les ennemis frappent moins fort au combat suivant', () => {
  const explore = rpgCreateExplore({ places: clone(RPG_EXPLORE_PALIERS[2]).places });
  const battle = rpgCreateBattle({
    party: clone(RPG_DEMO_PARTY),
    reserve: clone(RPG_DEMO_RESERVE),
    foes: clone(RPG_DEMO_WAVES[2].foes),
    seed: 7,
  });
  const boss = battle.actors.find((a) => a.id === 'prototype');
  const atkAvant = boss.atk;
  explore.buffs.push('sourdine');
  rpgApplyExplore(explore, battle);
  assert.equal(boss.atk, Math.round(atkAvant * 0.9));
});

test('chaque incantation narrative du palier existe et coûte au plus une heure', () => {
  for (const palier of RPG_EXPLORE_PALIERS) {
    if (!palier) continue;
    for (const place of palier.places) {
      assert.ok(place.name && place.npc, `lieu incomplet : ${place.id}`);
      for (const action of place.actions) {
        assert.ok((action.cost ?? 1) <= 1, `action trop chère : ${place.id}/${action.id}`);
        assert.ok(action.text, `texte manquant : ${place.id}/${action.id}`);
        if (action.choices) {
          assert.equal(action.choices.length, 2, `choix binaire attendu : ${place.id}/${action.id}`);
        }
      }
    }
  }
});
