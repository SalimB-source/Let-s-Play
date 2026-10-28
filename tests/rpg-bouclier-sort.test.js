/**
 * Le bouclier du Sablier — une parade anti-sort, pas une armure.
 *
 * Règle : tant qu'une créature porte un bouclier, le PREMIER sort adverse qui
 * l'atteint est bloqué et le bouclier tombe en entier.
 *  - un sort qui la DÉSIGNE est payé, mais aucun de ses effets ne se résout ;
 *  - un sort de ZONE continue de frapper les autres créatures, mais il
 *    épargne la porteuse de la parade (ni dégât, ni gel, ni destruction, ni
 *    malus), dont le bouclier tombe.
 * Les sorts alliés et toutes les blessures qui ne viennent pas d'un sort
 * (attaques, capacités — y compris les capacités de zone —, combat) passent
 * normalement. Voir `rpgDuel.js`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  rpgNouveauDuel,
  rpgJouerCreature,
  rpgJouerArme,
  rpgLancerMagie,
  rpgBlesserCreature,
  rpgBouclierEstActif,
  rpgFinDeTour,
  rpgResoudreArriveeCiblee,
} from '../src/games/rpgDuel.js';
import { cardById } from '../src/games/rpgCards.js';
import { RPG_ELEMENTS } from '../src/games/rpgCards.js';

const duelVide = () => rpgNouveauDuel({ joueurDeck: [], sorcierDeck: [], rng: () => 0.5 });
const donner = (duel, cote, carteId) => duel[cote].main.push(carteId);
const manaPlein = (duel, cote) => {
  duel[cote].mana = Object.fromEntries(RPG_ELEMENTS.map((couleur) => [couleur, 10]));
};
const poser = (duel, cote, carteId, cibleId = null) => {
  donner(duel, cote, carteId);
  manaPlein(duel, cote);
  const res = rpgJouerCreature(duel, cote, carteId, cibleId);
  assert.equal(res.ok, true, `${carteId} entre en jeu`);
  return res.entite;
};

/** Une créature adverse protégée, et un sort adverse prêt à la désigner. */
const scene = () => {
  const duel = duelVide();
  const protegee = poser(duel, 'sorcier', 'dune-marchante'); // 2/4
  protegee.bouclier = 1;
  protegee.bouclierEpuise = false;
  duel.tour = 'joueur';
  donner(duel, 'joueur', 'poigne-de-givre');
  manaPlein(duel, 'joueur');
  return { duel, protegee };
};

test('les sources de bouclier n’annoncent plus qu’une parade', () => {
  for (const id of ['guerrier-au-bouclier-rond', 'veilleuse-des-citernes', 'tour-de-sable', 'parade-du-verre']) {
    const carte = cardById(id);
    const effet = carte.arrivee?.type === 'bouclier' ? carte.arrivee : carte.effet;
    assert.equal(effet.type, 'bouclier', `${id} pose un bouclier`);
    assert.equal(effet.amount, 1, `${id} ne cumule plus de points : une seule parade`);
    assert.match(carte.text, /prochain sort adverse/, `${id} annonce le sort bloqué`);
    assert.doesNotMatch(carte.text, /prévient les|prochains dégâts/, `${id} ne parle plus d’absorption`);
  }
});

