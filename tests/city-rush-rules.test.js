import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CITY_RUSH_CITIES,
  CITY_RUSH_CARS,
  CITY_RUSH_CARS_BY_POWER,
  CITY_RUSH_FREE_CAR_COUNT,
  CITY_RUSH_FREE_CAR_IDS,
  CITY_RUSH_DISTANCE,
  CITY_RUSH_FINAL_LAP_LENGTH,
  CITY_RUSH_FINAL_LAP_LOOPS,
  CITY_RUSH_LAPS,
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_TRACK_BEHIND,
  CITY_RUSH_PLAYER_SPEED,
  CITY_RUSH_AI_TRACK_BOOST_WEIGHT,
  CITY_RUSH_RED_PICKUP_CHANCE,
  CITY_RUSH_PISTOL_AMMO_PER_PICKUP,
  CITY_RUSH_TRACK_BOOST_PICKUP_CHANCE,
  CITY_RUSH_BLUE_SHOT_DURATION,
  CITY_RUSH_BLUE_SHOT_MAX_RANGE,
  CITY_RUSH_BLUE_SHOT_SPEED_FACTOR,
  CITY_RUSH_TRACK_BOOST_DURATION,
  CITY_RUSH_TRACK_BOOST_SPEED_FACTOR,
  CITY_RUSH_RIVAL_BOOST_SPEED_FACTOR,
  CITY_RUSH_TRACK_BOOST_COLOR,
  CITY_RUSH_SPRINT_BOOST_ROW_INTERVAL,
  CITY_RUSH_ONCOMING_MAX_WIDTH,
  CITY_RUSH_ONCOMING_EDGE_MARGIN,
  CITY_RUSH_ONCOMING_SAFE_OUTER_X,
  CITY_RUSH_ONCOMING_EJECT_DURATION,
  cityRushOncomingImpactX,
  CITY_RUSH_RACER_VIEW_DISTANCE,
  CITY_RUSH_CAR_GAP,
  CITY_RUSH_LANE_X,
  CITY_RUSH_LANE_WIDTH,
  CITY_RUSH_LANE_PAINT_WIDTH,
  CITY_RUSH_LANES_PER_DIRECTION,
  CITY_RUSH_ROAD_WIDTH,
  CITY_RUSH_ROAD_HALF_WIDTH,
  CITY_RUSH_RACEWAY_ROAD_HALF,
  CITY_RUSH_NORDSCHLEIFE_COURSE,
  cityRushLaneCount,
  cityRushLaneConfig,
  cityRushLaneSeparators,
  CITY_RUSH_TURN_AMPLITUDE,
  CITY_RUSH_HILL_AMPLITUDE,
  CITY_RUSH_FORWARD_LANES,
  CITY_RUSH_DEFAULT_LANES,
  CITY_RUSH_TRAFFIC_IMPACT_COOLDOWN,
  CITY_RUSH_TRAFFIC_IMPACT_DURATION,
  CITY_RUSH_TRAFFIC_IMPACT_GAP,
  CITY_RUSH_TRAFFIC_LANE_CHANGE_DURATION,
  CITY_RUSH_PICKUP_BURST_DURATION,
  CITY_RUSH_PICKUP_BURST_SHARDS,
  CITY_RUSH_PICKUP_RESPAWN_DELAY,
  CITY_RUSH_FORWARD_TOLERANCE,
  CITY_RUSH_POWER_CHARGE_COST,
  CITY_RUSH_POWER_RULES,
  CITY_RUSH_POWERS,
  CITY_RUSH_PICKUPS,
  CITY_RUSH_POLICE_ATTACK_LEAD,
  CITY_RUSH_POLICE_BLOCKADE_HOLD,
  CITY_RUSH_POLICE_BLOCKADE_MIN_SPEED,
  CITY_RUSH_POLICE_BLOCKADE_RANGE,
  CITY_RUSH_POLICE_BLOCK_RANGE,
  CITY_RUSH_POLICE_COUNT,
  CITY_RUSH_POLICE_EXTRA_PER_ATTACKER,
  CITY_RUSH_POLICE_REINFORCEMENT_DELAY,
  CITY_RUSH_POLICE_TURNAROUND_DURATION,
  CITY_RUSH_WANTED_MAX_STARS,
  CITY_RUSH_POLICE_TRAFFIC_TYPES,
  CITY_RUSH_POLICE_VEHICLE_TYPES,
  isCityRushPoliceTrafficType,
  cityRushWantedLevelAfterHit,
  cityRushPoliceCountForWantedLevel,
  cityRushPoliceTurnaroundProgress,
  CITY_RUSH_POLICE_DAMAGE,
  CITY_RUSH_POLICE_HEALTH,
  CITY_RUSH_POLICE_START_CHARGES,
  CITY_RUSH_POLICE_HUNT_RANGE,
  CITY_RUSH_POLICE_RALLY_TOLERANCE,
  CITY_RUSH_POLICE_HUNT_TYPES,
  CITY_RUSH_POLICE_LEAD,
  CITY_RUSH_POLICE_LANES,
  CITY_RUSH_POLICE_COLLISION_COOLDOWN,
  CITY_RUSH_POLICE_COLLISION_TOLERANCE,
  CITY_RUSH_PLAYER_BAR_COLORS,
  CITY_RUSH_PLAYER_DAMAGE,
  CITY_RUSH_PLAYER_HEALTH,
  CITY_RUSH_RACER_HEALTH,
  CITY_RUSH_HEALTH_GROUP_SIZE,
  CITY_RUSH_PLAYER_HEALTH_CRITICAL,
  CITY_RUSH_WATCH_HELI_AHEAD,
  CITY_RUSH_WATCH_HELI_HEIGHT,
  CITY_RUSH_WATCH_HELI_LATERAL,
  CITY_RUSH_RACER_SLOTS,
  cityRushPlayerDamage,
  cityRushHealthSegments,
  cityRushPlayerHealthColor,
  cityRushPoliceCollisionHit,
  cityRushWatchHelicopterPose,
  CITY_RUSH_TRAFFIC_COUNT,
  CITY_RUSH_TRAFFIC_LANES,
  CITY_RUSH_TRAFFIC_TYPES,
  CITY_RUSH_ONCOMING_COUNT,
  CITY_RUSH_ONCOMING_LANES,
  CITY_RUSH_DRIVERS,
  selectCityRushRacers,
  cityRushTrackElevation,
  cityRushTrackGrade,
  cityRushTrackOffset,
  cityRushTrackPitch,
  cityRushTrackTangent,
  cityRushTrackYaw,
  cityRushMinimapPoint,
  cityRushMinimapTrackPath,
  cityRushMinimapTrackShape,
  cityRushRouteFor,
  CITY_RUSH_SHUTO_C1,
  shutoC1At,
  shutoC1KmAt,
  shutoC1SectorAt,
  shutoC1CoverAt,
  shutoC1NextJunction,
  shutoC1Readout,
  buildCityRushMinimapState,
  approachCityRushSpeed,
  cityRushTrafficRecoveryRate,
  CITY_RUSH_TRAFFIC_RECOVERY_BOOST,
  CITY_RUSH_CLEAN_LINE_RAMP_DURATION,
  CITY_RUSH_CLEAN_LINE_MAX_BONUS,
  cityRushCleanLineFactor,
  CITY_RUSH_DRIVE_SIDES,
  CITY_RUSH_LEFT_HALF_LANES,
  CITY_RUSH_RIGHT_HALF_LANES,
  CITY_RUSH_DEFAULT_LANES_LEFT_HAND,
  CITY_RUSH_ONCOMING_BONUS_RAMP_DURATION,
  CITY_RUSH_ONCOMING_BONUS_DECAY_DURATION,
  CITY_RUSH_ONCOMING_BONUS_MAX,
  advanceCityRushOncomingBonus,
  cityRushDriveSide,
  cityRushOncomingBonusFactor,
  cityRushBrakingRate,
  CITY_RUSH_BRAKE_RATE_FLOOR,
  cityRushPickupRowCount,
  CITY_RUSH_PICKUP_ROW_COUNT_MIN,
  CITY_RUSH_PICKUP_ROW_COUNT_MAX,
  CITY_RUSH_PICKUP_ROW_SPACING_MIN,
  CITY_RUSH_PICKUP_ROW_SPACING_MAX,
  cityRushSprintCheckpointTime,
  CITY_RUSH_SPRINT_CHECKPOINT_SPACING,
  CITY_RUSH_SPRINT_CHECKPOINT_TIME_MIN,
  CITY_RUSH_SPRINT_CHECKPOINT_TIME_MAX,
  cityRushTrafficViewAhead,
  CITY_RUSH_TRAFFIC_VIEW_AHEAD_MIN,
  CITY_RUSH_POLICE_CHASE_SPEED_FACTOR,
  CITY_RUSH_POLICE_BASE_SPEED,
  chooseCityRushAiLane,
  chooseCityRushTrafficEscapeLane,
  cityRushHitDuration,
  cityRushHelicopterTarget,
  cityRushIsAhead,
  cityRushStraightShotRetaliation,
  cityRushStraightShotSweptHit,
  cityRushStraightShotTarget,
  cityRushStunSpin,
  CITY_RUSH_STUN_SPIN_TURNS,
  cityRushLapForDistance,
  cityRushLapLength,
  cityRushLapProgress,
  cityRushLapCrossings,
  cityRushLineKind,
  cityRushRaceDistance,
  cityRushPickupBurstShards,
  cityRushPickupFlashState,
  cityRushPickupPopScale,
  cityRushPackLeader,
  cityRushPickupShardState,
  cityRushPolicePace,
  cityRushPoliceAimAligned,
  cityRushPoliceAimHold,
  cityRushPoliceAimReady,
  CITY_RUSH_POLICE_AIM_TIME,
  CITY_RUSH_POLICE_AIM_TOLERANCE,
  CITY_RUSH_POLICE_FIRE_LINE_RANGE,
  cityRushPoliceBlocksLeader,
  cityRushPoliceContact,
  cityRushPoliceDamage,
  cityRushPoliceShotsLeft,
  cityRushPoliceTarget,  cityRushTrackGap,
  chooseCityRushPoliceLane,
  isCityRushFreeCar,
  isCityRushPoliceLaneJammed,
  resolveCityRushPoliceMovement,
  addCityRushCharge,
  cityRushLaneAfterAction,
  consumeCityRushCharge,
  canCollectCityRushPickup,
  isCityRushPowerCharged,
  shouldHideCityRushPistolPickup,
  createCityRushEncounter,
  createCityRushBoostEncounter,
  createCityRushInventory,
  createCityRushPoliceInventory,
  detectCityRushTrafficImpacts,
  isCityRushPickupHidden,
  markCityRushPickupTaken,
  rankCityRushRacers,
  resolveCityRushCarMovement,
  CITY_RUSH_RAMP_COUNT,
  CITY_RUSH_RAMP_WIDTH,
  CITY_RUSH_RAMP_LENGTH,
  CITY_RUSH_RAMP_HEIGHT,
  CITY_RUSH_RAMP_CONTACT_WINDOW,
  CITY_RUSH_RAMP_SPACING_MIN,
  CITY_RUSH_RAMP_SPACING_MAX,
  computeCityRushJumpDistance,
  computeCityRushJumpHeight,
  computeCityRushJumpElevation,
  computeCityRushJumpPitch,
  detectCityRushRampContact,
  CITY_RUSH_NORDSCHLEIFE_TURNS,
  CITY_RUSH_NORDSCHLEIFE_MAX_OFFSET,
  CITY_RUSH_NORDSCHLEIFE_PROFILE_STEPS,
  CITY_RUSH_TRACK_PROFILE_NORDSCHLEIFE,
  nordschleifeCornerCurve,
  nordschleifeTrackOffset,
  nordschleifeTrackTangent,
  nordschleifeTrackYaw,
} from '../src/games/cityRushRules.js';

test('the five city routes have a distinct identity and complete palettes', () => {
  assert.deepEqual(CITY_RUSH_CITIES.map((city) => city.id), ['vice-city', 'new-york', 'tokyo', 'paris', 'london']);
  for (const city of CITY_RUSH_CITIES) {
    assert.ok(city.name);
    assert.ok(city.district);
    assert.ok(city.accent.startsWith('#'));
    assert.ok(city.buildingColors.length >= 4);
    assert.ok(city.signs.length >= 3);
  }
});

test('the selectable cars have distinct handling trade-offs and physical silhouettes', () => {
  assert.equal(CITY_RUSH_CARS.length, 8);
  const starter = CITY_RUSH_CARS[0];
  assert.equal(starter.id, 'city-hatch');
  assert.equal(starter.price, 0);
  assert.ok(starter.power <= 40 && starter.acceleration <= 45 && starter.recovery <= 50, 'la citadine de départ a des statistiques modestes');
  const nova = CITY_RUSH_CARS.find((car) => car.id === 'nova-18-gt');
  const wolfsburg = CITY_RUSH_CARS.find((car) => car.id === 'night-comet');
  assert.ok(nova.price > starter.price && nova.price < wolfsburg.price, 'la compacte intermédiaire se débloque avant la Wolfsburg');
  for (const stat of ['power', 'powerMultiplier', 'acceleration', 'accelerationRate', 'recovery']) {
    assert.ok(nova[stat] > starter[stat] && nova[stat] < wolfsburg[stat], `${stat} place la Nova entre la Mistral et la Wolfsburg`);
  }
  assert.ok(nova.hitRecoveryMultiplier < starter.hitRecoveryMultiplier && nova.hitRecoveryMultiplier > wolfsburg.hitRecoveryMultiplier,
    'la reprise après un choc est intermédiaire aussi');
  // Les prix restent dans le catalogue : c'est le garage (la progression) qui
  // offre le trio le moins puissant, pas la fiche de la voiture.
  assert.ok(CITY_RUSH_CARS.slice(1).every((car) => car.price > 0),
    'les sept autres voitures gardent un prix catalogue (le trio le moins puissant est offert sans achat)');
  assert.equal(CITY_RUSH_CARS.find((car) => car.id === 'vega-gt-67')?.bodyColor, 0x11131a);
  assert.equal(new Set(CITY_RUSH_CARS.map((car) => car.id)).size, CITY_RUSH_CARS.length);
  assert.deepEqual(
    new Set(CITY_RUSH_CARS.map((car) => car.archetype)),
    new Set(['city-hatch', 'nova-hatch', 'ferrari', 'porsche', 'audi', 'volkswagen', 'bmw', 'lamborghini']),
  );
  const forbiddenBrandNames = /\b(ferrari|porsche|lamborghini|lambo|bmw|audi|volkswagen)\b/i;
  for (const car of CITY_RUSH_CARS) {
    assert.ok(car.name && car.className && car.accent.startsWith('#'));
    assert.ok(Number.isInteger(car.price) && car.price >= 0, `${car.name} a un prix entier valide`);
    assert.ok(!forbiddenBrandNames.test(car.name), `nom de marque réel interdit dans car.name : ${car.name}`);
    assert.ok(!forbiddenBrandNames.test(car.className), `nom de marque réel interdit dans car.className : ${car.className}`);
    for (const stat of ['power', 'acceleration', 'recovery']) assert.ok(car[stat] >= 0 && car[stat] <= 100);
    assert.ok(car.powerMultiplier > 0);
    assert.ok(car.accelerationRate > 0);
    assert.ok(car.hitRecoveryMultiplier > 0);
    assert.ok(car.widthScale > 0 && car.heightScale > 0 && car.lengthScale > 0);
  }
  for (const vehicle of CITY_RUSH_TRAFFIC_TYPES) {
    assert.ok(!forbiddenBrandNames.test(vehicle.name), `nom de marque réel interdit dans traffic.name : ${vehicle.name}`);
  }
  assert.ok(new Set(CITY_RUSH_CARS.map((car) => car.widthScale)).size > 1);
  assert.ok(new Set(CITY_RUSH_CARS.map((car) => car.powerMultiplier)).size > 1);
  assert.ok(new Set(CITY_RUSH_CARS.map((car) => car.hitRecoveryMultiplier)).size > 1);
});

test('les trois voitures les moins puissantes sont débloquées pour tout le monde', () => {
  assert.equal(CITY_RUSH_FREE_CAR_COUNT, 3);
  assert.deepEqual([...CITY_RUSH_FREE_CAR_IDS], ['city-hatch', 'nova-18-gt', 'night-comet']);
  // Le classement suit la vitesse de pointe réelle (`powerMultiplier`), pas la
  // barre « PUISSANCE » du garage.
  const ranked = CITY_RUSH_CARS_BY_POWER.map((car) => car.powerMultiplier);
  assert.deepEqual(ranked, [...ranked].sort((a, b) => a - b), 'le catalogue trié va du plus lent au plus rapide');
  assert.deepEqual(
    CITY_RUSH_CARS_BY_POWER.slice(0, CITY_RUSH_FREE_CAR_COUNT).map((car) => car.id),
    [...CITY_RUSH_FREE_CAR_IDS],
  );
  for (const car of CITY_RUSH_CARS) {
    assert.equal(isCityRushFreeCar(car.id), CITY_RUSH_FREE_CAR_IDS.includes(car.id), `${car.name} : offre cohérente`);
  }
  assert.equal(isCityRushFreeCar('ghost-car'), false);
  assert.ok(
    CITY_RUSH_CARS.filter((car) => !isCityRushFreeCar(car.id)).every((car) => car.price > 0),
    'les cinq voitures au-delà du trio offert restent payantes',
  );
});

test('Vice City Rush has six playable lanes with three lanes in each direction', () => {
  assert.equal(CITY_RUSH_LANE_X.length, 6);
  assert.equal(CITY_RUSH_LANE_X.length, CITY_RUSH_LANES_PER_DIRECTION * 2);
  assert.equal(CITY_RUSH_LANES_PER_DIRECTION, 3);
  assert.equal(CITY_RUSH_LANE_WIDTH, 2.1);
  assert.equal(CITY_RUSH_ROAD_WIDTH, 13.4);
  assert.equal(CITY_RUSH_ROAD_HALF_WIDTH, 6.7);
  assert.deepEqual([...CITY_RUSH_LANE_X], [-5.25, -3.15, -1.05, 1.05, 3.15, 5.25]);
  assert.deepEqual([...CITY_RUSH_ONCOMING_LANES], [0, 1, 2]);
  assert.deepEqual([...CITY_RUSH_FORWARD_LANES], [3, 4, 5]);
  assert.deepEqual([...CITY_RUSH_DEFAULT_LANES], [4, 5, 3]);
  assert.ok(CITY_RUSH_LANE_X.every((laneX, index) => index === 0
    || Math.abs(laneX - CITY_RUSH_LANE_X[index - 1] - CITY_RUSH_LANE_WIDTH) < 1e-9));
  assert.ok(Math.max(...CITY_RUSH_LANE_X.map(Math.abs)) + 1.9 / 2 < CITY_RUSH_ROAD_HALF_WIDTH,
    'les voitures tiennent sur la chaussée, même dans les voies extérieures');
  assert.deepEqual(selectCityRushRacers({ cityId: 'vice-city' }).map((racer) => racer.lane), [4, 5, 3]);
});

test('les lignes peintes séparent exactement les voies de chaque parcours', () => {
  // Le marquage au sol n'est pas décoratif : chaque ligne tombe au milieu de la
  // paire de voies qu'elle sépare. Les six voies urbaines gardent ainsi leurs
  // séparateurs historiques, et la piste du Ring se coupe en quatre parts
  // égales de 2,10 m.
  assert.equal(CITY_RUSH_LANE_PAINT_WIDTH, 0.16);
  const citySeparators = cityRushLaneSeparators(CITY_RUSH_CITIES[0]);
  assert.deepEqual(citySeparators.map((x) => Number(x.toFixed(6))), [-4.2, -2.1, 0, 2.1, 4.2],
    'les six voies urbaines gardent leurs cinq séparateurs');
  assert.ok(citySeparators.every((x) => Math.abs(x) + CITY_RUSH_LANE_PAINT_WIDTH / 2 < CITY_RUSH_ROAD_HALF_WIDTH),
    'aucune ligne urbaine ne mord le trottoir');

  const ring = CITY_RUSH_NORDSCHLEIFE_COURSE;
  assert.equal(cityRushLaneCount(ring), 4);
  const lanes = cityRushLaneConfig(ring);
  assert.equal(lanes.raceway, true);
  const separators = cityRushLaneSeparators(ring);
  assert.deepEqual(separators.map((x) => Number(x.toFixed(6))), [-2.1, 0, 2.1],
    'la piste se partage en quatre voies de 2,10 m');
  separators.forEach((bridge, lane) => {
    assert.ok(Math.abs((lanes.laneX(lane) + lanes.laneX(lane + 1)) / 2 - bridge) < 1e-9,
      `la ligne ${lane + 1} tombe au milieu des voies ${lane} et ${lane + 1}`);
    assert.ok(Math.abs(lanes.laneX(lane + 1) - lanes.laneX(lane) - CITY_RUSH_LANE_WIDTH) < 1e-9);
  });
  assert.ok(separators.every((x) => Math.abs(x) + CITY_RUSH_LANE_PAINT_WIDTH / 2 < CITY_RUSH_RACEWAY_ROAD_HALF),
    'les lignes du Ring restent sur les 9,20 m de bitume');
});

test('the rendered circuit has gentle, seamless turns while race lanes stay logical', () => {
  const samples = Array.from({ length: 24 }, (_, index) => cityRushTrackOffset(index * CITY_RUSH_LAP_LENGTH / 24));
  assert.equal(CITY_RUSH_TURN_AMPLITUDE, 2.35);
  assert.ok(samples.some((offset) => offset > 1.5), 'une moitié du circuit se décale vers la droite');
  assert.ok(samples.some((offset) => offset < -1.5), 'l’autre moitié revient vers la gauche');
  assert.ok(Math.abs(cityRushTrackOffset(0)) < 1e-12, 'la ligne de départ reste centrée');
  assert.ok(Math.abs(cityRushTrackOffset(CITY_RUSH_LAP_LENGTH)) < 1e-12, 'la boucle se referme sans saut');
  assert.ok(Math.abs(cityRushTrackTangent(0)) < 1e-12, 'le raccord départ/arrivée est sans angle');
  assert.ok(Math.abs(cityRushTrackOffset(137) - cityRushTrackOffset(137 + CITY_RUSH_LAP_LENGTH)) < 1e-12,
    'le même virage se répète à chaque tour');
  assert.ok(Math.abs(cityRushTrackYaw(CITY_RUSH_LAP_LENGTH * 0.18)) < 0.08,
    'le lacet reste léger, même au cœur du virage');
});

test('the rendered circuit rises and falls with a gentle seamless road profile', () => {
  const samples = Array.from({ length: 24 }, (_, index) => cityRushTrackElevation(index * CITY_RUSH_LAP_LENGTH / 24));
  assert.equal(CITY_RUSH_HILL_AMPLITUDE, 2.1);
  assert.ok(samples.some((height) => height > 1.4), 'une montée est visible sur une moitié du circuit');
  assert.ok(samples.some((height) => height < -1.4), 'une descente est visible sur l’autre moitié');
  assert.ok(Math.abs(cityRushTrackElevation(0)) < 1e-12, 'le portique reste à hauteur zéro');
  assert.ok(Math.abs(cityRushTrackElevation(CITY_RUSH_LAP_LENGTH)) < 1e-12, 'le relief se referme sans marche');
  assert.ok(Math.abs(cityRushTrackGrade(0)) < 1e-12, 'le raccord ne crée pas de cassure de pente');
  assert.ok(Math.abs(cityRushTrackPitch(CITY_RUSH_LAP_LENGTH * 0.18)) < 0.08,
    'le tangage reste assez doux pour la lisibilité de la course');
});

