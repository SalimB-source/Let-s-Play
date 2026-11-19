/**
 * Le Sablier — le **recul**, et la poussée qui ouvre une place.
 *
 * Deux gestes, une seule mécanique de poussée en chaîne :
 *
 * 1. **Le bout du plateau ne se tient pas.** Une créature qui atteint la
 *    dernière rangée avant le sorcier adverse et qui le frappe est repoussée
 *    d'une case, vers son propre camp (`rpgReculerApresFrappe`).
 * 2. **L'invocation sous occupation.** Quand la ligne arrière d'un camp est
 *    envahie, ce camp peut quand même invoquer : l'envahisseur de la colonne
 *    choisie est repoussé d'une case pour ouvrir la place
 *    (`rpgPousserEnvahisseur`, `rpgCasesPose`).
 *
 * ## La chaîne
 *
 * La poussée ne s'arrête pas au premier corps : si la case derrière est tenue
 * par une créature, celle-ci recule d'une case avant, et ainsi de suite dans la
 * même colonne — la chaîne se déplie tant que la place est libre derrière.
 *
 * **La chaîne s'arrête au blocage** : un bord du camp, un Site (un Site ne
 * marche pas) ou une case hors grille arrêtent le recul. Les créatures devant
 * le blocage ne bougent alors pas non plus — leur case n'est pas libérée —,
 * mais rien n'est cassé : la frappe (ou la pose) n'a simplement pas eu lieu
 * pour la poussée.
 *
 * ## Le périmètre
 *
 * - **Les deux camps** : la règle est symétrique — nos créatures repoussées
 *   après avoir frappé le sorcier, celles du sorcier après avoir frappé le
 *   nôtre, et les envahisseurs de chaque bord poussés par une invocation.
 * - **Rien sans les lignes** : le champ d'origine (cinq cases, une seule
 *   rangée) n'a pas de bout du plateau ni de ligne arrière envahie ; le MOBA
 *   garde sa géométrie.
 * - **Aucun coût** : la créature déplacée n'a ni pas ni attaque à payer — c'est
 *   le plateau qui la déplace.
 */

import {
  RPG_RANGEE_JOUEUR_FOND, RPG_RANGEE_SORCIER_FOND, RPG_RANGEES,
  campDeRangee, caseLocale, positionDe,
} from './rpgChamp.js';
import { duelCardById } from './rpgCards.js';
import { champMax, ligneDeCase, lignesActives, RPG_LIGNE_FOND } from './rpgLignes.js';

/** Une case de recul. */
export const RPG_RECUL_CASES = 1;

/** La rangée du bout du plateau pour ce camp : celle qui touche le sorcier
 *  adverse. Le joueur le frappe depuis le fond du sorcier, le sorcier depuis
 *  le nôtre. */
export function rangeeDuBout(cote) {
  return cote === 'joueur' ? RPG_RANGEE_SORCIER_FOND : RPG_RANGEE_JOUEUR_FOND;
}

/** Le sens du recul : on s'éloigne du sorcier que l'on vient de frapper — et
 *  un envahisseur poussé retourne vers son propre camp, dans le même sens. */
export function sensDuRecul(cote) {
  return cote === 'joueur' ? 1 : -1;
}

/** Cette créature se tient-elle sur le bout du plateau, face au sorcier
 *  adverse ? */
export function rpgAuBoutDuPlateau(duel, cote, entite) {
  if (!entite || !lignesActives(duel) || duel?.moba) return false;
  const position = positionDe(entite, cote);
  return Boolean(position) && position.rangee === rangeeDuBout(cote);
}

const nomDe = (entite) => duelCardById(entite?.carteId)?.name ?? entite?.name ?? 'une créature';
const estSite = (entite) => duelCardById(entite?.carteId)?.kind === 'site';

/** Qui tient quelle case des rangées de `cote` — les deux camps confondus,
 *  indexés par la case **locale** de ce camp. Une chaîne traverse les deux
 *  propriétaires sans s'en soucier. */
export function rpgOccupationsRangee(duel, cote) {
  const occupations = new Map();
  for (const proprietaire of ['joueur', 'sorcier']) {
    for (const entite of duel?.[proprietaire]?.creatures ?? []) {
      const position = positionDe(entite, proprietaire);
      if (!position) continue;
      const index = caseLocale(cote, position.rangee, position.colonne);
      if (index === null) continue;
      occupations.set(index, { entite, cote: proprietaire, rangee: position.rangee, colonne: position.colonne });
    }
  }
  return occupations;
}

/**
 * La chaîne que formerait une poussée, **sans rien déplacer** : la créature
 * visée, puis chaque créature derrière elle, même colonne, jusqu'au premier
 * trou. C'est la seule lecture dont une vérification de faisabilité a besoin —
 * `rpgCasesPose` l'appelle pour chaque case et ne doit rien muter.
 */
function chaineDePoussee(position, sens, occupants) {
  const rien = (raison) => ({ ok: false, raison, chaine: [] });
  if (!position) return rien('case');
  // 1. La chaîne : la créature visée, puis chaque créature derrière elle, même
  //    colonne. On s'arrête au premier trou — c'est lui qui fait de la place.
  const chaine = [{ ...position }];
  let rangee = position.rangee;
  for (;;) {
    const suivante = rangee + sens * RPG_RECUL_CASES;
    if (!RPG_RANGEES.includes(suivante)) return rien('bord');
    const occupant = occupants.get(`${suivante}:${position.colonne}`);
    if (!occupant) break;
    // Un Site ne marche pas : il bloque la chaîne, et ceux devant lui non plus
    // ne bougent pas (leur case n'est pas libérée).
    if (estSite(occupant.entite)) return rien('site');
    chaine.push({ ...occupant, rangee: suivante });
    rangee = suivante;
  }
  return { ok: true, raison: null, chaine, colonne: position.colonne, sens };
}

