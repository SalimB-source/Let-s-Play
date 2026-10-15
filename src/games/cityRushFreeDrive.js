// ════════════════════════════════════════════════════════════════════
// Conduite libre de Vice City Rush : la voiture a un volant et un cap,
// comme une vraie voiture — elle n'est plus aimantée au centre d'une voie
// et ne glisse plus en crabe.
//
// Deux conduites, au choix dans les Options (préférence de l'appareil) :
//   · LIBRE (par défaut) — le volant tourne le **nez** de la voiture
//     (modèle bicyclette). Tenir ← / → (ou Q / D) braque les roues ; le cap
//     suit, et la voiture file là où pointe son nez. Relâcher rend le volant
//     (il revient seul au centre) mais pas le cap : la voiture continue
//     tout droit — dans les virages, c'est au pilote de tourner, sinon elle
//     file vers l'extérieur et le bord de la chaussée la redresse. Pour
//     s'aligner, on contre-braque. Au doigt, la voiture rejoint le point visé
//     par le glissé et s'y arrête, droite.
//   · VOIES — la conduite historique : chaque pression saute d'une voie
//     entière et la voiture se recentre dans sa voie.
//
// Le reste du jeu continue de raisonner en voies (trafic, rivaux, police,
// bonus, herse, contresens) : la voie du pilote devient la voie **la plus
// proche** de sa position, avec une petite hystérésis pour qu'une voiture qui
// roule sur la ligne ne papillonne pas d'une voie à l'autre. Les contacts, eux,
// se jugent sur la position réelle :
//   · une voiture à hauteur bloque le geste vers elle — et le pilote qui
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

// ── Réglages du volant réel ────────────────────────────────────────────────
// La voiture roule en modèle bicyclette, repérée sur la chaussée par sa
// position latérale `x` (m, positif à droite) et son cap `heading` (rad,
// positif nez à droite). Le volant `steer` (rad, positif à droite) tourne le
// nez à raison de (v/L)·tan(steer) ; la route qui tourne déporte le cap de
// κ·v (κ = courbure du tracé, positive à gauche) ; et le cap déporte la
// voiture de v·sin(heading). Rien ne ramène le cap : sans volant, la voiture
// continue tout droit — c'est au pilote de contre-braquer.
//
// Empattement du modèle bicyclette.
export const CITY_RUSH_FREE_WHEELBASE = 2.6; // m
// Butée de braquage des roues avant (~24°).
export const CITY_RUSH_FREE_STEER_ANGLE_MAX = 0.42; // rad
// Prise du volant, puis retour au centre (le volant se rend, pas le cap).
export const CITY_RUSH_FREE_STEER_RATE = 4.5; // rad/s
export const CITY_RUSH_FREE_STEER_RETURN = 12; // rad/s
// Plafond de lacet arcade : au-delà de ~13 m/s, la vitesse de rotation du nez
// plafonne à GRIP/v (comme une adhérence qui faiblit avec la vitesse). Le
// niveau est choisi pour la géométrie du jeu : l'épingle du tōgé (κ = 0,020)
// reste tenable plein braquage à la vitesse du rythme, et un appui bref reste
// sous le cran pardonné — la ville ne tressaille pas à chaque touche.
export const CITY_RUSH_FREE_YAW_GRIP = 28; // m/s²
// La voiture ne part jamais en travers : son cap reste sous 12°, ce qui borne
// la glissade latérale autour de 5 m/s en ville, 7 m/s sur le Ring.
export const CITY_RUSH_FREE_HEADING_MAX = 0.2; // rad
// Volant lâché sur une route droite : sous 7° d'écart au cap, la voiture
// raccroche toute seule la ligne droite. Un clavier ne connaît que tout ou
// rien — ce dernier cran de volant est pardonné, pas les vrais écarts.
export const CITY_RUSH_FREE_STRAIGHT_SNAP = 0.13; // rad
// Une route est « droite » pour ce raccrochage sous 0,002 rad/m : les villes
// et leurs S doux le sont, les virages du Ring, de Vice City et du tōgé non.
export const CITY_RUSH_FREE_STRAIGHT_ROAD = 0.002; // rad/m
// Courbure du tracé lissée sur cette demi-fenêtre : le tracé tourne plus sec
// qu'une caisse (une épingle du tōgé prend 45° en neuf mètres) — le châssis
// négocie la même courbe en douceur, et la dérive sans volant reste jouable.
export const CITY_RUSH_FREE_CURVE_WINDOW = 20; // m
// Placement visé (glissé au doigt, démonstration du tutoriel, écart demandé) :
// le pilote assisté vise un cap, freine avant l'arrivée (√(2·a·d) avec
// réserve) et se pose droit sur la cible, sans jamais la dépasser.
export const CITY_RUSH_FREE_AIM_BRAKE = 40; // m/s²
export const CITY_RUSH_FREE_AIM_RESERVE = 0.7;
export const CITY_RUSH_FREE_AIM_KP = 6; // rad/s de correction par rad d'écart
export const CITY_RUSH_FREE_AIM_HEADING_MAX = 0.2; // rad : cap du placement borné
// Distance sous laquelle un placement visé est considéré comme atteint.
export const CITY_RUSH_FREE_STEER_ARRIVE = 0.03; // m
// La voie du pilote ne change qu'une fois la ligne franchie de 15 cm : sur des
// voies de 2,50 m, la zone tenue (1,25 m + 0,15 m = 1,40 m) reste sous la
// boîte de contact de la voiture la plus étroite (1,43 m), garantissant que
// « même voie » signifie toujours « carrosseries alignées ».
export const CITY_RUSH_FREE_LANE_HYSTERESIS = 0.15; // m
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
// Lecture visuelle : le lacet de la caisse EST le cap (borné comme lui), et
// le braquage des roues avant (du volant du cockpit aussi) est l'angle réel.
export const CITY_RUSH_FREE_YAW_MAX = CITY_RUSH_FREE_HEADING_MAX; // rad
export const CITY_RUSH_FREE_STEER_VISUAL_MAX = 0.34; // rad

