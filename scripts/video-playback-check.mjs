/**
 * Vérification de la règle « une seule vidéo à la fois » — `npm run check:videos`.
 *
 * Trois niveaux de contrôle, sans navigateur :
 *
 *   1. l'URL d'embed partagée contient bien `enablejsapi=1`, sans quoi aucun
 *      lecteur ne peut être mis en pause depuis la page ;
 *   2. aucun composant ne construit son embed YouTube à la main (tous passent
 *      par youTubeEmbedUrl / videoEmbedUrl) ;
 *   3. le coordinateur lui-même, rejoué sur un DOM simulé : quand un lecteur
 *      annonce la lecture, tous les autres reçoivent `pauseVideo` — et le
 *      lecteur qui joue ne reçoit rien.
 *
 * Le protocole postMessage simulé ici est celui d'un vrai embed YouTube
 * (`{"event":"listening"}` en abonnement, `infoDelivery` / `onStateChange` en
 * retour, `{"event":"command","func":"pauseVideo"}` pour couper).
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { youTubeEmbedUrl, initSinglePlayback, pauseAllPlayback } from '../src/lib/videoPlayback.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let failures = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? ` → ${actual}` : ` → ${actual} (attendu : ${expected})`}`);
}

/* ------------------------------------------------------------------ 1. URL */

console.log('\n[1/3] URL d’embed : enablejsapi=1, la condition pour piloter un lecteur\n');
const base = youTubeEmbedUrl('aTs0zhm6Leg');
check('embed standard', base, 'https://www.youtube.com/embed/aTs0zhm6Leg?rel=0&modestbranding=1&enablejsapi=1');
check('enablejsapi présent', new URL(base).searchParams.get('enablejsapi'), '1');
check('autoplay à la demande (modale)', youTubeEmbedUrl('abc', { autoplay: true }).includes('autoplay=1'), true);
check('pas d’autoplay par défaut', base.includes('autoplay'), false);
check('start ignoré si absent', youTubeEmbedUrl('abc', { start: 0 }).includes('start'), false);
check('start conservé si demandé', youTubeEmbedUrl('abc', { start: 389 }).includes('start=389'), true);

/* ------------------------------------------------------- 2. Source du site */

console.log('\n[2/3] tous les lecteurs du site passent par l’URL partagée\n');

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(jsx?|mjs)$/.test(entry.name) ? [full] : [];
  });
}

const allowed = path.join(root, 'src', 'lib', 'videoPlayback.js');
const offenders = sourceFiles(path.join(root, 'src'))
  .filter((file) => file !== allowed)
  .filter((file) => /youtube\.com\/embed|youtube-nocookie\.com\/embed/.test(readFileSync(file, 'utf8')))
  .map((file) => path.relative(root, file));
const offendersInScripts = sourceFiles(path.join(root, 'scripts'))
  .filter((file) => file !== fileURLToPath(import.meta.url))
  .filter((file) => /youtube\.com\/embed|youtube-nocookie\.com\/embed/.test(readFileSync(file, 'utf8')))
  .map((file) => path.relative(root, file));

check('aucun embed YouTube codé en dur hors de src/lib/videoPlayback.js', [...offenders, ...offendersInScripts].join(', ') || 'aucun', 'aucun');

const main = readFileSync(path.join(root, 'src', 'main.jsx'), 'utf8');
const modal = readFileSync(path.join(root, 'src', 'components', 'VideoModal.jsx'), 'utf8');
check('le coordinateur est démarré au lancement de l’app', /initSinglePlayback\(\)/.test(main), true);
check('la modale coupe les lecteurs avant son autoplay', /pauseAllPlayback\(\)/.test(modal), true);

/* --------------------------------------------------- 3. DOM + protocole */

console.log('\n[3/3] coordinateur : un lecteur qui démarre met les autres en pause\n');

const YT = 'https://www.youtube.com';
const YT_NOCOOKIE = 'https://www.youtube-nocookie.com';

function makeFrame(src, { tag = 'IFRAME' } = {}) {
  const listeners = {};
  const frame = {
    tagName: tag,
    nodeType: 1,
    isConnected: true,
    messages: [],
    contentWindow: null,
    getAttribute: (name) => (name === 'src' ? frame.src : null),
    addEventListener: (type, handler) => { (listeners[type] ??= []).push(handler); },
    load() { (listeners.load ?? []).forEach((handler) => handler()); },
  };
  frame.src = src;
  frame.contentWindow = {
    postMessage: (message, origin) => frame.messages.push({ message: JSON.parse(message), origin }),
  };
  return frame;
}

