/**
 * Vérification du module messagerie — `npm run check:messages`.
 *
 * 1. Logique pure : les lignes `direct_messages` deviennent bien des
 *    discussions (les deux sens regroupés, tri chronologique, non-lus
 *    comptés, dernier message) ; les clés de conversation sont symétriques et
 *    sans caractère réservé ; la saisie est nettoyée et bornée ; l'accusé de
 *    lecture et les messages reçus en direct se fondent dans l'état sans
 *    doublon ; les erreurs du trigger sont reconnues.
 * 2. Aperçu de démonstration : les discussions de départ ne citent que des
 *    amis existants, jamais soi-même ; il y a des non-lus et des discussions
 *    lues ; les réponses scriptées sont déterministes ; les messages scriptés
 *    arrivent à échéance, une seule fois ; bloquer / signaler sont réversibles
 *    et sans effet de bord.
 *
 * Les pseudos s'affichent en majuscules partout dans la messagerie
 * (`pseudoLabel`) : la conversion est vérifiée sur la casse mixte, les accents,
 * les espaces de bord et les pseudos absents, et les deux vues de messagerie
 * sont rendues avec un pseudo en casse mixte.
 * 3. Rendu SSR : le hub /auth et un profil public se rendent dans les trois
 *    langues ; le lanceur reste visible pour un visiteur et l'envoie vers
 *    la page de connexion, sans ouvrir les conversations ; pour un joueur
 *    connecté, la fenêtre sociale ouverte sur la messagerie montre la
 *    liste des discussions puis la discussion en cours (bulles + champ de
 *    saisie) ; le bouton « Message » d'un profil ami est rendu, et propose la
 *    connexion à un visiteur. Le hub, lui, ne porte plus AUCUN raccourci de
 *    messagerie : ses seules sections sociales sont la liste d'amis et la
 *    fenêtre sociale (ou la page /messages sur mobile).
 * 4. DOM : clic sur « Effacer la conversation » dans la page, annulation puis
 *    confirmation, disparition des bulles et persistance au rechargement.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'messages-smoke');

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '--ssr', 'scripts/messages-smoke.jsx', '--outDir', path.relative(root, outDir), '--emptyOutDir', '--logLevel', 'error'],
  { cwd: root, stdio: 'inherit' },
);

const smoke = await import(path.join(outDir, 'messages-smoke.js'));
const {
  DEMO_INCOMING, DEMO_INITIAL_STATE, DEMO_PROFILES, DEMO_REPLIES, DEMO_THREADS,
  MESSAGE_MAX_LENGTH, REPORT_REASONS,
  appendMessage, applyDemoBlock, applyDemoClear, applyDemoIncoming, applyDemoRead, applyDemoReply,
  applyDemoReport, applyDemoSend, applyDemoUnblock, applyReadReceipt,
  clearThreadLocal, conversationKey, demoReplyFor, demoThreads, describeMessagesError, describeSupabaseError,
  dueDemoIncoming, friendsCopy,
  isAfterClear, isBlockedError, isMissingMessagesTable, isRateLimitedError, isRequiresFriendshipError,
  makeStorage, markThreadReadLocal, mergeUnread, messagesCopy, normalizeMessage, peersFromKey,
  prepareBody, pseudoLabel, readDemoMessages, reasonLabel, seedDemoThreadState, socialCopy,
  sortThreadsByActivity, threadsFromRows, totalUnread, unreadFromRows, writeDemoMessages,
  checkClearInteraction, findDemoPlayer, renderApp, renderInboxView, renderThreadView, callsText,
} = smoke;

let failures = 0;
function check(label, actual, expected = true) {
  const ok = typeof expected === 'function' ? expected(actual) : actual === expected;
  if (ok) console.log(`  ok   ${label}`);
  else { failures += 1; console.log(`  FAIL ${label}\n       reçu : ${JSON.stringify(actual)}`); }
}
function strip(html) { return html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '’').replace(/&amp;/g, '&').replace(/\s+/g, ' '); }

/* ------------------------------------------------------------------------ */
console.log('\n[1/4] logique pure\n');

