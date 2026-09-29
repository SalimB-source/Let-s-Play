import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import MirageWorld from './MirageWorld';
import { DesertGroove } from './arcadeAudio';
import { fetchMirageLeaderboard, mirageApiEnabled, submitMirageScore } from './mirageApi';
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
  const [phase, setPhase] = useState('intro');
  const [ready, setReady] = useState(false);
  const [hud, setHud] = useState(EMPTY_HUD);
  const [best, setBest] = useState(readBest);
  const [newRecord, setNewRecord] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [boardState, setBoardState] = useState('loading');
  const [submitState, setSubmitState] = useState('');
  const [justFinished, setJustFinished] = useState(null);
  const actionsRef = useRef(null);
  const audioRef = useRef(null);
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
    };
  }, [refreshLeaderboard]);

  const startRun = () => {
    setHud(EMPTY_HUD);
    setNewRecord(false);
    setJustFinished(null);
    setSubmitState('');
    setPhase('playing');
    if (musicOn) audioRef.current?.start();
  };

  const toggleMusic = () => {
    const next = !musicOn;
    setMusicOn(next);
    if (next && phase === 'playing') audioRef.current?.start();
    else audioRef.current?.stop();
  };

  const onFinish = useCallback(async (result) => {
    setHud((current) => ({ ...current, score: result.score, gems: result.gems, remaining: Math.max(0, 60 - result.duration) }));
    setJustFinished(result);
    setPhase('finished');
    audioRef.current?.stop();
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
  }, [backendEnabled, connected, refreshLeaderboard]);

  const onHud = useCallback((next) => setHud(next), []);
  const trigger = (name) => actionsRef.current?.(name);
  const timePercent = useMemo(() => Math.max(0, Math.min(100, (hud.remaining / 60) * 100)), [hud.remaining]);

  return (
    <div className="mirage-page">
      <header className="mirage-heading wrap">
        <div className="mirage-heading-copy">
          <div className="mirage-eyebrow"><span className="mirage-live-dot" /> LET’S PLAY ARCADE <span className="mirage-eyebrow-divider">/</span> 3D VOXEL RUNNER</div>
          <h1>MIRAGE <em>RUSH</em></h1>
          <p>Le désert se déforme. Les cristaux t’appellent. <strong>Tiens 60 secondes et fais exploser ton record.</strong></p>
        </div>
        <div className="mirage-heading-side">
          <span className="mirage-record-label">TON RECORD</span>
          <strong>{best.toLocaleString('fr-FR')} <small>PTS</small></strong>
          <span className="mirage-record-flare">✦ ÉCHO SOLAIRE ✦</span>
        </div>
      </header>

      <div className="mirage-layout wrap">
        <section className={`mirage-game-shell${phase === 'playing' ? ' is-running' : ''}`} aria-label="Partie de Mirage Rush">
          <div className="mirage-game-topbar">
            <div className="mirage-game-brand"><span className="mirage-brand-gem">◆</span><span>ZONE 01 <b>·</b> DUNES DE L’ÉCHO</span></div>
            <div className="mirage-game-controls-top">
              {phase === 'playing' && <span className="mirage-live-pill"><i /> EN PARTIE</span>}
              <button type="button" className={`mirage-sound-button${musicOn ? ' is-on' : ''}`} onClick={toggleMusic} aria-pressed={musicOn}>
                <span aria-hidden="true">{musicOn ? '♫' : '♪'}</span> {musicOn ? 'MUSIQUE ON' : 'SON COUPÉ'}
              </button>
            </div>
          </div>

          <div className="mirage-viewport">
            <MirageWorld
              active={phase === 'playing'}
              onReady={() => setReady(true)}
              onHud={onHud}
              onFinish={onFinish}
              onCrash={() => {}}
              actionsRef={actionsRef}
            />
            <div className="mirage-sun-glare" aria-hidden="true" />
            {phase === 'playing' && (
              <div className="mirage-hud" aria-live="polite">
                <div className="mirage-hud-card mirage-hud-score"><small>SCORE</small><strong>{hud.score.toLocaleString('fr-FR')}</strong><span>✦ {hud.gems} fragments</span></div>
                <div className="mirage-hud-center"><div className="mirage-clock">{formatTime(hud.remaining)}</div><div className="mirage-time-track"><i style={{ width: `${timePercent}%` }} /></div></div>
                <div className="mirage-hud-card mirage-hud-streak"><small>COMBO <b>×{hud.multiplier}</b></small><strong>{hud.combo.toString().padStart(2, '0')}</strong><span>{'◆'.repeat(hud.lives)}<i>{'◆'.repeat(3 - hud.lives)}</i></span></div>
              </div>
            )}

            {phase === 'intro' && (
              <div className="mirage-overlay mirage-intro-overlay">
                <div className="mirage-overlay-kicker"><span>✦</span> UNE COURSE CONTRE LE MIRAGE <span>✦</span></div>
                <h2>LE SABLE <em>SE RÉVEILLE.</em></h2>
                <p>Esquive les cactus, saute les blocs et attrape les fragments solaires. Chaque cristal nourrit ton combo.</p>
                <button type="button" className="mirage-start-button" onClick={startRun} disabled={!ready}>
                  {ready ? 'LANCER LA PARTIE' : 'CHARGEMENT DU DÉSERT…'} <span>↗</span>
                </button>
                <div className="mirage-overlay-hint">60 SECONDES <span>·</span> 3 VIES <span>·</span> RECORD À BATTRE</div>
              </div>
            )}

            {phase === 'finished' && (
              <div className="mirage-overlay mirage-result-overlay">
                <div className="mirage-overlay-kicker"><span>✦</span> {newRecord ? 'NOUVEAU RECORD PERSONNEL' : 'FIN DE LA RUÉE'} <span>✦</span></div>
                <h2>{newRecord ? 'LE MIRAGE' : 'LE SABLE'} <em>{newRecord ? 'EST À TOI.' : 'T’A RATTRAPÉ.'}</em></h2>
                <div className="mirage-final-score">{(justFinished?.score || 0).toLocaleString('fr-FR')} <small>PTS</small></div>
                <div className="mirage-result-stats"><span>◆ {justFinished?.gems || 0} fragments</span><span>◷ {justFinished?.duration || 0} s</span><span>RECORD {best.toLocaleString('fr-FR')}</span></div>
                <button type="button" className="mirage-start-button" onClick={startRun}>REJOUER <span>↗</span></button>
                {submitState === 'saving' && <p className="mirage-save-note">Envoi du score au classement…</p>}
                {submitState === 'saved' && <p className="mirage-save-note is-success">Score enregistré dans le classement du site.</p>}
                {submitState === 'login' && backendEnabled && <p className="mirage-save-note">Connecte-toi pour apparaître au classement <Link to="/auth">Connexion ↗</Link></p>}
                {submitState === 'unavailable' && <p className="mirage-save-note">Classement indisponible pour le moment — ton record local est conservé.</p>}
              </div>
            )}

            {phase === 'playing' && (
              <div className="mirage-live-callout" aria-hidden="true">
                {hud.combo >= 5 && <span>✦ ÉCHO SOLAIRE ×{hud.multiplier} ✦</span>}
                {hud.combo === 0 && hud.score === 0 && <span>ESQUIVE ← → <b>SAUTE ↑</b></span>}
              </div>
            )}
          </div>

          <div className="mirage-mobile-controls" aria-label="Commandes tactiles">
            <button type="button" onClick={() => trigger('left')} aria-label="Aller à gauche">←</button>
            <button type="button" className="mirage-jump-control" onClick={() => trigger('jump')} aria-label="Sauter">SAUT <span>↑</span></button>
            <button type="button" onClick={() => trigger('right')} aria-label="Aller à droite">→</button>
          </div>
          <div className="mirage-game-foot"><span>WASD / FLÈCHES <b>·</b> ESPACE POUR SAUTER</span><span>UN RUN = UN RECORD <b>·</b> PAS DE PAY-TO-WIN</span></div>
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
                    <span className="mirage-board-rank">{String(index + 1).padStart(2, '0')}</span>
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

          <section className="mirage-howto panel-frame">
            <span className="mirage-panel-kicker">LES RÈGLES DU DÉSERT</span>
            <div className="mirage-rule"><span className="mirage-rule-icon is-pink">◆</span><div><strong>Ramasse les fragments</strong><small>Chaque cristal augmente tes points et ton combo.</small></div></div>
            <div className="mirage-rule"><span className="mirage-rule-icon is-green">▥</span><div><strong>Évite les cactus</strong><small>Trois chocs et la ruée s’arrête.</small></div></div>
            <div className="mirage-rule"><span className="mirage-rule-icon is-gold">✦</span><div><strong>Déclenche l’Écho</strong><small>Le multiplicateur grimpe tous les 5 cristaux.</small></div></div>
            <div className="mirage-score-tip"><span>ASTUCE</span> Garde ton saut pour les blocs violets — une esquive bien timée vaut plus qu’un détour.</div>
          </section>

          <div className="mirage-community-note"><span>✧</span><p>Un même désert, un même défi. <strong>Le sommet du classement t’attend.</strong></p></div>
        </aside>
      </div>
      <footer className="mirage-page-footer wrap"><Link to="/quizz">← Retour aux quizz</Link><span>LET’S PLAY ARCADE <i>·</i> MIRAGE RUSH — ALGERIA</span></footer>
    </div>
  );
}
