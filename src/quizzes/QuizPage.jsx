import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import Comments from '../components/Comments';
import NotFound from '../pages/NotFound';
import { quizBySlug, quizLabel, quizzes } from '../quizzesData';
import { dailyQuizFor } from './engine';
import QuizLeaderboard from './QuizLeaderboard';
import QuizPlayer from './QuizPlayer';
import SurvivalPage from './SurvivalPage';

/**
 * Une partie de quizz : `/quizz/:slug` (alias anglais `/quiz/:slug`).
 * Le fil de commentaires est celui de la route courante (`article_id` =
 * pathname), comme sur les articles — aucune configuration supplémentaire.
 */
export default function QuizPage() {
  const { slug } = useParams();
  const { t, lang } = useLanguage();
  const [board, setBoard] = useState(null);
  const [plays, setPlays] = useState(0);
  // Niveau courant : piloté par le lecteur (sélecteur de l'écran d'intro) et
  // suivi par le classement, qui affiche le palier choisi.
  const [level, setLevel] = useState('easy');
  const quiz = quizBySlug(slug);
  if (slug === 'survival') return <SurvivalPage />;
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
          level={level}
          onLevelChange={setLevel}
          onBoard={setBoard}
          onFinish={() => setPlays((count) => count + 1)}
        />
        <QuizLeaderboard quiz={quiz} level={level} lastBoard={board} refreshKey={plays} />
      </section>
      <section className="quiz-comments wrap">
        <h2>{copy.commentTitle}</h2>
        <Comments />
      </section>
    </div>
  );
}
