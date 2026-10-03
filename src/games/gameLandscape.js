/**
 * `gameLandscape` — le mode paysage des jeux d'arcade, sur téléphone et dans
 * l'application Android (sans React).
 *
 * Pourquoi ce fichier existe : **La Cendre** se joue comme une manette — le
 * pouce gauche sur un stick, le droit sur les boutons. Une manette ne tient
 * pas dans une main verticale : le jeu demande donc l'écran couché dès qu'il
 * s'ouvre sur un téléphone (voir `useGameLandscape.js` pour le cycle de vie
 * React et `SoulsPage.jsx` pour le geste).
 *
 * Deux chemins, toujours essayés ensemble :
 *
 *   - **navigateur** — la Screen Orientation API
 *     (`screen.orientation.lock('landscape')`, préfixes WebKit/ms et
 *     `screen.lockOrientation` compris). Chrome Android ne l'honore **qu'en
 *     plein écran** : la demande part au premier geste (celui qui ouvre le
 *     plein écran natif du jeu) puis est rejouée à chaque entrée en plein
 *     écran. Firefox Android refuse toujours, et iOS ne connaît pas l'API :
 *     l'écran « tournez votre appareil » prend alors le relais ;
 *   - **application Android** — le pont `LetsPlayAndroid`
 *     (`setGameOrientation('landscape')`), qui couche l'activité elle-même
 *     (voir `MainActivity.java`). La WebView n'a pas toujours la Screen
 *     Orientation API, et l'activité est la seule à pouvoir tourner l'écran
 *     de force. Le manifeste n'est **pas** verrouillé : le reste du site
 *     (actus, vidéos, messagerie) doit rester dans l'orientation du téléphone.
 *
 * Toutes les fonctions sont sans effet hors navigateur (rendu serveur, tests
 * purs) et ne lèvent jamais : un navigateur qui refuse la demande est un cas
 * normal — c'est même le cas le plus fréquent (iPhone) —, pas une erreur.
 */
import { isPhoneDevice, runningInAndroidApp } from './mirageLanes.js';

/** Valeurs échangées avec le pont Android (`LetsPlayAndroid.setGameOrientation`). */
export const ANDROID_LANDSCAPE = 'landscape';
export const ANDROID_AUTO = 'auto';

/** Fenêtre courante, ou `null` hors navigateur (tests purs, rendu serveur). */
function currentWindow() {
  return typeof window === 'undefined' ? null : window;
}

/**
 * Vrai quand l'écran est **couché** (plus large que haut).
 *
 * On lit la fenêtre d'abord (`innerWidth` / `innerHeight` : c'est elle qui dit
 * l'orientation réelle de la page, plein écran compris), puis l'écran
 * (`screen.width` / `height`, que l'orientation ne change pas) comme repli.
 * Un écran carré ou muet n'est pas « en portrait » : on répond `true` pour ne
 * surtout pas afficher « tournez votre appareil » à quelqu'un qui ne peut rien
 * tourner.
 */
export function isLandscape(win = currentWindow()) {
  if (!win) return true;
  const width = Number(win.innerWidth);
  const height = Number(win.innerHeight);
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 && width !== height) {
    return width > height;
  }
  const screenWidth = Number(win.screen?.width);
  const screenHeight = Number(win.screen?.height);
  if (Number.isFinite(screenWidth) && Number.isFinite(screenHeight) && screenWidth > 0 && screenHeight > 0 && screenWidth !== screenHeight) {
    return screenWidth > screenHeight;
  }
  return true;
}

/** Vrai quand l'écran est **debout** (plus haut que large). */
export function isPortrait(win = currentWindow()) {
  return !isLandscape(win);
}

/**
 * Vrai sur un appareil qui doit jouer **couché** : un téléphone (petit côté
 * d'écran ≤ 600 px, quelle que soit l'orientation — voir `mirageLanes`) ou
 * l'application Android, dont la WebView n'est pas toujours reconnue comme
 * téléphone. Une tablette et un ordinateur gardent leur orientation.
 */
