import * as THREE from 'three';

export function drivingRouteWaypoints(exercise) {
  if (exercise.rule !== 'giratory') return [exercise.spawn, ...exercise.stages.flatMap((stage) => [...(stage.via || []), stage])];
  const [wait, entry, middle, exit, finish] = exercise.stages;
  const points = [exercise.spawn, wait, { x: 202.35, z: 228 }, { x: 205, z: 222 }, entry];
  let previous = entry;
  for (const next of [middle, exit]) {
    const a = Math.atan2(previous.z - 200, previous.x - 200);
    let b = Math.atan2(next.z - 200, next.x - 200);
    while (b > a) b -= Math.PI * 2;
    const r0 = Math.hypot(previous.x - 200, previous.z - 200);
    const r1 = Math.hypot(next.x - 200, next.z - 200);
    const count = Math.ceil((a - b) * 24);
    for (let i = 1; i <= count; i++) {
      const t = i / count, angle = a + (b - a) * t, radius = r0 + (r1 - r0) * t;
      points.push({ x: 200 + radius * Math.cos(angle), z: 200 + radius * Math.sin(angle) });
    }
    previous = next;
  }
  points.push({ x: 202.35, z: 177 }, finish);
  return points;
}

export function sampleDrivingRoute(exercise) {
  const waypoints = drivingRouteWaypoints(exercise), samples = [{ x: waypoints[0].x, z: waypoints[0].z }];
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1], b = waypoints[i], count = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / .5);
    for (let j = 1; j <= count; j++) samples.push({ x: a.x + (b.x - a.x) * j / count, z: a.z + (b.z - a.z) * j / count });
  }
  return samples;
}

export function createDrivingRoute(exercise, surfaceHeight) {
  const points = sampleDrivingRoute(exercise), vertices = [];
  const edges = points.map((point, i) => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const dx = -(b.z - a.z) / length * .11, dz = (b.x - a.x) / length * .11;
    return [-1, 1].map((side) => {
      const x = point.x + dx * side, z = point.z + dz * side;
      return [x, surfaceHeight(x, z) + .075, z];
    });
  });
  for (let i = 1; i < edges.length; i++) {
    for (const vertex of [edges[i - 1][0], edges[i - 1][1], edges[i][0], edges[i - 1][1], edges[i][1], edges[i][0]]) vertices.push(...vertex);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    color: 0x269fff, depthTest: true, depthWrite: true, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  }));
  mesh.name = 'driving-school-blue-route';
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  mesh.userData.route = { points, lengths, distance: 0, segment: 0, startIndex: 0 };
  return mesh;
}

// Advance along the itinerary, not the car heading: turns must remain visible ahead.
export function updateDrivingRoute(mesh, position) {
  const route = mesh.userData.route;
  let best = Infinity, distance = route.distance;
  const last = Math.min(route.points.length - 1, route.segment + 100);
  for (let i = route.segment; i < last; i++) {
    const a = route.points[i], b = route.points[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((position.x - a.x) * dx + (position.z - a.z) * dz) / (length2 || 1)));
    const error = Math.hypot(position.x - a.x - t * dx, position.z - a.z - t * dz);
    if (error < best) { best = error; distance = route.lengths[i] + Math.sqrt(length2) * t; }
  }
  route.distance = Math.max(route.distance, distance);
  while (route.segment + 1 < route.lengths.length && route.lengths[route.segment + 1] <= route.distance) route.segment++;
  // Start beyond the front bumper. Never leave a trail underneath/behind the car.
  let start = route.segment;
  while (start < route.points.length - 1 && route.lengths[start] < route.distance + 3) start++;
  route.startIndex = start;
  mesh.geometry.setDrawRange(start * 6, Math.max(0, (route.points.length - 1 - start) * 6));
}
