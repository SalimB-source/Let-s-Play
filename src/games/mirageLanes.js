/**
 * `mirageLanes` — quelle piste pour quel appareil.
 *
 * On joue au doigt sur **trois** voies, à la souris ou au doigt sur un grand
 * écran sur **quatre**. Sur un téléphone tenu à deux mains, quatre couloirs de
 * 2,1 m sont trop fins à viser, et la croix directionnelle obligeait à
 * traverser trois cases d'un coup pour changer de côté. Ordinateur et tablette
 * gardent leurs quatre voies — y compris dans un même salon en ligne, où la
 * piste de chacun est bornée à l'affichage (voir `lanePosition()` dans
 * `mirageRules.js`).
 *
 * Deux signaux décident de la piste compacte, et ils se complètent :
 *
 *   - **l'appareil** (`isPhoneDevice()`) : un écran tactile dont le petit côté
 *     mesure 600 px ou moins, quelle que soit l'orientation. C'est lui qui
 *     couvre le téléphone dans son navigateur (Chrome Android, Safari iOS…) ;
 *   - **la WebView Android** (`isAndroidWebView()`) : l'agent d'une WebView
 *     Android porte le marqueur `; wv)`. Il couvre l'application même quand
 *     l'APK est antérieure au pont JavaScript — et même sur tablette, où
 *     l'écran est trop large pour le premier signal.
 *
 * Le pont JavaScript reste reconnu à part (`runningInAndroidApp()`) : la
 * WebView de l'APK expose `window.LetsPlayAndroid` avant tout script de la page
 * (voir `android/app/src/main/java/dz/letsplay/officiel/MainActivity.java`, où
 * le même marqueur sert déjà au plein écran de Mirage Rush et au haut-parleur
 * des appels). Un navigateur classique ne l'a jamais.
 *
 * `applyLaneCountForDevice()` se lance une seule fois au démarrage
 * (`src/main.jsx`), avant le premier rendu : les modules qui dépendent des
 * voies (courses, rivaux, décor) lisent `LANES` / `laneCount()` au moment de
 * construire la partie, jamais au chargement.
 */
import { LANE_COUNTS, laneCount, setLaneCount } from './mirageRules.js';

/** Piste du téléphone (navigateur comme application) : trois voies. */
export const PHONE_LANE_COUNT = 3;
/** Piste de l'ordinateur et de la tablette : quatre voies. */
export const DESKTOP_LANE_COUNT = 4;

/** Petit côté d'écran (px) au-dessous duquel l'appareil est un téléphone. */
export const PHONE_SCREEN_MAX_PX = 600;
/** Repli quand `screen` ne répond pas : fenêtre de mise en page étroite. */
export const PHONE_WINDOW_MAX_PX = 800;

/** Appareil tactile au pointeur grossier (doigt, pas de souris ni de stylet). */
const COARSE_POINTER_MEDIA = '(hover:none) and (pointer:coarse)';
/** Fenêtre de mise en page étroite, pour les écrans muets. */
const NARROW_WINDOW_MEDIA = `${COARSE_POINTER_MEDIA} and (max-width:${PHONE_WINDOW_MAX_PX}px)`;

/** Réponse d'une requête média, sans jamais lever (navigateur ancien, SSR). */
function matches(query) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return Boolean(window.matchMedia(query)?.matches);
  } catch {
    return false;
  }
}

/**
 * Vrai dans l'APK (WebView avec le pont `LetsPlayAndroid`).
 *
 * En développement seulement (`npm run dev`), `?android=1` dans l'URL fait
 * comme si la page tournait dans l'app : on vérifie le chemin « application »
 * dans un navigateur, sans reconstruire l'APK. Le drapeau disparaît des builds
 * de production (`import.meta.env.DEV` y est faux), où seul le pont compte.
 *
 * Le choix des voies ne passe plus par cette fonction : une WebView Android se
 * reconnaît déjà à son agent (`isAndroidWebView()`), APK récente ou non.
 */
export function runningInAndroidApp() {
  if (typeof window === 'undefined') return false;
  if (window.LetsPlayAndroid) return true;
  if (!import.meta.env?.DEV) return false;
  try {
    return new URLSearchParams(window.location?.search || '').get('android') === '1';
  } catch {
    return false;
  }
}

/**
 * Vrai dans une WebView Android : l'agent contient `Android` **et** le
 * marqueur `; wv)` que Chrome y insère, par exemple
 * `Mozilla/5.0 (Linux; Android 13; Pixel 6 Build/…; wv) AppleWebKit/537.36 …`.
 *
 * C'est le signal de l'application quand l'APK n'expose pas encore le pont
 * `LetsPlayAndroid` : la piste passe à trois voies quel que soit l'écran,
 * tablette comprise. Un navigateur Android (Chrome, Samsung Internet, Firefox)
 * ne porte pas ce marqueur : il est traité comme n'importe quel appareil.
 */
export function isAndroidWebView() {
  if (typeof window === 'undefined') return false;
  const agent = window.navigator?.userAgent || '';
  return agent.includes('Android') && agent.includes('; wv)');
}

/**
 * Vrai sur un téléphone : appareil tactile (pointeur grossier ou
 * `navigator.maxTouchPoints > 0`) dont le **petit côté** d'écran mesure
 * `PHONE_SCREEN_MAX_PX` px ou moins — `min(screen.width, screen.height)`, donc
 * indépendant de l'orientation. Un ordinateur tactile 1920×1080 et une
 * tablette 820×1180 restent à quatre voies.
 *
 * Quand `screen` ne répond pas (WebView qui ne le remplit pas, vieux
 * navigateur), on retombe sur la fenêtre de mise en page : pointeur grossier
 * et `max-width:800px`.
 */
export function isPhoneDevice() {
  if (typeof window === 'undefined') return false;
  const points = Number(window.navigator?.maxTouchPoints);
  const touch = matches(COARSE_POINTER_MEDIA) || (Number.isFinite(points) && points > 0);
  if (!touch) return false;
  const width = Number(window.screen?.width);
  const height = Number(window.screen?.height);
  const shortSide = Math.min(width, height);
  if (Number.isFinite(shortSide) && shortSide > 0) return shortSide <= PHONE_SCREEN_MAX_PX;
  return matches(NARROW_WINDOW_MEDIA);
}

/** Vrai si cet appareil joue sur la piste compacte (trois voies). */
export function usesCompactTrack() {
  return isPhoneDevice() || isAndroidWebView();
}

/** Nombre de voies à utiliser sur cet appareil. */
export function laneCountForDevice() {
  return usesCompactTrack() && LANE_COUNTS.includes(PHONE_LANE_COUNT)
    ? PHONE_LANE_COUNT
    : DESKTOP_LANE_COUNT;
}

/** Fixe la piste de l'appareil et renvoie la voie retenue (3 ou 4). */
export function applyLaneCountForDevice() {
  return setLaneCount(laneCountForDevice());
}

/** Vrai si la piste courante est la piste compacte. */
export function isCompactTrack() {
  return laneCount() === PHONE_LANE_COUNT;
}
