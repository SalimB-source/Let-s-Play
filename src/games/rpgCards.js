/**
 * Le concept cartes — « Le Sablier de Bab El ».
 *
 * Le combat est un jeu de cartes posé sur la table, façon Magic / Yu-Gi-Oh :
 *
 *  ┌ ANATOMIE D'UNE CARTE ────────────────────────────────────────────────┐
 *  │  Titre            nom + glyphe d'élément                            │
 *  │  Coût             pastilles de SABLE (le mana de Bab El)            │
 *  │  Illustration     portrait peint (créature) ou motif d'élément      │
 *  │  Ligne de type    « Créature — Sondeur · Sable », « Pouvoir · Eau » │
 *  │  Texte            règle de la carte (+ saveur en italique)          │
 *  │  Pied             puissance / PV, rareté                            │
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 *  Trois familles de cartes :
 *  - **CRÉATURE** : les personnages. Au départ, UNE SEULE attaque de base
 *    (leur carte de base, gratuite, une fois par tour). Ils gagnent des
 *    capacités en avançant : ce sont les pouvoirs qui entrent dans la
 *    collection de l'équipe.
 *  - **POUVOIR** : les sorts à collectionner. Payés en sable de « notre sol »,
 *    joués depuis la main, puis au cimetière. Certains sont des *éphemères*
 *    (instantanés) : jouables pendant le tour ennemi, en réponse à une carte
 *    annoncée — de l'information, jamais des réflexes.
 *  - **CARTES ENNEMIES** : chaque ennemi a son petit paquet ; son intention
 *    est la carte qu'il posera à son tour, annoncée face visible.
 *
 *  Le sable est le mana : il tombe de moitié des PV perdus, se vole avec
 *  Souffle, se convertit en soins avec Récolte, et « Sonder le sol » (action
 *  de base gratuite, une fois par tour) en ajoute. Une carte sans sable ne
 *  part pas.
 *
 *  Collection : on commence avec un petit classeur ; après chaque vague, un
 *  **draft** propose trois cartes, on en choisit une. C'est la progression.
 */

export const CARD_RARITIES = {
  commune: { label: 'Commune', color: '#c9c2ae' },
  rare: { label: 'Rare', color: '#7cc7ee' },
  mythique: { label: 'Mythique', color: '#ffb347' },
};

export const CARD_KIND_LABELS = {
  physique: 'Attaque',
  magie: 'Sort',
  soin: 'Soin',
  statut: 'Utilité',
};

/** Actions de base, gratuites, de toute créature : non collectionnables. */
export const RPG_BASIC_CARDS = [
  {
    id: 'sonder-le-sol',
    name: 'Sonder le sol',
    cost: 0,
    effect: 'sonder',
    target: 'soi',
    text: 'Une fois par tour : +20 sable sur notre sol. Le mana de Bab El.',
  },
];

/**
 * Le catalogue des pouvoirs collectionnables. Les attaques de départ des
 * compagnons sont leur carte de base (`basic` sur la fiche du personnage) ;
 * tout le reste se gagne en draftant.
 */
