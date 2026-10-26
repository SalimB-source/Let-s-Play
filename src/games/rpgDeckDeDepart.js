/**
 * Le **deck de départ** — celui sans lequel un joueur n'aurait rien à poser sur
 * la table.
 *
 * Depuis les coffrets de bienvenue (`rpgCoffretBienvenue.js`) et le retrait des
 * decks de base, l'étagère du joueur ne contient que **ses** decks. Deux
 * situations doivent donc être rattrapées au démarrage, pour que l'écran Jouer
 * ait toujours un deck à proposer :
 *
 *   - **un coffret a été ouvert sur un autre appareil** (ou avant cette
 *     version) et son deck de la maison manque : on le repose, trente cartes,
 *     à l'identique ;
 *   - **un joueur d'avant les coffrets** a une collection mais aucun deck :
 *     l'assistant (`rpgDeckAuto.js`, `genererDeckAssiste`) compose un premier
 *     deck dans ses couleurs dominantes, jouable tout de suite.
 *
 * Rien n'est jamais imposé : un deck supprimé laisse une **pierre tombale**
 * (`supprimes`, `rpgDeckBuilder.js`), et on ne le ressuscite pas. Le rattrapage
 * ne crée donc un deck que si son identifiant n'est ni dans le casier, ni dans
 * les pierres tombales.
 */

import { CATALOGUE_DU_COMPOSEUR, cardById, cardColors, rpgValiderDeck } from './rpgCards.js';
import { genererDeckAssiste } from './rpgDeckAuto.js';
import { coffretChoisiDeLAppareil, coffretEnDeckMaison } from './rpgCoffretBienvenue.js';
import { enregistrerDeckDansCasier } from './rpgDeckBuilder.js';

/** L'identifiant du deck composé pour un joueur qui n'a que sa collection. */
export const RPG_DECK_DEPART_ID = 'maison-de-depart';

/** L'identifiant du deck d'un coffret. */
export function idDeckDeCoffret(coffret) {
  return coffret ? `maison-${coffret.id}` : null;
}

/** Une carte est-elle dans la collection ? (liste d'identifiants) */
function dansLaCollection(collection, id) {
  return !Array.isArray(collection) || collection.includes(id);
}

/**
 * Les couleurs dominantes d'une collection : celles qui portent le plus de
 * cartes distinctes, dans l'ordre de `RPG_ELEMENTS` à égalité. Deux au plus —
 * c'est ce qu'un deck peut tenir sans se disperser, et ce que l'assistant
 * accepte.
 */
export function couleursDominantes(collection, { max = 2 } = {}) {
  const compte = new Map();
  for (const id of Array.isArray(collection) ? collection : []) {
    const carte = cardById(id);
    if (!carte) continue;
    for (const couleur of cardColors(carte)) compte.set(couleur, (compte.get(couleur) ?? 0) + 1);
  }
  return [...compte.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, max)
    .map(([couleur]) => couleur);
}

/**
 * Compose un premier deck dans les couleurs dominantes de la collection.
 * Rend un deck de la maison valide (`rpgValiderDeck`), ou `null` si la
 * collection ne tient pas les trente cartes — un deck incomplet vaudrait moins
 * que pas de deck : l'atelier est là pour ça.
 */
export function deckDeDepartDepuisCollection(collection, { nom = 'Mon premier deck' } = {}) {
  const ids = Array.isArray(collection) ? collection.filter((id) => cardById(id)) : [];
  if (ids.length === 0) return null;
  const couleurs = couleursDominantes(ids);
  if (couleurs.length === 0) return null;
  const { cardIds, embleme } = genererDeckAssiste({
    couleurs,
    creatures: [],
    sorts: [],
    collection: ids.filter((id) => dansLaCollection(ids, id)),
    catalogue: CATALOGUE_DU_COMPOSEUR,
  });
  if (!rpgValiderDeck(cardIds).ok) return null;
  return {
    id: RPG_DECK_DEPART_ID,
    nom,
    cardIds,
    boxArt: embleme ?? cardIds[0],
    element: couleurs[0],
    elements: couleurs,
    maison: true,
  };
}

/**
 * Le rattrapage au démarrage : pose le deck du coffret ou, à défaut, un premier
 * deck composé. Rend `{ casier, cree }` — `cree` vaut `null` quand il n'y avait
 * rien à faire (deck déjà là, pierre tombale, collection trop mince).
 */
export function garantirDeckDeDepart({ casier = { decks: [], supprimes: [] }, collection = null } = {}) {
  const decks = Array.isArray(casier.decks) ? casier.decks : [];
  const supprimes = Array.isArray(casier.supprimes) ? casier.supprimes : [];
  const dejaSupprime = (id) => supprimes.some((pierre) => (pierre?.id ?? pierre) === id);
  const dejaLa = (id) => decks.some((deck) => deck.id === id);

  const poser = (deck) => {
    const maj = enregistrerDeckDansCasier({ decks, supprimes }, deck);
    return maj.ok ? { casier: maj.casier, cree: maj.deck } : { casier, cree: null };
  };

  const coffret = coffretChoisiDeLAppareil?.() ?? null;
  const deckCoffret = coffretEnDeckMaison(coffret);
  const idCoffret = deckCoffret ? idDeckDeCoffret(coffret) : null;
  const coffretManquant = deckCoffret && !dejaLa(idCoffret) && !dejaSupprime(idCoffret);
  // Le deck du coffret a été supprimé exprès : on ne lui oppose pas un deck
  // composé — supprimer un deck pour en recevoir un autre ne serait pas une
  // suppression. L'atelier reste la porte de sortie.
  const coffretRefuse = Boolean(idCoffret) && dejaSupprime(idCoffret);
  // Le deck du coffret n'est reposé que si ses cartes sont là : sur un appareil
  // où la collection n'est pas encore descendue, mieux vaut le composer plus bas
  // que d'afficher un deck que la table refusera.
  const dansLaCollectionIci = deckCoffret?.cardIds.every((id) => dansLaCollection(collection, id)) ?? false;
  if (coffretManquant && dansLaCollectionIci) return poser(deckCoffret);

  // Le deck composé est un rattrapage pour un casier **vide** (joueur d'avant
  // les coffrets) : il ne s'ajoute pas à côté de decks existants, et il ne
  // remplace pas un deck que le joueur vient de supprimer.
  if (decks.length === 0 && !coffretRefuse) {
    const deckDepart = deckDeDepartDepuisCollection(collection);
    if (deckDepart && !dejaSupprime(deckDepart.id)) return poser(deckDepart);
  }

  // Dernier recours : le coffret, même sans sa collection sous la main — il se
  // débloquera à la synchronisation suivante.
  if (coffretManquant) return poser(deckCoffret);
  return { casier, cree: null };
}
