/**
 * Le Sablier — les **portées** du champ à deux lignes.
 *
 * Les lignes disent *où* se tient une créature ; les portées disent *qui elle
 * peut frapper*. Les deux règles se composent, dans cet ordre :
 *
 * 1. **La ligne protège** (`filtreLigne`, `rpgLignes.js`) : tant qu'une
 *    créature tient le front adverse, le fond est hors d'atteinte — sauf pour
 *    l'Attaque ciblée et l'Infiltration.
 * 2. **La portée limite** (`filtrePortee`, ici) : parmi les cibles que la ligne
 *    laisse passer, seules celles qui sont à distance restent désignables.
 *
 * ## Les portées
 *
 * - **Mêlée** (`portee: 1`) : la case juste en face, même colonne. Si personne
 *   ne s'y tient, la diagonale s'ouvre — une case à gauche ou à droite — mais
 *   **jamais par-derrière** : on ne se retourne pas en plein combat.
 * - **À distance** (`portee: 2`, mot-clé `distance`) : deux cases, mesurées en
 *   pas de grille (lignes + colonnes). Un tireur du front atteint donc le front
 *   adverse, un tireur du fond aussi ; le fond adverse reste protégé tant que
 *   son front tient.
 * - **Attaque ciblée** (`coupRapide`) : n'importe où, la ligne seule décide.
 *
 * ## La géométrie
 *
 * Le champ est une grille de **deux lignes de cinq cases par camp**, les deux
 * fronts face à face de part et d'autre de la ligne neutre. Une case se lit
 * donc en (ligne, colonne) :
 *
 *     profondeur 0 = front, 1 = fond ;  colonne = case % 5
 *
 * La distance entre deux cases de camps opposés est la somme des profondeurs
 * plus un (les deux fronts se touchent) et de l'écart de colonne :
 *
 *     distance = profondeur(A) + profondeur(B) + 1 + |colonne(A) - colonne(B)|
 *
 * Front contre front : 1. Front contre fond : 2. Fond contre fond : 3.
 *
 * ## Ce que la portée ne fait pas
 *
 * - **Rien hors des lignes** : sans `duel.lignes`, la fonction rend les cibles
 *   telles quelles. Les modes historiques, le MOBA et les parties sauvegardées
 *   d'avant les lignes gardent exactement leur comportement.
 * - **Rien sans case** : une créature sans `emplacement` (jeton pas encore
 *   posé, entité d'un ancien mode) n'est pas filtrée.
 * - **Les sorts ne sont pas concernés** : une magie garde toutes ses cibles.
 */

import { RPG_LIGNES_CASES, champMax, lignesActives } from './rpgLignes.js';

/** Portée d'une attaque de mêlée : la case d'en face. */
export const RPG_PORTEE_MELEE = 1;
/** Portée d'un tir : deux cases. */
export const RPG_PORTEE_DISTANCE = 2;

const caseConnue = (index) => Number.isInteger(index) && index >= 0 && index < RPG_LIGNES_CASES * 2;

/** 0 pour le front, 1 pour le fond. Une case inconnue se lit comme du front. */
export function profondeurDeCase(index) {
  return caseConnue(index) && index >= RPG_LIGNES_CASES ? 1 : 0;
}

/** La colonne d'une case (0 à 4), la même pour les deux lignes. */
export function colonneDeCase(index) {
  return caseConnue(index) ? index % RPG_LIGNES_CASES : 0;
}

/** La portée d'attaque d'une créature, en cases de grille. */
export function porteeDe(entite) {
  if (entite?.coupRapide) return Number.POSITIVE_INFINITY;
  return entite?.distance ? RPG_PORTEE_DISTANCE : RPG_PORTEE_MELEE;
}

/** Distance de grille entre deux cases de camps opposés (`null` si inconnue). */
export function distanceDeCases(caseA, caseB) {
  if (!caseConnue(caseA) || !caseConnue(caseB)) return null;
  return profondeurDeCase(caseA) + profondeurDeCase(caseB) + 1
    + Math.abs(colonneDeCase(caseA) - colonneDeCase(caseB));
}

/** Les cases du front d'un camp qui portent encore une créature. */
function casesFrontOccupees(creatures = []) {
  const occupees = new Set();
  for (const entite of creatures) {
    const index = entite?.emplacement;
    if (caseConnue(index) && profondeurDeCase(index) === 0) occupees.add(index);
  }
  return occupees;
}

/**
 * Cette cible est-elle à portée de cet attaquant ?
 *
 * `creaturesCible` sert à la seule règle de la diagonale : un corps à corps
 * frappe droit devant, et ne prend la diagonale que si la case d'en face est
 * vide. Rien d'autre n'est consulté — une attaque ne dépend pas du reste du
 * plateau.
 */
export function cibleAPortee(attaquant, cible, creaturesCible = []) {
  const portee = porteeDe(attaquant);
  if (portee === Number.POSITIVE_INFINITY) return true;
  const distance = distanceDeCases(attaquant?.emplacement, cible?.emplacement);
  if (distance === null) return true; // pas de case : aucune règle de portée
  if (distance <= portee) return true;
  // La diagonale d'ouverture : un corps à corps dont la case d'en face est
  // vide frappe d'un cran sur le côté, jamais dans le dos.
  if (portee === RPG_PORTEE_MELEE
    && profondeurDeCase(attaquant.emplacement) + profondeurDeCase(cible.emplacement) + 1 === 1
    && Math.abs(colonneDeCase(attaquant.emplacement) - colonneDeCase(cible.emplacement)) === 1) {
    const face = colonneDeCase(attaquant.emplacement);
    const occupees = casesFrontOccupees(creaturesCible);
    return !occupees.has(face);
  }
  return false;
}

/** Les cibles qui restent à portée, dans l'ordre reçu. */
export function filtrePortee(duel, attaquant, creaturesCible = [], cibles = []) {
  if (!lignesActives(duel) || duel?.moba) return cibles;
  if (!Number.isInteger(attaquant?.emplacement)) return cibles;
  return cibles.filter((cible) => cibleAPortee(attaquant, cible, creaturesCible));
}

/**
 * Les cases adverses que cet attaquant peut viser — la matière du survol qui
 * montre sa portée sur le plateau. Ne tient compte **que** de la géométrie :
 * la ligne et la protection d'élément restent l'affaire du moteur.
 */
export function casesAPortee(duel, attaquant, creaturesCible = []) {
  const maximum = champMax(duel);
  const occupees = new Map();
  for (const entite of creaturesCible) {
    if (caseConnue(entite?.emplacement)) occupees.set(entite.emplacement, entite);
  }
  const cases = [];
  for (const [index, entite] of occupees) {
    if (index >= maximum) continue;
    if (cibleAPortee(attaquant, entite, creaturesCible)) cases.push(index);
  }
  return cases.sort((a, b) => a - b);
}

/** La profondeur maximale du champ de ce duel (1 : deux lignes, 0 : une). */
export function profondeurMax(duel) {
  return lignesActives(duel) ? 1 : 0;
}
