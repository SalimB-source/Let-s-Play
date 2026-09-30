import React from 'react';
import { DUEL_DISTANCE } from './mirageRules';
import desertThumbnail from './assets/maps/desert.webp';
import westernThumbnail from './assets/maps/western.webp';
import prairieThumbnail from './assets/maps/prairie.webp';
import sardiniaThumbnail from './assets/maps/sardinia.webp';
import algerThumbnail from './assets/maps/alger.webp';
import japanThumbnail from './assets/maps/japan.webp';
import rampartsThumbnail from './assets/maps/ramparts.webp';
import airbaseThumbnail from './assets/maps/airbase.webp';

const MAPS = [
  { id: 'desert', number: '01', name: 'Dunes de l’Écho', mood: 'Mystique & solaire', detail: 'Désert · funk', thumbnail: desertThumbnail },
  { id: 'western', number: '02', name: 'Dust Creek', mood: 'Au cœur du Far West', detail: 'Ville · cowboy', thumbnail: westernThumbnail },
  { id: 'prairie', number: '03', name: 'Plaines d’Or', mood: 'La grande échappée', detail: 'Golden hour · épique', thumbnail: prairieThumbnail },
  { id: 'sardinia', number: '04', name: 'Costa Omertà', mood: 'Un été sur la baie', detail: 'Terrasses · soleil · mandoline', thumbnail: sardiniaThumbnail },
  { id: 'alger', number: '05', name: 'Alger la Blanche', mood: 'La ville blanche face à la baie', detail: 'Corniche · palmiers · chaâbi oriental', thumbnail: algerThumbnail },
  { id: 'japan', number: '06', name: 'Plaines de Yōtei', mood: 'Sous la lune du Mont Fuji', detail: 'Nuit · shamisen & taiko', thumbnail: japanThumbnail },
  { id: 'ramparts', number: '07', name: 'Remparts d’Ocre', mood: 'Rush B… ou Long A ?', detail: 'Hommage Counter-Strike · Mid', thumbnail: rampartsThumbnail },
  { id: 'airbase', number: '08', name: 'Thunder Airbase', mood: 'Sonic Boom sur la piste !', detail: 'Hommage Street Fighter · Guile', thumbnail: airbaseThumbnail },
];

function MapThumbnail({ map }) {
  // Decorative: the card's visible name already labels its button.
  // Local imports let Vite fingerprint the art and honor subpath deployments.
  return <span className="mirage-map-visual" aria-hidden="true">
    <img
      className="mirage-map-art"
      src={map.thumbnail}
      alt=""
      width="768"
      height="256"
      loading="eager"
      decoding="async"
      draggable={false}
    />
  </span>;
}

/** Sélecteur de terrain : les cartes illustrées de Mirage Rush. */
export function MirageStagePicker({ stage, setSelectedStage, locked = false, modeChosen = true }) {
  return <>
    <div className="mirage-picker-label"><span>02 / TON TERRAIN</span><span>{!modeChosen ? 'DÉBLOQUÉ APRÈS LE MODE' : locked ? 'VERROUILLÉ PAR LE DÉFI' : `${MAPS.length} HORIZONS À EXPLORER`}</span></div>
    {!modeChosen ? (
      <div className="mirage-stage-locked" role="note">
        <span className="mirage-stage-locked-icon" aria-hidden="true">🔒</span>
        <p>Le terrain se choisit <strong>après</strong> le mode : sélectionne d’abord <strong>RUÉE</strong> ou <strong>DUEL</strong>, puis ta map.</p>
      </div>
    ) : (
      <div className="mirage-stage-picker" role="group" aria-label="Choisir le stage">
        {MAPS.map(map => <button type="button" key={map.id} className={`mirage-map-card is-${map.id}`} aria-pressed={stage === map.id} disabled={locked} onClick={() => setSelectedStage(map.id)}>
          <MapThumbnail map={map} />
          <span className="mirage-map-number" aria-hidden="true">{map.number}</span>
          <span className="mirage-map-check" aria-hidden="true">{stage === map.id ? '✓' : '↗'}</span>
          <span className="mirage-map-copy"><strong>{map.name}</strong><span>{map.mood}</span><small>{map.detail}</small></span>
          <span className="mirage-map-selected">{stage === map.id ? 'SÉLECTIONNÉ' : 'EXPLORER'}</span>
        </button>)}
      </div>
    )}
  </>;
}

export default function MirageCoursePicker({ selectedMode, setSelectedMode, stage, setSelectedStage, challenge, modeChosen = true }) {
  const locked = selectedMode === 'duel' && Boolean(challenge);
  return <div className="mirage-course-picker">
    <div className="mirage-picker-label"><span>01 / TON DÉFI</span><span>À TOI DE JOUER</span></div>
    <div className="mirage-mode-picker" role="group" aria-label="Mode de jeu">
      {[
        { id: 'online', name: 'EN LIGNE', icon: '♞', tagline: 'Retrouve tes amis', info: 'Salon · 2 à 4 cavaliers' },
        { id: 'rush', name: 'RUÉE', icon: '↯', tagline: 'Bats ton record', info: '60 secondes · 3 vies' },
        { id: 'duel', name: 'DUEL', icon: '⚔', tagline: challenge ? `Défi de ${challenge.name}` : 'Course à 4 cavaliers', info: challenge ? `Fantôme + 2 PNJ · ${DUEL_DISTANCE} m` : `Face à 3 PNJ · ${DUEL_DISTANCE} m` },
      ].map(mode => <button type="button" key={mode.id} aria-pressed={modeChosen && selectedMode === mode.id} onClick={() => setSelectedMode(mode.id)}>
        <span className="mirage-mode-symbol" aria-hidden="true">{mode.icon}</span>
        <span className="mirage-mode-copy"><strong>{mode.name}</strong><span>{mode.tagline}</span><small>{mode.info}</small></span>
        <span className="mirage-choice-dot" aria-hidden="true">{modeChosen && selectedMode === mode.id ? '✓' : ''}</span>
      </button>)}
    </div>
    <MirageStagePicker stage={stage} setSelectedStage={setSelectedStage} locked={locked} modeChosen={modeChosen} />
  </div>;
}
