import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import useChapterVideo from '../lib/useChapterVideo';
import { youTubeEmbedUrl } from '../lib/videoPlayback';

const videoId = '8NqnTzVh5O0';

const chapters = [
  ['00:00', 0, 'Introduction'],
  ['01:10', 70, 'La première bataille de Microsoft'],
  ['01:34', 94, 'La stratégie Xbox 360'],
  ['02:14', 134, 'Le hardware'],
  ['04:50', 290, 'Les jeux légendaires'],
  ['08:10', 490, 'Xbox Live'],
  ['10:15', 615, 'Kinect'],
  ['12:31', 751, 'Le Red Ring of Death'],
  ['16:04', 964, 'L’héritage de la Xbox 360'],
  ['18:53', 1133, 'Le modem XGS-PON'],
  ['20:37', 1237, 'Conclusion'],
];

function Arrow() { return <span aria-hidden="true">↗</span>; }

export default function DossierXbox360() {
  const videoRef = useRef(null);
  const { seekTo } = useChapterVideo(videoRef);

  return (
    <article className="dossier-article">
      <header className="dossier-hero wrap">
        <div className="section-label"><span><b>DOSSIER</b> / HISTOIRE DU GAMING</span><span>RÉTROSPECTIVE · 21 MIN</span></div>
        <div className="dossier-hero-copy">
          <p className="eyebrow"><span className="live-dot" /> 20 ans de Xbox 360</p>
          <h1>XBOX 360,<br /><em>UNE GÉNÉRATION.</em></h1>
          <p className="dossier-dek">Retour sur la Xbox 360, la machine qui a installé la haute définition dans les salons, transformé le jeu en ligne et marqué l’ère HD malgré le traumatisme du Red Ring of Death.</p>
          <div className="dossier-byline"><span>PAR LA RÉDACTION LET’S PLAY</span><span>27.11.2025</span></div>
        </div>
      </header>

      <section className="dossier-reading wrap">
        <div className="dossier-main-column">
          <div className="dossier-video hud-frame" ref={videoRef}>
            <iframe src={youTubeEmbedUrl(videoId)} title="20 سنة على Xbox 360: الأسطورة لي بدّلت عالم الألعاب — Let’s Play Official" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          </div>
          <p className="dossier-video-note">Ce dossier accompagne l’épisode de <em>Journal du Geek</em> consacré aux vingt ans de la Xbox 360, avec Chaft et Rami.</p>

          <div className="dossier-intro">
            <p className="dossier-kicker">LE SUJET</p>
            <p className="dossier-lead">La Xbox 360 n’a pas gagné sa génération par la puissance seule. Elle a changé le rythme de l’industrie, la place du jeu en ligne et la manière dont une console pouvait devenir un service.</p>
            <p>Dans cet épisode, Chaft et Rami reviennent sur le lancement de 2005, arrivé un an avant celui de la PlayStation 3. Ils racontent une machine pensée pour prendre de vitesse Sony, installer le HD dans les foyers et faire de Xbox Live le centre d’une nouvelle expérience connectée.</p>
          </div>

          <div className="dossier-section-grid">
            <aside className="dossier-pullquote">« La Xbox 360 a transformé la console en plateforme : un appareil, un compte, une communauté et des jeux qui continuent d’évoluer. »</aside>
            <div>
              <h2>PRENDRE<br /><em>DE L’AVANCE.</em></h2>
              <p>Microsoft arrive dans cette génération avec le souvenir d’une première Xbox encore loin de la domination de la PS2. La stratégie de la 360 consiste à agir tôt, à proposer la haute définition et à rendre immédiatement visible la différence entre l’ancienne génération et la nouvelle.</p>
              <p>Le pari est industriel autant que culturel. La console doit devenir le lieu où l’on joue, mais aussi celui où l’on se connecte, télécharge, discute et construit un profil de joueur.</p>
            </div>
          </div>

          <div className="dossier-dark-panel">
            <p className="dossier-kicker">LE HARDWARE</p>
            <h2>UNE MANETTE<br /><em>QUI S’IMPOSE.</em></h2>
            <p>La manette Xbox 360 installe ses sticks asymétriques comme une référence durable. Son ergonomie devient un repère pour les joueurs console et influence aussi de nombreux accessoires destinés au PC.</p>
            <p>L’épisode évoque également le passage du modèle Fat à la Slim et l’évolution du stockage, de capacités modestes aux disques durs plus confortables. La machine change de forme, mais conserve une identité immédiatement reconnaissable.</p>
          </div>

          <div className="dossier-section-grid dossier-section-grid-reverse">
            <div>
              <h2>UNE BIBLIOTHÈQUE<br /><em>QUI DÉBORDE.</em></h2>
              <p>La force de la Xbox 360 passe par ses jeux. Les grands portages de <em>Battlefield 3</em>, <em>Red Dead Redemption</em> et <em>GTA V</em> côtoient les phénomènes maison comme <em>Halo 3</em> et <em>Gears of War</em>.</p>
              <p><em>Fable</em>, <em>Forza</em>, <em>Skyrim</em>, <em>Call of Duty</em> et de nombreuses productions tierces donnent à la console une bibliothèque capable de toucher plusieurs publics. C’est aussi l’époque où les exclusivités et les jeux multiplateformes se livrent une bataille particulièrement visible.</p>
            </div>
            <aside className="dossier-stat-card"><strong>11</strong><span>CHAPITRES POUR<br />RACONTER L’ÈRE HD</span><b>HARDWARE · JEUX · SERVICES</b></aside>
          </div>

          <div className="dossier-section-grid">
            <aside className="dossier-pullquote">« Avec Xbox Live, la partie ne s’arrête plus lorsque le disque quitte la console. »</aside>
            <div>
              <h2>JOUER<br /><em>EN RÉSEAU.</em></h2>
              <p>Xbox Live donne une structure à la pratique en ligne. Les profils, les succès, les amis et les téléchargements créent un environnement persistant autour des jeux. Xbox Live Arcade ouvre en parallèle un espace pour des expériences plus courtes et des productions indépendantes comme <em>Limbo</em>.</p>
              <p>Les Avatars et l’interface participent à cette idée d’une console qui devient un espace social. La Xbox 360 prépare ainsi les services qui définiront les générations suivantes.</p>
            </div>
          </div>

          <div className="dossier-dark-panel">
            <p className="dossier-kicker">L’INNOVATION ET LA CRISE</p>
            <h2>KINECT,<br /><em>PUIS LES PANNES.</em></h2>
            <p>Kinect promet de faire du joueur la manette. Son lancement rencontre un succès commercial important, avec une expérience pensée pour élargir le public et rendre le mouvement visible dans le salon. Mais l’effet de nouveauté ne suffit pas à maintenir la même dynamique sur la durée.</p>
            <p>Le Red Ring of Death reste l’ombre de la génération. Les premières machines souffrent de problèmes de surchauffe et de fiabilité qui obligent Microsoft à investir massivement dans les réparations et les garanties. La crise abîme l’image de la console sans effacer ce qu’elle a apporté à l’industrie.</p>
          </div>

          <div className="dossier-section-grid dossier-section-grid-reverse">
            <div>
              <h2>UN HÉRITAGE<br /><em>TOUJOURS ACTIF.</em></h2>
              <p>Avec environ 86 millions de consoles vendues face à une PlayStation 3 autour de 87 millions, la Xbox 360 termine sa génération au coude-à-coude avec Sony. Son influence se mesure pourtant au-delà des chiffres.</p>
              <p>La console a normalisé le jeu connecté, les succès, les services numériques et les interfaces de communauté. Pour la rédaction, elle reste la console la plus marquante de l’ère HD : imparfaite, mais décisive.</p>
            </div>
            <aside className="dossier-stat-card"><strong>20</strong><span>ANS D’UNE CONSOLE<br />QUI A CHANGÉ LES RÈGLES</span><b>MICROSOFT · XBOX LIVE · HD</b></aside>
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
        <div><p className="eyebrow"><span className="live-dot" /> Le point de vue Let’s Play</p><h2>UNE CONSOLE<br /><em>QUI A LAISSÉ SA TRACE.</em></h2></div>
        <p>La Xbox 360 a connu le succès, l’innovation et une crise technique historique. Son héritage tient dans cette combinaison : une manette devenue standard, des jeux mémorables et la première vraie sensation d’un salon connecté.</p>
      </section>

      <section className="dossier-next wrap">
        <div><p className="dossier-kicker">LES AUTRES DOSSIERS</p><h2>POURSUIVEZ<br /><em>LA LECTURE.</em></h2></div>
        <Link className="button button-ghost" to="/dossiers">Retour aux dossiers <Arrow /></Link>
      </section>
    </article>
  );
}

// Source vidéo : https://youtu.be/8NqnTzVh5O0?si=zf1BbKSvj18wDkNe
