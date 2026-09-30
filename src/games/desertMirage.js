import * as THREE from 'three';
import { TAU, mulberry32 } from './desertShared.js';

/*
 * Dunes de l’Écho — le mirage au bout de la piste (oasis, palais, lac), le voile d’eau sur les
 * dalles lointaines et le sable soulevé par le vent.
 */

// ── Le mirage ────────────────────────────────────────────────────────────
// Un quad vertical posé au fond de la vallée, sous le soleil : une oasis (palmiers, palais à
// dômes et minarets) posée sur un lac turquoise, avec son reflet. La ligne de rive coïncide avec
// la ligne d’horizon de la caméra (y = 7,3) ; le lac s’étend sous l’horizon et s’efface dans la
// brume avant d’atteindre le sol. Un shader le fait trembler, respirer et scintiller.
const MIRAGE_W = 80;
const MIRAGE_H = 20;
const MIRAGE_TEX_W = 1024;
const MIRAGE_TEX_H = 256;
const MIRAGE_BASE_PX = 112; // ligne de rive, en pixels depuis le haut de la texture
const MIRAGE_HORIZON_Y = 7.3;

function dome(g, cx, baseY, w, h) {
  g.beginPath();
  g.moveTo(cx - w / 2, baseY);
  g.bezierCurveTo(cx - w * 0.72, baseY - h * 0.2, cx - w * 0.35, baseY - h * 0.75, cx, baseY - h);
  g.bezierCurveTo(cx + w * 0.35, baseY - h * 0.75, cx + w * 0.72, baseY - h * 0.2, cx + w / 2, baseY);
  g.closePath();
  g.fill();
}

function minaret(g, cx, baseY, w, h) {
  g.fillRect(cx - w / 2, baseY - h, w, h);
  g.fillRect(cx - w * 0.95, baseY - h * 0.74, w * 1.9, Math.max(2, h * 0.05));
  g.fillRect(cx - w * 0.75, baseY - h * 0.42, w * 1.5, Math.max(2, h * 0.04));
  g.beginPath();
  g.moveTo(cx - w * 0.78, baseY - h);
  g.lineTo(cx, baseY - h - w * 2.3);
  g.lineTo(cx + w * 0.78, baseY - h);
  g.closePath();
  g.fill();
}

function frond(g, cx, cy, angle, length) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const p0 = [cx, cy];
  const p1 = [cx + dx * length * 0.62, cy + dy * length * 0.62 - length * 0.3];
  const p2 = [cx + dx * length, cy + dy * length * 0.6 + length * 0.28];
  const left = [];
  const right = [];
  const steps = 9;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const mt = 1 - t;
    const px = mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0];
    const py = mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1];
    const tx = 2 * mt * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
    const ty = 2 * mt * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
    const tl = Math.hypot(tx, ty) || 1;
    const w = length * 0.17 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.75);
    left.push([px - (ty / tl) * w, py + (tx / tl) * w]);
    right.push([px + (ty / tl) * w, py - (tx / tl) * w]);
  }
  g.beginPath();
  left.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  for (let i = right.length - 1; i >= 0; i -= 1) g.lineTo(right[i][0], right[i][1]);
  g.closePath();
  g.fill();
}

function palm(g, x, baseY, h, lean, rand) {
  const topX = x + lean;
  const topY = baseY - h;
  g.fillStyle = '#0b3a42';
  g.beginPath();
  g.moveTo(x - 2.8, baseY);
  g.quadraticCurveTo(x + lean * 0.1 - 2.2, baseY - h * 0.55, topX - 1.4, topY);
  g.lineTo(topX + 1.4, topY);
  g.quadraticCurveTo(x + lean * 0.1 + 2.2, baseY - h * 0.55, x + 2.8, baseY);
  g.closePath();
  g.fill();
  const fronds = 8;
  for (let i = 0; i < fronds; i += 1) {
    const angle = -Math.PI * 0.98 + (i / (fronds - 1)) * Math.PI * 0.96;
    const length = h * (0.5 + rand() * 0.14);
    g.fillStyle = i % 2 ? '#0e5054' : '#127066';
    frond(g, topX, topY, angle, length);
  }
  g.fillStyle = '#0b3a42';
  g.beginPath();
  g.arc(topX, topY + 1, 3.2, 0, TAU);
  g.fill();
}

