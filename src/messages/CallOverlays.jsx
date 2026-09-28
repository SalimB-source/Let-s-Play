import React, { useEffect, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useCalls } from './CallsContext';
import { callStatusLabel, callsText } from './callsCopy';
import { pseudoLabel } from './messagesCopy';
import { formatDuration, remotePlaybackNeedsSink } from './callsCore';

/**
 * Interface des appels vocaux / vidéo.
 * -----------------------------------
 * Deux surfaces, rendues par le contexte (un seul appel à la fois) et
 * montées une seule fois dans l'application, au-dessus de tout :
 *
 *   - **appel entrant** : une carte centrée (avatar en « sonnerie », sorte
 *     d'appel, pseudo de l'ami) avec deux gestes — Répondre / Refuser ;
 *   - **panneau d'appel** (sortant, connexion, actif, fini) : plein écran,
 *     la vidéo de l'ami en grand, la nôtre en incrustation (miroir, comme
 *     dans un vrai téléphone), le chrono, l'état en toutes lettres et les
 *     contrôles : micro, caméra, changement de caméra, raccrocher.
 *
 * Le visuel est celui d'un **HUD de jeu** (équerres néon, radar de sonnerie,
 * LED d'état, chrono Orbitron, scanlines sur la vidéo, égaliseur en dégradé)
 * — tout le style vit dans `calls.css`, y compris les éléments décoratifs
 * ci-dessous (`calls-radar`, `calls-led`, `calls-signal`), qui sont toujours
 * `aria-hidden` : l'accessible reste le texte (libellé, pseudo, état, chrono).
 *
 * Aucune donnée ici : tout vient de `useCalls()`. Les textes suivent la
 * langue du site (EN / FR / AR) et le pseudo de l'ami s'affiche en majuscules,
 * comme partout dans la messagerie (`pseudoLabel`).
 */

function PhoneIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.8 3.2c.7-.4 1.6-.2 2 .5l1.6 2.6c.4.6.3 1.4-.3 1.9l-1.2 1.1c-.3.3-.4.7-.2 1 .8 1.5 2.5 3.2 4 4 .3.2.7.1 1-.2l1.1-1.2c.5-.5 1.3-.7 1.9-.3l2.6 1.6c.7.4.9 1.3.5 2l-.9 1.5c-.5.8-1.4 1.2-2.3 1.1C10.9 18.9 5.1 13.1 4.2 6.4c-.1-.9.3-1.8 1.1-2.3l1.5-.9z" />
    </svg>
  );
}

function HangUpIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 9c-3.6 0-7 .9-9.7 2.6-.6.4-.8 1.2-.4 1.8l1.5 2.2c.4.6 1.2.8 1.8.4 2-1.1 4.3-1.7 6.8-1.7s4.8.6 6.8 1.7c.6.4 1.4.2 1.8-.4l1.5-2.2c.4-.6.2-1.4-.4-1.8C19 9.9 15.6 9 12 9z" />
    </svg>
  );
}

function MicIcon({ size = 20, off = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3" />
      {off && <path d="M4.5 4l15 16" />}
    </svg>
  );
}

function CamIcon({ size = 20, off = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="12" height="10" rx="2.5" />
      <path d="M15 11l5.5-3v8L15 13" />
      {off && <path d="M4 3.5l16 17" />}
    </svg>
  );
}

function FlipIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9a8 8 0 0 1 14-3.5" />
      <path d="M18 2v4h-4" />
      <path d="M20 15a8 8 0 0 1-14 3.5" />
      <path d="M6 22v-4h4" />
    </svg>
  );
}

function CloseIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function initialsFor(name) {
  const clean = String(name || '').trim();
  return clean ? clean.slice(0, 2).toUpperCase() : '?';
}

/** Avatar avec repli sur les initiales — le même esprit que la messagerie. */
function CallAvatar({ name, src, size = 92 }) {
  return (
    <span className="calls-avatar" style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
        : <span className="calls-avatar-fallback" aria-hidden="true">{initialsFor(name)}</span>}
    </span>
  );
}

/**
 * Branche un MediaStream sur un `<video>` — avec un `play()` FIABLE.
 *
 * C'était le point qui laissait l'écran noir ou muet : le son WebRTC ne sort
 * que si un élément média le joue, et le premier `play()` est souvent rejeté
 * — lecture exigée après un geste utilisateur (geste déjà consommé par le
 * clic « Répondre », surtout dans la WebView Android), médias pas encore
 * chargés — et l'ancien code avalait le rejet pour toujours. Désormais :
 *
 *   - `muted` est forcé en propriété (React ne la met pas toujours à jour) ;
 *   - `play()` est relancé dès que des données arrivent (`canplay`,
 *     `loadedmetadata`) ou qu'une piste se débloque (`unmute`) ;
 *   - il est relancé sur chaque geste du joueur (n'importe quel clic) — le
 *     déblocage que réclame la WebView arrive souvent juste après ;
 *   - entre les deux, quelques relances espacées couvrent les politiques
 *     d'autoplay qui lèvent le blocage d'elles-mêmes.
 */
