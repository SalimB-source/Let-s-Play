import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById, cardColors, cardColorCost, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgResoudreArriveeCiblee } from '../src/games/rpgDuel.js';
import { rpgPvpAppliquer } from '../src/games/rpgPvp.js';

function fixture() {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
  for (const cote of ['joueur', 'sorcier']) d[cote].mana = Object.fromEntries(RPG_ELEMENTS.map(c => [c, 10]));
  d.sorcier.main.push('dune-marchante', 'chien-du-guet');
  const a = rpgJouerCreature(d, 'sorcier', 'dune-marchante').entite;
  const b = rpgJouerCreature(d, 'sorcier', 'chien-du-guet').entite;
  d.joueur.main.push('sentinelle-des-sables');
  return { d, a, b };
}

test('Sentinelle : coût, caractéristiques et arrivée uniquement contre un attaquant', () => {
  const carte = cardById('sentinelle-des-sables');
  assert.deepEqual([carte.element, carte.cost, carte.atk, carte.def], ['sable', 3, 3, 2]);
  assert.deepEqual(cardColors(carte), ['sable', 'tenebres']);
  assert.deepEqual(cardColorCost(carte), { sable: 1, tenebres: 1 });
  assert.match(carte.typeLine, /Humain et Vampire/);
  const { d, a, b } = fixture();
  const res = rpgJouerCreature(d, 'joueur', carte.id, null, { cibleDifferee: true, attaquants: [a.id] });
  assert.ok(res.ok && res.arriveeEnAttente);
  assert.equal(rpgResoudreArriveeCiblee(d, 'joueur', b.id).ok, false);
  res.entite.atk = 2;
  assert.equal(rpgResoudreArriveeCiblee(d, 'joueur', a.id).ok, true);
  assert.equal(a.pv, 2);
});

test('Sans attaque, la pose ne blesse aucune créature', () => {
  const { d, a } = fixture();
  assert.ok(rpgJouerCreature(d, 'joueur', 'sentinelle-des-sables').ok);
  assert.equal(a.pv, 4);
});

test('PvP : une attaque sans bloqueur ouvre la réponse et la Sentinelle peut la frapper', () => {
  const { d, a } = fixture();
  d.mulliganFait = { joueur: true, sorcier: true };
  d.tour = 'sorcier'; a.ready = true;
  const attaque = rpgPvpAppliquer(d, 'sorcier', { type: 'attaquer', declarer: true, attaquants: [a.id] });
  assert.ok(attaque.ok); assert.equal(d.phase, 'blocage');
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'jouer-carte', carteId: 'sentinelle-des-sables', cibleDifferee: true }).ok);
  assert.ok(rpgPvpAppliquer(d, 'joueur', { type: 'resoudre-arrivee', cibleId: a.id }).ok);
  assert.equal(a.pv, 1);
});
