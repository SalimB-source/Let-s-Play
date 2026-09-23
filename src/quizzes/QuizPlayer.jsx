import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAchievementAction } from '../achievements/AchievementContext';
import { quizLabel } from '../quizzesData';
import { dayNumber, gradeQuiz, prepareQuiz } from './engine';

function Arrow() { return <span aria-hidden="true">↗</span>; }

// Repli anglais : le rendu ne doit jamais casser si une clé manque dans une
// langue (même garde-fou que le reste du site).
const FALLBACK = {
  question: 'Question', of: 'of', start: 'Start', next: 'Next question', seeResults: 'See my results',
  score: '{correct}/{total} correct answers', perfect: 'FLAWLESS!', corrections: 'ANSWERS',
  yourAnswer: 'Your answer', rightAnswer: 'Answer', replay: 'Play again', others: 'All quizzes',
  readSource: 'Read the related story', questionsCount: '{n} questions', dailyTag: 'Daily quiz',
  tiers: { rookie: 'NOVICE', player: 'PLAYER', veteran: 'VETERAN', legend: 'LEGEND' },
  difficulty: { easy: 'Easy', medium: 'Seasoned', hard: 'Expert' },
};

export default function QuizPlayer({ quiz, daily = false }) {
  const { t, lang } = useLanguage();
  const track = useAchievementAction();
  const copy = { ...FALLBACK, ...(t.quiz || {}), tiers: { ...FALLBACK.tiers, ...((t.quiz || {}).tiers || {}) }, difficulty: { ...FALLBACK.difficulty, ...((t.quiz || {}).difficulty || {}) } };

  const [phase, setPhase] = useState('intro');
  const [prepared, setPrepared] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const trackedFor = useRef(null);

  const start = () => {
    // Quizz du jour : même mélange pour tout le monde (graine = numéro du jour).
    setPrepared(prepareQuiz(quiz, daily ? dayNumber(new Date()) : null));
    setAnswers({});
    setIndex(0);
    setResult(null);
    setPhase('play');
  };

  const pick = (question, choice) => {
    const nextAnswers = { ...answers, [question.id]: choice.id };
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
    if (trackedFor.current !== prepared) {
      trackedFor.current = prepared;
      track('quiz_completed', { id: quiz.slug, perfect: graded.perfect, daily });
    }
  };

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
          <button type="button" className="button button-yellow" onClick={start}>{copy.start} <Arrow /></button>
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
        <p className="quiz-progress-label">{copy.question} {index + 1} {copy.of} {prepared.questions.length}</p>
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
        <div className="quiz-result-actions">
          <button type="button" className="button button-yellow" onClick={start}>{copy.replay}</button>
          <Link className="button button-ghost" to="/quizz">{copy.others} <Arrow /></Link>
          {quiz.source && <Link className="arrow-link" to={quiz.source}>{copy.readSource} <Arrow /></Link>}
        </div>
      </div>
      <section className="quiz-corrections">
        <div className="section-label"><span>{copy.corrections}</span><span>{meta.title}</span></div>
        <ol>
          {result.detail.map((entry) => (
            <li key={entry.question.id} className={`quiz-fix ${entry.correct ? 'is-right' : 'is-wrong'}`}>
              <p className="quiz-fix-q">{quizLabel(entry.question.q, lang)}</p>
              <p className="quiz-fix-a">
                <span>{copy.yourAnswer} : {entry.picked ? quizLabel(entry.picked.label, lang) : '—'}</span>
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
