// Tournois de Vice City Rush — règles pures (aucun DOM, aucun three.js), pour
// que `node --test` puisse les exercer directement.
//
// Un tournoi enchaîne trois courses sur des parcours imposés, dans un ordre
// fixe, avec **le même plateau de huit voitures de course** du début à la fin —
// le pilote et sept rivaux, les mêmes visages, les mêmes voitures et le même
// rythme aux trois manches. Chaque course se court en mode « pur » : **sans
// police ni armes** (ni escouade, ni niveau de recherche, ni AK-47, ni bazooka
// — seuls le turbo, les soins et les tremplins restent sur la route), et avec
// un **trafic civil deux fois plus clairsemé dont la police est absente** :
// le plateau a la route pour lui. C'est la même mécanique que les chapitres
// « course pure » du mode Histoire : le moteur 3D reçoit les mêmes règles
// (`weaponsEnabled: false, policeEnabled: false, tournament: true`) et la page
// n'a qu'à nourrir `recordCityRushTournamentRace` avec le résultat que
// `ViceCityWorld` émet à chaque arrivée.
//
// Chaque arrivée rapporte des points selon la place (25 / 18 / 15 / 12 / 10 /
// 8 / 6 / 4), les points s'additionnent d'une course à l'autre, et le meilleur
// total soulève le titre après la troisième course. Chaque course paie comme un
// Circuit (50 / 30 / 10 billets verts), et le champion empoche en plus la prime
// du tournoi (`championBonus`). Terminer un tournoi (les trois courses, même
// sans titre) débloque le suivant, dans l'ordre du catalogue.
import {
  CITY_RUSH_CARS,
  CITY_RUSH_COURSES,
  CITY_RUSH_DRIVERS,
  CITY_RUSH_TOURNAMENT_RACER_SLOTS,
  cityRushLaneConfig,
  cityRushRaceGrid,
} from './cityRushRules.js';

/**
 * Points par place : 1ᵉʳ à 8ᵉ — strictement décroissant, barème « formule »
 * dont le vainqueur empoche 25 points.
 */
export const CITY_RUSH_TOURNAMENT_POINTS = Object.freeze([25, 18, 15, 12, 10, 8, 6, 4]);
/** Chaque tournoi se joue en trois courses. */
export const CITY_RUSH_TOURNAMENT_LEGS = 3;
/** Tours par course : trois, dont un dernier tour double comme partout. */
export const CITY_RUSH_TOURNAMENT_LAPS = 3;

/**
 * Catalogue des tournois. Pour en ajouter un : un nouvel objet ici, avec trois
 * parcours déjà connus de `CITY_RUSH_COURSES`, ses **sept rivaux attitrés**
 * (pilotes de `CITY_RUSH_DRIVERS`, avec leur voiture et leur rythme — le
 * premier est le chef de file, les suivants descendent d'un cran) et sa prime
 * de champion. Le hub, l'enchaînement des courses, le classement et l'écran du
 * titre suivent tout seuls.
 */
