import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import Comments from '../components/Comments';
import NotFound from '../pages/NotFound';
import { quizBySlug, quizLabel, quizzes } from '../quizzesData';
import { quizAttemptId } from './quizApi';
import { dailyQuizFor } from './engine';
import QuizLeaderboard from './QuizLeaderboard';
import QuizPlayer from './QuizPlayer';

/**
 * Une partie de quizz : `/quizz/:slug` (alias anglais `/quiz/:slug`).
 * Le fil de commentaires est celui de la route courante (`article_id` =
 * pathname), comme sur les articles — aucune configuration supplémentaire.
 * Le classement affiché est celui du run JOUÉ (quizz + difficulté, identifié
 * par `slug:difficulté`) — au départ, celui de la difficulté par défaut du
 * quizz.
 */
export default function QuizPage() {
  const { slug } = useParams();
  const { t, lang } = useLanguage();
  const [board, setBoard] = useState(null);
  const [plays, setPlays] = useState(0);
  const [lastRunId, setLastRunId] = useState(null);
  const quiz = quizBySlug(slug);
  if (!quiz) return <NotFound />;

  const copy = { dailyTag: 'Daily quiz', commentTitle: 'Comments', ...((t.quiz || {}).page || {}) };
  const isDaily = dailyQuizFor(new Date(), quizzes)?.slug === quiz.slug;

  return (
    <div className="quiz-page">
      <section className="quiz-header wrap">
        <div className="section-label">
          <span>{isDaily ? copy.dailyTag : 'QUIZZ'}</span>
          <span>{quizLabel(quiz.labels, lang)?.title || quiz.slug}</span>
        </div>
      </section>
      <section className="wrap">
        <QuizPlayer
          quiz={quiz}
          daily={isDaily}
          onBoard={setBoard}
          onFinish={(_graded, difficulty) => {
            setPlays((count) => count + 1);
            setLastRunId(quizAttemptId(quiz.slug, difficulty));
          }}
        />
        <QuizLeaderboard
          quiz={quiz}
          lastBoard={board}
          refreshKey={plays}
          runId={lastRunId || quizAttemptId(quiz.slug, quiz.difficulty)}
        />
      </section>
      <section className="quiz-comments wrap">
        <h2>{copy.commentTitle}</h2>
        <Comments />
      </section>
    </div>
  );
}
