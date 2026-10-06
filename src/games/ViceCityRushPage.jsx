import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ViceCityWorld from './ViceCityWorld';
import CityRushDriverAvatar from './CityRushDriverAvatar';
import CityRushStoryScene from './CityRushStoryScene';
import CityRushRaceList from './CityRushRaceList';
import CityRushHealthBar from './CityRushHealthBar';
import FullscreenIcon from './FullscreenIcon';
import { CityRushAudio } from './cityRushAudio';
import { isFullscreenShortcut, nativeFullscreenElement, opensFullscreenOnLaunch } from './gameFullscreen';
import useGameFullscreen from './useGameFullscreen';
import { useAuth } from '../auth/AuthContext';
import {
  CITY_RUSH_STARTER_CAR_ID,
  awardCityRushRace,
  cityRushStorageKey,
  isCityRushCarFree,
  isCityRushCarOwned,
  isCityRushCourseUnlocked,
  loadCityRushAccountSave,
  migrateCityRushLegacyStory,
  normalizeCityRushProgress,
  normalizeCityRushSave,
  purchaseCityRushCar,
  writeCityRushSave,
} from './cityRushProgress';
import { fetchViceCityProgress, saveViceCityProgress, viceCityApiEnabled } from './viceCityApi';
import {
  CITY_RUSH_CARS,
  CITY_RUSH_COURSES,
  CITY_RUSH_DISTANCE,
  CITY_RUSH_DRIVERS,
  CITY_RUSH_FINAL_LAP_LOOPS,
  CITY_RUSH_FREE_CAR_COUNT,
  CITY_RUSH_LAPS,
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_SPRINT_CHECKPOINTS,
  CITY_RUSH_SPRINT_CHECKPOINT_SPACING,
  CITY_RUSH_SPRINT_DISTANCE,
  CITY_RUSH_PLAYER_SPEED,
  CITY_RUSH_CLEAN_LINE_MAX_BONUS,
  CITY_RUSH_ONCOMING_BONUS_MAX,
  NORDSCHLEIFE_RELIEF_M,
  CITY_RUSH_PLAYER_HEALTH_CRITICAL,
  cityRushCarMaxHealth,
  CITY_RUSH_WANTED_MAX_STARS,
  CITY_RUSH_PISTOL_AMMO_PER_PICKUP,
  CITY_RUSH_POLICE_AIM_TIME,
  CITY_RUSH_POWER_RULES,
  CITY_RUSH_POWERS,
  CITY_RUSH_PICKUPS,
  CITY_RUSH_TRACK_BOOST_DURATION,
  buildCityRushMinimapState,
  cityRushPacedSpeed,
  cityRushRaceDistance,
  cityRushSprintCheckpointTime,
  createCityRushInventory,
  selectCityRushRacers,
} from './cityRushRules';
import { cityRushTheme } from './cityRushThemes';
import { useAchievementAction } from '../achievements/AchievementContext';
import { VICE_CITY_STORY_MODE } from '../achievements/engine';
import './vice-city-rush.css';
import './vice-city-rush-cinematic.css';

// v4 : la boucle du stage double (600 m → 1 200 m), donc les courses à six
// tours passent à 8 400 m et le Sprint à seize checkpoints / 4 800 m ; les
// chronos des boucles plus courtes ne sont donc plus comparables.
// Les meilleurs temps et la préférence de son restent ceux de l'appareil : la
// progression sauvegardée (portefeuille, garage, parcours, Histoire), elle,
// suit le compte connecté via sa ligne privée (voir cityRushProgress.js).
const BEST_KEY = 'letsplay_vice_city_rush_bests_v4';
const SOUND_KEY = 'letsplay_vice_city_rush_sound_v1';
const POWER_ORDER = [CITY_RUSH_POWERS.PISTOL];
const CAR_STATS = [
  { key: 'power', label: 'PUISSANCE' },
  { key: 'acceleration', label: 'ACCÉLÉRATION' },
  { key: 'recovery', label: 'REPRISE' },
  // La coque s'affiche en carrés de vie : la barre suit la jauge `durability`
  // du catalogue, le nombre annonce ce que la voiture encaisse vraiment
  // (`cityRushCarMaxHealth`). Une petite voiture lente peut donc afficher une
  // longue barre et un gros chiffre, une supercar l'inverse.
  { key: 'durability', label: 'COQUE', cells: true },
];
const CITY_THUMBNAILS = {
  'vice-city': 'vice-city-thumb.jpg',
  'route-66': 'route-66-thumb.jpg',
  'new-york': 'new-york-thumb.jpg',
  tokyo: 'vice-city-story-tokyo.webp',
  paris: 'paris-thumb.jpg',
  london: 'london-thumb.jpg',
  'mexico-countryside': 'mexico-countryside-thumb.jpg',
  nordschleife: 'nordschleife-thumb.jpg',
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
  'volt-aero': 'car-volt-aero.jpg',
  'atlas-xr': 'car-atlas-xr.jpg',
  'pulse-rs': 'car-pulse-rs.jpg',
};

