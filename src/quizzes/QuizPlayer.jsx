import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { useAchievementAction } from '../achievements/AchievementContext';
import { quizLabel } from '../quizzesData';
import { submitQuizAttempt, writeLocalBest } from './quizApi';
import QuizChallenge from './QuizChallenge';
import QuizConfetti from './QuizConfetti';
import { QUESTION_TIME, VERDICT_MS, dayNumber, gradeQuiz, prepareQuiz, quizPoints } from './engine';
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

function Arrow() { return <span aria-hidden="true">↗</span>; }

/**
 * Bouton son du lecteur : 🔊 / 🔇 avec l'état lu par les lecteurs d'écran
 * (`aria-pressed`), libellé = l'action proposée. La préférence est celle de
 * l'appareil (`./quizSounds`), partagée par tous les quizz.
 */
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

// Repli anglais : le rendu ne doit jamais casser si une clé manque dans une
// langue (même garde-fou que le reste du site).
const FALLBACK = {
  question: 'Question', of: 'of', start: 'Start', next: 'Next question', seeResults: 'See my results',
  score: '{correct}/{total} correct answers', perfect: 'FLAWLESS!', corrections: 'ANSWERS',
  yourAnswer: 'Your answer', rightAnswer: 'Answer', replay: 'Play again', others: 'All quizzes',
  readSource: 'Read the related story', questionsCount: '{n} questions', dailyTag: 'Daily quiz',
  retryMistakes: 'Retry my mistakes', reviewTag: 'REVIEW ROUND',
  timeUp: 'Time up', timeLeft: 'Time remaining',
  soundMute: 'Mute the quiz sounds', soundUnmute: 'Turn the quiz sounds back on',
  correctCount: 'Correct answers', wrongCount: 'Wrong answers',
  points: 'PTS', resultPoints: '{points} PTS', bestCombo: 'Best combo: ×{n}',
  keysHint: 'Tip: press keys 1–4 to answer',
  verdicts: {
    right: ['Correct!', 'Unbelievable!', 'Too easy, right?', 'We are on fire 🔥', 'Ice in the veins pays off.'],
    wrong: ['Oof, missed it…', 'Not this one.', 'So close!', 'That one got you.', 'Tough one — it bit back.'],
    timeout: ['Time is up!', 'Too slow…', 'The clock answered for you.'],
  },
  tiers: { rookie: 'NOVICE', player: 'PLAYER', veteran: 'VETERAN', legend: 'LEGEND' },
  difficulty: { easy: 'Easy', medium: 'Seasoned', hard: 'Expert' },
};

/** L'émoticone du palier — un peu de couleur sur l'écran de résultat. */
const TIER_EMOJI = { rookie: '😅', player: '🎮', veteran: '🎖️', legend: '👑' };

/**
 * Une phrase de verdict tirée au hasard dans le pool de la langue active :
 * la même information que le son, en plus d'un ton. Sans pool (clé manquante
 * non couverte par le repli), rien s'affiche — le bandeau porte quand même
 * les points.
 */
function pickVerdict(copy, correct, timedOut) {
  const pool = timedOut ? copy.verdicts.timeout : correct ? copy.verdicts.right : copy.verdicts.wrong;
  const list = Array.isArray(pool) && pool.length ? pool : [];
  return list.length ? list[Math.floor(Math.random() * list.length)] : '';
}