test('eight slow traffic cars span three forward lanes and safely block racers (trafic allégé)', () => {
  assert.equal(CITY_RUSH_TRAFFIC_COUNT, 8);
  assert.ok(CITY_RUSH_TRAFFIC_COUNT >= CITY_RUSH_TRAFFIC_TYPES.length,
    'la flotte contient au moins une voiture de chaque type de trafic');
  assert.equal(CITY_RUSH_TRAFFIC_LANES.length, CITY_RUSH_TRAFFIC_COUNT);
  assert.ok(CITY_RUSH_TRAFFIC_LANES.every((lane) => lane >= 0 && lane < CITY_RUSH_LANE_X.length));
  // La route est à double sens : le trafic lent occupe les trois voies de
  // droite, les trois voies de gauche étant réservées au trafic venant en face.
  // Trafic allégé : 8 voitures au lieu de 12.
  assert.deepEqual([...CITY_RUSH_TRAFFIC_LANES], [3, 4, 5, 3, 4, 5, 3, 4]);
  assert.deepEqual(CITY_RUSH_LANE_X.map((_, lane) => CITY_RUSH_TRAFFIC_LANES.filter((value) => value === lane).length), [0, 0, 0, 3, 3, 2]);
  assert.ok(CITY_RUSH_TRAFFIC_LANES.every((lane) => CITY_RUSH_FORWARD_LANES.includes(lane)), 'le trafic lent reste sur les voies dans le sens de la course');
  assert.equal(CITY_RUSH_ONCOMING_COUNT, 3);
  assert.equal(CITY_RUSH_ONCOMING_COUNT, CITY_RUSH_ONCOMING_LANES.length,
    'une seule voiture venant en face par voie de gauche');
  assert.deepEqual([...CITY_RUSH_ONCOMING_LANES], [0, 1, 2]);
  assert.deepEqual(CITY_RUSH_TRAFFIC_TYPES.map((vehicle) => vehicle.id), [
    'police', 'undercover-police', 'ambulance', 'garbage-truck', 'white-lambo',
  ]);
  assert.deepEqual([...CITY_RUSH_POLICE_TRAFFIC_TYPES], ['police', 'undercover-police']);
  assert.equal(isCityRushPoliceTrafficType('police'), true);
  assert.equal(isCityRushPoliceTrafficType('undercover-police'), true);
  assert.equal(isCityRushPoliceTrafficType('ambulance'), false);
  for (const vehicle of CITY_RUSH_TRAFFIC_TYPES) {
    assert.ok(vehicle.speed > 0 && vehicle.speed <= 8, `${vehicle.name} roule lentement`);
    assert.ok(vehicle.width > 0 && vehicle.length > 0);
  }

  const traffic = CITY_RUSH_TRAFFIC_TYPES[0];
  const moved = resolveCityRushCarMovement([
    { id: 'slow-traffic', lane: 1, width: traffic.width, previousDistance: 40, nextDistance: 40 + traffic.speed * 0.04 },
    { id: 'player', lane: 1, width: 1.9, previousDistance: 35, nextDistance: 35 + 24 * 0.04 },
  ]);
  const byId = Object.fromEntries(moved.map((car) => [car.id, car.nextDistance]));
  assert.ok(byId.player >= 35, 'le contact ne provoque pas de recul ni de pénalité');
  assert.ok(byId['slow-traffic'] - byId.player >= CITY_RUSH_CAR_GAP - 1e-9);
});

test('un joueur humain ou une IA touche le trafic, ralentit brièvement (0,6 s) et libère une voie', () => {
  assert.equal(CITY_RUSH_TRAFFIC_IMPACT_DURATION, 0.6);
  assert.equal(CITY_RUSH_TRAFFIC_IMPACT_GAP, CITY_RUSH_CAR_GAP);
  assert.ok(CITY_RUSH_TRAFFIC_IMPACT_COOLDOWN > CITY_RUSH_TRAFFIC_IMPACT_DURATION);
  assert.ok(CITY_RUSH_TRAFFIC_LANE_CHANGE_DURATION > 0 && CITY_RUSH_TRAFFIC_LANE_CHANGE_DURATION < CITY_RUSH_TRAFFIC_IMPACT_DURATION);

  const requests = [
    { id: 'player', collisionGroup: 'racer', lane: 1, x: -1.05, width: 1.9, previousDistance: 20, nextDistance: 22.2 },
    { id: 'nova', collisionGroup: 'racer', lane: 2, x: 1.05, width: 1.75, previousDistance: 8, nextDistance: 8.4 },
    { id: 'traffic-1', collisionGroup: 'traffic', lane: 1, x: -1.05, width: 1.94, previousDistance: 25.2, nextDistance: 25.45 },
  ];
  const impacts = detectCityRushTrafficImpacts(requests);
  assert.equal(impacts.length, 1);
  assert.equal(impacts[0].racerId, 'player');
  assert.equal(impacts[0].trafficId, 'traffic-1');
  assert.equal(impacts[0].lane, 1);
  assert.ok(Math.abs(impacts[0].previousGap - 5.2) < 1e-9);
  assert.ok(Math.abs(impacts[0].requestedGap - 3.25) < 1e-9);
  assert.deepEqual(detectCityRushTrafficImpacts([
    { id: 'rival', collisionGroup: 'racer', lane: 0, x: -3.15, previousDistance: 20, nextDistance: 21 },
    { id: 'traffic', collisionGroup: 'traffic', lane: 1, x: -1.05, previousDistance: 30, nextDistance: 30.1 },
  ]), [], 'deux voies distinctes ne provoquent pas un choc');

  assert.equal(chooseCityRushTrafficEscapeLane({ currentLane: 0 }), 1, 'le bord gauche se rabat vers la voie 1');
  assert.equal(chooseCityRushTrafficEscapeLane({ currentLane: 1, blockedLanes: [0] }), 2, 'une voie occupée est évitée');
  assert.equal(chooseCityRushTrafficEscapeLane({ currentLane: 3, blockedLanes: [2] }), 4, 'la nouvelle voie extérieure reste disponible');
  assert.equal(chooseCityRushTrafficEscapeLane({ currentLane: 3, blockedLanes: [2, 4] }), 1, 'les deux voisines occupées font glisser le dégagement');
});

test('an oncoming collision nudges the hit car one lane without leaving the road', () => {
  assert.equal(CITY_RUSH_ONCOMING_MAX_WIDTH, 2.12);
  assert.equal(CITY_RUSH_ONCOMING_EDGE_MARGIN, 0.3);
  assert.ok(Math.abs(CITY_RUSH_ONCOMING_SAFE_OUTER_X + 5.34) < 1e-9);
  assert.ok(CITY_RUSH_ONCOMING_SAFE_OUTER_X - CITY_RUSH_ONCOMING_MAX_WIDTH / 2
    >= -CITY_RUSH_ROAD_HALF_WIDTH + CITY_RUSH_ONCOMING_EDGE_MARGIN - 1e-9,
  'le véhicule le plus large conserve une marge sur le bitume');
  assert.equal(CITY_RUSH_ONCOMING_EJECT_DURATION, 0.72);
  const start = CITY_RUSH_LANE_X[1];
  const samples = [0, 0.18, 0.36, 0.54, 0.72].map((elapsed) => cityRushOncomingImpactX(start, elapsed));
  assert.equal(samples[0], start);
  assert.ok(samples[0] > samples[1] && samples[1] > samples[2] && samples[2] > samples[3]);
  assert.equal(samples[4], CITY_RUSH_LANE_X[0]);
  assert.equal(cityRushOncomingImpactX(start, 2), CITY_RUSH_LANE_X[0]);
  for (const lane of CITY_RUSH_ONCOMING_LANES) {
    const laneStartX = CITY_RUSH_LANE_X[lane];
    const targetX = cityRushOncomingImpactX(laneStartX, CITY_RUSH_ONCOMING_EJECT_DURATION);
    assert.ok(laneStartX - targetX >= 0 && laneStartX - targetX <= CITY_RUSH_LANE_WIDTH + 1e-9,
      `la voiture venant de la voie ${lane + 1} dévie d'au plus une voie`);
    assert.ok(targetX - CITY_RUSH_ONCOMING_MAX_WIDTH / 2
      >= -CITY_RUSH_ROAD_HALF_WIDTH + CITY_RUSH_ONCOMING_EDGE_MARGIN - 1e-9,
    'la voiture reste sur la chaussée avec une marge');
  }

  // Conduite à gauche (Londres, Shuto) : le contresens arrive par la droite, et
  // la voiture heurtée dérape vers le bord droit en miroir exact.
  for (const lane of CITY_RUSH_RIGHT_HALF_LANES) {
    const laneStartX = CITY_RUSH_LANE_X[lane];
    const targetX = cityRushOncomingImpactX(
      laneStartX, CITY_RUSH_ONCOMING_EJECT_DURATION, CITY_RUSH_ONCOMING_MAX_WIDTH, 'left',
    );
    assert.ok(targetX - laneStartX >= 0 && targetX - laneStartX <= CITY_RUSH_LANE_WIDTH + 1e-9,
      `la voiture venant de la voie ${lane + 1} dévie d'au plus une voie vers la droite`);
    assert.ok(targetX + CITY_RUSH_ONCOMING_MAX_WIDTH / 2
      <= CITY_RUSH_ROAD_HALF_WIDTH - CITY_RUSH_ONCOMING_EDGE_MARGIN + 1e-9,
    'la voiture reste sur la chaussée, à droite de l’axe');
  }
  // Le miroir est exact : la trajectoire d'une voiture heurtée à l'abscisse -x
  // d'une course à gauche est l'opposée de celle de la voiture heurtée à +x
  // d'une course à droite.
  for (const laneX of CITY_RUSH_LANE_X) {
    const toTheRight = cityRushOncomingImpactX(laneX, 0.3, 1.9, 'right');
    const toTheLeft = cityRushOncomingImpactX(-laneX, 0.3, 1.9, 'left');
    assert.ok(Math.abs(toTheRight + toTheLeft) < 1e-9, `la trajectoire de l’abscisse ${laneX} est reflétée`);
  }
  assert.ok(Math.abs(cityRushOncomingImpactX(Number.NaN, 0, CITY_RUSH_ONCOMING_MAX_WIDTH, 'left') - CITY_RUSH_LANE_X[5]) < 1e-9,
    'sans abscisse de départ, un contresens à droite repart de la voie la plus à droite');
  assert.ok(Math.abs(
    cityRushOncomingImpactX(Number.NaN, CITY_RUSH_ONCOMING_EJECT_DURATION, CITY_RUSH_ONCOMING_MAX_WIDTH, 'right')
      - cityRushOncomingImpactX(-CITY_RUSH_LANE_X[5], CITY_RUSH_ONCOMING_EJECT_DURATION, CITY_RUSH_ONCOMING_MAX_WIDTH, 'right'),
  ) < 1e-9, 'sans abscisse de départ, le défaut reste la voie de contresens historique');
});

test('rivals plan lane changes to collect bonuses and avoid traffic safely', () => {
  const towardPickup = chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    speed: 24,
    availableLanes: [0, 1, 2],
    pickups: [{ lane: 2, distance: 40, type: CITY_RUSH_PICKUPS.BOOST }],
  });
  assert.equal(towardPickup, 2);

  const awayFromTraffic = chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    speed: 24,
    availableLanes: [0, 1, 2],
    traffic: [{ lane: 1, distance: 48, speed: 5 }],
  });
  assert.ok(awayFromTraffic !== 1);
  assert.equal(chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    availableLanes: [1],
    pickups: [{ lane: 2, distance: 40, type: CITY_RUSH_PICKUPS.BOOST }],
  }), 1, 'le rival ne tente pas de changer vers une voie bloquée');
});

test('rivals prefer a more distant ground boost to a nearby inventory bonus', () => {
  const nextLane = chooseCityRushAiLane({
    currentLane: 1,
    distance: 1000,
    speed: CITY_RUSH_PLAYER_SPEED,
    availableLanes: [0, 1, 2],
    pickups: [
      { lane: 0, distance: 1115, type: CITY_RUSH_PICKUPS.BOOST },
      { lane: 2, distance: 1005, type: CITY_RUSH_POWERS.PISTOL },
    ],
  });
  assert.equal(nextLane, 0, 'le rival s’écarte pour le pad turbo avant de prendre le bonus rouge plus proche');
});

test('oncoming traffic on the left lanes is dodged like a wall, never rammed', () => {
  // Un véhicule marqué `oncoming` (vitesse négative) arrive face au pilote :
  // même un bonus ne justifie pas de se jeter sous son capot.
  assert.equal(chooseCityRushAiLane({
    currentLane: 2,
    distance: 0,
    speed: 28,
    pickups: [{ lane: 1, distance: 40, type: CITY_RUSH_PICKUPS.BOOST }],
    traffic: [{ lane: 1, distance: 45, speed: -6, oncoming: true }],
  }), 2, 'le bonus passe derrière un véhicule venant en face');

  // Une fois le véhicule croisé (derrière), la voie redevient prenable.
  assert.equal(chooseCityRushAiLane({
    currentLane: 2,
    distance: 0,
    speed: 28,
    pickups: [{ lane: 1, distance: 40, type: CITY_RUSH_PICKUPS.BOOST }],
    traffic: [{ lane: 1, distance: -10, speed: -6, oncoming: true }],
  }), 1, 'une voie dégagée reste une voie de dépassement');

  // Dans la voie inverse la plus proche du centre, une voie vers la droite
  // suffit pour rejoindre le sens de la course sans sauter de voie.
  assert.equal(chooseCityRushAiLane({
    currentLane: 2,
    distance: 0,
    speed: 28,
    traffic: [{ lane: 2, distance: 90, speed: -6, oncoming: true }],
  }), 3, 'le rabat rejoint le sens de la course');

  // Les voies en sens inverse gardent un léger malus : à égalité, un pilote
  // reste du côté de la course.
  assert.equal(chooseCityRushAiLane({
    currentLane: 2,
    distance: 0,
    speed: 28,
    oncomingLanes: CITY_RUSH_ONCOMING_LANES,
  }), 3, 'sans bonus vers la gauche, on quitte le sens inverse');
});

test('rivals only chase red machine-gun bonuses while uncharged; boosts stay available', () => {
  const redPickup = { lane: 2, distance: 40, type: CITY_RUSH_POWERS.PISTOL };
  const emptyInventory = { pistol: 0 };
  const loadedInventory = { pistol: 1 };
  const unchargedPickups = [redPickup].filter((pickup) => canCollectCityRushPickup(emptyInventory, pickup.type));
  assert.equal(chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    speed: 24,
    availableLanes: [0, 1, 2],
    pickups: unchargedPickups,
  }), 2, 'le rival prend le bonus rouge pour charger sa mitrailleuse');

  const loadedPickups = [redPickup].filter((pickup) => canCollectCityRushPickup(loadedInventory, pickup.type));
  assert.deepEqual(loadedPickups, [], 'une voiture déjà chargée ne suit plus le bonus rouge');
  assert.equal(chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    availableLanes: [0, 1, 2],
    pickups: loadedPickups,
  }), 1, 'sans pickup rouge admissible, le rival reste dans sa voie');

  const boost = { lane: 2, distance: 40, type: CITY_RUSH_PICKUPS.BOOST };
  const loadedRacerPickups = [redPickup, boost]
    .filter((pickup) => canCollectCityRushPickup(loadedInventory, pickup.type));
  assert.deepEqual(loadedRacerPickups, [boost], 'un boost reste disponible même avec la mitrailleuse chargée');
  assert.equal(chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    speed: 24,
    availableLanes: [0, 1, 2],
    pickups: loadedRacerPickups,
  }), 2, 'le rival chargé continue à chercher les boosts');
});

test('car profiles change top speed, acceleration, and recovery after a hit', () => {
  const turbo = CITY_RUSH_CARS.find((car) => car.id === 'turbo-gt');
  const muscle = CITY_RUSH_CARS.find((car) => car.id === 'muscle-86');
  const comet = CITY_RUSH_CARS.find((car) => car.id === 'night-comet');
  assert.ok(turbo.powerMultiplier > comet.powerMultiplier);
  assert.ok(muscle.accelerationRate > turbo.accelerationRate);
  assert.ok(approachCityRushSpeed(0, 24, muscle.accelerationRate, 1) > approachCityRushSpeed(0, 24, turbo.accelerationRate, 1));
  assert.ok(cityRushHitDuration(2, comet) < cityRushHitDuration(2, turbo));
  assert.equal(cityRushHitDuration(3, comet), 3 * comet.hitRecoveryMultiplier);

  // Les écarts de puissance sont volontairement francs : la voiture la plus
  // chère doit dominer la plus lente bien au-delà des anciens 6 %. On vérifie
  // le classement strict ET l'amplitude, pas des bornes serrées.
  const performanceCars = CITY_RUSH_CARS.slice(2);
  const speedMultipliers = performanceCars.map((car) => car.powerMultiplier);
  assert.ok(Math.min(...speedMultipliers) >= 0.9);
  assert.ok(Math.max(...speedMultipliers) - Math.min(...speedMultipliers) >= 0.35,
    'les voitures du haut du garage affichent une vraie différence de vitesse de pointe');
  const orderedIds = (stat, direction = 1) => [...performanceCars]
    .sort((a, b) => (a[stat] - b[stat]) * direction)
    .map((car) => car.id);
  assert.deepEqual(orderedIds('power'), orderedIds('powerMultiplier'));
  assert.deepEqual(orderedIds('acceleration'), orderedIds('accelerationRate'));
  assert.deepEqual(orderedIds('recovery'), orderedIds('hitRecoveryMultiplier', -1));
});

test('l’écart de puissance entre la citadine de départ et la supercar est franc et lisible', () => {
  const starter = CITY_RUSH_CARS[0];
  const top = CITY_RUSH_CARS[CITY_RUSH_CARS.length - 1];
  // La vitesse de pointe réelle vaut `CITY_RUSH_PLAYER_SPEED × powerMultiplier`
  // (voir `ViceCityWorld.jsx`) : c'est bien le multiplicateur qui fait la course.
  const topSpeed = (car) => CITY_RUSH_PLAYER_SPEED * car.powerMultiplier;
  assert.ok(top.powerMultiplier / starter.powerMultiplier >= 1.6,
    'la supercar la plus chère va au moins 60 % plus vite que la citadine offerte');
  assert.ok(top.powerMultiplier / starter.powerMultiplier <= 2.2,
    'l’écart reste sous ×2,2 pour ne pas sortir du champ de vision des rivaux');
  assert.ok(topSpeed(top) - topSpeed(starter) >= 20,
    'au moins 20 m/s d’écart de pointe entre l’entrée et le haut du garage');
  // Les barres du garage doivent refléter le classement réel, prix compris.
  const idsSortedBy = (stat) => [...CITY_RUSH_CARS].sort((a, b) => a[stat] - b[stat]).map((car) => car.id);
  assert.deepEqual(idsSortedBy('power'), idsSortedBy('powerMultiplier'));
  assert.deepEqual(idsSortedBy('price'), idsSortedBy('powerMultiplier'));
  // Les deux rivaux reçoivent les profils les plus lents hors voiture du joueur
  // (`rivalProfiles` dans `ViceCityWorld.jsx`) : l'écart en piste est donc réel
  // dans les deux sens, du départ difficile à la course dominée.
  const slowestRivals = CITY_RUSH_CARS.slice(0, 2);
  assert.ok(top.powerMultiplier / slowestRivals[1].powerMultiplier >= 1.6);
});

test('chaque système calibré pour une seule vitesse suit désormais la voiture', () => {
  const starter = CITY_RUSH_CARS[0];
  const top = CITY_RUSH_CARS[CITY_RUSH_CARS.length - 1];
  const topSpeed = (car) => CITY_RUSH_PLAYER_SPEED * car.powerMultiplier;

  // Freinage : les freins suivent le modèle (fini le plancher unique à 18 m/s²),
  // donc une supercar repart plus vite après un choc qu'une citadine.
  assert.equal(cityRushBrakingRate(0), CITY_RUSH_BRAKE_RATE_FLOOR);
  assert.ok(cityRushBrakingRate(top.accelerationRate) > cityRushBrakingRate(starter.accelerationRate));
  assert.ok(
    approachCityRushSpeed(30, 10, top.accelerationRate, 1) < approachCityRushSpeed(30, 10, starter.accelerationRate, 1),
    'la supercar freine plus court que la citadine',
  );

  // Streaming : le trafic se voit arriver aussi longtemps, quelle que soit la pointe.
  assert.equal(cityRushTrafficViewAhead(CITY_RUSH_PLAYER_SPEED), CITY_RUSH_TRAFFIC_VIEW_AHEAD_MIN);
  assert.ok(cityRushTrafficViewAhead(topSpeed(top)) > CITY_RUSH_TRAFFIC_VIEW_AHEAD_MIN);
  assert.ok(cityRushTrafficViewAhead(topSpeed(top)) >= topSpeed(top) * 4);

  // Rangées de bonus : même avance en secondes, donc plus de rangées semées
  // devant une voiture rapide (la densité de bonus au mètre, elle, ne bouge pas).
  assert.equal(cityRushPickupRowCount(CITY_RUSH_PLAYER_SPEED), CITY_RUSH_PICKUP_ROW_COUNT_MIN);
  assert.ok(cityRushPickupRowCount(topSpeed(top)) > CITY_RUSH_PICKUP_ROW_COUNT_MIN);
  assert.equal(cityRushPickupRowCount(0), CITY_RUSH_PICKUP_ROW_COUNT_MIN);
  assert.ok(cityRushPickupRowCount(1000) <= CITY_RUSH_PICKUP_ROW_COUNT_MAX);
  assert.ok(CITY_RUSH_PICKUP_ROW_COUNT_MIN * CITY_RUSH_PICKUP_ROW_SPACING_MIN > 0);

  // Sprint : 15 s à la vitesse de référence, puis le chrono suit la voiture —
  // la citadine a besoin de plus de temps, la supercar n'a plus de cadeau.
  assert.equal(cityRushSprintCheckpointTime(CITY_RUSH_PLAYER_SPEED), 15);
  assert.ok(cityRushSprintCheckpointTime(topSpeed(starter)) > 15);
  assert.ok(cityRushSprintCheckpointTime(topSpeed(top)) < 15);
  for (const car of CITY_RUSH_CARS) {
    const speed = topSpeed(car);
    const bonus = cityRushSprintCheckpointTime(speed);
    assert.ok(bonus >= CITY_RUSH_SPRINT_CHECKPOINT_TIME_MIN && bonus <= CITY_RUSH_SPRINT_CHECKPOINT_TIME_MAX,
      `${car.id} reste dans les bornes du chrono`);
    const flat = CITY_RUSH_SPRINT_CHECKPOINT_SPACING / speed;
    assert.ok(bonus >= flat * 1.2, `${car.id} a la marge pour atteindre le checkpoint suivant`);
    assert.ok(bonus <= flat * 2, `${car.id} n'a pas une marge absurde`);
  }

  // Police : une berline lancée à la poursuite revient toujours sur la voiture
  // qu'elle chasse, même une supercar à 179 km/h.
  const chase = cityRushPolicePace({ gap: -60, baseSpeed: CITY_RUSH_POLICE_BASE_SPEED, leaderSpeed: topSpeed(top) });
  assert.ok(chase >= topSpeed(top) * CITY_RUSH_POLICE_CHASE_SPEED_FACTOR - 1e-9);
  assert.ok(chase > CITY_RUSH_POLICE_BASE_SPEED * 1.34 - 1e-9);
});