export const RPG_POWER_CARDS = [
  // ── Salem ─────────────────────────────────────────────────────────────
  {
    id: 'crochet',
    name: 'Crochet de palier',
    element: 'sable',
    kind: 'physique',
    cost: 10,
    power: 72,
    push: 1,
    target: 'ennemi',
    rarity: 'commune',
    text: 'Inflige 72 et tire vers le bas : l’ennemi descend d’un étage. Du 3e au 1er, c’est une Chute (×1,4).',
    flavor: 'On ne monte pas un étage condamné sans redescendre.',
  },
  {
    id: 'effondrement',
    name: 'Effondrement',
    element: 'sable',
    kind: 'physique',
    cost: 40,
    power: 230,
    target: 'tous-ennemis',
    crystallizePower: 460,
    rarity: 'rare',
    text: 'Le palier cède : touche TOUS les ennemis.',
    flavor: 'Bab El compte neuf étages. Le sol en compte un de plus.',
  },
  {
    id: 'le-dernier-etage',
    name: 'Le Dernier Étage',
    element: 'sable',
    kind: 'physique',
    cost: 40,
    power: 320,
    felure: 20,
    target: 'ennemi',
    requiresName: 3,
    rarity: 'mythique',
    text: '320 dégâts et +20 Fêlure. Exige le Nom complet (3 segments).',
    flavor: 'Il frappe comme on ferme une porte sur un étage condamné.',
  },
  // ── Yamina ────────────────────────────────────────────────────────────
  {
    id: 'retard',
    name: 'Retard',
    element: 'verre',
    kind: 'statut',
    cost: 10,
    delay: true,
    target: 'ennemi',
    rarity: 'commune',
    text: 'La carte annoncée par cet ennemi attendra un round de plus.',
    flavor: 'Un rendez-vous décalé, c’est une vie épargnée.',
  },
  {
    id: 'avance',
    name: 'Avance',
    element: 'verre',
    kind: 'statut',
    cost: 10,
    draw: 1,
    target: 'soi',
    rarity: 'commune',
    text: 'Pioche une carte.',
    flavor: 'Elle remonte le mécanisme d’un cran.',
  },
  {
    id: 'heure-pleine',
    name: 'Heure pleine',
    element: 'verre',
    kind: 'magie',
    cost: 40,
    power: 300,
    draw: 1,
    target: 'ennemi',
    requiresName: 3,
    rarity: 'mythique',
    text: '300 dégâts et pioche une carte. Exige le Nom complet.',
    flavor: 'Elle donne l’heure exacte. Ça fait très mal.',
  },
  // ── Boualem ───────────────────────────────────────────────────────────
  {
    id: 'nappe',
    name: 'Nappe',
    element: 'eau',
    kind: 'statut',
    cost: 0,
    ground: 40,
    target: 'soi',
    rarity: 'commune',
    text: '+40 sable sur notre sol, à dépenser en cartes.',
    flavor: 'Il fait remonter la nappe d’un coup de talon.',
  },
  {
    id: 'vague',
    name: 'Vague',
    element: 'eau',
    kind: 'magie',
    cost: 25,
    power: 175,
    interrupt: true,
    target: 'ennemi',
    crystallizePower: 350,
    rarity: 'rare',
    text: '175 dégâts. Interrompt une incantation si l’élément correspond.',
    flavor: 'Un mur d’eau tiède qui sort du sol.',
  },
  {
    id: 'deluge',
    name: 'Déluge',
    element: 'eau',
    kind: 'magie',
    cost: 40,
    power: 265,
    target: 'tous-ennemis',
    requiresName: 3,
    rarity: 'mythique',
    text: '265 dégâts à TOUS les ennemis. Exige le Nom complet.',
    flavor: 'Il ouvre les vannes. Tout le monde est touché.',
  },
  {
    id: 'recolte',
    name: 'Récolte',
    element: 'eau',
    kind: 'soin',
    cost: 0,
    effect: 'recolte',
    target: 'allie',
    rarity: 'commune',
    text: 'Convertit jusqu’à 40 sable de notre sol en soins (×0,8 PV).',
    flavor: 'Le sable rend ce qu’on lui prête, en eau.',
  },
  // ── Fêriel ────────────────────────────────────────────────────────────
  {
    id: 'bulle',
    name: 'Bulle',
    element: 'verre',
    kind: 'statut',
    cost: 20,
    effect: 'barrage',
    target: 'allie',
    instant: true,
    rarity: 'commune',
    text: 'Éphémère : un barrage de verre sur un compagnon, il absorbe avant les PV.',
    flavor: 'Le verre cède, mais pas tout de suite.',
  },
  {
    id: 'four',
    name: 'Four',
    element: 'braise',
    kind: 'magie',
    cost: 25,
    power: 205,
    target: 'ennemi',
    crystallizePower: 410,
    rarity: 'rare',
    text: '205 dégâts de braise.',
    flavor: 'Elle ouvre son four de souffleur. Ça ne pardonne pas.',
  },
  {
    id: 'verre-fondu',
    name: 'Verre fondu',
    element: 'braise',
    kind: 'magie',
    cost: 40,
    power: 330,
    target: 'ennemi',
    requiresName: 3,
    rarity: 'mythique',
    text: '330 dégâts, le plus gros monocible de l’équipe. Exige le Nom complet.',
    flavor: 'Une coulée à mille degrés.',
  },
  // ── Tarek ─────────────────────────────────────────────────────────────
  {
    id: 'rempart',
    name: 'Rempart',
    element: 'sable',
    kind: 'statut',
    cost: 20,
    effect: 'barrage',
    target: 'soi',
    instant: true,
    rarity: 'commune',
    text: 'Éphémère : un barrage de verre sur celui qui joue la carte.',
    flavor: 'C’est le meilleur endroit pour le poser.',
  },
  {
    id: 'charge',
    name: 'Charge',
    element: 'sable',
    kind: 'physique',
    cost: 25,
    power: 190,
    push: 1,
    target: 'ennemi',
    rarity: 'rare',
    text: '190 dégâts et pousse : l’ennemi descend d’un étage.',
    flavor: 'Il pousse. Toujours.',
  },
  // ── Réponses ──────────────────────────────────────────────────────────
  {
    id: 'garde',
    name: 'Garde',
    element: 'sable',
    kind: 'statut',
    cost: 0,
    effect: 'garde',
    target: 'soi',
    instant: true,
    rarity: 'commune',
    text: 'Éphémère : −60 % sur le prochain coup reçu. Si le coup était annoncé sur vous, +1 Verre.',
    flavor: 'On ne pare pas à Bab El. On se tient simplement ailleurs.',
  },
  {
    id: 'souffle',
    name: 'Souffle',
    element: 'souffle',
    kind: 'statut',
    cost: 0,
    effect: 'souffle',
    target: 'soi',
    rarity: 'commune',
    text: 'Retire jusqu’à 40 sable du sol ennemi, en récupère la moitié.',
    flavor: 'Le vent rend visite aux deux côtés de la table.',
  },
  {
    id: 'reposition',
    name: 'Reposition',
    element: 'sable',
    kind: 'statut',
    cost: 10,
    effect: 'reposition',
    target: 'allie',
    rarity: 'commune',
    text: 'Fait monter un compagnon d’un étage (frapper de haut : +15 %/étage).',
    flavor: 'Les escaliers de Bab El sont une arme.',
  },
];

