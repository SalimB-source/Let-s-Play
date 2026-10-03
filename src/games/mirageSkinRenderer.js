// Moteur partagé des aperçus 3D de skins (voir MirageSkinPreview.jsx).
/*
 * Aperçu 3D d'un skin Mirage : monture + cavalier voxel du jeu, qui tourne
 * en continu sur lui-même (en galopant sur place).
 *
 * Toutes les vignettes partagent UN SEUL WebGLRenderer hors écran : chaque
 * image est rendue dans ce renderer puis recopiée dans le <canvas> 2D de la
 * vignette. On évite ainsi la limite de contextes WebGL du navigateur
 * (8 à 16) quand une page affiche 8 skins + le jeu lui-même.
 * La boucle s'arrête d'elle-même quand aucune vignette n'est visible
 * (IntersectionObserver) ou que l'onglet est masqué.
 */
import * as THREE from 'three';

const MAX_DPR = 2;
const SPIN_SPEED = 0.9; // rad / s
const FRAME_MS = 1000 / 30; // 30 i/s suffisent pour une rotation fluide
let shared = null;
let sharedFailed = false;
let pausedByRace = false;

/**
 * Met en pause toutes les vignettes pendant une course : le jeu garde tout le
 * GPU. Les vignettes gardent leur dernière image et reprennent ensuite.
 */
export function setMirageSkinPreviewsPaused(paused) {
  pausedByRace = Boolean(paused);
  if (pausedByRace) stopLoop();
  else ensureLoop();
}

export function getShared() {
  if (shared || sharedFailed) return shared;
  try {
    const canvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setScissorTest(true);

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x4a3050, 1.35));
    const sun = new THREE.DirectionalLight(0xffe2b0, 2.1);
    sun.position.set(3, 6, 4);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0xb9a7ff, 0.8);
    rim.position.set(-4, 3, -5);
    scene.add(rim);
    // Ombre portée douce sous le cheval.
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 32),
      new THREE.MeshBasicMaterial({ color: 0x120a18, transparent: true, opacity: 0.32, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(1, 1.25, 1);
    shadow.position.y = 0.005;
    scene.add(shadow);

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    camera.position.set(0, 2.5, 8.8);
    camera.lookAt(0, 1.35, 0); // cadrage : sabots → chapeau dans ±0.82 de l'écran, quel que soit l'angle

    shared = { renderer, scene, camera, previews: new Set(), raf: 0, width: 0, height: 0, start: performance.now() };
    canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); stopLoop(); });
    canvas.addEventListener('webglcontextrestored', () => ensureLoop());
    document.addEventListener('visibilitychange', () => (document.hidden ? stopLoop() : ensureLoop()));
  } catch {
    sharedFailed = true;
    shared = null;
  }
  return shared;
}

export function stopLoop() {
  if (shared?.raf) cancelAnimationFrame(shared.raf);
  if (shared) shared.raf = 0;
}

export function ensureLoop() {
  if (!shared || shared.raf || document.hidden || pausedByRace) return;
  if (![...shared.previews].some(p => p.visible)) return;
  shared.raf = requestAnimationFrame(frame);
}

function frame(now) {
  const s = shared;
  s.raf = 0;
  const active = [...s.previews].filter(p => p.visible);
  if (!active.length || document.hidden || pausedByRace) return;
  if (now - (s.last || 0) < FRAME_MS - 2) { s.raf = requestAnimationFrame(frame); return; }
  s.last = now;
  const t = (now - s.start) / 1000;
  const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);

  // Le renderer grandit jusqu'à la plus grande vignette (jamais réduit).
  let needW = s.width;
  let needH = s.height;
  for (const p of active) {
    p.w = Math.max(1, Math.round(p.canvas.clientWidth * dpr));
    p.h = Math.max(1, Math.round(p.canvas.clientHeight * dpr));
    needW = Math.max(needW, p.w);
    needH = Math.max(needH, p.h);
  }
  if (needW !== s.width || needH !== s.height) {
    s.width = needW;
    s.height = needH;
    s.renderer.setSize(needW, needH, false);
  }

  for (const p of active) {
    if (p.canvas.width !== p.w || p.canvas.height !== p.h) { p.canvas.width = p.w; p.canvas.height = p.h; }
    const ctx = p.ctx || (p.ctx = p.canvas.getContext('2d'));
    if (!ctx) continue;
    const model = p.model;
    model.rotation.y = p.phase + t * SPIN_SPEED;
    // Petit galop sur place : jambes, queue et léger rebond.
    const { legs, tail, wings = [], capeFlap, horseHead, armGroup, rider, masterSword, hylianShield } = model.userData.parts;
    const isLink = model.userData.accessoryKind === 'link-epona';
    const gallop = isLink ? 7.4 : 7;
    legs.forEach((leg, i) => {
      leg.rotation.x = Math.sin(t * gallop + i * 2.2) * (isLink ? 0.5 : 0.45);
      if (leg.userData.knee) leg.userData.knee.rotation.x = Math.max(0, Math.sin(t * gallop + i * 2.2 + 1.5)) * 0.5;
    });
    tail.rotation.x = -0.35 + Math.sin(t * gallop) * (isLink ? 0.16 : 0.12);
    wings.forEach((wing, index) => { wing.rotation.z = Math.sin(t * 7 + index * Math.PI) * 0.12; });
    // La silhouette bouge aussi : pan de cape, hochement de tête, rênes.
    if (capeFlap) capeFlap.rotation.x = -0.28 + Math.sin(t * gallop) * 0.1;
    if (horseHead?.visible) horseHead.rotation.x = Math.sin(t * gallop + 0.9) * 0.07;
    if (armGroup) armGroup.rotation.x = Math.sin(t * gallop + 1.5) * 0.04;
    model.position.y = Math.abs(Math.sin(t * gallop)) * (isLink ? 0.075 : 0.06);
    // Link garde une vraie posture de cavalier : son épée et son bouclier
    // répondent au galop au lieu de rester figés comme des accessoires.
    if (isLink) {
      const beat = Math.sin(t * gallop);
      rider.rotation.z = beat * 0.035;
      rider.rotation.x = -0.025 + Math.abs(beat) * 0.025;
      if (masterSword) {
        const baseZ = masterSword.userData.baseRotationZ ?? 0.16;
        masterSword.rotation.z = baseZ + beat * 0.1;
        masterSword.rotation.x = (masterSword.userData.baseRotationX ?? -0.2) + Math.cos(t * gallop) * 0.05;
      }
      if (hylianShield) hylianShield.rotation.y = Math.sin(t * gallop + 0.8) * 0.05;
    }

    s.camera.aspect = p.w / p.h;
    s.camera.updateProjectionMatrix();
    // Viewport en coordonnées GL (origine en bas) → coin haut-gauche du canvas.
    s.renderer.setViewport(0, s.height - p.h, p.w, p.h);
    s.renderer.setScissor(0, s.height - p.h, p.w, p.h);
    s.scene.add(model);
    s.renderer.render(s.scene, s.camera);
    s.scene.remove(model);
    ctx.clearRect(0, 0, p.w, p.h);
    ctx.drawImage(s.renderer.domElement, 0, 0, p.w, p.h, 0, 0, p.w, p.h);
  }
  s.raf = requestAnimationFrame(frame);
}

let phaseSeed = 0;
/** Angle de départ différent pour chaque vignette : le carrousel paraît vivant. */
export function nextPreviewPhase() {
  return (phaseSeed++ * 0.9) % (Math.PI * 2);
}
