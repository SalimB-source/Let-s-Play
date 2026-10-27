/**
 * Le Sablier — les plateaux de duel.
 *
 * Le duel se joue sur une **table** : un fond plein cadre, sous les cartes.
 * Le jeu en propose plusieurs, et le plateau d'une partie est imposé par **le
 * deck de l'un des deux duellistes** — sauf sur la moitié du joueur, qui peut
 * maintenant **recevoir chez lui** (voir « Le plateau choisi », plus bas).
 *
 * La règle tient en deux temps :
 *
 * 1. **Chaque deck a son terrain.** Un deck du catalogue (ou un deck du mode
 *    Histoire) porte une correspondance explicite — les Veilleurs du Désert se
 *    battent dans l'Erg, le Serment du Soleil rouge dans la Cour de l'Empereur,
 *    la Cour des Djinns sur la Table des Heures… Un deck
 *    sans identité connue (paquet brut passé en prop, deck maison) retombe sur
 *    la **couleur dominante de ses cartes** : Sable → l'Erg, Braise → la Table
 *    des Heures, Eau → les Ruines de Tipaza, Neige → le Village Viking,
 *    Ténèbres → la Nécropole des dalles, deux couleurs à égalité → la
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
 * ## Le plateau choisi — la moitié du joueur, et seulement elle
 *
 * Il n'y a toujours **ni pastille « Aléatoire » ni verrou de plateau en début
 * de partie** : rien à reprendre avant chaque duel. Le choix vit ailleurs, dans
 * la carte de profil (dossier 20 §6), comme une préférence de maison :
 *
 * - `profil.plateau` vaut l'identifiant d'un plateau du catalogue, ou `null`
 *   pour « selon mon deck » — l'état d'un joueur neuf, et celui de tout le
 *   monde jusqu'à ce qu'il choisisse ;
 * - `resoudrePlateauxDuDuel({ plateauChoisi })` peint alors la **moitié basse**
 *   de la table avec ce terrain, `motif: 'choix-du-joueur'`. La moitié haute
 *   reste celle du deck adverse : l'adversaire joue toujours chez lui ;
 * - le plateau du joueur restant le **principal**, le choix pilote la musique
 *   dédiée et le décor 3D ;
 * - un terrain choisi n'est **jamais** échangé contre son double merveilleux :
 *   `variantesFantaisistes` ne tire que ce qui n'a pas été demandé. Le tirage du
 *   joueur n'est donc pas consommé, et celui de l'adversaire prend la première
 *   valeur du `rng` — sans choix, la résolution reste bit à bit celle d'avant ;
 * - un identifiant inconnu (plateau retiré d'une version à l'autre, sauvegarde
 *   retouchée) retombe sur le terrain du deck : `plateauParId` rend `null`, et
 *   la résolution suit son cours normal.
 *
 * En duel en ligne, le choix est une préférence **locale** : chaque client
 * peint sa propre moitié, l'arbitre ne lit ni l'un ni l'autre.
 *
 * Quatre terrains ont leur **double merveilleux** : quand la partie l'autorise
 * (`variantesFantaisistes`), un tirage par camp peut échanger le terrain imposé
 * contre sa version fantaisiste — l'Erg contre le Désert de Verre, les Ruines
 * contre les Abysses Phosphorescentes, le Village Viking contre les Îles
 * Célestes et le Cimetière contre la Fosse de l'Oubliée. Les autres terrains,
 * notamment la piste caravanière, la Place du Souk et la Table des Heures,
 * restent uniques. Le
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

import { cardById, cardColors } from './rpgCards.js';

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
  // La Tour du Souk : une place de marché vue de dessus, dont le centre reste
  // libre pour les cartes. Les quatre étages y reçoivent leurs adversaires.
  {
    id: 'place-du-souk',
    nom: 'La Place du Souk',
    lieu: 'Bab El, la place des étals de la Tour du Souk',
    fichier: 'plateau-place-du-souk.jpg',
    resume: 'Une place de grès ensoleillée vue de dessus : une mosaïque de laiton et de bleu repose à plat au centre, et le dallage reste dégagé pour les cartes. Tout autour, les étals sous leurs auvents rayés rassemblent épices, tapis, verrerie turquoise, poteries de cuivre, balances et lanternes de laiton.',
  },
  {
    id: 'village-viking',
    nom: 'Le Village Viking',
    lieu: 'Le village du Nord, au bord du fjord enneigé',
    fichier: 'plateau-village-viking.jpg',
    resume: 'Un village viking sous la neige, vu à vol d’oiseau : au centre, la grande place dégagée bordée d’une frise de runes gravées dans la pierre, entièrement nue au milieu pour poser les cartes. Tout autour, la grande halle du Jarl au toit de bardeaux enneigés et au fronton sculpté, les maisons longues en bois, les sapins sous la neige, les tas de bûches, les râteliers de boucliers ronds peints, les stèles runiques, les tonneaux, la corde lovée et deux braseros de fer enflammés.',
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
  {
    id: 'navire-pirate',
    nom: 'Le Navire Pirate',
    lieu: 'En pleine mer, sur le pont supérieur du galion corsaire',
    fichier: 'plateau-navire-pirate.jpg',
    resume: 'Vue parfaitement verticale à 90° de dessus, serrée à bord du pont supérieur à ciel ouvert d’un navire pirate en plein soleil : le grand plancher de chêne blond patiné et sa rose des vents dorée incrustée à plat au centre occupent presque tout le cadre, entièrement nus et dégagés au milieu pour poser les cartes. Aux bords haut et bas, les bastingages de bois sombre armés de quatre canons cerclés de laiton laissent voir l’eau turquoise et l’écume blanche du large ; dans les quatre angles, quatre fanaux dorés allumés veillent près d’un coffre au trésor débordant de pièces d’or, d’une carte marine déroulée avec longue-vue, boussole et sabre d’abordage, de tonneaux et de cordages lovés.',
  },
  // Le terrain de la Tour du Corbeau : la clairière des neuf nuits, dehors,
  // sous la neige noire. Le cercle de pierres reste vide au centre — c'est
  // là que les cartes se posent —, et les corbeaux attendent aux branches.
  {
    id: 'cercle-des-corbeaux',
    nom: 'Le Cercle des corbeaux',
    lieu: 'La clairière des neuf nuits, au-dessus du village du fjord',
    fichier: 'plateau-cercle-des-corbeaux.jpg',
    resume: 'Une clairière sous la neige, vue de dessus par une nuit sans lune : le sol de givre bleui et la neige fraîche, et, au centre, le grand cercle de pierres levées, vide, que borde une couronne de plumes noires. Tout autour, les bouleaux noirs chargés de givre et leurs branches nues, le corbeau perché sur la souche, les neuf pierres levées aux runes gravées, une lanterne de fer au verre cassé, la corde lovée et un brasero éteint. Le milieu de la clairière reste nu : c’est là que les cartes se posent.',
  },
  // Le terrain de la Tour du Sablier renversé : l'intérieur du grand sablier
  // retourné, vu de dessus. Ses sept étages s'y battent tous — la tour est
  // elle-même le plateau, comme la clairière l'est pour la Tour du Corbeau.
  // Le dallage d'albâtre reste nu au centre, et les trois sables — safran,
  // braise, nuit — remontent du sol vers la taille de verre.
  {
    id: 'sablier-renverse',
    nom: 'Le Sablier renversé',
    lieu: 'Les Tours de Bab El, la chambre de verre de la tour terminale',
    fichier: 'plateau-sablier-renverse.jpg',
    resume: 'L’intérieur du grand sablier retourné, vu de dessus à 90° : le dallage circulaire d’albâtre et de sable poli, entièrement nu au centre pour poser les cartes, que borde un anneau de laiton lisse où sont sertis des cabochons de verre coloré — crème, ambre, rouge, turquoise, glace et violet. Autour de la bague, des arcs d’orrery de laiton s’ouvrent vers les bords ; des éclats de verre, du sable d’or renversé et des traces de pas de pierre se sont répandus sur les dalles, et trois sables — safran, braise et nuit — remontent du sol vers la taille de l’heure, en spirales près de la gauche et de la droite. Le milieu du plateau reste vide : c’est là que les cartes se posent.',
  },
  // Le second visage de la Tour Oubliée : la Fosse, le fond du puits sous la
  // tour, vu de dessus. Le cimetière (`cimetiere-des-noms-effaces`) est la
  // table attitrée du set ; la Fosse s'ouvre au second tirage, quand la partie
  // autorise les variantes — on descend sous les tombes. Le dallage circulaire
  // reste nu au centre, cerclé de ses anneaux de fer ; la chaîne rouillée, la
  // cloche fêlée et la tache d'encre sont peintes aux bords. La brume violette
  // monte des deux coins bas.
  {
    id: 'fosse-de-l-oubliee',
    nom: 'La Fosse de l’Oubliée',
    lieu: 'Sous la Tour Oubliée, le fond du puits comblé de dalles',
    fichier: 'plateau-fosse-de-l-oubliee.jpg',
    resume: 'Le fond d’un puits de pierre, vu de dessus à 90° par une nuit froide : un dallage circulaire de basalte noir et de calcaire pâle, fendu, suintant d’humidité, entièrement nu au centre pour poser les cartes, que cerclent des anneaux de pierre et quatre pitons de fer scellés dans les dalles. Aux bords seulement : la chaîne rouillée lovée dans l’angle haut gauche, la cloche de bronze fêlée couchée sur le flanc à droite, des lambeaux de parchemin vierge éparpillés, une tache d’encre séchée, et les parois du puits qui remontent en courbe sur le pourtour du cadre. Une brume violette rampe depuis les deux angles bas ; la lumière tombe de très haut, froide et blafarde. Le milieu du plateau reste vide : c’est là que les cartes se posent.',
  },
  // Le terrain de la Tour Oubliée : le cimetière où la tour a été effacée du
  // registre. Ses six étages s'y battent — le cercle de terre battue au milieu
  // des tombes, sous la lune, comme le Cercle des corbeaux pour la Tour du
  // Corbeau et la chambre de verre pour le Sablier.
  {
    id: 'cimetiere-des-noms-effaces',
    nom: 'Le Cimetière des noms effacés',
    lieu: 'Autour de la Tour Oubliée, le cimetière des morts sans registre',
    fichier: 'plateau-cimetiere-des-noms-effaces.jpg',
    resume: 'Un cimetière de nuit, vu de dessus à 90° : une grande aire circulaire de terre battue et de dalles brisées, entièrement nue au centre pour poser les cartes, qu’entoure un muret de pierres sèches. Autour du muret seulement : les tombes blanchies à coupole, les stèles nues penchées, deux cyprès noirs dont l’ombre s’allonge, la grille de fer rouillée, les palmes sèches, quelques lambeaux de parchemin vierge et une lampe à huile restée allumée. La lune éclaire le sol en biais ; une brume violette rampe le long du mur. Les pierres sont parfaitement lisses et sans inscription. Le milieu du cimetière reste vide : c’est là que les cartes se posent.',
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
  // Le Nord : le Serment des Neuf Hivers se bat sur la place du village viking.
  'serment-des-neuf-hivers': 'village-viking',
  // L'Est : le Serment du Soleil rouge reçoit dans la cour de l'Empereur, le
  // grand parvis de gravier ratissé que garde le palais impérial.
  'serment-du-soleil-rouge': 'cour-de-l-empereur',
  // Les Ténèbres ont désormais leurs deux terrains : le dehors du set
  // `balance-des-heures` (la Nécropole des dalles, le plateau du désert) et le
  // dedans du palais (Le Palais du Pharaon), où siège le tribunal de la
  // Nécropole — le jugement se rend devant le trône.
  'balance-des-heures': 'necropole-des-dalles',
  // Les Lettres de Marque embarquent sur leur propre navire pirate : le pont
  // du galion corsaire vu de dessus, en duel libre comme en mode sans terrains.
  'lettres-de-marque': 'navire-pirate',
  'essai-mana-lettres-de-marque': 'navire-pirate',
  // Campagne (clés de `RPG_STORY_DECKS`) : la Souffleuse tient la piste de
  // caravane du deck hybride dont elle vient ; le Grand Horloger, lui, reçoit
  // dans la salle haute de la Chambre, sur la table d'origine. Les quatre
  // étages de la Tour du Fjord se battent au village viking.
  'souffleuse-de-verre': 'caravane-de-gourara',
  'grand-horloger': 'table-des-heures',
  // Les Tours, étage par étage (rpgDeckRecipes.js `rampeEtage`) : chaque
  // paquet d'étage se bat sur le terrain de sa Tour.
  'guetteur-de-palier': 'erg-du-sahara',
  'scribe-de-la-liste': 'erg-du-sahara',
  'puisatier-des-cendres': 'caravane-de-gourara',
  // Les quatre adversaires du Souk partagent la place des étals.
  'marchand-de-sable': 'place-du-souk',
  'gardienne-des-ksour': 'place-du-souk',
  'djinn-du-tournant': 'place-du-souk',
  'reine-des-etals': 'place-du-souk',
  'veille-des-ergs': 'erg-du-sahara',
  'ifrit-des-sables': 'caravane-de-gourara',
  'horloger-du-zenith': 'table-des-heures',
  'pecheur-de-perles': 'ruines-de-tipaza',
  'nageuse-des-puits': 'ruines-de-tipaza',
  'sonneur-d-ecume': 'ruines-de-tipaza',
  'devoreur-de-l-abime': 'ruines-de-tipaza',
  'equipage-des-galiotes': 'navire-pirate',
  'marche-des-ranscons': 'navire-pirate',
  'flotte-du-rais': 'navire-pirate',
  'amiral-des-deux-mers': 'navire-pirate',
  'valkyrie-du-fjord': 'village-viking',
  'kenshi-du-torii': 'cour-de-l-empereur',
  'peseuse-des-ames': 'necropole-des-dalles',
  'gardes-du-fjord': 'village-viking',
  'meute-des-neiges': 'village-viking',
  'maitre-des-neuf-hivers': 'village-viking',
  'gardes-du-soleil': 'cour-de-l-empereur',
  'lames-du-soleil': 'cour-de-l-empereur',
  'maitre-du-soleil-rouge': 'cour-de-l-empereur',
  // La Tour de la Nécropole : les trois premières cryptes s'ouvrent sur les
  // dalles du Nil, en plein jour ; le tribunal du sommet siège dans la salle du
  // trône du Pharaon, le seuil où se rend la sentence.
  'momies-de-la-necropole': 'necropole-des-dalles',
  'chacals-du-seuil': 'necropole-des-dalles',
  'juges-de-la-necropole': 'palais-du-pharaon',
  // La Tour du Corbeau : ses quatre étages se battent au Cercle des
  // corbeaux, la clairière de la neige noire. Le Maître des corbeaux y reçoit
  // comme chez lui — c'est son cercle.
  'corbeaux-du-givre': 'cercle-des-corbeaux',
  'serment-des-neuf-nuits': 'cercle-des-corbeaux',
  'veille-du-corbeau': 'cercle-des-corbeaux',
  'maitre-des-corbeaux': 'cercle-des-corbeaux',
  // La Tour du Sablier renversé : la tour terminale est **elle-même** le
  // plateau. Ses sept étages se battent tous dans le grand sablier retourné,
  // la chambre de verre où les maîtres reviennent à leur sommet — les sept
  // identités de la montée restent, mais la table ne change plus de camp :
  // on est chez le Sablier du premier au dernier palier.
  'veilleurs-absolus': 'sablier-renverse',
  'flamme-absolue': 'sablier-renverse',
  'maree-absolue': 'sablier-renverse',
  'hiver-absolu': 'sablier-renverse',
  'jugement-absolu': 'sablier-renverse',
  'course-absolue': 'sablier-renverse',
  'le-sablier': 'sablier-renverse',
  // La Tour Oubliée : ses six paquets se battent tous au Cimetière des noms
  // effacés, la nécropole de plein air dressée autour de la tour. Comme pour le
  // Sablier renversé, la table ne change plus de camp : on est chez l'Oubliée du
  // premier au dernier palier. La Fosse de l'Oubliée — le fond du puits — reste
  // le second visage de la tour, ouvert par le tirage fantaisiste.
  'horde-des-fosses': 'cimetiere-des-noms-effaces',
  'cour-de-sang': 'cimetiere-des-noms-effaces',
  'cauchemars-du-gourara': 'cimetiere-des-noms-effaces',
  'cauchemars-du-registre': 'cimetiere-des-noms-effaces',
  'bestiaire-oublie': 'cimetiere-des-noms-effaces',
  'le-roi-sans-nom': 'cimetiere-des-noms-effaces',
};

/** Le terrain d'une couleur de deck sans identité connue. */
export const RPG_PLATEAUX_PAR_COULEUR = {
  sable: 'erg-du-sahara',
  braise: 'table-des-heures',
  eau: 'ruines-de-tipaza',
  neige: 'village-viking',
  // Les Ténèbres ont leur terrain : la Nécropole des dalles, le set égyptien
  // du catalogue. Le Palais du Pharaon restent au deck qui les revendique
  // (le tribunal de la Nécropole), pas à la couleur.
  tenebres: 'necropole-des-dalles',
  hybride: 'caravane-de-gourara',
};

