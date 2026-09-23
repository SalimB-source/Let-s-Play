import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { useFriends } from '../friends/FriendsContext';
import { useMessages } from '../messages/MessagesContext';
import { useAchievementAction } from '../achievements/AchievementContext';
import { quizLabel } from '../quizzesData';

function Arrow() { return <span aria-hidden="true">↗</span>; }

const FALLBACK = {
  title: 'CHALLENGE A FRIEND',
  open: 'Challenge a friend',
  loginHint: 'Log in with a player account to challenge a friend.',
  noBackend: 'Messaging needs Supabase to be configured — scores travel with your account.',
  noFriends: 'Add friends to challenge them.',
  sent: 'Challenge sent to {name}',
  seeThread: 'Open the conversation',
  error: 'The challenge could not be sent.',
  message: '⚡ Let’s Play challenge: I scored {score} on the quiz “{title}”. Beat that if you can! ({route})',
};

/**
 * Défi entre amis : depuis l'écran de résultat, envoie à un ami (messagerie
 * 1-à-1 existante) un message pré-rempli avec le score à battre. Fonctionne
 * en mode démo comme avec Supabase ; sans compte, un message l'explique.
 * Chaque défi envoyé crédite l'action `quiz_challenge` (succès dédié).
 */
export default function QuizChallenge({ quiz, score, total }) {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const friends = useFriends();
  const messages = useMessages();
  const track = useAchievementAction();
  const [open, setOpen] = useState(false);
  const [sentTo, setSentTo] = useState(null);
  const [failed, setFailed] = useState(false);
  const copy = { ...FALLBACK, ...((t.quiz || {}).challenge || {}) };

  if (!user) return <p className="quiz-challenge-note">{copy.loginHint}</p>;
  if (!friends.enabled || !messages.enabled) return <p className="quiz-challenge-note">{copy.noBackend}</p>;

  const title = quizLabel(quiz.labels, lang)?.title || quiz.slug;
  const challengeText = copy.message
    .replace('{score}', `${score}/${total}`)
    .replace('{title}', title)
    .replace('{route}', quiz.route);

  const sendChallenge = async (friend) => {
    setFailed(false);
    try {
      await messages.send(friend.id, challengeText);
      track('quiz_challenge');
      setSentTo(friend);
      setOpen(false);
    } catch (e) {
      setFailed(true);
    }
  };

  return (
    <div className="quiz-challenge">
      <div className="section-label"><span>{copy.title}</span><span>{score}/{total}</span></div>
      {sentTo ? (
        <p className="quiz-challenge-note quiz-challenge-sent">
          {copy.sent.replace('{name}', sentTo.name || sentTo.id)}{' '}
          <button type="button" className="arrow-link" onClick={() => messages.viewThread(sentTo.id)}>
            {copy.seeThread} <Arrow />
          </button>
        </p>
      ) : (
        <>
          <button type="button" className="button button-ghost" aria-expanded={open} onClick={() => setOpen(!open)}>
            {copy.open} {friends.friends.length ? `(${friends.friends.length})` : ''}
          </button>
          {open && (friends.friends.length === 0 ? (
            <p className="quiz-challenge-note">{copy.noFriends}</p>
          ) : (
            <ul className="quiz-challenge-list">
              {friends.friends.map((friend) => (
                <li key={friend.id}>
                  <button type="button" className="quiz-challenge-friend" onClick={() => sendChallenge(friend)}>
                    <span className="quiz-challenge-avatar" aria-hidden="true">
                      {friend.avatar ? <img src={friend.avatar} alt="" loading="lazy" referrerPolicy="no-referrer" /> : (friend.name || '?').slice(0, 1)}
                    </span>
                    <span className="quiz-challenge-name">{friend.name || friend.id}</span>
                    <span aria-hidden="true">⚡</span>
                  </button>
                </li>
              ))}
            </ul>
          ))}
          {failed && <p className="quiz-challenge-note quiz-challenge-error">{copy.error}</p>}
        </>
      )}
    </div>
  );
}
