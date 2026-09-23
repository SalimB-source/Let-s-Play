import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAchievements } from '../achievements/AchievementContext';
import Comments from '../components/Comments';
import NotFound from '../pages/NotFound';
import { quizBySlug, quizLabel, quizzes, isQuizLocked, isEasyModeFinished, EASY_SLUGS } from '../quizzesData';
import { dailyQuizFor } from './engine';
import QuizLeaderboard from './QuizLeaderboard';
import QuizPlayer from './QuizPlayer';

/**
 * Une partie de quizz : `/quizz/:slug` (alias anglais `/quiz/:slug`).
 * Le fil de commentaires est celui de la route courante (`article_id` =
 * pathname), comme sur les articles — aucune configuration supplémentaire.
 */
export default function QuizPage() {
  const { slug } = useParams();
  const { t, lang } = useLanguage();
  const { state } = useAchievements();
  const [board, setBoard] = useState(null);
  const [plays, setPlays] = useState(0);
  const quiz = quizBySlug(slug);
  if (!quiz) return <NotFound />;

  const quizT = t.quiz || {};
  const lockedT = quizT.locked || {};
  const pageT = quizT.page || {};
  const copy = {
    dailyTag: 'Daily quiz',
    commentTitle: 'Comments',
    locked: 'Locked',
    lockedHint: 'Finish easy mode to unlock',
    lockedNeed: 'Complete all easy quizzes ({done}/{total}) to unlock Confirmé & Expert.',
    lockedTitle: 'Difficulty locked',
    lockedDesc: 'You must finish easy mode first.',
    goEasy: 'Play easy quizzes',
    backQuizzes: 'Back to quizzes',
    ...pageT,
    ...lockedT,
    commentTitle: pageT.commentTitle || 'Comments',
    dailyTag: pageT.dailyTag || quizT.dailyTag || 'Daily quiz',
  };
  const isDaily = dailyQuizFor(new Date(), quizzes)?.slug === quiz.slug;

  const quizzesPlayed = state?.sets?.quizzes_played || [];
  const locked = isQuizLocked(quiz, quizzesPlayed);
  const easyDone = EASY_SLUGS.filter((s) => quizzesPlayed.includes(s)).length;

  if (locked) {
    return (
      <div className="quiz-page">
        <section className="quiz-header wrap">
          <div className="section-label">
            <span>{isDaily ? copy.dailyTag : 'QUIZZ'}</span>
            <span>{quizLabel(quiz.labels, lang)?.title || quiz.slug}</span>
          </div>
        </section>
        <section className="wrap">
          <div className="quiz-player">
            <div className="quiz-player-intro is-locked">
              <div className="quiz-chips">
                <span className="quiz-chip">{quiz.tag}</span>
                <span className={`quiz-chip quiz-chip--${quiz.difficulty}`}>{quiz.difficulty} 🔒</span>
              </div>
              <h1>🔒 {copy.lockedTitle || copy.locked}</h1>
              <p>{copy.lockedDesc || copy.lockedHint}</p>
              <p className="quiz-locked-hint">🔒 {copy.lockedNeed.replace('{done}', String(easyDone)).replace('{total}', String(EASY_SLUGS.length))}</p>
              <div className="quiz-player-actions">
                <Link className="button button-yellow" to="/quizz">{copy.backQuizzes || 'Back'} ↗</Link>
              </div>
            </div>
          </div>
        </section>
        <section className="quiz-comments wrap">
          <h2>{copy.commentTitle}</h2>
          <Comments />
        </section>
      </div>
    );
  }

  return (
    <div className="quiz-page">
      <section className="quiz-header wrap">
        <div className="section-label">
          <span>{isDaily ? copy.dailyTag : 'QUIZZ'}</span>
          <span>{quizLabel(quiz.labels, lang)?.title || quiz.slug}</span>
        </div>
      </section>
      <section className="wrap">
        <QuizPlayer quiz={quiz} daily={isDaily} onBoard={setBoard} onFinish={() => setPlays((count) => count + 1)} />
        <QuizLeaderboard quiz={quiz} lastBoard={board} refreshKey={plays} />
      </section>
      <section className="quiz-comments wrap">
        <h2>{copy.commentTitle}</h2>
        <Comments />
      </section>
    </div>
  );
}
