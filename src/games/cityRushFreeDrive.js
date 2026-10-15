// ════════════════════════════════════════════════════════════════════
// Conduite libre de Vice City Rush : la voiture se place où le pilote le
// décide sur la chaussée, sans être aimantée au centre d'une voie.
//
// Deux conduites, au choix dans les Options (préférence de l'appareil) :
//   · LIBRE (par défaut) — le volant pilote une **vitesse latérale**. Tant que
//     ← / → (ou Q / D) reste enfoncée, la voiture glisse ; à la relâche elle
//     s'arrête là où elle est, entre deux voies s'il le faut. Au doigt, la
//     voiture suit le glissé sur la route, sans attendre la fin du geste.
//   · VOIES — la conduite historique : chaque pression saute d'une voie
//     entière et la voiture se recentre dans sa voie.
//
// Le reste du jeu continue de raisonner en voies (trafic, rivaux, police,
// bonus, herse, contresens) : la voie du pilote devient la voie **la plus
// proche** de sa position, avec une petite hystérésis pour qu'une voiture qui
// roule sur la ligne ne papillonne pas d'une voie à l'autre. Les contacts, eux,
// se jugent sur la position réelle :
//   · une voiture à hauteur bloque le glissement de ce côté — et le pilote qui
//     insiste la pousse (le choc latéral de la conduite par voies) ;
//   · les murs du mini-garage et du conteneur à bazooka canalisent la voiture
//     (dedans ou à côté, jamais à travers une paroi) ;
//   · un tremplin pris à cheval rattrape la voiture ou la laisse passer à côté.
//
// Ce module ne contient que des règles pures, vérifiées par
// `tests/city-rush-free-drive.test.js` ; le monde (`ViceCityWorld`) les joue.
// ════════════════════════════════════════════════════════════════════
import { CITY_RUSH_LANE_WIDTH, CITY_RUSH_SIDE_CONTACT_GAP } from './cityRushRules.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};
const moveToward = (value, target, step) => (
  value < target ? Math.min(target, value + step) : Math.max(target, value - step)
);

// ── Mode de conduite ────────────────────────────────────────────────────────
export const CITY_RUSH_DRIVING_FREE = 'free';
export const CITY_RUSH_DRIVING_LANES = 'lanes';
export const CITY_RUSH_DRIVING_MODES = Object.freeze([CITY_RUSH_DRIVING_FREE, CITY_RUSH_DRIVING_LANES]);
export const CITY_RUSH_DEFAULT_DRIVING_MODE = CITY_RUSH_DRIVING_FREE;
// Préférence de l'appareil, comme le son et la caméra : rien n'est lié au compte.
export const CITY_RUSH_DRIVING_PREF_KEY = 'letsplay_vice_city_rush_driving_v1';

/** Toute valeur inconnue (préférence corrompue, ancienne version) retombe sur la conduite libre. */
export function normalizeCityRushDrivingMode(mode) {
  return mode === CITY_RUSH_DRIVING_LANES ? CITY_RUSH_DRIVING_LANES : CITY_RUSH_DRIVING_FREE;
}

export function nextCityRushDrivingMode(mode) {
  return normalizeCityRushDrivingMode(mode) === CITY_RUSH_DRIVING_FREE
    ? CITY_RUSH_DRIVING_LANES
    : CITY_RUSH_DRIVING_FREE;
}

export function cityRushDrivingModeLabel(mode) {
  return normalizeCityRushDrivingMode(mode) === CITY_RUSH_DRIVING_LANES ? 'VOIES' : 'LIBRE';
}

