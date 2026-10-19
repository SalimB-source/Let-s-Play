/**
 * Catalogue de cartes de l’univers « Le Sablier ».
 *
 * Le duel utilise un jeu original de type TCG : les terrains génèrent du mana
 * coloré, les créatures et héros combattent, et les sorcelleries/magies rapides
 * résolvent leurs effets avant de rejoindre le cimetière. Les fiches portent coût,
 * élément, rareté, ligne de type, texte de règle et illustration locale.
 *
 * Les sept decks du jeu sont **composés** en fin de fichier : les recettes
 * (`rpgDeckRecipes.js`) disent l’identité, les quotas et la signature, et
 * `composerDeck` (`rpgDeckComposer.js`) y met les meilleures cartes du
 * catalogue, palier de rareté puis puissance (`rpgCardPower.js`).
 */

import { RPG_SOLEIL_ROUGE_CREATURES, RPG_SOLEIL_ROUGE_JETONS, RPG_SOLEIL_ROUGE_MAGIES, RPG_SOLEIL_ROUGE_TERRAINS } from './rpgSoleilRouge.js';
import { RPG_TENEBRES_ARMES, RPG_TENEBRES_CREATURES, RPG_TENEBRES_JETONS, RPG_TENEBRES_MAGIES } from './rpgTenebres.js';
import { composerDeck } from './rpgDeckComposer.js';
import { RPG_RECETTES_DECKS } from './rpgDeckRecipes.js';

export const CARD_RARITIES = {
  commune: { label: 'Commune', color: '#f1f3f5' },
  inhabituelle: { label: 'Inhabituelle', color: '#4d9aff' },
  rare: { label: 'Rare', color: '#e1b33f' },
  mythique: { label: 'Mythique', color: '#a875ed' },
};

/** Résout aussi l'alias anglais courant sans modifier les raretés du catalogue. */
export function cardRarityInfo(carte) {
  const requestedKey = carte?.rarity === 'uncommon' ? 'inhabituelle' : carte?.rarity;
  const key = Object.hasOwn(CARD_RARITIES, requestedKey) ? requestedKey : 'commune';
  return { key, ...CARD_RARITIES[key] };
}

/**
 * Les cinq éléments du duel, dans l'ordre canonique des couleurs : c'est
 * cet ordre qui nomme les combinaisons bicolores et tricolores, quel que soit
 * l'ordre dans lequel une carte déclare ses couleurs. Braise, Eau et Sable
 * composent Bab El ; la Neige arrive avec le Serment des Neuf Hivers ; les
 * Ténèbres viennent avec La Balance des Heures (banc d'essai sans terrains).
 */
export const RPG_ELEMENTS = ['braise', 'eau', 'sable', 'neige', 'tenebres'];

/** Une carte mythique emblématique par élément, pour illustrer les boosters du
 *  Souk. C'est une vitrine (son art existe dans `public/cards/`), pas un
 *  tirage : chaque rayon montre la même pour son élément, pour donner envie
 *  d'ouvrir le paquet. Les identifiants pointent vers des illustrations
 *  présentes. */
export const MYTHIQUE_VITRINE_PAR_ELEMENT = Object.freeze({
  braise: 'djinn-du-souk',
  eau: 'kraken',
  sable: 'salem',
  neige: 'pere-des-corbeaux',
  tenebres: 'la-devoreuse',
});

/**
 * Couleur du cadre : elle suit l'ÉLÉMENT de la carte, jamais sa rareté.
 * Les mythiques mono-élément brillent dans cette couleur ; les hybrides,
 * mythiques comprises, affichent chaque élément sur une portion du cadre.
 *
 * Chaque combinaison a son identité, y compris celles qui n'existent pas
 * encore dans le catalogue : ses couleurs se partagent le cadre en diagonale,
 * sans reflet animé.
 *
 * Exception : les armes gardent un cadre d'**acier métallique guilloché**
 * (`arme`), mais teinté dans la couleur de leur élément — acier de Braise,
 * d'Eau, de Sable, de Neige ou de Ténèbres.
 */
export const CARD_FRAME_COLORS = {
  braise: { label: 'Braise', color: '#e0412a' },
  eau: { label: 'Eau', color: '#3f9fe8' },
  sable: { label: 'Sable', color: '#d8bc86' },
  neige: { label: 'Neige', color: '#a9e0f5' },
  tenebres: { label: 'Ténèbres', color: '#4b2e83' },
  'hybride-braise-eau': { label: 'Braise + Eau', color: '#a86ad6' },
  'hybride-braise-sable': { label: 'Braise + Sable', color: '#e2521f' },
  'hybride-braise-neige': { label: 'Braise + Neige', color: '#c98a86' },
  'hybride-braise-tenebres': { label: 'Braise + Ténèbres', color: '#8f3a72' },
  'hybride-eau-sable': { label: 'Eau + Sable', color: '#7fd4c8' },
  'hybride-eau-neige': { label: 'Eau + Neige', color: '#8fd4ef' },
  'hybride-eau-tenebres': { label: 'Eau + Ténèbres', color: '#6f6fd1' },
  'hybride-sable-neige': { label: 'Sable + Neige', color: '#dfeef0' },
  'hybride-sable-tenebres': { label: 'Sable + Ténèbres', color: '#a98cbf' },
  'hybride-neige-tenebres': { label: 'Neige + Ténèbres', color: '#9b8fd6' },
  'hybride-braise-eau-sable': { label: 'Braise + Eau + Sable', color: '#d8b45a' },
  'hybride-braise-eau-neige': { label: 'Braise + Eau + Neige', color: '#c9a6e0' },
  'hybride-braise-eau-tenebres': { label: 'Braise + Eau + Ténèbres', color: '#8a5fb0' },
  'hybride-braise-sable-neige': { label: 'Braise + Sable + Neige', color: '#e8b98a' },
  'hybride-braise-sable-tenebres': { label: 'Braise + Sable + Ténèbres', color: '#a4657e' },
  'hybride-braise-neige-tenebres': { label: 'Braise + Neige + Ténèbres', color: '#9b6f9a' },
  'hybride-eau-sable-neige': { label: 'Eau + Sable + Neige', color: '#a8e2dc' },
  'hybride-eau-sable-tenebres': { label: 'Eau + Sable + Ténèbres', color: '#7fa3b8' },
  'hybride-eau-neige-tenebres': { label: 'Eau + Neige + Ténèbres', color: '#7f8fd4' },
  'hybride-sable-neige-tenebres': { label: 'Sable + Neige + Ténèbres', color: '#a9a3c9' },
  'hybride-braise-eau-sable-neige': { label: 'Braise + Eau + Sable + Neige', color: '#e6d3a4' },
  'hybride-braise-eau-sable-tenebres': { label: 'Braise + Eau + Sable + Ténèbres', color: '#a67fb0' },
  'hybride-braise-eau-neige-tenebres': { label: 'Braise + Eau + Neige + Ténèbres', color: '#8f7fc4' },
  'hybride-braise-sable-neige-tenebres': { label: 'Braise + Sable + Neige + Ténèbres', color: '#b08aa8' },
  'hybride-eau-sable-neige-tenebres': { label: 'Eau + Sable + Neige + Ténèbres', color: '#8fb8c4' },
  'hybride-braise-eau-sable-neige-tenebres': { label: 'Braise + Eau + Sable + Neige + Ténèbres', color: '#bda3c9' },
  /* Les cadres des armes : le même acier guilloché pour toutes, teinté dans
     la couleur de leur élément (les dégradés métalliques sont peints dans
     `rpg-battle.css`). La clé générique sert de repli. */
  'arme-braise': { label: 'Acier de Braise', color: '#e0412a' },
  'arme-eau': { label: 'Acier d’Eau', color: '#3f9fe8' },
  'arme-sable': { label: 'Acier de Sable', color: '#d8bc86' },
  'arme-neige': { label: 'Acier de Neige', color: '#a9e0f5' },
  'arme-tenebres': { label: 'Acier de Ténèbres', color: '#4b2e83' },
  arme: { label: 'Acier des armes', color: '#9aa6b2' },
};

/** Clé de repli : les cinq couleurs, si une combinaison inconnue apparaissait. */
const CARD_FRAME_FALLBACK_KEY = 'hybride-braise-eau-sable-neige-tenebres';

/** Ordre canonique des couleurs : la clé d'une hybride ne dépend pas de l'ordre déclaré. */
const CARD_FRAME_COLOR_ORDER = RPG_ELEMENTS;

/**
 * Une arme, pour la présentation : une carte `kind: 'arme'` (le prototype), ou
 * une magie dont l'effet est « arme » (le Sabre maudit). Le moteur garde le
 * Sabre parmi les magies (ciblage, `porteur.armes`) ; la carte, elle, doit
 * porter le même cadre, la même ligne de type et les mêmes stats de porteur
 * que les autres armes.
 */
export function carteEstArme(carte) {
  return carte?.kind === 'arme' || carte?.effet?.type === 'arme';
}

/** Bonus porté par une arme (`{ atk, def }`), ou null si la carte n'est pas une arme. */
export function bonusArme(carte) {
  if (carte?.kind === 'arme') return carte.bonus ?? { atk: 0, def: 0 };
  if (carteEstArme(carte)) return { atk: carte.effet.atk ?? 0, def: carte.effet.def ?? 0 };
  return null;
}

/**
 * Les deux familles de sorts, et leur signature visuelle.
 *
 * Le duel distingue la **Magie Rapide** — jouable en réponse, pendant le tour
 * adverse — de la **Sorcellerie**, qui attend son propre tour. Le mot était
 * déjà écrit sur la face (`cardTypeLine`), mais il ne se lisait que là : le
 * cadre, lui, ne dit que l'élément — une Braise rapide et un Djinn de Braise
 * portent le même anneau rouge — et au doigt les faces de jeu n'ont plus de
 * cadre du tout. Un sort ne se distinguait donc d'une créature ou d'un terrain
 * qu'en lisant la ligne de type, écrite en 6 px.
 *
 * Chaque famille garde ici sa teinte et son encre pour le socle, la ligne de
 * type et le halo de jouabilité (voir `rpgSortSignature.jsx` et le bloc « Les
 * familles de sorts » de `rpg-battle.css`). Le jeton, lui, prend la **couleur
 * de la carte** et distingue la famille par sa forme et son sigle : losange
 * et éclair pour la Magie Rapide, cercle et étincelle pour la Sorcellerie.
 * Les deux socles partagent la même voûte ; leur texte garde le nom de la
 * famille même si leurs jetons ont la même couleur d'élément.
 */
export const RPG_SORT_FAMILIES = {
  rapide: { key: 'rapide', label: 'Magie Rapide', teinte: '#ffd619', encre: '#ffe9a0' },
  sorcellerie: { key: 'sorcellerie', label: 'Sorcellerie', teinte: '#b39ae0', encre: '#ece3ff' },
};

/**
 * La famille de sort d'une carte : `'rapide'`, `'sorcellerie'`, ou `null` pour
 * tout ce qui n'est pas un sort — créature, héros, terrain, et arme. Le Sabre
 * maudit est une magie pour le moteur, mais sa carte se présente comme une
 * arme : elle garde le cadre d'acier et ne porte pas la signature des sorts.
 */
export function magieFamille(carte) {
  if (carte?.kind !== 'magie' || carteEstArme(carte)) return null;
  return carte.instant ? 'rapide' : 'sorcellerie';
}

/** Le libellé, la teinte et l'encre de la famille de sort, ou `null` hors sort. */
export function magieFamilleInfo(carte) {
  const key = magieFamille(carte);
  return key ? { ...RPG_SORT_FAMILIES[key] } : null;
}

