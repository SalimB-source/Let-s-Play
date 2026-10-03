import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CUPS,
  CUP_POINTS,
  CUP_RIDER_COUNT,
  DEFAULT_CUP_ID,
  MAX_RIDER_NAME,
  PLAYER_RIDER_ID,
  classifyRace,
  cleanRiderName,
  createCupRun,
  cupCurrentStage,
  cupRaceIndex,
  cupStandings,
  cupWinner,
  cupGoldMaximum,
  cupRequirement,
  getCup,
  isCupComplete,
  isCupUnlocked,
  placeLabel,
  pointsForPlace,
  recordCupRace,
  unlockedCups,
} from '../src/games/mirageCup.js';
import { DUEL_DISTANCE, DUEL_RIVALS, duelRivalsForTrack, laneCount, setLaneCount } from '../src/games/mirageRules.js';
import { CHARACTER_PALETTES } from '../src/games/mirageCharacters.js';
import { SKINS, WIN_COINS } from '../src/games/mirageProgression.js';
import { MIRAGE_CUP_TROPHIES_KEY, createState, mergeStates, normalizeState, reduce } from '../src/achievements/engine.js';

// Résultat tel que MirageWorld.finish() l’émet en duel : les rivaux déjà
// arrivés portent leur chrono, les autres `null` et leur position en mètres.
// `times[id]` = chrono (nombre) ou { distance } pour un rival encore en piste.
function duelResult({ stage, duration, times = {} }) {
  const rivals = DUEL_RIVALS.map((rival, index) => {
    const value = times[rival.id];
    const arrived = typeof value === 'number';
    return {
      id: rival.id,
      slot: index + 1,
      name: rival.name,
      duration: arrived ? value : null,
      distance: arrived ? DUEL_DISTANCE : value?.distance ?? 0,
    };
  });
  const ahead = rivals.filter((rival) => rival.duration !== null && rival.duration <= duration).length;
  return { mode: 'duel', stage, duration, rank: ahead + 1, totalRiders: 4, rivals, won: ahead === 0, score: 1200, gems: 9 };
}

// Résultat d’une course décrite par son ordre d’arrivée (ids, du 1ᵉʳ au 4ᵉ) :
// les rivaux placés avant le joueur sont arrivés, les autres sont encore en piste.
function resultFromOrder(stage, order) {
  const at = order.indexOf('player');
  const times = {};
  order.forEach((id, index) => {
    if (id === 'player') return;
    times[id] = index < at ? 40 + index : { distance: DUEL_DISTANCE - 10 * (index - at) };
  });
  return duelResult({ stage, duration: 40 + at + 0.5, times });
}

function playOrders(orders, options) {
  let run = createCupRun('desert', options);
  orders.forEach((order, index) => {
    run = recordCupRace(run, resultFromOrder(run.stages[index], order));
  });
  return run;
}

const idsOf = (rows) => rows.map((row) => row.id);
const placesOf = (race) => Object.fromEntries(race.placements.map((line) => [line.riderId, line.place]));

test('the points table rewards every place strictly more than the one below it', () => {
  assert.equal(CUP_POINTS.length, 4);
  assert.equal(CUP_RIDER_COUNT, 4);
  for (const points of CUP_POINTS) assert.ok(Number.isInteger(points) && points > 0);
  for (let place = 1; place < CUP_POINTS.length; place++) {
    assert.ok(CUP_POINTS[place - 1] > CUP_POINTS[place], `place ${place} must beat place ${place + 1}`);
  }
  assert.deepEqual([1, 2, 3, 4].map(pointsForPlace), [...CUP_POINTS]);
  assert.equal(pointsForPlace(0), 0);
  assert.equal(pointsForPlace(5), 0);
  assert.equal(pointsForPlace('x'), 0);
});

test('the Coupe des Légendes chains five races: Remparts d’Ocre, Château de l’Infini, Thunder Airbase, Costa Omertà, Plaines de Yōtei', () => {
  const cup = getCup('legends');
  assert.equal(cup.name, 'Coupe des Légendes');
  assert.equal(cup.trophyDesign, 'legends');
  assert.deepEqual([...cup.stages], ['ramparts', 'infinity', 'airbase', 'sardinia', 'japan']);
  const run = createCupRun('legends');
  assert.deepEqual(run.stages, ['ramparts', 'infinity', 'airbase', 'sardinia', 'japan']);
  assert.equal(cupCurrentStage(run), 'ramparts');
});

