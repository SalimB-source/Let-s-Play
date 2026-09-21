import React, { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useFriends } from './FriendsContext';
import { fill, friendsText } from './friendsCopy';

function initialsFor(name) {
  const clean = String(name || '').trim();
  return clean ? clean.slice(0, 2).toUpperCase() : '?';
}

function MiniAvatar({ player }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [player.avatar]);
  return (
    <span className={`friends-avatar${player.online ? ' is-online' : ''}`} title={player.name}>
      {player.avatar && !broken
        ? <img src={player.avatar} alt="" onError={() => setBroken(true)} />
        : <span className="friends-avatar-fallback" aria-hidden="true">{initialsFor(player.name)}</span>}
      <span className="friends-avatar-dot" aria-hidden="true" />
    </span>
  );
}

/**
 * Bloc « Amis & demandes » du hub joueur (/auth) : un résumé (amis, en ligne,
 * demandes en attente), les premiers avatars, et deux raccourcis qui ouvrent
 * la fenêtre d'amis sur le bon onglet. Rien n'est rendu sans provider ni pour
 * un visiteur : le hub des scripts de vérification reste inchangé.
 */
export default function FriendsHubSection() {
  const { lang } = useLanguage();
  const t = friendsText(lang);
  const { enabled, friends, onlineCount, pendingCount, openDock } = useFriends();
  if (!enabled) return null;

  const preview = friends.slice(0, 6);

  return (
    <div className="player-section">
      <div className="player-section-header">
        <h2>{t.hubTitle}</h2>
        <p>{fill(t.hubStats, { friends: friends.length, online: onlineCount, pending: pendingCount })}</p>
      </div>
      <div className="player-friends-strip">
        <div className="player-friends-avatars">
          {preview.map((player) => <MiniAvatar key={player.id} player={player} />)}
          {friends.length > preview.length && <span className="player-friends-more">+{friends.length - preview.length}</span>}
          {friends.length === 0 && <span className="player-empty-note" style={{ margin: 0 }}>{t.emptyFriends}</span>}
        </div>
        <div className="player-friends-actions">
          <button type="button" className="button button-ghost" onClick={() => openDock('friends')}>
            {t.hubOpen}
            {pendingCount > 0 && <span className="player-friends-pending">{pendingCount}</span>}
          </button>
          <button type="button" className="button button-yellow" onClick={() => openDock('add')}>
            {t.hubAdd} ↗
          </button>
        </div>
      </div>
    </div>
  );
}
