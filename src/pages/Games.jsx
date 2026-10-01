import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { Arrow } from '../components/ReleasesCalendar';
import '../games/games.css';

/**
 * Page « Jeu » — la vitrine arcade de Let's Play.
 *
 * Ce n'est PAS la page d'un jeu : c'est la liste des jeux disponibles.
 * Mirage Rush en est un (le premier, donc le plus mis en avant), les autres
 * arrivent au fur et à mesure — les cartes « bientôt » réservent leur place.
 *
 * Pour ajouter un jeu : une entrée dans `GAMES` ci-dessous, et la route
 * correspondante dans src/main.jsx.
 */

// Miniature de Mirage Rush : key art façon western (JoJo's Steel Ball Run),
// posée dans /public/mirage-rush-thumb.jpg.
const MIRAGE_THUMB = `${import.meta.env.BASE_URL}mirage-rush-thumb.jpg`;
// Miniature de La Cendre : key art dark fantasy générée pour le playtest M0.
const CENDRE_THUMB = `${import.meta.env.BASE_URL}la-cendre-thumb.jpg`;

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
    tags: ['ARCADE', 'SOLO', 'DUEL', 'COUPE', 'EN LIGNE'],
  },
  {
    id: 'la-cendre',
    title: 'LA CENDRE',
    subtitle: 'SOULSLIKE · DARK FANTASY',
    description: 'Le feu de cendres s’est éteint. Un chevalier sans nom traverse la Cour du Seuil : caméra d’épaule, collisions, ambiance clair-obscur. Playtest M0 — le combat arrive en M1.',
    thumb: CENDRE_THUMB,
    alt: 'La Cendre — chevalier d’armure sombre devant un feu de cendres dans une cour de pierre, ambiance dark fantasy',
    route: '/jeu/la-cendre',
    badge: 'M0 · JOUABLE',
    tone: 'ember',
    featured: false,
    tags: ['SOULSLIKE', 'SOLO', '3D', 'WIP'],
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
    tags: ['À VENIR'],
  },
];

const HEAD = {
  fr: {
    eyebrow: 'LET’S PLAY ARCADE',
    h2a: 'LES JEUX',
    h2b: 'DE LA MAISON.',
    intro: 'Des formats courts, jouables directement dans la page. Un désert, une ruée, un duel : Mirage Rush ouvre la voie, d’autres suivent.',
    play: 'JOUER',
    soon: 'BIENTÔT',
  },
  en: {
    eyebrow: 'LET’S PLAY ARCADE',
    h2a: 'THE GAMES',
    h2b: 'WE BUILD.',
    intro: 'Short formats, playable right inside the page. One desert, one rush, one duel: Mirage Rush leads the way, others will follow.',
    play: 'PLAY',
    soon: 'SOON',
  },
  ar: {
    eyebrow: 'LET’S PLAY ARCADE',
    h2a: 'ألعاب',
    h2b: 'المنصة.',
    intro: 'أشكال قصيرة تُلعب مباشرة داخل الصفحة. صحراء واحدة، سباق واحد، مبارزة واحدة: Mirage Rush يفتح الطريق، وأخرى ستتبعه.',
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
        {GAMES.map((game) => {
          const playable = Boolean(game.route);
          const card = (
            <>
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
                <p className="game-card-desc">{game.description}</p>
                <div className="game-card-tags">
                  {game.tags.map((tag) => (
                    <span className="game-card-tag" key={tag}>{tag}</span>
                  ))}
                </div>
                <span className="game-card-cta">
                  {playable ? <>{head.play} <Arrow /></> : <>{head.soon}</>}
                </span>
              </div>
            </>
          );

          return (
            <article
              key={game.id}
              className={`game-card game-card--${game.tone}${game.featured ? ' is-featured' : ''}${playable ? '' : ' is-locked'}`}
            >
              {playable ? (
                <Link className="game-card-link" to={game.route}>
                  <span className="sr-only">{game.title}</span>
                  {card}
                </Link>
              ) : card}
            </article>
          );
        })}
      </div>
    </section>
  );
}