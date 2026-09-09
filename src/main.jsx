import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const videos = [
  { title: 'Assassin’s Creed Black Flag Resynced', meta: 'REVIEW · 9:40', image: 'https://i.ytimg.com/vi/0e5yXxfchLA/hqdefault.jpg', href: 'https://www.youtube.com/watch?v=0e5yXxfchLA', tag: 'Gaming' },
  { title: 'Games & Comic Con Dzair 2026', meta: 'EVENT · 15:17', image: 'https://i.ytimg.com/vi/HzigJZOxz2o/hqdefault.jpg', href: 'https://www.youtube.com/watch?v=HzigJZOxz2o', tag: 'Culture' },
  { title: 'Inside ASUS Experts Day 2025', meta: 'TECH · 4:26', image: 'https://i.ytimg.com/vi/Zl6crcrPnPQ/hqdefault.jpg', href: 'https://www.youtube.com/watch?v=Zl6crcrPnPQ', tag: 'Tech' },
  { title: 'Let’s Play Awards 2025: Our Pick', meta: 'POP CULTURE · 27:14', image: 'https://i.ytimg.com/vi/0ThNyFItASM/hqdefault.jpg', href: 'https://www.youtube.com/watch?v=0ThNyFItASM', tag: 'Culture' },
];

const filters = ['Tout voir', 'Gaming', 'Tech', 'Culture'];

function Arrow() { return <span aria-hidden="true">↗</span>; }

function App() {
  const [filter, setFilter] = useState('Tout voir');
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleVideos = filter === 'Tout voir' ? videos : videos.filter((video) => video.tag === filter);

  return (
    <main>
      <nav className="nav wrap">
        <a className="brand brand-logo" href="#top" aria-label="Let's Play, accueil"><span>Let’s</span><strong>Play</strong></a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Ouvrir le menu">MENU <span className={menuOpen ? 'dash open' : 'dash'}>—</span></button>
        <div className={menuOpen ? 'nav-links open' : 'nav-links'}>
          <a href="#show" onClick={() => setMenuOpen(false)}>L’émission</a>
          <a href="#formats" onClick={() => setMenuOpen(false)}>Formats</a>
          <a href="#latest" onClick={() => setMenuOpen(false)}>Dernières vidéos</a>
          <a className="nav-social" href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">Instagram <Arrow /></a>
        </div>
      </nav>

      <section className="hero wrap" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="live-dot" /> L’émission qui joue le jeu</p>
          <h1>ON NE REGARDE<br /><em>PLUS</em> LE MONDE<br />DE LA MÊME FAÇON.</h1>
          <p className="hero-text">Gaming, cinéma, e-sport, tech et pop culture : on décode tout ce qui nous passionne, avec l’énergie d’une génération qui n’a pas fini de jouer.</p>
          <div className="hero-actions"><a className="button button-yellow" href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">Voir les épisodes <Arrow /></a><a className="text-link" href="#show">Découvrir Let’s Play <span>↓</span></a></div>
        </div>
        <div className="hero-art" aria-label="Illustration graphique de l’univers Let’s Play">
          <div className="art-grid" />
          <div className="art-orb orb-one" /><div className="art-orb orb-two" />
          <div className="controller">⌁</div>
          <div className="art-caption"><span>LP / 2026</span><span>PLAY<br />LOUD</span></div>
          <div className="art-sticker">NO<br />SPOILERS</div>
        </div>
      </section>

      <section className="ticker"><div className="ticker-track">GAMING <b>✦</b> CINÉMA <b>✦</b> E-SPORT <b>✦</b> POP CULTURE <b>✦</b> TECH <b>✦</b> GAMING <b>✦</b> CINÉMA <b>✦</b> E-SPORT <b>✦</b> POP CULTURE <b>✦</b> TECH <b>✦</b></div></section>

      <section className="manifesto wrap" id="show">
        <div className="section-label"><span>01</span><span>CE QU’ON FAIT</span></div>
        <div className="manifesto-grid"><h2>LE POP CULTURE,<br /><span>ON LE VIT.</span></h2><div><p className="lead">Let’s Play, c’est le rendez-vous qui transforme la passion en conversation.</p><p>Une émission pensée pour celles et ceux qui grandissent avec une manette dans une main et une référence de film dans l’autre. On explore les sorties, on rencontre celles et ceux qui font la culture d’aujourd’hui, et on garde toujours une place pour le fun.</p><a className="arrow-link" href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">Suivre nos coulisses <Arrow /></a></div></div>
        <div className="stats"><div><strong>15K<span>+</span></strong><small>ABONNÉS YOUTUBE</small></div><div><strong>33K<span>+</span></strong><small>COMMUNAUTÉ INSTAGRAM</small></div><div><strong>∞</strong><small>DE RAISONS DE JOUER</small></div></div>
      </section>

      <section className="formats wrap" id="formats">
        <div className="section-label"><span>02</span><span>NOS TERRAINS DE JEU</span></div>
        <div className="format-grid"><article className="format-card card-yellow"><span className="format-number">01</span><div className="format-icon">✦</div><h3>GAMING</h3><p>Reviews, découvertes et débats pour ne jamais perdre une vie.</p><a href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">Explorer <Arrow /></a></article><article className="format-card card-pink"><span className="format-number">02</span><div className="format-icon">◎</div><h3>CINÉMA</h3><p>Les histoires qui nous marquent, les scènes qu’on n’oublie pas.</p><a href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">Explorer <Arrow /></a></article><article className="format-card card-blue"><span className="format-number">03</span><div className="format-icon">⌁</div><h3>POP CULTURE</h3><p>Les tendances, les icônes et tout ce qui fait vibrer nos écrans.</p><a href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">Explorer <Arrow /></a></article></div>
      </section>

      <section className="latest wrap" id="latest"><div className="section-label"><span>03</span><span>À VOIR MAINTENANT</span></div><div className="latest-head"><h2>LE DERNIER<br /><em>TOUR.</em></h2><div className="filter-row">{filters.map((item) => <button key={item} className={filter === item ? 'filter active' : 'filter'} onClick={() => setFilter(item)}>{item}</button>)}</div></div><div className="video-grid">{visibleVideos.map((video) => <a className="video-card" href={video.href} target="_blank" rel="noreferrer" key={video.title}><div className="video-image"><img src={video.image} alt="" /><span className="play">▶</span></div><div className="video-meta"><span>{video.meta}</span><span>{video.tag}</span></div><h3>{video.title}</h3></a>)}</div></section>

      <section className="cta wrap"><div><p className="eyebrow">La prochaine partie commence ici</p><h2>ON SE RETROUVE<br /><em>EN LIGNE.</em></h2></div><a className="button button-dark" href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">Rejoindre la partie <Arrow /></a></section>
      <footer className="footer wrap"><a className="brand brand-logo" href="#top"><span>Let’s</span><strong>Play</strong></a><p>Une émission originale dédiée à la culture qui nous rassemble.</p><div className="footer-links"><a href="https://www.instagram.com/letsplay.officiel/" target="_blank" rel="noreferrer">Instagram</a><a href="https://www.youtube.com/@letsplay.officiel" target="_blank" rel="noreferrer">YouTube</a><span>© 2026 Let’s Play</span></div></footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
