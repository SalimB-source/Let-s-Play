import { test } from 'node:test';
import assert from 'node:assert/strict';

import { rpgNouveauDuel, rpgMulligan, rpgDemarrerManaEssai, rpgJouerCreature, rpgFinDeTour } from '../src/games/rpgDuel.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature } from '../src/games/rpgMobaLocal.js';
import { invocationPossible, retoursAuDeckInvocation, sacrificesInvocation } from '../src/games/rpgInvocation.js';
import { cardById, RPG_ELEMENTS } from '../src/games/rpgCards.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';

const MELEE = 'chien-du-guet';
const MELEE_2 = 'viking-des-neiges';
const DISTANCE = 'archere-viking-du-givre';
const DISTANCE_2 = 'ashigaru-des-braises';
const TOJIRO = 'tojiro-le-pourfendeur'; // coût 6 : 1 carte, créature ou arme
const KAGU = 'kagutsuchi-flamme-originelle'; // coût 6 : 1 carte, créature ou magie
const CORBEAU = 'maitre-des-corbeaux'; // coût 7 : 2 cartes
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

test('plus aucun sacrifice : le prix est un retour dans le deck, selon le coût', () => {
  assert.equal(sacrificesInvocation(cardById(TOJIRO)), 0, 'une invocation ne sacrifie plus rien');
  assert.equal(retoursAuDeckInvocation(cardById(MELEE)), 0, 'coût < 5 : rien à rendre');
  assert.equal(retoursAuDeckInvocation(cardById(TOJIRO)), 1, 'coût 6 : une carte');
  assert.equal(retoursAuDeckInvocation(cardById(CORBEAU)), 2, 'coût 7 : deux cartes');
});

test('5 étoiles ou plus : la carte choisie repart dans le deck, le plateau reste intact', () => {
  const d = duelPret([TOJIRO, MELEE, SABRE]);
  d.joueur.creatures = [];
  const deckAvant = d.joueur.deck.length;
  const res = rpgJouerCreature(d, 'joueur', TOJIRO, null, { retourIds: [MELEE] });
  assert.ok(res.ok, JSON.stringify(res));
  assert.deepEqual(res.retourIds, [MELEE]);
  assert.equal(d.joueur.main.includes(MELEE), false, 'la carte payée quitte la main');
  assert.equal(d.joueur.cimetiere.includes(MELEE), false, 'elle n’est pas défaussée');
  assert.equal(d.joueur.deck.length, deckAvant + 1, 'elle est bien dans le deck');
  assert.ok(d.joueur.deck.includes(MELEE));
  assert.equal(d.joueur.creatures.length, 1, 'seule la créature invoquée est sur le plateau');
  assert.equal(d.joueur.invocationNormaleJouee, true, 'c’est une invocation normale');
  assert.ok(d.log.some((ligne) => /remet(tez)? .* dans votre deck/i.test(ligne)), d.log.join(' | '));
});

test('sans carte rendue, l’invocation est refusée — et rien n’est sacrifié', () => {
  const d = duelPret([TOJIRO, MELEE]);
  d.joueur.creatures = [];
  const res = rpgJouerCreature(d, 'joueur', TOJIRO);
  assert.equal(res.ok, false);
  assert.equal(res.raison, 'retour-requis');
  assert.equal(res.nombreRetours, 1);
  const refusParVictime = rpgJouerCreature(d, 'joueur', TOJIRO, null, { sacrificeIds: ['entite-1'] });
  assert.equal(refusParVictime.ok, false, 'présenter une créature du plateau ne paie plus');
  assert.equal(refusParVictime.raison, 'retour-deck');
  assert.equal(d.joueur.creatures.length, 0, 'le plateau n’a rien perdu');
});

test('ce qu’on peut rendre vient de la fiche, cas par cas', () => {
  // Kagutsuchi accepte créature et magie : une arme ne le nourrit pas.
  const kagu = duelPret([KAGU, MELEE, LAME, SABRE]);
  const refus = rpgJouerCreature(kagu, 'joueur', KAGU, null, { retourIds: [LAME] });
  assert.equal(refus.ok, false, 'la Flamme originelle ne prend pas une arme');
  assert.equal(refus.raison, 'retour-deck');
  const magie = rpgJouerCreature(kagu, 'joueur', KAGU, null, { retourIds: [SABRE] });
  assert.ok(magie.ok, JSON.stringify(magie));
  assert.ok(kagu.joueur.deck.includes(SABRE), 'la magie rendue est dans le deck');
  assert.equal(kagu.joueur.cimetiere.includes(SABRE), false);
  // Tojiro, lui, accepte l’arme comme la créature — mais pas une magie.
  const d = duelPret([TOJIRO, LAME, SABRE]);
  assert.ok(rpgJouerCreature(d, 'joueur', TOJIRO, null, { retourIds: [LAME] }).ok, 'le pourfendeur rend sa lame');
  const d2 = duelPret([TOJIRO, SABRE]);
  assert.equal(rpgJouerCreature(d2, 'joueur', TOJIRO, null, { retourIds: [SABRE] }).ok, false,
    'rendre le sabre maudit ne paie pas Tojiro');
});

