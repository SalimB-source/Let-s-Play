// Règles pures de Vice City Rush : séparées du rendu Three.js pour garder
// les durées, les voies et la génération de rue faciles à vérifier.
//
// La course se joue en circuit : trois tours d'une boucle de 600 m. Le décor
// est généré une fois pour la boucle et se répète, si bien que l'on repasse
// sous le portique de départ (tribunes, feux, ligne à damier) à chaque tour.
export const CITY_RUSH_LAPS = 3;
export const CITY_RUSH_LAP_LENGTH = 600;
export const CITY_RUSH_DISTANCE = CITY_RUSH_LAPS * CITY_RUSH_LAP_LENGTH;
// La ligne peinte est dessinée quelques mètres devant le centre de la voiture
// pour que les capots s'alignent sur le damier au départ.
export const CITY_RUSH_START_LINE_LEAD = 3;
// Portée de décor conservée derrière le joueur quand on replie la boucle.
export const CITY_RUSH_TRACK_BEHIND = 60;
export const CITY_RUSH_PLAYER_SPEED = 26;
export const CITY_RUSH_LANE_X = Object.freeze([-3.15, -1.05, 1.05, 3.15]);
export const CITY_RUSH_SCROLL_SCALE = 0.72;
export const CITY_RUSH_CAR_GAP = 4.8;

// Les voitures ont des silhouettes et des compromis de conduite réellement
// différents. Les barres sont aussi reliées aux multiplicateurs ci-dessous.
export const CITY_RUSH_CARS = Object.freeze([
  Object.freeze({
    id: 'vice-roadster', name: 'SUNSET ROADSTER', className: 'CABRIOLET ÉQUILIBRÉ',
    bodyColor: 0xf66b9e, trimColor: 0x42ead6, driverColor: 0xf3c9a8, accent: '#ff5db8',
    power: 82, powerMultiplier: 1, acceleration: 83, accelerationRate: 9.1, recovery: 82, hitRecoveryMultiplier: 0.96,
    widthScale: 1, heightScale: 1, lengthScale: 1,
  }),
  Object.freeze({
    id: 'turbo-gt', name: 'TURBO GT', className: 'GRAND TOURISME · BASSE ET LONGUE',
    bodyColor: 0x49d7d0, trimColor: 0xefffff, driverColor: 0xffb38c, accent: '#43ead5',
    power: 94, powerMultiplier: 1.04, acceleration: 72, accelerationRate: 8.6, recovery: 74, hitRecoveryMultiplier: 1.06,
    widthScale: 1.02, heightScale: 0.95, lengthScale: 1.08,
  }),
  Object.freeze({
    id: 'muscle-86', name: 'MUSCLE 86', className: 'MUSCLE CAR · LARGE ET PUISSANTE',
    bodyColor: 0xffc653, trimColor: 0xffffff, driverColor: 0x9fcbff, accent: '#ffc653',
    power: 88, powerMultiplier: 1.02, acceleration: 95, accelerationRate: 9.8, recovery: 70, hitRecoveryMultiplier: 1.08,
    widthScale: 1.07, heightScale: 1.03, lengthScale: 1.08,
  }),
  Object.freeze({
    id: 'night-comet', name: 'NIGHT COMET', className: 'COMPACTE · REPRISE RAPIDE',
    bodyColor: 0x9b7bff, trimColor: 0x62e7dc, driverColor: 0xf3c9a8, accent: '#a78bff',
    power: 78, powerMultiplier: 0.98, acceleration: 87, accelerationRate: 9.5, recovery: 94, hitRecoveryMultiplier: 0.88,
    widthScale: 0.94, heightScale: 0.95, lengthScale: 0.94,
  }),
]);

