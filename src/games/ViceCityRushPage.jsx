import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ViceCityWorld from './ViceCityWorld';
import CityRushDriverAvatar from './CityRushDriverAvatar';
import CityRushStoryScene from './CityRushStoryScene';
import CityRushRaceList from './CityRushRaceList';
import FullscreenIcon from './FullscreenIcon';
import { CityRushAudio } from './cityRushAudio';
import { isFullscreenShortcut, nativeFullscreenElement, opensFullscreenOnLaunch } from './gameFullscreen';
import useGameFullscreen from './useGameFullscreen';
import {
  CITY_RUSH_STARTER_CAR_ID,
  awardCityRushRace,
  isCityRushCarOwned,
  isCityRushCourseUnlocked,
  normalizeCityRushProgress,
  purchaseCityRushCar,
  readCityRushProgress,
  writeCityRushProgress,
} from './cityRushProgress';
import {
  CITY_RUSH_CARS,
  CITY_RUSH_COURSES,
  CITY_RUSH_DISTANCE,
  CITY_RUSH_DRIVERS,
  CITY_RUSH_FINAL_LAP_LOOPS,
  CITY_RUSH_LAPS,
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_SPRINT_CHECKPOINTS,
  CITY_RUSH_SPRINT_CHECKPOINT_SPACING,
  CITY_RUSH_SPRINT_CHECKPOINT_TIME,
  CITY_RUSH_SPRINT_DISTANCE,
  CITY_RUSH_LANE_CHANGE_SLOW_FACTOR,
  CITY_RUSH_CLEAN_LINE_MAX_BONUS,
  CITY_RUSH_PLAYER_HEALTH,
  CITY_RUSH_PLAYER_HEALTH_CRITICAL,
  CITY_RUSH_POWER_RULES,
  CITY_RUSH_POWERS,
  CITY_RUSH_PICKUPS,
  CITY_RUSH_TRACK_BOOST_DURATION,
  buildCityRushMinimapState,
  cityRushPlayerHealthColor,
  cityRushRaceDistance,
  createCityRushInventory,
  selectCityRushRacers,
} from './cityRushRules';
import { cityRushTheme } from './cityRushThemes';
import { useAchievementAction } from '../achievements/AchievementContext';
import { VICE_CITY_STORY_MODE } from '../achievements/engine';
import './vice-city-rush.css';
import './vice-city-rush-cinematic.css';

// v2 : les courses ont été allongées (dernier tour doublé, un tour de plus) —
// un chrono de l'ancienne durée ne pourrait plus jamais être battu.
const BEST_KEY = 'letsplay_vice_city_rush_bests_v2';
const SOUND_KEY = 'letsplay_vice_city_rush_sound_v1';
const STORY_KEY = 'letsplay_vice_city_rush_story_v1';
const STORY_ENDING_KEY = 'letsplay_vice_city_rush_ending_v1';
const POWER_ORDER = [CITY_RUSH_POWERS.PISTOL];
const CAR_STATS = [
  { key: 'power', label: 'PUISSANCE' },
  { key: 'acceleration', label: 'ACCÉLÉRATION' },
  { key: 'recovery', label: 'REPRISE' },
];
const CITY_THUMBNAILS = {
  'vice-city': 'vice-city-thumb.jpg',
  'route-66': 'route-66-thumb.jpg',
  'new-york': 'new-york-thumb.jpg',
  tokyo: 'vice-city-story-tokyo.webp',
  paris: 'paris-thumb.jpg',
  london: 'london-thumb.jpg',
  'mexico-countryside': 'mexico-countryside-thumb.jpg',
};
const CAR_THUMBNAILS = {
  'city-hatch': 'car-mistral-14.jpg',
  'nova-18-gt': 'car-nova-18-gt.jpg',
  'vice-roadster': 'car-cavallo-f8-gtb.jpg',
  'turbo-gt': 'car-kronos-930-turbo.jpg',
  'muscle-86': 'car-vortex-rs-10.jpg',
  'night-comet': 'car-wolfsburg-gtr.jpg',
  'vega-gt-67': 'car-bavaria-mcs.jpg',
  'toro-v12': 'car-tempesta-lp780.jpg',
};

const STORY_ENDINGS = {
  revenge: { title: 'La revanche', text: 'Nico remet Dante aux autorités et restaure son nom. Sa vengeance s’arrête là — mais le promoteur qui a commandité le sabotage reste à retrouver.' },
  truth: { title: 'La vérité', text: 'Nico rend publiques toutes les preuves. Dante devra répondre de sa trahison, et le réseau du promoteur est exposé au grand jour.' },
};
function readStoryEnding() {
  try { return window.localStorage.getItem(STORY_ENDING_KEY) || ''; } catch { return ''; }
}
// Tours d'un chapitre de l'histoire ; le finale, « Le dernier tour », en compte un de plus.
const STORY_LAPS = 4;
const STORY_FINALE_LAPS = STORY_LAPS + 1;
const STORY_CHAPTERS = [
  { city: 'vice-city', title: 'Le retour', speaker: 'Nico', race: { name: 'Ocean Drive — Sunset Run', type: 'Course côtière', route: 'Ocean Drive · South Beach · Collins Avenue' }, text: 'Trois ans après le sabotage, Nico Vega revient à Ocean Drive. Dante Cross a laissé une invitation au départ : gagne cette course et le prochain nom tombera.' },
  { city: 'new-york', title: 'La piste froide', speaker: 'Nico', kind: 'action', race: { name: 'Midtown — Heat Run', type: 'Échappée urbaine', route: 'Times Square · Broadway · Midtown Tunnel' }, text: 'L’escorte de Dante repère Nico dans Midtown. Sirènes derrière eux, Luna lâche un dernier indice à la radio : le prochain contact se cache à Tokyo.' },
  { city: 'tokyo', title: 'L’anneau de minuit', speaker: 'Nico', kind: 'action', race: { name: 'Shutō C1 — Midnight Loop', type: 'Sprint sur voie rapide', route: '日本橋 · 霞が関 掘割 · 芝公園 · 浜崎橋JCT · 汐留トンネル' }, text: 'Le mécanicien de Dante a les preuves, et l’échange tourne mal au pied du péage de 宝町. Nico saute au volant, dossier en main, et s’engage sur la C1 内回り : quatorze kilomètres huit cents de viaduc au-dessus de la ville, trois tunnels sous le palais impérial, aucun feu rouge — juste les portiques verts qui défilent et les hommes de Dante dans les rétros.' },
  { city: 'paris', title: 'Marché de dupes', speaker: 'Nico', kind: 'action', race: { name: 'Rive Gauche — Redline', type: 'Drift urbain', route: 'Saint-Germain · Quai de Conti · Boulevard Saint-Michel' }, text: 'Le promoteur tente de s’enfuir avec les preuves. Nico le prend en chasse dans les rues de Paris ; la vérité est dans la voiture rouge.' },
  { city: 'london', title: 'La soirée des ombres', speaker: 'Nico', kind: 'action', race: { name: 'Soho — After Hours', type: 'Course-poursuite', route: 'Piccadilly Circus · Soho · Tower Bridge' }, text: 'En costume, Nico s’invite à la réception privée du promoteur. Il surprend Dante qui ordonne de brûler les preuves — les gardes le repèrent, et la fuite se joue au volant dans les rues de Soho.' },
  { city: 'vice-city', title: 'Le dernier tour', speaker: 'Nico', kind: 'action', laps: STORY_FINALE_LAPS, race: { name: 'Vice City — Last Lap', type: 'Finale du circuit', route: 'Ocean Drive · Starfish Island · Vice City Docks' }, text: 'Dante pousse sa voiture rouge à fond sur Ocean Drive. Nico colle à son pare-chocs : une dernière course décidera de leur sort.' },
];
function readStoryChapter() {
  try { return Math.max(0, Math.min(STORY_CHAPTERS.length, Number(window.localStorage.getItem(STORY_KEY)) || 0)); } catch { return 0; }
}

function readCareerProgress() {
  const saved = readCityRushProgress();
  // Migration douce : une ancienne sauvegarde Histoire conserve les parcours
  // déjà validés avant l'ajout de la carrière, sans ouvrir Route 66 par erreur.
  const legacyCompletions = CITY_RUSH_COURSES
    .slice(0, Math.min(readStoryChapter(), Math.max(0, CITY_RUSH_COURSES.length - 1)))
    .map((course) => course.id);
  return normalizeCityRushProgress({
    ...saved,
    completedCourseIds: [...saved.completedCourseIds, ...legacyCompletions],
  });
}

function formatCash(value = 0) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('fr-FR');
}

const RACE_MODES = [
  {
    id: 'circuit',
    name: 'CIRCUIT',
    label: '4 TOURS · CLASSIQUE',
    desc: 'La formule originale, en plus long. 4 tours dont un dernier tour double, trafic, bonus et police (berlines/SUV) uniquement au dernier tour, avec renforts après chaque destruction.',
    accent: '#43ead5',
    secondary: '#ff5db8',
    laps: 4,
    policeFromStart: false,
    cashRewards: true,
    icon: '◍',
    tag: 'RECOMMANDÉ',
  },
  {
    id: 'sprint',
    name: 'SPRINT',
    label: 'SOLO · 10 CHECKPOINTS',
    desc: 'En solo contre la montre, sans adversaire : ni police, ni bonus, ni arme. Tu as 15 secondes pour atteindre chaque checkpoint — chrono à zéro, course perdue. Mode défi : aucun billet vert.',
    accent: '#ff5db8',
    secondary: '#ffd44f',
    laps: 1,
    format: 'sprint',
    checkpoints: CITY_RUSH_SPRINT_CHECKPOINTS,
    policeFromStart: false,
    cashRewards: false,
    icon: '⚡',
    tag: 'RAPIDE',
  },
  {
    id: 'pursuit',
    name: 'POURSUITE',
    label: '4 TOURS · POLICE TOTALE',
    desc: 'Une berline et un SUV d’interception dès le départ. Ils chargent leur mitrailleuse avec les bonus rouges et appellent gratuitement un hélicoptère une fois par course ; au dernier tour, des renforts remplacent chaque voiture détruite. Un tir rouge ou un carambolage retire la moitié de la vie d’une voiture de police, et les chocs abîment aussi ta coque. Mode défi : aucun billet vert.',
    accent: '#ffd44f',
    secondary: '#ff526e',
    laps: 4,
    policeFromStart: true,
    cashRewards: false,
    icon: '🚨',
    tag: 'HARDCORE',
  },
];

const EMPTY_HUD = {
  distance: 0,
  totalDistance: CITY_RUSH_DISTANCE,
  progress: 0,
  lap: 1,
  laps: CITY_RUSH_LAPS,
  lapLength: CITY_RUSH_LAP_LENGTH,
  lapProgress: 0,
  lapDistance: 0,
  elapsed: 0,
  speed: 0,
  rank: 3,
  racers: [],
  inventory: createCityRushInventory(),
  score: 0,
  pickups: 0,
  slowLeft: 0,
  trafficImpactLeft: 0,
  boostLeft: 0,
  stunLeft: 0,
  // Barre de vie du pilote : nulle tant que le dernier tour n'a pas commencé.
  playerHealth: null,
  playerHealthMax: CITY_RUSH_PLAYER_HEALTH,
  playerHealthActive: false,
  playerHealthFlash: 0,
  police: [],
};

// Bannière du point de passage du dernier tour : on recroise le portique, mais
// la course n'est pas finie — on dit combien de boucles il reste.
function checkpointKicker(remaining) {
  const loops = Math.max(1, Math.round((Number(remaining) || 0) / CITY_RUSH_LAP_LENGTH));
  return loops > 1 ? `DERNIER TOUR · ENCORE ${loops} BOUCLES` : 'DERNIER TOUR · DERNIÈRE BOUCLE';
}

