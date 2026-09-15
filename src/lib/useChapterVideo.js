import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useChapterVideo
 * ---------------
 * Permet aux liens de chapitrage d'un dossier de contrôler directement la
 * vidéo YouTube intégrée dans l'article (au lieu d'ouvrir YouTube dans un
 * nouvel onglet) : un clic sur un chapitre fait défiler la page jusqu'à la
 * vidéo puis lance la lecture au temps sélectionné.
 *
 * Deux stratégies, dans cet ordre :
 *
 *   1. l'API IFrame YouTube, quand elle est disponible : le lecteur est piloté
 *      directement (seekTo + playVideo), sans recharger la vidéo ;
 *   2. le repli automatique, sans aucun script externe : si l'API est bloquée
 *      (adblocker, réseau restreint), trop lente à répondre, ou si la lecture
 *      ne démarre pas, l'embed est rechargé avec ?start=<secondes>&autoplay=1.
 *      YouTube démarre alors de lui-même au temps demandé.
 *
 * Le chapitrage reste donc fonctionnel même quand l'API YouTube n'est pas
 * joignable, au lieu de rester sans réaction.
 *
 * Usage :
 *   const videoRef = useRef(null);
 *   const { seekTo, ready } = useChapterVideo(videoRef);
 *   ...
 *   <div className="dossier-video" ref={videoRef}>
 *     <iframe
 *       src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
 *       allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
 *       allowFullScreen
 *     />
 *   </div>
 *   <button onClick={() => seekTo(389)}>06:29 — Le projet GOYA</button>
 *
 * L'attribut allow de l'iframe doit contenir « autoplay » pour que le repli
 * démarre la lecture sans second clic.
 *
 * À chaque chapitre demandé, le conteneur vidéo reçoit brièvement la classe
 * « chapter-seek », qui déclenche une animation (halo néon + flash) définie
 * dans dossier-article.css. Un loader néon (classe « is-seeking » +
 * .dossier-video-loader) s'affiche pendant la recherche du timestamp et
 * disparaît dès que la lecture redémarre (ou après 6 s max). Les deux
 * animations sont relancées à chaque clic et désactivées si l'utilisateur
 * préfère réduire les animations.
 */

// Délais (en ms) au-delà desquels on considère que l'API ne répond pas : un
// adblocker silencieux ou un réseau qui bloque le script ne doivent pas
// laisser le chapitrage sans réaction.
const API_LOAD_TIMEOUT = 4000; // script iframe_api jamais chargé
const PLAYER_READY_TIMEOUT = 6000; // lecteur jamais utilisable après le montage
const PLAYBACK_START_TIMEOUT = 4000; // clic, puis toujours aucune lecture

// Une recherche manuelle fait-elle autorité quelques secondes : si le seek
// demandé avant le démarrage de la vidéo est toujours "en attente" quand la
// lecture démarre, on le réapplique. Au-delà de ce délai (ou si le lecteur a
// déjà été contrôlé directement par l'utilisateur), on n'applique plus rien.
const PENDING_SEEK_TTL = 15000;

// Charge l'API IFrame de YouTube une seule fois par session. Le chargement est
// abandonné s'il ne répond pas dans le délai imparti, pour laisser la main au
// repli (adblocker, réseau restreint).
let ytApiPromise = null;
function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        callback(value);
      };
      const timeout = setTimeout(
        () => finish(reject, new Error("L'API YouTube ne répond pas")),
        API_LOAD_TIMEOUT
      );
      const previousOnReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previousOnReady === 'function') previousOnReady();
        finish(resolve, window.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => finish(reject, new Error("Impossible de charger l'API YouTube"));
      document.head.appendChild(script);
    });
  }
  return ytApiPromise;
}

