/**
 * Catalogue de cartes de l’univers « Le Sablier du temps ».
 *
 * Le duel utilise un jeu original de type TCG : les terrains génèrent du mana
 * coloré, les créatures et héros combattent, et les rituels/éphémères résolvent
 * leurs effets avant de rejoindre le cimetière. Les fiches portent coût,
 * élément, rareté, ligne de type, texte de règle et illustration locale.
 *
 * Les anciennes cartes de pouvoir et de base restent disponibles au classeur
 * et au draft du prototype RPG ; le duel s’appuie sur les catalogues terrains,
 * créatures, héros et magies déclarés plus bas.
 */

export const CARD_RARITIES = {
  commune: { label: 'Commune', color: '#f1f3f5' },
  inhabituelle: { label: 'Inhabituelle', color: '#4d9aff' },
  rare: { label: 'Rare', color: '#e1b33f' },
  epique: { label: 'Épique', color: '#8fe3ff' },
  mythique: { label: 'Mythique', color: '#a875ed' },
};

/** Résout aussi l'alias anglais courant sans modifier les raretés du catalogue. */
export function cardRarityInfo(carte) {
  const requestedKey = carte?.rarity === 'uncommon' ? 'inhabituelle' : carte?.rarity;
  const key = Object.hasOwn(CARD_RARITIES, requestedKey) ? requestedKey : 'commune';
  return { key, ...CARD_RARITIES[key] };
}

/**
 * Les quatre éléments du duel, dans l'ordre canonique des couleurs : c'est
 * cet ordre qui nomme les combinaisons bicolores et tricolores, quel que soit
 * l'ordre dans lequel une carte déclare ses couleurs. Braise, Eau et Sable
 * composent Bab El ; la Neige arrive avec le Serment des Neuf Hivers.
 */
export const RPG_ELEMENTS = ['braise', 'eau', 'sable', 'neige'];

/**
 * Couleur du cadre : elle suit l'ÉLÉMENT de la carte, jamais sa rareté —
 * sauf pour les mythiques, dont le cadre doré prime (voir MYTHIC_FRAME_COLOR).
 *
 * Chaque combinaison a son identité, y compris celles qui n'existent pas
 * encore dans le catalogue : le jour où une carte Neige + Sable ou Neige +
 * Braise est créée, son cadre brillant l'attend.
 */
export const CARD_FRAME_COLORS = {
  braise: { label: 'Braise', color: '#e0412a' },
  eau: { label: 'Eau', color: '#3f9fe8' },
  sable: { label: 'Sable', color: '#f7f3e6' },
  neige: { label: 'Neige', color: '#a9e0f5' },
  'hybride-braise-eau': { label: 'Braise + Eau', color: '#a86ad6' },
  'hybride-braise-sable': { label: 'Braise + Sable', color: '#e2521f' },
  'hybride-braise-neige': { label: 'Braise + Neige', color: '#c98a86' },
  'hybride-eau-sable': { label: 'Eau + Sable', color: '#7fd4c8' },
  'hybride-eau-neige': { label: 'Eau + Neige', color: '#8fd4ef' },
  'hybride-sable-neige': { label: 'Sable + Neige', color: '#dfeef0' },
  'hybride-braise-eau-sable': { label: 'Braise + Eau + Sable', color: '#d8b45a' },
  'hybride-braise-eau-neige': { label: 'Braise + Eau + Neige', color: '#c9a6e0' },
  'hybride-braise-sable-neige': { label: 'Braise + Sable + Neige', color: '#e8b98a' },
  'hybride-eau-sable-neige': { label: 'Eau + Sable + Neige', color: '#a8e2dc' },
  'hybride-braise-eau-sable-neige': { label: 'Braise + Eau + Sable + Neige', color: '#e6d3a4' },
};

/** Clé de repli : les quatre couleurs, si une combinaison inconnue apparaissait. */
const CARD_FRAME_FALLBACK_KEY = 'hybride-braise-eau-sable-neige';

/** Ordre canonique des couleurs : la clé d'une hybride ne dépend pas de l'ordre déclaré. */
const CARD_FRAME_COLOR_ORDER = RPG_ELEMENTS;

/** Cadre doré des cartes mythiques, quelle que soit leur couleur. */
export const MYTHIC_FRAME_COLOR = '#e8b745';

/** Clé et couleur de cadre d'une carte : élément seul, ou combinaison bicolore. */
export function cardFrameInfo(carte) {
  const colors = cardColors(carte).slice().sort(
    (a, b) => CARD_FRAME_COLOR_ORDER.indexOf(a) - CARD_FRAME_COLOR_ORDER.indexOf(b),
  );
  const key = colors.length > 1
    ? `hybride-${colors.join('-')}`
    : (Object.hasOwn(CARD_FRAME_COLORS, colors[0]) ? colors[0] : 'sable');
  const known = Object.hasOwn(CARD_FRAME_COLORS, key) ? key : CARD_FRAME_FALLBACK_KEY;
  return { key: known, ...CARD_FRAME_COLORS[known] };
}

/** Toute carte mythique porte le cadre doré. */
export function cardHasMythicFrame(carte) {
  return cardRarityInfo(carte).key === 'mythique';
}

/** Un cadre brillant est un dégradé balayé d'un reflet : hybrides et mythiques. */
export function cardHasShinyFrame(carte) {
  return cardFrameInfo(carte).key.startsWith('hybride-') || cardHasMythicFrame(carte);
}

/** Couleur de cadre réellement peinte : l'or mythique prime sur l'élément. */
export function cardFrameColor(carte) {
  return cardHasMythicFrame(carte) ? MYTHIC_FRAME_COLOR : cardFrameInfo(carte).color;
}

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
    element: 'eau',
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
    element: 'eau',
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
    element: 'eau',
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
    element: 'eau',
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
    element: 'sable',
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
/**
 * Les créatures du duel — façon Magic : un coût en sable, ⚔ l'attaque,
 * 🛡 la défense, et parfois une capacité À L'ARRIVÉE ou QUAND ELLES
 * MEURENT. Set jouable : créatures, héros, terrains et sorts composent les decks.
 */