// ── Réglages du volant libre ────────────────────────────────────────────────
// Vitesse latérale de pointe (m/s) : une voie (2,10 m) se traverse en ~0,35 s,
// à peine plus que l'écart de la conduite par voies ; la chaussée urbaine
// entière (11,3 m) en ~1,4 s.
export const CITY_RUSH_FREE_STEER_MAX_LATERAL = 9;
// Le volant gagne son plein effet avec la vitesse d'avance : une voiture
// arrêtée sur la grille ne se décale pas en crabe.
export const CITY_RUSH_FREE_STEER_FULL_SPEED = 12; // m/s
// Prise de braquage, puis relâche et contre-braquage (plus francs : la voiture
// s'arrête net où le pilote lâche la touche).
export const CITY_RUSH_FREE_STEER_ACCEL = 45; // m/s²
export const CITY_RUSH_FREE_STEER_BRAKE = 90; // m/s²
// Distance sous laquelle un placement visé (glissé au doigt, démonstration du
// tutoriel) est considéré comme atteint.
export const CITY_RUSH_FREE_STEER_ARRIVE = 0.03; // m
// La voie du pilote ne change qu'une fois la ligne franchie de 20 cm.
export const CITY_RUSH_FREE_LANE_HYSTERESIS = 0.2; // m
// Marge entre la carrosserie et le bord de la chaussée.
export const CITY_RUSH_FREE_ROAD_MARGIN = 0.1; // m
// Au doigt : glisser sur 55 % de la largeur de l'écran couvre toute la route.
export const CITY_RUSH_FREE_TOUCH_SPAN = 0.55;
// Canalisation des structures : la voiture est guidée vers un passage
// praticable sur les derniers mètres avant l'entrée, à vitesse latérale bornée.
export const CITY_RUSH_FREE_FUNNEL_LEAD = 10; // m de route avant la structure
export const CITY_RUSH_FREE_FUNNEL_RATE = 6; // m/s
// Tolérance de frôlement d'une paroi : 10 cm de carrosserie peuvent mordre sur
// un mur. Sans elle, la voiture devait s'écarter du mini-garage plus loin que
// le bord de la piste du Ring (9,20 m de chaussée pour un portique de 5,40 m) :
// la traversée de l'atelier aurait été forcée.
export const CITY_RUSH_FREE_WALL_SQUEEZE = 0.1; // m
// Un tremplin rattrape la voiture dont le centre passe à moins de 1,5 m de son
// axe ; au-delà, la voiture doit le dépasser franchement par le côté.
export const CITY_RUSH_FREE_RAMP_CATCH = 1.5; // m
// Lecture visuelle : lacet de la caisse et braquage des roues (et du volant
// du cockpit) suivent le glissement.
export const CITY_RUSH_FREE_YAW_PER_MPS = 0.0135; // rad par m/s de glissement
export const CITY_RUSH_FREE_YAW_MAX = 0.12; // rad, comme l'écart de voie
export const CITY_RUSH_FREE_STEER_VISUAL_MAX = 0.34; // rad

/** Vitesse latérale permise (m/s) à une vitesse d'avance donnée. */
export function cityRushFreeLateralLimit(speed, {
  max = CITY_RUSH_FREE_STEER_MAX_LATERAL,
  fullSpeed = CITY_RUSH_FREE_STEER_FULL_SPEED,
} = {}) {
  const forward = Math.max(0, finite(speed, 0));
  const full = Math.max(1e-6, finite(fullSpeed, CITY_RUSH_FREE_STEER_FULL_SPEED));
  return Math.max(0, finite(max, CITY_RUSH_FREE_STEER_MAX_LATERAL)) * Math.min(1, forward / full);
}

/**
 * Débattement latéral de la voiture : jusqu'au bord de la chaussée (moins la
 * demi-largeur de la caisse et une marge), jamais en deçà du centre des voies
 * extérieures — une chaussée étroite (tōgé) garde ses voies praticables.
 */
export function cityRushFreeSteerBounds({
  laneXs = [],
  roadHalf = 0,
  halfWidth = 0.95,
  margin = CITY_RUSH_FREE_ROAD_MARGIN,
} = {}) {
  const xs = laneXs.map(Number).filter(Number.isFinite);
  if (!xs.length) return { min: 0, max: 0 };
  const edge = Math.max(0, finite(roadHalf, 0) - Math.max(0, finite(halfWidth, 0.95)) - Math.max(0, finite(margin, CITY_RUSH_FREE_ROAD_MARGIN)));
  return { min: Math.min(Math.min(...xs), -edge), max: Math.max(Math.max(...xs), edge) };
}

/**
 * Un pas de volant libre. `input` (−1 à 1) est le volant tenu (clavier) ;
 * `target`, quand il est donné, est un placement visé (glissé au doigt,
 * démonstration) : la voiture s'y rend et s'y arrête sans le dépasser.
 * Renvoie la position et la vitesse latérale suivantes, la consigne
 * (`desired`), la vitesse permise (`limit`), `arrived` quand le placement visé
 * est atteint, et `edge` quand la voiture bute sur le bord de la chaussée.
 */