test('the active loadout has seven red machine-gun bullets plus automatic ground boosts', () => {
  assert.equal(CITY_RUSH_DISTANCE, 8400); // 6 tours : 5 boucles de 1 200 m + un dernier tour de 2 boucles
  assert.equal(CITY_RUSH_PLAYER_SPEED, 35);
  assert.equal(CITY_RUSH_RED_PICKUP_CHANCE, 0.05, 'le bonus rouge n’apparaît que dans 5 % des objets');
  assert.equal(CITY_RUSH_PISTOL_AMMO_PER_PICKUP, 7);
  assert.equal(CITY_RUSH_TRACK_BOOST_PICKUP_CHANCE, 0.95);
  assert.equal(CITY_RUSH_AI_TRACK_BOOST_WEIGHT, 3);
  assert.deepEqual(CITY_RUSH_POWER_CHARGE_COST, { 'blue-shot': 1, pistol: 7, radio: 4 });
  assert.equal(CITY_RUSH_POWER_RULES.pistol.key, 'Z');
  assert.equal(CITY_RUSH_POWER_RULES.pistol.chargeCost, 7);
  assert.equal(CITY_RUSH_POWER_RULES.pistol.ammoPerPickup, CITY_RUSH_PISTOL_AMMO_PER_PICKUP);
  assert.match(CITY_RUSH_POWER_RULES.pistol.description, /bonus rouge.*très rares/i);
  assert.match(CITY_RUSH_POWER_RULES.pistol.description, /7 balles/i);
  assert.match(CITY_RUSH_POWER_RULES.pistol.name, /AK-47/i);
  assert.match(CITY_RUSH_POWER_RULES.pistol.description, /tout droit/i);
  assert.match(CITY_RUSH_POWER_RULES.pistol.description, /premier adversaire ou la première voiture de police/i);
  assert.match(CITY_RUSH_POWER_RULES.pistol.description, /retire un carré de vie/i);
  assert.match(CITY_RUSH_POWER_RULES.pistol.description, /sans dérapage ni ralentissement/i);
  assert.match(CITY_RUSH_POWER_RULES.pistol.description, /voiture de police à six points de vie.*inflige 3 dégâts/i);
  assert.match(CITY_RUSH_POWER_RULES.pistol.description, /carambolage en accélérant retire un point à la police, jamais au joueur/i);
  assert.deepEqual(Object.fromEntries(Object.entries(CITY_RUSH_POWER_RULES).map(([type, rule]) => [type, rule.key])), {
    'blue-shot': 'A', pistol: 'Z', radio: 'R',
  });
  assert.deepEqual(Object.keys(CITY_RUSH_POWER_RULES), ['blue-shot', 'pistol', 'radio']);
  for (const [type, cost] of Object.entries(CITY_RUSH_POWER_CHARGE_COST)) {
    assert.equal(CITY_RUSH_POWER_RULES[type].chargeCost, cost);
  }
  assert.equal(CITY_RUSH_BLUE_SHOT_DURATION, 1.8);
  assert.equal(CITY_RUSH_BLUE_SHOT_SPEED_FACTOR, 0.55);
  assert.equal(CITY_RUSH_BLUE_SHOT_MAX_RANGE, CITY_RUSH_RACER_VIEW_DISTANCE);
  assert.equal(CITY_RUSH_POWER_RULES[CITY_RUSH_POWERS.BLUE_SHOT].chargeCost, 1);
  assert.equal(CITY_RUSH_POWER_RULES[CITY_RUSH_POWERS.BLUE_SHOT].duration, CITY_RUSH_BLUE_SHOT_DURATION);
  assert.equal(CITY_RUSH_POWER_RULES[CITY_RUSH_POWERS.BLUE_SHOT].speedFactor, CITY_RUSH_BLUE_SHOT_SPEED_FACTOR);
  assert.equal(CITY_RUSH_POWER_RULES[CITY_RUSH_POWERS.BLUE_SHOT].color, '#48b9ff');
  assert.equal(CITY_RUSH_POWER_RULES[CITY_RUSH_POWERS.BLUE_SHOT].automatic, false);
  assert.match(CITY_RUSH_POWER_RULES[CITY_RUSH_POWERS.BLUE_SHOT].description, /one pickup|un seul bonus/i);
  assert.equal(CITY_RUSH_POWER_RULES[CITY_RUSH_PICKUPS.BOOST], undefined, 'le turbo au sol n’est pas un pouvoir stocké');
  assert.equal(CITY_RUSH_TRACK_BOOST_DURATION, 3);
  assert.equal(CITY_RUSH_TRACK_BOOST_SPEED_FACTOR, 1.46);
  assert.equal(CITY_RUSH_RIVAL_BOOST_SPEED_FACTOR, 1.38);
  assert.equal(CITY_RUSH_TRACK_BOOST_COLOR, '#50e48a');
  assert.equal(CITY_RUSH_POWER_RULES.pistol.duration, 2);
  assert.equal(CITY_RUSH_POWER_RULES.pistol.color, '#ff526e');
  assert.equal(CITY_RUSH_POWER_RULES.pistol.automatic, false);
  assert.equal(CITY_RUSH_POWER_RULES.radio.duration, 2);
  assert.equal(CITY_RUSH_POWER_RULES.radio.color, '#ffd44f');
  assert.equal(CITY_RUSH_POWER_RULES.radio.automatic, false);
});

test('the blue shot picks at most one visible opponent directly ahead in the same lane', () => {
  const selected = cityRushStraightShotTarget({
    attackerDistance: 100,
    attackerLane: 2,
    targets: [
      { id: 'farther', distance: 150, lane: 2 },
      { id: 'wrong-lane', distance: 110, lane: 1 },
      { id: 'behind', distance: 99, lane: 2 },
      { id: 'outside-view', distance: 105, lane: 2, visible: false },
      { id: 'nearest-visible', distance: 108, lane: 2 },
      { id: 'too-close', distance: 101, lane: 2 },
      { id: 'past-view', distance: 100 + CITY_RUSH_BLUE_SHOT_MAX_RANGE + 1, lane: 2 },
    ],
  });
  assert.equal(selected.id, 'nearest-visible');
  assert.equal(cityRushStraightShotTarget({
    attackerDistance: 100,
    attackerLane: 2,
    targets: [{ id: 'other-lane', distance: 110, lane: 3 }],
  }), null);
  assert.equal(cityRushStraightShotTarget({
    attackerDistance: 100,
    attackerLane: 2,
    targets: [{ id: 'far-away', distance: 230, lane: 2 }],
  }), null, 'un rival hors du champ de vision ne peut pas être touché');
  assert.equal(cityRushStraightShotTarget({
    attackerDistance: 100,
    attackerLane: 2,
    targets: [{ id: 'occluded', distance: 108, lane: 2, visible: false }],
  }), null, 'un rival masqué par la caméra ne peut pas être touché');
});

test('le tir droit bleu balaie sa voie : une berline de police sur sa trajectoire encaisse le tir', () => {
  // Le projectile parcourt 300 m/s : entre deux images à 30 Hz, il balaie
  // 10 m de voie. Toute berline de cette portion est touchée, qu'elle ait été
  // verrouillée au départ du tir ou non.
  const swept = cityRushStraightShotSweptHit({
    lane: 2,
    fromDistance: 100,
    toDistance: 110,
    targets: [
      { id: 'police-1', lane: 2, distance: 106 },
      { id: 'police-2', lane: 2, distance: 104 },
      { id: 'police-lane', lane: 1, distance: 106 },
      { id: 'police-devant', lane: 2, distance: 118 },
      { id: 'police-derriere', lane: 2, distance: 98 },
    ],
  });
  assert.equal(swept.id, 'police-2', 'la berline la plus proche du canon prend le tir');

  // Une berline qui se rabat dans la voie pendant le vol est touchée : elle
  // n'était pas la cible du tir, mais elle occupe le segment balayé.
  assert.equal(cityRushStraightShotSweptHit({
    lane: 2,
    fromDistance: 100,
    toDistance: 110,
    targets: [{ id: 'police-rabattue', lane: 2, distance: 109.4 }],
  }).id, 'police-rabattue');

  // Les bornes du segment : la bouche du canon ne touche pas une berline
  // laissée derrière elle, et la fin du segment compte comme un impact.
  assert.equal(cityRushStraightShotSweptHit({
    lane: 2, fromDistance: 100, toDistance: 110,
    targets: [{ id: 'police-canon', lane: 2, distance: 100 }],
  }), null, 'une berline à hauteur du canon n’est pas touchée');
  assert.equal(cityRushStraightShotSweptHit({
    lane: 2, fromDistance: 100, toDistance: 110,
    targets: [{ id: 'police-borne', lane: 2, distance: 110 }],
  }).id, 'police-borne', 'la fin du segment balayé compte comme un impact');

  // Voies voisines, segment vide ou inversé : aucun impact.
  assert.equal(cityRushStraightShotSweptHit({
    lane: 2, fromDistance: 100, toDistance: 110,
    targets: [{ id: 'police-voisine', lane: 3, distance: 106 }],
  }), null, 'le tir droit ne dévie jamais de sa voie');
  assert.equal(cityRushStraightShotSweptHit({
    lane: 2, fromDistance: 110, toDistance: 110,
    targets: [{ id: 'police-image', lane: 2, distance: 110 }],
  }), null, 'un segment vide ne touche personne');
  assert.equal(cityRushStraightShotSweptHit({
    lane: 2, fromDistance: 110, toDistance: 100,
    targets: [{ id: 'police-inversé', lane: 2, distance: 106 }],
  }), null, 'un segment inversé ne touche personne');

  // Entrées invalides : la règle ne lève jamais, elle renvoie null.
  assert.equal(cityRushStraightShotSweptHit({ lane: Number.NaN, fromDistance: 100, toDistance: 110, targets: [{ id: 'p', lane: 2, distance: 106 }] }), null);
  assert.equal(cityRushStraightShotSweptHit({ lane: 2, fromDistance: 'loin', toDistance: 110, targets: [{ id: 'p', lane: 2, distance: 106 }] }), null);
  assert.equal(cityRushStraightShotSweptHit({ lane: 2, fromDistance: 100, toDistance: 110, targets: [{ id: 'p', lane: 2, distance: Number.NaN }] }), null);
  assert.equal(cityRushStraightShotSweptHit({ lane: 2, fromDistance: 100, toDistance: 110, targets: [null, undefined] }), null);
  assert.equal(cityRushStraightShotSweptHit(), null);
});

test('le tir droit bleu riposte sur la berline la plus proche de sa voie, même derrière', () => {
  // L'escouade attaque dans le pare-chocs du pilote : sans riposte vers
  // l'arrière, le projectile ne la croise jamais.
  const squad = [
    { id: 'police-1', distance: 1195, lane: 2, active: true }, // 5 m derrière, dans la voie
    { id: 'police-2', distance: 1221, lane: 2, active: true }, // 21 m devant, dans la voie
    { id: 'police-3', distance: 1198, lane: 1, active: true }, // collée, mais voie voisine
  ];
  assert.equal(cityRushStraightShotRetaliation({
    pursuers: squad, attackerDistance: 1200, attackerLane: 2,
  }).id, 'police-1', 'la plus proche l’emporte, derrière comme devant');
  assert.equal(cityRushStraightShotRetaliation({
    pursuers: squad, attackerDistance: 1200, attackerLane: 2, excludeId: 'police-1',
  }).id, 'police-2', 'jamais soi-même');
  // Un tir droit reste droit : la berline d'une autre voie n'est pas visée.
  assert.equal(cityRushStraightShotRetaliation({
    pursuers: [{ id: 'police-3', distance: 1198, lane: 1, active: true }],
    attackerDistance: 1200, attackerLane: 2,
  }), null, 'une berline hors de la voie du tireur ne peut pas être touchée');
  // Hors de portée, désactivée ou détruite : aucune riposte.
  assert.equal(cityRushStraightShotRetaliation({
    pursuers: [{ id: 'police-loin', distance: 1200 - CITY_RUSH_BLUE_SHOT_MAX_RANGE - 1, lane: 2, active: true }],
    attackerDistance: 1200, attackerLane: 2,
  }), null, 'au-delà de la portée du projectile, la riposte ne part pas');
  assert.equal(cityRushStraightShotRetaliation({
    pursuers: [{ id: 'police-inactive', distance: 1195, lane: 2, active: false }],
    attackerDistance: 1200, attackerLane: 2,
  }), null, 'une berline hors course n’est plus une cible');
  assert.equal(cityRushStraightShotRetaliation({
    pursuers: squad, attackerDistance: Number.NaN, attackerLane: 2,
  }), null);
  assert.equal(cityRushStraightShotRetaliation(), null);
  // Sans voie imposée (rivaux IA), la berline la plus proche est retenue.
  assert.equal(cityRushStraightShotRetaliation({
    pursuers: squad, attackerDistance: 1200,
  }).id, 'police-3');
});

test('one red pickup grants seven bullets while inventory tracks remain independent', () => {
  let inventory = createCityRushInventory();
  assert.deepEqual(Object.keys(inventory), ['blue-shot', 'pistol', 'radio']);
  inventory = addCityRushCharge(inventory, CITY_RUSH_POWERS.BLUE_SHOT, 1);
  inventory = addCityRushCharge(inventory, 'pistol');
  assert.equal(inventory[CITY_RUSH_POWERS.BLUE_SHOT], 1);
  assert.equal(inventory.pistol, CITY_RUSH_PISTOL_AMMO_PER_PICKUP);
  assert.equal(isCityRushPowerCharged(inventory, 'pistol'), true, 'un bonus rouge charge sept balles');

  const usedShot = consumeCityRushCharge(inventory, 'pistol');
  assert.equal(usedShot.consumed, true);
  assert.equal(usedShot.inventory.pistol, 6);
  assert.equal(usedShot.inventory[CITY_RUSH_POWERS.BLUE_SHOT], 1, 'la charge historique reste indépendante');
  assert.equal(consumeCityRushCharge(usedShot.inventory, 'pistol').inventory.pistol, 5);

  inventory = addCityRushCharge(usedShot.inventory, 'pistol');
  assert.equal(inventory.pistol, CITY_RUSH_POWER_CHARGE_COST.pistol, 'un nouveau chargeur ne dépasse pas sept balles');
  let emptied = inventory;
  for (let shot = 0; shot < CITY_RUSH_PISTOL_AMMO_PER_PICKUP; shot += 1) {
    emptied = consumeCityRushCharge(emptied, 'pistol').inventory;
  }
  assert.equal(emptied.pistol, 0);
  assert.equal(consumeCityRushCharge(emptied, 'pistol').consumed, false);
  assert.equal(consumeCityRushCharge(inventory, 'unknown').consumed, false);

  const overfilled = addCityRushCharge(createCityRushInventory(), 'radio', 99);
  assert.equal(overfilled.radio, CITY_RUSH_POWER_CHARGE_COST.radio);
});

test('red pickups remain available until every active racer has ammunition, and never reload a ready racer twice', () => {
  const charged = { pistol: CITY_RUSH_PISTOL_AMMO_PER_PICKUP };
  const empty = { pistol: 0 };
  assert.equal(shouldHideCityRushPistolPickup(empty, [empty, empty]), false, 'le joueur doit d’abord charger');
  assert.equal(shouldHideCityRushPistolPickup(charged, [empty, charged]), false, 'un rival non chargé garde les bonus visibles');
  assert.equal(shouldHideCityRushPistolPickup(charged, [charged, charged]), true, 'toutes les voitures sont prêtes');
  const afterPlayerShot = { pistol: 0 };
  assert.equal(shouldHideCityRushPistolPickup(afterPlayerShot, [charged, charged]), false, 'le bonus rouge réapparaît après le tir du joueur');
  assert.equal(canCollectCityRushPickup(afterPlayerShot, 'pistol'), true, 'le joueur peut de nouveau recharger après avoir tiré');
  assert.equal(shouldHideCityRushPistolPickup(charged, []), true, 'sans adversaire actif, le joueur seul suffit');
  assert.equal(isCityRushPowerCharged({ pistol: 9 }, 'pistol'), true, 'les inventaires saturés sont traités comme chargés');
  assert.equal(canCollectCityRushPickup(empty, 'pistol'), true, 'un pilote non chargé peut prendre le rouge');
  assert.equal(canCollectCityRushPickup(charged, 'pistol'), false, 'un pilote prêt laisse le bonus rouge aux autres');
  assert.equal(canCollectCityRushPickup(empty, 'pistol', { redPickupsHidden: true }), false, 'quand tout le monde est prêt, le rouge est caché');
  assert.equal(canCollectCityRushPickup(charged, CITY_RUSH_PICKUPS.BOOST), true, 'la règle ne masque jamais les boosts');
  assert.equal(canCollectCityRushPickup(empty, 'radio'), false, 'les bonus retirés ne peuvent plus être collectés');
});

test('a collected item bursts into shards, then reappears 0.1 s later', () => {
  assert.equal(CITY_RUSH_PICKUP_RESPAWN_DELAY, 0.1);
  assert.ok(CITY_RUSH_PICKUP_BURST_DURATION > CITY_RUSH_PICKUP_RESPAWN_DELAY);

  // Un bonus ramassé (même à l'indice 0) disparaît 0,1 s puis redevient prenable.
  const cooldowns = new Map();
  assert.equal(isCityRushPickupHidden(cooldowns, 0, 5.0), false);
  markCityRushPickupTaken(cooldowns, 0, 5.0);
  assert.equal(isCityRushPickupHidden(cooldowns, 0, 5.0), true);
  assert.equal(isCityRushPickupHidden(cooldowns, 0, 5.09), true);
  assert.equal(isCityRushPickupHidden(cooldowns, 1, 5.05), false, 'les autres emplacements de la rangée restent visibles');
  assert.equal(isCityRushPickupHidden(cooldowns, 0, 5.1), false, 'le bonus réapparaît au bout de 0,1 s');
  assert.equal(cooldowns.has(0), false, 'le délai expiré est nettoyé');

  // Un bonus réapparu peut être repris par une voiture suivante.
  markCityRushPickupTaken(cooldowns, 0, 5.25);
  assert.equal(isCityRushPickupHidden(cooldowns, 0, 5.34), true);
  assert.equal(isCityRushPickupHidden(cooldowns, 0, 5.35), false);

  // Éclats : répartition déterministe, directions normalisées, tailles positives.
  let seed = 0.42;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const shards = cityRushPickupBurstShards(CITY_RUSH_PICKUP_BURST_SHARDS, random);
  assert.equal(shards.length, CITY_RUSH_PICKUP_BURST_SHARDS);
  assert.deepEqual(cityRushPickupBurstShards(6, random).length, 6);
  for (const shard of shards) {
    const length = Math.hypot(...shard.dir);
    assert.ok(Math.abs(length - 1) < 0.35, `direction presque unitaire (${length})`);
    assert.ok(shard.speed > 0 && shard.size > 0);
    assert.equal(shard.spin.length, 3);
  }

  // L'éclatement démarre au centre, s'ouvre, puis retombe et s'efface.
  const first = cityRushPickupShardState(shards[0], 0);
  assert.equal(first.life, 0);
  assert.equal(first.done, false);
  assert.deepEqual(first.position, [0, 0, 0]);
  assert.equal(first.opacity, 1);
  const mid = cityRushPickupShardState(shards[0], CITY_RUSH_PICKUP_BURST_DURATION * 0.5);
  assert.ok(Math.hypot(...mid.position) > 0.4, 'les éclats partent vers l’extérieur');
  assert.ok(mid.opacity < 1 && mid.opacity > 0);
  const end = cityRushPickupShardState(shards[0], CITY_RUSH_PICKUP_BURST_DURATION);
  assert.equal(end.done, true);
  assert.equal(end.opacity, 0);
  assert.ok(end.position[1] < mid.position[1], 'la gravité reprend les éclats');

  // Flash : anneau qui s'ouvre et se dissipe, noyau limité au premier tiers.
  const flashStart = cityRushPickupFlashState(0);
  assert.equal(flashStart.done, false);
  assert.equal(flashStart.core, 1);
  const flashMid = cityRushPickupFlashState(CITY_RUSH_PICKUP_BURST_DURATION * 0.5);
  assert.ok(flashMid.scale > flashStart.scale);
  assert.equal(flashMid.core, 0);
  const flashEnd = cityRushPickupFlashState(CITY_RUSH_PICKUP_BURST_DURATION * 1.2);
  assert.equal(flashEnd.done, true);
  assert.equal(flashEnd.opacity, 0);

  // Pop-in du bonus qui réapparaît : 0 → rebond → 1, jamais négatif.
  assert.equal(cityRushPickupPopScale(0), 0);
  assert.equal(cityRushPickupPopScale(1), 1);
  assert.equal(cityRushPickupPopScale(2), 1);
  assert.equal(cityRushPickupPopScale(-1), 0);
  const samples = [0.2, 0.4, 0.6, 0.8].map((progress) => cityRushPickupPopScale(progress));
  assert.ok(samples.every((scale) => scale > 0));
  assert.ok(Math.max(...samples) > 1, 'léger rebond avant de se stabiliser');
});

test('cinq étoiles de recherche déclenchent la poursuite et les patrouilles font demi-tour en 1,5 s', () => {
  assert.equal(CITY_RUSH_WANTED_MAX_STARS, 5);
  assert.equal(CITY_RUSH_POLICE_TURNAROUND_DURATION, 1.5);
  assert.equal(cityRushWantedLevelAfterHit(0), 1, 'une voiture civile touchée donne une étoile');
  assert.equal(cityRushWantedLevelAfterHit(1), 2, 'la deuxième touche atteint deux étoiles');
  assert.equal(cityRushWantedLevelAfterHit(1, { police: true }), 3, 'toucher la police monte directement à trois étoiles');
  assert.equal(cityRushWantedLevelAfterHit(4), 5, 'le niveau est plafonné à cinq étoiles');
  assert.equal(cityRushWantedLevelAfterHit(5), 5, 'aucun dépassement au-delà de cinq étoiles');
  assert.equal(cityRushWantedLevelAfterHit(2, { hit: false }), 2, 'un tir raté ne change pas le niveau');
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(cityRushPoliceCountForWantedLevel), [0, 0, 1, 2, 2, 3]);
  assert.equal(cityRushPoliceTurnaroundProgress(-1), 0);
  assert.equal(cityRushPoliceTurnaroundProgress(0.75), 0.5);
  assert.equal(cityRushPoliceTurnaroundProgress(1.5), 1);
  assert.equal(cityRushPoliceTurnaroundProgress(3), 1);
});

