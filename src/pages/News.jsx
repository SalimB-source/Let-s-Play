import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

export default function News(){
  const { t } = useLanguage();
  const million = t.news.million || t.news.featured;
  const carouselRef = useRef(null);

  const scrollCards = (direction) => {
    carouselRef.current?.scrollBy({ left: direction * carouselRef.current.clientWidth * 0.82, behavior: 'smooth' });
  };

  return (
    <>
      <section className="news-carousel-section wrap">
        <div className="section-label"><span><b>01</b> / {t.news.featuredLabel}</span><span>{t.news.updatedLabel}</span></div>
        <div className="news-carousel-head">
          <div>
            <p className="eyebrow"><span className="live-dot" /> {t.news.eyebrow}</p>
            <h1>{t.news.h1a}<br/><em>{t.news.h1b}</em></h1>
          </div>
          <div className="news-carousel-controls" aria-label="News carousel controls">
            <button type="button" onClick={() => scrollCards(-1)} aria-label="Previous articles">←</button>
            <button type="button" onClick={() => scrollCards(1)} aria-label="Next articles">→</button>
          </div>
        </div>
        <div className="news-carousel" ref={carouselRef}>
          <Link className="news-carousel-card" to="/news/physint">
            <div className="news-carousel-image"><img src={`${base}physint-news.jpg`} alt={t.news.featured.alt} /><span className="news-feature-badge">{t.news.featured.badge}</span><span className="news-feature-arrow">↗</span></div>
            <div className="news-carousel-copy"><span className="news-kicker">{t.news.featured.kicker}</span><h2>{t.news.featured.title}</h2><p>{t.news.featured.excerpt}</p><span className="read-link">{t.news.featured.read} <Arrow/></span></div>
          </Link>
          <Link className="news-carousel-card" to="/news/metroid-ravenous">
            <div className="news-carousel-image"><img src={`${base}metroid-ravenous-news.png`} alt={t.news.metroid.coverAlt} /><span className="news-feature-badge">{t.news.metroid.eyebrow}</span><span className="news-feature-arrow">↗</span></div>
            <div className="news-carousel-copy"><span className="news-kicker">{t.news.metroid.date} · {t.news.platforms}</span><h2>{t.news.metroid.title} {t.news.metroid.titleAccent}</h2><p>{t.news.metroid.dek}</p><span className="read-link">{t.news.metroid.back} <Arrow/></span></div>
          </Link>
          <Link className="news-carousel-card" to="/news/wardogs">
            <div className="news-carousel-image"><img src={`${base}wardogs-news.jpg`} alt={t.news.wardogs.coverAlt} /><span className="news-feature-badge">{t.news.wardogs.eyebrow}</span><span className="news-feature-arrow">↗</span></div>
            <div className="news-carousel-copy"><span className="news-kicker">{t.news.wardogs.date} · {t.news.consolePlatforms}</span><h2>{t.news.wardogs.title} {t.news.wardogs.titleAccent}</h2><p>{t.news.wardogs.dek}</p><span className="read-link">{t.news.wardogs.back} <Arrow/></span></div>
          </Link>
          <Link className="news-carousel-card" to="/news/zelda-ocarina">
            <div className="news-carousel-image"><img src={`${base}zelda-ocarina-news.jpg`} alt={t.news.zelda.coverAlt} /><span className="news-feature-badge">{t.news.zelda.eyebrow}</span><span className="news-feature-arrow">↗</span></div>
            <div className="news-carousel-copy"><span className="news-kicker">{t.news.zelda.date} · {t.news.platforms}</span><h2>{t.news.zelda.title} {t.news.zelda.titleAccent}</h2><p>{t.news.zelda.dek}</p><span className="read-link">{t.news.zelda.back} <Arrow/></span></div>
          </Link>
          <Link className="news-carousel-card" to="/news/onimusha-million">
            <div className="news-carousel-image"><img src={`${base}onimusha-million-news.jpg`} alt={million.coverAlt || million.alt} /><span className="news-feature-badge">{million.eyebrow || million.badge}</span><span className="news-feature-arrow">↗</span></div>
            <div className="news-carousel-copy"><span className="news-kicker">{million.date || million.kicker} · CAPCOM</span><h2>{million.title} {million.titleAccent || ''}</h2><p>{million.dek || million.excerpt}</p><span className="read-link">{million.back || million.read} <Arrow/></span></div>
          </Link>
        </div>
      </section>

      <section className="cta wrap"><div><p className="eyebrow"><span className="live-dot" /> {t.news.ctaEyebrow}</p><h2>{t.news.ctaH2a}<br/><em>{t.news.ctaH2b}</em></h2></div><Link className="button button-yellow" to="/reviews">{t.news.ctaBtn} <Arrow/></Link></section>
    </>
  );
}