export const CITY_RUSH_TOURNAMENTS = Object.freeze([
  Object.freeze({
    id: 'sunset',
    name: 'COUPE SUNSET',
    tagline: 'L’Amérique d’ouest en est',
    desc: 'Vice City, la Route 66 puis New York : trois sprints au soleil couchant contre un plateau de sept rivaux — Maya et Mateo en tête, des adversaires à ta portée.',
    icon: '🌇',
    accent: '#ff5db8',
    secondary: '#ffd44f',
    laps: CITY_RUSH_TOURNAMENT_LAPS,
    legs: Object.freeze(['vice-city', 'route-66', 'new-york']),
    championBonus: 100,
    rivals: Object.freeze([
      Object.freeze({ driverId: 'maya', carId: 'city-hatch', pace: 0.97 }),
      Object.freeze({ driverId: 'mateo', carId: 'nova-18-gt', pace: 0.97 }),
      Object.freeze({ driverId: 'camila', carId: 'nova-18-gt', pace: 0.96 }),
      Object.freeze({ driverId: 'diego', carId: 'city-hatch', pace: 0.96 }),
      Object.freeze({ driverId: 'amine', carId: 'nova-18-gt', pace: 0.95 }),
      Object.freeze({ driverId: 'layla', carId: 'city-hatch', pace: 0.95 }),
      Object.freeze({ driverId: 'kenji', carId: 'night-comet', pace: 0.94 }),
    ]),
  }),
  Object.freeze({
    id: 'europe',
    name: 'COUPE D’EUROPE',
    tagline: 'Paris, Londres, Nürburgring',
    desc: 'Rive gauche, Soho sous la brume puis la Grüne Hölle : Giulia et Chloé défendent le vieux continent à la tête d’un plateau relevé.',
    icon: '🏰',
    accent: '#60a5fa',
    secondary: '#ffd44f',
    laps: CITY_RUSH_TOURNAMENT_LAPS,
    legs: Object.freeze(['paris', 'london', 'nordschleife']),
    championBonus: 150,
    rivals: Object.freeze([
      Object.freeze({ driverId: 'giulia', carId: 'night-comet', pace: 1 }),
      Object.freeze({ driverId: 'chloe', carId: 'vice-roadster', pace: 1 }),
      Object.freeze({ driverId: 'astrid', carId: 'night-comet', pace: 0.99 }),
      Object.freeze({ driverId: 'layla', carId: 'vice-roadster', pace: 0.99 }),
      Object.freeze({ driverId: 'kwame', carId: 'turbo-gt', pace: 0.98 }),
      Object.freeze({ driverId: 'diego', carId: 'night-comet', pace: 0.98 }),
      Object.freeze({ driverId: 'camila', carId: 'vice-roadster', pace: 0.97 }),
    ]),
  }),
  Object.freeze({
    id: 'pacifique',
    name: 'COUPE PACIFIQUE',
    tagline: 'Tokyo, le Mexique, Vice City',
    desc: 'La Shutō C1, la Carretera del Sol puis Ocean Drive : Kenji et Seo-yeon roulent vite, et les cinq autres ne leur laissent rien.',
    icon: '🌊',
    accent: '#3ce08a',
    secondary: '#ff9d4d',
    laps: CITY_RUSH_TOURNAMENT_LAPS,
    legs: Object.freeze(['tokyo', 'mexico-countryside', 'vice-city']),
    championBonus: 200,
    rivals: Object.freeze([
      Object.freeze({ driverId: 'kenji', carId: 'turbo-gt', pace: 1.02 }),
      Object.freeze({ driverId: 'seoyeon', carId: 'volt-aero', pace: 1.02 }),
      Object.freeze({ driverId: 'maya', carId: 'turbo-gt', pace: 1.01 }),
      Object.freeze({ driverId: 'mateo', carId: 'volt-aero', pace: 1.01 }),
      Object.freeze({ driverId: 'camila', carId: 'atlas-xr', pace: 1.0 }),
      Object.freeze({ driverId: 'amine', carId: 'turbo-gt', pace: 1.0 }),
      Object.freeze({ driverId: 'layla', carId: 'volt-aero', pace: 0.99 }),
    ]),
  }),
  Object.freeze({
    id: 'legendes',
    name: 'COUPE DES LÉGENDES',
    tagline: 'Les trois circuits les plus exigeants',
    desc: 'Le Ring, la Shutō C1 et la Route 66 : Kwame et Astrid ouvrent un plateau de supercars qui ne laisse rien passer. La finale des champions.',
    icon: '🏆',
    accent: '#ffd44f',
    secondary: '#ff526e',
    laps: CITY_RUSH_TOURNAMENT_LAPS,
    legs: Object.freeze(['nordschleife', 'tokyo', 'route-66']),
    championBonus: 300,
    rivals: Object.freeze([
      Object.freeze({ driverId: 'kwame', carId: 'vega-gt-67', pace: 1.04 }),
      Object.freeze({ driverId: 'astrid', carId: 'toro-v12', pace: 1.04 }),
      Object.freeze({ driverId: 'diego', carId: 'pulse-rs', pace: 1.03 }),
      Object.freeze({ driverId: 'layla', carId: 'muscle-86', pace: 1.03 }),
      Object.freeze({ driverId: 'camila', carId: 'vega-gt-67', pace: 1.02 }),
      Object.freeze({ driverId: 'amine', carId: 'toro-v12', pace: 1.02 }),
      Object.freeze({ driverId: 'mateo', carId: 'pulse-rs', pace: 1.01 }),
    ]),
  }),
]);

