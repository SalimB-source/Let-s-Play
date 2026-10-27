/**
 * Portée « par joueur » du stockage de progression.
 * ------------------------------------------------
 * Les jeux écrivent leur progression dans Supabase (une ligne privée par
 * compte, voir `supabase/schema.sql`) **et** gardent une copie de travail sur
 * l'appareil pour pouvoir jouer hors ligne. Cette copie ne doit jamais être
 * celle de l'appareil : sur un PC partagé (ou la coque PC installée, qui a sa
 * propre origine `127.0.0.1`), deux joueurs qui se connectent tour à tour
 * écraseraient — ou pire, hériteraient — la progression l'un de l'autre.
 *
 * Ce module donne donc à chaque clé de progression un suffixe de compte,
 * exactement comme `mirageProgression.progressionStorageKey` et
 * `cityRushProgress.cityRushStorageKey` :
 *
 *   - visiteur (aucun compte) : `letsplay_sablier_bourse_v1` ;
 *   - compte `a1b2…` : `letsplay_sablier_bourse_v1:user:a1b2…`.
 *
 * Le propriétaire est posé par `AuthProvider` (`definirProprietaireProgression`)
 * avant le rendu des pages de jeu, donc avant toute lecture de progression.
 * Les profils de démonstration ne sont **pas** des comptes : ils restent sur
 * les clés invité, et ne parlent jamais à Supabase.
 *
 * Reprise unique : quand un visiteur se connecte pour la première fois, sa
 * copie invité est adoptée par le compte (puis effacée), pour qu'il ne perde
 * pas la partie commencée hors ligne. Ensuite, plus aucun compte ne peut lire
 * la progression d'un autre sur le même appareil.
 */

/** Propriétaire courant (identifiant de compte Supabase), ou `null` (invité). */
let proprietaire = null;

/**
 * La session est-elle **résolue** ? `false` tant que `AuthProvider` attend la
 * réponse de Supabase.
 *
 * Pourquoi cet état existe : au démarrage, les pages se rendent avant que
 * `getSession()` n'ait répondu, donc avec `proprietaire === null`. Un joueur
 * **déjà connecté** écrit alors sous les clés invité pendant quelques dizaines
 * de millisecondes ; à la résolution suivante, son compte « reprenait » cette
 * copie comme s'il venait de jouer en visiteur. C'est ainsi qu'un compte neuf
 * héritait d'un coffret de bienvenue déjà ouvert sur l'appareil.
 *
 * Tant que la session n'est pas résolue, une écriture visiteur est donc
 * **marquée** (`…:invite-en-attente`) : elle ne sera jamais reprise par un
 * compte. La marque disparaît dès qu'un vrai visiteur écrit sur la clé nue.
 */
let sessionPrete = true;

/** Identifiant de compte normalisé (`null` si vide ou non textuel). */
export function normaliserProprietaire(id) {
  const valeur = typeof id === 'string' ? id.trim() : '';
  return valeur || null;
}

/**
 * Déclare le compte dont les pages de jeu doivent lire la progression.
 * Rend `true` si le propriétaire a changé (les appelants peuvent alors
 * recharger leur état en mémoire).
 */
export function definirProprietaireProgression(id) {
  const suivant = normaliserProprietaire(id);
  const change = suivant !== proprietaire;
  proprietaire = suivant;
  return change;
}

/** Compte courant, ou `null` pour un visiteur / une session de démonstration. */
export function proprietaireProgression() {
  return proprietaire;
}

/**
 * Déclare la session **résolue** (ou non). Posé par `AuthProvider` avec
 * `!loading`. Rend `true` si l'état a changé. Un état jamais annoncé est
 * réputé résolu : les appelants qui ne disent rien (tests, scripts, pages hors
 * compte) gardent le comportement d'avant.
 */
export function definirSessionPrete(pret) {
  const suivant = pret !== false;
  const change = suivant !== sessionPrete;
  sessionPrete = suivant;
  return change;
}

/** La session est-elle résolue ? */
export function sessionProgressionPrete() {
  return sessionPrete;
}

/**
 * La marque d'une copie invité écrite **avant** que la session soit résolue.
 * Elle n'est pas une donnée de jeu : un booléen suffit, et son absence est le
 * cas normal.
 */
function cleInviteEnAttente(base) {
  return `${base}:invite-en-attente`;
}

/** Clé de progression du joueur `id` (compte courant par défaut). */
export function cleProgression(base, id = proprietaire) {
  const propre = normaliserProprietaire(id);
  return propre ? `${base}:user:${propre}` : base;
}

/** `localStorage` s'il est utilisable (navigation privée, iframe : `null`). */
export function stockageProgression() {
  try {
    return globalThis.window?.localStorage || globalThis.localStorage || null;
  } catch {
    return null;
  }
}

/**
 * Lit la valeur de progression du joueur courant.
 *
 * Ordre : clé du compte, puis — une seule fois — la copie invité de
 * l'appareil, adoptée par le compte puis effacée. Rend `null` si rien n'est
 * stocké (ou si le stockage est indisponible).
 */
export function lireProgression(base, storage, { reprise = true } = {}) {
  const store = storage === undefined ? stockageProgression() : storage;
  if (!store) return null;
  try {
    const cle = cleProgression(base);
    const valeur = store.getItem(cle);
    if (valeur !== null && valeur !== undefined) return valeur;
    // Rien à reprendre pour un visiteur, pour une clé qui refuse la reprise
    // (le coffret de bienvenue), ou tant que la session n'est pas résolue.
    if (cle === base || !reprise || !sessionPrete) return null;
    const invite = store.getItem(base);
    if (invite === null || invite === undefined) return null;
    // Copie écrite pendant l'attente de la session : elle appartient peut-être
    // au compte connecté, pas à un visiteur. On ne l'hérite jamais.
    if (store.getItem(cleInviteEnAttente(base))) return null;
    // Reprise unique : la partie commencée hors ligne rejoint le compte, et la
    // clé invité disparaît pour qu'aucun autre compte ne l'hérite ensuite.
    try {
      store.setItem(cle, invite);
      store.removeItem(base);
    } catch {
      // Écriture refusée : la lecture reste servie par la copie invité.
    }
    return invite;
  } catch {
    return null;
  }
}

/** Écrit la valeur de progression du joueur courant (`false` si refusé). */
export function ecrireProgression(base, valeur, storage) {
  const store = storage === undefined ? stockageProgression() : storage;
  if (!store) return false;
  try {
    const cle = cleProgression(base);
    store.setItem(cle, valeur);
    if (cle === base) {
      // Copie visiteur : elle n'est reprenable que si elle a été écrite par une
      // session résolue (un vrai visiteur), jamais pendant l'attente.
      if (sessionPrete) store.removeItem(cleInviteEnAttente(base));
      else store.setItem(cleInviteEnAttente(base), '1');
    }
    return true;
  } catch {
    return false;
  }
}

/** Efface la valeur de progression du joueur courant (`false` si refusé). */
export function effacerProgression(base, storage) {
  const store = storage === undefined ? stockageProgression() : storage;
  if (!store) return false;
  try {
    store.removeItem(cleProgression(base));
    store.removeItem(cleInviteEnAttente(base));
    return true;
  } catch {
    return false;
  }
}
