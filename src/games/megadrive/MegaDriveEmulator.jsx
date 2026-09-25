import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useMediaQuery from '../../lib/useMediaQuery';
import TouchPad from '../nes/TouchPad';
import GameShelf from '../nes/GameShelf';
import { createRomLibrary } from '../nes/romLibrary';
import { MD_CATALOG, MD_PLAYABLE, findMdGame } from './catalog';
import { MD_BUTTONS, MdEngine, isMdRom, romFingerprint } from './mdEngine';
import '../nes/nes-emulator.css';
import './megadrive.css';

const { listRoms, getRom, putRom, deleteRom, getState, putState, getSram, putSram } = createRomLibrary('lets-play-megadrive');

const MAX_ROM_BYTES = 10 * 1024 * 1024; // la plus grosse cartouche officielle fait 5 Mo
const VOLUME_KEY = 'lets-play-md-volume';
const SRAM_EVERY_MS = 15000;
const FEATURED = MD_PLAYABLE[0] || null;

const TOUCH_LAYOUT = {
  up: MD_BUTTONS.UP,
  down: MD_BUTTONS.DOWN,
  left: MD_BUTTONS.LEFT,
  right: MD_BUTTONS.RIGHT,
  meta: [{ button: MD_BUTTONS.START, label: 'START' }],
  face: [
    { button: MD_BUTTONS.A, label: 'A', className: 'is-md' },
    { button: MD_BUTTONS.B, label: 'B', className: 'is-md' },
    { button: MD_BUTTONS.C, label: 'C', className: 'is-md' },
  ],
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
  return String(fileName || 'ROM').replace(/\.(bin|md|gen|smd)$/i, '').replace(/[_]+/g, ' ').trim() || 'ROM';
}

