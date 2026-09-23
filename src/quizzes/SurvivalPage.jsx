import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { quizzes, quizLabel } from '../quizzesData';
import {
  VERDICT_MS,
  levelRules,
  prepareSurvivalCycle,
  quizPointsFor,
  questionBudgetMs,
  streakLevel,
  survivalQuestionPool,
} from './engine';
import {
  playQuizAnswerSound,
  playQuizComboSound,
  playQuizResultFanfare,
  quizSoundEnabled,
  setQuizSoundEnabled,
  startQuizClock,
  stopQuizClock,
  unlockQuizAudio,
  updateQuizClock,
} from './quizSounds';
import { readSurvivalBest, recordSurvivalRun } from './survivalProgress';

const SURVIVAL_LIVES = 3;
const SURVIVAL_LEVEL = 'hard';
const POOL_SIZE = survivalQuestionPool(quizzes).length;

const FALLBACK = {
  eyebrow: 'SURVIVAL MODE',
  title: 'SURVIVAL MODE',
  introTitle: 'How long can you last?',
  intro: 'Three lives. One mistake costs one life. The full question pool is shuffled and recycled forever — no levels to unlock and no finish line.',
  modeChip: 'ENDLESS RUN',
  poolCount: '{n} questions in the pool',
  livesRule: 'Three lives',
  timerRule: '10 seconds per question',
  timeoutRule: 'Timeout counts as a mistake',
  start: 'Start survival',
  restart: 'Restart from zero',
  back: 'All quizzes',
  question: 'Question',
  cycle: 'Shuffle {n}',
  correctCount: 'Correct',
  wrongCount: 'Mistakes',
  points: 'PTS',
  timeLeft: 'Time remaining',
  livesLeft: '{n} lives left',
  keysHint: 'Press 1–{n} to answer',
  right: 'Correct!',
  wrong: 'Wrong answer — one life lost.',
  timeout: 'Time up — one life lost.',
  gameOver: 'GAME OVER',
  finalScore: 'Final score',
  questionsPlayed: 'Questions played',
  correctAnswers: 'Correct answers',
  bestScore: 'Best score on this device',
  newRecord: 'NEW PERSONAL BEST',
  best: 'Best: {score} PTS',
  emptyPool: 'There are no questions in the Survival pool yet.',
  mute: 'Mute the quiz sounds',
  unmute: 'Turn the quiz sounds back on',
  statsTitle: 'RUN SUMMARY',
  tier: 'SURVIVOR',
  streakTags: { warm: 'WARMING UP', hot: 'ON FIRE', blazing: 'UNSTOPPABLE' },
};

function randomSeed() {
  return (Math.random() * 0x100000000) >>> 0;
}

function SoundToggle({ on, label, onToggle }) {
  return (
    <button
      type="button"
      className={`quiz-sound-toggle${on ? '' : ' is-muted'}`}
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      <span aria-hidden="true">{on ? '🔊' : '🔇'}</span>
    </button>
  );
}

