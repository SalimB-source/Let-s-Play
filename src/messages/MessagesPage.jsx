import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useFriends } from '../friends/FriendsContext';
import { fill, friendsText } from '../friends/friendsCopy';
import { useMessages } from './MessagesContext';
import { describeMessagesError, messagesText } from './messagesCopy';
import { InboxView, ThreadView } from './MessagesTabs';

/**
 * Page de messagerie — `/messages` (liste) et `/messages/:peerId`
 * (discussion ouverte ; alias `/messagerie`).
 * ----------------------------------------------------------------------
 * La messagerie est un **pop-up** sur bureau (la fenêtre sociale), mais une
 * **vraie page** sur mobile : plein écran, de grands appuis, le clavier qui
 * pousse le champ — le parcours familier d'une app de chat. La page sert
 * aussi sur bureau (deux colonnes : discussions à gauche, fil à droite),
 * praticable au clavier et partageable par URL.
 *
 * Les données et les gestes restent ceux du contexte (`MessagesContext`) :
 * aucune logique dupliquée. La discussion affichée est lue dans l'URL, le
 * contexte suit via `viewThread` (pour couper le « ding » des messages qui
 * arrivent sous les yeux), et les messages reçus du fil affiché passent en
 * lus tout de suite.
 */

function RefreshIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v5h-5" />
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

export default function MessagesPage() {
  const { peerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLanguage();
  const { user } = useAuth();
  const friends = useFriends();
  const messages = useMessages();
  const t = messagesText(lang);
  const ft = friendsText(lang);

  const {
    enabled, mode, status, error, conversations, blockedConversations, unreadTotal,
    unreadFor, threadFor, markRead, send, deleteMessage, block, unblock, report,
    canMessage, isBlocked, reportedReason, refresh, viewThread,
  } = messages;

  const [refreshing, setRefreshing] = useState(false);
  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([friends.refresh(), refresh()]);
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  // Fil affiché par l'URL : le contexte le suit (pas de « ding » pour un
  // message qui arrive dans la discussion ouverte sous les yeux) ; en quittant
  // le fil, on le rend à nouveau « non vu ».
  useEffect(() => {
    viewThread(peerId || null);
    return () => viewThread(null);
  }, [peerId, viewThread]);

  // Discussion ouverte : les messages reçus passent en lus tout de suite.
  const activeUnread = peerId ? unreadFor(peerId) : 0;
  useEffect(() => {
    if (peerId && activeUnread > 0) markRead(peerId);
  }, [peerId, activeUnread, markRead]);

  // Échap remonte à la liste des discussions.
  useEffect(() => {
    if (!peerId || typeof document === 'undefined') return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') navigate('/messages');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [peerId, navigate]);

  const subtitle = useMemo(() => (
    unreadTotal > 0
      ? fill(t.subtitle, { online: friends.onlineCount, unread: unreadTotal, threads: conversations.length })
      : fill(ft.subtitle, { online: friends.onlineCount, total: friends.friends.length })
  ), [t, ft, friends.onlineCount, friends.friends.length, unreadTotal, conversations.length]);

  if (!user) {
    return (
      <section className="messages-page">
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
  const backToInbox = () => navigate('/messages');

  const peerProfile = peerId ? friends.profileFor(peerId) : null;
  const activeEntry = peerId
    ? (conversations.find((entry) => entry.peerId === peerId)
      || blockedConversations.find((entry) => entry.peerId === peerId))
    : null;
  const resolvedProfile = activeEntry?.profile || peerProfile
    || { id: peerId, name: String(peerId || '').slice(0, 8), avatar: null };

  // Liste des discussions (états de chargement / erreur compris).
  let inboxBody;
  if (status === 'unavailable') {
    inboxBody = <p className="messages-empty messages-unavailable">{t.unavailable}</p>;
  } else if (status === 'loading' || status === 'idle') {
    inboxBody = <p className="messages-empty" aria-busy="true">{t.loading}</p>;
  } else if (status === 'error' && conversations.length === 0) {
    inboxBody = (
      <div className="messages-empty">
        <p className="messages-inline-error" role="alert">{describeMessagesError(error, t)}</p>
        <button type="button" className="messages-action messages-action-primary" onClick={() => refresh()}>{t.refresh}</button>
      </div>
    );
  } else {
    inboxBody = (
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

  return (
    <section className="messages-page">
      <div className="wrap">
        <header className="messages-page-head">
          <div className="messages-page-heading">
            <span className="messages-page-kicker"><ChatBubbleIcon size={15} /> {t.title}</span>
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

        <div className={`messages-page-body${peerId ? ' has-thread' : ''}`}>
          <div className={`messages-page-list${peerId ? ' is-dimmed' : ''}`}>
            {inboxBody}
          </div>
          <div className={`messages-page-thread${peerId ? '' : ' is-empty'}`}>
            {peerId ? (
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
            ) : (
              <div className="messages-page-placeholder">
                <span className="messages-page-placeholder-icon"><ChatBubbleIcon /></span>
                <p>{t.pageEmpty}</p>
              </div>
            )}
          </div>
        </div>

        {mode === 'demo' && <footer className="messages-page-foot">{t.demoNote}</footer>}
        {status === 'error' && conversations.length > 0 && (
          <p className="messages-inline-error messages-page-error" role="alert">
            {describeMessagesError(error, t)}
          </p>
        )}
      </div>
    </section>
  );
}
