import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CITY_RUSH_CITIES,
  CITY_RUSH_CARS,
  CITY_RUSH_DISTANCE,
  CITY_RUSH_FINAL_LAP_LENGTH,
  CITY_RUSH_FINAL_LAP_LOOPS,
  CITY_RUSH_LAPS,
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_TRACK_BEHIND,
  CITY_RUSH_PLAYER_SPEED,
  CITY_RUSH_AI_TRACK_BOOST_WEIGHT,
  CITY_RUSH_TRACK_BOOST_PICKUP_CHANCE,
  CITY_RUSH_BLUE_SHOT_DURATION,
  CITY_RUSH_BLUE_SHOT_MAX_RANGE,
  CITY_RUSH_BLUE_SHOT_SPEED_FACTOR,
  CITY_RUSH_TRACK_BOOST_DURATION,
  CITY_RUSH_TRACK_BOOST_SPEED_FACTOR,
  CITY_RUSH_RIVAL_BOOST_SPEED_FACTOR,
  CITY_RUSH_TRACK_BOOST_COLOR,
  CITY_RUSH_ONCOMING_MAX_WIDTH,
  CITY_RUSH_ONCOMING_EDGE_MARGIN,
  CITY_RUSH_ONCOMING_SAFE_OUTER_X,
  CITY_RUSH_ONCOMING_EJECT_DURATION,
  cityRushOncomingImpactX,
  CITY_RUSH_RACER_VIEW_DISTANCE,
  CITY_RUSH_CAR_GAP,
  CITY_RUSH_LANE_X,
  CITY_RUSH_LANE_WIDTH,
  CITY_RUSH_LANES_PER_DIRECTION,
  CITY_RUSH_ROAD_WIDTH,
  CITY_RUSH_ROAD_HALF_WIDTH,
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
  CITY_RUSH_POLICE_BLOCK_RANGE,  CITY_RUSH_POLICE_COUNT,
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
  CITY_RUSH_PLAYER_HEALTH_CRITICAL,
  CITY_RUSH_WATCH_HELI_AHEAD,
  CITY_RUSH_WATCH_HELI_HEIGHT,
  CITY_RUSH_WATCH_HELI_LATERAL,
  CITY_RUSH_RACER_SLOTS,
  cityRushPlayerDamage,
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
  CITY_RUSH_LANE_CHANGE_SLOW_DURATION,
  CITY_RUSH_LANE_CHANGE_SLOW_FACTOR,
  CITY_RUSH_CLEAN_LINE_RAMP_DURATION,
  CITY_RUSH_CLEAN_LINE_MAX_BONUS,
  cityRushCleanLineFactor,
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
  cityRushPoliceBlocksLeader,
  cityRushPoliceContact,
  cityRushPoliceDamage,
  cityRushPoliceShotsLeft,
  cityRushPoliceTarget,  cityRushTrackGap,
  chooseCityRushPoliceLane,
  isCityRushPoliceLaneJammed,
  resolveCityRushPoliceMovement,
  addCityRushCharge,
  cityRushLaneAfterAction,
  consumeCityRushCharge,
  canCollectCityRushPickup,
  isCityRushPowerCharged,
  shouldHideCityRushPistolPickup,
  createCityRushEncounter,
  createCityRushInventory,
  createCityRushPoliceInventory,
  detectCityRushTrafficImpacts,
  isCityRushPickupHidden,
  markCityRushPickupTaken,
  rankCityRushRacers,
  resolveCityRushCarMovement,
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
  assert.equal(CITY_RUSH_CARS.length, 6);
  assert.equal(CITY_RUSH_CARS.find((car) => car.id === 'vega-gt-67')?.bodyColor, 0x11131a);
  assert.equal(new Set(CITY_RUSH_CARS.map((car) => car.id)).size, CITY_RUSH_CARS.length);
  assert.deepEqual(
    new Set(CITY_RUSH_CARS.map((car) => car.archetype)),
    new Set(['ferrari', 'porsche', 'audi', 'volkswagen', 'bmw', 'lamborghini']),
  );
  const forbiddenBrandNames = /\b(ferrari|porsche|lamborghini|lambo|bmw|audi|volkswagen)\b/i;
  for (const car of CITY_RUSH_CARS) {
    assert.ok(car.name && car.className && car.accent.startsWith('#'));
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
  assert.equal(CITY_RUSH_TRAFFIC_COUNT % CITY_RUSH_TRAFFIC_TYPES.length, 0);
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
    'police', 'ambulance', 'garbage-truck', 'white-lambo',
  ]);
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

  const speedMultipliers = CITY_RUSH_CARS.map((car) => car.powerMultiplier);
  assert.ok(Math.min(...speedMultipliers) >= 0.98);
  assert.ok(Math.max(...speedMultipliers) <= 1.04);
  assert.ok(Math.max(...speedMultipliers) - Math.min(...speedMultipliers) <= 0.060001, 'les vitesses de pointe restent proches');
  const orderedIds = (stat, direction = 1) => [...CITY_RUSH_CARS]
    .sort((a, b) => (a[stat] - b[stat]) * direction)
    .map((car) => car.id);
  assert.deepEqual(orderedIds('power'), orderedIds('powerMultiplier'));
  assert.deepEqual(orderedIds('acceleration'), orderedIds('accelerationRate'));
  assert.deepEqual(orderedIds('recovery'), orderedIds('hitRecoveryMultiplier', -1));
});

