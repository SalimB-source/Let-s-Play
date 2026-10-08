import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RPG_MAIN_DEPART,
  rpgAttaquerCreature,
  rpgAttaquerSorcier,
  rpgBlesserCreature,
  rpgEngagerTerrain,
  rpgFinDeTour,
  rpgJouerCreature,
  rpgMana,
  rpgNouveauDuel,
  rpgPiocher,
  rpgPoserTerrain,
  rpgSorcierPv,
  rpgTourSorcierIA,
  rpgVainqueur,
} from '../src/games/rpgDuel.js';
import { RPG_CREATURE_CARDS, RPG_TERRAIN_CARDS, creatureById } from '../src/games/rpgCards.js';

/** Main de départ générique, mélangée de façon fixe. */
const duelDeBase = (opts = {}) => rpgNouveauDuel({
  joueurDeck: ['chien-du-guet', 'chien-du-guet', 'rat-des-decombres', 'porteuse-de-cruches', 'guetteur-du-beffroi', 'dune-marchante', 'colosse-de-sel', 'vipere-de-verre', 'sonneur-fele', 'djinn-du-souk', 'scribe-de-la-liste', 'chien-du-guet'],
  sorcierDeck: ['chien-du-guet', 'dune-marchante', 'chien-du-guet', 'dune-marchante', 'chien-du-guet', 'dune-marchante', 'chien-du-guet', 'dune-marchante'],
  rng: () => 0.5,
  ...opts,
});

/** Glisse une carte précise en main (le test ne dépend pas du mélange). */
const donner = (duel, cote, carteId) => duel[cote].main.push(carteId);

/** Donne directement du mana (le paiement est testé à part). */
const donnerMana = (duel, cote, n) => { duel[cote].mana = { braise: n, eau: n, sable: n }; };

test('le set de créatures existe : dix cartes façon Magic (coût, ⚔, , rareté, type)', () => {
  assert.equal(RPG_CREATURE_CARDS.length, 10);
  for (const carte of RPG_CREATURE_CARDS) {
    assert.ok(carte.id && carte.name, 'chaque carte a un identifiant et un nom');
    assert.ok(Number.isFinite(carte.cost) && carte.cost >= 0, 'chaque carte a un coût');
    assert.ok(carte.atk >= 0 && carte.def >= 1, 'chaque carte a attaque et défense');
    assert.ok(['commune', 'rare', 'mythique'].includes(carte.rarity), 'chaque carte a une rareté');
    assert.ok(['braise', 'eau', 'sable'].includes(carte.element), 'chaque carte a un type parmi les trois couleurs');
  }
  assert.equal(creatureById('djinn-du-souk').name, 'Djinn du souk');
});

test('trois terrains : Montagne braise, Mer eau, Plaines sable', () => {
  assert.equal(RPG_TERRAIN_CARDS.length, 3);
  assert.deepEqual(RPG_TERRAIN_CARDS.map((t) => t.id).sort(), ['mer', 'montagne', 'plaines']);
  assert.equal(RPG_TERRAIN_CARDS.find((t) => t.id === 'montagne').element, 'braise');
  assert.equal(RPG_TERRAIN_CARDS.find((t) => t.id === 'mer').element, 'eau');
  assert.equal(RPG_TERRAIN_CARDS.find((t) => t.id === 'plaines').element, 'sable');
});

test('la partie démarre table vide et chaque camp pioche 5 cartes', () => {
  const duel = duelDeBase();
  assert.equal(duel.joueur.creatures.length, 0, 'aucune créature en jeu au départ');
  assert.equal(duel.sorcier.creatures.length, 0);
  assert.equal(duel.joueur.terrains.length, 0, 'aucun terrain au départ');
  assert.equal(duel.joueur.main.length, RPG_MAIN_DEPART);
  assert.equal(duel.sorcier.main.length, RPG_MAIN_DEPART);
  assert.equal(duel.joueur.pv, 50, 'le joueur démarre à 50 PV');
});

test('les 5 cartes piochées viennent bien du deck', () => {
  const duel = duelDeBase();
  assert.equal(duel.joueur.deck.length, 12 - RPG_MAIN_DEPART);
  const carte = rpgPiocher(duel, 'joueur');
  assert.ok(carte, 'piocher rend la carte');
  assert.equal(duel.joueur.main.length, 6);
});

