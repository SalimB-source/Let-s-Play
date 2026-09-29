import { supabase } from '../lib/supabase.js';

const STORAGE_KEY = 'letsplay_mirage_online_rooms_v2';
const GUEST_KEY = 'letsplay_mirage_guest_profile_v1';
const BROADCAST_CHANNEL = 'letsplay_mirage_rooms_v2';
const REALTIME_CHANNEL = 'mirage-rooms-live-v2';
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

const BOT_POOL = [
  { id: 'bot-yasmine', name: 'Yasmine', speed: 16.4 },
  { id: 'bot-karim', name: 'Karim', speed: 15.9 },
  { id: 'bot-sami', name: 'Sami', speed: 16.8 },
  { id: 'bot-lina', name: 'Lina', speed: 16.1 },
];

let memoryStore = null;
let seedingEnabled = true;
let broadcastRef = null;
let realtimeRef = null;
const listeners = new Set();

export const roomsAvailable = () => true;

export function roomCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 8);
}

// Estimate server time from each round-trip instead of trusting local clock.
export function serverOffset(room, requestStart, requestEnd) {
  if (!room?.server_now) return 0;
  return Date.parse(room.server_now) - (requestStart + requestEnd) / 2;
}

export function getOrCreateGuestProfile() {
  const fallback = {
    id: `guest-${Math.random().toString(36).slice(2, 10)}`,
    name: `Cavalier-${Math.floor(100 + Math.random() * 900)}`,
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id && parsed?.name) return parsed;
    }
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(fallback));
    return fallback;
  } catch {
    return fallback;
  }
}

export function saveGuestName(name) {
  const clean = String(name || '').trim().slice(0, 24) || 'Cavalier';
  const current = getOrCreateGuestProfile();
  const updated = { ...current, name: clean };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(GUEST_KEY, JSON.stringify(updated));
    } catch {}
  }
  return updated;
}

function createSeededRooms(nowMs = Date.now()) {
  const nowIso = new Date(nowMs).toISOString();
  return {
    DA10E2F4: {
      code: 'DA10E2F4',
      name: 'Galop des Dunes',
      password: '',
      host_id: 'bot-yasmine',
      host_name: 'Yasmine',
      stage: 'desert',
      status: 'lobby',
      seed: 184592041,
      started_at: null,
      created_at: nowIso,
      seeded: true,
      players: [
        {
          user_id: 'bot-yasmine',
          name: 'Yasmine',
          slot: 0,
          ready: true,
          is_bot: true,
          speed: 16.3,
          distance: 0,
          lane: 1,
          jump: 0,
          score: 0,
          finished_at: null,
          last_seen: nowIso,
        },
      ],
      messages: [
        {
          id: 'seed-msg-1',
          user_id: 'bot-yasmine',
          name: 'Yasmine',
          slot: 0,
          body: 'Bienvenue dans la room ! Mets-toi en statut « Prêt » quand tu veux lancer la partie.',
          created_at: nowIso,
        },
      ],
    },
    B7C491A0: {
      code: 'B7C491A0',
      name: 'Saloon Dust Creek',
      password: '1234',
      host_id: 'bot-karim',
      host_name: 'Karim',
      stage: 'western',
      status: 'lobby',
      seed: 912048123,
      started_at: null,
      created_at: new Date(nowMs - 60000).toISOString(),
      seeded: true,
      players: [
        {
          user_id: 'bot-karim',
          name: 'Karim',
          slot: 0,
          ready: true,
          is_bot: true,
          speed: 15.9,
          distance: 0,
          lane: 0,
          jump: 0,
          score: 0,
          finished_at: null,
          last_seen: nowIso,
        },
        {
          user_id: 'bot-sami',
          name: 'Sami',
          slot: 1,
          ready: true,
          is_bot: true,
          speed: 16.7,
          distance: 0,
          lane: 2,
          jump: 0,
          score: 0,
          finished_at: null,
          last_seen: nowIso,
        },
      ],
      messages: [
        {
          id: 'seed-msg-2',
          user_id: 'bot-karim',
          name: 'Karim',
          slot: 0,
          body: 'Room privée entre amis sur Dust Creek (mot de passe : 1234).',
          created_at: nowIso,
        },
      ],
    },
  };
}