test('coût 7 : deux cartes rendues, pas une', () => {
  const d = duelPret([CORBEAU, MELEE, MELEE_2, SABRE]);
  const unSeul = rpgJouerCreature(d, 'joueur', CORBEAU, null, { retourIds: [MELEE] });
  assert.equal(unSeul.ok, false);
  assert.equal(unSeul.raison, 'retour-deck');
  const soiMeme = rpgJouerCreature(d, 'joueur', CORBEAU, null, { retourIds: [CORBEAU, MELEE] });
  assert.equal(soiMeme.ok, false, 'la carte jouée ne paie pas sa propre arrivée');
  const res = rpgJouerCreature(d, 'joueur', CORBEAU, null, { retourIds: [MELEE, MELEE_2] });
  assert.ok(res.ok, JSON.stringify(res));
  assert.deepEqual(res.retourIds.slice().sort(), [MELEE, MELEE_2].sort());
  assert.ok(d.joueur.deck.includes(MELEE) && d.joueur.deck.includes(MELEE_2));
  assert.deepEqual(d.joueur.main, [SABRE]);
});

test('les anciens noms de paramètre paient le même retour au deck', () => {
  const a = duelPret([TOJIRO, MELEE, SABRE]);
  assert.ok(rpgJouerCreature(a, 'joueur', TOJIRO, null, { defausseIds: [MELEE] }).ok, 'defausseIds');
  assert.ok(a.joueur.deck.includes(MELEE) && !a.joueur.cimetiere.includes(MELEE));
  const b = duelPret([TOJIRO, MELEE, SABRE]);
  assert.ok(rpgJouerCreature(b, 'joueur', TOJIRO, null, { sacrificeIds: [MELEE] }).ok, 'sacrificeIds');
  assert.ok(b.joueur.deck.includes(MELEE) && !b.joueur.cimetiere.includes(MELEE));
});

test('invocationPossible ne regarde plus le plateau, seulement la main', () => {
  const avec = duelPret([TOJIRO, MELEE]);
  assert.equal(invocationPossible(avec, 'joueur', cardById(TOJIRO)), true);
  const sans = duelPret([TOJIRO]);
  assert.equal(invocationPossible(sans, 'joueur', cardById(TOJIRO)), false, 'rien à rendre dans le deck');
});

test('le sorcier (IA) rend tout seul ses cartes les moins chères', () => {
  const d = duelPret([MELEE]);
  d.tour = 'sorcier';
  d.sorcier.main = [TOJIRO, CORBEAU, MELEE_2];
  d.sorcier.invocationNormaleJouee = false;
  d.sorcier.invocationsNormalesLignes = [];
  const deckAvant = d.sorcier.deck.length;
  const res = rpgJouerCreature(d, 'sorcier', TOJIRO);
  assert.ok(res.ok, JSON.stringify(res));
  assert.deepEqual(res.retourIds, [MELEE_2], 'la carte la moins chère d’abord');
  assert.equal(d.sorcier.deck.length, deckAvant + 1);
  assert.equal(d.sorcier.creatures.length, 1, 'aucune victime sur le plateau');
});

test('MOBA : le retour au deck paie, les voies gardent leurs créatures', () => {
  const deck = Array(30).fill(MELEE);
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => 0.5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  for (const camp of ['joueur', 'sorcier']) d[camp].mana = Object.fromEntries(RPG_ELEMENTS.map((e) => [e, 40]));
  d.tour = 'joueur';
  d.joueur.main = [KAGU, MELEE];
  const refus = rpgMobaJouerCreature(d, 'joueur', KAGU, 'left', 0, {});
  assert.equal(refus.ok, false, 'sans carte choisie, la pose est refusée');
  assert.equal(refus.raison, 'retour-requis');
  const res = rpgMobaJouerCreature(d, 'joueur', KAGU, 'left', 0, { retourIds: [MELEE] });
  assert.ok(res.ok, JSON.stringify(res));
  assert.ok(d.joueur.deck.includes(MELEE), 'la carte payée est dans le deck');
  assert.equal(d.joueur.cimetiere.includes(MELEE), false);
  assert.equal(d.joueur.creatures.length, 1, 'aucune victime sur les voies');
});
