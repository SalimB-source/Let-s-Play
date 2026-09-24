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
  eyebrow: 'SURVIVAL MODE // BLACKSITE-03',
  title: 'SURVIVAL MODE',
  introTitle: 'How long can you last?',
  intro: 'Three lives. One mistake costs one life. The full question pool is shuffled and recycled forever — no levels to unlock and no finish line. The signal loops. The walls listen.',
  modeChip: 'ENDLESS RUN // NO SAVE',
  poolCount: '{n} questions in the pool',
  livesRule: 'Three lives — lose one per mistake',
  timerRule: '10 seconds per question — the lights flicker',
  timeoutRule: 'Timeout counts as a mistake — it hears you',
  start: 'ENTER THE VOID',
  restart: 'RETRY // STILL ALIVE?',
  back: 'EXIT TO MENU',
  question: 'FILE',
  cycle: 'LOOP {n}',
  correctCount: 'Correct',
  wrongCount: 'Mistakes',
  points: 'PTS',
  timeLeft: 'Time remaining',
  livesLeft: '{n} lives left',
  keysHint: 'Press 1–{n} to answer — don\'t look back',
  right: 'Signal clear.',
  wrong: 'WRONG — one life lost. It\'s closer.',
  timeout: 'TIME UP — one life lost. Footsteps.',
  gameOver: 'YOU DIED',
  finalScore: 'Final score // evidence recovered',
  questionsPlayed: 'Questions survived',
  correctAnswers: 'Correct answers',
  bestScore: 'Best score on this device // last survivor',
  newRecord: 'NEW PERSONAL BEST // SIGNAL STRONGER',
  best: 'Best: {score} PTS',
  emptyPool: 'There are no questions in the Survival pool yet.',
  mute: 'Mute the quiz sounds',
  unmute: 'Turn the quiz sounds back on',
  statsTitle: 'AUTOPSY REPORT // RUN SUMMARY',
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
      className={`quiz-sound-toggle horror-sound-toggle${on ? '' : ' is-muted'}`}
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      <span aria-hidden="true">{on ? '◍' : '◍'}</span>
      <span className="horror-sound-label">{on ? 'AUDIO: ON' : 'AUDIO: OFF'}</span>
    </button>
  );
}

