import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { Arrow } from '../components/ReleasesCalendar';
import '../games/games.css';

/**
 * Page « Jeu » — la vitrine arcade de Let's Play.
 *
 * Ce n'est PAS la page d'un jeu : c'est la liste des jeux disponibles.
 * Mirage Rush et Vice City Rush sont jouables ; les cartes « bientôt »
 * réservent la place des prochains jeux.
 *
 * Pour ajouter un jeu : une entrée dans `GAMES` ci-dessous, et la route
 * correspondante dans src/main.jsx.
 */

// Miniature de Mirage Rush : key art façon western (JoJo's Steel Ball Run),
// posée dans /public/mirage-rush-thumb.jpg.
const MIRAGE_THUMB = `${import.meta.env.BASE_URL}mirage-rush-thumb.jpg`;
// Miniature de Vice City Rush.
const VICE_CITY_THUMB = `${import.meta.env.BASE_URL}vice-city-rush-keyart.jpg`;
// Miniature du prototype de RPG tour par tour : key art peinte
// (ville verticale, Astrolabe, désert qui monte), déclinée en 640×360.
const RPG_THUMB = `${import.meta.env.BASE_URL}sablier-de-bab-el-thumb.jpg`;

const GAMES = [
  {
    id: 'mirage-rush',
    title: 'MIRAGE RUSH',
    subtitle: '3D VOXEL RUNNER · WESTERN',
    description: 'Le désert se déforme, les cristaux t’appellent. Ruée contre la montre, duel contre l’Ombre, Coupe du Désert en trois courses ou rooms en ligne : quatre façons de faire parler ton cheval.',
    thumb: MIRAGE_THUMB,
    alt: 'Mirage Rush — cavalier de dos sur son cheval dans un désert de dunes, style western',
    route: '/jeu/mirage-rush',
    badge: 'JOUABLE',
    tone: 'desert',
    featured: true,
  },
  {
    id: 'vice-city-rush',
    title: 'VICE CITY RUSH',
    subtitle: '3D ARCADE RALLY · SUN & NEON',
    description: 'Une décapotable, un pilote et cinq circuits : Vice City en plein soleil sur le front de mer, puis New York, Tokyo, Paris et Londres de nuit. Ramasse des objets, déclenche tes pouvoirs et vise la première place — sans collision.',
    thumb: VICE_CITY_THUMB,
    alt: 'Vice City Rush — pilote et cabriolet corail sur Ocean Drive, illustration cinématographique entre palmiers et façades Art déco',
    route: '/jeu/vice-city-rush',
    badge: 'JOUABLE',
    tone: 'vice',
    featured: false,
  },
  {
    id: 'sablier-de-bab-el',
    title: 'LE SABLIER',
    subtitle: 'RPG TOUR PAR TOUR · PROTOTYPE',
    description: 'Une ville de neuf étages au-dessus d’un désert qui monte, et une horloge qui égrène les cycles. La démo ne contient qu’un combat — mais c’est le combat du jeu complet : tout est annoncé, rien ne dépend des réflexes. Garde, barrage, contre-élément, sable et étages.',
    thumb: RPG_THUMB,
    alt: 'Le Sablier — ville verticale de nuit sous un astrolabe doré, quatre silhouettes sur une passerelle face au sable qui monte',
    route: '/jeu/sablier-de-bab-el',
    badge: 'PROTOTYPE',
    tone: 'desert',
    featured: false,
  },
  {
    id: 'projet-03',
    title: 'PROJET 03',
    subtitle: 'PISTE À CREUSER',
    description: 'L’arcade va grandir. D’autres idées de formats courts mijotent — elles apparaîtront ici le jour où elles seront jouables.',
    thumb: null,
    alt: '',
    route: null,
    badge: 'BIENTÔT',
    tone: 'soon',
    featured: false,
  },
];

