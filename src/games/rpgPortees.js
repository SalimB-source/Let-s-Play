/**
 * Le Sablier — les **portées** du champ.
 *
 * Une créature peut **avancer d'une case par tour** (`rpgMouvement.js`) puis
 * frapper. Ce module ne dit qu'une chose : *à quelle distance elle peut
 * frapper*. La géométrie du champ (rangées absolues 0 à 3, colonnes 0 à 4, les
 * deux sorciers derrière leur fond) vit dans `rpgChamp.js`.
 *
 * ## Les portées
 *
 * - **Mêlée** (`portee: 1`) : **une case**, dans les huit directions — devant,
 *   à sa diagonale, ou derrière. La mesure est celle de Tchebychev
 *   (`rpgChamp.js`) : une case d'écart, que ce soit en rangée, en colonne ou
 *   les deux, vaut 1.
 * - **À distance** (`portee: 2`, mot-clé `distance`) : **deux cases**, même
 *   mesure. Un tireur du fond atteint le front adverse ; pour atteindre le fond
 *   adverse il doit avancer d'une case.
 * - **Attaque ciblée** (`coupRapide`) : n'importe où.
 *
 * ## Le sorcier
 *
 * Le sorcier adverse se tient **derrière le fond** de son camp. Il est donc à
 * une case d'une créature postée sur ce fond, et à deux cases d'une créature
 * postée sur son front. Autrement dit : une **mêlée doit avoir percé les deux
 * lignes** pour le frapper, une **créature à distance le frappe depuis le front
 * adverse**. Le contact n'est plus la seule voie — la portée décide, comme pour
 * les créatures.
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

import {
  campAdverse, campDeLaCreature, distanceAuSorcierAdverse, distanceDeGrille,
  distanceEntreCreatures, positionDe,
} from './rpgChamp.js';
import { RPG_LIGNES_CASES, champMax, lignesActives } from './rpgLignes.js';
import { porteeEffetCarte } from './rpgPorteesCartes.js';

/** Portée d'une attaque de mêlée : une case, dans les huit directions. */
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

/** La portée d'attaque d'une créature, en cases de grille.
 *
 * L'**Attaque ciblée** n'a plus de portée infinie : c'est un tir, il se mesure
 * comme les autres. Elle garde son avantage — frapper avant le combat et
 * arrêter là son attaque — mais doit, elle aussi, être à deux cases. */
export function porteeDe(entite) {
  if (entite?.distance || entite?.coupRapide) return RPG_PORTEE_DISTANCE;
  return RPG_PORTEE_MELEE;
}

/**
 * Distance de grille entre deux cases **de camps opposés**, chacune dans le
 * sien : la lecture historique, conservée pour les appelants qui n'ont que des
 * index. Une créature avancée chez l'adversaire se mesure avec
 * `distanceEntreCreatures` (`rpgChamp.js`), qui connaît `campPose`.
 */
export function distanceDeCases(caseA, caseB) {
  if (!caseConnue(caseA) || !caseConnue(caseB)) return null;
  const a = { rangee: profondeurDeCase(caseA) === 0 ? 2 : 3, colonne: colonneDeCase(caseA) };
  const b = { rangee: profondeurDeCase(caseB) === 0 ? 1 : 0, colonne: colonneDeCase(caseB) };
  return distanceDeGrille(a, b);
}

/** Cette cible est-elle à portée de cet attaquant ? Les deux créatures sont
 *  lues dans leur propre camp — la version qui connaît `campPose` est
 *  `filtrePortee`, et c'est elle que le moteur appelle. */
export function cibleAPortee(attaquant, cible) {
  const portee = porteeDe(attaquant);
  if (portee === Number.POSITIVE_INFINITY) return true;
  const distance = distanceDeCases(attaquant?.emplacement, cible?.emplacement);
  if (distance === null) return true; // pas de case : aucune règle de portée
  return distance <= portee;
}

/** Les cibles qui restent à portée, dans l'ordre reçu.
 *
 *  Dans un duel à lignes, une créature **sans case** n'a aucune portée : sans
 *  position, il n'y a rien à mesurer, et la laisser frapper partout ouvrait la
 *  porte à des attaques depuis n'importe où (une invocation arrivée sans case,
 *  une partie reprise). Hors des lignes (modes historiques, MOBA), les cibles
 *  passent telles quelles. */
export function filtrePortee(duel, attaquant, creaturesCible = [], cibles = [], cote = null) {
  if (!lignesActives(duel) || duel?.moba) return cibles;
  if (!Number.isInteger(attaquant?.emplacement)) return [];
  const camp = cote ?? campDeLaCreature(duel, attaquant);
  if (!camp) return cibles;
  const portee = porteeDe(attaquant);
  if (portee === Number.POSITIVE_INFINITY) return cibles;
  return cibles.filter((cible) => {
    const distance = distanceEntreCreatures(attaquant, camp, cible, campAdverse(camp));
    return distance === null ? true : distance <= portee;
  });
}

/** La distance d'une créature au **sorcier adverse** (`null` sans case). */
export function distanceAuSorcier(duel, cote, entite) {
  if (!lignesActives(duel) || duel?.moba) return null;
  return distanceAuSorcierAdverse(entite, cote);
}

