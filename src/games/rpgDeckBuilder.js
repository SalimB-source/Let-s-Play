/**
 * Les decks maison — les decks créés par le joueur dans l'atelier.
 *
 * Un deck maison est un enregistrement autonome, de la même forme qu'un deck
 * du catalogue (`RPG_DECKS`) : `{ id, nom, cardIds, boxArt, … }`. Le duel n'y
 * lit que `cardIds` ; l'étagère, le filtre de couleur et le boîtier 3D lisent
 * `nom`, `boxArt` et l'état civil chromatique (`element`/`elements`), dérivé
 * des cartes à chaque normalisation — le reste de l'interface marche donc sans
 * le savoir.
 *
 * Stockage local (`letsplay_sablier_decks_maison_v1`) : un **casier**
 * `{ decks, supprimes }`. Les `supprimes` sont des pierres tombales
 * `{ id, majLe }` : elles permettent à la synchronisation de compte
 * (`fusionnerEtatsSablier`) de distinguer « supprimé ici » d'« créé
 * ailleurs », sans serveur stateful. Le stockage suit la convention du dépôt
 * (`rpgStory.js`) : accès tolérant, écriture silencieuse, lecture normalisée —
 * un casier corrompu rend un casier vide, jamais une erreur.
 *
 * La synchronisation (compte connecté, `rpgSablierRemote.js`) fusionne par
 * **dernière écriture par deck** (`majLe`), les pierres tombales arbitrant les
 * suppressions, et la collection en **union monotone**.
 */

import {
  carteJouableSansTerrain,
  RPG_ELEMENTS,
  cardById,
  cardColorCost,
  cardColors,
  cardCopyLimit,
  rpgValiderDeck,
  terrainManaColors,
} from './rpgCards.js';
import { fusionnerAcquisitions, fusionnerCollections, normaliserAcquis, normaliserCollection } from './rpgCollection.js';
import { fusionnerPortefeuilles, normaliserPortefeuille } from './rpgCredits.js';
import { fusionnerQuetes, normaliserEtatQuetes } from './rpgQuetes.js';
import { fusionnerProgressionHistoire, normaliserProgressionHistoire } from './rpgStory.js';
import { ecrireProgression, lireProgression, stockageProgression } from '../lib/progressionScope.js';

/** La taille d'un deck du Sablier, et la part minimale de terrains. */
export const RPG_DECK_TAILLE = 30;
export const RPG_DECK_PART_TERRAINS = 0;

export const RPG_DECKS_MAISON_STORAGE_KEY = 'letsplay_sablier_decks_maison_v1';

/** Plafond de l'étagère maison : douze boîtiers restent lisibles d'un coup d'œil. */
export const RPG_DECKS_MAISON_LIMITE = 12;

/** Longueur maximale d'un nom de deck maison. */
export const RPG_DECK_NOM_MAX = 60;

/** Casier vide : aucun deck, aucune suppression à retenir. */
export function casierMaisonVide() {
  return { decks: [], supprimes: [] };
}

/** Compteur du module : deux decks créés dans la même milliseconde se suivent. */
let compteurIdDeckMaison = 0;

/** Identifiant neuf et imprévisible pour un deck maison. */
export function nouvelIdDeckMaison() {
  const temps = Date.now().toString(36);
  compteurIdDeckMaison = (compteurIdDeckMaison + 1) % 1296;
  const alea = Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
  // L'aléa garde l'imprévisibilité ; le compteur garantit deux identifiants
  // distincts pour deux decks créés dans la même milliseconde (douze boîtiers
  // d'affilée, par exemple), sans quoi le second écraserait le premier.
  return `maison-${temps}${alea}${compteurIdDeckMaison.toString(36)}`;
}

/**
 * Les couleurs d'un deck maison, dérivées de ses cartes : par présence
 * décroissante, à égalité dans l'ordre canonique des éléments. C'est la même
 * lecture que le filtre d'étagère (« une couleur retient les decks qui
 * l'emploient ») et que le plateau tiré d'un deck sans identité.
 */
export function couleursDeckMaison(cardIds) {
  const comptes = new Map();
  for (const id of (Array.isArray(cardIds) ? cardIds : [])) {
    for (const couleur of cardColors(id)) {
      comptes.set(couleur, (comptes.get(couleur) ?? 0) + 1);
    }
  }
  return [...comptes.entries()]
    .sort((a, b) => b[1] - a[1] || RPG_ELEMENTS.indexOf(a[0]) - RPG_ELEMENTS.indexOf(b[0]))
    .map(([couleur]) => couleur);
}

