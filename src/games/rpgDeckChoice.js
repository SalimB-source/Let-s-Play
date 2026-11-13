/**
 * Deck de jeu choisi par le joueur (bouton « Sélectionner » de l'onglet Deck).
 *
 * L'étagère propose les huit listes thématiques (`RPG_DECKS_PRECONSTRUITS`)
 * et les decks personnels (`decksMaison`), sans modifier le casier sauvegardé.
 * Les identifiants historiques des archétypes (`RPG_DECKS_ARCHETYPES`) restent
 * réservés à l'IA, aux leçons et aux anciens duels. Les coffrets de bienvenue
 * ne créent toujours que des decks personnels.
 *
 * Le choix est mémorisé sur l'appareil : au prochain lancement du jeu, le menu
 * repart sur le deck déjà choisi au lieu du premier de l'étagère.
 *
 * Le stockage suit la convention de `rpgStory.js` : accès `localStorage` tolérant (mode
 * privé, iframe : `null`), écriture silencieuse, lecture normalisée — un identifiant
 * périmé (deck supprimé, ou deck d'un ancien catalogue) ou une valeur corrompue retombent
 * sur le premier deck jouable, sans jamais casser le menu.
 */

import { RPG_DECKS, RPG_DECKS_ARCHETYPES, RPG_DECKS_PRECONSTRUITS, rpgValiderDeck } from './rpgCards.js';
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

/** Les préconstruits et archétypes ne consomment pas la collection ; les decks maison, si. */
export function deckSeJoue(deck, collection = null, comptes = null) {
  if (!deck) return false;
  return deck.maison ? deckMaisonEstSelectionnable(deck, collection, comptes) : deckEstSelectionnable(deck);
}

/**
 * Deck de jeu tant que le joueur n'a rien choisi : **le premier deck de la
 * maison qui se joue** (celui du coffret, en pratique). Sans deck personnel,
 * cette fonction rend `null` : le choix d'un thème reste explicite sur
 * l'étagère, sans écraser le choix antérieur du joueur.
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
  const joueur = typeof deckJoueur === 'string'
    ? (RPG_DECKS_PRECONSTRUITS.find((deck) => deck.id === joueurId) ?? archetypeParId(joueurId))
    : deckJoueur;
  return [deckAdverseParDefaut(), ...RPG_DECKS_ARCHETYPES]
    .find((deck) => deck && deck.id !== joueurId
      && (!joueur?.cardIds || deck.cardIds !== joueur.cardIds)
      && deckEstSelectionnable(deck)) ?? null;
}

/** Un archétype par son identifiant (tutoriel, PvP, mode Histoire). */
export function archetypeParId(id) {
  return RPG_DECKS_ARCHETYPES.find((deck) => deck.id === id) ?? null;
}

function estDeckJouable(deckId, decksMaison = [], collection = null, comptes = null) {
  if (typeof deckId !== 'string') return false;
  if (deckId.startsWith('maison-')) return deckMaisonJouable(deckId, decksMaison, collection, comptes);
  // Les anciens IDs d'archétypes ne sont pas des choix de joueur : seuls les
  // nouveaux IDs thématiques et les decks maison peuvent être mémorisés.
  return [...RPG_DECKS_PRECONSTRUITS, ...RPG_DECKS]
    .some((deck) => deck.id === deckId && deckEstSelectionnable(deck));
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
