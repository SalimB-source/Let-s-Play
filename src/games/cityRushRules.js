// Règles pures de Vice City Rush : séparées du rendu Three.js pour garder
// les durées, les voies et la génération de rue faciles à vérifier.
//
// La course se joue en circuit : plusieurs tours d'une boucle de 600 m. Le
// décor est généré une fois pour la boucle et se répète, si bien que l'on
// repasse sous le portique de départ (tribunes, feux, ligne à damier) à chaque
// tour.
//
// **Le dernier tour est plus long que les autres** : il enchaîne
// `CITY_RUSH_FINAL_LAP_LOOPS` boucles (deux, soit 1 200 m) au lieu d'une. Le
// portique est fixe dans le décor : on le recroise donc en cours de dernier
// tour (à mi-parcours avec deux boucles). Ce passage n'est qu'un point de
// passage (`'checkpoint'`, voir `cityRushLineKind`) — il ne lance aucun tour —
// et seule la ligne qui clôt la dernière boucle est l'arrivée. Rien d'autre ne
// change : le décor reste une boucle de 600 m, seule la distance à parcourir
// s'allonge.
export const CITY_RUSH_LAPS = 5; // nombre de tours par défaut (les modes de jeu fixent le leur)
export const CITY_RUSH_LAP_LENGTH = 600;
export const CITY_RUSH_FINAL_LAP_LOOPS = 2; // le dernier tour fait deux fois la boucle
// Mode Sprint : course à checkpoints, sans police, bonus ni armes. Dix
// checkpoints tous les 300 m (une demi-boucle) : le dixième est l'arrivée,
// pile sous le portique. Chaque checkpoint rend 15 s au chrono ; à zéro, la
// course est perdue.
export const CITY_RUSH_SPRINT_CHECKPOINTS = 10;
export const CITY_RUSH_SPRINT_CHECKPOINT_SPACING = 300;
export const CITY_RUSH_SPRINT_CHECKPOINT_TIME = 15;
export const CITY_RUSH_SPRINT_DISTANCE = CITY_RUSH_SPRINT_CHECKPOINTS * CITY_RUSH_SPRINT_CHECKPOINT_SPACING;
// Nombre de checkpoints franchis pour une distance parcourue (0 … 10).
export function cityRushSprintCheckpointsPassed(distance, spacing = CITY_RUSH_SPRINT_CHECKPOINT_SPACING, count = CITY_RUSH_SPRINT_CHECKPOINTS) {
  const safeSpacing = Math.max(1, Number(spacing) || CITY_RUSH_SPRINT_CHECKPOINT_SPACING);
  return Math.max(0, Math.min(count, Math.floor((Number(distance) || 0) / safeSpacing)));
}
export const CITY_RUSH_FINAL_LAP_LENGTH = CITY_RUSH_LAP_LENGTH * CITY_RUSH_FINAL_LAP_LOOPS;
// Distance de la course par défaut (`CITY_RUSH_LAPS` tours, dernier tour long).
export const CITY_RUSH_DISTANCE = cityRushRaceDistance();
// La ligne peinte est dessinée quelques mètres devant le centre de la voiture
// pour que les capots s'alignent sur le damier au départ.
export const CITY_RUSH_START_LINE_LEAD = 3;
// Portée de décor conservée derrière le joueur quand on replie la boucle.
export const CITY_RUSH_TRACK_BEHIND = 60;
export const CITY_RUSH_PLAYER_SPEED = 35; // m/s : rythme de course relevé à environ 126 km/h
export const CITY_RUSH_LANE_WIDTH = 2.1;
export const CITY_RUSH_ROAD_WIDTH = 13.4;
export const CITY_RUSH_ROAD_HALF_WIDTH = CITY_RUSH_ROAD_WIDTH / 2;
// Six voies au total : trois en sens inverse à gauche, trois dans le sens de
// la course à droite. Les voies ajoutées restent au même espacement de 2,1 m.
export const CITY_RUSH_LANE_X = Object.freeze([-5.25, -3.15, -1.05, 1.05, 3.15, 5.25]);
export const CITY_RUSH_LANES_PER_DIRECTION = 3;
export const CITY_RUSH_ONCOMING_LANES = Object.freeze(
  Array.from({ length: CITY_RUSH_LANES_PER_DIRECTION }, (_, lane) => lane),
);
export const CITY_RUSH_FORWARD_LANES = Object.freeze(
  Array.from({ length: CITY_RUSH_LANES_PER_DIRECTION }, (_, lane) => lane + CITY_RUSH_LANES_PER_DIRECTION),
);
// Le joueur part au milieu des voies de course, avec ses deux rivaux de part
// et d'autre pour que la nouvelle chaussée soit visible dès le départ.
export const CITY_RUSH_DEFAULT_LANES = Object.freeze([
  CITY_RUSH_LANES_PER_DIRECTION + 1,
  CITY_RUSH_LANE_X.length - 1,
  CITY_RUSH_LANES_PER_DIRECTION,
]);
export const CITY_RUSH_SCROLL_SCALE = 0.72;
// La simulation reste volontairement sur une ligne (les voies, collisions et
// bonus sont ainsi déterministes), mais le rendu suit cette ligne centrale :
// deux grands S très doux donnent de vrais virages visuels sans transformer
// chaque changement de voie en dérapage. Le déport reste proche d'une voie et
// le raccord départ/arrivée est parfaitement plat.
export const CITY_RUSH_TURN_AMPLITUDE = 2.35;
// Relief volontairement modéré : suffisamment ample pour lire une montée ou
// une descente à l'horizon, sans masquer le trafic ni gêner les changements de
// voie. Comme les virages, il se raccorde à plat au portique.
export const CITY_RUSH_HILL_AMPLITUDE = 2.1;
export const CITY_RUSH_CAR_GAP = 4.8;
export const CITY_RUSH_RACER_VIEW_DISTANCE = 120; // m : portée avant où un rival est rendu à l'écran
export const CITY_RUSH_BLUE_SHOT_DURATION = 1.8; // s : ralentissement bien visible après un tir bleu
export const CITY_RUSH_BLUE_SHOT_SPEED_FACTOR = 0.55; // la cible ne garde que 55 % de sa vitesse
export const CITY_RUSH_TRACK_BOOST_DURATION = 3; // s : durée du turbo ramassé au sol
export const CITY_RUSH_TRACK_BOOST_SPEED_FACTOR = 1.46; // × vitesse du joueur sous un pad turbo
export const CITY_RUSH_RIVAL_BOOST_SPEED_FACTOR = 1.38; // × vitesse des rivaux sous un pad turbo
export const CITY_RUSH_TRACK_BOOST_PICKUP_CHANCE = 0.55; // part des bonus qui sont des pads turbo au sol
export const CITY_RUSH_AI_TRACK_BOOST_WEIGHT = 3; // un pad turbo pèse trois bonus d'inventaire pour les rivaux
export const CITY_RUSH_TRACK_BOOST_COLOR = '#50e48a';
export const CITY_RUSH_ONCOMING_MAX_WIDTH = 2.12;
export const CITY_RUSH_ONCOMING_EDGE_MARGIN = 0.3;
export const CITY_RUSH_ONCOMING_SAFE_OUTER_X = -(
  CITY_RUSH_ROAD_HALF_WIDTH
  - CITY_RUSH_ONCOMING_MAX_WIDTH / 2
  - CITY_RUSH_ONCOMING_EDGE_MARGIN
);
export const CITY_RUSH_ONCOMING_EJECT_DURATION = 0.72; // s : la voiture heurtée dérape sans quitter la chaussée

export function cityRushOncomingImpactX(startX, elapsed, vehicleWidth = CITY_RUSH_ONCOMING_MAX_WIDTH) {
  const start = Number.isFinite(Number(startX)) ? Number(startX) : CITY_RUSH_LANE_X[0];
  const width = Number.isFinite(Number(vehicleWidth)) && Number(vehicleWidth) > 0
    ? Number(vehicleWidth)
    : CITY_RUSH_ONCOMING_MAX_WIDTH;
  const age = Math.max(0, Number(elapsed) || 0);
  const progress = Math.max(0, Math.min(1, age / CITY_RUSH_ONCOMING_EJECT_DURATION));
  const eased = 1 - (1 - progress) ** 3;
  const safeOuterX = Math.max(
    CITY_RUSH_ONCOMING_SAFE_OUTER_X,
    -(CITY_RUSH_ROAD_HALF_WIDTH - width / 2 - CITY_RUSH_ONCOMING_EDGE_MARGIN),
  );
  // Le choc la décale d'une voie au maximum et la retient avant le bord,
  // en tenant compte de la largeur réelle du véhicule.
  const targetX = Math.max(safeOuterX, start - CITY_RUSH_LANE_WIDTH);
  return start + (targetX - start) * eased;
}

export const CITY_RUSH_BLUE_SHOT_MAX_RANGE = CITY_RUSH_RACER_VIEW_DISTANCE;
export const CITY_RUSH_BLUE_SHOT_PROJECTILE_SPEED = 300; // m/s : projectile droit, sans guidage
export const CITY_RUSH_BLUE_SHOT_MIN_GAP = 2; // m : le canon doit avoir la place de tirer devant le capot

