import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAchievementAction } from '../achievements/AchievementContext';
import MirageWorld from './MirageWorld';
import MiragePowerIcon from './MiragePowerIcon';
import MirageOnline from './MirageOnline';
import MirageScoreboard from './MirageScoreboard';
import MirageSkinPreview from './MirageSkinPreview';
import { setMirageSkinPreviewsPaused } from './mirageSkinRenderer';
import { MirageCupPicker, MirageStagePicker, stageName } from './MirageCoursePicker';
import MirageCupResults from './MirageCupResults';
import MirageCupTrophy from './MirageCupTrophy';
import MirageTrophyIcon from './MirageTrophyIcon';
import MirageFullscreenIcon from './MirageFullscreenIcon';
import MirageGraphicsButton, { MirageGraphicsSwitch } from './MirageGraphicsToggle';
import useMirageGraphics from './useMirageGraphics';
import { DesertGroove } from './arcadeAudio';
import { fetchMirageLeaderboard, mirageApiEnabled, submitMirageScore } from './mirageApi';
import { DUEL_DISTANCE, DIAMOND_SPEED_MULTIPLIERS, SPEED_BOOST_DURATION, POWER_UPS, POWER_UP_CHARGE_COST, POWER_UP_DIAMOND_COST, POWER_BOOST_DURATION, LASSO_SLOW_DURATION, PISTOL_STUN_DURATION, GEM_RESPAWN_DELAY, duelRivalsForTrack, laneCount } from './mirageRules';
import { decodeChallenge, encodeChallenge } from './duelChallenge';
import {
  CUPS, CUP_POINTS, DEFAULT_CUP_ID, cleanRiderName, createCupRun, cupCurrentStage, cupStandings,
  getCup, isCupComplete, cupWinner, placeLabel, recordCupRace,
} from './mirageCup';
import { buildDuelStandings, rankLabel } from './mirageStandings';
import { CLOUD_CHOCOBO_ID, CLOUD_CHOCOBO_TEMPORARILY_FREE, SKINS, SHOP_SKINS, WIN_COINS, applyRun, buySkin, equipSkin, isShopSkin, isSkinUnlocked, levelProgress, loadProgress, saveProgress, skinFor } from './mirageProgression';
import { isFullscreenShortcut, opensFullscreenOnLaunch } from './mirageFullscreen';
import useMirageFullscreen from './useMirageFullscreen';
import './mirage-rush.css';

const BEST_KEY = 'letsplay_mirage_rush_best_v1';
// Nom imprimé sur le trophée de la Coupe (saisi dans le sélecteur de coupe).
const RIDER_NAME_KEY = 'letsplay_mirage_cup_name_v1';
const EMPTY_HUD = {
  score: 0, gems: 0, combo: 0, multiplier: '1.0', lives: 3, remaining: 60,
  shieldCharges: 0, lassoCharges: 0, pistolCharges: 0, boostCharges: 0,
  shieldChargePoints: 0, lassoChargePoints: 0, pistolChargePoints: 0, boostChargePoints: 0,
  shieldProgress: 0, lassoProgress: 0, pistolProgress: 0, boostProgress: 0,
  anyPowerReady: false,
};

function readBest() {
  try { return Math.max(0, Number(window.localStorage.getItem(BEST_KEY)) || 0); }
  catch { return 0; }
}

function writeBest(score) {
  try { window.localStorage.setItem(BEST_KEY, String(score)); } catch {}
}

function readRiderName() {
  try { return cleanRiderName(window.localStorage.getItem(RIDER_NAME_KEY), ''); }
  catch { return ''; }
}

function writeRiderName(name) {
  try {
    if (name.trim()) window.localStorage.setItem(RIDER_NAME_KEY, name);
    else window.localStorage.removeItem(RIDER_NAME_KEY);
  } catch {}
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  return `00:${String(safe).padStart(2, '0')}`;
}

function playerName(entry) {
  return entry?.username || entry?.display_name || 'Joueur';
}

function MirageRunAward({ award }) {
  if (!award) return null;
  return (
    <p className="mirage-xp-award" role="status">
      <strong>+{award.xpGained} XP</strong>
      {award.coinsGained > 0 && <b className="mirage-coin-gain">+{award.coinsGained} OR</b>}
      {award.leveledUp && <span>NIVEAU {award.level} !</span>}
      {award.unlocked?.length > 0 && <em>SKIN DÉBLOQUÉ : {award.unlocked.map((skin) => skin.name).join(' · ')}</em>}
    </p>
  );
}

function MirageWallet({ coins, className = '' }) {
  const amount = Math.max(0, Number(coins) || 0);
  return (
    <span className={`mirage-wallet ${className}`.trim()} aria-label={`${amount} pièces d’or`}>
      <i className="mirage-coin" aria-hidden="true" />
      <b>{amount}</b> OR
    </span>
  );
}

function MirageSkinTags({ skin }) {
  const description = [
    skin.mountLabel ? `${skin.mountLabel} ${skin.horse}` : `Cheval ${skin.horse}`,
    skin.headLabel || `Chapeau ${skin.hat}`,
    skin.accessory,
  ].filter(Boolean).join(', ');
  return (
    <span className="mirage-skin-tags" aria-label={description}>
      <i>{skin.mountIcon || '♞'} {skin.horse}</i>
      {skin.headLabel
        ? <i>✦ {skin.headLabel}</i>
        : <i>🤠 {skin.hat}</i>}
      {skin.accessory && <i>{skin.accessoryIcon || '✦'} {skin.accessory}</i>}
    </span>
  );
}

/** « L’Ombre, Sauge et Améthyste » — la liste des rivaux dans les textes. */
function frenchList(names) {
  const list = (names || []).filter(Boolean);
  if (list.length <= 1) return list[0] || '';
  return `${list.slice(0, -1).join(', ')} et ${list[list.length - 1]}`;
}

