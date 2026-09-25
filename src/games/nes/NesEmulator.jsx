import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useMediaQuery from '../../lib/useMediaQuery';
import TouchPad from './TouchPad';
import GameShelf from './GameShelf';
import { NES_CATALOG, findNesGame } from './catalog';
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

const MAX_ROM_BYTES = 4 * 1024 * 1024; // la plus grosse cartouche NES fait ~1 Mo
const VOLUME_KEY = 'lets-play-nes-volume';
const PAD_KEY = 'lets-play-nes-pad-player';
const FEATURED = NES_CATALOG[0];

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

function readStored(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : raw;
  } catch {
    return fallback;
  }
}

function readStoredVolume() {
  const value = Number(readStored(VOLUME_KEY, '0.7'));
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.7;
}

export default function NesEmulator() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const routeGame = slug ? findNesGame(slug) : null;

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
  const [loading, setLoading] = useState('');
  const [dragging, setDragging] = useState(false);
  const [volume, setVolume] = useState(readStoredVolume);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [padPlayer, setPadPlayer] = useState(() => (readStored(PAD_KEY, '1') === '2' ? 2 : 1));
  const coarsePointer = useMediaQuery('(pointer: coarse)');
  const [touchPref, setTouchPref] = useState(null);
  const showTouch = touchPref ?? coarsePointer;

  // Fiche affichée : le jeu de la borne en cours, sinon celui de l'URL.
  const currentGame = rom?.slug ? findNesGame(rom.slug) : null;
  const infoGame = currentGame || (!rom ? routeGame : null);

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
    engine.setPadFirstPlayer(readStored(PAD_KEY, '1') === '2' ? 2 : 1);
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

  useEffect(() => {
    engineRef.current?.setPadFirstPlayer(padPlayer);
    try { window.localStorage.setItem(PAD_KEY, String(padPlayer)); } catch { /* stockage plein */ }
  }, [padPlayer]);

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

  const scrollToStage = () => {
    const el = stageRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    el.focus({ preventScroll: true });
  };

  const startRom = useCallback(async (bytes, name, { builtin = false, slug: gameSlug = null } = {}) => {
    const engine = engineRef.current;
    if (!engine) return false;
    setError('');
    if (bytes.byteLength > MAX_ROM_BYTES) {
      setError('Fichier trop volumineux pour une cartouche NES (4 Mo maximum).');
      return false;
    }
    const data = new Uint8Array(bytes);
    if (!isNesRom(data)) {
      setError('Ce fichier n’est pas une ROM NES valide (format iNES .nes attendu).');
      return false;
    }
    const id = romFingerprint(data);
    const sram = await getSram(id).catch(() => null);
    try {
      engine.loadRom(data, { sram });
    } catch (err) {
      setError(describeRomError(err));
      return false;
    }
    autoPaused.current = false;
    const meta = { id, name, size: data.byteLength, builtin, slug: gameSlug };
    romRef.current = meta;
    setRom(meta);
    setSavedState(null);
    getState(id).then((state) => {
      if (romRef.current?.id === id) setSavedState(state ? { savedAt: state.savedAt, thumbnail: state.thumbnail } : null);
    }).catch(() => {});
    // Les jeux de la borne sont servis par le site : inutile de les recopier
    // dans le navigateur. Seules les ROMs perso rejoignent la ludothèque.
    if (!builtin) putRom({ id, name, data }).then(refreshLibrary).catch(() => setStorageOk(false));
    return true;
  }, [refreshLibrary]);

  const primeAudio = () => {
    // Le clic courant est un « geste utilisateur » : c'est le seul moment où
    // le navigateur accepte d'allumer le son sans condition.
    const engine = engineRef.current;
    if (!engine) return;
    engine.ensureAudioContext();
    engine.audioCtx?.resume?.().catch(() => {});
  };

  const launchGame = async (game) => {
    if (!game) return;
    primeAudio();
    // Le hash #console fait défiler jusqu'à l'écran (Layout suit le hash).
    if (slug !== game.slug) navigate(`/games/nes/${game.slug}#console`);
    else scrollToStage();
    setLoading(game.slug);
    try {
      const response = await fetch(game.rom);
      if (!response.ok) throw new Error(String(response.status));
      await startRom(await response.arrayBuffer(), game.title, { builtin: true, slug: game.slug });
    } catch {
      setError(`Impossible de charger ${game.title} pour le moment.`);
    } finally {
      setLoading('');
    }
  };

  const openFile = async (file) => {
    if (!file) return;
    setLoading('file');
    try {
      const ok = await startRom(await file.arrayBuffer(), cleanName(file.name));
      if (ok && slug) navigate('/games/nes#console');
    } catch {
      setError('Lecture du fichier impossible.');
    } finally {
      setLoading('');
    }
  };

  const pickFile = () => {
    primeAudio();
    fileInputRef.current?.click();
  };

  const playFromLibrary = async (entry) => {
    primeAudio();
    setLoading(entry.id);
    try {
      const record = await getRom(entry.id);
      if (!record?.data) throw new Error('missing');
      const ok = await startRom(record.data, record.name);
      if (ok) {
        if (slug) navigate('/games/nes#console');
        else scrollToStage();
      }
    } catch {
      setError('Cette ROM n’est plus disponible dans ta ludothèque.');
      refreshLibrary();
    } finally {
      setLoading('');
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
    if (slug) navigate('/games/nes#console');
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

  // Raccourcis de la page (hors manette) : P pause, F2 sauver, F4 charger.
  // Pas de lettre pour le plein écran : ZQSD/G/H/R/T servent au joueur 2.
  useEffect(() => {
    const onKey = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;
      if (!romRef.current) return;
      if (event.code === 'KeyP') { event.preventDefault(); togglePause(); }
      else if (event.code === 'F2') { event.preventDefault(); saveState(); }
      else if (event.code === 'F4') { event.preventDefault(); loadState(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePause, saveState, loadState]);

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) { primeAudio(); openFile(file); }
  };

  const hasRom = !!rom;
  const crashed = hasRom && !status.running;
  const statusLabel = !hasRom ? 'EN ATTENTE' : crashed ? 'ARRÊT' : status.paused ? 'PAUSE' : `${status.fps || 60} FPS`;
  // L'ancienne version enregistrait la démo Concentration Room dans la
  // bibliothèque : elle fait désormais partie de la borne, on la masque ici.
  const userRoms = library.filter((entry) => !entry.builtin && !/^(croom\.nes|concentration room)/i.test(entry.name || ''));
  const overlayGame = !hasRom ? routeGame : null;

  return (
    <main className="nes-page">
      <section className="nes-shell wrap">
        <div className="section-label"><span>GAME / RETRO</span><span>LET’S PLAY ARCADE</span></div>
        <Link className="nes-back" to="/games">← Tous les jeux</Link>

        <div className="nes-heading">
          <div>
            <p className="eyebrow"><span className="live-dot" /> BORNE RÉTRO · NES 8-BIT</p>
            <h1>RETRO <em>NES.</em></h1>
            <p className="nes-intro">
              {NES_CATALOG.length} cartouches libres à lancer en un clic, directement dans ton navigateur. Tu peux aussi
              glisser ta propre ROM <code>.nes</code> : elle reste chez toi, rien n’est envoyé sur nos serveurs.
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
              id="console"
              className={`nes-stage${fullscreen ? ' is-fullscreen' : ''}${showTouch ? ' has-touch' : ''}${dragging ? ' is-dragging' : ''}`}
              style={currentGame ? { '--game-accent': currentGame.accent } : undefined}
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

                {!hasRom && overlayGame && (
                  <div className="nes-overlay has-cover" style={{ '--game-accent': overlayGame.accent }}>
                    <img className="nes-overlay-cover" src={overlayGame.cover} alt="" />
                    <div className="nes-overlay-copy">
                      <p className="eyebrow"><span className="live-dot" /> CARTOUCHE PRÊTE</p>
                      <h2>{overlayGame.title}</h2>
                      <p>{overlayGame.tagline}</p>
                      <div className="nes-overlay-actions">
                        <button className="button button-yellow" type="button" disabled={!!loading} onClick={() => launchGame(overlayGame)}>
                          {loading === overlayGame.slug ? 'CHARGEMENT…' : 'JOUER ▶'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!hasRom && !overlayGame && (
                  <div className="nes-overlay">
                    <p className="eyebrow"><span className="live-dot" /> INSÈRE UNE CARTOUCHE</p>
                    <h2>{dragging ? 'LÂCHE TA ROM ICI.' : 'CHOISIS TON JEU.'}</h2>
                    <p>Pioche une cartouche dans la borne juste en dessous, ou glisse un fichier <b>.nes</b> sur l’écran.</p>
                    <div className="nes-overlay-actions">
                      <button className="button button-yellow" type="button" disabled={!!loading} onClick={() => launchGame(FEATURED)}>
                        {loading === FEATURED.slug ? 'CHARGEMENT…' : `JOUER À ${FEATURED.title.toUpperCase()} ▶`}
                      </button>
                      <a className="button button-ghost" href="#borne">VOIR LA BORNE ↓</a>
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
              <button type="button" onClick={pickFile}>＋ MA ROM</button>
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
            {infoGame && (
              <div className="nes-panel nes-game-card" style={{ '--game-accent': infoGame.accent }}>
                <div className="nes-game-card-head">
                  <img src={infoGame.cover} alt={`Jaquette de ${infoGame.title}`} width="72" height="96" />
                  <div>
                    <h3>{currentGame ? 'En cours' : 'Fiche du jeu'}</h3>
                    <strong>{infoGame.title}</strong>
                    <span>{infoGame.developer} · {infoGame.year}</span>
                  </div>
                </div>
                <p className="nes-game-desc">{infoGame.description}</p>
                <ul className="nes-game-howto">
                  {infoGame.howTo.map((line) => <li key={line}>{line}</li>)}
                </ul>
                {infoGame.warning && <p className="nes-game-warning">⚠ {infoGame.warning}</p>}
                <dl className="nes-game-facts">
                  <div><dt>Genre</dt><dd>{infoGame.genre}</dd></div>
                  <div><dt>Joueurs</dt><dd>{infoGame.players}</dd></div>
                  <div><dt>Licence</dt><dd><a href={infoGame.licenseUrl} target="_blank" rel="noreferrer">{infoGame.license}</a></dd></div>
                  <div>
                    <dt>Code source</dt>
                    <dd>
                      <a href={infoGame.sourceUrl} target="_blank" rel="noreferrer">GitHub</a>
                      {infoGame.sourceDownload && <> · <a href={infoGame.sourceDownload} download>télécharger (.zip)</a></>}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            <div className="nes-panel">
              <h3>Commandes</h3>
              <table className="nes-keys">
                <thead><tr><th>NES</th><th>Joueur 1</th><th>Joueur 2</th></tr></thead>
                <tbody>
                  <tr><td>Croix</td><td><kbd>←</kbd><kbd>↑</kbd><kbd>→</kbd><kbd>↓</kbd></td><td><kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd></td></tr>
                  <tr><td>A</td><td><kbd>C</kbd> / <kbd>K</kbd></td><td><kbd>H</kbd></td></tr>
                  <tr><td>B</td><td><kbd>X</kbd> / <kbd>J</kbd></td><td><kbd>G</kbd></td></tr>
                  <tr><td>Start</td><td><kbd>Entrée</kbd></td><td><kbd>T</kbd></td></tr>
                  <tr><td>Select</td><td><kbd>Maj</kbd></td><td><kbd>R</kbd></td></tr>
                </tbody>
              </table>
              <p className="nes-hint">
                Joueur 2 : <kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> en AZERTY (<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> en QWERTY).
                <kbd>P</kbd> pause · <kbd>F2</kbd> sauver · <kbd>F4</kbd> charger. Les manettes USB ou Bluetooth sont détectées
                dès le premier bouton (bouton du bas = B, de droite = A).
              </p>
              <label className="nes-switch">
                <input type="checkbox" checked={padPlayer === 2} onChange={(event) => setPadPlayer(event.target.checked ? 2 : 1)} />
                <span>La 1re manette joue le joueur 2 (joueur 1 au clavier)</span>
              </label>
              <label className="nes-switch">
                <input type="checkbox" checked={showTouch} onChange={(event) => setTouchPref(event.target.checked)} />
                <span>Manette tactile à l’écran</span>
              </label>
            </div>

            <div className="nes-panel">
              <h3>Mes ROMs</h3>
              {userRoms.length > 0 ? (
                <ul className="nes-library">
                  {userRoms.map((entry) => (
                    <li key={entry.id} className={rom?.id === entry.id ? 'is-current' : ''}>
                      <button type="button" className="nes-lib-play" onClick={() => playFromLibrary(entry)} disabled={!!loading}>
                        <b>{entry.name}</b>
                        <span>{formatSize(entry.size)} · {formatDate(entry.lastPlayed)}</span>
                      </button>
                      <button type="button" className="nes-lib-remove" aria-label={`Retirer ${entry.name}`} onClick={() => removeFromLibrary(entry)}>✕</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <button type="button" className="nes-lib-empty" onClick={pickFile}>
                  <b>＋ Charger une ROM .nes</b>
                  <span>Ou glisse le fichier sur l’écran</span>
                </button>
              )}
              <p className="nes-hint">
                {storageOk
                  ? 'Tes ROMs et sauvegardes restent dans ce navigateur, sur cet appareil.'
                  : 'Stockage local indisponible (navigation privée ?) : les ROMs devront être rechargées à chaque visite.'}
              </p>
            </div>
          </aside>
        </div>

        <GameShelf
          games={NES_CATALOG}
          currentSlug={currentGame?.slug || null}
          loadingSlug={loading}
          onPlay={launchGame}
        />

        <div className="nes-legal">
          <p>
            <b>Uniquement des jeux libres.</b> Les cartouches de la borne sont des créations indépendantes (« homebrews »)
            dont les auteurs autorisent la diffusion — licence et code source sur chaque fiche. L’émulation est légale,
            mais les jeux commerciaux restent protégés : si tu charges ta propre ROM, utilise seulement la copie d’une
            cartouche que tu possèdes. Let’s Play n’héberge aucune ROM commerciale.
          </p>
          <p>
            Émulateur : <a href="https://github.com/bfirsh/jsnes" target="_blank" rel="noreferrer">jsnes</a> (Apache 2.0).
            Jaquettes : illustrations originales Let’s Play, captures réalisées dans l’émulateur. NES est une marque de
            Nintendo, qui n’est pas associée à ces jeux ni à cette page.
          </p>
        </div>
      </section>
    </main>
  );
}