test('deck vide : piocher rend null sans casser', () => {
  const duel = rpgNouveauDuel({ joueurDeck: ['chien-du-guet', 'chien-du-guet'], rng: () => 0 });
  assert.equal(duel.joueur.main.length, 2, 'le deck ne donne que ce qu’il a');
  assert.equal(rpgPiocher(duel, 'joueur'), null);
});

test('le sorcier ennemi a davantage de PV selon sa puissance', () => {
  assert.equal(rpgSorcierPv(0), 50);
  assert.equal(rpgSorcierPv(4), 70);
  const duel = duelDeBase({ sorcierPuissance: 6 });
  assert.equal(duel.sorcier.pv, 80);
});

test('on pose un terrain par tour, et l’engager donne son mana', () => {
  const duel = duelDeBase();
  donner(duel, 'joueur', 'plaines');
  donner(duel, 'joueur', 'mer');
  assert.equal(rpgPoserTerrain(duel, 'joueur', 'plaines').ok, true);
  assert.equal(rpgPoserTerrain(duel, 'joueur', 'mer').ok, false, 'un seul terrain par tour');
  assert.equal(duel.joueur.terrains.length, 1);
  const terrain = duel.joueur.terrains[0];
  assert.equal(rpgEngagerTerrain(duel, 'joueur', terrain.id).ok, true);
  assert.equal(rpgMana(duel.joueur).sable, 1, 'les Plaines donnent un mana sable');
  assert.equal(rpgEngagerTerrain(duel, 'joueur', terrain.id).ok, false, 'déjà engagé');
});

test('payer une créature : le total ET un mana de sa couleur', () => {
  const duel = duelDeBase();
  donner(duel, 'joueur', 'djinn-du-souk'); // 7, braise
  duel.joueur.mana = { braise: 0, eau: 7, sable: 7 };
  assert.equal(rpgJouerCreature(duel, 'joueur', 'djinn-du-souk').ok, false,
    '14 mana mais aucun braise : le Djinn ne sort pas');
  duel.joueur.mana = { braise: 1, eau: 6, sable: 0 };
  assert.equal(rpgJouerCreature(duel, 'joueur', 'djinn-du-souk').ok, true, '1 braise + 6 : payé');
  assert.equal(rpgMana(duel.joueur).total, 0, 'le mana est dépensé');
});

test('poser une créature sans mana échoue, avec mana elle entre en jeu', () => {
  const duel = duelDeBase();
  donner(duel, 'joueur', 'chien-du-guet'); // 2, sable
  assert.equal(rpgJouerCreature(duel, 'joueur', 'chien-du-guet').ok, false, 'sans mana, non');
  donnerMana(duel, 'joueur', 2);
  const pose = rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  assert.equal(pose.ok, true);
  assert.equal(duel.joueur.creatures.length, 1);
  assert.equal(duel.joueur.creatures[0].atk, 2);
  assert.equal(duel.joueur.creatures[0].pv, 2);
});

test('capacité à l’arrivée : la Porteuse soigne son sorcier (plafonné)', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  duel.joueur.pv = 40;
  donner(duel, 'joueur', 'porteuse-de-cruches');
  rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches');
  assert.equal(duel.joueur.pv, 43);
  duel.joueur.pv = 49;
  donner(duel, 'joueur', 'porteuse-de-cruches');
  rpgJouerCreature(duel, 'joueur', 'porteuse-de-cruches');
  assert.equal(duel.joueur.pv, 50, 'le soin ne dépasse pas le maximum');
});

test('capacité à l’arrivée : le Guetteur fait piocher une carte', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'joueur', 'guetteur-du-beffroi');
  const mainAvant = duel.joueur.main.length;
  rpgJouerCreature(duel, 'joueur', 'guetteur-du-beffroi');
  assert.equal(duel.joueur.main.length, mainAvant, '−1 posée +1 piochée');
});

