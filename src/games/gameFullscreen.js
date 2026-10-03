/**
 * `gameFullscreen` — le plein écran des jeux d'arcade (Mirage Rush, Vice City
 * Rush), côté navigateur (sans React).
 *
 * Deux couches, toujours posées ensemble :
 *
 *   - le **plein écran natif** (Fullscreen API, préfixe WebKit compris) quand la
 *     plateforme l'accepte : Chrome, Edge, Firefox et Safari sur ordinateur,
 *     Chrome Android, et la WebView de l'application (son `onShowCustomView`
 *     pose alors le plein écran immersif du système, masque barres comprises) ;
 *   - une **couche fixe** (classe `is-immersive` sur la coque du jeu, voir
 *     `mirage-rush.css` et `vice-city-rush.css`) qui couvre tout le viewport.
 *     C'est elle qui règle la mise en page du jeu en plein écran natif, et c'est
 *     elle qui reste quand l'API manque ou refuse (iPhone, iframe sans
 *     `allowfullscreen`, politique du navigateur).
 *
 * Qui ouvre le plein écran :
 *
 *   - **partout** : l'interface se lance en plein écran **de base**. La couche
 *     fixe couvre tout le viewport dès l'ouverture de la page (aucun geste
 *     n'est exigé pour elle) ; le plein écran natif, que le navigateur refuse
 *     hors d'un geste, est demandé au tout premier geste du joueur — voir
 *     `MirageRushPage.jsx` et `ViceCityRushPage.jsx`. Le choix est « épinglé » :
 *     il reste jusqu'à ce que le joueur le quitte (bouton de la barre, touche F,
 *     Échap) ;
 *   - **téléphone, tablette, application** : le lancement d'une partie (clic sur
 *     une carte de map ou de coupe, bouton « LANCER ») demande aussi le natif
 *     dans le geste — un doigt joue mieux sur tout l'écran — voir
 *     `opensFullscreenOnLaunch()` ;
 *   - **sinon** : bouton « Plein écran » de la barre du jeu, bouton « LANCER
 *     EN PLEIN ÉCRAN » de Mirage (une fois le plein écran quitté), ou la touche F.
 *
 * Ce module ne contient que les gestes du navigateur et cette règle ; l'état
 * React (classe, verrou de défilement, sortie différée, fermeture au retour de
 * l'intro) vit dans `useGameFullscreen.js`.
 */
import { runningInAndroidApp } from './mirageLanes.js';

/** Classe posée sur `<body>` pendant le plein écran : la page derrière ne défile plus. */
export const FULLSCREEN_LOCK_CLASS = 'game-immersive-lock';

/** Document courant, ou `null` hors navigateur (tests purs, rendu serveur). */
function currentDocument() {
  return typeof document === 'undefined' ? null : document;
}

/** Élément actuellement en plein écran natif (API standard ou préfixe WebKit), sinon `null`. */
export function nativeFullscreenElement(root = currentDocument()) {
  return root?.fullscreenElement || root?.webkitFullscreenElement || null;
}

/**
 * Demande le plein écran natif pour `element`. À appeler **de façon synchrone**
 * dans le geste de l'utilisateur (clic, touche) : le navigateur refuse sinon.
 * Résout `true` si la demande est partie, `false` si l'API manque ou refuse —
 * l'appelant garde alors la couche fixe, qui suffit pour jouer.
 */
export async function requestNativeFullscreen(element) {
  const request = element?.requestFullscreen || element?.webkitRequestFullscreen;
  if (typeof request !== 'function') return false;
  try {
    await request.call(element);
    return true;
  } catch {
    return false;
  }
}

/** Quitte le plein écran natif s'il y en a un ; ne lève jamais (déjà refermé, API absente). */
export async function exitNativeFullscreen(root = currentDocument()) {
  if (!root || !nativeFullscreenElement(root)) return;
  const exit = root.exitFullscreen || root.webkitExitFullscreen;
  try {
    await exit?.call(root);
  } catch {
    /* le navigateur l'a déjà refermé */
  }
}

/** Vrai pour un écran tactile au pointeur grossier (doigt) ; ne lève jamais. */
function coarsePointer() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return Boolean(window.matchMedia('(pointer: coarse)')?.matches);
  } catch {
    return false;
  }
}

/**
 * Vrai quand un lancement de partie (clic sur une carte, bouton « LANCER »)
 * ouvre le plein écran sans qu'on le demande : appareil tactile (téléphone,
 * tablette) ou application Android. Sur ordinateur, c'est faux — il faut le
 * bouton, la touche F ou « LANCER EN PLEIN ÉCRAN ».
 */
export function opensFullscreenOnLaunch() {
  return runningInAndroidApp() || coarsePointer();
}

/**
 * Vrai pour une touche qui bascule le plein écran : `F` seul. Ni Ctrl/Cmd+F (la
 * recherche du navigateur), ni Alt+F (menus), ni une touche maintenue enfoncée
 * (sinon la page clignoterait entre les deux états).
 */
export function isFullscreenShortcut(event) {
  if (!event || event.repeat) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return String(event.key || '').toLowerCase() === 'f';
}
