import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useFriends } from './FriendsContext';
import { describeFriendsError, fill, friendsText } from './friendsCopy';

/* Petites icônes en ligne (héritent de currentColor). */
function PlusIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function CheckIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  );
}
function ClockIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

/**
 * Bouton « demande d'ami » pour un joueur `userId`.
 *
 *   variant 'full'    — profil public : bouton principal + action secondaire ;
 *   variant 'compact' — résultats de recherche, listes ;
 *   variant 'icon'    — fil de commentaires : une icône, l'état en info-bulle.
 *
 * L'état affiché suit la relation : rien → « Ajouter en ami » ; demande
 * envoyée → « Demande envoyée » (+ annuler) ; demande reçue → Accepter /
 * Refuser ; amis → « Amis » (+ retirer). Visiteur non connecté : lien vers la
 * connexion (masqué avec `guestHidden`, pour ne pas encombrer les
 * commentaires). Sans provider (SSR des scripts de vérification), le bouton
 * ne rend rien.
 */
export default function FriendButton({ userId, name, variant = 'full', guestHidden = false, className = '' }) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const location = useLocation();
  const friends = useFriends();
  const t = friendsText(lang);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isIcon = variant === 'icon';
  const isFull = variant === 'full';

  // Le message d'erreur s'efface tout seul.
  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  if (!userId || (user && String(user.id) === String(userId))) return null;

  // Visiteur : proposer la connexion (le joueur revient ici ensuite).
  if (!user) {
    if (guestHidden) return null;
    return (
      <Link
        to="/auth"
        state={{ from: `${location.pathname}${location.search}${location.hash}`, mode: 'signin' }}
        className={`friend-btn friend-btn-ghost friend-btn-${variant} ${className}`.trim()}
      >
        <PlusIcon /> {t.signInPrompt}
      </Link>
    );
  }

  if (!friends.enabled) return null;

  const relation = friends.relationWith(userId);
  const allowed = friends.canBefriend(userId);
  const unavailable = friends.status === 'unavailable';

  const run = async (action) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(describeFriendsError(e, t));
    } finally {
      setBusy(false);
    }
  };

  const label = name || friends.profileFor(userId)?.name || '';

  // Cible impossible : profil démo depuis un vrai compte, ou vrai compte
  // depuis une persona. Le bouton reste visible mais l'explique.
  if (!allowed || unavailable) {
    if (isIcon) return null;
    const reason = unavailable ? t.unavailable : friends.mode === 'demo' ? t.demoTarget : t.realTarget;
    return (
      <span className={`friend-btn-wrap friend-btn-wrap-${variant} ${className}`.trim()}>
        <button type="button" className={`friend-btn friend-btn-ghost friend-btn-${variant}`} disabled title={reason}>
          <PlusIcon /> {isFull ? t.add : t.addShort}
        </button>
        {isFull && <span className="friend-btn-note">{reason}</span>}
      </span>
    );
  }

  const kind = relation?.kind || null;

  if (isIcon) {
    if (kind === 'friend') {
      return <span className={`friend-icon friend-icon-friend ${className}`.trim()} title={t.friends} aria-label={t.friends}><CheckIcon size={11} /></span>;
    }
    if (kind === 'outgoing') {
      return <span className={`friend-icon friend-icon-pending ${className}`.trim()} title={t.sent} aria-label={t.sent}><ClockIcon size={11} /></span>;
    }
    const iconTitle = kind === 'incoming' ? `${t.accept} — ${label}` : `${t.add} — ${label}`;
    return (
      <button
        type="button"
        className={`friend-icon friend-icon-add${kind === 'incoming' ? ' friend-icon-incoming' : ''} ${className}`.trim()}
        onClick={() => run(() => (kind === 'incoming' ? friends.accept(userId) : friends.sendRequest(userId)))}
        disabled={busy}
        title={iconTitle}
        aria-label={iconTitle}
      >
        {kind === 'incoming' ? <CheckIcon size={11} /> : <PlusIcon size={11} />}
      </button>
    );
  }

  let content;
  if (kind === 'friend') {
    content = (
      <>
        <span className="friend-btn friend-btn-state friend-btn-friends"><CheckIcon /> {t.friends}</span>
        <button
          type="button"
          className="friend-btn friend-btn-link"
          disabled={busy}
          onClick={() => {
            const ok = typeof window === 'undefined' || !isFull || window.confirm(fill(t.removeConfirm, { name: label || '?' }));
            if (ok) run(() => friends.unfriend(userId));
          }}
        >
          {t.remove}
        </button>
      </>
    );
  } else if (kind === 'outgoing') {
    content = (
      <>
        <span className="friend-btn friend-btn-state friend-btn-pending"><ClockIcon /> {t.sent}</span>
        <button type="button" className="friend-btn friend-btn-link" disabled={busy} onClick={() => run(() => friends.cancel(userId))}>
          {t.cancelRequest}
        </button>
      </>
    );
  } else if (kind === 'incoming') {
    content = (
      <>
        {isFull && <span className="friend-btn-note friend-btn-note-lead">{t.pendingYou}</span>}
        <button type="button" className={`friend-btn friend-btn-primary friend-btn-${variant}`} disabled={busy} onClick={() => run(() => friends.accept(userId))}>
          <CheckIcon /> {t.accept}
        </button>
        <button type="button" className="friend-btn friend-btn-link" disabled={busy} onClick={() => run(() => friends.decline(userId))}>
          {t.decline}
        </button>
      </>
    );
  } else {
    content = (
      <button type="button" className={`friend-btn friend-btn-primary friend-btn-${variant}`} disabled={busy} onClick={() => run(() => friends.sendRequest(userId))}>
        <PlusIcon /> {isFull ? t.add : t.addShort}
      </button>
    );
  }

  return (
    <span className={`friend-btn-wrap friend-btn-wrap-${variant}${busy ? ' is-busy' : ''} ${className}`.trim()}>
      {content}
      {error && <span className="friend-btn-note friend-btn-error" role="alert">{error}</span>}
    </span>
  );
}
