import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import useChapterVideo from '../lib/useChapterVideo';

const videoId = 'oOyW_rjiZ5w';

const chapters = [
  ['00:00', 0, 'Introduction'],
  ['01:18', 78, 'Avant la PlayStation'],
  ['02:23', 143, 'Le projet Super Nintendo CD'],
  ['03:13', 193, 'PlayStation et Ken Kutaragi'],
  ['05:56', 356, 'Les jeux qui nous ont fait aimer'],
  ['11:41', 701, 'Les raisons du succès'],
  ['13:01', 781, 'Les souvenirs'],
  ['18:02', 1082, 'Les manettes PlayStation'],
  ['18:50', 1130, 'Conclusion'],
];

function Arrow() { return <span aria-hidden="true">↗</span>; }

export default function DossierPlayStation1() {
  const videoRef = useRef(null);
  const { seekTo } = useChapterVideo(videoRef);

  return (
    <article className="dossier-article">
      <header className="dossier-hero wrap">
        <div className="section-label"><span><b>02 / DOSSIER</b> / HISTOIRE DU GAMING</span><span>LECTURE LONGUE · 19 MIN</span></div>
        <div className="dossier-hero-copy">
          <p className="eyebrow"><span className="live-dot" /> Journal du Geek</p>
          <h1>LA PLAYSTATION 1,<br /><em>UNE RÉVOLUTION.</em></h1>
          <p className="dossier-dek">Trente et un ans après son lancement, la première PlayStation reste le symbole d’un changement de génération : des cartouches aux CD, de la 2D à la 3D, du jeu d’enfant à une culture de masse.</p>
          <div className="dossier-byline"><span>PAR LA RÉDACTION LET’S PLAY</span><span>25.12.2025</span></div>
        </div>
      </header>

      <section className="dossier-reading wrap">
        <div className="dossier-main-column">
          <div className="dossier-video hud-frame" ref={videoRef}>
            <iframe src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`} title="PlayStation 1, 31th anniversary: The Legacy Explained — Let’s Play Official" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          </div>
          <p className="dossier-video-note">Ce dossier accompagne l’épisode spécial de Let’s Play consacré à la console qui a changé la manière dont une génération joue, regarde et parle du jeu vidéo.</p>

          <div className="dossier-intro">
            <p className="dossier-kicker">LE SUJET</p>
            <p className="dossier-lead">La PlayStation 1 n’a pas seulement lancé une nouvelle machine. Elle a changé l’échelle du jeu vidéo, son langage et le public auquel il pouvait s’adresser.</p>
            <p>Dans cet épisode de <em>Journal du Geek</em>, Chaft et Rami reviennent sur le lancement japonais du 3 décembre 1994 et sur les événements qui ont rendu possible l’arrivée de Sony dans le jeu vidéo. Leur récit mêle histoire industrielle, souvenirs personnels et une galerie de jeux devenus des références.</p>
          </div>

          <div className="dossier-section-grid">
            <aside className="dossier-pullquote">« La PlayStation est devenue plus qu’une console : le nom d’une manière de jouer ensemble. »</aside>
            <div>
              <h2>UNE CONSOLE<br /><em>NÉE D’UNE RUPTURE.</em></h2>
              <p>Avant la PlayStation, le marché est dominé par Sega et Nintendo. Le projet initial de Sony avec Nintendo autour d’un lecteur CD échoue, mais cette rupture ne fait pas disparaître l’idée. Elle donne à Sony l’occasion de développer sa propre machine.</p>
              <p>Le prototype connu sous le nom de “Nintendo PlayStation” apparaît dans l’épisode comme la trace visible d’une histoire qui aurait pu prendre une autre direction. La console finale naît d’un conflit industriel devenu point de départ.</p>
            </div>
          </div>

          <div className="dossier-dark-panel">
            <p className="dossier-kicker">LE CHANGEMENT TECHNIQUE</p>
            <h2>DU CD-ROM<br /><em>À LA 3D.</em></h2>
            <p>Le CD-ROM apporte une capacité de stockage largement supérieure à celle des cartouches. Il ouvre la porte à des musiques plus riches, à des voix, à des cinématiques et à des mondes qui peuvent multiplier les ambiances sans être limités par le format précédent.</p>
            <p>L’épisode présente ce choix comme l’un des moteurs de la réussite de Sony. La PlayStation ne vend pas seulement une puissance supplémentaire : elle vend une nouvelle grammaire visuelle, fondée sur la 3D, le disque et la mise en scène.</p>
          </div>

          <div className="dossier-section-grid dossier-section-grid-reverse">
            <div>
              <h2>LES JEUX<br /><em>QUI RESTENT.</em></h2>
              <p>La console est aussi devenue une mémoire collective grâce à sa bibliothèque. <em>Rage Racer</em>, <em>Tekken 3</em>, <em>Wipeout</em>, <em>Tomb Raider</em>, <em>Gran Turismo</em>, <em>Castlevania: Symphony of the Night</em>, <em>Metal Gear Solid</em>, <em>Final Fantasy VII</em> et <em>Crash Bandicoot</em> apparaissent comme autant de portes d’entrée vers cette époque.</p>
              <p>Ces jeux ne proposent pas tous la même expérience. Leur point commun est d’avoir donné une forme reconnaissable à la promesse PlayStation : vitesse, cinéma, exploration, compétition, aventure et personnages capables de devenir des icônes.</p>
            </div>
            <aside className="dossier-stat-card"><strong>09</strong><span>CHAPITRES POUR<br />RACONTER UNE RÉVOLUTION</span><b>HISTOIRE · JEUX · SOUVENIRS</b></aside>
          </div>

          <div className="dossier-section-grid">
            <aside className="dossier-pullquote">« Dans beaucoup de foyers, “jouer” a fini par se dire “faire une Play”. »</aside>
            <div>
              <h2>UNE CULTURE<br /><em>QUI S’INSTALLE.</em></h2>
              <p>Le dossier insiste sur la dimension sociale de la console. En Algérie comme ailleurs, le mot “Play” devient une façon ordinaire de désigner le jeu vidéo. Les parties de <em>PES</em> ou d’<em>ISS</em> transforment la console en lieu de rendez-vous, de compétition et de négociation entre amis.</p>
              <p>Les souvenirs évoqués — câbles abîmés, échanges de jeux, difficultés rencontrées dans certains titres comme <em>Harry Potter</em> — donnent à l’histoire une dimension concrète. L’héritage de la PS1 ne se trouve pas uniquement dans ses chiffres, mais dans les habitudes qu’elle a créées.</p>
            </div>
          </div>
        </div>

        <aside className="dossier-sidebar">
          <div className="dossier-sidebar-inner">
            <p className="dossier-kicker">DANS CET ÉPISODE</p>
            <h3>LE CHAPITRAGE</h3>
            <ol className="chapter-list">
              {chapters.map(([time, seconds, label]) => (
                <li key={time}>
                  <button type="button" onClick={() => seekTo(seconds)} aria-label={`Lire la vidéo à ${time} : ${label}`}>
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
        <div><p className="eyebrow"><span className="live-dot" /> Le point de vue Let’s Play</p><h2>LA PREMIÈRE<br /><em>RESTE PRÉSENTE.</em></h2></div>
        <p>La PlayStation 1 a préparé le terrain pour les consoles modernes, mais son héritage est aussi affectif. Elle a rendu visibles de nouveaux mondes et a donné à toute une génération des souvenirs à partager.</p>
      </section>

      <section className="dossier-next wrap">
        <div><p className="dossier-kicker">LES AUTRES DOSSIERS</p><h2>POURSUIVEZ<br /><em>LA LECTURE.</em></h2></div>
        <Link className="button button-ghost" to="/dossiers">Retour aux dossiers <Arrow /></Link>
      </section>
    </article>
  );
}

// Source vidéo : https://youtu.be/oOyW_rjiZ5w?si=ycSXTuriJJpjFDxp
