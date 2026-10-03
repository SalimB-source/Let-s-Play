import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CITY_RUSH_CITIES,
  CITY_RUSH_CARS,
  CITY_RUSH_DEFAULT_DIFFICULTY,
  CITY_RUSH_DIFFICULTIES,
  CITY_RUSH_DISTANCE,
  CITY_RUSH_LAPS,
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_TRACK_BEHIND,
  CITY_RUSH_PLAYER_SPEED,
  CITY_RUSH_BOOST_MULTIPLIER,
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
  CITY_RUSH_RIVAL_AI,
  CITY_RUSH_SLOW_MULTIPLIER,
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
  cityRushBestKey,
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
  cityRushRivalAI,
  cityRushRivalAcceleration,
  cityRushRivalBaseSpeed,
  cityRushRivalPace,
  cityRushRivalPistolTarget,
  cityRushTimeToBlock,
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
  normalizeCityRushDifficulty,
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

  // Une zone de ralentissement ou un véhicule lointain ne détournent pas un
  // rival d'un bonus qu'il atteint avant eux, même quand la jauge est pleine.
  const hazardsBeyondTheBonus = chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    speed: 24,
    availableLanes: [0, 1, 2],
    pickups: [{ lane: 2, distance: 40, type: 'cash' }],
    slowZones: [{ lane: 2, distance: 60 }],
    traffic: [{ lane: 2, distance: 130, speed: 6 }],
    inventory: { cash: CITY_RUSH_POWER_CHARGE_COST.cash },
  });
  assert.equal(hazardsBeyondTheBonus, 2, 'le bonus reste prioritaire sur les risques lointains et une jauge déjà pleine');
});

test('rivals ignore a bonus hidden behind slow traffic instead of getting stuck behind it', () => {
  // Le bonus est collé à trois véhicules lents : l'atteindre, c'est rester
  // coincé derrière eux (c'est ainsi que les rivaux perdaient ~30 % de la course).
  const hiddenBonus = chooseCityRushAiLane({
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
  });
  assert.equal(hiddenBonus, 1, 'le rival reste dans sa voie libre');

  // Même bonus, mais le véhicule lent est loin derrière : le rival le prend d'abord.
  const reachableBonus = chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    speed: 24,
    availableLanes: [0, 1, 2],
    pickups: [{ lane: 2, distance: 40, type: 'cash' }],
    traffic: [{ lane: 2, distance: 100, speed: 6 }],
  });
  assert.equal(reachableBonus, 2, 'un bonus atteint avant le blocage reste visé');

  // Un bonus caché dans une voie lointaine n'attire pas non plus le rival vers elle.
  const hiddenTwoLanesAway = chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    speed: 24,
    availableLanes: [0, 1, 2],
    pickups: [{ lane: 3, distance: 40, type: 'cash' }],
    traffic: [{ lane: 3, distance: 41, speed: 6 }],
  });
  assert.equal(hiddenTwoLanesAway, 1);
});

test('a slow vehicle is a dated blocker: rivals leave in time, but not for one they never catch', () => {
  const lane = (vehicleSpeed, gap = 60) => chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    speed: 24,
    availableLanes: [0, 1, 2],
    traffic: [{ lane: 1, distance: 10 + gap, speed: vehicleSpeed }],
  });
  assert.notEqual(lane(6), 1, 'un véhicule lent qui approche fait quitter la voie');
  assert.equal(lane(24), 1, 'un véhicule aussi rapide que soi ne bloquera jamais');
  assert.equal(lane(23.9), 1, 'un écart de vitesse négligeable n\'est pas une menace');
  assert.equal(lane(15, 100), 1, 'un véhicule à peine plus lent, qui ne bloquera que dans plus de 10 s, ne vaut pas un zigzag');
  assert.notEqual(lane(6, 12), 1, 'un véhicule déjà tout proche est évité sans attendre');
});