function paintMirage(canvas) {
  const W = canvas.width;
  const H = canvas.height;
  const B = MIRAGE_BASE_PX;
  const g = canvas.getContext('2d');
  const rand = mulberry32(77);
  const layer = () => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    return c;
  };
  const cx = W / 2;

  // ── La vision, au-dessus de la rive (dessinée à part pour pouvoir la refléter) ──
  const vision = layer();
  const v = vision.getContext('2d');

  v.save();
  v.translate(cx, B - 34);
  v.scale(1, 0.34);
  const halo = v.createRadialGradient(0, 0, 8, 0, 0, 330);
  halo.addColorStop(0, 'rgba(255, 246, 222, 0.62)');
  halo.addColorStop(0.5, 'rgba(255, 228, 190, 0.22)');
  halo.addColorStop(1, 'rgba(255, 228, 190, 0)');
  v.fillStyle = halo;
  v.fillRect(-330, -330, 660, 660);
  v.restore();

  // Skyline lointain, pâle et brumeux.
  v.fillStyle = 'rgba(255, 216, 186, 0.46)';
  for (let x = 92; x < W - 92;) {
    const w = 22 + rand() * 40;
    const h = 8 + rand() * 18 + (Math.abs(x - cx) < 210 ? 8 : 0);
    v.fillRect(x, B - h, w, h);
    if (rand() < 0.35) dome(v, x + w / 2, B - h, Math.min(w, 34), 14 + rand() * 8);
    if (rand() < 0.14) minaret(v, x + w * 0.5, B - h, 4.5, 24 + rand() * 18);
    x += w + 1 + rand() * 5;
  }

  // Le palais : terrasse, corps, tambour, grand dôme, dômes latéraux, minarets.
  const body = v.createLinearGradient(0, B - 88, 0, B);
  body.addColorStop(0, '#eea6a8');
  body.addColorStop(0.42, '#c4668f');
  body.addColorStop(1, '#75458a');
  v.fillStyle = body;
  v.fillRect(cx - 150, B - 10, 300, 10);
  v.fillRect(cx - 112, B - 34, 224, 26);
  v.fillRect(cx - 38, B - 50, 76, 18);
  dome(v, cx, B - 50, 76, 34);
  v.fillRect(cx - 1.4, B - 50 - 34 - 12, 2.8, 12);
  dome(v, cx - 86, B - 34, 40, 20);
  dome(v, cx + 86, B - 34, 40, 20);
  const tower = v.createLinearGradient(0, B - 100, 0, B - 10);
  tower.addColorStop(0, '#d4789a');
  tower.addColorStop(1, '#7c4a8c');
  v.fillStyle = tower;
  minaret(v, cx - 132, B - 10, 11, 64);
  minaret(v, cx + 132, B - 10, 11, 64);
  v.fillStyle = body;
  // croissant du grand dôme
  v.beginPath();
  v.arc(cx, B - 50 - 34 - 16, 4.2, 0, TAU);
  v.fill();
  v.globalCompositeOperation = 'destination-out';
  v.beginPath();
  v.arc(cx + 2, B - 50 - 34 - 17, 3.6, 0, TAU);
  v.fill();
  v.globalCompositeOperation = 'source-over';

  // Arcades sombres éclairées de l’intérieur, et fenêtres.
  for (let i = -4; i <= 4; i += 1) {
    const ax = cx + i * 24;
    const glowGradient = v.createLinearGradient(0, B - 30, 0, B - 8);
    glowGradient.addColorStop(0, '#7a3b63');
    glowGradient.addColorStop(1, '#ffd98a');
    v.fillStyle = glowGradient;
    v.beginPath();
    v.moveTo(ax - 6, B - 8);
    v.lineTo(ax - 6, B - 22);
    v.quadraticCurveTo(ax, B - 32, ax + 6, B - 22);
    v.lineTo(ax + 6, B - 8);
    v.closePath();
    v.fill();
  }
  v.fillStyle = '#ffe9a6';
  [[-132, 44], [132, 44], [-132, 28], [132, 28], [0, 40], [-20, 40], [20, 40]].forEach(([wx, wy]) => v.fillRect(cx + wx - 1.5, B - wy, 3, 5));

  // Palmiers sombres de chaque côté, penchés vers l’extérieur.
  [[148, 66, -10], [196, 52, -8], [246, 70, -12], [304, 46, -6], [352, 58, -9]].forEach(([x, h, lean]) => palm(v, x, B, h, lean, rand));
  [[672, 56, 8], [724, 72, 12], [786, 48, 6], [846, 64, 10], [900, 50, 8]].forEach(([x, h, lean]) => palm(v, x, B, h, lean, rand));

  // Broussailles au ras de l’eau.
  for (let x = 92; x < W - 92; x += 5 + rand() * 9) {
    v.fillStyle = rand() < 0.5 ? '#0b3a42' : '#14625c';
    v.beginPath();
    v.ellipse(x, B, 5 + rand() * 9, 3 + rand() * 6, 0, Math.PI, TAU);
    v.fill();
  }

  // ── Le lac : dégradé turquoise qui s’évanouit vers le sol ──
  const water = g.createLinearGradient(0, B, 0, B + 104);
  water.addColorStop(0, 'rgba(178, 255, 246, 0.96)');
  water.addColorStop(0.14, 'rgba(92, 230, 224, 0.92)');
  water.addColorStop(0.52, 'rgba(26, 166, 190, 0.74)');
  water.addColorStop(1, 'rgba(16, 120, 168, 0)');
  g.fillStyle = water;
  g.fillRect(70, B, W - 140, H - B);

  // Reflet : la vision retournée, teintée turquoise, qui se dissout en profondeur.
  const reflection = layer();
  const r = reflection.getContext('2d');
  r.save();
  r.translate(0, 2 * B);
  r.scale(1, -1);
  r.drawImage(vision, 0, 0);
  r.restore();
  r.globalCompositeOperation = 'source-atop';
  r.fillStyle = 'rgba(28, 196, 210, 0.36)';
  r.fillRect(0, 0, W, H);
  r.globalCompositeOperation = 'destination-in';
  const fade = r.createLinearGradient(0, B, 0, B + 100);
  fade.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
  fade.addColorStop(0.65, 'rgba(0, 0, 0, 0.3)');
  fade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  r.fillStyle = fade;
  r.fillRect(0, B, W, H - B);
  g.drawImage(reflection, 0, 0);

  // Traînées de lumière sur l’eau.
  for (let i = 0; i < 190; i += 1) {
    const y = B + 2 + Math.pow(rand(), 1.5) * 98;
    const w = 12 + rand() * 90;
    const x = 110 + rand() * (W - 220 - w);
    g.fillStyle = rand() < 0.78 ? `rgba(236, 255, 255, ${0.12 + rand() * 0.4})` : `rgba(8, 84, 120, ${0.14 + rand() * 0.16})`;
    g.fillRect(x, y, w, 1 + (rand() < 0.2 ? 1 : 0));
  }
  const shore = g.createLinearGradient(70, 0, W - 70, 0);
  shore.addColorStop(0, 'rgba(255, 255, 255, 0)');
  shore.addColorStop(0.2, 'rgba(255, 255, 255, 0.5)');
  shore.addColorStop(0.8, 'rgba(255, 255, 255, 0.5)');
  shore.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = shore;
  g.fillRect(70, B - 1, W - 140, 3);

  g.drawImage(vision, 0, 0);
}

