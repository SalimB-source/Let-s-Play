import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { fill } from '../friends/friendsCopy';
import { formatCommentDate } from '../lib/comments';
import { useMessages } from './MessagesContext';
import { messagesText } from './messagesCopy';

/**
 * Bloc « Messages » du hub joueur (/auth) : le total des non-lus, les dernières
 * discussions en un coup d'œil, et deux raccourcis vers la fenêtre de
 * messagerie (en bas à gauche). Rien n'est rendu sans provider ni pour un
 * visiteur : le hub des scripts de vérification reste inchangé.
 */
export default function MessagesHubSection() {
  const { lang } = useLanguage();
  const t = messagesText(lang);
  const { enabled, conversations, unreadTotal, openInbox, openThread } = useMessages();
  if (!enabled) return null;

  const recent = conversations.filter((entry) => entry.lastMessage).slice(0, 3);

  return (
    <div className="player-section">
      <div className="player-section-header">
        <h2>{t.hubTitle}</h2>
        <p>{fill(t.hubStats, { unread: unreadTotal, threads: conversations.length })}</p>
      </div>
      <div className="player-messages-strip">
        {recent.length > 0 ? (
          <ul className="player-messages-list">
            {recent.map((entry) => (
              <li key={entry.peerId}>
                <button type="button" className="player-messages-row" onClick={() => openThread(entry.peerId)}>
                  <span className="player-messages-name">{entry.profile.name}</span>
                  <span className="player-messages-preview">
                    {entry.lastMessage.mine ? '→ ' : ''}{entry.lastMessage.body}
                  </span>
                  <span className="player-messages-meta">
                    {formatCommentDate(entry.lastAt, lang)}
                    {entry.unread > 0 && <span className="player-messages-unread">{entry.unread}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <span className="player-empty-note" style={{ margin: 0 }}>{t.emptyInbox}</span>
        )}
        <div className="player-messages-actions">
          <button type="button" className="button button-ghost" onClick={openInbox}>
            {t.hubOpen}
            {unreadTotal > 0 && <span className="player-messages-pending">{unreadTotal}</span>}
          </button>
          <button type="button" className="button button-yellow" onClick={openInbox}>
            {t.hubWrite} ↗
          </button>
        </div>
      </div>
    </div>
  );
}
