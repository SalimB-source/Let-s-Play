import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MirageCharacterPortrait from './MirageCharacterPortrait';
import MiragePowerIcon from './MiragePowerIcon';
import { CHARACTER_NAMES, CHARACTER_PALETTES } from './mirageCharacters';
import { Link } from 'react-router-dom';
import MirageWorld from './MirageWorld';
import {
  broadcastRoomEvent,
  getOrCreateGuestProfile,
  roomAction,
  roomCode,
  roomsAvailable,
  saveGuestName,
  serverOffset,
  subscribeRoomUpdates,
} from './mirageRooms';
import { powerUpOdds, POWER_UPS, POWER_UP_CHARGE_COST, POWER_BOOST_DURATION, GEM_RESPAWN_DELAY, DUEL_DISTANCE } from './mirageRules';
import { DesertGroove } from './arcadeAudio';

const characters = CHARACTER_NAMES;

const STAGE_LABELS = {
  desert: 'Dunes de l’Écho',
  western: 'Dust Creek',
  prairie: 'Plaines d’Or',
  sardinia: 'Costa Omertà',
  alger: 'Alger la Blanche',
  japan: 'Plaines de Yōtei',
};

const QUICK_MESSAGES = [
  'Salut tout le monde ! 👋',
  'Je suis prêt ! ✓',
  'On attend encore un joueur ?',
  'Go lancer la partie ! 🐎',
];

const positionArgs = (p) => ({
  p_distance: Math.min(DUEL_DISTANCE, Math.max(0, p.distance || 0)),
  p_lane: p.lane ?? 1,
  p_jump: Math.min(1.7, p.jump || 0),
  p_score: p.score || 0,
});