/** Partie Survival infinie, sans progression ni classement des quizz classiques. — Horror edition */
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
  const timerPercent = Math.min(100, (remainingMs / budgetMs) * 100);
  const isLow = remainingMs < 3000;

  return (
    <div className={`quiz-page quiz-survival-page survival-horror ${phase === 'play' ? 'is-playing' : ''} ${shake ? 'is-shake' : ''} ${isLow ? 'is-low-time' : ''}`}>
      {/* Horror atmosphere layers */}
      <div className="horror-atmosphere" aria-hidden="true">
        <div className="horror-bg" />
        <div className="horror-fog horror-fog--1" />
        <div className="horror-fog horror-fog--2" />
        <div className="horror-grain" />
        <div className="horror-vignette" />
        <div className="horror-scanlines" />
        <div className="horror-blood-drips">
          <span /><span /><span /><span />
        </div>
      </div>

      <section className="quiz-header wrap survival-horror-header">
        <div className="section-label horror-section-label">
          <span><i className="horror-rec-dot" /> {copy.eyebrow}</span>
          <span className="horror-pool-label">{formatPoolCount} // SIGNAL: CORRUPTED</span>
        </div>
        <h1 className="horror-glitch-title" data-text={copy.title}>
          {copy.title.split('').map((ch, i) => (
            <span key={i} style={{'--i': i} }>{ch === ' ' ? '\u00A0' : ch}</span>
          ))}
          <span className="horror-title-blood" aria-hidden="true">SURVIVAL MODE</span>
        </h1>
        <p className="quiz-intro horror-intro">
          <span className="horror-typewriter">{copy.intro}</span>
          <br />
          <span className="horror-log">// LOG 03-47: Subject entered loop at {new Date().toLocaleTimeString()}. No exit observed.</span>
        </p>
      </section>

      <section className="wrap survival-horror-main">
        {phase === 'intro' && (
          <div className="quiz-player horror-case-file">
            <div className="horror-tape horror-tape--top">⚠ RESTRICTED // EYES ONLY — BLACKSITE-03</div>
            <div className="horror-tape horror-tape--bottom horror-tape--red">QUARANTINE — DO NOT ENTER — BIOHAZARD LEVEL 4</div>

            <div className="quiz-player-intro quiz-survival-intro horror-file-inner">
              <div className="horror-file-header">
                <div className="horror-file-meta">
                  <span>CASE FILE: SURVIVAL-∞</span>
                  <span>DATE: {new Date().toISOString().slice(0,10)}</span>
                  <span>STATUS: ACTIVE // LOOPING</span>
                </div>
                <div className="horror-stamp horror-stamp--classified">CLASSIFIED</div>
              </div>

              <div className="quiz-chips horror-chips">
                <span className="quiz-chip quiz-chip--survival horror-chip-pulse">◍ {copy.modeChip}</span>
                <span className="quiz-chip quiz-chip--count">{formatPoolCount}</span>
                <span className="quiz-chip horror-chip-warn">☣ NO EXTRACTION</span>
              </div>

              <h2 className="horror-file-title">{copy.introTitle}<span className="horror-cursor">█</span></h2>

              <div className="horror-evidence-photo" aria-hidden="true">
                <div className="horror-photo-inner">
                  <span>SUBJECT-03</span>
                  <span>LOOP #00{Math.floor(Math.random()*9)+1}</span>
                </div>
              </div>

              <ul className="quiz-survival-rules horror-rules">
                <li><span aria-hidden="true">♥♥♥</span><span><strong>{copy.livesRule}</strong> — every wrong answer bleeds.</span></li>
                <li><span aria-hidden="true">⏱</span><span><strong>{copy.timerRule}</strong> — the dark gets closer.</span></li>
                <li><span aria-hidden="true">☣</span><span><strong>{copy.timeoutRule}</strong> — silence is not safe.</span></li>
              </ul>

              <div className="horror-audio-log">
                <span className="horror-audio-kicker">AUDIO LOG // RECOVERED</span>
                <p>“We thought it was a quiz. It’s a loop. Three hearts, then nothing. If you find this — don’t answer. Don’t answer.”</p>
              </div>

              {best && (
                <p className="quiz-survival-best horror-best" aria-live="polite">
                  <span className="horror-best-icon">☠</span> LAST SURVIVOR: {copy.best.replace('{score}', String(best.points))} // STILL IN THE WALLS
                </p>
              )}

              <div className="quiz-player-actions horror-actions">
                <button type="button" className="quiz-cta quiz-cta--primary horror-cta-enter" onClick={resetAndStart} disabled={!POOL_SIZE}>
                  <span className="horror-cta-text">{copy.start}</span>
                  <span aria-hidden="true" className="horror-cta-arrow">↗ ENTER</span>
                  <span className="horror-cta-blood" aria-hidden="true" />
                </button>
                <SoundToggle on={soundOn} label={soundLabel} onToggle={toggleSound} />
                <Link className="quiz-cta quiz-cta--ghost horror-cta-ghost" to="/quizz">{copy.back}</Link>
              </div>

              <p className="horror-footnote">* This file will self-corrupt after 3 deaths. Found footage property of Let’s Play.</p>
            </div>
          </div>
        )}

        {phase === 'play' && question && (
          <div className={`quiz-player quiz-player--${SURVIVAL_LEVEL} horror-play-root${shake ? ' is-shake' : ''}`}>
            <div className="quiz-hud horror-hud">
              <div className="horror-hud-top">
                <div className={`quiz-timer horror-timer${isLow ? ' is-low' : ''}`} role="timer" aria-label={copy.timeLeft}>
                  <div className="horror-timer-head">
                    <span className="horror-timer-label">◍ SIGNAL LOSS IN</span>
                    <span className="quiz-timer-count horror-timer-count">{Math.ceil(remainingMs / 1000)}s</span>
                  </div>
                  <span className="quiz-timer-track horror-timer-track"><i style={{ width: `${timerPercent}%` }} /></span>
                  {isLow && <span className="horror-timer-warning">⚠ LIGHTS OUT SOON</span>}
                </div>

                <p className="quiz-lives horror-lives" role="status">
                  <span className="horror-lives-label">VITALS:</span>
                  <span className="horror-hearts">
                    {Array.from({ length: SURVIVAL_LIVES }, (_, position) => (
                      <span key={position} className={`quiz-heart horror-heart${position < lives ? '' : ' is-lost'}`} aria-hidden="true">
                        <span className="horror-heart-inner">♥</span>
                        {position >= lives && <span className="horror-heart-lost">✕</span>}
                      </span>
                    ))}
                  </span>
                  <span className="sr-only">{copy.livesLeft.replace('{n}', String(lives))}</span>
                </p>

                <SoundToggle on={soundOn} label={soundLabel} onToggle={toggleSound} />
              </div>

              <div className="horror-hud-bottom">
                <p className="quiz-live horror-live" aria-live="polite" aria-label={`${copy.correctCount}: ${live.right}, ${copy.wrongCount}: ${live.wrong}`}>
                  <span className="quiz-live-item quiz-live-item--right">✓ {live.right} CLEAR</span>
                  <span className="quiz-live-item quiz-live-item--wrong">✕ {live.wrong} LOST</span>
                  <span className="quiz-live-item quiz-live-item--points">⚡ {score} EVIDENCE</span>
                  {streak >= 2 && (
                    <span className={`quiz-live-item quiz-live-item--streak is-${streakLevel(streak)}`}>
                      ◍ SIGNAL ×{streak}
                      {copy.streakTags[streakLevel(streak)] ? <em className="quiz-live-tag horror-streak-tag">{copy.streakTags[streakLevel(streak)]}</em> : null}
                    </span>
                  )}
                </p>
                <span className="horror-loop-indicator">LOOP {cycle} // FILE {questionNumber}</span>
              </div>
            </div>

            <div className="horror-question-wrap">
              <div className="horror-question-tape">EVIDENCE #{questionNumber} // DO NOT REMOVE</div>
              <p className="quiz-progress-label horror-progress">
                <span className="quiz-chip quiz-chip--survival">{copy.modeChip}</span>
                <span className="horror-file-ref">{copy.question} {questionNumber} // {copy.cycle.replace('{n}', String(cycle))}</span>
                <span className="horror-static-id">ID:{question.id.slice(-8).toUpperCase()}</span>
              </p>
              <h2 className="quiz-question horror-question" data-question-id={question.id}>
                <span className="horror-question-mark">?</span>
                {quizLabel(question.q, lang)}
                <span className="horror-question-blood" aria-hidden="true" />
              </h2>
            </div>

            {verdict && (
              <div className={`quiz-verdict horror-verdict ${verdict.correct ? 'is-right' : 'is-wrong'}`} role="status">
                <div className="horror-verdict-icon">{verdict.correct ? '◍' : '☠'}</div>
                <div className="horror-verdict-body">
                  <span className="quiz-verdict-phrase horror-verdict-phrase">
                    {verdict.correct ? copy.right : verdict.timedOut ? copy.timeout : copy.wrong}
                  </span>
                  <span className="horror-verdict-sub">{verdict.correct ? 'Signal stabilized.' : 'It heard you. Closer now.'}</span>
                </div>
                {verdict.correct && verdict.points > 0 && (
                  <span className="quiz-verdict-points horror-verdict-points">+{verdict.points} {copy.points}</span>
                )}
                <div className="horror-verdict-blood" aria-hidden="true" />
              </div>
            )}

            <div className={`quiz-choices horror-choices${question.choices.length > 4 ? ' quiz-choices--five' : ''}`}>
              {question.choices.map((choice, position) => {
                const choiceClass = [
                  'quiz-choice',
                  'horror-choice',
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
                    <span className="horror-choice-key">{position + 1}</span>
                    <span className="quiz-choice-label">{quizLabel(choice.label, lang)}</span>
                    <span className="horror-choice-blood" aria-hidden="true" />
                    <span className="horror-choice-static" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            <p className="quiz-keys-hint horror-keys">⌨ {copy.keysHint.replace('{n}', String(question.choices.length))} <span className="horror-keys-warn">// DON'T HESITATE</span></p>
          </div>
        )}

        {phase === 'gameover' && finalRun && (
          <div className="quiz-player horror-gameover-root">
            <div className="quiz-result quiz-survival-result horror-gameover-card" role="region" aria-labelledby="survival-gameover-title">
              <div className="horror-gameover-static" aria-hidden="true" />
              <div className="horror-gameover-blood" aria-hidden="true" />

              <p className="quiz-result-eyebrow horror-gameover-kicker">{copy.statsTitle} // CASE CLOSED</p>
              <h2 id="survival-gameover-title" className="quiz-result-tier horror-gameover-title">
                <span className="horror-skull">☠</span> {copy.gameOver}
                <span className="horror-gameover-glitch" aria-hidden="true">{copy.gameOver}</span>
              </h2>
              <p className="horror-gameover-sub">Subject terminated. Loop reset. The signal continues without you.</p>

              <p className="quiz-survival-final-label">{copy.finalScore}</p>
              <p className="quiz-result-points horror-points">⚡ {finalRun.points} {copy.points} // EVIDENCE</p>
              {finalRun.isRecord && <span className="quiz-result-record horror-record">★ {copy.newRecord} // YOU ARE THE LAST SIGNAL</span>}

              <ul className="quiz-stats horror-stats">
                <li className="quiz-stat"><strong>{finalRun.questions}</strong><span>{copy.questionsPlayed}</span></li>
                <li className="quiz-stat"><strong>{finalRun.correct}</strong><span>{copy.correctAnswers}</span></li>
                <li className="quiz-stat"><strong>{finalRun.best?.points ?? finalRun.points}</strong><span>{copy.bestScore}</span></li>
                <li className="quiz-stat horror-stat-streak"><strong>×{finalRun.bestStreak}</strong><span>BEST SIGNAL</span></li>
              </ul>

              <div className="horror-gameover-tape">EVIDENCE SEALED // DO NOT OPEN — {new Date().toLocaleDateString()}</div>

              <div className="quiz-result-actions horror-gameover-actions">
                <button type="button" className="quiz-cta quiz-cta--primary horror-cta-enter" onClick={resetAndStart}>
                  <span className="horror-cta-text">{copy.restart}</span> <span aria-hidden="true">↻ RE-ENTER</span>
                </button>
                <Link className="quiz-cta quiz-cta--ghost horror-cta-ghost" to="/quizz">{copy.back}</Link>
              </div>

              <p className="horror-gameover-whisper">“...it’s still behind you...”</p>
            </div>
          </div>
        )}

        {!POOL_SIZE && (
          <p className="quiz-board-note horror-empty" role="alert">{copy.emptyPool}</p>
        )}
      </section>
    </div>
  );
}
