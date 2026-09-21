import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useFriends } from '../friends/FriendsContext';
import { AddTab, FriendsTab, RequestsTab } from '../friends/FriendsTabs';
import { describeFriendsError, fill, friendsText } from '../friends/friendsCopy';
import { useMessages } from './MessagesContext';
import { describeMessagesError, messagesText } from './messagesCopy';
import { InboxView, ThreadView } from './MessagesTabs';

/**
 * Page sociale — `/messages` (liste) et `/messages/:peerId`
 * (discussion ouverte ; alias `/messagerie`).
 * ----------------------------------------------------------------------
 * Sur mobile, TOUTE la fenêtre sociale (amis + demandes + ajouter +
 * messagerie) vit sur cette page — pas de pop-up : plein écran, de grands
 * appuis, un vrai bouton retour (qui ramène à la page précédente, pas
 * « derrière » un overlay), et les onglets Amis / Demandes / Ajouter /
 * Messages permettent de naviguer sans être piégé.
 *
 * Sur bureau, la page garde son affichage deux-colonnes (liste à gauche,
 * fil à droite) qui reste praticable au clavier et partageable par URL ;
 * le dock flottant reste le parcours compact.
 *
 * Les données et les gestes restent ceux du contexte (`MessagesContext` /
 * `FriendsContext`) : aucune logique dupliquée.
 */

function RefreshIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v5h-5" />
    </svg>
  );
}

function BackIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

function ChatBubbleIcon({ size = 42 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 12.2c0 4-3.8 7.2-8.5 7.2-1 0-2-.15-2.9-.42L4.5 20.5l1.2-3.3C4.3 15.9 3.5 14.1 3.5 12.2 3.5 8.2 7.3 5 12 5s8.5 3.2 8.5 7.2z" />
      <path d="M8.5 11h7M8.5 14h4.5" />
    </svg>
  );
}

function PeopleIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 19c.7-3.2 3.2-4.8 6.5-4.8s5.8 1.6 6.5 4.8" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 15c2.5-.3 4.5 1 5.5 4" />
    </svg>
  );
}