export const RPG_CREATURE_CARDS = [
  {
    id: 'fennec-des-decombres',
    name: 'Fennec des décombres',
    element: 'sable',
    cost: 2,
    atk: 3,
    def: 1,
    rarity: 'inhabituelle',
    typeLine: 'Créature — Fennec',
    rapidite: true,
    esquive: 1,
    text: 'Rapidité — Cette créature peut attaquer le tour où elle arrive. Esquive 1 — Réduit de 1 les dégâts reçus de chaque attaque ou magie (minimum 0).',
    flavor: 'Les éclats sifflent ; le Fennec a déjà choisi son prochain pas.',
  },
  {
    id: 'chien-du-guet',
    name: 'Chien du guet',
    element: 'sable',
    cost: 2,
    atk: 2,
    def: 2,
    rarity: 'commune',
    typeLine: 'Créature — Chien',
    text: '—',
    flavor: 'Il n’aboie pas. Il compte.',
  },
  {
    id: 'porteuse-de-cruches',
    name: 'Porteuse de cruches',
    element: 'eau',
    cost: 2,
    atk: 1,
    def: 3,
    rarity: 'commune',
    typeLine: 'Créature — Habitante',
    arrivee: { type: 'soin', amount: 3 },
    text: 'Quand la Porteuse arrive : vous récupérez 3 points de vie.',
    flavor: 'Deux cruches pleines, une pour la soif, une pour la plaie.',
  },
  {
    id: 'guetteur-du-beffroi',
    name: 'Guetteur du beffroi',
    element: 'sable',
    cost: 3,
    atk: 2,
    def: 2,
    rarity: 'commune',
    typeLine: 'Créature — Vigie',
    arrivee: { type: 'pioche', amount: 1 },
    text: 'Quand le Guetteur arrive : piochez une carte.',
    flavor: 'D’en haut, il voit la vague avant qu’elle ne se nomme.',
  },
  {
    id: 'vipere-de-verre',
    name: 'Vipère de verre',
    element: 'eau',
    cost: 3,
    atk: 3,
    def: 1,
    rarity: 'rare',
    typeLine: 'Créature — Serpent',
    arrivee: { type: 'degats', amount: 2, cible: 'creature' },
    text: 'Quand la Vipère arrive : elle mord une créature adverse (2 dégâts).',
    flavor: 'Elle se brise, mais d’abord elle tranche.',
  },
  {
    id: 'dune-marchante',
    name: 'Dune marchante',
    element: 'sable',
    cost: 4,
    atk: 2,
    def: 5,
    rarity: 'commune',
    typeLine: 'Créature — Élémental',
    text: '—',
    flavor: 'Le vent la déplace. Elle revient toujours devant la porte.',
  },
  {
    id: 'scribe-de-la-liste',
    name: 'Scribe de la Liste',
    element: 'sable',
    cost: 3,
    atk: 2,
    def: 2,
    rarity: 'rare',
    typeLine: 'Créature — Scribe',
    destruction: { type: 'pioche', amount: 2 },
    text: 'Quand le Scribe meurt : piochez deux cartes.',
    flavor: 'Sa mort est déjà notée. En double exemplaire.',
  },
  {
    id: 'sonneur-fele',
    name: 'Sonneur fêlé',
    element: 'eau',
    cost: 4,
    atk: 2,
    def: 3,
    rarity: 'rare',
    typeLine: 'Créature — Sonneur',
    destruction: { type: 'degats', amount: 2, cible: 'toutes-creatures' },
    text: 'Quand le Sonneur meurt : son dernier tocsin blesse toutes les créatures adverses (2).',
    flavor: 'Fêlé, il sonne encore. Surtout en tombant.',
  },
  {
    id: 'colosse-de-sel',
    name: 'Colosse de sel',
    element: 'eau',
    cost: 6,
    atk: 5,
    def: 5,
    rarity: 'rare',
    typeLine: 'Créature — Géant',
    arrivee: { type: 'buff', atk: 1, def: 1 },
    text: 'Quand le Colosse arrive : vos autres créatures gagnent +1/+1.',
    flavor: 'La mer est partie. Son sel est resté debout.',
  },
  {
    id: 'djinn-du-souk',
    name: 'Djinn du souk',
    element: 'braise',
    cost: 5,
    atk: 3,
    def: 3,
    rarity: 'mythique',
    typeLine: 'Créature — Djinn',
    art: 'djinn-du-souk',
    arrivee: { type: 'detruire-terrain-aleatoire' },
    text: 'Quand le Djinn arrive : il détruit un terrain adverse au hasard.',
    flavor: 'Il vendait des épices. Il a gardé le feu.',
  },
  {
    id: 'veilleuse-des-citernes',
    name: 'Veilleuse des citernes',
    element: 'eau',
    cost: 3,
    atk: 1,
    def: 4,
    rarity: 'commune',
    typeLine: 'Créature — Gardienne',
    art: 'veilleuse-des-citernes',
    arrivee: { type: 'bouclier', amount: 2, cible: 'creature-amie' },
    text: 'Quand la Veilleuse arrive : elle reçoit un bouclier de 2.',
    flavor: 'Elle garde les réserves, et la dernière porte.',
  },
  {
    id: 'faiseur-de-passage',
    name: 'Faiseur de passage',
    element: 'sable',
    cost: 2,
    atk: 2,
    def: 2,
    rarity: 'commune',
    typeLine: 'Créature — Éclaireur',
    art: 'faiseur-de-passage',
    arrivee: { type: 'pioche', amount: 1 },
    text: 'Quand le Faiseur arrive : piochez une carte.',
    flavor: 'Il trouve une porte là où les autres voient un mur.',
  },
  // ── Veilleurs du Désert : personnages originaux inspirés des peuples amazighs d’Algérie ──
  {
    id: 'tislit-des-aures',
    name: 'Tislit, éclaireuse des Aurès',
    element: 'sable',
    cost: 1,
    atk: 1,
    def: 2,
    rarity: 'commune',
    typeLine: 'Créature — Amazighe chaouie',
    art: 'tislit-des-aures',
    arrivee: { type: 'pioche', amount: 1 },
    text: 'Quand Tislit arrive : piochez une carte.',
    flavor: 'Elle connaît chaque sentier entre les cèdres et les crêtes.',
  },
  {
    id: 'tiziri-du-djurdjura',
    name: 'Tiziri, voix du Djurdjura',
    element: 'sable',
    cost: 2,
    atk: 2,
    def: 2,
    rarity: 'commune',
    typeLine: 'Créature — Amazighe kabyle',
    art: 'tiziri-du-djurdjura',
    protection: { contre: 'eau', tours: 2 },
    arrivee: { type: 'buff', atk: 1, def: 0 },
    text: 'À son arrivée, Tiziri est protégée contre l’Eau pendant ce tour et le prochain tour adverse. Vos autres créatures gagnent +1 ATQ.',
    flavor: 'Son chant rassemble les villages avant la tempête.',
  },
  {
    id: 'amani-des-ksour',
    name: 'Amani, gardienne des ksour',
    element: 'sable',
    cost: 3,
    atk: 2,
    def: 4,
    rarity: 'rare',
    typeLine: 'Créature — Amazighe mozabite',
    art: 'amani-des-ksour',
    arrivee: { type: 'bouclier', amount: 2, cible: 'creature-amie' },
    text: 'Quand Amani arrive : elle reçoit un bouclier de 2.',
    flavor: 'Les portes de pierre tiennent parce que quelqu’un veille.',
  },
  {
    id: 'amayas-du-hoggar',
    name: 'Amayas, guide du Hoggar',
    element: 'sable',
    cost: 3,
    atk: 3,
    def: 2,
    rarity: 'commune',
    typeLine: 'Créature — Guide touareg',
    art: 'amayas-du-hoggar',
    protection: { contre: 'braise', tours: 2 },
    destruction: { type: 'pioche', amount: 1 },
    text: 'À son arrivée, Amayas est protégé contre la Braise pendant ce tour et le prochain tour adverse. Quand il meurt : piochez une carte.',
    flavor: 'Même perdu, il laisse une piste pour ceux qui suivent.',
  },
  // ── Djinns et sorcellerie du Brasier ──────────────────────────────────
  {
    id: 'ghul-des-cendres',
    name: 'Ghul des cendres',
    element: 'braise',
    cost: 2,
    atk: 2,
    def: 1,
    rarity: 'commune',
    typeLine: 'Créature — Ghul',
    art: 'ghul-des-cendres',
    destruction: { type: 'degats', amount: 1, cible: 'toutes-creatures' },
    text: 'Quand le Ghul est détruit : 1 dégât à toutes les créatures adverses.',
    flavor: 'Sous la cendre, quelque chose attend la nuit.',
  },
  {
    id: 'sahir-des-braises',
    name: 'Sahir des braises',
    element: 'braise',
    cost: 3,
    atk: 2,
    def: 3,
    rarity: 'mythique',
    typeLine: 'Créature — Sahir',
    art: 'sahir-des-braises',
    arrivee: { type: 'pioche', amount: 1 },
    combat: { type: 'degats-creature-combattue', amount: 2 },
    text: 'Quand le Sahir arrive : piochez une carte. Quand il attaque ou bloque : avant les blessures de combat et leur répartition, il inflige 2 dégâts à la créature qui le bloque ou qu’il bloque.',
    flavor: 'Il trace un cercle dans la poussière et écoute le vent répondre.'
  },
  {
    id: 'anqa-des-braises',
    name: 'Anqa',
    element: 'braise',
    cost: 4,
    atk: 4,
    def: 4,
    rarity: 'mythique',
    typeLine: 'Créature légendaire — Oiseau de feu',
    art: 'anqa-des-braises',
    envol: true,
    destruction: { type: 'retour-apres-tours', tours: 2 },
    text: 'Envol — Ne peut être bloquée que par une créature avec Envol. Quand Anqa est détruite : elle revient en jeu après deux tours.',
    flavor: 'Même la cendre sait où se cachent les braises.',
  },
  {
    id: 'ifrit-des-ergs',
    name: 'Ifrit des ergs',
    element: 'braise',
    cost: 5,
    atk: 5,
    def: 4,
    rarity: 'mythique',
    typeLine: 'Créature — Ifrit',
    art: 'ifrit-des-ergs',
    arrivee: { type: 'degats', amount: 2, cible: 'sorcier' },
    text: 'Quand l’Ifrit arrive : 2 dégâts au sorcier adverse.',
    flavor: 'Les dunes rougissent avant même qu’il apparaisse.',
  },
  {
    id: 'braisier-du-souk',
    name: 'Braisier du souk',
    element: 'braise',
    cost: 3,
    atk: 3,
    def: 2,
    rarity: 'rare',
    typeLine: 'Créature — Souffleur',
    art: 'braisier-du-souk',
    arrivee: { type: 'degats', amount: 1, cible: 'toutes-creatures' },
    text: 'Quand le Braisier arrive : 1 dégât à toutes les créatures adverses.',
    flavor: 'Une seule braise, et le marché se vide.',
  },
  {
    id: 'cavalier-amazigh-du-desert',
    name: 'Cavalier amazigh du Désert',
    element: 'sable',
    cost: 5,
    atk: 4,
    def: 4,
    rarity: 'rare',
    typeLine: 'Créature — Guerrier amazigh',
    art: 'cavalier-amazigh-du-desert',
    arrivee: { type: 'combat', cible: 'creature' },
    text: 'Quand le Cavalier arrive : il se bat contre une créature adverse ciblée. Chacun inflige à l’autre un nombre de dégâts égal à son attaque.',
    flavor: 'Sa monture blanche fend la poussière ; le sabre ouvre la route au milieu du tumulte.',
  },
  {
    id: 'veilleur-du-couchant',
    name: 'Veilleur du couchant',
    element: 'sable',
    colors: ['sable', 'braise'],
    colorCost: { sable: 1, braise: 1 },
    cost: 3,
    atk: 2,
    def: 4,
    rarity: 'inhabituelle',
    typeLine: 'Créature — Sentinelle des mesas',
    arrivee: { type: 'bouclier', amount: 1, cible: 'creature-amie' },
    text: 'À son arrivée, le Veilleur reçoit un bouclier de 1.',
    flavor: 'Il garde le passage jusqu’à la première lumière.',
  },
  // ── Serment des Neuf Hivers : la Neige, ses valkyries, ses guerriers et ses drakkars ──
  // Récits du Nord : les figures du panthéon nordique n'y sont jamais nommées
  // « dieux » — elles portent des titres (le Père des corbeaux, le Maître du
  // marteau), comme on les appelait pour ne pas les appeler.
  {
    id: 'guerrier-au-bouclier-rond',
    name: 'Guerrier au bouclier rond',
    element: 'neige',
    cost: 2,
    atk: 1,
    def: 3,
    rarity: 'commune',
    typeLine: 'Créature — Guerrier viking',
    art: 'guerrier-au-bouclier-rond',
    furie: 1,
    arrivee: { type: 'bouclier', amount: 1, cible: 'creature-amie' },
    text: 'Furie 1 — Chaque fois qu’il est blessé et survit, le Guerrier gagne +1/+1. Quand il arrive : il reçoit un bouclier de 1.',
    flavor: 'Il ne recule pas : il glisse — et le coup reçu le durcit.',
  },
  {
    id: 'loup-des-neiges',
    name: 'Loup des neiges',
    element: 'neige',
    cost: 3,
    atk: 3,
    def: 2,
    rarity: 'commune',
    typeLine: 'Créature — Loup',
    art: 'loup-des-neiges',
    esquive: 1,
    text: 'Esquive 1 — Réduit de 1 les dégâts reçus de chaque attaque ou magie (minimum 0).',
    flavor: 'La meute court sur la croûte gelée sans la briser.',
  },
  {
    id: 'scalde-des-runes',
    name: 'Scalde des runes',
    element: 'neige',
    cost: 3,
    atk: 2,
    def: 3,
    rarity: 'rare',
    typeLine: 'Créature — Scalde',
    art: 'scalde-des-runes',
    arrivee: { type: 'pioche', amount: 1 },
    text: 'Quand le Scalde arrive : piochez une carte.',
    flavor: 'Il grave le poème avant de le chanter.',
  },
  {
    id: 'valkyrie-au-corbeau',
    name: 'Valkyrie au corbeau',
    element: 'neige',
    cost: 4,
    atk: 3,
    def: 3,
    rarity: 'rare',
    typeLine: 'Créature — Valkyrie',
    art: 'valkyrie-au-corbeau',
    resonance: 1,
    envol: true,
    arrivee: { type: 'buff', atk: 1, def: 0 },
    text: 'Résonance — Tant qu’elle est en jeu, toutes les créatures Neige de la table gagnent +1/+1. Envol — Ne peut être bloquée que par une créature avec Envol. Quand elle arrive : vos autres créatures gagnent +1 ATQ.',
    flavor: 'Le corbeau tourne une fois, puis la mêlée se souvient de son nom.',
  },
  {
    id: 'berserk-des-trois-hivers',
    name: 'Berserk des trois hivers',
    element: 'neige',
    cost: 4,
    atk: 4,
    def: 2,
    rarity: 'rare',
    typeLine: 'Créature — Berserk viking',
    art: 'berserk-des-trois-hivers',
    furie: 2,
    coupRapide: true,
    text: 'Furie 2 — Chaque fois qu’il est blessé et survit, le Berserk gagne +2/+2. Coup rapide — Quand il est sélectionné pour attaquer, choisissez une créature adverse : il lui inflige ses dégâts d’attaque.',
    flavor: 'Trois hivers de rage tenus dans un seul bras — et le sang ne fait que l’attiser.',
  },
  {
    id: 'jarl-au-marteau-de-guerre',
    name: 'Jarl au marteau de guerre',
    element: 'neige',
    cost: 5,
    atk: 4,
    def: 4,
    rarity: 'epique',
    typeLine: 'Créature — Jarl viking',
    art: 'jarl-au-marteau-de-guerre',
    furie: 3,
    text: 'Furie 3 — Chaque fois qu’il est blessé et survit, le Jarl gagne +3/+3.',
    flavor: 'Le vieux chef ne crie pas : il encaisse, puis il avance.',
  },
  {
    id: 'valkyrie-des-glaces',
    name: 'Valkyrie des glaces',
    element: 'neige',
    cost: 5,
    atk: 4,
    def: 4,
    rarity: 'epique',
    typeLine: 'Créature — Valkyrie',
    art: 'valkyrie-des-glaces',
    resonance: 1,
    envol: true,
    arrivee: { type: 'degats', amount: 2, cible: 'creature' },
    text: 'Résonance — Tant qu’elle est en jeu, toutes les créatures Neige de la table gagnent +1/+1. Envol — Ne peut être bloquée que par une créature avec Envol. Quand elle arrive : sa lance de givre blesse une créature adverse (2 dégâts).',
    flavor: 'Elle choisit qui monte, et qui reste dans la neige.',
  },
  {
    id: 'geant-des-banquises',
    name: 'Géant des banquises',
    element: 'neige',
    cost: 6,
    atk: 5,
    def: 5,
    rarity: 'epique',
    typeLine: 'Créature — Géant',
    art: 'geant-des-banquises',
    arrivee: { type: 'degats', amount: 1, cible: 'toutes-creatures' },
    text: 'Quand le Géant arrive : son pas brise la glace — 1 dégât à toutes les créatures adverses.',
    flavor: 'La banquise craque bien avant qu’il n’apparaisse.',
  },
  {
    id: 'drakkar-a-tete-de-dragon',
    name: 'Drakkar à tête de dragon',
    element: 'neige',
    cost: 5,
    atk: 4,
    def: 6,
    rarity: 'epique',
    typeLine: 'Créature — Navire viking',
    art: 'drakkar-a-tete-de-dragon',
    arrivee: { type: 'pioche', amount: 1 },
    text: 'Quand le Drakkar arrive : son équipage débarque — piochez une carte.',
    flavor: 'Quarante rameurs, une proue de dragon, et la brume qui s’ouvre.',
  },
];

