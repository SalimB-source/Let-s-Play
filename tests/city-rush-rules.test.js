import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CITY_RUSH_CITIES,
  CITY_RUSH_CARS,
  CITY_RUSH_DISTANCE,
  CITY_RUSH_LAPS,
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_TRACK_BEHIND,
  CITY_RUSH_PLAYER_SPEED,
  CITY_RUSH_BLUE_SHOT_DURATION,
  CITY_RUSH_BLUE_SHOT_MAX_RANGE,
  CITY_RUSH_BLUE_SHOT_SPEED_FACTOR,
  CITY_RUSH_RACER_VIEW_DISTANCE,
  CITY_RUSH_CAR_GAP,
  CITY_RUSH_LANE_X,
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
  CITY_RUSH_POLICE_ATTACK_LEAD,
  CITY_RUSH_POLICE_BLOCKADE_HOLD,
  CITY_RUSH_POLICE_BLOCKADE_MIN_SPEED,
  CITY_RUSH_POLICE_BLOCKADE_RANGE,
  CITY_RUSH_POLICE_BLOCK_RANGE,  CITY_RUSH_POLICE_COUNT,
  CITY_RUSH_POLICE_DAMAGE,
  CITY_RUSH_POLICE_HEALTH,
  CITY_RUSH_POLICE_HUNT_RANGE,
  CITY_RUSH_POLICE_RALLY_TOLERANCE,
  CITY_RUSH_POLICE_HUNT_TYPES,
  CITY_RUSH_POLICE_LEAD,
  CITY_RUSH_POLICE_LANES,
  CITY_RUSH_RACER_SLOTS,
  CITY_RUSH_TRAFFIC_COUNT,
  CITY_RUSH_TRAFFIC_LANES,
  CITY_RUSH_TRAFFIC_TYPES,
  CITY_RUSH_DRIVERS,
  selectCityRushRacers,
  cityRushMinimapPoint,
  cityRushMinimapTrackPath,
  buildCityRushMinimapState,
  approachCityRushSpeed,
  cityRushTrafficRecoveryRate,
  CITY_RUSH_TRAFFIC_RECOVERY_BOOST,
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
  cityRushLapProgress,
  cityRushLapCrossings,
  cityRushPickupBurstShards,
  cityRushPickupFlashState,
  cityRushPickupPopScale,
  cityRushPackLeader,
  cityRushPickupShardState,
  cityRushPolicePace,
  cityRushPoliceBlocksLeader,
  cityRushPoliceContact,
  cityRushPoliceDamage,
  cityRushPoliceTarget,  cityRushTrackGap,
  chooseCityRushPoliceLane,
  isCityRushPoliceLaneJammed,
  resolveCityRushPoliceMovement,
  addCityRushCharge,
  cityRushLaneAfterAction,
  consumeCityRushCharge,
  createCityRushEncounter,
  createCityRushInventory,
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
  assert.equal(CITY_RUSH_CARS.length, 4);
  assert.equal(new Set(CITY_RUSH_CARS.map((car) => car.id)).size, CITY_RUSH_CARS.length);
  for (const car of CITY_RUSH_CARS) {
    assert.ok(car.name && car.className && car.accent.startsWith('#'));
    for (const stat of ['power', 'acceleration', 'recovery']) assert.ok(car[stat] >= 0 && car[stat] <= 100);
    assert.ok(car.powerMultiplier > 0);
    assert.ok(car.accelerationRate > 0);
    assert.ok(car.hitRecoveryMultiplier > 0);
    assert.ok(car.widthScale > 0 && car.heightScale > 0 && car.lengthScale > 0);
  }
  assert.ok(new Set(CITY_RUSH_CARS.map((car) => car.widthScale)).size > 1);
  assert.ok(new Set(CITY_RUSH_CARS.map((car) => car.powerMultiplier)).size > 1);
  assert.ok(new Set(CITY_RUSH_CARS.map((car) => car.hitRecoveryMultiplier)).size > 1);
});