// Le trafic d'obstacle roule nettement moins vite que les voitures de course.
export const CITY_RUSH_TRAFFIC_COUNT = 12;
export const CITY_RUSH_TRAFFIC_LANES = Object.freeze([3, 0, 2, 1, 3, 1, 0, 2, 1, 3, 2, 0]);
export const CITY_RUSH_TRAFFIC_TYPES = Object.freeze([
  Object.freeze({ id: 'police', name: 'Voiture de police', speed: 6.4, width: 1.94, length: 3.8 }),
  Object.freeze({ id: 'ambulance', name: 'Ambulance', speed: 5.3, width: 1.98, length: 4.0 }),
  Object.freeze({ id: 'garbage-truck', name: 'Camion-poubelle', speed: 4.4, width: 2.12, length: 4.6 }),
  Object.freeze({ id: 'white-lambo', name: 'Lamborghini blanche', speed: 7.2, width: 1.92, length: 3.8 }),
]);

export function approachCityRushSpeed(currentSpeed, targetSpeed, accelerationRate, deltaTime) {
  const current = Math.max(0, Number(currentSpeed) || 0);
  const target = Math.max(0, Number(targetSpeed) || 0);
  const elapsed = Math.max(0, Number(deltaTime) || 0);
  const acceleration = Math.max(0, Number(accelerationRate) || 0);
  if (target <= 0) return 0;
  if (target >= current) return Math.min(target, current + acceleration * elapsed);
  const braking = Math.max(18, acceleration * 1.8);
  return Math.max(target, current - braking * elapsed);
}

export function cityRushHitDuration(baseDuration, carProfile) {
  const duration = Math.max(0, Number(baseDuration) || 0);
  const multiplier = Number(carProfile?.hitRecoveryMultiplier);
  return duration * (Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1);
}

export const CITY_RUSH_POWERS = Object.freeze({
  OIL: 'oil',
  PISTOL: 'pistol',
  CASH: 'cash',
  RADIO: 'radio',
});

// Collecte de la monnaie de chaque couleur pour remplir sa jauge dédiée.
// Seuils de chargement abaissés pour que les pouvoirs tombent plus souvent en
// course : bleu 2, rouge 3, vert 2, jaune 4.
export const CITY_RUSH_POWER_CHARGE_COST = Object.freeze({
  [CITY_RUSH_POWERS.OIL]: 2, // bleu · clé à molette
  [CITY_RUSH_POWERS.PISTOL]: 3, // rouge · pistolet
  [CITY_RUSH_POWERS.CASH]: 2, // vert · billets
  [CITY_RUSH_POWERS.RADIO]: 4, // jaune · talkie-walkie
});

export const CITY_RUSH_POWER_RULES = Object.freeze({
  [CITY_RUSH_POWERS.OIL]: Object.freeze({
    id: CITY_RUSH_POWERS.OIL,
    name: 'Clé à molette',
    shortName: 'Huile',
    chargeCost: CITY_RUSH_POWER_CHARGE_COST[CITY_RUSH_POWERS.OIL],
    color: '#48b9ff',
    key: 'A',
    automatic: true,
    description: 'Dépose automatiquement une flaque d’huile derrière toi dès que la jauge est pleine. Les voitures qui la traversent ralentissent.',
    duration: 1.4,
  }),
  [CITY_RUSH_POWERS.PISTOL]: Object.freeze({
    id: CITY_RUSH_POWERS.PISTOL,
    name: 'Mitrailleuse',
    shortName: 'Mitrailleuse',
    chargeCost: CITY_RUSH_POWER_CHARGE_COST[CITY_RUSH_POWERS.PISTOL],
    color: '#ff526e',
    key: 'Z',
    automatic: false,
    description: 'Tire une courte rafale sur le rival qui est devant toi ; il dérape (2 s de base).',
    duration: 2,
  }),
  [CITY_RUSH_POWERS.CASH]: Object.freeze({
    id: CITY_RUSH_POWERS.CASH,
    name: 'Billets verts',
    shortName: 'Boost',
    chargeCost: CITY_RUSH_POWER_CHARGE_COST[CITY_RUSH_POWERS.CASH],
    color: '#50e48a',
    key: 'E',
    automatic: true,
    description: 'Déclenche automatiquement un boost de vitesse pendant 1,5 seconde dès que la jauge est pleine.',
    duration: 1.5,
  }),
  [CITY_RUSH_POWERS.RADIO]: Object.freeze({
    id: CITY_RUSH_POWERS.RADIO,
    name: 'Talkie-walkie',
    shortName: 'Hélico',
    chargeCost: CITY_RUSH_POWER_CHARGE_COST[CITY_RUSH_POWERS.RADIO],
    color: '#ffd44f',
    key: 'R',
    automatic: false,
    description: 'L’hélicoptère immobilise le rival le mieux placé (jamais son pilote) et les adversaires proches ; la reprise de chaque cible règle la durée (2 s de base).',
    duration: 2,
  }),
});