// Huit voitures aux silhouettes et compromis de conduite distincts. La compacte
// de départ est une citadine 5 portes inspirée des petites françaises des
// années 90 : aucun emblème ni logo de constructeur n'est modélisé.
export const CITY_RUSH_CARS = Object.freeze([
  Object.freeze({
    id: 'city-hatch', archetype: 'city-hatch', name: 'MISTRAL 1.4', className: 'CITADINE 5 PORTES · PREMIER VOLANT',
    bodyColor: 0x21b895, trimColor: 0xd7fff4, driverColor: 0x1e222d, accent: '#48edc2', price: 0,
    power: 36, powerMultiplier: 0.78, acceleration: 42, accelerationRate: 6.8, recovery: 44, hitRecoveryMultiplier: 1.12,
    widthScale: 0.91, heightScale: 0.98, lengthScale: 0.9,
  }),
  Object.freeze({
    id: 'nova-18-gt', archetype: 'nova-hatch', name: 'NOVA 1.8 GT', className: 'COMPACTE 5 PORTES · GT ROUTIÈRE',
    bodyColor: 0x71899c, trimColor: 0xd4e0e8, driverColor: 0x1d232d, accent: '#9bc7df', price: 120,
    power: 51, powerMultiplier: 0.84, acceleration: 56, accelerationRate: 7.7, recovery: 62, hitRecoveryMultiplier: 1.04,
    widthScale: 0.93, heightScale: 0.98, lengthScale: 0.93,
  }),
  Object.freeze({
    id: 'night-comet', archetype: 'volkswagen', name: 'WOLFSBURG GT-R', className: 'COMPACTE TURBO · HOT HATCH SPORT',
    bodyColor: 0x2244c8, trimColor: 0xff2a4b, driverColor: 0x1f2433, accent: '#818cf8', price: 250,
    power: 78, powerMultiplier: 0.98, acceleration: 87, accelerationRate: 9.5, recovery: 94, hitRecoveryMultiplier: 0.88,
    widthScale: 0.94, heightScale: 0.95, lengthScale: 0.94,
  }),
  Object.freeze({
    id: 'vice-roadster', archetype: 'ferrari', name: 'CAVALLO F8 GTB', className: 'BERLINETTA V8 · BI-TURBO ITALIENNE',
    bodyColor: 0xd91424, trimColor: 0xffd000, driverColor: 0x1e222d, accent: '#ef233c', price: 400,
    power: 82, powerMultiplier: 1, acceleration: 83, accelerationRate: 9.1, recovery: 82, hitRecoveryMultiplier: 0.96,
    widthScale: 1, heightScale: 1, lengthScale: 1,
  }),
  Object.freeze({
    id: 'turbo-gt', archetype: 'porsche', name: 'KRONOS 930 TURBO', className: 'FLAT-SIX BI-TURBO · COUPÉ SPORT',
    bodyColor: 0xcfd8e3, trimColor: 0xe63946, driverColor: 0x1a202c, accent: '#38bdf8', price: 550,
    power: 94, powerMultiplier: 1.04, acceleration: 72, accelerationRate: 8.6, recovery: 74, hitRecoveryMultiplier: 1.06,
    widthScale: 1.02, heightScale: 0.95, lengthScale: 1.08,
  }),
  Object.freeze({
    id: 'muscle-86', archetype: 'audi', name: 'VORTEX RS-10', className: 'SUPERCAR V10 · TRANSMISSION INTÉGRALE',
    bodyColor: 0x1e64c8, trimColor: 0xd8e2ec, driverColor: 0x1c2430, accent: '#60a5fa', price: 650,
    power: 88, powerMultiplier: 1.02, acceleration: 95, accelerationRate: 9.8, recovery: 70, hitRecoveryMultiplier: 1.08,
    widthScale: 1.07, heightScale: 1.03, lengthScale: 1.08,
  }),
  Object.freeze({
    id: 'vega-gt-67', archetype: 'bmw', name: 'BAVARIA M-CS', className: 'COUPÉ MOTORSPORT · ÉDITION NICO',
    bodyColor: 0x11131a, trimColor: 0x38bdf8, liveryColor: 0xc62232, driverColor: 0x181c26, accent: '#e04455', price: 800,
    power: 91, powerMultiplier: 1.03, acceleration: 85, accelerationRate: 9.3, recovery: 76, hitRecoveryMultiplier: 1.0,
    widthScale: 1.08, heightScale: 1.02, lengthScale: 1.1,
  }),
  Object.freeze({
    id: 'toro-v12', archetype: 'lamborghini', name: 'TEMPESTA LP-780', className: 'SUPERCAR V12 · PROFIL EN COIN',
    bodyColor: 0xffaa00, trimColor: 0x14161f, driverColor: 0x1b1d26, accent: '#ffb703', price: 1000,
    power: 93, powerMultiplier: 1.035, acceleration: 90, accelerationRate: 9.6, recovery: 72, hitRecoveryMultiplier: 1.07,
    widthScale: 1.06, heightScale: 0.92, lengthScale: 1.09,
  }),
]);

// Le trafic d'obstacle roule nettement moins vite que les voitures de course.
// La route est à double sens : les trois voies de droite vont dans le sens de
// la course, les trois voies de gauche accueillent le trafic venant en face.
// Trafic allégé pour laisser respirer la course (demande : moins de trafic).
export const CITY_RUSH_TRAFFIC_COUNT = 8;
export const CITY_RUSH_TRAFFIC_LANES = Object.freeze(
  Array.from({ length: CITY_RUSH_TRAFFIC_COUNT }, (_, index) => CITY_RUSH_FORWARD_LANES[index % CITY_RUSH_FORWARD_LANES.length]),
);

// Trafic venant en face : les véhicules des trois voies de gauche roulent vers
// le joueur, croisent la course, puis reparaissent au loin une fois passés.
// Réduit aussi pour éviter l'effet embouteillage, mais avec collision solide.
export const CITY_RUSH_ONCOMING_COUNT = 3;
export const CITY_RUSH_TRAFFIC_TYPES = Object.freeze([
  Object.freeze({ id: 'police', name: 'Voiture de police', speed: 6.4, width: 1.94, length: 3.8 }),
  Object.freeze({ id: 'ambulance', name: 'Ambulance', speed: 5.3, width: 1.98, length: 4.0 }),
  Object.freeze({ id: 'garbage-truck', name: 'Camion-poubelle', speed: 4.4, width: CITY_RUSH_ONCOMING_MAX_WIDTH, length: 4.6 }),
  Object.freeze({ id: 'white-lambo', name: 'Tempesta V12 blanche', speed: 7.2, width: 1.92, length: 3.8 }),
]);

// Un choc avec le trafic ne retire pas de vie : il crée un court moment de
// contact lisible, puis le véhicule lent se rabat pour libérer la voie. La
// durée est volontairement indépendante du modèle de voiture choisi : le
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

// ── Stabilité de voie : écart coûteux, ligne propre récompensée ─────────────
// Changer de voie fait glisser la voiture latéralement : elle ralentit
// légèrement pendant un court instant. À l'inverse, tenir sa voie sans bouger
// charge progressivement un bonus de vitesse « ligne propre », perdu dès le
// prochain changement de voie.
export const CITY_RUSH_LANE_CHANGE_SLOW_DURATION = 0.8; // s : léger coup de frein après un changement de voie
export const CITY_RUSH_LANE_CHANGE_SLOW_FACTOR = 0.9; // la voiture ne garde que 90 % de sa vitesse
export const CITY_RUSH_CLEAN_LINE_RAMP_DURATION = 3.5; // s de voie tenue pour charger le bonus au maximum
export const CITY_RUSH_CLEAN_LINE_MAX_BONUS = 1.12; // × vitesse au bout d'une voie tenue longtemps

export function cityRushCleanLineFactor(cleanLineTime) {
  const held = Math.max(0, Number(cleanLineTime) || 0);
  if (CITY_RUSH_CLEAN_LINE_RAMP_DURATION <= 0) return CITY_RUSH_CLEAN_LINE_MAX_BONUS;
  const progress = Math.min(1, held / CITY_RUSH_CLEAN_LINE_RAMP_DURATION);
  return 1 + (CITY_RUSH_CLEAN_LINE_MAX_BONUS - 1) * progress;
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
// Toupie du tir rouge : la voiture adverse continue d'avancer, mais plus
// lentement, pendant qu'elle tourne sur elle-même.
export const CITY_RUSH_PISTOL_SPIN_TURNS = 2;

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
  RADIO: 'radio',
});

// Le turbo n'est plus un pouvoir à charger : c'est un pad lumineux au sol.
export const CITY_RUSH_PICKUPS = Object.freeze({ BOOST: 'boost' });

