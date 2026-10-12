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
  RPG_ELEMENTS,
  RPG_TERRAIN_CARDS,
  cardById,
  cardColorCost,
  cardColors,
  cardCopyLimit,
  rpgValiderDeck,
  terrainManaColors,
} from './rpgCards.js';
import { fusionnerCollections, normaliserCollection } from './rpgCollection.js';

/** La taille d'un deck du Sablier, et la part minimale de terrains. */
export const RPG_DECK_TAILLE = 40;
export const RPG_DECK_PART_TERRAINS = 0.4;

export const RPG_DECKS_MAISON_STORAGE_KEY = 'letsplay_sablier_decks_maison_v1';

/** Plafond de l'étagère maison : douze boîtiers restent lisibles d'un coup d'œil. */
export const RPG_DECKS_MAISON_LIMITE = 12;

/** Longueur maximale d'un nom de deck maison. */
export const RPG_DECK_NOM_MAX = 60;

/** Casier vide : aucun deck, aucune suppression à retenir. */
export function casierMaisonVide() {
  return { decks: [], supprimes: [] };
}

/** Identifiant neuf et imprévisible pour un deck maison. */
export function nouvelIdDeckMaison() {
  const temps = Date.now().toString(36);
  const alea = Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
  return `maison-${temps}${alea}`;
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
 * inconnus (carte retirée du catalogue, donnée tronquée) sont retirés : le
 * deck devient « incomplet », jamais cassé. L'état civil chromatique est
 * recalculé à chaque lecture — l'affichage ne dépend jamais d'une donnée
 * périmée.
 */
export function normaliserDeckMaison(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = typeof value.id === 'string' && value.id.startsWith('maison-') ? value.id : null;
  if (!id) return null;
  const nomBrut = typeof value.nom === 'string' ? value.nom.trim().slice(0, RPG_DECK_NOM_MAX) : '';
  const cardIds = (Array.isArray(value.cardIds) ? value.cardIds : [])
    .filter((idCarte) => typeof idCarte === 'string' && cardById(idCarte));
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
  try {
    return globalThis.window?.localStorage || globalThis.localStorage || null;
  } catch {
    return null;
  }
}

/** Charge le casier maison de l'appareil (casier vide s'il est absent ou illisible). */
export function chargerCasierMaison() {
  const stockage = browserStorage();
  if (!stockage) return casierMaisonVide();
  try {
    const brut = JSON.parse(stockage.getItem(RPG_DECKS_MAISON_STORAGE_KEY) ?? 'null');
    return { decks: normaliserDecksMaison(brut), supprimes: normaliserSupprimesMaison(brut) };
  } catch {
    return casierMaisonVide();
  }
}

/** Écrit le casier. Rend `true` si l'écriture a eu lieu (stockage indisponible : la session garde le casier). */
export function sauverCasierMaison(casier) {
  const stockage = browserStorage();
  if (!stockage) return false;
  try {
    stockage.setItem(RPG_DECKS_MAISON_STORAGE_KEY, JSON.stringify({
      decks: normaliserDecksMaison(casier),
      supprimes: normaliserSupprimesMaison(casier),
    }));
    return true;
  } catch {
    return false;
  }
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

/**
 * « Compléter en terrains » — le geste d'Arena : remplir les emplacements
 * libres du deck avec des terrains **possédés**, au prorata des pips de
 * couleur exigés par les sorts (à défaut, des couleurs des cartes ; à défaut,
 * du Sable). Les terrains mono sont préférés ; un terrain bicolore possédé
 * sert de secours pour une couleur sans terrain mono.
 *
 * Rend `{ cardIds, ajoutes, raison }` : la liste complétée (une copie — la
 * liste d'origine n'est jamais mutée), le nombre de terrains ajoutés et, s'il
 * n'y a rien à ajouter, pourquoi. Ne retire jamais rien : si le deck compte
 * déjà trop de sorts pour laisser 40 % aux terrains, c'est la validation qui
 * le dira.
 */
export function completerEnTerrains(cardIds, collection = null) {
  const actuels = Array.isArray(cardIds) ? [...cardIds] : [];
  const libres = RPG_DECK_TAILLE - actuels.length;
  if (libres <= 0) return { cardIds: actuels, ajoutes: 0, raison: 'Le deck est déjà plein.' };

  const possedes = Array.isArray(collection) && collection.length ? new Set(collection) : null;
  const terrainsDisponibles = RPG_TERRAIN_CARDS.filter((terrain) => !possedes || possedes.has(terrain.id));
  if (!terrainsDisponibles.length) {
    return { cardIds: actuels, ajoutes: 0, raison: 'Aucun terrain dans votre collection.' };
  }

  // Les poids : pips exigés, sinon couleurs des cartes, sinon Sable.
  const repartition = repartitionCouleurs(actuels);
  let poids = repartition.filter((entree) => entree.pips > 0).map((entree) => [entree.couleur, entree.pips]);
  if (!poids.length) poids = repartition.filter((entree) => entree.cartes > 0).map((entree) => [entree.couleur, entree.cartes]);
  // Une couleur sans aucun terrain possédé ne peut pas être servie : on l'écarte.
  const terrainPour = (couleur) => terrainsDisponibles.find((terrain) => terrainManaColors(terrain).length === 1 && terrainManaColors(terrain)[0] === couleur)
    ?? terrainsDisponibles.find((terrain) => terrainManaColors(terrain).includes(couleur))
    ?? null;
  poids = poids.filter(([couleur]) => terrainPour(couleur));
  if (!poids.length) {
    const secours = terrainPour('sable') ?? terrainsDisponibles[0];
    poids = [[terrainManaColors(secours)[0] ?? 'sable', 1]];
  }

  // Plus forts restes : la somme des parts vaut exactement `libres`.
  const totalPoids = poids.reduce((somme, [, valeur]) => somme + valeur, 0);
  const parts = poids.map(([couleur, valeur]) => {
    const exact = (valeur / totalPoids) * libres;
    return { couleur, entier: Math.floor(exact), reste: exact - Math.floor(exact) };
  });
  let distribues = parts.reduce((somme, part) => somme + part.entier, 0);
  const parReste = [...parts].sort((a, b) => b.reste - a.reste
    || RPG_ELEMENTS.indexOf(a.couleur) - RPG_ELEMENTS.indexOf(b.couleur));
  for (let i = 0; distribues < libres; i = (i + 1) % parReste.length) {
    parReste[i].entier += 1;
    distribues += 1;
  }

  const ajouts = [];
  for (const part of parts) {
    const terrain = terrainPour(part.couleur);
    for (let i = 0; i < part.entier; i += 1) ajouts.push(terrain.id);
  }
  return { cardIds: [...actuels, ...ajouts], ajoutes: ajouts.length, raison: null };
}

/**
 * Valide un deck maison : les règles du duel (`rpgValiderDeck` — 40 cartes,
 * terrains, quotas) **et** la collection : chaque carte doit être possédée.
 * Rend `{ ok, raisons: [] }` — les deux familles de raisons sont listées
 * ensemble, pour que la fiche explique tout d'un coup.
 */
export function rpgValiderDeckMaison(cardIds, collection = null) {
  const raisons = [];
  const structurelle = rpgValiderDeck(Array.isArray(cardIds) ? cardIds : []);
  if (!structurelle.ok) raisons.push(structurelle.raison);
  if (Array.isArray(collection) && collection.length) {
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
 *   - **collection** : union monotone.
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
  const casier = { decks, supprimes };
  const etat = { decks, supprimes, collection, majLe: maintenantIso() };
  const modifie = JSON.stringify({ decks, supprimes, collection }) !== JSON.stringify({
    decks: decksLocaux,
    supprimes: pierresLocales,
    collection: normaliserCollection(local?.collection),
  });
  return { casier, etat, modifie };
}

/** Les dates se comparent même mal formées : absent = le plus vieux. */
function dateComparable(iso) {
  const temps = Date.parse(iso ?? '');
  return Number.isNaN(temps) ? 0 : temps;
}
