/**
 * L'invite de texte de l'atelier — la demande du joueur **lue en toutes
 * lettres**.
 *
 * La création assistée demandait deux clics : les couleurs, puis le style.
 * Elle s'ouvre désormais sur une question en français courant — « Quel type de
 * deck voulez-vous ? » — et le joueur répond comme il parlerait :
 *
 *   « un deck viking neige ténèbres, avec quelques sorts de contrôle »
 *
 * Ce module **lit** cette phrase et la traduit en intention de deck :
 *
 *   - les **couleurs** dites (Neige, Ténèbres) — sinon déduites du thème ;
 *   - les **thèmes** (Vikings) ramenés aux tribus imprimées du catalogue ;
 *   - le **style de jeu** (Contrôle) et son **intensité** (« quelques » →
 *     un contrôle léger, « à fond » → un contrôle franc) ;
 *   - les **effets** voulus (retraits, pioche, gel, soins…), les **familles**
 *     demandées (« avec des armes »), la **courbe** (« deck rapide »), les
 *     **raretés** (« que des légendaires ») ;
 *   - les **exclusions** (« sans sorts », « pas de contrôle ») ;
 *   - les **cartes nommées** (« avec le Kraken »), posées en signature.
 *
 * Comme le moteur qu'elle alimente (`rpgDeckAuto.js`), cette lecture est un
 * **calcul pur, déterministe, hors ligne** : aucun appel réseau, aucune clé,
 * aucune latence. Le jeu tourne sur desktop et Android sans connexion, et la
 * maison préfère une règle vérifiable à une réponse imprévisible — un
 * vocabulaire déclaré (`RPG_THEMES_DECK`, `RPG_MOTS_COULEURS`,
 * `RPG_MOTS_EFFETS`…) lu sur les mots du joueur, plus les tribus réellement
 * imprimées dans le catalogue. Ce qui n'est pas reconnu est **dit**, jamais
 * deviné en silence : `verifierIntention` rend ses `alertes`, et l'assistant
 * les affiche avant de générer.
 *
 * Le catalogue arrive en paramètre (`{ cartes, couleursDe }`), comme chez le
 * moteur et le composeur : le module reste testable sur trois cartes
 * synthétiques.
 */

import { tribusDeCarte } from './rpgDeckAuto.js';

/** Ordre canonique des couleurs — celui de `RPG_ELEMENTS`, sans l'importer. */
export const RPG_ORDRE_COULEURS = ['braise', 'eau', 'sable', 'neige', 'tenebres'];

/** Le libellé d'une couleur, pour le récapitulatif rendu au joueur. */
export const RPG_LABELS_COULEURS = {
  braise: 'Braise',
  eau: 'Eau',
  sable: 'Sable',
  neige: 'Neige',
  tenebres: 'Ténèbres',
};

/** Le libellé d'une famille de cartes, dans les mots du joueur. */
export const RPG_LABELS_FAMILLES = {
  creature: 'créatures',
  magie: 'sorts',
  arme: 'armes',
};

/**
 * Les couleurs, et ce que le joueur dit pour les nommer. Un alias peut être un
 * groupe de mots (« neuf hivers ») ; les pluriels et les accents sont repliés
 * à la lecture, donc « Ténèbres », « tenebres » et « ténèbres » se valent.
 */
export const RPG_MOTS_COULEURS = [
  {
    couleur: 'braise',
    alias: ['braise', 'feu', 'feux', 'flamme', 'flammes', 'rouge', 'incendie', 'lave', 'volcan',
      'cendres', 'fournaise', 'fire', 'ember'],
  },
  {
    couleur: 'eau',
    alias: ['eau', 'eaux', 'ocean', 'océan', 'mer', 'mers', 'vague', 'vagues', 'maree', 'marée',
      'pluie', 'abysse', 'abysses', 'water', 'sea', 'mare'],
  },
  {
    couleur: 'sable',
    alias: ['sable', 'sables', 'desert', 'désert', 'dune', 'dunes', 'erg', 'ergs', 'oasis',
      'sirocco', 'caravane', 'souk', 'sand'],
  },
  {
    couleur: 'neige',
    alias: ['neige', 'neiges', 'hiver', 'hivers', 'glace', 'glaces', 'givre', 'banquise', 'froid',
      'frost', 'ice', 'snow', 'fjord', 'neuf hivers', 'nordique'],
  },
  {
    couleur: 'tenebres',
    alias: ['tenebres', 'ténèbres', 'ombre', 'ombres', 'nuit', 'nuits', 'noir', 'noire', 'noirs',
      'obscurite', 'obscurité', 'dark', 'shadow', 'mort', 'morts', 'outre tombe', 'au dela',
      'necropole', 'nécropole', 'maudit', 'eclipse', 'éclipse'],
  },
];

/**
 * Les thèmes du catalogue : ce que le joueur nomme (« les Vikings », « les
 * pirates »), traduit en **tribus imprimées** (`tribu:*`, lues par
 * `tribusDeCarte`) et en mots de noms ou de lignes de type (`noms`). Un thème
 * dont aucune carte ne porte les tribus est simplement absent du lexique —
 * c'est le catalogue qui décide de ce qui existe.
 */
