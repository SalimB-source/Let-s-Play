import { narrowPassageBodies } from './roadCodeExercises.js';
import { createDrivingRoute, drivingRouteWaypoints } from './drivingRoute.js';
import { createDrivingGroundMarker, placeDrivingGroundMarker } from './drivingGroundMarker.js';
import { priorityActorPose, actorPauseSeconds } from './frenchPriorityExercises.js';
import * as THREE from 'three';
export function createExerciseZone(scene, renderer, exercise, elevation) {
  const b = exercise.bounds;
  // Global clipping removes the rest of the city, including instanced geometry.
  renderer.clippingPlanes = [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -b.minX),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), b.maxX),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -b.minZ),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), b.maxZ),
  ];
  const rail = new THREE.MeshStandardMaterial({ color: 0xefb83f, roughness: .8 });
  const base = new THREE.MeshStandardMaterial({ color: 0x293d40, roughness: .9 });
  const edges = [
    [b.minX + .25, (b.minZ + b.maxZ) / 2, .4, b.maxZ - b.minZ],
    [b.maxX - .25, (b.minZ + b.maxZ) / 2, .4, b.maxZ - b.minZ],
    [(b.minX + b.maxX) / 2, b.minZ + .25, b.maxX - b.minX, .4],
    [(b.minX + b.maxX) / 2, b.maxZ - .25, b.maxX - b.minX, .4],
  ];
  for (const [x, z, w, d] of edges) {
    for (const [height, y, mat] of [[.5, .25, base], [.22, .95, rail]]) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), mat);
      mesh.position.set(x, elevation(x, z) + y, z); scene.add(mesh);
    }
  }
  const route = createDrivingRoute(exercise, elevation);
  scene.add(route);
  const start = createDrivingGroundMarker(0x64b7ff);
  placeDrivingGroundMarker(start, exercise.spawn.x, exercise.spawn.z, 2, elevation);
  scene.add(start);
  return route;
}
export function drawExerciseMap(context, size, exercise, state, target, priorityState, remainingRoute) {
  const b = exercise.bounds, padding = 20;
  const scale = (size - padding * 2) / Math.max(b.maxX - b.minX, b.maxZ - b.minZ);
  const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
  context.clearRect(0, 0, size, size); context.fillStyle = '#15292e'; context.fillRect(0, 0, size, size);
  context.save(); context.translate(size / 2, size / 2); context.scale(scale, scale); context.translate(-cx, -cz);
  context.beginPath(); context.rect(b.minX, b.minZ, b.maxX - b.minX, b.maxZ - b.minZ); context.clip();
  context.fillStyle = '#8d9b80'; context.fillRect(b.minX, b.minZ, b.maxX - b.minX, b.maxZ - b.minZ);
  context.fillStyle = '#52616a';
  for (let i = -3; i <= 3; i++) {
    if (i !== 0) context.fillRect(i * 100 - 7, b.minZ, 14, b.maxZ - b.minZ);
    context.fillRect(b.minX, i * 100 - 7, b.maxX - b.minX, 14);
  }
  if (exercise.rule === 'giratory') {
    context.fillStyle = '#52616a'; context.beginPath(); context.arc(200, 200, 25, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#8d9b80'; context.beginPath(); context.arc(200, 200, 10, 0, Math.PI * 2); context.fill();
  }
  context.fillStyle='#c6b35c';
  for(const body of narrowPassageBodies(exercise)) context.fillRect(body.x-body.width/2,body.z-body.depth/2,body.width,body.depth);
  const route = remainingRoute ?? drivingRouteWaypoints(exercise);
  context.strokeStyle = '#269fff'; context.lineWidth = 2 / scale;
  context.beginPath();
  route.forEach((point, i) => { if (i === 0) context.moveTo(point.x, point.z); else context.lineTo(point.x, point.z); });
  context.stroke();
  const dot = (x, z, color, radius) => { context.fillStyle = color; context.beginPath(); context.arc(x, z, radius / scale, 0, Math.PI * 2); context.fill(); };
  for (const actor of exercise.priority?.actors || []) {
    const pose = priorityActorPose(actor, state.time, priorityState?.triggerTime, actorPauseSeconds(priorityState, actor.id, state.time));
    dot(pose.x, pose.z, actor.emergency ? '#45baff' : actor.type === 'pedestrian' ? '#ff8f68' : actor.type === 'cyclist' ? '#24c3dc' : '#ffcb57', actor.type === 'pedestrian' ? 3 : 4);
  }
  dot(exercise.spawn.x, exercise.spawn.z, '#64b7ff', 4);
  if (target) dot(target.x, target.z, '#47ffb0', 5);
  context.save(); context.translate(state.x, state.z); context.rotate(state.heading);
  context.fillStyle = '#fff'; context.beginPath(); context.moveTo(0, -7 / scale); context.lineTo(-4 / scale, 5 / scale); context.lineTo(4 / scale, 5 / scale); context.closePath(); context.fill(); context.restore();
  context.restore();
  context.strokeStyle = '#efb83f'; context.lineWidth = 2;
  context.strokeRect(size / 2 + (b.minX - cx) * scale, size / 2 + (b.minZ - cz) * scale, (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale);
}
