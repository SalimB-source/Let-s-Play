/**
 * Vérification « deux joueurs » des appels vocaux / vidéo — `npm run check:calls`.
 *
 * `scripts/calls-check.mjs` vérifie la logique pure et le rendu SSR : aucun
 * appel n'y circule. Ce script va plus loin — il monte **deux joueurs réels
 * côte à côte**, chacun dans son propre « monde » (un chargement distinct des
 * modules de l'application, donc son propre client Supabase, exactement comme
 * deux navigateurs sur deux machines) et déroule de vrais scénarios :
 *
 *   1. l'appelant sonne, l'appelé voit le **pop-up d'appel entrant** avec
 *      Répondre / Refuser ;
 *   2. un refus arrive à l'appelant (« Appel refusé ») ;
 *   3. une réponse établit la connexion pair-à-pair (média des deux côtés) ;
 *   4. raccrocher termine l'appel des deux côtés et dépose la trace ;
 *   5. annuler pendant la sonnerie éteint la sonnerie chez l'appelé ;
 *   6. un troisième joueur qui appelle pendant un appel reçoit « occupé ».
 *
 * Seul l'environnement est simulé (Realtime, WebRTC, base) — les modules
 * testés sont ceux de l'application. Deux pannes sont comptées comme des
 * échecs parce qu'elles sont invisibles à l'écran : un `send()` sur un canal
 * non encore joint (l'événement part dans le vide) et une sonnerie reçue mais
 * ignorée.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'calls-e2e-smoke');

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '--ssr', 'scripts/calls-e2e-smoke.jsx', '--outDir', path.relative(root, outDir), '--emptyOutDir', '--logLevel', 'error'],
  {
    cwd: root,
    stdio: 'inherit',
    // Client Supabase factice : les modules de l'application exigent une URL
    // et une clé au build ; rien n'est contacté (tout est bouchonné plus bas).
    env: {
      ...process.env,
      VITE_SUPABASE_URL: 'https://e2e-calls.invalid',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'e2e-publishable-key',
    },
  },
);

/* ------------------------------------------------------------------------ */
/* Environnement partagé : fenêtre, micro, caméra, WebRTC                    */
/* ------------------------------------------------------------------------ */

const dom = new JSDOM(
  '<!doctype html><html><body>'
  + '<div id="player-alice"></div><div id="player-bob"></div><div id="player-carol"></div>'
  + '<div id="player-dave"></div>'
  + '</body></html>',
  { url: 'https://letsplay.test/Let-s-Play/', pretendToBeVisual: true },
);
dom.window.HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); };
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.localStorage = dom.window.localStorage;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/** Pannes de signalisation (événement émis sur un canal non joint). */
const faults = [];
/** Journal des événements réellement diffusés. */
const delivered = [];

/* --------------------------- bus Realtime simulé -------------------------- */
/*
 * Tous les canaux vivent dans un même registre, mais chacun porte le « monde »
 * (le client) qui l'a créé : Supabase ne renvoie jamais un broadcast à son
 * propre émetteur, alors qu'un AUTRE client abonné au même sujet le reçoit.
 * Comme realtime-js 2.x, un canal du même sujet déjà créé par le même client
 * est réutilisé — c'est précisément ce qui rend un envoi silencieux si le
 * canal n'a pas été joint par le bon chemin.
 */

const allChannels = new Set();
/** Jointures à faire échouer (`monde:sujet`) — une seule fois chacune. */
const joinFailures = new Set();

class FakeChannel {
  constructor(topic, owner) {
    this.topic = topic;
    this.owner = owner;
    this.handlers = [];
    this.state = 'closed';
  }

  on(type, filter, callback) {
    this.handlers.push({ type, filter, callback });
    return this;
  }