export function cityRushFreeSteerStep({
  x = 0,
  velocity = 0,
  input = 0,
  target = null,
  dt = 0,
  speed = 0,
  bounds = null,
  max = CITY_RUSH_FREE_STEER_MAX_LATERAL,
  fullSpeed = CITY_RUSH_FREE_STEER_FULL_SPEED,
  accel = CITY_RUSH_FREE_STEER_ACCEL,
  brake = CITY_RUSH_FREE_STEER_BRAKE,
  arrive = CITY_RUSH_FREE_STEER_ARRIVE,
} = {}) {
  const step = Math.max(0, finite(dt, 0));
  const limit = cityRushFreeLateralLimit(speed, { max, fullSpeed });
  const accelRate = Math.max(0, finite(accel, CITY_RUSH_FREE_STEER_ACCEL));
  const brakeRate = Math.max(1e-6, finite(brake, CITY_RUSH_FREE_STEER_BRAKE));
  const arriveDistance = Math.max(0, finite(arrive, CITY_RUSH_FREE_STEER_ARRIVE));
  const lo = finite(bounds?.min, -Infinity);
  const hi = finite(bounds?.max, Infinity);
  const position = clamp(finite(x, 0), lo, hi);
  const lateral = finite(velocity, 0);
  const aimed = target !== null && target !== undefined && Number.isFinite(Number(target));
  const aim = aimed ? clamp(Number(target), lo, hi) : null;
  let desired;
  if (aimed) {
    const gap = aim - position;
    // Profil d'arrivée : la vitesse visée permet toujours de freiner avant le
    // placement (√(2·a·d), avec 15 % de réserve).
    desired = Math.abs(gap) <= arriveDistance
      ? 0
      : Math.sign(gap) * Math.min(limit, Math.sqrt(2 * brakeRate * Math.abs(gap)) * 0.85);
  } else {
    desired = clamp(finite(input, 0), -1, 1) * limit;
  }
  const gaining = desired !== 0
    && (lateral === 0 || Math.sign(desired) === Math.sign(lateral))
    && Math.abs(desired) > Math.abs(lateral);
  let nextLateral = moveToward(lateral, desired, (gaining ? accelRate : brakeRate) * step);
  let nextPosition = position + (lateral + nextLateral) * 0.5 * step;
  let arrived = false;
  if (aimed) {
    const before = aim - position;
    const after = aim - nextPosition;
    if (Math.abs(after) <= arriveDistance || (before !== 0 && Math.sign(after) !== Math.sign(before))) {
      nextPosition = aim;
      nextLateral = 0;
      arrived = true;
    }
  }
  let edge = null;
  if (nextPosition <= lo) {
    nextPosition = lo;
    if (nextLateral < 0) nextLateral = 0;
    edge = 'left';
  } else if (nextPosition >= hi) {
    nextPosition = hi;
    if (nextLateral > 0) nextLateral = 0;
    edge = 'right';
  }
  return { x: nextPosition, velocity: nextLateral, desired, limit, arrived, edge };
}

/**
 * Voie du pilote en conduite libre : la plus proche de sa position, mais la voie
 * tenue reste la sienne tant que la caisse n'a pas franchi la ligne de plus de
 * `hysteresis` mètres.
 */
export function cityRushFreeLaneForX(x, currentLane, laneXs = [], hysteresis = CITY_RUSH_FREE_LANE_HYSTERESIS) {
  const xs = laneXs.map(Number);
  if (!xs.length) return 0;
  const position = finite(x, 0);
  let nearest = 0;
  let best = Infinity;
  xs.forEach((laneX, lane) => {
    if (!Number.isFinite(laneX)) return;
    const delta = Math.abs(position - laneX);
    if (delta < best - 1e-9) {
      best = delta;
      nearest = lane;
    }
  });
  const lane = Math.trunc(finite(currentLane, nearest));
  if (lane === nearest || lane < 0 || lane >= xs.length || !Number.isFinite(xs[lane])) return nearest;
  const keep = CITY_RUSH_LANE_WIDTH / 2 + Math.max(0, finite(hysteresis, CITY_RUSH_FREE_LANE_HYSTERESIS));
  return Math.abs(position - xs[lane]) <= keep ? lane : nearest;
}

/**
 * Contact latéral : une voiture à hauteur (`|gap|` sous l'écart de contact,
 * le même que celui du choc latéral) ne se traverse pas. La voiture du pilote
 * glisse jusqu'à toucher sa carrosserie, puis s'arrête ; elle peut toujours
 * s'en écarter. Une voiture déjà imbriquée (rattrapée par l'arrière dans la
 * tolérance de la boîte de collision) n'est jamais repoussée, seulement pas
 * davantage abordée.
 * `cars` : `{ x, width, gap }` (gap = distance de la voiture moins celle du
 * pilote). Renvoie la position permise et la voiture qui a bloqué le geste.
 */