function readBests() {
  try {
    const value = JSON.parse(window.localStorage.getItem(BEST_KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}
function writeBests(value) {
  try { window.localStorage.setItem(BEST_KEY, JSON.stringify(value)); } catch {}
}
function readSoundPref() {
  try { return window.localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; }
}
function writeSoundPref(value) {
  try { window.localStorage.setItem(SOUND_KEY, value ? 'on' : 'off'); } catch {}
}
function formatTime(seconds = 0) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const wholeSeconds = Math.floor(safe % 60);
  const centiseconds = Math.floor((safe - Math.floor(safe)) * 100);
  return `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}
function formatSeconds(seconds, fallback = 0) {
  const value = Number.isFinite(Number(seconds)) ? Math.max(0, Number(seconds)) : fallback;
  return `${value.toFixed(1).replace('.', ',')} s`;
}
function ordinal(place) {
  return place === 1 ? '1er' : `${place}e`;
}
function cashRewardReason(result) {
  if (result?.sprint) return 'MODE DÉFI · SANS BILLETS';
  if (result?.destroyed) return 'RÉCOMPENSE · ÉPAVE DERNIÈRE';
  return `RÉCOMPENSE · ${ordinal(result?.rank).toUpperCase()} PLACE`;
}
function PowerIcon({ type, className = '' }) {
  if (type === 'pistol') {
    return (
      <svg className={className} viewBox="0 0 32 32" aria-hidden="true" fill="currentColor">
        {/* AK-47 de profil : crosse, boîtier, chargeur recourbé, canon et mires. */}
        <path d="M2.2 13.1 8.6 14.4v4.6L2.3 20.8z" />
        <path d="M8.4 13.1h9.6v5.4H8.4z" />
        <path d="M17.8 13.6h5.4v4.4h-5.4z" />
        <path d="M23 14.7h7.2v2.1H23z" />
        <path d="M17.9 11.9h9.2v1.4h-9.2z" />
        <path d="M11.1 18.3 9.2 26.6h3.2l1.8-8.3z" />
        <path d="M15.4 18.4c1.7 3.2 2.6 6.4.7 8.3-1.5.5-2.8-.4-3.4-2.1-.3-2.3 1.1-4.7 2.7-6.2z" />
        <rect x="27.1" y="10.1" width="1.5" height="5.2" rx="0.4" />
        <rect x="16.4" y="11.1" width="1.4" height="2.4" rx="0.3" />
        <rect x="29.6" y="14.2" width="1.6" height="3.1" rx="0.35" />
      </svg>
    );
  }
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" {...common}>
      {type === CITY_RUSH_PICKUPS.BOOST && <>
        <rect x="3" y="4" width="26" height="24" rx="3" />
        <path d="M11 21v-8l5 4v-5l5 4v-5" />
        <path d="m17 7 4 4 4-4" />
      </>}
    </svg>
  );
}

function rankProgress(racer) {
  return Math.round(Math.max(0, Math.min(1, Number(racer?.progress) || 0)) * 100);
}

export default function ViceCityRushPage() {
  const [cityId, setCityId] = useState('vice-city');
  const [carId, setCarId] = useState(CITY_RUSH_STARTER_CAR_ID);
  const [storyMode, setStoryMode] = useState(false);
  const [storyChapter, setStoryChapter] = useState(readStoryChapter);
  const [storyRaceChapter, setStoryRaceChapter] = useState(readStoryChapter);
  const [storyEnding, setStoryEnding] = useState(readStoryEnding);
  const [playerDriverId, setPlayerDriverId] = useState(CITY_RUSH_DRIVERS[0].id);
  const [modeId, setModeId] = useState(RACE_MODES[0].id);
  const [introStep, setIntroStep] = useState('mode'); // mode -> city -> garage
  const [phase, setPhase] = useState('intro');
  const [countdown, setCountdown] = useState(3);
  const [runId, setRunId] = useState(0);
  const [hud, setHud] = useState(EMPTY_HUD);
  const [result, setResult] = useState(null);
  const [bests, setBests] = useState(readBests);
  const [careerProgress, setCareerProgress] = useState(readCareerProgress);
  const [toast, setToast] = useState(null);
  const [lapBanner, setLapBanner] = useState(null);
  const [worldError, setWorldError] = useState('');
  const [soundOn, setSoundOn] = useState(readSoundPref);
  const audioRef = useRef(null);
  const soundOnRef = useRef(soundOn);
  const careerProgressRef = useRef(careerProgress);
  careerProgressRef.current = careerProgress;
  const activeRaceSessionRef = useRef(0);
  const finishedRaceSessionRef = useRef(-1);
  const actionsRef = useRef(null);
  const shellRef = useRef(null);
  const phaseRef = useRef(phase);
  const toastTimerRef = useRef(null);
  const lapTimerRef = useRef(null);
  const startRaceRef = useRef(null);
  // Phase à rendre à « REPRENDRE » quand c'est le navigateur (Échap, geste
  // « retour » d'Android) qui a refermé le plein écran : une pause décidée par
  // le système doit rendre au jeu l'écran qu'il avait quitté — compte à
  // rebours ou course.
  const resumePhaseRef = useRef('playing');
  // La sortie « native » (Échap, geste retour) est branchée sur la pause plus
  // loin, une fois `pauseRace` défini : d'où la référence.
  const nativeExitRef = useRef(null);
  // Plein écran de la coque du jeu (voir la section « Plein écran » plus bas).
  const {
    active: immersive,
    enter: enterImmersive,
    exit: exitImmersive,
    toggle: toggleImmersive,
    isPinned: immersivePinned,
  } = useGameFullscreen(shellRef, { onNativeExit: () => nativeExitRef.current?.() });
  // Trophées de jeu : les courses terminées nourrissent les succès Vice City
  // Rush du joueur (ville, mode, place, butin, chapitre d'histoire).
  const trackAchievement = useAchievementAction();
  phaseRef.current = phase;
  soundOnRef.current = soundOn;

  const city = useMemo(() => CITY_RUSH_COURSES.find((item) => item.id === cityId) || CITY_RUSH_COURSES[0], [cityId]);
  const mode = useMemo(() => RACE_MODES.find((m) => m.id === modeId) || RACE_MODES[0], [modeId]);
  const currentStoryRace = storyMode ? STORY_CHAPTERS[storyRaceChapter] : null;
  const currentLaps = storyMode ? (currentStoryRace?.laps ?? STORY_LAPS) : mode.laps;
  // Le dernier tour enchaîne deux boucles : 4 tours = 3 × 600 m + 1 200 m.
  const sprintMode = !storyMode && mode.format === 'sprint';
  const currentDistance = sprintMode ? CITY_RUSH_SPRINT_DISTANCE : cityRushRaceDistance(currentLaps);
  const RACE_KM = `${(currentDistance / 1000).toFixed(1).replace('.', ',')} KM`;
  const activeModeName = storyMode ? 'HISTOIRE' : mode.name;
  const activeModeLabel = storyMode ? `CHAPITRE ${String(storyRaceChapter + 1).padStart(2, '0')} / ${STORY_CHAPTERS.length}` : mode.label;
  const cashRewardsEnabled = storyMode || mode.cashRewards !== false;
  const daylight = useMemo(() => Boolean(cityRushTheme(city.id).daylight), [city.id]);
  const selectedCar = useMemo(() => CITY_RUSH_CARS.find((item) => item.id === carId) || CITY_RUSH_CARS[0], [carId]);
  const roster = useMemo(() => {
    const racers = selectCityRushRacers({ cityId, carId: selectedCar.id, runId, playerDriverId });
    return storyMode
      ? racers.map((racer) => racer.isPlayer ? { ...racer, name: 'NICO', displayName: 'Nico Vega', country: 'Vice City', countryCode: 'US', flag: '🇺🇸' } : racer)
      : racers;
  }, [cityId, selectedCar.id, runId, playerDriverId, storyMode]);
  const minimapState = useMemo(
    () => buildCityRushMinimapState(hud.racers?.length ? hud.racers : roster, {
      cityId,
      carId: selectedCar.id,
      runId,
      playerDriverId,
      laps: currentLaps,
      totalDistance: currentDistance,
      // Sprint : un seul pilote en piste. Sans ça, le classement latéral
      // reprend la grille de départ à trois tant que le monde n'a pas envoyé
      // son premier HUD — les « adversaires » restent affichés en solo.
      solo: sprintMode,
    }),
    [hud.racers, roster, cityId, selectedCar.id, runId, playerDriverId, currentLaps, currentDistance, sprintMode],
  );
  const standings = minimapState.racers;
  // Checkpoint visé (1 → 10) : en Sprint il remplace la place au classement,
  // puisqu'il n'y a personne d'autre en piste.
  const sprintCheckpoint = Math.min((Number(hud.sprint?.checkpoints) || 0) + 1, CITY_RUSH_SPRINT_CHECKPOINTS);
  const wantedStars = Math.min(5, Array.isArray(hud.police) ? hud.police.length : 0);
  // Barre de vie de la voiture du pilote : huit carrés, dessinés comme une
  // seule barre — la page n'affiche jamais les carrés, seulement la couleur
  // (vert → orange → rouge) et la longueur.
  const playerHealthValue = Number.isFinite(Number(hud.playerHealth)) ? Math.max(0, Number(hud.playerHealth)) : null;
  const playerHealthMax = Number(hud.playerHealthMax) || CITY_RUSH_PLAYER_HEALTH;
  const playerHealthPercent = playerHealthValue === null ? 0 : Math.max(0, Math.min(100, (playerHealthValue / playerHealthMax) * 100));
  const playerHealthColor = cityRushPlayerHealthColor(playerHealthValue ?? playerHealthMax, playerHealthMax);
  const playerHealthCritical = playerHealthValue !== null && playerHealthValue <= CITY_RUSH_PLAYER_HEALTH_CRITICAL;
  const bestTime = bests[cityId] || null;
  const finalStoryVictory = Boolean(storyMode && result?.rank === 1 && !result?.destroyed && storyChapter >= STORY_CHAPTERS.length);
  const nextStoryIndex = storyChapter >= STORY_CHAPTERS.length ? 0 : storyChapter;
  const previewStoryChapter = STORY_CHAPTERS[nextStoryIndex];
  const previewStoryCity = CITY_RUSH_COURSES.find((item) => item.id === previewStoryChapter.city) || CITY_RUSH_COURSES[0];

  // ── Plein écran ────────────────────────────────────────────────────────
  // Le mécanisme (Fullscreen API, couche fixe en repli, verrou de défilement)
  // vit dans useGameFullscreen / gameFullscreen.js, partagé avec Mirage Rush.
  // Ici, les règles du jeu :
  //   - l'interface SE LANCE EN PLEIN ÉCRAN DE BASE : la couche fixe (classe
  //     `is-immersive`), qui couvre tout le viewport, est posée dès le montage
  //     de la page ; le plein écran natif — que le navigateur refuse hors d'un
  //     geste — part au tout premier geste du joueur (clic, touche). Le choix
  //     est « épinglé » : intro, cinématiques, courses et arrivées le gardent
  //     jusqu'à ce que le joueur le quitte (bouton de la barre, touche F, Échap
  //     ou geste « retour » du navigateur) ;
  //   - téléphone, tablette, application : le lancement d'une course demande
  //     aussi le natif dans le geste (voir `opensFullscreenOnLaunch()`), ce qui
  //     relance un plein écran quitté ;
  //   - si le navigateur le referme (Échap, geste « retour »), la course en cours
  //     est mise en pause plutôt que jouée à moitié dans la page.
  useEffect(() => {
    // Plein écran « de base » : la couche fixe se pose sans geste. `native` est
    // faux car le navigateur refuserait une demande hors geste — le natif part
    // au premier geste (effet suivant).
    enterImmersive({ pinned: true, native: false });
  }, [enterImmersive]);

  // Le navigateur exige un geste pour le vrai plein écran : le premier clic ou
  // la première touche (hors champs de saisie) le demande. Le natif posé — ou
  // le plein écran quitté — l'écoute s'arrête d'elle-même.
  useEffect(() => {
    if (!immersive) return undefined;
    const upgrade = (event) => {
      if (nativeFullscreenElement()) return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      enterImmersive({ pinned: true });
    };
    window.addEventListener('pointerdown', upgrade, true);
    window.addEventListener('keydown', upgrade, true);
    return () => {
      window.removeEventListener('pointerdown', upgrade, true);
      window.removeEventListener('keydown', upgrade, true);
    };
  }, [immersive, enterImmersive]);

  // Une ouverture automatique (téléphone, application) ne survit pas au retour
  // à l'intro ni à l'arrivée : le joueur y retrouve la page. Un plein écran
  // demandé, lui, reste (le jeu ne le referme pas de lui-même).
  useEffect(() => {
    if (immersivePinned()) return;
    if (phase === 'intro' || phase === 'finished' || phase === 'cinematic') exitImmersive();
  }, [phase, exitImmersive, immersivePinned]);

  useEffect(() => {
    audioRef.current = new CityRushAudio();
    return () => {
      audioRef.current?.destroy();
      audioRef.current = null;
    };
  }, []);
  useEffect(() => { audioRef.current?.setCity(cityId); }, [cityId]);
  useEffect(() => { writeSoundPref(soundOn); }, [soundOn]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (phase === 'paused') audio.pause();
    else if (phase === 'intro' || phase === 'cinematic') audio.stop();
    else audio.resume();
  }, [phase, runId]);
  useEffect(() => {
    const onVisibility = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.hidden) audio.pause();
      else if (phaseRef.current === 'playing' || phaseRef.current === 'countdown') audio.resume();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const toggleSoundRef = useRef(null);
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (!next) { audioRef.current?.stop(); return; }
    if (phaseRef.current === 'playing' || phaseRef.current === 'countdown') audioRef.current?.start();
  };
  toggleSoundRef.current = toggleSound;

  // Le navigateur vient de refermer le plein écran (Échap, geste « retour »
  // d'Android) : en pleine course, on suspend plutôt que de laisser la voiture
  // rouler pendant que la page se remet en forme. Hors course, il n'y a rien à
  // suspendre. `resumeRace` rend l'écran quitté — compte à rebours ou course.
  const pauseRace = useCallback(() => {
    const current = phaseRef.current;
    if (current !== 'playing' && current !== 'countdown') return;
    resumePhaseRef.current = current;
    setPhase('paused');
  }, []);
  const resumeRace = useCallback(() => setPhase(resumePhaseRef.current || 'playing'), []);
  nativeExitRef.current = pauseRace;

  useEffect(() => {
    if (phase !== 'countdown') return undefined;
    if (countdown > 0) {
      const timer = window.setTimeout(() => setCountdown((value) => value - 1), 820);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setPhase('playing'), 560);
    return () => window.clearTimeout(timer);
  }, [phase, countdown]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target?.tagName;
      if (target === 'INPUT' || target === 'TEXTAREA' || target === 'SELECT') return;
      const key = event.key.toLowerCase();
      if (isFullscreenShortcut(event)) {
        // F : plein écran natif (la couche fixe sert déjà de repli). Voir aussi
        // le bouton « Plein écran » de la barre.
        event.preventDefault();
        toggleImmersive();
      } else if ((key === 'escape' || key === 'p') && phaseRef.current === 'playing') {
        event.preventDefault();
        pauseRace();
      } else if ((key === 'escape' || key === 'p') && phaseRef.current === 'paused') {
        event.preventDefault();
        resumeRace();
      } else if (key === 'escape' && phaseRef.current === 'countdown') {
        event.preventDefault();
        setPhase('intro');
      } else if (key === 'enter' && (phaseRef.current === 'intro' || phaseRef.current === 'finished') && target !== 'BUTTON') {
        event.preventDefault();
        startRaceRef.current?.();
      } else if (key === 'm') {
        event.preventDefault();
        toggleSoundRef.current?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, pauseRace, resumeRace, toggleImmersive]);

  useEffect(() => () => {
    window.clearTimeout(toastTimerRef.current);
    window.clearTimeout(lapTimerRef.current);
  }, []);

  function showToast(message, tone = 'neutral') {
    window.clearTimeout(toastTimerRef.current);
    setToast({ message, tone, nonce: Date.now() });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2300);
  }
  function saveCareerProgress(nextProgress) {
    const safeProgress = normalizeCityRushProgress(nextProgress);
    careerProgressRef.current = safeProgress;
    setCareerProgress(safeProgress);
    writeCityRushProgress(safeProgress);
  }
  function showLapBanner(info) {
    window.clearTimeout(lapTimerRef.current);
    setLapBanner({ ...info, nonce: Date.now() });
    lapTimerRef.current = window.setTimeout(() => setLapBanner(null), info.final ? 2300 : 1800);
  }
  function startRace({ carId: requestedCarId = null } = {}) {
    const savedProgress = careerProgressRef.current;
    const courseId = storyMode ? (currentStoryRace?.city || cityId) : cityId;
    const selectedCarId = requestedCarId || carId;
    if (!isCityRushCourseUnlocked(savedProgress, courseId)) {
      setStoryMode(false);
      setIntroStep('city');
      setPhase('intro');
      showToast('COURSE VERROUILLÉE · TERMINE D’ABORD LE PARCOURS PRÉCÉDENT.', 'locked');
      return;
    }
    if (!isCityRushCarOwned(savedProgress, selectedCarId)) {
      setStoryMode(false);
      setIntroStep('garage');
      setPhase('intro');
      showToast('VOITURE VERROUILLÉE · ACHÈTE-LA AVEC TES BILLETS VERTS.', 'locked');
      return;
    }
    activeRaceSessionRef.current += 1;
    setWorldError('');
    setResult(null);
    setHud(EMPTY_HUD);
    setLapBanner(null);
    window.clearTimeout(lapTimerRef.current);
    setCountdown(3);
    setRunId((value) => value + 1);
    // Clic sur « LANCER » (« REJOUER », « CHAPITRE SUIVANT ») ou touche Entrée :
    // sur téléphone et dans l'application, la course s'ouvre en plein écran
    // natif, demandé ici — synchronement dans le geste, sinon le navigateur le
    // refuse. Sur ordinateur, un lancement ordinaire laisse l'écran comme il
    // est : le plein écran de base est déjà là, sinon c'est le bouton de la
    // barre ou la touche F qui le rouvre.
    if (opensFullscreenOnLaunch()) enterImmersive();
    if (soundOnRef.current) audioRef.current?.start();
    setPhase('countdown');
  }
  startRaceRef.current = startRace;

  function beginStory() {
    if (storyChapter >= STORY_CHAPTERS.length) {
      setStoryChapter(0);
      setStoryEnding('');
      try { window.localStorage.setItem(STORY_KEY, '0'); window.localStorage.removeItem(STORY_ENDING_KEY); } catch {}
    }
    const chapterIndex = storyChapter >= STORY_CHAPTERS.length ? 0 : storyChapter;
    const chapter = STORY_CHAPTERS[chapterIndex];
    const savedProgress = careerProgressRef.current;
    if (!isCityRushCourseUnlocked(savedProgress, chapter.city)) {
      setStoryMode(false);
      setPhase('intro');
      setIntroStep('city');
      setCityId('vice-city');
      showToast('CHAPITRE VERROUILLÉ · TERMINE D’ABORD LE PARCOURS PRÉCÉDENT.', 'locked');
      return;
    }
    const storyCarId = isCityRushCarOwned(savedProgress, carId)
      ? carId
      : (savedProgress.ownedCarIds[0] || CITY_RUSH_STARTER_CAR_ID);
    setStoryMode(true);
    setStoryRaceChapter(chapterIndex);
    setCarId(storyCarId);
    setCityId(chapter.city);
    setResult(null);
    setPhase('cinematic');
  }

  function chooseStoryEnding(ending) {
    if (!STORY_ENDINGS[ending]) return;
    setStoryEnding(ending);
    try { window.localStorage.setItem(STORY_ENDING_KEY, ending); } catch {}
  }

  function restartStory() {
    setStoryMode(false);
    setStoryChapter(0);
    setStoryRaceChapter(0);
    setStoryEnding('');
    setResult(null);
    try { window.localStorage.setItem(STORY_KEY, '0'); window.localStorage.removeItem(STORY_ENDING_KEY); } catch {}
    setPhase('intro');
    setIntroStep('mode');
  }

  function finishRace(rawResult) {
    // Sprint solo : chrono à zéro = course perdue, jamais une « 1re place ».
    const nextResult = rawResult?.timedOut ? { ...rawResult, rank: null } : rawResult;
    if (finishedRaceSessionRef.current === activeRaceSessionRef.current) return;
    finishedRaceSessionRef.current = activeRaceSessionRef.current;

    const courseId = nextResult.city || (storyMode ? currentStoryRace?.city : cityId) || 'vice-city';
    const progressBeforeRace = careerProgressRef.current;
    // Le gain dépend du mode : Circuit et Histoire paient au podium
    // (1er → 50 billets, 2e → 30, 3e → 10). Sprint et Poursuite valident
    // le parcours, mais ne rapportent pas de billets verts.
    const award = awardCityRushRace(progressBeforeRace, {
      courseId,
      completed: !nextResult.destroyed && !nextResult.timedOut,
      rank: nextResult.rank,
      modeId: storyMode ? VICE_CITY_STORY_MODE : modeId,
      sprint: Boolean(nextResult.sprint),
      destroyed: Boolean(nextResult.destroyed),
      timedOut: Boolean(nextResult.timedOut),
    });
    saveCareerProgress(award.progress);
    const courseIndex = CITY_RUSH_COURSES.findIndex((course) => course.id === courseId);
    const followingCourse = courseIndex >= 0 ? CITY_RUSH_COURSES[courseIndex + 1] : null;
    const newlyUnlockedCourse = followingCourse
      && !isCityRushCourseUnlocked(progressBeforeRace, followingCourse.id)
      && isCityRushCourseUnlocked(award.progress, followingCourse.id)
      ? followingCourse.id
      : null;
    setResult({
      ...nextResult,
      cashAwarded: award.cashAwarded,
      cashBalance: award.progress.cash,
      newlyUnlockedCourse,
    });
    // Trophées de jeu : chaque course terminée nourrit les succès Vice City
    // Rush (ville, mode, place, butin). En mode Histoire, une victoire crédite
    // aussi le chapitre joué — `storyRaceChapter` (0 = premier chapitre).
    trackAchievement('vice_city_run', {
      city: nextResult.city,
      mode: storyMode ? VICE_CITY_STORY_MODE : modeId,
      rank: nextResult.rank,
      score: nextResult.score,
      storyChapter: storyMode && nextResult.rank === 1 ? storyRaceChapter : null,
    });
    if (storyMode && nextResult.rank === 1) {
      const nextChapter = Math.min(STORY_CHAPTERS.length, storyChapter + 1);
      setStoryChapter(nextChapter);
      try { window.localStorage.setItem(STORY_KEY, String(nextChapter)); } catch {}
    }
    setPhase('finished');
    if (nextResult.rank === 1) {
      const previous = bests[nextResult.city];
      if (!previous || nextResult.duration < previous) {
        const nextBests = { ...bests, [nextResult.city]: nextResult.duration };
        setBests(nextBests);
        writeBests(nextBests);
      }
    }
  }

  function effectMessage(effect) {
    if (!effect) return;
    if (effect.type === 'pistol') showToast(`AK-47 · ${effect.target} TOUCHÉ · TOUPIE ET RALENTI ${formatSeconds(effect.duration, 2)}.`, 'pistol');
    else if (effect.type === 'pistol-hit-player') showToast(`AK-47 · ${effect.attacker} TE TOUCHE · RALENTI ${formatSeconds(effect.duration, 2)}.`, 'pistol');
    else if (effect.type === 'rival-boost') showToast(`${effect.rival} PASSE SUR UN PAD TURBO.`, 'boost');
    else if (effect.type === 'radio') showToast(
      `${effect.callerId && effect.callerId !== 'player' ? 'POLICE · FRAPPE D’HÉLICOPTÈRE UNIQUE' : 'HÉLICO EN APPROCHE'} · CIBLE : ${effect.target}.`,
      'radio',
    );
    else if (effect.type === 'missile-hit') showToast(`IMPACT · ${effect.target} immobilisé ${formatSeconds(effect.duration, 2)}.`, 'radio');
    else if (effect.type === 'radio-busy') showToast(effect.message, 'radio');
    else if (effect.type === 'radio-no-target') showToast('AUCUN RIVAL DEVANT TOI · LA JAUGE RESTE CHARGÉE.', 'radio');
    else if (effect.type === 'traffic-impact') showToast(effect.oncoming ? 'CHOC FRONTAL · LA VOITURE EN FACE EST POUSSÉE À GAUCHE.' : `CHOC · ${effect.traffic || 'TRAFIC'} · RALENTI.`, 'slow');
    else if (effect.type === 'empty') showToast('AUCUN OBJET · Ramasse la bonne icône sur la route.', 'neutral');
    else if (effect.type === 'rival-final-lap') showToast(`${effect.rival} ENTAME LE DERNIER TOUR.`, 'neutral');
    else if (effect.type === 'police-steal') showToast(`VOL DE BONUS · ${effect.police} A RAFLÉ L’AK-47 (ROUGE)${effect.ready ? ' · IL EST CHARGÉ' : ''}.`, 'pistol');
    else if (effect.type === 'police-rally') showToast(effect.targetId === 'player' ? `🚨 ${effect.police} TE PREND EN CHASSE · ELLE REJOINT L’ESCOUADE.` : `🚨 ${effect.police} PREND ${effect.target === 'player' ? 'TOI' : effect.target} EN CHASSE.`, 'pistol');
    else if (effect.type === 'police-hit' && effect.source === 'pistol') {
      showToast(`AK-47 · ${effect.police} TOUCHÉE.`, 'pistol');
    }
    else if (effect.type === 'police-destroyed') showToast(effect.byPlayer
      ? `💥 ${effect.police} DÉTRUITE · +200 PTS${effect.reinforcementScheduled ? ' · RENFORT EN ROUTE.' : ' · ELLE QUITTE LA COURSE.'}`
      : `💥 ${effect.police} DÉTRUITE${effect.reinforcementScheduled ? ' · RENFORT EN ROUTE.' : ' · ELLE QUITTE LA COURSE.'}`, 'radio');
    else if (effect.type === 'police-reinforcement') showToast(`🚨 RENFORT · ${effect.police} TE PREND EN CHASSE.`, 'pistol');
    else if (effect.type === 'tunnel-enter' && effect.closed > 0) {
      const wall = effect.walls > 1 ? 'PAROIS DES DEUX CÔTÉS' : `PAROI À ${effect.side === 'left' ? 'GAUCHE' : 'DROITE'}`;
      showToast(`${effect.name} · ${effect.open} VOIES OUVERTES SUR 4 · ${wall}.`, 'neutral');
    }
    else if (effect.type === 'sprint-timeout') showToast(`TEMPS ÉCOULÉ · ${effect.checkpoints} / ${CITY_RUSH_SPRINT_CHECKPOINTS} CHECKPOINTS.`, 'slow');
    else if (effect.type === 'tunnel-scrape') showToast('PAROI RACLÉE · LA VOIE EST MURÉE SOUS LE TUNNEL · RALENTI.', 'slow');
  }

  const onLap = (info) => {
    if (!info || (!info.sprint && info.lap > info.laps)) return;
    showLapBanner(info);
  };
  const onPowerPickup = (pickup) => {
    if (pickup.type === CITY_RUSH_PICKUPS.BOOST) {
      showToast(`PAD TURBO · ACCÉLÉRATION PENDANT ${formatSeconds(CITY_RUSH_TRACK_BOOST_DURATION)}.`, 'boost');
      return;
    }
    const rule = CITY_RUSH_POWER_RULES[pickup.type];
    if (!rule) return;
    const progress = Math.min(rule.chargeCost, pickup.progress || 0);
    const message = pickup.newlyReady
      ? `${rule.shortName.toUpperCase()} CHARGÉ · TOUCHE ${rule.key}`
      : pickup.ready
        ? `${rule.shortName.toUpperCase()} · JAUGE PLEINE (${progress}/${rule.chargeCost})`
        : `${rule.shortName.toUpperCase()} · CHARGEMENT ${progress}/${rule.chargeCost}`;
    showToast(message, pickup.type);
  };

  // Les vignettes sont les actions principales : mode → parcours → voiture.
  // Le dernier choix lance directement le compte à rebours, sans bouton séparé.
  const chooseMode = (nextModeId) => {
    setStoryMode(false);
    setModeId(nextModeId);
    setIntroStep('city');
  };
  const chooseCity = (nextCityId) => {
    if (!isCityRushCourseUnlocked(careerProgressRef.current, nextCityId)) {
      const index = CITY_RUSH_COURSES.findIndex((course) => course.id === nextCityId);
      const previous = index > 0 ? CITY_RUSH_COURSES[index - 1] : null;
      showToast(`COURSE VERROUILLÉE · TERMINE ${previous?.name || 'LE PARCOURS PRÉCÉDENT'}.`, 'locked');
      return;
    }
    setStoryMode(false);
    setCityId(nextCityId);
    setIntroStep('garage');
  };
  const chooseCarAndStart = (nextCarId) => {
    const car = CITY_RUSH_CARS.find((item) => item.id === nextCarId);
    if (!car) return;
    const savedProgress = careerProgressRef.current;
    if (!isCityRushCarOwned(savedProgress, nextCarId)) {
      const purchase = purchaseCityRushCar(savedProgress, nextCarId);
      if (!purchase.purchased) {
        if (purchase.reason === 'insufficient-funds') {
          showToast(`IL TE MANQUE ${formatCash(car.price - savedProgress.cash)} BILLETS VERTS.`, 'locked');
        }
        return;
      }
      saveCareerProgress(purchase.progress);
      setCarId(nextCarId);
      showToast(`${car.name} DÉBLOQUÉE · ${formatCash(car.price)} BILLETS DÉPENSÉS · TOUCHE-LA POUR PARTIR.`, 'boost');
      return;
    }
    setStoryMode(false);
    setCarId(nextCarId);
    startRace({ carId: nextCarId });
  };
  const goBack = () => {
    if (introStep === 'garage') setIntroStep('city');
    else if (introStep === 'city') setIntroStep('mode');
  };

  return (
    <div className={`city-rush-page${immersive ? ' is-immersive' : ''}`} style={{ '--city-accent': city.accent, '--city-secondary': city.secondary, '--mode-accent': mode.accent, '--mode-secondary': mode.secondary }}>
      <header className="city-rush-heading wrap">
        <div>
          <p className="city-rush-eyebrow"><span className="city-rush-live-dot" /> LET’S PLAY ARCADE <span style={{ opacity: 0.4, margin: '0 6px' }}>/</span> UNE VILLE. UNE ROUTE. AUCUNE LIMITE.</p>
          <h1><span>VICE CITY</span><em>RUSH</em></h1>
          <p className="city-rush-lede">
            Le soleil a ses ombres. La rue a ses règles. Incarne Nico Vega dans une course à la revanche, ou impose ton rythme sur sept parcours : cinq villes, la mythique Route 66 et une route de campagne ensoleillée au Mexique.
          </p>
          <div className="city-rush-hero-details"><span>1986 / OCEAN DRIVE</span><span>5 VILLES · 2 ROUTES</span><span>3 MODES DE COURSE</span></div>
          <div className="city-rush-hero-actions">
            <a className="city-rush-hero-cta" href="#vice-city-rush-console">
              LANCER LE JEU <span aria-hidden="true">▶</span>
            </a>
          </div>
        </div>
        <Link to="/jeu" className="city-rush-back">← RETOUR AUX JEUX</Link>
      </header>

      <main className="city-rush-layout wrap">
        <section id="vice-city-rush-console" className={`city-rush-shell${phase === 'playing' ? ' is-running' : ''}${immersive ? ' is-immersive' : ''}`} ref={shellRef} aria-label="Partie de Vice City Rush">
          <div className="city-rush-topbar">
            <div className="city-rush-location">
              <span className="city-rush-location-mark" aria-hidden="true">{storyMode ? '★' : introStep === 'mode' ? mode.icon : '⌖'}</span>
              <span>
                <b>VICE CITY <em>RUSH</em></b>
                <small>
                  {storyMode
                    ? <>{currentStoryRace?.race?.name || city.district} <i>·</i> {currentStoryRace?.race?.type || city.label} · {currentLaps} TOURS</>
                    : introStep === 'mode'
                      ? `${city.name} · ${mode.label}`
                      : introStep === 'city'
                        ? `${city.district} · ${city.tagline}`
                        : `${city.district} · ${mode.name} · ${selectedCar.name}`}
                </small>
              </span>
            </div>
            <div className="city-rush-top-actions">
              <div className="city-rush-wallet" aria-label={`Portefeuille : ${formatCash(careerProgress.cash)} billets verts`} aria-live="polite">
                <svg className="city-rush-wallet-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
                  <path d="M3 8.5h18M15.5 12h6M6 5l1.5-2h9L18 5" />
                  <circle cx="15.5" cy="13.2" r="1.25" />
                </svg>
                <span><b>{formatCash(careerProgress.cash)}</b><small>BILLETS</small></span>
              </div>
              <button type="button" className={`city-rush-top-button city-rush-sound-button${soundOn ? ' is-on' : ''}`} onClick={toggleSound} aria-pressed={soundOn} title={soundOn ? 'Couper son (M)' : 'Activer son (M)'} aria-label={soundOn ? 'Couper le son' : 'Activer le son'}>
                <span aria-hidden="true">{soundOn ? '♫' : '♪'}</span>
              </button>
              <button
                type="button"
                className={`city-rush-top-button city-rush-fullscreen-button${immersive ? ' is-on' : ''}`}
                onClick={(event) => {
                  toggleImmersive();
                  // Après un clic (souris ou doigt), le bouton rend le focus : un
                  // bouton qui le garde recevrait aussi Espace et Entrée (relancer
                  // depuis l'arrivée). Au clavier (detail 0), le focus reste où il est.
                  if (event.detail > 0) event.currentTarget.blur();
                }}
                aria-pressed={immersive}
                aria-label="Plein écran"
                title={immersive ? 'Quitter le plein écran (F)' : 'Plein écran (F)'}
              >
                <FullscreenIcon exit={immersive} />
                <span className="city-rush-fullscreen-label">PLEIN ÉCRAN</span>
              </button>
              {phase === 'playing' && <>
                <span className="city-rush-live-pill"><i /> {activeModeName} · EN COURSE</span>
                <button type="button" className="city-rush-top-button" onClick={pauseRace}>Ⅱ PAUSE</button>
                <button type="button" className="city-rush-top-button is-quiet" onClick={() => { setStoryMode(false); setPhase('intro'); setIntroStep('mode'); }}>↶ MENU</button>
              </>}
              {phase === 'paused' && <>
                <span className="city-rush-live-pill is-paused"><i /> PAUSE</span>
                <button type="button" className="city-rush-top-button is-resume" onClick={resumeRace}>▶ REPRENDRE</button>
              </>}
              <span className="city-rush-top-flag"><i /> {sprintMode ? `SOLO · ${CITY_RUSH_SPRINT_CHECKPOINTS} CHECKPOINTS` : <>{currentLaps} TOUR{currentLaps > 1 ? 'S' : ''} · 4 VOIES</>}</span>
            </div>
          </div>

          <div className={`city-rush-viewport${phase === 'intro' ? ' is-intro' : ''}${phase === 'playing' ? ' is-live' : ''}${hud.boostLeft > 0 && phase === 'playing' ? ' is-boosting' : ''}${hud.stunLeft > 0 && phase === 'playing' ? ' is-stunned' : ''}${hud.trafficImpactLeft > 0 && phase === 'playing' ? ' is-impacting' : ''}${hud.playerHealthFlash > 0 && phase === 'playing' ? ' is-hurt' : ''}`}>
            <ViceCityWorld cityId={cityId} carId={selectedCar.id} active={phase === 'playing'} phase={phase} countdown={countdown} runId={runId} roster={roster} raceLaps={currentLaps} racePoliceFromStart={storyMode ? false : mode.policeFromStart} raceFormat={sprintMode ? 'sprint' : 'laps'} actionsRef={actionsRef} onReady={() => setWorldError('')} onError={(message) => setWorldError(message)} onHud={setHud} onFinish={finishRace} onPickup={onPowerPickup} onEffect={effectMessage} onLap={onLap} audioRef={audioRef} />
            <div className="city-rush-vignette" aria-hidden="true" />

            {phase === 'playing' && <>
              <div className="city-rush-hud-top">
                {sprintMode ? (
                <div className="city-rush-hud-card city-rush-position-card">
                  <span className="city-rush-hud-label">SOLO</span>
                  <strong>{formatTime(hud.elapsed)}</strong>
                </div>
                ) : (
                <div className="city-rush-hud-card city-rush-position-card">
                  <span className="city-rush-hud-label">POSITION</span>
                  <strong>{ordinal(hud.rank)}<small> / 3</small></strong>
                  <div className="city-rush-mini-lights"><i className={hud.rank === 1 ? 'is-lit' : ''} /><i className={hud.rank === 2 ? 'is-lit' : ''} /><i className={hud.rank === 3 ? 'is-lit' : ''} /></div>
                </div>
                )}
                {sprintMode && hud.sprint ? (
                <div className={`city-rush-hud-card city-rush-distance-card city-rush-lap-card${hud.sprint.timeLeft <= 5 ? ' is-final' : ''}`}>
                  <span className="city-rush-hud-label">CHECKPOINT · {activeModeName}</span>
                  <strong>{Math.min(hud.sprint.checkpoints + 1, hud.sprint.total)}<small> / {hud.sprint.total}</small><em>{hud.sprint.timeLeft.toFixed(1)} s · {hud.sprint.nextIn} m</em></strong>
                  <div className="city-rush-lap-track" aria-label={`Checkpoint ${hud.sprint.checkpoints} sur ${hud.sprint.total}, ${Math.ceil(hud.sprint.timeLeft)} secondes restantes`}>
                    {Array.from({ length: hud.sprint.total }, (_, i) => i + 1).map((slot) => (
                      <span key={slot} className={slot <= hud.sprint.checkpoints ? 'is-done' : slot === hud.sprint.checkpoints + 1 ? 'is-current' : ''}>
                        <i style={{ width: slot <= hud.sprint.checkpoints ? '100%' : slot === hud.sprint.checkpoints + 1 ? `${Math.max(0, Math.min(100, (hud.sprint.timeLeft / CITY_RUSH_SPRINT_CHECKPOINT_TIME) * 100))}%` : '0%' }} />
                      </span>
                    ))}
                  </div>
                </div>
                ) : (
                <div className={`city-rush-hud-card city-rush-distance-card city-rush-lap-card${hud.lap >= hud.laps ? ' is-final' : ''}`}>
                  <span className="city-rush-hud-label">{hud.lap >= hud.laps ? 'DERNIER TOUR' : 'TOUR'} · {activeModeName}</span>
                  <strong>{Math.min(hud.lap || 1, hud.laps || currentLaps)}<small> / {hud.laps || currentLaps}</small><em>{hud.lapDistance} / {hud.lapLength || CITY_RUSH_LAP_LENGTH} m</em></strong>
                  <div className="city-rush-lap-track" aria-label={`Tour ${hud.lap} sur ${hud.laps}`}>
                    {Array.from({ length: hud.laps || currentLaps }, (_, i) => i + 1).map((slot) => (
                      // Le segment du dernier tour est aussi large que ses boucles : la jauge montre qu'il est plus long.
                      <span key={slot} className={slot < hud.lap ? 'is-done' : slot === hud.lap ? 'is-current' : ''} style={{ flexGrow: slot >= (hud.laps || currentLaps) ? CITY_RUSH_FINAL_LAP_LOOPS : 1 }}>
                        <i style={{ width: slot < hud.lap ? '100%' : slot === hud.lap ? `${Math.max(0, Math.min(100, (hud.lapProgress || 0) * 100))}%` : '0%' }} />
                      </span>
                    ))}
                  </div>
                </div>
                )}
                <div className="city-rush-hud-card city-rush-speed-card">
                  <span className="city-rush-hud-label">VITESSE</span>
                  <strong>{hud.speed}<small> km/h</small></strong>
                  <span className="city-rush-time">{formatTime(hud.elapsed)}</span>
                </div>
              </div>

              {/* La barre de coque ne se dessine que sur le dernier tour : le
                  monde l'active là, et cette garde le garantit même si un HUD
                  en retard arrivait d'une course précédente. */}
              {playerHealthValue !== null && !sprintMode && hud.lap >= hud.laps && (
                <div
                  className={`city-rush-health${playerHealthCritical ? ' is-critical' : ''}${hud.playerHealthFlash > 0 ? ' is-hit' : ''}`}
                  role="status"
                  aria-label={`Résistance de ta voiture : ${playerHealthValue} carrés sur ${playerHealthMax}`}
                >
                  <span className="city-rush-health-head">
                    <b>COQUE</b>
                    <small>{playerHealthCritical ? 'CRITIQUE' : 'SOUS LE FEU'}</small>
                  </span>
                  <span className="city-rush-health-track" aria-hidden="true">
                    <i style={{ width: `${playerHealthPercent}%`, background: playerHealthColor, boxShadow: `0 0 14px ${playerHealthColor}` }} />
                  </span>
                </div>
              )}

              {/* Plaque de signalisation de la route officielle : sur la Shuto
                  C1 de Tokyo elle donne le secteur, le point kilométrique, la
                  couverture (tunnel ou tranchée) et la prochaine jonction. */}
              {hud.route?.sector && (
                <div
                  className={`city-rush-route-sign${hud.route.cover?.covered ? ' is-tunnel' : ''}${hud.route.cover?.kind === 'cut' ? ' is-cut' : ''}`}
                  aria-label={`Signalisation ${hud.route.marker} ${hud.route.direction} : secteur ${hud.route.sector.name}, point kilométrique ${hud.route.km}${hud.route.next ? `, prochaine jonction ${hud.route.next.name} dans ${hud.route.next.aheadM} mètres` : ''}`}
                >
                  <span className="city-rush-route-badge">{hud.route.marker}</span>
                  <span className="city-rush-route-sector">
                    <b>{hud.route.sector.name}</b>
                    <small>{hud.route.sector.romaji} · km {hud.route.km} · {hud.route.direction}</small>
                  </span>
                  {hud.route.cover?.covered && (
                    <span className="city-rush-route-cover">TUNNEL · {hud.route.cover.name}</span>
                  )}
                  {hud.route.cover?.kind === 'cut' && (
                    <span className="city-rush-route-cover is-cut">TRANCHÉE · {hud.route.cover.name}</span>
                  )}
                  {hud.route.next && (
                    <span className="city-rush-route-next">
                      <i aria-hidden="true">{hud.route.next.sign?.arrow || '↑'}</i>
                      <span>
                        <b>{hud.route.next.name}</b>
                        <small>{hud.route.next.aheadM} m</small>
                      </span>
                    </span>
                  )}
                </div>
              )}

              <div className="city-rush-gta-cash" aria-label={`Butin : ${hud.score || 0} points`}>
                <b>{(hud.score || 0).toLocaleString('fr-FR')} PTS</b>
                <small>{formatTime(hud.elapsed)}</small>
                {wantedStars > 0 && (
                  <span className="city-rush-gta-wanted" role="status" aria-label={`Police en chasse · niveau ${wantedStars} sur 5`}>
                    {[1, 2, 3, 4, 5].map((star) => <i key={star} className={star <= wantedStars ? 'is-on' : ''} aria-hidden="true">★</i>)}
                  </span>
                )}
              </div>

              {!sprintMode && <div className="city-rush-radar">
                <CityRushRaceList racers={standings} pursuers={hud.police} laps={currentLaps} />
              </div>}

              {(hud.boostLeft > 0 || hud.slowLeft > 0 || hud.trafficImpactLeft > 0 || hud.stunLeft > 0) && (
                <div className={`city-rush-status-pill${hud.stunLeft > 0 ? ' is-stunned' : hud.trafficImpactLeft > 0 ? ' is-impact' : hud.boostLeft > 0 ? ' is-boost' : ' is-slow'}`}>
                  {hud.stunLeft > 0 ? `MISSILE · ${hud.stunLeft.toFixed(1)} s` : hud.trafficImpactLeft > 0 ? `CHOC · ${hud.trafficImpactLeft.toFixed(1)} s` : hud.boostLeft > 0 ? `TURBO · ${hud.boostLeft.toFixed(1)} s` : `RALENTI · ${hud.slowLeft.toFixed(1)} s`}
                </div>
              )}
              {toast && <div className={`city-rush-toast is-${toast.tone}`} key={toast.nonce} role="status">{toast.message}</div>}
              {lapBanner && (
                <div className={`city-rush-lap-banner${lapBanner.final ? ' is-final' : ''}`} key={lapBanner.nonce} role="status" aria-live="polite">
                  {lapBanner.sprint ? <>
                  <span>{`CHECKPOINT ${lapBanner.checkpoint} / ${lapBanner.checkpoints}`}</span>
                  <strong>+{lapBanner.timeBonus} S</strong>
                  <small>{lapBanner.remaining > 1 ? `Encore ${lapBanner.remaining} checkpoints · ${formatTime(lapBanner.elapsed)}` : 'Prochain checkpoint : l’arrivée !'}</small>
                  </> : <>
                  <span>{lapBanner.checkpoint ? checkpointKicker(lapBanner.remaining) : lapBanner.final ? 'LIGNE FRANCHIE · DERNIER TOUR' : `LIGNE FRANCHIE · TOUR ${lapBanner.lap} / ${lapBanner.laps}`}</span>
                  <strong>{lapBanner.checkpoint ? `PLUS QUE ${lapBanner.remaining} M` : lapBanner.final ? 'FINAL LAP' : `LAP ${lapBanner.lap}`}</strong>
                  <small>{lapBanner.checkpoint ? 'Ce n’est pas encore l’arrivée · tout donner.' : lapBanner.final ? `Plus que ${lapBanner.remaining} m · tout donner.` : `${(lapBanner.laps - lapBanner.lap + 1)} tours restants · ${formatTime(lapBanner.elapsed)}`}</small>
                  </>}
                </div>
              )}
              <div className="city-rush-controls-bottom">
                <div className="city-rush-steering" aria-label="Changer de voie">
                  <button
                    type="button"
                    onPointerDown={(event) => { event.preventDefault(); actionsRef.current?.('left'); }}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); actionsRef.current?.('left'); } }}
                    aria-label="Aller à gauche"
                  >←</button>
                  <span>VOIES</span>
                  <button
                    type="button"
                    onPointerDown={(event) => { event.preventDefault(); actionsRef.current?.('right'); }}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); actionsRef.current?.('right'); } }}
                    aria-label="Aller à droite"
                  >→</button>
                </div>
                {/* Le Sprint n'a ni bonus au sol ni arme : le bouton AK-47 ne
                    s'affiche pas, il resterait désespérément vide. */}
                {!sprintMode && (() => {
                  const type = CITY_RUSH_POWERS.PISTOL;
                  const rule = CITY_RUSH_POWER_RULES[type];
                  const progress = Math.min(rule.chargeCost, Math.max(0, Number(hud.inventory?.[type]) || 0));
                  const ready = progress >= rule.chargeCost;
                  return (
                    <button
                      type="button"
                      className={`city-rush-machine-gun-button${ready ? ' is-ready' : ''}`}
                      onClick={() => actionsRef.current?.(type)}
                      disabled={!ready}
                      title={ready ? 'AK-47 chargé · appuie pour tirer tout droit' : 'Ramasse un bonus rouge pour charger l’AK-47'}
                      aria-label={ready ? 'Tirer à l’AK-47' : `AK-47 : ${progress}/${rule.chargeCost}, ramasse un bonus rouge`}
                    >
                      <span className="city-rush-machine-gun-label">AK-47</span>
                      <span className="city-rush-machine-gun-icon"><PowerIcon type={type} /></span>
                      <span className="city-rush-machine-gun-status">{ready ? 'TIRER' : `${progress} / ${rule.chargeCost}`}</span>
                    </button>
                  );
                })()}
              </div>
            </>}

            {phase === 'intro' && (
              <div className="city-rush-overlay city-rush-intro">
                {/* Stepper */}
                <div className="city-rush-stepper" aria-label="Étapes de préparation">
                  {[
                    { id: 'mode', label: 'MODE' },
                    { id: 'city', label: 'VILLE' },
                    { id: 'garage', label: 'GARAGE' },
                  ].map((step, idx) => (
                    <button
                      key={step.id}
                      type="button"
                      className={`city-rush-stepper-item${introStep === step.id ? ' is-active' : ''}${['mode','city','garage'].indexOf(introStep) > idx ? ' is-done' : ''}`}
                      onClick={() => { setStoryMode(false); setIntroStep(step.id); }}
                      aria-current={introStep === step.id ? 'step' : undefined}
                    >
                      <i>{idx + 1}</i><b>{step.label}</b>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="city-rush-stepper-item is-story"
                    onClick={beginStory}
                  >
                    <i>★</i><b>HISTOIRE · NICO VEGA</b>
                  </button>
                </div>

                {introStep === 'mode' && (
                  <>
                    <div className="city-rush-intro-copy">
                      <span className="city-rush-overlay-kicker"><i /> VICE CITY · 1986 · ARCADE RACING</span>
                      <h2>VICE CITY<br /><em>RUSH.</em></h2>
                      <p>La ville est à toi. Termine chaque parcours pour ouvrir le suivant. Le Circuit et l’Histoire remplissent ton portefeuille : le 1er gagne 50 billets verts, le 2e 30 et le 3e 10 — de quoi débloquer de nouvelles voitures. Sprint et Poursuite sont des modes défi sans gain d’argent. Vice City t’attend pour le départ.</p>
                    </div>

                    <button
                      type="button"
                      className="city-rush-story-banner"
                      onClick={beginStory}
                      aria-label={`Lancer le mode histoire de Nico Vega${storyChapter >= STORY_CHAPTERS.length ? ', recommencer la campagne' : `, chapitre ${nextStoryIndex + 1} sur ${STORY_CHAPTERS.length}`}`}
                    >
                      <span className="city-rush-story-banner-visual" aria-hidden="true">
                        <img src={`${import.meta.env.BASE_URL || '/'}vice-city-story-vice-city.webp`} alt="" />
                        <span className="city-rush-story-banner-badge">
                          {storyChapter >= STORY_CHAPTERS.length
                            ? 'CAMPAGNE TERMINÉE'
                            : `CHAPITRE ${String(nextStoryIndex + 1).padStart(2, '0')} / ${String(STORY_CHAPTERS.length).padStart(2, '0')}`}
                        </span>
                      </span>
                      <span className="city-rush-story-banner-body">
                        <span className="city-rush-story-banner-meta">
                          <span className="city-rush-mode-tag" style={{ '--tag-accent': '#ff5d7e' }}>CAMPAGNE SOLO</span>
                          <small>{selectedCar.name} · {previewStoryCity.name.toUpperCase()} · {previewStoryChapter.title.toUpperCase()}</small>
                        </span>
                        <b>MODE HISTOIRE · NICO VEGA</b>
                        <span className="city-rush-story-description">{previewStoryChapter.text}</span>
                        <span className="city-rush-story-banner-actions">
                          <span className="city-rush-story-launch-label">MODE HISTOIRE · NICO VEGA <i aria-hidden="true">↗</i></span>
                          <small>6 courses · cinématiques · progression sauvegardée</small>
                        </span>
                      </span>
                    </button>

                    <div className="city-rush-mode-picker" role="group" aria-label="Choisir un mode de course">
                      {RACE_MODES.map((m, index) => (
                        <button
                          key={m.id}
                          type="button"
                          className={`city-rush-mode-card${modeId === m.id ? ' is-selected' : ''}`}
                          style={{ '--mode-accent': m.accent, '--mode-secondary': m.secondary }}
                          onClick={() => chooseMode(m.id)}
                          aria-pressed={modeId === m.id}
                        >
                          <span className="city-rush-mode-number">0{index + 1}</span>
                          <span className="city-rush-mode-tag" style={{ '--tag-accent': m.accent }}>{m.tag}</span>
                          <span className="city-rush-mode-icon" aria-hidden="true">{m.icon}</span>
                          <b>{m.name}</b>
                          <small>{m.label}</small>
                          <span className="city-rush-mode-description">{m.desc}</span>
                          <span className="city-rush-mode-card-footer">
                            <span className="city-rush-mode-laps"><i />{m.format === 'sprint' ? `${m.checkpoints} CHECKPOINTS · ${CITY_RUSH_SPRINT_DISTANCE} M` : `${m.laps} TOUR${m.laps > 1 ? 'S' : ''} · ${cityRushRaceDistance(m.laps)} M`}</span>
                            <span className="city-rush-card-action">VILLE <i aria-hidden="true">↗</i></span>
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="city-rush-intro-actions">
                      <span className="city-rush-selection-hint">Choisis une vignette de mode pour continuer <i aria-hidden="true">↗</i></span>
                      <div className="city-rush-best-note"><span>MODE LIBRE SÉLECTIONNÉ</span><b>{mode.name}</b></div>
                    </div>
                  </>
                )}

                {introStep === 'city' && (
                  <>
                    <div className="city-rush-intro-copy">
                      <span className="city-rush-overlay-kicker"><i /> 02 / VILLE · {mode.name}</span>
                      <h2>{daylight ? 'LE SOLEIL' : 'LA NUIT'}<br /><em>DE {city.name}.</em></h2>
                      <p>{city.tagline} Circuit de {CITY_RUSH_LAP_LENGTH} m en boucle{city.route ? (city.id === 'route-66' ? ` — traversée condensée de la ${city.route.name}, de ${city.route.endpoints[0]} à ${city.route.endpoints[1]} (${city.route.lengthKm.toLocaleString('fr-FR')} km historiques)` : ` — chaque boucle rejoue un tiers des ${city.route.lengthKm.toLocaleString('fr-FR')} km de la ${city.route.name} (${city.route.direction})`) : ''}, {sprintMode ? `${CITY_RUSH_SPRINT_CHECKPOINTS} checkpoints, 15 s par checkpoint = ${currentDistance} m` : `${currentLaps} tour${currentLaps > 1 ? 's' : ''} dont un dernier tour double = ${currentDistance} m`}. Mode {mode.name} : {mode.desc.toLowerCase()}</p>
                    </div>
                    <div className="city-rush-city-picker is-large" role="group" aria-label="Choisir une ville">
                      {CITY_RUSH_COURSES.map((option, index) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`city-rush-city-card${cityId === option.id ? ' is-selected' : ''}${option.id === 'route-66' ? ' is-route-66' : ''}${isCityRushCourseUnlocked(careerProgress, option.id) ? '' : ' is-locked'}`}
                          style={{ '--card-accent': option.accent, '--card-secondary': option.secondary }}
                          onClick={() => chooseCity(option.id)}
                          disabled={!isCityRushCourseUnlocked(careerProgress, option.id)}
                          aria-label={`${option.name} · ${isCityRushCourseUnlocked(careerProgress, option.id) ? 'parcours débloqué' : `verrouillé, termine ${CITY_RUSH_COURSES[index - 1]?.name || 'le précédent'}`}`}
                          aria-pressed={cityId === option.id}
                        >
                          <span className={`city-rush-city-thumb is-${option.id}`} aria-hidden="true">
                            <img
                              src={`${import.meta.env.BASE_URL || '/'}${CITY_THUMBNAILS[option.id] || CITY_THUMBNAILS['vice-city']}`}
                              alt=""
                              loading="lazy"
                              decoding="async"
                            />
                          </span>
                          <span className="city-rush-city-number">0{index + 1}</span>
                          <b>{option.name}</b>
                          <small>{option.district} · {option.label}</small>
                          <span className={`city-rush-course-status${isCityRushCourseUnlocked(careerProgress, option.id) ? ' is-open' : ' is-locked'}`}>
                            {isCityRushCourseUnlocked(careerProgress, option.id)
                              ? careerProgress.completedCourseIds.includes(option.id) ? '✓ PARCOURS TERMINÉ' : '● PARCOURS DÉBLOQUÉ'
                              : `🔒 APRÈS ${CITY_RUSH_COURSES[index - 1]?.name || 'LE PRÉCÉDENT'}`}
                          </span>
                          {/* Plaque de route : un emplacement est réservé même
                              sans route officielle (fantôme invisible) pour que
                              toutes les cartes aient exactement la même taille. */}
                          <em className={`city-rush-city-route${option.route ? '' : ' is-ghost'}`} aria-hidden={option.route ? undefined : 'true'}>
                            {option.route ? (
                              <>
                                <i>{option.route.marker}</i> {option.route.lengthKm.toLocaleString('fr-FR')} km · {option.route.direction} · {option.route.speedLimit} {option.route.speedUnit || 'km/h'}
                              </>
                            ) : (
                              <>
                                <i>·</i> —
                              </>
                            )}
                          </em>
                          <span className="city-rush-city-card-footer">
                            <span className="city-rush-city-preview" aria-hidden="true">
                              <i style={{ background: option.accent }} /><i style={{ background: option.secondary }} />
                            </span>
                            <span className="city-rush-card-action">{isCityRushCourseUnlocked(careerProgress, option.id) ? <>GARAGE <i aria-hidden="true">↗</i></> : 'VERROUILLÉE'}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    {worldError && <p className="city-rush-error" role="alert">Le moteur 3D n’a pas pu démarrer : {worldError}</p>}
                    <div className="city-rush-intro-actions">
                      <button type="button" className="city-rush-text-button" onClick={goBack}>← MODE</button>
                      <span className="city-rush-selection-hint">Choisis une course pour ouvrir le garage <i aria-hidden="true">↗</i></span>
                      <div className="city-rush-best-note"><span>MEILLEUR CHRONO · {city.name}</span><b>{bestTime ? formatTime(bestTime) : '— : —'}</b></div>
                    </div>
                  </>
                )}

                {introStep === 'garage' && (
                  <>
                    <div className="city-rush-intro-copy">
                      <span className="city-rush-overlay-kicker"><i /> 03 / GARAGE · {city.district} · {mode.name}</span>
                      <h2>PRÊT À<br /><em>ROULER.</em></h2>
                      <p>La Mistral 1.4, citadine 5 portes inspirée d’une petite française des années 90 (sans badge ni logo), est ta voiture de départ. {cashRewardsEnabled ? '50 billets verts pour la victoire, 30 pour la 2e place et 10 pour la 3e : cours pour acheter les sept autres modèles.' : `${mode.name} est un mode défi : il ne rapporte aucun billet vert, même à l’arrivée.`}</p>
                    </div>

                    <section className="city-rush-driver-select" aria-labelledby="city-rush-driver-title">
                      <div className="city-rush-car-select-heading">
                        <span id="city-rush-driver-title">PILOTE · FACULTATIF · {mode.name}</span>
                        {/* En Sprint, les trois visages sont des identités au
                            choix, pas une grille de départ : on le dit, sinon
                            ils ressemblent à des adversaires. */}
                        {sprintMode && <small>SPRINT SOLO · AUCUN ADVERSAIRE EN PISTE</small>}
                      </div>
                      <div className="city-rush-driver-grid" role="group" aria-label="Choisir un pilote">
                        {roster.map((driver) => (
                          <button
                            type="button"
                            key={driver.id}
                            className={`city-rush-driver-pill${driver.isPlayer ? ' is-player' : ''}`}
                            style={{ '--driver-accent': driver.isPlayer ? '#43ead5' : driver.accent }}
                            onClick={() => setPlayerDriverId(driver.driverId)}
                            aria-pressed={driver.isPlayer}
                            aria-label={`Choisir ${driver.displayName}, ${driver.country}`}
                          >
                            <span className="city-rush-driver-pill-avatar"><CityRushDriverAvatar driver={driver} decorative /></span>
                            <span className="city-rush-driver-pill-copy">
                              <b>{driver.name}{driver.isPlayer && <em className="city-rush-you-badge">TOI</em>}</b>
                              <small>{driver.flag} {driver.country}</small>
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="city-rush-car-select" aria-labelledby="city-rush-car-title">
                      <div className="city-rush-car-select-heading">
                        <span id="city-rush-car-title">GARAGE · {CITY_RUSH_CARS.length} VOITURES</span>
                        <small>{formatCash(careerProgress.cash)} BILLETS VERTS · {selectedCar.name} · TOUCHE POUR PARTIR</small>
                      </div>
                      <div className="city-rush-car-grid" role="group" aria-label="Lancer une course avec une voiture">
                        {CITY_RUSH_CARS.map((car, index) => {
                          const owned = isCityRushCarOwned(careerProgress, car.id);
                          const canAfford = careerProgress.cash >= (Number(car.price) || 0);
                          const shortfall = Math.max(0, (Number(car.price) || 0) - careerProgress.cash);
                          return (
                            <button
                              key={car.id}
                              type="button"
                              className={`city-rush-car-card${carId === car.id ? ' is-selected' : ''}${owned ? '' : ' is-locked'}${!owned && !canAfford ? ' is-unaffordable' : ''}`}
                              style={{ '--car-accent': car.accent }}
                              onClick={() => chooseCarAndStart(car.id)}
                              disabled={!owned && !canAfford}
                              aria-label={owned
                                ? `Lancer le mode ${mode.name} à ${city.name} avec ${car.name}`
                                : canAfford
                                  ? `Acheter ${car.name} pour ${formatCash(car.price)} billets verts`
                                  : `${car.name} verrouillée, il manque ${formatCash(shortfall)} billets verts`}
                            >
                              <span className="city-rush-car-card-top">
                                <span className="city-rush-car-image" aria-hidden="true">
                                  <img
                                    src={`${import.meta.env.BASE_URL || '/'}${CAR_THUMBNAILS[car.id] || CAR_THUMBNAILS['vice-roadster']}`}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                  />
                                </span>
                                <span className="city-rush-car-number">0{index + 1}</span>
                                <span className={`city-rush-car-lock-badge${owned ? ' is-owned' : ''}`}>
                                  {owned ? car.id === CITY_RUSH_STARTER_CAR_ID ? 'DÉPART' : 'ACHETÉE' : `🔒 ${formatCash(car.price)} $`}
                                </span>
                              </span>
                              <b className="city-rush-car-name">{car.name}</b>
                              <small className="city-rush-car-class">{car.className}</small>
                              <span className="city-rush-car-stats">
                                {CAR_STATS.map((stat) => (
                                  <span className="city-rush-car-stat" key={stat.key}>
                                    <small>{stat.label}</small>
                                    <i className="city-rush-car-stat-track" aria-hidden="true"><i style={{ width: `${car[stat.key]}%` }} /></i>
                                    <b>{car[stat.key]}</b>
                                  </span>
                                ))}
                              </span>
                              <span className={`city-rush-card-action${owned ? ' is-launch' : ' is-purchase'}`}>
                                {owned ? <>LANCER LA COURSE <i aria-hidden="true">↗</i></> : canAfford ? `ACHETER · ${formatCash(car.price)} BILLETS` : `MANQUE ${formatCash(shortfall)} · COÛT ${formatCash(car.price)}`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    {worldError && <p className="city-rush-error" role="alert">Le moteur 3D n’a pas pu démarrer : {worldError}</p>}

                    <div className="city-rush-intro-actions">
                      <button type="button" className="city-rush-text-button" onClick={goBack}>← VILLE</button>
                      <span className="city-rush-selection-hint">Touche une voiture pour lancer · {mode.name}</span>
                      <div className="city-rush-best-note"><span>{city.name} · {mode.label}</span><b>{bestTime ? formatTime(bestTime) : '— : —'}</b></div>
                    </div>
                  </>
                )}

                <div className="city-rush-intro-foot">
                  <span>← → / Q D · VOIES</span>
                  <span>A / Z / R · POUVOIRS · PAD VERT : TURBO</span>
                  <span>{currentLaps} TOURS · {currentDistance} M</span>
                  <span>M · SON</span>
                  <span>F · PLEIN ÉCRAN</span>
                </div>
              </div>
            )}

            {phase === 'cinematic' && storyMode && STORY_CHAPTERS[storyChapter] && (
              <div className="city-rush-overlay city-rush-intro city-rush-story-cinematic" role="dialog" aria-modal="true" aria-labelledby="city-rush-story-title">
                <div className="city-rush-intro-copy">
                  <span className="city-rush-overlay-kicker"><i /> MODE HISTOIRE · CHAPITRE {String(storyChapter + 1).padStart(2, '0')} / {STORY_CHAPTERS.length}</span>
                  <h2 id="city-rush-story-title">{STORY_CHAPTERS[storyChapter].title}<br /><em>{city.name}</em></h2>
                  <CityRushStoryScene city={city} speaker={STORY_CHAPTERS[storyChapter].speaker} chapter={storyChapter + 1} kind={STORY_CHAPTERS[storyChapter].kind || 'dialogue'} />
                  <div className={`city-rush-story-caption${STORY_CHAPTERS[storyChapter].kind && STORY_CHAPTERS[storyChapter].kind !== 'dialogue' ? ' is-action' : ''}`} style={{ maxWidth: 660, margin: '12px auto', padding: 18, background: 'rgba(7,10,24,.82)', border: '1px solid rgba(255,255,255,.16)', borderRadius: 12 }}>
                    <b style={{ color: '#ff7498', letterSpacing: '.12em' }}>{STORY_CHAPTERS[storyChapter].kind === 'action' ? 'SÉQUENCE EN ACTION · COURSE-POURSUITE' : STORY_CHAPTERS[storyChapter].speaker.toUpperCase()}</b>
                    <p style={{ color: '#f0eff7', fontSize: 17, lineHeight: 1.65, margin: '10px 0 0' }}>{STORY_CHAPTERS[storyChapter].text}</p>
                  </div>
                  <div className="city-rush-story-race-card">
                    <div><small>COURSE {String(storyChapter + 1).padStart(2, '0')} / {STORY_CHAPTERS.length}</small><span>{STORY_CHAPTERS[storyChapter].race.type}</span></div>
                    <b>{STORY_CHAPTERS[storyChapter].race.name}</b>
                    <p>{STORY_CHAPTERS[storyChapter].race.route}</p>
                  </div>
                  <p>NICO VEGA · {selectedCar.name} — {selectedCar.className.toLowerCase()}</p>
                </div>
                <div className="city-rush-intro-actions" style={{ justifyContent: 'center' }}>
                  <button type="button" className="city-rush-start-button" onClick={startRace}>{`LANCER ${STORY_CHAPTERS[storyChapter].race.name.toUpperCase()}`} <span>↗</span></button>
                  <button type="button" className="city-rush-text-button" onClick={() => { setStoryMode(false); setPhase('intro'); setIntroStep('mode'); }}>← RETOUR AUX MODES</button>
                </div>
              </div>
            )}

            {phase === 'countdown' && (
              <div className="city-rush-overlay city-rush-countdown" aria-live="assertive">
                <span>{storyMode ? 'PRÊT·E, PILOTE ?' : `${mode.name} · ${city.district} · PRÊT ?`}</span>
                <strong key={countdown}>{countdown > 0 ? countdown : 'GO!'}</strong>
                <small>{currentStoryRace?.race?.name || city.district} · {sprintMode ? `${CITY_RUSH_SPRINT_CHECKPOINTS} CHECKPOINTS · SOLO` : `${currentLaps} TOURS`} · {RACE_KM}</small>
              </div>
            )}

            {phase === 'paused' && (
              <div className="city-rush-overlay city-rush-pause-overlay">
                <span className="city-rush-overlay-kicker">COURSE SUSPENDUE · {activeModeName}</span>
                <h2>REPRENDS<br /><em>LE VOLANT.</em></h2>
                <div className="city-rush-overlay-buttons">
                  <button type="button" className="city-rush-start-button" onClick={resumeRace}>REPRENDRE <span>▶</span></button>
                  <button type="button" className="city-rush-text-button" onClick={() => { setStoryMode(false); setPhase('intro'); setIntroStep('mode'); }}>MENU PRINCIPAL</button>
                </div>
                <small>{city.name} · {activeModeLabel} · la route attend.</small>
              </div>
            )}

            {phase === 'finished' && result && (
              <div className={`city-rush-overlay city-rush-result-overlay${result.destroyed ? ' is-destroyed' : ''}`}>
                <span className="city-rush-overlay-kicker">{result.timedOut ? `TEMPS ÉCOULÉ · COURSE PERDUE` : result.destroyed ? `COQUE DÉTRUITE · COURSE PERDUE` : result.sprint ? `SPRINT RÉUSSI · ${formatTime(result.duration)}` : result.rank === 1 ? `VICTOIRE · ${activeModeName}` : `ARRIVÉE · ${activeModeName}`} · {result.sprint ? `${CITY_RUSH_SPRINT_CHECKPOINTS} CHECKPOINTS` : `${result.laps || currentLaps} TOURS`}</span>
                <h2>{result.timedOut ? <>CHRONO<br /><em>À ZÉRO.</em></> : result.destroyed ? <>TON ÉPAVE<br /><em>FUME ENCORE.</em></> : finalStoryVictory ? storyEnding ? <>{STORY_ENDINGS[storyEnding].title}<br /><em>FIN.</em></> : <>LE DERNIER<br /><em>CHOIX.</em></> : result.rank === 1 ? <>TU MÈNES<br /><em>LA DANSE.</em></> : <>LA VILLE<br /><em>EST À TOI.</em></>}</h2>
                <div className="city-rush-result-grid">
                  {result.sprint
                    ? <div><small>CHECKPOINTS</small><b>{result.checkpoints ?? 0}<i> / {CITY_RUSH_SPRINT_CHECKPOINTS}</i></b></div>
                    : <div><small>PLACE</small><b>{result.destroyed ? 'DERNIER' : ordinal(result.rank)}<i> / 3</i></b></div>}
                  <div><small>CHRONO</small><b>{formatTime(result.duration)}</b></div>
                  <div><small>{result.sprint ? 'CHECKPOINT MOYEN' : 'TOUR MOYEN'}</small><b>{formatTime((result.duration || 0) / (result.sprint ? CITY_RUSH_SPRINT_CHECKPOINTS : (result.laps || currentLaps || CITY_RUSH_LAPS)))}</b></div>
                  <div><small>BUTIN</small><b>{result.score}<i> PTS</i></b></div>
                </div>
                {result.cashAwarded > 0 && (
                  <div className="city-rush-cash-reward" role="status" aria-live="polite">
                    <span className="city-rush-cash-reward-icon" aria-hidden="true">$</span>
                    <span><b>+{formatCash(result.cashAwarded)} BILLETS VERTS</b><small>{cashRewardReason(result)}</small></span>
                    <small className="city-rush-cash-total">PORTEFEUILLE · {formatCash(result.cashBalance)}</small>
                  </div>
                )}
                {result.newlyUnlockedCourse && (
                  <div className="city-rush-course-unlocked-notice" role="status">
                    <b>✦ NOUVEAU PARCOURS DÉBLOQUÉ</b>
                    <span>{CITY_RUSH_COURSES.find((course) => course.id === result.newlyUnlockedCourse)?.name}</span>
                  </div>
                )}
                <p>
                  {result.timedOut
                    ? `Les 15 secondes se sont écoulées avant le checkpoint ${(result.checkpoints || 0) + 1} sur ${CITY_RUSH_SPRINT_CHECKPOINTS}. La revanche t’attend.`
                    : result.destroyed
                    ? `Ta coque est tombée à zéro : la voiture a tourné sur elle-même dans sa fumée avant de s’arrêter, hors course. ${result.winner} l’emporte ; la revanche t’attend.`
                    : finalStoryVictory && storyEnding
                    ? STORY_ENDINGS[storyEnding].text
                    : finalStoryVictory
                      ? 'Dante est vaincu. Nico tient enfin les preuves : à lui de choisir ce qu’il fera de sa revanche.'
                      : result.rank === 1
                        ? (result.sprint ? `Les ${CITY_RUSH_SPRINT_CHECKPOINTS} checkpoints de ${city.name} franchis en ${formatTime(result.duration)}.` : storyMode ? `Tu remportes les ${result.laps || currentLaps} tours du circuit de ${city.name}.` : `Tu remportes le ${mode.name} sur ${city.name}.`)
                        : (result.sprint ? `${result.winner} franchit la ligne en tête du sprint. La revanche t’attend.` : `${result.winner} franchit la ligne en tête après ${result.laps || currentLaps} tours. La revanche t’attend.`)}{' '}
                  {!finalStoryVictory && !result.sprint && `${result.pickups} objet${result.pickups > 1 ? 's' : ''} ramassé${result.pickups > 1 ? 's' : ''}.`}
                </p>
                {finalStoryVictory && !storyEnding && (
                  <div className="city-rush-ending-choices" role="group" aria-label="Choisir la fin de l’histoire">
                    <button type="button" onClick={() => chooseStoryEnding('revenge')}><b>LA REVANCHE</b><span>Dante paiera pour sa trahison.</span></button>
                    <button type="button" onClick={() => chooseStoryEnding('truth')}><b>LA VÉRITÉ</b><span>Expose le complot jusqu’au bout.</span></button>
                  </div>
                )}
                <div className="city-rush-overlay-buttons">
                  {storyMode && result.rank === 1 && storyChapter < STORY_CHAPTERS.length ? (
                    <button type="button" className="city-rush-start-button" onClick={beginStory}>CHAPITRE SUIVANT <span>↗</span></button>
                  ) : finalStoryVictory && storyEnding ? (
                    <button type="button" className="city-rush-start-button" onClick={restartStory}>REJOUER L’HISTOIRE <span>↻</span></button>
                  ) : finalStoryVictory ? null : (
                    <button type="button" className="city-rush-start-button" onClick={startRace}>REJOUER <span>↻</span></button>
                  )}
                  <button type="button" className="city-rush-text-button" onClick={() => { setResult(null); setStoryMode(false); setPhase('intro'); setIntroStep('mode'); }}>
                    {storyMode ? 'MODE LIBRE / VILLE' : 'CHANGER DE MODE'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="city-rush-shell-footer">
            <span><i className="city-rush-footer-dot" /> {activeModeName} <b>·</b> {city.name} <b>·</b> {sprintMode ? `${CITY_RUSH_SPRINT_CHECKPOINTS} CHECKPOINTS` : `${currentLaps} TOUR${currentLaps > 1 ? 'S' : ''}`} · {currentDistance} M</span>
            <span className="city-rush-desktop-hint">← → / Q D : VOIES {sprintMode ? '' : <><b>·</b> Z : MITRAILLEUSE </>}<b>·</b> P : PAUSE <b>·</b> M : SON <b>·</b> F : PLEIN ÉCRAN</span>
            <span className="city-rush-mobile-hint">GLISSE GAUCHE / DROITE{sprintMode ? ' · SOLO CONTRE LA MONTRE' : ' · OBJETS EN BAS'}</span>
          </div>
        </section>

        <aside className="city-rush-sidebar">
          <section className={`city-rush-side-card city-rush-leaderboard${sprintMode ? ' is-solo' : ''}`}>
            <div className="city-rush-side-heading"><span>{sprintMode ? 'CHRONO · SPRINT SOLO' : `POSITIONS · ${activeModeName}`}</span><i>{sprintMode ? 'SOLO' : 'LIVE'}</i></div>
            <h3>{sprintMode ? <>Seul contre<br /><em>la montre.</em></> : <>Qui mène<br /><em>la course ?</em></>}</h3>
            <div className="city-rush-racer-list">
              {standings.slice().sort((a, b) => a.rank - b.rank).map((racer) => (
                <div className={`city-rush-racer-card${racer.id === 'player' ? ' is-player' : ''}`} key={racer.id}>
                  <span className="city-rush-racer-rank">{String(sprintMode ? sprintCheckpoint : racer.rank).padStart(2, '0')}</span>
                  <span className="city-rush-racer-avatar"><CityRushDriverAvatar driver={racer} /></span>
                  <div className="city-rush-racer-info">
                    <span className="city-rush-racer-name-row"><b>{racer.name}</b>{racer.id === 'player' && <em className="city-rush-you-badge">TOI</em>}</span>
                    <span className="city-rush-racer-country">{racer.flag} {racer.country}</span>
                    <small>{sprintMode
                      ? <>CHECKPOINT {sprintCheckpoint}<i> / </i>{CITY_RUSH_SPRINT_CHECKPOINTS} <i>·</i> {Math.round(racer.distance || 0)} M</>
                      : <>TOUR {Math.min(racer.lap || 1, racer.laps || currentLaps)} <i>·</i> {Math.round(racer.distance || 0)} M</>}</small>
                  </div>
                  <div className="city-rush-racer-meter"><i style={{ width: `${rankProgress(racer)}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="city-rush-leader-foot"><span>OBJECTIF · {activeModeName}</span><b>{sprintMode ? `${CITY_RUSH_SPRINT_CHECKPOINTS} CHECKPOINTS` : `${currentLaps} TOURS`} · {currentDistance} M</b></div>
          </section>

          {/* Le Sprint n'a ni objet ni arme : la carte « OBJETS » devient une
              carte de chrono solo, sinon la colonne annonce un équipement qui
              n'existe pas dans ce mode. */}
          {sprintMode ? (
          <section className="city-rush-side-card city-rush-item-guide is-sprint">
            <div className="city-rush-side-heading"><span>SOLO · CHRONO</span><i>{CITY_RUSH_SPRINT_CHECKPOINTS} PORTES</i></div>
            <h3>Tenir<br /><em>les 15 secondes.</em></h3>
            <div className="city-rush-guide-list">
              <div className="city-rush-guide-item is-sprint">
                <span className="city-rush-guide-glyph" aria-hidden="true">⛳</span>
                <div><b>CHECKPOINT · {CITY_RUSH_SPRINT_CHECKPOINT_SPACING} M</b><small>{CITY_RUSH_SPRINT_CHECKPOINTS} portes espacées de {CITY_RUSH_SPRINT_CHECKPOINT_SPACING} m : chacune rend {CITY_RUSH_SPRINT_CHECKPOINT_TIME} secondes au chrono. Chrono à zéro, la course est perdue.</small></div>
                <kbd>{CITY_RUSH_SPRINT_CHECKPOINT_TIME} s</kbd>
              </div>
              <div className="city-rush-guide-item is-solo">
                <span className="city-rush-guide-glyph" aria-hidden="true">◎</span>
                <div><b>PAS D’OBJET EN PISTE</b><small>Aucun bonus au sol, aucune arme, aucun turbo : la piste est vide de tout équipement, seul le chrono compte.</small></div>
                <kbd>SOLO</kbd>
              </div>
            </div>
          </section>
          ) : (
          <section className="city-rush-side-card city-rush-item-guide">
            <div className="city-rush-side-heading"><span>OBJETS</span><i>1 ARME + TURBO</i></div>
            <h3>Ramasse.<br /><em>Déclenche.</em></h3>
            <div className="city-rush-guide-list">
              {POWER_ORDER.map((type) => {
                const rule = CITY_RUSH_POWER_RULES[type];
                return (
                  <div className={`city-rush-guide-item is-${type}${rule.automatic ? ' is-automatic' : ''}`} key={type}>
                    <span><PowerIcon type={type} /></span>
                    <div><b>{rule.name} · {rule.chargeCost} POUR CHARGER</b><small>{rule.description}</small></div>
                    <kbd>{rule.automatic ? 'AUTO' : rule.key}</kbd>
                  </div>
                );
              })}
              <div className="city-rush-guide-item is-boost">
                <span><PowerIcon type={CITY_RUSH_PICKUPS.BOOST} /></span>
                <div><b>TURBO AU SOL · AUTOMATIQUE</b><small>Traverse un pad lumineux pour accélérer pendant {CITY_RUSH_TRACK_BOOST_DURATION} secondes. Un bonus rouge suffit à charger l’AK-47.</small></div>
                <kbd>{CITY_RUSH_TRACK_BOOST_DURATION} s</kbd>
              </div>
            </div>
          </section>
          )}

          <section className="city-rush-no-collision-note">
            <span className="city-rush-no-collision-icon">◎</span>
            <div><b>MODE {activeModeName} · {activeModeLabel}</b><p>{storyMode ? `${currentStoryRace?.race?.name || city.name} : ${currentStoryRace?.text || ''}` : mode.desc} Distance totale : {currentDistance} m. Le trafic bloque sans dégâts. Conduite propre : chaque changement de voie ralentit légèrement (−{Math.round((1 - CITY_RUSH_LANE_CHANGE_SLOW_FACTOR) * 100)} % un instant) ; tenir sa voie sans zigzaguer fait accélérer (jusqu’à +{Math.round((CITY_RUSH_CLEAN_LINE_MAX_BONUS - 1) * 100)} % de vitesse).</p></div>
          </section>

          {/* En Sprint, la carte de l'escouade disparaît : titre, sirène et
              couleur rouge compris. Elle est remplacée par la carte solo. */}
          <section className={`city-rush-no-collision-note${sprintMode ? ' is-solo' : ' is-police'}`}>
            <span className="city-rush-no-collision-icon" aria-hidden="true">{sprintMode ? '⚡' : '🚨'}</span>
            <div><b>{sprintMode ? 'SPRINT SOLO · AUCUNE POURSUITE' : 'ESCOUADE DE POLICE'}</b><p>{sprintMode ? <>Rien à fuir dans ce mode : ni escouade au dernier tour, ni berline dans le trafic, ni hélicoptère d’observation, ni adversaire en piste. Seulement toi, le chrono et les {CITY_RUSH_SPRINT_CHECKPOINTS} checkpoints — {CITY_RUSH_SPRINT_DISTANCE} m en tout. Le trafic civil bloque toujours la voie, sans dégâts.</> : <>{!storyMode && mode.policeFromStart ? 'Active dès le départ en POURSUITE : une berline et un SUV chargent leur AK-47 avec les bonus rouges.' : 'Au dernier tour en CIRCUIT, une berline et un SUV entrent derrière le leader et chassent les bonus rouges.'} Elles commencent sans charge rouge, mais la police appelle gratuitement un hélicoptère une seule fois par course. Hors classement, les véhicules de police sont signalés dans la liste des positions. Chaque voiture de police a une barre de vie : un tir rouge d’AK-47 ou un carambolage lui en enlève la moitié. Deux tirs rouges, deux carambolages ou un tir rouge et un carambolage la détruisent ; un missile d’hélicoptère suffit d’un coup (explosion, retrait de la course et +200 pts). Au dernier tour, chaque unité d’escouade détruite est remplacée par un renfort qui revient derrière toi pour reprendre la chasse. Au dernier tour, ta voiture reçoit elle aussi une barre de vie de 8 carrés, dessinée d’un seul trait : verte, elle glisse à l’orange puis au rouge en se vidant. Un tir rouge en coûte deux, un carambolage avec une berline un. Au dernier tour, un hélicoptère d’observation suit ta voiture jusqu’à l’arrivée : rotor et pod caméra tournent, mais il n’ouvre jamais le feu.</>}</p></div>
          </section>
        </aside>
      </main>

      <footer className="city-rush-page-footer wrap"><Link to="/jeu">← RETOUR À L’ARCADE</Link><span>LET’S PLAY ARCADE · VICE CITY RUSH · {activeModeName} · {city.name}</span></footer>
    </div>
  );
}
