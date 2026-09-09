import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const base = import.meta.env.BASE_URL;

const videos = [
  { title: 'Assassin’s Creed Black Flag Resynced', meta: 'REVIEW · 9:40', image: 'https://i.ytimg.com/vi/0e5yXxfchLA/hqdefault.jpg', href: 'https://www.youtube.com/watch?v=0e5yXxfchLA', tag: 'Gaming' },
  { title: 'Games & Comic Con Dzair 2026', meta: 'EVENT · 15:17', image: 'https://i.ytimg.com/vi/HzigJZOxz2o/hqdefault.jpg', href: 'https://www.youtube.com/watch?v=HzigJZOxz2o', tag: 'Culture' },
  { title: 'Inside ASUS Experts Day 2025', meta: 'TECH · 4:26', image: 'https://i.ytimg.com/vi/Zl6crcrPnPQ/hqdefault.jpg', href: 'https://www.youtube.com/watch?v=Zl6crcrPnPQ', tag: 'Tech' },
  { title: 'Let’s Play Awards 2025: Our Pick', meta: 'POP CULTURE · 27:14', image: 'https://i.ytimg.com/vi/0ThNyFItASM/hqdefault.jpg', href: 'https://www.youtube.com/watch?v=0ThNyFItASM', tag: 'Culture' },
];

const filters = ['All', 'Gaming', 'Tech', 'Culture'];
const socialVisuals = [
  { image: `${base}instagram-DdB-S3glhsG.jpg`, label: 'Instagram post', title: 'Latest from Let’s Play', url: 'https://www.instagram.com/p/DdB-S3glhsG/' },
  { image: `${base}instagram-DaI2RTBDoVA.jpg`, label: 'Instagram post', title: 'Gaming culture, on the feed', url: 'https://www.instagram.com/p/DaI2RTBDoVA/' },
  { image: `${base}instagram-DZ-6b8mAGvb.jpg`, label: 'Instagram post', title: 'New worlds to discover', url: 'https://www.instagram.com/p/DZ-6b8mAGvb/' },
  { image: `${base}instagram-DZ2weRDmm38.jpg`, label: 'Instagram post', title: 'The next big conversation', url: 'https://www.instagram.com/p/DZ2weRDmm38/' },
  { image: `${base}instagram-DZngPVdoZPq.jpg`, label: 'Instagram post', title: 'Pop culture, our way', url: 'https://www.instagram.com/p/DZngPVdoZPq/' },
  { image: `${base}instagram-DZX9rMwgSaH.jpg`, label: 'Instagram post', title: 'Play it loud', url: 'https://www.instagram.com/p/DZX9rMwgSaH/' },
];

function Arrow() { return <span aria-hidden="true">↗</span>; }

