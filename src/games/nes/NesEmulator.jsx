import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useMediaQuery from '../../lib/useMediaQuery';
import TouchPad from './TouchPad';
import {
  NesEngine,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  describeRomError,
  isNesRom,
  romFingerprint,
} from './nesEngine';
import {
  deleteRom,
  getRom,
  getSram,
  getState,
  listRoms,
  putRom,
  putSram,
  putState,
} from './romLibrary';
import './nes-emulator.css';

const BASE = import.meta.env.BASE_URL;
const MAX_ROM_BYTES = 4 * 1024 * 1024; // la plus grosse cartouche NES fait ~1 Mo
const VOLUME_KEY = 'lets-play-nes-volume';
const DEMO = {
  name: 'Concentration Room',
  url: `${BASE}roms/concentration-room/croom.nes`,
  notice: `${BASE}roms/concentration-room/README.html`,
};

function formatSize(bytes) {
  if (!bytes) return '—';
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} Mo` : `${Math.round(bytes / 1024)} Ko`;
}

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function cleanName(fileName) {
  return String(fileName || 'ROM').replace(/\.(nes|unf|unif)$/i, '').replace(/[_]+/g, ' ').trim() || 'ROM';
}

function readStoredVolume() {
  try {
    const raw = window.localStorage.getItem(VOLUME_KEY);
    const value = raw === null ? 0.7 : Number(raw);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.7;
  } catch {
    return 0.7;
  }
}

export default function NesEmulator() {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const fileInputRef = useRef(null);
  const engineRef = useRef(null);
  const romRef = useRef(null);
  const sramTimer = useRef(0);
  const autoPaused = useRef(false);
  const noticeTimer = useRef(0);

  const [rom, setRom] = useState(null);
  const [status, setStatus] = useState({ running: false, paused: false, fps: 0, hasBattery: false });
  const [library, setLibrary] = useState([]);
  const [storageOk, setStorageOk] = useState(true);
  const [savedState, setSavedState] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [volume, setVolume] = useState(readStoredVolume);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const coarsePointer = useMediaQuery('(pointer: coarse)');
  const [touchPref, setTouchPref] = useState(null);
  const showTouch = touchPref ?? coarsePointer;

  const flash = useCallback((message) => {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 2400);
  }, []);

  const refreshLibrary = useCallback(async () => {
    try {
      setLibrary(await listRoms());
      setStorageOk(true);
    } catch {
      setStorageOk(false);
    }
  }, []);

  // Moteur : créé une fois, détruit en quittant la page (coupe le son).
  useEffect(() => {
    const engine = new NesEngine({
      canvas: canvasRef.current,
      onStatus: setStatus,
      onError: (err) => setError(describeRomError(err)),
      onSramChange: (sram) => {
        const current = romRef.current;
        if (!current) return;
        window.clearTimeout(sramTimer.current);
        const copy = sram.slice();
        sramTimer.current = window.setTimeout(() => {
          putSram(current.id, copy).catch(() => {});
        }, 700);
      },
    });
    engine.setVolume(readStoredVolume());
    engineRef.current = engine;
    refreshLibrary();
    return () => {
      window.clearTimeout(sramTimer.current);
      window.clearTimeout(noticeTimer.current);
      // Dernière écriture SRAM en attente : on la pousse avant de partir.
      if (romRef.current && engine.sram) putSram(romRef.current.id, engine.sram.slice()).catch(() => {});
      engine.destroy();
      engineRef.current = null;
    };
  }, [refreshLibrary]);

  useEffect(() => {
    engineRef.current?.setVolume(volume);
    try { window.localStorage.setItem(VOLUME_KEY, String(volume)); } catch { /* stockage plein */ }
  }, [volume]);

  useEffect(() => {
    engineRef.current?.setMuted(muted);
  }, [muted]);

  // Onglet masqué → pause ; retour → reprise si c'est nous qui avions mis pause.
  useEffect(() => {
    const onVisibility = () => {
      const engine = engineRef.current;
      if (!engine?.running) return;
      if (document.hidden && !engine.paused) {
        autoPaused.current = true;
        engine.setPaused(true);
      } else if (!document.hidden && autoPaused.current) {
        autoPaused.current = false;
        engine.setPaused(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const startRom = useCallback(async (bytes, name, { builtin = false } = {}) => {
    const engine = engineRef.current;
    if (!engine) return;
    setError('');
    if (bytes.byteLength > MAX_ROM_BYTES) {
      setError('Fichier trop volumineux pour une cartouche NES (4 Mo maximum).');
      return;
    }
    const data = new Uint8Array(bytes);
    if (!isNesRom(data)) {
      setError('Ce fichier n’est pas une ROM NES valide (format iNES .nes attendu).');
      return;
    }
    const id = romFingerprint(data);
    const sram = await getSram(id).catch(() => null);
    try {
      engine.loadRom(data, { sram });
    } catch (err) {
      setError(describeRomError(err));
      return;
    }
    autoPaused.current = false;
    const meta = { id, name, size: data.byteLength, builtin };
    romRef.current = meta;
    setRom(meta);
    setSavedState(null);
    getState(id).then((state) => {
      if (romRef.current?.id === id) setSavedState(state ? { savedAt: state.savedAt, thumbnail: state.thumbnail } : null);
    }).catch(() => {});
    putRom({ id, name, data, builtin }).then(refreshLibrary).catch(() => setStorageOk(false));
    stageRef.current?.focus({ preventScroll: true });
  }, [refreshLibrary]);

  const primeAudio = () => {
    // Le clic courant est un « geste utilisateur » : c'est le seul moment où
    // le navigateur accepte d'allumer le son sans condition.
    const engine = engineRef.current;
    if (!engine) return;
    engine.ensureAudioContext();
    engine.audioCtx?.resume?.().catch(() => {});
  };

  const openFile = async (file) => {
    if (!file) return;
    setLoading(true);
    try {
      await startRom(await file.arrayBuffer(), cleanName(file.name));
    } catch {
      setError('Lecture du fichier impossible.');
    } finally {
      setLoading(false);
    }
  };

  const playDemo = async () => {
    primeAudio();
    setLoading(true);
    try {
      const response = await fetch(DEMO.url);
      if (!response.ok) throw new Error(String(response.status));
      await startRom(await response.arrayBuffer(), DEMO.name, { builtin: true });
    } catch {
      setError('Impossible de charger la démo pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  const playFromLibrary = async (entry) => {
    primeAudio();
    setLoading(true);
    try {
      const record = await getRom(entry.id);
      if (!record?.data) throw new Error('missing');
      await startRom(record.data, record.name, { builtin: record.builtin });
    } catch {
      setError('Cette ROM n’est plus disponible dans ta ludothèque.');
      refreshLibrary();
    } finally {
      setLoading(false);
    }
  };

  const removeFromLibrary = async (entry) => {
    if (!window.confirm(`Retirer « ${entry.name} » et ses sauvegardes de ta ludothèque ?`)) return;
    await deleteRom(entry.id).catch(() => {});
    refreshLibrary();
  };

  const togglePause = useCallback(() => {
    const engine = engineRef.current;
    if (!engine?.running) return;
    autoPaused.current = false;
    engine.setPaused(!engine.paused);
  }, []);

  const reset = () => {
    engineRef.current?.reset();
    setError('');
    flash('Console redémarrée');
  };

  const eject = () => {
    const engine = engineRef.current;
    if (romRef.current && engine?.sram) putSram(romRef.current.id, engine.sram.slice()).catch(() => {});
    engine?.eject();
    romRef.current = null;
    setRom(null);
    setSavedState(null);
    setError('');
  };

  const saveState = useCallback(async () => {
    const engine = engineRef.current;
    const current = romRef.current;
    if (!engine?.running || !current) return;
    try {
      const state = engine.saveState();
      const thumbnail = engine.screenshot(128);
      const record = await putState(current.id, state, thumbnail);
      setSavedState({ savedAt: record.savedAt, thumbnail });
      flash('Partie sauvegardée');
    } catch {
      flash('Sauvegarde impossible (stockage du navigateur indisponible)');
    }
  }, [flash]);

  const loadState = useCallback(async () => {
    const engine = engineRef.current;
    const current = romRef.current;
    if (!engine?.running || !current) return;
    try {
      const record = await getState(current.id);
      if (!record) { flash('Aucune sauvegarde pour ce jeu'); return; }
      engine.loadState(record.state);
      if (engine.paused) engine.setPaused(false);
      flash('Sauvegarde chargée');
    } catch {
      flash('Cette sauvegarde est illisible');
    }
  }, [flash]);

  // Plein écran : API native, sinon (iPhone) un plein écran « CSS ».
  const toggleFullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    const doc = document;
    const active = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (active) {
      (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
      return;
    }
    const request = el.requestFullscreen || el.webkitRequestFullscreen;
    if (request) {
      Promise.resolve(request.call(el)).catch(() => setFullscreen((value) => !value));
    } else {
      setFullscreen((value) => !value);
    }
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('nes-pseudo-fullscreen', fullscreen && !document.fullscreenElement && !document.webkitFullscreenElement);
    return () => document.documentElement.classList.remove('nes-pseudo-fullscreen');
  }, [fullscreen]);

  // Raccourcis de la page (hors manette) : P pause, F plein écran,
  // F2 sauvegarder, F4 charger.
  useEffect(() => {
    const onKey = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;
      if (!romRef.current) return;
      if (event.code === 'KeyP') { event.preventDefault(); togglePause(); }
      else if (event.code === 'KeyF') { event.preventDefault(); toggleFullscreen(); }
      else if (event.code === 'F2') { event.preventDefault(); saveState(); }
      else if (event.code === 'F4') { event.preventDefault(); loadState(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePause, toggleFullscreen, saveState, loadState]);

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) { primeAudio(); openFile(file); }
  };

  const hasRom = !!rom;
  const crashed = hasRom && !status.running;
  const statusLabel = !hasRom ? 'EN ATTENTE' : crashed ? 'ARRÊT' : status.paused ? 'PAUSE' : `${status.fps || 60} FPS`;
  const userRoms = library.filter((entry) => !entry.builtin);

  return (
    <main className="nes-page">
      <section className="nes-shell wrap">
        <div className="section-label"><span>GAME / RETRO</span><span>LET’S PLAY ARCADE</span></div>
        <Link className="nes-back" to="/games">← Tous les jeux</Link>

        <div className="nes-heading">
          <div>
            <p className="eyebrow"><span className="live-dot" /> ÉMULATEUR NES · 8-BIT</p>
            <h1>RETRO <em>NES.</em></h1>
            <p className="nes-intro">
              La console 8-bit de Nintendo, directement dans ton navigateur. Lance la démo ou glisse ta propre
              ROM <code>.nes</code> : le jeu tourne chez toi, aucun fichier n’est envoyé sur nos serveurs.
            </p>
          </div>
          <div className="nes-status-box">
            <span>STATUT</span>
            <strong className={hasRom && !status.paused && !crashed ? 'is-live' : ''}>{statusLabel}</strong>
            {rom && <em title={rom.name}>{rom.name}</em>}
          </div>
        </div>

        <div className="nes-layout">
          <div className="nes-main">
            <div
              ref={stageRef}
              className={`nes-stage${fullscreen ? ' is-fullscreen' : ''}${showTouch ? ' has-touch' : ''}${dragging ? ' is-dragging' : ''}`}
              tabIndex={-1}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
              onDrop={onDrop}
            >
              <div className="nes-screen">
                <canvas
                  ref={canvasRef}
                  width={SCREEN_WIDTH}
                  height={SCREEN_HEIGHT}
                  aria-label={rom ? `Écran NES : ${rom.name}` : 'Écran NES, aucune cartouche'}
                />
                <div className="nes-scanlines" aria-hidden="true" />

                {!hasRom && (
                  <div className="nes-overlay">
                    <p className="eyebrow"><span className="live-dot" /> INSÈRE UNE CARTOUCHE</p>
                    <h2>{dragging ? 'LÂCHE TA ROM ICI.' : 'PRÊT À JOUER ?'}</h2>
                    <p>Glisse un fichier <b>.nes</b> sur l’écran, choisis-le sur ton appareil, ou teste la démo gratuite.</p>
                    <div className="nes-overlay-actions">
                      <button className="button button-yellow" type="button" disabled={loading} onClick={playDemo}>
                        {loading ? 'CHARGEMENT…' : 'JOUER À LA DÉMO ↗'}
                      </button>
                      <button className="button button-ghost" type="button" disabled={loading} onClick={() => { primeAudio(); fileInputRef.current?.click(); }}>
                        CHARGER UNE ROM
                      </button>
                    </div>
                  </div>
                )}

                {hasRom && status.paused && !crashed && (
                  <button className="nes-overlay is-pause" type="button" onClick={togglePause}>
                    <p className="eyebrow">PAUSE</p>
                    <h2>REPRENDRE ▶</h2>
                    <p>Touche P, ou clique ici.</p>
                  </button>
                )}

                {notice && <div className="nes-toast" role="status">{notice}</div>}
              </div>

              {fullscreen && !showTouch && (
                <button type="button" className="nes-exit-fullscreen" onClick={toggleFullscreen}>QUITTER LE PLEIN ÉCRAN ✕</button>
              )}

              {showTouch && (
                <div className="nes-touch-wrap">
                  <TouchPad engineRef={engineRef} disabled={!hasRom || status.paused || crashed} />
                  {fullscreen && (
                    <div className="nes-touch-tools">
                      <button type="button" onClick={togglePause} disabled={!hasRom}>{status.paused ? '▶' : '❚❚'}</button>
                      <button type="button" onClick={saveState} disabled={!hasRom}>SAVE</button>
                      <button type="button" onClick={loadState} disabled={!hasRom || !savedState}>LOAD</button>
                      <button type="button" onClick={toggleFullscreen}>✕</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".nes,application/x-nes-rom,application/octet-stream"
              hidden
              onChange={(event) => { openFile(event.target.files?.[0]); event.target.value = ''; }}
            />

            {error && <p className="nes-error" role="alert">{error}</p>}

            <div
              className="nes-toolbar"
              role="toolbar"
              aria-label="Commandes de la console"
              // Après un clic, le focus revient à l'écran : sinon Espace ou
              // Entrée « recliqueraient » le bouton (Reset en pleine partie…).
              onClick={(event) => {
                if (event.target.closest('button')) stageRef.current?.focus({ preventScroll: true });
              }}
            >
              <button type="button" onClick={togglePause} disabled={!hasRom || crashed}>{status.paused ? '▶ REPRENDRE' : '❚❚ PAUSE'}</button>
              <button type="button" onClick={reset} disabled={!hasRom}>↻ RESET</button>
              <button type="button" onClick={saveState} disabled={!hasRom || crashed}>⤓ SAUVER</button>
              <button type="button" onClick={loadState} disabled={!hasRom || !savedState}>⤒ CHARGER</button>
              <button type="button" onClick={toggleFullscreen} disabled={!hasRom}>⛶ PLEIN ÉCRAN</button>
              <button type="button" onClick={() => { primeAudio(); fileInputRef.current?.click(); }}>＋ ROM</button>
              {hasRom && <button type="button" className="is-danger" onClick={eject}>⏏ ÉJECTER</button>}
              <label className="nes-volume">
                <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Activer le son' : 'Couper le son'}>
                  {muted || volume === 0 ? '🔇' : '🔊'}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  aria-label="Volume"
                  onChange={(event) => { setVolume(Number(event.target.value)); setMuted(false); }}
                />
              </label>
            </div>

            {savedState && (
              <p className="nes-save-info">
                {savedState.thumbnail && <img src={savedState.thumbnail} alt="" width="48" height="45" />}
                Dernière sauvegarde : {formatDate(savedState.savedAt)}
                {status.hasBattery && <span> · sauvegarde cartouche automatique</span>}
              </p>
            )}
            {!savedState && status.hasBattery && (
              <p className="nes-save-info">Cartouche à pile détectée : tes sauvegardes en jeu sont conservées automatiquement.</p>
            )}
          </div>

          <aside className="nes-side">
            <div className="nes-panel">
              <h3>Commandes</h3>
              <table className="nes-keys">
                <thead><tr><th>NES</th><th>Clavier</th><th>Manette</th></tr></thead>
                <tbody>
                  <tr><td>Croix</td><td><kbd>←</kbd><kbd>↑</kbd><kbd>→</kbd><kbd>↓</kbd></td><td>Croix / stick</td></tr>
                  <tr><td>A</td><td><kbd>C</kbd> ou <kbd>K</kbd></td><td>Bouton droit</td></tr>
                  <tr><td>B</td><td><kbd>X</kbd> ou <kbd>J</kbd></td><td>Bouton bas</td></tr>
                  <tr><td>Start</td><td><kbd>Entrée</kbd></td><td>Start / Options</td></tr>
                  <tr><td>Select</td><td><kbd>Maj</kbd></td><td>Select / Share</td></tr>
                </tbody>
              </table>
              <p className="nes-hint">
                <kbd>P</kbd> pause · <kbd>F</kbd> plein écran · <kbd>F2</kbd> sauver · <kbd>F4</kbd> charger.
                Branche une manette USB ou Bluetooth : elle est détectée dès le premier bouton (2 joueurs possibles).
              </p>
              <label className="nes-switch">
                <input type="checkbox" checked={showTouch} onChange={(event) => setTouchPref(event.target.checked)} />
                <span>Manette tactile à l’écran</span>
              </label>
            </div>

            <div className="nes-panel">
              <h3>Ma ludothèque</h3>
              <ul className="nes-library">
                <li className={rom?.builtin ? 'is-current' : ''}>
                  <button type="button" className="nes-lib-play" onClick={playDemo} disabled={loading}>
                    <b>{DEMO.name}</b>
                    <span>Démo · homebrew libre</span>
                  </button>
                </li>
                {userRoms.map((entry) => (
                  <li key={entry.id} className={rom?.id === entry.id ? 'is-current' : ''}>
                    <button type="button" className="nes-lib-play" onClick={() => playFromLibrary(entry)} disabled={loading}>
                      <b>{entry.name}</b>
                      <span>{formatSize(entry.size)} · {formatDate(entry.lastPlayed)}</span>
                    </button>
                    <button type="button" className="nes-lib-remove" aria-label={`Retirer ${entry.name}`} onClick={() => removeFromLibrary(entry)}>✕</button>
                  </li>
                ))}
              </ul>
              <p className="nes-hint">
                {storageOk
                  ? 'Tes ROMs et sauvegardes restent dans ce navigateur, sur cet appareil.'
                  : 'Stockage local indisponible (navigation privée ?) : les ROMs devront être rechargées à chaque visite.'}
              </p>
            </div>

            <div className="nes-panel nes-legal">
              <h3>Bon à savoir</h3>
              <p>
                L’émulation est légale, mais les jeux commerciaux restent protégés par le droit d’auteur : n’utilise
                que des copies de cartouches que tu possèdes ou des homebrews distribués librement. Let’s Play
                n’héberge ni ne fournit de ROM commerciale.
              </p>
              <p>
                Moteur : <a href="https://github.com/bfirsh/jsnes" target="_blank" rel="noreferrer">jsnes</a> (Apache 2.0).
                Démo : <a href={DEMO.notice} target="_blank" rel="noreferrer">Concentration Room</a> © 2010 Damian Yerrick,
                logiciel libre (GPL v3).
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
