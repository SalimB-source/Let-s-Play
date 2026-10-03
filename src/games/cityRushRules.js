// Règles pures de Vice City Rush : séparées du rendu Three.js pour garder
// les durées, les voies et la génération de rue faciles à vérifier.
//
// La course se joue en circuit : cinq tours d'une boucle de 600 m. Le décor
// est généré une fois pour la boucle et se répète, si bien que l'on repasse
// sous le portique de départ (tribunes, feux, ligne à damier) à chaque tour.
export const CITY_RUSH_LAPS = 5;
export const CITY_RUSH_LAP_LENGTH = 600;
export const CITY_RUSH_DISTANCE = CITY_RUSH_LAPS * CITY_RUSH_LAP_LENGTH;
// La ligne peinte est dessinée quelques mètres devant le centre de la voiture
// pour que les capots s'alignent sur le damier au départ.
export const CITY_RUSH_START_LINE_LEAD = 3;
// Portée de décor conservée derrière le joueur quand on replie la boucle.
export const CITY_RUSH_TRACK_BEHIND = 60;
export const CITY_RUSH_PLAYER_SPEED = 29;
export const CITY_RUSH_LANE_X = Object.freeze([-3.15, -1.05, 1.05, 3.15]);
export const CITY_RUSH_SCROLL_SCALE = 0.72;
export const CITY_RUSH_CAR_GAP = 4.8;
export const CITY_RUSH_RACER_VIEW_DISTANCE = 120; // m : portée avant où un rival est rendu à l'écran
export const CITY_RUSH_BLUE_SHOT_DURATION = 0.3; // s : dérapage léger du tir bleu
export const CITY_RUSH_BLUE_SHOT_SPEED_FACTOR = 0.85; // le tir ralentit légèrement la voiture
export const CITY_RUSH_BLUE_SHOT_MAX_RANGE = CITY_RUSH_RACER_VIEW_DISTANCE;
export const CITY_RUSH_BLUE_SHOT_PROJECTILE_SPEED = 300; // m/s : projectile droit, sans guidage
export const CITY_RUSH_BLUE_SHOT_MIN_GAP = 2; // m : le canon doit avoir la place de tirer devant le capot

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
  Object.freeze({
    id: 'vega-gt-67', name: 'VEGA GT ’67', className: 'MUSCLE CAR NOIRE · ÉDITION NICO',
    bodyColor: 0x11131a, trimColor: 0xc83a4b, driverColor: 0xc98c68, accent: '#e04455',
    power: 92, powerMultiplier: 1.03, acceleration: 86, accelerationRate: 9.4, recovery: 76, hitRecoveryMultiplier: 1.0,
    widthScale: 1.08, heightScale: 1.02, lengthScale: 1.1,
  }),
]);

// Le trafic d'obstacle roule nettement moins vite que les voitures de course.
// La route est à double sens : le trafic lent roule dans le sens de la course
// sur les deux voies de droite ; les deux voies de gauche sont réservées au
// trafic venant en face (voir CITY_RUSH_ONCOMING_*).
export const CITY_RUSH_TRAFFIC_COUNT = 12;
export const CITY_RUSH_TRAFFIC_LANES = Object.freeze([3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2]);

// Trafic venant en face : les véhicules des deux voies de gauche roulent vers
// le joueur, croisent la course, puis reparaissent au loin une fois passés.
export const CITY_RUSH_ONCOMING_COUNT = 6;
export const CITY_RUSH_ONCOMING_LANES = Object.freeze([0, 1]);
export const CITY_RUSH_TRAFFIC_TYPES = Object.freeze([
  Object.freeze({ id: 'police', name: 'Voiture de police', speed: 6.4, width: 1.94, length: 3.8 }),
  Object.freeze({ id: 'ambulance', name: 'Ambulance', speed: 5.3, width: 1.98, length: 4.0 }),
  Object.freeze({ id: 'garbage-truck', name: 'Camion-poubelle', speed: 4.4, width: 2.12, length: 4.6 }),
  Object.freeze({ id: 'white-lambo', name: 'Lamborghini blanche', speed: 7.2, width: 1.92, length: 3.8 }),
]);

// Un choc avec le trafic ne retire pas de vie : il crée un court moment de
// contact lisible, puis le véhicule lent se rabat pour libérer la voie. La
// durée est volontairement indépendante du modèle de cabriolet choisi : le
// joueur humain et les IA encaissent exactement la même durée (0,6 s).
export const CITY_RUSH_TRAFFIC_IMPACT_DURATION = 0.6;
export const CITY_RUSH_TRAFFIC_IMPACT_COOLDOWN = 1.2;
export const CITY_RUSH_TRAFFIC_IMPACT_GAP = CITY_RUSH_CAR_GAP;
export const CITY_RUSH_TRAFFIC_LANE_CHANGE_DURATION = 0.5;

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

// Après avoir été coincée derrière un véhicule du trafic, une voiture reprend
// sa vitesse bien plus vite : l'accélération est multipliée pendant quelques
// instants dès que la voie se dégage.
export const CITY_RUSH_TRAFFIC_RECOVERY_DURATION = 1.6; // s
export const CITY_RUSH_TRAFFIC_RECOVERY_BOOST = 2.6; // × l'accélération du modèle

export function cityRushTrafficRecoveryRate(accelerationRate, recoveryLeft) {
  const rate = Math.max(0, Number(accelerationRate) || 0);
  return Number(recoveryLeft) > 0 ? rate * CITY_RUSH_TRAFFIC_RECOVERY_BOOST : rate;
}

export function cityRushHitDuration(baseDuration, carProfile) {
  const duration = Math.max(0, Number(baseDuration) || 0);
  const multiplier = Number(carProfile?.hitRecoveryMultiplier);
  return duration * (Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1);
}

// ── Toupie de la frappe héliportée (pouvoir jaune) ──────────────────────────
// Pendant l'immobilisation, la voiture touchée tourne sur elle-même et ne peut
// plus changer de voie. `cityRushStunSpin` renvoie le lacet (radians) à
// appliquer à la carrosserie : départ brutal après l'impact, puis l'élan
// retombe en douceur sur un nombre entier de tours — la voiture se fige donc
// face à la route, sans à-coup, exactement quand le stun expire.
export const CITY_RUSH_STUN_SPIN_TURNS = 2; // tours complets pendant l'immobilisation

export function cityRushStunSpin(stunLeft, stunTotal, turns = CITY_RUSH_STUN_SPIN_TURNS) {
  const left = Math.max(0, Number(stunLeft) || 0);
  const total = Math.max(0, Number(stunTotal) || 0);
  const safeTurns = Math.max(0, Number(turns) || 0);
  if (left <= 0 || total <= 0 || safeTurns <= 0) return 0;
  const progress = Math.max(0, Math.min(1, 1 - left / total));
  // Ease-out quadratique : la vitesse de rotation fond linéairement jusqu'à 0.
  const eased = 1 - (1 - progress) ** 2;
  return eased * safeTurns * Math.PI * 2;
}

export const CITY_RUSH_POWERS = Object.freeze({
  BLUE_SHOT: 'blue-shot',
  PISTOL: 'pistol',
  CASH: 'cash',
  RADIO: 'radio',
});

// Chaque bonus charge une jauge dédiée : bleu 2, rouge 3, vert 2, jaune 4.
export const CITY_RUSH_POWER_CHARGE_COST = Object.freeze({
  [CITY_RUSH_POWERS.BLUE_SHOT]: 2, // bleu · tir droit
  [CITY_RUSH_POWERS.PISTOL]: 3, // rouge · pistolet
  [CITY_RUSH_POWERS.CASH]: 2, // vert · boisson énergisante
  [CITY_RUSH_POWERS.RADIO]: 4, // jaune · talkie-walkie
});

export const CITY_RUSH_POWER_RULES = Object.freeze({
  [CITY_RUSH_POWERS.BLUE_SHOT]: Object.freeze({
    id: CITY_RUSH_POWERS.BLUE_SHOT,
    name: 'Pistolet · tir droit',
    shortName: 'Tir droit',
    chargeCost: CITY_RUSH_POWER_CHARGE_COST[CITY_RUSH_POWERS.BLUE_SHOT],
    color: '#48b9ff',
    key: 'A',
    automatic: false,
    description: `Tire droit sans viser : au plus un adversaire sur ta voie et dans ton champ de vision. Voie libre devant ? Le tir part vers l'arrière contre la berline de police la plus proche. La voiture touchée dérape et ralentit légèrement pendant ${CITY_RUSH_BLUE_SHOT_DURATION} s. Deux tirs bleus détruisent une berline de police.`,
    duration: CITY_RUSH_BLUE_SHOT_DURATION,
    speedFactor: CITY_RUSH_BLUE_SHOT_SPEED_FACTOR,
  }),
  [CITY_RUSH_POWERS.PISTOL]: Object.freeze({
    id: CITY_RUSH_POWERS.PISTOL,
    name: 'Mitrailleuse',
    shortName: 'Mitrailleuse',
    chargeCost: CITY_RUSH_POWER_CHARGE_COST[CITY_RUSH_POWERS.PISTOL],
    color: '#ff526e',
    key: 'Z',
    automatic: false,
    description: 'Tire une courte rafale sur le rival qui est devant toi ; il dérape (2 s de base). Au dernier tour, si personne n’est devant, la rafale peut se retourner contre la berline de police la plus proche — une seule rafale la détruit.',
    duration: 2,
  }),
  [CITY_RUSH_POWERS.CASH]: Object.freeze({
    id: CITY_RUSH_POWERS.CASH,
    name: 'Boisson énergisante',
    shortName: 'Énergie',
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
    description: 'L’hélicoptère immobilise le rival le mieux placé devant toi (jamais toi, jamais un rival poursuivant) et les adversaires proches de l’impact devant ton capot ; en tête au dernier tour, il peut aussi bombarder la berline de police qui te traque — un seul missile la détruit. Les voitures touchées partent en toupie sur place, incapables de changer de voie ; la reprise de chaque cible règle la durée (2 s de base).',
    duration: 2,
  }),
});

