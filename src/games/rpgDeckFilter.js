/**
 * Filtre par couleur de l'étagère de decks (onglet Deck).
 *
 * Même logique que le filtre du Catalogue : une couleur retient les decks qui
 * l'emploient — un deck hybride Sable + Braise compte donc pour le Sable *et* pour
 * la Braise — et « hybride » retient les decks de plusieurs couleurs. Les puces
 * proposées découlent des decks existants : ajouter un deck Eau fait apparaître
 * la puce Eau, sans qu'aucune puce ne mène à une étagère vide.
 */

import { RPG_ELEMENTS, cardColors } from './rpgCards.js';

/** Couleurs de jeu, dans l'ordre d'affichage des puces (la Neige en dernier). */
const ORDRE_PUCES = ['sable', 'braise', 'eau', 'neige'];
/** Toute couleur future absente de cet ordre s'afficherait quand même, à la fin. */
const COULEURS = [...ORDRE_PUCES, ...RPG_ELEMENTS.filter((couleur) => !ORDRE_PUCES.includes(couleur))];

/** Valeurs du filtre (hors « toutes »), dans l'ordre d'affichage. */
export const RPG_DECK_FILTRES = [...COULEURS, 'hybride'];

/** Couleurs d'un deck (`element` + `elements`), sans doublon ni valeur inconnue. */
export function deckColors(deck) {
  return cardColors({ element: deck?.element, colors: deck?.elements });
}

/** Le deck passe-t-il le filtre ? « toutes » : tous ; « hybride » : plus d'une couleur ;
 *  une couleur : les decks qui l'emploient. */
export function deckCorrespondCouleur(deck, couleur = 'toutes') {
  if (couleur === 'toutes') return true;
  const couleurs = deckColors(deck);
  return couleur === 'hybride' ? couleurs.length > 1 : couleurs.includes(couleur);
}

/** Les decks retenus par le filtre, dans leur ordre d'origine. */
export function filtrerDecksParCouleur(decks, couleur = 'toutes') {
  return decks.filter((deck) => deckCorrespondCouleur(deck, couleur));
}

/**
 * Puces à proposer : « toutes », puis chaque couleur employée par au moins un deck.
 * `couleurs` : les couleurs à dessiner sur la puce (celles des decks hybrides pour
 * « hybride ») ; `nombre` : combien de decks la puce retient.
 */
export function filtresCouleurDecks(decks) {
  const filtres = [{ id: 'toutes', couleurs: [], nombre: decks.length }];
  for (const id of RPG_DECK_FILTRES) {
    const retenus = filtrerDecksParCouleur(decks, id);
    if (!retenus.length) continue;
    const couleurs = id === 'hybride'
      ? COULEURS.filter((couleur) => retenus.some((deck) => deckColors(deck).includes(couleur)))
      : [id];
    filtres.push({ id, couleurs, nombre: retenus.length });
  }
  return filtres;
}