export function creatureById(id) {
  return RPG_CREATURE_CARDS.find((card) => card.id === id) ?? null;
}

/**
 * Les héros en cartes jouables (façon arpenteurs) : mêmes images 4:5 que
 * sur la table, stats à l'échelle du duel, une capacité d'arrivée chacun.
 * Ils ne sont pas dans la main de départ — ils vivent dans le paquet.
 */
export const RPG_HERO_CARDS = [
  {
    id: 'salem',
    name: 'SALEM',
    role: 'Le Sondeur',
    element: 'sable',
    cost: 4,
    atk: 4,
    def: 3,
    rarity: 'mythique',
    kind: 'hero',
    typeLine: 'Créature légendaire — Héros',
    arrivee: { type: 'degats', amount: 2, cible: 'creature' },
    text: 'Quand Salem arrive : son crochet fauche une créature adverse (2 dégâts).',
    flavor: 'On ne monte pas un étage condamné sans redescendre.',
  },
  {
    id: 'yamina',
    name: 'YAMINA',
    role: 'L’Horlogère',
    element: 'eau',
    cost: 3,
    atk: 2,
    def: 4,
    rarity: 'mythique',
    kind: 'hero',
    typeLine: 'Créature légendaire — Héros',
    arrivee: { type: 'pioche', amount: 1 },
    text: 'Quand Yamina arrive : piochez une carte.',
    flavor: 'Je compte avant de signer.',
  },
  {
    id: 'boualem',
    name: 'BOUALEM',
    role: 'Le Puisatier',
    element: 'eau',
    cost: 3,
    atk: 2,
    def: 4,
    rarity: 'mythique',
    kind: 'hero',
    typeLine: 'Créature légendaire — Héros',
    arrivee: { type: 'soin', amount: 4 },
    text: 'Quand Boualem arrive : vous récupérez 4 points de vie.',
    flavor: 'Moi je fais monter ce qui aide.',
  },
  {
    id: 'feriel',
    name: 'FÉRIEL',
    role: 'La Souffleuse de verre',
    element: 'braise',
    cost: 4,
    atk: 3,
    def: 1,
    rarity: 'mythique',
    kind: 'hero',
    typeLine: 'Créature légendaire — Héros',
    rapidite: true,
    coupRapide: true,
    text: 'Rapidité. Coup rapide — Quand Fériel est sélectionnée pour attaquer, choisissez une créature adverse : Fériel lui inflige ses dégâts d’attaque.',
    flavor: 'Le verre se souvient du feu.',
  },
  {
    id: 'tarek',
    name: 'TAREK',
    role: 'Le Porteur',
    element: 'sable',
    cost: 5,
    atk: 4,
    def: 5,
    rarity: 'mythique',
    kind: 'hero',
    typeLine: 'Créature légendaire — Héros',
    arrivee: { type: 'buff', atk: 1, def: 1 },
    text: 'Quand Tarek arrive : vos autres créatures gagnent +1/+1.',
    flavor: 'Il frappe avec ce qu’il porte.',
  },
  {
    id: 'tin-hinan',
    name: 'Tin Hinan, mère des pistes',
    role: 'Matriarche touarègue',
    element: 'sable',
    cost: 5,
    atk: 4,
    def: 5,
    rarity: 'mythique',
    kind: 'hero',
    typeLine: 'Créature légendaire — Matriarche touarègue',
    art: 'tin-hinan-des-pistes',
    arrivee: { type: 'buff', atk: 1, def: 1 },
    text: 'Quand Tin Hinan arrive : vos autres créatures gagnent +1/+1.',
    flavor: 'Dans la mémoire des pistes, elle ouvre la route et rassemble les siens.',
  },
  {
    id: 'ifrit-al-ahmar',
    name: 'Ifrit al-Ahmar, seigneur des braises',
    role: 'Souverain des cendres',
    element: 'braise',
    cost: 6,
    atk: 6,
    def: 5,
    rarity: 'mythique',
    kind: 'hero',
    typeLine: 'Créature légendaire — Ifrit',
    art: 'ifrit-al-ahmar',
    arrivee: { type: 'degats', amount: 2, cible: 'toutes-creatures' },
    text: 'Quand l’Ifrit arrive : 2 dégâts à toutes les créatures adverses.',
    flavor: 'Une ancienne histoire de feu, racontée sans fin au bord des dunes.',
  },
  // ── Serment des Neuf Hivers : les figures du Nord, jamais nommées « dieux » ──
  {
    id: 'pere-des-corbeaux',
    name: 'LE PÈRE DES CORBEAUX',
    role: 'Celui qui sait',
    element: 'neige',
    cost: 5,
    atk: 4,
    def: 4,
    rarity: 'epique',
    kind: 'hero',
    typeLine: 'Créature légendaire — Héros',
    art: 'pere-des-corbeaux',
    arrivee: { type: 'pioche', amount: 2 },
    text: 'Quand il arrive : ses deux corbeaux reviennent — piochez deux cartes.',
    flavor: 'Il a donné un œil pour savoir, et ne l’a jamais regretté.',
  },
  {
    id: 'maitre-du-marteau',
    name: 'LE MAÎTRE DU MARTEAU',
    role: 'Le Tonnerre',
    element: 'neige',
    cost: 6,
    atk: 6,
    def: 5,
    rarity: 'epique',
    kind: 'hero',
    typeLine: 'Créature légendaire — Héros',
    art: 'maitre-du-marteau',
    arrivee: { type: 'degats', amount: 2, cible: 'toutes-creatures' },
    text: 'Quand il arrive : son marteau tombe — 2 dégâts à toutes les créatures adverses.',
    flavor: 'Le tonnerre n’est pas un bruit : c’est un rendez-vous — et son marteau, lui, retrouve toujours sa main.',
  },
  {
    id: 'dame-des-neuf-mondes',
    name: 'LA DAME DES NEUF MONDES',
    role: 'La Gardienne du foyer',
    element: 'neige',
    cost: 4,
    atk: 3,
    def: 5,
    rarity: 'epique',
    kind: 'hero',
    typeLine: 'Créature légendaire — Héros',
    art: 'dame-des-neuf-mondes',
    arrivee: { type: 'soin', amount: 5 },
    text: 'Quand elle arrive : vous récupérez 5 points de vie.',
    flavor: 'Elle tient le fil de toutes les maisons à la fois.',
  },
  {
    id: 'serpent-du-monde',
    name: 'LE SERPENT DU MONDE',
    role: 'Celui qui entoure',
    element: 'neige',
    cost: 6,
    atk: 6,
    def: 6,
    rarity: 'epique',
    kind: 'hero',
    typeLine: 'Créature légendaire — Serpent',
    art: 'serpent-du-monde',
    destruction: { type: 'degats', amount: 2, cible: 'toutes-creatures' },
    text: 'Quand il est détruit : son corps retombe sur la table — 2 dégâts à toutes les créatures adverses.',
    flavor: 'Il mord sa propre queue dans la glace, et le monde tient debout.',
  },
];