/**
 * Le double merveilleux d'un terrain classique, par identifiant de plateau.
 * L'Erg s'effile en Désert de Verre, les Ruines sombrent en Abysses
 * Phosphorescentes, le Village Viking s'allège en Îles Célestes. La piste caravanière
 * et la Table des Heures — la table d'origine, depuis le retrait des Cavernes
 * de Cristal — restent uniques.
 */
export const RPG_PLATEAUX_VARIANTES_FANTAISISTES = {
  'erg-du-sahara': 'desert-de-verre',
  'ruines-de-tipaza': 'abysses-phosphorescentes',
  'village-viking': 'iles-celestes',
  // La Tour Oubliée a deux visages : le cimetière où son nom a été effacé — sa
  // table attitrée —, et le fond du puits sous la tour. Le second tirage peut
  // faire descendre les duellistes dans la Fosse.
  'cimetiere-des-noms-effaces': 'fosse-de-l-oubliee',
};

/** Le motif d'une moitié de table imposée par la carte de profil. */
export const RPG_PLATEAU_MOTIF_CHOIX = 'choix-du-joueur';

/** Le plateau par son identifiant, ou null. */
export function plateauParId(id) {
  if (typeof id !== 'string') return null;
  return RPG_PLATEAUX.find((plateau) => plateau.id === id) ?? null;
}