export const RPG_THEMES_DECK = [
  {
    id: 'viking',
    label: 'Vikings',
    alias: ['viking', 'nordique', 'nord', 'drakkar', 'valkyrie', 'berserk', 'berserker', 'jarl',
      'scalde', 'rune', 'runes', 'runique', 'asgard', 'banquise', 'neuf hivers', 'fjord', 'hache'],
    tribus: ['viking', 'valkyrie', 'berserk', 'jarl', 'scalde', 'geant', 'loup', 'corbeau'],
    noms: ['viking', 'drakkar', 'banquise', 'givre'],
  },
  {
    id: 'corbeau',
    label: 'Corbeaux',
    alias: ['corbeau', 'corbeaux', 'plume', 'plumes', 'veilleuse', 'neuf nuits', 'crepuscule',
      'crépuscule', 'pere des corbeaux', 'maitre des corbeaux'],
    tribus: ['corbeau', 'veilleuse'],
    noms: ['corbeau', 'veilleuse'],
  },
  {
    id: 'vampire',
    label: 'Vampires',
    alias: ['vampire', 'vampires', 'sanguinaire', 'immortel', 'lune noire', 'croissant noir',
      'eclipse', 'éclipse', 'soldats de la lune'],
    tribus: ['vampire'],
    noms: ['vampire', 'lune noire', 'croissant'],
  },
  {
    id: 'serpent',
    label: 'Serpents',
    alias: ['serpent', 'serpents', 'vipere', 'vipère', 'viperes', 'cobra', 'aspic', 'reptile',
      'orochi', 'anaconda', 'naja', 'ureus'],
    tribus: ['serpent'],
    noms: ['serpent', 'vipere', 'ureus'],
  },
  {
    id: 'samourai',
    label: 'Samouraïs',
    alias: ['samourai', 'samouraï', 'samourais', 'ronin', 'rōnin', 'ashigaru', 'kami', 'yokai',
      'yōkai', 'tengu', 'oni', 'katana', 'iaijutsu', 'shogun', 'daimyo', 'bushido', 'soleil rouge',
      'kitsune', 'susanoo', 'kagutsuchi', 'japonais'],
    tribus: ['samourai', 'ashigaru', 'ronin', 'kami', 'yokai', 'tengu', 'oni', 'sabre', 'jitte',
      'tempete', 'technique'],
    noms: ['samourai', 'soleil rouge'],
  },
  {
    id: 'pirate',
    label: 'Pirates et navires',
    alias: ['pirate', 'pirates', 'corsaire', 'flotte', 'abordage', 'navire', 'navires', 'bateau',
      'bateaux', 'galiote', 'galion', 'cotre', 'brulot', 'brûlot', 'mousse', 'rais', 'amiral',
      'lettre de marque', 'lettres de marque', 'caraibe', 'caraïbes', 'tresor', 'trésor',
      'hollandais volant', 'barbe noire', 'barbe rousse'],
    tribus: ['pirate', 'pirates', 'corsaire', 'navire', 'galion', 'cotre', 'brulot', 'mousse',
      'rais', 'pilote', 'tercio', 'negociant', 'amiral', 'vaisseau', 'fantome', 'chasseur',
      'tresor', 'grotte', 'grappin'],
    noms: ['marque', 'galiote', 'abordage', 'pirate'],
  },
  {
    id: 'amazigh',
    label: 'Amazighs du désert',
    alias: ['amazigh', 'amazighe', 'amazighs', 'berbere', 'berbère', 'berberes', 'touareg',
      'touaregue', 'kabyle', 'chaoui', 'chaouie', 'mozabite', 'tin hinan', 'takouba', 'mehari',
      'méhari', 'amayas'],
    tribus: ['amazigh', 'amazighe', 'guerriere', 'guerrier', 'touareg', 'touaregue', 'kabyle',
      'chaouie', 'mozabite', 'guide', 'takouba'],
    noms: ['amazigh', 'touareg', 'tin hinan', 'takouba'],
  },
  {
    id: 'djinn',
    label: 'Djinns et ghûls',
    alias: ['djinn', 'djinns', 'genie', 'génie', 'ifrit', 'efrit', 'ghul', 'ghûl', 'ghoul',
      'sahir', 'sorcellerie', 'souffleur', 'demon', 'démon', 'feu follet', 'elemental',
      'élémental', 'genies'],
    tribus: ['djinn', 'ifrit', 'ghul', 'sahir', 'souffleur', 'elemental', 'demon', 'follet'],
    noms: ['djinn', 'ifrit', 'ghul'],
  },
  {
    id: 'seuil',
    label: 'Le Seuil (la Balance des Heures)',
    alias: ['momie', 'momies', 'seuil', 'balance', 'balance des heures', 'pesee', 'pesée',
      'jugement', 'ibis', 'chacal', 'anubis', 'natron', 'hieroglyphe', 'hiéroglyphes', 'papyrus',
      'scribe', 'pretre', 'prêtre', 'funeraire', 'funéraire', 'livre des morts', 'offrande',
      'outre tombe', 'tombeau'],
    tribus: ['momie', 'chacal', 'ibis', 'scribe', 'pretre', 'ouvrier', 'gardienne', 'juge',
      'greffier', 'deesse', 'lionne', 'souveraine', 'souverain', 'passeur', 'jugement', 'pesee',
      'effacement', 'offrande', 'morts', 'livre', 'nil', 'crocodile', 'seuil', 'royal'],
    noms: ['balance', 'seuil', 'pesee', 'natron', 'papyrus'],
  },
  {
    id: 'betes',
    label: 'Bêtes et meutes',
    alias: ['bete', 'bête', 'betes', 'bêtes', 'animal', 'animaux', 'meute', 'bestiaire',
      'monstre', 'monstres', 'loup', 'loups', 'chien', 'chiens', 'fennec', 'guepard', 'guépard',
      'crocodile', 'lionne', 'geant', 'géant', 'kraken', 'leviathan'],
    tribus: ['loup', 'chien', 'fennec', 'chacal', 'animal', 'oiseau', 'crocodile', 'lionne',
      'geant', 'bete', 'marine', 'yokai'],
    noms: ['bete marine', 'kraken', 'loup', 'fennec'],
  },
  {
    id: 'defense',
    label: 'Tours et remparts',
    alias: ['tour', 'tours', 'defense', 'défense', 'rempart', 'remparts', 'forteresse', 'mur',
      'muraille', 'bastion', 'bouclier', 'boucliers', 'sentinelle', 'vigie', 'gardienne'],
    tribus: ['vigie', 'gardienne', 'tour', 'defense'],
    noms: ['tour de defense', 'mur de boucliers', 'sentinelle', 'rempart'],
  },
];

