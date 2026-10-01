import test from 'node:test';
import assert from 'node:assert/strict';
import { DUEL_DISTANCE } from '../src/games/mirageRules.js';
import {
  OFFLINE_AFTER_MS,
  buildDuelStandings,
  buildRoomStandings,
  formatGap,
  formatRaceTime,
  rankLabel,
} from '../src/games/mirageStandings.js';

/* ───────────────────────────── Formats ───────────────────────────── */

test('rankLabel uses the same ordinals as the HUD rank badge', () => {
  assert.equal(rankLabel(1), '1ᵉʳ');
  assert.equal(rankLabel(2), '2ᵉ');
  assert.equal(rankLabel(4), '4ᵉ');
  assert.equal(rankLabel(0), '1ᵉʳ');
  assert.equal(rankLabel(undefined), '1ᵉʳ');
});

test('formatRaceTime prints m:ss.t and never overflows to 0:60.0', () => {
  assert.equal(formatRaceTime(47.7), '0:47.7');
  assert.equal(formatRaceTime(61.3), '1:01.3');
  assert.equal(formatRaceTime(59.96), '1:00.0');
  assert.equal(formatRaceTime(0), '0:00.0');
  assert.equal(formatRaceTime(125), '2:05.0');
  assert.equal(formatRaceTime(null), '—');
  assert.equal(formatRaceTime(undefined), '—');
  assert.equal(formatRaceTime(NaN), '—');
  assert.equal(formatRaceTime(-3), '—');
});

test('formatGap prints the delay behind the winner', () => {
  assert.equal(formatGap(1.24), '+1.2 s');
  assert.equal(formatGap(0), '+0.0 s');
  assert.equal(formatGap(13.6), '+13.6 s');
  assert.equal(formatGap(65.3), '+1:05.3');
  assert.equal(formatGap(null), '');
  assert.equal(formatGap(-1), '');
});

/* ─────────────────────────────── Duel ─────────────────────────────── */

const rivalsAt = (...specs) => specs.map(([id, slot, name, distance, duration]) => ({ id, slot, name, distance, duration }));
const names = (standings) => standings.rows.map((row) => row.name);

test('duel: a win puts the player first and ranks the others by distance left', () => {
  const standings = buildDuelStandings({
    mode: 'duel', duration: 47.2, score: 3050, gems: 15, rank: 1, totalRiders: 4, won: true,
    rivals: rivalsAt(['ombre', 1, 'L’OMBRE', 744, null], ['sauge', 2, 'SAUGE', 790, null], ['amethyste', 3, 'AMÉTHYSTE', 611, null]),
  }, { playerName: 'Salim' });

  assert.deepEqual(names(standings), ['Salim', 'Sauge', 'L’Ombre', 'Améthyste']);
  assert.deepEqual(standings.rows.map((row) => row.rank), [1, 2, 3, 4]);
  assert.equal(standings.total, 4);
  assert.equal(standings.playerRank, 1);
  assert.equal(standings.playerWon, true);
  assert.equal(standings.winner, 'Salim');
  assert.equal(standings.done, true);

  const [you, sauge, ombre, amethyste] = standings.rows;
  assert.equal(you.isYou, true);
  assert.equal(you.status, 'finished');
  assert.equal(you.time, 47.2);
  assert.equal(you.gap, null, 'the winner has no gap');
  assert.equal(you.score, 3050);
  assert.deepEqual([sauge.status, sauge.remaining, sauge.time, sauge.gap], ['behind', 10, null, null]);
  assert.deepEqual([ombre.status, ombre.remaining], ['behind', 56]);
  assert.deepEqual([amethyste.status, amethyste.remaining], ['behind', 189]);
  assert.equal(standings.gems, 15);
  assert.equal(standings.score, 3050);
});

