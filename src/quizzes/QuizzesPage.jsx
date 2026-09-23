import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAchievements } from '../achievements/AchievementContext';
import VideoThumb from '../components/VideoThumb';
import { clockOffset } from '../components/ReleasesCalendar';
import { QUIZ_LEVELS, quizzes, quizLabel, quizQuestionsCount } from '../quizzesData';
import { readLocalBest, formatBest } from './quizApi';
import { isQuizFinished, levelsDone } from './quizProgress';
import { useQuizProgress } from './useQuizProgress';
import { bestDayRun, dailyQuizFor, survivalQuestionPool } from './engine';

const SURVIVAL_QUESTION_COUNT = survivalQuestionPool(quizzes).length;

function Arrow() { return <span aria-hidden="true">↗</span>; }

const FALLBACK = {
  label: 'QUIZZES / GAMING', titleA: 'PROVE YOUR', titleB: 'GAME KNOWLEDGE.',
  intro: 'Quizzes written by the editorial team: general culture, retro, souls-likes, RPGs, e-sport, studios, tech, cinema, legendary consoles and PC classics. Every quiz plays in three levels — easy opens the doors, seasoned then expert unlock as you go.',
  categoryMainEyebrow: 'CATEGORY 01 / CLASSICS',
  categoryMainCount: '{n} quizzes',
  categoryMainTitle: 'Gaming / tech / cinema quizzes',
  categoryMainIntro: 'The 12 existing quizzes, gathered in one category.',
  categorySurvivalInfinite: 'INFINITE',
  categorySurvivalEyebrow: 'CATEGORY 02 / ENDLESS',
  categorySurvivalTitle: 'Survival mode',
  categorySurvivalIntro: 'Three lives. One mistake costs a heart. All questions shuffle and recycle without end.',
  categorySurvivalLives: '3 lives', categorySurvivalTimer: '10 sec / question',
  categorySurvivalTimeout: 'Timeout = mistake', categorySurvivalPool: '{n} questions in the global pool',
  categorySurvivalPlay: 'Enter Survival mode',
  dailyEyebrow: 'Daily quiz', dailyHint: 'One quiz picked every day — come back tomorrow to keep your streak.',

  streak: 'Streak', questionsCount: '{n} questions', play: 'Play',
  nextIn: 'New quiz in {t}', best: 'Best: {s}',
  levels: { easy: 'Easy', medium: 'Seasoned', hard: 'Expert' },
  levelProgress: '{done}/{total} levels',
  // Les TROIS niveaux terminés : le quizz passe « TERMINÉ » — niveaux de gris,
  // drapeau sur la miniature, et le lien retiré (il n'est plus proposé).
  finished: 'FINISHED', finishedNote: 'Three levels cleared',
  dailyDoneHint: 'Today’s quiz is finished — its three levels are cleared. Come back tomorrow for the next one.',
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
  // Bannière du jour : le même état « terminé » que les cartes de la grille
  // (niveaux de gris + drapeau, lien retiré) quand les trois niveaux du quizz
  // mis en avant sont faits.
  const dailyFinished = Boolean(daily) && isQuizFinished(progress, daily.slug);

  return (
    <div className="quiz-page">
      <section className="quiz-header wrap">
        <div className="section-label"><span>{copy.label}</span><span>LET’S PLAY</span></div>
        <h1>{copy.titleA}<br /><em>{copy.titleB}</em></h1>
        <p className="quiz-intro">{copy.intro}</p>
      </section>

      {daily && (
        <section className="wrap">
          {dailyFinished ? (
            <div className="quiz-daily hud-frame is-finished">
              <div className="quiz-daily-copy">
                <p className="eyebrow">{copy.dailyEyebrow}</p>
                <h2>{quizLabel(daily.labels, lang)?.title}</h2>
                <p>{quizLabel(daily.labels, lang)?.text}</p>
                <span className="quiz-daily-meta">
                  <span className="quiz-chip">{daily.tag}</span>
                  <span className="quiz-chip quiz-chip--count">{copy.questionsCount.replace('{n}', String(quizQuestionsCount(daily)))}</span>
                  <span className="quiz-chip quiz-chip--levels is-complete">✓ {copy.finished}</span>
                  <span className="quiz-chip quiz-chip--streak">🔥 {copy.streak} : {streak}</span>
                </span>
                <span className="quiz-finished-note">🏁 {copy.finishedNote}</span>
              </div>
              <span className="quiz-daily-media">
                <VideoThumb id={daily.videoId} lead={daily.image} alt={quizLabel(daily.labels, lang)?.title} quality="hq" />
                <span className="quiz-finished-flag">✓ {copy.finished}</span>
              </span>
            </div>
          ) : (
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
          )}
          <p className="quiz-daily-hint">{dailyFinished ? copy.dailyDoneHint : copy.dailyHint}</p>
        </section>
      )}

      <section className="quiz-category quiz-category--main wrap" aria-labelledby="quiz-category-main-title">
        <div className="quiz-category-heading">
          <div className="section-label"><span>{copy.categoryMainEyebrow}</span><span>{copy.categoryMainCount.replace('{n}', String(quizzes.length))}</span></div>
          <h2 id="quiz-category-main-title">{copy.categoryMainTitle}</h2>
          <p>{copy.categoryMainIntro}</p>
        </div>
        <div className="quiz-grid">
          {quizzes.map((quiz) => {
            // Meilleure partie de l'appareil, tous niveaux confondus : le record
            // affiché nomme son niveau (`title`), et la pastille à côté rappelle
            // la progression — aucune difficulté n'est imposée par la grille,
            // tous les quizz sont jouables dès l'arrivée.
            const best = readLocalBest(quiz.slug);
            const done = levelsDone(progress, quiz.slug);
            // Les trois niveaux terminés : la carte passe en niveaux de gris,
            // affiche « TERMINÉ » et n'est plus un lien — le quizz est verrouillé.
            const finished = done === QUIZ_LEVELS.length;
            const title = quizLabel(quiz.labels, lang)?.title;
            const body = (
              <>
                <span className="quiz-card-media hud-frame">
                  <VideoThumb id={quiz.videoId} lead={quiz.image} alt={title} quality="hq" />
                  {finished && <span className="quiz-finished-flag">✓ {copy.finished}</span>}
                </span>
                <span className="quiz-card-copy">
                  <span className="quiz-chips">
                    <span className="quiz-chip">{quiz.tag}</span>
                    <span className={`quiz-chip quiz-chip--levels${finished ? ' is-complete' : ''}`}>
                      {finished
                        ? `✓ ${copy.finished}`
                        : copy.levelProgress.replace('{done}', String(done)).replace('{total}', String(QUIZ_LEVELS.length))}
                    </span>
                  </span>
                  <h3>{title}</h3>
                  <p>{quizLabel(quiz.labels, lang)?.text}</p>
                  <span className="quiz-card-meta">
                    {best && (
                      <span className="quiz-card-best" title={`${copy.levels[best.level] || ''} · ${copy.best.replace('{s}', formatBest(best))}`}>
                        ★ {formatBest(best)}
                      </span>
                    )}
                    {copy.questionsCount.replace('{n}', String(quizQuestionsCount(quiz)))}
                    {!finished && <Arrow />}
                  </span>
                </span>
              </>
            );
            return finished
              ? <div className="quiz-card is-finished" key={quiz.slug} aria-label={`${title} — ${copy.finished}`}>{body}</div>
              : <Link className="quiz-card" to={quiz.route} key={quiz.slug}>{body}</Link>;
          })}
        </div>
      </section>

      <section className="quiz-category quiz-category--survival wrap" aria-labelledby="quiz-category-survival-title">
        <div className="quiz-category-heading">
          <div className="section-label"><span>{copy.categorySurvivalEyebrow}</span><span>♥♥♥</span></div>
          <h2 id="quiz-category-survival-title">{copy.categorySurvivalTitle}</h2>
          <p>{copy.categorySurvivalIntro}</p>
        </div>
        <Link className="quiz-survival-card hud-frame" to="/quizz/survival">
          <span className="quiz-survival-copy">
            <span className="quiz-chips">
              <span className="quiz-chip quiz-chip--count">{copy.categorySurvivalPool.replace('{n}', String(SURVIVAL_QUESTION_COUNT))}</span>
              <span className="quiz-chip quiz-chip--survival">∞ {copy.categorySurvivalInfinite}</span>
            </span>
            <span className="quiz-survival-rules">
              <span>♥ {copy.categorySurvivalLives}</span>
              <span>⏱ {copy.categorySurvivalTimer}</span>
              <span>⌛ {copy.categorySurvivalTimeout}</span>
            </span>
            <span className="arrow-link">{copy.categorySurvivalPlay} <Arrow /></span>
          </span>
          <span className="quiz-survival-visual" aria-hidden="true">
            <span className="quiz-survival-infinity">∞</span>
            <span className="quiz-survival-hearts">♥♥♥</span>
          </span>
        </Link>
      </section>
    </div>
  );
}