test('le bouclier du Guerrier se donne : à lui-même ou à une autre créature alliée', () => {
  // Le texte imprimé doit dire les deux destinations : c'est lui qui annonce
  // au joueur que la parade se désigne.
  assert.match(cardById('guerrier-au-bouclier-rond').text, /une créature alliée ciblée — ou lui-même/,
    'le Guerrier annonce les deux porteurs possibles');
  assert.equal(cardById('guerrier-au-bouclier-rond').arrivee.cibleSoi, true,
    'l’arrivée accepte la créature qui la porte');

  // 1. Seul sur le champ, le Guerrier garde sa parade : la désignation porte
  // sur lui-même, et l'attente se referme.
  const duel = duelVide();
  duel.tour = 'joueur';
  manaPlein(duel, 'joueur');
  donner(duel, 'joueur', 'guerrier-au-bouclier-rond');
  const seul = rpgJouerCreature(duel, 'joueur', 'guerrier-au-bouclier-rond', null, { cibleDifferee: true });
  assert.equal(seul.ok, true);
  assert.equal(seul.arriveeEnAttente, true, 'la table attend la désignation du porteur');
  assert.equal(seul.entite.bouclier ?? 0, 0, 'aucun bouclier n’est posé avant le choix');
  const designe = rpgResoudreArriveeCiblee(duel, 'joueur', seul.entite.id);
  assert.equal(designe.ok, true, 'le Guerrier peut se désigner lui-même');
  assert.equal(seul.entite.bouclier, 1, 'la parade reste sur le Guerrier');
  assert.equal(duel.arriveeEnAttente, null, 'l’attente est levée');

  // 2. Avec un allié, la même pose prête la parade : le Guerrier reste nu.
  const duelAllie = duelVide();
  duelAllie.tour = 'joueur';
  manaPlein(duelAllie, 'joueur');
  donner(duelAllie, 'joueur', 'chien-du-guet');
  donner(duelAllie, 'joueur', 'guerrier-au-bouclier-rond');
  const chien = rpgJouerCreature(duelAllie, 'joueur', 'chien-du-guet').entite;
  const pret = rpgJouerCreature(duelAllie, 'joueur', 'guerrier-au-bouclier-rond', null, { cibleDifferee: true });
  assert.equal(pret.arriveeEnAttente, true);
  assert.equal(rpgResoudreArriveeCiblee(duelAllie, 'joueur', chien.id).ok, true);
  assert.equal(chien.bouclier, 1, 'l’allié désigné reçoit le bouclier');
  assert.equal(pret.entite.bouclier ?? 0, 0, 'le Guerrier ne le garde pas en plus');

  // 3. Une pose directe (sans désignation) retombe sur le porteur : la carte
  // reste jouable par l’IA et par les scripts, et son bouclier ne se perd pas.
  const duelDirect = duelVide();
  duelDirect.tour = 'joueur';
  manaPlein(duelDirect, 'joueur');
  donner(duelDirect, 'joueur', 'guerrier-au-bouclier-rond');
  const direct = rpgJouerCreature(duelDirect, 'joueur', 'guerrier-au-bouclier-rond');
  assert.equal(direct.ok, true);
  assert.equal(direct.entite.bouclier, 1, 'sans cible désignée, le Guerrier se couvre lui-même');
});

test('le bouclier bloque tout le premier sort adverse qui cible la créature', () => {
  const { duel, protegee } = scene();
  const manaAvant = { ...duel.joueur.mana };
  const pvAvant = protegee.pv;
  const res = rpgLancerMagie(duel, 'joueur', 'poigne-de-givre', protegee.id);

  assert.equal(res.ok, true, 'le sort se lance : il est bloqué, pas refusé');
  assert.equal(res.bouclierBloque, true, 'le résultat dit que la parade a bloqué le sort');
  assert.equal(res.bouclierEntityId, protegee.id);
  assert.equal(res.bouclierMontant, 1, 'la valeur affichée avant la chute est rendue à la table');
  assert.equal(protegee.bouclier, 0, 'la parade tombe en entier');
  assert.equal(protegee.bouclierEpuise, true, 'et se marque comme tombée');
  assert.equal(rpgBouclierEstActif(protegee), false);
  assert.equal(protegee.pv, pvAvant, 'les 2 dégâts ne passent pas');
  assert.equal(protegee.gelToursRestants ?? 0, 0, 'ni le gel attaché au sort');
  assert.ok(duel.joueur.cimetiere.includes('poigne-de-givre'), 'le sort bloqué va au cimetière');
  assert.equal(duel.joueur.main.includes('poigne-de-givre'), false);
  assert.ok(Object.keys(manaAvant).some((couleur) => duel.joueur.mana[couleur] < manaAvant[couleur]),
    'le mana du sort bloqué est bien payé');
  assert.ok(duel.log.some((ligne) => /bloque Poigne de givre et tombe/.test(ligne)),
    'le journal du duel raconte le blocage');
});

