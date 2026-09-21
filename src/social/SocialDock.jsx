import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useFriends } from '../friends/FriendsContext';
import { describeFriendsError, fill, friendsText } from '../friends/friendsCopy';
import { AddTab, FriendsTab, RequestsTab } from '../friends/FriendsTabs';
import { useMessages } from '../messages/MessagesContext';
import { describeMessagesError, messagesText } from '../messages/messagesCopy';
import { InboxView, ThreadView } from '../messages/MessagesTabs';
import useMediaQuery from '../lib/useMediaQuery';
import { socialText } from './socialCopy';

/**
 * Fenêtre sociale unifiée — amis + messagerie dans la même fenêtre, ancrée
 * en bas à droite.
 * ---------------------------------------------------------------------------
 * Un seul lanceur compact (« SOCIAL » : pastilles des non-lus et des
 * demandes d'amis reçues, compteur d'amis en ligne) ouvre un panneau à
 * quatre onglets :
 *
 *   - **Amis** / **Demandes** / **Ajouter** : le module ami
 *     (`FriendsTabs`, données de `FriendsContext`) ;
 *   - **Messages** : la messagerie — sur bureau, la liste des discussions puis
 *     la discussion ouverte (`MessagesTabs`) ; sur mobile, la **page dédiée**
 *     `/messages` (alias `/messagerie`) : l'onglet et toute ouverture de
 *     discussion y naviguent, le pop-up ne concerne plus que les amis.
 *
 * La fenêtre n'est ouverte que pour un joueur connecté (compte ou persona de
 * démo). L'ouverture est pilotée par les deux contextes : les boutons « Mes
 * amis » / « Messages » du hub et les boutons « Message » des profils la
 * rouvrent sur le bon onglet (`openDock('messages')`, `openThread`).
 * Échap remonte de la discussion puis ferme la fenêtre.
 *
 * Sur la page de messagerie (`/messages`), la fenêtre s'efface entièrement :
 * c'est la page qui porte la messagerie, rien ne flotte par-dessus.
 */

function SocialIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 12.2c0 4-3.8 7.2-8.5 7.2-1 0-2-.15-2.9-.42L4.5 20.5l1.2-3.3C4.3 15.9 3.5 14.1 3.5 12.2 3.5 8.2 7.3 5 12 5s8.5 3.2 8.5 7.2z" />
      <circle cx="12" cy="10.4" r="2.1" />
      <path d="M8.6 15.3c.7-1.6 2-2.4 3.4-2.4s2.7.8 3.4 2.4" />
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

