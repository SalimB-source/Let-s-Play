// ════════════════════════════════════════════════════════════════════
// Vue cockpit de Vice City Rush : la course vue de la place du pilote.
//
// La caméra de poursuite reste la vue par défaut ; la touche C (ou le bouton
// « COCKPIT » de la barre, l'entrée CAMÉRA du menu Options ou de l'écran de
// pause) bascule sur la vue de l'intérieur de la voiture. Le monde 3D (`ViceCityWorld`) garde toute la
// course : ce module ne fournit que
//   · les règles pures — mode de caméra, cotes de l'habitacle, régime moteur —
//     vérifiées par `tests/city-rush-cockpit.test.js` ;
//   · l'habitacle three.js de la voiture du joueur : planche de bord, combiné
//     d'instruments à aiguilles, volant qui braque (contre-braquage du drift
//     compris), montants, pavillon, portières, rétroviseurs et essuie-glaces ;
//   · l'échange de visibilité : en vue cockpit, la coque fermée et ses détails
//     s'effacent au profit du **vrai capot** (la coque coupée au pied du
//     pare-brise, `makeRacerHoodGeometry`) et de l'habitacle. Une doublure de
//     la coque entière continue de porter l'ombre de la voiture sur la route.
//
// Les cotes viennent de la carrosserie de chaque modèle
// (`cityRushCabinMetrics`) : le pied du pare-brise fixe la planche de bord,
// et le capot vu de l'intérieur raccorde exactement avec elle. Le pilote est à
// gauche, sauf là où l'on roule à gauche et au Japon (Londres, Shuto de
// Tokyo, mont Haruna) : le volant passe à droite.
// ════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { createBatch, makeCanvasTexture } from './cityRushBuilder.js';
import { cityRushCabinMetrics, makeRacerHoodGeometry } from './cityRushRacerModels.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, amount) => a + (b - a) * amount;

// ── Mode de caméra ──────────────────────────────────────────────────────────
export const CITY_RUSH_CAMERA_CHASE = 'chase';
export const CITY_RUSH_CAMERA_COCKPIT = 'cockpit';
export const CITY_RUSH_CAMERA_MODES = Object.freeze([CITY_RUSH_CAMERA_CHASE, CITY_RUSH_CAMERA_COCKPIT]);
export const CITY_RUSH_DEFAULT_CAMERA_MODE = CITY_RUSH_CAMERA_CHASE;
// Préférence de l'appareil, comme le son : rien n'est lié au compte.
export const CITY_RUSH_CAMERA_PREF_KEY = 'letsplay_vice_city_rush_camera_v1';

/** Toute valeur inconnue (préférence corrompue, ancienne version) retombe sur la poursuite. */
export function normalizeCityRushCameraMode(mode) {
  return mode === CITY_RUSH_CAMERA_COCKPIT ? CITY_RUSH_CAMERA_COCKPIT : CITY_RUSH_CAMERA_CHASE;
}

export function nextCityRushCameraMode(mode) {
  return normalizeCityRushCameraMode(mode) === CITY_RUSH_CAMERA_COCKPIT
    ? CITY_RUSH_CAMERA_CHASE
    : CITY_RUSH_CAMERA_COCKPIT;
}

export function cityRushCameraModeLabel(mode) {
  return normalizeCityRushCameraMode(mode) === CITY_RUSH_CAMERA_COCKPIT ? 'COCKPIT' : 'POURSUITE';
}

/**
 * La vue cockpit ne vit qu'au volant : pendant le compte à rebours et la
 * course. L'orbite de présentation, le tour d'honneur et l'épave (la toupie
 * de deux tours serait illisible de l'intérieur) gardent leurs caméras.
 */
export function cityRushCockpitActive({ mode, phase, wrecked = false } = {}) {
  return normalizeCityRushCameraMode(mode) === CITY_RUSH_CAMERA_COCKPIT
    && !wrecked
    && (phase === 'countdown' || phase === 'playing');
}

/**
 * Volant à droite sur les parcours où l'on roule à gauche (Londres, la Shuto
 * de Tokyo) et sur le tōgé du mont Haruna, au Japon.
 */
export function cityRushCockpitRightHandDrive(course) {
  if (!course || typeof course !== 'object') return false;
  return course.driveSide === 'left' || course.id === 'touge' || course.style === 'touge';
}