const me = 'aaaaaaaa-0000-0000-0000-000000000001';
const bob = 'bbbbbbbb-0000-0000-0000-000000000002';
const carol = 'cccccccc-0000-0000-0000-000000000003';
const dave = 'dddddddd-0000-0000-0000-000000000004';
const bobKey = conversationKey(me, bob);
const carolKey = conversationKey(me, carol);

check('clé de conversation symétrique', conversationKey(bob, me), bobKey);
check('clé ordonnée (plus petit uuid d’abord)', bobKey, `${me}_${bob}`);
check('pas de clé avec soi-même', conversationKey(me, me), null);
check('pas de clé sans interlocuteur', conversationKey(me, ''), null);
check('les deux joueurs d’une clé', peersFromKey(bobKey).join(','), `${me},${bob}`);
check('clé sans caractère réservé par PostgREST', /^[0-9a-f-]+_[0-9a-f-]+$/.test(bobKey));

// Les lignes arrivent dans le désordre : le fil doit être retrié.
const rows = [
  { id: 'm3', conversation_key: bobKey, sender_id: bob, recipient_id: me, body: 'On joue ?', created_at: '2026-01-01T10:03:00Z', read_at: null },
  { id: 'm1', conversation_key: bobKey, sender_id: bob, recipient_id: me, body: 'Salut !', created_at: '2026-01-01T10:00:00Z', read_at: null },
  { id: 'm2', conversation_key: bobKey, sender_id: me, recipient_id: bob, body: 'Yo', created_at: '2026-01-01T10:01:00Z', read_at: '2026-01-01T10:02:00Z' },
  { id: 'm4', conversation_key: carolKey, sender_id: carol, recipient_id: me, body: 'Hello', created_at: '2026-01-01T09:00:00Z', read_at: '2026-01-01T09:01:00Z' },
  { id: 'm5', conversation_key: conversationKey(carol, dave), sender_id: carol, recipient_id: dave, body: 'hors sujet', created_at: '2026-01-01T08:00:00Z', read_at: null },
];
const threads = threadsFromRows(rows, me);

check('les deux sens d’un échange = une seule discussion', Object.keys(threads).length, 2);
check('un échange entre deux autres joueurs est ignoré', threads[dave] === undefined);
check('fil remis dans l’ordre chronologique', threads[bob].messages.map((message) => message.id).join(','), 'm1,m2,m3');
check('mon message / le sien', [threads[bob].messages[0].mine, threads[bob].messages[1].mine, threads[bob].messages[2].mine].join(','), 'false,true,false');
check('non-lus = reçus et non ouverts', threads[bob].unread, 2);
check('discussion entièrement lue → 0 non-lu', threads[carol].unread, 0);
check('dernier message du fil', threads[bob].lastMessage.id, 'm3');
check('horodatage de la discussion', threads[bob].lastAt, '2026-01-01T10:03:00Z');
check('une ligne seule se normalise', normalizeMessage(rows[1], me).peerId, bob);
check('ligne d’un autre joueur → rien', normalizeMessage(rows[4], me), null);
check('total des non-lus', totalUnread(threads), 2);

const counts = unreadFromRows([
  { id: 'm1', sender_id: bob }, { id: 'm3', sender_id: bob }, { id: 'm6', sender_id: dave },
], me);
check('non-lus comptés par expéditeur', JSON.stringify(counts), JSON.stringify({ [bob]: 2, [dave]: 1 }));
const merged = mergeUnread(threads, counts, me);
check('un joueur sans message chargé garde son badge', merged[dave].unread, 1);
check('… avec une discussion vide', merged[dave].messages.length, 0);
check('clé de conversation reconstruite', merged[dave].key, conversationKey(me, dave));

const sorted = sortThreadsByActivity([
  { peerId: 'x', lastAt: null },
  { peerId: bob, lastAt: '2026-01-01T10:03:00Z' },
  { peerId: carol, lastAt: '2026-01-01T09:00:00Z' },
]);
check('les discussions récentes d’abord, les vides en dernier', sorted.map((entry) => entry.peerId).join(','), `${bob},${carol},x`);