  subscribe(callback) {
    this.state = 'joining';
    setTimeout(() => {
      const key = `${this.owner}:${this.topic}`;
      if (joinFailures.has(key)) {
        joinFailures.delete(key);
        this.state = 'error';
        try { callback?.('CHANNEL_ERROR'); } catch (e) { /* ignore */ }
        return;
      }
      this.state = 'SUBSCRIBED';
      try { callback?.('SUBSCRIBED'); } catch (e) { /* ignore */ }
    }, 0);
    return this;
  }

  send(message) {
    if (message?.type !== 'broadcast') return 'ok';
    if (this.state !== 'SUBSCRIBED') {
      faults.push(`événement « ${message.payload?.t} » envoyé sur ${this.topic} avant jointure (${this.state})`);
      return 'error';
    }
    setTimeout(() => {
      for (const other of allChannels) {
        if (other.owner === this.owner || other.topic !== this.topic || other.state !== 'SUBSCRIBED') continue;
        for (const handler of other.handlers) {
          const matches = handler.type === 'broadcast'
            && (!handler.filter || handler.filter.event === message.event);
          if (!matches) continue;
          delivered.push({ topic: other.topic, type: message.payload?.t });
          try { handler.callback({ payload: message.payload }); } catch (e) { /* ignore */ }
        }
      }
    }, 0);
    return 'ok';
  }

  unsubscribe() { return Promise.resolve('ok'); }
  track() { return Promise.resolve('ok'); }
  untrack() { /* rien */ }
  presenceState() { return {}; }
}

function createWorldBus(owner) {
  return {
    channel(topic) {
      for (const existing of allChannels) {
        if (existing.owner === owner && existing.topic === topic) return existing;
      }
      const created = new FakeChannel(topic, owner);
      allChannels.add(created);
      return created;
    },
    remove(channel) {
      if (!channel) return Promise.resolve('ok');
      channel.state = 'closed';
      allChannels.delete(channel);
      return Promise.resolve('ok');
    },
  };
}

/* ------------------------------ WebRTC simulé ----------------------------- */

class FakeTrack {
  constructor(kind) {
    this.kind = kind;
    this.enabled = true;
    this.id = `track-${kind}-${Math.random().toString(36).slice(2, 8)}`;
  }

  stop() { this.stopped = true; }
  getSettings() { return { deviceId: 'cam-1' }; }
}

class FakeStream {
  constructor(tracks = []) { this.tracks = [...tracks]; }

  getTracks() { return [...this.tracks]; }
  getAudioTracks() { return this.tracks.filter((track) => track.kind === 'audio'); }
  getVideoTracks() { return this.tracks.filter((track) => track.kind === 'video'); }
  addTrack(track) { this.tracks.push(track); }
  removeTrack(track) { this.tracks = this.tracks.filter((item) => item !== track); }
}

