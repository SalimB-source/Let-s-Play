import React, { useEffect, useRef } from 'react';
import { videoEmbedUrl, videoWatchUrl } from '../reviewsData';
import { pauseAllPlayback } from '../lib/videoPlayback';

// Lecteur modal pour la vidéo officielle d'un jeu testé.
// Fermeture : bouton, clic sur le fond ou touche Échap.
export default function VideoModal({ video, title, kicker, watchLabel, closeLabel, onClose }){
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    // La modale arrive avec autoplay=1, mais le navigateur peut refuser la
    // lecture automatique : on coupe d'office les lecteurs derrière la modale.
    pauseAllPlayback();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!video) return null;

  return (
    <div className="video-modal" role="dialog" aria-modal="true" aria-label={`${kicker} — ${title}`} onClick={onClose}>
      <div className="video-modal-box hud-frame" onClick={(e) => e.stopPropagation()}>
        <div className="video-modal-head">
          <div>
            <span className="video-modal-kicker">{kicker}</span>
            <strong>{title}</strong>
          </div>
          <button ref={closeRef} className="video-modal-close" onClick={onClose} aria-label={closeLabel}>✕</button>
        </div>
        <div className="video-modal-player">
          <iframe
            src={videoEmbedUrl(video.id, true)}
            title={`${title} — ${kicker}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className="video-modal-foot">
          <span>{video.label} · {video.channel}</span>
          <a className="arrow-link" href={videoWatchUrl(video.id)} target="_blank" rel="noreferrer">{watchLabel} <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </div>
  );
}