test('the active loadout has one red machine-gun charge plus automatic ground boosts', () => {
  assert.equal(CITY_RUSH_DISTANCE, 3600); // 5 tours : 4 boucles + un dernier tour de 2 boucles
  assert.equal(CITY_RUSH_PLAYER_SPEED, 35);
  assert.equal(CITY_RUSH_TRACK_BOOST_PICKUP_CHANCE, 0.55);
  assert.equal(CITY_RUSH_AI_TRACK_BOOST_WEIGHT, 3);
  assert.deepEqual(CITY_RUSH_POWER_CHARGE_COST, { 'blue-shot': 1, pistol: 1, radio: 4 });
  assert.equal(CITY_RUSH_POWER_RULES.pistol.key, 'Z');
  assert.equal(CITY_RUSH_POWER_RULES.pistol.chargeCost, 1);
  assert.match(CITY_RUSH_POWER_RULES.pistol.description, /un seul bonus rouge/i);
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

test('one red pickup charges the machine gun while inventory tracks remain independent', () => {
  let inventory = createCityRushInventory();
  assert.deepEqual(Object.keys(inventory), ['blue-shot', 'pistol', 'radio']);
  inventory = addCityRushCharge(inventory, CITY_RUSH_POWERS.BLUE_SHOT, 1);
  inventory = addCityRushCharge(inventory, 'pistol', 1);
  assert.equal(inventory[CITY_RUSH_POWERS.BLUE_SHOT], 1);
  assert.equal(inventory.pistol, 1);
  assert.equal(isCityRushPowerCharged(inventory, 'pistol'), true, 'un seul bonus rouge charge la mitrailleuse');

  const usedShot = consumeCityRushCharge(inventory, 'pistol');
  assert.equal(usedShot.consumed, true);
  assert.equal(usedShot.inventory.pistol, 0);
  assert.equal(usedShot.inventory[CITY_RUSH_POWERS.BLUE_SHOT], 1, 'la charge historique reste indépendante');
  assert.equal(consumeCityRushCharge(usedShot.inventory, 'pistol').consumed, false);

  inventory = addCityRushCharge(usedShot.inventory, 'pistol', 1);
  assert.equal(inventory.pistol, CITY_RUSH_POWER_CHARGE_COST.pistol);
  assert.equal(consumeCityRushCharge(inventory, 'unknown').consumed, false);

  const overfilled = addCityRushCharge(createCityRushInventory(), 'radio', 99);
  assert.equal(overfilled.radio, CITY_RUSH_POWER_CHARGE_COST.radio);
});

test('red pickups remain available until every active racer is charged, and never charge a ready racer twice', () => {
  const charged = { pistol: 1 };
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

test('au dernier tour, deux berlines de police chassent le premier — hors classement', () => {
  assert.equal(CITY_RUSH_POLICE_COUNT, 2);
  // La mitrailleuse rouge est le seul bonus de tir que la police convoite.
  assert.deepEqual([...CITY_RUSH_POLICE_HUNT_TYPES], ['pistol']);
  assert.equal(CITY_RUSH_POWER_RULES.pistol.color, '#ff526e');
  // Aucune berline ne porte un identifiant de pilote classé : la grille garde
  // trois pilotes, et l'arrivée ne peut pas compter les voitures de police.
  assert.deepEqual([...CITY_RUSH_RACER_SLOTS], ['player', 'nova', 'juno']);
  // Les deux berlines partent sur les voies extérieures de la course ; leur
  // barrage est encadré dans le temps : elles se rabattent, freinent, puis
  // repartent.
  assert.equal(CITY_RUSH_POLICE_LANES.length, CITY_RUSH_POLICE_COUNT, 'une voie de départ par berline');
  assert.deepEqual([...CITY_RUSH_POLICE_LANES], [3, 5]);
  assert.ok(CITY_RUSH_POLICE_LANES.every((lane) => CITY_RUSH_FORWARD_LANES.includes(lane)));
  assert.ok(CITY_RUSH_POLICE_BLOCKADE_RANGE > CITY_RUSH_CAR_GAP);
  assert.ok(CITY_RUSH_POLICE_BLOCKADE_HOLD > 0);
});

test('la barre de vie du pilote se compte en carrés : tir bleu 1, rafale rouge 2, carambolage 1', () => {
  // Huit carrés, pleins à l'entrée de l'escouade en piste.
  assert.equal(CITY_RUSH_PLAYER_HEALTH, 8);
  assert.equal(CITY_RUSH_PLAYER_DAMAGE['blue-shot'], 1);
  assert.equal(CITY_RUSH_PLAYER_DAMAGE.pistol, 2);
  assert.equal(CITY_RUSH_PLAYER_DAMAGE.collision, 1);
  assert.equal(cityRushPlayerDamage(CITY_RUSH_PLAYER_HEALTH, 'blue-shot'), 7);
  assert.equal(cityRushPlayerDamage(CITY_RUSH_PLAYER_HEALTH, 'pistol'), 6);
  assert.equal(cityRushPlayerDamage(CITY_RUSH_PLAYER_HEALTH, 'collision'), 7);
  // La barre ne descend jamais sous zéro, et une source inconnue ne l'entame
  // pas (le trafic et les rivaux hors tir ne comptent pas).
  assert.equal(cityRushPlayerDamage(1, 'pistol'), 0);
  assert.equal(cityRushPlayerDamage(0, 'blue-shot'), 0);
  assert.equal(cityRushPlayerDamage(5, 'boost'), 5);
  // Sans source précisée, c'est le tir bleu qui s'applique (défaut du barème).
  assert.equal(cityRushPlayerDamage(5, undefined), 4);
  assert.equal(cityRushPlayerDamage(-3, 'collision'), 0);
  assert.ok(CITY_RUSH_PLAYER_HEALTH_CRITICAL < CITY_RUSH_PLAYER_HEALTH);
  // Trois carambolages ou trois tirs bleus détruisent une berline (2 points
  // chacun sur sa propre barre de 6).
  assert.equal(CITY_RUSH_POLICE_DAMAGE.collision, 2);
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, 'collision'), CITY_RUSH_POLICE_HEALTH - 2);
  // Une berline collée au pare-chocs ne vide pas la barre : un délai sépare
  // deux carambolages comptés.
  assert.ok(CITY_RUSH_POLICE_COLLISION_COOLDOWN > 0.5);
  assert.ok(CITY_RUSH_POLICE_COLLISION_TOLERANCE > 0);
});

test('la barre de vie du pilote part du vert, passe à l’orange puis au rouge — sans jamais montrer les carrés', () => {
  assert.equal(cityRushPlayerHealthColor(CITY_RUSH_PLAYER_HEALTH), CITY_RUSH_PLAYER_BAR_COLORS.full);
  assert.equal(cityRushPlayerHealthColor(CITY_RUSH_PLAYER_HEALTH / 2), CITY_RUSH_PLAYER_BAR_COLORS.mid);
  assert.equal(cityRushPlayerHealthColor(0), CITY_RUSH_PLAYER_BAR_COLORS.low);
  const channel = (color, index) => Number.parseInt(color.slice(1 + index * 2, 3 + index * 2), 16);
  const green = channel(cityRushPlayerHealthColor(8), 1);
  const orange = channel(cityRushPlayerHealthColor(4), 1);
  const red = channel(cityRushPlayerHealthColor(2), 1);
  // Le vert s'efface progressivement : la barre « chauffe » au lieu de sauter
  // d'une couleur à l'autre.
  assert.ok(green > orange && orange > red);
  assert.ok(channel(cityRushPlayerHealthColor(8), 1) > channel(cityRushPlayerHealthColor(8), 0), 'pleine : le vert domine');
  assert.ok(channel(cityRushPlayerHealthColor(0), 0) > channel(cityRushPlayerHealthColor(0), 1), 'vide : le rouge domine');
  // Bornes : au-delà de la vie pleine ou sous zéro, la couleur reste valide.
  assert.equal(cityRushPlayerHealthColor(12), CITY_RUSH_PLAYER_BAR_COLORS.full);
  assert.equal(cityRushPlayerHealthColor(-4), CITY_RUSH_PLAYER_BAR_COLORS.low);
  assert.match(cityRushPlayerHealthColor(7, 8), /^#[0-9a-f]{6}$/);
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

test('l’escouade ne prend en chasse que le premier du classement', () => {
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

test('barre de vie des berlines : trois tirs bleus, OU deux rafales rouges, OU un hélico', () => {
  // Le barème de dégât est pur : la berline encaisse 6 points de vie, un tir
  // bleu en retire 2 et une rafale rouge 3.
  assert.equal(CITY_RUSH_POLICE_HEALTH, 6, 'une berline part avec six points de vie');
  assert.equal(CITY_RUSH_POLICE_DAMAGE[CITY_RUSH_POWERS.BLUE_SHOT], 2, 'un tir droit bleu retire deux points');
  assert.equal(CITY_RUSH_POLICE_DAMAGE[CITY_RUSH_POWERS.PISTOL], 3, 'une rafale rouge retire trois points');
  assert.equal(CITY_RUSH_POLICE_DAMAGE[CITY_RUSH_POWERS.RADIO], CITY_RUSH_POLICE_HEALTH, 'le tir d’hélico détruit d’un coup');
  // Trois tirs bleus successifs abattent la berline ; les deux premiers la
  // laissent debout.
  const afterFirstBlue = cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.BLUE_SHOT);
  const afterSecondBlue = cityRushPoliceDamage(afterFirstBlue, CITY_RUSH_POWERS.BLUE_SHOT);
  assert.equal(afterFirstBlue, 4, 'le premier tir bleu laisse la berline debout');
  assert.equal(afterSecondBlue, 2, 'le deuxième tir bleu aussi');
  assert.equal(cityRushPoliceDamage(afterSecondBlue, CITY_RUSH_POWERS.BLUE_SHOT), 0, 'le troisième tir bleu la détruit');
  // Deux rafales rouges : la première entame la barre, la seconde détruit.
  const afterFirstBurst = cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.PISTOL);
  assert.equal(afterFirstBurst, 3, 'la première rafale rouge laisse la berline debout');
  assert.equal(cityRushPoliceDamage(afterFirstBurst, CITY_RUSH_POWERS.PISTOL), 0, 'la seconde rafale rouge la détruit');
  // Un hélico détruit dès le premier coup.
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.RADIO), 0);
  // La vie ne descend jamais sous zéro, même sous le feu nourri.
  assert.equal(cityRushPoliceDamage(0, CITY_RUSH_POWERS.BLUE_SHOT), 0, 'une épave ne prend plus de dégâts');
  assert.equal(cityRushPoliceDamage(1, CITY_RUSH_POWERS.PISTOL), 0);
  // Source inconnue ou invalide : aucun dégât.
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_PICKUPS.BOOST), CITY_RUSH_POLICE_HEALTH);
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, null), CITY_RUSH_POLICE_HEALTH);
  assert.equal(cityRushPoliceDamage(Number.NaN, CITY_RUSH_POWERS.BLUE_SHOT), 0);
});