const read = markThreadReadLocal(threads, bob);
check('ouverture de la discussion → plus de non-lus', read[bob].unread, 0);
check('… et les messages passent en lus', read[bob].messages.every((message) => message.read));
check('les autres discussions ne bougent pas', read[carol], threads[carol]);
check('marquer une discussion inconnue → état inchangé', markThreadReadLocal(threads, 'zzz'), threads);

const incoming = appendMessage(threads, me, {
  id: 'm7', conversation_key: bobKey, sender_id: bob, recipient_id: me, body: 'Toujours là ?', created_at: '2026-01-01T10:05:00Z', read_at: null,
});
check('message reçu en direct → ajouté au fil', incoming[bob].messages.length, 4);
check('… et compté dans les non-lus', incoming[bob].unread, 3);
check('… en dernier', incoming[bob].lastMessage.id, 'm7');
check('message déjà présent → rien ne change', appendMessage(incoming, me, rows[0]), incoming);

const sent = appendMessage(threads, me, {
  id: 'm8', conversation_key: bobKey, sender_id: me, recipient_id: bob, body: 'J’arrive', created_at: '2026-01-01T10:06:00Z', read_at: null,
});
check('mon message envoyé n’est pas un non-lu', sent[bob].unread, threads[bob].unread);
const receipted = applyReadReceipt(sent, { id: 'm8', read_at: '2026-01-01T10:07:00Z' });
check('accusé de lecture → « vu »', receipted[bob].messages.find((message) => message.id === 'm8').read, true);
check('accusé inconnu → état inchangé', applyReadReceipt(sent, { id: 'zzz', read_at: 'x' }), sent);

// Effacer pour soi : le fil, son aperçu et son badge disparaissent, mais ni
// l'autre conversation ni la copie de l'interlocuteur ne sont modifiées.
const bobView = threadsFromRows(rows, bob);
const cleared = clearThreadLocal(threads, bob);
check('effacement local → fil retiré', cleared[bob] === undefined);
check('effacement local → les non-lus disparaissent', totalUnread(cleared), 0);
check('effacement local → autre conversation intacte', cleared[carol], threads[carol]);
check('effacement local → copie de l’autre joueur intacte', bobView[me].messages.length, 3);
check('effacement d’un fil inexistant → inchangé', clearThreadLocal(threads, 'zzz'), threads);
const clearedAt = '2026-01-01T10:04:00.123456+00:00';
check('un ancien message reçu en retard reste masqué', appendMessage(cleared, me, rows[0], { [bob]: clearedAt }), cleared);
check('comparaison précise avant la microseconde du repère', isAfterClear('2026-01-01T10:04:00.123455Z', clearedAt), false);
check('comparaison précise après la microseconde du repère', isAfterClear('2026-01-01T10:04:00.123457Z', clearedAt));
const resumed = appendMessage(cleared, me, {
  id: 'm9', sender_id: bob, recipient_id: me, body: 'Nouveau message',
  created_at: '2026-01-01T10:05:00Z', read_at: null,
}, { [bob]: clearedAt });
check('nouveau message après effacement → visible', resumed[bob].messages.map((message) => message.id).join(','), 'm9');
check('nouveau message après effacement → non-lu', resumed[bob].unread, 1);
check('l’ancien historique ne revient pas avec le nouveau message', resumed[bob].lastMessage.id, 'm9');

check('saisie nettoyée', prepareBody('   salut   '), 'salut');
check('retours Windows normalisés', prepareBody('a\r\nb'), 'a\nb');
check('sauts de ligne répétés réduits', prepareBody('a\n\n\n\nb'), 'a\n\nb');
check('message borné à la contrainte SQL', prepareBody('x'.repeat(MESSAGE_MAX_LENGTH + 400)).length, MESSAGE_MAX_LENGTH);
check('saisie vide → rien à envoyer', prepareBody('   \n\t '), '');
check('émoji tronqué sans demi-caractère', prepareBody('a' + '😀'.repeat(600)).length, 999);

