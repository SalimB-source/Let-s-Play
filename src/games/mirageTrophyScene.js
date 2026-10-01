// Scène 3D de l’écran du trophée (fin de Coupe) : le trophée voxel de la coupe tourne
// sur son podium, les quatre diamants de Mirage Rush gravitent autour, le
// cavalier vainqueur fait la fête à côté, des étincelles scintillent et des
// confettis tombent en 3D.
//
// Comme `makeWorld` pour la course, tout est ici hors de React :
// `makeTrophyScene(mount, options)` monte un canvas dans `mount` et renvoie
// `{ destroy }`. Il lève une exception si WebGL est indisponible — l’appelant
// affiche alors son repli. La géométrie vient de `mirageTrophy.js` (donnée
// pure, testée) ; l’élément `slot` indique où cadrer le trophée dans la
// page, pour que texte et 3D ne se marchent pas dessus.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CRYSTALS } from './mirageRules';
import { CONFETTI_COLORS, PODIUM_HEIGHT, TROPHY_MATERIAL_COLORS, getTrophyDesign, podiumBoxes, trophyBoxes } from './mirageTrophy';
import { disposeExplorer, makeExplorer } from './mirageExplorer';

// Le trophée et son podium sont décalés vers la gauche pour laisser la place
// du cavalier à droite ; l’ensemble reste centré sur x = 0.
const TROPHY_X = -1.3;
const RIDER_POSITION = [2.35, 0, 1.25];
const RIDER_TURN = Math.PI * 0.78; // tête vers la caméra et vers le trophée
const FOCUS_Y = 3.35;
// Étendue de la scène (unités du monde) à faire tenir dans le « slot ».
const SCENE_HEIGHT = 7.7;
const SCENE_WIDTH = 9.4;
const CONFETTI_COUNT = 150;
const SPARKLE_COUNT = 90;
const INTRO_SECONDS = 2.1;
const SPIN_SPEED = 0.85; // rad/s une fois l’entrée terminée

