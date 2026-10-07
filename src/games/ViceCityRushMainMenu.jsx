// Écran-titre de Vice City Rush — le menu principal inspiré de celui de
// Need for Speed : Most Wanted (2005) : la voiture du joueur en décor plein
// cadre (photo statique, aucune scène 3D), logo griffé en haut, carrousel de
// modes cerisé de jaune en bas, éclats d'encre grunge et barre de raccourcis
// clavier. Toute la navigation existe au clavier, à la souris et au tactile.
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isFullscreenShortcut } from './gameFullscreen';
import './vice-city-rush-menu.css';

const MENU_ENTRIES = [
  { id: 'story', label: 'HISTOIRE' },
  { id: 'tournament', label: 'TOURNOIS' },
  { id: 'race', label: 'COURSE RAPIDE' },
  { id: 'garage', label: 'GARAGE' },
  { id: 'options', label: 'OPTIONS' },
];

/** Pictos blancs du carrousel, tracés au trait comme des pochoirs. */
function MenuIcon({ id }) {
  const common = {
    className: 'vcr-entry-icon',
    viewBox: '0 0 48 48',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.4,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  switch (id) {
    case 'story':
      // Couronne posée sur une berlinette : la campagne, comme « Career ».
      return (
        <svg {...common}>
          <path d="M14 6l5 5 5-7 5 7 5-5v8H14z" />
          <path d="M8 34c0-3 2-5 5-5h3l4-6h8l4 6h3c3 0 5 2 5 5v3H8z" />
          <circle cx="16" cy="38" r="3.4" />
          <circle cx="32" cy="38" r="3.4" />
        </svg>
      );
    case 'tournament':
      return (
        <svg {...common}>
          <path d="M16 8h16v7c0 6-3.4 10-8 10s-8-4-8-10z" />
          <path d="M16 10h-6c0 6 3 9 7 9M32 10h6c0 6-3 9-7 9" />
          <path d="M24 25v6M18 36l2-5h8l2 5zM15 38h18" />
        </svg>
      );
    case 'race':
      return (
        <svg {...common}>
          <path d="M11 6v36" />
          <path d="M11 8h27v16H11z" />
          <path d="M17.8 8v16M24.6 8v16M31.4 8v16M11 13.4h27M11 18.7h27" strokeWidth="1.6" />
        </svg>
      );
    case 'garage':
      return (
        <svg {...common}>
          <path d="M8 40V20L24 8l16 12v20z" />
          <path d="M15 26h18M15 32h18M15 38h18" />
        </svg>
      );
    default:
      // OPTIONS : trois curseurs de réglage.
      return (
        <svg {...common}>
          <path d="M9 14h30M9 24h30M9 34h30" />
          <circle cx="20" cy="14" r="3.6" fill="currentColor" stroke="none" />
          <circle cx="30" cy="24" r="3.6" fill="currentColor" stroke="none" />
          <circle cx="16" cy="34" r="3.6" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

/** Éclat d'encre grunge, posé derrière les blocs du menu. */
function InkSplat({ className }) {
  return (
    <svg className={className} viewBox="0 0 400 200" aria-hidden="true" preserveAspectRatio="none">
      <path
        d="M18 96c-14-30 22-58 58-52 12-24 52-30 74-16 20-18 62-16 78 4 30-10 66 6 70 32 26 6 40 34 28 54 10 22-14 44-44 40-10 20-48 26-70 14-18 14-56 12-70-4-26 10-60-2-66-24-28 2-52-22-58-48z"
        fill="currentColor"
      />
      <circle cx="352" cy="42" r="10" fill="currentColor" />
      <circle cx="378" cy="70" r="5" fill="currentColor" />
      <circle cx="30" cy="150" r="7" fill="currentColor" />
      <circle cx="58" cy="170" r="4" fill="currentColor" />
      <circle cx="330" cy="160" r="6" fill="currentColor" />
    </svg>
  );
}

export default function ViceCityRushMainMenu({
  car,
  carThumb,
  cashLabel,
  stars,
  starsTotal,
  tournamentsDone,
  bestsCount,
  soundOn,
  onToggleSound,
  onToggleFullscreen,
  onStartTutorial,
  onPick,
}) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [panel, setPanel] = useState(null); // 'stats' | 'options'
  const touchX = useRef(null);

  const selected = MENU_ENTRIES[index];

  const move = (delta) => {
    setPanel(null);
    setIndex((current) => (current + delta + MENU_ENTRIES.length) % MENU_ENTRIES.length);
  };

  const choose = (id) => {
    if (id === 'options') {
      setPanel((current) => (current === 'options' ? null : 'options'));
      return;
    }
    onPick(id);
  };

  // Clavier : tout le menu se pilote sans souris, comme la référence
  // (flèches + Entrée, G quitter, T stats, F plein écran, M son).
  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const key = event.key.toLowerCase();
      if (key === 'arrowright') { event.preventDefault(); move(1); }
      else if (key === 'arrowleft') { event.preventDefault(); move(-1); }
      else if (key === 'enter' && tag !== 'BUTTON') { event.preventDefault(); choose(selected.id); }
      else if (key === 't') { event.preventDefault(); setPanel((current) => (current === 'stats' ? null : 'stats')); }
      else if (key === 'g') { event.preventDefault(); navigate('/jeu'); }
      else if (isFullscreenShortcut(event)) { event.preventDefault(); onToggleFullscreen?.(); }
      else if (key === 'm') { event.preventDefault(); onToggleSound?.(); }
      else if (key === 'escape') { setPanel(null); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [index, panel, navigate, onToggleFullscreen, onToggleSound, onPick]);

  // Tactile : un glissé horizontal fait défiler le carrousel.
  const onTouchStart = (event) => { touchX.current = event.touches[0]?.clientX ?? null; };
  const onTouchEnd = (event) => {
    if (touchX.current === null || panel) return;
    const delta = (event.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
    if (Math.abs(delta) > 48) move(delta < 0 ? 1 : -1);
    touchX.current = null;
  };

  return (
    <div
      className="vcr-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu principal de Vice City Rush"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Décor : la photo du modèle engagé, plein cadre, assombrie en haut et
          en bas pour la lisibilité du logo et du carrousel. */}
      <div className="vcr-menu-scene" aria-hidden="true">
        <img className="vcr-menu-bg" src={carThumb} alt="" loading="eager" decoding="async" />
        <div className="vcr-menu-shade" />
        <div className="vcr-menu-grain" />
      </div>

      <InkSplat className="vcr-splat vcr-splat-logo" />
      <InkSplat className="vcr-splat vcr-splat-bar" />

      <header className="vcr-menu-logo">
        <span className="vcr-menu-logo-kicker">LET’S PLAY ARCADE PRÉSENTE</span>
        <h1 className="vcr-menu-logo-title">
          VICE CITY <b>RUSH</b>
        </h1>
        <span className="vcr-menu-logo-scratch" aria-hidden="true" />
      </header>

      <div className="vcr-menu-main-label" aria-hidden="true">
        <span className="vcr-menu-tag">rush&nbsp;!</span>
        <span className="vcr-menu-main-text">main menu</span>
      </div>

      <nav className="vcr-menu-bar" aria-label="Modes de jeu">
        <button type="button" className="vcr-menu-arrow" onClick={() => move(-1)} aria-label="Mode précédent">
          ‹
        </button>
        {MENU_ENTRIES.map((entry, i) => (
          <button
            key={entry.id}
            type="button"
            className={`vcr-entry${i === index ? ' is-selected' : ''}`}
            aria-current={i === index ? 'true' : undefined}
            aria-label={entry.label}
            onMouseEnter={() => setIndex(i)}
            onFocus={() => setIndex(i)}
            onClick={() => { setIndex(i); choose(entry.id); }}
          >
            <MenuIcon id={entry.id} />
          </button>
        ))}
        <button type="button" className="vcr-menu-arrow is-next" onClick={() => move(1)} aria-label="Mode suivant">
          ›
        </button>
      </nav>
      <p className="vcr-menu-selected" aria-live="polite">{selected.label}</p>

      <footer className="vcr-menu-keys">
        <button type="button" className="vcr-key-chip" onClick={() => navigate('/jeu')}>
          <kbd>G</kbd> QUITTER
        </button>
        <button type="button" className="vcr-key-chip" onClick={() => setPanel((current) => (current === 'stats' ? null : 'stats'))}>
          <kbd>T</kbd> GAME STATS
        </button>
        <button type="button" className="vcr-key-chip" onClick={onToggleFullscreen}>
          <kbd>F</kbd> PLEIN ÉCRAN
        </button>
        <button type="button" className="vcr-key-chip" onClick={onToggleSound}>
          <kbd>M</kbd> SON {soundOn ? 'ON' : 'OFF'}
        </button>
      </footer>

      {panel === 'stats' && (
        <div className="vcr-menu-panel" role="dialog" aria-label="Statistiques de la carrière">
          <h2>GAME STATS</h2>
          <ul>
            <li><span>BILLETS VERTS</span><b>{cashLabel}</b></li>
            <li><span>ÉTOILES HISTOIRE</span><b>{stars} / {starsTotal}</b></li>
            <li><span>TOURNOIS TERMINÉS</span><b>{tournamentsDone}</b></li>
            <li><span>MEILLEURS TEMPS</span><b>{bestsCount}</b></li>
          </ul>
          <button type="button" className="vcr-menu-panel-close" onClick={() => setPanel(null)}>
            FERMER · T
          </button>
        </div>
      )}

      {panel === 'options' && (
        <div className="vcr-menu-panel" role="dialog" aria-label="Options">
          <h2>OPTIONS</h2>
          <div className="vcr-menu-panel-actions">
            <button type="button" onClick={onToggleSound}>SON : {soundOn ? 'ON' : 'OFF'}</button>
            <button type="button" onClick={onToggleFullscreen}>PLEIN ÉCRAN · F</button>
            <button type="button" onClick={onStartTutorial}>TUTORIEL GUIDÉ</button>
            <button type="button" className="vcr-menu-panel-close" onClick={() => setPanel(null)}>FERMER</button>
          </div>
        </div>
      )}

      <span className="vcr-menu-car-name" aria-hidden="true">{car?.name || ''}</span>
    </div>
  );
}