export function heroById(id) {
  return RPG_HERO_CARDS.find((card) => card.id === id) ?? null;
}

/** Toute carte jouable du duel : créature ou héros. */
export function duelCardById(id) {
  return creatureById(id) ?? heroById(id);
}

/**
 * Decks de 40 cartes : les archétypes monocolores et l’hybride Sable/Braise
 * contiennent au moins 40 % de terrains. Les mythiques sont limités à un
 * exemplaire par deck ; les autres cartes non-terrain à trois exemplaires.
 */
export const RPG_DECK_JOUEUR_BASE = [
  ...Array(17).fill('desert'),
  ...Array(2).fill('fennec-des-decombres'),
  'cavalier-amazigh-du-desert',
  ...Array(3).fill('faiseur-de-passage'),
  ...Array(3).fill('tislit-des-aures'),
  ...Array(3).fill('tiziri-du-djurdjura'),
  ...Array(3).fill('amani-des-ksour'),
  ...Array(2).fill('amayas-du-hoggar'),
  'tin-hinan',
  ...Array(2).fill('rapport-du-greffier'),
  ...Array(2).fill('rempart-de-dunes'),
  'tempete-de-sable',
];

export const RPG_DECK_SORCIER_BASE = [
  ...Array(18).fill('montagne'),
  'braisier-du-souk',
  'feriel',
  'anqa-des-braises',
  'djinn-du-souk',
  ...Array(3).fill('ghul-des-cendres'),
  'sahir-des-braises',
  'ifrit-des-ergs',
  'ifrit-al-ahmar',
  ...Array(3).fill('trait-de-braise'),
  ...Array(3).fill('fureur-du-souk'),
  ...Array(3).fill('rafale-du-minaret'),
  ...Array(3).fill('nuage-de-cendres'),
];

