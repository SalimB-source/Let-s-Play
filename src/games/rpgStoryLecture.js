/** Lecteur du récit : préférences de confort et rythmes de lecture.
 *  Fonctions pures ou protégées (stockage peut refuser) : aucun effet sur le
 *  duel, aucun effet sur les transitions du récit (`rpgStoryFlow.js`). La
 *  machine à écrire et l'auto-lecture ne sont que de la présentation : elles
 *  ne créent, ne sautent et ne valident jamais une scène à la place du joueur.
 */

export const RPG_LECTURE_STORAGE_KEY = 'letsplay_sablier_lecture_v1';

export const PREFERENCES_LECTURE_DEFAUT = Object.freeze({
  machine: true, // texte révélé caractère par caractère
  auto: false, // avance seule entre les répliques d'une scène
});

/** Vitesse d'écriture : un caractère tous les 16 ms (≈ 60 caractères/seconde). */
export const MS_PAR_CARACTERE = 16;

/**
 * L'auto-lecture laisse respirer la réplique avant de tourner la page :
 * un socle court pour les répliques brèves, un plafond pour les longues.
 */
export function delaiAutoLecture(texte) {
  const caracteres = typeof texte === 'string' ? texte.length : 0;
  return Math.max(1500, Math.min(6000, 1200 + caracteres * 24));
}

/** Les préférences incomplètes ou corrompues reprennent les valeurs par défaut. */
export function preferencesLecture(value) {
  const defaut = PREFERENCES_LECTURE_DEFAUT;
  if (!value || typeof value !== 'object') return { ...defaut };
  return {
    machine: typeof value.machine === 'boolean' ? value.machine : defaut.machine,
    auto: typeof value.auto === 'boolean' ? value.auto : defaut.auto,
  };
}

export function chargerPreferencesLecture() {
  try {
    const brut = globalThis.localStorage?.getItem(RPG_LECTURE_STORAGE_KEY);
    return preferencesLecture(brut ? JSON.parse(brut) : null);
  } catch {
    return { ...PREFERENCES_LECTURE_DEFAUT };
  }
}

/** L'écriture peut échouer (quota, navigation privée) : la session continue. */
export function sauverPreferencesLecture(prefs) {
  try {
    globalThis.localStorage?.setItem(RPG_LECTURE_STORAGE_KEY, JSON.stringify(preferencesLecture(prefs)));
    return true;
  } catch {
    return false;
  }
}

/** `prefers-reduced-motion` : le texte s'affiche d'un bloc, sans machine à écrire. */
export function mouvementReduit() {
  try {
    return typeof globalThis.matchMedia === 'function'
      && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
