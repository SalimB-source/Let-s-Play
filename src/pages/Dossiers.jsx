import React from 'react';
import { Link } from 'react-router-dom';
import { baseUrl as base } from '../data';

function Arrow(){ return <span aria-hidden="true">↗</span>; }

export default function Dossiers(){
  return (
    <>
      <section className="page-hero wrap">
        <div className="section-label"><span><b>PAGE</b> / DOSSIERS</span><span>GO DEEPER</span></div>
        <div className="page-hero-grid">
          <div>
            <p className="eyebrow"><span className="live-dot" /> Long reads</p>
            <h1>DOSSIERS,<br/><em>LEVEL 2.</em></h1>
            <p className="page-hero-text">Beyond news — investigations, guides, culture deep-dives. This page is where Let’s Play slows down and goes deep. Multi-page means more space to play.</p>
          </div>
          <div className="page-hero-visual hud-frame">
            <div className="page-hero-visual-inner" style={{backgroundImage:`url(${base}hero-lets-play.png)`}} />
            <div className="page-hero-visual-shade" />
            <div className="page-hero-visual-content">
              <strong>∞</strong><small>DEPTH</small>
              <span>Guides • Culture • Community</span>
            </div>
          </div>
        </div>
      </section>

      <section className="formats wrap">
        <div className="section-label"><span><b>01</b> / FORMATS</span><span>OUR PLAYGROUNDS</span></div>
        <div className="format-grid">
          <article className="format-card card-gaming"><span className="format-number">01</span><div className="format-icon">✦</div><h3>GAMING</h3><p>Latest games, reviews, previews, expert tips and guides. Now with dedicated pages.</p><Link to="/reviews">Explore <Arrow/></Link></article>
          <article className="format-card card-movies"><span className="format-number">02</span><div className="format-icon">◎</div><h3>MOVIES &amp; COMICS</h3><p>In-depth film and series reviews, plus hot news from the comic world. Full archive on News.</p><Link to="/news">Explore <Arrow/></Link></article>
          <article className="format-card card-community"><span className="format-number">03</span><div className="format-icon">⌁</div><h3>COMMUNITY</h3><p>Join the Let’s Play community and dive into the fun together. Instagram feed on Home.</p><Link to="/">Back home <Arrow/></Link></article>
        </div>
      </section>

      <section className="show wrap">
        <div className="section-label"><span><b>02</b> / THE SHOW</span><span>WHAT WE DO</span></div>
        <div className="manifesto-grid">
          <h2 className="manifesto-h2">WE DON’T<br/><span>JUST PLAY.</span></h2>
          <div>
            <p className="lead">We document the culture.</p>
            <p>Let’s Play started as a single page. Now it’s multi-page — so each format gets room to breathe. Gaming, movies, comics, tech, e-sport — all connected, but now navigable.</p>
            <div style={{display:'flex', gap:12, flexWrap:'wrap', marginTop:18}}>
              <Link className="button button-yellow" to="/">Home <Arrow/></Link>
              <Link className="button button-ghost" to="/news">News <Arrow/></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="cta wrap">
        <div>
          <p className="eyebrow"><span className="live-dot" /> Next level</p>
          <h2>EXPLORE<br/><em>EVERY PAGE.</em></h2>
        </div>
        <Link className="button button-yellow" to="/">Back to home <Arrow/></Link>
      </section>
    </>
  );
}