test('trois voitures de police poursuivent le joueur et un renfort est réservé par rival — hors classement', () => {
  assert.equal(CITY_RUSH_POLICE_COUNT, 3);
  assert.equal(CITY_RUSH_POLICE_EXTRA_PER_ATTACKER, 1);
  assert.deepEqual([...CITY_RUSH_POLICE_VEHICLE_TYPES], ['police', 'police-suv', 'police']);
  assert.ok(CITY_RUSH_POLICE_REINFORCEMENT_DELAY > 0 && CITY_RUSH_POLICE_REINFORCEMENT_DELAY <= 5);
  // La mitrailleuse rouge est le seul bonus de tir que la police convoite.
  assert.deepEqual([...CITY_RUSH_POLICE_HUNT_TYPES], ['pistol']);
  assert.equal(CITY_RUSH_POWER_RULES.pistol.color, '#ff526e');
  // Aucune berline ne porte un identifiant de pilote classé : la grille garde
  // trois pilotes, et l'arrivée ne peut pas compter les voitures de police.
  assert.deepEqual([...CITY_RUSH_RACER_SLOTS], ['player', 'nova', 'juno']);
  assert.equal(CITY_RUSH_POLICE_LANES.length, CITY_RUSH_POLICE_COUNT, 'une voie de départ par voiture de police');
  assert.deepEqual([...CITY_RUSH_POLICE_LANES], [3, 4, 5]);
  assert.ok(CITY_RUSH_POLICE_LANES.every((lane) => CITY_RUSH_FORWARD_LANES.includes(lane)));
  assert.ok(CITY_RUSH_POLICE_BLOCKADE_RANGE > CITY_RUSH_CAR_GAP);
  assert.ok(CITY_RUSH_POLICE_BLOCKADE_HOLD > 0);
});

test('le joueur et les rivaux ont quinze cellules ; les tirs les touchent sans que le choc policier coûte une vie', () => {
  assert.equal(CITY_RUSH_PLAYER_HEALTH, 15);
  assert.equal(CITY_RUSH_RACER_HEALTH, CITY_RUSH_PLAYER_HEALTH);
  assert.equal(CITY_RUSH_PLAYER_DAMAGE['blue-shot'], 1);
  assert.equal(CITY_RUSH_PLAYER_DAMAGE.pistol, 1);
  assert.equal(CITY_RUSH_PLAYER_DAMAGE.collision, 0);
  assert.equal(cityRushPlayerDamage(CITY_RUSH_PLAYER_HEALTH, 'blue-shot'), 14);
  assert.equal(cityRushPlayerDamage(CITY_RUSH_PLAYER_HEALTH, 'pistol'), 14);
  assert.equal(cityRushPlayerDamage(CITY_RUSH_PLAYER_HEALTH, 'collision'), CITY_RUSH_PLAYER_HEALTH);
  assert.equal(cityRushPlayerDamage(5, 'collision'), 5);
  assert.equal(cityRushPlayerDamage(1, 'pistol'), 0);
  assert.equal(cityRushPlayerDamage(0, 'blue-shot'), 0);
  assert.equal(cityRushPlayerDamage(5, 'boost'), 5);
  assert.equal(cityRushPlayerDamage(5, undefined), 4);
  assert.equal(cityRushPlayerDamage(-3, 'collision'), 0);
  assert.equal(CITY_RUSH_PLAYER_HEALTH_CRITICAL, 3);
  assert.equal(CITY_RUSH_HEALTH_GROUP_SIZE, 5);

  // La police garde une coque distincte : deux rouges, trois bleus ou six
  // carambolages la détruisent, sans entamer la barre du joueur.
  assert.equal(CITY_RUSH_POLICE_HEALTH, 6);
  assert.equal(CITY_RUSH_POLICE_DAMAGE.pistol, 3);
  assert.equal(CITY_RUSH_POLICE_DAMAGE.collision, 1);
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, 'collision'), CITY_RUSH_POLICE_HEALTH - 1);
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, 'pistol'), 3);
  assert.ok(CITY_RUSH_POLICE_COLLISION_COOLDOWN > 0.5);
  assert.ok(CITY_RUSH_POLICE_COLLISION_TOLERANCE > 0);
});

test('les quinze cellules se groupent bleu / vert / jaune et les trois dernières jaunes virent au rouge', () => {
  const full = cityRushHealthSegments(15);
  assert.equal(full.length, 15);
  assert.deepEqual(full.map((segment) => segment.group), [
    ...Array(5).fill('blue'), ...Array(5).fill('green'), ...Array(5).fill('yellow'),
  ]);
  assert.ok(full.every((segment) => segment.active));
  assert.deepEqual(cityRushHealthSegments(10).slice(0, 5).map((segment) => segment.active), Array(5).fill(false));
  assert.ok(cityRushHealthSegments(10).slice(5).every((segment) => segment.active));
  assert.ok(cityRushHealthSegments(4).slice(10).every((segment) => segment.tone === 'yellow'));
  assert.deepEqual(cityRushHealthSegments(3).slice(10).map((segment) => segment.tone), ['yellow', 'yellow', 'critical', 'critical', 'critical']);
  assert.ok(cityRushHealthSegments(3).slice(12).every((segment) => segment.active && segment.critical));
  assert.equal(cityRushHealthSegments(2).filter((segment) => segment.active && segment.critical).length, 2);
  assert.equal(cityRushHealthSegments(0).filter((segment) => segment.active).length, 0);
  assert.equal(cityRushHealthSegments(30).filter((segment) => segment.active).length, 15);
  assert.equal(cityRushHealthSegments(-3).filter((segment) => segment.active).length, 0);
  assert.equal(cityRushPlayerHealthColor(15), CITY_RUSH_PLAYER_BAR_COLORS.blue);
  assert.equal(cityRushPlayerHealthColor(10), CITY_RUSH_PLAYER_BAR_COLORS.green);
  assert.equal(cityRushPlayerHealthColor(5), CITY_RUSH_PLAYER_BAR_COLORS.yellow);
  assert.equal(cityRushPlayerHealthColor(3), CITY_RUSH_PLAYER_BAR_COLORS.critical);
  assert.equal(cityRushPlayerHealthColor(0), CITY_RUSH_PLAYER_BAR_COLORS.critical);
});

test('l’hélico d’observation du dernier tour vole devant le pilote et s’éloigne à l’arrivée', () => {
  const pose = cityRushWatchHelicopterPose({ playerX: 0, clock: 0 });
  // Il se poste devant la voiture, plus haut que la caméra de poursuite (qui
  // est à 6,6 m) et sous la bande des cartes du HUD : c'est ce qui le rend
  // visible dans le ciel. Les bornes viennent de la mesure à l'écran (le smoke
  // projette l'appareil avec la vraie caméra) : plus haut, il passait derrière
  // les cartes ; plus loin, il était trop petit pour se voir.
  assert.ok(pose.ahead >= CITY_RUSH_WATCH_HELI_AHEAD - 3);
  assert.ok(pose.height > 6.6);
  assert.ok(pose.height <= CITY_RUSH_WATCH_HELI_HEIGHT + 1);
  // Garde-fou de cadrage : l'appareil reste bas et proche (mesuré à 0,44–0,65
  // en coordonnée écran, moyenne 0,57, contre 0,80 avant réglage).
  assert.ok(CITY_RUSH_WATCH_HELI_HEIGHT <= 9, 'l’hélico doit rester dans la bande de ciel visible');
  assert.ok(CITY_RUSH_WATCH_HELI_AHEAD <= 24, 'l’hélico doit rester assez près pour se voir');
  assert.ok(Number.isFinite(pose.lateral) && Math.abs(pose.lateral) < 12);
  assert.equal(pose.leaving, 0);
  // Il suit la voie du pilote, sans coller à ses changements (moitié du
  // décalage seulement).
  const left = cityRushWatchHelicopterPose({ playerX: -3, clock: 0 });
  const right = cityRushWatchHelicopterPose({ playerX: 3, clock: 0 });
  assert.ok(right.lateral > left.lateral);
  assert.ok(Math.abs((right.lateral - left.lateral) - 3) < 1e-6);
  // Il dérive lentement : deux instants différents ne donnent pas la même pose.
  const later = cityRushWatchHelicopterPose({ clock: 4 });
  assert.notEqual(later.lateral, pose.lateral);
  assert.ok(Math.abs(later.height - CITY_RUSH_WATCH_HELI_HEIGHT) <= 1);
  // À l'arrivée, il prend de l'altitude et de l'avance : il quitte la scène.
  const leaving = cityRushWatchHelicopterPose({ clock: 0, leaving: 1 });
  assert.ok(leaving.height > CITY_RUSH_WATCH_HELI_HEIGHT + 20);
  assert.ok(leaving.ahead > pose.ahead + 30);
  assert.equal(leaving.leaving, 1);
  assert.ok(leaving.bank > pose.bank);
  // Les entrées aberrantes ne cassent pas la pose.
  assert.ok(Number.isFinite(cityRushWatchHelicopterPose({ clock: 'x', playerX: null, leaving: 9 }).height));
});

test('un carambolage demande une berline devant, et un pilote qui arrive sur elle', () => {
  const base = { x: 0, targetX: 0, width: 1.94, targetWidth: 1.9 };
  // Le cas normal : le pilote arrive sur une berline devant lui.
  assert.equal(cityRushPoliceCollisionHit({ ...base, gap: 4.2, closing: 12 }), true);
  // La position de tir de l'escouade : repliée à 5 m derrière le pilote, elle
  // ne le percute pas — elle le suit. C'était le défaut : ce « choc » coûtait
  // un carré toutes les 1,6 s, avec fumée et ralenti.
  assert.equal(cityRushPoliceCollisionHit({ ...base, gap: -5, closing: -12 }), false);
  assert.equal(cityRushPoliceCollisionHit({ ...base, gap: -1, closing: -3 }), false);
  // Roue contre roue, personne n'arrive sur personne : pas de choc.
  assert.equal(cityRushPoliceCollisionHit({ ...base, gap: 4.6, closing: 0 }), false);
  assert.equal(cityRushPoliceCollisionHit({ ...base, gap: 4.6, closing: 0.4 }), false);
  // Une fois calé derrière elle (barrage), le pilote ne perd plus rien.
  assert.equal(cityRushPoliceCollisionHit({ ...base, gap: 4.8, closing: 0.8 }), false);
  // Devant, mais hors de portée du pare-chocs.
  assert.equal(cityRushPoliceCollisionHit({ ...base, gap: 9, closing: 14 }), false);
  // Devant, à portée, mais dans une autre voie.
  assert.equal(cityRushPoliceCollisionHit({ ...base, x: -4.7, targetX: 0, gap: 4.2, closing: 12 }), false);
  // Devant, à portée, mais trop lentement : un frôlement ne compte pas.
  assert.equal(cityRushPoliceCollisionHit({ ...base, gap: 4.2, closing: 0.2 }), false);
  // Entrées aberrantes : jamais de choc, jamais d'exception.
  assert.equal(cityRushPoliceCollisionHit({ ...base, gap: NaN, closing: 12 }), false);
  assert.equal(cityRushPoliceCollisionHit({ ...base, gap: 4, closing: NaN }), false);
  assert.equal(cityRushPoliceCollisionHit(), false);
});

test('le pilote le plus avancé est sélectionné pour les décisions de peloton', () => {
  assert.equal(cityRushPackLeader([
    { id: 'player', distance: 1204 },
    { id: 'nova', distance: 1230 },
    { id: 'juno', distance: 1100 },
  ]).id, 'nova');
  // À égalité, le premier de la liste — notre joueur — est le leader.
  assert.equal(cityRushPackLeader([
    { id: 'player', distance: 1200 },
    { id: 'nova', distance: 1200 },
  ]).id, 'player');
  assert.equal(cityRushPackLeader([]), null);
  assert.equal(cityRushPackLeader(undefined), null);
});

test('une berline sprinte quand elle est distancée et lève le pied quand elle est trop devant', () => {
  const base = 26;
  assert.ok(cityRushPolicePace({ gap: -40, baseSpeed: base, leaderSpeed: base }) > base, 'distancée : elle rattrape');
  assert.ok(cityRushPolicePace({ gap: 60, baseSpeed: base, leaderSpeed: base }) < base, 'trop devant : elle attend');
  const cruise = cityRushPolicePace({ gap: CITY_RUSH_POLICE_LEAD, baseSpeed: base, leaderSpeed: base });
  assert.ok(cruise >= base * 0.9 && cruise < base * 1.2, 'en croisière : elle tient la hauteur du leader');
  // Repli pour tirer : la hauteur visée passe derrière le leader.
  assert.ok(CITY_RUSH_POLICE_ATTACK_LEAD < 0);
  const attack = cityRushPolicePace({ gap: CITY_RUSH_POLICE_ATTACK_LEAD, baseSpeed: base, leaderSpeed: base, lead: CITY_RUSH_POLICE_ATTACK_LEAD });
  assert.ok(attack > 0 && Number.isFinite(attack));
});

test('la berline armée se range dans le dos du pilote pour ouvrir le feu', () => {
  const common = {
    currentLane: 1,
    distance: 1000,
    speed: 26,
    availableLanes: [0, 1, 2, 3],
    lookAheadDistance: 200,
  };
  // Armée et derrière son client (voie 3) : elle se rabat une voie à la fois.
  assert.equal(chooseCityRushPoliceLane({
    ...common, pickups: [], fireLane: 3, fireGap: -6,
  }), 2, 'derrière le pilote : elle glisse vers sa voie');
  assert.equal(chooseCityRushPoliceLane({
    ...common, currentLane: 2, pickups: [], fireLane: 3, fireGap: -9,
  }), 3, 'deux voies plus loin : encore un cran');
  assert.equal(chooseCityRushPoliceLane({
    ...common, currentLane: 3, pickups: [], fireLane: 0, fireGap: -5,
  }), 2, 'elle vise la voie du pilote, pas la sienne');
  // Déjà dans la voie : rien à changer.
  assert.equal(chooseCityRushPoliceLane({
    ...common, pickups: [], fireLane: 1, fireGap: -4,
  }), 1);
  // Devant le pilote, la ligne de tir n'a plus de sens : le barrage prend le
  // relais, et une berline devant garde la voie que dictent bonus et trafic.
  assert.equal(chooseCityRushPoliceLane({
    ...common, pickups: [], fireLane: 3, fireGap: 12,
  }), 1, 'devant : aucune raison de se ranger dans sa voie');
  assert.equal(chooseCityRushPoliceLane({
    ...common, pickups: [], fireLane: 3, fireGap: -CITY_RUSH_POLICE_FIRE_LINE_RANGE - 20,
  }), 1, 'trop loin derrière : la portée de la rafale ne porte pas jusque-là');
  // Une voie voisine bouchée ne l'englue pas : elle garde sa voie libre.
  const truck = { lane: 2, distance: 1004, speed: 4.4 };
  assert.equal(chooseCityRushPoliceLane({
    ...common, pickups: [], traffic: [truck], fireLane: 3, fireGap: -6,
  }), 1, 'voie intermédiaire bouchée : elle ne s’y jette pas');
  // Un rouge à portée de capot reste la mission première.
  assert.equal(chooseCityRushPoliceLane({
    ...common, pickups: [{ lane: 1, type: 'pistol', distance: 1030 }], fireLane: 3, fireGap: -6,
  }), 1);
});

test('la mire est annoncée avant la rafale et se casse au moindre écart', () => {
  assert.ok(CITY_RUSH_POLICE_AIM_TIME > 0.5, 'la mire laisse le temps de se décaler');
  assert.ok(CITY_RUSH_POLICE_AIM_TOLERANCE > 0 && CITY_RUSH_POLICE_AIM_TOLERANCE < 2);
  // Alignement : la cible doit rester sur l'axe de la voie.
  assert.equal(cityRushPoliceAimAligned({ x: 0, laneX: 0 }), true);
  assert.equal(cityRushPoliceAimAligned({ x: CITY_RUSH_POLICE_AIM_TOLERANCE, laneX: 0 }), true);
  assert.equal(cityRushPoliceAimAligned({ x: CITY_RUSH_POLICE_AIM_TOLERANCE + 0.01, laneX: 0 }), false);
  assert.equal(cityRushPoliceAimAligned({ x: -3, laneX: 0 }), false);
  assert.equal(cityRushPoliceAimAligned({ x: Number.NaN, laneX: 0 }), false);
  // Le temps de mire se cumule image par image, et retombe à zéro dès que la
  // cible sort de la ligne : c'est l'esquive du pilote.
  let aim = 0;
  for (let frame = 0; frame < 40; frame += 1) {
    aim = cityRushPoliceAimHold({ aim, aligned: true, dt: CITY_RUSH_POLICE_AIM_TIME / 20 });
  }
  assert.equal(aim, CITY_RUSH_POLICE_AIM_TIME, 'la mire se plafonne au temps d’alignement');
  assert.equal(cityRushPoliceAimReady(aim), true, 'mire complète : la rafale peut partir');
  assert.equal(cityRushPoliceAimReady(aim - 0.02), false, 'mire incomplète : pas de rafale');
  assert.equal(cityRushPoliceAimHold({ aim, aligned: false, dt: 1 }), 0, 'un écart casse la mire');
  assert.equal(cityRushPoliceAimReady(0), false, 'viseur froid');
  assert.equal(cityRushPoliceAimHold({ aim: 10, aligned: false }), 0);
  assert.equal(cityRushPoliceAimHold({ aim: Number.NaN, aligned: true, dt: 0.5 }), 0.5);
});

test('l’escouade traverse la route pour rafler un bonus rouge de mitrailleuse', () => {
  const common = {
    currentLane: 1,
    distance: 1000,
    speed: 26,
    availableLanes: [0, 1, 2, 3],
    lookAheadDistance: 200,
  };
  // Le bonus rouge plus loin l'emporte sur un turbo tout proche : la berline
  // s'écarte de sa voie et se rabat vers la mitrailleuse (voie 3).
  const pickups = [
    { lane: 0, type: CITY_RUSH_PICKUPS.BOOST, distance: 1040 },
    { lane: 3, type: 'pistol', distance: 1180 },
  ];
  assert.equal(chooseCityRushPoliceLane({ ...common, pickups }), 2);
  // Le rival ordinaire vise le pad turbo proche avant le bonus de tir lointain.
  assert.equal(chooseCityRushAiLane({ ...common, pickups }), 0);
  // Le trafic reste évité : un camion pile dans la voie voisine.
  const trafficLane = chooseCityRushPoliceLane({
    ...common,
    pickups: [],
    traffic: [{ lane: 2, distance: 1004, speed: 4.4 }],
  });
  assert.notEqual(trafficLane, 2);
});

test('une voie est bouchée par un véhicule lent qui précède la berline à portée de freinage', () => {
  const base = { lane: 1, distance: 1000, speed: 26 };
  const slow = { lane: 1, distance: 1020, speed: 4.4 };
  assert.equal(isCityRushPoliceLaneJammed({ ...base, traffic: [slow] }), true);
  // Une autre voie, un véhicule déjà dépassé ou trop lointain : la voie est libre.
  assert.equal(isCityRushPoliceLaneJammed({ ...base, traffic: [{ ...slow, lane: 2 }] }), false);
  assert.equal(isCityRushPoliceLaneJammed({ ...base, traffic: [{ ...slow, distance: 985 }] }), false);
  assert.equal(isCityRushPoliceLaneJammed({ ...base, traffic: [{ ...slow, distance: 1000 + CITY_RUSH_POLICE_BLOCK_RANGE }] }), true);
  assert.equal(isCityRushPoliceLaneJammed({ ...base, traffic: [{ ...slow, distance: 1000 + CITY_RUSH_POLICE_BLOCK_RANGE + 1 }] }), false);
  // Un véhicule qui roule presque aussi vite que la berline ne la bouche pas ;
  // sans vitesse connue, il est supposé à l'arrêt.
  assert.equal(isCityRushPoliceLaneJammed({ ...base, traffic: [{ ...slow, speed: 24 }] }), false);
  assert.equal(isCityRushPoliceLaneJammed({ ...base, traffic: [{ lane: 1, distance: 1020 }] }), true);
  // Engluée à 5 m/s derrière un camion, la berline le voit encore comme un obstacle.
  assert.equal(isCityRushPoliceLaneJammed({ ...base, speed: 5, traffic: [slow] }), true);
  // Entrées invalides : jamais d'exception, la voie reste libre.
  assert.equal(isCityRushPoliceLaneJammed({ ...base }), false);
  assert.equal(isCityRushPoliceLaneJammed({ ...base, traffic: null }), false);
  assert.equal(isCityRushPoliceLaneJammed({ ...base, traffic: [null, { lane: 1, distance: 'loin' }] }), false);
});

test('une berline engluée derrière un véhicule lent change de voie, même pour un bonus rouge', () => {
  const common = {
    currentLane: 1,
    distance: 1000,
    speed: 26,
    availableLanes: [0, 1, 2, 3],
    lookAheadDistance: 200,
  };
  // La convoitise (×100) écrasait toute pénalité de trafic : un bonus rouge
  // derrière un camion gardait la berline collée à son pare-chocs, à 4,4 m/s,
  // pendant que le leader s'envolait. L'escouade décrochait de la piste.
  const pickups = [{ lane: 1, type: 'pistol', distance: 1060 }];
  const truck = { lane: 1, distance: 1030, speed: 4.4 };
  assert.notEqual(chooseCityRushPoliceLane({ ...common, pickups, traffic: [truck] }), 1);
  assert.notEqual(chooseCityRushPoliceLane({ ...common, pickups: [{ ...pickups[0], type: CITY_RUSH_PICKUPS.BOOST }], traffic: [truck] }), 1, 'même un bonus ordinaire ne la pousse pas dans le camion');
  // Même collée au camion, déjà engluée à 5 m/s : elle s'en extrait.
  assert.notEqual(chooseCityRushPoliceLane({ ...common, speed: 5, pickups, traffic: [{ ...truck, distance: 1006 }] }), 1);
  // Sans camion, ou avec un camion déjà dépassé ou encore hors de portée, le
  // bonus rouge garde sa voie : la chasse aux bonus n'est pas affaiblie.
  assert.equal(chooseCityRushPoliceLane({ ...common, pickups, traffic: [] }), 1);
  assert.equal(chooseCityRushPoliceLane({ ...common, pickups, traffic: [{ ...truck, distance: 990 }] }), 1);
  assert.equal(chooseCityRushPoliceLane({ ...common, pickups, traffic: [{ ...truck, distance: 1000 + CITY_RUSH_POLICE_BLOCK_RANGE + 5 }] }), 1);
  // Elle se rabat vers la voie où se trouve le leader quand elle doit choisir.
  assert.equal(chooseCityRushPoliceLane({ ...common, pickups, traffic: [truck], targetLane: 2 }), 2);
  assert.equal(chooseCityRushPoliceLane({ ...common, pickups, traffic: [truck], targetLane: 0 }), 0);
});

