import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useFriends } from '../friends/FriendsContext';
import { fill, friendsText } from '../friends/friendsCopy';
import { formatCommentDate } from '../lib/comments';
import { useMessages } from './MessagesContext';
import { describeMessagesError, messagesText, reasonLabel } from './messagesCopy';
import { MESSAGE_MAX_LENGTH, REPORT_REASONS } from './messagesApi';

/**
 * Fenêtre de messagerie — ancrée en bas à gauche (en bas à droite en arabe),
 * de l'autre côté de la fenêtre d'amis.
 * ---------------------------------------------------------------------------
 * Un lanceur compact (« MESSAGES », pastille des non-lus) ouvre un panneau à
 * deux niveaux :
 *
 *   - la **liste des discussions** : un ami par ligne, dernier message, heure,
 *     badge des non-lus ; en dessous, les amis sans discussion et les joueurs
 *     bloqués (à débloquer) ;
 *   - la **discussion** ouverte : fil de bulles, accusé de lecture, champ de
 *     saisie, et les gestes **Bloquer** / **Signaler** dans l'en-tête.
 *
 * Visible uniquement pour un joueur connecté (compte ou persona de démo) : on
 * n'écrit qu'à ses amis. L'état ouvert/fermé et la discussion en cours sont
 * mémorisés sur l'appareil ; Échap remonte d'un niveau puis ferme.
 */

function ChatIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 12.2c0 4-3.8 7.2-8.5 7.2-1 0-2-.15-2.9-.42L4.5 20.5l1.2-3.3C4.3 15.9 3.5 14.1 3.5 12.2 3.5 8.2 7.3 5 12 5s8.5 3.2 8.5 7.2z" />
      <path d="M8.6 12.2h.01M12 12.2h.01M15.4 12.2h.01" />
    </svg>
  );
}
function BackIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 5.5L8 12l6.5 6.5" />
    </svg>
  );
}
function CloseIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function RefreshIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v5h-5" />
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
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