// La mitrailleuse rouge se charge avec un seul bonus. Les anciens coûts bleu
// et jaune restent définis pour les règles héritées, mais ces bonus ne sont
// plus générés ni proposés dans Vice City Rush.
export const CITY_RUSH_POWER_CHARGE_COST = Object.freeze({
  [CITY_RUSH_POWERS.BLUE_SHOT]: 1,
  [CITY_RUSH_POWERS.PISTOL]: 1, // rouge · une rafale
  [CITY_RUSH_POWERS.RADIO]: 4,
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
    description: `Un seul bonus bleu suffit pour charger ce tir droit, sans viser : il touche au plus un adversaire sur ta voie et dans ton champ de vision. La voiture touchée perd près de la moitié de sa vitesse pendant ${CITY_RUSH_BLUE_SHOT_DURATION} s, avec un dérapage bien visible. Trois tirs bleus détruisent une berline de police.`,
    duration: CITY_RUSH_BLUE_SHOT_DURATION,
    speedFactor: CITY_RUSH_BLUE_SHOT_SPEED_FACTOR,
  }),
  [CITY_RUSH_POWERS.PISTOL]: Object.freeze({
    id: CITY_RUSH_POWERS.PISTOL,
    name: 'AK-47',
    shortName: 'AK-47',
    chargeCost: CITY_RUSH_POWER_CHARGE_COST[CITY_RUSH_POWERS.PISTOL],
    color: '#ff526e',
    key: 'Z',
    automatic: false,
    description: 'Un seul bonus rouge charge l’AK-47. Le tir part tout droit, sans viser : il touche le premier ennemi sur ta voie. La voiture adverse part en toupie tout en ralentissant. Contre une voiture de police, un tir rouge ou un carambolage enlève la moitié de sa vie : deux impacts la détruisent.',
    duration: 2,
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

// ── Shuto Expressway Route 1 · la C1 都心環状線 ──────────────────────────────
// La course de Tokyo n'est plus une avenue de Shibuya : c'est l'anneau
// intérieur réel de la Shuto Expressway — 14,8 km de viaduc et de tunnels qui
// ceignent le palais impérial, sans un seul feu rouge, limite à 50 km/h et
// changements de voie interdits sur la plus grande partie du tour.
//
// Départ et arrivée au-dessus de 日本橋 (Nihonbashi), le kilomètre zéro du
// réseau routier japonais, comme sur la vraie route : c'est aussi le point où
// l'Asian Highway 1 commence.
//
// Le sens retenu est 内回り (uchi-mawari, l'anneau intérieur, antihoraire) :
// le palais impérial reste donc toujours à GAUCHE, la ville, la baie et la
// Tokyo Tower à DROITE ou à gauche selon le secteur — les `side` ci-dessous
// suivent la géographie réelle. La boucle de 600 m du jeu est une réduction
// fidèle du tour : `km` est le point kilométrique officiel compté depuis
// Nihonbashi (il décroît en 内回り) et `from`/`to` donnent la position sur le
// tour du jeu (0 → 1), calculée par `shutoC1At` pour que panneaux, tunnels,
// échangeurs et monuments tombent exactement au bon endroit à chaque tour.
export const SHUTO_C1_LENGTH_KM = 14.8;

/** Position sur le tour (0 → 1) d'un point kilométrique officiel, en 内回り. */
export function shutoC1At(km, lengthKm = SHUTO_C1_LENGTH_KM) {
  const safeLength = Number.isFinite(Number(lengthKm)) && Number(lengthKm) > 0 ? Number(lengthKm) : SHUTO_C1_LENGTH_KM;
  const safeKm = Number.isFinite(Number(km)) ? Number(km) : 0;
  return (((safeLength - safeKm) % safeLength) + safeLength) % safeLength / safeLength;
}

/** Point kilométrique officiel (depuis 日本橋) d'une position sur le tour. */
export function shutoC1KmAt(lapProgress, lengthKm = SHUTO_C1_LENGTH_KM) {
  const safeLength = Number.isFinite(Number(lengthKm)) && Number(lengthKm) > 0 ? Number(lengthKm) : SHUTO_C1_LENGTH_KM;
  const progress = clamp01(Number(lapProgress) || 0);
  const km = safeLength * (1 - progress);
  return km >= safeLength ? 0 : Number(km.toFixed(1));
}

const shutoSector = (id, fromKm, toKm, data) => Object.freeze({
  id,
  km: fromKm,
  kmEnd: toKm,
  // En 内回り le kilométrage officiel décroît : `fromKm` est donc le début du
  // secteur sur le tour et `toKm` sa fin (0 pour le dernier, qui se referme
  // sur la ligne de 日本橋).
  from: shutoC1At(fromKm),
  to: shutoC1At(toKm),
  ...data,
});

export const CITY_RUSH_SHUTO_C1 = Object.freeze({
  id: 'shuto-c1',
  marker: 'C1',
  name: 'SHUTO EXPRESSWAY ROUTE 1',
  japanese: '首都高速 都心環状線',
  romaji: 'SHUTO KOSOKU TOSHIN KANJO-SEN',
  direction: '内回り',
  directionRomaji: 'UCHI-MAWARI',
  lengthKm: SHUTO_C1_LENGTH_KM,
  speedLimit: 50,
  opened: 1967,
  lanes: 3,
  origin: Object.freeze({ name: '日本橋', romaji: 'NIHONBASHI', note: 'km 0 · 道路元標 · AH1' }),
  // Secteurs contigus, dans l'ordre de la course (内回り) : leur union couvre
  // exactement un tour, ce qui permet au décor comme au HUD de savoir où l'on
  // se trouve sans ambiguïté. `side` est le côté réel du repère (+1 à droite,
  // -1 à gauche) pour un pilote qui roule en 内回り.
  sectors: Object.freeze([
    shutoSector('edobashi', 14.8, 14.1, {
      kind: 'origin', name: '日本橋', romaji: 'NIHONBASHI · EDOBASHI JCT',
      note: 'km 0 · 道路元標 · origine de l’AH1',
      sign: Object.freeze({ route: 'C1', lines: Object.freeze(['都心環状 内回り', '江戸橋JCT']), exits: Object.freeze(['1号上野線', '6号向島線', 'B 湾岸線']) }),
      river: '日本橋川',
    }),
    shutoSector('kandabashi', 14.1, 13.2, {
      kind: 'junction', name: '神田橋', romaji: 'KANDABASHI JCT',
      note: '八重洲線 · sortie 29 · pont sur la Kanda',
      sign: Object.freeze({ route: 'C1', lines: Object.freeze(['神田橋JCT', '八重洲線']), exits: Object.freeze(['八重洲線', '29 神田橋']) }),
      river: '神田川', side: 1,
    }),
    shutoSector('takebashi', 13.2, 12.0, {
      kind: 'junction', name: '竹橋JCT', romaji: 'TAKEBASHI JCT',
      note: '5号池袋線 · la grande courbe de la Kanda',
      sign: Object.freeze({ route: 'C1', lines: Object.freeze(['竹橋JCT', '5号池袋線']), exits: Object.freeze(['5号池袋線 北池袋', '26 北の丸出口']), arrow: '↖' }),
      curve: 'sweeper', river: '神田川', wall: true,
    }),
    shutoSector('kitanomaru', 12.0, 11.0, {
      kind: 'tunnel', name: '北の丸トンネル', romaji: 'KITANOMARU TUNNEL',
      note: '700 m sous le parc de Kitanomaru · sortie 26',
      tunnel: Object.freeze({ name: '北の丸トンネル', romaji: 'KITANOMARU TUNNEL', lengthM: 700, lights: 'sodium' }),
      sign: Object.freeze({ route: 'C1', lines: Object.freeze(['北の丸トンネル', '700 m']), exits: Object.freeze(['26 北の丸出口']), hazard: true }),
      // Le palais impérial reste à l'intérieur de l'anneau : en 内回り il
      // borde donc la gauche de la piste.
      palace: true, side: -1,
    }),
    shutoSector('chiyoda', 11.0, 9.1, {
      kind: 'tunnel', name: '千代田トンネル', romaji: 'CHIYODA TUNNEL',
      note: '1 900 m : le plus long du tour, sous les jardins du palais',
      tunnel: Object.freeze({ name: '千代田トンネル', romaji: 'CHIYODA TUNNEL', lengthM: 1900, lights: 'sodium', junction: '三宅坂JCT · 4号新宿線' }),
      sign: Object.freeze({ route: 'C1', lines: Object.freeze(['千代田トンネル', '1900 m']), exits: Object.freeze(['三宅坂JCT', '4号新宿線 新宿']), hazard: true }),
      palace: true, side: -1, longest: true,
    }),
    shutoSector('kasumigaseki', 9.1, 7.2, {
      kind: 'cut', name: '霞が関', romaji: 'KASUMIGASEKI',
      note: 'tranchée ouverte · sortie 23/24 · 谷町JCT 3号渋谷線',
      cut: Object.freeze({ name: '霞が関 掘割', depthM: 6 }),
      sign: Object.freeze({ route: 'C1', lines: Object.freeze(['谷町JCT', '3号渋谷線 東名']), exits: Object.freeze(['24 霞が関出口', '日比谷 · 六本木']), arrow: '↗' }),
      palace: true, side: -1, gate: true,
    }),
    shutoSector('iikura', 7.2, 6.6, {
      kind: 'viaduct', name: '飯倉', romaji: 'IIKURA',
      note: 'sortie 21 ETC · 一ノ橋JCT 2号目黒線 · murs antibruit d’Azabu',
      sign: Object.freeze({ route: 'C1', lines: Object.freeze(['一ノ橋JCT', '2号目黒線']), exits: Object.freeze(['21 飯倉', '六本木 · 麻布十番']) }),
      wall: true,
    }),
    shutoSector('shibakoen', 6.6, 5.0, {
      kind: 'landmark', name: '芝公園', romaji: 'SHIBA-KŌEN',
      note: 'la Tokyo Tower passe au ras du viaduc, à gauche',
      // km 5,4 officiel (sorties 19/20 芝公園) : la tour se dresse à gauche,
      // au ras du viaduc, exactement comme sur l'内回り réel.
      landmark: Object.freeze({ id: 'tokyo-tower', name: '東京タワー', romaji: 'TOKYO TOWER', side: -1, km: 5.4, at: 0.635 }),
      sign: Object.freeze({ route: 'C1', lines: Object.freeze(['芝公園', '東京タワー']), exits: Object.freeze(['19/20 芝公園', '増上寺 · 東京タワー']) }),
    }),
    shutoSector('hamazakibashi', 5.0, 3.6, {
      kind: 'junction', name: '浜崎橋JCT', romaji: 'HAMAZAKIBASHI JCT',
      note: '1号羽田線 · le Rainbow Bridge et la Wangan à droite',
      sign: Object.freeze({ route: 'C1', lines: Object.freeze(['浜崎橋JCT', '1号羽田線 羽田']), exits: Object.freeze(['B 湾岸線 千葉', '11 台場 レインボーブリッジ']), arrow: '↗' }),
      // km 4,3 officiel : le pont suspendu s'ouvre à droite, vers la baie et
      // la Wangan, au moment où la 11号台場線 quitte l'anneau.
      landmark: Object.freeze({ id: 'rainbow-bridge', name: 'レインボーブリッジ', romaji: 'RAINBOW BRIDGE', side: 1, km: 4.3, at: 0.709 }),
      bay: true,
    }),
    shutoSector('shiodome-jct', 3.6, 3.2, {
      kind: 'junction', name: '汐留JCT', romaji: 'SHIODOME JCT',
      note: '八重洲線 · Tokyo Station',
      sign: Object.freeze({ route: 'C1', lines: Object.freeze(['汐留JCT', '八重洲線']), exits: Object.freeze(['18 汐留', '東京駅 · 新橋']) }),
    }),
    shutoSector('shiodome-tunnel', 3.2, 2.5, {
      kind: 'tunnel', name: '汐留トンネル', romaji: 'SHIODOME TUNNEL',
      note: '700 m entre 汐留 et 銀座, juste sous les tours',
      tunnel: Object.freeze({ name: '汐留トンネル', romaji: 'SHIODOME TUNNEL', lengthM: 700, lights: 'led' }),
      sign: Object.freeze({ route: 'C1', lines: Object.freeze(['汐留トンネル', '700 m']), hazard: true }),
    }),
    shutoSector('ginza', 2.5, 1.9, {
      kind: 'neon', name: '銀座', romaji: 'GINZA',
      note: 'néons de Ginza à gauche, sortie 15/16',
      sign: Object.freeze({ route: 'C1', lines: Object.freeze(['銀座', 'GINZA']), exits: Object.freeze(['15/16 銀座', '銀座通り · 数寄屋橋']) }),
      neon: Object.freeze({ side: -1 }),
    }),
    shutoSector('shintomicho', 1.9, 1.3, {
      kind: 'pillars', name: '新富町 · 築地川', romaji: 'SHINTOMICHŌ',
      note: 'l’ancienne rivière Tsukiji : les piles passent entre les voies',
      sign: Object.freeze({ route: 'C1', lines: Object.freeze(['京橋JCT', '東京高速道路']), exits: Object.freeze(['13/14 新富町', '車線変更禁止']), hazard: true }),
      pillars: true, wall: true,
    }),
    shutoSector('kyobashi', 1.3, 0.6, {
      kind: 'junction', name: '京橋JCT', romaji: 'KYŌBASHI JCT',
      note: 'Tokyo Expressway (KK線) · Marunouchi à gauche',
      sign: Object.freeze({ route: 'C1', lines: Object.freeze(['京橋JCT', '東京高速道路 KK線']), exits: Object.freeze(['12 京橋', '東銀座']) }),
      wall: true,
    }),
    shutoSector('takaracho', 0.6, 0.0, {
      kind: 'viaduct', name: '宝町', romaji: 'TAKARACHŌ',
      note: 'sortie 11 · retour sur 日本橋, km 0',
      sign: Object.freeze({ route: 'C1', lines: Object.freeze(['日本橋', '江戸橋JCT']), exits: Object.freeze(['11 宝町', 'Yaesu-dōri']) }),
      toll: Object.freeze({ name: '料金所', romaji: 'TOLL GATE', booths: 3, side: 1 }),
    }),
  ]),
});

/** La route réelle d'une ville : seule la C1 (Tokyo) en a une pour l'instant. */
export function cityRushRouteFor(cityId) {
  return cityId === 'tokyo' ? CITY_RUSH_SHUTO_C1 : null;
}

/** Secteur de la C1 couvrant une position sur le tour (0 → 1). */
export function shutoC1SectorAt(lapProgress, route = CITY_RUSH_SHUTO_C1) {
  const progress = clamp01(Number(lapProgress) || 0);
  const sectors = route?.sectors || [];
  // Le dernier secteur se referme sur 1 : on le traite à part pour que la
  // ligne d'arrivée appartienne bien à 日本橋.
  return sectors.find((sector) => progress >= sector.from && (progress < sector.to || sector.to <= sector.from))
    || sectors[sectors.length - 1]
    || null;
}

/**
 * État « couvert » d'une position sur le tour : tunnel, tranchée ou air libre.
 * Le monde s'en sert pour couper la pluie, allumer les phares et resserrer la
 * brume sous le palais impérial.
 */
export function shutoC1CoverAt(lapProgress, route = CITY_RUSH_SHUTO_C1) {
  const sector = shutoC1SectorAt(lapProgress, route);
  if (!sector) return { covered: false, kind: null, name: null, romaji: null };
  if (sector.kind === 'tunnel') {
    return { covered: true, kind: 'tunnel', name: sector.tunnel?.name || sector.name, romaji: sector.tunnel?.romaji || sector.romaji };
  }
  if (sector.kind === 'cut') {
    return { covered: false, kind: 'cut', name: sector.cut?.name || sector.name, romaji: sector.romaji };
  }
  return { covered: false, kind: null, name: null, romaji: null };
}

/**
 * Le prochain échangeur/sortie annoncé et sa distance réelle, comme sur les
 * panneaux d'approche de la Shuto (800 m / 400 m / 200 m avant la bifurcation).
 */
export function shutoC1NextJunction(lapProgress, route = CITY_RUSH_SHUTO_C1) {
  const progress = clamp01(Number(lapProgress) || 0);
  const sectors = route?.sectors || [];
  let best = null;
  for (const sector of sectors) {
    // Les simples tronçons de viaduc ne font pas l'objet d'un panneau
    // d'approche ; tout le reste (échangeur, tunnel, sortie, repère) oui.
    if (sector.kind === 'viaduct' || !sector.sign) continue;
    const ahead = sector.from >= progress ? sector.from - progress : sector.from + 1 - progress;
    if (ahead < 1e-6) continue;
    if (!best || ahead < best.ahead) best = { sector, ahead };
  }
  if (!best) return null;
  return {
    id: best.sector.id,
    name: best.sector.name,
    romaji: best.sector.romaji,
    kind: best.sector.kind,
    km: best.sector.km,
    ahead: best.ahead,
    aheadM: Math.round(best.ahead * (route.lengthKm || SHUTO_C1_LENGTH_KM) * 1000),
    sign: best.sector.sign,
  };
}

/**
 * Lecture complète du tableau de bord « Shuto » pour une position sur le
 * tour : secteur, kilomètre officiel depuis 日本橋, couverture (tunnel /
 * tranchée) et prochaine bifurcation. Utilisé par le HUD et les tests.
 */
export function shutoC1Readout(lapProgress, route = CITY_RUSH_SHUTO_C1) {
  const sector = shutoC1SectorAt(lapProgress, route);
  const cover = shutoC1CoverAt(lapProgress, route);
  return {
    km: shutoC1KmAt(lapProgress, route.lengthKm),
    marker: route.marker,
    direction: route.direction,
    directionRomaji: route.directionRomaji,
    speedLimit: route.speedLimit,
    sector: sector ? { id: sector.id, name: sector.name, romaji: sector.romaji, kind: sector.kind, note: sector.note || '' } : null,
    cover,
    next: shutoC1NextJunction(lapProgress, route),
  };
}

// Tracé réel de l'anneau, en kilomètres relatifs au centre de la boucle
// (x vers l'est, y vers le sud, comme à l'écran) : les seize points suivent
// l'ordre de la course en 内回り et reproduisent l'œuf dissymétrique de la C1 —
// flanc est droit (日本橋 → 銀座), pincement au sud-ouest (谷町 → 一ノ橋) et
// grand axe nord-sud de 竹橋 à 浜崎橋.
const SHUTO_C1_OUTLINE_KM = Object.freeze([
  [1.67, -1.39], // 日本橋 · 江戸橋JCT (km 0)
  [0.81, -2.66], // 神田橋
  [-0.27, -2.28], // 竹橋JCT
  [-1.36, -2.00], // 北の丸 · 代官町
  [-1.67, -1.00], // 三宅坂JCT
  [-1.63, -0.22], // 霞が関
  [-1.81, 0.67], // 谷町JCT
  [-1.18, 1.22], // 飯倉
  [-1.36, 2.00], // 一ノ橋JCT
  [-0.91, 2.22], // 芝公園 · 東京タワー
  [0.18, 2.44], // 浜崎橋JCT
  [0.36, 1.11], // 汐留JCT
  [0.72, 0.22], // 銀座
  [1.45, -0.22], // 新富町 · 築地川
  [1.45, -0.78], // 京橋JCT
  [1.27, -1.00], // 宝町
]);
const SHUTO_C1_OUTLINE_SCALE = 9.6; // unités de mini-carte par kilomètre
const SHUTO_C1_OUTLINE_SAMPLES = 320;

let shutoOutlineCache = null;

// Spline de Catmull-Rom fermée, rééchantillonnée puis paramétrée par longueur
// d'arc : la progression du pilote (en mètres) reste proportionnelle à la
// distance réellement parcourue sur l'anneau.
function buildShutoOutline() {
  const control = SHUTO_C1_OUTLINE_KM.map(([x, y]) => [50 + x * SHUTO_C1_OUTLINE_SCALE, 50 + y * SHUTO_C1_OUTLINE_SCALE]);
  const count = control.length;
  const catmull = (index, t) => {
    const p0 = control[(index - 1 + count) % count];
    const p1 = control[index % count];
    const p2 = control[(index + 1) % count];
    const p3 = control[(index + 2) % count];
    const t2 = t * t;
    const t3 = t2 * t;
    return [0, 1].map((axis) => 0.5 * (
      (2 * p1[axis])
      + (-p0[axis] + p2[axis]) * t
      + (2 * p0[axis] - 5 * p1[axis] + 4 * p2[axis] - p3[axis]) * t2
      + (-p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis]) * t3
    ));
  };
  const points = [];
  const stepsPerSegment = Math.ceil(SHUTO_C1_OUTLINE_SAMPLES / count);
  for (let index = 0; index < count; index += 1) {
    for (let step = 0; step < stepsPerSegment; step += 1) {
      points.push(catmull(index, step / stepsPerSegment));
    }
  }
  const cumulative = [0];
  for (let index = 1; index <= points.length; index += 1) {
    const previous = points[index - 1];
    const next = points[index % points.length];
    cumulative.push(cumulative[index - 1] + Math.hypot(next[0] - previous[0], next[1] - previous[1]));
  }
  const total = cumulative[points.length];
  return { points, cumulative, total };
}

function shutoOutline() {
  if (!shutoOutlineCache) shutoOutlineCache = buildShutoOutline();
  return shutoOutlineCache;
}

/**
 * Forme de mini-carte propre à une ville : la C1 dessine son vrai anneau et
 * la Route 66 dessine son axe Chicago → Santa Monica en grand ruban ouest.
 * Les autres villes gardent la boucle générique de `cityRushMinimapPoint`.
 */
export function cityRushMinimapTrackShape(cityId) {
  if (cityId === 'route-66') {
    // Tracé éditorial simplifié, mais géographiquement lisible : Midwest en
    // haut, détour par le Nouveau-Mexique, puis descente vers l'Arizona et la
    // Californie. La courte remontée ferme la boucle jouable sans changer la
    // direction ouest affichée aux joueurs.
    const points = [
      [86, 22], [76, 28], [68, 37], [57, 45], [47, 47],
      [39, 43], [31, 49], [22, 58], [12, 69], [16, 78],
      [31, 84], [50, 82], [69, 71], [82, 55], [88, 39],
    ];
    const cumulative = [0];
    for (let index = 1; index <= points.length; index += 1) {
      const previous = points[index - 1];
      const next = points[index % points.length];
      cumulative.push(cumulative[index - 1] + Math.hypot(next[0] - previous[0], next[1] - previous[1]));
    }
    const total = cumulative[points.length];
    return {
      id: 'route-66',
      total,
      at(progress) {
        const wrapped = ((Number(progress) || 0) % 1 + 1) % 1;
        const target = wrapped * total;
        let low = 0;
        while (low + 1 < cumulative.length && cumulative[low + 1] <= target) low += 1;
        const span = cumulative[low + 1] - cumulative[low] || 1;
        const t = (target - cumulative[low]) / span;
        const a = points[low % points.length];
        const b = points[(low + 1) % points.length];
        const norm = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        return { centerX: a[0] + (b[0] - a[0]) * t, centerY: a[1] + (b[1] - a[1]) * t, tangentX: (b[0] - a[0]) / norm, tangentY: (b[1] - a[1]) / norm };
      },
      path() {
        return `${points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point[0]} ${point[1]}`).join(' ')} Z`;
      },
    };
  }
  if (!cityRushRouteFor(cityId)) return null;
  const outline = shutoOutline();
  const { points, cumulative, total } = outline;
  return {
    id: 'shuto-c1',
    total,
    at(progress) {
      const wrapped = ((Number(progress) || 0) % 1 + 1) % 1;
      const target = wrapped * total;
      let low = 0;
      let high = cumulative.length - 1;
      while (low + 1 < high) {
        const middle = (low + high) >> 1;
        if (cumulative[middle] <= target) low = middle;
        else high = middle;
      }
      const span = cumulative[low + 1] - cumulative[low] || 1;
      const t = (target - cumulative[low]) / span;
      const a = points[low % points.length];
      const b = points[(low + 1) % points.length];
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t;
      const norm = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return { centerX: x, centerY: y, tangentX: (b[0] - a[0]) / norm, tangentY: (b[1] - a[1]) / norm };
    },
    path(steps = 120) {
      const count = Math.max(24, Math.trunc(Number(steps) || 120));
      const commands = [];
      for (let index = 0; index < count; index += 1) {
        const point = points[Math.floor((index / count) * points.length) % points.length];
        commands.push(`${index === 0 ? 'M' : 'L'} ${point[0].toFixed(2)} ${point[1].toFixed(2)}`);
      }
      commands.push('Z');
      return commands.join(' ');
    },
  };
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
    // Tokyo se joue désormais sur la Shuto Expressway Route 1 : la C1
    // 都心環状線, l'anneau intérieur de 14,8 km autour du palais impérial
    // (`CITY_RUSH_SHUTO_C1`). Ni rue ni trottoir : viaduc, murs antibruit,
    // tunnels, portiques verts et sorties numérotées. Le style `shuto` aiguille
    // le décor vers `shutoC1Stage.js` et la skyline vers la baie de Tokyo.
    id: 'tokyo', name: 'SHUTŌ C1', label: 'TOKYO · SHUTO EXPRESSWAY ROUTE 1', district: 'C1 内回り · 都心環状線',
    tagline: '14,8 km de viaduc, trois tunnels, zéro feu rouge.', accent: '#3ce08a', secondary: '#ff9d4d',
    background: 0x0a0f22, fog: 0x1d2140, asphalt: 0x14171f, sidewalk: 0x2a2740,
    buildingColors: Object.freeze([0x2b3150, 0x3a3557, 0x1f3348, 0x453a52, 0x2a2c40]),
    windowColor: 0x8fe9ff, skyTop: 0x090d22, skyGlow: 0x2fd07d, style: 'shuto',
    signs: Object.freeze(['C1 都心環状', '内回り', '銀座', '芝公園', '谷町JCT', '汐留トンネル']),
    route: CITY_RUSH_SHUTO_C1,
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

// La Route 66 reste une course distincte des cinq destinations urbaines :
// une traversée condensée de son axe historique, du départ de Chicago à la
// jetée de Santa Monica. Les secteurs servent aux panneaux, au décor et à la
// mini-carte éditoriale, tandis que la boucle jouable reste volontairement
// courte pour garder le rythme arcade.
const ROUTE_66_DETAILS = Object.freeze({
  id: 'route-66',
  name: 'HISTORIC U.S. 66',
  marker: 'US 66',
  lengthKm: 3940,
  direction: 'OUEST',
  directionRomaji: 'CHICAGO → SANTA MONICA',
  speedLimit: 55,
  speedUnit: 'mph',
  endpoints: Object.freeze(['CHICAGO', 'SANTA MONICA']),
  sectors: Object.freeze([
    Object.freeze({ id: 'chicago', from: 0, to: 0.1, name: 'Chicago', state: 'ILLINOIS', kind: 'city', note: 'Départ historique sur Adams Street.' }),
    Object.freeze({ id: 'st-louis', from: 0.1, to: 0.2, name: 'St. Louis', state: 'MISSOURI', kind: 'bridge', note: 'Le Mississippi et le Gateway Arch.' }),
    Object.freeze({ id: 'tulsa', from: 0.2, to: 0.32, name: 'Tulsa', state: 'OKLAHOMA', kind: 'neon', note: 'Diners, motels et enseignes de la Mother Road.' }),
    Object.freeze({ id: 'oklahoma', from: 0.32, to: 0.44, name: 'Oklahoma City', state: 'OKLAHOMA', kind: 'prairie', note: 'La route traverse la prairie et ses stations-service.' }),
    Object.freeze({ id: 'amarillo', from: 0.44, to: 0.56, name: 'Amarillo', state: 'TEXAS', kind: 'landmark', note: 'Cadillac Ranch et U-Drop Inn.' }),
    Object.freeze({ id: 'santa-fe', from: 0.56, to: 0.67, name: 'Santa Fe', state: 'NEW MEXICO', kind: 'adobe', note: 'Adobes, mesas et désert peint.' }),
    Object.freeze({ id: 'flagstaff', from: 0.67, to: 0.8, name: 'Flagstaff', state: 'ARIZONA', kind: 'desert', note: 'Petrified Forest, cratère et hauts plateaux.' }),
    Object.freeze({ id: 'kingman', from: 0.8, to: 0.91, name: 'Kingman', state: 'ARIZONA', kind: 'desert', note: 'Seligman, Hackberry et le dernier grand ruban de désert.' }),
    Object.freeze({ id: 'santa-monica', from: 0.91, to: 1, name: 'Santa Monica', state: 'CALIFORNIE', kind: 'finish', note: 'Arrivée symbolique au bout de la jetée.' }),
  ]),
});

// C'est un parcours libre (et non une ville) : ses métadonnées de route sont
// conservées sous `route` pour que l'interface puisse afficher la traversée
// Chicago → Santa Monica sans perdre les attributs de décor du moteur.
export const CITY_RUSH_ROUTE_66 = Object.freeze({
  ...ROUTE_66_DETAILS,
  label: 'ÉTATS-UNIS · ILLINOIS → CALIFORNIE',
  district: 'HISTORIC U.S. 66 · MOTHER ROAD',
  tagline: 'La Main Street of America, de Chicago à Santa Monica.',
  accent: '#e5b85c',
  secondary: '#3e91b5',
  background: 0x86b8d0,
  fog: 0xe7c48f,
  asphalt: 0x6f6b61,
  sidewalk: 0xa9906d,
  buildingColors: Object.freeze([0xc8a271, 0xe1c18b, 0xa66f51, 0xd6c09a, 0x92755e]),
  windowColor: 0x536d72,
  skyTop: 0x2d6da9,
  skyGlow: 0xffbd68,
  style: 'route66',
  signs: Object.freeze(['HISTORIC 66', 'MOTHER ROAD', 'BLUE SWALLOW', 'WESTBOUND', 'SANTA MONICA']),
  route: ROUTE_66_DETAILS,
});

// Route de campagne au Mexique (Carretera Federal) : paysage d'agaves,
// ranchos colorés et ciel d'azur au soleil haut. Très peu de trafic, comme
// sur une route secondaire de l'intérieur du pays entre deux villages.
const MEXICO_DETAILS = Object.freeze({
  id: 'mexico-countryside',
  name: 'CARRETERA DEL SOL',
  marker: 'MEX 45',
  lengthKm: 248,
  direction: 'SUR',
  directionRomaji: 'ZACATECAS → SAN LUIS POTOSÍ',
  speedLimit: 90,
  speedUnit: 'km/h',
  endpoints: Object.freeze(['ZACATECAS', 'SAN LUIS POTOSÍ']),
  sectors: Object.freeze([
    Object.freeze({ id: 'zacatecas', from: 0, to: 0.14, name: 'Zacatecas', state: 'ZACATECAS', kind: 'colonial', note: 'Adobes rose pâle et clocher colonial au départ.' }),
    Object.freeze({ id: 'mesa', from: 0.14, to: 0.3, name: 'Mesa del Agave', state: 'ZACATECAS', kind: 'agave', note: 'Champs d\'agaves bleus et nopales en terrasse.' }),
    Object.freeze({ id: 'rancho', from: 0.3, to: 0.48, name: 'Rancho Nuevo', state: 'ZACATECAS', kind: 'rancho', note: 'Petits ranchos aux murs ocre et toits de tuile rouge.' }),
    Object.freeze({ id: 'arroyo', from: 0.48, to: 0.64, name: 'Arroyo Hondo', state: 'SAN LUIS POTOSÍ', kind: 'arroyo', note: 'Un pont de pierre au-dessus d\'un arroyo asséché.' }),
    Object.freeze({ id: 'chapel', from: 0.64, to: 0.8, name: 'Capilla Blanca', state: 'SAN LUIS POTOSÍ', kind: 'chapel', note: 'Chapelle blanche au bord de la route, croix de bois peinte.' }),
    Object.freeze({ id: 'potosi', from: 0.8, to: 1, name: 'San Luis Potosí', state: 'SAN LUIS POTOSÍ', kind: 'finish', note: 'Arrivée aux portes de la ville coloniale.' }),
  ]),
  // Très peu de trafic sur cette route de campagne secondaire.
  trafficCount: 2,
  oncomingCount: 1,
});

export const CITY_RUSH_MEXICO_COUNTRYSIDE = Object.freeze({
  ...MEXICO_DETAILS,
  label: 'MEXIQUE · ZACATECAS → SAN LUIS POTOSÍ',
  district: 'CARRETERA FEDERAL 45 · CAMINO DEL SOL',
  tagline: 'Une route de campagne au soleil du Mexique, entre agaves et ranchos.',
  accent: '#e85d38',
  secondary: '#f2c14e',
  background: 0x6fb5d9,
  fog: 0xe8c98a,
  asphalt: 0x5c554a,
  sidewalk: 0xb08a5e,
  buildingColors: Object.freeze([0xe8a87c, 0xc8624a, 0xf2d4a8, 0xd9915c, 0xf2c879, 0xb65b3d, 0xe8d3a5]),
  windowColor: 0x3d5a6b,
  skyTop: 0x2877c4,
  skyGlow: 0xffd887,
  style: 'mexico',
  signs: Object.freeze(['CARRETERA 45', 'BIENVENIDOS', 'PUEBLO VIEJO', 'AGAVE AZUL', 'TORTILLERÍA', 'TAQUERÍA']),
  route: MEXICO_DETAILS,
});

// Les écrans libres mélangent villes et routes légendaires sans modifier les
// constantes historiques attendues par les succès qui comptent les villes.
export const CITY_RUSH_COURSES = Object.freeze([...CITY_RUSH_CITIES, CITY_RUSH_ROUTE_66, CITY_RUSH_MEXICO_COUNTRYSIDE]);

export function clampCityRushLane(lane, laneCount = CITY_RUSH_LANE_X.length) {
  const parsed = Number.isFinite(Number(lane)) ? Math.trunc(Number(lane)) : 0;
  return Math.max(0, Math.min(laneCount - 1, parsed));
}

// Nombre de tours d'une course : un entier d'au moins 1.
function safeLapCount(laps) {
  const count = Math.floor(Number(laps));
  return Number.isFinite(count) && count >= 1 ? count : CITY_RUSH_LAPS;
}

// Nombre de boucles que compte le dernier tour : un entier d'au moins 1
// (1 redonne l'ancien dernier tour, d'une seule boucle).
function safeFinalLapLoops(finalLapLoops) {
  const loops = Math.floor(Number(finalLapLoops));
  return Number.isFinite(loops) && loops >= 1 ? loops : CITY_RUSH_FINAL_LAP_LOOPS;
}

// Distance d'une course de `laps` tours : chaque tour fait une boucle, sauf le
// dernier qui en enchaîne `finalLapLoops`. Trois tours donnent ainsi
// 600 + 600 + 1 200 = 2 400 m.
export function cityRushRaceDistance(laps = CITY_RUSH_LAPS, lapLength = CITY_RUSH_LAP_LENGTH, finalLapLoops = CITY_RUSH_FINAL_LAP_LOOPS) {
  const safeLap = Math.max(1, Number(lapLength) || CITY_RUSH_LAP_LENGTH);
  return (safeLapCount(laps) - 1 + safeFinalLapLoops(finalLapLoops)) * safeLap;
}

// Longueur du tour `lap` (1 … laps) : une boucle, sauf le dernier tour.
export function cityRushLapLength(lap, laps = CITY_RUSH_LAPS, lapLength = CITY_RUSH_LAP_LENGTH, finalLapLoops = CITY_RUSH_FINAL_LAP_LOOPS) {
  const safeLap = Math.max(1, Number(lapLength) || CITY_RUSH_LAP_LENGTH);
  return (Number(lap) || 1) >= safeLapCount(laps) ? safeLap * safeFinalLapLoops(finalLapLoops) : safeLap;
}

// Tour en cours (1 à `laps`) pour une distance parcourue. Le dernier tour court
// jusqu'à l'arrivée, même s'il compte plusieurs boucles : le compteur y reste
// plafonné et ne passe pas à « laps + 1 » quand on recroise le portique.
export function cityRushLapForDistance(distance, lapLength = CITY_RUSH_LAP_LENGTH, laps = CITY_RUSH_LAPS) {
  const safeDistance = Math.max(0, Number(distance) || 0);
  const safeLap = Math.max(1, Number(lapLength) || CITY_RUSH_LAP_LENGTH);
  return Math.max(1, Math.min(laps, Math.floor(safeDistance / safeLap) + 1));
}

// Progression (0 → 1) à l'intérieur du tour courant ; vaut 1 une fois la
// course bouclée pour que la jauge reste pleine sur l'écran d'arrivée. Au
// dernier tour la jauge court sur toute sa longueur (1 200 m), pas sur une
// seule boucle : elle ne retombe pas à 0 quand on recroise le portique.
export function cityRushLapProgress(distance, lapLength = CITY_RUSH_LAP_LENGTH, laps = CITY_RUSH_LAPS, finalLapLoops = CITY_RUSH_FINAL_LAP_LOOPS) {
  const safeDistance = Math.max(0, Number(distance) || 0);
  const safeLap = Math.max(1, Number(lapLength) || CITY_RUSH_LAP_LENGTH);
  const finalStart = (safeLapCount(laps) - 1) * safeLap;
  const finalLength = safeLap * safeFinalLapLoops(finalLapLoops);
  if (safeDistance >= finalStart + finalLength) return 1;
  if (safeDistance >= finalStart) return clamp01((safeDistance - finalStart) / finalLength);
  return clamp01((safeDistance % safeLap) / safeLap);
}

// Numéros des lignes (1 … laps − 1 + finalLapLoops) franchies entre deux
// distances successives. Franchir la ligne k < laps lance le tour k + 1 ; les
// lignes suivantes jalonnent le dernier tour (points de passage) et la
// dernière est l'arrivée — voir `cityRushLineKind`.
export function cityRushLapCrossings(previousDistance, nextDistance, lapLength = CITY_RUSH_LAP_LENGTH, laps = CITY_RUSH_LAPS, finalLapLoops = CITY_RUSH_FINAL_LAP_LOOPS) {
  const before = Math.max(0, Number(previousDistance) || 0);
  const after = Math.max(0, Number(nextDistance) || 0);
  const safeLap = Math.max(1, Number(lapLength) || CITY_RUSH_LAP_LENGTH);
  if (after <= before) return [];
  const lastLine = safeLapCount(laps) - 1 + safeFinalLapLoops(finalLapLoops);
  const crossings = [];
  for (let line = Math.floor(before / safeLap) + 1; line <= lastLine && line * safeLap <= after; line += 1) {
    crossings.push(line);
  }
  return crossings;
}

// Ce que marque la ligne n° `line` : le début d'un tour (`'lap'`), un simple
// point de passage dans le dernier tour (`'checkpoint'`, la course continue)
// ou l'arrivée (`'finish'`). Sans dernier tour long (une seule boucle), il n'y
// a jamais de point de passage.
export function cityRushLineKind(line, laps = CITY_RUSH_LAPS, finalLapLoops = CITY_RUSH_FINAL_LAP_LOOPS) {
  const count = safeLapCount(laps);
  const finishLine = count - 1 + safeFinalLapLoops(finalLapLoops);
  const number = Math.floor(Number(line)) || 0;
  if (number >= finishLine) return 'finish';
  return number >= count ? 'checkpoint' : 'lap';
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

// ── Ligne centrale du circuit (rendu) ──────────────────────────────────────
// Les règles de course conservent une progression longitudinale très simple,
// tandis que Three.js projette cette ligne en deux courbes souples. La somme
// sinusoïdale a une valeur *et une pente* nulles au portique : le tour suivant
// se raccorde donc sans cassure et le départ reste bien lisible.
function cityRushTrackPhase(distance, lapLength) {
  const safeLap = Math.max(1, Number(lapLength) || CITY_RUSH_LAP_LENGTH);
  const safeDistance = Number(distance) || 0;
  const progress = ((safeDistance % safeLap) + safeLap) % safeLap / safeLap;
  return { safeLap, phase: progress * Math.PI * 2 };
}

/** Déport horizontal de la ligne centrale, en unités monde. */
export function cityRushTrackOffset(distance, lapLength = CITY_RUSH_LAP_LENGTH, amplitude = CITY_RUSH_TURN_AMPLITUDE) {
  const { phase } = cityRushTrackPhase(distance, lapLength);
  const safeAmplitude = Math.max(0, Number(amplitude) || 0);
  // Deux demi-S : une courbe s'ouvre progressivement, se referme, puis son
  // miroir termine le tour. Le second harmonique annule la pente aux raccords.
  return safeAmplitude * (Math.sin(phase) - 0.5 * Math.sin(phase * 2));
}

/** Pente locale de la ligne centrale (unités X par mètre de course). */
export function cityRushTrackTangent(distance, lapLength = CITY_RUSH_LAP_LENGTH, amplitude = CITY_RUSH_TURN_AMPLITUDE) {
  const { safeLap, phase } = cityRushTrackPhase(distance, lapLength);
  const safeAmplitude = Math.max(0, Number(amplitude) || 0);
  return (safeAmplitude * Math.PI * 2 / safeLap) * (Math.cos(phase) - Math.cos(phase * 2));
}

/** Lacet de rendu qui aligne véhicules et accessoires sur le virage courant. */
export function cityRushTrackYaw(distance, lapLength = CITY_RUSH_LAP_LENGTH, amplitude = CITY_RUSH_TURN_AMPLITUDE, scrollScale = CITY_RUSH_SCROLL_SCALE) {
  const scale = Math.max(0.001, Number(scrollScale) || CITY_RUSH_SCROLL_SCALE);
  return -Math.atan2(cityRushTrackTangent(distance, lapLength, amplitude), scale);
}

/** Hauteur de la chaussée, en unités monde, au point de piste demandé. */
export function cityRushTrackElevation(distance, lapLength = CITY_RUSH_LAP_LENGTH, amplitude = CITY_RUSH_HILL_AMPLITUDE) {
  const { phase } = cityRushTrackPhase(distance, lapLength);
  const safeAmplitude = Math.max(0, Number(amplitude) || 0);
  // Le même profil lisse que la courbe latérale : une montée longue, un sommet,
  // une descente, puis son miroir. Valeur et pente sont nulles à la ligne.
  return safeAmplitude * (Math.sin(phase) - 0.5 * Math.sin(phase * 2));
}

/** Pente verticale locale (unités Y par mètre de course). */
export function cityRushTrackGrade(distance, lapLength = CITY_RUSH_LAP_LENGTH, amplitude = CITY_RUSH_HILL_AMPLITUDE) {
  const { safeLap, phase } = cityRushTrackPhase(distance, lapLength);
  const safeAmplitude = Math.max(0, Number(amplitude) || 0);
  return (safeAmplitude * Math.PI * 2 / safeLap) * (Math.cos(phase) - Math.cos(phase * 2));
}

/** Tangage visuel appliqué aux véhicules et accessoires ancrés à la piste. */
export function cityRushTrackPitch(distance, lapLength = CITY_RUSH_LAP_LENGTH, amplitude = CITY_RUSH_HILL_AMPLITUDE, scrollScale = CITY_RUSH_SCROLL_SCALE) {
  const scale = Math.max(0.001, Number(scrollScale) || CITY_RUSH_SCROLL_SCALE);
  return Math.atan2(cityRushTrackGrade(distance, lapLength, amplitude), scale);
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

export function isCityRushPowerCharged(inventory, type) {
  const cost = CITY_RUSH_POWER_CHARGE_COST[type];
  if (!Number.isFinite(cost) || cost <= 0) return false;
  return Math.max(0, Math.trunc(Number(inventory?.[type]) || 0)) >= cost;
}

/**
 * Les bonus rouges restent sur la route pour ceux qui doivent encore charger.
 * Ils ne disparaissent globalement qu'une fois le joueur et tous les
 * adversaires actifs chargés ; le filtrage individuel empêche un pilote déjà
 * prêt de reprendre le bonus réservé aux autres.
 */
export function shouldHideCityRushPistolPickup(playerInventory, opponentInventories = []) {
  if (!isCityRushPowerCharged(playerInventory, CITY_RUSH_POWERS.PISTOL)) return false;
  const opponents = Array.isArray(opponentInventories) ? opponentInventories : [];
  return opponents.every((inventory) => isCityRushPowerCharged(inventory, CITY_RUSH_POWERS.PISTOL));
}

export function canCollectCityRushPickup(inventory, type, { redPickupsHidden = false } = {}) {
  if (type === CITY_RUSH_PICKUPS.BOOST) return true;
  if (type !== CITY_RUSH_POWERS.PISTOL || redPickupsHidden) return false;
  return !isCityRushPowerCharged(inventory, CITY_RUSH_POWERS.PISTOL);
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
 * Génère une rangée de bonus sans flaques ni zones de ralentissement.
 * Le turbo apparaît sous forme de pad posé sur la chaussée.
 */
export function createCityRushEncounter(random = Math.random) {
  const available = Array.from({ length: CITY_RUSH_LANE_X.length }, (_, lane) => lane);
  // Les rangées vides sont plus rares (5 %) et un duo apparaît dans 30 %
  // des rangées pleines : davantage d'objets, sans encombrer chaque voie.
  const pickupCount = random() < 0.05 ? 0 : Math.min(available.length, random() < 0.7 ? 1 : 2);
  const pickups = [];

  for (let index = 0; index < pickupCount; index += 1) {
    const slot = Math.floor(random() * available.length);
    const [lane] = available.splice(slot, 1);
    const roll = random();
    // Seuls les pads turbo et les bonus rouges de mitrailleuse apparaissent.
    const type = roll < CITY_RUSH_TRACK_BOOST_PICKUP_CHANCE
      ? CITY_RUSH_PICKUPS.BOOST
      : CITY_RUSH_POWERS.PISTOL;
    pickups.push({ lane, type });
  }

  return { pickups };
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
      // Ramasser passe avant le confort de conduite : le pad turbo pèse trois
      // bonus d'inventaire, même s'il est un peu plus loin. Les voies bloquées
      // et le trafic venant en face restent toutefois des limites de sécurité.
      // Même avec une jauge pleine, le rival continue de viser les objets à portée.
      const weight = pickup.type === CITY_RUSH_PICKUPS.BOOST ? CITY_RUSH_AI_TRACK_BOOST_WEIGHT : 1;
      pickupPriority += weight * (22 + urgency * 8) * laneAffinity;
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
// Chaque course réunit 3 pilotes : notre joueur et 2 rivaux, chacun avec un
// avatar et un prénom issus d'un pays différent autour du monde.
export const CITY_RUSH_RACER_SLOTS = Object.freeze(['player', 'nova', 'juno']);

// Les avatars décrivent leurs couleurs en CSS (`#f3c8a6`) ; ces fonctions
// utilitaires convertissent les teintes en entiers 0xRRGGBB pour les éléments
// Three.js qui en auraient besoin (les voitures, elles, restent sans pilote visible).
export function cityRushHexColor(value, fallback = 0x1e222d) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.trunc(value)) & 0xffffff;
  const match = typeof value === 'string' ? /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim()) : null;
  if (!match) return fallback;
  const digits = match[1];
  return parseInt(digits.length === 3 ? digits.replace(/./g, (digit) => digit + digit) : digits, 16);
}