test('une fois la parade tombée, le sort adverse suivant passe normalement', () => {
  const { duel, protegee } = scene();
  assert.equal(rpgLancerMagie(duel, 'joueur', 'poigne-de-givre', protegee.id).bouclierBloque, true);
  donner(duel, 'joueur', 'poigne-de-givre');
  manaPlein(duel, 'joueur');
  const deuxieme = rpgLancerMagie(duel, 'joueur', 'poigne-de-givre', protegee.id);
  assert.equal(deuxieme.ok, true);
  assert.equal(deuxieme.bouclierBloque, undefined, 'plus rien ne bloque');
  assert.equal(protegee.pv, 2, 'les 2 dégâts passent : la Dune 2/4 tombe à 2');
  assert.ok((protegee.gelToursRestants ?? 0) > 0, 'et le gel s’applique');

  // Une nouvelle parade, elle, bloque à nouveau un sort.
  protegee.bouclier = 1;
  protegee.bouclierEpuise = false;
  donner(duel, 'joueur', 'poigne-de-givre');
  manaPlein(duel, 'joueur');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'poigne-de-givre', protegee.id).bouclierBloque, true,
    'une parade neuve bloque un nouveau sort');
});

test('la parade tombe en entier même si elle porte plusieurs points', () => {
  const { duel, protegee } = scene();
  protegee.bouclier = 5;
  assert.equal(rpgLancerMagie(duel, 'joueur', 'poigne-de-givre', protegee.id).bouclierBloque, true);
  assert.equal(protegee.bouclier, 0, 'un seul sort est bloqué, mais toute la réserve disparaît');
  assert.equal(protegee.pv, 4, 'la créature reste intacte');
});

test('le bouclier ne bloque pas un sort du camp de la créature', () => {
  const duel = duelVide();
  const alliee = poser(duel, 'joueur', 'dune-marchante');
  alliee.bouclier = 1;
  duel.tour = 'joueur';
  donner(duel, 'joueur', 'parade-du-verre');
  manaPlein(duel, 'joueur');
  const parade = rpgLancerMagie(duel, 'joueur', 'parade-du-verre', alliee.id);
  assert.equal(parade.ok, true);
  assert.equal(parade.bouclierBloque, undefined, 'un sort allié passe');
  assert.equal(alliee.bouclier, 1, 'la parade est simplement réarmée');
  assert.equal(alliee.bouclierEpuise, false);
});

test('un sort de zone adverse est encaissé par la parade, qui épargne sa porteuse puis tombe', () => {
  const { duel, protegee } = scene();
  const voisine = poser(duel, 'sorcier', 'chien-du-guet');
  const pvVoisine = voisine.pv;
  donner(duel, 'joueur', 'grand-hiver');
  manaPlein(duel, 'joueur');
  const vague = rpgLancerMagie(duel, 'joueur', 'grand-hiver');
  assert.equal(vague.ok, true);
  assert.equal(vague.bouclierBloque, undefined, 'la zone n’est jamais annulée en entier');
  assert.equal(protegee.bouclier, 0, 'la parade tombe sur la vague');
  assert.equal(protegee.bouclierEpuise, true);
  assert.equal(rpgBouclierEstActif(protegee), false);
  assert.equal(protegee.pv, 4, 'la porteuse ne prend pas le dégât de zone');
  assert.equal(voisine.pv, pvVoisine - 1, 'la vague frappe quand même les autres créatures');
  assert.ok(duel.log.some((ligne) => /bouclier de .* encaisse la vague et tombe/.test(ligne)),
    'le journal raconte la parade de zone');
});

test('une zone réveille la parade même quand l’interface transmet un identifiant de cible', () => {
  const { duel, protegee } = scene();
  donner(duel, 'joueur', 'grand-hiver');
  manaPlein(duel, 'joueur');
  // L'interface peut transmettre un cibleId pour son animation : la portée
  // du sort reste une zone, mais la parade de la porteuse doit se réveiller.
  const vague = rpgLancerMagie(duel, 'joueur', 'grand-hiver', protegee.id);
  assert.equal(vague.ok, true);
  assert.equal(vague.bouclierBloque, undefined, 'le sort de zone n’est pas contrecarré en entier');
  assert.equal(protegee.bouclier, 0, 'la parade tombe');
  assert.equal(protegee.pv, 4, 'et sa porteuse est épargnée');
});

test('la parade de zone absorbe aussi le gel attaché au sort (Verglas)', () => {
  const { duel, protegee } = scene();
  const voisine = poser(duel, 'sorcier', 'chien-du-guet');
  // Verglas inflige 2 dégâts ; lui donner assez de PV pour vérifier aussi
  // que le gel s’applique bien à une survivante.
  voisine.pv = 3;
  voisine.pvMax = 3;
  voisine.def = 3;
  donner(duel, 'joueur', 'verglas');
  manaPlein(duel, 'joueur');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'verglas').ok, true);
  assert.equal(protegee.pv, 4, 'aucun dégât sur la porteuse');
  assert.equal(protegee.gelToursRestants ?? 0, 0, 'ni gel');
  assert.equal(protegee.bouclier, 0, 'la parade tombe');
  assert.ok((voisine.gelToursRestants ?? 0) > 0, 'la voisine, elle, est gelée');
  assert.equal(voisine.pv, voisine.pvMax - 2, 'et blessée par les 2 dégâts de la grêle');
});