test('duel: rivals who already crossed the line are ranked by time, ahead of the player', () => {
  const standings = buildDuelStandings({
    mode: 'duel', duration: 61.3, score: 3050, gems: 15, rank: 3, totalRiders: 4, won: false,
    rivals: rivalsAt(['ombre', 1, 'L’OMBRE', 800, 47.9], ['sauge', 2, 'SAUGE', 800, 47.7], ['amethyste', 3, 'AMÉTHYSTE', 790, null]),
  });

  assert.deepEqual(names(standings), ['Sauge', 'L’Ombre', 'Cavalier', 'Améthyste']);
  assert.equal(standings.playerRank, 3);
  assert.equal(standings.playerWon, false);
  assert.equal(standings.winner, 'Sauge');

  const [sauge, ombre, you, amethyste] = standings.rows;
  assert.equal(sauge.time, 47.7);
  assert.equal(sauge.gap, null);
  assert.equal(ombre.time, 47.9);
  assert.ok(Math.abs(ombre.gap - 0.2) < 1e-9);
  assert.equal(you.status, 'finished');
  assert.ok(Math.abs(you.gap - 13.6) < 1e-9);
  assert.deepEqual([amethyste.status, amethyste.remaining, amethyste.gap], ['behind', 10, null]);
});

test('duel: on an equal time the rival is ranked ahead, like the in-game rank', () => {
  const standings = buildDuelStandings({
    duration: 48.0, score: 1, gems: 0,
    rivals: rivalsAt(['ombre', 1, 'L’OMBRE', 800, 48.0], ['sauge', 2, 'SAUGE', 700, null]),
  });
  assert.deepEqual(names(standings), ['L’Ombre', 'Cavalier', 'Sauge']);
  assert.equal(standings.playerRank, 2);
  assert.equal(standings.rows[1].gap, 0);
});

test('duel: a challenge ghost keeps its owner’s name and is tagged; rivals get a portrait palette', () => {
  const standings = buildDuelStandings({
    duration: 52.5, score: 900, gems: 3,
    rivals: [
      { id: 'ombre', slot: 1, name: 'Nadia', distance: 800, duration: 50.1, ghost: true },
      { id: 'sauge', slot: 2, name: 'SAUGE', distance: 400, duration: null },
    ],
  });
  const ghost = standings.rows.find((row) => row.key === 'ombre');
  assert.equal(ghost.name, 'Nadia');
  assert.equal(ghost.tag, 'FANTÔME');
  assert.equal(ghost.character, 1, 'the ghost wears L’Ombre’s colours on the track');
  const sauge = standings.rows.find((row) => row.key === 'sauge');
  assert.equal(sauge.name, 'Sauge');
  assert.equal(sauge.tag, null);
  assert.equal(sauge.character, 2);
});

test('duel: the player row carries the equipped skin palette and the chosen name', () => {
  const palette = [1, 2, 3, 4, 5, 6, 7];
  const standings = buildDuelStandings({ duration: 40, score: 10, gems: 1, rivals: [] }, { playerName: 'Amine', playerPalette: palette });
  const you = standings.rows.find((row) => row.isYou);
  assert.equal(you.name, 'Amine');
  assert.equal(you.palette, palette);
});

test('duel: old payloads with a single leading rival still produce a scoreboard', () => {
  const standings = buildDuelStandings({
    duration: 55, score: 100, gems: 2, rank: 2, totalRiders: 2,
    rivalName: 'L’OMBRE', rivalDuration: 50.5, rivalDistance: 800,
  });
  assert.equal(standings.total, 2);
  assert.equal(standings.rows[0].name, 'L’OMBRE');
  assert.equal(standings.rows[0].time, 50.5);
  assert.equal(standings.playerRank, 2);
});

test('duel: a rival on the line without a chrono is given the player’s time and stays ahead', () => {
  const standings = buildDuelStandings({
    duration: 47.9, score: 0, gems: 0,
    rivals: rivalsAt(['ombre', 1, 'L’OMBRE', 801, null]),
  });
  assert.equal(standings.rows[0].name, 'L’Ombre');
  assert.equal(standings.rows[0].status, 'finished');
  assert.equal(standings.rows[0].time, 47.9);
  assert.equal(standings.playerRank, 2);
});

test('duel: a rival rounded up to the line but not finished still has a metre to go', () => {
  const standings = buildDuelStandings({
    duration: 47.9, score: 0, gems: 0,
    rivals: rivalsAt(['ombre', 1, 'L’OMBRE', 799.6, null]),
  });
  const rival = standings.rows.find((row) => !row.isYou);
  assert.equal(rival.status, 'behind');
  assert.equal(rival.remaining, 1);
});

