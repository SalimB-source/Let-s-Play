// Règles pures de Vice City Rush : séparées du rendu Three.js pour garder
// les durées, les voies et la génération de rue faciles à vérifier.
//
// La course se joue en circuit : six tours par défaut d'une boucle de 1 200 m.
// Le décor est généré une fois pour la boucle et se répète, si bien que l'on
// repasse sous le portique de départ (tribunes, feux, ligne à damier) à chaque
// tour. La boucle a été doublée (600 m → 1 200 m) pour rendre les stages plus
// longs : deux fois plus de décor, de façades et de repères avant de revoir le
// portique.
//
// **Le dernier tour est plus long que les autres** : il enchaîne
// `CITY_RUSH_FINAL_LAP_LOOPS` boucles (deux, soit 2 400 m) au lieu d'une. Le
// portique est fixe dans le décor : on le recroise donc en cours de dernier
// tour (à mi-parcours avec deux boucles). Ce passage n'est qu'un point de
// passage (`'checkpoint'`, voir `cityRushLineKind`) — il ne lance aucun tour —
// et seule la ligne qui clôt la dernière boucle est l'arrivée. Le décor suit :
// c'est toute la boucle de 1 200 m qui s'allonge, pas seulement la distance à
// parcourir.
export const CITY_RUSH_LAPS = 6; // nombre de tours par défaut (les modes de jeu fixent le leur)
export const CITY_RUSH_LAP_LENGTH = 1200; // m : longueur d'une boucle du stage (doublée pour des stages plus longs)
export const CITY_RUSH_FINAL_LAP_LOOPS = 2; // le dernier tour fait deux fois la boucle
// Mode Sprint : course solo à checkpoints, sans police ni arme. Seize checkpoints
// tous les 300 m (un quart de boucle) : le dernier est l'arrivée, pile sous le
// portique (16 × 300 m = 4 800 m = 4 boucles exactes). Chaque checkpoint
// recharge le chrono à 15 s ; des pads turbo verts sont espacés sur la piste
// pour aider le pilote à les atteindre.
export const CITY_RUSH_SPRINT_CHECKPOINTS = 16;
export const CITY_RUSH_SPRINT_CHECKPOINT_SPACING = 300;
export const CITY_RUSH_SPRINT_CHECKPOINT_TIME = 15;
export const CITY_RUSH_SPRINT_BOOST_ROW_INTERVAL = 6;
export const CITY_RUSH_SPRINT_DISTANCE = CITY_RUSH_SPRINT_CHECKPOINTS * CITY_RUSH_SPRINT_CHECKPOINT_SPACING;
// Nombre de checkpoints franchis pour une distance parcourue (0 … 14).
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
// ── Rythme d'un parcours ────────────────────────────────────────────────────
// `CITY_RUSH_PLAYER_SPEED` est le rythme des rues et des routes ouvertes. Un
// circuit permanent se joue plus posé : la Nordschleife enchaîne 73 virages sur
// 9,20 m de bitume, et le défilement urbain à 126 km/h y rend la piste
// illisible — on n'y double pas au réflexe, on y suit une trajectoire. Le
// facteur s'applique à **tout ce qui roule** (pilote, rivaux, trafic,
// contresens, police et projectiles) : la vitesse du défilement baisse, la
// difficulté relative ne bouge pas. Les distances, elles, restent inchangées —
// streaming et bonus sont déjà exprimés en secondes de trajet à la vitesse de
// pointe réelle, donc ils suivent la voiture sans rien à recalculer.
export const CITY_RUSH_RACEWAY_PACE = 0.85; // le Ring à ~107 km/h au lieu de 126
// Garde-fou du facteur : un parcours peut ralentir la course, jamais la figer.
export const CITY_RUSH_COURSE_PACE_MIN = 0.5;
export const CITY_RUSH_LANE_WIDTH = 2.1;
export const CITY_RUSH_ROAD_WIDTH = 13.4;
export const CITY_RUSH_ROAD_HALF_WIDTH = CITY_RUSH_ROAD_WIDTH / 2;
// Piste d'un circuit permanent (Nürburgring Nordschleife) : 9,20 m de bitume —
// les 8,40 m réels du Ring plus 0,40 m de marge peinte de chaque côté — au lieu
// des 13,40 m d'une artère urbaine. Quatre voies de 2,10 m s'y partagent le
// sens unique, exactement la largeur d'une voiture entre deux voies.
export const CITY_RUSH_RACEWAY_ROAD_WIDTH = 9.2;
export const CITY_RUSH_RACEWAY_ROAD_HALF = CITY_RUSH_RACEWAY_ROAD_WIDTH / 2;
// Six voies au total : trois d'un sens, trois dans l'autre, séparées par l'axe
// jaune central. Les voies restent au même espacement de 2,1 m ; c'est le
// **côté** du contresens qui dépend du pays (voir `cityRushDriveSide`) : à
// droite de l'axe en Amérique et en France, à gauche au Royaume-Uni et au
// Japon.
export const CITY_RUSH_LANE_X = Object.freeze([-5.25, -3.15, -1.05, 1.05, 3.15, 5.25]);
export const CITY_RUSH_LANES_PER_DIRECTION = 3;
// Moitié gauche (abscisses négatives) et moitié droite de la chaussée, dans
// l'ordre des voies de la grille.
export const CITY_RUSH_LEFT_HALF_LANES = Object.freeze(
  Array.from({ length: CITY_RUSH_LANES_PER_DIRECTION }, (_, lane) => lane),
);
export const CITY_RUSH_RIGHT_HALF_LANES = Object.freeze(
  Array.from({ length: CITY_RUSH_LANES_PER_DIRECTION }, (_, lane) => lane + CITY_RUSH_LANES_PER_DIRECTION),
);
// Conduite à droite — le cas historique et le défaut de tous les parcours qui
// ne précisent rien : le contresens arrive par la gauche, la course se tient à
// droite.
export const CITY_RUSH_ONCOMING_LANES = CITY_RUSH_LEFT_HALF_LANES;
export const CITY_RUSH_FORWARD_LANES = CITY_RUSH_RIGHT_HALF_LANES;
// Le joueur part au milieu des voies de course, avec ses deux rivaux de part
// et d'autre pour que la chaussée soit visible dès le départ. En conduite à
// gauche, la même grille est simplement reflétée : le joueur au milieu de la
// moitié gauche (voie 1), ses rivaux de part et d'autre (−5,25 m et −3,15 m).
export const CITY_RUSH_DEFAULT_LANES = Object.freeze([
  CITY_RUSH_LANES_PER_DIRECTION + 1,
  CITY_RUSH_LANE_X.length - 1,
  CITY_RUSH_LANES_PER_DIRECTION,
]);
export const CITY_RUSH_DEFAULT_LANES_LEFT_HAND = Object.freeze(
  CITY_RUSH_DEFAULT_LANES.map((lane) => CITY_RUSH_LANE_X.length - 1 - lane),
);
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
// Les objets de la route mêlent les pads turbo, les chargeurs rouges de l'AK-47
// et les trousses de soin « + » rouges. Les soins restent assez espacés pour
// garder les chocs dangereux, sans laisser une coque abîmée sans solution.
export const CITY_RUSH_RED_PICKUP_CHANCE = 0.08; // chargeur d'AK-47
export const CITY_RUSH_HEALTH_PICKUP_CHANCE = 0.06; // un carré de vie
export const CITY_RUSH_TRACK_BOOST_PICKUP_CHANCE = 1 - CITY_RUSH_RED_PICKUP_CHANCE - CITY_RUSH_HEALTH_PICKUP_CHANCE; // 86 % de pads turbo au sol
export const CITY_RUSH_PISTOL_AMMO_PER_PICKUP = 7;
export const CITY_RUSH_PISTOL_MAX_AMMO = CITY_RUSH_PISTOL_AMMO_PER_PICKUP;
// Le bazooka apparaît deux fois sur chaque carte : deux entrepôts, un avant
// le garage de vie de mi-course (30 % du parcours), un après (65 %). Chaque
// traversée donne deux roquettes ; il n'y a pas d'autre réapprovisionnement.
export const CITY_RUSH_BAZOOKA_AMMO_PER_PICKUP = 2;
export const CITY_RUSH_BAZOOKA_BLAST_CELLS = 2;
export const CITY_RUSH_BAZOOKA_PROJECTILE_SPEED = 180; // roquette visible, tirée droit devant
export const CITY_RUSH_BAZOOKA_PICKUP_HALF_LENGTH = CITY_RUSH_LANE_WIDTH * 1.35;
// Parts de la distance totale de la course où se dressent les deux entrepôts :
// le premier avant le garage de vie (50 %), le second après.
export const CITY_RUSH_BAZOOKA_PICKUP_SHARES = Object.freeze([0.3, 0.65]);
export const CITY_RUSH_AI_TRACK_BOOST_WEIGHT = 3; // un pad turbo pèse trois bonus d'inventaire pour les rivaux

// ── Le rythme des rivaux : ils courent pour gagner ──────────────────────────
// Nova et Juno ne se contentaient plus de suivre la voiture du joueur : leur
// mécanique donne désormais 5 % de plus que la fiche de leur modèle, et ils
// lâchent tout au dernier tour (+2 %). La contrepartie reste entièrement dans
// les mains du joueur : le bonus de ligne propre (jusqu'à 1,12 ×), le contresens
// (jusqu'à 1,35 ×, multiplié au précédent) et le turbo des pads (1,46 × contre
// 1,38 × pour les rivaux) valent plus que cet écart — à condition de rouler
// proprement, ce que l'IA ne fait plus à leur place.
//
// Un rival coincé entre le trafic garde aussi un peu plus de vitesse qu'avant
// (`CITY_RUSH_RIVAL_SLOW_FACTOR`, contre 0,63 pour le joueur) : un choc évité
// vaut mieux qu'un choc encaissé, et ils les évitent maintenant.
export const CITY_RUSH_RIVAL_PACE = 1.05; // × la pointe de leur fiche de modèle
export const CITY_RUSH_RIVAL_FINAL_LAP_PUSH = 1.02; // × le rythme, au dernier tour de ce rival
export const CITY_RUSH_RIVAL_SLOW_FACTOR = 0.62; // part de vitesse conservée après un carambolage

/**
 * Rythme d'un rival : sa fiche de modèle, plus la surcharge de course, plus le
 * tout dernier tour où il ne retient plus rien. Le facteur s'applique à la
 * vitesse de pointe comme aux accélérations (elles suivent le même modèle).
 */
export function cityRushRivalPaceFactor({ finalLap = false } = {}) {
  return CITY_RUSH_RIVAL_PACE * (finalLap ? CITY_RUSH_RIVAL_FINAL_LAP_PUSH : 1);
}

export const CITY_RUSH_TRACK_BOOST_COLOR = '#50e48a';
export const CITY_RUSH_ONCOMING_MAX_WIDTH = 2.12;
export const CITY_RUSH_ONCOMING_EDGE_MARGIN = 0.3;
export const CITY_RUSH_ONCOMING_SAFE_OUTER_X = -(
  CITY_RUSH_ROAD_HALF_WIDTH
  - CITY_RUSH_ONCOMING_MAX_WIDTH / 2
  - CITY_RUSH_ONCOMING_EDGE_MARGIN
);
export const CITY_RUSH_ONCOMING_EJECT_DURATION = 0.72; // s : la voiture heurtée dérape sans quitter la chaussée

/**
 * Décalage d'un véhicule heurté de face : il dérape d'une voie au plus vers le
 * bord extérieur de son sens de circulation, sans quitter la chaussée. En
 * conduite à gauche (Londres, Tokyo), le contresens arrive par la droite : tout
 * le calcul est simplement reflété autour de l'axe jaune. `driveSide` est le
 * côté de circulation du parcours, tel que le donne `cityRushDriveSide`.
 */
export function cityRushOncomingImpactX(
  startX,
  elapsed,
  vehicleWidth = CITY_RUSH_ONCOMING_MAX_WIDTH,
  driveSide = 'right',
) {
  // `side` ramène le calcul du côté droit : la conduite à gauche est le miroir
  // exact de la conduite à droite, il n'y a donc qu'une seule formule.
  const side = driveSide === 'left' ? -1 : 1;
  const fallback = side * CITY_RUSH_LANE_X[0];
  const startXValue = Number.isFinite(Number(startX)) ? Number(startX) : fallback;
  const start = side * startXValue;
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
  return side * (start + (targetX - start) * eased);
}

export const CITY_RUSH_BLUE_SHOT_MAX_RANGE = CITY_RUSH_RACER_VIEW_DISTANCE;
export const CITY_RUSH_BLUE_SHOT_PROJECTILE_SPEED = 300; // m/s : projectile droit, sans guidage
export const CITY_RUSH_BLUE_SHOT_MIN_GAP = 2; // m : le canon doit avoir la place de tirer devant le capot

// ── Distance de streaming : calibrée sur la voiture, pas sur une vitesse fixe ─
// Tout ce qui apparaît devant le pilote (trafic, contresens, rangées de bonus,
// rivaux) était calé sur une seule vitesse de pointe. Avec une échelle de
// puissance qui va du simple au double, une borne fixe se traduit par « moins de
// temps de réaction » pour les voitures rapides : on exprime donc ces distances
// en secondes de trajet, à la vitesse de pointe réelle de la voiture.
export const CITY_RUSH_TRAFFIC_VIEW_SECONDS = 4.2; // s : le trafic doit se voir arriver
export const CITY_RUSH_TRAFFIC_VIEW_AHEAD_MIN = 150; // m : portée historique (voiture à 1,00)
export const CITY_RUSH_TRAFFIC_VIEW_BEHIND = 18; // m : on garde un peu de trafic dans le rétro

export function cityRushTrafficViewAhead(topSpeed = CITY_RUSH_PLAYER_SPEED) {
  const speed = Math.max(0, Number(topSpeed) || 0);
  return Math.max(CITY_RUSH_TRAFFIC_VIEW_AHEAD_MIN, speed * CITY_RUSH_TRAFFIC_VIEW_SECONDS);
}

// Les rangées de bonus sont réparties tous les 24-32 m : il en faut donc d'autant
// plus en réserve devant le pilote que la voiture est rapide, pour conserver la
// même avance en secondes (et la même densité de bonus au mètre).
export const CITY_RUSH_PICKUP_ROW_SPACING_MIN = 24; // m
export const CITY_RUSH_PICKUP_ROW_SPACING_MAX = 32; // m
export const CITY_RUSH_PICKUP_ROW_LEAD_SECONDS = 9.5; // s de rangées semées devant le pilote
export const CITY_RUSH_PICKUP_ROW_COUNT_MIN = 12; // réserve historique (voiture à 1,00)
export const CITY_RUSH_PICKUP_ROW_COUNT_MAX = 26; // garde-fou : 26 rangées × 2 bonus en mémoire

export function cityRushPickupRowCount(topSpeed = CITY_RUSH_PLAYER_SPEED, {
  lead = CITY_RUSH_PICKUP_ROW_LEAD_SECONDS,
  spacing = (CITY_RUSH_PICKUP_ROW_SPACING_MIN + CITY_RUSH_PICKUP_ROW_SPACING_MAX) / 2,
  min = CITY_RUSH_PICKUP_ROW_COUNT_MIN,
  max = CITY_RUSH_PICKUP_ROW_COUNT_MAX,
} = {}) {
  const speed = Math.max(0, Number(topSpeed) || 0);
  const leadSeconds = Math.max(0, Number(lead) || 0);
  const gap = Math.max(1, Number(spacing) || 1);
  const floor = Math.max(1, Math.trunc(Number(min) || CITY_RUSH_PICKUP_ROW_COUNT_MIN));
  const ceiling = Math.max(floor, Math.trunc(Number(max) || CITY_RUSH_PICKUP_ROW_COUNT_MAX));
  return Math.min(ceiling, Math.max(floor, Math.ceil((speed * leadSeconds) / gap)));
}

// Le Sprint se court contre le chrono : 300 m entre deux portes. À la vitesse de
// référence (1,00) le bonus vaut les 15 s historiques, et il suit ensuite la
// voiture — sans quoi la citadine de départ (83 km/h) n'atteindrait jamais le
// checkpoint suivant, et la supercar n'aurait plus aucune pression.
export const CITY_RUSH_SPRINT_CHECKPOINT_MARGIN = 1.75; // marge sur un trajet « à fond »
export const CITY_RUSH_SPRINT_CHECKPOINT_TIME_MIN = 9; // s
export const CITY_RUSH_SPRINT_CHECKPOINT_TIME_MAX = 19; // s

export function cityRushSprintCheckpointTime(topSpeed = CITY_RUSH_PLAYER_SPEED, {
  spacing = CITY_RUSH_SPRINT_CHECKPOINT_SPACING,
  margin = CITY_RUSH_SPRINT_CHECKPOINT_MARGIN,
  min = CITY_RUSH_SPRINT_CHECKPOINT_TIME_MIN,
  max = CITY_RUSH_SPRINT_CHECKPOINT_TIME_MAX,
} = {}) {
  const speed = Math.max(1, Number(topSpeed) || CITY_RUSH_PLAYER_SPEED);
  const flat = Math.max(1, Number(spacing) || CITY_RUSH_SPRINT_CHECKPOINT_SPACING);
  const marginFactor = Math.max(1, Number(margin) || CITY_RUSH_SPRINT_CHECKPOINT_MARGIN);
  const floor = Math.max(0, Number(min) || 0);
  const ceiling = Math.max(floor, Number(max) || Number.MAX_SAFE_INTEGER);
  const raw = (flat / speed) * marginFactor;
  const clamped = Math.min(ceiling, Math.max(floor, raw));
  return Math.round(clamped * 2) / 2; // demi-seconde : lisible au HUD
}

// Onze voitures aux silhouettes et compromis de conduite distincts. La compacte
// de départ est une citadine 5 portes inspirée des petites françaises des
// années 90 : aucun emblème ni logo de constructeur n'est modélisé.
//
// ── Puissance : quels champs changent vraiment la course ? ────────────────
// `powerMultiplier` est **le** levier : la vitesse de pointe réelle vaut
// `CITY_RUSH_PLAYER_SPEED (35 m/s) × powerMultiplier`, soit 126 km/h à 1,00.
// `power` ne pilote que la barre « PUISSANCE » du garage (`CAR_STATS` dans
// `ViceCityRushPage.jsx`) : il est tenu ici aligné sur le classement réel pour
// que la barre ne mente pas, mais il n'entre dans aucun calcul de course.
// `accelerationRate` (m/s²) règle le temps pour atteindre cette pointe et
// `hitRecoveryMultiplier` le temps perdu après un choc.
//
// Échelle volontairement large : 0,66 pour la citadine offerte (~83 km/h)
// jusqu'à 1,42 pour la supercar la plus chère (~179 km/h), soit plus du double
// de vitesse de pointe entre l'entrée et le haut du garage. L'écart se paie
// comptant : `ViceCityWorld.jsx` donne aux deux rivaux les profils les plus
// lents du catalogue hors voiture du joueur, donc une voiture chère rend la
// course nettement plus facile et la citadine de départ très difficile — c'est
// le sens de la progression du garage.
// Pour accentuer (ou réduire) l'écart, il n'y a que trois curseurs à toucher :
//   1. `powerMultiplier`       → vitesse de pointe ;
//   2. `accelerationRate`      → temps de montée en vitesse (et freinage, voir
//                                `cityRushBrakingRate`) ;
//   3. `hitRecoveryMultiplier` → temps perdu après un choc.
// Un écart de cette taille se répercute sur tout ce qui était calibré pour une
// seule vitesse. Les accompagnateurs (déjà en place) suivent la voiture :
//   · `cityRushTrafficViewAhead` / `cityRushPickupRowCount` — le trafic, le
//     contresens et les rangées de bonus se dessinent d'autant plus loin que la
//     pointe est élevée (sinon on les découvre trop tard à 180 km/h) ;
//   · `cityRushSprintCheckpointTime` — le chrono du Sprint se calcule sur la
//     voiture, sinon la citadine ne peut pas atteindre le checkpoint suivant ;
//   · `CITY_RUSH_POLICE_CHASE_SPEED_FACTOR` — une berline lancée à la poursuite
//     dépasse toujours la voiture qu'elle chasse, quelle que soit sa pointe.
//
// ── Résistance : combien de carrés encaisse chaque coque ? ────────────────
// La vie n'est plus la même pour tout le monde : chaque carrosserie a ses
// **points de vie**, réglés par `durabilityMultiplier` via
// `cityRushCarMaxHealth` (le même couple que `power` / `powerMultiplier` :
// `durability` n'est que la jauge 0-100 du garage, tenue alignée sur le
// classement réel, et `durabilityMultiplier` est le seul levier de course).
//
// Le barème suit la puissance **à l'envers, mais avec des écarts voulus** :
// une petite voiture lente et lourde (MISTRAL 1.4 : 0,66 de pointe) encaisse
// 23 carrés, tandis que la supercar la plus rapide du garage (PULSE RS : 1,44)
// tombe en 7 carrés. Entre les deux, la résistance n'est pas une simple
// fonction de la vitesse — le VOLT AERO GT (1,18) encaisse 15 carrés, donc
// mieux que le KRONOS 930 TURBO (1,14, 13 carrés) ou le VORTEX RS-10 (1,22,
// 12 carrés) qui vont pourtant plus vite : les voitures rapides se paient en
// fragilité, les lentes se consolent en encaissant. Moyenne du catalogue :
// ~14,5 carrés, soit la barre historique de quinze — la difficulté d'ensemble
// ne bouge pas, c'est sa répartition qui change.
export const CITY_RUSH_CARS = Object.freeze([
  Object.freeze({
    id: 'city-hatch', archetype: 'city-hatch', name: 'MISTRAL 1.4', className: 'CITADINE 5 PORTES · PREMIER VOLANT',
    bodyColor: 0x21b895, trimColor: 0xd7fff4, driverColor: 0x1e222d, accent: '#48edc2', price: 0,
    power: 18, powerMultiplier: 0.66, acceleration: 40, accelerationRate: 6.2, recovery: 44, hitRecoveryMultiplier: 1.22, durability: 100, durabilityMultiplier: 1.52,
    widthScale: 0.91, heightScale: 0.98, lengthScale: 0.9,
  }),
  Object.freeze({
    id: 'nova-18-gt', archetype: 'nova-hatch', name: 'NOVA 1.8 GT', className: 'COMPACTE 5 PORTES · GT ROUTIÈRE',
    bodyColor: 0x71899c, trimColor: 0xd4e0e8, driverColor: 0x1d232d, accent: '#9bc7df', price: 120,
    power: 34, powerMultiplier: 0.76, acceleration: 54, accelerationRate: 7.4, recovery: 64, hitRecoveryMultiplier: 1.12, durability: 89, durabilityMultiplier: 1.36,
    widthScale: 0.93, heightScale: 0.98, lengthScale: 0.93,
  }),
  Object.freeze({
    id: 'night-comet', archetype: 'volkswagen', name: 'WOLFSBURG GT-R', className: 'COMPACTE TURBO · HOT HATCH SPORT',
    bodyColor: 0x2244c8, trimColor: 0xff2a4b, driverColor: 0x1f2433, accent: '#818cf8', price: 250,
    power: 60, powerMultiplier: 0.92, acceleration: 88, accelerationRate: 9.9, recovery: 96, hitRecoveryMultiplier: 0.82, durability: 79, durabilityMultiplier: 1.2,
    widthScale: 0.94, heightScale: 0.95, lengthScale: 0.94,
  }),
  Object.freeze({
    id: 'vice-roadster', archetype: 'ferrari', name: 'CAVALLO F8 GTB', className: 'BERLINETTA V8 · BI-TURBO ITALIENNE',
    bodyColor: 0xd91424, trimColor: 0xffd000, driverColor: 0x1e222d, accent: '#ef233c', price: 400,
    power: 72, powerMultiplier: 1.02, acceleration: 82, accelerationRate: 9.1, recovery: 84, hitRecoveryMultiplier: 0.94, durability: 62, durabilityMultiplier: 0.94,
    widthScale: 1, heightScale: 1, lengthScale: 1,
  }),
  Object.freeze({
    id: 'turbo-gt', archetype: 'porsche', name: 'KRONOS 930 TURBO', className: 'FLAT-SIX BI-TURBO · COUPÉ SPORT',
    bodyColor: 0xcfd8e3, trimColor: 0xe63946, driverColor: 0x1a202c, accent: '#38bdf8', price: 550,
    power: 84, powerMultiplier: 1.14, acceleration: 70, accelerationRate: 8.4, recovery: 74, hitRecoveryMultiplier: 1.06, durability: 57, durabilityMultiplier: 0.86,
    widthScale: 1.02, heightScale: 0.95, lengthScale: 1.08,
  }),
  Object.freeze({
    id: 'muscle-86', archetype: 'audi', name: 'VORTEX RS-10', className: 'SUPERCAR V10 · TRANSMISSION INTÉGRALE',
    bodyColor: 0x1e64c8, trimColor: 0xd8e2ec, driverColor: 0x1c2430, accent: '#60a5fa', price: 650,
    power: 88, powerMultiplier: 1.22, acceleration: 96, accelerationRate: 10.6, recovery: 66, hitRecoveryMultiplier: 1.18, durability: 53, durabilityMultiplier: 0.8,
    widthScale: 1.07, heightScale: 1.03, lengthScale: 1.08,
  }),
  Object.freeze({
    id: 'vega-gt-67', archetype: 'bmw', name: 'BAVARIA M-CS', className: 'COUPÉ MOTORSPORT · ÉDITION NICO',
    bodyColor: 0x11131a, trimColor: 0x38bdf8, liveryColor: 0xc62232, driverColor: 0x181c26, accent: '#e04455', price: 800,
    power: 94, powerMultiplier: 1.32, acceleration: 86, accelerationRate: 9.6, recovery: 76, hitRecoveryMultiplier: 1.02, durability: 49, durabilityMultiplier: 0.74,
    widthScale: 1.08, heightScale: 1.02, lengthScale: 1.1,
  }),
  Object.freeze({
    id: 'toro-v12', archetype: 'lamborghini', name: 'TEMPESTA LP-780', className: 'SUPERCAR V12 · PROFIL EN COIN',
    bodyColor: 0xffaa00, trimColor: 0x14161f, driverColor: 0x1b1d26, accent: '#ffb703', price: 1000,
    power: 98, powerMultiplier: 1.42, acceleration: 90, accelerationRate: 10.0, recovery: 70, hitRecoveryMultiplier: 1.16, durability: 39, durabilityMultiplier: 0.6,
    widthScale: 1.06, heightScale: 0.92, lengthScale: 1.09,
  }),
  Object.freeze({
    id: 'volt-aero', archetype: 'electric-gt', name: 'VOLT AERO GT', className: 'GT ÉLECTRIQUE · COUPÉ AÉRODYNAMIQUE',
    bodyColor: 0x35d7d0, trimColor: 0xd9ffff, driverColor: 0x15212d, accent: '#42f5dc', price: 600,
    power: 86, powerMultiplier: 1.18, acceleration: 100, accelerationRate: 11.4, recovery: 85, hitRecoveryMultiplier: 0.94, durability: 66, durabilityMultiplier: 1.0,
    widthScale: 1.02, heightScale: 0.96, lengthScale: 1.04,
  }),
  Object.freeze({
    id: 'atlas-xr', archetype: 'sport-crossover', name: 'ATLAS XR', className: 'CROSSOVER SPORT · HYBRIDE INTÉGRALE',
    bodyColor: 0x7848e8, trimColor: 0xffc857, driverColor: 0x1b2030, accent: '#a78bfa', price: 750,
    power: 90, powerMultiplier: 1.27, acceleration: 91, accelerationRate: 10.1, recovery: 100, hitRecoveryMultiplier: 0.79, durability: 75, durabilityMultiplier: 1.14,
    widthScale: 1.08, heightScale: 1.10, lengthScale: 1.08,
  }),
  Object.freeze({
    id: 'pulse-rs', archetype: 'neo-roadster', name: 'PULSE RS', className: 'ROADSTER ÉLECTRIQUE · PERFORMANCE SILENCIEUSE',
    bodyColor: 0xf05a8a, trimColor: 0xffedf5, driverColor: 0x202331, accent: '#ff72ac', price: 1150,
    power: 99, powerMultiplier: 1.44, acceleration: 100, accelerationRate: 12.2, recovery: 78, hitRecoveryMultiplier: 1.02, durability: 31, durabilityMultiplier: 0.47,
    widthScale: 1.04, heightScale: 0.91, lengthScale: 1.06,
  }),
]);