function App() {
  const [filter, setFilter] = useState('All');
  const [menuOpen, setMenuOpen] = useState(false);
  const [socialIndex, setSocialIndex] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const visibleSocialCount = typeof window !== 'undefined' && window.innerWidth <= 800 ? 1 : 3;
  const visibleVideos = filter === 'All' ? videos : videos.filter((video) => video.tag === filter);
  const previousSocial = () => setSocialIndex((current) => (current - 1 + (socialVisuals.length - visibleSocialCount + 1)) % (socialVisuals.length - visibleSocialCount + 1));
  const nextSocial = () => setSocialIndex((current) => (current + 1) % (socialVisuals.length - visibleSocialCount + 1));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main>
      <nav className={scrolled ? 'nav scrolled' : 'nav'}>
        <a className="brand" href="#top" aria-label="Let's Play, home">
          <img className="brand-logo" src={`${base}lets-play-logo.png`} alt="Let’s Play" />
        </a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Ouvrir le menu">MENU <span className={menuOpen ? 'dash open' : 'dash'}>—</span></button>
        <div className={menuOpen ? 'nav-links open' : 'nav-links'}>
          <a href="#top" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="#latest" onClick={() => setMenuOpen(false)}>News</a>
          <a href="#featured" onClick={() => setMenuOpen(false)}>Reviews</a>
          <a href="#formats" onClick={() => setMenuOpen(false)}>Dossiers</a>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-bg" style={{ backgroundImage: `url(${base}hero-dragon.jpg)` }} role="img" aria-label="Let’s Play dragon key art: a purple dragon over a shattered landscape with the Let’s Play logo" />
        <div className="hero-video" aria-hidden="true">
          <iframe
            src="https://www.youtube.com/embed/HzigJZOxz2o?autoplay=1&mute=1&loop=1&playlist=HzigJZOxz2o&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1&fs=0"
            title="Let’s Play background video"
            frameBorder="0"
            allow="autoplay; fullscreen"
            tabIndex={-1}
          />
        </div>
        <div className="hero-video-overlay" aria-hidden="true" />
        <div className="hero-shade" aria-hidden="true" />
        <div className="hero-frame" aria-hidden="true"><span className="tl" /><span className="tr" /><span className="bl" /><span className="br" /></div>
        <div className="hero-content">
          <p className="eyebrow"><span className="live-dot" /> Algeria’s gaming &amp; pop culture show</p>
          <h1>LEVEL UP<br /><em>YOUR REALITY.</em></h1>
          <p className="hero-text">Reviews, previews, e-sport, tech and pop culture — the show for the community that never stopped playing. Every drop, every round, every story worth playing.</p>
          <div className="hero-actions">
            <a className="button button-yellow" href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">Watch the episodes <Arrow /></a>
            <a className="button button-ghost" href="#show">Enter the show <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <div className="hero-hud">
          <div><strong>15K+</strong><small>YOUTUBE SUBS</small></div>
          <div><strong>33K+</strong><small>IG COMMUNITY</small></div>
          <div><strong>∞</strong><small>REASONS TO PLAY</small></div>
          <a className="scroll-cue" href="#featured" aria-label="Scroll to content">SCROLL<span /></a>
        </div>
      </section>

      <section className="ticker" aria-hidden="true"><div className="ticker-track">{[0, 1].map((half) => <span key={half}>GAMING <b>✦</b> E-SPORT <b>✦</b> CINEMA <b>✦</b> TECH <b>✦</b> POP CULTURE <b>✦</b> </span>)}</div></section>

      <section className="featured wrap" id="featured">
        <div className="section-label"><span><b>01</b> / NOW PLAYING</span><span>FEATURED EPISODE</span></div>
        <div className="featured-grid">
          <div className="featured-copy">
            <p className="eyebrow"><span className="live-dot" /> Featured episode</p>
            <h2>BLACK FLAG,<br /><em>FULL SAIL.</em></h2>
            <p>Watch our Assassin’s Creed Black Flag Resynced review — deep dives, previews and expert perspectives for players who want to stay ahead of the meta.</p>
            <a className="arrow-link" href="https://youtu.be/0e5yXxfchLA" target="_blank" rel="noreferrer">Open on YouTube <Arrow /></a>
          </div>
          <div className="featured-player hud-frame">
            <iframe
              src="https://www.youtube.com/embed/0e5yXxfchLA?rel=0&modestbranding=1"
              title="Assassin’s Creed Black Flag Resynced — Let's Play review"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      <section className="show wrap" id="show">
        <div className="section-label"><span><b>02</b> / THE SHOW</span><span>WHAT WE DO</span></div>
        <div className="manifesto-grid">
          <h2 className="manifesto-h2">GAMING,<br /><span>WE LIVE IT.</span></h2>
          <div>
            <p className="lead">Let’s Play is your world of gaming and pop culture.</p>
            <p>Discover the latest games, explore movies, shows and comics, and join a community built around the stories, characters and moments we love. From in-depth reviews to hot news and practical guides, there is always another level to reach.</p>
            <a className="arrow-link" href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">Join the community <Arrow /></a>
          </div>
        </div>
        <div className="stats">
          <div><strong>15K<span>+</span></strong><small>YOUTUBE SUBSCRIBERS</small></div>
          <div><strong>33K<span>+</span></strong><small>INSTAGRAM COMMUNITY</small></div>
          <div><strong>∞</strong><small>REASONS TO PLAY</small></div>
        </div>
      </section>

      <section className="formats wrap" id="formats">
        <div className="section-label"><span><b>03</b> / FORMATS</span><span>OUR PLAYGROUNDS</span></div>
        <div className="format-grid">
          <article className="format-card card-gaming"><span className="format-number">01</span><div className="format-icon">✦</div><h3>GAMING</h3><p>Latest games, reviews, previews, expert tips and guides.</p><a href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">Explore <Arrow /></a></article>
          <article className="format-card card-movies"><span className="format-number">02</span><div className="format-icon">◎</div><h3>MOVIES &amp; COMICS</h3><p>In-depth film and series reviews, plus hot news from the comic world.</p><a href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">Explore <Arrow /></a></article>
          <article className="format-card card-community"><span className="format-number">03</span><div className="format-icon">⌁</div><h3>COMMUNITY</h3><p>Join the Let’s Play community and dive into the fun together.</p><a href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">Join us <Arrow /></a></article>
        </div>
      </section>

      <section className="latest wrap" id="latest">
        <div className="section-label"><span><b>04</b> / EPISODES</span><span>WATCH NOW</span></div>
        <div className="latest-head">
          <h2>THE LATEST<br /><em>ROUND.</em></h2>
          <div className="filter-row">{filters.map((item) => <button key={item} className={filter === item ? 'filter active' : 'filter'} onClick={() => setFilter(item)}>{item}</button>)}</div>
        </div>
        <div className="video-grid">
          {visibleVideos.map((video) => (
            <a className="video-card" href={video.href} target="_blank" rel="noreferrer" key={video.title}>
              <div className="video-image"><img src={video.image} alt="" /><span className="play">▶</span></div>
              <div className="video-meta"><span>{video.meta}</span><span>{video.tag}</span></div>
              <h3>{video.title}</h3>
            </a>
          ))}
        </div>
      </section>

      <section className="social-carousel wrap" id="social">
        <div className="section-label"><span><b>05</b> / FEED</span><span>FROM OUR INSTAGRAM</span></div>
        <div className="carousel-head">
          <div>
            <p className="eyebrow"><span className="live-dot" /> Follow the conversation</p>
            <h2>THE FEED<br /><em>KEEPS MOVING.</em></h2>
          </div>
          <div className="carousel-controls">
            <button onClick={previousSocial} aria-label="Previous visual">←</button>
            <span>{String(socialIndex + 1).padStart(2, '0')} / {String(socialVisuals.length).padStart(2, '0')}</span>
            <button onClick={nextSocial} aria-label="Next visual">→</button>
          </div>
        </div>
        <div className="carousel-window">
          <div className="carousel-track" style={{ '--social-index': socialIndex }}>
            {socialVisuals.map((visual) => (
              <a className="social-slide" href={visual.url} target="_blank" rel="noreferrer" key={visual.title}>
                <div className="social-slide-media"><img src={visual.image} alt={visual.title} /></div>
                <div className="social-slide-overlay"><span>{visual.label}</span><strong>{visual.title}</strong></div>
              </a>
            ))}
          </div>
        </div>
        <a className="arrow-link carousel-link" href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">See all posts on Instagram <Arrow /></a>
      </section>

      <section className="cta wrap">
        <div>
          <p className="eyebrow"><span className="live-dot" /> The next round starts here</p>
          <h2>READY, PLAYER<br /><em>ONE?</em></h2>
        </div>
        <a className="button button-yellow" href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">Join the game <Arrow /></a>
      </section>

      <footer className="footer wrap">
        <a className="brand" href="#top" aria-label="Let's Play, home"><img className="brand-logo" src={`${base}lets-play-logo.png`} alt="Let’s Play" /></a>
        <p>An original show dedicated to the culture that brings us together.</p>
        <div className="footer-links">
          <a href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">Instagram</a>
          <a href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">YouTube</a>
          <span>© 2026 Let’s Play</span>
        </div>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
