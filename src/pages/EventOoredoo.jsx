import React from 'react';
import { Link } from 'react-router-dom';
import { youTubeEmbedUrl } from '../lib/videoPlayback';

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

const base = import.meta.env.BASE_URL;
const videoId = '0nHji4C-Mp4';

export default function EventOoredoo() {
  return (
    <article className="dossier-article">
      <header className="dossier-hero wrap">
        <div className="section-label"><span><b>02 / EVENT</b> / PARTENARIAT</span><span>6 MOIS · TOURNOI</span></div>
        <div className="dossier-hero-grid">
          <div>
            <p className="eyebrow"><span className="live-dot" /> Ooredoo</p>
            <h1>SIX MOIS,<br /><em>UN TOURNOI.</em></h1>
            <p className="dossier-dek">Let’s Play et Ooredoo ont partagé six mois d’émission, d’activations et de giveaways, avec un tournoi pour clôturer le partenariat.</p>
            <div className="dossier-byline"><span>PAR L’ÉQUIPE LET’S PLAY</span><span>PARTENARIAT · 6 MOIS</span></div>
          </div>
          <a className="dossier-cover hud-frame" href="https://www.ooredoo.dz/" target="_blank" rel="noreferrer" aria-label="Ooredoo" style={{ background: '#fff', display: 'grid', placeItems: 'center' }}>
            <img src={`${base}partners/ooredoo.png`} alt="Ooredoo" style={{ objectFit: 'contain', padding: '16%' }} />
            <span className="dossier-cover-caption">OOREDOO · ANNONCEUR</span>
          </a>
        </div>
      </header>

      <section className="dossier-reading wrap">
        <div className="dossier-main-column">
          <div className="dossier-video hud-frame">
            <iframe src={youTubeEmbedUrl(videoId)} title="Let’s Play × Ooredoo" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          </div>
          <p className="dossier-video-note">Le partenariat se voyait à l’écran : épisodes, giveaways et rendez-vous communauté sur la chaîne Let’s Play.</p>

          <div className="dossier-intro">
            <p className="dossier-kicker">LE PARTENARIAT</p>
            <p className="dossier-lead">Six mois pour ancrer Ooredoo dans l’émission, puis un tournoi pour donner un vrai temps fort à la collaboration.</p>
            <p>La marque n’était pas seulement un bandeau. Elle a nourri des activations destinées aux spectateurs — concours, visibilité, et une compétition pour clore le cycle.</p>
          </div>

          <div className="dossier-section-grid">
            <aside className="dossier-pullquote">« Un semestre d’antenne, et un tournoi pour le refermer. »</aside>
            <div>
              <h2>L’ÉMISSION,<br /><em>PUIS L’ARÈNE.</em></h2>
              <p>Pendant six mois, Ooredoo a accompagné Let’s Play sur YouTube. Les épisodes ont servi de relais : actualité gaming, horror games, giveaways — autant de portes d’entrée vers la communauté.</p>
              <p>Le tournoi a donné une issue claire au partenariat : passer du plateau à la compétition, et laisser les joueurs occuper le centre de l’écran.</p>
            </div>
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
