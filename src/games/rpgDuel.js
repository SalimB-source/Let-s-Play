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

import { duelCardById, magieById, terrainById } from './rpgCards.js';

export const RPG_PV_JOUEUR = 50;
export const RPG_PV_SORCIER_BASE = 50;
export const RPG_PV_SORCIER_PAR_PUISSANCE = 5;
export const RPG_MAIN_DEPART = 5;
export const RPG_COULEURS = ['braise', 'eau', 'sable'];

const manaVide = () => ({ braise: 0, eau: 0, sable: 0 });
const totalMana = (camp) => RPG_COULEURS.reduce((somme, c) => somme + camp.mana[c], 0);

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
    joueur: { pv: RPG_PV_JOUEUR, pvMax: RPG_PV_JOUEUR, mana: manaVide(), terrainPose: false, deck: melanger(joueurDeck), main: [], creatures: [], terrains: [] },
    sorcier: {
      pv: rpgSorcierPv(sorcierPuissance),
      pvMax: rpgSorcierPv(sorcierPuissance),
      puissance: sorcierPuissance,
      mana: manaVide(),
      terrainPose: false,
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

/** Comme à Magic : le prix se paie en mana des terrains engagés, et une
 *  carte colorée exige au moins un mana de sa couleur. */
export function rpgPeutPayer(camp, carte) {
  if (totalMana(camp) < (carte.cost ?? 0)) return false;
  if ((carte.cost ?? 0) > 0 && RPG_COULEURS.includes(carte.element)) {
    return camp.mana[carte.element] >= 1;
  }
  return true;
}

function payer(camp, carte) {
  let reste = carte.cost ?? 0;
  if (reste > 0 && RPG_COULEURS.includes(carte.element)) {
    camp.mana[carte.element] -= 1;
    reste -= 1;
  }
  for (const couleur of RPG_COULEURS) {
    const pris = Math.min(camp.mana[couleur], reste);
    camp.mana[couleur] -= pris;
    reste -= pris;
    if (!reste) break;
  }
}

/** Pose UN terrain par tour, comme à Magic. */
export function rpgPoserTerrain(duel, cote, carteId) {
  const camp = duel[cote];
  const carte = terrainById(carteId);
  if (!carte) return { ok: false, raison: 'inconnue' };
  if (!camp.main.includes(carteId)) return { ok: false, raison: 'pas-en-main' };
  if (camp.terrainPose) return { ok: false, raison: 'deja-pose' };
  camp.main.splice(camp.main.indexOf(carteId), 1);
  camp.terrains.push({ id: `${carteId}-${camp.terrains.length}-${Math.floor(Math.random() * 1e6)}`, carteId, tapped: false });
  camp.terrainPose = true;
  duel.log.push(`${cote === 'joueur' ? 'Vous posez' : 'Le sorcier pose'} le terrain ${carte.name}.`);
  return { ok: true };
}

/** Engager un terrain dégagé : +1 mana de sa couleur. */
export function rpgEngagerTerrain(duel, cote, terrainId) {
  const terrain = duel[cote].terrains.find((t) => t.id === terrainId);
  if (!terrain) return { ok: false, raison: 'absent' };
  if (terrain.tapped) return { ok: false, raison: 'deja-engage' };
  terrain.tapped = true;
  duel[cote].mana[terrainById(terrain.carteId).element] += 1;
  return { ok: true };
}

export const rpgMana = (camp) => ({ ...camp.mana, total: totalMana(camp) });

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
  const carte = duelCardById(entite.carteId);
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
  const carte = duelCardById(carteId);
  if (!carte) return { ok: false, raison: 'inconnue' };
  if (!camp.main.includes(carteId)) return { ok: false, raison: 'pas-en-main' };
  if (!rpgPeutPayer(camp, carte)) return { ok: false, raison: 'mana' };
  payer(camp, carte);
  camp.main.splice(camp.main.indexOf(carteId), 1);
  const entite = { id: nextId(), carteId, kind: carte.kind ?? 'creature', name: carte.name, atk: carte.atk, def: carte.def, pv: carte.def, ready: false, attaquee: false };
  camp.creatures.push(entite);
  duel.log.push(`${cote === 'joueur' ? 'Vous posez' : 'Le sorcier pose'} ${carte.name}.`);
  if (carte.arrivee) appliquer(duel, cote, carte.arrivee, cibleId, entite.id);
  return { ok: true, entite };
}