test('une voie voisine bouchée n’attire pas la berline, et tout bouché ne casse rien', () => {
  const common = {
    currentLane: 1,
    distance: 1000,
    speed: 26,
    availableLanes: [0, 1, 2, 3],
    lookAheadDistance: 200,
  };
  const slow = (lane, distance = 1030) => ({ lane, distance, speed: 4.4 });
  // Le bonus rouge est dans la voie 2, mais un camion le garde : elle
  // reste dans sa voie libre plutôt que de s'engluer.
  const red = [{ lane: 2, type: 'pistol', distance: 1060 }];
  assert.equal(chooseCityRushPoliceLane({ ...common, pickups: red, traffic: [] }), 2, 'voie libre : elle fonce charger sa mitrailleuse');
  assert.equal(chooseCityRushPoliceLane({ ...common, pickups: red, traffic: [slow(2)] }), 1);
  // Bouchée et sa voisine aussi : elle prend la seule voie dégagée, même loin du bonus.
  assert.equal(chooseCityRushPoliceLane({ ...common, pickups: red, traffic: [slow(1), slow(2)] }), 0);
  // Toutes les voies accessibles bouchées : le choix d'origine tient (elle
  // touchera le véhicule et le monde le fera se rabattre) — sans exception.
  const wall = [0, 1, 2, 3].map((lane) => slow(lane, 1020));
  const walled = chooseCityRushPoliceLane({ ...common, pickups: [{ lane: 1, type: 'pistol', distance: 1060 }], traffic: wall });
  assert.equal(walled, 1);
  assert.equal(chooseCityRushPoliceLane({ ...common, availableLanes: [1], traffic: [slow(1)] }), 1, 'une seule voie ouverte : elle y reste');
  // Une voie interdite (barrage, obstacle) n'est jamais choisie, même libre.
  assert.equal(chooseCityRushPoliceLane({ ...common, availableLanes: [1, 2], pickups: [], traffic: [slow(1), slow(2)] }), 1);
  // Une berline qui touche le trafic le traite comme un rival : même détecteur.
  const impacts = detectCityRushTrafficImpacts([
    { id: 'police-1', collisionGroup: 'racer', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.94, previousDistance: 1000, nextDistance: 1001.6 },
    { id: 'traffic-1', collisionGroup: 'traffic', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.94, previousDistance: 1006, nextDistance: 1006.1 },
  ]);
  assert.equal(impacts.length, 1);
  assert.equal(impacts[0].racerId, 'police-1');
  assert.equal(impacts[0].trafficId, 'traffic-1');
});

test('les berlines sont solides : ni le trafic, ni les pilotes ne les traversent', () => {
  const traffic = [{ id: 'truck-1', lane: 1, distance: 1040, x: CITY_RUSH_LANE_X[1], width: 1.98 }];
  const raceCars = [{ id: 'player', lane: 3, distance: 1042, x: CITY_RUSH_LANE_X[3], width: 1.9 }];
  const resolved = resolveCityRushPoliceMovement([
    { id: 'police-1', lane: 1, x: CITY_RUSH_LANE_X[1], distance: 1000, nextDistance: 1038, width: 1.94 },
    { id: 'police-2', lane: 3, x: CITY_RUSH_LANE_X[3], distance: 1000, nextDistance: 1038, width: 1.94 },
  ], traffic, CITY_RUSH_CAR_GAP, raceCars);
  const byId = Object.fromEntries(resolved.map((car) => [car.id, car.nextDistance]));
  assert.equal(byId['police-1'], 1040 - CITY_RUSH_CAR_GAP, 'la berline freine derrière le véhicule lent');
  assert.equal(byId['police-2'], 1042 - CITY_RUSH_CAR_GAP, 'et derrière une voiture de course, qu’elle ne traverse plus');
  assert.deepEqual(resolved.map((car) => car.id), ['police-1', 'police-2']);

  // Deux berlines ne se traversent pas non plus : la seconde se retient.
  const siblings = resolveCityRushPoliceMovement([
    { id: 'police-1', lane: 2, x: CITY_RUSH_LANE_X[2], distance: 1200, nextDistance: 1240, width: 1.94 },
    { id: 'police-2', lane: 2, x: CITY_RUSH_LANE_X[2], distance: 1180, nextDistance: 1245, width: 1.94 },
  ], [], CITY_RUSH_CAR_GAP);
  const siblingById = Object.fromEntries(siblings.map((car) => [car.id, car.nextDistance]));
  assert.equal(siblingById['police-2'], 1240 - CITY_RUSH_CAR_GAP);
  // Le véhicule qui a freiné la berline est désigné, pour que le monde le
  // heurte : sinon la berline le suivrait sans fin à son allure.
  const blockedBy = Object.fromEntries(resolved.map((car) => [car.id, car.blockedBy]));
  assert.equal(blockedBy['police-1'], 'truck-1');
  assert.equal(blockedBy['police-2'], null);
  // Déjà plaquée contre la marge, elle reste bloquée image après image...
  const stuck = resolveCityRushPoliceMovement([
    { id: 'police-1', lane: 1, x: CITY_RUSH_LANE_X[1], distance: 1040 - CITY_RUSH_CAR_GAP, nextDistance: 1040 - CITY_RUSH_CAR_GAP + 0.2, width: 1.94 },
  ], traffic, CITY_RUSH_CAR_GAP)[0];
  assert.equal(stuck.blockedBy, 'truck-1');
  assert.equal(stuck.nextDistance, 1040 - CITY_RUSH_CAR_GAP);
  // ... mais une berline à l'arrêt (sonnée) n'est freinée par personne, et un
  // véhicule en train de se rabattre la freine tant que les carrosseries se
  // recouvrent, puis plus du tout.
  assert.equal(resolveCityRushPoliceMovement([
    { id: 'police-1', lane: 1, x: CITY_RUSH_LANE_X[1], distance: 1040 - CITY_RUSH_CAR_GAP, nextDistance: 1040 - CITY_RUSH_CAR_GAP, width: 1.94 },
  ], traffic, CITY_RUSH_CAR_GAP)[0].blockedBy, null);
  const swerving = (x) => resolveCityRushPoliceMovement([
    { id: 'police-1', lane: 1, x: CITY_RUSH_LANE_X[1], distance: 1000, nextDistance: 1016, width: 1.94 },
  ], [{ id: 'truck-1', lane: 0, distance: 1020, x, width: 1.98 }], CITY_RUSH_CAR_GAP)[0];
  assert.equal(swerving(CITY_RUSH_LANE_X[1] - 1).blockedBy, 'truck-1', 'encore à cheval sur la voie de la berline');
  assert.equal(swerving(CITY_RUSH_LANE_X[0]).blockedBy, null, 'rabattu : la voie est libre');
});
test('au dernier tour, la riposte rouge peut viser la berline la plus proche', () => {
  // Sans escouade déployée, pas de cible : la jauge reste chargée.
  assert.equal(cityRushPoliceTarget([], 1200), null);
  assert.equal(cityRushPoliceTarget(undefined, 1200), null);
  assert.equal(cityRushPoliceTarget([{ id: 'police-1', distance: 1201, active: true }], Number.NaN), null);
  // Une berline inactive (avant le déploiement ou après l'arrivée) est ignorée.
  assert.equal(cityRushPoliceTarget([{ id: 'police-1', distance: 1201, active: false }], 1200), null);
  // La riposte n'est plus limitée aux cibles en avant : une berline repliée
  // derrière le leader pour tirer est visée si elle est la plus proche.
  const squad = [
    { id: 'police-1', distance: 1195, active: true }, // 5 m derrière (repli pour tirer)
    { id: 'police-2', distance: 1221, active: true }, // 21 m devant (mode blocage)
  ];
  assert.equal(cityRushPoliceTarget(squad, 1200).id, 'police-1');
  assert.equal(cityRushPoliceTarget([...squad].reverse(), 1200).id, 'police-1', 'l’ordre de la liste ne change rien');
  assert.equal(cityRushPoliceTarget(squad, 1200, 'police-1').id, 'police-2', 'jamais soi-même');
  assert.equal(cityRushPoliceTarget([
    { id: 'police-1', distance: 1215, active: true },
    { id: 'police-2', distance: 1202, active: true },
  ], 1200).id, 'police-2', 'la plus proche devant l’emporte quand l’autre est loin');
  // Entrées invalides ignorées sans casser le tri.
  assert.equal(cityRushPoliceTarget([
    { id: 'police-1', distance: 'loin', active: true },
    { id: 'police-2', distance: 1202, active: true },
  ], 1200).id, 'police-2');
});

test('barre de vie des berlines : six points, tir rouge puissant et carambolage sans dégât au joueur', () => {
  assert.equal(CITY_RUSH_POLICE_HEALTH, 6);
  assert.equal(CITY_RUSH_POLICE_DAMAGE[CITY_RUSH_POWERS.BLUE_SHOT], 2);
  assert.equal(CITY_RUSH_POLICE_DAMAGE[CITY_RUSH_POWERS.PISTOL], 3);
  assert.equal(CITY_RUSH_POLICE_DAMAGE.collision, 1);
  assert.equal(CITY_RUSH_POLICE_DAMAGE[CITY_RUSH_POWERS.RADIO], 0,
    'l’attaque d’hélicoptère n’inflige plus de dégâts');

  const afterFirstBlue = cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.BLUE_SHOT);
  const afterSecondBlue = cityRushPoliceDamage(afterFirstBlue, CITY_RUSH_POWERS.BLUE_SHOT);
  assert.equal(afterFirstBlue, 4);
  assert.equal(afterSecondBlue, 2);
  assert.equal(cityRushPoliceDamage(afterSecondBlue, CITY_RUSH_POWERS.BLUE_SHOT), 0);

  const afterFirstRed = cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.PISTOL);
  assert.equal(afterFirstRed, 3);
  assert.equal(cityRushPoliceDamage(afterFirstRed, CITY_RUSH_POWERS.PISTOL), 0);
  assert.equal(cityRushPoliceDamage(afterFirstRed, 'collision'), 2,
    'un carambolage en accélérant retire un seul point après le tir rouge');
  assert.equal(cityRushPoliceDamage(cityRushPoliceDamage(afterFirstRed, 'collision'), 'collision'), 1);
  assert.equal(cityRushPoliceDamage(cityRushPoliceDamage(cityRushPoliceDamage(afterFirstRed, 'collision'), 'collision'), 'collision'), 0,
    'trois carambolages supplémentaires achèvent une berline déjà touchée par un tir rouge');
  assert.equal(cityRushPoliceDamage(1, 'collision'), 0);
  assert.equal(cityRushPoliceDamage(0, CITY_RUSH_POWERS.BLUE_SHOT), 0);
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.RADIO), CITY_RUSH_POLICE_HEALTH,
    'une attaque d’hélicoptère est désactivée');
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_PICKUPS.BOOST), CITY_RUSH_POLICE_HEALTH);
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, null), CITY_RUSH_POLICE_HEALTH);
  assert.equal(cityRushPoliceDamage(Number.NaN, CITY_RUSH_POWERS.BLUE_SHOT), 0);
});
test('le bandeau « berline touchée » compte les tirs restants, pas les points de vie', () => {
  assert.equal(cityRushPoliceShotsLeft(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.BLUE_SHOT), 3, 'trois tirs bleus au départ');
  assert.equal(cityRushPoliceShotsLeft(2, CITY_RUSH_POWERS.BLUE_SHOT), 1, 'un tir bleu après le premier');
  assert.equal(cityRushPoliceShotsLeft(0, CITY_RUSH_POWERS.BLUE_SHOT), 0, 'épave : plus rien à tirer');
  assert.equal(cityRushPoliceShotsLeft(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.PISTOL), 2, 'deux tirs rouges au départ');
  assert.equal(cityRushPoliceShotsLeft(3, CITY_RUSH_POWERS.PISTOL), 1, 'un tir rouge après le premier');
  assert.equal(cityRushPoliceShotsLeft(CITY_RUSH_POLICE_HEALTH, 'collision'), 6, 'six petits carambolages au départ');
  assert.equal(cityRushPoliceShotsLeft(3, 'collision'), 3, 'trois carambolages après un tir rouge');
  assert.equal(cityRushPoliceShotsLeft(0, CITY_RUSH_POWERS.PISTOL), 0, 'épave : plus de tir rouge');
  assert.equal(cityRushPoliceShotsLeft(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.RADIO), 0, 'aucun missile, attaque supprimée');
  // Arme non létale ou inconnue : aucun tir ne compte.
  assert.equal(cityRushPoliceShotsLeft(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_PICKUPS.BOOST), 0);
  assert.equal(cityRushPoliceShotsLeft(Number.NaN, CITY_RUSH_POWERS.BLUE_SHOT), 0);
});

test('les berlines entrent sans charge et ne disposent d’aucune attaque d’hélicoptère', () => {
  assert.deepEqual([...CITY_RUSH_POLICE_START_CHARGES], []);
  assert.deepEqual([...CITY_RUSH_POLICE_HUNT_TYPES], [CITY_RUSH_POWERS.PISTOL]);
  const inventory = createCityRushPoliceInventory();
  assert.equal(inventory[CITY_RUSH_POWERS.BLUE_SHOT], 0, 'aucun tir bleu');
  assert.equal(inventory[CITY_RUSH_POWERS.PISTOL], 0, 'la mitrailleuse doit être chargée par un bonus rouge');
  assert.equal(inventory[CITY_RUSH_POWERS.RADIO], 0, 'l’hélicoptère n’est pas stocké dans la jauge');
  assert.equal(Object.hasOwn(inventory, CITY_RUSH_PICKUPS.BOOST), false, 'le pad turbo ne se stocke pas');
  assert.equal(consumeCityRushCharge(inventory, CITY_RUSH_POWERS.PISTOL).consumed, false);
  assert.equal(consumeCityRushCharge(inventory, CITY_RUSH_POWERS.BLUE_SHOT).consumed, false);
  assert.equal(consumeCityRushCharge(inventory, CITY_RUSH_POWERS.RADIO).consumed, false);
  assert.equal(createCityRushInventory()[CITY_RUSH_POWERS.PISTOL], 0);
});

test('un pilote ne traverse plus une berline de police du dernier tour', () => {
  // L'escouade est engagée dans le peloton : sa berline solide bloque la voie
  // exactement comme le trafic lent, sans dégât ni pénalité.
  const behind = resolveCityRushCarMovement([
    { id: 'player', collisionGroup: 'racer', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.9, previousDistance: 1000, nextDistance: 1030 },
    { id: 'police-1', collisionGroup: 'police', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.94, previousDistance: 1008, nextDistance: 1012 },
  ]);
  const behindById = Object.fromEntries(behind.map((car) => [car.id, car.nextDistance]));
  assert.equal(behindById.player, 1012 - CITY_RUSH_CAR_GAP, 'le joueur est retenu derrière la berline');
  // Une autre voie reste libre : le barrage se contourne.
  const aside = resolveCityRushCarMovement([
    { id: 'player', collisionGroup: 'racer', lane: 2, x: CITY_RUSH_LANE_X[2], width: 1.9, previousDistance: 1000, nextDistance: 1030 },
    { id: 'police-1', collisionGroup: 'police', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.94, previousDistance: 1008, nextDistance: 1012 },
  ]);
  assert.equal(Object.fromEntries(aside.map((car) => [car.id, car.nextDistance])).player, 1030);
  // Et la berline ne conduit pas à travers le joueur quand elle est derrière.
  const chaser = resolveCityRushCarMovement([
    { id: 'player', collisionGroup: 'racer', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.9, previousDistance: 1000, nextDistance: 1006 },
    { id: 'police-1', collisionGroup: 'police', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.94, previousDistance: 990, nextDistance: 1030 },
  ]);
  assert.equal(Object.fromEntries(chaser.map((car) => [car.id, car.nextDistance]))['police-1'], 1006 - CITY_RUSH_CAR_GAP);
});

test('une berline se met en barrage devant le leader puis lève le pied', () => {
  // Position de barrage : devant le leader, dans sa voie (ou à sa hauteur).
  assert.equal(cityRushPoliceBlocksLeader({
    gap: 12, lane: 1, leaderLane: 1, x: CITY_RUSH_LANE_X[1], leaderX: CITY_RUSH_LANE_X[1],
  }), true);
  assert.equal(cityRushPoliceBlocksLeader({
    gap: -12, lane: 1, leaderLane: 1, x: CITY_RUSH_LANE_X[1], leaderX: CITY_RUSH_LANE_X[1],
  }), false, 'une berline derrière le leader ne le bloque pas');
  assert.equal(cityRushPoliceBlocksLeader({
    gap: 12, lane: 0, leaderLane: 1, x: CITY_RUSH_LANE_X[0], leaderX: CITY_RUSH_LANE_X[1],
  }), false, 'une berline dans une autre voie ne bloque pas');
  assert.equal(cityRushPoliceBlocksLeader({
    gap: CITY_RUSH_POLICE_BLOCKADE_RANGE + 6, lane: 1, leaderLane: 1, x: CITY_RUSH_LANE_X[1], leaderX: CITY_RUSH_LANE_X[1],
  }), false, 'trop loin devant, elle ne bloque plus');
  assert.equal(cityRushPoliceBlocksLeader({
    gap: 12, lane: 1, leaderLane: 1, x: CITY_RUSH_LANE_X[1], leaderX: CITY_RUSH_LANE_X[0],
  }), false, 'le recouvrement latéral décide, pas seulement la voie');

  // Barrage : nettement plus lente que le leader, jamais arrêtée.
  const blocking = cityRushPolicePace({ gap: 12, baseSpeed: CITY_RUSH_PLAYER_SPEED, leaderSpeed: CITY_RUSH_PLAYER_SPEED, blocking: true });
  assert.ok(blocking < CITY_RUSH_PLAYER_SPEED * 0.8, 'elle freine devant le leader');
  assert.ok(blocking >= CITY_RUSH_POLICE_BLOCKADE_MIN_SPEED - 1e-9, 'elle continue de rouler');
  const slowLeader = cityRushPolicePace({ gap: 5, baseSpeed: CITY_RUSH_PLAYER_SPEED, leaderSpeed: 6, blocking: true });
  assert.ok(slowLeader > 6, 'un leader ralenti ne l’immobilise pas en travers de la piste');
  assert.ok(slowLeader >= CITY_RUSH_POLICE_BLOCKADE_MIN_SPEED - 1e-9);
  // Hors barrage, la berline tient toujours la hauteur du leader.
  assert.ok(cityRushPolicePace({
    gap: CITY_RUSH_POLICE_LEAD, baseSpeed: CITY_RUSH_PLAYER_SPEED, leaderSpeed: CITY_RUSH_PLAYER_SPEED,
  }) >= CITY_RUSH_PLAYER_SPEED * 0.9);
  assert.ok(CITY_RUSH_POLICE_BLOCKADE_HOLD > 0);
});

test('percuter une berline de police du trafic la rappelle : le contact se juge comme la collision', () => {
  const lane1 = CITY_RUSH_LANE_X[1];
  // Pare-chocs contre pare-chocs dans la même voie : c'est un contact.
  assert.equal(cityRushPoliceContact({ gap: CITY_RUSH_CAR_GAP, x: lane1, targetX: lane1 }), true);
  assert.equal(cityRushPoliceContact({ gap: -CITY_RUSH_CAR_GAP, x: lane1, targetX: lane1 }), true);
  assert.equal(cityRushPoliceContact({ gap: 0, x: lane1, targetX: lane1 }), true);
  // Un peu plus loin que la distance de sécurité : la résolution de mouvement
  // a lâché prise, il n'y a plus de contact.
  assert.equal(cityRushPoliceContact({
    gap: CITY_RUSH_CAR_GAP + CITY_RUSH_POLICE_RALLY_TOLERANCE + 0.5, x: lane1, targetX: lane1,
  }), false);
  assert.equal(cityRushPoliceContact({
    gap: -CITY_RUSH_CAR_GAP - CITY_RUSH_POLICE_RALLY_TOLERANCE - 0.5, x: lane1, targetX: lane1,
  }), false);
  // Voie voisine (2,1 m d'écart) : on frôle, on ne percute pas.
  assert.equal(cityRushPoliceContact({ gap: 1, x: CITY_RUSH_LANE_X[0], targetX: CITY_RUSH_LANE_X[1] }), false);
  // Recouvrement latéral partiel (changement de voie en cours) : contact.
  assert.equal(cityRushPoliceContact({ gap: 2, x: CITY_RUSH_LANE_X[1] - 1.5, targetX: CITY_RUSH_LANE_X[1] }), true);
  // Sans position latérale, impossible de conclure : pas de contact.
  assert.equal(cityRushPoliceContact({ gap: 0 }), false);
  assert.equal(cityRushPoliceContact(), false);
  // La tolérance reste petite : deux voitures qui se suivent à 6 m ne se
  // percutent pas.
  assert.ok(CITY_RUSH_POLICE_RALLY_TOLERANCE < 1);
  assert.equal(cityRushPoliceContact({ gap: 6, x: lane1, targetX: lane1 }), false);
});

test('devant le leader, la berline se rabat dans sa voie pour lui couper la route', () => {
  const common = {
    laneCount: CITY_RUSH_LANE_X.length,
    distance: 1000,
    speed: 26,
    availableLanes: [0, 1, 2, 3],
    lookAheadDistance: 200,
  };
  // Berline en voie 2, leader en voie 3 : le rabattement vers sa voie (3) vaut
  // mieux qu'un bonus ordinaire (voie 1), même proche.
  const pickups = [{ lane: 1, type: CITY_RUSH_PICKUPS.BOOST, distance: 1030 }];
  const cutIn = chooseCityRushPoliceLane({
    ...common, currentLane: 2, pickups, interceptLane: 3, interceptGap: 14,
  });
  assert.equal(cutIn, 3, 'elle coupe la route au leader');
  // Le bonus rouge reste prioritaire sur le barrage.
  assert.equal(chooseCityRushPoliceLane({
    ...common, currentLane: 2, pickups: [{ lane: 1, type: 'pistol', distance: 1030 }], interceptLane: 3, interceptGap: 14,
  }), 1, 'la mitrailleuse vaut plus qu’un barrage');
  // Derrière le leader (interceptGap négatif), la berline ne coupe pas : elle
  // prend le bonus ordinaire.
  assert.equal(chooseCityRushPoliceLane({
    ...common, currentLane: 2, pickups, interceptLane: 3, interceptGap: -14,
  }), 1, 'derrière le leader, pas de rabattement');
  // Une voie bouchée par un pilote est évitée tant qu'aucun bonus ne l'appelle.
  assert.notEqual(chooseCityRushPoliceLane({
    ...common, currentLane: 2, pickups: [], racers: [{ lane: 3, distance: 1012, speed: 24 }],
  }), 3, 'elle ne reste pas engluée derrière un pilote qu’elle ne peut plus traverser');
  // Le rabattement se fait une voie à la fois : de la voie 0 vers la voie 3 du
  // leader, la berline vise d'abord la voie 1.
  assert.equal(chooseCityRushPoliceLane({
    ...common, currentLane: 0, pickups: [], interceptLane: 3, interceptGap: 20,
  }), 1, 'elle met le cap sur la voie du leader, une voie à la fois');
  // Un bonus rouge lointain ne détourne pas le barrage : seule une prise à
  // portée de capot (CITY_RUSH_POLICE_HUNT_RANGE) passe avant.
  assert.equal(chooseCityRushPoliceLane({
    ...common, currentLane: 2, pickups: [{ lane: 1, type: 'pistol', distance: 1000 + CITY_RUSH_POLICE_HUNT_RANGE + 90 }],
    interceptLane: 3, interceptGap: 14,
  }), 3, 'un bonus hors de portée ne détourne pas le barrage');
  // Engluée derrière un pilote (« stuck »), la berline s'extrait de la voie
  // même si un bonus ordinaire l'y appelait.
  assert.equal(chooseCityRushPoliceLane({
    ...common, currentLane: 2, pickups: [{ lane: 2, type: CITY_RUSH_PICKUPS.BOOST, distance: 1020 }],
    racers: [{ lane: 2, distance: 1008, speed: 24 }], stuck: true,
  }), 1, 'elle préfère changer de voie plutôt que rester collée');});

