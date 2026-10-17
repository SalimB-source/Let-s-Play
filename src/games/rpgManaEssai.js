/**
 * Banc d'essai « mana sans terrains ». Ces trois paquets de démonstration sont
 * indépendants des decks enregistrés, de la collection et du Souk. Le format
 * historique (40 cartes avec terrains) n'est pas modifié par cette expérience.
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
export const RPG_MANA_ESSAI_CARTES_EXCLUES = Object.freeze(['boussole-du-hoggar', 'djinn-du-souk']);
/** Le champ de bataille accueille cinq créatures : la sixième exige un
 *  sacrifice — le joueur choisit laquelle, l'IA sacrifie la plus frêle. */
export const RPG_MANA_ESSAI_CHAMP_MAX = 5;

const horsTerrains = (ids) => ids.filter((id) => cardById(id)?.kind !== 'terrain');
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
    cardIds: [
      ...horsTerrains(RPG_DECK_JOUEUR_BASE),
      'tislit-des-aures', ...copies('guetteur-du-beffroi', 2),
      'dune-marchante', ...copies('rempart-de-dunes', 2), 'scribe-de-la-liste',
    ],
  },
  {
    id: 'essai-mana-sable-braise',
    name: 'Les Sentiers ardents',
    element: 'hybride',
    elements: ['sable', 'braise'],
    boxArt: 'djinn-de-foudre',
    description: 'Sable + Braise : choisissez chaque tour la couleur de votre nouveau mana.',
    cardIds: [
      ...horsTerrains(RPG_DECK_HYBRIDE_BASE),
      ...copies('tislit-des-aures', 2), ...copies('ashigaru-des-braises', 2),
      'chien-du-guet', 'rapport-du-greffier', 'dune-marchante',
    ],
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
