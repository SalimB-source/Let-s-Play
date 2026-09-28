import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fill } from '../friends/friendsCopy';
import { formatCommentDate } from '../lib/comments';
import { callBlockLabel } from './callsCopy';
import { describeMessagesError, pseudoLabel, reasonLabel } from './messagesCopy';
import { MESSAGE_MAX_LENGTH, REPORT_REASONS } from './messagesApi';

/**
 * Vues de messagerie — partagées par la fenêtre sociale (bureau) et la page
 * `/messages` (mobile surtout) :
 *
 *   - `InboxView` : la liste des discussions (un ami par ligne, dernier
 *     message, heure, badge des non-lus ; en dessous, les amis sans
 *     discussion et les joueurs bloqués, à débloquer) ;
 *   - `ThreadView` : la discussion ouverte (séparateurs de jour, fil de
 *     bulles, accusé de lecture, champ qui s'agrandit, bouton d'envoi
 *     libellé, accès **Profil**, gestes **Bloquer** / **Signaler** /
 *     **Effacer la conversation pour soi**).
 *
 * Ici, ni la photo ni le nom n'envoient vers le profil : on est déjà dans le
 * chat — le profil a son bouton dédié dans la barre d'outils.
 *
 * Tous les pseudos passent par `pseudoLabel` (majuscules) : lignes de la
 * liste, joueurs bloqués, en-tête de discussion, titres du signalement,
 * confirmations de blocage et d'effacement, infobulles d'appel. La casse d'origine reste
 * intacte dans les données et dans la recherche (`InboxView` compare les
 * pseudos bruts, sans tenir compte de la casse).
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
function PhoneIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.8 3.2c.7-.4 1.6-.2 2 .5l1.6 2.6c.4.6.3 1.4-.3 1.9l-1.2 1.1c-.3.3-.4.7-.2 1 .8 1.5 2.5 3.2 4 4 .3.2.7.1 1-.2l1.1-1.2c.5-.5 1.3-.7 1.9-.3l2.6 1.6c.7.4.9 1.3.5 2l-.9 1.5c-.5.8-1.4 1.2-2.3 1.1C10.9 18.9 5.1 13.1 4.2 6.4c-.1-.9.3-1.8 1.1-2.3l1.5-.9z" />
    </svg>
  );
}
function VideoCallIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="12" height="10" rx="2.5" />
      <path d="M15 11l5.5-3v8L15 13" />
    </svg>
  );
}
function MoreIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
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

/** Aperçu texte d'un message (liste des discussions). */
function messagePreview(message, t) {
  if (!message) return t.noMessageYet;
  return `${message.mine ? '→ ' : ''}${message.body}`;
}

