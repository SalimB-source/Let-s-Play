import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { fetchArticleReactions, saveArticleReaction } from '../lib/articleReactions';
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

export default function ArticleEngagement({ articleId, title }) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const generation = useRef(0);
  const busy = useRef(false);
  const currentKey = `${articleId}:${userId || ''}`;
  const state = result?.key === currentKey ? result.data : null;
  const votes = state || defaultVotes();
  const mine = state?.mine || '';

  useEffect(() => {
    const version = ++generation.current;
    let active = true;
    let reading = false;
    busy.current = false;
    setSaving(false);
    setError('');
    setResult(null);
    async function refresh() {
      if (reading || busy.current) return;
      reading = true;
      const requestVersion = generation.current;
      try {
        const data = await fetchArticleReactions(articleId);
        if (active && requestVersion === generation.current) {
          setResult({ key: currentKey, data });
          setError('');
        }
      } catch {
        if (active && requestVersion === generation.current) setError('Impossible de charger la tendance globale. Réessayez dans quelques instants.');
      } finally { reading = false; }
    }
    refresh();
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      generation.current = Math.max(generation.current, version) + 1;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [articleId, userId, currentKey]);

  const total = ['hype', 'watch', 'wait'].reduce((sum, key) => sum + Number(votes[key] || 0), 0);

  async function react(choice) {
    if (!userId || !state || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError('');
    const version = ++generation.current;
    try {
      const data = await saveArticleReaction(articleId, mine === choice.id ? null : choice.id);
      if (version === generation.current) setResult({ key: currentKey, data });
    } catch {
      if (version === generation.current) setError('Votre réaction n’a pas pu être enregistrée. Veuillez réessayer.');
    } finally {
      if (version === generation.current) {
        busy.current = false;
        setSaving(false);
      }
    }
  }

  return (
    <section className="article-engagement" aria-labelledby="article-engagement-title">
      <div className="article-engagement-heading">
        <div>
          <span className="article-engagement-kicker"><span className="live-dot" /> À VOUS DE JOUER</span>
          <h2 id="article-engagement-title">ET VOUS, <em>VOUS EN PENSEZ QUOI ?</em></h2>
          <p>Une réaction rapide, puis un vrai avis dans les commentaires. La rédaction Let’s Play veut suivre ce qui vous fait vibrer — ou douter.</p>
        </div>
        <span className="article-engagement-count">{state ? `${total} réaction${total > 1 ? 's' : ''} · tous les lecteurs` : error ? 'Tendance indisponible' : 'Chargement de la tendance…'}</span>
      </div>
      <div className="article-reaction-grid" role="group" aria-label={`Réagir à l’article ${title}`}>
        {CHOICES.map((choice) => {
          const count = votes[choice.id] || 0;
          const percentage = total ? Math.round((count / total) * 100) : 0;
          return (
            <button key={choice.id} type="button" className={`article-reaction article-reaction-${choice.tone}${mine === choice.id ? ' is-selected' : ''}`} disabled={!userId || !state || saving} onClick={() => react(choice)} aria-pressed={mine === choice.id}>
              <span className="article-reaction-icon"><ReactionIcon type={choice.icon} /></span>
              <span className="article-reaction-label">{choice.label}</span>
              <span className="article-reaction-meter" aria-hidden="true"><i style={{ width: `${percentage}%` }} /></span>
              <span className="article-reaction-meta">{state ? `${percentage}% · ${count}` : '—'}</span>
            </button>
          );
        })}
      </div>
      <div className="article-engagement-footer">
        <span>{saving ? 'Enregistrement…' : mine ? 'Votre réaction est comptabilisée dans la tendance globale.' : 'La tendance rassemble les votes de tous les lecteurs.'}</span>
        {!userId && <Link className="arrow-link" to="/auth">CONNECTEZ-VOUS POUR VOTER</Link>}
        {error && <span role="alert">{error}</span>}
        <Link className="arrow-link" to="#comments">REJOINDRE LA DISCUSSION <span aria-hidden="true">↗</span></Link>
      </div>
    </section>
  );
}