// ── Garage : les trois voitures les moins puissantes sont offertes ─────────
// Tout le monde démarre avec les trois voitures les moins puissantes du
// catalogue, sans billet vert à dépenser : la progression du garage commence
// donc à la quatrième voiture. Le classement suit `powerMultiplier`, **le**
// levier de course décrit plus haut (vitesse de pointe réelle), et non la
// barre « PUISSANCE » du garage : MISTRAL 1.4 (0,66), NOVA 1.8 GT (0,76) et
// WOLFSBURG GT-R (0,92). Les deux tableaux sont tenus alignés, mais en cas de
// désaccord c'est la vitesse de pointe qui tranche.
//
// La liste est calculée depuis `CITY_RUSH_CARS` : ajouter une voiture plus
// lente que le trio la fait entrer d'elle-même dans l'offre, et les prix du
// catalogue restent la référence pour les huit autres voitures. Le garage les
// marque « OFFERTE » (voir `ViceCityRushPage.jsx`) et `cityRushProgress.js`
// les ajoute au garage de chaque sauvegarde — visiteur, compte connecté et
// instantané serveur compris.
export const CITY_RUSH_FREE_CAR_COUNT = 3;

/** Puissance croissante : la vitesse de pointe d'abord, la barre du garage en départage. */
function cityRushPowerRank(a, b) {
  const topSpeed = (Number(a?.powerMultiplier) || 0) - (Number(b?.powerMultiplier) || 0);
  return topSpeed || (Number(a?.power) || 0) - (Number(b?.power) || 0);
}

/** Catalogue trié du plus lent au plus rapide (ordre du garage « par puissance »). */
export const CITY_RUSH_CARS_BY_POWER = Object.freeze(
  [...CITY_RUSH_CARS].sort(cityRushPowerRank),
);

/** Identifiants offerts à tous : les `CITY_RUSH_FREE_CAR_COUNT` voitures les moins puissantes. */
export function cityRushFreeCarIds(cars = CITY_RUSH_CARS) {
  const count = Math.max(0, CITY_RUSH_FREE_CAR_COUNT);
  return [...(Array.isArray(cars) ? cars : [])]
    .filter((car) => car?.id)
    .sort(cityRushPowerRank)
    .slice(0, count)
    .map((car) => car.id);
}

export const CITY_RUSH_FREE_CAR_IDS = Object.freeze(cityRushFreeCarIds());

/** Une voiture offerte appartient à chaque joueur, dès sa première course. */
export function isCityRushFreeCar(carId, cars = CITY_RUSH_CARS) {
  return cityRushFreeCarIds(cars).includes(carId);
}

// Le trafic d'obstacle roule nettement moins vite que les voitures de course.
// La route est à double sens : trois voies vont dans le sens de la course, les
// trois autres accueillent le trafic venant en face — à droite de l'axe par
// défaut, à gauche sur les parcours en conduite à gauche (`cityRushDriveSide`).
// Trafic allégé pour laisser respirer la course (demande : moins de trafic).
export const CITY_RUSH_TRAFFIC_COUNT = 8;
export const CITY_RUSH_TRAFFIC_LANES = Object.freeze(
  Array.from({ length: CITY_RUSH_TRAFFIC_COUNT }, (_, index) => CITY_RUSH_FORWARD_LANES[index % CITY_RUSH_FORWARD_LANES.length]),
);

// Trafic venant en face : les véhicules du contresens roulent vers le joueur,
// croisent la course, puis reparaissent au loin une fois passés (moitié gauche
// de la chaussée en conduite à droite, moitié droite à Londres et à Tokyo).
// Réduit aussi pour éviter l'effet embouteillage, mais avec collision solide.
export const CITY_RUSH_ONCOMING_COUNT = 3;
export const CITY_RUSH_TRAFFIC_TYPES = Object.freeze([
  Object.freeze({ id: 'police', name: 'Voiture de police', speed: 6.4, width: 1.94, length: 3.8 }),
  // Plus une seule berline « en civil » sur la route : l'ancienne banalisée
  // noire a cédé sa place au taxi, la voiture civile de la ville. Le taxi roule
  // comme le trafic ordinaire et ne déclenche aucune poursuite.
  Object.freeze({ id: 'taxi', name: 'Taxi', speed: 6.8, width: 1.94, length: 3.8 }),
  Object.freeze({ id: 'ambulance', name: 'Ambulance', speed: 5.3, width: 1.98, length: 4.0 }),
  Object.freeze({ id: 'garbage-truck', name: 'Camion-poubelle', speed: 4.4, width: CITY_RUSH_ONCOMING_MAX_WIDTH, length: 4.6 }),
  Object.freeze({ id: 'white-lambo', name: 'Tempesta V12 blanche', speed: 7.2, width: 1.92, length: 3.8 }),
]);

// Les seules voitures de police du trafic sont désormais les voitures marquées :
// percuter l'une d'elles la fait sortir de sa ronde et partir en chasse.
export const CITY_RUSH_POLICE_TRAFFIC_TYPES = Object.freeze(['police']);
export function isCityRushPoliceTrafficType(type) {
  return CITY_RUSH_POLICE_TRAFFIC_TYPES.includes(String(type || ''));
}

// Le choc lui-même n'ajoute rien au barème : il crée un court moment de contact
// lisible, puis le véhicule lent se rabat pour libérer la voie — le carré du
// carambolage est facturé une fois par le monde 3D
// (`CITY_RUSH_PLAYER_DAMAGE.collision`, espacé par le répit ci-dessous). La
// durée est volontairement indépendante du modèle de voiture choisi : le
// joueur humain et les IA encaissent exactement la même durée (0,6 s).
export const CITY_RUSH_TRAFFIC_IMPACT_DURATION = 0.6;
export const CITY_RUSH_TRAFFIC_IMPACT_COOLDOWN = 1.2;
export const CITY_RUSH_TRAFFIC_LANE_CHANGE_DURATION = 0.5;

// ── Enveloppe de contact du trafic lent ─────────────────────────────────────
// Le trafic lent n'est pas un mur : c'est une carrosserie posée sur la route,
// et on peut passer à côté d'elle. Le seuil de choc n'est donc plus la distance
// de sécurité (4,8 m, `CITY_RUSH_CAR_GAP`, qui sert aux berlines de police et
// aux rabattements) mais l'enveloppe réelle de la voiture :
//
//   · **pare-chocs contre pare-chocs** (3,6 m), quand les deux carrosseries
//     sont dans l'axe : le choc tombe quand elles se touchent vraiment. Avant,
//     il tombait un mètre plus tôt — à l'écran, on perdait un carré en heurtant
//     une voiture qui n'était pas encore touchée, et une esquive de dernière
//     seconde était punie alors que le pilote avait tourné le volant ;
//   · **frôlement porte contre porte** (2,9 m) dès que l'aile a dégagé l'autre
//     voiture : plus le pilote a entamé son esquive latérale, plus il peut
//     approcher sans rien casser. C'est ce qui donne la marge de manœuvre :
//     une esquive commencée à temps passe, une esquive jamais commencée touche.
//
// L'écart latéral qui sépare ces deux seuils n'est plus la somme des largeurs
// des carrosseries mais celle des **boîtes de contact** du trafic, resserrées
// par `CITY_RUSH_TRAFFIC_HITBOX_SCALE` (voir plus bas) : c'est la boîte qui
// juge le contact, pas la tôle.
//
// `resolveCityRushCarMovement` applique **la même enveloppe** à la retenue du
// suiveur (`cityRushTrafficContactGap`), sans quoi le moteur le bloquerait à
// 4,8 m du véhicule et le choc ne pourrait plus jamais être atteint. Les
// berlines de police et les voitures de course gardent la distance de sécurité
// historique : leur collision est jugée autrement (`cityRushPoliceCollisionHit`).
export const CITY_RUSH_TRAFFIC_CAR_GAP = 3.6; // m : pare-chocs contre pare-chocs
export const CITY_RUSH_TRAFFIC_PASS_GAP = 2.9; // m : frôlement latéral, une fois l'aile dégagée
// Ancien nom, conservé pour les harnais : seuil de choc du trafic dans l'axe.
export const CITY_RUSH_TRAFFIC_IMPACT_GAP = CITY_RUSH_TRAFFIC_CAR_GAP;
// La retenue du suiveur s'arrête **juste au-delà** de l'enveloppe, de ce
// centimètre de marge : le choc est jugé sur la distance *demandée*, avant le
// rabotage du moteur. Une retenue pile sur le seuil n'entrerait donc jamais
// « depuis l'extérieur » (`wasOutsideContact`) et le pilote resterait collé
// derrière la voiture lente sans jamais la toucher — ni s'arrêter, ni
// s'écarter : le bouchon parfait. Avec la marge, le premier contact est franc
// (le suiveur demande à passer dedans) et la voiture touchée se rabat.
export const CITY_RUSH_TRAFFIC_HOLD_MARGIN = 0.05; // m

// ── Boîte de contact du trafic : une esquive de dernière seconde ────────────
// Demande : « réduire la hit-box des voitures qui circulent sur la route pour
// pouvoir les éviter au dernier moment ». La carrosserie garde sa taille à
// l'écran — c'est la **boîte** qui juge le contact qui est resserrée.
//
// Une voiture lente de 1,94 m ne compte donc plus que sur 1,16 m de large
// (`CITY_RUSH_TRAFFIC_HITBOX_SCALE` = 0,6 de la largeur réelle), celles du
// contresens comme les berlines lâchées par un mini-garage. Sur une chaussée à
// voies de 2,10 m, la conséquence est directe : avec la boîte pleine, le pilote
// devait avoir accompli 91 % de son changement de voie pour être hors de
// portée ; la boîte resserrée le dégage à 73 %, et l'enveloppe diagonale tombe
// à son minimum (le frôlement) au même moment. Un coup de volant donné au
// dernier moment passe donc là où il se payait un carré.
//
// La boîte resserrée sert **partout** où le contact d'un véhicule du trafic est
// facturé : détection du choc (`detectCityRushTrafficImpacts`), retenue du
// suiveur (`resolveCityRushCarMovement`), choc frontal (`checkOncomingImpacts`)
// et contact d'une patrouille (`checkPoliceRally`) — sans cette unité, le
// pilote serait dégagé par la détection mais raboté par la retenue. Le **verrou
// de rabattement** (`canEnterLane`) garde en revanche les carrosseries : c'est
// une distance de sécurité de changement de voie (4,8 m), plus stricte que le
// choc qu'elle évite, pas une boîte de contact.
//
// Les **berlines de police en chasse** ne sont pas concernées : elles
// poursuivent le pilote et gardent leur carrosserie pleine (leur contact est
// jugé par `cityRushPoliceCollisionHit`, une règle à part).
export const CITY_RUSH_TRAFFIC_HITBOX_SCALE = 0.6;

/**
 * Largeur de la boîte de contact d'un véhicule du trafic : sa carrosserie
 * (`width`) multipliée par `CITY_RUSH_TRAFFIC_HITBOX_SCALE`. Une largeur
 * inconnue retombe sur la berline de référence (1,94 m).
 */
export function cityRushTrafficHitboxWidth(width, scale = CITY_RUSH_TRAFFIC_HITBOX_SCALE) {
  const safeWidth = Number.isFinite(Number(width)) ? Math.max(0, Number(width)) : 1.94;
  const safeScale = Number.isFinite(Number(scale)) ? Math.max(0, Number(scale)) : CITY_RUSH_TRAFFIC_HITBOX_SCALE;
  return safeWidth * safeScale;
}

/**
 * Distance longitudinale en dessous de laquelle deux voitures se touchent,
 * selon l'écart latéral entre leurs deux centres. Dans l'axe : `contactGap`
 * (pare-chocs contre pare-chocs). Aile contre aile (`lateralDistance` ≥ la
 * somme des demi-largeurs) : `passGap`, le frôlement. Entre les deux, la
 * dégressivité suit la part de carrosserie déjà dégagée — c'est cette pente
 * qui récompense une esquive entamée et laisse passer le pilote qui se décale.
 *
 * `trafficWidth` est la **boîte de contact** du véhicule jugé
 * (`cityRushTrafficHitboxWidth`), pas sa largeur visuelle : la pente tombe donc
 * à son minimum dès que l'aile a dégagé la boîte, plus tôt qu'avec la
 * carrosserie pleine.
 */
export function cityRushTrafficContactGap(lateralDistance, {
  bodyWidth = 1.9,
  trafficWidth = 1.9,
  contactGap = CITY_RUSH_TRAFFIC_CAR_GAP,
  passGap = CITY_RUSH_TRAFFIC_PASS_GAP,
} = {}) {
  const safe = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
  const safeContact = Math.max(0, safe(contactGap, CITY_RUSH_TRAFFIC_CAR_GAP));
  const brush = Math.max(0, Math.min(safeContact, safe(passGap, CITY_RUSH_TRAFFIC_PASS_GAP)));
  const halfWidth = (Math.max(0, safe(bodyWidth, 1.9)) + Math.max(0, safe(trafficWidth, 1.9))) / 2;
  if (halfWidth <= 0) return brush;
  const distance = Math.abs(safe(lateralDistance, 0));
  if (distance >= halfWidth) return brush;
  return brush + (safeContact - brush) * (1 - distance / halfWidth);
}

// Le freinage suivait un plancher fixe (18 m/s²) : toutes les voitures
// s'arrêtaient exactement pareil, et l'écart d'accélération ne se voyait donc
// qu'au démarrage. Les freins suivent maintenant le modèle — une supercar
// encaisse un choc, une toupie ou un barrage et repart plus vite qu'une
// citadine — avec un plancher plus bas pour qu'aucune voiture ne « flotte ».
export const CITY_RUSH_BRAKE_RATE_FACTOR = 1.85; // × l'accélération du modèle
export const CITY_RUSH_BRAKE_RATE_FLOOR = 12; // m/s² : plancher de freinage

export function cityRushBrakingRate(accelerationRate) {
  const acceleration = Math.max(0, Number(accelerationRate) || 0);
  return Math.max(CITY_RUSH_BRAKE_RATE_FLOOR, acceleration * CITY_RUSH_BRAKE_RATE_FACTOR);
}