const HEAD = {
  fr: {
    eyebrow: 'LET’S PLAY ARCADE',
    h2a: 'LET’S PLAY',
    h2b: 'ARCADE.',
    intro: 'Quatre jeux dans la page : le western nerveux de Mirage Rush, les courses néon de Vice City Rush, le duel tactique du Sablier et les projets à venir.',
    play: 'JOUER',
    soon: 'BIENTÔT',
  },
  en: {
    eyebrow: 'LET’S PLAY ARCADE',
    h2a: 'LET’S PLAY',
    h2b: 'ARCADE.',
    intro: 'Four games on the page: Mirage Rush’s nervous western, Vice City Rush’s neon races, the tactical duel of Le Sablier, and upcoming projects.',
    play: 'PLAY',
    soon: 'SOON',
  },
  ar: {
    eyebrow: 'LET’S PLAY ARCADE',
    h2a: 'LET’S PLAY',
    h2b: 'ألعاب المنصة.',
    intro: 'ألعاب داخل الصفحة: أجواء الغرب في Mirage Rush، سباقات Vice City Rush الليلية، ومبارزة البطاقات الاستراتيجية Le Sablier ومشاريع قادمة.',
    play: 'العب',
    soon: 'قريباً',
  },
};

export default function Games() {
  const { lang } = useLanguage();
  const head = HEAD[lang] || HEAD.fr;

  return (
    <section className="games-page wrap" id="jeux">
      <div className="section-label">
        <span>{head.eyebrow}</span>
        <span>ALGERIA / GAMING</span>
      </div>

      <div className="featured-dossiers-head games-page-head">
        <div>
          <p className="eyebrow"><span className="live-dot" /> {head.eyebrow}</p>
          <h2>{head.h2a}<br /><em>{head.h2b}</em></h2>
          <p className="games-page-intro">{head.intro}</p>
        </div>
      </div>

      <div className="games-grid">
        {GAMES.map((game, index) => {
          const playable = Boolean(game.route);
          const card = (
            <>
              <div className="game-cartridge-header" aria-hidden="true">
                <span className="game-cartridge-grip" />
                <span>LET’S PLAY</span>
                <span className="game-cartridge-grip" />
              </div>
              <div className="game-cartridge-label">
                <div className="game-card-media">
                  {game.thumb ? (
                    <img
                      className="game-card-thumb"
                      src={game.thumb}
                      alt={game.alt}
                      loading={game.featured ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                  ) : (
                    <div className="game-card-blank" aria-hidden="true">
                      <span className="game-card-blank-icon">⧗</span>
                      <span className="game-card-blank-text">{head.soon}</span>
                    </div>
                  )}
                  <span className="game-card-badge">{game.badge}</span>
                  {playable && (
                    <span className="game-card-overlay">
                      <span className="game-card-play-btn">{head.play} <span aria-hidden="true">↗</span></span>
                    </span>
                  )}
                </div>
                <div className="game-card-copy">
                  <h3>{game.title}</h3>
                  <p className="game-card-subtitle">{game.subtitle}</p>
                  <span className="game-card-cta">
                    {playable ? <>{head.play} <Arrow /></> : <>{head.soon}</>}
                  </span>
                </div>
              </div>
              <div className="game-cartridge-footer" aria-hidden="true">
                <span className="game-cartridge-screw" />
                <span className="game-cartridge-serial">LP–{String(index + 1).padStart(3, '0')} · {playable ? '▼' : '—'}</span>
                <span className="game-cartridge-screw" />
              </div>
              <div className="game-cartridge-connector" aria-hidden="true" />
            </>
          );

          // La cartouche ne porte que l'étiquette (visuel, titre, sous-titre) ; la
          // description se lit en dessous, hors du boîtier.
          return (
            <article key={game.id} className="game-entry">
              <div
                className={`game-card game-card--${game.tone}${game.featured ? ' is-featured' : ''}${playable ? '' : ' is-locked'}`}
                data-shell={game.id}
              >
                {playable ? (
                  <Link className="game-card-link game-cartridge-front" to={game.route}>
                    <span className="sr-only">{game.title}</span>
                    {card}
                  </Link>
                ) : <div className="game-cartridge-front">{card}</div>}
              </div>
              <p className="game-card-desc">{game.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
