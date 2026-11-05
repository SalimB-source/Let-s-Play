import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { RELEASES, dansUneCoque, useTextesTelechargement } from './gamesTelechargements.js';
import '../games/games.css';

// Chaque disque conserve la route et l'illustration du jeu correspondant.
// `telechargements` : les applications publiées pour ce jeu (voir
// `./gamesTelechargements.js`). Un jeu sans coque n'a rien ici — la rangée de
// boutons disparaît alors, au lieu d'afficher des liens morts.
const GAMES = [
  { id: 'mirage-rush', title: 'MIRAGE RUSH', thumb: 'mirage-rush-thumb.jpg', route: '/jeu/mirage-rush' },
  {
    id: 'vice-city-rush',
    title: 'VICE CITY RUSH',
    thumb: 'vice-city-rush-keyart.jpg',
    route: '/jeu/vice-city-rush',
    telechargements: RELEASES.viceCity,
  },
  {
    id: 'sablier-de-bab-el',
    title: 'LE SABLIER',
    thumb: 'sablier-de-bab-el-thumb.jpg',
    route: '/jeu/sablier-de-bab-el',
    telechargements: RELEASES.sablier,
  },
  { id: 'projet-03', title: 'PROJET 03', thumb: null, route: null },
];

const HEAD = {
  fr: { eyebrow: 'LET’S PLAY ARCADE', h2a: 'LET’S PLAY', h2b: 'ARCADE.', play: 'JOUER', soon: 'BIENTÔT', playLabel: 'Jouer à' },
  en: { eyebrow: 'LET’S PLAY ARCADE', h2a: 'LET’S PLAY', h2b: 'ARCADE.', play: 'PLAY', soon: 'SOON', playLabel: 'Play' },
  ar: { eyebrow: 'LET’S PLAY ARCADE', h2a: 'LET’S PLAY', h2b: 'ألعاب المنصة.', play: 'العب', soon: 'قريباً', playLabel: 'العب' },
};

/**
 * Rangée de téléchargements d'un jeu : Windows et Android. Masquée dans une
 * coque (`dansUneCoque`) — on est déjà dans l'application, et les liens en
 * sortiraient —, et absente pour un jeu qui n'a pas encore d'application.
 */
function TelechargementsJeu({ liens, textes, jeu }) {
  return (
    <div className="game-downloads" aria-label={`${textes.titre} — ${textes.windows} / ${textes.android}`}>
      <a className="game-download game-download--windows" href={liens.windows} rel="noopener" title={textes.aideWindows}>
        <span className="game-download__os" aria-hidden="true">⊞</span>
        <span className="game-download__nom">{textes.windows}<small>{textes.exe}</small></span>
      </a>
      <a className="game-download game-download--android" href={liens.apk} rel="noopener" title={textes.aideAndroid} aria-label={`${textes.telechargerApk} — ${jeu}`}>
        <span className="game-download__os" aria-hidden="true">▲</span>
        <span className="game-download__nom"><span className="game-download__android-court">{textes.android}<small>{textes.apk}</small></span><span className="game-download__android-mobile">{textes.telechargerApk}</span></span>
      </a>
    </div>
  );
}

export default function Games() {
  const { lang } = useLanguage();
  const head = HEAD[lang] || HEAD.fr;
  const textes = useTextesTelechargement();
  // Dans l'exe ou l'APK, proposer de télécharger l'application qu'on utilise
  // n'aurait aucun sens (et le lien sortirait de la coque).
  const montreTelechargements = !dansUneCoque();

  return (
    <section className="games-page wrap" id="jeux">
      <div className="section-label"><span>{head.eyebrow}</span><span>ALGERIA / GAMING</span></div>
      <div className="featured-dossiers-head games-page-head">
        <div>
          <p className="eyebrow"><span className="live-dot" /> {head.eyebrow}</p>
          <h2>{head.h2a}<br /><em>{head.h2b}</em></h2>
        </div>
      </div>

      <div className="games-grid">
        {GAMES.map((game, index) => {
          const contenu = (
            <>
              <div className="game-disc-stage" aria-hidden="true">
                <div className="game-disc">
                  {game.thumb && <img className="game-disc__art" src={`${import.meta.env.BASE_URL}${game.thumb}`} alt="" loading={index === 0 ? 'eager' : 'lazy'} decoding="async" />}
                  {!game.thumb && <span className="game-disc__blank">LP<span>✦</span>03</span>}
                  <span className="game-disc__sheen" />
                  <span className="game-disc__ring" />
                  <span className="game-disc__hole" />
                  <span className="game-disc__serial">LET’S PLAY · {String(index + 1).padStart(2, '0')}</span>
                </div>
              </div>
              <h3 className="game-disc-title">{game.title}</h3>
              <span className="game-disc-status">{game.route ? head.play : head.soon}{game.route && <span aria-hidden="true"> ↗</span>}</span>
            </>
          );
          return (
            <article key={game.id} className={`game-entry${game.route ? '' : ' is-locked'}`} data-game={game.id}>
              {game.route
                ? <Link className="game-disc-link" to={game.route} aria-label={`${head.playLabel} ${game.title}`}>{contenu}</Link>
                : <div className="game-disc-link">{contenu}</div>}
              {/* Hors du lien : un <a> ne peut pas en contenir un autre, et un
                  clic sur « Windows » doit télécharger, pas ouvrir le jeu. */}
              {montreTelechargements && game.telechargements && (
                <TelechargementsJeu liens={game.telechargements} textes={textes} jeu={game.title} />
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