test('twelve slow traffic cars span four distinct types and safely block racers', () => {
  assert.equal(CITY_RUSH_TRAFFIC_COUNT, 12);
  assert.equal(CITY_RUSH_TRAFFIC_COUNT % CITY_RUSH_TRAFFIC_TYPES.length, 0);
  assert.equal(CITY_RUSH_TRAFFIC_LANES.length, CITY_RUSH_TRAFFIC_COUNT);
  assert.ok(CITY_RUSH_TRAFFIC_LANES.every((lane) => lane >= 0 && lane < CITY_RUSH_LANE_X.length));
  assert.deepEqual(CITY_RUSH_LANE_X.map((_, lane) => CITY_RUSH_TRAFFIC_LANES.filter((value) => value === lane).length), [3, 3, 3, 3]);
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
  assert.equal(chooseCityRushTrafficEscapeLane({ currentLane: 3, blockedLanes: [2] }), 1, 'la voie voisine occupée fait glisser le dégagement');
});

test('rivals plan lane changes to collect bonuses and avoid traffic safely', () => {
  const towardPickup = chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    speed: 24,
    availableLanes: [0, 1, 2],
    pickups: [{ lane: 2, distance: 40, type: 'cash' }],
  });
  assert.equal(towardPickup, 2);

  const awayFromTraffic = chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    speed: 24,
    availableLanes: [0, 1, 2],
    traffic: [{ lane: 1, distance: 48, speed: 5 }],
    slowZones: [{ lane: 1, distance: 60 }],
  });
  assert.ok(awayFromTraffic !== 1);
  assert.equal(chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    availableLanes: [1],
    pickups: [{ lane: 2, distance: 40, type: 'cash' }],
  }), 1, 'le rival ne tente pas de changer vers une voie bloquée');
});

test('rivals pursue visible bonus pickups above hazards, even when a matching bar is full', () => {
  const route = (currentLane) => chooseCityRushAiLane({
    currentLane,
    distance: 10,
    speed: 24,
    availableLanes: [0, 1, 2, 3],
    pickups: [{ lane: 3, distance: 50, type: 'cash' }],
  });
  assert.deepEqual([route(0), route(1), route(2)], [1, 2, 3], 'le rival prend la voie du bonus par étapes');

  const contestedBonusLane = chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    speed: 24,
    availableLanes: [0, 1, 2],
    pickups: [{ lane: 2, distance: 40, type: 'cash' }],
    slowZones: [{ lane: 2, distance: 44 }],
    traffic: [
      { lane: 2, distance: 40, speed: 6 },
      { lane: 2, distance: 42, speed: 6 },
      { lane: 2, distance: 45, speed: 6 },
    ],
    inventory: { cash: CITY_RUSH_POWER_CHARGE_COST.cash },
  });
  assert.equal(contestedBonusLane, 2, 'le bonus reste prioritaire sur les risques et une jauge déjà pleine');
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