/** Date ISO lisible, ou `null` : les dates mal formées tombent, sans casser. */
function dateIso(value) {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : value;
}

/** Horodatage ISO du moment présent. */
export function maintenantIso() {
  return new Date().toISOString();
}

/**
 * Un enregistrement de deck maison, ou `null`. Les identifiants de cartes
 * inconnus et hors format (terrains, effets liés aux terrains) sont retirés : le
 * deck devient « incomplet », jamais cassé. Aucune carte supplémentaire n’est
 * ajoutée ni acquise automatiquement : le joueur complète son deck dans l’atelier. L'état civil chromatique est
 * recalculé à chaque lecture — l'affichage ne dépend jamais d'une donnée
 * périmée.
 */
export function normaliserDeckMaison(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = typeof value.id === 'string' && value.id.startsWith('maison-') ? value.id : null;
  if (!id) return null;
  const nomBrut = typeof value.nom === 'string' ? value.nom.trim().slice(0, RPG_DECK_NOM_MAX) : '';
  const cardIds = (Array.isArray(value.cardIds) ? value.cardIds : [])
    .filter((idCarte) => typeof idCarte === 'string' && carteJouableSansTerrain(cardById(idCarte)));
  const boxArt = typeof value.boxArt === 'string' && cardById(value.boxArt) ? value.boxArt : null;
  const couleurs = couleursDeckMaison(cardIds);
  return {
    maison: true,
    id,
    nom: nomBrut || 'Deck maison',
    // Alias : toute l'interface (boîtier, fiche, plaque du duel) lit `deck.name`
    // comme sur les decks du catalogue ; `nom` reste le champ canonique de l'atelier.
    name: nomBrut || 'Deck maison',
    boxArt,
    cardIds,
    ...(couleurs.length > 1
      ? { elements: couleurs }
      : couleurs.length === 1 ? { element: couleurs[0] } : {}),
    creeLe: dateIso(value.creeLe) ?? dateIso(value.majLe) ?? maintenantIso(),
    majLe: dateIso(value.majLe) ?? maintenantIso(),
  };
}

/** Tous les decks maison décrits par une valeur (casier ou liste brute). */
export function normaliserDecksMaison(value) {
  const bruts = Array.isArray(value) ? value : (value && typeof value === 'object' && !Array.isArray(value) ? value.decks : null);
  if (!Array.isArray(bruts)) return [];
  const vus = new Set();
  const decks = [];
  for (const brut of bruts) {
    const deck = normaliserDeckMaison(brut);
    if (!deck || vus.has(deck.id)) continue;
    vus.add(deck.id);
    decks.push(deck);
  }
  return decks;
}

/** Les pierres tombales décrites par une valeur, sans doublon. */
export function normaliserSupprimesMaison(value) {
  const bruts = Array.isArray(value)
    ? value
    : (value && typeof value === 'object' && !Array.isArray(value) && Array.isArray(value.supprimes) ? value.supprimes : []);
  const vues = new Set();
  const supprimes = [];
  for (const brut of bruts) {
    const id = typeof brut?.id === 'string' ? brut.id : null;
    const majLe = dateIso(brut?.majLe);
    if (!id || !majLe || vues.has(id)) continue;
    vues.add(id);
    supprimes.push({ id, majLe });
  }
  return supprimes;
}

function browserStorage() {
  return stockageProgression();
}

/** Charge le casier maison de l'appareil (casier vide s'il est absent ou illisible). */
export function chargerCasierMaison() {
  const stockage = browserStorage();
  if (!stockage) return casierMaisonVide();
  try {
    const brut = JSON.parse(lireProgression(RPG_DECKS_MAISON_STORAGE_KEY, stockage) ?? 'null');
    return { decks: normaliserDecksMaison(brut), supprimes: normaliserSupprimesMaison(brut) };
  } catch {
    return casierMaisonVide();
  }
}

/** Écrit le casier. Rend `true` si l'écriture a eu lieu (stockage indisponible : la session garde le casier). */
export function sauverCasierMaison(casier) {
  const stockage = browserStorage();
  if (!stockage) return false;
  return ecrireProgression(RPG_DECKS_MAISON_STORAGE_KEY, JSON.stringify({
    decks: normaliserDecksMaison(casier),
    supprimes: normaliserSupprimesMaison(casier),
  }), stockage);
}

/** Les decks maison de l'appareil. */
export function chargerDecksMaison() {
  return chargerCasierMaison().decks;
}

/** Les pierres tombales de l'appareil. */
export function chargerSupprimesMaison() {
  return chargerCasierMaison().supprimes;
}

