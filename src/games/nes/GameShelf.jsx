import React from 'react';

// La borne : les cartouches présentées comme des boîtes de jeu (bandeau de
// collection, fenêtre d'illustration, titre, pastilles). Au survol,
// l'illustration laisse place à une vraie capture du jeu quand on en a une.
//
// Trois sortes de cartouches :
//  - jouable        → clic = insertion dans la console ;
//  - `pending`      → licence vérifiée, fichier pas encore déposé : « Bientôt » ;
//  - `external`     → pas de droit de redistribution : lien vers la page de
//                     l'auteur, qui l'offre lui-même (« Jouer chez l'auteur »).

function CartArt({ game, label }) {
  const shot = game.screenshots?.[1];
  return (
    <span className={`nes-cart-art${shot ? '' : ' no-shot'}`}>
      <img className="nes-cart-cover" src={game.cover} alt="" loading="lazy" width="600" height="804" />
      {shot && <img className="nes-cart-shot" src={shot} alt="" loading="lazy" width="256" height="240" />}
      <span className="nes-cart-play" aria-hidden="true">{label}</span>
    </span>
  );
}

function JacketCard({ game, current, loading, onPlay, band }) {
  const title = game.shortTitle || game.title;
  const inner = (label) => (
    <>
      <span className="nes-cart-band" aria-hidden="true">
        <b>{band[0]}</b>
        <span>{game.external ? 'CHEZ L’AUTEUR' : band[1]}</span>
      </span>
      <CartArt game={game} label={label} />
      <span className="nes-cart-title">{title}</span>
      <span className="nes-cart-tags" aria-hidden="true">
        <span>{game.genre}</span>
        <span>{game.players}</span>
      </span>
    </>
  );

  let box;
  if (game.external) {
    box = (
      <a
        className="nes-cart-box"
        href={game.externalUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`${game.title} — jouer sur la page de ${game.developer} (nouvel onglet)`}
      >
        {inner('JOUER ↗')}
      </a>
    );
  } else if (game.pending) {
    box = (
      <button type="button" className="nes-cart-box" disabled aria-label={`${game.title} — bientôt disponible`}>
        {inner('BIENTÔT')}
      </button>
    );
  } else {
    box = (
      <button
        type="button"
        className="nes-cart-box"
        onClick={() => onPlay(game)}
        disabled={loading}
        aria-label={`Jouer à ${game.title} — ${game.genre}, ${game.players}`}
      >
        {inner(loading ? 'CHARGEMENT…' : current ? 'EN COURS ●' : 'JOUER ▶')}
      </button>
    );
  }

  const classes = ['nes-cart'];
  if (current) classes.push('is-current');
  if (game.external) classes.push('is-external');
  if (game.pending) classes.push('is-pending');

  return (
    <li className={classes.join(' ')} style={{ '--game-accent': game.accent }}>
      {box}
      <p className="nes-cart-meta">
        <b>{game.developer}</b> · {game.year} · {game.external ? game.externalReason : game.license}
      </p>
    </li>
  );
}

export default function GameShelf({
  games,
  currentSlug,
  loadingSlug,
  onPlay,
  band = ['LET’S PLAY', 'ARCADE SERIES'],
  eyebrow,
  heading = <>CHOISIS TA <em>CARTOUCHE.</em></>,
  intro = 'Des jeux NES indépendants et libres, jouables tout de suite. Clique sur une jaquette pour l’insérer dans la console.',
}) {
  const playable = games.filter((game) => !game.external);
  const external = games.filter((game) => game.external);
  const renderCard = (game) => (
    <JacketCard
      key={game.slug}
      game={game}
      band={band}
      current={currentSlug === game.slug}
      loading={loadingSlug === game.slug}
      onPlay={onPlay}
    />
  );

  return (
    <section className="nes-shelf" id="borne" aria-labelledby="nes-shelf-title">
      <div className="nes-shelf-head">
        <div>
          <p className="eyebrow"><span className="live-dot" /> {eyebrow || `LA BORNE · ${playable.length} CARTOUCHES`}</p>
          <h2 id="nes-shelf-title">{heading}</h2>
        </div>
        <p>{intro}</p>
      </div>
      <ul className="nes-shelf-grid">{playable.map(renderCard)}</ul>
      {external.length > 0 && (
        <>
          <div className="nes-shelf-subhead">
            <h3>À découvrir chez leurs auteurs</h3>
            <p>
              Ces jeux sont gratuits, mais leurs auteurs n’autorisent pas (ou pas explicitement) leur diffusion
              ailleurs que chez eux. On te les recommande quand même : un clic t’emmène sur leur page officielle.
            </p>
          </div>
          <ul className="nes-shelf-grid is-external">{external.map(renderCard)}</ul>
        </>
      )}
    </section>
  );
}