test('duel: the player’s rank always matches the in-game rank formula (randomised)', () => {
  let seed = 7;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const ids = [['ombre', 'L’OMBRE'], ['sauge', 'SAUGE'], ['amethyste', 'AMÉTHYSTE']];

  for (let run = 0; run < 400; run += 1) {
    const elapsed = 38 + random() * 32;
    const distance = DUEL_DISTANCE + random() * 0.6;
    const riders = ids.slice(0, 1 + Math.floor(random() * 3)).map(([id, name], index) => {
      const crossed = random() < 0.55;
      // Les égalités exactes existent : un rival peut passer la ligne dans la même image que le joueur.
      const finishedAt = crossed ? (random() < 0.2 ? elapsed : 36 + random() * (elapsed - 36)) : null;
      return { id, name, slot: index + 1, dist: crossed ? DUEL_DISTANCE : 420 + random() * 379, finishedAt };
    });

    // Exactement le calcul de MirageWorld.finish().
    const aheadCount = riders.filter((r) => (r.finishedAt !== null && r.finishedAt <= elapsed) || r.dist > distance).length;
    const payload = {
      mode: 'duel', score: 100, gems: 1, duration: Math.round(elapsed * 10) / 10, rank: 1 + aheadCount,
      rivals: riders.map((r) => ({
        id: r.id, slot: r.slot, name: r.name,
        distance: Math.round(r.dist),
        duration: r.finishedAt === null ? null : Math.round(r.finishedAt * 10) / 10,
      })),
    };

    const standings = buildDuelStandings(payload);
    assert.equal(standings.playerRank, payload.rank, `run ${run}: ${JSON.stringify(payload)}`);
    assert.equal(standings.total, 1 + riders.length);
    // Les lignes sont bien triées : arrivés (temps croissants) puis restants (distance décroissante).
    const finishers = standings.rows.filter((row) => row.finished);
    assert.deepEqual(finishers.map((row) => row.time), [...finishers.map((row) => row.time)].sort((a, b) => a - b));
    const behind = standings.rows.filter((row) => !row.finished);
    assert.deepEqual(behind.map((row) => row.distance), [...behind.map((row) => row.distance)].sort((a, b) => b - a));
    assert.equal(standings.rows.findIndex((row) => !row.finished) === -1
      || standings.rows.findIndex((row) => !row.finished) === finishers.length, true, 'finishers come first');
  }
});

/* ───────────────────────── Salon en ligne ───────────────────────── */

const T0 = Date.parse('2026-09-30T20:00:05.000Z');
const at = (seconds) => new Date(T0 + seconds * 1000).toISOString();
// `last_seen` par défaut : vu à T0 + 59 s, soit « à l'instant » pour tous les tests qui
// interrogent le salon à T0 + 40…60 s. Les tests de connexion perdue le fixent eux-mêmes.
const player = (id, name, slot, extra = {}) => ({
  user_id: id, name, slot, character: slot, is_bot: false, distance: 0, score: 0, finished_at: null,
  last_seen: at(59), ...extra,
});
const room = (players, extra = {}) => ({ status: 'started', started_at: new Date(T0).toISOString(), players, ...extra });

test('room: finishers come first by arrival time, then riders still racing by distance', () => {
  const standings = buildRoomStandings(room([
    player('a', 'Amine', 0, { finished_at: at(51.42), distance: 800, score: 2150 }),
    player('b', 'Yasmine', 1, { is_bot: true, distance: 512, score: 7218, last_seen: at(31) }),
    player('c', 'Nadia', 2, { finished_at: at(49.02), distance: 800, score: 3100 }),
    player('d', 'Karim', 3, { is_bot: true, distance: 640, score: 9010, last_seen: at(39) }),
  ]), { meId: 'a', now: T0 + 40000 });

  assert.deepEqual(names(standings), ['Nadia', 'Amine', 'Karim', 'Yasmine']);
  assert.deepEqual(standings.rows.map((row) => row.rank), [1, 2, 3, 4]);
  assert.equal(standings.playerRank, 2);
  assert.equal(standings.playerWon, false);
  assert.equal(standings.winner, 'Nadia');

  const [nadia, amine, karim, yasmine] = standings.rows;
  assert.ok(Math.abs(nadia.time - 49.02) < 1e-9);
  assert.equal(nadia.gap, null);
  assert.ok(Math.abs(amine.time - 51.42) < 1e-9);
  assert.ok(Math.abs(amine.gap - 2.4) < 1e-9);
  assert.equal(amine.isYou, true);
  assert.deepEqual([karim.status, karim.remaining, karim.time, karim.gap], ['racing', 160, null, null]);
  assert.deepEqual([yasmine.status, yasmine.remaining], ['racing', 288]);
  assert.equal(standings.racing, 2);
  assert.equal(standings.done, false);
  assert.equal(standings.confirmed, true);
});