function readStore() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          memoryStore = parsed;
        }
      }
    } catch {}
  }
  if (!memoryStore || typeof memoryStore !== 'object') {
    memoryStore = seedingEnabled ? createSeededRooms() : {};
    writeStore(memoryStore, false);
  }
  return memoryStore;
}

function writeStore(nextStore, broadcast = true) {
  memoryStore = nextStore;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore));
    } catch {}
  }
  if (broadcast) {
    notifyAll(nextStore);
  }
}

function notifyAll(storeSnapshot) {
  for (const fn of listeners) {
    try { fn(storeSnapshot); } catch {}
  }
  if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
    try {
      if (!broadcastRef) {
        broadcastRef = new BroadcastChannel(BROADCAST_CHANNEL);
        broadcastRef.unref?.();
      }
      broadcastRef.postMessage({ type: 'rooms_sync', store: storeSnapshot });
    } catch {}
  }
  if (realtimeRef) {
    try {
      realtimeRef.send({
        type: 'broadcast',
        event: 'rooms_sync',
        payload: { store: storeSnapshot },
      });
    } catch {}
  }
}

export function subscribeRoomUpdates(onUpdate) {
  if (typeof onUpdate === 'function') listeners.add(onUpdate);

  const onStorage = (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        memoryStore = JSON.parse(event.newValue);
        onUpdate?.(memoryStore);
      } catch {}
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage);
  }

  let bc;
  if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
    try {
      bc = new BroadcastChannel(BROADCAST_CHANNEL);
      bc.unref?.();
      bc.onmessage = (event) => {
        if (event?.data?.type === 'rooms_sync' && event.data.store) {
          memoryStore = event.data.store;
          if (typeof window !== 'undefined' && window.localStorage) {
            try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryStore)); } catch {}
          }
          onUpdate?.(memoryStore);
        }
      };
    } catch {}
  }

  let rtChannel = null;
  if (supabase && typeof window !== 'undefined') {
    try {
      rtChannel = supabase.channel(REALTIME_CHANNEL);
      realtimeRef = rtChannel;
      rtChannel
        .on('broadcast', { event: 'rooms_sync' }, ({ payload }) => {
          if (payload?.store && typeof payload.store === 'object') {
            memoryStore = { ...readStore(), ...payload.store };
            if (typeof window !== 'undefined' && window.localStorage) {
              try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryStore)); } catch {}
            }
            onUpdate?.(memoryStore);
          }
        })
        .subscribe();
    } catch {}
  }

  return () => {
    listeners.delete(onUpdate);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage);
    }
    try { bc?.close(); } catch {}
    if (rtChannel && supabase) {
      try { supabase.removeChannel(rtChannel); } catch {}
      if (realtimeRef === rtChannel) realtimeRef = null;
    }
  };
}

export function resetLocalRoomsForTests({ seed = false } = {}) {
  seedingEnabled = seed;
  memoryStore = seed ? createSeededRooms() : {};
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryStore));
    } catch {}
  }
}

function serializeRoom(room, nowIso = new Date().toISOString()) {
  const players = [...(room.players || [])]
    .sort((a, b) => a.slot - b.slot)
    .map((p) => ({
      user_id: p.user_id,
      name: p.name,
      slot: p.slot,
      ready: Boolean(p.ready),
      is_bot: Boolean(p.is_bot),
      distance: Number(p.distance || 0),
      lane: p.lane ?? 1,
      jump: Number(p.jump || 0),
      score: Number(p.score || 0),
      finished_at: p.finished_at || null,
      last_seen: p.last_seen || nowIso,
    }));
  const messages = [...(room.messages || [])].slice(-50).map((m) => ({
    id: m.id,
    user_id: m.user_id,
    name: m.name,
    slot: m.slot ?? 0,
    body: m.body,
    created_at: m.created_at,
  }));
  return {
    code: room.code,
    name: room.name || `Room ${room.code}`,
    has_password: Boolean(room.password && String(room.password).length > 0),
    host_id: room.host_id,
    host_name: room.host_name || players[0]?.name || 'Cavalier',
    stage: room.stage,
    status: room.status,
    seed: room.seed,
    started_at: room.started_at || null,
    server_now: nowIso,
    players,
    messages,
  };
}