/** Le tournoi demandé, ou `null` si l'identifiant est inconnu. */
export function getCityRushTournament(tournamentId) {
  return CITY_RUSH_TOURNAMENTS.find((entry) => entry.id === tournamentId) || null;
}

/**
 * Tournoi précédent à terminer pour débloquer `tournamentId` : `null` pour le
 * premier tournoi (ouvert dès le départ), `undefined` si l'identifiant est
 * inconnu.
 */
export function cityRushTournamentRequirement(tournamentId) {
  const index = CITY_RUSH_TOURNAMENTS.findIndex((entry) => entry.id === tournamentId);
  if (index < 0) return undefined;
  return index > 0 ? CITY_RUSH_TOURNAMENTS[index - 1] : null;
}

/**
 * Le tournoi `tournamentId` est-il débloqué ? Seul le premier (`sunset`) est
 * ouvert d'office ; il faut terminer le 1ᵉʳ pour débloquer le 2ᵉ, terminer le
 * 2ᵉ pour débloquer le 3ᵉ, et terminer le 3ᵉ pour la Coupe des Légendes.
 */
export function isCityRushTournamentUnlocked(tournamentId, completedTournamentIds = []) {
  const index = CITY_RUSH_TOURNAMENTS.findIndex((entry) => entry.id === tournamentId);
  if (index < 0) return false;
  if (index === 0) return true;
  const done = new Set(Array.isArray(completedTournamentIds) ? completedTournamentIds : []);
  return CITY_RUSH_TOURNAMENTS.slice(0, index).every((entry) => done.has(entry.id));
}

/** Points d'une place (1 = vainqueur de la course). Hors barème : 0. */
export function pointsForTournamentPlace(place) {
  return CITY_RUSH_TOURNAMENT_POINTS[Number(place) - 1] ?? 0;
}

/**
 * Les places de rivaux du plateau : toutes les places de la grille de tournoi
 * sauf celle du pilote.
 */
export const CITY_RUSH_TOURNAMENT_RIVAL_SLOTS = Object.freeze(
  CITY_RUSH_TOURNAMENT_RACER_SLOTS.filter((slot) => slot !== 'player'),
);

/**
 * Règles « rivaux » d'un tournoi, au format attendu par le monde 3D
 * (`storyRules.rivalCarIds` / `storyRules.rivalPace`, indexées par place de
 * grille — `nova`, `juno`, `lyra`…). Les mêmes voitures et le même rythme sur
 * les trois courses : les adversaires du tournoi ne changent pas en route.
 */
export function cityRushTournamentRivalRules(tournament) {
  const entry = typeof tournament === 'string' ? getCityRushTournament(tournament) : tournament;
  const rivals = Array.isArray(entry?.rivals) ? entry.rivals : [];
  const carIds = new Set(CITY_RUSH_CARS.map((car) => car?.id));
  const rivalCarIds = {};
  const rivalPace = {};
  CITY_RUSH_TOURNAMENT_RIVAL_SLOTS.forEach((slot, index) => {
    const rival = rivals[index];
    rivalCarIds[slot] = carIds.has(rival?.carId) ? rival.carId : CITY_RUSH_CARS[0].id;
    rivalPace[slot] = Number(rival?.pace) > 0 ? Number(rival.pace) : 1;
  });
  return { rivalCarIds, rivalPace };
}