/** Couleur de peau d’un avatar, au format entier attendu par Three.js. */
export function cityRushDriverColor(driver, fallback = 0x1e222d) {
  return cityRushHexColor(driver?.avatar?.skin, fallback);
}

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

// Sélectionne 3 pilotes distincts (notre joueur et deux rivaux) avec des
// avatars et des pays tous différents.
export function selectCityRushRacers({
  cityId = 'vice-city',
  carId = CITY_RUSH_CARS[0].id,
  runId = 0,
  playerDriverId = null,
} = {}) {
  const total = CITY_RUSH_DRIVERS.length;
  const cityIndex = Math.max(0, CITY_RUSH_COURSES.findIndex((item) => item.id === cityId));
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

  const defaultLanes = CITY_RUSH_DEFAULT_LANES;
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
// Au passage du dernier tour, deux véhicules d'interception entrent en piste
// juste derrière le premier du classement. L'escouade mélange berlines et SUV;
// une unité détruite est remplacée par un renfort quelques secondes plus tard.
// Elles ne sont **pas classées** :
// `rankCityRushRacers` ne les voit jamais et l'écran d'arrivée les ignore.
// Leur mission est de harceler le leader à l'arrivée, puis celle des renforts
// est de viser le joueur : ils chargent la mitrailleuse avec les bonus rouges
// et l'escouade dispose d'une frappe d'hélicoptère gratuite une fois par course.
//
// Contrairement aux autres voitures de course, un véhicule de police est
// **solide** : il ne se traverse pas. Il peut donc se rabattre devant le leader puis
// lever le pied pour le retenir — un barrage roulant, exactement l'effet
// d'une voiture lente percutée — avant de repartir et de revenir à la charge.
export const CITY_RUSH_POLICE_COUNT = 2;
// Les renforts reviennent par vagues plutôt qu'instantanément : assez de temps
// pour profiter d'une destruction, sans laisser la poursuite retomber.
export const CITY_RUSH_POLICE_REINFORCEMENT_DELAY = 3.6; // s
// La deuxième voiture et les renforts de son slot utilisent le modèle SUV.
export const CITY_RUSH_POLICE_VEHICLE_TYPES = Object.freeze(['police', 'police-suv']);
// Un véhicule sur chacune des deux voies extérieures de la course : les
// poursuivants encadrent le leader sans démarrer dans la voie médiane, la plus
// exposée aux voitures qui viennent en face.
export const CITY_RUSH_POLICE_LANES = Object.freeze([
  CITY_RUSH_FORWARD_LANES[0],
  CITY_RUSH_FORWARD_LANES[CITY_RUSH_FORWARD_LANES.length - 1],
]);
// La police ne convoite que les bonus rouges de mitrailleuse.
export const CITY_RUSH_POLICE_HUNT_TYPES = Object.freeze([CITY_RUSH_POWERS.PISTOL]);
export const CITY_RUSH_POLICE_HUNT_WEIGHT = 5; // un bonus rouge vaut cinq bonus ordinaires
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

// Les berlines de l'escouade ont une barre de vie : **trois tirs droits bleus**
// (2 points chacun), OU **deux tirs rouges d'AK-47** (3 points chacun), OU
// **un tir rouge et une collision** (3 points chacun), OU **deux collisions**
// (3 points chacune), OU **un seul missile d'hélicoptère** (6 points) les
// détruisent. Le barème est en points plutôt qu'en coups — un tir bleu ne
// compte pas comme un tir rouge — et reste pur, donc testable hors de three.js.
export const CITY_RUSH_POLICE_HEALTH = 6;
export const CITY_RUSH_POLICE_DAMAGE = Object.freeze({
  [CITY_RUSH_POWERS.BLUE_SHOT]: 2, // trois tirs droits bleus (2 · 3 = 6)
  [CITY_RUSH_POWERS.PISTOL]: CITY_RUSH_POLICE_HEALTH / 2, // un tir rouge retire la moitié de la vie
  [CITY_RUSH_POWERS.RADIO]: CITY_RUSH_POLICE_HEALTH, // un tir d'hélicoptère suffit
  collision: CITY_RUSH_POLICE_HEALTH / 2, // un carambolage retire la moitié de la vie
});

export function cityRushPoliceDamage(health = CITY_RUSH_POLICE_HEALTH, source = CITY_RUSH_POWERS.BLUE_SHOT) {
  const safeHealth = Math.max(0, Math.trunc(Number(health) || 0));
  const damage = Number(CITY_RUSH_POLICE_DAMAGE[source]);
  if (!Number.isFinite(damage) || damage <= 0) return safeHealth;
  return Math.max(0, safeHealth - damage);
}

// Combien de tirs de cette arme reste-t-il avant l'explosion ? Sert au bandeau
// « berline touchée » : « encore deux tirs bleus » plutôt qu'une barre brute.
export function cityRushPoliceShotsLeft(health = CITY_RUSH_POLICE_HEALTH, source = CITY_RUSH_POWERS.BLUE_SHOT) {
  const safeHealth = Math.max(0, Math.trunc(Number(health) || 0));
  const damage = Number(CITY_RUSH_POLICE_DAMAGE[source]);
  if (!safeHealth || !Number.isFinite(damage) || damage <= 0) return 0;
  return Math.ceil(safeHealth / damage);
}

// Prime de destruction : le pilote qui fait exploser une berline la touche.
export const CITY_RUSH_POLICE_DESTROY_SCORE = 200;

// Les berlines entrent sans charge de mitrailleuse. Leur frappe d'hélicoptère
// est un tir de police gratuit, géré une seule fois à l'échelle de la course.
export const CITY_RUSH_POLICE_START_CHARGES = Object.freeze([]);

export function createCityRushPoliceInventory() {
  const inventory = createCityRushInventory();
  for (const type of CITY_RUSH_POLICE_START_CHARGES) {
    inventory[type] = CITY_RUSH_POWER_CHARGE_COST[type];
  }
  return inventory;
}

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
    // leader ou dans sa voie d'entrée : l'escouade encadre la piste au lieu
    // de rouler en file indienne.
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

// ── La barre de vie du pilote (dernier tour) ────────────────────────────────
// Au dernier tour du pilote — le seul tour du Sprint, le quatrième du Circuit
// et de la Poursuite (où l'escouade, elle, est en piste depuis le départ : la
// barre suit le pilote, pas le leader) — la voiture du joueur reçoit une barre
// de vie de **huit carrés**. La page la dessine **sans jamais montrer les carrés** : une
// barre continue qui part du vert et glisse vers l'orange puis le rouge en se
// vidant (`cityRushPlayerHealthColor`). Le barème reste en carrés : un tir
// droit bleu en coûte un, une rafale rouge deux, et une collision avec une
// berline de police un — la berline encaisse le choc elle aussi
// (`CITY_RUSH_POLICE_DAMAGE.collision`). Le trafic et les autres voitures de
// course ne touchent pas la barre : eux ne font que ralentir.
export const CITY_RUSH_PLAYER_HEALTH = 8; // carrés de la barre, pleine au dernier tour
export const CITY_RUSH_PLAYER_DAMAGE = Object.freeze({
  [CITY_RUSH_POWERS.BLUE_SHOT]: 1, // un tir droit bleu
  [CITY_RUSH_POWERS.PISTOL]: 2, // le tir droit rouge de l'AK-47
  collision: 1, // une touche avec une berline de police
});
export const CITY_RUSH_PLAYER_HEALTH_FLASH = 0.3; // s : éclair de la barre qui vient d'encaisser
// Barre à zéro : la voiture part en toupie dans sa fumée, s'arrête, et la
// course est perdue. Le temps de l'épave est celui de la toupie (deux tours
// complets, `cityRushStunSpin`) — la page laisse ensuite la place au bilan.
export const CITY_RUSH_WRECK_SECONDS = 3.2;
export const CITY_RUSH_WRECK_SPIN_TURNS = 2;
// Deux carrés ou moins : la page passe la barre en alerte (pulsation rouge).
export const CITY_RUSH_PLAYER_HEALTH_CRITICAL = 2;

export function cityRushPlayerDamage(health = CITY_RUSH_PLAYER_HEALTH, source = CITY_RUSH_POWERS.BLUE_SHOT) {
  const safeHealth = Math.max(0, Math.trunc(Number(health) || 0));
  const damage = Number(CITY_RUSH_PLAYER_DAMAGE[source]);
  if (!Number.isFinite(damage) || damage <= 0) return safeHealth;
  return Math.max(0, safeHealth - damage);
}

// Vert → orange → rouge, interpolés entre trois arrêts : la barre se réchauffe
// progressivement au lieu de changer de couleur par paliers.
export const CITY_RUSH_PLAYER_BAR_COLORS = Object.freeze({ full: '#2be06a', mid: '#ffa53d', low: '#ff3b4d' });
const BAR_FULL_RGB = Object.freeze([0x2b, 0xe0, 0x6a]);
const BAR_MID_RGB = Object.freeze([0xff, 0xa5, 0x3d]);
const BAR_LOW_RGB = Object.freeze([0xff, 0x3b, 0x4d]);
const mixChannel = (from, to, amount) => Math.round(from + (to - from) * amount);
const rgbToHex = ([r, g, b]) => `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;

export function cityRushPlayerHealthColor(health = CITY_RUSH_PLAYER_HEALTH, max = CITY_RUSH_PLAYER_HEALTH) {
  const ceiling = Math.max(1, Number(max) || CITY_RUSH_PLAYER_HEALTH);
  const ratio = Math.max(0, Math.min(1, (Number(health) || 0) / ceiling));
  const [from, to, amount] = ratio >= 0.5
    ? [BAR_MID_RGB, BAR_FULL_RGB, (ratio - 0.5) / 0.5]
    : [BAR_LOW_RGB, BAR_MID_RGB, ratio / 0.5];
  return rgbToHex([
    mixChannel(from[0], to[0], amount),
    mixChannel(from[1], to[1], amount),
    mixChannel(from[2], to[2], amount),
  ]);
}

// Cooldown d'un carambolage : une berline collée au pare-chocs du pilote ne
// retire pas un carré par image — il faut se reprendre, puis re-toucher.
export const CITY_RUSH_POLICE_COLLISION_COOLDOWN = 1.6; // s
export const CITY_RUSH_POLICE_COLLISION_TOLERANCE = 0.35; // m : au-delà de la distance de sécurité
// Vitesse d'approche (m/s) en dessous de laquelle il n'y a plus de choc : deux
// voitures calées l'une derrière l'autre roulent à la même vitesse.
export const CITY_RUSH_POLICE_COLLISION_CLOSING = 0.8;

// Un carambolage, ce n'est pas « être à côté » : c'est le pilote qui **arrive
// sur** une berline **devant lui**. Deux exclusions, tirées de la façon dont
// l'escouade se bat :
//   · la berline qui se replie **derrière** le pilote pour ouvrir le feu — sa
//     position de tir est justement à quelques mètres de son pare-chocs arrière
//     (`CITY_RUSH_POLICE_ATTACK_LEAD`) : elle ne le percute pas, elle le suit ;
//   · une fois le pilote calé derrière elle (barrage roulant), les deux voitures
//     roulent à la même vitesse : c'est un blocage, pas un choc — sinon un
//     barrage immobile retirerait un carré à chaque cooldown.
export function cityRushPoliceCollisionHit({
  gap = 0,
  closing = 0,
  x,
  targetX,
  width = 1.94,
  targetWidth = 1.9,
  tolerance = CITY_RUSH_POLICE_COLLISION_TOLERANCE,
  closingMargin = CITY_RUSH_POLICE_COLLISION_CLOSING,
} = {}) {
  const safeGap = Number(gap);
  if (!(safeGap > 0)) return false;
  const safeClosing = Number(closing);
  const margin = Math.max(0, Number(closingMargin) || 0);
  if (!Number.isFinite(safeClosing) || safeClosing <= margin) return false;
  return cityRushPoliceContact({ gap: safeGap, x, targetX, width, targetWidth, tolerance });
}

// ── L'hélicoptère d'observation du dernier tour ─────────────────────────────
// Au dernier tour, un second appareil se poste dans le ciel et suit la voiture
// du pilote **jusqu'à l'arrivée** : il n'ouvre jamais le feu, ne porte pas de
// missile et ne fait que filmer — rotor et pod caméra animent la scène, et il
// s'éloigne une fois la ligne franchie. Sa pose est calculée ici, pure : un
// point de vol devant la voiture, un décalage latéral vers la droite et une
// dérive lente pour qu'il ne paraisse pas vissé au sol.
//
// Le cadrage est réglé au plus juste, parce qu'un appareil trop haut sort du
// champ : la caméra de poursuite est à **6,6 m** et vise vers le bas, ce qui
// place l'horizon vers 46 % du haut de l'écran et les cartes du HUD sur la
// bande des 30 % supérieurs. À 32 m devant et 11,2 m de haut, l'appareil
// frôlait le bord supérieur (0,80 en coordonnée écran, où 1 est le haut) et
// passait sous les cartes. À **18 m devant et 8 m de haut**, il vole dans la
// bande de ciel visible (mesuré entre 0,44 et 0,65 selon la ville, moyenne
// 0,57) et grossit d'environ 20 % : il reste au-dessus des 7,1 m qui protègent
// la caméra, sans sortir du cadre. Le smoke projette sa position avec la vraie
// caméra et le vérifie image par image.
export const CITY_RUSH_WATCH_HELI_AHEAD = 18; // m : devant la voiture suivie
export const CITY_RUSH_WATCH_HELI_HEIGHT = 8; // m : altitude au-dessus de la chaussée
export const CITY_RUSH_WATCH_HELI_LATERAL = 4.2; // m : décalage vers la droite du pilote

export function cityRushWatchHelicopterPose({ playerX = 0, clock = 0, leaving = 0 } = {}) {
  const seconds = Number.isFinite(Number(clock)) ? Number(clock) : 0;
  const away = Math.max(0, Math.min(1, Number(leaving) || 0));
  const sway = Math.sin(seconds * 0.42) * 1.6;
  const bob = Math.sin(seconds * 0.93 + 1.1) * 0.35;
  const drift = Math.sin(seconds * 0.23 + 0.7) * 2.1;
  return {
    // `playerX / 2` : il suit la voie du pilote sans coller à ses changements.
    lateral: (Number(playerX) || 0) * 0.5 + CITY_RUSH_WATCH_HELI_LATERAL + sway + away * 18,
    ahead: CITY_RUSH_WATCH_HELI_AHEAD + drift + away * 46,
    height: CITY_RUSH_WATCH_HELI_HEIGHT + bob + away * 24,
    // L'appareil se penche quand il dérive, et s'incline franchement quand il
    // s'éloigne à l'arrivée.
    bank: -sway * 0.09 + away * 0.22,
    yaw: Math.sin(seconds * 0.19) * 0.15 + away * 0.6,
    pod: Math.sin(seconds * 0.8) * 0.42,
    leaving: away,
  };
}

// ── Mini-carte du circuit & focus joueur ────────────────────────────────────
// Projette une distance (en mètres sur la boucle de 600 m) et une voie
// (0..CITY_RUSH_LANE_X.length - 1) sur la mini-carte 2D (repère 100 × 100).
export function cityRushMinimapPoint(
  distance = 0,
  lane = 1,
  {
    lapLength = CITY_RUSH_LAP_LENGTH,
    laneCount = CITY_RUSH_LANE_X.length,
    laneSpacing = 1.45,
    cityId = null,
  } = {},
) {
  const safeDistance = Math.max(0, Number(distance) || 0);
  const safeLap = Math.max(1, Number(lapLength) || CITY_RUSH_LAP_LENGTH);
  const loopProgress = (((safeDistance % safeLap) + safeLap) % safeLap) / safeLap;
  // Une ville dotée d'une route réelle (la C1 de Tokyo) dessine son vrai tracé
  // sur la mini-carte ; les autres gardent l'anneau générique.
  const shape = cityId ? cityRushMinimapTrackShape(cityId) : null;

  let centerX;
  let centerY;
  let dxdt;
  let dydt;
  if (shape) {
    const point = shape.at(loopProgress);
    centerX = point.centerX;
    centerY = point.centerY;
    dxdt = point.tangentX;
    dydt = point.tangentY;
  } else {
    const theta = Math.PI + loopProgress * Math.PI * 2;
    const rx = 32;
    const ry = 20;
    centerX = 50 + rx * Math.cos(theta) - 1.8 * Math.cos(3 * theta);
    centerY = 50 + ry * Math.sin(theta) + 1.4 * Math.sin(2 * theta);
    dxdt = -rx * Math.sin(theta) + 5.4 * Math.sin(3 * theta);
    dydt = ry * Math.cos(theta) + 2.8 * Math.cos(2 * theta);
  }
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

export function cityRushMinimapTrackPath(steps = 72, { lapLength = CITY_RUSH_LAP_LENGTH, cityId = null } = {}) {
  // La C1 se dessine d'après son anneau réel (spline déjà refermée) ; les
  // autres villes gardent la boucle générique échantillonnée par distance.
  const shape = cityId ? cityRushMinimapTrackShape(cityId) : null;
  if (shape) return shape.path(steps);
  const count = Math.max(12, Math.trunc(Number(steps) || 72));
  const commands = [];
  for (let index = 0; index < count; index += 1) {
    const distance = (index / count) * lapLength;
    const point = cityRushMinimapPoint(distance, 1.5, { lapLength, laneSpacing: 0, cityId });
    commands.push(`${index === 0 ? 'M' : 'L'} ${point.centerX.toFixed(2)} ${point.centerY.toFixed(2)}`);
  }
  commands.push('Z');
  return commands.join(' ');
}

// Construit l'état complet de la mini-carte : position des 3 pilotes sur le
// circuit, avatars/pays distincts et focus caméra + télémétrie sur notre joueur.
// `solo` (Sprint) réduit la grille au seul pilote : la mini-carte et le
// classement ne réinventent pas les deux rivaux d'une course à trois.
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
    finalLapLoops = CITY_RUSH_FINAL_LAP_LOOPS,
    totalDistance = cityRushRaceDistance(laps, lapLength, finalLapLoops),
    pursuers = [],
    solo = false,
  } = {},
) {
  const fullRoster = selectCityRushRacers({ cityId, carId, runId, playerDriverId });
  const playerSlots = fullRoster.filter((slot) => slot.id === playerId);
  // Garde-fou : une grille solo sans pilote n'aurait plus rien à projeter — on
  // retombe alors sur la première place de la grille.
  const defaultRoster = solo ? (playerSlots.length ? playerSlots : fullRoster.slice(0, 1)) : fullRoster;
  const incomingById = new Map((Array.isArray(racers) ? racers : []).map((racer) => [racer?.id, racer]));

  const merged = defaultRoster.map((slotProfile) => {
    const raw = incomingById.get(slotProfile.id) || {};
    const rawDistance = Number.isFinite(Number(raw.rawDistance))
      ? Math.max(0, Number(raw.rawDistance))
      : Math.max(0, Number(raw.distance) || 0);
    const distance = Math.max(0, Math.min(totalDistance, Math.round(rawDistance)));
    const lane = raw.lane !== undefined ? clampCityRushLane(raw.lane) : slotProfile.lane;
    const lap = raw.lap ? Math.max(1, Math.min(laps, Number(raw.lap))) : cityRushLapForDistance(rawDistance, lapLength, laps);
    const lapProgress = cityRushLapProgress(rawDistance, lapLength, laps, finalLapLoops);
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
  const playerPoint = cityRushMinimapPoint(playerEntry.rawDistance, playerEntry.lane, { lapLength, cityId });

  const enriched = ranked.ordered.map((racer, index) => {
    const point = cityRushMinimapPoint(racer.rawDistance, racer.lane, { lapLength, cityId });
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
  // l'intégralité de la boucle et les 2 rivaux dans le cadre.
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
  // que la mini-carte puisse la montrer sans la mêler aux trois pilotes.
  const pursued = (Array.isArray(pursuers) ? pursuers : [])
    .filter((police) => police && police.active !== false)
    .map((police, index) => {
      const distance = Math.max(0, Math.min(totalDistance, Number(police.distance) || 0));
      const lane = clampCityRushLane(police.lane);
      const point = cityRushMinimapPoint(distance, lane, { lapLength, cityId });
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
        // Armement : bleu et rouge chargés dès l'entrée en piste, jaune vide.
        armed: police.armed && typeof police.armed === 'object' ? { ...police.armed } : null,
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
    startLine: cityRushMinimapPoint(0, 1.5, { lapLength, laneSpacing: 0, cityId }),
    midGate: cityRushMinimapPoint(lapLength / 2, 1.5, { lapLength, laneSpacing: 0, cityId }),
    // Route réelle (C1 de Tokyo) : repères kilométriques et panneaux posés sur
    // le tracé de la mini-carte, plus la lecture du secteur en cours.
    route: cityRushRouteFor(cityId),
    routeTicks: cityRushRouteFor(cityId)
      ? cityRushRouteFor(cityId).sectors
        .filter((sector) => sector.sign)
        .map((sector) => ({
          id: sector.id,
          name: sector.name,
          romaji: sector.romaji,
          km: sector.km,
          kind: sector.kind,
          ...cityRushMinimapPoint(shutoC1At(sector.km, cityRushRouteFor(cityId).lengthKm) * lapLength, 1.5, { lapLength, laneSpacing: 0, cityId }),
        }))
      : [],
  };
}