/**
 * Pousse d'une case la créature qui occupe `position`, dans le sens `sens`, et
 * toute la chaîne derrière elle. Rend `{ ok, raison, reculs }`.
 */
function pousserChaine(position, sens, occupants) {
  const { ok, raison, chaine, colonne } = chaineDePoussee(position, sens, occupants);
  if (!ok) return { ok: false, raison, reculs: [] };

  // Le décalage, du plus lointain au plus proche : chacun prend la case
  //    laissée libre par celui qui le précède.
  const reculs = [];
  for (const membre of [...chaine].reverse()) {
    const camp = campDeRangee(membre.rangee + sens);
    const index = caseLocale(camp, membre.rangee + sens, colonne);
    if (index === null) return rien('case');
    const avant = membre.entite.emplacement;
    membre.entite.emplacement = index;
    if (camp === membre.cote) delete membre.entite.campPose;
    else membre.entite.campPose = camp;
    // La case n'est plus celle de sa fiche : la remise en ligne ne doit pas
    // rapatrier la créature.
    membre.entite.avancee = true;
    reculs.push({ entiteId: membre.entite.id, cote: membre.cote, avant, apres: index, rangee: membre.rangee + sens });
  }
  reculs.reverse();
  return { ok: true, reculs };
}

/** La même table d'occupation, mais indexée par `rangée:colonne` absolues. */
function occupationsAbsolues(duel) {
  const occupations = new Map();
  for (const proprietaire of ['joueur', 'sorcier']) {
    for (const entite of duel?.[proprietaire]?.creatures ?? []) {
      const position = positionDe(entite, proprietaire);
      if (!position) continue;
      occupations.set(`${position.rangee}:${position.colonne}`, { entite, cote: proprietaire, ...position });
    }
  }
  return occupations;
}

/**
 * Repousse d'une case la créature qui vient de frapper le sorcier depuis le
 * bout du plateau, et toute la chaîne de créatures derrière elle.
 *
 * `raison` dit pourquoi rien n'a bougé le cas échéant : `sans-lignes`,
 * `pas-au-bout`, `bord`, `site`, `case`.
 */
export function rpgReculerApresFrappe(duel, cote, entiteId) {
  const rien = (raison) => ({ ok: false, raison, reculs: [] });
  if (!duel || duel.moba || !lignesActives(duel)) return rien('sans-lignes');
  const entite = duel[cote]?.creatures?.find((e) => e.id === entiteId);
  if (!entite || !rpgAuBoutDuPlateau(duel, cote, entite)) return rien('pas-au-bout');

  const position = positionDe(entite, cote);
  const res = pousserChaine({ entite, cote, ...position }, sensDuRecul(cote), occupationsAbsolues(duel));
  if (!res.ok) return res;
  const noms = res.reculs.map((recul) => nomDe(duel[recul.cote]?.creatures?.find((e) => e.id === recul.entiteId)));
  duel.log.push(res.reculs.length > 1
    ? `Le bout du plateau ne se tient pas : ${noms.join(', ')} reculent d’une case.`
    : `${noms[0]} est repoussée d’une case — le bout du plateau ne se tient pas.`);
  return res;
}

/**
 * La ligne d'arrivée de `cote` (`ligne`, le fond si l'appelant n'en sait
 * rien), case par case : qui la tient, et si un envahisseur peut être poussé
 * pour ouvrir la place. C'est la seule lecture dont la pose a besoin — le
 * joueur choisit une colonne, pas une ligne : la carte impose la sienne.
 *
 * - `propre: true` — la case est tenue par une de nos créatures ;
 * - `poussable: true` — un envahisseur la tient **et** la chaîne peut se
 *   déplier derrière lui : l'invocation le repoussera d'une case.
 */
export function rpgCasesPose(duel, cote, ligne = RPG_LIGNE_FOND) {
  if (!duel || duel.moba || !lignesActives(duel)) return [];
  const occupations = rpgOccupationsRangee(duel, cote);
  const maximum = champMax(duel);
  const cases = [];
  for (let index = 0; index < maximum; index += 1) {
    // Seules les cases de la ligne d'arrivée sont des cases d'arrivée.
    if (ligneDeCase(index) !== ligne) continue;
    const occupant = occupations.get(index) ?? null;
    if (!occupant) { cases.push({ index, occupant: null, propre: false, poussable: false }); continue; }
    const propre = occupant.cote === cote;
    const poussable = !propre && !estSite(occupant.entite)
      && chaineDePoussee({ ...occupant }, sensDuRecul(occupant.cote), occupationsAbsolues(duel)).ok;
    cases.push({ index, occupant: occupant.entite, propre, poussable });
  }
  return cases;
}

/**
 * Pousse l'envahisseur qui tient `index` (case locale de `cote`) pour ouvrir
 * la place. `raison` : `sans-lignes`, `libre`, `chez-nous`, `site`, `bord`,
 * `case`.
 */
export function rpgPousserEnvahisseur(duel, cote, index) {
  const rien = (raison) => ({ ok: false, raison, reculs: [] });
  if (!duel || duel.moba || !lignesActives(duel)) return rien('sans-lignes');
  const occupant = rpgOccupationsRangee(duel, cote).get(index);
  if (!occupant) return rien('libre');
  if (occupant.cote === cote) return rien('chez-nous');
  if (estSite(occupant.entite)) return rien('site');
  const res = pousserChaine({ ...occupant }, sensDuRecul(occupant.cote), occupationsAbsolues(duel));
  if (!res.ok) return res;
  duel.log.push(`${nomDe(occupant.entite)} est repoussée d’une case : la ligne arrière s’ouvre à l’invocation.`);
  return res;
}