const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeOutBack = (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function makeMaterials() {
  const material = (name, options) => new THREE.MeshStandardMaterial({
    color: TROPHY_MATERIAL_COLORS[name], flatShading: true, ...options,
  });
  return {
    gold: material('gold', { metalness: 0.9, roughness: 0.3, emissive: 0x2a1a00 }),
    goldDark: material('goldDark', { metalness: 0.85, roughness: 0.38, emissive: 0x1e1000 }),
    goldLight: material('goldLight', { metalness: 0.8, roughness: 0.25, emissive: 0x3a2a08 }),
    gem: material('gem', { emissive: 0x16a8d8, emissiveIntensity: 1.1, roughness: 0.2, metalness: 0.1 }),
    silver: material('silver', { metalness: 0.95, roughness: 0.22 }),
    silverDark: material('silverDark', { metalness: 0.85, roughness: 0.4 }),
    silverLight: material('silverLight', { metalness: 0.9, roughness: 0.18 }),
    ocean: material('ocean', { emissive: 0x05799a, emissiveIntensity: 0.35, roughness: 0.25, metalness: 0.3 }),
    land: material('land', { roughness: 0.45, metalness: 0.15 }),
    stone: material('stone', { roughness: 0.8, metalness: 0.05 }),
    stoneLight: material('stoneLight', { roughness: 0.8, metalness: 0.05 }),
    stoneDark: material('stoneDark', { roughness: 0.85, metalness: 0.05 }),
    ruby: material('ruby', { emissive: 0x4a0612, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.35 }),
    rubyDark: material('rubyDark', { emissive: 0x2a0309, emissiveIntensity: 0.6, roughness: 0.35, metalness: 0.3 }),
    rubyLight: material('rubyLight', { emissive: 0x5a1220, emissiveIntensity: 0.5, roughness: 0.25, metalness: 0.3 }),
  };
}

// Regroupe les boîtes par matériau : une poignée de meshes plutôt qu’un
// mesh par boîte. Les géométries fusionnées sont renvoyées pour être libérées.
function buildVoxelGroup(boxes, materials, disposables) {
  const group = new THREE.Group();
  const byMaterial = new Map();
  for (const box of boxes) {
    const geometry = new THREE.BoxGeometry(...box.size).translate(...box.center);
    if (!byMaterial.has(box.material)) byMaterial.set(box.material, []);
    byMaterial.get(box.material).push(geometry);
  }
  for (const [name, geometries] of byMaterial) {
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    disposables.push(merged);
    const mesh = new THREE.Mesh(merged, materials[name]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

// Étoile à quatre branches qui scintille, dessinée dans le fragment shader.
function makeSparkles(disposables) {
  const positions = new Float32Array(SPARKLE_COUNT * 3);
  const phases = new Float32Array(SPARKLE_COUNT);
  const sizes = new Float32Array(SPARKLE_COUNT);
  for (let i = 0; i < SPARKLE_COUNT; i++) {
    const angle = hash(i * 3 + 1) * Math.PI * 2;
    const radius = 1.2 + Math.sqrt(hash(i * 3 + 2)) * 5.4;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 0.4 + hash(i * 3 + 3) * 7.2;
    positions[i * 3 + 2] = Math.sin(angle) * radius * 0.7 + 0.6;
    phases[i] = hash(i * 7 + 5);
    sizes[i] = 0.55 + hash(i * 11 + 2) * 0.9;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 } },
    vertexShader: `
      attribute float aPhase;
      attribute float aSize;
      uniform float uTime;
      uniform float uScale;
      varying float vTwinkle;
      void main() {
        vec3 p = position;
        p.y += sin(uTime * 0.6 + aPhase * 6.2831) * 0.18;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vTwinkle = 0.5 + 0.5 * sin(uTime * 2.6 + aPhase * 12.566);
        gl_PointSize = aSize * (0.3 + 0.95 * vTwinkle) * uScale * (260.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vTwinkle;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float star = max(0.0, 1.0 - 16.0 * abs(c.x) * abs(c.y)) * max(0.0, 1.0 - d * 2.0);
        float glow = smoothstep(0.5, 0.0, d) * 0.4;
        float a = (star + glow) * vTwinkle;
        gl_FragColor = vec4(vec3(1.0, 0.9, 0.6) * a, a);
      }`,
  });
  disposables.push(geometry, material);
  return { points: new THREE.Points(geometry, material), material };
}

function makeConfetti(count, disposables) {
  const geometry = new THREE.PlaneGeometry(0.24, 0.13);
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;
  const color = new THREE.Color();
  const pieces = [];
  for (let i = 0; i < count; i++) {
    color.setHex(CONFETTI_COLORS[i % CONFETTI_COLORS.length]);
    mesh.setColorAt(i, color);
    pieces.push({
      x: (hash(i * 5 + 1) - 0.5) * 17,
      z: -4 + hash(i * 5 + 2) * 10,
      speed: 1.1 + hash(i * 5 + 3) * 1.5,
      offset: hash(i * 5 + 4) * 11,
      sway: 0.3 + hash(i * 5 + 5) * 0.7,
      spin: [2 + hash(i * 7 + 1) * 5, 2 + hash(i * 7 + 2) * 5, 1 + hash(i * 7 + 3) * 4],
      tilt: [hash(i * 13 + 1) * 6.28, hash(i * 13 + 2) * 6.28, hash(i * 13 + 3) * 6.28],
    });
  }
  mesh.instanceColor.needsUpdate = true;
  disposables.push(geometry, material);
  const dummy = new THREE.Object3D();
  const RANGE = 11; // hauteur de chute : de y = 9.5 à y = -1.5
  return {
    mesh,
    update(time) {
      for (let i = 0; i < count; i++) {
        const piece = pieces[i];
        const fall = (time * piece.speed + piece.offset) % RANGE;
        dummy.position.set(
          piece.x + Math.sin(time * 0.9 + piece.offset) * piece.sway,
          9.5 - fall,
          piece.z + Math.cos(time * 0.7 + piece.offset) * piece.sway,
        );
        dummy.rotation.set(
          piece.tilt[0] + time * piece.spin[0],
          piece.tilt[1] + time * piece.spin[1],
          piece.tilt[2] + time * piece.spin[2],
        );
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

function softDisc(size, disposables) {
  // Fausse ombre douce sous un sujet : un disque au dégradé radial.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(10,4,20,.55)');
  gradient.addColorStop(1, 'rgba(10,4,20,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  const geometry = new THREE.PlaneGeometry(size, size);
  disposables.push(texture, material, geometry);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  mesh.renderOrder = 1;
  return mesh;
}

/**
 * Monte la scène dans `mount`.
 * @param {HTMLElement} mount  conteneur ; le canvas le remplit entièrement.
 * @param {object} options
 * @param {string} [options.trophyDesign]  design de la coupe (Désert par défaut).
 * @param {number[]} [options.riderColors]  palette [robe, crinière, tissu, liseré, capuche] du vainqueur.
 * @param {HTMLElement} [options.slot]  zone de la page où cadrer le trophée.
 * @param {boolean} [options.reducedMotion]  calme les mouvements (pas de confettis).
 * @returns {{ destroy: () => void }}
 */
export function makeTrophyScene(mount, options = {}) {
  // Lève une exception quand WebGL est indisponible (jsdom, GPU bloqué…).
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  try {
    return buildTrophyScene(renderer, mount, options);
  } catch (error) {
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    throw error;
  }
}

// Éclairage et décor propres à chaque coupe : le désert reste la référence.
const SCENE_THEMES = Object.freeze({
  desert: { hemiSky: 0xffe7c2, hemiGround: 0x3a2350, key: 0xfff0d0, rim: 0x8fd8ff, floor: 0x2a1840 },
  worldtour: { hemiSky: 0xd9fbff, hemiGround: 0x102744, key: 0xe6ffff, rim: 0x66e9f2, floor: 0x133455 },
  legends: { hemiSky: 0xffdfe3, hemiGround: 0x3a1230, key: 0xfff0e2, rim: 0xff8fa0, floor: 0x3a1229 },
});

function buildTrophyScene(renderer, mount, { trophyDesign = 'desert', riderColors = null, slot = null, reducedMotion = false }) {
  const design = getTrophyDesign(trophyDesign);
  const theme = SCENE_THEMES[design.id] || SCENE_THEMES.desert;
  const sceneHeight = Math.max(SCENE_HEIGHT, PODIUM_HEIGHT + design.height + 0.75);
  const focusY = FOCUS_Y + (sceneHeight - SCENE_HEIGHT) / 2;
  const disposables = [];
  const materials = makeMaterials();
  Object.values(materials).forEach((material) => disposables.push(material));

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'mirage-trophy-webgl';
  canvas.dataset.trophy = design.id;
  canvas.setAttribute('aria-hidden', 'true');
  mount.appendChild(canvas);

  const scene = new THREE.Scene();
  // Les reflets des métaux viennent d’un petit studio virtuel.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new RoomEnvironment();
  const environment = pmrem.fromScene(studio, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.95;
  studio.traverse((object) => { object.geometry?.dispose?.(); object.material?.dispose?.(); });
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 80);

  scene.add(new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, 0.55));
  const key = new THREE.DirectionalLight(theme.key, 2.4);
  key.position.set(5, 10, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 10, bottom: -6, near: 1, far: 40 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new THREE.DirectionalLight(theme.rim, 1.3);
  rim.position.set(-7, 4, -6);
  scene.add(rim);
  const glow = new THREE.PointLight(design.accent, 10, 14, 2);
  glow.position.set(TROPHY_X, PODIUM_HEIGHT + 2.6, 3);
  scene.add(glow);

  // Scène d’exposition : disque sombre cerclé de la couleur de la coupe.
  const floorGeometry = new THREE.CylinderGeometry(7, 7.3, 0.4, 72);
  const floor = new THREE.Mesh(floorGeometry, new THREE.MeshStandardMaterial({ color: theme.floor, roughness: 0.55, metalness: 0.3 }));
  floor.position.y = -0.2;
  floor.receiveShadow = true;
  disposables.push(floorGeometry, floor.material);
  scene.add(floor);
  const ringGeometry = new THREE.RingGeometry(6.35, 6.65, 96);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: design.accent, transparent: true, opacity: 0.85, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  disposables.push(ringGeometry, ringMaterial);
  scene.add(ring);

  // Podium (immobile) et trophée (qui tourne dessus).
  const podium = buildVoxelGroup(podiumBoxes(design.id), materials, disposables);
  podium.position.x = TROPHY_X;
  scene.add(podium);
  const podiumShadow = softDisc(5.6, disposables);
  podiumShadow.position.x = TROPHY_X;
  scene.add(podiumShadow);

  const trophyPivot = new THREE.Group();
  trophyPivot.position.set(TROPHY_X, PODIUM_HEIGHT, 0);
  trophyPivot.add(buildVoxelGroup(trophyBoxes(design.id), materials, disposables));
  scene.add(trophyPivot);

  // Les quatre diamants du jeu gravitent autour du trophée.
  const gemGeometry = new THREE.OctahedronGeometry(0.34);
  disposables.push(gemGeometry);
  const orbit = new THREE.Group();
  orbit.position.set(TROPHY_X, PODIUM_HEIGHT, 0);
  const gems = CRYSTALS.map((crystal, index) => {
    const material = new THREE.MeshStandardMaterial({
      color: crystal.color, emissive: crystal.color, emissiveIntensity: 0.55, roughness: 0.22, metalness: 0.15, flatShading: true,
    });
    disposables.push(material);
    const mesh = new THREE.Mesh(gemGeometry, material);
    orbit.add(mesh);
    return { mesh, index };
  });
  scene.add(orbit);

  // Le cavalier vainqueur, tourné vers le public, fait un petit saut de joie.
  const rider = makeExplorer(false, riderColors);
  rider.scale.setScalar(1.1);
  rider.position.set(...RIDER_POSITION);
  rider.rotation.y = RIDER_TURN;
  rider.traverse((object) => { if (object.isMesh) object.castShadow = true; });
  scene.add(rider);
  const riderShadow = softDisc(3.1, disposables);
  riderShadow.position.set(RIDER_POSITION[0], 0.02, RIDER_POSITION[2]);
  scene.add(riderShadow);

  const sparkles = makeSparkles(disposables);
  scene.add(sparkles.points);
  const confetti = reducedMotion ? null : makeConfetti(CONFETTI_COUNT, disposables);
  if (confetti) scene.add(confetti.mesh);

  // Cadrage : le trophée se place au centre du « slot » de la page, à la
  // distance qui le fait tenir dans ce rectangle quelle que soit la fenêtre.
  const elevation = THREE.MathUtils.degToRad(11);
  function frame() {
    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);
    renderer.setSize(width, height, false);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    camera.aspect = width / height;
    let centerX = width / 2;
    let centerY = height / 2;
    let slotWidth = width;
    let slotHeight = height;
    if (slot) {
      const box = mount.getBoundingClientRect();
      const rect = slot.getBoundingClientRect();
      if (rect.width > 24 && rect.height > 24) {
        slotWidth = rect.width;
        slotHeight = rect.height;
        centerX = rect.left - box.left + rect.width / 2;
        centerY = rect.top - box.top + rect.height / 2;
      }
    }
    const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const distance = (height * Math.max(sceneHeight / slotHeight, SCENE_WIDTH / slotWidth)) / (2 * halfTan);
    camera.position.set(0, focusY + distance * Math.sin(elevation), distance * Math.cos(elevation));
    camera.lookAt(0, focusY, 0);
    camera.setViewOffset(width, height, width / 2 - centerX, height / 2 - centerY, width, height);
    camera.updateProjectionMatrix();
    sparkles.material.uniforms.uScale.value = renderer.getPixelRatio() * (height / 700);
  }
  frame();
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(frame) : null;
  observer?.observe(mount);
  if (slot) observer?.observe(slot);
  window.addEventListener('resize', frame);

  const clock = new THREE.Clock();
  let time = 0;
  let spin = 0;
  let raf = 0;
  let destroyed = false;
  const swayCamera = !reducedMotion;

  function tick() {
    if (destroyed) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, clock.getDelta());
    time += dt;

    // Entrée en scène : le podium jaillit, le trophée tombe en tournant vite,
    // puis la rotation se calme ; le cavalier arrive d’un bond.
    const podiumIn = easeOutBack(clamp01(time / 0.6));
    podium.scale.y = Math.max(0.001, podiumIn);
    podiumShadow.scale.setScalar(Math.max(0.001, clamp01(time / 0.6)));
    const drop = clamp01((time - 0.35) / 1.25);
    const dropEase = easeOutCubic(drop);
    trophyPivot.visible = drop > 0;
    trophyPivot.position.y = PODIUM_HEIGHT + (1 - dropEase) * 5.5 + Math.sin(time * 1.6) * 0.06 * drop;
    trophyPivot.scale.setScalar(0.35 + 0.65 * easeOutBack(drop));
    const settle = clamp01((time - 0.35) / INTRO_SECONDS);
    spin += dt * (SPIN_SPEED + (reducedMotion ? 0 : 9 * (1 - easeOutCubic(settle))));
    trophyPivot.rotation.y = spin;

    const riderIn = clamp01((time - 0.9) / 0.7);
    rider.visible = riderIn > 0;
    rider.scale.setScalar(1.1 * easeOutBack(riderIn));
    riderShadow.scale.setScalar(Math.max(0.001, riderIn));
    const hop = Math.max(0, Math.sin(time * 2.6)) ** 2;
    rider.position.y = riderIn >= 1 ? hop * 0.42 : 0;
    const parts = rider.userData.parts;
    if (parts) {
      parts.tail.rotation.z = Math.sin(time * 5) * 0.28;
      parts.cape.rotation.x = 0.12 + Math.sin(time * 6) * 0.1;
      parts.legs.forEach((leg, index) => { leg.rotation.x = Math.sin(time * 6 + index * 1.6) * 0.16 * hop; });
    }

    const gemIn = easeOutCubic(clamp01((time - 1.2) / 1.0));
    gems.forEach(({ mesh, index }) => {
      const angle = time * 0.85 + index * (Math.PI / 2);
      const radius = 2.75 * gemIn;
      mesh.position.set(Math.cos(angle) * radius, 1.3 + index * 0.95 + Math.sin(time * 1.8 + index) * 0.2, Math.sin(angle) * radius);
      mesh.rotation.set(time * 1.2 + index, time * 1.9, 0);
      mesh.scale.setScalar(Math.max(0.001, gemIn));
    });

    glow.intensity = 10 + Math.sin(time * 3) * 1.6;
    sparkles.material.uniforms.uTime.value = time;
    confetti?.update(time);

    if (swayCamera) {
      camera.position.x = Math.sin(time * 0.35) * 0.7;
      camera.lookAt(0, focusY, 0);
    }
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(tick);

  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener('resize', frame);
      // Le cavalier (géométries et matériaux), puis tout ce qui a été créé ici.
      disposeExplorer(rider);
      disposables.forEach((item) => item?.dispose?.());
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
