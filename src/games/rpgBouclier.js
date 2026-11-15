/**
 * La face en bouclier des créatures Défenseur — src/games/rpgBouclier.js
 * ----------------------------------------------------------------------
 * Un Défenseur se repère déjà à son sonar rouge (`rpg-card__resonance--garde`)
 * et à sa pierre d'emblème (`i-defenseur`). Un ÉCUSSON héraldique est dessiné
 * par-dessus sa face (voir `rpg-bouclier.css`) : arche haute, flancs droits,
 * vraie pointe en bas. La carte ELLE-MÊME reste rectangulaire : ATQ/DÉF, type
 * et pierres gardent exactement la place et la taille des autres cartes.
 * La forme est portée par une seule classe, posée sur chaque présentation de
 * la carte par les composants qui la dessinent.
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