/**
 * Courbure du tracé sous la voiture (rad/m, positive quand la route tourne à
 * gauche), lissée sur `window` mètres de part et d'autre. `yawAt` est l'angle
 * de cap du tracé (celui du profil de piste), `lap` la longueur d'un tour
 * pour replier la lecture.
 */
export function cityRushFreeRoadCurvature(yawAt, distance = 0, {
  lap = 0,
  window = CITY_RUSH_FREE_CURVE_WINDOW,
} = {}) {
  const read = typeof yawAt === 'function' ? yawAt : null;
  if (!read) return 0;
  const span = Math.max(0.5, finite(window, CITY_RUSH_FREE_CURVE_WINDOW));
  const position = finite(distance, 0);
  const fold = (value) => {
    const turn = Number.isFinite(Number(lap)) && Number(lap) > 0 ? Number(lap) : 0;
    if (!turn) return value;
    return ((value % turn) + turn) % turn;
  };
  const ahead = read(fold(position + span));
  const behind = read(fold(position - span));
  if (!Number.isFinite(ahead) || !Number.isFinite(behind)) return 0;
  // La fenêtre peut chevaucher le point de repli : l'écart de cap lisible
  // alors est l'autre moitié du tour.
  let delta = ahead - behind;
  if (Number.isFinite(Number(lap)) && Number(lap) > 0) {
    const turn = Number(lap);
    if (delta > turn / 2) delta -= turn;
    if (delta < -turn / 2) delta += turn;
  }
  return delta / (2 * span);
}

/** Vitesse de rotation du nez permise par le volant (rad/s) à `speed` (m/s). */
export function cityRushFreeYawLimit(speed, {
  wheelbase = CITY_RUSH_FREE_WHEELBASE,
  angleMax = CITY_RUSH_FREE_STEER_ANGLE_MAX,
  grip = CITY_RUSH_FREE_YAW_GRIP,
} = {}) {
  const forward = Math.max(0, finite(speed, 0));
  const base = Math.max(1e-6, finite(wheelbase, CITY_RUSH_FREE_WHEELBASE));
  const lock = Math.max(1e-6, Math.tan(Math.max(0, finite(angleMax, CITY_RUSH_FREE_STEER_ANGLE_MAX))));
  const hold = Math.max(1e-6, finite(grip, CITY_RUSH_FREE_YAW_GRIP));
  return Math.max(1e-6, Math.min((forward / base) * lock, hold / Math.max(forward, 1e-6)));
}

/**
 * Un pas de volant réel. `input` (−1 à 1) est le volant tenu (clavier) ;
 * `target`, quand il est donné, est un placement visé (glissé au doigt,
 * démonstration, écart demandé) : le pilote assisté s'y rend et s'y arrête
 * droit, sans dépasser la cible. `curvature` est la courbure du tracé
 * (`cityRushFreeRoadCurvature`), `frozen` gèle la voiture (toupie, épave,
 * saut). Renvoie la position, le cap (`heading`, positif à droite), l'angle
 * de braquage (`steer`), le glissement réel (`lateral` = v·sin(cap)), la
 * consigne (`desired`, pour le choc latéral), la vitesse de lacet permise
 * (`limit`), `arrived` quand le placement visé est atteint, et `edge` quand
 * la voiture bute sur le bord de la chaussée — le monde y redresse le cap.
 */