/** Un deck maison du casier, par identifiant. */
export function deckMaisonParId(decks, id) {
  return (Array.isArray(decks) ? decks : []).find((deck) => deck?.id === id) ?? null;
}

/**
 * Enregistre (crée ou met à jour) un deck maison dans un casier — pur : le
 * casier rendu est nouveau, l'ancien intact. La création respecte le plafond
 * de l'étagère ; une mise à jour remplace le deck sur place. Rend
 * `{ casier, deck, ok, raison }`.
 */
export function enregistrerDeckDansCasier(casier, deck) {
  const decks = normaliserDecksMaison(casier);
  const deckPropre = normaliserDeckMaison(deck);
  if (!deckPropre) return { casier: { decks, supprimes: normaliserSupprimesMaison(casier) }, deck: null, ok: false, raison: 'deck illisible' };
  const existant = decks.find((candidat) => candidat.id === deckPropre.id);
  if (!existant && decks.length >= RPG_DECKS_MAISON_LIMITE) {
    return { casier: { decks, supprimes: normaliserSupprimesMaison(casier) }, deck: deckPropre, ok: false, raison: `étagère pleine (${RPG_DECKS_MAISON_LIMITE} decks)` };
  }
  const horodaté = { ...deckPropre, majLe: maintenantIso() };
  const decksMaj = existant
    ? decks.map((candidat) => (candidat.id === horodaté.id ? horodaté : candidat))
    : [...decks, horodaté];
  return {
    casier: { decks: decksMaj, supprimes: normaliserSupprimesMaison(casier) },
    deck: horodaté,
    ok: true,
    raison: null,
  };
}

/** Retire un deck maison du casier en posant sa pierre tombale. Rend le nouveau casier. */
export function supprimerDeckDuCasier(casier, id) {
  const decks = normaliserDecksMaison(casier).filter((deck) => deck.id !== id);
  const existantes = normaliserSupprimesMaison(casier).filter((pierre) => pierre.id !== id);
  const supprimes = [...existantes, { id, majLe: maintenantIso() }];
  return { decks, supprimes };
}

/** Le nom par défaut du prochain deck maison (« Deck maison », puis 2, 3…). */
export function nomDeckMaisonParDefaut(decks) {
  const noms = new Set(normaliserDecksMaison(decks).map((deck) => deck.nom));
  if (!noms.has('Deck maison')) return 'Deck maison';
  let numero = 2;
  while (noms.has(`Deck maison ${numero}`)) numero += 1;
  return `Deck maison ${numero}`;
}

/** Comptage des exemplaires d'une liste de cartes : `Map` identifiant → nombre. */
export function compteExemplaires(cardIds) {
  const comptes = new Map();
  for (const id of (Array.isArray(cardIds) ? cardIds : [])) {
    comptes.set(id, (comptes.get(id) ?? 0) + 1);
  }
  return comptes;
}

/**
 * L'ajout d'une carte est-il permis ici ? Rend `{ ok, raison }` — carte
 * inconnue, verrouillée (hors collection) ou quota de rareté atteint.
 */
export function peutAjouterCarte(cardId, cardIds, collection = null) {
  const carte = cardById(cardId);
  if (!carte) return { ok: false, raison: 'Carte inconnue.' };
  if (!carteJouableSansTerrain(carte)) return { ok: false, raison: 'Carte hors format : le mana est automatique, sans terrain.' };
  if (cardIds.length >= RPG_DECK_TAILLE) return { ok: false, raison: 'Deck plein : 30 cartes au maximum.' };
  if (collection && !collection.includes(cardId)) {
    return { ok: false, raison: 'Carte verrouillée : elle se débloque dans les Tours de Bab El.' };
  }
  const possedees = compteExemplaires(cardIds).get(cardId) ?? 0;
  const limite = cardCopyLimit(carte);
  if (possedees >= limite) {
    return {
      ok: false,
      raison: limite === 1
        ? 'Une seule exemplaire autorisé pour cette rareté.'
        : `Quota atteint : ${limite} exemplaires au plus.`,
    };
  }
  return { ok: true, raison: null };
}

/** Paliers de la courbe de mana, façon Arena : 1 à 6, puis « 7+ ». */
export const RPG_COURBE_PALIERS = [1, 2, 3, 4, 5, 6, 7];

/**
 * La courbe de mana d'un deck — les cartes non-terrain réparties par coût,
 * de 1 à 6 puis « 7+ » (les coûts 0 rejoignent le premier palier). Rend
 * `{ paliers: [{ cout, label, nombre }], max, moyenne, nonTerrains }` ;
 * `moyenne` est arrondie au dixième, `0` sans carte.
 */
