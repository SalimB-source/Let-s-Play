/**
 * Vue de maquette Three.js, chargée seulement à l'arrivée d'une tour à l'écran.
 * Petit budget pixels, pièces fusionnées, 24 images/s. Aucune commande tactile
 * n'est capturée : on peut toujours faire défiler la galerie et ouvrir une tour.
 */
import * as THREE from 'three';
import { createStoryTowerModel, disposeStoryTowerModel, RPG_STORY_TOWER_THEMES } from './rpgStoryTowerModels.js';

const FPS = 24;
const SPIN = 0.12;

/** Cadrage garanti pendant un tour complet, y compris sur écran étroit. */
export function storyTowerFrame(model, aspect) {
  const bounds = new THREE.Box3().setFromObject(model);
  let radius = 0;
  model.traverse((part) => {
    const positions = part.geometry?.attributes.position;
    if (!positions) return;
    for (let i = 0; i < positions.count; i += 1) radius = Math.max(radius, Math.hypot(positions.getX(i), positions.getZ(i)));
  });
  const direction = new THREE.Vector3(0.63, 0.3, 1).normalize();
  const height = bounds.max.y - bounds.min.y;
  const vertical = height * Math.hypot(direction.x, direction.z) + radius * 2 * direction.y;
  const halfHeight = Math.max(vertical / 2, radius / Math.max(0.1, aspect)) * 1.09;
  return { halfHeight, radius, vertical, centerY: (bounds.min.y + bounds.max.y) / 2, direction };
}

function makeShadow() {
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const distance = Math.hypot((x - size / 2) / (size / 2), (y - size / 2) / (size / 2));
    data.set([0, 0, 0, Math.round(Math.max(0, 1 - distance) ** 2 * 160)], (y * size + x) * 4);
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.1;
  return shadow;
}

function makeMotes(theme, snow) {
  const points = new Float32Array(72 * 3);
  for (let i = 0; i < 72; i += 1) {
    // Distribution stable : pas de bruit visuel lors du retour à la galerie.
    points[i * 3] = Math.sin(i * 17.31) * 3.4;
    points[i * 3 + 1] = 0.5 + ((i * 0.618034) % 1) * 7.6;
    points[i * 3 + 2] = Math.cos(i * 9.47) * 2.6;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ color: theme.particles, size: snow ? 0.033 : 0.022, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true }));
}

/**
 * Le cycle de vie appartient à la vue React : dispose() coupe observateurs,
 * écouteurs, RAF, géométries, textures, matériaux ET contexte WebGL.
 * Un contexte perdu repasse immédiatement à la peinture de repli.
 */
