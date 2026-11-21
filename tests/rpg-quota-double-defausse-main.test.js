import { test } from 'node:test';
import assert from 'node:assert/strict';

import { rpgNouveauDuel, rpgMulligan, rpgDemarrerManaEssai, rpgJouerCreature, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature } from '../src/games/rpgMobaLocal.js';
import { invocationPossible } from '../src/games/rpgInvocation.js';
import { cardById, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';

const MELEE = 'chien-du-guet';
const MELEE_2 = 'viking-des-neiges';
const DISTANCE = 'archere-viking-du-givre';
const DISTANCE_2 = 'ashigaru-des-braises';
const TOJIRO = 'tojiro-le-pourfendeur'; // coût 6, défausse créature ou arme
const KAGU = 'kagutsuchi-flamme-originelle'; // coût 6, défausse créature ou magie
const CORBEAU = 'maitre-des-corbeaux'; // coût 7 : deux défausses
const SABRE = 'sabre-maudit'; // magie maudite
const LAME = 'lame-des-ergs'; // arme

function duelPret(main = []) {
  const deck = Array(30).fill(MELEE);
  const d = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => 0.5, modeMana: RPG_MODE_MANA_ESSAI, lignes: true });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  d.tour = 'joueur';
  d.joueur.main = [...main];
  d.joueur.invocationNormaleJouee = false;
  d.joueur.invocationsNormalesLignes = [];
  return d;
}

test('une mêlée ET une à distance par tour, pas une de plus par ligne', () => {
  const d = duelPret([MELEE, MELEE_2, DISTANCE, DISTANCE_2]);
  assert.ok(rpgJouerCreature(d, 'joueur', MELEE).ok, 'la première mêlée passe');
  const secondeMelee = rpgJouerCreature(d, 'joueur', MELEE_2);
  assert.equal(secondeMelee.ok, false);
  assert.equal(secondeMelee.raison, 'creature-limite', 'deux mêlées le même tour : non');
  assert.ok(rpgJouerCreature(d, 'joueur', DISTANCE).ok, 'la ligne à distance reste ouverte');
  const secondeDistance = rpgJouerCreature(d, 'joueur', DISTANCE_2);
  assert.equal(secondeDistance.raison, 'creature-limite', 'deux tireurs le même tour : non');
  assert.deepEqual(d.joueur.invocationsNormalesLignes, ['melee', 'distance']);
  assert.equal(d.joueur.invocationNormaleJouee, true);
});

test('le tour suivant rend les deux lignes', () => {
  const d = duelPret([MELEE, DISTANCE]);
  assert.ok(rpgJouerCreature(d, 'joueur', MELEE).ok && rpgJouerCreature(d, 'joueur', DISTANCE).ok);
  assert.ok(rpgFinDeTour(d).ok ?? true);
  assert.equal(d.tour, 'sorcier');
  assert.equal(d.sorcier.invocationNormaleJouee, false);
  assert.deepEqual(d.sorcier.invocationsNormalesLignes ?? [], []);
});

test('la défausse depuis la main paie le sacrifice, le plateau reste intact', () => {
  const d = duelPret([TOJIRO, MELEE, SABRE]);
  const res = rpgJouerCreature(d, 'joueur', TOJIRO, null, { defausseIds: [MELEE] });
  assert.ok(res.ok, JSON.stringify(res));
  assert.ok(d.joueur.cimetiere.includes(MELEE), 'la créature défaussée est au cimetière');
  assert.deepEqual(d.joueur.main, [SABRE], 'la main a perdu la carte jouée et la défausse');
  assert.equal(d.joueur.creatures.length, 1, 'aucune victime sur le plateau');
  assert.equal(d.joueur.invocationNormaleJouee, true, 'c’est une invocation normale');
});

test('sans victimes ni défausse, le sacrifice reste requis', () => {
  const d = duelPret([TOJIRO, MELEE]);
  const res = rpgJouerCreature(d, 'joueur', TOJIRO);
  assert.equal(res.ok, false);
  assert.equal(res.raison, 'sacrifice-requis');
});

test('ce qu’on peut défausser vient de la fiche, cas par cas', () => {
  // Kagutsuchi brûle créatures et magies : une arme ne le nourrit pas.
  const kagu = duelPret([KAGU, MELEE, LAME, SABRE]);
  const refus = rpgJouerCreature(kagu, 'joueur', KAGU, null, { defausseIds: [LAME] });
  assert.equal(refus.ok, false, 'la Flamme originelle ne mange pas une arme');
  assert.equal(refus.raison, 'sacrifice');
  const magie = rpgJouerCreature(kagu, 'joueur', KAGU, null, { defausseIds: [SABRE] });
  assert.ok(magie.ok, JSON.stringify(magie));
  assert.ok(kagu.joueur.cimetiere.includes(SABRE), 'la magie défaussée est au cimetière');
  // Tojiro, lui, accepte l’arme comme la créature — mais pas une magie.
  const d = duelPret([TOJIRO, LAME, SABRE]);
  assert.ok(rpgJouerCreature(d, 'joueur', TOJIRO, null, { defausseIds: [LAME] }).ok, 'le pourfendeur défausse sa lame');
  const d2 = duelPret([TOJIRO, SABRE]);
  assert.equal(rpgJouerCreature(d2, 'joueur', TOJIRO, null, { defausseIds: [SABRE] }).ok, false,
    'défausser le sabre maudit ne paie pas Tojiro');
});

test('coût 7 : deux cartes défaussées, pas une', () => {
  const d = duelPret([CORBEAU, MELEE, MELEE_2, SABRE]);
  const unSeul = rpgJouerCreature(d, 'joueur', CORBEAU, null, { defausseIds: [MELEE] });
  assert.equal(unSeul.ok, false);
  assert.equal(unSeul.raison, 'sacrifice');
  const soiMeme = rpgJouerCreature(d, 'joueur', CORBEAU, null, { defausseIds: [CORBEAU, MELEE] });
  assert.equal(soiMeme.ok, false, 'la carte jouée ne paie pas sa propre arrivée');
  const res = rpgJouerCreature(d, 'joueur', CORBEAU, null, { defausseIds: [MELEE, MELEE_2] });
  assert.ok(res.ok, JSON.stringify(res));
  assert.ok(d.joueur.cimetiere.includes(MELEE) && d.joueur.cimetiere.includes(MELEE_2));
});

test('invocationPossible ouvre la voie de la défausse même sans victimes', () => {
  const avec = duelPret([TOJIRO, MELEE]);
  assert.equal(invocationPossible(avec, 'joueur', cardById(TOJIRO)), true);
  const sans = duelPret([TOJIRO]);
  assert.equal(invocationPossible(sans, 'joueur', cardById(TOJIRO)), false, 'rien à défausser, rien à sacrifier');
});

test('MOBA : la défausse depuis la main paie aussi', () => {
  const deck = Array(30).fill(MELEE);
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => 0.5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  d.tour = 'joueur';
  d.joueur.main = [KAGU, MELEE];
  const res = rpgMobaJouerCreature(d, 'joueur', KAGU, 'left', 0, { defausseIds: [MELEE] });
  assert.ok(res.ok, JSON.stringify(res));
  assert.ok(d.joueur.cimetiere.includes(MELEE), 'la défausse est payée');
  assert.equal(d.joueur.creatures.length, 1, 'aucune victime sur les voies');
});
