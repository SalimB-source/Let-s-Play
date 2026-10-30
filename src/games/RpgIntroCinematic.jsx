import { useCallback, useEffect, useRef, useState } from 'react';
import './rpg-intro-cinematic.css';
import { createRpgLandscapeSession } from './rpgLandscape.js';
import {
  lirePreferencesSonoresRpg,
  reprendreThemePrincipal,
} from './rpgPlateauMusic.js';

/**
 * Cinématique d'intro du Sablier — plein écran, un seul bouton : « Passer ».
 * ---------------------------------------------------------------------------
 * Elle joue à chaque entrée dans le jeu (jamais en PvP), en paysage comme
 * la partie : une session `rpgLandscape` verrouille l'orientation (et le
 * plein écran natif) le temps de la vidéo, puis rend la main au duel.
 * La vidéo part d'elle-même (dans la foulée du clic d'ouverture) ; si le
 * navigateur refuse l'autoplay, un toucher n'importe où la lance. Échap
 * passe aussi. Fin comme skip marquent la cinématique « vue ».
 *
 * Le thème musical du menu est mis en pause pendant la lecture (la vidéo a
 * sa propre nappe) puis repris à la fermeture si le son est actif.
 */

/** Clé `localStorage` : la cinématique a déjà été vue (fin ou skip). */
export const CINE_VUE_CLE = 'letsplay_sablier_cine_v1';

export function cinematiqueVue() {
  try {
    return window.localStorage?.getItem(CINE_VUE_CLE) === '1';
  } catch {
    return false;
  }
}

export function marquerCinematiqueVue() {
  try {
    window.localStorage?.setItem(CINE_VUE_CLE, '1');
  } catch {
    /* navigation privée : la cinématique reviendra, le skip reste un clic */
  }
}

export default function RpgIntroCinematic({ onFinish }) {
  const base = import.meta.env.BASE_URL || '/';
  const videoRef = useRef(null);
  const skipRef = useRef(null);
  const [aDemarre, setADemarre] = useState(false);
  const [portrait, setPortrait] = useState(false);

  const terminer = useCallback(() => {
    marquerCinematiqueVue();
    onFinish();
  }, [onFinish]);

  // Paysage comme le jeu : verrou d'orientation + plein écran natif le temps
  // de la vidéo, rendus à la fermeture (le duel les redemande à « Jouer »).
  useEffect(() => {
    const session = createRpgLandscapeSession();
    void session.enter({ fullscreen: true });
    return () => session.leave();
  }, []);

  // Là où le verrou est refusé (iPhone…), on invite à tourner l'appareil.
  useEffect(() => {
    const update = () => {
      const tactile = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      setPortrait(tactile && window.innerHeight > window.innerWidth);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  // Le menu se tait pendant la vidéo, puis reprend (son actif uniquement).
  useEffect(() => {
    const theme = reprendreThemePrincipal();
    theme?.pause();
    const { sonActif } = lirePreferencesSonoresRpg();
    skipRef.current?.focus({ preventScroll: true });
    return () => {
      if (sonActif) theme?.resume();
    };
  }, []);

  // Échap passe la vidéo, sans interférer avec le jeu derrière.
  useEffect(() => {
    const surTouche = (evenement) => {
      if (evenement.key === 'Escape') {
        evenement.stopPropagation();
        terminer();
      }
    };
    window.addEventListener('keydown', surTouche, true);
    return () => window.removeEventListener('keydown', surTouche, true);
  }, [terminer]);

  // Lecture auto dans la foulée du clic d'ouverture.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().then(
      () => setADemarre(true),
      () => setADemarre(false),
    );
  }, []);

  // Repli autoplay bloqué : toucher l'écran lance la vidéo.
  const lancerAuToucher = useCallback(() => {
    const video = videoRef.current;
    if (video && video.paused) void video.play().catch(() => {});
  }, []);

  return (
    <div
      className="rpg-cine"
      role="dialog"
      aria-modal="true"
      aria-label="Cinématique d’intro — Que ton nom soit écrit"
      onClick={lancerAuToucher}
    >
      <video
        ref={videoRef}
        className="rpg-cine__video"
        src={`${base}sablier-cinematic/montage/cine-intro-en-1080p.mp4`}
        playsInline
        preload="auto"
        onEnded={terminer}
        onPlay={() => setADemarre(true)}
      >
        <track
          kind="subtitles"
          src={`${base}sablier-cinematic/montage/sous-titres-en.vtt`}
          srcLang="en"
          label="English"
          default
        />
      </video>

      {!aDemarre && (
        <span className="rpg-cine__toucher" aria-hidden="true">▶</span>
      )}

      {portrait && (
        <p className="rpg-cine__rotation">Tournez l'appareil pour le paysage 🔄</p>
      )}

      <button
        ref={skipRef}
        type="button"
        className="rpg-cine__passer"
        onClick={(e) => { e.stopPropagation(); terminer(); }}
      >
        Passer ⏭
      </button>
    </div>
  );
}