const rtc = (() => {
  const registry = new Map();
  let seq = 0;

  /** Les deux extrémités d'un même appel s'apparient par leur SDP factice. */
  function link(pc) {
    const other = pc.peerId ? registry.get(pc.peerId) : null;
    if (process.env.E2E_DEBUG) console.log('[RTC] link', pc.id, 'peer=', pc.peerId, 'other=', Boolean(other), 'linked=', pc.linked, other?.linked, 'otherLocal=', Boolean(other?.localDescription), 'otherRemote=', Boolean(other?.remoteDescription));
    if (!other || pc.linked || other.linked) return;
    if (!other.localDescription || !other.remoteDescription) return;
    if (process.env.E2E_DEBUG) console.log('[RTC] -> connecté', pc.id, '/', other.id, 'handlers:', Boolean(pc.onconnectionstatechange), Boolean(other.onconnectionstatechange));
    for (const end of [pc, other]) {
      end.linked = true;
      end.connectionState = 'connected';
      end.iceConnectionState = 'connected';
    }
    setTimeout(() => {
      for (const [me, them] of [[pc, other], [other, pc]]) {
        const stream = them.localStream || new FakeStream();
        try { me.ontrack?.({ streams: [stream], track: stream.getTracks()[0] || null }); } catch (e) { /* ignore */ }
        try { me.onconnectionstatechange?.(); } catch (e) { /* ignore */ }
      }
    }, 0);
  }

  return class FakePeerConnection {
    constructor(config) {
      this.id = `pc${(seq += 1)}`;
      registry.set(this.id, this);
      this.config = config;
      this.localDescription = null;
      this.remoteDescription = null;
      this.connectionState = 'new';
      this.signalingState = 'stable';
      this.senders = [];
      this.localStream = null;
      this.remoteCandidates = [];
      this.peerId = null;
      this.linked = false;
      this.onicecandidate = null;
      this.ontrack = null;
      this.onconnectionstatechange = null;
    }

    addTrack(track, stream) {
      if (stream) this.localStream = stream;
      const sender = { track, replaceTrack: async (next) => { sender.track = next; } };
      this.senders.push(sender);
      return sender;
    }

    getSenders() { return this.senders; }

    async createOffer() {
      return { type: 'offer', sdp: `v=0\r\no=${this.id} 0 0 IN IP4 127.0.0.1\r\n` };
    }

    async createAnswer() {
      if (!this.remoteDescription) throw new Error('answer without offer');
      return { type: 'answer', sdp: `v=0\r\no=${this.id} 0 0 IN IP4 127.0.0.1\r\n` };
    }

    async setLocalDescription(desc) {
      this.localDescription = { type: desc.type, sdp: desc.sdp };
      this.signalingState = desc.type === 'offer' ? 'have-local-offer' : 'stable';
      setTimeout(() => {
        if (!this.onicecandidate) return;
        this.onicecandidate({
          candidate: {
            toJSON: () => ({ candidate: 'candidate:1 1 udp 2122260223 10.0.0.1 5000 typ host', sdpMid: '0', sdpMLineIndex: 0 }),
          },
        });
        this.onicecandidate({ candidate: null });
      }, 0);
    }

    async setRemoteDescription(desc) {
      if (!desc || typeof desc.sdp !== 'string') throw new Error('bad sdp');
      // La ligne « o= » désigne l'auteur du SDP : c'est l'extrémité distante.
      this.peerId = /o=(pc\d+)/.exec(desc.sdp)?.[1] || null;
      this.remoteDescription = { type: desc.type, sdp: desc.sdp };
      this.signalingState = desc.type === 'offer' ? 'have-remote-offer' : 'stable';
      link(this);
    }

    async addIceCandidate(candidate) {
      if (!this.remoteDescription) throw new Error('ice before remote description');
      this.remoteCandidates.push(candidate);
    }

    close() {
      this.connectionState = 'closed';
      try { this.onconnectionstatechange?.(); } catch (e) { /* ignore */ }
    }
  };
})();

dom.window.RTCPeerConnection = rtc;
dom.window.MediaStream = FakeStream;
Object.defineProperty(dom.window.navigator, 'mediaDevices', {
  configurable: true,
  value: {
    getUserMedia: async ({ video } = {}) => new FakeStream([
      new FakeTrack('audio'),
      ...(video ? [new FakeTrack('video')] : []),
    ]),
    enumerateDevices: async () => [{ kind: 'videoinput', deviceId: 'cam-1' }],
  },
});

/* --------------------------------- React ---------------------------------- */

const React = await import('react');
const { createRoot } = await import('react-dom/client');
const act = React.act || React.default?.act;

/* --------------------------------- mondes --------------------------------- */

const PROFILES = {
  alice: { id: 'user-alice', name: 'Alice' },
  bob: { id: 'user-bob', name: 'Bob' },
  carol: { id: 'user-carol', name: 'Carol' },
};

