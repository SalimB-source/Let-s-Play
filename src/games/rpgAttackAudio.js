/**
 * Le son d'une résolution de combat du Sablier — qui frappe, et avec quoi.
 *
 * Le jeu n'a que deux frappes de créature :
 *
 *  - **l'Attaque ciblée** (le coup rapide) est un **tir à distance** : la
 *    créature désigne sa proie avant le combat, 30 % de chances de rater, et
 *    son attaque s'arrête sur la frappe. Elle siffle comme une flèche
 *    (`fleche`, `arrow-shot.wav`).
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
 * Les sons d'une résolution de combat, dans l'ordre d'écoute :
 * `[{ nom, delai, fleches }]`. Un duel sans frappe ciblée ni corps à corps
 * (toutes les proies disparues, tout le monde gelé) ne sonne pas ici.
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
  const fleches = rpgFrappesCibleesReussies(resume).length;
  if (fleches) sons.push({ nom: sonFleche, delai, fleches });
  // `paires` : chaque attaquant qui a rencontré un bloqueur. Un attaquant
  // arrêté par sa flèche n'y figure pas.
  if ((resume?.paires?.length ?? 0) > 0 && sonMelee) sons.push({ nom: sonMelee, delai });
  return sons;
}
