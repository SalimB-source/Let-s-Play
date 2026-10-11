/**
 * Progression du mode Histoire (les Tours de Bab El).
 *
 * Continuité simple : la sauvegarde ne retient que les **étages déblayés**.
 * Un étage est débloqué s'il est le premier de sa tour, ou si l'étage
 * précédent de la même tour est déblayé. Chaque duel repart à zéro (deck
 * complet, PV pleins) — rien n'est reporté d'un étage à l'autre.
 *
 * Le stockage suit la convention du dépôt (`cityRushProgress.js`) : accès
 * `localStorage` tolérant (mode privé, iframe : `null`), écriture silencieuse,
 * lecture normalisée — une sauvegarde corrompue ou venue d'un autre catalogue
 * ne casse jamais le menu.
 */

import { etageHistoireParId, etagePrecedent, tourHistoireParId, tousLesEtages } from './rpgStoryTours.js';

export const RPG_STORY_STORAGE_KEY = 'letsplay_sablier_histoire_v1';

/** État vide : rien n'est encore déblayé. */
export function progressionHistoireVide() {
  return { etagesVaincus: [] };
}

/** Ne garde que des identifiants d'étages connus, sans doublon. */
export function normaliserProgressionHistoire(value) {
  const connus = new Set(tousLesEtages().map(({ etage }) => etage.id));
  const vus = new Set();
  const etagesVaincus = [];
  for (const etageId of (Array.isArray(value?.etagesVaincus) ? value.etagesVaincus : [])) {
    if (typeof etageId !== 'string' || !connus.has(etageId) || vus.has(etageId)) continue;
    vus.add(etageId);
    etagesVaincus.push(etageId);
  }
  return { etagesVaincus };
}

/** L'étage est-il déblayé ? */
export function etageEstVaincu(progression, etageId) {
  return (progression?.etagesVaincus ?? []).includes(etageId);
}

/**
 * L'étage est-il jouable ? Premier étage de sa tour : toujours. Sinon :
 * l'étage précédent de la même tour doit être déblayé.
 */
export function etageEstDebloque(progression, etageId) {
  if (!etageHistoireParId(etageId)) return false;
  const precedent = etagePrecedent(etageId);
  if (!precedent) return true;
  return etageEstVaincu(progression, precedent.id);
}

/** Nouvelle progression avec l'étage marqué déblayé (sans muter l'ancienne).
 *  Sans changement, la progression d'origine est rendue telle quelle. */
export function marquerEtageVaincu(progression, etageId) {
  const normalisee = normaliserProgressionHistoire(progression);
  if (!etageHistoireParId(etageId)) return normalisee;
  if (etageEstVaincu(normalisee, etageId)) {
    return normalisee.etagesVaincus.length === (progression?.etagesVaincus?.length ?? 0)
      ? progression
      : normalisee;
  }
  return { etagesVaincus: [...normalisee.etagesVaincus, etageId] };
}

/** Résumé d'une tour pour l'écran Histoire : { total, vaincus, prochainId }. */
export function resumeTourHistoire(tourId, progression) {
  const tour = tourHistoireParId(tourId);
  if (!tour) return { total: 0, vaincus: 0, prochainId: null };
  const vaincus = tour.etages.filter((etage) => etageEstVaincu(progression, etage.id)).length;
  const prochain = tour.etages.find((etage) => !etageEstVaincu(progression, etage.id) && etageEstDebloque(progression, etage.id));
  return { total: tour.etages.length, vaincus, prochainId: prochain?.id ?? null };
}

function browserStorage() {
  try {
    return globalThis.window?.localStorage || globalThis.localStorage || null;
  } catch {
    return null;
  }
}

/** Charge la progression de l'appareil ; état vide si absent ou illisible. */
export function chargerProgressionHistoire() {
  const stockage = browserStorage();
  if (!stockage) return progressionHistoireVide();
  try {
    return normaliserProgressionHistoire(JSON.parse(stockage.getItem(RPG_STORY_STORAGE_KEY) ?? 'null'));
  } catch {
    return progressionHistoireVide();
  }
}

/** Enregistre la progression de l'appareil (silencieux si le stockage manque). */
export function sauverProgressionHistoire(progression) {
  const stockage = browserStorage();
  if (!stockage) return false;
  try {
    stockage.setItem(RPG_STORY_STORAGE_KEY, JSON.stringify(normaliserProgressionHistoire(progression)));
    return true;
  } catch {
    return false;
  }
}

/** Efface la progression de l'appareil. */
export function reinitialiserProgressionHistoire() {
  const stockage = browserStorage();
  try {
    stockage?.removeItem(RPG_STORY_STORAGE_KEY);
  } catch {
    // rien à faire : le stockage n'est pas accessible
  }
  return progressionHistoireVide();
}
