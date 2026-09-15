import React from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';
import PartnersSection from '../components/PartnersSection';

function Arrow() { return <span aria-hidden="true">↗</span>; }

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

export default function Home() {
  const { t, lang } = useLanguage();

  // Head générique pour la section 01 — même structure que featured-dossiers de Reviews
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

  // On garde le split 01 / XXX de la trad existante pour le section-label
  const labelParts = (t.home.featured.label1 || '01 / ÉPISODES À LA UNE').split(' / ');
  const labelNum = labelParts[0] || '01';
  const labelTitle = labelParts[1] || 'ÉPISODES À LA UNE';

  return (
    <>
      <section className="hero" id="top">
        <div className="hero-bg" style={{ backgroundImage: `url(${base}hero-dragon.webp)` }} role="img" aria-label="Let’s Play dragon key art" />
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
        <div className="hero-hud">
          <div><strong>15K+</strong><small>{t.home.hud.subs}</small></div>
          <div><strong>33K+</strong><small>{t.home.hud.community}</small></div>
          <div><strong>∞</strong><small>{t.home.hud.reasons}</small></div>
          <a className="scroll-cue" href="#featured" aria-label="Scroll to content">{t.home.hud.scroll}<span /></a>
        </div>
      </section>

      <section className="ticker" aria-hidden="true"><div className="ticker-track">{[0, 1].map((half) => <span key={half}>{t.home.ticker.map((word, i) => <React.Fragment key={i}>{word} <b>✦</b> </React.Fragment>)}</span>)}</div></section>

      {/* 01 / ÉPISODES À LA UNE — 3 colonnes, vignette statique + texte descriptif */}
      <section className="featured-dossiers featured-dossiers--episodes wrap" id="featured">
        <div className="section-label"><span><b>{labelNum}</b> / {labelTitle}</span><span>{head.label2}</span></div>
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
                {/* Vignette statique : aucun lecteur, aucune commande, pas de lecture inline. */}
                <img
                  className="featured-dossier-thumb"
                  src={`https://i.ytimg.com/vi/${ep.id}/maxresdefault.jpg`}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    if (e.currentTarget.dataset.fallback) return;
                    e.currentTarget.dataset.fallback = '1';
                    e.currentTarget.src = `https://i.ytimg.com/vi/${ep.id}/hqdefault.jpg`;
                  }}
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

      <section className="formats wrap" id="formats">
        <div className="section-label"><span><b>{t.home.formats.label1.split(' / ')[0]}</b> / {t.home.formats.label1.split(' / ')[1]}</span><span>{t.home.formats.label2}</span></div>
        <div className="format-grid">
          <article className="format-card card-gaming"><span className="format-number">01</span><div className="format-icon">✦</div><h3>{t.home.formats.gamingTitle}</h3><p>{t.home.formats.gamingText}</p><Link to="/reviews">{t.home.formats.explore} <Arrow /></Link></article>
          <article className="format-card card-movies"><span className="format-number">02</span><div className="format-icon">◎</div><h3>{t.home.formats.moviesTitle}</h3><p>{t.home.formats.moviesText}</p><Link to="/news">{t.home.formats.explore} <Arrow /></Link></article>
          <article className="format-card card-community"><span className="format-number">03</span><div className="format-icon">⌁</div><h3>{t.home.formats.communityTitle}</h3><p>{t.home.formats.communityText}</p><a href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">{t.home.formats.joinUs} <Arrow /></a></article>
        </div>
      </section>

      <PartnersSection />

      <section className="reels-section wrap" id="reels">
        <div className="section-label"><span><b>04</b> / REELS</span><span>YOUTUBE SHORTS · LET’S PLAY</span></div>
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
              <iframe src={`https://www.youtube.com/embed/${reel.id}?rel=0&modestbranding=1`} title={`${reel.label} — Let’s Play`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
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
