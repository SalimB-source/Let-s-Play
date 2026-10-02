// Tremis de « Vice City Rush » : des tunnels courts qui percent la boucle de
// certains circuits, et sous lesquels la chaussée se resserre — trois voies,
// parfois deux seulement, restent ouvertes sur la traversée, le reste est muré.
//
// Ces règles sont pures (aucun Three.js) : le décor y taille la pierre, le
// monde y lit les collisions et la pénombre, la mini-carte y dessine les
// resserrements. Le joueur est bloqué au volant, les IA se rabattent.
import { CITY_RUSH_LANE_X, CITY_RUSH_LAP_LENGTH, cityRushMinimapPoint } from './cityRushRules.js';

// ─── Dimensions ────────────────────────────────────────────────────────────
// Longueur d'un tremis, de la bouche d'entrée à la bouche de sortie.
export const CITY_RUSH_TUNNEL_LENGTH = 42;
// Demi-largeur intérieure (le bord de la chaussée) et masse extérieure : la
// voûte avale le trottoir et s'arrête avant les façades.
export const CITY_RUSH_TUNNEL_HALF_WIDTH = 6.75;
export const CITY_RUSH_TUNNEL_OUTER_HALF = 10.6;
// Hauteur de la voûte : la caméra de poursuite passe à 6,6 m, donc tout ce qui
// enjambe la route doit rester au-dessus de 7,1 m.
export const CITY_RUSH_TUNNEL_HEIGHT = 8.8;
// Le toit de pierre : au-dessus, un parapet, deux aérations, et la nuit.
export const CITY_RUSH_TUNNEL_TOP = 15.4;
// Demi-largeur d'une voie : la paroi mord la chaussée jusqu'au bord du couloir.
export const CITY_RUSH_TUNNEL_LANE_HALF = 1.05;
// Deux voies ouvertes au minimum, sinon le tremis n'est qu'un entonnoir.
export const CITY_RUSH_TUNNEL_MIN_OPEN_LANES = 2;

// ─── Garde-fous de tracé ───────────────────────────────────────────────────
// Rien de lourd autour de la ligne de départ (0 et 600 m), ni du portique de
// mi-tour (300 m), ni du monument (162 m) : une voûte y masquerait un repère.
export const CITY_RUSH_TUNNEL_START_CLEARANCE = 78; // m, de part et d'autre de la ligne
export const CITY_RUSH_TUNNEL_GATE_CLEARANCE = 46; // m, autour du portique
export const CITY_RUSH_TUNNEL_LANDMARK_CLEARANCE = 12; // m, autour du monument
export const CITY_RUSH_TUNNEL_MONUMENT = CITY_RUSH_LAP_LENGTH * 0.27; // 162 m
export const CITY_RUSH_TUNNEL_GAP = 60; // m, entre deux tremis

// ─── Conduite ──────────────────────────────────────────────────────────────
// Un pilote se rabat `MERGE_LEAD` mètres avant la paroi ; le joueur, lui, est
// retenu au volant `PLAYER_LEAD` mètres avant — soit ~1 s à vitesse maximale.
export const CITY_RUSH_TUNNEL_MERGE_LEAD = 70;
export const CITY_RUSH_TUNNEL_PLAYER_LEAD = 26;
// La paroi mord `WALL_LEAD` mètres avant la bouche : les cônes plantés là.
export const CITY_RUSH_TUNNEL_WALL_LEAD = 4;
// Opacité de la pénombre sous la voûte (voile noir par-dessus le rendu).
export const CITY_RUSH_TUNNEL_VEIL = 0.56;

const ALL_LANES = Object.freeze(CITY_RUSH_LANE_X.map((_, lane) => lane));
const isLane = (lane) => Number.isInteger(lane) && lane >= 0 && lane < CITY_RUSH_LANE_X.length;