check('table absente reconnue', isMissingMessagesTable({ code: '42P01' }));
check('… ou par le message PostgREST', isMissingMessagesTable({ message: 'Could not find the table \'public.direct_messages\' in the schema cache' }));
check('blocage reconnu', isBlockedError({ message: 'direct_message_blocked' }));
check('amitié requise reconnue', isRequiresFriendshipError({ message: 'direct_message_requires_friendship' }));
check('anti-spam reconnu', isRateLimitedError({ message: 'direct_message_rate_limited' }));
check('une autre erreur n’est pas un blocage', isBlockedError({ message: 'connection reset' }), false);
check('RPC non déployé → consigne de relancer le SQL', describeMessagesError({
  code: 'PGRST202', message: 'Could not find the function public.clear_direct_conversation(target_id)',
}, messagesCopy.fr), messagesCopy.fr.errClearUnavailable);

// Description des erreurs Supabase : le diagnostic et les logs s'appuient sur
// une forme plate, car `console.error(erreur)` perd `code`/`status`/`details`.
const describedStorage = describeSupabaseError({ message: 'The object was not found', error: 'not_found', statusCode: '404' });
check('erreur storage : statusCode devient status', describedStorage.status, 404);
check('erreur storage : message conservé', describedStorage.message, 'The object was not found');
check('erreur storage : champ error conservé', describedStorage.error, 'not_found');
const describedPostgrest = describeSupabaseError({ code: 'P0001', message: 'direct_message_requires_friendship', details: null, hint: null });
check('erreur postgrest : code conservé', describedPostgrest.code, 'P0001');
check('erreur postgrest : pas de status inventé', describedPostgrest.status, null);
const describedNested = describeSupabaseError(new Error('outer', { cause: { message: 'inner', code: '42501' } }));
check('chaîne de cause parcourue', describedNested.cause.code, '42501');
check('erreur null → null', describeSupabaseError(null), null);
check('chaîne brute acceptée', describeSupabaseError('rate limit').message, 'rate limit');

// Pseudos : la messagerie affiche tous les joueurs en majuscules. C'est une
// règle de rendu — les données gardent leur casse, d'où ces quelques cas.
check('pseudo en majuscules (casse mixte)', pseudoLabel('nova pixel'), 'NOVA PIXEL');
check('pseudo déjà en majuscules inchangé', pseudoLabel('KAYZ_ORAN'), 'KAYZ_ORAN');
check('pseudo en minuscules', pseudoLabel('kayz_oran'), 'KAYZ_ORAN');
check('accents conservés en majuscules', pseudoLabel('éloïse_dz'), 'ÉLOÏSE_DZ');
check('espaces de bord retirés', pseudoLabel('  vortex  '), 'VORTEX');
check('pseudo absent → chaîne vide', pseudoLabel(null), '');
check('pseudo vide → chaîne vide', pseudoLabel('   '), '');
check('pseudo nul → repli possible', pseudoLabel(null) || '?', '?');
check('pseudo : conversion idempotente', pseudoLabel(pseudoLabel('Vortex_DZ')), 'VORTEX_DZ');
check('pseudo : règle d’affichage, pas un texte traduit', typeof messagesCopy.fr.pseudoLabel, 'undefined');

/* ------------------------------------------------------------------------ */
console.log('\n[2/4] aperçu de démonstration\n');

const now = Date.UTC(2026, 8, 21, 12, 0, 0);

// Garde-fou : les personas ne sont plus livrées dans l'application, ce sont
// des fixtures de test (scripts/demoFixtures.js). Sans elles, la boucle ci-dessous
// ne tournerait pas et une trentaine de vérifications disparaîtraient en silence.
check('personas de démonstration semées par les fixtures', Object.keys(DEMO_PROFILES).sort().join(','), 'pixel,vortex');