export function needsLandscape() {
  return runningInAndroidApp() || isPhoneDevice();
}

/**
 * Faut-il afficher « tournez votre appareil » ? La règle, pure : un appareil
 * qui doit jouer couché, tenu debout, et un joueur qui n'a pas déjà répondu
 * « jouer quand même ».
 */
export function rotationPromptVisible({ landscapeDevice, portrait, dismissed } = {}) {
  return Boolean(landscapeDevice && portrait && !dismissed);
}

/**
 * Demande le verrouillage de l'écran en paysage. Appelée **de façon synchrone
 * dans un geste** (le plein écran du navigateur l'exige) : la demande part
 * tout de suite, et la promesse est rendue pour qui veut l'attendre.
 *
 * Résout `true` si la demande est partie (même si le navigateur la refusera
 * plus tard : Chrome Android juge l'état plein écran à l'instant de l'appel),
 * `false` si aucune API n'est disponible ou si toutes refusent.
 */
export async function lockLandscape(win = currentWindow()) {
  const screen = win?.screen;
  const orientation = screen?.orientation;
  const attempts = [
    typeof orientation?.lock === 'function' ? () => orientation.lock('landscape') : null,
    typeof screen?.lockOrientation === 'function' ? () => screen.lockOrientation('landscape') : null,
    typeof screen?.mozLockOrientation === 'function' ? () => screen.mozLockOrientation('landscape') : null,
    typeof screen?.msLockOrientation === 'function' ? () => screen.msLockOrientation('landscape') : null,
  ].filter(Boolean);

  for (const attempt of attempts) {
    try {
      const result = attempt();
      if (result && typeof result.then === 'function') await result;
      else if (result === false) continue; // API historique : refus synchrone
      return true;
    } catch {
      // Cette API a refusé (hors plein écran, par exemple) : on essaie la suivante.
    }
  }
  return false;
}

/** Rend l'orientation au téléphone (sortie du jeu, page quittée). */
export function unlockLandscape(win = currentWindow()) {
  const screen = win?.screen;
  try { screen?.orientation?.unlock?.(); } catch { /* API absente ou refusée */ }
  try { screen?.unlockOrientation?.(); } catch { /* API historique absente */ }
}

/** Vrai si ce navigateur sait verrouiller l'orientation (l'API existe). */
export function supportsLandscapeLock(win = currentWindow()) {
  const screen = win?.screen;
  return typeof screen?.orientation?.lock === 'function'
    || typeof screen?.lockOrientation === 'function'
    || typeof screen?.mozLockOrientation === 'function'
    || typeof screen?.msLockOrientation === 'function';
}

/**
 * Parle à l'application Android : `'landscape'` couche l'activité, `'auto'`
 * lui rend l'orientation du téléphone. Une APK d'avant ce pont n'expose pas
 * `setGameOrientation` : on ne fait rien (le verrou navigateur reste tenté) et
 * on répond `false`. Ne lève jamais.
 */
export function setAndroidGameOrientation(mode, win = currentWindow()) {
  const bridge = win?.LetsPlayAndroid;
  if (!bridge || typeof bridge.setGameOrientation !== 'function') return false;
  try {
    bridge.setGameOrientation(mode === ANDROID_LANDSCAPE ? ANDROID_LANDSCAPE : ANDROID_AUTO);
    return true;
  } catch {
    return false;
  }
}

/**
 * Le geste complet : l'activité Android d'abord (elle tourne tout de suite,
 * même sans plein écran), puis la Screen Orientation API du navigateur. Appelé
 * dans le geste du joueur — lancement de partie, premier clic sur la page,
 * entrée en plein écran.
 */
export function requestGameLandscape(win = currentWindow()) {
  setAndroidGameOrientation(ANDROID_LANDSCAPE, win);
  return lockLandscape(win);
}

/** Le geste inverse : orientation rendue au téléphone. */
export function releaseGameLandscape(win = currentWindow()) {
  unlockLandscape(win);
  setAndroidGameOrientation(ANDROID_AUTO, win);
}