export function courbeDeMana(cardIds) {
  const nombres = new Map(RPG_COURBE_PALIERS.map((cout) => [cout, 0]));
  let total = 0;
  let somme = 0;
  for (const id of (Array.isArray(cardIds) ? cardIds : [])) {
    const carte = cardById(id);
    if (!carte || carte.kind === 'terrain') continue;
    const cout = Math.max(0, Number(carte.cost) || 0);
    const palier = Math.min(Math.max(cout, 1), 7);
    nombres.set(palier, nombres.get(palier) + 1);
    total += 1;
    somme += cout;
  }
  const paliers = RPG_COURBE_PALIERS.map((cout) => ({
    cout,
    label: cout === 7 ? '7+' : String(cout),
    nombre: nombres.get(cout),
  }));
  return {
    paliers,
    max: Math.max(0, ...paliers.map((palier) => palier.nombre)),
    moyenne: total ? Math.round((somme / total) * 10) / 10 : 0,
    nonTerrains: total,
  };
}

/**
 * La répartition des couleurs d'un deck : pour chaque élément, le nombre de
 * **cartes** (hors terrains) qui l'emploient, le nombre de **pips** exigés
 * et le nombre de **terrains** capables de le produire. Ordre : par présence
 * décroissante, puis l'ordre canonique. Les couleurs absentes sont omises.
 */
export function repartitionCouleurs(cardIds) {
  const parCouleur = new Map(RPG_ELEMENTS.map((couleur) => [couleur, { couleur, cartes: 0, pips: 0, terrains: 0 }]));
  for (const id of (Array.isArray(cardIds) ? cardIds : [])) {
    const carte = cardById(id);
    if (!carte) continue;
    if (carte.kind === 'terrain') {
      for (const couleur of terrainManaColors(carte)) parCouleur.get(couleur).terrains += 1;
      continue;
    }
    for (const couleur of cardColors(carte)) parCouleur.get(couleur).cartes += 1;
    for (const [couleur, quantite] of Object.entries(cardColorCost(carte))) {
      if (parCouleur.has(couleur)) parCouleur.get(couleur).pips += quantite;
    }
  }
  return [...parCouleur.values()]
    .filter((entree) => entree.cartes || entree.pips || entree.terrains)
    .sort((a, b) => b.cartes - a.cartes || b.pips - a.pips
      || RPG_ELEMENTS.indexOf(a.couleur) - RPG_ELEMENTS.indexOf(b.couleur));
}

/** Compatibilité des anciens appelants : le format sans terrain ne complète
 * plus la liste avec des sources de mana. Ne modifie jamais la source. */
export function completerEnTerrains(cardIds, collection = null) {
  return { cardIds: [...cardIds], ajoutes: 0, raison: 'Le mana est automatique : aucun terrain à ajouter.' };
}

/**
 * Valide un deck maison : les règles du duel (`rpgValiderDeck` — 30 cartes,
 * sans terrain, quotas) **et** la collection : chaque carte doit être possédée.
 * Rend `{ ok, raisons: [] }` — les deux familles de raisons sont listées
 * ensemble, pour que la fiche explique tout d'un coup.
 */
export function rpgValiderDeckMaison(cardIds, collection = null) {
  const raisons = [];
  const structurelle = rpgValiderDeck(Array.isArray(cardIds) ? cardIds : []);
  if (!structurelle.ok) raisons.push(structurelle.raison);
  if (Array.isArray(collection)) {
    const possedees = new Set(collection);
    const horsCollection = [...new Set((Array.isArray(cardIds) ? cardIds : []))].filter((id) => !possedees.has(id));
    if (horsCollection.length) {
      raisons.push(`cartes hors collection : ${horsCollection.slice(0, 3).join(', ')}${horsCollection.length > 3 ? '…' : ''}`);
    }
  }
  return { ok: raisons.length === 0, raisons };
}

/** Un deck maison se joue s'il est structurellement valide et entièrement possédé. */
export function deckMaisonEstSelectionnable(deck, collection = null) {
  if (!deck?.maison || !Array.isArray(deck.cardIds)) return false;
  return rpgValiderDeckMaison(deck.cardIds, collection).ok;
}

