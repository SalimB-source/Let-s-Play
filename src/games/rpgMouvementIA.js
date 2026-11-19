/**
 * Le Sablier — l'**avancée de l'IA**.
 *
 * Le sorcier joue avec les mêmes règles que le joueur : une case par tour, puis
 * la frappe (`rpgMouvement.js`). Une IA qui ne bougerait pas se figerait
 * pendant que le joueur avance ; elle cherche donc, pour chaque créature qui
 * n'a **rien à frapper**, la case qui la rapproche de sa proie.
 *
 * ## La règle, en trois lignes
 *
 * 1. **Une créature qui peut frapper ne bouge pas** : elle garde sa case et
 *    attaque de là. Bouger pour bouger ne fait que s'exposer.
 * 2. Sinon, parmi les cases légales, on retient celle qui **réduit la distance
 *    à la proie la plus proche** — une créature adverse d'abord, le sorcier
 *    adverse ensuite.
 * 3. À distance égale, on ne bouge pas : rester immobile est un choix sûr.
 *
 * Aucun hasard, aucune simulation : l'IA lit la même géométrie que le joueur
 * (`rpgChamp.js`) et les mêmes cibles (`rpgCiblesIndividuellesClassique`).
 */

import { campAdverse, distanceAuSorcierAdverse, distanceEntreCreatures } from './rpgChamp.js';
import { rpgCiblesIndividuellesClassique } from './rpgCombatIndividuelClassique.js';
import { deplacementsLegaux, rpgDeplacerCreature, rpgPeutBouger } from './rpgMouvement.js';
import { duelCardById } from './rpgCards.js';

const creature = (entite) => Boolean(entite && duelCardById(entite.carteId)
  && duelCardById(entite.carteId).kind !== 'site');

/** La distance de cette case à la proie la plus proche (créature, sinon sorcier). */
function distanceALaProie(duel, cote, entite, destination) {
  const adversaire = campAdverse(cote);
  const proies = (duel?.[adversaire]?.creatures ?? []).filter(creature);
  const sonde = { emplacement: destination.index, campPose: destination.camp };
  if (!proies.length) {
    return 1 + distanceAuSorcierAdverse(sonde, cote);
  }
  let meilleure = Number.POSITIVE_INFINITY;
  for (const proie of proies) {
    const distance = distanceEntreCreatures(sonde, cote, proie, adversaire);
    if (distance !== null && distance < meilleure) meilleure = distance;
  }
  return meilleure;
}

/**
 * La case que l'IA choisit pour cette créature, ou `null` si elle reste où
 * elle est. Une créature qui a une proie à portée ne bouge pas.
 */
export function destinationIA(duel, cote, entite) {
  if (!creature(entite) || !rpgPeutBouger(duel, cote, entite)) return null;
  const choix = rpgCiblesIndividuellesClassique(duel, cote, entite.id);
  if (choix.cibles.length) return null; // elle frappe d'où elle est
  const cases = deplacementsLegaux(duel, cote, entite.id);
  if (!cases.length) return null;
  const surPlace = { camp: entite.campPose ?? cote, index: entite.emplacement };
  let meilleure = distanceALaProie(duel, cote, entite, surPlace);
  let retenue = null;
  for (const destination of cases) {
    const distance = distanceALaProie(duel, cote, entite, destination);
    // Strictement plus près : à égalité, rester immobile est plus sûr.
    if (distance < meilleure) {
      meilleure = distance;
      retenue = destination;
    }
  }
  return retenue;
}

/** Fait avancer toutes les créatures de ce camp qui y gagnent quelque chose. */
export function rpgIABougerCreatures(duel, cote) {
  const bouges = [];
  for (const entite of [...(duel?.[cote]?.creatures ?? [])]) {
    const destination = destinationIA(duel, cote, entite);
    if (!destination) continue;
    const resultat = rpgDeplacerCreature(duel, cote, entite.id, destination);
    if (resultat.ok) bouges.push({ entiteId: entite.id, destination: resultat.destination });
  }
  if (bouges.length) {
    duel.log.push(`Le sorcier avance ${bouges.length > 1 ? `${bouges.length} créatures` : 'une créature'}.`);
  }
  return bouges;
}