// ─── Plans ─────────────────────────────────────────────────────────────────
// Les tremis de chaque circuit : « quelques mètres » de voûte, et des voies
// murées du même côté pour dessiner un couloir lisible. Les créneaux sont
// donnés en mètres sur la boucle de 600 m. Paris et Londres n'en ont pas.
export const CITY_RUSH_TUNNEL_PLANS = Object.freeze({
  'vice-city': Object.freeze([
    Object.freeze({ id: 'ocean-drive', trackPosition: 96, openLanes: Object.freeze([1, 2, 3]) }),
    Object.freeze({ id: 'ocean-pinch', trackPosition: 204, openLanes: Object.freeze([2, 3]) }),
    Object.freeze({ id: 'ocean-underpass', trackPosition: 430, openLanes: Object.freeze([0, 1, 2]) }),
  ]),
  'new-york': Object.freeze([
    Object.freeze({ id: 'hudson-tube', trackPosition: 104, openLanes: Object.freeze([0, 1, 2]) }),
    Object.freeze({ id: 'brooklyn-cut', trackPosition: 360, openLanes: Object.freeze([1, 2, 3]) }),
  ]),
  tokyo: Object.freeze([
    Object.freeze({ id: 'shuto-ramp', trackPosition: 88, openLanes: Object.freeze([2, 3]) }),
    Object.freeze({ id: 'expressway', trackPosition: 204, openLanes: Object.freeze([1, 2]) }),
    Object.freeze({ id: 'bay-tunnel', trackPosition: 452, openLanes: Object.freeze([1, 2, 3]) }),
  ]),
  // Paris et Londres restent à ciel ouvert : « certains circuits » seulement.
  paris: Object.freeze([]),
  london: Object.freeze([]),
});

/**
 * Un créneau est-il traçable ? On garde la zone de départ dégagée, on évite le
 * portique de mi-tour et le monument, et on laisse `GAP` mètres entre deux
 * voûtes. Un plan mal tracé est ignoré plutôt que de casser la course.
 */
export function cityRushTunnelPlanFits(trackPosition) {
  const entry = Number(trackPosition);
  if (!Number.isFinite(entry)) return false;
  const exit = entry + CITY_RUSH_TUNNEL_LENGTH;
  if (entry < CITY_RUSH_TUNNEL_START_CLEARANCE) return false;
  if (exit > CITY_RUSH_LAP_LENGTH - CITY_RUSH_TUNNEL_START_CLEARANCE) return false;
  const keepsClear = (position, clearance) => exit <= position - clearance || entry >= position + clearance;
  if (!keepsClear(CITY_RUSH_LAP_LENGTH / 2, CITY_RUSH_TUNNEL_GATE_CLEARANCE)) return false;
  if (!keepsClear(CITY_RUSH_TUNNEL_MONUMENT, CITY_RUSH_TUNNEL_LANDMARK_CLEARANCE)) return false;
  return true;
}

/** Les voies ouvertes d'un créneau : contiguës, au moins deux, sinon aucune. */
function resolveOpenLanes(openLanes) {
  const wanted = [...new Set((Array.isArray(openLanes) ? openLanes : []).filter(isLane))].sort((a, b) => a - b);
  if (wanted.length < CITY_RUSH_TUNNEL_MIN_OPEN_LANES || wanted.length >= ALL_LANES.length) return ALL_LANES;
  const contiguous = wanted.every((lane, index) => index === 0 || lane === wanted[index - 1] + 1);
  return Object.freeze(contiguous ? wanted : ALL_LANES);
}

/**
 * Les parois d'un tremis : chaque paquet de voies murées voisines reçoit une
 * masse pleine hauteur, du bord de la chaussée jusqu'au bord du couloir. Un
 * resserrement au bord donne une paroi, resserrement central en donne deux.
 */
function resolveWalls(closedLanes, corridorOf) {
  const walls = [];
  let cursor = 0;
  while (cursor < ALL_LANES.length) {
    if (!closedLanes.includes(cursor)) { cursor += 1; continue; }
    let end = cursor;
    while (end + 1 < ALL_LANES.length && closedLanes.includes(end + 1)) end += 1;
    const group = closedLanes.filter((lane) => lane >= cursor && lane <= end);
    const corridorAfter = end + 1 < ALL_LANES.length && corridorOf.includes(end + 1);
    const corridorBefore = cursor - 1 >= 0 && corridorOf.includes(cursor - 1);
    const corridorLane = corridorAfter ? end + 1 : corridorBefore ? cursor - 1 : null;
    if (corridorLane !== null) {
      const corridorOnRight = corridorAfter;
      const innerX = corridorOnRight ? -CITY_RUSH_TUNNEL_HALF_WIDTH : CITY_RUSH_TUNNEL_HALF_WIDTH;
      const outerX = CITY_RUSH_LANE_X[corridorLane] + (corridorOnRight ? -1 : 1) * CITY_RUSH_TUNNEL_LANE_HALF;
      walls.push(Object.freeze({
        side: corridorOnRight ? 'left' : 'right',
        innerX,
        outerX,
        centerX: (innerX + outerX) / 2,
        width: Math.abs(outerX - innerX),
        // +1 : le couloir est du côté des x croissants, -1 : des x décroissants.
        corridor: corridorOnRight ? 1 : -1,
        closedLanes: Object.freeze(group),
      }));
    }
    cursor = end + 1;
  }
  return Object.freeze(walls);
}

