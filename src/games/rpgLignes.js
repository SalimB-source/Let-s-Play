/**
 * Le Sablier — les **deux lignes** du champ de bataille.
 *
 * Le champ de quatre places devient un champ de **deux lignes de quatre cases** :
 * une ligne de **front**, face à l'adversaire, et une ligne du **fond**,
 * derrière elle. La ligne n'est pas un choix : elle vient de la **carte**.
 *
 * - une créature **À distance** (`carte.distance`) se tient au fond ;
 * - une créature à l'**Attaque ciblée** (`coupRapide`) aussi : frapper sans
 *   recevoir de coup en retour, c'est frapper de loin — Salem, Fériel,
 *   l'Ifrit al-Ahmar et les autres tireurs se rangent donc derrière ;
 * - les autres — les corps à corps — tiennent le front ;
 * - le **Défenseur** est devant, toujours : c'est le mur, et sa ligne gagne
 *   sur tout le reste (un Défenseur « à distance » resterait devant).
 *
 * `poserCarte(…, emplacement)` peut encore désigner une case précise (glisser
 * une carte sur une case, raccourci) : la case est refusée si elle n'est pas
 * dans la ligne de la carte, et la pose se rabat alors sur la première case
 * libre de cette ligne (`caseParDefaut`).
 *
 * ## La règle
 *
 * **Tant qu'une créature tient le front, le fond est hors de portée des
 * attaques de mêlée.** Une attaque de mêlée ne peut pas désigner une créature
 * du fond : elle doit d'abord abattre la ligne qui la protège. Deux attaquants
 * passent la ligne :
 *
 * - l'**Attaque ciblée** (`coupRapide`), qui choisit déjà sa cible et ignore
 *   les Défenseurs — l'archer voit le fond ;
 * - l'**Infiltration** (`infiltration`), qui se glisse derrière les lignes.
 *
 * Le **Défenseur** reste devant : sa ligne est imposée (`ligneObligee`), et il
 * continue d'attirer les attaques — les deux règles se composent, le filtre de
 * ligne s'applique **avant** la priorité des Défenseurs (voir
 * `rpgCiblesIndividuellesClassique`).
 *
 * ## Ce que la règle ne fait pas
 *
 * - **Les sorts ne sont pas concernés** : une magie garde toutes ses cibles.
 *   Seules les attaques de créature suivent la ligne, sinon le fond serait
 *   invulnérable.
 * - **Front tombé, plus de protection** : dès qu'aucune créature ne tient le
 *   front, le fond redevient une cible ordinaire. C'est ce qui empêche la
 *   règle de figer une partie — un camp réduit à ses archers reste attaquable.
 * - **Hors duel à lignes** (`duel.lignes !== true`) : aucune créature n'a de
 *   case de fond, `ligneDe` rend toujours `front`, et le filtre ne retire rien.
 *   Les modes historiques, le MOBA et les parties sauvegardées d'avant les
 *   lignes gardent donc exactement leur comportement.
 *
 * ## La géométrie
 *
 * Une seule source de vérité : la **case** de la créature (`entite.emplacement`,
 * 0 à 7, comme avant mais sur huit places). Les cases 0 à 3 sont le front, les
 * cases 4 à 7 le fond. Rien d'autre n'est stocké : une créature déplacée de
 * ligne change de case, et une sauvegarde relue retrouve sa ligne toute seule.
 */

import { campDeLaCreature } from './rpgChamp.js';
import { attaqueDirectePermise, estDefenseur } from './rpgDefenseur.js';
import { duelCardById } from './rpgCards.js';

export const RPG_LIGNE_FRONT = 'front';
export const RPG_LIGNE_FOND = 'fond';
export const RPG_LIGNES = Object.freeze([RPG_LIGNE_FRONT, RPG_LIGNE_FOND]);

/** Quatre cases par ligne (front 0-3, fond 4-7). */
export const RPG_LIGNES_CASES = 4;
/** Les huit cases du champ à deux lignes (front 0-3, fond 4-7). */
export const RPG_LIGNES_CHAMP_MAX = RPG_LIGNES_CASES * 2;

