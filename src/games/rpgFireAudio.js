/**
 * Routing des bruitages Braise du Sablier.
 * Les sons dépendent de l'origine de l'action : une attaque, un sort ou une
 * capacité de créature Braise doit conserver son identité sonore, y compris
 * pour les cartes hybrides.
 */
import { cardById, cardColors } from './rpgCards.js';

export const RPG_FIRE_SFX = 'flame_gust';

const CREATURE_KINDS = new Set(['creature', 'hero']);

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
      return CREATURE_KINDS.has(card.kind) && card.arrivee ? RPG_FIRE_SFX : null;
    case 'combat':
      return CREATURE_KINDS.has(card.kind) && card.combat ? RPG_FIRE_SFX : null;
    case 'destruction':
      return CREATURE_KINDS.has(card.kind) && card.destruction ? RPG_FIRE_SFX : null;
    default:
      return null;
  }
}

/**
 * Le son d'un combat est Braise si l'un des attaquants est une créature Braise,
 * ou si une capacité de combat d'une créature Braise (attaquante ou bloqueuse)
 * se déclenche.
 */
export function rpgCombatFireSound(duel, attackerIds = [], blockersByAttacker = {}) {
  const creatures = new Map([
    ...(duel?.joueur?.creatures ?? []),
    ...(duel?.sorcier?.creatures ?? []),
  ].map((creature) => [creature.id, creature]));
  const blockers = new Set(Object.values(blockersByAttacker ?? {}).flatMap((ids) => (
    Array.isArray(ids) ? ids : []
  )));

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