function friendsValue(self, peerKeys, { status = 'ready', offlinePeers = [] } = {}) {
  const peers = peerKeys.map((key) => PROFILES[key]);
  const known = new Map(peers.map((peer) => [peer.id, peer]));
  known.set(self.id, self);
  const offline = new Set(offlinePeers.map((key) => PROFILES[key].id));
  return {
    enabled: true,
    mode: 'supabase',
    status,
    error: null,
    // Tant que le chargement n'a pas abouti, les relations sont vides : c'est
    // exactement l'état de l'application dans les premières secondes.
    relations: status === 'ready'
      ? Object.fromEntries(peers.map((peer) => [peer.id, { kind: 'friend', since: '2026-01-01T00:00:00Z', rowId: `rel-${peer.id}` }]))
      : {},
    friends: status === 'ready' ? peers : [],
    incoming: [],
    outgoing: [],
    onlineCount: peers.length,
    pendingCount: 0,
    relationWith: (id) => (status === 'ready' && known.has(id) && id !== self.id ? { kind: 'friend' } : null),
    profileFor: (id) => known.get(id) || null,
    isOnline: (id) => (id === self.id ? true : known.has(id) && !offline.has(id)),
    canBefriend: () => false,
  };
}

const MESSAGES_VALUE = {
  enabled: true,
  mode: 'supabase',
  status: 'ready',
  error: null,
  isBlocked: () => false,
  reportedReason: () => null,
  canMessage: () => true,
};

/** Chaîne PostgREST muette : toute requête « réussit » sans rien renvoyer. */
function dbStub(sink, result = { data: null, error: null, count: 0 }) {
  const thenable = (resolve) => resolve(result);
  const callable = () => callable;
  return new Proxy(callable, {
    get(_target, prop) {
      if (prop === 'then') return thenable;
      if (prop === 'catch') return () => callable;
      if (prop === 'finally') return (fn) => { fn(); return callable; };
      return callable;
    },
    apply(_target, _this, args) {
      sink.push(args[0]);
      return callable;
    },
  });
}

/**
 * Charge les modules de l'application une fois de plus (`?world=…`) : chaque
 * joueur obtient son propre client Supabase et son propre contexte, comme deux
 * navigateurs distincts. React reste partagé (les dépendances sont externes).
 */
async function mountPlayer(key, friendKeys, options = {}) {
  const bundle = `${pathToFileURL(path.join(outDir, 'calls-e2e-smoke.js')).href}?world=${key}`;
  // eslint-disable-next-line no-await-in-loop
  const mod = await import(bundle);
  const self = PROFILES[key];
  const bus = createWorldBus(key);
  const sentMessages = [];
  const settings = { status: 'ready', offlinePeers: [], ...options };

  mod.supabase.auth = {
    getSession: async () => ({
      data: { session: { user: { id: self.id, email: `${key}@letsplay.test`, user_metadata: { gamertag: self.name } }, access_token: 'e2e' } },
      error: null,
    }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() { /* rien */ } } } }),
    signOut: async () => ({ error: null }),
  };
  // Chaque écriture en base est journalisée (la trace d'appel en fait partie).
  mod.supabase.from = (table) => { sentMessages.push(table); return dbStub(sentMessages); };
  mod.supabase.channel = (topic) => bus.channel(topic);
  mod.supabase.removeChannel = (channel) => bus.remove(channel);

  const handle = { state: null, calls: () => handle.state, html: () => '', sentMessages, bus };

  function Probe() {
    handle.state = mod.useCalls();
    return null;
  }

  const element = () => React.createElement(
    mod.LanguageProvider, { lang: 'fr' },
    React.createElement(
      mod.AuthProvider, null,
      React.createElement(
        mod.FriendsContext.Provider, { value: friendsValue(self, friendKeys, settings) },
        React.createElement(
          mod.MessagesContext.Provider, { value: MESSAGES_VALUE },
          React.createElement(
            mod.CallsProvider, null,
            React.createElement(Probe, null),
            React.createElement(mod.CallOverlays, null),
          ),
        ),
      ),
    ),
  );

  const container = dom.window.document.getElementById(`player-${key}`);
  const root = createRoot(container);
  await act(async () => { root.render(element()); });
  handle.html = () => container.innerHTML;
  handle.unmount = () => act(async () => { root.unmount(); });
  handle.constants = mod;
  /** Fait évoluer la liste d'amis (chargement, présence) puis re-rend. */
  handle.setFriends = (patch) => act(async () => {
    Object.assign(settings, patch);
    root.render(element());
  });
  return handle;
}

