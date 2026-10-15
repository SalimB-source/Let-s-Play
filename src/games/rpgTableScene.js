/**
 * Le Sablier — le décor 3D de la table (Three.js, chargé à la demande).
 *
 * Le canvas se glisse **sous** les cartes (voir `RpgTableScene3D.jsx`) et ne
 * capte aucun geste. Il met en scène la même peinture que le fond CSS :
 *
 * - un plan portant la peinture, dont le **relief** est tiré de la luminance
 *   (joints des dalles, dunes, fissures) et dont le **bord est relevé** comme
 *   le rebord d'une vraie table ;
 * - la lumière du plateau (bougies, aurore, braises, soleil rasant) qui
 *   bouge sur ce relief ;
 * - des **ombres de nuages** ou des **caustiques** qui glissent à la surface ;
 * - des particules à plusieurs hauteurs (poussière, sable, neige, bulles,
 *   braises) : c'est d'elles et du bord relevé que naît la parallaxe quand la
 *   caméra respire ou suit la souris.
 *
 * Budget : 900 000 pixels au plus (520 000 au doigt), 36 images/s (30 au
 * doigt), un seul draw call pour la table, un pour les particules, un pour
 * l'ombre. La boucle s'arrête en onglet caché, pendant un glisser de carte
 * (`setPaused`) et sous `prefers-reduced-motion` (une image fixe, toujours en
 * 3D). Si la machine ne suit pas, le décor se dégrade deux fois (moins de
 * pixels, moins de particules) puis rend la main à la peinture CSS.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { particleAt, particleLayout, tableSceneBudget, tableSceneTheme } from './rpgTableSceneThemes.js';
import { createTableObject, disposeTableObject, updateTableObject } from './rpgTableObjects.js';

const CAMERA_Z = 10;
const FOV = 28;
const OVERSCAN = 1.035;
/** Hauteur du rebord de la table relevé (unités de scène). */
const RIM_HEIGHT = 0.09;

const visibleHeight = () => 2 * CAMERA_Z * Math.tan((FOV * Math.PI) / 360);
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** La hauteur de la table en (x, y) : plate au centre, relevée au bord. */
export function rimHeight(x, y, width, height) {
  const edge = Math.max(Math.abs(x) / (width / 2), Math.abs(y) / (height / 2));
  return RIM_HEIGHT * smoothstep(0.86, 1, edge) ** 2;
}

/** Le bord de la table se relève vers la caméra : la peinture reste à plat au centre. */
export function buildTableGeometry(width, height) {
  const geometry = new THREE.PlaneGeometry(width, height, 56, 36);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i += 1) positions.setZ(i, rimHeight(positions.getX(i), positions.getY(i), width, height));
  geometry.computeVertexNormals();
  return geometry;
}

/** Cadrage « cover » centré, avec un zoom facultatif de la peinture. */
export function coverTransform(planeAspect, imageAspect, zoom = 1) {
  const scale = Number.isFinite(zoom) ? Math.max(1, zoom) : 1;
  let repeatX, repeatY;
  if (planeAspect > imageAspect) {
    repeatX = 1;
    repeatY = imageAspect / planeAspect;
  } else {
    repeatX = planeAspect / imageAspect;
    repeatY = 1;
  }
  repeatX /= scale;
  repeatY /= scale;
  return { repeatX, repeatY, offsetX: (1 - repeatX) / 2, offsetY: (1 - repeatY) / 2 };
}

/**
 * Où et comment poser un objet : ses coordonnées dans l'image peinte (`u`, `v`
 * vers le bas) sont ramenées au plan à travers le même cadrage « cover » que la
 * peinture, donc il reste collé à son emplacement à toutes les tailles
 * d'écran. Il se pose à la hauteur du rebord relevé et sa taille suit la
 * largeur de l'image à l'écran.
 */