// ── Réglages de la caméra embarquée ─────────────────────────────────────────
export const CITY_RUSH_COCKPIT_FOV = 60; // ° vertical en paysage : grand-angle des vues volant
export const CITY_RUSH_COCKPIT_PITCH = -0.1; // rad : le regard plonge de 5,7° vers la route
// Part du roulis et du tangage de la caisse que suit la tête : l'habitacle
// bouge un peu plus que l'horizon, sans donner le mal de mer.
export const CITY_RUSH_COCKPIT_BODY_FOLLOW = 0.4;
// Le regard anticipe la courbe : une part du cap de la route 18 m plus loin.
export const CITY_RUSH_COCKPIT_LOOK_AHEAD_METERS = 18;
export const CITY_RUSH_COCKPIT_LOOK_AHEAD_SHARE = 0.45;
export const CITY_RUSH_COCKPIT_LOOK_AHEAD_MAX = 0.35; // rad
// Coups d'accélérateur de champ : plus discrets qu'en poursuite, l'œil est
// déjà tout près de la route.
export const CITY_RUSH_COCKPIT_BOOST_FOV = 4;
export const CITY_RUSH_COCKPIT_SPEED_FOV = 2;
// Volant : le braquage du monde (≤ 0,34 rad aux roues) démultiplié.
export const CITY_RUSH_COCKPIT_STEERING_RATIO = 3.2;
export const CITY_RUSH_COCKPIT_STEERING_MAX = 2.2; // rad, contre-braquage du drift compris
export const CITY_RUSH_COCKPIT_GAUGE_MAX_KMH = 300;
// Place de l'œil, par rapport au pied du pare-brise du modèle.
export const CITY_RUSH_COCKPIT_EYE_ABOVE_COWL = 0.25;
export const CITY_RUSH_COCKPIT_EYE_BEHIND_COWL = 1.05;

/**
 * Cotes de l'habitacle d'un modèle, dans le repère de la carrosserie (avant
 * vers −z, comme `makeRacerCar`). Tout part du pied du pare-brise : la planche
 * de bord s'y pose, l'œil du pilote se place derrière et au-dessus, le volant
 * et le combiné devant lui. Le haut du pare-brise et le pavillon intérieur
 * sont dessinés pour le regard (la vraie coque n'est pas visible de
 * l'intérieur), toujours au-dessus de la tête.
 */
export function cityRushCockpitLayout(archetype, { rightHandDrive = false } = {}) {
  const cabin = cityRushCabinMetrics(archetype);
  const side = rightHandDrive ? 1 : -1;
  const cowl = { ...cabin.cowl };
  const eyeY = cowl.y + CITY_RUSH_COCKPIT_EYE_ABOVE_COWL;
  const eyeZ = cowl.z + CITY_RUSH_COCKPIT_EYE_BEHIND_COWL;
  // Demi-largeur intérieure : la caisse moins l'épaisseur de la portière.
  const cabinHalf = Math.max(0.6, Math.min(cabin.halfWidthAt(eyeZ), cabin.halfWidthAt(cowl.z + 0.3)) - 0.085);
  const eyeX = side * clamp(cabinHalf * 0.47, 0.3, 0.37);
  const header = { y: eyeY + 0.24, z: eyeZ - 0.6, half: Math.max(0.48, cowl.half - 0.12) };
  const dash = {
    frontZ: cowl.z,
    rearZ: eyeZ - 0.72,
    frontY: cowl.y - 0.008,
    rearY: cowl.y - 0.04,
    bottomY: eyeY - 0.66,
  };
  const wheel = { x: eyeX, y: eyeY - 0.345, z: eyeZ - 0.55, radius: 0.17, tube: 0.019, tilt: 0.38 };
  const clusterY = cowl.y - 0.05;
  // Le combiné dépasse de la planche, en nacelle : il reste lisible entre le
  // haut de la jante et le moyeu, devant le bourrelet de la planche.
  const clusterZ = dash.rearZ + 0.08;
  const cluster = {
    x: eyeX,
    y: clusterY,
    z: clusterZ,
    width: 0.36,
    height: 0.135,
    // Le combiné regarde l'œil du pilote.
    tilt: Math.atan2(eyeY - clusterY, eyeZ - clusterZ),
  };
  return {
    archetype: cabin.archetype,
    rightHandDrive: Boolean(rightHandDrive),
    side,
    eye: [eyeX, eyeY, eyeZ],
    cowl,
    header,
    dash,
    cabinHalf,
    belt: clamp(cabin.belt, eyeY - 0.36, eyeY - 0.2),
    wheel,
    cluster,
    stack: { x: 0, y: cowl.y - 0.075, z: dash.rearZ + 0.05 },
    mirror: { x: 0, y: header.y - 0.08, z: header.z + 0.045, width: 0.2, height: 0.05 },
    headlinerRearZ: eyeZ + 0.95,
    doorFrontZ: cowl.z + 0.05,
    doorRearZ: eyeZ + 0.75,
    sideMirror: { ...cabin.sideMirror },
    // Le capot : la coque gardée jusqu'au pied du pare-brise.
    hoodCutZ: cowl.z + 0.02,
  };
}

/**
 * Régime moteur affiché par le compte-tours, entre 0 et 1 (9 000 tr/min) :
 * ralenti à l'arrêt, six rapports qui montent en dents de scie avec la
 * vitesse, limiteur sous turbo. Purement visuel.
 */
export function cityRushCockpitRpm(speed = 0, topSpeed = 1, boosting = false) {
  const ratio = clamp((Number(speed) || 0) / Math.max(1, Number(topSpeed) || 1), 0, 1.6);
  if (ratio <= 0.01) return 0.11;
  const gears = 6;
  let rpm;
  if (ratio >= 1) {
    rpm = 0.86 + Math.min(0.08, (ratio - 1) * 0.3);
  } else {
    const position = ratio * gears;
    const gear = Math.min(gears - 1, Math.floor(position));
    rpm = 0.36 + (position - gear) * 0.5;
  }
  if (boosting) rpm += 0.05;
  return clamp(rpm, 0, 0.97);
}

