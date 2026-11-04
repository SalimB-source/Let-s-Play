import { drivingTeachingEnabled } from './drivingLearning.js';
import * as THREE from 'three';

export function isExerciseSign(exercise, x, z) {
  const b = exercise?.bounds;
  return drivingTeachingEnabled(exercise) && !!b && x >= b.minX - 2 && x <= b.maxX + 2 && z >= b.minZ - 2 && z <= b.maxZ + 2;
}

export function isExerciseSignal(exercise, spec) {
  return drivingTeachingEnabled(exercise) && !!exercise?.stages.some(stage => {
    const s = stage.signal;
    if (!s || s.ix !== spec.ix || s.iz !== spec.iz || s.axis !== spec.axis) return false;
    const center = (s.axis === 'x' ? s.ix : s.iz) * 100;
    return (stage[s.axis] - center) * (spec[s.axis] - center) > 0;
  });
}

// Small local halos, no scene-wide bloom and no changes to real sign/lens colours.
export function addTeachingHalo(parent, { width = 2, height = 2, y = 0, z = 0 } = {}) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [stop, alpha] of [[0, 0], [.38, 0], [.56, .48], [.72, .22], [1, 0]]) gradient.addColorStop(stop, `rgba(255,210,38,${alpha})`);
  context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: true, toneMapped: false, blending: THREE.AdditiveBlending }));
  halo.name = 'exercise-yellow-teaching-halo'; halo.position.set(0, y, z); halo.scale.set(width, height, 1); parent.add(halo);
  return halo;
}

export function addTeachingBarGlow(scene, from, to) {
  const direction = new THREE.Vector3().subVectors(to, from), length = direction.length();
  const group = new THREE.Group(); group.name = 'exercise-yellow-signal-bar-glow';
  group.position.copy(from).add(to).multiplyScalar(.5);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  for (const [radius, opacity] of [[.14, .42], [.22, .18], [.34, .07]]) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), new THREE.MeshBasicMaterial({ color: 0xffd226, transparent: true, opacity, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
    group.add(mesh);
  }
  scene.add(group); return group;
}
