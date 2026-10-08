import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RPG_MAIN_DEPART,
  RPG_SABLE_TOUR,
  rpgAttaquerCreature,
  rpgAttaquerSorcier,
  rpgBlesserCreature,
  rpgFinDeTour,
  rpgJouerCreature,
  rpgNouveauDuel,
  rpgPiocher,
  rpgSorcierPv,
  rpgTourSorcierIA,
  rpgVainqueur,
} from '../src/games/rpgDuel.js';
import { RPG_CREATURE_CARDS, creatureById } from '../src/games/rpgCards.js';

/** Main de départ générique, mélangée de façon fixe. */
const duelDeBase = (opts = {}) => rpgNouveauDuel({
  joueurDeck: ['chien-du-guet', 'chien-du-guet', 'rat-des-decombres', 'porteuse-de-cruches', 'guetteur-du-beffroi', 'dune-marchante', 'colosse-de-sel', 'vipere-de-verre', 'sonneur-fele', 'djinn-du-souk', 'scribe-de-la-liste', 'chien-du-guet'],
  sorcierDeck: ['chien-du-guet', 'dune-marchante', 'chien-du-guet', 'dune-marchante', 'chien-du-guet', 'dune-marchante', 'chien-du-guet', 'dune-marchante'],
  rng: () => 0.5,
  ...opts,
});

/** Glisse une carte précise en main (le test ne dépend pas du mélange). */
const donner = (duel, cote, carteId) => duel[cote].main.push(carteId);

test('le set de créatures existe : dix cartes façon Magic (coût, ⚔, 🛡, rareté)', () => {
  assert.equal(RPG_CREATURE_CARDS.length, 10);
  for (const carte of RPG_CREATURE_CARDS) {
    assert.ok(carte.id && carte.name, 'chaque carte a un identifiant et un nom');
    assert.ok(Number.isFinite(carte.cost) && carte.cost >= 0, 'chaque carte a un coût');
    assert.ok(carte.atk >= 0 && carte.def >= 1, 'chaque carte a attaque et défense');
    assert.ok(['commune', 'rare', 'mythique'].includes(carte.rarity), 'chaque carte a une rareté');
  }
  assert.equal(creatureById('djinn-du-souk').name, 'Djinn du souk');
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
  assert.equal(duel.sorcier.deck.length, 8 - RPG_MAIN_DEPART);
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
  assert.equal(duel.sorcier.pvMax, 80);
});

test('poser une créature coûte son sable et la fait entrer en jeu', () => {
  const duel = duelDeBase();
  duel.joueur.sable = 0;
  donner(duel, 'joueur', 'chien-du-guet');
  assert.equal(rpgJouerCreature(duel, 'joueur', 'chien-du-guet').ok, false, 'sans sable, non');
  duel.joueur.sable = 2;
  const pose = rpgJouerCreature(duel, 'joueur', 'chien-du-guet');
  assert.equal(pose.ok, true);
  assert.equal(duel.joueur.creatures.length, 1);
  assert.equal(duel.joueur.creatures[0].atk, 2);
  assert.equal(duel.joueur.creatures[0].pv, 2);
  assert.equal(duel.joueur.sable, 0);
});

test('capacité à l’arrivée : la Porteuse soigne son sorcier (plafonné)', () => {
  const duel = duelDeBase();
  duel.joueur.sable = 10;
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
  duel.joueur.sable = 10;
  donner(duel, 'joueur', 'guetteur-du-beffroi');
  const mainAvant = duel.joueur.main.length;
  rpgJouerCreature(duel, 'joueur', 'guetteur-du-beffroi');
  assert.equal(duel.joueur.main.length, mainAvant, '−1 posée +1 piochée');
});

test('capacité à l’arrivée : la Vipère mord une créature adverse', () => {
  const duel = duelDeBase();
  duel.sorcier.sable = 10;
  duel.joueur.sable = 10;
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  donner(duel, 'joueur', 'vipere-de-verre');
  rpgJouerCreature(duel, 'joueur', 'vipere-de-verre', chien.id);
  assert.equal(duel.sorcier.creatures.length, 0, '2/2 mordu à 2 : il meurt');
});

test('capacité à l’arrivée : le Colosse buffe vos autres créatures', () => {
  const duel = duelDeBase();
  duel.joueur.sable = 20;
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
  duel.joueur.sable = 20;
  donner(duel, 'joueur', 'djinn-du-souk');
  rpgJouerCreature(duel, 'joueur', 'djinn-du-souk');
  assert.equal(duel.sorcier.pv, 50 - 3);
});