const pret = (entite) => entite && entite.ready && !entite.attaquee;

/** Combat entre créatures : dégâts mutuels, façon Magic. */
export function rpgAttaquerCreature(duel, cote, entiteId, cibleId) {
  const attaquant = duel[cote].creatures.find((e) => e.id === entiteId);
  const cible = duel[autre(cote)].creatures.find((e) => e.id === cibleId);
  if (!attaquant || !cible) return { ok: false, raison: 'absente' };
  if (!pret(attaquant)) return { ok: false, raison: 'pas-pret' };
  attaquant.attaquee = true;
  rpgBlesserCreature(duel, autre(cote), cibleId, attaquant.atk);
  rpgBlesserCreature(duel, cote, entiteId, cible.atk);
  return { ok: true };
}

/** Cible automatique d'une magie : première créature adverse si la magie
 *  en cible une, sinon rien (les effets « soi » / « toutes » n'en ont pas
 *  besoin, les magies « sorcier » visent le sorcier sans cible). */
export function rpgCibleAuto(duel, cote, carte) {
  if (carte.effet?.type !== 'degats' || carte.effet.cible !== 'creature') return null;
  return duel[autre(cote)].creatures[0]?.id ?? null;
}

/** Lancer une magie : paie le mana, résout l'effet, consomme la carte. */
export function rpgLancerMagie(duel, cote, carteId, cibleId = null) {
  const camp = duel[cote];
  const carte = magieById(carteId);
  if (!carte) return { ok: false, raison: 'inconnue' };
  if (!camp.main.includes(carteId)) return { ok: false, raison: 'pas-en-main' };
  if (!rpgPeutPayer(camp, carte)) return { ok: false, raison: 'mana' };
  if (carte.effet.type === 'degats' && carte.effet.cible === 'creature' && !cibleId) {
    return { ok: false, raison: 'cible' };
  }
  payer(camp, carte);
  camp.main.splice(camp.main.indexOf(carteId), 1);
  appliquer(duel, cote, carte.effet, cibleId);
  duel.log.push(`${cote === 'joueur' ? 'Vous lancez' : 'Le sorcier lance'} ${carte.name}.`);
  return { ok: true };
}

/**
 * Phase d'attaque, façon Magic : on déclare TOUS les attaquants d'un coup,
 * puis l'attaque se résout en dégâts simultanés.
 * - sans créature en face : chaque attaquant frappe le sorcier adverse ;
 * - avec un mur : les attaquants se répartissent sur les créatures ennemies
 *   (round-robin), chaque attaquant encaisse la riposte de sa cible — même
 *   si elle meurt, les dégâts sont simultanés.
 */
export function rpgLancerAttaque(duel, cote, attaquantIds) {
  const adv = autre(cote);
  const attaquants = duel[cote].creatures.filter((e) => attaquantIds.includes(e.id));
  if (!attaquants.length) return { ok: false, raison: 'personne' };
  for (const entite of attaquants) {
    if (!pret(entite)) return { ok: false, raison: 'pas-pret' };
  }
  const mur = duel[adv].creatures;
  const resume = { frappeSorcier: 0, paires: [] };
  if (!mur.length) {
    for (const attaquant of attaquants) {
      attaquant.attaquee = true;
      duel[adv].pv -= attaquant.atk;
      resume.frappeSorcier += attaquant.atk;
    }
    duel.log.push(`${attaquants.length} attaquant(s) frappent le sorcier (${resume.frappeSorcier}).`);
    return { ok: true, resume };
  }
  // Dégâts simultanés : on cumule d'abord, on blesse ensuite.
  const degats = new Map();
  for (const [i, attaquant] of attaquants.entries()) {
    const cible = mur[i % mur.length];
    attaquant.attaquee = true;
    degats.set(cible.id, (degats.get(cible.id) ?? 0) + attaquant.atk);
    degats.set(attaquant.id, (degats.get(attaquant.id) ?? 0) + cible.atk);
    resume.paires.push([attaquant.name, cible.name]);
  }
  for (const [entiteId, montant] of degats) {
    const coteEntite = duel[cote].creatures.some((e) => e.id === entiteId) ? cote : adv;
    rpgBlesserCreature(duel, coteEntite, entiteId, montant);
  }
  duel.log.push(`Attaque : ${attaquants.length} créature(s) contre le mur.`);
  return { ok: true, resume };
}