export function cityRushFreeSideContact({
  fromX = 0,
  toX = 0,
  halfWidth = 0.95,
  cars = [],
  contactGap = CITY_RUSH_SIDE_CONTACT_GAP,
} = {}) {
  const start = finite(fromX, 0);
  let position = finite(toX, start);
  const half = Math.max(0, finite(halfWidth, 0.95));
  const reach = Math.max(0, finite(contactGap, CITY_RUSH_SIDE_CONTACT_GAP));
  let blocker = null;
  let strongest = 0;
  for (const car of cars) {
    if (!car) continue;
    const carX = Number(car.x);
    const gap = Number(car.gap);
    if (!Number.isFinite(carX) || !Number.isFinite(gap) || Math.abs(gap) >= reach) continue;
    const offset = start - carX;
    // Exactement superposées : aucun côté ne se dégage, la voiture n'est pas
    // piégée pour autant.
    if (Math.abs(offset) < 1e-6) continue;
    const side = offset > 0 ? 1 : -1;
    const separation = half + Math.max(0, finite(car.width, 1.9)) / 2;
    const limit = Math.abs(offset) >= separation ? carX + side * separation : start;
    const allowed = side > 0 ? Math.max(position, limit) : Math.min(position, limit);
    if (allowed !== position) {
      const pushed = Math.abs(allowed - position);
      position = allowed;
      if (pushed >= strongest) {
        strongest = pushed;
        blocker = car;
      }
    }
  }
  return { x: position, blocker, blocked: Boolean(blocker) };
}

/**
 * Zones interdites au **centre** de la voiture le long d'une structure : chaque
 * paroi `[a, b]` (abscisses de ses faces) s'élargit de la demi-largeur de la
 * caisse, moins la tolérance de frôlement.
 */
export function cityRushFreeWallZones(walls = [], halfWidth = 0.95, squeeze = CITY_RUSH_FREE_WALL_SQUEEZE) {
  const reach = Math.max(0, finite(halfWidth, 0.95)) - Math.max(0, finite(squeeze, CITY_RUSH_FREE_WALL_SQUEEZE));
  return walls
    .map((wall) => [Number(wall?.[0]), Number(wall?.[1])])
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
    .map(([a, b]) => [Math.min(a, b) - reach, Math.max(a, b) + reach])
    .filter(([a, b]) => b > a);
}

/**
 * Tremplin pris en conduite libre : la voiture passe dessus (centre à moins de
 * `catchDistance` de l'axe du tremplin) ou franchement à côté ; la bande entre
 * les deux est interdite.
 */
export function cityRushFreeRampZones(rampX, {
  halfWidth = 0.95,
  rampHalfWidth = 1.2,
  catchDistance = CITY_RUSH_FREE_RAMP_CATCH,
} = {}) {
  const center = finite(rampX, 0);
  const inner = Math.max(0, finite(catchDistance, CITY_RUSH_FREE_RAMP_CATCH));
  const outer = Math.max(0, finite(rampHalfWidth, 1.2)) + Math.max(0, finite(halfWidth, 0.95));
  if (outer <= inner) return [];
  return [[center - outer, center - inner], [center + inner, center + outer]];
}

/** Le tremplin rattrape-t-il la voiture ? */
export function cityRushFreeRampCatches(x, rampX, catchDistance = CITY_RUSH_FREE_RAMP_CATCH) {
  const position = Number(x);
  const center = Number(rampX);
  if (!Number.isFinite(position) || !Number.isFinite(center)) return false;
  return Math.abs(position - center) <= Math.max(0, finite(catchDistance, CITY_RUSH_FREE_RAMP_CATCH));
}

/**
 * Position permise la plus proche : hors de toute zone interdite (fusionnées
 * quand elles se touchent) et dans le débattement. Une position déjà permise
 * est rendue telle quelle.
 */