// Repli sans script : on recharge l'embed en demandant à YouTube de démarrer la
// lecture au temps voulu. L'iframe est recréée dans son conteneur : réassigner
// la même URL ne garantit pas que le navigateur relance la navigation et honore
// autoplay=1.
function rebuildEmbed(container, template, baseSrc, seconds) {
  if (!container || !template) return null;

  let url;
  try {
    url = new URL(baseSrc || template.getAttribute('src'), window.location.href);
  } catch {
    return null;
  }
  url.searchParams.set('start', String(Math.max(0, Math.floor(Number(seconds) || 0))));
  url.searchParams.set('autoplay', '1');

  // Le gabarit est l'iframe d'origine : on garde ses attributs (title, allow,
  // allowfullscreen) et on repart d'une URL propre, sans start/autoplay
  // accumulés par les clics précédents.
  const fresh = template.cloneNode(false);
  fresh.setAttribute('src', url.toString());

  // L'API YouTube a pu remplacer l'iframe d'origine : on vide le conteneur pour
  // ne pas laisser deux lecteurs superposés.
  Array.from(container.querySelectorAll('iframe')).forEach((iframe) => iframe.remove());
  container.appendChild(fresh);
  return fresh;
}

export default function useChapterVideo(videoRef) {
  const playerRef = useRef(null);
  const templateRef = useRef(null); // iframe d'origine, gabarit du repli
  const baseSrcRef = useRef(null); // son URL d'origine, sans start/autoplay
  const apiReadyRef = useRef(false); // le lecteur de l'API répond
  const fallbackRef = useRef(false); // l'API est inutilisable : repli URL actif
  const pendingSeekRef = useRef(null); // { seconds, at }
  const readyTimerRef = useRef(null);
  const playbackTimerRef = useRef(null);
  const flashTimerRef = useRef(null); // retrait différé de la classe d'animation
  const seekingTimerRef = useRef(null); // sécurité : retire le loader si YouTube ne répond jamais
  const [ready, setReady] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

  const clearTimer = useCallback((timerRef) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    clearTimer(readyTimerRef);
    clearTimer(playbackTimerRef);
    clearTimer(seekingTimerRef);
  }, [clearTimer]);

  // Crée (si besoin) l'overlay de chargement à l'intérieur du conteneur vidéo.
  const ensureLoader = useCallback((container) => {
    if (!container || typeof document === 'undefined') return null;
    let loader = container.querySelector('.dossier-video-loader');
    if (loader) return loader;
    loader = document.createElement('div');
    loader.className = 'dossier-video-loader';
    loader.setAttribute('aria-hidden', 'true');
    loader.innerHTML =
      '<div class="dossier-video-loader-inner"><div class="dossier-video-spinner" aria-hidden="true"></div><span class="dossier-video-loader-text">Chargement…</span></div>';
    container.appendChild(loader);
    return loader;
  }, []);

  const stopSeeking = useCallback(() => {
    const videoEl = videoRef.current;
    if (videoEl && videoEl.classList) {
      videoEl.classList.remove('is-seeking');
    }
    clearTimer(seekingTimerRef);
    setIsSeeking(false);
  }, [videoRef, clearTimer]);

  const startSeeking = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    ensureLoader(videoEl);
    if (videoEl.classList) {
      videoEl.classList.add('is-seeking');
    }
    setIsSeeking(true);
    clearTimer(seekingTimerRef);
    // Filet de sécurité : si YouTube ne déclenche jamais PLAYING (réseau lent,
    // autoplay bloqué), on retire le loader au bout de 6 s.
    seekingTimerRef.current = setTimeout(() => {
      seekingTimerRef.current = null;
      stopSeeking();
    }, 6000);
  }, [videoRef, ensureLoader, clearTimer, stopSeeking]);

  // Recharge l'embed avec ?start=<secondes>&autoplay=1 : la vidéo repart au bon
  // moment, sans dépendre de l'API. Le loader reste visible jusqu'au load de
  // l'iframe (ou jusqu'au timeout de sécurité).
  const seekViaFallback = useCallback(
    (seconds) => {
      const container = videoRef.current;
      const fresh = rebuildEmbed(container, templateRef.current, baseSrcRef.current, seconds);
      if (fresh) {
        const onLoad = () => {
          fresh.removeEventListener('load', onLoad);
          // Petite temporisation pour laisser YouTube afficher la nouvelle frame
          setTimeout(() => stopSeeking(), 350);
        };
        fresh.addEventListener('load', onLoad);
        // Si l'événement load ne se déclenche jamais, le timer de startSeeking
        // nettoiera tout seul au bout de 6 s.
        return true;
      }
      return false;
    },
    [videoRef, stopSeeking]
  );

  // L'API est bloquée, trop lente, ou la lecture ne démarre pas : on bascule sur
  // le repli. Un chapitre déjà demandé entre-temps est appliqué immédiatement.
  const switchToFallback = useCallback(
    (seconds) => {
      if (fallbackRef.current) return;
      clearTimers();
      fallbackRef.current = true;
      apiReadyRef.current = false;
      setReady(true); // le chapitrage reste opérationnel, via l'URL cette fois

      const player = playerRef.current;
      playerRef.current = null;
      if (player) {
        try {
          player.destroy();
        } catch {
          /* le lecteur n'était pas encore prêt */
        }
      }

      const pending = pendingSeekRef.current;
      pendingSeekRef.current = null;
      const target = typeof seconds === 'number' ? seconds : pending ? pending.seconds : null;
      if (target !== null && !seekViaFallback(target)) {
        // Aucun embed à recharger : on rend la main à l'API plutôt que de
        // laisser le chapitrage inerte.
        fallbackRef.current = false;
        setReady(false);
      }
    },
    [clearTimers, seekViaFallback]
  );

  // Surveille le démarrage effectif de la lecture après un clic : si rien ne
  // joue (API muette, lecture bloquée), on bascule sur le repli URL. Si la
  // lecture a bien démarré, on retire le loader.
  const watchPlayback = useCallback(
    (seconds) => {
      clearTimer(playbackTimerRef);
      playbackTimerRef.current = setTimeout(() => {
        playbackTimerRef.current = null;
        if (fallbackRef.current) return;

        const player = playerRef.current;
        let state = -2; // inconnu
        try {
          state = player && typeof player.getPlayerState === 'function' ? player.getPlayerState() : -2;
        } catch {
          state = -2;
        }
        // 1 = en lecture, 2 = en pause (seek appliqué, lecture à confirmer),
        // 3 = mise en mémoire tampon : la lecture a démarré, pas de repli.
        if (state === 1 || state === 2 || state === 3) {
          stopSeeking();
          return;
        }

        switchToFallback(seconds);
      }, PLAYBACK_START_TIMEOUT);
    },
    [clearTimer, switchToFallback, stopSeeking]
  );

  // Fait pulser la vidéo pour signaler visuellement le changement de chapitre.
  // La classe « chapter-seek » déclenche l'animation CSS (halo néon + flash
  // par-dessus le lecteur) puis est retirée une fois l'animation terminée.
  const flashVideo = useCallback(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !videoEl.classList) return;
    clearTimer(flashTimerRef);
    videoEl.classList.remove('chapter-seek');
    // Force le recalcul du style pour relancer l'animation à chaque clic,
    // même quand le précédent n'est pas terminé.
    void videoEl.offsetWidth;
    videoEl.classList.add('chapter-seek');
    // Légèrement au-delà de la durée de l'animation (1,2 s) pour la laisser
    // se terminer avant de nettoyer la classe.
    flashTimerRef.current = setTimeout(() => {
      flashTimerRef.current = null;
      videoEl.classList.remove('chapter-seek');
    }, 1300);
  }, [videoRef, clearTimer]);

  useEffect(() => {
    clearTimers();
    clearTimer(flashTimerRef);
    pendingSeekRef.current = null;
    apiReadyRef.current = false;
    fallbackRef.current = false;
    playerRef.current = null;
    setReady(false);

    const container = videoRef.current;
    let iframe = container ? container.querySelector('iframe') : null;
    if (!iframe && container && templateRef.current && baseSrcRef.current) {
      // Un lecteur détruit lors d'un montage précédent a pu retirer l'iframe.
      iframe = templateRef.current.cloneNode(false);
      iframe.setAttribute('src', baseSrcRef.current);
      container.appendChild(iframe);
    }
    templateRef.current = iframe;
    baseSrcRef.current = iframe ? iframe.getAttribute('src') : null;
    if (!iframe) return undefined;

    let cancelled = false;
    let localPlayer = null;

    // Si l'API n'a pas rendu le lecteur utilisable dans le délai imparti, on
    // passe au repli : le prochain clic rechargera l'embed avec start + autoplay.
    readyTimerRef.current = setTimeout(() => {
      readyTimerRef.current = null;
      if (cancelled || apiReadyRef.current || fallbackRef.current) return;
      switchToFallback();
    }, PLAYER_READY_TIMEOUT);

    const handleReady = () => {
      if (cancelled || fallbackRef.current) return;
      apiReadyRef.current = true;
      clearTimer(readyTimerRef);
      setReady(true);
      if (!pendingSeekRef.current) return;
      // Le lecteur vient d'être prêt : on lance la lecture au temps demandé.
      localPlayer.seekTo(pendingSeekRef.current.seconds, true);
      localPlayer.playVideo();
      watchPlayback(pendingSeekRef.current.seconds);
    };

    const handleStateChange = (event) => {
      if (cancelled || fallbackRef.current) return;

      // Dès que la lecture démarre vraiment, on retire le loader.
      if (event.data === 1) {
        clearTimer(playbackTimerRef);
        stopSeeking();
      }

      // YouTube ignore un seekTo() appelé pendant que la vidéo est au repos
      // (unstarted / cued / ended) : dès que la lecture démarre vraiment, on
      // réapplique le temps sélectionné.
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
    };

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || fallbackRef.current) return;
        if (!YT || !YT.Player) throw new Error('API YouTube indisponible');
        localPlayer = new YT.Player(iframe, {
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: { onReady: handleReady, onStateChange: handleStateChange },
        });
        if (cancelled) {
          try {
            localPlayer.destroy();
          } catch {
            /* lecteur jamais prêt */
          }
          return;
        }
        playerRef.current = localPlayer;
      })
      .catch(() => {
        // API indisponible : le repli prend le relais au prochain chapitre.
        if (!cancelled) switchToFallback();
      });

    return () => {
      cancelled = true;
      clearTimers();
      clearTimer(flashTimerRef);
      stopSeeking();
      apiReadyRef.current = false;
      pendingSeekRef.current = null;
      playerRef.current = null;
      if (localPlayer) {
        try {
          localPlayer.destroy();
        } catch {
          /* le lecteur n'était peut-être pas encore prêt */
        }
      }
    };
  }, [videoRef, clearTimer, clearTimers, switchToFallback, watchPlayback, stopSeeking]);

  const seekTo = useCallback(
    (seconds) => {
      const target = Math.max(0, Number(seconds) || 0);
      const videoEl = videoRef.current;
      if (videoEl && typeof videoEl.scrollIntoView === 'function') {
        videoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      flashVideo();
      startSeeking();

      // API inutilisable : on recharge l'embed avec start + autoplay, sans
      // aucun script externe.
      if (fallbackRef.current) {
        seekViaFallback(target);
        return;
      }

      const player = playerRef.current;
      if (!apiReadyRef.current || !player || typeof player.seekTo !== 'function') {
        // Le lecteur n'est pas encore prêt : on mémorise la demande. Elle sera
        // appliquée dans onReady, ou par le repli si l'API ne répond jamais.
        pendingSeekRef.current = { seconds: target, at: Date.now() };
        return;
      }

      let state = -1;
      try {
        state = player.getPlayerState();
      } catch {
        state = -1;
      }

      pendingSeekRef.current = { seconds: target, at: Date.now() };
      try {
        player.seekTo(target, true);
        player.playVideo();
      } catch {
        switchToFallback(target);
        return;
      }

      // Si la vidéo n'a pas encore démarré (unstarted -1, ended 0, cued 5), le
      // seek peut être perdu : on garde la demande en attente et le handler
      // onStateChange la réappliquera dès la première lecture.
      if (!(state === -1 || state === 0 || state === 5)) pendingSeekRef.current = null;
      watchPlayback(target);
    },
    [videoRef, flashVideo, startSeeking, seekViaFallback, switchToFallback, watchPlayback]
  );

  return { seekTo, ready, isSeeking };
}
