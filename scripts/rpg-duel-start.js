import { RPG_DECKS_MAISON_STORAGE_KEY } from '../src/games/rpgDeckBuilder.js';
import { RPG_ACQUIS_STORAGE_KEY } from '../src/games/rpgCollection.js';

/** Prépare une étagère maison jouable pour les tests de navigation UI. */
export function installerDeckMaisonDeTest(cardIds, id = 'maison-test-ui') {
  const cartes = [...new Set(Array.isArray(cardIds) ? cardIds : [])];
  const stockage = globalThis.window?.localStorage ?? globalThis.localStorage;
  if (!stockage) return;
  stockage.setItem(RPG_DECKS_MAISON_STORAGE_KEY, JSON.stringify({
    decks: [{ id, nom: 'Deck test', cardIds, boxArt: cartes[0] ?? null }],
    supprimes: [],
  }));
  stockage.setItem(RPG_ACQUIS_STORAGE_KEY, JSON.stringify({ version: 1, gel: true, cartes }));
}

/**
 * Démarrage d'un duel dans les scénarios de vérification.
 * --------------------------------------------------------
 * Le Sablier ouvre chaque partie sur son volet de mulligan : la main de départ
 * s'affiche en grand, et la table reste close (`inert`) tant que le joueur n'a
 * pas validé son choix. Les scénarios qui décrivent le jeu lui-même n'ont rien
 * à voir avec cette étape : ils la franchissent ici, d'un clic, exactement
 * comme le ferait un joueur qui garde sa main de départ.
 */

/** Le volet de mulligan est-il ouvert sur ce conteneur ? */
export function mulliganOuvert(container) {
  return Boolean(container.querySelector('.rpg-mulligan'));
}

/**
 * Lance une partie rapide depuis le menu. Le bouton principal de l'écran
 * Jouer ouvre le mode Histoire : un duel libre se démarre depuis l'onglet
 * Deck — on ouvre le premier boîtier de l'étagère, puis « Jouer avec ce
 * deck ». Les scénarios qui passent leurs paquets en props (`joueurDeck`,
 * `sorcierDeck`) les gardent : la page les préfère au deck du boîtier.
 * `cliquer` est l'helper `act` du scénario. Retourne le bouton de lancement,
 * pour les scénarios qui veulent vérifier qu'il existait.
 */
export async function lancerDuelDepuisMenu(container, cliquer) {
  const ongletDeck = [...container.querySelectorAll('.rpg-mode-menu__switch button')]
    .find((bouton) => bouton.textContent.replace(/\s+/g, ' ').trim().endsWith('Deck'));
  if (ongletDeck) await cliquer(ongletDeck);
  const boitier = container.querySelector('.rpg-deck-choice__button');
  if (boitier) await cliquer(boitier);
  const lancer = container.querySelector('.rpg-deck-detail__play');
  if (lancer) await cliquer(lancer);
  return lancer ?? null;
}

/**
 * Referme le volet : « valider » (aucune carte choisie = on garde la main), puis
 * « commencer le duel » si un échange a laissé une étape de résultat. Ne fait
 * rien quand il n'y a rien à valider — un duel repris, par exemple.
 * `cliquer` est l'helper `act` du scénario (il change de signature d'un fichier
 * à l'autre, d'où le paramètre).
 */
export async function passerMulligan(container, cliquer) {
  const valider = container.querySelector('.rpg-mulligan__valider');
  if (valider) await cliquer(valider);
  const commencer = container.querySelector('.rpg-mulligan__commencer');
  if (commencer) await cliquer(commencer);
  return Boolean(valider || commencer);
}