test('rivals keep clear of other race cars and let a rival take a bonus it will reach first', () => {
  // Les voitures de course se traversent : on ne reste pas « dans » l'une d'elles.
  const crowded = chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    speed: 24,
    availableLanes: [0, 1, 2],
    racers: [{ lane: 1, distance: 11 }],
  });
  assert.notEqual(crowded, 1, 'le rival quitte la voie où une autre voiture roule à son niveau');
  const alone = chooseCityRushAiLane({ currentLane: 1, distance: 10, speed: 24, availableLanes: [0, 1, 2] });
  assert.equal(alone, 1, 'sans voisin ni bonus, il ne bouge pas pour rien');
  const farBehind = chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    speed: 24,
    availableLanes: [0, 1, 2],
    racers: [{ lane: 1, distance: -30 }],
  });
  assert.equal(farBehind, 1, 'une voiture loin derrière ne dérange pas');

  // Deux bonus identiques : celui qu'une autre voiture va prendre avant est délaissé.
  const pickups = [
    { lane: 0, distance: 40, type: 'cash' },
    { lane: 2, distance: 40, type: 'cash' },
  ];
  const plain = chooseCityRushAiLane({ currentLane: 1, distance: 10, speed: 24, availableLanes: [0, 1, 2], pickups });
  const contested = chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    speed: 24,
    availableLanes: [0, 1, 2],
    pickups,
    racers: [{ lane: plain, distance: 14 }],
  });
  assert.notEqual(contested, plain, 'le rival se rabat sur l\'autre bonus');
  const alreadyBehind = chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    speed: 24,
    availableLanes: [0, 1, 2],
    pickups,
    racers: [{ lane: plain, distance: 3 }],
  });
  assert.equal(alreadyBehind, plain, 'une voiture déjà derrière ne lui prendra rien');
});

test('rivals prefer the weapon bonuses according to their taste for weapons', () => {
  const lanes = [0, 1, 2, 3];
  const pick = (types, ai) => chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    speed: 24,
    availableLanes: lanes,
    pickups: [{ lane: 0, distance: 40, type: types[0] }, { lane: 2, distance: 40, type: types[1] }],
    ai,
  });
  assert.equal(pick(['cash', 'pistol'], { ...CITY_RUSH_RIVAL_AI, weaponBias: 2 }), 2, 'avec un goût prononcé pour les armes');
  assert.equal(pick(['pistol', 'cash'], { ...CITY_RUSH_RIVAL_AI, weaponBias: 2 }), 0);
  assert.equal(pick(['cash', 'pistol'], { ...CITY_RUSH_RIVAL_AI, weaponBias: 0.5 }), 0, 'et l\'inverse avec un faible goût');
});

