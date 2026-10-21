/**
 * Règles du mana sans terrains et cinq paquets de démonstration.
 * Les deux premiers reprennent les nouvelles recettes des decks de base.
 * Le nom historique « essai » reste stable pour les états du moteur.
 */
import {
  RPG_DECK_JOUEUR_BASE,
  RPG_DECK_HYBRIDE_BASE,
  RPG_ELEMENTS,
  cardById,
  cardColors,
  cardCopyLimit,
} from './rpgCards.js';

export const RPG_MODE_MANA_ESSAI = 'essai';
export const RPG_MANA_ESSAI_TAILLE = 30;
export const RPG_MANA_ESSAI_MAX = 10;
/** Main de départ réduite du mode sans terrains (le mode classique garde 5). */
export const RPG_MANA_ESSAI_MAIN_DEPART = 3;
/** Taille de main maximale à la fin d'un tour : l'excédent est défaussé. */
export const RPG_MANA_ESSAI_MAIN_MAX = 5;
export const RPG_MANA_ESSAI_CARTES_EXCLUES = Object.freeze([]);
/** Le champ de bataille accueille cinq créatures, dessinées en cinq
 *  emplacements de chaque côté du plateau : la sixième exige un sacrifice —
 *  le joueur choisit laquelle, l'IA sacrifie la plus frêle. */
export const RPG_MANA_ESSAI_CHAMP_MAX = 5;

const copies = (id, nombre) => Array(nombre).fill(id);

/** Un départ souple, puis des cartes plus lourdes. Pas de Boussole ni de Djinn
 * du souk : leurs effets dépendent encore de cartes Terrain. */
export const RPG_MANA_ESSAI_DECKS = Object.freeze([
  {
    id: 'essai-mana-sable',
    name: 'Les Pistes du Sable',
    element: 'sable',
    elements: ['sable'],
    boxArt: 'fennec-des-decombres',
    description: 'Mono-Sable : le mana grandit sans choix de couleur.',
    cardIds: [...RPG_DECK_JOUEUR_BASE],
  },
  {
    id: 'essai-mana-sable-braise',
    name: 'Les Sentiers ardents',
    element: 'hybride',
    elements: ['sable', 'braise'],
    boxArt: 'djinn-de-foudre',
    description: 'Sable + Braise : choisissez chaque tour la couleur de votre nouveau mana.',
    cardIds: [...RPG_DECK_HYBRIDE_BASE],
  },
  {
    id: 'essai-mana-trois-couleurs',
    name: 'La Croisée des Heures',
    element: 'hybride',
    elements: ['sable', 'braise', 'eau'],
    boxArt: 'sonneur-fele',
    description: 'Sable + Braise + Eau : anticipez les sorts de trois couleurs.',
    cardIds: [
      ...copies('tislit-des-aures', 2), ...copies('fennec-des-decombres', 2),
      ...copies('chien-du-guet', 2), ...copies('faussoyeur-des-dunes', 2),
      'rapport-du-greffier', 'dune-marchante',
      ...copies('ashigaru-des-braises', 2), ...copies('ghul-des-cendres', 2),
      ...copies('hatamoto-des-cendres', 2), ...copies('trait-de-braise', 2),
      'ronin-du-soleil-rouge', 'nuage-de-cendres',
      'eau-de-la-source', ...copies('ressac', 2), ...copies('porteuse-de-cruches', 2),
      ...copies('vipere-de-verre', 2), 'sonneur-fele', 'lame-de-mer', 'jormungandr',
    ],
  },
  {
    id: 'essai-mana-tenebres',
    name: 'La Balance des Heures',
    element: 'tenebres',
    elements: ['tenebres'],
    boxArt: 'la-devoreuse',
    description: 'Mono-Ténèbres : on paie sa vie, on reçoit la leur.',
    cardIds: [
      ...copies('chacal-du-seuil', 2), 'ouvrier-du-natron',
      ...copies('papyrus', 2),
      ...copies('gardienne-de-la-balance', 2), ...copies('scribe-des-feuillets', 2),
      ...copies('pretre-de-la-bouche', 2), ...copies('nom-efface', 2),
      ...copies('offrande-de-lin', 2),
      ...copies('ureus-du-seuil', 2), ...copies('momie-de-lin', 2),
      ...copies('ibis-des-comptes', 2),
      'khopesh-d-or', ...copies('le-poids', 2),
      'celle-qui-pese', 'les-feuillets', 'la-grande-pesee',
      'la-devoreuse', 'celui-qui-juge',
    ],
  },
  {
    id: 'essai-mana-lettres-de-marque',
    name: 'Les Lettres de Marque',
    element: 'hybride',
    elements: ['sable', 'eau'],
    boxArt: 'la-barbe-rousse',
    description: 'Sable + Eau : la course amollit, l’abordage emporte, la rançon paie.',
    cardIds: [
      ...copies('mousse-des-galiotes', 2), ...copies('rais-de-la-galiote', 2),
      ...copies('pilote-de-la-carreira', 2), ...copies('le-brulot', 2),
      ...copies('tercio-de-cuivre', 2), ...copies('cotre-de-course', 2),
      ...copies('le-renegat', 2), 'negociant-des-ranscons',
      'galion-de-la-flotte', 'la-barbe-rousse',
      ...copies('sonneur-fele', 2),
      ...copies('lettre-de-marque', 2), ...copies('haut-fond', 2),
      'le-routier', 'le-grand-debarquement',
      ...copies('lame-de-mer', 2), 'ressac',
      'grappin-d-abordage', 'baton-des-citernes',
    ],
  },
]);

/** Validation propre au prototype, sans changer la règle des decks classiques. */
export function validerDeckManaEssai(deck) {
  const ids = deck?.cardIds;
  const couleurs = deck?.elements;
  if (!Array.isArray(ids) || ids.length !== RPG_MANA_ESSAI_TAILLE) return { ok: false, raison: '30 cartes exigées' };
  if (!Array.isArray(couleurs) || couleurs.length < 1 || couleurs.length > 3
    || new Set(couleurs).size !== couleurs.length || couleurs.some((c) => !RPG_ELEMENTS.includes(c))) {
    return { ok: false, raison: '1 à 3 couleurs valides exigées' };
  }
  const quantites = new Map();
  for (const id of ids) {
    const carte = cardById(id);
    if (!carte || carte.kind === 'terrain') return { ok: false, raison: `carte interdite : ${id}` };
    if (!cardColors(carte).every((couleur) => couleurs.includes(couleur))) {
      return { ok: false, raison: `hors identité : ${id}` };
    }
    quantites.set(id, (quantites.get(id) ?? 0) + 1);
    if (quantites.get(id) > cardCopyLimit(carte)) return { ok: false, raison: `trop d’exemplaires : ${id}` };
    if (RPG_MANA_ESSAI_CARTES_EXCLUES.includes(id)) {
      return { ok: false, raison: `effet lié aux terrains : ${id}` };
    }
  }
  return { ok: true };
}

export function deckManaEssaiParId(id) {
  return RPG_MANA_ESSAI_DECKS.find((deck) => deck.id === id) ?? null;
}

/** Un adversaire différent selon le deck testé ; l'IA choisit aussi ses
 * couleurs quand elle joue un paquet bicolore ou tricolore. */
export function adversaireManaEssai(deck) {
  const index = RPG_MANA_ESSAI_DECKS.findIndex((candidate) => candidate.id === deck?.id);
  return RPG_MANA_ESSAI_DECKS[(index + 1) % RPG_MANA_ESSAI_DECKS.length];
}
