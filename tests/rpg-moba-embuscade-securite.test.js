import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan, rpgPeutRepondre, rpgConditionEmbuscadeRemplie, rpgNouveauDuel, rpgJouerCreature } from '../src/games/rpgDuel.js';
import { cardById } from '../src/games/rpgCards.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaque, rpgMobaLancerAttaque, rpgMobaLancerMagie, rpgMobaPlacementCoherent } from '../src/games/rpgMobaLocal.js';

function pret(moba = true) {
  const deck = Array(30).fill('gardienne-des-portes-de-sable');
  const duel = (moba ? rpgMobaNouveauDuel : rpgNouveauDuel)({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5, modeMana: 'essai' });
  assert.ok(rpgMulligan(duel, 'joueur', []).ok);
  assert.ok(rpgMulligan(duel, 'sorcier', []).ok);
  assert.ok(rpgDemarrerManaEssai(duel).ok);
  duel.joueur.main = ['gardienne-des-portes-de-sable']; duel.joueur.mana.sable = 10;
  duel.sorcier.main = ['ecueil']; duel.sorcier.mana.eau = 10;
  return duel;
}

test('MOBA : une pose immédiate ne déclenche pas le contresort automatique du duel classique', () => {
  const duel = pret();
  // Defense in depth: MOBA normally sets pvp, but must never use classic AI
  // responses even if that flag is absent on a restored or constructed duel.
  delete duel.pvp;
  const result = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0);
  assert.ok(result.ok); assert.ok(result.entite);
  assert.deepEqual(duel.sorcier.main, ['ecueil']);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

for (const side of ['joueur', 'sorcier']) test(`MOBA : le contresort explicite de ${side} fonctionne toujours contre une créature annoncée`, () => {
  const duel = pret();
  const caster = side === 'joueur' ? 'sorcier' : 'joueur';
  if (caster === 'sorcier') rpgFinDeTour(duel);
  duel[caster].main = ['gardienne-des-portes-de-sable']; duel[caster].mana.sable = 10;
  duel[side].main = ['ecueil']; duel[side].mana.eau = 10;
  const announced = rpgMobaJouerCreature(duel, caster, 'gardienne-des-portes-de-sable', 'left', 0, { ouvrirReponse: true });
  assert.equal(announced.creatureEnAttente, true);
  assert.equal(rpgMobaLancerMagie(duel, side, 'ecueil').contre, true);
  assert.equal(duel.mobaCreatureEnAttente, null);
  assert.deepEqual(duel[caster].cimetiere, ['gardienne-des-portes-de-sable']);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});

test('duel classique : le contresort automatique de l’IA reste actif', () => {
  const duel = pret(false);
  const result = rpgJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable');
  assert.equal(result.contre, true);
  assert.deepEqual(duel.sorcier.cimetiere, ['ecueil']);
});

for (const attackerSide of ['joueur', 'sorcier']) test(`MOBA : l’Embuscade du Sanguinaire reste exclue malgré l’attaque de ${attackerSide}`, () => {
  const duel = pret();
  const defender = attackerSide === 'joueur' ? 'sorcier' : 'joueur';
  if (attackerSide === 'sorcier') rpgFinDeTour(duel);
  duel[attackerSide].main = ['gardienne-des-portes-de-sable']; duel[attackerSide].mana.sable = 10;
  const attacker = rpgMobaJouerCreature(duel, attackerSide, 'gardienne-des-portes-de-sable', 'left', 0).entite;
  assert.ok(attacker); attacker.ready = true; attacker.pv -= 1;
  duel[defender].main = ['sanguinaire-des-dunes'];
  Object.assign(duel[defender].mana, { neige: 10, tenebres: 10 });
  assert.ok(rpgMobaDeclarerAttaque(duel, attackerSide, [attacker.id]).ok);
  assert.equal(rpgConditionEmbuscadeRemplie(duel, defender, cardById('sanguinaire-des-dunes')), true);
  assert.equal(rpgPeutRepondre(duel, defender), false);
  const before = JSON.stringify(duel);
  assert.equal(rpgMobaJouerCreature(duel, defender, 'sanguinaire-des-dunes', 'left', 0).ok, false);
  assert.equal(JSON.stringify(duel), before);
  assert.ok(rpgMobaLancerAttaque(duel, attackerSide, [attacker.id], {}, { declaree: true }).ok);
  assert.equal(rpgMobaPlacementCoherent(duel), true);
});
