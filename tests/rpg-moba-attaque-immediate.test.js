import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgDemarrerManaEssai, rpgFinDeTour, rpgMulligan, rpgNouveauDuel, rpgJouerCreature, rpgPeutAttaquer } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaDeclarerAttaque, rpgMobaLancerAttaque, rpgMobaLancerMagie } from '../src/games/rpgMobaLocal.js';
import { rpgMobaNotesCarte } from '../src/games/rpgMobaPresentation.js';
import { cardById } from '../src/games/rpgCards.js';

function commencer(moba = true) {
  const deck = Array(12).fill('gardienne-des-portes-de-sable');
  const duel = moba
    ? rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 })
    : rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.equal(rpgMulligan(duel, 'joueur', []).ok, true);
  assert.equal(rpgMulligan(duel, 'sorcier', []).ok, true);
  if (moba) assert.equal(rpgDemarrerManaEssai(duel).ok, true);
  return duel;
}

test('MOBA : une créature sans Rapidité peut attaquer sa voie dès sa pose, une seule fois', () => {
  const duel = commencer();
  duel.joueur.main = ['gardienne-des-portes-de-sable'];
  duel.joueur.mana.sable = 20;
  const pose = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0);
  assert.equal(pose.ok, true);
  const creature = pose.entite;
  assert.equal(creature.rapidite, false);
  assert.equal(creature.malInvocation, false);
  assert.equal(rpgPeutAttaquer(creature), true);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [creature.id]).ok, true);
  assert.equal(rpgMobaLancerAttaque(duel, 'joueur', [creature.id], {}, { declaree: true }).ok, true);
  assert.equal(rpgPeutAttaquer(creature), false);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [creature.id]).ok, false);
});

test('MOBA : les créatures du second camp arrivent elles aussi prêtes à attaquer', () => {
  const duel = commencer();
  rpgFinDeTour(duel);
  duel.sorcier.main = ['gardienne-des-portes-de-sable'];
  duel.sorcier.mana.sable = 20;
  const pose = rpgMobaJouerCreature(duel, 'sorcier', 'gardienne-des-portes-de-sable', 'right', 0);
  assert.equal(pose.ok, true);
  assert.equal(rpgPeutAttaquer(pose.entite), true);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'sorcier', [pose.entite.id]).ok, true);
});

test('MOBA : une créature réanimée sans Rapidité attaque aussi immédiatement', () => {
  const duel = commencer();
  duel.joueur.main = ['reanimation'];
  duel.joueur.mana.sable = 20;
  duel.joueur.cimetiere = ['gardienne-des-portes-de-sable'];
  const pose = rpgMobaLancerMagie(duel, 'joueur', 'reanimation', null, 'right', null, { emplacementReanimation: 0 });
  assert.equal(pose.ok, true);
  const creature = duel.joueur.creatures[0];
  assert.equal(creature.carteId, 'gardienne-des-portes-de-sable');
  assert.equal(rpgPeutAttaquer(creature), true);
  assert.equal(rpgMobaDeclarerAttaque(duel, 'joueur', [creature.id]).ok, true);
});

test('le duel classique permet aussi d’attaquer dès l’arrivée ; la fiche MOBA explique Rapidité', () => {
  const duel = commencer(false);
  duel.joueur.main = ['gardienne-des-portes-de-sable'];
  duel.joueur.mana.sable = 20;
  const pose = rpgJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable');
  assert.equal(pose.ok, true);
  assert.equal(pose.entite.malInvocation, false);
  assert.equal(rpgPeutAttaquer(pose.entite), true);
  assert.match(rpgMobaNotesCarte(cardById('fennec-des-decombres')).join(' '), /toutes les créatures peuvent attaquer dès leur arrivée/);
});

test('PvP : une créature invoquée par intention peut attaquer immédiatement', async () => {
  const { rpgPvpAppliquer } = await import('../src/games/rpgPvp.js');
  const deck = Array(12).fill('gardienne-des-portes-de-sable');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, pvp: true, rng: () => .5 });
  assert.ok(rpgMulligan(duel, 'joueur', []).ok);
  assert.ok(rpgMulligan(duel, 'sorcier', []).ok);
  duel.joueur.main = ['gardienne-des-portes-de-sable'];
  duel.joueur.mana.sable = 20;
  const pose = rpgPvpAppliquer(duel, 'joueur', { type: 'jouer-carte', carteId: 'gardienne-des-portes-de-sable' });
  assert.equal(pose.ok, true);
  const creature = duel.joueur.creatures[0];
  assert.equal(rpgPeutAttaquer(creature), true);
  creature.gelToursRestants = 1;
  assert.equal(rpgPeutAttaquer(creature), false, 'le gel continue à interdire les attaques');
  creature.gelToursRestants = 0;
  assert.equal(rpgPvpAppliquer(duel, 'joueur', { type: 'attaquer', declarer: true, attaquants: [creature.id] }).ok, true);
});
