import React, { useEffect, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { fetchGlobalQuizRank, quizApiEnabled } from './quizApi';

const FALLBACK = {
  title: 'GLOBAL QUIZ RANKING',
  sub: 'Position in the global ranking — points earned across every quiz.',
  position: 'Rank', points: 'Points earned', quizzes: 'Quizzes played', players: 'Ranked players',
  unranked: 'Not ranked yet — play a quiz to enter the ranking.',
  offline: 'Connect a player account (with Supabase configured) to show your global rank.',
};

/**
 * Position d'un joueur au classement GLOBAL des quizz — section de la page de
 * profil : somme des points de ses meilleures parties, tous quizz confondus
 * (RPC `get_quiz_global_rank`). Compte connecté : les cartes affichent la
 * position (#n), les points cumulés, les quizz joués et le nombre de joueurs
 * classés. Sans backend, ou en session démo (aucun compte côté serveur), un
 * message explique comment débloquer la section — rien ne casse.
 */
export default function QuizGlobalRank({ userId, self = false }) {
  const { t } = useLanguage();
  const { user, isDemo } = useAuth();
  const copy = { ...FALLBACK, ...((t.quiz || {}).rank || {}) };
  const connected = Boolean(user) && !isDemo;
  const live = quizApiEnabled() && Boolean(userId) && (!self || connected);
  const [rank, setRank] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (live) {
      fetchGlobalQuizRank(userId).then((data) => {
        if (!cancelled && data) setRank(data);
      });
    }
    return () => { cancelled = true; };
  }, [live, userId]);

  return (
    <div className="player-section quiz-global-rank">
      <div className="player-section-header">
        <h2>{copy.title}</h2>
        <p>{copy.sub}</p>
      </div>
      {!live && <p className="player-empty-note">{copy.offline}</p>}
      {live && rank && rank.rank == null && <p className="player-empty-note">{copy.unranked}</p>}
      {live && rank && rank.rank != null && (
        <div className="player-stats-grid">
          <div className="player-stat-card">
            <div className="player-stat-value">#{rank.rank}</div>
            <div className="player-stat-label">{copy.position}</div>
          </div>
          <div className="player-stat-card">
            <div className="player-stat-value">{rank.points}</div>
            <div className="player-stat-label">{copy.points}</div>
          </div>
          <div className="player-stat-card">
            <div className="player-stat-value">{rank.quizzes}</div>
            <div className="player-stat-label">{copy.quizzes}</div>
          </div>
          <div className="player-stat-card">
            <div className="player-stat-value">{rank.players}</div>
            <div className="player-stat-label">{copy.players}</div>
          </div>
        </div>
      )}
    </div>
  );
}