/**
 * Une seule révision de cache pour les vignettes du choix de plateau.
 *
 * Les fonds de table font de 740 Ko à 4 Mo en 3840×2560 : douze d'un coup dans
 * le bandeau de la carte de profil, c'est plus lourd que la partie qu'ils
 * annoncent. Chacun a donc sa **vignette** — 320×200 découpés au centre du fond,
 * là où la table pose les cartes — générée par `tools/make-profil-vignettes.mjs`
 * et servie depuis `public/profil/plateaux/`. Le fond pleine taille, lui, reste
 * celui de la table : la vignette ne remplace rien.
 */
export const PLATEAU_VIGNETTE_REVISION = 'profil-plateaux-1';

/** Le côté long de la vignette d'un plateau, en pixels — 3:2 comme les fonds,
 * pour une tuile de 104 px CSS nette à 2×. */
export const PLATEAU_VIGNETTE_LARGEUR = 336;

/** Le chemin relatif (dans `public/`) de la vignette d'un plateau. */
export function vignettePlateauRelative(plateauOuId) {
  const plateau = typeof plateauOuId === 'string' ? plateauParId(plateauOuId) : plateauOuId;
  return plateau?.id ? `profil/plateaux/${plateau.id}.webp` : null;
}

/**
 * L'URL servie de la vignette d'un plateau, `baseUrl` étant celui du build
 * (`import.meta.env.BASE_URL`).
 */