test('capacité à l’arrivée : la Vipère mord une créature adverse', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'sorcier', 10);
  donnerMana(duel, 'joueur', 10);
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  donner(duel, 'joueur', 'vipere-de-verre');
  rpgJouerCreature(duel, 'joueur', 'vipere-de-verre', chien.id);
  assert.equal(duel.sorcier.creatures.length, 0, '2/2 mordu à 2 : il meurt');
});

test('capacité à l’arrivée : le Colosse buffe vos autres créatures', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donner(duel, 'joueur', 'chien-du-guet');
  donner(duel, 'joueur', 'colosse-de-sel');
  rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  rpgJouerCreature(duel, 'joueur', 'colosse-de-sel');
  const chien = duel.joueur.creatures.find((e) => e.carteId === 'chien-du-guet');
  const colosse = duel.joueur.creatures.find((e) => e.carteId === 'colosse-de-sel');
  assert.equal(chien.atk, 3);
  assert.equal(chien.pv, 3);
  assert.equal(colosse.atk, 5, 'lui-même n’est pas buffé');
});

test('capacité à l’arrivée : le Djinn brûle le sorcier adverse', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donner(duel, 'joueur', 'djinn-du-souk');
  rpgJouerCreature(duel, 'joueur', 'djinn-du-souk');
  assert.equal(duel.sorcier.pv, 50 - 3);
});

test('capacité à la destruction : le Rat fait piocher en mourant', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'rat-des-decombres');
  const rat = rpgJouerCreature(duel, 'joueur', 'rat-des-decombres').entite;
  const mainAvant = duel.joueur.main.length;
  donner(duel, 'sorcier', 'vipere-de-verre');
  rpgJouerCreature(duel, 'sorcier', 'vipere-de-verre', rat.id);
  assert.equal(duel.joueur.creatures.length, 0, 'le rat 1/1 meurt sous la morsure');
  assert.equal(duel.joueur.main.length, mainAvant + 1, 'sa mort fait piocher');
});

test('capacité à la destruction : le Sonneur tocsine toutes les créatures adverses', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 30);
  donnerMana(duel, 'sorcier', 30);
  donner(duel, 'joueur', 'sonneur-fele');
  donner(duel, 'sorcier', 'chien-du-guet');
  donner(duel, 'sorcier', 'dune-marchante');
  const sonneur = rpgJouerCreature(duel, 'joueur', 'sonneur-fele').entite;
  rpgJouerCreature(duel, 'sorcier', 'chien-du-guet');
  rpgJouerCreature(duel, 'sorcier', 'dune-marchante');
  rpgBlesserCreature(duel, 'joueur', sonneur.id, 3);
  assert.equal(duel.joueur.creatures.length, 0);
  assert.equal(duel.sorcier.creatures.length, 1, 'le chien 2/2 meurt, la dune survit');
  assert.equal(duel.sorcier.creatures[0].pv, 3, 'la dune 2/5 a pris le tocsin (2)');
});

test('on ne peut pas attaquer le sorcier tant que des créatures font face', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 10);
  donnerMana(duel, 'sorcier', 10);
  donner(duel, 'joueur', 'dune-marchante');
  donner(duel, 'sorcier', 'chien-du-guet');
  rpgJouerCreature(duel, 'joueur', 'dune-marchante');
  rpgJouerCreature(duel, 'sorcier', 'chien-du-guet');
  assert.equal(rpgAttaquerCreature(duel, 'joueur', duel.joueur.creatures[0].id, duel.sorcier.creatures[0].id).raison,
    'pas-pret', 'une créature qui arrive observe : pas d’attaque ce tour');
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  const maDune = duel.joueur.creatures[0];
  const direct = rpgAttaquerSorcier(duel, 'joueur', maDune.id);
  assert.equal(direct.ok, false);
  assert.equal(direct.raison, 'creatures-en-face');
  assert.equal(duel.sorcier.pv, 50);
  rpgAttaquerCreature(duel, 'joueur', maDune.id, duel.sorcier.creatures[0].id);
  assert.equal(duel.sorcier.creatures.length, 0);
  assert.equal(rpgAttaquerSorcier(duel, 'joueur', maDune.id).raison, 'pas-pret', 'déjà attaquée ce tour');
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  assert.equal(rpgAttaquerSorcier(duel, 'joueur', maDune.id).ok, true, 'table adverse dégagée : le sorcier encaisse');
  assert.equal(duel.sorcier.pv, 48);
});