export function tableObjectTransform(spec, { planeWidth, planeHeight, cover, imageAspect }) {
  const planeU = (spec.u - cover.offsetX) / cover.repeatX;
  const planeV = (1 - spec.v - cover.offsetY) / cover.repeatY;
  const x = (planeU - 0.5) * planeWidth, y = (planeV - 0.5) * planeHeight;
  // Le rebord est une cuvette : le plan tangent au bord passe SOUS la table dès
  // qu'on s'en éloigne. Un objet incliné sur la pente s'y enfoncerait ; on le
  // pose donc à plat, à la hauteur la plus haute de son emprise — rien ne
  // s'enfonce, et l'écart (quelques centièmes) se perd dans son ombre.
  const imageWidth = planeHeight * Math.max(planeWidth / planeHeight, imageAspect);
  const radius = (spec.size * imageWidth) / 2;
  let z = rimHeight(x, y, planeWidth, planeHeight);
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    z = Math.max(z, rimHeight(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, planeWidth, planeHeight));
  }
  return { x, y, z, size: spec.size * imageWidth };
}

function softSprite() {
  const size = 32, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const distance = Math.hypot((x + 0.5 - size / 2) / (size / 2), (y + 0.5 - size / 2) / (size / 2));
    const alpha = Math.round(255 * Math.max(0, 1 - distance) ** 1.6);
    data.set([255, 255, 255, alpha], (y * size + x) * 4);
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Bruit **raccordable** (somme de sinus à fréquences entières) : défile sans couture. */
export function tileableNoise(kind) {
  const size = 128, data = new Uint8Array(size * size * 4);
  const waves = kind === 'caustiques'
    ? [[3, 2, 0.4], [5, -4, 2.1], [-6, 3, 4.2], [8, 7, 1.3]]
    : [[1, 1, 0.3], [2, -1, 1.9], [3, 2, 4.4], [-1, 3, 2.6]];
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const u = x / size, v = y / size;
    let sum = 0;
    for (const [k, m, phase] of waves) sum += Math.sin(Math.PI * 2 * (k * u + m * v) + phase);
    const normal = sum / waves.length; // -1…1
    // Nuages : des plages franches ; caustiques : des filets lumineux fins.
    const value = kind === 'caustiques'
      ? (1 - Math.abs(normal)) ** 7
      : smoothstep(0.05, 0.75, normal * 0.5 + 0.5);
    const tone = Math.round(255 * value);
    data.set([tone, tone, tone, 255], (y * size + x) * 4);
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Peinture du plateau introuvable'));
    image.src = url;
  });
}

