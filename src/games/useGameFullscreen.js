import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FULLSCREEN_LOCK_CLASS,
  exitNativeFullscreen,
  nativeFullscreenElement,
  requestNativeFullscreen,
} from './gameFullscreen';

/**
 * Au bout de ce délai (ms), on cesse d'attendre l'évènement `fullscreenchange`
 * d'une sortie que nous avons demandée (WebView qui ne l'envoie pas, sortie
 * refusée) : la page reprend sa mise en page ordinaire.
 */
const EXIT_FALLBACK_MS = 1000;

/**
 * Plein écran d'un bloc de la page (`targetRef`) : la coque d'un jeu d'arcade —
 * Mirage Rush (`<section>` du jeu, fenêtre de course en ligne) et Vice City Rush
 * (`<section id="vice-city-rush-console">`). Le gros des gestes est dans
 * `gameFullscreen.js` ; ici, l'état React et le cycle de vie.
 *
 * - `active` : vrai tant que le bloc doit occuper tout l'écran (plein écran
 *   natif **ou** couche fixe) — c'est lui qui pose la classe `is-immersive`.
 * - `enter({ pinned, native })` : ouvre le plein écran. Pour le natif, à
 *   appeler dans un geste de l'utilisateur (le navigateur refuse sinon).
 *   `pinned` dit que le joueur l'a **demandé** : le jeu ne le referme pas de
 *   lui-même (voir `isPinned`). Sans lui, c'est une ouverture automatique
 *   (téléphone, application) que le jeu referme au retour à l'intro.
 *   `native: false` pose seulement la couche fixe, sans demande au navigateur :
 *   c'est le plein écran « de base » au montage de la page, avant tout geste.
 *   Rappelé alors que la couche est déjà posée mais pas le natif (le premier
 *   geste du joueur), `enter` demande le plein écran natif — la couche « monte »
 *   en vrai plein écran.
 * - `exit()` : le referme. Sans effet s'il est déjà fermé.
 * - `toggle()` : bouton et touche F — une demande explicite, donc `pinned`.
 * - `onNativeExit` : appelée quand le **navigateur** referme le plein écran
 *   (Échap, geste « retour » d'Android…) alors que le jeu le croyait ouvert. Le
 *   jeu y met la course en pause : on ne la joue pas à moitié dans la page.
 *   Jamais appelée pour une sortie que nous avons demandée nous-mêmes.
 *
 * Fermer le plein écran natif prend un instant (le navigateur anime le retour de
 * la fenêtre). Tant qu'il n'est pas terminé, la coque reste plein écran côté
 * navigateur : si `active` retombait aussitôt, la piste rétrécirait dans une
 * fenêtre encore plein écran. Une sortie demandée par nous garde donc `active`
 * jusqu'à `fullscreenchange` (ou `EXIT_FALLBACK_MS`) ; pendant ce court délai
 * `enter()` est ignoré (F pressée deux fois de suite).
 */
export default function useGameFullscreen(targetRef, { onNativeExit } = {}) {
  const [active, setActive] = useState(false);
  // `activeRef` : le plein écran est voulu (la logique). `active` : la mise en page
  // plein écran est posée (l'affichage) — elle garde un instant de retard à la sortie.
  const activeRef = useRef(false);
  const pinnedRef = useRef(false);
  const exitTimerRef = useRef(0);
  const onNativeExitRef = useRef(onNativeExit);
  onNativeExitRef.current = onNativeExit;

  // La sortie est terminée : la page reprend sa mise en page et son défilement.
  const settle = useCallback(() => {
    window.clearTimeout(exitTimerRef.current);
    exitTimerRef.current = 0;
    setActive(false);
    document.body.classList.remove(FULLSCREEN_LOCK_CLASS);
  }, []);

  const exit = useCallback(() => {
    if (!activeRef.current || typeof document === 'undefined') return;
    activeRef.current = false;
    pinnedRef.current = false;
    if (!nativeFullscreenElement()) {
      settle();
      return;
    }
    exitTimerRef.current = window.setTimeout(settle, EXIT_FALLBACK_MS);
    exitNativeFullscreen();
  }, [settle]);

  const enter = useCallback(({ pinned = false, native = true } = {}) => {
    const target = targetRef.current;
    if (!target || typeof document === 'undefined') return false;
    if (activeRef.current) {
      if (pinned) pinnedRef.current = true;
      // La couche fixe est déjà posée sans le plein écran natif (plein écran
      // « de base » au montage de la page, avant tout geste) : le premier
      // geste du joueur passe ici et demande le vrai plein écran. On n'insiste
      // pas pendant une sortie en cours.
      if (native && !nativeFullscreenElement() && !exitTimerRef.current) {
        requestNativeFullscreen(target).then(() => {
          if (!activeRef.current) exitNativeFullscreen();
        });
      }
      return true;
    }
    if (exitTimerRef.current) return false;
    activeRef.current = true;
    pinnedRef.current = pinned;
    setActive(true);
    document.body.classList.add(FULLSCREEN_LOCK_CLASS);
    // Appel synchrone, dans le geste de l'utilisateur. La couche fixe est déjà
    // posée : si le navigateur refuse, le jeu occupe quand même tout l'écran.
    // `native: false` saute la demande (montage de la page, hors de tout geste :
    // le navigateur la refuserait) — elle partira au premier geste.
    if (native) {
      requestNativeFullscreen(target).then(() => {
        // Refermé avant que le navigateur ait répondu (double clic) : sans cette
        // reprise, la page resterait en plein écran natif avec la mise en page
        // fenêtrée.
        if (!activeRef.current) exitNativeFullscreen();
      });
    }
    return true;
  }, [targetRef]);

  const toggle = useCallback(() => {
    if (activeRef.current) exit();
    else enter({ pinned: true });
  }, [enter, exit]);

  const isPinned = useCallback(() => pinnedRef.current, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onChange = () => {
      // Entrée dans le plein écran : rien à faire, la couche fixe est déjà là.
      if (nativeFullscreenElement()) return;
      // Le navigateur a fini de refermer ce que nous lui avions demandé de fermer.
      if (exitTimerRef.current) {
        settle();
        return;
      }
      // Sinon c'est lui qui a refermé le plein écran (Échap, « retour ») : on suit,
      // puis on prévient le jeu.
      if (!activeRef.current) return;
      exit();
      onNativeExitRef.current?.();
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
      // Page quittée en plein écran (ou en pleine sortie) : on rend le navigateur et
      // le défilement. Hors de ce cas on ne touche à rien : ni au plein écran d'un
      // autre élément, ni au verrou d'une autre instance du hook.
      const owned = activeRef.current || exitTimerRef.current;
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = 0;
      activeRef.current = false;
      pinnedRef.current = false;
      if (!owned) return;
      document.body.classList.remove(FULLSCREEN_LOCK_CLASS);
      exitNativeFullscreen();
    };
  }, [exit, settle]);

  return { active, enter, exit, toggle, isPinned };
}