test('le bandeau « berline touchée » compte les tirs restants, pas les points de vie', () => {
  assert.equal(cityRushPoliceShotsLeft(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.BLUE_SHOT), 3, 'trois tirs bleus au départ');
  assert.equal(cityRushPoliceShotsLeft(4, CITY_RUSH_POWERS.BLUE_SHOT), 2, 'deux tirs bleus après le premier');
  assert.equal(cityRushPoliceShotsLeft(2, CITY_RUSH_POWERS.BLUE_SHOT), 1, 'un tir bleu après le deuxième');
  assert.equal(cityRushPoliceShotsLeft(0, CITY_RUSH_POWERS.BLUE_SHOT), 0, 'épave : plus rien à tirer');
  assert.equal(cityRushPoliceShotsLeft(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.PISTOL), 2, 'deux rafales rouges au départ');
  assert.equal(cityRushPoliceShotsLeft(3, CITY_RUSH_POWERS.PISTOL), 1, 'une rafale rouge après la première');
  assert.equal(cityRushPoliceShotsLeft(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.RADIO), 1, 'un seul missile');
  // Arme non létale ou inconnue : aucun tir ne compte.
  assert.equal(cityRushPoliceShotsLeft(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_PICKUPS.BOOST), 0);
  assert.equal(cityRushPoliceShotsLeft(Number.NaN, CITY_RUSH_POWERS.BLUE_SHOT), 0);
});

