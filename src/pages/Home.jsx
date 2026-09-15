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

// Épisode mis « à la une » de la présentation de l'émission × Algérie Télécom
// (page d'accueil uniquement) : l'épisode HicoSoft Studio & le projet GOYA,
// avec le logo officiel du partenaire de diffusion.
const headlineEpisode = {
  id: 'aTs0zhm6Leg',
  href: 'https://www.youtube.com/watch?v=aTs0zhm6Leg',
  title: 'HicoSoft Studio et le projet GOYA — Let’s Play Official',
  sponsor: { name: 'Algérie Télécom', logo: 'partners/algerie-telecom.png', href: 'https://www.algerietelecom.dz/' },
};

// Épisode partenaire Ooredoo (page d'accueil uniquement) : le FreeFire Algerian
// Championship 2023 — FFAC2023, présenté exactement comme l'épisode HicoSoft.
const partnerEpisode = {
  id: 'twbaM8fiXpo',
  href: 'https://www.youtube.com/watch?v=twbaM8fiXpo',
  title: 'FreeFire Algerian Championship 2023 (FFAC2023) — Let’s Play Official',
  sponsor: { name: 'Ooredoo', logo: 'partners/ooredoo.png', href: 'https://www.ooredoo.dz/' },
};

// Épisode 7ouma Arena × Djezzy mis à la une sur la page d'accueil.
const djezzyEpisode = {
  id: '48U4aK0CnnI',
  href: 'https://www.youtube.com/watch?v=48U4aK0CnnI',
  title: '2026 World Cup changed mobile football games — 7ouma Arena by Djezzy',
  sponsor: { name: 'Djezzy', logo: 'partners/djezzy.png', href: 'https://www.djezzy.dz/' },
};

// Bloc « épisode à la une » : copy + lecteur YouTube + bande sponsor partenaire.
// Utilisé par l'épisode HicoSoft × Algérie Télécom puis l'épisode Ooredoo × FFAC2023.
function FeaturedBlock({ episode, label, copy, cta, mirror = false }) {
  return (
    <section className={`featured wrap${mirror ? ' featured--ooredoo' : ''}`} id={mirror ? 'partner-episode' : 'featured'}>
      <div className="section-label"><span><b>{label.split(' / ')[0]}</b> / {label.split(' / ')[1]}</span><span>{copy.label2}</span></div>
      <div className={`featured-grid${mirror ? ' featured-grid--mirror' : ''}`}>
        <div className="featured-copy">
          <p className="eyebrow"><span className="live-dot" /> {copy.eyebrow}</p>
          <h2>{copy.h2a}<br /><em>{copy.h2b}</em></h2>
          <p>{copy.text}</p>
          <div className="featured-ctas">
            {cta && <Link className="arrow-link" to={cta.to}>{copy.cta} <Arrow /></Link>}
            <a className="arrow-link" href={episode.href} target="_blank" rel="noreferrer">{copy.watch} <Arrow /></a>
          </div>
        </div>
        <div className="featured-player hud-frame">
          <iframe src={`https://www.youtube.com/embed/${episode.id}?rel=0&modestbranding=1`} title={episode.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
        </div>
      </div>
      <div className="featured-sponsor">
        <span className="featured-sponsor-mark">
          {episode.sponsor.logo ? <img src={`${base}${episode.sponsor.logo}`} alt={episode.sponsor.name} /> : <strong className="featured-sponsor-text">{episode.sponsor.name}</strong>}
        </span>
        <div className="featured-sponsor-copy">
          <small>{copy.sponsorKicker}</small>
          <p>{copy.sponsorText}</p>
        </div>
        <a className="arrow-link" href={episode.sponsor.href} target="_blank" rel="noreferrer">{copy.sponsorLink} <Arrow /></a>
      </div>
    </section>
  );
}

export default function Home() {
  const { t } = useLanguage();
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

      <FeaturedBlock episode={headlineEpisode} label={t.home.featured.label1} copy={t.home.featured} cta={{ to: '/dossiers/goya-hicosoft' }} />
      <FeaturedBlock episode={partnerEpisode} label={t.home.featuredPartner.label1} copy={t.home.featuredPartner} cta={{ to: '/partenaires' }} mirror />
      <FeaturedBlock episode={djezzyEpisode} label={t.home.featuredDjezzy.label1} copy={t.home.featuredDjezzy} cta={{ to: '/partenaires' }} />

      <section className="formats wrap" id="formats">
        <div className="section-label"><span><b>02</b> / {t.home.formats.label1.split(' / ')[1]}</span><span>{t.home.formats.label2}</span></div>
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
