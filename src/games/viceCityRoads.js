const ROAD_HALF = 7;

export const VICE_CITY_ROAD_HILLS = Object.freeze([
  { axis: 'z', fixed: -200, center: -150, halfLength: 44, height: 2.8 },
  { axis: 'z', fixed: 100, center: 150, halfLength: 44, height: 2.2 },
  { axis: 'x', fixed: 200, center: -150, halfLength: 44, height: 2.5 },
]);

/** Small traveling waves for the free-roam canal; intentionally shallow for boat clearance. */
export function viceCityCanalWaveHeight(x, z, time = 0) {
  return Math.sin(x * 0.62 + z * 0.13 + time * 1.1) * 0.052
    + Math.cos(z * 0.24 - x * 0.37 - time * 0.78) * 0.027;
}

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

export const VICE_CITY_OUTER_HIGHWAY = Object.freeze({
  edge: 455,
  cornerRadius: 100,
  halfWidth: 13,
  bankOffset: 90,
  bridgeDeckHeight: 10,
  cityGridLimit: 300,
  cityLimit: 480,
  accessHalfWidth: 5,
});

/** Smooth arched deck heights for the two motorway overpasses across the river. */
export function viceCityOuterHighwayBridgeHeight(x, z) {
  const { edge, halfWidth, bankOffset, bridgeDeckHeight } = VICE_CITY_OUTER_HIGHWAY;
  let height = 0;
  for (const crossingZ of [-edge, edge]) {
    if (Math.abs(z - crossingZ) > halfWidth) continue;
    const ramp = clamp(1 - Math.abs(x) / bankOffset, 0, 1);
    height = Math.max(height, bridgeDeckHeight * smoothStep(ramp));
  }
  return height;
}

/** Rounded perimeter roads joined into one continuous loop by elevated river crossings. */
export function viceCityOuterHighwayPaths() {
  const { edge, cornerRadius, bankOffset } = VICE_CITY_OUTER_HIGHWAY;
  const straightEnd = edge - cornerRadius;
  const makePath = (side) => {
    const points = [];
    const append = (x, z) => points.push({ x, z });
    const line = (x0, z0, x1, z1) => {
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 6));
      for (let step = 1; step <= steps; step += 1) {
        const t = step / steps;
        append(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t);
      }
    };
    const arc = (cx, cz, start, end) => {
      const steps = Math.max(1, Math.ceil(cornerRadius * Math.abs(end - start) / 6));
      for (let step = 1; step <= steps; step += 1) {
        const angle = start + (end - start) * step / steps;
        append(cx + cornerRadius * Math.cos(angle), cz + cornerRadius * Math.sin(angle));
      }
    };
    append(side * bankOffset, -edge);
    line(side * bankOffset, -edge, side * straightEnd, -edge);
    if (side > 0) {
      arc(straightEnd, -straightEnd, -Math.PI / 2, 0);
      line(edge, -straightEnd, edge, straightEnd);
      arc(straightEnd, straightEnd, 0, Math.PI / 2);
    } else {
      arc(-straightEnd, -straightEnd, -Math.PI / 2, -Math.PI);
      line(-edge, -straightEnd, -edge, straightEnd);
      arc(-straightEnd, straightEnd, Math.PI, Math.PI / 2);
    }
    line(side * straightEnd, edge, side * bankOffset, edge);
    return points;
  };
  const makeRiverCrossing = (z) => {
    const points = [];
    const steps = Math.max(1, Math.ceil((bankOffset * 2) / 6));
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      points.push({ x: -bankOffset + bankOffset * 2 * t, z });
    }
    return points;
  };
  return [makePath(-1), makePath(1), makeRiverCrossing(-edge), makeRiverCrossing(edge)];
}

/** True on the continuous perimeter ring, river overpasses, or access spurs. */
export function viceCityOuterHighwayContains(x, z) {
  const { edge, cornerRadius, halfWidth, bankOffset, cityGridLimit, accessHalfWidth } = VICE_CITY_OUTER_HIGHWAY;
  const straightEnd = edge - cornerRadius;
  const onRiverOverpass = [-edge, edge].some((crossingZ) =>
    Math.abs(z - crossingZ) <= halfWidth && Math.abs(x) <= bankOffset + halfWidth);
  const onUPath = [-1, 1].some((side) => {
    const topOrBottom = side * x >= bankOffset - 0.01
      && side * x <= straightEnd + halfWidth
      && (Math.abs(z + edge) <= halfWidth || Math.abs(z - edge) <= halfWidth);
    const farSide = Math.abs(x - side * edge) <= halfWidth && Math.abs(z) <= straightEnd + halfWidth;
    const onCorner = [-1, 1].some((verticalSide) => {
      if (side * x < straightEnd - halfWidth || verticalSide * z < straightEnd - halfWidth) return false;
      const centerX = side * straightEnd;
      const centerZ = verticalSide * straightEnd;
      return Math.abs(Math.hypot(x - centerX, z - centerZ) - cornerRadius) <= halfWidth;
    });
    return topOrBottom || farSide || onCorner;
  });
  const accessStart = cityGridLimit + 50;
  const onVerticalAccess = [-100, 100].some((fixedX) =>
    Math.abs(x - fixedX) <= accessHalfWidth && Math.abs(z) >= accessStart - 0.01
      && Math.abs(z) <= edge + halfWidth);
  const onHorizontalAccess = [-300, 300].some((fixedZ) =>
    Math.abs(z - fixedZ) <= accessHalfWidth && Math.abs(x) >= accessStart - 0.01
      && Math.abs(x) <= edge + halfWidth);
  return onUPath || onRiverOverpass || onVerticalAccess || onHorizontalAccess;
}
