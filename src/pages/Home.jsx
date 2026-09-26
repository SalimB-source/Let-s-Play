import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import PartnersSection from '../components/PartnersSection';
import { youTubeEmbedUrl, youTubeLiveChannelEmbedUrl } from '../lib/videoPlayback';
import VideoThumb from '../components/VideoThumb';
import { quizzes } from '../quizzesData';
import { dailyQuizFor } from '../quizzes/engine';
import { isQuizFinished } from '../quizzes/quizProgress';
import { useQuizProgress } from '../quizzes/useQuizProgress';
import { Arrow, AwaitedBand, clockOffset } from '../components/ReleasesCalendar';

// Le paramètre d'URL `?at=` (horloge simulée du bandeau « le plus attendu »)
// est partagé avec la page calendrier complet via clockOffset().
const CLOCK_OFFSET = clockOffset();

// Visuel unique du héros : une seule image, plein cadre, utilisée dans tous les
// thèmes (les anciennes vidéos d'arrière-plan clair/sombre ont été retirées).
// Pour changer le visuel, remplacer le fichier `public/hero-keyart.jpg`.
const HERO_IMAGE = `${import.meta.env.BASE_URL}hero-keyart.jpg`;

const reels = [
  { id: '91eqLm2Hy9k', label: 'REEL 01' },
  { id: 's4pqYSfL8oU', label: 'REEL 02' },
  { id: '7sxxWC4zruM', label: 'REEL 03' },
  { id: 'fscuzWcw-PA', label: 'REEL 04' },
];

// Épisodes à la une — 3 colonnes, copy courte + texte descriptif.
// Vignette statique : la lecture se fait sur YouTube via le lien "Voir l’épisode".
// `tone` ne sert qu’à l’accent couleur de la carte (aucun logo partenaire affiché).
const headlineEpisode = {
  id: 'aTs0zhm6Leg',
  href: 'https://www.youtube.com/watch?v=aTs0zhm6Leg',
  title: 'HicoSoft Studio et le projet GOYA — Let’s Play Official',
  tone: 'telecom',
};

// YouTube ne publie aucune miniature HD pour cette vidéo (maxresdefault → 404) :
// elle est listée dans VIDEOS_WITHOUT_HD_THUMB (src/lib/videoThumbnails.js), la
// vignette démarre donc directement sur hqdefault au lieu d'attendre un 404.
const partnerEpisode = {
  id: 'twbaM8fiXpo',
  href: 'https://www.youtube.com/watch?v=twbaM8fiXpo',
  title: 'FreeFire Algerian Championship 2023 (FFAC2023) — Let’s Play Official',
  tone: 'ooredoo',
};

const djezzyEpisode = {
  id: '48U4aK0CnnI',
  href: 'https://www.youtube.com/watch?v=48U4aK0CnnI',
  title: '2026 World Cup changed mobile football games — 7ouma Arena by Djezzy',
  tone: 'djezzy',
};

// YouTube resolves this permanent channel URL to the channel's active live
// broadcast, without requiring an API key or a server-side endpoint.
const liveChannelId = import.meta.env.VITE_YOUTUBE_CHANNEL_ID?.trim() || 'UCBi989OGXiGBjvB17Xh5GUQ';

