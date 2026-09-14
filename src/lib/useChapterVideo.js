import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useChapterVideo
 * ---------------
 * Permet aux liens de chapitrage d'un dossier de contrôler directement la
 * vidéo YouTube intégrée dans l'article (au lieu d'ouvrir YouTube dans un
 * nouvel onglet) : un clic sur un chapitre fait défiler la page jusqu'à la
 * vidéo puis lance la lecture au temps sélectionné.
 *
 * Usage :
 *   const videoRef = useRef(null);
 *   const { seekTo } = useChapterVideo(videoRef);
 *   ...
 *   <div className="dossier-video" ref={videoRef}>
 *     <iframe src={`https://www.youtube.com/embed/${videoId}?...`} />
 *   </div>
 *   <button onClick={() => seekTo(389)}>06:29 — Le projet GOYA</button>
 */

// Charge l'API IFrame de YouTube une seule fois par session.
let ytApiPromise = null;
function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve, reject) => {
      const previousOnReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previousOnReady === 'function') previousOnReady();
        resolve(window.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => reject(new Error("Impossible de charger l'API YouTube"));
      document.head.appendChild(script);
    });
  }
  return ytApiPromise;
}

// Une recherche manuelle fait-elle autorité quelques secondes : si le seek
// demandé avant le démarrage de la vidéo est toujours "en attente" quand la
// lecture démarre, on le réapplique. Au-delà de ce délai (ou si le lecteur a
// déjà été contrôlé directement par l'utilisateur), on n'applique plus rien.
const PENDING_SEEK_TTL = 15000;

export default function useChapterVideo(videoRef) {
  const playerRef = useRef(null);
  const readyRef = useRef(false);
  const pendingSeekRef = useRef(null); // { seconds, at }
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const videoEl = videoRef.current;
    const iframe = videoEl ? videoEl.querySelector('iframe') : null;
    if (!iframe) return undefined;

    let cancelled = false;
    let localPlayer = null;

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !YT) return;
        localPlayer = new YT.Player(iframe, {
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onReady() {
              if (cancelled) return;
              readyRef.current = true;
              setReady(true);
              if (pendingSeekRef.current) {
                // Le lecteur vient d'être prêt : on lance la lecture au temps
                // demandé. pendingSeek reste posé au cas où le seek initial
                // serait ignoré tant que la vidéo n'a pas démarré.
                localPlayer.seekTo(pendingSeekRef.current.seconds, true);
                localPlayer.playVideo();
              }
            },
            onStateChange(event) {
              // YouTube ignore un seekTo() appelé pendant que la vidéo est au
              // repos (unstarted / cued / ended) : dès que la lecture démarre
              // vraiment, on réapplique le temps sélectionné.
              if (event.data !== 1) return; // 1 = PLAYING
              const pending = pendingSeekRef.current;
              if (!pending) return;
              pendingSeekRef.current = null;
              let current = 0;
              try {
                current = typeof localPlayer.getCurrentTime === 'function' ? localPlayer.getCurrentTime() : 0;
              } catch {
                current = 0;
              }
              const fresh = Date.now() - pending.at <= PENDING_SEEK_TTL;
              if (fresh && Math.abs(current - pending.seconds) > 1.5) {
                localPlayer.seekTo(pending.seconds, true);
              }
            },
          },
        });
        playerRef.current = localPlayer;
      })
      .catch(() => {
        /* API indisponible : la vidéo reste lisible normalement, le chapitrage ne fera qu'afficher la vidéo. */
      });

    return () => {
      cancelled = true;
      readyRef.current = false;
      pendingSeekRef.current = null;
      if (localPlayer) {
        try {
          localPlayer.destroy();
        } catch {
          /* le lecteur n'était peut-être pas encore prêt */
        }
        if (playerRef.current === localPlayer) playerRef.current = null;
      }
    };
  }, [videoRef]);

  const seekTo = useCallback(
    (seconds) => {
      const videoEl = videoRef.current;
      if (videoEl) videoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const player = playerRef.current;
      if (!readyRef.current || !player || typeof player.seekTo !== 'function') {
        // Le lecteur n'est pas encore prêt : on mémorise la demande, elle sera
        // appliquée dans onReady.
        pendingSeekRef.current = { seconds, at: Date.now() };
        return;
      }

      let state = -1;
      try {
        state = player.getPlayerState();
      } catch {
        state = -1;
      }

      player.seekTo(seconds, true);
      player.playVideo();

      // Si la vidéo n'a pas encore démarré (unstarted -1, ended 0, cued 5),
      // le seek peut être perdu : on garde la demande en attente et le handler
      // onStateChange la réappliquera dès la première lecture.
      pendingSeekRef.current =
        state === -1 || state === 0 || state === 5 ? { seconds, at: Date.now() } : null;
    },
    [videoRef]
  );

  return { seekTo, ready };
}
