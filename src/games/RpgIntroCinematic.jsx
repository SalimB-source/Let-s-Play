import { useCallback, useEffect, useRef, useState } from 'react';
import './rpg-intro-cinematic.css';
import {
  lirePreferencesSonoresRpg,
  reprendreThemePrincipal,
} from './rpgPlateauMusic.js';

/**
 * Lecteur plein écran de la cinématique d'intro du Sablier.
 * ------------------------------------------------------------------
 * Affiche `cine-intro-en-1080p.mp4` avec ses sous-titres anglais, une barre
 * discrète (lecture/pause, son, progression cliquable) et un bouton
 * « Passer » toujours visible. Échap passe aussi la vidéo.
 *
 * Le thème musical du menu est mis en pause pendant la lecture (la vidéo a
 * sa propre nappe) puis repris à la fermeture si le son est actif.
 *
 * `onFinish` est appelé à la fin comme au skip — dans les deux cas la
 * cinématique est marquée « vue » pour ne plus s'imposer.
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

function formaterDuree(secondes) {
  if (!Number.isFinite(secondes) || secondes < 0) return '0:00';
  const m = Math.floor(secondes / 60);
  const s = Math.floor(secondes % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function RpgIntroCinematic({ onFinish }) {
  const base = import.meta.env.BASE_URL || '/';
  const videoRef = useRef(null);
  const skipRef = useRef(null);
  const [aDemarre, setADemarre] = useState(false);
  const [enPause, setEnPause] = useState(false);
  const [muet, setMuet] = useState(false);
  const [position, setPosition] = useState(0);
  const [duree, setDuree] = useState(0);

  const terminer = useCallback(() => {
    marquerCinematiqueVue();
    onFinish();
  }, [onFinish]);

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

  // Lecture auto dans la foulée du clic d'ouverture ; en cas de refus du
  // navigateur (autoplay bloqué), le gros bouton de lancement prend le relais.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().then(
      () => setADemarre(true),
      () => setADemarre(false),
    );
  }, []);

  const basculerLecture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
  }, []);

  const basculerMuet = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuet(video.muted);
  }, []);

  const chercher = useCallback((evenement) => {
    const video = videoRef.current;
    const barre = evenement.currentTarget;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const rect = barre.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (evenement.clientX - rect.left) / rect.width));
    video.currentTime = ratio * video.duration;
    setPosition(video.currentTime);
  }, []);

  const progression = duree > 0 ? Math.min(1, position / duree) : 0;

  return (
    <div className="rpg-cine" role="dialog" aria-modal="true" aria-label="Cinématique d’intro — Que ton nom soit écrit">
      <video
        ref={videoRef}
        className="rpg-cine__video"
        src={`${base}sablier-cinematic/montage/cine-intro-en-1080p.mp4`}
        playsInline
        preload="auto"
        onEnded={terminer}
        onPlay={() => { setADemarre(true); setEnPause(false); }}
        onPause={() => setEnPause(true)}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuree(e.currentTarget.duration || 0)}
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
        <button type="button" className="rpg-cine__lancer" onClick={basculerLecture}>
          <span className="rpg-cine__lancer-icone" aria-hidden="true">▶</span>
          <span>Lancer la cinématique</span>
          <small>Que ton nom soit écrit · 3 min 27</small>
        </button>
      )}

      <div className="rpg-cine__barre">
        <button
          type="button"
          className="rpg-cine__bouton"
          onClick={basculerLecture}
          aria-label={enPause ? 'Reprendre la vidéo' : 'Mettre la vidéo en pause'}
        >
          {enPause ? '▶' : '⏸'}
        </button>
        <button
          type="button"
          className="rpg-cine__bouton"
          onClick={basculerMuet}
          aria-label={muet ? 'Activer le son' : 'Couper le son'}
          aria-pressed={muet}
        >
          {muet ? '🔇' : '🔊'}
        </button>
        <button
          type="button"
          className="rpg-cine__progression"
          onClick={chercher}
          aria-label={`Progression : ${formaterDuree(position)} sur ${formaterDuree(duree)}. Activer pour naviguer dans la vidéo.`}
        >
          <span className="rpg-cine__progression-piste" aria-hidden="true">
            <span className="rpg-cine__progression-remplie" style={{ width: `${progression * 100}%` }} />
          </span>
        </button>
        <span className="rpg-cine__duree" aria-hidden="true">
          {formaterDuree(position)} / {formaterDuree(duree)}
        </span>
        <button
          ref={skipRef}
          type="button"
          className="rpg-cine__bouton rpg-cine__passer"
          onClick={terminer}
        >
          Passer ⏭
        </button>
      </div>
    </div>
  );
}