export function vignettePlateau(plateauOuId, baseUrl = '/') {
  const relative = vignettePlateauRelative(plateauOuId);
  return relative ? `${baseUrl}${relative}?v=${PLATEAU_VIGNETTE_REVISION}` : null;
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
function estPaquetCorsaire(deck) {
  const cartes = cartesDeDeck(deck);
  if (!cartes?.length) return false;
  let connues = 0;
  let corsaires = 0;
  for (const carteId of cartes) {
    const carte = cardById(carteId);
    if (!carte || carte.kind === 'terrain') continue;
    connues += 1;
    if (carte.set === 'lettres-de-marque') corsaires += 1;
  }
  return connues > 0 && corsaires >= Math.max(3, Math.ceil(connues / 2));
}

export function plateauDeDeck(deck) {
  const identifiant = typeof deck === 'string' ? deck : deck?.id;
  const attitre = plateauParId(RPG_PLATEAUX_PAR_DECK[identifiant] ?? null);
  if (attitre) return { plateau: attitre, motif: 'deck' };
  if (estPaquetCorsaire(deck)) {
    const navire = plateauParId('navire-pirate');
    if (navire) return { plateau: navire, motif: 'deck' };
  }
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
export function resoudrePlateauxDuDuel({ deckJoueur = null, deckAdverse = null, rng = Math.random, variantesFantaisistes = false, plateauChoisi = null } = {}) {
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
  // Le joueur qui a choisi un terrain reçoit chez lui : sa moitié ne tire rien,
  // pas même son double merveilleux. Un identifiant inconnu rend la main au deck.
  const choisi = plateauParId(plateauChoisi);
  const joueur = choisi
    ? { plateau: choisi, motif: RPG_PLATEAU_MOTIF_CHOIX, variante: false }
    : resoudre(deckJoueur);
  const adversaire = resoudre(deckAdverse);
  return {
    joueur,
    adversaire,
    principal: joueur,
    decouper: joueur.plateau.id !== adversaire.plateau.id,
  };
}