const MIRAGE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const MIRAGE_FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  uniform float uTime;
  uniform float uAmount;
  uniform float uBase;
  uniform float uMotion;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    float t = uTime * uMotion;
    vec2 uv = vUv;
    float d = uv.y - uBase;
    float nearShore = exp(-abs(d) * 9.0);
    float inWater = 1.0 - smoothstep(-0.02, 0.03, d);

    // Air chaud : un léger ondoiement de la vision (à peine perceptible en altitude), plus marqué
    // à la rive, et franchement liquide dans le reflet.
    float slow = sin(uv.y * 34.0 - t * 1.5 + uv.x * 5.0) * 0.0020 + sin(uv.y * 71.0 + t * 1.9) * 0.0012;
    float ripple = sin(uv.y * 150.0 - t * 2.8) * 0.0035 + sin(uv.y * 58.0 + t * 1.6 + uv.x * 9.0) * 0.0040;
    uv.x += slow * (0.3 + 0.8 * nearShore) + ripple * inWater;
    uv.y += sin(uv.x * 30.0 + t * 1.1) * 0.0018 * nearShore;

    vec4 tex = texture2D(map, uv);
    vec3 col = tex.a > 0.001 ? tex.rgb / tex.a : vec3(0.0);

    // Éclats du soleil sur le lac : des traînées horizontales douces, dans l'axe du soleil.
    float column = exp(-pow((vUv.x - 0.5) * 7.0, 2.0));
    float glint = vnoise(vec2(vUv.x * 46.0 + t * 0.35, vUv.y * 210.0 - t * 0.8));
    glint = smoothstep(0.66, 0.92, glint) * smoothstep(0.42, 0.6, vnoise(vec2(vUv.x * 9.0 - t * 0.2, vUv.y * 24.0 + t * 0.5)));
    col += vec3(1.0, 0.9, 0.62) * column * glint * inWater * 0.5;

    // Fondu sur les bords + respiration lente : la vision apparaît, vacille, s’éclaircit.
    float edgeX = smoothstep(0.0, 0.16, vUv.x) * (1.0 - smoothstep(0.84, 1.0, vUv.x));
    float edgeTop = 1.0 - smoothstep(0.88, 1.0, vUv.y);
    float breathe = 0.88 + 0.12 * sin(t * 0.7 + 1.3) * sin(t * 0.31 + 0.4);
    float a = tex.a * edgeX * edgeTop * uAmount * breathe;
    gl_FragColor = vec4(col, a);
  }
