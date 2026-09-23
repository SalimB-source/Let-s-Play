import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { formatCommentDate } from '../lib/comments';
import { useFriends } from './FriendsContext';
import { fill, friendsText } from './friendsCopy';

/** Amis affichés avant le bouton « voir tous mes amis ». */
const PREVIEW_LIMIT = 6;

function initialsFor(name) {
  const clean = String(name || '').trim();
  return clean ? clean.slice(0, 2).toUpperCase() : '?';
}

/** Avatar d'un ami, avec repli sur les initiales et point de présence. */
function FriendAvatar({ player }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [player.avatar]);
  return (
    <span className={`friends-avatar${player.online ? ' is-online' : ''}`}>
      {player.avatar && !broken
        ? <img src={player.avatar} alt="" onError={() => setBroken(true)} />
        : <span className="friends-avatar-fallback" aria-hidden="true">{initialsFor(player.name)}</span>}
      <span className="friends-avatar-dot" aria-hidden="true" />
    </span>
  );
}

/**
 * Section « Mes amis » du hub joueur (/auth) : la liste des amis, chacun
 * cliquable vers sa page de profil. Rien d'autre ici — plus de raccourci
 * d'amis ni de messagerie : les gestes (demandes, ajout, discussion 1-à-1)
 * vivent dans la fenêtre sociale (`src/social/SocialDock.jsx`).
 *
 * Rien n'est rendu sans provider ni pour un visiteur : le hub des scripts de
 * vérification reste inchangé.
 */
export default function FriendsHubSection() {
  const { lang } = useLanguage();
  const t = friendsText(lang);
  const { enabled, friends, onlineCount, pendingCount } = useFriends();
  const [expanded, setExpanded] = useState(false);
  if (!enabled) return null;

  const shown = expanded ? friends : friends.slice(0, PREVIEW_LIMIT);

  return (
    <div className="player-section player-friends-section">
      <div className="player-section-header">
        <h2>{t.hubTitle}</h2>
        <p>{fill(t.hubStats, { friends: friends.length, online: onlineCount, pending: pendingCount })}</p>
      </div>

      {friends.length > 0 ? (
        <>
          <ul className="player-friends-list">
            {shown.map((player) => {
              const status = player.online
                ? t.onlineShort
                : (player.lastSeenAt ? fill(t.lastSeen, { when: formatCommentDate(player.lastSeenAt, lang) }) : t.offlineShort);
              return (
                <li key={player.id} className={`player-friend-row${player.online ? ' is-online' : ''}`}>
                  <Link
                    to={`/profile/${encodeURIComponent(player.id)}`}
                    className="player-friend-link"
                    title={`${t.viewProfile} — ${player.name}`}
                  >
                    <FriendAvatar player={player} />
                    <span className="player-friend-text">
                      <span className="player-friend-name">{player.name}</span>
                      <span className="player-friend-meta">
                        <span className={`player-friend-status${player.online ? ' is-online' : ''}`}>{status}</span>
                        {player.level != null && <span className="player-friend-level">{fill(t.level, { level: player.level })}</span>}
                      </span>
                    </span>
                    <span className="player-friend-arrow" aria-hidden="true">›</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {friends.length > PREVIEW_LIMIT && (
            <button
              type="button"
              className="player-list-toggle"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
            >
              {expanded ? t.hubSeeLess : fill(t.hubSeeAll, { n: friends.length })}
            </button>
          )}
        </>
      ) : (
        <p className="player-empty-note">{t.emptyFriends}</p>
      )}
    </div>
  );
}