/**
 * Grille d'un tournoi : le pilote choisi et **sept rivaux attitrés**, dans le
 * même format que `selectCityRushRacers` mais sur les huit places de
 * `CITY_RUSH_TOURNAMENT_RACER_SLOTS`. Chaque entrée porte sa place de grille —
 * `lane`, `row`, `gridDistance` — et le pilote ferme la marche : les sept
 * rivaux partent devant lui, il doit remonter le peloton. Si le pilote prend
 * l'identité d'un rival, celui-ci est remplacé par le premier pilote
 * disponible (pays distincts, comme en course libre) : jamais deux fois le
 * même visage sur la grille.
 */
export function selectCityRushTournamentRacers({ tournamentId = null, cityId = 'vice-city', playerDriverId = null } = {}) {
  const tournament = getCityRushTournament(tournamentId);
  const player = CITY_RUSH_DRIVERS.find((driver) => driver.id === playerDriverId) || CITY_RUSH_DRIVERS[0];
  const chosen = [player];
  const usedIds = new Set([player.id]);
  const usedCountries = new Set([player.countryCode]);
  const wanted = [
    ...(tournament?.rivals || []).map((rival) => rival?.driverId),
    // Un tournoi sans assez de rivaux attitrés complète sa grille avec le
    // reste du catalogue, dans l'ordre : la course reste à huit voitures.
    ...CITY_RUSH_DRIVERS.map((driver) => driver.id),
  ];
  for (const driverId of wanted) {
    if (chosen.length >= CITY_RUSH_TOURNAMENT_RACER_SLOTS.length) break;
    const candidate = CITY_RUSH_DRIVERS.find((driver) => driver.id === driverId);
    const driver = candidate && !usedIds.has(candidate.id) && !usedCountries.has(candidate.countryCode)
      ? candidate
      : CITY_RUSH_DRIVERS.find((entryDriver) => !usedIds.has(entryDriver.id) && !usedCountries.has(entryDriver.countryCode))
        || candidate
        || CITY_RUSH_DRIVERS[0];
    if (usedIds.has(driver.id)) continue;
    chosen.push(driver);
    usedIds.add(driver.id);
    usedCountries.add(driver.countryCode);
  }
  const course = CITY_RUSH_COURSES.find((item) => item.id === cityId) || null;
  const { defaultLanes } = cityRushLaneConfig(course);
  const grid = cityRushRaceGrid(
    CITY_RUSH_TOURNAMENT_RACER_SLOTS.map((slotId, index) => ({ id: slotId, slot: index, isPlayer: slotId === 'player' })),
    course,
  );
  const placeById = new Map(grid.map((place) => [place.id, place]));
  return CITY_RUSH_TOURNAMENT_RACER_SLOTS.map((slotId, index) => {
    const driver = chosen[index] || chosen[0];
    const place = placeById.get(slotId) || { lane: defaultLanes[index % defaultLanes.length], row: 0, distance: 0 };
    return {
      id: slotId,
      slot: index,
      isPlayer: slotId === 'player',
      driverId: driver.id,
      avatarId: driver.avatarId,
      name: driver.name,
      displayName: driver.displayName,
      country: driver.country,
      countryCode: driver.countryCode,
      flag: driver.flag,
      accent: driver.accent,
      avatar: driver.avatar,
      lane: place.lane,
      row: place.row,
      gridDistance: place.distance,
    };
  });
}

/**
 * Démarre un tournoi : les trois parcours imposés, dans l'ordre, et aucune
 * course courue. Renvoie `null` si le tournoi n'existe pas. L'objet est de la
 * donnée pure : chaque étape en produit un nouveau.
 */
export function createCityRushTournamentRun(tournamentId) {
  const tournament = getCityRushTournament(tournamentId);
  if (!tournament) return null;
  return {
    tournamentId: tournament.id,
    legs: [...tournament.legs],
    races: [],
  };
}

export function isCityRushTournamentComplete(run) {
  return Boolean(run) && run.races.length >= run.legs.length;
}

/** Numéro (à partir de 0) de la prochaine course à courir ; borné à la dernière. */
export function cityRushTournamentLegIndex(run) {
  if (!run) return 0;
  return Math.min(run.races.length, run.legs.length - 1);
}

