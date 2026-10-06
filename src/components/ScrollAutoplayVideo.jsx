import React, { useEffect, useRef, useState } from 'react';
import VideoThumb from './VideoThumb';
import { youTubeEmbedUrl } from '../lib/videoPlayback';

const VIEW_THRESHOLD = 0.42;

function isEnoughInView(element) {
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  if (!rect.width || !rect.height || !viewportWidth || !viewportHeight) return false;

  const visibleWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
  const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
  return (visibleWidth * visibleHeight) / (rect.width * rect.height) >= VIEW_THRESHOLD;
}

/**
 * Affiche d'abord la miniature, puis charge le lecteur YouTube muet quand au
 * moins 42 % de son cadre entre dans la fenêtre. L'autoplay est ainsi déclenché
 * à l'arrivée sur la une, plutôt qu'au chargement initial de toute la page.
 */
export default function ScrollAutoplayVideo({ id, title, posterAlt }) {
  const containerRef = useRef(null);
  const [started, setStarted] = useState(false);

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

  return (
    <div ref={containerRef} className="scroll-autoplay-video">
      <VideoThumb
        className="scroll-autoplay-video-poster"
        id={id}
        alt={posterAlt || title}
        aria-hidden={started ? 'true' : undefined}
      />
      {started && (
        <iframe
          src={youTubeEmbedUrl(id, { autoplay: true, muted: true, playsinline: true })}
          title={title}
          loading="eager"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      )}
    </div>
  );
}
