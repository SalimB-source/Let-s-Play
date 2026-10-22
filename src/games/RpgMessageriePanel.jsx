import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../auth/AuthContext.jsx';
import { LanguageContext, SITE_LANG } from '../i18n/LanguageContext.jsx';
import { useFriends } from '../friends/FriendsContext.jsx';
import { describeFriendsError, fill, friendsText } from '../friends/friendsCopy.js';
import { useMessages } from '../messages/MessagesContext.jsx';
import { useCalls } from '../messages/CallsContext.jsx';
import { callsText } from '../messages/callsCopy.js';
import { describeMessagesError, messagesText } from '../messages/messagesCopy.js';
import { InboxView, ThreadView } from '../messages/MessagesTabs.jsx';
import LetsTalkLogo, { LetsTalkMark } from '../social/LetsTalkLogo.jsx';
import { socialText } from '../social/socialCopy.js';
import './rpg-messagerie-panel.css';

/**
 * La messagerie Let’s Talk **dans** le Sablier — `src/games/RpgMessageriePanel.jsx`
 * -----------------------------------------------------------------------------
 * Le jeu est une couche plein écran (`rpg-battle.css`, z-index 1500) : au
 * téléphone, la fenêtre sociale du site — un volet posé par-dessus le `<body>`
 * — reste peinte **sous** le jeu, invisible, et le plein écran natif de la
 * coque (APK, lancement d’une partie) la relègue carrément derrière. La
 * messagerie est pourtant le canal des défis du duel en ligne (la carte
 * « Défi du Sablier ») : elle fait partie du jeu, elle y vit donc.
 *
 * Deux montages, un seul composant :
 *
 *   - **`variante="ecran"`** — le contenu de l’onglet « Messagerie » du menu
 *     principal (`RpgDuelPage.jsx`) : la messagerie a son onglet, comme le
 *     Souk ou le Catalogue ;
 *   - **`variante="volet"`** — un voile qui se pose **au-dessus de la table**
 *     pendant un duel (entrée « Messagerie » du panneau du hamburger, et
 *     barre du salon en ligne) : un défi reçu se lit sans quitter la partie,
 *     le duel reprend où il en était à la fermeture — rien n’est démonté.
 *
 * Les données et les gestes sont ceux des contextes (`MessagesContext`,
 * `FriendsContext`, `CallsContext`) : aucune logique dupliquée, les mêmes
 * composants de liste et de fil que la fenêtre sociale et la page
 * `/messages` (`MessagesTabs`). La feuille dédiée force le thème sombre du
 * jeu (`rpg-messagerie-panel.css`) : la messagerie garde ses couleurs de site
 * dans une table toujours nocturne, même quand le visiteur est en thème clair.
 *
 * Sans compte (contexte inerte ou visiteur), le panneau explique la connexion
 * au lieu d’afficher une boîte vide — comme le fait la page `/messages`.
 * Le montage se passe de routeur (`useContext(AuthContext)`,
 * `useContext(LanguageContext)`, lien en clair) : la page du jeu se monte
 * aussi hors `<BrowserRouter>` dans les vérifications jsdom, et les contextes
 * sans fournisseur restent inertes.
 */

function CloseIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function RefreshIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v5h-5" />
    </svg>
  );
}

function BackIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export default function RpgMessageriePanel({ variante = 'ecran', onFermer } = {}) {
  // `useContext` et non `useAuth()` / `useLanguage()` : le jeu se monte sans
  // fournisseur d’accès ni de langue dans les vérifications jsdom (le contexte
  // vaut alors `null`, la langue retombe sur celle du site).
  const auth = useContext(AuthContext);
  const compte = auth?.user ?? null;
  const langue = useContext(LanguageContext);
  const lang = langue?.lang ?? SITE_LANG;
  const friends = useFriends();
  const messages = useMessages();
  const calls = useCalls();
  const t = messagesText(lang);
  const ft = friendsText(lang);
  const ct = callsText(lang);
  const st = socialText(lang);

  // Discussion ouverte dans le panneau : `null` = liste des discussions.
  const [peerId, setPeerId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const {
    enabled: messagesEnabled, mode, status, error, conversations, blockedConversations, unreadTotal,
    unreadFor, threadFor, markRead, send, deleteMessage, clearConversation, block, unblock, report,
    canMessage, isBlocked, reportedReason, refresh: refreshMessages, viewThread,
  } = messages;

  const {
    enabled: friendsEnabled, status: friendsStatus, error: friendsError,
    friends: friendsList, onlineCount,
    isOnline, profileFor,
    refresh: refreshFriends,
  } = friends;

  const enabled = messagesEnabled || friendsEnabled;

  // Le fil affiché est signalé au contexte : le « ding » des messages reçus
  // se tait quand on les lit dans le jeu.
  useEffect(() => {
    viewThread(peerId);
    return () => viewThread(null);
  }, [peerId, viewThread]);

  // Discussion ouverte : les messages reçus passent en lus tout de suite.
  const activeUnread = peerId ? unreadFor(peerId) : 0;
  useEffect(() => {
    if (peerId && activeUnread > 0) markRead(peerId);
  }, [peerId, activeUnread, markRead]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([refreshFriends(), refreshMessages()]);
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  }, [refreshFriends, refreshMessages]);

  const subtitle = useMemo(() => (
    unreadTotal > 0
      ? fill(t.subtitle, { online: onlineCount, unread: unreadTotal, threads: conversations.length })
      : fill(ft.subtitle, { online: onlineCount, total: friendsList.length })
  ), [t, ft, onlineCount, unreadTotal, conversations.length, friendsList.length]);

  /* ---------------------------- le corps du panneau ------------------------ */

  let corps;
  if (!compte || !enabled) {
    // Visiteur : la connexion s’explique ici, comme sur la page de messagerie.
    corps = (
      <div className="rpg-messagerie__invite">
        <LetsTalkLogo variant="stacked" className="rpg-messagerie__invite-logo" title={st.title} />
        <p>{t.pageGuest}</p>
        <a className="rpg-messagerie__invite-lien" href={`${import.meta.env.BASE_URL}auth`}>
          {t.signInPrompt}
        </a>
      </div>
    );
  } else if (status === 'unavailable') {
    corps = <p className="messages-empty messages-unavailable">{t.unavailable}</p>;
  } else if (status === 'loading' || status === 'idle') {
    corps = <p className="messages-empty" aria-busy="true">{t.loading}</p>;
  } else if (status === 'error' && conversations.length === 0) {
    corps = (
      <div className="messages-empty">
        <p className="messages-inline-error" role="alert">{describeMessagesError(error, t)}</p>
        <button type="button" className="messages-action messages-action-primary" onClick={() => refreshMessages()}>{t.refresh}</button>
      </div>
    );
  } else if (peerId) {
    const peerProfile = profileFor(peerId);
    const activeEntry = conversations.find((entry) => entry.peerId === peerId)
      || blockedConversations.find((entry) => entry.peerId === peerId);
    const resolvedProfile = activeEntry?.profile || peerProfile
      || { id: peerId, name: String(peerId || '').slice(0, 8), avatar: null };
    corps = (
      <div className="messages-body is-thread">
        <ThreadView
          peerId={peerId}
          t={t}
          ft={ft}
          ct={ct}
          lang={lang}
          thread={threadFor(peerId)}
          profile={resolvedProfile}
          online={isOnline(peerId)}
          blocked={isBlocked(peerId)}
          reported={reportedReason(peerId)}
          canWrite={canMessage(peerId)}
          onBack={() => setPeerId(null)}
          onCall={calls.startCall}
          callBlocker={calls.blockerFor}
          callWarning={calls.warningFor}
          onSend={send}
          onDelete={deleteMessage}
          onClear={clearConversation}
          onBlock={block}
          onUnblock={unblock}
          onReport={(reason, note) => report(peerId, reason, note)}
        />
      </div>
    );
  } else {
    corps = (
      <div className="messages-body">
        <InboxView
          t={t}
          ft={ft}
          friends={friendsList}
          lang={lang}
          conversations={conversations}
          blocked={blockedConversations}
          isOnline={isOnline}
          profileLabel={ft.profileShort}
          onOpen={setPeerId}
          onUnblock={unblock}
        />
        {friendsStatus === 'unavailable' && (
          <p className="friends-empty friends-unavailable">{ft.unavailable}</p>
        )}
        {friendsStatus === 'error' && friendsList.length === 0 && (
          <p className="friends-inline-error" role="alert">{describeFriendsError(friendsError, ft)}</p>
        )}
      </div>
    );
  }

  return (
    <section
      className={`rpg-messagerie rpg-messagerie--${variante}`}
      aria-label={`${st.title} — la messagerie du Sablier`}
    >
      <header className="rpg-messagerie__barre">
        {peerId ? (
          <button
            type="button"
            className="rpg-messagerie__outil"
            onClick={() => setPeerId(null)}
            aria-label={t.back}
            title={t.back}
          >
            <BackIcon />
          </button>
        ) : (
          <LetsTalkMark className="rpg-messagerie__mark" typing={unreadTotal > 0} />
        )}
        <div className="rpg-messagerie__titre">
          <span className="rpg-messagerie__eyebrow">LET’S TALK · LE SABLIER</span>
          <strong className="rpg-messagerie__nom">Messagerie</strong>
          <span className="rpg-messagerie__sous-titre">{subtitle}</span>
        </div>
        <div className="rpg-messagerie__outils">
          <button
            type="button"
            className={`rpg-messagerie__outil${refreshing ? ' is-spinning' : ''}`}
            onClick={refreshAll}
            disabled={refreshing}
            aria-label={ft.refresh}
            title={ft.refresh}
          >
            <RefreshIcon />
          </button>
          {variante === 'volet' && onFermer && (
            <button
              type="button"
              className="rpg-messagerie__outil"
              onClick={onFermer}
              aria-label={ft.close}
              title={ft.close}
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </header>
      <div className="rpg-messagerie__corps">{corps}</div>
      {mode === 'demo' && (
        <footer className="rpg-messagerie__pied">{t.demoNote}</footer>
      )}
    </section>
  );
}
