import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAchievements } from '../achievements/AchievementContext';
import VideoThumb from '../components/VideoThumb';
import { quizzes, quizLabel } from '../quizzesData';
import { bestDayRun, dailyQuizFor } from './engine';

function Arrow() { return <span aria-hidden="true">↗</span>; }

const FALLBACK = {
  label: 'QUIZZES / GAMING', titleA: 'PROVE YOUR', titleB: 'GAME KNOWLEDGE.',
  intro: 'Quizzes written by the editorial team: general culture, retro, souls-likes, RPGs, e-sport and studios.',
  dailyEyebrow: 'Daily quiz', dailyHint: 'One quiz picked every day — come back tomorrow to keep your streak.',
  streak: 'Streak', questionsCount: '{n} questions', play: 'Play',
  difficulty: { easy: 'Easy', medium: 'Seasoned', hard: 'Expert' },
};

export default function QuizzesPage() {
  const { t, lang } = useLanguage();
  const { state } = useAchievements();
  const copy = { ...FALLBACK, ...(t.quiz || {}), difficulty: { ...FALLBACK.difficulty, ...((t.quiz || {}).difficulty || {}) } };

  const daily = dailyQuizFor(new Date(), quizzes);
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
                <span className="quiz-chip quiz-chip--count">{copy.questionsCount.replace('{n}', String(daily.questions.length))}</span>
                <span className="quiz-chip quiz-chip--streak">🔥 {copy.streak} : {streak}</span>
              </span>
              <span className="arrow-link">{copy.play} <Arrow /></span>
            </div>
            <span className="quiz-daily-media">
              <VideoThumb id={daily.videoId} alt={quizLabel(daily.labels, lang)?.title} quality="hq" />
            </span>
          </Link>
          <p className="quiz-daily-hint">{copy.dailyHint}</p>
        </section>
      )}

      <section className="quiz-grid wrap">
        {quizzes.map((quiz) => (
          <Link className="quiz-card" to={quiz.route} key={quiz.slug}>
            <span className="quiz-card-media hud-frame">
              <VideoThumb id={quiz.videoId} alt={quizLabel(quiz.labels, lang)?.title} quality="hq" />
            </span>
            <span className="quiz-card-copy">
              <span className="quiz-chips">
                <span className="quiz-chip">{quiz.tag}</span>
                <span className={`quiz-chip quiz-chip--${quiz.difficulty}`}>{copy.difficulty[quiz.difficulty] || quiz.difficulty}</span>
              </span>
              <h3>{quizLabel(quiz.labels, lang)?.title}</h3>
              <p>{quizLabel(quiz.labels, lang)?.text}</p>
              <span className="quiz-card-meta">{copy.questionsCount.replace('{n}', String(quiz.questions.length))} <Arrow /></span>
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
