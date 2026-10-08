/**
 * Tournois de Vice City Rush : catalogue, grilles, classement et sauvegarde.
 * ----------------------------------------------------------------------
 * Vérifie, sans navigateur ni three.js :
 * — les 4 tournois (3 parcours imposés chacun, sans police ni armes, avec leur
 *   plateau de sept rivaux attitrés) ;
 * — le déblocage en chaîne (terminer un tournoi ouvre le suivant) ;
 * — les grilles de huit voitures de course (mêmes rivaux sur les 3 courses,
 *   jamais de doublon avec le pilote, pilote en dernière rangée) et les règles
 *   « pures » transmises au moteur 3D ;
 * — le classement (25 / 18 / 15 / 12 / 10 / 8 / 6 / 4 points, départages) et la
 *   persistance (terminés + titres de champion) dans la sauvegarde.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CITY_RUSH_CARS,
  CITY_RUSH_COURSES,
  CITY_RUSH_DRIVERS,
  CITY_RUSH_RACER_SLOTS,
  CITY_RUSH_TOURNAMENT_RACER_COUNT,
  CITY_RUSH_TOURNAMENT_RACER_SLOTS,
} from '../src/games/cityRushRules.js';
import {
  CITY_RUSH_TOURNAMENTS,
  CITY_RUSH_TOURNAMENT_LAPS,
  CITY_RUSH_TOURNAMENT_LEGS,
  CITY_RUSH_TOURNAMENT_POINTS,
  CITY_RUSH_TOURNAMENT_RIVAL_SLOTS,
  cityRushTournamentCurrentLeg,
  cityRushTournamentLegIndex,
  cityRushTournamentRequirement,
  cityRushTournamentRivalRules,
  cityRushTournamentStandings,
  cityRushTournamentWinner,
  classifyTournamentRace,
  createCityRushTournamentRun,
  getCityRushTournament,
  isCityRushTournamentComplete,
  isCityRushTournamentUnlocked,
  pointsForTournamentPlace,
  recordCityRushTournamentRace,
  selectCityRushTournamentRacers,
} from '../src/games/cityRushTournaments.js';
import {
  cityRushCashForRaceResult,
  normalizeCityRushSave,
  normalizeCityRushTournaments,
} from '../src/games/cityRushProgress.js';

const courseIds = new Set(CITY_RUSH_COURSES.map((course) => course.id));
const carIds = new Set(CITY_RUSH_CARS.map((car) => car.id));
const driverIds = new Set(CITY_RUSH_DRIVERS.map((driver) => driver.id));

/**
 * Faux résultat d'arrivée au format émis par `ViceCityWorld` : `order` donne
 * les premiers du plateau, le reste de la grille suit dans l'ordre des places
 * (le monde classe toujours les huit voitures).
 */
function tournamentResult(city, order, rank = null) {
  const full = [
    ...order,
    ...CITY_RUSH_TOURNAMENT_RACER_SLOTS.filter((slot) => !order.includes(slot)),
  ];
  return {
    city,
    sprint: false,
    duration: 120,
    rank: rank ?? (full.indexOf('player') + 1),
    racers: full.map((slot, index) => ({ id: slot, rank: index + 1 })),
  };
}

