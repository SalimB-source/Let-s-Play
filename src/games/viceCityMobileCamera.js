/**
 * Le cadrage de Vice City sur un téléphone tenu debout.
 *
 * ── Le problème ────────────────────────────────────────────────────────────
 * La caméra de poursuite a été réglée sur un écran large : 66° de champ
 * **vertical**, 5,0 m derrière la voiture, 2,7 m au-dessus. En 16/9, ce champ
 * vertical donne 103° en horizontal — large, et c'est voulu.
 *
 * En portrait (9/16), le même 66° vertical ne donne plus que 41° en
 * horizontal : un morceau de ruelle, pas une ville. Le joueur ne voit ni le
 * trottoir d'en face ni la voiture qu'il croise. Deux réglages s'imposent :
 *
 *   1. **Élargir le champ en portrait** pour retrouver le champ *horizontal*
 *      d'un écran 16/9 — c'est la sensation de la version bureau, transferée
 *      sur un écran étroit. La cible est plafonnée à 88° : au-delà, la
 *      projection s'étire et la ville se déforme sur les bords.
 *   2. **Reculer et monter** la poursuite : à champ égal, un écran étroit
 *      cadre le même volume de ville sur plus de hauteur, mais la voiture
 *      apparaît énorme. Reculer de 5,0 m à 7,0 m la remet à une taille
 *      comparable à celle du bureau (elle occupe environ un tiers de la
 *      largeur, comme en 16/9), et regarder plus haut (1,0 m au lieu de
 *      1,1 m sous l'horizon) laisse voir la route devant.
 *
 * ── Ce que ça ne touche pas ────────────────────────────────────────────────
 * Le paysage — téléphone couché comme écran d'ordinateur — garde
 * **exactement** les valeurs historiques : 66° de champ, 5,0 m de recul,
 * 2,7 m de hauteur, regard à 1,1 m. Un écran 16/9 n'a rien à gagner à ce
 * qu'on lui change son cadrage : le module ne s'applique que si l'écran est
 * plus haut que large, et au-delà d'un seuil de téléphone.
 *
 * Le calcul se fait **dans `resize`**, à chaque changement de taille : la
 * rotation d'un téléphone ne reconstruit pas la ville, elle rappelle
 * `resize`, qui réapplique le cadrage. C'est ce que vérifie
 * `tests/vice-city-mobile-camera.test.js` : le module ne monte jamais dans
 * les dépendances de l'effet 3D.
 */

/** Champ vertical maximal en portrait : au-delà, la projection s'étire. */
export const CITY_RUSH_CAMERA_MAX_FOV = 88;
/** Champ vertical historique, paysage et bureau : celui de la version 16/9. */
export const CITY_RUSH_CAMERA_BASE_FOV = 66;
/** Champ horizontal visé en portrait : celui d'un 16/9 en 66° vertical. */
export const CITY_RUSH_CAMERA_TARGET_HORIZONTAL_FOV = 2
  * Math.atan(Math.tan((CITY_RUSH_CAMERA_BASE_FOV * Math.PI) / 360) * (16 / 9))
  * (180 / Math.PI);
/** En dessous, l'écran est un téléphone : le cadrage mobile s'applique. */
export const CITY_RUSH_PORTRAIT_MAX_WIDTH = 600;
/** Poursuite historique : bureau et paysage, qu'on ne touche pas. */
export const CITY_RUSH_CHASE_LANDSCAPE = Object.freeze({
  distance: 5.0,
  height: 2.7,
  lookHeight: 1.1,
});
/**
 * Poursuite portrait : la caméra recule de deux mètres et suit la route d'un
 * peu plus haut, pour que la voiture garde la taille qu'elle a sur bureau.
 */
export const CITY_RUSH_CHASE_PORTRAIT = Object.freeze({
  distance: 7.0,
  height: 3.0,
  lookHeight: 1.0,
});

/**
 * L'écran est-il un téléphone tenu debout ?
 *
 * On demande les deux : plus haut que large **et** étroit. Un ordinateur en
 * fenêtre verticale (800 × 1000) n'a pas à recevoir le cadrage téléphone.
 * `width`/`height` sont ceux du canevas, c'est-à-dire ceux que la caméra va
 * projeter — pas la fenêtre du navigateur, qui peut inclure des barres.
 */
export function isViceCityPortraitViewport(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  if (width <= 0 || height <= 0) return false;
  return height > width && width <= CITY_RUSH_PORTRAIT_MAX_WIDTH;
}

/**
 * Le champ vertical à donner à la caméra pour un canevas `width` × `height`.
 *
 * Paysage : `CITY_RUSH_CAMERA_BASE_FOV`, inchangé. Portrait : le champ qui
 * redonne le champ horizontal d'un 16/9, plafonné à `CITY_RUSH_CAMERA_MAX_FOV`.
 */
export function viceCityCameraFov(width, height) {
  if (!isViceCityPortraitViewport(width, height)) return CITY_RUSH_CAMERA_BASE_FOV;
  const aspect = width / height;
  const target = CITY_RUSH_CAMERA_TARGET_HORIZONTAL_FOV;
  const vertical = (2 * Math.atan(Math.tan((target * Math.PI) / 360) / aspect) * 180) / Math.PI;
  if (!Number.isFinite(vertical)) return CITY_RUSH_CAMERA_MAX_FOV;
  return Math.min(CITY_RUSH_CAMERA_MAX_FOV, vertical);
}

/**
 * Le placement de la poursuite à donner à la caméra pour ce canevas.
 *
 * Retourne `{ distance, height, lookHeight }` : recul, hauteur au-dessus du
 * châssis, hauteur du point regardé au-dessus du sol. Paysage : les valeurs
 * historiques, à l'identique.
 */
export function viceCityChaseFraming(width, height) {
  return isViceCityPortraitViewport(width, height) ? CITY_RUSH_CHASE_PORTRAIT : CITY_RUSH_CHASE_LANDSCAPE;
}

/**
 * Ce que le montage 3D retient d'un cadrage : le champ et le placement, en une
 * seule lecture. `applyResize` reçoit cette valeur et l'applique à la caméra.
 */
export function viceCityCameraFraming(width, height) {
  return {
    fov: viceCityCameraFov(width, height),
    ...viceCityChaseFraming(width, height),
  };
}

/**
 * Applique un cadrage à une caméra three.js sans la mettre à jour : l'appelant
 * décide quand `updateProjectionMatrix()` (une fois par image au plus).
 *
 * La caméra n'est pas importée ici : le module reste testable sans `three`,
 * et le seul contrat est `{ fov }`. Un objet sans `fov` numérique est refusé
 * plutôt que de laisser passer un `NaN` dans la projection.
 */
export function applyViceCityCameraFraming(camera, framing) {
  if (!camera || !framing) return false;
  if (Number.isFinite(framing.fov)) camera.fov = framing.fov;
  return true;
}
