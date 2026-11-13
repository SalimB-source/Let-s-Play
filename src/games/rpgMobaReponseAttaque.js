import { cardById } from './rpgCards.js';
import { mobaVoieJouable } from './rpgMoba.js';
import { rpgReglerHasard } from './rpgDuel.js';
import {
  MOBA_CONTRESORTS, MOBA_MAGIES_ALLIEES, MOBA_MAGIES_CIBLEES, MOBA_MAGIES_NEUTRES,
  MOBA_MAGIES_PRIX, MOBA_MAGIES_REANIMATION, MOBA_MAGIES_SOINS, MOBA_MAGIES_SPATIALES,
  MOBA_MAGIES_TRANSFERT, MOBA_MAGIES_VOIES,
  rpgMobaLancerMagie, rpgMobaPeutPayer, rpgMobaSortBlocageInterdit, rpgMobaPeutEmbuscade,
} from './rpgMobaLocal.js';

/** Candidats de ciblage pour les magies auditées ; le moteur reste seul juge
 * de leur légalité, y compris protections, mana, prix et cibles spéciales. */
function* candidatsMagie(duel, side, id) {
  const ennemi = side === 'joueur' ? 'sorcier' : 'joueur';
  const voies = duel.moba.lanes.filter((voie) => voie.active).map((voie) => voie.id);
  if (MOBA_MAGIES_REANIMATION.includes(id)) {
    for (const voie of duel.moba.lanes) if (mobaVoieJouable(duel.moba, side, voie.id)) {
      for (let slot = 0; slot < voie.slots[side].length; slot++) {
        if (voie.slots[side][slot] === null) yield [null, voie.id, null, null, slot];
      }
    }
  } else if (MOBA_MAGIES_PRIX.includes(id)) {
    for (const voie of voies) for (const prix of voies) yield [null, voie, prix, null, null];
  } else if (MOBA_MAGIES_SOINS.includes(id) || MOBA_MAGIES_TRANSFERT.includes(id)) {
    for (const voie of voies) {
      yield [null, voie, null, null, null];
      if (id === 'le-poids') for (const cible of duel[ennemi].creatures) yield [cible.id, voie, null, null, null];
    }
  } else if (MOBA_MAGIES_CIBLEES.includes(id)) {
    const cotes = MOBA_MAGIES_NEUTRES.includes(id) ? [side, ennemi] : [MOBA_MAGIES_ALLIEES.includes(id) ? side : ennemi];
    for (const cote of cotes) for (const cible of duel[cote].creatures) {
      if (id !== 'defi-du-jarl') yield [cible.id, null, null, null, null];
      if (id === 'defi-du-jarl' || id === 'feux-de-kitsune') {
        const secondaires = duel[id === 'defi-du-jarl' ? side : cote].creatures;
        for (const autre of secondaires) yield [cible.id, null, null, autre.id, null];
      }
    }
    if (MOBA_MAGIES_VOIES.includes(id)) for (const voie of voies) yield ['sorcier', voie, null, null, null];
  } else if (MOBA_MAGIES_SPATIALES.includes(id)) {
    for (const voie of voies) yield [null, voie, null, null, null];
  } else yield [null, null, null, null, null];
}

/** Une réponse légale existe-t-elle, sans consommer ni modifier le duel réel ?
 * Contrairement à l'IA, on ne juge jamais l'utilité stratégique d'une réponse. */
export function rpgMobaPeutRepondreAttaque(duel, side) {
  if (!duel?.moba || !duel[side] || !duel.combatDeclare?.cibleIndividuelle
    || duel.combatDeclare.cote === side || !duel.fenetreReponse) return false;
  for (const id of new Set(duel[side].main)) {
    const carte = cardById(id);
    if (!carte) continue;
    if (rpgMobaPeutEmbuscade(duel, side, id)) return true;
    if (carte.kind !== 'magie' || !carte.instant || MOBA_CONTRESORTS.includes(id)
      || rpgMobaSortBlocageInterdit(id) || !rpgMobaPeutPayer(duel, side, carte)) continue;
    for (const [cible, voie, prix, secondaire, slot] of candidatsMagie(duel, side, id)) {
      try {
        const copie = JSON.parse(JSON.stringify(duel));
        rpgReglerHasard(copie, () => 0.5);
        if (rpgMobaLancerMagie(copie, side, id, cible, voie, prix, {
          cibleSecondaireId: secondaire, emplacementReanimation: slot,
        }).ok) return true;
      } catch {
        // En cas d'état inconnu, ne jamais priver le joueur de sa réponse.
        return true;
      }
    }
  }
  return false;
}
