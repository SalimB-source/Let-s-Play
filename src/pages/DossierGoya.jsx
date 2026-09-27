import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import useChapterVideo from '../lib/useChapterVideo';
import { youTubeEmbedUrl } from '../lib/videoPlayback';

const videoId = 'aTs0zhm6Leg';

const chapters = [
  ['00:00', 0, 'Introduction'],
  ['00:40', 40, 'HicoSoft Studio'],
  ['01:39', 99, 'Les outils du pipeline'],
  ['06:29', 389, 'Le projet GOYA'],
  ['08:41', 521, 'Les défis locaux'],
  ['11:32', 692, 'Marché et public cible'],
  ['13:35', 815, 'Le jeu indé de l’année 2025'],
  ['14:39', 879, 'Les réseaux de HicoSoft Studio'],
  ['15:57', 957, 'Idoom Market'],
  ['16:54', 1014, 'Conclusion'],
];

function Arrow() { return <span aria-hidden="true">↗</span>; }

export default function DossierGoya() {
  const videoRef = useRef(null);
  const { seekTo } = useChapterVideo(videoRef);

  return (
    <article className="dossier-article">
      <header className="dossier-hero wrap">
        <div className="section-label"><span><b>DOSSIER</b> / INDUSTRIE</span><span>LECTURE LONGUE · 17 MIN</span></div>
        <div className="dossier-hero-copy">
          <p className="eyebrow"><span className="live-dot" /> Scène indé algérienne</p>
          <h1>GOYA,<br /><em>LE MONDE D’APRÈS.</em></h1>
          <p className="dossier-dek">Dans les coulisses de HicoSoft Studio, une équipe algérienne construit ses outils, ses ambitions et une nouvelle façon de raconter le jeu vidéo local.</p>
          <div className="dossier-byline"><span>PAR LA RÉDACTION LET’S PLAY</span><span>19.09.2025</span></div>
        </div>
      </header>

      <section className="dossier-reading wrap">
        <div className="dossier-main-column">
          <div className="dossier-video hud-frame" ref={videoRef}>
            <iframe src={youTubeEmbedUrl(videoId)} title="HicoSoft Studio et le projet GOYA — Let’s Play Official" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          </div>
          <p className="dossier-video-note">La vidéo ouvre une fenêtre sur un studio, mais aussi sur tout un écosystème : les outils, les marchés et les communautés nécessaires pour faire exister un jeu depuis l’Algérie.</p>

          <div className="dossier-intro">
            <p className="dossier-kicker">LE SUJET</p>
            <p className="dossier-lead">Faire un jeu vidéo en Algérie ne consiste pas seulement à avoir une bonne idée. Il faut construire le pipeline, trouver les bons profils, comprendre son public et créer les conditions pour aller jusqu’au bout.</p>
            <p>La rencontre avec HicoSoft Studio montre cette réalité sans romantisme inutile. Le studio avance par projets, par outils et par décisions concrètes, avec l’envie de faire émerger des jeux qui puissent parler localement tout en regardant vers le monde.</p>
          </div>

          <div className="dossier-section-grid">
            <aside className="dossier-pullquote">« Avant de construire un monde, il faut construire la manière de le fabriquer. »</aside>
            <div>
              <h2>LE PIPELINE<br /><em>COMME BASE.</em></h2>
              <p>Les outils de production sont souvent invisibles pour le joueur. Pourtant, ils déterminent la vitesse d’une équipe, sa capacité à itérer et la qualité de ce qu’elle peut réellement livrer. Pour un studio indépendant, chaque outil bien pensé libère du temps pour le design, l’art et le récit.</p>
              <p>Cette approche révèle une maturité importante : le projet ne repose pas uniquement sur l’inspiration, mais sur une organisation capable de transformer une vision en prototype, puis en jeu.</p>
            </div>
          </div>

          <div className="dossier-dark-panel">
            <p className="dossier-kicker">LE PROJET</p>
            <h2>GOYA,<br /><em>AMBITION LOCALE.</em></h2>
            <p>GOYA concentre cette envie de créer un jeu avec une identité propre. Le projet doit trouver son ton, ses références et son public sans se réduire à une simple promesse de « jeu algérien ».</p>
            <p>La question centrale est celle de l’équilibre : raconter un univers qui vient d’ici, tout en restant lisible pour des joueurs qui ne partagent pas nécessairement le même contexte culturel. C’est dans cet espace que l’identité peut devenir une force de design.</p>
          </div>

          <div className="dossier-section-grid dossier-section-grid-reverse">
            <div>
              <h2>FAIRE INDÉ,<br /><em>ICI ET MAINTENANT.</em></h2>
              <p>Les défis sont nombreux : financement, visibilité, recrutement, accès aux outils et taille du marché. Mais ils créent aussi une manière particulière de travailler, plus directe, plus inventive et très attentive aux communautés qui peuvent porter un projet.</p>
              <p>Les événements et les initiatives comme Idoom Market deviennent alors des points de rencontre essentiels. Ils rapprochent les créateurs des joueurs et rendent visible une scène qui mérite de sortir de la marge.</p>
            </div>
            <aside className="dossier-stat-card"><strong>10</strong><span>CHAPITRES POUR<br />COMPRENDRE LE PROJET</span><b>STUDIO · OUTILS · MARCHÉ</b></aside>
          </div>
        </div>

        <aside className="dossier-sidebar">
          <div className="dossier-sidebar-inner">
            <p className="dossier-kicker">DANS CET ÉPISODE</p>
            <h3>LE CHAPITRAGE</h3>
            <ol className="chapter-list">
              {chapters.map(([time, seconds, label]) => (
                <li key={time}>
                  <button type="button" onClick={() => seekTo(seconds)} aria-label={`Lire la vidéo du dossier à ${time} : ${label}`}>
                    <time>{time}</time>
                    <span>{label}</span>
                    <span aria-hidden="true">▸</span>
                  </button>
                </li>
              ))}
            </ol>
            <a className="button button-yellow dossier-sidebar-button" href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer">Voir l’épisode <Arrow /></a>
          </div>
        </aside>
      </section>

      <section className="dossier-take wrap">
        <div><p className="eyebrow"><span className="live-dot" /> Le point de vue Let’s Play</p><h2>LA SCÈNE INDÉ<br /><em>DOIT PRENDRE SA PLACE.</em></h2></div>
        <p>Le plus important dans cette histoire n’est pas seulement le jeu à venir. C’est la preuve qu’une équipe locale peut penser production, identité et marché avec une ambition qui dépasse ses frontières.</p>
      </section>

      <section className="dossier-next wrap">
        <div><p className="dossier-kicker">DOSSIER PRÉCÉDENT</p><h2>POURQUOI<br /><em>LES SOULS ?</em></h2></div>
        <Link className="button button-ghost" to="/dossiers/pourquoi-les-souls">Lire le dossier <Arrow /></Link>
      </section>
    </article>
  );
}
