import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ViceCityWorld from './ViceCityWorld';
import CityRushDriverAvatar from './CityRushDriverAvatar';
import CityRushComic from './CityRushComic';
import CityRushRaceList from './CityRushRaceList';
import CityRushHealthBar from './CityRushHealthBar';
import CityRushSpeedometer from './CityRushSpeedometer';
import CityRushTutorial from './CityRushTutorial';
import { CITY_RUSH_TUTORIAL_DURATION_SECONDS, CITY_RUSH_TUTORIAL_STEPS } from './cityRushTutorial';
import FullscreenIcon from './FullscreenIcon';
import { CityRushAudio } from './cityRushAudio';
import { isFullscreenShortcut, nativeFullscreenElement, opensFullscreenOnLaunch } from './gameFullscreen';
import useGameFullscreen from './useGameFullscreen';
import { useAuth } from '../auth/AuthContext';
import {
  CITY_RUSH_CASH_BY_PLACE,
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
  withUpgradedCityRushStory,
} from './cityRushProgress';
import { fetchViceCityProgress, saveViceCityProgress, viceCityApiEnabled } from './viceCityApi';
import {
  CITY_RUSH_CARS,
  CITY_RUSH_COURSES,
  CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP,
  CITY_RUSH_BAZOOKA_BLAST_CELLS,
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
  CITY_RUSH_MINI_GARAGE_COUNT,
  CITY_RUSH_MINI_GARAGE_REPAIR_AMOUNT,
  CITY_RUSH_HEALTH_PICKUP_RESTORE,
  NORDSCHLEIFE_RELIEF_M,
  CITY_RUSH_PLAYER_HEALTH_CRITICAL,
  cityRushCarMaxHealth,
  CITY_RUSH_WANTED_MAX_STARS,
  CITY_RUSH_PISTOL_AMMO_PER_PICKUP,
  CITY_RUSH_POLICE_AIM_TIME,
  CITY_RUSH_POLICE_RAMP_LANDING_DAMAGE,
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
import {
  CITY_RUSH_STORY_CAST,
  CITY_RUSH_STORY_CHAPTER_COUNT,
  CITY_RUSH_STORY_CHAPTERS,
  CITY_RUSH_STORY_ENDINGS,
  checkStoryObjective,
  getStoryChapter,
  storyArtFor,
  storyEndingUnlocked,
  storyRingTargetTime,
  storySprintParTime,
  storyStarsForChapter,
  storyTotalStars,
} from './cityRushStory';
import './vice-city-rush-hud.css';
import './city-rush-story.css';
import './vice-city-rush-comic.css';

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
  'night-comet': 'car-wolfsburg-gtr.jpg?v=2',
  'vega-gt-67': 'car-bavaria-mcs.jpg',
  'toro-v12': 'car-tempesta-lp780.jpg',
  'volt-aero': 'car-volt-aero.jpg',
  'atlas-xr': 'car-atlas-xr.jpg',
  'pulse-rs': 'car-pulse-rs.jpg',
};