/* ------------------------------- vérifications ---------------------------- */

let failures = 0;
function check(label, actual, expected = true) {
  const ok = typeof expected === 'function' ? expected(actual) : actual === expected;
  if (ok) console.log(`  ok   ${label}`);
  else { failures += 1; console.log(`  FAIL ${label}\n       reçu : ${JSON.stringify(actual)}`); }
}

const tick = () => new Promise((resolve) => { setTimeout(resolve, 0); });

/** Laisse tourner la boucle d'événements dans `act` (effets, promesses, délais). */
async function settle(rounds = 8, ms = 60) {
  for (let i = 0; i < rounds; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await new Promise((resolve) => { setTimeout(resolve, ms); }); });
  }
}

/** Attend qu'une condition se réalise (au plus `rounds` tours de boucle). */
async function waitFor(predicate, rounds = 40) {
  for (let i = 0; i < rounds; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await settle(1);
    if (predicate()) return true;
  }
  if (process.env.E2E_DEBUG) {
    for (const [name, player] of Object.entries(debugPlayers)) {
      const state = player.calls();
      console.log(`[DEBUG]   ${name}: phase=${state?.phase} end=${state?.endReason} connected=${state?.connected} remote=${Boolean(state?.remoteStream)}`);
    }
    console.log('[DEBUG]   diffusés :', delivered.map((d) => `${d.type}>${d.topic}`).join(' , '));
  }
  return false;
}

const debugPlayers = {};

/* ------------------------------------------------------------------------ */
console.log('\n[1/7] montage des trois joueurs\n');

const alice = await mountPlayer('alice', ['bob']);
const bob = await mountPlayer('bob', ['alice', 'carol']);
const carol = await mountPlayer('carol', ['bob']);
debugPlayers.alice = alice; debugPlayers.bob = bob; debugPlayers.carol = carol;
await settle();

check('compte d’Alice pris en charge', alice.calls().enabled);
check('compte de Bob pris en charge', bob.calls().enabled);
check('Alice au repos', alice.calls().phase, 'idle');
check('Bob au repos', bob.calls().phase, 'idle');
check('chaque joueur écoute son canal personnel', [...allChannels].map((c) => c.topic).sort().join(','),
  'calls:user:user-alice,calls:user:user-bob,calls:user:user-carol');

const K = alice.constants;

/* ------------------------------------------------------------------------ */
console.log('\n[2/7] sonnerie entrante et pop-up accepter / refuser\n');

await act(async () => { await alice.calls().startCall(PROFILES.bob.id, 'video'); });
const ringing = await waitFor(() => bob.calls().phase === 'incoming', 25);
check('Bob entend la sonnerie', ringing);

check('Alice passe en « appel sortant »', alice.calls().phase, 'outgoing');
check('sonnerie reçue par Bob', delivered.some((entry) => entry.topic === K.inboxChannelFor(PROFILES.bob.id) && entry.type === 'ring'));
if (ringing) {
  check('Bob reconnaît l’appelant', bob.calls().peer?.id, PROFILES.alice.id);
  check('Bob reconnaît un appel vidéo', bob.calls().kind, 'video');

  const incomingHtml = bob.html();
  check('pop-up d’appel entrant affiché', incomingHtml.includes('calls-backdrop is-incoming'));
  check('… carte de l’appel entrant', incomingHtml.includes('calls-card'));
  check('… bouton Refuser', incomingHtml.includes('calls-round is-decline'));
  check('… bouton Répondre', incomingHtml.includes('calls-round is-accept'));
  check('… libellé « Refuser » accessible', incomingHtml.includes('aria-label="Refuser"'));
  check('… libellé « Répondre » accessible', incomingHtml.includes('aria-label="Répondre"'));
  check('… pseudo de l’appelant affiché', incomingHtml.includes('Alice'));
}
check('pas de pop-up chez l’appelante', alice.html().includes('is-incoming'), false);