/** Partie Survival infinie, sans progression ni classement des quizz classiques. */
export default function SurvivalPage() {
  const { t, lang } = useLanguage();
  const copy = { ...FALLBACK, ...((t.quiz || {}).survival || {}) };
  const [phase, setPhase] = useState('intro');
  const [deck, setDeck] = useState([]);
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(1);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [lives, setLives] = useState(SURVIVAL_LIVES);
  const [remainingMs, setRemainingMs] = useState(() => questionBudgetMs(SURVIVAL_LEVEL));
  const [budgetMs, setBudgetMs] = useState(() => questionBudgetMs(SURVIVAL_LEVEL));
  const [score, setScore] = useState(0);
  const [live, setLive] = useState({ right: 0, wrong: 0 });
  const [streak, setStreak] = useState(0);
  const [verdict, setVerdict] = useState(null);
  const [shake, setShake] = useState(false);
  const [soundOn, setSoundOn] = useState(() => quizSoundEnabled());
  const [best, setBest] = useState(() => readSurvivalBest());
  const [finalRun, setFinalRun] = useState(null);

  const previousFirstQuestionRef = useRef(null);
  const livesRef = useRef(SURVIVAL_LIVES);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const questionsRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const questionStartRef = useRef(0);
  const deadlineRef = useRef(0);
  const budgetRef = useRef(questionBudgetMs(SURVIVAL_LEVEL));
  const lockedRef = useRef(false);
  const answerRef = useRef(null);
  const verdictTimerRef = useRef(null);
  const shakeTimerRef = useRef(null);
  const fanfareForRef = useRef(null);

  const question = deck[index] || null;

  const resetAndStart = () => {
    if (!POOL_SIZE) return;
    if (verdictTimerRef.current) {
      window.clearTimeout(verdictTimerRef.current);
      verdictTimerRef.current = null;
    }
    if (shakeTimerRef.current) {
      window.clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = null;
    }
    unlockQuizAudio();
    const nextDeck = prepareSurvivalCycle(quizzes, randomSeed(), previousFirstQuestionRef.current);
    previousFirstQuestionRef.current = nextDeck[0]?.id || null;
    lockedRef.current = false;
    livesRef.current = SURVIVAL_LIVES;
    scoreRef.current = 0;
    correctRef.current = 0;
    questionsRef.current = 0;
    streakRef.current = 0;
    bestStreakRef.current = 0;
    setDeck(nextDeck);
    setIndex(0);
    setCycle(1);
    setQuestionNumber(1);
    setLives(SURVIVAL_LIVES);
    setRemainingMs(questionBudgetMs(SURVIVAL_LEVEL));
    setBudgetMs(questionBudgetMs(SURVIVAL_LEVEL));
    setScore(0);
    setLive({ right: 0, wrong: 0 });
    setStreak(0);
    setVerdict(null);
    setShake(false);
    setFinalRun(null);
    setPhase('play');
  };

  const finishRun = () => {
    const outcome = recordSurvivalRun({
      points: scoreRef.current,
      correct: correctRef.current,
      questions: questionsRef.current,
    });
    setBest(outcome.best);
    setFinalRun({
      points: scoreRef.current,
      correct: correctRef.current,
      questions: questionsRef.current,
      best: outcome.best,
      isRecord: outcome.isRecord,
      bestStreak: bestStreakRef.current,
    });
    setPhase('gameover');
  };

  const answer = (currentQuestion, choice) => {
    if (lockedRef.current || phase !== 'play') return;
    const budget = budgetRef.current || questionBudgetMs(SURVIVAL_LEVEL);
    const elapsed = Math.min(budget, Math.max(0, Date.now() - questionStartRef.current));
    const correct = Boolean(choice && choice.correct);
    const timedOut = !choice;
    const nextQuestionCount = questionsRef.current + 1;
    questionsRef.current = nextQuestionCount;
    let pointsGained = 0;
    let nextLives = livesRef.current;

    if (correct) {
      streakRef.current += 1;
      bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
      correctRef.current += 1;
      pointsGained = quizPointsFor(SURVIVAL_LEVEL, {
        elapsedMs: elapsed,
        budgetMs: budget,
        streak: streakRef.current,
      }).total;
      scoreRef.current += pointsGained;
      setScore(scoreRef.current);
      setStreak(streakRef.current);
      if (streakRef.current >= 2) playQuizComboSound(streakRef.current);
    } else {
      streakRef.current = 0;
      setStreak(0);
      nextLives = Math.max(0, livesRef.current - 1);
      livesRef.current = nextLives;
      setLives(nextLives);
      if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current);
      setShake(true);
      shakeTimerRef.current = window.setTimeout(() => {
        shakeTimerRef.current = null;
        setShake(false);
      }, 420);
    }

    playQuizAnswerSound(correct, { timeout: timedOut });
    setLive((previous) => ({
      right: previous.right + (correct ? 1 : 0),
      wrong: previous.wrong + (correct ? 0 : 1),
    }));
    setVerdict({
      choiceId: choice ? choice.id : null,
      correct,
      timedOut,
      points: pointsGained,
    });
    lockedRef.current = true;

    if (verdictTimerRef.current) window.clearTimeout(verdictTimerRef.current);
    verdictTimerRef.current = window.setTimeout(() => {
      verdictTimerRef.current = null;
      lockedRef.current = false;
      setVerdict(null);
      if (nextLives === 0) {
        finishRun();
        return;
      }

      setQuestionNumber(nextQuestionCount + 1);
      if (index + 1 < deck.length) {
        setIndex(index + 1);
        return;
      }
      const nextDeck = prepareSurvivalCycle(quizzes, randomSeed(), currentQuestion.id);
      setDeck(nextDeck);
      setIndex(0);
      setCycle((previous) => previous + 1);
    }, levelRules(SURVIVAL_LEVEL).verdictMs || VERDICT_MS);
  };
  answerRef.current = answer;

  useEffect(() => {
    if (phase !== 'play' || !question) return undefined;
    const budget = questionBudgetMs(SURVIVAL_LEVEL);
    budgetRef.current = budget;
    deadlineRef.current = Date.now() + budget;
    questionStartRef.current = Date.now();
    setBudgetMs(budget);
    setRemainingMs(budget);
    startQuizClock(budget);
    const timerId = window.setInterval(() => {
      if (lockedRef.current) return;
      const left = deadlineRef.current - Date.now();
      if (left > 0) {
        setRemainingMs(left);
        updateQuizClock(left, budgetRef.current);
        return;
      }
      window.clearInterval(timerId);
      setRemainingMs(0);
      answerRef.current?.(question, null);
    }, 100);
    return () => {
      window.clearInterval(timerId);
      stopQuizClock();
    };
  }, [phase, index, deck, question]);

  useEffect(() => {
    if (phase !== 'play' || !question) return undefined;
    const onKeyDown = (event) => {
      if (lockedRef.current || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const position = Number(event.key) - 1;
      if (!Number.isInteger(position) || position < 0) return;
      const choice = question.choices[position];
      if (choice) {
        event.preventDefault();
        answerRef.current?.(question, choice);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, question]);

  useEffect(() => {
    if (phase !== 'gameover' || !finalRun || fanfareForRef.current === finalRun) return;
    fanfareForRef.current = finalRun;
    playQuizResultFanfare(finalRun.bestStreak >= 6 ? 'legend' : finalRun.bestStreak >= 4 ? 'veteran' : 'rookie');
  }, [phase, finalRun]);

  useEffect(() => () => {
    if (verdictTimerRef.current) window.clearTimeout(verdictTimerRef.current);
    if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current);
  }, []);

  const toggleSound = () => setSoundOn(setQuizSoundEnabled(!soundOn));
  const soundLabel = soundOn ? copy.mute : copy.unmute;
  const formatPoolCount = copy.poolCount.replace('{n}', String(POOL_SIZE));

  return (
    <div className="quiz-page quiz-survival-page">
      <section className="quiz-header wrap">
        <div className="section-label"><span>{copy.eyebrow}</span><span>{formatPoolCount}</span></div>
        <h1>{copy.title}</h1>
        <p className="quiz-intro">{copy.intro}</p>
      </section>

      <section className="wrap">
        {phase === 'intro' && (
          <div className="quiz-player">
            <div className="quiz-player-intro quiz-survival-intro">
              <div className="quiz-chips">
                <span className="quiz-chip quiz-chip--survival">{copy.modeChip}</span>
                <span className="quiz-chip quiz-chip--count">{formatPoolCount}</span>
              </div>
              <h2>{copy.introTitle}</h2>
              <ul className="quiz-survival-rules">
                <li><span aria-hidden="true">♥♥♥</span>{copy.livesRule}</li>
                <li><span aria-hidden="true">⏱</span>{copy.timerRule}</li>
                <li><span aria-hidden="true">↻</span>{copy.timeoutRule}</li>
              </ul>
              {best && (
                <p className="quiz-survival-best" aria-live="polite">
                  ★ {copy.best.replace('{score}', String(best.points))}
                </p>
              )}
              <div className="quiz-player-actions">
                <button type="button" className="quiz-cta quiz-cta--primary" onClick={resetAndStart} disabled={!POOL_SIZE}>
                  {copy.start} <span aria-hidden="true">↗</span>
                </button>
                <SoundToggle on={soundOn} label={soundLabel} onToggle={toggleSound} />
                <Link className="quiz-cta quiz-cta--ghost" to="/quizz">{copy.back}</Link>
              </div>
            </div>
          </div>
        )}

        {phase === 'play' && question && (
          <div className={`quiz-player quiz-player--${SURVIVAL_LEVEL}${shake ? ' is-shake' : ''}`}>
            <div className="quiz-hud">
              <div className={`quiz-timer${remainingMs < 3000 ? ' is-low' : ''}`} role="timer" aria-label={copy.timeLeft}>
                <span className="quiz-timer-count">{Math.ceil(remainingMs / 1000)}s</span>
                <span className="quiz-timer-track"><i style={{ width: `${Math.min(100, (remainingMs / budgetMs) * 100)}%` }} /></span>
              </div>
              <p className="quiz-live" aria-live="polite" aria-label={`${copy.correctCount}: ${live.right}, ${copy.wrongCount}: ${live.wrong}`}>
                <span className="quiz-live-item quiz-live-item--right" aria-hidden="true">✓ {live.right}</span>
                <span className="quiz-live-item quiz-live-item--wrong" aria-hidden="true">✗ {live.wrong}</span>
                <span className="quiz-live-item quiz-live-item--points" aria-hidden="true">⚡ {score}</span>
                {streak >= 2 && (
                  <span className={`quiz-live-item quiz-live-item--streak is-${streakLevel(streak)}`} aria-hidden="true">
                    🔥 ×{streak}
                    {copy.streakTags[streakLevel(streak)] ? <em className="quiz-live-tag">{copy.streakTags[streakLevel(streak)]}</em> : null}
                  </span>
                )}
              </p>
              <p className="quiz-lives" role="status">
                {Array.from({ length: SURVIVAL_LIVES }, (_, position) => (
                  <span key={position} className={`quiz-heart${position < lives ? '' : ' is-lost'}`} aria-hidden="true">♥</span>
                ))}
                <span className="sr-only">{copy.livesLeft.replace('{n}', String(lives))}</span>
              </p>
              <SoundToggle on={soundOn} label={soundLabel} onToggle={toggleSound} />
            </div>
            <p className="quiz-progress-label">
              <span className="quiz-chip quiz-chip--survival">{copy.modeChip}</span>
              {copy.question} {questionNumber}
              <span className="quiz-chip quiz-chip--count">{copy.cycle.replace('{n}', String(cycle))}</span>
            </p>
            <h2 className="quiz-question" data-question-id={question.id}>{quizLabel(question.q, lang)}</h2>
            {verdict && (
              <p className={`quiz-verdict ${verdict.correct ? 'is-right' : 'is-wrong'}`} role="status">
                <span className="quiz-verdict-phrase">
                  {verdict.correct ? copy.right : verdict.timedOut ? copy.timeout : copy.wrong}
                </span>
                {verdict.correct && verdict.points > 0 && (
                  <span className="quiz-verdict-points">+{verdict.points} {copy.points}</span>
                )}
              </p>
            )}
            <div className={`quiz-choices${question.choices.length > 4 ? ' quiz-choices--five' : ''}`}>
              {question.choices.map((choice, position) => {
                const choiceClass = [
                  'quiz-choice',
                  verdict ? 'is-locked' : '',
                  verdict?.choiceId === choice.id ? (verdict.correct ? 'is-correct' : 'is-wrong') : '',
                  verdict && !verdict.correct && choice.correct ? 'is-reveal' : '',
                ].filter(Boolean).join(' ');
                return (
                  <button
                    type="button"
                    key={choice.id}
                    className={choiceClass}
                    data-key={String(position + 1)}
                    disabled={Boolean(verdict)}
                    onClick={() => answer(question, choice)}
                  >
                    <span className="quiz-choice-label">{quizLabel(choice.label, lang)}</span>
                  </button>
                );
              })}
            </div>
            <p className="quiz-keys-hint">⌨ {copy.keysHint.replace('{n}', String(question.choices.length))}</p>
          </div>
        )}

        {phase === 'gameover' && finalRun && (
          <div className="quiz-player">
            <div className="quiz-result quiz-survival-result" role="region" aria-labelledby="survival-gameover-title">
              <p className="quiz-result-eyebrow">{copy.statsTitle}</p>
              <h2 id="survival-gameover-title" className="quiz-result-tier">💀 {copy.gameOver}</h2>
              <p className="quiz-survival-final-label">{copy.finalScore}</p>
              <p className="quiz-result-points">⚡ {finalRun.points} {copy.points}</p>
              {finalRun.isRecord && <span className="quiz-result-record">★ {copy.newRecord}</span>}
              <ul className="quiz-stats">
                <li className="quiz-stat"><strong>{finalRun.questions}</strong><span>{copy.questionsPlayed}</span></li>
                <li className="quiz-stat"><strong>{finalRun.correct}</strong><span>{copy.correctAnswers}</span></li>
                <li className="quiz-stat"><strong>{finalRun.best?.points ?? finalRun.points}</strong><span>{copy.bestScore}</span></li>
              </ul>
              <div className="quiz-result-actions">
                <button type="button" className="quiz-cta quiz-cta--primary quiz-survival-restart" onClick={resetAndStart}>
                  {copy.restart} <span aria-hidden="true">↻</span>
                </button>
                <Link className="quiz-cta quiz-cta--ghost" to="/quizz">{copy.back}</Link>
              </div>
            </div>
          </div>
        )}

        {!POOL_SIZE && (
          <p className="quiz-board-note" role="alert">{copy.emptyPool}</p>
        )}
      </section>
    </div>
  );
}
