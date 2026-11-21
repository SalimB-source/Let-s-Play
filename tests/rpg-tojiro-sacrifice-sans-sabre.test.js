/** Tojiro : la défausse du Sabre maudit n'est pas un péage pour qui sacrifie.
 *
 *  La carte imprime une Invocation spéciale — « sans sacrifice ni invocation
 *  normale » — dont la condition est de défausser un Sabre maudit. Cette offre
 *  ne doit pas confisquer l'invocation ordinaire : un joueur qui présente la
 *  victime exigée par le coût 6 invoque Tojiro normalement, garde son Sabre
 *  maudit, paie son mana et consomme son invocation du tour.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { cardById } from '../src/games/rpgCards.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { rpgNouveauDuel, rpgMulligan, rpgDemarrerManaEssai, rpgJouerCreature } from '../src/games/rpgDuel.js';
import { sacrificesInvocation, rpgInvocationNormalePossible } from '../src/games/rpgInvocation.js';
import { rpgMobaNouveauDuel, rpgMobaJouerCreature, rpgMobaSacrificesInvocation, rpgMobaPasserCreature } from '../src/games/rpgMobaLocal.js';

const ID = 'tojiro-le-pourfendeur';
const SABRE = 'sabre-maudit';
const VICTIME = 'chien-du-guet';

function duelPret() {
  const deck = Array(30).fill(VICTIME);
  const d = rpgNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => 0.5, modeMana: RPG_MODE_MANA_ESSAI });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  // Une victime dégagée, puis Tojiro et son Sabre en main.
  d.joueur.main = [VICTIME];
  const pose = rpgJouerCreature(d, 'joueur', VICTIME);
  assert.ok(pose.ok, JSON.stringify(pose));
  d.joueur.main = [ID, SABRE];
  d.joueur.mana = { ...d.joueur.mana, braise: 20 };
  // La pose d'essai a consommé l'invocation du tour : Tojiro retrouve la sienne.
  d.joueur.invocationNormaleJouee = false;
  return { d, victime: pose.entite ?? d.joueur.creatures.at(-1) };
}

test('la condition de l’Invocation spéciale reste remplie — mais l’invocation normale aussi', () => {
  const { d } = duelPret();
  const tojiro = cardById(ID);
  assert.equal(sacrificesInvocation(tojiro, d, 'joueur'), 0, 'Invocation spéciale : aucun sacrifice');
  assert.equal(sacrificesInvocation(tojiro, d, 'joueur', false, false), 1, 'invocation normale : un sacrifice');
  assert.equal(rpgInvocationNormalePossible(d, 'joueur', tojiro), true);
});

test('invoquer par sacrifice garde le Sabre maudit en main', () => {
  const { d, victime } = duelPret();
  const res = rpgJouerCreature(d, 'joueur', ID, null, { sacrificeIds: [victime.id], choixCoutInvocation: null });
  assert.ok(res.ok, JSON.stringify(res));
  assert.ok(d.joueur.main.includes(SABRE), 'le Sabre maudit n’est pas défaussé');
  assert.ok(!d.joueur.cimetiere.includes(SABRE), 'il ne part pas au cimetière');
  assert.ok(!d.joueur.creatures.some((e) => e.id === victime.id), 'la victime est bien sacrifiée');
  assert.equal(d.joueur.invocationNormaleJouee, true, 'l’invocation normale du tour est consommée');
  assert.ok(d.joueur.creatures.some((e) => e.carteId === ID), 'Tojiro est en jeu');
});

test('l’invocation spéciale reste offerte, et paie son Sabre maudit', () => {
  const { d, victime } = duelPret();
  const res = rpgJouerCreature(d, 'joueur', ID, null, { choixCoutInvocation: SABRE });
  assert.ok(res.ok, JSON.stringify(res));
  assert.ok(d.joueur.cimetiere.includes(SABRE), 'le Sabre maudit est défaussé');
  assert.ok(d.joueur.creatures.some((e) => e.id === victime.id), 'aucune victime n’est sacrifiée');
  assert.equal(d.joueur.invocationNormaleJouee ?? false, false, 'l’invocation normale reste disponible');
});

test('sans sacrifice ni choix de coût, rien n’est payé', () => {
  const { d, victime } = duelPret();
  const avant = JSON.stringify(d);
  const res = rpgJouerCreature(d, 'joueur', ID);
  assert.equal(res.ok, false);
  assert.equal(res.raison, 'choix-cout-requis');
  assert.equal(JSON.stringify(d), avant, 'la table n’a pas bougé');
  assert.ok(d.joueur.creatures.some((e) => e.id === victime.id));
});

function duelMobaPret() {
  const deck = Array(30).fill('ashigaru-des-braises');
  const d = rpgMobaNouveauDuel({ joueurDeck: deck, sorcierDeck: deck, rng: () => 0.5 });
  assert.ok(rpgMulligan(d, 'joueur', []).ok && rpgMulligan(d, 'sorcier', []).ok && rpgDemarrerManaEssai(d).ok);
  d.joueur.main = ['gardienne-des-portes-de-sable'];
  d.joueur.mana.sable = 20;
  const pose = rpgMobaJouerCreature(d, 'joueur', 'gardienne-des-portes-de-sable', 'left', 0);
  assert.ok(pose.ok && pose.entite, JSON.stringify(pose));
  d.joueur.main = [ID, SABRE];
  d.joueur.mana = { ...d.joueur.mana, braise: 20, tenebres: 20 };
  // Le quota d'invocation du tour revient à Tojiro, comme au duel classique.
  if (d.moba?.creaturesJouees) d.moba.creaturesJouees = {};
  return { d, victime: pose.entite };
}

test('MOBA : une victime présentée écarte la défausse du Sabre maudit', () => {
  const { d, victime } = duelMobaPret();
  assert.equal(rpgMobaSacrificesInvocation(d, 'joueur', cardById(ID)), 0, 'spéciale offerte');
  assert.equal(rpgMobaSacrificesInvocation(d, 'joueur', cardById(ID), true), 1, 'invocation normale : un sacrifice');
  // La victime cède sa case : c'est là que la nouvelle créature entre en jeu.
  const res = rpgMobaJouerCreature(d, 'joueur', ID, 'left', 0, { sacrificeIds: [victime.id], ouvrirReponse: true });
  assert.ok(res.ok, JSON.stringify(res));
  assert.ok(d.joueur.main.includes(SABRE), 'le Sabre maudit reste en main');
  // L'annonce passe : la victime est alors réellement sacrifiée.
  assert.ok(rpgMobaPasserCreature(d, 'sorcier').ok);
  assert.ok(!d.joueur.creatures.some((e) => e.id === victime.id), 'la victime est sacrifiée');
  assert.ok(d.joueur.creatures.some((e) => e.carteId === ID), 'Tojiro entre en jeu');
});

test('MOBA : l’Invocation spéciale paie toujours son Sabre maudit', () => {
  const { d, victime } = duelMobaPret();
  const res = rpgMobaJouerCreature(d, 'joueur', ID, 'left', 1, { choixCoutInvocation: SABRE, ouvrirReponse: true });
  assert.ok(res.ok, JSON.stringify(res));
  assert.ok(d.joueur.cimetiere.includes(SABRE));
  assert.ok(d.joueur.creatures.some((e) => e.id === victime.id), 'aucune victime n’est sacrifiée');
});