/* ------------------------------------------------------------------------ */
console.log('\n[3/7] refus\n');

await act(async () => { bob.calls().declineCall(); });
await settle(6);
check('refus reçu par Alice', alice.calls().endReason, K.END_DECLINED);
check('Alice affiche « Appel refusé »', alice.html().includes('Appel refusé'));
check('pop-up refermé chez Bob', bob.html().includes('is-incoming'), false);
check('trace du refus déposée par l’appelante', alice.sentMessages.length >= 1);
check('retour au calme', await waitFor(() => alice.calls().phase === 'idle' && bob.calls().phase === 'idle', 60));

/* ------------------------------------------------------------------------ */
console.log('\n[4/7] réponse et appel établi\n');

await act(async () => { await alice.calls().startCall(PROFILES.bob.id, 'audio'); });
check('deuxième sonnerie chez Bob', await waitFor(() => bob.calls().phase === 'incoming', 25));

await act(async () => { await bob.calls().acceptCall(); });
const established = await waitFor(() => alice.calls().phase === 'active' && bob.calls().phase === 'active', 40);
check('connexion établie des deux côtés', established);

if (established) {
  check('Alice reçoit le média de Bob', Boolean(alice.calls().remoteStream));
  check('Bob reçoit le média d’Alice', Boolean(bob.calls().remoteStream));
  check('Alice a le micro ouvert', alice.calls().micOn);
  check('panneau d’appel affiché chez Alice', alice.html().includes('calls-panel'));
  // Sans ce lecteur, l'appel vocal s'établit (chrono, « En appel ») mais le
  // flux distant n'est joué nulle part — la vidéo, elle, s'entend via son <video>.
  const sinkOf = (html) => html.split('<video').slice(1).map((part) => `<video${part.split('>')[0]}>`).find((tag) => tag.includes('calls-remote-audio'));
  const aliceSink = sinkOf(alice.html());
  const bobSink = sinkOf(bob.html());
  check('appel vocal : Alice entend Bob (lecteur branché)', Boolean(aliceSink));
  check('… le lecteur n’est pas muet', Boolean(aliceSink) && !/\bmuted\b/.test(aliceSink));
  check('appel vocal : Bob entend Alice (lecteur branché)', Boolean(bobSink));
  check('… le lecteur de Bob n’est pas muet', Boolean(bobSink) && !/\bmuted\b/.test(bobSink));
}

/* ------------------------------------------------------------------------ */
console.log('\n[5/7] occupé, raccrocher, annuler\n');

await act(async () => { await carol.calls().startCall(PROFILES.bob.id, 'audio'); });
check('Carol apprend que Bob est occupé', await waitFor(() => carol.calls().endReason === K.END_BUSY, 25));
check('Carol affiche « Occupé »', carol.html().includes('Occupé'));
check('Bob reste en appel', bob.calls().phase, 'active');
check('Carol revenue au calme', await waitFor(() => carol.calls().phase === 'idle', 60));

const summaryCountBefore = alice.sentMessages.length;
await act(async () => { alice.calls().endCall(); });
check('fin d’appel des deux côtés', await waitFor(() => alice.calls().endReason === K.END_HUNG_UP && bob.calls().endReason === K.END_HUNG_UP, 25));
check('trace de l’appel établi déposée', alice.sentMessages.length > summaryCountBefore);
check('Bob n’écrit pas la trace en double', bob.sentMessages.length, 0);
check('retour au calme après l’appel', await waitFor(() => alice.calls().phase === 'idle' && bob.calls().phase === 'idle', 60));