function romFileName(name, fallbackExt = 'bin') {
  const safe = String(name || 'rom').normalize('NFD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'rom';
  return /\.(bin|md|gen|smd)$/i.test(safe) ? safe : `${safe}.${fallbackExt}`;
}

function readStoredVolume() {
  try {
    const value = Number(window.localStorage.getItem(VOLUME_KEY) ?? '0.7');
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.7;
  } catch {
    return 0.7;
  }
}

export default function MegaDriveEmulator() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const routeGame = slug ? findMdGame(slug) : null;

  const hostRef = useRef(null);
  const stageRef = useRef(null);
  const fileInputRef = useRef(null);
  const engineRef = useRef(null);
  const romRef = useRef(null);
  const autoPaused = useRef(false);
  const noticeTimer = useRef(0);

  const [rom, setRom] = useState(null);
  const [status, setStatus] = useState({ running: false, paused: false });
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
  const coarsePointer = useMediaQuery('(pointer: coarse)');
  const [touchPref, setTouchPref] = useState(null);
  const showTouch = touchPref ?? coarsePointer;

  const currentGame = rom?.slug ? findMdGame(rom.slug) : null;
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

  // SRAM (scores, options des jeux) : copiée dans IndexedDB régulièrement,
  // à la pause, en changeant de jeu et en quittant la page.
  const flushSram = useCallback(() => {
    const engine = engineRef.current;
    const current = romRef.current;
    if (!engine?.running || !current) return;
    const sram = engine.readSram();
    if (sram) putSram(current.id, sram).catch(() => {});
  }, []);

  useEffect(() => {
    const engine = new MdEngine({ container: hostRef.current, onStatus: setStatus });
    engine.setVolume(readStoredVolume());
    engineRef.current = engine;
    refreshLibrary();
    const timer = window.setInterval(() => {
      if (engine.running && !engine.paused) flushSram();
    }, SRAM_EVERY_MS);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(noticeTimer.current);
      flushSram();
      engine.destroy();
      engineRef.current = null;
    };
  }, [refreshLibrary, flushSram]);

  useEffect(() => {
    engineRef.current?.setVolume(volume);
    try { window.localStorage.setItem(VOLUME_KEY, String(volume)); } catch { /* stockage plein */ }
  }, [volume]);

  useEffect(() => {
    engineRef.current?.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    const onVisibility = () => {
      const engine = engineRef.current;
      if (!engine?.running) return;
      if (document.hidden && !engine.paused) {
        flushSram();
        autoPaused.current = true;
        engine.setPaused(true);
      } else if (!document.hidden && autoPaused.current) {
        autoPaused.current = false;
        engine.setPaused(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [flushSram]);

  const scrollToStage = () => {
    const el = stageRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };

  const startRom = useCallback(async (bytes, name, { builtin = false, slug: gameSlug = null, fileName } = {}) => {
    const engine = engineRef.current;
    if (!engine) return false;
    setError('');
    if (bytes.byteLength > MAX_ROM_BYTES) {
      setError('Fichier trop volumineux pour une cartouche Mega Drive (10 Mo maximum).');
      return false;
    }
    const data = new Uint8Array(bytes);
    if (!isMdRom(data)) {
      setError('Ce fichier ne ressemble pas à une ROM Mega Drive (.bin, .md ou .gen attendu).');
      return false;
    }
    flushSram();
    const id = romFingerprint(data);
    const sram = await getSram(id).catch(() => null);
    try {
      const ok = await engine.launch({ bytes: data, fileName: fileName || romFileName(name), sram });
      if (!ok) return false;
    } catch {
      setError('Le moteur Mega Drive n’a pas pu démarrer. Recharge la page, ou essaie un navigateur récent.');
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
    if (!builtin) putRom({ id, name, data }).then(refreshLibrary).catch(() => setStorageOk(false));
    return true;
  }, [refreshLibrary, flushSram]);

  const launchGame = async (game) => {
    if (!game || game.pending || game.external) return;
    if (slug !== game.slug) navigate(`/games/megadrive/${game.slug}#console`);
    else scrollToStage();
    setLoading(game.slug);
    try {
      const response = await fetch(game.rom);
      if (!response.ok) throw new Error(String(response.status));
      await startRom(await response.arrayBuffer(), game.title, { builtin: true, slug: game.slug, fileName: game.romFile });
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
      const ok = await startRom(await file.arrayBuffer(), cleanName(file.name), { fileName: romFileName(file.name) });
      if (ok && slug) navigate('/games/megadrive#console');
    } catch {
      setError('Lecture du fichier impossible.');
    } finally {
      setLoading('');
    }
  };

  const pickFile = () => fileInputRef.current?.click();

  const playFromLibrary = async (entry) => {
    setLoading(entry.id);
    try {
      const record = await getRom(entry.id);
      if (!record?.data) throw new Error('missing');
      const ok = await startRom(record.data, record.name);
      if (ok) {
        if (slug) navigate('/games/megadrive#console');
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
    if (!engine.paused) flushSram();
    engine.setPaused(!engine.paused);
  }, [flushSram]);

  const reset = () => {
    engineRef.current?.reset();
    setError('');
    flash('Console redémarrée');
  };

  const eject = async () => {
    flushSram();
    await engineRef.current?.stop();
    romRef.current = null;
    setRom(null);
    setSavedState(null);
    setError('');
    if (slug) navigate('/games/megadrive#console');
  };

  const saveState = useCallback(async () => {
    const engine = engineRef.current;
    const current = romRef.current;
    if (!engine?.running || !current) return;
    try {
      const { state, thumbnail } = await engine.saveState();
      const record = await putState(current.id, state, thumbnail);
      setSavedState({ savedAt: record.savedAt, thumbnail });
      flash('Partie sauvegardée');
    } catch {
      flash('Sauvegarde impossible pour le moment');
    }
  }, [flash]);

  const loadState = useCallback(async () => {
    const engine = engineRef.current;
    const current = romRef.current;
    if (!engine?.running || !current) return;
    try {
      const record = await getState(current.id);
      if (!record) { flash('Aucune sauvegarde pour ce jeu'); return; }
      if (engine.paused) engine.setPaused(false);
      await engine.loadState(record.state);
      flash('Sauvegarde chargée');
    } catch {
      flash('Cette sauvegarde est illisible');
    }
  }, [flash]);

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

  // Raccourcis de la page : P pause, F2 sauver, F4 charger.
  useEffect(() => {
    const onKey = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable) return;
      if (!romRef.current) return;
      if (event.code === 'KeyP') { event.preventDefault(); togglePause(); }
      else if (event.code === 'F2') { event.preventDefault(); saveState(); }
      else if (event.code === 'F4') { event.preventDefault(); loadState(); }
      else if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePause, saveState, loadState]);

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) openFile(file);
  };

  const hasRom = !!rom;
  const isLoading = !!loading;
  const statusLabel = !hasRom ? (isLoading ? 'CHARGEMENT' : 'EN ATTENTE') : status.paused ? 'PAUSE' : 'EN JEU';
  const userRoms = library.filter((entry) => !entry.builtin);
  const overlayGame = !hasRom ? routeGame : null;

  return (
    <main className="nes-page md-page">
      <section className="nes-shell wrap">
        <div className="section-label"><span>GAME / RETRO</span><span>LET’S PLAY ARCADE</span></div>
        <Link className="nes-back" to="/games">← Tous les jeux</Link>

        <div className="nes-heading">
          <div>
            <p className="eyebrow"><span className="live-dot" /> BORNE RÉTRO · MEGA DRIVE 16-BIT</p>
            <h1>RETRO <em>16-BIT.</em></h1>
            <p className="nes-intro">
              Des homebrews Mega Drive offerts par leurs auteurs, jouables en un clic dans ton navigateur. Tu peux aussi
              glisser ta propre ROM <code>.bin</code> / <code>.md</code> : elle reste chez toi, rien n’est envoyé sur nos serveurs.
            </p>
          </div>
          <div className="nes-status-box">
            <span>STATUT</span>
            <strong className={hasRom && !status.paused ? 'is-live' : ''}>{statusLabel}</strong>
            {rom && <em title={rom.name}>{rom.name}</em>}
          </div>
        </div>

        <div className="nes-layout">
          <div className="nes-main">
            <div
              ref={stageRef}
              id="console"
              className={`nes-stage md-stage${fullscreen ? ' is-fullscreen' : ''}${showTouch ? ' has-touch' : ''}${dragging ? ' is-dragging' : ''}`}
              style={currentGame ? { '--game-accent': currentGame.accent } : undefined}
              tabIndex={-1}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
              onDrop={onDrop}
            >
              <div className="nes-screen md-screen">
                <div ref={hostRef} className="md-host" />

                {!hasRom && overlayGame && (
                  <div className="nes-overlay has-cover" style={{ '--game-accent': overlayGame.accent }}>
                    <img className="nes-overlay-cover" src={overlayGame.cover} alt="" />
                    <div className="nes-overlay-copy">
                      <p className="eyebrow"><span className="live-dot" /> {overlayGame.pending ? 'BIENTÔT SUR LA BORNE' : 'CARTOUCHE PRÊTE'}</p>
                      <h2>{overlayGame.title}</h2>
                      <p>{overlayGame.tagline}</p>
                      <div className="nes-overlay-actions">
                        {overlayGame.pending ? (
                          <a className="button button-ghost" href="#borne">VOIR LA BORNE ↓</a>
                        ) : (
                          <button className="button button-yellow" type="button" disabled={isLoading} onClick={() => launchGame(overlayGame)}>
                            {loading === overlayGame.slug ? 'CHARGEMENT…' : 'JOUER ▶'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!hasRom && !overlayGame && (
                  <div className="nes-overlay">
                    <p className="eyebrow"><span className="live-dot" /> INSÈRE UNE CARTOUCHE</p>
                    <h2>{dragging ? 'LÂCHE TA ROM ICI.' : 'CHOISIS TON JEU.'}</h2>
                    <p>Pioche une cartouche dans la borne juste en dessous, ou glisse un fichier <b>.bin</b> / <b>.md</b> sur l’écran.</p>
                    <div className="nes-overlay-actions">
                      {FEATURED && (
                        <button className="button button-yellow" type="button" disabled={isLoading} onClick={() => launchGame(FEATURED)}>
                          {loading === FEATURED.slug ? 'CHARGEMENT…' : `JOUER À ${(FEATURED.shortTitle || FEATURED.title).toUpperCase()} ▶`}
                        </button>
                      )}
                      <a className="button button-ghost" href="#borne">VOIR LA BORNE ↓</a>
                    </div>
                  </div>
                )}

                {hasRom && status.paused && (
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
                  <TouchPad engineRef={engineRef} disabled={!hasRom || status.paused} layout={TOUCH_LAYOUT} />
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
              accept=".bin,.md,.gen,.smd,application/octet-stream"
              hidden
              onChange={(event) => { openFile(event.target.files?.[0]); event.target.value = ''; }}
            />

            {error && <p className="nes-error" role="alert">{error}</p>}

            <div
              className="nes-toolbar"
              role="toolbar"
              aria-label="Commandes de la console"
              onClick={(event) => {
                if (event.target.closest('button')) stageRef.current?.focus({ preventScroll: true });
              }}
            >
              <button type="button" onClick={togglePause} disabled={!hasRom}>{status.paused ? '▶ REPRENDRE' : '❚❚ PAUSE'}</button>
              <button type="button" onClick={reset} disabled={!hasRom}>↻ RESET</button>
              <button type="button" onClick={saveState} disabled={!hasRom}>⤓ SAUVER</button>
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
                {savedState.thumbnail && <img src={savedState.thumbnail} alt="" width="56" height="40" />}
                Dernière sauvegarde : {formatDate(savedState.savedAt)}
              </p>
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
                <dl className="nes-game-facts">
                  <div><dt>Genre</dt><dd>{infoGame.genre}</dd></div>
                  <div><dt>Joueurs</dt><dd>{infoGame.players}</dd></div>
                  {infoGame.credits && <div><dt>Crédits</dt><dd>{infoGame.credits}</dd></div>}
                  <div><dt>Licence</dt><dd><a href={infoGame.licenseUrl} target="_blank" rel="noreferrer">{infoGame.license}</a></dd></div>
                  {infoGame.sourceUrl && (
                    <div><dt>Code source</dt><dd><a href={infoGame.sourceUrl} target="_blank" rel="noreferrer">GitHub</a></dd></div>
                  )}
                  {infoGame.officialUrl && (
                    <div><dt>Auteurs</dt><dd><a href={infoGame.officialUrl} target="_blank" rel="noreferrer">{infoGame.officialLabel || 'Page officielle'}</a></dd></div>
                  )}
                </dl>
              </div>
            )}

            <div className="nes-panel">
              <h3>Commandes</h3>
              <table className="nes-keys">
                <thead><tr><th>Mega Drive</th><th>Joueur 1</th><th>Joueur 2</th></tr></thead>
                <tbody>
                  <tr><td>Croix</td><td><kbd>←</kbd><kbd>↑</kbd><kbd>→</kbd><kbd>↓</kbd></td><td><kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd></td></tr>
                  <tr><td>A</td><td><kbd>X</kbd></td><td><kbd>G</kbd></td></tr>
                  <tr><td>B</td><td><kbd>C</kbd></td><td><kbd>H</kbd></td></tr>
                  <tr><td>C</td><td><kbd>V</kbd></td><td><kbd>J</kbd></td></tr>
                  <tr><td>Start</td><td><kbd>Entrée</kbd></td><td><kbd>T</kbd></td></tr>
                </tbody>
              </table>
              <p className="nes-hint">
                Joueur 2 : <kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> en AZERTY (<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> en QWERTY).
                <kbd>P</kbd> pause · <kbd>F2</kbd> sauver · <kbd>F4</kbd> charger. Manettes USB / Bluetooth : 1re manette = joueur 1,
                2e = joueur 2 (appuie sur un bouton pour la réveiller).
              </p>
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
                      <button type="button" className="nes-lib-play" onClick={() => playFromLibrary(entry)} disabled={isLoading}>
                        <b>{entry.name}</b>
                        <span>{formatSize(entry.size)} · {formatDate(entry.lastPlayed)}</span>
                      </button>
                      <button type="button" className="nes-lib-remove" aria-label={`Retirer ${entry.name}`} onClick={() => removeFromLibrary(entry)}>✕</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <button type="button" className="nes-lib-empty" onClick={pickFile}>
                  <b>＋ Charger une ROM Mega Drive</b>
                  <span>.bin, .md ou .gen — ou glisse le fichier sur l’écran</span>
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
          games={MD_CATALOG}
          currentSlug={currentGame?.slug || null}
          loadingSlug={loading}
          onPlay={launchGame}
          band={['LET’S PLAY', '16-BIT SERIES']}
          eyebrow={`LA BORNE · ${MD_PLAYABLE.length} JOUABLE${MD_PLAYABLE.length > 1 ? 'S' : ''} ICI`}
          intro="Des homebrews Mega Drive dont les auteurs autorisent la diffusion gratuite. Clique sur une jaquette pour l’insérer dans la console."
        />

        <div className="nes-legal">
          <p>
            <b>Uniquement des jeux offerts par leurs auteurs.</b> Chaque cartouche hébergée ici est un homebrew dont les
            auteurs autorisent la diffusion gratuite (licence libre ou freeware déclaré) — détails sur chaque fiche. Les
            autres jeux sont présentés avec un lien vers leur page officielle. Si tu charges ta propre ROM, utilise
            seulement la copie d’une cartouche que tu possèdes. Let’s Play n’héberge aucune ROM commerciale. Auteur d’un
            de ces jeux et tu préfères qu’on le retire ? Écris-nous, c’est fait dans la journée.
          </p>
          <p>
            Émulateur : <a href="https://github.com/libretro/Genesis-Plus-GX" target="_blank" rel="noreferrer">Genesis Plus GX</a>{' '}
            (usage non commercial) dans <a href="https://github.com/libretro/RetroArch" target="_blank" rel="noreferrer">RetroArch</a>{' '}
            (GPL v3), via <a href="https://nostalgist.js.org/" target="_blank" rel="noreferrer">Nostalgist.js</a> (MIT) —{' '}
            <a href={`${import.meta.env.BASE_URL}megadrive/core/SOURCE.txt`} target="_blank" rel="noreferrer">sources et licences</a>.
            Jaquettes : illustrations originales Let’s Play. Mega Drive et Genesis sont des marques de SEGA, qui n’est pas
            associée à ces jeux ni à cette page.
          </p>
        </div>
      </section>
    </main>
  );
}