/** Le sorcier adverse est-il à portée de cette créature ? Hors des lignes,
 *  la question ne se pose pas : la réponse est `true` (comportement
 *  historique, c'est `attaqueDirectePermise` qui décide seul).
 *
 *  Dans un duel à lignes, une créature **sans case** ne l'atteint pas : la
 *  distance au sorcier se mesure depuis une position, et sans position il n'y
 *  a pas de portée.
 */
export function sorcierAPortee(duel, cote, entite) {
  if (!lignesActives(duel) || duel?.moba) return true;
  if (!Number.isInteger(entite?.emplacement)) return false;
  const distance = distanceAuSorcierAdverse(entite, cote);
  if (distance === null) return false;
  return distance <= porteeDe(entite);
}

/**
 * Les cases adverses que cet attaquant peut viser — la matière du survol qui
 * montre sa portée sur le plateau. Ne tient compte **que** de la géométrie :
 * la protection d'élément et les priorités restent l'affaire du moteur.
 */
export function casesAPortee(duel, attaquant, creaturesCible = [], cote = null) {
  const maximum = champMax(duel);
  const camp = cote ?? campDeLaCreature(duel, attaquant);
  if (!camp) return [];
  const portee = porteeDe(attaquant);
  const cases = [];
  for (const entite of creaturesCible) {
    const index = entite?.emplacement;
    if (!Number.isInteger(index) || index < 0 || index >= maximum) continue;
    const position = positionDe(entite, campAdverse(camp));
    if (!position) continue;
    // Une créature peut avoir avancé chez nous : sa case est alors dans notre
    // camp. On rend la case **du camp adverse**, celle que le survol dessine.
    if (position.camp !== campAdverse(camp)) continue;
    const distance = distanceEntreCreatures(attaquant, camp, entite, campAdverse(camp));
    if (distance !== null && distance <= portee) {
      cases.push({ index, ligne: position.rangee % 2 === 1 ? 'front' : 'fond', colonne: position.colonne });
    }
  }
  return cases.sort((a, b) => a.index - b.index);
}

/** La profondeur maximale du champ de ce duel (1 : deux lignes, 0 : une). */
export function profondeurMax(duel) {
  return lignesActives(duel) ? 1 : 0;
}

/**
 * ## Les portées des **effets** de créature
 *
 * La portée d'attaque (`porteeDe`) dit jusqu'où une créature frappe au combat.
 * Celle-ci dit jusqu'où porte son **effet d'arrivée** : l'Oni qui arrive ne
 * foudroie pas la moitié du plateau, il frappe ce qui est à sa portée. La
 * valeur est écrite **sur la carte** (`arrivee.porteeCases`) — une portée par
 * carte, décidée par la fiche :
 *
 * - `1` — contact : une lame ne touche que ce qui la touche (les duels) ;
 * - `2` — tir : ce qui frappe ou soigne **à distance** (tours, Völva, éclats
 *   d'ombre, effets d'arrivée des archers) ;
 * - absent — sans limite : les effets déjà globaux (zones, renvois de masse)
 *   et tout ce qui ne désigne pas une créature en jeu.
 *
 * Sans géométrie (duel d'avant les lignes, MOBA), aucune portée n'est
 * opposée : on ne refuse rien là où il n'y a rien à mesurer.
 */
export function porteeDeCarte(carte) {
  // Une portée peut être écrite sur la fiche (`porteeCases`) ou venir du
  // tableau central (`rpgPorteesCartes.js`) — le tableau gagne pour les cartes
  // qui vivent dans plusieurs fichiers de données.
  const ecrite = carte?.arrivee?.porteeCases ?? carte?.capacite?.porteeCases ?? null;
  if (Number.isFinite(ecrite) && ecrite > 0) return ecrite;
  return porteeEffetCarte(carte?.id ?? carte?.carteId ?? null);
}

/** La créature source d'un effet d'arrivée, dans son camp. */
export function sourceDeLEffet(duel, cote, sourceId) {
  if (!sourceId) return null;
  return duel?.[cote]?.creatures?.find((entite) => entite.id === sourceId) ?? null;
}

/** La cible désignée est-elle encore à portée de l'effet ? */
export function cibleDeLEffetAPortee(duel, cote, sourceId, cible, campCible, portee) {
  if (!portee) return true;
  const source = sourceDeLEffet(duel, cote, sourceId);
  if (!source || !cible) return true;
  const distance = distanceEntreCreatures(source, cote, cible, campCible ?? campAdverse(cote));
  if (distance === null) return true;
  return distance <= portee;
}

/** Les créatures d'un camp qu'un effet de cette portée peut désigner. */
export function ciblesDeLEffetAPortee(duel, cote, sourceId, portee, campCible = null) {
  const camp = campCible ?? campAdverse(cote);
  const creatures = duel?.[camp]?.creatures ?? [];
  if (!portee) return [...creatures];
  return creatures.filter((entite) => cibleDeLEffetAPortee(duel, cote, sourceId, entite, camp, portee));
}