test('time to block counts the closing speed and ignores vehicles that cannot be caught', () => {
  assert.ok(Math.abs(cityRushTimeToBlock(30, 24, 6, 4.8) - 25.2 / 18) < 1e-9);
  assert.equal(cityRushTimeToBlock(4.8, 24, 6, 4.8), 0, 'déjà dans la distance de sécurité');
  assert.equal(cityRushTimeToBlock(2, 24, 6, 4.8), 0);
  assert.equal(cityRushTimeToBlock(60, 24, 24, 4.8), Infinity, 'même vitesse : jamais rattrapé');
  assert.equal(cityRushTimeToBlock(60, 20, 24, 4.8), Infinity, 'plus rapide que soi : jamais rattrapé');
  assert.equal(cityRushTimeToBlock(Number.NaN, 24, 6), Infinity);
  assert.ok(cityRushTimeToBlock(60, 26, 6) < cityRushTimeToBlock(60, 20, 6), 'on se fait rattraper plus tôt en roulant plus vite');
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

test('rivals and the player suffer and enjoy the same slow-down and boost', () => {
  // Ces valeurs étaient codées en dur côté joueur (0,63 / 1,46) ; les rivaux
  // avaient 0,56 / 1,38 et étaient donc toujours moins bien lotis.
  assert.equal(CITY_RUSH_SLOW_MULTIPLIER, 0.63);
  assert.equal(CITY_RUSH_BOOST_MULTIPLIER, 1.46);
  assert.ok(CITY_RUSH_SLOW_MULTIPLIER < 1 && CITY_RUSH_BOOST_MULTIPLIER > 1);
});

test('rivals chase a player who pulls away and ease off when they escape far ahead', () => {
  const ai = CITY_RUSH_RIVAL_AI;
  assert.equal(cityRushRivalPace(0, ai), 1, 'à hauteur du joueur : allure normale');
  assert.equal(cityRushRivalPace(Number.NaN, ai), 1);
  // Rattrapage : plus on est distancé, plus on pousse, jusqu'à un plafond.
  const behind = [5, 20, 50, 80, ai.catchUpRange, ai.catchUpRange * 3].map((gap) => cityRushRivalPace(gap, ai));
  for (let index = 1; index < behind.length; index += 1) assert.ok(behind[index] >= behind[index - 1], 'le rattrapage ne diminue pas');
  assert.ok(behind[0] > 1);
  assert.ok(Math.abs(behind[4] - (1 + ai.catchUpBoost)) < 1e-9, 'plafond atteint à catchUpRange');
  assert.equal(behind[5], behind[4]);
  // Laisse : tolérée sur `leashStart` mètres, puis de plus en plus freinée, jusqu'à un plancher.
  assert.equal(cityRushRivalPace(-ai.leashStart, ai), 1);
  assert.equal(cityRushRivalPace(-5, ai), 1);
  const ahead = [ai.leashStart + 10, 50, 70, ai.leashRange, ai.leashRange * 3].map((gap) => cityRushRivalPace(-gap, ai));
  for (let index = 1; index < ahead.length; index += 1) assert.ok(ahead[index] <= ahead[index - 1], 'la laisse ne se relâche pas');
  assert.ok(ahead[0] < 1);
  assert.ok(Math.abs(ahead[3] - (1 - ai.leashSlow)) < 1e-9, 'plancher atteint à leashRange');
  assert.equal(ahead[4], ahead[3]);
  // Sans réglage, plus aucun effet.
  assert.equal(cityRushRivalPace(80, { ...ai, catchUpBoost: 0 }), 1);
  assert.equal(cityRushRivalPace(-80, { ...ai, leashSlow: 0 }), 1);
});

test('rivals race at the pace of the player car, keeping only a slice of their own car', () => {
  const ai = CITY_RUSH_RIVAL_AI;
  for (const player of CITY_RUSH_CARS) {
    for (const rival of CITY_RUSH_CARS.filter((car) => car.id !== player.id)) {
      // Sans caractère propre, tous les rivaux roulent exactement au rythme du joueur.
      const aligned = { ...ai, carCharacter: 0, paceFactor: 1 };
      assert.ok(Math.abs(cityRushRivalBaseSpeed(rival, player, aligned) - CITY_RUSH_PLAYER_SPEED * player.powerMultiplier) < 1e-9);
      assert.ok(Math.abs(cityRushRivalAcceleration(rival, player, aligned) - player.accelerationRate) < 1e-9);
      // Avec tout son caractère, un rival retrouve sa propre voiture.
      const own = { ...ai, carCharacter: 1, paceFactor: 1 };
      assert.ok(Math.abs(cityRushRivalBaseSpeed(rival, player, own) - CITY_RUSH_PLAYER_SPEED * rival.powerMultiplier) < 1e-9);
      assert.ok(Math.abs(cityRushRivalAcceleration(rival, player, own) - rival.accelerationRate) < 1e-9);
      // Réglage par défaut : le choix de voiture ne décide pas de la course
      // (quelques décimètres au départ suffisent à faire basculer une course serrée).
      const share = cityRushRivalBaseSpeed(rival, player, ai) / (CITY_RUSH_PLAYER_SPEED * player.powerMultiplier);
      assert.ok(Math.abs(share - ai.paceFactor) <= ai.carCharacter * 0.062, `${rival.id} face à ${player.id} : ${share.toFixed(4)}`);
      const launch = cityRushRivalAcceleration(rival, player, ai) / player.accelerationRate;
      assert.ok(Math.abs(launch - 1) <= ai.carCharacter * 0.15, `${rival.id} face à ${player.id} : accélération ×${launch.toFixed(3)}`);
    }
  }
  // Le facteur d'allure est le bouton de difficulté.
  const player = CITY_RUSH_CARS[0];
  const rival = CITY_RUSH_CARS[1];
  assert.ok(cityRushRivalBaseSpeed(rival, player, { ...ai, paceFactor: 1.01 }) > cityRushRivalBaseSpeed(rival, player, { ...ai, paceFactor: 0.99 }));
  // Profils absents ou incomplets : on retombe sur une vitesse sûre.
  assert.ok(cityRushRivalBaseSpeed(null, null, ai) > 0);
  assert.ok(cityRushRivalAcceleration({ accelerationRate: 9 }, null, ai) > 0);
});

test('a rival machine-guns the player first when in range, otherwise the nearest car ahead', () => {
  const ai = CITY_RUSH_RIVAL_AI;
  const grid = (player, nova, juno, ace) => [
    { id: 'player', name: 'TOI', distance: player, lane: 1 },
    { id: 'nova', name: 'NOVA', distance: nova, lane: 0 },
    { id: 'juno', name: 'JUNO', distance: juno, lane: 2 },
    { id: 'ace', name: 'ACE', distance: ace, lane: 3 },
  ];
  // Le joueur devant, à portée : il passe avant un rival plus proche.
  assert.equal(cityRushRivalPistolTarget('nova', grid(140, 100, 112, 90), ai)?.id, 'player');
  // Le joueur le plus proche mais hors de portée : la rafale est gardée.
  assert.equal(cityRushRivalPistolTarget('nova', grid(100 + ai.pistolRange + 20, 100, 60, 50), ai), null);
  // Le joueur derrière : le rival tire sur la voiture la plus proche devant lui.
  assert.equal(cityRushRivalPistolTarget('nova', grid(80, 100, 130, 110), ai)?.id, 'ace');
  // Personne devant : rien à viser.
  assert.equal(cityRushRivalPistolTarget('nova', grid(80, 100, 90, 60), ai), null);
  // Une voiture à peu près à la même hauteur reste une cible valide (tolérance de 1 m).
  assert.equal(cityRushRivalPistolTarget('nova', grid(60, 100, 100.5, 40), ai)?.id, 'juno');
  // Rival inconnu ou liste vide : pas de cible, pas d'erreur.
  assert.equal(cityRushRivalPistolTarget('ghost', grid(140, 100, 112, 90), ai), null);
  assert.equal(cityRushRivalPistolTarget('nova', [], ai), null);
});

test('a rival that does not focus on the player shoots the nearest car ahead, player or not', () => {
  const calm = { ...CITY_RUSH_RIVAL_AI, focusPlayer: false };
  const grid = (player, nova, juno, ace) => [
    { id: 'player', name: 'TOI', distance: player, lane: 1 },
    { id: 'nova', name: 'NOVA', distance: nova, lane: 0 },
    { id: 'juno', name: 'JUNO', distance: juno, lane: 2 },
    { id: 'ace', name: 'ACE', distance: ace, lane: 3 },
  ];
  // Le joueur devant, à portée, mais un rival plus proche : c'est le rival qui est visé
  // (avec focusPlayer, le joueur passait avant).
  assert.equal(cityRushRivalPistolTarget('nova', grid(140, 100, 112, 90), calm)?.id, 'juno');
  assert.equal(cityRushRivalPistolTarget('nova', grid(140, 100, 112, 90), CITY_RUSH_RIVAL_AI)?.id, 'player');
  // Le joueur est la voiture la plus proche devant : il est visé, s'il est à portée seulement.
  assert.equal(cityRushRivalPistolTarget('nova', grid(130, 100, 160, 150), calm)?.id, 'player');
  assert.equal(cityRushRivalPistolTarget('nova', grid(100 + calm.pistolRange + 20, 100, 400, 450), calm), null);
  // Le joueur derrière : rien ne change.
  assert.equal(cityRushRivalPistolTarget('nova', grid(80, 100, 130, 110), calm)?.id, 'ace');
  // Un réglage sans `focusPlayer` (objet partiel) garde le comportement d'origine : le joueur d'abord.
  const { focusPlayer, ...legacy } = CITY_RUSH_RIVAL_AI;
  assert.equal(focusPlayer, true);
  assert.equal(cityRushRivalPistolTarget('nova', grid(140, 100, 112, 90), legacy)?.id, 'player');
});

test('the three difficulty modes are Facile, Normal and Difficile, Normal being the default', () => {
  assert.deepEqual(CITY_RUSH_DIFFICULTIES.map((mode) => mode.id), ['easy', 'normal', 'hard']);
  assert.deepEqual(CITY_RUSH_DIFFICULTIES.map((mode) => mode.name), ['Facile', 'Normal', 'Difficile']);
  assert.equal(CITY_RUSH_DEFAULT_DIFFICULTY, 'normal');
  assert.ok(Object.isFrozen(CITY_RUSH_DIFFICULTIES));
  for (const mode of CITY_RUSH_DIFFICULTIES) {
    assert.ok(Object.isFrozen(mode) && Object.isFrozen(mode.ai), `${mode.id} : modes figés`);
    assert.ok(mode.tagline.length > 20 && mode.tagline.length <= 130, `${mode.id} : une phrase d'explication`);
  }
  // Un identifiant altéré (stockage local ancien ou modifié à la main) ne casse rien.
  assert.equal(normalizeCityRushDifficulty('easy'), 'easy');
  assert.equal(normalizeCityRushDifficulty('hard'), 'hard');
  for (const bad of [undefined, null, '', 'HARD', 'impossible', 2, {}, ['easy']]) {
    assert.equal(normalizeCityRushDifficulty(bad), 'normal', String(bad));
  }
});

test('Normal is the base rival tuning, the other modes only list what differs from it', () => {
  assert.equal(cityRushRivalAI('normal'), CITY_RUSH_RIVAL_AI, 'Normal est le réglage de base lui-même');
  assert.equal(cityRushRivalAI(), CITY_RUSH_RIVAL_AI, 'sans argument : Normal');
  assert.equal(cityRushRivalAI('inconnu'), CITY_RUSH_RIVAL_AI, 'niveau inconnu : Normal');
  assert.deepEqual(CITY_RUSH_DIFFICULTIES.find((mode) => mode.id === 'normal').ai, {});
  const baseKeys = Object.keys(CITY_RUSH_RIVAL_AI);
  for (const mode of CITY_RUSH_DIFFICULTIES) {
    const ai = cityRushRivalAI(mode.id);
    assert.ok(Object.isFrozen(ai), `${mode.id} : réglage partagé, donc figé`);
    assert.equal(cityRushRivalAI(mode.id), ai, `${mode.id} : construit une seule fois`);
    assert.deepEqual(Object.keys(ai).sort(), [...baseKeys].sort(), `${mode.id} : les mêmes réglages que le Normal`);
    for (const key of Object.keys(mode.ai)) {
      assert.ok(baseKeys.includes(key), `${mode.id} : « ${key} » n'est pas un réglage des rivaux (faute de frappe ?)`);
    }
    for (const key of baseKeys) {
      assert.equal(ai[key], key in mode.ai ? mode.ai[key] : CITY_RUSH_RIVAL_AI[key], `${mode.id} : ${key}`);
    }
  }
  // Facile et Difficile changent bien quelque chose, et l'allure en premier.
  for (const id of ['easy', 'hard']) assert.ok(Object.keys(CITY_RUSH_DIFFICULTIES.find((mode) => mode.id === id).ai).includes('paceFactor'), id);
});

test('each step up in difficulty is stricter on pace, reflexes, mistakes and weapons', () => {
  const [easy, normal, hard] = CITY_RUSH_DIFFICULTIES.map((mode) => cityRushRivalAI(mode.id));
  // Plus la valeur est haute, plus le rival est dur…
  for (const key of ['paceFactor', 'catchUpBoost', 'lookAhead', 'laneAgility', 'pickupValue', 'weaponBias', 'pistolRange', 'focusPlayer']) {
    assert.ok(Number(easy[key]) <= Number(normal[key]) && Number(normal[key]) <= Number(hard[key]), `${key} : ${easy[key]} ≤ ${normal[key]} ≤ ${hard[key]}`);
  }
  // … et ici, plus elle est basse (réaction, erreurs, répit laissé au joueur, recharge des armes, laisse).
  for (const key of ['reactionMin', 'reactionMax', 'mistakeChance', 'mistakeMax', 'attackSpacing', 'weaponCooldown', 'leashSlow']) {
    assert.ok(Number(easy[key]) >= Number(normal[key]) && Number(normal[key]) >= Number(hard[key]), `${key} : ${easy[key]} ≥ ${normal[key]} ≥ ${hard[key]}`);
  }
  // Le bouton principal bouge réellement d'un niveau à l'autre.
  assert.ok(easy.paceFactor < normal.paceFactor && normal.paceFactor < hard.paceFactor);
  assert.ok(easy.attackSpacing > normal.attackSpacing && normal.attackSpacing > hard.attackSpacing);
  assert.ok(easy.weaponCooldown > normal.weaponCooldown && normal.weaponCooldown > hard.weaponCooldown);
  // À voitures égales, un rival roule donc plus vite à chaque niveau.
  const player = CITY_RUSH_CARS[0];
  for (const rival of CITY_RUSH_CARS.slice(1)) {
    const speeds = [easy, normal, hard].map((ai) => cityRushRivalBaseSpeed(rival, player, ai));
    assert.ok(speeds[0] < speeds[1] && speeds[1] < speeds[2], `${rival.id} : ${speeds.map((speed) => speed.toFixed(2)).join(' < ')}`);
  }
});

test('best times are kept per city and per difficulty, and older records stay those of Normal', () => {
  assert.equal(cityRushBestKey('tokyo'), 'tokyo');
  assert.equal(cityRushBestKey('tokyo', 'normal'), 'tokyo', 'les records d\'avant les niveaux (une clé par ville) restent valables en Normal');
  assert.equal(cityRushBestKey('tokyo', 'easy'), 'tokyo:easy');
  assert.equal(cityRushBestKey('tokyo', 'hard'), 'tokyo:hard');
  assert.equal(cityRushBestKey('tokyo', 'nope'), 'tokyo', 'niveau inconnu : Normal');
  const keys = CITY_RUSH_CITIES.flatMap((city) => CITY_RUSH_DIFFICULTIES.map((mode) => cityRushBestKey(city.id, mode.id)));
  assert.equal(new Set(keys).size, CITY_RUSH_CITIES.length * CITY_RUSH_DIFFICULTIES.length, 'jamais deux records sur la même clé');
  // Le mode compte aussi : un sprint d'un tour n'écrase pas le record d'une course de trois tours.
  assert.equal(cityRushBestKey('tokyo', 'normal', 'circuit'), 'tokyo', 'le mode d\'origine garde la clé historique');
  assert.equal(cityRushBestKey('tokyo', 'normal', 'sprint'), 'tokyo:sprint');
  assert.equal(cityRushBestKey('tokyo', 'hard', 'pursuit'), 'tokyo:hard:pursuit');
  const modeKeys = ['circuit', 'sprint', 'pursuit'].flatMap((modeId) => CITY_RUSH_DIFFICULTIES.map((mode) => cityRushBestKey('paris', mode.id, modeId)));
  assert.equal(new Set(modeKeys).size, 9, 'trois modes × trois niveaux : neuf records distincts par ville');
});

test('every difficulty keeps the rival tuning inside guard rails that keep the race fair and winnable', () => {
  for (const mode of CITY_RUSH_DIFFICULTIES) {
    const ai = cityRushRivalAI(mode.id);
    const where = (name) => `${mode.id} : ${name}`;
    assert.ok(Object.isFrozen(ai), 'le réglage est partagé : il ne doit pas être modifié en cours de jeu');
    // Allure : à quelques pour-cent de la voiture du joueur, pas plus (Facile peut rouler plus bas).
    assert.ok(ai.paceFactor >= 0.96 && ai.paceFactor <= 1.02, where('paceFactor'));
    assert.ok(ai.carCharacter >= 0 && ai.carCharacter <= 0.3, where('carCharacter'));
    // Rattrapage et laisse : discrets (un rival qui accélère de plus de 8 % se voit).
    assert.ok(ai.catchUpBoost > 0 && ai.catchUpBoost <= 0.08, where('catchUpBoost'));
    assert.ok(ai.leashSlow >= 0 && ai.leashSlow <= 0.05, where('leashSlow'));
    assert.ok(ai.catchUpRange > 0 && ai.leashRange > ai.leashStart && ai.leashStart >= 0, where('portées'));
    // Réflexes humains : jamais plus rapides que le joueur, jamais instantanés.
    assert.ok(ai.reactionMin >= 0.15 && ai.reactionMax > ai.reactionMin && ai.reactionMax <= 0.65, where('réaction'));
    assert.ok(ai.laneAgility > 0 && ai.laneAgility <= 12, where('le joueur glisse à 12'));
    assert.ok(ai.lookAhead >= 100 && ai.lookAhead <= 200, where('lookAhead'));
    // Inattention : rare, brève.
    assert.ok(ai.mistakeChance >= 0 && ai.mistakeChance <= 0.05, where('mistakeChance'));
    assert.ok(ai.mistakeMin > 0 && ai.mistakeMax >= ai.mistakeMin && ai.mistakeMax <= 2, where('durée des erreurs'));
    // Appétit : des rivaux qui ramassent comme le joueur, pas des aspirateurs à bonus.
    assert.ok(ai.pickupValue >= 8 && ai.pickupValue <= 20, where('pickupValue'));
    assert.ok(ai.weaponBias >= 0.5 && ai.weaponBias <= 2, where('weaponBias'));
    // Armes : à portée de vue, avec un répit après chaque coup (au moins une seconde, même en Difficile).
    assert.ok(ai.pistolRange > 0 && ai.pistolRange <= 120, where('pistolRange'));
    assert.ok(ai.attackSpacing >= 1, where('le joueur doit pouvoir souffler entre deux coups'));
    // Recharge : depuis que les bonus réapparaissent aussitôt pris, un rival rechargerait en quelques
    // secondes ; sous 20 s il retire à chaque cible qui passe (4 coups par course et plus, mesuré).
    assert.ok(ai.weaponCooldown >= 20 && ai.weaponCooldown <= 120, where('weaponCooldown'));
    // Le choix de voiture ne décide pas de la course, quel que soit le niveau.
    for (const player of CITY_RUSH_CARS) {
      for (const rival of CITY_RUSH_CARS.filter((car) => car.id !== player.id)) {
        const share = cityRushRivalBaseSpeed(rival, player, ai) / (CITY_RUSH_PLAYER_SPEED * player.powerMultiplier);
        assert.ok(Math.abs(share - ai.paceFactor) <= ai.carCharacter * 0.062, where(`${rival.id} face à ${player.id} : ${share.toFixed(4)}`));
      }
    }
  }
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
