import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import { useLocalizedListings } from '../news/localized/useLocalizedArticle.js';
import PartnersSection from '../components/PartnersSection';
import { youTubeEmbedUrl } from '../lib/videoPlayback';
import VideoThumb from '../components/VideoThumb';
import { confirmedLiveVideoId, scrollToHomeLive } from '../lib/homeLive';
import '../home-live.css';
import ScrollAutoplayVideo from '../components/ScrollAutoplayVideo';
import { Arrow } from '../components/Arrow';
import { AwaitedBand, clockOffset } from '../components/ReleasesCalendar';
import { dailyNewsListing, editionDate } from '../news/daily/2026-11-11';

// Le seul morceau de l'accueil qui a besoin du catalogue des quizz (226 ko) :
// il se charge à la demande, plus bas dans la page (voir HomeQuizBand.jsx).
const HomeQuizBand = lazy(() => import('./HomeQuizBand'));

// Le paramètre d'URL `?at=` (horloge simulée du bandeau « le plus attendu »)
// est partagé avec la page calendrier complet via clockOffset().
const CLOCK_OFFSET = clockOffset();

// Visuel fixe du héros, utilisé dans les deux thèmes.
const HERO_IMAGE = `${import.meta.env.BASE_URL}hero-lets-play.jpg`;

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
  id: 'WcRpsKU8JDY',
  href: 'https://www.youtube.com/watch?v=WcRpsKU8JDY',
  title: 'Nostalgia : Retro TV Legends That Shaped Our Imagination! — Let’s Play Official',
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

const newsImageUrl = (image) => /^https?:\/\//i.test(image) ? image : `${base}${image}`;

// La une suit l’actualité gaming de l’édition la plus récente.
const featuredStory = dailyNewsListing.find((story) => !story.to.startsWith('/news/cinema/') && !story.to.startsWith('/news/tech/'));