test('a cup trophy is kept once per cup and merges between a player’s devices', () => {
  const firstWin = reduce(createState(), {
    type: 'mirage_cup_won',
    cupId: 'desert',
    at: '2026-09-30T12:00:00.000Z',
  }).state;
  const replayWin = reduce(firstWin, {
    type: 'mirage_cup_won',
    cupId: 'desert',
    at: '2026-10-01T12:00:00.000Z',
  }).state;
  const anotherCup = reduce(createState(), {
    type: 'mirage_cup_won',
    cupId: 'worldtour',
    at: '2026-10-02T12:00:00.000Z',
  }).state;

  assert.deepEqual(firstWin.sets[MIRAGE_CUP_TROPHIES_KEY], ['desert']);
  assert.deepEqual(replayWin.sets[MIRAGE_CUP_TROPHIES_KEY], ['desert'], 'replaying a won cup adds no duplicate');
  assert.deepEqual(
    mergeStates(firstWin, anotherCup).sets[MIRAGE_CUP_TROPHIES_KEY],
    ['desert', 'worldtour'],
    'unique trophies survive account/device sync',
  );
  const restored = normalizeState({
    ...firstWin,
    sets: { ...firstWin.sets, [MIRAGE_CUP_TROPHIES_KEY]: ['desert', 'desert'] },
  });
  assert.deepEqual(restored.sets[MIRAGE_CUP_TROPHIES_KEY], ['desert'], 'stored duplicates are normalized away');
});

test('the catalogue starts with the Coupe du Désert: Dunes de l’Écho, Dust Creek, Plaines d’Or', () => {
  assert.equal(DEFAULT_CUP_ID, 'desert');
  const cup = getCup('desert');
  assert.equal(cup.name, 'Coupe du Désert');
  assert.deepEqual([...cup.stages], ['desert', 'western', 'prairie']);
  assert.equal(getCup('inconnue'), null);
  assert.equal(new Set(CUPS.map((entry) => entry.id)).size, CUPS.length, 'cup ids are unique');
  assert.equal(new Set(CUPS.map((entry) => entry.trophyDesign)).size, CUPS.length, 'every cup has its own trophy design');
  for (const entry of CUPS) {
    assert.ok(entry.stages.length >= 2, `${entry.id} chains several races`);
    assert.ok(Object.isFrozen(entry) && Object.isFrozen(entry.stages), 'the catalogue is immutable');
  }
});

test('cup gold maxima match 10 OR per win across all races — including two 30 OR cups', () => {
  assert.deepEqual(CUPS.map(cupGoldMaximum), [30, 30, 40, 50]);
  for (const cup of CUPS) {
    assert.equal(cupGoldMaximum(cup), cup.stages.length * WIN_COINS, `${cup.id}: every race victory contributes 10 OR`);
  }
  assert.equal(cupGoldMaximum('inconnue'), 0, 'an unknown cup has no gold maximum');
  assert.equal(cupGoldMaximum(null), 0);
  assert.equal(cupGoldMaximum({ maxCoins: -10 }), 0, 'a negative value is clamped to zero');
  assert.equal(cupGoldMaximum({ maxCoins: '40' }), 40);
});

test('Coupe des Vents has three distinct maps and can pay 30 OR for three wins', () => {
  const cup = getCup('winds');
  assert.equal(cup.name, 'Coupe des Vents');
  assert.equal(cup.trophyDesign, 'winds');
  assert.deepEqual([...cup.stages], ['sardinia', 'alger', 'snakeway']);
  assert.equal(new Set(cup.stages).size, 3, 'each of its three races uses a different map');
  assert.ok(cup.stages.every((stage) => !getCup('desert').stages.includes(stage)), 'none of the maps are from the Coupe du Désert');
  assert.equal(cup.stages.length * WIN_COINS, 30, '10 OR per win × three races = 30 OR maximum');
  assert.equal(cupGoldMaximum(cup), 30);

  let run = createCupRun(cup.id);
  for (const stage of cup.stages) {
    assert.equal(cupCurrentStage(run), stage);
    run = recordCupRace(run, resultFromOrder(stage, ['player', 'ombre', 'sauge', 'amethyste']));
  }
  assert.equal(isCupComplete(run), true);
  assert.equal(cupWinner(run).id, PLAYER_RIDER_ID, 'the winner of all three races lifts the trophy');
  assert.equal(cupWinner(run).points, 30);
});

