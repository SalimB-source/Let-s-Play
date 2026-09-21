import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useMessages } from './MessagesContext';
import { messagesText } from './messagesCopy';

/* Petite icône en ligne (hérite de currentColor). */
function ChatIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 12.2c0 4-3.8 7.2-8.5 7.2-1 0-2-.15-2.9-.42L4.5 20.5l1.2-3.3C4.3 15.9 3.5 14.1 3.5 12.2 3.5 8.2 7.3 5 12 5s8.5 3.2 8.5 7.2z" />
    </svg>
  );
}

/**
 * Bouton « Message » pour un joueur `userId` — il ouvre le chat avec lui
 * (page `/messages` sur mobile, fenêtre sociale sur bureau).
 *
 *   variant 'full'    — profil public : bouton secondaire à côté du bouton ami ;
 *   variant 'compact' — version resserrée pour les listes denses.
 *
 * Dans les listes d'amis, l'accès au profil est porté par le bouton
 * « Profil » (`FriendsTabs`) : l'ancienne icône « Message » a disparu — le
 * geste chat, c'est la photo ou le nom ; le geste profil, c'est le bouton.
 *
 * La messagerie est réservée aux **amis** : sans amitié acceptée le bouton est
 * désactivé et l'explique (« Deviens ami avec ce joueur pour lui écrire »).
 * Visiteur non connecté : lien vers la connexion (masqué avec `guestHidden`).
 * Sans provider (SSR des scripts de vérification), le bouton ne rend rien.
 */
export default function MessageButton({ userId, name, variant = 'full', guestHidden = false, className = '' }) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const location = useLocation();
  const messages = useMessages();
  const t = messagesText(lang);

  const isFull = variant === 'full';

  if (!userId || (user && String(user.id) === String(userId))) return null;

  if (!user) {
    if (guestHidden) return null;
    return (
      <Link
        to="/auth"
        state={{ from: `${location.pathname}${location.search}${location.hash}`, mode: 'signin' }}
        className={`message-btn message-btn-ghost message-btn-${variant} ${className}`.trim()}
      >
        <ChatIcon /> {t.signInPrompt}
      </Link>
    );
  }

  if (!messages.enabled) return null;

  const allowed = messages.canMessage(userId);
  const unavailable = messages.status === 'unavailable';
  const unread = messages.unreadFor(userId);
  const blocked = messages.isBlocked(userId);

  if (!allowed || unavailable) {
    if (!isFull) return null;
    const reason = unavailable ? t.unavailable : t.notFriends;
    return (
      <span className={`message-btn-wrap message-btn-wrap-${variant} ${className}`.trim()}>
        <button type="button" className={`message-btn message-btn-ghost message-btn-${variant}`} disabled title={reason}>
          <ChatIcon /> {t.message}
        </button>
        <span className="message-btn-note">{reason}</span>
      </span>
    );
  }

  const label = `${t.message}${name ? ` — ${name}` : ''}`;

  return (
    <span className={`message-btn-wrap message-btn-wrap-${variant} ${className}`.trim()}>
      <button
        type="button"
        className={`message-btn message-btn-${variant}`}
        onClick={() => messages.openThread(userId)}
        title={blocked ? t.blockedNote : label}
      >
        <ChatIcon /> {t.message}
        {unread > 0 && <span className="message-btn-badge">{unread}</span>}
      </button>
    </span>
  );
}
