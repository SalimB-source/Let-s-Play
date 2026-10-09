/**
 * Signalements et filtre de mots dans les commentaires, côté interface — partie
 * DOM de `npm run check:comment-moderation`.
 *
 * Le client Supabase est réel (URL factice) mais le réseau est simulé : une
 * session déjà présente dans le stockage local fait croire à l'application
 * qu'un compte est connecté. Vérifié :
 * - « Signaler » apparaît sur les commentaires des autres, jamais sur les siens ;
 * - le formulaire envoie le motif choisi, et seulement lui (le compte signalant
 *   est fixé par la base) ;
 * - un signalement accepté remplace le bouton par « Signalé » ;
 * - un doublon est affiché comme déjà signalé, une autre erreur reste sous le
 *   commentaire, en alerte ;
 * - après un remontage, les signalements existants restent affichés ;
 * - un message refusé par le filtre de mots s'affiche sous le formulaire et
 *   n'est pas ajouté à la liste (le texte reste dans le champ) ;
 * - un visiteur ne voit aucun bouton de signalement.
 */
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'node_modules', '.cache', 'comment-report-smoke');
const PROJECT_URL = 'https://fake-project.supabase.co';
// Doit correspondre à `sb-<premier label de l'hôte>-auth-token` (supabase-js).
const STORAGE_KEY = 'sb-fake-project-auth-token';
const ME = '11111111-0000-4000-8000-000000000001';
const OTHER = '22222222-0000-4000-8000-000000000002';

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'build', '--ssr', 'scripts/comment-report-smoke.jsx', '--outDir', path.relative(root, outDir), '--emptyOutDir', '--logLevel', 'error'],
  {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, VITE_SUPABASE_URL: PROJECT_URL, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only' },
  },
);

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(globalThis, 'localStorage', { value: dom.window.localStorage, configurable: true, writable: true });
dom.window.scrollTo = () => {};
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
if (!dom.window.matchMedia) {
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
}

// ---------------------------------------------------------------------------
// Réseau simulé : PostgREST répond selon le scénario en cours.
// ---------------------------------------------------------------------------
const scenario = { comments: [], ownReports: [], reportReply: null, postReply: null, requests: [] };

function answer({ method, path: route }) {
  if (method === 'GET' && route === '/rest/v1/comments') return { body: scenario.comments };
  if (method === 'GET' && route === '/rest/v1/comment_reports') return { body: scenario.ownReports };
  if (method === 'POST' && route === '/rest/v1/comment_reports') return scenario.reportReply || { status: 201 };
  if (method === 'POST' && route === '/rest/v1/comments') {
    return scenario.postReply || {
      status: 201,
      body: { id: 'c-new', article_id: 'test-article', user_id: ME, author_name: 'Lina', body: 'Bonjour à tous.', created_at: '2026-10-08T12:00:00.000Z', author_level: 3, author_xp: 120 },
    };
  }
  return { status: 404, body: { code: 'PGRST205', message: `non simulé : ${method} ${route}` } };
}

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  const method = String(init.method || 'GET').toUpperCase();
  const body = init.body ? JSON.parse(init.body) : undefined;
  scenario.requests.push({ method, path: url.pathname, body });
  const reply = answer({ method, path: url.pathname });
  const text = reply.body === undefined ? '' : JSON.stringify(reply.body);
  return new Response(text, { status: reply.status ?? 200, headers: { 'content-type': 'application/json' } });
};

const session = {
  access_token: 'test.access.token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 365 * 24 * 3600,
  refresh_token: 'test-refresh-token',
  user: {
    id: ME,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'lina@example.test',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { gamertag: 'Lina', fullName: 'Lina' },
    created_at: '2026-01-01T00:00:00.000Z',
  },
};

const comments = () => [
  { id: 'c-own', article_id: 'test-article', user_id: ME, author_name: 'Lina', body: 'Mon avis sur le jeu.', created_at: '2026-10-07T10:00:00.000Z', author_level: 3, author_xp: 120 },
  { id: 'c-other', article_id: 'test-article', user_id: OTHER, author_name: 'Karim', body: 'Un commentaire écrit par quelqu’un d’autre.', created_at: '2026-10-07T09:00:00.000Z', author_level: 2, author_xp: 40 },
  { id: 'c-second', article_id: 'test-article', user_id: OTHER, author_name: 'Karim', body: 'Deuxième commentaire.', created_at: '2026-10-07T08:00:00.000Z', author_level: 2, author_xp: 40 },
  { id: 'c-third', article_id: 'test-article', user_id: OTHER, author_name: 'Karim', body: 'Troisième commentaire.', created_at: '2026-10-07T07:00:00.000Z', author_level: 2, author_xp: 40 },
];