test('the item effects, matching colors, and charge costs match the race rules', () => {
  assert.equal(CITY_RUSH_DISTANCE, 3000);
  assert.equal(CITY_RUSH_PLAYER_SPEED, 29);
  // Seuils de chargement : bleu 2, rouge 3, vert 2, jaune 4.
  assert.deepEqual(CITY_RUSH_POWER_CHARGE_COST, { 'blue-shot': 2, pistol: 3, cash: 2, radio: 4 });
  assert.deepEqual(Object.fromEntries(Object.entries(CITY_RUSH_POWER_RULES).map(([type, rule]) => [type, rule.key])), {
    'blue-shot': 'A', pistol: 'Z', cash: 'E', radio: 'R',
  });
  for (const [type, cost] of Object.entries(CITY_RUSH_POWER_CHARGE_COST)) {
    assert.equal(CITY_RUSH_POWER_RULES[type].chargeCost, cost);
  }
  assert.equal(CITY_RUSH_BLUE_SHOT_DURATION, 0.3);
  assert.equal(CITY_RUSH_BLUE_SHOT_SPEED_FACTOR, 0.85);
  assert.equal(CITY_RUSH_BLUE_SHOT_MAX_RANGE, CITY_RUSH_RACER_VIEW_DISTANCE);
  assert.equal(CITY_RUSH_POWER_RULES[CITY_RUSH_POWERS.BLUE_SHOT].duration, 0.3);
  assert.equal(CITY_RUSH_POWER_RULES[CITY_RUSH_POWERS.BLUE_SHOT].color, '#48b9ff');
  assert.equal(CITY_RUSH_POWER_RULES[CITY_RUSH_POWERS.BLUE_SHOT].automatic, false);
  assert.match(CITY_RUSH_POWER_RULES[CITY_RUSH_POWERS.BLUE_SHOT].description, /sans viser/i);
  assert.match(CITY_RUSH_POWER_RULES[CITY_RUSH_POWERS.CASH].name, /boisson énergisante/i);
  assert.equal(CITY_RUSH_POWER_RULES.pistol.duration, 2);
  assert.equal(CITY_RUSH_POWER_RULES.pistol.color, '#ff526e');
  assert.equal(CITY_RUSH_POWER_RULES.pistol.automatic, false);
  assert.equal(CITY_RUSH_POWER_RULES.cash.duration, 1.5);
  assert.equal(CITY_RUSH_POWER_RULES.cash.color, '#50e48a');
  assert.equal(CITY_RUSH_POWER_RULES.cash.automatic, true);
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

test('matching pickups charge independent bars, and only a full bar can be used', () => {
  let inventory = createCityRushInventory();
  inventory = addCityRushCharge(inventory, CITY_RUSH_POWERS.BLUE_SHOT, 1);
  inventory = addCityRushCharge(inventory, 'pistol', 2);
  assert.equal(inventory[CITY_RUSH_POWERS.BLUE_SHOT], 1);
  assert.equal(inventory.pistol, 2);
  assert.equal(inventory.cash, 0);
  // Une jauge incomplète ne se consomme pas.
  assert.equal(consumeCityRushCharge(inventory, CITY_RUSH_POWERS.BLUE_SHOT).consumed, false);
  assert.equal(consumeCityRushCharge(inventory, 'pistol').consumed, false);

  // Les seuils abaissés sont atteints : bleu 2 et rouge 3 restent indépendants.
  inventory = addCityRushCharge(inventory, CITY_RUSH_POWERS.BLUE_SHOT, 1);
  inventory = addCityRushCharge(inventory, 'pistol', 1);
  assert.equal(inventory[CITY_RUSH_POWERS.BLUE_SHOT], CITY_RUSH_POWER_CHARGE_COST[CITY_RUSH_POWERS.BLUE_SHOT]);
  assert.equal(inventory.pistol, CITY_RUSH_POWER_CHARGE_COST.pistol);
  assert.equal(inventory.cash, 0);
  assert.equal(consumeCityRushCharge(inventory, CITY_RUSH_POWERS.BLUE_SHOT).inventory[CITY_RUSH_POWERS.BLUE_SHOT], 0);

  const usedShot = consumeCityRushCharge(inventory, CITY_RUSH_POWERS.BLUE_SHOT);
  assert.equal(usedShot.consumed, true);
  assert.equal(usedShot.inventory[CITY_RUSH_POWERS.BLUE_SHOT], 0);
  assert.equal(usedShot.inventory.pistol, CITY_RUSH_POWER_CHARGE_COST.pistol);
  assert.equal(consumeCityRushCharge(usedShot.inventory, CITY_RUSH_POWERS.BLUE_SHOT).consumed, false);
  assert.equal(consumeCityRushCharge(inventory, 'unknown').consumed, false);

  const overfilled = addCityRushCharge(createCityRushInventory(), 'radio', 99);
  assert.equal(overfilled.radio, CITY_RUSH_POWER_CHARGE_COST.radio);
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
  // Rouge (mitrailleuse) et jaune (hélicoptère) : exactement les deux pouvoirs
  // de tir, ceux qui privent le leader de ses armes.
  assert.deepEqual([...CITY_RUSH_POLICE_HUNT_TYPES], ['pistol', 'radio']);
  assert.equal(CITY_RUSH_POWER_RULES.pistol.color, '#ff526e');
  assert.equal(CITY_RUSH_POWER_RULES.radio.color, '#ffd44f');
  // Aucune berline ne porte un identifiant de pilote classé : la grille reste
  // à quatre, et l'arrivée ne peut pas les compter.
  assert.deepEqual([...CITY_RUSH_RACER_SLOTS], ['player', 'nova', 'juno', 'ace']);
  // L'escouade encadre la piste par les voies extérieures, et son barrage est
  // encadré dans le temps : elle se rabat, freine, puis repart.
  assert.deepEqual([...CITY_RUSH_POLICE_LANES], [0, 3]);
  assert.ok(CITY_RUSH_POLICE_BLOCKADE_RANGE > CITY_RUSH_CAR_GAP);
  assert.ok(CITY_RUSH_POLICE_BLOCKADE_HOLD > 0);
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

test('l’escouade traverse la route pour rafler un bonus rouge ou jaune', () => {
  const common = {
    currentLane: 1,
    distance: 1000,
    speed: 26,
    availableLanes: [0, 1, 2, 3],
    lookAheadDistance: 200,
  };
  // Un jaune plus loin l'emporte sur une boisson toute proche : la berline
  // s'écarte de sa voie et se rabat vers le talkie-walkie (voie 3).
  const pickups = [
    { lane: 0, type: 'cash', distance: 1040 },
    { lane: 3, type: 'radio', distance: 1180 },
  ];
  assert.equal(chooseCityRushPoliceLane({ ...common, pickups }), 2);
  // Une IA ordinaire, elle, prend les bonus les plus proches.
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
  assert.notEqual(chooseCityRushPoliceLane({ ...common, pickups: [{ ...pickups[0], type: 'radio' }], traffic: [truck] }), 1, 'le jaune non plus');
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
  // Le talkie-walkie jaune est dans la voie 2, mais un camion le garde : elle
  // reste dans sa voie libre plutôt que de s'engluer.
  const radio = [{ lane: 2, type: 'radio', distance: 1060 }];
  assert.equal(chooseCityRushPoliceLane({ ...common, pickups: radio, traffic: [] }), 2, 'voie libre : elle fonce le chercher');
  assert.equal(chooseCityRushPoliceLane({ ...common, pickups: radio, traffic: [slow(2)] }), 1);
  // Bouchée et sa voisine aussi : elle prend la seule voie dégagée, même loin du bonus.
  assert.equal(chooseCityRushPoliceLane({ ...common, pickups: radio, traffic: [slow(1), slow(2)] }), 0);
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
test('au dernier tour, la riposte rouge et jaune peut viser la berline la plus proche', () => {
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

test('barre de vie des berlines : deux tirs bleus, OU une rafale rouge, OU un hélico', () => {
  // Le barème de dégât est pur : la berline encaisse 2 points de vie.
  assert.equal(CITY_RUSH_POLICE_HEALTH, 2, 'une berline part avec deux points de vie');
  assert.equal(CITY_RUSH_POLICE_DAMAGE[CITY_RUSH_POWERS.BLUE_SHOT], 1, 'un tir droit bleu retire un point');
  assert.equal(CITY_RUSH_POLICE_DAMAGE[CITY_RUSH_POWERS.PISTOL], CITY_RUSH_POLICE_HEALTH, 'la rafale rouge détruit d’un coup');
  assert.equal(CITY_RUSH_POLICE_DAMAGE[CITY_RUSH_POWERS.RADIO], CITY_RUSH_POLICE_HEALTH, 'le tir d’hélico détruit d’un coup');
  // Deux tirs bleus successifs abattent la berline ; le premier la laisse à 1.
  const afterFirstBlue = cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.BLUE_SHOT);
  assert.equal(afterFirstBlue, 1, 'le premier tir bleu laisse la berline debout');
  assert.equal(cityRushPoliceDamage(afterFirstBlue, CITY_RUSH_POWERS.BLUE_SHOT), 0, 'le second tir bleu la détruit');
  // Une rafale rouge ou un hélico détruisent dès le premier coup.
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.PISTOL), 0);
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.RADIO), 0);
  // La vie ne descend jamais sous zéro, même sous le feu nourri.
  assert.equal(cityRushPoliceDamage(0, CITY_RUSH_POWERS.BLUE_SHOT), 0, 'une épave ne prend plus de dégâts');
  assert.equal(cityRushPoliceDamage(1, CITY_RUSH_POWERS.PISTOL), 0);
  // Source inconnue ou invalide : aucun dégât.
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, 'cash'), CITY_RUSH_POLICE_HEALTH);
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, null), CITY_RUSH_POLICE_HEALTH);
  assert.equal(cityRushPoliceDamage(Number.NaN, CITY_RUSH_POWERS.BLUE_SHOT), 0);
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
  const pickups = [{ lane: 1, type: 'cash', distance: 1030 }];
  const cutIn = chooseCityRushPoliceLane({
    ...common, currentLane: 2, pickups, interceptLane: 3, interceptGap: 14,
  });
  assert.equal(cutIn, 3, 'elle coupe la route au leader');
  // Un rouge ou un jaune reste prioritaire sur le barrage.
  assert.equal(chooseCityRushPoliceLane({
    ...common, currentLane: 2, pickups: [{ lane: 1, type: 'radio', distance: 1030 }], interceptLane: 3, interceptGap: 14,
  }), 1, 'un jaune vaut plus qu’un barrage');
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
  // Un rouge/jaune lointain ne détourne pas le barrage : seule une prise à
  // portée de capot (CITY_RUSH_POLICE_HUNT_RANGE) passe avant.
  assert.equal(chooseCityRushPoliceLane({
    ...common, currentLane: 2, pickups: [{ lane: 1, type: 'radio', distance: 1000 + CITY_RUSH_POLICE_HUNT_RANGE + 90 }],
    interceptLane: 3, interceptGap: 14,
  }), 3, 'un jaune hors de portée ne détourne pas le barrage');
  // Engluée derrière un pilote (« stuck »), la berline s'extrait de la voie
  // même si un bonus ordinaire l'y appelait.
  assert.equal(chooseCityRushPoliceLane({
    ...common, currentLane: 2, pickups: [{ lane: 2, type: 'cash', distance: 1020 }],
    racers: [{ lane: 2, distance: 1008, speed: 24 }], stuck: true,
  }), 1, 'elle préfère changer de voie plutôt que rester collée');});

