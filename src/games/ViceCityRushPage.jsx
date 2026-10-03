import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ViceCityWorld from './ViceCityWorld';
import CityRushDriverAvatar from './CityRushDriverAvatar';
import CityRushStoryScene from './CityRushStoryScene';
import CityRushMinimap from './CityRushMinimap';
import FullscreenIcon from './FullscreenIcon';
import { CityRushAudio } from './cityRushAudio';
import { isFullscreenShortcut, nativeFullscreenElement, opensFullscreenOnLaunch } from './gameFullscreen';
import useGameFullscreen from './useGameFullscreen';
import {
  CITY_RUSH_CARS,
  CITY_RUSH_CITIES,
  CITY_RUSH_DISTANCE,
  CITY_RUSH_DRIVERS,
  CITY_RUSH_LAPS,
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_POWER_RULES,
  CITY_RUSH_POWERS,
  buildCityRushMinimapState,
  createCityRushInventory,
  selectCityRushRacers,
} from './cityRushRules';
import { cityRushTheme } from './cityRushThemes';
import './vice-city-rush.css';
import './vice-city-rush-cinematic.css';

const BEST_KEY = 'letsplay_vice_city_rush_bests_v1';
const SOUND_KEY = 'letsplay_vice_city_rush_sound_v1';
const STORY_KEY = 'letsplay_vice_city_rush_story_v1';
const STORY_ENDING_KEY = 'letsplay_vice_city_rush_ending_v1';
const POWER_ORDER = [CITY_RUSH_POWERS.BLUE_SHOT, CITY_RUSH_POWERS.PISTOL, CITY_RUSH_POWERS.CASH, CITY_RUSH_POWERS.RADIO];
const CAR_STATS = [
  { key: 'power', label: 'PUISSANCE' },
  { key: 'acceleration', label: 'ACCÉLÉRATION' },
  { key: 'recovery', label: 'REPRISE' },
];

const STORY_ENDINGS = {
  revenge: { title: 'La revanche', text: 'Nico remet Dante aux autorités et restaure son nom. Sa vengeance s’arrête là — mais le promoteur qui a commandité le sabotage reste à retrouver.' },
  truth: { title: 'La vérité', text: 'Nico rend publiques toutes les preuves. Dante devra répondre de sa trahison, et le réseau du promoteur est exposé au grand jour.' },
};
function readStoryEnding() {
  try { return window.localStorage.getItem(STORY_ENDING_KEY) || ''; } catch { return ''; }
}
const STORY_CHAPTERS = [
  { city: 'vice-city', title: 'Le retour', speaker: 'Nico', race: { name: 'Ocean Drive — Sunset Run', type: 'Course côtière', route: 'Ocean Drive · South Beach · Collins Avenue' }, text: 'Trois ans après le sabotage, Nico Vega revient à Ocean Drive. Dante Cross a laissé une invitation au départ : gagne cette course et le prochain nom tombera.' },
  { city: 'new-york', title: 'La piste froide', speaker: 'Nico', kind: 'action', race: { name: 'Midtown — Heat Run', type: 'Échappée urbaine', route: 'Times Square · Broadway · Midtown Tunnel' }, text: 'L’escorte de Dante repère Nico dans Midtown. Sirènes derrière eux, Luna lâche un dernier indice à la radio : le prochain contact se cache à Tokyo.' },
  { city: 'tokyo', title: 'Le hangar de Shibuya', speaker: 'Nico', kind: 'action', race: { name: 'Shibuya — Freight Run', type: 'Sprint nocturne', route: 'Shibuya Crossing · Docklands · Bayshore Route' }, text: 'Le mécanicien de Dante a les preuves. L’échange tourne mal dans un hangar du port : Nico saute au volant, dossier en main, et doit semer les hommes de Dante à travers Shibuya.' },
  { city: 'paris', title: 'Marché de dupes', speaker: 'Nico', kind: 'action', race: { name: 'Rive Gauche — Redline', type: 'Drift urbain', route: 'Saint-Germain · Quai de Conti · Boulevard Saint-Michel' }, text: 'Le promoteur tente de s’enfuir avec les preuves. Nico le prend en chasse dans les rues de Paris ; la vérité est dans la voiture rouge.' },
  { city: 'london', title: 'La soirée des ombres', speaker: 'Nico', kind: 'action', race: { name: 'Soho — After Hours', type: 'Course-poursuite', route: 'Piccadilly Circus · Soho · Tower Bridge' }, text: 'En costume, Nico s’invite à la réception privée du promoteur. Il surprend Dante qui ordonne de brûler les preuves — les gardes le repèrent, et la fuite se joue au volant dans les rues de Soho.' },
  { city: 'vice-city', title: 'Le dernier tour', speaker: 'Nico', kind: 'action', race: { name: 'Vice City — Last Lap', type: 'Finale du circuit', route: 'Ocean Drive · Starfish Island · Vice City Docks' }, text: 'Dante pousse sa voiture rouge à fond sur Ocean Drive. Nico colle à son pare-chocs : une dernière course décidera de leur sort.' },
];
function readStoryChapter() {
  try { return Math.max(0, Math.min(STORY_CHAPTERS.length, Number(window.localStorage.getItem(STORY_KEY)) || 0)); } catch { return 0; }
}

