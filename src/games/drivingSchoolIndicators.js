import * as THREE from 'three';
import { priorityRoadIsClear } from './frenchPriorityExercises.js';

export function schoolTurnSignal(exercise, position, priorityState) {
  if (exercise.id === 'parking-choice' && position.z > 260 && position.x > -204.7) return 'right';
  if (exercise.id === 'parking-exit' && position.x > -297 && position.z > -164) return 'left';
  if (exercise.id === 'lane-change' && position.z > -97.7) return 'left';
  if (exercise.id === 'left-turn-oncoming' && position.z <= 135 && position.x > 184) return 'left';
  if (exercise.id === 'right-turn-cyclist' && position.z <= 335 && position.x < 118) return 'right';
  if (exercise.id === 'right-turn' && position.z <= -65 && position.x < 316 && position.z > -105) return 'right';
  // Straight-on roundabout route: no left signal on entry, right signal before exit.
  if (exercise.rule === 'giratory' && position.z < 192 && position.z > 174 && position.x > 200) return 'right';
  if (exercise.id === 'blocked-lane' && priorityRoadIsClear(exercise, position.time, priorityState)) {
    if (position.x > -156 && position.z < -299) return 'left';
    if (position.x <= -159 && position.z > -301.7) return 'right';
  }
  return null;
}

export function installSchoolIndicators(car) {
  if (car.userData.schoolIndicators) return car.userData.schoolIndicators;
  const shell = car.userData.shell?.geometry;
  shell?.computeBoundingBox();
  const bounds = shell?.boundingBox ?? new THREE.Box3(new THREE.Vector3(-.9, .3, -2), new THREE.Vector3(.9, 1.4, 2));
  const root = car.userData.body ?? car;
  const materials = {}, lamps = {};
  for (const [direction, side] of [['left', -1], ['right', 1]]) {
    const material = new THREE.MeshStandardMaterial({ color: 0x4b2e10, emissive: 0xff9700, emissiveIntensity: 0, roughness: .3 });
    materials[direction] = material; lamps[direction] = [];
    const edgeX = side < 0 ? bounds.min.x : bounds.max.x;
    for (const z of [bounds.min.z - .04, bounds.max.z + .04]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(.19, .11, .055), material);
      lamp.name = `school-indicator-${direction}`;
      lamp.position.set(edgeX * .78, .75, z); root.add(lamp); lamps[direction].push(lamp);
    }
    const repeater = new THREE.Mesh(new THREE.BoxGeometry(.055, .08, .15), material);
    repeater.position.set(edgeX + side * .03, .82, -.6); root.add(repeater); lamps[direction].push(repeater);
  }
  const indicators = { materials, lamps, direction: null, startedAt: 0 };
  car.userData.schoolIndicators = indicators;
  return indicators;
}

export function updateSchoolIndicators(car, direction, time) {
  const indicators = installSchoolIndicators(car);
  if (indicators.direction !== direction) { indicators.direction = direction; indicators.startedAt = time; }
  const lit = Boolean(direction) && (time - indicators.startedAt) % .7 < .35;
  for (const side of ['left', 'right']) {
    const on = side === direction && lit;
    indicators.materials[side].color.setHex(on ? 0xffbd32 : 0x4b2e10);
    indicators.materials[side].emissiveIntensity = on ? 3 : 0;
  }
  return { direction, lit };
}
