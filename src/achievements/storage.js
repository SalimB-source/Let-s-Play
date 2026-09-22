/**
 * Persistance locale des succès — une clé par joueur.
 * ---------------------------------------------------
 * La progression d'un visiteur non connecté vit sur l'appareil (clé
 * « invité »), pour que le site statique fonctionne sans backend. Chaque
 * compte connecté possède SA propre clé locale : c'est le cache de la copie
 * serveur (`player_progress` dans Supabase, voir `remote.js`). Deux comptes
 * utilisés sur le même appareil ne partagent donc plus jamais leur
 * progression, et un compte tout neuf démarre au niveau 1 même si l'appareil
 * a déjà joué — c'est le serveur, pas l'appareil, qui fait foi pour un compte.
 *
 * L'ancienne clé unique (`letsplay_achievements_v1`, d'avant le découpage par
 * joueur) est reprise au premier chargement comme progression invité, puis
 * laissée en place : une version précédente du site, encore en cache, pourrait
 * continuer à y écrire sans rien casser.
 *
 * Aucun accès au stockage hors navigateur : les rendus SSR (scripts de
 * vérification) traversent ce module sans planter.
 */

export const STORAGE_KEY = 'letsplay_achievements_v1';

/** Scope de la progression « sans compte » : celle de l'appareil. */
export const GUEST_SCOPE = 'guest';

/** Clé de stockage local d'un scope : invité, ou cache d'un compte (`u:<id>`). */
export function storageKeyForScope(scope) {
  const id = scope && scope !== GUEST_SCOPE ? String(scope) : GUEST_SCOPE;
  return `${STORAGE_KEY}:${id}`;
}

/** Scope local d'un compte connecté (identifiant Supabase). */
export function scopeForUser(userId) {
  return userId ? `u:${userId}` : GUEST_SCOPE;
}

function storage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage || null;
  } catch (e) {
    return null; // navigation privée / stockage refusé
  }
}

/** Clés à lire pour un scope — l'invité relit aussi l'ancienne clé unique. */
function keysForScope(scope) {
  if (scope && scope !== GUEST_SCOPE) return [storageKeyForScope(scope)];
  return [storageKeyForScope(GUEST_SCOPE), STORAGE_KEY];
}

/** État enregistré pour ce scope, ou null si rien de lisible. */
export function readStorage(scope = GUEST_SCOPE) {
  const store = storage();
  if (!store) return null;
  for (const key of keysForScope(scope)) {
    try {
      const raw = store.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      /* clé illisible : on tente la suivante */
    }
  }
  return null;
}

/** Enregistre l'état d'un scope ; renvoie false si le stockage est indisponible. */
export function writeStorage(state, scope = GUEST_SCOPE) {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(storageKeyForScope(scope), JSON.stringify(state));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Efface la progression locale d'un scope (bouton de réinitialisation du
 * profil joueur). Pour l'invité, l'ancienne clé unique est effacée aussi :
 * sinon elle reviendrait au prochain chargement.
 */
export function clearStorage(scope = GUEST_SCOPE) {
  const store = storage();
  if (!store) return false;
  let cleared = true;
  for (const key of keysForScope(scope)) {
    try {
      store.removeItem(key);
    } catch (e) {
      cleared = false;
    }
  }
  return cleared;
}

/** Clé des métadonnées Supabase qui conservait la progression du compte (repli). */
export const REMOTE_META_KEY = 'achievements';
