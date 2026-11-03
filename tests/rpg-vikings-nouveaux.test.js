import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById, cardHasPrintedType, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { COLLECTION_DEPART } from '../src/games/rpgCollection.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerAttaque } from '../src/games/rpgDuel.js';

test('deux Vikings neige disponibles en collection avec leurs caractéristiques', () => {
  const v = cardById('viking-des-neiges'), a = cardById('archere-viking-du-givre');
  assert.deepEqual([v.cost, v.atk, v.def, v.element, v.text], [1, 2, 1, 'neige', '']);
  assert.deepEqual([a.cost, a.atk, a.def, a.element, a.gelCombatChance, a.coupRapide], [4, 2, 5, 'neige', 0.15, true]);
  for (const c of [v, a]) { assert.ok(cardHasPrintedType(c, 'viking')); assert.ok(COLLECTION_DEPART.includes(c.id)); }
  for (const prop of ['arrivee', 'combat', 'destruction', 'rapidite', 'coupRapide', 'gelCombatChance']) assert.equal(v[prop], undefined);
});
function scene(rng, archerSide = 'joueur', bouclier = false) {
  const d = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => rng });
  for (const side of ['joueur', 'sorcier']) d[side].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40]));
  const other = archerSide === 'joueur' ? 'sorcier' : 'joueur';
  function pose(side, id) { d[side].main.push(id); const r = rpgJouerCreature(d, side, id); assert.ok(r.ok); return r.entite; }
  const a = pose(archerSide, 'archere-viking-du-givre'), b = pose(other, 'dune-marchante');
  if (bouclier) b.bouclier = 1;
  d.tour = other; b.ready = true;
  assert.ok(rpgLancerAttaque(d, other, [b.id], { [b.id]: [a.id] }).ok);
  return {a,b};
}
test('gel de combat : seuil strict à 15 % pour les deux camps', () => {
  for (const side of ['joueur', 'sorcier']) {
    assert.ok(scene(0.149, side).b.gelToursRestants > 0);
    assert.equal(scene(0.15, side).b.gelToursRestants, 0);
  }
});
test('le bouclier adverse bloque le gel de l’archère', () => {
  const {b} = scene(0, 'joueur', true); assert.equal(b.bouclier, 0); assert.equal(b.gelToursRestants, 0);
});

test('Attaque ciblée réussie : le gel est tenté sur la cible ; une attaque ratée ne le déclenche pas', () => {
  for (const rate of [false, true]) {
    let sequence = [];
    const d = rpgNouveauDuel({joueurDeck: [], sorcierDeck: [], rng: () => sequence.shift() ?? 0.9});
    for (const side of ['joueur','sorcier']) d[side].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 40]));
    d.joueur.main.push('archere-viking-du-givre'); d.sorcier.main.push('dune-marchante');
    const a = rpgJouerCreature(d, 'joueur', 'archere-viking-du-givre').entite;
    const b = rpgJouerCreature(d, 'sorcier', 'dune-marchante').entite;
    a.ready = true; sequence = [rate ? 0 : 0.9, 0];
    assert.ok(rpgLancerAttaque(d, 'joueur', [a.id], {}, null, null, {[a.id]: b.id}).ok);
    assert.equal(b.gelToursRestants > 0, !rate);
    assert.equal(b.pv, rate ? 4 : 2);
  }
});
