import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import useChapterVideo from '../lib/useChapterVideo';

const videoId = 'OH51fSHznwg';
const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

const chapters = [
  ['00:00', 0, 'Introduction'],
  ['01:30', 90, 'Les jeux Souls'],
  ['04:55', 295, 'La difficulté'],
  ['05:56', 356, 'La dopamine de la victoire'],
  ['07:56', 476, 'L’expérience « YOU DIED »'],
  ['09:23', 563, 'Une narration cryptique et mystérieuse'],
  ['13:11', 791, 'Dark Souls 1 & 2'],
  ['16:32', 992, 'La communauté'],
  ['20:10', 1210, 'Les conseils du joueur'],
  ['22:41', 1361, 'Conclusion'],
];

function Arrow() { return <span aria-hidden="true">↗</span>; }

export default function DossierSouls() {
  const videoRef = useRef(null);
  const { seekTo } = useChapterVideo(videoRef);

  return (
    <article className="dossier-article">
      <header className="dossier-hero wrap">
        <div className="section-label"><span><b>01 / DOSSIER</b> / GAMING</span><span>LECTURE LONGUE · 24 MIN</span></div>
        <div className="dossier-hero-grid">
          <div>
            <p className="eyebrow"><span className="live-dot" /> Analyse gaming</p>
            <h1>POURQUOI<br /><em>LES SOULS ?</em></h1>
            <p className="dossier-dek">Derrière la difficulté, il y a une sensation rare : celle d’avoir compris, progressé et gagné par soi-même.</p>
            <div className="dossier-byline"><span>PAR LA RÉDACTION LET’S PLAY</span><span>05.12.2025</span></div>
          </div>
          <a className="dossier-cover hud-frame" href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer" aria-label="Regarder l'épisode Pourquoi les Souls ?">
            <img src={thumbnail} alt="Épisode vidéo sur les jeux Souls" />
            <span className="dossier-play">▶</span>
            <span className="dossier-cover-caption">ÉPISODE 01 / POURQUOI LES SOULS ?</span>
          </a>
        </div>
      </header>

      <section className="dossier-reading wrap">
        <div className="dossier-main-column">
          <div className="dossier-video hud-frame" ref={videoRef}>
            <iframe src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`} title="Pourquoi les Souls ? — Let’s Play Official" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          </div>
          <p className="dossier-video-note">La vidéo est le point de départ de ce dossier. Lancez l’épisode, puis revenez explorer les idées qui structurent la conversation.</p>

          <div className="dossier-intro">
            <p className="dossier-kicker">LE SUJET</p>
            <p className="dossier-lead">Les jeux Souls ne demandent pas seulement au joueur d’être meilleur. Ils lui demandent d’accepter l’échec, de lire un monde qui ne s’explique jamais complètement et de trouver du plaisir dans la progression la plus lente.</p>
            <p>De Demon’s Souls à Elden Ring, la formule a changé de décor mais rarement de philosophie. Chaque victoire semble méritée parce qu’elle arrive après une série d’essais, d’observations et de décisions minuscules. La difficulté n’est donc pas une fin : c’est le langage du jeu.</p>
          </div>

          <div className="dossier-section-grid">
            <aside className="dossier-pullquote">« La victoire n’est pas donnée. Elle devient une histoire que le joueur peut raconter. »</aside>
            <div>
              <h2>APPRENDRE À<br /><em>ÉCHOUER</em></h2>
              <p>Le fameux écran « YOU DIED » est une ponctuation, pas une condamnation. Il transforme chaque défaite en information : une attaque à esquiver, un rythme à comprendre, une distance à respecter. Le joueur ne revient pas au même endroit ; il y revient avec un regard différent.</p>
              <p>C’est cette boucle qui crée la dopamine de la victoire. Le jeu ne célèbre pas uniquement le résultat, il fait ressentir le chemin parcouru pour l’obtenir.</p>
            </div>
          </div>

          <div className="dossier-dark-panel">
            <p className="dossier-kicker">AU-DELÀ DU COMBAT</p>
            <h2>UN MONDE QUI<br /><em>NE DIT PAS TOUT.</em></h2>
            <p>La narration des Souls avance par fragments : descriptions d’objets, silhouettes rencontrées au détour d’un chemin, ruines qui suggèrent une histoire plus vaste. Le joueur doit relier les indices et accepter qu’une part du mystère reste intacte.</p>
            <p>Cette retenue donne au monde une densité particulière. On ne visite pas seulement un décor ; on enquête sur ses traces, on discute avec une communauté et l’on construit sa propre interprétation.</p>
          </div>

          <div className="dossier-section-grid dossier-section-grid-reverse">
            <div>
              <h2>UNE COMMUNAUTÉ<br /><em>QUI TRANSMET.</em></h2>
              <p>Messages au sol, signes d’invocation, vidéos d’analyse et conseils partagés : les Souls sont aussi des jeux sociaux, même lorsqu’ils se jouent seul. La communauté prolonge le monde en donnant des clés, des avertissements et parfois de fausses pistes.</p>
              <p>Le meilleur conseil reste peut-être le plus simple : avancer à son rythme. Il n’existe pas une seule bonne manière de jouer, seulement celle qui donne envie de retenter.</p>
            </div>
            <aside className="dossier-stat-card"><strong>10</strong><span>CHAPITRES POUR<br />REVENIR AU SUJET</span><b>DIFFICULTÉ · RÉCIT · COMMUNAUTÉ</b></aside>
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
        <div><p className="eyebrow"><span className="live-dot" /> Le point de vue Let’s Play</p><h2>LA DIFFICULTÉ<br /><em>COMME LANGAGE.</em></h2></div>
        <p>Un bon jeu Souls ne vous demande pas d’aimer perdre. Il vous donne une raison de recommencer. C’est dans cet espace entre frustration et compréhension que naît son identité.</p>
      </section>

      <section className="dossier-next wrap">
        <div><p className="dossier-kicker">PROCHAIN DOSSIER</p><h2>À QUEL SUJET<br /><em>JOUE-T-ON ?</em></h2></div>
        <Link className="button button-ghost" to="/dossiers">Retour aux dossiers <Arrow /></Link>
      </section>
    </article>
  );
}