/**
 * Le motif gravé dans le cadre d'une carte, quand son type en mérite un autre
 * que la résille commune — celle que `.rpg-battle` pose à tous les cadres :
 *
 * - `losange` — **le losange de la Magie Rapide** : un diamant taillé, net et
 *   régulier, tous les 8 px le long de l'anneau — la réponse part sans
 *   attendre, et son cadre le dit sans un mot ; la famille garde son éclair au
 *   socle (`rpgSortSignature.jsx`) : le socle porte l'icône, l'anneau le
 *   dessin ;
 * - `etincelle` — **l'étincelle de la Sorcellerie** : le dessin de son sigle,
 *   celui du sort qu'on prépare à son tour ;
 * - `terrain` — **les strates**, les assises de pierre : la carte qu'on pose,
 *   pas celle qui passe.
 *
 * Chaque type a son dessin d'anneau, et le terrain le sien. Deux exclusions
 * voulues : le Sabre maudit
 * est une magie pour le moteur mais son cadre est celui des armes — il garde
 * l'acier guilloché (voir `magieFamille`) — et une carte mythique garde le
 * zellige qui dit sa rareté, car le CSS ne pose ces motifs que sous
 * `:not(.rpg-card--mythique)`. Créatures, héros et armes n'ont que la résille
 * commune.
 */
export const RPG_CARD_MOTIFS = {
  losange: { key: 'losange', label: 'Magie Rapide', motif: 'le losange taillé de la Magie Rapide' },
  etincelle: { key: 'etincelle', label: 'Sorcellerie', motif: 'l’étincelle de la Sorcellerie' },
  terrain: { key: 'terrain', label: 'Terrain', motif: 'les strates des assises' },
};

/** La clé de motif d'une carte, ou `null` si son type porte la résille commune. */
export function motifCarte(carte) {
  if (carte?.kind === 'terrain') return 'terrain';
  const famille = magieFamille(carte);
  if (famille === 'rapide') return 'losange';
  if (famille === 'sorcellerie') return 'etincelle';
  return null;
}

/** Le libellé et le dessin du motif d'une carte, ou `null` pour un type sans motif. */
export function motifInfo(carte) {
  const key = motifCarte(carte);
  return key ? { ...RPG_CARD_MOTIFS[key] } : null;
}

/** La classe de motif d'une carte — le dessin gravé dans son cadre. */
export function cardMotifClass(carte) {
  const key = motifCarte(carte);
  return key ? `rpg-card--motif-${key}` : '';
}

/** Clé et couleur de cadre d'une carte : élément seul, ou combinaison multicolore. */
export function cardFrameInfo(carte) {
  // Les armes gardent la matière commune des armes — acier guilloché peint
  // par la classe `rpg-card--frame-arme` — mais leur teinte suit leur
  // élément : acier doré du Sable, acier bleu de l'Eau, et ainsi de suite.
  if (carteEstArme(carte)) {
    const couleur = cardColors(carte)[0] ?? 'sable';
    return { key: 'arme', ...(CARD_FRAME_COLORS[`arme-${couleur}`] ?? CARD_FRAME_COLORS.arme) };
  }
  const colors = cardColors(carte).slice().sort(
    (a, b) => CARD_FRAME_COLOR_ORDER.indexOf(a) - CARD_FRAME_COLOR_ORDER.indexOf(b),
  );
  const key = colors.length > 1
    ? `hybride-${colors.join('-')}`
    : (Object.hasOwn(CARD_FRAME_COLORS, colors[0]) ? colors[0] : 'sable');
  const known = Object.hasOwn(CARD_FRAME_COLORS, key) ? key : CARD_FRAME_FALLBACK_KEY;
  return { key: known, ...CARD_FRAME_COLORS[known] };
}

/** Les mythiques conservent leur couleur de cadre et leur motif propre. */
export function cardHasMythicFrame(carte) {
  return cardRarityInfo(carte).key === 'mythique';
}

/** Seuls les cadres mythiques mono-élément brillent : une hybride garde sa diagonale fixe. */
export function cardHasShinyFrame(carte) {
  return cardHasMythicFrame(carte) && !cardFrameInfo(carte).key.startsWith('hybride-');
}

/** Couleur du cadre : l'élément ou la combinaison, quelle que soit la rareté. */
export function cardFrameColor(carte) {
  return cardFrameInfo(carte).color;
}

/** Classes communes à toutes les présentations d'une carte du Sablier. */
export function cardFrameClass(carte) {
  const classes = [`rpg-card--frame-${cardFrameInfo(carte).key}`];
  // Une arme ajoute la teinte d'acier de son élément à la matière commune.
  if (carteEstArme(carte)) {
    const couleurArme = cardColors(carte)[0];
    if (couleurArme) classes.push(`rpg-card--frame-arme-${couleurArme}`);
  }
  if (cardHasShinyFrame(carte)) classes.push('rpg-card--frame-brillant');
  if (cardHasMythicFrame(carte)) classes.push('rpg-card--mythique');
  return classes.join(' ');
}

export const CARD_KIND_LABELS = {
  physique: 'Attaque',
  magie: 'Sort',
  soin: 'Soin',
  statut: 'Utilité',
};

/**
 * Le cadre d'acier d'une arme, porté par la créature qu'elle équipe.
 *
 * Depuis que la carte d'arme ne se glisse plus derrière son porteur, c'est
 * l'anneau de la créature qui dit l'équipement : elle reçoit la matière des
 * armes (`rpg-card--frame-arme`) teintée par l'élément de son arme, comme la
 * carte d'arme elle-même. On ne reprend pas `cardFrameClass`, qui ajoute la
 * variante brillante des mythiques : le porteur n'est pas mythique, son cadre
 * ne doit pas se mettre à respirer. Rend `''` pour une carte qui n'est pas
 * une arme.
 */
export function armeCadreClass(carte) {
  if (!carteEstArme(carte)) return '';
  const couleur = cardColors(carte)[0];
  return `rpg-card--frame-arme${couleur ? ` rpg-card--frame-arme-${couleur}` : ''}`;
}

/**
 * Les créatures du duel — façon Magic : un coût en sable, ⚔ l'attaque,
 * 🛡 la défense, et parfois une capacité À L'ARRIVÉE ou QUAND ELLES
 * MEURENT. Set jouable : créatures, héros, terrains et sorts composent les decks.
 */