test('les 4 tournois enchaînent 3 parcours valides et distincts, sans police ni armes', () => {
  assert.equal(CITY_RUSH_TOURNAMENTS.length, 4);
  assert.equal(CITY_RUSH_TOURNAMENT_LEGS, 3);
  assert.deepEqual([...CITY_RUSH_TOURNAMENT_POINTS], [25, 18, 15, 12, 10, 8, 6, 4]);
  const seen = new Set();
  for (const tournament of CITY_RUSH_TOURNAMENTS) {
    assert.ok(tournament.id && !seen.has(tournament.id), `identifiant unique : ${tournament.id}`);
    seen.add(tournament.id);
    assert.equal(tournament.legs.length, CITY_RUSH_TOURNAMENT_LEGS, `${tournament.id} : 3 courses`);
    assert.equal(new Set(tournament.legs).size, tournament.legs.length, `${tournament.id} : 3 parcours distincts`);
    for (const leg of tournament.legs) assert.ok(courseIds.has(leg), `${tournament.id} : parcours connu (${leg})`);
    assert.equal(tournament.laps, CITY_RUSH_TOURNAMENT_LAPS, `${tournament.id} : ${CITY_RUSH_TOURNAMENT_LAPS} tours par course`);
    assert.ok(Number(tournament.championBonus) > 0, `${tournament.id} : prime de champion positive`);
    // Un tournoi aligne huit voitures : le pilote et sept rivaux attitrés.
    assert.equal(tournament.rivals.length, CITY_RUSH_TOURNAMENT_RACER_COUNT - 1, `${tournament.id} : 7 rivaux attitrés`);
    assert.equal(new Set(tournament.rivals.map((rival) => rival.driverId)).size, tournament.rivals.length,
      `${tournament.id} : sept pilotes distincts`);
    for (const rival of tournament.rivals) {
      assert.ok(driverIds.has(rival.driverId), `${tournament.id} : pilote connu (${rival.driverId})`);
      assert.ok(carIds.has(rival.carId), `${tournament.id} : voiture connue (${rival.carId})`);
      assert.ok(Number(rival.pace) > 0, `${tournament.id} : rythme positif (${rival.pace})`);
    }
    // Le chef de file ouvre le plateau, les autres descendent d'un cran.
    const paces = tournament.rivals.map((rival) => Number(rival.pace));
    assert.deepEqual(paces, [...paces].sort((a, b) => b - a), `${tournament.id} : rythmes décroissants dans la grille`);
  }
  assert.equal(getCityRushTournament('sunset')?.legs.length, 3);
  assert.equal(getCityRushTournament('inconnu'), null);
});

test('les tournois se débloquent en chaîne, en terminant le précédent', () => {
  assert.equal(isCityRushTournamentUnlocked('sunset', []), true);
  assert.equal(isCityRushTournamentUnlocked('europe', []), false);
  assert.equal(isCityRushTournamentUnlocked('pacifique', ['sunset']), false);
  assert.equal(isCityRushTournamentUnlocked('europe', ['sunset']), true);
  assert.equal(isCityRushTournamentUnlocked('legendes', ['sunset', 'europe', 'pacifique']), true);
  assert.equal(isCityRushTournamentUnlocked('legendes', ['sunset', 'pacifique']), false);
  assert.equal(isCityRushTournamentUnlocked('inconnu', ['sunset', 'europe', 'pacifique']), false);
  assert.equal(cityRushTournamentRequirement('sunset'), null);
  assert.equal(cityRushTournamentRequirement('europe')?.id, 'sunset');
  assert.equal(cityRushTournamentRequirement('legendes')?.id, 'pacifique');
  assert.equal(cityRushTournamentRequirement('inconnu'), undefined);
});

test('les règles « purs » coupent armes et police, avec les voitures des rivaux', () => {
  assert.equal(CITY_RUSH_TOURNAMENT_RIVAL_SLOTS.length, CITY_RUSH_TOURNAMENT_RACER_COUNT - 1);
  assert.deepEqual([...CITY_RUSH_TOURNAMENT_RIVAL_SLOTS], CITY_RUSH_TOURNAMENT_RACER_SLOTS.filter((slot) => slot !== 'player'));
  for (const tournament of CITY_RUSH_TOURNAMENTS) {
    const rules = cityRushTournamentRivalRules(tournament.id);
    assert.deepEqual(Object.keys(rules.rivalCarIds).sort(), [...CITY_RUSH_TOURNAMENT_RIVAL_SLOTS].sort());
    assert.deepEqual(Object.keys(rules.rivalPace).sort(), [...CITY_RUSH_TOURNAMENT_RIVAL_SLOTS].sort());
    for (const slot of CITY_RUSH_TOURNAMENT_RIVAL_SLOTS) {
      assert.ok(carIds.has(rules.rivalCarIds[slot]), `${tournament.id}/${slot} : voiture connue`);
      assert.ok(Number(rules.rivalPace[slot]) > 0, `${tournament.id}/${slot} : rythme positif`);
    }
  }
  // La difficulté monte d'un tournoi à l'autre (rythme croissant).
  const paces = CITY_RUSH_TOURNAMENTS.map((tournament) => cityRushTournamentRivalRules(tournament).rivalPace.nova);
  const sorted = [...paces].sort((a, b) => a - b);
  assert.deepEqual(paces, sorted, 'rythmes croissants dans l’ordre du catalogue');
});

