import { requestNativeFullscreen, exitNativeFullscreen, nativeFullscreenElement } from './gameFullscreen.js';

/**
 * La session du Sablier — src/games/rpgSessionSablier.js
 * ======================================================
 * Deux écrans vivent dans la section : la route `/jeu/sablier-de-bab-el`
 * (écran d'entrée, menu, atelier, souk, mode histoire) et le duel lui-même.
 * Ils se superposent — le duel ouvre sa session à l'intérieur de celle de la
 * route — d'où ce compteur de module : le pont Android n'est prévenu qu'à la
 * **première** ouverture et à la **dernière** fermeture.
 *
 * **Le Sablier ne verrouille plus l'orientation.** Le plateau est une pile
 * verticale (le sorcier adverse, ses deux rangées, les nôtres, notre sorcier,
 * la main) : debout, il n'a plus à tenir dans une bande de hauteur, et la
 * coque portrait (`rpg-portrait.css`) lui donne ses sept rangées. Le jeu suit
 * donc l'appareil — le portrait comme le paysage, qui garde ses coques.
 *
 * Ce qui reste ici :
 *   - le **plein écran** demandé dans le geste du joueur (le duel s'y installe,
 *     la route s'en remet à la page) ;
 *   - l'**annonce au pont Android** (`setSablierActif`) : il désarme le
 *     tirer-pour-rafraîchir sur la section, qui rechargerait la page en pleine
 *     partie. Aucun repli sur l'ancien `setPaysageSablier` : cette méthode
 *     native verrouillerait le paysage, exactement ce que le portrait supprime.
 *     Une APK plus ancienne ignore simplement l'appel (son manifeste ne fixe
 *     aucune orientation : l'écran reste libre, seul le rafraîchissement par
 *     tirer reste armé).
 */

/** Sessions ouvertes dans la section — les tests s'en servent. */
let sessionsOuvertes = 0;

export function sessionsSablierOuvertes() {
  return sessionsOuvertes;
}

/** Remise à zéro réservée aux tests : une session ne survit pas à un test. */
export function reinitialiserSessionsSablier() {
  sessionsOuvertes = 0;
}

/** Le pont Android : désarme le tirer-pour-refraîchir pendant la partie. */
function annoncerSablier(win, actif) {
  const pont = win?.LetsPlayAndroid;
  if (!pont) return;
  try {
    if (typeof pont.setSablierActif === 'function') pont.setSablierActif(actif);
  } catch { /* pont d'une APK plus ancienne : rien à casser */ }
}

/**
 * Ouvre une session : plein écran si la session le demande, annonce au pont.
 * Rend une promesse résolue quand le plein écran a été tenté (son refus n'est
 * jamais une erreur : sans lui, la coque reste simplement calée sur la
 * fenêtre).
 */
export function createSessionSablier(win = window, doc = document) {
  let active = false;
  // Cette session a-t-elle déjà compté dans `sessionsOuvertes` ? `enter()` peut
  // être appelé plusieurs fois (reprise de partie, retour au plateau) : une
  // session ne compte qu'une fois.
  let annonce = false;
  let generation = 0;
  let ownsFullscreen = false;

  return {
    async enter({ fullscreen = true } = {}) {
      active = true;
      const token = ++generation;
      if (!annonce) {
        annonce = true;
        sessionsOuvertes += 1;
        if (sessionsOuvertes === 1) annoncerSablier(win, true);
      }
      // Le plein écran doit être demandé dans le geste du lancement ou de la
      // reprise. Il vaut aussi sur PC ; la coque reste calée sur la fenêtre
      // quand le navigateur ou un aperçu embarqué le refuse.
      if (fullscreen && !nativeFullscreenElement(doc)) {
        const ouvert = await requestNativeFullscreen(doc.documentElement);
        if (ouvert) {
          // Session refermée pendant l'attente : on rend l'écran demandé.
          if (!active || token !== generation) {
            if (!active) await exitNativeFullscreen(doc);
            else ownsFullscreen = true;
            return;
          }
          ownsFullscreen = true;
        }
      }
    },
    leave() {
      active = false;
      generation += 1;
      if (annonce) {
        annonce = false;
        sessionsOuvertes = Math.max(0, sessionsOuvertes - 1);
        if (sessionsOuvertes === 0) annoncerSablier(win, false);
      }
      if (ownsFullscreen) exitNativeFullscreen(doc);
      ownsFullscreen = false;
    },
  };
}
