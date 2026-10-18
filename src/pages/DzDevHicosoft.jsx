import React from 'react';
import { Link } from 'react-router-dom';
import { youTubeEmbedUrl } from '../lib/videoPlayback';

const base = import.meta.env.BASE_URL;
const videoId = 'aTs0zhm6Leg';

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

export default function DzDevHicosoft() {
  return (
    <main className="dzdev-page dzdev-article">
      <header className="dzdev-article-hero wrap">
        <div className="section-label"><span>DZ DEV / PORTRAIT 01</span><span>INDUSTRIE ALGÉRIENNE</span></div>
        <p className="eyebrow"><span className="live-dot" /> STUDIO DE DÉVELOPPEMENT · ALGER</p>
        <h1>HICOSOFT<br /><em>STUDIO.</em></h1>
        <p className="dzdev-article-dek">À Chéraga, dans la région d’Alger, HicoSoft Studio rassemble développement, game design et art autour de jeux pensés depuis l’Algérie.</p>
        <div className="dzdev-byline"><span>PORTRAIT DZ DEV Nº 01</span><span>HICOSOFT STUDIO</span></div>
      </header>

      <figure className="dzdev-article-visual wrap">
        <img src={`${base}hicosoft-studio-lets-play.jpg`} alt="Vignette officielle du reportage Let’s Play sur HicoSoft Studio, avec le logo HicoSoft et la mention Made in Algeria" />
        <figcaption>La vignette officielle de l’épisode Let’s Play consacré au studio.</figcaption>
      </figure>

      <article className="dzdev-story wrap">
        <p className="dzdev-story-lead">HicoSoft Studio est un studio de jeux vidéo indépendant basé à Alger. Son site présente trois pôles de production : le développement, le game design et l’art — de la programmation des systèmes à la création des mécaniques et de l’univers visuel.</p>

        <section className="dzdev-story-section">
          <p className="dzdev-kicker">UN STUDIO, TROIS MÉTIERS</p>
          <h2>FAIRE TENIR<br /><em>LE MONDE ENSEMBLE.</em></h2>
          <p>La présentation officielle de HicoSoft décrit le développement comme le versant technique du jeu, le game design comme la conception des règles et de l’expérience, et l’art comme la création de ses éléments visuels. Ces trois sections travaillent à fabriquer des expériences cohérentes, du fonctionnement à l’identité artistique.</p>
          <p>Le studio est établi à Chéraga, à Alger. Son site officiel présente cette adresse et ses activités de création de jeux vidéo, aux côtés de ses autres services numériques.</p>
          <a className="dzdev-source-link" href="https://www.hicosoftstudio.com/games" target="_blank" rel="noreferrer">Voir la présentation officielle du studio <Arrow /></a>
        </section>

        <section className="dzdev-project-panel">
          <p className="dzdev-kicker">PROJET ANNONCÉ</p>
          <h2>EULOGY:<br /><em>CRIES OF WAR.</em></h2>
          <p>Dans une publication sur sa page LinkedIn officielle, HicoSoft présente <i>Eulogy: Cries of War</i> comme un jeu d’action-aventure fantastique à la troisième personne. Le studio indique que le projet s’inspire des mythologies nord-africaines et du patrimoine culturel amazigh, et partage un extrait cinématique réalisé sous Unreal Engine 5. La séquence est explicitement signalée comme du travail en cours.</p>
          <a className="dzdev-source-link" href="https://www.linkedin.com/company/hicosoft-studio/" target="_blank" rel="noreferrer">Suivre les publications de HicoSoft Studio <Arrow /></a>
        </section>

        <section className="dzdev-story-section dzdev-reportage">
          <p className="dzdev-kicker">LE REPORTAGE LET’S PLAY</p>
          <h2>LES COULISSES<br /><em>DU STUDIO.</em></h2>
          <p>Let’s Play a déjà consacré un épisode à HicoSoft Studio. Publié le 19 septembre 2025, le reportage présente les outils de production, le projet GOYA tel qu’il y est nommé, les défis locaux et le public visé. Il donne la parole à l’équipe et complète ce premier portrait par une visite en vidéo.</p>
          <div className="dzdev-video-frame">
            <iframe
              src={youTubeEmbedUrl(videoId)}
              title="Inside HicoSoft Studio — reportage Let’s Play Official"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <a className="dzdev-source-link" href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer">Voir l’épisode sur YouTube <Arrow /></a>
          <p className="dzdev-existing-feature">Pour une lecture plus longue du reportage et de l’épisode consacré à GOYA, retrouvez aussi le <Link to="/dossiers/goya-hicosoft">dossier HicoSoft déjà publié sur Let’s Play</Link>.</p>
        </section>

        <footer className="dzdev-article-footer">
          <Link className="button button-ghost" to="/dz-dev">← Retour à Dz DEV</Link>
          <span>FIN DU PORTRAIT 01</span>
        </footer>
      </article>
    </main>
  );
}
