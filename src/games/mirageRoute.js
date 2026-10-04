/**
 * Parcours visuel commun de Mirage Rush.
 *
 * Ces courbes ne participent jamais aux règles : elles servent uniquement à
 * déformer le décor et à orienter la caméra. La progression reste la distance
 * rectiligne du jeu, et les collisions continuent de lire les voies habituelles.
 */
const TAU = Math.PI * 2;

export const MIRAGE_ROUTE_CURVES = Object.freeze([
  Object.freeze({ amplitude: 1.1, wavelength: 138, phase: 0.25 }),
  Object.freeze({ amplitude: 0.38, wavelength: 72, phase: 1.8 }),
]);

export const MIRAGE_ROUTE_ELEVATIONS = Object.freeze([
  Object.freeze({ amplitude: 0.42, wavelength: 110, phase: 1.2 }),
  Object.freeze({ amplitude: 0.18, wavelength: 58, phase: 2.4 }),
]);

const safeDistance = (distance) => Number.isFinite(distance) ? distance : 0;

function waveValue(distance, waves) {
  return waves.reduce((sum, wave) => (
    sum + wave.amplitude * Math.sin(distance * TAU / wave.wavelength + wave.phase)
  ), 0);
}

function waveSlope(distance, waves) {
  return waves.reduce((sum, wave) => (
    sum + wave.amplitude * TAU / wave.wavelength
      * Math.cos(distance * TAU / wave.wavelength + wave.phase)
  ), 0);
}

/** Position latérale (x) et altitude (y) du centre de la piste à une distance. */
export function mirageRouteAt(distance, out = {}) {
  const s = safeDistance(distance);
  out.x = waveValue(s, MIRAGE_ROUTE_CURVES);
  out.y = waveValue(s, MIRAGE_ROUTE_ELEVATIONS);
  return out;
}

/** Pente de la route à une distance (dérivée par mètre parcouru). */
export function mirageRouteSlopeAt(distance, out = {}) {
  const s = safeDistance(distance);
  out.x = waveSlope(s, MIRAGE_ROUTE_CURVES);
  out.y = waveSlope(s, MIRAGE_ROUTE_ELEVATIONS);
  return out;
}

/**
 * Décalage visuel d'un point situé à `z` mètres du joueur.
 * À z = 0, le résultat est exactement nul : le repère de jeu ne bouge pas.
 */
export function mirageRouteOffset(progress, z, out = {}) {
  const distance = safeDistance(progress);
  const relativeZ = Number.isFinite(z) ? z : 0;
  const station = distance - relativeZ;
  out.x = waveValue(station, MIRAGE_ROUTE_CURVES) - waveValue(distance, MIRAGE_ROUTE_CURVES);
  out.y = waveValue(station, MIRAGE_ROUTE_ELEVATIONS) - waveValue(distance, MIRAGE_ROUTE_ELEVATIONS);
  return out;
}

/** Yaw et tangage décoratifs, le cavalier regardant vers l'avant (-z). */
export function mirageRouteOrientation(distance, out = {}) {
  const slope = mirageRouteSlopeAt(distance);
  out.yaw = -Math.atan(slope.x);
  out.pitch = Math.atan(slope.y);
  return out;
}

const glslNumber = (value) => Number(value).toPrecision(12);
const glslWave = (name, waves) => `float ${name}(float s) {
  return ${waves.map(({ amplitude, wavelength, phase }) => (
    `${glslNumber(amplitude)} * sin(s * ${glslNumber(TAU / wavelength)} + ${glslNumber(phase)})`
  )).join(' +\n    ')};
}`;
const glslSlope = (name, waves) => `float ${name}(float s) {
  return ${waves.map(({ amplitude, wavelength, phase }) => {
    const frequency = TAU / wavelength;
    return `${glslNumber(amplitude * frequency)} * cos(s * ${glslNumber(frequency)} + ${glslNumber(phase)})`;
  }).join(' +\n    ')};
}`;

/** Même chemin dans les shaders du relief et des accessoires du désert. */
export const MIRAGE_ROUTE_GLSL = [
  glslWave('mirageRouteX', MIRAGE_ROUTE_CURVES),
  glslWave('mirageRouteY', MIRAGE_ROUTE_ELEVATIONS),
  glslSlope('mirageRouteDY', MIRAGE_ROUTE_ELEVATIONS),
].join('\n');