test('a fresh cup has four riders — the player first, then the three NPC rivals — and no race yet', () => {
  const run = createCupRun('desert', { playerName: '  Salim  ', playerColors: CHARACTER_PALETTES[2] });
  assert.equal(run.cupId, 'desert');
  assert.equal(run.riders.length, CUP_RIDER_COUNT);
  assert.deepEqual(idsOf(run.riders), [PLAYER_RIDER_ID, ...DUEL_RIVALS.map((rival) => rival.id)]);
  assert.deepEqual(run.riders.map((rider) => rider.slot), [0, 1, 2, 3]);
  assert.equal(run.riders.filter((rider) => rider.isPlayer).length, 1);
  assert.equal(run.riders[0].isPlayer, true);
  assert.equal(run.riders[0].name, 'Salim');
  assert.deepEqual(run.riders[0].colors, [...CHARACTER_PALETTES[2]]);
  assert.deepEqual(run.riders[1].colors, [...CHARACTER_PALETTES[DUEL_RIVALS[0].paletteIndex]]);
  assert.deepEqual(run.races, []);
  assert.equal(isCupComplete(run), false);
  assert.equal(cupRaceIndex(run), 0);
  assert.equal(cupCurrentStage(run), 'desert');
  assert.equal(cupWinner(run), null);
  assert.equal(createCupRun('inconnue'), null);
  // Sans couleurs valides, le joueur garde la tenue d’origine.
  assert.deepEqual(createCupRun('desert', { playerColors: [1, 2] }).riders[0].colors, [...CHARACTER_PALETTES[0]]);
});

test('rider names are cleaned: one line, no markup, bounded, with a default', () => {
  assert.equal(cleanRiderName(''), 'Cavalier');
  assert.equal(cleanRiderName(null), 'Cavalier');
  assert.equal(cleanRiderName('   '), 'Cavalier');
  assert.equal(cleanRiderName('  Yacine   B. '), 'Yacine B.');
  assert.equal(cleanRiderName('<b>Hack</b>\n\tme'), 'b Hack /b me');
  assert.equal(cleanRiderName('x'.repeat(80)).length, MAX_RIDER_NAME);
  assert.equal(cleanRiderName('', ''), '');
  assert.equal(Array.from(cleanRiderName('🐎'.repeat(40))).length, MAX_RIDER_NAME, 'emoji are never cut in half');
  assert.equal(createCupRun('desert', { playerName: '' }).riders[0].name, 'Cavalier');
});

test('places are labelled like the race HUD', () => {
  assert.equal(placeLabel(1), '1ᵉʳ');
  assert.equal(placeLabel(2), '2ᵉ');
  assert.equal(placeLabel(4), '4ᵉ');
});

test('a race is classified: rivals already home, then the player, then the riders still on track', () => {
  const run = createCupRun('desert');
  // L’Ombre et Sauge sont arrivés avant le joueur ; Améthyste est encore à 41 m.
  const result = duelResult({ stage: 'desert', duration: 45.2, times: { ombre: 44.1, sauge: 44.9, amethyste: { distance: 759 } } });
  assert.equal(result.rank, 3);
  const placements = classifyRace(result, run.riders);
  assert.deepEqual(placements.map((line) => line.riderId), ['ombre', 'sauge', 'player', 'amethyste']);
  assert.deepEqual(placements.map((line) => line.place), [1, 2, 3, 4]);
  assert.deepEqual(placements.map((line) => line.points), [...CUP_POINTS]);
  assert.equal(placements[2].place, result.rank, 'the player lands where the engine says');
  assert.equal(placements[0].duration, 44.1);
  assert.equal(placements[3].finished, false);
  assert.equal(placements[3].duration, null);
  assert.equal(placements[3].distance, 759);
});

test('the player winning the race takes the top points; unfinished rivals rank by distance covered', () => {
  const run = createCupRun('desert');
  const result = duelResult({
    stage: 'desert',
    duration: 40,
    times: { ombre: { distance: 700 }, sauge: { distance: 790 }, amethyste: { distance: 500 } },
  });
  const placements = classifyRace(result, run.riders);
  assert.deepEqual(placements.map((line) => line.riderId), ['player', 'sauge', 'ombre', 'amethyste']);
  assert.equal(placements[0].points, CUP_POINTS[0]);
  assert.equal(result.rank, 1);
});

