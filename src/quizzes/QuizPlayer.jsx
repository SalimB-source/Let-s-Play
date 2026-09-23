import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { useAchievementAction } from '../achievements/AchievementContext';
import { quizLabel } from '../quizzesData';
import { submitQuizAttempt, writeLocalBest } from './quizApi';
import QuizChallenge from './QuizChallenge';
import { QUESTION_TIME, dayNumber, gradeQuiz, prepareQuiz } from './engine';
import {
  playQuizAnswerSound,
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
  tiers: { rookie: 'NOVICE', player: 'PLAYER', veteran: 'VETERAN', legend: 'LEGEND' },
  difficulty: { easy: 'Easy', medium: 'Seasoned', hard: 'Expert' },
};

export default function QuizPlayer({ quiz, daily = false, onBoard = null, onFinish = null }) {
  const { t, lang } = useLanguage();
  const { user, isDemo } = useAuth();
  const track = useAchievementAction();
  const copy = { ...FALLBACK, ...(t.quiz || {}), tiers: { ...FALLBACK.tiers, ...((t.quiz || {}).tiers || {}) }, difficulty: { ...FALLBACK.difficulty, ...((t.quiz || {}).difficulty || {}) } };

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
  const trackedFor = useRef(null);
  const commitRef = useRef(null);

  const start = () => {
    // Geste utilisateur : c'est ici que le contexte audio s'ouvre, sinon le
    // premier battement (une seconde plus tard) n'aurait pas le droit de jouer.
    unlockQuizAudio();
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
    setPrepared({ ...prepared, questions: missed });
    setAnswers({});
    setIndex(0);
    setResult(null);
    setReview(true);
    setLive({ right: 0, wrong: 0 });
    setPhase('play');
  };

  // Valide une réponse. `choice` vaut null quand le minuteur expire :
  // la question est alors comptée comme ratée (aucune réponse enregistrée).
  const pick = (question, choice) => {
    const correct = Boolean(choice && choice.correct);
    // Verdict sonore + compteur : la bonne réponse monte (do–mi–sol), la
    // mauvaise descend, et le temps écoulé ajoute sa note grave.
    playQuizAnswerSound(correct, { timeout: !choice });
    setLive((previous) => ({ right: previous.right + (correct ? 1 : 0), wrong: previous.wrong + (correct ? 0 : 1) }));
    const nextAnswers = choice ? { ...answers, [question.id]: choice.id } : { ...answers };
    setAnswers(nextAnswers);
    if (index + 1 < prepared.questions.length) {
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
  };

  // Le minuteur appelle toujours la dernière version de `pick` (closures
  // fraîches sur la question en cours) via cette ref.
  commitRef.current = pick;

  // Minuteur de QUESTION_TIME secondes par question : à zéro, la question
  // avance sans réponse (comptée ratée). Relancé à chaque nouvelle question.
  // Le tick-tack (`./quizSounds`) suit le même budget : il démarre avec la
  // question, reçoit le temps restant à chaque rafraîchissement et s'arrête
  // avec le minuteur (nettoyage d'effet = fin de question, de partie, ou
  // démontage du lecteur).
  useEffect(() => {
    if (phase !== 'play' || !prepared) return undefined;
    const budget = QUESTION_TIME.seconds * 1000;
    const deadline = Date.now() + budget;
    setRemainingMs(budget);
    startQuizClock(budget);
    const id = window.setInterval(() => {
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
        </div>
      </div>
    );
  }

  if (phase === 'play') {
    const question = prepared.questions[index];
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
        <div className="quiz-choices">
          {question.choices.map((choice) => (
            <button type="button" key={choice.id} className="quiz-choice" onClick={() => pick(question, choice)}>
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
        <p className="quiz-result-eyebrow">{meta.title}</p>
        <h2 className="quiz-result-tier">{copy.tiers[result.tier] || result.tier}</h2>
        <p className="quiz-result-score">{copy.score.replace('{correct}', String(result.correct)).replace('{total}', String(result.total))}</p>
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