for (const [key, profile] of Object.entries(DEMO_PROFILES)) {
  const self = profile.id;
  const friends = DEMO_INITIAL_STATE[key].friends;
  const seeded = DEMO_THREADS[key] || {};
  const peers = Object.keys(seeded);
  check(`${key} : des discussions de départ`, peers.length > 1);
  check(`${key} : uniquement des amis`, peers.every((peerId) => friends.includes(peerId)));
  check(`${key} : jamais soi-même`, !peers.includes(self));
  const state = seedDemoThreadState(key, now);
  const normalized = demoThreads(state, self);
  check(`${key} : discussions normalisées`, Object.keys(normalized).length, peers.length);
  check(`${key} : des messages non lus`, peers.some((peerId) => normalized[peerId].unread > 0));
  check(`${key} : des discussions déjà lues`, peers.some((peerId) => normalized[peerId].unread === 0));
  const unreadPeers = peers.filter((peerId) => normalized[peerId].unread > 0);
  check(`${key} : non-lus reportés sur les discussions`, unreadPeers.length > 0);
  check(`${key} : horodatages ancrés sur la graine`, state.seededAt, new Date(now).toISOString());
  const last = normalized[peers[0]].messages.at(-1);
  check(`${key} : dernier message de la discussion`, last.body, seeded[peers[0]].at(-1).body);
  check(`${key} : total des non-lus`, totalUnread(normalized), unreadPeers.reduce((sum, peerId) => sum + normalized[peerId].unread, 0));

  // Réponses scriptées : déterministes, et qui tournent sur le catalogue.
  const anyPeer = peers[0];
  const pool = DEMO_REPLIES[anyPeer] || null;
  if (pool && pool.length > 1) {
    check(`${key} : réponse scriptée déterministe`, demoReplyFor(anyPeer, 0), demoReplyFor(anyPeer, 0));
    check(`${key} : le catalogue tourne en boucle`, demoReplyFor(anyPeer, pool.length), pool[0]);
  }

  // Envoyer, recevoir, lire.
  let demo = applyDemoSend(state, anyPeer, '  On se capte ce soir ?  ', now + 1000);
  check(`${key} : envoi ajouté au fil`, demo.threads[anyPeer].at(-1).body, 'On se capte ce soir ?');
  check(`${key} : envoi marqué comme le mien`, demo.threads[anyPeer].at(-1).from, 'me');
  check(`${key} : envoi → discussion lue`, demoThreads(demo, self)[anyPeer].unread, 0);
  check(`${key} : envoi vide → état inchangé`, applyDemoSend(state, anyPeer, '   ', now), state);

  demo = applyDemoReply(state, anyPeer, now + 2000);
  check(`${key} : réponse reçue`, demo.threads[anyPeer].at(-1).from, 'them');
  check(`${key} : réponse = non lu`, demoThreads(demo, self)[anyPeer].unread, state.threads[anyPeer].filter((message) => message.from === 'them' && !message.read).length + 1);
  check(`${key} : compteur de réponses avancé`, demo.replyCounters[anyPeer], 1);
  if (pool && pool.length > 1) check(`${key} : la réponse suivante diffère`, applyDemoReply(demo, anyPeer, now + 3000).threads[anyPeer].at(-1).body !== demo.threads[anyPeer].at(-1).body);
  const readOnce = applyDemoRead(demo, anyPeer);
  check(`${key} : lecture → plus de non-lus`, demoThreads(readOnce, self)[anyPeer].unread, 0);
  check(`${key} : lecture d’une discussion déjà lue → inchangée`, applyDemoRead(readOnce, anyPeer), readOnce);

  const clearedDemo = applyDemoClear(state, anyPeer);
  check(`${key} : effacement → les deux sens du fil disparaissent`, demoThreads(clearedDemo, self)[anyPeer] === undefined);
  check(`${key} : effacement → autres fils intacts`, clearedDemo.threads[peers[1]], state.threads[peers[1]]);
  check(`${key} : effacement → baisse des non-lus`, totalUnread(demoThreads(clearedDemo, self)), totalUnread(normalized) - normalized[anyPeer].unread);
  check(`${key} : effacement répété → inchangé`, applyDemoClear(clearedDemo, anyPeer), clearedDemo);
  const newAfterClear = applyDemoReply(clearedDemo, anyPeer, now + 3000);
  check(`${key} : un nouveau message recrée le fil sans l’historique`, demoThreads(newAfterClear, self)[anyPeer].messages.length, 1);
  // Le stockage de la persona ne réensemence pas le fil effacé au rechargement.
  const savedWindow = globalThis.window;
  globalThis.window = { localStorage: makeStorage() };
  writeDemoMessages(profile, clearedDemo);
  check(`${key} : effacement persistant après rechargement démo`, demoThreads(readDemoMessages(profile), self)[anyPeer] === undefined);
  globalThis.window = savedWindow;

  // Messages scriptés : rien avant l'échéance, une seule fois après.
  const seededAt = Date.parse(state.seededAt);
  const first = DEMO_INCOMING[key][0];
  check(`${key} : rien d’annoncé avant l’échéance`, dueDemoIncoming(state, key, seededAt + first.afterMs - 1000).length, 0);
  const due = dueDemoIncoming(state, key, seededAt + first.afterMs);
  check(`${key} : le message scripté arrive à échéance`, due.length, 1);
  check(`${key} : il vient d’un ami`, friends.includes(due[0].from));
  const delivered = applyDemoIncoming(state, due[0], seededAt + first.afterMs);
  check(`${key} : message scripté ajouté`, delivered.threads[due[0].from].at(-1).body, first.body);
  check(`${key} : livré une seule fois`, dueDemoIncoming(delivered, key, seededAt + first.afterMs).length, 0);
  check(`${key} : compteur de livraison`, delivered.deliveredIncoming, 1);
  const allDue = dueDemoIncoming(state, key, seededAt + 60 * 60 * 1000);
  check(`${key} : tout le script suit l’ordre`, allDue.map((event) => event.index).join(','), allDue.map((_, index) => index).join(','));

  // Blocage et signalement.
  const blocked = applyDemoBlock(state, anyPeer);
  check(`${key} : joueur bloqué`, blocked.blocked.includes(anyPeer));
  check(`${key} : bloquer deux fois → inchangé`, applyDemoBlock(blocked, anyPeer), blocked);
  check(`${key} : débloquer`, applyDemoUnblock(blocked, anyPeer).blocked.length, 0);
  check(`${key} : débloquer un joueur non bloqué → inchangé`, applyDemoUnblock(state, anyPeer), state);
  const reported = applyDemoReport(state, anyPeer, 'spam', now);
  check(`${key} : signalement enregistré`, reported.reported[anyPeer].reason, 'spam');
  check(`${key} : même motif → inchangé`, applyDemoReport(reported, anyPeer, 'spam', now), reported);
  check(`${key} : motif corrigé`, applyDemoReport(reported, anyPeer, 'hate', now).reported[anyPeer].reason, 'hate');
  check(`${key} : motif inconnu → « other »`, applyDemoReport(state, anyPeer, 'zzz', now).reported[anyPeer].reason, 'other');
}