export default function Home() {
  const { t, lang } = useLanguage();
  const [liveStatus, setLiveStatus] = useState('unknown');

  // La frise « Sorties du mois » et le compte à rebours ont quitté l'accueil :
  // il n'en reste que le bandeau fin « le plus attendu » sous le héros
  // (vignette + nom + date). La liste complète vit sur /calendrier.
  const today = new Date(Date.now() + CLOCK_OFFSET);
  // Le bandeau « quizz du jour » envoie directement à la partie du jour —
  // sauf si ce quizz est TERMINÉ (ses trois niveaux faits) : il est verrouillé
  // comme partout ailleurs, et le bouton mène à la grille des quizz.
  const { progress: quizProgressState } = useQuizProgress();
  const dailyQuiz = dailyQuizFor(today, quizzes);
  const dailyQuizFinished = Boolean(dailyQuiz) && isQuizFinished(quizProgressState, dailyQuiz.slug);

  useEffect(() => {
    let cancelled = false;
    const checkLiveStatus = () => {
      fetch('/api/youtube-live')
        .then((response) => response.ok ? response.json() : { status: 'unknown' })
        .then((data) => {
          if (!cancelled) setLiveStatus(data.status || 'unknown');
        })
        .catch(() => {
          if (!cancelled) setLiveStatus('unknown');
        });
    };

    checkLiveStatus();
    const interval = window.setInterval(checkLiveStatus, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const statusCopy = {
    live: t.home.live.statusLive,
    offline: t.home.live.statusOffline,
    unknown: t.home.live.statusChecking,
  }[liveStatus] || t.home.live.statusChecking;

  // Head générique pour la section épisodes — même structure que featured-dossiers de Reviews
  const headMap = {
    fr: {
      eyebrow: 'Épisodes à la une',
      h2a: 'LES ÉPISODES',
      h2b: 'À LA UNE.',
      seeAll: 'Voir tous les épisodes',
      label2: 'ALGÉRIE TÉLÉCOM · OOREDOO · DJEZZY',
    },
    en: {
      eyebrow: 'Featured episodes',
      h2a: 'FEATURED',
      h2b: 'EPISODES.',
      seeAll: 'See all episodes',
      label2: 'ALGÉRIE TÉLÉCOM · OOREDOO · DJEZZY',
    },
    ar: {
      eyebrow: 'الحلقات المميزة',
      h2a: 'الحلقات',
      h2b: 'المميزة.',
      seeAll: 'شاهد جميع الحلقات',
      label2: 'اتصالات الجزائر · أوريدو · جازي',
    },
  };
  const head = headMap[lang] || headMap.fr;

  const episodes = [
    { ...headlineEpisode, copy: t.home.featured },
    { ...partnerEpisode, copy: t.home.featuredPartner },
    { ...djezzyEpisode, copy: t.home.featuredDjezzy },
  ];

  // Le libellé de section de la trad existe au format « N / TITRE » : on n'en
  // affiche que le titre (les numéros de section ont été retirés du site).
  const labelParts = (t.home.featured.label1 || 'ÉPISODES À LA UNE').split(' / ');
  const labelTitle = labelParts[1] || labelParts[0] || 'ÉPISODES À LA UNE';

  return (
    <>
      <section className="hero" id="top">
        {/* Visuel du héros : une image, plein cadre, identique en thème clair
            et sombre. `fetchPriority` évite qu'elle attende le reste de la page. */}
        <img
          className="hero-bg hero-bg--keyart"
          src={HERO_IMAGE}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
        />
        <div className="hero-shade" aria-hidden="true" />
        <div className="hero-frame" aria-hidden="true"><span className="tl" /><span className="tr" /><span className="bl" /><span className="br" /></div>
        <div className="hero-content">
          <p className="eyebrow"><span className="live-dot" /> {t.home.eyebrow}</p>
          <h1>{t.home.h1a}<br /><em>{t.home.h1b}</em></h1>
          <p className="hero-text">{t.home.heroText}</p>
          <div className="hero-actions">
            <a className="button button-yellow" href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">{t.home.watchEpisodes} <Arrow /></a>
            <Link className="button button-ghost" to="/news">{t.home.enterShow} <span aria-hidden="true">↓</span></Link>
          </div>
        </div>
        {/* LE PLUS ATTENDU — fine bande posée en bas du héros (à la place de
            l'ancienne rangée de chiffres) : vignette, nom, date de sortie.
            Suit la file automatique du calendrier et mène à /calendrier. */}
        <AwaitedBand lang={lang} copy={t.news.countdown} offset={CLOCK_OFFSET} />
      </section>

      {/* Ticker continu — chaque moitié est suffisamment longue (> viewport) pour éviter les trous sur desktop, même en 4K/5K */}
      <section className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {[0, 1].map((half) => (
            <span key={half} className="ticker-group">
              {Array.from({ length: 10 })
                .flatMap(() => t.home.ticker)
                .map((word, i) => (
                  <React.Fragment key={`${half}-${i}`}>{word} <b>✦</b> </React.Fragment>
                ))}
            </span>
          ))}
        </div>
      </section>

      {/* ÉPISODES À LA UNE — 3 colonnes, vignette statique + texte descriptif */}
      <section className="featured-dossiers featured-dossiers--episodes wrap" id="featured">
        <div className="section-label"><span>{labelTitle}</span><span>{head.label2}</span></div>
        <div className="featured-dossiers-head">
          <div>
            <p className="eyebrow"><span className="live-dot" /> {head.eyebrow}</p>
            <h2>{head.h2a}<br /><em>{head.h2b}</em></h2>
          </div>
          <a className="arrow-link" href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">{head.seeAll} <Arrow /></a>
        </div>
        <div className="featured-dossiers-grid">
          {episodes.map((ep) => (
            <article className={`featured-dossier featured-dossier--${ep.tone}`} key={ep.id}>
              <div className="featured-dossier-player hud-frame">
                {/* Vignette statique : aucun lecteur, aucune commande, pas de lecture inline.
                    VideoThumb descend l'échelle des qualités YouTube si l'une manque. */}
                <VideoThumb
                  className="featured-dossier-thumb"
                  id={ep.id}
                  alt={ep.title}
                  fallbackLabel={ep.copy.label2 || ep.title}
                />
                <span className="featured-dossier-badge" aria-hidden="true">▶</span>
              </div>
              <div className="featured-dossier-copy">
                <h3>{ep.copy.h2a}<br /><em>{ep.copy.h2b}</em></h3>
                <p className="featured-dossier-desc">{ep.copy.desc}</p>
                <a className="arrow-link" href={ep.href} target="_blank" rel="noreferrer">{ep.copy.watch} <Arrow /></a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* QUIZZ DU JOUR — un quizz choisi chaque jour parmi la sélection :
          la série quotidienne (succès « Semaine parfaite ») se construit ici. */}
      <section className="wrap" id="quizz-du-jour">
        <div className={`home-quiz-band${dailyQuizFinished ? ' is-finished' : ''}`}>
          <div className="home-quiz-band-copy">
            <p className="eyebrow">
              {dailyQuizFinished ? null : <span className="live-dot" />} {t.quiz.home.eyebrow}
              {dailyQuizFinished && <span className="quiz-chip quiz-chip--levels is-complete">✓ {t.quiz.finished}</span>}
            </p>
            <h2>{t.quiz.home.titleA}<br /><em>{t.quiz.home.titleB}</em></h2>
            <p>{dailyQuizFinished ? t.quiz.home.done : t.quiz.home.text}</p>
          </div>
          <Link
            className="button button-yellow"
            to={dailyQuiz && !dailyQuizFinished ? dailyQuiz.route : '/quizz'}
          >
            {dailyQuizFinished ? t.quiz.home.ctaAll : t.quiz.home.cta} <Arrow />
          </Link>
        </div>
      </section>

      <section className="live-section wrap" id="live">
        <div className="section-label"><span>{t.home.live.label}</span><span>YOUTUBE · LET’S PLAY OFFICIAL</span></div>
        <div className="live-head">
          <div>
            <p className="eyebrow"><span className="live-dot" /> {t.home.live.eyebrow}</p>
            <h2>{t.home.live.h2a}<br /><em>{t.home.live.h2b}</em></h2>
          </div>
          <div className="live-head-aside">
            <p className="live-description">{t.home.live.description}</p>
            <div className={`live-status-card live-status-card--${liveStatus}`}>
              <span className={`live-status live-status--${liveStatus}`}><i aria-hidden="true" /> {statusCopy}</span>
              <small>{t.home.live.autoRefresh}</small>
            </div>
          </div>
        </div>
        <div className="live-player hud-frame">
          <iframe
            src={youTubeLiveChannelEmbedUrl(liveChannelId)}
            title={t.home.live.playerTitle}
            allow="autoplay; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className="live-footer">
          <span className="live-footer-note">{t.home.live.statusSupport}</span>
          <a className="arrow-link" href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">{t.home.live.channelCta} <Arrow /></a>
        </div>
      </section>

      <section className="formats wrap" id="formats">
        <div className="section-label"><span>{t.home.formats.label1.split(' / ')[1]}</span><span>{t.home.formats.label2}</span></div>
        <div className="format-grid">
          <article className="format-card card-gaming"><span className="format-number">01</span><div className="format-icon">✦</div><h3>{t.home.formats.gamingTitle}</h3><p>{t.home.formats.gamingText}</p><Link to="/reviews">{t.home.formats.explore} <Arrow /></Link></article>
          <article className="format-card card-movies"><span className="format-number">02</span><div className="format-icon">◎</div><h3>{t.home.formats.moviesTitle}</h3><p>{t.home.formats.moviesText}</p><Link to="/news">{t.home.formats.explore} <Arrow /></Link></article>
          <article className="format-card card-community"><span className="format-number">03</span><div className="format-icon">⌁</div><h3>{t.home.formats.communityTitle}</h3><p>{t.home.formats.communityText}</p><a href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">{t.home.formats.joinUs} <Arrow /></a></article>
        </div>
      </section>

      <PartnersSection />

      <section className="reels-section wrap" id="reels">
        <div className="section-label"><span>REELS</span><span>YOUTUBE SHORTS · LET’S PLAY</span></div>
        <div className="reels-head">
          <div>
            <p className="eyebrow"><span className="live-dot" /> Format court</p>
            <h2>À VOIR<br /><em>EN BOUCLE.</em></h2>
          </div>
          <a className="arrow-link" href="https://www.youtube.com/@letsplay.officiel/shorts" target="_blank" rel="noreferrer">Voir tous les reels <Arrow /></a>
        </div>
        <div className="reels-grid">
          {reels.map((reel) => (
            <div className="reel-card hud-frame" key={reel.id}>
              <iframe src={youTubeEmbedUrl(reel.id)} title={`${reel.label} — Let’s Play`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
              <a className="reel-label" href={`https://www.youtube.com/shorts/${reel.id}`} target="_blank" rel="noreferrer">{reel.label} <Arrow /></a>
            </div>
          ))}
        </div>
      </section>

      <section className="cta wrap">
        <div>
          <p className="eyebrow"><span className="live-dot" /> {t.home.cta.eyebrow}</p>
          <h2>{t.home.cta.h2a}<br /><em>{t.home.cta.h2b}</em></h2>
        </div>
        <a className="button button-yellow" href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">{t.home.cta.cta} <Arrow /></a>
      </section>
    </>
  );
}