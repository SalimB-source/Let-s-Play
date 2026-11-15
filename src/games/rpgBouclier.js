/**
 * La face en bouclier des créatures Défenseur — src/games/rpgBouclier.js
 * ----------------------------------------------------------------------
 * Un Défenseur se repère déjà à son sonar rouge (`rpg-card__resonance--garde`)
 * et à sa pierre d'emblème (`i-defenseur`). Sa FACE devient l'ÉCUSSON lui-même
 * (voir `rpg-bouclier.css`) : aplat marine, arche haute, flancs droits, vraie
 * pointe en V, aucun rectangle qui dépasse. Reprenant la « Provocation » de
 * Hearthstone, elle porte un cadre acier AFFINÉ (sans les ailettes latérales
 * refusées par le joueur), un fin liseré de la couleur de l'élément et une
 * ombre portée — le tout dessiné le long de la silhouette, jamais de cadre ni
 * d'ombre rectangulaires. La pointe du bas n'est pas coupée : le viewBox des
 * SVG laisse de la marge sous `50 124`. Le masque ne touche qu'au fond et à
 * l'illustration : ATQ/DÉF, type, pierres et sonar gardent exactement la place
 * et la taille des autres cartes.
 *
 * Exception demandée : la MAIN, le MULLIGAN, la MAIN DU MOBA et les APERÇUS
 * (survol + fiche catalogue ouverte) ne reçoivent PAS la classe et restent des
 * cartes rectangulaires normales, avec ATQ à gauche et DÉF à droite — comme
 * dans Hearthstone, où la Provocation ne se voit que sur le plateau. La classe
 * est donc posée sur la table et les vignettes du catalogue / atelier / guide /
 * boosters.
 *
 * Deux sources pour le mot-clé :
 *   - la carte imprimée (`defenseur: true`, ou les anciens marqueurs
 *     `provocation` / `prioriteAttaqueRapide`) ;
 *   - l'entité en jeu, qui peut AVOIR REÇU Défenseur pendant la partie
 *     (sort, équipement, arrivée) sans que sa carte l'imprime.
 *
 * `estDefenseur` reste l'unique autorité : ce module ne réécrit aucune règle,
 * il décide seulement si une face doit être dessinée en bouclier. Les sites,
 * les terrains, les armes et les sorts sont exclus, même s'ils portent par
 * erreur un marqueur de Défenseur.
 */

import { estDefenseur } from './rpgDefenseur.js';

/** La classe posée sur les faces des créatures Défenseur. */
export const CLASSE_BOUCLIER = 'rpg-carte-bouclier';

/** Seuls les créatures et les héros deviennent des écus. */
const TYPES_BOUCLIER = new Set(['creature', 'hero']);

/**
 * Vrai quand cette carte doit être dessinée en bouclier.
 * `carte` est la définition du catalogue, `entite` l'état courant sur la table
 * (facultatif : main, catalogue, aperçu n'en ont pas). Une définition brute
 * sans `kind` est encore une créature — le catalogue normalise ce champ.
 */
export function estCreatureBouclier(carte, entite = null) {
  if (!carte) return false;
  const type = carte.kind;
  if (type && !TYPES_BOUCLIER.has(type)) return false;
  // L'entité couvre le Défenseur reçu en cours de partie ; la carte couvre le
  // mot-clé imprimé, y compris sur les faces qui n'ont pas d'entité (main,
  // catalogue, aperçu, mulligan).
  return Boolean(estDefenseur(entite) || estDefenseur(carte));
}

/** La classe à ajouter à une face, ou une chaîne vide. */
export function classeBouclier(carte, entite = null) {
  return estCreatureBouclier(carte, entite) ? CLASSE_BOUCLIER : '';
}