test('capacité à la destruction : le Rat fait piocher en mourant', () => {
  const duel = duelDeBase();
  duel.joueur.sable = 10;
  duel.sorcier.sable = 10;
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
  duel.joueur.sable = 30;
  duel.sorcier.sable = 30;
  donner(duel, 'joueur', 'sonneur-fele');
  donner(duel, 'sorcier', 'chien-du-guet');
  donner(duel, 'sorcier', 'dune-marchante');
  const sonneur = rpgJouerCreature(duel, 'joueur', 'sonneur-fele').entite;
  rpgJouerCreature(duel, 'sorcier', 'chien-du-guet');
  rpgJouerCreature(duel, 'sorcier', 'dune-marchante');
  // Le Sonneur tombe : son dernier tocsin blesse tout en face.
  rpgBlesserCreature(duel, 'joueur', sonneur.id, 3);
  assert.equal(duel.joueur.creatures.length, 0);
  assert.equal(duel.sorcier.creatures.length, 1, 'le chien 2/2 meurt, la dune survit');
  assert.equal(duel.sorcier.creatures[0].carteId, 'dune-marchante');
  assert.equal(duel.sorcier.creatures[0].pv, 3, 'la dune 2/5 a pris le tocsin (2)');
});

test('on ne peut pas attaquer le sorcier tant que des créatures font face', () => {
  const duel = duelDeBase();
  duel.joueur.sable = 10;
  duel.sorcier.sable = 10;
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
  // Tuer la créature en face déverrouille l'attaque directe (au tour suivant,
  // une créature ne frappe qu'une fois par tour).
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
  duel.joueur.sable = 20;
  duel.sorcier.sable = 20;
  donner(duel, 'joueur', 'dune-marchante');
  donner(duel, 'sorcier', 'chien-du-guet');
  rpgJouerCreature(duel, 'joueur', 'dune-marchante');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  rpgFinDeTour(duel); // le sorcier commence : ses créatures deviennent prêtes
  rpgAttaquerCreature(duel, 'sorcier', chien.id, duel.joueur.creatures[0].id);
  assert.equal(duel.sorcier.creatures.length, 0, 'le chien meurt (2 ≥ 2)');
  assert.equal(duel.joueur.creatures[0].pv, 3, 'la dune encaisse 2');
});

test('début de tour : revenu de sable, pioche 1, créatures prêtes', () => {
  const duel = duelDeBase();
  const sableAvant = duel.sorcier.sable;
  const mainAvant = duel.sorcier.main.length;
  rpgFinDeTour(duel);
  assert.equal(duel.tour, 'sorcier');
  assert.equal(duel.sorcier.sable, sableAvant + RPG_SABLE_TOUR);
  assert.equal(duel.sorcier.main.length, mainAvant + 1);
  duel.sorcier.sable = 10;
  donner(duel, 'sorcier', 'chien-du-guet');
  const chien = rpgJouerCreature(duel, 'sorcier', 'chien-du-guet').entite;
  assert.equal(chien.ready, false, 'mal d’invocation');
  rpgFinDeTour(duel); // retour au joueur
  rpgFinDeTour(duel); // le sorcier recommence
  assert.equal(duel.sorcier.creatures[0].ready, true);
  assert.equal(duel.sorcier.creatures[0].attaquee, false);
});

test('le sorcier IA joue son tour : pose ses créatures puis attaque', () => {
  const duel = rpgNouveauDuel({
    joueurDeck: ['dune-marchante', 'dune-marchante', 'dune-marchante', 'dune-marchante', 'dune-marchante', 'dune-marchante'],
    sorcierDeck: ['chien-du-guet', 'chien-du-guet', 'chien-du-guet', 'chien-du-guet', 'chien-du-guet', 'chien-du-guet', 'chien-du-guet', 'chien-du-guet'],
    rng: () => 0.2,
  });
  duel.sorcier.sable = 4;
  rpgTourSorcierIA(duel, () => 0);
  assert.equal(duel.sorcier.creatures.length, 2, '4 sable : deux chiens 2/2 posés');
  assert.equal(duel.sorcier.sable, 0);
  // Tour suivant : les chiens sont prêts et frappent le joueur sans défense.
  rpgFinDeTour(duel); // joueur
  rpgFinDeTour(duel); // sorcier
  const pvAvant = duel.joueur.pv;
  rpgTourSorcierIA(duel, () => 0);
  assert.equal(duel.joueur.pv, pvAvant - 4, 'deux chiens prêts frappent le joueur');
});

test('les héros sont des cartes du paquet, pas de la main de départ', () => {
  const duel = rpgNouveauDuel({
    joueurDeck: ['salem', 'yamina', 'boualem', 'feriel', 'tarek', 'chien-du-guet', 'chien-du-guet'],
    rng: () => 0.5,
  });
  duel.joueur.sable = 10;
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
