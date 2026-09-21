/**
 * Vérification du module amis — `npm run check:friends`.
 *
 * 1. Logique pure : les lignes `friendships` deviennent bien des relations
 *    (ami / demande reçue / demande envoyée) du point de vue du joueur ; les
 *    actions de démonstration (envoyer, accepter, refuser, annuler, retirer)
 *    font passer une relation d'une liste à l'autre sans doublon ; la présence
 *    scriptée est déterministe et donne des amis en ligne ET hors ligne ; la
 *    recherche est nettoyée avant d'atteindre PostgREST.
 * 2. Communauté de démonstration : les états de départ ne citent que des
 *    joueurs existants, jamais soi-même, jamais deux fois.
 * 3. Rendu SSR : le hub /auth et un profil public se rendent dans les trois
 *    langues avec le provider des amis ; la fenêtre d'amis n'apparaît que pour
 *    un joueur connecté ; le bouton « Ajouter en ami » propose la connexion à
 *    un visiteur.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'friends-smoke');

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '--ssr', 'scripts/friends-smoke.jsx', '--outDir', path.relative(root, outDir), '--emptyOutDir', '--logLevel', 'error'],
  { cwd: root, stdio: 'inherit' },
);

const smoke = await import(path.join(outDir, 'friends-smoke.js'));
const {
  DEMO_COMMUNITY, DEMO_INITIAL_STATE, DEMO_PROFILES, demoPresence, findDemoPlayer,
  applyDemoAction, demoRelations, isRecentlySeen, relationsFromRows, sanitizeSearch, searchDemoPlayers,
  friendsCopy, renderApp,
} = smoke;

let failures = 0;
function check(label, actual, expected = true) {
  const ok = typeof expected === 'function' ? expected(actual) : actual === expected;
  if (ok) console.log(`  ok   ${label}`);
  else { failures += 1; console.log(`  FAIL ${label}\n       reçu : ${JSON.stringify(actual)}`); }
}
function strip(html) { return html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '’').replace(/&amp;/g, '&').replace(/\s+/g, ' '); }

/* ------------------------------------------------------------------------ */
console.log('\n[1/3] logique pure\n');

const me = 'aaaaaaaa-0000-0000-0000-000000000001';
const rows = [
  { id: 'r1', requester_id: me, addressee_id: 'u-bob', status: 'accepted', created_at: '2026-01-01', updated_at: '2026-01-02' },
  { id: 'r2', requester_id: 'u-carol', addressee_id: me, status: 'accepted', created_at: '2026-01-03', updated_at: '2026-01-03' },
  { id: 'r3', requester_id: 'u-dan', addressee_id: me, status: 'pending', created_at: '2026-01-04', updated_at: '2026-01-04' },
  { id: 'r4', requester_id: me, addressee_id: 'u-eve', status: 'pending', created_at: '2026-01-05', updated_at: '2026-01-05' },
  { id: 'r5', requester_id: 'u-x', addressee_id: 'u-y', status: 'accepted', created_at: '2026-01-06', updated_at: '2026-01-06' },
];
const relations = relationsFromRows(rows, me);
check('ami quel que soit le sens de la demande', [relations['u-bob']?.kind, relations['u-carol']?.kind].join(','), 'friend,friend');
check('demande reçue = je suis le destinataire', relations['u-dan']?.kind, 'incoming');
check('demande envoyée = je suis l’expéditeur', relations['u-eve']?.kind, 'outgoing');
check('une relation entre deux autres joueurs est ignorée', Object.keys(relations).length, 4);
check('la ligne est retenue pour accepter / supprimer', relations['u-dan']?.rowId, 'r3');

let state = { friends: ['a'], incoming: ['b'], outgoing: ['c'] };
state = applyDemoAction(state, 'send', 'd');
check('envoyer → demande envoyée', state.outgoing.includes('d') && !state.friends.includes('d'));
state = applyDemoAction(state, 'send', 'b');
check('envoyer à qui nous avait écrit → ami direct', state.friends.includes('b') && !state.incoming.includes('b') && !state.outgoing.includes('b'));
state = applyDemoAction(state, 'auto-accept', 'd');
check('le joueur accepte → ami', state.friends.includes('d') && !state.outgoing.includes('d'));
check('auto-accept sans demande en cours → inchangé', applyDemoAction(state, 'auto-accept', 'zzz'), state);
state = applyDemoAction(state, 'unfriend', 'a');
check('retirer → plus ami', !state.friends.includes('a'));
state = applyDemoAction(state, 'cancel', 'c');
check('annuler → plus de demande envoyée', !state.outgoing.includes('c'));
state = applyDemoAction({ friends: [], incoming: ['e'], outgoing: [] }, 'decline', 'e');
check('refuser → plus de demande reçue', state.incoming.length === 0 && state.friends.length === 0);
const receive = applyDemoAction({ friends: ['f'], incoming: [], outgoing: [] }, 'receive', 'f');
check('recevoir d’un ami existant → inchangé', receive.incoming.length, 0);
const allLists = (s) => [...s.friends, ...s.incoming, ...s.outgoing];
check('aucun doublon entre listes', new Set(allLists(state)).size, allLists(state).length);

