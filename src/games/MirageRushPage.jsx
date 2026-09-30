import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import MirageWorld from './MirageWorld';
import MiragePowerIcon from './MiragePowerIcon';
import MirageOnline from './MirageOnline';
import { MirageStagePicker } from './MirageCoursePicker';
import { DesertGroove } from './arcadeAudio';
import { fetchMirageLeaderboard, mirageApiEnabled, submitMirageScore } from './mirageApi';
import { DUEL_DISTANCE, DUEL_SPEED_BONUS, SPEED_BOOST_DURATION, POWER_UPS, POWER_UP_CHARGE_COST, POWER_BOOST_DURATION, PISTOL_STUN_DURATION, GEM_RESPAWN_DELAY } from './mirageRules';
import { decodeChallenge, encodeChallenge } from './duelChallenge';
import { SKINS, applyRun, equipSkin, isSkinUnlocked, levelProgress, loadProgress, saveProgress, skinFor } from './mirageProgression';
import './mirage-rush.css';

const BEST_KEY = 'letsplay_mirage_rush_best_v1';
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

function formatTime(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  return `00:${String(safe).padStart(2, '0')}`;
}

function playerName(entry) {
  return entry?.username || entry?.display_name || 'Joueur';
}

export default function MirageRushPage() {
  const { user, isDemo } = useAuth();
  const [searchParams] = useSearchParams();
  const challengeCode = searchParams.get('duel');
  const initialModeParam = searchParams.get('mode');
  const challenge = useMemo(() => decodeChallenge(challengeCode), [challengeCode]);
  // Le terrain se choisit dans l’overlay d’intro (« 02 / ton terrain ») ;
  // un défi imposé verrouille le parcours sur la carte du défi.
  const [selectedStage, setSelectedStage] = useState(challenge?.stage || 'desert');
  const [selectedMode, setSelectedMode] = useState(
    initialModeParam === 'online' ? 'online' : challenge ? 'duel' : 'rush',
  );
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
  const stage = selectedMode === 'duel' && challenge ? challenge.stage || 'desert' : selectedStage;
  const [race, setRace] = useState({ mode: 'rush' });
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
  // Plein écran de la coquille de jeu (téléphone & app) — voir enterImmersive.
  const [immersive, setImmersive] = useState(false);
  const [powerToast, setPowerToast] = useState(null);
  const [fx, setFx] = useState('');
  const progressRef = useRef(progression);
  const actionsRef = useRef(null);
  const audioRef = useRef(null);
  const shellRef = useRef(null);
  const immersiveRef = useRef(false);
  const fxTimer = useRef(null);
  const toastTimer = useRef(null);
  const phaseRef = useRef(phase);
  const musicOnRef = useRef(musicOn);
  phaseRef.current = phase;
  musicOnRef.current = musicOn;
  const connected = Boolean(user?.id) && !isDemo;
  const backendEnabled = mirageApiEnabled();

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

  // ── Plein écran (téléphone & application) ──────────────────────────────
  // Sur mobile et dans l'APK, « LANCER » plonge la coquille de jeu en plein
  // écran : Fullscreen API quand la plateforme l'accepte (Chrome, mais aussi
  // la WebView de l'app grâce à son onShowCustomView existant → plein écran
  // système immersif), et en repli — iOS Safari, WebViews sans Fullscreen
  // API — une couche fixe posée sur tout l'écran (classe `is-immersive`).
  const enterImmersive = useCallback(() => {
    if (immersiveRef.current || typeof document === 'undefined') return;
    const shell = shellRef.current;
    if (!shell) return;
    const inApp = typeof window !== 'undefined' && Boolean(window.LetsPlayAndroid);
    const touchScreen = typeof window !== 'undefined'
      && Boolean(window.matchMedia?.('(pointer: coarse)').matches);
    if (!inApp && !touchScreen) return;
    immersiveRef.current = true;
    setImmersive(true);
    document.body.classList.add('mirage-immersive-lock');
    try {
      // Demande pendant le geste (clic « LANCER », Entrée pour rejouer) :
      // c'est la seule fenêtre où le navigateur l'accepte.
      const request = shell.requestFullscreen || shell.webkitRequestFullscreen;
      const done = request?.call(shell);
      done?.catch?.(() => {}); // refus → le repli CSS suffit
    } catch { /* repli CSS déjà en place */ }
  }, []);

  const exitImmersive = useCallback(() => {
    if (!immersiveRef.current || typeof document === 'undefined') return;
    immersiveRef.current = false;
    setImmersive(false);
    document.body.classList.remove('mirage-immersive-lock');
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      try {
        const done = (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
        done?.catch?.(() => {});
      } catch { /* rien à refermer */ }
    }
  }, []);

  // Sorties du plein écran : retour au choix de course, démontage de la page,
  // ou sortie « native » (bouton X / Échap du navigateur) — dans ce dernier
  // cas l'événement arrive après notre propre sortie, sans effet de bord.
  useEffect(() => {
    const onFullscreenChange = () => {
      if (immersiveRef.current && !document.fullscreenElement && !document.webkitFullscreenElement) {
        exitImmersive();
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      exitImmersive();
    };
  }, [exitImmersive]);

  // Dès que la page revient à l'intro (choix du mode, de la course, ou
  // annulation du compte à rebours), le plein écran se referme.
  useEffect(() => {
    if (phase === 'intro') exitImmersive();
  }, [phase, exitImmersive]);

  const startRun = useCallback(() => {
    // Clic « LANCER » / Entrée pour rejouer : on demande le plein écran
    // ici, synchronement dans le geste, sinon le navigateur le refuse.
    enterImmersive();
    audioRef.current?.setStage(stage);
    setRace({ mode: selectedMode, stage, challenge: selectedMode === 'duel' ? challenge : null });
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
  }, [stage, selectedMode, challenge, enterImmersive]);
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

  const cancelCountdown = useCallback(() => {
    setPhase('intro');
    setHud(EMPTY_HUD);
    audioRef.current?.stop();
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      const key = event.key.toLowerCase();
      const target = event.target?.tagName;
      const typing = target === 'INPUT' || target === 'TEXTAREA' || target === 'SELECT';
      if (typing) return;
      if (key === 'escape' || key === 'p') {
        if (phaseRef.current === 'playing') { event.preventDefault(); pauseGame(); }
        else if (phaseRef.current === 'paused') { event.preventDefault(); resumeGame(); }
        else if (phaseRef.current === 'countdown') { event.preventDefault(); cancelCountdown(); }
      }
      if ((key === 'enter' || key === 'r') && phaseRef.current === 'finished' && target !== 'BUTTON') {
        event.preventDefault();
        startRunRef.current?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pauseGame, resumeGame, cancelCountdown]);

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
    setSelectedMode(mode);
  }, []);

  const backToCoursePicker = () => {
    setPhase('intro');
    setHud(EMPTY_HUD);
    setJustFinished(null);
    setFx('');
    setPowerToast(null);
    audioRef.current?.stop();
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
  }, [backendEnabled, connected, refreshLeaderboard, recordProgress]);

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
  const activeSkin = skinFor(progression);
  const skinColors = activeSkin.colors;
  const chooseSkin = (skinId) => {
    const next = equipSkin(progressRef.current, skinId);
    progressRef.current = next;
    setProgression(next);
    saveProgress(next);
  };

  if (selectedMode === 'online') {
    return (
      <MirageOnline
        connected={connected}
        userId={user?.id}
        userName={currentUserName}
        initialStage={selectedStage}
        onRunFinish={recordProgress}
        onSelectMode={chooseMode}
        onBack={() => {
          setSelectedMode('rush');
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
            juste au-dessus du bouton de lancement. */}
        <div className="mirage-heading-right">
          <div className="mirage-heading-side">
            <span className="mirage-record-label">TON RECORD</span>
            <strong>{best.toLocaleString('fr-FR')} <small>PTS</small></strong>
            <span className="mirage-record-flare">✦ ÉCHO SOLAIRE ✦</span>
          </div>
        </div>
      </header>

      <div className="mirage-layout wrap">
        <section
          ref={shellRef}
          className={`mirage-game-shell${phase === 'playing' ? ' is-running' : ''}${immersive ? ' is-immersive' : ''}`}
          aria-label="Partie de Mirage Rush"
        >
          <div className="mirage-game-topbar">
            <div className="mirage-game-brand"><span className="mirage-brand-gem">◆</span><span>{stage === 'japan' ? 'ZONE 06 · PLAINES DE YŌTEI' : stage === 'alger' ? 'ZONE 05 · ALGER LA BLANCHE' : stage === 'sardinia' ? 'ZONE 04 · COSTA OMERTÀ' : stage === 'prairie' ? 'ZONE 03 · PLAINES D’OR' : stage === 'western' ? 'ZONE 02 · DUST CREEK' : 'ZONE 01 · DUNES DE L’ÉCHO'}</span></div>
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
            </div>
          </div>

          <div className={`mirage-viewport${fx ? ` ${fx}` : ''}${phase === 'playing' ? ' is-live' : ''}${phase === 'playing' && hud.powerBoostActive ? ' is-turbo' : ''}`}>
            <MirageWorld
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
              onCheer={() => audioRef.current?.cheer()}
              actionsRef={actionsRef}
              onPowerUp={(info) => {
                if (info?.action === 'used') {
                  if (info.type === 'shield') {
                    audioRef.current?.shieldGravity?.();
                    showPowerToast('🛡️ Bouclier activé automatiquement !');
                  } else if (info.type === 'lasso') {
                    audioRef.current?.lassoThrow?.();
                    showPowerToast('🪢 Lasso envoyé !');
                  } else if (info.type === 'pistol') {
                    audioRef.current?.gunshot();
                    showPowerToast('🔫 Tir de pistolet !');
                  } else if (info.type === 'boost') {
                    audioRef.current?.speedBoost?.();
                    showPowerToast(`⚡ Turbo activé automatiquement (${POWER_BOOST_DURATION}s) !`);
                  }
                } else if (info?.action === 'no_target') {
                  if (info.type === 'lasso') showPowerToast('🪢 Aucun cavalier devant toi !');
                  else if (info.type === 'pistol') showPowerToast('🔫 Aucun cavalier devant toi !');
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
                    showPowerToast('⚡ 🪢 LASSO PRÊT ! Appuie sur W / Z ou clique !');
                  } else if (info.type === 'pistol') {
                    showPowerToast('⚡ 🔫 PISTOLET PRÊT ! Appuie sur R ou clique !');
                  }
                }
              }}
              onLassoHit={(info) => {
                if (info?.target === 'rival') {
                  const rivalLabel = info.name || 'L’ombre';
                  showPowerToast(info.blocked ? `🛡️ ${rivalLabel} a bloqué ton lasso !` : `🪢 ${rivalLabel} est ralenti(e) !`);
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
                  showPowerToast(info.blocked ? `🛡️ ${rivalLabel} a arrêté ta balle avec son bouclier !` : `🔫 PAN ! ${rivalLabel} tombe de son cheval !`);
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
              onShield={() => {}}
            />
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
                        {hud.slowKind === 'mud' ? '🟤 BOUE · RALENTI' : <><MiragePowerIcon type={POWER_UPS.LASSO} className="mirage-chip-power-icon" /> RALENTI</>}
                      </i>
                    )}
                    {race.mode !== 'rush' && hud.stunned && <i className="mirage-chip is-slow"><MiragePowerIcon type={POWER_UPS.PISTOL} className="mirage-chip-power-icon" /> À TERRE</i>}
                  </span>
                </div>
                <div className="mirage-hud-center">
                  {race.mode === 'duel' ? <>
                    <div className="mirage-clock">
                      {Math.round(hud.distance || 0)}<small> / {DUEL_DISTANCE} m</small>
                      {hud.rank > 0 && <b className={`mirage-rank-badge${hud.rank === 1 ? ' is-lead' : ''}`}>{hud.rank === 1 ? '1ᵉʳ' : `${hud.rank}ᵉ`} / 4</b>}
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

            {/* Power-up Charging & Activation Bar (Duel Mode only) */}
            {phase === 'playing' && race.mode !== 'rush' && (
              <div
                className={`mirage-powerup-bar${((hud.shieldCharges || 0) > 0 || (hud.lassoCharges || 0) > 0 || (hud.pistolCharges || 0) > 0 || (hud.boostCharges || 0) > 0) ? ' has-ready' : ''}`}
                role="group"
                aria-label="Objets de puissance"
              >
                <div className="mirage-powerup-buttons-row">
                  <button
                    type="button"
                    className={`mirage-powerup-btn is-shield-btn${(hud.shieldCharges || 0) > 0 ? ' is-ready' : ''}`}
                    onClick={() => trigger('use_shield')}
                    disabled={(hud.shieldCharges || 0) <= 0}
                    title="Bouclier — Chargé par les diamants BLEUS, il s’active tout seul dès que la barre est pleine. Utiliser cet objet ne décharge pas les autres."
                  >
                    <div className="mirage-powerup-btn-top">
                      <MiragePowerIcon type={POWER_UPS.SHIELD} className="mirage-powerup-icon" />
                      <span className="mirage-powerup-gem-hint is-blue">◆ BLEU</span>
                      <span className="mirage-powerup-key">AUTO</span>
                    </div>
                    <div className="mirage-powerup-btn-name">
                      <span>Bouclier</span>
                      {(hud.shieldCharges || 0) > 0
                        ? <b className="mirage-powerup-badge is-ready">⚡ PRÊT !</b>
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
                    title="Lasso (W / Z) — Chargé par les diamants JAUNES. Cible uniquement devant toi. Utiliser cet objet ne décharge pas les autres."
                  >
                    <div className="mirage-powerup-btn-top">
                      <MiragePowerIcon type={POWER_UPS.LASSO} className="mirage-powerup-icon" />
                      <span className="mirage-powerup-gem-hint is-yellow">◆ JAUNE</span>
                      <span className="mirage-powerup-key">W / Z</span>
                    </div>
                    <div className="mirage-powerup-btn-name">
                      <span>Lasso</span>
                      {(hud.lassoCharges || 0) > 0
                        ? <b className="mirage-powerup-badge is-ready">⚡ PRÊT !</b>
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
                    title={`Turbo — Chargé par les diamants VERTS, il s’active tout seul dès que la barre est pleine : boost de vitesse pendant ${POWER_BOOST_DURATION}s. Utiliser cet objet ne décharge pas les autres.`}
                  >
                    <div className="mirage-powerup-btn-top">
                      <MiragePowerIcon type={POWER_UPS.BOOST} className="mirage-powerup-icon" />
                      <span className="mirage-powerup-gem-hint is-green">◆ VERT</span>
                      <span className="mirage-powerup-key">AUTO</span>
                    </div>
                    <div className="mirage-powerup-btn-name">
                      <span>Turbo</span>
                      {(hud.boostCharges || 0) > 0
                        ? <b className="mirage-powerup-badge is-ready">⚡ PRÊT !</b>
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
                    title={`Pistolet (R) — Chargé par les diamants ROUGES. Fait tomber la cible devant toi pendant ${PISTOL_STUN_DURATION}s. Utiliser cet objet ne décharge pas les autres.`}
                  >
                    <div className="mirage-powerup-btn-top">
                      <MiragePowerIcon type={POWER_UPS.PISTOL} className="mirage-powerup-icon" />
                      <span className="mirage-powerup-gem-hint is-red">◆ ROUGE</span>
                      <span className="mirage-powerup-key">R</span>
                    </div>
                    <div className="mirage-powerup-btn-name">
                      <span>Pistolet</span>
                      {(hud.pistolCharges || 0) > 0
                        ? <b className="mirage-powerup-badge is-ready">⚡ PRÊT !</b>
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
                <div className="mirage-overlay-kicker"><span>✦</span> {selectedMode === 'duel' ? `DUEL À 4 CAVALIERS · PREMIER À ${DUEL_DISTANCE} M` : 'RUÉE · 60 SECONDES · 3 VIES'} <span>✦</span></div>
                {countdown > 0
                  ? <div className="mirage-countdown-number" key={countdown}>{countdown}</div>
                  : <div className="mirage-countdown-go" key="go">GALOPE&nbsp;!</div>}
                <div className="mirage-overlay-hint">ÉCHAP POUR ANNULER</div>
              </div>
            )}

            {phase === 'intro' && (
              <div className="mirage-overlay mirage-intro-overlay">
                <div className="mirage-overlay-kicker"><span>✦</span> {selectedMode === 'duel' ? 'DUEL · PREMIER À 600 M' : 'RUÉE · 60 SECONDES'} <span>✦</span></div>
                <h2>{selectedMode === 'duel' ? 'À TOI DE' : 'LE SABLE'} <em>{selectedMode === 'duel' ? 'GALOPER.' : 'SE RÉVEILLE.'}</em></h2>
                {/* Le choix du mode est remis DANS LE JEU (overlay d'intro),
                    l'ancienne barre d'onglets de l'en-tête reste retirée :
                    trois cartes réutilisant le style du sélecteur d'origine.
                    Le terrain (« 02 / ton terrain ») se choisit juste en
                    dessous — cinq horizons — sauf si un défi impose son
                    parcours, auquel cas les cartes sont verrouillées. */}
                <div className="mirage-mode-section">
                  <div className="mirage-picker-label"><span>01 / TON MODE</span><span>À TOI DE JOUER</span></div>
                  <div className="mirage-mode-picker" role="group" aria-label="Mode de jeu Mirage">
                    {[
                      { id: 'rush', name: 'RUÉE', icon: '↯', tagline: 'Bats ton record', info: '60 secondes · 3 vies' },
                      { id: 'duel', name: 'DUEL', icon: '⚔', tagline: challenge ? `Défi de ${challenge.name}` : 'Devance ton rival', info: challenge ? 'Course fantôme · 600 m' : 'Face au PNJ · 600 m' },
                      { id: 'online', name: 'EN LIGNE', icon: '♞', tagline: 'Retrouve tes amis', info: 'Salon · 2 à 4 cavaliers' },
                    ].map(mode => <button type="button" key={mode.id} aria-pressed={selectedMode === mode.id} onClick={() => chooseMode(mode.id)}>
                      <span className="mirage-mode-symbol" aria-hidden="true">{mode.icon}</span>
                      <span className="mirage-mode-copy"><strong>{mode.name}</strong><span>{mode.tagline}</span><small>{mode.info}</small></span>
                      <span className="mirage-choice-dot" aria-hidden="true">{selectedMode === mode.id ? '✓' : ''}</span>
                    </button>)}
                  </div>
                </div>
                <div className="mirage-mode-section">
                  <MirageStagePicker
                    stage={stage}
                    setSelectedStage={setSelectedStage}
                    locked={selectedMode === 'duel' && Boolean(challenge)}
                  />
                </div>
                {selectedMode === 'duel' && challenge && <small>Stage imposé par le défi pour garder le même parcours.</small>}
                {challengeCode && !challenge && <p className="mirage-duel-warning">Lien de défi invalide. Tu peux quand même défier les 3 PNJ.</p>}
                <p>{selectedMode === 'duel' ? `Affronte ${challenge ? challenge.name + ' (course fantôme) ainsi que Sauge et Améthyste' : '3 cavaliers rivaux IA (L’Ombre, Sauge et Améthyste)'} sur les 4 voies. Les cristaux accélèrent ton cheval et chargent tes pouvoirs. Premier à ${DUEL_DISTANCE} m !` : stage === 'japan' ? 'Galope de nuit à travers les plaines d’argent vers le Mont Fuji illuminé par la lune : saute les palissades de bambou et contourne les lanternes de pierre sacrées au son du shamisen et des tambours taiko.' : stage === 'alger' ? 'Galope sur les boulevards d’Alger la Blanche : saute les balustrades de la corniche, contourne les voitures de police qui ferment le boulevard et fonce vers la baie bleue, entre immeubles haussmanniens, passants, voitures stationnées et musique chaâbi.' : stage === 'sardinia' ? 'Galope sous le soleil de la Costa Omertà, entre terrasses animées et mer turquoise : saute les tonneaux du port et contourne les cyprès en pot.' : stage === 'prairie' ? 'Galope vers le soleil couchant ! Saute les bottes de paille basses et contourne les piles hautes, entre herbes dorées et champs de blé.' : stage === 'western' ? 'Contourne les caisses empilées, saute les clôtures et fonce dans la rue de Dust Creek !' : 'Esquive les cactus, saute les blocs et attrape les fragments solaires. Chaque cristal nourrit ton combo et ton score.'}</p>
                <button type="button" className="mirage-start-button" onClick={startRun} disabled={!ready}>
                  {ready ? selectedMode === 'duel' ? 'LANCER LE DUEL' : 'LANCER LA PARTIE' : 'CHARGEMENT DU PARCOURS…'} <span>↗</span>
                </button>
                <div className="mirage-keys-hint" aria-label="Commandes clavier">
                  <span><kbd>←</kbd><kbd>→</kbd> esquiver</span>
                  <span><kbd>↑</kbd> sauter</span>
                  {selectedMode === 'duel' && <>
                    <span><kbd>AUTO</kbd> <MiragePowerIcon type={POWER_UPS.SHIELD} className="mirage-key-power-icon" /> Bouclier</span>
                    <span><kbd>W/Z</kbd> <MiragePowerIcon type={POWER_UPS.LASSO} className="mirage-key-power-icon" /> Lasso</span>
                    <span><kbd>AUTO</kbd> <MiragePowerIcon type={POWER_UPS.BOOST} className="mirage-key-power-icon" /> Turbo</span>
                    <span><kbd>R</kbd> <MiragePowerIcon type={POWER_UPS.PISTOL} className="mirage-key-power-icon" /> Pistolet</span>
                  </>}
                  <span><kbd>ÉCHAP</kbd> pause</span>
                </div>
                <div className="mirage-overlay-hint">{selectedMode === 'duel' ? `4 CAVALIERS · DÉPART → ${DUEL_DISTANCE} M · LE PLUS RAPIDE GAGNE` : '60 SECONDES · 3 VIES · MULTIPLICATEUR DE COMBO · RECORD À BATTRE'}</div>
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
                <div className="mirage-result-actions">
                  <button type="button" className="mirage-start-button" onClick={resumeGame}>REPRENDRE <span>▶</span></button>
                  <button type="button" className="mirage-share-button" onClick={backToCoursePicker}>← QUITTER LA COURSE</button>
                </div>
                <div className="mirage-overlay-hint">ÉCHAP POUR REPRENDRE</div>
              </div>
            )}

            {phase === 'finished' && justFinished?.mode === 'duel' && (
              <div className="mirage-overlay mirage-result-overlay">
                <div className="mirage-overlay-kicker"><span>✦</span> ARRIVÉE · DUEL ({justFinished.rank === 1 ? '1ᵉʳ' : `${justFinished.rank || 2}ᵉ`} / {justFinished.totalRiders || 4}) <span>✦</span></div>
                <h2>{justFinished.won ? 'VICTOIRE' : 'UN RIVAL'} <em>{justFinished.won ? 'DU CAVALIER !' : 'L’EMPORTE.'}</em></h2>
                <div className="mirage-final-score">{justFinished.duration.toFixed(1)} <small>SECONDES</small></div>
                <div className="mirage-result-stats">
                  {(justFinished.rivals?.length ? justFinished.rivals : [{ name: justFinished.rivalName, duration: justFinished.rivalDuration, distance: justFinished.rivalDistance }]).map((r, i) => (
                    <span key={r.id || i}>{r.name} : {r.duration == null ? `${r.distance} m` : `${r.duration.toFixed(1)} s`}</span>
                  ))}
                  <span>◆ {justFinished.gems} cristaux · {justFinished.score.toLocaleString('fr-FR')} pts</span>
                </div>
                {award && <p className="mirage-xp-award" role="status"><strong>+{award.xpGained} XP</strong>{award.leveledUp && <span>NIVEAU {award.level} !</span>}{award.unlocked.length > 0 && <em>SKIN DÉBLOQUÉ : {award.unlocked.map(skin => skin.name).join(' · ')}</em>}</p>}
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
                {award && <p className="mirage-xp-award" role="status"><strong>+{award.xpGained} XP</strong>{award.leveledUp && <span>NIVEAU {award.level} !</span>}{award.unlocked.length > 0 && <em>SKIN DÉBLOQUÉ : {award.unlocked.map(skin => skin.name).join(' · ')}</em>}</p>}
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

          <div className="mirage-mobile-controls" aria-label="Commandes tactiles">
            <button type="button" onClick={() => trigger('left')} aria-label="Aller à gauche">←</button>
            <button type="button" className="mirage-jump-control" onClick={() => trigger('jump')} aria-label="Sauter">SAUT <span>↑</span></button>
            <button type="button" onClick={() => trigger('right')} aria-label="Aller à droite">→</button>
          </div>
          <div className="mirage-game-foot"><span className="mirage-foot-touch">MOBILE : GLISSE ← → POUR CHANGER DE VOIE <b>·</b> GLISSE ↑ OU TAPE POUR SAUTER</span><span>TOUCHES DIRECTIONNELLES / FLÈCHES <b>·</b> SAUT (ESPACE/↑){race.mode === 'duel' ? <> <b>·</b> POUVOIRS (QWER / AZER)</> : ''}</span><span>{race.mode === 'duel' ? 'DUEL : CRISTAUX = VITESSE & CHARGE D’OBJETS' : 'UN RUN = UN RECORD · PAS DE PAY-TO-WIN'}</span></div>
        </section>

        <aside className="mirage-side-panel">
          <section className="mirage-leaderboard panel-frame">
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

          <section className="mirage-progression panel-frame">
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
                    Prochain skin au niveau {SKINS.find(skin => skin.level > levelInfo.level)?.level ?? levelInfo.next} —{' '}
                    {SKINS.find(skin => skin.level > levelInfo.level)?.name ?? 'sagesse du désert'}.
                  </>
                : 'Tous les skins sont débloqués. Le désert te salue, cavalier.'}
              {progression.runs > 0 && <> · {progression.runs} course{progression.runs > 1 ? 's' : ''} jouée{progression.runs > 1 ? 's' : ''}.</>}
            </p>
            <div className="mirage-skin-picker" role="group" aria-label="Skins du cavalier">
              {SKINS.map(skin => {
                const unlocked = isSkinUnlocked(skin, levelInfo.level);
                const selected = skin.id === activeSkin.id;
                return (
                  <button
                    type="button"
                    key={skin.id}
                    className={`mirage-skin-chip${selected ? ' is-selected' : ''}${unlocked ? '' : ' is-locked'}`}
                    aria-pressed={selected}
                    disabled={!unlocked}
                    onClick={() => chooseSkin(skin.id)}
                    title={unlocked ? skin.hint : `Débloqué au niveau ${skin.level}`}
                  >
                    <span className="mirage-skin-dye" aria-hidden="true" style={{ '--dye-coat': `#${skin.colors[0].toString(16).padStart(6, '0')}`, '--dye-cloth': `#${skin.colors[2].toString(16).padStart(6, '0')}`, '--dye-trim': `#${skin.colors[3].toString(16).padStart(6, '0')}` }} />
                    <span className="mirage-skin-name">{skin.name}</span>
                    <small>{selected ? 'ÉQUIPÉ' : unlocked ? skin.hint : `NIV. ${skin.level}`}</small>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mirage-howto panel-frame">
            <span className="mirage-panel-kicker">MODE DUEL · 4 CAVALIERS · PREMIER À {DUEL_DISTANCE} M</span>
            <div className="mirage-rule"><span className="mirage-rule-icon is-gold">⚔</span><div><strong>Trois cavaliers rivaux</strong><small>Défie L’Ombre, Sauge et Améthyste : 3 PNJ qui changent de voie, sautent, ramassent les diamants et utilisent leurs propres pouvoirs contre toi et entre eux !</small></div></div>
            <div className="mirage-rule"><span className="mirage-rule-icon is-red">◆</span><div><strong>Même boost de vitesse & réapparition ({GEM_RESPAWN_DELAY} s)</strong><small>Tous les diamants donnent le même boost de vitesse (+{DUEL_SPEED_BONUS[0]} m/s pendant {SPEED_BOOST_DURATION} s). Un diamant pris disparaît seulement pendant {GEM_RESPAWN_DELAY} s puis réapparaît !</small></div></div>
            <div className="mirage-rule">
              <MiragePowerIcon type={POWER_UPS.LASSO} decorative={false} className="mirage-rule-image" />
              <div>
                <strong>1 couleur de diamant = 1 pouvoir (Duel & En ligne)</strong>
                <small>Les diamants <b>bleus</b> chargent le <b>Bouclier</b> et les <b>verts</b> le <b>Turbo</b> : ces deux-là partent tout seuls dès que la barre est pleine (bouclier 5s, boost de vitesse pendant {POWER_BOOST_DURATION}s). Les <b>jaunes</b> chargent le <b>Lasso</b> (W/Z : cible devant toi) et les <b>rouges</b> le <b>Pistolet</b> (R : fait tomber la cible devant toi pendant {PISTOL_STUN_DURATION}s), à déclencher à la main. Utiliser un objet ne décharge pas les autres !</small>
                <div className="mirage-rule-powers-grid" aria-label="Les 4 objets spéciaux">
                  <span className="mirage-rule-power-pill is-blue"><MiragePowerIcon type={POWER_UPS.SHIELD} className="mirage-rule-pill-icon" /><b>Bouclier</b><i>AUTO</i></span>
                  <span className="mirage-rule-power-pill is-yellow"><MiragePowerIcon type={POWER_UPS.LASSO} className="mirage-rule-pill-icon" /><b>Lasso</b><i>W/Z</i></span>
                  <span className="mirage-rule-power-pill is-green"><MiragePowerIcon type={POWER_UPS.BOOST} className="mirage-rule-pill-icon" /><b>Turbo</b><i>AUTO</i></span>
                  <span className="mirage-rule-power-pill is-red"><MiragePowerIcon type={POWER_UPS.PISTOL} className="mirage-rule-pill-icon" /><b>Pistolet</b><i>R</i></span>
                </div>
              </div>
            </div>
            <div className="mirage-rule"><span className="mirage-rule-icon is-green">▥</span><div><strong>Collision</strong><small>Pas de vies perdues en duel : le cheval ralentit puis reprend son allure.</small></div></div>
          </section>
          <section className="mirage-howto panel-frame">
            <span className="mirage-panel-kicker">LES RÈGLES DU PARCOURS</span>
            <div className="mirage-rule"><span className="mirage-rule-icon is-red">◆</span><div><strong>Ramasse les fragments</strong><small>Cyan : 100 pts · Rouge : 150 pts · Vert : 200 pts · Or : 250 pts, avant multiplicateur.</small></div></div>
            <div className="mirage-rule"><MiragePowerIcon type={POWER_UPS.SHIELD} decorative={false} className="mirage-rule-image" /><div><strong>Pouvoirs en Duel & En ligne</strong><small>Chaque couleur de diamant charge son pouvoir dédié (Bleu = Bouclier, Jaune = Lasso W/Z, Vert = Turbo, Rouge = Pistolet R). Bouclier et Turbo partent tout seuls dès que leur barre est pleine ; Lasso et Pistolet se déclenchent à la main.</small></div></div>
            <div className="mirage-rule"><span className="mirage-rule-icon is-green">▥</span><div><strong>Évite les obstacles hauts</strong><small>Contourne les cactus, les piles de caisses, les hautes bottes de paille, les cyprès en pot, les voitures de police d’Alger ou les lanternes de pierre : ils ne se sautent pas. Trois chocs et la ruée s’arrête.</small></div></div>
            <div className="mirage-rule"><span className="mirage-rule-icon is-gold">🟤</span><div><strong>Flaques de boue</strong><small>Des flaques de boue apparaissent par moments sur la piste : contourne-les ou saute par-dessus, sinon ta monture s’y embourbe et ralentit !</small></div></div>
            <div className="mirage-rule"><span className="mirage-rule-icon is-gold">✦</span><div><strong>Déclenche l’Écho</strong><small>Le multiplicateur grimpe tous les 5 cristaux. Cinq prises consécutives sans choc déclenchent un « Hey-haa ! » aigu (son activé).</small></div></div>
            <div className="mirage-score-tip"><span>ASTUCE</span> Les blocs violets (désert), les clôtures (western), les bottes basses (plaine), les tonneaux (Costa Omertà), les balustrades blanches (Alger) et les barrières de bambou (Yōtei) occupent deux voies. Saute pour les franchir et attraper l’or au-dessus ! Si des obstacles ferment les deux autres voies, le saut est obligatoire.</div>
          </section>

          <div className="mirage-community-note"><span>✧</span><p>Un même désert, un même défi. <strong>Le sommet du classement t’attend.</strong></p></div>
        </aside>
      </div>
      <footer className="mirage-page-footer wrap"><Link to="/jeu">← Retour aux jeux</Link><span>LET’S PLAY ARCADE <i>·</i> MIRAGE RUSH — ALGERIA</span></footer>
    </div>
  );
}