/** Attaque directe du sorcier adverse : interdite si des créatures bloquent. */
export function rpgAttaquerSorcier(duel, cote, entiteId) {
  const attaquant = duel[cote].creatures.find((e) => e.id === entiteId);
  if (!attaquant) return { ok: false, raison: 'absente' };
  if (duel[autre(cote)].creatures.length > 0) return { ok: false, raison: 'creatures-en-face' };
  if (!pret(attaquant)) return { ok: false, raison: 'pas-pret' };
  attaquant.attaquee = true;
  duel[autre(cote)].pv -= attaquant.atk;
  duel.log.push(`${attaquant.name} frappe le sorcier ${autre(cote) === 'joueur' ? 'joueur' : 'ennemi'} (${attaquant.atk}).`);
  return { ok: true };
}

/** Fin du tour : l'autre camp commence — revenu de sable, pioche 1,
 *  ses créatures deviennent prêtes (le mal d'invocation tombe). */
export function rpgFinDeTour(duel) {
  duel.tour = autre(duel.tour);
  const camp = duel[duel.tour];
  camp.mana = manaVide();           // le mana non dépensé s'évapore
  camp.terrainPose = false;         // un nouveau terrain peut être posé
  for (const terrain of camp.terrains) terrain.tapped = false; // on dégage
  rpgPiocher(duel, duel.tour);
  for (const entite of camp.creatures) {
    entite.ready = true;
    entite.attaquee = false;
  }
  duel.log.push(`— Au tour du ${duel.tour === 'joueur' ? 'joueur' : 'sorcier'}.`);
  return duel;
}

/** Le sorcier adverse joue son tour : pose ce qu'il peut payer, puis
 *  attaque (les créatures d'abord s'il y en a, sinon le joueur). */
export function rpgTourSorcierIA(duel, rng = Math.random) {
  const joue = [];
  // Le sorcier pose son terrain du tour puis engage tout ce qui peut l'être.
  const terrainEnMain = duel.sorcier.main.find((id) => terrainById(id));
  if (terrainEnMain) rpgPoserTerrain(duel, 'sorcier', terrainEnMain);
  for (const terrain of duel.sorcier.terrains) {
    if (!terrain.tapped) rpgEngagerTerrain(duel, 'sorcier', terrain.id);
  }
  let garde = 8;
  while (garde-- > 0) {
    const jouables = duel.sorcier.main
      .map((id) => duelCardById(id))
      .filter((carte) => carte && carte.kind !== 'terrain' && rpgPeutPayer(duel.sorcier, carte))
      .sort((a, b) => b.cost - a.cost);
    if (!jouables.length) break;
    const res = rpgJouerCreature(duel, 'sorcier', jouables[0].id);
    if (!res.ok) break;
    joue.push(res.entite);
  }
  // Le sorcier lâche ses magies payables (cible auto), puis déclare tous
  // ses attaquants d'un coup, comme le joueur.
  let gardeMagie = 6;
  while (gardeMagie-- > 0) {
    const magie = duel.sorcier.main
      .map((id) => magieById(id))
      .find((carte) => carte && rpgPeutPayer(duel.sorcier, carte)
        && (carte.effet.cible !== 'creature' || duel.joueur.creatures.length));
    if (!magie) break;
    const res = rpgLancerMagie(duel, 'sorcier', magie.id, rpgCibleAuto(duel, 'sorcier', magie));
    if (!res.ok) break;
  }
  const pretsIds = duel.sorcier.creatures.filter((e) => pret(e)).map((e) => e.id);
  if (pretsIds.length) rpgLancerAttaque(duel, 'sorcier', pretsIds);
  return joue;
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