await act(async () => { await alice.calls().startCall(PROFILES.bob.id, 'audio'); });
check('troisième sonnerie chez Bob', await waitFor(() => bob.calls().phase === 'incoming', 25));
await act(async () => { alice.calls().endCall(); });
check('annulation reçue par Bob', await waitFor(() => bob.calls().endReason === K.END_CANCELLED, 25));
check('Alice a annulé', alice.calls().endReason, K.END_CANCELLED);

/* ------------------------------------------------------------------------ */
console.log('\n[6/7] dégradations réelles\n');

// (a) Sonnerie reçue AVANT que la liste d'amis soit chargée (site ouvert à
//     l'instant) : elle ne doit pas disparaître — le pop-up s'affiche dès que
//     la liste arrive.
check('retour au calme avant les dégradations', await waitFor(() => bob.calls().phase === 'idle', 60));
await bob.setFriends({ status: 'loading' });
await settle(2);
await act(async () => { await alice.calls().startCall(PROFILES.bob.id, 'audio'); });
await settle(6);
check('liste d’amis en chargement : la sonnerie ne fait pas sonner', bob.calls().phase, 'idle');
check('… et aucun pop-up ne s’affiche encore', bob.html().includes('calls-backdrop is-incoming'), false);
await bob.setFriends({ status: 'ready' });
const held = await waitFor(() => bob.calls().phase === 'incoming', 25);
check('le pop-up s’affiche dès que la liste arrive', held);
if (held) {
  check('… avec Répondre et Refuser', bob.html().includes('calls-round is-accept') && bob.html().includes('calls-round is-decline'));
  await act(async () => { bob.calls().declineCall(); });
  await settle(4);
}
check('retour au calme', await waitFor(() => alice.calls().phase === 'idle' && bob.calls().phase === 'idle', 60));

// (b) Appel impossible : la raison s'affiche au lieu d'un silence.
await act(async () => { await alice.calls().startCall('user-inconnu', 'audio'); });
await settle(2);
check('appel impossible : un avertissement apparaît', typeof alice.calls().notice, 'string');
check('… il explique la raison', String(alice.calls().notice).includes('ami'));
check('… rendu dans le bandeau', alice.html().includes('calls-notice'));
await act(async () => { alice.calls().dismissNotice(); });
await settle(2);
check('… refermable', alice.calls().notice, null);

// (c) Ami qui semble hors ligne : la présence est une estimation, l'appel
//     reste possible (sinon un seul faux « hors ligne » bloque tout).
await bob.setFriends({ offlinePeers: ['alice'] });
check('ami « hors ligne » : l’appel n’est pas bloqué', bob.calls().blockerFor(PROFILES.alice.id), null);
check('… mais l’avertissement est donné', bob.calls().warningFor(PROFILES.alice.id), 'offline');
await act(async () => { await bob.calls().startCall(PROFILES.alice.id, 'audio'); });
const stillRings = await waitFor(() => alice.calls().phase === 'incoming', 25);
check('l’appel sonne quand même chez Alice', stillRings);
if (stillRings) {
  await act(async () => { alice.calls().declineCall(); });
  await settle(4);
}
await bob.setFriends({ offlinePeers: [] });
check('retour au calme', await waitFor(() => alice.calls().phase === 'idle' && bob.calls().phase === 'idle', 60));

// (d) Un canal de signalisation qui échoue ne doit pas empoisonner la
//     session : la tentative suivante repart.
// Tout se joue en moins de deux secondes : passé ce délai, le nettoyage de
// fin d'appel retire les canaux et masquerait l'empoisonnement.
joinFailures.add(`alice:${K.inboxChannelFor(PROFILES.bob.id)}`);
await act(async () => { await alice.calls().startCall(PROFILES.bob.id, 'audio'); });
await settle(2);
await act(async () => { alice.calls().endCall(); });
await settle(2);
await act(async () => { await alice.calls().startCall(PROFILES.bob.id, 'audio'); });
const recovered = await waitFor(() => bob.calls().phase === 'incoming', 15);
check('après un échec de canal, la sonnerie repart', recovered);
if (recovered) {
  await act(async () => { bob.calls().declineCall(); });
  await settle(4);
}
check('retour au calme avant micro refusé', await waitFor(() => alice.calls().phase === 'idle' && bob.calls().phase === 'idle', 60));