export default function MirageRushPage() {
  const { user, isDemo } = useAuth();
  const trackAchievement = useAchievementAction();
  const [searchParams] = useSearchParams();
  const challengeCode = searchParams.get('duel');
  const initialModeParam = searchParams.get('mode');
  const challenge = useMemo(() => decodeChallenge(challengeCode), [challengeCode]);
  // Le terrain se choisit dans l’overlay d’intro (« 02 / ton terrain ») ;
  // un défi imposé verrouille le parcours sur la carte du défi.
  const [selectedStage, setSelectedStage] = useState(challenge?.stage || 'desert');
  const [selectedMode, setSelectedMode] = useState(
    initialModeParam === 'online' ? 'online' : initialModeParam === 'cup' ? 'cup' : challenge ? 'duel' : 'rush',
  );
  // COUPE : une suite de duels (4 cavaliers, 3 à trois voies) sur des terrains imposés. Le
  // moteur 3D ne voit que des duels ordinaires ; `cupRun` accumule les places,
  // les points et, à la fin, le vainqueur du trophée (voir mirageCup.js).
  const [cupId, setCupId] = useState(DEFAULT_CUP_ID);
  const [riderName, setRiderName] = useState(readRiderName);
  const [cupRun, setCupRun] = useState(null);
  const isCup = selectedMode === 'cup';
  // Vrai quand « LANCER » ouvre déjà le plein écran (téléphone, application) : relu à
  // chaque rendu, comme `trackLanes`.
  const launchesFullscreen = opensFullscreenOnLaunch();
  const activeCup = getCup(cupId) || CUPS[0];
  // L'intro devient un vrai tunnel : d'abord un écran de boutons de mode,
  // puis seulement l'écran suivant avec les maps et le lancement.
  const [introStep, setIntroStep] = useState(() => (challenge || initialModeParam === 'online' || initialModeParam === 'cup' ? 'stage' : 'mode'));
  const [onlineOpen, setOnlineOpen] = useState(initialModeParam === 'online');
  const [settingsTab, setSettingsTab] = useState('community');
  const currentUserName = useMemo(
    () =>
      user?.user_metadata?.gamertag
      || user?.user_metadata?.display_name
      || user?.user_metadata?.full_name
      || user?.username
      || user?.display_name
      || user?.email?.split('@')[0]
      || '',
    [user],
  );
  const defaultRiderName = cleanRiderName(currentUserName);
  const effectiveRiderName = cleanRiderName(riderName, defaultRiderName);
  // Piste de la partie : trois voies et deux rivaux sur téléphone (navigateur
  // comme application), quatre voies et trois rivaux sur ordinateur et
  // tablette (voir src/games/mirageLanes.js). Relu à chaque rendu — la piste
  // est choisie au démarrage, avant le premier rendu.
  const trackLanes = laneCount();
  const trackRivals = useMemo(() => duelRivalsForTrack(trackLanes), [trackLanes]);
  const rivalCount = trackRivals.length;
  const riderCount = rivalCount + 1;
  const rivalNameList = frenchList(trackRivals.map((rival) => rival.label));
  // En défi, L'Ombre est le fantôme du lien : ce sont les autres rivaux qui
  // restent en piste à ses côtés.
  const chaseRivalNames = frenchList(trackRivals.filter((rival) => rival.id !== 'ombre').map((rival) => rival.label));
  const [race, setRace] = useState({ mode: 'rush' });
  // En coupe, le terrain est celui de la course en cours (ou de la dernière,
  // tant que l’overlay d’arrivée est affiché) ; avant le départ, celui de la
  // 1ʳᵉ course.
  const stage = isCup
    ? (cupRun && race.cup ? race.stage : activeCup.stages[0])
    : selectedMode === 'duel' && challenge ? challenge.stage || 'desert' : selectedStage;
  const [shareState, setShareState] = useState('');
  const [phase, setPhase] = useState('intro');
  const [countdown, setCountdown] = useState(3);
  const [runToken, setRunToken] = useState(0);
  const [ready, setReady] = useState(false);
  const [hud, setHud] = useState(EMPTY_HUD);
  const [best, setBest] = useState(readBest);
  const [newRecord, setNewRecord] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [boardState, setBoardState] = useState('loading');
  const [submitState, setSubmitState] = useState('');
  const [justFinished, setJustFinished] = useState(null);
  const [progression, setProgression] = useState(() => loadProgress());
  const [award, setAward] = useState(null);
  const [shopNotice, setShopNotice] = useState('');
  const [powerToast, setPowerToast] = useState(null);
  const [fx, setFx] = useState('');
  // Détection tactile : elle ne change plus les boutons (la barre d'objets du
  // PC est la même partout) mais la *consigne* de l'écran des maps — gestes
  // du pouce sur téléphone, touches du clavier sur ordinateur.
  const [isTouch, setIsTouch] = useState(false);
  const progressRef = useRef(progression);
  const cupRunRef = useRef(null);
  const actionsRef = useRef(null);
  const audioRef = useRef(null);
  const shellRef = useRef(null);
  // Plein écran de la coquille de jeu (voir la section « Plein écran » plus bas).
  // La sortie « native » (Échap, geste retour) est branchée sur la pause plus loin,
  // une fois `pauseGame` défini : d'où la référence.
  const nativeExitRef = useRef(null);
  const {
    active: immersive,
    enter: enterImmersive,
    exit: exitImmersive,
    toggle: toggleImmersive,
    isPinned: immersivePinned,
  } = useMirageFullscreen(shellRef, { onNativeExit: () => nativeExitRef.current?.() });
  // Option « Graphismes baissés » : la coque en porte la classe, qui retire les
  // flous et autres effets de l'habillage (voir mirage-rush.css, section Graphismes
  // baissés). Le moteur 3D lit le même choix de son côté.
  const { low: lowGraphics } = useMirageGraphics();
  const fxTimer = useRef(null);
  const toastTimer = useRef(null);
  const phaseRef = useRef(phase);
  const musicOnRef = useRef(musicOn);
  phaseRef.current = phase;
  musicOnRef.current = musicOn;
  const connected = Boolean(user?.id) && !isDemo;
  const backendEnabled = mirageApiEnabled();

  // Détection d'écran tactile (pointer: coarse) : téléphone et application
  // lisent les consignes de glissement, l'ordinateur ses raccourcis clavier.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(pointer: coarse)');
      setIsTouch(mq.matches);
      const handler = (e) => setIsTouch(e.matches);
      mq.addEventListener?.('change', handler);
      return () => mq.removeEventListener?.('change', handler);
    }
  }, []);

  const refreshLeaderboard = useCallback(async () => {
    if (!backendEnabled) {
      setBoardState('offline');
      return;
    }
    setBoardState('loading');
    const rows = await fetchMirageLeaderboard(8);
    if (rows === null) {
      setBoardState('unavailable');
      return;
    }
    setLeaderboard(rows);
    setBoardState('ready');
  }, [backendEnabled]);

  useEffect(() => {
    audioRef.current = new DesertGroove();
    refreshLeaderboard();
    return () => {
      audioRef.current?.destroy();
      audioRef.current = null;
      window.clearTimeout(fxTimer.current);
      window.clearTimeout(toastTimer.current);
    };
  }, [refreshLeaderboard]);

  // ── Plein écran ────────────────────────────────────────────────────────
  // Le mécanisme (Fullscreen API, couche fixe en repli, verrou de défilement)
  // vit dans useMirageFullscreen / mirageFullscreen.js. Ici, les règles du jeu :
  //   - téléphone, tablette, application : « LANCER » ouvre le plein écran tout
  //     seul (le doigt joue mieux sur tout l'écran) et la page le referme dès
  //     qu'elle revient à l'intro — c'est le comportement d'origine ;
  //   - ordinateur : jamais sans demande. Bouton « Plein écran » de la barre du
  //     jeu, « LANCER EN PLEIN ÉCRAN » ou touche F. Demandé ainsi, il reste ouvert
  //     d'une course à l'autre (intro comprise) jusqu'à ce qu'on le quitte ;
  //   - si le navigateur le referme (Échap, geste « retour »), la course en cours
  //     est mise en pause plutôt que jouée à moitié dans la page.
  useEffect(() => {
    if (phase === 'intro' && !immersivePinned()) exitImmersive();
  }, [phase, exitImmersive, immersivePinned]);

  // Lance une course (compte à rebours, puis le moteur démarre) : commun à la
  // ruée, au duel et à chaque course d’une coupe.
  const beginRace = useCallback((nextRace, { fullscreen = false } = {}) => {
    // Clic « LANCER » / Entrée pour rejouer : on demande le plein écran
    // ici, synchronement dans le geste, sinon le navigateur le refuse.
    // « LANCER EN PLEIN ÉCRAN » le demande à coup sûr ; sur téléphone et
    // application, tout lancement l'ouvre ; sur ordinateur, un lancement
    // ordinaire laisse la page comme elle est (en plein écran si on y est déjà).
    if (fullscreen) enterImmersive({ pinned: true });
    else if (opensFullscreenOnLaunch()) enterImmersive();
    audioRef.current?.setStage(nextRace.stage);
    setRace(nextRace);
    setRunToken((token) => token + 1);
    setShareState('');
    setHud(EMPTY_HUD);
    setNewRecord(false);
    setJustFinished(null);
    setAward(null);
    setSubmitState('');
    setPowerToast(null);
    setFx('');
    setCountdown(3);
    setPhase('countdown');
    if (musicOnRef.current) audioRef.current?.start();
  }, [enterImmersive]);

  // ── Coupe ──────────────────────────────────────────────────────────────
  // Une course de coupe est un duel ordinaire, marqué `cup` pour l’interface :
  // le moteur, les pouvoirs et le classement en course ne changent pas.
  const cupRace = useCallback((run) => ({
    mode: 'duel',
    stage: cupCurrentStage(run),
    challenge: null,
    cup: { id: run.cupId, index: run.races.length, total: run.stages.length },
  }), []);

  const clearCup = useCallback(() => {
    cupRunRef.current = null;
    setCupRun(null);
  }, []);

  // « LANCER LA COUPE » / « REJOUER LA COUPE » : une coupe neuve, 0 point.
  // Branché tel quel sur des `onClick` : le premier argument peut être un
  // évènement, seul `{ fullscreen: true }` compte (« LANCER EN PLEIN ÉCRAN »).
  const startCup = useCallback((options) => {
    const run = createCupRun(activeCup.id, {
      playerName: effectiveRiderName,
      playerColors: skinFor(progressRef.current).colors,
      // Les rivaux de la piste courante : trois sur ordinateur et tablette,
      // deux sur le téléphone à trois voies.
      rivals: trackRivals,
    });
    if (!run) return;
    cupRunRef.current = run;
    setCupRun(run);
    beginRace(cupRace(run), { fullscreen: options?.fullscreen === true });
  }, [activeCup.id, effectiveRiderName, trackRivals, beginRace, cupRace]);

  const showCupTrophy = useCallback(() => {
    setPhase('trophy');
    // Lancé dans le geste du joueur (clic / Entrée), sinon le navigateur refuse le son.
    if (musicOnRef.current) audioRef.current?.fanfare();
  }, []);

  // « COURSE SUIVANTE » (ou « VOIR LE PODIUM » après la dernière course).
  const advanceCup = useCallback(() => {
    const run = cupRunRef.current;
    if (!run) return;
    if (isCupComplete(run)) showCupTrophy();
    else beginRace(cupRace(run));
  }, [beginRace, cupRace, showCupTrophy]);
  const startCupRef = useRef(startCup);
  startCupRef.current = startCup;
  const advanceCupRef = useRef(advanceCup);
  advanceCupRef.current = advanceCup;

  // Idem : `startRun({ fullscreen: true })` lance la course en plein écran ; un
  // évènement de clic en premier argument est ignoré.
  const startRun = useCallback((options) => {
    const fullscreen = options?.fullscreen === true;
    if (selectedMode === 'cup') {
      startCup({ fullscreen });
      return;
    }
    beginRace({ mode: selectedMode, stage, challenge: selectedMode === 'duel' ? challenge : null }, { fullscreen });
  }, [stage, selectedMode, challenge, beginRace, startCup]);
  const startRunRef = useRef(startRun);
  startRunRef.current = startRun;

  useEffect(() => {
    if (phase !== 'countdown') return undefined;
    if (countdown > 0) {
      const timer = window.setTimeout(() => setCountdown((value) => value - 1), countdown === 3 ? 950 : 820);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setPhase('playing'), 640);
    return () => window.clearTimeout(timer);
  }, [phase, countdown]);

  const pauseGame = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    setPhase('paused');
    audioRef.current?.stop();
  }, []);

  const resumeGame = useCallback(() => {
    if (phaseRef.current !== 'paused') return;
    setPhase('playing');
    if (musicOnRef.current) audioRef.current?.start();
  }, []);

  // Le navigateur vient de refermer le plein écran (Échap, geste « retour ») :
  // en pleine course, on suspend plutôt que de laisser le cheval galoper pendant
  // que la page se remet en forme. `pauseGame` ne fait rien hors course.
  nativeExitRef.current = pauseGame;

  const cancelCountdown = useCallback(() => {
    setPhase('intro');
    setIntroStep('stage');
    setHud(EMPTY_HUD);
    audioRef.current?.stop();
    clearCup();
  }, [clearCup]);

  useEffect(() => {
    const onKey = (event) => {
      const key = event.key.toLowerCase();
      const target = event.target?.tagName;
      const typing = target === 'INPUT' || target === 'TEXTAREA' || target === 'SELECT';
      if (typing) return;
      if (isFullscreenShortcut(event)) {
        event.preventDefault();
        toggleImmersive();
        return;
      }
      if (key === 'escape' || key === 'p') {
        if (phaseRef.current === 'playing') { event.preventDefault(); pauseGame(); }
        else if (phaseRef.current === 'paused') { event.preventDefault(); resumeGame(); }
        else if (phaseRef.current === 'countdown') { event.preventDefault(); cancelCountdown(); }
      }
      if (target !== 'BUTTON' && phaseRef.current === 'finished' && cupRunRef.current?.races.length) {
        // Coupe : Entrée enchaîne. Pas « R » — c’est le pistolet, et un tir
        // tardif ne doit pas sauter le classement.
        if (key === 'enter') {
          event.preventDefault();
          advanceCupRef.current?.();
        }
      } else if ((key === 'enter' || key === 'r') && phaseRef.current === 'finished' && target !== 'BUTTON') {
        event.preventDefault();
        startRunRef.current?.();
      } else if (key === 'enter' && phaseRef.current === 'trophy' && target !== 'BUTTON') {
        event.preventDefault();
        startCupRef.current?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pauseGame, resumeGame, cancelCountdown, toggleImmersive]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) pauseGame(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [pauseGame]);

  const toggleMusic = () => {
    const next = !musicOn;
    setMusicOn(next);
    if (next && phase === 'playing') audioRef.current?.start();
    else audioRef.current?.stop();
  };

  const chooseMode = useCallback((mode) => {
    setPhase('intro');
    audioRef.current?.stop();
    clearCup();
    setOnlineOpen(false);
    setSelectedMode(mode);
    setIntroStep('stage');
  }, [clearCup]);

  const openOnlineLobby = useCallback(() => {
    // Le lobby prend la place de la coquille de jeu : un plein écran demandé à
    // la main ne doit pas lui survivre (verrou de défilement compris).
    exitImmersive();
    setPhase('intro');
    audioRef.current?.stop();
    setOnlineOpen(true);
  }, [exitImmersive]);

  const backToCoursePicker = () => {
    setPhase('intro');
    setOnlineOpen(false);
    setIntroStep('mode');
    setHud(EMPTY_HUD);
    setJustFinished(null);
    setFx('');
    setPowerToast(null);
    audioRef.current?.stop();
    clearCup(); // quitter en cours de route = abandonner la coupe
  };

  const recordProgress = useCallback((result) => {
    const outcome = applyRun(progressRef.current, result);
    progressRef.current = outcome.progress;
    setProgression(outcome.progress);
    saveProgress(outcome.progress);
    return outcome;
  }, []);

  const onFinish = useCallback(async (result) => {
    setHud((current) => ({ ...current, score: result.score, gems: result.gems, remaining: Math.max(0, 60 - result.duration) }));
    setJustFinished(result);
    setPhase('finished');
    audioRef.current?.stop();
    setAward(recordProgress(result));
    if (cupRunRef.current && result.mode === 'duel') {
      const currentRun = cupRunRef.current;
      const next = recordCupRace(currentRun, result);
      cupRunRef.current = next;
      setCupRun(next);
      // Seul le vainqueur du classement général remporte le trophée — gagner
      // une course isolée ne suffit pas. L'ensemble de succès déduplique par
      // identifiant de coupe et le synchronise aussi avec le compte connecté.
      if (next !== currentRun && isCupComplete(next) && cupWinner(next)?.isPlayer) {
        trackAchievement('mirage_cup_won', { cupId: next.cupId });
      }
      return;
    }
    if (result.mode === 'duel') return;
    const isRecord = result.score > readBest();
    if (isRecord) {
      writeBest(result.score);
      setBest(result.score);
    }
    setNewRecord(isRecord);
    if (!backendEnabled) return;
    if (!connected) {
      setSubmitState('login');
      return;
    }
    setSubmitState('saving');
    const submitted = await submitMirageScore(result);
    if (submitted === null) {
      setSubmitState('unavailable');
      return;
    }
    setSubmitState('saved');
    await refreshLeaderboard();
  }, [backendEnabled, connected, refreshLeaderboard, recordProgress, trackAchievement]);

  const shareDuel = async () => {
    if (!justFinished || justFinished.mode !== 'duel') return;
    const url = new URL(window.location.href);
    url.searchParams.set('duel', encodeChallenge({ ...justFinished, name: user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Cavalier' }));
    try {
      await navigator.clipboard.writeText(url.toString());
      setShareState('Lien copié ! Envoie-le à ton adversaire.');
    } catch {
      setShareState(url.toString());
    }
  };

  const onHud = useCallback((next) => setHud(next), []);
  const trigger = (name) => actionsRef.current?.(name);

  const flashFx = useCallback((name) => {
    window.clearTimeout(fxTimer.current);
    setFx(name);
    fxTimer.current = window.setTimeout(() => setFx(''), name === 'is-hit' ? 520 : 400);
  }, []);

  const showPowerToast = useCallback((text) => {
    window.clearTimeout(toastTimer.current);
    setPowerToast(text);
    toastTimer.current = window.setTimeout(() => setPowerToast(null), 2400);
  }, []);

  const timePercent = useMemo(() => Math.max(0, Math.min(100, (hud.remaining / 60) * 100)), [hud.remaining]);
  const duelPercent = Math.min(100, Math.max(0, (hud.distance || 0) / DUEL_DISTANCE * 100));
  const levelInfo = useMemo(() => levelProgress(progression.xp), [progression.xp]);
  // Points que le joueur a déjà gagnés dans la coupe en cours (chip du HUD).
  const cupPlayerPoints = useMemo(
    () => (cupRun ? cupStandings(cupRun).find((row) => row.isPlayer)?.points ?? 0 : 0),
    [cupRun],
  );
  const cupPointsLine = CUP_POINTS.slice(0, riderCount).map((points, index) => `${placeLabel(index + 1)} ${points} PTS`).join(' · ');
  // Les skins 3D de « TON CAVALIER » se figent pendant une course : le GPU reste au jeu.
  const racing = phase === 'playing' || phase === 'countdown';
  useEffect(() => {
    setMirageSkinPreviewsPaused(racing);
    return () => setMirageSkinPreviewsPaused(false);
  }, [racing]);
  const activeSkin = skinFor(progression);
  const skinColors = activeSkin.colors;
  const isCloudRider = activeSkin.id === CLOUD_CHOCOBO_ID;
  const cloudPowerVariant = isCloudRider ? 'cloud' : 'standard';
  const yellowPowerLabel = isCloudRider ? 'Onde d’épée' : 'Lasso';
  const redPowerLabel = isCloudRider ? 'Éclair' : 'Pistolet';
  // Tableau des positions de l'arrivée d'un duel : le joueur et ses rivaux, classés.
  const duelStandings = useMemo(
    () => (justFinished?.mode === 'duel'
      ? buildDuelStandings(justFinished, { playerName: currentUserName || 'Cavalier', playerPalette: skinColors })
      : null),
    [justFinished, currentUserName, skinColors],
  );
  const chooseSkin = (skinId) => {
    const next = equipSkin(progressRef.current, skinId);
    progressRef.current = next;
    setProgression(next);
    saveProgress(next);
  };

  const purchaseSkin = (skinId) => {
    const result = buySkin(progressRef.current, skinId);
    if (!result.ok) {
      setShopNotice(result.reason || 'broke');
      return;
    }
    progressRef.current = result.progress;
    setProgression(result.progress);
    saveProgress(result.progress);
    setShopNotice('bought');
  };

  const modeChoices = [
    { id: 'rush', name: 'RUÉE', icon: '↯', tagline: 'Bats ton record', info: '60 secondes · 3 vies', cta: 'CHOISIR LA RUÉE' },
    { id: 'duel', name: 'DUEL', icon: '⚔', tagline: challenge ? `Défi de ${challenge.name}` : 'Devance tes rivaux', info: challenge ? `Course fantôme · ${DUEL_DISTANCE} m` : `Face aux ${rivalCount} PNJ · ${DUEL_DISTANCE} m`, cta: 'CHOISIR LE DUEL' },
    { id: 'cup', name: 'COUPE', icon: '♛', tagline: 'Vise le trophée', info: `${activeCup.stages.length} courses · ${riderCount} cavaliers`, cta: 'CHOISIR LA COUPE' },
    { id: 'online', name: 'EN LIGNE', icon: '♞', tagline: 'Retrouve tes amis', info: 'Salon · 2 à 4 cavaliers', cta: 'OUVRIR LES SALONS' },
  ];
  const selectedModeChoice = modeChoices.find((mode) => mode.id === selectedMode) || modeChoices[0];
  const introKicker = selectedMode === 'online'
    ? 'EN LIGNE · SALONS MULTIJOUEURS'
    : isCup ? `COUPE · ${activeCup.stages.length} COURSES · ${riderCount} CAVALIERS`
    : selectedMode === 'duel' ? `DUEL · PREMIER À ${DUEL_DISTANCE} M` : 'RUÉE · 60 SECONDES';
  const introTitle = selectedMode === 'online'
    ? ['CHOISIS', 'TA MAP.']
    : isCup ? ['VISE LE', 'TROPHÉE.']
    : selectedMode === 'duel' ? ['À TOI DE', 'GALOPER.'] : ['LE SABLE', 'SE RÉVEILLE.'];
  const stageDescription = isCup
    ? `Enchaîne ${activeCup.stages.length} courses à ${riderCount} cavaliers (${activeCup.stages.map(stageName).join(' → ')}) contre ${rivalNameList}, avec les mêmes pouvoirs qu’en duel. Chaque arrivée rapporte des points — plus tu finis haut, plus tu en gagnes — et le meilleur total après la dernière course soulève le trophée !`
    : selectedMode === 'duel'
    ? `Affronte ${challenge ? `${challenge.name} (course fantôme) ainsi que ${chaseRivalNames}` : `${rivalCount} cavaliers rivaux IA (${rivalNameList})`} sur les ${trackLanes} voies. Les cristaux accélèrent ton cheval et chargent tes pouvoirs. Premier à ${DUEL_DISTANCE} m !`
    : stage === 'snakeway' ? 'Galope sur le Chemin du Serpent, une route dorée qui traverse les nuages orange jusqu’à la planète de Kaio. Passe sous le halo céleste, évite les météores et ramasse les fragments d’étoile dans ce voyage inspiré de Dragon Ball Z !'
    : stage === 'airbase' ? 'Décolle sur le taxiway de Thunder Airbase, hommage au stage de Guile : F-16 garé à gauche, drapeau américain géant, soldats qui applaudissent dans les gradins et panneau SONIC BOOM. Saute les barrières de piste et contourne les fûts de kérosène !'
    : stage === 'infinity' ? 'Galope sur le pont suspendu du Château de l’Infini au son du biwa de Nakime : saute les paravents shōji d’engawa et contourne les piliers-lanternes Andon au cœur d’un labyrinthe sans gravité de tatamis, d’escaliers flottants et de pagodes renversées !'
    : stage === 'ramparts' ? 'Remonte le Mid des Remparts d’Ocre au galop : le site B à gauche (Rush B, tunnels, portes B), le site A à droite (Long, Goose, la C4 posée). Saute les murets criblés d’impacts et contourne les Xbox !'
    : stage === 'japan' ? 'Galope de nuit à travers les plaines d’argent vers le Mont Fuji illuminé par la lune : saute les palissades de bambou et contourne les lanternes de pierre sacrées au son du shamisen et des tambours taiko.'
    : stage === 'alger' ? 'Galope sur les boulevards d’Alger la Blanche : saute les balustrades de la corniche, contourne les voitures de police qui ferment le boulevard et fonce vers la baie bleue, entre immeubles haussmanniens, palmiers face à la mer, passants, voitures stationnées et musique chaâbi.'
    : stage === 'sardinia' ? 'Galope sous le soleil de la Costa Omertà, entre terrasses animées et mer turquoise : saute les tonneaux du port et contourne les cyprès en pot.'
    : stage === 'prairie' ? 'Galope vers le soleil couchant ! Saute les bottes de paille basses et contourne les piles hautes, entre herbes dorées et champs de blé.'
    : stage === 'western' ? 'Contourne les caisses empilées, saute les clôtures et fonce dans la rue de Dust Creek !'
    : 'Esquive les cactus, saute les blocs et attrape les fragments solaires. Chaque cristal nourrit ton combo et ton score.';
  const stageIntroText = selectedMode === 'online'
    ? `Choisis la map par défaut de ton prochain salon, puis ouvre le lobby multijoueur. ${stageDescription}`
    : stageDescription;
  const stageHint = selectedMode === 'online'
    ? 'ÉCRAN 02 · MAP DU SALON · 2 À 4 CAVALIERS EN LIGNE'
    : isCup
      ? `${activeCup.stages.length} COURSES · ${cupPointsLine}`
      : selectedMode === 'duel'
        ? `${riderCount} CAVALIERS · DÉPART → ${DUEL_DISTANCE} M · LE PLUS RAPIDE GAGNE`
        : '60 SECONDES · 3 VIES · MULTIPLICATEUR DE COMBO · RECORD À BATTRE';

  if (selectedMode === 'online' && onlineOpen) {
    return (
      <MirageOnline
        connected={connected}
        userId={user?.id}
        userName={currentUserName}
        initialStage={selectedStage}
        onRunFinish={recordProgress}
        onSelectMode={chooseMode}
        onBack={() => {
          setOnlineOpen(false);
          setSelectedMode('rush');
          setIntroStep('mode');
        }}
      />
    );
  }

  return (
    <div className="mirage-page">
      <header className="mirage-heading wrap">
        <div className="mirage-heading-copy">
          <div className="mirage-eyebrow"><span className="mirage-live-dot" /> LET’S PLAY ARCADE <span className="mirage-eyebrow-divider">/</span> 3D VOXEL RUNNER</div>
          {/* Le titre « MIRAGE RUSH » et son chapô ont été retirés des DEUX
              thèmes (aucun conditionnement par data-theme) : encre crème
              posée en dur, ils étaient invisibles sur le fond clair du
              thème Light, et la demande est de ne plus les afficher du tout.
              L’eyebrow et le lien de retour suffisent. */}
          <Link className="mirage-back-link" to="/jeu">← RETOUR AUX JEUX</Link>
        </div>
        {/* La barre d’onglets (RUÉE / DUEL / EN LIGNE) de l’en-tête est
            retirée : le choix du mode vit maintenant dans l’overlay d’intro,
            juste au-dessus du bouton de lancement.
            Le bloc « TON RECORD » a lui aussi été retiré de l’en-tête pour
            faire remonter le jeu juste sous la navbar ; le record reste
            visible dans l’écran de fin de partie. */}
      </header>

      <div className="mirage-layout wrap">
        <section
          ref={shellRef}
          className={`mirage-game-shell${phase === 'playing' ? ' is-running' : ''}${immersive ? ' is-immersive' : ''}${lowGraphics ? ' is-low-graphics' : ''}`}
          aria-label="Partie de Mirage Rush"
        >
          <div className="mirage-game-topbar">
            <div className="mirage-game-brand"><span className="mirage-brand-gem">◆</span><span>{stage === 'snakeway' ? 'ZONE 10 · CHEMIN DU SERPENT' : stage === 'airbase' ? 'ZONE 09 · THUNDER AIRBASE' : stage === 'infinity' ? 'ZONE 08 · CHÂTEAU DE L’INFINI' : stage === 'ramparts' ? 'ZONE 07 · REMPARTS D’OCRE' : stage === 'japan' ? 'ZONE 06 · PLAINES DE YŌTEI' : stage === 'alger' ? 'ZONE 05 · ALGER LA BLANCHE' : stage === 'sardinia' ? 'ZONE 04 · COSTA OMERTÀ' : stage === 'prairie' ? 'ZONE 03 · PLAINES D’OR' : stage === 'western' ? 'ZONE 02 · DUST CREEK' : 'ZONE 01 · DUNES DE L’ÉCHO'}</span></div>
            <div className="mirage-game-controls-top">
              {phase === 'playing' && <>
                <span className="mirage-live-pill"><i /> EN PARTIE</span>
                <button type="button" className="mirage-pause-button" onClick={pauseGame} aria-label="Mettre la partie en pause">❚❚ PAUSE</button>
                <button type="button" className="mirage-back-game-button" onClick={backToCoursePicker} aria-label="Retour au choix du mode">← RETOUR</button>
              </>}
              {phase === 'paused' && <>
                <span className="mirage-live-pill is-paused"><i /> EN PAUSE</span>
                <button type="button" className="mirage-pause-button is-resume" onClick={resumeGame} aria-label="Reprendre la partie">▶ REPRENDRE</button>
              </>}
              <button type="button" className={`mirage-sound-button${musicOn ? ' is-on' : ''}`} onClick={toggleMusic} aria-pressed={musicOn}>
                <span aria-hidden="true">{musicOn ? '♫' : '♪'}</span> {musicOn ? 'SON ON' : 'SON COUPÉ'}
              </button>
              <MirageGraphicsButton />
              <button
                type="button"
                className={`mirage-fullscreen-button${immersive ? ' is-on' : ''}`}
                onClick={(event) => {
                  toggleImmersive();
                  // Après un clic (souris ou doigt), le bouton rend le focus : un
                  // bouton qui le garde recevrait aussi Espace (saut) et Entrée
                  // (rejouer). Au clavier (detail 0), le focus reste où il est.
                  if (event.detail > 0) event.currentTarget.blur();
                }}
                aria-pressed={immersive}
                aria-label="Plein écran"
                title={immersive ? 'Quitter le plein écran (F)' : 'Plein écran (F)'}
              >
                <MirageFullscreenIcon exit={immersive} />
                <span className="mirage-fullscreen-label">PLEIN ÉCRAN</span>
              </button>
            </div>
          </div>

          <div className={`mirage-viewport${fx ? ` ${fx}` : ''}${phase === 'playing' ? ' is-live' : ''}${phase === 'playing' && hud.powerBoostActive ? ' is-turbo' : ''}`}>
            {/* Pendant la remise du trophée, le moteur de course est démonté : un
                seul contexte WebGL à la fois, et pas de course qui tourne dans le dos. */}
            {phase !== 'trophy' && <MirageWorld
              active={phase === 'playing'}
              race={race}
              stage={stage}
              skin={skinColors}
              prepareSignal={runToken}
              onReady={() => setReady(true)}
              onHud={(next) => {
                onHud(next);
              }}
              onFinish={onFinish}
              onCrash={() => flashFx('is-hit')}
              onMud={() => {
                audioRef.current?.mudSplash?.();
                flashFx('is-mud');
                showPowerToast('🟤 Flaque de boue ! Monture ralentie…');
              }}
              onPickup={(tier) => {
                audioRef.current?.pickup(tier);
                if (tier === 3) flashFx('is-glow');
              }}
              actionsRef={actionsRef}
              onPowerUp={(info) => {
                if (info?.action === 'used') {
                  if (info.type === 'shield') {
                    audioRef.current?.shieldGravity?.();
                    showPowerToast('🛡️ Bouclier activé automatiquement !');
                  } else if (info.type === 'lasso') {
                    // Cloud lance son onde d'épée : la rafale de vent, pas le lasso.
                    if (isCloudRider) audioRef.current?.cloudSwordWave?.();
                    else audioRef.current?.lassoThrow?.();
                    showPowerToast(isCloudRider ? '⚔ Onde de choc dorée lancée !' : '🪢 Lasso envoyé !');
                  } else if (info.type === 'pistol') {
                    // Cloud appelle la foudre : l'orage gronde avant la frappe.
                    if (isCloudRider) audioRef.current?.cloudStormCharge?.();
                    else audioRef.current?.gunshot();
                    showPowerToast(isCloudRider ? '⚡ L’éclair frappe ta cible !' : '🔫 Tir de pistolet !');
                  } else if (info.type === 'boost') {
                    audioRef.current?.speedBoost?.();
                    audioRef.current?.cheer?.();
                    showPowerToast(`⚡ Turbo activé automatiquement (${POWER_BOOST_DURATION}s) !`);
                  }
                } else if (info?.action === 'no_target') {
                  if (info.type === 'lasso') showPowerToast(isCloudRider ? '⚔ Aucun cavalier devant toi pour l’onde dorée !' : '🪢 Aucun cavalier devant toi !');
                  else if (info.type === 'pistol') showPowerToast(isCloudRider ? '⚡ Aucune cible devant toi pour l’éclair !' : '🔫 Aucun cavalier devant toi !');
                } else if (info?.action === 'npc_used') {
                  if (info.type === 'shield') {
                    audioRef.current?.shieldGravity?.();
                    showPowerToast(`🛡️ ${info.npcName || 'Un rival'} active son bouclier !`);
                  } else if (info.type === 'boost') {
                    audioRef.current?.speedBoost?.();
                    showPowerToast(`⚡ ${info.npcName || 'Un rival'} déclenche son Turbo (${POWER_BOOST_DURATION}s) !`);
                  }
                } else if (info?.action === 'charged') {
                  audioRef.current?.powerReady?.();
                  flashFx('is-power-ready');
                  if (info.type === 'lasso') {
                    showPowerToast(isCloudRider ? '⚡ ⚔ ONDE D’ÉPÉE PRÊTE ! Appuie sur W / Z ou clique !' : '⚡ 🪢 LASSO PRÊT ! Appuie sur W / Z ou clique !');
                  } else if (info.type === 'pistol') {
                    showPowerToast(isCloudRider ? '⚡ 🌩 ÉCLAIR PRÊT ! Appuie sur R ou clique !' : '⚡ 🔫 PISTOLET PRÊT ! Appuie sur R ou clique !');
                  }
                }
              }}
              onLassoHit={(info) => {
                if (info?.target === 'rival') {
                  const rivalLabel = info.name || 'L’ombre';
                  showPowerToast(info.blocked
                    ? `🛡️ ${rivalLabel} a bloqué ${info.cloud ? 'ton onde dorée' : 'ton lasso'} !`
                    : info.cloud ? `⚔ ${rivalLabel} est secoué(e) et ralenti(e) pendant ${LASSO_SLOW_DURATION}s !` : `🪢 ${rivalLabel} est ralenti(e) !`);
                } else if (info?.target === 'npc_vs_npc') {
                  audioRef.current?.lassoThrow?.();
                  showPowerToast(
                    info.blocked
                      ? `🛡️ ${info.name} bloque le lasso de ${info.attackerName} !`
                      : `🪢 ${info.attackerName} ralentit ${info.name} au lasso !`
                  );
                } else if (info?.target === 'player') {
                  if (info.from === 'npc') audioRef.current?.lassoThrow?.();
                  const attacker = info.attackerName || 'un rival';
                  showPowerToast(info.blocked ? `🛡️ Lasso de ${attacker} bloqué par ton bouclier !` : `🪢 Touché par le lasso de ${attacker} !`);
                }
              }}
              onPistolHit={(info) => {
                if (info?.target === 'rival') {
                  const rivalLabel = info.name || 'L’ombre';
                  showPowerToast(info.blocked
                    ? `🛡️ ${rivalLabel} a bloqué ${info.cloud ? 'ton éclair' : 'ta balle'} avec son bouclier !`
                    : info.cloud ? `⚡ ${rivalLabel} est foudroyé(e) et tombe pendant ${PISTOL_STUN_DURATION}s !` : `🔫 PAN ! ${rivalLabel} tombe de son cheval !`);
                } else if (info?.target === 'npc_vs_npc') {
                  audioRef.current?.gunshot();
                  showPowerToast(
                    info.blocked
                      ? `🛡️ ${info.name} arrête la balle de ${info.attackerName} !`
                      : `🔫 PAN ! ${info.attackerName} fait tomber ${info.name} !`
                  );
                } else if (info?.target === null) {
                  showPowerToast('🔫 PAN ! Personne à portée…');
                } else if (info?.target === 'player') {
                  if (info.from === 'npc') audioRef.current?.gunshot();
                  if (!info.blocked) flashFx('is-hit');
                  const attacker = info.attackerName || 'un rival';
                  showPowerToast(info.blocked ? `🛡️ Balle de ${attacker} arrêtée par ton bouclier !` : `🔫 Touché par ${attacker} ! Tu tombes de cheval…`);
                }
              }}
              onCloudStrike={(info) => {
                // Les techniques de Cloud touchent leur cible : le tonnerre
                // claque pour l'éclair rouge, l'onde dorée explose pour la jaune.
                if (info?.kind === 'red') audioRef.current?.cloudThunderStrike?.();
                else audioRef.current?.cloudWaveExplosion?.();
              }}
              onShield={() => {}}
            />}
            <div className="mirage-sun-glare" aria-hidden="true" />
            {phase === 'playing' && hud.powerBoostActive && (
              <div className="mirage-turbo-lines" aria-hidden="true">
                <i /><i /><i /><i /><i /><i /><i /><i />
              </div>
            )}
            {powerToast && (
              <div className="mirage-power-toast" role="status" aria-live="polite">
                {powerToast}
              </div>
            )}
            {phase === 'playing' && (
              <div className="mirage-hud" aria-live="polite">
                <div className="mirage-hud-card mirage-hud-score">
                  <small>SCORE</small>
                  <strong key={hud.score} className="mirage-score-pop">{hud.score.toLocaleString('fr-FR')}</strong>
                  <span className="mirage-hud-chips">
                    <i className="mirage-chip is-gem">◆ {hud.gems}</i>
                    {race.mode !== 'rush' && ((hud.shieldCharges || 0) > 0 || (hud.lassoCharges || 0) > 0 || (hud.pistolCharges || 0) > 0 || (hud.boostCharges || 0) > 0) && (
                      <i className="mirage-chip is-power-ready">
                        ⚡ {(Number((hud.shieldCharges || 0) > 0) + Number((hud.lassoCharges || 0) > 0) + Number((hud.pistolCharges || 0) > 0) + Number((hud.boostCharges || 0) > 0)) > 1 ? 'POUVOIRS PRÊTS' : 'POUVOIR PRÊT'}
                      </i>
                    )}
                    {race.mode !== 'rush' && hud.shieldActive && <i className="mirage-chip is-shield"><MiragePowerIcon type={POWER_UPS.SHIELD} className="mirage-chip-power-icon" /> {Math.ceil(hud.shieldLeft)}s</i>}
                    {race.mode !== 'rush' && hud.powerBoostActive && <i className="mirage-chip is-boost"><MiragePowerIcon type={POWER_UPS.BOOST} className="mirage-chip-power-icon" /> TURBO {Math.ceil(hud.powerBoostLeft)}s</i>}
                    {hud.slowed && (
                      <i className={`mirage-chip is-slow${hud.slowKind === 'mud' ? ' is-mud' : ''}`}>
                        {hud.slowKind === 'mud' ? '🟤 BOUE · RALENTI' : <><MiragePowerIcon type={POWER_UPS.LASSO} variant={cloudPowerVariant} className="mirage-chip-power-icon" /> RALENTI</>}
                      </i>
                    )}
                    {race.mode !== 'rush' && hud.stunned && <i className="mirage-chip is-slow"><MiragePowerIcon type={POWER_UPS.PISTOL} variant={cloudPowerVariant} className="mirage-chip-power-icon" /> À TERRE</i>}
                  </span>
                </div>
                <div className="mirage-hud-center">
                  {race.mode === 'duel' ? <>
                    <div className="mirage-clock">
                      {Math.round(hud.distance || 0)}<small> / {DUEL_DISTANCE} m</small>
                      {hud.rank > 0 && <b className={`mirage-rank-badge${hud.rank === 1 ? ' is-lead' : ''}`}>{hud.rank === 1 ? '1ᵉʳ' : `${hud.rank}ᵉ`} / {hud.totalRiders || riderCount}</b>}
                    </div>
                    <div className="mirage-race-track" aria-hidden="true">
                      <i style={{ width: `${duelPercent}%` }} />
                      {(hud.rivals?.length
                        ? hud.rivals
                        : [{ id: 'ombre', slot: 1, name: hud.rivalName, distance: hud.rivalDistance }]
                      ).map((r) => (
                        <b
                          key={r.id || r.slot}
                          className={`mirage-race-dot is-rival is-rival-${r.slot}`}
                          style={{ left: `${Math.min(100, Math.max(0, ((r.distance || 0) / DUEL_DISTANCE) * 100))}%` }}
                          title={`${r.name} · ${Math.round(r.distance || 0)} m`}
                        />
                      ))}
                      <b className="mirage-race-dot is-you" style={{ left: `${duelPercent}%` }} title="Toi" />
                      <span className="mirage-race-flag">🏁</span>
                    </div>
                    {race.cup && cupRun && (
                      <div className="mirage-hud-cup">
                        <i className="mirage-chip is-cup" title={`${activeCup.name} : points déjà gagnés`}>
                          <MirageTrophyIcon cupId={race.cup.id} className="mirage-inline-trophy" /> COURSE {race.cup.index + 1}/{race.cup.total} · {cupPlayerPoints} PTS
                        </i>
                      </div>
                    )}
                  </> : <>
                    <div className={`mirage-clock${hud.remaining <= 10 ? ' is-danger' : hud.remaining <= 20 ? ' is-warning' : ''}`}>{formatTime(hud.remaining)}</div>
                    <div className="mirage-time-track"><i style={{ width: `${timePercent}%` }} /></div>
                  </>}
                </div>
                <div className="mirage-hud-card mirage-hud-streak">
                  {race.mode === 'duel' ? <>
                    <small>VITESSE{hud.boostLeft > 0 && <b> · BOOST</b>}</small>
                    <strong key={Math.round((hud.speed || 15) * 3.6)} className="mirage-score-pop">{Math.round((hud.speed || 15) * 3.6)} <small>KM/H</small></strong>
                    <span>1ᵉʳ RIVAL : {Math.round(hud.rivalDistance || 0)} m · {hud.rivalName}</span>
                  </> : <>
                    <small>COMBO <b>×{hud.multiplier}</b></small>
                    <strong key={hud.combo} className="mirage-score-pop">{hud.combo.toString().padStart(2, '0')}</strong>
                    <span className="mirage-lives" key={`lives-${hud.lives}`} aria-label={`${hud.lives} vies restantes`}>{'◆'.repeat(hud.lives)}<i>{'◆'.repeat(Math.max(0, 3 - hud.lives))}</i></span>
                  </>}
                </div>
              </div>
            )}

            {/* Objets spéciaux — la barre horizontale du PC, sur tous les
                appareils : téléphone et application comprises. La croix
                directionnelle et le losange ont été retirés (demande du
                30/09) : on esquive au glissement, le pouce ne quitte plus la
                piste, et les objets restent là où ils sont sur ordinateur. */}
            {phase === 'playing' && race.mode !== 'rush' && (
              <div
                className="mirage-powerup-bar"
                role="group"
                aria-label="Objets de puissance"
              >
                <div className="mirage-powerup-buttons-row">
                  <button
                    type="button"
                    className={`mirage-powerup-btn is-shield-btn${(hud.shieldCharges || 0) > 0 ? ' is-ready' : ''}`}
                    onClick={() => trigger('use_shield')}
                    disabled={(hud.shieldCharges || 0) <= 0}
                    title={`Bouclier — ${POWER_UP_DIAMOND_COST[POWER_UPS.SHIELD]} diamants bleus pour remplir la barre. Il s’active tout seul dès qu’elle est pleine. Utiliser cet objet ne décharge pas les autres.`}
                  >
                    <div className="mirage-powerup-btn-top">
                      <MiragePowerIcon type={POWER_UPS.SHIELD} className="mirage-powerup-icon" />
                      <span className="mirage-powerup-key">AUTO</span>
                    </div>
                    <div className="mirage-powerup-btn-name">
                      <span>Bouclier</span>
                      {(hud.shieldCharges || 0) > 0
                        ? <b className="mirage-powerup-count is-charges">×{hud.shieldCharges}</b>
                        : <span className="mirage-powerup-count">{hud.shieldChargePoints || 0}/{POWER_UP_CHARGE_COST[POWER_UPS.SHIELD]} ◆</span>}
                    </div>
                    <div className="mirage-powerup-progress-bg">
                      <div
                        className="mirage-powerup-progress-fill is-shield"
                        style={{ width: `${(hud.shieldCharges || 0) > 0 ? 100 : Math.round((hud.shieldProgress || 0) * 100)}%` }}
                      />
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`mirage-powerup-btn is-lasso-btn${(hud.lassoCharges || 0) > 0 ? ' is-ready' : ''}`}
                    onClick={() => trigger('use_lasso')}
                    disabled={(hud.lassoCharges || 0) <= 0}
                    title={isCloudRider
                      ? `Onde de choc à l’épée (W / Z) — ${POWER_UP_DIAMOND_COST[POWER_UPS.LASSO]} diamants jaunes. Secoue et ralentit la cible pendant ${LASSO_SLOW_DURATION}s.`
                      : `Lasso (W / Z) — ${POWER_UP_DIAMOND_COST[POWER_UPS.LASSO]} diamants jaunes pour remplir la barre. Cible uniquement devant toi. Utiliser cet objet ne décharge pas les autres.`}
                  >
                    <div className="mirage-powerup-btn-top">
                      <MiragePowerIcon type={POWER_UPS.LASSO} variant={cloudPowerVariant} className="mirage-powerup-icon" />
                      <span className="mirage-powerup-key">W / Z</span>
                    </div>
                    <div className="mirage-powerup-btn-name">
                      <span>{yellowPowerLabel}</span>
                      {(hud.lassoCharges || 0) > 0
                        ? <b className="mirage-powerup-count is-charges">×{hud.lassoCharges}</b>
                        : <span className="mirage-powerup-count">{hud.lassoChargePoints || 0}/{POWER_UP_CHARGE_COST[POWER_UPS.LASSO]} ◆</span>}
                    </div>
                    <div className="mirage-powerup-progress-bg">
                      <div
                        className="mirage-powerup-progress-fill is-lasso"
                        style={{ width: `${(hud.lassoCharges || 0) > 0 ? 100 : Math.round((hud.lassoProgress || 0) * 100)}%` }}
                      />
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`mirage-powerup-btn is-boost-btn${(hud.boostCharges || 0) > 0 ? ' is-ready' : ''}`}
                    onClick={() => trigger('use_boost')}
                    disabled={(hud.boostCharges || 0) <= 0}
                    title={`Turbo — ${POWER_UP_DIAMOND_COST[POWER_UPS.BOOST]} diamants verts pour remplir la barre. Il s’active tout seul : boost de vitesse pendant ${POWER_BOOST_DURATION}s. Utiliser cet objet ne décharge pas les autres.`}
                  >
                    <div className="mirage-powerup-btn-top">
                      <MiragePowerIcon type={POWER_UPS.BOOST} className="mirage-powerup-icon" />
                      <span className="mirage-powerup-key">AUTO</span>
                    </div>
                    <div className="mirage-powerup-btn-name">
                      <span>Turbo</span>
                      {(hud.boostCharges || 0) > 0
                        ? <b className="mirage-powerup-count is-charges">×{hud.boostCharges}</b>
                        : <span className="mirage-powerup-count">{hud.boostChargePoints || 0}/{POWER_UP_CHARGE_COST[POWER_UPS.BOOST]} ◆</span>}
                    </div>
                    <div className="mirage-powerup-progress-bg">
                      <div
                        className="mirage-powerup-progress-fill is-boost"
                        style={{ width: `${(hud.boostCharges || 0) > 0 ? 100 : Math.round((hud.boostProgress || 0) * 100)}%` }}
                      />
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`mirage-powerup-btn is-pistol-btn${(hud.pistolCharges || 0) > 0 ? ' is-ready' : ''}`}
                    onClick={() => trigger('use_pistol')}
                    disabled={(hud.pistolCharges || 0) <= 0}
                    title={isCloudRider
                      ? `Éclair (R) — ${POWER_UP_DIAMOND_COST[POWER_UPS.PISTOL]} diamants rouges. Lève l’épée : la foudre frappe ta cible et la fait tomber pendant ${PISTOL_STUN_DURATION}s.`
                      : `Pistolet (R) — ${POWER_UP_DIAMOND_COST[POWER_UPS.PISTOL]} diamants rouges pour remplir la barre. Fait tomber la cible devant toi pendant ${PISTOL_STUN_DURATION}s. Utiliser cet objet ne décharge pas les autres.`}
                  >
                    <div className="mirage-powerup-btn-top">
                      <MiragePowerIcon type={POWER_UPS.PISTOL} variant={cloudPowerVariant} className="mirage-powerup-icon" />
                      <span className="mirage-powerup-key">R</span>
                    </div>
                    <div className="mirage-powerup-btn-name">
                      <span>{redPowerLabel}</span>
                      {(hud.pistolCharges || 0) > 0
                        ? <b className="mirage-powerup-count is-charges">×{hud.pistolCharges}</b>
                        : <span className="mirage-powerup-count">{hud.pistolChargePoints || 0}/{POWER_UP_CHARGE_COST[POWER_UPS.PISTOL]} ◆</span>}
                    </div>
                    <div className="mirage-powerup-progress-bg">
                      <div
                        className="mirage-powerup-progress-fill is-pistol"
                        style={{ width: `${(hud.pistolCharges || 0) > 0 ? 100 : Math.round((hud.pistolProgress || 0) * 100)}%` }}
                      />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {phase === 'countdown' && (
              <div className="mirage-overlay mirage-countdown-overlay" role="status" aria-live="assertive">
                <div className="mirage-overlay-kicker"><span>✦</span> {race.cup ? `${activeCup.name.toUpperCase()} · COURSE ${race.cup.index + 1} / ${race.cup.total} · ${stageName(race.stage).toUpperCase()}` : selectedMode === 'duel' ? `DUEL À ${riderCount} CAVALIERS · PREMIER À ${DUEL_DISTANCE} M` : 'RUÉE · 60 SECONDES · 3 VIES'} <span>✦</span></div>
                {countdown > 0
                  ? <div className="mirage-countdown-number" key={countdown}>{countdown}</div>
                  : <div className="mirage-countdown-go" key="go">GALOPE&nbsp;!</div>}
                <div className="mirage-overlay-hint">{race.cup && cupRun?.races.length ? 'ÉCHAP POUR ABANDONNER LA COUPE' : 'ÉCHAP POUR ANNULER'}</div>
              </div>
            )}

            {phase === 'intro' && (
              <div className={`mirage-overlay mirage-intro-overlay is-${introStep}-step`}>
                {introStep === 'mode' ? <>
                  <div className="mirage-overlay-kicker"><span>✦</span> CHOISIS TON MODE <span>✦</span></div>
                  <h2>MIRAGE <em>RUSH.</em></h2>
                  <p className="mirage-intro-lead">Sélectionne un vrai bouton de mode : les maps s’ouvrent à l’écran suivant, puis tu lances la Ruée, le Duel, la Coupe ou le lobby En ligne.</p>
                  <div className="mirage-mode-section">
                    <div className="mirage-picker-label"><span>01 / TON MODE</span><span>BOUTONS DE DÉPART</span></div>
                    <div className="mirage-mode-picker is-actions" role="group" aria-label="Choisir un mode Mirage">
                      {modeChoices.map((mode) => <button
                        type="button"
                        key={mode.id}
                        className="mirage-mode-action"
                        onClick={() => chooseMode(mode.id)}
                      >
                        <span className="mirage-mode-symbol" aria-hidden="true">{mode.icon}</span>
                        <span className="mirage-mode-copy"><strong>{mode.name}</strong><span>{mode.tagline}</span><small>{mode.info}</small></span>
                        <span className="mirage-mode-cta" aria-hidden="true">{mode.cta} <b>↗</b></span>
                      </button>)}
                    </div>
                  </div>
                  <MirageGraphicsSwitch />
                  {challengeCode && !challenge && <p className="mirage-duel-warning">Lien de défi invalide. Tu peux quand même choisir un mode et défier les {rivalCount} PNJ.</p>}
                  <div className="mirage-overlay-hint">ÉCRAN 01 · CHOISIS RUÉE, DUEL, COUPE OU EN LIGNE</div>
                </> : <>
                  <div className="mirage-overlay-kicker"><span>✦</span> {introKicker} <span>✦</span></div>
                  <div className="mirage-intro-toolbar">
                    <span className="mirage-selected-mode-pill"><i aria-hidden="true">{selectedModeChoice.icon}</i> MODE {selectedModeChoice.name}</span>
                    <button type="button" className="mirage-secondary-button" onClick={backToCoursePicker}>← CHANGER DE MODE</button>
                  </div>
                  <h2>{introTitle[0]} <em>{introTitle[1]}</em></h2>
                  {/* Les modes sont de vrais boutons sur l'écran précédent ;
                      les maps n'apparaissent maintenant qu'ici, à l'écran 02. */}
                  <div className="mirage-mode-section">
                    {isCup ? (
                      <MirageCupPicker
                        cupId={activeCup.id}
                        setCupId={setCupId}
                        riderName={riderName}
                        setRiderName={(value) => { setRiderName(value); writeRiderName(value); }}
                        defaultRiderName={defaultRiderName}
                        riderCount={riderCount}
                      />
                    ) : (
                      <MirageStagePicker
                        stage={stage}
                        setSelectedStage={setSelectedStage}
                        locked={selectedMode === 'duel' && Boolean(challenge)}
                      />
                    )}
                  </div>
                  {selectedMode === 'duel' && challenge && <small>Stage imposé par le défi pour garder le même parcours.</small>}
                  {challengeCode && !challenge && <p className="mirage-duel-warning">Lien de défi invalide. Tu peux quand même défier les {rivalCount} PNJ.</p>}
                  <p>{stageIntroText}</p>
                  <div className="mirage-stage-actions">
                    <button
                      type="button"
                      className="mirage-start-button"
                      onClick={selectedMode === 'online' ? openOnlineLobby : startRun}
                      disabled={selectedMode !== 'online' && !ready}
                    >
                      {selectedMode === 'online'
                        ? 'OUVRIR LES SALONS'
                        : ready ? isCup ? 'LANCER LA COUPE' : selectedMode === 'duel' ? 'LANCER LE DUEL' : 'LANCER LA PARTIE' : 'CHARGEMENT DU PARCOURS…'} <span>↗</span>
                    </button>
                    {/* Téléphone, tablette, application : le lancement ordinaire
                        ouvre déjà le plein écran — pas de second bouton. Déjà en
                        plein écran, il ne servirait à rien non plus. */}
                    {selectedMode !== 'online' && !launchesFullscreen && !immersive && (
                      <button
                        type="button"
                        className="mirage-fullscreen-launch"
                        onClick={() => startRun({ fullscreen: true })}
                        disabled={!ready}
                      >
                        <MirageFullscreenIcon /> LANCER EN PLEIN ÉCRAN
                      </button>
                    )}
                  </div>
                  {selectedMode !== 'online' && (isTouch ? (
                    /* Téléphone & application : plus de croix directionnelle à
                       l'écran, on esquive au glissement — la consigne dit le
                       geste, pas la touche. Les objets se touchent sur la
                       barre du bas, comme sur ordinateur. */
                    <div className="mirage-keys-hint" aria-label="Commandes tactiles">
                      <span>GLISSE ← → POUR ESQUIVER</span>
                      <span>TAPE POUR SAUTER</span>
                      {(selectedMode === 'duel' || isCup) && <span>TOUCHE UN OBJET EN BAS POUR LE LANCER</span>}
                    </div>
                  ) : (
                    <div className="mirage-keys-hint" aria-label="Commandes clavier">
                      <span><kbd>←</kbd><kbd>→</kbd> esquiver</span>
                      <span><kbd>↑</kbd> sauter</span>
                      {(selectedMode === 'duel' || isCup) && <>
                        <span><kbd>AUTO</kbd> <MiragePowerIcon type={POWER_UPS.SHIELD} className="mirage-key-power-icon" /> Bouclier</span>
                        <span><kbd>W/Z</kbd> <MiragePowerIcon type={POWER_UPS.LASSO} variant={cloudPowerVariant} className="mirage-key-power-icon" /> {yellowPowerLabel}</span>
                        <span><kbd>AUTO</kbd> <MiragePowerIcon type={POWER_UPS.BOOST} className="mirage-key-power-icon" /> Turbo</span>
                        <span><kbd>R</kbd> <MiragePowerIcon type={POWER_UPS.PISTOL} variant={cloudPowerVariant} className="mirage-key-power-icon" /> {redPowerLabel}</span>
                      </>}
                      <span><kbd>ÉCHAP</kbd> pause</span>
                      <span><kbd>F</kbd> plein écran</span>
                    </div>
                  ))}
                  <div className="mirage-overlay-hint">{stageHint}</div>
                </>}
              </div>
            )}

            {phase === 'paused' && (
              <div className="mirage-overlay mirage-pause-overlay">
                <div className="mirage-overlay-kicker"><span>✦</span> PARTIE SUSPENDUE <span>✦</span></div>
                <h2>LE DÉSERT <em>T’ATTEND.</em></h2>
                <div className="mirage-pause-stats">
                  <span>SCORE <b>{hud.score.toLocaleString('fr-FR')}</b></span>
                  {race.mode === 'duel'
                    ? <span>DISTANCE <b>{Math.round(hud.distance || 0)} m</b></span>
                    : <span>TEMPS RESTANT <b>{formatTime(hud.remaining)}</b></span>}
                </div>
                <MirageGraphicsSwitch />
                <div className="mirage-result-actions">
                  <button type="button" className="mirage-start-button" onClick={resumeGame}>REPRENDRE <span>▶</span></button>
                  <button type="button" className="mirage-share-button" onClick={backToCoursePicker}>{race.cup ? '← ABANDONNER LA COUPE' : '← QUITTER LA COURSE'}</button>
                </div>
                <div className="mirage-overlay-hint">ÉCHAP POUR REPRENDRE</div>
              </div>
            )}

            {phase === 'finished' && cupRun && cupRun.races.length > 0 && justFinished?.mode === 'duel' && (
              <MirageCupResults cup={activeCup} run={cupRun} award={award} onNext={advanceCup} onQuit={backToCoursePicker} />
            )}

            {phase === 'trophy' && cupRun && (
              <MirageCupTrophy cup={activeCup} run={cupRun} onReplay={startCup} onQuit={backToCoursePicker} />
            )}

            {/* Arrivée d'un duel ordinaire : le tableau des positions. Une course de
                coupe a son propre écran (classement général, juste au-dessus). */}
            {phase === 'finished' && !(cupRun && cupRun.races.length > 0) && duelStandings && (
              <div className="mirage-overlay mirage-result-overlay has-scoreboard">
                <div className="mirage-overlay-kicker"><span>✦</span> ARRIVÉE · DUEL ({rankLabel(duelStandings.playerRank)} / {duelStandings.total}) <span>✦</span></div>
                <h2>{duelStandings.playerWon ? 'VICTOIRE' : 'UN RIVAL'} <em>{duelStandings.playerWon ? 'DU CAVALIER !' : 'L’EMPORTE.'}</em></h2>
                <MirageScoreboard rows={duelStandings.rows} caption="Classement du duel" />
                <div className="mirage-result-stats">
                  <span>◆ {duelStandings.gems} cristaux · {duelStandings.score.toLocaleString('fr-FR')} pts</span>
                </div>
                <MirageRunAward award={award} />
                <div className="mirage-result-actions">
                  <button type="button" className="mirage-start-button" onClick={startRun}>REJOUER <span>↗</span></button>
                  <button type="button" className="mirage-share-button" onClick={shareDuel}>PARTAGER UN DÉFI ↗</button>
                  <button type="button" className="mirage-share-button" onClick={backToCoursePicker}>← CHOISIR TON MODE</button>
                </div>
                {shareState && <p className="mirage-share-status" role="status">{shareState}</p>}
                <div className="mirage-overlay-hint">ENTRÉE POUR REJOUER · DÉFI PAR FANTÔME, PAS EN DIRECT</div>
              </div>
            )}

            {phase === 'finished' && justFinished?.mode !== 'duel' && (
              <div className="mirage-overlay mirage-result-overlay">
                <div className="mirage-overlay-kicker"><span>✦</span> {newRecord ? 'NOUVEAU RECORD PERSONNEL' : 'FIN DE LA RUÉE'} <span>✦</span></div>
                {newRecord && <div className="mirage-record-badge">✦ NOUVEAU RECORD ✦</div>}
                <h2>{newRecord ? 'LE MIRAGE' : 'LE SABLE'} <em>{newRecord ? 'EST À TOI.' : 'T’A RATTRAPÉ.'}</em></h2>
                <div className="mirage-final-score">{(justFinished?.score || 0).toLocaleString('fr-FR')} <small>PTS</small></div>
                <div className="mirage-result-stats"><span>◆ {justFinished?.gems || 0} fragments</span><span>◷ {justFinished?.duration || 0} s</span><span>RECORD {best.toLocaleString('fr-FR')}</span></div>
                <MirageRunAward award={award} />
                <div className="mirage-result-actions">
                  <button type="button" className="mirage-start-button" onClick={startRun}>REJOUER <span>↗</span></button>
                  <button type="button" className="mirage-share-button" onClick={backToCoursePicker}>← CHOISIR TON MODE</button>
                </div>
                {submitState === 'saving' && <p className="mirage-save-note">Envoi du score au classement…</p>}
                {submitState === 'saved' && <p className="mirage-save-note is-success">Score enregistré dans le classement du site.</p>}
                {submitState === 'login' && backendEnabled && <p className="mirage-save-note">Connecte-toi pour apparaître au classement <Link to="/auth">Connexion ↗</Link></p>}
                {submitState === 'unavailable' && <p className="mirage-save-note">Classement indisponible pour le moment — ton record local est conservé.</p>}
                <div className="mirage-overlay-hint">ENTRÉE POUR REJOUER</div>
              </div>
            )}

            {phase === 'playing' && (
              <div className="mirage-live-callout" aria-hidden="true">
                {hud.combo >= 5 && <span>✦ ÉCHO SOLAIRE ×{hud.multiplier} ✦</span>}
                {hud.combo === 0 && hud.score === 0 && <span className="mirage-callout-keys">ESQUIVE ← → <b>SAUTE ↑</b></span>}
              </div>
            )}
          </div>

          <div className="mirage-game-foot"><span className="mirage-foot-touch">TÉLÉPHONE &amp; APPLICATION : GLISSE ← → POUR CHANGER DE VOIE <b>·</b> GLISSE ↑ OU TAPE POUR SAUTER <b>·</b> OBJETS : BARRE EN BAS</span><span className="mirage-foot-keys">FLÈCHES <b>·</b> SAUT (ESPACE/↑){race.mode === 'duel' ? <> <b>·</b> POUVOIRS (QWER / AZER)</> : ''} <b>·</b> PLEIN ÉCRAN (F)</span><span>{race.mode === 'duel' ? 'DUEL : CRISTAUX = VITESSE & CHARGE D’OBJETS' : 'UN RUN = UN RECORD · PAS DE PAY-TO-WIN'}</span></div>
        </section>

        <aside className="mirage-side-panel">
          <section className="mirage-settings panel-frame" aria-label="Paramètres Mirage Rush">
            <div className="mirage-panel-heading mirage-settings-heading">
              <div><span className="mirage-panel-kicker">PARAMÈTRES</span><h2>MENU <em>DU JEU</em></h2></div>
              <MirageWallet coins={progression.coins} />
            </div>
            <div className="mirage-settings-tabs" role="tablist" aria-label="Onglets des paramètres">
              <button type="button" role="tab" id="mirage-tab-community" aria-controls="mirage-panel-community" aria-selected={settingsTab === 'community'} className={settingsTab === 'community' ? 'is-active' : ''} onClick={() => setSettingsTab('community')}>La communauté</button>
              <button type="button" role="tab" id="mirage-tab-rider" aria-controls="mirage-panel-rider" aria-selected={settingsTab === 'rider'} className={settingsTab === 'rider' ? 'is-active' : ''} onClick={() => setSettingsTab('rider')}>Ton cavalier</button>
              <button type="button" role="tab" id="mirage-tab-shop" aria-controls="mirage-panel-shop" aria-selected={settingsTab === 'shop'} className={settingsTab === 'shop' ? 'is-active' : ''} onClick={() => { setSettingsTab('shop'); setShopNotice(''); }}>Boutique</button>
              <button type="button" role="tab" id="mirage-tab-info" aria-controls="mirage-panel-info" aria-selected={settingsTab === 'info'} className={settingsTab === 'info' ? 'is-active' : ''} onClick={() => setSettingsTab('info')}>Informations</button>
            </div>

            <div
              id="mirage-panel-community"
              className="mirage-settings-pane"
              role="tabpanel"
              aria-labelledby="mirage-tab-community"
              hidden={settingsTab !== 'community'}
            >
              <section className="mirage-leaderboard">
            <div className="mirage-panel-heading"><div><span className="mirage-panel-kicker">LA COMMUNAUTÉ</span><h2>TOP <em>RUNNERS</em></h2></div><span className="mirage-trophy">♛</span></div>
            <p className="mirage-board-subtitle">Les meilleurs scores de Mirage Rush</p>
            {boardState === 'loading' && <p className="mirage-board-message">Chargement du classement…</p>}
            {boardState === 'offline' && <div className="mirage-board-message"><span className="mirage-offline-mark">◌</span><strong>Classement bientôt disponible</strong><small>Les records personnels sont sauvegardés sur cet appareil. Le classement partagé s’activera avec la base de données du site.</small></div>}
            {boardState === 'unavailable' && <div className="mirage-board-message"><span className="mirage-offline-mark">◌</span><strong>Le tableau dort dans le sable</strong><small>Le classement en ligne n’est pas encore configuré. Tu peux quand même jouer et garder ton record ici.</small></div>}
            {boardState === 'ready' && leaderboard.length === 0 && <div className="mirage-board-message"><strong>La première place est libre.</strong><small>Connecte-toi et signe le premier record !</small></div>}
            {boardState === 'ready' && leaderboard.length > 0 && (
              <ol className="mirage-board-list">
                {leaderboard.map((entry, index) => (
                  <li key={entry.user_id || `${entry.username}-${index}`} className={`${index < 3 ? `is-rank-${index + 1}` : ''}${entry.mine ? ' is-mine' : ''}`}>
                    <span className="mirage-board-rank">{index < 3 ? ['🥇', '🥈', '🥉'][index] : String(index + 1).padStart(2, '0')}</span>
                    <span className="mirage-board-avatar">{playerName(entry).slice(0, 1).toUpperCase()}</span>
                    <span className="mirage-board-name">{playerName(entry)}{entry.mine && <i>TOI</i>}</span>
                    <strong>{Number(entry.score || 0).toLocaleString('fr-FR')}</strong>
                  </li>
                ))}
              </ol>
            )}
            <div className="mirage-board-footer">
              <span className={boardState === 'ready' ? 'is-online' : ''}><i /> {boardState === 'ready' ? 'CLASSEMENT DU SITE' : 'RECORD LOCAL'}</span>
              {boardState === 'ready' && <button type="button" onClick={refreshLeaderboard} aria-label="Actualiser le classement">↻</button>}
            </div>
              </section>
            </div>

            <div
              id="mirage-panel-rider"
              className="mirage-settings-pane"
              role="tabpanel"
              aria-labelledby="mirage-tab-rider"
              hidden={settingsTab !== 'rider'}
            >
              <section className="mirage-progression">
            <div className="mirage-panel-heading">
              <div><span className="mirage-panel-kicker">TON CAVALIER</span><h2>NIVEAU <em>{levelInfo.level}</em></h2></div>
              <span className="mirage-trophy">♞</span>
            </div>
            <div className="mirage-xp-track" role="progressbar" aria-valuenow={levelInfo.percent} aria-valuemin="0" aria-valuemax="100" aria-label={`Expérience du niveau ${levelInfo.level}`}>
              <i style={{ width: `${levelInfo.percent}%` }} />
              <span>{levelInfo.next ? `${levelInfo.into} / ${levelInfo.need} XP` : 'NIVEAU MAXIMAL'}</span>
            </div>
            <p className="mirage-board-subtitle">
              {levelInfo.next
                ? <>
                    Prochain skin au niveau {(SKINS.find((skin) => !isShopSkin(skin) && skin.level > levelInfo.level)?.level) ?? levelInfo.next} —{' '}
                    {SKINS.find((skin) => !isShopSkin(skin) && skin.level > levelInfo.level)?.name ?? 'sagesse du désert'}.
                  </>
                : 'Tous les skins de niveau sont débloqués. Le désert te salue, cavalier.'}
              {progression.runs > 0 && <> · {progression.runs} course{progression.runs > 1 ? 's' : ''} jouée{progression.runs > 1 ? 's' : ''}.</>}
            </p>
            <div className="mirage-skin-picker" role="group" aria-label="Skins du cavalier">
              {SKINS.map(skin => {
                const unlocked = isSkinUnlocked(skin, levelInfo.level, progression.ownedSkins);
                const selected = skin.id === activeSkin.id;
                const shopItem = isShopSkin(skin);
                return (
                  <button
                    type="button"
                    key={skin.id}
                    className={`mirage-skin-chip${selected ? ' is-selected' : ''}${unlocked ? '' : ' is-locked'}${skin.id === CLOUD_CHOCOBO_ID ? ' is-cloud-showcase' : ''}`}
                    aria-pressed={selected}
                    disabled={!unlocked && !shopItem}
                    onClick={() => (unlocked ? chooseSkin(skin.id) : setSettingsTab('shop'))}
                    title={unlocked ? skin.hint : shopItem ? `${skin.price} OR dans la boutique` : `Débloqué au niveau ${skin.level}`}
                  >
                    {/* Aperçu 3D de la monture et du cavalier, en rotation. */}
                    <span className="mirage-skin-stage">
                      <MirageSkinPreview palette={skin.colors} className="mirage-skin-model" />
                      {!unlocked && <span className="mirage-skin-lock" aria-hidden="true">🔒</span>}
                    </span>
                    <span className="mirage-skin-name">{skin.name}</span>
                    <MirageSkinTags skin={skin} />
                    <small>{selected ? 'ÉQUIPÉ' : skin.id === CLOUD_CHOCOBO_ID && CLOUD_CHOCOBO_TEMPORARILY_FREE ? `OFFERT À TOUS · ${skin.price} OR HABITUELS` : unlocked ? skin.hint : shopItem ? `${skin.price} OR` : `NIV. ${skin.level}`}</small>
                  </button>
                );
              })}
            </div>
              </section>
            </div>

            <div
              id="mirage-panel-shop"
              className="mirage-settings-pane"
              role="tabpanel"
              aria-labelledby="mirage-tab-shop"
              hidden={settingsTab !== 'shop'}
            >
              <section className="mirage-shop">
                <div className="mirage-panel-heading">
                  <div><span className="mirage-panel-kicker">BOUTIQUE</span><h2>SKINS <em>EN OR</em></h2></div>
                  <MirageWallet coins={progression.coins} />
                </div>
                <p className="mirage-board-subtitle">
                  Chaque victoire rapporte {WIN_COINS} OR. Gyro Zeppeli coûte 200 OR ; Cloud et son chocobo doré sont offerts temporairement à tous les joueurs (prix habituel conservé : 280 OR).
                </p>
                <div className="mirage-shop-list">
                  {SHOP_SKINS.map((skin) => {
                    const actuallyOwned = (progression.ownedSkins || []).includes(skin.id);
                    const owned = isSkinUnlocked(skin, levelInfo.level, progression.ownedSkins);
                    const temporaryUnlock = skin.id === CLOUD_CHOCOBO_ID && CLOUD_CHOCOBO_TEMPORARILY_FREE && !actuallyOwned;
                    const selected = skin.id === activeSkin.id;
                    const canAfford = progression.coins >= skin.price;
                    return (
                      <article key={skin.id} className={`mirage-shop-card${owned ? ' is-owned' : ''}${selected ? ' is-selected' : ''}${skin.id === CLOUD_CHOCOBO_ID ? ' is-cloud-showcase' : ''}`}>
                        <span className="mirage-skin-stage">
                          <MirageSkinPreview palette={skin.colors} className="mirage-skin-model" label={skin.name} />
                          {!owned && <span className="mirage-skin-lock" aria-hidden="true">🔒</span>}
                        </span>
                        <div className="mirage-shop-copy">
                          <span className="mirage-skin-name">{skin.name}</span>
                          <MirageSkinTags skin={skin} />
                          <p>{skin.hint}</p>
                          {temporaryUnlock && <small className="mirage-shop-temporary">OFFERT TEMPORAIREMENT · PRIX HABITUEL {skin.price} OR</small>}
                          {owned ? (
                            <button type="button" className={`mirage-shop-buy is-owned${temporaryUnlock ? ' is-temporary' : ''}`} onClick={() => chooseSkin(skin.id)} disabled={selected}>
                              {selected ? 'ÉQUIPÉ' : temporaryUnlock ? 'ÉQUIPER · OFFERT' : 'ÉQUIPER'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={`mirage-shop-buy${canAfford ? '' : ' is-broke'}`}
                              onClick={() => purchaseSkin(skin.id)}
                              title={canAfford ? `Acheter pour ${skin.price} OR` : `Il te faut ${skin.price} OR`}
                            >
                              ACHETER · {skin.price} OR
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
                {shopNotice === 'broke' && <p className="mirage-shop-notice" role="status">Pas assez d’or — une victoire rapporte {WIN_COINS} OR.</p>}
                {shopNotice === 'bought' && <p className="mirage-shop-notice is-success" role="status">Skin acheté et équipé !</p>}
              </section>
            </div>

            <div
              id="mirage-panel-info"
              className="mirage-settings-pane mirage-settings-info"
              role="tabpanel"
              aria-labelledby="mirage-tab-info"
              hidden={settingsTab !== 'info'}
            >
              <section className="mirage-howto mirage-cup-rules">
                <span className="mirage-panel-kicker">MODE COUPE · {riderCount} CAVALIERS · DES COURSES À LA SUITE</span>
                {CUPS.map((cup) => (
                  <div className="mirage-rule" key={cup.id}>
                    <span className="mirage-rule-icon is-gold">♛</span>
                    <div>
                      <strong>{cup.name}</strong>
                      <small>{cup.stages.map((id, index) => `${index + 1}. ${stageName(id)}`).join(' · ')} : {cup.stages.length} duels d’affilée contre {rivalNameList}, avec les mêmes pouvoirs qu’en duel.</small>
                    </div>
                  </div>
                ))}
                <div className="mirage-rule">
                  <span className="mirage-rule-icon is-green">✦</span>
                  <div>
                    <strong>Des points à chaque arrivée</strong>
                    <small>Plus tu finis haut, plus tu gagnes de points, et ils s’additionnent d’une course à l’autre.</small>
                    <div className="mirage-cup-points-grid" aria-label="Points par place">
                      {CUP_POINTS.slice(0, riderCount).map((points, index) => <span key={index} className={`mirage-cup-points-pill is-place-${index + 1}`}><b>{placeLabel(index + 1)}</b><i>{points} pts</i></span>)}
                    </div>
                  </div>
                </div>
                <div className="mirage-rule"><span className="mirage-rule-icon is-red">◆</span><div><strong>Le trophée</strong><small>Après la dernière course, les points sont totalisés et le vainqueur soulève le trophée sur son podium tournant. En cas d’égalité : le plus de victoires, puis la meilleure place à la dernière course.</small></div></div>
              </section>
              <section className="mirage-howto">
            <span className="mirage-panel-kicker">MODE DUEL · {riderCount} CAVALIERS · PREMIER À {DUEL_DISTANCE} M</span>
            <div className="mirage-rule"><span className="mirage-rule-icon is-gold">⚔</span><div><strong>{rivalCount > 2 ? 'Trois cavaliers rivaux' : `${rivalCount} cavaliers rivaux`}</strong><small>Défie {rivalNameList} : {rivalCount} PNJ qui changent de voie, sautent, ramassent les diamants et utilisent leurs propres pouvoirs contre toi et entre eux !</small></div></div>
            <div className="mirage-rule"><span className="mirage-rule-icon is-red">◆</span><div><strong>Boosts de vitesse & réapparition ({GEM_RESPAWN_DELAY} s)</strong><small>Chaque diamant accélère ta monture pendant {SPEED_BOOST_DURATION} s : bleu ×{DIAMOND_SPEED_MULTIPLIERS[0].toFixed(1)}, rouge ×{DIAMOND_SPEED_MULTIPLIERS[1].toFixed(1)}, vert ×{DIAMOND_SPEED_MULTIPLIERS[2].toFixed(1)}, jaune ×{DIAMOND_SPEED_MULTIPLIERS[3].toFixed(1)}. Un diamant pris disparaît {GEM_RESPAWN_DELAY} s puis réapparaît !</small></div></div>
            <div className="mirage-rule">
              <MiragePowerIcon type={POWER_UPS.LASSO} variant={cloudPowerVariant} decorative={false} className="mirage-rule-image" />
              <div>
                <strong>1 couleur de diamant = 1 pouvoir (Duel & En ligne)</strong>
                <small>Le <b>Bouclier</b> se charge avec {POWER_UP_DIAMOND_COST[POWER_UPS.SHIELD]} diamants <b>bleus</b> et le <b>Turbo</b> avec {POWER_UP_DIAMOND_COST[POWER_UPS.BOOST]} diamants <b>verts</b> ; ils partent seuls quand la barre est pleine (bouclier 5 s, turbo {POWER_BOOST_DURATION} s). Le <b>{yellowPowerLabel}</b> demande {POWER_UP_DIAMOND_COST[POWER_UPS.LASSO]} diamants <b>jaunes</b> (W/Z : {isCloudRider ? `onde d’épée qui secoue et ralentit ${LASSO_SLOW_DURATION} s` : 'cible devant toi'}) et <b>{redPowerLabel}</b> {POWER_UP_DIAMOND_COST[POWER_UPS.PISTOL]} diamants <b>rouges</b> (R : {isCloudRider ? `un éclair qui foudroie la cible et la fait tomber ${PISTOL_STUN_DURATION} s` : `immobilise la cible devant toi pendant ${PISTOL_STUN_DURATION} s`}) ; ces deux pouvoirs se déclenchent à la main. Utiliser un objet ne décharge pas les autres !</small>
                <div className="mirage-rule-powers-grid" aria-label="Les 4 objets spéciaux">
                  <span className="mirage-rule-power-pill is-blue"><MiragePowerIcon type={POWER_UPS.SHIELD} className="mirage-rule-pill-icon" /><b>Bouclier</b><i>AUTO</i></span>
                  <span className="mirage-rule-power-pill is-yellow"><MiragePowerIcon type={POWER_UPS.LASSO} variant={cloudPowerVariant} className="mirage-rule-pill-icon" /><b>{yellowPowerLabel}</b><i>W/Z</i></span>
                  <span className="mirage-rule-power-pill is-green"><MiragePowerIcon type={POWER_UPS.BOOST} className="mirage-rule-pill-icon" /><b>Turbo</b><i>AUTO</i></span>
                  <span className="mirage-rule-power-pill is-red"><MiragePowerIcon type={POWER_UPS.PISTOL} variant={cloudPowerVariant} className="mirage-rule-pill-icon" /><b>{redPowerLabel}</b><i>R</i></span>
                </div>
              </div>
            </div>
            <div className="mirage-rule"><span className="mirage-rule-icon is-green">▥</span><div><strong>Collision</strong><small>Pas de vies perdues en duel : le cheval ralentit puis reprend son allure.</small></div></div>
              </section>
              <section className="mirage-howto">
            <span className="mirage-panel-kicker">LES RÈGLES DU PARCOURS</span>
            <div className="mirage-rule"><span className="mirage-rule-icon is-red">◆</span><div><strong>Ramasse les fragments</strong><small>Cyan : 100 pts · Rouge : 150 pts · Vert : 200 pts · Or : 250 pts, avant multiplicateur.</small></div></div>
            <div className="mirage-rule"><MiragePowerIcon type={POWER_UPS.SHIELD} decorative={false} className="mirage-rule-image" /><div><strong>Pouvoirs en Duel & En ligne</strong><small>Chaque couleur charge son pouvoir dédié : Bleu = Bouclier ({POWER_UP_DIAMOND_COST[POWER_UPS.SHIELD]}), Jaune = {yellowPowerLabel} W/Z ({POWER_UP_DIAMOND_COST[POWER_UPS.LASSO]}), Vert = Turbo ({POWER_UP_DIAMOND_COST[POWER_UPS.BOOST]}), Rouge = {redPowerLabel} R ({POWER_UP_DIAMOND_COST[POWER_UPS.PISTOL]}). Bouclier et Turbo partent automatiquement ; {yellowPowerLabel} et {redPowerLabel} se déclenchent à la main.{isCloudRider ? ` L’onde dorée secoue et ralentit ${LASSO_SLOW_DURATION} s ; l’éclair foudroie la cible et la fait tomber ${PISTOL_STUN_DURATION} s.` : ''}</small></div></div>
            <div className="mirage-rule"><span className="mirage-rule-icon is-green">▥</span><div><strong>Évite les obstacles hauts</strong><small>Contourne les cactus, les piles de caisses, les hautes bottes de paille, les cyprès en pot, les voitures de police d’Alger, les lanternes de pierre, les Xbox des Remparts d’Ocre, les piliers Andon du Château de l’Infini ou les fûts de kérosène de Thunder Airbase : ils ne se sautent pas. Trois chocs et la ruée s’arrête.</small></div></div>
            <div className="mirage-rule"><span className="mirage-rule-icon is-gold">🟤</span><div><strong>Flaques de boue</strong><small>Des flaques de boue apparaissent par moments sur la piste : contourne-les ou saute par-dessus, sinon ta monture s’y embourbe et ralentit !</small></div></div>
            <div className="mirage-rule"><span className="mirage-rule-icon is-gold">✦</span><div><strong>Déclenche l’Écho</strong><small>Le multiplicateur grimpe tous les 5 cristaux. Cinq prises consécutives sans choc déclenchent un « Hey-haa ! » aigu (son activé).</small></div></div>
            <div className="mirage-rule"><span className="mirage-rule-icon is-gold">●</span><div><strong>Pièces d’or</strong><small>Chaque victoire (1ᵉʳ d’un duel, d’une course de coupe ou d’un salon) rapporte {WIN_COINS} OR. Dépense-les dans la boutique : Gyro Zeppeli coûte 200 OR ; Cloud et son chocobo sont offerts temporairement (280 OR habituellement).</small></div></div>
            <div className="mirage-score-tip"><span>ASTUCE</span> Les blocs violets (désert), les clôtures (western), les bottes basses (plaine), les tonneaux (Costa Omertà), les balustrades blanches (Alger), les barrières de bambou (Yōtei), les murets du Mid (Remparts d’Ocre), les paravents shōji (Château de l’Infini) et les barrières de piste (Thunder Airbase) occupent deux voies. Saute pour les franchir et attraper l’or au-dessus ! Si des obstacles ferment les deux autres voies {trackLanes > 3 ? 'Si des obstacles ferment les deux autres voies' : 'Si un obstacle ferme la dernière voie'}, le saut est obligatoire.</div>
              </section>

              <div className="mirage-community-note"><span>✧</span><p>Un même désert, un même défi. <strong>Le sommet du classement t’attend.</strong></p></div>
            </div>
          </section>
        </aside>
      </div>
      <footer className="mirage-page-footer wrap"><Link to="/jeu">← Retour aux jeux</Link><span>LET’S PLAY ARCADE <i>·</i> MIRAGE RUSH — ALGERIA</span></footer>
    </div>
  );
}
