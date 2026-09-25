import React from 'react';
import { Link } from 'react-router-dom';
import { NES_CATALOG } from './nes/catalog';
import { MD_CATALOG, MD_PLAYABLE } from './megadrive/catalog';
import './games-hub.css';

const BASE = import.meta.env.BASE_URL;

const GAMES = [
  {
    to: '/games/nes',
    num: '01',
    kicker: 'ÉMULATEUR · 8-BIT',
    title: 'Retro NES',
    text: `${NES_CATALOG.length} cartouches libres à lancer en un clic — Thwaite, RHDE, 2048… — plus tes propres ROMs, sauvegardes, manettes et contrôles tactiles.`,
    cta: 'ALLUMER LA CONSOLE',
    accent: 'is-red',
    jackets: NES_CATALOG.slice(0, 3),
  },
  {
    to: '/games/megadrive',
    num: '02',
    kicker: 'ÉMULATEUR · 16-BIT',
    title: 'Retro Mega Drive',
    text: `Oh Mummy Genesis et d’autres homebrews offerts par leurs auteurs${MD_PLAYABLE.length > 1 ? ` (${MD_PLAYABLE.length} jouables)` : ''}, plus tes propres ROMs, sauvegardes, manettes et contrôles tactiles.`,
    cta: 'SOUFFLER DANS LA CARTOUCHE',
    accent: 'is-blue',
    jackets: MD_CATALOG.filter((game) => !game.external).slice(0, 3),
  },
  {
    to: '/games/pixel-runner',
    num: '03',
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
          <p>Trois bornes, zéro installation : tout tourne directement dans ton navigateur.</p>
        </div>
        <div className="games-hub-grid">
          {GAMES.map((game) => (
            <Link key={game.to} to={game.to} className={`games-hub-card ${game.accent}`}>
              <div className="games-hub-visual" style={game.image ? { backgroundImage: `url(${game.image})` } : undefined}>
                {game.jackets && (
                  <div className="games-hub-jackets" aria-hidden="true">
                    {game.jackets.map((jacket) => (
                      <img key={jacket.slug} src={jacket.cover} alt="" loading="lazy" width="600" height="804" />
                    ))}
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
