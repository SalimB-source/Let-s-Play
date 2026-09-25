import React from 'react';
import { Link } from 'react-router-dom';
import './games-hub.css';

const BASE = import.meta.env.BASE_URL;

const GAMES = [
  {
    to: '/games/nes',
    num: '01',
    kicker: 'ÉMULATEUR · 8-BIT',
    title: 'Retro NES',
    text: 'La console 8-bit de Nintendo dans ton navigateur : démo gratuite, tes propres ROMs, sauvegardes, manette et contrôles tactiles.',
    cta: 'ALLUMER LA CONSOLE',
    accent: 'is-red',
  },
  {
    to: '/games/pixel-runner',
    num: '02',
    kicker: 'ARCADE · LET’S PLAY ORIGINAL',
    title: 'Pixel Runner',
    text: 'Cours, saute et bats ton record dans la ville néon de Let’s Play. Clavier ou tactile, une partie dure une minute.',
    cta: 'LANCER UN RUN',
    accent: 'is-cyan',
    image: `${BASE}pixel-runner-bg.jpg`,
  },
];

export default function GamesHub() {
  return (
    <main className="games-hub-page">
      <section className="games-hub wrap">
        <div className="section-label"><span>GAMES / ARCADE</span><span>LET’S PLAY</span></div>
        <div className="games-hub-heading">
          <p className="eyebrow"><span className="live-dot" /> SALLE D’ARCADE</p>
          <h1>ON <em>JOUE ?</em></h1>
          <p>Deux bornes, zéro installation : tout tourne directement dans ton navigateur.</p>
        </div>
        <div className="games-hub-grid">
          {GAMES.map((game) => (
            <Link key={game.to} to={game.to} className={`games-hub-card ${game.accent}`}>
              <div className="games-hub-visual" style={game.image ? { backgroundImage: `url(${game.image})` } : undefined}>
                {!game.image && (
                  <div className="games-hub-pad" aria-hidden="true">
                    <span className="dpad" />
                    <span className="meta" />
                    <span className="ab"><i /><i /></span>
                  </div>
                )}
                <span className="games-hub-num">{game.num}</span>
              </div>
              <div className="games-hub-copy">
                <p className="eyebrow">{game.kicker}</p>
                <h2>{game.title}</h2>
                <p>{game.text}</p>
                <span className="games-hub-cta">{game.cta} ↗</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