`;

export function makeMirage(reduceMotion) {
  const canvas = document.createElement('canvas');
  canvas.width = MIRAGE_TEX_W;
  canvas.height = MIRAGE_TEX_H;
  paintMirage(canvas);
  const texture = new THREE.CanvasTexture(canvas);
  texture.premultiplyAlpha = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: {
      map: { value: texture },
      uTime: { value: 0 },
      uAmount: { value: 0.8 },
      uBase: { value: 1 - MIRAGE_BASE_PX / MIRAGE_TEX_H },
      uMotion: { value: reduceMotion ? 0.25 : 1 },
    },
    vertexShader: MIRAGE_VERTEX,
    fragmentShader: MIRAGE_FRAGMENT,
  });
  const geometry = new THREE.PlaneGeometry(MIRAGE_W, MIRAGE_H);
  // L’origine de la géométrie est ramenée sur la rive (haut de la texture + MIRAGE_BASE_PX) :
  // poser le mesh à la hauteur de l’horizon de la caméra garde la rive pile dessus, et
  // l’agrandir fait « grandir » le mirage depuis l’horizon, sans qu’il décolle.
  geometry.translate(0, (MIRAGE_BASE_PX / MIRAGE_TEX_H - 0.5) * MIRAGE_H, 0);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, MIRAGE_HORIZON_Y, -90);
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  return { mesh, material, texture };
}

// ── Le lac sur la piste ──────────────────────────────────────────────────
// Comme sur une route brûlante : au loin la piste « mouille » et reflète le ciel. Un voile
// translucide posé à plat au-dessus des dalles, invisible de près, de plus en plus présent vers
// l’horizon, que les obstacles (opaques, donc devant lui) traversent sans perdre en lisibilité.
const SHEEN_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uAmount;
  uniform float uMotion;
  varying vec2 vUv;
  void main() {
    float t = uTime * uMotion;
    float far = smoothstep(0.05, 0.62, vUv.y);
    float across = abs(vUv.x - 0.5) * 2.0;
    float edge = 1.0 - smoothstep(0.35, 1.0, across);
    float band = sin(vUv.y * 95.0 + sin(vUv.x * 11.0 + t * 0.9) * 1.6 - t * 1.4);
    float streak = smoothstep(0.35, 1.0, band);
    float fine = smoothstep(0.6, 1.0, sin(vUv.y * 310.0 + vUv.x * 40.0 + t * 2.2));
    vec3 aqua = vec3(0.33, 0.88, 0.86);
    vec3 sky = vec3(1.0, 0.86, 0.62);
    vec3 col = mix(aqua, sky, streak * 0.55 + fine * 0.3);
    float a = far * edge * (0.34 + 0.46 * streak + 0.18 * fine) * uAmount;
    gl_FragColor = vec4(col, a);
  }
`;