/** La peinture réduite (GPU) et sa carte de relief (luminance, floue). */
function preparePaintings(image, budget, maxTextureSize) {
  const width = image.naturalWidth || image.width, height = image.naturalHeight || image.height;
  const limit = Math.min(budget.textureSize, maxTextureSize);
  const scale = Math.min(1, limit / width);
  const paint = document.createElement('canvas');
  paint.width = Math.max(2, Math.round(width * scale));
  paint.height = Math.max(2, Math.round(height * scale));
  paint.getContext('2d').drawImage(image, 0, 0, paint.width, paint.height);

  const reliefScale = Math.min(1, budget.reliefSize / width);
  const relief = document.createElement('canvas');
  relief.width = Math.max(2, Math.round(width * reliefScale));
  relief.height = Math.max(2, Math.round(height * reliefScale));
  const context = relief.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, relief.width, relief.height);
  const pixels = context.getImageData(0, 0, relief.width, relief.height);
  const { data } = pixels;
  for (let i = 0; i < data.length; i += 4) {
    const luminance = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    // Contraste doux : les joints sombres creusent, les arêtes claires saillent.
    const tone = Math.max(0, Math.min(255, (luminance - 128) * 1.25 + 128));
    data[i] = data[i + 1] = data[i + 2] = tone;
    data[i + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  return { paint, relief, aspect: width / height };
}

/**
 * Le cycle de vie appartient à la vue React : `dispose()` coupe observateurs,
 * écouteurs, RAF, géométries, textures, matériaux ET contexte WebGL.
 * Un contexte perdu ou une peinture absente rendent aussitôt la main au fond CSS.
 */
export function mountTableScene({ host, canvas, plateauId, imageUrl, pointerHost = host, coarse = false, onReady = () => {}, onUnavailable = () => {} }) {
  const theme = tableSceneTheme(plateauId);
  let renderer, table, tableMaterial, overlay, particles, sprite, noise, envTexture;
  let objects = [];
  let plane = { width: 1, height: 1, cover: null };
  let paintTexture, reliefTexture, imageAspect = 1.5;
  let disposed = false, failed = false, ready = false, raf = 0, paused = false, calm = false;
  let previousTime = 0, lastPaint = 0, elapsed = 0, degraded = 0;
  let slowSum = 0, slowFrames = 0;
  let layout = [];
  let pointerTarget = { x: 0, y: 0 }, pointer = { x: 0, y: 0 };
  let size = { width: 1, height: 1, aspect: 1 };
  const cleanups = [];
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 60);
  const lights = [];
  let key, ambient;

  const stop = () => { if (raf) window.cancelAnimationFrame(raf); raf = 0; previousTime = 0; };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    cleanups.forEach((cleanup) => cleanup());
    for (const part of [table, overlay, particles]) {
      part?.geometry.dispose();
      part?.material.dispose();
    }
    clearObjects();
    for (const texture of [paintTexture, reliefTexture, sprite, noise, envTexture]) texture?.dispose();
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

  const clearObjects = () => {
    for (const entry of objects) { scene.remove(entry.group); disposeTableObject(entry.group); }
    objects = [];
  };
  // Construit les objets une fois, puis les repose à chaque redimensionnement.
  const syncObjects = () => {
    const wanted = budget().objects && theme.objets.length > 0;
    if (!wanted) { clearObjects(); canvas.dataset.objects = '0'; return; }
    if (!objects.length) {
      objects = theme.objets.map((spec, index) => {
        const group = createTableObject(spec.kind, envTexture);
        if (!group) return null;
        scene.add(group);
        return { spec, group, phase: index * 1.9 };
      }).filter(Boolean);
    }
    for (const { spec, group } of objects) {
      const place = tableObjectTransform(spec, { planeWidth: plane.width, planeHeight: plane.height, cover: plane.cover, imageAspect });
      group.position.set(place.x, place.y, place.z);
      // À plat, tourné vers `angle` (le grand axe de l'objet est +Y).
      group.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), ((spec.angle - 90) * Math.PI) / 180);
      group.scale.setScalar(place.size / group.userData.extent);
    }
    canvas.dataset.objects = String(objects.length);
  };

  const placeCamera = (t) => {
    const breathe = calm ? 0 : 1;
    camera.position.set(
      Math.sin(t * 0.07) * 0.2 * breathe + pointer.x * 0.42,
      Math.cos(t * 0.053) * 0.12 * breathe + pointer.y * 0.28,
      CAMERA_Z,
    );
    camera.lookAt(0, 0, 0);
  };

  const animate = (t) => {
    const height = visibleHeight(), width = height * size.aspect;
    placeCamera(t);
    // Soleil : la direction de la lumière rasante dérive lentement.
    const direction = theme.keyDirection;
    key.position.set(direction[0] * 10 + Math.sin(t * 0.045) * 1.6, direction[1] * 10 + Math.cos(t * 0.038) * 1.1, direction[2] * 10);
    theme.lights.forEach((spec, index) => {
      const lamp = lights[index];
      if (!lamp) return;
      const phase = index * 1.7;
      const orbitX = spec.orbit ? Math.cos(t * spec.orbitHz * Math.PI * 2 + phase) * spec.orbit : 0;
      const orbitY = spec.orbit ? Math.sin(t * spec.orbitHz * Math.PI * 2 + phase) * spec.orbit : 0;
      lamp.position.set((spec.x + orbitX) * (width / 2), (spec.y + orbitY) * (height / 2), spec.z);
      // Bougie : somme de sinus incommensurables (jamais deux fois le même éclat).
      const flicker = spec.flicker ? (Math.sin(t * 9.1 + phase) * 0.5 + Math.sin(t * 15.7 + phase * 2) * 0.3 + Math.sin(t * 3.3 + phase * 3) * 0.2) * spec.flicker : 0;
      const pulse = spec.pulse ? Math.sin(t * spec.pulseHz * Math.PI * 2 + phase) * spec.pulse : 0;
      lamp.intensity = spec.intensity * Math.max(0.05, 1 + flicker + pulse);
    });
    objects.forEach((entry) => updateTableObject(entry.group, t, entry.phase));
    if (overlay) {
      noise.offset.x = (t * theme.overlay.speed) % 1;
      noise.offset.y = (t * theme.overlay.speed * 0.62) % 1;
    }
    if (particles && theme.particles) {
      const positions = particles.geometry.attributes.position;
      for (let i = 0; i < layout.length; i += 1) {
        const at = particleAt(theme.particles, layout[i], t);
        positions.setXYZ(i, (at.x - 0.5) * width, (at.y - 0.5) * height, layout[i].z);
      }
      positions.needsUpdate = true;
    }
  };

  const render = () => {
    if (disposed || failed || !renderer) return false;
    try {
      animate(elapsed);
      renderer.render(scene, camera);
      if (!ready) { ready = true; onReady(); }
      return true;
    } catch {
      unavailable();
      return false;
    }
  };

  const budget = () => tableSceneBudget({ width: size.width, height: size.height, devicePixelRatio: window.devicePixelRatio || 1, coarse, degraded });

  const buildParticles = () => {
    if (particles) { scene.remove(particles); particles.geometry.dispose(); particles.material.dispose(); particles = null; }
    if (!theme.particles) return;
    layout = particleLayout(theme.particles, budget().particles, 20260 + plateauId.length);
    if (!layout.length) return;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(layout.length * 3), 3));
    particles = new THREE.Points(geometry, new THREE.PointsMaterial({
      map: sprite, color: theme.particles.color, size: theme.particles.size * 4.2, transparent: true, opacity: theme.particles.opacity,
      depthWrite: false, sizeAttenuation: true, blending: theme.particles.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    }));
    particles.frustumCulled = false;
    particles.renderOrder = 3;
    scene.add(particles);
  };

  const resize = () => {
    if (disposed || failed || !renderer || !table) return;
    const bounds = host.getBoundingClientRect();
    if (bounds.width < 1 || bounds.height < 1) return;
    size = { width: bounds.width, height: bounds.height, aspect: bounds.width / bounds.height };
    const current = budget();
    renderer.setPixelRatio(current.pixelRatio);
    renderer.setSize(Math.round(bounds.width), Math.round(bounds.height), false);
    camera.aspect = size.aspect;
    camera.updateProjectionMatrix();

    const height = visibleHeight() * OVERSCAN, width = height * size.aspect;
    table.geometry.dispose();
    table.geometry = buildTableGeometry(width, height);
    const cover = coverTransform(size.aspect, imageAspect, theme.paintZoom);
    plane = { width, height, cover };
    key.castShadow = current.shadows && theme.objets.length > 0;
    if (key.castShadow) {
      const shadow = key.shadow;
      if (shadow.mapSize.x !== current.shadowSize) { shadow.mapSize.set(current.shadowSize, current.shadowSize); shadow.map?.dispose(); shadow.map = null; }
      Object.assign(shadow.camera, { left: -width * 0.6, right: width * 0.6, top: height * 0.6, bottom: -height * 0.6, near: 1, far: 40 });
      shadow.camera.updateProjectionMatrix();
    }
    for (const texture of [paintTexture, reliefTexture]) {
      texture.repeat.set(cover.repeatX, cover.repeatY);
      texture.offset.set(cover.offsetX, cover.offsetY);
    }
    if (overlay) {
      overlay.geometry.dispose();
      overlay.geometry = new THREE.PlaneGeometry(width, height);
      noise.repeat.set(theme.overlay.scale * size.aspect, theme.overlay.scale);
    }
    buildParticles();
    syncObjects();
    render();
  };

  const tick = (timestamp) => {
    raf = 0;
    if (disposed || failed || paused || document.hidden || calm) return;
    const interval = 1000 / budget().fps;
    if (timestamp - lastPaint >= interval - 2) {
      const delta = previousTime ? Math.min((timestamp - previousTime) / 1000, 0.12) : 0;
      if (previousTime) { slowSum += timestamp - lastPaint; slowFrames += 1; }
      previousTime = timestamp;
      lastPaint = timestamp;
      elapsed += delta;
      pointer.x += (pointerTarget.x - pointer.x) * Math.min(1, delta * 4);
      pointer.y += (pointerTarget.y - pointer.y) * Math.min(1, delta * 4);
      if (!render()) return;
      // Machine à la peine (< 18 images/s en moyenne) : on allège, puis on abandonne.
      if (slowFrames >= 90) {
        const average = slowSum / slowFrames;
        slowSum = 0; slowFrames = 0;
        if (average > 1000 / 18) {
          degraded += 1;
          if (degraded > 2) { unavailable(); return; }
          resize();
        }
      }
    }
    raf = window.requestAnimationFrame(tick);
  };
  const resume = () => {
    stop();
    canvas.dataset.motion = calm ? 'still' : paused ? 'paused' : 'animated';
    if (disposed || failed || !renderer || document.hidden) return;
    if (calm) elapsed = 3;
    render();
    if (!disposed && !failed && !calm && !paused) raf = window.requestAnimationFrame(tick);
  };
  const listen = (target, name, handler, options) => {
    target.addEventListener(name, handler, options);
    cleanups.push(() => target.removeEventListener(name, handler, options));
  };

  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false, powerPreference: 'low-power' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Pas de tone mapping : la peinture garde les couleurs que le fond CSS lui donne.
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(0x120b06, 1);
    sprite = softSprite();
    if (theme.objets.length) {
      // Les objets posés ont leur ombre et reflètent une pièce neutre (métaux, verre).
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      const generator = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      envTexture = generator.fromScene(room, 0.04).texture;
      room.dispose?.();
      generator.dispose();
    }

    // Les écouteurs d'abord : un échec de chargement doit tout nettoyer.
    listen(canvas, 'webglcontextlost', (event) => { event.preventDefault(); unavailable(); });
    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    calm = motionQuery?.matches ?? false;
    const motionChanged = () => {
      calm = motionQuery.matches;
      if (calm) { pointer = { x: 0, y: 0 }; pointerTarget = { x: 0, y: 0 }; }
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
    listen(document, 'visibilitychange', resume);
    // Parallaxe à la souris seulement : au doigt, le décor ne bouge pas sous la main.
    listen(pointerHost, 'pointermove', (event) => {
      if (calm || event.pointerType !== 'mouse') return;
      const bounds = host.getBoundingClientRect();
      pointerTarget = {
        x: ((event.clientX - bounds.left) / Math.max(1, bounds.width) - 0.5) * 2,
        y: -((event.clientY - bounds.top) / Math.max(1, bounds.height) - 0.5) * 2,
      };
    }, { passive: true });
    listen(pointerHost, 'pointerleave', () => { pointerTarget = { x: 0, y: 0 }; }, { passive: true });

    // Lumières : ambiance, clé rasante, lampes animées. Les unités sont
    // physiques (r155+) : π d'intensité éclaire un aplat à sa couleur d'origine.
    ambient = new THREE.AmbientLight(theme.ambient, theme.ambientIntensity * Math.PI);
    key = new THREE.DirectionalLight(theme.key, theme.keyIntensity * Math.PI);
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.03;
    key.shadow.radius = 3;
    scene.add(ambient, key);
    theme.lights.forEach((spec) => {
      const lamp = new THREE.PointLight(spec.color, spec.intensity, spec.distance, spec.decay);
      lights.push(lamp);
      scene.add(lamp);
    });

    loadImage(imageUrl).then((image) => {
      if (disposed || failed) return;
      const paintings = preparePaintings(image, budget(), renderer.capabilities.maxTextureSize);
      imageAspect = paintings.aspect;
      const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      paintTexture = new THREE.CanvasTexture(paintings.paint);
      paintTexture.colorSpace = THREE.SRGBColorSpace;
      paintTexture.anisotropy = anisotropy;
      reliefTexture = new THREE.CanvasTexture(paintings.relief);
      tableMaterial = new THREE.MeshStandardMaterial({
        map: paintTexture, bumpMap: reliefTexture, bumpScale: 2.2 * theme.relief, roughness: theme.roughness, metalness: 0,
      });
      table = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), tableMaterial);
      table.receiveShadow = true;
      scene.add(table);
      if (theme.overlay) {
        noise = tileableNoise(theme.overlay.kind);
        const additive = theme.overlay.kind === 'caustiques';
        overlay = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
          color: theme.overlay.color, alphaMap: noise, transparent: true, opacity: theme.overlay.opacity,
          depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        }));
        overlay.position.z = RIM_HEIGHT + 0.05;
        overlay.renderOrder = 2;
        scene.add(overlay);
      }
      resize();
      resume();
    }).catch(unavailable);
    return {
      dispose,
      /** Suspend la boucle (glisser de carte, vol de carte) sans libérer le contexte. */
      setPaused(value) {
        if (paused === Boolean(value) || disposed || failed) return;
        paused = Boolean(value);
        if (ready) resume();
      },
    };
  } catch {
    unavailable();
    return null;
  }
}