export function approachCityRushSpeed(currentSpeed, targetSpeed, accelerationRate, deltaTime, pace = 1) {
  const current = Math.max(0, Number(currentSpeed) || 0);
  const target = Math.max(0, Number(targetSpeed) || 0);
  const elapsed = Math.max(0, Number(deltaTime) || 0);
  const rate = Math.max(0, Number(accelerationRate) || 0);
  // Le rythme d'un parcours (voir `cityRushCoursePace`) ralentit toute la
  // course : l'accélération **et** le freinage — plancher compris — suivent le
  // même facteur, sinon une voiture montée plus doucement freinerait
  // relativement plus fort et la montée en vitesse perdrait sa durée.
  const paceFactor = Number.isFinite(Number(pace)) && Number(pace) > 0 ? Number(pace) : 1;
  const acceleration = rate * paceFactor;
  if (target <= 0) return 0;
  if (target >= current) return Math.min(target, current + acceleration * elapsed);
  const braking = cityRushBrakingRate(rate) * paceFactor;
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

// ── Stabilité de voie : la ligne propre est récompensée, rien n'est puni ───
// Changer de voie ne coûte plus aucune vitesse : la voiture glisse
// latéralement à pleine allure, sans coup de frein (l'ancien malus de 0,9 ×
// pendant 0,8 s a été supprimé — zigzaguer pour doubler ou éviter le trafic
// doit être gratuit). Seule la récompense subsiste : tenir sa voie sans
// bouger charge progressivement un bonus de vitesse « ligne propre », qui
// retombe à zéro au prochain écart. Un changement de voie reste donc payant à
// terme — il faut recharger le bonus — mais il ne ralentit jamais.
export const CITY_RUSH_CLEAN_LINE_RAMP_DURATION = 3.5; // s de voie tenue pour charger le bonus au maximum
export const CITY_RUSH_CLEAN_LINE_MAX_BONUS = 1.12; // × vitesse au bout d'une voie tenue longtemps

export function cityRushCleanLineFactor(cleanLineTime) {
  const held = Math.max(0, Number(cleanLineTime) || 0);
  if (CITY_RUSH_CLEAN_LINE_RAMP_DURATION <= 0) return CITY_RUSH_CLEAN_LINE_MAX_BONUS;
  const progress = Math.min(1, held / CITY_RUSH_CLEAN_LINE_RAMP_DURATION);
  return 1 + (CITY_RUSH_CLEAN_LINE_MAX_BONUS - 1) * progress;
}

// ── Bonus de contresens : la voie inverse paye, tant qu'on y survit ─────────
// Les trois voies en sens inverse sont les plus dangereuses de la chaussée : le
// trafic y arrive de face, et un choc frontal coûte cher (voiture recalée,
// ralenti long, dérapage). La contrepartie est un bonus de vitesse
// **cumulatif** : chaque seconde passée dans ces voies charge un peu plus de
// vitesse, jusqu'à `CITY_RUSH_ONCOMING_BONUS_MAX` une fois la jauge pleine.
// Revenir dans le sens de la course la vide — plus vite qu'elle ne s'est
// chargée — et un choc frontal l'annule net (voir `applyOncomingImpact` dans
// `ViceCityWorld.jsx`). Un parcours sans contresens (le Ring) ne charge jamais
// cette jauge : il n'y a personne en face.
export const CITY_RUSH_ONCOMING_BONUS_RAMP_DURATION = 4; // s de contresens pour la jauge pleine
export const CITY_RUSH_ONCOMING_BONUS_DECAY_DURATION = 1.2; // s pour retomber une fois revenu
export const CITY_RUSH_ONCOMING_BONUS_MAX = 1.35; // × vitesse à jauge pleine

/** Facteur de vitesse du bonus de contresens (1 → rien, `MAX` → jauge pleine). */
export function cityRushOncomingBonusFactor(oncomingTime) {
  const held = Math.max(0, Number(oncomingTime) || 0);
  if (CITY_RUSH_ONCOMING_BONUS_RAMP_DURATION <= 0) return CITY_RUSH_ONCOMING_BONUS_MAX;
  const progress = Math.min(1, held / CITY_RUSH_ONCOMING_BONUS_RAMP_DURATION);
  return 1 + (CITY_RUSH_ONCOMING_BONUS_MAX - 1) * progress;
}

/**
 * Fait vivre la jauge de contresens d'une image : elle monte tant que la
 * voiture roule dans une voie en sens inverse, et retombe — en
 * `CITY_RUSH_ONCOMING_BONUS_DECAY_DURATION` secondes — dès qu'elle revient
 * dans le sens de la course. `dt` en secondes ; le résultat reste dans
 * [0, `CITY_RUSH_ONCOMING_BONUS_RAMP_DURATION`].
 */
export function advanceCityRushOncomingBonus(oncomingTime, dt, inOncomingLanes = false) {
  const held = Math.max(0, Number(oncomingTime) || 0);
  const step = Math.max(0, Number(dt) || 0);
  if (inOncomingLanes) return Math.min(CITY_RUSH_ONCOMING_BONUS_RAMP_DURATION, held + step);
  if (CITY_RUSH_ONCOMING_BONUS_DECAY_DURATION <= 0) return 0;
  const drain = step * (CITY_RUSH_ONCOMING_BONUS_RAMP_DURATION / CITY_RUSH_ONCOMING_BONUS_DECAY_DURATION);
  return Math.max(0, held - drain);
}

export function cityRushHitDuration(baseDuration, carProfile) {
  const duration = Math.max(0, Number(baseDuration) || 0);
  const multiplier = Number(carProfile?.hitRecoveryMultiplier);
  return duration * (Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1);
}

// ── Toupie d'immobilisation ─────────────────────────────────────────────────
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

// Le turbo et les soins sont des bonus instantanés au sol, pas des pouvoirs
// à charger dans l'inventaire.
export const CITY_RUSH_PICKUPS = Object.freeze({ BOOST: 'boost', HEALTH: 'health' });
export const CITY_RUSH_HEALTH_PICKUP_RESTORE = 1;
export const CITY_RUSH_HEALTH_PICKUP_COLOR = '#ff4055';

// Le coût du tir rouge représente désormais la capacité de son chargeur :
// chaque bonus rouge recharge sept balles, puis chaque pression en dépense une.
// Les anciens coûts bleu et jaune restent définis pour les règles héritées,
// mais ces bonus ne sont plus générés ni proposés dans Vice City Rush.
export const CITY_RUSH_POWER_CHARGE_COST = Object.freeze({
  [CITY_RUSH_POWERS.BLUE_SHOT]: 1,
  [CITY_RUSH_POWERS.PISTOL]: CITY_RUSH_PISTOL_MAX_AMMO, // rouge · 7 balles par bonus
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
    description: `Un seul bonus bleu suffit pour charger ce tir droit, sans viser : il touche au plus un adversaire sur ta voie et dans ton champ de vision. La voiture touchée perd près de la moitié de sa vitesse pendant ${CITY_RUSH_BLUE_SHOT_DURATION} s, avec un dérapage bien visible. Trois tirs bleus détruisent une berline de police, cinq un SUV blindé.`,
    duration: CITY_RUSH_BLUE_SHOT_DURATION,
    speedFactor: CITY_RUSH_BLUE_SHOT_SPEED_FACTOR,
  }),
  [CITY_RUSH_POWERS.PISTOL]: Object.freeze({
    id: CITY_RUSH_POWERS.PISTOL,
    name: 'AK-47',
    shortName: 'AK-47',
    chargeCost: CITY_RUSH_POWER_CHARGE_COST[CITY_RUSH_POWERS.PISTOL],
    ammoPerPickup: CITY_RUSH_PISTOL_AMMO_PER_PICKUP,
    color: '#ff526e',
    key: 'Z',
    automatic: false,
    description: `Les chargeurs d'AK-47 restent rares : chacun remplit le chargeur de l'arme à ${CITY_RUSH_PISTOL_AMMO_PER_PICKUP} balles, même s'il en reste déjà. Le tir part tout droit, sans viser : il touche le premier adversaire ou la première voiture de police sur ta voie. Contre un pilote comme contre une voiture de police à six carrés de vie, il ne retire jamais qu’un seul carré, sans dérapage ni ralentissement : six balles pour une berline. Un carambolage en accélérant retire un point à la police, et un carré au pilote : percuter une voiture coûte une cellule, ou deux contre un SUV de police blindé. Un SUV a dix carrés de vie : dix balles rouges pour le détruire.`,
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
    description: 'Attaque d’hélicoptère retirée de Vice City Rush : ce pouvoir n’est plus disponible. L’hélicoptère d’observation du dernier tour reste purement décoratif.',
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
// suivent la géographie réelle. La boucle de 1 200 m du jeu est une réduction
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

/**
 * La route réelle d'une ville : Tokyo roule sur la C1 de la Shuto, le
 * Nürburgring sur la Nordschleife. Les autres parcours n'ont pas encore de
 * tracé officiel.
 */
export function cityRushRouteFor(cityId) {
  if (cityId === 'tokyo') return CITY_RUSH_SHUTO_C1;
  if (cityId === 'nordschleife') return CITY_RUSH_NORDSCHLEIFE;
  return null;
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

// ── Nürburgring Nordschleife ────────────────────────────────────────────────
// La « Grüne Hölle » de l'Eifel : 20,832 km, 73 virages (33 à gauche, 40 à
// droite, sans compter les courbes intermédiaires), près de 300 m de dénivelé
// entre le point bas de Breidscheid (320 m) et le sommet de la Hohe Acht
// (620 m), des pentes jusqu'à 18 % en montée et 11 % en descente. Le tour du
// jeu reste une boucle de 1 200 m : chaque boucle rejoue donc les 20,832 km à
// l'échelle 1:17, dans l'ordre réel, sens horaire, du pont d'Antoniusbuche
// (kilomètre zéro du tour officiel) à la ligne d'arrivée de la Start-Ziel-Anlage.
export const NORDSCHLEIFE_LENGTH_KM = 20.832;
export const NORDSCHLEIFE_CORNERS = 73; // officiel : 33 à gauche, 40 à droite
export const NORDSCHLEIFE_LEFT_CORNERS = 33;
export const NORDSCHLEIFE_RIGHT_CORNERS = 40;
export const NORDSCHLEIFE_RELIEF_M = 300; // dénivelé total du tour
export const NORDSCHLEIFE_LOW_M = 320; // Breidscheid, point le plus bas
export const NORDSCHLEIFE_HIGH_M = 620; // Hohe Acht, point le plus haut
export const NORDSCHLEIFE_MAX_UP = 18; // % : montée du Karussell à la Hohe Acht
export const NORDSCHLEIFE_MAX_DOWN = 11; // % : descente de la Fuchsröhre
export const NORDSCHLEIFE_OPENED = 1927;

/**
 * Position sur le tour (0 → 1) d'un point kilométrique officiel du Ring.
 * Le kilométrage croît avec la course (contrairement à la C1 de Tokyo, qui se
 * parcourt en 内回り et dont les bornes décroissent).
 */
export function nordschleifeAt(km, lengthKm = NORDSCHLEIFE_LENGTH_KM) {
  const safeLength = Number.isFinite(Number(lengthKm)) && Number(lengthKm) > 0 ? Number(lengthKm) : NORDSCHLEIFE_LENGTH_KM;
  const safeKm = Number.isFinite(Number(km)) ? Number(km) : 0;
  return ((safeKm % safeLength) + safeLength) % safeLength / safeLength;
}

/** Point kilométrique officiel (depuis Antoniusbuche) d'une position du tour. */
export function nordschleifeKmAt(lapProgress, lengthKm = NORDSCHLEIFE_LENGTH_KM) {
  const safeLength = Number.isFinite(Number(lengthKm)) && Number(lengthKm) > 0 ? Number(lengthKm) : NORDSCHLEIFE_LENGTH_KM;
  const progress = clamp01(Number(lapProgress) || 0);
  return Number((safeLength * progress).toFixed(1));
}

// Profil d'altitude approché du tour, ancré sur les points relevés au bord de
// la piste (point bas de Breidscheid 320 m, sommet de la Hohe Acht 620 m,
// plateau du Hatzenbach, cuvette de la Fuchsröhre, creux du Kesselchen). Il
// n'alimente que l'affichage : le relief jouable, lui, reste celui du moteur.
export const NORDSCHLEIFE_ALTITUDE_KM = Object.freeze([
  [0.0, 570], [0.65, 575], [1.4, 580], [2.2, 620], [2.7, 560],
  [3.2, 570], [3.6, 600], [4.2, 600], [5.2, 535], [5.8, 460],
  [6.3, 420], [6.9, 400], [7.1, 430], [7.7, 455], [8.2, 470],
  [8.75, 455], [9.0, 430], [9.35, 360], [9.7, 320], [9.95, 335],
  [10.3, 380], [10.65, 420], [11.2, 430], [11.6, 395], [12.1, 450],
  [12.6, 470], [13.1, 500], [13.3, 520], [13.45, 540], [13.6, 560],
  [13.85, 590], [14.3, 620], [14.85, 590], [15.15, 575], [15.55, 565],
  [16.05, 555], [16.45, 545], [16.95, 525], [17.25, 520], [17.6, 505],
  [18.1, 480], [18.75, 450], [19.3, 460], [20.1, 520], [20.55, 560],
  [20.832, 570],
]);

/** Altitude (m) du circuit à une position du tour, interpolée entre les repères. */
export function nordschleifeAltitudeAt(lapProgress, lengthKm = NORDSCHLEIFE_LENGTH_KM) {
  const safeLength = Number.isFinite(Number(lengthKm)) && Number(lengthKm) > 0 ? Number(lengthKm) : NORDSCHLEIFE_LENGTH_KM;
  const progress = clamp01(Number(lapProgress) || 0);
  const km = ((safeLength * progress) % safeLength + safeLength) % safeLength;
  const table = NORDSCHLEIFE_ALTITUDE_KM;
  if (km <= table[0][0]) return table[0][1];
  for (let index = 1; index < table.length; index += 1) {
    const [previousKm, previousAltitude] = table[index - 1];
    const [nextKm, nextAltitude] = table[index];
    if (km <= nextKm) {
      const t = (km - previousKm) / (nextKm - previousKm || 1);
      return Math.round(previousAltitude + (nextAltitude - previousAltitude) * t);
    }
  }
  return table[table.length - 1][1];
}

/**
 * Secteur d'un parcours à secteurs, pour n'importe quelle route officielle :
 * le dernier secteur se referme sur 1 pour que la ligne d'arrivée lui
 * appartienne encore.
 */
export function cityRushRouteSectorAt(lapProgress, route) {
  const progress = clamp01(Number(lapProgress) || 0);
  const sectors = route?.sectors || [];
  return sectors.find((sector) => progress >= sector.from && (progress < sector.to || sector.to <= sector.from))
    || sectors[sectors.length - 1]
    || null;
}

/**
 * Prochaine annonce au tableau de bord : le secteur signé le plus proche devant
 * la voiture, avec sa distance réelle en mètres (comme les panneaux d'approche
 * de la Shuto ou les panneaux blancs du Ring).
 */
export function cityRushRouteNextSign(lapProgress, route) {
  const progress = clamp01(Number(lapProgress) || 0);
  const sectors = route?.sectors || [];
  let best = null;
  for (const sector of sectors) {
    if (!sector.sign) continue;
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
    side: best.sector.side || 0,
    ahead: best.ahead,
    aheadM: Math.round(best.ahead * (route.lengthKm || 1) * 1000),
    sign: best.sector.sign,
  };
}

/** Lecture complète du tableau de bord du Nürburgring Nordschleife. */
export function nordschleifeReadout(lapProgress, route = CITY_RUSH_NORDSCHLEIFE) {
  const sector = cityRushRouteSectorAt(lapProgress, route);
  const surface = sector?.banked ? 'concrete' : sector?.kind === 'summit' || sector?.crest ? 'asphalte crête' : 'asphalte';
  return {
    km: nordschleifeKmAt(lapProgress, route.lengthKm),
    marker: route.marker,
    name: route.name,
    direction: route.direction,
    directionRomaji: route.directionRomaji,
    speedLimit: route.speedLimit,
    altitudeM: nordschleifeAltitudeAt(lapProgress, route.lengthKm),
    surface,
    sector: sector
      ? { id: sector.id, name: sector.name, romaji: sector.romaji, kind: sector.kind, note: sector.note || '', side: sector.side || 0 }
      : null,
    next: cityRushRouteNextSign(lapProgress, route),
  };
}

const ringSector = (id, fromKm, toKm, data) => Object.freeze({
  id,
  km: fromKm,
  kmEnd: toKm,
  from: nordschleifeAt(fromKm),
  to: nordschleifeAt(toKm),
  ...data,
});

export const CITY_RUSH_NORDSCHLEIFE = Object.freeze({
  id: 'nordschleife',
  marker: 'NS',
  name: 'NÜRBURGRING NORDSCHLEIFE',
  // Les noms de la « Grüne Hölle » sont ceux des lieux-dits de l'Eifel : ils ne
  // se traduisent pas. Le sous-titre donne en revanche le rôle du secteur dans
  // le tour, comme le panneau blanc que l'on croise au bord de la piste.
  romaji: 'DIE GRÜNE HÖLLE',
  direction: 'SENS HORAIRE',
  directionRomaji: 'CLOCKWISE',
  kmDirection: 'increase',
  lengthKm: NORDSCHLEIFE_LENGTH_KM,
  corners: NORDSCHLEIFE_CORNERS,
  // Circuit permanent : aucune limitation, mais une vitesse de pointe connue
  // sur la Döttinger Höhe — c'est elle que la plaque de route affiche.
  speedLimit: 300,
  speedUnit: 'km/h',
  speedLabel: 'V-MAX',
  opened: NORDSCHLEIFE_OPENED,
  origin: Object.freeze({ name: 'ANTONIUSBUCHE', romaji: 'KM 0 · BRIDGE TO GANTRY', note: 'le pont sur la piste, kilomètre zéro du tour' }),
  // Trente-cinq secteurs contigus, dans l'ordre réel de la course : leur union
  // couvre exactement un tour, si bien que le décor comme le HUD savent où l'on
  // se trouve sans ambiguïté. `side` est le côté réel du repère (+1 à droite,
  // -1 à gauche) pour un pilote qui tourne dans le sens horaire.
  sectors: Object.freeze([
    ringSector('antoniusbuche', 0, 0.65, {
      kind: 'straight', name: 'Antoniusbuche', romaji: 'KURVE 1 · 250 KM/H', side: 1,
      note: 'Kilomètre zéro, sous le pont de la route d\'Adenau ; la ligne du chrono « Bridge to Gantry ».',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Antoniusbuche km 0', 'Kurve 1 · 250 km/h']) }),
      bridge: Object.freeze({ name: 'Antoniusbuche-Brücke', spanM: 14 }),
    }),
    ringSector('tiergarten', 0.65, 1.4, {
      kind: 'straight', name: 'Tiergarten', romaji: 'KURVE 2–4 · START-ZIEL', side: -1,
      note: 'La longue ligne droite d\'arrivée et sa tribune T13, la Start-Ziel-Anlage historique.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Tiergarten', 'Kurven 2–4']) }),
      startArea: true,
    }),
    ringSector('hohenrain', 1.4, 1.95, {
      kind: 'straight', name: 'Hohenrain', romaji: 'PLEINE LIGNE · 200 KM/H', side: 1,
      note: 'La chicane a été retirée du tracé : la ligne qui ramène les voitures sur la boucle file désormais droite jusqu\'à Hatzenbach.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Hohenrain', 'Geradeaus']) }),
    }),
    ringSector('hatzenbach', 1.95, 3.0, {
      kind: 'corner', name: 'Hatzenbach', romaji: 'KURVEN 5–9 · LE RYTHME', side: -1,
      note: 'Le premier vrai enchaînement du Ring : gauche, droite, gauche, droite — celui qui donne le tour.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Hatzenbach', 'Kurven 5–9']) }),
      corner: Object.freeze({ direction: 'complex', number: 6 }),
    }),
    ringSector('hocheichen', 3.0, 3.4, {
      kind: 'corner', name: 'Hocheichen', romaji: 'KURVE 10 · À FOND', side: -1,
      note: 'Virage à gauche rapide, sous les chênes qui ont donné leur nom au secteur.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Hocheichen', 'Kurve 10']) }),
      corner: Object.freeze({ direction: 'left', number: 10 }),
    }),
    ringSector('quiddelbacher-hoehe', 3.4, 3.9, {
      kind: 'crest', name: 'Quiddelbacher Höhe', romaji: 'KRUPPE · LE PONT', side: 1,
      note: 'La crête : la piste franchit un pont, plonge et remonte — les roues avant décollent.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Quiddelbacher Höhe', 'Kruppe']), hazard: true }),
      crest: true,
    }),
    ringSector('flugplatz', 3.9, 4.7, {
      kind: 'crest', name: 'Flugplatz', romaji: 'KURVE 11 · DÉCOLLAGE', side: -1,
      note: 'L\'ancien terrain des planeurs, à gauche : le saut le plus célèbre du Ring, double apex à droite.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Flugplatz', 'Kurve 11']) }),
      corner: Object.freeze({ direction: 'right', number: 11 }), landmarkSide: -1,
      airfield: true,
    }),
    ringSector('kottenborn', 4.7, 5.05, {
      kind: 'corner', name: 'Kottenborn', romaji: 'KURVE 12 · GAUCHE', side: 1,
      note: 'Bosse tout en haut du plateau, avant la descente du Schwedenkreuz : la piste passe le sommet sans plier.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Kottenborn', 'Kurve 12']) }),
      corner: Object.freeze({ direction: 'left', number: 12 }),
    }),
    ringSector('schwedenkreuz', 5.05, 5.6, {
      kind: 'corner', name: 'Schwedenkreuz', romaji: 'KURVE 13 · 240 KM/H', side: -1,
      note: 'Gauche rapide en descente ; la croix de pierre de 1638 se dresse encore à droite de la piste.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Schwedenkreuz', 'Kurve 13']) }),
      corner: Object.freeze({ direction: 'left', number: 13 }),
      landmark: Object.freeze({ id: 'schwedenkreuz', name: 'SCHWEDENKREUZ', romaji: '1638', side: 1, km: 5.2 }),
      cross: true,
    }),
    ringSector('aremberg', 5.6, 6.1, {
      kind: 'corner', name: 'Aremberg', romaji: 'KURVE 14 · 90° DROITE', side: -1,
      note: 'Freinage le plus violent du début de tour, puis une droite en appui : la sortie compte plus que l\'entrée.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Aremberg', 'Kurve 14']), hazard: true }),
      corner: Object.freeze({ direction: 'right', number: 14 }),
      landmark: Object.freeze({ id: 'aremberg', name: 'AREMBERG', romaji: 'KURVE 14', side: 1, km: 5.8 }),
    }),
    ringSector('fuchsroehre', 6.1, 6.6, {
      kind: 'descent', name: 'Fuchsröhre', romaji: '−11 % · COMPRESSION', side: 1,
      note: 'Le « terrier du renard » : 11 % de descente à fond, puis la compression au fond du creux.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Fuchsröhre', 'Kurve 15']), hazard: true }),
      corner: Object.freeze({ direction: 'left', number: 15 }),
      landmark: Object.freeze({ id: 'fuchsroehre', name: 'FUCHSRÖHRE', romaji: '−11 %', side: -1, km: 6.2 }),
    }),
    ringSector('adenauer-forst', 6.6, 7.35, {
      kind: 'corner', name: 'Adenauer Forst', romaji: 'KURVEN 16–17 · PIÈGE', side: -1,
      note: 'Gauche puis droite serrée en forêt : le piège favori des spectateurs, à la sortie du creux.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Adenauer Forst', 'Kurven 16–17']), hazard: true }),
      corner: Object.freeze({ direction: 'right-left', number: 16 }),
    }),
    ringSector('metzgesfeld', 7.35, 7.9, {
      kind: 'corner', name: 'Metzgesfeld', romaji: 'KURVE 18 · GAUCHE', side: 1,
      note: 'Virage aveugle à gauche : la piste se dérobe derrière la crête.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Metzgesfeld', 'Kurve 18']) }),
      corner: Object.freeze({ direction: 'left', number: 18 }),
    }),
    ringSector('kallenhard', 7.9, 8.35, {
      kind: 'corner', name: 'Kallenhard', romaji: 'KURVE 19 · DROITE', side: -1,
      note: 'Droite en descente vers la vallée du Wehrseifen.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Kallenhard', 'Kurve 19']) }),
      corner: Object.freeze({ direction: 'right', number: 19 }),
    }),
    ringSector('spiegelkurve', 8.35, 8.75, {
      kind: 'corner', name: 'Spiegelkurve', romaji: 'DREIFACH-RECHTS', side: 1,
      note: 'Trois droites qui se referment l\'une sur l\'autre : le gauche du « Miss-Hit-Miss » est retiré du tracé, les trois droites filent l\'une après l\'autre.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Spiegelkurve', 'Dreifach-Rechts']) }),
      corner: Object.freeze({ direction: 'rights', number: 20 }),
    }),
    ringSector('wehrseifen', 8.75, 9.35, {
      kind: 'corner', name: 'Wehrseifen', romaji: 'KURVE 21 · ÉPINGLE', side: -1,
      note: 'Épingle à gauche la plus lente du secteur nord, en descente, entre deux murs.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Wehrseifen', 'Kurve 21']), hazard: true }),
      corner: Object.freeze({ direction: 'left', number: 21 }),
    }),
    ringSector('breidscheid', 9.35, 9.95, {
      kind: 'low', name: 'Breidscheid', romaji: 'POINT BAS · 320 M', side: 1,
      note: 'Le village et le point le plus bas du circuit : le pont de la L 92 enjambe la piste.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Breidscheid 320 m', 'Tiefster Punkt']) }),
      gate: true, village: true,
      bridge: Object.freeze({ name: 'Breidscheid-Brücke', spanM: 16 }),
    }),
    ringSector('exmuehle', 9.95, 10.3, {
      kind: 'corner', name: 'Ex-Mühle', romaji: 'KURVE 22 · RAMPE', side: -1,
      note: 'Rampe raide puis droite : l\'ancien moulin d\'Adenau marque la remontée vers le nord.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Ex-Mühle', 'Kurve 22']) }),
      corner: Object.freeze({ direction: 'right', number: 22 }),
    }),
    ringSector('lauda-links', 10.3, 10.65, {
      kind: 'corner', name: 'Lauda-Links', romaji: 'KURVE 23 · 1976', side: 1,
      note: 'Le gauche où Niki Lauda a brûlé en 1976 ; le dernier virage de la Formule 1 sur le Ring.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Lauda-Links', 'Kurve 23']) }),
      corner: Object.freeze({ direction: 'left', number: 23 }),
      landmark: Object.freeze({ id: 'lauda', name: 'NIKI LAUDA 1976', romaji: 'KURVE 23', side: 1, km: 10.4 }),
    }),
    ringSector('bergwerk', 10.65, 11.2, {
      kind: 'corner', name: 'Bergwerk', romaji: 'KURVE 24 · DROITE', side: 1,
      note: 'Droite qui se referme en montée : la vieille mine de plomb et d\'argent d\'où vient le nom.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Bergwerk', 'Kurve 24']), hazard: true }),
      corner: Object.freeze({ direction: 'right', number: 24 }),
    }),
    ringSector('kesselchen', 11.2, 12.1, {
      kind: 'climb', name: 'Kesselchen', romaji: '18 % · GAUCHE RAPIDE', side: -1,
      note: 'La cuvette puis l\'interminable montée à gauche : 18 %, la pente la plus forte du circuit.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Kesselchen', '18 % · Kurve 25']) }),
      corner: Object.freeze({ direction: 'left', number: 25 }), climb: true,
    }),
    ringSector('mutkurve', 12.1, 12.6, {
      kind: 'corner', name: 'Mutkurve', romaji: 'KURVE 26 · LE COURAGE', side: -1,
      note: 'Le « virage du courage » : gauche plein d\'élan tout en haut de la montée.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Mutkurve', 'Kurve 26']) }),
      corner: Object.freeze({ direction: 'left', number: 26 }),
    }),
    ringSector('klostertal', 12.6, 13.1, {
      kind: 'corner', name: 'Klostertal', romaji: 'KURVE 27 · DROITE', side: 1,
      note: 'Longue droite rapide dans le vallon du couvent, avant la Steilstrecke.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Klostertal', 'Kurve 27']) }),
      corner: Object.freeze({ direction: 'right', number: 27 }),
    }),
    ringSector('karussell', 13.1, 13.85, {
      kind: 'banked', name: 'Caracciola-Karussell', romaji: 'KURVE 28 · VIROLE', side: -1,
      note: 'L\'anneau de béton incliné à gauche, dalles et vibreurs : le virage le plus célèbre du sport automobile.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Karussell', 'Kurve 28']), hazard: true }),
      corner: Object.freeze({ direction: 'left', number: 28 }),
      landmark: Object.freeze({ id: 'karussell', name: 'KARUSSELL', romaji: 'KURVE 28', side: -1, km: 13.5 }),
      banked: true,
    }),
    ringSector('hohe-acht', 13.85, 14.5, {
      kind: 'summit', name: 'Hohe Acht', romaji: 'SOMMET · 620 M', side: 1,
      note: 'Le point culminant du circuit : la tour de l\'Eifel se voit de la piste.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Hohe Acht 620 m', 'Höchster Punkt']) }),
      corner: Object.freeze({ direction: 'right', number: 29 }),
      landmark: Object.freeze({ id: 'hohe-acht', name: 'HOHE ACHT 620 M', romaji: 'HÖCHSTER PUNKT', side: 1, km: 14.3 }),
      summit: true, tower: true,
    }),
    ringSector('hedwigshoehe', 14.5, 14.95, {
      kind: 'corner', name: 'Hedwigshöhe', romaji: 'KURVE 30 · DROITE', side: -1,
      note: 'Descente rapide vers l\'Eschbach, entre les sapins serrés.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Hedwigshöhe', 'Kurve 30']) }),
      corner: Object.freeze({ direction: 'right', number: 30 }),
    }),
    ringSector('wippermann', 14.95, 15.35, {
      kind: 'corner', name: 'Wippermann', romaji: 'KURVE 31 · BOSSES', side: -1,
      note: 'Ses bosses faisaient « basculer » les voitures ; c\'est de là que vient son nom.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Wippermann', 'Kurve 31']) }),
      corner: Object.freeze({ direction: 'right', number: 31 }),
    }),
    ringSector('eschbach', 15.35, 15.75, {
      kind: 'corner', name: 'Eschbach', romaji: 'KURVE 32 · PONT', side: 1,
      note: 'Gauche sous un pont, sur le ruisseau de l\'Eschbach.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Eschbach', 'Kurve 32']) }),
      corner: Object.freeze({ direction: 'left', number: 32 }),
      bridge: Object.freeze({ name: 'Eschbach-Brücke', spanM: 10 }),
    }),
    ringSector('bruennchen', 15.75, 16.55, {
      kind: 'corner', name: 'Brünnchen', romaji: 'KURVEN 33–34 · YOUTUBE', side: 1,
      note: 'Le « petit puits » : double droite en descente devant les talus où se massent les caméras.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Brünnchen', 'Kurven 33–34']) }),
      corner: Object.freeze({ direction: 'right', number: 33 }),
    }),
    ringSector('eiskurve', 16.55, 16.95, {
      kind: 'corner', name: 'Eiskurve', romaji: 'KURVE 35 · GAUCHE', side: -1,
      note: 'Le virage de glace : à l\'ombre des sapins, il gèle avant tout le reste du circuit.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Eiskurve', 'Kurve 35']) }),
      corner: Object.freeze({ direction: 'left', number: 35 }),
    }),
    ringSector('pflanzgarten', 16.95, 17.6, {
      kind: 'jump', name: 'Pflanzgarten', romaji: 'SPRUNGHÜGEL · LES SAUTS', side: 1,
      note: 'Les jardins du château : deux bosses où les voitures décollent, puis la double droite rapide.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Pflanzgarten', 'Kurven 36–37']), hazard: true }),
      corner: Object.freeze({ direction: 'right', number: 36 }), jumps: true,
    }),
    ringSector('stefan-bellof-s', 17.6, 18.1, {
      kind: 'corner', name: 'Stefan-Bellof-S', romaji: 'S DU RECORD · 1983', side: -1,
      note: 'Le gauche-droite où Stefan Bellof a signé son tour de 6:11 en 1983.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Stefan-Bellof-S', 'Kurve 38']) }),
      corner: Object.freeze({ direction: 'left', number: 38 }),
    }),
    ringSector('schwalbenschwanz', 18.1, 18.75, {
      kind: 'banked', name: 'Schwalbenschwanz', romaji: 'KURVE 39 · QUEUE D\'ARONDE', side: -1,
      note: 'La queue d\'aronde vue du ciel : gauche serrée puis le petit Karussell de béton.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Schwalbenschwanz', 'Kurven 39–40']), hazard: true }),
      corner: Object.freeze({ direction: 'left', number: 39 }),
      landmark: Object.freeze({ id: 'schwalbenschwanz', name: 'SCHWALBENSCHWANZ', romaji: 'KURVE 39', side: -1, km: 18.3 }),
      banked: true,
    }),
    ringSector('galgenkopf', 18.75, 19.3, {
      kind: 'corner', name: 'Galgenkopf', romaji: 'KURVE 41 · 200 KM/H', side: -1,
      note: 'La tête de potence : droite rapide en descente, dernière courbe avant la longue ligne droite.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Galgenkopf', 'Kurve 41']) }),
      corner: Object.freeze({ direction: 'right', number: 41 }),
    }),
    ringSector('doettinger-hoehe', 19.3, 20.55, {
      kind: 'straight', name: 'Döttinger Höhe', romaji: '2 135 M · 300 KM/H', side: 1,
      note: 'La plus longue ligne droite du circuit : le moteur décide, la vitesse de pointe parle.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Döttinger Höhe', '2 135 m']) }),
      gantry: true, straight: true,
    }),
    ringSector('start-ziel', 20.55, 20.832, {
      kind: 'straight', name: 'Start-Ziel', romaji: 'KURVE 42 · ARRIVÉE', side: -1,
      note: 'Retour sous le pont d\'Antoniusbuche : la ligne d\'arrivée de la Start-Ziel-Anlage.',
      sign: Object.freeze({ route: 'NS', lines: Object.freeze(['Start und Ziel', 'Kurve 42']) }),
      startArea: true,
    }),
  ]),
  // Tracé de mini-carte : 42 repères relevés dans OpenStreetMap (© les
  // contributeurs d'OpenStreetMap, ODbL), dans l'ordre du tour. Les points sont
  // donnés en kilomètres relatifs au centre de la boucle (x vers l'est, y vers
  // le sud, comme à l'écran) — comme le contour de la C1 de Tokyo. La polyligne
  // est plus courte que les 20,832 km réels : elle relie les seuls repères
  // nommés, sans les courbes intermédiaires.
  outlineKm: Object.freeze([
    [-0.09, 2.09], // km 0 · Antoniusbuche, pont sur la piste
    [-0.54, 2.47], // Tiergarten
    [-0.99, 2.78], // T13 · Start-Ziel-Anlage
    [-1.35, 2.76], // Hohenrain, la chicane
    [-1.77, 2.70], // Hatzenbach
    [-2.00, 2.58], // Hatzenbach · gauche
    [-2.21, 2.44], // Hocheichen
    [-2.57, 2.14], // Quiddelbacher Höhe, le pont
    [-2.68, 1.67], // Flugplatz
    [-2.83, 1.01], // Schwedenkreuz
    [-3.05, 0.59], // Aremberg, la pointe ouest
    [-2.68, 0.18], // Fuchsröhre
    [-2.31, -0.32], // Adenauer Forst
    [-2.05, -0.81], // Metzgesfeld
    [-2.05, -1.22], // Kallenhard
    [-1.97, -1.43], // Spiegelkurve
    [-1.80, -1.57], // Dreifach-Rechts
    [-1.51, -1.51], // Wehrseifen
    [-1.26, -1.51], // Breidscheid, point bas
    [-1.01, -1.55], // Ex-Mühle
    [-0.68, -1.83], // Lauda-Links
    [-0.26, -1.81], // Bergwerk
    [0.60, -1.15], // Kesselchen
    [1.14, -1.05], // Mutkurve
    [1.46, -1.18], // Klostertal
    [1.63, -1.09], // Steilstrecke
    [1.56, -0.95], // Caracciola-Karussell
    [1.76, -1.04], // sortie du Karussell
    [1.99, -1.24], // Hohe Acht, point haut
    [2.22, -1.30], // Hedwigshöhe
    [2.46, -1.43], // Wippermann
    [2.64, -1.31], // Eschbach
    [2.78, -1.04], // Brünnchen
    [2.84, -0.74], // Eiskurve
    [2.68, -0.58], // Pflanzgarten
    [2.46, -0.23], // Sprunghügel
    [2.22, 0.18], // Stefan-Bellof-S
    [1.97, 0.39], // Schwalbenschwanz
    [1.57, 0.52], // Kleines Karussell
    [1.27, 0.61], // Galgenkopf
    [1.46, 0.95], // Döttinger Höhe
    [1.00, 1.38], // Döttinger Höhe · 1 000 m
    [0.34, 1.82], // Döttinger Höhe · Hohenrain 500 m
  ]),
});

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
/**
 * Forme de mini-carte bâtie sur une polyligne fermée, en kilomètres relatifs au
 * centre du tracé : chaque point porte sa position, la longueur cumulée sert à
 * retrouver un point par interpolation et `at()` fournit la position comme la
 * tangente, exactement comme la boucle générique.
 */
