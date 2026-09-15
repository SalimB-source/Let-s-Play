/**
 * videoPlayback
 * -------------
 * Deux outils partagés par tous les lecteurs du site :
 *
 *   1. youTubeEmbedUrl() — l'URL d'embed YouTube de référence. Elle ajoute
 *      `enablejsapi=1`, sans quoi un lecteur reste muet et ne peut plus être
 *      piloté depuis la page ;
 *   2. initSinglePlayback() — la règle « une seule vidéo à la fois » : dès
 *      qu'un lecteur démarre, tous les autres sont mis en pause.
 *
 * Fonctionnement du coordinateur (aucun script externe)
 * ----------------------------------------------------
 * Un embed YouTube chargé avec `enablejsapi=1` parle le protocole postMessage
 * utilisé en interne par l'API IFrame :
 *
 *   1. on lui annonce qu'on l'écoute : `{"event":"listening"}` ;
 *   2. il remonte ensuite son état : `{"event":"infoDelivery","info":{"playerState":1}}`
 *      ainsi que `{"event":"onStateChange","info":1}`
 *      (1 = lecture, 2 = pause, 3 = buffering) ;
 *   3. on le pilote : `{"event":"command","func":"pauseVideo","args":[]}`.
 *
 * Le lecteur qui parle est reconnu par `event.source` (la fenêtre de son
 * iframe), ce qui évite tout identifiant à synchroniser. Le coordinateur
 * découvre les iframes YouTube présentes dans le DOM et s'abonne à chacune au
 * moment de son chargement ; un MutationObserver couvre les lecteurs ajoutés
 * plus tard (modale de test, embed reconstruit par useChapterVideo, navigation
 * entre pages).
 *
 * Le chapitrage des dossiers continue de fonctionner : l'API IFrame et ce
 * coordinateur écoutent la même fenêtre, les deux abonnements cohabitent.
 *
 * Les embeds tiers (Instagram, TikTok…) n'exposent aucun protocole de pause :
 * ils ne sont pas rechargés ici, un rechargement relançant leur lecture
 * automatique au lieu de l'arrêter.
 */

const YT_ORIGIN = 'https://www.youtube.com';
const YT_NOCOOKIE_ORIGIN = 'https://www.youtube-nocookie.com';
const YT_ORIGINS = new Set([YT_ORIGIN, YT_NOCOOKIE_ORIGIN]);

// États du lecteur YouTube qui nous intéressent.
const PLAYING = 1;
const PAUSED = 2;

// Lecteurs suivis : iframe → { origin, state }.
const players = new Map();
// Iframes déjà dotées de l'écouteur `load` (évite les doublons si une iframe
// sort puis revient du suivi).
const boundFrames = new WeakSet();

let initialized = false;

/**
 * URL d'embed YouTube du site.
 *
 * @param {string} id identifiant de la vidéo YouTube
 * @param {{autoplay?: boolean, start?: number|null}} [options]
 * @returns {string}
 */
export function youTubeEmbedUrl(id, { autoplay = false, start = null } = {}) {
  const params = new URLSearchParams({ rel: '0', modestbranding: '1', enablejsapi: '1' });
  if (autoplay) params.set('autoplay', '1');
  const seconds = Number(start);
  if (Number.isFinite(seconds) && seconds > 0) params.set('start', String(Math.floor(seconds)));
  return `${YT_ORIGIN}/embed/${id}?${params.toString()}`;
}

/**
 * Origine d'un embed YouTube à partir de son src, ou null si l'iframe n'est pas
 * un lecteur YouTube (l'origine sert de targetOrigin aux postMessage).
 */
function embedOriginOf(src) {
  if (typeof src !== 'string' || !src) return null;
  // Le src des embeds du site est absolu ; la base ne sert qu'à ne pas planter
  // sur un src relatif (et reste absente hors navigateur).
  const pageHref = typeof window !== 'undefined' && window.location ? window.location.href : undefined;
  let url;
  try {
    url = new URL(src, pageHref);
  } catch {
    return null;
  }
  if (!url.pathname.startsWith('/embed/')) return null;
  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
  if (host === 'youtube.com') return YT_ORIGIN;
  if (host === 'youtube-nocookie.com') return YT_NOCOOKIE_ORIGIN;
  return null;
}

function post(frame, entry, message) {
  try {
    frame.contentWindow?.postMessage(message, entry.origin);
  } catch {
    /* lecteur pas encore prêt, ou fenêtre fermée */
  }
}

// Abonnement : c'est ce message qui décide l'embed à nous renvoyer son état.
function subscribe(frame) {
  const entry = players.get(frame);
  if (!entry) return;
  post(frame, entry, '{"event":"listening"}');
}

