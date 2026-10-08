import React from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import { trailerFlagLabel, trailerFlagTitle } from '../articleTrailers';
import { getArticleSentiment, sentimentMeta } from '../lib/articleSentiment';
import { Arrow } from './Arrow';

// Les catalogues utilisent aussi bien des noms de fichiers que des URLs déjà
// préfixées : une miniature ne doit jamais recevoir deux fois le baseUrl.
const imageUrl = (image) => (/^(?:https?:\/\/|\/)/i.test(image) ? image : `${base}${image}`);

/** Carte commune aux actualités du jour et à l’archive de tous les articles. */
export default function NewsCard({ story, readLabel = story.read || 'Lire l’article' }) {
  const sentiment = sentimentMeta(getArticleSentiment(story));
  const trailerFlag = trailerFlagLabel(story.to);

  return (
    <div className="news-grid-cell">
      <Link className="news-carousel-card" to={story.to}>
        <div className="news-carousel-image">
          {story.image ? (
            <img
              src={imageUrl(story.image)}
              alt={story.alt || story.title}
              loading="lazy"
              onError={(event) => {
                if (story.fallbackImage && event.currentTarget.dataset.fallback !== 'true') {
                  event.currentTarget.dataset.fallback = 'true';
                  event.currentTarget.src = imageUrl(story.fallbackImage);
                }
              }}
            />
          ) : null}
          <span className="news-feature-badge">{story.badge}</span>
          {trailerFlag ? (
            <span className="news-trailer-flag" title={trailerFlagTitle(story.to)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              {trailerFlag}
            </span>
          ) : null}
          <span className="news-feature-arrow" aria-hidden="true">↗</span>
          <span className={`news-sentiment ${sentiment.color}`} title={sentiment.label} aria-label={sentiment.label}>
            {sentiment.emoji}
          </span>
        </div>
        <div className="news-carousel-copy">
          <span className="news-kicker">{story.kicker}</span>
          <h2>{story.title}</h2>
          <p>{story.excerpt}</p>
          <span className="read-link">{readLabel} <Arrow /></span>
        </div>
      </Link>
    </div>
  );
}
