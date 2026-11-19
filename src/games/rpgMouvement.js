/**
 * Le Sablier — le **mouvement** : une case par tour, puis la frappe.
 *
 * Une créature n'est plus clouée sur sa case. À son tour, elle peut **avancer
 * d'une case** et **frapper** — les deux, dans cet ordre : le déplacement ne
 * consomme pas l'attaque. Une seule avancée par tour (`entite.bouge`), une
 * seule attaque (`entite.attaquee`, déjà géré par le moteur).
 *
 * ## Les huit cases voisines
 *
 * Le champ est une grille (`rpgChamp.js`) : les huit cases autour de la
 * créature lui sont accessibles, y compris en diagonale et en arrière. Une case
 * occupée ne l'est jamais : on ne traverse pas un corps, on va sur une case
 * vide.
 *
 * ## Franchir la ligne neutre
 *
 * On ne franchit que **par une trouée** : la case du front adverse doit être
 * **vide**, et le passage se fait **droit devant**, dans la même colonne. Aucun
 * glissement en diagonale entre deux corps. Une fois chez l'adversaire, la
 * créature peut encore avancer d'une case (vers son fond) ou revenir chez elle
 * — toujours en une case par tour.
 *
 * ## Ce que le mouvement ne fait pas
 *
 * - **Rien hors des lignes** : sans `duel.lignes`, aucune créature ne bouge.
 *   Le champ de cinq cases et les modes historiques gardent leur géométrie.
 * - **Rien pour une créature engagée** (`attaquee`), gelée, ou déjà déplacée.
 * - **Rien pour un Site** : un site ne marche pas.
 * - **Aucune contrainte de carte** : le placement impose la ligne
 *   (`ligneObligee`), le mouvement non. Un tireur peut avancer au front, un
 *   corps à corps reculer au fond — c'est le joueur qui choisit.
 */

import {
  campDeRangee, campPoseDe, caseLocale, casesOccupees, positionDe, rangeeDeCase, RPG_RANGEES,
} from './rpgChamp.js';
import { duelCardById } from './rpgCards.js';
import { lignesActives } from './rpgLignes.js';

/** Une case par tour. */
export const RPG_MOUVEMENT_CASES = 1;

/** Cette créature peut-elle encore avancer ce tour ? */
export function rpgPeutBouger(duel, cote, entite) {
  if (!lignesActives(duel) || duel?.moba) return false;
  if (!entite || !Number.isInteger(entite.emplacement)) return false;
  if (entite.bouge || entite.attaquee) return false;
  if ((entite.gelToursRestants ?? 0) > 0) return false;
  const carte = duelCardById(entite.carteId);
  if (!carte || carte.kind === 'site') return false;
  return true;
}

/**
 * Le **chemin** entre deux cases est-il libre ? On ne traverse pas un corps :
 * toute case strictement intermédiaire (même rangée ou même colonne) doit être
 * vide, dans l'un **ou** l'autre camp. Aujourd'hui le pas vaut une case, donc
 * la question ne se pose pas encore ; la règle est écrite ici pour que la
 * portée du pas puisse grandir sans qu'une créature glisse à travers une
 * autre — c'est le seul endroit où elle se décide.
 */
export function rpgCheminLibre(duel, depart, arrivee) {
  if (!depart || !arrivee) return false;
  const occupees = casesOccupees(duel);
  const dr = Math.sign(arrivee.rangee - depart.rangee);
  const dc = Math.sign(arrivee.colonne - depart.colonne);
  // Un déplacement qui n'est ni droit ni diagonal n'a pas de chemin à lire.
  if (dr && dc && Math.abs(arrivee.rangee - depart.rangee) !== Math.abs(arrivee.colonne - depart.colonne)) return false;
  let rangee = depart.rangee + dr;
  let colonne = depart.colonne + dc;
  while (rangee !== arrivee.rangee || colonne !== arrivee.colonne) {
    const camp = campDeRangee(rangee);
    const index = caseLocale(camp, rangee, colonne);
    if (index === null) return false;
    if (occupees.has(`${camp}:${index}`)) return false;
    rangee += dr;
    colonne += dc;
  }
  return true;
}

/** Les cases où cette créature peut aller, dans l'ordre de lecture du champ. */
export function deplacementsLegaux(duel, cote, entiteId) {
  const entite = duel?.[cote]?.creatures?.find((e) => e.id === entiteId);
  if (!entite || !rpgPeutBouger(duel, cote, entite)) return [];
  const position = positionDe(entite, cote);
  if (!position) return [];
  const occupees = casesOccupees(duel);
  const campActuel = campPoseDe(entite, cote);
  const destinations = [];
  for (let dr = -RPG_MOUVEMENT_CASES; dr <= RPG_MOUVEMENT_CASES; dr += 1) {
    for (let dc = -RPG_MOUVEMENT_CASES; dc <= RPG_MOUVEMENT_CASES; dc += 1) {
      if (!dr && !dc) continue;
      const rangee = position.rangee + dr;
      const colonne = position.colonne + dc;
      if (!RPG_RANGEES.includes(rangee)) continue;
      const camp = rangee <= 1 ? 'sorcier' : 'joueur';
      const index = caseLocale(camp, rangee, colonne);
      if (index === null) continue;
      // Franchir la ligne neutre se fait par une trouée : droit devant.
      if (camp !== campActuel && dc !== 0) continue;
      if (occupees.has(`${camp}:${index}`)) continue;
      // Un corps sur le chemin arrête la créature : elle ne passe pas à travers.
      if (!rpgCheminLibre(duel, position, { rangee, colonne })) continue;
      destinations.push({ camp, index, rangee, colonne });
    }
  }
  return destinations;
}

/** Le libellé d'une case, pour le journal : « front du sorcier, colonne 3 ». */
export function libelleCase(destination) {
  if (!destination) return 'une case inconnue';
  const ligne = rangeeDeCase(destination.camp, destination.index) % 2 === 1 ? 'front' : 'fond';
  const camp = destination.camp === 'joueur' ? 'votre camp' : 'le camp du sorcier';
  return `${ligne} de ${camp}, colonne ${destination.colonne + 1}`;
}

/** Déplace la créature sur une case légale, et note son avancée. */
export function rpgDeplacerCreature(duel, cote, entiteId, destination) {
  const entite = duel?.[cote]?.creatures?.find((e) => e.id === entiteId);
  if (!entite) return { ok: false, raison: 'inconnue' };
  if (!rpgPeutBouger(duel, cote, entite)) return { ok: false, raison: 'pas-disponible' };
  const legales = deplacementsLegaux(duel, cote, entiteId);
  const cible = legales.find((c) => c.camp === destination?.camp && c.index === destination?.index);
  if (!cible) return { ok: false, raison: 'case' };
  const campProprietaire = campPoseDe(entite, cote);
  if (cible.camp === cote) delete entite.campPose;
  else entite.campPose = cible.camp;
  entite.emplacement = cible.index;
  entite.bouge = true;
  // La case n'est plus celle que la carte impose : la remise dans la ligne de
  // `rpgEmplacementsChamp` ne doit plus rapatrier la créature.
  entite.avancee = true;
  const franchit = cible.camp !== campProprietaire;
  duel.log.push(`${entite.name} avance en ${libelleCase(cible)}${franchit ? ' — elle passe chez l’adversaire' : ''}.`);
  return { ok: true, destination: cible, franchit };
}

/** Les créatures de ce camp qui peuvent encore avancer ce tour. */
export function creaturesMouvantes(duel, cote) {
  return (duel?.[cote]?.creatures ?? []).filter((entite) => rpgPeutBouger(duel, cote, entite));
}