const RACE_MODES = [
  {
    id: 'circuit',
    name: 'CIRCUIT',
    label: '3 TOURS · CLASSIQUE',
    desc: 'La formule originale. 3 tours complets, trafic, bonus, police uniquement au dernier tour.',
    accent: '#43ead5',
    secondary: '#ff5db8',
    laps: 3,
    policeFromStart: false,
    icon: '◍',
    tag: 'RECOMMANDÉ',
  },
  {
    id: 'sprint',
    name: 'SPRINT',
    label: '1 TOUR · TIME ATTACK',
    desc: 'Un seul tour explosif. Parfait pour battre ton chrono et apprendre le circuit.',
    accent: '#ff5db8',
    secondary: '#ffd44f',
    laps: 1,
    policeFromStart: false,
    icon: '⚡',
    tag: 'RAPIDE',
  },
  {
    id: 'pursuit',
    name: 'POURSUITE',
    label: '3 TOURS · POLICE TOTALE',
    desc: 'Trois berlines d’interception dès le départ, armées bleu et rouge. Elles volent tes bonus rouges/jaunes et tirent sans relâche.',
    accent: '#ffd44f',
    secondary: '#ff526e',
    laps: 3,
    policeFromStart: true,
    icon: '🚨',
    tag: 'HARDCORE',
  },
];

const STORY_LAPS = 3;
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
  rank: 4,
  racers: [],
  inventory: createCityRushInventory(),
  score: 0,
  pickups: 0,
  slowLeft: 0,
  trafficImpactLeft: 0,
  boostLeft: 0,
  stunLeft: 0,
  police: [],
};

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
function PowerIcon({ type, className = '' }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" {...common}>
      {type === 'cash' && <>
        <path d="M11 4h10l1 4 2 3v14a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V11l2-3z" />
        <path d="M11 8h10M12 23h8" />
        <path d="m18 11-5 6h4l-2 5 6-7h-4z" />
      </>}
      {type === CITY_RUSH_POWERS.BLUE_SHOT && <>
        <path d="M4 10h12a4 4 0 0 1 4 4v2h7v3h-9l-2 2h-2l-2.5 7H7l2.3-7H5L4 17z" fill="currentColor" strokeWidth="1.4" />
        <path d="M16.5 18.5v2h-2.7" stroke="rgba(255,255,255,.95)" strokeWidth="1.2" />
      </>}
      {type === 'pistol' && <>
        <path d="M3 12h19" />
        <path d="M22 12v4a3 3 0 0 1-3 3h-3" />
        <path d="M16 19v-6" />
        <path d="M13 12l-3 7" />
      </>}
      {type === 'radio' && <>
        <path d="m12 7 5-4M11 7l-2-3" />
        <rect x="7" y="8" width="17" height="20" rx="3" />
        <rect x="10" y="12" width="11" height="7" rx="1" />
        <circle cx="12" cy="23" r="1" /><circle cx="16" cy="23" r="1" /><circle cx="20" cy="23" r="1" />
      </>}
    </svg>
  );
}

function rankProgress(racer) {
  return Math.round(Math.max(0, Math.min(1, Number(racer?.progress) || 0)) * 100);
}