export const RPG_DECK_HYBRIDE_BASE = [
  ...Array(6).fill('desert'),
  ...Array(6).fill('montagne'),
  ...Array(5).fill('petra'),
  ...Array(3).fill('fennec-des-decombres'),
  ...Array(2).fill('cavalier-amazigh-du-desert'),
  ...Array(2).fill('faiseur-de-passage'),
  ...Array(2).fill('tislit-des-aures'),
  'braisier-du-souk',
  'feriel',
  'anqa-des-braises',
  'djinn-du-souk',
  'sahir-des-braises',
  ...Array(3).fill('veilleur-du-couchant'),
  'ifrit-des-ergs',
  ...Array(2).fill('trait-de-braise'),
  'rempart-de-dunes',
  ...Array(2).fill('vent-rouge'),
];

/**
 * Illustrations provisoires : une carte dont le plein art n'est pas encore
 * peint peut être déclarée ici — elle affiche alors un recadrage étalonné d'une
 * illustration existante (direction artistique : `RPG-CARD-ART.md`). La liste
 * est vide : les dix-huit cartes du Serment des Neuf Hivers ont leur peinture
 * dédiée. Chaque entrée doit disparaître le jour où la peinture originale
 * remplace le fichier `public/cards/<id>.jpg`.
 */
export const RPG_ART_PROVISOIRE = [];

/**
 * Serment des Neuf Hivers — le deck mono-Neige : dix-sept glaciers, des
 * guerriers de clan, des valkyries, un berserk, un drakkar et les figures du
 * Nord (jamais nommées « dieux » : le Père des corbeaux, le Maître du marteau,
 * la Dame des neuf mondes, le Serpent du monde). Les cartes épiques — la
 * rareté du set — n'y sont qu'en un exemplaire.
 */