for (const lang of ['en', 'fr', 'ar']) {
  const missing = Object.keys(messagesCopy.en).filter((entry) => !messagesCopy[lang][entry]);
  const missingSocial = Object.keys(socialCopy.en).filter((entry) => !socialCopy[lang][entry]);
  check(`textes complets en ${lang}`, missing.join(','), '');
  check(`textes sociaux complets en ${lang}`, missingSocial.join(','), '');
  const reasons = REPORT_REASONS.filter((reason) => !reasonLabel(reason, messagesCopy[lang]));
  check(`motifs de signalement libellés en ${lang}`, reasons.join(','), '');
}
check('motifs de signalement connus du SQL', REPORT_REASONS.join(','), 'harassment,spam,hate,inappropriate,other');
check('les amis de la communauté existent', Object.values(DEMO_THREADS).flatMap(Object.keys).every((peerId) => findDemoPlayer(peerId)));

/* ------------------------------------------------------------------------ */
console.log('\n[3/4] rendu SSR\n');

for (const lang of ['en', 'fr', 'ar']) {
  const t = messagesCopy[lang];
  const st = socialCopy[lang];
  try {
    const guest = renderApp('/auth', { lang });
    check(`[${lang}] visiteur : lanceur vers la messagerie visible`, guest.includes('social-launcher') && strip(guest).includes(st.launcher));
    check(`[${lang}] visiteur : aucun panneau de discussions`, guest.includes('social-panel'), false);
    check(`[${lang}] menu mobile : accès direct à /messages`, guest.includes('class="nav-messages-link') && guest.includes('href="/messages"'));
    const gate = renderApp('/messages', { lang });
    check(`[${lang}] visiteur : page de connexion et aucun fil`, strip(gate).includes(t.signInPrompt) && !gate.includes('messages-thread'));
    check(`[${lang}] page /messages : pas de lanceur en double`, gate.includes('social-launcher'), false);
  } catch (e) { check(`[${lang}] /auth visiteur se rend`, e.message, ''); }

  try {
    const html = renderApp('/auth', { lang, demoKey: 'vortex' });
    const text = strip(html);
    check(`[${lang}] persona : lanceur « ${st.launcher} » présent`, html.includes('social-launcher') && text.includes(st.launcher));
    check(`[${lang}] persona : badge des non-lus`, html.includes('social-launcher-badge'));
    // Le profil du joueur n'affiche plus les raccourcis de messagerie : la
    // discussion se rejoint par la fenêtre sociale (ou la page /messages).
    check(`[${lang}] hub : aucun raccourci de messagerie`, text.includes(t.hubOpen), false);
  } catch (e) { check(`[${lang}] /auth persona se rend`, e.message, ''); }

  try {
    const html = renderApp('/auth', { lang, demoKey: 'vortex', dockOpen: true });
    const text = strip(html);
    check(`[${lang}] fenêtre ouverte : liste des discussions`, html.includes('social-panel') && text.includes(t.sectionConversations));
    check(`[${lang}] fenêtre ouverte : onglet « ${st.tabMessages} » actif`, text.includes(st.tabMessages));
    const seededPeer = Object.keys(DEMO_THREADS.vortex)[0];
    const lastBody = DEMO_THREADS.vortex[seededPeer].at(-1).body;
    check(`[${lang}] fenêtre ouverte : dernier message en aperçu`, text.includes(lastBody));
  } catch (e) { check(`[${lang}] fenêtre ouverte se rend`, e.message, ''); }

  try {
    const peer = Object.keys(DEMO_THREADS.vortex)[0];
    const html = renderApp('/auth', { lang, demoKey: 'vortex', dockOpen: true, activePeer: peer });
    const text = strip(html);
    check(`[${lang}] discussion ouverte : fil + champ de saisie`, html.includes('messages-thread') && html.includes('messages-composer'));
    check(`[${lang}] discussion ouverte : pseudo de l’ami`, text.includes(findDemoPlayer(peer).gamertag));
    check(`[${lang}] discussion ouverte : gestes bloquer / signaler`, html.includes(`aria-label="${t.block}"`) && html.includes(`aria-label="${t.report}"`));
    check(`[${lang}] dock : option « ${t.clearConversation} »`, html.includes(`aria-label="${t.clearConversation}"`));
    const pageThread = renderApp(`/messages/${peer}`, { lang, demoKey: 'vortex' });
    check(`[${lang}] page : option « ${t.clearConversation} »`, pageThread.includes(`aria-label="${t.clearConversation}"`));
    check(`[${lang}] discussion ouverte : un message du fil`, text.includes(DEMO_THREADS.vortex[peer][0].body));
  } catch (e) { check(`[${lang}] discussion ouverte se rend`, e.message, ''); }

  try {
    const friend = DEMO_INITIAL_STATE.vortex.friends.find((peerId) => peerId.startsWith('demo-player-'));
    const html = renderApp(`/profile/${friend}`, { lang, demoKey: 'vortex' });
    check(`[${lang}] profil d’un ami : bouton « ${t.message} »`, html.includes('message-btn'));
  } catch (e) { check(`[${lang}] profil ami se rend`, e.message, ''); }

  try {
    const html = renderApp('/profile/demo-player-3105', { lang });
    check(`[${lang}] profil visiteur : bouton « ${t.signInPrompt} »`, strip(html).includes(t.signInPrompt));
  } catch (e) { check(`[${lang}] profil visiteur se rend`, e.message, ''); }

  try {
    // Un joueur qui n'est pas ami : le bouton explique pourquoi il est gris.
    const stranger = 'demo-player-2790';
    const html = renderApp(`/profile/${stranger}`, { lang, demoKey: 'vortex' });
    check(`[${lang}] profil d’un non-ami : « ${t.notFriends} »`, strip(html).includes(t.notFriends));
  } catch (e) { check(`[${lang}] profil non-ami se rend`, e.message, ''); }
}

