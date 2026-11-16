/**
 * La face en bouclier des créatures Défenseur — src/games/rpgBouclier.js
 * ----------------------------------------------------------------------
 * Un Défenseur se repère déjà à son sonar rouge (`rpg-card__resonance--garde`)
 * et à sa pierre d'emblème (`i-defenseur`). Sa FACE devient l'ÉCUSSON lui-même
 * (voir `rpg-bouclier.css`) : aplat marine, arche haute, flancs droits, vraie
 * pointe en V, aucun rectangle qui dépasse. Reprenant la « Provocation » de
 * Hearthstone, elle ne porte plus de cadre métallique : sur le plateau, un
 * fin liseré rouge souligne sa silhouette. La pointe du bas n'est
 * pas coupée : le viewBox des
 * SVG laisse de la marge sous `50 124`. Les EFFETS pleine face (égide de
 * Bouclier et son impact, Furie, Envol, brume, ondes d'Aura, sang, givre)
 * prennent eux aussi la forme de l'écu : `rpg-bouclier.css` les masque et
 * remplace leur contour de boîte par un liseré d'écu coloré. Un calque
 * distinct trace un filet rouge plus fin et permanent pour Défenseur. Le masque ne
 * touche qu'aux calques : ATQ/DÉF, type, pierres, compteurs et badges gardent
 * exactement la taille des autres cartes ; le sonar `has-garde` reste présent,
 * dessiné dans la forme de l'écu. Sur le plateau, le pied ATQ/DÉF remonte de
 * 6 px (`translate: 0 -6px`), un simple décalage sans agrandissement.
 *
 * Une créature Défenseur POSÉE sur la table est aussi **10 % plus grande** que
 * ses voisines (`scale` sur `.rpg-card` dans `rpg-bouclier.css`), avec un peu
 * plus d'espacement entre les emplacements. L'agrandissement est visuel : la
 * boîte de mise en page ne change pas, donc les `cqw` et les tailles en px
 * restent identiques, et les seules icônes sont ramenées à l'échelle 1.
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
