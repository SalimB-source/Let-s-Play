/**
 * Exploration d'un palier — « Le Sablier de Bab El ».
 *
 * Entre deux vagues, l'équipe dispose de quelques **heures** avant que le
 * cycle ne reprenne : chaque action en coûte une. On parle, on soigne, on
 * vend, on tranche — jamais contre la montre, toujours en choisissant.
 *
 * Règles pures, sans rendu : l'état d'exploration mute `party` (les mêmes
 * acteurs que le combat) et accumule sable de poche, buffs et drapeaux,
 * appliqués au combat suivant par `rpgApplyExplore`.
 */

import { RPG_SABLE_MAX, RPG_VERRE_MAX } from './rpgCombat.js';

export const RPG_EXPLORE_HOURS = 3;

export function rpgCreateExplore({ places, hours = RPG_EXPLORE_HOURS }) {
  return {
    hours,
    places: places.map((place) => ({ ...place, done: {} })),
    pocket: 0,
    buffs: [],
    flags: [],
    log: [],
  };
}

function applyEffects(explore, party, effects = {}) {
  const team = party.filter((a) => a.side === 'equipe');
  if (effects.healAll) {
    for (const a of team) {
      if (a.alive) a.hp = Math.min(a.maxHp, a.hp + Math.round(a.maxHp * effects.healAll));
    }
  }
  if (effects.healWeak) {
    const alive = team.filter((a) => a.alive);
    if (alive.length) {
      const weakest = alive.reduce((w, a) => (a.hp / a.maxHp < w.hp / w.maxHp ? a : w));
      weakest.hp = weakest.maxHp;
    }
  }
  if (effects.sand) explore.pocket = Math.min(RPG_SABLE_MAX, explore.pocket + effects.sand);
  if (effects.spend) explore.pocket = Math.max(0, explore.pocket - effects.spend);
  if (effects.buff) explore.buffs.push(effects.buff);
  if (effects.name) {
    const target = party.find((a) => a.id === effects.name);
    if (target && target.nameSegments < 3) target.nameSegments += 1;
  }
  if (effects.flag) explore.flags.push(effects.flag);
}

/**
 * Joue une action (ou l'option `option` d'un choix) d'un lieu.
 * Retourne { ok } ou { ok:false, reason } sans rien consommer en cas de refus.
 */
export function rpgExploreAct(explore, party, placeId, actionId, option = null) {
  const place = explore.places.find((p) => p.id === placeId);
  const action = place?.actions.find((a) => a.id === actionId);
  if (!place || !action) return { ok: false, reason: 'introuvable' };
  if (place.done[actionId]) return { ok: false, reason: 'deja-fait' };
  const cost = action.cost ?? 1;
  if (explore.hours < cost) return { ok: false, reason: 'heures' };
  const effects = option == null ? action.effects : action.choices?.[option]?.effects;
  if (!effects) return { ok: false, reason: 'introuvable' };
  if (effects.spend && explore.pocket < effects.spend) {
    return { ok: false, reason: 'sable-insuffisant' };
  }
  explore.hours -= cost;
  place.done[actionId] = true;
  applyEffects(explore, party, effects);
  const text = option == null ? action.text : action.choices?.[option]?.text ?? action.text;
  explore.log.push(text);
  return { ok: true, text };
}

/** Verse l'exploration dans le combat suivant : sable, buffs, préparation. */
export function rpgApplyExplore(explore, battle) {
  if (explore.pocket > 0) {
    battle.ground.equipe = Math.min(RPG_SABLE_MAX, battle.ground.equipe + explore.pocket);
  }
  for (const buff of explore.buffs) {
    if (buff === 'verre') battle.verre = Math.min(RPG_VERRE_MAX, battle.verre + 1);
    if (buff === 'pret') battle.clock += 1;
    if (buff === 'atk') {
      for (const a of battle.actors) if (a.side === 'equipe') a.atk = Math.round(a.atk * 1.1);
    }
    if (buff === 'sourdine') {
      for (const a of battle.actors) if (a.side === 'ennemi') a.atk = Math.round(a.atk * 0.9);
    }
  }
  return explore;
}
