// Subtract the roundabout's footprint from ordinary rectangular street furniture.
export function rectangleTouchesRoundabout(x, z, halfWidth, halfDepth, roundabout) {
  const dx = Math.max(0, Math.abs(x - roundabout.x) - halfWidth);
  const dz = Math.max(0, Math.abs(z - roundabout.z) - halfDepth);
  return Math.hypot(dx, dz) < roundabout.radius;
}

export function sidewalkRangesOutsideRoundabout(axis, crossCenter, halfWidth, start, end, roundabout) {
  const perpendicular = axis === 'x' ? roundabout.z : roundabout.x;
  const along = axis === 'x' ? roundabout.x : roundabout.z;
  const distance = Math.max(0, Math.abs(crossCenter - perpendicular) - halfWidth);
  if (distance >= roundabout.radius) return [[start, end]];
  const reach = Math.sqrt(roundabout.radius ** 2 - distance ** 2);
  return [[start, Math.min(end, along - reach)], [Math.max(start, along + reach), end]]
    .filter(([a, b]) => b - a > .05);
}