test('a tie on the clock goes to the rival, exactly like the engine’s rank', () => {
  const run = createCupRun('desert');
  const result = duelResult({ stage: 'desert', duration: 41.3, times: { sauge: 41.3 } });
  assert.equal(result.rank, 2);
  const placements = classifyRace(result, run.riders);
  assert.equal(placements.find((line) => line.riderId === 'player').place, result.rank);
  assert.equal(placements[0].riderId, 'sauge');
  // Deux rivaux à égalité entre eux : l’ordre de départ tranche, de façon stable.
  const twins = classifyRace(duelResult({ stage: 'desert', duration: 50, times: { ombre: 41.3, amethyste: 41.3 } }), run.riders);
  assert.deepEqual(twins.slice(0, 2).map((line) => line.riderId), ['ombre', 'amethyste']);
});

test('the classification agrees with the engine’s rank whatever the finishing order', () => {
  const run = createCupRun('desert');
  const scenarios = [
    { duration: 40, times: {} },
    { duration: 41, times: { ombre: 40.2 } },
    { duration: 42, times: { ombre: 40.2, sauge: 41.5 } },
    { duration: 43, times: { ombre: 40.2, sauge: 41.5, amethyste: 42.9 } },
    { duration: 43, times: { ombre: 43, sauge: 43, amethyste: 43 } },
  ];
  for (const scenario of scenarios) {
    const result = duelResult({ stage: 'desert', ...scenario });
    const placements = classifyRace(result, run.riders);
    assert.equal(placements.find((line) => line.riderId === 'player').place, result.rank);
    assert.deepEqual(placements.map((line) => line.place), [1, 2, 3, 4]);
    assert.equal(new Set(placements.map((line) => line.riderId)).size, 4);
  }
});

test('results that are not a complete duel are refused', () => {
  const run = createCupRun('desert');
  assert.equal(classifyRace(null, run.riders), null);
  assert.equal(classifyRace({ mode: 'rush', duration: 60 }, run.riders), null);
  assert.equal(classifyRace({ mode: 'duel', duration: 40 }, run.riders), null);
  assert.equal(classifyRace({ mode: 'duel', duration: 0, rivals: [] }, run.riders), null);
  assert.equal(classifyRace({ mode: 'duel', duration: Number.NaN, rivals: [] }, run.riders), null);
  assert.equal(recordCupRace(run, { mode: 'rush', duration: 60 }), run);
  assert.equal(recordCupRace(run, undefined), run);
  assert.equal(recordCupRace(null, duelResult({ stage: 'desert', duration: 40 })), null);
});

test('rivals missing from a result count as far from the line rather than crashing', () => {
  const run = createCupRun('desert');
  const placements = classifyRace({ mode: 'duel', duration: 44, rivals: [{ id: 'ombre', duration: 43, distance: DUEL_DISTANCE }] }, run.riders);
  assert.deepEqual(placements.map((line) => line.riderId), ['ombre', 'player', 'sauge', 'amethyste']);
});

test('recording a race adds it without touching the previous cup object', () => {
  const run = createCupRun('desert');
  const next = recordCupRace(run, duelResult({ stage: 'desert', duration: 41, times: { ombre: 40.5 } }));
  assert.notEqual(next, run);
  assert.equal(run.races.length, 0, 'the original run is untouched');
  assert.equal(next.races.length, 1);
  assert.equal(next.races[0].stage, 'desert');
  assert.equal(cupCurrentStage(next), 'western');
  assert.equal(cupRaceIndex(next), 1);
  assert.equal(isCupComplete(next), false);
});

test('the same arrival cannot advance the cup twice, and another terrain’s result is ignored', () => {
  const run = createCupRun('desert');
  const first = duelResult({ stage: 'desert', duration: 41, times: { ombre: 40.5 } });
  const once = recordCupRace(run, first);
  assert.equal(recordCupRace(once, first), once, 'replaying the very same callback changes nothing');
  assert.equal(recordCupRace(run, duelResult({ stage: 'prairie', duration: 41 })), run);
  // Un résultat sans terrain reste accepté : le calendrier de la coupe fait foi.
  const { stage, ...unstaged } = first;
  assert.equal(recordCupRace(run, unstaged).races.length, 1);
});