function Stream({ stream, muted = false, className = '', mirrored = false, label }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    node.muted = muted;
    node.defaultMuted = muted;
    if (!muted) node.volume = 1;
    node.setAttribute('playsinline', 'true');
    node.setAttribute('webkit-playsinline', 'true');
    if (node.srcObject !== (stream || null)) node.srcObject = stream || null;
    if (!stream) return undefined;

    let cancelled = false;
    let timer = null;
    let retries = 0;
    const MAX_AUTO_RETRIES = 12;
    const attempt = () => {
      if (cancelled) return;
      const playing = node.play?.();
      if (!playing || typeof playing.catch !== 'function') return;
      playing.then(() => {
        clearTimeout(timer);
      }).catch(() => {
        if (cancelled) return;
        if (retries < MAX_AUTO_RETRIES) {
          retries += 1;
          clearTimeout(timer);
          timer = setTimeout(attempt, 300 * retries);
        }
        // Au-delà, les gestes et `unmute` gardent une chance de relancer la
        // lecture — on n'abandonne jamais tout à fait.
      });
    };
    const onReady = () => attempt();
    const onGesture = () => attempt();
    attempt();
    node.addEventListener('loadedmetadata', onReady);
    node.addEventListener('canplay', onReady);
    const tracks = [
      ...(stream?.getAudioTracks?.() || []),
      ...(stream?.getVideoTracks?.() || []),
    ];
    for (const track of tracks) track.addEventListener?.('unmute', onReady);
    window.addEventListener('pointerdown', onGesture, true);
    window.addEventListener('touchstart', onGesture, true);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      node.removeEventListener('loadedmetadata', onReady);
      node.removeEventListener('canplay', onReady);
      for (const track of tracks) track.removeEventListener?.('unmute', onReady);
      window.removeEventListener('pointerdown', onGesture, true);
      window.removeEventListener('touchstart', onGesture, true);
      node.srcObject = null;
    };
  }, [stream, muted]);
  return (
    <video
      ref={ref}
      className={`${className}${mirrored ? ' is-mirrored' : ''}`}
      autoPlay
      playsInline
      muted={muted}
      aria-label={label}
    />
  );
}

/* ------------------------------- appel entrant ------------------------------ */