export default function QuizPlayer({ quiz, daily = false, onBoard = null, onFinish = null }) {
  const { t, lang } = useLanguage();
  const { user, isDemo } = useAuth();
  const track = useAchievementAction();
  const copy = {
    ...FALLBACK,
    ...(t.quiz || {}),
    tiers: { ...FALLBACK.tiers, ...((t.quiz || {}).tiers || {}) },
    difficulty: { ...FALLBACK.difficulty, ...((t.quiz || {}).difficulty || {}) },
    verdicts: { ...FALLBACK.verdicts, ...((t.quiz || {}).verdicts || {}) },
  };

  const [phase, setPhase] = useState('intro');
  const [prepared, setPrepared] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [review, setReview] = useState(false);
  const [remainingMs, setRemainingMs] = useState(() => QUESTION_TIME.seconds * 1000);
  // Son du quizz (tick-tack + verdicts) : préférence de l'appareil, et
  // compteur de la partie en cours — le son dit ce que l'écran ne montre pas,
  // puisque la question suivante s'affiche aussitôt ; le compteur donne la
  // même information sans le son (et pour les lecteurs d'écran).
  const [soundOn, setSoundOn] = useState(() => quizSoundEnabled());
  const [live, setLive] = useState({ right: 0, wrong: 0 });
  // « Fun » de la partie : points de rapidité + combo (hors barème officiel,
  // voir `quizPoints` du moteur), série en cours, meilleure série et le
  // gel de verdict en attente (null = question libre).
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [verdict, setVerdict] = useState(null);
  const trackedFor = useRef(null);
  const commitRef = useRef(null);
  const lockedRef = useRef(false);
  const streakRef = useRef(0);
  const pointsRef = useRef(0);
  const bestStreakRef = useRef(0);
  const questionStartRef = useRef(0);
  const verdictTimerRef = useRef(null);
  const fanfareFor = useRef(null);

  /** Remise à zéro du « fun » entre deux parties (nulle pour la révision). */
  const resetRun = () => {
    if (verdictTimerRef.current) {
      window.clearTimeout(verdictTimerRef.current);
      verdictTimerRef.current = null;
    }
    lockedRef.current = false;
    streakRef.current = 0;
    pointsRef.current = 0;
    bestStreakRef.current = 0;
    setPoints(0);
    setStreak(0);
    setBestStreak(0);
    setVerdict(null);
  };

  const start = () => {
    // Geste utilisateur : c'est ici que le contexte audio s'ouvre, sinon le
    // premier battement (une seconde plus tard) n'aurait pas le droit de jouer.
    unlockQuizAudio();
    resetRun();
    // Quizz du jour : même mélange pour tout le monde (graine = numéro du jour).
    setPrepared(prepareQuiz(quiz, daily ? dayNumber(new Date()) : null));
    setAnswers({});
    setIndex(0);
    setResult(null);
    setReview(false);
    setLive({ right: 0, wrong: 0 });
    setPhase('play');
  };

  // Révision : ne rejoue que les questions ratées au tour précédent.
  // C'est de l'entraînement : ni succès, ni record, ni classement ne bougent.
  const startReview = () => {
    const missed = (result?.detail || []).filter((entry) => !entry.correct).map((entry) => entry.question);
    if (!missed.length) return;
    unlockQuizAudio();
    resetRun();
    setPrepared({ ...prepared, questions: missed });
    setAnswers({});
    setIndex(0);
    setResult(null);
    setReview(true);
    setLive({ right: 0, wrong: 0 });
    setPhase('play');
  };

  // Valide une réponse. `choice` vaut null quand le minuteur expire.
  // Pendant le gel de verdict (après un clic), toute entrée est ignorée :
  // le clavier, le minuteur et les boutons passent par ce même garde-fou.
  const pick = (question, choice) => {
    if (lockedRef.current) return;
    const budget = QUESTION_TIME.seconds * 1000;
    const elapsed = Math.min(budget, Math.max(0, Date.now() - questionStartRef.current));
    const correct = Boolean(choice && choice.correct);
    let pointsGained = 0;
    if (correct) {
      streakRef.current += 1;
      const gained = quizPoints({ elapsedMs: elapsed, budgetMs: budget, streak: streakRef.current });
      pointsGained = gained.total;
      pointsRef.current += gained.total;
      bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
      setPoints(pointsRef.current);
      setStreak(streakRef.current);
      setBestStreak(bestStreakRef.current);
      // Combo dès la deuxième bonne réponse : le bip monte avec la série.
      if (streakRef.current >= 2) playQuizComboSound(streakRef.current);
    } else {
      streakRef.current = 0;
      setStreak(0);
    }
    // Verdict sonore + compteur : la bonne réponse monte (do–mi–sol), la
    // mauvaise descend, et le temps écoulé ajoute sa note grave.
    playQuizAnswerSound(correct, { timeout: !choice });
    setLive((previous) => ({ right: previous.right + (correct ? 1 : 0), wrong: previous.wrong + (correct ? 0 : 1) }));
    const nextAnswers = choice ? { ...answers, [question.id]: choice.id } : { ...answers };
    setAnswers(nextAnswers);
    // Gel de verdict : le temps s'arrête, l'écran dit ce qui vient de se
    // passer (vert/rouge + phrase + points), puis la question suivante.
    setVerdict({
      questionId: question.id,
      choiceId: choice ? choice.id : null,
      correct,
      timedOut: !choice,
      phrase: pickVerdict(copy, correct, !choice),
      points: pointsGained,
    });
    lockedRef.current = true;
    const isLast = index + 1 >= prepared.questions.length;
    if (verdictTimerRef.current) window.clearTimeout(verdictTimerRef.current);
    verdictTimerRef.current = window.setTimeout(() => {
      verdictTimerRef.current = null;
      lockedRef.current = false;
      setVerdict(null);
      if (!isLast) {
        setIndex(index + 1);
        return;
      }
      const graded = gradeQuiz(prepared, nextAnswers);
      setResult(graded);
      setPhase('result');
      // Une seule fois par partie : le moteur des succès crédite l'action
      // (quizz joué, sans-faute, jour de quizz du jour pour la série).
      if (!review && trackedFor.current !== prepared) {
        trackedFor.current = prepared;
        track('quiz_completed', { id: quiz.slug, perfect: graded.perfect, daily });
        // Le score : meilleur score de l'appareil pour tout le monde, et
        // tentative serveur (classement partagé) pour les comptes connectés.
        writeLocalBest(quiz.slug, graded.correct, graded.total);
        if (onFinish) onFinish(graded);
        if (user && !isDemo) {
          submitQuizAttempt({
            quizId: quiz.slug,
            score: graded.correct,
            total: graded.total,
            perfect: graded.perfect,
          }).then((board) => { if (board && onBoard) onBoard(board); });
        }
      }
    }, VERDICT_MS);
  };

  // Le minuteur et le clavier appellent toujours la dernière version de
  // `pick` (closures fraîches sur la question en cours) via cette ref.
  commitRef.current = pick;

  // Minuteur de QUESTION_TIME secondes par question : à zéro, la question
  // avance sans réponse (comptée ratée). Relancé à chaque nouvelle question.
  // Le tick-tack (`./quizSounds`) suit le même budget : il démarre avec la
  // question, reçoit le temps restant à chaque rafraîchissement et s'arrête
  // avec le minuteur (nettoyage d'effet = fin de question, de partie, ou
  // démontage du lecteur). Pendant le gel de verdict, le garde-fou `lockedRef`
  // fige le décompte : le temps ne doit pas « répondre » à une question
  // déjà tranchée.
  useEffect(() => {
    if (phase !== 'play' || !prepared) return undefined;
    const budget = QUESTION_TIME.seconds * 1000;
    const deadline = Date.now() + budget;
    questionStartRef.current = Date.now();
    setRemainingMs(budget);
    startQuizClock(budget);
    const id = window.setInterval(() => {
      if (lockedRef.current) return;
      const left = deadline - Date.now();
      if (left > 0) {
        setRemainingMs(left);
        updateQuizClock(left, budget);
        return;
      }
      window.clearInterval(id);
      setRemainingMs(0);
      commitRef.current(prepared.questions[index], null);
    }, 100);
    return () => {
      window.clearInterval(id);
      stopQuizClock();
    };
  }, [phase, index, prepared]);

  // Raccourcis clavier : les touches 1–4 valident le choix affiché (les
  // tryhards répondent sans main. Le garde-fou du gel s'applique, et on ne
  // vole jamais une frappe destinée à un champ de saisie — commentaires,
  // recherche, messagerie).
  useEffect(() => {
    if (phase !== 'play' || !prepared) return undefined;
    const onKey = (event) => {
      if (lockedRef.current || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const position = ['1', '2', '3', '4'].indexOf(event.key);
      if (position === -1) return;
      const question = prepared.questions[index];
      const choice = question.choices[position];
      if (choice) commitRef.current(question, choice);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, index, prepared]);

  // Le fanfare de l'écran de résultat sonne une seule fois par partie —
  // même si le composant se remonte en mode développement (StrictMode).
  useEffect(() => {
    if (phase !== 'result' || !result || fanfareFor.current === result) return;
    fanfareFor.current = result;
    playQuizResultFanfare(result.tier);
  }, [phase, result]);

  // Aucun gel de verdict ne survit au démontage du lecteur.
  useEffect(() => () => {
    if (verdictTimerRef.current) window.clearTimeout(verdictTimerRef.current);
  }, []);

  if (phase === 'intro' || !prepared) {
    const meta = quizLabel(quiz.labels, lang) || {};
    return (
      <div className="quiz-player">
        <div className="quiz-player-intro">
          <div className="quiz-chips">
            <span className="quiz-chip">{quiz.tag}</span>
            <span className={`quiz-chip quiz-chip--${quiz.difficulty}`}>{copy.difficulty[quiz.difficulty] || quiz.difficulty}</span>
            <span className="quiz-chip quiz-chip--count">{copy.questionsCount.replace('{n}', String(quiz.questions.length))}</span>
            {daily && <span className="quiz-chip quiz-chip--daily"><i className="live-dot" aria-hidden="true" /> {copy.dailyTag}</span>}
          </div>
          <h1>{meta.title}</h1>
          {meta.text ? <p>{meta.text}</p> : null}
          <div className="quiz-player-actions">
            <button type="button" className="button button-yellow" onClick={start}>{copy.start} <Arrow /></button>
            {/* Réglage accessible avant de lancer la partie : le tick-tack
                démarre dès « Commencer ». */}
            <SoundToggle
              on={soundOn}
              label={soundOn ? copy.soundMute : copy.soundUnmute}
              onToggle={() => setSoundOn(setQuizSoundEnabled(!soundOn))}
            />
          </div>
          <p className="quiz-keys-hint">⌨ {copy.keysHint}</p>
        </div>
      </div>
    );
  }

  if (phase === 'play') {
    const question = prepared.questions[index];
    const choiceStates = (choice) => {
      const classes = ['quiz-choice'];
      if (verdict) classes.push('is-locked');
      if (verdict && verdict.choiceId === choice.id) classes.push(verdict.correct ? 'is-correct' : 'is-wrong');
      if (verdict && !verdict.correct && choice.correct) classes.push('is-reveal');
      return classes.join(' ');
    };
    return (
      <div className="quiz-player">
        <div className="quiz-progress" role="progressbar" aria-valuemin={1} aria-valuemax={prepared.questions.length} aria-valuenow={index + 1}>
          <span style={{ width: `${((index + 1) / prepared.questions.length) * 100}%` }} />
        </div>
        <div className="quiz-hud">
          <div className={`quiz-timer${remainingMs < 3000 ? ' is-low' : ''}`} role="timer" aria-label={copy.timeLeft}>
            <span className="quiz-timer-count">{Math.ceil(remainingMs / 1000)}s</span>
            <span className="quiz-timer-track"><i style={{ width: `${(remainingMs / (QUESTION_TIME.seconds * 1000)) * 100}%` }} /></span>
          </div>
          {/* Même information que le son, sans le son : le verdict s'affiche
              aussi (et se lit) — la question suivante arrive immédiatement. */}
          <p className="quiz-live" aria-live="polite" aria-label={`${copy.correctCount} : ${live.right}, ${copy.wrongCount} : ${live.wrong}`}>
            <span className="quiz-live-item quiz-live-item--right" aria-hidden="true">✓ {live.right}</span>
            <span className="quiz-live-item quiz-live-item--wrong" aria-hidden="true">✗ {live.wrong}</span>
            <span className="quiz-live-item quiz-live-item--points" aria-hidden="true">⚡ {points}</span>
            {streak >= 2 && <span className="quiz-live-item quiz-live-item--streak" aria-hidden="true">🔥 ×{streak}</span>}
          </p>
          <SoundToggle
            on={soundOn}
            label={soundOn ? copy.soundMute : copy.soundUnmute}
            onToggle={() => setSoundOn(setQuizSoundEnabled(!soundOn))}
          />
        </div>
        <p className="quiz-progress-label">{copy.question} {index + 1} {copy.of} {prepared.questions.length}</p>
        {review && <span className="quiz-result-review">{copy.reviewTag}</span>}
        <h2 className="quiz-question">{quizLabel(question.q, lang)}</h2>
        {verdict && (
          <p className={`quiz-verdict ${verdict.correct ? 'is-right' : 'is-wrong'}`} role="status">
            {verdict.phrase && <span className="quiz-verdict-phrase">{verdict.phrase}</span>}
            {verdict.correct && (
              <span className="quiz-verdict-points">
                +{verdict.points} {copy.points}
                {streak >= 2 && <span className="quiz-verdict-combo">COMBO ×{streak}</span>}
              </span>
            )}
          </p>
        )}
        <div className="quiz-choices">
          {question.choices.map((choice) => (
            <button type="button" key={choice.id} className={choiceStates(choice)} disabled={Boolean(verdict)} onClick={() => pick(question, choice)}>
              {quizLabel(choice.label, lang)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const tierClass = `quiz-tier--${result.tier}`;
  const meta = quizLabel(quiz.labels, lang) || {};
  return (
    <div className="quiz-player">
      <div className={`quiz-result ${tierClass}`}>
        {result.perfect && <QuizConfetti />}
        <p className="quiz-result-eyebrow">{meta.title}</p>
        <h2 className="quiz-result-tier">
          {TIER_EMOJI[result.tier] ? <span aria-hidden="true">{TIER_EMOJI[result.tier]} </span> : null}
          {copy.tiers[result.tier] || result.tier}
        </h2>
        <p className="quiz-result-score">{copy.score.replace('{correct}', String(result.correct)).replace('{total}', String(result.total))}</p>
        <p className="quiz-result-points">⚡ {copy.resultPoints.replace('{points}', String(points))}</p>
        {bestStreak >= 2 && <p className="quiz-result-combo">🔥 {copy.bestCombo.replace('{n}', String(bestStreak))}</p>}
        {result.perfect && <span className="quiz-result-perfect">★ {copy.perfect}</span>}
        {review && <span className="quiz-result-review">{copy.reviewTag}</span>}
        <div className="quiz-result-actions">
          {result.correct < result.total && (
            <button type="button" className="button button-yellow" onClick={startReview}>{copy.retryMistakes}</button>
          )}
          <button type="button" className="button button-ghost" onClick={start}>{copy.replay}</button>
          <Link className="button button-ghost" to="/quizz">{copy.others} <Arrow /></Link>
          {quiz.source && <Link className="arrow-link" to={quiz.source}>{copy.readSource} <Arrow /></Link>}
        </div>
      </div>
      <QuizChallenge quiz={quiz} score={result.correct} total={result.total} />
      <section className="quiz-corrections">
        <div className="section-label"><span>{copy.corrections}</span><span>{meta.title}</span></div>
        <ol>
          {result.detail.map((entry) => (
            <li key={entry.question.id} className={`quiz-fix ${entry.correct ? 'is-right' : 'is-wrong'}`}>
              <p className="quiz-fix-q">{quizLabel(entry.question.q, lang)}</p>
              <p className="quiz-fix-a">
                <span>{copy.yourAnswer} : {entry.picked ? quizLabel(entry.picked.label, lang) : copy.timeUp}</span>
                {!entry.correct && entry.solution && <span>{copy.rightAnswer} : {quizLabel(entry.solution.label, lang)}</span>}
              </p>
              {entry.question.why && <p className="quiz-fix-why">{quizLabel(entry.question.why, lang)}</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
