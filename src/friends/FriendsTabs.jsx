import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCommentDate } from '../lib/comments';
import FriendButton from './FriendButton';
import { describeFriendsError, fill } from './friendsCopy';
import { pseudoLabel } from '../messages/messagesCopy';

/**
 * Onglets « gestion » de la fenêtre sociale unifiée
 * (`src/social/SocialDock.jsx`) :
 *
 *   - **Demandes** : reçues (accepter / refuser) et envoyées (annuler) ;
 *   - **Ajouter** : recherche d'un joueur par pseudo, demande en un clic.
 *     Pas encore amis : la ligne renvoie au profil (pas de discussion
 *     possible), comme partout sur le site.
 *
 * La liste des amis elle-même n'a plus d'onglet : elle vit dans la **boîte de
 * réception** de la messagerie (`InboxView` de `src/messages/MessagesTabs.jsx`)
 * — ouvrir une discussion et voir ses amis, c'est le même geste, pas deux
 * listes redondantes. `ProfileIcon` reste exporté d'ici : c'est l'icône du
 * bouton « Profil » des lignes de la boîte de réception.
 *
 * Les composants sont autonomes (props) : la fenêtre porte l'état, les
 * contextes (`FriendsContext`, `MessagesContext`) fournissent les données et
 * les gestes.
 *
 * Comme dans toute la messagerie, les pseudos s'affichent **en majuscules**
 * (`pseudoLabel`) : lignes des deux onglets, libellés accessibles et
 * confirmations. Les données gardent leur casse d'origine ; hors de la
 * fenêtre sociale (hub joueur, profils, commentaires), le pseudo reste tel
 * qu'il a été saisi.
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
  // Pseudo en majuscules, comme partout dans la messagerie (`pseudoLabel`).
  const name = pseudoLabel(player.name);
  const statusText = player.online
    ? t.onlineShort
    : (player.lastSeenAt ? fill(t.lastSeen, { when: formatCommentDate(player.lastSeenAt, lang) }) : t.offlineShort);
  const identity = (
    <>
      <Avatar name={name} src={player.avatar} online={player.online} />
      <span className="friends-row-text">
        <span className="friends-row-name">{name}</span>
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
        <button type="button" className="friends-row-main" title={openTitle} aria-label={`${openTitle} — ${name}`} onClick={() => onOpen(player.id)}>
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
                <FriendButton userId={player.id} name={pseudoLabel(player.name)} variant="compact" />
              </PlayerRow>
            );
          })}
        </ul>
      )}
    </>
  );
}