const now = Date.UTC(2026, 8, 21, 12, 0, 0);
const p1 = demoPresence(findDemoPlayer('demo-player-3105'), now);
const p2 = demoPresence(findDemoPlayer('demo-player-5573'), now);
check('joueur scripté « online » → en ligne', p1.online, true);
check('joueur scripté « offline » → hors ligne, vu il y a…', !p2.online && typeof p2.lastSeenAt === 'string');
check('vu il y a 95 min', Math.round((now - Date.parse(p2.lastSeenAt)) / 60000), 95);
const cyc = findDemoPlayer('demo-player-4820');
check('présence cyclique déterministe', demoPresence(cyc, now).online, demoPresence(cyc, now).online);
const period = cyc.cycleMinutes * 60 * 1000;
check('… et qui change d’un créneau à l’autre', demoPresence(cyc, now).online !== demoPresence(cyc, now + period).online);
const roster = { friends: DEMO_INITIAL_STATE.vortex.friends };
const onlineNow = roster.friends.filter((id) => demoPresence(findDemoPlayer(id), now).online).length;
check('VORTEX_DZ a des amis en ligne ET hors ligne', onlineNow > 0 && onlineNow < roster.friends.length);
check('vu il y a 1 min = en ligne (battement de cœur)', isRecentlySeen(new Date(now - 60000).toISOString(), now), true);
check('vu il y a 10 min = hors ligne', isRecentlySeen(new Date(now - 600000).toISOString(), now), false);

check('recherche nettoyée pour PostgREST', sanitizeSearch('  vor,tex(%)"\'\\*  '), 'vor tex');
check('recherche tronquée à 40 caractères', sanitizeSearch('x'.repeat(80)).length, 40);
const found = searchDemoPlayers('sar', DEMO_PROFILES.vortex.id);
check('recherche démo par pseudo', found.map((p) => p.name).join(','), 'SARAH_RETRO');
check('recherche démo par nom', searchDemoPlayers('benali', DEMO_PROFILES.vortex.id)[0]?.name, 'PIXEL_QUEEN');
check('on ne se trouve pas soi-même', searchDemoPlayers('vortex', DEMO_PROFILES.vortex.id).length, 0);
check('moins de 2 caractères → rien', searchDemoPlayers('v', DEMO_PROFILES.vortex.id).length, 0);

/* ------------------------------------------------------------------------ */
console.log('\n[2/3] communauté de démonstration\n');

const ids = DEMO_COMMUNITY.map((p) => p.id);
check('identifiants uniques', new Set(ids).size, ids.length);
check('les deux personas font partie de la communauté', ids.includes(DEMO_PROFILES.vortex.id) && ids.includes(DEMO_PROFILES.pixel.id));
for (const [key, seed] of Object.entries(DEMO_INITIAL_STATE)) {
  const self = DEMO_PROFILES[key].id;
  const all = allLists(seed);
  check(`${key} : joueurs existants uniquement`, all.every((id) => findDemoPlayer(id)));
  check(`${key} : jamais soi-même`, !all.includes(self));
  check(`${key} : aucun doublon`, new Set(all).size, all.length);
  check(`${key} : des demandes reçues à traiter`, seed.incoming.length > 0);
  const rel = demoRelations(seed, self);
  check(`${key} : relations normalisées`, Object.values(rel).filter((r) => r.kind === 'friend').length, seed.friends.length);
}
for (const lang of ['en', 'fr', 'ar']) {
  const missing = Object.keys(friendsCopy.en).filter((k) => !friendsCopy[lang][k]);
  check(`textes complets en ${lang}`, missing.join(','), '');
}

/* ------------------------------------------------------------------------ */
console.log('\n[3/3] rendu SSR\n');

for (const lang of ['en', 'fr', 'ar']) {
  const t = friendsCopy[lang];
  try {
    const guest = strip(renderApp('/auth', { lang }));
    check(`[${lang}] visiteur : pas de fenêtre d’amis`, guest.includes(t.launcher) && guest.includes('friends-launcher'), false);
  } catch (e) { check(`[${lang}] /auth visiteur se rend`, e.message, ''); }
  try {
    const html = renderApp('/auth', { lang, demoKey: 'vortex' });
    const text = strip(html);
    check(`[${lang}] persona : lanceur « ${t.launcher} » présent`, html.includes('friends-launcher') && text.includes(t.launcher));
    check(`[${lang}] persona : section « ${t.hubTitle} » du hub`, text.includes(t.hubTitle));
  } catch (e) { check(`[${lang}] /auth persona se rend`, e.message, ''); }
  try {
    const html = renderApp('/auth', { lang, demoKey: 'pixel', dockOpen: true });
    check(`[${lang}] fenêtre ouverte : panneau + onglets`, html.includes('friends-panel') && strip(html).includes(t.tabRequests));
  } catch (e) { check(`[${lang}] fenêtre ouverte se rend`, e.message, ''); }
  try {
    const html = renderApp('/profile/demo-player-3105', { lang });
    check(`[${lang}] profil public visiteur : bouton « ${t.signInPrompt} »`, strip(html).includes(t.signInPrompt));
  } catch (e) { check(`[${lang}] profil public se rend`, e.message, ''); }
  try {
    const html = renderApp('/profile/demo-player-3105', { lang, demoKey: 'vortex' });
    check(`[${lang}] profil public persona : bouton d’ami rendu`, html.includes('friend-btn'));
  } catch (e) { check(`[${lang}] profil public persona se rend`, e.message, ''); }
}

if (failures > 0) {
  console.error(`\n${failures} vérification(s) en échec.`);
  process.exit(1);
}
console.log('\n  OK — amis : relations, communauté de démonstration et rendu des pages\n');