export function makeSheen(reduceMotion) {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: { uTime: { value: 0 }, uAmount: { value: 0.6 }, uMotion: { value: reduceMotion ? 0.25 : 1 } },
    vertexShader: MIRAGE_VERTEX,
    fragmentShader: SHEEN_FRAGMENT,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(22, 64), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0.03, -62);
  mesh.renderOrder = 2;
  mesh.frustumCulled = false;
  return { mesh, material };
}

// ── Sable soulevé par le vent ────────────────────────────────────────────
const DUST_COUNT = 240;
const DUST_DEPTH = 82;

const DUST_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform float uPx;
  attribute vec4 aSeed;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.z = -74.0 + mod(position.z + 74.0 + uScroll * (0.9 + 0.25 * aSeed.y), ${DUST_DEPTH.toFixed(1)});
    p.x = mod(position.x + uTime * (2.2 + 2.6 * aSeed.x) + 46.0, 92.0) - 46.0;
    p.y += sin(uTime * 1.3 + aSeed.x * 6.283) * 0.22;
    vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = clamp(aSeed.z * uPx / depth, 1.0, 16.0);
    vAlpha = aSeed.w * smoothstep(3.0, 10.0, depth) * (1.0 - smoothstep(36.0, 72.0, depth)) * (1.0 - smoothstep(34.0, 46.0, abs(p.x)));
  }
`;

const DUST_FRAGMENT = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = 1.0 - smoothstep(0.0, 1.0, d);
    gl_FragColor = vec4(1.0, 0.86, 0.66, a * a * vAlpha);
  }
`;

export function makeDust() {
  const rand = mulberry32(4242);
  const position = new Float32Array(DUST_COUNT * 3);
  const seed = new Float32Array(DUST_COUNT * 4);
  for (let i = 0; i < DUST_COUNT; i += 1) {
    const side = rand() < 0.5 ? -1 : 1;
    // surtout sur les côtés et au ras des dunes ; quelques grains au-dessus de la piste
    const x = rand() < 0.12 ? (rand() - 0.5) * 9 : side * (5 + rand() * 40);
    position.set([x, 0.2 + Math.pow(rand(), 1.6) * 5.5, -74 + rand() * DUST_DEPTH], i * 3);
    seed.set([rand(), rand(), 0.07 + rand() * 0.11, 0.25 + rand() * 0.4], i * 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: { uTime: { value: 0 }, uScroll: { value: 0 }, uPx: { value: 600 } },
    vertexShader: DUST_VERTEX,
    fragmentShader: DUST_FRAGMENT,
  });
  const points = new THREE.Points(geometry, material);
  points.renderOrder = 3;
  points.frustumCulled = false;
  return { points, geometry, material };
}

