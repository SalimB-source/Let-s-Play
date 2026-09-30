/**
 * Entrée SSR utilisée par scripts/mirage-scoreboard-check.mjs — `npm run check:mirage-scoreboard`.
 *
 * Contrôle le tableau des positions affiché quand une course de Mirage Rush se termine.
 * Le moteur 3D (MirageWorld) est remplacé par scripts/mirage-world-stub.jsx : jsdom n'a pas
 * de WebGL, et le test franchit lui-même la ligne d'arrivée en appelant `onFinish`, comme
 * le fait le vrai moteur. Tout le reste est réel : la page, le moteur de salons local, le XP.
 *
 *   1. le composant MirageScoreboard : ordre des lignes, médailles, ligne « TOI » mise en
 *      avant, temps et retards des arrivés, distance restante des autres, colonne des points
 *      (seulement quand il y a des scores à comparer), cavalier hors ligne, fantôme de défi ;
 *   2. Duel : à l'arrivée, l'overlay affiche le tableau classé (défaite, victoire, fantôme
 *      d'un lien de défi) avec le rang du joueur dans l'en-tête, ses cristaux et ses points ;
 *   3. En ligne : créer un salon, lancer la course, franchir la ligne → une fenêtre de
 *      résultats s'ouvre (classement provisoire tant qu'un cavalier est en piste, final
 *      ensuite, mis à jour en direct), le focus y reste, Échap la ferme, le salon garde le
 *      même classement en tête de page, et « QUITTER LA ROOM » ramène au choix des salons.
 */
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/auth/AuthContext';
import MirageRushPage from '../src/games/MirageRushPage';
import MirageScoreboard from '../src/games/MirageScoreboard';
import { buildDuelStandings, buildRoomStandings } from '../src/games/mirageStandings';
import { resetLocalRoomsForTests } from '../src/games/mirageRooms';
import { encodeChallenge } from '../src/games/duelChallenge';
import { worldControl } from './mirage-world-stub.jsx';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const squash = (text) => String(text ?? '').replace(/[\s\u202f\u00a0]+/g, ' ').trim();

async function render(element) {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  await act(async () => root.render(element));
  return { node, unmount: async () => { await act(async () => root.unmount()); node.remove(); } };
}

const mountPage = (entry) => render(
  <AuthProvider>
    <MemoryRouter initialEntries={[entry]}>
      <MirageRushPage />
    </MemoryRouter>
  </AuthProvider>,
);

/** Attend qu'une condition soit vraie (horloge `performance` : `Date.now` est décalé dans le test En ligne). */
async function waitUntil(predicate, label, timeout = 8000) {
  const start = performance.now();
  for (;;) {
    const value = predicate();
    if (value) return value;
    if (performance.now() - start > timeout) throw new Error(`Délai dépassé : ${label}`);
    await act(async () => { await sleep(40); });
  }
}

const byText = (root, selector, text) => [...root.querySelectorAll(selector)].find((node) => squash(node.textContent).includes(text));
const click = (element) => act(async () => { element.click(); });

/** Le tableau de scores lu sous forme d'objets simples. */
function readBoard(root) {
  return [...root.querySelectorAll('.mirage-scoreboard tbody tr')].map((tr) => ({
    rank: squash(tr.querySelector('.mirage-sb-medal')?.textContent),
    name: squash(tr.querySelector('.mirage-sb-name')?.textContent),
    tags: [...tr.querySelectorAll('.mirage-sb-tag')].map((tag) => squash(tag.textContent)),
    isYou: tr.classList.contains('is-you'),
    status: ['racing', 'offline', 'finished'].find((name) => tr.classList.contains(`is-${name}`)),
    main: squash(tr.querySelector('.mirage-sb-time strong')?.textContent),
    sub: squash(tr.querySelector('.mirage-sb-time small')?.textContent),
    live: Boolean(tr.querySelector('.mirage-sb-time small.is-live')),
    score: tr.querySelector('.mirage-sb-pts') ? squash(tr.querySelector('.mirage-sb-pts').textContent) : null,
  }));
}
const headers = (root) => [...root.querySelectorAll('.mirage-scoreboard thead th')].map((th) => squash(th.textContent));