/**
 * Angle du volant (rad, positif = vers la droite) : le braquage vers la voie
 * visée, plus le contre-braquage d'un drift du tōgé (la caisse pointe dans le
 * virage, les roues et donc le volant tournent à l'opposé).
 */
export function cityRushCockpitSteeringAngle(steer = 0, driftYaw = 0) {
  const raw = ((Number(steer) || 0) + (Number(driftYaw) || 0) * 1.5) * CITY_RUSH_COCKPIT_STEERING_RATIO;
  return clamp(raw, -CITY_RUSH_COCKPIT_STEERING_MAX, CITY_RUSH_COCKPIT_STEERING_MAX);
}

/** Angle d'une aiguille (rotation z) pour une lecture de 0 à 1, sur 270°. */
export function cityRushCockpitNeedleAngle(value = 0) {
  return Math.PI * 0.75 - clamp(Number(value) || 0, 0, 1) * Math.PI * 1.5;
}

// ── Textures du tableau de bord ─────────────────────────────────────────────
const canDraw = () => typeof document !== 'undefined' && typeof document.createElement === 'function';

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, width, height, radius);
  else ctx.rect(x, y, width, height);
  ctx.closePath();
}

function drawDial(ctx, { cx, cy, radius, max, step, labelStep, redFrom, caption, accent, labelScale = 1 }) {
  const start = Math.PI * 0.75;
  const sweep = Math.PI * 1.5;
  const face = ctx.createRadialGradient(cx, cy - radius * 0.3, radius * 0.1, cx, cy, radius);
  face.addColorStop(0, '#151b27');
  face.addColorStop(1, '#06080d');
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  // Anneau néon aux couleurs de la voiture.
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 2, start, start + sweep);
  ctx.stroke();
  ctx.restore();
  // Zone rouge.
  if (Number.isFinite(redFrom)) {
    ctx.strokeStyle = '#ff3b4e';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 10, start + sweep * (redFrom / max), start + sweep);
    ctx.stroke();
  }
  // Graduations et chiffres.
  ctx.fillStyle = '#e9f1ff';
  ctx.strokeStyle = '#e9f1ff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(17 * labelScale)}px "Orbitron", "Segoe UI", sans-serif`;
  const steps = Math.round(max / step);
  for (let index = 0; index <= steps; index += 1) {
    const value = index * step;
    const angle = start + sweep * (value / max);
    const major = Math.abs(value / labelStep - Math.round(value / labelStep)) < 1e-6;
    const outer = radius - 6;
    const inner = outer - (major ? 15 : 8);
    ctx.lineWidth = major ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.stroke();
    if (major) {
      const label = radius - 34;
      ctx.fillText(String(Math.round(value)), cx + Math.cos(angle) * label, cy + Math.sin(angle) * label);
    }
  }
  ctx.fillStyle = 'rgba(233, 241, 255, 0.62)';
  ctx.font = '700 12px "Orbitron", "Segoe UI", sans-serif';
  ctx.fillText(caption, cx, cy + radius * 0.5);
}

function makeGaugeTexture(accent, label) {
  if (!canDraw()) return null;
  return makeCanvasTexture((ctx, width, height) => {
    ctx.fillStyle = '#020305';
    ctx.fillRect(0, 0, width, height);
    const panel = ctx.createLinearGradient(0, 0, 0, height);
    panel.addColorStop(0, '#0d121c');
    panel.addColorStop(1, '#030407');
    ctx.fillStyle = panel;
    roundedRect(ctx, 3, 3, width - 6, height - 6, 34);
    ctx.fill();
    drawDial(ctx, { cx: 128, cy: 98, radius: 86, max: CITY_RUSH_COCKPIT_GAUGE_MAX_KMH, step: 20, labelStep: 60, caption: 'KM/H', accent });
    drawDial(ctx, { cx: 384, cy: 98, radius: 86, max: 9, step: 0.5, labelStep: 1, redFrom: 7.5, caption: 'x1000 TR/MIN', accent });
    // Bandeau central : le modèle de la voiture et les témoins éteints.
    ctx.fillStyle = 'rgba(233, 241, 255, 0.75)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 11px "Orbitron", "Segoe UI", sans-serif';
    ctx.fillText(String(label || '').slice(0, 14), width / 2, 30);
    ctx.fillStyle = 'rgba(120, 132, 150, 0.35)';
    ctx.fillRect(width / 2 - 24, height - 46, 18, 12);
    ctx.fillRect(width / 2 + 6, height - 46, 18, 12);
  }, 512, 192, { smooth: true });
}

function makeRadioTexture(accent, station) {
  if (!canDraw()) return null;
  return makeCanvasTexture((ctx, width, height) => {
    ctx.fillStyle = '#04060a';
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 10;
    ctx.fillStyle = accent;
    ctx.font = '700 30px "Orbitron", "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(station || 'VICE FM').slice(0, 10), 16, 30);
    ctx.restore();
    // Égaliseur figé : quelques barres, comme un autoradio des années 80.
    for (let bar = 0; bar < 14; bar += 1) {
      const level = 0.25 + 0.7 * Math.abs(Math.sin(bar * 1.7 + 0.6));
      ctx.fillStyle = bar % 4 === 3 ? '#ff5aa5' : accent;
      ctx.fillRect(16 + bar * 16, height - 14 - level * 40, 10, level * 40);
    }
  }, 256, 96, { smooth: true });
}