test('la parade épargne sa porteuse d’une destruction de zone (Neige noire), sans geler', () => {
  const duel = duelVide();
  const protegee = poser(duel, 'sorcier', 'dune-marchante'); // coût 2, dans la borne 3
  protegee.bouclier = 1;
  protegee.bouclierEpuise = false;
  const petite = poser(duel, 'sorcier', 'chien-du-guet');
  duel.tour = 'joueur';
  donner(duel, 'joueur', 'neige-noire');
  manaPlein(duel, 'joueur');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'neige-noire').ok, true);
  assert.ok(duel.sorcier.creatures.some((entite) => entite.id === protegee.id), 'la porteuse survit');
  assert.equal(protegee.bouclier, 0, 'la parade tombe');
  assert.equal(protegee.gelToursRestants ?? 0, 0, 'le gel de la Neige noire ne l’atteint pas');
  assert.equal(duel.sorcier.creatures.some((entite) => entite.id === petite.id), false,
    'la petite créature sans parade est détruite');
});

test('la parade épargne sa porteuse d’une destruction totale, sans épargner le reste de la table', () => {
  const duel = duelVide();
  const protegee = poser(duel, 'sorcier', 'dune-marchante');
  protegee.bouclier = 1;
  protegee.bouclierEpuise = false;
  poser(duel, 'sorcier', 'chien-du-guet');
  const allie = poser(duel, 'joueur', 'chien-du-guet');
  allie.bouclier = 1; // une parade du camp du lanceur ne protège pas de son propre sort
  allie.bouclierEpuise = false;
  duel.tour = 'joueur';
  donner(duel, 'joueur', 'la-derniere-pesee');
  manaPlein(duel, 'joueur');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'la-derniere-pesee').ok, true);
  assert.equal(duel.sorcier.creatures.length, 1, 'seule la créature adverse à parade survit');
  assert.equal(duel.sorcier.creatures[0].id, protegee.id);
  assert.equal(protegee.bouclier, 0);
  assert.equal(duel.joueur.creatures.length, 0, 'les créatures du lanceur sont détruites, parade comprise');
});

test('la parade encaisse le malus de zone (Embuscade) et tombe', () => {
  const { duel, protegee } = scene();
  const atkAvant = protegee.atk;
  const voisine = poser(duel, 'sorcier', 'chien-du-guet');
  const atkVoisineAvant = voisine.atk;
  donner(duel, 'joueur', 'embuscade');
  manaPlein(duel, 'joueur');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'embuscade').ok, true);
  assert.equal(protegee.atk, atkAvant, 'la porteuse garde ses statistiques');
  assert.equal(protegee.bouclier, 0, 'la parade tombe');
  assert.equal(voisine.atk, Math.max(1, atkVoisineAvant - 2), 'la voisine subit le -2/-2');
});

test('un sort de zone du camp de la créature ne réveille pas sa parade', () => {
  const duel = duelVide();
  const aMoi = poser(duel, 'joueur', 'dune-marchante');
  aMoi.bouclier = 1;
  aMoi.bouclierEpuise = false;
  duel.tour = 'joueur';
  donner(duel, 'joueur', 'grand-hiver');
  manaPlein(duel, 'joueur');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'grand-hiver').ok, true);
  assert.equal(aMoi.bouclier, 1, 'la parade reste debout devant un sort allié');
  assert.equal(aMoi.bouclierEpuise, false);
  assert.equal(aMoi.pv, 3, 'le dégât atteint quand même la créature de son propre camp');
});

test('une capacité de zone traverse la parade sans la faire tomber', () => {
  const { duel, protegee } = scene();
  // La Valkyrie des glaces : à son arrivée, 1 dégât de zone sur les deux
  // camps. C'est une capacité, pas un sort : la parade ne doit pas bouger.
  poser(duel, 'joueur', 'valkyrie-des-glaces');
  assert.equal(protegee.pv, 3, 'la capacité blesse bien la créature');
  assert.equal(protegee.bouclier, 1, 'la parade ne regarde que les sorts');
  assert.equal(protegee.bouclierEpuise, false);
});

