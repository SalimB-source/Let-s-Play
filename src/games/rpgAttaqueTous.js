/** « Attaquer avec tous » : la vague de frappes directes du combat individuel.
 * Une créature prête qui n'a plus aucune cible atteignable n'a qu'une action
 * légale — frapper le sorcier. Quand toutes les créatures prêtes sont dans ce
 * cas (champ adverse vide, ou peuplé de volantes et d'infiltrées hors de
 * portée), la vague peut partir d'un seul geste. Dès qu'une seule créature
 * adverse reste atteignable, la vague n'a plus lieu d'être : on garde le
 * combat contre l'atteignable. */
import { rpgPeutAttaquer } from './rpgDuel.js';
import { rpgCiblesIndividuellesClassique } from './rpgCombatIndividuelClassique.js';
import { rpgMobaCiblesIndividuelles } from './rpgMobaAttaqueIndividuelle.js';
import { mobaVoiesCombat } from './rpgMoba.js';

/** Créatures prêtes dont la seule action légale est la frappe directe, dans
 * l'ordre du champ. Vide hors duel classique/PvP (le MOBA a ses voies). */
export function rpgVagueDirecteClassique(duel, cote) {
  if (!duel || duel.moba || !duel[cote]?.creatures) return [];
  return duel[cote].creatures.filter((entite) => {
    if (!rpgPeutAttaquer(entite)) return false;
    const choix = rpgCiblesIndividuellesClassique(duel, cote, entite.id);
    return choix.directe && !choix.cibles.length;
  });
}

/** La vague est-elle proposée ? Il faut au moins une créature prête, et aucune
 * créature prête ne doit conserver une cible atteignable. */
export function rpgAttaqueTousDisponible(duel, cote) {
  const prets = (duel?.[cote]?.creatures ?? []).filter((entite) => rpgPeutAttaquer(entite));
  if (!prets.length) return false;
  return rpgVagueDirecteClassique(duel, cote).length === prets.length;
}

/** Même règle en Conquête, voie par voie : chaque créature prête dont aucune
 * voie ne porte de cible atteignable peut frapper le sorcier directement. La
 * voie retenue est la première qui ouvre la frappe directe. */
export function rpgVagueDirecteMoba(duel, side) {
  if (!duel?.moba || !duel[side]?.creatures) return [];
  return duel[side].creatures.flatMap((entite) => {
    if (!rpgPeutAttaquer(entite)) return [];
    const voie = mobaVoiesCombat(duel.moba, entite.mobaLane).find((voieAttaque) => {
      const choix = rpgMobaCiblesIndividuelles(duel, side, entite.id, voieAttaque);
      return choix.directe && !choix.cibles.length;
    });
    return voie ? [{ id: entite.id, voie }] : [];
  });
}

/** La vague est-elle proposée en Conquête ? Comme en duel classique, il faut
 * que TOUTES les créatures prêtes n'aient plus rien d'atteignable. */
export function rpgAttaqueTousMobaDisponible(duel, side) {
  const prets = (duel?.[side]?.creatures ?? []).filter((entite) => rpgPeutAttaquer(entite));
  if (!prets.length) return false;
  return rpgVagueDirecteMoba(duel, side).length === prets.length;
}