function serializeRoomSummary(room) {
  const players = room.players || [];
  const readyCount = players.filter((p) => p.ready).length;
  return {
    code: room.code,
    name: room.name || `Room ${room.code}`,
    stage: room.stage,
    status: room.status,
    host_id: room.host_id,
    host_name: room.host_name || players[0]?.name || 'Cavalier',
    has_password: Boolean(room.password && String(room.password).length > 0),
    player_count: players.length,
    ready_count: readyCount,
    created_at: room.created_at,
  };
}

function generateRoomCode(existingStore) {
  const hex = '0123456789ABCDEF';
  for (let attempt = 0; attempt < 50; attempt += 1) {
    let candidate = '';
    for (let i = 0; i < 8; i += 1) {
      candidate += hex[Math.floor(Math.random() * 16)];
    }
    if (!existingStore[candidate]) return candidate;
  }
  return 'A1B2C3D4';
}

function advanceBotsInRace(room, nowMs) {
  if (room.status !== 'started' || !room.started_at) return false;
  const elapsedSec = (nowMs - Date.parse(room.started_at)) / 1000;
  if (elapsedSec <= 0) return false;

  let changed = false;
  const nowIso = new Date(nowMs).toISOString();
  for (const p of room.players) {
    if (!p.is_bot || p.finished_at) continue;
    const speed = p.speed || 16.2;
    const wave = Math.sin(elapsedSec * 1.3 + p.slot * 1.9) * 0.8;
    const nextDistance = Math.min(600, Math.max(Number(p.distance || 0), elapsedSec * speed + wave));
    const laneWave = Math.floor((elapsedSec + p.slot * 1.7) / 2.6) % 3;
    const jumpPhase = (elapsedSec + p.slot * 0.9) % 3.4;
    const jumpVal = jumpPhase < 0.55 ? Math.sin((jumpPhase / 0.55) * Math.PI) * 1.25 : 0;
    p.distance = Number(nextDistance.toFixed(2));
    p.lane = laneWave;
    p.jump = Number(jumpVal.toFixed(2));
    p.score = Math.min(200000, Math.round(p.distance * 14 + p.slot * 50));
    p.last_seen = nowIso;
    if (p.distance >= 600 && !p.finished_at) {
      p.finished_at = nowIso;
      p.jump = 0;
    }
    changed = true;
  }
  return changed;
}

function resolvePlayer(player) {
  if (player?.id) {
    return {
      id: String(player.id),
      name: String(player.name || 'Cavalier').trim().slice(0, 24) || 'Cavalier',
      connected: Boolean(player.connected),
    };
  }
  const guest = getOrCreateGuestProfile();
  return { id: guest.id, name: guest.name, connected: false };
}

