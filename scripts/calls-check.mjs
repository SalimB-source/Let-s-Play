/**
 * Vérification du module d'appels vocaux / vidéo — `npm run check:calls`.
 *
 * 1. Logique pure : configuration ICE (STUN par défaut, TURN par variables
 *    d'environnement), canaux de signalisation, événements broadcast validés
 *    (version, type, appel, destinataire, émetteur), durées lisibles, classe-
 *    ment des erreurs de micro/caméra ; traces d'appel et libellés de blocage
 *    complets dans les trois langues (EN / FR / AR, mêmes clés).
 * 2. Rendu SSR : aucun bouton d'appel ni panneau pour un visiteur ; sur la
 *    page de messagerie d'une persona de démonstration, l'en-tête de
 *    discussion porte les deux boutons d'appel (vocal, vidéo), grisés avec
 *    l'explication « aperçu démo » (pas de WebRTC entre personas) ; aucun
 *    bouton d'appel dans la liste des discussions ; aucun panneau d'appel
 *    tant qu'aucun appel n'est en cours.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'calls-smoke');

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '--ssr', 'scripts/calls-smoke.jsx', '--outDir', path.relative(root, outDir), '--emptyOutDir', '--logLevel', 'error'],
  { cwd: root, stdio: 'inherit' },
);

const smoke = await import(path.join(outDir, 'calls-smoke.js'));
const {
  DEMO_INITIAL_STATE, DEMO_PROFILES,
  END_BUSY, END_DECLINED, END_FAILED, END_HUNG_UP, END_LOST, END_NO_ANSWER,
  CALL_KINDS,
  classifyMediaError, callsCopy, callsText, callBlockLabel, callStatusLabel, callSummaryText,
  createCallId, describeCallError, formatDuration, iceServersFromEnv,
  inboxChannelFor, isCallEvent, makeCallEvent, normalizeCallKind, renderApp,
} = smoke;

let failures = 0;
function check(label, actual, expected = true) {
  const ok = typeof expected === 'function' ? expected(actual) : actual === expected;
  if (ok) console.log(`  ok   ${label}`);
  else { failures += 1; console.log(`  FAIL ${label}\n       reçu : ${JSON.stringify(actual)}`); }
}
function strip(html) { return html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '’').replace(/&amp;/g, '&').replace(/\s+/g, ' '); }

/* ------------------------------------------------------------------------ */
console.log('\n[1/2] logique pure\n');

// Configuration ICE : STUN public livré par défaut, TURN ajouté par env.
const baseIce = iceServersFromEnv({});
check('STUN public par défaut', baseIce.length, 1);
check('… avec deux entrées Google', baseIce[0].urls.length, 2);
check('… sans identifiants', 'username' in baseIce[0], false);
const turnIce = iceServersFromEnv({
  VITE_TURN_URL: 'turn:turn.example.com:3478, turns:turn.example.com:5349',
  VITE_TURN_USERNAME: 'letsplay',
  VITE_TURN_CREDENTIAL: 'secret',
});
check('TURN ajouté par variable d’environnement', turnIce.length, 2);
check('… avec toutes ses URL', turnIce[1].urls.join('|'), 'turn:turn.example.com:3478|turns:turn.example.com:5349');
check('… avec identifiants', [turnIce[1].username, turnIce[1].credential].join('/'), 'letsplay/secret');

// Canaux de signalisation : le canal personnel d'un joueur.
check('canal personnel prévisible', inboxChannelFor('abc'), 'calls:user:abc');

// Identifiants d'appel.
const callId = createCallId();
check('identifiant d’appel non vide', typeof callId === 'string' && callId.length > 8);
check('identifiant d’appel unique', createCallId() !== createCallId());

// Événements de signalisation : version, type, appel, destinataire, émetteur.
const ring = makeCallEvent('ring', { callId, from: 'alice', to: 'bob', kind: 'video' });
check('sonnerie valide acceptée', isCallEvent(ring, 'ring', { to: 'bob' }));
check('… avec sa sorte d’appel', ring.kind, 'video');
check('mauvais destinataire refusé', isCallEvent(ring, 'ring', { to: 'carol' }), false);
check('mauvais type refusé', isCallEvent(ring, 'bye', { to: 'bob' }), false);
check('version manquante refusée', isCallEvent({ ...ring, v: 2 }, 'ring', { to: 'bob' }), false);
check('appel manquant refusé', isCallEvent({ ...ring, callId: '' }, 'ring', { to: 'bob' }), false);
check('identifiant XL refusé', isCallEvent({ ...ring, callId: 'x'.repeat(101) }, 'ring', { to: 'bob' }), false);
check('émetteur inattendu refusé', isCallEvent(ring, 'ring', { to: 'bob', from: 'carol' }), false);
check('émetteur attendu accepté', isCallEvent(ring, 'ring', { to: 'bob', from: 'alice' }));

