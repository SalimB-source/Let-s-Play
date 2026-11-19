/**
 * Le Sablier — le **recul du bout du plateau**.
 *
 * Une créature qui atteint le bout du plateau — la dernière rangée avant le
 * sorcier adverse — et qui le frappe ne peut pas s'y installer : elle est
 * **repoussée d'une case**, vers son propre camp. Un assaillant ne campe pas
 * sur la ligne du sorcier.
 *
 * ## La chaîne
 *
 * Le recul ne s'arrête pas au premier corps. Si la case derrière la frappeuse
 * est tenue par une créature, celle-ci recule d'une case avant elle, et ainsi
 * de suite dans la même colonne — la chaîne se déplie tant que la place est
 * libre derrière.
 *
 * **La chaîne s'arrête au blocage** : un bord du camp, un Site (un Site ne
 * marche pas) ou une case hors grille arrêtent le recul. Les créatures devant
 * le blocage ne bougent alors pas non plus — leur case n'est pas libérée —,
 * mais rien n'est cassé : la frappe a eu lieu, et le plateau reste cohérent.
 *
 * ## Le périmètre
 *
 * - **Les deux camps** : nos créatures repoussées après avoir frappé le
 *   sorcier, et celles du sorcier après avoir frappé le nôtre. La règle est
 *   symétrique.
 * - **Rien sans les lignes** : le champ d'origine (cinq cases, une seule
 *   rangée) n'a pas de bout du plateau ; les modes historiques et le MOBA
 *   gardent leur géométrie.
 * - **Aucun coût** : la créature a déjà frappé (elle est `attaquee`), le recul
 *   ne consomme ni pas ni attaque — c'est le plateau qui la déplace.
 */

import {
  RPG_RANGEE_JOUEUR_FOND, RPG_RANGEE_SORCIER_FOND, RPG_RANGEES,
  campDeRangee, caseLocale, positionDe,
} from './rpgChamp.js';
import { duelCardById } from './rpgCards.js';
import { lignesActives } from './rpgLignes.js';

/** Une case de recul. */
export const RPG_RECUL_CASES = 1;

/** La rangée du bout du plateau pour ce camp : celle qui touche le sorcier
 *  adverse. Le joueur le frappe depuis le fond du sorcier, le sorcier depuis
 *  le nôtre. */
export function rangeeDuBout(cote) {
  return cote === 'joueur' ? RPG_RANGEE_SORCIER_FOND : RPG_RANGEE_JOUEUR_FOND;
}

/** Le sens du recul : on s'éloigne du sorcier que l'on vient de frapper. */
export function sensDuRecul(cote) {
  return cote === 'joueur' ? 1 : -1;
}

/** Cette créature se tient-elle sur le bout du plateau, face au sorcier
 *  adverse ? */
export function rpgAuBoutDuPlateau(duel, cote, entite) {
  if (!entite || !lignesActives(duel) || duel?.moba) return false;
  const position = positionDe(entite, cote);
  return Boolean(position) && position.rangee === rangeeDuBout(cote);
}

const estSite = (entite) => duelCardById(entite?.carteId)?.kind === 'site';

/**
 * Repousse d'une case la créature qui vient de frapper le sorcier depuis le
 * bout du plateau, et toute la chaîne de créatures derrière elle.
 *
 * Rend `{ ok, reculs }` — `reculs` liste les déplacements réellement faits,
 * du plus lointain au plus proche, pour que l'appelant puisse animer ou
 * journaliser. `raison` dit pourquoi rien n'a bougé le cas échéant :
 * `sans-lignes`, `pas-au-bout`, `bord`, `site`, `case`.
 */
export function rpgReculerApresFrappe(duel, cote, entiteId) {
  const rien = (raison) => ({ ok: false, raison, reculs: [] });
  if (!duel || duel.moba || !lignesActives(duel)) return rien('sans-lignes');
  const entite = duel[cote]?.creatures?.find((e) => e.id === entiteId);
  if (!entite || !rpgAuBoutDuPlateau(duel, cote, entite)) return rien('pas-au-bout');

  // Qui tient quelle case, les deux camps confondus : une chaîne traverse les
  // deux propriétaires sans s'en soucier.
  const occupants = new Map();
  for (const proprietaire of ['joueur', 'sorcier']) {
    for (const candidate of duel[proprietaire]?.creatures ?? []) {
      const position = positionDe(candidate, proprietaire);
      if (!position) continue;
      occupants.set(`${position.rangee}:${position.colonne}`, { entite: candidate, cote: proprietaire });
    }
  }

  const position = positionDe(entite, cote);
  const sens = sensDuRecul(cote);
  // 1. La chaîne : la frappeuse, puis chaque créature derrière elle, même
  //    colonne. On s'arrête au premier trou — c'est lui qui fait de la place.
  const chaine = [{ entite, cote, rangee: position.rangee }];
  let rangee = position.rangee;
  for (;;) {
    const suivante = rangee + sens * RPG_RECUL_CASES;
    if (!RPG_RANGEES.includes(suivante)) return rien('bord');
    const occupant = occupants.get(`${suivante}:${position.colonne}`);
    if (!occupant) break;
    // Un Site ne marche pas : il bloque la chaîne, et ceux devant lui non plus
    // ne bougent pas (leur case n'est pas libérée).
    if (estSite(occupant.entite)) return rien('site');
    chaine.push({ ...occupant, rangee: suivante });
    rangee = suivante;
  }

  // 2. Le décalage, du plus lointain au plus proche : chacun prend la case
  //    laissée libre par celui qui le précède.
  const reculs = [];
  for (const membre of [...chaine].reverse()) {
    const camp = campDeRangee(membre.rangee + sens);
    const index = caseLocale(camp, membre.rangee + sens, position.colonne);
    if (index === null) return rien('case');
    const avant = membre.entite.emplacement;
    membre.entite.emplacement = index;
    if (camp === membre.cote) delete membre.entite.campPose;
    else membre.entite.campPose = camp;
    // La case n'est plus celle de sa fiche : la remise en ligne ne doit pas
    // rapatrier la créature.
    membre.entite.avancee = true;
    reculs.push({ entiteId: membre.entite.id, cote: membre.cote, avant, apres: index, rangee: membre.rangee + sens });
  }
  reculs.reverse();
  const noms = reculs.map((recul) => duel[recul.cote].creatures.find((e) => e.id === recul.entiteId)?.name ?? 'une créature');
  duel.log.push(reculs.length > 1
    ? `Le bout du plateau ne se tient pas : ${noms.join(', ')} reculent d’une case.`
    : `${noms[0]} est repoussée d’une case — le bout du plateau ne se tient pas.`);
  return { ok: true, reculs };
}