/**
 * Les styles de jeu, dans les mots du joueur. `controle` couvre les demandes
 * de retraits : « sorts de contrôle », « removal », « tenir le jeu ».
 */
export const RPG_MOTS_STYLE = [
  {
    style: 'aggro',
    alias: ['aggro', 'agressif', 'agressive', 'agression', 'rapide', 'vite', 'vitesse', 'tempo',
      'rush', 'blitz', 'assaut', 'charge', 'pression', 'presser', 'brutal', 'fonceur',
      'early game', 'debut de partie', 'début de partie'],
  },
  {
    style: 'controle',
    alias: ['controle', 'contrôle', 'control', 'controler', 'contrôler', 'removal', 'retrait',
      'retraits', 'tenir', 'temporiser', 'tactique', 'defensif', 'défensif', 'defense', 'défense',
      'prudence', 'survie', 'endurance', 'bloquer', 'late game', 'fin de partie', 'usure'],
  },
  {
    style: 'mix',
    alias: ['mix', 'mixte', 'equilibre', 'équilibre', 'equilibre', 'équilibré', 'polyvalent',
      'versatile', 'midrange', 'flexible', 'adaptable', 'generaliste', 'généraliste',
      'tout terrain', 'moyen'],
  },
];

/**
 * Les effets voulus, traduits dans les types d'effet du moteur (`effet:*`).
 * Un même mot du joueur peut appeler plusieurs effets : « contrôle » veut des
 * retraits **et** des contresorts.
 */
export const RPG_MOTS_EFFETS = [
  {
    effet: 'degats',
    label: 'dégâts directs',
    alias: ['degats', 'dégâts', 'degat', 'brulure', 'brûlure', 'foudre', 'eclair', 'éclair',
      'burn', 'damage', 'destruction', 'detruire', 'détruire', 'tuer', 'kill', 'retrait',
      'sort de controle', 'sorts de controle'],
  },
  {
    effet: 'contresort',
    label: 'contresorts',
    alias: ['contresort', 'contresorts', 'contre sort', 'counter', 'annuler', 'annulation',
      'contrecarrer'],
  },
  { effet: 'gel', label: 'gel', alias: ['gel', 'geler', 'freeze', 'paralysie', 'paralyser', 'immobiliser', 'stun'] },
  { effet: 'exil', label: 'exil', alias: ['exil', 'exiler', 'banish', 'bannir', 'bannissement'] },
  { effet: 'pioche', label: 'pioche', alias: ['pioche', 'piocher', 'draw', 'avantage de cartes', 'card advantage', 'cartes en plus'] },
  { effet: 'soin', label: 'soins', alias: ['soin', 'soins', 'soigner', 'heal', 'guerison', 'guérison', 'regain', 'points de vie', 'curseur de vie'] },
  { effet: 'bouclier', label: 'boucliers', alias: ['bouclier', 'boucliers', 'shield', 'protection', 'proteger', 'protéger'] },
  { effet: 'debuff', label: 'affaiblissements', alias: ['debuff', 'affaiblir', 'malus', 'faiblesse', 'debord', 'débord'] },
  { effet: 'buff', label: 'renforcements', alias: ['buff', 'renforcer', 'renforcement', 'pump', 'ameliorer', 'améliorer', 'doper', 'gonfler'] },
  { effet: 'jetons', label: 'invocations', alias: ['jeton', 'jetons', 'token', 'tokens', 'invoquer', 'invocation', 'essaim', 'armee', 'armée'] },
  { effet: 'recyclage', label: 'recyclage', alias: ['recyclage', 'recycler', 'cimetiere', 'cimetière', 'graveyard'] },
  { effet: 'retour-main', label: 'retours en main', alias: ['retour main', 'bounce', 'renvoyer', 'renvoi'] },
  { effet: 'reanimation', label: 'réanimations', alias: ['reanimation', 'réanimation', 'reanimer', 'réanimer', 'ressusciter', 'resurrection', 'résurrection'] },
];

/**
 * Les familles de cartes, dans les mots du joueur (« avec des armes »).
 * `entraine` dit ce qu'un mot emporte avec lui : ici, « sort » couvre les
 * magies **et** les armes — tout ce qui n'est ni créature ni héros, comme
 * partout dans l'atelier. « Sans sorts » refuse donc les deux.
 */
export const RPG_MOTS_FAMILLES = [
  { famille: 'arme', alias: ['arme', 'armes', 'equipement', 'équipement', 'equipements', 'équipements', 'weapon', 'weapons', 'hache', 'lance', 'sabre', 'takouba', 'khopesh', 'javelot', 'armure', 'jitte', 'grappin', 'epee', 'épée', 'equipé', 'equiper'] },
  { famille: 'magie', alias: ['magie', 'magies', 'sorcellerie', 'sorcelleries', 'rituel', 'rituels', 'enchantement'] },
  { famille: 'magie', alias: ['sort', 'sorts', 'spell', 'spells'], entraine: ['arme'] },
  { famille: 'creature', alias: ['creature', 'creatures', 'créature', 'créatures', 'corps', 'bestiaire', 'troupe'] },
];

/** La courbe demandée : basse (« deck rapide ») ou haute (« gros finishers »). */
export const RPG_MOTS_COURBE = {
  basse: ['courbe basse', 'basse courbe', 'deck rapide', 'petits sorts', 'pas cher', 'bon marche',
    'bon marché', 'cartes pas cheres', 'cartes pas chères', 'early', 'agressif'],
  haute: ['courbe haute', 'haute courbe', 'gros finishers', 'finisher', 'finishers', 'cartes cheres',
    'cartes chères', 'tardif', 'tardive', 'tardives', 'late', 'colosse', 'colosses', 'geants',
    'géants', 'lourd', 'finisseurs'],
};