// ── Éclatement des bonus ────────────────────────────────────────────────────
// Un bonus ramassé ne disparaît plus d'un coup : il éclate en éclats de sa
// couleur (flash, anneau qui s'ouvre, débris projetés puis repris par la
// gravité) et le bonus suivant réapparaît 0,2 s plus tard en gonflant depuis
// son socle. Tous les calculs sont purs, donc testables hors de three.js.
export const CITY_RUSH_PICKUP_RESPAWN_DELAY = 0.2; // s : pop-in d'un bonus qui réapparaît
export const CITY_RUSH_PICKUP_BURST_DURATION = 0.44; // s : l'éclatement reste à l'écran
export const CITY_RUSH_PICKUP_BURST_SHARDS = 12; // éclats projetés par bonus
export const CITY_RUSH_PICKUP_BURST_GRAVITY = 11; // m/s² : les éclats retombent
export const CITY_RUSH_PICKUP_BURST_LIFT = 0.42; // m de saut vers le haut
export const CITY_RUSH_PICKUP_BURST_SPEED = 4.4; // m/s d'éjection

const clamp01 = (value) => Math.max(0, Math.min(1, value));

// Répartition quasi uniforme sur une sphère (angle d'or) : l'éclatement part
// dans toutes les directions tout en restant lisible depuis la caméra.
export function cityRushPickupBurstShards(count = CITY_RUSH_PICKUP_BURST_SHARDS, random = Math.random) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const twist = random() * Math.PI * 2;
  const shards = [];
  for (let index = 0; index < count; index += 1) {
    const y = 1 - ((index + 0.5) / Math.max(1, count)) * 1.5;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = twist + index * golden;
    shards.push({
      dir: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
      speed: 0.7 + random() * 0.6,
      size: 0.6 + random() * 0.6,
      spin: [(random() - 0.5) * 24, (random() - 0.5) * 24, (random() - 0.5) * 24],
    });
  }
  return shards;
}

export function cityRushPickupShardState(shard, age) {
  const life = clamp01(age / CITY_RUSH_PICKUP_BURST_DURATION);
  const ease = 1 - (1 - life) ** 2;
  const reach = CITY_RUSH_PICKUP_BURST_SPEED * CITY_RUSH_PICKUP_BURST_DURATION * shard.speed * ease;
  const fall = 0.5 * CITY_RUSH_PICKUP_BURST_GRAVITY * (life * CITY_RUSH_PICKUP_BURST_DURATION) ** 2;
  return {
    life,
    done: life >= 1,
    position: [
      shard.dir[0] * reach,
      shard.dir[1] * reach + CITY_RUSH_PICKUP_BURST_LIFT * ease - fall,
      shard.dir[2] * reach,
    ],
    rotation: [shard.spin[0] * age, shard.spin[1] * age, shard.spin[2] * age],
    scale: shard.size * (1 - life * life * 0.92),
    opacity: 1 - life * life,
  };
}

// Le flash et l'anneau qui s'ouvre : le cœur blanc du ramassage, lisible même
// à 26 m/s. `core` ne dure que le premier tiers de l'animation.
export function cityRushPickupFlashState(age) {
  const life = clamp01(age / CITY_RUSH_PICKUP_BURST_DURATION);
  const ease = 1 - (1 - life) ** 3;
  return {
    life,
    done: life >= 1,
    scale: 0.5 + ease * 2.1,
    opacity: (1 - life) ** 1.5 * 0.9,
    core: Math.max(0, 1 - life * 2.6),
  };
}