const STORY_ENDINGS = {
  revenge: { title: 'La revanche', text: 'Nico remet Dante aux autorités et restaure son nom. Sa vengeance s’arrête là — mais le promoteur qui a commandité le sabotage reste à retrouver.' },
  truth: { title: 'La vérité', text: 'Nico rend publiques toutes les preuves. Dante devra répondre de sa trahison, et le réseau du promoteur est exposé au grand jour.' },
};
// Les chapitres d'histoire suivent la nouvelle longueur du Circuit ; le finale
// « Le dernier tour » en compte un de plus.
const STORY_LAPS = CITY_RUSH_LAPS;
const STORY_FINALE_LAPS = STORY_LAPS + 1;
const STORY_CHAPTERS = [
  { city: 'vice-city', title: 'Le retour', speaker: 'Nico', race: { name: 'Ocean Drive — Sunset Run', type: 'Course côtière', route: 'Ocean Drive · South Beach · Collins Avenue' }, text: 'Trois ans après le sabotage, Nico Vega revient à Ocean Drive. Dante Cross a laissé une invitation au départ : gagne cette course et le prochain nom tombera.' },
  { city: 'new-york', title: 'La piste froide', speaker: 'Nico', kind: 'action', race: { name: 'Midtown — Heat Run', type: 'Échappée urbaine', route: 'Times Square · Broadway · Midtown Tunnel' }, text: 'L’escorte de Dante repère Nico dans Midtown. Sirènes derrière eux, Luna lâche un dernier indice à la radio : le prochain contact se cache à Tokyo.' },
  { city: 'tokyo', title: 'L’anneau de minuit', speaker: 'Nico', kind: 'action', race: { name: 'Shutō C1 — Midnight Loop', type: 'Sprint sur voie rapide', route: '日本橋 · 霞が関 掘割 · 芝公園 · 浜崎橋JCT · 汐留トンネル' }, text: 'Le mécanicien de Dante a les preuves, et l’échange tourne mal au pied du péage de 宝町. Nico saute au volant, dossier en main, et s’engage sur la C1 内回り : quatorze kilomètres huit cents de viaduc au-dessus de la ville, trois tunnels sous le palais impérial, aucun feu rouge — juste les portiques verts qui défilent et les hommes de Dante dans les rétros.' },
  { city: 'paris', title: 'Marché de dupes', speaker: 'Nico', kind: 'action', race: { name: 'Rive Gauche — Redline', type: 'Drift urbain', route: 'Saint-Germain · Quai de Conti · Boulevard Saint-Michel' }, text: 'Le promoteur tente de s’enfuir avec les preuves. Nico le prend en chasse dans les rues de Paris ; la vérité est dans la voiture rouge.' },
  { city: 'london', title: 'La soirée des ombres', speaker: 'Nico', kind: 'action', race: { name: 'Soho — After Hours', type: 'Course-poursuite', route: 'Piccadilly Circus · Soho · Tower Bridge' }, text: 'En costume, Nico s’invite à la réception privée du promoteur. Il surprend Dante qui ordonne de brûler les preuves — les gardes le repèrent, et la fuite se joue au volant dans les rues de Soho.' },
  { city: 'vice-city', title: 'Le dernier tour', speaker: 'Nico', kind: 'action', laps: STORY_FINALE_LAPS, race: { name: 'Vice City — Last Lap', type: 'Finale du circuit', route: 'Ocean Drive · Starfish Island · Vice City Docks' }, text: 'Dante pousse sa voiture rouge à fond sur Ocean Drive. Nico colle à son pare-chocs : une dernière course décidera de leur sort.' },
];
/**
 * Carrière d'une sauvegarde (portefeuille, garage, parcours validés).
 *
 * Migration douce : une ancienne campagne Histoire — jouée avant que les
 * parcours ne s'enchaînent — conserve les circuits déjà courus, sans ouvrir
 * Route 66 par erreur (le dernier parcours reste à décrocher sur la route).
 */
function careerFromSave(save) {
  const saved = normalizeCityRushProgress(save);
  const legacyCompletions = CITY_RUSH_COURSES
    .slice(0, Math.min(Number(save?.storyChapter) || 0, Math.max(0, CITY_RUSH_COURSES.length - 1)))
    .map((course) => course.id);
  return normalizeCityRushProgress({
    ...saved,
    completedCourseIds: [...saved.completedCourseIds, ...legacyCompletions],
  });
}

function formatCash(value = 0) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('fr-FR');
}

/**
 * Pastille du garage.
 *
 * Les trois voitures les moins puissantes du catalogue sont offertes à tous
 * (`cityRushFreeCarIds`) : elles ne montrent donc jamais de prix, pas même
 * quand la sauvegarde vient d'un ancien achat. La citadine de départ garde sa
 * pastille « DÉPART », les autres achats disent « ACHETÉE ».
 */
function carGarageBadge(car, owned) {
  if (!owned) return `🔒 ${formatCash(car?.price)} $`;
  if (car?.id === CITY_RUSH_STARTER_CAR_ID) return 'DÉPART';
  return isCityRushCarFree(car?.id) ? 'OFFERTE' : 'ACHETÉE';
}