export function cityRushFreeAllowedX(x, zones = [], bounds = null) {
  const lo = finite(bounds?.min, -Infinity);
  const hi = finite(bounds?.max, Infinity);
  const position = clamp(finite(x, 0), lo, hi);
  const spans = zones
    .map((zone) => [Number(zone?.[0]), Number(zone?.[1])])
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b))
    .map(([a, b]) => [Math.min(a, b), Math.max(a, b)])
    .sort((first, second) => first[0] - second[0]);
  const merged = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else merged.push([...span]);
  }
  for (const [a, b] of merged) {
    if (position <= a || position >= b) continue;
    const exits = [a, b].filter((edge) => edge >= lo - 1e-9 && edge <= hi + 1e-9);
    if (!exits.length) return position;
    return exits.reduce((best, edge) => (Math.abs(edge - position) < Math.abs(best - position) ? edge : best));
  }
  return position;
}

/**
 * Où en est la voiture face à une structure étendue entre `start` et `end` (en
 * mètres de route) : `'approach'` sur les `lead` mètres qui précèdent l'entrée
 * de son pare-chocs avant, `'inside'` tant que la caisse la chevauche, sinon
 * `null`.
 */
export function cityRushFreeStructurePhase({
  distance = 0,
  start = 0,
  end = 0,
  halfLength = 3,
  lead = CITY_RUSH_FREE_FUNNEL_LEAD,
} = {}) {
  const position = finite(distance, 0);
  const half = Math.max(0, finite(halfLength, 3));
  const from = Math.min(finite(start, 0), finite(end, 0));
  const to = Math.max(finite(start, 0), finite(end, 0));
  if (position - half > to) return null;
  if (position + half >= from) return 'inside';
  if (position + half >= from - Math.max(0, finite(lead, CITY_RUSH_FREE_FUNNEL_LEAD))) return 'approach';
  return null;
}

/**
 * Canalisation : à l'approche, la voiture est guidée vers la position permise
 * la plus proche à `rate` m/s ; dans la structure, elle y est tenue.
 */
export function cityRushFreeFunnel({
  x = 0,
  zones = [],
  bounds = null,
  phase = null,
  dt = 0,
  rate = CITY_RUSH_FREE_FUNNEL_RATE,
} = {}) {
  const position = finite(x, 0);
  if (phase !== 'approach' && phase !== 'inside') return position;
  const allowed = cityRushFreeAllowedX(position, zones, bounds);
  if (phase === 'inside') return allowed;
  return moveToward(position, allowed, Math.max(0, finite(rate, CITY_RUSH_FREE_FUNNEL_RATE)) * Math.max(0, finite(dt, 0)));
}

/**
 * Glissé au doigt : la voiture vise sa position au début du geste, décalée du
 * chemin parcouru par le doigt. `span` de la largeur de l'écran couvre tout le
 * débattement.
 */
export function cityRushFreeTouchTarget({
  startX = 0,
  startPointer = 0,
  pointer = 0,
  viewportWidth = 1,
  bounds = null,
  span = CITY_RUSH_FREE_TOUCH_SPAN,
} = {}) {
  const lo = finite(bounds?.min, -6);
  const hi = finite(bounds?.max, 6);
  const travel = Math.max(0.1, hi - lo);
  const width = Math.max(1, finite(viewportWidth, 1)) * clamp(finite(span, CITY_RUSH_FREE_TOUCH_SPAN), 0.05, 1);
  const shift = (finite(pointer, 0) - finite(startPointer, 0)) * (travel / width);
  return clamp(finite(startX, 0) + shift, lo, hi);
}

/** Lacet de la caisse (rad) : le nez suit le glissement, comme un écart de voie. */
export function cityRushFreeYaw(velocity) {
  // `+ 0` : jamais de zéro négatif (−0) sur une voiture qui ne glisse pas.
  return clamp(-finite(velocity, 0) * CITY_RUSH_FREE_YAW_PER_MPS, -CITY_RUSH_FREE_YAW_MAX, CITY_RUSH_FREE_YAW_MAX) + 0;
}

/**
 * Braquage visuel (rad, positif à droite) des roues avant et du volant du
 * cockpit : moitié glissement réel, moitié consigne — le volant tourne dès
 * l'appui, avant que la caisse n'ait pris sa vitesse.
 */
export function cityRushFreeSteerVisual({ velocity = 0, desired = 0, max = CITY_RUSH_FREE_STEER_MAX_LATERAL } = {}) {
  const reference = Math.max(1e-6, finite(max, CITY_RUSH_FREE_STEER_MAX_LATERAL));
  const ratio = (0.5 * finite(velocity, 0) + 0.5 * finite(desired, 0)) / reference;
  return clamp(ratio * 0.4, -CITY_RUSH_FREE_STEER_VISUAL_MAX, CITY_RUSH_FREE_STEER_VISUAL_MAX) + 0;
}
