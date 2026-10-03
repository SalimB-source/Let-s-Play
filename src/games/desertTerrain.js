import * as THREE from 'three';
import {
  DESERT_PALETTE,
  DESERT_PERIOD,
  DESERT_ROAD_EDGE,
  clamp01,
  smoothstep,
  srgbVector,
  terrainHeight,
  vnoise,
} from './desertShared.js';

/*
 * Dunes de l’Écho — le sable (une grille de terrain périodique en z + son shader) et le ciel.
 */

const P = DESERT_PERIOD;

// ── Terrain (un segment de DESERT_PERIOD m, cloné CHUNKS fois) ──────────
const DZ = 1.5;

function terrainColumns() {
  const side = [];
  let u = 0.9;
  let step = 0.9;
  while (u < 124) {
    side.push(DESERT_ROAD_EDGE + u);
    step = Math.min(step * 1.09, 9);
    u += step;
  }
  const centre = [-DESERT_ROAD_EDGE, -DESERT_ROAD_EDGE / 2, 0, DESERT_ROAD_EDGE / 2, DESERT_ROAD_EDGE];
  return [...side.map((v) => -v).reverse(), ...centre, ...side];
}

export function buildTerrainGeometry() {
  const xs = terrainColumns();
  const rows = P / DZ;
  const nx = xs.length;
  const count = nx * (rows + 1);
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const tint = new Float32Array(count);
  const occlusion = new Float32Array(count);
  const eps = 0.7;
  let v = 0;
  for (let j = 0; j <= rows; j += 1) {
    const z = -j * DZ;
    for (let i = 0; i < nx; i += 1) {
      const x = xs[i];
      const h = terrainHeight(x, z);
      position.set([x, h, z], v * 3);
      const hx = (terrainHeight(x + eps, z) - terrainHeight(x - eps, z)) / (2 * eps);
      const hz = (terrainHeight(x, z + eps) - terrainHeight(x, z - eps)) / (2 * eps);
      const len = Math.hypot(hx, 1, hz);
      normal.set([-hx / len, 1 / len, -hz / len], v * 3);
      // Creux plus sombres, crêtes plus claires : un faux « ambient occlusion » bon marché.
      const around = (terrainHeight(x + 4, z) + terrainHeight(x - 4, z) + terrainHeight(x, z + 4) + terrainHeight(x, z - 4)) / 4;
      occlusion[v] = clamp01(0.5 + (h - around) * 0.45);
      // Dérive lente de teinte : des zones plus rousses, d’autres plus dorées.
      tint[v] = smoothstep(0.3, 0.7, vnoise(x, z, 38, 2));
      v += 1;
    }
  }
  const index = new Uint32Array((nx - 1) * rows * 6);
  let k = 0;
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < nx - 1; i += 1) {
      const a = j * nx + i;
      const b = a + 1;
      const c = a + nx;
      const d = c + 1;
      index.set([a, b, c, b, d, c], k);
      k += 6;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));
  geometry.setAttribute('aOcc', new THREE.BufferAttribute(occlusion, 1));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  return geometry;
}

