import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { videos, filters, socialVisuals, baseUrl as base } from '../data';
import { useLanguage } from '../i18n/LanguageContext';

function Arrow() { return <span aria-hidden="true">↗</span>; }

export default function Home() {
  const { t } = useLanguage();
  const [filter, setFilter] = useState('All');
  const visibleVideos = filter === 'All' ? videos : videos.filter((v) => v.tag === filter);

  // Instagram carousel
  const carouselRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollStart, setScrollStart] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const getCardWidth = () => {
    const container = carouselRef.current;
    if (!container) return 0;
    const card = container.querySelector('.social-slide');
    if (!card) return 0;
    const track = container.querySelector('.carousel-track');
    const gap = track ? parseFloat(getComputedStyle(track).gap) || 18 : 18;
    return card.offsetWidth + gap;
  };
  const updateActiveIndex = () => {
    const container = carouselRef.current;
    if (!container) return;
    const cw = getCardWidth();
    if (!cw) return;
    const idx = Math.round(container.scrollLeft / cw);
    setActiveIndex(Math.max(0, Math.min(idx, socialVisuals.length - 1)));
  };
  const scrollToIndex = (i) => {
    const c = carouselRef.current;
    if (!c) return;
    const cw = getCardWidth();
    c.scrollTo({ left: i * cw, behavior: 'smooth' });
    setActiveIndex(i);
  };
  const handlePrev = () => scrollToIndex(Math.max(0, activeIndex - 1));
  const handleNext = () => scrollToIndex(Math.min(socialVisuals.length - 1, activeIndex + 1));

  const onMouseDown = (e) => {
    setIsDragging(true);
    carouselRef.current?.classList.add('dragging');
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setScrollStart(carouselRef.current.scrollLeft);
  };
  const onMouseLeave = () => { setIsDragging(false); carouselRef.current?.classList.remove('dragging'); };
  const onMouseUp = () => { setIsDragging(false); carouselRef.current?.classList.remove('dragging'); };
  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 1.8;
    carouselRef.current.scrollLeft = scrollStart - walk;
  };
  const onTouchStart = (e) => {
    setIsDragging(true);
    setStartX(e.touches[0].pageX - carouselRef.current.offsetLeft);
    setScrollStart(carouselRef.current.scrollLeft);
  };
  const onTouchMove = (e) => {
    if (!isDragging) return;
    const x = e.touches[0].pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 1.8;
    carouselRef.current.scrollLeft = scrollStart - walk;
  };
  const onTouchEnd = () => { setIsDragging(false); updateActiveIndex(); };
  const onWheel = (e) => {
    const c = carouselRef.current;
    if (!c) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      const atStart = c.scrollLeft <= 2 && e.deltaY < 0;
      const atEnd = Math.ceil(c.scrollLeft + c.clientWidth) >= c.scrollWidth - 2 && e.deltaY > 0;
      if (!atStart && !atEnd) { e.preventDefault(); c.scrollLeft += e.deltaY; }
    }
  };
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const onScroll = () => updateActiveIndex();
    el.addEventListener('scroll', onScroll, { passive: true });
    const onResize = () => updateActiveIndex();
    window.addEventListener('resize', onResize);
    return () => { el.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); };
  }, []);

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

      <section className="featured wrap" id="featured">
        <div className="section-label"><span><b>{t.home.featured.label1.split(' / ')[0]}</b> / {t.home.featured.label1.split(' / ')[1]}</span><span>{t.home.featured.label2}</span></div>
        <div className="featured-grid">
          <div className="featured-copy">
            <p className="eyebrow"><span className="live-dot" /> {t.home.featured.eyebrow}</p>
            <h2>{t.home.featured.h2a}<br /><em>{t.home.featured.h2b}</em></h2>
            <p>{t.home.featured.text}</p>
            <Link className="arrow-link" to="/reviews">{t.home.featured.cta} <Arrow /></Link>
          </div>
          <div className="featured-player hud-frame">
            <iframe src="https://www.youtube.com/embed/0e5yXxfchLA?rel=0&modestbranding=1" title="Assassin’s Creed Black Flag Resynced" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          </div>
        </div>
      </section>

      <section className="show wrap" id="show">
        <div className="section-label"><span><b>{t.home.show.label1.split(' / ')[0]}</b> / {t.home.show.label1.split(' / ')[1]}</span><span>{t.home.show.label2}</span></div>
        <div className="manifesto-grid">
          <h2 className="manifesto-h2">{t.home.show.h2a}<br /><span>{t.home.show.h2b}</span></h2>
          <div>
            <p className="lead">{t.home.show.lead}</p>
            <p>{t.home.show.text}</p>
            <Link className="arrow-link" to="/dossiers">{t.home.show.cta} <Arrow /></Link>
          </div>
        </div>
        <div className="stats">
          <div><strong>15K<span>+</span></strong><small>{t.home.show.stats.subs}</small></div>
          <div><strong>33K<span>+</span></strong><small>{t.home.show.stats.community}</small></div>
          <div><strong>∞</strong><small>{t.home.show.stats.reasons}</small></div>
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

      <section className="latest wrap" id="latest">
        <div className="section-label"><span><b>{t.home.latest.label1.split(' / ')[0]}</b> / {t.home.latest.label1.split(' / ')[1]}</span><span>{t.home.latest.label2}</span></div>
        <div className="latest-head">
          <h2>{t.home.latest.h2a}<br /><em>{t.home.latest.h2b}</em></h2>
          <div className="filter-row">{filters.map((item) => <button key={item} className={filter === item ? 'filter active' : 'filter'} onClick={() => setFilter(item)}>{t.filters[item]}</button>)}</div>
        </div>
        <div className="video-grid">
          {visibleVideos.slice(0,4).map((video) => (
            <a className="video-card" href={video.href} target="_blank" rel="noreferrer" key={video.title}>
              <div className="video-image"><img src={video.image} alt="" /><span className="play">▶</span></div>
              <div className="video-meta"><span>{t.categories[video.category] || video.category} · {video.duration}</span><span>{t.filters[video.tag] || video.tag}</span></div>
              <h3>{(t.videos[video.title] && t.videos[video.title].title) || video.title}</h3>
            </a>
          ))}
        </div>
        <Link className="arrow-link" to="/news">{t.home.latest.seeAll} <Arrow /></Link>
      </section>

      <section className="social-carousel wrap" id="social">
        <div className="section-label"><span><b>{t.home.social.label1.split(' / ')[0]}</b> / {t.home.social.label1.split(' / ')[1]}</span><span>{t.home.social.label2}</span></div>
        <div className="carousel-head">
          <div>
            <p className="eyebrow"><span className="live-dot" /> {t.home.social.eyebrow}</p>
            <h2>{t.home.social.h2a}<br /><em>{t.home.social.h2b}</em></h2>
            <p className="carousel-hint">{t.home.social.hint}</p>
          </div>
          <div className="carousel-controls">
            <button onClick={handlePrev} aria-label="Previous visual">←</button>
            <span>{String(activeIndex + 1).padStart(2, '0')} / {String(socialVisuals.length).padStart(2, '0')}</span>
            <button onClick={handleNext} aria-label="Next visual">→</button>
          </div>
        </div>
        <div className="carousel-window" ref={carouselRef} onMouseDown={onMouseDown} onMouseLeave={onMouseLeave} onMouseUp={onMouseUp} onMouseMove={onMouseMove} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onWheel={onWheel}>
          <div className="carousel-track">
            {socialVisuals.map((visual) => (
              <a className="social-slide" href={visual.url} target="_blank" rel="noreferrer" key={visual.title} draggable={false}>
                <div className="social-slide-media">
                  <img src={visual.image} alt={visual.title} draggable={false} loading="lazy" />
                  <div className="insta-badge">{t.home.social.badge}</div>
                  <div className="insta-gradient" aria-hidden="true" />
                </div>
                <div className="social-slide-overlay">
                  <span>{t.home.social.postLabel}</span><strong>{visual.title}</strong><small className="insta-meta">{t.home.social.meta}</small>
                </div>
              </a>
            ))}
          </div>
        </div>
        <a className="arrow-link carousel-link" href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">{t.home.social.seeAll} <Arrow /></a>
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
