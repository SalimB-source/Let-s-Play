import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import useChapterVideo from '../lib/useChapterVideo';

const videoId = 't1Re8ki_gsw';
const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

const chapters = [
  ['00:00', 0, 'Introduction'],
  ['01:29', 89, 'Comment tout a commencé'],
  ['04:56', 296, 'Qui est El Joueur ?'],
  ['07:05', 425, 'Le gaming à travers les époques'],
  ['07:41', 461, 'L’accessibilité du jeu vidéo'],
  ['11:20', 680, 'Les jeux qui nous ont marqués'],
  ['16:14', 974, 'L’ère des mises à jour'],
  ['19:04', 1144, 'Graphismes ou gameplay ?'],
  ['21:06', 1266, 'Quelle est la meilleure époque ?'],
  ['24:31', 1471, 'Le hackathon Algérie Télécom'],
  ['25:50', 1550, 'Conclusion'],
];

function Arrow() { return <span aria-hidden="true">↗</span>; }

export default function DossierGenerations() {
  const videoRef = useRef(null);
  const { seekTo } = useChapterVideo(videoRef);

  return (
    <article className="dossier-article">
      <header className="dossier-hero wrap">
        <div className="section-label"><span><b>03 / DOSSIER</b> / CULTURE GAMING</span><span>ENTRETIEN · 27 MIN</span></div>
        <div className="dossier-hero-grid">
          <div>
            <p className="eyebrow"><span className="live-dot" /> Old school vs new school</p>
            <h1>LE CHOC<br /><em>DES GÉNÉRATIONS.</em></h1>
            <p className="dossier-dek">Avec Chaft et El Joueur, Let’s Play confronte deux façons de vivre le jeu vidéo : le souvenir des salles d’arcade et l’énergie des communautés en ligne.</p>
            <div className="dossier-byline"><span>PAR LA RÉDACTION LET’S PLAY</span><span>04.12.2025</span></div>
          </div>
          <a className="dossier-cover hud-frame" href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer" aria-label="Regarder l'interview Old School vs New School Gamers">
            <img src={thumbnail} alt="Old School vs New School Gamers" />
            <span className="dossier-play">▶</span>
            <span className="dossier-cover-caption">ÉPISODE 03 / OLD SCHOOL VS NEW SCHOOL</span>
          </a>
        </div>
      </header>

      <section className="dossier-reading wrap">
        <div className="dossier-main-column">
          <div className="dossier-video hud-frame" ref={videoRef}>
            <iframe src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`} title="Old School vs New School Gamers — Let’s Play Official" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          </div>
          <p className="dossier-video-note">Ce dossier accompagne l’entretien de Chaft avec El Joueur, créateur de contenu et témoin d’une génération passée de la console familiale aux communautés numériques.</p>

          <div className="dossier-intro">
            <p className="dossier-kicker">LE SUJET</p>
            <p className="dossier-lead">La question “quelle génération a connu la meilleure époque ?” ressemble à un débat de nostalgie. Elle révèle surtout que le jeu vidéo change avec les outils, les habitudes et les lieux où les joueurs se retrouvent.</p>
            <p>Dans cet épisode de <em>Journal du Geek</em>, Chaft et El Joueur remontent le fil de cette transformation. Leur conversation va des consoles Sega et Nintendo aux jeux mobiles, de la PS2 aux FPS compétitifs, puis des téléviseurs cathodiques à Discord.</p>
          </div>

          <div className="dossier-section-grid">
            <aside className="dossier-pullquote">« Chaque génération croit défendre ses jeux. En réalité, elle défend aussi le lieu et les personnes avec qui elle a joué. »</aside>
            <div>
              <h2>AVANT LE<br /><em>CHOC DES ÉPOQUES.</em></h2>
              <p>Le débat commence avec les anciennes rivalités entre Sega et Nintendo, puis avec l’opposition durable entre PC et consoles. À cette époque, le matériel impose davantage de limites et chaque machine possède une identité très marquée.</p>
              <p>Ces contraintes participent à la mémoire des joueurs. Elles rendent les choix techniques visibles et transforment les différences entre plateformes en véritables cultures de jeu.</p>
            </div>
          </div>

          <div className="dossier-dark-panel">
            <p className="dossier-kicker">L’ACCÈS AU JEU</p>
            <h2>DU SALON<br /><em>AU TÉLÉPHONE.</em></h2>
            <p>Pour El Joueur, l’arrivée de titres comme <em>Free Fire</em> et <em>PUBG</em> a changé l’accès au jeu vidéo en Algérie. Le téléphone ne remplace pas simplement la console : il permet à des joueurs qui n’auraient pas pu s’équiper de participer à une culture mondiale.</p>
            <p>Cette démocratisation déplace aussi les habitudes. Le jeu devient plus immédiat, plus connecté et souvent plus dépendant d’un service qui évolue après sa sortie. L’accessibilité progresse, mais la relation au produit change.</p>
          </div>

          <div className="dossier-section-grid dossier-section-grid-reverse">
            <div>
              <h2>LES JEUX<br /><em>QUI FORMENT.</em></h2>
              <p>El Joueur raconte ses débuts sur PS2, autour de 2005-2006, et l’influence de <em>Sly Cooper</em>. Les images d’archives de ses premières vidéos montrent ensuite comment une passion de joueur peut devenir une pratique de créateur.</p>
              <p>Le parcours passe aussi par <em>Counter-Strike 1.6</em> et <em>Half-Life</em>, par les salles d’arcade et par les jeux qui ont marqué l’enfance : <em>Sonic</em>, <em>Aladdin</em> ou <em>Donkey Kong Country</em>. Les références diffèrent, mais chaque époque possède ses jeux-formateurs.</p>
            </div>
            <aside className="dossier-stat-card"><strong>11</strong><span>CHAPITRES POUR<br />TRAVERSER LES ÉPOQUES</span><b>ARCADE · CRÉATION · COMMUNAUTÉ</b></aside>
          </div>

          <div className="dossier-section-grid">
            <aside className="dossier-pullquote">« Le gameplay garde une idée en vie plus longtemps que la nouveauté d’un rendu. »</aside>
            <div>
              <h2>GAMEPLAY<br /><em>CONTRE IMAGE.</em></h2>
              <p>Le débat sur les graphismes oppose moins deux générations qu’il ne pose une question de durée. Un jeu peut impressionner au lancement, mais ce sont ses mécaniques qui déterminent souvent l’envie d’y revenir.</p>
              <p>L’épisode critique également l’ère des sorties incomplètes et des mises à jour du premier jour. Les anciens jeux pouvaient être imparfaits, mais ils étaient livrés comme des objets finis. Les jeux modernes peuvent corriger davantage de problèmes, au prix d’une expérience plus évolutive et moins définitive.</p>
            </div>
          </div>

          <div className="dossier-dark-panel">
            <p className="dossier-kicker">LE TROISIÈME LIEU</p>
            <h2>JOUER<br /><em>ENSEMBLE.</em></h2>
            <p>Les salles d’arcade, les salons et les parties locales ont longtemps servi de lieux de rencontre. Aujourd’hui, Discord et les espaces numériques remplissent une fonction comparable : ils permettent de rester ensemble, même lorsque les joueurs ne partagent plus la même pièce.</p>
            <p>La technologie a donc déplacé la communauté sans la supprimer. La nostalgie porte sur les écrans et les manettes, mais aussi sur une forme de présence sociale que chaque génération réinvente.</p>
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
        <div><p className="eyebrow"><span className="live-dot" /> Le point de vue Let’s Play</p><h2>IL N’Y A PAS<br /><em>QU’UNE BONNE ÉPOQUE.</em></h2></div>
        <p>Les générations ne s’annulent pas. Elles ajoutent des façons de jouer, de créer et de se retrouver. Le meilleur héritage du gaming est peut-être cette capacité à faire coexister le souvenir d’un CRT et la conversation d’un serveur Discord.</p>
      </section>

      <section className="dossier-next wrap">
        <div><p className="dossier-kicker">LES AUTRES DOSSIERS</p><h2>POURSUIVEZ<br /><em>LA LECTURE.</em></h2></div>
        <Link className="button button-ghost" to="/dossiers">Retour aux dossiers <Arrow /></Link>
      </section>
    </article>
  );
}

// Source vidéo : https://youtu.be/t1Re8ki_gsw?si=n5VGzOo5AM1fVXFJ