/**
 * Suit une iframe YouTube : abonnement immédiat (iframe déjà chargée) puis à
 * chaque chargement, car le récepteur de messages de l'embed n'existe qu'une
 * fois son document chargé.
 */
function track(frame) {
  const origin = embedOriginOf(frame.getAttribute('src'));
  if (!origin || players.has(frame)) return;

  players.set(frame, { origin, state: null });

  if (!boundFrames.has(frame)) {
    boundFrames.add(frame);
    frame.addEventListener('load', () => {
      subscribe(frame);
      // L'embed installe son récepteur juste après le load : on renvoie
      // l'abonnement une fois, un peu plus tard, pour ne pas le manquer.
      window.setTimeout(() => subscribe(frame), 600);
    });
  }

  subscribe(frame);
}

// Une iframe déjà suivie change de src (autre vidéo, paramètre ajouté…) : on
// rafraîchit son origine et on se réabonne.
function refresh(frame) {
  const entry = players.get(frame);
  const origin = embedOriginOf(frame.getAttribute('src'));

  if (!entry) {
    if (origin) track(frame);
    return;
  }
  if (!origin) {
    // Ce n'est plus un lecteur YouTube.
    players.delete(frame);
    return;
  }
  entry.origin = origin;
  entry.state = null;
  subscribe(frame);
}

function frameForWindow(win) {
  if (!win) return null;
  for (const frame of players.keys()) {
    try {
      if (frame.contentWindow === win) return frame;
    } catch {
      /* accès cross-origin refusé */
    }
  }
  for (const frame of document.querySelectorAll('iframe')) {
    try {
      if (frame.contentWindow === win) return frame;
    } catch {
      /* accès cross-origin refusé */
    }
  }
  return null;
}

function parseMessage(raw) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// État du lecteur contenu dans un message YouTube, ou null s'il n'y en a pas.
function readState(data) {
  if (data.event === 'onStateChange' && typeof data.info === 'number') return data.info;
  if (data.info && typeof data.info.playerState === 'number') return data.info.playerState;
  return null;
}

function pauseFrame(frame, entry) {
  post(frame, entry, '{"event":"command","func":"pauseVideo","args":[]}');
  // État optimiste : si la pause n'a pas pris, le prochain message du lecteur
  // (playerState 1) relancera l'arrêt des autres lecteurs.
  entry.state = PAUSED;
}

function pauseNativeMedia() {
  document.querySelectorAll('video, audio').forEach((media) => {
    if (!media.paused) media.pause();
  });
}

/**
 * Met en pause tous les lecteurs de la page, sauf `active` (null = tous).
 *
 * La commande est envoyée même aux lecteurs dont l'état est inconnu : une
 * pause sur une vidéo non démarrée ne fait rien, et cela couvre les lecteurs
 * qui n'auraient pas répondu à l'abonnement.
 */
function stopOthers(active = null) {
  for (const [frame, entry] of players) {
    if (frame === active) continue;
    if (!frame.isConnected) {
      players.delete(frame);
      continue;
    }
    pauseFrame(frame, entry);
  }
  pauseNativeMedia();
}

function onMessage(event) {
  if (!YT_ORIGINS.has(event.origin)) return;

  const data = parseMessage(event.data);
  if (!data || typeof data.event !== 'string') return;

  const frame = frameForWindow(event.source);
  if (!frame) return;
  if (!players.has(frame)) track(frame);
  const entry = players.get(frame);
  if (!entry) return;

  const state = readState(data);
  if (state === null || state === entry.state) return; // infoDelivery répète l'état
  entry.state = state;
  if (state === PLAYING) stopOthers(frame);
}

function scan() {
  document.querySelectorAll('iframe').forEach((frame) => track(frame));
  // Lecteurs retirés de la page (navigation, modale fermée…).
  for (const frame of players.keys()) {
    if (!frame.isConnected) players.delete(frame);
  }
}

/**
 * Démarre le coordinateur « une seule vidéo à la fois ». Appelée une fois au
 * démarrage de l'application (src/main.jsx) ; les appels suivants sont ignorés.
 */
export function initSinglePlayback() {
  if (initialized || typeof window === 'undefined' || typeof document === 'undefined') return;
  if (typeof MutationObserver === 'undefined') return;
  initialized = true;

  window.addEventListener('message', onMessage);
  scan();

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        if (mutation.target?.tagName === 'IFRAME') refresh(mutation.target);
        continue;
      }
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.tagName === 'IFRAME') track(node);
        node.querySelectorAll?.('iframe').forEach((frame) => track(frame));
      });
    }
    scan();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src'],
  });
}

/**
 * Met en pause tous les lecteurs de la page. Utile avant d'ouvrir un lecteur
 * dont la lecture automatique peut être bloquée par le navigateur (modale).
 */
export function pauseAllPlayback() {
  if (typeof document === 'undefined') return;
  scan();
  stopOthers(null);
}
