/**
 * Le Sablier — les plateaux de duel.
 *
 * Le duel se joue sur une **table** : un fond plein cadre, sous les cartes.
 * Le jeu en propose plusieurs, mais **le joueur n'en choisit aucun** : le
 * plateau d'une partie est imposé par **le deck de l'un des deux duellistes**.
 *
 * La règle tient en deux temps :
 *
 * 1. **Chaque deck a son terrain.** Un deck du catalogue (ou un deck du mode
 *    Histoire) porte une correspondance explicite — les Veilleurs du Désert se
 *    battent dans l'Erg, la Cour des Djinns sur la Table des Heures… Un deck
 *    sans identité connue (paquet brut passé en prop, deck maison) retombe sur
 *    la **couleur dominante de ses cartes** : Sable → l'Erg, Braise → la Table
 *    des Heures, Eau → les Ruines de Tipaza, Neige → le Fjord des Neuf
 *    Hivers, deux couleurs à égalité → la Caravane de Gourara, le carrefour des
 *    pistes. Sans rien de lisible, c'est la Table des Heures, la table
 *    d'origine de Bab El.
 * 2. **Le sable désigne qui impose son terrain.** Au lancement du duel, un
 *    tirage choisit l'un des deux camps ; c'est le deck de ce duelliste qui
 *    donne son plateau à la partie. Le tirage passe par le `rng` du duel —
 *    injectable — donc une partie se rejoue à l'identique, comme le reste du
 *    moteur, et une valeur hors bornes ne plante rien.
 *
 * Il n'y a donc plus ni pastille « Aléatoire », ni verrou de plateau, ni
 * sauvegarde du choix sur l'appareil : rien à mémoriser, rien à reprendre.
 *
 * Les terrains classiques ont leur **double merveilleux** : quand la partie
 * l'autorise (`variantesFantaisistes`), un second tirage peut échanger le
 * terrain imposé contre sa version fantaisiste — l'Erg contre le Désert de
 * Verre, les Ruines contre les Abysses Phosphorescentes, le Fjord contre les
 * Îles Célestes, et la Table des Heures — le terrain de la Braise depuis le
 * retrait des Brûlés — contre les Cavernes de Cristal. Seule la piste
 * caravanière reste unique. Le motif et le camp ne bougent pas : ils disent
 * toujours quel deck a imposé le terrain.
 *
 * Un plateau = un identifiant, un nom lisible, un lieu, un fichier de
 * `public/` et un résumé pour l'annonce d'ouverture. Le fichier est un fond
 * plein cadre **sans texte ni interface dessinée** : l'interface du jeu se
 * superpose elle-même (voir `RPG-CARD-ART.md` pour l'esprit de la direction
 * artistique). Tous les fonds sont livrés en **4K au ratio 3:2**
 * (3840×2560) : la table les affiche en `background-size: cover`, le
 * recadrage se fait au centre sans rien perdre de l'arène.
 */

import { cardColors } from './rpgCards.js';

/** Le catalogue des plateaux, dans l'ordre de la galerie d'origine. */
export const RPG_PLATEAUX = [
  {
    id: 'table-des-heures',
    nom: 'La Table des Heures',
    lieu: 'Bab El, salle haute de la Chambre',
    fichier: 'card-table.jpg',
    resume: 'Le bois des Veilleurs, l’astrolabe doré gravé au centre et quatre bougies : la table d’origine du duel.',
  },
  {
    id: 'erg-du-sahara',
    nom: 'L’Erg du Sahara',
    lieu: 'Le grand désert, hors les murs',
    fichier: 'plateau-erg-du-sahara.jpg',
    resume: 'La rose des sables tracée à même la dune ; la lanterne de laiton, l’outre et la corde posées au bord du plateau.',
  },
  {
    id: 'caravane-de-gourara',
    nom: 'La Caravane de Gourara',
    lieu: 'Le Gourara, pays des foggaras',
    fichier: 'plateau-caravane-de-gourara.jpg',
    resume: 'Le lit sec de l’oued et sa piste de caravane : les deux empreintes du campement, l’outre, la corde et le compas abandonné.',
  },
  {
    id: 'fjord-des-neuf-hivers',
    nom: 'Le Fjord des Neuf Hivers',
    lieu: 'La glace du Nord, devant le Serment',
    fichier: 'plateau-fjord-des-neuf-hivers.jpg',
    resume: 'La glace polie du fjord et sa rose des vents gravée au ciseau ; la lanterne de fer, le cor à boire, la corde lovée, la hache et le bâton de runes posés au bord.',
  },
  {
    id: 'ruines-de-tipaza',
    nom: 'Les Ruines de Tipaza',
    lieu: 'Tipasa, la ville romaine au bord de la mer',
    fichier: 'plateau-ruines-de-tipaza.jpg',
    resume: 'La mosaïque de pierre noire et blanche ouverte par le vent, les dalles romaines disjointes, les fûts de colonne et le chapiteau corinthien tombés à l’entour.',
  },
  // Les doubles merveilleux : un par couleur, atteints par le second tirage
  // (`RPG_PLATEAUX_VARIANTES_FANTAISISTES`), jamais par un deck directement.
  {
    id: 'desert-de-verre',
    nom: 'Le Désert de Verre',
    lieu: 'Au-delà de l’Erg, là où la foudre a fondu le sable',
    fichier: 'plateau-desert-de-verre.jpg',
    resume: 'L’étendue de sable vitrifié, ambrée et aigue-marine ; l’anneau de cristal pilé au centre, les roses de verre, l’astrolabe de laiton, l’outre et la corde aux coins.',
  },
  {
    id: 'cavernes-de-cristal',
    nom: 'Les Cavernes de Cristal',
    lieu: 'Les Brûlés, galeries profondes sous Bab El',
    fichier: 'plateau-cavernes-de-cristal.jpg',
    resume: 'Le dallage d’obsidienne veiné de braise ; l’anneau de poussière de cristal au centre, les améthystes et les rubis, les fissures de lave aux bords.',
  },
  {
    id: 'abysses-phosphorescentes',
    nom: 'Les Abysses Phosphorescentes',
    lieu: 'Sous la mer de Tipasa, la faille luminescente',
    fichier: 'plateau-abysses-phosphorescentes.jpg',
    resume: 'Le sable pâle vu à travers l’eau claire ; l’anneau de coquillages au centre, les coraux, les colonnes tombées, les amphores et la raie manta aux bords.',
  },
  {
    id: 'iles-celestes',
    nom: 'Les Îles Célestes',
    lieu: 'Au-dessus du fjord, les glaces flottantes du ciel',
    fichier: 'plateau-iles-celestes.jpg',
    resume: 'Le lac de glace polie où danse l’aurore ; l’anneau gravé au centre, les sapins, les rochers, la lanterne de fer et la corde lovée aux bords.',
  },
];