/** Les raretés demandées (« un deck de légendaires »). */
export const RPG_MOTS_RARETES = {
  mythique: ['mythique', 'mythiques', 'legendaire', 'légendaire', 'legendaires', 'légendaires',
    'mythic', 'legendary', 'heros', 'héros'],
  rare: ['rare', 'rares', 'precieux', 'précieux'],
};

/** L'intensité d'une demande : elle règle le poids du style et la part du thème. */
export const RPG_INTENSITES = {
  faible: ['quelques', 'quelque', 'un peu', 'peu de', 'legerement', 'légèrement', 'leger', 'léger',
    'legere', 'légère', 'une touche', 'un soupcon', 'un soupçon', 'partiel', 'petite dose',
    'un minimum', 'certaines', 'certains'],
  forte: ['beaucoup', 'plein', 'surtout', 'maximum', 'max', 'a fond', 'à fond', 'full', 'enorme',
    'énorme', 'enormement', 'énormément', 'principalement', 'totalement', 'uniquement', 'pur',
    'pure', 'que des', 'que du', 'que de', 'grosse dose', 'massif', 'massive', 'heavy', 'only',
    'un max', 'le plus possible'],
};

/** Les mots invariables : « sans » n'est pas le pluriel de « san ». */
const MOTS_INVARIABLES = new Set(['sans', 'pas', 'tres', 'hors', 'plus', 'que', 'qui', 'dont',
  'aux', 'six', 'dix', 'vers', 'sous', 'dans', 'chez', 'mais', 'tout', 'tous', 'toutes', 'mes',
  'tes', 'ses', 'nos', 'vos', 'avec', 'pour', 'sur', 'entre', 'contre', 'selon', 'rien']);

/** Les marques de refus : « sans sorts », « pas de contrôle », « éviter les armes ». */
const MOTS_NEGATION = new Set(['sans', 'pas', 'aucun', 'aucune', 'zero', 'zéro', 'jamais', 'ni',
  'hors', 'eviter', 'éviter', 'evite', 'évite', 'refuse', 'refuser']);

/** Les mots-outils sautés quand on cherche ce que la négation ou l'intensité porte sur. */
const MOTS_OUTILS = new Set(['de', 'du', 'des', 'd', 'la', 'le', 'les', 'un', 'une', 'en', 'au',
  'aux', 'et', 'ou', 'mal', 'plus', 'trop', 'tres', 'avec', 'qui', 'que', 'dont', 'sur', 'pour']);

/** Les mots qui ne nomment jamais une carte : couleurs, thèmes et mots du jeu. */
const MOTS_NON_DISTINCTIFS = new Set([
  ...RPG_MOTS_COULEURS.flatMap((entree) => entree.alias),
  ...RPG_THEMES_DECK.flatMap((theme) => theme.alias),
  ...RPG_MOTS_STYLE.flatMap((entree) => entree.alias),
  ...RPG_MOTS_EFFETS.flatMap((entree) => entree.alias),
  ...RPG_MOTS_FAMILLES.flatMap((entree) => entree.alias),
  'carte', 'cartes', 'deck', 'jeu', 'tour', 'tours', 'garde', 'gardes', 'dame', 'roi', 'seigneur',
  'maitre', 'pere', 'fils', 'fille', 'grand', 'petit', 'noir', 'blanc', 'rouge', 'or', 'argent',
  'sang', 'nuit', 'jour', 'lune', 'soleil', 'monde', 'terre', 'ciel', 'vent', 'vie', 'mort',
  'temps', 'heure', 'heures', 'neige', 'eau', 'sable', 'braise', 'tenebre', 'desert', 'hiver',
  'deux', 'trois', 'neuf', 'premier', 'dernier', 'grande', 'petite', 'noire', 'nouveau',
].flatMap((alias) => aliasEnMots(alias)));

/** Le libellé d'un effet, pour les puces du récapitulatif. */
export const RPG_LABELS_EFFETS = Object.fromEntries(RPG_MOTS_EFFETS.map((entree) => [entree.effet, entree.label]));

/** Les exemples proposés dans l'invite — des demandes réelles, cliquables. */
export const RPG_DEMANDES_EXEMPLES = [
  {
    id: 'viking-controle',
    texte: 'un deck viking neige ténèbres, avec quelques sorts de contrôle',
    accroche: 'Vikings · Neige + Ténèbres · contrôle léger',
  },
  {
    id: 'desert-aggro',
    texte: 'un deck amazigh du désert, très rapide, avec des armes',
    accroche: 'Amazighs · Sable · aggro armé',
  },
  {
    id: 'seuil-controle',
    texte: 'un deck momies et seuil, beaucoup de retraits et de pioche, sans armes',
    accroche: 'Le Seuil · Ténèbres · contrôle',
  },
  {
    id: 'soleil-rouge',
    texte: 'un deck samouraï braise, courbe basse, surtout des créatures',
    accroche: 'Samouraïs · Braise · aggro',
  },
];

/* ────────────────────────────── la lecture des mots ───────────────────────── */

