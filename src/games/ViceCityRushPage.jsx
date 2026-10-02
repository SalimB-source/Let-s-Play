import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ViceCityWorld from './ViceCityWorld';
import CityRushDriverAvatar from './CityRushDriverAvatar';
import CityRushMinimap from './CityRushMinimap';
import { CityRushAudio } from './cityRushAudio';
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

const BEST_KEY = 'letsplay_vice_city_rush_bests_v1';
const SOUND_KEY = 'letsplay_vice_city_rush_sound_v1';
const POWER_ORDER = [CITY_RUSH_POWERS.BLUE_SHOT, CITY_RUSH_POWERS.PISTOL, CITY_RUSH_POWERS.CASH, CITY_RUSH_POWERS.RADIO];
const CAR_STATS = [
  { key: 'power', label: 'PUISSANCE' },
  { key: 'acceleration', label: 'ACCÉLÉRATION' },
  { key: 'recovery', label: 'REPRISE' },
];

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
    desc: 'Deux berlines d’interception dès le départ. Elles volent tes bonus rouges/jaunes et tirent sans relâche.',
    accent: '#ffd44f',
    secondary: '#ff526e',
    laps: 3,
    policeFromStart: true,
    icon: '🚨',
    tag: 'HARDCORE',
  },
];

const RACE_KM = `${(CITY_RUSH_DISTANCE / 1000).toFixed(1).replace('.', ',')} KM`;
const LAP_SLOTS = Array.from({ length: CITY_RUSH_LAPS }, (_, index) => index + 1);
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
  const [carId, setCarId] = useState(CITY_RUSH_CARS[0].id);
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
  const [immersive, setImmersive] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [soundOn, setSoundOn] = useState(readSoundPref);
  const audioRef = useRef(null);
  const soundOnRef = useRef(soundOn);
  const actionsRef = useRef(null);
  const shellRef = useRef(null);
  const immersiveRef = useRef(false);
  const phaseRef = useRef(phase);
  const toastTimerRef = useRef(null);
  const lapTimerRef = useRef(null);
  const startRaceRef = useRef(null);
  const isTouchRef = useRef(isTouch);
  phaseRef.current = phase;
  isTouchRef.current = isTouch;
  soundOnRef.current = soundOn;

  const city = useMemo(() => CITY_RUSH_CITIES.find((item) => item.id === cityId) || CITY_RUSH_CITIES[0], [cityId]);
  const mode = useMemo(() => RACE_MODES.find((m) => m.id === modeId) || RACE_MODES[0], [modeId]);
  const daylight = useMemo(() => Boolean(cityRushTheme(city.id).daylight), [city.id]);
  const selectedCar = useMemo(() => CITY_RUSH_CARS.find((item) => item.id === carId) || CITY_RUSH_CARS[0], [carId]);
  const roster = useMemo(
    () => selectCityRushRacers({ cityId, carId: selectedCar.id, runId, playerDriverId }),
    [cityId, selectedCar.id, runId, playerDriverId],
  );
  const minimapState = useMemo(
    () => buildCityRushMinimapState(hud.racers, { cityId, carId: selectedCar.id, runId, playerDriverId }),
    [hud.racers, cityId, selectedCar.id, runId, playerDriverId],
  );
  const standings = minimapState.racers;
  const bestTime = bests[cityId] || null;

  const cyclePlayerDriver = () => {
    const currentIndex = CITY_RUSH_DRIVERS.findIndex((driver) => driver.id === playerDriverId);
    const nextDriver = CITY_RUSH_DRIVERS[(currentIndex + 1) % CITY_RUSH_DRIVERS.length];
    setPlayerDriverId(nextDriver.id);
  };

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia('(pointer: coarse)');
    setIsTouch(media.matches);
    const onChange = (event) => setIsTouch(event.matches);
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  const enterImmersive = () => {
    const shell = shellRef.current;
    if (!shell || immersiveRef.current || (!isTouchRef.current && !window.LetsPlayAndroid)) return;
    immersiveRef.current = true;
    setImmersive(true);
    document.body.classList.add('city-rush-lock');
    try {
      const request = shell.requestFullscreen || shell.webkitRequestFullscreen;
      const done = request?.call(shell);
      done?.catch?.(() => {});
    } catch {}
  };
  const exitImmersive = () => {
    if (!immersiveRef.current) return;
    immersiveRef.current = false;
    setImmersive(false);
    document.body.classList.remove('city-rush-lock');
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      try {
        const done = (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
        done?.catch?.(() => {});
      } catch {}
    }
  };
  useEffect(() => {
    const onFullscreenChange = () => {
      if (immersiveRef.current && !document.fullscreenElement && !document.webkitFullscreenElement) {
        immersiveRef.current = false;
        setImmersive(false);
        document.body.classList.remove('city-rush-lock');
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.body.classList.remove('city-rush-lock');
    };
  }, []);
  useEffect(() => {
    if (phase === 'intro' || phase === 'finished') exitImmersive();
  }, [phase]);

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
    else if (phase === 'intro') audio.stop();
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
    if (phaseRef.current !== 'intro') audioRef.current?.start();
  };
  toggleSoundRef.current = toggleSound;

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
      if ((key === 'escape' || key === 'p') && phaseRef.current === 'playing') {
        event.preventDefault();
        setPhase('paused');
      } else if ((key === 'escape' || key === 'p') && phaseRef.current === 'paused') {
        event.preventDefault();
        setPhase('playing');
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
  }, [phase]);

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
    enterImmersive();
    if (soundOnRef.current) audioRef.current?.start();
    setPhase('countdown');
  }
  startRaceRef.current = startRace;

  function finishRace(nextResult) {
    setResult(nextResult);
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
    else if (effect.type === 'rival-blue-shot') showToast(`${effect.rival} TIRE DROIT DEVANT LUI.`, 'blue-shot');
    else if (effect.type === 'radio') showToast(`HÉLICO EN APPROCHE · CIBLE : ${effect.target}.`, 'radio');
    else if (effect.type === 'missile-hit') showToast(`IMPACT · ${effect.target} immobilisé ${formatSeconds(effect.duration, 2)}.`, 'radio');
    else if (effect.type === 'radio-busy') showToast(effect.message, 'radio');
    else if (effect.type === 'radio-no-target') showToast('AUCUN RIVAL DEVANT TOI · LA JAUGE RESTE CHARGÉE.', 'radio');
    else if (effect.type === 'slow-zone') showToast('ZONE DE RALENTISSEMENT · Garde l’œil sur la route.', 'slow');
    else if (effect.type === 'traffic-hit') showToast('CHOC · TRAFIC · RALENTI.', 'slow');
    else if (effect.type === 'traffic-hit-player') showToast(`CHOC · ${effect.attacker || 'TRAFIC'} TE PERCUTE · RALENTI.`, 'slow');
    else if (effect.type === 'empty') showToast('AUCUN OBJET · Ramasse la bonne icône sur la route.', 'neutral');
    else if (effect.type === 'rival-final-lap') showToast(`${effect.rival} ENTAME LE DERNIER TOUR.`, 'neutral');
    else if (effect.type === 'police-arrival') showToast(effect.target === 'player' ? '🚨 POLICE · DEUX BERLINES SE JOIGNENT À LA COURSE JUSTE DERRIÈRE TOI · ELLES VISENT TES BONUS ROUGES ET JAUNES.' : `🚨 POLICE · L’ESCOUADE PREND ${effect.target} EN CHASSE.`, 'pistol');
    else if (effect.type === 'police-steal') showToast(`VOL DE BONUS · ${effect.police} A RAFLÉ ${effect.item === 'radio' ? 'L’HÉLICO (JAUNE)' : 'LA MITRAILLEUSE (ROUGE)'}${effect.ready ? ' · ELLE EST ARMÉE' : ''}.`, effect.item === 'radio' ? 'radio' : 'pistol');
    else if (effect.type === 'police-fire') showToast(`TATATATA ! ${effect.police} TE MITRAILLE · RALENTI ${formatSeconds(effect.duration, 2)}.`, 'pistol');
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
    if (introStep === 'mode') setIntroStep('city');
    else if (introStep === 'city') setIntroStep('garage');
    else startRace();
  };
  const goBack = () => {
    if (introStep === 'garage') setIntroStep('city');
    else if (introStep === 'city') setIntroStep('mode');
  };

  const currentLaps = mode.laps;
  const currentDistance = currentLaps * CITY_RUSH_LAP_LENGTH;

  return (
    <div className={`city-rush-page${immersive ? ' is-immersive' : ''}`} style={{ '--city-accent': city.accent, '--city-secondary': city.secondary, '--mode-accent': mode.accent, '--mode-secondary': mode.secondary }}>
      <header className="city-rush-heading wrap">
        <div>
          <p className="city-rush-eyebrow"><span className="city-rush-live-dot" /> LET’S PLAY ARCADE <span style={{ opacity: 0.4, margin: '0 6px' }}>/</span> STREET RALLY 3D</p>
          <h1>VICE CITY <em>RUSH</em></h1>
          <p className="city-rush-lede">
            Arcade néon 1986. {mode.name} · {city.name}. Choisis ton mode, ta ville, ton cabriolet. {currentLaps} tour{currentLaps > 1 ? 's' : ''} de {CITY_RUSH_LAP_LENGTH} m, trafic sans dégâts, bonus tactiques et police qui chasse le leader.
          </p>
        </div>
        <Link to="/jeu" className="city-rush-back">← RETOUR AUX JEUX</Link>
      </header>

      <main className="city-rush-layout wrap">
        <section className={`city-rush-shell${phase === 'playing' ? ' is-running' : ''}${immersive ? ' is-immersive' : ''}`} ref={shellRef} aria-label="Partie de Vice City Rush">
          <div className="city-rush-topbar">
            <div className="city-rush-location">
              <span className="city-rush-location-mark" aria-hidden="true">{introStep === 'mode' ? mode.icon : '⌖'}</span>
              <span>
                <b>{introStep === 'mode' ? mode.name : introStep === 'city' ? city.district : `${city.district} · ${selectedCar.name}`}</b>
                <small>
                  {introStep === 'mode' ? mode.label : introStep === 'city' ? `${city.label} · ${city.tagline}` : `${city.label} · ${mode.label}`}
                </small>
              </span>
            </div>
            <div className="city-rush-top-actions">
              <button type="button" className={`city-rush-top-button city-rush-sound-button${soundOn ? ' is-on' : ''}`} onClick={toggleSound} aria-pressed={soundOn} title={soundOn ? 'Couper son (M)' : 'Activer son (M)'} aria-label={soundOn ? 'Couper le son' : 'Activer le son'}>
                <span aria-hidden="true">{soundOn ? '♫' : '♪'}</span>
              </button>
              {phase === 'playing' && <>
                <span className="city-rush-live-pill"><i /> {mode.name} · EN COURSE</span>
                <button type="button" className="city-rush-top-button" onClick={() => setPhase('paused')}>Ⅱ PAUSE</button>
                <button type="button" className="city-rush-top-button is-quiet" onClick={() => { setPhase('intro'); setIntroStep('mode'); }}>↶ MENU</button>
              </>}
              {phase === 'paused' && <>
                <span className="city-rush-live-pill is-paused"><i /> PAUSE</span>
                <button type="button" className="city-rush-top-button is-resume" onClick={() => setPhase('playing')}>▶ REPRENDRE</button>
              </>}
              <span className="city-rush-top-flag"><i /> {currentLaps} TOUR{currentLaps > 1 ? 'S' : ''} · 4 VOIES</span>
            </div>
          </div>

          <div className={`city-rush-viewport${phase === 'playing' ? ' is-live' : ''}${hud.boostLeft > 0 && phase === 'playing' ? ' is-boosting' : ''}${hud.stunLeft > 0 && phase === 'playing' ? ' is-stunned' : ''}${hud.trafficImpactLeft > 0 && phase === 'playing' ? ' is-impacting' : ''}`}>
            <ViceCityWorld cityId={cityId} carId={selectedCar.id} active={phase === 'playing'} phase={phase} countdown={countdown} runId={runId} roster={roster} raceLaps={mode.laps} racePoliceFromStart={mode.policeFromStart} actionsRef={actionsRef} onReady={() => setWorldError('')} onError={(message) => setWorldError(message)} onHud={setHud} onFinish={finishRace} onPickup={onPowerPickup} onEffect={effectMessage} onLap={onLap} audioRef={audioRef} />
            <div className="city-rush-vignette" aria-hidden="true" />

            {phase === 'playing' && <>
              <div className="city-rush-hud-top">
                <div className="city-rush-hud-card city-rush-position-card">
                  <span className="city-rush-hud-label">POSITION</span>
                  <strong>{ordinal(hud.rank)}<small> / 4</small></strong>
                  <div className="city-rush-mini-lights"><i className={hud.rank === 1 ? 'is-lit' : ''} /><i className={hud.rank === 2 ? 'is-lit' : ''} /><i className={hud.rank === 3 ? 'is-lit' : ''} /><i className={hud.rank === 4 ? 'is-lit' : ''} /></div>
                </div>
                <div className={`city-rush-hud-card city-rush-distance-card city-rush-lap-card${hud.lap >= hud.laps ? ' is-final' : ''}`}>
                  <span className="city-rush-hud-label">{hud.lap >= hud.laps ? 'DERNIER TOUR' : 'TOUR'} · {mode.name}</span>
                  <strong>{Math.min(hud.lap || 1, hud.laps || CITY_RUSH_LAPS)}<small> / {hud.laps || CITY_RUSH_LAPS}</small><em>{hud.lapDistance} / {hud.lapLength || CITY_RUSH_LAP_LENGTH} m</em></strong>
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

              <CityRushMinimap racers={standings} pursuers={hud.police} cityId={cityId} carId={selectedCar.id} runId={runId} playerDriverId={playerDriverId} />

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
                  <button type="button" onClick={() => actionsRef.current?.('left')} aria-label="Aller à gauche">←</button>
                  <span>VOIES</span>
                  <button type="button" onClick={() => actionsRef.current?.('right')} aria-label="Aller à droite">→</button>
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
                      onClick={() => setIntroStep(step.id)}
                      aria-current={introStep === step.id ? 'step' : undefined}
                    >
                      <i>{idx + 1}</i><b>{step.label}</b>
                    </button>
                  ))}
                </div>

                {introStep === 'mode' && (
                  <>
                    <div className="city-rush-intro-copy">
                      <span className="city-rush-overlay-kicker"><i /> 01 / MODE DE COURSE</span>
                      <h2>CHOISIS TON<br /><em>MODE.</em></h2>
                      <p>Trois façons de rouler. Circuit classique, sprint chrono ou poursuite infernale avec police dès le départ.</p>
                    </div>
                    <div className="city-rush-mode-picker" role="group" aria-label="Choisir un mode de course">
                      {RACE_MODES.map((m, index) => (
                        <button
                          key={m.id}
                          type="button"
                          className={`city-rush-mode-card${modeId === m.id ? ' is-selected' : ''}`}
                          style={{ '--mode-accent': m.accent, '--mode-secondary': m.secondary }}
                          onClick={() => setModeId(m.id)}
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
                        CHOISIR LA VILLE <span>→</span>
                      </button>
                      <div className="city-rush-best-note"><span>MODE SÉLECTIONNÉ</span><b>{mode.name}</b></div>
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
                      <p>Cabriolet et pilote. Chaque voiture a sa conduite, chaque pilote son pays. Tu peux encore changer de ville ou de mode avant le départ.</p>
                    </div>

                    <section className="city-rush-car-select" aria-labelledby="city-rush-car-title">
                      <div className="city-rush-car-select-heading">
                        <span id="city-rush-car-title">CABRIOLET</span>
                        <small>{selectedCar.name} · stats sur 100</small>
                      </div>
                      <div className="city-rush-car-grid" role="group" aria-label="Choisir une voiture">
                        {CITY_RUSH_CARS.map((car, index) => (
                          <button key={car.id} type="button" className={`city-rush-car-card${carId === car.id ? ' is-selected' : ''}`} style={{ '--car-accent': car.accent }} onClick={() => setCarId(car.id)} aria-pressed={carId === car.id}>
                            <span className="city-rush-car-card-top">
                              <span className={`city-rush-car-silhouette is-${car.id}`} aria-hidden="true">
                                <svg viewBox="0 0 54 28"><path d="M5 17h3l4-7h25l7 7h3v7H6z" /><path d="m16 10 4-5h14l5 5z" /><circle cx="15" cy="23" r="3.5" /><circle cx="39" cy="23" r="3.5" /></svg>
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
                </div>
              </div>
            )}

            {phase === 'countdown' && (
              <div className="city-rush-overlay city-rush-countdown" aria-live="assertive">
                <span>{mode.name} · {city.district} · PRÊT ?</span>
                <strong key={countdown}>{countdown > 0 ? countdown : 'GO!'}</strong>
                <small>{mode.label} · {city.name} · {currentDistance} M</small>
              </div>
            )}

            {phase === 'paused' && (
              <div className="city-rush-overlay city-rush-pause-overlay">
                <span className="city-rush-overlay-kicker">COURSE SUSPENDUE · {mode.name}</span>
                <h2>REPRENDS<br /><em>LE VOLANT.</em></h2>
                <div className="city-rush-overlay-buttons">
                  <button type="button" className="city-rush-start-button" onClick={() => setPhase('playing')}>REPRENDRE <span>▶</span></button>
                  <button type="button" className="city-rush-text-button" onClick={() => { setPhase('intro'); setIntroStep('mode'); }}>MENU PRINCIPAL</button>
                </div>
                <small>{city.name} · {mode.label} · la route attend.</small>
              </div>
            )}

            {phase === 'finished' && result && (
              <div className="city-rush-overlay city-rush-result-overlay">
                <span className="city-rush-overlay-kicker">{result.rank === 1 ? `VICTOIRE · ${mode.name}` : `ARRIVÉE · ${mode.name}`} · {result.laps || currentLaps} TOURS</span>
                <h2>{result.rank === 1 ? <>TU MÈNES<br /><em>LA DANSE.</em></> : <>LA VILLE<br /><em>EST À TOI.</em></>}</h2>
                <div className="city-rush-result-grid">
                  <div><small>PLACE</small><b>{ordinal(result.rank)}<i> / 4</i></b></div>
                  <div><small>CHRONO</small><b>{formatTime(result.duration)}</b></div>
                  <div><small>TOUR MOYEN</small><b>{formatTime((result.duration || 0) / (result.laps || currentLaps || CITY_RUSH_LAPS))}</b></div>
                  <div><small>BUTIN</small><b>{result.score}<i> PTS</i></b></div>
                </div>
                <p>{result.rank === 1 ? `Tu remportes le ${mode.name} sur ${city.name}.` : `${result.winner} gagne le ${mode.name}.`} {result.pickups} bonus ramassés · {mode.label}.</p>
                <div className="city-rush-overlay-buttons">
                  <button type="button" className="city-rush-start-button" onClick={startRace}>REJOUER <span>↻</span></button>
                  <button type="button" className="city-rush-text-button" onClick={() => { setResult(null); setPhase('intro'); setIntroStep('mode'); }}>CHANGER DE MODE</button>
                </div>
              </div>
            )}
          </div>

          <div className="city-rush-shell-footer">
            <span><i className="city-rush-footer-dot" /> {mode.name} <b>·</b> {city.name} <b>·</b> {currentLaps} × {CITY_RUSH_LAP_LENGTH} M</span>
            <span className="city-rush-desktop-hint">← → / Q D : VOIES <b>·</b> Z / R : TIRS <b>·</b> A / E : AUTO <b>·</b> P : PAUSE <b>·</b> M : SON</span>
            <span className="city-rush-mobile-hint">GLISSE GAUCHE / DROITE · OBJETS EN BAS</span>
          </div>
        </section>

        <aside className="city-rush-sidebar">
          <section className="city-rush-side-card city-rush-leaderboard">
            <div className="city-rush-side-heading"><span>POSITIONS · {mode.name}</span><i>LIVE</i></div>
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
            <div className="city-rush-leader-foot"><span>OBJECTIF · {mode.name}</span><b>{currentLaps} TOURS · {currentDistance} M</b></div>
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
            <div><b>MODE {mode.name} · {mode.label}</b><p>{mode.desc} Distance totale : {currentDistance} m. Le trafic bloque sans dégâts.</p></div>
          </section>

          <section className="city-rush-no-collision-note is-police">
            <span className="city-rush-no-collision-icon">🚨</span>
            <div><b>ESCOUADE DE POLICE</b><p>{mode.policeFromStart ? 'Active dès le départ en POURSUITE : deux berlines raflent les bonus rouges/jaunes et tirent.' : 'Au dernier tour en CIRCUIT/SPRINT, deux berlines entrent derrière le leader pour l’empêcher de s’armer.'} Hors classement, visibles sur mini-carte.</p></div>
          </section>
        </aside>
      </main>

      <footer className="city-rush-page-footer wrap"><Link to="/jeu">← RETOUR À L’ARCADE</Link><span>LET’S PLAY ARCADE · VICE CITY RUSH · {mode.name} · {city.name}</span></footer>
    </div>
  );
}
