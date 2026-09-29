import React, { useEffect, useRef, useState } from 'react';
import MirageWorld from './MirageWorld';
import { roomAction, roomCode, roomsAvailable, serverOffset } from './mirageRooms';
import { DesertGroove } from './arcadeAudio';

const characters = ['Sillage · bleu / alezan', 'L’Ombre · rouge / ardoise', 'Sauge · vert / ivoire', 'Améthyste · violet / bai'];
const positionArgs = p => ({ p_distance: Math.min(600, Math.max(0, p.distance || 0)), p_lane: p.lane ?? 1, p_jump: Math.min(1.7, p.jump || 0), p_score: p.score || 0 });

export default function MirageOnline({ connected, userId, initialStage, skin, onBack, onRunFinish }) {
  const [room, setRoom] = useState(null);
  const [stage, setStage] = useState(initialStage);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [finished, setFinished] = useState(false);
  const [seconds, setSeconds] = useState(null);
  const [sound, setSound] = useState(true);
  const [hud, setHud] = useState({});
  const [xp, setXp] = useState(null);
  const latest = useRef({});
  const done = useRef(false);
  const generation = useRef(0);
  const commanding = useRef(false);
  const finishSent = useRef(false);
  const offset = useRef(0);
  const actions = useRef(null);
  const audio = useRef(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    audio.current = new DesertGroove();
    return () => { mounted.current = false; audio.current?.destroy(); };
  }, []);

  async function request(action, target = room?.code, args = {}) {
    const epoch = generation.current;
    const start = Date.now();
    const next = await roomAction(action, target, args);
    if (!mounted.current || epoch !== generation.current) return next;
    if (next.code) {
      offset.current = serverOffset(next, start, Date.now());
      setRoom(next);
      setStage(next.stage);
    }
    return next;
  }
  async function command(action) {
    generation.current++;
    commanding.current = true;
    setBusy(true); setError('');
    try {
      await request(action, action === 'join' ? code : room?.code, action === 'create' ? { p_stage: stage } : {});
      if (action === 'leave') { setActive(false); audio.current?.stop(); setRoom(null); setFinished(false); done.current = false; finishSent.current = false; }
    } catch (e) { setError(e.message); }
    finally { commanding.current = false; if (mounted.current) setBusy(false); }
  }

  useEffect(() => {
    if (!room?.code) return;
    let cancelled = false, timer;
    const poll = async () => {
      if (commanding.current) { timer = setTimeout(poll, 300); return; }
      try {
        const action = active ? 'tick' : done.current && !finishSent.current ? 'finish' : 'get';
        await request(action, room.code, action === 'get' ? {} : positionArgs(latest.current));
        if (!cancelled) { if (action === 'finish') finishSent.current = true; setError(''); }
      } catch (e) { if (!cancelled) setError(`${e.message} — reconnexion automatique…`); }
      if (!cancelled) timer = setTimeout(poll, active ? 200 : 900);
    };
    timer = setTimeout(poll, 100);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [room?.code, active, finished]);

  useEffect(() => {
    if (!room?.started_at || active || finished) return;
    const check = () => {
      const remaining = Date.parse(room.started_at) - (Date.now() + offset.current);
      setSeconds(Math.max(0, Math.ceil(remaining / 1000)));
      if (remaining <= 0 && ready) setActive(true);
    };
    check();
    const timer = setInterval(check, 100);
    return () => clearInterval(timer);
  }, [room?.started_at, active, finished, ready]);
  useEffect(() => {
    audio.current?.setStage(stage);
    if (active && sound) audio.current?.start(); else audio.current?.stop();
  }, [active, sound, stage]);

  const standings = [...(room?.players || [])].sort((a,b) => {
    if (a.finished_at && b.finished_at) return Date.parse(a.finished_at)-Date.parse(b.finished_at);
    if (a.finished_at) return -1;
    if (b.finished_at) return 1;
    return Number(b.distance)-Number(a.distance);
  });
  return <div className="mirage-page"><div className="wrap mirage-online">
    <h1>MIRAGE <em>EN LIGNE</em></h1>
    <p>2 à 4 cavaliers · 600 mètres · même parcours, cristaux individuels · chocs = ralentissement</p>
    {!room && <section className="panel-frame mirage-room-panel">
      <h2>Rassemble ta bande</h2>
      {!connected && <p>Connecte-toi avec un vrai compte pour créer ou rejoindre un salon. Le mode démo ne permet pas de jouer en ligne.</p>}
      <label>Terrain de ta room <select value={stage} onChange={e => setStage(e.target.value)}><option value="desert">Dunes de l’Écho</option><option value="western">Dust Creek</option><option value="prairie">Plaines d’Or</option></select></label>
      <button className="mirage-start-button" disabled={busy || !connected || !roomsAvailable()} onClick={() => command('create')}>CRÉER UNE ROOM</button>
      <label>Code de la room <input value={code} onChange={e => setCode(roomCode(e.target.value))} maxLength={8} placeholder="8 caractères" autoComplete="off" /></label>
      <button className="mirage-share-button" disabled={busy || !connected || code.length !== 8} onClick={() => command('join')}>REJOINDRE</button>
      <button className="mirage-share-button" onClick={onBack}>RETOUR AUX MODES</button>
    </section>}
    {room && <>
      <section className="panel-frame mirage-room-panel">
        <h2>ROOM <strong className="mirage-room-code">{room.code}</strong> · {room.players.length}/4</h2>
        <p>Partage ce code avec tes amis. Terrain : {room.stage}. Le salon expire après 2 heures.</p>
        <ol className="mirage-room-players">{room.players.map(p => <li key={p.user_id} data-slot={p.slot}><strong>{p.name}{p.user_id === userId ? ' (toi)' : ''}{p.user_id === room.host_id ? ' · HÔTE' : ''}</strong><span>{characters[p.slot]}</span></li>)}</ol>
        {room.status === 'lobby' && (room.host_id === userId ? <button className="mirage-start-button" disabled={busy || room.players.length < 2 || !ready} onClick={() => command('start')}>LANCER LA COURSE ({room.players.length}/4)</button> : <p>En attente du départ donné par l’hôte…</p>)}
        {room.status === 'lobby' && room.players.length < 2 && <p>Il faut au moins 2 joueurs pour démarrer.</p>}
        {room.status === 'started' && !active && !finished && <h2>Départ dans {seconds ?? '…'}…</h2>}
        <button className="mirage-share-button" disabled={busy} onClick={() => command('leave')}>{room.host_id === userId && room.status === 'lobby' ? 'FERMER LE SALON' : 'QUITTER LE SALON'}</button>
        <button className="mirage-share-button" onClick={() => setSound(v => !v)}>SON {sound ? 'ON' : 'OFF'}</button>
      </section>
      <section className="mirage-game-shell">
        <div className="mirage-game-topbar"><strong>{Math.floor(hud.distance || 0)} / 600 M · {hud.score || 0} PTS</strong><span>{finished ? 'ARRIVÉE !' : 'COURSE EN LIGNE'}</span></div>
        <div className="mirage-online-world"><MirageWorld active={active} stage={stage} race={{ mode: 'online', seed: room.seed }} skin={skin} network={{ players: room.players, userId }} actionsRef={actions} onReady={() => setReady(true)} onHud={p => { latest.current = p; setHud(p); }} onFinish={p => { latest.current = p; done.current = true; setActive(false); setFinished(true); setXp(onRunFinish?.(p) ?? null); }} onPickup={tier => audio.current?.pickup(tier)} onCheer={() => audio.current?.cheer()} /></div>
        <div className="mirage-mobile-controls"><button onClick={() => actions.current?.('left')}>←</button><button onClick={() => actions.current?.('jump')}>SAUT ↑</button><button onClick={() => actions.current?.('right')}>→</button></div>
      </section>
      <section className="panel-frame mirage-room-panel"><h2>{finished ? 'Arrivées' : 'Positions en direct'}</h2><ol>{standings.map(p => <li key={p.user_id}>{p.name} · {Math.floor(p.distance)} m · {p.score} pts {p.finished_at ? '✓ Arrivé' : Date.now()+offset.current-Date.parse(p.last_seen)>10000 ? '· Connexion perdue' : '· En piste'}</li>)}</ol><small>Positions actualisées environ 5 fois/s. Arrivées enregistrées par le serveur ; classement amical, non homologué.</small>
        {finished && xp && <p className="mirage-xp-award" role="status"><strong>+{xp.xpGained} XP</strong>{xp.leveledUp && <span>NIVEAU {xp.level} !</span>}{xp.unlocked.length > 0 && <em>SKIN DÉBLOQUÉ : {xp.unlocked.map(skinEntry => skinEntry.name).join(' · ')}</em>}</p>}
      </section>
    </>}
    {error && <p className="mirage-room-error" role="alert">{error}</p>}
  </div></div>;
}
