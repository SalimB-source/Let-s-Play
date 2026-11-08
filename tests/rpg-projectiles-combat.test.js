import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgNouveauDuel, rpgJouerCreature, rpgLancerAttaque, rpgBlesserCreature, rpgResoudreDestructionCiblee } from '../src/games/rpgDuel.js';
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

function poseSupplement(duel, cote, id) {
  duel[cote].main.push(id);
  const res = rpgJouerCreature(duel, cote, id);
  assert.equal(res.ok, true, res.raison);
  return res.entite;
}

for (const cote of ['joueur', 'sorcier']) {
  test(`Harakiri part de la créature morte (${cote})`, () => {
    const { duel, source, cible } = scenario('ronin-du-soleil-rouge', cote);
    rpgBlesserCreature(duel, cote, source.id, 99);
    const [tir] = (duel.combatAnimations ?? []).filter(a => a.type === 'projectile-combat');
    assert.equal(tir.source.entiteId, source.id);
    assert.equal(tir.cible.entiteId, cible.id);
    assert.equal(tir.variante, 'feu');
    assert.equal(cible.pv, 3);
  });
  test(`Ghul : la source reste identifiée après la mort (${cote})`, () => {
    const { duel, source, cible } = scenario('ghul-des-cendres', cote);
    rpgBlesserCreature(duel, cote, source.id, 99);
    if (cote === 'joueur') {
      assert.equal(duel.destructionsEnAttente[0].sourceEntiteId, source.id);
      assert.equal(rpgResoudreDestructionCiblee(duel, cote, cible.id).ok, true);
    }
    const tirs = (duel.combatAnimations ?? []).filter(a => a.type === 'projectile-combat');
    assert.equal(tirs.length, 1);
    assert.equal(tirs[0].source.entiteId, source.id);
    assert.equal(tirs[0].cible.entiteId, cible.id);
    assert.equal(cible.pv, 3);
  });
  test(`Braisier du souk : un tir par victime à l’arrivée (${cote})`, () => {
    const { duel, adv, cible } = scenario('chien-du-guet', cote);
    const autre = poseSupplement(duel, adv, 'dune-marchante');
    const source = poseSupplement(duel, cote, 'braisier-du-souk');
    const tirs = (duel.combatAnimations ?? []).filter(a => a.type === 'projectile-combat');
    assert.deepEqual(new Set(tirs.map(a => a.cible.entiteId)), new Set([cible.id, autre.id]));
    assert.ok(tirs.every(a => a.source.entiteId === source.id && a.variante === 'feu'));
    assert.equal(cible.pv, 3);
    assert.equal(autre.pv, 3);
  });
}
test('Harakiri sans créature adverse vise le sorcier', () => {
  const { duel, source } = scenario('ronin-du-soleil-rouge');
  duel.sorcier.creatures = [];
  const pv = duel.sorcier.pv;
  rpgBlesserCreature(duel, 'joueur', source.id, 99);
  const [tir] = duel.combatAnimations.filter(a => a.type === 'projectile-combat');
  assert.deepEqual(tir.cible, { type: 'sorcier', cote: 'sorcier' });
  assert.equal(duel.sorcier.pv, pv - 1);
});
test('géométrie : source disparue conservée et sorcier destinataire', () => {
  const avant = [{ entityId: 'cible', left: 100, top: 0, width: 20, height: 40 }];
  avant.avatarRects = { sorcier: { left: 20, top: 10, width: 60, height: 60 } };
  const cache = [{ entityId: 'mort', left: 0, top: 100, width: 20, height: 40 }];
  const tir = { id: 1, type: 'projectile-combat', variante: 'feu', source: { entiteId: 'mort' }, cible: { entiteId: 'cible' } };
  assert.equal(projectilesCombat([tir], avant, cache)[0].dx, 100);
  assert.equal(projectilesCombat([{ ...tir, cible: { type: 'sorcier', cote: 'sorcier' } }], avant, cache)[0].dx, 40);
});
