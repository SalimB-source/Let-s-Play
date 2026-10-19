/**
 * Routing des bruitages Braise du Sablier.
 * Les sons dépendent de l'origine de l'action : une attaque, un sort ou une
 * capacité de créature Braise doit conserver son identité sonore, y compris
 * pour les cartes hybrides.
 */
import { cardById, cardColors } from './rpgCards.js';

export const RPG_FIRE_SFX = 'flame_gust';
/** La frappe d'un Samouraï : l'acier, pas le feu. */
export const RPG_SWORD_SFX = 'sword';

const CREATURE_KINDS = new Set(['creature', 'hero']);

/**
 * Les seuls effets d'arrivée qui SONNENT comme le feu : ceux qui brûlent
 * réellement la table. Une carte Braise dont l'arrivée crée des jetons, exile,
 * pioche ou détruit un terrain n'a pas de souffle à elle — le Daimyō du Soleil
 * rouge lève ses Samouraïs, il ne met pas le feu ; c'est `card_place` qui
 * l'annonce, comme pour toute créature posée.
 */
const ARRIVEES_DE_FEU = new Set(['degats']);

function resolveCard(cardOrId) {
  return typeof cardOrId === 'string' ? cardById(cardOrId) : cardOrId;
}

/** Retourne le bruitage Braise associé à un type d'action, sinon `null`. */
export function rpgFireSoundFor(cardOrId, action) {
  const card = resolveCard(cardOrId);
  if (!card || !cardColors(card).includes('braise')) return null;

  switch (action) {
    case 'spell':
      return card.kind === 'magie' ? RPG_FIRE_SFX : null;
    case 'attack':
      return CREATURE_KINDS.has(card.kind) ? RPG_FIRE_SFX : null;
    case 'arrival':
      return CREATURE_KINDS.has(card.kind) && ARRIVEES_DE_FEU.has(card.arrivee?.type) ? RPG_FIRE_SFX : null;
    case 'combat':
      return CREATURE_KINDS.has(card.kind) && card.combat ? RPG_FIRE_SFX : null;
    case 'destruction':
      return CREATURE_KINDS.has(card.kind) && (card.destruction || card.honneur) ? RPG_FIRE_SFX : null;
    default:
      return null;
  }
}

/**
 * Un Samouraï frappe à la lame. Le type se lit sur la ligne **imprimée**, comme
 * la Résonance : un yōkai qui porte la Résonance samouraï (le Tengu, Kagutsuchi)
 * n'est pas un Samouraï et garde le souffle de sa couleur.
 */
export function carteFrappeALaLame(cardOrId) {
  const card = resolveCard(cardOrId);
  if (!card || !CREATURE_KINDS.has(card.kind)) return false;
  return /Samouraï/.test(card.typeLine ?? '');
}

/**
 * Le son d'un combat : l'acier quand l'attaquant est un Samouraï, sinon la
 * Braise si l'un des attaquants est une créature Braise, ou si une capacité de
 * combat d'une créature Braise (attaquante ou bloqueuse) se déclenche.
 */
export function rpgCombatSound(duel, attackerIds = [], blockersByAttacker = {}) {
  const creatures = new Map([
    ...(duel?.joueur?.creatures ?? []),
    ...(duel?.sorcier?.creatures ?? []),
  ].map((creature) => [creature.id, creature]));
  const blockers = new Set(Object.values(blockersByAttacker ?? {}).flatMap((ids) => (
    Array.isArray(ids) ? ids : []
  )));

  for (const id of attackerIds) {
    const card = cardById(creatures.get(id)?.carteId);
    if (carteFrappeALaLame(card)) return RPG_SWORD_SFX;
  }
  for (const id of attackerIds) {
    const card = cardById(creatures.get(id)?.carteId);
    if (rpgFireSoundFor(card, 'attack') || rpgFireSoundFor(card, 'combat')) {
      return RPG_FIRE_SFX;
    }
  }
  for (const id of blockers) {
    const card = cardById(creatures.get(id)?.carteId);
    if (rpgFireSoundFor(card, 'combat')) return RPG_FIRE_SFX;
  }
  return null;
}
