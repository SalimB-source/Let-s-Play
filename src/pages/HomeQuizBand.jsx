import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { quizzes } from '../quizzesData';
import { dailyQuizFor } from '../quizzes/engine';
import { isQuizFinished } from '../quizzes/quizProgress';
import { useQuizProgress } from '../quizzes/useQuizProgress';
import { Arrow } from '../components/Arrow';

/**
 * Bandeau « quizz du jour » de la page d'accueil.
 * -----------------------------------------------
 * Un quizz choisi chaque jour parmi la sélection — la série quotidienne
 * (succès « Semaine parfaite ») se construit ici. Sauf si ce quizz est
 * TERMINÉ (ses trois niveaux faits) : il est alors verrouillé comme partout
 * ailleurs, et le bouton mène à la grille des quizz.
 *
 * Ce bandeau vit dans son propre module parce qu'il est le seul morceau de
 * l'accueil qui ait besoin du catalogue des quizz (`src/quizzesData.js`, 226 ko
 * de questions et de libellés) : `src/pages/Home.jsx` le charge à la demande
 * (`lazy`), juste sous le héros. Le catalogue n'attend donc plus devant le
 * premier écran — il arrive avec la section, plus bas dans la page.
 *
 * `today` est fourni par l'accueil : il porte l'horloge simulée du bandeau
 * « le plus attendu » (`?at=`, `clockOffset()`), pour que les deux bandeaux
 * parlent du même jour.
 */
export default function HomeQuizBand({ today }) {
  const { t } = useLanguage();
  const { progress } = useQuizProgress();
  const dailyQuiz = dailyQuizFor(today, quizzes);
  const dailyQuizFinished = Boolean(dailyQuiz) && isQuizFinished(progress, dailyQuiz.slug);

  return (
    <section className="wrap" id="quizz-du-jour">
      <div className={`home-quiz-band${dailyQuizFinished ? ' is-finished' : ''}`}>
        <div className="home-quiz-band-copy">
          <p className="eyebrow">
            {dailyQuizFinished ? null : <span className="live-dot" />} {t.quiz.home.eyebrow}
            {dailyQuizFinished && <span className="quiz-chip quiz-chip--levels is-complete">✓ {t.quiz.finished}</span>}
          </p>
          <h2>{t.quiz.home.titleA}<br /><em>{t.quiz.home.titleB}</em></h2>
          <p>{dailyQuizFinished ? t.quiz.home.done : t.quiz.home.text}</p>
        </div>
        <Link
          className="button button-yellow"
          to={dailyQuiz && !dailyQuizFinished ? dailyQuiz.route : '/quizz'}
        >
          {dailyQuizFinished ? t.quiz.home.ctaAll : t.quiz.home.cta} <Arrow />
        </Link>
      </div>
    </section>
  );
}
