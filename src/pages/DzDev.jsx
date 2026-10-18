import React from 'react';
import { Link } from 'react-router-dom';

const base = import.meta.env.BASE_URL;

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

export default function DzDev() {
  return (
    <main className="dzdev-page">
      <header className="dzdev-hero wrap">
        <div className="dzdev-hero-copy">
          <p className="eyebrow"><span className="live-dot" /> SCÈNE ALGÉRIENNE / INDEX OUVERT</p>
          <h1>DZ <em>DEV</em></h1>
          <p className="dzdev-hero-dek">Les studios et créateurs algériens du jeu vidéo, répertoriés au fil des portraits.</p>
          <a className="button button-yellow" href="#annuaire">Parcourir les portraits <Arrow /></a>
        </div>
        <div className="dzdev-hero-index" aria-label="Un studio référencé">
          <span>STUDIOS RÉFÉRENCÉS</span>
          <strong>01</strong>
          <b>PREMIER PORTRAIT</b>
        </div>
      </header>

      <section className="dzdev-directory wrap" id="annuaire">
        <div className="section-label"><span>ANNUAIRE / ALGÉRIE</span><span>01 — OUVERT</span></div>
        <div className="dzdev-section-heading">
          <div>
            <p className="dzdev-kicker">LES PREMIERS VISAGES</p>
            <h2>STUDIOS<br /><em>À DÉCOUVRIR.</em></h2>
          </div>
          <p>Un répertoire appelé à grandir : chaque fiche met en lumière une équipe, ses jeux et son parcours.</p>
        </div>

        <Link className="dzdev-feature" to="/dz-dev/hicosoft" aria-label="Lire le portrait de HicoSoft Studio">
          <div className="dzdev-feature-image">
            <img src={`${base}hicosoft-studio-lets-play.jpg`} alt="Vignette officielle du reportage Let’s Play consacré à HicoSoft Studio" loading="lazy" />
            <span className="dzdev-image-tag">PORTRAIT 01 · ALGER</span>
          </div>
          <div className="dzdev-feature-copy">
            <p className="dzdev-kicker">STUDIO ALGÉRIEN / CHÉRAGA</p>
            <h3>HicoSoft<br /><em>Studio</em></h3>
            <p>Une équipe basée à Alger, entre développement, game design et direction artistique. Son projet annoncé, <i>Eulogy: Cries of War</i>, puise dans les mythologies nord-africaines et le patrimoine amazigh.</p>
            <span className="dzdev-read-link">DÉCOUVRIR LE PORTRAIT <Arrow /></span>
          </div>
        </Link>

        <div className="dzdev-next-note">
          <span className="live-dot" aria-hidden="true" />
          <p><strong>Le répertoire commence ici.</strong> D’autres studios et développeurs algériens rejoindront cette page au fil des prochains portraits.</p>
        </div>
      </section>
    </main>
  );
}
