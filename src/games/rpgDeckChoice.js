/**
 * Deck de jeu choisi par le joueur (bouton « Sélectionner » de l'onglet Deck).
 *
 * Tout deck complet du catalogue peut être choisi — la Cour des Djinns comprise : elle
 * reste le deck que le sorcier joue par défaut, mais rien ne la réserve à l'adversaire.
 * Quand le joueur la joue, le sorcier prend un autre deck (`deckAdversePour`) plutôt que
 * d'enchaîner un duel miroir.
 *
 * Le choix est mémorisé sur l'appareil : au prochain lancement du jeu, le menu repart sur
 * le deck déjà choisi au lieu du deck par défaut.
 *
 * Le stockage suit la convention de `rpgStory.js` : accès `localStorage` tolérant (mode
 * privé, iframe : `null`), écriture silencieuse, lecture normalisée — un identifiant
 * périmé (deck retiré du catalogue ou devenu invalide) ou une valeur corrompue retombent
 * sur le deck par défaut, sans jamais casser le menu.
 */

import { RPG_DECKS, rpgValiderDeck } from './rpgCards.js';
import { deckMaisonEstSelectionnable, deckMaisonParId } from './rpgDeckBuilder.js';
import { ecrireProgression, lireProgression, stockageProgression } from '../lib/progressionScope.js';

export const RPG_DECK_STORAGE_KEY = 'letsplay_sablier_deck_v1';

/** Un deck se joue s'il est complet : 40 cartes qui respectent les quotas (`rpgValiderDeck`). */
export function deckEstSelectionnable(deck) {
  return Array.isArray(deck?.cardIds) && rpgValiderDeck(deck.cardIds).ok;
}

/** Un deck maison se joue de plus entièrement dans la collection du joueur (`rpgDeckBuilder.js`). */
export function deckMaisonJouable(deckId, decksMaison = [], collection = null) {
  const deck = deckMaisonParId(decksMaison, deckId);
  return deck ? deckMaisonEstSelectionnable(deck, collection) : false;
}

/** Un deck — du catalogue ou maison — se joue-t-il ? Les decks du catalogue ne consultent jamais la collection. */
export function deckSeJoue(deck, collection = null) {
  if (!deck) return false;
  return deck.maison ? deckMaisonEstSelectionnable(deck, collection) : deckEstSelectionnable(deck);
}

/** Deck de jeu tant que le joueur n'a rien choisi : le premier deck de départ du joueur. */
export function deckParDefaut() {
  return RPG_DECKS.find((deck) => deck.role === 'joueur' && deckEstSelectionnable(deck))
    ?? RPG_DECKS.find(deckEstSelectionnable)
    ?? RPG_DECKS[0]
    ?? null;
}

/** Deck que le sorcier joue par défaut en duel libre : celui de rôle « adversaire » (la Cour des Djinns). */
export function deckAdverseParDefaut() {
  return RPG_DECKS.find((deck) => deck.role === 'adversaire' && deckEstSelectionnable(deck)) ?? null;
}

/**
 * Deck du sorcier face au deck du joueur (le deck ou son identifiant) : son deck par défaut,
 * sauf si le joueur joue justement celui-là — le sorcier prend alors le deck de départ du
 * joueur, pour ne jamais lui faire face avec le même paquet.
 */
export function deckAdversePour(deckJoueur) {
  const joueurId = typeof deckJoueur === 'string' ? deckJoueur : deckJoueur?.id;
  return [deckAdverseParDefaut(), deckParDefaut(), ...RPG_DECKS]
    .find((deck) => deck && deck.id !== joueurId && deckEstSelectionnable(deck)) ?? null;
}

function estDeckJouable(deckId, decksMaison = [], collection = null) {
  if (typeof deckId !== 'string') return false;
  if (deckId.startsWith('maison-')) return deckMaisonJouable(deckId, decksMaison, collection);
  return RPG_DECKS.some((deck) => deck.id === deckId && deckEstSelectionnable(deck));
}

/** Identifiant du deck jouable décrit par une sauvegarde (`{ deckId }`), sinon `null`. */
export function normaliserDeckChoisi(value, decksMaison = [], collection = null) {
  return estDeckJouable(value?.deckId, decksMaison, collection) ? value.deckId : null;
}

function browserStorage() {
  return stockageProgression();
}

/** Charge le deck choisi sur cet appareil ; `null` s'il n'y en a pas (ou plus de valide). */
export function chargerDeckChoisi(decksMaison = [], collection = null) {
  const stockage = browserStorage();
  if (!stockage) return null;
  try {
    return normaliserDeckChoisi(JSON.parse(lireProgression(RPG_DECK_STORAGE_KEY, stockage) ?? 'null'), decksMaison, collection);
  } catch {
    return null;
  }
}

/**
 * Mémorise le deck choisi. Rend `true` si l'écriture a eu lieu ; `false` si ce n'est
 * pas un deck jouable ou si le stockage est indisponible (le choix reste alors valable
 * pour la session, mais ne survivra pas au rechargement).
 */
export function sauverDeckChoisi(deckId, decksMaison = [], collection = null) {
  if (!estDeckJouable(deckId, decksMaison, collection)) return false;
  const stockage = browserStorage();
  if (!stockage) return false;
  return ecrireProgression(RPG_DECK_STORAGE_KEY, JSON.stringify({ deckId }), stockage);
}
