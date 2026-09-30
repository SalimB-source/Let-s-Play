/**
 * `mirageLanes` — quelle piste pour quel appareil.
 *
 * Le site joue sur **quatre** voies ; l'application Android n'en affiche que
 * **trois**. Sur un écran de téléphone tenu à deux mains, quatre couloirs de
 * 2,1 m sont trop fins à viser, et la croix directionnelle obligeait à
 * traverser trois cases d'un coup pour changer de côté. La version web garde
 * ses quatre voies : rien ne change pour les joueurs du site, y compris dans
 * un même salon en ligne (les voies sont bornées à l'affichage, voir
 * `lanePosition()` dans `mirageRules.js`).
 *
 * L'app est reconnue à son pont JavaScript : la WebView de l'APK expose
 * `window.LetsPlayAndroid` avant tout script de la page (voir
 * `android/app/src/main/java/dz/letsplay/officiel/MainActivity.java`, où le
 * même marqueur sert déjà au plein écran de Mirage Rush et au haut-parleur des
 * appels). Un navigateur classique ne l'a jamais.
 *
 * `applyLaneCountForDevice()` se lance une seule fois au démarrage
 * (`src/main.jsx`), avant le premier rendu : les modules qui dépendent des
 * voies (courses, rivaux, décor) lisent `LANES` / `laneCount()` au moment de
 * construire la partie, jamais au chargement.
 */
import { LANE_COUNTS, laneCount, setLaneCount } from './mirageRules.js';

/** Piste du site : quatre voies. */
export const WEB_LANE_COUNT = 4;
/** Piste de l'application Android : trois voies. */
export const APP_LANE_COUNT = 3;

/**
 * Vrai dans l'APK (WebView avec le pont `LetsPlayAndroid`).
 *
 * En développement seulement (`npm run dev`), `?android=1` dans l'URL fait
 * comme si la page tournait dans l'app : on vérifie la piste à trois voies
 * dans un navigateur, sans reconstruire l'APK. Le drapeau disparaît des builds
 * de production (`import.meta.env.DEV` y est faux), le site public garde donc
 * toujours ses quatre voies.
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

/** Nombre de voies à utiliser sur cet appareil. */
export function laneCountForDevice() {
  return runningInAndroidApp() && LANE_COUNTS.includes(APP_LANE_COUNT)
    ? APP_LANE_COUNT
    : WEB_LANE_COUNT;
}

/** Fixe la piste de l'appareil et renvoie la voie retenue (3 ou 4). */
export function applyLaneCountForDevice() {
  return setLaneCount(laneCountForDevice());
}

/** Vrai si la piste courante est celle de l'application. */
export function isAppTrack() {
  return laneCount() === APP_LANE_COUNT;
}
