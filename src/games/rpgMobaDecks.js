import { cardById, cardColors } from './rpgCards.js';
import { RPG_STORY_TOURS, deckHistoire } from './rpgStoryTours.js';
import { MOBA_DECKS, rpgMobaValiderDeck } from './rpgMobaLocal.js';

/** Adapt deck metadata only; never replace cards or bypass the MOBA audit. */
export function rpgMobaDeckMaison(deck) {
  return { ...deck, name: deck.name ?? deck.nom ?? 'Deck maison', elements: deck.elements ?? (deck.element ? [deck.element] : []) };
}

// Nombre d'étages disposant d'un deck, avant le filtre de compatibilité MOBA.
export const MOBA_DECKS_TOURS_TOTAL = RPG_STORY_TOURS.reduce((total, tour) => total + tour.etages.filter((etage) => deckHistoire(etage.deck)).length, 0);

export const MOBA_DECKS_TOURS = Object.freeze(RPG_STORY_TOURS.flatMap((tour) => tour.etages.flatMap((etage) => {
  const cardIds = deckHistoire(etage.deck);
  if (!cardIds) return [];
  const deck = {
    id: `tour-${etage.id}`, name: etage.nom, description: tour.nom,
    cardIds, elements: [...new Set(cardIds.flatMap((id) => cardColors(cardById(id))))],
  };
  return rpgMobaValiderDeck(deck).ok ? [deck] : [];
})));

export function rpgMobaDeckTourAleatoire(rng = Math.random) {
  return MOBA_DECKS_TOURS[Math.min(MOBA_DECKS_TOURS.length - 1, Math.max(0, Math.floor(rng() * MOBA_DECKS_TOURS.length)))] ?? null;
}

/** Le duel libre affronte l'un des cinq archétypes construits, sans modifier
 * les adversaires scénarisés de la campagne ni les decks personnels. */
export function rpgMobaDeckLibreAleatoire(rng = Math.random) {
  return MOBA_DECKS[Math.min(MOBA_DECKS.length - 1, Math.max(0, Math.floor(rng() * MOBA_DECKS.length)))] ?? null;
}