function IncomingCall({ calls, t }) {
  const { peer, kind, acceptCall, declineCall } = calls;
  const isVideo = kind === 'video';
  const peerName = pseudoLabel(peer?.name); // pseudo en majuscules, comme la messagerie
  return (
    <div className={`calls-backdrop is-incoming${isVideo ? ' is-video' : ''}`}>
      <section className="calls-card calls-frame" role="dialog" aria-modal="true" aria-label={isVideo ? t.incomingVideo : t.incomingAudio}>
        <span className="calls-card-kicker">{isVideo ? t.incomingVideo : t.incomingAudio}</span>
        <span className="calls-ringing-avatar">
          <span className="calls-ring calls-ring-a" aria-hidden="true" />
          <span className="calls-ring calls-ring-b" aria-hidden="true" />
          <span className="calls-radar" aria-hidden="true" />
          <CallAvatar name={peerName} src={peer?.avatar} />
        </span>
        <strong className="calls-card-name">{peerName}</strong>
        <p className="calls-card-status" aria-live="polite">{isVideo ? t.incomingVideo : t.incomingAudio}…</p>
        <div className="calls-card-actions">
          <button
            type="button"
            className="calls-round is-decline"
            onClick={declineCall}
            aria-label={t.decline}
            title={t.decline}
          >
            <HangUpIcon size={22} />
          </button>
          <button
            type="button"
            className="calls-round is-accept"
            onClick={acceptCall}
            aria-label={t.accept}
            title={t.accept}
          >
            <PhoneIcon size={22} />
          </button>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------ panneau d'appel ----------------------------- */

function ActiveCall({ calls, t }) {
  const {
    phase, kind, peer, micOn, camOn, cameraFallback, connected, elapsedMs, endReason, endDetail,
    localStream, remoteStream, endCall, toggleMic, toggleCam, flipCamera,
  } = calls;
  const isVideo = kind === 'video';
  const peerName = pseudoLabel(peer?.name); // pseudo en majuscules, comme la messagerie
  const localVideo = isVideo && Boolean(localStream?.getVideoTracks?.().length);
  const remoteVideo = isVideo && Boolean(remoteStream?.getVideoTracks?.().some((track) => track.readyState !== 'ended'));
  // Appel vocal (ou vidéo sans image distante) : le `<video>` ci-dessus n'est
  // pas monté, donc il ne joue pas le son. Sans ce lecteur, le chrono tourne
  // et personne n'entend l'ami — alors que l'appel vidéo, lui, s'entend.
  const sinkRemoteAudio = phase !== 'ended' && Boolean(remoteStream) && remotePlaybackNeedsSink(remoteVideo);
  const status = callStatusLabel(t, { phase, kind, endReason });
  const timer = phase === 'active' && connected ? formatDuration(elapsedMs) : '';

  return (
    <div className={`calls-backdrop is-${phase}${isVideo ? ' is-video' : ''}`}>
      <section className={`calls-panel calls-frame is-${phase}`} role="dialog" aria-modal="true" aria-label={isVideo ? t.callVideo : t.callAudio}>
        <header className="calls-head">
          <span className="calls-kicker">{isVideo ? t.callVideo : t.callAudio}</span>
          <strong className="calls-name">{peerName}</strong>
          <span className="calls-status" aria-live="polite">
            <i className={`calls-led is-${phase}`} aria-hidden="true" />
            {timer ? <em className="calls-timer">{timer}</em> : status}
          </span>
          {cameraFallback && phase !== 'ended' && (
            <span className="calls-fallback" role="status">{t.cameraFallback}</span>
          )}
          {endDetail && <span className="calls-error" role="alert">{endDetail}</span>}
        </header>

        <div className="calls-stage">
          {phase !== 'ended' && remoteVideo && (
            <Stream stream={remoteStream} className="calls-remote" label={peerName || t.callAudio} />
          )}
          {sinkRemoteAudio && (
            <Stream stream={remoteStream} className="calls-remote calls-remote-audio" label={peerName || t.callAudio} />
          )}
          {!remoteVideo && (
            <div className="calls-stage-audio" aria-hidden="true">
              <span className={`calls-stage-avatar${phase === 'active' ? ' is-live' : ''}`}>
                <span className="calls-radar" aria-hidden="true" />
                <CallAvatar name={peerName} src={peer?.avatar} />
              </span>
              <span className="calls-eq" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></span>
              <span className="calls-signal" aria-hidden="true"><i /><i /><i /><i /></span>
            </div>
          )}
          {localVideo && phase !== 'ended' && (
            <span className="calls-pip">
              <Stream stream={localStream} muted className="calls-pip-video" mirrored label={t.localYou} />
              <span className="calls-pip-label">{t.localYou}</span>
            </span>
          )}
        </div>

        {phase !== 'ended' && (
          <footer className="calls-controls">
            <button
              type="button"
              className={`calls-round${micOn ? '' : ' is-off'}`}
              onClick={toggleMic}
              disabled={!localStream}
              aria-pressed={!micOn}
              aria-label={micOn ? t.micOn : t.micOff}
              title={micOn ? t.micOn : t.micOff}
            >
              <MicIcon off={!micOn} />
            </button>
            {isVideo && (
              <>
                <button
                  type="button"
                  className={`calls-round${camOn ? '' : ' is-off'}`}
                  onClick={toggleCam}
                  disabled={!localStream}
                  aria-pressed={!camOn}
                  aria-label={camOn ? t.camOn : t.camOff}
                  title={camOn ? t.camOn : t.camOff}
                >
                  <CamIcon off={!camOn} />
                </button>
                <button
                  type="button"
                  className="calls-round is-flip"
                  onClick={flipCamera}
                  disabled={!localStream}
                  aria-label={t.flipCamera}
                  title={t.flipCamera}
                >
                  <FlipIcon />
                </button>
              </>
            )}
            <button
              type="button"
              className="calls-round is-hangup"
              onClick={endCall}
              aria-label={t.hangUp}
              title={t.hangUp}
            >
              <HangUpIcon />
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}

/* -------------------------------- avertissement ------------------------------ */

/**
 * Bandeau court expliquant pourquoi un appel n'a pas abouti (bouton
 * indisponible, micro refusé, connexion pair-à-pair impossible sans relais
 * TURN…). Sans lui, un échec ne laisse qu'un silence à l'écran.
 */
function CallNotice({ calls }) {
  return (
    <div className="calls-notice" role="status" aria-live="polite">
      <span className="calls-notice-text">{calls.notice}</span>
      <button type="button" className="calls-notice-close" onClick={calls.dismissNotice} aria-label="Fermer">
        <CloseIcon size={12} />
      </button>
    </div>
  );
}

/* --------------------------------- aiguillage -------------------------------- */

export default function CallOverlays() {
  const calls = useCalls();
  const { lang } = useLanguage();
  const t = callsText(lang);

  let surface = null;
  if (calls.phase === 'incoming') surface = <IncomingCall calls={calls} t={t} />;
  else if (calls.phase !== 'idle') surface = <ActiveCall calls={calls} t={t} />;

  return (
    <>
      {calls.notice ? <CallNotice calls={calls} /> : null}
      {surface}
    </>
  );
}
