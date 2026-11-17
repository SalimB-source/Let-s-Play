import { attaqueDirectePermise, estDefenseur } from './rpgDefenseur.js';
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
  const prioritaires = attaquant.infiltration ? [] : possibles.filter((e) => mobaPartageVoie(duel.moba, e.mobaLane, voie) && estDefenseur(e));
  const adversairesVoie = duel[autre(side)].creatures.filter((e) => creature(e) && mobaPartageVoie(duel.moba, e.mobaLane, voie));
  return {
    cibles: (prioritaires.length ? prioritaires : possibles).map((e) => e.id),
    directe: attaqueDirectePermise(attaquant, adversairesVoie),
  };
}

/** La voie choisie reste fixe ; une frappe directe devenue interdite est annulée. */
export function rpgMobaCibleIndividuelleEncoreLegale(duel, side, attackerId, cibleId, cibleeAnnoncee, voieAnnoncee) {
  if (!MOBA_SIDES.includes(side) || !duel?.moba || duel.moba.winner || duel.moba.centerChoice) return false;
  const attaquant = duel[side]?.creatures.find((e) => e.id === attackerId);
  if (!creature(attaquant) || !mobaVoiesCombat(duel.moba, attaquant.mobaLane).includes(voieAnnoncee) || !mobaVoie(duel.moba, voieAnnoncee)?.active) return false;
  if (cibleeAnnoncee && !attaquant.coupRapide) return false;
  if (cibleId === null) return attaqueDirectePermise(attaquant, duel[autre(side)].creatures.filter((e) => creature(e) && mobaPartageVoie(duel.moba, e.mobaLane, voieAnnoncee)));
  const cible = duel[autre(side)]?.creatures.find((e) => e.id === cibleId);
  return cibleAccessible(duel, attaquant, cible, Boolean(cibleeAnnoncee), voieAnnoncee);
}

/** Excédent avant la frappe, à n'utiliser que si les dégâts ont réellement porté. */
export function rpgMobaExcedentOverkill(attaquant, cible, degats) {
  if (!attaquant?.overkill || !cible) return 0;
  return Math.max(0, (Number(degats) || 0) - Math.max(0, Number(cible.def) || 0));
}
