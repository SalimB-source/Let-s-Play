import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_PREFIX = 'letsplay_article_reactions:';
const CHOICES = [
  { id: 'hype', label: 'Je suis hypé', tone: 'cyan' },
  { id: 'watch', label: 'Je garde un œil', tone: 'yellow' },
  { id: 'wait', label: 'J’attends les tests', tone: 'violet' },
];

function defaultVotes() {
  return { hype: 0, watch: 0, wait: 0 };
}

function readState(articleId) {
  if (typeof window === 'undefined') return { votes: defaultVotes(), mine: '' };
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${articleId}`);
    if (!raw) return { votes: defaultVotes(), mine: '' };
    const parsed = JSON.parse(raw);
    return { votes: { ...defaultVotes(), ...(parsed.votes || {}) }, mine: parsed.mine || '' };
  } catch {
    return { votes: defaultVotes(), mine: '' };
  }
}

export default function ArticleEngagement({ articleId, title }) {
  const initial = useMemo(() => readState(articleId), [articleId]);
  const [votes, setVotes] = useState(initial.votes);
  const [mine, setMine] = useState(initial.mine);

  useEffect(() => {
    const next = readState(articleId);
    setVotes(next.votes);
    setMine(next.mine);
  }, [articleId]);

  const total = Object.values(votes).reduce((sum, value) => sum + Number(value || 0), 0);

  function react(choice) {
    setVotes((current) => {
      const next = { ...current };
      if (mine && next[mine] > 0) next[mine] -= 1;
      if (mine !== choice.id) next[choice.id] += 1;
      const nextMine = mine === choice.id ? '' : choice.id;
      setMine(nextMine);
      try { window.localStorage.setItem(`${STORAGE_PREFIX}${articleId}`, JSON.stringify({ votes: next, mine: nextMine })); } catch { /* stockage indisponible : la réaction reste visible dans la session */ }
      return next;
    });
  }

  return (
    <section className="article-engagement" aria-labelledby="article-engagement-title">
      <div className="article-engagement-heading">
        <div>
          <span className="article-engagement-kicker"><span className="live-dot" /> À VOUS DE JOUER</span>
          <h2 id="article-engagement-title">ET VOUS, <em>VOUS EN PENSEZ QUOI ?</em></h2>
          <p>Une réaction rapide, puis un vrai avis dans les commentaires. La rédaction Let’s Play veut suivre ce qui vous fait vibrer — ou douter.</p>
        </div>
        <span className="article-engagement-count">{total} réaction{total > 1 ? 's' : ''}</span>
      </div>
      <div className="article-reaction-grid" role="group" aria-label={`Réagir à l’article ${title}`}>
        {CHOICES.map((choice) => {
          const count = votes[choice.id] || 0;
          const percentage = total ? Math.round((count / total) * 100) : 0;
          return (
            <button key={choice.id} type="button" className={`article-reaction article-reaction-${choice.tone}${mine === choice.id ? ' is-selected' : ''}`} onClick={() => react(choice)} aria-pressed={mine === choice.id}>
              <span className="article-reaction-label">{choice.label}</span>
              <span className="article-reaction-meter" aria-hidden="true"><i style={{ width: `${percentage}%` }} /></span>
              <span className="article-reaction-meta">{percentage}% · {count}</span>
            </button>
          );
        })}
      </div>
      <div className="article-engagement-footer">
        <span>{mine ? 'Votre réaction est enregistrée sur cet appareil.' : 'Choisissez une réaction pour voir la tendance.'}</span>
        <Link className="arrow-link" to="#comments">REJOINDRE LA DISCUSSION <span aria-hidden="true">↗</span></Link>
      </div>
    </section>
  );
}
