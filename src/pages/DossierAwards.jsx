import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import useChapterVideo from '../lib/useChapterVideo';
import { youTubeEmbedUrl } from '../lib/videoPlayback';

const videoId = '0ThNyFItASM';

const chapters = [
  ['00:00', 0, 'Introduction'],
  ['01:00', 60, 'Claque visuelle'],
  ['03:42', 222, 'Meilleure narration'],
  ['05:57', 357, 'Direction artistique'],
  ['08:12', 492, 'Meilleure musique'],
  ['11:37', 697, 'Action-aventure'],
  ['16:15', 975, 'Jeu indépendant'],
  ['19:50', 1190, 'Surprise de l’année'],
  ['24:21', 1461, 'Jeu de l’année'],
  ['26:26', 1586, 'Conclusion'],
];

function Arrow() { return <span aria-hidden="true">↗</span>; }

export default function DossierAwards() {
  const videoRef = useRef(null);
  const { seekTo } = useChapterVideo(videoRef);

  return (
    <article className="dossier-article">
      <header className="dossier-hero wrap">
        <div className="section-label"><span><b>DOSSIER</b> / GAMING</span><span>LECTURE LONGUE · 27 MIN</span></div>
        <div className="dossier-hero-copy">
          <p className="eyebrow"><span className="live-dot" /> Les choix de la rédaction</p>
          <h1>LES JEUX<br /><em>DE L’ANNÉE.</em></h1>
          <p className="dossier-dek">Les Let’s Play Awards 2025 passent en revue les jeux qui ont marqué l’année, de la prouesse technique à la surprise indépendante, jusqu’au choix du GOTY.</p>
          <div className="dossier-byline"><span>PAR LA RÉDACTION LET’S PLAY</span><span>09.01.2026</span></div>
        </div>
      </header>

      <section className="dossier-reading wrap">
        <div className="dossier-main-column">
          <div className="dossier-video hud-frame" ref={videoRef}>
            <iframe src={youTubeEmbedUrl(videoId)} title="Let’s Play Awards 2025 — Let’s Play Official" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          </div>
          <p className="dossier-video-note">Ce dossier accompagne l’épisode spécial des Let’s Play Awards 2025, une sélection éditoriale fondée sur les expériences et les tests de l’équipe en Algérie.</p>

          <div className="dossier-intro">
            <p className="dossier-kicker">LE SUJET</p>
            <p className="dossier-lead">2025 n’a pas été l’année d’un seul jeu. Elle a été une année de contrastes, où les grosses productions, les expériences narratives et les créations indépendantes ont chacune trouvé une manière de se distinguer.</p>
            <p>Dans cet épisode présenté par Chaft et Papou, Let’s Play revient sur les jeux qui ont retenu l’attention de la rédaction. Le classement ne cherche pas à reproduire mécaniquement les grandes cérémonies internationales : il assume un regard éditorial, nourri par ce que les jeux font ressentir et par la façon dont ils construisent leur identité.</p>
          </div>

          <div className="dossier-section-grid">
            <aside className="dossier-pullquote">« Un bon jeu de l’année ne gagne pas seulement une catégorie : il laisse une trace dans plusieurs conversations. »</aside>
            <div>
              <h2>UNE ANNÉE<br /><em>À PLUSIEURS VISAGES.</em></h2>
              <p>La sélection passe de la performance visuelle de <em>Death Stranding 2: On the Beach</em> à la narration plus terre-à-terre de <em>Kingdom Come: Deliverance II</em>. Elle s’intéresse aussi à la direction artistique singulière de <em>Clair Obscur: Expedition 33</em>, au concept de clones de <em>The Alters</em> et à l’atmosphère de <em>South of Midnight</em>.</p>
              <p>Cette diversité constitue le fil rouge de l’émission. Les catégories ne mesurent pas toutes la même chose, mais elles cherchent toutes le même résultat : identifier les jeux dont les choix créatifs sont immédiatement reconnaissables.</p>
            </div>
          </div>

          <div className="dossier-dark-panel">
            <p className="dossier-kicker">LES RÉCOMPENSES</p>
            <h2>DES TALENTS<br /><em>QUI S’AFFIRMENT.</em></h2>
            <p><em>Clair Obscur: Expedition 33</em> repart avec deux distinctions, pour sa direction artistique et sa musique. <em>Death Stranding 2</em> est récompensé pour sa claque visuelle avant de recevoir le prix du jeu de l’année. <em>Ghost of Yotei</em> est distingué dans l’action-aventure, tandis qu’<em>Arc Raiders</em> remporte le prix du multijoueur grâce aux alliances et aux trahisons qu’il fait naître entre joueurs.</p>
            <p>La cérémonie n’oublie pas les concepts plus risqués. <em>The Alters</em> est salué comme meilleur jeu indépendant pour son idée de survivre avec plusieurs versions de soi-même. <em>South of Midnight</em> devient la surprise de l’année avec son animation inspirée du stop-motion et son imaginaire sombre.</p>
          </div>

          <div className="dossier-section-grid dossier-section-grid-reverse">
            <div>
              <h2>LE GOTY<br /><em>COMME SYNTHÈSE.</em></h2>
              <p>Le choix final de <em>Death Stranding 2: On the Beach</em> repose sur sa régularité. Le jeu revient dans plusieurs discussions, par sa technologie, ses paysages, sa mise en scène et son ambition. Pour la rédaction, cette présence répétée finit par former un dossier solide en faveur du titre.</p>
              <p>L’émission évoque également le calendrier de <em>GTA VI</em> et son report au 19 décembre 2025. Sans le lancement du jeu le plus attendu de l’année au centre de la saison, d’autres productions ont eu davantage d’espace pour exister et être comparées.</p>
            </div>
            <aside className="dossier-stat-card"><strong>09</strong><span>CATÉGORIES POUR<br />RELIRE L’ANNÉE GAMING</span><b>TECHNIQUE · CRÉATION · EXPÉRIENCE</b></aside>
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
        <div><p className="eyebrow"><span className="live-dot" /> Le point de vue Let’s Play</p><h2>LE MEILLEUR<br /><em>N’A PAS UNE SEULE FORME.</em></h2></div>
        <p>Le palmarès rappelle qu’une année forte ne se résume pas à la puissance d’une franchise. Elle appartient aussi aux jeux qui prennent un risque, trouvent une voix et donnent envie de continuer la conversation après le générique.</p>
      </section>

      <section className="dossier-next wrap">
        <div><p className="dossier-kicker">LES AUTRES DOSSIERS</p><h2>POURSUIVEZ<br /><em>LA LECTURE.</em></h2></div>
        <Link className="button button-ghost" to="/dossiers">Retour aux dossiers <Arrow /></Link>
      </section>
    </article>
  );
}

// Source vidéo : https://youtu.be/0ThNyFItASM?si=c3c5hRV1yI_-u3GR