export function localRoomAction(action, code = null, extras = {}, player = null) {
  const actor = resolvePlayer(player);
  const uid = actor.id;
  const uname = actor.name;
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const store = { ...readStore() };

  // Prune expired rooms (> 2 hours old)
  for (const [key, rm] of Object.entries(store)) {
    if (!rm || (rm.created_at && nowMs - Date.parse(rm.created_at) > ROOM_TTL_MS)) {
      delete store[key];
    }
  }

  if (seedingEnabled) {
    const seededDefaults = createSeededRooms(nowMs);
    for (const [seedCode, seedRoom] of Object.entries(seededDefaults)) {
      if (!store[seedCode]) {
        store[seedCode] = seedRoom;
      }
    }
  }

  if (action === 'list') {
    writeStore(store, false);
    const rooms = Object.values(store)
      .filter((rm) => rm && rm.status === 'lobby' && (rm.players?.length || 0) > 0)
      .sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0))
      .map(serializeRoomSummary);
    return { server_now: nowIso, rooms };
  }

  if (!['create', 'join', 'ready', 'chat', 'get', 'start', 'tick', 'finish', 'leave', 'add_bot'].includes(action)) {
    throw new Error('Action inconnue');
  }

  if (action === 'create') {
    const stage = extras.p_stage || 'desert';
    if (!['desert', 'western', 'prairie', 'sardinia'].includes(stage)) {
      throw new Error('Carte inconnue');
    }
    // Remove previous open lobby hosted by the same user
    for (const [key, rm] of Object.entries(store)) {
      if (rm.host_id === uid && rm.status === 'lobby' && !rm.seeded) {
        delete store[key];
      }
    }
    const vCode = generateRoomCode(store);
    const cleanName = String(extras.p_name ?? '').trim().slice(0, 60) || `Salon de ${uname}`;
    const cleanPassword = String(extras.p_password ?? '').trim();

    const newRoom = {
      code: vCode,
      name: cleanName,
      password: cleanPassword,
      host_id: uid,
      host_name: uname,
      stage,
      status: 'lobby',
      seed: Math.floor(Math.random() * 4294967296),
      started_at: null,
      created_at: nowIso,
      players: [
        {
          user_id: uid,
          name: uname,
          slot: 0,
          ready: false,
          is_bot: false,
          distance: 0,
          lane: 1,
          jump: 0,
          score: 0,
          finished_at: null,
          last_seen: nowIso,
        },
      ],
      messages: [
        {
          id: `msg-${nowMs}-0`,
          user_id: uid,
          name: uname,
          slot: 0,
          body: `Salon « ${cleanName} » créé. Coordonnez-vous dans le chat et passez en statut Prêt !`,
          created_at: nowIso,
        },
      ],
    };
    store[vCode] = newRoom;
    writeStore(store, true);
    return serializeRoom(newRoom, nowIso);
  }

  const vCode = roomCode(code);
  if (vCode.length !== 8) {
    throw new Error('Code invalide');
  }
  const room = store[vCode];
  if (!room) {
    throw new Error('Salon introuvable ou expiré');
  }

  const existingPlayer = room.players.find((p) => p.user_id === uid);

  if (action === 'join') {
    if (!existingPlayer) {
      if (room.status !== 'lobby') {
        throw new Error('Course déjà lancée');
      }
      const requiredPassword = String(room.password || '').trim();
      const providedPassword = String(extras.p_password ?? '').trim();
      if (requiredPassword && providedPassword !== requiredPassword) {
        throw new Error('Mot de passe incorrect');
      }
      const usedSlots = new Set(room.players.map((p) => p.slot));
      const freeSlot = [0, 1, 2, 3].find((s) => !usedSlots.has(s));
      if (freeSlot === undefined) {
        throw new Error('Salon complet (4 joueurs)');
      }
      room.players.push({
        user_id: uid,
        name: uname,
        slot: freeSlot,
        ready: false,
        is_bot: false,
        distance: 0,
        lane: 1,
        jump: 0,
        score: 0,
        finished_at: null,
        last_seen: nowIso,
      });
      room.messages.push({
        id: `msg-${nowMs}-join`,
        user_id: uid,
        name: uname,
        slot: freeSlot,
        body: `${uname} a rejoint la room.`,
        created_at: nowIso,
      });
    } else {
      existingPlayer.name = uname;
      existingPlayer.last_seen = nowIso;
    }
    writeStore(store, true);
    return serializeRoom(room, nowIso);
  }

  if (!existingPlayer) {
    throw new Error('Tu ne fais pas partie de ce salon');
  }

  existingPlayer.name = uname;
  existingPlayer.last_seen = nowIso;

  if (action === 'ready') {
    if (room.status !== 'lobby') {
      throw new Error('Course déjà lancée');
    }
    existingPlayer.ready = typeof extras.p_ready === 'boolean' ? extras.p_ready : !existingPlayer.ready;
    writeStore(store, true);
    return serializeRoom(room, nowIso);
  }

  if (action === 'chat') {
    const body = String(extras.p_message ?? '').trim().slice(0, 280);
    if (!body) {
      throw new Error('Message vide');
    }
    room.messages.push({
      id: `msg-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: uid,
      name: uname,
      slot: existingPlayer.slot,
      body,
      created_at: nowIso,
    });
    // If there is a bot in the lobby, let it acknowledge once in a while so chat feels alive
    const botPeer = room.players.find((p) => p.is_bot);
    if (botPeer && room.status === 'lobby') {
      const recentBotMsg = [...room.messages].reverse().find((m) => m.user_id === botPeer.user_id);
      const sinceLastBot = recentBotMsg ? nowMs - Date.parse(recentBotMsg.created_at || 0) : Infinity;
      if (sinceLastBot > 8000) {
        room.messages.push({
          id: `msg-${nowMs}-bot`,
          user_id: botPeer.user_id,
          name: botPeer.name,
          slot: botPeer.slot,
          body: existingPlayer.ready
            ? 'Super, on est tous prêts ! Tu peux cliquer sur « Lancer la partie » !'
            : 'Bien reçu ! Clique sur « Se mettre prêt » dès que tu es prêt à partir.',
          created_at: new Date(nowMs + 10).toISOString(),
        });
      }
    }
    writeStore(store, true);
    return serializeRoom(room, nowIso);
  }

  if (action === 'add_bot') {
    if (room.status !== 'lobby') {
      throw new Error('Course déjà lancée');
    }
    const usedSlots = new Set(room.players.map((p) => p.slot));
    const freeSlot = [0, 1, 2, 3].find((s) => !usedSlots.has(s));
    if (freeSlot === undefined) {
      throw new Error('Salon complet (4 joueurs)');
    }
    const usedIds = new Set(room.players.map((p) => p.user_id));
    const botTemplate = BOT_POOL.find((b) => !usedIds.has(b.id)) || {
      id: `bot-${freeSlot}-${nowMs}`,
      name: `Rival ${freeSlot + 1}`,
      speed: 16.2,
    };
    room.players.push({
      user_id: botTemplate.id,
      name: botTemplate.name,
      slot: freeSlot,
      ready: true,
      is_bot: true,
      speed: botTemplate.speed,
      distance: 0,
      lane: freeSlot % 3,
      jump: 0,
      score: 0,
      finished_at: null,
      last_seen: nowIso,
    });
    room.messages.push({
      id: `msg-${nowMs}-botjoin`,
      user_id: botTemplate.id,
      name: botTemplate.name,
      slot: freeSlot,
      body: 'Salut ! Je suis prêt pour la course !',
      created_at: nowIso,
    });
    writeStore(store, true);
    return serializeRoom(room, nowIso);
  }

  if (action === 'start') {
    const canHostStart = room.host_id === uid || String(room.host_id).startsWith('bot-');
    if (!canHostStart) {
      throw new Error('Seul l’hôte peut lancer la partie');
    }
    if (room.status !== 'lobby') {
      throw new Error('Course déjà lancée');
    }
    if (room.players.some((p) => !p.ready)) {
      throw new Error('Tous les joueurs doivent être prêts pour lancer la partie');
    }
    if (room.players.length < 2) {
      // Automatically add a ready bot rival so solo players can also launch immediately once ready
      const botTemplate = BOT_POOL[0];
      room.players.push({
        user_id: botTemplate.id,
        name: botTemplate.name,
        slot: 1,
        ready: true,
        is_bot: true,
        speed: botTemplate.speed,
        distance: 0,
        lane: 2,
        jump: 0,
        score: 0,
        finished_at: null,
        last_seen: nowIso,
      });
    }
    room.status = 'started';
    room.started_at = new Date(nowMs + 5000).toISOString();
    room.messages.push({
      id: `msg-${nowMs}-start`,
      user_id: uid,
      name: uname,
      slot: existingPlayer.slot,
      body: 'La partie est lancée ! Départ dans 5 secondes…',
      created_at: nowIso,
    });
    writeStore(store, true);
    return serializeRoom(room, nowIso);
  }

  if (action === 'tick' || action === 'finish') {
    if (room.status !== 'started' || nowMs < Date.parse(room.started_at)) {
      throw new Error('La course n’a pas commencé');
    }
    const dist = Number(extras.p_distance ?? 0);
    const lane = Number(extras.p_lane ?? 1);
    const jump = Number(extras.p_jump ?? 0);
    const score = Number(extras.p_score ?? 0);
    if (dist < 0 || dist > 600 || lane < 0 || lane > 2 || jump < 0 || jump > 1.7 || score < 0 || score > 200000) {
      throw new Error('Position invalide');
    }
    if (action === 'finish' && dist < 600) {
      throw new Error('Arrivée non atteinte');
    }
    if (!existingPlayer.finished_at) {
      existingPlayer.distance = Math.max(Number(existingPlayer.distance || 0), dist);
      existingPlayer.lane = lane;
      existingPlayer.jump = jump;
      existingPlayer.score = score;
      if (action === 'finish') {
        existingPlayer.finished_at = nowIso;
      }
    }
    advanceBotsInRace(room, nowMs);
    writeStore(store, true);
    return serializeRoom(room, nowIso);
  }

  if (action === 'leave') {
    if (room.seeded) {
      const defaults = createSeededRooms(nowMs);
      if (defaults[vCode]) {
        store[vCode] = defaults[vCode];
      } else {
        room.players = room.players.filter((p) => p.user_id !== uid);
      }
      writeStore(store, true);
      return { left: true, server_now: nowIso };
    }
    if (room.host_id === uid && room.status === 'lobby') {
      delete store[vCode];
      writeStore(store, true);
      return { left: true, server_now: nowIso };
    }
    room.players = room.players.filter((p) => p.user_id !== uid);
    const hasHumans = room.players.some((p) => !p.is_bot);
    if (!hasHumans) {
      delete store[vCode];
    }
    writeStore(store, true);
    return { left: true, server_now: nowIso };
  }

  // action === 'get'
  if (advanceBotsInRace(room, nowMs)) {
    writeStore(store, false);
  }
  return serializeRoom(room, nowIso);
}

function isRpcSchemaOrFallbackError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '');
  return (
    code === 'PGRST202' ||
    code === 'PGRST204' ||
    code === '42883' ||
    code === '42P01' ||
    code === '42703' ||
    /Action inconnue/i.test(msg) ||
    /could not find the function/i.test(msg) ||
    /does not exist/i.test(msg) ||
    /Failed to fetch/i.test(msg) ||
    /NetworkError/i.test(msg)
  );
}

export async function roomAction(action, code = null, extras = {}, player = null) {
  const actor = resolvePlayer(player);
  const vCode = code ? roomCode(code) : null;

  // If the target room exists in the local store (e.g. seeded or local room), or action is 'add_bot', handle locally
  const currentLocalStore = readStore();
  if (action === 'add_bot' || (vCode && currentLocalStore[vCode])) {
    return localRoomAction(action, vCode, extras, actor);
  }

  if (supabase && actor.connected) {
    try {
      const { data, error } = await supabase.rpc('mirage_room_action', {
        p_action: action,
        p_code: vCode,
        ...extras,
      });
      if (error) {
        if (isRpcSchemaOrFallbackError(error)) {
          return localRoomAction(action, vCode, extras, actor);
        }
        throw new Error(error.message || 'Impossible de joindre le salon.');
      }
      if (action === 'list' && data?.rooms) {
        const localList = localRoomAction('list', null, {}, actor);
        const remoteCodes = new Set(data.rooms.map((r) => r.code));
        const merged = [
          ...data.rooms,
          ...(localList.rooms || []).filter((r) => !remoteCodes.has(r.code)),
        ];
        return { ...data, rooms: merged };
      }
      return data;
    } catch (err) {
      if (isRpcSchemaOrFallbackError(err)) {
        return localRoomAction(action, vCode, extras, actor);
      }
      throw err;
    }
  }

  return localRoomAction(action, vCode, extras, actor);
}
