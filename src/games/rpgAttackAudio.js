/**
 * Le son d'une résolution de combat du Sablier — qui frappe, et avec quoi.
 *
 * Le jeu n'a que deux frappes de créature :
 *
 *  - **l'Attaque ciblée** (le coup rapide) est un **tir à distance** : la
 *    créature désigne sa proie avant le combat, 25 % de chances de rater, et
 *    son attaque s'arrête sur la frappe. Elle siffle comme une flèche
 *    (`fleche`, `arrow-shot.wav`) — **y compris quand la flèche manque sa
 *    cible** : un tir qui rate reste un tir, et il n'y a aucun repli d'acier
 *    derrière.
 *  - **le corps à corps** — une créature bloquée, ou la plaque du sorcier —
 *    garde le coup d'épée commun (`player_attack_hit`,
 *    `player-attack-hit.wav`), ou le souffle de l'élément quand une capacité
 *    de combat qui blesse se déclenche (`rpgCombatSound`).
 *
 * Les deux ne se superposent jamais pour un même attaquant : une créature
 * arrêtée par sa frappe ciblée ne combat pas, une créature qui combat n'a pas
 * touché sa proie. Une résolution peut donc demander **les deux sons** — deux
 * attaquants différents — mais jamais l'un à la place de l'autre.
 *
 * `rpgSonsResolutionCombat` lit le résumé du moteur (`resume.coupsRapides`,
 * `resume.paires`) et rend les sons à jouer, dans l'ordre : la flèche d'abord,
 * le choc ensuite. La frappe directe au sorcier reste à la charge de la page
 * (`resume.frappeSorcier`), c'est la plaque qui sonne, pas une créature.
 */
import { RPG_ARROW_SFX } from './rpgAudio.js';

/** Le coup d'épée commun à toutes les frappes de créature au corps à corps. */
export const RPG_MELEE_SFX = 'player_attack_hit';

/**
 * **L'acier ne s'annonce que s'il va frapper.**
 *
 * `attackers_confirm` est un choc de lames : il annonce la vague d'attaque au
 * moment où on la valide. Une vague qui ne tire que des flèches ne dégaine pas
 * d'épée — l'Attaque ciblée fait entendre sa flèche, et rien d'autre. Ce
 * prédicat répond à la question « reste-t-il un attaquant qui frappera au corps
 * à corps ? » ; `ciblesCoupRapide` associe un attaquant à la proie qu'il a
 * désignée (`{ [attaquantId]: cibleId }`).
 *
 * Avant la désignation des proies, l'appelant passe les cartes de la vague :
 * un archer (`coupRapide`) qui n'a pas encore choisi peut encore finir au corps
 * à corps, mais un archer désigné, non.
 */
export function rpgVagueAnnonceAcier(attaquantsIds = [], ciblesCoupRapide = {}) {
  return attaquantsIds.some((id) => !ciblesCoupRapide?.[id]);
}

/**
 * Les frappes ciblées réellement portées : ni annulées (la proie avait
 * disparu), ni ratées (le coup rapide a manqué sa cible).
 */
export function rpgFrappesCibleesReussies(resume) {
  const coups = Array.isArray(resume?.coupsRapides) ? resume.coupsRapides : [];
  return coups.filter((coup) => !coup?.annule && !coup?.rate);
}

/** Une frappe ciblée a-t-elle porté pendant cette résolution ? */
export function rpgResolutionAToucheUneCible(resume) {
  return rpgFrappesCibleesReussies(resume).length > 0;
}

/**
 * Les frappes ciblées dont la flèche est réellement partie : ni annulées (la
 * proie avait déjà disparu, l'arc ne se bande pas), ni… ratées — un tir qui
 * manque reste un tir. Une frappe `rate` siffle donc comme les autres : c'est
 * la seule chose qu'un coup rapide fait entendre, jamais l'acier du repli.
 */
export function rpgFrappesCibleesTirees(resume) {
  const coups = Array.isArray(resume?.coupsRapides) ? resume.coupsRapides : [];
  return coups.filter((coup) => !coup?.annule);
}

/**
 * Les sons d'une résolution de combat, dans l'ordre d'écoute :
 * `[{ nom, delai, fleches, touchees }]`. Un duel sans frappe ciblée ni corps à
 * corps (toutes les proies disparues, tout le monde gelé) ne sonne pas ici.
 *
 * La flèche part dès qu'une frappe ciblée est tirée, qu'elle porte ou non :
 * c'est le seul son d'un coup rapide, et le seul retour sonore d'un raté. La
 * page n'a donc aucun repli métallique à jouer derrière.
 *
 * `sonMelee` laisse la page passer le souffle de l'élément quand une capacité
 * de combat qui blesse se déclenche ; la flèche, elle, ne change jamais.
 */
export function rpgSonsResolutionCombat(resume, {
  sonMelee = RPG_MELEE_SFX,
  sonFleche = RPG_ARROW_SFX,
  delai = 0.015,
} = {}) {
  const sons = [];
  const tirees = rpgFrappesCibleesTirees(resume);
  if (tirees.length) {
    sons.push({
      nom: sonFleche,
      delai,
      fleches: tirees.length,
      touchees: tirees.filter((coup) => !coup?.rate).length,
    });
  }
  // `paires` : chaque attaquant qui a rencontré un bloqueur. Un attaquant
  // arrêté par sa flèche n'y figure pas.
  if ((resume?.paires?.length ?? 0) > 0 && sonMelee) sons.push({ nom: sonMelee, delai });
  return sons;
}