// Sortes d'appel.
check('« video » est une sorte d’appel', normalizeCallKind('video'), 'video');
check('« audio » est une sorte d’appel', normalizeCallKind('audio'), 'audio');
check('« fax » n’en est pas une', normalizeCallKind('fax'), null);
check('le catalogue porte les deux sortes', CALL_KINDS.join(','), 'audio,video');

// Durées lisibles.
check('zéro seconde', formatDuration(0), '00:00');
check('2 min 14', formatDuration(134 * 1000), '02:14');
check('plus d’une heure', formatDuration(3725 * 1000), '1:02:05');
check('valeur absurde bornée', formatDuration(-4000), '00:00');

// Erreurs de micro / caméra bien classées.
check('permission refusée', classifyMediaError({ name: 'NotAllowedError' }), 'permission');
check('aucun appareil', classifyMediaError({ name: 'NotFoundError' }), 'nodevice');
check('appareil occupé', classifyMediaError({ name: 'NotReadableError' }), 'busy');
check('cause inconnue', classifyMediaError(new Error('boom')), 'generic');
check('message lisible (FR)', describeCallError({ name: 'NotAllowedError' }, callsText('fr')), callsCopy.fr.errPermission);

// Traces d'appel déposées dans la discussion.
check('trace d’un appel abouti (FR)', callSummaryText(callsText('fr'), 'video', 'connected', '02:14'), '📞 Appel vidéo · 02:14');
check('trace d’un refus (EN)', callSummaryText(callsText('en'), 'audio', 'declined'), '📞 Audio call declined');
check('trace d’un appel sans réponse (AR)', callSummaryText(callsText('ar'), 'video', 'missed').includes('بلا رد'));
check('trace d’un appel vers un occupé (FR)', callSummaryText(callsText('fr'), 'audio', 'busy'), '📞 Appel audio — occupé');
check('sortie inconnue → « sans réponse »', callSummaryText(callsText('fr'), 'audio', 'zzz'), '📞 Appel audio sans réponse');

// Libellés de blocage des boutons d'appel.
const fr = callsText('fr');
check('appelable → pas d’infobulle', callBlockLabel(null, fr), null);
check('ami hors ligne nommé', callBlockLabel('offline', fr, 'Salim').includes('Salim'));
check('aperçu démo expliqué', callBlockLabel('demo', fr), callsCopy.fr.reasonDemo);
check('raison inconnue → message prudent', callBlockLabel('zzz', fr), callsCopy.fr.reasonSupabase);

// Ligne d'état du panneau d'appel, pour chaque phase.
check('sonnerie sortante vidéo (FR)', callStatusLabel(fr, { phase: 'outgoing', kind: 'video' }), 'Appel vidéo…');
check('connexion (FR)', callStatusLabel(fr, { phase: 'connecting', kind: 'audio' }), 'Connexion…');
check('en appel (FR)', callStatusLabel(fr, { phase: 'active', kind: 'audio' }), 'En appel');
check('refusé (FR)', callStatusLabel(fr, { phase: 'ended', kind: 'audio', endReason: END_DECLINED }), 'Appel refusé');
check('occupé (FR)', callStatusLabel(fr, { phase: 'ended', kind: 'audio', endReason: END_BUSY }), 'Occupé');
check('sans réponse (FR)', callStatusLabel(fr, { phase: 'ended', kind: 'audio', endReason: END_NO_ANSWER }), 'Sans réponse');
check('raccroché (FR)', callStatusLabel(fr, { phase: 'ended', kind: 'audio', endReason: END_HUNG_UP }), 'Appel terminé');
check('connexion perdue (FR)', callStatusLabel(fr, { phase: 'ended', kind: 'video', endReason: END_LOST }), 'Connexion perdue');
check('échec de démarrage (FR)', callStatusLabel(fr, { phase: 'ended', kind: 'audio', endReason: END_FAILED }), 'L’appel n’a pas pu démarrer');