export const RPG_CREATURE_CARDS = [
  ...RPG_SOLEIL_ROUGE_CREATURES,
  ...RPG_TENEBRES_CREATURES,
  {
    id: 'fennec-des-decombres',
    name: 'Fennec des décombres',
    element: 'sable',
    cost: 2,
    atk: 3,
    def: 1,
    rarity: 'inhabituelle',
    typeLine: 'Créature — Fennec',
    rapidite: true, butin: true, text: 'Rapidité — Cette créature peut attaquer le tour où elle arrive. Butin — Quand cette créature touche le sorcier adverse, piochez une carte puis défaussez-en une.',
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
    typeLine: 'Créature — Chien', butin: true, text: 'Butin — Quand cette créature touche le sorcier adverse, piochez une carte puis défaussez-en une.',
    flavor: 'Il n’aboie pas. Il compte.',
  },
  {
    id: 'porteuse-de-cruches',
    name: 'Porteuse de cruches',
    element: 'eau',
    cost: 2,
    atk: 0,
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
    atk: 1,
    def: 3,
    rarity: 'commune',
    typeLine: 'Créature — Vigie',
    arrivee: { type: 'heures', compteurs: 2, effetFinal: [ { type: 'degats', amount: 2, cible: 'sorcier' }, { type: 'pioche', amount: 1 } ] }, text: 'Quand le Guetteur arrive : mettez 2 compteurs d’Heures sur lui. Au début de chacun de vos tours, retirez-en un ; quand le dernier part, il inflige 2 dégâts au sorcier adverse et vous piochez une carte.',
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
    arrivee: { type: 'debuff', atk: -2, def: 0, cible: 'creature', empecheAttaque: true, tours: 1 }, text: 'Quand la Vipère arrive : choisissez une créature adverse — son venin lui retire 2 attaques et elle ne pourra pas attaquer jusqu’à la fin de son prochain tour.',
    flavor: 'Elle se brise, mais d’abord elle tranche.',
  },
  {
    id: 'dune-marchante',
    name: 'Dune marchante',
    element: 'sable',
    cost: 4,
    atk: 2,
    def: 4,
    rarity: 'commune',
    typeLine: 'Créature — Élémental', destruction: { type: 'recyclage', cible: 'magie-cimetiere' }, text: 'Quand la Dune meurt : renvoyez une magie de votre cimetière dans votre main.',
    flavor: 'Le vent la déplace. Elle revient toujours devant la porte.',
  },
    {
      id: 'faussoyeur-des-dunes', name: 'Faussoyeur des dunes', element: 'sable', cost: 3, atk: 2, def: 2,
      rarity: 'inhabituelle', typeLine: 'Créature — Pillard', art: 'faussoyeur-des-dunes',
      butin: true,
      arrivee: { type: 'recyclage', cible: 'creature-cimetiere' },
      text: 'Butin — Quand cette créature touche le sorcier adverse, piochez une carte puis défaussez-en une. Quand le Faussoyeur arrive : renvoyez une créature de votre cimetière dans votre main.',
      flavor: 'Ce que les dunes enterrent, il le déterre.',
    },
  {
    id: 'scribe-de-la-liste',
    name: 'Scribe de la Liste',
    element: 'sable',
    cost: 3,
    atk: 2, def: 3,
    rarity: 'rare',
    typeLine: 'Créature — Scribe',
    destruction: { type: 'recyclage', cible: 'carte-cimetiere' }, text: 'Quand le Scribe meurt : renvoyez une carte de votre cimetière dans votre main.',
    flavor: 'Sa mort est déjà notée. En double exemplaire.',
  },
  {
    id: 'sonneur-fele',
    name: 'Sonneur fêlé',
    element: 'eau',
    cost: 3,
    atk: 2,
    def: 3,
    rarity: 'inhabituelle',
    typeLine: 'Créature — Sonneur',
    art: 'sonneur-fele',
    arrivee: { type: 'retour-main', cible: 'creature' },
    text: 'Rebond — Quand le Sonneur arrive : il renvoie la créature ciblée dans la main de son propriétaire.',
    flavor: 'Un seul coup de bâton sur le bronze fêlé, et l’écho chasse l’intrus.',
  },
  {
    id: 'colosse-de-sel',
    name: 'Colosse de sel',
    element: 'eau',
    cost: 6,
    atk: 6, def: 6,
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
    atk: 3, def: 3,
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
    atk: 2, def: 1,
    rarity: 'commune',
    typeLine: 'Créature — Éclaireur',
    art: 'faiseur-de-passage',
    arrivee: { type: 'donne', cible: 'allie', donne: { infiltration: true }, tours: 1 }, text: 'Quand le Faiseur arrive : une créature alliée ciblée gagne Infiltration jusqu’à la fin du tour.',
    flavor: 'Il trouve une porte là où les autres voient un mur.',
  },
  // ── Veilleurs du Désert : personnages originaux inspirés des peuples amazighs d’Algérie ──
  {
    id: 'tislit-des-aures',
    name: 'Tislit, éclaireuse des Aurès',
    element: 'sable',
    cost: 1,
    atk: 1, def: 1,
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
    atk: 2, def: 1,
    rarity: 'commune',
    typeLine: 'Créature — Amazighe kabyle',
    art: 'tiziri-du-djurdjura',
    protection: { contre: 'braise' },
    text: 'À son arrivée, Tiziri est protégée contre la Braise de façon permanente.',
    flavor: 'Son chant rassemble les villages avant la tempête.',
  },
  {
    id: 'amani-des-ksour',
    name: 'Amani, gardienne des ksour',
    element: 'sable',
    cost: 4,
    atk: 2,
    def: 5,
    rarity: 'rare',
    typeLine: 'Créature — Amazighe mozabite',
    art: 'amani-des-ksour',
    // Égide de la Gardienne — aura de camp, comme l'aura Sable de Tarek, mais
    // en défense : tant qu'Amani est en jeu, les AUTRES créatures de son camp
    // gagnent +0/+2 (le moteur la tient dans `appliquerAuraAmani`). L'égide se
    // cumule par Amani présente : une seconde Amani double le bonus, et les
    // Amani se protègent l'une l'autre.
    aura: { type: 'buff-autres', atk: 0, def: 2 },
    text: 'Tant qu’Amani est en jeu, vos autres créatures gagnent +0/+2.',
    flavor: 'Les portes de pierre tiennent parce que quelqu’un veille.',
  },
  {
    id: 'amayas-du-hoggar',
    name: 'Amayas, guide du Hoggar',
    element: 'sable',
    cost: 3,
    atk: 2,
    def: 2,
    rarity: 'commune',
    typeLine: 'Créature — Guide touareg',
    art: 'amayas-du-hoggar',
    protection: { contre: 'tenebres' },
    destruction: { type: 'pioche', amount: 1 },
    text: 'Amayas est protégé contre les Ténèbres de façon permanente. Quand il meurt : piochez une carte.',
    flavor: 'Même perdu, il laisse une piste pour ceux qui suivent.',
  },
  // ── Djinns et sorcellerie du Brasier ──────────────────────────────────
  {
    id: 'ghul-des-cendres',
    name: 'Ghul des cendres',
    element: 'braise',
    cost: 1,
    atk: 1,
    def: 1,
    rarity: 'commune',
    typeLine: 'Créature — Ghul',
    art: 'ghul-des-cendres',
    destruction: { type: 'degats', amount: 1, cible: 'creature' },
    text: 'Quand le Ghul est détruit : 1 dégât à une créature adverse de votre choix.',
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
    cost: 5,
    atk: 4,
    def: 4,
    rarity: 'mythique',
    typeLine: 'Créature légendaire — Oiseau de feu',
    art: 'anqa-des-braises',
    envol: true,
    destruction: { type: 'retour-apres-tours', tours: 4 },
    text: 'Envol — Ne peut être bloquée que par une créature avec Envol. Quand Anqa est détruite : elle revient en jeu après quatre tours.',
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
    destruction: { type: 'degats', amount: 4, cible: 'sorcier' },
    text: 'Quand l’Ifrit est détruit : son brasier éclate — 4 dégâts au sorcier adverse.',
    flavor: 'Les dunes rougissent avant même qu’il apparaisse.',
  },
  {
    id: 'braisier-du-souk',
    name: 'Braisier du souk',
    element: 'braise',
    cost: 3,
    atk: 2, def: 2,
    rarity: 'rare',
    typeLine: 'Créature — Souffleur',
    art: 'braisier-du-souk',
    arrivee: { type: 'degats', amount: 1, cible: 'toutes-creatures', etSorcier: 1 },
    text: 'Quand le Braisier arrive : 1 dégât à toutes les créatures adverses et 1 dégât au sorcier adverse.',
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
    art: 'cavalier-amazigh-du-desert', arrivee: { type: 'combat', cible: 'creature' },
    text: 'Quand le Cavalier arrive : il se bat contre une créature adverse ciblée. Chacun inflige à l’autre un nombre de dégâts égal à son attaque.',
    flavor: 'Sa monture blanche fend la poussière ; le sabre ouvre la route au milieu du tumulte.',
  },
  {
    id: 'djinn-de-foudre',
    name: 'Djinn de foudre',
    element: 'sable',
    colors: ['sable', 'braise'],
    colorCost: { sable: 1, braise: 1 },
    cost: 2,
    atk: 2,
    def: 1,
    rarity: 'inhabituelle',
    typeLine: 'Créature — Djinn',
    art: 'djinn-de-foudre',
    rapidite: true,
    coupRapide: true,
    text: 'Rapidité. Coup rapide — Sélectionné pour attaquer, le Djinn peut frapper une créature adverse de votre choix : il lui inflige ses dégâts d’attaque, sans riposte, et son attaque s’arrête là. Si vous ne désignez personne, il attaque normalement.',
    flavor: 'Il jaillit de l’orage sec avant que le tonnerre n’ait touché la dune.',
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
    text: 'Furie 1 — La première fois qu’il est blessé et survit, le Guerrier gagne +1/+1. Quand il arrive : il reçoit un bouclier de 1.',
    flavor: 'Il ne recule pas : il glisse — et le coup reçu le durcit.',
  },
  {
    id: 'loup-des-neiges',
    name: 'Loup des neiges',
    element: 'neige',
    cost: 3,
    atk: 3,
    def: 3,
    rarity: 'commune',
    typeLine: 'Créature — Loup',
    art: 'loup-des-neiges',
    text: '—',
    flavor: 'La meute court sur la croûte gelée sans la briser.',
  },
  {
    id: 'scalde-des-runes',
    name: 'Scalde des runes',
    element: 'neige',
    cost: 3,
    atk: 2,
    def: 2,
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
    atk: 3, def: 3,
    rarity: 'rare',
    typeLine: 'Créature — Valkyrie',
    art: 'valkyrie-au-corbeau',
    resonance: 1,
    envol: true,
    text: 'Résonance — Tant qu’elle est en jeu, toutes les créatures Neige de la table gagnent +1/+1. Envol — Ne peut être bloquée que par une créature avec Envol.',
    flavor: 'Le corbeau tourne une fois, puis la mêlée se souvient de son nom.',
  },
  {
    id: 'berserk-des-trois-hivers',
    name: 'Berserk des trois hivers',
    element: 'neige',
    cost: 4,
    atk: 2, def: 4,
    rarity: 'rare',
    typeLine: 'Créature — Berserk viking',
    art: 'berserk-des-trois-hivers',
    furie: 2,
    coupRapide: true,
    text: 'Furie 2 — La première fois qu’il est blessé et survit, le Berserk gagne +2/+2. Coup rapide — Sélectionné pour attaquer, il peut frapper une créature adverse de votre choix : il lui inflige ses dégâts d’attaque, sans riposte, et son attaque s’arrête là. Si vous ne désignez personne, il attaque normalement.',
    flavor: 'Trois hivers de rage tenus dans un seul bras — et le sang ne fait que l’attiser.',
  },
  {
    id: 'jarl-au-marteau-de-guerre',
    name: 'Jarl au marteau de guerre',
    element: 'neige',
    cost: 5,
    atk: 3, def: 4,
    rarity: 'rare',
    typeLine: 'Créature — Jarl viking',
    art: 'jarl-au-marteau-de-guerre',
    furie: 3,
    text: 'Furie 3 — La première fois qu’il est blessé et survit, le Jarl gagne +3/+3.',
    flavor: 'Le vieux chef ne crie pas : il encaisse, puis il avance.',
  },
  {
    id: 'valkyrie-des-glaces',
    name: 'Valkyrie des glaces',
    element: 'neige',
    cost: 5,
    atk: 4, def: 4,
    rarity: 'rare',
    typeLine: 'Créature — Valkyrie',
    art: 'valkyrie-des-glaces',
    resonance: 1,
    envol: true,
    arrivee: { type: 'degats', amount: 2, cible: 'creature' },
    text: 'Résonance — Tant qu’elle est en jeu, toutes les créatures Neige de la table gagnent +1/+1. Envol — Ne peut être bloquée que par une créature avec Envol. Quand elle arrive : choisissez une créature adverse — sa lance de givre lui inflige 2 dégâts.',
    flavor: 'Elle choisit qui monte, et qui reste dans la neige.',
  },
  {
    id: 'geant-des-banquises',
    name: 'Géant des banquises',
    element: 'neige',
    cost: 6,
    atk: 5,
    def: 5,
    rarity: 'rare',
    typeLine: 'Créature — Géant',
    art: 'geant-des-banquises',
    arrivee: { type: 'gel', cible: 'toutes-creatures' },
    text: 'Quand le Géant arrive : son souffle fige la banquise — les créatures adverses sont gelées : ni attaque ni blocage jusqu’à la fin de leur prochain tour.',
    flavor: 'La banquise craque bien avant qu’il n’apparaisse.',
  },
  {
    id: 'drakkar-a-tete-de-dragon',
    name: 'Drakkar à tête de dragon',
    element: 'neige',
    cost: 5,
    atk: 3,
    def: 6,
    rarity: 'rare',
    typeLine: 'Créature — Navire viking',
    art: 'drakkar-a-tete-de-dragon',
    destruction: { type: 'pioche', amount: 2 },
    text: 'Quand le Drakkar est détruit : l’épave rend ses coffres — piochez deux cartes.',
    flavor: 'Quarante rameurs, une proue de dragon, et la brume qui s’ouvre.',
  },
  // ── Bêtes marines mythiques (deck Marée des abysses) ───────────────────
  {
    id: 'kraken',
    name: 'Kraken',
    element: 'eau',
    cost: 5,
    atk: 2,
    def: 5,
    rarity: 'mythique',
    typeLine: 'Créature légendaire — Bête marine',
    arrivee: { type: 'magie-gratuite' },
    text: 'Quand le Kraken arrive : vous pouvez lancer une magie rapide ou une sorcellerie de votre main sans payer son coût de mana.',
    flavor: 'Il ne laisse que des bateaux vides et des récits.',
  },
  {
    id: 'leviathan',
    name: 'Léviathan',
    element: 'eau',
    cost: 6,
    atk: 5,
    def: 6,
    rarity: 'mythique',
    typeLine: 'Créature légendaire — Bête marine',
    arrivee: { type: 'retour-main', cible: 'toutes-autres' }, text: 'Quand le Léviathan arrive : renvoyez toutes les autres créatures dans la main de leur propriétaire.',
    flavor: 'Nul ne le dompte, et nul ne l’a jamais vu en entier.',
  },
  {
    id: 'bakunawa',
    name: 'Bakunawa',
    element: 'eau',
    cost: 4,
    atk: 3,
    def: 6,
    rarity: 'mythique',
    typeLine: 'Créature légendaire — Serpent lunaire',
    arrivee: { type: 'empeche-blocage', cible: 'creature', tours: 1 }, text: 'Quand Bakunawa arrive : choisissez une créature adverse — la lune dévorée l’empêche de bloquer jusqu’à la fin de son prochain tour.',
    flavor: 'Il avale tout ce qui brille sur la table.',
  },
  {
    id: 'jormungandr',
    name: 'Jörmungandr',
    element: 'eau',
    cost: 8,
    atk: 7,
    def: 6,
    rarity: 'mythique',
    typeLine: 'Créature légendaire — Serpent du monde',
    arrivee: { type: 'pioche-defausse', pioche: 3, defausse: 1 },
    text: 'Quand Jörmungandr arrive : piochez 3 cartes et défaussez une carte.',
    flavor: 'Il tient le monde dans sa queue. Il lâche prise pour frapper.',
  },
];