export default function Home() {
  const { t, lang } = useLanguage();
  const [liveVideoId, setLiveVideoId] = useState(null);
  const isLive = Boolean(liveVideoId);
  const [featuredTrailer, setFeaturedTrailer] = useState(null);
  // La une suit la langue de lecture comme les autres cartes (src/news/localized/).
  const [localizedFeatured] = useLocalizedListings([featuredStory], lang);
  const featuredNews = {
    ...(localizedFeatured || featuredStory),
    video: featuredTrailer?.id,
    videoTitle: featuredTrailer?.title,
  };

  // Les métadonnées de bande-annonce couvrent tout le catalogue d'articles :
  // elles ne sont nécessaires qu'à la une, après le premier rendu de l'accueil.
  useEffect(() => {
    let cancelled = false;
    import('../articleTrailers')
      .then(({ leadTrailer }) => {
        if (!cancelled) setFeaturedTrailer(leadTrailer(featuredStory.to));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // La frise « Sorties du mois » et le compte à rebours ont quitté l'accueil :
  // il n'en reste que le bandeau fin « le plus attendu » sous le héros
  // (vignette + nom + date). La liste complète vit sur /calendrier.
  const today = new Date(Date.now() + CLOCK_OFFSET);
  const exploreCopy = {
    fr: { label: 'Explorer la page', news: 'Actu à la une', episodes: 'Épisodes', quiz: 'Quiz du jour', reels: 'Reels', live: 'Direct' },
    en: { label: 'Explore this page', news: 'Top story', episodes: 'Episodes', quiz: 'Daily quiz', reels: 'Reels', live: 'Live' },
    ar: { label: 'استكشف الصفحة', news: 'أبرز الأخبار', episodes: 'الحلقات', quiz: 'اختبار اليوم', reels: 'ريلز', live: 'مباشر' },
  }[lang] || { label: 'Explore this page', news: 'Top story', episodes: 'Episodes', quiz: 'Daily quiz', reels: 'Reels', live: 'Live' };
  // Le bandeau « quizz du jour » envoie directement à la partie du jour —
  // sauf si ce quizz est TERMINÉ (ses trois niveaux faits) : il est verrouillé
  // comme partout ailleurs, et le bouton mène à la grille des quizz.

  useEffect(() => {
    let cancelled = false;
    let timer;
    let controller;
    let timeout;
    const checkLiveStatus = async () => {
      controller = new AbortController();
      timeout = window.setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetch('/api/youtube-live', { signal: controller.signal });
        const data = response.ok ? await response.json() : null;
        if (!cancelled) setLiveVideoId(confirmedLiveVideoId(data));
      } catch {
        if (!cancelled) setLiveVideoId(null);
      } finally {
        window.clearTimeout(timeout);
        // Un seul appel à la fois, même si le réseau est lent.
        if (!cancelled) timer = window.setTimeout(checkLiveStatus, 60_000);
      }
    };
    checkLiveStatus();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(timeout);
      controller?.abort();
    };
  }, []);

  const liveHeroCopy = {
    fr: { status: 'Un live est en cours', action: 'Rejoindre le direct' },
    en: { status: 'We’re live now', action: 'Watch live' },
    ar: { status: 'نحن على الهواء الآن', action: 'شاهد البث المباشر' },
  }[lang] || { status: 'Un live est en cours', action: 'Rejoindre le direct' };

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
      label2: 'ALGERIA TELECOM · OOREDOO · DJEZZY',
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

  // Head de la section « actu à la une » — même structure que la section épisodes.
  const newsHeadMap = {
    fr: {
      label1: 'ACTU À LA UNE',
      label2: `${editionDate} · ${featuredNews.badge}`,
      eyebrow: 'Actu à la une',
      h2a: 'L’ACTU',
      h2b: 'À LA UNE.',
      today: 'Actu du jour',
      read: 'Lire l’article',
      resumeVideo: 'Reprendre la vidéo',
      seeAll: 'Voir toutes les actus',
    },
    en: {
      label1: 'FEATURED NEWS',
      label2: `${editionDate} · ${featuredNews.badge}`,
      eyebrow: 'Featured news',
      h2a: 'TOP STORY,',
      h2b: 'RIGHT NOW.',
      today: 'News of the day',
      read: 'Read the story',
      resumeVideo: 'Resume the video',
      seeAll: 'See all news',
    },
    ar: {
      label1: 'أبرز الأخبار',
      label2: `${editionDate} · ${featuredNews.badge}`,
      eyebrow: 'خبر مميز',
      h2a: 'الخبر',
      h2b: 'المميز.',
      today: 'خبر اليوم',
      read: 'اقرأ المقال',
      resumeVideo: 'استئناف الفيديو',
      seeAll: 'عرض كل الأخبار',
    },
  };
  const newsHead = newsHeadMap[lang] || newsHeadMap.fr;

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
        {/* Visuel fixe du héros : plein cadre, avec le voile existant pour
            conserver le contraste du contenu éditorial. */}
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
          {isLive && (
            <div className="hero-live-notice">
              <p className="hero-live-status" role="status"><span aria-hidden="true" /> {liveHeroCopy.status}</p>
              <a className="hero-live-link" href="#live" onClick={scrollToHomeLive}>
                {liveHeroCopy.action} <span aria-hidden="true">↓</span>
              </a>
            </div>
          )}
          <div className="hero-actions">
            <a className="hero-cta hero-cta--primary" href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">
              <span className="hero-cta-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="m9 5 11 7-11 7z" /></svg></span>
              <span className="hero-cta-label">{t.home.watchEpisodes}</span>
              <span className="hero-cta-arrow" aria-hidden="true">↗</span>
            </a>
            <Link className="hero-cta hero-cta--secondary" to="/news">
              <span className="hero-cta-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4M12 7v10m-5-5h10" /></svg></span>
              <span className="hero-cta-label">{t.home.enterShow}</span>
              <span className="hero-cta-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        {/* LE PLUS ATTENDU — fine bande posée en bas du héros (à la place de
            l'ancienne rangée de chiffres) : vignette, nom, date de sortie.
            Suit la file automatique du calendrier et mène à /calendrier. */}
        <AwaitedBand lang={lang} copy={t.news.countdown} offset={CLOCK_OFFSET} />
      </section>

      {isLive && (
        <section className="live-section home-live-active wrap" id="live" tabIndex={-1} aria-label={t.home.live.label}>
          <div className="section-label"><span>{t.home.live.label}</span><span>YOUTUBE · LET’S PLAY OFFICIAL</span></div>
          <div className="live-head">
            <div>
              <p className="eyebrow"><span className="live-dot" /> {t.home.live.eyebrow}</p>
              <h2>{t.home.live.h2a}<br /><em>{t.home.live.h2b}</em></h2>
            </div>
            <div className="live-head-aside">
              <p className="live-description">{t.home.live.description}</p>
              <div className="live-status-card live-status-card--live">
                <span className="live-status live-status--live"><i aria-hidden="true" /> {t.home.live.statusLive}</span>
                <small>{t.home.live.autoRefresh}</small>
              </div>
            </div>
          </div>
          <div className="live-player hud-frame">
            <iframe
              src={youTubeEmbedUrl(liveVideoId)}
              title={t.home.live.playerTitle}
              loading="lazy"
              allow="encrypted-media; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div className="live-footer">
            <span className="live-footer-note">{t.home.live.statusSupport}</span>
            <a className="arrow-link" href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">{t.home.live.channelCta} <Arrow /></a>
          </div>
        </section>
      )}

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

      <nav className="home-explore wrap" aria-label={exploreCopy.label}>
        {[['actu-une', exploreCopy.news], ['featured', exploreCopy.episodes], ['quizz-du-jour', exploreCopy.quiz], ['reels', exploreCopy.reels], ...(isLive ? [['live', exploreCopy.live]] : [])].map(([target, label]) => (
          <a key={target} href={`#${target}`}>{label}<span aria-hidden="true">↘</span></a>
        ))}
      </nav>

      {/* ACTU À LA UNE — première mise en avant après le ticker, trailer jouable sur place. */}
      <section className="featured-dossiers featured-dossiers--news wrap" id="actu-une" data-reveal>
        <div className="section-label"><span>{newsHead.label1}</span><span>{newsHead.label2}</span></div>
        <div className="featured-dossiers-head">
          <div>
            <p className="eyebrow"><span className="live-dot" /> {newsHead.eyebrow}</p>
            <h2>{newsHead.h2a}<br /><em>{newsHead.h2b}</em></h2>
          </div>
          <Link className="arrow-link" to="/news">{newsHead.seeAll} <Arrow /></Link>
        </div>
        <article className="daily-news-card home-news-card">
          <div className="daily-news-image home-news-video">
            {featuredNews.video ? <ScrollAutoplayVideo
              id={featuredNews.video}
              title={featuredNews.videoTitle}
              poster={newsImageUrl(featuredNews.poster)}
              showControls={false}
              coverYoutubeOverlayOnPause
              resumeLabel={newsHead.resumeVideo}
            /> : <img src={newsImageUrl(featuredNews.poster)} alt={featuredNews.alt} onError={(event) => { if (featuredNews.fallbackImage && event.currentTarget.dataset.thumbFallback !== 'true') { event.currentTarget.dataset.thumbFallback = 'true'; event.currentTarget.src = newsImageUrl(featuredNews.fallbackImage); } }} />}
            <span className="news-feature-badge">{featuredNews.badge}</span>
          </div>
          <Link
            className="daily-news-copy"
            to={featuredNews.to}
            aria-label={`${newsHead.read} : ${featuredNews.title}`}
          >
            <p className="eyebrow"><span className="live-dot" /> {newsHead.today}</p>
            <span className="news-kicker">{featuredNews.kicker}</span>
            <h3>{featuredNews.title}</h3>
            <p>{featuredNews.excerpt}</p>
            <span className="read-link">{newsHead.read} <Arrow /></span>
          </Link>
        </article>
      </section>

      {/* ÉPISODES À LA UNE — 3 colonnes, vignette statique + texte descriptif */}
      <section className="featured-dossiers featured-dossiers--episodes wrap" id="featured" data-reveal>
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
            <article
              className={`featured-dossier featured-dossier--${ep.tone}`}
              key={ep.id}
            >
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
          la série quotidienne (succès « Semaine parfaite ») se construit ici.
          Le bandeau (et le catalogue des quizz qu'il lit) arrive à la demande ;
          le repli garde la place du panneau pour que la page ne saute pas. */}
      <Suspense fallback={(
        <section className="wrap" id="quizz-du-jour">
          <div className="home-quiz-band" style={{ minHeight: 168 }} />
        </section>
      )}>
        <HomeQuizBand today={today} />
      </Suspense>

      {/* REELS / SHORTS YOUTUBE — placés juste avant le direct : le format court
          garde le visiteur en mouvement entre les formats courts. */}
      <section className="reels-section wrap" id="reels" data-reveal>
        <div className="section-label"><span>{t.home.reels.label}</span><span>{t.home.reels.meta}</span></div>
        <div className="reels-head">
          <div>
            <p className="eyebrow"><span className="live-dot" /> {t.home.reels.eyebrow}</p>
            <h2>{t.home.reels.h2a}<br /><em>{t.home.reels.h2b}</em></h2>
          </div>
          <a className="arrow-link" href="https://www.youtube.com/@letsplay.officiel/shorts" target="_blank" rel="noreferrer">{t.home.reels.seeAll} <Arrow /></a>
        </div>
        <div className="reels-grid">
          {reels.map((reel, index) => (
            <div className="reel-card hud-frame" key={reel.id}>
              {index === 0 ? (
                <ScrollAutoplayVideo
                  id={reel.id}
                  title={`${reel.label} — Let’s Play`}
                  posterAlt={(t.home.reels.posterAlt || 'Miniature de {name} — Let’s Play').replace('{name}', reel.label)}
                />
              ) : (
                <iframe
                  src={youTubeEmbedUrl(reel.id)}
                  title={`${reel.label} — Let’s Play`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
              <a className="reel-label" href={`https://www.youtube.com/shorts/${reel.id}`} target="_blank" rel="noreferrer">{reel.label} <Arrow /></a>
            </div>
          ))}
        </div>
      </section>


      <section className="formats wrap" id="formats" data-reveal>
        <div className="section-label"><span>{t.home.formats.label1.split(' / ')[1]}</span><span>{t.home.formats.label2}</span></div>
        <div className="format-grid">
          <article className="format-card card-gaming"><span className="format-number">01</span><div className="format-icon">✦</div><h3>{t.home.formats.gamingTitle}</h3><p>{t.home.formats.gamingText}</p><Link to="/reviews">{t.home.formats.explore} <Arrow /></Link></article>
          <article className="format-card card-movies"><span className="format-number">02</span><div className="format-icon">◎</div><h3>{t.home.formats.moviesTitle}</h3><p>{t.home.formats.moviesText}</p><Link to="/news/cinema">{t.home.formats.explore} <Arrow /></Link></article>
          <article className="format-card card-community"><span className="format-number">03</span><div className="format-icon">⌁</div><h3>{t.home.formats.communityTitle}</h3><p>{t.home.formats.communityText}</p><Link to="/communaute">{t.home.formats.joinUs} <Arrow /></Link></article>
        </div>
      </section>

      <PartnersSection />

      <section className="cta wrap" data-reveal>
        <div>
          <p className="eyebrow"><span className="live-dot" /> {t.home.cta.eyebrow}</p>
          <h2>{t.home.cta.h2a}<br /><em>{t.home.cta.h2b}</em></h2>
        </div>
        <a className="button button-yellow" href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">{t.home.cta.cta} <Arrow /></a>
      </section>
    </>
  );
}
