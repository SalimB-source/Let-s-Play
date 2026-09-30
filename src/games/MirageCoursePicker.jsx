import React from 'react';
import { DUEL_DISTANCE, duelRivalsForTrack, laneCount } from './mirageRules';
import { CUPS, CUP_POINTS, MAX_RIDER_NAME, placeLabel } from './mirageCup';
import MirageTrophyIcon from './MirageTrophyIcon';
import { getTrophyDesign } from './mirageTrophy';
import desertThumbnail from './assets/maps/desert.webp';
import westernThumbnail from './assets/maps/western.webp';
import prairieThumbnail from './assets/maps/prairie.webp';
import sardiniaThumbnail from './assets/maps/sardinia.webp';
import algerThumbnail from './assets/maps/alger.webp';
import japanThumbnail from './assets/maps/japan.webp';
import rampartsThumbnail from './assets/maps/ramparts.webp';
import infinityThumbnail from './assets/maps/infinity.webp';
import airbaseThumbnail from './assets/maps/airbase.webp';

const MAPS = [
  { id: 'desert', number: '01', name: 'Dunes de l’Écho', mood: 'Mystique & solaire', detail: 'Désert · funk', thumbnail: desertThumbnail },
  { id: 'western', number: '02', name: 'Dust Creek', mood: 'Au cœur du Far West', detail: 'Ville · cowboy', thumbnail: westernThumbnail },
  { id: 'prairie', number: '03', name: 'Plaines d’Or', mood: 'La grande échappée', detail: 'Golden hour · épique', thumbnail: prairieThumbnail },
  { id: 'sardinia', number: '04', name: 'Costa Omertà', mood: 'Un été sur la baie', detail: 'Terrasses · soleil · mandoline', thumbnail: sardiniaThumbnail },
  { id: 'alger', number: '05', name: 'Alger la Blanche', mood: 'La ville blanche face à la baie', detail: 'Corniche · palmiers · chaâbi oriental', thumbnail: algerThumbnail },
  { id: 'japan', number: '06', name: 'Plaines de Yōtei', mood: 'Sous la lune du Mont Fuji', detail: 'Nuit · shamisen & taiko', thumbnail: japanThumbnail },
  { id: 'ramparts', number: '07', name: 'Remparts d’Ocre', mood: 'Rush B… ou Long A ?', detail: 'Hommage Counter-Strike · Mid', thumbnail: rampartsThumbnail },
  { id: 'infinity', number: '08', name: 'Château de l’Infini', mood: 'Au son du biwa de Nakime', detail: 'Hommage Demon Slayer · shōji & biwa', thumbnail: infinityThumbnail },
  { id: 'airbase', number: '09', name: 'Thunder Airbase', mood: 'Sonic Boom sur la piste !', detail: 'Hommage Street Fighter · Guile', thumbnail: airbaseThumbnail },
];

/** Nom affichable d’un terrain (`desert` → « Dunes de l’Écho »). */
export function stageName(stageId) {
  return MAPS.find((map) => map.id === stageId)?.name ?? stageId;
}

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

/**
 * Mode COUPE : à la place du choix de terrain, on choisit une coupe — une suite
 * de courses sur des terrains imposés, avec le barème des points — et le nom
 * qui s’affichera sur le trophée. Une carte par entrée de `CUPS` : en ajouter
 * une dans le catalogue, avec son design dans `mirageTrophy.js`, suffit.
 */
