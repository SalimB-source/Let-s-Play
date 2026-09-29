import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import MirageWorld from './MirageWorld';
import MirageOnline from './MirageOnline';
import MirageCoursePicker from './MirageCoursePicker';
import { DesertGroove } from './arcadeAudio';
import { fetchMirageLeaderboard, mirageApiEnabled, submitMirageScore } from './mirageApi';
import { DUEL_DISTANCE, DUEL_SPEED_BONUS, SPEED_BOOST_DURATION, powerUpOdds, GEM_TRAP_CHANCE, GEM_TRAP_SLOW_DURATION } from './mirageRules';
import { decodeChallenge, encodeChallenge } from './duelChallenge';
import { SKINS, applyRun, equipSkin, isSkinUnlocked, levelProgress, loadProgress, saveProgress, skinFor } from './mirageProgression';
import './mirage-rush.css';

const BEST_KEY = 'letsplay_mirage_rush_best_v1';
const EMPTY_HUD = { score: 0, gems: 0, combo: 0, multiplier: '1.0', lives: 3, remaining: 60 };

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
  const [selectedStage, setSelectedStage] = useState(challenge?.stage || 'desert');
  const [selectedMode, setSelectedMode] = useState(
    initialModeParam === 'online' ? 'online' : challenge ? 'duel' : 'rush',
  );
  // Étape 1 : choisir le mode (ruée/duel/en ligne). Étape 2 seulement : le terrain.
  // Un lien de défi impose déjà le duel, donc le terrain est directement visible (verrouillé).
  const [modeChosen, setModeChosen] = useState(Boolean(challenge));
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
  // intro → countdown → playing ⇄ paused → finished
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
  const [powerToast, setPowerToast] = useState(null);
  const [fx, setFx] = useState('');
  const progressRef = useRef(progression);
  const actionsRef = useRef(null);
  const audioRef = useRef(null);
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

  // ── Run lifecycle ─────────────────────────────────────────────────
  const startRun = useCallback(() => {
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
  }, [stage, selectedMode, challenge]);
  const startRunRef = useRef(startRun);
  startRunRef.current = startRun;

  // The 3-2-1 drum roll, then the desert takes over.
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

  // Échap / P: pause, resume or cancel the countdown. Enter rejoue une fois fini.
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

  // Leaving the tab mid-run should never cost a life: auto-pause.
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
    // Le choix du mode débloque l'étape suivante : le terrain.
    setModeChosen(true);
  }, []);

  const backToCoursePicker = () => {
    setPhase('intro');
    setHud(EMPTY_HUD);
    setJustFinished(null);
    setFx('');
    setPowerToast(null);
    audioRef.current?.stop();
  };

  // Shared by every mode (rush, duel and online) so one finished run always
  // feeds the same local progression.
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

  // ── Instant feedback: hit flash & golden glow ─────────────────────
  const flashFx = useCallback((name) => {
    window.clearTimeout(fxTimer.current);
    setFx(name);
    fxTimer.current = window.setTimeout(() => setFx(''), name === 'is-hit' ? 520 : 400);
  }, []);

  // One toast at a time, always cleared on unmount.
  const showPowerToast = useCallback((text) => {
    window.clearTimeout(toastTimer.current);
    setPowerToast(text);
    toastTimer.current = window.setTimeout(() => setPowerToast(null), 2400);
  }, []);

  // Commandes tactiles : le glissement est lu directement sur le canvas par
  // MirageWorld (src/games/mirageTouch.js), donc la ruée, le duel et les rooms
  // en ligne partagent exactement le même geste — et il est reconnu pendant le
  // mouvement, pas seulement au relâchement du doigt.

  const timePercent = useMemo(() => Math.max(0, Math.min(100, (hud.remaining / 60) * 100)), [hud.remaining]);
  const duelPercent = Math.min(100, Math.max(0, (hud.distance || 0) / DUEL_DISTANCE * 100));
  const rivalPercent = Math.min(100, Math.max(0, (hud.rivalDistance || 0) / DUEL_DISTANCE * 100));
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
          setModeChosen(false);
        }}
      />
    );
  }

  return (
    <div className="mirage-page">
      <header className="mirage-heading wrap">
        <div className="mirage-heading-copy">
          <div className="mirage-eyebrow"><span className="mirage-live-dot" /> LET’S PLAY ARCADE <span className="mirage-eyebrow-divider">/</span> 3D VOXEL RUNNER</div>
          <h1>MIRAGE <em>RUSH</em></h1>
          <p>Le désert se déforme. Les cristaux t’appellent. <strong>Choisis la ruée contre la montre, un duel ou une room en ligne.</strong></p>
          <Link className="mirage-back-link" to="/jeu">← RETOUR AUX JEUX</Link>
        </div>
        <div className="mirage-heading-right">
          <div className="mirage-mode-tabs" role="tablist" aria-label="Modes de jeu Mirage">
            <button
              type="button"
              role="tab"
              aria-selected={selectedMode === 'rush'}
              className={`mirage-mode-tab${selectedMode === 'rush' ? ' is-active' : ''}`}
              onClick={() => chooseMode('rush')}
            >
              <span>↯</span> RUÉE
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={selectedMode === 'duel'}
              className={`mirage-mode-tab${selectedMode === 'duel' ? ' is-active' : ''}`}
              onClick={() => chooseMode('duel')}
            >
              <span>⚔</span> DUEL
            </button>
            <button
              type="button"
              role="tab"
              className="mirage-mode-tab"
              onClick={() => chooseMode('online')}
            >
              <span>♞</span> EN LIGNE
            </button>
          </div>
          <div className="mirage-heading-side">
            <span className="mirage-record-label">TON RECORD</span>
            <strong>{best.toLocaleString('fr-FR')} <small>PTS</small></strong>
            <span className="mirage-record-flare">✦ ÉCHO SOLAIRE ✦</span>
          </div>
        </div>
      </header>

      <div className="mirage-layout wrap">
        <section className={`mirage-game-shell${phase === 'playing' ? ' is-running' : ''}`} aria-label="Partie de Mirage Rush">
          <div className="mirage-game-topbar">
            <div className="mirage-game-brand"><span className="mirage-brand-gem">◆</span><span>{stage === 'sardinia' ? 'ZONE 04 · COSTA OMERTÀ' : stage === 'prairie' ? 'ZONE 03 · PLAINES D’OR' : stage === 'western' ? 'ZONE 02 · DUST CREEK' : 'ZONE 01 · DUNES DE L’ÉCHO'}</span></div>
            <div className="mirage-game-controls-top">
              {phase === 'playing' && <>
                <span className="mirage-live-pill"><i /> EN PARTIE</span>
                <button type="button" className="mirage-pause-button" onClick={pauseGame} aria-label="Mettre la partie en pause">❚❚ PAUSE</button>
                <button type="button" className="mirage-back-game-button" onClick={backToCoursePicker} aria-label="Retour au choix de course">← RETOUR</button>
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

          <div className={`mirage-viewport${fx ? ` ${fx}` : ''}${phase === 'playing' ? ' is-live' : ''}`}>
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
              onPickup={(tier, key, trapped) => {
                if (trapped) audioRef.current?.trap();
                else {
                  audioRef.current?.pickup(tier);
                  if (tier === 2) flashFx('is-glow');
                }
              }}
              onGemTrap={() => {
                flashFx('is-hit');
                showPowerToast('◆ DIAMANT PIÉGÉ ! Tu es ralenti…');
              }}
              onCheer={() => audioRef.current?.cheer()}
              actionsRef={actionsRef}
              onPowerUpPickup={(type) => {
                if (type === 'shield') showPowerToast('🛡️ Bouclier ramassé ! Protection 5s');
                else if (type === 'lasso') showPowerToast('🪢 Lasso ramassé ! Lancement auto…');
                if (type === 'pistol') audioRef.current?.gunshot();
                else audioRef.current?.pickup(2);
              }}
              onLassoHit={(info) => {
                if (info?.target === 'rival') {
                  showPowerToast(info.blocked ? '🛡️ L’ombre a bloqué ton lasso !' : '🪢 L’ombre est ralentie !');
                } else if (info?.target === 'player') {
                  showPowerToast(info.blocked ? '🛡️ Lasso bloqué par ton bouclier !' : '🪢 Touché par le lasso de l’ombre !');
                }
              }}
              onPistolHit={(info) => {
                if (info?.target === 'rival') {
                  showPowerToast(info.blocked ? '🛡️ L’ombre a arrêté ta balle avec son bouclier !' : '🔫 PAN ! L’ombre tombe de son cheval !');
                } else if (info?.target === null) {
                  showPowerToast('🔫 PAN ! Personne à portée…');
                } else if (info?.target === 'player') {
                  if (info.from === 'npc') audioRef.current?.gunshot();
                  if (!info.blocked) flashFx('is-hit');
                  showPowerToast(info.blocked ? '🛡️ Balle arrêtée par ton bouclier !' : '🔫 Touché ! Tu tombes de cheval…');
                }
              }}
              onShield={() => {}}
            />
            <div className="mirage-sun-glare" aria-hidden="true" />
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
                    {hud.shieldActive && <i className="mirage-chip is-shield">🛡️ {Math.ceil(hud.shieldLeft)}s</i>}
                    {hud.slowed && <i className="mirage-chip is-slow">{hud.slowKind === 'trap' ? '◆ PIÉGÉ' : '🪢 RALENTI'}</i>}
                    {hud.stunned && <i className="mirage-chip is-slow">🔫 À TERRE</i>}
                  </span>
                </div>
                <div className="mirage-hud-center">
                  {race.mode === 'duel' ? <>
                    <div className="mirage-clock">
                      {Math.round(hud.distance || 0)}<small> / {DUEL_DISTANCE} m</small>
                      {hud.rank > 0 && <b className={`mirage-rank-badge${hud.rank === 1 ? ' is-lead' : ''}`}>{hud.rank === 1 ? '1ᵉʳ' : '2ᵉ'}</b>}
                    </div>
                    <div className="mirage-race-track" aria-hidden="true">
                      <i style={{ width: `${duelPercent}%` }} />
                      <b className="mirage-race-dot is-rival" style={{ left: `${rivalPercent}%` }} />
                      <b className="mirage-race-dot is-you" style={{ left: `${duelPercent}%` }} />
                      <span className="mirage-race-flag">🏁</span>
                    </div>
                    <small className="mirage-duel-odds">OBJET « ? » · PISTOLET {Math.round(powerUpOdds(hud.rank || 1).pistol * 100)}% · LASSO {Math.round(powerUpOdds(hud.rank || 1).lasso * 100)}% · BOUCLIER {Math.round(powerUpOdds(hud.rank || 1).shield * 100)}%</small>
                  </> : <>
                    <div className={`mirage-clock${hud.remaining <= 10 ? ' is-danger' : hud.remaining <= 20 ? ' is-warning' : ''}`}>{formatTime(hud.remaining)}</div>
                    <div className="mirage-time-track"><i style={{ width: `${timePercent}%` }} /></div>
                  </>}
                </div>
                <div className="mirage-hud-card mirage-hud-streak">
                  {race.mode === 'duel' ? <>
                    <small>VITESSE{hud.boostLeft > 0 && <b> · BOOST</b>}</small>
                    <strong key={Math.round((hud.speed || 15) * 3.6)} className="mirage-score-pop">{Math.round((hud.speed || 15) * 3.6)} <small>KM/H</small></strong>
                    <span>{Math.round(hud.rivalDistance || 0)} m · {hud.rivalName}</span>
                  </> : <>
                    <small>COMBO <b>×{hud.multiplier}</b></small>
                    <strong key={hud.combo} className="mirage-score-pop">{hud.combo.toString().padStart(2, '0')}</strong>
                    <span className="mirage-lives" key={`lives-${hud.lives}`} aria-label={`${hud.lives} vies restantes`}>{'◆'.repeat(hud.lives)}<i>{'◆'.repeat(Math.max(0, 3 - hud.lives))}</i></span>
                  </>}
                </div>
              </div>
            )}

            {phase === 'countdown' && (
              <div className="mirage-overlay mirage-countdown-overlay" role="status" aria-live="assertive">
                <div className="mirage-overlay-kicker"><span>✦</span> {selectedMode === 'duel' ? `DUEL · PREMIER À ${DUEL_DISTANCE} M` : 'RUÉE · 60 SECONDES · 3 VIES'} <span>✦</span></div>
                {countdown > 0
                  ? <div className="mirage-countdown-number" key={countdown}>{countdown}</div>
                  : <div className="mirage-countdown-go" key="go">GALOPE&nbsp;!</div>}
                <div className="mirage-overlay-hint">ÉCHAP POUR ANNULER</div>
              </div>
            )}

            {phase === 'intro' && (
              <div className="mirage-overlay mirage-intro-overlay">
                <div className="mirage-overlay-kicker"><span>✦</span> CHOISIS TA COURSE <span>✦</span></div>
                <h2>{!modeChosen ? 'CHOISIS D’ABORD' : selectedMode === 'duel' ? 'À TOI DE' : 'LE SABLE'} <em>{!modeChosen ? 'TON MODE.' : selectedMode === 'duel' ? 'GALOPER.' : 'SE RÉVEILLE.'}</em></h2>
                <MirageCoursePicker selectedMode={selectedMode} setSelectedMode={chooseMode} stage={stage} setSelectedStage={setSelectedStage} challenge={challenge} modeChosen={modeChosen} />
                {selectedMode === 'duel' && challenge && <small>Stage imposé par le défi pour garder le même parcours.</small>}
                {challengeCode && !challenge && <p className="mirage-duel-warning">Lien de défi invalide. Tu peux quand même défier le PNJ.</p>}
                {modeChosen && <>
                  <p>{selectedMode === 'duel' ? `Affronte ${challenge ? challenge.name + ' (course fantôme)' : 'L’Ombre (PNJ)'}. Les cristaux accélèrent ton cheval ; les chocs le ralentissent. Premier à ${DUEL_DISTANCE} m !` : stage === 'sardinia' ? 'Galope entre les tonnelles de la Costa Omertà : saute les tonneaux de vin alignés sur le port et contourne les cyprès en pot, sous le regard du village.' : stage === 'prairie' ? 'Galope vers le soleil couchant ! Saute les bottes de paille basses et contourne les piles hautes, entre herbes dorées et champs de blé.' : stage === 'western' ? 'Contourne les caisses empilées, saute les clôtures et fonce dans la rue de Dust Creek !' : 'Esquive les cactus, saute les blocs et attrape les fragments solaires. Chaque cristal nourrit ton combo.'}</p>
                  <button type="button" className="mirage-start-button" onClick={startRun} disabled={!ready}>
                    {ready ? selectedMode === 'duel' ? 'LANCER LE DUEL' : 'LANCER LA PARTIE' : 'CHARGEMENT DU DÉSERT…'} <span>↗</span>
                  </button>
                  <div className="mirage-keys-hint" aria-label="Commandes clavier">
                    <span><kbd>←</kbd><kbd>→</kbd> esquiver</span>
                    <span><kbd>↑</kbd> sauter</span>
                    <span><kbd>ESPACE</kbd> sauter</span>
                    <span><kbd>ÉCHAP</kbd> pause</span>
                  </div>
                  <div className="mirage-overlay-hint">{selectedMode === 'duel' ? `DÉPART → ${DUEL_DISTANCE} M · LE PLUS RAPIDE GAGNE` : '60 SECONDES · 3 VIES · PISTE SANS OBJET « ? » · RECORD À BATTRE'}</div>
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
                <div className="mirage-result-actions">
                  <button type="button" className="mirage-start-button" onClick={resumeGame}>REPRENDRE <span>▶</span></button>
                  <button type="button" className="mirage-share-button" onClick={backToCoursePicker}>← QUITTER LA COURSE</button>
                </div>
                <div className="mirage-overlay-hint">ÉCHAP POUR REPRENDRE</div>
              </div>
            )}

            {phase === 'finished' && justFinished?.mode === 'duel' && (
              <div className="mirage-overlay mirage-result-overlay">
                <div className="mirage-overlay-kicker"><span>✦</span> ARRIVÉE · DUEL <span>✦</span></div>
                <h2>{justFinished.won ? 'VICTOIRE' : 'LE RIVAL'} <em>{justFinished.won ? 'DU CAVALIER !' : 'L’EMPORTE.'}</em></h2>
                <div className="mirage-final-score">{justFinished.duration.toFixed(1)} <small>SECONDES</small></div>
                <div className="mirage-result-stats"><span>{justFinished.rivalName} : {justFinished.rivalDuration == null ? `${justFinished.rivalDistance} m` : `${justFinished.rivalDuration.toFixed(1)} s`}</span><span>◆ {justFinished.gems} cristaux</span><span>{justFinished.score.toLocaleString('fr-FR')} pts</span></div>
                {award && <p className="mirage-xp-award" role="status"><strong>+{award.xpGained} XP</strong>{award.leveledUp && <span>NIVEAU {award.level} !</span>}{award.unlocked.length > 0 && <em>SKIN DÉBLOQUÉ : {award.unlocked.map(skin => skin.name).join(' · ')}</em>}</p>}
                <div className="mirage-result-actions">
                  <button type="button" className="mirage-start-button" onClick={startRun}>REJOUER <span>↗</span></button>
                  <button type="button" className="mirage-share-button" onClick={shareDuel}>PARTAGER UN DÉFI ↗</button>
                  <button type="button" className="mirage-share-button" onClick={backToCoursePicker}>← CHOISIR UNE COURSE</button>
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
                  <button type="button" className="mirage-share-button" onClick={backToCoursePicker}>← CHOISIR UNE COURSE</button>
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
                {/* Sur téléphone, le rappel des touches est remplacé par la
                    pastille « GLISSE ← → · ↑ » posée sur la piste. */}
                {hud.combo === 0 && hud.score === 0 && <span className="mirage-callout-keys">ESQUIVE ← → <b>SAUTE ↑</b></span>}
              </div>
            )}
          </div>

          <div className="mirage-mobile-controls" aria-label="Commandes tactiles">
            <button type="button" onClick={() => trigger('left')} aria-label="Aller à gauche">←</button>
            <button type="button" className="mirage-jump-control" onClick={() => trigger('jump')} aria-label="Sauter">SAUT <span>↑</span></button>
            <button type="button" onClick={() => trigger('right')} aria-label="Aller à droite">→</button>
          </div>
          <div className="mirage-game-foot"><span className="mirage-foot-touch">MOBILE : GLISSE ← → POUR CHANGER DE VOIE <b>·</b> GLISSE ↑ OU TAPE POUR SAUTER</span><span>ZQSD / WASD / FLÈCHES <b>·</b> ESPACE POUR SAUTER <b>·</b> ÉCHAP POUR LA PAUSE</span><span>{race.mode === 'duel' ? 'DUEL : CRISTAUX = VITESSE · CHOCS = RALENTISSEMENT' : 'UN RUN = UN RECORD · PAS DE PAY-TO-WIN'}</span></div>
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
            <span className="mirage-panel-kicker">MODE DUEL · PREMIER À 600 M</span>
            <div className="mirage-rule"><span className="mirage-rule-icon is-gold">⚔</span><div><strong>Un cavalier rival</strong><small>Défie L’Ombre : un PNJ qui change de voie, saute et te vole les diamants. Ou partage ton fantôme de course avec un autre joueur. Ce n’est pas du temps réel.</small></div></div>
            <div className="mirage-rule"><span className="mirage-rule-icon is-red">◆</span><div><strong>Bonus de vitesse</strong><small>Cyan +{DUEL_SPEED_BONUS[0]} · Rouge +{DUEL_SPEED_BONUS[1]} · Or +{DUEL_SPEED_BONUS[2]} m/s, pendant {SPEED_BOOST_DURATION} s seulement. Les boosts ne s’accumulent pas : un cristal remplace le boost en cours, et un choc l’annule.</small></div></div>
            <div className="mirage-rule"><span className="mirage-rule-icon is-green">▥</span><div><strong>Collision</strong><small>Pas de vies perdues en duel : le cheval ralentit puis reprend son allure.</small></div></div>
          </section>
          <section className="mirage-howto panel-frame">
            <span className="mirage-panel-kicker">LES RÈGLES DU PARCOURS</span>
            <div className="mirage-rule"><span className="mirage-rule-icon is-red">◆</span><div><strong>Ramasse les fragments</strong><small>Cyan : 100 pts · Rouge : 150 pts · Or : 250 pts, avant multiplicateur.</small></div></div>
            <div className="mirage-rule"><span className="mirage-rule-icon is-red">◆</span><div><strong>Tous les diamants peuvent être piégés</strong><small>{Math.round(GEM_TRAP_CHANCE * 100)} % de chances, quelle que soit la couleur — cyan, rouge ou or : au lieu du bonus de vitesse, le diamant te ralentit pendant {GEM_TRAP_SLOW_DURATION} s. Les points, eux, sont toujours encaissés. Rien ne le distingue avant de le traverser.</small></div></div>
            <div className="mirage-rule"><span className="mirage-rule-icon is-green">▥</span><div><strong>Évite les obstacles hauts</strong><small>Contourne les cactus, les piles de caisses, les hautes bottes de paille ou les cyprès en pot : ils ne se sautent pas. Trois chocs et la ruée s’arrête.</small></div></div>
            <div className="mirage-rule"><span className="mirage-rule-icon is-gold">✦</span><div><strong>Déclenche l’Écho</strong><small>Le multiplicateur grimpe tous les 5 cristaux. Cinq prises consécutives sans choc déclenchent un « Hey-haa ! » aigu (son activé).</small></div></div>
            <div className="mirage-rule"><span className="mirage-rule-icon is-rainbow" aria-hidden="true">?</span><div><strong>Objet mystère « ? » — duel & en ligne</strong><small>La ruée n’en contient aucun : il faut un rival à lasser ou un choc à absorber. En duel ou en ligne, il flotte en arc-en-ciel au milieu de la piste et ne dévoile son effet qu’une fois ramassé — pistolet (fait tomber de cheval le cavalier en tête, même très loin, pendant 1 s : 0 % en tête, 5 % 2e, 15 % 3e, 30 % 4e), lasso (ralentit l’adversaire devant toi) ou bouclier (absorbe un choc, un lasso ou une balle pendant 5 s). Il ne disparaît jamais quand quelqu’un le prend : chaque cavalier peut le ramasser.</small></div></div>
            <div className="mirage-score-tip"><span>ASTUCE</span> Les blocs violets (désert), les clôtures (western), les bottes basses (plaine) et les tonneaux (Costa Omertà) occupent deux voies. Saute pour les franchir et attraper l’or au-dessus ! Si des obstacles ferment les deux autres voies, le saut est obligatoire.</div>
          </section>

          <div className="mirage-community-note"><span>✧</span><p>Un même désert, un même défi. <strong>Le sommet du classement t’attend.</strong></p></div>
        </aside>
      </div>
      <footer className="mirage-page-footer wrap"><Link to="/jeu">← Retour aux jeux</Link><span>LET’S PLAY ARCADE <i>·</i> MIRAGE RUSH — ALGERIA</span></footer>
    </div>
  );
}
