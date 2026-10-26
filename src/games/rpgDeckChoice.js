/**
 * Deck de jeu choisi par le joueur (bouton « Sélectionner » de l'onglet Deck).
 *
 * Depuis les **coffrets de bienvenue** (`rpgCoffretBienvenue.js`), il n'y a plus
 * de deck de base : l'étagère du joueur (`RPG_DECKS`) est vide, et ses decks sont
 * **ses decks de la maison** — celui de son coffret, puis ceux qu'il compose dans
 * l'atelier au fil des boosters. Ce module ne parle donc plus que de deux
 * familles :
 *
 *   - **les decks du joueur** (`decksMaison`) : ce qu'il peut sélectionner ;
 *   - **les archétypes** (`RPG_DECKS_ARCHETYPES`) : le répertoire de l'IA, du
 *     tutoriel et des duels en ligne — jamais proposé au joueur comme deck de
 *     départ, mais toujours jouable en face.
 *
 * Le choix est mémorisé sur l'appareil : au prochain lancement du jeu, le menu
 * repart sur le deck déjà choisi au lieu du premier de l'étagère.
 *
 * Le stockage suit la convention de `rpgStory.js` : accès `localStorage` tolérant (mode
 * privé, iframe : `null`), écriture silencieuse, lecture normalisée — un identifiant
 * périmé (deck supprimé, ou deck d'un ancien catalogue) ou une valeur corrompue retombent
 * sur le premier deck jouable, sans jamais casser le menu.
 */

import { RPG_DECKS, RPG_DECKS_ARCHETYPES, rpgValiderDeck } from './rpgCards.js';
import { deckMaisonEstSelectionnable, deckMaisonParId } from './rpgDeckBuilder.js';
import { ecrireProgression, lireProgression, stockageProgression } from '../lib/progressionScope.js';

export const RPG_DECK_STORAGE_KEY = 'letsplay_sablier_deck_v1';

/** Un deck se joue s'il est complet : 30 cartes qui respectent les quotas (`rpgValiderDeck`). */
export function deckEstSelectionnable(deck) {
  return Array.isArray(deck?.cardIds) && rpgValiderDeck(deck.cardIds).ok;
}

/** Un deck maison se joue de plus entièrement dans la collection du joueur (`rpgDeckBuilder.js`). */
export function deckMaisonJouable(deckId, decksMaison = [], collection = null, comptes = null) {
  const deck = deckMaisonParId(decksMaison, deckId);
  return deck ? deckMaisonEstSelectionnable(deck, collection, comptes) : false;
}

/** Un deck — du joueur ou archétype — se joue-t-il ? Les archétypes ne consultent jamais la collection. */
export function deckSeJoue(deck, collection = null, comptes = null) {
  if (!deck) return false;
  return deck.maison ? deckMaisonEstSelectionnable(deck, collection, comptes) : deckEstSelectionnable(deck);
}

/**
 * Deck de jeu tant que le joueur n'a rien choisi : **le premier deck de la
 * maison qui se joue** (celui du coffret, en pratique). Sans aucun deck — avant
 * l'ouverture du coffret —, il n'y a rien à jouer et la fonction rend `null` :
 * l'écran de bienvenue est là pour ça.
 */
export function deckParDefaut(decksMaison = [], collection = null, comptes = null) {
  const premiers = [...decksMaison, ...RPG_DECKS];
  return premiers.find((deck) => deckSeJoue(deck, collection, comptes)) ?? null;
}

/**
 * Le deck du sorcier en duel libre : le premier archétype jouable — la Cour des
 * Djinns, dans l'ordre du répertoire. Le sorcier ne joue jamais un deck de la
 * maison du joueur : ses cartes ne lui appartiennent pas.
 */
export function deckAdverseParDefaut() {
  return RPG_DECKS_ARCHETYPES.find((deck) => deck.role === 'adversaire' && deckEstSelectionnable(deck))
    ?? RPG_DECKS_ARCHETYPES.find((deck) => deckEstSelectionnable(deck))
    ?? null;
}

/**
 * Deck du sorcier face au deck du joueur (le deck ou son identifiant) : son
 * archétype par défaut, sauf si le joueur joue justement celui-là — le sorcier
 * prend alors un autre archétype, pour ne jamais lui faire face avec le même
 * paquet.
 */
export function deckAdversePour(deckJoueur) {
  const joueurId = typeof deckJoueur === 'string' ? deckJoueur : deckJoueur?.id;
  return [deckAdverseParDefaut(), ...RPG_DECKS_ARCHETYPES]
    .find((deck) => deck && deck.id !== joueurId && deckEstSelectionnable(deck)) ?? null;
}

/** Un archétype par son identifiant (tutoriel, PvP, mode Histoire). */
export function archetypeParId(id) {
  return RPG_DECKS_ARCHETYPES.find((deck) => deck.id === id) ?? null;
}

function estDeckJouable(deckId, decksMaison = [], collection = null, comptes = null) {
  if (typeof deckId !== 'string') return false;
  if (deckId.startsWith('maison-')) return deckMaisonJouable(deckId, decksMaison, collection, comptes);
  // Les archétypes restent des identifiants valides — un duel en ligne ou une
  // leçon peut les nommer — mais ils ne sont plus sur l'étagère : les nommer ne
  // suffit pas à les sélectionner côté joueur, `sauverDeckChoisi` s'en charge.
  return RPG_DECKS.some((deck) => deck.id === deckId && deckEstSelectionnable(deck));
}

/** Identifiant du deck jouable décrit par une sauvegarde (`{ deckId }`), sinon `null`. */
export function normaliserDeckChoisi(value, decksMaison = [], collection = null, comptes = null) {
  return estDeckJouable(value?.deckId, decksMaison, collection, comptes) ? value.deckId : null;
}

function browserStorage() {
  return stockageProgression();
}

/** Charge le deck choisi sur cet appareil ; `null` s'il n'y en a pas (ou plus de valide). */
export function chargerDeckChoisi(decksMaison = [], collection = null, comptes = null) {
  const stockage = browserStorage();
  if (!stockage) return null;
  try {
    return normaliserDeckChoisi(JSON.parse(lireProgression(RPG_DECK_STORAGE_KEY, stockage) ?? 'null'), decksMaison, collection, comptes);
  } catch {
    return null;
  }
}

/**
 * Mémorise le deck choisi. Rend `true` si l'écriture a eu lieu ; `false` si ce n'est
 * pas un deck jouable ou si le stockage est indisponible (le choix reste alors valable
 * pour la session, mais ne survivra pas au rechargement).
 */
export function sauverDeckChoisi(deckId, decksMaison = [], collection = null, comptes = null) {
  if (!estDeckJouable(deckId, decksMaison, collection, comptes)) return false;
  const stockage = browserStorage();
  if (!stockage) return false;
  return ecrireProgression(RPG_DECK_STORAGE_KEY, JSON.stringify({ deckId }), stockage);
}