const frames = {
  episode: makeFrame(youTubeEmbedUrl('aTs0zhm6Leg')),
  reel: makeFrame(youTubeEmbedUrl('91eqLm2Hy9k')),
  nocookie: makeFrame(`${YT_NOCOOKIE}/embed/Ze-346WTsI0?rel=0&enablejsapi=1`),
  instagram: makeFrame('https://www.instagram.com/reel/abc/embed/'),
};
const media = [{ paused: false, pauseCalls: 0, pause() { this.pauseCalls += 1; this.paused = true; } }];

const iframes = Object.values(frames);
const messageHandlers = [];
const timers = [];

globalThis.window = {
  location: { href: 'https://lets-play.dz/' },
  HTMLIFrameElement: class {},
  addEventListener: (type, handler) => { if (type === 'message') messageHandlers.push(handler); },
  setTimeout: (handler, delay) => { timers.push({ handler, delay }); return timers.length; },
};
globalThis.document = {
  documentElement: {},
  querySelectorAll: (selector) => (selector === 'iframe' ? iframes.filter((f) => f.isConnected) : media),
};
globalThis.MutationObserver = class {
  observe() {}
  disconnect() {}
};

initSinglePlayback();

const received = (frame, func) => frame.messages.filter((m) => m.message.func === func).length;
const listening = (frame) => frame.messages.filter((m) => m.message.event === 'listening').length;
const lastOrigin = (frame) => frame.messages.at(-1)?.origin;

// Un lecteur annonce sa lecture, comme le fait un embed YouTube après
// l'abonnement : infoDelivery (état dans info.playerState) ou onStateChange.
const emit = (frame, payload, origin = YT) =>
  messageHandlers.forEach((handler) =>
    handler({ origin, source: frame.contentWindow, data: JSON.stringify(payload) }));

check('chaque lecteur YouTube reçoit l’abonnement « listening »', iframes.filter((f) => f !== frames.instagram && listening(f) > 0).length, 3);
check('l’embed Instagram n’est pas suivi', listening(frames.instagram), 0);
check('abonnement renvoyé après le load (récepteur prêt)', (frames.episode.load(), timers.length > 0), true);
timers.splice(0).forEach((timer) => timer.handler());
check('second abonnement après le load', listening(frames.episode) >= 2, true);

emit(frames.episode, { event: 'infoDelivery', info: { playerState: 1, currentTime: 12.4 } });
check('l’épisode joue : le reel reçoit pauseVideo', received(frames.reel, 'pauseVideo'), 1);
check('… le lecteur nocookie aussi, sur sa propre origine', received(frames.nocookie, 'pauseVideo'), 1);
check('… avec la bonne cible (youtube-nocookie.com)', lastOrigin(frames.nocookie), YT_NOCOOKIE);
check('le lecteur qui joue n’est pas mis en pause', received(frames.episode, 'pauseVideo'), 0);
check('les embeds tiers ne sont pas rechargés', frames.instagram.messages.length, 0);
check('les médias HTML5 de la page sont coupés', media[0].pauseCalls, 1);

frames.episode.messages.length = 0;
frames.reel.messages.length = 0;
emit(frames.episode, { event: 'infoDelivery', info: { playerState: 1, currentTime: 13.1 } });
check('état répété (infoDelivery toutes les 250 ms) : aucun ordre renvoyé', frames.reel.messages.length, 0);

emit(frames.reel, { event: 'onStateChange', info: 1 });
check('le reel prend le relais : l’épisode reçoit pauseVideo', received(frames.episode, 'pauseVideo'), 1);
check('… et le lecteur qui joue reste tranquille', received(frames.reel, 'pauseVideo'), 0);

emit(frames.reel, { event: 'infoDelivery', info: { playerState: 3 } });
check('buffering (3) ne déclenche rien', received(frames.episode, 'pauseVideo'), 1);

frames.nocookie.isConnected = false; // modale fermée, navigation…
frames.nocookie.messages.length = 0;
emit(frames.reel, { event: 'onStateChange', info: 2 });
emit(frames.reel, { event: 'onStateChange', info: 1 });
check('un lecteur retiré de la page est oublié', frames.nocookie.messages.length, 0);

pauseAllPlayback();
check('pauseAllPlayback coupe le lecteur en cours', received(frames.reel, 'pauseVideo'), 1);

console.log(`\n  ${failures === 0 ? 'OK' : `${failures} échec(s)`} — une seule vidéo à la fois\n`);
if (failures > 0) process.exitCode = 1;