export function mountStoryTowerScene({ host, canvas, tourId, detail = false, onReady = () => {}, onUnavailable = () => {} }) {
  const theme = RPG_STORY_TOWER_THEMES[tourId];
  if (!theme) { onUnavailable(); return null; }
  let renderer, model, shadow, motes;
  let disposed = false, failed = false, ready = false, raf = 0;
  let visible = true, calm = false, previousTime = 0, lastPaint = 0;
  let spin = -0.15, pointerTarget = 0, pointerYaw = 0;
  const cleanups = [];
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 80);

  const stop = () => { if (raf) window.cancelAnimationFrame(raf); raf = 0; previousTime = 0; };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    cleanups.forEach((cleanup) => cleanup());
    disposeStoryTowerModel(model);
    for (const part of [shadow, motes]) {
      part?.geometry.dispose();
      part?.material.map?.dispose();
      part?.material.dispose();
    }
    scene.clear();
    if (renderer) {
      const alreadyLost = renderer.getContext().isContextLost();
      renderer.dispose();
      if (!alreadyLost) renderer.forceContextLoss();
    }
  };
  const unavailable = () => {
    if (disposed || failed) return;
    failed = true;
    onUnavailable();
    dispose();
  };
  const render = () => {
    if (disposed || failed || !renderer) return false;
    try {
      renderer.render(scene, camera);
      if (!ready) { ready = true; onReady(); }
      return true;
    } catch {
      unavailable();
      return false;
    }
  };
  const tick = (timestamp) => {
    raf = 0;
    if (disposed || !visible || document.hidden || calm) return;
    if (timestamp - lastPaint >= 1000 / FPS) {
      const delta = previousTime ? Math.min((timestamp - previousTime) / 1000, 0.12) : 0;
      previousTime = timestamp;
      lastPaint = timestamp;
      spin += delta * SPIN;
      pointerYaw += (pointerTarget - pointerYaw) * Math.min(1, delta * 5);
      model.rotation.y = spin + pointerYaw;
      motes.rotation.y += delta * 0.016;
      if (!render()) return;
    }
    raf = window.requestAnimationFrame(tick);
  };
  const resume = () => {
    stop();
    canvas.dataset.motion = calm ? 'still' : 'animated';
    if (disposed || !visible || document.hidden) return;
    render();
    if (!disposed && !calm) raf = window.requestAnimationFrame(tick);
  };
  const listen = (target, name, handler, options) => {
    target.addEventListener(name, handler, options);
    cleanups.push(() => target.removeEventListener(name, handler, options));
  };

  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.setClearColor(0x000000, 0);
    model = createStoryTowerModel(tourId);
    if (!model) throw new Error('Tour inconnue');
    model.rotation.y = spin;
    scene.add(model);
    const ambient = new THREE.HemisphereLight('#d9e5ff', theme.ground, 2.6);
    const key = new THREE.DirectionalLight('#ffe5bd', 3.3);
    key.position.set(5, 10, 8);
    const fill = new THREE.DirectionalLight(theme.fill, 1.5);
    fill.position.set(-7, 5, 3);
    const rim = new THREE.DirectionalLight(theme.accent, 2.3);
    rim.position.set(2, 7, -6);
    scene.add(ambient, key, fill, rim);
    shadow = makeShadow();
    motes = makeMotes(theme, tourId === 'tour-du-fjord');
    scene.add(shadow, motes);

    // Le modèle fusionné conserve le même encombrement radial en rotation.
    const initialFrame = storyTowerFrame(model, 1);
    const resize = () => {
      if (disposed) return;
      const bounds = host.getBoundingClientRect();
      if (bounds.width < 1 || bounds.height < 1) return;
      const aspect = bounds.width / bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, detail ? 1.75 : 1.5, Math.sqrt(600000 / (bounds.width * bounds.height)));
      renderer.setPixelRatio(ratio);
      renderer.setSize(Math.round(bounds.width), Math.round(bounds.height), false);
      // Les sommets n'ont pas à être reparcourus à chaque redimensionnement.
      const halfHeight = Math.max(initialFrame.vertical / 2, initialFrame.radius / Math.max(0.1, aspect)) * 1.09;
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      const target = new THREE.Vector3(0, initialFrame.centerY, 0);
      camera.position.copy(initialFrame.direction).multiplyScalar(20).add(target);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      render();
    };
    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    calm = motionQuery?.matches ?? false;
    const motionChanged = () => {
      calm = motionQuery.matches;
      if (calm) { pointerYaw = pointerTarget = 0; model.rotation.y = spin; }
      resume();
    };
    if (motionQuery?.addEventListener) listen(motionQuery, 'change', motionChanged);
    else if (motionQuery?.addListener) {
      motionQuery.addListener(motionChanged);
      cleanups.push(() => motionQuery.removeListener(motionChanged));
    }
    if (typeof window.ResizeObserver === 'function') {
      const observer = new window.ResizeObserver(resize);
      observer.observe(host);
      cleanups.push(() => observer.disconnect());
    } else listen(window, 'resize', resize);
    if (typeof window.IntersectionObserver === 'function') {
      const observer = new window.IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        resume();
      });
      observer.observe(host);
      cleanups.push(() => observer.disconnect());
    }
    listen(document, 'visibilitychange', resume);
    listen(host, 'pointermove', (event) => {
      if (calm || event.pointerType !== 'mouse') return;
      const bounds = host.getBoundingClientRect();
      pointerTarget = ((event.clientX - bounds.left) / Math.max(1, bounds.width) - 0.5) * 0.32;
    }, { passive: true });
    listen(host, 'pointerleave', () => { pointerTarget = 0; }, { passive: true });
    listen(canvas, 'webglcontextlost', (event) => { event.preventDefault(); unavailable(); });
    resize();
    resume();
    return { dispose };
  } catch {
    unavailable();
    return null;
  }
}