const TERRAIN_VERTEX = /* glsl */ `
  attribute float aTint;
  attribute float aOcc;
  varying vec3 vNormalW;
  varying vec3 vLocal;
  varying vec3 vWorld;
  varying float vTint;
  varying float vOcc;
  #include <fog_pars_vertex>
  void main() {
    vNormalW = normal;
    vLocal = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorld = worldPos.xyz;
    vTint = aTint;
    vOcc = aOcc;
    vec4 mvPosition = viewMatrix * worldPos;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

// Le soleil est droit devant, bas sur l’horizon : les pentes qui regardent la caméra sont
// à l’ombre (mauve), celles qui regardent le soleil sont dorées, et les crêtes s’embrasent.
// Les rides sont calculées dans le repère LOCAL du terrain, avec des fréquences en z multiples
// de 2π/96, pour défiler avec lui et se raccorder à chaque boucle.
const TERRAIN_FRAGMENT = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uDeep;
  uniform vec3 uShade;
  uniform vec3 uMid;
  uniform vec3 uLit;
  uniform vec3 uRim;
  uniform vec3 uTintB;
  uniform float uTime;
  uniform float uLite;
  varying vec3 vNormalW;
  varying vec3 vLocal;
  varying vec3 vWorld;
  varying float vTint;
  varying float vOcc;
  #include <fog_pars_fragment>
  void main() {
    vec3 N = normalize(vNormalW);
    vec3 toCam = cameraPosition - vWorld;
    float dist = length(toCam);
    vec3 V = toCam / dist;
    float fade = 1.0 - smoothstep(16.0, 62.0, dist);

    // Rides de vent : des bandes en travers de la piste (le vent souffle dans l'axe). Elles
    // accrochent le soleil bas, et défilent vers la caméra avec le sol : on « sent » la vitesse.
    // Fréquences en z multiples de 2π/96 (2,8798 = 44 périodes) pour se raccorder à chaque boucle.
    // Graphismes baissés (uLite = 1) : on saute les rides — une seule branche sur un
    // uniforme, donc aucun recalcul du shader quand le joueur bascule l'option.
    float ripple = 0.0;
    if (uLite < 0.5) {
      vec2 q = vLocal.xz;
      float phase = q.y * 2.8798 + q.x * 0.42
        + 1.6 * sin(q.y * 0.1309 + q.x * 0.09)
        + 0.9 * sin(q.x * 0.23 - q.y * 0.2618);
      // Les rides se concentrent par plaques (fréquences multiples de 2π/96 en z, là aussi).
      float zone = 0.45 + 0.55 * smoothstep(-0.4, 0.8, sin(q.x * 0.13 + q.y * 0.0654 + 1.3) + 0.5 * sin(q.x * 0.051 - q.y * 0.1309));
      ripple = sin(phase) * zone;
      vec2 rdir = normalize(vec2(0.42, 2.8798));
      N = normalize(N + vec3(rdir.x, 0.0, rdir.y) * ripple * 0.105 * fade * (0.35 + 0.65 * N.y));
    }

    float ndl = dot(N, uSunDir);
    float t = ndl * 0.5 + 0.5;
    vec3 col = mix(uDeep, uShade, smoothstep(0.20, 0.42, t));
    col = mix(col, uMid, smoothstep(0.42, 0.57, t));
    col = mix(col, uLit, smoothstep(0.58, 0.82, t));
    col *= 0.78 + 0.30 * (0.5 + 0.5 * N.y);
    col *= mix(0.70, 1.20, vOcc);
    col = mix(col, col * uTintB, vTint * 0.75);
    col *= 1.0 + 0.05 * ripple * fade;

    // Liseré de contre-jour sur les arêtes des dunes.
    float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.6);
    col += uRim * rim * 0.30 * smoothstep(-0.35, 0.25, ndl + 0.2);

    // Couleurs lues « telles quelles » à l’écran (comme le ciel) : pas de tone-mapping ici,
    // la brume (fog_fragment) fond ensuite le sable dans la couleur d’horizon.
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }
`;

export function makeTerrainMaterial() {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uSunDir: { value: new THREE.Vector3(0, 0.16, -0.987).normalize() },
      uTime: { value: 0 },
      uLite: { value: 0 },
      uDeep: { value: srgbVector(DESERT_PALETTE.sandDeep) },
      uShade: { value: srgbVector(DESERT_PALETTE.sandShade) },
      uMid: { value: srgbVector(DESERT_PALETTE.sandMid) },
      uLit: { value: srgbVector(DESERT_PALETTE.sandLit) },
      uRim: { value: srgbVector(DESERT_PALETTE.sandRim) },
      uTintB: { value: srgbVector(DESERT_PALETTE.sandTint) },
    }]),
    vertexShader: TERRAIN_VERTEX,
    fragmentShader: TERRAIN_FRAGMENT,
  });
}

