// Shared coordinates for 3D geometry, vehicle response and assessment (metres).
export const SCHOOL_STOP_JUNCTION = { x: -300, z: -200 };
export const SCHOOL_BUMPS = [
  { id: 'school-north', x: -200, z: -45, axis: 'z', limit: 20 },
  { id: 'school-west', x: -150, z: -200, axis: 'x', limit: 20 },
];
export const SCHOOL_CROSSINGS = [{ x: -200, z: -65, axis: 'z' }, { x: -135, z: -200, axis: 'x' }];
export function schoolBumpHeight(x, z) {
  return SCHOOL_BUMPS.reduce((height, bump) => {
    const along = Math.abs((bump.axis === 'x' ? x - bump.x : z - bump.z));
    const across = Math.abs(bump.axis === 'x' ? z - bump.z : x - bump.x);
    return Math.max(height, across <= 6.8 && along < 2 ? 0.18 * Math.cos(along * Math.PI / 4) ** 2 : 0);
  }, 0);
}
export function schoolBumpCrossed(bump, previous, sample) {
  const along = bump.axis;
  const across = along === 'x' ? 'z' : 'x';
  return Math.abs(sample[across] - bump[across]) <= 7
    && (previous[along] - bump[along]) * (sample[along] - bump[along]) <= 0
    && previous[along] !== sample[along];
}
export function schoolStopApproach(axis, direction) {
  return { axis, direction, line: SCHOOL_STOP_JUNCTION[axis] - direction * 18, across: SCHOOL_STOP_JUNCTION[axis === 'x' ? 'z' : 'x'] };
}
export function schoolRoadSpeedLimit(x, z) {
  return SCHOOL_BUMPS.some((bump) => Math.abs((bump.axis === 'x' ? x - bump.x : z - bump.z)) <= 18
    && Math.abs(bump.axis === 'x' ? z - bump.z : x - bump.x) <= 7) ? 20 : 50;
}

// X points east, Z points south. Positive offset is the driver's LEFT.
export function leftTrafficOffset(axis, direction, offset = 2.35) {
  return (axis === 'x' ? -direction : direction) * offset;
}
// Negative offset places equipment on the driver’s right; this is the default.
export function schoolApproachPlacement(center, axis, direction, before, offset = -7.9) {
  const across = axis === 'x' ? 'z' : 'x';
  return {
    x: center.x, z: center.z,
    [axis]: center[axis] - direction * before,
    [across]: center[across] + leftTrafficOffset(axis, direction, offset),
    yaw: axis === 'x' ? -direction * Math.PI / 2 : direction > 0 ? Math.PI : 0,
  };
}
export const SCHOOL_ROUNDABOUT = { x: 200, z: 200, radius: 25 };
export function schoolSignLayout() {
  const signs = [];
  const add = (type, label, center, axis, direction, before, feature, offset) => {
    signs.push({ type, label, axis, direction, before, feature, ...schoolApproachPlacement(center, axis, direction, before, offset) });
  };
  for (const bump of SCHOOL_BUMPS) for (const direction of [-1, 1]) {
    add('warning', '', bump, bump.axis, direction, 30, bump.id);
    add('speed', '20', bump, bump.axis, direction, 18, bump.id);
    add('speed', '50', bump, bump.axis, direction, -18, bump.id);
  }
  for (const crossing of SCHOOL_CROSSINGS) for (const direction of [-1, 1]) add('pedestrian', '', crossing, crossing.axis, direction, 3, 'crossing');
  for (const axis of ['x', 'z']) for (const direction of [-1, 1]) {
    add('stop', 'STOP', SCHOOL_STOP_JUNCTION, axis, direction, 18, 'stop-junction');
    add('yield', '', SCHOOL_ROUNDABOUT, axis, direction, 30, 'roundabout');
    add('roundabout', '', SCHOOL_ROUNDABOUT, axis, direction, 26, 'roundabout');
  }
  // Start of the westbound training route, on its right verge.
  add('speed', '50', { x: -160, z: 0 }, 'x', -1, 0, 'start');
  add('parking', 'P', { x: -200, z: -145 }, 'z', -1, 0, 'parking');
  return signs;
}
