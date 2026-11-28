import { estDefenseur } from './rpgDefenseur.js';
import { rpgCiblesIndividuellesClassique } from './rpgCombatIndividuelClassique.js';
import { rpgMobaCiblesIndividuelles } from './rpgMobaAttaqueIndividuelle.js';
import { mobaPartageVoie, mobaVoiesCombat } from './rpgMoba.js';

/** Explique le choix d'attaque sans réimplémenter la portée ou les lignes.
 * La comparaison avec une copie infiltrée retire seulement le filtre de
 * priorité ; elle n'est jamais envoyée au moteur ni appliquée au duel. */
export function prioriteDefenseurVisuelle(duel, cote, attaquantId) {
  const attaquant = duel?.[cote]?.creatures?.find((e) => e.id === attaquantId);
  if (!attaquant || attaquant.infiltration) return null;
  const adverse = cote === 'joueur' ? 'sorcier' : 'joueur';
  const ennemis = duel[adverse]?.creatures ?? [];
  const sansPriorite = { ...duel, [cote]: { ...duel[cote], creatures: duel[cote].creatures.map((e) => e.id === attaquantId ? { ...e, infiltration: true } : e) } };
  const cibleur = duel.moba ? rpgMobaCiblesIndividuelles : rpgCiblesIndividuellesClassique;
  const choix = cibleur(duel, cote, attaquantId);
  const sans = cibleur(sansPriorite, cote, attaquantId);
  const autorisees = new Set(choix.cibles);
  let prioritaires;
  if (duel.moba) {
    // Une Attaque ciblée peut atteindre une autre voie, mais seul le gardien
    // de la voie d'attaque impose une priorité sur cette voie.
    const ids = new Set();
    for (const voie of mobaVoiesCombat(duel.moba, attaquant.mobaLane)) {
      const options = rpgMobaCiblesIndividuelles(duel, cote, attaquantId, voie);
      for (const e of ennemis) if (options.cibles.includes(e.id) && estDefenseur(e) && mobaPartageVoie(duel.moba, e.mobaLane, voie)) ids.add(e.id);
    }
    prioritaires = choix.cibles.filter((id) => ids.has(id));
  } else {
    prioritaires = choix.cibles.filter((id) => ennemis.some((e) => e.id === id && estDefenseur(e)));
  }
  if (!prioritaires.length) return null;
  const prioritairesSet = new Set(prioritaires);
  return {
    prioritaires: prioritairesSet,
    protegees: new Set(sans.cibles.filter((id) => !autorisees.has(id))),
    directe: Boolean(choix.directe),
    uniquementDefenseurs: choix.cibles.every((id) => prioritairesSet.has(id)),
  };
}

/** Ancien combat collectif : seule l'Attaque ciblée choisit une créature. */
export function prioriteDefenseurCollective(attaquant, possibles = []) {
  if (!attaquant?.coupRapide || attaquant.infiltration) return null;
  const gardes = possibles.filter(estDefenseur);
  if (!gardes.length) return null;
  return {
    prioritaires: new Set(gardes.map((e) => e.id)),
    protegees: new Set(possibles.filter((e) => !estDefenseur(e)).map((e) => e.id)),
    directe: false, uniquementDefenseurs: true,
  };
}

export function textePrioriteDefenseur(priorite) {
  if (!priorite) return null;
  if (!priorite.uniquementDefenseurs) return priorite.directe
    ? '🛡 Défenseur prioritaire dans sa voie ; autres cibles et attaque directe possibles.'
    : '🛡 Défenseur prioritaire dans sa voie ; les autres cibles éclairées restent possibles.';
  if (priorite.directe) return '🛡 Pour viser une créature, choisissez un Défenseur. L’attaque directe reste possible.';
  return '🛡 Attaque : choisissez un Défenseur.';
}