test('room: the room is over once nobody is left on the track', () => {
  const standings = buildRoomStandings(room([
    player('a', 'Amine', 0, { finished_at: at(50), distance: 800 }),
    player('b', 'Yasmine', 1, { is_bot: true, finished_at: at(48.8), distance: 800 }),
  ]), { meId: 'a', now: T0 + 60000 });
  assert.equal(standings.done, true);
  assert.equal(standings.racing, 0);
  assert.deepEqual(names(standings), ['Yasmine', 'Amine']);
});

test('room: until the server records it, the local finish is provisional but already ranked', () => {
  const players = [
    player('a', 'Amine', 0, { distance: 790 }),
    player('b', 'Yasmine', 1, { is_bot: true, distance: 500 }),
    player('c', 'Nadia', 2, { finished_at: at(49.0), distance: 800 }),
  ];
  const provisional = buildRoomStandings(room(players), { meId: 'a', now: T0 + 50000, myFinishedAt: at(50.3) });
  assert.deepEqual(names(provisional), ['Nadia', 'Amine', 'Yasmine']);
  assert.equal(provisional.playerRank, 2);
  assert.equal(provisional.confirmed, false, 'the room has not acknowledged the finish yet');
  assert.equal(provisional.racing, 1, 'only the AI rider is still on the track');
  assert.ok(Math.abs(provisional.rows[1].time - 50.3) < 1e-9);
  assert.equal(provisional.rows[1].status, 'finished');

  // Dès que le salon a enregistré l'arrivée, sa valeur remplace la provisoire.
  const confirmed = buildRoomStandings(
    room(players.map((p) => (p.user_id === 'a' ? { ...p, finished_at: at(50.6), distance: 800 } : p))),
    { meId: 'a', now: T0 + 51000, myFinishedAt: at(50.3) },
  );
  assert.equal(confirmed.confirmed, true);
  assert.ok(Math.abs(confirmed.rows[1].time - 50.6) < 1e-9);
});

test('room: the result is never final while the local finish is still unconfirmed', () => {
  // Tout le monde d'autre est arrivé, mais le salon n'a pas encore enregistré l'arrivée du joueur local.
  const others = [
    player('b', 'Yasmine', 1, { is_bot: true, finished_at: at(52.6), distance: 800 }),
    player('c', 'Nadia', 2, { finished_at: at(49.0), distance: 800 }),
  ];
  const me = player('a', 'Amine', 0, { distance: 796 });
  const pending = buildRoomStandings(room([me, ...others]), { meId: 'a', now: T0 + 60000, myFinishedAt: at(50.3) });
  assert.equal(pending.racing, 0);
  assert.equal(pending.confirmed, false);
  assert.equal(pending.done, false, 'provisional: my rank may still move once the room records my finish');

  const recorded = buildRoomStandings(
    room([{ ...me, finished_at: at(70.5), distance: 800 }, ...others]),
    { meId: 'a', now: T0 + 71000, myFinishedAt: at(50.3) },
  );
  assert.equal(recorded.done, true);
  assert.deepEqual(names(recorded), ['Nadia', 'Yasmine', 'Amine'], 'the room’s time replaces the estimate and can change the rank');
  assert.equal(recorded.playerRank, 3);
});

test('room: without a provisional finish the local player is still racing', () => {
  const standings = buildRoomStandings(room([
    player('a', 'Amine', 0, { distance: 790 }),
    player('b', 'Nadia', 1, { finished_at: at(49), distance: 800 }),
  ]), { meId: 'a', now: T0 + 50000 });
  assert.deepEqual(names(standings), ['Nadia', 'Amine']);
  assert.equal(standings.rows[1].status, 'racing');
  assert.equal(standings.rows[1].remaining, 10);
});

