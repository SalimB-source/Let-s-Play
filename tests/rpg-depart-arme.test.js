import test from 'node:test';
import assert from 'node:assert/strict';
import { armesRetirees, retraitsArmesVue } from '../src/games/rpgOrnements.js';
import { armesPortees } from '../src/games/rpgCardStacks.js';
import { rpgNouveauDuel, rpgMulligan, rpgDemarrerManaEssai, rpgJouerCreature, rpgJouerArme, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { rpgPvpVue } from '../src/games/rpgPvp.js';

const vue = duel => new Map(['joueur', 'sorcier'].flatMap(cote => duel[cote].creatures.map(e => [`${cote}:${e.id}`, [...armesPortees(e)]])));

test('retraits en multiensemble : doublons, réordonnancement et remplacement', () => {
  assert.deepEqual(armesRetirees(['a', 'a', 'b'], ['b', 'a']), ['a']);
  assert.deepEqual(armesRetirees(['a', 'b'], ['b', 'a']), []);
  assert.deepEqual(armesRetirees(['a'], ['b']), ['a']);
  assert.deepEqual(retraitsArmesVue(new Map([['joueur:1', ['a']], ['sorcier:2', ['b']]]), new Map([['joueur:3', []]])), [], 'pas de départ sur une autre créature ni si le porteur quitte la table');
});

test('un remplacement réel est détecté pour le porteur survivant et dans une vue PvP', () => {
  const deck = Array(30).fill('chien-du-guet');
  const duel = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, modeMana: RPG_MODE_MANA_ESSAI, pvp: true, rng: () => .5 });
  assert.ok(rpgMulligan(duel, 'joueur', []).ok && rpgMulligan(duel, 'sorcier', []).ok && rpgDemarrerManaEssai(duel).ok);
  for (const cote of ['joueur', 'sorcier']) Object.assign(duel[cote].mana, { braise: 30, sable: 30, eau: 30, neige: 30, tenebres: 30 });
  duel.joueur.main = ['chien-du-guet'];
  const creature = rpgJouerCreature(duel, 'joueur', 'chien-du-guet').entite;
  assert.ok(creature);
  duel.joueur.main = ['sandales-de-tislit'];
  assert.ok(rpgJouerArme(duel, 'joueur', 'sandales-de-tislit', creature.id).ok);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  const avant = vue(duel), avantPvP = vue(rpgPvpVue(duel, 'sorcier'));
  duel.joueur.main = ['takouba-des-pistes']; duel.joueur.mana.sable = 30;
  const remplacement = rpgJouerArme(duel, 'joueur', 'takouba-des-pistes', creature.id);
  assert.ok(remplacement.ok, JSON.stringify(remplacement));
  const perdues = ['sandales-de-tislit'];
  assert.deepEqual(retraitsArmesVue(avant, vue(duel)), [{ cle: `joueur:${creature.id}`, armes: perdues }]);
  assert.deepEqual(retraitsArmesVue(avantPvP, vue(rpgPvpVue(duel, 'sorcier'))), [{ cle: `sorcier:${creature.id}`, armes: perdues }]);
});

test('remplacement en Conquête sur un vrai plateau', async () => {
  const { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaJouerArme } = await import('../src/games/rpgMobaLocal.js');
  const deck = Array(30).fill('ashigaru-des-braises');
  const duel = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  assert.ok(rpgMulligan(duel, 'joueur', []).ok && rpgMulligan(duel, 'sorcier', []).ok && rpgDemarrerManaEssai(duel).ok);
  Object.assign(duel.joueur.mana, { braise: 30, sable: 30, eau: 30, neige: 30, tenebres: 30 });
  duel.joueur.main = ['gardienne-des-portes-de-sable', 'sandales-de-tislit', 'cuirasse-de-sel'];
  const creature = rpgMobaJouerCreature(duel, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0).entite;
  assert.ok(creature);
  assert.ok(rpgMobaJouerArme(duel, 'joueur', 'sandales-de-tislit', creature.id).ok);
  const avant = vue(duel);
  duel.moba.armesJouees.joueur = false;
  assert.ok(rpgMobaJouerArme(duel, 'joueur', 'cuirasse-de-sel', creature.id).ok);
  assert.deepEqual(retraitsArmesVue(avant, vue(duel)), [{ cle: `joueur:${creature.id}`, armes: ['sandales-de-tislit'] }]);
});
