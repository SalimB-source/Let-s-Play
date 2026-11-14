/** Règles de ciblage et bonus propres au combat individuel MOBA. */
import { cardColors, duelCardById } from './rpgCards.js';
import { rpgEstProtegee } from './rpgDuel.js';
import { mobaVoie, mobaVoiesCombat, mobaPartageVoie, MOBA_SIDES } from './rpgMoba.js';

const autre = (side) => side === 'joueur' ? 'sorcier' : 'joueur';
const creature = (e) => e && duelCardById(e.carteId)?.kind !== 'site';

function cibleAccessible(duel, attaquant, cible, ciblee, voieAttaque) {
  if (!creature(cible) || !mobaVoiesCombat(duel.moba, cible.mobaLane).length) return false;
  if (rpgEstProtegee(cible, cardColors(duelCardById(attaquant.carteId)))) return false;
  if (ciblee) return true;
  return mobaPartageVoie(duel.moba, cible.mobaLane, voieAttaque) && !cible.infiltration
    && (attaquant.envol || !cible.envol);
}

/** Cibles légales depuis une voie donnée. Pour le centre conquis, sans voie
 * explicite, réunit les choix des deux voies sans les doubler. */
export function rpgMobaCiblesIndividuelles(duel, side, attackerId, voieAttaque = null) {
  if (!MOBA_SIDES.includes(side) || !duel?.moba) return { cibles: [], directe: false };
  const attaquant = duel[side]?.creatures.find((e) => e.id === attackerId);
  if (!creature(attaquant)) return { cibles: [], directe: false };
  const voies = mobaVoiesCombat(duel.moba, attaquant.mobaLane);
  if (voieAttaque && !voies.includes(voieAttaque)) return { cibles: [], directe: false };
  if (!voieAttaque && voies.length > 1) {
    const choix = voies.map((voie) => rpgMobaCiblesIndividuelles(duel, side, attackerId, voie));
    return { cibles: [...new Set(choix.flatMap((v) => v.cibles))], directe: choix.some((v) => v.directe) };
  }
  const voie = voieAttaque ?? voies[0];
  if (!voie) return { cibles: [], directe: false };
  const ciblee = Boolean(attaquant.coupRapide);
  const possibles = duel[autre(side)].creatures.filter((e) => cibleAccessible(duel, attaquant, e, ciblee, voie));
  const provocations = possibles.filter((e) => e.provocation);
  const defenseurs = possibles.filter((e) => mobaPartageVoie(duel.moba, e.mobaLane, voie) && (e.defenseur || e.prioriteAttaqueRapide));
  const prioritaires = provocations.length ? provocations : defenseurs;
  if (prioritaires.length) return { cibles: prioritaires.map((e) => e.id), directe: false };
  return {
    cibles: possibles.map((e) => e.id),
    directe: true,
  };
}

/** La voie choisie à l'annonce reste fixe pendant la fenêtre de réponse. */
export function rpgMobaCibleIndividuelleEncoreLegale(duel, side, attackerId, cibleId, cibleeAnnoncee, voieAnnoncee) {
  if (!MOBA_SIDES.includes(side) || !duel?.moba || duel.moba.winner || duel.moba.centerChoice) return false;
  const attaquant = duel[side]?.creatures.find((e) => e.id === attackerId);
  if (!creature(attaquant) || !mobaVoiesCombat(duel.moba, attaquant.mobaLane).includes(voieAnnoncee) || !mobaVoie(duel.moba, voieAnnoncee)?.active) return false;
  if (cibleeAnnoncee && !attaquant.coupRapide) return false;
  if (cibleId === null) return true;
  const cible = duel[autre(side)]?.creatures.find((e) => e.id === cibleId);
  return cibleAccessible(duel, attaquant, cible, Boolean(cibleeAnnoncee), voieAnnoncee);
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