export default function SocialDock() {
  const friends = useFriends();
  const messages = useMessages();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const t = socialText(lang);
  const ft = friendsText(lang);
  const mt = messagesText(lang);
  // Mobile : la messagerie vit sur la page /messages, pas dans le pop-up.
  const isMobile = useMediaQuery('(max-width: 760px)');
  // La page de messagerie remplace la fenêtre : rien ne flotte par-dessus.
  const onMessagesRoute = /^\/(messages|messagerie)(\/|$)/.test(location.pathname || '');

  const {
    enabled: friendsEnabled, status: friendsStatus, error: friendsError,
    friends: friendsList, incoming, outgoing, onlineCount, pendingCount,
    dockOpen: friendsOpen, dockTab, openDock, closeDock: closeFriendsDock,
    accept, decline, cancel, unfriend, search, isOnline, relationWith,
    refresh: refreshFriends,
  } = friends;

  const {
    enabled: messagesEnabled, mode, status: messagesStatus, error: messagesError,
    conversations, blockedConversations, unreadTotal, unreadFor, threadFor,
    dockOpen: messagesOpen, activePeerId, openThread, backToInbox,
    closeDock: closeMessagesDock,
    send, deleteMessage, markRead, block, unblock, report,
    canMessage, isBlocked, reportedReason, refresh: refreshMessages,
  } = messages;

  const enabled = friendsEnabled || messagesEnabled;
  const open = friendsOpen || messagesOpen;
  const inThread = Boolean(activePeerId);
  // Onglet actif : une discussion ouverte occupe tout le panneau ; sinon,
  // l'onglet mémorisé par le contexte amis (« messages » inclus), ou
  // « messages » si la fenêtre a été ouverte uniquement côté messagerie.
  const tab = inThread || dockTab === 'messages' || (!friendsOpen && messagesOpen)
    ? 'messages'
    : dockTab;

  const closeAll = () => {
    closeFriendsDock();
    closeMessagesDock();
  };
  const toggle = () => {
    if (open) { closeAll(); return; }
    // Mobile : l'onglet mémorisé est la messagerie → page dédiée, pas de pop-up.
    if (isMobile && tab === 'messages') { navigate('/messages'); return; }
    openDock(tab === 'messages' ? 'messages' : dockTab);
  };
  const selectTab = (tabId) => {
    // Mobile : l'onglet Messages ouvre la page de messagerie.
    if (isMobile && tabId === 'messages') {
      closeAll();
      navigate('/messages');
      return;
    }
    openDock(tabId);
  };
  // Retour à la liste des discussions : on reste sur l'onglet Messages
  // (utile quand la discussion a été rouverte depuis le stockage local).
  const backFromThread = () => {
    backToInbox();
    openDock('messages');
  };

  // Ancien état persisté « fenêtre ouverte sur la messagerie » (avant que la
  // messagerie ne devienne une page sur mobile) : on bascule vers la page au
  // lieu de rouvrir le pop-up.
  useEffect(() => {
    if (!isMobile || !open || onMessagesRoute) return;
    if (tab !== 'messages') return;
    const target = activePeerId ? `/messages/${encodeURIComponent(activePeerId)}` : '/messages';
    closeFriendsDock();
    closeMessagesDock();
    backToInbox();
    navigate(target);
  }, [isMobile, open, tab, onMessagesRoute, activePeerId, closeFriendsDock, closeMessagesDock, backToInbox, navigate]);

  // Classes sur <body> : social.css y lit la place prise par le lanceur ou la
  // fenêtre pour décaler les notifications de succès, et verrouille le scroll
  // du document quand le pop-up plein écran est ouvert sur mobile. Sur la
  // page de messagerie, la fenêtre étant effacée, aucune classe n'est posée.
  const dockVisible = enabled && !onMessagesRoute;
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const { classList } = document.body;
    const set = (name, on) => (on ? classList.add(name) : classList.remove(name));
    set('has-friends-dock', dockVisible);
    set('has-messages-dock', dockVisible);
    set('friends-dock-open', dockVisible && open);
    set('messages-dock-open', dockVisible && open);
    set('social-dock-open', dockVisible && open);
    return () => {
      set('has-friends-dock', false);
      set('has-messages-dock', false);
      set('friends-dock-open', false);
      set('messages-dock-open', false);
      set('social-dock-open', false);
    };
  }, [dockVisible, open]);

  // Discussion laissée ouverte (persistée) alors que la fenêtre rouvre sur un
  // onglet amis : la demande explicite gagne (raccourci « Ouvrir la liste
  // d'amis » du hub). Le rechargement d'un état où la fenêtre était ouverte
  // sur la discussion (les deux drapeaux persistés) n'est pas concerné.
  useEffect(() => {
    if (open && inThread && dockTab !== 'messages' && !messagesOpen) backToInbox();
  }, [open, inThread, dockTab, messagesOpen, backToInbox]);

  // Échap : remonte à la liste des discussions, puis ferme la fenêtre.
  useEffect(() => {
    if (!dockVisible || !open || typeof document === 'undefined') return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (activePeerId) { backToInbox(); openDock('messages'); }
      else { closeFriendsDock(); closeMessagesDock(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dockVisible, open, activePeerId, backToInbox, openDock, closeFriendsDock, closeMessagesDock]);

  // Discussion ouverte : les messages reçus passent en lus tout de suite.
  const activeUnread = activePeerId ? unreadFor(activePeerId) : 0;
  useEffect(() => {
    if (open && inThread && activeUnread > 0) markRead(activePeerId);
  }, [open, inThread, activeUnread, activePeerId, markRead]);

  const [refreshing, setRefreshing] = useState(false);
  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([refreshFriends(), refreshMessages()]);
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const subtitle = useMemo(() => (
    unreadTotal > 0
      ? fill(t.subtitle, { online: onlineCount, unread: unreadTotal })
      : fill(ft.subtitle, { online: onlineCount, total: friendsList.length })
  ), [t, ft, onlineCount, unreadTotal, friendsList.length]);

  if (!dockVisible) return null;

  const peerProfile = activePeerId ? friends.profileFor(activePeerId) : null;
  const activeEntry = activePeerId
    ? (conversations.find((entry) => entry.peerId === activePeerId)
      || blockedConversations.find((entry) => entry.peerId === activePeerId))
    : null;
  const resolvedProfile = activeEntry?.profile || peerProfile || { id: activePeerId, name: String(activePeerId || '').slice(0, 8), avatar: null };

  // Contenu de l'onglet « Messages » (liste des discussions) ; la discussion
  // ouverte est rendue directement dans le panneau, en dessous des onglets.
  let messagesBody;
  if (messagesStatus === 'unavailable') {
    messagesBody = <p className="messages-empty messages-unavailable">{mt.unavailable}</p>;
  } else if (messagesStatus === 'loading' || messagesStatus === 'idle') {
    messagesBody = <p className="messages-empty" aria-busy="true">{mt.loading}</p>;
  } else if (messagesStatus === 'error' && conversations.length === 0) {
    messagesBody = (
      <div className="messages-empty">
        <p className="messages-inline-error" role="alert">{describeMessagesError(messagesError, mt)}</p>
        <button type="button" className="messages-action messages-action-primary" onClick={() => refreshMessages()}>{mt.refresh}</button>
      </div>
    );
  } else {
    messagesBody = (
      <InboxView
        t={mt}
        lang={lang}
        conversations={conversations}
        blocked={blockedConversations}
        isOnline={isOnline}
        onOpen={openThread}
        onUnblock={unblock}
      />
    );
  }

  // Contenu des onglets amis : l'état du module amis protège les trois.
  let friendsBody;
  if (friendsStatus === 'unavailable') {
    friendsBody = <p className="friends-empty friends-unavailable">{ft.unavailable}</p>;
  } else if (friendsStatus === 'loading' || friendsStatus === 'idle') {
    friendsBody = <p className="friends-empty" aria-busy="true">{ft.loading}</p>;
  } else if (friendsStatus === 'error' && friendsList.length === 0) {
    friendsBody = (
      <div className="friends-empty">
        <p className="friends-inline-error" role="alert">{describeFriendsError(friendsError, ft)}</p>
        <button type="button" className="friends-action friends-action-primary" onClick={() => refreshFriends()}>{ft.refresh}</button>
      </div>
    );
  } else if (tab === 'requests') {
    friendsBody = <RequestsTab incoming={incoming} outgoing={outgoing} t={ft} lang={lang} accept={accept} decline={decline} cancel={cancel} />;
  } else if (tab === 'add') {
    friendsBody = <AddTab t={ft} lang={lang} search={search} isOnline={isOnline} relationWith={relationWith} />;
  } else {
    friendsBody = (
      <FriendsTab
        friends={friendsList}
        t={ft}
        lang={lang}
        unfriend={unfriend}
        onOpenThread={openThread}
        chatLabel={mt.openChat}
        profileLabel={ft.profileShort}
      />
    );
  }

  let body;
  if (inThread) {
    body = (
      <div className="messages-body is-thread">
        <ThreadView
          peerId={activePeerId}
          t={mt}
          ft={ft}
          lang={lang}
          thread={threadFor(activePeerId)}
          profile={resolvedProfile}
          online={isOnline(activePeerId)}
          blocked={isBlocked(activePeerId)}
          reported={reportedReason(activePeerId)}
          canWrite={canMessage(activePeerId)}
          onBack={backFromThread}
          onSend={send}
          onDelete={deleteMessage}
          onBlock={block}
          onUnblock={unblock}
          onReport={(reason, note) => report(activePeerId, reason, note)}
        />
      </div>
    );
  } else if (tab === 'messages') {
    body = <div className="messages-body">{messagesBody}</div>;
  } else {
    body = <div className="friends-body">{friendsBody}</div>;
  }

  const tabs = [
    { id: 'friends', label: ft.tabFriends, count: friendsList.length },
    { id: 'requests', label: ft.tabRequests, count: pendingCount, alert: pendingCount > 0 },
    { id: 'add', label: ft.tabAdd },
    { id: 'messages', label: t.tabMessages, count: unreadTotal, alert: unreadTotal > 0 },
  ];

  return (
    <div className={`social-dock${open ? ' is-open' : ''}`}>
      {open && (
        <section className="social-panel" role="dialog" aria-label={t.title} aria-modal="false">
          {!inThread && (
            <header className="social-panel-head">
              <div className="social-panel-title">
                <span className="social-panel-kicker"><SocialIcon size={14} /> {t.title}</span>
                <span className="social-panel-sub">{subtitle}</span>
              </div>
              <div className="social-panel-tools">
                <button
                  type="button"
                  className={`social-tool${refreshing ? ' is-spinning' : ''}`}
                  aria-label={ft.refresh}
                  title={ft.refresh}
                  disabled={refreshing}
                  onClick={refreshAll}
                >
                  <RefreshIcon />
                </button>
                <button type="button" className="social-tool" aria-label={ft.close} title={ft.close} onClick={closeAll}>
                  <CloseIcon />
                </button>
              </div>
            </header>
          )}
          {inThread && (
            <span className="social-panel-tools social-panel-tools-float">
              <button type="button" className="social-tool" aria-label={ft.close} title={ft.close} onClick={closeAll}>
                <CloseIcon />
              </button>
            </span>
          )}
          {!inThread && (
            <nav className="social-tabs" aria-label={t.title}>
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`social-tab${tab === item.id ? ' is-active' : ''}${item.alert ? ' has-alert' : ''}`}
                  onClick={() => selectTab(item.id)}
                  aria-pressed={tab === item.id}
                >
                  {item.label}
                  {item.count != null && item.count > 0 && <span className="social-tab-count">{item.count}</span>}
                </button>
              ))}
            </nav>
          )}
          {body}
          {mode === 'demo' && <footer className="social-panel-foot">{t.demoNote}</footer>}
        </section>
      )}
      <button
        type="button"
        className={`social-launcher${unreadTotal > 0 || pendingCount > 0 ? ' has-alert' : ''}`}
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? t.launcherClose : t.launcherOpen}
        title={open ? t.launcherClose : t.launcherOpen}
      >
        <span className="social-launcher-icon"><SocialIcon /></span>
        <span className="social-launcher-label">{t.launcher}</span>
        <span className="social-launcher-meta">
          <span className={`social-launcher-dot${onlineCount > 0 ? ' is-online' : ''}`} aria-hidden="true" />
          {onlineCount} {ft.online}
        </span>
        {unreadTotal > 0 && (
          <span className="social-launcher-meta social-launcher-meta-unread">{unreadTotal} {mt.unread}</span>
        )}
        {unreadTotal > 0 && (
          <span className="social-launcher-badge social-launcher-badge-unread" aria-label={fill(mt.unreadCount, { count: unreadTotal })}>
            {unreadTotal}
          </span>
        )}
        {pendingCount > 0 && (
          <span className="social-launcher-badge social-launcher-badge-requests" aria-label={`${pendingCount} ${ft.tabRequests}`}>
            {pendingCount}
          </span>
        )}
      </button>
    </div>
  );
}
