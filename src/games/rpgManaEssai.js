/**
 * Règles du mana sans terrains et douze archétypes bicolores partagés.
 * Le nom historique « essai » reste stable pour les états du moteur.
 */
import { RPG_DECKS_THEMATIQUES } from './rpgDecksThematiques.js';
import {
  RPG_ELEMENTS,
  cardById,
  cardColors,
  cardCopyLimit,
} from './rpgCards.js';

export const RPG_MODE_MANA_ESSAI = 'essai';
export const RPG_MANA_ESSAI_TAILLE = 30;
export const RPG_MANA_ESSAI_MAX = 10;
/** Cinq cartes au départ, comme en duel classique et dans tous les autres modes. */
export const RPG_MANA_ESSAI_MAIN_DEPART = 5;
/** Taille de main maximale à la fin d'un tour : l'excédent est défaussé. */
export const RPG_MANA_ESSAI_MAIN_MAX = 6;
export const RPG_MANA_ESSAI_CARTES_EXCLUES = Object.freeze([]);
/** Le champ de bataille accueille cinq créatures, dessinées en cinq
 *  emplacements de chaque côté du plateau : la sixième exige un sacrifice —
 *  le joueur choisit laquelle, l'IA sacrifie la plus frêle. */
export const RPG_MANA_ESSAI_CHAMP_MAX = 5;

/** Les cinq anciens identifiants restent utilisables dans les sauvegardes.
 * Chaque liste provient du même catalogue que le mode MOBA et le duel classique. */
const ID_ESSAI = Object.freeze({
  sable: 'essai-mana-sable',
  sahir: 'essai-mana-sable-braise',
  lionne: 'essai-mana-trois-couleurs',
  papyrus: 'essai-mana-tenebres',
  corsaires: 'essai-mana-lettres-de-marque',
});
export const RPG_MANA_ESSAI_DECKS = Object.freeze(RPG_DECKS_THEMATIQUES.map((theme) => Object.freeze({
  id: ID_ESSAI[theme.id] ?? `essai-mana-${theme.id}`,
  name: theme.name, element: 'hybride', elements: theme.elements,
  boxArt: theme.boxArt ?? theme.cardIds[0], description: theme.description, cardIds: theme.cardIds,
})));

/** Validation propre au prototype, sans changer la règle des decks classiques. */
export function validerDeckManaEssai(deck) {
  const ids = deck?.cardIds;
  const couleurs = deck?.elements;
  if (!Array.isArray(ids) || ids.length !== RPG_MANA_ESSAI_TAILLE) return { ok: false, raison: '30 cartes exigées' };
  if (!Array.isArray(couleurs) || couleurs.length < 1 || couleurs.length > 2
    || new Set(couleurs).size !== couleurs.length || couleurs.some((c) => !RPG_ELEMENTS.includes(c))) {
    return { ok: false, raison: '1 à 2 couleurs valides exigées' };
  }
  const quantites = new Map();
  for (const id of ids) {
    const carte = cardById(id);
    if (!carte || carte.kind === 'terrain' || carte.ascension) return { ok: false, raison: `carte interdite : ${id}` };
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
 * couleurs quand elle joue un paquet bicolore. */
export function adversaireManaEssai(deck) {
  const index = RPG_MANA_ESSAI_DECKS.findIndex((candidate) => candidate.id === deck?.id);
  return RPG_MANA_ESSAI_DECKS[(index + 1) % RPG_MANA_ESSAI_DECKS.length];
}
