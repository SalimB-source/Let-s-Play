import test from 'node:test';
import assert from 'node:assert/strict';
import { releverEnvol, transitionsEnvol } from '../src/games/rpgEnvolTransitions.js';
import { rpgNouveauDuel, rpgJouerCreature, rpgBlesserCreature } from '../src/games/rpgDuel.js';
import { rpgPvpVue } from '../src/games/rpgPvp.js';

test('seules les transitions d’un même exemplaire présent sont animées', () => {
  const a = { id: 'a', envol: false }, b = { id: 'b', envol: true };
  const duel = { joueur: { creatures: [a, b] }, sorcier: { creatures: [] } };
  const avant = releverEnvol(duel);
  a.envol = true;
  duel.joueur.creatures = [a, { id: 'c', envol: true }];
  assert.deepEqual(transitionsEnvol(avant, releverEnvol(duel)), [{ cle: 'joueur:a', type: 'envol' }], 'pas d’effet pour un entrant ou un sortant');
  assert.equal(avant.get('joueur:a'), false, 'snapshot isolé malgré la mutation en place');
  const apres = releverEnvol(duel);
  a.envol = false;
  assert.deepEqual(transitionsEnvol(apres, releverEnvol(duel)), [{ cle: 'joueur:a', type: 'atterrissage' }]);
  duel.joueur.creatures = []; duel.sorcier.creatures = [a];
  assert.deepEqual(transitionsEnvol(apres, releverEnvol(duel)), [], 'pas de confusion de camp');
});

test('la Furie du Maître gagne puis perd réellement Envol, y compris en vue PvP inversée', () => {
  const duel = rpgNouveauDuel({ joueurDeck: Array(40).fill('montagne'), sorcierDeck: Array(40).fill('montagne'), rng: () => .5 });
  Object.assign(duel.joueur.mana, { neige: 100, sable: 100, eau: 100, braise: 100, tenebres: 100 });
  duel.joueur.main = ['maitre-du-marteau', 'chien-du-guet', 'yamina'];
  const pose = rpgJouerCreature(duel, 'joueur', 'maitre-du-marteau', 'sorcier', { retourIds: ['chien-du-guet'] });
  assert.ok(pose.ok, JSON.stringify(pose));
  const maitre = pose.entite;
  const avant = releverEnvol(duel), avantPvp = releverEnvol(rpgPvpVue(duel, 'sorcier'));
  assert.equal(rpgBlesserCreature(duel, 'joueur', maitre.id, 2, 'braise').recus, 2);
  assert.deepEqual(transitionsEnvol(avant, releverEnvol(duel)), [{ cle: `joueur:${maitre.id}`, type: 'envol' }]);
  assert.deepEqual(transitionsEnvol(avantPvp, releverEnvol(rpgPvpVue(duel, 'sorcier'))), [{ cle: `sorcier:${maitre.id}`, type: 'envol' }]);
  const blesse = releverEnvol(duel);
  duel.joueur.invocationNormaleJouee = false; // autoriser Yamina dans cette scène de test
  assert.ok(rpgJouerCreature(duel, 'joueur', 'yamina').ok);
  assert.deepEqual(transitionsEnvol(blesse, releverEnvol(duel)), [{ cle: `joueur:${maitre.id}`, type: 'atterrissage' }]);
});

test('en Conquête, le même changement de Furie est détecté sur la créature de la voie', async () => {
  const { rpgMulligan, rpgDemarrerManaEssai } = await import('../src/games/rpgDuel.js');
  const { rpgMobaNouveauDuel, rpgMobaJouerCreature } = await import('../src/games/rpgMobaLocal.js');
  const deck = Array(12).fill('gardienne-des-portes-de-sable');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(duel, 'joueur', []).ok && rpgMulligan(duel, 'sorcier', []).ok && rpgDemarrerManaEssai(duel).ok);
  duel.joueur.main = ['maitre-du-marteau', 'chien-du-guet'];
  Object.assign(duel.joueur.mana, { neige: 30, sable: 30, eau: 30, braise: 30, tenebres: 30 });
  const pose = rpgMobaJouerCreature(duel, 'joueur', 'maitre-du-marteau', 'left', 0, { retourIds: ['chien-du-guet'] });
  assert.ok(pose.ok, JSON.stringify(pose));
  const avant = releverEnvol(duel);
  assert.equal(rpgBlesserCreature(duel, 'joueur', pose.entite.id, 1, 'braise').recus, 1);
  assert.deepEqual(transitionsEnvol(avant, releverEnvol(duel)), [{ cle: `joueur:${pose.entite.id}`, type: 'envol' }]);
});
