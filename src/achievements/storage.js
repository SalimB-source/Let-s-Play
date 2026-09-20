/**
 * Persistance locale des succès.
 * ------------------------------
 * La progression vit d'abord sur l'appareil (`localStorage`), pour que le
 * site statique fonctionne sans backend : un visiteur non connecté débloque
 * déjà des succès. Quand un compte est connecté, `AchievementContext`
 * fusionne cet état avec la copie conservée dans les métadonnées Supabase de
 * l'utilisateur — rien n'est jamais écrasé (voir `mergeStates`).
 *
 * Aucun accès au stockage hors navigateur : les rendus SSR (scripts de
 * vérification) traversent ce module sans planter.
 */

export const STORAGE_KEY = 'letsplay_achievements_v1';

function storage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage || null;
  } catch (e) {
    return null; // navigation privée / stockage refusé
  }
}

/** État enregistré sur cet appareil, ou null si rien de lisible. */
export function readStorage() {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/** Enregistre l'état ; renvoie false si le stockage est indisponible. */
export function writeStorage(state) {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    return false;
  }
}

/** Efface la progression locale (bouton « réinitialiser » de /achievements). */
export function clearStorage() {
  const store = storage();
  if (!store) return false;
  try {
    store.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

/** Clé des métadonnées Supabase qui conserve la progression du compte. */
export const REMOTE_META_KEY = 'achievements';