test('lane changes clamp at both edges of the six-lane road', () => {
  assert.equal(CITY_RUSH_LANE_X.length, 6);
  assert.equal(cityRushLaneAfterAction(1, 'left'), 0);
  assert.equal(cityRushLaneAfterAction(2, 'right'), 3);
  assert.equal(cityRushLaneAfterAction(0, 'left'), 0);
  assert.equal(cityRushLaneAfterAction(5, 'right'), 5);
});

test('a jump locks the wheel: an airborne car keeps its take-off lane', () => {
  // En plein saut, la commande de voie ne répond plus : la voiture garde la
  // voie de son décollage jusqu'à l'atterrissage. Une fois au sol, le volant
  // retrouve exactement son comportement d'avant.
  for (const lane of [0, 1, 2, 3, 4, 5]) {
    assert.equal(cityRushLaneAfterAction(lane, 'left', 6, { airborne: true }), lane,
      `en l’air, la voie ${lane} ne bouge pas vers la gauche`);
    assert.equal(cityRushLaneAfterAction(lane, 'right', 6, { airborne: true }), lane,
      `en l’air, la voie ${lane} ne bouge pas vers la droite`);
  }
  assert.equal(cityRushLaneAfterAction(3, 'left', 6, { airborne: false }), 2, 'au sol, rien ne change');
  assert.equal(cityRushLaneAfterAction(3, 'left', 6), 2, 'le saut est optionnel : le défaut reste le sol');
});

test('London and the Shutō C1 drive on the left, the other courses on the right', () => {
  // Les deux parcours britannique et japonais inversent les moitiés : la course
  // tient la gauche de l'axe jaune et le contresens arrive par la droite. Tout
  // le reste du jeu garde la disposition historique.
  assert.deepEqual(CITY_RUSH_DRIVE_SIDES, ['right', 'left']);
  const leftHand = CITY_RUSH_CITIES.filter((city) => city.driveSide === 'left').map((city) => city.id);
  assert.deepEqual(leftHand, ['tokyo', 'london'], 'seuls Tokyo et Londres roulent à gauche');
  // L'identifiant du parcours suffit : pas besoin de retrouver l'objet.
  assert.equal(cityRushDriveSide('london'), 'left');
  assert.equal(cityRushDriveSide('tokyo'), 'left');
  assert.equal(cityRushDriveSide('vice-city'), 'right');
  assert.equal(cityRushDriveSide('nordschleife'), 'right');
  assert.equal(cityRushDriveSide(null), 'right');
  assert.equal(cityRushDriveSide(undefined), 'right');

  for (const id of ['tokyo', 'london']) {
    const city = CITY_RUSH_CITIES.find((item) => item.id === id);
    const lanes = cityRushLaneConfig(city);
    assert.equal(cityRushDriveSide(city), 'left');
    assert.equal(lanes.driveSide, 'left');
    assert.equal(lanes.raceway, false);
    assert.deepEqual([...lanes.lanes], [0, 1, 2, 3, 4, 5], 'la grille des six voies ne bouge pas');
    assert.deepEqual([...lanes.forwardLanes], [...CITY_RUSH_LEFT_HALF_LANES], `${id} : la course passe à gauche de l'axe`);
    assert.deepEqual([...lanes.oncomingLanes], [...CITY_RUSH_RIGHT_HALF_LANES], `${id} : le contresens arrive par la droite`);
    assert.deepEqual([...lanes.policeLanes], [...CITY_RUSH_LEFT_HALF_LANES], `${id} : l'escouade chasse dans le sens de la course`);
    assert.deepEqual([...lanes.defaultLanes], [...CITY_RUSH_DEFAULT_LANES_LEFT_HAND], `${id} : la grille de départ est reflétée`);
    // Position réelle des voitures au départ : le joueur au milieu de la moitié
    // gauche, ses deux rivaux de part et d'autre.
    assert.deepEqual([...lanes.defaultLanes].map((lane) => lanes.laneX(lane)), [-3.15, -5.25, -1.05]);
    // Les abscisses ne changent pas : c'est le rôle des moitiés qui s'échange.
    assert.deepEqual([...lanes.oncomingLanes].map((lane) => lanes.laneX(lane)), [1.05, 3.15, 5.25]);
  }

  for (const city of CITY_RUSH_CITIES.filter((item) => item.id !== 'tokyo' && item.id !== 'london')) {
    const lanes = cityRushLaneConfig(city);
    assert.equal(cityRushDriveSide(city), 'right', `${city.id} roule à droite`);
    assert.deepEqual([...lanes.forwardLanes], [...CITY_RUSH_FORWARD_LANES]);
    assert.deepEqual([...lanes.oncomingLanes], [...CITY_RUSH_ONCOMING_LANES]);
    assert.deepEqual([...lanes.defaultLanes], [...CITY_RUSH_DEFAULT_LANES]);
  }
  // Un parcours sans contresens (le Ring) reste « à droite » sans que cela ne
  // change quoi que ce soit : ses quatre voies vont dans le même sens.
  const ring = cityRushLaneConfig(CITY_RUSH_NORDSCHLEIFE_COURSE);
  assert.equal(ring.oncomingLanes.length, 0);
  assert.equal(ring.raceway, true);
});

test('the oncoming bonus ramps up in the wrong-way lanes and drains on the way back', () => {
  assert.equal(CITY_RUSH_ONCOMING_BONUS_MAX, 1.35);
  assert.equal(cityRushOncomingBonusFactor(0), 1, 'jauge vide : aucune vitesse en plus');
  assert.equal(cityRushOncomingBonusFactor(CITY_RUSH_ONCOMING_BONUS_RAMP_DURATION), CITY_RUSH_ONCOMING_BONUS_MAX);
  assert.equal(cityRushOncomingBonusFactor(CITY_RUSH_ONCOMING_BONUS_RAMP_DURATION * 4), CITY_RUSH_ONCOMING_BONUS_MAX,
    'la jauge est plafonnée');
  assert.equal(cityRushOncomingBonusFactor(-3), 1);
  assert.equal(cityRushOncomingBonusFactor('abc'), 1);
  const half = cityRushOncomingBonusFactor(CITY_RUSH_ONCOMING_BONUS_RAMP_DURATION / 2);
  assert.ok(half > 1 && half < CITY_RUSH_ONCOMING_BONUS_MAX, 'la montée est progressive');

  // La jauge monte dans les voies inverses, image par image, sans dépasser le
  // plafond…
  let time = 0;
  for (let frame = 0; frame < 400; frame += 1) time = advanceCityRushOncomingBonus(time, 1 / 60, true);
  assert.equal(time, CITY_RUSH_ONCOMING_BONUS_RAMP_DURATION);
  // …et retombe dès le retour dans le sens de la course, plus vite qu'elle n'a
  // monté : `DECAY_DURATION` suffit à vider une jauge pleine, là où il en faut
  // `RAMP_DURATION` pour la remplir.
  const drained = advanceCityRushOncomingBonus(
    CITY_RUSH_ONCOMING_BONUS_RAMP_DURATION, CITY_RUSH_ONCOMING_BONUS_DECAY_DURATION, false,
  );
  assert.equal(drained, 0, 'une jauge pleine se vide en DECAY_DURATION');
  assert.ok(CITY_RUSH_ONCOMING_BONUS_DECAY_DURATION < CITY_RUSH_ONCOMING_BONUS_RAMP_DURATION,
    'la jauge redescend plus vite qu’elle ne monte');
  const halfway = advanceCityRushOncomingBonus(
    CITY_RUSH_ONCOMING_BONUS_RAMP_DURATION, CITY_RUSH_ONCOMING_BONUS_DECAY_DURATION / 2, false,
  );
  assert.ok(halfway > 0 && halfway < CITY_RUSH_ONCOMING_BONUS_RAMP_DURATION,
    'la retombée est progressive, pas instantanée');
  assert.equal(advanceCityRushOncomingBonus(0, 1, false), 0, 'une jauge vide ne descend pas sous zéro');
  assert.equal(advanceCityRushOncomingBonus(2, -5, true), 2, 'un pas négatif ne fait pas reculer la jauge');
});

test('cars in the same lane cannot pass and keep a safe gap, while other lanes stay free', () => {
  const moved = resolveCityRushCarMovement([
    { id: 'leader', lane: 1, previousDistance: 15, nextDistance: 16 },
    { id: 'player', lane: 1, previousDistance: 10, nextDistance: 20 },
    { id: 'rival-behind', lane: 1, previousDistance: 4, nextDistance: 25 },
    { id: 'other-lane', lane: 2, previousDistance: 0, nextDistance: 40 },
  ]);
  const byId = Object.fromEntries(moved.map((car) => [car.id, car.nextDistance]));
  assert.ok(byId.leader - byId.player >= CITY_RUSH_CAR_GAP - 1e-9);
  assert.ok(byId.player - byId['rival-behind'] >= CITY_RUSH_CAR_GAP - 1e-9);
  assert.equal(byId.player >= 10, true);
  assert.equal(byId['rival-behind'] >= 4, true);
  assert.equal(byId['other-lane'], 40);
});

test('racing opponents do not collide, while slow traffic still blocks a racer', () => {
  const opponents = resolveCityRushCarMovement([
    { id: 'player', collisionGroup: 'racer', lane: 1, previousDistance: 0, nextDistance: 30 },
    { id: 'rival', collisionGroup: 'racer', lane: 1, previousDistance: 12, nextDistance: 13 },
  ]);
  const racersById = Object.fromEntries(opponents.map((car) => [car.id, car.nextDistance]));
  assert.equal(racersById.player, 30);
  assert.equal(racersById.rival, 13);

  const trafficEncounter = resolveCityRushCarMovement([
    { id: 'traffic', collisionGroup: 'traffic', lane: 1, previousDistance: 35, nextDistance: 35.2 },
    { id: 'player', collisionGroup: 'racer', lane: 1, previousDistance: 25, nextDistance: 32 },
  ]);
  const trafficById = Object.fromEntries(trafficEncounter.map((car) => [car.id, car.nextDistance]));
  assert.ok(trafficById.traffic - trafficById.player >= CITY_RUSH_CAR_GAP - 1e-9);
});

test('cars changing lanes still block one another while their body widths overlap', () => {
  const moved = resolveCityRushCarMovement([
    { id: 'lane-changing-leader', lane: 2, x: 0.72, previousDistance: 12, nextDistance: 18 },
    { id: 'lane-changing-follower', lane: 1, x: -0.74, previousDistance: 7, nextDistance: 20 },
    { id: 'clear-lane', lane: 3, x: 3.15, previousDistance: 0, nextDistance: 30 },
  ]);
  const byId = Object.fromEntries(moved.map((car) => [car.id, car.nextDistance]));
  assert.ok(byId['lane-changing-leader'] - byId['lane-changing-follower'] >= CITY_RUSH_CAR_GAP - 1e-9);
  assert.equal(byId['clear-lane'], 30);
});

test('pickup encounters contain only red machine-gun bonuses and ground boosts', () => {
  let seed = 112;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  let sawEmptyRow = false;
  let sawTwoPickups = false;
  let totalPickups = 0;
  const pickupCounts = { [CITY_RUSH_PICKUPS.BOOST]: 0, [CITY_RUSH_POWERS.PISTOL]: 0 };
  for (let index = 0; index < 10000; index += 1) {
    const encounter = createCityRushEncounter(random);
    assert.equal(Object.hasOwn(encounter, 'slowLane'), false);
    assert.ok(encounter.pickups.length <= 2);
    totalPickups += encounter.pickups.length;
    for (const pickup of encounter.pickups) pickupCounts[pickup.type] += 1;
    if (encounter.pickups.length === 0) sawEmptyRow = true;
    const pickupLanes = new Set();
    for (const pickup of encounter.pickups) {
      assert.ok(pickup.lane >= 0 && pickup.lane < CITY_RUSH_LANE_X.length);
      assert.ok([CITY_RUSH_PICKUPS.BOOST, CITY_RUSH_POWERS.PISTOL].includes(pickup.type));
      assert.ok(!pickupLanes.has(pickup.lane));
      pickupLanes.add(pickup.lane);
    }
    if (encounter.pickups.length === 2) sawTwoPickups = true;
  }
  const redRate = pickupCounts[CITY_RUSH_POWERS.PISTOL] / totalPickups;
  const boostRate = pickupCounts[CITY_RUSH_PICKUPS.BOOST] / totalPickups;
  assert.ok(redRate >= 0.03 && redRate <= 0.07, `le bonus rouge reste très rare (${(redRate * 100).toFixed(1)} %)`);
  assert.ok(boostRate >= 0.93 && boostRate <= 0.97, `les pads turbo sont très majoritaires (${(boostRate * 100).toFixed(1)} %)`);
  assert.equal(pickupCounts['blue-shot'], undefined);
  assert.equal(pickupCounts.radio, undefined);
  assert.equal(sawEmptyRow, true);
  assert.equal(sawTwoPickups, true);
  assert.ok(totalPickups > 12000 && totalPickups < 12800, 'les rangées plus souvent doubles augmentent le nombre de bonus au sol');
});

test('Sprint encounters place a single ground boost on a forward-facing lane', () => {
  assert.equal(CITY_RUSH_SPRINT_BOOST_ROW_INTERVAL, 6, 'le Sprint espace les rangées de turbo pour éviter un boost permanent');
  for (const sample of [0, 0.12, 0.34, 0.68, 0.99]) {
    const encounter = createCityRushBoostEncounter(() => sample);
    assert.equal(encounter.pickups.length, 1);
    assert.equal(encounter.pickups[0].type, CITY_RUSH_PICKUPS.BOOST);
    assert.ok(CITY_RUSH_FORWARD_LANES.includes(encounter.pickups[0].lane), 'un pad ne doit pas se trouver sur la voie inverse');
  }
});

test('the retired helicopter target helper remains pure and only selects rivals ahead', () => {
  const playerLeads = [
    { id: 'player', distance: 120 },
    { id: 'rival-a', distance: 104 },
    { id: 'rival-b', distance: 88 },
  ];
  assert.equal(cityRushHelicopterTarget(playerLeads, 'player'), null, 'un pilote en tête ne peut pas viser un poursuivant');
  assert.equal(cityRushHelicopterTarget([...playerLeads].reverse(), 'player'), null, 'l’ordre de la liste ne change rien : personne n’est devant');
  assert.equal(cityRushHelicopterTarget(playerLeads, 'rival-a').id, 'player', 'un rival peut toujours viser le leader joueur');
  assert.equal(cityRushHelicopterTarget(playerLeads, 'rival-b').id, 'player', 'le dernier ne voit que ceux qui le précèdent, jamais les autres poursuivants');

  const playerChases = [
    { id: 'player', distance: 90 },
    { id: 'rival-a', distance: 102 },
    { id: 'rival-b', distance: 98 },
    { id: 'rival-c', distance: 71 },
  ];
  assert.equal(cityRushHelicopterTarget(playerChases).id, 'rival-a', 'parmi les rivaux devant, le mieux placé');
  assert.equal(cityRushHelicopterTarget([...playerChases].reverse()).id, 'rival-a', 'la cible est le meilleur rival devant, pas le premier élément de la liste');
  assert.equal(cityRushHelicopterTarget(playerChases, 'rival-b').id, 'rival-a', 'un rival ne se vise pas lui-même et ignore ceux qui le suivent');
  assert.equal(cityRushHelicopterTarget([{ id: 'player', distance: 1 }]), null);
});

test('forward-only powers tolerate a rival glued to the bumper', () => {
  assert.equal(CITY_RUSH_FORWARD_TOLERANCE, 1);
  assert.equal(cityRushIsAhead(100.5, 100), true, 'le rival est devant');
  assert.equal(cityRushIsAhead(99.4, 100), true, 'roue contre roue, compté comme devant');
  assert.equal(cityRushIsAhead(98.9, 100), false, 'un mètre derrière : plus une cible');
  assert.equal(cityRushIsAhead(100, 100), true);
  assert.equal(cityRushIsAhead(Number.NaN, 100), false);
  assert.equal(cityRushIsAhead(100, Number.NaN), false);
  assert.equal(cityRushIsAhead(96, 100, 5), true, 'tolérance élargie au besoin');

  const wheelToWheel = [
    { id: 'player', distance: 100 },
    { id: 'rival-a', distance: 99.5 },
    { id: 'rival-b', distance: 95 },
  ];
  assert.equal(cityRushHelicopterTarget(wheelToWheel).id, 'rival-a');
});

test('race standings identify the leader and player position, including ties', () => {
  const race = [
    { id: 'player', distance: 52 },
    { id: 'rival-a', distance: 61 },
    { id: 'rival-b', distance: 41 },
    { id: 'rival-c', distance: 52 },
  ];
  const board = rankCityRushRacers(race);
  assert.equal(board.leader.id, 'rival-a');
  assert.equal(board.rank, 2);
  assert.deepEqual(board.ordered.map((racer) => racer.id), ['rival-a', 'player', 'rival-c', 'rival-b']);
});

test('a race is N laps of the same 1 200 m loop, the last lap running the loop twice', () => {
  assert.equal(CITY_RUSH_LAPS, 6);
  assert.equal(CITY_RUSH_LAP_LENGTH, 1200);
  assert.equal(CITY_RUSH_FINAL_LAP_LOOPS, 2);
  assert.equal(CITY_RUSH_FINAL_LAP_LENGTH, 2400);
  // Six tours : cinq boucles, puis un grand dernier tour de deux boucles.
  assert.equal(CITY_RUSH_DISTANCE, 5 * CITY_RUSH_LAP_LENGTH + CITY_RUSH_FINAL_LAP_LENGTH);
  assert.equal(CITY_RUSH_DISTANCE, cityRushRaceDistance(CITY_RUSH_LAPS));
  assert.equal(CITY_RUSH_DISTANCE, 8400);

  assert.equal(cityRushLapForDistance(0), 1);
  assert.equal(cityRushLapForDistance(1199.9), 1);
  assert.equal(cityRushLapForDistance(1200), 2);
  assert.equal(cityRushLapForDistance(2500), 3);
  assert.equal(cityRushLapForDistance(3600), 4);
  assert.equal(cityRushLapForDistance(4799), 4);
  assert.equal(cityRushLapForDistance(4800), 5);
  assert.equal(cityRushLapForDistance(5999), 5);
  assert.equal(cityRushLapForDistance(6000), 6);
  assert.equal(cityRushLapForDistance(8399), 6);
  assert.equal(cityRushLapForDistance(8400), 6);
  assert.equal(cityRushLapForDistance(-20), 1);
  assert.equal(cityRushLapForDistance(Number.NaN), 1);

  assert.equal(cityRushLapProgress(0), 0);
  assert.equal(cityRushLapProgress(300), 0.25);
  assert.equal(cityRushLapProgress(1200), 0);
  assert.equal(cityRushLapProgress(3000), 0.5);
  assert.equal(cityRushLapProgress(3600), 0);
  assert.equal(cityRushLapProgress(4800), 0, 'le cinquième tour repart de zéro');
  assert.equal(cityRushLapProgress(6000), 0, 'le dernier tour commence après cinq boucles');
  // La jauge du dernier tour court sur ses 2 400 m : elle ne retombe pas à zéro
  // quand on recroise le portique à 7 200 m.
  assert.equal(cityRushLapProgress(7200), 0.5);
  assert.equal(cityRushLapProgress(7800), 0.75);
  assert.equal(cityRushLapProgress(8400), 1);
  assert.equal(cityRushLapProgress(9600), 1);
  // Le même calcul, pour une course de trois tours (1 200 + 1 200 + 2 400 = 4 800 m).
  assert.equal(cityRushLapProgress(2400, CITY_RUSH_LAP_LENGTH, 3), 0);
  assert.equal(cityRushLapProgress(3600, CITY_RUSH_LAP_LENGTH, 3), 0.5);
  assert.equal(cityRushLapProgress(4800, CITY_RUSH_LAP_LENGTH, 3), 1);
  // Un dernier tour d'une seule boucle redonne l'ancien comportement.
  assert.equal(cityRushLapProgress(6000, CITY_RUSH_LAP_LENGTH, 5, 1), 1);
  assert.equal(cityRushLapProgress(5400, CITY_RUSH_LAP_LENGTH, 5, 1), 0.5);
});
test('the last lap is longer than the others, and so is the whole race', () => {
  // Tous les tours font une boucle, sauf le dernier qui en enchaîne deux.
  assert.equal(cityRushLapLength(1, 4), 1200);
  assert.equal(cityRushLapLength(3, 4), 1200);
  assert.equal(cityRushLapLength(4, 4), 2400);
  assert.equal(cityRushLapLength(1, 1), 2400, 'le tour unique du sprint est le dernier tour');
  assert.equal(cityRushLapLength(4, 4, CITY_RUSH_LAP_LENGTH, 1), 1200);
  assert.equal(cityRushLapLength(4, 4, 100, 3), 300);

  assert.equal(cityRushRaceDistance(1), 2400);
  assert.equal(cityRushRaceDistance(3), 4800);
  assert.equal(cityRushRaceDistance(4), 6000);
  assert.equal(cityRushRaceDistance(5), 7200);
  assert.equal(cityRushRaceDistance(), CITY_RUSH_DISTANCE);
  // La distance est la somme des longueurs de tour.
  for (const laps of [1, 2, 3, 4, 5, 6]) {
    const total = Array.from({ length: laps }, (_, index) => cityRushLapLength(index + 1, laps))
      .reduce((sum, length) => sum + length, 0);
    assert.equal(cityRushRaceDistance(laps), total);
    // L'arrivée tombe pile sur une ligne (le portique est dans le décor), et le
    // dernier tour est le plus long.
    assert.equal(cityRushRaceDistance(laps) % CITY_RUSH_LAP_LENGTH, 0);
    assert.equal(cityRushTrackGap(0, cityRushRaceDistance(laps)), 0);
    assert.ok(cityRushLapLength(laps, laps) > cityRushLapLength(1, laps) || laps === 1);
    // Chaque course est plus longue qu'avant (laps × l'ancienne boucle) : de la boucle en plus.
    assert.equal(cityRushRaceDistance(laps), laps * CITY_RUSH_LAP_LENGTH + (CITY_RUSH_FINAL_LAP_LOOPS - 1) * CITY_RUSH_LAP_LENGTH);
  }
  assert.equal(cityRushRaceDistance(3, 100, 3), 500, 'boucle de 100 m, dernier tour de trois boucles : 100 + 100 + 300');
  assert.equal(cityRushRaceDistance(3, CITY_RUSH_LAP_LENGTH, 1), 3600, 'un dernier tour d’une boucle');
  // Entrées invalides : on retombe sur la course par défaut.
  assert.equal(cityRushRaceDistance(Number.NaN), CITY_RUSH_DISTANCE);
  assert.equal(cityRushRaceDistance(0), CITY_RUSH_DISTANCE);
  assert.equal(cityRushRaceDistance(3, Number.NaN), 4800);
  assert.equal(cityRushRaceDistance(3, CITY_RUSH_LAP_LENGTH, 0), 3 * 1200 - 1200 + 2400);
});