// Le bonus qui réapparaît gonfle avec un léger rebond (easeOutBack) pendant
// CITY_RUSH_PICKUP_RESPAWN_DELAY : 0 → ~1,1 → 1.
export function cityRushPickupPopScale(progress) {
  const t = clamp01(progress);
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const overshoot = 1.70158;
  const p = t - 1;
  return 1 + (overshoot + 1) * p ** 3 + overshoot * p ** 2;
}

// Chaque ville reçoit une palette propre au décor Three.js et à ses cartes UI.
export const CITY_RUSH_CITIES = Object.freeze([
  Object.freeze({
    // Vice City se joue en plein jour : ciel bleu de Floride, sable chaud,
    // mer turquoise et façades Art déco pastel de front de mer.
    id: 'vice-city', name: 'VICE CITY', label: 'MIAMI · FLORIDE', district: 'OCEAN DRIVE',
    tagline: 'Plein soleil sur Ocean Drive.', accent: '#ff5db8', secondary: '#43ead5',
    background: 0x7ec8f0, fog: 0xcfe9f2, asphalt: 0x767b86, sidewalk: 0xf0dcb2,
    buildingColors: Object.freeze([0xffd3e2, 0xfff0c9, 0xbfeee6, 0xcfe4ff, 0xffd9b0]),
    windowColor: 0x8fd0e8, skyTop: 0x2b7fd4, skyGlow: 0xfff2c4, style: 'vice',
    signs: Object.freeze(['OCEAN DR', 'BEACH CLUB', 'VICE HOTEL', 'SUNSET SURF']),
  }),
  Object.freeze({
    id: 'new-york', name: 'NEW YORK', label: 'NEW YORK · USA', district: 'MIDTOWN',
    tagline: 'Les avenues ne dorment jamais.', accent: '#ffc45c', secondary: '#4fd6e8',
    background: 0x121d35, fog: 0x34465f, asphalt: 0x151b27, sidewalk: 0x333b49,
    buildingColors: Object.freeze([0x49617b, 0x71869a, 0x354e6a, 0x9a7968, 0x52687e]),
    windowColor: 0xffd67d, skyTop: 0x17264a, skyGlow: 0xffba65, style: 'new-york',
    signs: Object.freeze(['BROADWAY', 'DOWNTOWN', '42ND ST', 'NIGHT SHIFT']),
  }),
  Object.freeze({
    id: 'tokyo', name: 'TOKYO', label: 'TOKYO · JAPON', district: 'SHIBUYA',
    tagline: 'Un éclair rose dans le rétro.', accent: '#ff5b9a', secondary: '#42e6ff',
    background: 0x10152c, fog: 0x292744, asphalt: 0x121626, sidewalk: 0x30253d,
    buildingColors: Object.freeze([0x343955, 0x4c456a, 0x263b56, 0x51405d, 0x343349]),
    windowColor: 0x80edff, skyTop: 0x0c1330, skyGlow: 0xf54eae, style: 'tokyo',
    signs: Object.freeze(['SHIBUYA', 'TOKYO', 'NIGHT RUN', 'ネオン街']),
  }),
  Object.freeze({
    id: 'paris', name: 'PARIS', label: 'PARIS · FRANCE', district: 'RIVE GAUCHE',
    tagline: 'Un dernier tour avant l’aube.', accent: '#ffb7a4', secondary: '#72d9d0',
    background: 0x292238, fog: 0x655469, asphalt: 0x24212b, sidewalk: 0x665553,
    buildingColors: Object.freeze([0xd7bca5, 0xe9d2ba, 0xc9a88e, 0xe1c2a8, 0xb99683]),
    windowColor: 0xffddaa, skyTop: 0x332a4c, skyGlow: 0xf29b9a, style: 'paris',
    signs: Object.freeze(['RIVE GAUCHE', 'PARIS', 'RUE DE NUIT', 'CAFÉ 1986']),
  }),
  Object.freeze({
    id: 'london', name: 'LONDRES', label: 'LONDRES · ROYAUME-UNI', district: 'SOHO',
    tagline: 'La brume cache un raccourci.', accent: '#e8bd64', secondary: '#70cbd1',
    background: 0x151e31, fog: 0x39495a, asphalt: 0x171c27, sidewalk: 0x3c4149,
    buildingColors: Object.freeze([0x845f54, 0x987265, 0x6f5650, 0xa78470, 0x795b56]),
    windowColor: 0xffd98d, skyTop: 0x17253c, skyGlow: 0xffbd77, style: 'london',
    signs: Object.freeze(['SOHO', 'LONDON', 'NIGHTLINE', 'PICCADILLY']),
  }),
]);