// ── Éclatement et réapparition des bonus ────────────────────────────────────
// Un bonus ramassé ne disparaît plus d'un coup : il éclate en éclats de sa
// couleur (flash, anneau qui s'ouvre, débris projetés puis repris par la
// gravité) et réapparaît 0,1 s plus tard en gonflant depuis son socle pour
// rester prenable par les voitures suivantes. Tous les calculs sont purs,
// donc testables hors de three.js.
export const CITY_RUSH_PICKUP_RESPAWN_DELAY = 0.1; // s : délai avant qu'un bonus ramassé ne réapparaisse
export const CITY_RUSH_PICKUP_BURST_DURATION = 0.44; // s : l'éclatement reste à l'écran
export const CITY_RUSH_PICKUP_BURST_SHARDS = 12; // éclats projetés par bonus
export const CITY_RUSH_PICKUP_BURST_GRAVITY = 11; // m/s² : les éclats retombent
export const CITY_RUSH_PICKUP_BURST_LIFT = 0.42; // m de saut vers le haut
export const CITY_RUSH_PICKUP_BURST_SPEED = 4.4; // m/s d'éjection

const clamp01 = (value) => Math.max(0, Math.min(1, value));

export function markCityRushPickupTaken(cooldowns, key, now, delay = CITY_RUSH_PICKUP_RESPAWN_DELAY) {
  if (!cooldowns || key === undefined || key === null) return;
  const safeNow = Number.isFinite(Number(now)) ? Number(now) : 0;
  const safeDelay = Number.isFinite(Number(delay)) ? Math.max(0, Number(delay)) : CITY_RUSH_PICKUP_RESPAWN_DELAY;
  cooldowns.set(key, safeNow + safeDelay);
}

export function isCityRushPickupHidden(cooldowns, key, now) {
  if (!cooldowns || key === undefined || key === null) return false;
  const respawnAt = cooldowns.get(key);
  if (respawnAt === undefined) return false;
  const safeNow = Number.isFinite(Number(now)) ? Number(now) : 0;
  if (safeNow < respawnAt - 1e-9) return true;
  cooldowns.delete(key);
  return false;
}

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

// Les pouvoirs de tir (mitrailleuse, talkie-walkie) ne visent qu'un adversaire
// situé DEVANT leur pilote : on ne peut jamais viser, ni toucher, quelqu'un qui
// est derrière soi. La tolérance d'un mètre évite de perdre une cible collée au
// pare-chocs au moment d'un dépassement (les deux voitures comptent alors
// comme à la même hauteur).
export const CITY_RUSH_FORWARD_TOLERANCE = 1;

export function cityRushIsAhead(distance, referenceDistance, tolerance = CITY_RUSH_FORWARD_TOLERANCE) {
  const target = Number(distance);
  const reference = Number(referenceDistance);
  const slack = Number(tolerance);
  if (!Number.isFinite(target) || !Number.isFinite(reference)) return false;
  return target >= reference - Math.max(0, Number.isFinite(slack) ? slack : CITY_RUSH_FORWARD_TOLERANCE);
}

// Le tir bleu suit un axe fixe : une seule voiture peut être prise pour cible,
// la plus proche devant le tireur, uniquement si elle occupe sa voie et est
// déjà visible dans la portée de rendu. Contrairement à la mitrailleuse rouge,
// cette sélection ne corrige jamais la trajectoire du projectile.
export function cityRushStraightShotTarget({
  attackerDistance = 0,
  attackerLane = 0,
  targets = [],
  maxDistance = CITY_RUSH_BLUE_SHOT_MAX_RANGE,
  minGap = CITY_RUSH_BLUE_SHOT_MIN_GAP,
} = {}) {
  const origin = Number(attackerDistance);
  const lane = Number(attackerLane);
  const range = Math.max(0, Number(maxDistance) || CITY_RUSH_BLUE_SHOT_MAX_RANGE);
  const minimum = Math.max(0, Number(minGap) || 0);
  if (!Number.isFinite(origin) || !Number.isFinite(lane)) return null;
  return (Array.isArray(targets) ? targets : [])
    .filter((target) => target && target.visible !== false)
    .filter((target) => Number(target.lane) === lane)
    .filter((target) => {
      const gap = Number(target.distance) - origin;
      return Number.isFinite(gap) && gap > minimum && gap <= range;
    })
    .sort((a, b) => Number(a.distance) - Number(b.distance))[0] || null;
}

// Balayage du projectile en vol : le tir bleu n'est pas guidé, il parcourt un
// segment de voie bien précis entre l'image précédente et l'image courante
// (`fromDistance` → `toDistance`, dans la voie `lane`). Toute voiture de ce
// segment l'encaisse — qu'elle ait été verrouillée au départ du tir ou qu'elle
// se soit rabattue devant le projectile pendant son vol. C'est ce qui permet au
// tir bleu de toucher les berlines de police, qui changent de voie en
// permanence pour rafler les bonus : sans balayage, une berline qui se rabat
// devant la balle ne la voyait jamais passer.
// Le segment est donné dans l'ordre (`fromDistance < toDistance`), quel que
// soit le sens de marche du projectile : en riposte vers l'arrière, l'appelant
// passe `min → max`. Une voiture laissée derrière le canon n'est jamais
// touchée. Quand plusieurs voitures sont balayées sur la même image, c'est la
// plus proche du canon qui prend — le projectile s'arrête sur le premier
// obstacle.
export function cityRushStraightShotSweptHit({
  lane,
  fromDistance = 0,
  toDistance = 0,
  targets = [],
} = {}) {
  const shotLane = Number(lane);
  const from = Number(fromDistance);
  const to = Number(toDistance);
  if (!Number.isFinite(shotLane) || !Number.isFinite(from) || !Number.isFinite(to)) return null;
  // Segment vide ou inversé (image figée, projectile en fin de portée) : rien.
  if (to <= from) return null;
  return (Array.isArray(targets) ? targets : [])
    .filter((target) => target && Number(target.lane) === shotLane)
    .filter((target) => {
      const at = Number(target.distance);
      return Number.isFinite(at) && at > from && at <= to;
    })
    .sort((a, b) => Number(a.distance) - Number(b.distance))[0] || null;
}

// Riposte du tir droit bleu : quand aucune voiture n'occupe la voie du tireur
// devant lui, le projectile peut partir vers l'arrière contre la berline de
// police la plus proche de cette voie — exactement comme la rafale rouge et
// l'hélicoptère le font déjà en dernier tour (`cityRushPoliceTarget`). Sans
// cette riposte, le tir bleu ne pouvait jamais atteindre l'escouade : les
// berlines attaquent dans le pare-chocs du pilote (`CITY_RUSH_POLICE_ATTACK_LEAD`
// est négatif) et un projectile qui ne part que vers l'avant ne les croise
// jamais. La riposte reste un tir droit : elle exige la même voie et reste
// bornée par la portée du projectile.
export function cityRushStraightShotRetaliation({
  pursuers = [],
  attackerDistance = 0,
  attackerLane = null,
  excludeId = null,
  maxDistance = CITY_RUSH_BLUE_SHOT_MAX_RANGE,
} = {}) {
  const reference = Number(attackerDistance);
  // `attackerLane` absent : aucune voie imposée (les rivaux IA ripostent sur
  // la berline la plus proche, quelle que soit sa voie).
  const lane = attackerLane === null || attackerLane === undefined ? Number.NaN : Number(attackerLane);
  const range = Math.max(0, Number(maxDistance) || CITY_RUSH_BLUE_SHOT_MAX_RANGE);
  if (!Number.isFinite(reference)) return null;
  const inLane = (Array.isArray(pursuers) ? pursuers : [])
    .filter((police) => police && police.id !== excludeId && police.active !== false)
    .filter((police) => !Number.isFinite(lane) || Number(police.lane) === lane)
    .filter((police) => {
      const gap = Number(police.distance);
      return Number.isFinite(gap) && Math.abs(gap - reference) <= range;
    });
  return cityRushPoliceTarget(inLane, reference, excludeId);
}

