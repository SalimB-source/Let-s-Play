/**
 * Entrée du banc d'essai « courses en pop-up » — compilée par
 * `scripts/race-popup-check.mjs` (build Vite `--ssr`), jamais exécutée seule.
 *
 * Elle ne fait que ré-exporter les modules de l'application concernés : c'est
 * Vite, et non Node, qui résout leurs imports sans extension — le code testé
 * reste donc exactement celui du site.
 */
export { RACE_POPUP_MEDIA, RACE_POPUP_PHASES, racePopupLayout, racePopupOpen } from '../src/games/racePopup';
export {
  HANDHELD_MEDIA,
  PHONE_LAYOUT_MEDIA,
  TOUCH_MEDIA,
  isAndroidApp,
  isHandheld,
  isPhoneLayout,
  isTouchDevice,
} from '../src/lib/phoneLayout';
export { default as usePageScrollLock, lockPageScroll } from '../src/lib/usePageScrollLock';
export { hasAppBridge, setAppPullToRefresh } from '../src/lib/appBridge';