export function clampCityRushLane(lane, laneCount = CITY_RUSH_LANE_X.length) {
  const parsed = Number.isFinite(Number(lane)) ? Math.trunc(Number(lane)) : 0;
  return Math.max(0, Math.min(laneCount - 1, parsed));
}

// Tour en cours (1 à CITY_RUSH_LAPS) pour une distance parcourue. La ligne
// d'arrivée est franchie au début du « tour » LAPS + 1, que l'on plafonne.
export function cityRushLapForDistance(distance, lapLength = CITY_RUSH_LAP_LENGTH, laps = CITY_RUSH_LAPS) {
  const safeDistance = Math.max(0, Number(distance) || 0);
  const safeLap = Math.max(1, Number(lapLength) || CITY_RUSH_LAP_LENGTH);
  return Math.max(1, Math.min(laps, Math.floor(safeDistance / safeLap) + 1));
}

// Progression (0 → 1) à l'intérieur du tour courant ; vaut 1 une fois la
// course bouclée pour que la jauge reste pleine sur l'écran d'arrivée.
export function cityRushLapProgress(distance, lapLength = CITY_RUSH_LAP_LENGTH, laps = CITY_RUSH_LAPS) {
  const safeDistance = Math.max(0, Number(distance) || 0);
  const safeLap = Math.max(1, Number(lapLength) || CITY_RUSH_LAP_LENGTH);
  if (safeDistance >= safeLap * laps) return 1;
  return Math.max(0, Math.min(1, (safeDistance % safeLap) / safeLap));
}

// Numéros des lignes (1 … laps) franchies entre deux distances successives.
// Franchir la ligne k < laps lance le tour k + 1 ; la ligne `laps` est l'arrivée.
export function cityRushLapCrossings(previousDistance, nextDistance, lapLength = CITY_RUSH_LAP_LENGTH, laps = CITY_RUSH_LAPS) {
  const before = Math.max(0, Number(previousDistance) || 0);
  const after = Math.max(0, Number(nextDistance) || 0);
  const safeLap = Math.max(1, Number(lapLength) || CITY_RUSH_LAP_LENGTH);
  if (after <= before) return [];
  const crossings = [];
  for (let line = Math.floor(before / safeLap) + 1; line <= laps && line * safeLap <= after; line += 1) {
    crossings.push(line);
  }
  return crossings;
}

// Écart (en mètres, signé) entre un élément fixe du circuit et le joueur,
// replié sur la boucle : un élément passé reste `behind` mètres derrière
// avant d'être redessiné loin devant, au tour suivant.
export function cityRushTrackGap(trackPosition, distance, lapLength = CITY_RUSH_LAP_LENGTH, behind = CITY_RUSH_TRACK_BEHIND) {
  const safeLap = Math.max(1, Number(lapLength) || CITY_RUSH_LAP_LENGTH);
  const raw = (Number(trackPosition) || 0) - (Number(distance) || 0);
  let gap = ((raw % safeLap) + safeLap) % safeLap;
  if (gap > safeLap - behind) gap -= safeLap;
  return gap;
}

// `inventory` contient les points de jauge (0 jusqu'au coût), pas un stock
// d'objets prêts. Chaque pouvoir garde sa progression indépendamment.
export function createCityRushInventory() {
  return Object.fromEntries(Object.keys(CITY_RUSH_POWER_RULES).map((key) => [CITY_RUSH_POWER_RULES[key].id, 0]));
}

