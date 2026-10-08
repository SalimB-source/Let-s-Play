/**
 * Le duel de sorciers — moteur « façon Magic » des règles v3.
 *
 * Règles : la partie commence avec 0 carte sur la table et chaque joueur
 * pioche 5 cartes. Chaque joueur a 50 points de vie ; les sorciers ennemis
 * peuvent en avoir davantage selon leur puissance. Tant qu'il y a des
 * créatures en face, on ne peut pas attaquer le sorcier directement : il
 * faut tuer les créatures d'abord. Les créatures peuvent avoir une capacité
 * à l'arrivée ou quand elles sont détruites.
 */

import { creatureById } from './rpgCards.js';

export const RPG_PV_JOUEUR = 50;
export const RPG_PV_SORCIER_BASE = 50;
export const RPG_PV_SORCIER_PAR_PUISSANCE = 5;
export const RPG_MAIN_DEPART = 5;

/** PV d'un sorcier adverse selon sa puissance. */
export const rpgSorcierPv = (puissance = 0) =>
  RPG_PV_SORCIER_BASE + RPG_PV_SORCIER_PAR_PUISSANCE * Math.max(0, puissance);

/**
 * Nouveau duel : tables vides, 0 sable, puis chaque camp pioche 5 cartes.
 * `decks` : listes d'identifiants de cartes (créatures pour l'instant).
 */