function resolveTunnel(slot) {
  if (!cityRushTunnelPlanFits(slot?.trackPosition)) return null;
  const entry = Number(slot.trackPosition);
  const openLanes = resolveOpenLanes(slot.openLanes);
  const closedLanes = Object.freeze(ALL_LANES.filter((lane) => !openLanes.includes(lane)));
  return Object.freeze({
    id: String(slot.id || `tunnel-${entry}`),
    entry,
    exit: entry + CITY_RUSH_TUNNEL_LENGTH,
    openLanes,
    closedLanes,
    walls: resolveWalls(closedLanes, openLanes),
  });
}

/** Un tremis tient-il derrière le précédent, sans se chevaucher ? */
export function cityRushTunnelFollows(tunnel, previous) {
  if (!tunnel) return false;
  if (!previous) return true;
  return tunnel.entry >= previous.exit + CITY_RUSH_TUNNEL_GAP;
}

const CACHE = new Map();

/**
 * Les tremis d'un circuit, triés et validés : chaque créneau du plan qui tient
 * dans un espace libre devient une voûte. Sans circuit connu : ceux de
 * Vice City.
 */
export function cityRushTunnels(cityId) {
  const key = String(cityId || 'vice-city');
  const planned = CITY_RUSH_TUNNEL_PLANS[key] || CITY_RUSH_TUNNEL_PLANS['vice-city'] || [];
  const signature = planned.map((slot) => `${slot?.id}:${slot?.trackPosition}:${slot?.openLanes?.join('')}`).join('|');
  const cached = CACHE.get(key);
  if (cached && cached.signature === signature) return cached.tunnels;
  const tunnels = [];
  for (const slot of [...planned].sort((a, b) => (Number(a?.trackPosition) || 0) - (Number(b?.trackPosition) || 0))) {
    const tunnel = resolveTunnel(slot);
    if (cityRushTunnelFollows(tunnel, tunnels[tunnels.length - 1])) tunnels.push(tunnel);
  }
  const result = Object.freeze(tunnels);
  CACHE.set(key, { signature, tunnels: result });
  return result;
}

// ─── Interrogations ────────────────────────────────────────────────────────
/** Le tremis traversé à cette distance de piste, ou null. */
export function cityRushTunnelAt(distance, tunnels) {
  const value = Number(distance);
  if (!Number.isFinite(value) || !Array.isArray(tunnels)) return null;
  return tunnels.find((tunnel) => value >= tunnel.entry && value <= tunnel.exit) || null;
}

/**
 * Le tremis dont la paroi compte encore à cette distance : de `lead` mètres
 * avant la bouche (là où les cônes balisent) jusqu'à `trail` mètres après la
 * sortie. Sert à racler la paroi sur l'image même du franchissement.
 */
export function cityRushTunnelWallAt(distance, tunnels, lead = CITY_RUSH_TUNNEL_WALL_LEAD, trail = 0) {
  const value = Number(distance);
  if (!Number.isFinite(value) || !Array.isArray(tunnels)) return null;
  return tunnels.find((tunnel) => value >= tunnel.entry - Math.max(0, lead) && value <= tunnel.exit + Math.max(0, trail)) || null;
}

/** La voie est-elle ouverte dans ce tremis ? (hors tremis : toute voie l'est) */
export function cityRushTunnelLaneOpen(tunnel, lane) {
  if (!tunnel) return true;
  return tunnel.openLanes.includes(Number(lane));
}

/** La voie ouverte la plus proche : là où se rabat une voiture murée. */
export function cityRushTunnelNearestOpenLane(tunnel, lane) {
  if (!tunnel) return Number(lane);
  const first = tunnel.openLanes[0];
  const last = tunnel.openLanes[tunnel.openLanes.length - 1];
  return Math.max(first, Math.min(last, Math.trunc(Number(lane) || 0)));
}