test('une parade neuve encaisse l’écho différé d’un sort de zone', () => {
  const duel = duelVide();
  const cible = poser(duel, 'sorcier', 'dune-marchante'); // 2/4
  duel.tour = 'joueur';
  donner(duel, 'joueur', 'nuage-de-cendres');
  manaPlein(duel, 'joueur');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'nuage-de-cendres').ok, true);
  assert.equal(cible.pv, 2, 'la première vague passe : 4 − 2');
  // Une Parade de verre en réponse réarme la créature avant l'écho.
  cible.bouclier = 1;
  cible.bouclierEpuise = false;
  rpgFinDeTour(duel); // tour du sorcier : l'écho attend son lanceur
  assert.equal(duel.sorcier.degatsEchos.length, 1);
  rpgFinDeTour(duel); // retour du joueur : l'écho retombe
  assert.equal(duel.sorcier.degatsEchos.length, 0);
  assert.equal(cible.pv, 2, 'l’écho est encaissé par la parade');
  assert.equal(cible.bouclier, 0, 'la parade tombe sur l’écho');
});

test('un sort adverse qui vise une autre créature ne consume pas la parade', () => {
  const { duel, protegee } = scene();
  const autre = poser(duel, 'sorcier', 'chien-du-guet');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'poigne-de-givre', autre.id).ok, true);
  assert.equal(protegee.bouclier, 1, 'seule la créature désignée est concernée');
  assert.equal(autre.bouclier ?? 0, 0, 'l’autre n’avait pas de parade');
});

test('attaques et capacités traversent la parade sans la faire tomber', () => {
  const { duel, protegee } = scene();
  const coup = rpgBlesserCreature(duel, 'sorcier', protegee.id, 1, 'braise', null, 'capacite');
  assert.equal(coup.recus, 1);
  assert.equal(coup.absorbes, 0);
  assert.equal(protegee.pv, 3, 'le coup entame les PV');
  assert.equal(protegee.bouclier, 1, 'la parade tient toujours');
  assert.equal(protegee.bouclierEpuise, false);
});

test('la parade posée par une arme bloque un sort et ne revient pas avec une autre arme', () => {
  const duel = duelVide();
  const porteur = poser(duel, 'sorcier', 'dune-marchante');
  donner(duel, 'sorcier', 'hache-de-la-banquise');
  manaPlein(duel, 'sorcier');
  assert.equal(rpgJouerArme(duel, 'sorcier', 'hache-de-la-banquise', porteur.id).ok, true);
  assert.equal(porteur.bouclier, 1, 'la Hache pose la parade');
  duel.tour = 'joueur';
  donner(duel, 'joueur', 'poigne-de-givre');
  manaPlein(duel, 'joueur');
  assert.equal(rpgLancerMagie(duel, 'joueur', 'poigne-de-givre', porteur.id).bouclierBloque, true);
  assert.equal(porteur.arme.bouclier ?? 0, 0, 'la part de l’arme tombe avec la parade');

  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'takouba-des-pistes');
  manaPlein(duel, 'sorcier');
  assert.equal(rpgJouerArme(duel, 'sorcier', 'takouba-des-pistes', porteur.id).ok, true);
  assert.equal(porteur.bouclier, 0, 'changer d’arme ne réarme pas la parade');
});

test('un sort visant le sorcier n’est pas bloqué par la parade d’une créature', () => {
  const { duel, protegee } = scene();
  const pvAvant = duel.sorcier.pv;
  donner(duel, 'joueur', 'trait-de-braise');
  manaPlein(duel, 'joueur');
  const trait = rpgLancerMagie(duel, 'joueur', 'trait-de-braise', 'sorcier');
  assert.equal(trait.ok, true);
  assert.equal(trait.bouclierBloque, undefined, 'la règle ne concerne que les créatures');
  assert.equal(duel.sorcier.pv, pvAvant - 3, 'les 3 dégâts atteignent le sorcier');
  assert.equal(protegee.bouclier, 1, 'la parade de la créature reste intacte');
});

/* ── Salem : la parade anti-sort sur un corps Rapide qui contre-attaque ───── */