// Le talkie ne verrouille que les rivaux devant son pilote : parmi eux, c'est
// toujours le mieux placé qui est visé. Un pilote en tête n'a donc aucune cible
// (l'hélico ne se retourne jamais contre lui) et garde sa jauge chargée. Si
// l'appelant est absent de la liste (appel défensif), on retombe sur l'ancien
// comportement : le mieux placé des rivaux.
export function cityRushHelicopterTarget(racers = [], playerId = 'player') {
  const caller = racers.find((racer) => racer?.id === playerId) || null;
  const reference = Number(caller?.distance);
  return [...racers]
    .filter((racer) => racer?.id !== playerId)
    .filter((racer) => !Number.isFinite(reference) || cityRushIsAhead(racer?.distance, reference))
    .sort((a, b) => (Number(b.distance) || 0) - (Number(a.distance) || 0))[0] || null;
}

// Exception du dernier tour pour les pouvoirs rouge (mitrailleuse) et jaune
// (hélico) : quand l'appelant n'a plus personne devant lui — il mène la
// course et l'escouade s'est repliée sur son pare-chocs pour ouvrir le feu —,
// la riposte peut se retourner contre la berline « active » la plus proche,
// qu'elle soit devant, roue contre roue ou déjà dépassée. Un hélicoptère
// frappe où il veut et une rafale de riposte part vers l'arrière ; l'exception
// ne vaut que pour ces poursuivants non classés, jamais pour un rival classé.
// `excludeId` permet au tireur de ne jamais se viser lui-même.
export function cityRushPoliceTarget(pursuers = [], referenceDistance = 0, excludeId = null) {
  const reference = Number(referenceDistance);
  if (!Number.isFinite(reference)) return null;
  return (Array.isArray(pursuers) ? pursuers : [])
    .filter((police) => police && police.id !== excludeId && police.active !== false)
    .filter((police) => Number.isFinite(Number(police.distance)))
    .sort((a, b) => Math.abs(Number(a.distance) - reference) - Math.abs(Number(b.distance) - reference))[0] || null;
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

const finiteNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

/**
 * Repère le moment où une voiture de course va réellement toucher le trafic
 * lent. Le moteur de mouvement garde une marge de sécurité pour empêcher les
 * voitures de se superposer ; on observe donc les distances demandées avant
 * ce rabotage, sinon l'impact ne pourrait jamais être déclenché.
 *
 * Les rivaux de course ne se percutent toujours pas entre eux : seuls les
 * couples `racer` → `traffic` sont retournés. `x` permet aussi de détecter un
 * changement de voie en cours, quand les deux voitures n'ont pas encore le
 * même numéro de voie mais que leurs carrosseries se recouvrent.
 */
export function detectCityRushTrafficImpacts(cars = [], minimumGap = CITY_RUSH_TRAFFIC_IMPACT_GAP) {
  const safeGap = Math.max(0, finiteNumber(minimumGap, CITY_RUSH_TRAFFIC_IMPACT_GAP));
  const racers = (Array.isArray(cars) ? cars : []).filter((car) => car?.collisionGroup === 'racer');
  const traffic = (Array.isArray(cars) ? cars : []).filter((car) => car?.collisionGroup === 'traffic');
  const impacts = [];

  for (const racer of racers) {
    const racerPrevious = finiteNumber(racer.previousDistance);
    const racerNext = Math.max(racerPrevious, finiteNumber(racer.nextDistance, racerPrevious));
    const racerWidth = Math.max(0, finiteNumber(racer.width, 1.9));
    for (const vehicle of traffic) {
      const trafficPrevious = finiteNumber(vehicle.previousDistance);
      const trafficNext = Math.max(trafficPrevious, finiteNumber(vehicle.nextDistance, trafficPrevious));
      const trafficWidth = Math.max(0, finiteNumber(vehicle.width, 1.9));
      const sameLane = racer.lane === vehicle.lane;
      const lateralOverlap = Number.isFinite(Number(racer.x))
        && Number.isFinite(Number(vehicle.x))
        && Math.abs(Number(racer.x) - Number(vehicle.x)) < (racerWidth + trafficWidth) / 2;
      if (!sameLane && !lateralOverlap) continue;

      const previousGap = trafficPrevious - racerPrevious;
      const requestedGap = trafficNext - racerNext;
      // Ne pas transformer deux voitures déjà espacées de moins de `safeGap`
      // en une suite infinie d'impacts : il faut entrer dans la marge depuis
      // l'arrière, ce qui laisse le temps au véhicule de se rabattre.
      const wasOutsideContact = previousGap > safeGap + 1e-7;
      const touches = requestedGap <= safeGap + 1e-7
        || racerNext >= trafficPrevious - safeGap - 1e-7;
      if (!wasOutsideContact || !touches) continue;
      impacts.push({
        racerId: racer.id,
        trafficId: vehicle.id,
        previousGap,
        requestedGap,
        lane: vehicle.lane,
      });
    }
  }
  return impacts.sort((a, b) => a.requestedGap - b.requestedGap);
}

/**
 * Choisit une voie de dégagement pour un véhicule lent touché. On tente une
 * voie voisine, puis les autres voies si le bord immédiat est bouché. Les
 * voies signalées comme occupées restent un dernier recours seulement : même
 * dans un peloton serré, le trafic doit quitter la trajectoire pour que la
 * voiture touchée ne rebloque pas le joueur.
 */
export function chooseCityRushTrafficEscapeLane({
  currentLane = 0,
  laneCount = CITY_RUSH_LANE_X.length,
  blockedLanes = [],
} = {}) {
  const count = Math.max(1, Math.floor(finiteNumber(laneCount, CITY_RUSH_LANE_X.length)));
  const current = Math.max(0, Math.min(count - 1, Math.floor(finiteNumber(currentLane))));
  const blocked = new Set((Array.isArray(blockedLanes) ? blockedLanes : [])
    .filter((lane) => lane >= 0 && lane < count));
  const candidates = Array.from({ length: count }, (_, lane) => lane)
    .filter((lane) => lane !== current)
    .sort((a, b) => Math.abs(a - current) - Math.abs(b - current) || a - b);
  const clear = candidates.find((lane) => !blocked.has(lane));
  return clear ?? candidates[0] ?? current;
}

/**
 * Génère une rangée de bonus et sa zone de ralentissement au sol.
 * Les véhicules lents du trafic sont gérés séparément par le monde 3D.
 */
export function createCityRushEncounter(random = Math.random) {
  const laneCount = CITY_RUSH_LANE_X.length;
  const allLanes = Array.from({ length: laneCount }, (_, lane) => lane);
  const slowLane = random() < 0.24 ? Math.floor(random() * laneCount) : null;
  const available = allLanes.filter((lane) => lane !== slowLane);
  // Les bonus sont fréquents et les rangées vides sont rares; les duos
  // restent limités pour garder les voies lisibles.
  const pickupCount = random() < 0.1 ? 0 : Math.min(available.length, random() < 0.85 ? 1 : 2);
  const pickups = [];

  for (let index = 0; index < pickupCount; index += 1) {
    const slot = Math.floor(random() * available.length);
    const [lane] = available.splice(slot, 1);
    const roll = random();
    // L'hélico jaune est volontairement rare (10 % des bonus posés) ; les
    // trois autres couleurs se partagent le reste de façon équilibrée.
    const type = roll < 0.36 ? 'cash'
      : roll < 0.64 ? CITY_RUSH_POWERS.BLUE_SHOT
        : roll < 0.90 ? 'pistol'
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

// Choisit une prochaine voie en équilibrant les bonus à portée et les
// menaces lentes, parmi les changements de voie effectivement disponibles.
// `oncomingLanes` liste les voies en sens inverse : y rouler coûte un petit
// malus permanent (le danger peut surgir de face à tout instant), si bien
// qu'à danger égal un pilote se rabat toujours vers le sens de la course.
export function chooseCityRushAiLane({
  currentLane = 0,
  laneCount = CITY_RUSH_LANE_X.length,
  distance = 0,
  speed = 24,
  availableLanes,
  pickups = [],
  slowZones = [],
  traffic = [],
  oncomingLanes = CITY_RUSH_ONCOMING_LANES,
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
  const oncoming = new Set((Array.isArray(oncomingLanes) ? oncomingLanes : [])
    .map((oncomingLane) => clampCityRushLane(oncomingLane, laneCount)));
  let bestLane = lane;
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    let safetyScore = -Math.abs(candidate - lane) * 1.25;
    if (oncoming.has(candidate)) safetyScore -= 6;
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
      // Une vitesse négative signale un véhicule venant en face : la vitesse
      // de fermeture est alors la somme des deux vitesses. Marqué `oncoming`,
      // le danger passe à l'échelle des bonus : un pilote ne se jette pas
      // sous un capot qui arrive, il double dès que la voie se dégage.
      const vehicleSpeed = Math.max(-racerSpeed, Number(vehicle.speed) || 0);
      const closingSpeed = Math.max(1, racerSpeed - vehicleSpeed);
      const timeToReach = gap / closingSpeed;
      const hazardWeight = vehicle.oncoming ? 130 : 1;
      safetyScore -= hazardWeight * (timeToReach < 1.5 ? 24 : timeToReach < 3 ? 17 : timeToReach < 5.5 ? 10 : 4.5);
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

// ── Pilotes internationaux & avatars distincts ──────────────────────────────
// Chaque course réunit 4 pilotes (notre joueur + 3 rivaux) dotés chacun d'un
// avatar unique et d'un prénom issu d'un pays différent autour du monde.
export const CITY_RUSH_RACER_SLOTS = Object.freeze(['player', 'nova', 'juno', 'ace']);

export const CITY_RUSH_DRIVERS = Object.freeze([
  Object.freeze({
    id: 'kenji', avatarId: 'avatar-kenji', name: 'KENJI', displayName: 'Kenji', country: 'Japon', countryCode: 'JP', flag: '🇯🇵', accent: '#42e6ff',
    avatar: Object.freeze({
      id: 'avatar-kenji', skin: '#f3c8a6', hair: '#181c2e', hairStyle: 'spiky',
      accessory: 'cyber-visor', accessoryColor: '#42e6ff', outfit: '#ff5b9a', trim: '#ffffff', bgStart: '#18244b', bgEnd: '#4d1b49',
    }),
  }),
  Object.freeze({
    id: 'camila', avatarId: 'avatar-camila', name: 'CAMILA', displayName: 'Camila', country: 'Brésil', countryCode: 'BR', flag: '🇧🇷', accent: '#50e48a',
    avatar: Object.freeze({
      id: 'avatar-camila', skin: '#c8875b', hair: '#2a1a17', hairStyle: 'curly',
      accessory: 'aviator-gold', accessoryColor: '#ffd44f', outfit: '#28b463', trim: '#ffe066', bgStart: '#0f3828', bgEnd: '#1b4f5c',
    }),
  }),
  Object.freeze({
    id: 'amine', avatarId: 'avatar-amine', name: 'AMINE', displayName: 'Amine', country: 'Maroc', countryCode: 'MA', flag: '🇲🇦', accent: '#ff8a48',
    avatar: Object.freeze({
      id: 'avatar-amine', skin: '#d89b72', hair: '#1d181b', hairStyle: 'short-fade',
      accessory: 'retro-amber', accessoryColor: '#ff9f43', outfit: '#c0392b', trim: '#f6d365', bgStart: '#3d1624', bgEnd: '#6e3219',
    }),
  }),
  Object.freeze({
    id: 'giulia', avatarId: 'avatar-giulia', name: 'GIULIA', displayName: 'Giulia', country: 'Italie', countryCode: 'IT', flag: '🇮🇹', accent: '#ff526e',
    avatar: Object.freeze({
      id: 'avatar-giulia', skin: '#f1c2a0', hair: '#5a2d1e', hairStyle: 'wavy-long',
      accessory: 'cat-eye', accessoryColor: '#ff526e', outfit: '#d63031', trim: '#55efc4', bgStart: '#3a1528', bgEnd: '#1b3b36',
    }),
  }),
  Object.freeze({
    id: 'mateo', avatarId: 'avatar-mateo', name: 'MATEO', displayName: 'Mateo', country: 'Mexique', countryCode: 'MX', flag: '🇲🇽', accent: '#43ead5',
    avatar: Object.freeze({
      id: 'avatar-mateo', skin: '#cf8e64', hair: '#1c191f', hairStyle: 'headband',
      accessory: 'mirror-shades', accessoryColor: '#43ead5', outfit: '#00b894', trim: '#ff7675', bgStart: '#11343b', bgEnd: '#472133',
    }),
  }),
  Object.freeze({
    id: 'chloe', avatarId: 'avatar-chloe', name: 'CHLOÉ', displayName: 'Chloé', country: 'France', countryCode: 'FR', flag: '🇫🇷', accent: '#ff5db8',
    avatar: Object.freeze({
      id: 'avatar-chloe', skin: '#f6cfb2', hair: '#e4b869', hairStyle: 'bob',
      accessory: 'french-beret', accessoryColor: '#ff5db8', outfit: '#2e3c7e', trim: '#ff7eb3', bgStart: '#1c2247', bgEnd: '#4c1e40',
    }),
  }),
  Object.freeze({
    id: 'kwame', avatarId: 'avatar-kwame', name: 'KWAME', displayName: 'Kwame', country: 'Nigeria', countryCode: 'NG', flag: '🇳🇬', accent: '#ffd44f',
    avatar: Object.freeze({
      id: 'avatar-kwame', skin: '#7a482b', hair: '#151218', hairStyle: 'locs',
      accessory: 'gold-shield', accessoryColor: '#ffd44f', outfit: '#10ac84', trim: '#fff2a6', bgStart: '#102e2a', bgEnd: '#3b3214',
    }),
  }),
  Object.freeze({
    id: 'seoyeon', avatarId: 'avatar-seoyeon', name: 'SEO-YEON', displayName: 'Seo-yeon', country: 'Corée du Sud', countryCode: 'KR', flag: '🇰🇷', accent: '#a78bff',
    avatar: Object.freeze({
      id: 'avatar-seoyeon', skin: '#f5d2b8', hair: '#3b245e', hairStyle: 'neon-bangs',
      accessory: 'neon-headset', accessoryColor: '#a78bff', outfit: '#6c5ce7', trim: '#62e7dc', bgStart: '#231942', bgEnd: '#153447',
    }),
  }),
  Object.freeze({
    id: 'astrid', avatarId: 'avatar-astrid', name: 'ASTRID', displayName: 'Astrid', country: 'Suède', countryCode: 'SE', flag: '🇸🇪', accent: '#48b9ff',
    avatar: Object.freeze({
      id: 'avatar-astrid', skin: '#f8d9c2', hair: '#f6dc8b', hairStyle: 'swept',
      accessory: 'glacier-glass', accessoryColor: '#48b9ff', outfit: '#0984e3', trim: '#ffeaa7', bgStart: '#122a47', bgEnd: '#2e3d52',
    }),
  }),
  Object.freeze({
    id: 'layla', avatarId: 'avatar-layla', name: 'LAYLA', displayName: 'Layla', country: 'Égypte', countryCode: 'EG', flag: '🇪🇬', accent: '#f0ce65',
    avatar: Object.freeze({
      id: 'avatar-layla', skin: '#c9885e', hair: '#19151d', hairStyle: 'braids',
      accessory: 'octagon-gold', accessoryColor: '#f0ce65', outfit: '#e17055', trim: '#43ead5', bgStart: '#3d231c', bgEnd: '#16363c',
    }),
  }),
  Object.freeze({
    id: 'diego', avatarId: 'avatar-diego', name: 'DIEGO', displayName: 'Diego', country: 'Argentine', countryCode: 'AR', flag: '🇦🇷', accent: '#74b9ff',
    avatar: Object.freeze({
      id: 'avatar-diego', skin: '#dfa67e', hair: '#2d201c', hairStyle: 'cap-back',
      accessory: 'sport-visor', accessoryColor: '#74b9ff', outfit: '#0984e3', trim: '#ffffff', bgStart: '#132b47', bgEnd: '#1d3c45',
    }),
  }),
  Object.freeze({
    id: 'maya', avatarId: 'avatar-maya', name: 'MAYA', displayName: 'Maya', country: 'États-Unis', countryCode: 'US', flag: '🇺🇸', accent: '#ff7eb3',
    avatar: Object.freeze({
      id: 'avatar-maya', skin: '#9e6240', hair: '#4a2018', hairStyle: 'afro-curls',
      accessory: 'palm-shades', accessoryColor: '#ff5db8', outfit: '#fd79a8', trim: '#43ead5', bgStart: '#3c1836', bgEnd: '#143840',
    }),
  }),
]);

// Sélectionne 4 pilotes distincts (un pour notre joueur et un par rival) avec
// des avatars et des pays tous différents.
export function selectCityRushRacers({
  cityId = 'vice-city',
  carId = CITY_RUSH_CARS[0].id,
  runId = 0,
  playerDriverId = null,
} = {}) {
  const total = CITY_RUSH_DRIVERS.length;
  const cityIndex = Math.max(0, CITY_RUSH_CITIES.findIndex((item) => item.id === cityId));
  const carIndex = Math.max(0, CITY_RUSH_CARS.findIndex((item) => item.id === carId));
  const safeRun = Math.max(0, Math.trunc(Number(runId) || 0));
  const explicitPlayerIndex = playerDriverId
    ? CITY_RUSH_DRIVERS.findIndex((driver) => driver.id === playerDriverId)
    : -1;
  const playerIndex = explicitPlayerIndex >= 0
    ? explicitPlayerIndex
    : (cityIndex * 3 + carIndex * 2 + safeRun) % total;

  const chosen = [CITY_RUSH_DRIVERS[playerIndex]];
  const usedIds = new Set([CITY_RUSH_DRIVERS[playerIndex].id]);
  const usedCountries = new Set([CITY_RUSH_DRIVERS[playerIndex].countryCode]);
  const stride = 5; // premier avec 12 : parcourt tout le catalogue sans répétition
  let cursor = (playerIndex + cityIndex + carIndex + safeRun * 3 + 1) % total;

  while (chosen.length < CITY_RUSH_RACER_SLOTS.length) {
    const candidate = CITY_RUSH_DRIVERS[cursor];
    if (!usedIds.has(candidate.id) && !usedCountries.has(candidate.countryCode)) {
      chosen.push(candidate);
      usedIds.add(candidate.id);
      usedCountries.add(candidate.countryCode);
    }
    cursor = (cursor + stride) % total;
  }

  const defaultLanes = [1, 3, 0, 2];
  return CITY_RUSH_RACER_SLOTS.map((slotId, index) => {
    const driver = chosen[index];
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
      lane: defaultLanes[index],
    };
  });
}

// ── L'escouade de police du dernier tour ────────────────────────────────────
// Au passage du dernier tour, deux berlines d'interception entrent en piste
// juste derrière le premier du classement. Elles ne sont **pas classées** :
// `rankCityRushRacers` ne les voit jamais et l'écran d'arrivée les ignore.
// Leur seule mission est de nuire au leader — elles raflent **en priorité les
// bonus rouges (mitrailleuse) et jaunes (hélicoptère)** pour l'empêcher de
// s'armer, puis ouvrent le feu sur lui dès qu'une jauge rouge est pleine.
//
// Contrairement aux autres voitures de course, une berline est **solide** :
// elle ne se traverse pas. Elle peut donc se rabattre devant le leader puis
// lever le pied pour le retenir — un barrage roulant, exactement l'effet
// d'une voiture lente percutée — avant de repartir et de revenir à la charge.
export const CITY_RUSH_POLICE_COUNT = 2;
// Voies extérieures : l'escouade encadre le leader au lieu de lui barrer la route.
export const CITY_RUSH_POLICE_LANES = Object.freeze([0, 3]);
// Les deux bonus de tir, ceux que la police convoite avant tous les autres.
export const CITY_RUSH_POLICE_HUNT_TYPES = Object.freeze([CITY_RUSH_POWERS.PISTOL, CITY_RUSH_POWERS.RADIO]);
export const CITY_RUSH_POLICE_HUNT_WEIGHT = 5; // un bonus rouge/jaune vaut cinq bonus ordinaires
export const CITY_RUSH_POLICE_BASE_SPEED = CITY_RUSH_PLAYER_SPEED * 1.06;
export const CITY_RUSH_POLICE_LEAD = 15; // m : hauteur de croisière devant le leader
export const CITY_RUSH_POLICE_LEAD_SLACK = 6; // m : zone où la vitesse se cale sur celle du leader
export const CITY_RUSH_POLICE_ATTACK_LEAD = -5; // m : repli derrière le leader pour ouvrir le feu
export const CITY_RUSH_POLICE_SPAWN_BEHIND = 30; // m : distance d'entrée en piste, derrière le leader
export const CITY_RUSH_POLICE_LOOKAHEAD = 200; // m : portée de convoitise des bonus
export const CITY_RUSH_POLICE_STEAL_NOTICE = 150; // m : au-delà, la page ne commente plus un vol de bonus
export const CITY_RUSH_POLICE_FIRE_COOLDOWN = 2.2; // s : délai entre deux rafales de la même berline
export const CITY_RUSH_POLICE_VIEW_BEHIND = 22; // m : une berline reste dessinée un peu derrière nous
export const CITY_RUSH_POLICE_BLOCK_RANGE = 40; // m : au-delà, la voie est considérée bouchée

// Les berlines de l'escouade ont une petite barre de vie : deux tirs droits
// bleus, OU une seule rafale rouge, OU un seul missile d'hélicoptère les
// détruisent. Le barème des dégâts est pur, donc testable hors de three.js.
export const CITY_RUSH_POLICE_HEALTH = 2;
export const CITY_RUSH_POLICE_DAMAGE = Object.freeze({
  [CITY_RUSH_POWERS.BLUE_SHOT]: 1, // deux tirs droits bleus
  [CITY_RUSH_POWERS.PISTOL]: CITY_RUSH_POLICE_HEALTH, // une rafale rouge suffit
  [CITY_RUSH_POWERS.RADIO]: CITY_RUSH_POLICE_HEALTH, // un tir d'hélicoptère suffit
});

export function cityRushPoliceDamage(health = CITY_RUSH_POLICE_HEALTH, source = CITY_RUSH_POWERS.BLUE_SHOT) {
  const safeHealth = Math.max(0, Math.trunc(Number(health) || 0));
  const damage = Number(CITY_RUSH_POLICE_DAMAGE[source]);
  if (!Number.isFinite(damage) || damage <= 0) return safeHealth;
  return Math.max(0, safeHealth - damage);
}

// Prime de destruction : le pilote qui fait exploser une berline la touche.
export const CITY_RUSH_POLICE_DESTROY_SCORE = 200;

// ── Barrage roulant : la berline coupe la route au leader ───────────────────
// Une berline qui se retrouve devant le leader, dans sa voie, lève le pied au
// lieu de tenir sa hauteur. Le leader la percute comme une voiture lente : il
// est retenu à sa hauteur tant qu'il ne change pas de voie. Le barrage dure
// quelques secondes, puis la berline repart pour revenir à la charge.
export const CITY_RUSH_POLICE_BLOCKADE_RANGE = 34; // m : hauteur maximale d'un barrage devant le leader
export const CITY_RUSH_POLICE_BLOCKADE_SPEED_FACTOR = 0.62; // de sa vitesse d'ancrage
export const CITY_RUSH_POLICE_BLOCKADE_MIN_SPEED = 12; // m/s : un barrage roule, il ne s'arrête jamais
export const CITY_RUSH_POLICE_BLOCKADE_HOLD = 3.2; // s : durée d'un barrage avant de repartir
export const CITY_RUSH_POLICE_INTERCEPT_RANGE = 80; // m : devant le leader, portée où la berline vise sa voie
export const CITY_RUSH_POLICE_INTERCEPT_WEIGHT = 3; // un barrage vaut trois bonus ordinaires
export const CITY_RUSH_POLICE_HUNT_RANGE = 60; // m : sous cette distance, un rouge/jaune passe avant le barrage
// Engluée (vitesse effondrée derrière une voiture qu'elle ne peut plus
// traverser), la berline cherche d'abord à s'extraire de la voie : rester
// collée derrière un pilote l'empêcherait de venir le bloquer.
export const CITY_RUSH_POLICE_ESCAPE_WEIGHT = 14;

// ── La police du trafic sort de sa ronde ────────────────────────────────────
// Percuter une berline de police « pnj » la sort de sa patrouille : elle prend
// en chasse le pilote qui l'a touchée, avec exactement les mêmes armes que
// l'escouade du dernier tour — barrage roulant, vols de bonus rouges/jaunes et
// rafales de mitrailleuse. Elle n'est pas classée non plus, et rentre dans le
// rang au drapeau à damier.
export const CITY_RUSH_POLICE_RALLY_TOLERANCE = 0.3; // m : marge de contact au-delà de la distance de sécurité
export const CITY_RUSH_POLICE_RALLY_BASE_SPEED = CITY_RUSH_POLICE_BASE_SPEED;

// Le contact se juge comme la résolution de mouvement : recouvrement latéral
// **et** pare-chocs dans la fenêtre de sécurité des voitures (`distance`, par
// défaut `CITY_RUSH_CAR_GAP`). Deux voitures calées à cette distance sont en
// train de se percuter — l'une pousse, l'autre bloque.
export function cityRushPoliceContact({
  gap = 0,
  x,
  targetX,
  width = 1.94,
  targetWidth = 1.9,
  distance = CITY_RUSH_CAR_GAP,
  tolerance = CITY_RUSH_POLICE_RALLY_TOLERANCE,
} = {}) {
  const safeGap = Number(gap);
  const reach = Math.max(0, Number(distance) || 0) + Math.max(0, Number(tolerance) || 0);
  if (!Number.isFinite(safeGap) || Math.abs(safeGap) > reach) return false;
  const lateral = Number(x);
  const otherLateral = Number(targetX);
  if (!Number.isFinite(lateral) || !Number.isFinite(otherLateral)) return false;
  const halfWidths = (Math.max(0, Number(width) || 0) + Math.max(0, Number(targetWidth) || 0)) / 2;
  return Math.abs(lateral - otherLateral) < Math.max(1.2, halfWidths);
}

// L'escouade ne prend en chasse que le premier du classement. `entries` ne
// contient que les pilotes classés (notre joueur et les trois rivaux) : à
// égalité, le premier de la liste — notre joueur — est déclaré leader, comme
// dans `rankCityRushRacers`.
export function cityRushPackLeader(entries = []) {
  let leader = null;
  for (const entry of Array.isArray(entries) ? entries : []) {
    const distance = Number(entry?.distance);
    if (!Number.isFinite(distance)) continue;
    if (!leader || distance > leader.distance) leader = { ...entry, distance };
  }
  return leader;
}

// Une berline est « en barrage » quand elle roule devant le leader, à sa
// hauteur (même voie, ou recouvrement latéral suffisant pour le toucher) et à
// portée de son pare-chocs. C'est dans cette position qu'elle lève le pied
// pour le retenir derrière elle.
export function cityRushPoliceBlocksLeader({
  gap = 0,
  lane = 0,
  leaderLane = 0,
  x,
  leaderX,
  policeWidth = 1.94,
  leaderWidth = 1.9,
  range = CITY_RUSH_POLICE_BLOCKADE_RANGE,
} = {}) {
  const ahead = Number(gap);
  const reach = Math.max(1, Number(range) || CITY_RUSH_POLICE_BLOCKADE_RANGE);
  if (!Number.isFinite(ahead) || ahead <= 0 || ahead > reach) return false;
  const policeLateral = Number(x);
  const leaderLateral = Number(leaderX);
  if (Number.isFinite(policeLateral) && Number.isFinite(leaderLateral)) {
    const widths = (Math.max(0, Number(policeWidth) || 0) + Math.max(0, Number(leaderWidth) || 0)) / 2;
    return Math.abs(policeLateral - leaderLateral) < Math.max(1.2, widths);
  }
  return clampCityRushLane(lane) === clampCityRushLane(leaderLane);
}

// Vitesse d'un barrage roulant : la berline se cale nettement sous la vitesse
// du leader pour le retenir. Elle ne s'arrête jamais en travers de la piste —
// un mur immobile bloquerait la course pour de bon — d'où le plancher, et
// l'ancrage sur la vitesse de croisière de l'escouade pour ne pas s'engluer
// quand le leader est lui-même ralenti par le barrage.
export function cityRushPoliceBlockadePace({
  leaderSpeed = CITY_RUSH_PLAYER_SPEED,
  baseSpeed = CITY_RUSH_POLICE_BASE_SPEED,
  factor = CITY_RUSH_POLICE_BLOCKADE_SPEED_FACTOR,
  floor = CITY_RUSH_POLICE_BLOCKADE_MIN_SPEED,
} = {}) {
  const safeLeader = Math.max(0, Number(leaderSpeed) || 0);
  const safeBase = Math.max(0, Number(baseSpeed) || 0);
  const anchor = Math.max(safeLeader, safeBase * 0.82);
  const ratio = Math.min(1, Math.max(0.2, Number(factor) || CITY_RUSH_POLICE_BLOCKADE_SPEED_FACTOR));
  const minimum = Math.max(0, Number(floor) || 0);
  return Math.max(minimum, Math.min(anchor, anchor * ratio));
}

// Vitesse visée par une berline pour rester collée au leader : elle sprinte
// quand elle est distancée, lève le pied quand elle est trop en avant, et se
// cale sur la vitesse du leader dans la zone de croisière. Une fois la jauge
// rouge pleine, `lead` devient négatif (voir `CITY_RUSH_POLICE_ATTACK_LEAD`)
// et la berline se replie derrière le leader pour ouvrir le feu. En barrage
// (`blocking`), elle roule devant lui et freine pour le retenir.
export function cityRushPolicePace({
  gap = 0,
  baseSpeed = CITY_RUSH_POLICE_BASE_SPEED,
  leaderSpeed = CITY_RUSH_PLAYER_SPEED,
  lead = CITY_RUSH_POLICE_LEAD,
  tolerance = CITY_RUSH_POLICE_LEAD_SLACK,
  sprint = 1.34,
  ease = 0.9,
  blocking = false,
} = {}) {
  const safeBase = Math.max(0, Number(baseSpeed) || 0);
  const safeLeader = Math.max(0, Number(leaderSpeed) || 0);
  const safeGap = Number(gap) || 0;
  const safeLead = Number(lead) || 0;
  const slack = Math.max(0, Number(tolerance) || 0);
  const sprintFactor = Math.max(1, Number(sprint) || 1.34);
  const easeFactor = Math.min(1, Math.max(0.2, Number(ease) || 0.9));
  // Barrage : devant le leader, la berline lève le pied au lieu de tenir sa
  // hauteur. C'est ce qui force le poursuivi à la percuter ou à la contourner.
  if (blocking && safeGap > 0) return cityRushPoliceBlockadePace({ leaderSpeed: safeLeader, baseSpeed: safeBase });
  if (safeGap < safeLead - slack) return safeBase * sprintFactor;
  if (safeGap > safeLead + slack) {
    // Trop en avant : elle lève le pied d'autant plus qu'elle est loin. Une
    // berline ne part pas gagner la course — elle attend le leader.
    const ahead = safeGap - (safeLead + slack);
    const brake = Math.max(0.45, 1 - ahead / 120);
    return Math.max(6, safeLeader * easeFactor * brake);
  }
  // Croisière : la berline tient sa position, mais ne s'arrête jamais net.
  return Math.max(safeLeader, safeBase * 0.82);
}

// Une voie est « bouchée » pour une berline quand un véhicule lent la précède à
// portée de freinage (`CITY_RUSH_POLICE_BLOCK_RANGE`). La vitesse du trafic
// n'est pas toujours connue : sans elle, le véhicule est supposé à l'arrêt.
// Une berline déjà engluée roule à la vitesse du trafic, d'où le plancher.
export function isCityRushPoliceLaneJammed({
  lane = 0,
  distance = 0,
  speed = CITY_RUSH_PLAYER_SPEED,
  traffic = [],
  range = CITY_RUSH_POLICE_BLOCK_RANGE,
} = {}) {
  const ownSpeed = Math.max(0, Number(speed) || 0);
  const slowThreshold = Math.max(12, ownSpeed * 0.6);
  return (Array.isArray(traffic) ? traffic : []).some((vehicle) => {
    if (!vehicle || vehicle.lane !== lane) return false;
    const gap = Number(vehicle.distance) - Number(distance);
    if (!Number.isFinite(gap) || gap < -3 || gap > range) return false;
    return Math.max(0, Number(vehicle.speed) || 0) < slowThreshold;
  });
}

// Choix de voie de l'escouade : même prudence que les rivaux devant le trafic
// et les zones lentes, mais une convoitise multipliée pour les bonus rouges et
// jaunes — c'est là qu'elle prive le leader de ses armes.
//
// La convoitise (×100) écrase toute pénalité de circulation : un bonus rouge
// devant un camion suffisait à garder la berline collée à son pare-chocs, à
// 5 m/s, pendant que le leader s'envolait — l'escouade décrochait et n'était
// plus jamais à l'écran. Une voie bouchée est donc écartée d'office tant
// qu'une voie libre est ouverte ; si tout est bouché, le choix d'origine
// reste valable (la berline touche alors le véhicule, voir le monde 3D).
//
// Deux ajouts du barrage : `racers` (les voitures de course sont solides, une
// berline ne reste pas engluée derrière elles) et `interceptLane` (devant le
// leader, la berline se rabat dans sa voie pour lui couper la route).
export function chooseCityRushPoliceLane({
  currentLane = 0,
  laneCount = CITY_RUSH_LANE_X.length,
  distance = 0,
  speed = CITY_RUSH_PLAYER_SPEED,
  availableLanes,
  pickups = [],
  slowZones = [],
  traffic = [],
  racers = [],
  targetLane = null,
  homeLane = null,
  interceptLane = null,
  interceptGap = 0,
  interceptRange = CITY_RUSH_POLICE_INTERCEPT_RANGE,
  stuck = false,
  lookAheadDistance = CITY_RUSH_POLICE_LOOKAHEAD,
} = {}) {
  const lane = clampCityRushLane(currentLane, laneCount);
  const allowed = new Set((availableLanes || Array.from({ length: laneCount }, (_, index) => index))
    .map((nextLane) => clampCityRushLane(nextLane, laneCount)));
  allowed.add(lane);
  const candidates = [lane, lane - 1, lane + 1]
    .filter((nextLane) => nextLane >= 0 && nextLane < laneCount && allowed.has(nextLane));
  const lookAhead = Math.max(1, Number(lookAheadDistance) || CITY_RUSH_POLICE_LOOKAHEAD);
  const racerSpeed = Math.max(0, Number(speed) || 0);
  const huntedLane = targetLane === null || targetLane === undefined ? null : clampCityRushLane(targetLane, laneCount);
  // Le barrage n'a de sens que devant le leader : la berline vise sa voie dès
  // qu'elle le dépasse, et lâche prise si elle est encore derrière lui.
  const interceptLead = Number(interceptGap);
  const interceptLimit = Math.max(1, Number(interceptRange) || CITY_RUSH_POLICE_INTERCEPT_RANGE);
  const intercepting = interceptLane !== null && interceptLane !== undefined
    && Number.isFinite(interceptLead) && interceptLead >= 0 && interceptLead <= interceptLimit;
  const interceptTarget = intercepting ? clampCityRushLane(interceptLane, laneCount) : null;
  // Une voie bouchée par un véhicule lent est écartée d'office tant qu'une voie
  // libre est ouverte : la convoitise (×100) écrasait la prudence, et l'escouade
  // restait collée à un camion, à 5 m/s, pendant que le leader s'envolait.
  const clearLanes = candidates.filter((candidate) => !isCityRushPoliceLaneJammed({ lane: candidate, distance, speed: racerSpeed, traffic }));
  const options = clearLanes.length ? clearLanes : candidates;
  // Couper la route au leader est un choix de mission, pas de convoitise : une
  // berline qui lui est passée devant se rabat dans sa voie, une voie à la
  // fois, sans se disperser sur les bonus ordinaires — sauf sur une voie
  // bouchée, qu'elle contourne. Un bonus rouge ou jaune à portée de capot reste
  // prioritaire : c'est ce qui prive le leader de ses armes, la mission
  // première de l'escouade.
  if (interceptTarget !== null) {
    const huntedWithinReach = pickups.some((pickup) => {
      if (!CITY_RUSH_POLICE_HUNT_TYPES.includes(pickup.type)) return false;
      const gap = Number(pickup.distance) - Number(distance);
      return Number.isFinite(gap) && gap > -3 && gap <= CITY_RUSH_POLICE_HUNT_RANGE;
    });
    const toward = interceptTarget > lane ? lane + 1 : interceptTarget < lane ? lane - 1 : lane;
    if (!huntedWithinReach && options.includes(toward)) return toward;
  }
  let bestLane = options.includes(lane) ? lane : options[0];
  let bestScore = -Infinity;

  for (const candidate of options) {
    let safetyScore = -Math.abs(candidate - lane) * 1.1;
    let greed = 0;
    for (const pickup of pickups) {
      const gap = Number(pickup.distance) - Number(distance);
      if (!Number.isFinite(gap) || gap < -3 || gap > lookAhead) continue;
      const pickupLane = clampCityRushLane(pickup.lane, laneCount);
      const laneAffinity = Math.max(0, 1 - Math.abs(pickupLane - candidate) * 0.4);
      if (laneAffinity === 0) continue;
      const urgency = 1 - gap / lookAhead;
      const hunted = CITY_RUSH_POLICE_HUNT_TYPES.includes(pickup.type);
      // Un bonus de tir vaut cinq bonus ordinaires : l'escouade traverse la
      // route pour le rafler avant le leader.
      greed += (hunted ? CITY_RUSH_POLICE_HUNT_WEIGHT : 1) * (24 + urgency * 10) * laneAffinity;
    }
    for (const zone of slowZones) {
      const gap = Number(zone.distance) - Number(distance);
      if (zone.lane !== candidate || !Number.isFinite(gap) || gap < -3 || gap > lookAhead) continue;
      safetyScore -= 5 + (1 - gap / lookAhead) * 11;
    }
    for (const vehicle of traffic) {
      const gap = Number(vehicle.distance) - Number(distance);
      if (vehicle.lane !== candidate || !Number.isFinite(gap) || gap < -3 || gap > lookAhead) continue;
      // Une vitesse négative signale un véhicule venant en face : la vitesse
      // de fermeture est alors la somme des deux vitesses.
      const vehicleSpeed = Math.max(-racerSpeed, Number(vehicle.speed) || 0);
      const closingSpeed = Math.max(1, racerSpeed - vehicleSpeed);
      const timeToReach = gap / closingSpeed;
      safetyScore -= timeToReach < 1.5 ? 24 : timeToReach < 3 ? 17 : timeToReach < 5.5 ? 10 : 4.5;
      // Embouteillage : une berline engluée derrière un véhicule lent cherche
      // activement à s'en extraire — elle ne se contente pas de le suivre.
      if (gap < CITY_RUSH_POLICE_BLOCK_RANGE) {
        safetyScore -= 26;
        if (stuck) greed -= CITY_RUSH_POLICE_ESCAPE_WEIGHT * (22 + (1 - gap / lookAhead) * 10);
      }
    }
    // Une voiture de course est solide : devant la berline, elle bouche la voie
    // comme un véhicule lent. Elle « compte à l'envers » dans la convoitise —
    // la berline aime mieux changer de voie que rester engluée derrière un
    // pilote qu'elle ne peut plus traverser, sauf si un bonus rouge ou jaune
    // traîne justement là. Derrière, un pilote ne gêne pas : c'est le barrage.
    for (const racer of racers) {
      const gap = Number(racer.distance) - Number(distance);
      if (racer.lane !== candidate || !Number.isFinite(gap) || gap <= 0 || gap > lookAhead) continue;
      greed -= (stuck ? CITY_RUSH_POLICE_ESCAPE_WEIGHT : 1.6) * (22 + (1 - gap / lookAhead) * 10);
    }
    // Couper la route au leader vaut trois bonus ordinaires : la berline se
    // rabat dans sa voie pour lui barrer la route. Un rouge ou un jaune reste
    // prioritaire (il vaut cinq bonus), et un barrage déjà en place se défend.
    if (interceptTarget !== null && candidate === interceptTarget) {
      const urgency = 1 - Math.max(0, interceptLead) / interceptLimit;
      greed += CITY_RUSH_POLICE_INTERCEPT_WEIGHT * (22 + urgency * 10);
    }
    // À défaut de bonus, une berline se rabat volontiers dans la voie du
    // leader ou dans sa voie d'entrée : les deux berlines encadrent la piste
    // au lieu de rouler en file indienne.
    const targetBonus = huntedLane !== null && candidate === huntedLane ? 3 : 0;
    const homeBonus = homeLane !== null && homeLane !== undefined && candidate === clampCityRushLane(homeLane, laneCount) ? 2.5 : 0;
    const score = greed * 100 + safetyScore + targetBonus + homeBonus;
    if (score > bestScore) {
      bestScore = score;
      bestLane = candidate;
    }
  }
  return bestLane;
}

// Les berlines de police sont des obstacles solides : elles ne traversent ni le
// trafic lent, ni les voitures de course (`racers`), ni leur coéquipière — et
// elles **bloquent** donc la voie comme n'importe quelle voiture, sans dégâts ni
// pénalité pour qui les percute.
//
// `blockedBy` désigne le véhicule de **trafic** qui a freiné la berline cette
// image (son `id`), ou `null` : le monde 3D s'en sert pour le heurter — sinon
// l'escouade resterait engluée derrière lui tandis que le leader s'envole (voir
// `applyTrafficImpact`). Une berline retenue par un pilote, elle, ne le heurte
// pas : c'est le barrage qui travaille.
export function resolveCityRushPoliceMovement(policeCars = [], traffic = [], minimumGap = CITY_RUSH_CAR_GAP, racers = []) {
  const safeGap = Math.max(0, Number(minimumGap) || 0);
  const list = Array.isArray(policeCars) ? policeCars : [];
  const trafficList = Array.isArray(traffic) ? traffic : [];
  const racerList = Array.isArray(racers) ? racers : [];
  const lateralX = (car) => (Number.isFinite(Number(car?.x)) ? Number(car.x) : Number(car?.currentX));
  const lateralWidth = (car) => (Number.isFinite(Number(car?.width)) ? Number(car.width) : 1.94);
  return list.map((car) => {
    const previousDistance = Number.isFinite(Number(car.distance)) ? Number(car.distance) : 0;
    const requestedDistance = Number.isFinite(Number(car.nextDistance)) ? Number(car.nextDistance) : previousDistance;
    let nextDistance = Math.max(previousDistance, requestedDistance);
    let blockedBy = null;
    const carX = lateralX(car);
    const carWidth = lateralWidth(car);
    const blockers = [...trafficList, ...racerList, ...list.filter((other) => other !== car)];
    for (const other of blockers) {
      // Le trafic et les pilotes sont déjà à leur position du jour ; entre
      // berlines, on vise la position demandée pour que la seconde ne colle
      // pas deux fois la distance de sécurité.
      const otherDistance = Number.isFinite(Number(other.nextDistance)) ? Number(other.nextDistance) : Number(other.distance);
      if (!Number.isFinite(otherDistance) || otherDistance <= previousDistance) continue;
      const sameLane = other.lane === car.lane;
      const otherX = lateralX(other);
      const lateralOverlap = Number.isFinite(otherX) && Number.isFinite(carX)
        && Math.abs(otherX - carX) < (carWidth + lateralWidth(other)) / 2;
      if (!sameLane && !lateralOverlap) continue;
      const limit = Math.max(previousDistance, otherDistance - safeGap);
      if (limit < nextDistance) {
        nextDistance = limit;
        // Seul le trafic lent est heurté pour se dégager : un pilote ou une
        // coéquipière ne se pousse pas.
        if (trafficList.includes(other)) blockedBy = other.id ?? null;
      }
    }
    return { ...car, previousDistance, nextDistance, blockedBy };
  });
}

// ── Mini-carte du circuit & focus joueur ────────────────────────────────────
// Projette une distance (en mètres sur la boucle de 600 m) et une voie (0..3)
// sur le tracé 2D de la mini-carte (repère 100 × 100 centré en 50, 50).
export function cityRushMinimapPoint(
  distance = 0,
  lane = 1,
  {
    lapLength = CITY_RUSH_LAP_LENGTH,
    laneCount = CITY_RUSH_LANE_X.length,
    laneSpacing = 1.45,
  } = {},
) {
  const safeDistance = Math.max(0, Number(distance) || 0);
  const safeLap = Math.max(1, Number(lapLength) || CITY_RUSH_LAP_LENGTH);
  const loopProgress = (((safeDistance % safeLap) + safeLap) % safeLap) / safeLap;
  const theta = Math.PI + loopProgress * Math.PI * 2;

  const rx = 32;
  const ry = 20;
  const centerX = 50 + rx * Math.cos(theta) - 1.8 * Math.cos(3 * theta);
  const centerY = 50 + ry * Math.sin(theta) + 1.4 * Math.sin(2 * theta);

  const dxdt = -rx * Math.sin(theta) + 5.4 * Math.sin(3 * theta);
  const dydt = ry * Math.cos(theta) + 2.8 * Math.cos(2 * theta);
  const norm = Math.hypot(dxdt, dydt) || 1;
  const tangentX = dxdt / norm;
  const tangentY = dydt / norm;
  const normalX = -tangentY;
  const normalY = tangentX;

  const clampedLane = clampCityRushLane(lane, laneCount);
  const laneOffset = (clampedLane - (laneCount - 1) / 2) * laneSpacing;
  const x = centerX + normalX * laneOffset;
  const y = centerY + normalY * laneOffset;
  const angle = Math.atan2(tangentY, tangentX);
  const deg = (angle * 180) / Math.PI;

  return {
    x,
    y,
    centerX,
    centerY,
    tangentX,
    tangentY,
    normalX,
    normalY,
    angle,
    deg,
    loopProgress,
    lane: clampedLane,
    laneOffset,
  };
}

export function cityRushMinimapTrackPath(steps = 72, { lapLength = CITY_RUSH_LAP_LENGTH } = {}) {
  const count = Math.max(12, Math.trunc(Number(steps) || 72));
  const commands = [];
  for (let index = 0; index < count; index += 1) {
    const distance = (index / count) * lapLength;
    const point = cityRushMinimapPoint(distance, 1.5, { lapLength, laneSpacing: 0 });
    commands.push(`${index === 0 ? 'M' : 'L'} ${point.centerX.toFixed(2)} ${point.centerY.toFixed(2)}`);
  }
  commands.push('Z');
  return commands.join(' ');
}

// Construit l'état complet de la mini-carte : position des 4 pilotes sur le
// circuit, avatars/pays distincts et focus caméra + télémétrie sur notre joueur.
export function buildCityRushMinimapState(
  racers = [],
  {
    playerId = 'player',
    cityId = 'vice-city',
    carId = CITY_RUSH_CARS[0].id,
    runId = 0,
    playerDriverId = null,
    lapLength = CITY_RUSH_LAP_LENGTH,
    laps = CITY_RUSH_LAPS,
    totalDistance = CITY_RUSH_DISTANCE,
    pursuers = [],
  } = {},
) {
  const defaultRoster = selectCityRushRacers({ cityId, carId, runId, playerDriverId });
  const incomingById = new Map((Array.isArray(racers) ? racers : []).map((racer) => [racer?.id, racer]));

  const merged = defaultRoster.map((slotProfile) => {
    const raw = incomingById.get(slotProfile.id) || {};
    const rawDistance = Number.isFinite(Number(raw.rawDistance))
      ? Math.max(0, Number(raw.rawDistance))
      : Math.max(0, Number(raw.distance) || 0);
    const distance = Math.max(0, Math.min(totalDistance, Math.round(rawDistance)));
    const lane = raw.lane !== undefined ? clampCityRushLane(raw.lane) : slotProfile.lane;
    const lap = raw.lap ? Math.max(1, Math.min(laps, Number(raw.lap))) : cityRushLapForDistance(rawDistance, lapLength, laps);
    const lapProgress = cityRushLapProgress(rawDistance, lapLength, laps);
    const progress = clamp01(rawDistance / Math.max(1, totalDistance));
    return {
      ...slotProfile,
      ...raw,
      id: slotProfile.id,
      isPlayer: slotProfile.id === playerId,
      driverId: raw.driverId || slotProfile.driverId,
      name: raw.name && raw.name !== 'TOI' ? raw.name : slotProfile.name,
      displayName: raw.displayName || slotProfile.displayName,
      country: raw.country || slotProfile.country,
      countryCode: raw.countryCode || slotProfile.countryCode,
      flag: raw.flag || slotProfile.flag,
      accent: raw.accent || slotProfile.accent,
      avatar: raw.avatar || slotProfile.avatar,
      rawDistance,
      distance,
      lane,
      lap,
      lapProgress,
      progress,
    };
  });

  const ranked = rankCityRushRacers(
    merged.map((racer) => ({ ...racer, distance: racer.rawDistance })),
    playerId,
  );

  const playerEntry = ranked.ordered.find((racer) => racer.id === playerId) || ranked.ordered[0];
  const playerPoint = cityRushMinimapPoint(playerEntry.rawDistance, playerEntry.lane, { lapLength });

  const enriched = ranked.ordered.map((racer, index) => {
    const point = cityRushMinimapPoint(racer.rawDistance, racer.lane, { lapLength });
    const isPlayer = racer.id === playerId;
    const relativeDistance = Math.round(racer.rawDistance - playerEntry.rawDistance);
    const loopGap = Math.round(cityRushTrackGap(racer.rawDistance, playerEntry.rawDistance, lapLength));
    return {
      ...racer,
      rank: index + 1,
      isPlayer,
      isFocused: isPlayer,
      x: point.x,
      y: point.y,
      centerX: point.centerX,
      centerY: point.centerY,
      angle: point.angle,
      deg: point.deg,
      loopProgress: point.loopProgress,
      focusX: point.x - playerPoint.x,
      focusY: point.y - playerPoint.y,
      relativeDistance,
      loopGap,
    };
  });

  const focusedPlayer = enriched.find((racer) => racer.isPlayer) || enriched[0];
  // La caméra de la mini-carte suit notre joueur (focus) tout en gardant
  // l'intégralité de la boucle et les 3 rivaux dans le cadre.
  const cameraX = 50 + (focusedPlayer.x - 50) * 0.32;
  const cameraY = 50 + (focusedPlayer.y - 50) * 0.32;
  const viewWidth = 96;
  const viewHeight = 72;
  const viewMinX = cameraX - viewWidth / 2;
  const viewMinY = cameraY - viewHeight / 2;
  const viewBox = `${viewMinX.toFixed(2)} ${viewMinY.toFixed(2)} ${viewWidth} ${viewHeight}`;

  // Les marqueurs placent notre joueur en dernier pour qu'il reste au premier plan.
  const markers = [
    ...enriched.filter((racer) => !racer.isPlayer),
    ...enriched.filter((racer) => racer.isPlayer),
  ];

  // L'escouade de police n'est pas classée : elle est projetée à part, pour
  // que la mini-carte puisse la montrer sans la mêler aux quatre pilotes.
  const pursued = (Array.isArray(pursuers) ? pursuers : [])
    .filter((police) => police && police.active !== false)
    .map((police, index) => {
      const distance = Math.max(0, Math.min(totalDistance, Number(police.distance) || 0));
      const lane = clampCityRushLane(police.lane);
      const point = cityRushMinimapPoint(distance, lane, { lapLength });
      return {
        id: police.id || `police-${index}`,
        name: police.name || 'POLICE',
        // `blocking` permet à la mini-carte de signaler un barrage roulant,
        // `rallied` de distinguer la police du trafic rappelée par un contact
        // des berlines d'interception du dernier tour.
        mode: police.mode || null,
        blocking: Boolean(police.blocking) || police.mode === 'blockade',
        rallied: Boolean(police.rallied),
        // Barre de vie : la mini-carte la dessine sous la pastille.
        health: Number.isFinite(Number(police.health)) ? Number(police.health) : null,
        maxHealth: Number.isFinite(Number(police.maxHealth)) ? Number(police.maxHealth) : null,
        distance: Math.round(distance),
        lane,
        x: point.x,
        y: point.y,
        centerX: point.centerX,
        centerY: point.centerY,
        angle: point.angle,
        deg: point.deg,
        loopProgress: point.loopProgress,
        relativeDistance: Math.round(distance - playerEntry.rawDistance),
        loopGap: Math.round(cityRushTrackGap(distance, playerEntry.rawDistance, lapLength)),
      };
    });

  return {
    viewBox,
    focus: {
      id: focusedPlayer.id,
      isPlayer: true,
      isFocused: true,
      driverId: focusedPlayer.driverId,
      avatarId: focusedPlayer.avatar?.id || focusedPlayer.avatarId,
      name: focusedPlayer.name,
      displayName: focusedPlayer.displayName,
      country: focusedPlayer.country,
      countryCode: focusedPlayer.countryCode,
      flag: focusedPlayer.flag,
      avatar: focusedPlayer.avatar,
      accent: focusedPlayer.accent,
      x: focusedPlayer.x,
      y: focusedPlayer.y,
      point: { x: focusedPlayer.x, y: focusedPlayer.y },
      angle: focusedPlayer.angle,
      deg: focusedPlayer.deg,
      distance: focusedPlayer.distance,
      rawDistance: focusedPlayer.rawDistance,
      relativeDistance: 0,
      lap: focusedPlayer.lap,
      lapProgress: focusedPlayer.lapProgress,
      lane: focusedPlayer.lane,
      rank: focusedPlayer.rank,
      cameraX,
      cameraY,
      viewBox,
    },
    racers: enriched,
    markers,
    pursuers: pursued,
    startLine: cityRushMinimapPoint(0, 1.5, { lapLength, laneSpacing: 0 }),
    midGate: cityRushMinimapPoint(lapLength / 2, 1.5, { lapLength, laneSpacing: 0 }),
  };
}