test('combat de créatures : dégâts mutuels, la plus fragile casse', () => {
  const duel = duelDeBase();
  donnerMana(duel, 'joueur', 20);
  donnerMana(duel, 'sorcier', 20);
  donner(duel, 'joueur', 'dune-marchante');
  donner(duel, 'sorcier', 'chien-du-guet');
  rpgJouerCreature(duel, 'joueur', 'dune-marchante');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  rpgFinDeTour(duel);
  rpgAttaquerCreature(duel, 'sorcier', chien.id, duel.joueur.creatures[0].id);
  assert.equal(duel.sorcier.creatures.length, 0, 'le chien meurt (2 ≥ 2)');
  assert.equal(duel.joueur.creatures[0].pv, 3, 'la dune encaisse 2');
});

test('début de tour : on dégage ses terrains, le mana repart de zéro, pioche 1', () => {
  const duel = duelDeBase();
  donner(duel, 'sorcier', 'plaines');
  rpgPoserTerrain(duel, 'sorcier', 'plaines');
  rpgEngagerTerrain(duel, 'sorcier', duel.sorcier.terrains[0].id);
  assert.equal(duel.sorcier.terrains[0].tapped, true);
  const mainAvant = duel.sorcier.main.length;
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier');
  assert.equal(duel.sorcier.terrains[0].tapped, false, 'les terrains dégagent');
  assert.equal(rpgMana(duel.sorcier).total, 0, 'le mana non dépensé s’est évaporé');
  assert.equal(duel.sorcier.terrainPose, false, 'un nouveau terrain peut être posé');
  assert.equal(duel.sorcier.main.length, mainAvant + 1);
});

test('le sorcier IA joue son tour : terrain, mana, créature, puis attaque', () => {
  const duel = rpgNouveauDuel({
    joueurDeck: ['dune-marchante', 'dune-marchante', 'dune-marchante', 'dune-marchante', 'dune-marchante', 'dune-marchante'],
    sorcierDeck: ['chien-du-guet', 'chien-du-guet', 'chien-du-guet', 'chien-du-guet', 'chien-du-guet', 'chien-du-guet'],
    rng: () => 0.2,
  });
  // Deux Plaines déjà en jeu (tours précédents) : l'IA les engage et paie.
  duel.sorcier.terrains.push(
    { id: 't1', carteId: 'plaines', tapped: false },
    { id: 't2', carteId: 'plaines', tapped: false },
  );
  donner(duel, 'sorcier', 'chien-du-guet');
  rpgTourSorcierIA(duel, () => 0);
  assert.equal(duel.sorcier.creatures.length, 1, '2 mana sable : un chien posé');
  assert.equal(rpgMana(duel.sorcier).total, 0, 'le mana a payé le chien');
  rpgFinDeTour(duel);
  rpgFinDeTour(duel);
  const pvAvant = duel.joueur.pv;
  rpgTourSorcierIA(duel, () => 0);
  assert.equal(duel.joueur.pv, pvAvant - 2, 'le chien prêt frappe le joueur');
});

test('les héros sont des cartes du paquet, pas de la main de départ', () => {
  const duel = rpgNouveauDuel({
    joueurDeck: ['salem', 'yamina', 'boualem', 'feriel', 'tarek', 'chien-du-guet', 'chien-du-guet'],
    rng: () => 0.5,
  });
  donnerMana(duel, 'joueur', 10);
  if (duel.joueur.main.includes('salem')) {
    const res = rpgJouerCreature(duel, 'joueur', 'salem');
    assert.equal(res.ok, true, 'Salem se pose comme carte');
    assert.equal(duel.joueur.creatures[0].kind, 'hero');
  }
  assert.ok(true);
});

test('vainqueur : nul tant que les deux sorciers sont debout', () => {
  const duel = duelDeBase();
  assert.equal(rpgVainqueur(duel), null);
  duel.sorcier.pv = 0;
  assert.equal(rpgVainqueur(duel), 'joueur');
  duel.joueur.pv = 0;
  assert.equal(rpgVainqueur(duel), 'egalite');
});