export function addCityRushCharge(inventory, type, amount = 1) {
  if (!CITY_RUSH_POWER_RULES[type]) return { ...createCityRushInventory(), ...inventory };
  const cost = CITY_RUSH_POWER_CHARGE_COST[type];
  const current = Math.min(cost, Math.max(0, Math.trunc(Number(inventory?.[type]) || 0)));
  const added = Math.max(0, Math.trunc(Number(amount) || 0));
  return { ...createCityRushInventory(), ...inventory, [type]: Math.min(cost, current + added) };
}

export function consumeCityRushCharge(inventory, type) {
  const normalized = { ...createCityRushInventory(), ...inventory };
  if (!CITY_RUSH_POWER_RULES[type] || normalized[type] < CITY_RUSH_POWER_CHARGE_COST[type]) {
    return { inventory: normalized, consumed: false };
  }
  normalized[type] = 0;
  return { inventory: normalized, consumed: true };
}

export function rankCityRushRacers(racers, playerId = 'player') {
  const ordered = [...racers].sort((a, b) => (Number(b.distance) || 0) - (Number(a.distance) || 0));
  return {
    ordered,
    rank: Math.max(1, ordered.findIndex((racer) => racer.id === playerId) + 1),
    leader: ordered[0] || null,
  };
}

// Le talkie vise toujours un rival : même si le joueur mène, l’hélico cible
// le rival le mieux placé et ne peut jamais retourner le missile contre lui.
export function cityRushHelicopterTarget(racers = [], playerId = 'player') {
  return [...racers]
    .filter((racer) => racer?.id !== playerId)
    .sort((a, b) => (Number(b.distance) || 0) - (Number(a.distance) || 0))[0] || null;
}

// Le trafic conserve une distance de sécurité; les voitures de course ne
// se bloquent plus entre elles lorsqu'elles sont marquées `collisionGroup`.
export function resolveCityRushCarMovement(cars = [], minimumGap = CITY_RUSH_CAR_GAP) {
  const resolved = cars.map((car) => {
    const previousDistance = Number.isFinite(Number(car.previousDistance)) ? Number(car.previousDistance) : 0;
    const requestedDistance = Number.isFinite(Number(car.nextDistance)) ? Number(car.nextDistance) : previousDistance;
    return { ...car, previousDistance, nextDistance: Math.max(previousDistance, requestedDistance) };
  });
  const ordered = [...resolved].sort((a, b) => b.previousDistance - a.previousDistance);
  const safeGap = Math.max(0, Number(minimumGap) || 0);
  for (let index = 0; index < ordered.length; index += 1) {
    const following = ordered[index];
    for (let frontIndex = 0; frontIndex < index; frontIndex += 1) {
      const front = ordered[frontIndex];
      if (front.collisionGroup === 'racer' && following.collisionGroup === 'racer') continue;
      const sameLane = front.lane === following.lane;
      const frontWidth = Number.isFinite(Number(front.width)) ? Number(front.width) : 1.9;
      const followingWidth = Number.isFinite(Number(following.width)) ? Number(following.width) : 1.9;
      const lateralOverlap = Number.isFinite(Number(front.x))
        && Number.isFinite(Number(following.x))
        && Math.abs(Number(front.x) - Number(following.x)) < (frontWidth + followingWidth) / 2;
      if (!sameLane && !lateralOverlap) continue;
      following.nextDistance = Math.min(
        following.nextDistance,
        Math.max(following.previousDistance, front.nextDistance - safeGap),
      );
    }
  }
  return resolved;
}

/**
 * Génère une rangée de monnaies et sa zone de ralentissement au sol.
 * Les véhicules lents du trafic sont gérés séparément par le monde 3D.
 */
