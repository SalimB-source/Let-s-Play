import * as THREE from 'three';
const WIDTH = 256, HEIGHT = 128;

export function positionSideMirrorCamera(camera, vehicle, side) {
  vehicle.updateWorldMatrix(true, false);
  camera.position.copy(vehicle.localToWorld(new THREE.Vector3(side === 'left' ? -1.05 : 1.05, 1.15, -.55)));
  const worldRotation = vehicle.getWorldQuaternion(new THREE.Quaternion());
  const rearOutward = new THREE.Quaternion().setFromEuler(new THREE.Euler(-.035, Math.PI + (side === 'left' ? -.28 : .28), 0, 'YXZ'));
  camera.quaternion.copy(worldRotation).multiply(rearOutward);
  camera.updateMatrixWorld();
}

export function createDrivingSideMirrors(createCanvas = () => document.createElement('canvas')) {
  const views = {};
  for (const side of ['left', 'right']) {
    const target = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, { type: THREE.UnsignedByteType, depthBuffer: true, stencilBuffer: false });
    target.texture.colorSpace = THREE.SRGBColorSpace;
    const scratch = createCanvas(); scratch.width = WIDTH; scratch.height = HEIGHT;
    views[side] = { target, scratch, camera: new THREE.PerspectiveCamera(42, WIDTH / HEIGHT, .2, 170), pixels: new Uint8Array(WIDTH * HEIGHT * 4), image: null };
  }
  return { views, lastAt: -Infinity, next: 0, initialized: false, failed: false };
}

export function renderDrivingSideMirrors(mirrors, renderer, scene, vehicle, canvases, now) {
  if (mirrors.failed || now - mirrors.lastAt < 60 || !canvases.left || !canvases.right) return;
  mirrors.lastAt = now;
  // First frame fills both; later frames alternate, about eight updates/second/side.
  const sides = mirrors.initialized ? [['left', 'right'][mirrors.next++ % 2]] : ['left', 'right'];
  const previousTarget = renderer.getRenderTarget();
  const visible = vehicle.visible, shadows = renderer.shadowMap.autoUpdate;
  try {
    renderer.shadowMap.autoUpdate = false;
    vehicle.visible = false;
    for (const side of sides) {
      const view = mirrors.views[side], output = canvases[side];
      const context = output.getContext('2d'), scratchContext = view.scratch.getContext('2d');
      if (!context || !scratchContext) throw new Error('Mirror canvas unavailable');
      positionSideMirrorCamera(view.camera, vehicle, side);
      renderer.setRenderTarget(view.target); renderer.render(scene, view.camera);
      renderer.readRenderTargetPixels(view.target, 0, 0, WIDTH, HEIGHT, view.pixels);
      view.image ??= scratchContext.createImageData(WIDTH, HEIGHT);
      view.image.data.set(view.pixels); scratchContext.putImageData(view.image, 0, 0);
      context.save();
      // WebGL pixels arrive bottom-up; real mirror optics reverse horizontally too.
      context.setTransform(-1, 0, 0, -1, output.width, output.height);
      context.drawImage(view.scratch, 0, 0, output.width, output.height);
      context.restore();
      output.dataset.status = 'ready';
    }
    mirrors.initialized = true;
  } catch {
    mirrors.failed = true;
    for (const canvas of Object.values(canvases)) if (canvas) canvas.dataset.status = 'unavailable';
  } finally {
    vehicle.visible = visible;
    renderer.setRenderTarget(previousTarget);
    renderer.shadowMap.autoUpdate = shadows;
  }
}

export function disposeDrivingSideMirrors(mirrors) {
  for (const view of Object.values(mirrors.views)) {
    view.target.dispose(); view.image = null;
    view.scratch.width = 0; view.scratch.height = 0;
  }
}