// ---------------------------------------------------------------------------
// Fumée compilée : rendu React réel, mêmes fournisseurs que l'application.
// ---------------------------------------------------------------------------
const smoke = await import(path.join(outDir, 'comment-report-smoke.js'));
const { act, mountComments, translations } = smoke;
const fr = translations.fr.news.comments;

let failures = 0;
function check(label, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`  ok   ${label}`))
    .catch((error) => {
      failures += 1;
      console.log(`  FAIL ${label}\n       ${error.message.split('\n').join('\n       ')}`);
    });
}

const container = document.createElement('div');
document.body.append(container);
let reactRoot = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(label, read, tries = 200) {
  for (let i = 0; i < tries; i += 1) {
    const value = read();
    if (value) return value;
    await act(async () => { await sleep(5); });
  }
  throw new Error(`délai dépassé : ${label}`);
}
async function mount(options) {
  // Une tâche de plus dans `act` : les réponses initiales (session, listes) arrivent ici, pas après.
  await act(async () => { reactRoot = mountComments(container, options); await sleep(10); });
}
async function unmount() {
  if (!reactRoot) return;
  await act(async () => { reactRoot.unmount(); await sleep(10); });
  reactRoot = null;
}
async function click(element) {
  assert.ok(element, 'élément cliquable présent');
  await act(async () => element.click());
}
async function submit(form) {
  assert.ok(form, 'formulaire présent');
  // La requête simulée se termine après l'envoi : on laisse la chaîne d'états finir dans `act`.
  await act(async () => { form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); await sleep(10); });
}
async function setField(element, value, eventName) {
  assert.ok(element, 'champ présent');
  const proto = element instanceof window.HTMLSelectElement ? window.HTMLSelectElement.prototype
    : element instanceof window.HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value);
    element.dispatchEvent(new window.Event(eventName, { bubbles: true }));
  });
}
const articles = () => [...container.querySelectorAll('.comment-list > article')];
const articleByText = (text) => articles().find((article) => article.querySelector('.comment-content > p')?.textContent === text);
const reportRequests = () => scenario.requests.filter((r) => r.path === '/rest/v1/comment_reports' && r.method === 'POST');
const reportedCount = () => container.querySelectorAll('.comment-report-done').length;

// ---------------------------------------------------------------------------
console.log('\nSignalements (compte connecté, réseau simulé)\n');

window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
scenario.comments = comments();
scenario.ownReports = [];

await mount({ lang: 'fr', session });
await waitFor('commentaires chargés', () => articles().length === 4);

await check('son propre commentaire : suppression, pas de signalement', () => {
  const own = articleByText('Mon avis sur le jeu.');
  assert.ok(own, 'commentaire propre affiché');
  assert.ok(own.querySelector('.comment-delete'), 'bouton supprimer présent');
  assert.ok(!own.querySelector('.comment-report'), 'pas de bouton « Signaler » sur son propre commentaire');
});

await check('commentaires des autres : bouton « Signaler », fermé au départ', () => {
  const other = articleByText('Un commentaire écrit par quelqu’un d’autre.');
  const button = other.querySelector('.comment-report');
  assert.equal(button?.textContent.trim(), fr.report);
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.ok(!other.querySelector('form.comment-report-form'), 'formulaire fermé au départ');
});

await check('ouverture : six motifs, « harcèlement » par défaut', async () => {
  const other = articleByText('Un commentaire écrit par quelqu’un d’autre.');
  await click(other.querySelector('.comment-report'));
  const form = other.querySelector('form.comment-report-form');
  assert.ok(form, 'formulaire ouvert sous le commentaire');
  const select = form.querySelector('select');
  assert.deepEqual([...select.options].map((o) => o.value), ['harassment', 'hate', 'sexual', 'violence', 'spam', 'other']);
  assert.equal(select.value, 'harassment');
  assert.equal(other.querySelector('.comment-report').getAttribute('aria-expanded'), 'true');
});

await check('envoi : motif choisi transmis seul, puis « Signalé » et message de confirmation', async () => {
  const other = articleByText('Un commentaire écrit par quelqu’un d’autre.');
  const form = other.querySelector('form.comment-report-form');
  await setField(form.querySelector('select'), 'sexual', 'change');
  await submit(form);
  const note = await waitFor('confirmation', () => other.querySelector('.comment-note-ok'));
  assert.equal(note.textContent, fr.reportSent);
  assert.equal(note.getAttribute('role'), 'status');
  assert.ok(!other.querySelector('form.comment-report-form'), 'formulaire refermé');
  assert.ok(!other.querySelector('.comment-report'), 'bouton remplacé');
  assert.equal(other.querySelector('.comment-report-done')?.textContent, fr.reported);
  const sent = reportRequests();
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].body, { comment_id: 'c-other', reason: 'sexual' });
});