/** Le classeur de départ de la démo : de quoi tenir la première vague. */
export const RPG_STARTING_COLLECTION = ['garde', 'bulle', 'nappe', 'vague', 'recolte'];

/** Cartes de base des compagnons : leur seule attaque au début. */
export const RPG_BASIC_ATTACKS = {
  salem: {
    id: 'sonde',
    name: 'Sonde',
    element: 'sable',
    kind: 'physique',
    power: 112,
    felure: 8,
    target: 'ennemi',
    basic: true,
    text: 'L’attaque de base de Salem : un coup de perche franc, +8 Fêlure.',
  },
  yamina: {
    id: 'aiguille',
    name: 'Aiguille',
    element: 'verre',
    kind: 'magie',
    power: 190,
    interrupt: true,
    target: 'ennemi',
    basic: true,
    text: 'L’attaque de base de Yamina : interrompt une incantation si l’élément correspond.',
  },
  boualem: {
    id: 'puisage',
    name: 'Puisage',
    element: 'eau',
    kind: 'soin',
    power: 95,
    target: 'allie',
    basic: true,
    text: 'La carte de base de Boualem : soigne un compagnon.',
  },
  feriel: {
    id: 'eclat-de-verre',
    name: 'Éclat de verre',
    element: 'verre',
    kind: 'physique',
    power: 100,
    interrupt: true,
    target: 'ennemi',
    basic: true,
    text: 'L’attaque de base de Fêriel : un shard lancé à la main.',
  },
  tarek: {
    id: 'palette',
    name: 'Palette',
    element: 'sable',
    kind: 'physique',
    power: 125,
    felure: 12,
    target: 'ennemi',
    basic: true,
    text: 'L’attaque de base de Tarek : il frappe avec ce qu’il porte, +12 Fêlure.',
  },
};

const CATALOG = new Map(
  [...RPG_POWER_CARDS, ...RPG_BASIC_CARDS, ...Object.values(RPG_BASIC_ATTACKS)].map((card) => [card.id, card]),
);

/** Retrouve une carte du catalogue par son id. */
export function cardById(id) {
  return CATALOG.get(id) ?? null;
}

/** Le sable à payer pour poser une carte. */
export function cardCost(card) {
  return Number(card?.cost) || 0;
}

/**
 * Draft : trois cartes hors collection, biaisées vers les éléments de
 * l'équipe, dont on en choisira une. Même graine, même offre.
 */
export function rpgDraftOffer(rng, collection = []) {
  const pool = RPG_POWER_CARDS.filter((card) => !collection.includes(card.id));
  const offer = [];
  while (offer.length < 3 && pool.length) {
    const index = Math.floor(rng() * pool.length);
    offer.push(pool.splice(index, 1)[0].id);
  }
  return offer;
}