test('la grille garde les mêmes rivaux sur les 3 courses, sans doublon avec le pilote', () => {
  for (const tournament of CITY_RUSH_TOURNAMENTS) {
    const grids = tournament.legs.map((cityId) => selectCityRushTournamentRacers({ tournamentId: tournament.id, cityId }));
    for (const grid of grids) {
      assert.deepEqual(grid.map((racer) => racer.id), [...CITY_RUSH_TOURNAMENT_RACER_SLOTS]);
      assert.equal(grid.length, CITY_RUSH_TOURNAMENT_RACER_COUNT, `${tournament.id} : huit voitures de course`);
      assert.equal(grid[0].isPlayer, true);
      assert.equal(new Set(grid.map((racer) => racer.driverId)).size, grid.length, `${tournament.id} : huit pilotes distincts`);
      assert.equal(new Set(grid.map((racer) => racer.countryCode)).size, grid.length, `${tournament.id} : huit pays distincts`);
      // Toutes les places ont une voie ; une seule voiture par voie et par rangée.
      const places = new Set();
      for (const racer of grid) {
        assert.ok(Number.isFinite(Number(racer.lane)), `${tournament.id} : voie de départ (${racer.id})`);
        const key = `${racer.lane}/${racer.row}`;
        assert.ok(!places.has(key), `${tournament.id} : place ${key} occupée deux fois`);
        places.add(key);
      }
      // Le pilote ferme la marche : tous ses rivaux partent devant lui.
      const player = grid.find((racer) => racer.isPlayer);
      assert.equal(player.gridDistance, grid.reduce((best, racer) => (racer === player ? best : Math.min(best, racer.gridDistance)), 0),
        `${tournament.id} : le pilote est en dernière rangée`);
      assert.ok(player.gridDistance < 0, `${tournament.id} : le pilote part derrière la ligne`);
      for (const rival of grid.filter((racer) => !racer.isPlayer)) {
        assert.ok(rival.gridDistance >= player.gridDistance, `${tournament.id} : ${rival.id} part devant le pilote`);
      }
    }
    // Mêmes visages d'une manche à l'autre (seules les voies changent).
    const identities = grids.map((grid) => grid.map((racer) => racer.driverId).join('/'));
    assert.equal(new Set(identities).size, 1, `${tournament.id} : grille stable sur les 3 courses`);
    // Le Ring n'a que quatre voies : deux rangées, autant de voitures.
    const ring = selectCityRushTournamentRacers({ tournamentId: tournament.id, cityId: 'nordschleife' });
    assert.equal(ring.length, CITY_RUSH_TOURNAMENT_RACER_COUNT);
    assert.equal(Math.max(...ring.map((racer) => racer.row)), 1, `${tournament.id} : deux rangées sur quatre voies`);
  }
});

test('si le pilote prend l’identité d’un rival, celui-ci est remplacé', () => {
  // Kenji est un rival attitré de la Coupe Pacifique : le prendre comme pilote
  // ne doit jamais mettre deux Kenji sur la grille.
  const grid = selectCityRushTournamentRacers({ tournamentId: 'pacifique', cityId: 'tokyo', playerDriverId: 'kenji' });
  assert.equal(grid[0].driverId, 'kenji');
  const drivers = grid.map((racer) => racer.driverId);
  assert.equal(new Set(drivers).size, CITY_RUSH_TOURNAMENT_RACER_COUNT, 'huit pilotes distincts');
  const countries = grid.map((racer) => racer.countryCode);
  assert.equal(new Set(countries).size, CITY_RUSH_TOURNAMENT_RACER_COUNT, 'huit pays distincts');
  // Pilote inconnu : repli sur le premier pilote du catalogue, grille complète.
  const fallback = selectCityRushTournamentRacers({ tournamentId: 'sunset', cityId: 'vice-city', playerDriverId: 'inconnu' });
  assert.equal(fallback.length, CITY_RUSH_TOURNAMENT_RACER_COUNT);
  assert.equal(fallback[0].driverId, CITY_RUSH_DRIVERS[0].id);
  // La grille de course libre, elle, garde ses trois voitures.
  assert.equal(CITY_RUSH_RACER_SLOTS.length, 3);
});