test('lane changes clamp at the road edges', () => {
  assert.equal(CITY_RUSH_LANE_X.length, 4);
  assert.equal(cityRushLaneAfterAction(1, 'left'), 0);
  assert.equal(cityRushLaneAfterAction(2, 'right'), 3);
  assert.equal(cityRushLaneAfterAction(0, 'left'), 0);
  assert.equal(cityRushLaneAfterAction(3, 'right'), 3);
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

test('pickup encounters add more bonuses without placing them in slow zones', () => {
  let seed = 112;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  let sawSlowZone = false;
  let sawEmptyRow = false;
  let sawTwoPickups = false;
  let totalPickups = 0;
  const pickupCounts = { cash: 0, 'blue-shot': 0, pistol: 0, radio: 0 };
  for (let index = 0; index < 10000; index += 1) {
    const encounter = createCityRushEncounter(random);
    assert.ok(encounter.pickups.length <= 2);
    totalPickups += encounter.pickups.length;
    for (const pickup of encounter.pickups) pickupCounts[pickup.type] += 1;
    if (encounter.pickups.length === 0) sawEmptyRow = true;
    const pickupLanes = new Set();
    for (const pickup of encounter.pickups) {
      assert.ok(pickup.lane >= 0 && pickup.lane < CITY_RUSH_LANE_X.length);
      assert.ok(['cash', CITY_RUSH_POWERS.BLUE_SHOT, 'pistol', 'radio'].includes(pickup.type));
      assert.ok(!pickupLanes.has(pickup.lane));
      pickupLanes.add(pickup.lane);
      assert.notEqual(pickup.lane, encounter.slowLane);
    }
    if (encounter.slowLane !== null) {
      sawSlowZone = true;
      assert.ok(encounter.slowLane >= 0 && encounter.slowLane < CITY_RUSH_LANE_X.length);
    }
    if (encounter.pickups.length === 2) sawTwoPickups = true;
  }
  assert.equal(sawSlowZone, true);
  const yellowRate = pickupCounts.radio / totalPickups;
  assert.ok(yellowRate >= 0.08 && yellowRate <= 0.12, `le bonus jaune reste rare (${(yellowRate * 100).toFixed(1)} %)`);
  assert.ok(pickupCounts.radio < pickupCounts.cash && pickupCounts.radio < pickupCounts['blue-shot'] && pickupCounts.radio < pickupCounts.pistol);
  assert.equal(sawEmptyRow, true);
  assert.equal(sawTwoPickups, true);
  assert.ok(totalPickups > 10000 && totalPickups < 11000, 'les rangées contiennent souvent un bonus et parfois un duo');
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

test('a race is five laps of the same 600 m loop', () => {
  assert.equal(CITY_RUSH_LAPS, 5);
  assert.equal(CITY_RUSH_LAP_LENGTH, 600);
  assert.equal(CITY_RUSH_DISTANCE, CITY_RUSH_LAPS * CITY_RUSH_LAP_LENGTH);

  assert.equal(cityRushLapForDistance(0), 1);
  assert.equal(cityRushLapForDistance(599.9), 1);
  assert.equal(cityRushLapForDistance(600), 2);
  assert.equal(cityRushLapForDistance(1250), 3);
  // Le compteur reste borné une fois l'arrivée franchie (ou avec une entrée invalide).
  assert.equal(cityRushLapForDistance(1800), 4);
  assert.equal(cityRushLapForDistance(3000), 5);
  assert.equal(cityRushLapForDistance(4000), 5);
  assert.equal(cityRushLapForDistance(-20), 1);
  assert.equal(cityRushLapForDistance(Number.NaN), 1);

  assert.equal(cityRushLapProgress(0), 0);
  assert.equal(cityRushLapProgress(150), 0.25);
  assert.equal(cityRushLapProgress(600), 0);
  assert.equal(cityRushLapProgress(1500), 0.5);
  assert.equal(cityRushLapProgress(1800), 0);
  assert.equal(cityRushLapProgress(3000), 1);
  assert.equal(cityRushLapProgress(3600), 1);
});

test('crossing the start line is detected once per lap, the last crossing being the finish', () => {
  assert.deepEqual(cityRushLapCrossings(0, 20), []);
  assert.deepEqual(cityRushLapCrossings(590, 605), [1]);
  assert.deepEqual(cityRushLapCrossings(600, 600), []);
  assert.deepEqual(cityRushLapCrossings(599, 600), [1]);
  assert.deepEqual(cityRushLapCrossings(1190, 1210), [2]);
  assert.deepEqual(cityRushLapCrossings(1799, 1830), [3]);
  assert.deepEqual(cityRushLapCrossings(2990, 3010), [5]);
  // Un très grand pas de simulation ne saute aucune ligne, et rien au-delà de l'arrivée.
  assert.deepEqual(cityRushLapCrossings(10, 3100), [1, 2, 3, 4, 5]);
  assert.deepEqual(cityRushLapCrossings(3000, 3600), []);
  // Reculer (ou rester immobile) ne compte jamais de passage.
  assert.deepEqual(cityRushLapCrossings(620, 580), []);
  // Une boucle personnalisée suit les mêmes règles.
  assert.deepEqual(cityRushLapCrossings(95, 205, 100, 5), [1, 2]);
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

test('the 4 racers have distinct avatars and international names from around the world', () => {
  assert.ok(CITY_RUSH_DRIVERS.length >= 12);
  const avatarIds = new Set(CITY_RUSH_DRIVERS.map((driver) => driver.avatarId));
  const countryCodes = new Set(CITY_RUSH_DRIVERS.map((driver) => driver.countryCode));
  assert.equal(avatarIds.size, CITY_RUSH_DRIVERS.length);
  assert.equal(countryCodes.size, CITY_RUSH_DRIVERS.length);

  for (const city of CITY_RUSH_CITIES) {
    const roster = selectCityRushRacers({ cityId: city.id });
    assert.equal(roster.length, 4);
    assert.deepEqual(roster.map((racer) => racer.id), ['player', 'nova', 'juno', 'ace']);
    assert.equal(roster[0].isPlayer, true);
    assert.equal(roster[1].isPlayer, false);
    assert.equal(new Set(roster.map((racer) => racer.driverId)).size, 4);
    assert.equal(new Set(roster.map((racer) => racer.avatarId)).size, 4);
    assert.equal(new Set(roster.map((racer) => racer.name)).size, 4);
    assert.equal(new Set(roster.map((racer) => racer.countryCode)).size, 4);
    for (const racer of roster) {
      assert.ok(racer.name && racer.displayName && racer.country && racer.flag && racer.avatar);
    }
  }

  const customRoster = selectCityRushRacers({ cityId: 'tokyo', playerDriverId: 'kwame' });
  assert.equal(customRoster[0].driverId, 'kwame');
  assert.equal(customRoster[0].name, 'KWAME');
  assert.equal(customRoster[0].country, 'Nigeria');
  assert.equal(new Set(customRoster.map((racer) => racer.avatarId)).size, 4);
});

test('the race mini-map locates all 4 players on the circuit loop and focuses on our player', () => {
  const path = cityRushMinimapTrackPath(32);
  assert.ok(path.startsWith('M ') && path.endsWith(' Z'));

  const startLeft = cityRushMinimapPoint(0, 0);
  const startRight = cityRushMinimapPoint(0, 3);
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
    { ...roster[3], distance: 310, lane: 3 },
  ]).ordered;

  const minimap = buildCityRushMinimapState(standings, { cityId: 'vice-city', playerDriverId: 'chloe' });
  assert.equal(minimap.markers.length, 4);
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

test('la mini-carte dessine l’escouade de police à part des quatre pilotes', () => {
  const minimap = buildCityRushMinimapState([], {
    cityId: 'vice-city',
    pursuers: [
      { id: 'police-1', name: 'POLICE 1', distance: 1250, lane: 3, mode: 'blockade', blocking: true },
      { id: 'police-2', name: 'POLICE 2', distance: 1240, lane: 0 },
    ],
  });
  // Les quatre pilotes restent seuls dans le classement : l'escouade a sa
  // propre liste, hors positions et hors arrivée.
  assert.equal(minimap.racers.length, 4);
  assert.equal(minimap.pursuers.length, 2);
  assert.equal(minimap.pursuers[0].name, 'POLICE 1');
  for (const car of minimap.pursuers) {
    assert.ok(Number.isFinite(car.x) && Number.isFinite(car.y));
    assert.ok(car.lane === 0 || car.lane === 3);
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


test('a car recovers its speed faster after being held behind traffic', () => {
  assert.ok(CITY_RUSH_TRAFFIC_RECOVERY_BOOST > 1);
  assert.equal(cityRushTrafficRecoveryRate(9, 0), 9);
  assert.equal(cityRushTrafficRecoveryRate(9, 1), 9 * CITY_RUSH_TRAFFIC_RECOVERY_BOOST);
  const normal = approachCityRushSpeed(5, 29, cityRushTrafficRecoveryRate(9, 0), 1);
  const recovering = approachCityRushSpeed(5, 29, cityRushTrafficRecoveryRate(9, 1), 1);
  assert.ok(recovering > normal + 10);
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
