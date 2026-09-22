import React from 'react';
import { Link } from 'react-router-dom';

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

const base = import.meta.env.BASE_URL;

export default function EventArena() {
  return (
    <article className="dossier-article">
      <header className="dossier-hero wrap">
        <div className="section-label"><span><b>EVENT</b> / 7OUMA ARENA</span><span>ÉMISSION · TOURNOI</span></div>
        <div className="dossier-hero-grid">
          <div>
            <p className="eyebrow"><span className="live-dot" /> Let’s Play × EGOR × Djezzy</p>
            <h1>7OUMA<br /><em>ARENA.</em></h1>
            <p className="dossier-dek">Une arène, deux formats : un show YouTube et un tournoi esport, portés par l’équipe Let’s Play, EGOR Gaming et Djezzy.</p>
            <div className="dossier-byline"><span>PAR L’ÉQUIPE LET’S PLAY</span><span>BY DJEZZY</span></div>
          </div>
          <div className="dossier-cover hud-frame" style={{ background: '#0b0d1e', display: 'grid', placeItems: 'center' }}>
            <img src={`${base}partners/7ouma-arena.png`} alt="7ouma Arena" style={{ objectFit: 'contain', padding: '12%' }} />
            <span className="dossier-cover-caption">7OUMA ARENA · LET’S PLAY · EGOR · DJEZZY</span>
          </div>
        </div>
      </header>

      <section className="dossier-reading wrap">
        <div className="dossier-main-column">
          <div className="dossier-intro">
            <p className="dossier-kicker">LE RENDEZ-VOUS</p>
            <p className="dossier-lead">7ouma Arena n’est pas un simple bandeau de sponsoring. C’est un rendez-vous construit à trois : l’équipe Let’s Play, EGOR Gaming et Djezzy.</p>
            <p>D’un côté, une émission gaming & esport diffusée sur YouTube. De l’autre, un tournoi monté sur le terrain, des inscriptions jusqu’aux finales. La bannière « by Djezzy » donne son nom à l’ensemble.</p>
          </div>

          <div className="dossier-section-grid">
            <aside className="dossier-pullquote">« Une marque qui présente, une structure qui organise, une équipe qui raconte. »</aside>
            <div>
              <h2>QUI FAIT<br /><em>QUOI.</em></h2>
              <p><strong>Let’s Play</strong> organise et couvre l’événement : tournage, interviews, contenus et diffusion des temps forts.</p>
              <p><strong>EGOR Gaming</strong> opère la compétition : formats, inscriptions, arbitrage et déroulé des matchs.</p>
              <p><strong>Djezzy</strong> présente le rendez-vous et le relie à ses enjeux réseau — 5G, streaming, essor de l’esport algérien.</p>
            </div>
          </div>

          <div className="dossier-dark-panel">
            <p className="dossier-kicker">DEUX FORMATS</p>
            <h2>LE SHOW<br /><em>ET LE TOURNOI.</em></h2>
            <p>Le show ouvre sur l’actualité du jeu, passe par la tech et l’innovation, puis revient sur les duels. Le tournoi, lui, se joue hors plateau — et revient ensuite en images.</p>
            <p>L’ambition reste claire : structurer le récit de l’esport algérien aujourd’hui, et viser plus large demain.</p>
          </div>
        </div>
      </section>

      <section className="dossier-next wrap">
        <div><p className="dossier-kicker">LES AUTRES EVENTS</p><h2>LA SUITE<br /><em>DU RÉCIT.</em></h2></div>
        <Link className="button button-ghost" to="/events">Retour aux events <Arrow /></Link>
      </section>
    </article>
  );
}
