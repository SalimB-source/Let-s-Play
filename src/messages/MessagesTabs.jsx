import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fill } from '../friends/friendsCopy';
import { formatCommentDate } from '../lib/comments';
import { ProfileIcon } from '../friends/FriendsTabs';
import { describeMessagesError, reasonLabel } from './messagesCopy';
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

function ConversationRow({ entry, t, lang, online, onOpen }) {
  const { profile, lastMessage, unread, lastAt } = entry;
  const preview = lastMessage
    ? `${lastMessage.mine ? '→ ' : ''}${lastMessage.body}`
    : t.noMessageYet;
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

/* --------------------------------- discussion ------------------------------- */

export function ThreadView({ peerId, t, ft, lang, thread, profile, online, blocked, reported, canWrite, onBack, onSend, onDelete, onBlock, onUnblock, onReport }) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const messages = thread?.messages || [];
  const lastMine = [...messages].reverse().find((message) => message.mine) || null;
  const remaining = MESSAGE_MAX_LENGTH - draft.length;

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, peerId]);

  useEffect(() => { setDraft(''); setError(''); setReportOpen(false); setDeletingId(null); }, [peerId]);

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
                    <p className={`messages-bubble${message.mine ? ' is-mine' : ''}`}>{message.body}</p>
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
          <button type="submit" className="messages-send" disabled={busy || !draft.trim() || tooLong} aria-label={t.send} title={t.send}>
            <SendIcon />
            <span className="messages-send-label">{t.send}</span>
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