/* Résultats de duel tels que MirageWorld.finish() les remet à la page. */
const rival = (id, slot, name, distance, duration, ghost = false) => ({ id, slot, name, ghost, distance, duration });
const duelResult = (overrides) => ({
  mode: 'duel', score: 2000, gems: 13, seed: 7, trace: [0, 400, 800], stage: 'desert', rivalDistance: 800, ...overrides,
});
const DUEL_LOSS = duelResult({
  duration: 66, rank: 4, totalRiders: 4, won: false, rivalName: 'L’OMBRE', rivalDuration: 35.8,
  rivals: [rival('ombre', 1, 'L’OMBRE', 800, 35.8), rival('sauge', 2, 'SAUGE', 800, 38.7), rival('amethyste', 3, 'AMÉTHYSTE', 800, 40.3)],
});
const DUEL_WIN = duelResult({
  duration: 61.9, score: 2200, gems: 16, rank: 1, totalRiders: 4, won: true, rivalName: 'L’OMBRE', rivalDuration: null,
  rivals: [rival('ombre', 1, 'L’OMBRE', 528, null), rival('sauge', 2, 'SAUGE', 507, null), rival('amethyste', 3, 'AMÉTHYSTE', 495, null)],
});

export async function checkMirageScoreboard(assert) {
  /* ------------- 1. Le composant : ordre, médailles, « TOI », cellules ------------- */
  const loss = await render(<MirageScoreboard rows={buildDuelStandings(DUEL_LOSS, { playerName: 'Salim' }).rows} caption="Classement du duel" />);
  try {
    assert.equal(loss.node.querySelector('table.mirage-scoreboard caption')?.textContent, 'Classement du duel',
      'le tableau est une vraie table légendée (lecteurs d’écran)');
    assert.deepEqual(headers(loss.node), ['Pos.', 'Cavalier', 'Temps'],
      'en duel, seul le joueur a un score : pas de colonne de points');
    const board = readBoard(loss.node);
    assert.deepEqual(board.map((row) => [row.rank, row.name]),
      [['1', 'L’Ombre'], ['2', 'Sauge'], ['3', 'Améthyste'], ['4', 'Salim']],
      'les rivaux arrivés avant le joueur sont classés par temps, le joueur derrière eux');
    assert.deepEqual(board.map((row) => row.isYou), [false, false, false, true], 'seule la ligne du joueur est mise en avant');
    assert.deepEqual(board[3].tags, ['TOI'], 'la ligne du joueur porte l’étiquette TOI');
    assert.deepEqual(board.map((row) => row.main), ['0:35.8', '0:38.7', '0:40.3', '1:06.0'], 'temps de course au dixième');
    assert.deepEqual(board.map((row) => row.sub), ['', '+2.9 s', '+4.5 s', '+30.2 s'], 'retard sur le vainqueur');
    assert.ok(loss.node.querySelector('tbody tr.is-pos-1 .mirage-sb-medal'), 'le 1er a sa médaille');
    assert.equal(loss.node.querySelectorAll('.mirage-sb-portrait').length, 4, 'chaque cavalier a son portrait');
  } finally { await loss.unmount(); }

  const win = await render(<MirageScoreboard rows={buildDuelStandings(DUEL_WIN).rows} />);
  try {
    const board = readBoard(win.node);
    assert.deepEqual(board.map((row) => row.name), ['Cavalier', 'L’Ombre', 'Sauge', 'Améthyste'],
      'le joueur qui franchit la ligne en premier est classé 1er, les autres par distance restante');
    assert.deepEqual(board.map((row) => [row.main, row.sub]),
      [['1:01.9', ''], ['à 272 m', 'DU BUT'], ['à 293 m', 'DU BUT'], ['à 305 m', 'DU BUT']],
      'un rival qui n’a pas fini affiche la distance qu’il lui restait');
  } finally { await win.unmount(); }

  const ghost = await render(<MirageScoreboard rows={buildDuelStandings(duelResult({
    duration: 52.5, rank: 2, totalRiders: 2, won: false,
    rivals: [rival('ombre', 1, 'Nadia', 800, 50.1, true)],
  })).rows} />);
  try {
    assert.deepEqual(readBoard(ghost.node)[0].tags, ['FANTÔME'], 'le fantôme d’un lien de défi est étiqueté et porte le nom de son auteur');
    assert.equal(readBoard(ghost.node)[0].name, 'Nadia');
  } finally { await ghost.unmount(); }

  // Un salon en direct : deux humains arrivés, un cavalier IA en piste, un humain hors ligne.
  const t0 = Date.parse('2026-09-30T20:00:05.000Z');
  const iso = (seconds) => new Date(t0 + seconds * 1000).toISOString();
  const player = (id, name, slot, extra = {}) => ({
    user_id: id, name, slot, character: slot, is_bot: false, distance: 0, score: 0, finished_at: null, last_seen: iso(59), ...extra,
  });
  const live = buildRoomStandings({
    status: 'started', started_at: new Date(t0).toISOString(),
    players: [
      player('me', 'Amine', 0, { finished_at: iso(51.4), distance: 800, score: 2150 }),
      player('bot', 'Yasmine', 1, { is_bot: true, distance: 512, score: 7218 }),
      player('nadia', 'Nadia', 2, { finished_at: iso(49), distance: 800, score: 3100 }),
      player('karim', 'Karim', 3, { distance: 300, score: 900, last_seen: iso(20) }),
    ],
  }, { meId: 'me', now: t0 + 60000 });
  const room = await render(<MirageScoreboard rows={live.rows} />);
  try {
    assert.deepEqual(headers(room.node), ['Pos.', 'Cavalier', 'Temps', 'Score'], 'deux humains ont un score : la colonne apparaît');
    const board = readBoard(room.node);
    assert.deepEqual(board.map((row) => row.name), ['Nadia', 'Amine', 'Yasmine', 'Karim'], 'arrivés par temps, puis les autres par distance');
    assert.deepEqual(board.map((row) => row.status), ['finished', 'finished', 'racing', 'offline']);
    assert.deepEqual(board[2].tags, ['IA'], 'un cavalier IA est étiqueté');
    assert.equal(board[2].live, true, 'un cavalier encore en piste a son voyant « EN PISTE »');
    assert.deepEqual([board[2].main, board[2].sub], ['à 288 m', 'EN PISTE']);
    assert.deepEqual([board[3].main, board[3].sub], ['à 500 m', 'HORS LIGNE'], 'un cavalier sans nouvelles est signalé hors ligne');
    assert.equal(board[2].score, '—', 'le score d’un cavalier IA n’est pas mis en regard de ceux des joueurs');
    assert.equal(board[0].score.replace(/\s/g, ''), '3100PTS');
    assert.equal(board[1].score.replace(/\s/g, ''), '2150PTS');
  } finally { await room.unmount(); }

  /* ------------- 2. Duel : le tableau apparaît à l'arrivée de la course ------------- */
  const duel = await mountPage('/jeu');
  try {
    const duelButton = [...duel.node.querySelectorAll('.mirage-mode-picker button')].find((button) => button.querySelector('strong')?.textContent === 'DUEL');
    await click(duelButton);
    assert.ok(worldControl.props, 'le moteur (remplacé) est monté');
    assert.ok(!duel.node.querySelector('.mirage-result-overlay'), 'pas de résultats avant l’arrivée');

    await act(async () => { worldControl.props.onFinish(DUEL_LOSS); });
    const overlay = duel.node.querySelector('.mirage-result-overlay.has-scoreboard');
    assert.ok(overlay, 'l’overlay d’arrivée du duel contient le tableau des positions');
    assert.ok(squash(overlay.querySelector('.mirage-overlay-kicker').textContent).includes('ARRIVÉE · DUEL (4ᵉ / 4)'),
      'le rang du joueur est annoncé dans l’en-tête');
    assert.equal(squash(overlay.querySelector('h2').textContent), 'UN RIVAL L’EMPORTE.');
    const board = readBoard(overlay);
    assert.deepEqual(board.map((row) => row.name), ['L’Ombre', 'Sauge', 'Améthyste', 'Cavalier'],
      'le joueur (sans nom de compte : « Cavalier ») apparaît dans le classement');
    assert.deepEqual(board.map((row) => row.isYou), [false, false, false, true]);
    assert.deepEqual(board.map((row) => row.rank), ['1', '2', '3', '4']);
    assert.ok(squash(overlay.querySelector('.mirage-result-stats').textContent).includes('13 cristaux · 2 000 pts'),
      'les cristaux et les points du joueur restent affichés sous le tableau');
    assert.ok(overlay.querySelector('.mirage-xp-award'), 'le gain d’XP reste affiché');
    assert.ok(byText(overlay, 'button', 'REJOUER'), 'on peut rejouer');
    assert.ok(byText(overlay, 'button', 'PARTAGER UN DÉFI'), 'on peut partager un défi');
    assert.ok(byText(overlay, 'button', 'CHOISIR TON MODE'), 'on peut revenir au choix du mode');
    assert.ok(!overlay.querySelector('.mirage-final-score'), 'le chrono géant cède la place au tableau');

    // Victoire : le joueur passe en tête, les rivaux se classent derrière lui.
    await act(async () => { worldControl.props.onFinish(DUEL_WIN); });
    const won = duel.node.querySelector('.mirage-result-overlay.has-scoreboard');
    assert.equal(squash(won.querySelector('h2').textContent), 'VICTOIRE DU CAVALIER !');
    assert.ok(squash(won.querySelector('.mirage-overlay-kicker').textContent).includes('(1ᵉʳ / 4)'));
    assert.deepEqual(readBoard(won).map((row) => row.name), ['Cavalier', 'L’Ombre', 'Sauge', 'Améthyste']);
    assert.equal(readBoard(won)[0].isYou, true);
  } finally { await duel.unmount(); }

  // Lien de défi : le rival « L'Ombre » est le fantôme de l'auteur du défi.
  const code = encodeChallenge({ seed: 20260929, duration: 41.5, trace: [0, 240, 480, 800], name: 'Salim', stage: 'prairie' });
  const challenged = await mountPage(`/jeu?duel=${code}`);
  try {
    await act(async () => {
      worldControl.props.onFinish(duelResult({
        duration: 44.2, rank: 2, totalRiders: 4, won: false, stage: 'prairie',
        rivals: [rival('ombre', 1, 'Salim', 800, 41.5, true), rival('sauge', 2, 'SAUGE', 610, null), rival('amethyste', 3, 'AMÉTHYSTE', 590, null)],
      }));
    });
    const board = readBoard(challenged.node.querySelector('.mirage-result-overlay'));
    assert.deepEqual(board.map((row) => row.name), ['Salim', 'Cavalier', 'Sauge', 'Améthyste']);
    assert.deepEqual(board[0].tags, ['FANTÔME'], 'le fantôme du défi est identifié dans le classement');
  } finally { await challenged.unmount(); }

  /* --------- 3. En ligne : fenêtre de résultats, classement en direct, salon --------- */
  // Les salons locaux et le décompte lisent `Date.now()` : on l'avance pour ne pas attendre les
  // 5 s de départ ni les 50 s de course d'un cavalier IA.
  const realNow = Date.now.bind(Date);
  let skew = 0;
  Date.now = () => realNow() + skew;
  resetLocalRoomsForTests({ seed: false });
  const online = await mountPage('/jeu?mode=online');
  try {
    await click(byText(online.node, 'button', 'CRÉER ROOM'));
    await click(byText(online.node, 'button', 'CRÉER LA ROOM'));
    await waitUntil(() => online.node.querySelector('.mirage-room-header-panel'), 'le salon est créé');
    await click(byText(online.node, 'button', 'SE METTRE PRÊT'));
    const launch = await waitUntil(() => {
      const button = online.node.querySelector('.mirage-launch-party-btn');
      return button && !button.disabled ? button : null;
    }, 'le bouton de lancement est actif');
    await click(launch);
    await waitUntil(() => online.node.querySelector('.mirage-game-popup'), 'la fenêtre de course s’ouvre');
    assert.ok(!online.node.querySelector('.mirage-results-dialog'), 'pas de résultats avant l’arrivée');

    skew = 6000; // le décompte de 5 s est écoulé
    await waitUntil(() => squash(online.node.querySelector('.mirage-game-popup')?.textContent).includes('COURSE EN COURS'), 'la course démarre');

    await act(async () => {
      worldControl.props.onFinish({ mode: 'online', score: 2150, gems: 12, duration: 50, distance: 800, lane: 1, jump: 0 });
    });
    const dialog = await waitUntil(() => online.node.querySelector('.mirage-results-dialog'), 'la fenêtre de résultats s’ouvre');
    assert.equal(dialog.getAttribute('role'), 'dialog');
    assert.equal(dialog.getAttribute('aria-modal'), 'true');
    assert.ok(!online.node.querySelector('.mirage-game-popup'), 'la fenêtre de course se referme à l’arrivée');
    const primary = byText(dialog, 'button', 'VOIR LE SALON');
    assert.ok(document.activeElement === primary, 'le focus est placé sur l’action principale de la fenêtre');

    // Le salon enregistre l'arrivée ; un cavalier IA est encore en piste → classement provisoire.
    await waitUntil(() => squash(dialog.querySelector('.mirage-results-status')?.textContent).startsWith('CLASSEMENT PROVISOIRE'), 'classement provisoire');
    assert.equal(squash(dialog.querySelector('h2').textContent), 'VICTOIRE DU CAVALIER !', 'premier à franchir la ligne');
    assert.ok(squash(dialog.querySelector('.mirage-results-status').textContent).includes('1 CAVALIER ENCORE EN PISTE'));
    assert.ok(squash(dialog.querySelector('.mirage-overlay-kicker').textContent).includes('(1ᵉʳ / 2)'));
    let board = readBoard(dialog);
    assert.equal(board.length, 2, 'le joueur et le cavalier IA ajouté au départ');
    assert.deepEqual([board[0].rank, board[0].isYou, board[0].status], ['1', true, 'finished']);
    assert.match(board[0].main, /^\d:\d\d\.\d$/, 'le temps du joueur vient de l’horloge du salon');
    assert.deepEqual(board[1].tags, ['IA']);
    assert.deepEqual([board[1].status, board[1].live, board[1].sub], ['racing', true, 'EN PISTE']);
    assert.match(board[1].main, /^à \d+ m$/, 'le cavalier en piste affiche la distance restante');
    assert.ok(squash(dialog.querySelector('.mirage-result-stats').textContent).includes('12 cristaux · 2 150 pts'));
    assert.ok(dialog.querySelector('.mirage-xp-award'), 'le gain d’XP est affiché dans la fenêtre');

    // Le cavalier IA franchit la ligne : le classement se met à jour tout seul.
    skew += 70000;
    await waitUntil(() => squash(dialog.querySelector('.mirage-results-status')?.textContent).startsWith('CLASSEMENT FINAL'), 'classement final');
    board = readBoard(dialog);
    assert.deepEqual(board.map((row) => [row.rank, row.isYou, row.status]), [['1', true, 'finished'], ['2', false, 'finished']]);
    assert.match(board[1].main, /^\d:\d\d\.\d$/, 'le cavalier IA a maintenant son temps');
    assert.match(board[1].sub, /^\+/, 'et son retard sur le vainqueur');
    assert.equal(dialog.querySelector('.mirage-results-status').classList.contains('is-final'), true);

    // Clavier : Tab reste dans la fenêtre, Échap la ferme.
    const leave = byText(dialog, 'button', 'QUITTER LA ROOM');
    leave.focus();
    const tab = new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    await act(async () => { document.dispatchEvent(tab); });
    assert.equal(tab.defaultPrevented, true, 'Tab au dernier bouton reboucle au lieu de sortir de la fenêtre');
    assert.ok(document.activeElement === primary, '… vers le premier bouton');
    await act(async () => { document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    assert.ok(!online.node.querySelector('.mirage-results-dialog'), 'Échap ferme la fenêtre de résultats');

    // Le salon garde le même classement, remonté sous l'en-tête (avant la liste des joueurs).
    const banner = online.node.querySelector('.mirage-room-finished-banner');
    const panel = online.node.querySelector('.mirage-room-panel');
    const players = online.node.querySelector('.mirage-room-interior-grid');
    assert.ok(banner && panel && players, 'bandeau, classement et liste des joueurs sont présents');
    const FOLLOWING = window.Node.DOCUMENT_POSITION_FOLLOWING;
    assert.ok(banner.compareDocumentPosition(panel) & FOLLOWING, 'le bandeau précède le classement');
    assert.ok(panel.compareDocumentPosition(players) & FOLLOWING, 'le classement précède la liste des joueurs : pas de défilement pour le trouver');
    assert.deepEqual(readBoard(panel).map((row) => [row.rank, row.isYou, row.status]), [['1', true, 'finished'], ['2', false, 'finished']],
      'le classement du salon est le même que celui de la fenêtre');
    assert.ok(panel.querySelector('.mirage-xp-award'), 'le gain d’XP reste visible dans le salon');

    await click(byText(online.node.querySelector('.mirage-room-header-panel'), 'button', 'QUITTER LA ROOM'));
    await waitUntil(() => byText(online.node, 'button', 'CRÉER ROOM'), 'retour au choix des salons');
    assert.ok(!online.node.querySelector('.mirage-room-panel'), 'plus de classement hors d’un salon');
  } finally {
    Date.now = realNow;
    await online.unmount();
  }
}