export function createCityRushEncounter(random = Math.random) {
  const laneCount = CITY_RUSH_LANE_X.length;
  const allLanes = Array.from({ length: laneCount }, (_, lane) => lane);
  const slowLane = random() < 0.24 ? Math.floor(random() * laneCount) : null;
  const available = allLanes.filter((lane) => lane !== slowLane);
  // Les monnaies sont fréquentes et les rangées vides sont rares; les duos
  // restent limités pour garder les voies lisibles.
  const pickupCount = random() < 0.1 ? 0 : Math.min(available.length, random() < 0.85 ? 1 : 2);
  const pickups = [];

  for (let index = 0; index < pickupCount; index += 1) {
    const slot = Math.floor(random() * available.length);
    const [lane] = available.splice(slot, 1);
    const roll = random();
    const type = roll < 0.31 ? 'cash'
      : roll < 0.55 ? 'oil'
        : roll < 0.78 ? 'pistol'
          : 'radio';
    pickups.push({ lane, type });
  }

  return { pickups, slowLane };
}

export function cityRushLaneAfterAction(lane, action, laneCount = CITY_RUSH_LANE_X.length) {
  if (action === 'left') return clampCityRushLane(lane - 1, laneCount);
  if (action === 'right') return clampCityRushLane(lane + 1, laneCount);
  return clampCityRushLane(lane, laneCount);
}

// Choisit une prochaine voie en équilibrant les monnaies à portée et les
// menaces lentes, parmi les changements de voie effectivement disponibles.
export function chooseCityRushAiLane({
  currentLane = 0,
  laneCount = CITY_RUSH_LANE_X.length,
  distance = 0,
  speed = 24,
  availableLanes,
  pickups = [],
  slowZones = [],
  traffic = [],
  lookAheadDistance = 145,
} = {}) {
  const lane = clampCityRushLane(currentLane, laneCount);
  const allowed = new Set((availableLanes || Array.from({ length: laneCount }, (_, index) => index))
    .map((nextLane) => clampCityRushLane(nextLane, laneCount)));
  allowed.add(lane);
  const candidates = [lane, lane - 1, lane + 1]
    .filter((nextLane) => nextLane >= 0 && nextLane < laneCount && allowed.has(nextLane));
  const lookAhead = Math.max(1, Number(lookAheadDistance) || 145);
  const racerSpeed = Math.max(0, Number(speed) || 0);
  let bestLane = lane;
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    let safetyScore = -Math.abs(candidate - lane) * 1.25;
    let pickupPriority = 0;
    for (const pickup of pickups) {
      const gap = Number(pickup.distance) - Number(distance);
      if (!Number.isFinite(gap) || gap < -3 || gap > lookAhead) continue;
      const pickupLane = clampCityRushLane(pickup.lane, laneCount);
      const laneAffinity = Math.max(0, 1 - Math.abs(pickupLane - candidate) * 0.34);
      if (laneAffinity === 0) continue;
      const urgency = 1 - gap / lookAhead;
      // Ramasser passe avant le confort de conduite : à voie disponible, le
      // rival vise le bonus même si une zone ou un autre pilote le gêne. La
      // disponibilité des voies garde toutefois la sécurité du trafic lent.
      // Même avec une jauge pleine, le rival continue de viser les bonus au
      // lieu de les ignorer dès que son pouvoir est chargé.
      pickupPriority += (22 + urgency * 8) * laneAffinity;
    }
    for (const zone of slowZones) {
      const gap = Number(zone.distance) - Number(distance);
      if (zone.lane !== candidate || !Number.isFinite(gap) || gap < -3 || gap > lookAhead) continue;
      safetyScore -= 5 + (1 - gap / lookAhead) * 11;
    }
    for (const vehicle of traffic) {
      const gap = Number(vehicle.distance) - Number(distance);
      if (vehicle.lane !== candidate || !Number.isFinite(gap) || gap < -3 || gap > lookAhead) continue;
      const closingSpeed = Math.max(1, racerSpeed - Math.max(0, Number(vehicle.speed) || 0));
      const timeToReach = gap / closingSpeed;
      safetyScore -= timeToReach < 1.5 ? 24 : timeToReach < 3 ? 17 : timeToReach < 5.5 ? 10 : 4.5;
    }
    // Sépare explicitement les objectifs des risques : aucune pénalité de
    // circulation ne doit rendre un bonus moins intéressant qu'une voie vide.
    const score = pickupPriority * 100 + safetyScore;
    if (score > bestScore) {
      bestScore = score;
      bestLane = candidate;
    }
  }
  return bestLane;
}
