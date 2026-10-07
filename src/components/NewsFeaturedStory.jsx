import React from 'react';
import { Link } from 'react-router-dom';
import { Arrow } from './ReleasesCalendar';
import ScrollAutoplayVideo from './ScrollAutoplayVideo';
import { leadTrailer } from '../articleTrailers';

/**
 * Bandeau de la première actu d'un flux : vidéo officielle si l'article en
 * déclare une, visuel de l'article sinon, avec le texte éditorial à côté.
 */
export default function NewsFeaturedStory({ story, todayLabel, renderStoryImage, renderBadges }) {
  if (!story) return null;

  const trailer = leadTrailer(story.to);

  return (
    <article className="daily-news-card news-today news-featured-story" data-parallax="0.04" data-parallax-limit="20">
      <div className="daily-news-image news-featured-story-media">
        {trailer ? (
          <ScrollAutoplayVideo
            id={trailer.id}
            title={`${trailer.title} — ${trailer.channel}`}
            posterAlt={story.alt}
          />
        ) : renderStoryImage(story, 'eager')}
        {renderBadges?.(story)}
      </div>
      <Link
        className="daily-news-copy"
        to={story.to}
        aria-label={`${story.read || todayLabel} : ${story.title}`}
      >
        <p className="eyebrow"><span className="live-dot" /> {todayLabel}</p>
        {!trailer && story.imageCredit && <span className="cinema-image-credit">{story.imageCredit}</span>}
        <span className="news-kicker">{story.kicker}</span>
        <h2>{story.title}</h2>
        <p>{story.excerpt}</p>
        <span className="read-link">{story.read} <Arrow /></span>
      </Link>
    </article>
  );
}