export const RPG_DECK_NEIGE_BASE = [
  ...Array(17).fill('glacier'),
  ...Array(2).fill('guerrier-au-bouclier-rond'),
  ...Array(2).fill('loup-des-neiges'),
  'scalde-des-runes',
  ...Array(2).fill('valkyrie-au-corbeau'),
  'berserk-des-trois-hivers',
  'jarl-au-marteau-de-guerre',
  ...Array(2).fill('mur-de-boucliers'),
  ...Array(2).fill('eclair-du-marteau'),
  'brume-du-fjord',
  'festin-des-vaillants',
  'valkyrie-des-glaces',
  'geant-des-banquises',
  'drakkar-a-tete-de-dragon',
  'hurlement-du-blizzard',
  'pere-des-corbeaux',
  'maitre-du-marteau',
  'dame-des-neuf-mondes',
  'serpent-du-monde',
];

/** Decks de départ. `boxArt` : l'illustration plein art (carte emblématique) imprimée
 *  sur le boîtier 3D de l'onglet Deck — un identifiant de `public/cards/`.
 *  `role` : le camp que le deck tient par défaut — `joueur` (deck de départ du joueur) ou
 *  `adversaire` (deck du sorcier en duel libre). Il ne limite rien : le joueur peut choisir
 *  n'importe quel deck complet, la Cour des Djinns comprise (voir `rpgDeckChoice.js`).
 *  `affrontement` : la phrase de la carte « ADVERSAIRE » de l'écran Jouer quand le sorcier
 *  joue ce deck (sans elle : « Affrontez <nom du deck>. »). */
export const RPG_DECKS = [
  {
    id: 'veilleurs-du-desert',
    name: 'Veilleurs du Désert',
    role: 'joueur',
    element: 'sable',
    terrain: 'desert',
    boxArt: 'cavalier-amazigh-du-desert',
    archetype: 'Assaut des dunes',
    affrontement: 'Affrontez les veilleurs du Désert.',
    description: 'Deck mono-Sable inspiré des peuples amazighs d’Algérie : créatures offensives, renforts et protections ciblées contre une couleur pendant leur tour d’arrivée et le tour adverse suivant.',
    cardIds: RPG_DECK_JOUEUR_BASE,
  },
  {
    id: 'cour-des-djinns',
    name: 'Cour des Djinns',
    role: 'adversaire',
    element: 'braise',
    terrain: 'montagne',
    boxArt: 'ifrit-al-ahmar',
    archetype: 'Djinns et sorcellerie',
    affrontement: 'Affrontez les djinns de Braise.',
    description: 'Deck mono-Braise inspiré du folklore arabo-musulman autour des djinns, ifrits et ghuls, avec des rituels de cendres.',
    cardIds: RPG_DECK_SORCIER_BASE,
  },
  {
    id: 'sentiers-de-cendre',
    name: 'Sentiers de cendre',
    role: 'joueur',
    element: 'hybride',
    elements: ['sable', 'braise'],
    terrain: 'petra',
    boxArt: 'feriel',
    archetype: 'Sable + Braise · deux couleurs, une même piste',
    description: 'Un deck hybride de Sable et de Braise : les terrains Désert et Montagne se mêlent à Pétra, qui choisit sa couleur à chaque engagement. Ses cartes bicolores évoquent avec subtilité des récits désertiques diné, sans divinité nommée ni symbole cérémoniel.',
    cardIds: RPG_DECK_HYBRIDE_BASE,
  },
  {
    id: 'serment-des-neuf-hivers',
    name: 'Serment des Neuf Hivers',
    role: 'joueur',
    element: 'neige',
    terrain: 'glacier',
    boxArt: 'valkyrie-des-glaces',
    archetype: 'Neige · valkyries, guerriers et drakkars',
    affrontement: 'Affrontez les serments du Nord.',
    description: 'Deck mono-Neige inspiré des récits du Nord : guerriers au bouclier rond, loups des neiges, scalde, berserk, valkyries ailées et drakkar à tête de dragon, aux côtés des figures du panthéon scandinave — le Père des corbeaux, le Maître du marteau, la Dame des neuf mondes et le Serpent du monde — jamais nommées « dieux ». Combat physique des clans et combat magique des runes, sous les boucliers de givre.',
    cardIds: RPG_DECK_NEIGE_BASE,
  },
];

/** Raretés d'exception : une seule copie par deck. */
export const CARD_UNIQUE_RARITIES = ['epique', 'mythique'];

/** Exemplaires autorisés dans un deck : terrains illimités, raretés d'exception
 *  à un exemplaire, tout le reste à trois. */
export function cardCopyLimit(card) {
  if (card?.kind === 'terrain') return Infinity;
  return CARD_UNIQUE_RARITIES.includes(card?.rarity) ? 1 : 3;
}

/** Valide un deck : 40 cartes, au moins 40 % de terrains, cartes d'exception
 *  (épiques et mythiques) limitées à un exemplaire, autres cartes non-terrain
 *  limitées à trois exemplaires. */
export function rpgValiderDeck(deck) {
  if (deck.length !== 40) return { ok: false, raison: `40 cartes exigées (${deck.length})` };
  const comptes = {};
  let terrains = 0;
  for (const id of deck) {
    const carte = cardById(id);
    if (!carte) return { ok: false, raison: `carte inconnue : ${id}` };
    comptes[id] = (comptes[id] ?? 0) + 1;
    if (carte.kind === 'terrain') terrains += 1;
    const limite = cardCopyLimit(carte);
    if (comptes[id] > limite) {
      return {
        ok: false,
        raison: limite === 1
          ? `${id} ${carte.rarity} en ${comptes[id]} exemplaires (1 max)`
          : `${id} en ${comptes[id]} exemplaires (${limite} max)`,
      };
    }
  }
  if (terrains < 0.4 * deck.length) return { ok: false, raison: `terrains ${Math.round((terrains / deck.length) * 100)} % (40 % min)` };
  return { ok: true, terrains };
}

/**
 * Les terrains — façon Magic : piochés, posés (UN par tour), engagés pour
 * produire un mana de leur couleur. Montagne → braise, Mer → eau,
 * Désert → sable.
 */
export const RPG_TERRAIN_CARDS = [
  {
    id: 'montagne',
    name: 'Montagne',
    element: 'braise',
    kind: 'terrain',
    art: 'montagne',
    typeLine: 'Terrain — Montagne',
    rarity: 'commune',
    cost: 0,
    text: 'Engagez : ajoutez un mana braise.',
    flavor: 'La braise dort sous la roche.',
  },
  {
    id: 'mer',
    name: 'Mer',
    element: 'eau',
    kind: 'terrain',
    typeLine: 'Terrain — Mer',
    rarity: 'commune',
    cost: 0,
    text: 'Engagez : ajoutez un mana eau.',
    flavor: 'Derrière la dune, elle attend encore.',
  },
  {
    id: 'desert',
    name: 'Désert',
    element: 'sable',
    kind: 'terrain',
    typeLine: 'Terrain — Désert',
    rarity: 'commune',
    cost: 0,
    text: 'Engagez : ajoutez un mana sable.',
    flavor: 'Le vent grave des pistes dans l’or des dunes.',
  },
  {
    id: 'petra',
    name: 'Pétra',
    element: 'hybride',
    colors: ['sable', 'braise'],
    manaColors: ['braise', 'sable'],
    kind: 'terrain',
    art: 'petra',
    typeLine: 'Terrain — Cité',
    rarity: 'rare',
    cost: 0,
    text: 'Engagez : ajoutez un mana Braise ou Sable.',
    flavor: 'Dans la roche rose, les pistes se croisent.',
  },
  {
    id: 'glacier',
    name: 'Glacier',
    element: 'neige',
    kind: 'terrain',
    art: 'glacier',
    typeLine: 'Terrain — Glacier',
    rarity: 'commune',
    cost: 0,
    text: 'Engagez : ajoutez un mana Neige.',
    flavor: 'Sous la glace, le temps dort debout.',
  },
];

