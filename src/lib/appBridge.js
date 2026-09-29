/**
 * `appBridge` — les quelques réglages de l'app Android que le site pilote.
 *
 * La WebView de l'APK injecte un pont natif (`LetsPlayAndroid`, voir
 * `MainActivity.addJavascriptInterface`) : appels vocaux/vidéo
 * (`setCallAudio`) et tirer-pour-rafraîchir (`setPullToRefresh`). Le site étant
 * servi en ligne, il peut être plus récent que l'app installée : **chaque appel
 * est optionnel** et une méthode inconnue est simplement ignorée. Dans un
 * navigateur, la clé n'existe pas et rien ne se passe.
 */

/** Vrai si la page tourne dans l'app Android (pont natif présent). */
export function hasAppBridge() {
  return typeof window !== 'undefined' && Boolean(window.LetsPlayAndroid);
}

/**
 * Coupe (ou rend) le tirer-pour-rafraîchir de l'app. Sans le pont — navigateur,
 * ou APK antérieure à cette méthode — l'appel est sans effet et renvoie `false`.
 */
export function setAppPullToRefresh(enabled) {
  if (typeof window === 'undefined') return false;
  const bridge = window.LetsPlayAndroid;
  if (!bridge || typeof bridge.setPullToRefresh !== 'function') return false;
  try {
    bridge.setPullToRefresh(Boolean(enabled));
    return true;
  } catch (e) {
    return false;
  }
}
