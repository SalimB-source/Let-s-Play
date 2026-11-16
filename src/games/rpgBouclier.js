/** Repérage visuel des créatures Défenseur, imprimées ou acquises en jeu.
 * La classe conserve les repères propres au statut ; toutes les faces restent
 * rectangulaires. Les règles de jeu restent dans rpgDefenseur.js. */

import { estDefenseur } from './rpgDefenseur.js';

/** La classe posée sur les faces des créatures Défenseur. */
export const CLASSE_BOUCLIER = 'rpg-carte-bouclier';

/** Seuls les créatures et les héros portent ce repère. */
const TYPES_BOUCLIER = new Set(['creature', 'hero']);

/**
 * Vrai quand cette carte porte le repère Défenseur.
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
