import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fill } from '../friends/friendsCopy';
import { formatCommentDate } from '../lib/comments';
import { ProfileIcon } from '../friends/FriendsTabs';
import { describeMessagesError, reasonLabel } from './messagesCopy';
import { MESSAGE_MAX_LENGTH, REPORT_REASONS, VOICE_MAX_SECONDS } from './messagesApi';

/**
 * Vues de messagerie — partagées par la fenêtre sociale (bureau) et la page
 * `/messages` (mobile surtout) :
 *
 *   - `InboxView` : la liste des discussions (un ami par ligne, dernier
 *     message, heure, badge des non-lus ; en dessous, les amis sans
 *     discussion et les joueurs bloqués, à débloquer) ;
 *   - `ThreadView` : la discussion ouverte (séparateurs de jour, fil de
 *     bulles, accusé de lecture, champ qui s'agrandit, bouton d'envoi
 *     libellé, accès **Profil** explicite, gestes **Bloquer** /
 *     **Signaler**).
 *
 * Ici, ni la photo ni le nom n'envoient vers le profil : on est déjà dans le
 * chat — le profil a son bouton dédié dans la barre d'outils.
 *
 * Les deux composants sont autonomes (props) : la fenêtre et la page portent
 * l'état, le contexte (`MessagesContext`) fournit les données et les gestes.
 */

function BackIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 5.5L8 12l6.5 6.5" />
    </svg>
  );
}
function SendIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 12l15-7-5.5 7 5.5 7-15-7z" />
    </svg>
  );
}
function BlockIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6.5 17.5l11-11" />
    </svg>
  );
}
function FlagIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 21V4" />
      <path d="M6 4.8h9.5l-1.2 3.4 1.2 3.4H6" />
    </svg>
  );
}
function SearchIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}
function TrashIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M19 7v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  );
}
function MicIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3M9 21h6" />
    </svg>
  );
}
function StopIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}
function PlayIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 4.5v15l13-7.5-13-7.5z" />
    </svg>
  );
}
function PauseIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4.5" width="4" height="15" rx="1" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" />
    </svg>
  );
}

/** `93` → `1:33` ; toujours au moins `0:00`, jamais de décimales. */
function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/** Le navigateur sait-il enregistrer du son (MediaRecorder + micro) ? */
function canRecordVoice() {
  return typeof window !== 'undefined'
    && typeof window.MediaRecorder === 'function'
    && Boolean(window.navigator?.mediaDevices?.getUserMedia);
}

/** Meilleur type MIME supporté par MediaRecorder parmi ceux acceptés côté serveur. */
function pickVoiceMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
  if (typeof window === 'undefined' || typeof window.MediaRecorder?.isTypeSupported !== 'function') return '';
  return candidates.find((type) => window.MediaRecorder.isTypeSupported(type)) || '';
}

function initialsFor(name) {
  const clean = String(name || '').trim();
  return clean ? clean.slice(0, 2).toUpperCase() : '?';
}

/** Séparateur de jour : « Aujourd'hui », « Hier », sinon la date lisible. */
function daySeparator(iso, lang, t) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (diffDays <= 0) return t.today;
  if (diffDays === 1) return t.yesterday;
  const sameYear = date.getFullYear() === now.getFullYear();
  try {
    return date.toLocaleDateString(lang || 'en', sameYear
      ? { weekday: 'long', day: 'numeric', month: 'long' }
      : { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return date.toISOString().slice(0, 10);
  }
}

/** Avatar avec repli sur les initiales si l'image ne charge pas. */
function Avatar({ name, src, online, size = 36 }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [src]);
  return (
    <span className={`messages-avatar${online ? ' is-online' : ''}`} style={{ width: size, height: size }}>
      {src && !broken
        ? <img src={src} alt="" onError={() => setBroken(true)} />
        : <span className="messages-avatar-fallback" aria-hidden="true">{initialsFor(name)}</span>}
      <span className="messages-avatar-dot" aria-hidden="true" />
    </span>
  );
}