/** Reflet de repli pour les rétroviseurs : ciel, horizon et route, flous. */
function makeReflectionTexture(daylight) {
  if (!canDraw()) return null;
  return makeCanvasTexture((ctx, width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (daylight) {
      gradient.addColorStop(0, '#8fc4ef');
      gradient.addColorStop(0.5, '#d9e6ef');
      gradient.addColorStop(0.56, '#5b6470');
      gradient.addColorStop(1, '#2c3036');
    } else {
      gradient.addColorStop(0, '#120d2a');
      gradient.addColorStop(0.48, '#5a2e66');
      gradient.addColorStop(0.55, '#1b1a26');
      gradient.addColorStop(1, '#0b0c10');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }, 64, 32, { smooth: true });
}

// ── Géométrie ───────────────────────────────────────────────────────────────
const scratchMatrix = new THREE.Matrix4();
const scratchEuler = new THREE.Euler();

function quadGeometry(points) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  return geometry;
}

function addQuad(batch, material, points) {
  const geometry = quadGeometry(points);
  batch.custom(material, geometry);
  geometry.dispose();
}

/**
 * Rotation (Euler XYZ) d'une poutre allant de `from` à `to` : son axe local Y
 * suit la poutre, sa face locale +Z regarde `facing` (l'œil du pilote).
 */
function beamRotation(from, to, facing) {
  const yAxis = new THREE.Vector3().subVectors(to, from).normalize();
  const middle = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const toward = new THREE.Vector3().subVectors(facing, middle);
  toward.sub(yAxis.clone().multiplyScalar(toward.dot(yAxis)));
  if (toward.lengthSq() < 1e-8) toward.set(0, 0, 1);
  const zAxis = toward.normalize();
  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
  scratchMatrix.makeBasis(xAxis, yAxis, zAxis);
  scratchEuler.setFromRotationMatrix(scratchMatrix, 'XYZ');
  return [scratchEuler.x, scratchEuler.y, scratchEuler.z];
}

function addBeam(batch, material, from, to, width, depth, facing) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const middle = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  batch.box(material, middle.toArray(), [width, start.distanceTo(end), depth], beamRotation(start, end, new THREE.Vector3(...facing)));
}

function orientToward(object, target) {
  scratchMatrix.lookAt(target, object.position, object.up);
  object.quaternion.setFromRotationMatrix(scratchMatrix);
}

function makeNeedle(material, length) {
  const geometry = new THREE.PlaneGeometry(0.0042, length);
  geometry.translate(0, length * 0.42, 0);
  return new THREE.Mesh(geometry, material);
}

/**
 * Habitacle de la voiture du joueur. Renvoie le contrôleur que le monde
 * pilote : `setActive(on)` échange coque et habitacle, `update(state, dt,
 * elapsed)` anime volant, aiguilles, témoins et essuie-glaces. `eye` est le
 * point de vue (enfant de la caisse), `mirror` le rétroviseur intérieur dont
 * le monde peut remplacer le reflet par une vraie image de la route.
 */
