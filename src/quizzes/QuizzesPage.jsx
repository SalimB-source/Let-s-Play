import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAchievements } from '../achievements/AchievementContext';
import VideoThumb from '../components/VideoThumb';
import { clockOffset } from '../components/ReleasesCalendar';
import { QUIZ_LEVELS, quizzes, quizLabel, quizQuestionsCount } from '../quizzesData';
import { readLocalBest, formatBest } from './quizApi';
import { levelsDone } from './quizProgress';
import { useQuizProgress } from './useQuizProgress';
import { bestDayRun, dailyQuizFor } from './engine';

function Arrow() { return <span aria-hidden="true">↗</span>; }

const FALLBACK = {
  label: 'QUIZZES / GAMING', titleA: 'PROVE YOUR', titleB: 'GAME KNOWLEDGE.',
  intro: 'Quizzes written by the editorial team: general culture, retro, souls-likes, RPGs, e-sport, studios, tech and cinema. Every quiz plays in three levels — easy opens the doors, seasoned then expert unlock as you go.',
  dailyEyebrow: 'Daily quiz', dailyHint: 'One quiz picked every day — come back tomorrow to keep your streak.',
  streak: 'Streak', questionsCount: '{n} questions', play: 'Play',
  nextIn: 'New quiz in {t}', best: 'Best: {s}',
  levels: { easy: 'Easy', medium: 'Seasoned', hard: 'Expert' },
  levelProgress: '{done}/{total} levels',
};

/** Minutes restantes avant le prochain quizz du jour (minuit local). */
function minutesToNextQuiz(now) {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 60000));
}

function formatCountdown(totalMinutes, lang) {
  const h = Math.floor(totalMinutes / 60);
  const m = String(totalMinutes % 60).padStart(2, '0');
  if (lang === 'en') return `${h}h ${m}m`;
  if (lang === 'ar') return `${h} س ${m} د`;
  return `${h} h ${m} min`;
}

export default function QuizzesPage() {
  const { t, lang } = useLanguage();
  const { state } = useAchievements();
  const { progress } = useQuizProgress();
  const copy = { ...FALLBACK, ...(t.quiz || {}), levels: { ...FALLBACK.levels, ...((t.quiz || {}).levels || {}) } };

  // Horloge simulée « ?at= » partagée avec les comptes à rebours du site.
  const [now, setNow] = useState(() => new Date(Date.now() + clockOffset()));
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date(Date.now() + clockOffset())), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const countdown = copy.nextIn.replace('{t}', formatCountdown(minutesToNextQuiz(now), lang));

  const daily = dailyQuizFor(now, quizzes);
  const streak = bestDayRun(state?.sets?.quiz_days || []);

  return (
    <div className="quiz-page">
      <section className="quiz-header wrap">
        <div className="section-label"><span>{copy.label}</span><span>LET’S PLAY</span></div>
        <h1>{copy.titleA}<br /><em>{copy.titleB}</em></h1>
        <p className="quiz-intro">{copy.intro}</p>
      </section>

      {daily && (
        <section className="wrap">
          <Link className="quiz-daily hud-frame" to={daily.route}>
            <div className="quiz-daily-copy">
              <p className="eyebrow"><span className="live-dot" /> {copy.dailyEyebrow}</p>
              <h2>{quizLabel(daily.labels, lang)?.title}</h2>
              <p>{quizLabel(daily.labels, lang)?.text}</p>
              <span className="quiz-daily-meta">
                <span className="quiz-chip">{daily.tag}</span>
                <span className="quiz-chip quiz-chip--count">{copy.questionsCount.replace('{n}', String(quizQuestionsCount(daily)))}</span>
                <span className="quiz-chip quiz-chip--levels">{copy.levelProgress.replace('{done}', String(levelsDone(progress, daily.slug))).replace('{total}', String(QUIZ_LEVELS.length))}</span>
                <span className="quiz-chip quiz-chip--streak">🔥 {copy.streak} : {streak}</span>
                <span className="quiz-chip quiz-chip--daily">⏳ {countdown}</span>
              </span>
              <span className="arrow-link">{copy.play} <Arrow /></span>
            </div>
            <span className="quiz-daily-media">
              <VideoThumb id={daily.videoId} lead={daily.image} alt={quizLabel(daily.labels, lang)?.title} quality="hq" />
            </span>
          </Link>
          <p className="quiz-daily-hint">{copy.dailyHint}</p>
        </section>
      )}

      <section className="quiz-grid wrap">
        {quizzes.map((quiz) => {
          // Meilleure partie de l'appareil, tous niveaux confondus : le record
          // affiché nomme son niveau (`title`), et la pastille à côté rappelle
          // la progression — aucune difficulté n'est imposée par la grille,
          // tous les quizz sont jouables dès l'arrivée.
          const best = readLocalBest(quiz.slug);
          const done = levelsDone(progress, quiz.slug);
          return (
          <Link className="quiz-card" to={quiz.route} key={quiz.slug}>
            <span className="quiz-card-media hud-frame">
              <VideoThumb id={quiz.videoId} lead={quiz.image} alt={quizLabel(quiz.labels, lang)?.title} quality="hq" />
            </span>
            <span className="quiz-card-copy">
              <span className="quiz-chips">
                <span className="quiz-chip">{quiz.tag}</span>
                <span className={`quiz-chip quiz-chip--levels${done === QUIZ_LEVELS.length ? ' is-complete' : ''}`}>
                  {copy.levelProgress.replace('{done}', String(done)).replace('{total}', String(QUIZ_LEVELS.length))}
                </span>
              </span>
              <h3>{quizLabel(quiz.labels, lang)?.title}</h3>
              <p>{quizLabel(quiz.labels, lang)?.text}</p>
              <span className="quiz-card-meta">
                {best && (
                  <span className="quiz-card-best" title={`${copy.levels[best.level] || ''} · ${copy.best.replace('{s}', formatBest(best))}`}>
                    ★ {formatBest(best)}
                  </span>
                )}
                {copy.questionsCount.replace('{n}', String(quizQuestionsCount(quiz)))} <Arrow />
              </span>
            </span>
          </Link>
          );
        })}
      </section>
    </div>
  );
}