test('standings before any race start at zero, in starting order', () => {
  const standings = cupStandings(createCupRun('desert'));
  assert.deepEqual(idsOf(standings), ['player', 'ombre', 'sauge', 'amethyste']);
  assert.ok(standings.every((row) => row.points === 0 && row.wins === 0 && row.lastPlace === null));
  assert.deepEqual(standings.map((row) => row.rank), [1, 2, 3, 4]);
  assert.deepEqual(cupStandings(null), []);
});

test('three consecutive races are totalled and the best total wins the Coupe du Désert', () => {
  let run = createCupRun('desert', { playerName: 'Salim' });

  // Course 1 (Dunes de l’Écho) : L’Ombre 1ᵉʳ, le joueur 2ᵉ ; Sauge et Améthyste
  // n’étaient pas encore arrivés quand il a franchi la ligne.
  run = recordCupRace(run, resultFromOrder('desert', ['ombre', 'player', 'sauge', 'amethyste']));
  assert.deepEqual(placesOf(run.races[0]), { ombre: 1, player: 2, sauge: 3, amethyste: 4 });
  assert.deepEqual(cupStandings(run).map((row) => [row.id, row.points]), [['ombre', 10], ['player', 7], ['sauge', 4], ['amethyste', 2]]);
  assert.equal(isCupComplete(run), false);
  assert.equal(cupWinner(run), null, 'nobody lifts the cup before the last race');

  // Course 2 (Dust Creek) : le joueur gagne.
  run = recordCupRace(run, resultFromOrder('western', ['player', 'sauge', 'ombre', 'amethyste']));
  assert.equal(cupCurrentStage(run), 'prairie');
  assert.deepEqual(cupStandings(run).map((row) => [row.id, row.points]), [['player', 17], ['ombre', 14], ['sauge', 11], ['amethyste', 4]]);
  assert.equal(isCupComplete(run), false);
  assert.equal(cupWinner(run), null);

  // Course 3 (Plaines d’Or) : Sauge 1ᵉʳ, le joueur 2ᵉ, L’Ombre 3ᵉ, Améthyste 4ᵉ.
  run = recordCupRace(run, resultFromOrder('prairie', ['sauge', 'player', 'ombre', 'amethyste']));
  assert.equal(isCupComplete(run), true);
  assert.deepEqual(run.races.map((race) => race.stage), ['desert', 'western', 'prairie']);

  const standings = cupStandings(run);
  assert.deepEqual(standings.map((row) => [row.id, row.points]), [['player', 24], ['sauge', 21], ['ombre', 18], ['amethyste', 6]]);
  assert.deepEqual(standings.map((row) => row.rank), [1, 2, 3, 4]);
  assert.deepEqual(standings[0].places, [2, 1, 2]);
  assert.deepEqual(standings[0].gained, [7, 10, 7]);
  assert.equal(standings[0].wins, 1);
  assert.equal(standings[0].lastPlace, 2);

  const winner = cupWinner(run);
  assert.equal(winner.id, PLAYER_RIDER_ID);
  assert.equal(winner.name, 'Salim');
  assert.equal(winner.points, 24);
  // La coupe est finie : une arrivée en trop est ignorée.
  assert.equal(recordCupRace(run, duelResult({ stage: 'prairie', duration: 30 })), run);
  assert.equal(cupCurrentStage(run), 'prairie', 'the cup stays on its last terrain once finished');
});

test('an NPC can win the cup; the player’s own place is still in the standings', () => {
  const order = ['ombre', 'sauge', 'player', 'amethyste'];
  const run = playOrders([order, order, order], { playerName: 'Salim' });
  assert.equal(isCupComplete(run), true);
  const winner = cupWinner(run);
  assert.equal(winner.id, 'ombre');
  assert.equal(winner.isPlayer, false);
  assert.equal(winner.points, 30);
  const mine = cupStandings(run).find((row) => row.isPlayer);
  assert.equal(mine.rank, 3);
  assert.equal(mine.points, 12);
});

