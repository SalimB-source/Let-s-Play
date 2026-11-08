import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerAttaque } from '../src/games/rpgDuel.js';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { projectilesCombat } from '../src/games/rpgProjectilesCombat.js';

function scenario(sourceCarte, cote = 'joueur', rng = () => .9) {
  const duel = rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng });
  duel.tour = cote;
  const adv = cote === 'joueur' ? 'sorcier' : 'joueur';
  for (const camp of [cote, adv]) duel[camp].mana = Object.fromEntries(RPG_ELEMENTS.map(e => [e, 50]));
  const pose = (camp, id) => {
    duel[camp].main.push(id);
    const r = rpgJouerCreature(duel, camp, id);
    assert.equal(r.ok, true);
    r.entite.ready = true;
    return r.entite;
  };
  const source = pose(cote, sourceCarte);
  const cible = pose(adv, 'dune-marchante');
  return { duel, cote, adv, source, cible };
}
for (const cote of ['joueur', 'sorcier']) {
  test(`flammèche : signal source-cible exact et dégâts inchangés (${cote})`, () => {
    const { duel, source, cible, adv } = scenario('vampire-des-braises', cote);
    const res = rpgLancerAttaque(duel, cote, [source.id], { [source.id]: [cible.id] });
    assert.equal(res.ok, true);
    const tirs = duel.combatAnimations.filter(a => a.type === 'projectile-combat');
    assert.equal(tirs.length, 1, 'la simulation du combat ne double pas le tir');
    assert.equal(tirs[0].variante, 'feu');
    assert.deepEqual(tirs[0].source, { type: 'creature', cote, entiteId: source.id });
    assert.deepEqual(tirs[0].cible, { type: 'creature', cote: adv, entiteId: cible.id });
    assert.equal(cible.pv, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(tirs)), tirs, 'signal transmis en PvP');
  });
  test(`attaque ciblée : trait lumineux (${cote})`, () => {
    const { duel, source, cible } = scenario('feriel', cote);
    assert.equal(rpgLancerAttaque(duel, cote, [source.id], {}, null, null, { [source.id]: cible.id }).ok, true);
    const tirs = (duel.combatAnimations ?? []).filter(a => a.type === 'projectile-combat');
    assert.equal(tirs.length, 1);
    assert.equal(tirs[0].variante, 'ciblee');
  });
}
test('les attaques normales ne lancent pas de projectile', () => {
  const { duel, source, cible } = scenario('chien-du-guet');
  rpgLancerAttaque(duel, 'joueur', [source.id], { [source.id]: [cible.id] });
  assert.equal((duel.combatAnimations ?? []).filter(a => a.type === 'projectile-combat').length, 0);
});
test('géométrie depuis les positions avant résolution, même si la cible meurt', () => {
  const tir = { id: 4, type: 'projectile-combat', variante: 'feu', source: { entiteId: 'a' }, cible: { entiteId: 'b' } };
  const avant = [{ entityId: 'a', left: 10, top: 100, width: 40, height: 60 },
    { entityId: 'b', left: 110, top: 0, width: 40, height: 60 }];
  const [effet] = projectilesCombat([tir], avant);
  assert.deepEqual([effet.x, effet.y, effet.dx, effet.dy, effet.angle], [30, 130, 100, -100, -45]);
  assert.deepEqual(projectilesCombat([tir], avant.slice(0, 1)), []);
  assert.deepEqual(projectilesCombat([{ ...tir, type: 'impact-combat' }], avant), []);
});

test('le feu part aussi du bloqueur et peut viser une créature détruite', () => {
  const { duel, source: vampire, cible: attaquant } = scenario('vampire-des-braises');
  duel.tour = 'sorcier';
  attaquant.pv = 1;
  assert.equal(rpgLancerAttaque(duel, 'sorcier', [attaquant.id], { [attaquant.id]: [vampire.id] }).ok, true);
  const [tir] = duel.combatAnimations.filter(a => a.type === 'projectile-combat');
  assert.equal(tir.source.entiteId, vampire.id);
  assert.equal(tir.cible.entiteId, attaquant.id);
  assert.equal(tir.variante, 'feu');
  assert.ok(!duel.sorcier.creatures.includes(attaquant));
});
test('une attaque ciblée ratée ne montre pas un projectile qui touche', () => {
  const { duel, source, cible } = scenario('feriel', 'joueur', () => .01);
  const res = rpgLancerAttaque(duel, 'joueur', [source.id], {}, null, null, { [source.id]: cible.id });
  assert.equal(res.ok, true);
  assert.equal(res.resume.coupsRapides[0].rate, true);
  assert.equal((duel.combatAnimations ?? []).filter(a => a.type === 'projectile-combat').length, 0);
});
