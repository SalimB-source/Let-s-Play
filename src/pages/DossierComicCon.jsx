import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import useChapterVideo from '../lib/useChapterVideo';
import { youTubeEmbedUrl } from '../lib/videoPlayback';

const videoId = 'HzigJZOxz2o';

function Arrow() { return <span aria-hidden="true">↗</span>; }

export default function DossierComicCon() {
  const videoRef = useRef(null);
  const { seekTo } = useChapterVideo(videoRef);

  return (
    <article className="dossier-article">
      <header className="dossier-hero wrap">
        <div className="section-label"><span><b>DOSSIER</b> / CULTURE</span><span>REPORTAGE · 15 MIN</span></div>
        <div className="dossier-hero-copy">
          <p className="eyebrow"><span className="live-dot" /> Culture gaming algérienne</p>
          <h1>LA CULTURE<br /><em>SE RÉUNIT.</em></h1>
          <p className="dossier-dek">À Games & Comic Con Dzair 2026, le jeu vidéo devient un lieu de rencontre : cosplay, invités, découvertes et communauté au même endroit.</p>
          <div className="dossier-byline"><span>PAR LA RÉDACTION LET’S PLAY</span><span>2026</span></div>
        </div>
      </header>

      <section className="dossier-reading wrap">
        <div className="dossier-main-column">
          <div className="dossier-video hud-frame" ref={videoRef}>
            <iframe src={youTubeEmbedUrl(videoId)} title="Games & Comic Con Dzair 2026 — Let’s Play Official" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          </div>
          <p className="dossier-video-note">Ce dossier accompagne le reportage vidéo et revient sur ce que raconte un événement pop culture lorsqu’il rassemble joueurs, créateurs, artistes et curieux dans un même espace.</p>

          <div className="dossier-intro">
            <p className="dossier-kicker">LE SUJET</p>
            <p className="dossier-lead">Un salon gaming ne se résume pas à une suite de stands. C’est un endroit où une communauté devient visible, où les passions quittent les écrans et où chacun peut trouver sa manière de participer.</p>
            <p>Games & Comic Con Dzair 2026 fait partie de ces rendez-vous qui mélangent jeu vidéo, comics, cosplay et culture populaire. Le public vient pour voir, essayer et photographier, mais surtout pour partager les mêmes références.</p>
          </div>

          <div className="dossier-section-grid">
            <aside className="dossier-pullquote">« Une convention réussie ne montre pas seulement une culture : elle lui donne un espace pour se reconnaître. »</aside>
            <div>
              <h2>UNE CULTURE<br /><em>EN PRÉSENCE.</em></h2>
              <p>Le gaming est souvent vécu seul, face à un écran. Les conventions renversent cette logique. Un cosplay devient une conversation, une démonstration déclenche un défi et une rencontre transforme un spectateur en membre actif de la communauté.</p>
              <p>Cette présence compte particulièrement dans un paysage où les joueurs algériens ont longtemps dû se retrouver dans des espaces dispersés. Le salon crée un point de rendez-vous commun, avec ses codes, ses souvenirs et ses nouvelles découvertes.</p>
            </div>
          </div>

          <div className="dossier-dark-panel">
            <p className="dossier-kicker">LE SPECTACLE</p>
            <h2>COSPLAY,<br /><em>CRÉATION ET FIERTÉ.</em></h2>
            <p>Le cosplay donne un visage immédiat à cette culture. Il demande du temps, du travail et une vraie envie de partager. Quand un personnage traverse l’allée d’une convention, il devient une performance autant qu’un hommage.</p>
            <p>Les invités, les activités et les espaces de jeu complètent cette énergie. Ils proposent plusieurs portes d’entrée dans la même passion : regarder, jouer, créer, collectionner ou simplement rencontrer ceux qui comprennent déjà.</p>
          </div>

          <div className="dossier-section-grid dossier-section-grid-reverse">
            <div>
              <h2>LE PUBLIC<br /><em>FAIT L’ÉVÉNEMENT.</em></h2>
              <p>La force d’un rendez-vous comme Games & Comic Con Dzair vient de son public. Les organisateurs peuvent réunir les formats, mais c’est la communauté qui leur donne une atmosphère et une mémoire.</p>
              <p>Chaque édition devient ainsi un signal pour l’écosystème local : il existe une audience, une curiosité et une envie de vivre la culture gaming au-delà des sorties internationales.</p>
            </div>
            <aside className="dossier-stat-card"><strong>01</strong><span>REPORTAGE POUR<br />UNE COMMUNAUTÉ EN MOUVEMENT</span><b>JEU · COSPLAY · CULTURE</b></aside>
          </div>
        </div>

        <aside className="dossier-sidebar">
          <div className="dossier-sidebar-inner">
            <p className="dossier-kicker">À VOIR DANS L’ÉPISODE</p>
            <h3>LE REPORTAGE</h3>
            <div className="chapter-list">
              <button type="button" onClick={() => seekTo(0)} aria-label="Lire la vidéo du reportage depuis le début">
                <time>00:00</time>
                <span>Games &amp; Comic Con Dzair 2026</span>
                <span aria-hidden="true">▸</span>
              </button>
            </div>
            <p className="dossier-video-note">Les chapitres détaillés ne sont pas publiés sur cette vidéo. Le reportage se regarde comme une immersion continue dans l’événement.</p>
            <a className="button button-yellow dossier-sidebar-button" href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer">Voir le reportage <Arrow /></a>
          </div>
        </aside>
      </section>

      <section className="dossier-take wrap">
        <div><p className="eyebrow"><span className="live-dot" /> Le point de vue Let’s Play</p><h2>LES RENDEZ-VOUS<br /><em>FONT COMMUNAUTÉ.</em></h2></div>
        <p>Le plus important n’est pas seulement ce qui est exposé, mais ce qui se crée entre les personnes. Une convention donne à la culture gaming algérienne un lieu, une voix et un souvenir commun.</p>
      </section>

      <section className="dossier-next wrap">
        <div><p className="dossier-kicker">DOSSIERS À EXPLORER</p><h2>RETROUVEZ<br /><em>LES AUTRES.</em></h2></div>
        <Link className="button button-ghost" to="/dossiers">Retour aux dossiers <Arrow /></Link>
      </section>
    </article>
  );
}