test('total points come first: one win does not beat steady podium finishes', () => {
  // Joueur : 1ᵉʳ puis deux fois 4ᵉ = 14 pts. L’Ombre : trois fois 2ᵉ = 21 pts.
  const run = playOrders([
    ['player', 'ombre', 'sauge', 'amethyste'],
    ['sauge', 'ombre', 'amethyste', 'player'],
    ['amethyste', 'ombre', 'sauge', 'player'],
  ]);
  const byId = Object.fromEntries(cupStandings(run).map((row) => [row.id, row]));
  assert.equal(byId.player.points, 14);
  assert.equal(byId.player.wins, 1);
  assert.equal(byId.ombre.points, 21);
  assert.equal(byId.ombre.wins, 0);
  assert.deepEqual(idsOf(cupStandings(run)), ['ombre', 'sauge', 'amethyste', 'player']);
});

test('equal totals are settled by race wins, even against a better last race', () => {
  // Joueur : 1ᵉʳ, 3ᵉ, 3ᵉ = 18 pts (1 victoire). L’Ombre : 3ᵉ, 2ᵉ, 2ᵉ = 18 pts (aucune).
  const run = playOrders([
    ['player', 'sauge', 'ombre', 'amethyste'],
    ['sauge', 'ombre', 'player', 'amethyste'],
    ['sauge', 'ombre', 'player', 'amethyste'],
  ]);
  const byId = Object.fromEntries(cupStandings(run).map((row) => [row.id, row]));
  assert.equal(byId.player.points, 18);
  assert.equal(byId.ombre.points, 18);
  assert.equal(byId.player.wins, 1);
  assert.equal(byId.ombre.wins, 0);
  assert.ok(byId.ombre.lastPlace < byId.player.lastPlace, 'L’Ombre finit mieux la dernière course…');
  assert.ok(byId.player.rank < byId.ombre.rank, '…mais le joueur a gagné une course : il passe devant');
  assert.deepEqual(idsOf(cupStandings(run)), ['sauge', 'player', 'ombre', 'amethyste']);
});

test('equal totals and equal wins are settled by the last race', () => {
  // Le joueur gagne tout ; L’Ombre, Sauge et Améthyste finissent à 13 pts sans victoire.
  const run = playOrders([
    ['player', 'ombre', 'sauge', 'amethyste'],
    ['player', 'amethyste', 'ombre', 'sauge'],
    ['player', 'sauge', 'amethyste', 'ombre'],
  ]);
  const standings = cupStandings(run);
  for (const id of ['ombre', 'sauge', 'amethyste']) {
    const row = standings.find((entry) => entry.id === id);
    assert.equal(row.points, 13, `${id} totals 13 points`);
    assert.equal(row.wins, 0);
  }
  // Dernière course : Sauge 2ᵉ, Améthyste 3ᵉ, L’Ombre 4ᵉ.
  assert.deepEqual(idsOf(standings), ['player', 'sauge', 'amethyste', 'ombre']);
  assert.deepEqual(standings.map((row) => row.rank), [1, 2, 3, 4]);
});

test('the riders follow the track: three lanes (the app) leave room for the player, L’Ombre and Sauge only', () => {
  assert.equal(laneCount(), 4, 'the site races on four lanes');
  assert.deepEqual(idsOf(createCupRun('desert').riders), [PLAYER_RIDER_ID, 'ombre', 'sauge', 'amethyste']);
  setLaneCount(3);
  try {
    const run = createCupRun('desert', { playerName: 'Salim' });
    assert.deepEqual(idsOf(run.riders), [PLAYER_RIDER_ID, 'ombre', 'sauge']);
    assert.deepEqual(run.riders.map((rider) => rider.slot), [0, 1, 2]);
    // Sur cette piste le moteur n’aligne que deux rivaux : pas de 4ᵉ cavalier fantôme.
    const rivals = duelRivalsForTrack().map((rival, index) => ({
      id: rival.id, slot: index + 1, name: rival.name, distance: DUEL_DISTANCE, duration: 48 + index * 4,
    }));
    const placements = classifyRace({ mode: 'duel', stage: 'desert', duration: 50, rivals }, run.riders);
    assert.deepEqual(
      placements.map((line) => [line.riderId, line.place, line.points]),
      [['ombre', 1, 10], [PLAYER_RIDER_ID, 2, 7], ['sauge', 3, 4]],
      'trois places, donc 10 / 7 / 4 points',
    );
    let cup = run;
    for (const stage of run.stages) cup = recordCupRace(cup, { mode: 'duel', stage, duration: 50, rivals });
    assert.equal(isCupComplete(cup), true);
    assert.deepEqual(cupStandings(cup).map((row) => [row.id, row.points]), [['ombre', 30], [PLAYER_RIDER_ID, 21], ['sauge', 12]]);
    assert.equal(cupWinner(cup).id, 'ombre');
  } finally {
    setLaneCount(4);
  }
  assert.equal(createCupRun('desert').riders.length, CUP_RIDER_COUNT, 'the four-lane track is back');
});