// Textes complets dans les trois langues : mêmes clés partout.
const keys = (set) => Object.keys(set).sort().join(',');
check('textes EN / FR alignés', keys(callsCopy.fr), keys(callsCopy.en));
check('textes EN / AR alignés', keys(callsCopy.ar), keys(callsCopy.en));
check('les textes ne sont pas vides', Object.values(callsCopy.fr).every((value) => String(value).length > 0));

/* ------------------------------------------------------------------------ */
console.log('\n[2/2] rendu SSR\n');

// Un visiteur non connecté ne voit ni bouton ni panneau d'appel.
const guest = renderApp('/auth', { lang: 'fr' });
check('visiteur : aucun panneau d’appel', guest.includes('calls-backdrop'), false);
check('visiteur : aucun bouton d’appel', guest.includes('aria-label="Appel vocal"'), false);

// Persona de démonstration : les boutons existent dans l'en-tête de
// discussion, mais la démo n'a pas de vrai correspondant — grisés, avec
// l'explication au survol.
const friendId = DEMO_INITIAL_STATE.pixel.friends[0];
const thread = renderApp(`/messages/${encodeURIComponent(friendId)}`, { lang: 'fr', demoKey: 'pixel', dockOpen: true, activePeer: friendId });
check('démo : bouton « Appel vocal » dans l’en-tête', thread.includes('aria-label="Appel vocal"'));
check('démo : bouton « Appel vidéo » dans l’en-tête', thread.includes('aria-label="Appel vidéo"'));
check('démo : boutons grisés (pas de WebRTC entre personas)', /aria-label="Appel vocal"[^>]*disabled|disabled[^>]*aria-label="Appel vocal"/.test(thread));
// L'infobulle vit dans l'attribut `title` : on vérifie le HTML brut (strip
// ne garde que le texte des nœuds).
check('démo : l’infobulle explique l’aperçu démo', thread.includes('Les appels ne sont pas disponibles dans l’aperçu démo'));
check('démo : pas de panneau d’appel tant que personne n’appelle', thread.includes('calls-backdrop'), false);

// La liste des discussions n'embarque pas les boutons d'appel : ils vivent
// dans l'en-tête de discussion, pas dans chaque ligne.
const inbox = renderApp('/messages', { lang: 'fr', demoKey: 'pixel', dockOpen: true });
check('démo : liste sans bouton d’appel', inbox.includes('aria-label="Appel vocal"'), false);
check('démo : la liste s’affiche toujours', inbox.includes('aria-label="Appel vocal"'), false);

// La page existe aussi en anglais et en arabe : les libellés suivent.
const threadEn = renderApp(`/messages/${encodeURIComponent(friendId)}`, { lang: 'en', demoKey: 'pixel', dockOpen: true, activePeer: friendId });
check('démo : libellés anglais', threadEn.includes('aria-label="Voice call"'));
const threadAr = renderApp(`/messages/${encodeURIComponent(friendId)}`, { lang: 'ar', demoKey: 'pixel', dockOpen: true, activePeer: friendId });
check('démo : libellés arabes', threadAr.includes('aria-label="مكالمة صوتية"'));
check('démo : infobulle arabe', threadAr.includes('المعاينة التجريبية'));

// Le joueur `pixel` lui-même n'est jamais appelable (pas soi-même).
const pixelId = DEMO_PROFILES.pixel.id;
const selfThread = renderApp(`/messages/${encodeURIComponent(pixelId)}`, { lang: 'fr', demoKey: 'pixel', dockOpen: true, activePeer: pixelId });
// Face à soi-même, les boutons existent mais sont grisés (on ne s'appelle pas).
check('démo : jamais appelable soi-même (bouton grisé)', /aria-label="Appel vocal"[^>]*disabled|disabled[^>]*aria-label="Appel vocal"/.test(selfThread));
check('démo : l’infobulle renvoie à l’amitié', selfThread.includes(callsCopy.fr.reasonFriends));

/* ------------------------------------------------------------------------ */

if (failures > 0) {
  console.log(`\n${failures} vérification(s) en échec.`);
  process.exit(1);
}
console.log('\nToutes les vérifications des appels vocaux/vidéo passent.');