/**
 * Fusion de deux états Sablier (local et distant) — pur, déterministe :
 *
 *   - **decks** : dernière écriture par deck (`majLe`, égalité → local) ;
 *   - **supprimes** : union ; une pierre plus récente que le deck enterre ce
 *     dernier, un deck réimporté plus récent que sa pierre ressuscite ;
 *   - **collection** : union monotone ;
 *   - **acquis** : union des cartes, gel définitif dès qu'un appareil l'a posé ;
 *   - **bourse** : chaque champ par sa règle (`fusionnerPortefeuilles` — cartes
 *     en union, crédits et compteurs au maximum) ;
 *   - **quetes** : jour le plus récent, progression par quête au maximum,
 *     réclamations en union (`fusionnerQuetes`).
 *
 * C'est **le** point de fusion de l'état du compte : les deux hooks qui
 * possèdent chacun une moitié (les decks pour `useDecksSablier`, l'économie
 * pour `useSablierBourse`) passent tous les deux par ici, et lisent tous les
 * deux le stockage local au moment d'écrire. Aucun ne peut donc écraser la
 * moitié de l'autre — l'état poussé au compte est toujours entier.
 *
 * Rend `{ casier, etat, modifie }` — `etat` est ce que le serveur doit
 * porter, `modifie` dit si la fusion a apporté quelque chose au local (et
 * mérite donc une réécriture du compte).
 */
export function fusionnerEtatsSablier({ local = casierMaisonVide(), distant = null } = {}) {
  const decksLocaux = normaliserDecksMaison(local);
  const pierresLocales = normaliserSupprimesMaison(local);
  const decksDistant = normaliserDecksMaison(distant);
  const pierresDistantes = normaliserSupprimesMaison(distant);

  const parId = new Map();
  for (const deck of decksLocaux) parId.set(deck.id, deck);
  for (const deck of decksDistant) {
    const local = parId.get(deck.id);
    if (!local || dateComparable(deck.majLe) > dateComparable(local.majLe)) parId.set(deck.id, deck);
  }
  const pierres = new Map();
  for (const pierre of pierresLocales) pierres.set(pierre.id, pierre);
  for (const pierre of pierresDistantes) {
    const locale = pierres.get(pierre.id);
    if (!locale || dateComparable(pierre.majLe) > dateComparable(locale.majLe)) pierres.set(pierre.id, pierre);
  }
  const decks = [...parId.values()].filter((deck) => {
    const pierre = pierres.get(deck.id);
    return !pierre || dateComparable(deck.majLe) > dateComparable(pierre.majLe);
  });
  // Une pierre dont le deck a ressuscité est périmée : on la retire. Les autres
  // restent, pour qu'un appareil qui n'a pas encore vu la suppression la voie.
  const supprimes = [...pierres.values()]
    .filter((pierre) => !decks.some((deck) => deck.id === pierre.id))
    .sort((a, b) => dateComparable(b.majLe) - dateComparable(a.majLe))
    .slice(0, 50);

  const collection = fusionnerCollections(local?.collection, distant?.collection);
  // Les acquis (le gel des cartes gagnées avant le Souk, `rpgCollection.js`) se
  // fusionnent comme le reste : union des cartes, gel définitif dès qu'un
  // appareil l'a posé. Un appareil qui n'a pas encore migré ne peut donc pas
  // défaire le gel d'un autre.
  const acquis = fusionnerAcquisitions(local?.acquis, distant?.acquis);
  // Chaque module fusionne chez lui (`fusionnerPortefeuilles`,
  // `fusionnerQuetes` rendent `{ …, modifie }`) : ici on ne fait que les
  // ranger côte à côte dans l'état du compte.
  const bourse = fusionnerPortefeuilles(local?.bourse, distant?.bourse).portefeuille;
  const quetes = fusionnerQuetes(local?.quetes, distant?.quetes).etat;
  const histoire = fusionnerProgressionHistoire(local?.histoire, distant?.histoire).progression;
  const casier = { decks, supprimes };
  const etat = { decks, supprimes, collection, acquis, bourse, quetes, histoire, majLe: maintenantIso() };
  const modifie = JSON.stringify({ decks, supprimes, collection, acquis, bourse, quetes, histoire }) !== JSON.stringify({
    decks: decksLocaux,
    supprimes: pierresLocales,
    collection: normaliserCollection(local?.collection),
    acquis: normaliserAcquis(local?.acquis),
    bourse: normaliserPortefeuille(local?.bourse),
    quetes: normaliserEtatQuetes(local?.quetes),
    histoire: normaliserProgressionHistoire(local?.histoire),
  });
  return { casier, etat, modifie };
}

/** Les dates se comparent même mal formées : absent = le plus vieux. */
function dateComparable(iso) {
  const temps = Date.parse(iso ?? '');
  return Number.isNaN(temps) ? 0 : temps;
}