test('le barème paie 25 / 18 / 15 / 12 / 10 / 8 / 6 / 4 points, 0 hors grille', () => {
  assert.equal(pointsForTournamentPlace(1), 25);
  assert.equal(pointsForTournamentPlace(2), 18);
  assert.equal(pointsForTournamentPlace(3), 15);
  assert.equal(pointsForTournamentPlace(4), 12);
  assert.equal(pointsForTournamentPlace(8), 4);
  assert.equal(pointsForTournamentPlace(0), 0);
  assert.equal(pointsForTournamentPlace(9), 0);
  assert.equal(pointsForTournamentPlace(null), 0);
  // Strictement décroissant : une place devant vaut toujours plus.
  for (let place = 2; place <= CITY_RUSH_TOURNAMENT_RACER_COUNT; place += 1) {
    assert.ok(pointsForTournamentPlace(place) < pointsForTournamentPlace(place - 1), `place ${place}`);
  }
});

test('chaque manche paie comme un Circuit (50 / 30 / 10, épave dernière)', () => {
  assert.equal(cityRushCashForRaceResult({ rank: 1, modeId: 'circuit' }), 50);
  assert.equal(cityRushCashForRaceResult({ rank: 2, modeId: 'circuit' }), 30);
  assert.equal(cityRushCashForRaceResult({ rank: 3, modeId: 'circuit' }), 10);
  assert.equal(cityRushCashForRaceResult({ rank: 3, modeId: 'circuit', destroyed: true }), 10);
});

test('un tournoi se joue en 3 arrivées, dans l’ordre des parcours imposés', () => {
  assert.equal(createCityRushTournamentRun('inconnu'), null);
  const run = createCityRushTournamentRun('sunset');
  assert.deepEqual(run.legs, [...getCityRushTournament('sunset').legs]);
  assert.deepEqual(run.races, []);
  assert.equal(isCityRushTournamentComplete(run), false);
  assert.equal(cityRushTournamentLegIndex(run), 0);
  assert.equal(cityRushTournamentCurrentLeg(run), 'vice-city');

  const afterFirst = recordCityRushTournamentRace(run, tournamentResult('vice-city', ['player', 'nova', 'juno']));
  assert.notEqual(afterFirst, run, 'chaque étape produit un nouvel objet');
  assert.equal(run.races.length, 0, 'l’original n’est jamais modifié');
  assert.equal(afterFirst.races.length, 1);
  assert.equal(cityRushTournamentCurrentLeg(afterFirst), 'route-66');

  // Une arrivée du mauvais parcours est ignorée (pas de doublon, pas de saut).
  assert.equal(recordCityRushTournamentRace(afterFirst, tournamentResult('vice-city', ['nova', 'player', 'juno'])), afterFirst);
  const afterSecond = recordCityRushTournamentRace(afterFirst, tournamentResult('route-66', ['nova', 'player', 'juno']));
  assert.equal(afterSecond.races.length, 2);
  const afterThird = recordCityRushTournamentRace(afterSecond, tournamentResult('new-york', ['juno', 'nova', 'player']));
  assert.equal(isCityRushTournamentComplete(afterThird), true);
  assert.equal(recordCityRushTournamentRace(afterThird, tournamentResult('new-york', ['player', 'nova', 'juno'])), afterThird);
});

test('les résultats inexploitables n’avancent pas le tournoi', () => {
  const run = createCityRushTournamentRun('europe');
  assert.equal(recordCityRushTournamentRace(run, null), run);
  assert.equal(recordCityRushTournamentRace(run, { city: 'paris', sprint: true, racers: [] }), run);
  // Plateau incomplet : il manque cinq voitures, la manche ne compte pas.
  assert.equal(recordCityRushTournamentRace(run, {
    city: 'paris',
    sprint: false,
    racers: [{ id: 'player', rank: 1 }, { id: 'nova', rank: 2 }, { id: 'juno', rank: 3 }],
  }), run);
  // Une voiture en double : la grille entière est refusée.
  assert.equal(recordCityRushTournamentRace(run, tournamentResult('paris', ['player', 'player'])), run);
  assert.equal(recordCityRushTournamentRace(run, tournamentResult('paris', ['player', 'nova', 'nova'])), run);
  assert.equal(
    classifyTournamentRace(tournamentResult('paris', ['player', 'nova', 'juno']))?.length,
    CITY_RUSH_TOURNAMENT_RACER_COUNT,
  );
});