/** Les lignes sont une variante de partie, portée par le duel lui-même —
 *  comme `duel.moba` ou `duel.modeMana`. Sans ce drapeau, tout est en front. */
export function lignesActives(duel) {
  return Boolean(duel?.lignes);
}

/** La ligne d'une case. Hors bornes (sauvegarde retouchée, case inconnue),
 *  la case est traitée comme du front : on ne cache jamais une créature
 *  derrière une protection qu'elle n'a pas. */
export function ligneDeCase(index) {
  return Number.isInteger(index) && index >= RPG_LIGNES_CASES && index < RPG_LIGNES_CHAMP_MAX
    ? RPG_LIGNE_FOND
    : RPG_LIGNE_FRONT;
}

/** La ligne d'une créature — `front` par défaut, y compris pour une entité
 *  sans case (mode historique, jeton pas encore placé). */
export function ligneDe(entite) {
  return ligneDeCase(entite?.emplacement);
}

/** Les cases d'une ligne, dans l'ordre. */
export function casesDeLigne(ligne) {
  const debut = ligne === RPG_LIGNE_FOND ? RPG_LIGNES_CASES : 0;
  return Array.from({ length: RPG_LIGNES_CASES }, (_, index) => debut + index);
}

/**
 * La ligne où **cette** carte entre en jeu : celle que sa fiche porte.
 *
 * Un corps à corps et un Défenseur arrivent **devant**, une créature « À
 * distance » ou à l'Attaque ciblée **derrière** — le champ se lit comme la
 * carte le dit, sans temps de mise en place. Le pas reste possible ensuite
 * (`rpgMouvement.js`) : un tireur peut monter au front, un corps à corps
 * reculer au fond, et le Défenseur ne quitte jamais son camp.
 */
export function ligneDePose(carte) {
  const fiche = typeof carte === 'string' ? duelCardById(carte) : carte;
  return fiche ? ligneObligee(fiche) : RPG_LIGNE_FRONT;
}

/** La ligne d'une carte, telle que sa fiche la décrit. **Défenseur** devant,
 *  **À distance** et **Attaque ciblée** derrière, les corps à corps devant.
 *  Ce n'est plus une contrainte de pose : c'est le repère de lecture d'une
 *  carte qui n'a pas encore de case (voir `ligneDePose`).
 *
 *  L'**Attaque ciblée** est un tir, pas une mêlée : la créature choisit sa
 *  cible et frappe sans recevoir de coup en retour. Elle se range donc au fond
 *  comme une carte marquée « À distance », sans qu'il faille imprimer les deux
 *  mots-clés sur la même fiche. Le **Défenseur** garde la priorité : c'est un
 *  mur, il reste devant, même s'il attaque de loin. */
export function ligneObligee(carte) {
  if (estDefenseur(carte)) return RPG_LIGNE_FRONT;
  return carte?.distance || carte?.coupRapide ? RPG_LIGNE_FOND : RPG_LIGNE_FRONT;
}

/** Une case que cette carte a le droit d'occuper à la pose : sa ligne. */
export function caseAutorisee(carte, index) {
  return ligneDeCase(index) === ligneDePose(carte);
}

/**
 * Cette case est-elle **choisissable** à la pose ? Le joueur choisit la
 * colonne, la **ligne est imposée par la carte** : les quatre cases du front
 * s'allument pour un corps à corps ou un Défenseur, celles du fond pour une
 * créature « À distance » ou à l'Attaque ciblée. L'**Envol** n'y change rien :
 * il décide du passage au-dessus des corps (`rpgCheminLibre`), pas du
 * placement.
 */
export function caseChoisissable(carte, index) {
  if (!Number.isInteger(index) || index < 0 || index >= RPG_LIGNES_CHAMP_MAX) return false;
  return caseAutorisee(carte, index);
}

/** Les cases encore libres pour cette carte : les places non prises de sa
 *  ligne, les seules où elle entre en jeu. `sansIds` retire des
 *  occupants du calcul — les victimes d'un sacrifice libèrent leur case avant
 *  que la créature n'arrive. */
