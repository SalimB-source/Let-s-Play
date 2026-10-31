const ROAD_HALF = 7;

export const VICE_CITY_ROAD_HILLS = Object.freeze([
  { axis: 'z', fixed: -200, center: -150, halfLength: 44, height: 2.8 },
  { axis: 'z', fixed: 100, center: 150, halfLength: 44, height: 2.2 },
  { axis: 'x', fixed: 200, center: -150, halfLength: 44, height: 2.5 },
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothStep = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

// Hauteur des collines intégrées aux axes routiers de la conduite libre.
export function viceCityRoadElevation(x, z) {
  let elevation = 0;
  for (const hill of VICE_CITY_ROAD_HILLS) {
    const along = hill.axis === 'z' ? x : z;
    const across = Math.abs((hill.axis === 'z' ? z : x) - hill.fixed);
    if (Math.abs(along - hill.center) >= hill.halfLength || across >= ROAD_HALF + 6) continue;
    const progress = (along - hill.center + hill.halfLength) / (2 * hill.halfLength);
    const profile = Math.sin(progress * Math.PI) ** 2;
    const shoulder = 1 - smoothStep((across - ROAD_HALF) / 6);
    elevation = Math.max(elevation, hill.height * profile * shoulder);
  }
  return elevation;
}
