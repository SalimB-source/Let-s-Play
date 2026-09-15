import React from 'react';
import { Link } from 'react-router-dom';
import { youTubeEmbedUrl } from '../lib/videoPlayback';

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

const base = import.meta.env.BASE_URL;
const videoId = 'aTs0zhm6Leg';

export default function EventAlgerieTelecom() {
  return (
    <article className="dossier-article">
      <header className="dossier-hero wrap">
        <div className="section-label"><span><b>01 / EVENT</b> / PARTENARIAT</span><span>12 MOIS</span></div>
        <div className="dossier-hero-grid">
          <div>
            <p className="eyebrow"><span className="live-dot" /> Algérie Télécom</p>
            <h1>UN AN<br /><em>ENSEMBLE.</em></h1>
            <p className="dossier-dek">Let’s Play et Algérie Télécom ont travaillé côte à côte pendant un an : production, diffusion et rendez-vous avec la scène gaming algérienne.</p>
            <div className="dossier-byline"><span>PAR L’ÉQUIPE LET’S PLAY</span><span>PARTENARIAT · 12 MOIS</span></div>
          </div>
          <a className="dossier-cover hud-frame" href="https://www.algerietelecom.dz/" target="_blank" rel="noreferrer" aria-label="Algérie Télécom" style={{ background: '#fff', display: 'grid', placeItems: 'center' }}>
            <img src={`${base}partners/algerie-telecom.png`} alt="Algérie Télécom" style={{ objectFit: 'contain', padding: '16%' }} />
            <span className="dossier-cover-caption">ALGÉRIE TÉLÉCOM · PARTENAIRE DE DIFFUSION</span>
          </a>
        </div>
      </header>

      <section className="dossier-reading wrap">
        <div className="dossier-main-column">
          <div className="dossier-video hud-frame">
            <iframe src={youTubeEmbedUrl(videoId)} title="Let’s Play × Algérie Télécom" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          </div>
          <p className="dossier-video-note">Un an de plateau, de chroniques et de rencontres — dont l’épisode consacré à HicoSoft Studio et au projet GOYA.</p>

          <div className="dossier-intro">
            <p className="dossier-kicker">LE PARTENARIAT</p>
            <p className="dossier-lead">Algérie Télécom a accompagné Let’s Play pendant douze mois, de la chronique Journal du Geek aux interviews de studios locaux.</p>
            <p>La collaboration a posé le cadre de diffusion de l’émission : connectivité, visibilité et un lien concret avec les services de l’opérateur, notamment autour du matériel et du jeu en ligne.</p>
          </div>

          <div className="dossier-section-grid">
            <aside className="dossier-pullquote">« Un an pour installer l’émission, pas seulement pour la sponsoriser. »</aside>
            <div>
              <h2>DOUZE MOIS<br /><em>SUR LE TERRAIN.</em></h2>
              <p>Le partenariat n’était pas un logo de passage. Il a duré une année complète, le temps de construire des formats, de filmer des studios algériens et de parler à la communauté semaine après semaine.</p>
              <p>IdOOM Market, la vitrine gaming et tech d’Algérie Télécom, a aussi trouvé sa place dans les épisodes : routeurs, périphériques, outils — le rappel que sans réseau, il n’y a pas de match.</p>
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