// ── Ciel ─────────────────────────────────────────────────────────────────
// Même plan que le ciel partagé (240 × 120 à z = −95, « skyPoint.y » = hauteur au-dessus
// du bas du plan ; la ligne d’horizon de la caméra tombe vers 7,4), mais un dégradé
// resserré sur la bande de ciel réellement visible et un soleil posé juste au-dessus
// de la brume, qui s’y dissout.
const SKY_VERTEX = /* glsl */ `
  varying vec2 skyPoint;
  void main() {
    skyPoint = position.xy + vec2(0.0, 60.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uMotion;
  uniform float uLite;
  uniform float uSunH;
  uniform float uSunR;
  uniform vec3 uHorizon;
  uniform vec3 uCoral;
  uniform vec3 uViolet;
  uniform vec3 uDeep;
  uniform vec3 uSunLow;
  uniform vec3 uSunHigh;
  uniform vec3 uGlow;
  varying vec2 skyPoint;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
               mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float a = 0.5;
    float s = 0.0;
    for (int i = 0; i < 4; i++) {
      s += a * vnoise(p);
      p = p * 2.03 + vec2(17.1, 9.7);
      a *= 0.5;
    }
    return s;
  }

  void main() {
    vec2 p = skyPoint;
    float hh = p.y;
    float t = uTime * uMotion;

    // L’air chaud fait trembler tout ce qui touche l’horizon (le bas du soleil, les nuages).
    // (Graphismes baissés, uLite = 1 : ni vacillement ni nuages — le ciel reste un simple
    // dégradé avec son soleil, une branche sur un uniforme, sans recalcul du shader.)
    if (uLite < 0.5) {
      float haze = exp(-abs(hh - 7.6) * 0.32);
      p.x += (sin(hh * 2.4 + t * 1.6) * 0.30 + sin(hh * 5.3 - t * 2.4) * 0.12) * haze;
    }

    // Dégradé : brume dorée plate à l’horizon (= couleur du brouillard), puis corail, violet, nuit.
    vec3 col = uHorizon;
    col = mix(col, uCoral, smoothstep(8.0, 17.0, hh));
    col = mix(col, uViolet, smoothstep(15.0, 34.0, hh));
    col = mix(col, uDeep, smoothstep(30.0, 64.0, hh));

    // Nuages filés, éclairés par en dessous.
    if (uLite < 0.5) {
      vec2 cp = vec2(p.x * 0.045 + t * 0.012, hh * 0.20);
      float cloud = smoothstep(0.50, 0.80, fbm(cp)) * smoothstep(10.0, 17.0, hh) * (1.0 - smoothstep(38.0, 62.0, hh));
      vec3 cloudCol = mix(uViolet * 1.08, uGlow, exp(-(hh - 9.0) * 0.07));
      col = mix(col, cloudCol, cloud * 0.72);
    }

    // Soleil : rayons, traînée, halo, disque, puis fondu dans la brume du bas.
    vec2 sc = vec2(0.0, uSunH);
    float r = length(p - sc);
    float aboveHaze = smoothstep(7.0, 10.5, hh);

    // Autour du soleil (graphismes baissés, uLite = 1 : le ciel garde son halo et
    // son disque, sans les faisceaux) :
    //   · les rayons — de larges faisceaux qui s'ouvrent depuis le disque, battent
    //     lentement dans l'air chaud et s'éteignent en s'éloignant ;
    //   · la traînée — le soleil bas s'étale en travers du ciel, comme à travers un
    //     objectif ; c'est elle qui blanchit la brume au-dessus du mirage ;
    //   · le coup de chaleur au ras de l'horizon, là où le mirage se pose. Son pic
    //     est un peu AU-DESSUS de la ligne (hh ≈ 9,4) : la couture entre le sable
    //     et le ciel garde exactement la même couleur des deux côtés.
    if (uLite < 0.5) {
      float rayAngle = atan(p.y - uSunH, p.x * 1.35);
      float spokes = 0.5 + 0.5 * sin(rayAngle * 6.0 + sin(rayAngle * 2.3 - t * 0.19) * 1.7 + t * 0.11);
      // La borne à zéro : une base négative d'un cheveu donnerait un pow() indéfini.
      float rays = pow(max(spokes, 0.0), 2.8) * exp(-r * r / 2400.0) * aboveHaze;
      col = mix(col, uGlow, clamp(rays * 0.34, 0.0, 1.0));

      float streak = exp(-abs(hh - uSunH) * 0.42) * exp(-abs(p.x) * 0.0075);
      col = mix(col, uGlow, clamp(streak * 0.26, 0.0, 1.0));

      float heat = exp(-abs(hh - 9.4) * 0.45);
      col = mix(col, uGlow, clamp(heat * 0.16, 0.0, 1.0));
    }

    float halo = (exp(-r * r / 520.0) * 0.50 + exp(-r * r / 70.0) * 0.30) * aboveHaze;
    col = mix(col, uGlow, clamp(halo, 0.0, 1.0));
    float disc = (1.0 - smoothstep(uSunR - 0.3, uSunR, r)) * smoothstep(6.4, 10.2, hh);
    vec3 sunCol = mix(uSunLow, uSunHigh, clamp((hh - (uSunH - uSunR)) / (2.0 * uSunR), 0.0, 1.0));
    col = mix(col, sunCol, disc);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function makeDesertSky(reduceMotion = false) {
  const srgb = srgbVector; // pas de tone-mapping : la valeur hex est exactement celle affichée
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(240, 120), new THREE.ShaderMaterial({
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uMotion: { value: reduceMotion ? 0.2 : 1 },
      uLite: { value: 0 },
      uSunH: { value: 13.2 },
      uSunR: { value: 6.4 },
      uHorizon: { value: srgb(DESERT_PALETTE.horizon) },
      uCoral: { value: srgb(DESERT_PALETTE.coral) },
      uViolet: { value: srgb(DESERT_PALETTE.violet) },
      uDeep: { value: srgb(DESERT_PALETTE.deep) },
      uSunLow: { value: srgb(DESERT_PALETTE.sunLow) },
      uSunHigh: { value: srgb(DESERT_PALETTE.sunHigh) },
      uGlow: { value: srgb(DESERT_PALETTE.glow) },
    },
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
  }));
  mesh.position.set(0, 59.91, -95);
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  return mesh;
}