await check('doublon (déjà signalé ailleurs) : affiché comme « Signalé », sans erreur', async () => {
  const second = articleByText('Deuxième commentaire.');
  scenario.reportReply = {
    status: 409,
    body: { code: '23505', message: 'duplicate key value violates unique constraint "comment_reports_comment_id_reporter_id_key"', details: null, hint: null },
  };
  await click(second.querySelector('.comment-report'));
  await submit(second.querySelector('form.comment-report-form'));
  const note = await waitFor('message de doublon', () => second.querySelector('.comment-note'));
  assert.equal(note.textContent, fr.reportDuplicate);
  assert.equal(note.getAttribute('role'), 'status');
  assert.equal(second.querySelector('.comment-report-done')?.textContent, fr.reported);
  scenario.reportReply = null;
});

await check('erreur (limite de signalements) : message d’alerte, bouton conservé', async () => {
  const third = articleByText('Troisième commentaire.');
  scenario.reportReply = {
    status: 400,
    body: { code: 'P0001', message: 'comment_report_rate_limited', details: null, hint: null },
  };
  await click(third.querySelector('.comment-report'));
  await submit(third.querySelector('form.comment-report-form'));
  const note = await waitFor('message d’erreur', () => third.querySelector('.comment-note'));
  assert.equal(note.textContent, fr.reportRateLimited);
  assert.equal(note.getAttribute('role'), 'alert');
  assert.ok(third.querySelector('.comment-report'), 'le signalement reste possible');
  assert.ok(!third.querySelector('.comment-report-done'), 'pas de « Signalé » après une erreur');
  scenario.reportReply = null;
});

await check('remontage : les signalements déjà faits restent affichés', async () => {
  await unmount();
  scenario.requests.length = 0;
  scenario.ownReports = [{ comment_id: 'c-other' }, { comment_id: 'c-second' }];
  await mount({ lang: 'fr', session });
  await waitFor('signalements rechargés', () => reportedCount() === 2);
  const third = articleByText('Troisième commentaire.');
  assert.ok(third.querySelector('.comment-report'), 'commentaire non signalé : bouton disponible');
  assert.ok(scenario.requests.some((r) => r.path === '/rest/v1/comment_reports' && r.method === 'GET'), 'liste des signalements lue');
});

await check('filtre de mots : message refusé affiché, texte conservé, rien ajouté', async () => {
  const textarea = await waitFor('zone de saisie', () => container.querySelector('form.comment-form textarea'));
  await setField(textarea, 'Tu es vraiment un connard.', 'input');
  scenario.postReply = {
    status: 400,
    body: { code: 'P0001', message: 'comment_blocked_terms', details: null, hint: null },
  };
  await submit(container.querySelector('form.comment-form'));
  const note = await waitFor('message de mot interdit', () => container.querySelector('form.comment-form .comment-note-error'));
  assert.equal(note.textContent, fr.errBlocked);
  assert.equal(note.getAttribute('role'), 'alert');
  assert.equal(articles().length, 4, 'aucun commentaire ajouté');
  assert.equal(textarea.value, 'Tu es vraiment un connard.', 'texte conservé pour correction');
  scenario.postReply = null;
});

await check('publication normale : le commentaire apparaît et le champ se vide', async () => {
  const textarea = container.querySelector('form.comment-form textarea');
  await setField(textarea, 'Bonjour à tous.', 'input');
  await submit(container.querySelector('form.comment-form'));
  await waitFor('nouveau commentaire', () => articleByText('Bonjour à tous.'));
  assert.equal(container.querySelector('form.comment-form textarea').value, '');
  assert.equal(articles().length, 5);
});

await check('visiteur : commentaires visibles, aucun bouton de signalement', async () => {
  await unmount();
  window.localStorage.removeItem(STORAGE_KEY);
  scenario.requests.length = 0;
  scenario.ownReports = [{ comment_id: 'c-other' }];
  await mount({ lang: 'fr', session: null });
  // Le commentaire publié plus haut n'existe que dans cet affichage : il n'est pas sur le serveur simulé.
  await waitFor('commentaires publics', () => articles().length === 4);
  assert.equal(container.querySelectorAll('.comment-report').length, 0);
  assert.equal(container.querySelectorAll('.comment-report-done').length, 0);
  assert.ok(container.querySelector('.comment-gate'), 'invitation à se connecter pour commenter');
  assert.equal(scenario.requests.filter((r) => r.path === '/rest/v1/comment_reports').length, 0, 'aucune requête de signalement pour un visiteur');
});

await unmount();
dom.window.close();
if (failures > 0) {
  console.log(`\n${failures} échec(s) dans les signalements de commentaires.`);
  process.exit(1);
}
console.log('\nSignalements de commentaires et filtre de mots : interface OK.');
// Le client d'authentification garde des minuteries ouvertes : on sort explicitement.
process.exit(0);
