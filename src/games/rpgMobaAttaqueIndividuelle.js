/** Règles de ciblage et bonus propres au combat individuel MOBA. */
import { cardColors, duelCardById } from './rpgCards.js';
import { rpgEstProtegee } from './rpgDuel.js';
import { mobaVoie, MOBA_SIDES } from './rpgMoba.js';

const autre = (side) => side === 'joueur' ? 'sorcier' : 'joueur';
const creature = (e) => e && duelCardById(e.carteId)?.kind !== 'site';

function cibleAccessible(duel, attaquant, cible, ciblee) {
  if (!creature(cible) || !mobaVoie(duel.moba, cible.mobaLane)?.active) return false;
  if (rpgEstProtegee(cible, cardColors(duelCardById(attaquant.carteId)))) return false;
  if (ciblee) return true;
  return cible.mobaLane === attaquant.mobaLane && !cible.infiltration
    && (attaquant.envol || !cible.envol);
}

/** Cibles autorisées à l'annonce. null représente la frappe directe sur la
 * voie de l'attaquant ; une priorité accessible interdit la frappe directe.
 * L'Attaque ciblée utilise l'état effectif (y compris les capacités prêtées).
 */
export function rpgMobaCiblesIndividuelles(duel, side, attackerId) {
  if (!MOBA_SIDES.includes(side) || !duel?.moba) return { cibles: [], directe: false };
  const attaquant = duel[side]?.creatures.find((e) => e.id === attackerId);
  if (!creature(attaquant) || !mobaVoie(duel.moba, attaquant.mobaLane)?.active) return { cibles: [], directe: false };
  const ciblee = Boolean(attaquant.coupRapide);
  const possibles = duel[autre(side)].creatures.filter((e) => cibleAccessible(duel, attaquant, e, ciblee));
  const provocations = possibles.filter((e) => e.provocation);
  // Défenseur ne protège que sa voie de combat, même contre une attaque
  // ciblée qui peut autrement viser une créature sur une autre voie.
  const defenseurs = possibles.filter((e) => e.mobaLane === attaquant.mobaLane && (e.defenseur || e.prioriteAttaqueRapide));
  const prioritaires = provocations.length ? provocations : defenseurs;
  if (prioritaires.length) return { cibles: prioritaires.map((e) => e.id), directe: false };
  return {
    cibles: possibles.map((e) => e.id),
    directe: ciblee || (!attaquant.envol ? possibles.length === 0 : !possibles.some((e) => e.envol)),
  };
}

/** Revalidation après réponse : la cible annoncée ne change jamais, et une
 * priorité apparue après l'annonce ne redirige pas l'attaque. */
export function rpgMobaCibleIndividuelleEncoreLegale(duel, side, attackerId, cibleId, cibleeAnnoncee, voieAnnoncee) {
  if (!MOBA_SIDES.includes(side) || !duel?.moba || duel.moba.winner || duel.moba.centerChoice) return false;
  const attaquant = duel[side]?.creatures.find((e) => e.id === attackerId);
  if (!creature(attaquant) || attaquant.mobaLane !== voieAnnoncee || !mobaVoie(duel.moba, voieAnnoncee)?.active) return false;
  // Perdre Attaque ciblée ou Envol pendant une réponse peut rendre la cible illégale.
  if (cibleeAnnoncee && !attaquant.coupRapide) return false;
  if (cibleId === null) return true;
  const cible = duel[autre(side)]?.creatures.find((e) => e.id === cibleId);
  return cibleAccessible(duel, attaquant, cible, Boolean(cibleeAnnoncee));
}

/** Le bonus est enregistré dans le carnet existant, expirant à la fin de ce tour. */
export function rpgMobaBonusProvocation(duel, side, cibleId) {
  const camp = duel?.[side];
  const cible = camp?.creatures.find((e) => e.id === cibleId);
  if (!cible?.provocation || !MOBA_SIDES.includes(duel.tour)) return false;
  cible.def += 1;
  cible.pv += 1;
  cible.pvMax += 1;
  (camp.bonusTemporaires ??= []).push({ entiteId: cible.id, atk: 0, def: 1, tour: duel.tour });
  return true;
}

/** Excédent avant la frappe, à n'utiliser que si les dégâts ont réellement porté. */
export function rpgMobaExcedentOverkill(attaquant, cible, degats) {
  if (!attaquant?.overkill || !cible) return 0;
  return Math.max(0, (Number(degats) || 0) - Math.max(0, Number(cible.def) || 0));
}
