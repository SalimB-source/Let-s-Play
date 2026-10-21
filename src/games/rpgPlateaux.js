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
 *    battent dans l'Erg, le Serment du Soleil rouge dans la Cour de l'Empereur,
 *    la Cour des Djinns sur la Table des Heures… Un deck
 *    sans identité connue (paquet brut passé en prop, deck maison) retombe sur
 *    la **couleur dominante de ses cartes** : Sable → l'Erg, Braise → la Table
 *    des Heures, Eau → les Ruines de Tipaza, Neige → le Fjord des Neuf
 *    Hivers, Ténèbres → la Nécropole des dalles, deux couleurs à égalité → la
 *    Caravane de Gourara, le carrefour des pistes. Sans rien de lisible, c'est
 *    la Table des Heures, la table d'origine de Bab El.
 * 2. **Chaque camp joue sur son terrain.** La table est découpée en deux
 *    moitiés (`resoudrePlateauxDuDuel`) : la moitié haute porte le plateau du
 *    deck adverse, la moitié basse celui du deck du joueur — chacun se bat
 *    chez lui, dans tous les modes. Quand les deux decks imposent le même
 *    terrain, la table reste pleine, sans couture. Le plateau du joueur reste
 *    le **principal** : c'est lui qui pilote la musique dédiée et le décor 3D
 *    (ce dernier seulement quand la table n'est pas découpée). L'ancien tirage
 *    d'un seul camp (`tirerPlateauDuDuel`, `campImpose`) reste exporté pour
 *    les scénarios qui veulent une table d'un seul tenant désignée par le
 *    sable. Les tirages passent par le `rng` du duel — injectable — donc une
 *    partie se rejoue à l'identique, comme le reste du moteur, et une valeur
 *    hors bornes ne plante rien.
 *
 * Il n'y a donc plus ni pastille « Aléatoire », ni verrou de plateau, ni
 * sauvegarde du choix sur l'appareil : rien à mémoriser, rien à reprendre.
 *
 * Trois des terrains classiques ont leur **double merveilleux** : quand la
 * partie l'autorise (`variantesFantaisistes`), un tirage par camp peut échanger
 * le terrain imposé contre sa version fantaisiste — l'Erg contre le Désert de
 * Verre, les Ruines contre les Abysses Phosphorescentes, le Fjord contre les
 * Îles Célestes. Les cinq autres — la piste caravanière, la Table des Heures
 * (la table d'origine, que les Cavernes de Cristal ont quittée), la
 * Cour de l'Empereur et les deux terrains des Ténèbres, la Nécropole des
 * dalles et les Palais du Pharaon — restent uniques. Le
 * motif et le camp ne bougent pas : ils disent toujours quel deck a imposé le
 * terrain.
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
  {
    id: 'cour-de-l-empereur',
    nom: 'La Cour de l’Empereur',
    lieu: 'Kyō, la cour d’honneur du palais impérial',
    fichier: 'plateau-cour-de-l-empereur.jpg',
    resume: 'Une peinture japonaise : le grand parvis de gravier ratissé et ses cercles concentriques, vide au milieu, que gardent la véranda du trône aux tuiles turquoise et ses colonnes vermillon, les galeries couvertes des bords, les portes du palais, les lanternes de pierre, le tambour laqué, les bannières impériales, le bassin à l’eau claire, les pins et les cerisiers en fleurs. Le milieu de la cour reste vide : c’est là que les cartes se posent.',
  },
  // Les deux terrains des Ténèbres : le plateau du désert égyptien, dehors, et
  // la salle du trône du palais, dedans. Le set `balance-des-heures` (doc 16)
  // tient le premier ; le second reçoit le tribunal de la Nécropole, qui juge
  // devant le trône du Pharaon.
  {
    id: 'necropole-des-dalles',
    nom: 'La Nécropole des dalles',
    lieu: 'Le plateau du désert égyptien, au pied des pyramides, à midi',
    fichier: 'plateau-necropole-des-dalles.jpg',
    resume: 'Un décor entièrement extérieur, vu de dessus en plein jour : le plateau de calcaire blanchi par le soleil, fendu et à demi ensablé, et, au centre, le grand cercle de pierre, vide, cerclé d’hiéroglyphes et de plumes de Maât. Deux pyramides se dressent sur le plateau, à gauche, une troisième à droite, toutes vues d’en haut — base carrée, arêtes au centre, ombre portée sur le sable. Le reste du plateau est laissé nu : seuls quelques objets posés dans les deux angles du haut — la balance et sa plume contre le cœur, le khopesh d’or, deux vases canopes et un shabti de faïence —, et le Nil turquoise qui longe le bas du cadre, avec ses roseaux et ses palmeraies.',
  },
  {
    id: 'palais-du-pharaon',
    nom: 'Le Palais du Pharaon',
    lieu: 'Memphis, la salle du trône du palais, derrière la grande cour',
    fichier: 'plateau-palais-du-pharaon.jpg',
    resume: 'Un intérieur, vu de dessus : le dallage d’albâtre et de granit, encadré de bandes d’or, de lapis et de turquoise, et le grand disque de granit noir, vide, qu’entoure une frise de pétales de lotus. Très peu d’objets, tous aux bords : en bas, les marches d’albâtre et le trône doré, vus du dessus ; à gauche et à droite, les colonnes à chapiteau de lotus qui sortent du cadre ; dans les deux angles bas, un brasero de bronze et un éventail de plumes d’autruche. Le centre reste nu : c’est là que les cartes se posent.',
  },
  // Les doubles merveilleux : atteints par le second tirage
  // (`RPG_PLATEAUX_VARIANTES_FANTAISISTES`), jamais par un deck directement.
  {
    id: 'desert-de-verre',
    nom: 'Le Désert de Verre',
    lieu: 'Au-delà de l’Erg, là où la foudre a fondu le sable',
    fichier: 'plateau-desert-de-verre.jpg',
    resume: 'L’étendue de sable vitrifié, ambrée et aigue-marine ; l’anneau de cristal pilé au centre, les roses de verre, l’astrolabe de laiton, l’outre et la corde aux coins.',
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
  // La Cour des Djinns garde la table d'origine.
  'cour-des-djinns': 'table-des-heures',
  'sentiers-de-cendre': 'caravane-de-gourara',
  'maree-des-abysses': 'ruines-de-tipaza',
  // Le Nord : le Serment des Neuf Hivers se bat sur la glace du fjord.
  'serment-des-neuf-hivers': 'fjord-des-neuf-hivers',
  // L'Est : le Serment du Soleil rouge reçoit dans la cour de l'Empereur, le
  // grand parvis de gravier ratissé que garde le palais impérial.
  'serment-du-soleil-rouge': 'cour-de-l-empereur',
  // Les Ténèbres ont désormais leurs deux terrains : le dehors du set
  // `balance-des-heures` (la Nécropole des dalles, le plateau du désert) et le
  // dedans du palais (Le Palais du Pharaon), où siège le tribunal de la
  // Nécropole — le jugement se rend devant le trône.
  'balance-des-heures': 'necropole-des-dalles',
  // Les Lettres de Marque se battent sur la côte : les Ruines de Tipaza, les
  // quais antiques que la mer reprend — le monde des corsaires de la Régence
  // avant que Les Quais de Cuivre (doc 17 §13) n'aient leur propre plateau.
  'lettres-de-marque': 'ruines-de-tipaza',
  // Campagne (clés de `RPG_STORY_DECKS`) : la Souffleuse tient la piste de
  // caravane du deck hybride dont elle vient ; le Grand Horloger, lui, reçoit
  // dans la salle haute de la Chambre, sur la table d'origine. Les quatre
  // étages de la Tour du Fjord gardent la glace de leur deck.
  'souffleuse-de-verre': 'caravane-de-gourara',
  'grand-horloger': 'table-des-heures',
  'gardes-du-fjord': 'fjord-des-neuf-hivers',
  'meute-des-neiges': 'fjord-des-neuf-hivers',
  'maitre-des-neuf-hivers': 'fjord-des-neuf-hivers',
  'gardes-du-soleil': 'cour-de-l-empereur',
  'lames-du-soleil': 'cour-de-l-empereur',
  'maitre-du-soleil-rouge': 'cour-de-l-empereur',
  // La Tour de la Nécropole : les trois premières cryptes s'ouvrent sur les
  // dalles du Nil, en plein jour ; le tribunal du sommet siège dans la salle du
  // trône du Pharaon, le seuil où se rend la sentence.
  'momies-de-la-necropole': 'necropole-des-dalles',
  'chacals-du-seuil': 'necropole-des-dalles',
  'juges-de-la-necropole': 'palais-du-pharaon',
};

/** Le terrain d'une couleur de deck sans identité connue. */
export const RPG_PLATEAUX_PAR_COULEUR = {
  sable: 'erg-du-sahara',
  braise: 'table-des-heures',
  eau: 'ruines-de-tipaza',
  neige: 'fjord-des-neuf-hivers',
  // Les Ténèbres ont leur terrain : la Nécropole des dalles, le set égyptien
  // du catalogue. Le Palais du Pharaon restent au deck qui les revendique
  // (le tribunal de la Nécropole), pas à la couleur.
  tenebres: 'necropole-des-dalles',
  hybride: 'caravane-de-gourara',
};

/**
 * Le double merveilleux d'un terrain classique, par identifiant de plateau.
 * L'Erg s'effile en Désert de Verre, les Ruines sombrent en Abysses
 * Phosphorescentes, le Fjord s'allège en Îles Célestes. La piste caravanière
 * et la Table des Heures — la table d'origine, depuis le retrait des Cavernes
 * de Cristal — restent uniques.
 */
export const RPG_PLATEAUX_VARIANTES_FANTAISISTES = {
  'erg-du-sahara': 'desert-de-verre',
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
 * —, ou `null` quand il n'en a pas (piste caravanière, Table des Heures,
 * variantes elles-mêmes, inconnu).
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
 * identifiant de deck, deck du catalogue ou paquet brut. `campImpose` peut
 * fixer le camp qui impose le terrain (`'joueur'` ou `'adversaire'`) ; s'il est
 * défini, aucun autre camp ne remplace son plateau de repli. Sans cette option,
 * le tirage choisit un camp au hasard et l'autre peut prendre le relais si son
 * deck n'a aucun terrain lisible.
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
export function tirerPlateauDuDuel({ deckJoueur = null, deckAdverse = null, rng = Math.random, variantesFantaisistes = false, campImpose = null } = {}) {
  const camps = [
    { camp: 'joueur', deck: deckJoueur },
    { camp: 'adversaire', deck: deckAdverse },
  ];
  const campForce = camps.find(({ camp }) => camp === campImpose) ?? null;
  const [premier, second] = campForce
    ? [campForce, camps.find(({ camp }) => camp !== campForce.camp)]
    : borneDeTirage(rng) < 0.5 ? camps : [camps[1], camps[0]];
  let tirage = { ...plateauDeDeck(premier.deck), camp: premier.camp };
  if (tirage.motif === 'repli' && !campForce) {
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

/**
 * Les plateaux d'une nouvelle partie, **un par camp** : la table découpée en
 * deux moitiés, chacune couverte du terrain du deck qui s'y bat.
 *
 * `deckJoueur` et `deckAdverse` acceptent ce que `plateauDeDeck` accepte —
 * identifiant de deck, deck du catalogue ou paquet brut. Chaque camp parle
 * pour lui-même : un deck illisible retombe sur la Table des Heures **dans sa
 * moitié**, sans rien emprunter à l'autre.
 *
 * Quand `variantesFantaisistes` est vrai, chaque camp tire **son** double
 * merveilleux indépendamment — le joueur d'abord, l'adversaire ensuite, pour
 * que la suite du `rng` du duel reste déterministe. Le tirage d'un camp n'est
 * consommé que si son terrain a un double ; sans l'option, la résolution ne
 * consomme **aucune** valeur du `rng`. Une valeur hors bornes garde le
 * classique, sans planter.
 *
 * Rend `{ joueur, adversaire, principal, decouper }` — `joueur` et
 * `adversaire` sont des résolutions de `plateauDeDeck` augmentées de
 * `variante` ; `principal` est la résolution du joueur, celle qui pilote la
 * musique dédiée et le décor 3D ; `decouper` dit si les deux terrains
 * diffèrent (sinon, la table reste d'un seul tenant).
 */
export function resoudrePlateauxDuDuel({ deckJoueur = null, deckAdverse = null, rng = Math.random, variantesFantaisistes = false } = {}) {
  const resoudre = (deck) => {
    const resolu = plateauDeDeck(deck);
    if (variantesFantaisistes) {
      const merveilleux = varianteFantaisisteDe(resolu.plateau);
      if (merveilleux && borneDeTirage(rng) >= 0.5) {
        return { ...resolu, plateau: merveilleux, variante: true };
      }
    }
    return { ...resolu, variante: false };
  };
  const joueur = resoudre(deckJoueur);
  const adversaire = resoudre(deckAdverse);
  return {
    joueur,
    adversaire,
    principal: joueur,
    decouper: joueur.plateau.id !== adversaire.plateau.id,
  };
}
