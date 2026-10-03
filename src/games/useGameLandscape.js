import { useCallback, useEffect, useRef, useState } from 'react';
import { nativeFullscreenElement } from './gameFullscreen';
import {
  isPortrait,
  needsLandscape,
  releaseGameLandscape,
  requestGameLandscape,
  rotationPromptVisible,
} from './gameLandscape';

/**
 * Détection du doigt : pointeur **grossier** (téléphone, tablette,
 * application). C'est ce signal qui affiche les commandes « manette » — un
 * ordinateur tactile garde sa souris et son clavier.
 */
const COARSE_POINTER_MEDIA = '(pointer: coarse)';

function matches(query) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return Boolean(window.matchMedia(query)?.matches);
  } catch {
    return false;
  }
}

/**
 * `useGameLandscape` — le paysage d'un jeu d'arcade : détection du doigt,
 * orientation de l'appareil, et le geste « couche l'écran » / « rends-le au
 * téléphone ».
 *
 * La mécanique navigateur/Android vit dans `gameLandscape.js` ; ici, le cycle
 * de vie React et les trois moments où la demande part :
 *
 *   - **au montage** de la page de jeu (appel hors geste) : l'application
 *     Android, elle, se couche tout de suite — son pont n'attend pas de geste.
 *     Un navigateur qui refuse (Chrome hors plein écran) ne dit rien : la
 *     demande sera rejouée plus tard ;
 *   - **au premier geste** du joueur (voir `SoulsPage.jsx`) : c'est le geste
 *     qui ouvre le plein écran natif, et Chrome Android n'honore le verrou
 *     d'orientation qu'en plein écran ;
 *   - **à chaque entrée en plein écran** (évènement `fullscreenchange`) : le
 *     verrou est rejoué, car un verrou demandé hors plein écran est refusé et
 *     parce que quitter le plein écran libère l'orientation.
 *
 * Tant que l'appareil doit jouer couché et qu'il est tenu debout,
 * `showRotationPrompt` est vrai : la page affiche « tournez votre appareil »
 * (iOS ne connaît pas le verrouillage d'orientation, et Firefox Android le
 * refuse). Le joueur peut répondre « jouer quand même » : le conseil se tait
 * pour la session.
 *
 * `release()` est appelé en quittant la page de jeu : le téléphone retrouve son
 * orientation, et l'activité Android la sienne (le reste du site n'est pas
 * verrouillé).
 */
export default function useGameLandscape() {
  // Détection au premier rendu : sur un appareil déjà connu, la page ne doit
  // pas clignoter (couche plein écran posée puis retirée).
  const [isTouch, setIsTouch] = useState(() => matches(COARSE_POINTER_MEDIA));
  const [landscapeDevice] = useState(() => needsLandscape());
  const [portrait, setPortrait] = useState(() => isPortrait());
  const [dismissed, setDismissed] = useState(false);
  const wantedRef = useRef(false);
  const landscapeDeviceRef = useRef(landscapeDevice);
  landscapeDeviceRef.current = landscapeDevice;

  // Suivi en direct : un doigt peut arriver (souris débranchée), et l'appareil
  // peut tourner à tout moment (rotation manuelle quand le verrou est refusé).
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const syncPortrait = () => setPortrait(isPortrait());
    syncPortrait();
    window.addEventListener('orientationchange', syncPortrait);
    window.addEventListener('resize', syncPortrait);
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia(COARSE_POINTER_MEDIA) : null;
    const syncTouch = () => setIsTouch(Boolean(mq?.matches));
    if (mq) {
      syncTouch();
      mq.addEventListener?.('change', syncTouch);
    }
    return () => {
      window.removeEventListener('orientationchange', syncPortrait);
      window.removeEventListener('resize', syncPortrait);
      mq?.removeEventListener?.('change', syncTouch);
    };
  }, []);

  /** Demande l'écran couché. À appeler dans un geste du joueur. */
  const request = useCallback(() => {
    if (!landscapeDeviceRef.current) return false;
    wantedRef.current = true;
    requestGameLandscape();
    return true;
  }, []);

  // Au montage : l'application Android se couche immédiatement. Sur un
  // navigateur, l'appel est refusé hors plein écran — sans conséquence, il
  // repartira au premier geste.
  useEffect(() => {
    request();
    return () => {
      // Page quittée : le téléphone et l'activité retrouvent leur orientation.
      wantedRef.current = false;
      releaseGameLandscape();
    };
  }, [request]);

  // Chrome Android n'honore le verrou qu'en plein écran : chaque entrée en
  // plein écran relance la demande (le geste qui l'ouvre est déjà passé).
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const retry = () => {
      if (!wantedRef.current || !nativeFullscreenElement()) return;
      request();
    };
    document.addEventListener('fullscreenchange', retry);
    document.addEventListener('webkitfullscreenchange', retry);
    return () => {
      document.removeEventListener('fullscreenchange', retry);
      document.removeEventListener('webkitfullscreenchange', retry);
    };
  }, [request]);

  const dismissRotation = useCallback(() => setDismissed(true), []);

  return {
    /** Écran tactile : la page affiche les commandes « manette ». */
    isTouch,
    /** Téléphone ou application : cet appareil doit jouer couché. */
    landscapeDevice,
    /** L'appareil est tenu debout alors qu'il doit jouer couché. */
    portrait,
    /** Faut-il afficher « tournez votre appareil » ? */
    showRotationPrompt: rotationPromptVisible({ landscapeDevice, portrait, dismissed }),
    request,
    release: releaseGameLandscape,
    dismissRotation,
  };
}