export function casesLibresPour(camp, carte, maximum = RPG_LIGNES_CHAMP_MAX, sansIds = []) {
  const prises = new Set();
  for (const entite of camp?.creatures ?? []) {
    if (sansIds.includes(entite?.id)) continue;
    const index = entite?.emplacement;
    if (Number.isInteger(index) && index >= 0 && index < maximum) prises.add(index);
  }
  const libres = [];
  for (let index = 0; index < maximum; index += 1) {
    if (!prises.has(index) && caseChoisissable(carte, index)) libres.push(index);
  }
  return libres;
}

/** La case qu'une créature prend quand personne n'a choisi : la première case
 *  libre **de sa ligne**. `null` quand sa ligne est pleine — la créature
 *  n'entre pas, plutôt que d'aller se cacher derrière la ligne du joueur. */
export function caseParDefaut(carte, libres = []) {
  return libres.find((index) => caseAutorisee(carte, index)) ?? null;
}

/** Une créature vivante tient-elle le front de ce camp ? */
export function frontTient(creatures = []) {
  return creatures.some((entite) => ligneDe(entite) === RPG_LIGNE_FRONT);
}

/** Cette cible est-elle abritée derrière la ligne de son camp, pour cet
 *  attaquant-là ? Seule l'Attaque ciblée passe la ligne. */
export function ligneProtege(attaquant, cible, creaturesCible = []) {
  if (ligneDe(cible) !== RPG_LIGNE_FOND) return false;
  if (attaquant?.coupRapide) return false;
  return frontTient(creaturesCible);
}

/** Les cibles que cet attaquant peut réellement désigner, une fois le fond
 *  retiré. L'ordre des cibles survivantes est conservé : les appelants
 *  gardent leurs priorités (Défenseur, voie du MOBA, protection d'élément). */
export function filtreLigne(attaquant, creaturesCible = [], cibles = []) {
  if (!frontTient(creaturesCible)) return cibles;
  return cibles.filter((cible) => !ligneProtege(attaquant, cible, creaturesCible));
}

/**
 * Le **sorcier adverse** se frappe **à portée**, comme une créature.
 *
 * L'attaque directe — celle qui frappe le sorcier lui-même plutôt qu'une
 * créature — garde ses conditions (`attaqueDirectePermise` : plus rien à
 * frapper, envol sans Défenseur, infiltration seule). Les lignes y ajoutent la
 * leur : le sorcier se tient **derrière le fond** de son camp (`rpgChamp.js`),
 * donc
 *
 * - une **mêlée** (`portee 1`) doit avoir percé les deux lignes et se tenir sur
 *   le fond adverse pour le frapper ;
 * - une créature **à distance** (`portee 2`) le frappe depuis le front adverse.
 *
 * C'est la règle demandée : la portée remplace le contact. Une seule
 * exception : **hors des lignes** (`duel.lignes !== true`) ou au MOBA, la
 * fonction rend exactement ce que rendait `attaqueDirectePermise`.
 */
export function attaqueDirecteSurLesLignes(duel, attaquant, creaturesAdverses = [], ciblesAtteignables = null) {
  return attaqueDirectePermise(attaquant, creaturesAdverses, ciblesAtteignables);
}

/** Le nombre de cases du champ de ce duel : huit quand les lignes sont
 *  ouvertes, quatre sinon. Une seule question à poser partout où le moteur
 *  compte les places. */
export function champMax(duel) {
  return lignesActives(duel) ? RPG_LIGNES_CHAMP_MAX : RPG_LIGNES_CASES;
}

/** L'ordonnée d'une case pour les règles de **voisinage** (auras de Tarek,
 *  liens, adjacence) : les deux lignes sont deux rangées séparées, donc la
 *  case 3 (bout du front) et la case 4 (début du fond) ne sont pas voisines,
 *  alors qu'elles se suivent dans la numérotation. */
export function positionDeCase(index) {
  const ligne = ligneDeCase(index);
  const colonne = ligne === RPG_LIGNE_FOND ? index - RPG_LIGNES_CASES : index;
  return ligne === RPG_LIGNE_FOND ? 100 + colonne : colonne;
}
