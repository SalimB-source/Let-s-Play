import React from 'react';

// La borne : les cartouches libres présentées comme des boîtes NES
// (bandeau de collection, fenêtre d'illustration, titre, pastilles). Au
// survol, l'illustration laisse place à une vraie capture du jeu.

function JacketCard({ game, current, loading, onPlay }) {
  const title = game.shortTitle || game.title;
  return (
    <li className={`nes-cart${current ? ' is-current' : ''}`} style={{ '--game-accent': game.accent }}>
      <button
        type="button"
        className="nes-cart-box"
        onClick={() => onPlay(game)}
        disabled={loading}
        aria-label={`Jouer à ${game.title} — ${game.genre}, ${game.players}`}
      >
        <span className="nes-cart-band" aria-hidden="true">
          <b>LET’S PLAY</b>
          <span>ARCADE SERIES</span>
        </span>
        <span className="nes-cart-art">
          <img className="nes-cart-cover" src={game.cover} alt="" loading="lazy" width="600" height="804" />
          <img className="nes-cart-shot" src={game.screenshots[1]} alt="" loading="lazy" width="256" height="240" />
          <span className="nes-cart-play" aria-hidden="true">{loading ? 'CHARGEMENT…' : current ? 'EN COURS ●' : 'JOUER ▶'}</span>
        </span>
        <span className="nes-cart-title">{title}</span>
        <span className="nes-cart-tags" aria-hidden="true">
          <span>{game.genre}</span>
          <span>{game.players}</span>
        </span>
      </button>
      <p className="nes-cart-meta">
        <b>{game.developer}</b> · {game.year} · {game.license}
      </p>
    </li>
  );
}

export default function GameShelf({ games, currentSlug, loadingSlug, onPlay }) {
  return (
    <section className="nes-shelf" id="borne" aria-labelledby="nes-shelf-title">
      <div className="nes-shelf-head">
        <div>
          <p className="eyebrow"><span className="live-dot" /> LA BORNE · {games.length} CARTOUCHES</p>
          <h2 id="nes-shelf-title">CHOISIS TA <em>CARTOUCHE.</em></h2>
        </div>
        <p>Des jeux NES indépendants et libres, jouables tout de suite. Clique sur une jaquette pour l’insérer dans la console.</p>
      </div>
      <ul className="nes-shelf-grid">
        {games.map((game) => (
          <JacketCard
            key={game.slug}
            game={game}
            current={currentSlug === game.slug}
            loading={loadingSlug === game.slug}
            onPlay={onPlay}
          />
        ))}
      </ul>
    </section>
  );
}
