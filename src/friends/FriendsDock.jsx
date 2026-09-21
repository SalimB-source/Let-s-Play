import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { formatCommentDate } from '../lib/comments';
import { useFriends } from './FriendsContext';
import FriendButton from './FriendButton';
import MessageButton from '../messages/MessageButton';
import { describeFriendsError, fill, friendsText } from './friendsCopy';

/**
 * Fenêtre d'amis — ancrée en bas à droite (en bas à gauche en arabe).
 * ---------------------------------------------------------------------
 * Un lanceur compact (« AMIS · 2 en ligne », pastille des demandes reçues)
 * ouvre un panneau à trois onglets :
 *
 *   - **Amis** : les amis en ligne d'abord, puis hors ligne (avec « vu il y a… ») ;
 *   - **Demandes** : reçues (accepter / refuser) et envoyées (annuler) ;
 *   - **Ajouter** : recherche d'un joueur par pseudo, demande en un clic.
 *
 * Visible uniquement pour un joueur connecté (compte ou persona de démo).
 * L'état ouvert/fermé est mémorisé sur l'appareil. Les notifications de
 * succès (`AchievementPopup`) partagent le coin : friends.css les décale au-
 * dessus du lanceur, ou à côté du panneau quand il est ouvert.
 */

function PeopleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.8 19.5c.5-3.4 3-5.3 6.2-5.3s5.7 1.9 6.2 5.3" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M15.6 14.4c3 .1 5 1.8 5.6 4.6" />
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
function SearchIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

function initialsFor(name) {
  const clean = String(name || '').trim();
  return clean ? clean.slice(0, 2).toUpperCase() : '?';
}

/** Avatar avec repli sur les initiales si l'image ne charge pas. */
function Avatar({ name, src, online }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [src]);
  return (
    <span className={`friends-avatar${online ? ' is-online' : ''}`}>
      {src && !broken
        ? <img src={src} alt="" onError={() => setBroken(true)} />
        : <span className="friends-avatar-fallback" aria-hidden="true">{initialsFor(name)}</span>}
      <span className="friends-avatar-dot" aria-hidden="true" />
    </span>
  );
}

function PlayerRow({ player, t, lang, meta, children }) {
  const href = `/profile/${encodeURIComponent(player.id)}`;
  const statusText = player.online
    ? t.onlineShort
    : (player.lastSeenAt ? fill(t.lastSeen, { when: formatCommentDate(player.lastSeenAt, lang) }) : t.offlineShort);
  return (
    <li className={`friends-row${player.online ? ' is-online' : ' is-offline'}`}>
      <Link to={href} className="friends-row-main" title={t.viewProfile}>
        <Avatar name={player.name} src={player.avatar} online={player.online} />
        <span className="friends-row-text">
          <span className="friends-row-name">{player.name}</span>
          <span className="friends-row-meta">
            <span className={`friends-row-status${player.online ? ' is-online' : ''}`}>{meta || statusText}</span>
            {player.level != null && <span className="friends-row-level">{fill(t.level, { level: player.level })}</span>}
          </span>
        </span>
      </Link>
      {children && <span className="friends-row-actions">{children}</span>}
    </li>
  );
}

function SectionTitle({ children, count }) {
  return (
    <h4 className="friends-section-title">
      <span>{children}</span>
      {count != null && <span className="friends-section-count">{count}</span>}
    </h4>
  );
}

function ActionButton({ onAction, className = '', children, t }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(''), 4000);
    return () => clearTimeout(timer);
  }, [error]);
  return (
    <>
      <button
        type="button"
        className={`friends-action ${className}`.trim()}
        disabled={busy}
        onClick={async () => {
          if (busy) return;
          setBusy(true);
          setError('');
          try { await onAction(); } catch (e) { setError(describeFriendsError(e, t)); } finally { setBusy(false); }
        }}
      >
        {children}
      </button>
      {error && <span className="friends-inline-error" role="alert">{error}</span>}
    </>
  );
}

/* ------------------------------ onglet Amis ------------------------------ */

