import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const videos = [
  { title: 'Assassin’s Creed Black Flag Resynced', meta: 'REVIEW · 9:40', image: 'https://i.ytimg.com/vi/0e5yXxfchLA/hqdefault.jpg', href: 'https://www.youtube.com/watch?v=0e5yXxfchLA', tag: 'Gaming' },
  { title: 'Games & Comic Con Dzair 2026', meta: 'EVENT · 15:17', image: 'https://i.ytimg.com/vi/HzigJZOxz2o/hqdefault.jpg', href: 'https://www.youtube.com/watch?v=HzigJZOxz2o', tag: 'Culture' },
  { title: 'Inside ASUS Experts Day 2025', meta: 'TECH · 4:26', image: 'https://i.ytimg.com/vi/Zl6crcrPnPQ/hqdefault.jpg', href: 'https://www.youtube.com/watch?v=Zl6crcrPnPQ', tag: 'Tech' },
  { title: 'Let’s Play Awards 2025: Our Pick', meta: 'POP CULTURE · 27:14', image: 'https://i.ytimg.com/vi/0ThNyFItASM/hqdefault.jpg', href: 'https://www.youtube.com/watch?v=0ThNyFItASM', tag: 'Culture' },
];

const filters = ['View all', 'Gaming', 'Tech', 'Culture'];
const socialVisuals = [
  { image: `${import.meta.env.BASE_URL}instagram-01.jpg`, label: 'Behind the scenes', title: 'The people behind the play' },
  { image: `${import.meta.env.BASE_URL}instagram-02.jpg`, label: 'Gaming news', title: 'The adventures we are waiting for' },
  { image: `${import.meta.env.BASE_URL}instagram-03.jpg`, label: 'Let’s Play mood', title: 'The culture that keeps us playing' },
  { image: `${import.meta.env.BASE_URL}hero-lets-play.png`, label: 'Our universe', title: 'Enter the world of Let’s Play' },
];

function Arrow() { return <span aria-hidden="true">↗</span>; }

