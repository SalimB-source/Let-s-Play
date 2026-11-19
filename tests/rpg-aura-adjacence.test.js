/**
 * L'Aura du Sablier — une règle de **voisinage**, jamais de camp entier.
 *
 * Quatre cartes impriment le mot-clé (Tarek, Amani, Kenshi de la forge, Bou
 * Jeloud). Chacune ne renforce que les créatures de la **même rangée, une
 * colonne d'écart** : ni elle-même, ni la rangée d'en face, ni le camp adverse.
 * Depuis que les créatures avancent, la position est la vraie (`rpgChamp.js`,
 * `campPose` compris) : une créature qui a franchi la trouée n'est plus la
 * voisine de celles qu'elle a laissées derrière elle.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  rpgBlesserCreature,
  rpgJouerCreature,
  rpgNouveauDuel,
} from '../src/games/rpgDuel.js';
import { RPG_ELEMENTS, cardById, duelCardById } from '../src/games/rpgCards.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { EFFET_DEFINITIONS, pastillesPourCarte } from '../src/games/effetIcons.js';

/** Deux lignes de cinq cases : front 0-4, fond 5-9. */
const table = () => rpgNouveauDuel({
  joueurDeck: [], sorcierDeck: [], rng: () => 0.5,
  modeMana: RPG_MODE_MANA_ESSAI,
  joueurCouleurs: ['sable'], sorcierCouleurs: ['sable'],
  lignes: true,
});

/** Pose une carte sur la case demandée (le quota d'invocation est neutralisé :
 *  c'est une table de laboratoire, pas un tour de jeu). */
const poser = (duel, cote, carteId, emplacement = null) => {
  duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((couleur) => [couleur, 20]));
  duel[cote].manaChoixEnAttente = false;
  duel[cote].invocationNormaleJouee = false;
  duel[cote].main.push(carteId);
  const tour = duel.tour;
  duel.tour = cote; // scène de laboratoire : chacun pose sur son tour
  const res = rpgJouerCreature(duel, cote, carteId, null, { emplacement });
  duel.tour = tour;
  assert.equal(res.ok, true, `${carteId} doit entrer en jeu : ${res.raison}`);
  res.entite.ready = true;
  res.entite.malInvocation = false;
  return res.entite;
};

/** Un point de dégâts nul force le recalcul des auras, comme le ferait une
 *  arrivée ou une mort. */
const rafraichir = (duel) => {
  const temoin = duel.joueur.creatures[0];
  if (temoin) rpgBlesserCreature(duel, 'joueur', temoin.id, 0, null, null, 'capacite', 'kenshi-de-la-forge');
};

const stats = (entite) => [entite.atk, entite.def];

const AURAS = ['tarek', 'amani-des-ksour', 'kenshi-de-la-forge', 'bou-jeloud'];

test('les quatre sources impriment l’Aura de voisinage', () => {
  for (const id of AURAS) {
    const carte = duelCardById(id);
    assert.ok(carte?.aura, `${id} porte bien une aura`);
    assert.match(carte.text, /créatures (Sable )?adjacentes/, `${id} annonce le voisinage`);
    assert.doesNotMatch(carte.text, /toutes vos autres|vos créatures Sable gagnent/,
      `${id} ne parle plus de tout le camp`);
    assert.ok(pastillesPourCarte(carte).some((pastille) => pastille.cle === 'aura'),
      `${id} affiche la pastille Aura`);
  }
  assert.match(EFFET_DEFINITIONS.aura(), /créatures adjacentes/,
    'la définition du mot-clé explique la règle');
  assert.match(EFFET_DEFINITIONS.aura(), /case vide/,
    'et dit qu’un trou coupe le voisinage');
  assert.equal(cardById('kenshi-de-la-forge').aura.saufSoi, true,
    'la donnée historique `saufSoi` reste lisible');
});

