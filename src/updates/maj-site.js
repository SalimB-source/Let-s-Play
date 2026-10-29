/**
 * La mise à jour du site, vue du client — `src/updates/maj-site.js`
 * =================================================================
 * Le site n'a pas de service worker : un onglet resté ouvert, une WebView
 * Android ou un PC qui revient sur l'onglet gardent la page qu'ils ont chargée.
 * Quand une nouvelle version est publiée (Vercel, Pages), rien ne le leur dit.
 *
 * D'où ce petit protocole, sans dépendance :
 *
 *   1. `vite.config.js` écrit un `version.json` à la racine de la sortie —
 *      `{ buildId, builtAt }` — et grave le même `buildId` dans le bundle
 *      (`__BUILD_ID__`) ;
 *   2. au lancement, le jeu relit ce fichier **sans cache** et compare ;
 *   3. si les deux diffèrent, l'écran propose de recharger (voir
 *      `src/components/MiseAJourDisponible.jsx`).
 *
 * Le rechargement passe par une URL neuve (`?maj=<buildId>`) : c'est le seul
 * moyen fiable de faire relire `index.html` à une WebView qui a mis la page en
 * cache. Les fichiers JS/CSS, eux, portent déjà leur empreinte dans leur nom.
 *
 * Rien ici ne lève : une vérification ratée (hors ligne, 404, JSON cassé) est
 * simplement une vérification sans réponse — on rejouera plus tard.
 */

/** Identité du build chargé. `define` de Vite ; `dev` hors build. */
export const BUILD_ID = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

/** Première vérification : juste après le premier écran, pas pendant. */
export const DELAI_PREMIERE_VERIF_MS = 2500;

/** Une vérification toutes les quinze minutes, tant que l'onglet vit. */
export const INTERVALLE_VERIF_MS = 15 * 60 * 1000;

/** Délai au-delà duquel une vérification est abandonnée (réseau qui pend). */
export const DELAI_MAX_REPONSE_MS = 6000;

/** Le fichier d'identité, à la racine de la base du site (`/` ou `/Let-s-Play/`). */
export function urlVersion(baseUrl = '/') {
  return `${baseUrl}version.json`;
}

/** L'URL de rechargement : même page, un paramètre qui change à chaque build. */
export function urlRechargement(buildId, href) {
  try {
    const url = new URL(href);
    url.searchParams.set('maj', buildId || '1');
    return url.toString();
  } catch {
    return href;
  }
}

/** Vrai si le déploiement distant n'est pas celui qu'on a chargé. */
export function estNouvelleVersion(distant, locale = BUILD_ID) {
  const buildId = typeof distant?.buildId === 'string' ? distant.buildId.trim() : '';
  if (!buildId || !locale) return false;
  // En développement, l'identifiant change à chaque démarrage du serveur : se
  // comparer à soi-même n'aurait aucun sens et ferait clignoter la bannière.
  if (locale === 'dev' || locale.startsWith('local-')) return false;
  return buildId !== locale;
}

/**
 * Lit `version.json` sans cache. Renvoie `{ buildId, builtAt }` ou `null`.
 * `fetchImpl`, `horloge` et `AbortController` sont injectables pour les tests.
 */
export async function lireVersionDistante({
  baseUrl = '/',
  fetchImpl = globalThis.fetch,
  delaiMaxMs = DELAI_MAX_REPONSE_MS,
  maintenant = () => Date.now(),
  Controleur = globalThis.AbortController,
} = {}) {
  if (typeof fetchImpl !== 'function') return null;
  const url = `${urlVersion(baseUrl)}?v=${maintenant()}`;
  const controleur = typeof Controleur === 'function' ? new Controleur() : null;
  const minuterie = controleur && delaiMaxMs > 0 ? setTimeout(() => controleur.abort(), delaiMaxMs) : null;
  try {
    const reponse = await fetchImpl(url, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
      ...(controleur ? { signal: controleur.signal } : {}),
    });
    if (!reponse || reponse.ok === false) return null;
    const donnees = await reponse.json();
    const buildId = typeof donnees?.buildId === 'string' ? donnees.buildId.trim() : '';
    if (!buildId) return null;
    return { buildId, builtAt: typeof donnees?.builtAt === 'string' ? donnees.builtAt : '' };
  } catch {
    return null;
  } finally {
    if (minuterie) clearTimeout(minuterie);
  }
}

/**
 * Veille sur les versions : une vérification différée au lancement, puis une
 * toutes les `intervalleMs`, plus une à chaque retour sur l'onglet (le cas du
 * téléphone qu'on reprend après une nuit). `onNouvelleVersion` n'est appelé
 * qu'une fois par identifiant distant.
 *
 * Renvoie la fonction d'arrêt.
 */
export function demarrerVeilleMaj({
  baseUrl = '/',
  locale = BUILD_ID,
  fetchImpl = globalThis.fetch,
  onNouvelleVersion = () => {},
  delaiInitialMs = DELAI_PREMIERE_VERIF_MS,
  intervalleMs = INTERVALLE_VERIF_MS,
  documentRef = typeof document === 'undefined' ? null : document,
  minuterie = { setTimeout, clearTimeout, setInterval, clearInterval },
} = {}) {
  let arrete = false;
  let dejaSignale = '';
  let derniereVerif = 0;
  let minuteries = [];

  const verifier = async () => {
    if (arrete) return;
    derniereVerif = Date.now();
    const distante = await lireVersionDistante({ baseUrl, fetchImpl });
    if (arrete || !distante) return;
    if (dejaSignale === distante.buildId) return;
    if (!estNouvelleVersion(distante, locale)) return;
    dejaSignale = distante.buildId;
    onNouvelleVersion(distante);
  };

  // Un retour sur l'onglet relit la version — mais pas plus d'une fois par
  // minute : basculer dix fois entre deux fenêtres ne doit pas faire dix
  // requêtes.
  const auRetour = () => {
    if (typeof documentRef?.visibilityState === 'string' && documentRef.visibilityState !== 'visible') return;
    if (Date.now() - derniereVerif < 60 * 1000) return;
    verifier();
  };

  minuteries.push(minuterie.setTimeout(verifier, delaiInitialMs));
  if (intervalleMs > 0) minuteries.push(minuterie.setInterval(verifier, intervalleMs));
  documentRef?.addEventListener?.('visibilitychange', auRetour);

  return () => {
    arrete = true;
    for (const id of minuteries) {
      minuterie.clearTimeout?.(id);
      minuterie.clearInterval?.(id);
    }
    minuteries = [];
    documentRef?.removeEventListener?.('visibilitychange', auRetour);
  };
}

/** Recharge la page sur une URL neuve — celle qui contourne le cache. */
export function rechargerMaintenant(buildId, fenetre = typeof window === 'undefined' ? null : window) {
  if (!fenetre?.location) return false;
  const cible = urlRechargement(buildId, fenetre.location.href);
  fenetre.location.replace(cible);
  return true;
}