const RACE_MODES = [
  {
    id: 'circuit',
    name: 'CIRCUIT',
    label: `${CITY_RUSH_LAPS} TOURS · CLASSIQUE`,
    desc: `${CITY_RUSH_LAPS} tours dont un dernier tour double, avec trafic et bonus. Au dernier tour, trois voitures de police te prennent pour cible ; tout rival qui tire sur une voiture de police reçoit son propre poursuivant. Les voitures de police du trafic sont vulnérables aux tirs rouges.`,
    accent: '#43ead5',
    secondary: '#ff5db8',
    laps: CITY_RUSH_LAPS,
    policeFromStart: false,
    cashRewards: true,
    icon: '◍',
    tag: 'RECOMMANDÉ',
  },
  {
    id: 'sprint',
    name: 'SPRINT',
    label: `SOLO · ${CITY_RUSH_SPRINT_CHECKPOINTS} CHECKPOINTS`,
    desc: `En solo contre la montre, sans adversaire ni police. Franchis ${CITY_RUSH_SPRINT_CHECKPOINTS} portes visibles espacées de 300 m : chaque checkpoint recharge le chrono à 15 s. Ramasse les pads turbo verts au sol pour accélérer ; aucune arme. Chrono à zéro, course perdue. Mode défi : aucun billet vert.`,
    accent: '#ff5db8',
    secondary: '#ffd44f',
    laps: 1,
    format: 'sprint',
    checkpoints: CITY_RUSH_SPRINT_CHECKPOINTS,
    policeFromStart: false,
    cashRewards: false,
    icon: '⚡',
    tag: 'SOLO',
  },
  {
    id: 'pursuit',
    name: 'POURSUITE',
    label: `${CITY_RUSH_LAPS} TOURS · POLICE TOTALE`,
    desc: `${CITY_RUSH_LAPS} tours, avec trois voitures de police sur tes traces dès le départ. Chaque rival qui touche une voiture de police avec un tir reçoit un poursuivant dédié. Les voitures de police du trafic peuvent aussi être détruites par les tirs rouges. Le joueur et ses adversaires ont chacun 15 carrés de vie ; le tir rouge en enlève un sans dérapage ni ralentissement — et une berline de police, qui en affiche six sur son toit, n’en perd jamais qu’un seul par balle. Une berline armée se range dans ton dos : change de voie ou décale-toi avant que sa mire ne se ferme. Mode défi : aucun billet vert.`,
    accent: '#ffd44f',
    secondary: '#ff526e',
    laps: CITY_RUSH_LAPS,
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
  // Le maximum n'est pas encore connu — chaque voiture a sa propre coque :
  // le monde l'annonce dès sa première image, et d'ici là c'est la coque de
  // la voiture sélectionnée qui sert de repli (voir `playerHealthMax` plus bas).
  playerHealth: null,
  playerHealthMax: null,
  playerHealthActive: false,
  playerHealthFlash: 0,
  police: [],
  wantedLevel: 0,
  wantedMaxStars: CITY_RUSH_WANTED_MAX_STARS,
  oncomingPoliceTurnarounds: [],
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
// Le bonus de checkpoint du Sprint tombe sur une demi-seconde : on l'écrit en
// français (« 12 » ou « 17,5 »), sans décimale inutile.
function formatSprintSeconds(seconds = 0) {
  const value = Math.max(0, Number(seconds) || 0);
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
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
  // Sauvegarde de l'appareil au premier rendu (cache du visiteur, ancienne
  // campagne Histoire reprise) : le compte connecté la remplace dès que son
  // instantané est chargé — voir l'effet de progression plus bas.
  const [initialSave] = useState(() => migrateCityRushLegacyStory());
  const [cityId, setCityId] = useState('vice-city');
  const [carId, setCarId] = useState(CITY_RUSH_STARTER_CAR_ID);
  const [storyMode, setStoryMode] = useState(false);
  const [storyChapter, setStoryChapter] = useState(initialSave.storyChapter);
  const [storyRaceChapter, setStoryRaceChapter] = useState(initialSave.storyChapter);
  const [storyEnding, setStoryEnding] = useState(initialSave.storyEnding);
  const [playerDriverId, setPlayerDriverId] = useState(CITY_RUSH_DRIVERS[0].id);
  const [modeId, setModeId] = useState(RACE_MODES[0].id);
  const [introStep, setIntroStep] = useState('mode'); // mode -> city -> garage
  const [phase, setPhase] = useState('intro');
  const [countdown, setCountdown] = useState(3);
  const [runId, setRunId] = useState(0);
  const [hud, setHud] = useState(EMPTY_HUD);
  const [result, setResult] = useState(null);
  const [bests, setBests] = useState(readBests);
  const [careerProgress, setCareerProgress] = useState(() => careerFromSave(initialSave));
  // Identifiant du propriétaire de la progression actuellement chargée : null
  // tant que l'instantané du compte (ou du visiteur) n'a pas été appliqué.
  const [loadedProgressUserId, setLoadedProgressUserId] = useState(null);
  const [toast, setToast] = useState(null);
  const [lapBanner, setLapBanner] = useState(null);
  const [worldError, setWorldError] = useState('');
  const [soundOn, setSoundOn] = useState(readSoundPref);
  const audioRef = useRef(null);
  const soundOnRef = useRef(soundOn);
  // Sauvegarde complète en mémoire (carrière + Histoire) : chaque écriture part
  // de cette copie, pour ne jamais perdre l'autre moitié du document.
  const saveRef = useRef(initialSave);
  const careerProgressRef = useRef(careerProgress);
  careerProgressRef.current = careerProgress;
  // File des écritures serveur : une course jouée juste après la connexion ne
  // peut pas être écrasée par l'instantané initial (même file que Mirage Rush).
  const progressSaveQueueRef = useRef(Promise.resolve());
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
  // Progression liée au compte — visiteur : cache de l'appareil ; compte
  // connecté : instantané de sa ligne privée `vice_city_rush_progress`, plus
  // un cache local propre au compte. Les courses restent bloquées tant que la
  // progression du compte courant n'est pas chargée (voir startRace/beginStory),
  // et une écriture locale ne part jamais vers la ligne d'un autre compte.
  const { user, isDemo } = useAuth();
  const connected = Boolean(user?.id) && !isDemo;
  const progressionOwnerId = connected ? user.id : null;
  const progressionReady = loadedProgressUserId === progressionOwnerId;
  const progressionKey = cityRushStorageKey(progressionOwnerId);
  phaseRef.current = phase;
  soundOnRef.current = soundOn;

  /** Applique une sauvegarde au jeu : carrière et campagne Histoire d'un coup. */
  const applySave = useCallback((rawSave) => {
    const next = normalizeCityRushSave(rawSave);
    const career = careerFromSave(next);
    const save = { ...next, ...career };
    saveRef.current = save;
    careerProgressRef.current = career;
    setCareerProgress(career);
    setStoryChapter(save.storyChapter);
    setStoryRaceChapter(save.storyChapter);
    setStoryEnding(save.storyEnding);
    return save;
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!connected) {
      applySave(migrateCityRushLegacyStory());
      setLoadedProgressUserId(null);
      return () => { cancelled = true; };
    }

    const ownerId = user.id;
    const storageKey = cityRushStorageKey(ownerId);
    const localSave = loadCityRushAccountSave(ownerId);
    applySave(localSave);
    setLoadedProgressUserId(null);

    if (!viceCityApiEnabled()) {
      writeCityRushSave(localSave, undefined, storageKey);
      setLoadedProgressUserId(ownerId);
      return () => { cancelled = true; };
    }

    (async () => {
      let remoteSave = null;
      let loadError = null;
      try {
        ({ progress: remoteSave, error: loadError } = await fetchViceCityProgress(ownerId));
      } catch (error) {
        loadError = error;
      }
      if (cancelled) return;

      const hasRemoteSnapshot = !loadError
        && remoteSave
        && typeof remoteSave === 'object'
        && !Array.isArray(remoteSave)
        && Object.keys(remoteSave).length > 0;
      // L'instantané du compte est la référence — il porte aussi les
      // déblocages accordés côté serveur ; sans lui, le cache local du compte
      // (première connexion sur cet appareil) prend le relais.
      const nextSave = hasRemoteSnapshot ? applySave(remoteSave) : localSave;
      writeCityRushSave(nextSave, undefined, storageKey);
      setLoadedProgressUserId(ownerId);

      // Première connexion : publier la copie locale comme ligne du compte,
      // une seule fois, avant les écritures des courses suivantes. Un
      // chargement en échec (hors ligne) n'écrit jamais.
      if (!loadError && !hasRemoteSnapshot) {
        progressSaveQueueRef.current = progressSaveQueueRef.current
          .catch(() => false)
          .then(() => saveViceCityProgress(ownerId, nextSave))
          .catch(() => false);
      }
    })();

    return () => { cancelled = true; };
  }, [applySave, connected, user?.id]);

  /**
   * Écrit la sauvegarde : cache local d'abord (l'appareil ou le compte), copie
   * serveur ensuite quand un compte est connecté et sa progression chargée.
   */
  const persistSave = useCallback((patch) => {
    const next = writeCityRushSave({ ...saveRef.current, ...patch }, undefined, progressionKey);
    saveRef.current = next;
    if (connected && progressionReady) {
      const ownerId = user.id;
      progressSaveQueueRef.current = progressSaveQueueRef.current
        .catch(() => false)
        .then(() => saveViceCityProgress(ownerId, next))
        .catch(() => false);
    }
    return next;
  }, [connected, progressionKey, progressionReady, user?.id]);

  const city = useMemo(() => CITY_RUSH_COURSES.find((item) => item.id === cityId) || CITY_RUSH_COURSES[0], [cityId]);
  const mode = useMemo(() => RACE_MODES.find((m) => m.id === modeId) || RACE_MODES[0], [modeId]);
  const currentStoryRace = storyMode ? STORY_CHAPTERS[storyRaceChapter] : null;
  const currentLaps = storyMode ? (currentStoryRace?.laps ?? STORY_LAPS) : mode.laps;
  // Le dernier tour enchaîne deux boucles : 6 tours = 5 × 1 200 m + 2 400 m.
  const sprintMode = !storyMode && mode.format === 'sprint';
  const currentDistance = sprintMode ? CITY_RUSH_SPRINT_DISTANCE : cityRushRaceDistance(currentLaps);
  const RACE_KM = `${(currentDistance / 1000).toFixed(1).replace('.', ',')} KM`;
  const activeModeName = storyMode ? 'HISTOIRE' : mode.name;
  const activeModeLabel = storyMode ? `CHAPITRE ${String(storyRaceChapter + 1).padStart(2, '0')} / ${STORY_CHAPTERS.length}` : mode.label;
  const cashRewardsEnabled = storyMode || mode.cashRewards !== false;
  const daylight = useMemo(() => Boolean(cityRushTheme(city.id).daylight), [city.id]);
  const selectedCar = useMemo(() => CITY_RUSH_CARS.find((item) => item.id === carId) || CITY_RUSH_CARS[0], [carId]);
  // Chrono du Sprint : la valeur publiée par le monde pendant la course, et
  // sinon celle calculée pour la voiture sélectionnée dans le garage — au
  // rythme du parcours, exactement comme le monde : sur le Ring, plus posé, la
  // marge annoncée est la marge réellement accordée.
  const sprintCheckpointBonus = useMemo(
    () => cityRushSprintCheckpointTime(cityRushPacedSpeed(CITY_RUSH_PLAYER_SPEED * selectedCar.powerMultiplier, city)),
    [selectedCar, city],
  );
  const sprintCheckpointSeconds = Math.max(0, Number(hud.sprint?.timeTotal) || sprintCheckpointBonus);
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
  // Checkpoint visé : en Sprint il remplace la place au classement,
  // puisqu'il n'y a personne d'autre en piste.
  const sprintCheckpoint = Math.min((Number(hud.sprint?.checkpoints) || 0) + 1, CITY_RUSH_SPRINT_CHECKPOINTS);
  const wantedStars = Math.max(0, Math.min(
    Number(hud.wantedMaxStars) || CITY_RUSH_WANTED_MAX_STARS,
    Number.isFinite(Number(hud.wantedLevel))
      ? Number(hud.wantedLevel)
      : (Array.isArray(hud.police) ? hud.police.length : 0),
  ));
  // Chaque voiture a sa propre coque : les cellules s'allument par groupes
  // bleu, vert et jaune, puis les trois dernières deviennent rouges. Sept
  // carrés pour une PULSE RS, vingt-trois pour une MISTRAL 1.4 (le maximum
  // arrive par le HUD du monde ; celui de la voiture sélectionnée sert de
  // repli avant le premier envoi).
  const playerHealthMax = Math.max(
    1,
    Number(hud.playerHealthMax) || cityRushCarMaxHealth(selectedCar),
  );
  const playerHealthValue = hud.playerHealth === null || hud.playerHealth === undefined
    ? null
    : Math.max(0, Math.min(playerHealthMax, Number(hud.playerHealth) || 0));
  const playerHealthCritical = playerHealthValue !== null && playerHealthValue <= CITY_RUSH_PLAYER_HEALTH_CRITICAL;
  // Mire d'une berline dans le dos : progression du viseur (0 → 1) de la
  // berline qui tient le pilote dans sa ligne de tir. Elle alimente le halo
  // rouge du cadre : le pilote voit qu'il est visé avant que la rafale ne
  // parte, et peut se décaler pour casser l'alignement.
  const policeAim = (Array.isArray(hud.police) ? hud.police : [])
    .filter((car) => car?.aimTargetId === 'player')
    .reduce((best, car) => Math.max(best, Number(car.aim) || 0), 0);
  // Bonus de contresens : pourcentage de vitesse cumulé dans les voies en sens
  // inverse (0 % tant que la jauge est vide). C'est la récompense des voies les
  // plus dangereuses de la chaussée, et elle se paie d'un choc frontal.
  const oncomingBonusPercent = Math.max(0, Math.round(((Number(hud.oncomingBonus) || 1) - 1) * 100));
  const oncomingCharged = oncomingBonusPercent > 0;
  const statusTone = hud.stunLeft > 0
    ? 'is-stunned'
    : hud.trafficImpactLeft > 0
      ? 'is-impact'
      : hud.boostLeft > 0
        ? 'is-boost'
        : hud.slowLeft > 0
          ? 'is-slow'
          : 'is-oncoming';
  const bestTime = bests[cityId] || null;
  const isRaceWon = Boolean(!storyMode && result && result.rank === 1 && !result.destroyed && !result.timedOut);
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
    const saved = persistSave(normalizeCityRushProgress(nextProgress));
    const career = careerFromSave(saved);
    careerProgressRef.current = career;
    setCareerProgress(career);
  }
  function showLapBanner(info) {
    window.clearTimeout(lapTimerRef.current);
    setLapBanner({ ...info, nonce: Date.now() });
    lapTimerRef.current = window.setTimeout(() => setLapBanner(null), info.final ? 2300 : 1800);
  }
  function startRace({ carId: requestedCarId = null, cityId: requestedCityId = null } = {}) {
    // Compte en cours de chargement : la course partirait sur la progression
    // précédente (celle de l'appareil ou d'un autre compte).
    if (connected && !progressionReady) return;
    const savedProgress = careerProgressRef.current;
    const targetCityId = requestedCityId || (storyMode ? (currentStoryRace?.city || cityId) : cityId);
    const selectedCarId = requestedCarId || carId;
    if (!isCityRushCourseUnlocked(savedProgress, targetCityId)) {
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
    if (requestedCityId && requestedCityId !== cityId) {
      setCityId(requestedCityId);
    }
    activeRaceSessionRef.current += 1;
    setWorldError('');
    setResult(null);
    setHud(EMPTY_HUD);
    setLapBanner(null);
    window.clearTimeout(lapTimerRef.current);
    setCountdown(3);
    setRunId((value) => value + 1);
    // Clic sur « LANCER » (« REJOUER », « COURSE SUIVANTE », « CHAPITRE SUIVANT ») ou touche Entrée :
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

  function startNextRace() {
    const currentCourseId = result?.city || cityId;
    const courseIndex = CITY_RUSH_COURSES.findIndex((course) => course.id === currentCourseId);
    const nextCourse = courseIndex >= 0
      ? CITY_RUSH_COURSES[(courseIndex + 1) % CITY_RUSH_COURSES.length]
      : CITY_RUSH_COURSES[0];
    if (nextCourse) {
      startRace({ cityId: nextCourse.id });
    }
  }

  function beginStory() {
    if (connected && !progressionReady) return;
    if (storyChapter >= STORY_CHAPTERS.length) {
      setStoryChapter(0);
      setStoryEnding('');
      persistSave({ storyChapter: 0, storyEnding: '' });
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
    persistSave({ storyEnding: ending });
  }

  function restartStory() {
    setStoryMode(false);
    setStoryChapter(0);
    setStoryRaceChapter(0);
    setStoryEnding('');
    setResult(null);
    persistSave({ storyChapter: 0, storyEnding: '' });
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
      persistSave({ storyChapter: nextChapter });
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
    if (effect.type === 'wanted-level') {
      const stars = Math.max(0, Math.min(CITY_RUSH_WANTED_MAX_STARS, Number(effect.stars) || 0));
      showToast(`🚨 NIVEAU DE RECHERCHE · ${stars} ÉTOILE${stars > 1 ? 'S' : ''} SUR ${CITY_RUSH_WANTED_MAX_STARS}`, 'pistol');
    }
    else if (effect.type === 'police-oncoming-turnaround') {
      const count = Math.max(1, Number(effect.count) || 1);
      showToast(`🚨 ${count} PATROUILLE${count > 1 ? 'S' : ''} EN FACE · DEMI-TOUR EN COURS (${Number(effect.duration).toFixed(1)} S).`, 'pistol');
    }
    else if (effect.type === 'pistol') showToast(`AK-47 · ${effect.target} TOUCHÉ · −1 CARRÉ · ${effect.health}/${effect.maxHealth} CARRÉS DE VIE.`, 'pistol');
    else if (effect.type === 'pistol-hit-player') showToast(`AK-47 · ${effect.attacker} TE TOUCHE · −1 CARRÉ · ${effect.health}/${effect.maxHealth} CARRÉS.`, 'pistol');
    else if (effect.type === 'rival-boost') showToast(`${effect.rival} PASSE SUR UN PAD TURBO.`, 'boost');
    else if (effect.type === 'traffic-impact') {
      // Chaque choc contre une voiture coûte un carré de vie ; le répit de choc
      // (`CITY_RUSH_PLAYER_COLLISION_COOLDOWN`) fait qu'un carambolage en chaîne
      // n'est facturé qu'une fois, et le bandeau le dit alors franchement.
      const cost = effect.isPlayer
        ? (effect.healthLost > 0
          ? ` · −1 CARRÉ (${effect.health}/${effect.maxHealth})`
          : ' · RÉPIT DE CHOC · PAS DE CARRÉ')
        : '';
      showToast(
        effect.oncoming
          ? effect.policeContact
            ? `CONTACT POLICIER · LA PATROUILLE EN FACE FAIT DEMI-TOUR${cost}.`
            : `CHOC FRONTAL · LA VOITURE EN FACE EST POUSSÉE À ${effect.pushDirection === 'right' ? 'DROITE' : 'GAUCHE'} · BONUS DE CONTRESENS PERDU${cost}.`
          : `CHOC · ${effect.traffic || 'TRAFIC'} · RALENTI${cost}.`,
        effect.policeContact ? 'pistol' : 'slow',
      );
    }
    else if (effect.type === 'empty') showToast('AUCUN OBJET · Ramasse la bonne icône sur la route.', 'neutral');
    else if (effect.type === 'rival-final-lap') showToast(`${effect.rival} ENTAME LE DERNIER TOUR.`, 'neutral');
    else if (effect.type === 'police-steal') showToast(`VOL DE BONUS · ${effect.police} A RAFLÉ L’AK-47 (ROUGE)${effect.ready ? ' · IL EST CHARGÉ' : ''}.`, 'pistol');
    else if (effect.type === 'police-aim') showToast(`🎯 ${effect.police} DANS TON DOS · DÉCALE-TOI OU ELLE TIRE.`, 'pistol');
    else if (effect.type === 'police-rally') showToast(
      `${effect.targetId === 'player' ? `🚨 ${effect.police} TE PREND EN CHASSE · ELLE REJOINT L’ESCOUADE.` : `🚨 ${effect.police} PREND ${effect.target === 'player' ? 'TOI' : effect.target} EN CHASSE.`}${effect.healthLost > 0 ? ` CHOC · −1 CARRÉ (${effect.health}/${effect.maxHealth}).` : ''}`,
      'pistol',
    );
    else if (effect.type === 'police-hit' && effect.source === 'pistol') {
      showToast(`AK-47 · ${effect.police} TOUCHÉE · −1 CARRÉ · ${effect.health}/${effect.maxHealth} CARRÉS.`, 'pistol');
    }
    else if (effect.type === 'police-hit' && effect.source === 'collision') {
      // Le carambolage abîme les deux coques : la berline perd un point, le
      // pilote un carré, ou deux contre un SUV — sauf pendant le répit de choc.
      showToast(
        effect.playerHealthLost > 0
          ? `IMPACT À L’ACCÉLÉRATION · ${effect.police} PERD 1 POINT · TA COQUE PERD ${effect.playerHealthLost} CARRÉ${effect.playerHealthLost > 1 ? 'S' : ''} (${effect.playerHealth}/${effect.playerHealthMax}).`
          : `IMPACT · ${effect.police} PERD 1 POINT · RÉPIT DE CHOC · TA COQUE EST INTACTE.`,
        'pistol',
      );
    }
    else if (effect.type === 'police-destroyed') showToast(effect.byPlayer
      ? `💥 ${effect.police} DÉTRUITE · +200 PTS${effect.reinforcementScheduled ? ' · RENFORT EN ROUTE.' : ' · ELLE QUITTE LA COURSE.'}`
      : `💥 ${effect.police} DÉTRUITE${effect.reinforcementScheduled ? ' · RENFORT EN ROUTE.' : ' · ELLE QUITTE LA COURSE.'}`, 'radio');
    else if (effect.type === 'police-retaliation') showToast(`🚨 RENFORT · ${effect.police} PREND ${effect.target} EN CHASSE.`, 'pistol');
    else if (effect.type === 'racer-wrecked') showToast(`💥 ${effect.target} EST HORS COURSE.`, 'radio');
    else if (effect.type === 'police-reinforcement') showToast(`🚨 RENFORT · ${effect.police} TE PREND EN CHASSE.`, 'pistol');
    else if (effect.type === 'tunnel-enter' && effect.closed > 0) {
      const wall = effect.walls > 1 ? 'PAROIS DES DEUX CÔTÉS' : `PAROI À ${effect.side === 'left' ? 'GAUCHE' : 'DROITE'}`;
      showToast(`${effect.name} · ${effect.open} VOIES OUVERTES SUR 4 · ${wall}.`, 'neutral');
    }
    else if (effect.type === 'sprint-timeout') showToast(`TEMPS ÉCOULÉ · ${effect.checkpoints} / ${CITY_RUSH_SPRINT_CHECKPOINTS} CHECKPOINTS.`, 'slow');
    else if (effect.type === 'tunnel-scrape') showToast('PAROI RACLÉE · LA VOIE EST MURÉE SOUS LE TUNNEL · RALENTI.', 'slow');
    else if (effect.type === 'ramp-jump') showToast(`TREMPLIN · SAUT ${Math.round(effect.distance)} M !`, 'boost');
    else if (effect.type === 'jump-overpass') showToast('SAUT PAR-DESSUS LE TRAFIC !', 'boost');
    else if (effect.type === 'oncoming-bonus') {
      if (effect.stage === 'charging') showToast('CONTRESENS · BONUS DE VITESSE EN CHARGE · TIENS LA VOIE INVERSE.', 'boost');
      else if (effect.stage === 'full') showToast(`CONTRESENS · +${Math.round((CITY_RUSH_ONCOMING_BONUS_MAX - 1) * 100)} % PLEIN GAZ !`, 'boost');
      else if (effect.stage === 'lost') showToast('CHOC FRONTAL · BONUS DE CONTRESENS PERDU.', 'slow');
    }
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
    if (pickup.type === CITY_RUSH_POWERS.PISTOL) {
      showToast(`AK-47 · CHARGEUR PLEIN · ${pickup.progress || CITY_RUSH_PISTOL_AMMO_PER_PICKUP}/${CITY_RUSH_PISTOL_AMMO_PER_PICKUP} BALLES`, pickup.type);
      return;
    }
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

          <div
            className={`city-rush-viewport${phase === 'intro' ? ' is-intro' : ''}${phase === 'playing' ? ' is-live' : ''}${hud.boostLeft > 0 && phase === 'playing' ? ' is-boosting' : ''}${hud.stunLeft > 0 && phase === 'playing' ? ' is-stunned' : ''}${hud.trafficImpactLeft > 0 && phase === 'playing' ? ' is-impacting' : ''}${hud.playerHealthFlash > 0 && phase === 'playing' ? ' is-hurt' : ''}${policeAim > 0 && phase === 'playing' ? ' is-aimed' : ''}`}
            style={policeAim > 0 ? { '--cr-aim': policeAim.toFixed(2) } : undefined}
          >
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
                        <i style={{ width: slot <= hud.sprint.checkpoints ? '100%' : slot === hud.sprint.checkpoints + 1 ? `${Math.max(0, Math.min(100, (hud.sprint.timeLeft / sprintCheckpointSeconds) * 100))}%` : '0%' }} />
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
                  {oncomingCharged && (
                    <span className="city-rush-speed-bonus" aria-label={`Bonus de contresens : plus ${oncomingBonusPercent} pour cent de vitesse`}>
                      +{oncomingBonusPercent} %
                    </span>
                  )}
                  <span className="city-rush-time">{formatTime(hud.elapsed)}</span>
                </div>
              </div>

              {playerHealthValue !== null && phase === 'playing' && (
                <div
                  className={`city-rush-health${playerHealthCritical ? ' is-critical' : ''}${hud.playerHealthFlash > 0 ? ' is-hit' : ''}`}
                  role="status"
                  aria-label={`Vie de ta voiture : ${playerHealthValue} carrés sur ${playerHealthMax}${playerHealthCritical ? ' — critique' : ''}`}
                >
                  <span className="city-rush-health-head">
                    <b>VIE</b>
                    <small>{playerHealthCritical ? 'CRITIQUE' : `${playerHealthValue}/${playerHealthMax}`}</small>
                  </span>
                  <CityRushHealthBar health={playerHealthValue} maxHealth={playerHealthMax} label="Vie du joueur" flash={hud.playerHealthFlash > 0} />
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
                  {/* Circuit permanent : l'altitude et la surface du point
                      traversé remplacent la couverture des voies urbaines. */}
                  {hud.route.altitudeM !== undefined && (
                    <span className="city-rush-route-cover is-altitude">
                      {hud.route.tag || `ALTITUDE · ${hud.route.altitudeM} M`}
                    </span>
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

              <div className={`city-rush-gta-cash${wantedStars > 0 ? ' is-wanted' : ''}`} aria-label={`Butin : ${hud.score || 0} points`}>
                <b>{(hud.score || 0).toLocaleString('fr-FR')} PTS</b>
                <small>{formatTime(hud.elapsed)}</small>
                {wantedStars > 0 && (
                  <span className="city-rush-gta-wanted" role="status" aria-label={`Police en chasse · niveau ${wantedStars} sur ${CITY_RUSH_WANTED_MAX_STARS}`}>
                    {Array.from({ length: CITY_RUSH_WANTED_MAX_STARS }, (_, index) => index + 1)
                      .map((star) => <i key={star} className={star <= wantedStars ? 'is-on' : ''} aria-hidden="true">★</i>)}
                  </span>
                )}
              </div>

              {!sprintMode && <div className="city-rush-radar">
                <CityRushRaceList racers={standings} pursuers={hud.police} laps={currentLaps} />
              </div>}

              {(hud.boostLeft > 0 || hud.slowLeft > 0 || hud.trafficImpactLeft > 0 || hud.stunLeft > 0 || oncomingCharged) && (
                <div className={`city-rush-status-pill ${statusTone}`}>
                  {hud.stunLeft > 0
                    ? `ÉPAVE · ${hud.stunLeft.toFixed(1)} s`
                    : hud.trafficImpactLeft > 0
                      ? `CHOC · ${hud.trafficImpactLeft.toFixed(1)} s`
                      : hud.boostLeft > 0
                        ? `TURBO · ${hud.boostLeft.toFixed(1)} s`
                        : hud.slowLeft > 0
                          ? `RALENTI · ${hud.slowLeft.toFixed(1)} s`
                          : `CONTRESENS · +${oncomingBonusPercent} %`}
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
                {/* Le Sprint n'a pas d'arme : seuls les boosts au sol sont
                    disponibles, le bouton AK-47 n'a donc pas sa place ici. */}
                {!sprintMode && (() => {
                  const type = CITY_RUSH_POWERS.PISTOL;
                  const rule = CITY_RUSH_POWER_RULES[type];
                  const ammo = Math.max(0, Math.min(rule.chargeCost, Number(hud.inventory?.[type]) || 0));
                  const ready = ammo > 0;
                  return (
                    <button
                      type="button"
                      className={`city-rush-machine-gun-button${ready ? ' is-ready' : ''}`}
                      onClick={() => actionsRef.current?.(type)}
                      disabled={!ready}
                      title={ready ? `AK-47 chargé · ${ammo} balle${ammo > 1 ? 's' : ''} restante${ammo > 1 ? 's' : ''} · appuie ou maintiens Z pour tirer` : `Ramasse un bonus rouge rare pour obtenir ${CITY_RUSH_PISTOL_AMMO_PER_PICKUP} balles`}
                      aria-label={ready ? `Tirer à l’AK-47, ${ammo} balle${ammo > 1 ? 's' : ''} restante${ammo > 1 ? 's' : ''} ; maintiens Z pour vider le chargeur` : `AK-47 : 0/${CITY_RUSH_PISTOL_AMMO_PER_PICKUP}, ramasse un bonus rouge rare`}
                    >
                      <span className="city-rush-machine-gun-label">AK-47</span>
                      <span className="city-rush-machine-gun-icon"><PowerIcon type={type} /></span>
                      <span className="city-rush-machine-gun-status">{ready ? `CHARGÉ ${ammo}/${CITY_RUSH_PISTOL_AMMO_PER_PICKUP}` : `0 / ${CITY_RUSH_PISTOL_AMMO_PER_PICKUP}`}</span>
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
                      <p>{city.tagline} Circuit de {CITY_RUSH_LAP_LENGTH} m en boucle{city.route ? (city.id === 'route-66' ? ` — traversée condensée de la ${city.route.name}, de ${city.route.endpoints[0]} à ${city.route.endpoints[1]} (${city.route.lengthKm.toLocaleString('fr-FR')} km historiques)` : city.raceway ? ` — chaque boucle rejoue un trente-cinquième du tour réel de ${city.route.lengthKm.toLocaleString('fr-FR')} km, du pont d'Antoniusbuche (km 0) à la Start-Ziel-Anlage, ${city.route.corners} virages et ${NORDSCHLEIFE_RELIEF_M} m de dénivelé` : ` — chaque boucle rejoue un tiers des ${city.route.lengthKm.toLocaleString('fr-FR')} km de la ${city.route.name} (${city.route.direction})`) : ''}, {sprintMode ? `${CITY_RUSH_SPRINT_CHECKPOINTS} checkpoints, ${formatSprintSeconds(sprintCheckpointBonus)} s par checkpoint = ${currentDistance} m` : `${currentLaps} tour${currentLaps > 1 ? 's' : ''} dont un dernier tour double = ${currentDistance} m`}. Mode {mode.name} : {mode.desc.toLowerCase()}</p>
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
                                <i>{option.route.marker}</i> {option.route.lengthKm.toLocaleString('fr-FR')} km · {option.route.direction} · {option.route.speedLabel ? `${option.route.speedLabel} ` : ''}{option.route.speedLimit} {option.route.speedUnit || 'km/h'}
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
                        <span id="city-rush-car-title">GARAGE · {CITY_RUSH_CARS.length} MODÈLES</span>
                        <small>{CITY_RUSH_FREE_CAR_COUNT} VOITURES OFFERTES · {formatCash(careerProgress.cash)} BILLETS VERTS · {selectedCar.name} · TOUCHE POUR PARTIR</small>
                      </div>
                      <div className="city-rush-car-grid" role="group" aria-label="Lancer une course avec une voiture">
                        {CITY_RUSH_CARS.map((car, index) => {
                          const owned = isCityRushCarOwned(careerProgress, car.id);
                          // Une voiture offerte n'est jamais à acheter : ni prix, ni
                          // cadenas, ni bouton désactivé, quel que soit le portefeuille.
                          const offered = owned && isCityRushCarFree(car.id);
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
                                ? `Lancer le mode ${mode.name} à ${city.name} avec ${car.name}${offered ? ', offerte à tous' : ''}`
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
                                <span className={`city-rush-car-lock-badge${owned ? ' is-owned' : ''}${offered ? ' is-offered' : ''}`}>
                                  {carGarageBadge(car, owned)}
                                </span>
                                <span className="city-rush-car-match-tag" aria-hidden="true">MINIATURE · 3D</span>
                              </span>
                              <b className="city-rush-car-name">{car.name}</b>
                              <small className="city-rush-car-class">{car.className}</small>
                              <span className="city-rush-car-stats">
                                {CAR_STATS.map((stat) => (
                                  <span
                                    className="city-rush-car-stat"
                                    key={stat.key}
                                    title={stat.cells
                                      ? `${car.name} : ${cityRushCarMaxHealth(car)} carrés de coque`
                                      : undefined}
                                  >
                                    <small>{stat.label}</small>
                                    <i className="city-rush-car-stat-track" aria-hidden="true"><i style={{ width: `${car[stat.key]}%` }} /></i>
                                    <b>{stat.cells ? cityRushCarMaxHealth(car) : car[stat.key]}</b>
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
                    ? `Les ${formatSprintSeconds(sprintCheckpointBonus)} secondes se sont écoulées avant le checkpoint ${(result.checkpoints || 0) + 1} sur ${CITY_RUSH_SPRINT_CHECKPOINTS}. La revanche t’attend.`
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
                    <>
                      {isRaceWon && (
                        <button type="button" className="city-rush-start-button is-gold city-rush-next-race-button" onClick={startNextRace}>
                          COURSE SUIVANTE <span>↗</span>
                        </button>
                      )}
                      <button type="button" className="city-rush-start-button" onClick={() => startRace()}>REJOUER <span>↻</span></button>
                    </>
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

          {/* Le Sprint possède ses checkpoints et ses pads turbo, mais aucune
              arme : la carte solo remplace le guide d'équipement classique. */}
          {sprintMode ? (
          <section className="city-rush-side-card city-rush-item-guide is-sprint">
            <div className="city-rush-side-heading"><span>SOLO · CHRONO</span><i>{CITY_RUSH_SPRINT_CHECKPOINTS} PORTES</i></div>
            <h3>Tenir<br /><em>{formatSprintSeconds(sprintCheckpointBonus)} secondes.</em></h3>
            <div className="city-rush-guide-list">
              <div className="city-rush-guide-item is-sprint">
                <span className="city-rush-guide-glyph" aria-hidden="true">⛩</span>
                <div><b>CHECKPOINT · {CITY_RUSH_SPRINT_CHECKPOINT_SPACING} M</b><small>{CITY_RUSH_SPRINT_CHECKPOINTS} portes visibles espacées de {CITY_RUSH_SPRINT_CHECKPOINT_SPACING} m : chacune recharge le chrono à {formatSprintSeconds(sprintCheckpointBonus)} secondes. Le bonus suit la voiture choisie — plus elle va vite, moins la marge est large.</small></div>
                <kbd>{formatSprintSeconds(sprintCheckpointBonus)} s</kbd>
              </div>
              <div className="city-rush-guide-item is-boost">
                <span><PowerIcon type={CITY_RUSH_PICKUPS.BOOST} /></span>
                <div><b>TURBO AU SOL · AUTOMATIQUE</b><small>Traverse un pad vert lumineux pour accélérer pendant {CITY_RUSH_TRACK_BOOST_DURATION} secondes. C'est le seul bonus du Sprint.</small></div>
                <kbd>{CITY_RUSH_TRACK_BOOST_DURATION} s</kbd>
              </div>
              <div className="city-rush-guide-item is-ramp">
                <span className="city-rush-guide-glyph" aria-hidden="true">▲</span>
                <div><b>TREMPLINS & SAUTS</b><small>Prends les rampes pour sauter par-dessus le trafic civil selon ta vitesse d’élan.</small></div>
                <kbd>SAUT</kbd>
              </div>
              <div className="city-rush-guide-item is-solo">
                <span className="city-rush-guide-glyph" aria-hidden="true">◎</span>
                <div><b>SOLO · AUCUNE ARME</b><small>Pas de rival, de police ou de bonus d'arme : repère les portes et garde le turbo pour tenir le chrono.</small></div>
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
                    <div><b>{rule.name} · {CITY_RUSH_PISTOL_AMMO_PER_PICKUP} BALLES PAR BONUS</b><small>{rule.description}</small></div>
                    <kbd>{rule.automatic ? 'AUTO' : rule.key}</kbd>
                  </div>
                );
              })}
              <div className="city-rush-guide-item is-boost">
                <span><PowerIcon type={CITY_RUSH_PICKUPS.BOOST} /></span>
                <div><b>TURBO AU SOL · AUTOMATIQUE</b><small>Traverse un pad lumineux pour accélérer pendant {CITY_RUSH_TRACK_BOOST_DURATION} secondes. Les bonus rouges sont rares : chacun recharge {CITY_RUSH_PISTOL_AMMO_PER_PICKUP} balles d’AK-47.</small></div>
                <kbd>{CITY_RUSH_TRACK_BOOST_DURATION} s</kbd>
              </div>
              <div className="city-rush-guide-item is-ramp">
                <span className="city-rush-guide-glyph" aria-hidden="true">▲</span>
                <div><b>TREMPLINS & SAUTS</b><small>Prends les rampes pour bondir sur plusieurs dizaines de mètres selon ta vitesse et survoler le trafic et les barrages sans collision. En l’air, la voiture garde sa voie : le volant ne répond qu’à l’atterrissage.</small></div>
                <kbd>SAUT</kbd>
              </div>
            </div>
          </section>
          )}

          <section className="city-rush-no-collision-note">
            <span className="city-rush-no-collision-icon">◎</span>
            <div><b>MODE {activeModeName} · {activeModeLabel}</b><p>{storyMode ? `${currentStoryRace?.race?.name || city.name} : ${currentStoryRace?.text || ''}` : mode.desc} Distance totale : {currentDistance} m. Le trafic bloque, et chaque choc contre une voiture — civile, en face ou berline de police — retire un carré de vie, ou deux contre un SUV de police. Un répit après chaque choc empêche les dégâts répétés tant que les voitures restent collées. Conduite libre : changer de voie ne ralentit plus du tout — double et évite le trafic à pleine allure. Tenir sa voie sans zigzaguer fait accélérer (jusqu’à +{Math.round((CITY_RUSH_CLEAN_LINE_MAX_BONUS - 1) * 100)} % de vitesse), et c’est le seul prix d’un écart : le bonus retombe à zéro. Rouler à contresens, dans les trois voies en sens inverse, charge un second bonus cumulatif — jusqu’à +{Math.round((CITY_RUSH_ONCOMING_BONUS_MAX - 1) * 100)} % de vitesse — mais un choc frontal l’annule net et te recale derrière la voiture en face. Un tremplin se prend dans la voie où tu arrives : en l’air, la voiture garde sa voie jusqu’à l’atterrissage.{city.driveSide === 'left' ? ' Ici on roule à gauche, comme dans le pays : ta course tient la moitié gauche de la chaussée et le trafic venant en face arrive par la droite.' : ''}</p></div>
          </section>

          {/* En Sprint, la carte de l'escouade disparaît : titre, sirène et
              couleur rouge compris. Elle est remplacée par la carte solo. */}
          <section className={`city-rush-no-collision-note${sprintMode ? ' is-solo' : ' is-police'}`}>
            <span className="city-rush-no-collision-icon" aria-hidden="true">{sprintMode ? '⚡' : '🚨'}</span>
            <div>
              <b>{sprintMode ? 'SPRINT SOLO · AUCUNE POURSUITE' : 'ESCOUADE DE POLICE'}</b>
              <p>
                {sprintMode ? (
                  <>Rien à fuir dans ce mode : ni escouade, ni berline de police, ni hélicoptère d’observation, ni adversaire en piste. Seulement toi, le chrono, les {CITY_RUSH_SPRINT_CHECKPOINTS} portes visibles tous les {CITY_RUSH_SPRINT_CHECKPOINT_SPACING} m et les pads turbo verts posés sur la chaussée — {CITY_RUSH_SPRINT_DISTANCE} m en tout. Le trafic civil bloque toujours la voie, et chaque choc te coûte un carré de vie.</>
                ) : (
                  <>
                    {!storyMode && mode.policeFromStart
                      ? 'En Poursuite, trois voitures de police te prennent pour cible dès le départ.'
                      : 'En Circuit, trois voitures de police entrent au dernier tour et te prennent pour cible, même si tu n’es pas en tête.'}
                    {' '}Chaque rival qui touche une voiture de police avec un tir reçoit son propre poursuivant, qui le chasse lui seul. Les voitures de police du trafic sont aussi vulnérables aux tirs rouges. Le joueur et ses adversaires ont chacun 15 cellules : cinq bleues, cinq vertes, puis cinq jaunes ; les trois dernières passent au rouge. Un tir rouge en enlève une sans dérapage ni ralentissement. Une berline armée se range dans ton dos et te vise : son halo rouge te prévient, et il te suffit de te décaler pour casser sa mire — la rafale ne part qu’après son temps d’alignement ({CITY_RUSH_POLICE_AIM_TIME.toFixed(2).replace('.', ',')} s). Une berline de police a six points de vie, affichés en six carrés au-dessus de son toit : un tir rouge lui retire un seul carré — le même prix qu’contre un adversaire — et un carambolage à pleine allure tout autant, en te coûtant à toi aussi un carré. Un SUV de police blindé dispose de dix carrés : cinq tirs bleus ou dix balles rouges le détruisent, et le percuter te coûte deux carrés au lieu d’un. Les renforts de l’escouade reviennent après destruction. L’attaque d’hélicoptère est supprimée ; l’hélicoptère d’observation suit le joueur au dernier tour sans tirer.

                  </>
                )}
              </p>
            </div>
          </section>
        </aside>
      </main>

      <footer className="city-rush-page-footer wrap"><Link to="/jeu">← RETOUR À L’ARCADE</Link><span>LET’S PLAY ARCADE · VICE CITY RUSH · {activeModeName} · {city.name}</span></footer>
    </div>
  );
}
