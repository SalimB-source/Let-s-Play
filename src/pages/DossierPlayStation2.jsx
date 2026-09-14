import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import useChapterVideo from '../lib/useChapterVideo';

const videoId = 'A2VPhWOUMHI';
const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

const chapters = [
  ['00:00', 0, 'Introduction'],
  ['01:24', 84, 'L’écran de démarrage'],
  ['02:26', 146, 'La console la plus vendue'],
  ['03:01', 181, 'La sortie de la PS2'],
  ['03:43', 223, 'Les fonctionnalités'],
  ['05:21', 321, 'Les manettes'],
  ['05:43', 343, 'La rétrocompatibilité'],
  ['06:10', 370, 'L’ancêtre de Kinect'],
  ['07:18', 438, 'Les jeux qui nous ont marqués'],
  ['11:43', 703, 'Le phénomène PlayStation 2'],
  ['13:26', 806, 'Le modèle des consoles suivantes'],
  ['15:46', 946, 'Les souvenirs'],
  ['16:47', 1007, 'Les références à Goldorak'],
  ['17:58', 1078, 'Conclusion'],
];

function Arrow() { return <span aria-hidden="true">↗</span>; }

export default function DossierPlayStation2() {
  const videoRef = useRef(null);
  const { seekTo } = useChapterVideo(videoRef);

  return (
    <article className="dossier-article">
      <header className="dossier-hero wrap">
        <div className="section-label"><span><b>05 / DOSSIER</b> / HISTOIRE DU GAMING</span><span>RÉTROSPECTIVE · 18 MIN</span></div>
        <div className="dossier-hero-grid">
          <div>
            <p className="eyebrow"><span className="live-dot" /> 25 ans de PlayStation 2</p>
            <h1>LA REINE<br /><em>DES CONSOLES.</em></h1>
            <p className="dossier-dek">Vingt-cinq ans après son lancement, la PlayStation 2 reste une référence mondiale : un lecteur DVD, une bibliothèque immense et des souvenirs qui dépassent largement le jeu vidéo.</p>
            <div className="dossier-byline"><span>PAR LA RÉDACTION LET’S PLAY</span><span>07.11.2025</span></div>
          </div>
          <a className="dossier-cover hud-frame" href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer" aria-label="Regarder le dossier sur les 25 ans de la PlayStation 2">
            <img src={thumbnail} alt="25 ans de PlayStation 2" />
            <span className="dossier-play">▶</span>
            <span className="dossier-cover-caption">ÉPISODE 05 / 25 ANS DE PLAYSTATION 2</span>
          </a>
        </div>
      </header>

      <section className="dossier-reading wrap">
        <div className="dossier-main-column">
          <div className="dossier-video hud-frame" ref={videoRef}>
            <iframe src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`} title="PS2 Turns 25 — Let’s Play Official" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          </div>
          <p className="dossier-video-note">Ce dossier accompagne l’épisode de <em>Journal du Geek</em> consacré aux 25 ans de la PlayStation 2, avec Chaft et Papou.</p>

          <div className="dossier-intro">
            <p className="dossier-kicker">LE SUJET</p>
            <p className="dossier-lead">La PlayStation 2 est devenue la console la plus vendue de l’histoire parce qu’elle a compris que le jeu vidéo pouvait être à la fois une machine, un lecteur multimédia et un objet culturel.</p>
            <p>Dans cet épisode, Chaft et Papou reviennent sur le lancement de 2000, sur l’étrange écran de démarrage de la console et sur le catalogue qui a accompagné toute une génération. Leur récit associe architecture technique, marketing, cinéma et souvenirs de joueurs.</p>
          </div>

          <div className="dossier-section-grid">
            <aside className="dossier-pullquote">« La PS2 n’est pas entrée dans les salons uniquement par les jeux : elle y est entrée par le DVD, puis elle y est restée par les souvenirs. »</aside>
            <div>
              <h2>UN ÉCRAN<br /><em>QUI INTRIGUE.</em></h2>
              <p>L’écran de démarrage de la PlayStation 2 fait partie de ses signes les plus reconnaissables. Les colonnes et les cubes blancs changent selon les données présentes sur la carte mémoire, donnant à chaque console une apparence légèrement différente.</p>
              <p>Ce détail transforme une séquence technique en signature émotionnelle. Avant même d’arriver au menu, le joueur retrouve une machine qui semble conserver la trace de ses propres parties.</p>
            </div>
          </div>

          <div className="dossier-dark-panel">
            <p className="dossier-kicker">LA RÉVOLUTION DVD</p>
            <h2>UNE CONSOLE<br /><em>POUR TOUTE LA MAISON.</em></h2>
            <p>Le lecteur DVD est l’un des grands avantages de la PS2. À son lancement, la console propose une porte d’entrée abordable vers un format qui change la manière de regarder des films. Sony ne vend donc pas seulement un appareil de jeu : la machine devient un équipement du salon.</p>
            <p>Cette polyvalence aide la PlayStation 2 à dépasser le public traditionnel des joueurs. Le DVD crée une justification familiale à l’achat, tandis que les jeux construisent ensuite une relation durable avec la console.</p>
          </div>

          <div className="dossier-section-grid dossier-section-grid-reverse">
            <div>
              <h2>UNE ARCHITECTURE<br /><em>À APPRIVOISER.</em></h2>
              <p>L’Emotion Engine donne à la console une réputation de puissance, mais sa conception rend aussi le développement complexe pour les studios tiers. L’aliasing, la mémoire et les contraintes de programmation obligent les équipes à trouver des solutions très spécifiques.</p>
              <p>La PS2 est ainsi une machine paradoxale : difficile à maîtriser, mais capable de résultats visuels et techniques qui semblaient improbables au début de la génération. Sa courbe d’apprentissage participe à la diversité de sa bibliothèque.</p>
            </div>
            <aside className="dossier-stat-card"><strong>14</strong><span>CHAPITRES POUR<br />RACONTER UN PHÉNOMÈNE</span><b>TECHNOLOGIE · DVD · CULTURE</b></aside>
          </div>

          <div className="dossier-section-grid">
            <aside className="dossier-pullquote">« Une génération entière a découvert la 3D, le cinéma et l’aventure dans la même bibliothèque. »</aside>
            <div>
              <h2>LES JEUX<br /><em>QUI ONT TOUT CHANGÉ.</em></h2>
              <p>La liste des jeux évoqués suffit à mesurer l’ampleur de l’héritage : <em>GTA</em>, <em>Devil May Cry</em>, <em>Metal Gear Solid</em>, <em>Final Fantasy</em>, <em>God of War</em>, <em>Tekken 5</em>, <em>Okami</em>, <em>Shadow of the Colossus</em>, <em>Jak and Daxter</em>, <em>Ratchet &amp; Clank</em>, <em>Onimusha</em>, <em>Final Fantasy X</em> et <em>Pro Evolution Soccer 6</em>.</p>
              <p>Ces jeux ne forment pas un genre unique. Ils montrent plutôt la capacité de la PS2 à accueillir le blockbuster, le jeu de combat, l’aventure expérimentale, le RPG, le sport et les expériences qui semblaient impossibles ailleurs.</p>
            </div>
          </div>

          <div className="dossier-dark-panel">
            <p className="dossier-kicker">L’HÉRITAGE</p>
            <h2>LA FORMULE<br /><em>DES CONSOLES MODERNES.</em></h2>
            <p>La PlayStation 2 a laissé un modèle qui dépasse ses composants : une identité forte, une technologie identifiable, des exclusivités, une compatibilité avec le passé et une présence dans la culture populaire.</p>
            <p>Les générations suivantes ont tenté de prolonger cette formule, avec des réussites et des accidents industriels comme celui que l’émission associe aux débuts de la PS3. La PS2 reste le point d’équilibre auquel Sony continue d’être comparé.</p>
          </div>

          <div className="dossier-section-grid dossier-section-grid-reverse">
            <div>
              <h2>UNE CONSOLE<br /><em>QUI RESTE.</em></h2>
              <p>Les chiffres de vente peuvent varier selon les sources, mais l’ordre de grandeur ne change pas : la PS2 demeure la console la plus vendue de l’histoire avec environ 160 millions d’exemplaires. Sa performance commerciale n’explique pas à elle seule son statut.</p>
              <p>La console est restée dans les mémoires parce qu’elle a accompagné des passages importants : l’arrivée du DVD, les premières expériences en ligne et la découverte de mondes comme ceux de <em>GTA San Andreas</em>, <em>God of War</em> ou <em>Metal Gear Solid 3</em>.</p>
            </div>
            <aside className="dossier-stat-card"><strong>25</strong><span>ANS D’UNE CONSOLE<br />QUI A DÉFINI UN SALON</span><b>JEUX · DVD · SOUVENIRS</b></aside>
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
        <div><p className="eyebrow"><span className="live-dot" /> Le point de vue Let’s Play</p><h2>LA REINE<br /><em>EST TOUJOURS LÀ.</em></h2></div>
        <p>La PlayStation 2 a réussi à être une console de jeu, un lecteur DVD et un souvenir commun. Vingt-cinq ans plus tard, son héritage tient dans cette capacité rare à avoir changé à la fois la technologie et les habitudes du salon.</p>
      </section>

      <section className="dossier-next wrap">
        <div><p className="dossier-kicker">LES AUTRES DOSSIERS</p><h2>POURSUIVEZ<br /><em>LA LECTURE.</em></h2></div>
        <Link className="button button-ghost" to="/dossiers">Retour aux dossiers <Arrow /></Link>
      </section>
    </article>
  );
}

// Source vidéo : https://youtu.be/A2VPhWOUMHI?si=HEVxlj5X7ZFpQZzD
