import React, { useState } from 'react';
import VideoThumb from './VideoThumb';
import { youTubeEmbedUrl } from '../lib/videoPlayback';
import { trailerBadgeLabel, trailerKindLabel, trailerWatchUrl } from '../articleTrailers';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * Bandes-annonces et teasers d'un article actu, intégrés au corps du texte.
 *
 * Le lecteur est celui du site : l'embed passe par `youTubeEmbedUrl()`
 * (donc `enablejsapi=1`) et le coordinateur « une seule vidéo à la fois »
 * (`src/lib/videoPlayback.js`) le met en pause dès qu'un autre lecteur
 * démarre — aucune exception pour les bandes-annonces.
 *
 * Quand un article a plusieurs vidéos (une bande-annonce et un teaser, deux
 * bandes-annonces d'un même film…), le sélecteur sous le lecteur affiche les
 * miniatures YouTube via `VideoThumb` : la fabrique d'URL et la chaîne de repli
 * restent celles de `src/lib/videoThumbnails.js`.
 *
 * Une vidéo d'illustration (saison précédente, film précédent) porte un
 * `note` : il est affiché sous le lecteur, pour que le lecteur ne croie pas
 * voir des images de ce qui n'existe pas encore. Un article sans aucune vidéo
 * officielle rend `pending` — l'absence est écrite noir sur blanc.
 *
 * @param {object} props
 * @param {string} props.label sujet affiché dans l'en-tête du bloc
 * @param {string} [props.meta] badge à droite de l'en-tête (studio, diffuseur)
 * @param {Array<{id: string, kind: string, title: string, channel: string, note?: string}>} [props.items]
 * @param {string} [props.credit] ligne de mention sous le bloc
 * @param {string} [props.pending] texte affiché quand aucune vidéo officielle n'existe
 */
export default function ArticleTrailer({ label, meta, items = [], credit, pending }) {
  // Libellés d'interface traduits ; la nature de la vidéo (bande-annonce,
  // teaser…) vient aussi du dictionnaire, avec la table historique en repli.
  const { t: ui } = useLanguage();
  const media = ui?.media || {};
  const text = (key, fallback) => media[key] || fallback;
  const KIND_KEYS = { trailer: 'kindTrailer', teaser: 'kindTeaser', extrait: 'kindExtract', coulisses: 'kindBehind', replay: 'kindReplay', presentation: 'kindPresentation' };
  const BADGE_KEYS = { trailer: 'badgeTrailer', teaser: 'badgeTeaser', extrait: 'badgeExtract', coulisses: 'badgeBehind', replay: 'badgeReplay', presentation: 'badgePresentation' };
  const kindFor = (kind) => text(KIND_KEYS[kind] || 'kindTrailer', trailerKindLabel(kind));
  const badgeFor = (kind) => text(BADGE_KEYS[kind] || 'badgeTrailer', trailerBadgeLabel(kind));
  const [index, setIndex] = useState(0);
  const videos = items.filter((item) => item && item.id);
  const current = videos[Math.min(index, videos.length - 1)] || null;

  if (!current) {
    if (!pending) return null;
    return (
      <figure className="article-trailer article-trailer--pending">
        {/* Sans vidéo, l'en-tête ne doit pas annoncer une bande-annonce :
            il dit l'absence, et la phrase du dessous l'explique. */}
        <div className="section-label">
          <span><b>{text('noVideo', 'PAS DE VIDÉO')}</b> / {label || text('upcoming', 'À VENIR')}</span>
          {meta ? <span>{meta}</span> : null}
        </div>
        <p className="article-trailer-pending"><span className="live-dot" /> {pending}</p>
      </figure>
    );
  }

  const kind = kindFor(current.kind);

  return (
    <figure className="article-trailer">
      <div className="section-label">
        <span><b>{kind}</b> / {label}</span>
        {meta ? <span>{meta}</span> : null}
      </div>

      <div className="article-trailer-frame">
        <iframe
          key={current.id}
          src={youTubeEmbedUrl(current.id)}
          title={`${current.title} — ${current.channel}`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      <figcaption className="article-trailer-caption">
        <span className="article-trailer-badge"><span className="live-dot" /> {badgeFor(current.kind)}</span>
        <strong className="article-trailer-title">{current.title}</strong>
        <em className="article-trailer-channel">{current.channel}</em>
        <a className="arrow-link" href={trailerWatchUrl(current.id)} target="_blank" rel="noreferrer">{text('watchOnYouTube', 'Voir sur YouTube')} <span aria-hidden="true">↗</span></a>
      </figcaption>

      {current.note ? <p className="article-trailer-note">{current.note}</p> : null}

      {videos.length > 1 ? (
        <div className="article-trailer-picker" role="group" aria-label={text('chooseVideo', 'Choisir une autre vidéo officielle')}>
          {videos.map((item, i) => (
            <button
              type="button"
              key={item.id}
              className={i === index ? 'article-trailer-choice is-active' : 'article-trailer-choice'}
              onClick={() => setIndex(i)}
              aria-pressed={i === index}
            >
              <VideoThumb
                id={item.id}
                alt={`${item.title} — ${item.channel}`}
                fallbackLabel={kindFor(item.kind)}
                className="article-trailer-thumb"
              />
              <span className="article-trailer-choice-copy">
                <b>{kindFor(item.kind)}</b>
                <small>{item.channel}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {credit ? <p className="article-trailer-credit">{credit}</p> : null}
    </figure>
  );
}