export function makeCityRushCockpit(car, options = {}) {
  const data = car?.userData;
  if (!data || data.kind !== 'racer' || !data.body) return null;
  const {
    rightHandDrive = false,
    accent = '#48edc2',
    daylight = false,
    weather = null,
    label = '',
    radio = 'VICE FM',
  } = options;
  const layout = cityRushCockpitLayout(data.archetype, { rightHandDrive });
  const [eyeX, eyeY, eyeZ] = layout.eye;
  const eyePoint = [eyeX, eyeY, eyeZ];
  const { cowl, header, dash, wheel, cluster, stack, mirror, side } = layout;
  const W = layout.cabinHalf;
  const belt = layout.belt;
  const paint = data.materials?.body || new THREE.MeshStandardMaterial({ color: 0x888888 });
  const reflection = makeReflectionTexture(daylight);
  const gaugeTexture = makeGaugeTexture(accent, label);
  const radioTexture = makeRadioTexture(accent, radio);

  const materials = {
    dash: new THREE.MeshStandardMaterial({ name: 'cockpit-dash', color: 0x1b1d24, roughness: 0.84, metalness: 0.05, emissive: 0x08090d, side: THREE.DoubleSide }),
    soft: new THREE.MeshStandardMaterial({ name: 'cockpit-door', color: 0x21242c, roughness: 0.95, metalness: 0.02, emissive: 0x07080b, side: THREE.DoubleSide }),
    pillar: new THREE.MeshStandardMaterial({ name: 'cockpit-pillar', color: 0x2a2d34, roughness: 0.96, metalness: 0, emissive: 0x08090c }),
    headliner: new THREE.MeshStandardMaterial({ name: 'cockpit-headliner', color: 0x32353e, roughness: 1, metalness: 0, emissive: 0x0a0b0e, side: THREE.DoubleSide }),
    trim: new THREE.MeshStandardMaterial({ name: 'cockpit-trim', color: 0x30343d, roughness: 0.42, metalness: 0.55 }),
    metal: new THREE.MeshStandardMaterial({ name: 'cockpit-metal', color: 0xb4bcc6, roughness: 0.3, metalness: 0.88 }),
    leather: new THREE.MeshStandardMaterial({ name: 'cockpit-leather', color: 0x1e1f25, roughness: 0.55, metalness: 0.08, emissive: 0x060608 }),
    wiper: new THREE.MeshStandardMaterial({ name: 'cockpit-wiper', color: 0x0b0c0f, roughness: 0.7, metalness: 0.3 }),
    accent: new THREE.MeshBasicMaterial({ name: 'cockpit-accent', color: accent, toneMapped: false }),
    gauges: new THREE.MeshBasicMaterial({ name: 'cockpit-gauges', color: gaugeTexture ? 0xffffff : 0x0b0f17, map: gaugeTexture, toneMapped: false }),
    needle: new THREE.MeshBasicMaterial({ name: 'cockpit-needle', color: 0xff5530, toneMapped: false, side: THREE.DoubleSide }),
    radio: new THREE.MeshBasicMaterial({ name: 'cockpit-radio', color: radioTexture ? 0xffffff : 0x05070b, map: radioTexture, toneMapped: false }),
    mirrorGlass: new THREE.MeshBasicMaterial({ name: 'cockpit-mirror-glass', color: reflection ? 0xffffff : 0x3a4250, map: reflection }),
    sideMirrorGlass: new THREE.MeshBasicMaterial({ name: 'cockpit-side-mirror-glass', color: reflection ? 0xd8e0ea : 0x3a4250, map: reflection }),
    engineLight: new THREE.MeshBasicMaterial({ name: 'cockpit-engine-light', color: 0xff3b2f, toneMapped: false }),
    boostLight: new THREE.MeshBasicMaterial({ name: 'cockpit-boost-light', color: accent, toneMapped: false }),
  };

  const group = new THREE.Group();
  group.name = 'city-rush-cockpit';
  group.visible = false;

  // Point de vue : enfant de la caisse, il suit roulis, tangage et rebonds.
  const eye = new THREE.Object3D();
  eye.name = 'city-rush-cockpit-eye';
  eye.position.set(eyeX, eyeY, eyeZ);
  group.add(eye);

  // ── Pièces fixes, fusionnées par matériau ────────────────────────────────
  const batch = createBatch();
  // Planche de bord : le dessus raccorde au pied du pare-brise (là où finit
  // le capot), le bourrelet arrondit le bord, la face descend vers les genoux.
  addQuad(batch, materials.dash, [
    [-W, dash.frontY, dash.frontZ],
    [W, dash.frontY, dash.frontZ],
    [W, dash.rearY, dash.rearZ],
    [-W, dash.rearY, dash.rearZ],
  ]);
  batch.cylinder(materials.dash, [0, dash.rearY - 0.014, dash.rearZ + 0.006], 0.024, 0.024, W * 2, 10, [0, 0, Math.PI / 2]);
  addQuad(batch, materials.dash, [
    [-W, dash.rearY - 0.03, dash.rearZ + 0.014],
    [W, dash.rearY - 0.03, dash.rearZ + 0.014],
    [W, dash.bottomY, dash.rearZ + 0.15],
    [-W, dash.bottomY, dash.rearZ + 0.15],
  ]);
  // Liseré néon sur toute la largeur, et un insert peint côté passager : la
  // couleur de la voiture entre dans l'habitacle.
  batch.box(materials.accent, [0, dash.rearY - 0.072, dash.rearZ + 0.034], [W * 2 - 0.12, 0.006, 0.006]);
  batch.box(paint, [-side * (W * 0.52), dash.rearY - 0.045, dash.rearZ + 0.026], [W * 0.62, 0.042, 0.012]);
  // Nacelle du combiné : bloc (en retrait du cadran incliné), visière et joues.
  batch.box(materials.dash, [cluster.x, cluster.y - 0.004, cluster.z - 0.088], [0.42, 0.16, 0.1]);
  batch.box(materials.trim, [cluster.x, cluster.y + 0.082, cluster.z - 0.03], [0.44, 0.02, 0.14], [-0.12, 0, 0]);
  for (const cheek of [-1, 1]) {
    batch.box(materials.trim, [cluster.x + cheek * 0.215, cluster.y + 0.01, cluster.z - 0.035], [0.018, 0.16, 0.12]);
  }
  // Console centrale : aérateurs au-dessus, autoradio en dessous. Le bloc
  // reste sous le bord de la planche.
  batch.box(materials.dash, [stack.x, stack.y - 0.09, stack.z - 0.04], [0.27, 0.24, 0.1]);
  for (const vent of [-1, 1]) {
    batch.box(materials.trim, [stack.x + vent * 0.07, stack.y, stack.z + 0.016], [0.11, 0.032, 0.012]);
    batch.box(materials.accent, [stack.x + vent * 0.07, stack.y - 0.021, stack.z + 0.023], [0.1, 0.004, 0.004]);
  }
  // Montants de pare-brise : du pied (coins du vitrage réel) au haut du
  // pare-brise, face tournée vers le pilote.
  for (const k of [-1, 1]) {
    addBeam(batch, materials.pillar,
      [k * (cowl.half + 0.015), cowl.y + 0.004, cowl.z + 0.02],
      [k * header.half, header.y - 0.012, header.z + 0.012],
      0.075, 0.055, eyePoint);
  }
  // Traverse haute, pavillon et rails de toit (le haut des vitres latérales).
  batch.box(materials.pillar, [0, header.y, header.z + 0.012], [header.half * 2 + 0.12, 0.075, 0.07]);
  addQuad(batch, materials.headliner, [
    [-W - 0.04, header.y + 0.03, header.z - 0.02],
    [W + 0.04, header.y + 0.03, header.z - 0.02],
    [W + 0.04, header.y + 0.07, layout.headlinerRearZ],
    [-W - 0.04, header.y + 0.07, layout.headlinerRearZ],
  ]);
  for (const k of [-1, 1]) {
    addBeam(batch, materials.pillar,
      [k * header.half, header.y + 0.008, header.z + 0.02],
      [k * (W + 0.03), header.y + 0.05, layout.headlinerRearZ],
      0.07, 0.05, eyePoint);
    // Montant central, juste derrière l'épaule du pilote.
    addBeam(batch, materials.pillar,
      [k * (W + 0.02), belt, eyeZ + 0.5],
      [k * (W + 0.02), header.y + 0.03, eyeZ + 0.46],
      0.1, 0.06, eyePoint);
  }
  // Portières : panneau, haut de porte peint, liseré, accoudoir et poignée.
  const doorLength = layout.doorRearZ - layout.doorFrontZ;
  const doorMiddle = (layout.doorRearZ + layout.doorFrontZ) / 2;
  for (const k of [-1, 1]) {
    addQuad(batch, materials.soft, [
      [k * W, dash.bottomY, layout.doorFrontZ],
      [k * W, belt, layout.doorFrontZ],
      [k * W, belt, layout.doorRearZ],
      [k * W, dash.bottomY, layout.doorRearZ],
    ]);
    // Haut de porte sombre, liseré peint côté vitre : la couleur de la
    // voiture court le long de la fenêtre.
    batch.box(materials.dash, [k * (W + 0.025), belt + 0.012, doorMiddle], [0.07, 0.03, doorLength]);
    batch.box(paint, [k * (W + 0.064), belt + 0.022, doorMiddle], [0.012, 0.02, doorLength]);
    batch.box(materials.accent, [k * (W - 0.006), belt - 0.075, doorMiddle + 0.05], [0.006, 0.006, doorLength * 0.7]);
    batch.box(materials.trim, [k * (W - 0.035), belt - 0.16, eyeZ - 0.05], [0.07, 0.045, 0.42]);
    batch.box(materials.metal, [k * (W - 0.012), belt - 0.07, eyeZ - 0.32], [0.015, 0.025, 0.09]);
  }
  // Rétroviseurs extérieurs : à l'aplomb de la pièce de la carrosserie
  // (masquée avec la coque), relevés au-dessus du haut de porte pour rester
  // visibles par la vitre, avec leur miroir tourné vers le pilote.
  const sideMirror = layout.sideMirror;
  const sideMirrorY = Math.max(sideMirror.y, belt + 0.055);
  for (const k of [-1, 1]) {
    batch.box(materials.wiper, [k * sideMirror.stemX, sideMirrorY - 0.05, sideMirror.z], [0.08, 0.045, 0.08]);
    batch.box(paint, [k * sideMirror.x, sideMirrorY, sideMirror.z], [0.14, 0.075, 0.14]);
    batch.plane(materials.sideMirrorGlass, [k * sideMirror.x, sideMirrorY, sideMirror.z + 0.0715], 0.118, 0.058);
  }
  // Rétroviseur intérieur : pied et boîtier (le miroir est un mesh à part).
  batch.cylinder(materials.dash, [mirror.x, (header.y + mirror.y) / 2 + 0.01, mirror.z - 0.012], 0.009, 0.009, Math.max(0.02, header.y - mirror.y - 0.02), 6);
  const staticParts = batch.build('city-rush-cockpit-static');
  staticParts.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = false;
    object.receiveShadow = false;
  });
  group.add(staticParts);

  const mirrorHousing = new THREE.Mesh(new THREE.BoxGeometry(mirror.width + 0.02, mirror.height + 0.016, 0.03), materials.dash);
  mirrorHousing.name = 'city-rush-cockpit-mirror-housing';
  mirrorHousing.position.set(mirror.x, mirror.y, mirror.z);
  orientToward(mirrorHousing, new THREE.Vector3(...eyePoint));
  group.add(mirrorHousing);
  const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(mirror.width, mirror.height), materials.mirrorGlass);
  mirrorGlass.name = 'city-rush-cockpit-mirror';
  mirrorGlass.position.set(0, 0, 0.0155);
  mirrorHousing.add(mirrorGlass);

  // ── Combiné d'instruments : cadrans peints, aiguilles et témoins ────────
  const gaugeFace = new THREE.Mesh(new THREE.PlaneGeometry(cluster.width, cluster.height), materials.gauges);
  gaugeFace.name = 'city-rush-cockpit-gauges';
  gaugeFace.position.set(cluster.x, cluster.y, cluster.z);
  gaugeFace.rotation.x = -cluster.tilt;
  group.add(gaugeFace);
  const dialOffset = cluster.width * 0.25;
  const needleLength = cluster.height * 0.4;
  const speedNeedle = makeNeedle(materials.needle, needleLength);
  speedNeedle.name = 'city-rush-cockpit-speed-needle';
  speedNeedle.position.set(-dialOffset, cluster.height * -0.01, 0.002);
  const rpmNeedle = makeNeedle(materials.needle, needleLength);
  rpmNeedle.name = 'city-rush-cockpit-rpm-needle';
  rpmNeedle.position.set(dialOffset, cluster.height * -0.01, 0.002);
  gaugeFace.add(speedNeedle, rpmNeedle);
  for (const dial of [speedNeedle, rpmNeedle]) {
    const cap = new THREE.Mesh(new THREE.CircleGeometry(0.0075, 14), materials.leather);
    cap.position.set(dial.position.x, dial.position.y, 0.003);
    gaugeFace.add(cap);
  }
  const lightSize = [cluster.width * 0.035, cluster.height * 0.0625];
  const engineLight = new THREE.Mesh(new THREE.PlaneGeometry(...lightSize), materials.engineLight);
  engineLight.name = 'city-rush-cockpit-engine-light';
  engineLight.position.set(-cluster.width * 0.0293, -cluster.height * 0.289, 0.0025);
  engineLight.visible = false;
  const boostLight = new THREE.Mesh(new THREE.PlaneGeometry(...lightSize), materials.boostLight);
  boostLight.name = 'city-rush-cockpit-boost-light';
  boostLight.position.set(cluster.width * 0.0293, -cluster.height * 0.289, 0.0025);
  boostLight.visible = false;
  gaugeFace.add(engineLight, boostLight);

  const radioScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.064), materials.radio);
  radioScreen.name = 'city-rush-cockpit-radio';
  radioScreen.position.set(stack.x, stack.y - 0.068, stack.z + 0.026);
  radioScreen.rotation.x = -Math.atan2(eyeY - stack.y, eyeZ - stack.z) * 0.6;
  group.add(radioScreen);

  // ── Volant ───────────────────────────────────────────────────────────────
  // Le haut de la jante penche vers la planche de bord, l'axe monte vers le
  // pilote. `steering` tourne autour de l'axe de la colonne.
  const wheelMount = new THREE.Group();
  wheelMount.name = 'city-rush-cockpit-wheel-mount';
  wheelMount.position.set(wheel.x, wheel.y, wheel.z);
  wheelMount.rotation.x = -wheel.tilt;
  group.add(wheelMount);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, 0.3, 12), materials.dash);
  column.rotation.x = Math.PI / 2;
  column.position.set(0, 0, -0.17);
  wheelMount.add(column);
  const steering = new THREE.Group();
  steering.name = 'city-rush-cockpit-steering';
  wheelMount.add(steering);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(wheel.radius, wheel.tube, 10, 48), materials.leather);
  rim.name = 'city-rush-cockpit-wheel-rim';
  steering.add(rim);
  // Repère de sommet aux couleurs de la voiture : on lit le coup de volant.
  const markerArc = 0.28;
  const marker = new THREE.Mesh(new THREE.TorusGeometry(wheel.radius, wheel.tube * 1.1, 8, 6, markerArc), materials.accent);
  marker.rotation.z = Math.PI / 2 - markerArc / 2;
  steering.add(marker);
  const hubRadius = 0.056;
  const spokeLength = wheel.radius - hubRadius;
  for (const k of [-1, 1]) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(spokeLength + 0.01, 0.034, 0.016), materials.trim);
    spoke.position.set(k * (hubRadius + spokeLength / 2), -0.012, -0.004);
    steering.add(spoke);
  }
  const lowerSpoke = new THREE.Mesh(new THREE.BoxGeometry(0.042, spokeLength + 0.01, 0.016), materials.trim);
  lowerSpoke.position.set(0, -(hubRadius + spokeLength / 2), -0.004);
  steering.add(lowerSpoke);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(hubRadius, hubRadius * 1.08, 0.045, 20), materials.leather);
  hub.rotation.x = Math.PI / 2;
  hub.position.set(0, 0, -0.01);
  steering.add(hub);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.024, 20), materials.accent);
  badge.position.set(0, 0, 0.0135);
  steering.add(badge);

  // ── Essuie-glaces ────────────────────────────────────────────────────────
  // Posés au pied du pare-brise, ils balaient le plan du vitrage sous la pluie.
  const glassUp = new THREE.Vector3(0, header.y - cowl.y, header.z - cowl.z).normalize();
  const parkDirection = new THREE.Vector3(-side, 0, 0);
  const glassNormal = new THREE.Vector3().crossVectors(parkDirection, glassUp).normalize();
  const wiperBasis = new THREE.Matrix4().makeBasis(parkDirection, glassUp, glassNormal);
  // Les balais restent du côté extérieur du vitrage, quel que soit le sens.
  const outward = glassNormal.y > 0 ? 1 : -1;
  const wiperLength = Math.min(0.6, cowl.half * 0.78);
  const wipers = [];
  for (const pivotX of [side * cowl.half * 0.82, side * cowl.half * 0.05]) {
    const mount = new THREE.Group();
    mount.position.set(pivotX, cowl.y + 0.016, cowl.z - 0.03);
    mount.quaternion.setFromRotationMatrix(wiperBasis);
    const arm = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.BoxGeometry(wiperLength, 0.008, 0.009), materials.wiper);
    rod.position.set(wiperLength / 2, 0, 0.008 * outward);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(wiperLength * 0.86, 0.011, 0.014), materials.wiper);
    blade.position.set(wiperLength * 0.55, 0.012, 0.014 * outward);
    arm.add(rod, blade);
    mount.add(arm);
    group.add(mount);
    wipers.push(arm);
  }

  group.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = false;
    object.receiveShadow = false;
  });
  data.body.add(group);

  // ── Capot réel et doublure d'ombre ───────────────────────────────────────
  const hood = new THREE.Mesh(makeRacerHoodGeometry(car, layout.hoodCutZ), paint);
  hood.name = `${data.profileId}-cockpit-hood`;
  hood.visible = false;
  hood.castShadow = false;
  data.body.add(hood);
  // La coque entière continue de porter l'ombre de la voiture, sans rien
  // dessiner : pas de couleur, pas de profondeur.
  const shadowMaterial = new THREE.MeshBasicMaterial({ name: 'cockpit-shadow-proxy', colorWrite: false, depthWrite: false });
  const shadowProxy = data.shell ? new THREE.Mesh(data.shell.geometry, shadowMaterial) : null;
  if (shadowProxy) {
    shadowProxy.name = `${data.profileId}-cockpit-shadow-proxy`;
    shadowProxy.castShadow = true;
    shadowProxy.receiveShadow = false;
    shadowProxy.visible = false;
    data.body.add(shadowProxy);
  }

  // Les cônes de phares additifs dessinent un prisme laiteux vus de
  // l'intérieur : ils s'éteignent en vue cockpit (le projecteur du monde
  // éclaire toujours la route).
  const coneVisibility = (data.headlightCones || []).map((cone) => cone.visible);
  const raining = weather === 'rain' || weather === 'drizzle';
  const wiperCycle = weather === 'drizzle' ? 2.8 : 1.5;
  const anim = { steer: 0, speed: 0, rpm: 0.11 };
  let active = false;

  return {
    group,
    layout,
    eye,
    hood,
    shadowProxy,
    steering,
    speedNeedle,
    rpmNeedle,
    engineLight,
    boostLight,
    wipers,
    mirror: { mesh: mirrorGlass, housing: mirrorHousing, material: materials.mirrorGlass, fallback: reflection },
    materials,
    get active() { return active; },
    /** Vue cockpit ou poursuite : l'habitacle et le capot remplacent la coque fermée. */
    setActive(on) {
      active = Boolean(on);
      group.visible = active;
      hood.visible = active;
      if (shadowProxy) shadowProxy.visible = active;
      if (data.shell) data.shell.visible = !active;
      if (data.details) data.details.visible = !active;
      if (data.policeLivery) data.policeLivery.visible = !active;
      (data.headlightCones || []).forEach((cone, index) => {
        cone.visible = active ? false : coneVisibility[index];
      });
    },
    update(state = {}, dt = 0, elapsed = 0) {
      const {
        speed = 0,
        topSpeed = 1,
        steer = 0,
        driftYaw = 0,
        boosting = false,
        critical = false,
        reduceMotion = false,
      } = state;
      const blend = (rate) => (dt > 0 ? 1 - Math.exp(-dt * rate) : 1);
      anim.steer = lerp(anim.steer, cityRushCockpitSteeringAngle(steer, driftYaw), blend(12));
      steering.rotation.z = -anim.steer;
      anim.speed = lerp(anim.speed, Math.max(0, speed) * 3.6, blend(10));
      speedNeedle.rotation.z = cityRushCockpitNeedleAngle(anim.speed / CITY_RUSH_COCKPIT_GAUGE_MAX_KMH);
      anim.rpm = lerp(anim.rpm, cityRushCockpitRpm(speed, topSpeed, boosting), blend(9));
      // Le limiteur fait vibrer l'aiguille, comme un vrai compte-tours.
      const limiter = anim.rpm > 0.9 && !reduceMotion ? Math.sin(elapsed * 61) * 0.012 : 0;
      rpmNeedle.rotation.z = cityRushCockpitNeedleAngle(anim.rpm + limiter);
      engineLight.visible = Boolean(critical) && Math.floor(elapsed * 3) % 2 === 0;
      boostLight.visible = Boolean(boosting);
      let sweep = 0;
      if (raining && !reduceMotion) {
        const phase = (elapsed % wiperCycle) / wiperCycle;
        sweep = phase < 0.62 ? Math.sin((phase / 0.62) * Math.PI) : 0;
      }
      wipers.forEach((arm) => { arm.rotation.z = sweep * 1.32; });
    },
  };
}
