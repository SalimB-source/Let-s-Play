/**
 * Logique pure des appels vocaux / vidéo (1-à-1 entre amis).
 * ---------------------------------------------------------
 * Tout ce qui peut se tester sans navigateur ni DOM vit ici : configuration
 * ICE (STUN public + TURN optionnel), identifiants et canaux de signalisation,
 * validation des événements diffusés par Supabase Realtime, durées lisibles et
 * classification des erreurs du micro / de la caméra.
 *
 * La machine à rendre un appel possible tient en trois morceaux :
 *
 *   - `CallsContext.jsx` porte l'état (sonnerie, connexion, actif…) et le
 *     moteur WebRTC (`RTCPeerConnection` + `getUserMedia`) ;
 *   - la **signalisation** (sonnerie, réponse, offre/réponse SDP, candidats
 *     ICE, raccrocher) passe par des **canaux Broadcast** Supabase — aucune
 *     table de plus, aucun serveur en plus : `inboxChannelFor(uid)` est le
 *     canal personnel de chaque joueur connecté, écouté en permanence, et on
 *     n'envoie jamais que sur le canal du **destinataire** ;
 *   - les médias (voix, image) voyagent en **pair-à-pair** direct : Supabase
 *     ne voit que la signalisation, jamais le son ni la vidéo.
 *
 * Ce module est importé par le script de vérification (`npm run
 * check:calls`) : il ne doit rien référencer de navigateur.
 */

/** Les deux formes d'appel. */
export const CALL_KINDS = ['audio', 'video'];

/** Phases de l'état d'appel exposé par le contexte. */
export const CALL_PHASES = ['idle', 'incoming', 'outgoing', 'connecting', 'active', 'ended'];

/** Raisons de fin (affichées puis remisées ; `null` = appel raccroché normalement). */
export const END_DECLINED = 'declined';
export const END_BUSY = 'busy';
export const END_NO_ANSWER = 'no-answer';
export const END_CANCELLED = 'cancelled';
export const END_HUNG_UP = 'hung-up';
export const END_LOST = 'lost';
export const END_FAILED = 'failed';

/** Raisons d'indisponibilité des boutons d'appel (`blockerFor`). */
export const CALL_BLOCKERS = ['auth', 'supabase', 'demo', 'insecure', 'nowebrtc', 'busy', 'blocked', 'friends', 'offline'];

/** Types d'événements diffusés sur les canaux de signalisation. */
export const CALL_EVENTS = ['ring', 'cancel', 'reply', 'sdp', 'ice', 'bye'];

/** Délais (ms) du scénario d'appel. */
export const OUTGOING_TIMEOUT_MS = 30 * 1000; // sonnerie sans réponse (côté appelant)
export const INCOMING_TIMEOUT_MS = 35 * 1000; // appel entrant ignoré (côté appelé)
export const CONNECT_TIMEOUT_MS = 25 * 1000;  // accepté mais la connexion P2P ne prend pas
export const DISCONNECT_GRACE_MS = 6 * 1000;  // coupure brève : on laisse le réseau se refaire
export const ENDED_TOAST_MS = 2600;           // affichage du motif de fin avant retour au calme
export const RING_DEDUP_MS = 12 * 1000;       // même sonnerie rejouée par le réseau → ignorée
export const CHANNELS_DROP_DELAY_MS = 2000;   // fin d'appel : on laisse partir « bye »/« cancel » avant de quitter les canaux

/** STUN publics de Google : gratuits, suffisants derrière la plupart des box. */
const DEFAULT_STUN_URLS = ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'];

/**
 * Serveurs ICE pour `RTCPeerConnection`. Le STUN est livré par défaut ; un
 * serveur **TURN** (relais, indispensable derrière les NAT des opérateurs
 * mobiles) s'ajoute par variables d'environnement, lues au build :
 *
 *   - `VITE_TURN_URL` : une ou plusieurs URL, séparées par des virgules
 *     (`turn:turn.example.com:3478`, `turns:…`…) ;
 *   - `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL` : identifiants (facultatifs).
 */
export function iceServersFromEnv(env = (typeof import.meta !== 'undefined' ? import.meta.env : {}) || {}) {
  const servers = [{ urls: DEFAULT_STUN_URLS }];
  const raw = String(env?.VITE_TURN_URL || '').trim();
  if (raw) {
    const urls = raw.split(',').map((url) => url.trim()).filter(Boolean);
    if (urls.length > 0) {
      const server = { urls };
      const username = String(env?.VITE_TURN_USERNAME || '').trim();
      const credential = String(env?.VITE_TURN_CREDENTIAL || '').trim();
      if (username) server.username = username;
      if (credential) server.credential = credential;
      servers.push(server);
    }
  }
  return servers;
}

/** Identifiant d'appel : UUID quand la plateforme le fournit, tirage sinon. */
export function createCallId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (e) { /* vieux navigateur : le tirage ci-dessous suffit */ }
  return `call-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Normalise une sorte d'appel reçue de l'extérieur ; `null` si inconnue. */
export function normalizeCallKind(kind) {
  return CALL_KINDS.includes(kind) ? kind : null;
}

/**
 * Canal de signalisation **personnel** d'un joueur : il l'écoute en permanence
 * dès qu'il est connecté (sonneries entrantes) et c'est là qu'on lui envoie
 * tout ce qui lui est destiné. Nom sans secret mais événements filtrés : un
 * canal n'agit que si `to` vise bien son propriétaire et si le lien d'amitié
 * est réel (vérifié côté destinataire, dans le contexte).
 */
export function inboxChannelFor(uid) {
  return `calls:user:${uid}`;
}

/** Construit un événement de signalisation complet. */
export function makeCallEvent(type, { callId, from, to, ...extra }) {
  return { v: 1, t: type, callId, from, to, ...extra };
}

/**
 * Vrai si `payload` est bien un événement `type` destiné à `to` (identifiant
 * du destinataire attendu) envoyé par `from` (identifiant de l'interlocuteur
 * attendu, quand on est en appel). Tout le reste est ignoré : un canal public
 * ne fait foi que si chaque événement est contrôlé.
 */
export function isCallEvent(payload, type, { to, from = null } = {}) {
  return Boolean(payload)
    && payload.v === 1
    && payload.t === type
    && typeof payload.callId === 'string' && payload.callId.length > 0 && payload.callId.length <= 100
    && typeof payload.from === 'string' && payload.from.length > 0
    && (to == null || payload.to === to)
    && (from == null || payload.from === from);
}

/** Durée lisible : « 02:14 » (et « 1:02:05 » au-delà d'une heure). */
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const two = (value) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${two(minutes)}:${two(seconds)}` : `${two(minutes)}:${two(seconds)}`;
}

/**
 * Classe une erreur de `getUserMedia` pour afficher le bon message :
 * permission refusée, aucun appareil, appareil occupé (autre application),
 * contexte non sécurisé ou cause inconnue.
 */
export function classifyMediaError(error) {
  const name = String(error?.name || '');
  if (name === 'NotAllowedError' || name === 'SecurityError' || error?.code === 1) return 'permission';
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || error?.code === 0) return 'nodevice';
  if (name === 'NotReadableError' || name === 'AbortError' || error?.code === 2) return 'busy';
  return 'generic';
}