/** Parcours de la prochaine course (ou de la dernière, une fois le tournoi fini). */
export function cityRushTournamentCurrentLeg(run) {
  if (!run) return null;
  return run.legs[cityRushTournamentLegIndex(run)];
}

/**
 * Classe les huit voitures d'une course à partir du résultat que
 * `ViceCityWorld` émet à l'arrivée : chaque ligne `{ slot, place, points }`.
 * Le monde classe déjà l'épave du joueur bonne dernière (`rank` = 8), il n'y
 * a qu'à lire les places. Renvoie `null` si le résultat n'est pas celui d'une
 * course de tournoi (sprint, plateau incomplet).
 */
export function classifyTournamentRace(result) {
  if (!result || result.sprint || !Array.isArray(result.racers)) return null;
  const slots = new Set(CITY_RUSH_TOURNAMENT_RACER_SLOTS);
  const lines = [];
  for (const racer of result.racers) {
    const place = Math.floor(Number(racer?.rank));
    if (!slots.has(racer?.id) || place < 1 || place > CITY_RUSH_TOURNAMENT_RACER_SLOTS.length) return null;
    lines.push({ slot: racer.id, place, points: pointsForTournamentPlace(place) });
  }
  if (lines.length !== CITY_RUSH_TOURNAMENT_RACER_SLOTS.length) return null;
  const seen = new Set(lines.map((line) => line.slot));
  if (seen.size !== lines.length) return null;
  return lines.sort((a, b) => a.place - b.place);
}

/**
 * Enregistre la course qui vient de se terminer et renvoie le tournoi mis à
 * jour (l'original n'est jamais modifié). Un résultat inexploitable, arrivé
 * en double ou venant d'un autre parcours que celui attendu est ignoré : le
 * tournoi ne peut donc pas avancer deux fois pour une même arrivée.
 */
export function recordCityRushTournamentRace(run, result) {
  if (!run || isCityRushTournamentComplete(run)) return run;
  const leg = run.legs[run.races.length];
  if (result?.city && result.city !== leg) return run;
  const placements = classifyTournamentRace(result);
  if (!placements) return run;
  return { ...run, races: [...run.races, { city: leg, placements }] };
}

// Points, puis nombre de victoires, puis place dans la dernière course — elle
// est forcément différente d'un pilote à l'autre, donc plus aucune égalité —,
// et enfin l'ordre de la grille (avant la 1ʳᵉ course, tout le monde est à 0).
function compareTournamentStandings(a, b) {
  return (
    b.points - a.points
    || b.wins - a.wins
    || (a.lastPlace ?? Infinity) - (b.lastPlace ?? Infinity)
    || a.slotIndex - b.slotIndex
  );
}

/**
 * Classement général après les courses courues : un objet par pilote, du
 * premier au dernier, avec `rank`, `points` (total), `wins`, `places`,
 * `gained` (points de chaque course, dans l'ordre) et `lastPlace`.
 */
export function cityRushTournamentStandings(run) {
  if (!run) return [];
  const rows = CITY_RUSH_TOURNAMENT_RACER_SLOTS.map((slot, slotIndex) => {
    const lines = run.races.map((race) => race.placements.find((line) => line.slot === slot));
    const places = lines.map((line) => line?.place ?? null);
    const gained = lines.map((line) => line?.points ?? 0);
    return {
      slot,
      slotIndex,
      isPlayer: slot === 'player',
      places,
      gained,
      points: gained.reduce((sum, value) => sum + value, 0),
      wins: places.filter((place) => place === 1).length,
      lastPlace: places.length ? places[places.length - 1] : null,
    };
  });
  return rows.sort(compareTournamentStandings).map((row, index) => ({ ...row, rank: index + 1 }));
}

/** Le vainqueur du tournoi — `null` tant que la dernière course n'est pas courue. */
export function cityRushTournamentWinner(run) {
  return isCityRushTournamentComplete(run) ? cityRushTournamentStandings(run)[0] : null;
}
