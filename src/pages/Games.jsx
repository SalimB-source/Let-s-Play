import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import '../games/games.css';

// Chaque disque conserve la route et l'illustration du jeu correspondant.
const GAMES = [
  { id: 'mirage-rush', title: 'MIRAGE RUSH', thumb: 'mirage-rush-thumb.jpg', route: '/jeu/mirage-rush' },
  { id: 'vice-city-rush', title: 'VICE CITY RUSH', thumb: 'vice-city-rush-keyart.jpg', route: '/jeu/vice-city-rush' },
  { id: 'sablier-de-bab-el', title: 'LE SABLIER', thumb: 'sablier-de-bab-el-thumb.jpg', route: '/jeu/sablier-de-bab-el' },
  { id: 'projet-03', title: 'PROJET 03', thumb: null, route: null },
];

const HEAD = {
  fr: { eyebrow: 'LET’S PLAY ARCADE', h2a: 'LET’S PLAY', h2b: 'ARCADE.', play: 'JOUER', soon: 'BIENTÔT', playLabel: 'Jouer à' },
  en: { eyebrow: 'LET’S PLAY ARCADE', h2a: 'LET’S PLAY', h2b: 'ARCADE.', play: 'PLAY', soon: 'SOON', playLabel: 'Play' },
  ar: { eyebrow: 'LET’S PLAY ARCADE', h2a: 'LET’S PLAY', h2b: 'ألعاب المنصة.', play: 'العب', soon: 'قريباً', playLabel: 'العب' },
};

export default function Games() {
  const { lang } = useLanguage();
  const head = HEAD[lang] || HEAD.fr;

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
            </article>
          );
        })}
      </div>
    </section>
  );
}