function clockTime(iso, lang) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return date.toLocaleTimeString(lang || 'en', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return date.toISOString().slice(11, 16);
  }
}

function SectionTitle({ children, count }) {
  return (
    <h4 className="messages-section-title">
      <span>{children}</span>
      {count != null && <span className="messages-section-count">{count}</span>}
    </h4>
  );
}

/* --------------------------- liste des discussions -------------------------- */

function ChevronIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.5 6l6 6-6 6" />
    </svg>
  );
}

/** Aperçu texte d'un message (liste des discussions) : un vocal se résume à
 * son icône et sa durée, jamais à un corps de texte vide. */
function messagePreview(message, t) {
  if (!message) return t.noMessageYet;
  const body = message.kind === 'voice' ? fill(t.voiceMessagePreview, { duration: formatDuration(message.attachmentDuration) }) : message.body;
  return `${message.mine ? '→ ' : ''}${body}`;
}

function ConversationRow({ entry, t, lang, online, onOpen }) {
  const { profile, lastMessage, unread, lastAt } = entry;
  const preview = messagePreview(lastMessage, t);
  return (
    <li className={`messages-row${unread > 0 ? ' has-unread' : ''}`}>
      <button
        type="button"
        className="messages-row-main"
        onClick={() => onOpen(entry.peerId)}
        aria-label={`${t.openChat} — ${profile.name}`}
        title={t.openChat}
      >
        <Avatar name={profile.name} src={profile.avatar} online={online} />
        <span className="messages-row-text">
          <span className="messages-row-top">
            <span className="messages-row-name">{profile.name}</span>
            {lastAt && <span className="messages-row-time">{formatCommentDate(lastAt, lang)}</span>}
          </span>
          <span className="messages-row-preview">{preview}</span>
        </span>
        <span className="messages-row-side">
          {unread > 0
            ? <span className="messages-unread-badge">{unread}</span>
            : <span className="messages-row-chevron"><ChevronIcon /></span>}
        </span>
      </button>
    </li>
  );
}

function BlockedRow({ entry, t, lang, onUnblock }) {
  return (
    <li className="messages-row is-blocked">
      <span className="messages-row-main messages-row-static">
        <Avatar name={entry.profile.name} src={entry.profile.avatar} online={false} />
        <span className="messages-row-text">
          <span className="messages-row-name">{entry.profile.name}</span>
          <span className="messages-row-preview">{t.blockedNote}</span>
        </span>
      </span>
      <button type="button" className="messages-action messages-action-quiet" onClick={() => onUnblock(entry.peerId)}>
        {t.unblock}
      </button>
    </li>
  );
}