export function terrainById(id) {
  return RPG_TERRAIN_CARDS.find((card) => card.id === id) ?? null;
}

/**
 * Les magies — les sorts du set : payées en mana, résolues puis
 * consommées. Comme à Magic, certaines ciblent les créatures,
 * d'autres (parfois) les sorciers.
 */
export const RPG_MAGIE_CARDS = [
  {
    id: 'trait-de-braise',
    name: 'Trait de braise',
    element: 'braise',
    kind: 'magie',
    typeLine: 'Éphémère — Braise',
    art: 'trait-de-braise',
    cost: 2,
    rarity: 'commune',
    instant: true,
    cibles: ['creature', 'sorcier'],
    effet: { type: 'degats', amount: 3, cible: 'creature' },
    text: '3 dégâts à une créature ou un sorcier ciblés.',
    flavor: 'Une étincelle suffit, au souk.',
  },
  {
    id: 'eau-de-la-source',
    name: 'Eau de la source',
    element: 'eau',
    kind: 'magie',
    typeLine: 'Rituel — Eau',
    art: 'mer',
    cost: 1,
    rarity: 'commune',
    cibles: ['soi'],
    effet: { type: 'soin', amount: 4 },
    text: 'Vous récupérez 4 points de vie.',
    flavor: 'Elle a le goût d’avant le sable.',
  },
  {
    id: 'rapport-du-greffier',
    name: 'Rapport du greffier',
    element: 'sable',
    kind: 'magie',
    typeLine: 'Rituel — Sable',
    art: 'rapport-du-greffier',
    cost: 1,
    rarity: 'commune',
    cibles: ['soi'],
    effet: { type: 'pioche', amount: 2 },
    text: 'Piochez deux cartes.',
    flavor: 'Toute demande reçoit sa réponse. Écrite deux fois.',
  },
  {
    id: 'lame-de-mer',
    name: 'Lame de mer',
    element: 'eau',
    kind: 'magie',
    typeLine: 'Rituel — Eau',
    art: 'mer',
    cost: 2,
    rarity: 'commune',
    cibles: ['creature'],
    effet: { type: 'degats', amount: 3, cible: 'creature' },
    text: '3 dégâts à une créature ciblée.',
    flavor: 'La vague coupe plus propre que le couteau.',
  },
  {
    id: 'rempart-de-dunes',
    name: 'Rempart de dunes',
    element: 'sable',
    kind: 'magie',
    typeLine: 'Rituel — Sable',
    art: 'rempart-de-dunes',
    cost: 2,
    rarity: 'commune',
    cibles: ['soi'],
    effet: { type: 'buff', atk: 1, def: 1 },
    text: 'Vos créatures gagnent +1/+1.',
    flavor: 'Le vent bâtit plus vite que les maçons.',
  },
  {
    id: 'sentence-de-la-liste',
    name: 'Sentence de la Liste',
    element: 'sable',
    kind: 'magie',
    typeLine: 'Rituel — Sable',
    art: 'sentence-de-la-liste',
    cost: 3,
    rarity: 'rare',
    cibles: ['creature'],
    effet: { type: 'degats', amount: 4, cible: 'creature' },
    text: '4 dégâts à une créature ciblée.',
    flavor: 'Votre nom était barré avant l’aube.',
  },
  {
    id: 'fureur-du-souk',
    name: 'Fureur du souk',
    element: 'braise',
    kind: 'magie',
    typeLine: 'Rituel — Braise',
    art: 'fureur-du-souk',
    cost: 3,
    rarity: 'rare',
    cibles: ['sorcier'],
    effet: { type: 'degats', amount: 4, cible: 'sorcier' },
    text: '4 dégâts au sorcier adverse.',
    flavor: 'On ne négocie pas avec un étal en feu.',
  },
  {
    id: 'tempete-de-sable',
    name: 'Tempête de sable',
    element: 'sable',
    kind: 'magie',
    typeLine: 'Rituel — Sable',
    art: 'tempete-de-sable',
    cost: 4,
    rarity: 'rare',
    cibles: ['toutes'],
    effet: { type: 'degats', amount: 2, cible: 'toutes-creatures' },
    text: '2 dégâts à toutes les créatures adverses.',
    flavor: 'Le ciel se couche. Personne n’est invité.',
  },
  {
    id: 'parade-du-verre',
    name: 'Parade de verre',
    element: 'eau',
    kind: 'magie',
    typeLine: 'Éphémère — Protection',
    art: 'parade-du-verre',
    instant: true,
    cost: 2,
    rarity: 'rare',
    cibles: ['creature-amie'],
    effet: { type: 'bouclier', amount: 3, cible: 'creature-amie' },
    text: 'Éphémère — Une créature alliée prévient les 3 prochains dégâts qu’elle devrait subir.',
    flavor: 'Une seconde de verre suffit à dévier le coup.',
  },
  {
    id: 'rafale-du-minaret',
    name: 'Rafale du minaret',
    element: 'braise',
    kind: 'magie',
    typeLine: 'Éphémère — Braise',
    art: 'rafale-du-minaret',
    instant: true,
    cost: 2,
    rarity: 'rare',
    cibles: ['creature', 'sorcier'],
    effet: { type: 'degats', amount: 2, cible: 'creature' },
    text: 'Éphémère — 2 dégâts à une créature ou un sorcier ciblés.',
    flavor: 'Du haut du minaret, une étincelle trouve toujours sa cible.',
  },
  {
    id: 'brisure-de-verre',
    name: 'Brisure de verre',
    element: 'eau',
    kind: 'magie',
    typeLine: 'Éphémère — Eau',
    art: 'brisure-de-verre',
    instant: true,
    cost: 3,
    rarity: 'rare',
    cibles: ['toutes'],
    effet: { type: 'degats', amount: 1, cible: 'toutes-creatures' },
    text: 'Éphémère — 1 dégât à toutes les créatures adverses.',
    flavor: 'Le verre se fend en mille éclats, jamais au hasard.',
  },
  {
    id: 'nuage-de-cendres',
    name: 'Nuage de cendres',
    element: 'braise',
    kind: 'magie',
    typeLine: 'Rituel — Sihr de braise',
    art: 'nuage-de-cendres',
    cost: 4,
    rarity: 'rare',
    cibles: ['toutes'],
    effet: { type: 'degats', amount: 2, cible: 'toutes-creatures' },
    text: 'Rituel — 2 dégâts à toutes les créatures adverses.',
    flavor: 'Le vent tourne ; la poussière devient un voile brûlant.',
  },
  {
    id: 'vent-rouge',
    name: 'Vent rouge',
    element: 'braise',
    colors: ['braise', 'sable'],
    colorCost: { braise: 1, sable: 1 },
    kind: 'magie',
    typeLine: 'Rituel — Sable et Braise',
    art: 'vent-rouge',
    cost: 3,
    rarity: 'rare',
    cibles: ['toutes'],
    effet: { type: 'degats', amount: 2, cible: 'toutes-creatures' },
    text: 'Une rafale chargée de sable et de braises inflige 2 dégâts à toutes les créatures adverses.',
    flavor: 'La poussière rougit, puis le vent l’emporte.',
  },
  // ── Serment des Neuf Hivers : le combat physique et le combat magique ──
  {
    id: 'eclair-du-marteau',
    name: 'Éclair du marteau',
    element: 'neige',
    kind: 'magie',
    typeLine: 'Éphémère — Neige',
    art: 'eclair-du-marteau',
    instant: true,
    cost: 2,
    rarity: 'commune',
    cibles: ['creature', 'sorcier'],
    effet: { type: 'degats', amount: 3, cible: 'creature' },
    text: 'Éphémère — 3 dégâts à une créature ou un sorcier ciblés.',
    flavor: 'Le ciel se fend ; le marteau a parlé.',
  },
  {
    id: 'mur-de-boucliers',
    name: 'Mur de boucliers',
    element: 'neige',
    kind: 'magie',
    typeLine: 'Rituel — Neige',
    art: 'mur-de-boucliers',
    cost: 2,
    rarity: 'commune',
    cibles: ['soi'],
    effet: { type: 'buff', atk: 1, def: 1 },
    text: 'Vos créatures gagnent +1/+1.',
    flavor: 'Épaule contre épaule, le clan devient une muraille.',
  },
  {
    id: 'festin-des-vaillants',
    name: 'Festin des vaillants',
    element: 'neige',
    kind: 'magie',
    typeLine: 'Rituel — Neige',
    art: 'festin-des-vaillants',
    cost: 2,
    rarity: 'commune',
    cibles: ['soi'],
    effet: { type: 'soin', amount: 5 },
    text: 'Vous récupérez 5 points de vie.',
    flavor: 'On boit au souvenir de ceux qui ne reviendront pas.',
  },
  {
    id: 'brume-du-fjord',
    name: 'Brume du fjord',
    element: 'neige',
    kind: 'magie',
    typeLine: 'Éphémère — Neige',
    art: 'brume-du-fjord',
    instant: true,
    cost: 2,
    rarity: 'rare',
    cibles: ['creature-amie'],
    effet: { type: 'bouclier', amount: 3, cible: 'creature-amie' },
    text: 'Éphémère — Une créature alliée prévient les 3 prochains dégâts qu’elle devrait subir.',
    flavor: 'La brume avale les coups avant qu’ils n’arrivent.',
  },
  {
    id: 'hurlement-du-blizzard',
    name: 'Hurlement du blizzard',
    element: 'neige',
    kind: 'magie',
    typeLine: 'Rituel — Neige',
    art: 'hurlement-du-blizzard',
    cost: 4,
    rarity: 'epique',
    cibles: ['toutes'],
    effet: { type: 'degats', amount: 2, cible: 'toutes-creatures' },
    text: 'Rituel — 2 dégâts à toutes les créatures adverses.',
    flavor: 'Le vent hurle si fort que la neige devient des lames.',
  },
];

