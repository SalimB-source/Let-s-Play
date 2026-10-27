/**
 * L'Aura du Sablier — une règle de VOISINAGE, plus une règle de camp entier.
 *
 * Quatre cartes impriment le mot-clé (Tarek, Amani, Kenshi de la forge, Bou
 * Jeloud). Chacune ne renforce désormais que les créatures des deux cases qui
 * entourent la sienne, jamais elle-même, jamais le camp adverse. La Résonance
 * et la Bannière, elles, gardent leurs règles de table. Voir `rpgDuel.js`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  rpgBlesserCreature,
  rpgEmplacementsChamp,
  rpgJouerCreature,
  rpgNouveauDuel,
  rpgResonanceEnJeu,
} from '../src/games/rpgDuel.js';
import { RPG_ELEMENTS, cardById, duelCardById } from '../src/games/rpgCards.js';
import { RPG_MODE_MANA_ESSAI } from '../src/games/rpgManaEssai.js';
import { EFFET_DEFINITIONS, pastillesPourCarte } from '../src/games/effetIcons.js';

const duelVide = (options = {}) => rpgNouveauDuel({
  joueurDeck: [], sorcierDeck: [], rng: () => 0.5, ...options,
});
const duelCases = () => duelVide({
  modeMana: RPG_MODE_MANA_ESSAI,
  joueurCouleurs: ['sable'],
  sorcierCouleurs: ['sable'],
});
const manaPlein = (duel, cote) => {
  duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((couleur) => [couleur, 20]));
};
/** Pose une carte ; `emplacement` choisit sa case (mode sans terrains). */
const poser = (duel, cote, carteId, emplacement = null) => {
  manaPlein(duel, cote);
  // Le duel d'essai attend le choix du premier mana : on le neutralise pour
  // isoler la règle d'adjacence, comme le font les tests du mode lui-même.
  duel[cote].manaChoixEnAttente = false;
  duel[cote].main.push(carteId);
  const res = rpgJouerCreature(duel, cote, carteId, null, { emplacement });
  assert.equal(res.ok, true, `${carteId} entre en jeu`);
  return res.entite;
};

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

test('une case vide coupe le voisinage (mode sans terrains)', () => {
  const duel = duelCases();
  // Cases : 0 Chien — 1 VIDE — 2 Amani — 3 Fennec — 4 VIDE.
  const chien = poser(duel, 'joueur', 'chien-du-guet', 0);
  const amani = poser(duel, 'joueur', 'amani-des-ksour', 2);
  const fennec = poser(duel, 'joueur', 'fennec-des-decombres', 3);
  const cases = rpgEmplacementsChamp(duel.joueur);
  assert.equal(cases[1], null, 'la case 1 est bien restée vide');
  assert.equal(chien.emplacement, 0);
  assert.equal(amani.emplacement, 2);

  assert.deepEqual([chien.atk, chien.def, chien.pv], [2, 2, 2],
    'le Chien, séparé d’Amani par une case vide, ne reçoit rien');
  assert.deepEqual([fennec.atk, fennec.def, fennec.pv], [3, 2, 2],
    'le Fennec, case 3 voisine de la case 2, reçoit +0/+1');
  assert.deepEqual([amani.atk, amani.def, amani.pv], [2, 5, 5],
    'Amani ne se protège pas elle-même');
});

test('remplir le trou ne rend pas les cases éloignées adjacentes', () => {
  const duel = duelCases();
  const chien = poser(duel, 'joueur', 'chien-du-guet', 0);
  const amani = poser(duel, 'joueur', 'amani-des-ksour', 2);
  // Bou Jeloud prend la première case libre (1) : il devient voisin des deux.
  const bou = poser(duel, 'joueur', 'bou-jeloud', null);
  assert.equal(bou.emplacement, 1);
  assert.deepEqual([chien.atk, chien.def], [3, 2],
    'le Chien gagne +1/+0 de Bou Jeloud, mais pas l’égide d’Amani (case 2)');
  assert.deepEqual([amani.atk, amani.def], [3, 5],
    'Amani gagne +1/+0 de Bou Jeloud, sans égide sur elle-même');
  assert.deepEqual([bou.atk, bou.def], [3, 5],
    'Bou Jeloud ne se renforce pas lui-même, mais reçoit l’égide d’Amani');
});

