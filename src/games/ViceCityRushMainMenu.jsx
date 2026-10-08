// Écran-titre de Vice City Rush — le menu principal inspiré de celui de
// Need for Speed : Most Wanted (2005) : la pièce du catalogue qui tourne au
// plateau, en décor plein cadre, logo griffé en haut, carrousel de modes cerisé
// de jaune en bas et barre de raccourcis clavier — sans un nuage d'encre
// devant la vitrine : c'est la salle qui fait le fond. Toute
// la navigation existe au clavier, à la souris et au tactile.
//
// Le décor est la scène de garage elle-même (`ViceCityGarageStage`), réglée sur
// son cadrage « vitrine » : plan large dézoomé, plateau qui tourne, cabine
// entière dans le champ — mais `pointer-events: none` de bout en bout, ici le
// décor ne se manipule pas. La photo du modèle reste posée dessous : c'est elle
// que voit un appareil sans WebGL (et elle évite un cadre noir le temps que le
// premier rendu sorte). La voiture montrée n'est pas celle du garage du joueur :
// c'est `cityRushShowcaseCar()`, la plus désirable du catalogue — l'écran-titre
// vend la campagne, il ne la résume pas.
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isFullscreenShortcut } from './gameFullscreen';
import ViceCityGarageStage from './ViceCityGarageStage';
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
      {/* Décor : le modèle en trois dimensions sur son plateau tournant, posé
          derrière le menu — assombri en haut et en bas pour la lisibilité du
          logo et du carrousel. La photo vient en dessous, en socle : elle tient
          le cadre sans WebGL comme pendant le premier rendu. */}
      <div className="vcr-menu-scene" aria-hidden="true">
        <img className="vcr-menu-bg" src={carThumb} alt="" loading="eager" decoding="async" />
        <div className="vcr-menu-stage">
          <ViceCityGarageStage
            carId={car?.id}
            carName={car?.name}
            accent={car?.accent}
            framing="vitrine"
            // Pas de légende de repli ici : la photo du dessus EST le décor, il
            // n'y a rien à expliquer au joueur.
            fallbackLabel=""
          />
        </div>
        <div className="vcr-menu-shade" />
        <div className="vcr-menu-grain" />
      </div>

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

      {/* Plaque du plateau : ce qui tourne derrière le menu, et le fait que ce
          n'est pas une image. Le nom reste griffé au feutre, comme une dédicace
          posée sur la carrosserie. */}
      <div className="vcr-menu-car" aria-hidden="true">
        <span className="vcr-menu-car-live">
          <i />PLATEAU 3D · EN DIRECT
        </span>
        <small className="vcr-menu-car-class">{car?.className || 'VICE CITY · 1986'}</small>
        <span className="vcr-menu-car-name">{car?.name || ''}</span>
      </div>
    </div>
  );
}
