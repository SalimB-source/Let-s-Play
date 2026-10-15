import React, { useEffect, useRef, useState } from 'react';
import VideoThumb from './VideoThumb';
import { VIDEO_STATE_CHANGED_EVENT, youTubeEmbedUrl } from '../lib/videoPlayback';

const VIEW_THRESHOLD = 0.42;
const YOUTUBE_ORIGIN = 'https://www.youtube.com';
const PLAYER_ENDED = 0;
const PLAYER_PLAYING = 1;
const PLAYER_PAUSED = 2;

function isEnoughInView(element) {
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  if (!rect.width || !rect.height || !viewportWidth || !viewportHeight) return false;

  const visibleWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
  const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
  return (visibleWidth * visibleHeight) / (rect.width * rect.height) >= VIEW_THRESHOLD;
}

function sendPlayerCommand(frame, func, args = []) {
  try {
    frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), YOUTUBE_ORIGIN);
  } catch {
    /* lecteur pas encore prêt ou fenêtre fermée */
  }
}

/**
 * Affiche d'abord la miniature, puis charge le lecteur YouTube muet quand au
 * moins 42 % de son cadre entre dans la fenêtre. L'autoplay démarre ainsi au
 * défilement vers le bloc vidéo, sans charger le lecteur dès l'ouverture.
 * `poster` permet de servir une miniature locale avant le repli YouTube et
 * `showControls` permet de masquer les commandes du lecteur si nécessaire.
 * `coverYoutubeOverlayOnPause` cache l'écran YouTube de pause/fin derrière la
 * miniature ; un clic sur celle-ci reprend ou relance la vidéo.
 */
export default function ScrollAutoplayVideo({
  id,
  title,
  posterAlt,
  poster,
  showControls = true,
  coverYoutubeOverlayOnPause = false,
  resumeLabel = 'Reprendre la vidéo',
}) {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const lastPlayerStateRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [youtubeOverlayCovered, setYoutubeOverlayCovered] = useState(false);

  useEffect(() => {
    const target = containerRef.current;
    if (!target) return undefined;

    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver((entries) => {
        const shouldStart = entries.some((entry) => (
          entry.target === target
          && entry.isIntersecting
          && entry.intersectionRatio >= VIEW_THRESHOLD
        ));
        if (!shouldStart) return;
        setStarted(true);
        observer.disconnect();
      }, { threshold: VIEW_THRESHOLD });

      observer.observe(target);
      return () => observer.disconnect();
    }

    // Repli pour les navigateurs sans IntersectionObserver : le lecteur ne
    // part toujours qu'une fois réellement visible, avec un seul contrôle RAF.
    let frame = null;
    const requestFrame = typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : (callback) => window.setTimeout(callback, 16);
    const cancelFrame = typeof window.cancelAnimationFrame === 'function'
      ? window.cancelAnimationFrame.bind(window)
      : window.clearTimeout.bind(window);
    const checkVisibility = () => {
      frame = null;
      if (!isEnoughInView(target)) return;
      setStarted(true);
      window.removeEventListener('scroll', scheduleCheck);
      window.removeEventListener('resize', scheduleCheck);
    };
    const scheduleCheck = () => {
      if (frame !== null) return;
      frame = requestFrame(checkVisibility);
    };

    scheduleCheck();
    window.addEventListener('scroll', scheduleCheck, { passive: true });
    window.addEventListener('resize', scheduleCheck, { passive: true });
    return () => {
      if (frame !== null) cancelFrame(frame);
      window.removeEventListener('scroll', scheduleCheck);
      window.removeEventListener('resize', scheduleCheck);
    };
  }, []);

  useEffect(() => {
    if (!coverYoutubeOverlayOnPause) return undefined;

    const onPlayerState = (event) => {
      if (event.detail?.frame !== iframeRef.current) return;
      const state = event.detail.state;
      lastPlayerStateRef.current = state;
      if (state === PLAYER_PAUSED || state === PLAYER_ENDED) {
        setYoutubeOverlayCovered(true);
      } else if (state === PLAYER_PLAYING) {
        setYoutubeOverlayCovered(false);
      }
    };

    window.addEventListener(VIDEO_STATE_CHANGED_EVENT, onPlayerState);
    return () => window.removeEventListener(VIDEO_STATE_CHANGED_EVENT, onPlayerState);
  }, [coverYoutubeOverlayOnPause]);

  useEffect(() => {
    lastPlayerStateRef.current = null;
    setYoutubeOverlayCovered(false);
  }, [id]);

  const resumeVideo = () => {
    const frame = iframeRef.current;
    if (lastPlayerStateRef.current === PLAYER_ENDED) sendPlayerCommand(frame, 'seekTo', [0, true]);
    sendPlayerCommand(frame, 'playVideo');
    setYoutubeOverlayCovered(false);
  };

  return (
    <div ref={containerRef} className="scroll-autoplay-video">
      <VideoThumb
        className={`scroll-autoplay-video-poster${youtubeOverlayCovered ? ' scroll-autoplay-video-poster--cover' : ''}`}
        id={id}
        lead={poster}
        alt={posterAlt || title}
        aria-hidden={started ? 'true' : undefined}
      />
      {started && (
        <iframe
          ref={iframeRef}
          src={youTubeEmbedUrl(id, {
            autoplay: true,
            muted: true,
            playsinline: true,
            controls: showControls,
          })}
          title={title}
          loading="eager"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      )}
      {started && coverYoutubeOverlayOnPause && youtubeOverlayCovered && (
        <button className="scroll-autoplay-video-resume" type="button" onClick={resumeVideo}>
          <span className="sr-only">{resumeLabel}</span>
        </button>
      )}
    </div>
  );
}