test('deux sources voisines cumulent, deux sources éloignées non', () => {
  const duel = duelCases();
  // Cases : 0 Kenshi — 1 Chien — 2 Kenshi — 3 Fennec — 4 VIDE.
  const premier = poser(duel, 'joueur', 'kenshi-de-la-forge', 0);
  const chien = poser(duel, 'joueur', 'chien-du-guet', 1);
  const second = poser(duel, 'joueur', 'kenshi-de-la-forge', 2);
  const fennec = poser(duel, 'joueur', 'fennec-des-decombres', 3);
  assert.equal(chien.atk, 4, '2/2 + deux forges voisines (+2/+0)');
  assert.equal(fennec.atk, 4, '3/1 + la forge de la case 2 (+1/+0)');
  assert.equal(premier.atk, 1, 'le premier Kenshi ne reçoit rien du second, trop loin');
  assert.equal(second.atk, 1, 'et réciproquement');
  assert.equal(chien.def, 2, 'la forge ne touche jamais la défense');
});

test('Bou Jeloud applique son aura comme le Kenshi', () => {
  const duel = duelVide();
  const bou = poser(duel, 'joueur', 'bou-jeloud');
  const voisin = poser(duel, 'joueur', 'chien-du-guet');
  const loin = poser(duel, 'joueur', 'fennec-des-decombres');
  const adverse = poser(duel, 'sorcier', 'chien-du-guet');
  assert.deepEqual([bou.atk, bou.def], [3, 4], 'Bou Jeloud ne se renforce pas lui-même');
  assert.deepEqual([voisin.atk, voisin.def], [3, 2], 'son voisin gagne +1/+0');
  assert.deepEqual([loin.atk, loin.def], [3, 1], 'la créature à deux cases reste nue');
  assert.deepEqual([adverse.atk, adverse.def], [2, 2], 'l’aura ne franchit pas les camps');
});

test('quand une voisine meurt, la rangée se resserre et l’aura suit', () => {
  const duel = duelVide();
  const kenshi = poser(duel, 'joueur', 'kenshi-de-la-forge'); // case 0
  const chien = poser(duel, 'joueur', 'chien-du-guet');      // case 1, forgé
  const fennec = poser(duel, 'joueur', 'fennec-des-decombres'); // case 2, nu
  assert.deepEqual([chien.atk, fennec.atk], [3, 3], 'seule la case 1 est forgée');
  assert.equal(rpgBlesserCreature(duel, 'joueur', chien.id, 100, 'braise').ok, true);
  assert.equal(duel.joueur.creatures.length, 2, 'le Chien quitte la table');
  assert.equal(fennec.atk, 4, 'le Fennec devient la voisine du Kenshi et gagne +1/+0');
  assert.equal(kenshi.atk, 1, 'le Kenshi ne se forge toujours pas lui-même');
});

test('Tarek ne renforce pas sa propre case et garde son filtre Sable', () => {
  const duel = duelVide();
  // Cases : 0 Porteuse (Eau) — 1 Tarek — 2 et 3 ses deux jetons Sable.
  const eau = poser(duel, 'joueur', 'porteuse-de-cruches');
  const tarek = poser(duel, 'joueur', 'tarek');
  const jetons = duel.joueur.creatures.filter((entite) => entite.carteId === 'chien-de-sable');
  assert.deepEqual([tarek.atk, tarek.def], [4, 5], 'Tarek garde sa fiche 4/5');
  assert.deepEqual([eau.atk, eau.def], [0, 3], 'l’Eau voisine reste hors de l’aura Sable');
  assert.deepEqual([jetons[0].atk, jetons[0].def], [2, 2], 'le jeton voisin gagne +1/+1');
  assert.deepEqual([jetons[1].atk, jetons[1].def], [1, 1], 'le second, à deux cases, reste 1/1');
});

test('la Résonance reste de table : deux sources éloignées se comptent quand même', () => {
  const duel = duelCases();
  // Deux Samouraïs du torii aux deux bouts de la rangée : trois cases vides
  // les séparent, la Résonance les compte pourtant tous les deux.
  const gauche = poser(duel, 'joueur', 'samourai-du-torii', 0);
  const droite = poser(duel, 'joueur', 'samourai-du-torii', 4);
  assert.equal(rpgEmplacementsChamp(duel.joueur)[2], null, 'le milieu de la rangée est vide');
  assert.equal(rpgResonanceEnJeu(duel, 'samourai'), 2,
    'la Résonance ne connaît pas l’adjacence : les deux sources comptent');
  assert.equal(gauche.resonance, 2, 'celui de gauche reçoit les deux bonus');
  assert.equal(droite.resonance, 2, 'celui de droite aussi, malgré les cases vides');
});
