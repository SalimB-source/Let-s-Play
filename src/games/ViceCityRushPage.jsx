import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ViceCityWorld from './ViceCityWorld';
import {
  CITY_RUSH_CARS,
  CITY_RUSH_CITIES,
  CITY_RUSH_DISTANCE,
  CITY_RUSH_POWER_RULES,
  CITY_RUSH_POWERS,
  createCityRushInventory,
} from './cityRushRules';
import './vice-city-rush.css';

const BEST_KEY = 'letsplay_vice_city_rush_bests_v1';
const POWER_ORDER = [CITY_RUSH_POWERS.OIL, CITY_RUSH_POWERS.PISTOL, CITY_RUSH_POWERS.CASH, CITY_RUSH_POWERS.RADIO];
const CAR_STATS = [
  { key: 'power', label: 'PUISSANCE' },
  { key: 'acceleration', label: 'ACCÉLÉRATION' },
  { key: 'recovery', label: 'REPRISE APRÈS COUP' },
];
const EMPTY_HUD = {
  distance: 0,
  totalDistance: CITY_RUSH_DISTANCE,
  progress: 0,
  elapsed: 0,
  speed: 0,
  rank: 4,
  racers: [],
  inventory: createCityRushInventory(),
  score: 0,
  pickups: 0,
  slowLeft: 0,
  boostLeft: 0,
  stunLeft: 0,
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
        <rect x="4.5" y="8" width="23" height="16" rx="2.5" />
        <circle cx="16" cy="16" r="4.2" />
        <path d="M8 12h.01M24 20h.01" />
        <path d="M16 13.2v5.6m1.9-4.5c-.4-.7-1-.9-1.9-.9-1.1 0-1.8.6-1.8 1.4 0 2 3.9.8 3.9 2.8 0 .9-.8 1.5-2 1.5-.9 0-1.7-.3-2.2-1" />
      </>}
      {type === 'oil' && <>
        <path d="M8 24 20.5 11.5" />
        <path d="M18.4 7.6a6.1 6.1 0 0 1 7.7 7.7l-3.8-3.8-3.7 3.7 3.8 3.8a6.1 6.1 0 0 1-7.7-7.7" />
        <circle cx="7.5" cy="24.5" r="2.2" />
      </>}
      {type === 'pistol' && <>
        <path d="M4.5 11h17l5 3.5-4 3H16l-1.2 7h-4l.3-7H5z" />
        <path d="M21 12.2h5.5M8 14.4h10" />
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
  const [phase, setPhase] = useState('intro');
  const [countdown, setCountdown] = useState(3);
  const [runId, setRunId] = useState(0);
  const [hud, setHud] = useState(EMPTY_HUD);
  const [result, setResult] = useState(null);
  const [bests, setBests] = useState(readBests);
  const [toast, setToast] = useState(null);
  const [worldError, setWorldError] = useState('');
  const [immersive, setImmersive] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const actionsRef = useRef(null);
  const shellRef = useRef(null);
  const immersiveRef = useRef(false);
  const phaseRef = useRef(phase);
  const toastTimerRef = useRef(null);
  const startRaceRef = useRef(null);
  const isTouchRef = useRef(isTouch);
  phaseRef.current = phase;
  isTouchRef.current = isTouch;

  const city = useMemo(() => CITY_RUSH_CITIES.find((item) => item.id === cityId) || CITY_RUSH_CITIES[0], [cityId]);
  const selectedCar = useMemo(() => CITY_RUSH_CARS.find((item) => item.id === carId) || CITY_RUSH_CARS[0], [carId]);
  const bestTime = bests[cityId] || null;

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
    } catch { /* Le mode immersif CSS reste disponible. */ }
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
      } catch { /* Le navigateur peut avoir déjà quitté le plein écran. */ }
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
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // The ref always points at the latest start handler, even if touch
    // detection changes without changing the current phase.
  }, [phase]);

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  function showToast(message, tone = 'neutral') {
    window.clearTimeout(toastTimerRef.current);
    setToast({ message, tone, nonce: Date.now() });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2300);
  }

  function startRace() {
    setWorldError('');
    setResult(null);
    setHud(EMPTY_HUD);
    setCountdown(3);
    setRunId((value) => value + 1);
    enterImmersive();
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
    if (effect.type === 'cash') showToast('BOOST ACTIVÉ · 1,5 seconde de turbo.', 'cash');
    else if (effect.type === 'oil') showToast('HUILE DÉVERSÉE · Un rival peut déraper derrière toi.', 'oil');
    else if (effect.type === 'oil-hit') showToast(effect.target === 'TOI' ? `DÉRAPAGE · FLAQUE DE ${effect.owner || 'RIVAL'} · RALENTI.` : `DÉRAPAGE · ${effect.target} a traversé une flaque.`, 'oil');
    else if (effect.type === 'pistol') showToast(`PAN ! ${effect.target} dérape · ralenti ${formatSeconds(effect.duration, 2)}.`, 'pistol');
    else if (effect.type === 'pistol-hit-player') showToast(`PAN ! ${effect.attacker} TE FAIT DÉRAPER · RALENTI ${formatSeconds(effect.duration, 2)}.`, 'pistol');
    else if (effect.type === 'rival-boost') showToast(`${effect.rival} ACTIVE UN BOOST.`, 'cash');
    else if (effect.type === 'rival-oil') showToast(`${effect.rival} RÉPAND UNE FLAQUE D’HUILE.`, 'oil');
    else if (effect.type === 'radio') showToast(`HÉLICO EN APPROCHE · CIBLE : ${effect.target}.`, 'radio');
    else if (effect.type === 'missile-hit') showToast(`IMPACT · ${effect.target} immobilisé ${formatSeconds(effect.duration, 3)}.`, 'radio');
    else if (effect.type === 'radio-busy') showToast(effect.message, 'radio');
    else if (effect.type === 'slow-zone') showToast('ZONE DE RALENTISSEMENT · Garde l’œil sur la route.', 'slow');
    else if (effect.type === 'empty') showToast('AUCUN OBJET · Ramasse la bonne icône sur la route.', 'neutral');
  }

  const onPowerPickup = (pickup) => {
    const rule = CITY_RUSH_POWER_RULES[pickup.type];
    if (!rule) return;
    const progress = Math.min(rule.chargeCost, pickup.progress || 0);
    const message = pickup.newlyReady
      ? `${rule.shortName.toUpperCase()} PRÊT À UTILISER · TOUCHE ${rule.key}`
      : pickup.ready
        ? `${rule.shortName.toUpperCase()} · JAUGE PLEINE (${progress}/${rule.chargeCost})`
        : `${rule.shortName.toUpperCase()} · CHARGEMENT ${progress}/${rule.chargeCost}`;
    showToast(message, pickup.type);
  };

  const standings = hud.racers.length ? hud.racers : [
    { id: 'player', name: 'TOI', progress: 0, distance: 0, rank: 4 },
    { id: 'nova', name: 'NOVA', progress: 0, distance: 0, rank: 1 },
    { id: 'juno', name: 'JUNO', progress: 0, distance: 0, rank: 2 },
    { id: 'ace', name: 'ACE', progress: 0, distance: 0, rank: 3 },
  ].sort((a, b) => a.rank - b.rank);

  return (
    <div className={`city-rush-page${immersive ? ' is-immersive' : ''}`} style={{ '--city-accent': city.accent, '--city-secondary': city.secondary }}>
      <header className="city-rush-heading wrap">
        <div>
          <p className="city-rush-eyebrow"><span className="city-rush-live-dot" /> LET’S PLAY ARCADE <i>/</i> STREET RALLY 3D</p>
          <h1>VICE CITY <em>RUSH</em></h1>
          <p className="city-rush-lede">Choisis ta ville et ton cabriolet, évite le trafic lent et ramasse les bonus colorés. Les adversaires ne se percutent pas; le trafic bloque la voie sans dégâts ni pénalité.</p>
        </div>
        <Link to="/jeu" className="city-rush-back">← RETOUR AUX JEUX</Link>
      </header>

      <main className="city-rush-layout wrap">
        <section className={`city-rush-shell${phase === 'playing' ? ' is-running' : ''}${immersive ? ' is-immersive' : ''}`} ref={shellRef} aria-label="Partie de Vice City Rush">
          <div className="city-rush-topbar">
            <div className="city-rush-location">
              <span className="city-rush-location-mark" aria-hidden="true">⌖</span>
              <span><b>{city.district}</b><small>{city.label} <i>·</i> 1986 / NOW</small></span>
            </div>
            <div className="city-rush-top-actions">
              {phase === 'playing' && <>
                <span className="city-rush-live-pill"><i /> EN COURSE</span>
                <button type="button" className="city-rush-top-button" onClick={() => setPhase('paused')} aria-label="Mettre en pause">Ⅱ <span>PAUSE</span></button>
                <button type="button" className="city-rush-top-button is-quiet" onClick={() => setPhase('intro')} aria-label="Retour au choix des villes">↶ <span>MAP</span></button>
              </>}
              {phase === 'paused' && <>
                <span className="city-rush-live-pill is-paused"><i /> PAUSE</span>
                <button type="button" className="city-rush-top-button is-resume" onClick={() => setPhase('playing')}>▶ <span>REPRENDRE</span></button>
              </>}
              <span className="city-rush-top-flag"><i /> 4 VOIES · CONTACTS SANS DÉGÂTS</span>
            </div>
          </div>

          <div className={`city-rush-viewport${phase === 'playing' ? ' is-live' : ''}${hud.boostLeft > 0 && phase === 'playing' ? ' is-boosting' : ''}${hud.stunLeft > 0 && phase === 'playing' ? ' is-stunned' : ''}`}>
            <ViceCityWorld
              cityId={cityId}
              carId={selectedCar.id}
              active={phase === 'playing'}
              runId={runId}
              actionsRef={actionsRef}
              onReady={() => setWorldError('')}
              onError={(message) => setWorldError(message)}
              onHud={setHud}
              onFinish={finishRace}
              onPickup={onPowerPickup}
              onEffect={effectMessage}
            />

            <div className="city-rush-vignette" aria-hidden="true" />

            {phase === 'playing' && <>
              <div className="city-rush-hud-top">
                <div className="city-rush-hud-card city-rush-position-card">
                  <span className="city-rush-hud-label">POSITION</span>
                  <strong>{ordinal(hud.rank)}<small> / 4</small></strong>
                  <div className="city-rush-mini-lights"><i className={hud.rank === 1 ? 'is-lit' : ''} /><i className={hud.rank === 2 ? 'is-lit' : ''} /><i className={hud.rank === 3 ? 'is-lit' : ''} /><i className={hud.rank === 4 ? 'is-lit' : ''} /></div>
                </div>
                <div className="city-rush-hud-card city-rush-distance-card">
                  <span className="city-rush-hud-label">COURSE</span>
                  <strong>{hud.distance}<small> / {CITY_RUSH_DISTANCE} m</small></strong>
                  <div className="city-rush-progress-track"><i style={{ width: `${Math.max(0, Math.min(100, hud.progress * 100))}%` }} /></div>
                </div>
                <div className="city-rush-hud-card city-rush-speed-card">
                  <span className="city-rush-hud-label">VITESSE</span>
                  <strong>{hud.speed}<small> km/h</small></strong>
                  <span className="city-rush-time">{formatTime(hud.elapsed)}</span>
                </div>
              </div>

              <div className="city-rush-racer-strip" aria-label="Avancement de la course">
                {standings.map((racer) => (
                  <div className={`city-rush-racer-line${racer.id === 'player' ? ' is-player' : ''}`} key={racer.id} title={`${racer.name} · ${Math.round(racer.progress * 100)} %`}>
                    <span>{racer.name === 'TOI' ? 'YOU' : racer.name}</span>
                    <div><i style={{ left: `${rankProgress(racer)}%` }} /></div>
                  </div>
                ))}
              </div>

              {(hud.boostLeft > 0 || hud.slowLeft > 0 || hud.stunLeft > 0) && (
                <div className={`city-rush-status-pill${hud.stunLeft > 0 ? ' is-stunned' : hud.boostLeft > 0 ? ' is-boost' : ' is-slow'}`}>
                  {hud.stunLeft > 0 ? `MISSILE · ${hud.stunLeft.toFixed(1)} s` : hud.boostLeft > 0 ? `TURBO · ${hud.boostLeft.toFixed(1)} s` : `RALENTI · ${hud.slowLeft.toFixed(1)} s`}
                </div>
              )}

              {toast && <div className={`city-rush-toast is-${toast.tone}`} key={toast.nonce} role="status">{toast.message}</div>}

              <div className="city-rush-controls-bottom">
                <div className="city-rush-steering" aria-label="Changer de voie">
                  <button type="button" onClick={() => actionsRef.current?.('left')} aria-label="Aller à gauche">←</button>
                  <span>CHANGER DE VOIE</span>
                  <button type="button" onClick={() => actionsRef.current?.('right')} aria-label="Aller à droite">→</button>
                </div>
                <div className="city-rush-power-bar" aria-label="Objets spéciaux">
                  {POWER_ORDER.map((type) => {
                    const rule = CITY_RUSH_POWER_RULES[type];
                    const progress = Math.min(rule.chargeCost, Math.max(0, Number(hud.inventory?.[type]) || 0));
                    const ready = progress >= rule.chargeCost;
                    const progressPercent = Math.round((progress / rule.chargeCost) * 100);
                    return (
                      <button
                        type="button"
                        key={type}
                        className={`city-rush-power-button is-${type}${ready ? ' is-ready' : ''}`}
                        onClick={() => actionsRef.current?.(type)}
                        disabled={!ready}
                        title={`${rule.name} — ${rule.chargeCost} objets identiques pour charger. ${rule.description} Progression : ${progress}/${rule.chargeCost}. Touche ${rule.key} (AZERTY).`}
                        aria-label={`${rule.name} : ${progress} sur ${rule.chargeCost}${ready ? ', prêt à utiliser' : ''}`}
                      >
                        <span className="city-rush-power-icon"><PowerIcon type={type} /></span>
                        <span className="city-rush-power-copy">
                          <b>{rule.shortName}</b>
                          <small><span>{rule.key}</span> <i>·</i> {ready ? 'PRÊT' : `${progress}/${rule.chargeCost}`}</small>
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
                <div className="city-rush-intro-copy">
                  <span className="city-rush-overlay-kicker"><i /> STREET RALLY · ARCADE 80’S</span>
                  <h2>LA NUIT<br /><em>PREND LA ROUTE.</em></h2>
                  <p>{city.tagline} Choisis ta ville et ton cabriolet : chaque modèle a sa propre conduite.</p>
                </div>
                <div className="city-rush-car-select-heading city-rush-city-select-heading"><span>01 / CHOIX DE LA VILLE</span></div>
                <div className="city-rush-city-picker" role="group" aria-label="Choisir une ville">
                  {CITY_RUSH_CITIES.map((option, index) => (
                    <button
                      type="button"
                      key={option.id}
                      className={`city-rush-city-card${cityId === option.id ? ' is-selected' : ''}`}
                      style={{ '--card-accent': option.accent, '--card-secondary': option.secondary }}
                      onClick={() => setCityId(option.id)}
                      aria-pressed={cityId === option.id}
                    >
                      <span className="city-rush-city-number">0{index + 1}</span>
                      <b>{option.name}</b>
                      <small>{option.district}</small>
                      <i className="city-rush-city-card-line" />
                    </button>
                  ))}
                </div>
                <section className="city-rush-car-select" aria-labelledby="city-rush-car-title">
                  <div className="city-rush-car-select-heading">
                    <span id="city-rush-car-title">02 / CHOIX DU CABRIOLET</span>
                    <small>{selectedCar.name} · barres sur 100, plus haut = mieux</small>
                  </div>
                  <div className="city-rush-car-grid" role="group" aria-label="Choisir une voiture">
                    {CITY_RUSH_CARS.map((car, index) => (
                      <button
                        type="button"
                        key={car.id}
                        className={`city-rush-car-card${carId === car.id ? ' is-selected' : ''}`}
                        style={{ '--car-accent': car.accent }}
                        onClick={() => setCarId(car.id)}
                        aria-pressed={carId === car.id}
                        aria-label={`${car.name}, ${car.className}. Puissance ${car.power} sur 100, accélération ${car.acceleration} sur 100, reprise après coup ${car.recovery} sur 100.`}
                      >
                        <span className="city-rush-car-card-top">
                          <span className={`city-rush-car-silhouette is-${car.id}`} aria-hidden="true">
                            <svg viewBox="0 0 54 28">
                              <path d="M5 17h3l4-7h25l7 7h3v7H6z" />
                              <path d="m16 10 4-5h14l5 5z" />
                              <circle cx="15" cy="23" r="3.5" /><circle cx="39" cy="23" r="3.5" />
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
                {worldError && <p className="city-rush-error" role="alert">Le moteur 3D n’a pas pu démarrer : {worldError}</p>}
                <div className="city-rush-intro-actions">
                  <button type="button" className="city-rush-start-button" onClick={startRace}>DÉMARRER LA COURSE <span>↗</span></button>
                  <div className="city-rush-best-note"><span>MEILLEUR CHRONO</span><b>{bestTime ? formatTime(bestTime) : '— : —'}</b></div>
                </div>
                <div className="city-rush-intro-foot"><span>← → / Q D <i>·</i> POUR CHANGER DE VOIE</span><span>A Z E R <i>·</i> POUR UTILISER LES POUVOIRS</span></div>
              </div>
            )}

            {phase === 'countdown' && (
              <div className="city-rush-overlay city-rush-countdown" aria-live="assertive">
                <span>PRÊT·E, PILOTE ?</span>
                <strong key={countdown}>{countdown > 0 ? countdown : 'GO!'}</strong>
                <small>{city.district} · {CITY_RUSH_DISTANCE} M</small>
              </div>
            )}

            {phase === 'paused' && (
              <div className="city-rush-overlay city-rush-pause-overlay">
                <span className="city-rush-overlay-kicker">COURSE SUSPENDUE</span>
                <h2>REPRENDS<br /><em>LE VOLANT.</em></h2>
                <div className="city-rush-overlay-buttons">
                  <button type="button" className="city-rush-start-button" onClick={() => setPhase('playing')}>REPRENDRE <span>▶</span></button>
                  <button type="button" className="city-rush-text-button" onClick={() => setPhase('intro')}>CHOISIR UNE AUTRE VILLE</button>
                </div>
                <small>La route ne bouge plus. Les rivaux attendent.</small>
              </div>
            )}

            {phase === 'finished' && result && (
              <div className="city-rush-overlay city-rush-result-overlay">
                <span className="city-rush-overlay-kicker">{result.rank === 1 ? 'VICTOIRE · COURSE TERMINÉE' : 'ARRIVÉE · COURSE TERMINÉE'}</span>
                <h2>{result.rank === 1 ? <>TU MÈNES<br /><em>LA DANSE.</em></> : <>LA VILLE<br /><em>EST À TOI.</em></>}</h2>
                <div className="city-rush-result-grid">
                  <div><small>PLACE</small><b>{ordinal(result.rank)}<i> / 4</i></b></div>
                  <div><small>CHRONO</small><b>{formatTime(result.duration)}</b></div>
                  <div><small>BUTIN</small><b>{result.score}<i> PTS</i></b></div>
                </div>
                <p>{result.rank === 1 ? `Tu remportes le circuit de ${city.name}.` : `${result.winner} franchit la ligne en tête. La revanche t’attend.`} {result.pickups} objet{result.pickups > 1 ? 's' : ''} ramassé{result.pickups > 1 ? 's' : ''}.</p>
                <div className="city-rush-overlay-buttons">
                  <button type="button" className="city-rush-start-button" onClick={startRace}>REJOUER <span>↻</span></button>
                  <button type="button" className="city-rush-text-button" onClick={() => { setResult(null); setPhase('intro'); }}>CHANGER DE VILLE</button>
                </div>
              </div>
            )}
          </div>

          <div className="city-rush-shell-footer">
            <span><i className="city-rush-footer-dot" /> CIRCUIT OUVERT <b>·</b> {city.name} <b>·</b> {CITY_RUSH_DISTANCE} M</span>
            <span className="city-rush-desktop-hint">← → OU Q / D : VOIES <b>·</b> A / Z / E / R : POUVOIRS <b>·</b> P / ÉCHAP : PAUSE</span>
            <span className="city-rush-mobile-hint">GLISSE À GAUCHE OU À DROITE <b>·</b> OBJETS EN BAS</span>
          </div>
        </section>

        <aside className="city-rush-sidebar">
          <section className="city-rush-side-card city-rush-leaderboard">
            <div className="city-rush-side-heading"><span>01 / POSITIONS</span><i>LIVE</i></div>
            <h3>Qui mène<br /><em>la course ?</em></h3>
            <div className="city-rush-racer-list">
              {standings.slice().sort((a, b) => a.rank - b.rank).map((racer) => (
                <div className={`city-rush-racer-card${racer.id === 'player' ? ' is-player' : ''}`} key={racer.id}>
                  <span className="city-rush-racer-rank">{String(racer.rank).padStart(2, '0')}</span>
                  <div className="city-rush-racer-info"><b>{racer.id === 'player' ? 'TOI' : racer.name}</b><small>{Math.round(racer.distance || 0)} M</small></div>
                  <div className="city-rush-racer-meter"><i style={{ width: `${rankProgress(racer)}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="city-rush-leader-foot"><span>OBJECTIF</span><b>{CITY_RUSH_DISTANCE} M</b></div>
          </section>

          <section className="city-rush-side-card city-rush-item-guide">
            <div className="city-rush-side-heading"><span>02 / LES OBJETS</span><i>4 COULEURS</i></div>
            <h3>Ramasse.<br /><em>Déclenche.</em></h3>
            <div className="city-rush-guide-list">
              {POWER_ORDER.map((type) => {
                const rule = CITY_RUSH_POWER_RULES[type];
                return (
                  <div className={`city-rush-guide-item is-${type}`} key={type}>
                    <span><PowerIcon type={type} /></span>
                    <div><b>{rule.name} · {rule.chargeCost} POUR CHARGER</b><small>{rule.description}</small></div>
                    <kbd>{rule.key}</kbd>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="city-rush-no-collision-note">
            <span className="city-rush-no-collision-icon">◎</span>
            <div><b>ADVERSAIRES SANS COLLISION</b><p>Les adversaires ne se percutent pas. Le trafic lent — police, ambulance, camion-poubelle ou Lamborghini blanche — bloque la voie : contourne-le. Aucun dégât ni pénalité au contact ; évite aussi les zones de ralentissement.</p></div>
          </section>
        </aside>
      </main>

      <footer className="city-rush-page-footer wrap"><Link to="/jeu">← RETOUR À L’ARCADE</Link><span>LET’S PLAY ARCADE <i>·</i> VICE CITY RUSH <i>·</i> NÉONS & BITUME</span></footer>
    </div>
  );
}
