import React from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import Comments from '../components/Comments';
import NotFound from '../pages/NotFound';
import { quizBySlug, quizLabel, quizzes } from '../quizzesData';
import { dailyQuizFor } from './engine';
import QuizPlayer from './QuizPlayer';

/**
 * Une partie de quizz : `/quizz/:slug` (alias anglais `/quiz/:slug`).
 * Le fil de commentaires est celui de la route courante (`article_id` =
 * pathname), comme sur les articles — aucune configuration supplémentaire.
 */
export default function QuizPage() {
  const { slug } = useParams();
  const { t } = useLanguage();
  const quiz = quizBySlug(slug);
  if (!quiz) return <NotFound />;

  const copy = { dailyTag: 'Daily quiz', commentTitle: 'Comments', ...((t.quiz || {}).page || {}) };
  const isDaily = dailyQuizFor(new Date(), quizzes)?.slug === quiz.slug;

  return (
    <div className="quiz-page">
      <section className="quiz-header wrap">
        <div className="section-label">
          <span>{isDaily ? copy.dailyTag : 'QUIZZ'}</span>
          <span>{quizLabel(quiz.labels, 'fr')?.title || quiz.slug}</span>
        </div>
      </section>
      <section className="wrap">
        <QuizPlayer quiz={quiz} daily={isDaily} />
      </section>
      <section className="quiz-comments wrap">
        <h2>{copy.commentTitle}</h2>
        <Comments />
      </section>
    </div>
  );
}