export function InboxView({ t, lang, conversations, blocked, isOnline, onOpen, onUnblock }) {
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const filtered = term
    ? conversations.filter((entry) => String(entry.profile.name || '').toLowerCase().includes(term))
    : conversations;
  const withMessages = filtered.filter((entry) => entry.lastMessage);
  const withoutMessages = filtered.filter((entry) => !entry.lastMessage);

  return (
    <>
      <label className="messages-search">
        <span className="sr-only">{t.searchPlaceholder}</span>
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.searchPlaceholder}
          maxLength={40}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {filtered.length === 0 && blocked.length === 0 && (
        <div className="messages-empty messages-empty-hero">
          <span className="messages-empty-icon" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.5 12.2c0 4-3.8 7.2-8.5 7.2-1 0-2-.15-2.9-.42L4.5 20.5l1.2-3.3C4.3 15.9 3.5 14.1 3.5 12.2 3.5 8.2 7.3 5 12 5s8.5 3.2 8.5 7.2z" />
              <path d="M8.5 11h7M8.5 14h4.5" />
            </svg>
          </span>
          <p>{term ? fill(t.emptySearch, { query: query.trim() }) : t.emptyInbox}</p>
        </div>
      )}
      {withMessages.length > 0 && (
        <>
          <SectionTitle count={withMessages.length}>{t.sectionConversations}</SectionTitle>
          <ul className="messages-list">
            {withMessages.map((entry) => (
              <ConversationRow key={entry.peerId} entry={entry} t={t} lang={lang} online={isOnline(entry.peerId)} onOpen={onOpen} />
            ))}
          </ul>
        </>
      )}
      {withoutMessages.length > 0 && (
        <>
          <SectionTitle count={withoutMessages.length}>{t.sectionFriends}</SectionTitle>
          <ul className="messages-list">
            {withoutMessages.map((entry) => (
              <ConversationRow key={entry.peerId} entry={entry} t={t} lang={lang} online={isOnline(entry.peerId)} onOpen={onOpen} />
            ))}
          </ul>
        </>
      )}
      {blocked.length > 0 && (
        <>
          <SectionTitle count={blocked.length}>{t.sectionBlocked}</SectionTitle>
          <ul className="messages-list">
            {blocked.map((entry) => (
              <BlockedRow key={entry.peerId} entry={entry} t={t} lang={lang} onUnblock={onUnblock} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/* --------------------------------- signalement ------------------------------ */

function ReportForm({ t, name, reported, onSubmit, onClose }) {
  const [reason, setReason] = useState('harassment');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <div className="messages-report" role="dialog" aria-label={fill(t.reportTitle, { name })}>
      <h5 className="messages-report-title">{fill(t.reportTitle, { name })}</h5>
      {reported
        ? <p className="messages-report-thanks">{t.reportThanks}</p>
        : <p className="messages-report-hint">{t.reportHint}</p>}
      <fieldset className="messages-report-reasons">
        {REPORT_REASONS.map((value) => (
          <label key={value} className={`messages-report-reason${reason === value ? ' is-active' : ''}`}>
            <input
              type="radio"
              name="messages-report-reason"
              value={value}
              checked={reason === value}
              onChange={() => setReason(value)}
              disabled={reported}
            />
            <span>{reasonLabel(value, t)}</span>
          </label>
        ))}
      </fieldset>
      {!reported && (
        <>
          <textarea
            className="messages-report-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t.reportNotePlaceholder}
            maxLength={500}
            rows={2}
          />
          {error && <p className="messages-inline-error" role="alert">{error}</p>}
          <div className="messages-report-actions">
            <button
              type="button"
              className="messages-action messages-action-primary"
              disabled={busy}
              onClick={async () => {
                if (busy) return;
                setBusy(true);
                setError('');
                try {
                  await onSubmit(reason, note.trim() || null);
                } catch (e) {
                  setError(describeMessagesError(e, t));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t.reportSend}
            </button>
            <button type="button" className="messages-action messages-action-quiet" onClick={onClose} disabled={busy}>
              {t.reportCancel}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------- message vocal ------------------------------ */

/**
 * Bulle d'un message vocal reçu ou envoyé : bouton lecture/pause, barre de
 * progression, durée. L'URL n'est résolue qu'au premier appui sur « lecture »
 * (`resolveAudioUrl` — signée pour un compte Supabase, immédiate pour une
 * persona de démonstration) : pas un aller-retour par bulle affichée.
 */
function VoiceBubble({ message, t, resolveAudioUrl }) {
  const audioRef = useRef(null);
  const [url, setUrl] = useState(message.attachmentUrl || null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [wantsPlay, setWantsPlay] = useState(false);
  const duration = message.attachmentDuration || 0;

  useEffect(() => {
    setUrl(message.attachmentUrl || null);
    setStatus('idle');
    setPlaying(false);
    setElapsed(0);
    setWantsPlay(false);
  }, [message.id, message.attachmentUrl]);

  useEffect(() => {
    if (wantsPlay && url && audioRef.current) {
      audioRef.current.play().catch(() => setStatus('error'));
      setWantsPlay(false);
    }
  }, [wantsPlay, url]);

  const toggle = async () => {
    if (playing) { audioRef.current?.pause(); return; }
    if (url) { setWantsPlay(true); return; }
    if (typeof resolveAudioUrl !== 'function') { setStatus('error'); return; }
    setStatus('loading');
    try {
      const resolved = await resolveAudioUrl(message);
      if (!resolved) { setStatus('error'); return; }
      setUrl(resolved);
      setWantsPlay(true);
    } catch (e) {
      setStatus('error');
    }
  };

  const shownSeconds = playing || elapsed > 0 ? elapsed : duration;
  const progressPct = duration > 0 ? Math.min(1, elapsed / duration) : 0;

  return (
    <span className={`messages-voice${status === 'error' ? ' is-error' : ''}`}>
      <button
        type="button"
        className="messages-voice-play"
        onClick={toggle}
        disabled={status === 'loading'}
        aria-label={playing ? t.pauseVoice : t.playVoice}
        title={playing ? t.pauseVoice : t.playVoice}
      >
        {status === 'loading' ? <span className="messages-voice-spinner" aria-hidden="true" /> : playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <span className="messages-voice-track" aria-hidden="true">
        <span className="messages-voice-track-fill" style={{ width: `${Math.round(progressPct * 100)}%` }} />
      </span>
      <span className="messages-voice-duration">{formatDuration(shownSeconds)}</span>
      {status === 'error' && <span className="messages-voice-hint">{t.voiceUnavailable}</span>}
      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="none"
          className="sr-only"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setElapsed(0); }}
          onTimeUpdate={(event) => setElapsed(event.currentTarget.currentTime)}
          onError={() => setStatus('error')}
        />
      )}
    </span>
  );
}

/**
 * Barre d'enregistrement / prévisualisation d'un message vocal, affichée à la
 * place du composeur texte pendant tout le cycle (permission → enregistrement
 * → écoute → envoi). `onRecorded(blob, seconds)` envoie le fichier ;
 * l'enregistrement s'arrête tout seul à `VOICE_MAX_SECONDS`.
 */
function VoiceComposer({ t, onRecorded, onCancel }) {
  const [phase, setPhase] = useState('requesting'); // requesting | recording | preview | sending | error
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [errorText, setErrorText] = useState('');
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const discardRef = useRef(false);
  const previewAudioRef = useRef(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };
  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await window.navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        const mimeType = pickVoiceMimeType();
        const recorder = mimeType ? new window.MediaRecorder(stream, { mimeType }) : new window.MediaRecorder(stream);
        chunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.onstop = () => {
          stopStream();
          clearTimer();
          const wasDiscarded = discardRef.current;
          discardRef.current = false;
          const parts = chunksRef.current;
          chunksRef.current = [];
          if (wasDiscarded) return;
          const recordedBlob = new Blob(parts, { type: recorder.mimeType || mimeType || 'audio/webm' });
          if (recordedBlob.size === 0) { onCancel(); return; }
          setBlob(recordedBlob);
          setPreviewUrl(URL.createObjectURL(recordedBlob));
          setPhase('preview');
        };
        recorderRef.current = recorder;
        recorder.start();
        startedAtRef.current = Date.now();
        setPhase('recording');
        timerRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
          setSeconds(elapsed);
          if (elapsed >= VOICE_MAX_SECONDS) recorder.stop();
        }, 250);
      } catch (e) {
        if (!cancelled) { setErrorText(t.micPermissionDenied); setPhase('error'); }
      }
    })();
    return () => {
      cancelled = true;
      clearTimer();
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        discardRef.current = true;
        recorder.ondataavailable = null;
        try { recorder.stop(); } catch (e) { /* déjà arrêté */ }
      }
      stopStream();
    };
    // Un seul cycle d'enregistrement par montage : le composant est
    // démonté / remonté (clé sur peerId) pour en relancer un nouveau.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const stopRecording = () => {
    if (phase !== 'recording') return;
    clearTimer();
    recorderRef.current?.stop();
  };
  const discardRecording = () => {
    if (phase === 'recording') {
      discardRef.current = true;
      clearTimer();
      recorderRef.current?.stop();
    }
    onCancel();
  };
  const togglePreview = () => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (previewPlaying) audio.pause();
    else audio.play().catch(() => {});
  };
  const send = async () => {
    if (!blob || phase === 'sending') return;
    setPhase('sending');
    setErrorText('');
    try {
      await onRecorded(blob, seconds || 1);
    } catch (e) {
      setPhase('preview');
      setErrorText(describeMessagesError(e, t));
    }
  };

  return (
    <div className="messages-voice-composer" role="group" aria-label={t.micRecord}>
      {phase === 'requesting' && (
        <p className="messages-voice-composer-status">{t.micRequesting}</p>
      )}
      {phase === 'error' && (
        <>
          <p className="messages-inline-error" role="alert">{errorText}</p>
          <button type="button" className="messages-action messages-action-quiet" onClick={onCancel}>{t.micCancel}</button>
        </>
      )}
      {phase === 'recording' && (
        <>
          <span className="messages-voice-composer-dot" aria-hidden="true" />
          <span className="messages-voice-composer-time">{formatDuration(seconds)}</span>
          <span className="messages-voice-composer-spacer" />
          <button type="button" className="messages-tool" aria-label={t.micCancel} title={t.micCancel} onClick={discardRecording}>
            <TrashIcon />
          </button>
          <button type="button" className="messages-send" aria-label={t.micStop} title={t.micStop} onClick={stopRecording}>
            <StopIcon />
          </button>
        </>
      )}
      {(phase === 'preview' || phase === 'sending') && (
        <>
          <button
            type="button"
            className="messages-voice-play"
            onClick={togglePreview}
            disabled={phase === 'sending'}
            aria-label={previewPlaying ? t.pauseVoice : t.playVoice}
            title={previewPlaying ? t.pauseVoice : t.playVoice}
          >
            {previewPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <span className="messages-voice-composer-time">{formatDuration(seconds)}</span>
          <span className="messages-voice-composer-spacer" />
          <button type="button" className="messages-tool" aria-label={t.micCancel} title={t.micCancel} onClick={discardRecording} disabled={phase === 'sending'}>
            <TrashIcon />
          </button>
          <button type="button" className="messages-send" aria-label={t.micSend} title={t.micSend} disabled={phase === 'sending'} onClick={send}>
            <SendIcon />
          </button>
          {errorText && <p className="messages-inline-error" role="alert">{errorText}</p>}
          {previewUrl && (
            <audio
              ref={previewAudioRef}
              src={previewUrl}
              preload="none"
              className="sr-only"
              onPlay={() => setPreviewPlaying(true)}
              onPause={() => setPreviewPlaying(false)}
              onEnded={() => setPreviewPlaying(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

/* --------------------------------- discussion ------------------------------- */

export function ThreadView({
  peerId, t, ft, lang, thread, profile, online, blocked, reported, canWrite,
  onBack, onSend, onSendVoice, resolveAudioUrl, onDelete, onBlock, onUnblock, onReport,
}) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const messages = thread?.messages || [];
  const lastMine = [...messages].reverse().find((message) => message.mine) || null;
  const remaining = MESSAGE_MAX_LENGTH - draft.length;

  // Le support de l'enregistrement dépend du navigateur : vérifié après le
  // montage seulement, pour que le rendu serveur et le premier rendu client
  // restent identiques (pas de bouton micro tant qu'on ne sait pas).
  useEffect(() => { setVoiceSupported(canRecordVoice()); }, []);

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, peerId]);

  useEffect(() => { setDraft(''); setError(''); setReportOpen(false); setDeletingId(null); setIsRecording(false); }, [peerId]);

  // Bureau : le champ prend le focus à l'ouverture de la discussion — on
  // peut écrire tout de suite. Pas sur mobile, pour ne pas faire sortir le
  // clavier tactile sans geste du joueur.
  useEffect(() => {
    if (typeof window === 'undefined' || blocked || !canWrite) return;
    const fine = typeof window.matchMedia === 'function'
      && window.matchMedia('(min-width: 761px) and (pointer: fine)').matches;
    if (fine) inputRef.current?.focus();
  }, [peerId, blocked, canWrite]);

  // Le champ s'agrandit avec le message (jusqu'à ~5 lignes), puis défile.
  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, 120)}px`;
  }, [draft, peerId]);

  const statusText = online
    ? ft.onlineShort
    : (profile?.lastSeenAt ? fill(ft.lastSeen, { when: formatCommentDate(profile.lastSeenAt, lang) }) : ft.offlineShort);

  const submit = async () => {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setError('');
    try {
      await onSend(peerId, body);
      setDraft('');
    } catch (e) {
      setError(describeMessagesError(e, t));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (message) => {
    if (!message?.mine) return;
    if (String(message.id).startsWith('pending-')) return;
    const preview = message.kind === 'voice' ? t.voiceMessage : String(message.body || '').slice(0, 40);
    const ok = typeof window === 'undefined' || window.confirm(fill(t.deleteConfirm, { preview: preview || '…' }));
    if (!ok) return;
    setDeletingId(message.id);
    setError('');
    try {
      await onDelete(peerId, message.id);
    } catch (e) {
      setError(describeMessagesError(e, t));
    } finally {
      setDeletingId(null);
    }
  };

  const tooLong = draft.length > MESSAGE_MAX_LENGTH;

  return (
    <>
      <header className="messages-thread-head">
        <button type="button" className="messages-tool" aria-label={t.back} title={t.back} onClick={onBack}>
          <BackIcon />
        </button>
        {/* Ni la photo ni le nom ne renvoient au profil : on est déjà dans le
            chat avec lui. Le profil reste accessible via le bouton dédié des
            outils (à droite). */}
        <div className="messages-thread-peer">
          <Avatar name={profile?.name} src={profile?.avatar} online={online} size={30} />
          <span className="messages-thread-identity">
            <span className="messages-thread-name">{profile?.name}</span>
            <span className={`messages-thread-status${online ? ' is-online' : ''}`}>{statusText}</span>
          </span>
        </div>
        <span className="messages-thread-tools">
          <Link
            to={`/profile/${encodeURIComponent(peerId)}`}
            className="messages-tool messages-tool-profile"
            aria-label={`${t.profile} — ${profile?.name || '?'}`}
            title={t.profile}
          >
            <ProfileIcon size={12} />
            <span className="messages-tool-profile-label">{t.profile}</span>
          </Link>
          <button
            type="button"
            className={`messages-tool${reported ? ' is-flagged' : ''}`}
            aria-label={reported ? t.reported : t.report}
            title={reported ? t.reported : t.report}
            aria-pressed={reportOpen}
            onClick={() => setReportOpen((open) => !open)}
          >
            <FlagIcon />
          </button>
          {blocked
            ? (
              <button type="button" className="messages-tool is-flagged" aria-label={t.unblock} title={t.unblock} onClick={() => onUnblock(peerId)}>
                <BlockIcon />
              </button>
            )
            : (
              <button
                type="button"
                className="messages-tool"
                aria-label={t.block}
                title={t.block}
                onClick={() => {
                  const ok = typeof window === 'undefined' || window.confirm(fill(t.blockConfirm, { name: profile?.name || '?' }));
                  if (ok) onBlock(peerId);
                }}
              >
                <BlockIcon />
              </button>
            )}
        </span>
      </header>

      {reportOpen && (
        <ReportForm
          t={t}
          name={profile?.name || '?'}
          reported={Boolean(reported)}
          onSubmit={onReport}
          onClose={() => setReportOpen(false)}
        />
      )}

      {blocked && (
        <p className="messages-blocked-banner">
          {t.blockedBanner}
          <button type="button" className="messages-link" onClick={() => onUnblock(peerId)}>{t.unblock}</button>
        </p>
      )}

      <div className="messages-thread" ref={listRef}>
        {messages.length === 0 && <p className="messages-empty messages-empty-small">{t.emptyThread}</p>}
        <ul className="messages-bubbles">
          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const label = daySeparator(message.createdAt, lang, t);
            const showDay = label && (!previous || daySeparator(previous.createdAt, lang, t) !== label);
            return (
              <React.Fragment key={message.id}>
                {showDay && <li className="messages-day" aria-hidden="true"><span>{label}</span></li>}
                <li className={`messages-bubble-row${message.mine ? ' is-mine' : ''}`}>
                  <div className="messages-bubble-wrap">
                    {message.kind === 'voice' ? (
                      <div className={`messages-bubble messages-bubble-voice${message.mine ? ' is-mine' : ''}`}>
                        <VoiceBubble message={message} t={t} resolveAudioUrl={resolveAudioUrl} />
                      </div>
                    ) : (
                      <p className={`messages-bubble${message.mine ? ' is-mine' : ''}`}>{message.body}</p>
                    )}
                    {message.mine && (
                      <button
                        type="button"
                        className="messages-bubble-delete"
                        aria-label={t.deleteMessage}
                        title={t.deleteMessage}
                        disabled={deletingId === message.id}
                        onClick={() => handleDelete(message)}
                      >
                        <TrashIcon size={12} />
                      </button>
                    )}
                  </div>
                  <span className="messages-bubble-time">
                    {clockTime(message.createdAt, lang)}
                    {message.mine && message === lastMine && <em className="messages-bubble-read">{message.read ? t.seen : t.sent}</em>}
                    {deletingId === message.id && <em className="messages-bubble-read">{t.deleting}</em>}
                  </span>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      </div>

      {blocked ? (
        <p className="messages-composer-disabled">{t.blockedNote}</p>
      ) : canWrite ? (
        isRecording ? (
          <VoiceComposer
            t={t}
            onCancel={() => setIsRecording(false)}
            onRecorded={async (blob, seconds) => {
              await onSendVoice(peerId, blob, seconds);
              setIsRecording(false);
            }}
          />
        ) : (
          <form
            className="messages-composer"
            onSubmit={(event) => { event.preventDefault(); submit(); }}
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder={t.composerPlaceholder}
              rows={1}
              maxLength={MESSAGE_MAX_LENGTH + 20}
              aria-label={t.composerPlaceholder}
            />
            {remaining <= 60 && (
              <span className={`messages-char-count${remaining < 0 ? ' is-over' : ''}`} aria-live="polite">
                {remaining}
              </span>
            )}
            {voiceSupported && typeof onSendVoice === 'function' && !draft.trim() ? (
              <button
                type="button"
                className="messages-send messages-send-mic"
                disabled={busy}
                aria-label={t.micRecord}
                title={t.micRecord}
                onClick={() => setIsRecording(true)}
              >
                <MicIcon />
              </button>
            ) : (
              <button type="submit" className="messages-send" disabled={busy || !draft.trim() || tooLong} aria-label={t.send} title={t.send}>
                <SendIcon />
                <span className="messages-send-label">{t.send}</span>
              </button>
            )}
          </form>
        )
      ) : (
        <p className="messages-composer-disabled">{t.notFriends}</p>
      )}
      {tooLong && <p className="messages-inline-error" role="alert">{fill(t.tooLong, { max: MESSAGE_MAX_LENGTH })}</p>}
      {error && <p className="messages-inline-error" role="alert">{error}</p>}
      {!blocked && canWrite && !error && !tooLong && !isRecording && <p className="messages-composer-hint">{t.composerHint}</p>}
    </>
  );
}