function App() {
  const [filter, setFilter] = useState('View all');
  const [menuOpen, setMenuOpen] = useState(false);
  const [socialIndex, setSocialIndex] = useState(0);
  const visibleVideos = filter === 'View all' ? videos : videos.filter((video) => video.tag === filter);
  const previousSocial = () => setSocialIndex((current) => (current - 1 + socialVisuals.length) % socialVisuals.length);
  const nextSocial = () => setSocialIndex((current) => (current + 1) % socialVisuals.length);

  return (
    <main>
      <nav className="nav wrap">
        <a className="brand brand-logo" href="#top" aria-label="Let's Play, home"><img src={`${import.meta.env.BASE_URL}lets-play-logo.jpg`} alt="Let’s Play" /></a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Ouvrir le menu">MENU <span className={menuOpen ? 'dash open' : 'dash'}>—</span></button>
        <div className={menuOpen ? 'nav-links open' : 'nav-links'}>
          <a href="#show" onClick={() => setMenuOpen(false)}>The show</a>
          <a href="#formats" onClick={() => setMenuOpen(false)}>Formats</a>
          <a href="#latest" onClick={() => setMenuOpen(false)}>Latest videos</a>
          <a className="nav-social" href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">Instagram <Arrow /></a>
        </div>
      </nav>

      <section className="hero wrap" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="live-dot" /> The show that plays the game</p>
          <h1>WE DON’T SEE<br /><em>THE WORLD</em><br />THE SAME WAY.</h1>
          <p className="hero-text">Gaming, cinema, e-sports, tech and pop culture: we decode everything we love, with the energy of a generation that never stopped playing.</p>
          <div className="hero-actions"><a className="button button-yellow" href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">Watch the episodes <Arrow /></a><a className="text-link" href="#show">Discover Let’s Play <span>↓</span></a></div>
        </div>
        <div className="hero-art hero-visual" aria-label="Let’s Play fantasy gaming world">
          <img src={`${import.meta.env.BASE_URL}hero-lets-play.png`} alt="Let’s Play logo floating above a fantasy gaming world" />
          <div className="hero-visual-caption"><span>LP / 2026</span><span>PLAY<br />LOUD</span></div>
        </div>
      </section>

      <section className="featured wrap" id="featured">
        <div className="section-label"><span>01 / FEATURED</span><span>NOW PLAYING</span></div>
        <div className="featured-grid">
          <div className="featured-copy">
            <p className="eyebrow"><span className="live-dot" /> Featured episode</p>
            <h2>BLACK FLAG,<br /><em>FULL SAIL.</em></h2>
            <p>Watch our Assassin’s Creed Black Flag Resynced review — a deep dive into the definitive pirate adventure.</p>
            <a className="arrow-link" href="https://youtu.be/0e5yXxfchLA" target="_blank" rel="noreferrer">Open on YouTube <Arrow /></a>
          </div>
          <div className="featured-player">
            <iframe
              src="https://www.youtube.com/embed/0e5yXxfchLA?rel=0&modestbranding=1"
              title="Assassin’s Creed Black Flag Resynced — Let's Play review"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      <section className="ticker"><div className="ticker-track">GAMING <b>✦</b> CINEMA <b>✦</b> E-SPORT <b>✦</b> POP CULTURE <b>✦</b> TECH <b>✦</b> GAMING <b>✦</b> CINEMA <b>✦</b> E-SPORT <b>✦</b> POP CULTURE <b>✦</b> TECH <b>✦</b></div></section>

      <section className="social-carousel wrap" id="social">
        <div className="section-label"><span>02 / INSTAGRAM</span><span>FROM OUR FEED</span></div>
        <div className="carousel-head"><div><p className="eyebrow"><span className="live-dot" /> Follow the conversation</p><h2>THE FEED<br /><em>KEEPS MOVING.</em></h2></div><div className="carousel-controls"><button onClick={previousSocial} aria-label="Previous visual">←</button><span>{String(socialIndex + 1).padStart(2, '0')} / {String(socialVisuals.length).padStart(2, '0')}</span><button onClick={nextSocial} aria-label="Next visual">→</button></div></div>
        <div className="carousel-window"><div className="carousel-track" style={{ transform: `translateX(-${socialIndex * 25}%)` }}>{socialVisuals.map((visual) => <a className="social-slide" href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer" key={visual.title}><img src={visual.image} alt={visual.title} /><div className="social-slide-overlay"><span>{visual.label}</span><strong>{visual.title}</strong><i>↗</i></div></a>)}</div></div>
        <a className="arrow-link carousel-link" href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">See all posts on Instagram <Arrow /></a>
      </section>

      <section className="manifesto wrap" id="show">
        <div className="section-label"><span>01</span><span>WHAT WE DO</span></div>
        <div className="manifesto-grid"><h2>POP CULTURE,<br /><span>WE LIVE IT.</span></h2><div><p className="lead">Let’s Play is where passion becomes conversation.</p><p>A show for people who grew up with a controller in one hand and a movie reference in the other. We explore new releases, meet the people shaping today’s culture, and always leave room for fun.</p><a className="arrow-link" href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">Follow us backstage <Arrow /></a></div></div>
        <div className="stats"><div><strong>15K<span>+</span></strong><small>YOUTUBE SUBSCRIBERS</small></div><div><strong>33K<span>+</span></strong><small>INSTAGRAM COMMUNITY</small></div><div><strong>∞</strong><small>REASONS TO PLAY</small></div></div>
      </section>

      <section className="formats wrap" id="formats">
        <div className="section-label"><span>02</span><span>OUR PLAYGROUNDS</span></div>
        <div className="format-grid"><article className="format-card card-yellow"><span className="format-number">01</span><div className="format-icon">✦</div><h3>GAMING</h3><p>Reviews, discoveries and debates — no lives wasted.</p><a href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">Explore <Arrow /></a></article><article className="format-card card-pink"><span className="format-number">02</span><div className="format-icon">◎</div><h3>CINEMA</h3><p>The stories that stay with us, the scenes we never forget.</p><a href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">Explore <Arrow /></a></article><article className="format-card card-blue"><span className="format-number">03</span><div className="format-icon">⌁</div><h3>POP CULTURE</h3><p>The trends, icons and ideas lighting up our screens.</p><a href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">Explore <Arrow /></a></article></div>
      </section>

      <section className="latest wrap" id="latest"><div className="section-label"><span>03</span><span>WATCH NOW</span></div><div className="latest-head"><h2>THE LATEST<br /><em>ROUND.</em></h2><div className="filter-row">{filters.map((item) => <button key={item} className={filter === item ? 'filter active' : 'filter'} onClick={() => setFilter(item)}>{item}</button>)}</div></div><div className="video-grid">{visibleVideos.map((video) => <a className="video-card" href={video.href} target="_blank" rel="noreferrer" key={video.title}><div className="video-image"><img src={video.image} alt="" /><span className="play">▶</span></div><div className="video-meta"><span>{video.meta}</span><span>{video.tag}</span></div><h3>{video.title}</h3></a>)}</div></section>

      <section className="cta wrap"><div><p className="eyebrow">The next round starts here</p><h2>SEE YOU<br /><em>ONLINE.</em></h2></div><a className="button button-dark" href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">Join the game <Arrow /></a></section>
      <footer className="footer wrap"><a className="brand brand-logo" href="#top"><img src={`${import.meta.env.BASE_URL}lets-play-logo.jpg`} alt="Let’s Play" /></a><p>An original show dedicated to the culture that brings us together.</p><div className="footer-links"><a href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">Instagram</a><a href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">YouTube</a><span>© 2026 Let’s Play</span></div></footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
