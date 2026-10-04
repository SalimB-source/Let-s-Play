import React from 'react';
import { DUEL_DISTANCE, duelRivalsForTrack, laneCount } from './mirageRules';
import { CUPS, MAX_RIDER_NAME, cupChampionBonus, cupGoldMaximum, cupRequirement, isCupUnlocked } from './mirageCup';
import { INITIAL_UNLOCKED_STAGES, WIN_COINS, isStageUnlocked } from './mirageProgression';
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
import snakewayThumbnail from './assets/maps/snakeway.webp';

export const MAPS = [
  { id: 'desert', number: '01', name: 'Dunes de l’Écho', mood: 'Mystique & solaire', detail: 'Désert · funk', thumbnail: desertThumbnail },
  { id: 'western', number: '02', name: 'Dust Creek', mood: 'Au cœur du Far West', detail: 'Ville · cowboy', thumbnail: westernThumbnail },
  { id: 'prairie', number: '03', name: 'Plaines d’Or', mood: 'La grande échappée', detail: 'Golden hour · épique', thumbnail: prairieThumbnail },
  { id: 'sardinia', number: '04', name: 'Costa Omertà', mood: 'Un été sur la baie', detail: 'Terrasses · soleil · mandoline', thumbnail: sardiniaThumbnail },
  { id: 'alger', number: '05', name: 'Alger la Blanche', mood: 'La ville blanche face à la baie', detail: 'Corniche · palmiers · chaâbi oriental', thumbnail: algerThumbnail },
  { id: 'japan', number: '06', name: 'Plaines de Yōtei', mood: 'Sous la lune du Mont Fuji', detail: 'Nuit · shamisen & taiko', thumbnail: japanThumbnail },
  { id: 'ramparts', number: '07', name: 'Remparts d’Ocre', mood: 'Rush B… ou Long A ?', detail: 'Hommage Counter-Strike · Mid', thumbnail: rampartsThumbnail },
  { id: 'infinity', number: '08', name: 'Château de l’Infini', mood: 'Au son du biwa de Nakime', detail: 'Hommage Demon Slayer · shōji & biwa', thumbnail: infinityThumbnail },
  { id: 'airbase', number: '09', name: 'Thunder Airbase', mood: 'Sonic Boom sur la piste !', detail: 'Hommage Street Fighter · Guile', thumbnail: airbaseThumbnail },
  { id: 'snakeway', number: '10', name: 'Chemin du Serpent', mood: 'À travers les nuages orange', detail: 'En route vers la planète de Kaio', thumbnail: snakewayThumbnail },
];

/** Nom affichable d’un terrain (`desert` → « Dunes de l’Écho »). */
export function stageName(stageId) {
  return MAPS.find((map) => map.id === stageId)?.name ?? stageId;
}

function MapThumbnail({ map, locked = false }) {
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
    {locked && <span className="mirage-map-lock" aria-hidden="true">🔒</span>}
  </span>;
}

/**
 * Sélecteur de terrain : les cartes illustrées de Mirage Rush.
 *
 * Un clic sur une carte jouable **lance la partie** — il n’y a plus de bouton
 * « LANCER » après le choix du mode. Les cartes déjà gagnées en 1ʳᵉ place
 * portent un ✓ vert, et un défi ne laisse jouable que sa carte imposée.
 */