/** Le terrain rendu quand aucun deck ne parle : la table d'origine de Bab El. */
export const RPG_PLATEAU_DE_REPLI = 'table-des-heures';

/**
 * Le terrain qu'un deck impose. Clés : les identifiants des decks du catalogue
 * (`rpgCards.js`) et les clés des decks de campagne (`rpgStoryTours.js`).
 */
export const RPG_PLATEAUX_PAR_DECK = {
  // Catalogue — chaque deck se bat chez lui.
  'veilleurs-du-desert': 'erg-du-sahara',
  // Le plateau des Brûlés a été retiré : la Cour rejoint la table d'origine.
  'cour-des-djinns': 'table-des-heures',
  'sentiers-de-cendre': 'caravane-de-gourara',
  'maree-des-abysses': 'ruines-de-tipaza',
  // Le Nord : le Serment des Neuf Hivers se bat sur la glace du fjord.
  'serment-des-neuf-hivers': 'fjord-des-neuf-hivers',
  // Campagne (clés de `RPG_STORY_DECKS`) : la Souffleuse tient la piste de
  // caravane du deck hybride dont elle vient ; le Grand Horloger, lui, reçoit
  // dans la salle haute de la Chambre, sur la table d'origine. Les quatre
  // étages de la Tour du Fjord gardent la glace de leur deck.
  'souffleuse-de-verre': 'caravane-de-gourara',
  'grand-horloger': 'table-des-heures',
  'gardes-du-fjord': 'fjord-des-neuf-hivers',
  'meute-des-neiges': 'fjord-des-neuf-hivers',
  'maitre-des-neuf-hivers': 'fjord-des-neuf-hivers',
};

/** Le terrain d'une couleur de deck sans identité connue. */
export const RPG_PLATEAUX_PAR_COULEUR = {
  sable: 'erg-du-sahara',
  braise: 'table-des-heures',
  eau: 'ruines-de-tipaza',
  neige: 'fjord-des-neuf-hivers',
  hybride: 'caravane-de-gourara',
};

/**
 * Le double merveilleux d'un terrain classique, par identifiant de plateau.
 * La Table des Heures — le terrain de la Braise depuis le retrait des
 * Brûlés — s'embrase en Cavernes de Cristal ; seule la piste caravanière
 * reste unique.
 */
export const RPG_PLATEAUX_VARIANTES_FANTAISISTES = {
  'erg-du-sahara': 'desert-de-verre',
  'table-des-heures': 'cavernes-de-cristal',
  'ruines-de-tipaza': 'abysses-phosphorescentes',
  'fjord-des-neuf-hivers': 'iles-celestes',
};

/** Le plateau par son identifiant, ou null. */
export function plateauParId(id) {
  if (typeof id !== 'string') return null;
  return RPG_PLATEAUX.find((plateau) => plateau.id === id) ?? null;
}

/** Le plateau rendu quand aucun deck ne parle — toujours un plateau du catalogue. */
export function plateauDeRepli() {
  return plateauParId(RPG_PLATEAU_DE_REPLI) ?? RPG_PLATEAUX[0];
}

