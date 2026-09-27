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

/**
 * Raisons qui EMPÊCHENT un appel (`blockerFor`) : le bouton est grisé.
 *
 * La présence en ligne n'en fait volontairement PAS partie : c'est une
 * estimation (canal de présence ou dernier passage vu) et un faux « hors
 * ligne » rendrait l'appel impossible alors que l'ami est là. Elle devient un
 * simple avertissement (`warningFor`) et un appel sans réponse conclut
 * « Sans réponse », comme dans toute messagerie.
 */
export const CALL_BLOCKERS = ['auth', 'supabase', 'demo', 'insecure', 'nowebrtc', 'busy', 'blocked', 'friends'];

/** Avertissements qui n'empêchent pas d'appeler (`warningFor`). */
export const CALL_WARNINGS = ['offline'];

/** Décisions prises à la réception d'une sonnerie (`ringDecision`). */
export const RING_RING = 'ring';     // l'appel entrant s'affiche
export const RING_WAIT = 'wait';     // la liste d'amis arrive : on garde la sonnerie
export const RING_IGNORE = 'ignore'; // inconnu, bloqué, soi-même : silence

/** Types d'événements diffusés sur les canaux de signalisation. */
export const CALL_EVENTS = ['ring', 'cancel', 'reply', 'sdp', 'ice', 'bye', 'media'];

/** Délais (ms) du scénario d'appel. */
export const OUTGOING_TIMEOUT_MS = 30 * 1000; // sonnerie sans réponse (côté appelant)
export const INCOMING_TIMEOUT_MS = 35 * 1000; // appel entrant ignoré (côté appelé)
export const CONNECT_TIMEOUT_MS = 25 * 1000;  // accepté mais la connexion P2P ne prend pas
export const DISCONNECT_GRACE_MS = 6 * 1000;  // coupure brève : on laisse le réseau se refaire
export const ENDED_TOAST_MS = 2600;           // affichage du motif de fin avant retour au calme
export const NOTICE_MS = 4200;                // durée d'un avertissement (appel impossible…)
export const RING_HOLD_MS = 12 * 1000;        // sonnerie gardée le temps que la liste d'amis arrive
export const RING_DEDUP_MS = 12 * 1000;       // même sonnerie rejouée par le réseau → ignorée
export const CHANNELS_DROP_DELAY_MS = 2000;   // fin d'appel : on laisse partir « bye »/« cancel » avant de quitter les canaux
export const CHANNEL_JOIN_TIMEOUT_MS = 6000;  // attente de la jointure d'un canal de signalisation

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

/**
 * Un relais TURN est-il configuré au build ? Sert à expliquer un échec de
 * connexion : derrière un NAT strict (4G/5G, Wi-Fi d'hôtel, CGNAT), le STUN
 * seul ne suffit pas et seul un relais laisse passer les médias.
 */
export function turnConfigured(env = (typeof import.meta !== 'undefined' ? import.meta.env : {}) || {}) {
  return Boolean(String(env?.VITE_TURN_URL || '').trim());
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
 * Sorte d'appel RÉELLEMENT obtenue : on demandait de la vidéo mais le flux
 * capturé n'a aucune piste vidéo ? Alors l'appel est en réalité un appel
 * audio. Ce cas paraît théorique, il ne l'est pas :
 *
 *   - la WebView Android peut répondre à `getUserMedia({audio, video})` avec
 *     un **accord partiel** (micro accordé, caméra refusée) : la promesse
 *     résout avec un flux sans AUCUNE piste vidéo, sans erreur ;
 *   - certains navigateurs anciens résolvent aussi sans la piste demandée.
 *
 * Sans ce contrôle, l'appel reste « vidéo » dans l'interface (boutons caméra,
 * attente d'une image) alors qu'aucune image n'existe ni n'arrivera jamais :
 * c'est exactement la plainte « l'appel semble marcher mais l'image ne
 * s'affiche pas ». Le résultat sert à dégrader l'appel en audio EN
 * EXPLIQUANT pourquoi (voir `acquireMedia` dans `CallsContext`).
 */
export function effectiveStreamKind(wantedKind, stream) {
  const wanted = normalizeCallKind(wantedKind) || 'audio';
  if (wanted !== 'video') return 'audio';
  const tracks = typeof stream?.getVideoTracks === 'function' ? stream.getVideoTracks() : [];
  return tracks.length > 0 ? 'video' : 'audio';
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

/**
 * Que faire d'une sonnerie reçue ?
 *
 * Trois issues, parce que « pas encore ami » et « pas encore SAVOIR si c'est
 * un ami » ne sont pas la même chose :
 *
 *   - `ring`   : l'expéditeur est un ami non bloqué → le pop-up s'affiche ;
 *   - `wait`   : la liste d'amis n'est pas encore chargée (ouverture du site,
 *     connexion toute fraîche) — jeter la sonnerie ici la perdrait pour de
 *     bon, on la garde et on rejoue la décision dès que la liste est là ;
 *   - `ignore` : bloqué, inconnu une fois la liste chargée, ou soi-même.
 */
export function ringDecision({ from, me, relationKind = null, blocked = false, friendsReady = true } = {}) {
  if (!from || from === me) return RING_IGNORE;
  if (blocked) return RING_IGNORE;
  if (relationKind === 'friend') return RING_RING;
  if (!friendsReady) return RING_WAIT;
  return RING_IGNORE;
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

/**
 * La page est-elle embarquée dans une iframe ? Un `allow=\"microphone\"`\n * manquant sur l'iframe bloque `getUserMedia` par construction, même si le\n * joueur clique sur « Autoriser ».\n */
export function isEmbedded() {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Quatre causes, quatre réglages quand le micro est refusé :\n *\n *   - page dans une iframe sans `allow=\"microphone\"` → `iframe` ;\n *   - micro déjà bloqué pour l'origine (le navigateur ne redemande plus rien)\n *     → `blocked` ;\n *   - permission pourtant ACCORDÉE et capture refusée quand même → `policy` :
 *     c'est la page elle-même qui n'en a pas le droit (en-tête
 *     `Permissions-Policy` du site, conteneur tiers) — les réglages du joueur
 *     sont déjà corrects, il ne faut pas le renvoyer les régler ;
 *   - refus au moment de la demande → `denied`.\n *\n * `permissionState` vient de `navigator.permissions.query({name:'microphone'})`\n * (`granted` / `denied` / `prompt` / null si indisponible).\n */
export function permissionFailureKind({ embedded = false, permissionState = null } = {}) {
  if (embedded) return 'iframe';
  if (permissionState === 'denied') return 'blocked';
  if (permissionState === 'granted') return 'policy';
  return 'denied';
}

/**
 * Faut-il un lecteur dédié pour entendre l'ami ?
 *
 * L'appel vidéo affiche déjà un `<video>` non muet : il porte l'image ET la
 * voix. Un appel vocal n'a pas d'image — si le flux distant n'est branché sur
 * aucun élément média, la connexion s'établit (chrono, « En appel ») mais
 * personne n'entend rien. C'est le symptôme « la vidéo marche, le vocal non ».
 *
 * `hasRemotePicture` : un `<video>` distant est déjà à l'écran et joue le son.
 */
export function remotePlaybackNeedsSink(hasRemotePicture) {
  return !hasRemotePicture;
}