/** La phrase lue : minuscules, sans accents, « œ » et typographie repliés. */
function normaliserPhrase(texte) {
  return String(texte ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/[’‘`′]/g, "'")
    .toLowerCase();
}

/** Le singulier d'un mot : la lecture ignore les pluriels (« vikings » = « viking »). */
function singulier(mot) {
  if (MOTS_INVARIABLES.has(mot)) return mot;
  return mot.length > 3 && mot.endsWith('s') ? mot.slice(0, -1) : mot;
}

/** La fenêtre contient-elle la séquence de mots, dans l'ordre et sans trou ? */
function contientSequence(fenetre, cible) {
  if (!cible.length || cible.length > fenetre.length) return false;
  for (let i = 0; i + cible.length <= fenetre.length; i += 1) {
    if (cible.every((mot, rang) => fenetre[i + rang] === mot)) return true;
  }
  return false;
}

/** Les mots de la phrase, sans ponctuation : « d'acier » donne « d » et « acier ». */
function motsDe(phrase) {
  return phrase.split(/[^a-z0-9]+/).filter(Boolean).map(singulier);
}

/** Les mots d'un alias, repliés de la même façon. */
function aliasEnMots(alias) {
  return normaliserPhrase(alias).split(/[^a-z0-9]+/).filter(Boolean).map(singulier);
}

/**
 * La position d'un alias dans les mots de la phrase, ou `-1`. La recherche par
 * séquence de mots (plutôt qu'une expression rationnelle sur la phrase brute)
 * donne l'endroit exact de la demande : c'est ce qui permet de lire
 * l'intensité (« **quelques** sorts de contrôle ») et le refus (« **sans**
 * sorts ») autour du mot reconnu.
 */
function positionAlias(alias, mots) {
  const cible = aliasEnMots(alias);
  if (!cible.length) return -1;
  for (let i = 0; i + cible.length <= mots.length; i += 1) {
    if (cible.every((mot, rang) => mots[i + rang] === mot)) return i;
  }
  return -1;
}

/** La première position d'une liste d'alias dans la phrase, ou `-1`. */
function positionDe(aliasListe, mots) {
  let meilleure = -1;
  for (const alias of aliasListe) {
    const position = positionAlias(alias, mots);
    if (position >= 0 && (meilleure < 0 || position < meilleure)) meilleure = position;
  }
  return meilleure;
}

/** La fenêtre de trois mots qui précède une position : intensité et négation y vivent. */
function fenetreAvant(mots, position, taille = 3) {
  return mots.slice(Math.max(0, position - taille), position);
}

/**
 * L'intensité lue autour du mot reconnu : faible (« **quelques** sorts de
 * contrôle »), forte (« **beaucoup** de retraits », « contrôle **à fond** »),
 * ou neutre. Les fenêtres sont courtes — trois mots de part et d'autre — pour
 * que l'intensité reste celle du mot qu'elle touche, pas celle de la phrase.
 */
function intensiteDe(mots, position) {
  const arriere = fenetreAvant(mots, position);
  const avant = mots.slice(position + 1, position + 4);
  // Un marqueur d'un mot se cherche en sautant les mots-outils (« **quelques**
  // sorts de contrôle ») ; un groupe de mots se cherche tel quel (« contrôle
  // **à fond** », « **que des** créatures »).
  const fenetres = [
    arriere.filter((mot) => !MOTS_OUTILS.has(mot)),
    avant.filter((mot) => !MOTS_OUTILS.has(mot)),
  ];
  for (const [gain, marqueurs] of [[0.55, RPG_INTENSITES.faible], [1.4, RPG_INTENSITES.forte]]) {
    for (const marqueur of marqueurs) {
      const cible = aliasEnMots(marqueur);
      if (cible.length === 1) {
        if (fenetres.some((fenetre) => fenetre.includes(cible[0]))) return gain;
      } else if (contientSequence(arriere, cible) || contientSequence(avant, cible)) return gain;
    }
  }
  return 1;
}

/**
 * Le mot reconnu est-il refusé (« sans sorts », « pas de contrôle », « éviter
 * les armes ») ? On remonte la fenêtre en sautant les mots-outils, pour lire la
 * marque de refus la plus proche — sauf dans « pas mal de », qui affirme.
 */
function estRefuse(mots, position) {
  const avant = fenetreAvant(mots, position);
  if (avant.join(' ').includes('pas mal')) return false;
  for (let i = avant.length - 1; i >= 0; i -= 1) {
    const mot = avant[i];
    if (MOTS_OUTILS.has(mot)) continue;
    return MOTS_NEGATION.has(mot);
  }
  return false;
}

/** Une intention vide : ce que rend une demande que rien ne remplit. */
export function intentionVide(texte = '') {
  return {
    texte: String(texte ?? '').trim(),
    couleurs: [],
    themes: [],
    tribus: [],
    cartesTheme: [],
    style: '',
    poidsStyle: 1,
    effets: [],
    familles: [],
    courbe: null,
    raretes: [],
    exclusions: { familles: [], effets: [], themes: [] },
    partTheme: 0.6,
    signature: [],
    motsLus: [],
    resume: '',
  };
}

/* ──────────────────────────── le lexique du catalogue ─────────────────────── */

/**
 * Les cartes de chaque thème déclaré, lues dans le catalogue : une carte
 * appartient à un thème si elle porte l'une de ses **tribus imprimées**, ou si
 * l'un de ses mots de **nom / ligne de type** y figure. Rendu par identifiant
 * de thème, avec les cartes dans l'ordre du catalogue.
 */
export function themesDuCatalogue(catalogue) {
  const { cartes = [] } = catalogue ?? {};
  const jouables = cartes.filter((carte) => carte && carte.kind !== 'terrain');
  const tribusParCarte = new Map(jouables.map((carte) => [carte.id, tribusDeCarte(carte)]));
  const parTheme = new Map();
  for (const theme of RPG_THEMES_DECK) {
    const tribus = new Set(theme.tribus.map(singulier));
    const noms = theme.noms ?? [];
    const retenues = jouables.filter((carte) => {
      const tribusCarte = tribusParCarte.get(carte.id) ?? new Set();
      for (const tribu of tribusCarte) if (tribus.has(singulier(tribu))) return true;
      const fiche = normaliserPhrase(`${carte.name ?? ''} ${carte.typeLine ?? ''}`);
      const motsFiche = motsDe(fiche);
      return noms.some((motif) => positionAlias(motif, motsFiche) >= 0);
    });
    if (retenues.length) parTheme.set(theme.id, retenues);
  }
  return parTheme;
}

/**
 * Les couleurs d'un ensemble de cartes : la plus petite identité (trois au
 * plus) qui couvre la majorité du thème. C'est ce qui permet de répondre à
 * « un deck viking » sans couleur dite — les Vikings du catalogue sont de
 * Neige, donc l'intention porte Neige.
 */
export function couleursDeTheme(cartes, couleursDe = () => [], { max = 3, couverture = 0.6 } = {}) {
  const compte = new Map();
  for (const carte of cartes) {
    for (const couleur of couleursDe(carte) ?? []) compte.set(couleur, (compte.get(couleur) ?? 0) + 1);
  }
  if (!compte.size) return [];
  const parFrequence = [...compte.entries()]
    .sort((a, b) => b[1] - a[1]
      || RPG_ORDRE_COULEURS.indexOf(a[0]) - RPG_ORDRE_COULEURS.indexOf(b[0]))
    .map(([couleur]) => couleur);
  const identite = [];
  for (const couleur of parFrequence) {
    if (identite.length >= max) break;
    identite.push(couleur);
    const couvert = cartes.filter((carte) => (couleursDe(carte) ?? []).every((c) => identite.includes(c))).length;
    if (couvert / cartes.length >= couverture) break;
  }
  return identite.sort((a, b) => RPG_ORDRE_COULEURS.indexOf(a) - RPG_ORDRE_COULEURS.indexOf(b));
}

/**
 * Les cartes **nommées** par le joueur — « avec le Kraken », « Takouba de Tin
 * Hinan en deux exemplaires ». Une carte est reconnue sur son nom entier, son
 * nom sans articles, ou son **mot distinctif** : six lettres au moins, absent
 * du vocabulaire du jeu (couleurs, thèmes, styles) et porté par une seule carte
 * du catalogue. Ainsi « le Kraken » trouve le Kraken, quand « braise » ou
 * « ténèbres » — qui nomment des dizaines de cartes — ne trouvent rien : une
 * signature se reconnaît, elle ne se devine pas.
 */
export function cartesNommees(texte, catalogue) {
  const { cartes = [] } = catalogue ?? {};
  const mots = motsDe(normaliserPhrase(texte));
  if (!mots.length || !cartes.length) return [];
  const jouables = cartes.filter((carte) => carte && carte.kind !== 'terrain');

  // Les mots de chaque nom, puis le nombre de cartes que chaque mot peut
  // nommer : un mot partagé n'est distinctif pour personne.
  const motsParCarte = new Map(jouables.map((carte) => [
    carte.id,
    [...new Set(motsDe(normaliserPhrase(carte.name ?? ''))
      .filter((mot) => mot.length >= 5 && !MOTS_OUTILS.has(mot) && !MOTS_NON_DISTINCTIFS.has(mot)))],
  ]));
  const porteurs = new Map();
  for (const motsNom of motsParCarte.values()) {
    for (const mot of motsNom) porteurs.set(mot, (porteurs.get(mot) ?? 0) + 1);
  }

  const trouvees = [];
  for (const carte of jouables) {
    const nom = normaliserPhrase(carte.name ?? '').trim();
    if (nom.length < 4) continue;
    const sansOutils = motsDe(nom).filter((mot) => !MOTS_OUTILS.has(mot));
    const motifs = new Set([nom, sansOutils.join(' ')]);
    const distinctif = (motsParCarte.get(carte.id) ?? [])
      .filter((mot) => mot.length >= 6 && porteurs.get(mot) === 1)
      .sort((a, b) => b.length - a.length)[0];
    if (distinctif) motifs.add(distinctif);
    for (const motif of motifs) {
      if (!motif || motif.length < 4) continue;
      if (positionAlias(motif, mots) >= 0) {
        trouvees.push({ id: carte.id, motif });
        break;
      }
    }
  }
  // Les motifs les plus longs d'abord : « Takouba de Tin Hinan » passe avant un
  // mot plus court reconnu dans le même nom.
  return trouvees
    .sort((a, b) => b.motif.length - a.motif.length
      || String(a.id).localeCompare(String(b.id)))
    .map((entree) => entree.id);
}

/* ──────────────────────────────── la lecture ──────────────────────────────── */

/**
 * Lit une demande en toutes lettres et rend l'intention de deck.
 *
 * `catalogue` (`{ cartes, couleursDe }`) n'est requis que pour les thèmes et
 * les cartes nommées : sans lui, la lecture des couleurs, du style, des effets
 * et des familles fonctionne quand même (le module reste pur).
 */
export function lireIntention(texte, catalogue = null) {
  const brut = String(texte ?? '').trim();
  const intention = intentionVide(brut);
  if (!brut) return intention;
  const phrase = normaliserPhrase(brut);
  const mots = motsDe(phrase);
  const lus = [];

  // 1. Les couleurs dites.
  for (const entree of RPG_MOTS_COULEURS) {
    const position = positionDe(entree.alias, mots);
    if (position < 0) continue;
    if (estRefuse(mots, position)) continue;
    intention.couleurs.push(entree.couleur);
    lus.push(RPG_LABELS_COULEURS[entree.couleur]);
  }
  intention.couleurs.sort((a, b) => RPG_ORDRE_COULEURS.indexOf(a) - RPG_ORDRE_COULEURS.indexOf(b));

  // 2. Les thèmes, dans l'ordre où le joueur les dit. Trois au plus : au-delà,
  //    le deck n'aurait plus d'identité.
  const themesDuJoueur = [];
  for (const theme of RPG_THEMES_DECK) {
    const position = positionDe(theme.alias, mots);
    if (position < 0) continue;
    if (estRefuse(mots, position)) {
      intention.exclusions.themes.push(theme.id);
      continue;
    }
    themesDuJoueur.push({ theme, position, intensite: intensiteDe(mots, position) });
  }
  themesDuJoueur.sort((a, b) => a.position - b.position);
  for (const { theme, intensite } of themesDuJoueur.slice(0, 3)) {
    intention.themes.push({ id: theme.id, label: theme.label, tribus: [...theme.tribus] });
    for (const tribu of theme.tribus) {
      if (!intention.tribus.includes(tribu)) intention.tribus.push(tribu);
    }
    lus.push(theme.label);
    // « quelques vikings » laisse de la place au reste ; « que des vikings » non.
    if (intensite < 1) intention.partTheme = Math.min(intention.partTheme, 0.4);
    else if (intensite > 1) intention.partTheme = Math.max(intention.partTheme, 0.8);
  }

  // 3. Le style de jeu, et son intensité : « quelques sorts de contrôle » pèse
  //    moins qu'un « deck contrôle à fond ».
  let styleTrouve = null;
  for (const entree of RPG_MOTS_STYLE) {
    const position = positionDe(entree.alias, mots);
    if (position < 0) continue;
    if (estRefuse(mots, position)) continue;
    const intensite = intensiteDe(mots, position);
    if (!styleTrouve || position < styleTrouve.position) styleTrouve = { ...entree, position, intensite };
  }
  if (styleTrouve) {
    intention.style = styleTrouve.style;
    intention.poidsStyle = styleTrouve.intensite;
    lus.push(styleTrouve.style === 'controle' ? 'Contrôle' : styleTrouve.style === 'aggro' ? 'Aggro' : 'Mix');
  }

  // 4. Les effets voulus — ou refusés.
  for (const entree of RPG_MOTS_EFFETS) {
    const position = positionDe(entree.alias, mots);
    if (position < 0) continue;
    if (estRefuse(mots, position)) {
      if (!intention.exclusions.effets.includes(entree.effet)) intention.exclusions.effets.push(entree.effet);
      continue;
    }
    if (!intention.effets.includes(entree.effet)) intention.effets.push(entree.effet);
    lus.push(entree.label);
  }

  // 5. Les familles demandées — « avec des armes », « que des créatures » —
  //    et refusées : « sans sorts » écarte les magies **et** les armes.
  for (const entree of RPG_MOTS_FAMILLES) {
    const position = positionDe(entree.alias, mots);
    if (position < 0) continue;
    const familles = [entree.famille, ...(entree.entraine ?? [])];
    if (estRefuse(mots, position)) {
      for (const famille of familles) {
        if (!intention.exclusions.familles.includes(famille)) intention.exclusions.familles.push(famille);
      }
      lus.push(`sans ${RPG_LABELS_FAMILLES[entree.famille] ?? entree.famille}`);
      continue;
    }
    for (const famille of familles) {
      if (!intention.familles.includes(famille)) intention.familles.push(famille);
    }
    lus.push(RPG_LABELS_FAMILLES[entree.famille] ?? entree.famille);
  }

  // 6. La courbe et les raretés, en indices simples.
  for (const [courbe, alias] of Object.entries(RPG_MOTS_COURBE)) {
    if (positionDe(alias, mots) >= 0) {
      intention.courbe = courbe;
      lus.push(courbe === 'basse' ? 'courbe basse' : 'courbe haute');
      break;
    }
  }
  for (const [rarete, alias] of Object.entries(RPG_MOTS_RARETES)) {
    const position = positionDe(alias, mots);
    if (position >= 0 && !estRefuse(mots, position)) {
      intention.raretes.push(rarete);
      lus.push(rarete === 'mythique' ? 'légendaires' : 'rares');
    }
  }

  // 7. Les cartes nommées : la signature du deck.
  intention.signature = cartesNommees(brut, catalogue);

  intention.motsLus = [...new Set(lus)];
  intention.resume = resumerIntention(intention);
  return intention;
}

/**
 * Le récapitulatif d'une intention, en une ligne — ce que l'assistant affiche
 * sous l'invite : « Neige + Ténèbres · Vikings · Contrôle léger · armes ».
 */
export function resumerIntention(intention) {
  const morceaux = [];
  if (intention?.couleurs?.length) {
    morceaux.push(intention.couleurs.map((couleur) => RPG_LABELS_COULEURS[couleur] ?? couleur).join(' + '));
  }
  if (intention?.themes?.length) morceaux.push(intention.themes.map((theme) => theme.label).join(' + '));
  if (intention?.style) {
    const label = intention.style === 'controle' ? 'Contrôle' : intention.style === 'aggro' ? 'Aggro' : 'Mix';
    const poids = intention.poidsStyle ?? 1;
    morceaux.push(poids < 1 ? `${label} léger` : poids > 1 ? `${label} franc` : label);
  }
  if (intention?.courbe) morceaux.push(intention.courbe === 'basse' ? 'courbe basse' : 'courbe haute');
  if (intention?.effets?.length) {
    const labels = RPG_MOTS_EFFETS.filter((entree) => intention.effets.includes(entree.effet))
      .map((entree) => entree.label);
    if (labels.length) morceaux.push(labels.slice(0, 3).join(', '));
  }
  if (intention?.familles?.length) {
    morceaux.push(intention.familles.map((famille) => RPG_LABELS_FAMILLES[famille] ?? famille).join(' et '));
  }
  if (intention?.exclusions?.familles?.length) {
    morceaux.push(`sans ${intention.exclusions.familles.map((famille) => RPG_LABELS_FAMILLES[famille] ?? famille).join(' ni ')}`);
  }
  if (intention?.signature?.length) morceaux.push(`${intention.signature.length} carte(s) nommée(s)`);
  if (!morceaux.length) return 'rien de reconnu';
  return morceaux.join(' · ');
}

/**
 * L'intention confrontée au catalogue et à la collection : elle **complète** ce
 * que le joueur n'a pas dit (les couleurs déduites du thème), **écarte** ce qui
 * ne peut pas exister (un thème sans carte dans l'identité retenue) et **dit**
 * tout ce qu'elle fait, dans `alertes`. C'est la moitié honnête de l'IA : le
 * joueur lit ce qui sera généré avant de le demander.
 *
 * Rend `{ intention, alertes }`. `alertes` porte un `ton` : `info` (une
 * déduction) ou `alerte` (un manque à combler).
 */
export function verifierIntention(intention, { catalogue, collection = null } = {}) {
  const brut = intention ?? intentionVide('');
  const { cartes = [], couleursDe = () => [] } = catalogue ?? {};
  const cartesParId = new Map(cartes.map((carte) => [carte.id, carte]));
  const possedee = (id) => !Array.isArray(collection) || collection.includes(id);
  const alertes = [];
  const parTheme = catalogue ? themesDuCatalogue(catalogue) : new Map();

  const identiteDe = (liste) => (carte) => {
    const couleurs = couleursDe(carte) ?? [];
    return couleurs.length > 0 && couleurs.every((couleur) => liste.includes(couleur));
  };
  const labelIdentite = (liste) => (liste.length
    ? liste.map((couleur) => RPG_LABELS_COULEURS[couleur] ?? couleur).join(' + ')
    : 'ces couleurs');

  // 1. Les cartes de chaque thème retenu, dans l'identité dite.
  let couleurs = [...(brut.couleurs ?? [])];
  const themesRetenus = [];
  const cartesTheme = (theme) => parTheme.get(theme.id) ?? [];

  if (!couleurs.length && ((brut.themes ?? []).length || (brut.signature ?? []).length)) {
    // Aucune couleur dite : on la déduit. Les cartes **nommées** parlent en
    // premier (« avec le Kraken » appelle l'Eau), le thème suit (« un deck
    // viking » est un deck de Neige, parce que les Vikings du catalogue sont
    // de Neige).
    const nommees = (brut.signature ?? []).map((id) => cartesParId.get(id)).filter(Boolean);
    const duTheme = (brut.themes ?? []).flatMap((theme) => cartesTheme(theme));
    if (nommees.length) {
      couleurs = couleursDeTheme(nommees, couleursDe);
    } else if (duTheme.length) {
      couleurs = couleursDeTheme(duTheme, couleursDe);
    }
    if (couleurs.length) {
      alertes.push({
        ton: 'info',
        texte: `Couleurs déduites ${nommees.length ? 'des cartes nommées' : 'du thème'} : ${labelIdentite(couleurs)}. Vous pouvez en changer à l’étape suivante.`,
      });
    }
  }

  for (const theme of brut.themes ?? []) {
    const toutes = cartesTheme(theme);
    const dansIdentite = couleurs.length ? toutes.filter(identiteDe(couleurs)) : toutes;
    if (!dansIdentite.length) {
      alertes.push({
        ton: 'alerte',
        texte: couleurs.length
          ? `Le thème « ${theme.label} » ne compte aucune carte en ${labelIdentite(couleurs)} : il est ignoré, le deck suivra vos couleurs.`
          : `Le thème « ${theme.label} » n'existe pas encore au catalogue : il est ignoré.`,
      });
      continue;
    }
    const possedees = dansIdentite.filter((carte) => possedee(carte.id));
    if (!possedees.length) {
      alertes.push({
        ton: 'alerte',
        texte: `Vous ne possédez encore aucune carte « ${theme.label} » en ${labelIdentite(couleurs)} : le deck s'appuiera sur vos autres cartes de ces couleurs.`,
      });
    }
    themesRetenus.push({
      id: theme.id,
      label: theme.label,
      tribus: [...theme.tribus],
      cartes: dansIdentite.length,
      possedees: possedees.length,
      ids: dansIdentite.map((carte) => carte.id),
    });
  }

  // 2. Les cartes nommées hors identité : elles restent la signature du joueur,
  //    mais il faut le dire — le deck sortira alors de ses couleurs.
  const signature = (brut.signature ?? []).filter((id) => cartesParId.has(id));
  if (couleurs.length) {
    const horsIdentite = signature
      .map((id) => cartesParId.get(id))
      .filter((carte) => carte && !identiteDe(couleurs)(carte));
    if (horsIdentite.length) {
      alertes.push({
        ton: 'alerte',
        texte: `Hors de ${labelIdentite(couleurs)} : ${horsIdentite.map((carte) => `« ${carte.name} »`).join(', ')}. Les cartes nommées restent posées, mais le deck débordera ses couleurs.`,
      });
    }
    const nonPossedees = signature.filter((id) => !possedee(id));
    if (nonPossedees.length) {
      alertes.push({
        ton: 'alerte',
        texte: `Hors de votre collection : ${nonPossedees.map((id) => `« ${cartesParId.get(id)?.name ?? id} »`).join(', ')}. Le moteur ne pose que ce que vous possédez.`,
      });
    }
  }

  // 3. Rien du tout n'a été lu : on le dit plutôt que de générer au hasard.
  const rienLu = !couleurs.length && !themesRetenus.length && !signature.length
    && !brut.style && !(brut.effets ?? []).length && !(brut.familles ?? []).length;
  if (rienLu) {
    alertes.push({
      ton: 'info',
      texte: 'Aucun mot du jeu reconnu dans cette demande : choisissez vos couleurs à l’étape suivante, ou essayez un exemple.',
    });
  }

  const affine = {
    ...brut,
    couleurs,
    themes: themesRetenus,
    tribus: themesRetenus.flatMap((theme) => theme.tribus),
    // Les cartes du thème dans l'identité retenue : le moteur les reconnaît
    // nommément, au-delà des seules tribus imprimées — la Hache de la banquise
    // est du goût viking sans porter le mot « viking ».
    cartesTheme: [...new Set(themesRetenus.flatMap((theme) => theme.ids))],
    signature,
    resume: '',
  };
  affine.resume = resumerIntention(affine);
  return { intention: affine, alertes };
}
