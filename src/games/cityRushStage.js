// Décor de Vice City Rush : ciel, silhouette lointaine, route, et la boucle
// de circuit (immeubles, boutiques, enseignes, mobilier urbain, porte de
// mi-parcours, monument). La boucle est générée une fois, de manière
// déterministe, et affichée en deux copies qui se relaient : on repasse
// devant les mêmes façades à chaque tour, comme sur un vrai circuit.
import * as THREE from 'three';
import {
  CITY_RUSH_LAP_LENGTH,
  CITY_RUSH_SCROLL_SCALE,
} from './cityRushRules.js';
import { createBatch, cloneBatchGroup, seededRandom, hexToRgb, SignAtlas, drawNeonSignCell } from './cityRushBuilder.js';
import {
  CITY_RUSH_TUNNEL_HALF_WIDTH,
  CITY_RUSH_TUNNEL_HEIGHT,
  CITY_RUSH_TUNNEL_LENGTH,
  CITY_RUSH_TUNNEL_OUTER_HALF,
  CITY_RUSH_TUNNEL_TOP,
  cityRushTunnels,
} from './cityRushTunnels.js';
import {
  FACADE_TILE,
  makeFacadeTextures,
  makeShopAtlas,
  makeRoadTexture,
  makeSidewalkTexture,
  makeSkylineTexture,
} from './cityRushTextures.js';

const SCALE = CITY_RUSH_SCROLL_SCALE;
const LAP = CITY_RUSH_LAP_LENGTH;
export const START_ZONE_HALF = 34; // m : tribunes et portique autour de la ligne
export const GATE_TRACK_POSITION = LAP / 2;
export const LANDMARK_TRACK_POSITION = LAP * 0.27;
const ROAD_HALF = 6.7;
const SIDEWALK_OUTER = 9.85;
export const ROAD_TILE_LENGTH = 26.8;

const toZ = (trackMeters) => -trackMeters * SCALE;

function standard(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.84, metalness: 0.04, flatShading: true, ...extra });
}

function unlit(color, extra = {}) {
  return new THREE.MeshBasicMaterial({ color, toneMapped: false, ...extra });
}

export function createStageMaterials(city, theme, random) {
  const accent = Number.parseInt(city.accent.slice(1), 16);
  const secondary = Number.parseInt(city.secondary.slice(1), 16);
  // Un thème en plein jour (Vice City) baisse l'émissivité des enseignes et des
  // fenêtres, éteint presque les halos de lampadaires et éclaircit les matières
  // via `theme.materials` ; les villes de nuit gardent les valeurs d'origine.
  const glow = theme.glow ?? 1;
  const tints = theme.materials || {};
  const facades = [0, 1, 2].map((variant) => {
    const { map, emissiveMap } = makeFacadeTextures(theme.facade, random, variant);
    return new THREE.MeshStandardMaterial({
      map,
      emissiveMap,
      emissive: 0xffffff,
      emissiveIntensity: 0.95 * glow,
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.02,
      flatShading: true,
    });
  });
  const shopAtlas = makeShopAtlas(theme);
  const shop = new THREE.MeshStandardMaterial({
    map: shopAtlas.texture,
    emissiveMap: shopAtlas.texture,
    emissive: 0xffffff,
    emissiveIntensity: 0.62 * glow,
    roughness: 0.92,
    flatShading: true,
  });
  return {
    facades,
    shop,
    shopCount: shopAtlas.count,
    roof: standard(tints.roof ?? (city.style === 'paris' ? 0x3a3542 : city.style === 'vice' ? 0x6d4a66 : 0x2c303c), { roughness: 0.9 }),
    stone: standard(tints.stone ?? (city.style === 'paris' ? 0xcbb59a : city.style === 'london' ? 0xb9ab97 : 0x7d8696), { roughness: 0.86 }),
    concrete: standard(tints.concrete ?? 0x5c6270, { roughness: 0.92 }),
    asphaltDark: standard(tints.asphaltDark ?? 0x1b1d27, { roughness: 0.95 }),
    metal: standard(tints.metal ?? 0x3b4352, { metalness: 0.62, roughness: 0.38 }),
    darkMetal: standard(tints.darkMetal ?? 0x1c2029, { metalness: 0.5, roughness: 0.45 }),
    chrome: standard(tints.chrome ?? 0xb9c6d0, { metalness: 0.78, roughness: 0.26 }),
    brick: standard(tints.brick ?? 0x8d4b3c, { roughness: 0.94 }),
    white: standard(tints.white ?? 0xf1ece2, { roughness: 0.8 }),
    cream: standard(tints.cream ?? 0xe6d7bd, { roughness: 0.86 }),
    red: standard(tints.red ?? 0xc8372f, { roughness: 0.7 }),
    green: standard(tints.green ?? 0x2f6b4a, { roughness: 0.8 }),
    yellow: standard(tints.yellow ?? 0xf4c431, { roughness: 0.6 }),
    blue: standard(tints.blue ?? 0x2d4f9e, { roughness: 0.7 }),
    wood: standard(tints.wood ?? 0x7a5236, { roughness: 0.9 }),
    trunk: standard(tints.trunk ?? 0x6f4a33, { roughness: 0.95 }),
    foliage: standard(tints.foliage ?? (city.style === 'vice' ? 0x2e9b7c : 0x2f7a4c), { roughness: 0.9 }),
    foliageLight: standard(tints.foliageLight ?? (city.style === 'tokyo' ? 0xf4a3c7 : 0x4f9d63), { roughness: 0.9 }),
    glassDark: standard(tints.glassDark ?? 0x18243a, { roughness: 0.3, metalness: 0.25 }),
    // Intérieur des tremis : pierre sombre et mate, sans reflet.
    tunnel: standard(tints.tunnel ?? (city.style === 'vice' ? 0x39414f : 0x232838), { roughness: 0.97, metalness: 0.04 }),
    // Sable du front de mer : présent seulement quand le thème le demande.
    sand: tints.sand ? standard(tints.sand, { roughness: 1 }) : null,
    lantern: standard(0xff6a4a, { emissive: 0xff6a4a, emissiveIntensity: 0.9 * glow, roughness: 0.6 }),
    neon: unlit(accent),
    neonSecondary: unlit(secondary),
    neonWarm: unlit(0xffe0a8),
    neonWhite: unlit(0xf8fbff),
    lampGlow: unlit(0xfff0c8),
    lampCone: new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: theme.lampCone ?? 0.075, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide, fog: false }),
    accentCone: new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: theme.accentCone ?? 0.12, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide, fog: false }),
    accentStandard: standard(accent, { emissive: accent, emissiveIntensity: 0.28 * glow, metalness: 0.25 }),
    secondaryStandard: standard(secondary, { emissive: secondary, emissiveIntensity: 0.22 * glow, metalness: 0.25 }),
    accent,
    secondary,
  };
}

