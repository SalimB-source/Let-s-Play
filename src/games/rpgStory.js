/**
 * Progression du mode Histoire (les Tours de Bab El).
 *
 * Les victoires et le récit sont sauvegardés ensemble (v2, migration v1).
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

import { normaliserRecitHistoire } from './rpgStoryFlow.js';

export const RPG_STORY_LEGACY_STORAGE_KEY = 'letsplay_sablier_histoire_v1';
export const RPG_STORY_STORAGE_KEY = 'letsplay_sablier_histoire_v2';

const ecouteursProgression = new Set();

/** Abonne un écouteur aux écritures locales de progression Histoire. */
export function abonnerProgressionHistoire(ecouteur) {
  if (typeof ecouteur !== 'function') return () => {};
  ecouteursProgression.add(ecouteur);
  return () => {
    ecouteursProgression.delete(ecouteur);
  };
}

function notifierProgressionHistoire(progression) {
  for (const ecouteur of ecouteursProgression) {
    try {
      ecouteur(progression);
    } catch {
      // Un écouteur défaillant ne doit jamais bloquer la sauvegarde.
    }
  }
}

/** État vide : rien n'est encore déblayé. */
export function progressionHistoireVide() {
  return { version: 2, etagesVaincus: [], recit: null };
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
  return { version: 2, etagesVaincus, recit: normaliserRecitHistoire(value?.recit, etagesVaincus) };
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
    return JSON.stringify(normalisee) === JSON.stringify(progression) ? progression : normalisee;
  }
  return { ...normalisee, etagesVaincus: [...normalisee.etagesVaincus, etageId] };
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

/** Charge la v2, puis la v1 si nécessaire. L'original v1 reste un secours.
 *  Aucun choix n'est déduit des victoires et aucun plateau de duel n'est stocké. */
export function chargerProgressionHistoire() {
  const stockage = browserStorage();
  if (!stockage) return progressionHistoireVide();
  for (const cle of [RPG_STORY_STORAGE_KEY, RPG_STORY_LEGACY_STORAGE_KEY]) {
    try {
      const value = JSON.parse(stockage.getItem(cle) ?? 'null');
      if (!value || typeof value !== 'object' || !Array.isArray(value.etagesVaincus)) continue;
      if (cle === RPG_STORY_STORAGE_KEY && value.version !== 2) continue;
      return normaliserProgressionHistoire(cle === RPG_STORY_LEGACY_STORAGE_KEY
        ? { etagesVaincus: value.etagesVaincus } : value);
    } catch {
      // JSON corrompu ou stockage refusé : essayer la copie précédente.
    }
  }
  return progressionHistoireVide();
}

function rangCurseurRecit(recit) {
  if (!recit?.curseur) return { vues: -1, sousEtape: 0, replique: 0, resume: 0, choix: 0 };
  const vues = Array.isArray(recit.scenesVues) ? recit.scenesVues.length : 0;
  const { curseur } = recit;
  const sousEtape = curseur.type === 'scene' ? 2 : curseur.type === 'duel' ? 1 : 0;
  const replique = curseur.type === 'scene' ? (curseur.replique ?? 0) : 0;
  const resume = curseur.type === 'scene' && curseur.resume ? 1 : 0;
  const choix = recit.choix && typeof recit.choix === 'object' ? Object.keys(recit.choix).length : 0;
  return { vues, sousEtape, replique, resume, choix };
}

function comparerRecitsHistoire(recitA, recitB) {
  const a = rangCurseurRecit(recitA);
  const b = rangCurseurRecit(recitB);
  if (a.vues !== b.vues) return a.vues - b.vues;
  if (a.sousEtape !== b.sousEtape) return a.sousEtape - b.sousEtape;
  if (a.replique !== b.replique) return a.replique - b.replique;
  if (a.resume !== b.resume) return a.resume - b.resume;
  return a.choix - b.choix;
}

/**
 * Fusion monotone de la progression Histoire locale et distante :
 * - union des `etagesVaincus` ;
 * - conservation du récit le plus avancé, avec union des `scenesVues` et des `choix`.
 */
export function fusionnerProgressionHistoire(local, distant) {
  const localNorm = normaliserProgressionHistoire(local);
  const distantNorm = normaliserProgressionHistoire(distant);
  const etagesVaincus = [...new Set([...distantNorm.etagesVaincus, ...localNorm.etagesVaincus])];

  let recit = null;
  if (localNorm.recit && !distantNorm.recit) {
    recit = normaliserRecitHistoire(localNorm.recit, etagesVaincus);
  } else if (!localNorm.recit && distantNorm.recit) {
    recit = normaliserRecitHistoire(distantNorm.recit, etagesVaincus);
  } else if (localNorm.recit && distantNorm.recit) {
    const localPlusAvance = comparerRecitsHistoire(localNorm.recit, distantNorm.recit) >= 0;
    const principal = localPlusAvance ? localNorm.recit : distantNorm.recit;
    const secondaire = localPlusAvance ? distantNorm.recit : localNorm.recit;
    recit = normaliserRecitHistoire({
      campagneId: principal.campagneId,
      curseur: principal.curseur,
      scenesVues: [...new Set([...(secondaire.scenesVues ?? []), ...(principal.scenesVues ?? [])])],
      choix: { ...(secondaire.choix ?? {}), ...(principal.choix ?? {}) },
    }, etagesVaincus);
  }

  const progression = normaliserProgressionHistoire({ version: 2, etagesVaincus, recit });
  const modifie = JSON.stringify(progression) !== JSON.stringify(distantNorm);
  return { progression, modifie };
}

/** Enregistre la progression de l'appareil (silencieux si le stockage manque). */
export function sauverProgressionHistoire(progression) {
  const normalisee = normaliserProgressionHistoire(progression);
  const stockage = browserStorage();
  if (!stockage) {
    notifierProgressionHistoire(normalisee);
    return false;
  }
  try {
    stockage.setItem(RPG_STORY_STORAGE_KEY, JSON.stringify(normalisee));
    notifierProgressionHistoire(normalisee);
    return true;
  } catch {
    notifierProgressionHistoire(normalisee);
    return false;
  }
}

/** Efface la progression de l'appareil. */
export function reinitialiserProgressionHistoire() {
  const vide = progressionHistoireVide();
  const stockage = browserStorage();
  for (const cle of [RPG_STORY_STORAGE_KEY, RPG_STORY_LEGACY_STORAGE_KEY]) {
    try { stockage?.removeItem(cle); } catch { /* stockage indisponible */ }
  }
  notifierProgressionHistoire(vide);
  return vide;
}