function polylineTrackShape(id, points) {
  const cumulative = [0];
  for (let index = 1; index <= points.length; index += 1) {
    const previous = points[index - 1];
    const next = points[index % points.length];
    cumulative.push(cumulative[index - 1] + Math.hypot(next[0] - previous[0], next[1] - previous[1]));
  }
  const total = cumulative[points.length];
  return {
    id,
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
      const norm = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return {
        centerX: a[0] + (b[0] - a[0]) * t,
        centerY: a[1] + (b[1] - a[1]) * t,
        tangentX: (b[0] - a[0]) / norm,
        tangentY: (b[1] - a[1]) / norm,
      };
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

export function cityRushMinimapTrackShape(cityId) {
  if (cityId === 'nordschleife') {
    // Le tracé réel du Ring, relevé dans OpenStreetMap (© les contributeurs
    // d'OpenStreetMap, ODbL) : la longue descente sud vers Breidscheid puis
    // l'épingle est du Karussell, comme sur une carte du circuit.
    return polylineTrackShape('nordschleife', CITY_RUSH_NORDSCHLEIFE.outlineKm);
  }
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
    // Le Japon roule à gauche : la course tient la moitié gauche de la C1 et le
    // trafic venant en face arrive par la droite (voir `cityRushDriveSide`).
    driveSide: 'left',
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
    // Le Royaume-Uni roule à gauche : les trois voies de course sont à gauche
    // de l'axe et le contresens arrive par la droite.
    driveSide: 'left',
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
// ── Nürburgring Nordschleife ────────────────────────────────────────────────
// Le circuit permanent se joue en sens unique, à deux voies resserrées autour
// de l'axe (8,40 m de bitume utile au lieu des 13,40 m de l'autoroute
// urbaine) : plus de trafic en face, un décor de forêt, de bas-côtés herbeux,
// de glissières et de panneaux allemands, et le tour réel rejoué secteur par
// secteur — Hatzenbach, Flugplatz, Aremberg, Fuchsröhre, Bergwerk, Karussell,
// Hohe Acht, Brünnchen, Döttinger Höhe.
export const CITY_RUSH_NORDSCHLEIFE_COURSE = Object.freeze({
  ...CITY_RUSH_NORDSCHLEIFE,
  label: 'ALLEMAGNE · EIFEL · RHÉNANIE-PALATINAT',
  district: 'NÜRBURGRING · GRÜNE HÖLLE',
  tagline: '20,832 km, 73 virages, 300 m de dénivelé : la Grüne Hölle.',
  accent: '#d7b049',
  secondary: '#5f8f4a',
  background: 0x8fb6cf,
  fog: 0xc9d7c4,
  asphalt: 0x4a4a4c,
  sidewalk: 0x4f7a3c,
  buildingColors: Object.freeze([0xb8b0a2, 0x8f8878, 0xc9c2b0, 0x7d7566, 0xa39a86]),
  windowColor: 0x50606a,
  skyTop: 0x3f7fbe,
  skyGlow: 0xf3d9a4,
  style: 'nordschleife',
  // Quatre voies dans le même sens, aucun véhicule en face : un circuit, pas
  // une route. Les voies occupent le cœur de la grille urbaine (∓1,05 m et
  // ∓3,15 m), soit exactement la largeur de bitume du Ring.
  laneCount: 4,
  oncomingCount: 0,
  // Sur la piste, le trafic est celui d'une journée de tourisme : une voiture
  // médicale, une berline de police (la Nordschleife en voit pendant les
  // Touristenfahrten) et une GT de passage. Pas de camion-poubelle.
  trafficTypes: Object.freeze(['ambulance', 'police', 'white-lambo']),
  // Trafic volontairement réduit à deux véhicules lents — un par voie — pour
  // laisser respirer les enchaînements : sur une piste à deux voies, un
  // troisième véhicule condamne une voie et l'escouade de police du dernier
  // tour ne peut plus revenir sur le leader.
  trafficCount: 2,
  raceway: true,
  // Rythme plus posé qu'en ville : 73 virages sur une piste étroite se lisent
  // mieux à ~107 km/h qu'à 126. Tout le plateau est ralenti dans la même
  // proportion (`cityRushCoursePace`), donc rien ne devient plus facile — la
  // course dure simplement un peu plus longtemps à distance égale.
  pace: CITY_RUSH_RACEWAY_PACE,
  signs: Object.freeze(['NORDSCHLEIFE', 'EINFAHRT', 'DÖTTINGER HÖHE', 'GRÜNE HÖLLE', 'NÜRBURGRING']),
  route: CITY_RUSH_NORDSCHLEIFE,
});

export const CITY_RUSH_COURSES = Object.freeze([...CITY_RUSH_CITIES, CITY_RUSH_ROUTE_66, CITY_RUSH_MEXICO_COUNTRYSIDE, CITY_RUSH_NORDSCHLEIFE_COURSE]);

export function clampCityRushLane(lane, laneCount = CITY_RUSH_LANE_X.length) {
  const parsed = Number.isFinite(Number(lane)) ? Math.trunc(Number(lane)) : 0;
  return Math.max(0, Math.min(laneCount - 1, parsed));
}

// ── Sens de circulation ─────────────────────────────────────────────────────
// La plupart des parcours se roulent à droite : la course tient la moitié
// droite de la chaussée et le trafic vient en face par la gauche. Les deux
// parcours qui se jouent dans un pays où l'on roule à gauche — **Londres** et
// la **Shuto Expressway Route 1 de Tokyo** — portent `driveSide: 'left'` : les
// trois voies de course passent à gauche de l'axe jaune et le contresens
// arrive par la droite. Un circuit à sens unique (le Ring) ignore ce champ,
// faute de trafic en face.
export const CITY_RUSH_DRIVE_SIDES = Object.freeze(['right', 'left']);

/**
 * Côté de circulation d'un parcours, accepté sous forme d'objet (une entrée de
 * `CITY_RUSH_COURSES`) ou d'identifiant (`'london'`, `'tokyo'`…) : `'right'`
 * par défaut, `'left'` pour les parcours qui roulent à gauche.
 */
export function cityRushDriveSide(course = null) {
  const resolved = typeof course === 'string'
    ? CITY_RUSH_COURSES.find((entry) => entry.id === course) || null
    : course;
  return resolved?.driveSide === 'left' ? 'left' : 'right';
}

// ── Rythme du parcours ──────────────────────────────────────────────────────
// Un parcours peut porter `pace` : le multiplicateur appliqué à tout ce qui
// roule sur lui. Seule la Nordschleife l'utilise aujourd'hui
// (`CITY_RUSH_RACEWAY_PACE`) ; les villes et les routes ouvertes n'ont pas le
// champ et gardent le rythme historique.

/**
 * Multiplicateur de vitesse d'un parcours, accepté sous forme d'objet (une
 * entrée de `CITY_RUSH_COURSES`) ou d'identifiant (`'nordschleife'`,
 * `'vice-city'`…) : `1` par défaut, borné à [`CITY_RUSH_COURSE_PACE_MIN`, 1] —
 * un parcours ralentit la course, il ne l'accélère jamais.
 */
export function cityRushCoursePace(course = null) {
  const resolved = typeof course === 'string'
    ? CITY_RUSH_COURSES.find((entry) => entry.id === course) || null
    : course;
  const pace = Number(resolved?.pace);
  if (!Number.isFinite(pace) || pace <= 0) return 1;
  return Math.min(1, Math.max(CITY_RUSH_COURSE_PACE_MIN, pace));
}

/** Vitesse (m/s) une fois le rythme du parcours appliqué. */
export function cityRushPacedSpeed(speed = 0, course = null) {
  const value = Number(speed);
  if (!Number.isFinite(value)) return 0;
  return value * cityRushCoursePace(course);
}

// ── Voies du parcours ───────────────────────────────────────────────────────
// Les cinq villes et les routes ouvertes gardent les six voies historiques à
// double sens. Un circuit permanent (le Nürburgring Nordschleife) roule en sens
// unique : `laneCount` resserre alors la grille autour de l'axe de la piste, et
// `oncomingLanes` se vide — plus personne n'arrive de face.
export function cityRushLaneCount(course) {
  const count = Math.trunc(Number(course?.laneCount));
  if (!Number.isFinite(count) || count < 1) return CITY_RUSH_LANE_X.length;
  return Math.max(1, Math.min(CITY_RUSH_LANE_X.length, count));
}

/**
 * Abscisse (en mètres) d'une voie. Sur un parcours à double sens, les six voies
 * gardent exactement leurs positions historiques (de −5,25 m à +5,25 m ; c'est
 * le *rôle* de chaque moitié — course ou contresens — qui change selon le pays,
 * jamais l'abscisse). Sur un circuit à sens unique, les voies se
 * répartissent symétriquement autour de l'axe, au pas de 2,10 m : les quatre
 * voies du Ring tombent ainsi exactement sur les quatre voies intérieures de la
 * grille urbaine (∓1,05 m et ∓3,15 m), c'est-à-dire la largeur de bitume réelle
 * d'une piste de circuit.
 */
export function cityRushLaneX(lane, laneCount = CITY_RUSH_LANE_X.length) {
  const index = clampCityRushLane(lane, laneCount);
  if (laneCount >= CITY_RUSH_LANE_X.length) return CITY_RUSH_LANE_X[index];
  const centered = (index - (laneCount - 1) / 2) * CITY_RUSH_LANE_WIDTH;
  // Deux voies centrées tombent exactement sur les deux voies intérieures de
  // la grille urbaine (∓1,05 m) : rien ne bouge pour un parcours resserré.
  return centered;
}

/**
 * Toutes les voies d'un parcours, prêtes à l'emploi pour le monde 3D : sens de
 * circulation, nombre de voies, abscisse de chacune, voies du sens de course,
 * voies en sens inverse (vides sur un circuit), voies de la grille de départ et
 * voies de police. Sur un parcours en conduite à gauche (Londres, Tokyo), les
 * deux moitiés sont simplement échangées : la course passe à gauche de l'axe
 * jaune et le contresens à droite.
 */
export function cityRushLaneConfig(course) {
  const laneCount = cityRushLaneCount(course);
  const driveSide = cityRushDriveSide(course);
  const leftHand = driveSide === 'left';
  const raceway = laneCount < CITY_RUSH_LANE_X.length;
  const laneX = (lane) => cityRushLaneX(lane, laneCount);
  if (!raceway) {
    const forwardLanes = leftHand ? CITY_RUSH_LEFT_HALF_LANES : CITY_RUSH_FORWARD_LANES;
    return {
      laneCount,
      raceway: false,
      driveSide,
      laneX,
      roadHalf: CITY_RUSH_ROAD_HALF_WIDTH,
      roadWidth: CITY_RUSH_ROAD_WIDTH,
      lanes: Object.freeze(Array.from({ length: laneCount }, (_, lane) => lane)),
      forwardLanes,
      oncomingLanes: leftHand ? CITY_RUSH_RIGHT_HALF_LANES : CITY_RUSH_ONCOMING_LANES,
      // Les berlines de l'escouade chassent dans le sens de la course, jamais
      // sur les voies du contresens.
      policeLanes: leftHand ? CITY_RUSH_LEFT_HALF_LANES : CITY_RUSH_POLICE_LANES,
      defaultLanes: leftHand ? CITY_RUSH_DEFAULT_LANES_LEFT_HAND : CITY_RUSH_DEFAULT_LANES,
      gridLanes: CITY_RUSH_LANE_X,
    };
  }
  const lanes = Object.freeze(Array.from({ length: laneCount }, (_, lane) => lane));
  // Sur une piste étroite, les berlines de police partent des deux extrémités
  // de la grille et la meute se répartit en alternance.
  const policeLanes = Object.freeze(laneCount > 1 ? [0, laneCount - 1] : [0]);
  return {
    laneCount,
    raceway: true,
    // Un circuit à sens unique n'a pas de contresens : le côté de conduite n'y
    // change rien, et `oncomingLanes` reste vide.
    driveSide,
    laneX,
    roadHalf: CITY_RUSH_RACEWAY_ROAD_HALF,
    roadWidth: CITY_RUSH_RACEWAY_ROAD_WIDTH,
    lanes,
    forwardLanes: lanes,
    oncomingLanes: Object.freeze([]),
    policeLanes,
    // La grille de départ alterne gauche/droite comme les vraies grilles de
    // circuit : chaque rangée décale la voiture d'une demi-voie.
    defaultLanes: Object.freeze(Array.from({ length: Math.max(laneCount, CITY_RUSH_RACER_SLOTS.length) }, (_, index) => index % laneCount)),
    gridLanes: lanes,
  };
}

// ── Marquage au sol des voies ───────────────────────────────────────────────
// Les voies ne sont pas qu'une grille de simulation : elles sont peintes sur le
// bitume. Une ligne blanche discontinue sépare deux voies voisines, exactement
// à mi-chemin de leurs abscisses — les six voies urbaines gardent ainsi leurs
// séparateurs historiques (∓2,10 m et ∓4,20 m, plus l'axe central) et la piste
// du Ring se découpe en ses quatre voies de 2,10 m (−2,10 m, 0 et +2,10 m).
export const CITY_RUSH_LANE_PAINT_WIDTH = 0.16; // m : largeur peinte d'une ligne de voie

/**
 * Abscisses (en mètres) des lignes qui séparent deux voies voisines, de gauche
 * à droite. Une ligne tombe toujours au milieu de la paire : une voiture qui
 * change de voie la franchit donc à la moitié exacte de son décalage.
 */
export function cityRushLaneSeparators(course) {
  const laneCount = cityRushLaneCount(course);
  const laneX = (lane) => cityRushLaneX(lane, laneCount);
  return Object.freeze(Array.from(
    { length: Math.max(0, laneCount - 1) },
    (_, lane) => (laneX(lane) + laneX(lane + 1)) / 2,
  ));
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
// 1 200 + 1 200 + 2 400 = 4 800 m.
export function cityRushRaceDistance(laps = CITY_RUSH_LAPS, lapLength = CITY_RUSH_LAP_LENGTH, finalLapLoops = CITY_RUSH_FINAL_LAP_LOOPS) {
  const safeLap = Math.max(1, Number(lapLength) || CITY_RUSH_LAP_LENGTH);
  return (safeLapCount(laps) - 1 + safeFinalLapLoops(finalLapLoops)) * safeLap;
}

// Longueur du tour `lap` (1 … laps) : une boucle, sauf le dernier tour.
export function cityRushLapLength(lap, laps = CITY_RUSH_LAPS, lapLength = CITY_RUSH_LAP_LENGTH, finalLapLoops = CITY_RUSH_FINAL_LAP_LOOPS) {
  const safeLap = Math.max(1, Number(lapLength) || CITY_RUSH_LAP_LENGTH);
  return (Number(lap) || 1) >= safeLapCount(laps) ? safeLap * safeFinalLapLoops(finalLapLoops) : safeLap;
}

/**
 * Repères des deux entrepôts de bazooka, sur toutes les cartes : 30 % puis
 * 65 % de la distance totale de la course. Le premier précède le garage de
 * vie de mi-course (50 %), le second le suit. Les distances sont absolues —
 * le décor se répète tous les `lapLength` mètres, si bien que chaque entrepôt
 * se pose n'importe où dans le parcours.
 */
export function cityRushBazookaTrackDistances({
  laps = CITY_RUSH_LAPS,
  lapLength = CITY_RUSH_LAP_LENGTH,
  finalLapLoops = CITY_RUSH_FINAL_LAP_LOOPS,
} = {}) {
  const total = cityRushRaceDistance(laps, lapLength, finalLapLoops);
  return Object.freeze(CITY_RUSH_BAZOOKA_PICKUP_SHARES.map((share) => total * share));
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
// dernier tour la jauge court sur toute sa longueur (2 400 m), pas sur une
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


// ── Profil de piste du Nordschleife (rendu) ────────────────────────────────
// Les villes se contentent de deux grands S très doux ; le Ring, lui, est une
// succession de virages que le pilote sent vraiment. On intègre donc la
// courbure réelle du tracé : chaque virage est décrit par son point
// kilométrique, son angle total (positif à droite), son étendue et la *forme*
// de son appui — une cloche de courbure nulle à ses extrémités, si bien que
// deux virages voisins se raccordent sans cassure. La première intégration
// donne le cap, la seconde le déport latéral de la piste. Le profil est ensuite
// refermé — cap, déport, altitude et pente valent zéro à 0 m comme au bout du
// tour — pour que la boucle suivante repasse sous le portique sans saut,
// exactement comme un tour de circuit qui repasse sur la ligne.
//
// Quatre formes d'appui, choisies par le quatrième élément de chaque entrée
// (`nordschleifeCornerCurve`) :
//   • `'smooth'` (défaut) — la cloche lisse d'origine : l'appui monte, culmine
//     et redescend ; c'est la courbe rapide qu'on effleure.
//   • `'sustained'` — l'appui tenu : la courbure reste à son maximum sur la
//     moitié centrale du virage. C'est le **long virage qui tourne presque
//     sec** : le volant reste braqué du début à la fin, comme un long appui au
//     limiteur d'adhérence, au lieu de s'ouvrir puis de se refermer.
//   • `'tightening'` — la longue entrée douce qui se resserre : 45 % de l'angle
//     dans une cloche large, 55 % dans une cassure étroite placée vers la
//     sortie. Le tracé s'ouvre en courbe douce, puis se referme d'un coup —
//     le « presque sec » d'un virage qui se durcit quand on croit l'avoir pris.
//   • `'snap'` — la cassure seule, très concentrée : chicane, épingle, virole
//     du Karussell, là où le volant fait l'essentiel de l'angle sur quelques
//     mètres.
//
// Échelle : 1:17 sur la longueur (20,832 km → 1 200 m), comme la C1 de Tokyo.
// Courbure et relief sont volontairement amplifiés pour rester lisibles à cette
// échelle : le vrai Karussell (48°) devient le virage le plus serré du jeu et
// les 300 m de dénivelé du Ring se voient à l'horizon, quand bien même ils ne
// peuvent pas dépasser 10 % de pente à l'écran sans casser la lecture du
// trafic. Les deux échelles sont calculées, pas devinées : elles découlent du
// déport maximal et de la pente maximale déclarés ci-dessous.
export const CITY_RUSH_NORDSCHLEIFE_PROFILE_STEPS = 2400;
// 18 unités monde : les longs appuis du Ring ont besoin de toute la largeur du
// ruban (l'ancien profil se contentait de 15 unités et plafonnait à 14° de cap).
export const CITY_RUSH_NORDSCHLEIFE_MAX_OFFSET = 18;
export const CITY_RUSH_NORDSCHLEIFE_MAX_GRADE = 0.1; // 10 % de pente visible (18 % réels)

/**
 * Forme de la cloche de courbure d'un virage, échantillonnée sur `offset`
 * (-1 → entrée, 0 → sommet, +1 → sortie). La valeur est nulle (et de pente
 * nulle) aux deux extrémités : deux virages voisins se raccordent donc sans
 * cassure de cap. Chaque forme est normalisée à une aire de 1 : l'angle annoncé
 * dans `CITY_RUSH_NORDSCHLEIFE_TURNS` est donc exactement l'angle dont le
 * virage fait tourner le cap, quelle que soit la forme choisie. Voir la
 * description des quatre formes ci-dessus.
 */
export function nordschleifeCornerCurve(offset, shape = 'smooth') {
  const u = Number(offset) || 0;
  if (u <= -1 || u >= 1) return 0;
  if (shape === 'sustained') {
    // Appui tenu : rampe en cosinus jusqu'au maximum, plateau sur la moitié
    // centrale, rampe symétrique en sortie.
    const raw = u <= -0.5
      ? 0.5 * (1 - Math.cos(2 * Math.PI * (u + 1)))
      : u >= 0.5 ? 0.5 * (1 - Math.cos(2 * Math.PI * (1 - u))) : 1;
    return raw / 1.5;
  }
  if (shape === 'tightening') {
    // Entrée douce (45 % de l'angle) puis cassure étroite vers la sortie
    // (55 %), centrée à 18 % de l'étendue : le virage se resserre.
    const wide = 0.45 * 0.5 * (1 + Math.cos(Math.PI * u));
    const narrow = (u - 0.18) / 0.34;
    const sharp = narrow <= -1 || narrow >= 1 ? 0 : 0.55 * 0.5 * (1 + Math.cos(Math.PI * narrow));
    return (wide + sharp) / 0.637;
  }
  if (shape === 'snap') {
    // Cassure seule : tout l'angle sur 35 % de l'étendue, au sommet.
    const narrow = u / 0.35;
    return (narrow <= -1 || narrow >= 1 ? 0 : 0.5 * (1 + Math.cos(Math.PI * narrow))) / 0.35;
  }
  return 0.5 * (1 + Math.cos(Math.PI * u));
}

// km réel, angle du virage (°, + à droite), étendue (km), forme de l'appui.
// Les virages du Ring ne sont plus des cloches timides : les longues courbes
// (Hatzenbach, Hocheichen, Schwedenkreuz, Fuchsröhre, Kesselchen, Pflanzgarten,
// Stefan-Bellof-S…) prennent la forme `'sustained'` — le cap y reste à 12-20°
// pendant 60 à 120 m de piste, soit près d'une à deux secondes de volant
// braqué —, les virages qui se resserrent (Aremberg, Metzgesfeld, Wehrseifen,
// Bergwerk, Mutkurve, Brünnchen, Schwalbenschwanz…) la forme `'tightening'`, et
// les deux cassures — l'épingle d'Adenauer Forst et la virole du Karussell — la
// forme `'snap'`. L'étendue des virages lents est élargie par rapport au réel
// (le Karussell passe de 200 m à 450 m de relevé) pour que leur rayon reste
// jouable à l'échelle 1:17, et la courbure d'une cassure est de toute façon
// bornée par le rayon minimal que le ruban peut épouser sans se replier :
// c'est l'adaptation annoncée, pas un oubli.
//
// **La table ne garde que les grands virages.** Les petits zigzags du relevé
// ont été retirés du tracé, pas adoucis : les oscillations de la ligne de
// départ (Antoniusbuche, Tiergarten, Sabine-Schmitz, la T13 et la chicane de
// Hohenrain), la bosse de Quiddelbacher Höhe, le gauche de Kottenborn, le
// gauche du « Miss-Hit-Miss » à la Spiegelkurve, la cuvette de Breidscheid et
// l'ouverture de la Döttinger Höhe ne comptaient que 9 à 35 m de piste chacun
// — un zébru de volant entre deux virages, jamais un virage. Il ne reste donc
// que les 31 virages nommés du tour, tous d'au moins 16°, et la ligne de
// départ file droite du pont d'Antoniusbuche jusqu'à l'entrée de Hatzenbach.
// Le cap et le déport restent refermés sur la boucle par la correction de
// dérive calculée plus bas : retirer ces virages ne décale pas la boucle, cela
// l'assagit — chaque grand virage garde son angle, la piste respire entre eux.
export const CITY_RUSH_NORDSCHLEIFE_TURNS = Object.freeze([
  // ── Hatzenbach : le long enchaînement qui donne le tour ───────────────────
  // La ligne de départ (km 0 → 1,95) est franche : plus un seul virage entre le
  // portique et Hatzenbach, ni à Antoniusbuche, ni à la T13, ni à Hohenrain.
  Object.freeze([2.15, -24, 0.50, 'sustained']), // Hatzenbach 1 : long gauche tenu
  Object.freeze([2.62, 26, 0.50, 'sustained']), // Hatzenbach 2 : long droit tenu
  Object.freeze([3.06, -22, 0.36, 'sustained']), // Hatzenbach 3 : long gauche tenu
  Object.freeze([3.40, -16, 0.30, 'sustained']), // Hocheichen : gauche à fond sous les chênes
  Object.freeze([4.30, 22, 0.60, 'tightening']), // Flugplatz : s'ouvre après le saut, puis casse
  Object.freeze([5.25, -22, 0.40, 'sustained']), // Schwedenkreuz : long gauche rapide en descente
  Object.freeze([5.85, 40, 0.50, 'tightening']), // Aremberg : longue entrée, cassure à 90°
  Object.freeze([6.40, -28, 0.55, 'sustained']), // Fuchsröhre : le long gauche à −11 %
  Object.freeze([6.90, 28, 0.30, 'sustained']), // Adenauer Forst 1 : le droit tenu
  Object.freeze([7.20, -24, 0.30, 'snap']), // Adenauer Forst 2 : l'épingle du piège
  Object.freeze([7.60, -18, 0.35, 'tightening']), // Metzgesfeld : gauche aveugle qui se resserre
  Object.freeze([8.05, 24, 0.40, 'sustained']), // Kallenhard : long droit en descente
  Object.freeze([8.70, 28, 0.35, 'sustained']), // Dreifach-Rechts : les trois droites tenues
  Object.freeze([9.05, -34, 0.40, 'tightening']), // Wehrseifen : l'épingle la plus lente
  Object.freeze([10.05, 18, 0.25, 'sustained']), // Ex-Mühle : le droit de la rampe
  Object.freeze([10.45, -22, 0.30, 'tightening']), // Lauda-Links : le gauche de 1976
  Object.freeze([10.95, 26, 0.45, 'tightening']), // Bergwerk : le droit qui se referme
  Object.freeze([11.80, -26, 0.90, 'sustained']), // Kesselchen : la grande montée à gauche
  Object.freeze([12.40, -26, 0.40, 'tightening']), // Mutkurve : le virage du courage
  Object.freeze([12.80, 18, 0.30, 'sustained']), // Klostertal : le droit du vallon
  Object.freeze([13.50, -48, 0.45, 'snap']), // Karussell : la virole de béton
  Object.freeze([14.30, 18, 0.35, 'tightening']), // Hohe Acht : le droit du sommet (620 m)
  Object.freeze([14.70, 16, 0.22, 'sustained']), // Hedwigshöhe : le droit tenu
  Object.freeze([15.15, 18, 0.24, 'sustained']), // Wippermann : le droit bosselé
  Object.freeze([15.55, -18, 0.30, 'tightening']), // Eschbach : le gauche du pont
  Object.freeze([16.15, 24, 0.60, 'tightening']), // Brünnchen : le long droit qui se resserre
  Object.freeze([16.75, -18, 0.25, 'sustained']), // Eiskurve : le gauche sous les sapins
  Object.freeze([17.25, 22, 0.45, 'sustained']), // Pflanzgarten : le droit des sauts
  Object.freeze([17.85, -22, 0.35, 'sustained']), // Stefan-Bellof-S : le gauche du record
  Object.freeze([18.50, -34, 0.50, 'tightening']), // Schwalbenschwanz : la queue d'aronde
  Object.freeze([19.00, 22, 0.35, 'sustained']), // Galgenkopf : le droit de la potence
  // ── Döttinger Höhe : la ligne droite, sans l'ouverture du relevé ─────────
  // Le −5° qui faisait dériver la piste en sortie de Galgenkopf est retiré : la
  // ligne de 2 135 m se prend désormais droite jusqu'au portique d'arrivée.
]);
const nordschleifeProfile = (() => {
  const steps = CITY_RUSH_NORDSCHLEIFE_PROFILE_STEPS;
  const ds = CITY_RUSH_LAP_LENGTH / steps;
  const unitsPerKm = CITY_RUSH_LAP_LENGTH / NORDSCHLEIFE_LENGTH_KM;
  const wrapDelta = (delta) => {
    let value = delta;
    if (value > CITY_RUSH_LAP_LENGTH / 2) value -= CITY_RUSH_LAP_LENGTH;
    if (value < -CITY_RUSH_LAP_LENGTH / 2) value += CITY_RUSH_LAP_LENGTH;
    return value;
  };
  // Courbure (radians par unité de piste) d'une échelle donnée.
  const curvature = (scale) => {
    const table = new Float64Array(steps);
    for (const [km, angleDeg, spanKm, shape = 'smooth'] of CITY_RUSH_NORDSCHLEIFE_TURNS) {
      const centre = km * unitsPerKm;
      const half = (spanKm * unitsPerKm) / 2;
      // `peak` est la hauteur de la cloche de référence : quelle que soit la
      // forme, l'aire sous la courbe vaut l'angle du virage, si bien que la
      // somme des angles du tour ne change pas avec la forme choisie.
      const peak = (scale * ((angleDeg * Math.PI) / 180)) / (half * 2);
      for (let index = 0; index < steps; index += 1) {
        const delta = wrapDelta(index * ds - centre);
        if (Math.abs(delta) >= half) continue;
        table[index] += peak * nordschleifeCornerCurve(delta / half, shape);
      }
    }
    return table;
  };
  // Double intégration, puis retrait de la dérive linéaire : cap et déport
  // reviennent exactement à zéro à la ligne.
  const integrate = (scale) => {
    const table = curvature(scale);
    const heading = new Float64Array(steps);
    const offset = new Float64Array(steps);
    let h = 0;
    let x = 0;
    for (let index = 0; index < steps; index += 1) {
      h += table[index] * ds;
      x += h * ds;
      heading[index] = h;
      offset[index] = x;
    }
    // La somme discrète s'arrête au dernier pas (m = longueur − ds) : on
    // prolonge d'un pas pour refermer le tour sur sa valeur exacte. Sans ce
    // pas, la correction laissait une marche de `cap final × ds` à la ligne
    // d'arrivée — invisible avec les 5° de la première table, bien visible
    // avec les longs appuis du Ring (0,28 unité, soit un décrochement du
    // ruban de 3 % de sa largeur, juste sous le portique).
    const headingEnd = h;
    const offsetEnd = x + h * ds;
    const headingDrift = headingEnd / CITY_RUSH_LAP_LENGTH;
    const offsetDrift = (offsetEnd - (headingDrift * CITY_RUSH_LAP_LENGTH * CITY_RUSH_LAP_LENGTH) / 2) / CITY_RUSH_LAP_LENGTH;
    for (let index = 0; index < steps; index += 1) {
      const metre = index * ds;
      heading[index] -= headingDrift * metre;
      offset[index] -= offsetDrift * metre + (headingDrift * metre * metre) / 2;
    }
    return { heading, offset };
  };
  // Le déport est linéaire en échelle : une première passe suffit à la choisir.
  const probe = integrate(1).offset;
  let probeMax = 0;
  for (let index = 0; index < steps; index += 1) probeMax = Math.max(probeMax, Math.abs(probe[index]));
  const scale = CITY_RUSH_NORDSCHLEIFE_MAX_OFFSET / Math.max(1e-6, probeMax);
  const { heading, offset } = integrate(scale);
  // Relief : le relevé réel du tour (Breidscheid 320 m, Hohe Acht 620 m), lissé
  // à la même cadence, puis remis à l'échelle pour plafonner la pente visible.
  const altitudeAt = (metre) => {
    const km = (metre / CITY_RUSH_LAP_LENGTH) * NORDSCHLEIFE_LENGTH_KM;
    const table = NORDSCHLEIFE_ALTITUDE_KM;
    if (km <= table[0][0]) return table[0][1];
    for (let index = 1; index < table.length; index += 1) {
      const [previousKm, previousAltitude] = table[index - 1];
      const [nextKm, nextAltitude] = table[index];
      if (km <= nextKm) {
        const t = (km - previousKm) / (nextKm - previousKm || 1);
        const eased = t * t * (3 - 2 * t);
        return previousAltitude + (nextAltitude - previousAltitude) * eased;
      }
    }
    return table[table.length - 1][1];
  };
  const elevation = new Float64Array(steps);
  const grade = new Float64Array(steps);
  const buildElevation = (reliefScale) => {
    // Pente par différence avant : le tour se referme sur lui-même, si bien que
    // la pente reste continue au passage de la ligne.
    let rise = 0;
    for (let index = 0; index < steps; index += 1) {
      const next = altitudeAt(((index + 1) % steps) * ds) * reliefScale;
      grade[index] = (next - altitudeAt(index * ds) * reliefScale) / ds;
      rise += grade[index] * ds;
    }
    // Le relevé réel ne revient pas exactement à son altitude de départ : on
    // retire d'abord la dérive de pente, puis celle de hauteur.
    const gradeDrift = rise / CITY_RUSH_LAP_LENGTH;
    let altitudeSum = 0;
    for (let index = 0; index < steps; index += 1) {
      grade[index] -= gradeDrift;
      altitudeSum += grade[index] * ds;
    }
    const altitudeDrift = altitudeSum / CITY_RUSH_LAP_LENGTH;
    let cursor = 0;
    for (let index = 0; index < steps; index += 1) {
      cursor += grade[index] * ds;
      elevation[index] = cursor - altitudeDrift * index * ds;
    }
  };
  buildElevation(1);
  let gradeMax = 0;
  for (let index = 0; index < steps; index += 1) gradeMax = Math.max(gradeMax, Math.abs(grade[index]));
  const reliefScale = CITY_RUSH_NORDSCHLEIFE_MAX_GRADE / Math.max(1e-6, gradeMax);
  buildElevation(reliefScale);
  return Object.freeze({ steps, ds, heading, offset, elevation, grade, curvatureScale: scale, reliefScale });
})();

/** Déport latéral (unités monde) de la piste du Ring à une distance du tour. */
export function nordschleifeTrackOffset(distance) {
  return nordschleifeTrackSample(nordschleifeProfile.offset, distance);
}

/** Cap local de la piste (unités X par mètre de course). */
export function nordschleifeTrackTangent(distance) {
  return nordschleifeTrackSample(nordschleifeProfile.heading, distance);
}

export function nordschleifeTrackYaw(distance, scrollScale = CITY_RUSH_SCROLL_SCALE) {
  const scale = Math.max(0.001, Number(scrollScale) || CITY_RUSH_SCROLL_SCALE);
  return -Math.atan2(nordschleifeTrackTangent(distance), scale);
}

/** Hauteur de la chaussée (unités monde) : le relief réel du Ring, mis à l'échelle. */
export function nordschleifeTrackElevation(distance) {
  return nordschleifeTrackSample(nordschleifeProfile.elevation, distance);
}

/** Pente locale (unités Y par mètre de course), plafonnée à 10 % visibles. */
export function nordschleifeTrackGrade(distance) {
  return nordschleifeTrackSample(nordschleifeProfile.grade, distance);
}

export function nordschleifeTrackPitch(distance, scrollScale = CITY_RUSH_SCROLL_SCALE) {
  const scale = Math.max(0.001, Number(scrollScale) || CITY_RUSH_SCROLL_SCALE);
  return Math.atan2(nordschleifeTrackGrade(distance), scale);
}

/**
 * Profil de rendu d'un parcours : les villes gardent leurs deux S très doux et
 * leur relief nul à la ligne, le Ring joue la vraie suite de ses virages. Le
 * monde et le décor n'ont ainsi qu'un seul jeu de fonctions à appeler, quel que
 * soit l'endroit du tour.
 */
export const CITY_RUSH_TRACK_PROFILE_DEFAULT = Object.freeze({
  id: 'city',
  offset: cityRushTrackOffset,
  tangent: cityRushTrackTangent,
  yaw: cityRushTrackYaw,
  elevation: cityRushTrackElevation,
  grade: cityRushTrackGrade,
  pitch: cityRushTrackPitch,
});

export const CITY_RUSH_TRACK_PROFILE_NORDSCHLEIFE = Object.freeze({
  id: 'nordschleife',
  offset: nordschleifeTrackOffset,
  tangent: nordschleifeTrackTangent,
  yaw: nordschleifeTrackYaw,
  elevation: nordschleifeTrackElevation,
  grade: nordschleifeTrackGrade,
  pitch: nordschleifeTrackPitch,
});

export function cityRushTrackProfile(course) {
  return course?.style === 'nordschleife' ? CITY_RUSH_TRACK_PROFILE_NORDSCHLEIFE : CITY_RUSH_TRACK_PROFILE_DEFAULT;
}

function nordschleifeTrackSample(values, distance) {
  const steps = values.length;
  const lapLength = CITY_RUSH_LAP_LENGTH;
  const wrapped = ((Number(distance) || 0) % lapLength + lapLength) % lapLength;
  const position = (wrapped / lapLength) * steps;
  const index = Math.floor(position);
  const next = (index + 1) % steps;
  return values[index] + (values[next] - values[index]) * (position - index);
}

// `inventory` contient les points de jauge (0 jusqu'au coût), pas un stock
// d'objets prêts. Chaque pouvoir garde sa progression indépendamment.
export function createCityRushInventory() {
  return Object.fromEntries(Object.keys(CITY_RUSH_POWER_RULES).map((key) => [CITY_RUSH_POWER_RULES[key].id, 0]));
}

export function addCityRushCharge(inventory, type, amount = type === CITY_RUSH_POWERS.PISTOL
  ? CITY_RUSH_PISTOL_AMMO_PER_PICKUP
  : 1) {
  if (!CITY_RUSH_POWER_RULES[type]) return { ...createCityRushInventory(), ...inventory };
  const cost = CITY_RUSH_POWER_CHARGE_COST[type];
  const current = Math.min(cost, Math.max(0, Math.trunc(Number(inventory?.[type]) || 0)));
  const added = Math.max(0, Math.trunc(Number(amount) || 0));
  return { ...createCityRushInventory(), ...inventory, [type]: Math.min(cost, current + added) };
}

export function consumeCityRushCharge(inventory, type) {
  const normalized = { ...createCityRushInventory(), ...inventory };
  const current = Math.max(0, Math.trunc(Number(normalized[type]) || 0));
  if (!CITY_RUSH_POWER_RULES[type]) return { inventory: normalized, consumed: false };
  // Le tir rouge est un stock de balles : une pression ne vide plus le
  // chargeur, elle retire exactement une balle. Les autres pouvoirs gardent
  // leur ancienne logique de jauge unique.
  if (type === CITY_RUSH_POWERS.PISTOL) {
    if (current <= 0) return { inventory: normalized, consumed: false };
    normalized[type] = current - 1;
    return { inventory: normalized, consumed: true };
  }
  if (current < CITY_RUSH_POWER_CHARGE_COST[type]) return { inventory: normalized, consumed: false };
  normalized[type] = 0;
  return { inventory: normalized, consumed: true };
}

export function isCityRushPowerCharged(inventory, type) {
  const cost = CITY_RUSH_POWER_CHARGE_COST[type];
  if (!Number.isFinite(cost) || cost <= 0) return false;
  const current = Math.max(0, Math.trunc(Number(inventory?.[type]) || 0));
  // Pour l'AK-47, « chargé » signifie qu'il reste au moins une balle : le
  // bouton doit rester utilisable de 7 jusqu'à la dernière balle.
  return type === CITY_RUSH_POWERS.PISTOL ? current > 0 : current >= cost;
}

/**
 * Les bonus rouges restent visibles tant qu'un participant peut compléter
 * son chargeur. Un chargeur plein laisse le bonus à ceux qui ont déjà tiré ;
 * seul un peloton entièrement rechargé le masque sur toute la route.
 */
function hasFullCityRushPistolMagazine(inventory) {
  const ammo = Math.max(0, Math.trunc(Number(inventory?.[CITY_RUSH_POWERS.PISTOL]) || 0));
  return ammo >= CITY_RUSH_PISTOL_MAX_AMMO;
}

export function shouldHideCityRushPistolPickup(playerInventory, opponentInventories = []) {
  if (!hasFullCityRushPistolMagazine(playerInventory)) return false;
  const opponents = Array.isArray(opponentInventories) ? opponentInventories : [];
  return opponents.every(hasFullCityRushPistolMagazine);
}

export function canCollectCityRushPickup(inventory, type, {
  redPickupsHidden = false,
  health = 0,
  maxHealth = 0,
} = {}) {
  if (type === CITY_RUSH_PICKUPS.BOOST) return true;
  if (type === CITY_RUSH_PICKUPS.HEALTH) {
    const currentHealth = Math.max(0, Math.trunc(Number(health) || 0));
    const safeMaxHealth = Math.max(0, Math.trunc(Number(maxHealth) || 0));
    // Un soin ne ressuscite pas une épave et n'est pas gaspillé sur une coque pleine.
    return currentHealth > 0 && currentHealth < safeMaxHealth;
  }
  if (type !== CITY_RUSH_POWERS.PISTOL || redPickupsHidden) return false;
  // Un chargeur rouge complète les balles jusqu'à sept : on peut le ramasser
  // même avec quelques balles, mais pas gaspiller un chargeur déjà plein.
  return !hasFullCityRushPistolMagazine(inventory);
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
/** Le bazooka verrouille la première voiture de police devant le joueur. */
export function cityRushBazookaTarget({
  attackerDistance = 0,
  attackerLane = 0,
  police = [],
  maxDistance = CITY_RUSH_BLUE_SHOT_MAX_RANGE,
} = {}) {
  const policeTargets = (Array.isArray(police) ? police : []).filter((vehicle) => (
    vehicle
    && vehicle.isPolice === true
    && vehicle.active !== false
    && vehicle.destroyed !== true
    && (!Number.isFinite(Number(vehicle.health)) || Number(vehicle.health) > 0)
  ));
  return cityRushStraightShotTarget({ attackerDistance, attackerLane, targets: policeTargets, maxDistance });
}

/** Zone circulaire du bazooka, mesurée en « cases » de voie (2,1 m). */
export function cityRushBazookaBlastContains({
  centerDistance = 0,
  centerX = 0,
  vehicleDistance = 0,
  vehicleX = 0,
  radiusCells = CITY_RUSH_BAZOOKA_BLAST_CELLS,
} = {}) {
  const centerD = Number(centerDistance);
  const centerLateral = Number(centerX);
  const vehicleD = Number(vehicleDistance);
  const vehicleLateral = Number(vehicleX);
  const radius = Math.max(0, Number(radiusCells) || 0);
  if (![centerD, centerLateral, vehicleD, vehicleLateral].every(Number.isFinite)) return false;
  const longitudinalCells = Math.abs(vehicleD - centerD) / CITY_RUSH_LANE_WIDTH;
  const lateralCells = Math.abs(vehicleLateral - centerLateral) / CITY_RUSH_LANE_WIDTH;
  return Math.hypot(longitudinalCells, lateralCells) <= radius;
}

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
// police la plus proche de cette voie — comme la rafale rouge le fait en dernier
// tour (`cityRushPoliceTarget`). Sans
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
  // `attackerLane` absent : aucune voie imposée (une riposte IA choisit alors
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

// Ancien sélecteur pur de cible du talkie, conservé pour lire les anciennes
// sauvegardes/règles ; il n'est plus relié au monde de course et aucune attaque
// d'hélicoptère n'est disponible dans Vice City Rush.
export function cityRushHelicopterTarget(racers = [], playerId = 'player') {
  const caller = racers.find((racer) => racer?.id === playerId) || null;
  const reference = Number(caller?.distance);
  return [...racers]
    .filter((racer) => racer?.id !== playerId)
    .filter((racer) => !Number.isFinite(reference) || cityRushIsAhead(racer?.distance, reference))
    .sort((a, b) => (Number(b.distance) || 0) - (Number(a.distance) || 0))[0] || null;
}

// Exception du dernier tour pour la mitrailleuse rouge : quand l'appelant
// mène et n'a plus personne devant lui — l'escouade s'est repliée sur son
// pare-chocs pour ouvrir le feu —, la riposte peut se retourner contre la
// berline « active » la plus proche, devant, roue contre roue ou déjà dépassée.
// La rafale part alors vers l'arrière ; cette exception ne vaut que pour les
// poursuivants non classés, jamais pour un rival classé.
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
// Un véhicule en l'air (saut sur tremplin) passe au-dessus du sol sans blocage.
// Devant un véhicule du **trafic lent** (`collisionGroup: 'traffic'`), la
// retenue n'est pas la distance de sécurité mais l'enveloppe de contact du
// véhicule (`cityRushTrafficContactGap`), mesurée sur sa **boîte resserrée**
// (`cityRushTrafficHitboxWidth`) : elle suit l'écart latéral réel, donc un
// pilote qui se décale peut approcher de plus près sans être raboté — c'est
// exactement le seuil que `detectCityRushTrafficImpacts` facture, et sans cette
// cohérence le choc ne se déclencherait jamais.
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
    if (following.jumping || following.isJumping) continue;
    for (let frontIndex = 0; frontIndex < index; frontIndex += 1) {
      const front = ordered[frontIndex];
      if (front.jumping || front.isJumping) continue;
      if (front.collisionGroup === 'racer' && following.collisionGroup === 'racer') continue;
      const sameLane = front.lane === following.lane;
      const rawFrontWidth = Number.isFinite(Number(front.width)) ? Number(front.width) : 1.9;
      // Devant un véhicule du trafic, la largeur opposée est sa **boîte de
      // contact** (`CITY_RUSH_TRAFFIC_HITBOX_SCALE`) : la retenue et le
      // recouvrement latéral qui la déclenche sont ceux de la détection de
      // choc, sinon le moteur arrêterait le suiveur sur une carrosserie plus
      // large que le seuil facturé et l'esquive de dernière seconde resterait
      // bloquée avant d'avoir pu passer.
      const frontWidth = front.collisionGroup === 'traffic'
        ? cityRushTrafficHitboxWidth(rawFrontWidth)
        : rawFrontWidth;
      const followingWidth = Number.isFinite(Number(following.width)) ? Number(following.width) : 1.9;
      const lateralOverlap = Number.isFinite(Number(front.x))
        && Number.isFinite(Number(following.x))
        && Math.abs(Number(front.x) - Number(following.x)) < (frontWidth + followingWidth) / 2;
      if (!sameLane && !lateralOverlap) continue;
      // Le trafic lent retient à **son** enveloppe (3,6 m dans l'axe, 2,9 m
      // une fois l'aile dégagée), pas à la distance de sécurité des berlines :
      // c'est le seuil de la détection de choc, augmenté de
      // `CITY_RUSH_TRAFFIC_HOLD_MARGIN` pour que le suiveur qui ferme la
      // distance soit arrêté juste *avant* le contact, puis facturé par la
      // détection (il demande à passer dedans). Un appelant qui demande une
      // marge plus serrée reste maître du plafond.
      const pairGap = front.collisionGroup === 'traffic'
        ? Math.min(safeGap, cityRushTrafficContactGap(Number(front.x) - Number(following.x), {
          bodyWidth: followingWidth,
          trafficWidth: frontWidth,
          contactGap: Math.min(safeGap, CITY_RUSH_TRAFFIC_CAR_GAP),
          passGap: Math.min(safeGap, CITY_RUSH_TRAFFIC_PASS_GAP),
        }) + CITY_RUSH_TRAFFIC_HOLD_MARGIN)
        : safeGap;
      const hold = front.nextDistance - pairGap;
      // Une voiture qui vient d'atterrir ne se pose pas dans une carrosserie :
      // elle est retenue à la distance de sécurité, quitte à reculer de la
      // correction. Sans cette exception, le plancher `previousDistance` la
      // figeait à l'intérieur du véhicule qu'elle venait de survoler — les
      // berlines sont solides, on ne les traverse pas, même en retombant.
      const floor = (following.landing || following.justLanded)
        ? Math.max(0, hold)
        : Math.max(following.previousDistance, hold);
      following.nextDistance = Math.min(following.nextDistance, floor);
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
 * Une voiture en train de sauter franchit le trafic par les airs sans impact.
 *
 * Le seuil longitudinal n'est plus un mur unique de 4,8 m : il suit l'écart
 * latéral réel des deux **boîtes de contact** (`cityRushTrafficContactGap`).
 * Une esquive commencée avant le choc raccourcit la voiture lente dans l'axe et
 * laisse passer le pilote ; une esquive jamais commencée touche au pare-chocs.
 * La boîte du trafic elle-même est resserrée par rapport à sa carrosserie
 * (`CITY_RUSH_TRAFFIC_HITBOX_SCALE`) : il en faut donc encore moins pour être
 * dégagé — c'est la marge d'esquive de dernière seconde.
 *
 * `contacts` est la mémoire du monde (un `Set` de couples `coureur\0véhicule`) :
 * elle garantit **un impact par épisode de contact**, y compris pour le suiveur
 * que le moteur retient juste au-delà de l'enveloppe — sans elle, ce suiveur
 * n'entrerait jamais dans l'enveloppe (il est raboté avant) et ne serait jamais
 * facturé, ou le serait à chaque image s'il la touchait. Sans `Set` (appel pur),
 * la géométrie seule tranche : un contact ne compte qu'en venant de l'extérieur.
 */
export function detectCityRushTrafficImpacts(cars = [], minimumGap = CITY_RUSH_TRAFFIC_IMPACT_GAP, contacts = null) {
  const safeGap = Math.max(0, finiteNumber(minimumGap, CITY_RUSH_TRAFFIC_IMPACT_GAP));
  const racers = (Array.isArray(cars) ? cars : []).filter((car) => car?.collisionGroup === 'racer');
  const traffic = (Array.isArray(cars) ? cars : []).filter((car) => car?.collisionGroup === 'traffic');
  const impacts = [];

  for (const racer of racers) {
    if (racer.jumping || racer.isJumping) continue;
    const racerPrevious = finiteNumber(racer.previousDistance);
    const racerNext = Math.max(racerPrevious, finiteNumber(racer.nextDistance, racerPrevious));
    const racerWidth = Math.max(0, finiteNumber(racer.width, 1.9));
    for (const vehicle of traffic) {
      const trafficPrevious = finiteNumber(vehicle.previousDistance);
      const trafficNext = Math.max(trafficPrevious, finiteNumber(vehicle.nextDistance, trafficPrevious));
      // Le véhicule du trafic est jugé sur sa **boîte de contact**, plus
      // étroite que sa carrosserie (`CITY_RUSH_TRAFFIC_HITBOX_SCALE`) : c'est
      // ce qui laisse passer une esquive de dernière seconde.
      const trafficWidth = cityRushTrafficHitboxWidth(finiteNumber(vehicle.width, 1.9));
      const sameLane = racer.lane === vehicle.lane;
      const hasLateral = Number.isFinite(Number(racer.x)) && Number.isFinite(Number(vehicle.x));
      // Sans position latérale connue, on juge les deux voitures dans l'axe :
      // l'enveloppe reste pleine, comme avant le découpage par écart latéral.
      const lateralDistance = hasLateral ? Math.abs(Number(racer.x) - Number(vehicle.x)) : 0;
      const lateralOverlap = hasLateral && lateralDistance < (racerWidth + trafficWidth) / 2;
      const contactKey = contacts && racer.id !== undefined && vehicle.id !== undefined
        ? `${racer.id}\u0000${vehicle.id}`
        : null;
      if (!sameLane && !lateralOverlap) {
        // Voie et carrosserie dégagées : le couple se sépare, l'épisode est
        // terminé — un nouveau contact comptera de nouveau.
        if (contactKey) contacts.delete(contactKey);
        continue;
      }

      // L'enveloppe du véhicule lent dans l'axe : pleine quand les deux
      // carrosseries sont superposées, réduite au frôlement dès que l'aile a
      // dégagé l'obstacle (`cityRushTrafficContactGap`). Le pilote qui a
      // entamé son esquive est jugé sur cette enveloppe plus courte.
      const contactGap = cityRushTrafficContactGap(lateralDistance, {
        bodyWidth: racerWidth,
        trafficWidth,
        contactGap: safeGap,
      });

      const previousGap = trafficPrevious - racerPrevious;
      const requestedGap = trafficNext - racerNext;
      // Le choc se juge **par l'arrière** : le coureur arrive sur une voiture
      // qui est devant lui (ou à hauteur). Une voiture déjà dépassée, ou qui
      // le suit, ne peut pas lui être facturée — elle compterait un carambolage
      // à un écart négatif.
      const ahead = previousGap >= 0;
      const touches = requestedGap <= contactGap + 1e-7
        || racerNext >= trafficPrevious - contactGap - 1e-7;
      // Ne pas transformer deux voitures en contact en une suite infinie
      // d'impacts : un couple déjà facturé attend de s'être séparé avant de
      // compter de nouveau. `contacts` (fourni par le monde, un couple par
      // épisode) tient cette mémoire ; sans lui — appel pur, tests — on
      // retombe sur la géométrie : « venait-on de l'extérieur ? ». Sans
      // mémoire, un suiveur arrêté pile sur la retenue du moteur ne serait
      // jamais facturé, puisque le rabotage l'empêche d'entrer dans
      // l'enveloppe (cf. `CITY_RUSH_TRAFFIC_HOLD_MARGIN`).
      const alreadyContact = contacts
        ? contacts.has(contactKey)
        : previousGap <= contactGap + 1e-7;
      if (contactKey) {
        if (touches && ahead) contacts.add(contactKey);
        else contacts.delete(contactKey);
      }
      if (alreadyContact || !touches || !ahead) continue;
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
export function createCityRushEncounter(random = Math.random, laneCount = CITY_RUSH_LANE_X.length) {
  const count = Math.max(1, Math.min(CITY_RUSH_LANE_X.length, Math.trunc(Number(laneCount)) || CITY_RUSH_LANE_X.length));
  const available = Array.from({ length: count }, (_, lane) => lane);
  // Les rangées vides sont plus rares (5 %) et un duo apparaît dans 30 %
  // des rangées pleines. Les pads turbo restent majoritaires ; les chargeurs
  // rouges et les trousses de soin apparaissent régulièrement sans envahir la route.
  const pickupCount = random() < 0.05 ? 0 : Math.min(available.length, random() < 0.7 ? 1 : 2);
  const pickups = [];

  for (let index = 0; index < pickupCount; index += 1) {
    const slot = Math.floor(random() * available.length);
    const [lane] = available.splice(slot, 1);
    const roll = random();
    // Les pads restent fréquents, mais le chargeur rouge garde une faible
    // probabilité d'apparition sur chaque emplacement.
    const type = roll < CITY_RUSH_RED_PICKUP_CHANCE
      ? CITY_RUSH_POWERS.PISTOL
      : roll < CITY_RUSH_RED_PICKUP_CHANCE + CITY_RUSH_HEALTH_PICKUP_CHANCE
        ? CITY_RUSH_PICKUPS.HEALTH
        : CITY_RUSH_PICKUPS.BOOST;
    pickups.push({ lane, type });
  }

  return { pickups };
}

/**
 * Sprint : un pad turbo posé au sol, placé uniquement sur une voie du sens de
 * course. La cadence est réglée par `CITY_RUSH_SPRINT_BOOST_ROW_INTERVAL` dans
 * le monde 3D ; aucune arme ni autre bonus ne peut apparaître dans ce mode.
 */
export function createCityRushBoostEncounter(random = Math.random, course = null) {
  const lanes = course ? cityRushLaneConfig(course).forwardLanes : CITY_RUSH_FORWARD_LANES;
  const sample = Number(random());
  const index = Math.max(0, Math.min(lanes.length - 1, Math.floor((Number.isFinite(sample) ? sample : 0) * lanes.length)));
  return { pickups: [{ lane: lanes[index], type: CITY_RUSH_PICKUPS.BOOST }] };
}

/**
 * Voie d'arrivée d'une commande gauche/droite. En plein saut (`airborne`), le
 * volant ne répond plus : la voiture garde la voie de son décollage jusqu'à
 * l'atterrissage, elle ne se décale pas en l'air. Hors saut, rien ne change.
 */
export function cityRushLaneAfterAction(lane, action, laneCount = CITY_RUSH_LANE_X.length, { airborne = false } = {}) {
  if (airborne) return clampCityRushLane(lane, laneCount);
  if (action === 'left') return clampCityRushLane(lane - 1, laneCount);
  if (action === 'right') return clampCityRushLane(lane + 1, laneCount);
  return clampCityRushLane(lane, laneCount);
}

// ── Le cerveau des rivaux ───────────────────────────────────────────────────
// Un rival ne se contente plus de viser le bonus le plus proche : il court pour
// gagner. Le choix de voie arbitre maintenant quatre envies, dans cet ordre —
// ramasser (les pads turbo d'abord), se mettre en position de tir quand la
// mitrailleuse est chargée, franchir un tremplin qui survole le trafic, et ne
// jamais encaisser un choc évitable. Un carambolage coûte 0,6 s de
// ralentissement et un dérapage : l'éviter vaut tous les bonus du monde, d'où
// le **veto** des voies bouchées (`cityRushAiLaneBlocked`) — un tremplin posé
// plus près que l'obstacle garde la voie ouverte, le rival passe par-dessus.
export const CITY_RUSH_AI_LANE_CHANGE_COST = 1.25; // marge de confort : on ne zigzague pas sans raison
export const CITY_RUSH_AI_LANE_COOLDOWN_MIN = 0.3; // s : relecture de la route, au plus vite
export const CITY_RUSH_AI_LANE_COOLDOWN_MAX = 0.5; // s : relecture de la route, au plus lent
export const CITY_RUSH_AI_REFLEX = 0.12; // s : un obstacle imminent rappelle le cerveau — sans télépathie
export const CITY_RUSH_AI_BRAKING_MARGIN = 1.35; // × la distance de freinage : au-delà, la voie est bouchée
export const CITY_RUSH_AI_WEAPON_LANE_WEIGHT = 2.2; // aligner une mitrailleuse chargée vaut deux pads turbo
export const CITY_RUSH_AI_RAMP_WEIGHT = 1.15; // un tremplin à portée vaut un pad turbo
export const CITY_RUSH_AI_RAMP_JAMMED_FACTOR = 1.6; // … et davantage quand il survole un bouchon
export const CITY_RUSH_AI_CROWD_PENALTY = 30; // deux rivaux ne s'entassent pas dans la même voie
export const CITY_RUSH_AI_OVERTAKE_WEIGHT = 1.4; // un concurrent plus lent devant : on le double
export const CITY_RUSH_AI_CHASING_BOOST_WEIGHT = 1.4; // un poursuivant tente plus volontiers un pad
export const CITY_RUSH_AI_CLOSING_SPEED_SHARE = 0.85; // sous 85 % de ma vitesse, le véhicule me bouche
export const CITY_RUSH_AI_LOOKAHEAD = 165; // m : la route lue devant le capot d'un rival

/**
 * Distance (m) qu'il faut à une voiture pour s'arrêter, marge de sécurité
 * comprise. Le monde passe le taux de freinage du modèle du rival
 * (`cityRushAiBrakingRate`) : une supercar freine plus court qu'une citadine et
 * se permet donc de viser un bonus plus près d'un camion. Sans taux fourni, le
 * cerveau retombe sur le plancher du barème (`CITY_RUSH_BRAKE_RATE_FLOOR`) —
 * une voiture dont on ne connaît que la vitesse.
 */
export function cityRushAiBrakingDistance(speed, {
  brakingRate = CITY_RUSH_BRAKE_RATE_FLOOR,
  margin = CITY_RUSH_AI_BRAKING_MARGIN,
} = {}) {
  const velocity = Math.max(0, Number(speed) || 0);
  const rate = Math.max(0.001, Number(brakingRate) || CITY_RUSH_BRAKE_RATE_FLOOR);
  const factor = Math.max(1, Number(margin) || CITY_RUSH_AI_BRAKING_MARGIN);
  return (velocity * velocity) / (2 * rate) * factor;
}

/**
 * Taux de freinage d'un rival : celui de son modèle (`cityRushBrakingRate`),
 * pour que la voie soit jugée bouchée à **sa** distance d'arrêt et pas à celle
 * d'une voiture imaginaire. Une supercar freine plus court qu'une citadine, et
 * se permet donc de viser un bonus plus près d'un camion.
 */
export function cityRushAiBrakingRate(accelerationRate) {
  return cityRushBrakingRate(accelerationRate);
}

/**
 * Cette voie est-elle bouchée devant la voiture ? `true` quand un véhicule
 * **solide** y roule plus lentement (ou arrive en sens inverse) à portée de
 * freinage. Seuls les véhicules solides comptent : deux rivaux se traversent,
 * ils ne se bouchent pas — les autres pilotes sont traités comme des
 * concurrents à doubler (voir `rivals` dans `chooseCityRushAiLane`).
 *
 * Un tremplin posé **avant** l'obstacle rouvre la voie : le rival décolle et
 * passe au-dessus. C'est la seule façon de traverser un bouchon sans perdre de
 * vitesse, et c'est précisément ce qu'un bon pilote cherche à faire.
 */
export function cityRushAiLaneBlocked({
  lane = 0,
  distance = 0,
  speed = CITY_RUSH_PLAYER_SPEED,
  traffic = [],
  ramps = [],
  laneCount = CITY_RUSH_LANE_X.length,
  lookAheadDistance = CITY_RUSH_AI_LOOKAHEAD,
  brakingRate = CITY_RUSH_BRAKE_RATE_FLOOR,
} = {}) {
  const target = clampCityRushLane(lane, laneCount);
  const racerSpeed = Math.max(0, Number(speed) || 0);
  const reach = cityRushAiBrakingDistance(racerSpeed, { brakingRate });
  const lookAhead = Math.max(1, Number(lookAheadDistance) || CITY_RUSH_AI_LOOKAHEAD);
  let blockingGap = Infinity;
  for (const vehicle of Array.isArray(traffic) ? traffic : []) {
    if (!vehicle || clampCityRushLane(vehicle.lane, laneCount) !== target) continue;
    const gap = Number(vehicle.distance) - Number(distance);
    if (!Number.isFinite(gap) || gap < -3 || gap > reach) continue;
    const vehicleSpeed = Math.max(-racerSpeed, Number(vehicle.speed) || 0);
    // Un véhicule qui roule presque aussi vite ne bouche pas la voie (on le
    // suit) ; un contresens, si — sa vitesse est négative.
    if (vehicleSpeed >= 0 && vehicleSpeed >= racerSpeed * CITY_RUSH_AI_CLOSING_SPEED_SHARE) continue;
    blockingGap = Math.min(blockingGap, gap);
  }
  if (!Number.isFinite(blockingGap)) return false;
  const jumpable = (Array.isArray(ramps) ? ramps : []).some((ramp) => {
    if (!ramp || clampCityRushLane(ramp.lane, laneCount) !== target) return false;
    const gap = Number(ramp.distance) - Number(distance);
    return Number.isFinite(gap) && gap > 0 && gap <= Math.min(blockingGap, lookAhead);
  });
  return !jumpable;
}

/**
 * Délai avant la prochaine décision de voie d'un rival. Court quand un danger
 * est déjà là (freinage d'urgence), plus long quand la route est libre : c'est
 * ce qui évite le zigzag permanent sans rendre l'IA myope. Le tirage garde une
 * part d'aléatoire pour que deux rivaux ne réagissent pas à la même image.
 */
export function cityRushAiThinkDelay(random = Math.random, { urgent = false } = {}) {
  const sample = Number(typeof random === 'function' ? random() : random);
  const t = Number.isFinite(sample) ? Math.min(1, Math.max(0, sample)) : 0.5;
  if (urgent) return CITY_RUSH_AI_REFLEX * (0.7 + t * 0.6);
  return CITY_RUSH_AI_LANE_COOLDOWN_MIN + t * (CITY_RUSH_AI_LANE_COOLDOWN_MAX - CITY_RUSH_AI_LANE_COOLDOWN_MIN);
}

// Choisit une prochaine voie en équilibrant les bonus à portée et les menaces
// lentes, parmi les changements de voie effectivement disponibles.
// `oncomingLanes` liste les voies en sens inverse : y rouler coûte un petit
// malus permanent (le danger peut surgir de face à tout instant), si bien
// qu'à danger égal un pilote se rabat toujours vers le sens de la course.
//
// Le cerveau de course ajoute quatre entrées facultatives, toutes absentes d'un
// appel « ramassage » ordinaire (les règles restent donc testables à
// l'identique) :
//   · `rivals` — les autres pilotes, avec leur voie et leur vitesse. Ils ne
//     bloquent pas la voie (deux rivaux se traversent) mais occupent la
//     trajectoire : un concurrent plus lent devant se double, et deux rivaux ne
//     s'entassent pas dans la même voie ;
//   · `ramps` — les tremplins à portée, à viser pour survoler un bouchon ;
//   · `weaponReady` + `targets` — la mitrailleuse chargée et les adversaires
//     qu'un tir droit peut atteindre : le rival se rabat dans leur voie pour
//     les aligner, exactement comme la police le fait derrière le joueur ;
//   · `chasing` — le rival est derrière : un pad turbo vaut alors plus cher,
//     parce qu'un poursuivant tente ce que le leader ne tente plus.
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
  rivals = [],
  ramps = [],
  weaponReady = false,
  targets = [],
  chasing = false,
  brakingRate = CITY_RUSH_BRAKE_RATE_FLOOR,
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
  const rivalCars = Array.isArray(rivals) ? rivals.filter(Boolean) : [];
  const rampList = Array.isArray(ramps) ? ramps.filter(Boolean) : [];
  const targetList = Array.isArray(targets) ? targets.filter(Boolean) : [];
  const threats = Array.isArray(traffic) ? traffic.filter(Boolean) : [];
  // Une voie bouchée est écartée d'office tant qu'une autre reste ouverte :
  // viser un bonus dans un mur, c'est payer un carambolage pour un pad. Si tout
  // est bouché, le choix d'origine revient — un rival ne s'arrête jamais.
  const openLanes = candidates.filter((candidate) => !cityRushAiLaneBlocked({
    lane: candidate,
    distance,
    speed: racerSpeed,
    traffic: threats,
    ramps: rampList,
    laneCount,
    lookAheadDistance: lookAhead,
    brakingRate,
  }));
  const options = openLanes.length ? openLanes : candidates;
  const boostWeight = CITY_RUSH_AI_TRACK_BOOST_WEIGHT * (chasing ? CITY_RUSH_AI_CHASING_BOOST_WEIGHT : 1);
  let bestLane = options.includes(lane) ? lane : options[0];
  let bestScore = -Infinity;

  for (const candidate of options) {
    let safetyScore = -Math.abs(candidate - lane) * CITY_RUSH_AI_LANE_CHANGE_COST;
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
      const weight = pickup.type === CITY_RUSH_PICKUPS.BOOST ? boostWeight : 1;
      pickupPriority += weight * (22 + urgency * 8) * laneAffinity;
    }
    // Mitrailleuse chargée : une voie qui aligne un adversaire à portée de tir
    // vaut deux pads turbo. Le projectile part tout droit — se placer dans la
    // voie de la cible est la seule façon de la toucher, et une cible déjà
    // alignée est une raison de ne pas bouger.
    let weaponPriority = 0;
    if (weaponReady) {
      for (const target of targetList) {
        if (clampCityRushLane(target.lane, laneCount) !== candidate) continue;
        const gap = Number(target.distance) - Number(distance);
        if (!Number.isFinite(gap) || gap <= CITY_RUSH_BLUE_SHOT_MIN_GAP || gap > CITY_RUSH_BLUE_SHOT_MAX_RANGE) continue;
        const urgency = 1 - gap / CITY_RUSH_BLUE_SHOT_MAX_RANGE;
        weaponPriority += CITY_RUSH_AI_WEAPON_LANE_WEIGHT * (22 + urgency * 10);
      }
    }
    // Tremplin : le prendre, c'est franchir le trafic sans perdre un mètre par
    // seconde. Un tremplin qui retombe derrière un véhicule lent vaut donc
    // beaucoup plus cher qu'un tremplin au hasard.
    let rampPriority = 0;
    for (const ramp of rampList) {
      if (clampCityRushLane(ramp.lane, laneCount) !== candidate) continue;
      const gap = Number(ramp.distance) - Number(distance);
      if (!Number.isFinite(gap) || gap <= 0 || gap > lookAhead) continue;
      const jammed = threats.some((vehicle) => {
        if (clampCityRushLane(vehicle.lane, laneCount) !== candidate) return false;
        const vehicleGap = Number(vehicle.distance) - Number(distance);
        return Number.isFinite(vehicleGap) && vehicleGap > gap && vehicleGap <= gap + lookAhead;
      });
      const weight = CITY_RUSH_AI_RAMP_WEIGHT * (jammed ? CITY_RUSH_AI_RAMP_JAMMED_FACTOR : 1);
      rampPriority += weight * (22 + (1 - gap / lookAhead) * 10);
    }
    let racingScore = 0;
    for (const vehicle of threats) {
      const gap = Number(vehicle.distance) - Number(distance);
      if (clampCityRushLane(vehicle.lane, laneCount) !== candidate || !Number.isFinite(gap) || gap < -3 || gap > lookAhead) continue;
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
    // Les autres pilotes : de vrais concurrents, pas des murs. Rester roue dans
    // roue derrière un plus lent fait perdre la course — le rival cherche la
    // voie libre pour le doubler. Deux voitures de la même équipe, à la même
    // hauteur, se répartissent la chaussée au lieu de rouler en file indienne.
    for (const rival of rivalCars) {
      const gap = Number(rival.distance) - Number(distance);
      const rivalLane = clampCityRushLane(rival.lane, laneCount);
      if (!Number.isFinite(gap)) continue;
      if (rivalLane === candidate && Math.abs(gap) < 8) racingScore -= CITY_RUSH_AI_CROWD_PENALTY;
      if (rivalLane !== candidate || gap <= 0 || gap > lookAhead) continue;
      const rivalSpeed = Math.max(0, Number(rival.speed) || 0);
      if (rivalSpeed >= racerSpeed * CITY_RUSH_AI_CLOSING_SPEED_SHARE) continue;
      racingScore -= CITY_RUSH_AI_OVERTAKE_WEIGHT * (22 + (1 - gap / lookAhead) * 10);
    }
    // Sépare explicitement les objectifs des risques : aucune pénalité de
    // circulation ne doit rendre un bonus moins intéressant qu'une voie vide.
    const score = (pickupPriority + weaponPriority + rampPriority) * 100 + safetyScore + racingScore;
    if (score > bestScore) {
      bestScore = score;
      bestLane = candidate;
    }
  }
  return bestLane;
}

// ── Tremplins et sauts ───────────────────────────────────────────────────────
// Des rampes espacées font décoller la voiture sur une trajectoire parabolique.
// Le pool court et les grands intervalles évitent de surcharger la piste ; en
// vol, le véhicule garde assez de hauteur pour franchir le trafic.
export const CITY_RUSH_RAMP_COUNT = 3;
export const CITY_RUSH_RAMP_WIDTH = 2.4;
export const CITY_RUSH_RAMP_LENGTH = 4.8;
export const CITY_RUSH_RAMP_HEIGHT = 0.85;
export const CITY_RUSH_RAMP_CONTACT_WINDOW = 2.6;
export const CITY_RUSH_RAMP_SPACING_MIN = 260;
export const CITY_RUSH_RAMP_SPACING_MAX = 340;

/**
 * Calcule la distance de saut (en mètres) franchie par la voiture selon la vitesse
 * à laquelle le tremplin est abordé.
 */
export function computeCityRushJumpDistance(speed) {
  const s = Math.max(0, Number(speed) || 0);
  return Math.max(16, s * 1.15 + 4);
}

/**
 * Calcule la hauteur maximale du saut (en mètres) selon la vitesse d'élan.
 */
export function computeCityRushJumpHeight(speed) {
  const s = Math.max(0, Number(speed) || 0);
  return Math.min(2.8, Math.max(1.4, 1.0 + s * 0.03));
}

/**
 * Calcule l'élévation Y au cours du saut selon la distance franchie.
 */
export function computeCityRushJumpElevation(jumpDistanceTraveled, totalJumpDistance, peakHeight = 3.5) {
  const total = Math.max(0.1, Number(totalJumpDistance) || 1);
  const traveled = Math.max(0, Number(jumpDistanceTraveled) || 0);
  const progress = Math.max(0, Math.min(1, traveled / total));
  if (progress >= 1) return 0;
  const height = Math.max(0, Number(peakHeight) || 3.5);
  return height * Math.sin(Math.PI * progress);
}

/**
 * Calcule l'inclinaison longitudinale (pitch) de la caisse en vol :
 * cabré à l'impulsion, stabilisé au sommet, léger piqué avant le contact.
 */
export function computeCityRushJumpPitch(progress) {
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  if (p < 0.25) return 0.16 * (1 - p / 0.25);
  if (p > 0.75) return -0.09 * ((p - 0.75) / 0.25);
  return 0;
}

/**
 * Détecte si un véhicule entre en contact avec un tremplin sur sa voie.
 */
export function detectCityRushRampContact(carDistance, carLane, rampDistance, rampLane, contactWindow = CITY_RUSH_RAMP_CONTACT_WINDOW) {
  if (Number(carLane) !== Number(rampLane)) return false;
  const gap = Math.abs((Number(carDistance) || 0) - (Number(rampDistance) || 0));
  return gap <= (Number(contactWindow) || CITY_RUSH_RAMP_CONTACT_WINDOW);
}

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

  // Un circuit resserré n'a que deux voies : la grille alterne alors
  // gauche/droite au lieu de suivre les trois voies du sens de course.
  const course = CITY_RUSH_COURSES.find((item) => item.id === cityId) || null;
  const { defaultLanes } = cityRushLaneConfig(course);
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
// Au dernier tour, trois véhicules d'interception prennent le joueur pour
// cible. En mode Poursuite, ils entrent dès le départ. Un rival qui tire sur
// une voiture de police reçoit son propre poursuivant, sans détourner l'escouade
// du joueur. Les renforts de l'escouade reviennent quelques secondes après une
// destruction. Les unités restent hors classement et hors écran d'arrivée ;
// les attaques d'hélicoptère sont supprimées, mais l'appareil d'observation
// continue de suivre le joueur au dernier tour.
export const CITY_RUSH_POLICE_COUNT = 3;
export const CITY_RUSH_WANTED_MAX_STARS = 5;
export const CITY_RUSH_POLICE_DESTROYS_TO_MAX_STARS = 2;
export const CITY_RUSH_POLICE_TURNAROUND_DURATION = 1.5; // s : demi-tour des patrouilles venant en face

/**
 * Niveau de recherche après un impact réussi. Une voiture ordinaire ajoute une
 * étoile ; toucher une patrouille — par tir ou par collision — monte à trois.
 * La destruction de voitures de police est comptée séparément ci-dessous :
 * la première ajoute la quatrième étoile, la deuxième la cinquième.
 */
export function cityRushWantedLevelAfterHit(currentLevel = 0, { hit = true, police = false } = {}) {
  const current = Math.max(0, Math.min(CITY_RUSH_WANTED_MAX_STARS, Math.floor(Number(currentLevel) || 0)));
  if (!hit) return current;
  if (police) return Math.max(current, 3);
  return Math.min(CITY_RUSH_WANTED_MAX_STARS, current + 1);
}

/**
 * Niveau de recherche après une destruction de police par le joueur.
 * `destroyedCount` est le nombre de voitures détruites depuis le dernier
 * passage au mini-garage : une destruction donne 4 étoiles, deux donnent 5.
 */
export function cityRushWantedLevelAfterPoliceDestroyed(currentLevel = 0, destroyedCount = 1) {
  const current = Math.max(0, Math.min(CITY_RUSH_WANTED_MAX_STARS, Math.floor(Number(currentLevel) || 0)));
  const count = Math.max(0, Math.min(
    CITY_RUSH_POLICE_DESTROYS_TO_MAX_STARS,
    Math.floor(Number(destroyedCount) || 0),
  ));
  if (count === 0) return current;
  return Math.max(current, Math.min(CITY_RUSH_WANTED_MAX_STARS, 3 + count));
}

// ── L'unique porte de service d'une course ──────────────────────────────────
// Chaque carte ne garde plus qu'un seul passage de service, et il n'est plus
// sur le dernier tour :
//
//   · **mi-course** — la porte se dresse au milieu du parcours, à la moitié de
//     la distance totale. Elle est là dès le départ, se traverse sans étoiles,
//     et permet de reprendre une coque abîmée avant même que l'escouade du
//     dernier tour n'entre en piste.
//
// L'ancienne porte du dernier tour (360 m après sa ligne) est retirée : le
// dernier tour ne répare plus, la course entière ne compte qu'un seul garage.
// Une porte ratée revient dans la boucle suivante, mais chaque garage ne peut
// servir qu'une fois par course.
// Une seule porte : celle de mi-course, et rien d'autre.
export const CITY_RUSH_MINI_GARAGE_COUNT = 1;
// Part du parcours où se tient la porte de mi-course (la moitié).
export const CITY_RUSH_MINI_GARAGE_MID_RACE_SHARE = 0.5;
export const CITY_RUSH_MINI_GARAGE_LANE_COUNT = 2;
export const CITY_RUSH_MINI_GARAGE_WIDTH = CITY_RUSH_LANE_WIDTH * CITY_RUSH_MINI_GARAGE_LANE_COUNT + 1.2;
export const CITY_RUSH_MINI_GARAGE_REPAIR_AMOUNT = 6; // carrés rendus à la coque
// Longueur du portique (5,1 unités de scène) convertie en mètres de piste.
export const CITY_RUSH_MINI_GARAGE_TRAVERSE_HALF_LENGTH = 2.55 / CITY_RUSH_SCROLL_SCALE;
// Indication peinte sur les deux voies centrales : elle commence à cette
// distance devant le portique, pour que le pilote ne rate pas la porte à pleine vitesse.
export const CITY_RUSH_MINI_GARAGE_SIGN_LEAD = 34; // m
// Le HUD n'allume le compteur que lorsque la porte approche vraiment.
export const CITY_RUSH_MINI_GARAGE_HUD_RANGE = 500; // m

/**
 * Les deux voies centrales de la chaussée, numérotées à partir de 1 dans
 * l'affichage (voies 3 et 4 sur les routes urbaines à six voies). Sur le Ring,
 * où la piste n'a que quatre voies, le portique couvre ses deux voies centrales.
 */
export function cityRushMiniGarageLanes(course) {
  const { laneCount } = cityRushLaneConfig(course);
  const count = Math.max(1, Math.min(CITY_RUSH_MINI_GARAGE_LANE_COUNT, laneCount));
  const firstLane = Math.floor((laneCount - count) / 2);
  return Object.freeze(Array.from({ length: count }, (_, index) => firstLane + index));
}

/** Voie centrale gauche du portique, gardée pour les anciens appelants. */
export function cityRushMiniGarageLane(course) {
  return cityRushMiniGarageLanes(course)[0] ?? 0;
}

/** Distance absolue de la porte de mi-course : la moitié du parcours. */
export function cityRushMiniGarageMidRaceDistance({
  laps = CITY_RUSH_LAPS,
  lapLength = CITY_RUSH_LAP_LENGTH,
  finalLapLoops = CITY_RUSH_FINAL_LAP_LOOPS,
} = {}) {
  return cityRushRaceDistance(laps, lapLength, finalLapLoops) * CITY_RUSH_MINI_GARAGE_MID_RACE_SHARE;
}

/**
 * Le portique de la course : celui de mi-course, et lui seul. La distance est
 * absolue — le décor se répète tous les `lapLength` mètres, si bien que la
 * porte se pose n'importe où dans le parcours.
 */
export function cityRushMiniGarageTrackDistances({
  laps = CITY_RUSH_LAPS,
  lapLength = CITY_RUSH_LAP_LENGTH,
  finalLapLoops = CITY_RUSH_FINAL_LAP_LOOPS,
} = {}) {
  return Object.freeze([
    cityRushMiniGarageMidRaceDistance({ laps, lapLength, finalLapLoops }),
  ]);
}

/**
 * La porte est-elle ouverte ? Elle l'est dès le départ de la course, seul le
 * Sprint l'ignore : plus aucune porte ne dépend du tour en cours depuis le
 * retrait de celle du dernier tour.
 */
export function cityRushMiniGarageAvailable({ sprint = false } = {}) {
  return !sprint;
}

/**
 * Ramassage du bazooka à l'entrée d'un entrepôt : une seule traversée par
 * entrepôt, sur la voie extérieure.
 */
export function cityRushBazookaPickupCanUse({
  previousDistance,
  nextDistance,
  pickupDistance,
  playerLane,
  pickupLane,
  halfLength = CITY_RUSH_BAZOOKA_PICKUP_HALF_LENGTH,
  used = false,
} = {}) {
  const previous = Number(previousDistance);
  const next = Number(nextDistance);
  const target = Number(pickupDistance);
  const parsedHalf = Number(halfLength);
  const half = Math.max(0, Number.isFinite(parsedHalf) ? parsedHalf : CITY_RUSH_BAZOOKA_PICKUP_HALF_LENGTH);
  return !used
    && Number.isFinite(previous)
    && Number.isFinite(next)
    && next >= previous
    && Number.isFinite(target)
    && Number(playerLane) === Number(pickupLane)
    && previous <= target + half
    && next >= target - half;
}

/**
 * Le service attend la sortie du portique, dans l'une de ses deux voies centrales.
 * La porte est ouverte à tout moment de la course. Il répare aussi une voiture sans
 * étoiles ; chaque porte ne sert qu'une fois.
 */
export function cityRushMiniGarageCanUse({
  previousDistance,
  nextDistance,
  garageExitDistance,
  playerLane,
  garageLane,
  garageLanes,
  sprint = false,
  used = false,
} = {}) {
  const previous = Number(previousDistance);
  const next = Number(nextDistance);
  const exit = Number(garageExitDistance);
  const allowedLanes = Array.isArray(garageLanes)
    ? garageLanes
    : Array.isArray(garageLane) ? garageLane : [garageLane];
  const isOnGarageLane = allowedLanes.some((lane) => (
    Number.isFinite(Number(lane)) && Number(playerLane) === Number(lane)
  ));
  return cityRushMiniGarageAvailable({ sprint })
    && !used
    && Number.isFinite(previous)
    && Number.isFinite(next)
    && Number.isFinite(exit)
    && previous < exit
    && next >= exit
    && isOnGarageLane;
}

/**
 * Niveau de recherche à la sortie d'un mini-garage.
 * Les niveaux les plus dangereux ne sont réduits que d'un cran ; à trois
 * étoiles ou moins, le garage suffit à semer complètement la police.
 */
export function cityRushMiniGarageWantedLevel(level = 0) {
  const stars = Math.max(0, Math.min(CITY_RUSH_WANTED_MAX_STARS, Math.floor(Number(level) || 0)));
  return stars > 3 ? stars - 1 : 0;
}

/** Un passage valide baisse les étoiles actives en plus de réparer la coque. */
export function cityRushMiniGarageCanClearWanted(options = {}) {
  return cityRushMiniGarageCanUse(options) && Math.floor(Number(options.wantedLevel) || 0) > 0;
}

// Portée de vue des patrouilles à cinq étoiles : toute voiture de police
// aperçue sur la route (même sens ou contresens) rejoint la chasse.
export const CITY_RUSH_POLICE_SIGHT_RANGE = 60; // m

/** Nombre de poursuivants de l'escouade selon le niveau de recherche. */
export function cityRushPoliceCountForWantedLevel(level = 0) {
  const stars = Math.max(0, Math.min(CITY_RUSH_WANTED_MAX_STARS, Math.floor(Number(level) || 0)));
  if (stars < 2) return 0;
  if (stars === 2) return 1;
  if (stars < CITY_RUSH_WANTED_MAX_STARS) return 2;
  return CITY_RUSH_POLICE_COUNT;
}

// ── Les rivaux aussi sont pourchassés ───────────────────────────────────────
// La police ne s'occupe plus seulement du pilote. Un adversaire qui **touche**
// une voiture de police — berline de ronde emboutie, patrouille du contresens
// heurtée de face, berline de poursuite carambolée — ouvre un dossier comme le
// joueur : le contact vaut trois étoiles, exactement le barème d'un tir réussi
// (`cityRushWantedLevelAfterHit` avec `police`), et lui vaut la berline qui lui
// est réservée. Le premier du classement quand le dernier tour s'ouvre est
// chassé de la même façon, sans avoir rien fait : la police ne laisse pas un
// adversaire filer seul vers la victoire.
//
// Une seule berline est dédiée à un rival — celle de sa réserve (`reserveForId`)
// — et les trois voitures du joueur ne détournent jamais leur chasse : le
// dernier tour reste le duel du pilote avec son escouade.
export const CITY_RUSH_RIVAL_CONTACT_STARS = 3;
export const CITY_RUSH_RIVAL_PURSUER_COUNT = 1;

/** Niveau de recherche d'un rival après un contact avec la police. */
export function cityRushRivalWantedLevelAfterContact(level = 0) {
  return cityRushWantedLevelAfterHit(level, { hit: true, police: true });
}

/** Le rival est-il assez recherché pour être chassé ? (trois étoiles) */
export function cityRushRivalPursued(level = 0) {
  const stars = Math.max(0, Math.min(CITY_RUSH_WANTED_MAX_STARS, Math.floor(Number(level) || 0)));
  return stars >= CITY_RUSH_RIVAL_CONTACT_STARS;
}

/** Combien de berlines dédiées un rival recherché reçoit-il ? */
export function cityRushRivalPursuerCount(level = 0) {
  return cityRushRivalPursued(level) ? CITY_RUSH_RIVAL_PURSUER_COUNT : 0;
}

/**
 * Le premier du classement quand le dernier tour s'ouvre a droit à la police.
 * Le joueur, lui, a déjà son escouade : seul un rival peut mener la course sans
 * être chassé, et c'est celui-là que la règle rattrape.
 */
export function cityRushRivalLeaderWanted({ leader = null, lastLap = false, playerId = 'player' } = {}) {
  if (!lastLap) return false;
  const id = typeof leader === 'string' ? leader : leader?.id;
  return typeof id === 'string' && id.length > 0 && id !== playerId;
}

/** Progression bornée de l'animation de demi-tour (0 → 1 en 1,5 seconde). */
export function cityRushPoliceTurnaroundProgress(elapsed = 0, duration = CITY_RUSH_POLICE_TURNAROUND_DURATION) {
  const safeDuration = Math.max(0.001, Number(duration) || CITY_RUSH_POLICE_TURNAROUND_DURATION);
  return Math.max(0, Math.min(1, (Number(elapsed) || 0) / safeDuration));
}

export const CITY_RUSH_POLICE_EXTRA_PER_ATTACKER = 1;
// Les renforts reviennent par vagues plutôt qu'instantanément : assez de temps
// pour profiter d'une destruction, sans laisser la poursuite retomber.
export const CITY_RUSH_POLICE_REINFORCEMENT_DELAY = 3.6; // s
// Trois unités : deux berlines et un SUV.
export const CITY_RUSH_POLICE_VEHICLE_TYPES = Object.freeze(['police', 'police-suv', 'police']);
// Une voiture dans chacune des voies de course pour encadrer la poursuite.
export const CITY_RUSH_POLICE_LANES = Object.freeze([...CITY_RUSH_FORWARD_LANES]);
// La police ne convoite que les bonus rouges de mitrailleuse.
export const CITY_RUSH_POLICE_HUNT_TYPES = Object.freeze([CITY_RUSH_POWERS.PISTOL]);
export const CITY_RUSH_POLICE_HUNT_WEIGHT = 5; // un bonus rouge vaut cinq bonus ordinaires
// Croisière de l'escouade : 12 % au-dessus du rythme de référence (contre 6 %
// avant). Une berline ne se traîne plus derrière le peloton — elle le précède.
export const CITY_RUSH_POLICE_BASE_SPEED = CITY_RUSH_PLAYER_SPEED * 1.12;
// Une berline lancée à la poursuite dépasse toujours la voiture qu'elle chasse :
// sa vitesse de sprint suit celle de sa cible, plutôt qu'une pointe fixe, et le
// facteur de retour est monté à 1,24 — distancée, elle revient plus vite qu'un
// rival ne creuse l'écart. Sans ce plancher, une supercar à 179 km/h
// distancerait définitivement les poursuivants et le dernier tour n'aurait plus
// d'enjeu.
export const CITY_RUSH_POLICE_CHASE_SPEED_FACTOR = 1.24; // × la vitesse de la cible, minimum en sprint
export const CITY_RUSH_POLICE_LEAD = 15; // m : hauteur de croisière devant la cible
export const CITY_RUSH_POLICE_LEAD_SLACK = 6; // m : zone où la vitesse se cale sur celle de la cible
export const CITY_RUSH_POLICE_ATTACK_LEAD = -5; // m : repli derrière la cible pour ouvrir le feu
export const CITY_RUSH_POLICE_SPAWN_BEHIND = 30; // m : distance d'entrée en piste, derrière la cible
export const CITY_RUSH_POLICE_LOOKAHEAD = 200; // m : portée de convoitise des bonus
export const CITY_RUSH_POLICE_STEAL_NOTICE = 150; // m : au-delà, la page ne commente plus un vol de bonus
export const CITY_RUSH_POLICE_FIRE_COOLDOWN = 1.9; // s : délai entre deux rafales de la même berline
// Le pilote vient de se décaler sous le nez d'une berline élue (barrage ou
// ligne de tir) : elle relance son choix de voie tout de suite, au lieu de
// terminer son délai de décision et de tirer dans la voie qu'il vient de
// quitter. C'est ce qui empêche un joueur de se mettre hors de portée en
// balayant les six voies toutes les demi-secondes.
export const CITY_RUSH_POLICE_PURSUIT_REFLEX = 0.12; // s : temps de réaction après un écart de la cible
// La mitrailleuse est fixée sur l'axe de la voie : la berline garde son viseur
// sur une cible **immobile dans la voie** pendant un temps d'alignement avant
// d'ouvrir le feu. Un pilote qui change de voie, ou qui se décale latéralement
// hors de l'axe, casse l'alignement et la rafale ne part pas — c'est la
// contre-mesure du joueur, et ce qui rend le danger lisible plutôt que fatal :
// la berline prévient en se calant dans le dos, l'alignement se voit au HUD.
// Le temps de mire est descendu à 0,9 s : la contre-mesure (se décaler) reste
// large, mais une berline déjà dans le dos ne laisse plus une seconde entière.
export const CITY_RUSH_POLICE_AIM_TIME = 0.9; // s : temps de mire avant la rafale
export const CITY_RUSH_POLICE_AIM_TOLERANCE = 1.15; // m : écart latéral toléré entre la cible et l'axe de la voie
export const CITY_RUSH_POLICE_AIM_NOTICE_COOLDOWN = 3.2; // s : deux avis de mire ne se répètent pas plus vite
export const CITY_RUSH_POLICE_VIEW_BEHIND = 22; // m : une berline reste dessinée un peu derrière nous
export const CITY_RUSH_POLICE_BLOCK_RANGE = 40; // m : au-delà, la voie est considérée bouchée

// Six carrés de vie pour chaque berline, affichés sur son toit : trois tirs
// bleus (2 points chacun) ou six carambolages en accélérant (1 point chacun) la
// détruisent. Le tir rouge d’AK-47 suit exactement la même règle que contre un
// pilote : **un seul carré par balle** (`CITY_RUSH_POLICE_DAMAGE.pistol` = 1),
// donc six impacts pour envoyer une berline à la casse. Un chargeur de
// `CITY_RUSH_PISTOL_AMMO_PER_PICKUP` balles suffit tout juste à nettoyer une
// voiture de police, et il faut économiser ses tirs plutôt que viser la
// destruction instantanée. La coque du pilote paie elle aussi le contact
// d’un carré (`CITY_RUSH_PLAYER_DAMAGE.collision`), avec un répit partagé
// (`CITY_RUSH_PLAYER_COLLISION_COOLDOWN`) : six carambolages coûtent donc six
// carrés au joueur.
// Le barème reste pur, donc testable hors de three.js.
export const CITY_RUSH_POLICE_HEALTH = 6;
// Le SUV d'interception est blindé : dix carrés au lieu de six, et le percuter
// coûte deux carrés au pilote (`CITY_RUSH_PLAYER_DAMAGE['suv-collision']`).
export const CITY_RUSH_POLICE_SUV_HEALTH = 10;
export function cityRushPoliceMaxHealth(vehicleType = 'police') {
  return vehicleType === 'police-suv' ? CITY_RUSH_POLICE_SUV_HEALTH : CITY_RUSH_POLICE_HEALTH;
}
export const CITY_RUSH_POLICE_DAMAGE = Object.freeze({
  [CITY_RUSH_POWERS.BLUE_SHOT]: 2,
  // Un tir rouge ne retire qu’un carré, à une berline comme à un adversaire.
  [CITY_RUSH_POWERS.PISTOL]: 1,
  [CITY_RUSH_POWERS.RADIO]: 0, // frappe d'hélicoptère supprimée
  collision: 1, // la police perd un point, le pilote un carré (deux contre un SUV)
});

export function cityRushPoliceDamage(health = CITY_RUSH_POLICE_HEALTH, source = CITY_RUSH_POWERS.BLUE_SHOT) {
  const safeHealth = Math.max(0, Math.trunc(Number(health) || 0));
  const damage = Number(CITY_RUSH_POLICE_DAMAGE[source]);
  if (!Number.isFinite(damage) || damage <= 0) return safeHealth;
  return Math.max(0, safeHealth - damage);
}

// Combien de tirs de cette arme reste-t-il avant l'explosion ? Sert au bandeau
// « berline touchée » : « encore trois tirs bleus » plutôt qu'une barre brute.
export function cityRushPoliceShotsLeft(health = CITY_RUSH_POLICE_HEALTH, source = CITY_RUSH_POWERS.BLUE_SHOT) {
  const safeHealth = Math.max(0, Math.trunc(Number(health) || 0));
  const damage = Number(CITY_RUSH_POLICE_DAMAGE[source]);
  if (!safeHealth || !Number.isFinite(damage) || damage <= 0) return 0;
  return Math.ceil(safeHealth / damage);
}

// ── Alignement de la rafale : le viseur de la berline ───────────────────────
// Le temps de mire se cumule tant que la cible reste sur l'axe de la voie et
// devant la berline ; il retombe à zéro au moindre écart (changement de voie,
// décalage latéral, cible sortie de la ligne de tir, rafale partie).
export function cityRushPoliceAimAligned({
  x = 0,
  laneX = 0,
  tolerance = CITY_RUSH_POLICE_AIM_TOLERANCE,
} = {}) {
  const lateral = Math.abs(Number(x) - Number(laneX));
  const slack = Math.max(0, Number(tolerance) || 0);
  return Number.isFinite(lateral) && lateral <= slack;
}

export function cityRushPoliceAimHold({
  aim = 0,
  aligned = false,
  dt = 0,
  duration = CITY_RUSH_POLICE_AIM_TIME,
} = {}) {
  const safeDuration = Math.max(0.001, Number(duration) || CITY_RUSH_POLICE_AIM_TIME);
  const safeAim = Math.max(0, Math.min(safeDuration, Number(aim) || 0));
  if (!aligned) return 0;
  return Math.min(safeDuration, safeAim + Math.max(0, Number(dt) || 0));
}

export function cityRushPoliceAimReady(aim = 0, duration = CITY_RUSH_POLICE_AIM_TIME) {
  const safeDuration = Math.max(0.001, Number(duration) || CITY_RUSH_POLICE_AIM_TIME);
  return Math.max(0, Number(aim) || 0) >= safeDuration;
}

// Prime de destruction : le pilote qui fait exploser une berline la touche.
export const CITY_RUSH_POLICE_DESTROY_SCORE = 200;

// ── Épave d'une berline de police détruite ──────────────────────────────────
// La coque cède, mais la berline ne disparaît pas d'un coup. Elle part en
// tête-à-queue sur **deux tours complets** en perdant toute sa vitesse — la
// rotation suit la courbe de la toupie du pilote (`cityRushStunSpin`), donc la
// berline pivote vite puis se pose face à la route —, **explose** à la fin du
// tête-à-queue, et sa **carcasse calcinée reste en piste, en feu**, ancrée là
// où elle s'est immobilisée. La carcasse est dessinée tant qu'elle est dans le
// cadre (même fenêtre que le trafic dans le rétroviseur) et le feu, lui, dure
// `CITY_RUSH_POLICE_WRECK_BURN_SECONDS` — bien après que le pilote l'a dépassée.
export const CITY_RUSH_POLICE_WRECK_SPIN_TURNS = 2; // tours complets avant l'explosion
export const CITY_RUSH_POLICE_WRECK_SPIN_SECONDS = 1.7; // s : durée du tête-à-queue
export const CITY_RUSH_POLICE_WRECK_VIEW_BEHIND = CITY_RUSH_POLICE_VIEW_BEHIND; // m : fenêtre derrière le pilote
// Le feu dure : pleine flamme à l'explosion, il faiblit jusqu'à un plancher de
// braises sur `CITY_RUSH_POLICE_WRECK_BURN_SECONDS`, puis la carcasse a fini de
// se consumer et quitte la scène — le pilote est alors très loin devant.
export const CITY_RUSH_POLICE_WRECK_BURN_SECONDS = 18; // s : durée de l'incendie
export const CITY_RUSH_POLICE_WRECK_FLAME_FLOOR = 0.45; // intensité minimale (braises)
// Garde-fou de scène : au-delà de ce nombre de carcasses suivies, la plus
// ancienne — donc la plus loin derrière le pilote — s'efface et son modèle est
// réutilisé. Un incendie dure `CITY_RUSH_POLICE_WRECK_BURN_SECONDS`, soit bien
// plus que le temps de dépasser une carcasse : le plafond ne se atteint que
// dans une course où les berlines sautent les unes après les autres.
export const CITY_RUSH_POLICE_WRECK_MAX = 8;

// Vitesse de la berline pendant le tête-à-queue : la décélération suit la
// rotation (ease-out), la carcasse glisse donc vite au début puis s'immobilise
// exactement quand elle arrête de tourner.
export function cityRushPoliceWreckSpeed(startSpeed = 0, spinLeft = 0, spinTotal = CITY_RUSH_POLICE_WRECK_SPIN_SECONDS) {
  const speed = Math.max(0, Number(startSpeed) || 0);
  const total = Math.max(0, Number(spinTotal) || 0);
  if (total <= 0) return 0;
  const left = Math.min(total, Math.max(0, Number(spinLeft) || 0));
  const remaining = left / total;
  return speed * remaining * remaining;
}

// Distance parcourue entre la perte de la coque et l'explosion : l'intégrale de
// la décélération ci-dessus, soit un tiers de la distance à vitesse constante.
export function cityRushPoliceWreckSlide(startSpeed = 0, spinTotal = CITY_RUSH_POLICE_WRECK_SPIN_SECONDS) {
  const speed = Math.max(0, Number(startSpeed) || 0);
  const total = Math.max(0, Number(spinTotal) || 0);
  return (speed * total) / 3;
}

// Intensité du feu de la carcasse : pleine flamme à l'explosion, puis un
// affaiblissement linéaire vers le plancher de braises, où il se maintient.
export function cityRushPoliceWreckFlame(burnElapsed = 0, burnSeconds = CITY_RUSH_POLICE_WRECK_BURN_SECONDS) {
  const seconds = Math.max(0, Number(burnElapsed) || 0);
  const total = Math.max(0, Number(burnSeconds) || 0);
  const floor = Math.min(1, Math.max(0, Number(CITY_RUSH_POLICE_WRECK_FLAME_FLOOR)));
  if (total <= 0) return 1;
  return Math.max(floor, 1 - (1 - floor) * (seconds / total));
}

// Les berlines entrent sans charge de mitrailleuse ni attaque d'hélicoptère.
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
export const CITY_RUSH_POLICE_BLOCKADE_HOLD = 3.6; // s : durée d'un barrage avant de repartir
export const CITY_RUSH_POLICE_INTERCEPT_RANGE = 80; // m : devant le leader, portée où la berline vise sa voie
export const CITY_RUSH_POLICE_INTERCEPT_WEIGHT = 3; // un barrage vaut trois bonus ordinaires
export const CITY_RUSH_POLICE_HUNT_RANGE = 60; // m : sous cette distance, un rouge/jaune passe avant le barrage

// ── Ligne de tir : la berline armée se replace dans le dos du pilote ────────
// Une rafale part tout droit devant le capot : pour arroser le pilote, la
// berline doit donc rouler dans **sa** voie, quelques mètres derrière lui
// (`CITY_RUSH_POLICE_ATTACK_LEAD`). Comme le barrage, c'est un choix de
// mission : la berline armée se rabat une voie à la fois vers celle de son
// client, sans se laisser détourner par un pad turbo. Sans cela, l'escouade
// gardait sa voie de convoitise et vidait ses chargeurs dans le vide — le
// pilote ne perdait jamais un seul carré.
export const CITY_RUSH_POLICE_FIRE_LINE_RANGE = CITY_RUSH_BLUE_SHOT_MAX_RANGE; // m : portée de la rafale
export const CITY_RUSH_POLICE_FIRE_LINE_WEIGHT = 3; // une ligne de tir vaut un barrage
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

// Sélectionne le pilote le plus avancé pour les décisions de barrage et les
// calculs de peloton ; le monde déclenche l'arrivée de la police au dernier tour
// du joueur et assigne explicitement sa cible, quel que soit son rang. `entries`
// ne contient que les pilotes classés ; en cas d'égalité, le premier de la liste
// devient leader, comme dans `rankCityRushRacers`.
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
  chaseSpeedFactor = CITY_RUSH_POLICE_CHASE_SPEED_FACTOR,
  blocking = false,
} = {}) {
  const safeBase = Math.max(0, Number(baseSpeed) || 0);
  const safeLeader = Math.max(0, Number(leaderSpeed) || 0);
  const safeGap = Number(gap) || 0;
  const safeLead = Number(lead) || 0;
  const slack = Math.max(0, Number(tolerance) || 0);
  const sprintFactor = Math.max(1, Number(sprint) || 1.34);
  const chaseFactor = Math.max(1, Number(chaseSpeedFactor) || CITY_RUSH_POLICE_CHASE_SPEED_FACTOR);
  const easeFactor = Math.min(1, Math.max(0.2, Number(ease) || 0.9));
  // Barrage : devant le leader, la berline lève le pied au lieu de tenir sa
  // hauteur. C'est ce qui force le poursuivi à la percuter ou à la contourner.
  if (blocking && safeGap > 0) return cityRushPoliceBlockadePace({ leaderSpeed: safeLeader, baseSpeed: safeBase });
  // Sprint : la vitesse de base suffit pour une voiture ordinaire, mais une
  // berline doit aussi pouvoir revenir sur une supercar — d'où le plancher
  // relatif à la vitesse du leader (voir CITY_RUSH_POLICE_CHASE_SPEED_FACTOR).
  if (safeGap < safeLead - slack) return Math.max(safeBase * sprintFactor, safeLeader * chaseFactor);
  if (safeGap > safeLead + slack) {
    // Trop en avant : elle lève le pied d'autant plus qu'elle est loin. Une
    // berline ne part pas gagner la course — elle attend le leader.
    const ahead = safeGap - (safeLead + slack);
    const brake = Math.max(0.45, 1 - ahead / 120);
    return Math.max(6, safeLeader * easeFactor * brake);
  }
  // Croisière : la berline tient sa position, mais ne s'arrête jamais net.
  const cruise = Math.max(safeLeader, safeBase * 0.82);
  // … et depuis l'arrière, elle ne roule jamais plus vite que la voiture
  // qu'elle suit. Sans ce plafond, la croisière de l'escouade (12 % au-dessus du
  // rythme de référence) poussait la berline dans le pare-chocs de son client :
  // un poursuivant suit, il ne percute pas — le barrage, lui, garde son frein.
  return safeGap <= 0 ? Math.min(safeLeader, cruise) : cruise;
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
  fireLane = null,
  fireGap = 0,
  fireRange = CITY_RUSH_POLICE_FIRE_LINE_RANGE,
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
  // Miroir du barrage : une berline armée qui se trouve **derrière** son client
  // vise sa voie pour lui tirer dans le dos. Les deux missions s'excluent — on
  // ne barre pas la route depuis l'arrière.
  const fireLead = Number(fireGap);
  const fireLimit = Math.max(1, Number(fireRange) || CITY_RUSH_POLICE_FIRE_LINE_RANGE);
  const firing = interceptTarget === null && fireLane !== null && fireLane !== undefined
    && Number.isFinite(fireLead) && fireLead <= 0 && fireLead >= -fireLimit;
  const fireTarget = firing ? clampCityRushLane(fireLane, laneCount) : null;
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
  // Ligne de tir : la berline armée se rabat dans la voie de son client, une
  // voie à la fois, dès qu'elle est derrière lui. Une voie bouchée reste
  // contournée (`options`), et un rouge à portée de capot passe avant — mais
  // une berline déjà chargée ne convoite plus les rouges.
  if (fireTarget !== null) {
    const huntedWithinReach = pickups.some((pickup) => {
      if (!CITY_RUSH_POLICE_HUNT_TYPES.includes(pickup.type)) return false;
      const gap = Number(pickup.distance) - Number(distance);
      return Number.isFinite(gap) && gap > -3 && gap <= CITY_RUSH_POLICE_HUNT_RANGE;
    });
    const toward = fireTarget > lane ? lane + 1 : fireTarget < lane ? lane - 1 : lane;
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
    // Même poids pour la ligne de tir quand le rabattement direct vers la voie du
    // client est bouché : la berline armée préfère une voie qui la rapproche de
    // son pare-chocs plutôt que de repartir à la chasse aux pads turbo.
    if (fireTarget !== null && candidate === fireTarget) {
      greed += CITY_RUSH_POLICE_FIRE_LINE_WEIGHT * (22 + 10);
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
// elles **bloquent** donc la voie comme n'importe quelle voiture : qui les
// percute en paie un carré (`CITY_RUSH_PLAYER_DAMAGE.collision`) et leur inflige
// un point de vie.
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
      // En vol, la berline franchit le trafic lent sans choc ni freinage.
      // Les autres voitures de course et ses collègues restent des obstacles :
      // la police ne traverse jamais un pilote à l'atterrissage.
      if (trafficList.includes(other) && (car.jumping || car.isJumping || other.jumping || other.isJumping)) continue;
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

// ── La herse : le barrage éclair des voitures de police à quatre étoiles ────
// À quatre étoiles, deux voitures de police se portent devant le pilote et
// déploient une herse en travers des trois voies du sens de course. La scène se
// lit en trois temps :
//
//   1. **la prise de position** — les deux voitures apparaissent devant le
//      pilote et viennent se ranger en travers, une à chaque extrémité du
//      barrage, gyrophares allumés ;
//   2. **la pose** — la herse se déroule de voie en voie : un pilote qui arrive
//      pendant la pose passe encore par les voies non couvertes ;
//   3. **le passage** — franchir la ligne sur une voie couverte crève les pneus :
//      un carré de coque (`CITY_RUSH_SPIKE_DAMAGE_SOURCE`) et une longue remise
//      en vitesse. Les voies du contresens et un saut restent des
//      échappatoires : la herse ne couvre que le sens de la course.
//
// Une fois le pilote passé (crevé ou non), les voitures rangent la herse et
// repartent devant, hors de la course. Le barrage revient après un délai —
// jamais en Sprint, et jamais avant la quatrième étoile.
export const CITY_RUSH_SPIKE_BLOCK_STARS = 4;
export const CITY_RUSH_SPIKE_BLOCK_VEHICLE_TYPES = Object.freeze(['police', 'police-suv']);
export const CITY_RUSH_SPIKE_BLOCK_COUNT = CITY_RUSH_SPIKE_BLOCK_VEHICLE_TYPES.length;
export const CITY_RUSH_SPIKE_LANES = 3; // voies de course couvertes par la herse
export const CITY_RUSH_SPIKE_BLOCK_LEAD = 340; // m : la herse se dresse devant le pilote
export const CITY_RUSH_SPIKE_BLOCK_COOLDOWN = 26; // s entre deux barrages
export const CITY_RUSH_SPIKE_BLOCK_DEPLOY_DURATION = 0.9; // s : les voitures se rangent en travers
export const CITY_RUSH_SPIKE_LAY_DURATION = 1.4; // s : pose de la herse, voie par voie
export const CITY_RUSH_SPIKE_BLOCK_LIFETIME = 22; // s : barrage retiré si le pilote ne vient pas
export const CITY_RUSH_SPIKE_BLOCK_PACK_DURATION = 2.6; // s : les voitures repartent après le passage
export const CITY_RUSH_SPIKE_BLOCK_ALERT_RANGE = 320; // m : distance d'annonce au pilote
export const CITY_RUSH_SPIKE_HALF_LENGTH = 2.4; // m : demi-longueur du tapis à pointes
export const CITY_RUSH_SPIKE_SLOW_DURATION = 2.6; // s : crevaison, la remise en vitesse est longue
export const CITY_RUSH_SPIKE_SLOW_FACTOR = 0.42; // × la vitesse visée pendant la crevaison
export const CITY_RUSH_SPIKE_IMPACT_DURATION = 1.1; // s : secousse de caisse au passage
export const CITY_RUSH_SPIKE_DAMAGE_SOURCE = 'spike';
export const CITY_RUSH_SPIKE_DAMAGE = 1; // carré de coque perdu sur la herse

/** Nombre de voitures qui montent un barrage selon le niveau de recherche. */
export function cityRushSpikeBlockCount(wantedLevel = 0, { sprint = false } = {}) {
  if (sprint) return 0;
  const stars = Math.max(0, Math.min(CITY_RUSH_WANTED_MAX_STARS, Math.floor(Number(wantedLevel) || 0)));
  return stars >= CITY_RUSH_SPIKE_BLOCK_STARS ? CITY_RUSH_SPIKE_BLOCK_COUNT : 0;
}

/**
 * Voies couvertes par la herse : les voies du sens de course, de la plus à
 * gauche à la plus à droite. Sur un parcours à quatre voies (le Ring), la herse
 * s'arrête à trois : la dernière voie reste ouverte, faute de contresens où se
 * rabattre.
 */
export function cityRushSpikeLanes(forwardLanes = CITY_RUSH_FORWARD_LANES, count = CITY_RUSH_SPIKE_LANES) {
  const lanes = Array.isArray(forwardLanes) && forwardLanes.length ? forwardLanes : CITY_RUSH_FORWARD_LANES;
  const wanted = Math.max(1, Math.min(Math.floor(Number(count) || CITY_RUSH_SPIKE_LANES), lanes.length));
  return Object.freeze(lanes.slice(0, wanted));
}

/** Voies déjà couvertes après `elapsed` secondes de pose (0 → `lanes`). */
export function cityRushSpikeLaidLanes(elapsed = 0, {
  lanes = CITY_RUSH_SPIKE_LANES,
  duration = CITY_RUSH_SPIKE_LAY_DURATION,
} = {}) {
  const total = Math.max(1, Math.floor(Number(lanes) || CITY_RUSH_SPIKE_LANES));
  const span = Math.max(0.001, Number(duration) || CITY_RUSH_SPIKE_LAY_DURATION);
  const seconds = Math.max(0, Number(elapsed) || 0);
  if (seconds >= span) return total;
  return Math.min(total, Math.floor((seconds / span) * total));
}

/** Progression de la pose (0 → 1), pour dérouler la herse au rendu. */
export function cityRushSpikeLayProgress(elapsed = 0, duration = CITY_RUSH_SPIKE_LAY_DURATION) {
  const span = Math.max(0.001, Number(duration) || CITY_RUSH_SPIKE_LAY_DURATION);
  return Math.max(0, Math.min(1, (Number(elapsed) || 0) / span));
}

/**
 * Le pilote franchit-il la ligne de la herse sur une voie couverte ? Le
 * franchissement se juge sur le segment parcouru pendant l'image (détection
 * balayée) : une voiture trop rapide pour être vue *sur* la ligne est quand
 * même pincée.
 */
export function cityRushSpikeHit({
  previousDistance,
  nextDistance,
  spikeDistance,
  lane,
  lanes = [],
  laidLanes = CITY_RUSH_SPIKE_LANES,
} = {}) {
  const previous = Number(previousDistance);
  const next = Number(nextDistance);
  const line = Number(spikeDistance);
  if (!Number.isFinite(previous) || !Number.isFinite(next) || !Number.isFinite(line)) return false;
  if (!(previous < line && next >= line)) return false;
  const order = Array.isArray(lanes) ? lanes : [];
  const covered = Math.max(0, Math.min(order.length, Math.floor(Number(laidLanes) || 0)));
  return order.slice(0, covered).includes(Math.trunc(Number(lane)));
}

/** Vitesse visée après une crevaison : on ne repart pas à fond, pneus à plat. */
export function cityRushSpikePace(speed = 0, factor = CITY_RUSH_SPIKE_SLOW_FACTOR) {
  const value = Math.max(0, Number(speed) || 0);
  const ratio = Math.min(1, Math.max(0.1, Number(factor) || CITY_RUSH_SPIKE_SLOW_FACTOR));
  return value * ratio;
}

// ── Les SUV de tête : la charge à cinq étoiles ──────────────────────────────
// Cinq étoiles ne se contentent plus d'attendre le pilote : deux SUV
// d'interception arrivent **de face**, dans les voies du contresens, et foncent
// sur lui. Leur conduite est celle d'un missile guidé :
//
//   · ils visent la voie du pilote dès qu'ils sont à portée de verrouillage
//     (`CITY_RUSH_SUV_CHARGE_LOCK_RANGE`) et se rabattent latéralement à
//     vitesse limitée (`CITY_RUSH_SUV_CHARGE_LATERAL_RATE`) : changer de voie
//     au dernier moment les fait passer à côté ;
//   · ils roulent plus vite que la pointe du pilote, sans quoi la charge ne
//     serait qu'une voiture de plus à esquiver ;
//   · **le contact les retourne** : un SUV qui touche le pilote — ou que le
//     pilote percute — fait demi-tour sur la même animation que les patrouilles
//     (`CITY_RUSH_POLICE_TURNAROUND_DURATION`) puis rejoint la chasse ;
//   · une charge manquée n'est pas perdue : le SUV repasse au loin et revient.
export const CITY_RUSH_SUV_CHARGE_COUNT = 2;
export const CITY_RUSH_SUV_CHARGE_TYPE = 'police-suv';
export const CITY_RUSH_SUV_CHARGE_SPAWN_LEAD = 420; // m : distance de départ d'une charge
export const CITY_RUSH_SUV_CHARGE_RECYCLE_BEHIND = 45; // m derrière le pilote : la charge est manquée
export const CITY_RUSH_SUV_CHARGE_RELOAD = 2.4; // s avant de repartir pour une charge
export const CITY_RUSH_SUV_CHARGE_SPEED_FACTOR = 1.22; // × la pointe du pilote
export const CITY_RUSH_SUV_CHARGE_MIN_SPEED = 24; // m/s : plancher, même sur un parcours lent
export const CITY_RUSH_SUV_CHARGE_LOCK_RANGE = 150; // m : sous cette distance, la voie visée se verrouille
export const CITY_RUSH_SUV_CHARGE_LATERAL_RATE = 3.4; // m/s de rabattement vers la voie visée
export const CITY_RUSH_SUV_CHARGE_ALERT_RANGE = 300; // m : « SUV EN CHARGE » annoncé au pilote

/** Nombre de SUV de charge actifs (aucun avant cinq étoiles, jamais en Sprint). */
export function cityRushSuvChargeCount(wantedLevel = 0, { sprint = false, hasOncoming = true } = {}) {
  if (sprint || !hasOncoming) return 0;
  const stars = Math.max(0, Math.min(CITY_RUSH_WANTED_MAX_STARS, Math.floor(Number(wantedLevel) || 0)));
  return stars >= CITY_RUSH_WANTED_MAX_STARS ? CITY_RUSH_SUV_CHARGE_COUNT : 0;
}

/** Vitesse de la charge : plus rapide que la pointe du pilote, avec un plancher. */
export function cityRushSuvChargeSpeed(playerTopSpeed = CITY_RUSH_PLAYER_SPEED, {
  factor = CITY_RUSH_SUV_CHARGE_SPEED_FACTOR,
  floor = CITY_RUSH_SUV_CHARGE_MIN_SPEED,
} = {}) {
  const top = Math.max(0, Number(playerTopSpeed) || 0);
  const ratio = Math.max(1, Number(factor) || CITY_RUSH_SUV_CHARGE_SPEED_FACTOR);
  return Math.max(Math.max(0, Number(floor) || 0), top * ratio);
}

/** La charge verrouille-t-elle la voie du pilote ? (SUV devant lui, à portée) */
export function cityRushSuvChargeLocked({ gap = 0, range = CITY_RUSH_SUV_CHARGE_LOCK_RANGE } = {}) {
  const ahead = Number(gap);
  const reach = Math.max(1, Number(range) || CITY_RUSH_SUV_CHARGE_LOCK_RANGE);
  return Number.isFinite(ahead) && ahead > 0 && ahead <= reach;
}

/** Un pas de rabattement latéral vers la voie visée, à vitesse limitée. */
export function cityRushSuvChargeStep(currentX, targetX, dt, rate = CITY_RUSH_SUV_CHARGE_LATERAL_RATE) {
  const from = Number(currentX) || 0;
  const to = Number(targetX);
  if (!Number.isFinite(to)) return from;
  const step = Math.max(0, Number(rate) || 0) * Math.max(0, Number(dt) || 0);
  if (Math.abs(to - from) <= step) return to;
  return from + Math.sign(to - from) * step;
}

// ── Barres de vie des voitures de course ────────────────────────────────────
// Le joueur et ses deux rivaux ont une barre de vie visible dès le départ
// effectif, remplie par groupes de cinq : bleu, vert, puis jaune ; les trois
// dernières cellules passent au rouge. Les tirs retirent une cellule et le tir
// rouge ne fait ni déraper ni ralentir sa cible. Percuter une voiture — le
// trafic lent, un véhicule venant en face ou une berline de police — retire
// aussi une cellule : le choc contre une berline de police abîme désormais les
// deux coques, le pilote y laissant un carré et la police un point de vie.
//
// **Le nombre de cellules dépend de la voiture** (`cityRushCarMaxHealth`) :
// `CITY_RUSH_PLAYER_HEALTH` n'est plus qu'un barème de référence — quinze
// cellules pour une coque à `durabilityMultiplier: 1` —, et chaque profil du
// catalogue donne la sienne (7 pour la PULSE RS, 23 pour la MISTRAL 1.4). Un
// cran de vie reste un carré : ce qui change est le nombre de crans avant
// l'épave, donc le nombre de chocs que la voiture encaisse.
export const CITY_RUSH_PLAYER_HEALTH = 15;
export const CITY_RUSH_RACER_HEALTH = CITY_RUSH_PLAYER_HEALTH;

// ── Points de vie par voiture ───────────────────────────────────────────────
// `durabilityMultiplier` (voir `CITY_RUSH_CARS`) est le seul levier : la coque
// encaisse `CITY_RUSH_PLAYER_HEALTH × durabilityMultiplier` carrés, arrondis.
// Le plancher de quatre carrés garantit qu'aucune voiture ne parte à l'épave en
// moins de quatre chocs, même si un profil futur descendait très bas ; les
// entrées aberrantes (voiture inconnue, valeur manquante) retombent sur la
// référence de quinze.
export const CITY_RUSH_CAR_HEALTH_MIN = 4;
export const CITY_RUSH_CAR_HEALTH_MULTIPLIER_MIN = 0.25;

export function cityRushCarMaxHealth(profile, base = CITY_RUSH_PLAYER_HEALTH) {
  const reference = Math.max(1, Math.round(Number(base) || CITY_RUSH_PLAYER_HEALTH));
  const multiplier = Number(profile?.durabilityMultiplier);
  const safeMultiplier = Number.isFinite(multiplier) && multiplier > 0
    ? Math.max(CITY_RUSH_CAR_HEALTH_MULTIPLIER_MIN, multiplier)
    : 1;
  return Math.max(CITY_RUSH_CAR_HEALTH_MIN, Math.round(reference * safeMultiplier));
}

/** Barre de référence d'une voiture inconnue : celle du barème historique. */
export function cityRushBaseMaxHealth() {
  return CITY_RUSH_PLAYER_HEALTH;
}
export const CITY_RUSH_PLAYER_DAMAGE = Object.freeze({
  [CITY_RUSH_POWERS.BLUE_SHOT]: 1,
  [CITY_RUSH_POWERS.PISTOL]: 1,
  // Ancre de patch des harnais de course longue ; la ligne du dessous est
  // remplacée par le lanceur du smoke de course (voir `city-rush-smoke.mjs`).
  collision: 1, // choc contre une voiture : un carré pour le pilote
  'suv-collision': 2, // choc contre un SUV de police blindé : deux carrés
  spike: 1, // herse : un carré pour le pilote, pneus crevés
});
export const CITY_RUSH_PLAYER_HEALTH_FLASH = 0.3; // s : éclair de la barre qui vient d'encaisser
// Barre à zéro : la voiture part en toupie dans sa fumée, s'arrête, et la
// course est perdue. Le temps de l'épave est celui de la toupie (deux tours
// complets, `cityRushStunSpin`) — la page laisse ensuite la place au bilan.
export const CITY_RUSH_WRECK_SECONDS = 3.2;
export const CITY_RUSH_WRECK_SPIN_TURNS = 2;
// Les trois derniers carrés jaunes sont le seuil d'alerte rouge.
export const CITY_RUSH_PLAYER_HEALTH_CRITICAL = 3;
export const CITY_RUSH_HEALTH_GROUP_SIZE = 5;

// Un carambolage retire un carré (deux contre un SUV), quel que soit le nombre de contacts
// qu'il produit : le choc arme un répit partagé par toutes les voitures
// (trafic, contresens, berline de police). Sans lui, un embouteillage — ou
// deux carrosseries restées collées après le choc — facturerait un carré par
// image. Même esprit que `CITY_RUSH_POLICE_COLLISION_COOLDOWN`, qui protège la
// berline des contacts à répétition.
export const CITY_RUSH_PLAYER_COLLISION_COOLDOWN = 1.5; // s

export function cityRushPlayerDamage(health = CITY_RUSH_PLAYER_HEALTH, source = CITY_RUSH_POWERS.BLUE_SHOT) {
  const safeHealth = Math.max(0, Math.trunc(Number(health) || 0));
  const damage = Number(CITY_RUSH_PLAYER_DAMAGE[source]);
  if (!Number.isFinite(damage) || damage <= 0) return safeHealth;
  return Math.max(0, safeHealth - damage);
}

/** Un « + » rouge rend un carré à une coque endommagée, sans ressusciter une épave. */
export function cityRushHealthPickupRepair(health = CITY_RUSH_PLAYER_HEALTH, max = CITY_RUSH_PLAYER_HEALTH) {
  const safeMax = Math.max(1, Math.trunc(Number(max) || CITY_RUSH_PLAYER_HEALTH));
  const safeHealth = Math.max(0, Math.min(safeMax, Math.trunc(Number(health) || 0)));
  return safeHealth > 0
    ? Math.min(safeMax, safeHealth + CITY_RUSH_HEALTH_PICKUP_RESTORE)
    : 0;
}

/** Réparation de garage, plafonnée à la coque choisie, sans ressusciter une épave. */
export function cityRushMiniGarageRepair(health = CITY_RUSH_PLAYER_HEALTH, max = CITY_RUSH_PLAYER_HEALTH) {
  const safeMax = Math.max(1, Math.trunc(Number(max) || CITY_RUSH_PLAYER_HEALTH));
  const safeHealth = Math.max(0, Math.min(safeMax, Math.trunc(Number(health) || 0)));
  return safeHealth > 0 ? Math.min(safeMax, safeHealth + CITY_RUSH_MINI_GARAGE_REPAIR_AMOUNT) : 0;
}

export const CITY_RUSH_PLAYER_BAR_COLORS = Object.freeze({
  blue: '#48b9ff',
  green: '#50e48a',
  yellow: '#ffd44f',
  critical: '#ff526e',
});

/**
 * Découpe la vie en cellules colorées, par groupes de cinq.
 * La santé se vide de gauche à droite ; le ton d'un groupe suit sa place dans
 * la barre — bleu au début, vert au milieu, jaune dans la dernière longueur.
 * Quand il ne reste que trois cellules, elles deviennent rouges.
 *
 * `max` est la vie de **cette** voiture (`cityRushCarMaxHealth`) : une barre de
 * sept cellules (PULSE RS) affiche un groupe bleu et un groupe jaune, une barre
 * de vingt-trois (MISTRAL 1.4) en affiche cinq. Laissé à `CITY_RUSH_PLAYER_HEALTH`,
 * le découpage reste exactement celui du barème historique — quinze cellules,
 * trois groupes bleu / vert / jaune, les trois dernières au rouge.
 */
export function cityRushHealthSegments(health = CITY_RUSH_PLAYER_HEALTH, max = CITY_RUSH_PLAYER_HEALTH) {
  const safeMax = Math.max(1, Math.trunc(Number(max) || CITY_RUSH_PLAYER_HEALTH));
  const safeHealth = Math.max(0, Math.min(safeMax, Math.trunc(Number(health) || 0)));
  const firstFilled = safeMax - safeHealth;
  const groupCount = Math.ceil(safeMax / CITY_RUSH_HEALTH_GROUP_SIZE);
  return Array.from({ length: safeMax }, (_, index) => {
    const groupIndex = Math.floor(index / CITY_RUSH_HEALTH_GROUP_SIZE);
    const group = cityRushHealthGroupTone((groupIndex * CITY_RUSH_HEALTH_GROUP_SIZE) / safeMax);
    const active = index >= firstFilled;
    const critical = active && safeHealth <= CITY_RUSH_PLAYER_HEALTH_CRITICAL && groupIndex === groupCount - 1;
    const tone = critical ? 'critical' : group;
    return { index, groupIndex, group, active, critical, tone, color: CITY_RUSH_PLAYER_BAR_COLORS[tone] };
  });
}

/** Le ton d'un groupe selon sa place dans la barre : premier tiers, milieu, fin. */
export function cityRushHealthGroupTone(ratio = 0) {
  const value = Number(ratio);
  const safeRatio = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  if (safeRatio >= 2 / 3) return 'yellow';
  if (safeRatio >= 1 / 3) return 'green';
  return 'blue';
}

// Compatibilité avec les petits widgets qui n'affichent qu'une seule teinte :
// renvoie la couleur de la première cellule encore allumée.
export function cityRushPlayerHealthColor(health = CITY_RUSH_PLAYER_HEALTH, max = CITY_RUSH_PLAYER_HEALTH) {
  return cityRushHealthSegments(health, max).find((segment) => segment.active)?.color
    || CITY_RUSH_PLAYER_BAR_COLORS.critical;
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
// Projette une distance (en mètres sur la boucle de 1 200 m) et une voie
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