/**
 * Voie à tenir pour un pilote : la sienne si elle reste ouverte, sinon la voie
 * ouverte la plus proche — en anticipant le tremis à venir quand `lead` est
 * fourni. Les IA, la police et le trafic se rabattent ainsi avant la paroi ;
 * le joueur, lui, est bloqué au volant par `canEnterLane`.
 */
export function cityRushTunnelLaneFor(distance, lane, tunnels, lead = 0) {
  const value = Number(distance);
  if (!Number.isFinite(value) || !Array.isArray(tunnels)) return Number(lane);
  const ahead = Math.max(0, Number(lead) || 0);
  const tunnel = cityRushTunnelAt(value, tunnels) || cityRushTunnelAt(value + ahead, tunnels);
  if (!tunnel || cityRushTunnelLaneOpen(tunnel, lane)) return Number(lane);
  return cityRushTunnelNearestOpenLane(tunnel, lane);
}

/**
 * Pénombre sous la voûte (0 → 1) pour la caméra : elle entre sous le tremis
 * `cameraLead` mètres de piste après la voiture et en ressort d'autant.
 */
export function cityRushTunnelShade(distance, tunnels, cameraLead = 0) {
  const value = Number(distance);
  if (!Number.isFinite(value) || !Array.isArray(tunnels)) return 0;
  const lead = Math.max(0, Number(cameraLead) || 0);
  let shade = 0;
  for (const tunnel of tunnels) {
    const from = tunnel.entry + lead;
    const to = tunnel.exit + lead;
    if (value < from - 5 || value > to + 5) continue;
    const fadeIn = Math.max(0, Math.min(1, (value - (from - 5)) / 5));
    const fadeOut = Math.max(0, Math.min(1, (to + 5 - value) / 5));
    shade = Math.max(shade, Math.min(fadeIn, fadeOut));
  }
  return shade;
}

/**
 * Voile noir au fond du tremis (0 → 1) : opaque tant qu'on regarde la voûte,
 * effacé sur les derniers mètres pour ne jamais passer devant la caméra.
 */
export function cityRushTunnelCurtain(distance, tunnel) {
  const value = Number(distance);
  if (!Number.isFinite(value) || !tunnel) return 0;
  const rise = Math.max(0, Math.min(1, (value - (tunnel.entry - 3)) / 5));
  const fall = Math.max(0, Math.min(1, (tunnel.exit - 1 - value) / 6));
  return Math.min(rise, fall);
}

/**
 * Bande de mini-carte : le tremis projeté sur le tracé 2D — position, cap et
 * longueur du souterrain, bande latérale des voies murées — pour que le
 * resserrement se voie venir. `laneSpacing` est l'écartement des voies sur la
 * carte, `laneHalf` leur demi-largeur.
 */
export function cityRushTunnelMinimapBands(cityId, { lapLength = CITY_RUSH_LAP_LENGTH, laneSpacing = 1.45 } = {}) {
  const laneCount = CITY_RUSH_LANE_X.length;
  const middle = (laneCount - 1) / 2;
  const roadHalf = middle * laneSpacing + laneSpacing / 2;
  return cityRushTunnels(cityId).map((tunnel) => {
    const entry = cityRushMinimapPoint(tunnel.entry, middle, { lapLength, laneSpacing: 0 });
    const exit = cityRushMinimapPoint(tunnel.exit, middle, { lapLength, laneSpacing: 0 });
    // Une bande par paroi : un resserrement au bord en donne une, un couloir
    // central en donnerait deux.
    const walls = tunnel.walls.map((wall) => Object.freeze({
      side: wall.side,
      from: (Math.min(...wall.closedLanes) - middle) * laneSpacing - laneSpacing / 2,
      to: (Math.max(...wall.closedLanes) - middle) * laneSpacing + laneSpacing / 2,
    }));
    return Object.freeze({
      id: tunnel.id,
      x: (entry.x + exit.x) / 2,
      y: (entry.y + exit.y) / 2,
      deg: entry.deg,
      length: Math.hypot(exit.x - entry.x, exit.y - entry.y),
      roadHalf,
      openLanes: tunnel.openLanes,
      closedLanes: tunnel.closedLanes,
      walls: Object.freeze(walls),
    });
  });
}
