import React, { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { fetchQuizLeaderboard, formatBest, quizApiEnabled, quizAttemptId, readLocalBest, readLocalBestRun } from './quizApi';

const FALLBACK = {
  boardTitle: 'Leaderboard',
  offline: 'Connect a player account (with Supabase configured) to compare your scores with the community.',
  empty: 'No scores yet — be the first on the leaderboard.',
  you: 'You',
  bestDevice: 'Best score on this device',
  bestOther: 'This level is still untouched — your best score on this quiz is on another level.',
  levels: { easy: 'Easy', medium: 'Seasoned', hard: 'Expert' },
};

/**
 * Classement d'un NIVEAU de quizz : top 10 partagé pour les comptes connectés
 * (RPC `get_quiz_leaderboard`, clé `slug:niveau`, trié par POINTS gagnés — les
 * bonnes réponses restent affichées en secondaire), meilleure partie de
 * l'appareil pour les visiteurs. Sans backend, un message explique comment
 * débloquer le classement — rien ne casse.
 */
export default function QuizLeaderboard({ quiz, level = 'easy', lastBoard = null, refreshKey = 0 }) {
  const { t } = useLanguage();
  const { user, isDemo } = useAuth();
  const copy = {
    ...FALLBACK,
    ...((t.quiz || {}).board || {}),
    levels: { ...FALLBACK.levels, ...((t.quiz || {}).levels || {}) },
  };
  const [rows, setRows] = useState(lastBoard);
  // Relu à chaque fin de partie (`refreshKey`) et à chaque changement de
  // niveau : la meilleure partie de l'appareil change sans que ce composant
  // ne reçoive d'autre mise à jour.
  // Record de l'appareil : celui du NIVEAU affiché (une ligne de classement par
  // niveau), plus le meilleur du quizz toutes difficultés confondues.
  const [localBest, setLocalBest] = useState(() => readLocalBestRun(quiz.slug, level));
  const [quizBest, setQuizBest] = useState(() => readLocalBest(quiz.slug));
  const connected = Boolean(user) && !isDemo;

  useEffect(() => {
    let cancelled = false;
    if (quizApiEnabled()) {
      setRows(null);
      fetchQuizLeaderboard(quizAttemptId(quiz.slug, level)).then((data) => {
        if (!cancelled && data) setRows(data);
      });
    }
    return () => { cancelled = true; };
  }, [quiz.slug, level, lastBoard]);

  useEffect(() => {
    setLocalBest(readLocalBestRun(quiz.slug, level));
    setQuizBest(readLocalBest(quiz.slug));
  }, [quiz.slug, level, refreshKey]);

  const list = Array.isArray(rows) ? rows : [];

  return (
    <section className="quiz-board">
      <div className="section-label"><span>{copy.boardTitle}</span><span>{copy.levels[level] || level}</span></div>
      {!quizApiEnabled() && <p className="quiz-board-note">{copy.offline}</p>}
      {quizApiEnabled() && list.length === 0 && <p className="quiz-board-note">{copy.empty}</p>}
      {list.length > 0 && (
        <ol className="quiz-board-list">
          {list.map((row, index) => (
            <li key={`${row.username}-${index}`} className={`quiz-board-row${row.mine ? ' is-mine' : ''}`}>
              <span className="quiz-board-rank">{String(index + 1).padStart(2, '0')}</span>
              <span className="quiz-board-name">
                {row.avatar_url ? <img src={row.avatar_url} alt="" loading="lazy" referrerPolicy="no-referrer" /> : null}
                {row.username || copy.you}
              </span>
              <span className="quiz-board-score">
                {/* Les points mènent le classement ; les bonnes réponses du
                    même run restent visibles en secondaire. Repli sans points
                    (ancien backend) : l'ancien affichage score/total. */}
                {row.points != null ? `⚡ ${row.points} PTS` : `${row.score}/${row.total}`}
                {row.perfect ? ' ★' : ''}
                {row.points != null && <span className="quiz-board-detail">{row.score}/{row.total}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
      {!connected && localBest && (
        <p className="quiz-board-local">{copy.bestDevice} : <strong>{formatBest(localBest)}</strong></p>
      )}
      {!connected && !localBest && quizBest && (
        <p className="quiz-board-local">{copy.bestOther}</p>
      )}
    </section>
  );
}
