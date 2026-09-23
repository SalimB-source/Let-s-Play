import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { fetchGlobalQuizRank, quizApiEnabled } from './quizApi';

const FALLBACK = {
  title: 'GLOBAL QUIZ RANKING',
  sub: 'Position in the global ranking — points earned across every quiz.',
  position: 'Rank', points: 'Points earned', quizzes: 'Quizzes played', players: 'Ranked players',
  unranked: 'Not ranked yet — play a quiz to enter the ranking.',
  offline: 'Global ranking offline — Supabase is not configured in this environment.',
  loading: 'Loading the global ranking…',
  unavailable: 'Global ranking unavailable for now — try again later.',
  scripted: 'Offline demo rank — scripted until the backend is available.',
};

function hashString(value) {
  const input = String(value || 'guest');
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

/**
 * Rang déterministe pour les fiches qui n'ont pas de backend à interroger
 * (personas, communauté démo, profil personnel en aperçu hors-ligne). Il donne
 * un écran crédible et stable sans prétendre être le classement Supabase réel.
 */
export function scriptedGlobalQuizRank(userId, seed = {}) {
  const hash = hashString(userId);
  const xp = Number(seed.xp || 0);
  const level = Number(seed.level || 1);
  const quizzes = Math.max(1, Math.min(8, Number(seed.quizzes || (2 + (hash % 5) + Math.floor(level / 18)))));
  const points = Math.max(240, Number(seed.points || (quizzes * 420 + level * 37 + Math.floor(xp / 6) + (hash % 260))));
  const players = Math.max(32, Number(seed.players || (96 + (hash % 54))));
  const rank = Math.max(1, Math.min(players, Number(seed.rank || (1 + (hash + Math.max(0, 8000 - points)) % players))));
  return { rank, points, quizzes, players, scripted: true };
}

function RankCards({ rank, copy }) {
  return (
    <div className="quiz-rank-cards">
      <div className="quiz-rank-hero-card quiz-rank-position">
        <span className="quiz-rank-card-kicker">GLOBAL RANK</span>
        <div className="quiz-rank-hero-value">#{rank.rank}</div>
        <div className="quiz-rank-card-label">{copy.position}</div>
      </div>
      <div className="quiz-rank-hero-card quiz-rank-points">
        <span className="quiz-rank-card-kicker">LET’S PLAY SCORE</span>
        <div className="quiz-rank-hero-value">{Number(rank.points || 0).toLocaleString()}</div>
        <div className="quiz-rank-card-label">{copy.points}</div>
      </div>
      <div className="quiz-rank-meta-card">
        <div className="quiz-rank-meta-value">{rank.quizzes}</div>
        <div className="quiz-rank-card-label">{copy.quizzes}</div>
      </div>
      <div className="quiz-rank-meta-card">
        <div className="quiz-rank-meta-value">{rank.players}</div>
        <div className="quiz-rank-card-label">{copy.players}</div>
      </div>
    </div>
  );
}

/**
 * Position d'un joueur au classement GLOBAL des quizz — section de la page de
 * profil : somme des points de ses meilleures parties, tous quizz confondus
 * (RPC `get_quiz_global_rank`). Compte connecté : les cartes affichent la
 * position (#n), les points cumulés, les quizz joués et le nombre de joueurs
 * classés. Sans backend, les fiches scriptées peuvent fournir un rang de démo ;
 * sinon la section reste visible avec un état explicite (chargement,
 * indisponible, pas encore classé ou hors-ligne) — jamais une carte vide.
 */
export default function QuizGlobalRank({ userId, self = false, scriptedFallback = null }) {
  const { t } = useLanguage();
  const { user, isDemo } = useAuth();
  const copy = { ...FALLBACK, ...((t.quiz || {}).rank || {}) };
  const connected = Boolean(user) && !isDemo;
  const backendEnabled = quizApiEnabled();
  const live = backendEnabled && Boolean(userId) && (!self || connected);
  const scriptedRank = useMemo(
    () => (scriptedFallback ? scriptedGlobalQuizRank(userId, scriptedFallback) : null),
    [scriptedFallback, userId],
  );
  const [rank, setRank] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRank(null);
    setLoaded(false);
    if (live) {
      fetchGlobalQuizRank(userId).then((data) => {
        if (!cancelled) {
          setRank(data || null);
          setLoaded(true);
        }
      }).catch(() => {
        if (!cancelled) {
          setRank(null);
          setLoaded(true);
        }
      });
    }
    return () => { cancelled = true; };
  }, [live, userId]);

  const displayedRank = live ? rank : scriptedRank;
  let note = null;
  if (live && !loaded) note = copy.loading;
  else if (live && loaded && !rank) note = copy.unavailable;
  else if (displayedRank && displayedRank.rank == null) note = copy.unranked;
  else if (!live && scriptedRank) note = copy.scripted;
  else if (!live) note = copy.offline;

  return (
    <div className="player-section quiz-global-rank">
      <div className="quiz-rank-heading">
        <div>
          <span className="quiz-rank-kicker"><span className="quiz-rank-mark">✦</span> PLAYER STATUS</span>
          <h2>{copy.title}</h2>
          <p>{copy.sub}</p>
        </div>
        <span className="quiz-rank-live">{displayedRank?.scripted ? 'DEMO SIGNAL' : 'LIVE SCORE'}</span>
      </div>
      {note && <p className="player-empty-note">{note}</p>}
      {displayedRank && displayedRank.rank != null && <RankCards rank={displayedRank} copy={copy} />}
    </div>
  );
}
