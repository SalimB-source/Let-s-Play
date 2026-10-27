/**
 * Le bouclier du Sablier — une parade anti-sort, pas une armure.
 *
 * Règle : tant qu'une créature porte un bouclier, le PREMIER sort adverse qui
 * la désigne est bloqué (payé, mais aucun effet résolu) et le bouclier tombe
 * en entier. Les sorts alliés, les sorts de zone et toutes les blessures
 * (attaques, capacités, combat) passent normalement. Voir `rpgDuel.js`.
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

test('un sort de zone, qui ne désigne personne, passe sous la parade', () => {
  const { duel, protegee } = scene();
  donner(duel, 'joueur', 'grand-hiver');
  manaPlein(duel, 'joueur');
  const vague = rpgLancerMagie(duel, 'joueur', 'grand-hiver');
  assert.equal(vague.ok, true);
  assert.equal(vague.bouclierBloque, undefined, 'la zone ne rencontre pas la parade');
  assert.equal(protegee.bouclier, 1, 'la parade reste en place');
  assert.equal(protegee.pv, 3, 'le dégât de zone passe : 4 − 1');
});

test('une zone reste insensible à la parade même avec un identifiant de cible', () => {
  const { duel, protegee } = scene();
  donner(duel, 'joueur', 'grand-hiver');
  manaPlein(duel, 'joueur');
  // L'interface peut transmettre un cibleId pour son animation : la portée
  // du sort reste une zone, la parade ne doit pas se réveiller.
  const vague = rpgLancerMagie(duel, 'joueur', 'grand-hiver', protegee.id);
  assert.equal(vague.ok, true);
  assert.equal(vague.bouclierBloque, undefined);
  assert.equal(protegee.bouclier, 1);
  assert.equal(protegee.pv, 3, 'le dégât de zone passe');
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
  assert.equal(salem.pv, 3, 'aucun dégât ne passe');
  assert.equal(salem.gelToursRestants ?? 0, 0, 'ni le gel du sort');
  assert.equal(duel.sorcier.pv, pvSorcierAvant,
    'aucun effet du sort ne se résout : la Contre-attaque non plus ne riposte pas');
  assert.ok(duel.sorcier.cimetiere.includes('poigne-de-givre'), 'le sort bloqué est payé');

  donner(duel, 'sorcier', 'poigne-de-givre');
  manaPlein(duel, 'sorcier');
  const deuxieme = rpgLancerMagie(duel, 'sorcier', 'poigne-de-givre', salem.id);
  assert.equal(deuxieme.ok, true);
  assert.equal(deuxieme.bouclierBloque, undefined, 'plus rien ne bloque');
  assert.equal(salem.pv, 1, 'les 2 dégâts passent (3 → 1)');
  assert.equal(duel.sorcier.pv, pvSorcierAvant - 4,
    'la Contre-attaque de Salem frappe le lanceur de ses 4 dégâts d’attaque');
  assert.ok(duel.log.some((ligne) => /Contre-attaque : SALEM renvoie le sort/.test(ligne)),
    'le journal annonce la riposte');
});

test('la parade de Salem n’absorbe pas les dégâts de capacité', () => {
  const duel = duelVide();
  const salem = poser(duel, 'joueur', 'salem');
  const coup = rpgBlesserCreature(duel, 'joueur', salem.id, 1, 'braise', null, 'capacite');
  assert.equal(coup.recus, 1, 'le coup porte');
  assert.equal(coup.absorbes, 0, 'rien n’est absorbé');
  assert.equal(salem.pv, 2, 'Salem tombe à 2 PV');
  assert.equal(salem.bouclier, 1, 'la parade attend toujours un sort adverse');
});
