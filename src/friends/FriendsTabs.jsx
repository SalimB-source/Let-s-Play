import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCommentDate } from '../lib/comments';
import FriendButton from './FriendButton';
import { describeFriendsError, fill } from './friendsCopy';

/**
 * Onglets du côté « amis » de la fenêtre sociale unifiée
 * (`src/social/SocialDock.jsx`) :
 *
 *   - **Amis** : les amis en ligne d'abord, puis hors ligne (avec « vu il y
 *     a… »). La photo ou le nom d'un ami **ouvre la discussion** avec lui (le
 *     chat est le geste principal) ; l'accès au profil passe par le bouton
 *     « Profil », bien visible à droite de la ligne.
 *   - **Demandes** : reçues (accepter / refuser) et envoyées (annuler) ;
 *   - **Ajouter** : recherche d'un joueur par pseudo, demande en un clic.
 *     Pas encore amis : la ligne renvoie au profil (pas de discussion
 *     possible), comme partout sur le site.
 *
 * Les trois composants sont autonomes (props) : la fenêtre porte l'état,
 * les contextes (`FriendsContext`, `MessagesContext` via `onOpenThread`)
 * fournissent les données et les gestes.
 */

function initialsFor(name) {
  const clean = String(name || '').trim();
  return clean ? clean.slice(0, 2).toUpperCase() : '?';
}

/** Icône « profil » des boutons visibles en fin de ligne. */
export function ProfileIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c.9-3.6 3.6-5.4 7-5.4s6.1 1.8 7 5.4" />
    </svg>
  );
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

/**
 * Ligne d'un joueur. Sans `onOpen`, la photo/nom renvoie au profil (lien,
 * comme sur le reste du site). Avec `onOpen` (les **amis**), le même geste
 * ouvre la discussion : c'est le raccourci le plus naturel vers le chat.
 */
function PlayerRow({ player, t, lang, meta, children, onOpen, openTitle }) {
  const href = `/profile/${encodeURIComponent(player.id)}`;
  const statusText = player.online
    ? t.onlineShort
    : (player.lastSeenAt ? fill(t.lastSeen, { when: formatCommentDate(player.lastSeenAt, lang) }) : t.offlineShort);
  const identity = (
    <>
      <Avatar name={player.name} src={player.avatar} online={player.online} />
      <span className="friends-row-text">
        <span className="friends-row-name">{player.name}</span>
        <span className="friends-row-meta">
          <span className={`friends-row-status${player.online ? ' is-online' : ''}`}>{meta || statusText}</span>
          {player.level != null && <span className="friends-row-level">{fill(t.level, { level: player.level })}</span>}
        </span>
      </span>
    </>
  );
  return (
    <li className={`friends-row${player.online ? ' is-online' : ' is-offline'}`}>
      {onOpen ? (
        <button type="button" className="friends-row-main" title={openTitle} aria-label={`${openTitle} — ${player.name}`} onClick={() => onOpen(player.id)}>
          {identity}
        </button>
      ) : (
        <Link to={href} className="friends-row-main" title={t.viewProfile}>
          {identity}
        </Link>
      )}
      {children && <span className="friends-row-actions">{children}</span>}
    </li>
  );
}

/** Bouton « Profil » bien visible : l'accès au profil explicite des listes. */
function ProfileButton({ userId, name, label, title }) {
  return (
    <Link
      to={`/profile/${encodeURIComponent(userId)}`}
      className="friends-action friends-action-profile"
      title={title}
      aria-label={`${title} — ${name}`}
    >
      <ProfileIcon /> {label}
    </Link>
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

export function FriendsTab({ friends, t, lang, unfriend, onOpenThread, chatLabel, profileLabel }) {
  // La photo ou le nom d'un ami ouvre la discussion (`onOpenThread`, qui
  // navigue vers la page de messagerie sur mobile) ; le bouton « Profil »
  // remplace l'ancienne icône « Message » : l'accès profil est explicite.
  const online = friends.filter((friend) => friend.online);
  const offline = friends.filter((friend) => !friend.online);
  if (friends.length === 0) {
    return <p className="friends-empty">{t.emptyFriends}</p>;
  }
  const row = (friend) => (
    <>
      <ProfileButton userId={friend.id} name={friend.name} label={profileLabel} title={t.viewProfile} />
      <ActionButton t={t} className="friends-action-quiet" onAction={() => {
        if (typeof window !== 'undefined' && !window.confirm(fill(t.removeConfirm, { name: friend.name }))) return undefined;
        return unfriend(friend.id);
      }}>{t.remove}</ActionButton>
    </>
  );
  return (
    <>
      <SectionTitle count={online.length}>{t.sectionOnline}</SectionTitle>
      {online.length > 0 ? (
        <ul className="friends-list">
          {online.map((friend) => (
            <PlayerRow key={friend.id} player={friend} t={t} lang={lang} onOpen={onOpenThread} openTitle={chatLabel}>
              {row(friend)}
            </PlayerRow>
          ))}
        </ul>
      ) : <p className="friends-empty friends-empty-small">{t.emptyOnline}</p>}
      {offline.length > 0 && (
        <>
          <SectionTitle count={offline.length}>{t.sectionOffline}</SectionTitle>
          <ul className="friends-list">
            {offline.map((friend) => (
              <PlayerRow key={friend.id} player={friend} t={t} lang={lang} onOpen={onOpenThread} openTitle={chatLabel}>
                {row(friend)}
              </PlayerRow>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/* ---------------------------- onglet Demandes ---------------------------- */

export function RequestsTab({ incoming, outgoing, t, lang, accept, decline, cancel }) {
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

function SearchIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

export function AddTab({ t, lang, search, isOnline, relationWith }) {
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