function ConversationRow({ entry, t, lang, online, onOpen }) {
  const { profile, lastMessage, unread, lastAt } = entry;
  const name = pseudoLabel(profile.name);
  const preview = messagePreview(lastMessage, t);
  return (
    <li className={`messages-row${unread > 0 ? ' has-unread' : ''}`}>
      <button
        type="button"
        className="messages-row-main"
        onClick={() => onOpen(entry.peerId)}
        aria-label={`${t.openChat} — ${name}`}
        title={t.openChat}
      >
        <Avatar name={name} src={profile.avatar} online={online} />
        <span className="messages-row-text">
          <span className="messages-row-top">
            <span className="messages-row-name">{name}</span>
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
  const name = pseudoLabel(entry.profile.name);
  return (
    <li className="messages-row is-blocked">
      <span className="messages-row-main messages-row-static">
        <Avatar name={name} src={entry.profile.avatar} online={false} />
        <span className="messages-row-text">
          <span className="messages-row-name">{name}</span>
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

/* --------------------------------- discussion ------------------------------- */

export function ThreadView({
  peerId, t, ft, ct, lang, thread, profile, online, blocked, reported, canWrite,
  onBack, onSend, onDelete, onClear, onBlock, onUnblock, onReport,
  onCall, callBlocker, callWarning,
}) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [clearing, setClearing] = useState(false);
  const currentPeerRef = useRef(peerId);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const moreRef = useRef(null);
  const messages = thread?.messages || [];
  const lastMine = [...messages].reverse().find((message) => message.mine) || null;
  const remaining = MESSAGE_MAX_LENGTH - draft.length;

  // Ferme le menu « … » quand on clique en dehors ou qu'on appuie sur Échap.
  useEffect(() => {
    if (!moreOpen) return undefined;
    const onDoc = (event) => {
      if (event.type === 'keydown') {
        if (event.key === 'Escape') { setMoreOpen(false); return; }
        return;
      }
      if (moreRef.current && !moreRef.current.contains(event.target)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    document.addEventListener('keydown', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onDoc);
    };
  }, [moreOpen]);

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, peerId]);

  useEffect(() => {
    currentPeerRef.current = peerId;
    setDraft(''); setError(''); setReportOpen(false); setMoreOpen(false);
    setDeletingId(null); setClearing(false);
  }, [peerId]);

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
  // Pseudo affiché en majuscules dans toute la discussion (en-tête, infobulles,
  // confirmation de blocage, signalement) — `?` si le profil n'est pas résolu.
  const peerName = pseudoLabel(profile?.name) || '?';

  // Boutons d'appel : `callBlocker` grise le bouton et explique pourquoi ;
  // `callWarning` (ami qui semble hors ligne) n'empêche PAS d'appeler — la
  // présence est une estimation — il complète seulement l'infobulle. Sans
  // aucun des deux, l'infobulle reste le nom de l'action.
  const callBlock = callBlocker?.(peerId) ?? null;
  const callWarn = callWarning?.(peerId) ?? null;
  const callHint = (callBlock || callWarn)
    ? callBlockLabel(callBlock || callWarn, ct, peerName)
    : null;

  const submit = async () => {
    const body = draft.trim();
    if (!body || busy || clearing) return;
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
    if (!message?.mine || clearing) return;
    if (String(message.id).startsWith('pending-')) return;
    const preview = String(message.body || '').slice(0, 40);
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

  const handleClear = async () => {
    if (clearing) return;
    setMoreOpen(false);
    const ok = typeof window === 'undefined'
      || window.confirm(fill(t.clearConfirm, { name: peerName }));
    if (!ok) return;
    setClearing(true);
    setError('');
    try {
      await onClear(peerId);
    } catch (e) {
      if (currentPeerRef.current === peerId) setError(describeMessagesError(e, t));
    } finally {
      if (currentPeerRef.current === peerId) setClearing(false);
    }
  };

  const tooLong = draft.length > MESSAGE_MAX_LENGTH;

  return (
    <>
      <header className="messages-thread-head">
        <button type="button" className="messages-tool messages-tool-back" aria-label={t.back} title={t.back} onClick={onBack}>
          <BackIcon />
        </button>
        {/* Le nom et l'avatar renvoient au profil : c'est le geste naturel
            et ça évite un bouton « Profil » dédié qui encombre la barre. */}
        <Link
          to={`/profile/${encodeURIComponent(peerId)}`}
          className="messages-thread-peer messages-thread-peer-link"
          aria-label={`${t.profile} — ${peerName}`}
          title={t.profile}
        >
          <Avatar name={peerName} src={profile?.avatar} online={online} size={30} />
          <span className="messages-thread-identity">
            <span className="messages-thread-name">{peerName}</span>
            <span className={`messages-thread-status${online ? ' is-online' : ''}`}>{statusText}</span>
          </span>
        </Link>
        <span className="messages-thread-tools" ref={moreRef}>
          {/* Appels vocal / vidéo — grisés avec la raison au survol quand
              l'appel est impossible (aperçu démo, compte absent, joueur
              bloqué, déjà en appel…), avertis sans être grisés quand l'ami
              semble hors ligne, et absents si le module n'est pas monté. */}
          {onCall && ct && (
            <>
              <button
                type="button"
                className="messages-tool is-call"
                disabled={Boolean(callBlock)}
                aria-label={ct.callAudio}
                title={callHint || ct.callAudio}
                onClick={() => onCall(peerId, 'audio')}
              >
                <PhoneIcon />
              </button>
              <button
                type="button"
                className="messages-tool is-call"
                disabled={Boolean(callBlock)}
                aria-label={ct.callVideo}
                title={callHint || ct.callVideo}
                onClick={() => onCall(peerId, 'video')}
              >
                <VideoCallIcon />
              </button>
            </>
          )}
          <div className={`messages-more${moreOpen ? ' is-open' : ''}`}>
            <button
              type="button"
              className="messages-tool messages-tool-more"
              aria-label={t.more}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              title={t.more}
              onClick={() => setMoreOpen((open) => !open)}
            >
              <MoreIcon />
            </button>
            <ul className="messages-more-menu" role="menu" aria-hidden={!moreOpen} inert={!moreOpen}>
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className={`messages-more-item${reported ? ' is-flagged' : ''}`}
                  aria-label={reported ? t.reported : t.report}
                  title={reported ? t.reported : t.report}
                  onClick={() => { setMoreOpen(false); setReportOpen((open) => !open); }}
                >
                  <FlagIcon />
                  <span>{reported ? t.reported : t.report}</span>
                </button>
              </li>
              <li>
                {blocked ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="messages-more-item is-flagged"
                    aria-label={t.unblock}
                    title={t.unblock}
                    onClick={() => { setMoreOpen(false); onUnblock(peerId); }}
                  >
                    <BlockIcon />
                    <span>{t.unblock}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className="messages-more-item messages-more-item-danger"
                    aria-label={t.block}
                    title={t.block}
                    onClick={() => {
                      setMoreOpen(false);
                      const ok = typeof window === 'undefined' || window.confirm(fill(t.blockConfirm, { name: peerName }));
                      if (ok) onBlock(peerId);
                    }}
                  >
                    <BlockIcon />
                    <span>{t.block}</span>
                  </button>
                )}
              </li>
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className="messages-more-item messages-more-item-danger"
                  aria-label={t.clearConversation}
                  title={t.clearConversation}
                  disabled={clearing}
                  onClick={handleClear}
                >
                  <TrashIcon size={14} />
                  <span>{t.clearConversation}</span>
                </button>
              </li>
            </ul>
          </div>
        </span>
      </header>

      {clearing && <p className="messages-clearing-status" role="status">{t.clearingConversation}</p>}

      {reportOpen && (
        <ReportForm
          t={t}
          name={peerName}
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
                    <p className={`messages-bubble${message.mine ? ' is-mine' : ''}`}>{message.body}</p>
                    {message.mine && (
                      <button
                        type="button"
                        className="messages-bubble-delete"
                        aria-label={t.deleteMessage}
                        title={t.deleteMessage}
                        disabled={clearing || deletingId === message.id}
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
          <button type="submit" className="messages-send" disabled={busy || clearing || !draft.trim() || tooLong} aria-label={t.send} title={t.send}>
            <SendIcon />
          </button>
        </form>
      ) : (
        <p className="messages-composer-disabled">{t.notFriends}</p>
      )}
      {tooLong && <p className="messages-inline-error" role="alert">{fill(t.tooLong, { max: MESSAGE_MAX_LENGTH })}</p>}
      {error && <p className="messages-inline-error" role="alert">{error}</p>}
      {!blocked && canWrite && !error && !tooLong && <p className="messages-composer-hint">{t.composerHint}</p>}
    </>
  );
}