export default function MessagesPage() {
  const { peerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const friends = useFriends();
  const messages = useMessages();
  const t = messagesText(lang);
  const ft = friendsText(lang);

  // Onglet actif (lecture depuis ?tab=friends|requests|add|messages).
  // Quand un fil est ouvert (peerId), on est implicitement sur Messages.
  const rawTab = searchParams.get('tab') || 'messages';
  const activeTab = peerId ? 'messages' : (['friends', 'requests', 'add', 'messages'].includes(rawTab) ? rawTab : 'messages');

  const {
    enabled: messagesEnabled, mode, status, error, conversations, blockedConversations, unreadTotal,
    unreadFor, threadFor, markRead, send, deleteMessage, block, unblock, report,
    canMessage, isBlocked, reportedReason, refresh: refreshMessages, viewThread,
  } = messages;

  const {
    enabled: friendsEnabled, status: friendsStatus, error: friendsError,
    friends: friendsList, incoming, outgoing, onlineCount, pendingCount,
    accept, decline, cancel, unfriend, search, isOnline, relationWith,
    refresh: refreshFriends, openThread: friendsOpenThread,
  } = friends;

  const enabled = messagesEnabled || friendsEnabled;

  const [refreshing, setRefreshing] = useState(false);
  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([refreshFriends(), refreshMessages()]);
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  // Le fil affiché dans l'URL est signalé au contexte pour couper le ding
  // des messages qui arrivent sous les yeux.
  useEffect(() => {
    viewThread(peerId || null);
    return () => viewThread(null);
  }, [peerId, viewThread]);

  // Discussion ouverte : les messages reçus passent en lus tout de suite.
  const activeUnread = peerId ? unreadFor(peerId) : 0;
  useEffect(() => {
    if (peerId && activeUnread > 0) markRead(peerId);
  }, [peerId, activeUnread, markRead]);

  // Échap : d'abord on ferme le fil → liste, sinon on quitte la page.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (peerId) { navigate('/messages'); return; }
      if (document.referrer && window.history.length > 1) navigate(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [peerId, navigate]);

  const subtitle = useMemo(() => {
    if (activeTab === 'messages') {
      return unreadTotal > 0
        ? fill(t.subtitle, { online: onlineCount, unread: unreadTotal, threads: conversations.length })
        : fill(ft.subtitle, { online: onlineCount, total: friendsList.length });
    }
    return fill(ft.subtitle, { online: onlineCount, total: friendsList.length });
  }, [t, ft, activeTab, friendsList.length, onlineCount, unreadTotal, conversations.length]);

  // Quitter la page sociale : on revient là où l'utilisateur était.
  const leaveSocial = () => {
    if (window.history.length > 1 && location.key !== 'default') {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const selectTab = (tabId) => {
    if (peerId) {
      // On quitte une discussion pour changer d'onglet → retour à la liste.
      navigate(tabId === 'messages' ? '/messages' : `/messages?tab=${tabId}`);
      return;
    }
    if (tabId === 'messages') setSearchParams({});
    else setSearchParams({ tab: tabId });
  };

  if (!user) {
    return (
      <section className="messages-page social-page">
        <div className="wrap">
          <div className="messages-page-card messages-page-guest">
            <span className="messages-page-guest-icon"><ChatBubbleIcon /></span>
            <h1 className="messages-page-guest-title">{t.title}</h1>
            <p>{t.pageGuest}</p>
            <Link
              to="/auth"
              state={{ from: `${location.pathname}${location.search}${location.hash}`, mode: 'signin' }}
              className="button button-yellow"
            >
              {t.signInPrompt}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!enabled) return null;

  const openConversation = (id) => navigate(`/messages/${encodeURIComponent(id)}`);
  const backToInbox = () => navigate(activeTab === 'messages' ? '/messages' : `/messages?tab=${activeTab}`);

  const peerProfile = peerId ? friends.profileFor(peerId) : null;
  const activeEntry = peerId
    ? (conversations.find((entry) => entry.peerId === peerId)
      || blockedConversations.find((entry) => entry.peerId === peerId))
    : null;
  const resolvedProfile = activeEntry?.profile || peerProfile
    || { id: peerId, name: String(peerId || '').slice(0, 8), avatar: null };

  // ------- Contenu selon l'onglet -------

  // Boîte de réception / discussions.
  let messagesBody;
  if (status === 'unavailable') {
    messagesBody = <p className="messages-empty messages-unavailable">{t.unavailable}</p>;
  } else if (status === 'loading' || status === 'idle') {
    messagesBody = <p className="messages-empty" aria-busy="true">{t.loading}</p>;
  } else if (status === 'error' && conversations.length === 0) {
    messagesBody = (
      <div className="messages-empty">
        <p className="messages-inline-error" role="alert">{describeMessagesError(error, t)}</p>
        <button type="button" className="messages-action messages-action-primary" onClick={() => refreshMessages()}>{t.refresh}</button>
      </div>
    );
  } else {
    messagesBody = (
      <InboxView
        t={t}
        lang={lang}
        conversations={conversations}
        blocked={blockedConversations}
        isOnline={friends.isOnline}
        onOpen={openConversation}
        onUnblock={unblock}
      />
    );
  }

  // Listes d'amis.
  let friendsBody;
  if (friendsStatus === 'unavailable') {
    friendsBody = <p className="friends-empty friends-unavailable">{ft.unavailable}</p>;
  } else if (friendsStatus === 'loading' || friendsStatus === 'idle') {
    friendsBody = <p className="friends-empty" aria-busy="true">{ft.loading}</p>;
  } else if (friendsStatus === 'error' && friendsList.length === 0) {
    friendsBody = null; // handled below by falling back to messages
  } else if (activeTab === 'requests') {
    friendsBody = <RequestsTab incoming={incoming} outgoing={outgoing} t={ft} lang={lang} accept={accept} decline={decline} cancel={cancel} />;
  } else if (activeTab === 'add') {
    friendsBody = <AddTab t={ft} lang={lang} search={search} isOnline={isOnline} relationWith={relationWith} />;
  } else if (activeTab === 'friends') {
    friendsBody = (
      <FriendsTab
        friends={friendsList}
        t={ft}
        lang={lang}
        unfriend={unfriend}
        onOpenThread={openConversation}
        chatLabel={t.openChat}
        profileLabel={ft.profileShort}
      />
    );
  }

  const tabs = [
    { id: 'friends', label: ft.tabFriends, count: friendsList.length, icon: <PeopleIcon size={13} /> },
    { id: 'requests', label: ft.tabRequests, count: pendingCount, alert: pendingCount > 0 },
    { id: 'add', label: ft.tabAdd },
    { id: 'messages', label: t.title, count: unreadTotal, alert: unreadTotal > 0, icon: <ChatBubbleIcon size={15} /> },
  ];

  const pageTitle = activeTab === 'messages' ? t.title : ft.tabFriends;

  return (
    <section className="messages-page social-page">
      <div className="wrap">
        <header className="messages-page-head social-page-head">
          <div className="messages-page-heading">
            <span className="messages-page-kicker">
              <button
                type="button"
                className="social-page-back"
                onClick={leaveSocial}
                aria-label={t.back || 'Retour'}
                title={t.back || 'Retour'}
              >
                <BackIcon />
              </button>
              {activeTab === 'messages' ? <ChatBubbleIcon size={18} /> : <PeopleIcon size={18} />}
              {pageTitle}
            </span>
            <span className="messages-page-sub">{subtitle}</span>
          </div>
          <div className="messages-page-tools">
            <button
              type="button"
              className={`messages-tool${refreshing ? ' is-spinning' : ''}`}
              aria-label={ft.refresh}
              title={ft.refresh}
              disabled={refreshing}
              onClick={refreshAll}
            >
              <RefreshIcon />
            </button>
          </div>
        </header>

        {/* Onglets sociaux — toujours visibles sur la page, permettant
            de naviguer entre Amis / Demandes / Ajouter / Messages sans
            jamais être « piégé » dans un onglet. */}
        <nav className="social-page-tabs" aria-label={pageTitle}>
          {tabs.map((item) => {
            const isActive = activeTab === item.id && !peerId;
            return (
              <button
                key={item.id}
                type="button"
                className={`social-page-tab${isActive ? ' is-active' : ''}${item.alert ? ' has-alert' : ''}`}
                onClick={() => selectTab(item.id)}
                aria-pressed={isActive}
              >
                {item.icon && <span className="social-page-tab-icon">{item.icon}</span>}
                <span className="social-page-tab-label">{item.label}</span>
                {item.count != null && item.count > 0 && <span className="social-page-tab-count">{item.count}</span>}
              </button>
            );
          })}
        </nav>

        {peerId ? (
          // ---- Discussion ouverte (fil) ----
          <div className="messages-page-body messages-page-body-thread">
            <div className="messages-page-thread">
              <ThreadView
                peerId={peerId}
                t={t}
                ft={ft}
                lang={lang}
                thread={threadFor(peerId)}
                profile={resolvedProfile}
                online={friends.isOnline(peerId)}
                blocked={isBlocked(peerId)}
                reported={reportedReason(peerId)}
                canWrite={canMessage(peerId)}
                onBack={backToInbox}
                onSend={send}
                onDelete={deleteMessage}
                onBlock={block}
                onUnblock={unblock}
                onReport={(reason, note) => report(peerId, reason, note)}
              />
            </div>
          </div>
        ) : activeTab === 'messages' ? (
          // ---- Boîte de réception ----
          <div className="messages-page-body">
            <div className="messages-page-list">
              {messagesBody}
            </div>
            <div className="messages-page-thread is-empty">
              <div className="messages-page-placeholder">
                <span className="messages-page-placeholder-icon"><ChatBubbleIcon /></span>
                <p>{t.pageEmpty}</p>
              </div>
            </div>
          </div>
        ) : (
          // ---- Amis / Demandes / Ajouter ----
          <div className="social-page-panel">
            {friendsBody || <p className="friends-empty">{ft.loading}</p>}
          </div>
        )}

        {mode === 'demo' && <footer className="messages-page-foot">{t.demoNote}</footer>}
        {status === 'error' && conversations.length > 0 && (
          <p className="messages-inline-error messages-page-error" role="alert">
            {describeMessagesError(error, t)}
          </p>
        )}
        {friendsError && friendsList.length > 0 && (
          <p className="friends-inline-error social-page-error" role="alert">
            {describeFriendsError(friendsError, ft)}
          </p>
        )}
      </div>
    </section>
  );
}
