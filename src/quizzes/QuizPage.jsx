import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import Comments from '../components/Comments';
import NotFound from '../pages/NotFound';
import { quizBySlug, quizLabel, quizzes } from '../quizzesData';
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
  // Classements reçus du backend, gardés par slug : naviguer au « Niveau
  // suivant » ne montre jamais le classement du quizz précédent.
  const [boards, setBoards] = useState({});
  const [plays, setPlays] = useState(0);
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
        {/* `key={quiz.slug}` : le « Niveau suivant » du résultat navigue vers
            un autre quizz — le lecteur repart de son écran d'introduction. */}
        <QuizPlayer
          key={quiz.slug}
          quiz={quiz}
          daily={isDaily}
          onBoard={(board) => setBoards((all) => ({ ...all, [quiz.slug]: board }))}
          onFinish={() => setPlays((count) => count + 1)}
        />
        <QuizLeaderboard key={`board-${quiz.slug}`} quiz={quiz} lastBoard={boards[quiz.slug] || null} refreshKey={plays} />
      </section>
      <section className="quiz-comments wrap">
        <h2>{copy.commentTitle}</h2>
        <Comments />
      </section>
    </div>
  );
}