test('crossing the start line is detected once per pass: lap starts, a checkpoint, then the finish', () => {
  assert.deepEqual(cityRushLapCrossings(0, 20), []);
  assert.deepEqual(cityRushLapCrossings(1190, 1210), [1]);
  assert.deepEqual(cityRushLapCrossings(1200, 1200), []);
  assert.deepEqual(cityRushLapCrossings(1199, 1200), [1]);
  assert.deepEqual(cityRushLapCrossings(2390, 2410), [2]);
  assert.deepEqual(cityRushLapCrossings(3599, 3630), [3]);
  // Six tours : les lignes 1 à 5 lancent les tours suivants, la ligne 6 est
  // le point de passage au milieu du dernier tour et la ligne 7 l'arrivée.
  assert.deepEqual(cityRushLapCrossings(4790, 4810), [4]);
  assert.deepEqual(cityRushLapCrossings(5990, 6010), [5]);
  assert.deepEqual(cityRushLapCrossings(7190, 7210), [6]);
  assert.deepEqual(cityRushLapCrossings(8390, 8410), [7]);
  // Un très grand pas de simulation ne saute aucune ligne, et rien au-delà de l'arrivée.
  assert.deepEqual(cityRushLapCrossings(10, 8800), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(cityRushLapCrossings(8400, 9600), []);
  // Reculer (ou rester immobile) ne compte jamais de passage.
  assert.deepEqual(cityRushLapCrossings(1240, 1160), []);
  // Une boucle personnalisée suit les mêmes règles.
  assert.deepEqual(cityRushLapCrossings(95, 205, 100, 5), [1, 2]);
  // Une course de trois tours s'arrête à la ligne 4 (1 200 + 1 200 + 2 400 m).
  assert.deepEqual(cityRushLapCrossings(0, 9999, CITY_RUSH_LAP_LENGTH, 3), [1, 2, 3, 4]);
  // Dernier tour d'une seule boucle : la dernière ligne est directement l'arrivée.
  assert.deepEqual(cityRushLapCrossings(10, 6100, CITY_RUSH_LAP_LENGTH, 5, 1), [1, 2, 3, 4, 5]);
  assert.deepEqual(cityRushLapCrossings(6000, 6600, CITY_RUSH_LAP_LENGTH, 5, 1), []);
});

test('a line is a lap start, a checkpoint in the long last lap, or the finish', () => {
  // Quatre tours : lignes 1-3 = début des tours 2-4, ligne 4 = point de passage, ligne 5 = arrivée.
  assert.deepEqual([1, 2, 3, 4, 5].map((line) => cityRushLineKind(line, 4)), ['lap', 'lap', 'lap', 'checkpoint', 'finish']);
  // Sprint (un tour) : on part dans le dernier tour ; la ligne 1 est un point de passage.
  assert.deepEqual([1, 2].map((line) => cityRushLineKind(line, 1)), ['checkpoint', 'finish']);
  // Dernier tour d'une seule boucle : jamais de point de passage.
  assert.deepEqual([1, 2, 3].map((line) => cityRushLineKind(line, 3, 1)), ['lap', 'lap', 'finish']);
  // Trois boucles au dernier tour : deux points de passage avant l'arrivée.
  assert.deepEqual([1, 2, 3, 4].map((line) => cityRushLineKind(line, 2, 3)), ['lap', 'checkpoint', 'checkpoint', 'finish']);
  assert.equal(cityRushLineKind(Number.NaN, 4), 'lap');

  // Sur chaque course : exactement une arrivée, en dernier, laps − 1 débuts de
  // tour, et un point de passage par boucle supplémentaire du dernier tour.
  for (const laps of [1, 2, 3, 4, 5]) {
    const lines = cityRushLapCrossings(0, cityRushRaceDistance(laps) + 50, CITY_RUSH_LAP_LENGTH, laps);
    const kinds = lines.map((line) => cityRushLineKind(line, laps));
    assert.equal(kinds.at(-1), 'finish');
    assert.equal(kinds.filter((kind) => kind === 'finish').length, 1);
    assert.equal(kinds.filter((kind) => kind === 'lap').length, laps - 1);
    assert.equal(kinds.filter((kind) => kind === 'checkpoint').length, CITY_RUSH_FINAL_LAP_LOOPS - 1);
    // L'arrivée est franchie à la distance totale de la course, pas avant.
    assert.deepEqual(cityRushLapCrossings(0, cityRushRaceDistance(laps) - 1, CITY_RUSH_LAP_LENGTH, laps).map((line) => cityRushLineKind(line, laps)).includes('finish'), false);
  }
});

test('track elements fold onto the loop so the start line comes back ahead every lap', () => {
  const behind = CITY_RUSH_TRACK_BEHIND;
  assert.equal(cityRushTrackGap(0, 0), 0);
  assert.equal(cityRushTrackGap(300, 0), 300);
  assert.equal(cityRushTrackGap(0, 20), -20);
  assert.equal(cityRushTrackGap(0, behind - 1), -(behind - 1));
  // Au bout de la zone « derrière », l'élément réapparaît au loin devant.
  assert.equal(cityRushTrackGap(0, behind), CITY_RUSH_LAP_LENGTH - behind);
  assert.equal(cityRushTrackGap(0, behind + 1), CITY_RUSH_LAP_LENGTH - behind - 1);
  assert.equal(cityRushTrackGap(0, 1200), 0);
  assert.equal(cityRushTrackGap(0, 1199), 1);
  assert.equal(cityRushTrackGap(162, 1100), 262);
  assert.equal(cityRushTrackGap(162, 1300), 62);
  for (let distance = 0; distance <= 6000; distance += 7) {
    for (const position of [0, 36, 162, 300, 564]) {
      const gap = cityRushTrackGap(position, distance);
      assert.ok(gap > -behind - 1e-9 && gap <= CITY_RUSH_LAP_LENGTH - behind + 1e-9, `gap ${gap} out of range`);
    }
  }
  // Deux copies de la boucle espacées d'un tour couvrent toujours la vue avant.
  const first = cityRushTrackGap(0, 1050);
  assert.equal(first, 150);
  assert.equal(first - CITY_RUSH_LAP_LENGTH, -1050);
});

test('the three racers have distinct avatars and international names from around the world', () => {
  assert.ok(CITY_RUSH_DRIVERS.length >= 12);
  const avatarIds = new Set(CITY_RUSH_DRIVERS.map((driver) => driver.avatarId));
  const countryCodes = new Set(CITY_RUSH_DRIVERS.map((driver) => driver.countryCode));
  assert.equal(avatarIds.size, CITY_RUSH_DRIVERS.length);
  assert.equal(countryCodes.size, CITY_RUSH_DRIVERS.length);

  for (const city of CITY_RUSH_CITIES) {
    const roster = selectCityRushRacers({ cityId: city.id });
    assert.equal(roster.length, 3);
    assert.deepEqual(roster.map((racer) => racer.id), ['player', 'nova', 'juno']);
    assert.equal(roster[0].isPlayer, true);
    assert.ok(roster.slice(1).every((racer) => racer.isPlayer === false));
    assert.equal(new Set(roster.map((racer) => racer.driverId)).size, 3);
    assert.equal(new Set(roster.map((racer) => racer.avatarId)).size, 3);
    assert.equal(new Set(roster.map((racer) => racer.name)).size, 3);
    assert.equal(new Set(roster.map((racer) => racer.countryCode)).size, 3);
    for (const racer of roster) {
      assert.ok(racer.name && racer.displayName && racer.country && racer.flag && racer.avatar);
    }
  }

  const customRoster = selectCityRushRacers({ cityId: 'tokyo', playerDriverId: 'kwame' });
  assert.equal(customRoster[0].driverId, 'kwame');
  assert.equal(customRoster[0].name, 'KWAME');
  assert.equal(customRoster[0].country, 'Nigeria');
  assert.equal(new Set(customRoster.map((racer) => racer.avatarId)).size, 3);
});

test('the race mini-map locates all three racers on the circuit loop and focuses on our player', () => {
  const path = cityRushMinimapTrackPath(32);
  assert.ok(path.startsWith('M ') && path.endsWith(' Z'));

  const startLeft = cityRushMinimapPoint(0, 0);
  const startRight = cityRushMinimapPoint(0, CITY_RUSH_LANE_X.length - 1);
  assert.ok(Math.hypot(startLeft.x - startRight.x) + Math.hypot(startLeft.y - startRight.y) > 1);
  // Après un tour complet (1 200 m), le point revient exactement sur la ligne de départ.
  const fullLap = cityRushMinimapPoint(CITY_RUSH_LAP_LENGTH, 0);
  assert.ok(Math.abs(fullLap.x - startLeft.x) < 1e-6);
  assert.ok(Math.abs(fullLap.y - startLeft.y) < 1e-6);

  const roster = selectCityRushRacers({ cityId: 'vice-city', playerDriverId: 'chloe' });
  const standings = rankCityRushRacers([
    { ...roster[0], distance: 420, lane: 1 },
    { ...roster[1], distance: 465, lane: 0 },
    { ...roster[2], distance: 390, lane: 2 },
  ]).ordered;

  const minimap = buildCityRushMinimapState(standings, { cityId: 'vice-city', playerDriverId: 'chloe' });
  assert.equal(minimap.markers.length, 3);
  assert.equal(minimap.focus.id, 'player');
  assert.equal(minimap.focus.isPlayer, true);
  assert.equal(minimap.focus.name, 'CHLOÉ');
  assert.equal(minimap.focus.country, 'France');
  assert.equal(minimap.focus.relativeDistance, 0);

  const rivalLeader = minimap.markers.find((marker) => marker.id === 'nova');
  const rivalBehind = minimap.markers.find((marker) => marker.id === 'juno');
  assert.equal(rivalLeader.relativeDistance, 45);
  assert.equal(rivalBehind.relativeDistance, -30);

  // Le viewBox du focus est centré autour de notre joueur.
  const [vx, vy, vw, vh] = minimap.viewBox.split(' ').map(Number);
  const focusCenterX = vx + vw / 2;
  const focusCenterY = vy + vh / 2;
  assert.ok(Math.abs(focusCenterX - minimap.focus.point.x) <= 25);
  assert.ok(Math.abs(focusCenterY - minimap.focus.point.y) <= 25);
});

test('la mini-carte dessine l’escouade de police à part des trois pilotes', () => {
  const minimap = buildCityRushMinimapState([], {
    cityId: 'vice-city',
    pursuers: [
      { id: 'police-1', name: 'POLICE 1', distance: 1250, lane: 3, mode: 'blockade', blocking: true },
      { id: 'police-2', name: 'POLICE 2', distance: 1240, lane: 5 },
    ],
  });
  // Les trois pilotes restent seuls dans le classement : l'escouade a sa
  // propre liste, hors positions et hors arrivée.
  assert.equal(minimap.racers.length, 3);
  assert.equal(minimap.pursuers.length, 2);
  assert.equal(minimap.pursuers[0].name, 'POLICE 1');
  for (const car of minimap.pursuers) {
    assert.ok(Number.isFinite(car.x) && Number.isFinite(car.y));
    assert.ok(CITY_RUSH_POLICE_LANES.includes(car.lane));
    assert.equal(minimap.racers.some((racer) => racer.id === car.id), false);
  }
  // Le barrage roulant est signalé à la mini-carte, qui peut le peindre à part.
  assert.equal(minimap.pursuers[0].blocking, true);
  assert.equal(minimap.pursuers[0].mode, 'blockade');
  assert.equal(minimap.pursuers[1].blocking, false);
  // Une escouade inactive (avant le dernier tour, ou après l'arrivée) ne
  // laisse aucun marqueur.
  assert.equal(buildCityRushMinimapState([], { pursuers: [{ id: 'police-1', distance: 1250, active: false }] }).pursuers.length, 0);
  assert.equal(buildCityRushMinimapState([]).pursuers.length, 0);
});


test('la mini-carte suit la course réelle : tours, progression et dernier tour long', () => {
  const player = (distance) => ({ id: 'player', distance });
  const playerOf = (state) => state.racers.find((racer) => racer.isPlayer);
  // Trois tours = 1 200 + 1 200 + 2 400 m : la distance totale se déduit des tours.
  assert.equal(playerOf(buildCityRushMinimapState([player(0)], { laps: 3 })).progress, 0);
  const mid = buildCityRushMinimapState([player(3600)], { laps: 3 });
  assert.equal(playerOf(mid).lap, 3);
  // On vient de recroiser le portique au milieu du dernier tour : la jauge de
  // tour est à 50 % (elle ne retombe pas à zéro) et la course aux trois quarts.
  assert.equal(playerOf(mid).lapProgress, 0.5);
  assert.equal(playerOf(mid).progress, 0.75);
  assert.equal(mid.focus.lap, 3);
  // Au-delà de l'arrivée, la progression reste plafonnée à 100 %.
  const done = buildCityRushMinimapState([player(5000)], { laps: 3 });
  assert.equal(playerOf(done).lap, 3);
  assert.equal(playerOf(done).progress, 1);
  assert.equal(playerOf(done).lapProgress, 1);
  // Une distance totale explicite l'emporte sur celle que déduisent les tours.
  assert.equal(playerOf(buildCityRushMinimapState([player(1000)], { laps: 3, totalDistance: 4000 })).progress, 0.25);
  // Sans rien préciser : la course par défaut (CITY_RUSH_LAPS tours).
  assert.equal(playerOf(buildCityRushMinimapState([player(CITY_RUSH_DISTANCE)])).progress, 1);
  // Le point sur la mini-carte suit la boucle de 1 200 m, y compris au dernier
  // tour : après 1 200 m de dernier tour, le pilote est revenu sur la ligne.
  const finalLapStart = cityRushMinimapPoint(2400, 0);
  const finalLapMid = cityRushMinimapPoint(3600, 0);
  assert.ok(Math.abs(finalLapStart.x - finalLapMid.x) < 1e-6 && Math.abs(finalLapStart.y - finalLapMid.y) < 1e-6);
});

test('a car recovers its speed faster after being held behind traffic', () => {
  assert.ok(CITY_RUSH_TRAFFIC_RECOVERY_BOOST > 1);
  assert.equal(cityRushTrafficRecoveryRate(9, 0), 9);
  assert.equal(cityRushTrafficRecoveryRate(9, 1), 9 * CITY_RUSH_TRAFFIC_RECOVERY_BOOST);
  const normal = approachCityRushSpeed(5, 29, cityRushTrafficRecoveryRate(9, 0), 1);
  const recovering = approachCityRushSpeed(5, 29, cityRushTrafficRecoveryRate(9, 1), 1);
  assert.ok(recovering > normal + 10);
});

test('changer de voie ne ralentit plus, tenir sa voie fait accélérer', async () => {
  const rules = await import('../src/games/cityRushRules.js');
  // Le malus d'écart a disparu des règles : plus aucun changement de voie ne
  // touche la vitesse (ni facteur, ni durée).
  assert.equal(rules.CITY_RUSH_LANE_CHANGE_SLOW_FACTOR, undefined);
  assert.equal(rules.CITY_RUSH_LANE_CHANGE_SLOW_DURATION, undefined);
  // Ligne propre : aucun bonus au départ, puis la vitesse monte avec le
  // temps de voie tenue, sans bouger du guidon.
  assert.equal(cityRushCleanLineFactor(0), 1);
  assert.ok(CITY_RUSH_CLEAN_LINE_MAX_BONUS > 1 && CITY_RUSH_CLEAN_LINE_MAX_BONUS < 1.3);
  const half = cityRushCleanLineFactor(CITY_RUSH_CLEAN_LINE_RAMP_DURATION / 2);
  assert.ok(half > 1 && half < CITY_RUSH_CLEAN_LINE_MAX_BONUS);
  assert.ok(Math.abs(half - (1 + (CITY_RUSH_CLEAN_LINE_MAX_BONUS - 1) / 2)) < 1e-9);
  // Au bout de la rampe (et au-delà), le bonus est plafonné.
  assert.equal(cityRushCleanLineFactor(CITY_RUSH_CLEAN_LINE_RAMP_DURATION), CITY_RUSH_CLEAN_LINE_MAX_BONUS);
  assert.equal(cityRushCleanLineFactor(CITY_RUSH_CLEAN_LINE_RAMP_DURATION * 5), CITY_RUSH_CLEAN_LINE_MAX_BONUS);
  // Entrées invalides : aucun bonus, jamais de NaN.
  assert.equal(cityRushCleanLineFactor(-4), 1);
  assert.equal(cityRushCleanLineFactor('abc'), 1);
  assert.equal(cityRushCleanLineFactor(undefined), 1);
  // Le seul levier « voie » ne freine jamais : entre la seconde d'un écart et
  // la voie tenue, le facteur reste toujours au moins égal à 1.
  for (let step = 0; step <= 20; step += 1) {
    assert.ok(cityRushCleanLineFactor(step * 0.5) >= 1, 'la voie tenue ne doit jamais être une punition');
  }
  // Combiné : l'instant d'un écart, la voiture roule à sa vitesse de base —
  // plus jamais en dessous — et une longue voie tenue la fait dépasser.
  const baseTarget = CITY_RUSH_PLAYER_SPEED;
  const justAfterChange = baseTarget * cityRushCleanLineFactor(0);
  const afterCleanHold = baseTarget * cityRushCleanLineFactor(CITY_RUSH_CLEAN_LINE_RAMP_DURATION * 3);
  assert.equal(justAfterChange, baseTarget, 'un changement de voie ne retire plus rien à la vitesse');
  assert.ok(afterCleanHold > baseTarget);
});

test('la toupie d’immobilisation boucle des tours entiers face à la route', () => {
  const total = CITY_RUSH_POWER_RULES.radio.duration;
  const fullSpin = CITY_RUSH_STUN_SPIN_TURNS * Math.PI * 2;
  // Départ de la frappe : pas encore de rotation.
  assert.equal(cityRushStunSpin(total, total), 0);
  // La rotation grandit au fil du stun, sans jamais repartir en arrière…
  // (jusqu'à l'avant-dernière frame : à 0 s restantes, le stun est fini et le
  // lacet revient à 0 — soit un tour complet, pile face à la route).
  let previous = 0;
  for (let step = 1; step <= 19; step += 1) {
    const left = total - (total * step) / 20;
    const yaw = cityRushStunSpin(left, total);
    assert.ok(yaw > previous, `le lacet doit progresser (${yaw} <= ${previous})`);
    previous = yaw;
  }
  // …mais ralentit : le premier dixième couvre plus d'angle que le dernier.
  const firstSlice = cityRushStunSpin(total * 0.9, total);
  const lastSlice = cityRushStunSpin(0, total) || fullSpin - cityRushStunSpin(total * 0.1, total);
  assert.ok(firstSlice > lastSlice, 'ease-out : la toupie ralentit avant la reprise');
  // Mi-stun : ease-out quadratique à 75 % du parcours.
  assert.ok(Math.abs(cityRushStunSpin(total / 2, total) - 0.75 * fullSpin) < 1e-9);
  // Stun terminé (ou sur le point de l'être) : la voiture est face à la
  // route — un nombre entier de tours, donc aucun à-coup visuel au retour.
  assert.equal(cityRushStunSpin(0, total) % (Math.PI * 2), 0);
  assert.ok(Math.abs(cityRushStunSpin(0.0001, total) - fullSpin) < 0.01);
  // La durée récupérée par profil (reprise rapide/lente) ne change pas le
  // nombre de tours : seule la vitesse de rotation s'adapte.
  const comet = { hitRecoveryMultiplier: 0.88 };
  const cometTotal = cityRushHitDuration(total, comet);
  assert.equal(cityRushStunSpin(cometTotal, cometTotal), 0);
  assert.ok(Math.abs(cityRushStunSpin(cometTotal / 2, cometTotal) - 0.75 * fullSpin) < 1e-9);
  // Entrées invalides : aucune rotation.
  assert.equal(cityRushStunSpin(0, 0), 0);
  assert.equal(cityRushStunSpin(-1, total), 0);
  assert.equal(cityRushStunSpin(Number.NaN, total), 0);
  assert.equal(cityRushStunSpin(total, Number.NaN), 0);
  assert.equal(cityRushStunSpin(total, total, 0), 0);
});

test('la course de Tokyo suit la Shuto Expressway Route 1, anneau intérieur officiel', () => {
  const city = CITY_RUSH_CITIES.find((entry) => entry.id === 'tokyo');
  const route = city.route;
  assert.equal(route, CITY_RUSH_SHUTO_C1, 'la ville pointe sur la route officielle');
  assert.equal(cityRushRouteFor('tokyo'), CITY_RUSH_SHUTO_C1);
  assert.equal(cityRushRouteFor('paris'), null, 'les autres villes gardent la boucle générique');
  assert.equal(route.id, 'shuto-c1');
  assert.equal(route.marker, 'C1');
  assert.equal(route.japanese, '首都高速 都心環状線');
  assert.equal(route.direction, '内回り');
  assert.equal(route.directionRomaji, 'UCHI-MAWARI');
  assert.equal(route.lengthKm, 14.8);
  assert.equal(route.speedLimit, 50, 'la C1 est limitée à 50 km/h');
  assert.equal(route.origin.name, '日本橋', 'le kilomètre zéro est au pont de Nihonbashi');

  // Les quinze secteurs se suivent sans trou et se referment sur le km 0.
  assert.equal(route.sectors.length, 15);
  assert.equal(route.sectors[0].from, 0);
  assert.equal(route.sectors[route.sectors.length - 1].to, 0);
  route.sectors.forEach((sector, index) => {
    if (index > 0) assert.ok(Math.abs(sector.from - route.sectors[index - 1].to) < 1e-9, `${sector.id} enchaîne sur le secteur précédent`);
    assert.ok(sector.id && sector.name && sector.romaji && sector.kind, `${sector.id} est documenté`);
    assert.ok(sector.from >= 0 && sector.from < 1 && sector.to >= 0 && sector.to <= 1);
    // En 内回り le point kilométrique officiel décroît le long du tour.
    if (index > 0) assert.ok(sector.km < route.sectors[index - 1].km, `${sector.id} : km ${sector.km} après ${route.sectors[index - 1].km}`);
    assert.ok(Math.abs(shutoC1At(sector.km) - sector.from) < 1e-9, `${sector.id} : km officiel → position sur le tour`);
  });

  // Trois tunnels (北の丸, 千代田, 汐留) et une tranchée ouverte (霞が関).
  const tunnels = route.sectors.filter((sector) => sector.kind === 'tunnel');
  assert.deepEqual(tunnels.map((sector) => sector.id), ['kitanomaru', 'chiyoda', 'shiodome-tunnel']);
  for (const tunnel of tunnels) {
    assert.ok(tunnel.tunnel.lengthM > 0, `${tunnel.id} a une longueur`);
    const middle = (tunnel.from + tunnel.to) / 2;
    const cover = shutoC1CoverAt(middle);
    assert.equal(cover.covered, true, `${tunnel.id} est couvert`);
    assert.equal(cover.kind, 'tunnel');
  }
  // Le tunnel de 千代田 interdit les matières dangereuses, comme dans la vraie C1.
  const chiyoda = shutoC1SectorAt((route.sectors.find((s) => s.id === 'chiyoda').from + 0.32) / 1);
  assert.equal(shutoC1SectorAt(0.32).id, 'chiyoda');
  assert.equal(shutoC1SectorAt(0.32).sign.hazard, true, '危険物通行禁止 dans le tunnel de 千代田');
  assert.ok(chiyoda);
  // 新富町 : les piles de l'ancienne 築地川 montent entre les files, d'où les
  // lignes jaunes continues et l'interdiction de changer de voie.
  const shintomicho = route.sectors.find((sector) => sector.id === 'shintomicho');
  assert.equal(shintomicho.kind, 'pillars');
  assert.equal(shintomicho.pillars, true);
  assert.equal(shintomicho.sign.hazard, true);

  // Repères : la Tokyo Tower à gauche de 芝公園, le Rainbow Bridge à droite de
  // 浜崎橋, le palais impérial toujours à l'intérieur de l'anneau (à gauche).
  const shibakoen = route.sectors.find((sector) => sector.id === 'shibakoen');
  assert.equal(shibakoen.landmark.id, 'tokyo-tower');
  assert.equal(shibakoen.landmark.side, -1);
  assert.ok(shibakoen.from < shibakoen.landmark.at && shibakoen.landmark.at < shibakoen.to);
  const hamazakibashi = route.sectors.find((sector) => sector.id === 'hamazakibashi');
  assert.equal(hamazakibashi.landmark.id, 'rainbow-bridge');
  assert.equal(hamazakibashi.landmark.side, 1);
  assert.equal(hamazakibashi.bay, true);
  const palace = route.sectors.filter((sector) => sector.palace).map((sector) => sector.id);
  assert.deepEqual(palace, ['kitanomaru', 'chiyoda', 'kasumigaseki'], 'le palais borde l’ouest de l’anneau');
  for (const sector of route.sectors.filter((item) => item.palace)) assert.equal(sector.side, -1);

  // La porte de mi-tour du jeu tombe dans la tranchée de 霞が関, juste après le
  // JCT de 谷町 (km 8,0 officiel) : c'est là que se place le portique géant.
  const gateSector = route.sectors.find((sector) => sector.gate);
  assert.equal(gateSector.id, 'kasumigaseki');
  assert.equal(gateSector.kind, 'cut');
  assert.ok(gateSector.from < 0.466 && 0.466 < gateSector.to, '谷町JCT est dans le secteur');
  assert.equal(shutoC1SectorAt(0.5).id, 'kasumigaseki');
  assert.equal(shutoC1CoverAt(0.5).kind, 'cut');
  assert.equal(shutoC1CoverAt(0.5).covered, false, 'la tranchée reste à ciel ouvert');

  // Conversions kilométriques et lecture du tableau de bord.
  assert.equal(shutoC1At(0), 0);
  assert.ok(Math.abs(shutoC1At(7.4) - 0.5) < 1e-9, 'km 7,4 = mi-tour (porte du jeu)');
  assert.ok(Math.abs(shutoC1At(14.8)) < 1e-9);
  assert.equal(shutoC1KmAt(0), 0, 'le km 0 se referme sur 日本橋');
  assert.equal(shutoC1KmAt(0.5), 7.4);
  const readout = shutoC1Readout(0.635);
  assert.equal(readout.sector.id, 'shibakoen');
  assert.equal(readout.km, 5.4, 'km officiel de 芝公園');
  assert.equal(readout.marker, 'C1');
  assert.equal(readout.direction, '内回り');
  assert.equal(readout.cover.covered, false);
  // La prochaine jonction annoncée est toujours la plus proche devant.
  const firstNext = shutoC1NextJunction(0);
  assert.equal(firstNext.id, 'kandabashi');
  assert.equal(firstNext.aheadM, 700);
  assert.ok(firstNext.sign.lines.length >= 2);
  // Depuis la porte de mi-tour (km 7,4), le prochain panneau annonce 芝公園 à
  // 800 m ; une fois engagé dans 芝公園, c'est 浜崎橋JCT qui vient.
  const beforeTower = shutoC1NextJunction(0.5);
  assert.equal(beforeTower.id, 'shibakoen');
  assert.equal(beforeTower.aheadM, 800);
  const afterTower = shutoC1NextJunction(0.6);
  assert.equal(afterTower.id, 'hamazakibashi');
  assert.ok(afterTower.aheadM > 0 && afterTower.aheadM < 1000);
});

test('la mini-carte de Tokyo dessine le vrai anneau de la C1 et ses échangeurs', () => {
  const shape = cityRushMinimapTrackShape('tokyo');
  assert.ok(shape, 'la C1 a sa propre silhouette');
  assert.equal(shape.id, 'shuto-c1');
  // 14,8 km à 9,6 unité/km : le périmètre fait environ 141 unités.
  assert.ok(Math.abs(shape.total - 14.8 * 9.6) < 6, `périmètre ${shape.total.toFixed(1)}`);
  assert.equal(cityRushMinimapTrackShape('paris'), null, 'les autres villes gardent l’anneau générique');

  const start = cityRushMinimapPoint(0, 0, { cityId: 'tokyo' });
  assert.ok(Number.isFinite(start.x) && Number.isFinite(start.y));
  assert.ok(start.x >= 0 && start.x <= 100 && start.y >= 0 && start.y <= 100, 'dans le viewBox 100×100');
  const fullLap = cityRushMinimapPoint(CITY_RUSH_LAP_LENGTH, 0, { cityId: 'tokyo' });
  assert.ok(Math.abs(fullLap.x - start.x) < 1e-6 && Math.abs(fullLap.y - start.y) < 1e-6, 'le tour se referme');
  const gate = cityRushMinimapPoint(CITY_RUSH_LAP_LENGTH / 2, 0, { cityId: 'tokyo' });
  assert.ok(Math.hypot(gate.x - start.x, gate.y - start.y) > 10, 'la porte de mi-tour est de l’autre côté de l’anneau');
  // La silhouette diffère de la boucle générique : ce n’est pas un cercle.
  const generic = cityRushMinimapTrackPath(24);
  const shuto = cityRushMinimapTrackPath(24, { cityId: 'tokyo' });
  assert.notEqual(shuto, generic);
  assert.ok(shuto.startsWith('M ') && shuto.endsWith(' Z'));

  const minimap = buildCityRushMinimapState([], { cityId: 'tokyo' });
  assert.equal(minimap.route.id, 'shuto-c1');
  assert.equal(minimap.route.marker, 'C1');
  assert.equal(minimap.route.direction, '内回り');
  assert.equal(minimap.routeTicks.length, CITY_RUSH_SHUTO_C1.sectors.length);
  let previousProgress = -1;
  for (const tick of minimap.routeTicks) {
    assert.ok(Number.isFinite(tick.x) && Number.isFinite(tick.y), `${tick.id} est placé`);
    assert.ok(tick.x >= 0 && tick.x <= 100 && tick.y >= 0 && tick.y <= 100);
    assert.ok(tick.loopProgress > previousProgress, `${tick.id} dans l’ordre du tour`);
    previousProgress = tick.loopProgress;
    assert.ok(tick.name && tick.kind);
    assert.ok(Number.isFinite(tick.tangentX) && Number.isFinite(tick.tangentY));
  }
  assert.equal(minimap.routeTicks[0].id, 'edobashi');
  assert.equal(minimap.routeTicks[0].km, 14.8);
  assert.ok(minimap.routeTicks.some((tick) => tick.id === 'shibakoen' && tick.kind === 'landmark'));
  // Une ville sans route officielle n’envoie ni route ni repères.
  const plain = buildCityRushMinimapState([], { cityId: 'paris' });
  assert.equal(plain.route, null);
  assert.deepEqual(plain.routeTicks, []);
});

test('le Ring enchaîne de longs appuis, avec des cassures qui se resserrent', () => {
  // Le profil du Nordschleife n'est plus une suite de cloches timides : les
  // longues courbes gardent leur appui (le volant reste braqué), les virages
  // pièges se resserrent en sortie, et les chicanes cassent net. Ces trois
  // comportements sont mesurés sur le cap rendu, pas sur la table.
  const profile = CITY_RUSH_TRACK_PROFILE_NORDSCHLEIFE;
  const lap = CITY_RUSH_LAP_LENGTH;
  const samples = 6000;
  const step = lap / samples;
  const heading = (distance) => Math.abs((profile.yaw(distance) * 180) / Math.PI);

  // 1. Les quatre formes d'appui ont une aire de 1 : l'angle annoncé dans la
  //    table est donc exactement l'angle dont le virage fait tourner le cap.
  for (const shape of ['smooth', 'sustained', 'tightening', 'snap']) {
    let area = 0;
    for (let index = 0; index < 20000; index += 1) {
      const u = -1 + ((index + 0.5) * 2) / 20000;
      area += nordschleifeCornerCurve(u, shape) * (2 / 20000);
    }
    assert.ok(Math.abs(area - 1) < 1e-6, `${shape} : aire ${area}`);
    assert.equal(nordschleifeCornerCurve(-1, shape), 0);
    assert.equal(nordschleifeCornerCurve(1, shape), 0);
  }

  // 2. Des appuis longs et tenus : le tour passe plus du quart de sa longueur
  //    au-dessus de 10° de cap, huit portions au moins restent au-dessus de
  //    14°, et la plus longue tient près de deux secondes. L'ancien profil
  //    plafonnait à 14° avec des appuis de 30 m : autrement dit, il n'y avait
  //    aucun long virage.
  const runs = [];
  let run = null;
  let turned = 0;
  for (let index = 0; index < samples; index += 1) {
    const distance = index * step;
    const value = heading(distance);
    if (value >= 10) turned += 1;
    if (value >= 14) {
      if (!run) run = { from: distance, to: distance, peak: value };
      run.to = distance;
      run.peak = Math.max(run.peak, value);
    } else if (run) {
      runs.push(run);
      run = null;
    }
  }
  if (run) runs.push(run);
  const lengths = runs.map((item) => item.to - item.from);
  // Les tout petits virages ont été ouverts en courbes douces (30–120 m →
  // 300–450 m) : la densité d'appui du tour ne bouge pas, seul le zébru a
  // disparu.
  assert.ok(turned / samples >= 0.28, `le tour tourne sur ${((turned / samples) * 100).toFixed(0)} % de sa longueur`);
  assert.ok(runs.length >= 8, `${runs.length} appuis au-dessus de 14°`);
  const longest = Math.max(...lengths);
  assert.ok(longest >= 55, `appui le plus long : ${longest.toFixed(0)} m de piste (${(longest / 35).toFixed(1)} s)`);
  assert.ok(lengths.filter((item) => item >= 25).length >= 3, `appuis tenus : ${lengths.map((item) => item.toFixed(0)).join(', ')} m`);
  // Les cassures restent franches : la virole du Karussell (48° réels) est le
  // virage le plus serré du jeu, et le cap y dépasse 28°.
  assert.ok(Math.max(...runs.map((item) => item.peak)) >= 28, 'la virole reste la cassure la plus dure');

  // 3. Les noms du Ring restent ceux des virages qui tournent : Kesselchen
  //    tient son appui sur la montée, Hatzenbach son enchaînement, et le
  //    Karussell tourne plus fort que tout le reste.
  const held = (km, threshold) => {
    const centre = (km / 20.832) * lap;
    let metres = 0;
    for (let distance = centre - 60; distance <= centre + 60; distance += 0.25) {
      if (heading(distance) >= threshold) metres += 0.25;
    }
    return metres;
  };
  assert.ok(held(11.8, 12) >= 45, `Kesselchen tient 12° sur ${held(11.8, 12).toFixed(0)} m`);
  assert.ok(held(2.62, 12) >= 8, `Hatzenbach tient 12° sur ${held(2.62, 12).toFixed(0)} m`);
  assert.ok(Math.max(...[11.8, 12.4, 16.15, 17.25, 18.5].map((km) => held(km, 14))) >= 30, 'un long virage nommé tient 14° sur 30 m');

  // 4. Les virages « qui se resserrent » tournent plus fort après leur milieu
  //    que le virage lisse équivalent : c'est le presque-sec de sortie.
  const sampleCurve = (shape, from, to) => {
    let sum = 0;
    for (let index = 0; index < 400; index += 1) {
      sum += nordschleifeCornerCurve(from + ((to - from) * (index + 0.5)) / 400, shape);
    }
    return sum / 400;
  };
  const lisse = { first: sampleCurve('smooth', -0.9, -0.2), second: sampleCurve('smooth', 0.2, 0.9) };
  const resserre = { first: sampleCurve('tightening', -0.9, -0.2), second: sampleCurve('tightening', 0.2, 0.9) };
  assert.ok(Math.abs(lisse.first - lisse.second) < 1e-3, 'la cloche lisse est symétrique');
  assert.ok(resserre.second > resserre.first * 1.5, `le virage qui se resserre appuie ${(resserre.second / resserre.first).toFixed(1)} fois plus en sortie`);

  // 5. Le profil reste refermé, et le déport tient dans la largeur déclarée.
  assert.equal(nordschleifeTrackOffset(0), 0);
  assert.equal(nordschleifeTrackTangent(0), 0);
  assert.ok(Math.abs(nordschleifeTrackYaw(0)) < 1e-9);
  let maxOffset = 0;
  let maxName = 0;
  for (let index = 0; index < samples; index += 1) {
    maxOffset = Math.max(maxOffset, Math.abs(nordschleifeTrackOffset(index * step)));
    maxName = Math.max(maxName, Math.abs(nordschleifeTrackYaw(index * step) * 180 / Math.PI));
  }
  assert.ok(Math.abs(maxOffset - CITY_RUSH_NORDSCHLEIFE_MAX_OFFSET) < 0.05, `déport max ${maxOffset.toFixed(2)}`);
  assert.ok(maxName < 45, `cap max ${maxName.toFixed(1)}° : le ruban reste lisible`);
  assert.equal(CITY_RUSH_NORDSCHLEIFE_PROFILE_STEPS, 2400);
  // La table garde un cap par virage : aucune entrée sans forme ni étendue.
  for (const [km, angle, spanKm, shape = 'smooth'] of CITY_RUSH_NORDSCHLEIFE_TURNS) {
    assert.ok(km >= 0 && km < 20.832, `km ${km}`);
    assert.ok(spanKm > 0, `étendue ${spanKm}`);
    assert.ok(Math.abs(angle) <= 48, `angle ${angle}`);
    assert.ok(['smooth', 'sustained', 'tightening', 'snap'].includes(shape), `forme ${shape}`);
  }

  // 6. Plus de tout petit virage : chaque appui du tracé dure au moins 150 m
  //    réels (les micro-zébrus de 30–120 m ont été ouverts en courbes douces
  //    pour la fluidité, chicane de Hohenrain comprise), et la cassure nette
  //    ne survient que deux fois par tour — l'épingle d'Adenauer Forst et la
  //    virole du Karussell, les deux cassures assumées.
  for (const [km, angle, spanKm, shape = 'smooth'] of CITY_RUSH_NORDSCHLEIFE_TURNS) {
    assert.ok(spanKm >= 0.15, `virage à ${km} km : étendue ${spanKm} km, trop court pour la fluidité`);
    if (shape === 'snap') {
      assert.ok([7.2, 13.5].some((snapKm) => Math.abs(km - snapKm) < 0.01), `cassure « snap » inattendue à ${km} km`);
    }
  }
  // Sur le profil rendu, hors ces deux cassures, le rayon du ruban ne descend
  // jamais sous la largeur de la piste (9,20 m) : plus aucun pli qui casse le
  // défilement — les courbes douces qui remplacent les anciens petits virages
  // tiennent au moins trois largeurs. Le rayon est mesuré comme au moteur :
  // x = déport, z = −0,72·s (différences centrées).
  const scrollScale = 0.72;
  const roadWidth = 9.2;
  const ringRadius = (distance) => {
    const h = 0.5;
    const o1 = nordschleifeTrackOffset(distance - h);
    const o2 = nordschleifeTrackOffset(distance);
    const o3 = nordschleifeTrackOffset(distance + h);
    const d1 = (o2 - o1) / h;
    const d2 = (o3 - o2) / h;
    const dd = (d2 - d1) / h;
    const kappa = Math.abs(dd * scrollScale) / Math.pow(d1 * d1 + scrollScale * scrollScale, 1.5);
    return kappa > 1e-9 ? 1 / kappa : Infinity;
  };
  const nearSnap = (distance) => [7.2, 13.5].some((snapKm) => {
    const centre = (snapKm / 20.832) * lap;
    let delta = ((distance - centre) % lap + lap) % lap;
    if (delta > lap / 2) delta -= lap;
    return Math.abs(delta) < 0.35 * (lap / 20.832);
  });
  for (let index = 0; index < samples; index += 1) {
    const distance = index * step;
    if (nearSnap(distance)) continue;
    const radius = ringRadius(distance);
    assert.ok(radius >= roadWidth, `rayon ${radius.toFixed(1)} à ${(distance / lap * 20.832).toFixed(2)} km : un tout petit virage s'est invité`);
  }
});

test('Sprint : 16 checkpoints, 15 s entre chaque, arrivée au dernier', async () => {
  const rules = await import('../src/games/cityRushRules.js');
  assert.equal(rules.CITY_RUSH_SPRINT_CHECKPOINTS, 16);
  assert.equal(rules.CITY_RUSH_SPRINT_CHECKPOINT_TIME, 15);
  assert.equal(rules.CITY_RUSH_SPRINT_DISTANCE, 16 * rules.CITY_RUSH_SPRINT_CHECKPOINT_SPACING);
  // 16 portes × 300 m = 4 800 m = quatre boucles exactes : l'arrivée retombe
  // pile sous le portique.
  assert.equal(rules.CITY_RUSH_SPRINT_DISTANCE % rules.CITY_RUSH_LAP_LENGTH, 0);
  assert.equal(rules.cityRushSprintCheckpointsPassed(0), 0);
  assert.equal(rules.cityRushSprintCheckpointsPassed(rules.CITY_RUSH_SPRINT_CHECKPOINT_SPACING), 1);
  assert.equal(rules.cityRushSprintCheckpointsPassed(99999), 16);
  assert.ok(rules.CITY_RUSH_SPRINT_CHECKPOINT_SPACING / rules.CITY_RUSH_PLAYER_SPEED < 15);
});

test('les tremplins sont rares et les sauts moins hauts, avec une portée liée à la vitesse', () => {
  assert.equal(CITY_RUSH_RAMP_COUNT, 3, 'seules trois rampes sont conservées dans le circuit');
  assert.ok(CITY_RUSH_RAMP_SPACING_MIN >= 250, 'les rampes sont beaucoup plus espacées');
  assert.ok(CITY_RUSH_RAMP_SPACING_MAX >= 300);
  assert.ok(CITY_RUSH_RAMP_WIDTH >= 2.0 && CITY_RUSH_RAMP_WIDTH <= 2.6);
  assert.ok(CITY_RUSH_RAMP_LENGTH >= 4.0 && CITY_RUSH_RAMP_LENGTH <= 6.0);
  assert.ok(CITY_RUSH_RAMP_HEIGHT >= 0.7 && CITY_RUSH_RAMP_HEIGHT <= 1.2);

  const slowDist = computeCityRushJumpDistance(15);
  const medDist = computeCityRushJumpDistance(30);
  const fastDist = computeCityRushJumpDistance(50);
  const boostDist = computeCityRushJumpDistance(70);

  assert.ok(slowDist < medDist, 'la portée grandit avec la vitesse');
  assert.ok(medDist < fastDist);
  assert.ok(fastDist < boostDist);
  assert.ok(slowDist >= 16 && slowDist <= 25, 'portée courte à basse allure');
  assert.ok(fastDist >= 50 && fastDist <= 75, 'longue portée à haute vitesse');

  const slowHeight = computeCityRushJumpHeight(15);
  const fastHeight = computeCityRushJumpHeight(60);
  assert.ok(fastHeight > slowHeight, 'la hauteur maximale augmente avec la vitesse');
  assert.ok(slowHeight >= 1.4 && slowHeight < 2.0, 'même le saut lent reste modéré et franchit le trafic');
  assert.ok(fastHeight <= 2.8, 'la hauteur est plafonnée à moins de trois mètres');

  // Trajectoire en cloche (élévation et pitch)
  const y0 = computeCityRushJumpElevation(0, medDist, 3.5);
  const yMid = computeCityRushJumpElevation(medDist * 0.5, medDist, 3.5);
  const yEnd = computeCityRushJumpElevation(medDist, medDist, 3.5);
  assert.equal(y0, 0, 'au décollage y = 0');
  assert.ok(Math.abs(yMid - 3.5) < 1e-4, 'au sommet y = hauteur max');
  assert.equal(yEnd, 0, 'à l’atterrissage y = 0');

  const pitchLaunch = computeCityRushJumpPitch(0.05);
  const pitchPeak = computeCityRushJumpPitch(0.5);
  const pitchLanding = computeCityRushJumpPitch(0.95);
  assert.ok(pitchLaunch > 0, 'nez cabré au décollage');
  assert.equal(pitchPeak, 0, 'assiette plate au sommet du saut');
  assert.ok(pitchLanding < 0, 'léger piqué avant le contact avec la route');

  // Détection de contact tremplin
  assert.equal(detectCityRushRampContact(100, 4, 101, 4), true);
  assert.equal(detectCityRushRampContact(100, 3, 101, 4), false, 'voie différente = pas de saut');
  assert.equal(detectCityRushRampContact(100, 4, 115, 4), false, 'trop loin = pas de saut');
});

test('une voiture qui saute passe au-dessus du trafic et des autres voitures sans collision ni blocage', () => {
  // 1. Détection des chocs avec le trafic : la voiture en saut ignore les impacts
  const groundImpacts = detectCityRushTrafficImpacts([
    { id: 'player', collisionGroup: 'racer', lane: 4, x: 0.8, previousDistance: 10, nextDistance: 25, width: 1.9, jumping: false },
    { id: 'truck', collisionGroup: 'traffic', lane: 4, x: 0.8, previousDistance: 20, nextDistance: 22, width: 2.1 },
  ]);
  assert.equal(groundImpacts.length, 1, 'au sol, la voiture percute le camion');

  const jumpingImpacts = detectCityRushTrafficImpacts([
    { id: 'player', collisionGroup: 'racer', lane: 4, x: 0.8, previousDistance: 10, nextDistance: 25, width: 1.9, jumping: true },
    { id: 'truck', collisionGroup: 'traffic', lane: 4, x: 0.8, previousDistance: 20, nextDistance: 22, width: 2.1 },
  ]);
  assert.equal(jumpingImpacts.length, 0, 'en vol, la voiture survole le camion sans impact');

  // 2. Résolution du mouvement : la voiture en vol n’est pas ralentie par le véhicule au sol
  const groundMoved = resolveCityRushCarMovement([
    { id: 'player', collisionGroup: 'racer', lane: 4, x: 0.8, previousDistance: 10, nextDistance: 25, width: 1.9, jumping: false },
    { id: 'truck', collisionGroup: 'traffic', lane: 4, x: 0.8, previousDistance: 20, nextDistance: 22, width: 2.1 },
  ]);
  const groundById = Object.fromEntries(groundMoved.map((c) => [c.id, c.nextDistance]));
  assert.ok(groundById.player < 22, 'au sol, le joueur est retenu derrière le camion');

  const jumpingMoved = resolveCityRushCarMovement([
    { id: 'player', collisionGroup: 'racer', lane: 4, x: 0.8, previousDistance: 10, nextDistance: 25, width: 1.9, jumping: true },
    { id: 'truck', collisionGroup: 'traffic', lane: 4, x: 0.8, previousDistance: 20, nextDistance: 22, width: 2.1 },
  ]);
  const jumpingById = Object.fromEntries(jumpingMoved.map((c) => [c.id, c.nextDistance]));
  assert.equal(jumpingById.player, 25, 'en saut, la voiture poursuit sa trajectoire par-dessus');
});