test('les berlines entrent sans charge et conservent seulement leur hélicoptère de police gratuit', () => {
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
  assert.ok(redRate >= 0.43 && redRate <= 0.47, `le bonus rouge charge la mitrailleuse (${(redRate * 100).toFixed(1)} %)`);
  assert.ok(boostRate >= 0.53 && boostRate <= 0.57, `le turbo au sol apparaît bien (${(boostRate * 100).toFixed(1)} %)`);
  assert.equal(pickupCounts['blue-shot'], undefined);
  assert.equal(pickupCounts.radio, undefined);
  assert.equal(sawEmptyRow, true);
  assert.equal(sawTwoPickups, true);
  assert.ok(totalPickups > 12000 && totalPickups < 12800, 'les rangées plus souvent doubles augmentent le nombre de bonus au sol');
});

test('the helicopter only locks onto rivals ahead of its pilot', () => {
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

test('a race is N laps of the same 600 m loop, the last lap running the loop twice', () => {
  assert.equal(CITY_RUSH_LAPS, 5);
  assert.equal(CITY_RUSH_LAP_LENGTH, 600);
  assert.equal(CITY_RUSH_FINAL_LAP_LOOPS, 2);
  assert.equal(CITY_RUSH_FINAL_LAP_LENGTH, 1200);
  // Cinq tours : quatre boucles, puis un grand dernier tour de deux boucles.
  assert.equal(CITY_RUSH_DISTANCE, 4 * CITY_RUSH_LAP_LENGTH + CITY_RUSH_FINAL_LAP_LENGTH);
  assert.equal(CITY_RUSH_DISTANCE, cityRushRaceDistance(CITY_RUSH_LAPS));

  assert.equal(cityRushLapForDistance(0), 1);
  assert.equal(cityRushLapForDistance(599.9), 1);
  assert.equal(cityRushLapForDistance(600), 2);
  assert.equal(cityRushLapForDistance(1250), 3);
  assert.equal(cityRushLapForDistance(1800), 4);
  assert.equal(cityRushLapForDistance(2399), 4);
  // Le dernier tour court jusqu'à l'arrivée : le compteur y reste plafonné,
  // y compris quand on recroise le portique à mi-parcours (3 000 m).
  assert.equal(cityRushLapForDistance(2400), 5);
  assert.equal(cityRushLapForDistance(3000), 5);
  assert.equal(cityRushLapForDistance(3599), 5);
  assert.equal(cityRushLapForDistance(4000), 5);
  assert.equal(cityRushLapForDistance(-20), 1);
  assert.equal(cityRushLapForDistance(Number.NaN), 1);

  assert.equal(cityRushLapProgress(0), 0);
  assert.equal(cityRushLapProgress(150), 0.25);
  assert.equal(cityRushLapProgress(600), 0);
  assert.equal(cityRushLapProgress(1500), 0.5);
  assert.equal(cityRushLapProgress(1800), 0);
  assert.equal(cityRushLapProgress(2400), 0, 'le dernier tour repart de zéro');
  // La jauge du dernier tour court sur ses 1 200 m : elle ne retombe pas à zéro
  // quand on recroise le portique.
  assert.equal(cityRushLapProgress(3000), 0.5);
  assert.equal(cityRushLapProgress(3300), 0.75);
  assert.equal(cityRushLapProgress(3600), 1);
  assert.equal(cityRushLapProgress(4200), 1);
  // Le même calcul, pour une course de trois tours (600 + 600 + 1 200 = 2 400 m).
  assert.equal(cityRushLapProgress(1200, CITY_RUSH_LAP_LENGTH, 3), 0);
  assert.equal(cityRushLapProgress(1800, CITY_RUSH_LAP_LENGTH, 3), 0.5);
  assert.equal(cityRushLapProgress(2400, CITY_RUSH_LAP_LENGTH, 3), 1);
  // Un dernier tour d'une seule boucle redonne l'ancien comportement.
  assert.equal(cityRushLapProgress(3000, CITY_RUSH_LAP_LENGTH, 5, 1), 1);
  assert.equal(cityRushLapProgress(2700, CITY_RUSH_LAP_LENGTH, 5, 1), 0.5);
});

test('the last lap is longer than the others, and so is the whole race', () => {
  // Tous les tours font une boucle, sauf le dernier qui en enchaîne deux.
  assert.equal(cityRushLapLength(1, 4), 600);
  assert.equal(cityRushLapLength(3, 4), 600);
  assert.equal(cityRushLapLength(4, 4), 1200);
  assert.equal(cityRushLapLength(1, 1), 1200, 'le tour unique du sprint est le dernier tour');
  assert.equal(cityRushLapLength(4, 4, CITY_RUSH_LAP_LENGTH, 1), 600);
  assert.equal(cityRushLapLength(4, 4, 100, 3), 300);

  assert.equal(cityRushRaceDistance(1), 1200);
  assert.equal(cityRushRaceDistance(3), 2400);
  assert.equal(cityRushRaceDistance(4), 3000);
  assert.equal(cityRushRaceDistance(5), 3600);
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
    // Chaque course est plus longue qu'avant (laps × 600 m) : de la boucle en plus.
    assert.equal(cityRushRaceDistance(laps), laps * CITY_RUSH_LAP_LENGTH + (CITY_RUSH_FINAL_LAP_LOOPS - 1) * CITY_RUSH_LAP_LENGTH);
  }
  assert.equal(cityRushRaceDistance(3, 100, 3), 500, 'boucle de 100 m, dernier tour de trois boucles : 100 + 100 + 300');
  assert.equal(cityRushRaceDistance(3, CITY_RUSH_LAP_LENGTH, 1), 1800, 'un dernier tour d’une boucle : l’ancienne durée');
  // Entrées invalides : on retombe sur la course par défaut.
  assert.equal(cityRushRaceDistance(Number.NaN), CITY_RUSH_DISTANCE);
  assert.equal(cityRushRaceDistance(0), CITY_RUSH_DISTANCE);
  assert.equal(cityRushRaceDistance(3, Number.NaN), 2400);
  assert.equal(cityRushRaceDistance(3, CITY_RUSH_LAP_LENGTH, 0), 3 * 600 - 600 + 1200);
});

test('crossing the start line is detected once per pass: lap starts, a checkpoint, then the finish', () => {
  assert.deepEqual(cityRushLapCrossings(0, 20), []);
  assert.deepEqual(cityRushLapCrossings(590, 605), [1]);
  assert.deepEqual(cityRushLapCrossings(600, 600), []);
  assert.deepEqual(cityRushLapCrossings(599, 600), [1]);
  assert.deepEqual(cityRushLapCrossings(1190, 1210), [2]);
  assert.deepEqual(cityRushLapCrossings(1799, 1830), [3]);
  // Cinq tours : les lignes 1 à 4 lancent les tours 2 à 5, la ligne 5 est le
  // point de passage du dernier tour et la ligne 6 l'arrivée.
  assert.deepEqual(cityRushLapCrossings(2390, 2410), [4]);
  assert.deepEqual(cityRushLapCrossings(2990, 3010), [5]);
  assert.deepEqual(cityRushLapCrossings(3590, 3610), [6]);
  // Un très grand pas de simulation ne saute aucune ligne, et rien au-delà de l'arrivée.
  assert.deepEqual(cityRushLapCrossings(10, 3700), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(cityRushLapCrossings(3600, 4200), []);
  // Reculer (ou rester immobile) ne compte jamais de passage.
  assert.deepEqual(cityRushLapCrossings(620, 580), []);
  // Une boucle personnalisée suit les mêmes règles.
  assert.deepEqual(cityRushLapCrossings(95, 205, 100, 5), [1, 2]);
  // Une course de trois tours s'arrête à la ligne 4 (600 + 600 + 1 200 m).
  assert.deepEqual(cityRushLapCrossings(0, 9999, CITY_RUSH_LAP_LENGTH, 3), [1, 2, 3, 4]);
  // Dernier tour d'une seule boucle : la dernière ligne est directement l'arrivée.
  assert.deepEqual(cityRushLapCrossings(10, 3100, CITY_RUSH_LAP_LENGTH, 5, 1), [1, 2, 3, 4, 5]);
  assert.deepEqual(cityRushLapCrossings(3000, 3600, CITY_RUSH_LAP_LENGTH, 5, 1), []);
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
  assert.equal(cityRushTrackGap(0, 600), 0);
  assert.equal(cityRushTrackGap(0, 1799), 1);
  assert.equal(cityRushTrackGap(162, 1700), 262);
  assert.equal(cityRushTrackGap(162, 1300), 62);
  for (let distance = 0; distance <= 3000; distance += 7) {
    for (const position of [0, 36, 162, 300, 564]) {
      const gap = cityRushTrackGap(position, distance);
      assert.ok(gap > -behind - 1e-9 && gap <= CITY_RUSH_LAP_LENGTH - behind + 1e-9, `gap ${gap} out of range`);
    }
  }
  // Deux copies de la boucle espacées d'un tour couvrent toujours la vue avant.
  const first = cityRushTrackGap(0, 450);
  assert.equal(first, 150);
  assert.equal(first - CITY_RUSH_LAP_LENGTH, -450);
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
  // Après un tour complet (600 m), le point revient exactement sur la ligne de départ.
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
  // Trois tours = 600 + 600 + 1 200 m : la distance totale se déduit des tours.
  assert.equal(playerOf(buildCityRushMinimapState([player(0)], { laps: 3 })).progress, 0);
  const mid = buildCityRushMinimapState([player(1800)], { laps: 3 });
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
  // Le point sur la mini-carte suit la boucle de 600 m, y compris au dernier
  // tour : après 600 m de dernier tour, le pilote est revenu sur la ligne.
  const finalLapStart = cityRushMinimapPoint(1200, 0);
  const finalLapMid = cityRushMinimapPoint(1800, 0);
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

test('changer de voie ralentit légèrement, tenir sa voie fait accélérer', () => {
  // Le freinage d'un écart reste bref et léger, sans être négligeable.
  assert.ok(CITY_RUSH_LANE_CHANGE_SLOW_DURATION > 0.3 && CITY_RUSH_LANE_CHANGE_SLOW_DURATION < 2);
  assert.ok(CITY_RUSH_LANE_CHANGE_SLOW_FACTOR < 1 && CITY_RUSH_LANE_CHANGE_SLOW_FACTOR > 0.75);
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
  // Combiné : après un écart, la voiture roule sous sa vitesse de base ;
  // après une longue voie tenue, elle la dépasse.
  const baseTarget = CITY_RUSH_PLAYER_SPEED;
  const afterChange = baseTarget * CITY_RUSH_LANE_CHANGE_SLOW_FACTOR * cityRushCleanLineFactor(0);
  const afterCleanHold = baseTarget * cityRushCleanLineFactor(CITY_RUSH_CLEAN_LINE_RAMP_DURATION * 3);
  assert.ok(afterChange < baseTarget);
  assert.ok(afterCleanHold > baseTarget);
});

test('la toupie du stun héliporté boucle des tours entiers face à la route', () => {
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