export function MirageCupPicker({ cupId, setCupId, riderName, setRiderName, defaultRiderName, riderCount = CUP_POINTS.length }) {
  return <>
    <div className="mirage-picker-label"><span>02 / TA COUPE</span><span>{CUPS.length} COUPE{CUPS.length > 1 ? 'S' : ''} DISPONIBLE{CUPS.length > 1 ? 'S' : ''}</span></div>
    <div className="mirage-cup-picker" role="group" aria-label="Choisir la coupe">
      {CUPS.map(cup => <button type="button" key={cup.id} className={`mirage-cup-card is-${cup.id}`} aria-pressed={cupId === cup.id} onClick={() => setCupId(cup.id)}>
        <span className="mirage-cup-card-head">
          <span className="mirage-cup-emblem" aria-hidden="true"><MirageTrophyIcon cupId={cup.id} /></span>
          <span className="mirage-cup-card-title"><strong>{cup.name}</strong><span>{cup.tagline}</span><small>TROPHÉE · {getTrophyDesign(cup.id).name}</small></span>
          <span className="mirage-choice-dot" aria-hidden="true">{cupId === cup.id ? '✓' : ''}</span>
        </span>
        <span className="mirage-cup-route" role="list" aria-label="Les courses, dans l’ordre">
          {cup.stages.map((stageId, index) => {
            const map = MAPS.find(entry => entry.id === stageId);
            return <span className="mirage-cup-stop" role="listitem" key={`${stageId}-${index}`}>
              <MapThumbnail map={map} />
              <span className="mirage-cup-stop-number">COURSE {index + 1}</span>
              <strong>{map.name}</strong>
            </span>;
          })}
        </span>
        <span className="mirage-cup-points" role="list" aria-label="Points par place">
          {CUP_POINTS.slice(0, riderCount).map((points, index) => <span role="listitem" key={index}><b>{placeLabel(index + 1)}</b> {points} pts</span>)}
        </span>
      </button>)}
    </div>
    <label className="mirage-cup-name-field">
      <span>NOM SUR LE TROPHÉE</span>
      <input
        type="text"
        value={riderName}
        maxLength={MAX_RIDER_NAME}
        placeholder={defaultRiderName}
        onChange={event => setRiderName(event.target.value)}
        autoComplete="nickname"
        spellCheck={false}
      />
    </label>
  </>;
}

export default function MirageCoursePicker({ selectedMode, setSelectedMode, stage, setSelectedStage, challenge, modeChosen = true }) {
  const locked = selectedMode === 'duel' && Boolean(challenge);
  // Trois voies et deux rivaux sur téléphone (navigateur comme application),
  // quatre voies et trois rivaux sur ordinateur et tablette (voir
  // src/games/mirageLanes.js).
  const rivalCount = duelRivalsForTrack(laneCount()).length;
  return <div className="mirage-course-picker">
    <div className="mirage-picker-label"><span>01 / TON DÉFI</span><span>À TOI DE JOUER</span></div>
    <div className="mirage-mode-picker" role="group" aria-label="Mode de jeu">
      {[
        { id: 'online', name: 'EN LIGNE', icon: '♞', tagline: 'Retrouve tes amis', info: 'Salon · 2 à 4 cavaliers' },
        { id: 'rush', name: 'RUÉE', icon: '↯', tagline: 'Bats ton record', info: '60 secondes · 3 vies' },
        { id: 'duel', name: 'DUEL', icon: '⚔', tagline: challenge ? `Défi de ${challenge.name}` : `Course à ${1 + rivalCount} cavaliers`, info: challenge ? `Fantôme + ${rivalCount - 1} PNJ · ${DUEL_DISTANCE} m` : `Face à ${rivalCount} PNJ · ${DUEL_DISTANCE} m` },
      ].map(mode => <button type="button" key={mode.id} aria-pressed={modeChosen && selectedMode === mode.id} onClick={() => setSelectedMode(mode.id)}>
        <span className="mirage-mode-symbol" aria-hidden="true">{mode.icon}</span>
        <span className="mirage-mode-copy"><strong>{mode.name}</strong><span>{mode.tagline}</span><small>{mode.info}</small></span>
        <span className="mirage-choice-dot" aria-hidden="true">{modeChosen && selectedMode === mode.id ? '✓' : ''}</span>
      </button>)}
    </div>
    <MirageStagePicker stage={stage} setSelectedStage={setSelectedStage} locked={locked} modeChosen={modeChosen} />
  </div>;
}