// Amis + messagerie partagent maintenant une seule fenêtre sociale.
try {
  const html = renderApp('/auth', { lang: 'fr', demoKey: 'vortex' });
  check('une seule fenêtre sociale', (html.match(/class="social-launcher( |")/g) || []).length, 1);
  const opened = strip(renderApp('/auth', { lang: 'fr', demoKey: 'vortex', friendsOpen: true }));
  check('fenêtre unifiée : onglets Amis et Messages', opened.includes(friendsCopy.fr.tabFriends) && opened.includes(socialCopy.fr.tabMessages));
  check('les textes des amis restent complets', Object.keys(friendsCopy.en).filter((entry) => !friendsCopy.fr[entry]).join(','), '');
} catch (e) { check('la fenêtre sociale se rend', e.message, ''); }

// Pseudos en majuscules : les gamertags des fixtures le sont déjà, donc on
// rend les deux vues de la messagerie avec un pseudo en casse mixte — le
// rendu doit le mettre en majuscules, dans le texte comme dans les libellés
// accessibles.
try {
  const mixed = { id: 'demo-player-9001', name: 'nova pixel', avatar: null };
  const seeded = {
    peerId: mixed.id,
    profile: mixed,
    lastMessage: { id: 'm1', body: 'Salut !', mine: false, createdAt: '2026-01-01T10:00:00Z', read: true },
    unread: 0,
    lastAt: '2026-01-01T10:00:00Z',
  };
  const t = messagesCopy.fr;
  const inboxRaw = renderInboxView([seeded], { lang: 'fr' });
  const inbox = strip(inboxRaw);
  check('liste : pseudo en majuscules', inbox.includes('NOVA PIXEL') && !inbox.includes('nova pixel'));
  check('liste : libellé accessible en majuscules', inboxRaw.includes(`${t.openChat} — NOVA PIXEL`));

  const blockedRaw = renderInboxView([], { lang: 'fr', blocked: [{ ...seeded, lastMessage: null, lastAt: null }] });
  const blocked = strip(blockedRaw);
  check('joueurs bloqués : pseudo en majuscules', blocked.includes('NOVA PIXEL') && !blocked.includes('nova pixel'));
  check('joueurs bloqués : mention du blocage', blocked.includes(t.blockedNote) && blocked.includes(t.unblock));

  const threadRaw = renderThreadView(mixed, {
    lang: 'fr',
    messages: [{ id: 'm1', body: 'Salut !', mine: false, createdAt: '2026-01-01T10:00:00Z', read: false }],
  });
  const thread = strip(threadRaw);
  check('discussion : pseudo en majuscules', thread.includes('NOVA PIXEL') && !thread.includes('nova pixel'));
  check('discussion : lien profil libellé en majuscules', threadRaw.includes(`${t.profile} — NOVA PIXEL`));
  check('discussion : message du fil intact', thread.includes('Salut !'));
  check('discussion : champ de saisie et bouton d’envoi', threadRaw.includes('messages-composer') && threadRaw.includes(`aria-label="${t.send}"`));
  const ct = callsText('fr');
  check('discussion : boutons d’appel nommés', threadRaw.includes(`aria-label="${ct.callAudio}"`) && threadRaw.includes(`aria-label="${ct.callVideo}"`));
  check('discussion : effacement pour soi toujours proposé', threadRaw.includes(`aria-label="${t.clearConversation}"`));
} catch (e) { check('les vues de messagerie se rendent seules', e.message, ''); }

console.log('\n[4/4] clic d’effacement dans la page\n');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
try {
  await checkClearInteraction(assert);
  check('annuler / confirmer : fil effacé et persistant pour la persona seulement', true);
} catch (e) {
  check('clic « Effacer la conversation » fonctionne', e.message, '');
} finally {
  dom.window.close();
}

if (failures > 0) {
  console.error(`\n${failures} vérification(s) en échec.`);
  process.exit(1);
}
console.log('\n  OK — messagerie : discussions, non-lus, effacement pour soi, aperçu démo et rendu des pages\n');