/**
 * Le double merveilleux d'un plateau — son identifiant ou le plateau lui-même
 * —, ou `null` quand il n'en a pas (piste caravanière, variantes
 * elles-mêmes, inconnu).
 */
export function varianteFantaisisteDe(plateau) {
  const identifiant = typeof plateau === 'string' ? plateau : plateau?.id;
  return plateauParId(RPG_PLATEAUX_VARIANTES_FANTAISISTES[identifiant] ?? null);
}

function cartesDeDeck(deck) {
  if (Array.isArray(deck)) return deck;
  return Array.isArray(deck?.cardIds) ? deck.cardIds : null;
}

/**
 * La couleur dominante d'un paquet : la couleur la plus présente parmi ses
 * cartes, `hybride` quand deux couleurs sont à égalité en tête, `null` quand
 * le paquet ne dit rien (vide, cartes inconnues, incolores).
 */
export function couleurDominanteDeck(deck) {
  const comptes = new Map();
  for (const carteId of cartesDeDeck(deck) ?? []) {
    for (const couleur of cardColors(carteId)) {
      comptes.set(couleur, (comptes.get(couleur) ?? 0) + 1);
    }
  }
  // Un deck déclaré sans liste (identifiant seul, `element`/`elements`) : on
  // lit sa couleur d'état civil plutôt que de rendre les mains vides.
  if (!comptes.size && !Array.isArray(deck) && deck && typeof deck === 'object') {
    for (const couleur of cardColors({ element: deck.element, colors: deck.elements })) {
      comptes.set(couleur, 1);
    }
  }
  if (!comptes.size) return null;
  const maximum = Math.max(...comptes.values());
  const enTete = [...comptes].filter(([, compte]) => compte === maximum).map(([couleur]) => couleur);
  return enTete.length > 1 ? 'hybride' : enTete[0];
}

/**
 * Le terrain qu'un deck impose, et pourquoi.
 *
 * `deck` accepte l'identifiant d'un deck connu, un deck du catalogue
 * (`{ id, cardIds }`) ou un paquet brut (tableau d'identifiants de cartes).
 * `motif` dit d'où vient la réponse : `deck` (correspondance explicite),
 * `couleur` (couleur dominante du paquet) ou `repli` (rien de lisible).
 */
export function plateauDeDeck(deck) {
  const identifiant = typeof deck === 'string' ? deck : deck?.id;
  const attitre = plateauParId(RPG_PLATEAUX_PAR_DECK[identifiant] ?? null);
  if (attitre) return { plateau: attitre, motif: 'deck' };
  const parCouleur = plateauParId(RPG_PLATEAUX_PAR_COULEUR[couleurDominanteDeck(deck)] ?? null);
  if (parCouleur) return { plateau: parCouleur, motif: 'couleur' };
  return { plateau: plateauDeRepli(), motif: 'repli' };
}

function borneDeTirage(rng) {
  const tirage = typeof rng === 'function' ? Number(rng()) : Math.random();
  return Number.isFinite(tirage) ? Math.min(Math.max(tirage, 0), 0.999999) : 0;
}

/**
 * Le plateau d'une nouvelle partie : **le deck de l'un des deux duellistes**
 * impose son terrain, et le sable désigne lequel.
 *
 * `deckJoueur` et `deckAdverse` acceptent ce que `plateauDeDeck` accepte —
 * identifiant de deck, deck du catalogue ou paquet brut. Un camp dont le deck
 * ne dit rien laisse la place à l'autre : on ne retombe sur la Table des
 * Heures que si aucun des deux paquets ne parle.
 *
 * Quand `variantesFantaisistes` est vrai, un second tirage peut échanger le
 * terrain imposé contre son double merveilleux (`variante` vaut alors `true`,
 * sinon `false`) ; il n'est consommé que si le terrain en a un, et une valeur
 * hors bornes garde le classique, sans planter.
 *
 * Rend `{ plateau, camp, motif, variante }` — `camp` : `'joueur'` ou
 * `'adversaire'`, le duelliste dont le deck a imposé le terrain (de quoi
 * l'annoncer en début de partie).
 */
export function tirerPlateauDuDuel({ deckJoueur = null, deckAdverse = null, rng = Math.random, variantesFantaisistes = false } = {}) {
  const camps = [
    { camp: 'joueur', deck: deckJoueur },
    { camp: 'adversaire', deck: deckAdverse },
  ];
  const [premier, second] = borneDeTirage(rng) < 0.5 ? camps : [camps[1], camps[0]];
  let tirage = { ...plateauDeDeck(premier.deck), camp: premier.camp };
  if (tirage.motif === 'repli') {
    const autre = plateauDeDeck(second.deck);
    if (autre.motif !== 'repli') tirage = { ...autre, camp: second.camp };
  }
  if (variantesFantaisistes) {
    const merveilleux = varianteFantaisisteDe(tirage.plateau);
    if (merveilleux && borneDeTirage(rng) >= 0.5) {
      return { ...tirage, plateau: merveilleux, variante: true };
    }
  }
  return { ...tirage, variante: false };
}