/**
 * Les créatures-jetons : des créatures **créées par l'effet d'une carte**,
 * jamais piochées, jamais payées, jamais dans un deck ni dans la collection.
 * Tarek dresse ainsi deux chiens de sable à son arrivée (`arrivee.type ===
 * 'jetons'`, moteur). Une fois en jeu, un jeton se comporte comme n'importe
 * quelle créature — il attaque, bloque et meurt comme elle — mais il n'a pas
 * de coût : son illustration suit la direction artistique commune
 * (`RPG-CARD-ART.md`) et il n'entre jamais dans une main (voir
 * `renvoyerEnMain`, qui le fait disparaître au lieu de le renvoyer).
 */
export const RPG_JETON_CARDS = [
  ...RPG_SOLEIL_ROUGE_JETONS,
  ...RPG_TENEBRES_JETONS,
  {
    id: 'chien-de-sable',
    name: 'Chien de sable',
    // Le pluriel du journal (« TAREK crée 2 chiens de sable »).
    pluriel: 'chiens de sable',
    element: 'sable',
    cost: 0,
    atk: 1,
    def: 1,
    rarity: 'commune',
    kind: 'creature',
    jeton: true,
    rapidite: true,
    typeLine: 'Créature-jeton — Chien de sable',
    text: 'Un chien de sable créé par Tarek à son arrivée : 1/1 avec Rapidité, sans coût.',
    flavor: 'Il se lève du sable comme la dune se lève du vent.',
  },
  {
    id: 'serpent-des-citernes',
    name: 'Serpent des citernes',
    pluriel: 'serpents des citernes',
    element: 'eau',
    cost: 0,
    atk: 3,
    def: 1,
    rapidite: true,
    rarity: 'commune',
    kind: 'creature',
    jeton: true,
    typeLine: 'Créature-jeton — Serpent',
    text: 'Un serpent des citernes appelé par le Bâton : 3/1, Rapidité, détruit à la fin du tour.',
    flavor: 'Il ne garde les citernes qu’une marée à la fois.',
  },
  // ── Tours de défense : une par couleur ─────────────────────────────────────
  {
    id: 'tour-de-braise',
    name: 'Tour de Braise',
    element: 'braise',
    cost: 3,
    atk: 0,
    def: 5,
    rarity: 'commune',
    typeLine: 'Créature — Tour de défense',
    art: 'tour-de-braise',
    doitBloquer: true,
    prioriteAttaqueRapide: true,
    arrivee: { type: 'degats', amount: 1, cible: 'creature' },
    text: 'Doit bloquer — Cette créature doit bloquer une créature attaquante adverse chaque tour si possible. Priorité d’attaque rapide — Les créatures adverses avec Attaque rapide doivent attaquer cette tour en priorité si elles peuvent. Quand la Tour arrive : infligez 1 dégât à une créature adverse.',
    flavor: 'Elle brûle ceux qui osent s’en approcher.',
  },
  {
    id: 'tour-des-flots',
    name: 'Tour des Flots',
    element: 'eau',
    cost: 3,
    atk: 0,
    def: 5,
    rarity: 'commune',
    typeLine: 'Créature — Tour de défense',
    art: 'tour-des-flots',
    doitBloquer: true,
    prioriteAttaqueRapide: true,
    arrivee: { type: 'soin', amount: 2 },
    text: 'Doit bloquer — Cette créature doit bloquer une créature attaquante adverse chaque tour si possible. Priorité d’attaque rapide — Les créatures adverses avec Attaque rapide doivent attaquer cette tour en priorité si elles peuvent. Quand la Tour arrive : vous récupérez 2 points de vie.',
    flavor: 'Les vagues se brisent contre ses fondations sans fin.',
  },
  {
    id: 'tour-de-sable',
    name: 'Tour de Sable',
    element: 'sable',
    cost: 4,
    atk: 1,
    def: 6,
    rarity: 'inhabituelle',
    typeLine: 'Créature — Tour de défense',
    art: 'tour-de-sable',
    doitBloquer: true,
    prioriteAttaqueRapide: true,
    arrivee: { type: 'bouclier', amount: 1, cible: 'creature-amie' },
    text: 'Doit bloquer — Cette créature doit bloquer une créature attaquante adverse chaque tour si possible. Priorité d’attaque rapide — Les créatures adverses avec Attaque rapide doivent attaquer cette tour en priorité si elles peuvent. Quand la Tour arrive : une créature alliée ciblée reçoit un bouclier de 1.',
    flavor: 'Le désert lui-même se dresse en rempart.',
  },
  {
    id: 'tour-de-neige',
    name: 'Tour de Neige',
    element: 'neige',
    cost: 4,
    atk: 0,
    def: 6,
    rarity: 'rare',
    typeLine: 'Créature — Tour de défense',
    art: 'tour-de-neige',
    doitBloquer: true,
    prioriteAttaqueRapide: true,
    arrivee: { type: 'gel', cible: 'creature' },
    text: 'Doit bloquer — Cette créature doit bloquer une créature attaquante adverse chaque tour si possible. Priorité d’attaque rapide — Les créatures adverses avec Attaque rapide doivent attaquer cette tour en priorité si elles peuvent. Quand la Tour arrive : une créature adverse ciblée est gelée et ne peut pas attaquer ou bloquer jusqu’à la fin du prochain tour.',
    flavor: 'Le froid l’enveloppe, et le temps s’arrête.',
  },
  {
    id: 'tour-des-tenebres',
    name: 'Tour des Ténèbres',
    element: 'tenebres',
    cost: 5,
    atk: 0,
    def: 7,
    rarity: 'mythique',
    typeLine: 'Créature — Tour de défense',
    art: 'tour-des-tenebres',
    doitBloquer: true,
    prioriteAttaqueRapide: true,
    arrivee: { type: 'degats', amount: 2, cible: 'toutes-creatures', etSorcier: false },
    text: 'Doit bloquer — Cette créature doit bloquer une créature attaquante adverse chaque tour si possible. Priorité d’attaque rapide — Les créatures adverses avec Attaque rapide doivent attaquer cette tour en priorité si elles peuvent. Quand la Tour arrive : infligez 2 dégâts à toutes les créatures adverses.',
    flavor: 'L’ombre qu’elle projette étouffe toute lumière.',
  },
];

/** Retrouve une créature-jeton par son identifiant. */
export function jetonById(id) {
  return RPG_JETON_CARDS.find((card) => card.id === id) ?? null;
}

export function creatureById(id) {
  return RPG_CREATURE_CARDS.find((card) => card.id === id)
    ?? RPG_JETON_CARDS.find((card) => card.id === id)
    ?? null;
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
    arrivee: { type: 'bouclier-lumiere' },
    text: 'Quand Salem arrive : il reçoit un bouclier de lumière. Tant que ce bouclier n’est pas touché par une attaque ou une magie ennemie, Salem ne peut pas subir de dégâts.',
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
    arrivee: { type: 'soin-creatures', amount: 2, etJoueur: 5 },
    text: 'Quand Yamina arrive : soignez chacune de vos créatures de 2, et vous regagnez 5 PV.',
    flavor: 'Je compte avant de signer.',
  },
  {
    id: 'boualem',
    name: 'BOUALEM',
    role: 'Le Puisatier',
    element: 'eau',
    cost: 3,
    atk: 3,
    def: 4,
    rarity: 'mythique',
    kind: 'hero',
    typeLine: 'Créature légendaire — Héros',
    text: 'Une fois pendant la partie, quand Boualem est ciblé par un effet de carte adverse ou une magie adverse, cet effet ou cette magie est contrecarré.',
    flavor: 'Moi je fais monter ce qui aide.',
  },
  {
    id: 'feriel',
    name: 'FÉRIEL',
    role: 'La Souffleuse de verre',
    element: 'braise',
    cost: 4,
    atk: 3, def: 2,
    rarity: 'mythique',
    kind: 'hero',
    typeLine: 'Créature légendaire — Héros',
    rapidite: true,
    coupRapide: true,
    text: 'Rapidité. Coup rapide — Sélectionnée pour attaquer, Fériel peut frapper une créature adverse de votre choix : elle lui inflige ses dégâts d’attaque, sans riposte, et son attaque s’arrête là. Si vous ne désignez personne, elle attaque normalement.',
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
    aura: { type: 'buff-element', element: 'sable', atk: 1, def: 1 },
    arrivee: { type: 'jetons', jeton: 'chien-de-sable', nombre: 2 },
    text: 'Quand Tarek arrive en jeu, il crée deux chiens de sable 1/1 avec Rapidité sans coût. Tant que Tarek est en jeu, vos créatures Sable gagnent +1/+1.',
    flavor: 'Il frappe avec ce qu’il porte.',
  },
  {
    id: 'tin-hinan',
    name: 'Tin Hinan, mère des pistes',
    role: 'Matriarche touarègue',
    element: 'sable',
    cost: 5,
    atk: 3,
    def: 3,
    rarity: 'mythique',
    kind: 'hero',
    typeLine: 'Créature légendaire — Matriarche touarègue',
    art: 'tin-hinan-des-pistes',
    arrivee: { type: 'infiltration', cible: 'autres-allies', tours: 1 },
    text: 'Quand Tin Hinan arrive : vos autres créatures gagnent Infiltration jusqu’à la fin du tour.',
    flavor: 'Dans la mémoire des pistes, elle ouvre la route et rassemble les siens.',
  },
  {
    id: 'ifrit-al-ahmar',
    name: 'Ifrit al-Ahmar, seigneur des braises',
    role: 'Souverain des cendres',
    element: 'braise',
    cost: 5,
    atk: 2,
    def: 2,
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
    cost: 6,
    atk: 5,
    def: 5,
    rarity: 'mythique',
    kind: 'hero',
    typeLine: 'Créature légendaire — Héros',
    art: 'pere-des-corbeaux',
    envol: true,
    arrivee: { type: 'exil', cible: 'creature', coutMax: 3 },
    text: 'Envol — Ne peut être bloqué que par une créature avec Envol. Quand il arrive : ses corbeaux emportent une créature de coût 3 ou moins — elle est exilée, retirée de la partie.',
    flavor: 'Il a donné un œil pour savoir, et ne l’a jamais regretté.',
  },
  {
    id: 'maitre-du-marteau',
    name: 'LE MAÎTRE DU MARTEAU',
    role: 'Le Tonnerre',
    element: 'neige',
    cost: 6,
    atk: 5,
    def: 5,
    rarity: 'mythique',
    kind: 'hero',
    typeLine: 'Créature légendaire — Héros',
    art: 'maitre-du-marteau',
    arrivee: { type: 'degats', amount: 2, cible: 'toutes-creatures' },
    furie: 3,
    tenacite: true,
    text: 'Quand il arrive : son marteau tombe — 2 dégâts à toutes les créatures adverses. Furie 3 — La première fois qu’il est blessé et survit, le Maître gagne +3/+3. Tenacité — Une fois par partie, s’il doit être détruit, il survit et il lui reste 1 point de défense.',
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
    rarity: 'mythique',
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
    rarity: 'mythique',
    kind: 'hero',
    typeLine: 'Créature légendaire — Serpent',
    art: 'serpent-du-monde',
    protectionSorts: true,
    overkill: true,
    text: 'Protection — Le Serpent est protégé contre les magies rapides et les sorcelleries : aucun sort ne peut le cibler ni le blesser. Overkill — Quand il attaque et qu’on le bloque, l’excédent de sa force au-delà des bloqueurs perce jusqu’au sorcier adverse.',
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

/*
 * Les sept decks du jeu sont composés en fin de fichier à partir de recettes
 * et du catalogue. Ils gardent leurs mécaniques de signature, une mythique
 * chacun et un quota global de rares ; le composeur complète les places restantes
 * par puissance. Le reste des cartes de ces paliers reste à obtenir au Souk.
 */

/**
 * Illustrations provisoires : une carte dont le plein art n'est pas encore
 * peint peut être déclarée ici — elle affiche alors un recadrage étalonné d'une
 * illustration existante (direction artistique : `RPG-CARD-ART.md`). La liste
 * est vide : les dix-huit cartes hors terrain du Serment des Neuf Hivers, le
 * Glacier et sa variante ont leur peinture dédiée. Chaque entrée doit
 * disparaître le jour où la peinture originale remplace le fichier
 * `public/cards/<id>.jpg`.
 */
export const RPG_ART_PROVISOIRE = [];

/**
 * Raretés d'exception : une seule copie par deck. Les raretés du Sablier sont
 * celles de Magic — commune, inhabituelle, rare, mythique — et seule la
 * mythique est unique.
 */
export const CARD_UNIQUE_RARITIES = ['mythique'];

/** Exemplaires autorisés dans un deck : terrains illimités, raretés d'exception
 *  à un exemplaire, tout le reste à deux. */
export function cardCopyLimit(card) {
  if (card?.kind === 'terrain') return Infinity;
  return CARD_UNIQUE_RARITIES.includes(card?.rarity) ? 1 : 2;
}

/** Cartes conservées dans les archives, mais incompatibles avec le mana automatique. */
export const RPG_CARTES_HORS_FORMAT = Object.freeze(['boussole-du-hoggar', 'djinn-du-souk']);
export const carteJouableSansTerrain = (carte) => Boolean(carte && carte.kind !== 'terrain'
  && !RPG_CARTES_HORS_FORMAT.includes(carte.id));

/** Conversion déterministe des anciennes recettes. Ne modifie jamais la source.
 * Les cartes ajoutées respectent l'identité et les quotas. Avec une collection,
 * seules les cartes possédées peuvent compléter un ancien deck maison. */
export function convertirDeckSansTerrain(ids, collection = null) {
  const resultat = ids.filter((id) => carteJouableSansTerrain(cardById(id)));
  const couleurs = [...new Set(resultat.flatMap((id) => cardColors(id)))];
  if (!couleurs.length) couleurs.push('sable');
  const comptes = {};
  const retenues = resultat.filter((id) => {
    comptes[id] = (comptes[id] ?? 0) + 1;
    return comptes[id] <= cardCopyLimit(cardById(id));
  }).slice(0, 30);
  const candidats = RPG_DUEL_CARDS.filter((carte) => carteJouableSansTerrain(carte)
    && cardColors(carte).every((c) => couleurs.includes(c))
    && (!collection || collection.includes(carte.id)))
    .sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0) || a.id.localeCompare(b.id));
  // D'abord les cartes de la recette, puis les renforts du catalogue.
  const ordre = [...new Set([...retenues, ...candidats.map((c) => c.id)])];
  for (const id of ordre) {
    if (collection && !collection.includes(id)) continue;
    while (retenues.length < 30 && retenues.filter((c) => c === id).length < cardCopyLimit(cardById(id))) retenues.push(id);
    if (retenues.length === 30) break;
  }
  return retenues;
}