test('le classement cumule les points, départage puis sacre le champion', () => {
  let run = createCityRushTournamentRun('pacifique');
  assert.deepEqual(cityRushTournamentWinner(run), null);
  run = recordCityRushTournamentRace(run, tournamentResult('tokyo', ['player', 'nova', 'juno']));
  run = recordCityRushTournamentRace(run, tournamentResult('mexico-countryside', ['nova', 'player', 'juno']));
  const mid = cityRushTournamentStandings(run);
  // Égalité de points (43 = 25 + 18 des deux côtés) et une victoire chacun :
  // la dernière manche départage — Nova, 1ᵉʳ de la 2ᵉ manche, passe devant.
  assert.deepEqual(mid.map((row) => row.slot), [
    'nova', 'player', 'juno', 'lyra', 'orion', 'altair', 'polaris', 'castor',
  ]);
  assert.deepEqual(mid.map((row) => row.points), [43, 43, 30, 24, 20, 16, 12, 8]);
  assert.equal(mid.length, CITY_RUSH_TOURNAMENT_RACER_COUNT, 'les huit voitures du plateau sont classées');
  assert.equal(mid[0].wins, 1);
  assert.deepEqual(mid[0].places, [2, 1]);
  assert.deepEqual(mid[0].gained, [18, 25]);
  assert.equal(mid[0].lastPlace, 1);
  run = recordCityRushTournamentRace(run, tournamentResult('vice-city', ['player', 'juno', 'nova']));
  const final = cityRushTournamentStandings(run);
  assert.deepEqual(final.map((row) => [row.slot, row.rank, row.points, row.wins]), [
    ['player', 1, 68, 2],
    ['nova', 2, 58, 1],
    ['juno', 3, 48, 0],
    ['lyra', 4, 36, 0],
    ['orion', 5, 30, 0],
    ['altair', 6, 24, 0],
    ['polaris', 7, 18, 0],
    ['castor', 8, 12, 0],
  ]);
  assert.equal(cityRushTournamentWinner(run)?.slot, 'player');
  assert.equal(cityRushTournamentWinner(run)?.isPlayer, true);
});

test('à égalité parfaite, la dernière manche puis la grille départagent', () => {
  // Deux pilotes à 43 points, une victoire chacun : celui qui gagne la
  // dernière manche passe devant (voir le test précédent, inversé ici).
  let run = createCityRushTournamentRun('sunset');
  run = recordCityRushTournamentRace(run, tournamentResult('vice-city', ['nova', 'player', 'juno']));
  run = recordCityRushTournamentRace(run, tournamentResult('route-66', ['player', 'nova', 'juno']));
  const standings = cityRushTournamentStandings(run);
  assert.deepEqual(standings.map((row) => row.slot).slice(0, 3), ['player', 'nova', 'juno']);
  assert.deepEqual(standings.map((row) => row.points).slice(0, 3), [43, 43, 30]);
});

test('la sauvegarde garde les tournois terminés et les titres de champion', () => {
  const fresh = normalizeCityRushSave(null);
  assert.deepEqual(fresh.completedTournamentIds, []);
  assert.deepEqual(fresh.tournamentTitles, {});
  const history = normalizeCityRushTournaments({
    completedTournamentIds: ['europe', 'sunset', 'sunset', 'inconnu'],
    tournamentTitles: { sunset: 2, europe: 0, inconnu: 5, legendes: '3' },
  });
  // Ordre du catalogue, sans doublon ni identifiant inconnu.
  assert.deepEqual(history.completedTournamentIds, ['sunset', 'europe']);
  assert.deepEqual(history.tournamentTitles, { sunset: 2, legendes: 3 });
  const saved = normalizeCityRushSave({
    cash: 120,
    completedTournamentIds: ['sunset'],
    tournamentTitles: { sunset: 1 },
  });
  assert.equal(saved.cash, 120);
  assert.deepEqual(saved.completedTournamentIds, ['sunset']);
  assert.deepEqual(saved.tournamentTitles, { sunset: 1 });
});
