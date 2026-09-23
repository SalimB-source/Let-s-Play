import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAchievements } from '../achievements/AchievementContext';
import VideoThumb from '../components/VideoThumb';
import { clockOffset } from '../components/ReleasesCalendar';
import { quizzes, quizLabel, quizQuestions, isQuizLocked, isEasyModeFinished, EASY_SLUGS } from '../quizzesData';
import { readLocalBest, formatBest } from './quizApi';
import { bestDayRun, dailyQuizFor } from './engine';

function Arrow() { return <span aria-hidden="true">↗</span>; }

const FALLBACK = {
  label: 'QUIZZES / GAMING', titleA: 'PROVE YOUR', titleB: 'GAME KNOWLEDGE.',
  intro: 'Quizzes written by the editorial team: general culture, retro, souls-likes, RPGs, e-sport, studios, tech and cinema.',
  dailyEyebrow: 'Daily quiz', dailyHint: 'One quiz picked every day — come back tomorrow to keep your streak.',
  streak: 'Streak', questionsCount: '{n} questions', play: 'Play',
  nextIn: 'New quiz in {t}', best: 'Best: {s}',
  difficulty: { easy: 'Easy', medium: 'Seasoned', hard: 'Expert' },
  locked: 'Locked', lockedHint: 'Finish easy mode to unlock', lockedNeed: 'Complete all easy quizzes ({done}/{total}) to unlock Seasoned & Expert.',
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
  const quizT = t.quiz || {};
  const baseCopy = { ...FALLBACK, ...quizT, difficulty: { ...FALLBACK.difficulty, ...(quizT.difficulty || {}) } };
  const lockedObj = quizT.locked || {};
  const copy = {
    ...baseCopy,
    locked: typeof baseCopy.locked === 'string' ? baseCopy.locked : (lockedObj.locked || FALLBACK.locked),
    lockedHint: lockedObj.lockedHint || baseCopy.lockedHint || FALLBACK.lockedHint,
    lockedNeed: lockedObj.lockedNeed || baseCopy.lockedNeed || FALLBACK.lockedNeed,
  };
  const lockedCopy = {
    locked: copy.locked,
    lockedHint: copy.lockedHint,
    lockedNeed: copy.lockedNeed,
  };

  // Horloge simulée « ?at= » partagée avec les comptes à rebours du site.
  const [now, setNow] = useState(() => new Date(Date.now() + clockOffset()));
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date(Date.now() + clockOffset())), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const countdown = copy.nextIn.replace('{t}', formatCountdown(minutesToNextQuiz(now), lang));

  const daily = dailyQuizFor(now, quizzes);
  const streak = bestDayRun(state?.sets?.quiz_days || []);
  const quizzesPlayed = state?.sets?.quizzes_played || [];
  const easyFinished = isEasyModeFinished(quizzesPlayed);
  const easyDone = EASY_SLUGS.filter((slug) =>
    quizzesPlayed.some((k) => k === slug || String(k).startsWith(`${slug}:`))
  ).length;

  return (
    <div className="quiz-page">
      <section className="quiz-header wrap">
        <div className="section-label"><span>{copy.label}</span><span>LET’S PLAY</span></div>
        <h1>{copy.titleA}<br /><em>{copy.titleB}</em></h1>
        <p className="quiz-intro">{copy.intro}</p>
      </section>

      {daily && (() => {
        const dailyLocked = isQuizLocked(daily, quizzesPlayed);
        if (dailyLocked) {
          return (
            <section className="wrap">
              <div className="quiz-daily hud-frame is-locked" title={lockedCopy.lockedHint}>
                <div className="quiz-daily-copy">
                  <p className="eyebrow"><span className="live-dot" /> {copy.dailyEyebrow} · 🔒 {lockedCopy.locked}</p>
                  <h2>{quizLabel(daily.labels, lang)?.title}</h2>
                  <p>{quizLabel(daily.labels, lang)?.text}</p>
                  <span className="quiz-daily-meta">
                    <span className="quiz-chip">{daily.tag}</span>
                    <span className={`quiz-chip quiz-chip--${daily.difficulty}`}>{copy.difficulty[daily.difficulty] || daily.difficulty}</span>
                    <span className="quiz-chip quiz-chip--count">{copy.questionsCount.replace('{n}', String(quizQuestions(daily).length))}</span>
                  </span>
                  <span className="quiz-locked-hint">🔒 {lockedCopy.lockedNeed.replace('{done}', String(easyDone)).replace('{total}', String(EASY_SLUGS.length))}</span>
                </div>
                <span className="quiz-daily-media">
                  <VideoThumb id={daily.videoId} lead={daily.image} alt={quizLabel(daily.labels, lang)?.title} quality="hq" />
                  <span className="quiz-lock-badge">🔒</span>
                </span>
              </div>
              <p className="quiz-daily-hint">{copy.dailyHint}</p>
            </section>
          );
        }
        return (
          <section className="wrap">
            <Link className="quiz-daily hud-frame" to={daily.route}>
              <div className="quiz-daily-copy">
                <p className="eyebrow"><span className="live-dot" /> {copy.dailyEyebrow}</p>
                <h2>{quizLabel(daily.labels, lang)?.title}</h2>
                <p>{quizLabel(daily.labels, lang)?.text}</p>
                <span className="quiz-daily-meta">
                  <span className="quiz-chip">{daily.tag}</span>
                  <span className="quiz-chip quiz-chip--count">{copy.questionsCount.replace('{n}', String(quizQuestions(daily).length))}</span>
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
        );
      })()}

      {!easyFinished && (
        <section className="wrap">
          <p className="quiz-locked-global">🔒 {lockedCopy.lockedNeed.replace('{done}', String(easyDone)).replace('{total}', String(EASY_SLUGS.length))}</p>
        </section>
      )}

      <section className="quiz-grid wrap">
        {quizzes.map((quiz) => {
          const best = readLocalBest(quiz.slug);
          const locked = isQuizLocked(quiz, quizzesPlayed);
          if (locked) {
            return (
              <div className="quiz-card is-locked" key={quiz.slug} title={lockedCopy.lockedHint}>
                <span className="quiz-card-media hud-frame">
                  <VideoThumb id={quiz.videoId} lead={quiz.image} alt={quizLabel(quiz.labels, lang)?.title} quality="hq" />
                  <span className="quiz-lock-badge">🔒</span>
                </span>
                <span className="quiz-card-copy">
                  <span className="quiz-chips">
                    <span className="quiz-chip">{quiz.tag}</span>
                    <span className={`quiz-chip quiz-chip--${quiz.difficulty}`}>{copy.difficulty[quiz.difficulty] || quiz.difficulty} 🔒</span>
                  </span>
                  <h3>{quizLabel(quiz.labels, lang)?.title}</h3>
                  <p>{quizLabel(quiz.labels, lang)?.text}</p>
                  <span className="quiz-card-meta">
                    <span className="quiz-locked-label">🔒 {lockedCopy.locked}</span>
                  </span>
                </span>
              </div>
            );
          }
          return (
          <Link className="quiz-card" to={quiz.route} key={quiz.slug}>
            <span className="quiz-card-media hud-frame">
              <VideoThumb id={quiz.videoId} lead={quiz.image} alt={quizLabel(quiz.labels, lang)?.title} quality="hq" />
            </span>
            <span className="quiz-card-copy">
              <span className="quiz-chips">
                <span className="quiz-chip">{quiz.tag}</span>
                <span className={`quiz-chip quiz-chip--${quiz.difficulty}`}>{copy.difficulty[quiz.difficulty] || quiz.difficulty}</span>
              </span>
              <h3>{quizLabel(quiz.labels, lang)?.title}</h3>
              <p>{quizLabel(quiz.labels, lang)?.text}</p>
              <span className="quiz-card-meta">
                {best && <span className="quiz-card-best" title={copy.best.replace('{s}', formatBest(best))}>★ {formatBest(best)}</span>}
                {copy.questionsCount.replace('{n}', String(quizQuestions(quiz).length))} <Arrow />
              </span>
            </span>
          </Link>
          );
        })}
      </section>
    </div>
  );
}