export function cityRushFreeDriveStep({
  x = 0,
  heading = 0,
  steer = 0,
  input = 0,
  target = null,
  dt = 0,
  speed = 0,
  curvature = 0,
  frozen = false,
  bounds = null,
  wheelbase = CITY_RUSH_FREE_WHEELBASE,
  angleMax = CITY_RUSH_FREE_STEER_ANGLE_MAX,
  steerRate = CITY_RUSH_FREE_STEER_RATE,
  returnRate = CITY_RUSH_FREE_STEER_RETURN,
  grip = CITY_RUSH_FREE_YAW_GRIP,
  headingMax = CITY_RUSH_FREE_HEADING_MAX,
  snap = CITY_RUSH_FREE_STRAIGHT_SNAP,
  straightRoad = CITY_RUSH_FREE_STRAIGHT_ROAD,
  aimBrake = CITY_RUSH_FREE_AIM_BRAKE,
  aimReserve = CITY_RUSH_FREE_AIM_RESERVE,
  aimKp = CITY_RUSH_FREE_AIM_KP,
  aimHeadingMax = CITY_RUSH_FREE_AIM_HEADING_MAX,
  arrive = CITY_RUSH_FREE_STEER_ARRIVE,
} = {}) {
  const step = Math.max(0, finite(dt, 0));
  const forward = Math.max(0, finite(speed, 0));
  const cap = Math.max(1e-6, finite(headingMax, CITY_RUSH_FREE_HEADING_MAX));
  const lock = Math.max(1e-6, finite(angleMax, CITY_RUSH_FREE_STEER_ANGLE_MAX));
  const k = finite(curvature, 0);
  const lo = finite(bounds?.min, -Infinity);
  const hi = finite(bounds?.max, Infinity);
  let position = clamp(finite(x, 0), lo, hi);
  let course = clamp(finite(heading, 0), -cap, cap);
  let wheel = clamp(finite(steer, 0), -lock, lock);
  const aimed = !frozen && target !== null && target !== undefined && Number.isFinite(Number(target));
  const aim = aimed ? clamp(Number(target), lo, hi) : null;
  const yawLimit = cityRushFreeYawLimit(forward, { wheelbase, angleMax: lock, grip });
  let desired = 0;
  let arrived = false;

  if (!frozen && step > 0) {
    // ── Consigne du volant ──────────────────────────────────────────────
    // Au clavier : la touche tenue. En placement visé : un pilote assisté
    // qui vise le cap donnant la vitesse latérale du profil de freinage, et
    // braque à l'avance pour tenir ce cap dans la courbe (κ·v en avance).
    let command = clamp(finite(input, 0), -1, 1);
    if (aimed) {
      const gap = aim - position;
      const aimCap = Math.max(1e-6, finite(aimHeadingMax, CITY_RUSH_FREE_AIM_HEADING_MAX));
      const brake = Math.max(1e-6, finite(aimBrake, CITY_RUSH_FREE_AIM_BRAKE));
      const reserve = clamp(finite(aimReserve, CITY_RUSH_FREE_AIM_RESERVE), 0.05, 1);
      const kp = Math.max(1e-6, finite(aimKp, CITY_RUSH_FREE_AIM_KP));
      const wanted = Math.abs(gap) <= Math.max(0, finite(arrive, CITY_RUSH_FREE_STEER_ARRIVE))
        ? 0
        : Math.sign(gap) * Math.min(forward * Math.sin(aimCap), Math.sqrt(2 * brake * Math.abs(gap)) * reserve);
      const courseAim = forward > 0.5
        ? Math.asin(clamp(wanted / forward, -Math.sin(aimCap), Math.sin(aimCap)))
        : 0;
      const omega = (courseAim - course) * kp - k * forward;
      command = clamp(omega / yawLimit, -1, 1);
      desired = Math.abs(gap) > 1e-9 ? Math.sign(gap) : 0;
    } else if (command !== 0) {
      desired = Math.sign(command);
    }

    // ── Le volant prend ou se rend ──────────────────────────────────────
    // Traverser le centre (contre-braquer) est aussi franc que rendre : le
    // pilote qui reprend la main n'attend pas le retour complet du volant.
    const wheelTarget = command * lock;
    const crossing = wheelTarget * wheel < 0 || Math.abs(wheelTarget) < Math.abs(wheel);
    const rate = crossing
      ? Math.max(Math.max(0, finite(steerRate, CITY_RUSH_FREE_STEER_RATE)), Math.max(0, finite(returnRate, CITY_RUSH_FREE_STEER_RETURN)))
      : Math.max(0, finite(steerRate, CITY_RUSH_FREE_STEER_RATE));
    wheel = moveToward(wheel, wheelTarget, rate * step);

    // ── Le nez tourne, la route tourne sous la voiture ──────────────────
    const wheelRate = Math.max(1e-6, finite(wheelbase, CITY_RUSH_FREE_WHEELBASE));
    const omega = clamp((forward / wheelRate) * Math.tan(wheel), -yawLimit, yawLimit);
    course = course + (omega + k * forward) * step;

    // Volant lâché, route droite, cap presque droit : la voiture raccroche
    // la ligne droite — le dernier cran de volant est pardonné.
    const straight = Math.abs(k) <= Math.max(0, finite(straightRoad, CITY_RUSH_FREE_STRAIGHT_ROAD));
    if (!aimed && command === 0 && Math.abs(wheel) <= 1e-6 && straight && Math.abs(course) <= Math.max(0, finite(snap, CITY_RUSH_FREE_STRAIGHT_SNAP))) {
      course = 0;
    }
    course = clamp(course, -cap, cap);

    // ── Le cap déporte la voiture ───────────────────────────────────────
    let next = position + (forward * Math.sin(course)) * step;
    if (aimed) {
      const before = aim - position;
      const after = aim - next;
      if (Math.abs(after) <= Math.max(0, finite(arrive, CITY_RUSH_FREE_STEER_ARRIVE))
        || (before !== 0 && Math.sign(after) !== Math.sign(before))) {
        // Le pilote assisté se gare sur sa cible, aligné sur la route : le
        // cap rendu au tracé, les roues gardant juste le contre-braquage de
        // la courbe. La cible reste visée tant que le doigt la tient (glissé
        // au doigt) ou que la démonstration la reprend — sinon le monde
        // l'efface, et la voiture suit la route.
        next = aim;
        arrived = true;
        course = 0;
      }
    }
    position = next;
  }

  // ── Bord de la chaussée : la voiture bute (le monde y redressera le cap)
  let edge = null;
  if (position <= lo) {
    position = lo;
    edge = 'left';
  } else if (position >= hi) {
    position = hi;
    edge = 'right';
  }
  const lateral = frozen ? 0 : forward * Math.sin(course);
  return {
    x: position,
    heading: course,
    steer: wheel,
    lateral,
    desired,
    limit: yawLimit,
    arrived,
    edge,
  };
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
 * Voie du pilote en conduite libre : la plus proche de sa position, mais la voie
 * tenue reste la sienne tant que la caisse n'a pas franchi la ligne de plus de
 * `hysteresis` mètres. `laneWidth` suit la voie du parcours (2,50 m en ville,
 * 2,10 m sur un circuit) : l'hystérésis vaut la moitié d'une voie.
 */
export function cityRushFreeLaneForX(
  x,
  currentLane,
  laneXs = [],
  hysteresis = CITY_RUSH_FREE_LANE_HYSTERESIS,
  laneWidth = CITY_RUSH_LANE_WIDTH,
) {
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
  const width = Number.isFinite(Number(laneWidth)) && Number(laneWidth) > 0
    ? Number(laneWidth)
    : CITY_RUSH_LANE_WIDTH;
  const keep = width / 2 + Math.max(0, finite(hysteresis, CITY_RUSH_FREE_LANE_HYSTERESIS));
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

/**
 * Lacet de la caisse (rad, espace du maillage : positif à gauche) : le nez
 * suit le cap réel, positif à droite — d'où le signe.
 */
export function cityRushFreeYaw(heading) {
  // `+ 0` : jamais de zéro négatif (−0) sur une voiture au cap droit.
  return clamp(-finite(heading, 0), -CITY_RUSH_FREE_YAW_MAX, CITY_RUSH_FREE_YAW_MAX) + 0;
}

/**
 * Braquage visuel (rad, positif à droite) des roues avant et du volant du
 * cockpit : l'angle réel des roues, ramené au débattement de l'affichage.
 */
export function cityRushFreeSteerVisual(
  steer,
  max = CITY_RUSH_FREE_STEER_ANGLE_MAX,
  visualMax = CITY_RUSH_FREE_STEER_VISUAL_MAX,
) {
  const lock = Math.max(1e-6, finite(max, CITY_RUSH_FREE_STEER_ANGLE_MAX));
  const ratio = clamp(finite(steer, 0) / lock, -1, 1);
  return clamp(ratio * Math.max(0, finite(visualMax, CITY_RUSH_FREE_STEER_VISUAL_MAX)), -CITY_RUSH_FREE_STEER_VISUAL_MAX, CITY_RUSH_FREE_STEER_VISUAL_MAX) + 0;
}