// ─── Ciel ──────────────────────────────────────────────────────────────────
export function makeSkyDome(theme) {
  const sky = theme.sky;
  const toVector = (hex) => new THREE.Vector3(...hexToRgb(hex));
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: toVector(sky.top) },
      midColor: { value: toVector(sky.mid) },
      horizonColor: { value: toVector(sky.horizon) },
      hazeColor: { value: toVector(sky.haze) },
      sunColor: { value: toVector(sky.sun.color) },
      sunGlow: { value: toVector(sky.sun.glow) },
      sunDirection: { value: new THREE.Vector3(0.05, sky.sun.elevation, -1).normalize() },
      sunRadius: { value: sky.sun.radius },
      stripes: { value: sky.sun.stripes },
      stars: { value: sky.stars },
      moon: { value: sky.moon },
      moonDirection: { value: new THREE.Vector3(-0.55, 0.42, -0.72).normalize() },
      time: { value: 0 },
    },
    vertexShader: `varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }`,
    fragmentShader: `uniform vec3 topColor; uniform vec3 midColor; uniform vec3 horizonColor; uniform vec3 hazeColor;
      uniform vec3 sunColor; uniform vec3 sunGlow; uniform vec3 sunDirection; uniform float sunRadius; uniform float stripes;
      uniform float stars; uniform float moon; uniform vec3 moonDirection; uniform float time;
      varying vec3 vDirection;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        vec3 dir = normalize(vDirection);
        float elevation = dir.y;
        vec3 color = mix(horizonColor, midColor, smoothstep(0.0, 0.22, elevation));
        color = mix(color, topColor, smoothstep(0.18, 0.75, elevation));
        color = mix(color, hazeColor, (1.0 - smoothstep(-0.02, 0.09, abs(elevation))) * 0.42);
        color = mix(color, horizonColor * 0.35, smoothstep(0.0, -0.25, elevation));
        float sunDot = dot(dir, sunDirection);
        float angle = acos(clamp(sunDot, -1.0, 1.0));
        float glow = exp(-angle * angle * 7.0) * 0.55 + exp(-angle * angle * 60.0) * 0.35;
        color = mix(color, sunGlow, glow * step(-0.05, elevation));
        float disc = 1.0 - smoothstep(sunRadius - 0.012, sunRadius + 0.004, angle);
        if (stripes > 0.5) {
          float band = (sunDirection.y - elevation) / sunRadius;
          float cut = step(0.0, band) * step(0.5, fract(band * 5.2 + 0.3)) * smoothstep(0.0, 0.9, band);
          disc *= 1.0 - cut;
        }
        vec3 sunShade = mix(sunGlow, sunColor, smoothstep(sunDirection.y - sunRadius, sunDirection.y + sunRadius * 0.6, elevation));
        color = mix(color, sunShade, disc * step(-0.01, elevation));
        if (moon > 0.5) {
          float moonAngle = acos(clamp(dot(dir, moonDirection), -1.0, 1.0));
          float moonDisc = 1.0 - smoothstep(0.028, 0.034, moonAngle);
          float moonHalo = exp(-moonAngle * moonAngle * 90.0) * 0.25;
          color = mix(color, vec3(0.93, 0.95, 1.0), moonDisc + moonHalo);
        }
        if (stars > 0.01 && elevation > 0.06) {
          vec2 cell = floor(dir.xz / max(0.08, abs(dir.y)) * 48.0);
          float h = hash(cell);
          if (h > 1.0 - stars * 0.045) {
            vec2 center = (cell + 0.5 + vec2(hash(cell + 7.0), hash(cell + 13.0)) * 0.5 - 0.25) / 48.0 * max(0.08, abs(dir.y));
            float d = length(dir.xz - center) * 48.0 / max(0.08, abs(dir.y));
            float twinkle = 0.65 + 0.35 * sin(time * (1.5 + h * 3.0) + h * 40.0);
            float star = smoothstep(0.32, 0.05, d) * smoothstep(0.06, 0.3, elevation) * twinkle;
            color += vec3(0.85, 0.92, 1.0) * star * stars;
          }
        }
        gl_FragColor = vec4(color, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(330, 28, 18), material);
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  return dome;
}

export function makeSkyline(city, theme, random) {
  const texture = makeSkylineTexture(city, theme, random);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, fog: false });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(760, 190), material);
  plane.position.set(0, 52, -268);
  plane.renderOrder = -5;
  return plane;
}

// ─── Route ─────────────────────────────────────────────────────────────────
export function makeRoad(scene, theme, random, playerZ) {
  const roadTexture = makeRoadTexture(theme, random);
  roadTexture.repeat.set(1, 320 / ROAD_TILE_LENGTH);
  const roadMaterial = new THREE.MeshStandardMaterial({
    map: roadTexture,
    roughness: theme.weather === 'rain' ? 0.46 : 0.86,
    metalness: theme.weather === 'rain' ? 0.32 : 0.04,
    flatShading: true,
  });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, 320), roadMaterial);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, -0.055, playerZ - 120);
  road.receiveShadow = true;
  scene.add(road);

  const sidewalkTexture = makeSidewalkTexture(theme, random);
  sidewalkTexture.repeat.set(1, 320 / 8);
  const sidewalkMaterial = new THREE.MeshStandardMaterial({ map: sidewalkTexture, roughness: 0.94, flatShading: true });
  const curbMaterial = standard(theme.curb ?? 0x7a7684, { roughness: 0.88 });
  const edgeMaterial = new THREE.MeshBasicMaterial({ color: theme.edgeColor, transparent: true, opacity: 0.85, toneMapped: false });
  // Au-delà des trottoirs : bitume sombre la nuit, sable chaud à Vice City.
  const groundMaterial = standard(theme.ground ?? 0x0d0f18, { roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.12, playerZ - 120);
  scene.add(ground);
  for (const side of [-1, 1]) {
    const sidewalk = new THREE.Mesh(new THREE.PlaneGeometry(SIDEWALK_OUTER - ROAD_HALF, 320), sidewalkMaterial);
    sidewalk.rotation.x = -Math.PI / 2;
    sidewalk.position.set(side * (ROAD_HALF + (SIDEWALK_OUTER - ROAD_HALF) / 2), 0.02, playerZ - 120);
    sidewalk.receiveShadow = true;
    scene.add(sidewalk);
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 320), curbMaterial);
    curb.position.set(side * (ROAD_HALF + 0.02), 0.0, playerZ - 120);
    scene.add(curb);
    const neonLine = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 320), edgeMaterial);
    neonLine.position.set(side * (ROAD_HALF - 0.15), -0.03, playerZ - 120);
    scene.add(neonLine);
  }
  return {
    scroll(worldTravel) {
      roadTexture.offset.y += worldTravel / ROAD_TILE_LENGTH;
      sidewalkTexture.offset.y += worldTravel / 8;
      if (roadTexture.offset.y > 1000) roadTexture.offset.y -= 1000;
      if (sidewalkTexture.offset.y > 1000) sidewalkTexture.offset.y -= 1000;
    },
  };
}

// ─── Mobilier urbain ───────────────────────────────────────────────────────
function addLamp(batch, m, theme, x, z, side) {
  const inward = -side;
  if (theme.lamp === 'deco') {
    batch.cylinder(m.metal, [x, 2.6, z], 0.07, 0.11, 5.2, 6);
    batch.box(m.metal, [x, 0.18, z], [0.5, 0.36, 0.5]);
    batch.box(m.accentStandard, [x, 5.35, z], [0.42, 0.42, 0.42]);
    batch.box(m.lampGlow, [x, 5.35, z], [0.3, 0.3, 0.3]);
    batch.cylinder(m.neon, [x, 2.6, z], 0.02, 0.02, 4.4, 4, null, {});
    batch.cone(m.lampCone, [x, 2.65, z], 1.9, 5.3, 10, null);
    return;
  }
  if (theme.lamp === 'globe') {
    batch.cylinder(m.darkMetal, [x, 2.2, z], 0.06, 0.1, 4.4, 6);
    batch.box(m.darkMetal, [x, 0.2, z], [0.42, 0.4, 0.42]);
    for (const offset of [-0.45, 0.45]) {
      batch.box(m.darkMetal, [x + inward * 0.22, 4.25, z + offset], [0.5, 0.06, 0.06]);
      batch.sphere(m.lampGlow, [x + inward * 0.45, 4.45, z + offset], 0.26, 8);
      batch.cone(m.lampCone, [x + inward * 0.45, 2.15, z + offset], 1.5, 4.3, 10, null);
    }
    return;
  }
  if (theme.lamp === 'victorian') {
    batch.cylinder(m.darkMetal, [x, 2.4, z], 0.055, 0.1, 4.8, 6);
    batch.box(m.darkMetal, [x, 0.22, z], [0.4, 0.44, 0.4]);
    batch.box(m.darkMetal, [x, 4.95, z], [0.34, 0.5, 0.34]);
    batch.box(m.lampGlow, [x, 4.95, z], [0.26, 0.38, 0.26]);
    batch.cone(m.darkMetal, [x, 5.32, z], 0.3, 0.3, 4);
    batch.cone(m.lampCone, [x, 2.45, z], 1.6, 4.9, 10, null);
    return;
  }
  // Cobra (New York) et moderne (Tokyo) : un bras au-dessus de la chaussée.
  const height = theme.lamp === 'cobra' ? 6.4 : 5.9;
  batch.cylinder(m.metal, [x, height / 2, z], 0.06, 0.1, height, 6);
  batch.box(m.metal, [x + inward * 0.9, height - 0.05, z], [1.9, 0.09, 0.09]);
  batch.box(m.metal, [x + inward * 1.85, height - 0.2, z], [0.75, 0.16, 0.3]);
  batch.box(m.lampGlow, [x + inward * 1.85, height - 0.31, z], [0.6, 0.06, 0.22]);
  batch.cone(m.lampCone, [x + inward * 1.85, (height - 0.3) / 2, z], 2.3, height - 0.3, 10, null);
}

function addTree(batch, m, theme, x, z, random) {
  const scale = 0.85 + random() * 0.3;
  if (theme.tree === 'palm') {
    const lean = (random() - 0.5) * 0.24;
    for (let segment = 0; segment < 5; segment += 1) {
      batch.cylinder(m.trunk, [x + lean * segment * 0.45, 0.6 + segment * 1.18 * scale, z], 0.13, 0.17, 1.24 * scale, 6, [0, 0, lean * 0.6]);
    }
    const top = [x + lean * 2.1, 0.6 + 5.6 * scale, z];
    batch.sphere(m.trunk, top, 0.28, 6);
    for (let leaf = 0; leaf < 8; leaf += 1) {
      const angle = (leaf / 8) * Math.PI * 2 + random() * 0.4;
      const droop = 0.55 + random() * 0.35;
      batch.cone(m.foliage, [top[0] + Math.cos(angle) * 1.3, top[1] - 0.25 - droop * 0.5, top[2] + Math.sin(angle) * 1.3], 0.28, 3.4, 4, [Math.sin(angle) * (Math.PI / 2 - droop * 0.5), 0, -Math.cos(angle) * (Math.PI / 2 - droop * 0.5)]);
    }
    for (let nut = 0; nut < 3; nut += 1) batch.sphere(m.wood, [top[0] + (random() - 0.5) * 0.4, top[1] - 0.3, top[2] + (random() - 0.5) * 0.4], 0.12, 5);
    return;
  }
  batch.cylinder(m.trunk, [x, 1.3 * scale, z], 0.12, 0.2, 2.6 * scale, 6);
  batch.box(m.darkMetal, [x, 0.05, z], [1.2, 0.1, 1.2]);
  if (theme.tree === 'cherry') {
    batch.sphere(m.foliageLight, [x, 3.3 * scale, z], 1.5 * scale, 7);
    batch.sphere(m.foliageLight, [x + 0.8, 2.9 * scale, z + 0.5], 1.0 * scale, 6);
    batch.sphere(m.foliage, [x - 0.6, 2.7 * scale, z - 0.6], 0.6 * scale, 6);
    return;
  }
  if (theme.tree === 'plane') {
    batch.sphere(m.foliage, [x, 3.6 * scale, z], 1.7 * scale, 7);
    batch.sphere(m.foliageLight, [x + 0.7, 3.1 * scale, z - 0.7], 1.1 * scale, 6);
    return;
  }
  batch.sphere(m.foliage, [x, 3.2 * scale, z], 1.3 * scale, 6);
  batch.sphere(m.foliageLight, [x - 0.5, 3.7 * scale, z + 0.4], 0.8 * scale, 6);
}

function addCityProp(batch, m, theme, city, x, z, side, random, atlas) {
  const inward = -side;
  const style = city.style;
  if (style === 'vice') {
    const roll = random();
    if (theme.beach) {
      // Front de mer en plein jour : parasol et serviette, planche de surf,
      // poste de maître-nageur, douche de plage.
      const sand = m.sand || m.cream;
      if (roll < 0.34) {
        batch.cylinder(m.white, [x, 0.95, z], 0.045, 0.05, 1.9, 6);
        batch.cone(m.accentStandard, [x, 2.06, z], 1.15, 0.62, 12);
        batch.torus(m.white, [x, 1.76, z], 1.13, 0.045, 4, 16, [Math.PI / 2, 0, 0]);
        batch.sphere(m.white, [x, 2.4, z], 0.07, 6);
        batch.box(sand, [x + inward * 0.62, 0.03, z + 0.55], [1.2, 0.06, 1.8], [0, 0.32, 0]);
        batch.box(m.secondaryStandard, [x + inward * 0.62, 0.07, z + 0.55], [0.95, 0.04, 1.5], [0, 0.32, 0]);
      } else if (roll < 0.6) {
        // Planche de surf plantée dans le sable.
        batch.box(sand, [x, 0.04, z], [1.0, 0.08, 1.0]);
        batch.box(m.yellow, [x, 0.98, z], [0.12, 1.95, 0.44], [0, 0.42, 0.2]);
        batch.box(m.white, [x + 0.03, 0.98, z], [0.14, 1.5, 0.15], [0, 0.42, 0.2]);
        batch.box(m.accentStandard, [x, 1.86, z + 0.02], [0.13, 0.22, 0.42], [0, 0.42, 0.2]);
      } else if (roll < 0.82) {
        // Poste de maître-nageur sur pilotis, toit rouge.
        for (const [px, pz] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) {
          batch.box(m.wood, [x + px, 0.7, z + pz], [0.13, 1.4, 0.13]);
        }
        batch.box(m.wood, [x, 1.44, z], [1.95, 0.12, 1.95]);
        batch.box(m.white, [x, 2.06, z], [1.75, 1.12, 1.75]);
        batch.box(m.glassDark, [x + inward * 0.89, 2.06, z], [0.04, 0.62, 1.05]);
        batch.cone(m.red, [x, 2.94, z], 1.4, 0.72, 4, [0, Math.PI / 4, 0]);
        batch.box(m.sand || m.cream, [x, 0.04, z], [2.4, 0.08, 2.4]);
      } else {
        // Douche de plage et poubelle pastel.
        batch.cylinder(m.chrome, [x, 1.05, z], 0.05, 0.06, 2.1, 6);
        batch.box(m.chrome, [x + inward * 0.2, 2.06, z], [0.44, 0.07, 0.07]);
        batch.cylinder(m.secondaryStandard, [x + inward * 0.78, 0.4, z + 0.35], 0.26, 0.3, 0.8, 8);
        batch.box(sand, [x, 0.03, z], [1.3, 0.06, 1.3]);
      }
      return;
    }
    if (roll < 0.4) {
      // Borne incendie pastel.
      batch.cylinder(m.secondaryStandard, [x, 0.45, z], 0.14, 0.17, 0.9, 7);
      batch.sphere(m.secondaryStandard, [x, 0.95, z], 0.17, 6);
      batch.box(m.secondaryStandard, [x, 0.62, z], [0.56, 0.14, 0.14]);
    } else if (roll < 0.75) {
      // Scooter garé.
      batch.box(m.accentStandard, [x, 0.55, z], [0.5, 0.42, 1.5]);
      batch.box(m.accentStandard, [x, 0.9, z + 0.35], [0.46, 0.22, 0.6]);
      batch.cylinder(m.darkMetal, [x, 0.28, z - 0.6], 0.26, 0.26, 0.2, 8, [0, 0, Math.PI / 2]);
      batch.cylinder(m.darkMetal, [x, 0.28, z + 0.6], 0.26, 0.26, 0.2, 8, [0, 0, Math.PI / 2]);
      batch.box(m.chrome, [x, 1.05, z - 0.55], [0.6, 0.05, 0.05]);
    } else {
      batch.box(m.blue, [x, 0.6, z], [0.55, 1.1, 0.5]);
      batch.box(m.white, [x + inward * 0.26, 0.72, z], [0.04, 0.3, 0.36]);
    }
    return;
  }
  if (style === 'new-york') {
    const roll = random();
    if (roll < 0.35) {
      batch.cylinder(m.red, [x, 0.45, z], 0.14, 0.17, 0.9, 7);
      batch.sphere(m.red, [x, 0.95, z], 0.17, 6);
      batch.box(m.red, [x, 0.62, z], [0.56, 0.14, 0.14]);
    } else if (roll < 0.7) {
      for (let box = 0; box < 3; box += 1) {
        batch.box([m.blue, m.red, m.yellow][box], [x, 0.55, z + (box - 1) * 0.62], [0.5, 1.1, 0.52]);
        batch.box(m.glassDark, [x + inward * 0.26, 0.78, z + (box - 1) * 0.62], [0.03, 0.4, 0.38]);
      }
    } else {
      batch.cylinder(m.darkMetal, [x, 0.5, z], 0.34, 0.3, 1.0, 8);
      batch.box(m.darkMetal, [x, 1.02, z], [0.74, 0.08, 0.74]);
    }
    return;
  }
  if (style === 'tokyo') {
    // Distributeurs automatiques lumineux, par paire.
    for (const offset of [-0.6, 0.6]) {
      batch.box(offset < 0 ? m.red : m.white, [x, 0.95, z + offset], [0.7, 1.9, 1.0]);
      batch.box(m.neonWhite, [x + inward * 0.36, 1.25, z + offset], [0.02, 0.9, 0.78]);
      batch.box(m.glassDark, [x + inward * 0.37, 0.5, z + offset], [0.02, 0.35, 0.6]);
    }
    return;
  }
  if (style === 'paris') {
    const roll = random();
    if (roll < 0.5) {
      // Terrasse de café : tables rondes et chaises.
      for (let table = 0; table < 3; table += 1) {
        const tz = z + (table - 1) * 1.1;
        batch.cylinder(m.darkMetal, [x, 0.4, tz], 0.03, 0.05, 0.8, 5);
        batch.cylinder(m.white, [x, 0.8, tz], 0.34, 0.34, 0.05, 10);
        for (const chair of [-0.5, 0.5]) {
          batch.box(m.wood, [x + chair, 0.45, tz], [0.34, 0.05, 0.34]);
          batch.box(m.wood, [x + chair + (chair < 0 ? -0.15 : 0.15), 0.7, tz], [0.05, 0.5, 0.34]);
        }
      }
    } else {
      // Colonne Morris et ses affiches.
      batch.cylinder(m.green, [x, 1.5, z], 0.55, 0.6, 3.0, 10);
      batch.cone(m.green, [x, 3.3, z], 0.72, 0.6, 10);
      batch.sphere(m.green, [x, 3.75, z], 0.2, 6);
      if (atlas) {
        batch.plane(m.signs, [x + inward * 0.56, 1.65, z], 0.9, 1.6, [0, inward > 0 ? Math.PI / 2 : -Math.PI / 2], { uv: atlas.posterUv });
      }
    }
    return;
  }
  // Londres : cabine téléphonique, boîte aux lettres.
  if (random() < 0.5) {
    batch.box(m.red, [x, 1.25, z], [0.95, 2.5, 0.95]);
    batch.box(m.glassDark, [x + inward * 0.48, 1.35, z], [0.03, 1.6, 0.7]);
    batch.box(m.glassDark, [x, 1.35, z + 0.48], [0.7, 1.6, 0.03]);
    batch.box(m.glassDark, [x, 1.35, z - 0.48], [0.7, 1.6, 0.03]);
    batch.box(m.red, [x, 2.62, z], [0.8, 0.26, 0.8]);
    batch.box(m.neonWarm, [x + inward * 0.48, 2.3, z], [0.02, 0.22, 0.6]);
  } else {
    batch.cylinder(m.red, [x, 0.8, z], 0.3, 0.32, 1.6, 10);
    batch.sphere(m.red, [x, 1.62, z], 0.3, 7);
    batch.box(m.darkMetal, [x + inward * 0.3, 1.0, z], [0.03, 0.08, 0.3]);
  }
}

// ─── Immeubles ─────────────────────────────────────────────────────────────
// Façade en plans texturés : `alongZ` est l'étendue le long de la route,
// `acrossX` la profondeur vers l'extérieur. Un plan tourné de ±90° autour de
// y regarde la chaussée ; les pignons regardent ±z (visibles dans les
// ruelles) et la face arrière n'est dessinée que pour la rangée avant.
function facadeBlock(batch, material, side, innerX, baseY, z, alongZ, height, acrossX, tint, floorHeight, random, options = {}) {
  const outerX = innerX + side * acrossX;
  const centerX = innerX + side * (acrossX / 2);
  const tileHeight = floorHeight * FACADE_TILE.floors;
  const faceRotation = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  const offsetU = Math.floor(random() * 4) * 0.25;
  const offsetV = Math.floor(random() * 3) / 3;
  const repeatFor = (extent) => [Math.max(1, Math.round(extent / FACADE_TILE.width)), Math.max(1, Math.round(height / tileHeight))];
  batch.plane(material, [innerX - side * 0.001, baseY + height / 2, z], alongZ, height, [0, faceRotation, 0], {
    repeat: repeatFor(alongZ),
    offset: [offsetU, offsetV],
    tint,
  });
  if (!options.skipSides) {
    for (const direction of [-1, 1]) {
      batch.plane(material, [centerX, baseY + height / 2, z + direction * alongZ / 2], acrossX + 0.002, height, [0, direction > 0 ? 0 : Math.PI, 0], {
        repeat: repeatFor(acrossX),
        offset: [offsetU + 0.5, offsetV],
        tint: tint.map((channel) => channel * 0.82),
      });
    }
  }
  if (!options.skipBack) {
    batch.plane(material, [outerX, baseY + height / 2, z], alongZ, height, [0, -faceRotation, 0], {
      repeat: repeatFor(alongZ),
      offset: [offsetU, offsetV],
      tint: tint.map((channel) => channel * 0.7),
    });
  }
  return { centerX, outerX };
}

function addBuilding(batch, m, city, theme, atlas, side, trackMeters, depthMeters, random, options = {}) {
  const style = city.style;
  const z = toZ(trackMeters);
  const depth = depthMeters * SCALE;
  const widths = [6, 8, 10];
  const width = options.back ? 8 + Math.floor(random() * 3) * 2 : widths[Math.floor(random() * widths.length)];
  const floorHeight = theme.facade.floor;
  const baseFloors = style === 'new-york' ? 9 : style === 'tokyo' ? 7 : style === 'paris' ? 5 : style === 'london' ? 4 : 5;
  const extraFloors = style === 'new-york' ? 12 : style === 'tokyo' ? 7 : style === 'paris' ? 2 : style === 'london' ? 3 : 5;
  let floors = baseFloors + Math.floor(random() * (extraFloors + 1));
  if (options.back) floors = Math.round(floors * (style === 'paris' || style === 'london' ? 1.35 : 1.6)) + 2;
  const height = floors * floorHeight;
  const innerX = side * (options.back ? 20.5 + random() * 3 : SIDEWALK_OUTER + 0.05);
  const colorHex = city.buildingColors[Math.floor(random() * city.buildingColors.length)];
  const brightness = 0.86 + random() * 0.24;
  const tint = hexToRgb(colorHex).map((channel) => Math.min(1, channel * brightness));
  const facade = m.facades[Math.floor(random() * m.facades.length)];
  const hasShop = !options.back && style !== 'paris' ? random() < 0.72 : !options.back && random() < 0.6;
  const shopHeight = 2.0;
  const baseY = hasShop ? shopHeight : 0;
  const { outerX } = facadeBlock(batch, facade, side, innerX, baseY, z, depth, height - baseY, width, tint, floorHeight, random, { skipBack: options.back, skipSides: false });
  // Le plan de façade est posé le long de la route : sa « largeur » suit z
  // et sa « profondeur » (vers l'extérieur) suit x.
  const buildingCenterX = innerX + side * (width / 2);

  if (hasShop) {
    const panels = Math.floor(depth / 4);
    const remainder = depth - panels * 4;
    const inward = -side;
    for (let panel = 0; panel < panels; panel += 1) {
      const shopIndex = Math.floor(random() * m.shopCount);
      const u0 = shopIndex / m.shopCount;
      const u1 = (shopIndex + 1) / m.shopCount;
      const pz = z - depth / 2 + 2 + panel * 4;
      batch.plane(m.shop, [innerX + inward * 0.01, shopHeight / 2, pz], 4, shopHeight, [0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0], { uv: [u0, 0, u1, 1] });
    }
    if (remainder > 0.5) {
      batch.box(m.roof, [innerX + side * 0.1, shopHeight / 2, z + depth / 2 - remainder / 2], [0.2, shopHeight, remainder]);
      batch.box(m.glassDark, [innerX + inward * 0.02, 0.95, z + depth / 2 - remainder / 2], [0.03, 1.7, 0.9]);
    }
    // Store d'entrée et marquise lumineuse.
    batch.box(m.darkMetal, [innerX + inward * 0.35, shopHeight + 0.05, z], [0.7, 0.1, depth - 0.4]);
    batch.box(m.neonWarm, [innerX + inward * 0.5, shopHeight - 0.02, z], [0.25, 0.04, depth - 0.8]);
    batch.box(m.roof, [innerX + side * 0.02, shopHeight / 2, z], [0.04, shopHeight, depth]);
  }

  // Toit et socle.
  batch.box(m.roof, [buildingCenterX, height + 0.12, z], [width + 0.2, 0.24, depth + 0.2]);
  batch.box(m.roof, [buildingCenterX, height + 0.45, z], [width - 0.6, 0.5, depth - 0.6]);
  if (!options.back) batch.box(m.concrete, [innerX + side * 0.06, 0.12, z], [0.12, 0.24, depth]);

  if (options.back) {
    if (style === 'new-york' && random() < 0.5) {
      batch.box(m.roof, [buildingCenterX, height + 1.6, z], [width * 0.55, 2.4, depth * 0.55]);
      batch.cylinder(m.metal, [buildingCenterX, height + 4.4, z], 0.05, 0.12, 4, 5);
      batch.sphere(m.neon, [buildingCenterX, height + 6.5, z], 0.2, 5);
    } else if (random() < 0.4) {
      batch.box(m.neonSecondary, [buildingCenterX, height + 0.8, z], [width - 1, 0.08, 0.08]);
    }
    return;
  }

  const inward = -side;
  const frontX = innerX;
  if (style === 'vice') {
    // Art déco : bandeaux néon, couronne en escalier, aileron central.
    const neonMaterial = random() < 0.5 ? m.neon : m.neonSecondary;
    for (const level of [height * 0.38, height * 0.72, height - 0.3]) {
      batch.box(neonMaterial, [frontX + inward * 0.09, level, z], [0.1, 0.09, depth - 0.3]);
    }
    for (let step = 0; step < 3; step += 1) {
      batch.box(m.roof, [buildingCenterX, height + 0.8 + step * 0.6, z], [width * (0.7 - step * 0.17), 0.6, depth * (0.7 - step * 0.17)]);
    }
    batch.box(m.white, [buildingCenterX, height + 3.2, z], [0.5, 2.6, 0.5]);
    batch.box(neonMaterial, [buildingCenterX + inward * 0.27, height + 3.2, z], [0.06, 2.2, 0.12]);
    for (let column = -1; column <= 1; column += 2) {
      batch.box(m.white, [frontX + inward * 0.12, height / 2 + 1, z + column * (depth / 2 - 0.4)], [0.24, height - 2, 0.3]);
    }
    if (random() < 0.5 && atlas) {
      // Enseigne verticale d'hôtel.
      const signHeight = Math.min(height - 3, 7);
      const sz = z + (random() < 0.5 ? -1 : 1) * depth * 0.28;
      batch.box(m.darkMetal, [frontX + inward * 0.55, height * 0.55, sz], [1.0, signHeight, 0.3]);
      const uv = atlas.verticalUv(Math.floor(random() * atlas.verticalCount));
      batch.plane(m.verticalSigns, [frontX + inward * 0.55, height * 0.55, sz + 0.16], 0.9, signHeight - 0.2, null, { uv });
      batch.plane(m.verticalSigns, [frontX + inward * 0.55, height * 0.55, sz - 0.16], 0.9, signHeight - 0.2, [0, Math.PI, 0], { uv });
    }
  } else if (style === 'new-york') {
    batch.box(m.brick, [buildingCenterX, height + 0.55, z], [width + 0.3, 0.5, depth + 0.3]);
    if (random() < 0.5) {
      // Château d'eau.
      const wx = buildingCenterX + side * width * 0.1;
      const wz = z + (random() - 0.5) * depth * 0.4;
      for (const [lx, lz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) batch.box(m.darkMetal, [wx + lx, height + 1.4, wz + lz], [0.12, 2.6, 0.12]);
      batch.cylinder(m.wood, [wx, height + 3.6, wz], 1.0, 0.9, 1.9, 9);
      batch.cone(m.roof, [wx, height + 5.0, wz], 1.12, 0.9, 9);
    } else {
      for (let unit = 0; unit < 3; unit += 1) batch.box(m.concrete, [buildingCenterX + (unit - 1) * 1.6, height + 1.0, z + (unit % 2 ? 1 : -1)], [1.0, 0.8, 1.0]);
    }
    if (random() < 0.55) {
      // Escalier de secours en zigzag.
      const fz = z + (random() < 0.5 ? -1 : 1) * depth * 0.22;
      for (let level = 1; level < floors - 1; level += 1) {
        const y = baseY + level * floorHeight;
        batch.box(m.darkMetal, [frontX + inward * 0.45, y, fz], [0.9, 0.06, 2.6]);
        batch.box(m.darkMetal, [frontX + inward * 0.88, y + 0.45, fz], [0.05, 0.9, 2.6]);
        batch.box(m.darkMetal, [frontX + inward * 0.45, y + floorHeight / 2, fz - 1.0], [0.6, floorHeight * 0.9, 0.06], [0.72, 0, 0]);
      }
    }
    if (random() < 0.35 && atlas) {
      batch.box(m.darkMetal, [buildingCenterX, height + 2.2, z], [0.2, 3.2, Math.min(depth - 1, 7)]);
      const uv = atlas.signUv(Math.floor(random() * atlas.signCount));
      batch.plane(m.signs, [buildingCenterX + inward * 0.12, height + 2.3, z], Math.min(depth - 1.2, 6.6), 2.9, [0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0], { uv });
    }
  } else if (style === 'tokyo') {
    // Enseignes verticales empilées et toit technique.
    const count = 2 + Math.floor(random() * 3);
    for (let sign = 0; sign < count; sign += 1) {
      if (!atlas) break;
      const signHeight = 2.4 + random() * 2.2;
      const sy = baseY + 1.6 + random() * Math.max(1, height - signHeight - 3);
      const sz = z - depth / 2 + 1 + (sign / count) * (depth - 2) + random() * 0.8;
      batch.box(m.darkMetal, [frontX + inward * 0.5, sy + signHeight / 2, sz], [0.9, signHeight, 0.26]);
      const uv = atlas.verticalUv(Math.floor(random() * atlas.verticalCount));
      batch.plane(m.verticalSigns, [frontX + inward * 0.5, sy + signHeight / 2, sz + 0.14], 0.82, signHeight - 0.16, null, { uv });
      batch.plane(m.verticalSigns, [frontX + inward * 0.5, sy + signHeight / 2, sz - 0.14], 0.82, signHeight - 0.16, [0, Math.PI, 0], { uv });
    }
    batch.box(m.metal, [buildingCenterX, height + 1.2, z + depth * 0.2], [0.08, 2.2, 0.08]);
    batch.box(m.metal, [buildingCenterX, height + 2.3, z + depth * 0.2], [1.2, 0.06, 0.06]);
    batch.box(m.concrete, [buildingCenterX - side * 0.5, height + 0.9, z - depth * 0.25], [1.4, 0.9, 1.4]);
    if (random() < 0.45 && atlas) {
      const uv = atlas.signUv(Math.floor(random() * atlas.signCount));
      batch.box(m.darkMetal, [buildingCenterX, height + 1.9, z], [0.2, 2.6, Math.min(depth - 0.8, 6)]);
      batch.plane(m.signs, [buildingCenterX + inward * 0.12, height + 1.95, z], Math.min(depth - 1, 5.6), 2.4, [0, side < 0 ? Math.PI / 2 : -Math.PI / 2, 0], { uv });
    }
  } else if (style === 'paris') {
    // Haussmann : balcon filant, corniche, toit mansardé en zinc et lucarnes.
    batch.box(m.darkMetal, [frontX + inward * 0.3, baseY + floorHeight * 2 - 0.02, z], [0.6, 0.06, depth - 0.2]);
    for (let bar = -depth / 2 + 0.2; bar < depth / 2; bar += 0.35) batch.box(m.darkMetal, [frontX + inward * 0.58, baseY + floorHeight * 2 + 0.35, z + bar], [0.03, 0.7, 0.03]);
    batch.box(m.darkMetal, [frontX + inward * 0.58, baseY + floorHeight * 2 + 0.7, z], [0.04, 0.04, depth - 0.2]);
    batch.box(m.cream, [frontX + inward * 0.2, height - 0.15, z], [0.4, 0.3, depth + 0.1]);
    batch.box(m.roof, [buildingCenterX, height + 1.0, z], [width - 0.8, 1.6, depth - 0.3], [0, 0, 0]);
    batch.box(m.roof, [frontX + inward * 0.1, height + 0.8, z], [0.9, 1.6, depth - 0.3], [0, 0, -side * 0.35]);
    for (let dormer = 0; dormer < Math.floor(depth / 2.4); dormer += 1) {
      const dz = z - depth / 2 + 1.4 + dormer * 2.4;
      batch.box(m.cream, [frontX + inward * 0.45, height + 0.75, dz], [0.6, 0.9, 0.7]);
      batch.box(random() < 0.5 ? m.neonWarm : m.glassDark, [frontX + inward * 0.76, height + 0.75, dz], [0.02, 0.5, 0.4]);
    }
    for (let chimney = 0; chimney < 2; chimney += 1) {
      batch.box(m.brick, [buildingCenterX + side * (chimney ? 1.2 : -1.0), height + 2.2, z + (chimney ? 1 : -1) * depth * 0.3], [0.5, 1.2, 0.8]);
    }
  } else {
    // Georgien / victorien : toit à deux pans, cheminées, soubassement et porche.
    batch.box(m.roof, [buildingCenterX - side * width * 0.25, height + 0.6, z], [width * 0.56, 0.16, depth + 0.2], [0, 0, side * 0.42]);
    batch.box(m.roof, [buildingCenterX + side * width * 0.25, height + 0.6, z], [width * 0.56, 0.16, depth + 0.2], [0, 0, -side * 0.42]);
    batch.box(m.roof, [buildingCenterX, height + 0.5, z], [width * 0.7, 0.9, depth]);
    for (let chimney = 0; chimney < 2; chimney += 1) {
      const cz = z + (chimney ? 1 : -1) * depth * 0.32;
      batch.box(m.brick, [buildingCenterX, height + 1.6, cz], [0.7, 1.4, 0.7]);
      batch.cylinder(m.cream, [buildingCenterX - 0.18, height + 2.5, cz], 0.1, 0.12, 0.5, 6);
      batch.cylinder(m.cream, [buildingCenterX + 0.18, height + 2.5, cz], 0.1, 0.12, 0.5, 6);
    }
    batch.box(m.white, [frontX + inward * 0.1, height - 0.2, z], [0.2, 0.4, depth]);
    if (!hasShop) {
      // Porche à colonnes et porte colorée.
      batch.cylinder(m.white, [frontX + inward * 0.5, 1.2, z - 0.7], 0.12, 0.12, 2.4, 7);
      batch.cylinder(m.white, [frontX + inward * 0.5, 1.2, z + 0.7], 0.12, 0.12, 2.4, 7);
      batch.box(m.white, [frontX + inward * 0.45, 2.5, z], [0.9, 0.2, 1.8]);
      batch.box(random() < 0.5 ? m.red : m.blue, [frontX + inward * 0.05, 1.1, z], [0.06, 2.2, 1.0]);
      batch.box(m.neonWarm, [frontX + inward * 0.08, 2.0, z], [0.03, 0.3, 0.5]);
    }
    // Garde-corps noir le long du trottoir.
    for (let post = -depth / 2 + 0.3; post < depth / 2; post += 0.6) batch.box(m.darkMetal, [frontX + inward * 0.8, 0.5, z + post], [0.04, 1.0, 0.04]);
    batch.box(m.darkMetal, [frontX + inward * 0.8, 1.0, z], [0.04, 0.04, depth - 0.4]);
  }
  void outerX;
}

// ─── Portes de mi-parcours ─────────────────────────────────────────────────
function addGate(batch, m, city, theme, atlas, trackMeters) {
  const z = toZ(trackMeters);
  const style = theme.gate.style;
  const signUv = atlas.gateUv;
  if (style === 'deco-arch') {
    for (const side of [-1, 1]) {
      for (let step = 0; step < 4; step += 1) {
        batch.box(m.cream, [side * 8.4, 2.4 + step * 2.6, z], [2.4 - step * 0.45, 2.6, 2.4 - step * 0.45]);
        batch.box(m.neon, [side * 8.4 - side * (1.22 - step * 0.225), 2.4 + step * 2.6, z], [0.08, 2.0, 0.12]);
      }
      batch.box(m.neonSecondary, [side * 8.4, 10.7, z], [1.3, 0.14, 1.3]);
    }
    // L'arche et l'enseigne laissent 10,6 m de dégagement : la caméra de
    // poursuite (≈ 8,8 m) passe dessous sans jamais les traverser.
    const segments = 11;
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = Math.PI * (segment / (segments - 1));
      const x = Math.cos(angle) * 8.4;
      const y = 10.5 + Math.sin(angle) * 3.4;
      batch.box(m.cream, [x, y, z], [1.0, 0.9, 1.4], [0, 0, angle - Math.PI / 2]);
      batch.box(m.neon, [x, y, z + 0.72], [0.9, 0.12, 0.08], [0, 0, angle - Math.PI / 2]);
    }
    batch.box(m.darkMetal, [0, 11.7, z], [12.5, 2.2, 0.3]);
    batch.plane(m.signs, [0, 11.7, z + 0.16], 12, 2.0, null, { uv: signUv });
    batch.plane(m.signs, [0, 11.7, z - 0.16], 12, 2.0, [0, Math.PI, 0], { uv: signUv });
    for (const side of [-1, 1]) {
      // Flamants roses stylisés de part et d'autre.
      batch.box(m.accentStandard, [side * 5.6, 13.0, z], [1.1, 0.6, 0.3]);
      batch.box(m.accentStandard, [side * 5.0, 13.7, z], [0.2, 1.1, 0.2]);
      batch.box(m.accentStandard, [side * 4.9, 14.3, z], [0.5, 0.3, 0.2]);
      batch.box(m.accentStandard, [side * 5.9, 12.3, z], [0.1, 0.9, 0.1]);
    }
    return;
  }
  if (style === 'overpass') {
    for (const side of [-1, 1]) {
      batch.box(m.concrete, [side * 8.3, 5.1, z], [2.0, 10.2, 3.2]);
      batch.box(m.concrete, [side * 8.3, 0.3, z], [2.6, 0.6, 3.8]);
    }
    // Tablier à 10,2 m : la caméra de poursuite passe dessous.
    batch.box(m.darkMetal, [0, 10.6, z], [20, 0.8, 3.6]);
    batch.box(m.darkMetal, [0, 12.4, z], [20, 0.16, 3.6]);
    for (let truss = -8; truss <= 8; truss += 2) {
      batch.box(m.darkMetal, [truss, 11.5, z + 1.7], [0.14, 1.9, 0.14]);
      batch.box(m.darkMetal, [truss, 11.5, z - 1.7], [0.14, 1.9, 0.14]);
      if (truss < 8) {
        batch.box(m.darkMetal, [truss + 1, 11.5, z + 1.7], [0.1, 2.6, 0.1], [0, 0, 0.72]);
        batch.box(m.darkMetal, [truss + 1, 11.5, z - 1.7], [0.1, 2.6, 0.1], [0, 0, -0.72]);
      }
    }
    for (const lx of [-6, 0, 6]) {
      batch.box(m.metal, [lx, 13.4, z], [0.1, 1.8, 0.1]);
      batch.box(m.lampGlow, [lx, 14.3, z], [0.5, 0.2, 0.3]);
    }
    for (let light = -7; light <= 7; light += 3.5) batch.box(m.neonWarm, [light, 10.14, z], [0.6, 0.12, 0.6]);
    batch.plane(m.signs, [0, 10.6, z + 1.82], 7, 1.2, null, { uv: signUv });
    batch.plane(m.signs, [0, 10.6, z - 1.82], 7, 1.2, [0, Math.PI, 0], { uv: signUv });
    batch.box(m.darkMetal, [0, 10.6, z], [7.2, 1.3, 3.62]);
    return;
  }
  if (style === 'torii') {
    for (const side of [-1, 1]) {
      batch.cylinder(m.red, [side * 7.6, 5.9, z], 0.42, 0.5, 11.8, 10, [0, 0, side * 0.03]);
      batch.cylinder(m.darkMetal, [side * 7.6, 0.4, z], 0.6, 0.65, 0.8, 10);
    }
    // Linteaux à plus de 10 m : la caméra de poursuite passe sous le torii.
    batch.box(m.red, [0, 12.0, z], [18.4, 0.75, 0.9]);
    batch.box(m.darkMetal, [0, 12.5, z], [19.4, 0.36, 1.1]);
    for (const side of [-1, 1]) batch.box(m.darkMetal, [side * 9.2, 12.85, z], [1.6, 0.5, 1.1], [0, 0, side * 0.22]);
    batch.box(m.red, [0, 10.2, z], [16.6, 0.5, 0.6]);
    batch.box(m.red, [0, 11.1, z], [0.9, 1.3, 0.45]);
    batch.plane(m.signs, [0, 11.1, z + 0.24], 0.9, 1.3, null, { uv: atlas.gateUv });
    for (const side of [-1, 1]) batch.cylinder(m.red, [side * 7.6, 11.1, z + 0.6], 0.14, 0.14, 1.4, 6, [0, 0, 0]);
    return;
  }
  if (style === 'arc') {
    for (const side of [-1, 1]) {
      batch.box(m.stone, [side * 8.1, 5.6, z], [3.4, 11.2, 3.6]);
      batch.box(m.stone, [side * 8.1, 0.5, z], [3.9, 1.0, 4.1]);
      batch.box(m.cream, [side * 8.1, 7.6, z + 1.85], [2.0, 2.6, 0.1]);
      batch.box(m.cream, [side * 8.1, 7.6, z - 1.85], [2.0, 2.6, 0.1]);
      batch.box(m.cream, [side * 8.1, 3.4, z + 1.85], [2.0, 3.2, 0.1]);
      batch.box(m.cream, [side * 8.1, 3.4, z - 1.85], [2.0, 3.2, 0.1]);
      batch.plane(m.accentCone, [side * 8.1, 1.4, z + 1.9], 2.8, 2.6, [0, 0, 0]);
      batch.plane(m.accentCone, [side * 8.1, 1.4, z - 1.9], 2.8, 2.6, [0, Math.PI, 0]);
    }
    batch.box(m.stone, [0, 12.6, z], [19.6, 2.8, 3.6]);
    batch.box(m.stone, [0, 14.6, z], [20.2, 1.2, 4.0]);
    batch.box(m.cream, [0, 12.6, z + 1.85], [11, 1.6, 0.1]);
    batch.box(m.cream, [0, 12.6, z - 1.85], [11, 1.6, 0.1]);
    const segments = 9;
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = Math.PI * (segment / (segments - 1));
      batch.box(m.stone, [Math.cos(angle) * 6.5, 9.8 + Math.sin(angle) * 1.6, z], [1.9, 1.1, 3.6], [0, 0, angle - Math.PI / 2]);
    }
    batch.plane(m.signs, [0, 10.0, z + 1.82], 7, 1.3, null, { uv: signUv });
    batch.plane(m.signs, [0, 10.0, z - 1.82], 7, 1.3, [0, Math.PI, 0], { uv: signUv });
    batch.box(m.darkMetal, [0, 10.0, z], [7.2, 1.4, 3.62]);
    return;
  }
  // Tower Bridge.
  for (const side of [-1, 1]) {
    const x = side * 8.6;
    batch.box(m.stone, [x, 7, z], [3.4, 14, 3.4]);
    batch.box(m.stone, [x, 0.6, z], [4.0, 1.2, 4.0]);
    for (const corner of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      batch.box(m.stone, [x + corner[0] * 1.5, 14.6, z + corner[1] * 1.5], [0.6, 1.4, 0.6]);
      batch.cone(m.roof, [x + corner[0] * 1.5, 15.9, z + corner[1] * 1.5], 0.45, 1.4, 4);
    }
    batch.cone(m.roof, [x, 16.2, z], 1.6, 3.6, 4, [0, Math.PI / 4, 0]);
    for (let level = 1; level < 5; level += 1) {
      for (const face of [-1, 1]) batch.box(m.neonWarm, [x, level * 2.6 + 0.6, z + face * 1.72], [0.6, 1.0, 0.04]);
      batch.box(m.neonWarm, [x - side * 1.72, level * 2.6 + 0.6, z], [0.04, 1.0, 0.6]);
    }
  }
  batch.box(m.blue, [0, 10.6, z], [14, 0.5, 2.4]);
  batch.box(m.blue, [0, 12.2, z], [14, 0.3, 2.4]);
  for (let post = -6; post <= 6; post += 1.5) {
    batch.box(m.blue, [post, 11.4, z + 1.15], [0.1, 1.4, 0.1]);
    batch.box(m.blue, [post, 11.4, z - 1.15], [0.1, 1.4, 0.1]);
  }
  for (const side of [-1, 1]) {
    batch.box(m.blue, [side * 4.2, 7.9, z], [0.14, 7.8, 0.14], [0, 0, side * 0.56]);
    batch.box(m.blue, [side * 2.0, 8.9, z], [0.14, 5.0, 0.14], [0, 0, side * 0.42]);
  }
  // Enseigne logée entre les deux passerelles (dégagement caméra ≥ 10 m).
  batch.box(m.darkMetal, [0, 11.4, z], [6.2, 1.3, 0.3]);
  batch.plane(m.signs, [0, 11.4, z + 0.16], 6, 1.2, null, { uv: signUv });
  batch.plane(m.signs, [0, 11.4, z - 0.16], 6, 1.2, [0, Math.PI, 0], { uv: signUv });
}

// ─── Monument ──────────────────────────────────────────────────────────────
function addLandmark(batch, m, city, trackMeters, side) {
  const z = toZ(trackMeters);
  const x = side * 27;
  const style = city.style;
  if (style === 'paris') {
    const metal = m.darkMetal;
    for (const [lx, lz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
      batch.box(metal, [x + lx * 0.85, 7, z + lz * 0.85], [0.7, 14, 0.7], [lz > 0 ? -0.14 : 0.14, 0, lx > 0 ? 0.14 : -0.14]);
    }
    batch.box(metal, [x, 8.2, z], [7.6, 0.8, 7.6]);
    batch.box(metal, [x, 14.4, z], [4.4, 0.7, 4.4]);
    batch.box(metal, [x, 19.5, z], [1.6, 11, 1.6]);
    batch.cone(metal, [x, 26.5, z], 0.9, 3.5, 4);
    batch.box(metal, [x, 29.4, z], [0.14, 2.6, 0.14]);
    for (let y = 2; y < 25; y += 2.2) {
      const spread = 3.6 - y * 0.12;
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) batch.box(m.neonWarm, [x + sx * spread, y, z + sz * spread], [0.18, 0.18, 0.18]);
    }
    batch.box(m.lampGlow, [x, 30.6, z], [0.4, 0.3, 0.4]);
    return;
  }
  if (style === 'london') {
    batch.box(m.stone, [x, 11, z], [4.4, 22, 4.4]);
    for (let level = 1; level < 6; level += 1) for (const face of [-1, 1]) batch.box(m.neonWarm, [x - side * 2.22, level * 3.2, z + face * 0.9], [0.05, 1.3, 0.5]);
    batch.box(m.stone, [x, 22.6, z], [5.2, 1.2, 5.2]);
    batch.cylinder(m.lampGlow, [x - side * 2.62, 20.2, z], 1.3, 1.3, 0.1, 20, [0, 0, Math.PI / 2]);
    batch.torus(m.darkMetal, [x - side * 2.68, 20.2, z], 1.35, 0.1, 6, 24, [0, Math.PI / 2, 0]);
    batch.box(m.darkMetal, [x - side * 2.72, 20.5, z], [0.04, 0.9, 0.1]);
    batch.box(m.darkMetal, [x - side * 2.72, 20.2, z + 0.4], [0.04, 0.1, 0.9]);
    batch.cone(m.roof, [x, 25.6, z], 3.4, 5, 4, [0, Math.PI / 4, 0]);
    batch.box(m.chrome, [x, 29.2, z], [0.2, 2.6, 0.2]);
    batch.box(m.neonWarm, [x, 30.6, z], [0.4, 0.4, 0.4]);
    return;
  }
  if (style === 'new-york') {
    batch.box(m.stone, [x, 14, z], [7, 28, 6.4]);
    for (let step = 0; step < 4; step += 1) batch.box(m.stone, [x, 28 + step * 2.4 + 1.2, z], [7 - step * 1.3, 2.4, 6.4 - step * 1.2]);
    batch.cylinder(m.metal, [x, 42.5, z], 0.12, 0.3, 9, 6);
    batch.box(m.neon, [x, 47.4, z], [0.4, 0.4, 0.4]);
    for (let level = 1; level < 12; level += 1) {
      for (const dx of [-2.2, 0, 2.2]) batch.box(level % 3 ? m.neonWarm : m.glassDark, [x - side * 3.52, level * 2.3, z + dx], [0.05, 1.0, 0.9]);
    }
    for (const [tx, tz] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) batch.box(m.neonSecondary, [x + tx, 36.6, z + tz], [0.3, 0.3, 0.3]);
    return;
  }
  if (style === 'tokyo') {
    // Tokyo Tower : treillis rouge et blanc.
    const red = m.red;
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      batch.box(red, [x + lx * 3.2, 7, z + lz * 3.2], [0.6, 14, 0.6], [lz > 0 ? -0.2 : 0.2, 0, lx > 0 ? 0.2 : -0.2]);
      batch.box(red, [x + lx * 1.5, 19, z + lz * 1.5], [0.5, 10, 0.5], [lz > 0 ? -0.08 : 0.08, 0, lx > 0 ? 0.08 : -0.08]);
    }
    batch.box(m.white, [x, 13.5, z], [4.6, 1.6, 4.6]);
    batch.box(m.white, [x, 23.5, z], [2.6, 1.2, 2.6]);
    batch.box(red, [x, 28, z], [1.0, 8, 1.0]);
    batch.box(m.white, [x, 33, z], [0.3, 2, 0.3]);
    for (let y = 3; y < 30; y += 3) {
      const spread = 3.4 - y * 0.09;
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) batch.box(m.neonWarm, [x + sx * spread, y, z + sz * spread], [0.22, 0.22, 0.22]);
    }
    batch.box(m.neonSecondary, [x, 34.3, z], [0.5, 0.5, 0.5]);
    return;
  }
  // Vice City : tour art déco à flèche néon.
  batch.box(m.cream, [x, 10, z], [7, 20, 7]);
  batch.box(m.cream, [x, 23, z], [5, 6, 5]);
  batch.box(m.cream, [x, 28.5, z], [3, 5, 3]);
  batch.box(m.cream, [x, 33, z], [1.2, 4, 1.2]);
  batch.cone(m.neon, [x, 36.5, z], 0.6, 3, 4);
  for (const level of [6, 12, 18, 25.5, 30.5]) batch.box(level > 20 ? m.neonSecondary : m.neon, [x, level, z], [level > 25 ? 3.3 : level > 20 ? 5.3 : 7.3, 0.14, level > 25 ? 3.3 : level > 20 ? 5.3 : 7.3]);
  for (let level = 1; level < 9; level += 1) for (const dx of [-2, 0, 2]) batch.box(m.neonWarm, [x - side * 3.52, level * 2.2, z + dx], [0.05, 0.9, 0.8]);
}

// ─── Enseignes partagées de la ville ───────────────────────────────────────
function buildSignAtlases(city, theme) {
  const signAtlas = new SignAtlas({ cellWidth: 256, cellHeight: 128, columns: 4 });
  const signTexts = [...city.signs, theme.gantryText, 'LET’S PLAY'];
  const signIndexes = signTexts.map((text, index) => signAtlas.add({ text, color: index % 2 ? city.secondary : city.accent, draw: drawNeonSignCell }));
  const gateIndex = signAtlas.add({ text: theme.gate.text, color: city.accent, textColor: '#fff6e8', draw: drawNeonSignCell });
  const posterIndex = signAtlas.add({ text: 'BAL 1986', color: city.secondary, background: '#2a1f33', draw: drawNeonSignCell });
  // Enseigne des tremis et chevrons des voies murées, dans le même atlas.
  const tunnelIndex = signAtlas.add({
    text: theme.tunnelText || `${theme.gantryText} TUNNEL`,
    color: city.accent,
    textColor: '#fff6e8',
    draw: drawNeonSignCell,
  });
  const chevronIndex = signAtlas.add({ color: theme.edgeColor || '#ffd24a', draw: drawChevronCell });
  const verticalAtlas = new SignAtlas({ cellWidth: 96, cellHeight: 384, columns: 6 });
  const verticalIndexes = theme.verticalSigns.map((text, index) => verticalAtlas.add({
    text,
    vertical: true,
    color: [city.accent, city.secondary, '#ffe08a', '#ffffff'][index % 4],
    draw: drawNeonSignCell,
  }));
  const signTexture = signAtlas.build();
  const verticalTexture = verticalAtlas.build();
  return {
    signsMaterial: new THREE.MeshBasicMaterial({ map: signTexture, toneMapped: false }),
    verticalMaterial: new THREE.MeshBasicMaterial({ map: verticalTexture, toneMapped: false }),
    signUv: (index) => signAtlas.uvFor(signIndexes[index % signIndexes.length]),
    signCount: signIndexes.length,
    verticalUv: (index) => verticalAtlas.uvFor(verticalIndexes[index % verticalIndexes.length]),
    verticalCount: verticalIndexes.length,
    gateUv: signAtlas.uvFor(gateIndex),
    posterUv: signAtlas.uvFor(posterIndex),
    tunnelUv: signAtlas.uvFor(tunnelIndex),
    chevronUv: signAtlas.uvFor(chevronIndex),
  };
}

// Damier de chevrons des voies murées : lisibles à vitesse, dans l'esprit des
// panneaux de chantier (bandes obliques sur fond sombre).
function drawChevronCell(ctx, width, height, entry) {
  const accent = entry.color || '#ffd24a';
  ctx.fillStyle = '#14161f';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(9, height * 0.17);
  const step = Math.max(22, height * 0.32);
  for (let x = -height; x < width + height; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x + height, 0);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(0, 0, 0, .5)';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, width - 6, height - 6);
}

// ─── Accessoires animés (un exemplaire chacun, replacés chaque frame) ──────
function makeSteamVent(trackMeters, lane) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0xcfd8e6, transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false });
  const puffs = [];
  for (let index = 0; index < 4; index += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.5, 7, 5), material.clone());
    puff.userData.phase = index / 4;
    group.add(puff);
    puffs.push(puff);
  }
  const grate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 1.0), new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.9, flatShading: true }));
  group.add(grate);
  group.position.x = lane;
  return {
    group,
    trackPos: trackMeters,
    update(dt, elapsed) {
      puffs.forEach((puff) => {
        const life = (elapsed * 0.45 + puff.userData.phase) % 1;
        puff.position.set(Math.sin(life * 6 + puff.userData.phase * 9) * 0.3, 0.3 + life * 3.2, Math.cos(life * 5) * 0.2 + life * 1.2);
        puff.scale.setScalar(0.5 + life * 1.6);
        puff.material.opacity = (1 - life) * 0.26;
      });
    },
  };
}

function makeLanternString(trackMeters, m) {
  const group = new THREE.Group();
  // Cordes à 7,9 m : les lampions (point bas ≈ 7 m) passent au-dessus de la caméra.
  const rope = new THREE.Mesh(new THREE.BoxGeometry(17.6, 0.04, 0.04), m.darkMetal);
  rope.position.y = 7.9;
  group.add(rope);
  const lanterns = [];
  for (let index = 0; index < 7; index += 1) {
    const pivot = new THREE.Group();
    pivot.position.set(-7.5 + index * 2.5, 7.9, 0);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.7, 8), m.lantern);
    lantern.position.y = -0.55;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.32, 0.12, 8), m.darkMetal);
    cap.position.y = -0.14;
    pivot.add(lantern, cap);
    pivot.userData.phase = index * 0.9;
    group.add(pivot);
    lanterns.push(pivot);
  }
  return {
    group,
    trackPos: trackMeters,
    update(dt, elapsed) {
      lanterns.forEach((pivot) => { pivot.rotation.z = Math.sin(elapsed * 1.7 + pivot.userData.phase) * 0.18; });
    },
  };
}

function makeStringLights(trackMeters, colorA, colorB) {
  const group = new THREE.Group();
  const bulbs = [];
  const materialA = new THREE.MeshBasicMaterial({ color: colorA, toneMapped: false });
  const materialB = new THREE.MeshBasicMaterial({ color: colorB, toneMapped: false });
  const wire = new THREE.Mesh(new THREE.BoxGeometry(18, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0x222634 }));
  wire.position.y = 7.8;
  group.add(wire);
  for (let index = 0; index < 15; index += 1) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), index % 2 ? materialA : materialB);
    const t = index / 14;
    bulb.position.set(-8.6 + t * 17.2, 7.8 - Math.sin(t * Math.PI) * 0.7 - 0.12, 0);
    group.add(bulb);
    bulbs.push(bulb);
  }
  return {
    group,
    trackPos: trackMeters,
    update(dt, elapsed) {
      const step = Math.floor(elapsed * 3) % 2;
      bulbs.forEach((bulb, index) => { bulb.scale.setScalar(index % 2 === step ? 1.35 : 0.85); });
    },
  };
}

function makeFlickerSign(trackMeters, side, uv, material, random) {
  const group = new THREE.Group();
  const flickerMaterial = material.clone();
  flickerMaterial.transparent = true;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.8), flickerMaterial);
  const uvAttribute = sign.geometry.attributes.uv;
  for (let index = 0; index < uvAttribute.count; index += 1) {
    uvAttribute.setXY(index, uv[0] + uvAttribute.getX(index) * (uv[2] - uv[0]), uv[1] + uvAttribute.getY(index) * (uv[3] - uv[1]));
  }
  sign.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  sign.position.set(side * (SIDEWALK_OUTER - 0.3), 5.2, 0);
  group.add(sign);
  const seed = random() * 10;
  return {
    group,
    trackPos: trackMeters,
    update(dt, elapsed) {
      const flicker = Math.sin(elapsed * 23 + seed) * Math.sin(elapsed * 7.3 + seed * 2) > 0.86 ? 0.25 : 1;
      flickerMaterial.opacity = flicker;
    },
  };
}

function makeTrafficLight(trackMeters, m) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 8, 6), m.metal);
  pole.position.set(7.4, 4.0, 0);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.12, 0.12), m.metal);
  arm.position.set(2.8, 7.7, 0);
  group.add(pole, arm);
  const lights = [];
  // Les feux pendent entre les voies (x ±2,1), hors de l'axe de la caméra.
  for (const x of [-2.1, 2.1]) {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.2, 0.4), m.darkMetal);
    housing.position.set(x, 7.0, 0);
    group.add(housing);
    const bulbs = [0xff3b3b, 0xffc23b, 0x3bff7a].map((color, index) => {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 5), new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true, opacity: 0.25 }));
      bulb.position.set(x, 7.36 - index * 0.36, 0.21);
      group.add(bulb);
      return bulb;
    });
    lights.push(bulbs);
  }
  return {
    group,
    trackPos: trackMeters,
    update(dt, elapsed) {
      const stage = Math.floor(elapsed / 3.2) % 3;
      lights.forEach((bulbs) => bulbs.forEach((bulb, index) => { bulb.material.opacity = index === stage ? 1 : 0.18; }));
    },
  };
}

// ─── Météo ─────────────────────────────────────────────────────────────────
export function makeRain(theme, cameraZ, lite = false) {
  if (theme.weather !== 'rain' && theme.weather !== 'drizzle') return null;
  const count = theme.weather === 'rain' ? (lite ? 360 : 720) : (lite ? 160 : 320);
  const drizzle = theme.weather === 'drizzle';
  const positions = new Float32Array(count * 6);
  const drops = [];
  for (let index = 0; index < count; index += 1) {
    drops.push({
      x: (Math.random() - 0.5) * 34,
      y: Math.random() * 18,
      z: cameraZ + 8 - Math.random() * 70,
      speed: drizzle ? 12 + Math.random() * 6 : 20 + Math.random() * 10,
      length: drizzle ? 0.35 + Math.random() * 0.3 : 0.7 + Math.random() * 0.6,
    });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: drizzle ? 0xa9c6ff : 0xc6d8f2, transparent: true, opacity: drizzle ? 0.22 : 0.34, fog: false });
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  return {
    object: lines,
    update(dt, worldTravel) {
      const array = geometry.attributes.position.array;
      drops.forEach((drop, index) => {
        drop.y -= drop.speed * dt;
        drop.z += worldTravel * 0.8;
        if (drop.y < 0) {
          drop.y = 16 + Math.random() * 4;
          drop.x = (Math.random() - 0.5) * 34;
          drop.z = cameraZ + 8 - Math.random() * 70;
        }
        if (drop.z > cameraZ + 10) drop.z -= 70;
        const base = index * 6;
        array[base] = drop.x;
        array[base + 1] = drop.y;
        array[base + 2] = drop.z;
        array[base + 3] = drop.x;
        array[base + 4] = drop.y + drop.length;
        array[base + 5] = drop.z - worldTravel * 0.5;
      });
      geometry.attributes.position.needsUpdate = true;
    },
  };
}

// ─── Tremis : tunnels courts et voies murées ───────────────────────────────
// Chaque tremis est une masse de pierre posée sur la boucle : deux parois, un
// plafond, deux bouches en portique, et — quand la chaussée se resserre — des
// parois pleines hauteur qui murent les voies fermées, balisées de chevrons et
// de cônes. L'intérieur est meublé de plafonniers et d'appliques ; la pénombre
// et le voile du fond de tunnel sont gérés par le monde (ViceCityWorld.jsx).
function buildTunnel(batch, m, atlas, tunnel) {
  const entryZ = toZ(tunnel.entry);
  const exitZ = toZ(tunnel.exit);
  const centerZ = (entryZ + exitZ) / 2;
  const depth = entryZ - exitZ;
  const half = CITY_RUSH_TUNNEL_HALF_WIDTH;
  const outer = CITY_RUSH_TUNNEL_OUTER_HALF;
  const height = CITY_RUSH_TUNNEL_HEIGHT;
  const top = CITY_RUSH_TUNNEL_TOP;
  const thickness = outer - half;
  const sideX = half + thickness / 2;

  // Parois, plafond, couronnement et aérations de toit.
  for (const side of [-1, 1]) {
    batch.box(m.tunnel, [side * sideX, height / 2, centerZ], [thickness, height, depth]);
    batch.box(m.cream, [side * (outer - 0.3), top + 0.35, centerZ], [0.6, 0.7, depth]);
  }
  batch.box(m.tunnel, [0, (height + top) / 2, centerZ], [outer * 2, top - height, depth]);
  for (const z of [entryZ - 0.25, exitZ + 0.25]) batch.box(m.cream, [0, top + 0.35, z], [outer * 2, 0.7, 0.5]);
  for (const offset of [-0.26, 0.26]) {
    const z = centerZ + offset * depth;
    batch.box(m.darkMetal, [0, top + 0.5, z], [3.4, 1.0, 2.4]);
    for (const x of [-1.2, 1.2]) batch.cylinder(m.metal, [x, top + 1.4, z], 0.16, 0.2, 1.8, 6);
  }

  // Bouches : piédroits, linteau, bandeau néon, et l'enseigne côté arrivée.
  for (const [z, dir] of [[entryZ, 1], [exitZ, -1]]) {
    for (const side of [-1, 1]) {
      batch.box(m.cream, [side * (half + 0.55), 4.7, z + dir * 0.35], [1.5, 9.4, 0.7]);
      batch.box(m.accentStandard, [side * (half - 0.02), 1.4, z + dir * 0.42], [0.18, 2.8, 0.1]);
    }
    batch.box(m.cream, [0, height + 0.75, z + dir * 0.35], [half * 2 + 1.8, 1.5, 0.7]);
    batch.box(m.neon, [0, height + 0.16, z + dir * 0.72], [half * 2, 0.26, 0.06]);
    if (dir < 0) {
      for (const x of [-5.9, 5.9]) {
        batch.box(m.darkMetal, [x, height + 0.9, z + dir * 0.58], [0.72, 0.5, 0.42]);
        batch.box(m.lampGlow, [x, height + 0.9, z + dir * 0.83], [0.44, 0.32, 0.08]);
      }
    }
  }
  // Enseigne de la ville posée sur le linteau (jamais devant la baie, sinon
  // elle pendrait dans l'ouverture) et deux lanternes à ses extrémités, qui
  // annoncent la voûte de loin.
  batch.plane(m.signs, [0, height + 0.9, entryZ + 0.74], Math.min(12.4, half * 2 - 1), 1.0, null, { uv: atlas.tunnelUv });
  for (const x of [-5.9, 5.9]) {
    batch.box(m.darkMetal, [x, height + 0.9, entryZ + 0.58], [0.72, 0.5, 0.42]);
    batch.box(m.lampGlow, [x, height + 0.9, entryZ + 0.83], [0.44, 0.32, 0.08]);
  }

  // Plafonniers et appliques : la voûte n'est pas un trou noir.
  for (let offset = 3.5; offset <= CITY_RUSH_TUNNEL_LENGTH - 3; offset += 6.5) {
    const z = toZ(tunnel.entry + offset);
    batch.box(m.darkMetal, [0, height - 0.06, z], [1.5, 0.12, 0.56]);
    batch.box(m.lampGlow, [0, height - 0.15, z], [1.15, 0.1, 0.42]);
  }
  for (let offset = 5; offset <= CITY_RUSH_TUNNEL_LENGTH - 4; offset += 9) {
    const z = toZ(tunnel.entry + offset);
    for (const side of [-1, 1]) {
      batch.box(m.darkMetal, [side * (half - 0.06), 4.62, z], [0.14, 0.5, 1.0]);
      batch.box(m.lampGlow, [side * (half - 0.16), 4.62, z], [0.06, 0.34, 0.82]);
    }
  }

  // Voies murées : une masse pleine hauteur par paquet de voies fermées
  // voisines, du bord de la chaussée jusqu'au bord du couloir resté ouvert.
  for (const wall of tunnel.walls) {
    const { centerX, width, outerX, corridor } = wall;
    batch.box(m.tunnel, [centerX, height / 2, centerZ], [width, height, depth]);
    // Ligne de guidage lumineuse le long du couloir.
    for (const y of [1.05, 4.9]) batch.box(m.neon, [outerX + corridor * 0.07, y, centerZ], [0.1, 0.14, depth - 0.5]);
    // Chevrons sur la face avant, face aux voitures qui arrivent.
    const boardWidth = Math.min(3.4, Math.max(1.6, width * 0.72));
    batch.plane(m.signs, [centerX, 3.9, entryZ + 0.06], boardWidth, 1.7, null, { uv: atlas.chevronUv });
    if (width > 4.4) batch.plane(m.signs, [centerX, 6.5, entryZ + 0.06], boardWidth, 1.7, null, { uv: atlas.chevronUv });
    // Cônes plantés devant la paroi : la voie murée est balisée.
    const coneX = outerX + corridor * 0.5;
    for (let index = 0; index < 4; index += 1) {
      batch.cone(m.accentStandard, [coneX, 0.34, toZ(tunnel.entry - 7 + index * 2.1)], 0.24, 0.68, 7);
    }
  }
}

function buildCityTunnels(batch, city, theme, m, atlas) {
  cityRushTunnels(city.id).forEach((tunnel) => buildTunnel(batch, m, atlas, tunnel));
}

/**
 * Construit le décor d'une boucle de 600 m et le renvoie avec les accessoires
 * animés. Les deux copies du groupe (tour courant et tour suivant) sont créées
 * après, par `finishLoopGeometry`.
 */
export function buildCityLoop({ city, theme, materials: m, batch, cityIndex, lite = false }) {
  const random = seededRandom(9001 + cityIndex * 7919);
  const atlas = buildSignAtlases(city, theme);
  m.signs = atlas.signsMaterial;
  m.verticalSigns = atlas.verticalMaterial;
  const dynamicProps = [];
  const landmarkSide = city.style === 'paris' || city.style === 'london' ? 1 : -1;
  // Les tremis avalent le trottoir : ni lampadaire, ni arbre, ni guirlande
  // dans leur emprise (la voûte les cacherait à moitié, et les cônes des
  // lampadaires brilleraient sous la pierre).
  const tunnels = cityRushTunnels(city.id);
  const nearTunnel = (trackMeters, margin = 4) => tunnels.some(
    (tunnel) => trackMeters > tunnel.entry - margin && trackMeters < tunnel.exit + margin,
  );

  for (const side of [-1, 1]) {
    let cursor = START_ZONE_HALF + 2;
    let sinceProp = 0;
    const end = LAP - START_ZONE_HALF - 2;
    while (cursor < end - 6) {
      const depthMeters = 9 + Math.floor(random() * 4) * 2.5;
      if (cursor + depthMeters > end) break;
      addBuilding(batch, m, city, theme, atlas, side, cursor + depthMeters / 2, depthMeters, random);
      const gap = 1.5 + random() * 2.5;
      const gapCenter = cursor + depthMeters + gap / 2;
      sinceProp += 1;
      if (sinceProp >= 2 && gapCenter < end - 4) {
        sinceProp = 0;
        addCityProp(batch, m, theme, city, side * 8.2, toZ(gapCenter), side, random, atlas);
      }
      cursor += depthMeters + gap;
    }
    // Rangée arrière, plus haute et plus espacée, sauf autour du monument.
    let backCursor = START_ZONE_HALF - 10;
    while (backCursor < LAP - START_ZONE_HALF + 4) {
      const depthMeters = 12 + Math.floor(random() * 4) * 3;
      const nearLandmark = side === landmarkSide && Math.abs(backCursor + depthMeters / 2 - LANDMARK_TRACK_POSITION) < 16;
      if (!nearLandmark && !lite) addBuilding(batch, m, city, theme, atlas, side, backCursor + depthMeters / 2, depthMeters, random, { back: true });
      backCursor += depthMeters + 2 + random() * 6;
    }
    // Lampadaires et arbres à intervalle régulier le long du trottoir.
    for (let position = START_ZONE_HALF + 8; position < LAP - START_ZONE_HALF - 4; position += 24) {
      const lampAt = position + (side > 0 ? 12 : 0);
      const treeAt = position + (side > 0 ? 0 : 12);
      if (!nearTunnel(lampAt, 14)) addLamp(batch, m, theme, side * 7.15, toZ(lampAt), side);
      if (!nearTunnel(treeAt, 14) && (city.style !== 'new-york' || random() < 0.6)) addTree(batch, m, theme, side * 8.8, toZ(treeAt), random);
    }
  }

  addGate(batch, m, city, theme, atlas, GATE_TRACK_POSITION);
  addLandmark(batch, m, city, LANDMARK_TRACK_POSITION, landmarkSide);
  buildCityTunnels(batch, city, theme, m, atlas);

  // Accessoires animés propres à chaque ville, jamais sous un tremis.
  const pushProp = (prop) => { if (!nearTunnel(prop.trackPos, 6)) dynamicProps.push(prop); };
  const flickerPositions = [LAP * 0.18, LAP * 0.41, LAP * 0.63, LAP * 0.86];
  flickerPositions.forEach((position, index) => {
    pushProp(makeFlickerSign(position, index % 2 ? 1 : -1, atlas.signUv(index), atlas.signsMaterial, random));
  });
  if (city.style === 'new-york') {
    [makeSteamVent(LAP * 0.22, -3.15), makeSteamVent(LAP * 0.57, 1.05), makeSteamVent(LAP * 0.81, 3.15)].forEach(pushProp);
    [makeTrafficLight(LAP * 0.36, m), makeTrafficLight(LAP * 0.72, m)].forEach(pushProp);
  } else if (city.style === 'tokyo') {
    [0.14, 0.31, 0.62, 0.78].forEach((fraction) => pushProp(makeLanternString(LAP * fraction, m)));
  } else if (city.style === 'paris') {
    [0.17, 0.38, 0.6, 0.83].forEach((fraction, index) => pushProp(makeStringLights(LAP * fraction, index % 2 ? 0xffd27a : 0xfff0c8, index % 2 ? 0xff9f7a : 0xffd27a)));
  } else if (city.style === 'vice') {
    [0.2, 0.68].forEach((fraction) => pushProp(makeStringLights(LAP * fraction, m.accent, m.secondary)));
  } else if (city.style === 'london') {
    pushProp(makeTrafficLight(LAP * 0.4, m));
  }

  return { dynamicProps, atlas, random };
}

export function finishLoopGeometry(batch, scene) {
  const copyA = batch.build('city-loop');
  const copyB = cloneBatchGroup(copyA);
  scene.add(copyA, copyB);
  return [copyA, copyB];
}