function ConversationRow({ entry, t, lang, online, onOpen }) {
  const { profile, lastMessage, unread, lastAt } = entry;
  const preview = lastMessage
    ? `${lastMessage.mine ? '→ ' : ''}${lastMessage.body}`
    : t.noMessageYet;
  return (
    <li className={`messages-row${unread > 0 ? ' has-unread' : ''}`}>
      <button type="button" className="messages-row-main" onClick={() => onOpen(entry.peerId)}>
        <Avatar name={profile.name} src={profile.avatar} online={online} />
        <span className="messages-row-text">
          <span className="messages-row-name">{profile.name}</span>
          <span className="messages-row-preview">{preview}</span>
        </span>
        <span className="messages-row-side">
          {lastAt && <span className="messages-row-time">{formatCommentDate(lastAt, lang)}</span>}
          {unread > 0 && <span className="messages-unread-badge">{unread}</span>}
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

function InboxView({ t, lang, conversations, blocked, isOnline, onOpen, onUnblock }) {
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
        <p className="messages-empty">{term ? fill(t.emptySearch, { query: query.trim() }) : t.emptyInbox}</p>
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

function ThreadView({ peerId, t, ft, lang, thread, profile, online, blocked, reported, canWrite, onBack, onSend, onDelete, onBlock, onUnblock, onReport }) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const messages = thread?.messages || [];
  const lastMine = [...messages].reverse().find((message) => message.mine) || null;

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, peerId]);

  useEffect(() => { setDraft(''); setError(''); setReportOpen(false); setDeletingId(null); }, [peerId]);

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
        <Link to={`/profile/${encodeURIComponent(peerId)}`} className="messages-thread-peer">
          <Avatar name={profile?.name} src={profile?.avatar} online={online} size={30} />
          <span className="messages-thread-identity">
            <span className="messages-thread-name">{profile?.name}</span>
            <span className={`messages-thread-status${online ? ' is-online' : ''}`}>{statusText}</span>
          </span>
        </Link>
        <span className="messages-thread-tools">
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
          {messages.map((message) => (
            <li key={message.id} className={`messages-bubble-row${message.mine ? ' is-mine' : ''}`}>
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
          ))}
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
          <button type="submit" className="messages-send" disabled={busy || !draft.trim() || tooLong} aria-label={t.send} title={t.send}>
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

/* ----------------------------------- dock ---------------------------------- */

export default function MessagesDock() {
  const messages = useMessages();
  const friends = useFriends();
  const { lang } = useLanguage();
  const t = messagesText(lang);
  const ft = friendsText(lang);
  const {
    enabled, mode, status, error,
    conversations, blockedConversations, unreadTotal, unreadFor, threadFor,
    dockOpen, activePeerId, openThread, backToInbox, closeDock, toggleDock,
    send, deleteMessage, markRead, block, unblock, report, canMessage, isBlocked, reportedReason, refresh,
  } = messages;

  // Classes sur <body> : messages.css les utilise pour la place prise par le
  // lanceur (côté opposé à la fenêtre d'amis).
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const { classList } = document.body;
    if (enabled) classList.add('has-messages-dock'); else classList.remove('has-messages-dock');
    if (enabled && dockOpen) classList.add('messages-dock-open'); else classList.remove('messages-dock-open');
    return () => {
      classList.remove('has-messages-dock');
      classList.remove('messages-dock-open');
    };
  }, [enabled, dockOpen]);

  // Échap : remonte à la liste, puis ferme le panneau.
  useEffect(() => {
    if (!dockOpen || typeof document === 'undefined') return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (activePeerId) backToInbox();
      else closeDock();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dockOpen, activePeerId, backToInbox, closeDock]);

  // Discussion ouverte : les messages reçus passent en lus tout de suite.
  const activeUnread = activePeerId ? unreadFor(activePeerId) : 0;
  useEffect(() => {
    if (dockOpen && activePeerId && activeUnread > 0) markRead(activePeerId);
  }, [dockOpen, activePeerId, activeUnread, markRead]);

  const [refreshing, setRefreshing] = useState(false);
  const subtitle = useMemo(() => (
    conversations.length > 0 || unreadTotal > 0
      ? fill(t.subtitle, { unread: unreadTotal, threads: conversations.length })
      : t.subtitleNone
  ), [t, conversations.length, unreadTotal]);

  if (!enabled) return null;

  const peerProfile = activePeerId ? friends.profileFor(activePeerId) : null;
  const activeEntry = activePeerId
    ? (conversations.find((entry) => entry.peerId === activePeerId)
      || blockedConversations.find((entry) => entry.peerId === activePeerId))
    : null;
  const resolvedProfile = activeEntry?.profile || peerProfile || { id: activePeerId, name: String(activePeerId || '').slice(0, 8), avatar: null };

  let body;
  if (status === 'unavailable') {
    body = <p className="messages-empty messages-unavailable">{t.unavailable}</p>;
  } else if (status === 'error' && conversations.length === 0) {
    body = (
      <div className="messages-empty">
        <p className="messages-inline-error" role="alert">{describeMessagesError(error, t)}</p>
        <button type="button" className="messages-action messages-action-primary" onClick={() => refresh()}>{t.refresh}</button>
      </div>
    );
  } else if (activePeerId) {
    body = (
      <ThreadView
        peerId={activePeerId}
        t={t}
        ft={ft}
        lang={lang}
        thread={threadFor(activePeerId)}
        profile={resolvedProfile}
        online={friends.isOnline(activePeerId)}
        blocked={isBlocked(activePeerId)}
        reported={reportedReason(activePeerId)}
        canWrite={canMessage(activePeerId)}
        onBack={backToInbox}
        onSend={send}
        onDelete={deleteMessage}
        onBlock={block}
        onUnblock={unblock}
        onReport={(reason, note) => report(activePeerId, reason, note)}
      />
    );
  } else {
    body = (
      <InboxView
        t={t}
        lang={lang}
        conversations={conversations}
        blocked={blockedConversations}
        isOnline={friends.isOnline}
        onOpen={openThread}
        onUnblock={unblock}
      />
    );
  }

  return (
    <div className={`messages-dock${dockOpen ? ' is-open' : ''}`}>
      {dockOpen && (
        <section className="messages-panel" role="dialog" aria-label={t.title} aria-modal="false">
          {!activePeerId && (
            <header className="messages-panel-head">
              <div className="messages-panel-title">
                <span className="messages-panel-kicker"><ChatIcon size={14} /> {t.title}</span>
                <span className="messages-panel-sub">{subtitle}</span>
              </div>
              <div className="messages-panel-tools">
                <button
                  type="button"
                  className={`messages-tool${refreshing ? ' is-spinning' : ''}`}
                  aria-label={t.refresh}
                  title={t.refresh}
                  disabled={refreshing}
                  onClick={async () => {
                    setRefreshing(true);
                    try { await refresh(); } finally { setTimeout(() => setRefreshing(false), 500); }
                  }}
                >
                  <RefreshIcon />
                </button>
                <button type="button" className="messages-tool" aria-label={t.close} title={t.close} onClick={closeDock}>
                  <CloseIcon />
                </button>
              </div>
            </header>
          )}
          {activePeerId && (
            <span className="messages-panel-tools messages-panel-tools-float">
              <button type="button" className="messages-tool" aria-label={t.close} title={t.close} onClick={closeDock}>
                <CloseIcon />
              </button>
            </span>
          )}
          <div className={`messages-body${activePeerId ? ' is-thread' : ''}`}>{body}</div>
          {mode === 'demo' && <footer className="messages-panel-foot">{t.demoNote}</footer>}
        </section>
      )}
      <button
        type="button"
        className={`messages-launcher${unreadTotal > 0 ? ' has-unread' : ''}`}
        onClick={toggleDock}
        aria-expanded={dockOpen}
        aria-label={dockOpen ? t.launcherClose : t.launcherOpen}
        title={dockOpen ? t.launcherClose : t.launcherOpen}
      >
        <span className="messages-launcher-icon"><ChatIcon /></span>
        <span className="messages-launcher-label">{t.launcher}</span>
        <span className="messages-launcher-count">
          {unreadTotal > 0 ? fill(t.unreadCount, { count: unreadTotal }) : `${conversations.length} ${t.sectionConversations.toLowerCase()}`}
        </span>
        {unreadTotal > 0 && <span className="messages-launcher-badge" aria-label={fill(t.unreadCount, { count: unreadTotal })}>{unreadTotal}</span>}
      </button>
    </div>
  );
}