// (e) Micro refusé : l'appel ne doit pas rester figé sur « Appel vocal… »
//     (c'était le bug de `setPhase` asynchrone) et doit dire OÙ régler le
//     micro (iframe, site bloqué, refus ponctuel).
const originalGetUserMedia = dom.window.navigator.mediaDevices.getUserMedia;
const originalPermissions = dom.window.navigator.permissions;
dom.window.navigator.mediaDevices.getUserMedia = async () => {
  throw Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
};
dom.window.navigator.permissions = {
  query: async () => ({ state: 'denied' }),
};
await act(async () => { await alice.calls().startCall(PROFILES.bob.id, 'audio'); });
await settle(4);
check('micro refusé : l’appel échoue', alice.calls().endReason, K.END_FAILED);
check('… avec un détail qui dit où agir (bloqué)', String(alice.calls().endDetail).includes('site') || String(alice.calls().endDetail).includes('Site'));
check('… ne reste pas bloqué en « Appel vocal… »', alice.calls().phase !== 'outgoing');
check('… revient au calme (applyPhase synchrone)', await waitFor(() => alice.calls().phase === 'idle', 60));
check('… aucun événement perdu sur un canal non joint pendant l’échec', faults.length, 0);
// Restaure le micro pour la suite (même si plus rien ne suit, par propreté).
dom.window.navigator.mediaDevices.getUserMedia = originalGetUserMedia;
if (originalPermissions) dom.window.navigator.permissions = originalPermissions;
else delete dom.window.navigator.permissions;

// (f) Permission pourtant ACCORDÉE et capture refusée quand même (en-tête
//     `Permissions-Policy` du site, conteneur tiers) : le message ne doit pas
//     renvoyer le joueur régler ce qui est déjà réglé — c'est exactement la
//     plainte « ça me demande d'activer le micro et la caméra mais c'est
//     déjà fait ».
dom.window.navigator.mediaDevices.getUserMedia = async () => {
  throw Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
};
dom.window.navigator.permissions = {
  query: async () => ({ state: 'granted' }),
};
await act(async () => { await alice.calls().startCall(PROFILES.bob.id, 'audio'); });
await settle(4);
check('micro bloqué par la page : échec annoncé', alice.calls().endReason, K.END_FAILED);
check('… le message dit que les réglages sont déjà corrects', String(alice.calls().endDetail).includes('déjà corrects'));
check('… ne reste pas figé', alice.calls().phase !== 'outgoing');
dom.window.navigator.mediaDevices.getUserMedia = originalGetUserMedia;
if (originalPermissions) dom.window.navigator.permissions = originalPermissions;
else delete dom.window.navigator.permissions;

check('retour au calme final', await waitFor(() => alice.calls().phase === 'idle' && bob.calls().phase === 'idle', 60));

/* ------------------------------------------------------------------------ */
console.log('\n[7/7] intégrité du transport\n');

check('aucun événement émis sur un canal non joint', faults.length, 0);
check('au moins une sonnerie a été reçue', delivered.some((entry) => entry.type === 'ring'));

for (const player of [alice, bob, carol]) {
  // eslint-disable-next-line no-await-in-loop
  await player.unmount();
}

if (failures > 0) {
  console.log(`\n${failures} vérification(s) en échec.`);
  process.exit(1);
}
console.log('\nUn appel complet de bout en bout fonctionne (sonnerie, réponse, média, fin).');
process.exit(0);