// Le scénario du mode Histoire (10 chapitres, casting, BD, fins) vit dans
// `cityRushStory.js` : la page ne garde que le déroulement (cinématiques,
// courses, étoiles, fins).
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
    desc: `${CITY_RUSH_LAPS} tours dont un dernier tour double, avec trafic et bonus. Au dernier tour, trois voitures de police te prennent pour cible ; tout rival qui touche une voiture de police — tir ou carambolage — reçoit son propre poursuivant, et le premier du classement au dernier tour est chassé lui aussi. Les voitures de police du trafic sont vulnérables aux tirs rouges.`,
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
    desc: `En solo contre la montre, sans adversaire ni police. Franchis ${CITY_RUSH_SPRINT_CHECKPOINTS} portes visibles espacées de 300 m : chaque checkpoint recharge le chrono à 15 s. Ramasse les bonus turbo verts flottants pour accélérer ; aucune arme. Chrono à zéro, course perdue. Mode défi : aucun billet vert.`,
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
    desc: `${CITY_RUSH_LAPS} tours, avec trois voitures de police sur tes traces dès le départ. Chaque rival qui touche une voiture de police — d'un tir ou d'un carambolage — reçoit un poursuivant dédié, et celui qui mène la course au dernier tour est chassé à son tour. Les voitures de police du trafic peuvent aussi être détruites par les tirs rouges. Le joueur et ses adversaires ont chacun 15 carrés de vie ; le tir rouge en enlève un sans dérapage ni ralentissement — et une berline de police, qui en affiche six sur son toit, n’en perd jamais qu’un seul par balle. Une berline armée se range dans ton dos : change de voie ou décale-toi avant que sa mire ne se ferme. Mode défi : aucun billet vert.`,
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
  bazookaAmmo: 0,
  bazookaPickupTaken: false,
  bazookaPickupsTaken: 0,
  bazookaPickupsTotal: 0,
  bazookaEnabled: false,
  bazookaNextDistance: null,
  bazookaWarehouseGap: null,
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
  miniGaragesActive: false,
  miniGaragesRemaining: CITY_RUSH_MINI_GARAGE_COUNT,
  miniGaragesTotal: CITY_RUSH_MINI_GARAGE_COUNT,
  miniGarageNextDistance: null,
  oncomingPoliceTurnarounds: [],
  // La herse des quatre étoiles (`null` tant qu'aucun barrage n'est monté) et
  // les SUV de charge du contresens (voir `ViceCityWorld`).
  spikeBlock: null,
  suvCharges: [],
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
// Le bonus de checkpoint du Sprint tombe sur une demi-seconde : on l'écrit en
// français (« 12 » ou « 17,5 »), sans décimale inutile.
function formatSprintSeconds(seconds = 0) {
  const value = Math.max(0, Number(seconds) || 0);
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
}
function ordinal(place) {
  return place === 1 ? '1er' : `${place}e`;
}
function cashRewardReason(result) {
  if (result?.storyChapterId && result?.sprint) return 'RÉCOMPENSE · DOSSIER LIVRÉ';
  if (result?.storyChapterId) return 'RÉCOMPENSE · OBJECTIF REMPLI';
  if (result?.sprint) return 'MODE DÉFI · SANS BILLETS';
  if (result?.destroyed) return 'RÉCOMPENSE · ÉPAVE DERNIÈRE';
  return `RÉCOMPENSE · ${ordinal(result?.rank).toUpperCase()} PLACE`;
}
function PowerIcon({ type, className = '' }) {
  if (type === 'bazooka') {
    return (
      <svg className={className} viewBox="0 0 32 32" aria-hidden="true" fill="currentColor">
        <path d="M3 12.2h17.2l5.3-3.6v14.8l-5.3-3.6H3z" />
        <path d="M20 11.7 27.8 7v18L20 20.3z" />
        <path d="M6 12.2 2.4 9.7v12.6L6 19.8z" />
        <rect x="10" y="19.4" width="2.4" height="6.4" rx="0.6" />
        <rect x="16" y="19.4" width="2.4" height="4.6" rx="0.6" />
        <path d="m29 13 2.8 3-2.8 3z" />
      </svg>
    );
  }
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
      {/* Le turbo est un bonus vert flottant : un éclair, plus la dalle au sol
          d'autrefois. */}
      {type === CITY_RUSH_PICKUPS.BOOST && (
        <path d="M20 3 8 18h6.5L12 29l12-16h-6.5L20 3Z" />
      )}
      {type === CITY_RUSH_PICKUPS.HEALTH && <>
        <rect x="4" y="4" width="24" height="24" rx="5" />
        <path d="M16 9v14M9 16h14" />
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
  const [storyStars, setStoryStars] = useState(() => initialSave.storyStars || {});
  const [briefingDone, setBriefingDone] = useState(false);
  const [storyAlert, setStoryAlert] = useState(null);
  const [playerDriverId, setPlayerDriverId] = useState(CITY_RUSH_DRIVERS[0].id);
  const [modeId, setModeId] = useState(RACE_MODES[0].id);
  const [introStep, setIntroStep] = useState('mode'); // mode -> city -> garage
  const [phase, setPhase] = useState('intro');
  const [countdown, setCountdown] = useState(3);
  const [runId, setRunId] = useState(0);
  const [hud, setHud] = useState(EMPTY_HUD);
  // Identifiant d'impact : la clé relance la vignette rouge pour chaque roquette.
  const [bazookaImpactPulse, setBazookaImpactPulse] = useState(0);
  const [result, setResult] = useState(null);
  const [bests, setBests] = useState(readBests);
  const [careerProgress, setCareerProgress] = useState(() => careerFromSave(initialSave));
  // Identifiant du propriétaire de la progression actuellement chargée : null
  // tant que l'instantané du compte (ou du visiteur) n'a pas été appliqué.
  const [loadedProgressUserId, setLoadedProgressUserId] = useState(null);
  const [toast, setToast] = useState(null);
  const [worldError, setWorldError] = useState('');
  const [tutorialOpen, setTutorialOpen] = useState(false);
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
    const next = normalizeCityRushSave(withUpgradedCityRushStory(rawSave));
    const career = careerFromSave(next);
    const save = { ...next, ...career };
    saveRef.current = save;
    careerProgressRef.current = career;
    setCareerProgress(career);
    setStoryChapter(save.storyChapter);
    setStoryRaceChapter(save.storyChapter);
    setStoryEnding(save.storyEnding);
    setStoryStars(save.storyStars || {});
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
  const currentStoryRace = storyMode ? getStoryChapter(storyRaceChapter) : null;
  const currentLaps = storyMode ? (currentStoryRace?.laps ?? CITY_RUSH_LAPS) : mode.laps;
  // Le dernier tour enchaîne deux boucles : 6 tours = 5 × 1 200 m + 2 400 m.
  const sprintMode = storyMode ? currentStoryRace?.format === 'sprint' : mode.format === 'sprint';
  const currentDistance = sprintMode ? CITY_RUSH_SPRINT_DISTANCE : cityRushRaceDistance(currentLaps);
  const RACE_KM = `${(currentDistance / 1000).toFixed(1).replace('.', ',')} KM`;
  const activeModeName = storyMode ? 'HISTOIRE' : mode.name;
  const activeModeLabel = storyMode ? `CHAPITRE ${String(storyRaceChapter + 1).padStart(2, '0')} / ${CITY_RUSH_STORY_CHAPTER_COUNT}` : mode.label;
  const cashRewardsEnabled = storyMode || mode.cashRewards !== false;
  const daylight = useMemo(() => Boolean(cityRushTheme(city.id).daylight), [city.id]);
  // Voiture du garage vraiment disponible : le choix du pilote, ou — s'il ne
  // fait plus partie de son garage (instantané d'un autre compte appliqué en
  // cours de route) — la première voiture possédée. L'Histoire, elle, ne
  // connaît aucun verrou : elle part toujours d'une voiture roulante.
  const garageCarId = useMemo(
    () => (isCityRushCarOwned(careerProgress, carId)
      ? carId
      : (careerProgress.ownedCarIds[0] || CITY_RUSH_STARTER_CAR_ID)),
    [careerProgress, carId],
  );
  // Voiture engagée dans la course qui s'affiche. Le scénario prête parfois la
  // sienne (`fixedCarId` : la MISTRAL du prologue de 1983, la TEMPESTA de Voss
  // sur le Ring) : le prêt vaut pour **ce chapitre seulement** et n'écrase
  // jamais le choix du garage (`carId`). Autrement la voiture prêtée collait au
  // pilote jusqu'à la fin de la campagne — la MISTRAL du prologue remplaçait la
  // voiture achetée pour les neuf chapitres suivants, et la TEMPESTA du Ring
  // retombait sur la citadine de départ une fois rendue.
  const activeCarId = storyMode
    ? (currentStoryRace?.fixedCarId || garageCarId)
    : carId;
  const selectedCar = useMemo(() => CITY_RUSH_CARS.find((item) => item.id === activeCarId) || CITY_RUSH_CARS[0], [activeCarId]);
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
    if (!storyMode) return racers;
    // Le boss (Dante) prend l’identité du casting BD : même nom, même tête
    // que dans les cases — le rival croisé en piste est celui de l’histoire.
    const bossId = currentStoryRace?.boss?.racerId || null;
    const bossCast = CITY_RUSH_STORY_CAST.dante;
    return racers.map((racer) => {
      if (racer.isPlayer) return { ...racer, name: 'NICO', displayName: 'Nico Vega', country: 'Vice City', countryCode: 'US', flag: '🇺🇸' };
      if (bossId && racer.id === bossId) {
        return { ...racer, name: 'DANTE', displayName: 'Dante Cross', driverId: 'dante', country: 'Vice City', countryCode: 'US', flag: '😈', avatar: bossCast?.avatar || racer.avatar };
      }
      return racer;
    });
  }, [cityId, selectedCar.id, runId, playerDriverId, storyMode, storyRaceChapter, currentStoryRace]);
  // Règles spéciales du chapitre : transmises au monde (armes, police, coque,
  // boss, panne scriptée). Mémorisé : le monde se recrée quand l’objet change.
  const storyRules = useMemo(() => {
    if (!storyMode || !currentStoryRace) return null;
    const rules = currentStoryRace.rules || {};
    return {
      weaponsEnabled: rules.weaponsEnabled !== false,
      policeEnabled: rules.policeEnabled !== false,
      bazookaEnabled: rules.bazookaEnabled !== false,
      playerHealthOverride: rules.playerHealthOverride ?? null,
      rivalCarIds: rules.rivalCarIds || null,
      rivalPace: rules.rivalPace || null,
      breakdown: rules.breakdown || null,
    };
  }, [storyMode, currentStoryRace]);
  const storyWeaponsOn = !storyMode || storyRules?.weaponsEnabled !== false;
  const storyPoliceOn = !storyMode || storyRules?.policeEnabled !== false;
  // Le bazooka est sur toutes les cartes (hors Sprint et chapitres sans arme) :
  // deux conteneurs par course, à 30 % puis 65 % du parcours.
  const bazookaMode = !sprintMode && storyWeaponsOn && storyPoliceOn && storyRules?.bazookaEnabled !== false;
  // Chronos de référence des chapitres contre-la-montre : cible fixe de la
  // TEMPESTA prêtée sur le Ring, par calculé sur la voiture engagée en Sprint.
  const storyTargetTime = useMemo(
    () => (storyMode && currentStoryRace?.id === 'ring' ? storyRingTargetTime() : null),
    [storyMode, currentStoryRace],
  );
  const storySprintPar = useMemo(() => {
    if (!storyMode || !sprintMode) return null;
    return storySprintParTime(cityRushPacedSpeed(CITY_RUSH_PLAYER_SPEED * selectedCar.powerMultiplier, city));
  }, [storyMode, sprintMode, selectedCar, city]);
  const storyCtx = useMemo(() => ({ targetTime: storyTargetTime, sprintPar: storySprintPar }), [storyTargetTime, storySprintPar]);
  const storyTotal = storyTotalStars(storyStars);
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
  // Distance de la porte de service : le compteur affiche « dans X m » dès que
  // l'unique garage de la course approche, et se tait le reste du temps.
  const miniGarageNextDistance = Number.isFinite(Number(hud.miniGarageNextDistance))
    ? Math.max(0, Math.round(Number(hud.miniGarageNextDistance)))
    : null;
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
  const bestTime = bests[cityId] || null;
  const isRaceWon = Boolean(!storyMode && result && result.rank === 1 && !result.destroyed && !result.timedOut);
  const finalStoryVictory = Boolean(storyMode && result?.objectiveMet && storyChapter >= CITY_RUSH_STORY_CHAPTER_COUNT);
  const nextStoryIndex = storyChapter >= CITY_RUSH_STORY_CHAPTER_COUNT ? 0 : storyChapter;
  const previewStoryChapter = getStoryChapter(nextStoryIndex);
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
  }, []);

  // Retour des menus : le garage, une course verrouillée ou la fin d'un
  // chapitre répondent encore par une fenêtre de message. En course, non : le
  // pilote roule, et rien ne vient se poser sur la route (voir `effectMessage`).
  function showToast(message, tone = 'neutral') {
    if (phaseRef.current === 'playing') return;
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
  function startRace({ carId: requestedCarId = null, cityId: requestedCityId = null } = {}) {
    // Compte en cours de chargement : la course partirait sur la progression
    // précédente (celle de l'appareil ou d'un autre compte).
    if (connected && !progressionReady) return;
    const savedProgress = careerProgressRef.current;
    const targetCityId = requestedCityId || (storyMode ? (currentStoryRace?.city || cityId) : cityId);
    // Voiture contrôlée au départ : celle demandée par le garage, sinon celle
    // qui est engagée (prêt du scénario compris — voir `activeCarId`).
    const selectedCarId = requestedCarId || activeCarId;
    if (!storyMode && !isCityRushCourseUnlocked(savedProgress, targetCityId)) {
      setStoryMode(false);
      setIntroStep('city');
      setPhase('intro');
      showToast('COURSE VERROUILLÉE · TERMINE D’ABORD LE PARCOURS PRÉCÉDENT.', 'locked');
      return;
    }
    // L’histoire est indépendante de la carrière : parcours toujours ouverts,
    // voiture parfois prêtée (prologue, Ring) — aucun verrou à contrôler.
    if (!storyMode && !isCityRushCarOwned(savedProgress, selectedCarId)) {
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
    setStoryAlert(null);
    setHud(EMPTY_HUD);
    // Le message du garage ne suit pas la voiture en piste : le départ efface
    // le dernier mot des menus, sinon il réapparaîtrait à l'arrivée.
    setToast(null);
    window.clearTimeout(toastTimerRef.current);
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

  function beginStory(chapterIndex = null) {
    if (connected && !progressionReady) return;
    // L’histoire est indépendante de la carrière : aucun parcours à débloquer
    // — seuls les chapitres déjà atteints sont rejouables (pastilles de l’intro).
    if (storyChapter >= CITY_RUSH_STORY_CHAPTER_COUNT && chapterIndex === null) {
      setStoryChapter(0);
      setStoryRaceChapter(0);
      setStoryEnding('');
      persistSave({ storyChapter: 0, storyEnding: '' });
    }
    const progress = storyChapter >= CITY_RUSH_STORY_CHAPTER_COUNT && chapterIndex === null ? 0 : storyChapter;
    const maxIndex = Math.min(progress, CITY_RUSH_STORY_CHAPTER_COUNT - 1);
    const requested = chapterIndex === null ? maxIndex : Math.max(0, Math.min(maxIndex, chapterIndex));
    const chapter = getStoryChapter(requested);
    // La voiture du chapitre ne se décide pas ici : `activeCarId` prend celle
    // que le scénario prête (`fixedCarId`) ou, sinon, celle du garage — sans
    // jamais écraser le choix du pilote, qui doit survivre au prêt.
    setStoryMode(true);
    setStoryRaceChapter(requested);
    setCityId(chapter.city);
    setResult(null);
    setBriefingDone(false);
    setStoryAlert(null);
    setPhase('cinematic');
  }

  function returnToModePicker() {
    setResult(null);
    setStoryMode(false);
    setPhase('intro');
    setIntroStep('mode');
  }

  function chooseStoryEnding(ending) {
    const picked = CITY_RUSH_STORY_ENDINGS[ending];
    if (!picked || !storyEndingUnlocked(ending, storyTotal)) return;
    const bonus = Math.max(0, Math.floor(Number(picked.cashBonus) || 0));
    setStoryEnding(ending);
    const saved = persistSave({ storyEnding: ending });
    if (bonus > 0) {
      saveCareerProgress(normalizeCityRushProgress({ ...saved, cash: saved.cash + bonus }));
      setResult((previous) => (previous ? { ...previous, cashAwarded: (previous.cashAwarded || 0) + bonus, cashBalance: saved.cash + bonus } : previous));
      showToast(`FIN « ${picked.title.toUpperCase()} » · +${formatCash(bonus)} BILLETS VERTS.`, 'boost');
    }
  }

  function restartStory() {
    setStoryMode(false);
    setStoryChapter(0);
    setStoryRaceChapter(0);
    setStoryEnding('');
    setStoryStars({});
    setResult(null);
    persistSave({ storyChapter: 0, storyEnding: '', storyStars: {} });
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
    // Mode Histoire : l’objectif du chapitre (victoire, survie, chrono, panne
    // scriptée) décide seul — ni le podium brut, ni la carrière (l’histoire
    // ne valide aucun parcours du mode libre).
    const storyObjectiveMet = storyMode ? checkStoryObjective(currentStoryRace, nextResult, storyCtx) : false;
    const storyStarResult = storyMode
      ? storyStarsForChapter(currentStoryRace, nextResult, storyCtx)
      : { stars: 0, met: false, two: false, three: false };
    let cashAwarded = 0;
    let cashBalance = progressBeforeRace.cash;
    let newlyUnlockedCourse = null;
    if (storyMode) {
      if (storyObjectiveMet) {
        const cashRule = currentStoryRace?.cash || { type: 'rank' };
        const rankIndex = Math.max(0, Math.min(CITY_RUSH_CASH_BY_PLACE.length - 1, (Number(nextResult.rank) || 3) - 1));
        const baseCash = cashRule.type === 'flat'
          ? Math.max(0, Math.floor(Number(cashRule.amount) || 0))
          : (Number(nextResult.rank) >= 1 ? CITY_RUSH_CASH_BY_PLACE[rankIndex] : 0);
        const chapterId = currentStoryRace?.id;
        const previousStars = Math.max(0, Math.min(3, Math.floor(Number(storyStars[chapterId]) || 0)));
        // Chaque étoile toute neuve rapporte 10 billets — rejouer un chapitre
        // pour le perfectionner paie, le refaire à l’identique non.
        const starBonus = Math.max(0, storyStarResult.stars - previousStars) * 10;
        cashAwarded = baseCash + starBonus;
        const nextStars = storyStarResult.stars > previousStars ? { ...storyStars, [chapterId]: storyStarResult.stars } : storyStars;
        const nextChapter = Math.min(CITY_RUSH_STORY_CHAPTER_COUNT, Math.max(storyChapter, storyRaceChapter + 1));
        if (cashAwarded > 0) {
          const saved = persistSave({ cash: progressBeforeRace.cash + cashAwarded, storyChapter: nextChapter, storyStars: nextStars });
          cashBalance = saved.cash;
          const career = careerFromSave(saved);
          careerProgressRef.current = career;
          setCareerProgress(career);
        } else {
          persistSave({ storyChapter: nextChapter, storyStars: nextStars });
        }
        setStoryStars(nextStars);
        setStoryChapter(nextChapter);
      }
    } else {
      // Le gain dépend du mode : le Circuit paie au podium (1er → 50 billets,
      // 2e → 30, 3e → 10). Sprint et Poursuite valident le parcours, mais ne
      // rapportent pas de billets verts.
      const award = awardCityRushRace(progressBeforeRace, {
        courseId,
        completed: !nextResult.destroyed && !nextResult.timedOut,
        rank: nextResult.rank,
        modeId,
        sprint: Boolean(nextResult.sprint),
        destroyed: Boolean(nextResult.destroyed),
        timedOut: Boolean(nextResult.timedOut),
      });
      saveCareerProgress(award.progress);
      cashAwarded = award.cashAwarded;
      cashBalance = award.progress.cash;
      const courseIndex = CITY_RUSH_COURSES.findIndex((course) => course.id === courseId);
      const followingCourse = courseIndex >= 0 ? CITY_RUSH_COURSES[courseIndex + 1] : null;
      newlyUnlockedCourse = followingCourse
        && !isCityRushCourseUnlocked(progressBeforeRace, followingCourse.id)
        && isCityRushCourseUnlocked(award.progress, followingCourse.id)
        ? followingCourse.id
        : null;
    }
    setResult({
      ...nextResult,
      cashAwarded,
      cashBalance,
      newlyUnlockedCourse,
      objectiveMet: storyMode ? storyObjectiveMet : undefined,
      storyStars: storyMode ? storyStarResult.stars : undefined,
      storyTwo: storyMode ? storyStarResult.two : undefined,
      storyThree: storyMode ? storyStarResult.three : undefined,
      storyChapterId: storyMode ? currentStoryRace?.id : undefined,
    });
    // Trophées de jeu : chaque course terminée nourrit les succès Vice City
    // Rush (ville, mode, place, butin). En mode Histoire, un objectif rempli
    // crédite aussi le chapitre joué — `storyRaceChapter` (0 = prologue).
    trackAchievement('vice_city_run', {
      city: nextResult.city,
      mode: storyMode ? VICE_CITY_STORY_MODE : modeId,
      rank: nextResult.rank,
      score: nextResult.score,
      storyChapter: storyMode && storyObjectiveMet ? storyRaceChapter : null,
    });
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

  // ── Retours du moteur 3D ────────────────────────────────────────────────
  // La course est muette : plus aucune fenêtre de message ne raconte les
  // chocs, les bonus, les herses ou les mouvements de police. Le moteur 3D
  // garde ses propres signaux — fumée, éclats, halo rouge du viseur, sirènes,
  // étoiles de recherche, carte OBJECTIF du HUD — et la page ne retient que ce
  // qui change l'affichage du scénario.
  function effectMessage(effect) {
    if (!effect) return;
    if (effect.type === 'bazooka-impact') {
      setBazookaImpactPulse((previous) => previous + 1);
      // Secousse physique du décor 3D, sans faire trembler le HUD. Le reflow
      // force une nouvelle lecture des images-clés même sur deux impacts
      // rapprochés ; le monde retrouve sa place à la fin de l'animation.
      const worldElement = shellRef.current?.querySelector('.city-rush-world');
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      if (worldElement && !reducedMotion) {
        worldElement.classList.remove('is-bazooka-shaking');
        void worldElement.offsetWidth;
        worldElement.classList.add('is-bazooka-shaking');
        worldElement.addEventListener('animationend', (event) => {
          if (event.animationName === 'crBazookaScreenShake') {
            worldElement.classList.remove('is-bazooka-shaking');
          }
        }, { once: true });
      }
    } else if (effect.type === 'story-warning') setStoryAlert('warn');
    else if (effect.type === 'story-breakdown') setStoryAlert('breakdown');
  }

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
      <h1 className="sr-only">Vice City Rush — Course arcade 3D</h1>

      <main className="city-rush-layout wrap">
        <section id="vice-city-rush-console" className={`city-rush-shell${phase === 'playing' ? ' is-running' : ''}${immersive ? ' is-immersive' : ''}`} ref={shellRef} aria-label="Partie de Vice City Rush">
          <div className="city-rush-topbar">
            <div className="city-rush-location">
              <span className="city-rush-location-mark" aria-hidden="true">{storyMode ? '★' : introStep === 'mode' ? mode.icon : '⌖'}</span>
              <span>
                <b>VICE CITY <em>RUSH</em></b>
                <small>
                  {storyMode
                    ? <>{currentStoryRace?.race?.name || city.district} <i>·</i> {currentStoryRace?.race?.type || city.label} · {sprintMode ? `${CITY_RUSH_SPRINT_CHECKPOINTS} CHECKPOINTS` : `${currentLaps} TOURS`}</>
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
            <ViceCityWorld cityId={cityId} carId={selectedCar.id} active={phase === 'playing'} phase={phase} countdown={countdown} runId={runId} roster={roster} raceLaps={currentLaps} racePoliceFromStart={storyMode ? Boolean(currentStoryRace?.policeFromStart) : mode.policeFromStart} raceFormat={sprintMode ? 'sprint' : 'laps'} storyRules={storyRules} actionsRef={actionsRef} onReady={() => setWorldError('')} onError={(message) => setWorldError(message)} onHud={setHud} onFinish={finishRace} onEffect={effectMessage} audioRef={audioRef} />
            <div className="city-rush-vignette" aria-hidden="true" />
            {bazookaImpactPulse > 0 && (
              <div
                key={bazookaImpactPulse}
                className="city-rush-bazooka-blast-vignette"
                onAnimationEnd={() => setBazookaImpactPulse((current) => (
                  current === bazookaImpactPulse ? 0 : current
                ))}
                aria-hidden="true"
              />
            )}

            {/* Fenêtre de message des menus (garage, course verrouillée, fin
                d’histoire). Elle vit hors du HUD de course : la route reste nue
                tant que la voiture roule. */}
            {phase !== 'playing' && toast && (
              <div className={`city-rush-toast is-${toast.tone}`} key={toast.nonce} role="status">{toast.message}</div>
            )}

            {phase === 'playing' && (
              /* HUD de course en zones : chaque élément vit dans sa propre case de
                 grille (coins, bandeau central, pied), si bien qu'aucun bloc ne
                 peut en recouvrir un autre, quelle que soit la taille d'écran. */
              <div className={`city-rush-hud${sprintMode ? ' is-sprint' : ''}`}>
                <div className="city-rush-hud-zone is-top-left">
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
                </div>

                <div className="city-rush-hud-zone is-top-center" aria-live="polite">
              {storyMode && currentStoryRace && (
                <div className={`cr-story-objective${storyAlert ? ' is-alert' : ''}`} role="status">
                  <b>★ {currentStoryRace.objective.label}</b>
                  {storyAlert === 'warn' && <small>⚠ MOTEUR INSTABLE…</small>}
                  {storyAlert === 'breakdown' && <small>💥 PANNE MOTEUR !</small>}
                  {currentStoryRace.id === 'ring' && storyTargetTime !== null && !storyAlert && (
                    <small>CHRONO CIBLE {formatTime(storyTargetTime)}</small>
                  )}
                  {sprintMode && storySprintPar !== null && !storyAlert && (
                    <small>PAR {formatTime(storySprintPar)}</small>
                  )}
                </div>
              )}
              {/* Rien d’autre ici : ni fenêtre de message, ni bandeau de tour,
                  ni pastille d’état. Le tour, les checkpoints, le chrono, le
                  butin et la vie se lisent dans leurs cartes du HUD ; le reste
                  (chocs, herses, bonus, police) se voit dans la scène. */}
                </div>

                <div className="city-rush-hud-zone is-top-right">
              <div className={`city-rush-gta-cash${wantedStars > 0 ? ' is-wanted' : ''}`} aria-label={`Butin : ${hud.score || 0} points`}>
                <b>{(hud.score || 0).toLocaleString('fr-FR')} PTS</b>
                <small>{formatTime(hud.elapsed)}</small>
                {wantedStars > 0 && (
                  <span className="city-rush-gta-wanted" role="status" aria-label={`Police en chasse · niveau ${wantedStars} sur ${CITY_RUSH_WANTED_MAX_STARS}`}>
                    {Array.from({ length: CITY_RUSH_WANTED_MAX_STARS }, (_, index) => index + 1)
                      .map((star) => <i key={star} className={star <= wantedStars ? 'is-on' : ''} aria-hidden="true">★</i>)}
                  </span>
                )}
                {!sprintMode && hud.miniGaragesActive && (
                  <span
                    className="city-rush-gta-garages"
                    role="status"
                    aria-label={miniGarageNextDistance === null
                      ? 'Mini-garage disponible au centre de la chaussée'
                      : `Mini-garage dans ${miniGarageNextDistance} mètres au centre de la chaussée`}
                  >
                    <i aria-hidden="true">⌂</i>
                    <b>{miniGarageNextDistance === null
                      ? 'MINI-GARAGE DISPONIBLE'
                      : `MINI-GARAGE DANS ${miniGarageNextDistance} M`}</b>
                  </span>
                )}
              </div>

                </div>

                <div className="city-rush-hud-zone is-mid-left">
                  {!sprintMode && <CityRushRaceList racers={standings} pursuers={hud.police} laps={currentLaps} />}
                </div>

                <div className="city-rush-hud-zone is-mid-right">
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

                </div>

                <div className="city-rush-hud-zone is-bottom-left">
                  <div className="city-rush-speedometer-wrap">
                    <CityRushSpeedometer speed={hud.speed} boosting={hud.boostLeft > 0} />
                  {oncomingCharged && (
                    <span className="city-rush-speed-bonus" aria-label={`Bonus de contresens : plus ${oncomingBonusPercent} pour cent de vitesse`}>
                      +{oncomingBonusPercent} %
                    </span>
                  )}
                  </div>
                </div>

                <div className="city-rush-hud-zone is-bottom-center">
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

                </div>

                <div className="city-rush-hud-zone is-bottom-right">
                {/* Les deux armes sont côte à côte : le bazooka jaune à gauche,
                    l’AK-47 rouge à droite. Le Sprint ne montre aucun bouton d’arme. */}
                {storyWeaponsOn && !sprintMode && (
                  <div className={`city-rush-weapon-controls${bazookaMode ? ' has-bazooka' : ''}`}>
                    {bazookaMode && (() => {
                      const ammo = Math.max(0, Math.min(CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP, Number(hud.bazookaAmmo) || 0));
                      const ready = ammo > 0;
                      // Épuisé : les deux entrepôts sont ramassés et il ne reste
                      // aucune roquette ; sinon le prochain entrepôt réapprovisionne.
                      const exhausted = hud.bazookaPickupTaken && ammo === 0;
                      const stateLabel = ready ? `${ammo} TIR${ammo > 1 ? 'S' : ''} · X` : exhausted ? 'ÉPUISÉ' : 'À RAMASSER';
                      const hint = ready
                        ? `Tirer au bazooka · ${ammo} tir${ammo > 1 ? 's' : ''} restant${ammo > 1 ? 's' : ''} · touche X`
                        : exhausted
                          ? 'Bazooka épuisé : les deux entrepôts sont vides et les tirs sont utilisés'
                          : 'Bazooka verrouillé : ramasse le bonus jaune dans un entrepôt (30 % ou 65 % de la course)';
                      return (
                        <button
                          type="button"
                          className={`city-rush-bazooka-button${ready ? ' is-ready' : ' is-empty'}`}
                          onClick={() => actionsRef.current?.('bazooka')}
                          disabled={!ready}
                          title={hint}
                          aria-label={hint}
                        >
                          <span className="city-rush-bazooka-label">BAZOOKA</span>
                          <span className="city-rush-bazooka-icon"><PowerIcon type="bazooka" /></span>
                          <span className="city-rush-bazooka-status">{stateLabel}</span>
                        </button>
                      );
                    })()}
                    {(() => {
                      const type = CITY_RUSH_POWERS.PISTOL;
                      const rule = CITY_RUSH_POWER_RULES[type];
                      const ammo = Math.max(0, Math.min(rule.chargeCost, Number(hud.inventory?.[type]) || 0));
                      const ready = ammo > 0;
                      return (
                        <button
                          type="button"
                          className={`city-rush-machine-gun-button${ready ? ' is-ready' : ' is-empty'}${ready && ammo <= 2 ? ' is-low' : ''}`}
                          onClick={() => actionsRef.current?.(type)}
                          disabled={!ready}
                          title={ready ? `AK-47 chargé · ${ammo} balle${ammo > 1 ? 's' : ''} restante${ammo > 1 ? 's' : ''} · appuie ou maintiens Z pour tirer` : `Ramasse un bonus rouge rare pour obtenir ${CITY_RUSH_PISTOL_AMMO_PER_PICKUP} balles`}
                          aria-label={ready ? `Tirer à l’AK-47, ${ammo} balle${ammo > 1 ? 's' : ''} restante${ammo > 1 ? 's' : ''} ; maintiens Z pour vider le chargeur` : `AK-47 : 0/${CITY_RUSH_PISTOL_AMMO_PER_PICKUP}, ramasse un bonus rouge rare`}
                        >
                          {/* Anneau de munitions : un segment par balle du chargeur. */}
                          <svg className="city-rush-machine-gun-ammo" viewBox="0 0 100 100" aria-hidden="true">
                            {Array.from({ length: CITY_RUSH_PISTOL_AMMO_PER_PICKUP }, (_, index) => {
                              const total = CITY_RUSH_PISTOL_AMMO_PER_PICKUP;
                              const span = 360 / total;
                              const from = ((index * span) + 4 - 90) * (Math.PI / 180);
                              const to = (((index + 1) * span) - 4 - 90) * (Math.PI / 180);
                              const r = 47;
                              return (
                                <path
                                  key={index}
                                  className={index < ammo ? 'is-loaded' : ''}
                                  d={`M ${50 + r * Math.cos(from)} ${50 + r * Math.sin(from)} A ${r} ${r} 0 0 1 ${50 + r * Math.cos(to)} ${50 + r * Math.sin(to)}`}
                                />
                              );
                            })}
                          </svg>
                          <span className="city-rush-machine-gun-label">AK-47</span>
                          <span className="city-rush-machine-gun-icon"><PowerIcon type={type} /></span>
                          <span className="city-rush-machine-gun-status">{ready ? `CHARGÉ ${ammo}/${CITY_RUSH_PISTOL_AMMO_PER_PICKUP}` : `0 / ${CITY_RUSH_PISTOL_AMMO_PER_PICKUP}`}</span>
                        </button>
                      );
                    })()}
                  </div>
                )}
                </div>
              </div>
            )}

            {phase === 'intro' && (
              <div className="city-rush-overlay city-rush-intro">
                {/* Stepper */}
                <div className="city-rush-stepper" aria-label="Étapes de préparation des courses libres">
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
                </div>

                {introStep === 'mode' && (
                  <>
                    <div className="city-rush-intro-copy">
                      <span className="city-rush-overlay-kicker"><i /> VICE CITY · 1986 · ARCADE RACING</span>
                      <h2>VICE CITY<br /><em>RUSH.</em></h2>
                      <p>Choisis un mode, une ville et une voiture. Pour suivre l’histoire de Nico Vega, reprends la campagne ci-dessous.</p>
                    </div>

                    <button type="button" className="city-rush-tutorial-launch" onClick={() => setTutorialOpen(true)}>
                      <span className="city-rush-tutorial-launch-mark" aria-hidden="true">▶</span>
                      <span><b>APPRENDRE À ROULER</b><small>{CITY_RUSH_TUTORIAL_STEPS.length} mini-tutos · env. {CITY_RUSH_TUTORIAL_DURATION_SECONDS} secondes</small></span>
                      <i aria-hidden="true">↗</i>
                    </button>

                    <section className="cr-story-hub" aria-labelledby="cr-story-hub-title">
                      <div className="cr-story-hub-heading">
                        <div>
                          <span className="cr-story-hub-kicker">MODE HISTOIRE</span>
                          <h3 id="cr-story-hub-title">MIDNIGHT REVANCHE</h3>
                        </div>
                        <span className="cr-story-hub-progress">
                          {storyChapter >= CITY_RUSH_STORY_CHAPTER_COUNT
                            ? 'Campagne terminée'
                            : `${storyChapter} / ${CITY_RUSH_STORY_CHAPTER_COUNT} chapitres terminés`}
                          <b>★ {storyTotal}/30</b>
                        </span>
                      </div>

                      <button
                        type="button"
                        className="city-rush-story-banner"
                        onClick={() => beginStory()}
                        aria-label={storyChapter >= CITY_RUSH_STORY_CHAPTER_COUNT
                          ? 'Recommencer la campagne Midnight Revanche'
                          : `Continuer Midnight Revanche au chapitre ${nextStoryIndex + 1} : ${previewStoryChapter.title}`}
                      >
                        <span className="city-rush-story-banner-visual" aria-hidden="true">
                          <img src={`${import.meta.env.BASE_URL || '/'}${storyArtFor(previewStoryChapter, previewStoryChapter.sceneKind)}`} alt="" />
                          <span className="city-rush-story-banner-badge">
                            {storyChapter >= CITY_RUSH_STORY_CHAPTER_COUNT
                              ? 'CAMPAGNE TERMINÉE'
                              : `CHAPITRE ${String(nextStoryIndex + 1).padStart(2, '0')} / ${String(CITY_RUSH_STORY_CHAPTER_COUNT).padStart(2, '0')}`}
                          </span>
                        </span>
                        <span className="city-rush-story-banner-body">
                          <span className="city-rush-story-banner-meta">
                            <span className="city-rush-mode-tag" style={{ '--tag-accent': '#ff5d7e' }}>ACTE {previewStoryChapter.act} · {previewStoryChapter.actTitle}</span>
                            <small>{previewStoryCity.name} · {previewStoryChapter.year}</small>
                          </span>
                          <b>{previewStoryChapter.title}</b>
                          <span className="city-rush-story-description">{previewStoryChapter.recap || previewStoryChapter.objective.detail}</span>
                          <span className="city-rush-story-banner-actions">
                            <span className="city-rush-story-launch-label">
                              {storyChapter >= CITY_RUSH_STORY_CHAPTER_COUNT
                                ? 'RECOMMENCER LA CAMPAGNE'
                                : `CONTINUER · CHAPITRE ${String(nextStoryIndex + 1).padStart(2, '0')}`}
                              <i aria-hidden="true">↗</i>
                            </span>
                          </span>
                        </span>
                      </button>

                      {storyChapter > 0 && (
                        <details className="cr-story-chapter-select">
                          <summary>
                            <span className="cr-story-chapter-select-copy">
                              <b>Rejouer un chapitre</b>
                              <small>{storyChapter >= CITY_RUSH_STORY_CHAPTER_COUNT
                                ? 'Tous les chapitres sont disponibles'
                                : 'Choisir parmi les chapitres déjà atteints'}</small>
                            </span>
                            <span className="cr-story-chapter-select-action">Liste des chapitres <i aria-hidden="true">⌄</i></span>
                          </summary>
                          <div className="cr-story-chapter-list" role="group" aria-label="Choisir un chapitre débloqué">
                            {CITY_RUSH_STORY_CHAPTERS.map((entry, index) => {
                              const unlocked = index < storyChapter || storyChapter >= CITY_RUSH_STORY_CHAPTER_COUNT;
                              const stars = Math.max(0, Math.min(3, Math.floor(Number(storyStars[entry.id]) || 0)));
                              const number = String(index + 1).padStart(2, '0');
                              return (
                                <button
                                  key={entry.id}
                                  type="button"
                                  className={`cr-story-chapter-option${unlocked ? '' : ' is-locked'}`}
                                  disabled={!unlocked}
                                  onClick={() => beginStory(index)}
                                  aria-label={unlocked
                                    ? `Rejouer le chapitre ${index + 1}, ${entry.title}, ${stars} étoiles sur 3`
                                    : `Chapitre ${index + 1}, ${entry.title}, verrouillé. Termine les chapitres précédents pour le débloquer`}
                                >
                                  <span className="cr-story-chapter-number">{number}</span>
                                  <span className="cr-story-chapter-name">
                                    <small>ACTE {entry.act} · {entry.actTitle} · {entry.year}</small>
                                    <b>{entry.title}</b>
                                  </span>
                                  <span className="cr-story-chapter-status">
                                    <span>{unlocked ? 'REJOUER' : 'VERROUILLÉ'}</span>
                                    {unlocked && <b>★ {stars}/3</b>}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </details>
                      )}
                    </section>

                    <div className="cr-story-free-mode-heading">
                      <span>COURSES LIBRES</span>
                      <small>Choisis ton défi</small>
                    </div>
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
                          {m.format !== 'sprint' && <span className="city-rush-mode-bazooka-hint">BAZOOKA · 2 TIRS · 2 CONTENEURS JAUNES (30 % / 65 %)</span>}
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

                {/* Rappels d'écran : les touches sur ordinateur, les gestes au
                    doigt (la feuille de style montre l'un ou l'autre selon le
                    pointeur). */}
                <div className="city-rush-intro-foot">
                  <span className="is-key-hint">← → / Q D · VOIES (MAINTENIR)</span>
                  <span className="is-touch-hint">GLISSE ← → SUR LA ROUTE · CHANGE DE VOIE</span>
                  <span className="is-key-hint">A / Z / R · POUVOIRS · BONUS VERT : TURBO</span>
                  <span className="is-touch-hint">BOUTON ROUGE · AK-47 · BONUS VERT : TURBO</span>
                  <span>{currentLaps} TOURS · {currentDistance} M</span>
                  <span className="is-key-hint">M · SON</span>
                  <span className="is-key-hint">F · PLEIN ÉCRAN</span>
                </div>
              </div>
            )}

            {phase === 'cinematic' && storyMode && currentStoryRace && (
              <div className="city-rush-overlay city-rush-intro city-rush-story-cinematic" role="dialog" aria-modal="true" aria-labelledby="city-rush-story-title">
                <header className="cr-story-chapter-header">
                  <div className="cr-story-chapter-header-top">
                    <div className="cr-story-chapter-labels">
                      <span className="cr-story-chapter-kicker">MODE HISTOIRE · ACTE {currentStoryRace.act} · {currentStoryRace.actTitle} · {currentStoryRace.year}</span>
                      <span className="cr-story-chapter-count">CHAPITRE {String(storyRaceChapter + 1).padStart(2, '0')} / {String(CITY_RUSH_STORY_CHAPTER_COUNT).padStart(2, '0')}</span>
                    </div>
                    <button type="button" className="cr-story-chapter-back" onClick={returnToModePicker}>← RETOUR AUX MODES</button>
                  </div>
                  <h2 id="city-rush-story-title">{currentStoryRace.title}</h2>
                  {currentStoryRace.recap ? (
                    <p className="cr-story-recap"><b>PRÉCÉDEMMENT</b><span>{currentStoryRace.recap}</span></p>
                  ) : null}
                </header>

                {!briefingDone ? (
                  <CityRushComic
                    chapter={currentStoryRace}
                    panels={currentStoryRace.comic.briefing}
                    kicker="BRIEFING"
                    doneLabel="VOIR LA COURSE"
                    onDone={() => setBriefingDone(true)}
                    onSkip={() => setBriefingDone(true)}
                  />
                ) : (
                  <>
                    <section className="cr-story-mission-card" aria-labelledby="cr-story-mission-title">
                      {/* Objectif principal : mis en avant, tout le reste est
                          secondaire et replié pour qu'on comprenne d'un coup
                          d'œil ce qu'il faut faire. */}
                      <div className="cr-story-mission-goal">
                        <p className="cr-story-mission-kicker">🎯  OBJECTIF</p>
                        <h3 id="cr-story-mission-title">{currentStoryRace.objective.label}</h3>
                        <p>{currentStoryRace.objective.detail}</p>
                      </div>

                      <div className="cr-story-mission-course">
                        <div>
                          <small>{currentStoryRace.race.type}{currentStoryRace.boss ? ' · BOSS' : ''}</small>
                          <b>{currentStoryRace.race.name}</b>
                        </div>
                        <span className="cr-story-mission-distance">
                          {sprintMode ? `${CITY_RUSH_SPRINT_CHECKPOINTS} CP` : `${currentLaps} T`}
                          <i>{RACE_KM}</i>
                          {currentStoryRace.id === 'ring' && storyTargetTime !== null && <i>CIBLE {formatTime(storyTargetTime)}</i>}
                          {sprintMode && storySprintPar !== null && <i>PAR {formatTime(storySprintPar)}</i>}
                        </span>
                      </div>

                      <details className="cr-story-challenges">
                        <summary>
                          <span><b>Détails &amp; défis</b><small>Infos de course, étoiles bonus et conseil</small></span>
                          <i aria-hidden="true">⌄</i>
                        </summary>
                        <div className="cr-story-challenge-list">
                          <p><b>PARCOURS</b><span>{currentStoryRace.race.route}</span></p>
                          <p><b>VOITURE</b><span>{currentStoryRace.fixedCarId
                            ? (CITY_RUSH_CARS.find((car) => car.id === currentStoryRace.fixedCarId)?.name || '').toUpperCase() + ' (prêtée)'
                            : `${selectedCar.name} · ${selectedCar.className.toLowerCase()}`}</span></p>
                          {currentStoryRace.rules?.weaponsEnabled === false ? <p><b>RÈGLES</b><span>Course pure, pas d'armes</span></p> : null}
                          {currentStoryRace.rules?.policeEnabled ? <p><b>RISQUE</b><span>La police est de la partie</span></p> : null}
                          <p><b>2 ★</b><span>{currentStoryRace.stars.two.label}</span></p>
                          <p><b>3 ★</b><span>{currentStoryRace.stars.three.label}</span></p>
                          <p><b>CONSEIL</b><span>{currentStoryRace.tip}</span></p>
                        </div>
                      </details>
                    </section>

                    <div className="cr-story-chapter-actions">
                      <button type="button" className="city-rush-start-button" onClick={() => startRace()}>
                        {currentStoryRace.boss ? 'AFFRONTER LE BOSS ↗' : 'LANCER LA COURSE ↗'}
                      </button>
                      <button type="button" className="city-rush-text-button" onClick={() => setBriefingDone(false)}>REVOIR LE BRIEFING</button>
                    </div>
                  </>
                )}
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
                  <button type="button" className="city-rush-text-button" onClick={() => setTutorialOpen(true)}>REVOIR LE TUTORIEL</button>
                  <button type="button" className="city-rush-text-button" onClick={() => { setStoryMode(false); setPhase('intro'); setIntroStep('mode'); }}>MENU PRINCIPAL</button>
                </div>
                <small>{city.name} · {activeModeLabel} · la route attend.</small>
              </div>
            )}

            {phase === 'finished' && result && (
              <div className={`city-rush-overlay city-rush-result-overlay${result.destroyed ? ' is-destroyed' : ''}`}>
                <span className="city-rush-overlay-kicker">{result.timedOut ? `TEMPS ÉCOULÉ · COURSE PERDUE` : result.sabotaged ? `SABOTAGE · PANNE MOTEUR` : result.destroyed ? `COQUE DÉTRUITE · COURSE PERDUE` : result.sprint ? `SPRINT RÉUSSI · ${formatTime(result.duration)}` : result.rank === 1 ? `VICTOIRE · ${activeModeName}` : `ARRIVÉE · ${activeModeName}`} · {result.sprint ? `${CITY_RUSH_SPRINT_CHECKPOINTS} CHECKPOINTS` : `${result.laps || currentLaps} TOURS`}</span>
                <h2>{result.timedOut && !storyMode ? <>CHRONO<br /><em>À ZÉRO.</em></> : result.sabotaged ? <>SABOTAGE<br /><em>MOTEUR !</em></> : result.destroyed ? <>TON ÉPAVE<br /><em>FUME ENCORE.</em></> : finalStoryVictory ? storyEnding ? <>{CITY_RUSH_STORY_ENDINGS[storyEnding].title}<br /><em>FIN.</em></> : <>LE DERNIER<br /><em>CHOIX.</em></> : storyMode && result.objectiveMet ? <>OBJECTIF<br /><em>REMPLI !</em></> : storyMode ? <>OBJECTIF<br /><em>MANQUÉ.</em></> : result.rank === 1 ? <>TU MÈNES<br /><em>LA DANSE.</em></> : <>LA VILLE<br /><em>EST À TOI.</em></>}</h2>
                <div className="city-rush-result-grid">
                  {result.sprint
                    ? <div><small>CHECKPOINTS</small><b>{result.checkpoints ?? 0}<i> / {CITY_RUSH_SPRINT_CHECKPOINTS}</i></b></div>
                    : <div><small>PLACE</small><b>{result.destroyed ? 'DERNIER' : ordinal(result.rank)}<i> / 3</i></b></div>}
                  <div><small>CHRONO</small><b>{formatTime(result.duration)}</b></div>
                  <div><small>{result.sprint ? 'CHECKPOINT MOYEN' : 'TOUR MOYEN'}</small><b>{formatTime((result.duration || 0) / (result.sprint ? CITY_RUSH_SPRINT_CHECKPOINTS : (result.laps || currentLaps || CITY_RUSH_LAPS)))}</b></div>
                  <div><small>BUTIN</small><b>{result.score}<i> PTS</i></b></div>
                </div>
                {storyMode && currentStoryRace && (
                  <div className="cr-story-stars" role="status" aria-label={result.objectiveMet ? `Objectif rempli, ${result.storyStars} étoiles sur 3` : 'Objectif manqué, aucune étoile'}>
                    <div className="cr-story-stars-row" aria-hidden="true">
                      {[0, 1, 2].map((slot) => <i key={slot} className={result.objectiveMet && slot < (result.storyStars || 0) ? 'is-earned' : ''}>★</i>)}
                    </div>
                    {result.objectiveMet ? (
                      <>
                        <span className="cr-story-star-line">★ OBJECTIF · <b>{currentStoryRace.objective.label}</b></span>
                        <span className={`cr-story-star-line${result.storyTwo ? '' : ' is-missed'}`}>{result.storyTwo ? '★' : '☆'} DÉFI · <b>{currentStoryRace.stars.two.label}</b></span>
                        <span className={`cr-story-star-line${result.storyThree ? '' : ' is-missed'}`}>{result.storyThree ? '★' : '☆'} DÉFI · <b>{currentStoryRace.stars.three.label}</b></span>
                      </>
                    ) : (
                      <span className="cr-story-star-line is-missed">☆ OBJECTIF MANQUÉ · RECOMMENCE LE CHAPITRE</span>
                    )}
                  </div>
                )}
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
                  {result.timedOut && !storyMode
                    ? `Les ${formatSprintSeconds(sprintCheckpointBonus)} secondes se sont écoulées avant le checkpoint ${(result.checkpoints || 0) + 1} sur ${CITY_RUSH_SPRINT_CHECKPOINTS}. La revanche t’attend.`
                    : result.sabotaged
                    ? 'Le moteur cale à 500 m de la ligne — exactement comme en 1983. Sauf que cette fois, tu sais qui a touché à la mécanique.'
                    : result.destroyed
                    ? `Ta coque est tombée à zéro : la voiture a tourné sur elle-même dans sa fumée avant de s’arrêter, hors course. ${result.winner} l’emporte ; la revanche t’attend.`
                    : finalStoryVictory && storyEnding
                    ? CITY_RUSH_STORY_ENDINGS[storyEnding].text
                    : finalStoryVictory
                      ? 'Dante est vaincu. Nico tient enfin les preuves : à lui de choisir ce qu’il fera de sa revanche.'
                      : storyMode && result.objectiveMet
                        ? `Objectif rempli : ${currentStoryRace?.objective?.label || 'chapitre terminé'} !`
                        : storyMode
                          ? `Objectif manqué : ${currentStoryRace?.objective?.detail || 'recommence le chapitre'}. La revanche t’attend.`
                          : result.rank === 1
                            ? (result.sprint ? `Les ${CITY_RUSH_SPRINT_CHECKPOINTS} checkpoints de ${city.name} franchis en ${formatTime(result.duration)}.` : `Tu remportes le ${mode.name} sur ${city.name}.`)
                            : (result.sprint ? `${result.winner} franchit la ligne en tête du sprint. La revanche t’attend.` : `${result.winner} franchit la ligne en tête après ${result.laps || currentLaps} tours. La revanche t’attend.`)}{' '}
                  {!finalStoryVictory && !result.sprint && `${result.pickups} objet${result.pickups > 1 ? 's' : ''} ramassé${result.pickups > 1 ? 's' : ''}.`}
                </p>
                {storyMode && currentStoryRace && (
                  <CityRushComic
                    chapter={currentStoryRace}
                    panels={result.objectiveMet ? currentStoryRace.comic.debriefWin : currentStoryRace.comic.debriefFail}
                    kicker={result.objectiveMet ? 'DÉBRIEF · OBJECTIF REMPLI' : 'DÉBRIEF · OBJECTIF MANQUÉ'}
                    doneLabel="▼ CONTINUER"
                    onDone={() => document.getElementById('city-rush-result-buttons')?.scrollIntoView({ behavior: 'smooth', block: 'end' })}
                    onSkip={null}
                  />
                )}
                {finalStoryVictory && !storyEnding && (
                  <div className="city-rush-ending-choices" role="group" aria-label="Choisir la fin de l’histoire">
                    <small className="cr-story-stars-total">★ {storyTotal} / 30 ÉTOILES DE CAMPAGNE</small>
                    {Object.values(CITY_RUSH_STORY_ENDINGS).map((ending) => {
                      const unlocked = storyEndingUnlocked(ending.id, storyTotal);
                      return (
                        <button key={ending.id} type="button" onClick={() => chooseStoryEnding(ending.id)} disabled={!unlocked} title={unlocked ? ending.pitch : `Verrouillée : ${ending.requiresStars} étoiles requises (tu as ${storyTotal})`}>
                          <b>{ending.title.toUpperCase()}</b>
                          <span>{unlocked ? ending.pitch : `🔒 ${ending.requiresStars}★ REQUISES · TU AS ${storyTotal}★`}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="city-rush-overlay-buttons" id="city-rush-result-buttons">
                  {storyMode && result.objectiveMet && !finalStoryVictory ? (
                    <>
                      <button type="button" className="city-rush-start-button" onClick={() => beginStory()}>CHAPITRE SUIVANT <span>↗</span></button>
                      {(result.storyStars || 0) < 3 && (
                        <button type="button" className="city-rush-start-button is-gold" onClick={() => startRace()}>REJOUER · VISER 3 ★ <span>↻</span></button>
                      )}
                    </>
                  ) : finalStoryVictory && storyEnding ? (
                    <button type="button" className="city-rush-start-button" onClick={restartStory}>REJOUER L’HISTOIRE <span>↻</span></button>
                  ) : finalStoryVictory ? null : storyMode ? (
                    <button type="button" className="city-rush-start-button" onClick={() => startRace()}>RECOMMENCER LE CHAPITRE <span>↻</span></button>
                  ) : (
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
            <span className="city-rush-desktop-hint">← → / Q D : VOIES (MAINTENIR) {sprintMode || !storyWeaponsOn ? '' : <><b>·</b> Z : MITRAILLEUSE {bazookaMode && <><b>·</b> X : BAZOOKA</>} </>}<b>·</b> P : PAUSE <b>·</b> M : SON <b>·</b> F : PLEIN ÉCRAN</span>
            <span className="city-rush-mobile-hint">GLISSE GAUCHE / DROITE{sprintMode ? ' · SOLO CONTRE LA MONTRE' : !storyWeaponsOn ? ' · COURSE PURE, SANS ARME' : bazookaMode ? ' · OBJETS EN BAS · X : BAZOOKA' : ' · OBJETS EN BAS'}</span>
          </div>
          {tutorialOpen && <CityRushTutorial onClose={() => setTutorialOpen(false)} />}
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

          {/* Le Sprint possède ses checkpoints et son bonus turbo flottant, mais aucune
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
                <div><b>TURBO FLOTTANT · AUTOMATIQUE</b><small>Traverse un bonus vert flottant — l’éclair au-dessus de la chaussée — pour accélérer pendant {CITY_RUSH_TRACK_BOOST_DURATION} secondes. C'est le seul bonus du Sprint.</small></div>
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
            <div className="city-rush-side-heading"><span>OBJETS</span><i>{storyMode && !storyWeaponsOn ? 'SANS ARME · TURBO' : bazookaMode ? '2 ARMES + TURBO' : '1 ARME + TURBO'}</i></div>
            <h3>{storyMode && !storyWeaponsOn ? <>Course pure.<br /><em>Pilotage seul.</em></> : <>Ramasse.<br /><em>Déclenche.</em></>}</h3>
            <div className="city-rush-guide-list">
              {storyWeaponsOn && POWER_ORDER.map((type) => {
                const rule = CITY_RUSH_POWER_RULES[type];
                return (
                  <div className={`city-rush-guide-item is-${type}${rule.automatic ? ' is-automatic' : ''}`} key={type}>
                    <span><PowerIcon type={type} /></span>
                    <div><b>{rule.name} · {CITY_RUSH_PISTOL_AMMO_PER_PICKUP} BALLES PAR BONUS</b><small>{rule.description}</small></div>
                    <kbd>{rule.automatic ? 'AUTO' : rule.key}</kbd>
                  </div>
                );
              })}
              {bazookaMode && (
                <div className="city-rush-guide-item is-bazooka">
                  <span><PowerIcon type="bazooka" /></span>
                  <div><b>BAZOOKA · {CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP} TIRS PAR CONTENEUR</b><small>Sur chaque carte, deux conteneurs maritimes jaunes qui prennent deux voies de la chaussée : un à 30 % de la course, avant le garage de vie, un à 65 %. On les traverse de part en part, sous le toit, sur la voie extérieure. X ou le bouton jaune tire droit : la première voiture de police touchée explose, ainsi que toute patrouille dans un rayon de {CITY_RUSH_BAZOOKA_BLAST_CELLS} cases. Chaque tir compte.</small></div>
                  <kbd>X · 4</kbd>
                </div>
              )}
              {storyMode && !storyWeaponsOn && (
                <div className="city-rush-guide-item is-solo">
                  <span className="city-rush-guide-glyph" aria-hidden="true">◎</span>
                  <div><b>COURSE PURE · AUCUNE ARME</b><small>Pas de chargeur rouge dans ce chapitre : les emplacements donnent des turbos. Seul le pilotage compte.</small></div>
                  <kbd>PUR</kbd>
                </div>
              )}
              <div className="city-rush-guide-item is-boost">
                <span><PowerIcon type={CITY_RUSH_PICKUPS.BOOST} /></span>
                <div><b>TURBO FLOTTANT · AUTOMATIQUE</b><small>Traverse un bonus vert flottant — l’éclair au-dessus de la chaussée — pour accélérer pendant {CITY_RUSH_TRACK_BOOST_DURATION} secondes. Les chargeurs rouges de l’AK-47 restent distincts des soins.</small></div>
                <kbd>{CITY_RUSH_TRACK_BOOST_DURATION} s</kbd>
              </div>
              <div className="city-rush-guide-item is-health">
                <span><PowerIcon type={CITY_RUSH_PICKUPS.HEALTH} /></span>
                <div><b>PLUS ROUGE · +{CITY_RUSH_HEALTH_PICKUP_RESTORE} CARRÉ DE VIE</b><small>Ramasse une trousse marquée d’une croix rouge pour réparer un carré de coque. Le soin ne dépasse pas la vie maximale et ne ranime pas une épave.</small></div>
                <kbd>+{CITY_RUSH_HEALTH_PICKUP_RESTORE}</kbd>
              </div>
              <div className="city-rush-guide-item is-ramp">
                <span className="city-rush-guide-glyph" aria-hidden="true">▲</span>
                <div><b>TREMPLINS & SAUTS</b><small>Prends les rampes pour bondir sur plusieurs dizaines de mètres selon ta vitesse et survoler le trafic et les barrages sans collision. En l’air, la voiture garde sa voie : le volant ne répond qu’à l’atterrissage. Une voiture de police qui saute ne part pas en épave à la retombée : chaque atterrissage lui coûte {CITY_RUSH_POLICE_RAMP_LANDING_DAMAGE} carrés de vie, et elle n’explose que sa barre vidée.</small></div>
                <kbd>SAUT</kbd>
              </div>
            </div>
          </section>
          )}

          <section className="city-rush-no-collision-note">
            <span className="city-rush-no-collision-icon">◎</span>
            <div><b>MODE {activeModeName} · {activeModeLabel}</b><p>{storyMode ? `${currentStoryRace?.race?.name || city.name} : objectif — ${currentStoryRace?.objective?.label || ''}. ${currentStoryRace?.objective?.detail || ''} ${currentStoryRace?.tip || ''}` : mode.desc} Distance totale : {currentDistance} m. Le trafic bloque, et chaque choc contre une voiture — civile, en face ou berline de police — retire un carré de vie, ou deux contre un SUV de police. Un répit après chaque choc empêche les dégâts répétés tant que les voitures restent collées. Conduite libre : changer de voie ne ralentit plus du tout — double et évite le trafic à pleine allure. Maintenir ← ou → (Q / D) enchaîne les écarts tout seul, sans marteler la touche : la voiture glisse de voie en voie jusqu’à la relâche. Tenir sa voie sans zigzaguer fait accélérer (jusqu’à +{Math.round((CITY_RUSH_CLEAN_LINE_MAX_BONUS - 1) * 100)} % de vitesse), et c’est le seul prix d’un écart : le bonus retombe à zéro. Rouler à contresens, dans les trois voies en sens inverse, charge un second bonus cumulatif — jusqu’à +{Math.round((CITY_RUSH_ONCOMING_BONUS_MAX - 1) * 100)} % de vitesse — mais un choc frontal l’annule net et te recale derrière la voiture en face. Un tremplin se prend dans la voie où tu arrives : en l’air, la voiture garde sa voie jusqu’à l’atterrissage.{city.driveSide === 'left' ? ' Ici on roule à gauche, comme dans le pays : ta course tient la moitié gauche de la chaussée et le trafic venant en face arrive par la droite.' : ''}</p></div>
          </section>

          {/* En Sprint, la carte de l'escouade disparaît : titre, sirène et
              couleur rouge compris. Elle est remplacée par la carte solo. */}
          <section className={`city-rush-no-collision-note${sprintMode || (storyMode && !storyPoliceOn) ? ' is-solo' : ' is-police'}`}>
            <span className="city-rush-no-collision-icon" aria-hidden="true">{sprintMode || (storyMode && !storyPoliceOn) ? '⚡' : '🚨'}</span>
            <div>
              <b>{sprintMode ? 'SPRINT SOLO · AUCUNE POURSUITE' : storyMode && !storyPoliceOn ? 'CHAPITRE SANS POLICE' : 'ESCOUADE DE POLICE'}</b>
              <p>
                {sprintMode ? (
                  <>Rien à fuir dans ce mode : ni escouade, ni berline de police, ni hélicoptère d’observation, ni adversaire en piste. Seulement toi, le chrono, les {CITY_RUSH_SPRINT_CHECKPOINTS} portes visibles tous les {CITY_RUSH_SPRINT_CHECKPOINT_SPACING} m et les bonus turbo verts flottant au-dessus de la chaussée — {CITY_RUSH_SPRINT_DISTANCE} m en tout. Le trafic civil bloque toujours la voie, et chaque choc te coûte un carré de vie.</>
                ) : storyMode && !storyPoliceOn ? (
                  <>Aucune poursuite dans ce chapitre : ni escouade, ni niveau de recherche, ni herse. Les berlines croisées restent du décor — concentre-toi sur l’objectif.</>
                ) : (
                  <>
                    {!storyMode && mode.policeFromStart
                      ? 'En Poursuite, trois voitures de police te prennent pour cible dès le départ.'
                      : 'En Circuit, trois voitures de police entrent au dernier tour et te prennent pour cible, même si tu n’es pas en tête.'}
                    {' '}Tirer sur une voiture de police fait monter la recherche à trois étoiles ; la première destruction la fait passer à quatre, la deuxième à cinq. À quatre étoiles, deux voitures de police se rangent en travers devant toi et déploient une herse sur les trois voies du sens de course : si tu la franchis sans te décaler, sans sauter et sans passer en contresens, tu crèves les pneus — un carré de coque et une longue perte de vitesse. À cinq étoiles, deux SUV d’interception arrivent de face par les voies inverses et foncent sur toi, en verrouillant ta voie ; un choc coûte deux carrés, et les SUV font ensuite demi-tour pour te prendre en chasse.  Chaque carte garde un seul mini-garage élargi, placé au centre de la chaussée et couvrant les deux voies centrales (voies 3 et 4 sur les routes à six voies), à mi-parcours — à la moitié de la course —, y compris en Poursuite. Une flèche peinte sur la chaussée et des chevrons lumineux l’annoncent quelques mètres avant l’entrée, et un panneau rappelle la distance. Sa traversée fait passer la recherche de cinq à quatre étoiles, de quatre à trois, ou de trois (et moins) à zéro. Elle rend aussi jusqu’à {CITY_RUSH_MINI_GARAGE_REPAIR_AMOUNT} carrés de vie — sans dépasser la résistance maximale de ta voiture. La poursuite ne s’arrête complètement que lorsque le niveau retombe à zéro. Il répare aussi sans étoiles ; il ne sert qu’une fois par course. Chaque rival qui touche une voiture de police — d’un tir ou d’un carambolage — reçoit son propre poursuivant, qui le chasse lui seul ; le premier du classement à l’ouverture du dernier tour est chassé de la même façon. Les voitures de police du trafic sont aussi vulnérables aux tirs rouges. Le joueur et ses adversaires ont chacun 15 cellules : cinq bleues, cinq vertes, puis cinq jaunes ; les trois dernières passent au rouge. Un tir rouge en enlève une sans dérapage ni ralentissement. Une berline armée se range dans ton dos et te vise : son halo rouge te prévient, et il te suffit de te décaler pour casser sa mire — la rafale ne part qu’après son temps d’alignement ({CITY_RUSH_POLICE_AIM_TIME.toFixed(2).replace('.', ',')} s). Une berline de police a six points de vie, affichés en six carrés au-dessus de son toit : un tir rouge lui retire un seul carré — le même prix qu’contre un adversaire — et un carambolage à pleine allure tout autant, en te coûtant à toi aussi un carré. Un saut de tremplin lui coûte {CITY_RUSH_POLICE_RAMP_LANDING_DAMAGE} carrés à l’atterrissage : elle s’allume, garde la chasse, et n’explose que sa barre vidée — trois sauts pour une berline neuve, cinq pour un SUV. Un SUV de police blindé dispose de dix carrés : cinq tirs bleus ou dix balles rouges le détruisent, et le percuter te coûte deux carrés au lieu d’un. Les renforts de l’escouade reviennent après destruction. L’attaque d’hélicoptère est supprimée ; l’hélicoptère d’observation suit le joueur au dernier tour sans tirer.


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