test('Salem imprime Bouclier, Rapidité et Contre-attaque, sans bouclier de lumière', () => {
  const carte = cardById('salem');
  assert.equal(carte.rapidite, true, 'Rapidité reste imprimée');
  assert.equal(carte.contreAttaque, true, 'Contre-attaque est ajoutée');
  assert.equal(carte.arrivee.type, 'bouclier', 'son arrivée pose la parade anti-sort');
  assert.equal(carte.arrivee.amount, 1, 'une seule parade');
  assert.equal(carte.arrivee.cible, 'soi', 'elle protège Salem, pas un allié désigné');
  assert.match(carte.text, /prochain sort adverse/);
  assert.doesNotMatch(carte.text, /bouclier de lumière/);
});

test('la parade de Salem ne se pose que sur lui, même avec une cible alliée', () => {
  const duel = duelVide();
  const allie = poser(duel, 'joueur', 'chien-du-guet');
  // Même en transmettant l'id d'un allié (interface, IA), `cible: 'soi'`
  // garde la parade sur le corps qui arrive.
  donner(duel, 'joueur', 'salem');
  manaPlein(duel, 'joueur');
  const res = rpgJouerCreature(duel, 'joueur', 'salem', allie.id);
  assert.equal(res.ok, true);
  assert.equal(res.entite.bouclier, 1, 'Salem porte sa parade');
  assert.equal(res.entite.bouclierLumiere, false, 'plus aucun bouclier de lumière');
  assert.equal(res.entite.rapidite, true, 'et il est Rapide');
  assert.equal(res.entite.contreAttaque, true, 'et il contre-attaque');
  assert.equal(allie.bouclier, 0, 'l’allié désigné ne reçoit rien');
  assert.equal(rpgBouclierEstActif(res.entite), true);
});

test('la parade de Salem bloque un sort sans riposter ; le suivant se paie au sorcier', () => {
  const duel = duelVide();
  const salem = poser(duel, 'joueur', 'salem');
  duel.tour = 'sorcier';
  donner(duel, 'sorcier', 'poigne-de-givre');
  manaPlein(duel, 'sorcier');
  const pvSorcierAvant = duel.sorcier.pv;

  const bloque = rpgLancerMagie(duel, 'sorcier', 'poigne-de-givre', salem.id);
  assert.equal(bloque.ok, true);
  assert.equal(bloque.bouclierBloque, true, 'la parade arrête le premier sort');
  assert.equal(bloque.bouclierEntityId, salem.id);
  assert.equal(salem.bouclier, 0, 'et tombe en entier');
  assert.equal(salem.pv, 4, 'aucun dégât ne passe');
  assert.equal(salem.gelToursRestants ?? 0, 0, 'ni le gel du sort');
  assert.equal(duel.sorcier.pv, pvSorcierAvant,
    'aucun effet du sort ne se résout : la Contre-attaque non plus ne riposte pas');
  assert.ok(duel.sorcier.cimetiere.includes('poigne-de-givre'), 'le sort bloqué est payé');

  donner(duel, 'sorcier', 'poigne-de-givre');
  manaPlein(duel, 'sorcier');
  const deuxieme = rpgLancerMagie(duel, 'sorcier', 'poigne-de-givre', salem.id);
  assert.equal(deuxieme.ok, true);
  assert.equal(deuxieme.bouclierBloque, undefined, 'plus rien ne bloque');
  assert.equal(salem.pv, 2, 'les 2 dégâts passent (4 → 2)');
  assert.equal(duel.sorcier.pv, pvSorcierAvant - 3,
    'la Contre-attaque de Salem frappe le lanceur de ses 3 dégâts d’attaque');
  assert.ok(duel.log.some((ligne) => /Contre-attaque : SALEM renvoie le sort/.test(ligne)),
    'le journal annonce la riposte');
});

test('la parade de Salem n’absorbe pas les dégâts de capacité', () => {
  const duel = duelVide();
  const salem = poser(duel, 'joueur', 'salem');
  const coup = rpgBlesserCreature(duel, 'joueur', salem.id, 1, 'braise', null, 'capacite');
  assert.equal(coup.recus, 1, 'le coup porte');
  assert.equal(coup.absorbes, 0, 'rien n’est absorbé');
  assert.equal(salem.pv, 3, 'Salem tombe à 3 PV');
  assert.equal(salem.bouclier, 1, 'la parade attend toujours un sort adverse');
});