/** Le catalogue complet du duel, avec un type unifié pour les filtres d’interface. */
export const RPG_DUEL_CARDS = [
  ...RPG_CREATURE_CARDS.map((card) => ({ ...card, kind: 'creature' })),
  ...RPG_HERO_CARDS,
  ...RPG_TERRAIN_CARDS,
  ...RPG_MAGIE_CARDS,
];

export function magieById(id) {
  return RPG_MAGIE_CARDS.find((card) => card.id === id) ?? null;
}

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
    element: 'eau',
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
    element: 'eau',
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
  [...RPG_POWER_CARDS, ...RPG_BASIC_CARDS, ...Object.values(RPG_BASIC_ATTACKS), ...RPG_DUEL_CARDS]
    .map((card) => [card.id, card]),
);

/** Retrouve une carte du catalogue par son id. */
export function cardById(id) {
  return CATALOG.get(id) ?? null;
}

const RPG_CARD_COLORS = new Set(RPG_ELEMENTS);

/** Identité chromatique d’une carte (une ou plusieurs couleurs). */
export function cardColors(cardOrId) {
  const card = typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
  const configured = Array.isArray(card?.colors) && card.colors.length ? card.colors : [card?.element];
  return [...new Set(configured.filter((color) => RPG_CARD_COLORS.has(color)))];
}

/** Pips colorés exigés. Les cartes mono gardent leur règle historique. */
export function cardColorCost(cardOrId) {
  const card = typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
  if (card?.colorCost && typeof card.colorCost === 'object') {
    return Object.fromEntries(Object.entries(card.colorCost)
      .filter(([color, amount]) => RPG_CARD_COLORS.has(color) && Number.isInteger(amount) && amount > 0));
  }
  return Number(card?.cost) > 0 && RPG_CARD_COLORS.has(card?.element)
    ? { [card.element]: 1 }
    : {};
}

/** Couleurs que peut produire un terrain lorsqu’il est engagé. */
export function terrainManaColors(cardOrId) {
  const card = typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
  if (card?.kind !== 'terrain') return [];
  const configured = Array.isArray(card.manaColors) && card.manaColors.length
    ? card.manaColors
    : card?.element === 'hybride' ? cardColors(card) : [card?.element];
  return [...new Set(configured.filter((color) => RPG_CARD_COLORS.has(color)))];
}

/** Ligne de type imprimée sur la face de chaque carte du duel. */
export function cardTypeLine(card) {
  if (!card) return 'Carte inconnue';
  if (card.typeLine) return card.typeLine;
  if (card.kind === 'hero') return 'Créature légendaire — Héros';
  if (card.kind === 'creature') return 'Créature — Habitants de Bab El';
  if (card.kind === 'terrain') return `Terrain — ${card.name}`;
  if (card.kind === 'magie') return card.instant ? 'Éphémère' : 'Rituel';
  return 'Carte';
}

/**
 * Chaque nouvelle carte du duel doit avoir son image full art locale, sans
 * cadre ni texte (voir RPG-CARD-ART.md). `art` ne sert qu’aux exceptions
 * explicitement mappées ; sinon l’identifiant de carte est le nom du fichier.
 */
export function cardArtId(cardOrId) {
  const card = typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
  return card?.art ?? card?.id ?? cardOrId;
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
  const pool = [...RPG_POWER_CARDS, ...RPG_CREATURE_CARDS].filter((card) => !collection.includes(card.id));
  const offer = [];
  while (offer.length < 3 && pool.length) {
    const index = Math.floor(rng() * pool.length);
    offer.push(pool.splice(index, 1)[0].id);
  }
  return offer;
}