test('room: an AI rider’s score is not shown, the local score comes from the finish payload', () => {
  const standings = buildRoomStandings(room([
    player('a', 'Amine', 0, { finished_at: at(51), distance: 800, score: 2000 }),
    player('b', 'Yasmine', 1, { is_bot: true, finished_at: at(49), distance: 800, score: 11250 }),
    player('c', 'Nadia', 2, { finished_at: at(50), distance: 800, score: 3100 }),
  ]), { meId: 'a', now: T0 + 60000, myScore: 2150 });
  const byName = Object.fromEntries(standings.rows.map((row) => [row.name, row]));
  assert.equal(byName.Yasmine.score, null);
  assert.equal(byName.Yasmine.tag, 'IA');
  assert.equal(byName.Amine.score, 2150);
  assert.equal(byName.Nadia.score, 3100);
  assert.equal(byName.Nadia.tag, null);
});

test('room: a rider silent for more than 10 s is offline and does not hold the result back', () => {
  const now = T0 + 60000;
  const standings = buildRoomStandings(room([
    player('a', 'Amine', 0, { finished_at: at(50), distance: 800, last_seen: at(50) }),
    player('b', 'Nadia', 1, { distance: 300, last_seen: new Date(now - OFFLINE_AFTER_MS - 500).toISOString() }),
    player('c', 'Karim', 2, { distance: 250, last_seen: new Date(now - 2000).toISOString() }),
  ]), { meId: 'a', now });
  const byName = Object.fromEntries(standings.rows.map((row) => [row.name, row]));
  assert.equal(byName.Nadia.status, 'offline');
  assert.equal(byName.Karim.status, 'racing');
  assert.equal(standings.racing, 1);
  assert.equal(standings.done, false);

  const alone = buildRoomStandings(room([
    player('a', 'Amine', 0, { finished_at: at(50), distance: 800 }),
    player('b', 'Nadia', 1, { distance: 300, last_seen: new Date(now - OFFLINE_AFTER_MS - 500).toISOString() }),
  ]), { meId: 'a', now });
  assert.equal(alone.racing, 0);
  assert.equal(alone.done, true);
});

test('room: riders arriving in the same instant are ordered by slot', () => {
  const standings = buildRoomStandings(room([
    player('c', 'Karim', 3, { is_bot: true, finished_at: at(49), distance: 800 }),
    player('b', 'Yasmine', 1, { is_bot: true, finished_at: at(49), distance: 800 }),
    player('a', 'Amine', 0, { finished_at: at(50), distance: 800 }),
  ]), { meId: 'a', now: T0 + 60000 });
  assert.deepEqual(names(standings), ['Yasmine', 'Karim', 'Amine']);
});

test('room: a missing or empty room gives an empty, harmless scoreboard', () => {
  for (const value of [null, undefined, {}, { players: [] }]) {
    const standings = buildRoomStandings(value, { meId: 'a' });
    assert.deepEqual(standings.rows, []);
    assert.equal(standings.playerRank, 0);
    assert.equal(standings.done, false);
    assert.equal(standings.confirmed, false);
  }
});

test('room: a room with no start time still ranks finishers, just without times', () => {
  const standings = buildRoomStandings({
    status: 'started',
    players: [
      player('a', 'Amine', 0, { finished_at: at(50), distance: 800 }),
      player('b', 'Nadia', 1, { finished_at: at(49), distance: 800 }),
    ],
  }, { meId: 'a', now: T0 + 60000 });
  assert.deepEqual(names(standings), ['Nadia', 'Amine']);
  assert.equal(standings.rows[0].time, null);
  assert.equal(standings.rows[0].gap, null);
});

test('room: portraits follow the chosen character, defaulting to the slot', () => {
  const standings = buildRoomStandings(room([
    player('a', 'Amine', 0, { character: 2, finished_at: at(50), distance: 800 }),
    { ...player('b', 'Nadia', 3, { finished_at: at(51), distance: 800 }), character: undefined },
  ]), { meId: 'a', now: T0 + 60000 });
  assert.equal(standings.rows[0].character, 2);
  assert.equal(standings.rows[1].character, 3);
});