/** Format commun : trente cartes, zéro terrain, une à trois couleurs. */
export function rpgValiderDeck(deck) {
  if (!Array.isArray(deck) || deck.length !== 30) return { ok: false, raison: '30 cartes exigées' };
  const comptes = {};
  const couleurs = new Set();
  for (const id of deck) {
    const carte = cardById(id);
    if (!carteJouableSansTerrain(carte)) return { ok: false, raison: `carte hors format : ${id}` };
    cardColors(carte).forEach((c) => couleurs.add(c));
    comptes[id] = (comptes[id] ?? 0) + 1;
    if (comptes[id] > cardCopyLimit(carte)) return { ok: false, raison: `${id} ${carte.rarity} en ${comptes[id]} exemplaires (${cardCopyLimit(carte)} max)` };
  }
  if (couleurs.size < 1 || couleurs.size > 3) return { ok: false, raison: '1 à 3 couleurs exigées' };
  return { ok: true, terrains: 0 };
}

/**
 * Les terrains — façon Magic : piochés, posés (UN par tour), engagés pour
 * produire un mana de leur couleur. Montagne → braise, Mer → eau,
 * Désert → sable.
 */
export const RPG_TERRAIN_CARDS = [
  ...RPG_SOLEIL_ROUGE_TERRAINS,
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
  // Variantes illustrées : elles reprennent exactement le type, le coût et la
  // production de mana de leur terrain d’origine. `varianteDe` sert de lien
  // éditorial et ne change aucune règle du duel.
  {
    id: 'dunes-du-tenere',
    name: 'Dunes du Ténéré',
    element: 'sable',
    kind: 'terrain',
    art: 'dunes-du-tenere',
    varianteDe: 'desert',
    typeLine: 'Terrain — Désert',
    rarity: 'commune',
    cost: 0,
    text: 'Engagez : ajoutez un mana sable.',
    flavor: 'Les pistes s’effacent ; le voyage, jamais.',
  },
  {
    id: 'cretes-de-cendre',
    name: 'Crêtes de cendre',
    element: 'braise',
    kind: 'terrain',
    art: 'cretes-de-cendre',
    varianteDe: 'montagne',
    typeLine: 'Terrain — Montagne',
    rarity: 'commune',
    cost: 0,
    text: 'Engagez : ajoutez un mana braise.',
    flavor: 'Le volcan se tait ; la pierre garde sa chaleur.',
  },
  {
    id: 'lagune-des-salines',
    name: 'Lagune des salines',
    element: 'eau',
    kind: 'terrain',
    art: 'lagune-des-salines',
    varianteDe: 'mer',
    typeLine: 'Terrain — Mer',
    rarity: 'commune',
    cost: 0,
    text: 'Engagez : ajoutez un mana eau.',
    flavor: 'La lagune garde le ciel après le départ du soleil.',
  },
  {
    id: 'petra-des-deux-sources',
    name: 'Pétra des deux sources',
    element: 'hybride',
    colors: ['sable', 'braise'],
    manaColors: ['braise', 'sable'],
    kind: 'terrain',
    art: 'petra-des-deux-sources',
    varianteDe: 'petra',
    typeLine: 'Terrain — Cité',
    rarity: 'rare',
    cost: 0,
    text: 'Engagez : ajoutez un mana Braise ou Sable.',
    flavor: 'Deux reflets, une seule piste dans la roche rose.',
  },
  {
    id: 'glacier-des-arches',
    name: 'Glacier des arches',
    element: 'neige',
    kind: 'terrain',
    art: 'glacier-des-arches',
    varianteDe: 'glacier',
    typeLine: 'Terrain — Glacier',
    rarity: 'commune',
    cost: 0,
    text: 'Engagez : ajoutez un mana Neige.',
    flavor: 'La glace ouvre une porte sur les hivers enfouis.',
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
  ...RPG_SOLEIL_ROUGE_MAGIES,
  ...RPG_TENEBRES_MAGIES,
  {
    id: 'trait-de-braise',
    name: 'Trait de braise',
    element: 'braise',
    kind: 'magie',
    typeLine: 'Magie Rapide — Braise',
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
    typeLine: 'Sorcellerie — Eau',
    art: 'eau-de-la-source',
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
    typeLine: 'Sorcellerie — Sable',
    art: 'rapport-du-greffier',
    cost: 3,
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
    typeLine: 'Sorcellerie — Eau',
    art: 'lame-de-mer',
    cost: 2,
    rarity: 'commune',
    cibles: ['creature'],
    effet: { type: 'debuff', atk: -2, def: -2, cible: 'creature' }, text: 'La Lame de mer donne -2/-2 à une créature ciblée. Si sa défense tombe en dessous de 1, elle est détruite.',
    flavor: 'La vague coupe plus propre que le couteau.',
  },
  {
    id: 'rempart-de-dunes',
    name: 'Rempart de dunes',
    element: 'sable',
    kind: 'magie',
    typeLine: 'Magie Rapide — Sable',
    art: 'rempart-de-dunes',
    instant: true,
    cost: 2,
    rarity: 'commune',
    cibles: ['soi'],
    // Le mur de sable ne grandit pas les siens : il les tient debout le temps
    // de l’échange. `tours: 1` = le bonus ne dépasse pas le tour pendant lequel
    // il a été joué (carnet `bonusTemporaires` du moteur, soldé à `rpgFinDeTour`).
    effet: { type: 'buff', atk: 0, def: 3, tours: 1 },
    text: 'Magie Rapide — Vos créatures gagnent +0/+3 jusqu’à la fin du tour.',
    flavor: 'Le vent bâtit plus vite que les maçons, et il emporte aussi vite.',
  },
  {
    id: 'tempete-de-sable',
    name: 'Tempête de sable',
    element: 'sable',
    kind: 'magie',
    typeLine: 'Sorcellerie — Sable',
    art: 'tempete-de-sable',
    cost: 5,
    rarity: 'rare',
    cibles: ['toutes'],
    effet: { type: 'degats', amount: 3, cible: 'toutes-creatures' },
    text: '3 dégâts à toutes les créatures adverses.',
    flavor: 'Le ciel se couche. Personne n’est invité.',
  },
  {
    id: 'parade-du-verre',
    name: 'Parade de verre',
    element: 'eau',
    kind: 'magie',
    typeLine: 'Magie Rapide — Protection',
    art: 'parade-du-verre',
    instant: true,
    cost: 2,
    rarity: 'rare',
    cibles: ['creature-amie'],
    effet: { type: 'bouclier', amount: 3, cible: 'creature-amie' },
    text: 'Magie Rapide — Une créature alliée prévient les 3 prochains dégâts qu’elle devrait subir.',
    flavor: 'Une seconde de verre suffit à dévier le coup.',
  },
  {
    id: 'brisure-de-verre',
    name: 'Brisure de verre',
    element: 'eau',
    kind: 'magie',
    typeLine: 'Magie Rapide — Eau',
    art: 'brisure-de-verre',
    instant: true,
    cost: 2,
    rarity: 'rare',
    cibles: ['toutes'],
    effet: { type: 'buff', atk: -1, def: -1, cible: 'creatures-adverses', minimum: 0 },
    text: 'Magie Rapide — Toutes les créatures adverses perdent 1 attaque et 1 défense. Si leur défense tombe en dessous de 1, elles sont détruites.',
    flavor: 'Le verre se fend en mille éclats, jamais au hasard.',
  },
    {
      id: 'ecueil', name: 'Écueil', element: 'eau', kind: 'magie',
      typeLine: 'Magie Rapide — Eau', art: 'ecueil', instant: true, cost: 2, rarity: 'commune',
      cibles: ['soi'],
      effet: { type: 'contresort', cible: 'creature' },
      text: 'Magie Rapide — Contrez une créature adverse.',
      flavor: 'Elle heurte le récif avant même la côte.',
    },
    {
      id: 'reanimation', name: 'Réanimation', element: 'sable', kind: 'magie',
      typeLine: 'Sorcellerie — Sable', art: 'reanimation', cost: 5, rarity: 'rare',
      cibles: ['soi'],
      effet: { type: 'reanimation' },
      text: 'Fait revenir une créature de votre cimetière en jeu.',
      flavor: 'Le sable rend tout, tôt ou tard.',
    },
  {
    id: 'nuage-de-cendres',
    name: 'Nuage de cendres',
    element: 'braise',
    kind: 'magie',
    typeLine: 'Sorcellerie — Sihr de braise',
    art: 'nuage-de-cendres',
    cost: 4,
    rarity: 'rare',
    cibles: ['toutes'],
    // Le nuage ne se dissipe pas à la première bourrasque : `echo` est la
    // seconde vague, qui tombe au début du prochain tour du lanceur — après
    // le tour adverse, sur ce qu'il y a alors à brûler (voir `degatsEchos`).
    effet: { type: 'degats', amount: 2, cible: 'toutes-creatures', echo: { amount: 2, tours: 1 } },
    text: 'Sorcellerie — 2 dégâts à toutes les créatures adverses, puis 2 autres au début de votre tour suivant.',
    flavor: 'Le vent tourne ; la poussière devient un voile brûlant.',
  },
  {
    id: 'vent-rouge',
    name: 'Vent rouge',
    element: 'braise',
    colors: ['braise', 'sable'],
    colorCost: { braise: 1, sable: 1 },
    kind: 'magie',
    typeLine: 'Sorcellerie — Sable et Braise',
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
    typeLine: 'Magie Rapide — Neige',
    art: 'eclair-du-marteau',
    instant: true,
    cost: 2,
    rarity: 'commune',
    cibles: ['creature', 'sorcier'],
    effet: { type: 'degats', amount: 3, cible: 'creature' },
    text: 'Magie Rapide — 3 dégâts à une créature ou un sorcier ciblés.',
    flavor: 'Le ciel se fend ; le marteau a parlé.',
  },
  {
    id: 'mur-de-boucliers',
    name: 'Mur de boucliers',
    element: 'neige',
    kind: 'magie',
    typeLine: 'Sorcellerie — Neige',
    art: 'mur-de-boucliers',
    cost: 2,
    rarity: 'commune',
    cibles: ['soi'],
    effet: { type: 'buff', atk: 2, def: 2, tours: 1 },
    text: 'Vos créatures gagnent +2/+2 jusqu’à la fin du tour.',
    flavor: 'Épaule contre épaule, le clan devient une muraille.',
  },
  {
    id: 'festin-des-vaillants',
    name: 'Festin des vaillants',
    element: 'neige',
    kind: 'magie',
    typeLine: 'Sorcellerie — Neige',
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
    typeLine: 'Sorcellerie — Neige',
    art: 'brume-du-fjord',
    cost: 2,
    rarity: 'rare',
    cibles: ['toutes'],
    effet: { type: 'degats', amount: 1, cible: 'toutes-creatures', gelChance: 0.5 },
    text: 'Sorcellerie — 1 dégât à toutes les créatures adverses, et chacune a une chance sur deux d’être gelée.',
    flavor: 'La brume mord d’abord les chevilles ; le froid prend le reste.',
  },
  {
    id: 'hurlement-du-blizzard',
    name: 'Hurlement du blizzard',
    element: 'neige',
    kind: 'magie',
    typeLine: 'Sorcellerie — Neige',
    art: 'hurlement-du-blizzard',
    cost: 4,
    rarity: 'rare',
    cibles: ['toutes'],
    effet: { type: 'degats', amount: 2, cible: 'toutes-creatures', gelChance: 0.5 },
    text: 'Sorcellerie — 2 dégâts à toutes les créatures adverses, et chacune a une chance sur deux d’être gelée.',
    flavor: 'Le vent hurle si fort que la neige devient des lames.',
  },
  // ── Le lot du gel : magies rapides et sorcelleries du Serment ────────────
  // Six sorts de contrôle du combat, illustrés en fresque (direction propre
  // au lot, voir RPG-CARD-ART.md). Les trois premiers répondent à l'instant ;
  // les trois autres préparent l'échange ou le concluent. Le gel (`gel`) tient
  // jusqu'à la fin du prochain tour du contrôleur de la créature figée ; la
  // brume (`brouillard`) annule les dégâts de combat du tour en cours ; le
  // blocage forcé (`blocage-force`) jette la créature marquée sur la prochaine
  // attaque du lanceur.
  {
    id: 'poigne-de-givre',
    name: 'Poigne de givre',
    element: 'neige',
    kind: 'magie',
    typeLine: 'Magie Rapide — Neige',
    art: 'poigne-de-givre',
    cost: 3,
    rarity: 'commune',
    instant: true,
    cibles: ['creature'],
    effet: { type: 'degats', amount: 2, cible: 'creature', gel: true },
    text: 'Magie Rapide — Une créature adverse ciblée subit 2 dégâts et ne peut ni attaquer ni bloquer jusqu’à la fin de son prochain tour.',
    flavor: 'Le froid tient l’acier plus fermement que la main.',
  },
  {
    id: 'grand-voile-blanc',
    name: 'Grand Voile blanc',
    element: 'neige',
    kind: 'magie',
    typeLine: 'Magie Rapide — Neige',
    art: 'grand-voile-blanc',
    cost: 2,
    rarity: 'rare',
    instant: true,
    cibles: ['soi'],
    effet: { type: 'brouillard' },
    text: 'Magie Rapide — Aucune créature ne peut infliger de dégâts de combat ce tour.',
    flavor: 'Le voile descend, et les coups s’égarent dans le blanc.',
  },
  {
    id: 'appat-de-la-meute',
    name: 'Appât de la meute',
    element: 'neige',
    kind: 'magie',
    typeLine: 'Magie Rapide — Neige',
    art: 'appat-de-la-meute',
    cost: 2,
    rarity: 'inhabituelle',
    instant: true,
    cibles: ['creature'],
    effet: { type: 'blocage-force', cible: 'creature', portee: 'attaque' },
    text: 'Magie Rapide — La créature adverse ciblée doit bloquer si elle le peut lors de votre prochaine attaque.',
    flavor: 'La meute choisit sa proie ; la proie n’a pas son mot à dire.',
  },
  {
    id: 'verglas',
    name: 'Verglas',
    element: 'neige',
    kind: 'magie',
    typeLine: 'Sorcellerie — Neige',
    art: 'verglas',
    cost: 5,
    rarity: 'rare',
    cibles: ['toutes'],
    effet: { type: 'degats', amount: 1, cible: 'toutes-creatures', gel: true },
    text: 'Sorcellerie — Les créatures adverses subissent 1 dégât et ne peuvent ni attaquer ni bloquer jusqu’à la fin de leur prochain tour.',
    flavor: 'D’abord la grêle, puis le silence : le fjord se couvre de statues.',
  },
  {
    id: 'defi-du-jarl',
    name: 'Défi du Jarl',
    element: 'neige',
    kind: 'magie',
    typeLine: 'Sorcellerie — Neige',
    art: 'defi-du-jarl',
    cost: 3,
    rarity: 'rare',
    cibles: ['creature-amie', 'creature'],
    effet: { type: 'combat', cible: 'creature', sourceCible: 'creature-amie' },
    text: 'Sorcellerie — Une créature alliée ciblée se bat avec une créature adverse ciblée : chacune subit des dégâts égaux à l’attaque de l’autre.',
    flavor: 'Refuser le défi, c’est déjà mourir.',
  },
  {
    id: 'embuscade',
    name: 'Embuscade',
    element: 'neige',
    kind: 'magie',
    typeLine: 'Sorcellerie — Neige',
    art: 'embuscade',
    cost: 4,
    rarity: 'rare',
    cibles: ['toutes'],
    effet: {
      type: 'buff', atk: -2, def: -2, minimum: 1,
      cible: 'creatures-adverses', blocageForce: 'tour',
    },
    text: 'Sorcellerie — Les créatures adverses gagnent -2/-2 (jamais sous 1/1) et doivent bloquer si elles le peuvent ce tour.',
    flavor: 'Le cercle se referme ; plus aucun bouclier ne reste à l’écart.',
  },
  // ── Contresorts (deck Marée des abysses) ───────────────────────────────
  // Un contresort répond à l'annonce du sorcier : il annule la carte annoncée.
  {
    id: 'contresort-des-abimes',
    name: 'Contresort des abîmes',
    element: 'eau',
    kind: 'magie',
    typeLine: 'Magie Rapide — Eau',
    art: 'contresort-des-abimes',
    instant: true,
    cost: 3,
    rarity: 'commune',
    cibles: ['soi'],
    effet: { type: 'contresort', cible: 'carte' },
    text: 'Magie Rapide — Contre la carte annoncée par le sorcier : créature ou sort.',
    flavor: 'Le fond ne rend jamais ce qu’il a englouti.',
  },
  {
    id: 'silence-decume',
    name: 'Silence d’écume',
    element: 'eau',
    kind: 'magie',
    typeLine: 'Magie Rapide — Eau',
    art: 'silence-decume',
    instant: true,
    cost: 2,
    rarity: 'commune',
    cibles: ['soi'],
    effet: { type: 'contresort', cible: 'sort' },
    text: 'Magie Rapide — Contre la magie rapide ou la sorcellerie annoncée par l’adversaire.',
    flavor: 'Sous le dôme d’écume, la foudre elle-même se brise en silence.',
  },
  {
    id: 'maree-contraire',
    name: 'Déflection',
    element: 'eau',
    kind: 'magie',
    typeLine: 'Magie Rapide — Eau',
    art: 'maree-contraire',
    instant: true,
    cost: 3,
    rarity: 'rare',
    cibles: ['soi'],
    effet: { type: 'contresort', cible: 'sort', pioche: 1 },
    text: 'Magie Rapide — Contre un sort annoncé par le sorcier, puis piochez une carte.',
    flavor: 'Le sorcier assis n’esquive pas le sort : il l’écoute revenir.',
  },
  // ── Renvoi en main (deck Marée des abysses) ────────────────────────────
  // L'effet « retour-main » du moteur : la créature visée quitte la table
  // sans mourir et retourne dans la main de son propriétaire. Ni cimetière,
  // ni capacité de destruction — mais elle devra être repayée.
  {
    id: 'ressac',
    name: 'Ressac',
    element: 'eau',
    kind: 'magie',
    typeLine: 'Magie Rapide — Eau',
    instant: true,
    cost: 1,
    rarity: 'commune',
    cibles: ['creature'],
    effet: { type: 'retour-main', cible: 'creature' },
    text: 'Magie Rapide — Renvoyez une créature adverse ciblée dans la main de son propriétaire.',
    flavor: 'La mer reprend toujours ce qui s’avance trop près du bord.',
  },
  {
    id: 'courant-de-retour',
    name: 'Courant de retour',
    element: 'eau',
    kind: 'magie',
    typeLine: 'Sorcellerie — Eau',
    cost: 3,
    rarity: 'rare',
    cibles: ['creature'],
    effet: { type: 'retour-main', cible: 'creature', pioche: 1 },
    text: 'Sorcellerie — Renvoyez une créature adverse ciblée dans la main de son propriétaire, puis piochez une carte.',
    flavor: 'Ce que la vague emporte, le courant vous le raconte à l’oreille.',
  },
];

/**
 * Les armes — le cinquième type de cartes du duel (quatre armes d’origine,
 * une par élément, puis le lot du Sable).
 *
 * Une arme se joue depuis la main, payée en mana comme un sort, et s'attache
 * directement à une créature alliée (héros et jetons compris) : le porteur
 * gagne le bonus `bonus` (+attaque/+défense) et, selon l'arme, le mot-clé
 * `donne` (esquive, envol…) ou l'effet déclenché `declenche`, tant qu'il la
 * porte. Une seule arme par créature : en attacher une seconde envoie la
 * première au cimetière. Quand le porteur quitte la table — détruit, renvoyé
 * en main — l'arme tombe avec lui, au cimetière. Le moteur vit dans
 * `rpgDuel.js` (`rpgJouerArme`), l'IA dans `rpgAI.js`.
 *
 * Les effets sont étagés par rareté, comme le reste du set : la commune
 * rend son porteur inbloquable (Infiltration), les rares un effet propre à
 * leur élément (Envol pour la Lance, les serpents appelés du Bâton), la
 * mythique une immunité doublée de Rapidité.
 *
 * **Les déclencheurs du porteur** (lot du Sable, `docs/rpg/14-equipements-du-sable.md`) :
 * une arme peut en outre porter un effet qui part avec son porteur —
 * `porteurAttaque` (quand il attaque), `porteurBlesseCreature` /
 * `porteurBlesseSorcier` / `porteurBlesse` (quand il inflige des blessures de
 * combat), `porteurMeurt` (quand il meurt, arme comprise). `armeVivante`
 * permet de la jouer sans créature : elle crée son propre porteur.
 */
export const RPG_ARME_CARDS = [
  ...RPG_TENEBRES_ARMES,
  {
    id: 'takouba-des-pistes',
    name: 'Takouba des pistes',
    element: 'sable',
    kind: 'arme',
    typeLine: 'Arme — Takouba',
    cost: 3,
    rarity: 'commune',
    bonus: { atk: 2, def: 0 },
    donne: { infiltration: true },
    text: 'Arme — Le porteur gagne +2/+0 et Infiltration (il ne peut pas être bloqué).',
    flavor: 'Une lame droite pour les pistes qui ne pardonnent pas.',
  },
  {
    id: 'baton-des-citernes',
    name: 'Bâton des citernes',
    element: 'eau',
    kind: 'arme',
    typeLine: 'Arme — Bâton',
    cost: 4,
    rarity: 'rare',
    bonus: { atk: 1, def: 2 },
    // À l'arrivée de l'arme, puis à la demande contre 3 manas (capacité
    // activée, `rpgActiverArme` dans le moteur) : un serpent 3/1 rapide qui
    // ne survit pas au tour (`ephemere`, soldé à `rpgFinDeTour`).
    arrivee: { type: 'jetons', jeton: 'serpent-des-citernes', nombre: 1, ephemere: true },
    activation: { cout: 3, effet: { type: 'jetons', jeton: 'serpent-des-citernes', nombre: 1, ephemere: true } },
    text: 'Arme — Le porteur gagne +1/+2. Quand cette arme arrive en jeu, créez un jeton Serpent 3/1 avec Rapidité, détruit à la fin du tour. 3 : créez un jeton Serpent 3/1 avec Rapidité, détruit à la fin du tour.',
    flavor: 'Il soulève les serpents des citernes comme des rubans de soie — puis les lâche, furieux, entre l’ennemi et vous.',
  },
  {
    id: 'armure-de-cendres',
    name: 'Armure de cendres',
    element: 'braise',
    kind: 'arme',
    typeLine: 'Arme — Armure',
    cost: 4,
    rarity: 'mythique',
    bonus: { atk: 3, def: 3 },
    donne: { rapidite: true, immunite: 'braise' },
    text: 'Arme — Le porteur gagne +3/+3 et Rapidité. Il est immunisé contre la Braise.',
    flavor: 'Forgée dans le cratère même : aucune flamme ne mord deux fois cet acier-là.',
  },
  {
    id: 'lance-de-givre',
    name: 'Lance de givre',
    element: 'neige',
    kind: 'arme',
    typeLine: 'Arme — Lance',
    cost: 3,
    rarity: 'rare',
    bonus: { atk: 3, def: 1 },
    donne: { envol: true },
    text: 'Arme — Le porteur gagne +3/+1 et Envol.',
    flavor: 'Portée par le vent du fjord, elle frappe du ciel.',
  },

  // ── Le lot des Veilleurs : dix équipements du Sable ────────────────────
  // Dessiné dans l'esprit des Equipment de Magic (la Jitte d'Umezawa,
  // Skullclamp, les Épées de X et Y, l'Arme vivante) et traduit dans la
  // grammaire du Sablier. Voir `docs/rpg/14-equipements-du-sable.md` : le
  // lot entier, ses briques moteur et sa réserve.
  {
    id: 'sandales-de-tislit',
    name: 'Sandales de Tislit',
    element: 'sable',
    kind: 'arme',
    typeLine: 'Arme — Bottes',
    cost: 1,
    rarity: 'commune',
    bonus: { atk: 0, def: 1 },
    donne: { rapidite: true },
    text: 'Arme — Le porteur gagne +0/+1 et Rapidité (il peut attaquer le tour où il arrive).',
    flavor: 'Elle part avant la question.',
  },
  {
    id: 'cuirasse-de-sel',
    name: 'Cuirasse de sel',
    element: 'sable',
    kind: 'arme',
    typeLine: 'Arme — Armure',
    cost: 2,
    rarity: 'commune',
    bonus: { atk: 0, def: 3 },
    donne: { esquive: 1 },
    text: 'Arme — Le porteur gagne +0/+3 et Esquive 1 (réduit de 1 les dégâts reçus de chaque attaque ou magie).',
    flavor: 'Le sel tient mieux que le fer quand le fer chauffe.',
  },
  {
    id: 'javelot-du-beffroi',
    name: 'Javelot du beffroi',
    element: 'sable',
    kind: 'arme',
    typeLine: 'Arme — Javelot',
    cost: 2,
    rarity: 'commune',
    bonus: { atk: 2, def: 0 },
    donne: { coupRapide: true },
    text: 'Arme — Le porteur gagne +2/+0 et Coup rapide (déclaré attaquant, il peut frapper une créature adverse de votre choix : elle encaisse ses dégâts, sans riposte, et son attaque s’arrête là ; sans proie désignée, il attaque normalement).',
    flavor: 'Il ne vise pas l’homme. Il vise la fenêtre derrière lui.',
  },
  {
    id: 'licou-du-chien-de-sable',
    name: 'Licou du chien de sable',
    element: 'sable',
    kind: 'arme',
    typeLine: 'Arme — Licou',
    cost: 1,
    rarity: 'inhabituelle',
    bonus: { atk: 1, def: -1 },
    // Le Skullclamp du Sablier : le malus de défense n'est pas une punition,
    // c'est le déclencheur. Posé sur un chien de sable 1/1, il le fait passer
    // à 2/0 — `rpgActionsEtat` l'enterre, `porteurMeurt` part, deux cartes
    // pour un mana et un jeton.
    porteurMeurt: { type: 'pioche', amount: 2 },
    text: 'Arme — Le porteur gagne +1/−1. Quand le porteur meurt, piochez deux cartes.',
    flavor: 'Il tirait bien. Il tire encore, d’une certaine façon.',
  },
  {
    id: 'boussole-du-hoggar',
    name: 'Boussole du Hoggar',
    element: 'sable',
    kind: 'arme',
    typeLine: 'Arme — Boussole',
    cost: 2,
    rarity: 'inhabituelle',
    bonus: { atk: 1, def: 1 },
    // L'Explorer's Scope, traduit en « le désert se lit » : le terrain va en
    // main, jamais posé — la règle « un terrain par tour » reste intacte.
    porteurAttaque: { type: 'regarder-dessus', si: 'terrain' },
    text: 'Arme — Le porteur gagne +1/+1. Quand le porteur attaque : regardez la première carte de votre deck ; si c’est un terrain, révélez-le et ajoutez-le à votre main.',
    flavor: 'Amayas ne cherche pas l’eau. Il se souvient de l’endroit.',
  },
  {
    id: 'harnais-du-mehari',
    name: 'Harnais du méhari',
    element: 'sable',
    kind: 'arme',
    typeLine: 'Arme — Harnais',
    cost: 3,
    rarity: 'inhabituelle',
    bonus: { atk: 2, def: 2 },
    porteurAttaque: { type: 'sable', amount: 1 },
    text: 'Arme — Le porteur gagne +2/+2. Quand le porteur attaque : gagnez 1 mana de sable.',
    flavor: 'Le méhari connaît le puits d’avant la soif.',
  },
  {
    id: 'masque-du-guetteur',
    name: 'Masque du guetteur',
    element: 'sable',
    kind: 'arme',
    typeLine: 'Arme — Masque',
    cost: 2,
    rarity: 'rare',
    bonus: { atk: 1, def: 1 },
    porteurBlesseSorcier: { type: 'pioche-defausse', pioche: 1, defausse: 1 },
    text: 'Arme — Le porteur gagne +1/+1. Quand le porteur inflige des blessures de combat au sorcier adverse : piochez une carte, puis défaussez-en une.',
    flavor: 'Il ne rapporte pas ce qu’il a vu. Il rapporte ce qui manquait.',
  },
  {
    id: 'jitte-d-amayas',
    name: 'Jitte d’Amayas',
    element: 'sable',
    kind: 'arme',
    typeLine: 'Arme — Jitte',
    cost: 4,
    rarity: 'rare',
    bonus: { atk: 2, def: 1 },
    donne: { protection: { contre: 'tenebres' } },
    text: 'Arme — Le porteur gagne +2/+1 et une protection contre les Ténèbres : les attaques, blocages et effets des Ténèbres ne peuvent ni le cibler ni le blesser.',
    flavor: 'Le guide pare d’un geste ce que la nuit envoie.',
  },
  {
    id: 'lame-des-ergs',
    name: 'Lame des ergs',
    element: 'sable',
    kind: 'arme',
    typeLine: 'Arme — Khopesh',
    cost: 4,
    rarity: 'rare',
    bonus: { atk: 3, def: 1 },
    // Arme vivante (Batterskull) : jouable la main vide, elle fait naître le
    // chien de sable qui la portera (`rpgJouerArme` accepte `cibleId: null`).
    armeVivante: { jeton: 'chien-de-sable', nombre: 1 },
    text: 'Arme — Arme vivante : vous pouvez la jouer sans créature ; elle crée alors un chien de sable 1/1 et s’y attache. Le porteur gagne +3/+1.',
    flavor: 'Le désert n’attend pas qu’on lui trouve un bras.',
  },
  {
    id: 'takouba-de-tin-hinan',
    name: 'Takouba de Tin Hinan',
    element: 'sable',
    kind: 'arme',
    typeLine: 'Arme — Takouba',
    cost: 4,
    rarity: 'mythique',
    bonus: { atk: 3, def: 2 },
    // Le cycle des Épées de X et Y, en une seule lame : le Coup rapide ouvre
    // les DEUX déclencheurs — la frappe précoce sur une créature pioche (et
    // arrête l'attaque du porteur là), l'attaque ordinaire qui passe lève un
    // chien. Sans lui, un porteur inbloquable ne blesserait jamais une créature
    // et la moitié de la carte dormirait.
    donne: { coupRapide: true },
    porteurBlesseCreature: { type: 'pioche', amount: 1 },
    porteurBlesseSorcier: { type: 'jetons', jeton: 'chien-de-sable', nombre: 1 },
    text: 'Arme — Le porteur gagne +3/+2 et Coup rapide. Quand le porteur inflige des blessures de combat à une créature : piochez une carte. Quand il en inflige au sorcier adverse : créez un chien de sable 1/1.',
    flavor: 'La mère des pistes ne ferme jamais la porte : elle la laisse derrière elle.',
  },
];

export function armeById(id) {
  return RPG_ARME_CARDS.find((card) => card.id === id) ?? null;
}

/** Le catalogue complet du duel, avec un type unifié pour les filtres d’interface. */
export const RPG_DUEL_CARDS = [
  ...RPG_CREATURE_CARDS.map((card) => ({ ...card, kind: 'creature' })),
  ...RPG_HERO_CARDS,
  ...RPG_TERRAIN_CARDS,
  ...RPG_MAGIE_CARDS,
  ...RPG_ARME_CARDS,
];

export function magieById(id) {
  return RPG_MAGIE_CARDS.find((card) => card.id === id) ?? null;
}

/**
 * Le catalogue indexé par identifiant : les cartes jouables et les
 * **créatures-jetons** — que `cardById` doit savoir peindre (elles apparaissent
 * sur la table) sans qu’elles entrent pour autant dans `RPG_DUEL_CARDS`, donc
 * ni dans la collection ni dans l’atelier de decks.
 */
const CATALOG = new Map(
  [...RPG_DUEL_CARDS, ...RPG_JETON_CARDS]
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

/** Bandes nettes, une par élément, pour les sceaux et les coûts hybrides.
 *  L'ordre suit le même canon que le cadre de la carte (braise, eau, sable,
 *  neige) : la couleur du coût et celle de la carte se lisent dans le même
 *  sens, de la moitié haute gauche à la basse droite. Une carte mono n'a pas
 *  besoin de ce dégradé. */
export function cardHybridGradient(cardOrId) {
  const couleurs = cardColors(cardOrId).slice().sort(
    (a, b) => CARD_FRAME_COLOR_ORDER.indexOf(a) - CARD_FRAME_COLOR_ORDER.indexOf(b),
  );
  if (couleurs.length < 2) return null;
  const part = 100 / couleurs.length;
  const bandes = couleurs.map((couleur, index) => {
    const teinte = CARD_FRAME_COLORS[couleur]?.color ?? CARD_FRAME_COLORS.sable.color;
    return `${teinte} ${Math.round(index * part)}% ${Math.round((index + 1) * part)}%`;
  });
  return `linear-gradient(135deg, ${bandes.join(', ')})`;
}

/** Groupe renforcé par une source de Résonance : tribu ou élément. */
export function cardResonanceGroup(card) {
  return card?.resonanceTribu ?? card?.resonanceElement ?? card?.element;
}

/** Une résonance tribale suit le TYPE imprimé, jamais le nom ni la couleur. */
export function cardReceivesResonance(cardOrId, group) {
  const card = typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
  if (!card || ['terrain', 'magie'].includes(card.kind)) return false;
  if (RPG_ELEMENTS.includes(group)) return cardColors(card).includes(group);
  const normaliser = (texte) => String(texte).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const sousTypes = (card.typeLine ?? '').split('—').slice(1).join(' ').split(/[\s·]+/);
  return sousTypes.some((type) => normaliser(type) === normaliser(group));
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

/**
 * Les couleurs que la carte **demande à payer** — ses pips, à défaut son
 * identité — dans l'ordre canonique du cadre (braise, eau, sable, neige).
 * Le disque de coût et la pastille de couleur d'une carte en main s'y
 * accrochent : la couleur qu'on lit sur la carte est celle de son coût, dans
 * le même sens que les bandes de son cadre.
 */
export function cardCostColors(cardOrId) {
  const card = typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
  const exigences = Object.keys(cardColorCost(card));
  const couleurs = exigences.length ? exigences : cardColors(card);
  return couleurs.slice().sort(
    (a, b) => CARD_FRAME_COLOR_ORDER.indexOf(a) - CARD_FRAME_COLOR_ORDER.indexOf(b),
  );
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
  if (card.kind === 'magie') return card.instant ? 'Magie Rapide' : 'Sorcellerie';
  if (carteEstArme(card)) return 'Arme';
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
  const pool = RPG_CREATURE_CARDS.filter((card) => !collection.includes(card.id));
  const offer = [];
  while (offer.length < 3 && pool.length) {
    const index = Math.floor(rng() * pool.length);
    offer.push(pool.splice(index, 1)[0].id);
  }
  return offer;
}

/**
 * Les decks du jeu — composés, pas écrits.
 *
 * Chaque liste est le produit d'une **recette** (`rpgDeckRecipes.js`) passée au
 * **composeur** (`rpgDeckComposer.js`) avec le catalogue complet : identité
 * chromatique, quotas de créatures, de sorts et d'armes, signature
 * mécanique, puis les meilleures cartes restantes. Les sept decks de départ
 * contiennent chacun trente cartes sans terrain, une seule mythique et un
 * nombre de rares borné par leur recette ; les autres mythiques et rares
 * se découvrent dans les boosters.
 *
 * Les recettes vivent à part parce qu'elles sont lisibles : elles fixent les
 * synergies qui définissent chaque archétype et le composeur complète les places
 * restantes sans jamais dépasser les plafonds globaux. Les contrôles de
 * `tests/rpg-decks-puissance.test.js` suivent le contrat.
 */
export const CATALOGUE_DU_COMPOSEUR = {
  cartes: RPG_DUEL_CARDS.filter(carteJouableSansTerrain),
  couleursDe: cardColors,
  limiteDe: cardCopyLimit,
};

/** Veilleurs du Désert — Butin et équipements, avec la Takouba de Tin Hinan comme seule mythique. */
export const RPG_DECK_JOUEUR_BASE = composerDeck(RPG_RECETTES_DECKS['veilleurs-du-desert'], CATALOGUE_DU_COMPOSEUR);

/** Cour des Djinns — cendres, Honneur et retour différé d'Anqa. */
export const RPG_DECK_SORCIER_BASE = composerDeck(RPG_RECETTES_DECKS['cour-des-djinns'], CATALOGUE_DU_COMPOSEUR);

/** Sentiers de cendre — Pétra, mana bicolore et frappe rapide de Fériel. */
export const RPG_DECK_HYBRIDE_BASE = composerDeck(RPG_RECETTES_DECKS['sentiers-de-cendre'], CATALOGUE_DU_COMPOSEUR);

/** Marée des abysses — contresorts, rebonds et Léviathan comme unique mythique. */
export const RPG_DECK_MAREE_BASE = composerDeck(RPG_RECETTES_DECKS['maree-des-abysses'], CATALOGUE_DU_COMPOSEUR);

/** Serment des Neuf Hivers — Furie, Résonance et une figure mythique du Nord. */
export const RPG_DECK_NEIGE_BASE = composerDeck(RPG_RECETTES_DECKS['serment-des-neuf-hivers'], CATALOGUE_DU_COMPOSEUR);

/** La Balance des Heures — Prix, Tribut et morts qui déclenchent, avec La Dévoreuse comme seule mythique. */
export const RPG_DECK_TENEBRES_BASE = composerDeck(RPG_RECETTES_DECKS['balance-des-heures'], CATALOGUE_DU_COMPOSEUR);

/** Decks de départ. `boxArt` : l'illustration plein art (carte emblématique) imprimée
 *  sur le boîtier 3D de l'onglet Deck — un identifiant de `public/cards/`.
 *  `role` : le camp que le deck tient par défaut — `joueur` (deck de départ du joueur) ou
 *  `adversaire` (deck du sorcier en duel libre). Il ne limite rien : le joueur peut choisir
 *  n'importe quel deck complet, la Cour des Djinns comprise (voir `rpgDeckChoice.js`).
 *  `affrontement` : la phrase de la carte « ADVERSAIRE » de l'écran Jouer quand le sorcier
 *  joue ce deck (sans elle : « Affrontez <nom du deck>. »).
 *  `description` : ce que le deck joue vraiment — elle suit la recette, jamais l'inverse. */
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
    description: 'Deck mono-Sable inspiré des peuples amazighs d’Algérie : Butin, protection, la pioche de Tislit et l’égide d’Amani soutiennent les équipements du Désert. La Takouba de Tin Hinan est son unique mythique ; Salem, Tarek, la figure de Tin Hinan et les autres équipements d’exception restent à découvrir dans les boosters.',
    cardIds: RPG_DECK_JOUEUR_BASE,
  },
  {
    id: 'cour-des-djinns',
    name: 'Cour des Djinns',
    role: 'adversaire',
    element: 'braise',
    terrain: 'montagne',
    boxArt: 'anqa-des-braises',
    archetype: 'Djinns et sorcellerie',
    affrontement: 'Affrontez les djinns de Braise.',
    description: 'Deck mono-Braise autour des djinns et des ghuls : le Ghul frappe à sa mort, le Nuage de cendres revient en écho et Anqa — son unique mythique — renaît après quatre tours. Ashigaru, rōnin et Samouraï du torii ajoutent Honneur et Résonance ; les autres figures mythiques s’obtiennent dans les boosters.',
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
    description: 'Deck hybride Sable + Braise : le mana automatique permet de choisir entre les deux couleurs, tandis que le Djinn de foudre et le Vent rouge ouvrent la voie à Fériel, son unique mythique et spécialiste du Coup rapide. Butin et équipements du Désert complètent l’assaut ; les autres mythiques attendent dans les boosters.',
    cardIds: RPG_DECK_HYBRIDE_BASE,
  },
  {
    id: 'maree-des-abysses',
    name: 'Marée des abysses',
    role: 'joueur',
    element: 'eau',
    terrain: 'mer',
    boxArt: 'leviathan',
    archetype: 'Contresorts · bêtes marines mythiques',
    affrontement: 'Affrontez la marée des abysses.',
    description: 'Deck mono-Eau de contrôle : contresorts, Ressac et rebonds ralentissent le sorcier, tandis que le Bâton appelle ses serpents des citernes. Le Léviathan est l’unique mythique du deck ; Kraken, Bakunawa, Jörmungandr, Yamina et Boualem restent à ouvrir dans les boosters.',
    cardIds: RPG_DECK_MAREE_BASE,
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
    description: 'Deck mono-Neige : Furie et Résonance renforcent les guerriers, la Poigne de givre et l’Appât de la meute contrôlent le combat, et le Maître du marteau — unique mythique — apporte Furie et Ténacité. Les autres figures du Nord se découvrent dans les boosters ; elles ne sont jamais nommées « dieux ».',
    cardIds: RPG_DECK_NEIGE_BASE,
  },
  {
    id: 'serment-du-soleil-rouge',
    name: 'Le Serment du Soleil rouge',
    role: 'joueur',
    element: 'braise',
    terrain: 'montagne-du-soleil-rouge',
    boxArt: 'kagutsuchi-flamme-originelle',
    archetype: 'Braise · samouraïs et yōkai',
    affrontement: 'Affrontez le Serment du Soleil rouge.',
    description: 'Deck mono-Braise du Japon fantastique : Honneur frappe à la mort, le Samouraï du torii, le Tengu, le Kenshi et Kagutsuchi font résonner les Samouraïs, et le Daimyō lève des jetons qui grandissent en attaquant. Kagutsuchi est l’unique mythique du deck ; Orochi, Susanoo et les autres figures s’ouvrent dans les boosters.',
    cardIds: composerDeck(RPG_RECETTES_DECKS['serment-du-soleil-rouge'], CATALOGUE_DU_COMPOSEUR),
  },
  {
    id: 'balance-des-heures',
    name: 'La Balance des Heures',
    role: 'joueur',
    element: 'tenebres',
    terrain: null,
    boxArt: 'la-devoreuse',
    archetype: 'Ténèbres · le Prix, le Tribut, la mort qui déclenche',
    affrontement: 'Affrontez la Balance des Heures.',
    description: 'Deck mono-Ténèbres de l’Égypte pharaonique : le Prix se paie en PV (Papyrus, La Grande Pesée), le Tribut transfère la vie au contact du sorcier (Chacal du seuil, Celui qui juge, le Khopesh d’or), et la mort déclenche — l’Ouvrier du natron, la Momie de lin, la Couveuse de shabtis et leurs serviteurs de lin. Nom effacé et Celle qui pèse vident la main adverse, Les feuillets raccourcissent son paquet, et La Dévoreuse — unique mythique du boîtier — exile la créature que la balance a condamnée. Le Passeur au masque de chacal, Le Maître des hiéroglyphes et La Dernière Pesée s’ouvrent dans les boosters.',
    cardIds: RPG_DECK_TENEBRES_BASE,
  },
];