export function rpgNouveauDuel({ joueurDeck = [], sorcierDeck = [], sorcierPuissance = 0, rng = Math.random } = {}) {
  const melanger = (deck) => {
    const d = [...deck];
    for (let i = d.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  };
  const duel = {
    tour: 'joueur',
    joueur: { pv: RPG_PV_JOUEUR, pvMax: RPG_PV_JOUEUR, sable: 0, deck: melanger(joueurDeck), main: [], creatures: [], terrains: [] },
    sorcier: {
      pv: rpgSorcierPv(sorcierPuissance),
      pvMax: rpgSorcierPv(sorcierPuissance),
      puissance: sorcierPuissance,
      sable: 0,
      deck: melanger(sorcierDeck),
      main: [],
      creatures: [],
      terrains: [],
    },
    log: [],
  };
  for (let i = 0; i < RPG_MAIN_DEPART; i += 1) {
    rpgPiocher(duel, 'joueur');
    rpgPiocher(duel, 'sorcier');
  }
  return duel;
}

/** Pioche 1 carte du deck vers la main ; null si le deck est vide. */
export function rpgPiocher(duel, cote) {
  const camp = duel[cote];
  if (!camp.deck.length) return null;
  const carte = camp.deck.pop();
  camp.main.push(carte);
  return carte;
}

const autre = (cote) => (cote === 'joueur' ? 'sorcier' : 'joueur');

let uid = 0;
const nextId = () => { uid += 1; return `entite-${uid}`; };

/** Applique un effet de capacité (arrivée / destruction). `sauf` exclut une
 *  entité du buff (le Colosse ne se buffe pas lui-même). */
function appliquer(duel, cote, effet, cibleId, sauf = null) {
  const adv = autre(cote);
  switch (effet.type) {
    case 'pioche':
      for (let i = 0; i < (effet.amount ?? 1); i += 1) rpgPiocher(duel, cote);
      return;
    case 'sable':
      duel[cote].sable += effet.amount ?? 0;
      return;
    case 'soin':
      duel[cote].pv = Math.min(duel[cote].pvMax, duel[cote].pv + (effet.amount ?? 0));
      return;
    case 'buff':
      for (const entite of duel[cote].creatures) {
        if (sauf === entite.id) continue;
        entite.atk += effet.atk ?? 0;
        entite.def += effet.def ?? 0;
        entite.pv += effet.def ?? 0;
      }
      return;
    case 'degats': {
      if (effet.cible === 'sorcier') {
        duel[adv].pv -= effet.amount ?? 0;
        return;
      }
      const cibles = effet.cible === 'toutes-creatures'
        ? [...duel[adv].creatures]
        : duel[adv].creatures.filter((entite) => entite.id === cibleId);
      for (const cible of cibles) rpgBlesserCreature(duel, adv, cible.id, effet.amount ?? 0);
      return;
    }
    default:
  }
}

/** Retire une créature morte, puis déclenche sa capacité de destruction. */
function enterrer(duel, cote, entite) {
  const camp = duel[cote];
  camp.creatures = camp.creatures.filter((e) => e.id !== entite.id);
  duel.log.push(`${entite.name} est détruite.`);
  const carte = creatureById(entite.carteId);
  if (carte?.destruction) appliquer(duel, cote, carte.destruction, null);
}

/** Dégâts sur une créature : à 0 défense, elle meurt (capacité comprise). */
export function rpgBlesserCreature(duel, cote, entiteId, amount) {
  const entite = duel[cote].creatures.find((e) => e.id === entiteId);
  if (!entite) return { ok: false, raison: 'absente' };
  entite.pv -= amount;
  entite.def = Math.min(entite.def, Math.max(0, entite.pv));
  if (entite.pv <= 0) enterrer(duel, cote, entite);
  return { ok: true };
}

/** Pose une créature : paie le sable, arrive en jeu, capacité d'arrivée. */
export function rpgJouerCreature(duel, cote, carteId, cibleId = null) {
  const camp = duel[cote];
  const carte = creatureById(carteId);
  if (!carte) return { ok: false, raison: 'inconnue' };
  if (!camp.main.includes(carteId)) return { ok: false, raison: 'pas-en-main' };
  if (camp.sable < carte.cost) return { ok: false, raison: 'sable' };
  camp.sable -= carte.cost;
  camp.main.splice(camp.main.indexOf(carteId), 1);
  const entite = { id: nextId(), carteId, name: carte.name, atk: carte.atk, def: carte.def, pv: carte.def };
  camp.creatures.push(entite);
  duel.log.push(`${cote === 'joueur' ? 'Vous posez' : 'Le sorcier pose'} ${carte.name}.`);
  if (carte.arrivee) appliquer(duel, cote, carte.arrivee, cibleId, entite.id);
  return { ok: true, entite };
}

/** Combat entre créatures : dégâts mutuels, façon Magic. */
export function rpgAttaquerCreature(duel, cote, entiteId, cibleId) {
  const attaquant = duel[cote].creatures.find((e) => e.id === entiteId);
  const cible = duel[autre(cote)].creatures.find((e) => e.id === cibleId);
  if (!attaquant || !cible) return { ok: false, raison: 'absente' };
  rpgBlesserCreature(duel, autre(cote), cibleId, attaquant.atk);
  rpgBlesserCreature(duel, cote, entiteId, cible.atk);
  return { ok: true };
}

/** Attaque directe du sorcier adverse : interdite si des créatures bloquent. */
export function rpgAttaquerSorcier(duel, cote, entiteId) {
  const attaquant = duel[cote].creatures.find((e) => e.id === entiteId);
  if (!attaquant) return { ok: false, raison: 'absente' };
  if (duel[autre(cote)].creatures.length > 0) return { ok: false, raison: 'creatures-en-face' };
  duel[autre(cote)].pv -= attaquant.atk;
  duel.log.push(`${attaquant.name} frappe le sorcier ${autre(cote) === 'joueur' ? 'joueur' : 'ennemi'} (${attaquant.atk}).`);
  return { ok: true };
}

/** Qui a gagné ? null tant que les deux sorciers tiennent debout. */
export function rpgVainqueur(duel) {
  const joueur = duel.joueur.pv <= 0;
  const sorcier = duel.sorcier.pv <= 0;
  if (joueur && sorcier) return 'egalite';
  if (sorcier) return 'joueur';
  if (joueur) return 'sorcier';
  return null;
}
