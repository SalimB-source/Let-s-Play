import test from 'node:test';
import assert from 'node:assert/strict';
import { rpgNouveauDuel, rpgJouerCreature, rpgFinDeTour, rpgBlesserCreature, rpgMulligan, rpgDemarrerManaEssai } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature } from '../src/games/rpgMobaLocal.js';
import { rpgPvpVue } from '../src/games/rpgPvp.js';
import { instantaneTicsAfflictions, nouveauxTicsAfflictions, ticsPourPile } from '../src/games/rpgTicsAfflictions.js';

function partie(moba = false) {
  const deck = Array(30).fill('chien-du-guet');
  const d = moba ? rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 })
    : rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => .5 });
  if (moba) assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  Object.assign(d.joueur.mana, { sable: 30, braise: 30, eau: 30, neige: 30, tenebres: 30 });
  d.joueur.main = ['dune-marchante'];
  const r = moba ? rpgMobaJouerCreature(d, 'joueur', 'dune-marchante', 'left', 0) : rpgJouerCreature(d, 'joueur', 'dune-marchante');
  assert.ok(r.ok, JSON.stringify(r));
  return [d, r.entite];
}

for (const moba of [false, true]) test(`${moba ? 'Conquête' : 'Duel'} : les vraies doses sont journalisées, sans confondre une blessure ordinaire`, () => {
  const [duel, victime] = partie(moba);
  victime.poison = { degats: 1, toursRestants: 2, sourceCarteId: 'scorpion-du-seuil' };
  victime.brulure = true;
  const avant = instantaneTicsAfflictions(duel);
  rpgFinDeTour(duel); // tour adverse, pas encore de dose
  assert.deepEqual(nouveauxTicsAfflictions(duel, avant), []);
  rpgFinDeTour(duel); // début du tour du porteur
  const tics = nouveauxTicsAfflictions(duel, avant);
  assert.deepEqual(tics.map(e => [e.affliction, e.cote, e.entiteId, e.montant]), [
    ['poison', 'joueur', victime.id, 1], ['brulure', 'joueur', victime.id, 1],
  ]);
  assert.equal(victime.pv, 2); assert.equal(victime.poison.toursRestants, 1);
  const suivi = instantaneTicsAfflictions(duel);
  assert.equal(rpgBlesserCreature(duel, 'joueur', victime.id, 1).recus, 1);
  assert.deepEqual(nouveauxTicsAfflictions(duel, suivi), [], 'une blessure sans dose ne déclenche rien');
});

test('un tic mortel est enregistré mais aucune pulsation ne vise une créature disparue', () => {
  const [duel, victime] = partie();
  victime.pv = victime.def = 1; victime.poison = { degats: 1, toursRestants: 1 }; victime.brulure = true;
  const avant = instantaneTicsAfflictions(duel);
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  const journal = duel.combatAnimations.filter(e => e.type === 'affliction-tic');
  assert.deepEqual(journal.map(e => e.affliction), ['poison']);
  assert.equal(duel.joueur.creatures.includes(victime), false);
  assert.deepEqual(nouveauxTicsAfflictions(duel, avant), []);
});

test('la vue PvP inverse les camps et les anciens événements ne se rejouent pas', () => {
  const [duel, victime] = partie();
  victime.poison = { degats: 1, toursRestants: 1 }; victime.brulure = false;
  const avant = instantaneTicsAfflictions(rpgPvpVue(duel, 'sorcier'));
  rpgFinDeTour(duel); rpgFinDeTour(duel);
  const vue = rpgPvpVue(duel, 'sorcier');
  assert.deepEqual(nouveauxTicsAfflictions(vue, avant).map(e => [e.cote, e.entiteId, e.affliction]), [['sorcier', victime.id, 'poison']]);
  assert.deepEqual(nouveauxTicsAfflictions(vue, instantaneTicsAfflictions(vue)), []);
});

test('une pile repliée montre les deux types sans perdre les exemplaires', () => {
  assert.deepEqual(ticsPourPile({ 'joueur:a': { poison: 1 }, 'joueur:b': { brulure: 2, poison: 3 } }, ['joueur:a', 'joueur:b']), { poison: 3, brulure: 2 });
  assert.deepEqual(ticsPourPile({}, ['joueur:a']), {});
});
