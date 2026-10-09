import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CITY_RUSH_CITIES,
  CITY_RUSH_CARS,
  CITY_RUSH_CARS_BY_POWER,
  cityRushCarCategory,
  cityRushRivalCarProfile,
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
  CITY_RUSH_AI_LANE_COOLDOWN_MIN,
  CITY_RUSH_AI_LANE_COOLDOWN_MAX,
  CITY_RUSH_BLUE_PICKUP_CHANCE,
  CITY_RUSH_RED_PICKUP_CHANCE,
  CITY_RUSH_HEALTH_PICKUP_CHANCE,
  CITY_RUSH_HEALTH_PICKUP_RESTORE,
  CITY_RUSH_HEALTH_PICKUP_COLOR,
  CITY_RUSH_PISTOL_AMMO_PER_PICKUP,
  CITY_RUSH_SHOTGUN_AMMO_PER_PICKUP,
  CITY_RUSH_SHOTGUN_DAMAGE,
  CITY_RUSH_SHOTGUN_FIRE_COOLDOWN,
  CITY_RUSH_WEAPON_TYPES,
  cityRushActiveWeapon,
  cityRushEquipWeapon,
  cityRushWeaponFireInterval,
  cityRushWeaponMaxAmmo,
  cityRushWeaponDamage,
  CITY_RUSH_TRACK_BOOST_PICKUP_CHANCE,
  CITY_RUSH_BOOST_SPAWN_CHANCE,
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
  CITY_RUSH_TRAFFIC_CAR_GAP,
  CITY_RUSH_TRAFFIC_HITBOX_SCALE,
  CITY_RUSH_TRAFFIC_HOLD_MARGIN,
  CITY_RUSH_TRAFFIC_PASS_GAP,
  CITY_RUSH_TRAFFIC_LANE_CHANGE_DURATION,
  cityRushTrafficContactGap,
  cityRushTrafficHitboxWidth,
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
  CITY_RUSH_POLICE_SIGHT_RANGE,
  CITY_RUSH_WANTED_MAX_STARS,
  CITY_RUSH_POLICE_DESTROYS_TO_MAX_STARS,
  CITY_RUSH_MINI_GARAGE_COUNT,
  CITY_RUSH_MINI_GARAGE_MID_RACE_SHARE,
  CITY_RUSH_MINI_GARAGE_SIGN_LEAD,
  CITY_RUSH_MINI_GARAGE_TRAVERSE_HALF_LENGTH,
  CITY_RUSH_MINI_GARAGE_LANE_COUNT,
  CITY_RUSH_MINI_GARAGE_WIDTH,
  CITY_RUSH_MINI_GARAGE_REPAIR_AMOUNT,
  CITY_RUSH_POLICE_TRAFFIC_TYPES,
  CITY_RUSH_POLICE_VEHICLE_TYPES,
  isCityRushPoliceTrafficType,
  cityRushWantedLevelAfterHit,
  cityRushWantedLevelAfterPoliceDestroyed,
  CITY_RUSH_RIVAL_CONTACT_STARS,
  CITY_RUSH_RIVAL_PURSUER_COUNT,
  cityRushRivalWantedLevelAfterContact,
  cityRushRivalPursued,
  cityRushRivalPursuerCount,
  cityRushRivalLeaderWanted,
  cityRushMiniGarageLane,
  cityRushMiniGarageLanes,
  cityRushMiniGarageAvailable,
  cityRushMiniGarageMidRaceDistance,
  cityRushMiniGarageTrackDistances,
  cityRushMiniGarageCanUse,
  cityRushMiniGarageRepair,
  cityRushMiniGarageWantedLevel,
  cityRushMiniGarageCanClearWanted,
  cityRushPoliceCountForWantedLevel,
  cityRushPoliceTurnaroundProgress,
  CITY_RUSH_POLICE_DAMAGE,
  CITY_RUSH_POLICE_HEALTH,
  CITY_RUSH_POLICE_RAMP_LANDING_DAMAGE,
  CITY_RUSH_POLICE_RAMP_LANDING_SOURCE,
  CITY_RUSH_POLICE_SUV_HEALTH,
  cityRushPoliceMaxHealth,
  CITY_RUSH_SPIKE_BLOCK_COUNT,
  CITY_RUSH_SPIKE_BLOCK_LEAD,
  CITY_RUSH_SPIKE_BLOCK_STARS,
  CITY_RUSH_SPIKE_BLOCK_VEHICLE_TYPES,
  CITY_RUSH_SPIKE_DAMAGE,
  CITY_RUSH_SPIKE_DAMAGE_SOURCE,
  CITY_RUSH_SPIKE_LANES,
  CITY_RUSH_SPIKE_LAY_DURATION,
  CITY_RUSH_SPIKE_SLOW_DURATION,
  CITY_RUSH_SPIKE_SLOW_FACTOR,
  cityRushSpikeBlockCount,
  cityRushSpikeHit,
  cityRushSpikeLaidLanes,
  cityRushSpikeLanes,
  cityRushSpikeLayProgress,
  cityRushSpikePace,
  CITY_RUSH_SUV_CHARGE_ALERT_RANGE,
  CITY_RUSH_SUV_CHARGE_COUNT,
  CITY_RUSH_SUV_CHARGE_LATERAL_RATE,
  CITY_RUSH_SUV_CHARGE_LOCK_RANGE,
  CITY_RUSH_SUV_CHARGE_MIN_SPEED,
  CITY_RUSH_SUV_CHARGE_RECYCLE_BEHIND,
  CITY_RUSH_SUV_CHARGE_RELOAD,
  CITY_RUSH_SUV_CHARGE_SPAWN_LEAD,
  CITY_RUSH_SUV_CHARGE_SPEED_FACTOR,
  CITY_RUSH_SUV_CHARGE_TYPE,
  cityRushSuvChargeCount,
  cityRushSuvChargeLocked,
  cityRushSuvChargeSpeed,
  cityRushSuvChargeStep,
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
  CITY_RUSH_CAR_HEALTH_MIN,
  cityRushCarMaxHealth,
  CITY_RUSH_PLAYER_COLLISION_COOLDOWN,
  CITY_RUSH_RACER_HEALTH,
  CITY_RUSH_HEALTH_GROUP_SIZE,
  CITY_RUSH_PLAYER_HEALTH_CRITICAL,
  CITY_RUSH_WATCH_HELI_AHEAD,
  CITY_RUSH_WATCH_HELI_HEIGHT,
  CITY_RUSH_WATCH_HELI_LATERAL,
  CITY_RUSH_RACER_SLOTS,
  cityRushPlayerDamage,
  cityRushHealthPickupRepair,
  cityRushHealthSegments,
  cityRushPlayerHealthColor,
  cityRushPoliceCollisionHit,
  cityRushWatchHelicopterPose,
  CITY_RUSH_TRAFFIC_COUNT,
  CITY_RUSH_TRAFFIC_LANES,
  CITY_RUSH_TRAFFIC_TYPES,
  CITY_RUSH_TOURNAMENT_TRAFFIC_COUNT,
  CITY_RUSH_TOURNAMENT_ONCOMING_COUNT,
  CITY_RUSH_TOURNAMENT_RACER_SLOTS,
  CITY_RUSH_TOURNAMENT_RACER_COUNT,
  cityRushRaceGrid,
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
  viceCityTrackOffset,
  viceCityTrackTangent,
  viceCityTrackYaw,
  cityRushTrackProfile,
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
  CITY_RUSH_COURSES,
  CITY_RUSH_RACEWAY_PACE,
  CITY_RUSH_COURSE_PACE_MIN,
  cityRushCoursePace,
  cityRushPacedSpeed,
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
  CITY_RUSH_RIVAL_PACE,
  CITY_RUSH_RIVAL_FINAL_LAP_PUSH,
  cityRushRivalPaceFactor,
  cityRushRivalTargetSpeed,
  cityRushAiBrakingRate,
  cityRushAiBrakingDistance,
  cityRushAiThinkDelay,
  CITY_RUSH_MISSION_TARGET_AI_LANE_COOLDOWN_MIN,
  CITY_RUSH_MISSION_TARGET_AI_LANE_COOLDOWN_MAX,
  cityRushAiLaneBlocked,
  CITY_RUSH_AI_BRAKING_MARGIN,
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
  CITY_RUSH_POLICE_LANE_REACTION_DELAY,
  CITY_RUSH_POLICE_PURSUIT_REFLEX,
  cityRushPoliceLaneReaction,
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
  shouldHideCityRushWeaponPickup,
  createCityRushEncounter,
  createCityRushBoostEncounter,
  keepsCityRushBoostPickup,
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
  CITY_RUSH_TRACK_PROFILE_DEFAULT,
  CITY_RUSH_TRACK_PROFILE_VICE_CITY,
  CITY_RUSH_VICE_CITY_TURNS,
  CITY_RUSH_CORNER_PACE_COURSES,
  CITY_RUSH_CORNER_PACE_MIN,
  CITY_RUSH_CORNER_PACE_PREBRAKE_METERS,
  CITY_RUSH_CORNER_PACE_SWEEP,
  CITY_RUSH_CORNER_PACE_YAW_START,
  CITY_RUSH_CORNER_PACE_YAW_SWEEP,
  CITY_RUSH_CORNER_PACE_YAW_TIGHT,
  cityRushCornerPace,
  cityRushCornerPaceFromYaw,
  cityRushUsesCornerPace,
  nordschleifeCornerCurve,
  nordschleifeTrackOffset,
  nordschleifeTrackTangent,
  nordschleifeTrackYaw,
  CITY_RUSH_TOUGE_COURSE,
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
  assert.equal(CITY_RUSH_CARS.length, 12);
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
    'les onze autres voitures gardent un prix catalogue (le trio le moins puissant est offert sans achat)');
  assert.equal(CITY_RUSH_CARS.find((car) => car.id === 'vega-gt-67')?.bodyColor, 0x11131a);
  assert.equal(new Set(CITY_RUSH_CARS.map((car) => car.id)).size, CITY_RUSH_CARS.length);
  assert.deepEqual(
    new Set(CITY_RUSH_CARS.map((car) => car.archetype)),
    new Set(['city-hatch', 'nova-hatch', 'volkswagen', 'ae86', 'ferrari', 'porsche', 'audi', 'bmw', 'lamborghini', 'electric-gt', 'sport-crossover', 'neo-roadster']),
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

test('les rivaux choisissent toujours une voiture de la catégorie du pilote', () => {
  const expectedCategories = {
    'city-hatch': 'compact',
    'nova-18-gt': 'compact',
    'night-comet': 'compact',
    'ae86': 'compact',
    'vice-roadster': 'sport',
    'turbo-gt': 'sport',
    'muscle-86': 'supercar',
    'vega-gt-67': 'sport',
    'toro-v12': 'supercar',
    'volt-aero': 'sport',
    'atlas-xr': 'crossover',
    'pulse-rs': 'sport',
  };

  for (const car of CITY_RUSH_CARS) {
    assert.equal(cityRushCarCategory(car), expectedCategories[car.id], `${car.name} a une classe de course explicite`);
    assert.equal(cityRushCarCategory(car.id), expectedCategories[car.id], `${car.id} se résout depuis le catalogue`);
    const peers = CITY_RUSH_CARS.filter((candidate) => candidate.category === car.category);
    for (const rivalIndex of [0, 1, 6]) {
      const rival = cityRushRivalCarProfile({ playerCarId: car.id, rivalIndex });
      assert.ok(rival, `${car.name} reçoit un profil de rival`);
      assert.equal(rival.category, car.category, `${car.name} / rival ${rivalIndex} restent dans la même classe`);
      if (peers.length > 1) {
        assert.notEqual(rival.id, car.id, `${car.name} affronte un autre modèle quand la classe le permet`);
      }
    }
  }

  assert.equal(cityRushRivalCarProfile({ playerCarId: 'city-hatch' }).id, 'nova-18-gt',
    'le rival compact le plus proche en vitesse est choisi en premier');
  assert.equal(cityRushRivalCarProfile({ playerCarId: 'city-hatch', rivalIndex: 1 }).id, 'night-comet',
    'les autres places utilisent ensuite le reste de la catégorie');

  const scriptedSameClass = cityRushRivalCarProfile({
    playerCarId: 'city-hatch',
    preferredCarId: 'night-comet',
  });
  assert.equal(scriptedSameClass.id, 'night-comet', 'un modèle de scénario est gardé s’il respecte la classe');
  const scriptedWrongClass = cityRushRivalCarProfile({
    playerCarId: 'city-hatch',
    preferredCarId: 'toro-v12',
  });
  assert.equal(scriptedWrongClass.category, 'compact', 'un modèle imposé hors classe est remplacé');
  assert.equal(cityRushRivalCarProfile({ playerCarId: 'atlas-xr' }).id, 'atlas-xr',
    'une catégorie sans autre modèle préfère un doublon au changement de classe');
  assert.equal(cityRushCarCategory('unknown-car'), null);
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

test('Vice City combines long sweepers with sharp turns and a seamless lap', () => {
  const lap = CITY_RUSH_LAP_LENGTH;
  const profile = CITY_RUSH_TRACK_PROFILE_VICE_CITY;
  assert.equal(profile.id, 'vice-city');
  assert.equal(cityRushTrackProfile(CITY_RUSH_CITIES[0]), profile);
  assert.equal(cityRushTrackProfile('vice-city'), profile);
  for (const city of CITY_RUSH_CITIES.slice(1)) {
    assert.equal(cityRushTrackProfile(city), CITY_RUSH_TRACK_PROFILE_DEFAULT, `${city.id} garde son profil urbain doux`);
  }
  assert.equal(cityRushTrackProfile(CITY_RUSH_NORDSCHLEIFE_COURSE), CITY_RUSH_TRACK_PROFILE_NORDSCHLEIFE);
  assert.deepEqual(CITY_RUSH_VICE_CITY_TURNS.map((turn) => turn.kind), ['long', 'sharp', 'long', 'sharp', 'long', 'sharp']);

  assert.equal(viceCityTrackOffset(0), 0, 'la ligne de départ est centrée');
  assert.equal(viceCityTrackOffset(lap), 0, 'la boucle revient exactement à son point de départ');
  assert.equal(viceCityTrackTangent(0), 0, 'le raccord de départ est droit');
  assert.equal(viceCityTrackTangent(lap), 0, 'le raccord d’arrivée est droit');
  assert.equal(viceCityTrackOffset(117), viceCityTrackOffset(117 + lap), 'le tracé se répète à chaque tour');
  assert.equal(viceCityTrackOffset(-83), viceCityTrackOffset(lap - 83), 'les distances négatives replient correctement la boucle');

  const peakYaw = (turn) => {
    let peak = 0;
    for (let index = 0; index <= 100; index += 1) {
      const distance = turn.start + ((turn.end - turn.start) * index) / 100;
      peak = Math.max(peak, Math.abs((viceCityTrackYaw(distance) * 180) / Math.PI));
    }
    return peak;
  };
  const longTurns = CITY_RUSH_VICE_CITY_TURNS.filter((turn) => turn.kind === 'long');
  const sharpTurns = CITY_RUSH_VICE_CITY_TURNS.filter((turn) => turn.kind === 'sharp');
  assert.ok(longTurns.every((turn) => turn.end - turn.start >= 150), 'les courbes longues tiennent au moins 150 m');
  assert.ok(longTurns.every((turn) => peakYaw(turn) >= 12 && peakYaw(turn) < 16), 'les longues courbes restent rapides mais lisibles');
  assert.ok(sharpTurns.every((turn) => turn.end - turn.start <= 50), 'les virages secs sont resserrés');
  assert.ok(sharpTurns.every((turn) => peakYaw(turn) >= 35 && peakYaw(turn) < 42), 'les virages secs tournent franchement');
  for (const turn of CITY_RUSH_VICE_CITY_TURNS) {
    assert.equal(viceCityTrackOffset(turn.start), turn.from, `${turn.name} commence sans déport supplémentaire`);
    assert.equal(viceCityTrackOffset(turn.end), turn.to, `${turn.name} se raccorde proprement à la ligne suivante`);
    assert.equal(viceCityTrackTangent(turn.start), 0, `${turn.name} n’a pas de cassure à l’entrée`);
    assert.equal(viceCityTrackTangent(turn.end), 0, `${turn.name} n’a pas de cassure à la sortie`);
  }
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
    'police', 'taxi', 'ambulance', 'garbage-truck', 'white-lambo',
  ]);
  assert.deepEqual([...CITY_RUSH_POLICE_TRAFFIC_TYPES], ['police']);
  assert.equal(isCityRushPoliceTrafficType('police'), true);
  // Le taxi est la voiture civile de la ville : aucune patrouille banalisée ne
  // se cache derrière lui, percuter un taxi ne déclenche pas la poursuite.
  assert.equal(isCityRushPoliceTrafficType('taxi'), false);
  assert.equal(isCityRushPoliceTrafficType('undercover-police'), false, 'la berline banalisée a quitté la route');
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

test('un tournoi aligne huit voitures de course, le pilote en dernière rangée', () => {
  assert.equal(CITY_RUSH_TOURNAMENT_RACER_COUNT, 8);
  assert.deepEqual([...CITY_RUSH_TOURNAMENT_RACER_SLOTS], [
    'player', 'nova', 'juno', 'lyra', 'orion', 'altair', 'polaris', 'castor',
  ]);
  const slots = CITY_RUSH_TOURNAMENT_RACER_SLOTS.map((id, index) => ({ id, slot: index, isPlayer: id === 'player' }));
  // Sur une artère à six voies, la grille se remplit sur les trois voies du sens
  // de course : trois rangées, le pilote tout derrière.
  const grid = cityRushRaceGrid(slots, null);
  assert.equal(grid.length, CITY_RUSH_TOURNAMENT_RACER_COUNT);
  assert.deepEqual(grid.map((place) => place.lane), [3, 4, 5, 3, 4, 5, 3, 4]);
  assert.deepEqual(grid.map((place) => place.row), [0, 0, 0, 1, 1, 1, 2, 2]);
  assert.deepEqual(grid.map((place) => place.distance), [0, 0, 0, -5.4, -5.4, -5.4, -10.8, -10.8]);
  assert.equal(grid.at(-1).id, 'player', 'le pilote ferme la marche');
  assert.ok(grid.filter((place) => place.id !== 'player').every((place) => place.distance >= grid.at(-1).distance));
  // Aucune place n'est partagée : une voiture par voie et par rangée.
  assert.equal(new Set(grid.map((place) => `${place.lane}/${place.row}`)).size, grid.length);
  // Sur le Ring (quatre voies, sens unique), la même grille tient en deux rangées.
  const ring = cityRushRaceGrid(slots, CITY_RUSH_COURSES.find((course) => course.id === 'nordschleife'));
  assert.deepEqual(ring.map((place) => place.lane), [0, 1, 2, 3, 0, 1, 2, 3]);
  assert.deepEqual(ring.map((place) => place.row), [0, 0, 0, 0, 1, 1, 1, 1]);
  assert.deepEqual(ring.map((place) => place.distance), [0, 0, 0, 0, -5.4, -5.4, -5.4, -5.4]);
  // Les cases peintes au sol suivent les voies du sens de course.
  assert.deepEqual([...cityRushLaneConfig(null).gridLanes], [...CITY_RUSH_FORWARD_LANES]);
  assert.deepEqual(
    [...cityRushLaneConfig(CITY_RUSH_COURSES.find((course) => course.id === 'london')).gridLanes],
    [...CITY_RUSH_LEFT_HALF_LANES],
    'en conduite à gauche, la grille peinte passe de l’autre côté de l’axe',
  );
});

test('le trafic d’un tournoi est clairsemé et sans une seule berline de police', () => {
  assert.equal(CITY_RUSH_TOURNAMENT_TRAFFIC_COUNT, 4);
  assert.ok(CITY_RUSH_TOURNAMENT_TRAFFIC_COUNT < CITY_RUSH_TRAFFIC_COUNT, 'moins de civiles que la course libre');
  assert.equal(CITY_RUSH_TOURNAMENT_ONCOMING_COUNT, 1);
  assert.ok(CITY_RUSH_TOURNAMENT_ONCOMING_COUNT < CITY_RUSH_ONCOMING_COUNT);
  // Le trafic reste celui de la ville, police en moins : les modèles civils
  // (taxi, ambulance, camion, GT) sont toujours là.
  const civilians = CITY_RUSH_TRAFFIC_TYPES.filter((spec) => !isCityRushPoliceTrafficType(spec.id));
  assert.ok(civilians.length >= CITY_RUSH_TOURNAMENT_TRAFFIC_COUNT, 'assez de modèles civils pour la flotte de tournoi');
  assert.equal(civilians.some((spec) => spec.id === 'taxi'), true, 'la voiture civile de la ville reste sur la route');
});

test('un joueur humain ou une IA touche le trafic, ralentit brièvement (0,6 s) et libère une voie', () => {
  assert.equal(CITY_RUSH_TRAFFIC_IMPACT_DURATION, 0.6);
  // Le choc contre le trafic lent n'est plus jugé à la distance de sécurité
  // (4,8 m, réservée aux berlines de police et aux rabattements) mais à
  // l'enveloppe de la carrosserie : pare-chocs contre pare-chocs, puis
  // frôlement dès que l'aile a dégagé l'obstacle. C'est ce qui laisse la marge
  // d'esquive : une voiture n'est plus percutée à un mètre d'écart visuel.
  assert.equal(CITY_RUSH_TRAFFIC_IMPACT_GAP, CITY_RUSH_TRAFFIC_CAR_GAP);
  assert.ok(CITY_RUSH_TRAFFIC_CAR_GAP < CITY_RUSH_CAR_GAP, 'le trafic lent se touche plus tard que la distance de sécurité');
  assert.ok(CITY_RUSH_TRAFFIC_PASS_GAP < CITY_RUSH_TRAFFIC_CAR_GAP, 'le frôlement latéral est plus court que le choc axial');
  assert.ok(CITY_RUSH_TRAFFIC_HOLD_MARGIN > 0 && CITY_RUSH_TRAFFIC_HOLD_MARGIN < 0.5,
    'la retenue du suiveur dépasse le seuil de quelques centimètres, pas d’un pare-chocs');
  assert.equal(cityRushTrafficContactGap(0), CITY_RUSH_TRAFFIC_CAR_GAP, 'dans l’axe : pare-chocs contre pare-chocs');
  assert.equal(cityRushTrafficContactGap(99), CITY_RUSH_TRAFFIC_PASS_GAP, 'aile dégagée : simple frôlement');
  const halfWidth = (1.9 + 1.94) / 2;
  const midEnvelope = cityRushTrafficContactGap(halfWidth / 2);
  assert.ok(midEnvelope > CITY_RUSH_TRAFFIC_PASS_GAP && midEnvelope < CITY_RUSH_TRAFFIC_CAR_GAP,
    'l’enveloppe décroît avec l’écart latéral : une esquive entamée rapproche le passage');
  assert.ok(cityRushTrafficContactGap(0) > cityRushTrafficContactGap(halfWidth / 2)
    && cityRushTrafficContactGap(halfWidth / 2) > cityRushTrafficContactGap(halfWidth),
  'la pente est continue jusqu’à l’aile dégagée');
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

test('la hit-box des voitures du trafic est resserrée : l’esquive de dernière seconde passe', () => {
  // Demande : « réduire la hit-box des voitures qui circulent sur la route pour
  // pouvoir les éviter au dernier moment ». La carrosserie garde sa largeur à
  // l'écran ; c'est la boîte qui juge le contact qui est plus étroite.
  assert.ok(CITY_RUSH_TRAFFIC_HITBOX_SCALE > 0 && CITY_RUSH_TRAFFIC_HITBOX_SCALE < 1,
    'la boîte du trafic est strictement plus petite que la carrosserie');
  assert.ok(Math.abs(cityRushTrafficHitboxWidth(1.94) - 1.94 * CITY_RUSH_TRAFFIC_HITBOX_SCALE) < 1e-9);
  assert.equal(cityRushTrafficHitboxWidth(1.94, 1), 1.94, 'l’échelle pleine rend la carrosserie');
  assert.ok(cityRushTrafficHitboxWidth(undefined) > 1,
    'une largeur inconnue retombe sur la berline de référence : jamais une boîte nulle');

  // Le pilote a entamé son esquive de 1,70 m sur les 2,10 m qui séparent deux
  // voies. Avec la carrosserie pleine, les deux voitures se recouvrent encore
  // (1,70 < 1,92) et l'enveloppe vaut 2,98 m : à 2,95 m, le choc serait facturé.
  // Avec la boîte resserrée (1,53 m de demi-somme), la boîte du trafic est
  // dégagée : plus aucun contact, même à cette distance.
  const swerve = 1.7;
  const lateGap = 2.95;
  const bodyEnvelope = cityRushTrafficContactGap(swerve, { bodyWidth: 1.9, trafficWidth: 1.94 });
  const hitboxEnvelope = cityRushTrafficContactGap(swerve, {
    bodyWidth: 1.9,
    trafficWidth: cityRushTrafficHitboxWidth(1.94),
  });
  assert.ok(bodyEnvelope > lateGap, 'avec la carrosserie pleine, l’esquive tardive toucherait');
  assert.equal(hitboxEnvelope, CITY_RUSH_TRAFFIC_PASS_GAP, 'boîte dégagée : l’enveloppe tombe au frôlement');

  const slow = { previousDistance: 140, nextDistance: 140.2 };
  const lateDodge = detectCityRushTrafficImpacts([
    {
      id: 'player', collisionGroup: 'racer', lane: 2, x: CITY_RUSH_LANE_X[1] + swerve, width: 1.9,
      previousDistance: 135.9, nextDistance: 137.25,
    },
    { id: 'traffic-1', collisionGroup: 'traffic', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.94, ...slow },
  ]);
  assert.deepEqual(lateDodge, [], 'la boîte resserrée laisse passer une esquive entamée au dernier moment');

  // Boîte encore recouverte (1,20 m d’esquive) : le contact est bien facturé,
  // la réduction n'est pas une disparition du trafic solide.
  const coveredSwerve = 1.2;
  const coveredEnvelope = cityRushTrafficContactGap(coveredSwerve, {
    bodyWidth: 1.9,
    trafficWidth: cityRushTrafficHitboxWidth(1.94),
  });
  assert.ok(coveredEnvelope > hitboxEnvelope,
    'boîte encore recouverte : l’enveloppe reste plus longue que le frôlement');
  const covered = detectCityRushTrafficImpacts([
    {
      id: 'player', collisionGroup: 'racer', lane: 2, x: CITY_RUSH_LANE_X[1] + coveredSwerve, width: 1.9,
      previousDistance: 136, nextDistance: 137.2,
    },
    { id: 'traffic-1', collisionGroup: 'traffic', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.94, ...slow },
  ]);
  assert.equal(covered.length, 1, 'boîtes recouvertes : le choc tombe toujours');
  assert.equal(covered[0].racerId, 'player');
  assert.equal(covered[0].trafficId, 'traffic-1');

  // La retenue du moteur suit la même boîte : recouverte, le suiveur est arrêté
  // à l'enveloppe resserrée (+ la marge de 5 cm) ; dégagée, il n'est plus
  // ralenti du tout — sinon le pilote serait dégagé par la détection mais
  // raboté par le moteur, et l'esquive de dernière seconde resterait bloquée.
  const heldMoved = resolveCityRushCarMovement([
    {
      id: 'player', collisionGroup: 'racer', lane: 2, x: CITY_RUSH_LANE_X[1] + coveredSwerve, width: 1.9,
      previousDistance: 136, nextDistance: 137.2,
    },
    { id: 'traffic-1', collisionGroup: 'traffic', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.94, ...slow },
  ]);
  const heldById = Object.fromEntries(heldMoved.map((car) => [car.id, car.nextDistance]));
  assert.ok(Math.abs(heldById.player - (slow.nextDistance - coveredEnvelope - CITY_RUSH_TRAFFIC_HOLD_MARGIN)) < 1e-9,
    'le suiveur est retenu à l’enveloppe de la boîte resserrée');

  const freedMoved = resolveCityRushCarMovement([
    {
      id: 'player', collisionGroup: 'racer', lane: 2, x: CITY_RUSH_LANE_X[1] + swerve, width: 1.9,
      previousDistance: 136, nextDistance: 137.25,
    },
    { id: 'traffic-1', collisionGroup: 'traffic', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.94, ...slow },
  ]);
  const freedById = Object.fromEntries(freedMoved.map((car) => [car.id, car.nextDistance]));
  assert.equal(freedById.player, 137.25, 'boîte dégagée : le moteur ne retient plus la voiture');

  // Dans l'axe, la boîte resserrée ne change rien : le choc tombe toujours
  // pare-chocs contre pare-chocs quand le pilote n'a pas tourné le volant.
  assert.equal(
    cityRushTrafficContactGap(0, { bodyWidth: 1.9, trafficWidth: cityRushTrafficHitboxWidth(1.94) }),
    CITY_RUSH_TRAFFIC_CAR_GAP,
    'voie tenue : le seuil axial reste le pare-chocs contre pare-chocs',
  );
  // La règle d'enveloppe reste pure : c'est l'appelant qui passe la boîte du
  // trafic. Les berlines de police en chasse gardent donc leur carrosserie
  // pleine — leur contact est jugé par `cityRushPoliceCollisionHit` —, et la
  // marge d'esquive est bien celle de la boîte resserrée.
  assert.ok(bodyEnvelope > hitboxEnvelope,
    'la carrosserie pleine retient plus loin que la boîte du trafic');
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
  assert.equal(nextLane, 0, 'le rival s’écarte pour le bonus turbo avant de prendre le bonus rouge plus proche');
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

test('rivals chase red machine-gun bonuses to refill partial magazines; full magazines ignore them', () => {
  const redPickup = { lane: 2, distance: 40, type: CITY_RUSH_POWERS.PISTOL };
  const emptyInventory = { pistol: 0 };
  const partialInventory = { pistol: 1 };
  const fullInventory = { pistol: CITY_RUSH_PISTOL_AMMO_PER_PICKUP };
  const unchargedPickups = [redPickup].filter((pickup) => canCollectCityRushPickup(emptyInventory, pickup.type));
  assert.equal(chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    speed: 24,
    availableLanes: [0, 1, 2],
    pickups: unchargedPickups,
  }), 2, 'le rival prend le bonus rouge pour charger sa mitrailleuse');

  const partialPickups = [redPickup].filter((pickup) => canCollectCityRushPickup(partialInventory, pickup.type));
  assert.deepEqual(partialPickups, [redPickup], 'un rival peut remplir son chargeur même s’il lui reste une balle');
  assert.equal(addCityRushCharge(partialInventory, CITY_RUSH_POWERS.PISTOL)[CITY_RUSH_POWERS.PISTOL], CITY_RUSH_PISTOL_AMMO_PER_PICKUP,
    'le ramassage complète le chargeur jusqu’à sept balles');

  const loadedPickups = [redPickup].filter((pickup) => canCollectCityRushPickup(fullInventory, pickup.type));
  assert.deepEqual(loadedPickups, [], 'une voiture au chargeur plein laisse le bonus aux autres');
  assert.equal(chooseCityRushAiLane({
    currentLane: 1,
    distance: 10,
    availableLanes: [0, 1, 2],
    pickups: loadedPickups,
  }), 1, 'sans pickup rouge admissible, le rival reste dans sa voie');

  const boost = { lane: 2, distance: 40, type: CITY_RUSH_PICKUPS.BOOST };
  const loadedRacerPickups = [redPickup, boost]
    .filter((pickup) => canCollectCityRushPickup(fullInventory, pickup.type));
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
  // Le garage conserve des écarts de puissance francs ; en course, les rivaux
  // sont désormais choisis dans la catégorie de la voiture engagée.
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

test('the loadout keeps seven AK-47 bullets, red health pickups, and automatic ground boosts', () => {
  assert.equal(CITY_RUSH_DISTANCE, 8400); // 6 tours : 5 boucles de 1 200 m + un dernier tour de 2 boucles
  assert.equal(CITY_RUSH_PLAYER_SPEED, 35);
  assert.equal(CITY_RUSH_BLUE_PICKUP_CHANCE, 0.03, 'le fusil à pompe bleu apparaît dans 3 % des objets');
  assert.ok(CITY_RUSH_BLUE_PICKUP_CHANCE < CITY_RUSH_RED_PICKUP_CHANCE, 'le pompe est plus rare que l’AK-47');
  assert.equal(CITY_RUSH_RED_PICKUP_CHANCE, 0.08, 'le chargeur rouge apparaît dans 8 % des objets');
  assert.equal(CITY_RUSH_HEALTH_PICKUP_CHANCE, 0.06, 'le plus de soin apparaît dans 6 % des objets');
  assert.equal(CITY_RUSH_HEALTH_PICKUP_RESTORE, 1);
  assert.equal(CITY_RUSH_HEALTH_PICKUP_COLOR, '#ff4055');
  assert.equal(CITY_RUSH_PISTOL_AMMO_PER_PICKUP, 7);
  assert.equal(CITY_RUSH_SHOTGUN_AMMO_PER_PICKUP, 3);
  assert.equal(CITY_RUSH_SHOTGUN_DAMAGE, 6);
  assert.ok(Math.abs(CITY_RUSH_TRACK_BOOST_PICKUP_CHANCE - 0.83) < 1e-12);
  assert.equal(CITY_RUSH_AI_TRACK_BOOST_WEIGHT, 3);
  assert.deepEqual(CITY_RUSH_POWER_CHARGE_COST, { 'blue-shot': 1, pistol: 7, shotgun: 3, radio: 4 });
  assert.equal(CITY_RUSH_POWER_RULES.pistol.key, 'Z');
  assert.equal(CITY_RUSH_POWER_RULES.pistol.chargeCost, 7);
  assert.equal(CITY_RUSH_POWER_RULES.pistol.ammoPerPickup, CITY_RUSH_PISTOL_AMMO_PER_PICKUP);
  assert.match(CITY_RUSH_POWER_RULES.pistol.description, /chargeurs d'AK-47 restent rares/i);
  assert.match(CITY_RUSH_POWER_RULES.pistol.description, /remplit le chargeur.*même s'il en reste déjà/i);
  assert.match(CITY_RUSH_POWER_RULES.pistol.description, /7 balles/i);
  assert.match(CITY_RUSH_POWER_RULES.pistol.name, /AK-47/i);
  assert.match(CITY_RUSH_POWER_RULES.pistol.description, /tout droit/i);
  assert.match(CITY_RUSH_POWER_RULES.pistol.description, /premier adversaire ou la première voiture de police/i);
  // Une balle rouge = un seul carré, chez un pilote comme dans une berline.
  assert.match(CITY_RUSH_POWER_RULES.pistol.description, /contre un pilote comme contre une voiture de police à six carrés de vie/i);
  assert.match(CITY_RUSH_POWER_RULES.pistol.description, /ne retire jamais qu’un seul carré/i);
  assert.match(CITY_RUSH_POWER_RULES.pistol.description, /sans dérapage ni ralentissement/i);
  assert.match(CITY_RUSH_POWER_RULES.pistol.description, /six balles pour une berline/i);
  assert.match(CITY_RUSH_POWER_RULES.pistol.description, /carambolage en accélérant retire un point à la police, et un carré au pilote/i);
  assert.deepEqual(Object.fromEntries(Object.entries(CITY_RUSH_POWER_RULES).map(([type, rule]) => [type, rule.key])), {
    'blue-shot': 'A', pistol: 'Z', shotgun: 'Z', radio: 'R',
  });
  assert.deepEqual(Object.keys(CITY_RUSH_POWER_RULES), ['blue-shot', 'pistol', 'shotgun', 'radio']);
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
  assert.equal(CITY_RUSH_POWER_RULES[CITY_RUSH_PICKUPS.BOOST], undefined, 'le bonus turbo vert n’est pas un pouvoir stocké');
  assert.equal(CITY_RUSH_TRACK_BOOST_DURATION, 3);
  assert.equal(CITY_RUSH_TRACK_BOOST_SPEED_FACTOR, 1.46);
  assert.equal(CITY_RUSH_RIVAL_BOOST_SPEED_FACTOR, 1.38);
  assert.equal(CITY_RUSH_TRACK_BOOST_COLOR, '#50e48a');
  assert.equal(CITY_RUSH_POWER_RULES.pistol.duration, 2);
  assert.equal(CITY_RUSH_POWER_RULES.pistol.color, '#ff526e');
  assert.equal(CITY_RUSH_POWER_RULES.pistol.automatic, false);
  // Le fusil à pompe : trois cartouches, six carrés par tir, bonus bleu.
  assert.equal(CITY_RUSH_POWER_RULES.shotgun.key, 'Z', 'le pompe se tire avec le même bouton que l’AK-47');
  assert.equal(CITY_RUSH_POWER_RULES.shotgun.chargeCost, 3);
  assert.equal(CITY_RUSH_POWER_RULES.shotgun.ammoPerPickup, CITY_RUSH_SHOTGUN_AMMO_PER_PICKUP);
  assert.equal(CITY_RUSH_POWER_RULES.shotgun.damageCells, CITY_RUSH_SHOTGUN_DAMAGE);
  assert.equal(CITY_RUSH_POWER_RULES.shotgun.automatic, false);
  assert.match(CITY_RUSH_POWER_RULES.shotgun.name, /fusil à pompe/i);
  assert.match(CITY_RUSH_POWER_RULES.shotgun.description, /3 cartouches/i);
  assert.match(CITY_RUSH_POWER_RULES.shotgun.description, /6 carrés de vie/i);
  assert.match(CITY_RUSH_POWER_RULES.shotgun.description, /même bouton/i);
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
  assert.deepEqual(Object.keys(inventory), ['blue-shot', 'pistol', 'shotgun', 'radio']);
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

test('red pickups stay visible until every active racer has a full magazine and top up partial ones', () => {
  const full = { pistol: CITY_RUSH_PISTOL_AMMO_PER_PICKUP };
  const partial = { pistol: 3 };
  const empty = { pistol: 0 };
  assert.equal(shouldHideCityRushPistolPickup(empty, [empty, empty]), false, 'le joueur doit d’abord charger');
  assert.equal(shouldHideCityRushPistolPickup(full, [partial, full]), false, 'un rival à moitié chargé garde les bonus visibles');
  assert.equal(shouldHideCityRushPistolPickup(full, [full, full]), true, 'les bonus disparaissent quand tous les chargeurs sont pleins');
  assert.equal(shouldHideCityRushPistolPickup(partial, [full, full]), false, 'le joueur peut recharger avant d’être à sec');
  const afterPlayerShot = { pistol: 0 };
  assert.equal(shouldHideCityRushPistolPickup(afterPlayerShot, [full, full]), false, 'le bonus rouge reste visible après un tir');
  assert.equal(canCollectCityRushPickup(afterPlayerShot, 'pistol'), true, 'le joueur peut de nouveau charger après le tir');
  assert.equal(shouldHideCityRushPistolPickup(full, []), true, 'sans adversaire actif, le joueur seul suffit');
  assert.equal(isCityRushPowerCharged({ pistol: 9 }, 'pistol'), true, 'les inventaires saturés sont traités comme chargés');
  assert.equal(canCollectCityRushPickup(empty, 'pistol'), true, 'un pilote sans balle peut prendre le rouge');
  assert.equal(canCollectCityRushPickup(partial, 'pistol'), true, 'un pilote peut compléter un chargeur partiellement dépensé');
  assert.equal(addCityRushCharge(partial, CITY_RUSH_POWERS.PISTOL)[CITY_RUSH_POWERS.PISTOL], CITY_RUSH_PISTOL_AMMO_PER_PICKUP, 'le bonus remet le chargeur à 100 %');
  assert.equal(canCollectCityRushPickup(full, 'pistol'), false, 'un chargeur plein ne gaspille pas de bonus');
  assert.equal(canCollectCityRushPickup(partial, 'pistol', { redPickupsHidden: true }), false, 'un bonus masqué reste impossible à ramasser');
  assert.equal(canCollectCityRushPickup(empty, CITY_RUSH_PICKUPS.BOOST), true, 'la règle ne masque jamais les boosts');
  assert.equal(canCollectCityRushPickup(empty, 'radio'), false, 'les bonus retirés ne peuvent plus être collectés');
  assert.equal(canCollectCityRushPickup(empty, CITY_RUSH_PICKUPS.HEALTH, { health: 4, maxHealth: 7 }), true,
    'une coque endommagée peut ramasser un plus rouge');
  assert.equal(canCollectCityRushPickup(empty, CITY_RUSH_PICKUPS.HEALTH, { health: 7, maxHealth: 7 }), false,
    'une coque pleine ne gaspille pas de soin');
  assert.equal(canCollectCityRushPickup(empty, CITY_RUSH_PICKUPS.HEALTH, { health: 0, maxHealth: 7 }), false,
    'un plus rouge ne ranime pas une épave');
  assert.equal(cityRushHealthPickupRepair(4, 7), 5, 'le plus rouge rend exactement un carré');
  assert.equal(cityRushHealthPickupRepair(7, 7), 7, 'le soin respecte la vie maximale');
  assert.equal(cityRushHealthPickupRepair(0, 7), 0, 'le soin ne ressuscite pas');
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

test('tirer sur la police donne trois étoiles, puis les destructions font monter à quatre et cinq', () => {
  assert.equal(CITY_RUSH_POLICE_DESTROYS_TO_MAX_STARS, 2);
  assert.equal(cityRushWantedLevelAfterHit(0, { police: true }), 3, 'le premier tir sur la police donne trois étoiles');
  assert.equal(cityRushWantedLevelAfterHit(1, { police: true }), 3, 'un tir depuis une étoile monte à trois');
  assert.equal(cityRushWantedLevelAfterHit(3, { police: true }), 3, 'les tirs suivants ne montent pas les étoiles seuls');
  assert.equal(cityRushWantedLevelAfterHit(4, { police: true }), 4, 'un tir ne fait pas baisser un niveau déjà plus élevé');
  assert.equal(cityRushWantedLevelAfterPoliceDestroyed(0, 1), 4, 'la première voiture détruite donne quatre étoiles même sans tir préalable');
  assert.equal(cityRushWantedLevelAfterPoliceDestroyed(3, 1), 4, 'la première destruction fait passer de trois à quatre étoiles');
  assert.equal(cityRushWantedLevelAfterPoliceDestroyed(4, 2), 5, 'deux destructions font passer à cinq étoiles');
  assert.equal(cityRushWantedLevelAfterPoliceDestroyed(0, 2), 5, 'deux destructions suffisent à atteindre cinq étoiles');
  assert.equal(cityRushWantedLevelAfterPoliceDestroyed(5, 3), 5, 'le niveau reste plafonné à cinq étoiles');
  // À cinq étoiles, l'escouade complète sort : les trois unités, dont le SUV.
  assert.equal(cityRushPoliceCountForWantedLevel(5), CITY_RUSH_POLICE_COUNT, 'cinq étoiles déploient les trois unités');
  assert.ok(CITY_RUSH_POLICE_VEHICLE_TYPES.includes('police-suv'), 'l’escouade comprend bien un SUV');
  // Les patrouilles croisées sur la route chassent à vue : la portée existe.
  assert.ok(Number.isFinite(CITY_RUSH_POLICE_SIGHT_RANGE) && CITY_RUSH_POLICE_SIGHT_RANGE > 0, 'portée de vue positive');
});

test('un rival aussi est recherché : le contact avec la police vaut trois étoiles et une berline dédiée', () => {
  // Même barème que le tir : toucher une voiture de police (carambolage comme
  // rafale) monte à trois étoiles, sans jamais redescendre un niveau plus haut.
  assert.equal(CITY_RUSH_RIVAL_CONTACT_STARS, 3);
  assert.equal(cityRushRivalWantedLevelAfterContact(0), 3, 'un carambolage avec une berline vaut trois étoiles');
  assert.equal(cityRushRivalWantedLevelAfterContact(1), 3, 'le contact rattrape une étoile déjà gagnée');
  assert.equal(cityRushRivalWantedLevelAfterContact(3), 3, 'les contacts suivants ne montent pas seuls');
  assert.equal(cityRushRivalWantedLevelAfterContact(5), 5, 'un niveau déjà plus haut est conservé');
  assert.equal(cityRushRivalWantedLevelAfterContact(4), 4);
  // Le seuil de poursuite : trois étoiles, pas moins.
  assert.equal(cityRushRivalPursued(0), false);
  assert.equal(cityRushRivalPursued(2), false, 'deux étoiles ne suffisent pas à envoyer une berline');
  assert.equal(cityRushRivalPursued(3), true);
  assert.equal(cityRushRivalPursued(5), true);
  assert.equal(cityRushRivalPursued(NaN), false);
  // Une seule berline par rival : celle de sa réserve, jamais l'escouade du joueur.
  assert.equal(CITY_RUSH_RIVAL_PURSUER_COUNT, CITY_RUSH_POLICE_EXTRA_PER_ATTACKER,
    'un rival reçoit exactement l’unité qui lui est réservée');
  assert.equal(cityRushRivalPursuerCount(0), 0);
  assert.equal(cityRushRivalPursuerCount(3), 1);
  assert.equal(cityRushRivalPursuerCount(5), 1, 'même à cinq étoiles, un rival n’a qu’une berline dédiée');
});

test('le premier du dernier tour est chassé comme le pilote', () => {
  // Le joueur a déjà son escouade : la règle ne rattrape qu'un rival.
  assert.equal(cityRushRivalLeaderWanted({ leader: 'nova', lastLap: true }), true);
  assert.equal(cityRushRivalLeaderWanted({ leader: { id: 'juno' }, lastLap: true }), true);
  assert.equal(cityRushRivalLeaderWanted({ leader: 'player', lastLap: true }), false,
    'le joueur n’a pas besoin de la règle : son escouade entre au même moment');
  assert.equal(cityRushRivalLeaderWanted({ leader: 'nova', lastLap: false }), false,
    'aucune poursuite avant l’ouverture du dernier tour');
  assert.equal(cityRushRivalLeaderWanted({ leader: null, lastLap: true }), false);
  assert.equal(cityRushRivalLeaderWanted({ leader: '', lastLap: true }), false);
  assert.equal(cityRushRivalLeaderWanted({ leader: { id: 'nova' }, lastLap: true, playerId: 'nova' }), false,
    'l’identifiant du joueur reste paramétrable');
  assert.equal(cityRushRivalLeaderWanted(), false);
});

test('chaque carte a un mini-garage élargi au centre des deux voies centrales', () => {
  assert.equal(CITY_RUSH_MINI_GARAGE_COUNT, 1, 'une seule porte : celle de mi-course');
  assert.equal(CITY_RUSH_MINI_GARAGE_LANE_COUNT, 2);
  assert.ok(CITY_RUSH_MINI_GARAGE_WIDTH >= CITY_RUSH_LANE_WIDTH * 2, 'le portique couvre la largeur de deux voies');
  assert.ok(CITY_RUSH_MINI_GARAGE_WIDTH < CITY_RUSH_ROAD_WIDTH, 'il reste à l’intérieur de la chaussée');
  assert.equal(CITY_RUSH_MINI_GARAGE_REPAIR_AMOUNT, 6, 'le garage rend six carrés au maximum');
  assert.ok(CITY_RUSH_MINI_GARAGE_SIGN_LEAD >= 20, 'l’indication de voie se voit arriver quelques dizaines de mètres avant');
  for (const course of CITY_RUSH_COURSES) {
    const { laneCount, laneX } = cityRushLaneConfig(course);
    const garageLanes = cityRushMiniGarageLanes(course);
    const expectedCount = Math.min(CITY_RUSH_MINI_GARAGE_LANE_COUNT, laneCount);
    const expectedFirst = Math.floor((laneCount - expectedCount) / 2);
    assert.deepEqual(garageLanes, Array.from({ length: expectedCount }, (_, index) => expectedFirst + index),
      `${course.id} couvre les voies centrales`);
    assert.equal(cityRushMiniGarageLane(course), garageLanes[0], `${course.id} conserve une voie de référence stable`);
    if (garageLanes.length === 2) {
      assert.equal((laneX(garageLanes[0]) + laneX(garageLanes[1])) / 2, 0,
        `${course.id} centre le portique entre ses deux voies`);
    }
  }
  assert.deepEqual(cityRushMiniGarageLanes(CITY_RUSH_CITIES[0]), [2, 3], 'voies 3 et 4 sur les routes urbaines à six voies');
  assert.deepEqual(cityRushMiniGarageLanes(CITY_RUSH_NORDSCHLEIFE_COURSE), [1, 2], 'les deux voies centrales du Ring');

  const distances = cityRushMiniGarageTrackDistances();
  assert.equal(distances.length, CITY_RUSH_MINI_GARAGE_COUNT);
  assert.equal(distances[0], cityRushMiniGarageMidRaceDistance(), 'la porte est posée à mi-parcours');
  assert.equal(distances[0], cityRushRaceDistance() * CITY_RUSH_MINI_GARAGE_MID_RACE_SHARE);
  assert.equal(distances[0], cityRushRaceDistance() / 2, 'elle tombe exactement à la moitié du parcours');
  // La porte du dernier tour a été retirée : plus aucun portique après la
  // ligne du dernier tour.
  const finalLapStart = (CITY_RUSH_LAPS - 1) * CITY_RUSH_LAP_LENGTH;
  assert.ok(distances.every((distance) => distance < finalLapStart),
    'aucun mini-garage ne subsiste sur le dernier tour', distances);
  // Quelle que soit la longueur du mode, la porte reste au milieu.
  for (const laps of [1, 3, CITY_RUSH_LAPS]) {
    const track = cityRushMiniGarageTrackDistances({ laps });
    assert.equal(track.length, CITY_RUSH_MINI_GARAGE_COUNT);
    assert.ok(Math.abs(track[0] / cityRushRaceDistance(laps) - 0.5) < 1e-9, `${laps} tours : la porte tombe à mi-course`);
  }

  assert.ok(CITY_RUSH_MINI_GARAGE_TRAVERSE_HALF_LENGTH > 3.5 && CITY_RUSH_MINI_GARAGE_TRAVERSE_HALF_LENGTH < 3.6);
  const garageLanes = cityRushMiniGarageLanes(CITY_RUSH_CITIES[0]);
  const exitDistance = distances[0] + CITY_RUSH_MINI_GARAGE_TRAVERSE_HALF_LENGTH;
  const crossing = {
    previousDistance: exitDistance - 1,
    nextDistance: exitDistance + 1,
    garageExitDistance: exitDistance,
    playerLane: garageLanes[0],
    garageLanes,
    wantedLevel: 3,
  };
  assert.equal(cityRushMiniGarageCanClearWanted(crossing), true, 'la recherche s’efface après avoir traversé le portique');
  assert.equal(cityRushMiniGarageCanClearWanted({ ...crossing, playerLane: garageLanes[1] }), true,
    'la deuxième voie centrale est également réparée');
  assert.equal(cityRushMiniGarageCanClearWanted({
    ...crossing,
    previousDistance: distances[0] - 1,
    nextDistance: distances[0] + 1,
  }), false, 'passer au centre du garage ne suffit pas : la voiture doit en sortir');
  assert.equal(cityRushMiniGarageCanClearWanted({ ...crossing, wantedLevel: 0 }), false, 'sans recherche, aucune étoile à effacer');
  assert.equal(cityRushMiniGarageCanClearWanted({ ...crossing, playerLane: garageLanes[0] - 1 }), false,
    'une voie extérieure au portique ne déclenche pas le service');
  assert.equal(cityRushMiniGarageCanClearWanted({ ...crossing, used: true }), false, 'le mini-garage ne sert qu’une fois');
  assert.equal(cityRushMiniGarageCanClearWanted({ ...crossing, previousDistance: exitDistance }), false, 'il faut franchir la sortie pendant cette image');
  assert.equal(cityRushMiniGarageCanClearWanted({ ...crossing, sprint: true }), false, 'aucun garage en Sprint');
});

test('le mini-garage baisse progressivement les niveaux de recherche élevés', () => {
  assert.equal(cityRushMiniGarageWantedLevel(5), 4, 'cinq étoiles descendent à quatre');
  assert.equal(cityRushMiniGarageWantedLevel(4), 3, 'quatre étoiles descendent à trois');
  assert.equal(cityRushMiniGarageWantedLevel(3), 0, 'trois étoiles sont entièrement effacées');
  assert.equal(cityRushMiniGarageWantedLevel(2), 0);
  assert.equal(cityRushMiniGarageWantedLevel(1), 0);
  assert.equal(cityRushMiniGarageWantedLevel(0), 0);
});

test('l’unique porte est ouverte dès le départ, jamais en Sprint', () => {
  assert.equal(cityRushMiniGarageAvailable(), true, 'la porte est là dès le premier mètre');
  assert.equal(cityRushMiniGarageAvailable({ sprint: true }), false, 'pas de garage en Sprint');
  for (const laps of [1, 3, CITY_RUSH_LAPS]) {
    for (let lap = 1; lap <= laps; lap += 1) {
      assert.equal(cityRushMiniGarageAvailable({ lap, laps }), true, `tour ${lap}/${laps} : la porte reste ouverte`);
      assert.equal(cityRushMiniGarageAvailable({ lap, laps, sprint: true }), false, `tour ${lap}/${laps} : jamais de garage en Sprint`);
    }
  }

  // La porte se traverse au début du quatrième tour d'une course de six tours,
  // sans étoiles ni escouade en piste.
  const midExit = cityRushMiniGarageMidRaceDistance() + CITY_RUSH_MINI_GARAGE_TRAVERSE_HALF_LENGTH;
  const garageLanes = cityRushMiniGarageLanes(CITY_RUSH_CITIES[0]);
  const crossing = {
    previousDistance: midExit - 1,
    nextDistance: midExit + 1,
    garageExitDistance: midExit,
    playerLane: garageLanes[0],
    garageLanes,
    lap: 4,
    laps: CITY_RUSH_LAPS,
    wantedLevel: 0,
  };
  assert.equal(cityRushMiniGarageCanUse(crossing), true, 'le garage sert même sans étoiles et sans escouade');
  assert.equal(cityRushMiniGarageCanUse({ ...crossing, playerLane: garageLanes[1] }), true, 'les deux voies centrales sont réparées');
  assert.equal(cityRushMiniGarageCanUse({ ...crossing, sprint: true }), false);
  assert.equal(cityRushMiniGarageCanUse({ ...crossing, playerLane: garageLanes[0] - 1 }), false, 'pas de réparation depuis une voie voisine');
  assert.equal(cityRushMiniGarageCanUse({ ...crossing, used: true }), false, 'pas de deuxième passage');
  assert.equal(cityRushMiniGarageCanUse({ ...crossing, nextDistance: midExit - 0.1 }), false, 'le service attend la sortie');
  assert.equal(cityRushMiniGarageCanUse({ ...crossing, previousDistance: midExit }), false, 'pas de service répété après la sortie');
});

test('chaque mini-garage rend six carrés au maximum, sans dépasser la coque ni ressusciter une épave', () => {
  assert.equal(CITY_RUSH_MINI_GARAGE_REPAIR_AMOUNT, 6);
  for (const car of CITY_RUSH_CARS) {
    const max = cityRushCarMaxHealth(car);
    const damaged = Math.max(1, max - 7);
    assert.equal(cityRushMiniGarageRepair(damaged, max), Math.min(max, damaged + 6), `${car.id} récupère six carrés au maximum`);
    assert.equal(cityRushMiniGarageRepair(max - 5, max), max, `${car.id} ne dépasse pas sa résistance`);
    assert.equal(cityRushMiniGarageRepair(max - 1, max), max, `${car.id} récupère son dernier carré`);
    assert.equal(cityRushMiniGarageRepair(max, max), max, `${car.id} reste pleine`);
    assert.equal(cityRushMiniGarageRepair(max + 2, max), max, `${car.id} reste plafonnée`);
    assert.equal(cityRushMiniGarageRepair(1, max), Math.min(max, 7), `${car.id} sort du seuil critique`);
    assert.equal(cityRushMiniGarageRepair(0, max), 0, 'une épave ne reprend pas la course');
  }
  assert.equal(cityRushMiniGarageRepair(-2), 0);
  assert.equal(cityRushMiniGarageRepair(NaN), 0);
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

// La coque de base (et celle des rivaux) fait quinze cellules ; celle du
// pilote suit désormais sa voiture (`cityRushCarMaxHealth`, éprouvé plus bas).
test('la coque de base fait quinze cellules ; tirs et carambolages coûtent une cellule', () => {
  assert.equal(CITY_RUSH_PLAYER_HEALTH, 15);
  assert.equal(CITY_RUSH_RACER_HEALTH, CITY_RUSH_PLAYER_HEALTH);
  assert.equal(CITY_RUSH_PLAYER_DAMAGE['blue-shot'], 1);
  assert.equal(CITY_RUSH_PLAYER_DAMAGE.pistol, 1);
  // Percuter une voiture — civile ou berline de police — retire un carré.
  assert.equal(CITY_RUSH_PLAYER_DAMAGE.collision, 1);
  // La herse crève les pneus : un carré, comme un carambolage.
  assert.equal(CITY_RUSH_PLAYER_DAMAGE.spike, 1);
  assert.ok(CITY_RUSH_PLAYER_COLLISION_COOLDOWN > 0.5 && CITY_RUSH_PLAYER_COLLISION_COOLDOWN <= 3,
    'le répit protège la barre des contacts à répétition sans immuniser le pilote');
  assert.equal(cityRushPlayerDamage(CITY_RUSH_PLAYER_HEALTH, 'blue-shot'), 14);
  assert.equal(cityRushPlayerDamage(CITY_RUSH_PLAYER_HEALTH, 'pistol'), 14);
  assert.equal(cityRushPlayerDamage(CITY_RUSH_PLAYER_HEALTH, 'collision'), CITY_RUSH_PLAYER_HEALTH - 1);
  assert.equal(cityRushPlayerDamage(5, 'collision'), 4);
  assert.equal(cityRushPlayerDamage(1, 'pistol'), 0);
  assert.equal(cityRushPlayerDamage(0, 'blue-shot'), 0);
  assert.equal(cityRushPlayerDamage(5, 'spike'), 4, 'la herse retire un carré');
  assert.equal(cityRushPlayerDamage(1, 'spike'), 0, 'la herse ne passe pas sous zéro');
  assert.equal(cityRushPlayerDamage(5, 'boost'), 5);
  assert.equal(cityRushPlayerDamage(5, undefined), 4);
  assert.equal(cityRushPlayerDamage(-3, 'collision'), 0);
  assert.equal(CITY_RUSH_PLAYER_HEALTH_CRITICAL, 3);
  assert.equal(CITY_RUSH_HEALTH_GROUP_SIZE, 5);

  // La police garde une coque distincte mais au même tarif : trois bleus, six
  // rouges ou six carambolages la détruisent. Chaque carambolage coûte aussi un
  // carré au pilote, avec le répit partagé qui borne les contacts à répétition.
  assert.equal(CITY_RUSH_POLICE_HEALTH, 6);
  assert.equal(CITY_RUSH_POLICE_DAMAGE.pistol, 1, 'le tir rouge ne retire qu’un carré à une berline');
  assert.equal(CITY_RUSH_POLICE_DAMAGE.pistol, CITY_RUSH_PLAYER_DAMAGE.pistol,
    'une balle rouge coûte le même carré à une voiture de police qu’à un adversaire');
  assert.equal(CITY_RUSH_POLICE_DAMAGE.collision, 1);
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, 'collision'), CITY_RUSH_POLICE_HEALTH - 1);
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, 'pistol'), CITY_RUSH_POLICE_HEALTH - 1);
  assert.ok(CITY_RUSH_POLICE_COLLISION_COOLDOWN > 0.5);
  assert.ok(CITY_RUSH_POLICE_COLLISION_TOLERANCE > 0);
});

test('chaque voiture a ses propres points de vie, calés à l’envers de sa puissance', () => {
  // Le barème de référence reste quinze carrés, mais il n'est plus qu'une
  // moyenne : chaque coque a son `durabilityMultiplier`, et la vie réelle vient
  // de `cityRushCarMaxHealth`.
  const expected = Object.freeze({
    'city-hatch': 23,
    'nova-18-gt': 20,
    'night-comet': 18,
    'ae86': 19,
    'vice-roadster': 14,
    'turbo-gt': 13,
    'muscle-86': 12,
    'vega-gt-67': 11,
    'toro-v12': 9,
    'volt-aero': 15,
    'atlas-xr': 17,
    'pulse-rs': 7,
  });
  for (const car of CITY_RUSH_CARS) {
    assert.ok(Number.isFinite(car.durability) && car.durability > 0 && car.durability <= 100,
      `${car.name} annonce une jauge de coque lisible`);
    assert.ok(Number.isFinite(car.durabilityMultiplier) && car.durabilityMultiplier > 0,
      `${car.name} a un multiplicateur de coque`);
    assert.equal(cityRushCarMaxHealth(car), expected[car.id], `${car.name} encaisse ses carrés`);
  }

  // Variété voulue : la plus lente est un tank, la plus rapide une coque de
  // papier, et la résistance n'est pas une simple fonction de la vitesse — le
  // VOLT AERO GT (1,18 de pointe) encaisse plus que le VORTEX RS-10 (1,22) et
  // le KRONOS 930 TURBO (1,14).
  const slowest = [...CITY_RUSH_CARS].sort((a, b) => a.powerMultiplier - b.powerMultiplier)[0];
  const fastest = [...CITY_RUSH_CARS].sort((a, b) => b.powerMultiplier - a.powerMultiplier)[0];
  assert.equal(slowest.id, 'city-hatch');
  assert.equal(fastest.id, 'pulse-rs');
  assert.ok(cityRushCarMaxHealth(slowest) >= 3 * cityRushCarMaxHealth(fastest),
    'entre la citadine et la supercar, la coque varie de plus du triple');
  const volt = CITY_RUSH_CARS.find((car) => car.id === 'volt-aero');
  const vortex = CITY_RUSH_CARS.find((car) => car.id === 'muscle-86');
  assert.ok(volt.powerMultiplier < vortex.powerMultiplier);
  assert.ok(cityRushCarMaxHealth(volt) > cityRushCarMaxHealth(vortex),
    'une voiture plus lente peut être plus fragile qu’une plus rapide : le barème n’est pas monotone');
  // La moyenne du garage reste celle du barème historique : la difficulté
  // d'ensemble ne bouge pas, seule sa répartition change.
  const average = CITY_RUSH_CARS.reduce((sum, car) => sum + cityRushCarMaxHealth(car), 0) / CITY_RUSH_CARS.length;
  assert.ok(Math.abs(average - CITY_RUSH_PLAYER_HEALTH) < 1,
    `la moyenne du catalogue (${average.toFixed(2)}) tient le barème de quinze`);

  // Entrées aberrantes : on retombe sur la référence, jamais sur zéro.
  assert.equal(cityRushCarMaxHealth(null), CITY_RUSH_PLAYER_HEALTH);
  assert.equal(cityRushCarMaxHealth({}), CITY_RUSH_PLAYER_HEALTH);
  assert.equal(cityRushCarMaxHealth({ durabilityMultiplier: 0 }), CITY_RUSH_PLAYER_HEALTH);
  assert.equal(cityRushCarMaxHealth({ durabilityMultiplier: 'x' }), CITY_RUSH_PLAYER_HEALTH);
  assert.ok(cityRushCarMaxHealth({ durabilityMultiplier: 0.01 }) >= CITY_RUSH_CAR_HEALTH_MIN,
    'aucune voiture ne tombe sous le plancher de quatre carrés');
  assert.equal(CITY_RUSH_RACER_HEALTH, CITY_RUSH_PLAYER_HEALTH, 'le barème de référence reste exporté');
});

test('une barre de vie se découpe selon la coque de la voiture', () => {
  // Sept carrés (PULSE RS) : cinq bleus, puis la dernière longueur en jaune.
  const small = cityRushHealthSegments(7, 7);
  assert.equal(small.length, 7);
  assert.deepEqual(small.map((segment) => segment.group), [...Array(5).fill('blue'), ...Array(2).fill('yellow')]);
  assert.deepEqual(cityRushHealthSegments(2, 7).map((segment) => segment.tone), [
    ...Array(5).fill('blue'), 'critical', 'critical',
  ], 'à deux carrés, les deux dernières cellules passent au rouge');

  // Vingt-trois carrés (MISTRAL 1.4) : cinq groupes, aucun carré inventé.
  const large = cityRushHealthSegments(23, 23);
  assert.equal(large.length, 23);
  assert.equal(new Set(large.map((segment) => segment.groupIndex)).size, 5);
  assert.ok(large.every((segment) => segment.active));
  assert.deepEqual(large.map((segment) => segment.group), [
    ...Array(10).fill('blue'), ...Array(10).fill('green'), ...Array(3).fill('yellow'),
  ]);
  assert.equal(large.filter((segment) => segment.critical).length, 0, 'au complet, rien n’est critique');
  assert.deepEqual(cityRushHealthSegments(3, 23).filter((segment) => segment.critical).length, 3);
  assert.deepEqual(cityRushHealthSegments(3, 15).slice(10).map((segment) => segment.tone),
    ['yellow', 'yellow', 'critical', 'critical', 'critical'],
    'la barre de quinze carrés garde exactement son découpage historique');

  // Bornes : jamais plus de cellules que la coque, jamais de carré négatif.
  assert.equal(cityRushHealthSegments(30, 23).length, 23);
  assert.equal(cityRushHealthSegments(30, 23).filter((segment) => segment.active).length, 23);
  assert.equal(cityRushHealthSegments(-4, 7).filter((segment) => segment.active).length, 0);
  assert.equal(cityRushHealthSegments('x', 'x').length, CITY_RUSH_PLAYER_HEALTH);
  assert.equal(cityRushPlayerHealthColor(7, 7), CITY_RUSH_PLAYER_BAR_COLORS.blue);
  assert.equal(cityRushPlayerHealthColor(2, 7), CITY_RUSH_PLAYER_BAR_COLORS.critical);
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
  // Le rival ordinaire vise le bonus turbo proche avant le bonus de tir lointain.
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
  // Une berline qui touche le trafic le traite comme un rival : même détecteur,
  // donc même enveloppe de carrosserie (3,6 m dans l'axe).
  const impacts = detectCityRushTrafficImpacts([
    { id: 'police-1', collisionGroup: 'racer', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.94, previousDistance: 1000, nextDistance: 1001.6 },
    { id: 'traffic-1', collisionGroup: 'traffic', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.94, previousDistance: 1004.6, nextDistance: 1004.7 },
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
test('une berline de police en saut franchit le trafic mais ne traverse pas les pilotes', () => {
  const flyingPolice = resolveCityRushPoliceMovement([
    { id: 'police-airborne', lane: 1, x: CITY_RUSH_LANE_X[1], distance: 1000, nextDistance: 1030, width: 1.94, jumping: true },
  ], [{ id: 'truck', lane: 1, x: CITY_RUSH_LANE_X[1], distance: 1010, nextDistance: 1012, width: 2.1 }], CITY_RUSH_CAR_GAP)[0];
  assert.equal(flyingPolice.nextDistance, 1030, 'la police ne percute pas le camion pendant son saut');
  assert.equal(flyingPolice.blockedBy, null);

  const groundedPolice = resolveCityRushPoliceMovement([
    { id: 'police-grounded', lane: 1, x: CITY_RUSH_LANE_X[1], distance: 1000, nextDistance: 1030, width: 1.94 },
  ], [{ id: 'truck-airborne', lane: 1, x: CITY_RUSH_LANE_X[1], distance: 1010, nextDistance: 1012, width: 2.1, jumping: true }], CITY_RUSH_CAR_GAP)[0];
  assert.equal(groundedPolice.nextDistance, 1030, 'une voiture au sol ne freine pas derrière un camion en l’air');
  assert.equal(groundedPolice.blockedBy, null);

  const racerStillBlocks = resolveCityRushPoliceMovement([
    { id: 'police-airborne', lane: 1, x: CITY_RUSH_LANE_X[1], distance: 1000, nextDistance: 1030, width: 1.94, jumping: true },
  ], [], CITY_RUSH_CAR_GAP, [
    { id: 'player', lane: 1, x: CITY_RUSH_LANE_X[1], distance: 1010, nextDistance: 1012, width: 1.9 },
  ])[0];
  assert.equal(racerStillBlocks.nextDistance, 1012 - CITY_RUSH_CAR_GAP,
    'même en vol, la police n’atterrit pas en traversant un pilote');
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

test('barre de vie des berlines : six carrés, un seul emporté par tir rouge, un point par carambolage', () => {
  assert.equal(CITY_RUSH_POLICE_HEALTH, 6);
  assert.equal(CITY_RUSH_POLICE_DAMAGE[CITY_RUSH_POWERS.BLUE_SHOT], 2);
  assert.equal(CITY_RUSH_POLICE_DAMAGE[CITY_RUSH_POWERS.PISTOL], 1);
  assert.equal(CITY_RUSH_POLICE_DAMAGE.collision, 1);
  assert.equal(CITY_RUSH_POLICE_DAMAGE[CITY_RUSH_POWERS.RADIO], 0,
    'l’attaque d’hélicoptère n’inflige plus de dégâts');

  const afterFirstBlue = cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.BLUE_SHOT);
  const afterSecondBlue = cityRushPoliceDamage(afterFirstBlue, CITY_RUSH_POWERS.BLUE_SHOT);
  assert.equal(afterFirstBlue, 4);
  assert.equal(afterSecondBlue, 2);
  assert.equal(cityRushPoliceDamage(afterSecondBlue, CITY_RUSH_POWERS.BLUE_SHOT), 0);

  // Un tir rouge ne retire qu’un carré : la berline n’est jamais effacée d’un
  // coup, et un chargeur de sept balles en vient à bout avec une balle de reste.
  const afterFirstRed = cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.PISTOL);
  assert.equal(afterFirstRed, 5, 'le premier tir rouge laisse cinq carrés sur six');
  let redHealth = CITY_RUSH_POLICE_HEALTH;
  for (let shot = 1; shot <= 5; shot += 1) {
    redHealth = cityRushPoliceDamage(redHealth, CITY_RUSH_POWERS.PISTOL);
    assert.equal(redHealth, CITY_RUSH_POLICE_HEALTH - shot, `le tir rouge ${shot} ne retire qu’un carré`);
  }
  assert.equal(cityRushPoliceDamage(redHealth, CITY_RUSH_POWERS.PISTOL), 0, 'le sixième tir rouge achève la berline');
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, 'collision'), 5,
    'un carambolage en accélérant coûte le même carré qu’une balle rouge');
  assert.equal(cityRushPoliceDamage(afterFirstRed, 'collision'), 4,
    'un carambolage en accélérant retire un seul point après le tir rouge');
  assert.equal(cityRushPoliceDamage(cityRushPoliceDamage(afterFirstRed, 'collision'), 'collision'), 3);
  assert.equal(cityRushPoliceDamage(cityRushPoliceDamage(cityRushPoliceDamage(afterFirstRed, 'collision'), 'collision'), 'collision'), 2,
    'trois carambolages supplémentaires laissent encore deux carrés à une berline touchée par un tir rouge');
  assert.equal(cityRushPoliceDamage(1, 'collision'), 0);
  assert.equal(cityRushPoliceDamage(0, CITY_RUSH_POWERS.BLUE_SHOT), 0);
  // Un saut de tremplin ne détruit plus la berline qui retombe : il lui coûte
  // deux carrés, et la casse n'arrive qu'à la barre vidée.
  assert.equal(CITY_RUSH_POLICE_RAMP_LANDING_SOURCE, 'ramp-landing');
  assert.equal(CITY_RUSH_POLICE_RAMP_LANDING_DAMAGE, 2);
  assert.equal(CITY_RUSH_POLICE_DAMAGE[CITY_RUSH_POLICE_RAMP_LANDING_SOURCE],
    CITY_RUSH_POLICE_RAMP_LANDING_DAMAGE);
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.RADIO), CITY_RUSH_POLICE_HEALTH,
    'une attaque d’hélicoptère est désactivée');
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_PICKUPS.BOOST), CITY_RUSH_POLICE_HEALTH);
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, null), CITY_RUSH_POLICE_HEALTH);
  assert.equal(cityRushPoliceDamage(Number.NaN, CITY_RUSH_POWERS.BLUE_SHOT), 0);
});

test('une berline qui retombe d’un saut perd deux carrés et survit jusqu’à la barre vide', () => {
  // L’atterrissage n’est plus une exécution : c’est un dégât comme un autre,
  // au prix d’un tir bleu. La casse n’arrive que lorsque la barre tombe à zéro.
  const landing = CITY_RUSH_POLICE_RAMP_LANDING_SOURCE;
  assert.equal(CITY_RUSH_POLICE_DAMAGE[landing], CITY_RUSH_POLICE_RAMP_LANDING_DAMAGE);
  assert.equal(CITY_RUSH_POLICE_DAMAGE[landing], CITY_RUSH_POLICE_DAMAGE[CITY_RUSH_POWERS.BLUE_SHOT],
    'un atterrissage coûte le même prix qu’un tir bleu');

  // Berline : six carrés, donc deux sauts encaissés et la casse au troisième.
  const sedan = cityRushPoliceMaxHealth('police');
  assert.equal(sedan, CITY_RUSH_POLICE_HEALTH);
  const firstLanding = cityRushPoliceDamage(sedan, landing);
  assert.equal(firstLanding, 4, 'le premier atterrissage laisse quatre carrés sur six');
  assert.ok(firstLanding > 0, 'la berline n’est pas détruite au premier saut');
  const secondLanding = cityRushPoliceDamage(firstLanding, landing);
  assert.equal(secondLanding, 2, 'le deuxième atterrissage laisse deux carrés');
  assert.ok(secondLanding > 0, 'la berline tient encore sur ses roues');
  assert.equal(cityRushPoliceDamage(secondLanding, landing), 0,
    'le troisième atterrissage vide la barre : c’est lui qui détruit la berline');
  assert.equal(cityRushPoliceShotsLeft(sedan, landing), 3, 'trois tremplins pour une berline neuve');
  assert.equal(cityRushPoliceShotsLeft(secondLanding, landing), 1, 'plus qu’un tremplin avant la casse');

  // SUV blindé : dix carrés, quatre sauts encaissés et la casse au cinquième.
  let suv = cityRushPoliceMaxHealth('police-suv');
  assert.equal(suv, CITY_RUSH_POLICE_SUV_HEALTH);
  assert.equal(cityRushPoliceShotsLeft(suv, landing), 5, 'cinq tremplins pour un SUV blindé');
  for (let jump = 1; jump <= 4; jump += 1) {
    suv = cityRushPoliceDamage(suv, landing);
    assert.equal(suv, CITY_RUSH_POLICE_SUV_HEALTH - jump * CITY_RUSH_POLICE_RAMP_LANDING_DAMAGE,
      `le saut ${jump} retire deux carrés au SUV`);
    assert.ok(suv > 0, `le SUV survit au saut ${jump}`);
  }
  assert.equal(cityRushPoliceDamage(suv, landing), 0, 'le cinquième atterrissage détruit le SUV');

  // Un saut pris sur une coque déjà entamée par les balles peut achever la
  // berline : les dégâts se cumulent, sans jamais passer sous zéro.
  const shotSedan = cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.PISTOL);
  assert.equal(cityRushPoliceDamage(shotSedan, landing), 3,
    'une balle rouge puis un atterrissage laissent trois carrés');
  assert.equal(cityRushPoliceDamage(cityRushPoliceDamage(shotSedan, landing), landing), 1,
    'deux atterrissages après la balle rouge laissent encore un carré : la berline roule');
  assert.equal(cityRushPoliceDamage(cityRushPoliceDamage(cityRushPoliceDamage(shotSedan, landing), landing), landing), 0,
    'le troisième atterrissage achève la berline déjà touchée d’une balle');
  assert.equal(cityRushPoliceDamage(1, landing), 0, 'le dernier carré part d’un coup');
  assert.equal(cityRushPoliceDamage(0, landing), 0, 'une épave n’a plus rien à perdre');
  assert.equal(cityRushPoliceShotsLeft(0, landing), 0);
});

test('un tir rouge ne retire jamais qu’un seul carré — berline de police comme adversaire', () => {
  // Le même prix pour tout le monde : une balle rouge = une cellule.
  assert.equal(CITY_RUSH_POLICE_DAMAGE[CITY_RUSH_POWERS.PISTOL], 1);
  assert.equal(CITY_RUSH_PLAYER_DAMAGE[CITY_RUSH_POWERS.PISTOL], 1);

  // Côté adversaires : quinze carrés, un par balle.
  let racerHealth = CITY_RUSH_RACER_HEALTH;
  for (let shot = 1; shot <= CITY_RUSH_RACER_HEALTH; shot += 1) {
    const next = cityRushPlayerDamage(racerHealth, CITY_RUSH_POWERS.PISTOL);
    assert.equal(racerHealth - next, 1, `le tir rouge ${shot} ne retire qu’un carré à un pilote`);
    racerHealth = next;
  }
  assert.equal(racerHealth, 0, 'quinze balles rouges couchent une voiture de course');
  assert.equal(cityRushPlayerDamage(0, CITY_RUSH_POWERS.PISTOL), 0, 'une épave n’a plus de carré à perdre');

  // Côté police : six carrés sur le toit, un par balle — plus de frappe à trois
  // points qui effaçait la moitié de la barre d’un seul tir.
  let policeHealth = CITY_RUSH_POLICE_HEALTH;
  for (let shot = 1; shot <= CITY_RUSH_POLICE_HEALTH; shot += 1) {
    const next = cityRushPoliceDamage(policeHealth, CITY_RUSH_POWERS.PISTOL);
    assert.equal(policeHealth - next, 1, `le tir rouge ${shot} ne retire qu’un carré à une berline`);
    policeHealth = next;
  }
  assert.equal(policeHealth, 0, 'six balles rouges détruisent une berline');
  assert.equal(cityRushPoliceDamage(0, CITY_RUSH_POWERS.PISTOL), 0, 'une berline explosée n’a plus de carré à perdre');

  // Le tir rouge reste utile contre la police : un chargeur entier vient à bout
  // d’une berline neuve, avec une balle de reste.
  assert.ok(CITY_RUSH_PISTOL_AMMO_PER_PICKUP >= CITY_RUSH_POLICE_HEALTH,
    'un chargeur doit pouvoir venir à bout d’une berline à six carrés');
});

test('le bandeau « berline touchée » compte les tirs restants, pas les points de vie', () => {
  assert.equal(cityRushPoliceShotsLeft(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.BLUE_SHOT), 3, 'trois tirs bleus au départ');
  assert.equal(cityRushPoliceShotsLeft(2, CITY_RUSH_POWERS.BLUE_SHOT), 1, 'un tir bleu après le premier');
  assert.equal(cityRushPoliceShotsLeft(0, CITY_RUSH_POWERS.BLUE_SHOT), 0, 'épave : plus rien à tirer');
  assert.equal(cityRushPoliceShotsLeft(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.PISTOL), 6, 'six tirs rouges au départ');
  assert.equal(cityRushPoliceShotsLeft(3, CITY_RUSH_POWERS.PISTOL), 3, 'trois tirs rouges après trois carrés perdus');
  assert.equal(cityRushPoliceShotsLeft(CITY_RUSH_POLICE_HEALTH - 1, CITY_RUSH_POWERS.PISTOL), 5,
    'un tir rouge encaissé laisse cinq cartouches à tirer');
  assert.equal(cityRushPoliceShotsLeft(CITY_RUSH_POLICE_HEALTH, 'collision'), 6, 'six petits carambolages au départ');
  assert.equal(cityRushPoliceShotsLeft(3, 'collision'), 3, 'trois carambolages pour trois carrés restants');
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
  assert.equal(Object.hasOwn(inventory, CITY_RUSH_PICKUPS.BOOST), false, 'le bonus turbo ne se stocke pas');
  assert.equal(consumeCityRushCharge(inventory, CITY_RUSH_POWERS.PISTOL).consumed, false);
  assert.equal(consumeCityRushCharge(inventory, CITY_RUSH_POWERS.BLUE_SHOT).consumed, false);
  assert.equal(consumeCityRushCharge(inventory, CITY_RUSH_POWERS.RADIO).consumed, false);
  assert.equal(createCityRushInventory()[CITY_RUSH_POWERS.PISTOL], 0);
});

test('un pilote ne traverse plus une berline de police du dernier tour', () => {
  // L'escouade est engagée dans le peloton : sa berline solide bloque la voie
  // exactement comme le trafic lent. Ce module ne facture rien lui-même : seul
  // le contact réel, joué par le monde 3D, retire un carré au pilote.
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

test('the Nürburgring plays at a slower pace, every other course keeps the historic speed', () => {
  // Le Ring est le seul parcours à porter `pace` : 73 virages sur 9,20 m de
  // bitume se lisent mieux à ~107 km/h qu'à 126. Le facteur ralentit **tout**
  // ce qui roule — pilote, rivaux, trafic, police — donc la difficulté
  // relative ne bouge pas, seul le défilement baisse.
  assert.equal(CITY_RUSH_NORDSCHLEIFE_COURSE.pace, CITY_RUSH_RACEWAY_PACE);
  assert.ok(CITY_RUSH_RACEWAY_PACE < 1, 'le Ring est plus posé que la ville');
  assert.ok(CITY_RUSH_RACEWAY_PACE >= CITY_RUSH_COURSE_PACE_MIN, 'et il reste au-dessus du garde-fou');
  assert.equal(cityRushCoursePace('nordschleife'), CITY_RUSH_RACEWAY_PACE);
  assert.equal(cityRushCoursePace(CITY_RUSH_NORDSCHLEIFE_COURSE), CITY_RUSH_RACEWAY_PACE);
  // Le tōgé roule au même facteur que le Ring : 1582° de virages sur une
  // chaussée de 6,40 m se lisent à ~107 km/h, et les épingles ajoutent leur
  // propre freinage par le facteur de virage.
  assert.equal(CITY_RUSH_TOUGE_COURSE.pace, CITY_RUSH_RACEWAY_PACE);
  assert.equal(cityRushCoursePace('touge'), CITY_RUSH_RACEWAY_PACE);

  for (const course of CITY_RUSH_COURSES.filter((entry) => entry.id !== 'nordschleife' && entry.id !== 'touge')) {
    assert.equal(course.pace, undefined, `${course.id} garde le rythme historique`);
    assert.equal(cityRushCoursePace(course), 1);
    assert.equal(cityRushCoursePace(course.id), 1);
  }

  // Garde-fous : un parcours inconnu, muet ou mal renseigné roule à 1, un
  // facteur hors bornes est ramené dans [`CITY_RUSH_COURSE_PACE_MIN`, 1] —
  // personne n'accélère la course, personne ne la fige.
  assert.equal(cityRushCoursePace(null), 1);
  assert.equal(cityRushCoursePace('inconnu'), 1);
  assert.equal(cityRushCoursePace({ pace: 'vite' }), 1);
  assert.equal(cityRushCoursePace({ pace: 0 }), 1);
  assert.equal(cityRushCoursePace({ pace: -2 }), 1);
  assert.equal(cityRushCoursePace({ pace: 4 }), 1);
  assert.equal(cityRushCoursePace({ pace: 0.01 }), CITY_RUSH_COURSE_PACE_MIN);

  // Vitesse annoncée : 35 m/s × 0,85 ≈ 107 km/h au lieu de 126.
  const ringTop = cityRushPacedSpeed(CITY_RUSH_PLAYER_SPEED, 'nordschleife');
  assert.ok(Math.abs(ringTop - CITY_RUSH_PLAYER_SPEED * CITY_RUSH_RACEWAY_PACE) < 1e-9);
  const ringKmh = ringTop * 3.6;
  assert.ok(ringKmh > 100 && ringKmh < 115, `le Ring se joue à ${ringKmh.toFixed(0)} km/h`);
  assert.ok(ringKmh < CITY_RUSH_PLAYER_SPEED * 3.6, 'et plus lentement qu’en ville');
  assert.equal(cityRushPacedSpeed(CITY_RUSH_PLAYER_SPEED, 'vice-city'), CITY_RUSH_PLAYER_SPEED);
  assert.equal(cityRushPacedSpeed(CITY_RUSH_PLAYER_SPEED), CITY_RUSH_PLAYER_SPEED);
  assert.equal(cityRushPacedSpeed('abc', 'nordschleife'), 0);

  // Le streaming et le chrono du Sprint suivent la voiture du parcours : à
  // vitesse plus basse, la marge du Sprint s'élargit au lieu de se resserrer.
  assert.ok(cityRushSprintCheckpointTime(ringTop) > cityRushSprintCheckpointTime(CITY_RUSH_PLAYER_SPEED));
  assert.ok(cityRushSprintCheckpointTime(ringTop) <= CITY_RUSH_SPRINT_CHECKPOINT_TIME_MAX);

  // Accélération **et** freinage suivent le même facteur, plancher de freinage
  // compris : la montée en régime garde exactement sa durée, à une pointe plus
  // basse, et une voiture ralentit moins vite en valeur absolue.
  assert.equal(approachCityRushSpeed(0, 30, 10, 1), 10);
  assert.ok(Math.abs(approachCityRushSpeed(0, 30, 10, 1, CITY_RUSH_RACEWAY_PACE) - 10 * CITY_RUSH_RACEWAY_PACE) < 1e-9);
  let flat = 0;
  let paced = 0;
  for (let second = 0; second < 6; second += 1) {
    flat = approachCityRushSpeed(flat, CITY_RUSH_PLAYER_SPEED, 10, 1);
    paced = approachCityRushSpeed(paced, ringTop, 10, 1, CITY_RUSH_RACEWAY_PACE);
  }
  assert.ok(Math.abs(flat - CITY_RUSH_PLAYER_SPEED) < 1e-9);
  assert.ok(Math.abs(paced - ringTop) < 1e-9, 'même durée pour atteindre la pointe du parcours');
  // Le plancher de freinage (12 m/s²) est celui d'une citadine : sans le
  // facteur, elle freinerait relativement plus fort sur le Ring qu'en ville.
  assert.ok(Math.abs(cityRushBrakingRate(6) - CITY_RUSH_BRAKE_RATE_FLOOR) < 1e-9, 'le plancher s’applique à 6 m/s²');
  const brakingFlat = approachCityRushSpeed(30, 10, 6, 1);
  const brakingPaced = approachCityRushSpeed(30, 10, 6, 1, CITY_RUSH_RACEWAY_PACE);
  assert.ok(brakingPaced > brakingFlat, 'la décélération suit le rythme du parcours');
  assert.ok(Math.abs((30 - brakingPaced) - (30 - brakingFlat) * CITY_RUSH_RACEWAY_PACE) < 1e-9);
  // Sans le facteur, l'appel historique ne change pas d'un poil.
  assert.equal(approachCityRushSpeed(30, 10, 6, 1, 1), brakingFlat);
  assert.equal(approachCityRushSpeed(30, 10, 6, 1, 0), brakingFlat, 'un facteur invalide retombe sur 1');
});

test('Vice City et le Ring ralentissent les voitures dans les grands virages', () => {
  // Seuls ces deux parcours tournent vraiment. Les autres gardent leur vitesse,
  // y compris au cœur de leurs S doux : un facteur oublié sur Tokyo ou la
  // Route 66 se lirait ici.
  assert.deepEqual([...CITY_RUSH_CORNER_PACE_COURSES], ['vice-city', 'nordschleife', 'touge']);
  assert.equal(CITY_RUSH_CORNER_PACE_SWEEP, 0.72);
  assert.equal(CITY_RUSH_CORNER_PACE_MIN, 0.58);
  assert.equal(CITY_RUSH_CORNER_PACE_PREBRAKE_METERS, 40);
  assert.ok(CITY_RUSH_CORNER_PACE_MIN < CITY_RUSH_CORNER_PACE_SWEEP && CITY_RUSH_CORNER_PACE_SWEEP < 1);
  assert.ok(CITY_RUSH_CORNER_PACE_YAW_START < CITY_RUSH_CORNER_PACE_YAW_SWEEP);
  assert.ok(CITY_RUSH_CORNER_PACE_YAW_SWEEP < CITY_RUSH_CORNER_PACE_YAW_TIGHT);

  for (const course of CITY_RUSH_COURSES) {
    const uses = cityRushUsesCornerPace(course) && cityRushUsesCornerPace(course.id);
    assert.equal(uses, course.id === 'vice-city' || course.id === 'nordschleife' || course.id === 'touge', course.id);
    let slowest = 1;
    for (let index = 0; index < 240; index += 1) {
      slowest = Math.min(slowest, cityRushCornerPace(course, index * CITY_RUSH_LAP_LENGTH / 240));
    }
    if (!uses) {
      assert.equal(slowest, 1, `${course.id} ne lève pas le pied dans ses courbes`);
      assert.equal(cityRushCornerPace(course.id, CITY_RUSH_LAP_LENGTH * 0.18), 1);
    } else {
      assert.ok(slowest <= CITY_RUSH_CORNER_PACE_SWEEP, `${course.id} ralentit vraiment (${slowest.toFixed(2)})`);
    }
  }
  assert.equal(cityRushUsesCornerPace(null), false);
  assert.equal(cityRushUsesCornerPace('inconnu'), false);
  assert.equal(cityRushCornerPace(null, 400), 1);
  assert.equal(cityRushCornerPace('paris', 400), 1);
  assert.equal(cityRushCornerPaceFromYaw(Number.NaN), 1);
  assert.equal(cityRushCornerPaceFromYaw(0), 1);
  assert.equal(cityRushCornerPaceFromYaw(CITY_RUSH_CORNER_PACE_YAW_START), 1);
  assert.equal(cityRushCornerPaceFromYaw(-CITY_RUSH_CORNER_PACE_YAW_SWEEP), CITY_RUSH_CORNER_PACE_SWEEP);
  assert.equal(cityRushCornerPaceFromYaw(CITY_RUSH_CORNER_PACE_YAW_TIGHT), CITY_RUSH_CORNER_PACE_MIN);
  assert.equal(cityRushCornerPaceFromYaw(Math.PI / 2), CITY_RUSH_CORNER_PACE_MIN, 'au-delà de la cassure, le plancher tient');
  // La descente est lisse : pas de marche entre la ligne droite et le virage.
  const midYaw = (CITY_RUSH_CORNER_PACE_YAW_START + CITY_RUSH_CORNER_PACE_YAW_SWEEP) / 2;
  const midPace = cityRushCornerPaceFromYaw(midYaw);
  assert.ok(midPace < 1 && midPace > CITY_RUSH_CORNER_PACE_SWEEP, 'le grand virage se prend en levant le pied, pas d’un bloc');

  // Vice City : pleine vitesse sur les longues droites, freinage anticipé à
  // l'approche, ralentissement net dans les courbes et plus fort dans les
  // virages secs.
  assert.equal(cityRushCornerPace('vice-city', 0), 1, 'la ligne de départ reste à fond');
  assert.equal(cityRushCornerPace('vice-city', 240), 1, 'la longue droite garde sa vitesse');
  assert.ok(cityRushCornerPace('vice-city', 270) < 1, 'le freinage commence avant le virage de MacArthur');
  assert.equal(
    cityRushCornerPace('vice-city', 270),
    cityRushCornerPace('vice-city', 270 + CITY_RUSH_LAP_LENGTH),
    'le freinage anticipé se répète au tour suivant',
  );
  const longTurns = CITY_RUSH_VICE_CITY_TURNS.filter((turn) => turn.kind === 'long');
  const sharpTurns = CITY_RUSH_VICE_CITY_TURNS.filter((turn) => turn.kind === 'sharp');
  const slowestIn = (turn) => {
    let pace = 1;
    for (let index = 0; index <= 80; index += 1) {
      const distance = turn.start + ((turn.end - turn.start) * index) / 80;
      pace = Math.min(pace, cityRushCornerPace('vice-city', distance));
    }
    return pace;
  };
  for (const turn of CITY_RUSH_VICE_CITY_TURNS) {
    assert.equal(
      cityRushCornerPace('vice-city', turn.start - CITY_RUSH_CORNER_PACE_PREBRAKE_METERS),
      1,
      `${turn.name} conserve sa vitesse avant la zone de freinage`,
    );
    assert.ok(cityRushCornerPace('vice-city', turn.start - 10) < 1, `${turn.name} commence à ralentir avant son entrée`);
    assert.ok(cityRushCornerPace('vice-city', turn.start) < 1, `${turn.name} est déjà ralenti à l'entrée`);
    assert.equal(cityRushCornerPace('vice-city', turn.end), 1, `${turn.name} se réaccélère à la sortie`);
    assert.equal(
      cityRushCornerPace('vice-city', (turn.start + turn.end) / 2),
      cityRushCornerPace('vice-city', (turn.start + turn.end) / 2 + CITY_RUSH_LAP_LENGTH),
      `${turn.name} se répète à chaque tour`,
    );
  }
  for (const turn of longTurns) {
    const pace = slowestIn(turn);
    assert.ok(pace <= CITY_RUSH_CORNER_PACE_SWEEP + 0.02, `${turn.name} ralentit dans le grand virage (${pace.toFixed(3)})`);
    assert.ok(pace > CITY_RUSH_CORNER_PACE_MIN, `${turn.name} reste une courbe rapide, pas une épingle`);
    // 126 km/h → environ 91 km/h : le compteur doit bouger, pas seulement frémir.
    const apexKmh = CITY_RUSH_PLAYER_SPEED * pace * 3.6;
    assert.ok(apexKmh < 100, `${turn.name} tombe à ${apexKmh.toFixed(0)} km/h`);
  }
  for (const turn of sharpTurns) {
    const pace = slowestIn(turn);
    assert.equal(pace, CITY_RUSH_CORNER_PACE_MIN, `${turn.name} freine jusqu'au plancher`);
    assert.ok(pace < slowestIn(longTurns[0]), 'un virage sec se prend plus lentement qu’une longue courbe');
  }

  // Ring : la Döttinger Höhe et le portique filent droit ; un appui tenu lève
  // le pied, et la virole du Karussell freine plus fort que Hatzenbach.
  assert.equal(cityRushCornerPace('nordschleife', 0), 1, 'le portique du Ring est droit');
  const dottinger = (20 / 20.832) * CITY_RUSH_LAP_LENGTH;
  assert.equal(cityRushCornerPace(CITY_RUSH_NORDSCHLEIFE_COURSE, dottinger), 1, 'la Döttinger Höhe reste à fond');
  const atKm = (km) => {
    const centre = (km / 20.832) * CITY_RUSH_LAP_LENGTH;
    let pace = 1;
    for (let distance = centre - 30; distance <= centre + 30; distance += 0.5) {
      pace = Math.min(pace, cityRushCornerPace('nordschleife', distance));
    }
    return pace;
  };
  const hatzenbach = atKm(2.62);
  const kesselchen = atKm(11.8);
  const karussell = atKm(13.5);
  assert.ok(hatzenbach <= 0.8, `Hatzenbach lève le pied (${hatzenbach.toFixed(3)})`);
  assert.ok(kesselchen <= CITY_RUSH_CORNER_PACE_SWEEP, `Kesselchen tient son appui ralenti (${kesselchen.toFixed(3)})`);
  assert.ok(karussell < hatzenbach, 'la virole se prend plus lentement qu’un grand virage rapide');
  assert.ok(karussell <= 0.62, `Karussell freine franchement (${karussell.toFixed(3)})`);
  assert.ok(karussell >= CITY_RUSH_CORNER_PACE_MIN);

  // Le joueur commence effectivement à perdre de la vitesse avant le début
  // d'une épingle, puis arrive déjà ralenti à l'entrée.
  const sharpTurn = sharpTurns[0];
  let approachDistance = sharpTurn.start - CITY_RUSH_CORNER_PACE_PREBRAKE_METERS;
  let approachSpeed = CITY_RUSH_PLAYER_SPEED;
  let firstBrakeDistance = null;
  const frame = 1 / 60;
  while (approachDistance < sharpTurn.start) {
    const pace = cityRushCornerPace('vice-city', approachDistance);
    if (pace < 1 && firstBrakeDistance === null) firstBrakeDistance = approachDistance;
    approachSpeed = approachCityRushSpeed(
      approachSpeed,
      CITY_RUSH_PLAYER_SPEED * pace,
      8,
      frame,
    );
    approachDistance += approachSpeed * frame;
  }
  assert.ok(Number.isFinite(firstBrakeDistance) && firstBrakeDistance < sharpTurn.start, 'la cible baisse avant le repère de début du virage');
  assert.ok(approachSpeed < CITY_RUSH_PLAYER_SPEED - 8, 'la voiture arrive déjà visiblement ralentie');
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
  // Le trafic lent bloque encore le pilote, mais à l'enveloppe de sa
  // carrosserie : sans position latérale connue, les deux voitures sont jugées
  // dans l'axe (3,6 m) et non à la distance de sécurité des berlines (4,8 m).
  // La retenue s'arrête la marge de 5 cm au-delà, pour que la détection de
  // choc facture le contact au lieu de coller le pilote au seuil.
  assert.ok(Math.abs((trafficById.traffic - trafficById.player)
    - (CITY_RUSH_TRAFFIC_CAR_GAP + CITY_RUSH_TRAFFIC_HOLD_MARGIN)) < 1e-9);
  assert.ok(trafficById.traffic - trafficById.player < CITY_RUSH_CAR_GAP,
    'la retenue du trafic est plus courte que celle d’une berline solide');

  // Aile dégagée : le pilote peut venir jusqu'au frôlement, l'enveloppe tombe
  // à 2,9 m. C'est la marge d'esquive : décalé, on passe plus près.
  const passingEncounter = resolveCityRushCarMovement([
    { id: 'traffic', collisionGroup: 'traffic', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.94, previousDistance: 35, nextDistance: 35.2 },
    { id: 'player', collisionGroup: 'racer', lane: 1, x: CITY_RUSH_LANE_X[1] + 2.1, width: 1.9, previousDistance: 25, nextDistance: 33.4 },
  ]);
  const passingById = Object.fromEntries(passingEncounter.map((car) => [car.id, car.nextDistance]));
  assert.ok(Math.abs(passingById.player
    - (35.2 - CITY_RUSH_TRAFFIC_PASS_GAP - CITY_RUSH_TRAFFIC_HOLD_MARGIN)) < 1e-9,
  'aile dégagée : la retenue du trafic tombe au frôlement');

  // Le piège du bouchon : le suiveur est raboté **juste au-delà** de
  // l'enveloppe (la marge de 5 cm), puis il demande à avancer dedans. Sans la
  // mémoire des couples en contact, il resterait collé derrière la voiture
  // lente sans jamais être facturé — ou le serait à chaque image.
  const pinnedGap = CITY_RUSH_TRAFFIC_CAR_GAP + CITY_RUSH_TRAFFIC_HOLD_MARGIN;
  const contacts = new Set();
  const pinned = detectCityRushTrafficImpacts([
    { id: 'player', collisionGroup: 'racer', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.9, previousDistance: 135 - pinnedGap, nextDistance: 135 - pinnedGap + 1.1 },
    { id: 'traffic', collisionGroup: 'traffic', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.94, previousDistance: 135, nextDistance: 135.2 },
  ], CITY_RUSH_TRAFFIC_IMPACT_GAP, contacts);
  assert.equal(pinned.length, 1, 'retenu au seuil, le pilote qui avance touche la voiture');
  assert.equal(pinned[0].racerId, 'player');
  assert.equal(pinned[0].trafficId, 'traffic');
  // Le même couple, le pilote restant collé à la retenue : un seul impact par
  // épisode, pas de suite infinie.
  const pinnedAgain = detectCityRushTrafficImpacts([
    { id: 'player', collisionGroup: 'racer', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.9, previousDistance: 135.2 - pinnedGap, nextDistance: 135.2 - pinnedGap + 1.1 },
    { id: 'traffic', collisionGroup: 'traffic', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.94, previousDistance: 135.2, nextDistance: 135.4 },
  ], CITY_RUSH_TRAFFIC_IMPACT_GAP, contacts);
  assert.deepEqual(pinnedAgain, [], 'un épisode de contact = un impact');
  // Le pilote se dégage : la voie change, le couple se sépare et l'épisode est
  // clos — un nouveau contact comptera de nouveau.
  detectCityRushTrafficImpacts([
    { id: 'player', collisionGroup: 'racer', lane: 4, x: CITY_RUSH_LANE_X[4], width: 1.9, previousDistance: 175, nextDistance: 176 },
    { id: 'traffic', collisionGroup: 'traffic', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.94, previousDistance: 135.4, nextDistance: 135.6 },
  ], CITY_RUSH_TRAFFIC_IMPACT_GAP, contacts);
  assert.equal(contacts.size, 0, 'les couples séparés sortent de la mémoire');
  const recontact = detectCityRushTrafficImpacts([
    { id: 'player', collisionGroup: 'racer', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.9, previousDistance: 140 - pinnedGap, nextDistance: 140 - pinnedGap + 1.1 },
    { id: 'traffic', collisionGroup: 'traffic', lane: 1, x: CITY_RUSH_LANE_X[1], width: 1.94, previousDistance: 140, nextDistance: 140.2 },
  ], CITY_RUSH_TRAFFIC_IMPACT_GAP, contacts);
  assert.equal(recontact.length, 1, 'un nouveau contact après séparation compte');
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

test('pickup encounters contain red machine-gun bonuses, red health crosses, and ground boosts', () => {
  let seed = 112;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  let sawEmptyRow = false;
  let sawTwoPickups = false;
  let totalPickups = 0;
  const pickupCounts = {
    [CITY_RUSH_PICKUPS.BOOST]: 0,
    [CITY_RUSH_PICKUPS.HEALTH]: 0,
    [CITY_RUSH_POWERS.PISTOL]: 0,
    [CITY_RUSH_POWERS.SHOTGUN]: 0,
  };
  for (let index = 0; index < 10000; index += 1) {
    // `chance = 1` : le mélange des types est mesuré hors baisse de densité des
    // turbos — un turbo tiré est alors un turbo posé, comme avant le cercle au sol.
    const encounter = createCityRushEncounter(random, CITY_RUSH_LANE_X.length, 1);
    assert.equal(Object.hasOwn(encounter, 'slowLane'), false);
    assert.ok(encounter.pickups.length <= 2);
    totalPickups += encounter.pickups.length;
    for (const pickup of encounter.pickups) pickupCounts[pickup.type] += 1;
    if (encounter.pickups.length === 0) sawEmptyRow = true;
    const pickupLanes = new Set();
    for (const pickup of encounter.pickups) {
      assert.ok(pickup.lane >= 0 && pickup.lane < CITY_RUSH_LANE_X.length);
      assert.ok([
        CITY_RUSH_PICKUPS.BOOST,
        CITY_RUSH_PICKUPS.HEALTH,
        CITY_RUSH_POWERS.PISTOL,
        CITY_RUSH_POWERS.SHOTGUN,
      ].includes(pickup.type));
      assert.ok(!pickupLanes.has(pickup.lane));
      pickupLanes.add(pickup.lane);
    }
    if (encounter.pickups.length === 2) sawTwoPickups = true;
  }
  const blueRate = pickupCounts[CITY_RUSH_POWERS.SHOTGUN] / totalPickups;
  const redRate = pickupCounts[CITY_RUSH_POWERS.PISTOL] / totalPickups;
  const healthRate = pickupCounts[CITY_RUSH_PICKUPS.HEALTH] / totalPickups;
  const boostRate = pickupCounts[CITY_RUSH_PICKUPS.BOOST] / totalPickups;
  assert.ok(blueRate >= 0.02 && blueRate <= 0.045, `le fusil à pompe bleu apparaît environ 3 % du temps (${(blueRate * 100).toFixed(1)} %)`);
  assert.ok(redRate >= 0.06 && redRate <= 0.10, `le chargeur rouge apparaît environ 8 % du temps (${(redRate * 100).toFixed(1)} %)`);
  assert.ok(blueRate < redRate, 'le pompe reste plus rare que l’AK-47 sur la route');
  assert.ok(healthRate >= 0.04 && healthRate <= 0.08, `le plus de soin apparaît environ 6 % du temps (${(healthRate * 100).toFixed(1)} %)`);
  assert.ok(boostRate >= 0.79 && boostRate <= 0.90, `les cercles turbo restent majoritaires (${(boostRate * 100).toFixed(1)} %)`);
  assert.equal(pickupCounts['blue-shot'], undefined);
  assert.equal(pickupCounts.radio, undefined);
  assert.equal(sawEmptyRow, true);
  assert.equal(sawTwoPickups, true);
  assert.ok(totalPickups > 12000 && totalPickups < 12800, 'les rangées plus souvent doubles augmentent le nombre de bonus au sol');
});

test('boost circles are seeded more sparsely on races, without touching the other pickups', () => {
  assert.equal(CITY_RUSH_BOOST_SPAWN_CHANCE, 0.75, 'un quart des turbos tirés ne sont pas posés du tout');
  // Le tirage est pur et borné : en dessous de la chance le cercle reste, au-dessus
  // il saute, et un tirage invalide pose moins plutôt que trop.
  assert.equal(keepsCityRushBoostPickup(() => 0.74), true);
  assert.equal(keepsCityRushBoostPickup(() => 0.75), false);
  assert.equal(keepsCityRushBoostPickup(() => 0.99, 1), true, 'à chance pleine, rien n’est tiré au hasard');
  assert.equal(keepsCityRushBoostPickup(() => Number.NaN), false);
  assert.equal(keepsCityRushBoostPickup(() => 0.5, -1), false);
  assert.equal(keepsCityRushBoostPickup(() => 0.5, 4), true);
  const countPickups = (chance) => {
    let seed = 2024;
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const counts = { [CITY_RUSH_PICKUPS.BOOST]: 0, [CITY_RUSH_PICKUPS.HEALTH]: 0, [CITY_RUSH_POWERS.PISTOL]: 0 };
    for (let index = 0; index < 10000; index += 1) {
      for (const pickup of createCityRushEncounter(random, CITY_RUSH_LANE_X.length, chance).pickups) counts[pickup.type] += 1;
    }
    return counts;
  };
  const dense = countPickups(1);
  const race = countPickups(CITY_RUSH_BOOST_SPAWN_CHANCE);
  assert.ok(race[CITY_RUSH_PICKUPS.BOOST] < dense[CITY_RUSH_PICKUPS.BOOST] * 0.85
    && race[CITY_RUSH_PICKUPS.BOOST] > dense[CITY_RUSH_PICKUPS.BOOST] * 0.6,
  `le turbo perd le quart de ses emplacements (${dense[CITY_RUSH_PICKUPS.BOOST]} → ${race[CITY_RUSH_PICKUPS.BOOST]})`);
  // Les rouges et les soins ne passent pas par ce filtre : leur nombre ne bouge
  // pas d'un poil, à l'échantillonnage près.
  for (const type of [CITY_RUSH_PICKUPS.HEALTH, CITY_RUSH_POWERS.PISTOL]) {
    assert.ok(Math.abs(race[type] - dense[type]) <= dense[type] * 0.1,
      `le bonus ${type} garde sa cadence (${dense[type]} → ${race[type]})`);
  }
});

test('Sprint encounters place a single ground boost on a forward-facing lane', () => {
  assert.equal(CITY_RUSH_SPRINT_BOOST_ROW_INTERVAL, 8, 'le Sprint espace les rangées de turbo pour éviter un boost permanent');
  for (const sample of [0, 0.12, 0.34, 0.68, 0.99]) {
    const encounter = createCityRushBoostEncounter(() => sample);
    assert.equal(encounter.pickups.length, 1);
    assert.equal(encounter.pickups[0].type, CITY_RUSH_PICKUPS.BOOST);
    assert.ok(CITY_RUSH_FORWARD_LANES.includes(encounter.pickups[0].lane), 'un cercle au sol ne doit pas se trouver sur la voie inverse');
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
  // Les petits zigzags du relevé ont été retirés de la table : la densité
  // d'appui du tour ne bouge pas — seuls les zébrus ont disparu.
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

  // 6. La table ne garde que les grands virages : chaque appui du tracé dure au
  //    moins 150 m réels (les micro-zébrus de 8 à 26 m de piste — la ligne de
  //    départ, Quiddelbacher Höhe, Kottenborn, la Spiegelkurve, Breidscheid et
  //    l'ouverture de la Döttinger Höhe — ont été retirés du tracé), et la
  //    cassure nette ne survient que deux fois par tour — l'épingle d'Adenauer
  //    Forst et la virole du Karussell, les deux cassures assumées.
  for (const [km, angle, spanKm, shape = 'smooth'] of CITY_RUSH_NORDSCHLEIFE_TURNS) {
    assert.ok(spanKm >= 0.15, `virage à ${km} km : étendue ${spanKm} km, trop court pour la fluidité`);
    assert.ok(Math.abs(angle) >= 16, `virage à ${km} km : ${angle}°, un petit zigzag s'est invité`);
    if (shape === 'snap') {
      assert.ok([7.2, 13.5].some((snapKm) => Math.abs(km - snapKm) < 0.01), `cassure « snap » inattendue à ${km} km`);
    }
  }
  // Sur le profil rendu, hors ces deux cassures, le rayon du ruban ne descend
  // jamais sous la largeur de la piste (9,20 m) : plus aucun pli qui casse le
  // défilement — les grands virages qui restent tiennent au moins trois
  // largeurs. Le rayon est mesuré comme au moteur :
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

  // 7. Plus un seul petit zigzag : sur le cap rendu (celui que le pilote voit
  //    tourner), chaque inversion de braquage est soit un balancement entre
  //    deux grands virages nommés (au moins 10°), soit une oscillation
  //    invisible (sous le degré, simple plat du profil). Aucun zébru de 1 à 8°
  //    ne subsiste — c'était exactement la signature des virages retirés.
  const headingSamples = 4000;
  const headingStep = lap / headingSamples;
  const headingDegree = [];
  for (let index = 0; index <= headingSamples; index += 1) {
    headingDegree.push((profile.yaw(index * headingStep) * 180) / Math.PI);
  }
  const smoothed = headingDegree.map((_, index) => {
    let total = 0;
    for (let offset = -2; offset <= 2; offset += 1) {
      total += headingDegree[(index + offset + headingDegree.length) % headingDegree.length];
    }
    return total / 5;
  });
  const reversals = [];
  for (let index = 1; index < headingSamples; index += 1) {
    const before = smoothed[index] - smoothed[index - 1];
    const after = smoothed[index + 1] - smoothed[index];
    if (before * after <= 0 && Math.abs(before) > 1e-5) reversals.push(index);
  }
  const swings = [];
  for (let index = 1; index < reversals.length; index += 1) {
    const from = reversals[index - 1];
    const to = reversals[index];
    swings.push({
      amplitude: Math.abs(smoothed[to] - smoothed[from]),
      kmFrom: (from / headingSamples) * 20.832,
      kmTo: (to / headingSamples) * 20.832,
    });
  }
  const zigzags = swings.filter((swing) => swing.amplitude >= 1 && swing.amplitude < 8);
  assert.equal(
    zigzags.length,
    0,
    `petits zigzags restants : ${zigzags.map((swing) => `${swing.amplitude.toFixed(1)}° de ${swing.kmFrom.toFixed(2)} à ${swing.kmTo.toFixed(2)} km`).join(', ')}`,
  );
  // Et les deux longues lignes droites du tour en sont vraiment : plus un
  // virage entre le portique et Hatzenbach (km 0 → 1,95), plus un virage de la
  // Döttinger Höhe à l'arrivée (km 19,4 → 20,832).
  for (const [km, angle] of CITY_RUSH_NORDSCHLEIFE_TURNS) {
    assert.ok(km >= 1.95, `un virage de ${angle}° traîne encore sur la ligne de départ (${km} km)`);
  }
  for (const [km, angle] of CITY_RUSH_NORDSCHLEIFE_TURNS) {
    assert.ok(km <= 19.4, `un virage de ${angle}° traîne encore sur la Döttinger Höhe (${km} km)`);
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


test('les SUV blindés ont dix carrés et coûtent deux carrés au contact', () => {
  assert.equal(CITY_RUSH_POLICE_SUV_HEALTH, 10);
  assert.equal(cityRushPoliceMaxHealth('police-suv'), 10);
  for (const type of ['police', 'taxi', undefined, null]) {
    assert.equal(cityRushPoliceMaxHealth(type), 6, 'les berlines gardent leur résistance');
  }
  for (const [source, hits, damage] of [['pistol', 10, 1], ['blue-shot', 5, 2], ['collision', 10, 1]]) {
    let health = cityRushPoliceMaxHealth('police-suv');
    assert.equal(cityRushPoliceShotsLeft(health, source), hits);
    for (let hit = 1; hit <= hits; hit += 1) {
      health = cityRushPoliceDamage(health, source);
      assert.equal(health, 10 - hit * damage);
    }
    assert.equal(cityRushPoliceDamage(health, source), 0);
  }
  assert.equal(cityRushPlayerDamage(15, 'suv-collision'), 13);
  assert.equal(cityRushPlayerDamage(2, 'suv-collision'), 0);
  assert.equal(cityRushPlayerDamage(1, 'suv-collision'), 0, 'pas de vie négative au dernier carré');
  assert.equal(cityRushPlayerDamage(0, 'suv-collision'), 0);
  assert.equal(cityRushPlayerDamage(15, 'collision'), 14, 'les autres collisions ne changent pas');
});

test('le fusil à pompe partage l’emplacement d’arme de l’AK-47 : ramasser l’un vide l’autre', () => {
  assert.deepEqual([...CITY_RUSH_WEAPON_TYPES], ['pistol', 'shotgun']);
  const empty = createCityRushInventory();
  assert.equal(cityRushActiveWeapon(empty), null, 'le bouton de tir reste vide sans rien ramasser');
  assert.equal(isCityRushPowerCharged(empty, CITY_RUSH_POWERS.PISTOL), false);
  assert.equal(isCityRushPowerCharged(empty, CITY_RUSH_POWERS.SHOTGUN), false);

  const ak = cityRushEquipWeapon(empty, CITY_RUSH_POWERS.PISTOL);
  assert.deepEqual(cityRushActiveWeapon(ak), { type: 'pistol', ammo: 7, max: 7 });
  assert.equal(ak[CITY_RUSH_POWERS.SHOTGUN], 0);

  // Le bonus bleu remplace l'AK-47, même chargé à bloc : les balles sont perdues.
  const pump = cityRushEquipWeapon(ak, CITY_RUSH_POWERS.SHOTGUN);
  assert.equal(pump[CITY_RUSH_POWERS.PISTOL], 0, 'l’AK-47 est vidé par le fusil à pompe');
  assert.equal(pump[CITY_RUSH_POWERS.SHOTGUN], CITY_RUSH_SHOTGUN_AMMO_PER_PICKUP);
  assert.deepEqual(cityRushActiveWeapon(pump), { type: 'shotgun', ammo: 3, max: 3 });

  // Et l'inverse : un chargeur rouge repris fait disparaître le pompe.
  const back = cityRushEquipWeapon(pump, CITY_RUSH_POWERS.PISTOL);
  assert.equal(back[CITY_RUSH_POWERS.SHOTGUN], 0);
  assert.deepEqual(cityRushActiveWeapon(back), { type: 'pistol', ammo: 7, max: 7 });

  // Reprendre la même arme complète son chargeur, sans jamais le dépasser.
  const halfPump = { ...pump, [CITY_RUSH_POWERS.SHOTGUN]: 1 };
  assert.equal(cityRushEquipWeapon(halfPump, CITY_RUSH_POWERS.SHOTGUN)[CITY_RUSH_POWERS.SHOTGUN], 3);
  assert.equal(cityRushEquipWeapon(pump, CITY_RUSH_POWERS.SHOTGUN, 99)[CITY_RUSH_POWERS.SHOTGUN], 3,
    'le chargeur de pompe ne dépasse jamais trois cartouches');
  // Un type inconnu ne touche à rien.
  assert.deepEqual(cityRushEquipWeapon(pump, 'radio', 4), pump);
});

test('une cartouche de pompe arrache six carrés de vie à la voiture touchée', () => {
  assert.equal(cityRushWeaponDamage(CITY_RUSH_POWERS.SHOTGUN), 6);
  assert.equal(cityRushWeaponDamage(CITY_RUSH_POWERS.PISTOL), 1);
  // Une berline de police (six carrés) tombe d'une seule cartouche.
  assert.equal(cityRushPoliceShotsLeft(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.SHOTGUN), 1);
  assert.equal(cityRushPoliceDamage(CITY_RUSH_POLICE_HEALTH, CITY_RUSH_POWERS.SHOTGUN), 0);
  // Un SUV blindé (dix carrés) en demande deux.
  assert.equal(cityRushPoliceShotsLeft(10, CITY_RUSH_POWERS.SHOTGUN), 2);
  assert.equal(cityRushPoliceDamage(10, CITY_RUSH_POWERS.SHOTGUN), 4);
  assert.equal(cityRushPoliceDamage(4, CITY_RUSH_POWERS.SHOTGUN), 0);
  // Un pilote paie le même prix : six carrés d'un coup.
  assert.equal(cityRushPlayerDamage(15, CITY_RUSH_POWERS.SHOTGUN), 9);
  assert.equal(cityRushPlayerDamage(4, CITY_RUSH_POWERS.SHOTGUN), 0, 'jamais de vie négative');
  // Barème et cadence : le pompe se réarme bien plus lentement que l'AK-47.
  assert.equal(CITY_RUSH_SHOTGUN_FIRE_COOLDOWN, 1.5);
  assert.equal(cityRushWeaponFireInterval(CITY_RUSH_POWERS.SHOTGUN), CITY_RUSH_SHOTGUN_FIRE_COOLDOWN);
  assert.ok(cityRushWeaponFireInterval(CITY_RUSH_POWERS.PISTOL) < CITY_RUSH_SHOTGUN_FIRE_COOLDOWN);
  assert.equal(cityRushWeaponMaxAmmo(CITY_RUSH_POWERS.SHOTGUN), 3);
  assert.equal(cityRushWeaponMaxAmmo(CITY_RUSH_POWERS.PISTOL), 7);
});

test('les cartouches de pompe se consomment une par une, et le bonus bleu se ramasse par-dessus un AK-47 plein', () => {
  let inventory = cityRushEquipWeapon(createCityRushInventory(), CITY_RUSH_POWERS.SHOTGUN);
  for (const left of [3, 2, 1]) {
    assert.equal(inventory[CITY_RUSH_POWERS.SHOTGUN], left);
    assert.equal(isCityRushPowerCharged(inventory, CITY_RUSH_POWERS.SHOTGUN), true);
    const shot = consumeCityRushCharge(inventory, CITY_RUSH_POWERS.SHOTGUN);
    assert.equal(shot.consumed, true, `la cartouche n°${left} part`);
    assert.equal(shot.inventory[CITY_RUSH_POWERS.SHOTGUN], left - 1);
    inventory = shot.inventory;
  }
  assert.equal(isCityRushPowerCharged(inventory, CITY_RUSH_POWERS.SHOTGUN), false, 'le pompe est vide');
  assert.equal(consumeCityRushCharge(inventory, CITY_RUSH_POWERS.SHOTGUN).consumed, false, 'un pompe vide ne tire plus');
  assert.equal(cityRushActiveWeapon(inventory), null, 'le bouton redevient vide');

  const fullAk = cityRushEquipWeapon(createCityRushInventory(), CITY_RUSH_POWERS.PISTOL);
  assert.equal(canCollectCityRushPickup(fullAk, CITY_RUSH_POWERS.SHOTGUN), true,
    'le bonus bleu remplace l’AK-47, même plein');
  assert.equal(canCollectCityRushPickup(fullAk, CITY_RUSH_POWERS.PISTOL), false,
    'un chargeur rouge déjà plein n’est pas gaspillé');

  const fullPump = cityRushEquipWeapon(createCityRushInventory(), CITY_RUSH_POWERS.SHOTGUN);
  assert.equal(canCollectCityRushPickup(fullPump, CITY_RUSH_POWERS.SHOTGUN), false,
    'un pompe plein ne reprend pas de cartouches');
  assert.equal(canCollectCityRushPickup(fullPump, CITY_RUSH_POWERS.PISTOL), true,
    'l’AK-47 remplace le pompe, même plein');
  assert.equal(canCollectCityRushPickup({ shotgun: 1 }, CITY_RUSH_POWERS.SHOTGUN), true,
    'un pompe entamé se complète');

  // Le masquage suit l'arme : un peloton entièrement rechargé en pompe cache
  // le bonus bleu, mais un concurrent qui n'a que l'AK-47 le laisse au sol.
  assert.equal(shouldHideCityRushWeaponPickup(fullPump, CITY_RUSH_POWERS.SHOTGUN, [fullPump]), true);
  assert.equal(shouldHideCityRushWeaponPickup(fullPump, CITY_RUSH_POWERS.SHOTGUN, [fullAk]), false);
  assert.equal(shouldHideCityRushWeaponPickup(fullAk, CITY_RUSH_POWERS.SHOTGUN, [fullAk]), false);
  assert.equal(shouldHideCityRushPistolPickup(fullAk, [fullAk]), true, 'le raccourci rouge est conservé');
});

test('la cible d’une mission garde une voie plus longtemps, sauf en cas de danger urgent', () => {
  assert.equal(cityRushAiThinkDelay(0), CITY_RUSH_AI_LANE_COOLDOWN_MIN);
  assert.equal(cityRushAiThinkDelay(1), CITY_RUSH_AI_LANE_COOLDOWN_MAX);
  assert.equal(cityRushAiThinkDelay(0, { missionTarget: true }), CITY_RUSH_MISSION_TARGET_AI_LANE_COOLDOWN_MIN);
  assert.equal(cityRushAiThinkDelay(1, { missionTarget: true }), CITY_RUSH_MISSION_TARGET_AI_LANE_COOLDOWN_MAX);
  assert.ok(
    cityRushAiThinkDelay(0, { urgent: true, missionTarget: true }) < CITY_RUSH_MISSION_TARGET_AI_LANE_COOLDOWN_MIN,
    'la cible conserve son réflexe de freinage lorsqu’un obstacle bouche la voie',
  );
});

test('chaque rival freine à la distance d’arrêt de son propre modèle', () => {
  const citadine = CITY_RUSH_CARS.find((car) => car.id === 'city-hatch');
  const supercar = CITY_RUSH_CARS.find((car) => car.id === 'pulse-rs');
  // Le taux de freinage d'un rival est celui de sa fiche : une citadine freine
  // au plancher du barème, une supercar bien plus fort — c'est ce qui lui
  // permet de viser un bonus plus près d'un camion sans payer le carambolage.
  assert.equal(cityRushAiBrakingRate(citadine.accelerationRate), CITY_RUSH_BRAKE_RATE_FLOOR);
  assert.ok(cityRushAiBrakingRate(supercar.accelerationRate) > CITY_RUSH_BRAKE_RATE_FLOOR);
  assert.equal(cityRushAiBrakingRate(citadine.accelerationRate), cityRushBrakingRate(citadine.accelerationRate));
  // La distance d'arrêt suit le carré de la vitesse et la marge de sécurité.
  assert.ok(Math.abs(cityRushAiBrakingDistance(30) - (30 * 30) / (2 * CITY_RUSH_BRAKE_RATE_FLOOR) * CITY_RUSH_AI_BRAKING_MARGIN) < 1e-9);
  assert.ok(cityRushAiBrakingDistance(60) > cityRushAiBrakingDistance(30) * 3.9, 'freiner de 60 m/s coûte bien plus que le double de 30');
  assert.equal(
    cityRushAiBrakingDistance(30, { brakingRate: cityRushAiBrakingRate(citadine.accelerationRate) }),
    cityRushAiBrakingDistance(30),
    'la citadine freine à la distance du barème',
  );
  assert.ok(
    cityRushAiBrakingDistance(30, { brakingRate: cityRushAiBrakingRate(supercar.accelerationRate) })
      < cityRushAiBrakingDistance(30) * 0.6,
    'la supercar freine sensiblement plus court',
  );

  // Même camion, même vitesse : la voie est bouchée pour la citadine, ouverte
  // pour la supercar. Le camion roule à 5 m/s à 30 m devant.
  const truck = [{ lane: 1, distance: 30, speed: 5 }];
  const blockedFor = (car) => cityRushAiLaneBlocked({
    lane: 1, distance: 0, speed: 30, traffic: truck,
    brakingRate: cityRushAiBrakingRate(car.accelerationRate),
  });
  assert.equal(blockedFor(citadine), true, 'la citadine ne peut pas s’arrêter avant le camion');
  assert.equal(blockedFor(supercar), false, 'la supercar s’arrête avant le camion');

  // Et le choix de voie suit : un bonus turbo dans une voie bouchée vaut le coup
  // pour la supercar, pas pour la citadine (on ne vise pas un mur pour un bonus).
  const padInTruckLane = [{ lane: 1, distance: 40, type: CITY_RUSH_PICKUPS.BOOST }];
  const laneFor = (car) => chooseCityRushAiLane({
    currentLane: 1, distance: 0, speed: 30, availableLanes: [0, 1, 2], traffic: truck,
    pickups: padInTruckLane,
    brakingRate: cityRushAiBrakingRate(car.accelerationRate),
  });
  assert.equal(laneFor(citadine), 0, 'la citadine se décale au lieu de plonger sur le camion');
  assert.equal(laneFor(supercar), 1, 'la supercar prend le bonus, elle freine assez court');
});

test('la consigne des rivaux garde au moins la pointe du joueur, même si le scénario les ralentit', () => {
  const playerTopSpeed = 50;
  const slowerRivalSpeed = 35;
  const regularPace = cityRushRivalPaceFactor();

  assert.equal(cityRushRivalTargetSpeed(playerTopSpeed, slowerRivalSpeed, {
    pace: regularPace,
    storyPace: 0.94,
  }), playerTopSpeed * regularPace, 'un modèle plus lent ou un handicap ne rend pas le joueur imbattable');
  assert.ok(Math.abs(cityRushRivalTargetSpeed(playerTopSpeed, slowerRivalSpeed, {
    pace: regularPace,
    storyPace: 1.1,
  }) - playerTopSpeed * regularPace * 1.1) < 1e-9,
  'un bonus de scénario continue de renforcer un boss, même dans une voiture moins puissante');
  assert.ok(Math.abs(cityRushRivalTargetSpeed(playerTopSpeed, 60, {
    pace: regularPace,
    storyPace: 1.1,
  }) - 69.3) < 1e-9, 'un modèle plus rapide et un bonus de scénario gardent leur avance');

  for (const playerCar of CITY_RUSH_CARS) {
    const playerSpeed = CITY_RUSH_PLAYER_SPEED * playerCar.powerMultiplier;
    for (const rivalCar of CITY_RUSH_CARS) {
      const rivalSpeed = CITY_RUSH_PLAYER_SPEED * rivalCar.powerMultiplier;
      assert.ok(
        cityRushRivalTargetSpeed(playerSpeed, rivalSpeed) >= playerSpeed * CITY_RUSH_RIVAL_PACE - 1e-9,
        `${rivalCar.id} ne laisse pas ${playerCar.id} s'échapper par la seule pointe moteur`,
      );
    }
  }
});

test('le rythme de course des rivaux est un vrai cran au-dessus, dernier tour compris', () => {
  assert.equal(CITY_RUSH_RIVAL_PACE, 1.05);
  assert.equal(CITY_RUSH_RIVAL_FINAL_LAP_PUSH, 1.02);
  assert.equal(cityRushRivalPaceFactor(), CITY_RUSH_RIVAL_PACE);
  assert.ok(cityRushRivalPaceFactor({ finalLap: true }) > cityRushRivalPaceFactor(),
    'le dernier tour des rivaux pousse encore le rythme');
  assert.ok(Math.abs(cityRushRivalPaceFactor({ finalLap: true }) - CITY_RUSH_RIVAL_PACE * CITY_RUSH_RIVAL_FINAL_LAP_PUSH) < 1e-9);
  // Un cran franc mais pas absurde : sous les 3 % de rythme en plus, la course
  // se joue à la première faute ; au-delà de 8 %, la voiture du joueur ne peut
  // plus suivre même en ligne propre.
  assert.ok(CITY_RUSH_RIVAL_PACE > 1.02 && CITY_RUSH_RIVAL_PACE < 1.08);
});

test('une voiture qui atterrit ne se pose pas dans une berline', () => {
  const berline = { id: 'police-1', collisionGroup: 'police', lane: 1, x: 0, width: 1.94 };
  const landing = {
    id: 'player', collisionGroup: 'racer', lane: 1, x: 0, width: 1.9,
    previousDistance: 98, nextDistance: 98.5, landing: true,
  };
  const follow = { ...landing, landing: false };
  const jump = { ...landing, landing: false, jumping: true };
  const resolved = (car) => resolveCityRushCarMovement([
    { ...berline, previousDistance: 100, nextDistance: 100 },
    car,
  ]).find((item) => item.id === 'player').nextDistance;
  // Sans l'atterrissage, le plancher `previousDistance` fige le pilote dans la
  // berline qu'il vient de survoler (l'écart reste sous les 4,8 m).
  assert.equal(resolved(follow), 98);
  // À l'atterrissage, la voiture est retenue à la distance de sécurité : elle
  // recule de la correction plutôt que de rester dans la carrosserie.
  assert.equal(resolved(landing), 100 - CITY_RUSH_CAR_GAP);
  // En vol, le saut reste un saut : la voiture passe au-dessus sans être
  // rabotée (c'est ce qui permet de franchir un bouchon par un tremplin).
  assert.equal(resolved(jump), 98.5);

  // Le recul ne descend jamais sous zéro, même près de la ligne de départ.
  const nearStart = resolveCityRushCarMovement([
    { id: 'police-1', collisionGroup: 'police', lane: 1, x: 0, width: 1.94, previousDistance: 2, nextDistance: 2 },
    { id: 'player', collisionGroup: 'racer', lane: 1, x: 0, width: 1.9, previousDistance: 1, nextDistance: 1.4, landing: true },
  ]).find((item) => item.id === 'player').nextDistance;
  assert.equal(nearStart, 0);
});

test('la herse des quatre étoiles couvre trois voies du sens de course', () => {
  assert.equal(CITY_RUSH_SPIKE_BLOCK_STARS, 4);
  assert.equal(CITY_RUSH_SPIKE_LANES, 3);
  assert.equal(CITY_RUSH_SPIKE_BLOCK_COUNT, CITY_RUSH_SPIKE_BLOCK_VEHICLE_TYPES.length);
  assert.ok(CITY_RUSH_SPIKE_BLOCK_VEHICLE_TYPES.includes('police'), 'une berline de police monte le barrage');
  assert.ok(CITY_RUSH_SPIKE_BLOCK_LEAD >= 250,
    'la herse se dresse loin devant, le temps de la voir venir et de choisir sa voie');
  assert.equal(CITY_RUSH_SPIKE_DAMAGE, 1);
  assert.equal(CITY_RUSH_SPIKE_DAMAGE_SOURCE, 'spike');
  assert.ok(CITY_RUSH_SPIKE_SLOW_FACTOR < 0.5, 'les pneus crevés coûtent plus de la moitié de la vitesse');
  assert.ok(CITY_RUSH_SPIKE_SLOW_DURATION >= 1, 'la remise en vitesse est longue');

  // Aucune voiture avant la quatrième étoile, jamais en Sprint.
  assert.equal(cityRushSpikeBlockCount(0), 0);
  assert.equal(cityRushSpikeBlockCount(2), 0);
  assert.equal(cityRushSpikeBlockCount(CITY_RUSH_SPIKE_BLOCK_STARS - 1), 0);
  assert.equal(cityRushSpikeBlockCount(CITY_RUSH_SPIKE_BLOCK_STARS), CITY_RUSH_SPIKE_BLOCK_COUNT);
  assert.equal(cityRushSpikeBlockCount(CITY_RUSH_WANTED_MAX_STARS), CITY_RUSH_SPIKE_BLOCK_COUNT);
  assert.equal(cityRushSpikeBlockCount(CITY_RUSH_WANTED_MAX_STARS + 3), CITY_RUSH_SPIKE_BLOCK_COUNT);
  assert.equal(cityRushSpikeBlockCount(CITY_RUSH_WANTED_MAX_STARS, { sprint: true }), 0);

  // Voies couvertes : les voies du sens de course, de la plus à gauche à la
  // plus à droite ; un parcours à deux voies les couvre toutes les deux.
  const forward = cityRushLaneConfig(CITY_RUSH_CITIES[0]).forwardLanes;
  assert.deepEqual([...cityRushSpikeLanes(forward)], forward.slice(0, CITY_RUSH_SPIKE_LANES));
  assert.deepEqual([...cityRushSpikeLanes([3, 4], 3)], [3, 4]);
  assert.deepEqual([...cityRushSpikeLanes()], CITY_RUSH_FORWARD_LANES.slice(0, CITY_RUSH_SPIKE_LANES));
});

test('la herse se déroule voie par voie et ne perce que les voies couvertes', () => {
  // Pose : une voie toutes les `duration / lanes` secondes, les trois à la fin.
  assert.equal(cityRushSpikeLaidLanes(0, { lanes: 3, duration: CITY_RUSH_SPIKE_LAY_DURATION }), 0);
  assert.equal(cityRushSpikeLaidLanes(CITY_RUSH_SPIKE_LAY_DURATION / 3 - 0.01, { lanes: 3, duration: CITY_RUSH_SPIKE_LAY_DURATION }), 0);
  assert.equal(cityRushSpikeLaidLanes(CITY_RUSH_SPIKE_LAY_DURATION / 3, { lanes: 3, duration: CITY_RUSH_SPIKE_LAY_DURATION }), 1);
  assert.equal(cityRushSpikeLaidLanes(CITY_RUSH_SPIKE_LAY_DURATION - 0.01, { lanes: 3, duration: CITY_RUSH_SPIKE_LAY_DURATION }), 2);
  assert.equal(cityRushSpikeLaidLanes(CITY_RUSH_SPIKE_LAY_DURATION, { lanes: 3, duration: CITY_RUSH_SPIKE_LAY_DURATION }), 3);
  assert.equal(cityRushSpikeLaidLanes(99, { lanes: 3, duration: CITY_RUSH_SPIKE_LAY_DURATION }), 3);
  assert.equal(cityRushSpikeLayProgress(0), 0);
  assert.equal(cityRushSpikeLayProgress(CITY_RUSH_SPIKE_LAY_DURATION / 2), 0.5);
  assert.equal(cityRushSpikeLayProgress(CITY_RUSH_SPIKE_LAY_DURATION * 3), 1);

  const lanes = [3, 4, 5];
  // Franchissement balayé : la ligne tombe entre les deux positions de l'image.
  assert.equal(cityRushSpikeHit({ previousDistance: 100, nextDistance: 105, spikeDistance: 103, lane: 3, lanes, laidLanes: 3 }), true);
  // Une voiture trop rapide pour être vue *sur* la ligne est quand même pincée
  // (35 m/s, une image à 30 i/s : 1,17 m entre deux positions).
  assert.equal(cityRushSpikeHit({ previousDistance: 101.9, nextDistance: 103.1, spikeDistance: 103, lane: 4, lanes, laidLanes: 3 }), true);
  // Voie pas encore posée : le pilote passe.
  assert.equal(cityRushSpikeHit({ previousDistance: 100, nextDistance: 105, spikeDistance: 103, lane: 5, lanes, laidLanes: 1 }), false);
  // Contresens : la herse ne couvre que le sens de la course.
  assert.equal(cityRushSpikeHit({ previousDistance: 100, nextDistance: 105, spikeDistance: 103, lane: 2, lanes, laidLanes: 3 }), false);
  // La ligne déjà franchie ne compte pas deux fois.
  assert.equal(cityRushSpikeHit({ previousDistance: 105, nextDistance: 110, spikeDistance: 103, lane: 3, lanes, laidLanes: 3 }), false);
  // Loin de la ligne : rien.
  assert.equal(cityRushSpikeHit({ previousDistance: 60, nextDistance: 65, spikeDistance: 103, lane: 3, lanes, laidLanes: 3 }), false);
  assert.equal(cityRushSpikeHit({ previousDistance: NaN, nextDistance: 5, spikeDistance: 3, lane: 3, lanes, laidLanes: 3 }), false);

  // Crevaison : la vitesse visée tombe au facteur de la règle.
  assert.equal(cityRushSpikePace(35), 35 * CITY_RUSH_SPIKE_SLOW_FACTOR);
  assert.ok(cityRushSpikePace(35) < 35 * 0.5);
  assert.equal(cityRushSpikePace(0), 0);
  assert.equal(cityRushSpikePace(35, 1), 35, 'un facteur neutre ne change rien');
});

test('les SUV de charge arrivent de face à cinq étoiles, plus vite que le pilote', () => {
  assert.equal(CITY_RUSH_SUV_CHARGE_TYPE, 'police-suv');
  assert.equal(CITY_RUSH_SUV_CHARGE_COUNT, 2);
  assert.equal(cityRushSuvChargeCount(0), 0);
  assert.equal(cityRushSuvChargeCount(CITY_RUSH_WANTED_MAX_STARS - 1), 0);
  assert.equal(cityRushSuvChargeCount(CITY_RUSH_WANTED_MAX_STARS), CITY_RUSH_SUV_CHARGE_COUNT);
  assert.equal(cityRushSuvChargeCount(CITY_RUSH_WANTED_MAX_STARS, { sprint: true }), 0);
  assert.equal(cityRushSuvChargeCount(CITY_RUSH_WANTED_MAX_STARS, { hasOncoming: false }), 0,
    'un parcours en sens unique n’a pas de face-à-face');

  // La charge ferme la distance : plus rapide que la pointe du pilote, avec un
  // plancher pour les parcours lents.
  const top = CITY_RUSH_PLAYER_SPEED;
  assert.equal(cityRushSuvChargeSpeed(top), top * CITY_RUSH_SUV_CHARGE_SPEED_FACTOR);
  assert.ok(cityRushSuvChargeSpeed(top) > top);
  assert.equal(cityRushSuvChargeSpeed(4), CITY_RUSH_SUV_CHARGE_MIN_SPEED);
  assert.ok(cityRushSuvChargeSpeed(0) >= CITY_RUSH_SUV_CHARGE_MIN_SPEED);

  // Verrouillage de la voie visée : à portée, et seulement devant.
  assert.equal(cityRushSuvChargeLocked({ gap: CITY_RUSH_SUV_CHARGE_LOCK_RANGE }), true);
  assert.equal(cityRushSuvChargeLocked({ gap: 120 }), true);
  assert.equal(cityRushSuvChargeLocked({ gap: CITY_RUSH_SUV_CHARGE_LOCK_RANGE + 1 }), false);
  assert.equal(cityRushSuvChargeLocked({ gap: -12 }), false, 'un SUV repassé derrière ne vise plus');
  assert.equal(cityRushSuvChargeLocked({ gap: 0 }), false);
  assert.equal(cityRushSuvChargeLocked({}), false);

  // Rabattement latéral à vitesse limitée : un changement de voie au dernier
  // moment fait rater la charge.
  const target = 6.3;
  assert.equal(cityRushSuvChargeStep(0, target, 0.5), CITY_RUSH_SUV_CHARGE_LATERAL_RATE * 0.5);
  assert.equal(cityRushSuvChargeStep(0, target, 0.5), 1.7);
  assert.equal(cityRushSuvChargeStep(target - 0.1, target, 0.5), target, 'le dernier pas ne dépasse pas la voie visée');
  assert.equal(cityRushSuvChargeStep(target, target, 0.5), target);
  assert.equal(cityRushSuvChargeStep(0, target, 0), 0);

  // La charge est annoncée avant d'arriver, et repasse au loin une fois manquée.
  assert.ok(CITY_RUSH_SUV_CHARGE_SPAWN_LEAD > CITY_RUSH_SUV_CHARGE_ALERT_RANGE);
  assert.ok(CITY_RUSH_SUV_CHARGE_ALERT_RANGE > CITY_RUSH_SUV_CHARGE_LOCK_RANGE);
  assert.ok(CITY_RUSH_SUV_CHARGE_LOCK_RANGE > CITY_RUSH_SUV_CHARGE_RECYCLE_BEHIND);
  assert.ok(CITY_RUSH_SUV_CHARGE_RELOAD > 0 && CITY_RUSH_SUV_CHARGE_RELOAD < 10);
});

test('une berline met une seconde à suivre un écart de voie : la fenêtre pour la surprendre', () => {
  // Le délai de réaction latérale est la fenêtre du pilote : il doit être
  // nettement plus long que le réflexe de poursuite, qui ne fait que raccourcir
  // le minuteur de décision une fois le délai écoulé.
  assert.equal(CITY_RUSH_POLICE_LANE_REACTION_DELAY, 1);
  assert.ok(
    CITY_RUSH_POLICE_LANE_REACTION_DELAY > CITY_RUSH_POLICE_PURSUIT_REFLEX * 4,
    'le délai de réaction doit ouvrir une vraie fenêtre, pas un simple tick',
  );

  const DT = 1 / 30;
  // Boucle d'images telle que le monde 3D la joue : `watchedLane` est la voie
  // de la cible à l'image précédente, remise à jour après chaque calcul.
  let state = { watchedLane: 2, leaderLane: 2, reactionLeft: 0, reactionLane: 2 };
  const step = (leaderLane) => {
    const frame = cityRushPoliceLaneReaction({ ...state, leaderLane, dt: DT });
    state = {
      watchedLane: leaderLane,
      leaderLane,
      reactionLeft: frame.reactionLeft,
      reactionLane: frame.reactionLane,
    };
    return frame;
  };

  // Cible immobile : la berline voit sa vraie voie, rien n'est gelé.
  let frame = step(2);
  assert.equal(frame.frozen, false);
  assert.equal(frame.huntingLane, 2);

  // L'écart : elle garde la voie qu'elle surveillait et roule droit.
  frame = step(4);
  assert.equal(frame.frozen, true);
  assert.equal(frame.huntingLane, 2, 'la berline chasse encore la voie qu’elle surveillait');

  // …pendant une seconde entière, avant de voir la vraie voie.
  let elapsed = 0;
  while (frame.frozen && elapsed < 3) {
    frame = step(4);
    elapsed += DT;
  }
  assert.ok(elapsed >= 0.9 && elapsed <= 1.05, `le gel dure ${elapsed.toFixed(2)} s, pas une seconde`);
  assert.equal(frame.huntingLane, 4, 'au bout du délai, la berline voit la vraie voie');
  assert.equal(frame.frozen, false);

  // Un second écart pendant le gel met la voie surveillée à jour — la dernière
  // que le pilote occupait — mais ne relance pas le minuteur : un balayage
  // continu des voies ne gèle pas la poursuite indéfiniment.
  state = { watchedLane: 2, leaderLane: 2, reactionLeft: 0, reactionLane: 2 };
  step(3);
  for (let i = 0; i < 15; i += 1) step(3); // une demi-seconde du délai écoulée
  frame = step(1);
  assert.equal(frame.frozen, true);
  assert.equal(frame.huntingLane, 3, 'elle garde la voie que le pilote vient de quitter');
  let afterSecondChange = 0;
  while (frame.frozen && afterSecondChange < 3) {
    frame = step(1);
    afterSecondChange += DT;
  }
  assert.ok(
    afterSecondChange <= 0.6,
    `un nouvel écart ne relance pas le minuteur (reste ${afterSecondChange.toFixed(2)} s)`,
  );
  assert.equal(frame.huntingLane, 1);

  // Aucun délai réglé : la berline suit l'écart sur-le-champ (ancien réglage).
  const instant = cityRushPoliceLaneReaction({
    watchedLane: 2, leaderLane: 3, reactionLeft: 0, reactionLane: 2, dt: DT, delay: 0,
  });
  assert.equal(instant.frozen, false);
  assert.equal(instant.huntingLane, 3);
  assert.equal(instant.reactionLeft, 0);

  // Une voie surveillée hors piste reste bornée au parcours.
  const clamped = cityRushPoliceLaneReaction({
    watchedLane: 99, leaderLane: 0, reactionLeft: 0, reactionLane: 99, dt: DT, laneCount: 6,
  });
  assert.equal(clamped.huntingLane, 5);
});

test('pendant son délai de réaction, la berline ne se rabat pas sur la nouvelle voie du pilote', () => {
  // Effet mesurable du délai : la berline élue pour la ligne de tir garde sa
  // voie tant qu'elle chasse la voie périmée, et ne se rabat d'une voie qu'une
  // fois le délai écoulé. C'est ce qui laisse passer le pilote.
  const choose = (huntedLane, currentLane) => chooseCityRushPoliceLane({
    currentLane,
    laneCount: 6,
    distance: 0,
    speed: 20,
    availableLanes: [currentLane - 1, currentLane, currentLane + 1].filter((lane) => lane >= 0 && lane < 6),
    pickups: [],
    traffic: [],
    racers: [],
    targetLane: huntedLane,
    // Élue pour la ligne de tir, huit mètres derrière sa cible : le cas où le
    // rabattement vers la voie du pilote est le plus direct.
    fireLane: huntedLane,
    fireGap: -8,
    fireRange: CITY_RUSH_POLICE_FIRE_LINE_RANGE,
  });

  assert.equal(choose(3, 3), 3, 'gelée sur la voie 3, elle y reste');
  assert.equal(choose(1, 3), 2, 'délai écoulé : elle se rabat d’une voie vers le pilote');
});
