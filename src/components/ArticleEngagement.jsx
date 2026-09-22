import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_PREFIX = 'letsplay_article_reactions:';
const CHOICES = [
  { id: 'hype', label: 'Je suis hypé', tone: 'cyan', icon: 'rocket' },
  { id: 'watch', label: 'Je garde un œil', tone: 'yellow', icon: 'eye' },
  { id: 'wait', label: 'J’attends les tests', tone: 'violet', icon: 'controller' },
];

function ReactionIcon({ type }) {
  if (type === 'rocket') return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M18.8 4.3c4.8-.8 7.4-.1 7.4-.1s.7 2.6-.1 7.4c-.6 3.6-3 7-6.7 9.8l-4.8-4.8c2.7-3.8 5.1-7 9.2-8.6" /><path d="m14.6 16.6-4.8.7-3.1 3.1 5.2.6.6 5.2 3.1-3.1.7-4.8M11.8 22.1l-3.6 3.6M21 11.1h.1" /></svg>;
  if (type === 'eye') return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3.5 16s4.7-7.3 12.5-7.3S28.5 16 28.5 16 23.8 23.3 16 23.3 3.5 16 3.5 16Z" /><circle cx="16" cy="16" r="3.8" /></svg>;
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11.5 14.2 14 8.8h4l2.5 5.4M8.5 17.2H5.8v5.1h3.8l3.4 3.2h2.4v-8.8l-3.8.5-3.1-3.1Z" /><path d="M21 17.1h2.4M21 21.1h2.4M25.4 17.1h1M25.4 21.1h1M18.2 17.8v7.7h7.1c1.4 0 2.3-.9 2.3-2.2v-4.9c0-1.3-.9-2.2-2.3-2.2h-5.1" /></svg>;
}

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
              <span className="article-reaction-icon"><ReactionIcon type={choice.icon} /></span>
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