export function MirageStagePicker({
  stage,
  setSelectedStage,
  onStart,
  locked = false,
  modeChosen = true,
  wonStages = [],
  startLabel = 'JOUER',
  hint = 'TOUCHE UNE MAP : LA PARTIE DÉMARRE AUSSITÔT.',
}) {
  const unlockedStageCount = MAPS.filter((map) => isStageUnlocked(map.id, wonStages)).length;
  const wonList = Array.isArray(wonStages) ? wonStages : [];
  return <>
    <div className="mirage-picker-label">
      <span>02 / TON TERRAIN</span>
      <span>{!modeChosen ? 'DÉBLOQUÉ APRÈS LE MODE' : locked ? 'VERROUILLÉ PAR LE DÉFI' : `${unlockedStageCount} / ${MAPS.length} HORIZONS DÉBLOQUÉS`}</span>
    </div>
    {!modeChosen ? (
      <div className="mirage-stage-locked" role="note">
        <span className="mirage-stage-locked-icon" aria-hidden="true">🔒</span>
        <p>Le terrain se choisit <strong>après</strong> le mode : sélectionne d’abord <strong>RUÉE</strong> ou <strong>DUEL</strong>, puis ta map.</p>
      </div>
    ) : (<>
      <div className="mirage-stage-picker" role="group" aria-label="Choisir le stage">
        {MAPS.map((map, index) => {
          const stageUnlocked = isStageUnlocked(map.id, wonStages);
          const stageWon = wonList.includes(map.id);
          // Un défi garde son parcours : seule la carte imposée reste jouable,
          // et c’est elle qui lance le duel.
          const imposed = locked && stage === map.id;
          const playable = imposed || (stageUnlocked && !locked);
          const selected = playable && stage === map.id;
          const lockReason = !playable
            ? (locked
              ? 'Défi en cours : la map est imposée par le lien'
              : index === INITIAL_UNLOCKED_STAGES
                ? 'Verrouillée — finis les 3 premières cartes en arrivant 1ᵉʳ pour débloquer cette carte'
                : `Verrouillée — finis ${MAPS[index - 1].name} en arrivant 1ᵉʳ pour débloquer cette carte`)
            : undefined;
          return (
            <button
              type="button"
              key={map.id}
              className={`mirage-map-card is-${map.id}${playable ? '' : ' is-locked'}${stageWon ? ' is-won' : ''}${imposed ? ' is-imposed' : ''}`}
              aria-pressed={selected}
              disabled={!playable}
              title={lockReason}
              onClick={() => {
                if (!playable) return;
                setSelectedStage(map.id);
                onStart?.(map.id);
              }}
            >
              <MapThumbnail map={map} locked={!playable} />
              <span className="mirage-map-number" aria-hidden="true">{map.number}</span>
              {/* Un seul ✓ possible par carte : le vert des maps finies. */}
              <span className="mirage-map-check" aria-hidden="true">{!playable ? '🔒' : stageWon ? '✓' : selected ? '●' : '▶'}</span>
              <span className="mirage-map-copy"><strong>{map.name}</strong><span>{map.mood}</span><small>{map.detail}</small></span>
              <span className="mirage-map-selected">
                {!playable
                  ? (locked
                    ? '🔒 DÉFI EN COURS'
                    : index === INITIAL_UNLOCKED_STAGES
                      ? '🔒 1ᴱᴿ SUR LES 3 PREMIÈRES'
                      : `🔒 1ᴱʳ SUR ${MAPS[index - 1].name.toUpperCase()}`)
                  : stageWon
                    ? `✓ TERMINÉE · ${startLabel}`
                    : startLabel}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mirage-picker-hint">{hint}</p>
    </>)}
  </>;
}

/**
 * Mode COUPE : les cartes résument la récompense et le trophée sans dévoiler
 * le détail des terrains ; chaque coupe reste un véritable bouton de sélection
 * qui **lance la coupe** d’un seul clic. Une carte terminée porte un ✓ vert.
 * Une carte par entrée de `CUPS` : ajouter une coupe au catalogue suffit.
 * Seule la 1ʳᵉ coupe est ouverte dès le départ ; chaque coupe terminée débloque
 * séquentiellement la suivante.
 */
export function MirageCupPicker({ cupId, setCupId, onStart, riderName, setRiderName, defaultRiderName, completedCups = [] }) {
  const unlockedCupCount = CUPS.filter((cup) => isCupUnlocked(cup.id, completedCups)).length;
  const completedList = Array.isArray(completedCups) ? completedCups : [];
  return <>
    <div className="mirage-picker-label"><span>02 / TA COUPE</span><span>{unlockedCupCount} / {CUPS.length} COUPE{CUPS.length > 1 ? 'S' : ''} DÉBLOQUÉE{unlockedCupCount > 1 ? 'S' : ''}</span></div>
    <div className="mirage-cup-picker" role="group" aria-label="Choisir la coupe">
      {CUPS.map(cup => {
        const unlocked = isCupUnlocked(cup.id, completedCups);
        const completed = completedList.includes(cup.id);
        const requiredCup = cupRequirement(cup.id);
        const selected = unlocked && cupId === cup.id;
        const maxGold = cupGoldMaximum(cup);
        const championBonus = cupChampionBonus(cup);
        return <button
          type="button"
          key={cup.id}
          className={`mirage-cup-card is-${cup.id}${unlocked ? '' : ' is-locked'}${completed ? ' is-completed' : ''}`}
          aria-pressed={selected}
          disabled={!unlocked}
          title={!unlocked && requiredCup
            ? `Verrouillée — finis d’abord la ${requiredCup.name}`
            : completed
              ? `✓ ${cup.name} déjà remportée — touche pour la rejouer`
              : `Touche pour lancer la ${cup.name}`}
          onClick={() => {
            if (!unlocked) return;
            setCupId(cup.id);
            onStart?.(cup.id);
          }}
        >
          <span className="mirage-cup-card-head">
            <span className="mirage-cup-emblem" aria-hidden="true">
              <MirageTrophyIcon cupId={cup.id} />
              {!unlocked && <span className="mirage-cup-lock" aria-hidden="true">🔒</span>}
            </span>
            <span className="mirage-cup-card-title"><strong>{cup.name}</strong><span>{cup.tagline}</span><small>TROPHÉE · {getTrophyDesign(cup.id).name}</small></span>
            {/* Un seul ✓ possible : le vert des coupes terminées. */}
            <span className="mirage-choice-dot" aria-hidden="true">{!unlocked ? '🔒' : completed ? '✓' : selected ? '●' : ''}</span>
          </span>
          <span className="mirage-cup-reward">
            <i className="mirage-coin" aria-hidden="true" />
            <span className="mirage-cup-reward-copy">
              <small>OR À GAGNER · MAXIMUM</small>
              <strong>+{maxGold} <i>OR</i></strong>
              <em>+{WIN_COINS} OR PAR VICTOIRE</em>
              {/* Prime de champion : versée une seule fois, au vainqueur du
                  classement général — les coupes sans prime n'affichent rien. */}
              {championBonus > 0 && <em className="mirage-cup-champion-bonus">+{championBonus} OR POUR LE VAINQUEUR DU GÉNÉRAL</em>}
            </span>
          </span>
          <span className="mirage-cup-card-action">
            {!unlocked
              ? <>🔒 FINIR {requiredCup ? requiredCup.name.toUpperCase() : 'LA COUPE PRÉCÉDENTE'} <b aria-hidden="true">🔒</b></>
              : completed
                ? <>✓ TERMINÉE · REJOUER <b aria-hidden="true">✓</b></>
                : <>LANCER CETTE COUPE <b aria-hidden="true">↗</b></>}
          </span>
        </button>;
      })}
    </div>
    <p className="mirage-picker-hint">TOUCHE UNE COUPE : ELLE DÉMARRE AUSSITÔT.</p>
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

export default function MirageCoursePicker({ selectedMode, setSelectedMode, stage, setSelectedStage, onStart, challenge, modeChosen = true, wonStages = [] }) {
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
    <MirageStagePicker stage={stage} setSelectedStage={setSelectedStage} onStart={onStart} locked={locked} modeChosen={modeChosen} wonStages={wonStages} />
  </div>;
}