function formatChatTime(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function MirageOnline({
  connected,
  userId,
  userName,
  initialStage = 'desert',
  onBack,
  onRunFinish,
  onSelectMode,
}) {
  const guestProfile = useMemo(() => getOrCreateGuestProfile(), []);
  const [customPseudo, setCustomPseudo] = useState(() => userName || guestProfile.name);
  const effectivePlayer = useMemo(() => {
    const id = userId || guestProfile.id;
    const name = (userName || customPseudo || guestProfile.name || 'Cavalier').trim().slice(0, 24) || 'Cavalier';
    return { id, name, connected: Boolean(connected && userId) };
  }, [connected, customPseudo, guestProfile.id, guestProfile.name, userId, userName]);

  const [room, setRoom] = useState(null);
  const worldRace = useMemo(() => ({ mode: 'online', seed: room?.seed }), [room?.seed]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [stage, setStage] = useState(initialStage || 'desert');
  const [code, setCode] = useState('');
  const [joinCodePassword, setJoinCodePassword] = useState('');
  const [passwordPromptRoom, setPasswordPromptRoom] = useState(null);
  const [joinRoomPassword, setJoinRoomPassword] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [worldReady, setWorldReady] = useState(false);
  const [worldError, setWorldError] = useState('');
  const [active, setActive] = useState(false);
  const [finished, setFinished] = useState(false);
  const [seconds, setSeconds] = useState(null);
  const [sound, setSound] = useState(true);
  const [hud, setHud] = useState({});
  const [xp, setXp] = useState(null);
  const [powerToast, setPowerToast] = useState(null);
  const [gemPickups, setGemPickups] = useState({});

  const latest = useRef({});
  const done = useRef(false);
  const generation = useRef(0);
  const commanding = useRef(false);
  const finishSent = useRef(false);
  const offset = useRef(0);
  const actions = useRef(null);
  const audio = useRef(null);
  const mounted = useRef(true);
  const chatFeedRef = useRef(null);
  const gemPickupTimers = useRef(new Map());

  useEffect(() => {
    mounted.current = true;
    audio.current = new DesertGroove();
    return () => {
      mounted.current = false;
      gemPickupTimers.current.forEach((timer) => clearTimeout(timer));
      gemPickupTimers.current.clear();
      audio.current?.destroy();
    };
  }, []);

  const handlePseudoChange = (value) => {
    setCustomPseudo(value);
    saveGuestName(value);
  };

  const fetchRoomsList = useCallback(async (silent = false) => {
    if (!silent) setLoadingRooms(true);
    try {
      const res = await roomAction('list', null, {}, effectivePlayer);
      if (mounted.current && Array.isArray(res?.rooms)) {
        setAvailableRooms(res.rooms);
      }
    } catch {
      // Keep existing list on transient poll failure
    } finally {
      if (mounted.current && !silent) setLoadingRooms(false);
    }
  }, [effectivePlayer]);

  async function request(action, target = room?.code, args = {}) {
    const epoch = generation.current;
    const start = Date.now();
    const next = await roomAction(action, target, args, effectivePlayer);
    if (!mounted.current || epoch !== generation.current) return next;
    if (next?.code) {
      offset.current = serverOffset(next, start, Date.now());
      setRoom(next);
      setStage(next.stage);
    }
    return next;
  }

  const handleRoomPickupEvent = useCallback((event) => {
    if (
      event?.type !== 'gem_pickup'
      || event.code !== room?.code
      || event.userId === effectivePlayer.id
      || !event.gemKey
    ) return;

    const key = String(event.gemKey);
    const respawnMs = GEM_RESPAWN_DELAY * 1000;
    const expiresAt = Date.now() + respawnMs;
    const previousTimer = gemPickupTimers.current.get(key);
    if (previousTimer) clearTimeout(previousTimer);
    setGemPickups((current) => ({ ...current, [key]: expiresAt }));
    const timer = setTimeout(() => {
      setGemPickups((current) => {
        if (current[key] !== expiresAt) return current;
        const next = { ...current };
        delete next[key];
        return next;
      });
      gemPickupTimers.current.delete(key);
    }, respawnMs);
    gemPickupTimers.current.set(key, timer);
  }, [effectivePlayer.id, room?.code]);

  async function command(action, customTarget = undefined, customArgs = {}) {
    generation.current += 1;
    commanding.current = true;
    setBusy(true);
    setError('');
    try {
      const target = customTarget !== undefined
        ? customTarget
        : action === 'join'
          ? code
          : room?.code;
      const args = action === 'create'
        ? {
            p_stage: stage,
            p_name: roomName.trim() || `Salon de ${effectivePlayer.name}`,
            p_password: roomPassword.trim(),
            ...customArgs,
          }
        : customArgs;

      const result = await request(action, target, args);

      if (action === 'create') {
        setShowCreateForm(false);
        setRoomName('');
        setRoomPassword('');
      }
      if (action === 'join') {
        setPasswordPromptRoom(null);
        setJoinRoomPassword('');
        setJoinCodePassword('');
      }
      if (action === 'leave') {
        setActive(false);
        setWorldReady(false);
        setWorldError('');
        setHud({});
        gemPickupTimers.current.forEach((timer) => clearTimeout(timer));
        gemPickupTimers.current.clear();
        setGemPickups({});
        audio.current?.stop();
        setRoom(null);
        setFinished(false);
        setXp(null);
        done.current = false;
        finishSent.current = false;
        fetchRoomsList(true);
      }
      return result;
    } catch (e) {
      setError(e.message || 'Une erreur est survenue.');
      return null;
    } finally {
      commanding.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  // Poll available rooms while in the lobby browser (!room)
  useEffect(() => {
    if (room?.code) return undefined;
    fetchRoomsList(false);
    const timer = setInterval(() => fetchRoomsList(true), 2200);
    const unsub = subscribeRoomUpdates(() => {
      if (!room?.code) fetchRoomsList(true);
    });
    return () => {
      clearInterval(timer);
      unsub();
    };
  }, [room?.code, fetchRoomsList]);

  // Poll active room state while inside a room
  useEffect(() => {
    if (!room?.code) return undefined;
    let cancelled = false;
    let timer;
    const poll = async () => {
      if (commanding.current) {
        timer = setTimeout(poll, 250);
        return;
      }
      try {
        const action = active ? 'tick' : done.current && !finishSent.current ? 'finish' : 'get';
        await request(action, room.code, action === 'get' ? {} : positionArgs(latest.current));
        if (!cancelled) {
          if (action === 'finish') finishSent.current = true;
        }
      } catch (e) {
        if (!cancelled) setError(`${e.message} — reconnexion automatique…`);
      }
      if (!cancelled) timer = setTimeout(poll, active ? 200 : 800);
    };
    timer = setTimeout(poll, 120);

    const unsub = subscribeRoomUpdates(() => {
      if (!commanding.current && !active && room?.code) {
        request('get', room.code, {}).catch(() => {});
      }
    }, handleRoomPickupEvent);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsub();
    };
  }, [room?.code, active, finished, handleRoomPickupEvent]);

  // Race start countdown
  useEffect(() => {
    if (!room?.started_at || active || finished) return undefined;
    const check = () => {
      const remaining = Date.parse(room.started_at) - (Date.now() + offset.current);
      setSeconds(Math.max(0, Math.ceil(remaining / 1000)));
      if (remaining <= 0 && worldReady) setActive(true);
    };
    check();
    const timer = setInterval(check, 100);
    return () => clearInterval(timer);
  }, [room?.started_at, active, finished, worldReady]);

  useEffect(() => {
    audio.current?.setStage(stage);
    if (active && sound) audio.current?.start();
    else audio.current?.stop();
  }, [active, sound, stage]);

  // Scroll chat to latest message when new messages arrive
  const messageCount = room?.messages?.length || 0;
  useEffect(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, [messageCount, room?.code]);

  const handleJoinFromList = (targetRoom) => {
    setError('');
    if (targetRoom.has_password) {
      setPasswordPromptRoom(targetRoom.code);
      setJoinRoomPassword('');
      return;
    }
    command('join', targetRoom.code, { p_password: '' });
  };

  const handleConfirmPasswordJoin = (e) => {
    e.preventDefault();
    if (!passwordPromptRoom) return;
    command('join', passwordPromptRoom, { p_password: joinRoomPassword });
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    command('create');
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    const trimmed = chatDraft.trim();
    if (!trimmed || !room?.code) return;
    setChatDraft('');
    await command('chat', room.code, { p_message: trimmed });
  };

  const handleQuickChat = async (text) => {
    if (!room?.code || busy) return;
    await command('chat', room.code, { p_message: text });
  };

  const handleToggleReady = () => {
    if (!room?.code || busy) return;
    const me = room.players?.find((p) => p.user_id === effectivePlayer.id);
    command('ready', room.code, { p_ready: !me?.ready });
  };

  const handleCopyCode = async () => {
    if (!room?.code) return;
    try {
      await navigator.clipboard.writeText(room.code);
      setCopiedCode(true);
      setTimeout(() => {
        if (mounted.current) setCopiedCode(false);
      }, 2000);
    } catch {}
  };

  const myPlayer = room?.players?.find((p) => p.user_id === effectivePlayer.id);
  const characterIndex = Math.max(0, Math.min(CHARACTER_NAMES.length - 1, Number(myPlayer?.character ?? myPlayer?.slot) || 0));
  const selectedSkin = CHARACTER_PALETTES[characterIndex];
  const isHost = Boolean(
    room && (room.host_id === effectivePlayer.id || String(room.host_id).startsWith('bot-')),
  );
  const readyCount = room?.players?.filter((p) => p.ready).length || 0;
  const totalPlayers = room?.players?.length || 0;
  const allPlayersReady = totalPlayers > 0 && readyCount === totalPlayers;
  const canLaunchParty = Boolean(
    room?.status === 'lobby' && isHost && allPlayersReady && !busy,
  );
  // The server changes the room status only after the host starts the race.
  // Do not mount/render the 3D course while everyone is still in the lobby.
  const gameLaunched = room?.status === 'started';

  const standings = [...(room?.players || [])].sort((a, b) => {
    if (a.finished_at && b.finished_at) return Date.parse(a.finished_at) - Date.parse(b.finished_at);
    if (a.finished_at) return -1;
    if (b.finished_at) return 1;
    return Number(b.distance) - Number(a.distance);
  });

  const switchMode = (targetMode) => {
    if (onSelectMode) onSelectMode(targetMode);
    else if (targetMode !== 'online' && onBack) onBack();
  };

  return (
    <div className="mirage-page">
      <header className="mirage-heading wrap has-mode-tabs">
        <div className="mirage-heading-copy">
          <div className="mirage-eyebrow">
            <span className="mirage-live-dot" /> LET’S PLAY ARCADE{' '}
            <span className="mirage-eyebrow-divider">/</span> MULTIJOUEUR EN LIGNE
          </div>
          {/* Le titre « MIRAGE EN LIGNE » et son chapô sont retirés des DEUX
              thèmes, comme sur la page principale de Mirage Rush : encre
              crème posée en dur, invisibles sur le fond clair du thème Light,
              et la demande est de ne plus les afficher du tout. */}
          <Link className="mirage-back-link" to="/quizz">← RETOUR AUX JEUX</Link>
        </div>

        <div className="mirage-mode-tabs" role="tablist" aria-label="Modes de jeu Mirage">
          <button
            type="button"
            role="tab"
            aria-selected="false"
            className="mirage-mode-tab"
            onClick={() => switchMode('rush')}
          >
            <span>↯</span> RUÉE
          </button>
          <button
            type="button"
            role="tab"
            aria-selected="false"
            className="mirage-mode-tab"
            onClick={() => switchMode('duel')}
          >
            <span>⚔</span> DUEL
          </button>
          <button
            type="button"
            role="tab"
            aria-selected="false"
            className="mirage-mode-tab"
            onClick={() => switchMode('cup')}
          >
            <span>♛</span> COUPE
          </button>
          <button
            type="button"
            role="tab"
            aria-selected="true"
            className="mirage-mode-tab is-active"
          >
            <span>♞</span> EN LIGNE
          </button>
        </div>
      </header>

      <div className="wrap mirage-online">
        {!room && (
          <>
            {/* Top accessibility bar: player pseudo + Créer room button */}
            <section className="panel-frame mirage-lobby-toolbar">
              <div className="mirage-lobby-identity">
                <span className="mirage-panel-kicker">TON CAVALIER EN LIGNE</span>
                <div className="mirage-pseudo-row">
                  <span className="mirage-pseudo-avatar" aria-hidden="true">
                    {effectivePlayer.name.slice(0, 1).toUpperCase()}
                  </span>
                  {userName ? (
                    <strong className="mirage-pseudo-display">{effectivePlayer.name}</strong>
                  ) : (
                    <label className="mirage-pseudo-label">
                      <span className="sr-only">Ton pseudo</span>
                      <input
                        type="text"
                        value={customPseudo}
                        onChange={(e) => handlePseudoChange(e.target.value)}
                        maxLength={24}
                        placeholder="Ton pseudo…"
                        aria-label="Ton pseudo"
                      />
                    </label>
                  )}
                  <span className="mirage-online-status-pill">
                    <i /> SALONS ACCESSIBLES
                  </span>
                </div>
              </div>

              <div className="mirage-lobby-toolbar-actions">
                <button
                  type="button"
                  className="mirage-create-room-btn"
                  disabled={busy || !roomsAvailable()}
                  onClick={() => {
                    setError('');
                    setShowCreateForm((prev) => !prev);
                  }}
                >
                  <span className="mirage-create-room-icon" aria-hidden="true">
                    {showCreateForm ? '✕' : '＋'}
                  </span>
                  <span>{showCreateForm ? 'FERMER LE FORMULAIRE' : 'CRÉER ROOM'}</span>
                </button>
                <button
                  type="button"
                  className="mirage-share-button"
                  onClick={onBack}
                >
                  ← RETOUR AUX MODES
                </button>
              </div>
            </section>

            {/* Room creation form (name + optional password + stage) */}
            {showCreateForm && (
              <section className="panel-frame mirage-create-room-panel" aria-label="Créer une room de jeu">
                <div className="mirage-panel-heading">
                  <div>
                    <span className="mirage-panel-kicker">NOUVEAU SALON MULTIJOUEUR</span>
                    <h2>
                      CRÉER UNE <em>ROOM</em>
                    </h2>
                  </div>
                  <span className="mirage-trophy" aria-hidden="true">♞</span>
                </div>

                <form className="mirage-create-room-form" onSubmit={handleCreateSubmit}>
                  <div className="mirage-form-grid">
                    <label className="mirage-form-field">
                      <span className="mirage-field-label">NOM DE LA ROOM</span>
                      <input
                        type="text"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        maxLength={50}
                        placeholder={`Ex : Salon de ${effectivePlayer.name}, Course des Dunes…`}
                        autoFocus
                      />
                      <small>Donne un nom clair pour que les joueurs retrouvent ta room.</small>
                    </label>

                    <label className="mirage-form-field">
                      <span className="mirage-field-label">MOT DE PASSE <em>(OPTIONNEL)</em></span>
                      <input
                        type="password"
                        value={roomPassword}
                        onChange={(e) => setRoomPassword(e.target.value)}
                        maxLength={32}
                        placeholder="Laisser vide pour une room ouverte à tous"
                        autoComplete="new-password"
                      />
                      <small>Il peut rester vide si tu veux que tout le monde puisse rejoindre.</small>
                    </label>

                    <label className="mirage-form-field">
                      <span className="mirage-field-label">TERRAIN DE LA COURSE</span>
                      <select value={stage} onChange={(e) => setStage(e.target.value)}>
                        <option value="desert">01 · Dunes de l’Écho (Désert)</option>
                        <option value="western">02 · Dust Creek (Western)</option>
                        <option value="prairie">03 · Plaines d’Or (Prairie)</option>
                        <option value="sardinia">04 · Costa Omertà (Sardaigne)</option>
                        <option value="alger">05 · Alger la Blanche (Alger)</option>
                        <option value="japan">06 · Plaines de Yōtei (Mont Fuji · Nuit)</option>
                      </select>
                      <small>{DUEL_DISTANCE} mètres · parcours synchronisé pour tous les cavaliers.</small>
                    </label>
                  </div>

                  <div className="mirage-create-form-actions">
                    <button
                      type="submit"
                      className="mirage-start-button"
                      disabled={busy || !roomsAvailable()}
                    >
                      CRÉER LA ROOM <span>↗</span>
                    </button>
                    <button
                      type="button"
                      className="mirage-share-button"
                      onClick={() => setShowCreateForm(false)}
                    >
                      ANNULER
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Available rooms list */}
            <section className="panel-frame mirage-rooms-browser" aria-label="Rooms disponibles">
              <div className="mirage-browser-header">
                <div>
                  <span className="mirage-panel-kicker">SALONS EN ATTENTE DE JOUEURS</span>
                  <h2>
                    ROOMS <em>DISPONIBLES</em>
                  </h2>
                </div>
                <div className="mirage-browser-header-right">
                  <span className="mirage-rooms-count-pill">
                    <i /> {availableRooms.length} {availableRooms.length > 1 ? 'rooms disponibles' : 'room disponible'}
                  </span>
                  <button
                    type="button"
                    className="mirage-refresh-rooms-btn"
                    onClick={() => fetchRoomsList(false)}
                    disabled={busy}
                    title="Actualiser la liste des rooms"
                  >
                    ↻ ACTUALISER
                  </button>
                </div>
              </div>

              {loadingRooms && availableRooms.length === 0 ? (
                <div className="mirage-rooms-empty">
                  <p>Recherche des rooms disponibles…</p>
                </div>
              ) : availableRooms.length === 0 ? (
                <div className="mirage-rooms-empty">
                  <strong>Aucune room disponible pour l’instant.</strong>
                  <p>Clique sur « Créer room » pour ouvrir ton salon et inviter d’autres joueurs !</p>
                  <button
                    type="button"
                    className="mirage-create-room-btn"
                    onClick={() => setShowCreateForm(true)}
                  >
                    <span>＋</span> CRÉER ROOM
                  </button>
                </div>
              ) : (
                <ul className="mirage-rooms-list">
                  {availableRooms.map((r) => {
                    const isFull = Number(r.player_count) >= 4;
                    const isPrompting = passwordPromptRoom === r.code;
                    return (
                      <li
                        key={r.code}
                        className={`mirage-room-card${r.has_password ? ' is-protected' : ' is-open'}`}
                      >
                        <div className="mirage-room-card-main">
                          <div className="mirage-room-card-top">
                            <strong className="mirage-room-card-title">{r.name || `Room ${r.code}`}</strong>
                            <span
                              className={`mirage-room-lock-badge${r.has_password ? ' is-locked' : ' is-unlocked'}`}
                            >
                              {r.has_password ? '🔒 Mot de passe' : '🔓 Ouverte'}
                            </span>
                            <span className={`mirage-room-stage-badge is-${r.stage}`}>
                              ◆ {STAGE_LABELS[r.stage] || r.stage}
                            </span>
                          </div>

                          <div className="mirage-room-card-meta">
                            <span>Hôte : <b>{r.host_name || 'Cavalier'}</b></span>
                            <span>Code : <code className="mirage-room-code">{r.code}</code></span>
                            <span>
                              Joueurs : <b>{r.player_count}/4</b> ({r.ready_count || 0}/{r.player_count} prêt{Number(r.ready_count) > 1 ? 's' : ''})
                            </span>
                          </div>
                        </div>

                        <div className="mirage-room-card-actions">
                          {isPrompting ? (
                            <form className="mirage-room-password-prompt" onSubmit={handleConfirmPasswordJoin}>
                              <input
                                type="password"
                                value={joinRoomPassword}
                                onChange={(e) => setJoinRoomPassword(e.target.value)}
                                placeholder="Mot de passe de la room…"
                                aria-label={`Mot de passe pour ${r.name}`}
                                autoFocus
                              />
                              <button type="submit" className="mirage-join-room-btn" disabled={busy}>
                                ENTRER
                              </button>
                              <button
                                type="button"
                                className="mirage-cancel-prompt-btn"
                                onClick={() => setPasswordPromptRoom(null)}
                              >
                                ✕
                              </button>
                            </form>
                          ) : (
                            <button
                              type="button"
                              className="mirage-join-room-btn"
                              disabled={busy || isFull}
                              onClick={() => handleJoinFromList(r)}
                            >
                              {isFull ? 'COMPLET (4/4)' : r.has_password ? '🔒 REJOINDRE' : 'REJOINDRE →'}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Direct join by code bar */}
              <div className="mirage-direct-code-bar">
                <span className="mirage-direct-code-label">REJOINDRE AVEC UN CODE DIRECT :</span>
                <div className="mirage-direct-code-inputs">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(roomCode(e.target.value))}
                    maxLength={8}
                    placeholder="Code (8 caractères)"
                    autoComplete="off"
                  />
                  <input
                    type="password"
                    value={joinCodePassword}
                    onChange={(e) => setJoinCodePassword(e.target.value)}
                    maxLength={32}
                    placeholder="Mot de passe (si requis)"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="mirage-share-button"
                    disabled={busy || code.length !== 8}
                    onClick={() => command('join', code, { p_password: joinCodePassword })}
                  >
                    REJOINDRE PAR CODE
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {room && (
          <>
            {/* Room header bar */}
            <section className="panel-frame mirage-room-header-panel">
              <div className="mirage-room-header-top">
                <div className="mirage-room-title-block">
                  <div className="mirage-room-badges-row">
                    <span className="mirage-panel-kicker">ROOM EN LIGNE</span>
                    <span className={`mirage-room-lock-badge${room.has_password ? ' is-locked' : ' is-unlocked'}`}>
                      {room.has_password ? '🔒 Protégée par mot de passe' : '🔓 Sans mot de passe'}
                    </span>
                    <span className={`mirage-room-stage-badge is-${room.stage}`}>
                      ◆ {STAGE_LABELS[room.stage] || room.stage}
                    </span>
                  </div>
                  <h2>
                    {room.name || `ROOM ${room.code}`}{' '}
                    <small className="mirage-room-capacity">({room.players.length}/4 JOUEURS)</small>
                  </h2>
                  <p className="mirage-room-code-line">
                    Code du salon : <strong className="mirage-room-code">{room.code}</strong>
                    <button type="button" className="mirage-copy-code-btn" onClick={handleCopyCode}>
                      {copiedCode ? '✓ COPIÉ' : 'COPIER LE CODE'}
                    </button>
                  </p>
                </div>

                <div className="mirage-room-header-buttons">
                  <button
                    type="button"
                    className={`mirage-sound-button${sound ? ' is-on' : ''}`}
                    onClick={() => setSound((v) => !v)}
                  >
                    <span aria-hidden="true">{sound ? '♫' : '♪'}</span> SON {sound ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    className="mirage-share-button is-danger"
                    disabled={busy}
                    title={room.host_id === effectivePlayer.id && room.status === 'lobby'
                      ? 'Quitter la room : elle sera fermée car tu en es l’hôte.'
                      : 'Quitter la room'}
                    onClick={() => command('leave')}
                  >
                    ← QUITTER LA ROOM
                  </button>
                </div>
              </div>
            </section>

            {/* Inside the room: Players + Ready status + Launch button on the left, Chat on the right */}
            <div className="mirage-room-interior-grid">
              <section className="panel-frame mirage-room-players-panel" aria-label="Joueurs de la room">
                <div className="mirage-panel-heading">
                  <div>
                    <span className="mirage-panel-kicker">COORDINATION AVANT LE DÉPART</span>
                    <h2>
                      JOUEURS <em>({readyCount}/{totalPlayers} PRÊTS)</em>
                    </h2>
                  </div>
                  {room.status === 'lobby' && room.players.length < 4 && (
                    <button
                      type="button"
                      className="mirage-add-bot-btn"
                      disabled={busy}
                      onClick={() => command('add_bot', room.code)}
                    >
                      ＋ AJOUTER UN CAVALIER IA
                    </button>
                  )}
                </div>

                <div className="mirage-skin-picker" role="group" aria-label="Choisir ton personnage">
                  {characters.map((name, index) => (
                    <button
                      type="button"
                      key={name}
                      className={`mirage-skin-chip${characterIndex === index ? ' is-selected' : ''}`}
                      aria-pressed={characterIndex === index}
                      disabled={busy || room.status !== 'lobby'}
                      onClick={() => command('character', room.code, { p_character: index })}
                    >
                      <MirageCharacterPortrait character={index} className="mirage-skin-portrait" decorative />
                      <span className="mirage-skin-name">{name.split(' · ')[0]}</span>
                      <small>{characterIndex === index ? 'PERSONNAGE CHOISI' : 'CHOISIR'}</small>
                    </button>
                  ))}
                </div>
                <p className="mirage-ready-hint">
                  {room.status === 'lobby'
                    ? 'Choisis ton personnage, puis confirme que tu es prêt. Il sera verrouillé dès le lancement.'
                    : 'Personnage verrouillé pour cette course.'}
                </p>

                <ol className="mirage-room-players">
                  {room.players.map((p) => {
                    const isMe = p.user_id === effectivePlayer.id;
                    const isRoomHost = p.user_id === room.host_id;
                    return (
                      <li
                        key={p.user_id}
                        data-slot={p.slot}
                        className={`mirage-player-slot-card${p.ready ? ' is-player-ready' : ' is-player-waiting'}`}
                      >
                        <div className="mirage-player-slot-head">
                          <MirageCharacterPortrait
                            character={p.character ?? p.slot}
                            className="mirage-player-character"
                          />
                          <div className="mirage-player-identity">
                            <strong>
                              {p.name}
                              {isMe ? ' (toi)' : ''}
                              {isRoomHost && <em className="mirage-host-tag">HÔTE</em>}
                            </strong>
                            <span className="mirage-player-mount">{characters[p.character ?? p.slot] || characters[0]}</span>
                          </div>
                        </div>

                        <div className="mirage-player-ready-row">
                          <span
                            className={`mirage-ready-status-badge ${p.ready ? 'is-ready' : 'is-not-ready'}`}
                          >
                            {p.ready ? '✓ Prêt' : '⏳ Joueur pas encore prêt'}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>

                {room.status === 'lobby' && (
                  <div className="mirage-room-launch-zone">
                    <div className="mirage-ready-toggle-wrap">
                      <button
                        type="button"
                        className={`mirage-ready-toggle-btn ${myPlayer?.ready ? 'is-ready' : 'is-not-ready'}`}
                        disabled={busy}
                        onClick={handleToggleReady}
                        aria-pressed={Boolean(myPlayer?.ready)}
                      >
                        <span className="mirage-ready-toggle-indicator" aria-hidden="true">
                          {myPlayer?.ready ? '✓' : '○'}
                        </span>
                        <span>
                          {myPlayer?.ready ? 'STATUT : PRÊT (ANNULER)' : 'SE METTRE PRÊT'}
                        </span>
                      </button>
                      <small className="mirage-ready-hint">
                        {myPlayer?.ready
                          ? 'Tu es prêt ! En attente du lancement de la partie.'
                          : 'Ton statut affiche « Joueur pas encore prêt ». Clique ci-dessus quand tu es prêt.'}
                      </small>
                    </div>

                    <div className="mirage-launch-cta-wrap">
                      <button
                        type="button"
                        className={`mirage-launch-party-btn${canLaunchParty ? ' is-ready-to-launch' : ''}`}
                        disabled={!canLaunchParty}
                        onClick={() => command('start')}
                      >
                        <span className="mirage-launch-party-glow" aria-hidden="true" />
                        <span className="mirage-launch-party-emblem" aria-hidden="true">♞</span>
                        <span className="mirage-launch-party-copy">
                          <strong>LANCER LA PARTIE</strong>
                          <small>
                            {!allPlayersReady
                              ? `En attente que tous les joueurs soient prêts (${readyCount}/${totalPlayers})`
                              : !isHost
                                ? 'Tous les joueurs sont prêts · L’hôte va lancer'
                                : `Tout le monde est prêt (${readyCount}/${totalPlayers}) · Départ ${DUEL_DISTANCE} m`}
                          </small>
                        </span>
                        <span className="mirage-launch-party-arrow" aria-hidden="true">↗</span>
                      </button>
                    </div>
                  </div>
                )}

                {room.status === 'started' && !active && !finished && (
                  <div className="mirage-room-countdown-banner" role="status" aria-live="polite">
                    <span>✦ TENIR LES RÊNES ✦</span>
                    <strong>DÉPART DANS {seconds ?? '…'} S…</strong>
                  </div>
                )}
              </section>

              {/* Room Chat Panel */}
              <section className="panel-frame mirage-room-chat-panel" aria-label="Chat de la room">
                <div className="mirage-panel-heading">
                  <div>
                    <span className="mirage-panel-kicker">COMMUNICATION & COORDINATION</span>
                    <h2>
                      CHAT DE LA <em>ROOM</em>
                    </h2>
                  </div>
                  <span className="mirage-chat-badge">EN DIRECT</span>
                </div>

                <div
                  className="mirage-room-chat-messages"
                  ref={chatFeedRef}
                  role="log"
                  aria-live="polite"
                >
                  {(!room.messages || room.messages.length === 0) ? (
                    <p className="mirage-room-chat-empty">
                      Aucun message pour l’instant. Écris dans le chat pour te coordonner avant de lancer la partie !
                    </p>
                  ) : (
                    room.messages.map((m) => {
                      const isMine = m.user_id === effectivePlayer.id;
                      return (
                        <div
                          key={m.id || `${m.user_id}-${m.created_at}`}
                          className={`mirage-chat-bubble${isMine ? ' is-mine' : ''}`}
                          data-slot={m.slot ?? 0}
                        >
                          <div className="mirage-chat-meta">
                            <strong>{m.name || 'Cavalier'}{isMine ? ' (toi)' : ''}</strong>
                            {m.created_at && <time>{formatChatTime(m.created_at)}</time>}
                          </div>
                          <p>{m.body}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mirage-chat-quick-bar" aria-label="Messages rapides">
                  {QUICK_MESSAGES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className="mirage-chat-quick-chip"
                      disabled={busy}
                      onClick={() => handleQuickChat(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>

                <form className="mirage-room-chat-form" onSubmit={handleSendChat}>
                  <input
                    type="text"
                    value={chatDraft}
                    onChange={(e) => setChatDraft(e.target.value)}
                    maxLength={280}
                    placeholder="Écrire un message pour se coordonner…"
                    aria-label="Message du chat de la room"
                  />
                  <button
                    type="submit"
                    className="mirage-chat-send-btn"
                    disabled={busy || !chatDraft.trim()}
                  >
                    ENVOYER ↗
                  </button>
                </form>
              </section>
            </div>

            {!gameLaunched && (
              <section className="panel-frame mirage-room-waiting-panel" role="status">
                <span className="mirage-waiting-sun" aria-hidden="true">☀</span>
                <div>
                  <span className="mirage-panel-kicker">LA PISTE EST PRÊTE</span>
                  <h2>EN ATTENTE DU <em>DÉPART</em></h2>
                  <p>Le jeu apparaîtra ici dès que l’hôte lancera la partie.</p>
                </div>
                <span className="mirage-waiting-status"><i /> ROOM EN LOBBY</span>
              </section>
            )}

            {gameLaunched && !finished && (
              <div className="mirage-game-popup-backdrop">
                <div className="mirage-game-popup" role="dialog" aria-modal="true" aria-label="Course Mirage Rush">
                  <section className={`mirage-game-shell${active ? ' is-running' : ''}`}>
                    <div className="mirage-game-topbar">
                      <strong>
                        {Math.floor(hud.distance || 0)} / {DUEL_DISTANCE} M · {hud.score || 0} PTS
                        {((hud.shieldCharges || 0) > 0 || (hud.lassoCharges || 0) > 0 || (hud.pistolCharges || 0) > 0 || (hud.boostCharges || 0) > 0) ? ' · ⚡ POUVOIR PRÊT !' : ''}
                        {hud.shieldActive ? ' · 🛡️ BOUCLIER' : ''}
                        {hud.powerBoostActive ? ` · ⚡ TURBO ${Math.ceil(hud.powerBoostLeft)}s` : ''}
                        {hud.slowed ? (hud.slowKind === 'mud' ? ' · 🟤 BOUE' : hud.slowKind === 'trap' ? ' · ◆ PIÉGÉ' : ' · 🪢 RALENTI') : ''}
                        {hud.stunned ? ' · 🔫 À TERRE' : ''}
                        {hud.rank ? ` · #${hud.rank}` : ''}
                      </strong>
                      <span>{finished ? 'ARRIVÉE !' : active ? 'COURSE EN COURS' : 'PISTE PRÊTE'}</span>
                      <button
                        type="button"
                        className="mirage-share-button is-danger mirage-popup-leave-button"
                        disabled={busy}
                        onClick={() => command('leave')}
                        aria-label="Quitter la room et fermer la course"
                      >
                        ← QUITTER LA ROOM
                      </button>
                    </div>
                    <div className={`mirage-online-world${active && hud.powerBoostActive ? ' is-turbo' : ''}`}>
                      <MirageWorld
                        active={active}
                        stage={stage}
                        race={worldRace}
                        skin={selectedSkin}
                        network={{ players: room.players, userId: effectivePlayer.id, gemPickups }}
                        actionsRef={actions}
                        onReady={() => {
                          setWorldError('');
                          setWorldReady(true);
                        }}
                        onError={(message) => {
                          setWorldReady(false);
                          setWorldError(message || 'Le jeu 3D n’a pas pu démarrer.');
                        }}
                        onHud={(p) => {
                          latest.current = p;
                          setHud(p);
                        }}
                        onFinish={(p) => {
                          latest.current = p;
                          done.current = true;
                          setActive(false);
                          setFinished(true);
                          setXp(onRunFinish?.(p) ?? null);
                        }}
                        onMud={() => {
                          audio.current?.mudSplash?.();
                          setPowerToast('🟤 Flaque de boue ! Monture ralentie…');
                          setTimeout(() => setPowerToast(null), 1800);
                        }}
                        onPickup={(tier, key) => {
                          audio.current?.pickup(tier);
                          if (key && room?.code) {
                            broadcastRoomEvent({ type: 'gem_pickup', code: room.code, gemKey: key, userId: effectivePlayer.id });
                            roomAction('gem_pickup', room.code, { p_gem_key: key }, effectivePlayer).catch(()=>{});
                          }
                        }}
                        onCheer={() => audio.current?.cheer()}
                        onPowerUp={(info) => {
                          if (info?.action === 'no_target') {
                            if (info.type === 'lasso') {
                              setPowerToast('🪢 Aucun cavalier devant toi !');
                            } else if (info.type === 'pistol') {
                              setPowerToast('🔫 Aucun cavalier devant toi !');
                            }
                            setTimeout(() => setPowerToast(null), 1800);
                          } else if (info?.action === 'used') {
                            if (info.type === 'shield') {
                              audio.current?.shieldGravity?.();
                              setPowerToast('🛡️ Bouclier activé automatiquement !');
                            } else if (info.type === 'lasso') {
                              audio.current?.lassoThrow?.();
                              setPowerToast('🪢 Lasso envoyé !');
                            } else if (info.type === 'pistol') {
                              audio.current?.gunshot();
                              setPowerToast('🔫 Tir de pistolet !');
                            } else if (info.type === 'boost') {
                              audio.current?.speedBoost?.();
                              setPowerToast(`⚡ Turbo activé automatiquement (${POWER_BOOST_DURATION}s) !`);
                            }
                            setTimeout(() => setPowerToast(null), 2200);
                          } else if (info?.action === 'charged') {
                            audio.current?.powerReady?.();
                            if (info.type === 'lasso') {
                              setPowerToast('⚡ 🪢 LASSO PRÊT ! Appuie sur W / Z ou clique !');
                            } else if (info.type === 'pistol') {
                              setPowerToast('⚡ 🔫 PISTOLET PRÊT ! Appuie sur R ou clique !');
                            }
                            setTimeout(() => setPowerToast(null), 2200);
                          }
                        }}
                        onLasso={async (targetPlayer) => {
                          if (!room?.code || !targetPlayer) return;
                          try {
                            await roomAction('lasso', room.code, { p_target_id: targetPlayer.user_id, p_target: targetPlayer.user_id }, effectivePlayer);
                          } catch {}
                          setPowerToast(`🪢 Lasso lancé sur ${targetPlayer.name} !`);
                          setTimeout(()=> setPowerToast(null), 2500);
                        }}
                        onShield={async (isActive) => {
                          if (!room?.code) return;
                          try {
                            if (isActive) {
                              await roomAction('shield', room.code, {}, effectivePlayer);
                            } else {
                              await roomAction('shield', room.code, { p_clear: true, p_active: false }, effectivePlayer);
                            }
                          } catch {}
                        }}
                        onPistol={async (targetPlayer) => {
                          if (!room?.code || !targetPlayer) return;
                          try {
                            await roomAction('pistol', room.code, { p_target_id: targetPlayer.user_id, p_target: targetPlayer.user_id }, effectivePlayer);
                          } catch {}
                          setPowerToast(`🔫 PAN ! Tu tires sur ${targetPlayer.name} !`);
                          setTimeout(()=> setPowerToast(null), 2500);
                        }}
                        onPistolHit={(info) => {
                          if (info?.target === null) {
                            setPowerToast('🔫 PAN ! Personne à portée…');
                            setTimeout(()=> setPowerToast(null), 2000);
                          } else if (info?.target === 'player') {
                            audio.current?.gunshot();
                            setPowerToast('🔫 Touché ! Tu tombes de cheval…');
                            setTimeout(()=> setPowerToast(null), 2000);
                          }
                        }}
                        onLassoHit={(info) => {
                          if (info?.target === 'player') {
                            audio.current?.lassoThrow?.();
                            setPowerToast(info.blocked ? '🛡️ Lasso bloqué par ton bouclier !' : '🪢 Touché par un lasso ! Ralenti…');
                            setTimeout(()=> setPowerToast(null), 2500);
                          }
                        }}
                      />
                      {worldError && (
                        <div className="mirage-world-error" role="alert">
                          <strong>Impossible d’afficher la piste</strong>
                          <span>{worldError}</span>
                          <button type="button" onClick={() => window.location.reload()}>RECHARGER LE JEU</button>
                        </div>
                      )}
                      {active && hud.powerBoostActive && (
                        <div className="mirage-turbo-lines" aria-hidden="true">
                          <i /><i /><i /><i /><i /><i /><i /><i />
                        </div>
                      )}
                      {powerToast && (
                        <div className="mirage-power-toast" role="status" aria-live="polite">
                          {powerToast}
                        </div>
                      )}
                      {active && (
                        <div
                          className="mirage-powerup-bar"
                          role="group"
                          aria-label="Objets de puissance"
                        >
                          <div className="mirage-powerup-buttons-row">
                            <button
                              type="button"
                              className={`mirage-powerup-btn is-shield-btn${(hud.shieldCharges || 0) > 0 ? ' is-ready' : ''}`}
                              onClick={() => actions.current?.('use_shield')}
                              disabled={(hud.shieldCharges || 0) <= 0}
                              title="Bouclier — Chargé par les diamants BLEUS, il s’active tout seul dès que la barre est pleine. Utiliser cet objet ne décharge pas les autres."
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
                              onClick={() => actions.current?.('use_lasso')}
                              disabled={(hud.lassoCharges || 0) <= 0}
                              title="Lasso (W / Z) — Chargé par les diamants JAUNES. Cible uniquement devant toi. Utiliser cet objet ne décharge pas les autres."
                            >
                              <div className="mirage-powerup-btn-top">
                                <MiragePowerIcon type={POWER_UPS.LASSO} className="mirage-powerup-icon" />
                                <span className="mirage-powerup-key">W / Z</span>
                              </div>
                              <div className="mirage-powerup-btn-name">
                                <span>Lasso</span>
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
                              onClick={() => actions.current?.('use_boost')}
                              disabled={(hud.boostCharges || 0) <= 0}
                              title={`Turbo — Chargé par les diamants VERTS, il s’active tout seul dès que la barre est pleine : boost de vitesse pendant ${POWER_BOOST_DURATION}s. Utiliser cet objet ne décharge pas les autres.`}
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
                              onClick={() => actions.current?.('use_pistol')}
                              disabled={(hud.pistolCharges || 0) <= 0}
                              title="Pistolet (R) — Chargé par les diamants ROUGES. Cible uniquement devant toi. Utiliser cet objet ne décharge pas les autres."
                            >
                              <div className="mirage-powerup-btn-top">
                                <MiragePowerIcon type={POWER_UPS.PISTOL} className="mirage-powerup-icon" />
                                <span className="mirage-powerup-key">R</span>
                              </div>
                              <div className="mirage-powerup-btn-name">
                                <span>Pistolet</span>
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
                    </div>

                    {/* Le glissement sur la piste est lu par MirageWorld
                        (mirageTouch.js) : ces boutons restent un recours pour
                        qui préfère viser explicitement. */}
                    <div className="mirage-mobile-controls">
                      <button type="button" aria-label="Aller à gauche" onClick={() => actions.current?.('left')}>←</button>
                      <button type="button" className="mirage-jump-control" aria-label="Sauter" onClick={() => actions.current?.('jump')}>SAUT ↑</button>
                      <button type="button" aria-label="Aller à droite" onClick={() => actions.current?.('right')}>→</button>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {finished && (
              <section className="panel-frame mirage-room-finished-banner" role="status">
                <span className="mirage-waiting-sun" aria-hidden="true">✓</span>
                <div>
                  <span className="mirage-panel-kicker">COURSE TERMINÉE</span>
                  <h2>BIEN JOUÉ, <em>{effectivePlayer.name.toUpperCase()}</em> !</h2>
                  <p>La course s’est refermée. Les résultats sont affichés dans le salon.</p>
                </div>
              </section>
            )}

            {/* Live standings */}
            <section className="panel-frame mirage-room-panel">
              <h2>{finished ? 'Arrivées' : 'Positions en direct'}</h2>
              <ol className="mirage-standings-list">
                {standings.map((p, idx) => (
                  <li key={p.user_id}>
                    <span className="mirage-standing-rank">#{idx + 1}</span>
                    <strong>{p.name}{p.user_id === effectivePlayer.id ? ' (toi)' : ''}</strong>
                    <span>{Math.floor(p.distance || 0)} m · {p.score || 0} pts</span>
                    <em className={p.finished_at ? 'is-finished' : ''}>
                      {p.finished_at
                        ? '✓ Arrivé'
                        : room.status === 'lobby'
                          ? (p.ready ? '✓ Prêt' : '⏳ Joueur pas encore prêt')
                          : Date.now() + offset.current - Date.parse(p.last_seen) > 10000
                            ? '· Connexion perdue'
                            : '· En piste'}
                    </em>
                  </li>
                ))}
              </ol>
              <small>
                Positions actualisées environ 5 fois/s. Arrivées enregistrées par le salon ; classement amical.
              </small>
              {finished && xp && (
                <p className="mirage-xp-award" role="status">
                  <strong>+{xp.xpGained} XP</strong>
                  {xp.leveledUp && <span>NIVEAU {xp.level} !</span>}
                  {xp.unlocked?.length > 0 && (
                    <em>SKIN DÉBLOQUÉ : {xp.unlocked.map((skinEntry) => skinEntry.name).join(' · ')}</em>
                  )}
                </p>
              )}
            </section>
          </>
        )}

        {error && (
          <p className="mirage-room-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