function FriendsTab({ friends, t, lang, unfriend }) {
  // Chaque ami porte aussi l'icône « Message » (pastille des non-lus) : c'est
  // l'entrée la plus courte vers une discussion.
  const online = friends.filter((friend) => friend.online);
  const offline = friends.filter((friend) => !friend.online);
  if (friends.length === 0) {
    return <p className="friends-empty">{t.emptyFriends}</p>;
  }
  return (
    <>
      <SectionTitle count={online.length}>{t.sectionOnline}</SectionTitle>
      {online.length > 0 ? (
        <ul className="friends-list">
          {online.map((friend) => (
            <PlayerRow key={friend.id} player={friend} t={t} lang={lang}>
              <MessageButton userId={friend.id} name={friend.name} variant="icon" />
              <ActionButton t={t} className="friends-action-quiet" onAction={() => {
                if (typeof window !== 'undefined' && !window.confirm(fill(t.removeConfirm, { name: friend.name }))) return undefined;
                return unfriend(friend.id);
              }}>{t.remove}</ActionButton>
            </PlayerRow>
          ))}
        </ul>
      ) : <p className="friends-empty friends-empty-small">{t.emptyOnline}</p>}
      {offline.length > 0 && (
        <>
          <SectionTitle count={offline.length}>{t.sectionOffline}</SectionTitle>
          <ul className="friends-list">
            {offline.map((friend) => (
              <PlayerRow key={friend.id} player={friend} t={t} lang={lang}>
                <MessageButton userId={friend.id} name={friend.name} variant="icon" />
                <ActionButton t={t} className="friends-action-quiet" onAction={() => {
                  if (typeof window !== 'undefined' && !window.confirm(fill(t.removeConfirm, { name: friend.name }))) return undefined;
                  return unfriend(friend.id);
                }}>{t.remove}</ActionButton>
              </PlayerRow>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/* ---------------------------- onglet Demandes ---------------------------- */

function RequestsTab({ incoming, outgoing, t, lang, accept, decline, cancel }) {
  return (
    <>
      <SectionTitle count={incoming.length}>{t.sectionReceived}</SectionTitle>
      {incoming.length > 0 ? (
        <ul className="friends-list">
          {incoming.map((player) => (
            <PlayerRow key={player.id} player={player} t={t} lang={lang} meta={t.pendingYou}>
              <ActionButton t={t} className="friends-action-primary" onAction={() => accept(player.id)}>{t.accept}</ActionButton>
              <ActionButton t={t} className="friends-action-quiet" onAction={() => decline(player.id)}>{t.decline}</ActionButton>
            </PlayerRow>
          ))}
        </ul>
      ) : <p className="friends-empty friends-empty-small">{t.emptyRequests}</p>}
      <SectionTitle count={outgoing.length}>{t.sectionSent}</SectionTitle>
      {outgoing.length > 0 ? (
        <ul className="friends-list">
          {outgoing.map((player) => (
            <PlayerRow key={player.id} player={player} t={t} lang={lang} meta={t.sent}>
              <ActionButton t={t} className="friends-action-quiet" onAction={() => cancel(player.id)}>{t.cancelRequest}</ActionButton>
            </PlayerRow>
          ))}
        </ul>
      ) : <p className="friends-empty friends-empty-small">{t.emptySent}</p>}
    </>
  );
}

/* ----------------------------- onglet Ajouter ---------------------------- */

function AddTab({ t, lang, search, isOnline, relationWith }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null); // null = pas encore cherché
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const requestId = useRef(0);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults(null);
      setSearching(false);
      setError('');
      return undefined;
    }
    const id = requestId.current + 1;
    requestId.current = id;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await search(term);
        if (requestId.current !== id) return;
        setResults(found);
        setError('');
      } catch (e) {
        if (requestId.current !== id) return;
        setResults([]);
        setError(describeFriendsError(e, t));
      } finally {
        if (requestId.current === id) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, search, t]);

  return (
    <>
      <label className="friends-search">
        <span className="sr-only">{t.searchLabel}</span>
        <SearchIcon />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.searchPlaceholder}
          maxLength={40}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {query.trim().length < 2 && <p className="friends-hint">{t.searchHint}</p>}
      {searching && <p className="friends-hint" aria-live="polite">{t.searching}</p>}
      {error && <p className="friends-inline-error" role="alert">{error}</p>}
      {!searching && results && results.length === 0 && !error && (
        <p className="friends-empty friends-empty-small">{fill(t.noResults, { query: query.trim() })}</p>
      )}
      {results && results.length > 0 && (
        <ul className="friends-list">
          {results.map((player) => {
            const relation = relationWith(player.id);
            const meta = relation?.kind === 'friend' ? t.friends : relation?.kind === 'outgoing' ? t.sent : relation?.kind === 'incoming' ? t.pendingYou : null;
            return (
              <PlayerRow key={player.id} player={{ ...player, online: isOnline(player.id) }} t={t} lang={lang} meta={meta}>
                <FriendButton userId={player.id} name={player.name} variant="compact" />
              </PlayerRow>
            );
          })}
        </ul>
      )}
    </>
  );
}

/* --------------------------------- dock ---------------------------------- */

export default function FriendsDock() {
  const friends = useFriends();
  const { lang } = useLanguage();
  const t = friendsText(lang);
  const {
    enabled, mode, status, error,
    friends: list, incoming, outgoing, onlineCount, pendingCount,
    dockOpen, dockTab, setDockTab, toggleDock, closeDock,
    accept, decline, cancel, unfriend, search, isOnline, relationWith, refresh,
  } = friends;

  // Classes sur <body> : friends.css y lit la place prise par le lanceur ou le
  // panneau pour décaler les notifications de succès.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const { classList } = document.body;
    if (enabled) classList.add('has-friends-dock'); else classList.remove('has-friends-dock');
    if (enabled && dockOpen) classList.add('friends-dock-open'); else classList.remove('friends-dock-open');
    return () => {
      classList.remove('has-friends-dock');
      classList.remove('friends-dock-open');
    };
  }, [enabled, dockOpen]);

  // Échap ferme le panneau.
  useEffect(() => {
    if (!dockOpen || typeof document === 'undefined') return undefined;
    const onKey = (event) => { if (event.key === 'Escape') closeDock(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dockOpen, closeDock]);

  const [refreshing, setRefreshing] = useState(false);
  const subtitle = useMemo(() => fill(t.subtitle, { online: onlineCount, total: list.length }), [t, onlineCount, list.length]);

  if (!enabled) return null;

  const tabs = [
    { id: 'friends', label: t.tabFriends, count: list.length },
    { id: 'requests', label: t.tabRequests, count: pendingCount, alert: pendingCount > 0 },
    { id: 'add', label: t.tabAdd },
  ];

  let body;
  if (status === 'unavailable') {
    body = <p className="friends-empty friends-unavailable">{t.unavailable}</p>;
  } else if (status === 'loading' || status === 'idle') {
    body = <p className="friends-empty" aria-busy="true">{t.loading}</p>;
  } else if (status === 'error' && list.length === 0) {
    body = (
      <div className="friends-empty">
        <p className="friends-inline-error" role="alert">{describeFriendsError(error, t)}</p>
        <button type="button" className="friends-action friends-action-primary" onClick={() => refresh()}>{t.refresh}</button>
      </div>
    );
  } else if (dockTab === 'requests') {
    body = <RequestsTab incoming={incoming} outgoing={outgoing} t={t} lang={lang} accept={accept} decline={decline} cancel={cancel} />;
  } else if (dockTab === 'add') {
    body = <AddTab t={t} lang={lang} search={search} isOnline={isOnline} relationWith={relationWith} />;
  } else {
    body = <FriendsTab friends={list} t={t} lang={lang} unfriend={unfriend} />;
  }

  return (
    <div className={`friends-dock${dockOpen ? ' is-open' : ''}`}>
      {dockOpen && (
        <section className="friends-panel" role="dialog" aria-label={t.title} aria-modal="false">
          <header className="friends-panel-head">
            <div className="friends-panel-title">
              <span className="friends-panel-kicker"><PeopleIcon size={14} /> {t.title}</span>
              <span className="friends-panel-sub">{subtitle}</span>
            </div>
            <div className="friends-panel-tools">
              <button
                type="button"
                className={`friends-tool${refreshing ? ' is-spinning' : ''}`}
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
              <button type="button" className="friends-tool" aria-label={t.close} title={t.close} onClick={closeDock}>
                <CloseIcon />
              </button>
            </div>
          </header>
          <nav className="friends-tabs" aria-label={t.title}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`friends-tab${dockTab === tab.id ? ' is-active' : ''}${tab.alert ? ' has-alert' : ''}`}
                onClick={() => setDockTab(tab.id)}
                aria-pressed={dockTab === tab.id}
              >
                {tab.label}
                {tab.count != null && tab.count > 0 && <span className="friends-tab-count">{tab.count}</span>}
              </button>
            ))}
          </nav>
          <div className="friends-body">{body}</div>
          {mode === 'demo' && <footer className="friends-panel-foot">{t.demoNote}</footer>}
        </section>
      )}
      <button
        type="button"
        className={`friends-launcher${pendingCount > 0 ? ' has-pending' : ''}`}
        onClick={toggleDock}
        aria-expanded={dockOpen}
        aria-label={dockOpen ? t.launcherClose : t.launcherOpen}
        title={dockOpen ? t.launcherClose : t.launcherOpen}
      >
        <span className="friends-launcher-icon"><PeopleIcon /></span>
        <span className="friends-launcher-label">{t.launcher}</span>
        <span className="friends-launcher-online">
          <span className={`friends-launcher-dot${onlineCount > 0 ? ' is-online' : ''}`} aria-hidden="true" />
          {onlineCount} {t.online}
        </span>
        {pendingCount > 0 && <span className="friends-launcher-badge" aria-label={`${pendingCount} ${t.tabRequests}`}>{pendingCount}</span>}
      </button>
    </div>
  );
}