test('the rivals of a cup can be chosen explicitly', () => {
  const run = createCupRun('desert', { rivals: [DUEL_RIVALS[2]] });
  assert.deepEqual(idsOf(run.riders), [PLAYER_RIDER_ID, 'amethyste']);
  assert.deepEqual(run.riders.map((rider) => rider.slot), [0, 1]);
  assert.equal(run.riders[1].name, DUEL_RIVALS[2].name);
});

test('riders keep the hat and markings of a seven-slot palette for the trophy horse', () => {
  const seven = SKINS[0].colors;
  assert.equal(seven.length, 7, 'the equipped skin carries coat, mane, cloth, trim, head, hat and markings');
  assert.deepEqual(createCupRun('desert', { playerColors: seven }).riders[0].colors, [...seven]);
  assert.deepEqual(createCupRun('desert').riders[1].colors, [...CHARACTER_PALETTES[DUEL_RIVALS[0].paletteIndex]]);
  // Les anciennes palettes à cinq couleurs restent valides ; un chapeau illisible est ignoré.
  assert.deepEqual(createCupRun('desert', { playerColors: [1, 2, 3, 4, 5] }).riders[0].colors, [1, 2, 3, 4, 5]);
  assert.deepEqual(createCupRun('desert', { playerColors: [1, 2, 3, 4, 5, 6] }).riders[0].colors, [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(createCupRun('desert', { playerColors: [1, 2, 3, 4, 5, 6, 'x'] }).riders[0].colors, [1, 2, 3, 4, 5]);
});

test('cups unlock sequentially: only the 1st cup is open initially, and each finished cup unlocks the next', () => {
  assert.equal(cupRequirement('desert'), null);
  assert.equal(cupRequirement('winds')?.id, 'desert');
  assert.equal(cupRequirement('worldtour')?.id, 'winds');
  assert.equal(cupRequirement('legends')?.id, 'worldtour');
  assert.equal(cupRequirement('unknown'), undefined);

  // Au départ, seule la 1ʳᵉ coupe (`desert`) est débloquée.
  assert.equal(isCupUnlocked('desert', []), true);
  assert.equal(isCupUnlocked('winds', []), false);
  assert.equal(isCupUnlocked('worldtour', []), false);
  assert.equal(isCupUnlocked('legends', []), false);
  assert.equal(isCupUnlocked('unknown', []), false);
  assert.deepEqual(unlockedCups([]).map((c) => c.id), ['desert']);

  // Finir la 1ʳᵉ coupe débloque la 2ᵉ (`winds`), pas la 3ᵉ ni la 4ᵉ.
  assert.equal(isCupUnlocked('winds', ['desert']), true);
  assert.equal(isCupUnlocked('worldtour', ['desert']), false);
  assert.equal(isCupUnlocked('legends', ['desert']), false);
  assert.deepEqual(unlockedCups(['desert']).map((c) => c.id), ['desert', 'winds']);

  // Finir la 2ᵉ coupe débloque la 3ᵉ (`worldtour`), mais pas si la 1ʳᵉ manque.
  assert.equal(isCupUnlocked('worldtour', ['winds']), false);
  assert.equal(isCupUnlocked('worldtour', ['desert', 'winds']), true);
  assert.equal(isCupUnlocked('legends', ['desert', 'winds']), false);
  assert.deepEqual(unlockedCups(['desert', 'winds']).map((c) => c.id), ['desert', 'winds', 'worldtour']);

  // Finir la 3ᵉ coupe débloque la 4ᵉ (`legends`).
  assert.equal(isCupUnlocked('legends', ['desert', 'winds', 'worldtour']), true);
  assert.deepEqual(
    unlockedCups(['desert', 'winds', 'worldtour']).map((c) => c.id),
    ['desert', 'winds', 'worldtour', 'legends'],
  );
});