test('une case voisine reçoit le renfort, une case vide le coupe', () => {
  const duel = table();
  // Front : 0 Kenshi — 1 VIDE — 2 Chien.
  const kenshi = poser(duel, 'joueur', 'kenshi-de-la-forge', 0);
  const chien = poser(duel, 'joueur', 'chien-du-guet', 2);
  assert.deepEqual(stats(kenshi), [1, 2], 'une source ne se renforce pas elle-même');
  assert.deepEqual(stats(chien), [2, 2], 'deux colonnes d’écart : rien');

  // Le Fennec prend la case 1 : il est voisin des deux.
  const fennec = poser(duel, 'joueur', 'fennec-des-decombres', 1);
  assert.deepEqual(stats(fennec), [4, 1], 'le Fennec, entre les deux, reçoit +1 ATQ');
  assert.deepEqual(stats(kenshi), [1, 2], 'Kenshi reste à sa valeur imprimée');
});

test('la rangée compte : le fond n’est pas voisin du front', () => {
  const duel = table();
  poser(duel, 'joueur', 'kenshi-de-la-forge', 0); // front, colonne 0
  const archer = poser(duel, 'joueur', 'archere-viking-du-givre', null); // fond
  assert.equal(archer.emplacement, 5, 'l’archère se range au fond, colonne 0');
  assert.deepEqual(stats(archer), [2, 5], 'même colonne, autre rangée : aucune aura');
});

test('une créature qui a franchi la trouée n’est plus voisine de ses anciens voisins', () => {
  const duel = table();
  poser(duel, 'joueur', 'kenshi-de-la-forge', 0);
  const chien = poser(duel, 'joueur', 'chien-du-guet', 1);
  assert.deepEqual(stats(chien), [3, 2], 'voisin : +1 ATQ');

  // Le Chien passe chez le sorcier, à la même case locale (front adverse,
  // colonne 1). Il n'est plus sur la rangée de Kenshi.
  chien.campPose = 'sorcier';
  chien.avancee = true;
  chien.bouge = true;
  poser(duel, 'joueur', 'fennec-des-decombres', 3); // force le recalcul
  assert.deepEqual(stats(chien), [2, 2], 'l’aura ne traverse pas la ligne neutre');
});

test('deux sources voisines cumulent, deux sources éloignées se taisent', () => {
  const duel = table();
  // Front : 0 Kenshi — 1 Bou Jeloud — 2 Chien.
  poser(duel, 'joueur', 'kenshi-de-la-forge', 0);
  const bou = poser(duel, 'joueur', 'bou-jeloud', 1);
  const chien = poser(duel, 'joueur', 'chien-du-guet', 2);
  assert.deepEqual(stats(bou), [4, 4], 'Bou Jeloud reçoit l’aura de Kenshi');
  assert.deepEqual(stats(chien), [3, 2], 'le Chien ne reçoit que Bou Jeloud, pas Kenshi');

  // Une Amani prend la case 3 : elle est voisine du Chien, pas de Kenshi.
  const amani = poser(duel, 'joueur', 'amani-des-ksour', 3);
  assert.deepEqual(stats(chien), [3, 3], 'le Chien gagne +0/+1');
  assert.deepEqual(stats(amani), [2, 5], 'Amani ne se protège pas elle-même');
});

test('le camp adverse n’est jamais renforcé', () => {
  const duel = table();
  poser(duel, 'joueur', 'kenshi-de-la-forge', 0);
  const leur = poser(duel, 'sorcier', 'chien-du-guet', 0);
  assert.deepEqual(stats(leur), [2, 2], 'l’aura ne franchit pas le camp');
});

test('la perte de l’aura ne tue pas et ne fait pas dériver les statistiques', () => {
  const duel = table();
  poser(duel, 'joueur', 'kenshi-de-la-forge', 0);
  const chien = poser(duel, 'joueur', 'chien-du-guet', 1);
  assert.deepEqual(stats(chien), [3, 2]);
  // Kenshi meurt : le Chien retombe exactement à sa valeur imprimée.
  kenshiMort(duel, 'kenshi-de-la-forge');
  rafraichir(duel);
  assert.deepEqual(stats(chien), [2, 2], 'le bonus retombe, sans reste');
  assert.ok(chien.pv > 0, 'perdre une aura ne tue jamais');
});

function kenshiMort(duel, carteId) {
  const source = duel.joueur.creatures.find((entite) => entite.carteId === carteId);
  if (source) rpgBlesserCreature(duel, 'joueur', source.id, 99, null, null, 'capacite', 'trait-de-braise');
}
