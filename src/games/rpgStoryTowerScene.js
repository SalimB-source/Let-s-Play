/**
 * Vue de maquette Three.js, chargée seulement à l'arrivée d'une tour à l'écran.
 * Petit budget pixels, pièces fusionnées, 24 images/s. Aucune commande tactile
 * n'est capturée : on peut toujours faire défiler la galerie et ouvrir une tour.
 */
import * as THREE from 'three';
import { createStoryTowerModel, disposeStoryTowerModel, RPG_STORY_TOWER_THEMES } from './rpgStoryTowerModels.js';

const FPS = 24;
const SPIN = 0.12;

/** Graine stable d'une tour : la même brèche, la même fumée à chaque visite. */
function tourSeed(tourId) {
  let value = 2166136261;
  for (let i = 0; i < tourId.length; i += 1) value = Math.imul(value ^ tourId.charCodeAt(i), 16777619) >>> 0;
  return value / 4294967296;
}

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

/** Une volute de fumée : un rond doux, dessiné ici, aucune image à charger. */
function smokeTexture() {
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot((x - size / 2) / (size / 2), (y - size / 2) / (size / 2));
      const alpha = Math.round(Math.max(0, 1 - distance) ** 1.7 * 255);
      data.set([238, 233, 226, alpha], (y * size + x) * 4);
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

const RUIN_PARTICLES = 60;

/**
 * La version détruite d'une tour — une maquette, pas une seconde peinture.
 *
 * La tour est brisée à mi-hauteur par trois plans de coupe inclinés : leur
 * intersection dessine une brèche en dents de scie, jamais une section
 * horizontale. Un bouchon de gravats obture le fut pour qu'on ne voie pas
 * l'intérieur creux, des pierres et des braises jonchent le socle, et une
 * fumée de particules monte de la brèche. Chaque tour garde sa teinte : c'est
 * bien elle, en ruine.
 */
export function createStoryTowerRuin(model, theme, tourId) {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const seed = tourSeed(tourId);
  const cutY = bounds.min.y + size.y * (0.42 + seed * 0.18);
  const planes = [
    new THREE.Plane(new THREE.Vector3(0.14, -1, 0.1).normalize(), cutY + size.y * 0.16),
    new THREE.Plane(new THREE.Vector3(-0.34, -1, -0.12).normalize(), cutY + size.y * 0.1),
    new THREE.Plane(new THREE.Vector3(0.05, -1, -0.38).normalize(), cutY + size.y * 0.04),
  ];
  const charred = new THREE.Color(theme.dark).multiplyScalar(0.62);
  const gravel = new THREE.MeshStandardMaterial({ name: 'gravats', color: charred, roughness: 0.97, metalness: 0.04, flatShading: true });
  const ember = new THREE.MeshBasicMaterial({ name: 'braises', color: '#ff8a4a' });
  const chunk = new THREE.DodecahedronGeometry(1, 0);
  const braise = new THREE.SphereGeometry(1, 8, 6);
  const group = new THREE.Group();
  group.name = `ruine-${tourId}`;
  // Le bouchon : un amas plat qui ferme la brèche, sous les coupes.
  const capRadius = Math.min(size.x, size.z) * 0.4;
  const cap = new THREE.Mesh(chunk, gravel);
  cap.position.set(0, cutY - 0.34, 0);
  cap.scale.set(capRadius, 0.3, capRadius * 0.94);
  cap.rotation.set(0.12, seed * Math.PI, 0.08);
  group.add(cap);
  // La couronne de la brèche : des blocs arrachés qui dépassent du bouchon.
  for (let i = 0; i < 7; i += 1) {
    const angle = i * 0.8976 + seed * 4.2;
    const block = new THREE.Mesh(chunk, gravel);
    const reach = capRadius * (0.55 + ((i * 0.61) % 1) * 0.5);
    const scale = 0.14 + ((i * 0.37) % 1) * 0.14;
    block.position.set(Math.sin(angle) * reach, cutY - 0.06 + (i % 3) * 0.1, Math.cos(angle) * reach);
    block.scale.set(scale * 1.4, scale, scale * 1.15);
    block.rotation.set(seed * 2 + i * 0.5, angle, (i % 3) * 0.3);
    group.add(block);
  }
  // Les gravats tombés : des éclats de pierre, jamais un cercle régulier.
  for (let i = 0; i < 11; i += 1) {
    const angle = i * 2.399963 + seed * 6.283;
    const distance = capRadius * (0.95 + ((i * 0.37) % 1) * 1.15);
    const scale = 0.1 + ((i * 0.531) % 1) * 0.17;
    const stone = new THREE.Mesh(chunk, gravel);
    stone.position.set(Math.sin(angle) * distance, bounds.min.y + 0.32 + scale * 0.45, Math.cos(angle) * distance);
    stone.scale.set(scale * (1 + (i % 3) * 0.2), scale * 0.72, scale);
    stone.rotation.set(seed + i, angle, (i % 4) * 0.4);
    group.add(stone);
  }
  // Quelques braises, encore chaudes : la tour vient de tomber.
  for (let i = 0; i < 6; i += 1) {
    const angle = i * 1.7 + seed * 3.1;
    const distance = capRadius * (0.5 + (i % 3) * 0.42);
    const spark = new THREE.Mesh(braise, ember);
    spark.position.set(Math.sin(angle) * distance, bounds.min.y + 0.42 + (i % 2) * 0.22, Math.cos(angle) * distance);
    spark.scale.setScalar(0.035 + (i % 3) * 0.014);
    group.add(spark);
  }
  // La fumée : des volutes qui montent de la brèche et s'écartent.
  const texture = smokeTexture();
  const positions = new Float32Array(RUIN_PARTICLES * 3);
  const puffs = [];
  for (let i = 0; i < RUIN_PARTICLES; i += 1) {
    puffs.push({
      phase: (i * 0.618034 + seed) % 1,
      angle: i * 2.399963 + seed * 6.283,
      reach: capRadius * (0.18 + ((i * 0.29) % 1) * 0.62),
      climb: 0.22 + ((i * 0.43) % 1) * 0.5,
      swirl: 0.6 + ((i * 0.71) % 1) * 1.5,
    });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  // La caméra est orthographique : `size` se compte en pixels de dessin, pas
  // en unités de scène. La taille juste est donc posée au redimensionnement.
  const material = new THREE.PointsMaterial({
    map: texture,
    color: '#e2dbd0',
    size: 26,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const smoke = new THREE.Points(geometry, material);
  smoke.name = `fumee-${tourId}`;
  group.add(smoke);
  const plume = size.y * 0.42;
  const update = (delta) => {
    if (delta > 0) for (const puff of puffs) {
      puff.phase += delta * puff.climb * 0.34;
      if (puff.phase > 1) puff.phase -= 1;
    }
    for (let i = 0; i < puffs.length; i += 1) {
      const puff = puffs[i];
      const spread = puff.reach * (0.55 + puff.phase * 1.9);
      const angle = puff.angle + puff.phase * puff.swirl;
      positions[i * 3] = Math.sin(angle) * spread;
      positions[i * 3 + 1] = cutY + puff.phase * plume;
      positions[i * 3 + 2] = Math.cos(angle) * spread;
    }
    geometry.attributes.position.needsUpdate = true;
  };
  update(0);
  /** Une volute large au téléphone, plus fine sur la grande affiche. */
  const resize = (width, height, ratio) => {
    material.size = Math.max(8, Math.min(width, height) * 0.24 * Math.max(1, ratio));
  };
  const dispose = () => {
    chunk.dispose();
    braise.dispose();
    gravel.dispose();
    ember.dispose();
    geometry.dispose();
    material.dispose();
    texture.dispose();
  };
  return { group, planes, update, resize, dispose };
}

/**
 * Le cycle de vie appartient à la vue React : dispose() coupe observateurs,
 * écouteurs, RAF, géométries, textures, matériaux ET contexte WebGL.
 * Un contexte perdu repasse immédiatement à la peinture de repli.
 */
export function mountStoryTowerScene({ host, canvas, tourId, detail = false, detruite = false, onReady = () => {}, onUnavailable = () => {} }) {
  const theme = RPG_STORY_TOWER_THEMES[tourId];
  if (!theme) { onUnavailable(); return null; }
  let renderer, model, shadow, motes, ruin;
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
    ruin?.dispose();
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
      if (motes) motes.rotation.y += delta * 0.016;
      ruin?.update(delta);
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
    scene.add(shadow);
    if (detruite) {
      // La tour terminée : brisée par trois coupes, noircie, et sa brèche fume.
      ruin = createStoryTowerRuin(model, theme, tourId);
      renderer.localClippingEnabled = true;
      model.traverse((part) => {
        for (const material of [].concat(part.material ?? [])) {
          if (material.clippingPlanes) continue;
          material.clippingPlanes = ruin.planes;
          material.color?.multiplyScalar(0.56);
          if (material.emissiveIntensity) material.emissiveIntensity *= 0.16;
          material.roughness = Math.min(1, (material.roughness ?? 0.8) + 0.18);
          material.needsUpdate = true;
        }
      });
      scene.add(ruin.group);
    } else {
      motes = makeMotes(theme, tourId === 'tour-du-fjord');
      scene.add(motes);
    }

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
      // La fumée se dimensionne en pixels de dessin, comme le reste du HUD.
      ruin?.resize(bounds.width, bounds.height, ratio);
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