export default function ViceCityRushPage() {
  const [cityId, setCityId] = useState('vice-city');
  const [carId, setCarId] = useState('vice-roadster');
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
  const [toast, setToast] = useState(null);
  const [lapBanner, setLapBanner] = useState(null);
  const [worldError, setWorldError] = useState('');
  const [soundOn, setSoundOn] = useState(readSoundPref);
  const audioRef = useRef(null);
  const soundOnRef = useRef(soundOn);
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
  phaseRef.current = phase;
  soundOnRef.current = soundOn;

  const city = useMemo(() => CITY_RUSH_CITIES.find((item) => item.id === cityId) || CITY_RUSH_CITIES[0], [cityId]);
  const mode = useMemo(() => RACE_MODES.find((m) => m.id === modeId) || RACE_MODES[0], [modeId]);
  const currentStoryRace = storyMode ? STORY_CHAPTERS[storyRaceChapter] : null;
  const currentLaps = storyMode ? STORY_LAPS : mode.laps;
  const currentDistance = currentLaps * CITY_RUSH_LAP_LENGTH;
  const RACE_KM = `${(currentDistance / 1000).toFixed(1).replace('.', ',')} KM`;
  const activeModeName = storyMode ? 'HISTOIRE' : mode.name;
  const activeModeLabel = storyMode ? `CHAPITRE ${String(storyRaceChapter + 1).padStart(2, '0')} / ${STORY_CHAPTERS.length}` : mode.label;
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
    }),
    [hud.racers, roster, cityId, selectedCar.id, runId, playerDriverId, currentLaps, currentDistance],
  );
  const standings = minimapState.racers;
  const wantedStars = Math.min(5, Array.isArray(hud.police) ? hud.police.length : 0);
  const tourBarPct = Math.round(Math.max(0, Math.min(1, hud.lapProgress || 0)) * 100);
  const turboBarPct = Math.round(Math.max(0, Math.min(1, (hud.boostLeft || 0) / 1.5)) * 100);
  const bestTime = bests[cityId] || null;
  const finalStoryVictory = Boolean(storyMode && result?.rank === 1 && storyChapter >= STORY_CHAPTERS.length);
  const nextStoryIndex = storyChapter >= STORY_CHAPTERS.length ? 0 : storyChapter;
  const previewStoryChapter = STORY_CHAPTERS[nextStoryIndex];
  const previewStoryCity = CITY_RUSH_CITIES.find((item) => item.id === previewStoryChapter.city) || CITY_RUSH_CITIES[0];

  const cyclePlayerDriver = () => {
    const currentIndex = CITY_RUSH_DRIVERS.findIndex((driver) => driver.id === playerDriverId);
    const nextDriver = CITY_RUSH_DRIVERS[(currentIndex + 1) % CITY_RUSH_DRIVERS.length];
    setPlayerDriverId(nextDriver.id);
  };

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
  function showLapBanner(info) {
    window.clearTimeout(lapTimerRef.current);
    setLapBanner({ ...info, nonce: Date.now() });
    lapTimerRef.current = window.setTimeout(() => setLapBanner(null), info.final ? 2300 : 1800);
  }
  function startRace() {
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
    setStoryMode(true);
    setStoryRaceChapter(chapterIndex);
    setCarId('vega-gt-67');
    setCityId(STORY_CHAPTERS[chapterIndex].city);
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

  function finishRace(nextResult) {
    setResult(nextResult);
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
    if (effect.type === 'cash') showToast(effect.automatic ? 'BOOST AUTO-ACTIVÉ · 1,5 seconde de turbo.' : 'BOOST ACTIVÉ · 1,5 seconde de turbo.', 'cash');
    else if (effect.type === 'blue-shot-hit') showToast(`TIR DROIT · ${effect.target} TOUCHÉ · DÉRAPAGE LÉGER ${formatSeconds(effect.duration, 0.3)}.`, 'blue-shot');
    else if (effect.type === 'blue-shot-hit-player') showToast(`TIR DROIT · ${effect.attacker} TE TOUCHE · DÉRAPAGE LÉGER ${formatSeconds(effect.duration, 0.3)}.`, 'blue-shot');
    else if (effect.type === 'oil') showToast(effect.automatic ? 'HUILE AUTO-DÉVERSÉE · Un rival peut déraper derrière toi.' : 'HUILE DÉVERSÉE · Un rival peut déraper derrière toi.', 'oil');
    else if (effect.type === 'oil-hit') showToast(effect.target === 'TOI' ? `DÉRAPAGE · FLAQUE DE ${effect.owner || 'RIVAL'} · RALENTI.` : `DÉRAPAGE · ${effect.target} a traversé une flaque.`, 'oil');
    else if (effect.type === 'pistol') showToast(`TATATATA ! ${effect.target} mitraillé · ralenti ${formatSeconds(effect.duration, 2)}.`, 'pistol');
    else if (effect.type === 'pistol-hit-player') showToast(`TATATATA ! ${effect.attacker} TE MITRAILLE · RALENTI ${formatSeconds(effect.duration, 2)}.`, 'pistol');
    else if (effect.type === 'rival-boost') showToast(`${effect.rival} ACTIVE UN BOOST.`, 'cash');
    else if (effect.type === 'rival-oil') showToast(`${effect.rival} RÉPAND UNE FLAQUE D’HUILE.`, 'oil');
    else if (effect.type === 'rival-blue-shot') showToast(`${effect.rival} TIRE DROIT ${effect.backward ? 'DERRIÈRE LUI' : 'DEVANT LUI'}.`, 'blue-shot');
    else if (effect.type === 'radio') showToast(`HÉLICO EN APPROCHE · CIBLE : ${effect.target}.`, 'radio');
    else if (effect.type === 'missile-hit') showToast(`IMPACT · ${effect.target} immobilisé ${formatSeconds(effect.duration, 2)}.`, 'radio');
    else if (effect.type === 'radio-busy') showToast(effect.message, 'radio');
    else if (effect.type === 'radio-no-target') showToast('AUCUN RIVAL DEVANT TOI · LA JAUGE RESTE CHARGÉE.', 'radio');
    else if (effect.type === 'slow-zone') showToast('ZONE DE RALENTISSEMENT · Garde l’œil sur la route.', 'slow');
    else if (effect.type === 'traffic-hit') showToast('CHOC · TRAFIC · RALENTI.', 'slow');
    else if (effect.type === 'traffic-hit-player') showToast(`CHOC · ${effect.attacker || 'TRAFIC'} TE PERCUTE · RALENTI.`, 'slow');
    else if (effect.type === 'empty') showToast('AUCUN OBJET · Ramasse la bonne icône sur la route.', 'neutral');
    else if (effect.type === 'rival-final-lap') showToast(`${effect.rival} ENTAME LE DERNIER TOUR.`, 'neutral');
    else if (effect.type === 'police-arrival') showToast(effect.target === 'player' ? `🚨 POLICE · ${effect.count || 3} BERLINES SE JOIGNENT À LA COURSE JUSTE DERRIÈRE TOI · ELLES SONT ARMÉES (BLEU ET ROUGE) ET VISENT TES BONUS ROUGES ET JAUNES.` : `🚨 POLICE · L’ESCOUADE PREND ${effect.target} EN CHASSE.`, 'pistol');
    else if (effect.type === 'police-steal') showToast(`VOL DE BONUS · ${effect.police} A RAFLÉ ${effect.item === 'radio' ? 'L’HÉLICO (JAUNE)' : 'LA MITRAILLEUSE (ROUGE)'}${effect.ready ? ' · ELLE EST ARMÉE' : ''}.`, effect.item === 'radio' ? 'radio' : 'pistol');
    else if (effect.type === 'police-fire') showToast(`TATATATA ! ${effect.police} TE MITRAILLE · RALENTI ${formatSeconds(effect.duration, 2)}.`, 'pistol');
    else if (effect.type === 'police-rally') showToast(effect.targetId === 'player' ? `🚨 ${effect.police} TE PREND EN CHASSE · ELLE REJOINT L’ESCOUADE.` : `🚨 ${effect.police} PREND ${effect.target === 'player' ? 'TOI' : effect.target} EN CHASSE.`, 'pistol');
    else if (effect.type === 'police-hit') {
      const weapon = effect.source === 'pistol' ? 'RAFALE ROUGE' : 'TIR BLEU';
      const left = effect.remaining || 1;
      showToast(`${weapon} · ${effect.police} TOUCHÉE · BARRE DE VIE ${effect.health}/${effect.maxHealth} · ENCORE ${left} ${effect.source === 'pistol' ? 'RAFALE' : 'TIR'}${left > 1 ? 'S' : ''} ${effect.source === 'pistol' ? 'ROUGE' : 'BLEU'}${left > 1 ? 'S' : ''}.`, effect.source === 'pistol' ? 'pistol' : 'blue-shot');
    }
    else if (effect.type === 'police-destroyed') showToast(effect.byPlayer ? `💥 ${effect.police} DÉTRUITE · +200 PTS · ELLE QUITTE LA COURSE.` : `💥 ${effect.police} DÉTRUITE · ELLE QUITTE LA COURSE.`, 'radio');
    else if (effect.type === 'tunnel-enter' && effect.closed > 0) {
      const wall = effect.walls > 1 ? 'PAROIS DES DEUX CÔTÉS' : `PAROI À ${effect.side === 'left' ? 'GAUCHE' : 'DROITE'}`;
      showToast(`${effect.name} · ${effect.open} VOIES OUVERTES SUR 4 · ${wall}.`, 'neutral');
    }
    else if (effect.type === 'tunnel-scrape') showToast('PAROI RACLÉE · LA VOIE EST MURÉE SOUS LE TUNNEL · RALENTI.', 'slow');
  }

  const onLap = (info) => {
    if (!info || info.lap > info.laps) return;
    showLapBanner(info);
  };
  const onPowerPickup = (pickup) => {
    const rule = CITY_RUSH_POWER_RULES[pickup.type];
    if (!rule) return;
    const progress = Math.min(rule.chargeCost, pickup.progress || 0);
    const message = pickup.autoActivated
      ? (pickup.type === CITY_RUSH_POWERS.CASH ? 'BOOST AUTO-ACTIVÉ · 1,5 s DE TURBO.' : 'HUILE AUTO-DÉVERSÉE · UNE FLAQUE EST DERRIÈRE TOI.')
      : pickup.newlyReady
        ? `${rule.shortName.toUpperCase()} PRÊT À UTILISER · TOUCHE ${rule.key}`
        : pickup.ready
          ? `${rule.shortName.toUpperCase()} · JAUGE PLEINE (${progress}/${rule.chargeCost})`
          : `${rule.shortName.toUpperCase()} · CHARGEMENT ${progress}/${rule.chargeCost}`;
    showToast(message, pickup.type);
  };

  // Navigation intro en 3 écrans
  const goNext = () => {
    setStoryMode(false);
    if (introStep === 'mode') setIntroStep('city');
    else if (introStep === 'city') setIntroStep('garage');
    else startRace();
  };
  const goBack = () => {
    if (introStep === 'garage') setIntroStep('city');
    else if (introStep === 'city') setIntroStep('mode');
  };

  return (
    <div className={`city-rush-page${immersive ? ' is-immersive' : ''}`} style={{ '--city-accent': city.accent, '--city-secondary': city.secondary, '--mode-accent': mode.accent, '--mode-secondary': mode.secondary }}>
      <header className="city-rush-heading wrap">
        <div>
          <p className="city-rush-eyebrow"><span className="city-rush-live-dot" /> LET’S PLAY ARCADE <span style={{ opacity: 0.4, margin: '0 6px' }}>/</span> UNE VILLE. AUCUNE LIMITE.</p>
          <h1><span>VICE CITY</span><em>RUSH</em></h1>
          <p className="city-rush-lede">
            Le soleil a ses ombres. La rue a ses règles. Incarne Nico Vega dans une course à la revanche, ou impose ton rythme sur cinq circuits.
          </p>
          <div className="city-rush-hero-details"><span>1986 / OCEAN DRIVE</span><span>5 VILLES</span><span>3 MODES DE COURSE</span></div>
          <div className="city-rush-hero-actions">
            <a className="city-rush-hero-cta" href="#vice-city-rush-console">
              CHOISIR UNE COURSE <span aria-hidden="true">↓</span>
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
                <b>
                  {storyMode
                    ? (currentStoryRace?.race?.name || city.district)
                    : introStep === 'mode'
                      ? mode.name
                      : introStep === 'city'
                        ? city.district
                        : `${city.district} · ${selectedCar.name}`}
                </b>
                <small>
                  {storyMode
                    ? <>{currentStoryRace?.race?.type || city.label} <i>·</i> {city.district} · {currentLaps} TOURS</>
                    : introStep === 'mode'
                      ? mode.label
                      : introStep === 'city'
                        ? `${city.label} · ${city.tagline}`
                        : `${city.label} · ${mode.label}`}
                </small>
              </span>
            </div>
            <div className="city-rush-top-actions">
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
              <span className="city-rush-top-flag"><i /> {currentLaps} TOUR{currentLaps > 1 ? 'S' : ''} · 4 VOIES</span>
            </div>
          </div>

          <div className={`city-rush-viewport${phase === 'playing' ? ' is-live' : ''}${hud.boostLeft > 0 && phase === 'playing' ? ' is-boosting' : ''}${hud.stunLeft > 0 && phase === 'playing' ? ' is-stunned' : ''}${hud.trafficImpactLeft > 0 && phase === 'playing' ? ' is-impacting' : ''}`}>
            <ViceCityWorld cityId={cityId} carId={selectedCar.id} active={phase === 'playing'} phase={phase} countdown={countdown} runId={runId} roster={roster} raceLaps={currentLaps} racePoliceFromStart={storyMode ? false : mode.policeFromStart} actionsRef={actionsRef} onReady={() => setWorldError('')} onError={(message) => setWorldError(message)} onHud={setHud} onFinish={finishRace} onPickup={onPowerPickup} onEffect={effectMessage} onLap={onLap} audioRef={audioRef} />
            <div className="city-rush-vignette" aria-hidden="true" />

            {phase === 'playing' && <>
              <div className="city-rush-hud-top">
                <div className="city-rush-hud-card city-rush-position-card">
                  <span className="city-rush-hud-label">POSITION</span>
                  <strong>{ordinal(hud.rank)}<small> / 4</small></strong>
                  <div className="city-rush-mini-lights"><i className={hud.rank === 1 ? 'is-lit' : ''} /><i className={hud.rank === 2 ? 'is-lit' : ''} /><i className={hud.rank === 3 ? 'is-lit' : ''} /><i className={hud.rank === 4 ? 'is-lit' : ''} /></div>
                </div>
                <div className={`city-rush-hud-card city-rush-distance-card city-rush-lap-card${hud.lap >= hud.laps ? ' is-final' : ''}`}>
                  <span className="city-rush-hud-label">{hud.lap >= hud.laps ? 'DERNIER TOUR' : 'TOUR'} · {activeModeName}</span>
                  <strong>{Math.min(hud.lap || 1, hud.laps || currentLaps)}<small> / {hud.laps || currentLaps}</small><em>{hud.lapDistance} / {hud.lapLength || CITY_RUSH_LAP_LENGTH} m</em></strong>
                  <div className="city-rush-lap-track" aria-label={`Tour ${hud.lap} sur ${hud.laps}`}>
                    {Array.from({ length: hud.laps || currentLaps }, (_, i) => i + 1).map((slot) => (
                      <span key={slot} className={slot < hud.lap ? 'is-done' : slot === hud.lap ? 'is-current' : ''}>
                        <i style={{ width: slot < hud.lap ? '100%' : slot === hud.lap ? `${Math.max(0, Math.min(100, (hud.lapProgress || 0) * 100))}%` : '0%' }} />
                      </span>
                    ))}
                  </div>
                </div>
                <div className="city-rush-hud-card city-rush-speed-card">
                  <span className="city-rush-hud-label">VITESSE</span>
                  <strong>{hud.speed}<small> km/h</small></strong>
                  <span className="city-rush-time">{formatTime(hud.elapsed)}</span>
                </div>
              </div>

              <div className="city-rush-gta-cash" aria-label={`Butin : ${hud.score || 0} points`}>
                <b>{(hud.score || 0).toLocaleString('fr-FR')} PTS</b>
                <small>{formatTime(hud.elapsed)}</small>
                {wantedStars > 0 && (
                  <span className="city-rush-gta-wanted" role="status" aria-label={`Police en chasse · niveau ${wantedStars} sur 5`}>
                    {[1, 2, 3, 4, 5].map((star) => <i key={star} className={star <= wantedStars ? 'is-on' : ''} aria-hidden="true">★</i>)}
                  </span>
                )}
              </div>

              <div className="city-rush-radar">
                <CityRushMinimap racers={standings} pursuers={hud.police} cityId={cityId} carId={selectedCar.id} runId={runId} playerDriverId={playerDriverId} />
                <div className="city-rush-gta-bars" aria-hidden="true">
                  <span className="city-rush-gta-bar is-tour"><i style={{ width: `${tourBarPct}%` }} /></span>
                  <span className="city-rush-gta-bar is-turbo"><i style={{ width: `${turboBarPct}%` }} /></span>
                </div>
              </div>

              {(hud.boostLeft > 0 || hud.slowLeft > 0 || hud.trafficImpactLeft > 0 || hud.stunLeft > 0) && (
                <div className={`city-rush-status-pill${hud.stunLeft > 0 ? ' is-stunned' : hud.trafficImpactLeft > 0 ? ' is-impact' : hud.boostLeft > 0 ? ' is-boost' : ' is-slow'}`}>
                  {hud.stunLeft > 0 ? `MISSILE · ${hud.stunLeft.toFixed(1)} s` : hud.trafficImpactLeft > 0 ? `CHOC · ${hud.trafficImpactLeft.toFixed(1)} s` : hud.boostLeft > 0 ? `TURBO · ${hud.boostLeft.toFixed(1)} s` : `RALENTI · ${hud.slowLeft.toFixed(1)} s`}
                </div>
              )}
              {toast && <div className={`city-rush-toast is-${toast.tone}`} key={toast.nonce} role="status">{toast.message}</div>}
              {lapBanner && (
                <div className={`city-rush-lap-banner${lapBanner.final ? ' is-final' : ''}`} key={lapBanner.nonce} role="status" aria-live="polite">
                  <span>{lapBanner.final ? 'LIGNE FRANCHIE · DERNIER TOUR' : `LIGNE FRANCHIE · TOUR ${lapBanner.lap} / ${lapBanner.laps}`}</span>
                  <strong>{lapBanner.final ? 'FINAL LAP' : `LAP ${lapBanner.lap}`}</strong>
                  <small>{lapBanner.final ? 'Plus que 600 m · tout donner.' : `${(lapBanner.laps - lapBanner.lap + 1)} tours restants · ${formatTime(lapBanner.elapsed)}`}</small>
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
                <div className="city-rush-power-bar" aria-label="Objets spéciaux">
                  {POWER_ORDER.map((type) => {
                    const rule = CITY_RUSH_POWER_RULES[type];
                    const progress = Math.min(rule.chargeCost, Math.max(0, Number(hud.inventory?.[type]) || 0));
                    const ready = progress >= rule.chargeCost;
                    const automatic = Boolean(rule.automatic);
                    const progressPercent = Math.round((progress / rule.chargeCost) * 100);
                    return (
                      <button type="button" key={type} className={`city-rush-power-button is-${type}${automatic ? ' is-automatic' : ''}${ready ? ' is-ready' : ''}`} onClick={() => actionsRef.current?.(type)} disabled={automatic || !ready} title={`${rule.name} — ${rule.chargeCost} objets pour charger. ${rule.description}`} aria-label={automatic ? `${rule.name} : ${progress}/${rule.chargeCost} auto` : `${rule.name} : ${progress}/${rule.chargeCost}${ready ? ' prêt' : ''}`}>
                        <span className="city-rush-power-icon"><PowerIcon type={type} /></span>
                        <span className="city-rush-power-copy">
                          <b>{rule.shortName}</b>
                          <small><span>{automatic ? 'AUTO' : rule.key}</span> <i>·</i> {ready ? 'PRÊT' : `${progress}/${rule.chargeCost}`}</small>
                          <span className="city-rush-power-progress" aria-hidden="true"><i style={{ width: `${progressPercent}%` }} /></span>
                        </span>
                        {ready && <i className="city-rush-power-pip" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
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
                      <span className="city-rush-overlay-kicker"><i /> 01 / MODE DE COURSE</span>
                      <h2>CHOISIS TON<br /><em>MODE.</em></h2>
                      <p>Lance la campagne scénarisée de Nico Vega à travers cinq villes ou choisis un mode de course libre : circuit classique, sprint chrono ou poursuite infernale avec police dès le départ.</p>
                    </div>

                    <div className="city-rush-story-banner" role="region" aria-label="Mode Histoire Nico Vega">
                      <div className="city-rush-story-banner-visual" aria-hidden="true">
                        <img src={`${import.meta.env.BASE_URL || '/'}vice-city-story-vice-city.webp`} alt="" />
                        <span className="city-rush-story-banner-badge">
                          {storyChapter >= STORY_CHAPTERS.length
                            ? 'CAMPAGNE TERMINÉE'
                            : `CHAPITRE ${String(nextStoryIndex + 1).padStart(2, '0')} / ${String(STORY_CHAPTERS.length).padStart(2, '0')}`}
                        </span>
                      </div>
                      <div className="city-rush-story-banner-body">
                        <div className="city-rush-story-banner-meta">
                          <span className="city-rush-mode-tag" style={{ '--tag-accent': '#ff5d7e' }}>CAMPAGNE SOLO</span>
                          <small>VEGA GT ’67 · {previewStoryCity.name.toUpperCase()} · {previewStoryChapter.title.toUpperCase()}</small>
                        </div>
                        <b>MODE HISTOIRE · NICO VEGA</b>
                        <p>{previewStoryChapter.text}</p>
                        <div className="city-rush-story-banner-actions">
                          <button type="button" className="city-rush-start-button city-rush-story-start-btn" onClick={beginStory}>
                            MODE HISTOIRE · NICO VEGA <span>▶</span>
                          </button>
                          <small>6 courses · cinématiques · progression sauvegardée</small>
                        </div>
                      </div>
                    </div>

                    <div className="city-rush-mode-picker" role="group" aria-label="Choisir un mode de course">
                      {RACE_MODES.map((m, index) => (
                        <button
                          key={m.id}
                          type="button"
                          className={`city-rush-mode-card${modeId === m.id ? ' is-selected' : ''}`}
                          style={{ '--mode-accent': m.accent, '--mode-secondary': m.secondary }}
                          onClick={() => { setStoryMode(false); setModeId(m.id); }}
                          aria-pressed={modeId === m.id}
                        >
                          <span className="city-rush-mode-number">0{index + 1}</span>
                          <span className="city-rush-mode-tag" style={{ '--tag-accent': m.accent }}>{m.tag}</span>
                          <span className="city-rush-mode-icon" aria-hidden="true">{m.icon}</span>
                          <b>{m.name}</b>
                          <small>{m.label}</small>
                          <p>{m.desc}</p>
                          <span className="city-rush-mode-laps"><i />{m.laps} TOUR{m.laps > 1 ? 'S' : ''} · {m.laps * CITY_RUSH_LAP_LENGTH} M</span>
                        </button>
                      ))}
                    </div>
                    <div className="city-rush-intro-actions">
                      <button type="button" className="city-rush-start-button" onClick={goNext} style={{ '--city-accent': mode.accent, '--city-secondary': mode.secondary }}>
                        CHOISIR LA VILLE ({mode.name}) <span>→</span>
                      </button>
                      <div className="city-rush-best-note"><span>MODE LIBRE SÉLECTIONNÉ</span><b>{mode.name}</b></div>
                    </div>
                  </>
                )}

                {introStep === 'city' && (
                  <>
                    <div className="city-rush-intro-copy">
                      <span className="city-rush-overlay-kicker"><i /> 02 / VILLE · {mode.name}</span>
                      <h2>{daylight ? 'LE SOLEIL' : 'LA NUIT'}<br /><em>DE {city.name}.</em></h2>
                      <p>{city.tagline} Circuit de {CITY_RUSH_LAP_LENGTH} m en boucle, {currentLaps} tour{currentLaps > 1 ? 's' : ''} = {currentDistance} m. Mode {mode.name} : {mode.desc.toLowerCase()}</p>
                    </div>
                    <div className="city-rush-city-picker is-large" role="group" aria-label="Choisir une ville">
                      {CITY_RUSH_CITIES.map((option, index) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`city-rush-city-card${cityId === option.id ? ' is-selected' : ''}`}
                          style={{ '--card-accent': option.accent, '--card-secondary': option.secondary }}
                          onClick={() => setCityId(option.id)}
                          aria-pressed={cityId === option.id}
                        >
                          <span className="city-rush-city-number">0{index + 1}</span>
                          <b>{option.name}</b>
                          <small>{option.district} · {option.label}</small>
                          <span className="city-rush-city-preview" aria-hidden="true">
                            <i style={{ background: option.accent }} /><i style={{ background: option.secondary }} />
                          </span>
                        </button>
                      ))}
                    </div>
                    {worldError && <p className="city-rush-error" role="alert">Le moteur 3D n’a pas pu démarrer : {worldError}</p>}
                    <div className="city-rush-intro-actions">
                      <button type="button" className="city-rush-text-button" onClick={goBack}>← MODE</button>
                      <button type="button" className="city-rush-start-button" onClick={goNext}>GARAGE <span>→</span></button>
                      <div className="city-rush-best-note"><span>MEILLEUR CHRONO · {city.name}</span><b>{bestTime ? formatTime(bestTime) : '— : —'}</b></div>
                    </div>
                  </>
                )}

                {introStep === 'garage' && (
                  <>
                    <div className="city-rush-intro-copy">
                      <span className="city-rush-overlay-kicker"><i /> 03 / GARAGE · {city.district} · {mode.name}</span>
                      <h2>PRÊT À<br /><em>ROULER.</em></h2>
                      <p>Choisis ta machine, son caractère et ton pilote. Six sportives aux silhouettes inspirées des grands coupés européens, sans logos ni noms de constructeurs réels.</p>
                    </div>

                    <section className="city-rush-car-select" aria-labelledby="city-rush-car-title">
                      <div className="city-rush-car-select-heading">
                        <span id="city-rush-car-title">GARAGE · 6 SPORTIVES</span>
                        <small>{selectedCar.name} · {selectedCar.className}</small>
                      </div>
                      <div className="city-rush-car-grid" role="group" aria-label="Choisir une voiture">
                        {CITY_RUSH_CARS.map((car, index) => (
                          <button key={car.id} type="button" className={`city-rush-car-card${carId === car.id ? ' is-selected' : ''}`} style={{ '--car-accent': car.accent }} onClick={() => setCarId(car.id)} aria-pressed={carId === car.id}>
                            <span className="city-rush-car-card-top">
                              <span className={`city-rush-car-silhouette is-${car.id}`} aria-hidden="true">
                                <svg viewBox="0 0 72 32" aria-hidden="true">
                                  <path d={car.archetype === 'volkswagen' ? 'M4 19 8 17 13 11 24 10 30 5 47 5 55 12 66 15 69 20 66 25 6 25Z' : car.archetype === 'porsche' ? 'M4 20 9 17 15 12 26 10 33 5 48 5 56 11 65 14 69 19 67 25 5 25Z' : car.archetype === 'lamborghini' || car.archetype === 'audi' ? 'M3 21 8 18 14 15 22 13 33 6 50 7 59 13 68 16 70 22 66 25 5 25Z' : car.archetype === 'bmw' ? 'M4 20 9 17 15 11 26 10 33 6 49 6 57 12 66 15 69 20 66 25 5 25Z' : 'M3 21 9 18 15 12 27 10 34 5 49 6 58 13 67 16 70 21 67 25 5 25Z'} />
                                  <path d="M18 12 27 11 34 6 46 7 53 13Z" />
                                  <circle cx="18" cy="24" r="4" /><circle cx="56" cy="24" r="4" />
                                </svg>
                              </span>
                              <span className="city-rush-car-number">0{index + 1}</span>
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
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="city-rush-driver-select" aria-labelledby="city-rush-driver-title">
                      <div className="city-rush-car-select-heading">
                        <span id="city-rush-driver-title">GRILLE · 4 PILOTES · {mode.name}</span>
                        <button type="button" className="city-rush-driver-cycle" onClick={cyclePlayerDriver}>CHANGER PILOTE ({roster[0].flag} {roster[0].displayName}) ↻</button>
                      </div>
                      <div className="city-rush-driver-grid" role="list" aria-label="Les 4 pilotes">
                        {roster.map((driver) => (
                          <div role="listitem" key={driver.id} className={`city-rush-driver-pill${driver.isPlayer ? ' is-player' : ''}`} style={{ '--driver-accent': driver.isPlayer ? '#43ead5' : driver.accent }} onClick={driver.isPlayer ? cyclePlayerDriver : undefined}>
                            <span className="city-rush-driver-pill-avatar"><CityRushDriverAvatar driver={driver} /></span>
                            <span className="city-rush-driver-pill-copy">
                              <b>{driver.name}{driver.isPlayer && <em className="city-rush-you-badge">TOI</em>}</b>
                              <small>{driver.flag} {driver.country}</small>
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>

                    {worldError && <p className="city-rush-error" role="alert">Le moteur 3D n’a pas pu démarrer : {worldError}</p>}

                    <div className="city-rush-intro-actions">
                      <button type="button" className="city-rush-text-button" onClick={goBack}>← VILLE</button>
                      <button type="button" className="city-rush-start-button" onClick={startRace}>DÉMARRER · {mode.name} <span>↗</span></button>
                      <div className="city-rush-best-note"><span>{city.name} · {mode.label}</span><b>{bestTime ? formatTime(bestTime) : '— : —'}</b></div>
                    </div>
                  </>
                )}

                <div className="city-rush-intro-foot">
                  <span>← → / Q D · VOIES</span>
                  <span>A Z E R · POUVOIRS</span>
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
                  <p>NICO VEGA · VEGA GT ’67 — muscle car noire à bandes rouges</p>
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
                <small>{currentStoryRace?.race?.name || city.district} · {currentLaps} TOURS · {RACE_KM}</small>
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
              <div className="city-rush-overlay city-rush-result-overlay">
                <span className="city-rush-overlay-kicker">{result.rank === 1 ? `VICTOIRE · ${activeModeName}` : `ARRIVÉE · ${activeModeName}`} · {result.laps || currentLaps} TOURS</span>
                <h2>{finalStoryVictory ? storyEnding ? <>{STORY_ENDINGS[storyEnding].title}<br /><em>FIN.</em></> : <>LE DERNIER<br /><em>CHOIX.</em></> : result.rank === 1 ? <>TU MÈNES<br /><em>LA DANSE.</em></> : <>LA VILLE<br /><em>EST À TOI.</em></>}</h2>
                <div className="city-rush-result-grid">
                  <div><small>PLACE</small><b>{ordinal(result.rank)}<i> / 4</i></b></div>
                  <div><small>CHRONO</small><b>{formatTime(result.duration)}</b></div>
                  <div><small>TOUR MOYEN</small><b>{formatTime((result.duration || 0) / (result.laps || currentLaps || CITY_RUSH_LAPS))}</b></div>
                  <div><small>BUTIN</small><b>{result.score}<i> PTS</i></b></div>
                </div>
                <p>
                  {finalStoryVictory && storyEnding
                    ? STORY_ENDINGS[storyEnding].text
                    : finalStoryVictory
                      ? 'Dante est vaincu. Nico tient enfin les preuves : à lui de choisir ce qu’il fera de sa revanche.'
                      : result.rank === 1
                        ? (storyMode ? `Tu remportes les ${result.laps || currentLaps} tours du circuit de ${city.name}.` : `Tu remportes le ${mode.name} sur ${city.name}.`)
                        : `${result.winner} franchit la ligne en tête après ${result.laps || currentLaps} tours. La revanche t’attend.`}{' '}
                  {!finalStoryVictory && `${result.pickups} objet${result.pickups > 1 ? 's' : ''} ramassé${result.pickups > 1 ? 's' : ''}.`}
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
            <span><i className="city-rush-footer-dot" /> {activeModeName} <b>·</b> {city.name} <b>·</b> {currentLaps} × {CITY_RUSH_LAP_LENGTH} M</span>
            <span className="city-rush-desktop-hint">← → / Q D : VOIES <b>·</b> Z / R : TIRS <b>·</b> A / E : AUTO <b>·</b> P : PAUSE <b>·</b> M : SON <b>·</b> F : PLEIN ÉCRAN</span>
            <span className="city-rush-mobile-hint">GLISSE GAUCHE / DROITE · OBJETS EN BAS</span>
          </div>
        </section>

        <aside className="city-rush-sidebar">
          <section className="city-rush-side-card city-rush-leaderboard">
            <div className="city-rush-side-heading"><span>POSITIONS · {activeModeName}</span><i>LIVE</i></div>
            <h3>Qui mène<br /><em>la course ?</em></h3>
            <div className="city-rush-racer-list">
              {standings.slice().sort((a, b) => a.rank - b.rank).map((racer) => (
                <div className={`city-rush-racer-card${racer.id === 'player' ? ' is-player' : ''}`} key={racer.id}>
                  <span className="city-rush-racer-rank">{String(racer.rank).padStart(2, '0')}</span>
                  <span className="city-rush-racer-avatar"><CityRushDriverAvatar driver={racer} /></span>
                  <div className="city-rush-racer-info">
                    <span className="city-rush-racer-name-row"><b>{racer.name}</b>{racer.id === 'player' && <em className="city-rush-you-badge">TOI</em>}</span>
                    <span className="city-rush-racer-country">{racer.flag} {racer.country}</span>
                    <small>TOUR {Math.min(racer.lap || 1, racer.laps || currentLaps)} <i>·</i> {Math.round(racer.distance || 0)} M</small>
                  </div>
                  <div className="city-rush-racer-meter"><i style={{ width: `${rankProgress(racer)}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="city-rush-leader-foot"><span>OBJECTIF · {activeModeName}</span><b>{currentLaps} TOURS · {currentDistance} M</b></div>
          </section>

          <section className="city-rush-side-card city-rush-item-guide">
            <div className="city-rush-side-heading"><span>OBJETS</span><i>4 COULEURS</i></div>
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
            </div>
          </section>

          <section className="city-rush-no-collision-note">
            <span className="city-rush-no-collision-icon">◎</span>
            <div><b>MODE {activeModeName} · {activeModeLabel}</b><p>{storyMode ? `${currentStoryRace?.race?.name || city.name} : ${currentStoryRace?.text || ''}` : mode.desc} Distance totale : {currentDistance} m. Le trafic bloque sans dégâts.</p></div>
          </section>

          <section className="city-rush-no-collision-note is-police">
            <span className="city-rush-no-collision-icon">🚨</span>
            <div><b>ESCOUADE DE POLICE</b><p>{!storyMode && mode.policeFromStart ? 'Active dès le départ en POURSUITE : trois berlines raflent les bonus rouges/jaunes et tirent.' : 'Au dernier tour en CIRCUIT/SPRINT, trois berlines entrent derrière le leader pour l’empêcher de s’armer.'} Elles arrivent armées : tir bleu et rafale rouge chargés (jamais l’hélico, qu’il faut voler). Hors classement, visibles sur mini-carte. Chaque berline a une barre de vie : 3 tirs droits bleus, 2 rafales rouges ou 1 tir d’hélico la détruisent — explosion, retrait de la course et +200 pts.</p></div>
          </section>
        </aside>
      </main>

      <footer className="city-rush-page-footer wrap"><Link to="/jeu">← RETOUR À L’ARCADE</Link><span>LET’S PLAY ARCADE · VICE CITY RUSH · {activeModeName} · {city.name}</span></footer>
    </div>
  );
}
